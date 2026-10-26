#!/usr/bin/env node
/* Cloud sync for Series of Tubes: one save per account, username + password, nothing else.
   No dependencies: node:http, scrypt for passwords, and one JSON file per account under DATA_DIR
   (accounts/<id>.json for the login, saves/<id>.json for the network itself).
   The game stays local-first: the server only keeps a copy plus a revision number, and refuses a
   push that was not based on the latest revision, so two devices never silently overwrite each other.
     PORT=8081 DATA_DIR=./data node server/sync.js
   Behind a reverse proxy set TRUST_PROXY=1 so rate limits see the player's address, not the proxy's. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const USER_RE = /^[A-Za-z0-9._-]{3,32}$/;
const PASS_MIN = 8, PASS_MAX = 200;
const MAX_BODY = 8e6;     // the game refuses to import files bigger than this, too
const MAX_TOKENS = 20;    // devices signed in at once; the oldest is dropped
const SCRYPT = { N: 16384, r: 8, p: 1 };

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const scrypt = (pass, salt) => new Promise((ok, no) => crypto.scrypt(pass, salt, 64, SCRYPT, (e, k) => e ? no(e) : ok(k)));

function createServer(opts = {}) {
  const dir = path.resolve(opts.dataDir || process.env.DATA_DIR || 'data');
  const trustProxy = opts.trustProxy ?? process.env.TRUST_PROXY === '1';
  const origin = opts.allowOrigin ?? process.env.ALLOW_ORIGIN ?? '';
  for (const d of ['accounts', 'saves']) fs.mkdirSync(path.join(dir, d), { recursive: true });

  const file = (kind, id) => path.join(dir, kind, id + '.json');
  const idOf = (user) => sha('sot:' + user.toLowerCase()).slice(0, 32);
  // Write to a temp file and rename, so a crash never leaves half an account or half a save.
  const put = (f, text) => { const t = f + '.' + process.pid + '.tmp'; fs.writeFileSync(t, text); fs.renameSync(t, f); };
  const getAcc = (id) => { try { return JSON.parse(fs.readFileSync(file('accounts', id), 'utf8')); } catch (e) { return null; } };
  const putAcc = (id, a) => put(file('accounts', id), JSON.stringify(a));

  // Failed logins and sign-ups per address (and failed logins per account), in a sliding window.
  const hits = new Map();
  const limited = (key, max, ms) => { const now = Date.now(), h = (hits.get(key) || []).filter((t) => now - t < ms); hits.set(key, h); return h.length >= max; };
  const hit = (key) => { const h = hits.get(key) || []; h.push(Date.now()); hits.set(key, h); };
  const sweep = setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (!h.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3);
  sweep.unref();

  // A token is "<account id>.<secret>"; only a hash of the secret is stored.
  function newToken(id, a) {
    const secret = crypto.randomBytes(32).toString('base64url');
    a.tokens = [...(a.tokens || []), { h: sha(secret), t: Date.now() }].slice(-MAX_TOKENS);
    return id + '.' + secret;
  }
  function auth(req) {
    const m = /^Bearer ([0-9a-f]{32})\.([\w-]{20,100})$/.exec(req.headers.authorization || '');
    if (!m) return null;
    const a = getAcc(m[1]), h = sha(m[2]);
    const i = a ? (a.tokens || []).findIndex((x) => x.h === h) : -1;
    return i < 0 ? null : { id: m[1], a, i };
  }
  // What the game shows when two devices disagree: which network, how far along, how rich.
  function meta(s) {
    return { name: String(s.name || '').slice(0, 40), day: Number.isFinite(s.day) ? s.day : 0, cash: Number.isFinite(s.cash) ? s.cash : 0 };
  }

  const routes = {
    'GET /api/health': async () => [200, { ok: true }],

    'POST /api/register': async ({ body, ip }) => {
      const { user, pass } = body;
      if (typeof user !== 'string' || !USER_RE.test(user)) return [400, { err: 'bad_user' }];
      if (typeof pass !== 'string' || pass.length < PASS_MIN || pass.length > PASS_MAX) return [400, { err: 'bad_pass' }];
      if (limited('reg:' + ip, 5, 3600e3)) return [429, { err: 'limit' }];
      const id = idOf(user);
      if (getAcc(id)) return [409, { err: 'taken' }];
      hit('reg:' + ip);
      const salt = crypto.randomBytes(16).toString('hex');
      const a = { user, salt, hash: (await scrypt(pass, salt)).toString('hex'), created: new Date().toISOString(), rev: 0, at: '', meta: null };
      if (getAcc(id)) return [409, { err: 'taken' }]; // two sign-ups raced through the scrypt above
      const token = newToken(id, a);
      putAcc(id, a);
      return [201, { user, token, rev: 0 }];
    },

    'POST /api/login': async ({ body, ip }) => {
      const { user, pass } = body;
      if (typeof user !== 'string' || typeof pass !== 'string' || !USER_RE.test(user) || pass.length > PASS_MAX) return [401, { err: 'wrong' }];
      const id = idOf(user);
      if (limited('ip:' + ip, 20, 900e3) || limited('acc:' + id, 10, 900e3)) return [429, { err: 'limit' }];
      const a = getAcc(id);
      // Hash even for unknown names, so the answer takes as long either way.
      const k = await scrypt(pass, a ? a.salt : 'no-such-account');
      if (!a || !crypto.timingSafeEqual(k, Buffer.from(a.hash, 'hex'))) { hit('ip:' + ip); hit('acc:' + id); return [401, { err: 'wrong' }]; }
      const token = newToken(id, a);
      putAcc(id, a);
      return [200, { user: a.user, token, rev: a.rev }];
    },

    'POST /api/logout': async ({ who }) => {
      if (!who) return [401, { err: 'auth' }];
      who.a.tokens.splice(who.i, 1);
      putAcc(who.id, who.a);
      return [200, { ok: true }];
    },

    // ?have=N: the caller already has revision N, so only say whether that is still the latest.
    'GET /api/save': async ({ who, query, raw }) => {
      if (!who) return [401, { err: 'auth' }];
      const { a } = who, head = { rev: a.rev, at: a.at, meta: a.meta };
      if (!a.rev || query.get('have') === String(a.rev)) return [200, head];
      let save;
      try { save = fs.readFileSync(file('saves', who.id), 'utf8'); } catch (e) { return [200, { rev: 0, at: '', meta: null }]; }
      return raw(200, JSON.stringify(head).slice(0, -1) + ',"save":' + save + '}');
    },

    'PUT /api/save': async ({ who, body }) => {
      if (!who) return [401, { err: 'auth' }];
      const { a } = who, s = body.save;
      if (!s || typeof s !== 'object' || Array.isArray(s) || s.v !== 1 || typeof s.day !== 'number' || !s.pops || !Array.isArray(s.links)) return [400, { err: 'bad_save' }];
      if (body.base !== a.rev) return [409, { err: 'conflict', rev: a.rev, at: a.at, meta: a.meta }];
      put(file('saves', who.id), JSON.stringify(s));
      a.rev++; a.at = new Date().toISOString(); a.meta = meta(s);
      putAcc(who.id, a);
      return [200, { rev: a.rev, at: a.at }];
    },

    'DELETE /api/account': async ({ who, body }) => {
      if (!who) return [401, { err: 'auth' }];
      const k = await scrypt(typeof body.pass === 'string' ? body.pass.slice(0, PASS_MAX) : '', who.a.salt);
      if (!crypto.timingSafeEqual(k, Buffer.from(who.a.hash, 'hex'))) return [401, { err: 'wrong' }];
      for (const kind of ['saves', 'accounts']) fs.rmSync(file(kind, who.id), { force: true });
      return [200, { ok: true }];
    },
  };

  function readBody(req) {
    return new Promise((ok, no) => {
      const chunks = []; let n = 0;
      req.on('data', (c) => { n += c.length; if (n > MAX_BODY) { no(Object.assign(new Error('too big'), { code: 413 })); req.destroy(); } else chunks.push(c); });
      req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')));
      req.on('error', no);
    });
  }

  const server = http.createServer(async (req, res) => {
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
    if (origin) Object.assign(headers, { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, PUT, DELETE', vary: 'origin' });
    const send = (st, text) => { res.writeHead(st, headers); res.end(text); };
    const raw = (st, text) => ({ raw: [st, text] });
    try {
      if (req.method === 'OPTIONS') return send(204, '');
      const url = new URL(req.url, 'http://x');
      const fn = routes[req.method + ' ' + url.pathname];
      if (!fn) return send(404, '{"err":"not_found"}');
      let body = {};
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        const t = await readBody(req);
        try { body = t ? JSON.parse(t) : {}; } catch (e) { return send(400, '{"err":"bad_json"}'); }
        if (!body || typeof body !== 'object') body = {};
      }
      const ip = (trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
      const out = await fn({ body, ip, query: url.searchParams, who: auth(req), raw });
      if (out.raw) return send(...out.raw);
      send(out[0], JSON.stringify(out[1]));
    } catch (e) {
      if (e.code === 413) return send(413, '{"err":"too_big"}');
      console.error('[sync]', e);
      if (!res.headersSent) send(500, '{"err":"server"}');
    }
  });
  server.on('close', () => clearInterval(sweep));
  return server;
}

module.exports = { createServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 8081;
  createServer().listen(port, () => console.log(`[sync] listening on :${port}, data in ${path.resolve(process.env.DATA_DIR || 'data')}`));
}
