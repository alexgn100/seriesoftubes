const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../server/sync');
const { load } = require('./harness');

// A real sync server on a free port, with its own empty data directory.
async function server() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tubes-sync-'));
  const srv = createServer({ dataDir: dir });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const call = async (method, p, body, token) => {
    const r = await fetch(base + p, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { st: r.status, j: await r.json() };
  };
  return { srv, dir, base, call, close: () => new Promise((ok) => srv.close(ok)) };
}
// A device: the game in jsdom, whose fetch('/api/…') reaches that server.
const device = (base, storage) => load({ storage, fetch: (u, o) => fetch(base + u, o) });
const SAVE = { v: 1, name: 'Testnet', day: 40, cash: 1000, pops: {}, links: [] };

test('accounts: sign up, log in, wrong passwords and bad names are refused', async () => {
  const s = await server();
  try {
    assert.equal((await s.call('POST', '/api/register', { user: 'x', pass: 'password1' })).j.err, 'bad_user');
    assert.equal((await s.call('POST', '/api/register', { user: 'alice', pass: 'short' })).j.err, 'bad_pass');
    const r = await s.call('POST', '/api/register', { user: 'Alice', pass: 'password1' });
    assert.equal(r.st, 201);
    assert.match(r.j.token, /^[0-9a-f]{32}\./);
    assert.equal((await s.call('POST', '/api/register', { user: 'alice', pass: 'password2' })).j.err, 'taken', 'names ignore case');
    assert.equal((await s.call('POST', '/api/login', { user: 'alice', pass: 'nope-nope' })).st, 401);
    assert.equal((await s.call('POST', '/api/login', { user: 'bob', pass: 'password1' })).st, 401);
    const l = await s.call('POST', '/api/login', { user: 'ALICE', pass: 'password1' });
    assert.equal(l.st, 200);
    assert.equal(l.j.user, 'Alice');
    // Passwords are never stored in the clear, and tokens only as hashes.
    const acc = fs.readFileSync(path.join(s.dir, 'accounts', fs.readdirSync(path.join(s.dir, 'accounts'))[0]), 'utf8');
    assert.ok(!acc.includes('password1'));
    assert.ok(!acc.includes(l.j.token.split('.')[1]));
  } finally { await s.close(); }
});

test('saves: revisions, conflicts, logout and deleting the account', async () => {
  const s = await server();
  try {
    const t = (await s.call('POST', '/api/register', { user: 'carol', pass: 'password1' })).j.token;
    assert.equal((await s.call('GET', '/api/save')).st, 401, 'no token, no save');
    assert.deepEqual((await s.call('GET', '/api/save', undefined, t)).j, { rev: 0, at: '', meta: null });
    assert.equal((await s.call('PUT', '/api/save', { base: 0, save: { nope: 1 } }, t)).j.err, 'bad_save');
    assert.equal((await s.call('PUT', '/api/save', { base: 0, save: SAVE }, t)).j.rev, 1);
    const g = await s.call('GET', '/api/save', undefined, t);
    assert.equal(g.j.rev, 1);
    assert.deepEqual(g.j.save, SAVE);
    assert.deepEqual(g.j.meta, { name: 'Testnet', day: 40, cash: 1000 });
    assert.equal((await s.call('GET', '/api/save?have=1', undefined, t)).j.save, undefined, 'nothing to download when up to date');
    // A second device, still on revision 0, may not overwrite revision 1.
    const c = await s.call('PUT', '/api/save', { base: 0, save: { ...SAVE, day: 5 } }, t);
    assert.equal(c.st, 409);
    assert.equal(c.j.rev, 1);
    assert.equal(c.j.meta.day, 40);
    // Logging out revokes only that token.
    const t2 = (await s.call('POST', '/api/login', { user: 'carol', pass: 'password1' })).j.token;
    await s.call('POST', '/api/logout', undefined, t);
    assert.equal((await s.call('GET', '/api/save', undefined, t)).st, 401);
    assert.equal((await s.call('GET', '/api/save', undefined, t2)).st, 200);
    // Deleting needs the password, then everything is gone.
    assert.equal((await s.call('DELETE', '/api/account', { pass: 'wrong-one' }, t2)).st, 401);
    assert.equal((await s.call('DELETE', '/api/account', { pass: 'password1' }, t2)).st, 200);
    assert.deepEqual(fs.readdirSync(path.join(s.dir, 'saves')), []);
    assert.equal((await s.call('POST', '/api/login', { user: 'carol', pass: 'password1' })).st, 401);
  } finally { await s.close(); }
});

test('the server refuses oversized bodies and throttles password guessing', async () => {
  const s = await server();
  try {
    await s.call('POST', '/api/register', { user: 'dave', pass: 'password1' });
    const big = await fetch(s.base + '/api/login', { method: 'POST', body: 'x'.repeat(9e6) }).catch(() => null);
    assert.ok(!big || big.status === 413);
    let last;
    for (let i = 0; i < 11; i++) last = await s.call('POST', '/api/login', { user: 'dave', pass: 'guess' + i + 'xxx' });
    assert.equal(last.j.err, 'limit');
    assert.equal((await s.call('POST', '/api/login', { user: 'dave', pass: 'password1' })).j.err, 'limit', 'even the right password waits');
  } finally { await s.close(); }
});

test('cloud sync carries a network from one device to another', async () => {
  const s = await server();
  try {
    const a = device(s.base);
    a.ev("ACT.start({});ACT.launchBB({city:'fra'});for(let i=0;i<10;i++)dayTick();save()");
    a.ev("ACT.cloud({})");
    await a.ev('cloudProbe()');
    assert.match(a.ev("document.getElementById('modalCard').textContent"), /Create account/);
    a.ev("document.getElementById('clUser').value='erin';document.getElementById('clPass').value='password1'");
    await a.ev("ACT.cloudLogin({reg:1})");
    assert.equal(a.ev('CL.rev'), 1, 'the game on this device went up right away');
    assert.match(a.ev("document.getElementById('modalCard').textContent"), /Signed in as erin/);
    assert.equal(a.ev('clDirty()'), false);
    // Moving the camera is not progress: nothing to push.
    a.ev('cam.x+=500;save()');
    assert.equal(a.ev('clDirty()'), false);
    a.ev('for(let i=0;i<5;i++)dayTick();save()');
    assert.equal(a.ev('clDirty()'), true);
    await a.ev('cloudPush()');
    assert.equal(a.ev('CL.rev'), 2);

    // A fresh device with no game logs in and picks up the network.
    const b = device(s.base);
    await b.ev("cloudAuth('login','erin','password1')");
    assert.equal(b.ev('UI.started'), true);
    assert.equal(b.ev('S.day'), a.ev('S.day'));
    assert.equal(b.ev('S.name'), a.ev('S.name'));
    assert.equal(b.ev("JSON.parse(localStorage.getItem('sot-save-v1')).day"), a.ev('S.day'), 'and saves it locally too');

    // B plays on; when A comes back (the tab shows again) it loads B's progress, since A did nothing new.
    b.ev('for(let i=0;i<7;i++)dayTick();save()');
    await b.ev('cloudPush()');
    await a.ev('cloudPull()');
    assert.equal(a.ev('S.day'), b.ev('S.day'));
    assert.equal(a.ev('CL.rev'), 3);
    assert.deepEqual(a.errors, []);
    assert.deepEqual(b.errors, []);
  } finally { await s.close(); }
});

test('when two devices both played, the player chooses which network stays', async () => {
  const s = await server();
  try {
    const a = device(s.base), b = device(s.base);
    a.ev("ACT.start({});for(let i=0;i<10;i++)dayTick()");
    await a.ev("cloudAuth('register','frank','password1')");
    await b.ev("cloudAuth('login','frank','password1')");
    a.ev('for(let i=0;i<3;i++)dayTick()');
    await a.ev('cloudPush()');
    b.ev('S.cash+=12345;for(let i=0;i<20;i++)dayTick()');
    await b.ev('cloudPush()');
    assert.ok(b.ev('UI.clConf'), 'the push was refused, not silently applied');
    const text = b.ev("document.getElementById('modalCard').textContent");
    assert.match(text, /Two versions of your network/);
    assert.match(text, /This device/);
    assert.equal(b.ev("document.getElementById('modal').hidden"), false);
    // While undecided, nothing syncs behind the player's back.
    await b.ev('cloudPull()');
    assert.equal(b.ev('CL.rev'), 1);

    // Keep this device: B's network replaces the cloud copy.
    const bDay = b.ev('S.day');
    await b.ev('ACT.clKeepLocal()');
    assert.equal(b.ev('CL.rev'), 3);
    assert.equal(b.ev('UI.clConf'), null);
    assert.equal((await s.call('GET', '/api/save', undefined, b.ev('CL.t'))).j.save.day, bDay);

    // Now A has played again too; this time A takes the cloud copy instead.
    a.ev('for(let i=0;i<2;i++)dayTick()');
    await a.ev('cloudPull()');
    assert.ok(a.ev('UI.clConf'));
    await a.ev('ACT.clTakeCloud()');
    assert.equal(a.ev('S.day'), bDay);
    assert.equal(a.ev('CL.rev'), 3);
    assert.equal(a.ev('clDirty()'), false);
    assert.deepEqual(a.errors, []);
    assert.deepEqual(b.errors, []);
  } finally { await s.close(); }
});

test('without a sync server the game hides cloud sync and plays on as before', async () => {
  const a = load({ fetch: async () => new Response('<h1>404</h1>', { status: 404 }) });
  a.ev("ACT.start({});save()");
  a.ev('ACT.cloud({})');
  await a.ev('cloudProbe()');
  assert.match(a.ev("document.getElementById('modalCard').textContent"), /Cloud sync is not available on this server/);
  assert.equal(a.ev("document.getElementById('clUser')"), null);
  assert.equal(a.ev("localStorage.getItem('sot-cloud')"), null);
  assert.ok(a.ev("localStorage.getItem('sot-save-v1')"), 'the local save works as always');
  assert.deepEqual(a.errors, []);
});

test('a revoked login is forgotten, the game is kept', async () => {
  const s = await server();
  try {
    const a = device(s.base);
    a.ev("ACT.start({});save()");
    await a.ev("cloudAuth('register','gina','password1')");
    const cl = a.ev("localStorage.getItem('sot-cloud')");
    await s.call('POST', '/api/logout', undefined, a.ev('CL.t'));
    // Reloading with the stale login: boot asks the server, which says no.
    const b = device(s.base, { 'sot-cloud': cl, 'sot-save-v1': a.ev("localStorage.getItem('sot-save-v1')") });
    await b.ev('UI.clBoot');
    assert.equal(b.ev('CL'), null);
    assert.equal(b.ev('UI.started'), true);
    assert.equal(b.ev("localStorage.getItem('sot-cloud')"), null);
    assert.deepEqual(b.errors, []);
  } finally { await s.close(); }
});

test('a broken cloud login in storage is ignored', () => {
  const { ev, errors } = load({ storage: { 'sot-cloud': '{"u":5}' } });
  assert.equal(ev('CL'), null);
  assert.deepEqual(errors, []);
});

test('cloud sync opens from its own button right under "Import a save", in the menu and on the title screen', () => {
  const { ev, errors } = load({ fetch: async () => new Response('{"ok":true}') });
  const acts = () => ev("[...document.querySelectorAll('#modalCard [data-act]')].map(b=>b.dataset.act).join(',')");
  assert.match(acts(), /importPick,cloud,/, 'title screen');
  ev("ACT.start({});ACT.menu({})");
  assert.match(acts(), /importPick,cloud,/, 'menu');
  ev("ACT.settings({})");
  assert.doesNotMatch(ev("document.getElementById('modalCard').textContent"), /Cloud sync/, 'no longer in Settings');
  ev("ACT.cloud({})");
  assert.ok(ev("document.getElementById('clUser')"));
  ev("ACT.cloudClose({})");
  assert.equal(ev("document.getElementById('modal').hidden"), true, 'closing returns to the map');
  assert.deepEqual(errors, []);
});
