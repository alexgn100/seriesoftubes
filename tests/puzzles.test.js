// Puzzle mode (#190): small builds with stars, no clock, and a main save that is never touched.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// Reference solutions: [a, b, route ('land' or a cable id), tier (0 = 10G, 1 = 100G)].
// `one` earns the goal star, `three` earns all three. A second land link on the same pair is a diverse route.
const REF = {
  hello: { one: [['lon', 'nyc', 'grace']], three: [['lon', 'nyc', 'grace'], ['lon', 'nyc', 'amitie']] },
  eurotrip: { one: [['lon', 'ams', 'uly'], ['ams', 'fra', 'land']], three: [['ams', 'lon', 'concerto'], ['ams', 'lon', 'nshuttle'], ['ams', 'fra', 'land'], ['ams', 'fra', 'land']] },
  shining: { one: [['nyc', 'chi', 'land'], ['chi', 'dal', 'land'], ['dal', 'sjc', 'land']], three: [['chi', 'nyc', 'land'], ['chi', 'sjc', 'land'], ['dal', 'nyc', 'land'], ['dal', 'sjc', 'land']] },
  smorgas: { one: [['osl', 'sto', 'land'], ['sto', 'hel', 'land'], ['osl', 'cph', 'land']], three: [['osl', 'sto', 'land'], ['cph', 'osl', 'land'], ['cph', 'hel', 'land'], ['hel', 'sto', 'land']] },
  downunder: { one: [['syd', 'mel', 'land'], ['mel', 'adl', 'land'], ['syd', 'bne', 'land']], three: [['mel', 'syd', 'land'], ['bne', 'syd', 'land'], ['adl', 'mel', 'land'], ['adl', 'bne', 'land']] },
  aloha: { one: [['sjc', 'hnl', 'scx'], ['hnl', 'syd', 'hwk']], three: [['hnl', 'sjc', 'scx'], ['hnl', 'sjc', 'aag'], ['hnl', 'syd', 'hwk'], ['hnl', 'syd', 'aloha']] },
  rimshot: { one: [['sea', 'tok', 'fast'], ['tok', 'hkg', 'adc'], ['hkg', 'sin', 'sjc2']], three: [['sea', 'tok', 'fast'], ['sea', 'tok', 'ncp'], ['hkg', 'tok', 'apg'], ['hkg', 'tok', 'adc'], ['hkg', 'sin', 'land'], ['hkg', 'sin', 'land']] },
  fire: { one: [['tok', 'hkg', 'adc'], ['hkg', 'sin', 'sjc2'], ['sin', 'syd', 'indigo'], ['syd', 'tok', 'guam']], three: [['hkg', 'tok', 'adc'], ['hkg', 'sin', 'land'], ['sin', 'syd', 'indigo'], ['syd', 'tok', 'guam']] },
  // Hawaiki is Seattle's only cable south, so the second way out runs overland to LA and on via Suva.
  kiwi: { one: [['akl', 'sea', 'hwk'], ['akl', 'syd', 'tasman']], three: [['akl', 'syd', 'tasman'], ['akl', 'sea', 'hwk'], ['suv', 'syd', 'scxn'], ['lax', 'sea', 'land'], ['lax', 'suv', 'scxn']] },
  guam: { one: [['tok', 'gum', 'jga'], ['gum', 'syd', 'guam'], ['tok', 'mnl', 'jup']], three: [['mnl', 'tok', 'jup'], ['syd', 'tok', 'sushi'], ['gum', 'mnl', 'bifrost'], ['gum', 'syd', 'guam']] },
  flash: { one: [['nyc', 'lon', 'hibx']], three: [['lon', 'nyc', 'grace'], ['lon', 'nyc', 'hibx']] },
  pingpong: { one: [['lax', 'tok', 'jup']], three: [['lax', 'tok', 'jup'], ['lax', 'sea', 'land'], ['sea', 'tok', 'fast']] },
  suez: { one: [['fra', 'mrs', 'land'], ['mrs', 'sin', 'peace']], three: [['fra', 'mrs', 'land'], ['fra', 'mrs', 'land'], ['mrs', 'sin', 'peace'], ['bom', 'sin', 'land'], ['bom', 'mrs', 'twoaf']] },
  samba: { one: [['sao', 'mia', 'monet']], three: [['for', 'sao', 'land'], ['for', 'sao', 'land'], ['for', 'mia', 'monet'], ['for', 'mia', 'sam1']] },
  sharks: { one: [['lis', 'mad', 'land'], ['mad', 'par', 'land'], ['par', 'mil', 'land']], three: [['lis', 'mad', 'land'], ['lis', 'mil', 'land'], ['mad', 'par', 'land'], ['mil', 'par', 'land']] },
  braces: { one: [['nyc', 'lon', 'grace'], ['lon', 'dub', 'celtix']], three: [['lon', 'nyc', 'grace'], ['dub', 'nyc', 'havf'], ['dub', 'lon', 'celtix']] },
  nofra: { one: [['ams', 'ber', 'land'], ['ber', 'muc', 'land'], ['muc', 'zrh', 'land']], three: [['ams', 'ber', 'land'], ['ams', 'zrh', 'land'], ['ber', 'muc', 'land'], ['muc', 'zrh', 'land']] },
  fatpipes: { one: [['par', 'mrs', 'land', 1], ['mrs', 'mil', 'land', 1], ['mil', 'zrh', 'land', 1]], three: [['par', 'zrh', 'land', 1], ['mrs', 'par', 'land', 1], ['mil', 'mrs', 'land', 1], ['mil', 'zrh', 'land', 1]] },
};

// Builds links the way a player does: POP at the first city, then the link picker for each hop.
function build(ev, links) {
  for (const [a, b, via, tier] of links) {
    if (!ev(`!!S.pops['${a}']`)) ev(`ACT.pzPop({city:'${a}'})`);
    ev(`ACT.pzLinkTo({a:'${a}',b:'${b}'});ACT.pzVia({v:'${via}'});ACT.pzDiv({v:1});ACT.pzLink({tier:${tier || 0}})`);
  }
  ev('closeModal()');
}
const evalP = (ev) => JSON.parse(ev('JSON.stringify(pzEval())'));

test('puzzle data: every puzzle is valid, solvable, and its 3-star reference earns three stars', () => {
  const { ev, errors } = load();
  const ids = JSON.parse(ev('JSON.stringify(PZ.map(p=>p.id))'));
  assert.ok(ids.length >= 16, 'at least 16 puzzles');
  assert.equal(new Set(ids).size, ids.length, 'ids are unique');
  assert.deepEqual(Object.keys(REF).sort(), ids.slice().sort(), 'every puzzle has a reference solution');
  assert.ok(ev("PZ.every(p=>PZ_PACKS.some(k=>k.id===p.pack)&&p.n&&p.j&&p.cities.length>=2&&p.cities.length<=6&&[...p.cities,...(p.via||[]),...(p.avoid||[])].every(c=>isCity(c)&&!CITY[c].off&&!CITY[c].cn))"), 'cities exist and are playable');
  assert.ok(ev("PZ.every(p=>!p.budget||(p.budget>=100000&&p.budget<=5e6))"), 'budgets are sane');
  assert.ok(ev("PZ_PACKS[0].need===0&&PZ_PACKS.every((k,i)=>!i||k.need>PZ_PACKS[i-1].need)"), 'packs unlock in order');
  assert.ok(ev("PZ.filter(p=>p.pack==='hello'&&!p.budget).length>=2"), 'the first puzzles give the budget star away');
  for (const id of ids) {
    ev(`pzBegin(pzDef('${id}'))`);
    build(ev, REF[id].one);
    let e = evalP(ev);
    assert.ok(e.goal, `${id}: the one-star reference reaches the goal`);
    assert.ok(e.stars >= 1, `${id}: one star`);
    ev('ACT.pzReset({})');
    assert.equal(evalP(ev).stars, 0, `${id}: reset clears it`);
    build(ev, REF[id].three);
    e = evalP(ev);
    assert.equal(e.stars, 3, `${id}: three stars (spend ${e.spend} of ${ev('S.pz.budget')}, n1 ${e.n1}, twists ${JSON.stringify(e.tw)})`);
  }
  assert.deepEqual(errors, []);
});

// Brute force over every route between the puzzle's cities (one size: 10G, or 100G under minG): is any 3-star build
// cheaper than `limit`? Each cable is one failure unit; each overland link its own trench (a second one is diverse).
function cheaper3(ev, id, limit) {
  const D = JSON.parse(ev(`(()=>{pzBegin(pzDef('${id}'));const P=S.pz,cs=[...P.cities,...P.via],tier=P.minG?1:0,o=[];
    for(const a of cs)for(const b of cs)if(a<b)for(const r of pzRoutes(a,b)){if((P.noSub&&r.sub)||subWaveWhy(tier,r.km,r.sub))continue;
      o.push({a,b,cab:r.cab,cost:pzLinkCost(r,tier,false),ms:r.ms});if(!r.cab)o.push({a,b,cab:null,cost:pzLinkCost(r,tier,true),ms:r.ms,div:1});}
    const pop={};for(const c of cs)pop[c]=pzPopCost(c);return JSON.stringify({P,o,pop});})()`));
  const { P, o, pop } = D, unit = (i) => o[i].cab ? 'c' + o[i].cab : 't' + i;
  const reach = (ls, skip) => { const adj = {}; for (const i of ls) { if (unit(i) === skip) continue; const { a, b } = o[i]; (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }
    const seen = new Set([P.cities[0]]), q = [P.cities[0]]; while (q.length) for (const v of adj[q.pop()] || []) if (!seen.has(v)) { seen.add(v); q.push(v); } return P.cities.every((c) => seen.has(c)); };
  const lat = (ls) => { const d = { [P.lat[0]]: 0 }, done = new Set(); for (;;) { let u = null; for (const k in d) if (!done.has(k) && (u === null || d[k] < d[u])) u = k; if (u === null) return Infinity; if (u === P.lat[1]) return d[u]; done.add(u);
    for (const i of ls) { const l = o[i]; if (l.a !== u && l.b !== u) continue; const v = l.a === u ? l.b : l.a, nd = d[u] + l.ms + 0.05; if (!(nd >= d[v])) d[v] = nd; } } };
  const ring = (ls) => { const nb = {}; for (const i of ls) { const { a, b } = o[i]; (nb[a] = nb[a] || new Set()).add(b); (nb[b] = nb[b] || new Set()).add(a); } const ns = Object.keys(nb);
    if (ns.length < 3 || !ns.every((c) => nb[c].size === 2)) return false; let prev = null, cur = ns[0], n = 0; do { const nx = [...nb[cur]].find((x) => x !== prev); prev = cur; cur = nx; n++; } while (cur !== ns[0] && n <= ns.length); return n === ns.length; };
  const ok = (ls) => { if (!reach(ls, null) || (P.ring && !ring(ls)) || (P.lat && lat(ls) > P.lat[2])) return false; return [...new Set(ls.map(unit))].every((u) => reach(ls, u)); };
  let found = null;
  const rec = (start, ls, cost) => { if (found) return; if (ls.length && cost < limit - 1) { const pops = new Set(P.cities); for (const i of ls) { pops.add(o[i].a); pops.add(o[i].b); } const tot = cost + [...pops].reduce((x, c) => x + pop[c], 0); if (tot < limit - 1 && ok(ls)) { found = tot; return; } }
    if (ls.length >= 7) return; for (let i = start; i < o.length; i++) { if (o[i].div && !ls.some((j) => !o[j].div && !o[j].cab && o[j].a === o[i].a && o[j].b === o[i].b)) continue; if (cost + o[i].cost < limit - 1) rec(i + 1, [...ls, i], cost + o[i].cost); } };
  rec(0, [], 0);
  return found;
}

test('budgets follow the difficulty curve: roomy first pack, ~10% in the middle, tight N-1 Club', () => {
  const { ev, errors } = load();
  const SLACK = { hello: [0.15, 0.2], fire: [0.09, 0.11], speed: [0.09, 0.11], n1: [0.05, 0.08] };
  const rows = JSON.parse(ev('JSON.stringify(PZ.filter(p=>p.budget).map(p=>({id:p.id,pack:p.pack,budget:p.budget})))'));
  for (const { id, pack, budget } of rows) {
    ev(`pzBegin(pzDef('${id}'))`);
    build(ev, REF[id].three);
    const e = evalP(ev);
    assert.equal(e.stars, 3, id);
    assert.equal(cheaper3(ev, id, e.spend), null, `${id}: the reference is the cheapest 3-star build`);
    const slack = budget / e.spend - 1, [lo, hi] = SLACK[pack];
    assert.ok(slack >= lo && slack <= hi, `${id}: ${(slack * 100).toFixed(1)}% slack, want ${lo * 100}-${hi * 100}%`);
  }
  assert.match(ev("PZ_PACKS[0].d"), /Roomy budgets/, 'the first pack does not promise "no budget"');
  assert.deepEqual(errors, []);
});

test('stars: goal, budget, N-1 and twists each count', () => {
  const { ev, errors } = load();
  ev("pzBegin(pzDef('braces'))");
  build(ev, REF.braces.one);
  let e = evalP(ev);
  assert.equal(e.stars, 2, 'connected and under budget, but one cut splits it');
  assert.ok(!e.n1 && e.weak.length > 0);
  build(ev, [['dub', 'nyc', 'havf']]);
  assert.equal(evalP(ev).stars, 3);
  ev('S.pz.budget=1000');
  assert.equal(evalP(ev).stars, 2, 'over budget loses the second star');
  // Two waves in the same trench are one backhoe away from nothing.
  ev("pzBegin(pzDef('shining'))");
  build(ev, REF.shining.one);
  ev("ACT.pzLinkTo({a:'nyc',b:'chi'});ACT.pzVia({v:'land'});ACT.pzDiv({v:0});ACT.pzLink({tier:0})");
  assert.equal(ev("new Set(S.links.filter(l=>edgeKey(l)==='chi|nyc').map(pzUnit)).size"), 1, 'same trench shares the cut');
  // A cable fails as a whole: two waves on one cable, even between different cities, are one cut.
  ev("pzBegin(pzDef('guam'))");
  build(ev, [['tok', 'mnl', 'jup'], ['mnl', 'gum', 'bifrost'], ['gum', 'syd', 'guam'], ['syd', 'tok', 'guam']]);
  e = evalP(ev);
  assert.ok(e.goal && !e.n1, 'both of Sydney\'s links ride the Guam cable: one anchor splits Sydney off');
  assert.equal(ev("new Set(S.links.filter(l=>l.cable==='guam').map(pzUnit)).size"), 1, 'one cable, one failure unit');
  assert.ok(ev("document.getElementById('pzBox').textContent").includes('One cut splits it: ' + ev('CAB.guam.name')), 'the weak spot names the cable');
  ev("ACT.pzRmLink({id:S.links[3].id})");build(ev, [['tok', 'syd', 'sushi']]);
  assert.equal(evalP(ev).stars, 3, 'a second cable into Sydney fixes it');
  // Twists: no subsea, ring, latency, minimum size, cities to avoid.
  ev("pzBegin(pzDef('sharks'))");build(ev, REF.sharks.one);
  assert.ok(evalP(ev).goal);
  ev("pzBegin(pzDef('fire'))");build(ev, REF.fire.one);ev("ACT.pzRmLink({id:S.links[3].id})");
  e = evalP(ev);
  assert.ok(e.conn && !e.goal, 'a line is not a ring');
  ev('ACT.pzUndo({})');
  assert.ok(evalP(ev).goal, 'undo puts the ring back');
  ev("pzBegin(pzDef('flash'))");build(ev, [['nyc', 'lon', 'grace']]);
  e = evalP(ev);
  assert.ok(e.conn && !e.goal, 'Grace Hopscotch is too slow for the traders');
  ev("pzBegin(pzDef('fatpipes'))");build(ev, REF.fatpipes.one.map(([a, b, v]) => [a, b, v, 0]));
  assert.ok(!evalP(ev).goal, '10G is too thin');
  ev("ACT.pzTier({id:S.links[0].id,tier:1});ACT.pzTier({id:S.links[1].id,tier:1});ACT.pzTier({id:S.links[2].id,tier:1})");
  assert.ok(evalP(ev).goal, 'upgraded in place');
  ev("pzBegin(pzDef('nofra'))");
  ev("ACT.pzPop({city:'fra'})");
  assert.equal(ev("!!S.pops.fra"), false, 'no POP in a city to avoid');
  assert.equal(ev("pzKind('lon')"), null, 'cities outside the puzzle are inert');
  ev("ACT.pzPop({city:'lon'})");
  assert.equal(ev("Object.keys(S.pops).length"), 0);
  // Subsea is greyed out in the shark tank.
  ev("pzBegin(pzDef('sharks'));ACT.pzPop({city:'lis'});ACT.pzLinkTo({a:'lis',b:'bcn'});ACT.pzVia({v:'medusa'});ACT.pzLink({tier:0})");
  assert.equal(ev('S.links.length'), 0);
  assert.deepEqual(errors, []);
});

test('no clock in a puzzle: days never pass, nothing breaks, no bills', () => {
  const { ev, errors } = load();
  ev("pzBegin(pzDef('hello'))");
  build(ev, REF.hello.three);
  ev('ACT.speed({v:8});ACT.phonePlay({});for(let i=0;i<50;i++)frame(performance.now()+i*3000)');
  assert.equal(ev('S.day'), 0);
  assert.equal(ev('UI.speed'), 0);
  assert.equal(ev('S.inc.length'), 0);
  assert.equal(ev('S.cash'), ev('START_CASH'), 'nothing is charged');
  assert.equal(ev("document.getElementById('left').hidden"), true, 'no goals/deals/NOC/networks drawer');
  assert.equal(ev("document.getElementById('pzBox').hidden"), false);
  assert.deepEqual(errors, []);
});

test('the main save is byte-identical before and after playing and solving a puzzle', () => {
  const { ev, errors } = load();
  ev("ACT.start({});S.cash=1e7;for(const g of GOALS)S.done[g.id]=0;ACT.launchBB({city:'fra'});ACT.buildPop({city:'ams'});save(true)");
  const before = ev("localStorage.getItem('sot-save-v1')");
  const name = ev('S.name'), day = ev('S.day');
  ev('ACT.puzzleMenu({})');
  assert.match(ev("document.getElementById('modalCard').textContent"), /Hello, World/);
  ev("ACT.pzStart({id:'hello'})");
  assert.equal(ev('S.mode'), 'puzzle');
  build(ev, REF.hello.three);
  ev("save(true);for(let i=0;i<5;i++)frame(performance.now()+6000*i);window.dispatchEvent(new Event('pagehide'));ACT.exportSave({})");
  assert.equal(ev("localStorage.getItem('sot-save-v1')"), before, 'untouched while in the puzzle');
  assert.equal(ev("JSON.parse(localStorage.getItem('sot-puzzles')).s.hello.st"), 3, 'the stars are kept');
  ev('ACT.pzLeave({})');
  assert.equal(ev('S.mode'), 'normal');
  assert.equal(ev('S.name'), name);
  assert.equal(ev('S.day'), day);
  assert.ok(ev('!!S.pops.ams'));
  assert.equal(ev('UI.started'), true);
  assert.equal(ev("localStorage.getItem('sot-save-v1')"), before, 'and after');
  assert.deepEqual(errors, []);
});

test('leaving a puzzle with no game goes back to the title screen', () => {
  const { ev, errors } = load();
  assert.ok(ev("!!document.querySelector('#modalCard .door[data-door=puzzle]')"), 'the title screen has a Puzzles door');
  ev("document.querySelector('#modalCard .door[data-door=puzzle]').click()");
  ev("document.querySelector('#modalCard [data-act=pzStart]').click()");
  assert.equal(ev('S.mode'), 'puzzle');
  ev('ACT.pzLeave({})');
  assert.equal(ev('S'), null);
  assert.equal(ev("localStorage.getItem('sot-save-v1')"), null, 'no main save appeared');
  assert.match(ev("document.getElementById('modalCard').textContent"), /Series/);
  assert.deepEqual(errors, []);
});

test('results card pops the stars, offers the next puzzle, a retry and a share line', () => {
  const { ev, errors } = load();
  ev("pzBegin(pzDef('eurotrip'))");
  build(ev, REF.eurotrip.one);
  let card = ev("document.getElementById('modalCard').textContent");
  assert.match(card, /Puzzle solved/);
  assert.ok(ev("!!document.querySelector('#modalCard [data-act=pzRetry]')"));
  assert.match(ev("document.querySelector('#modalCard [data-act=pzStart]').dataset.args"), /shining/);
  build(ev, [['lon', 'ams', 'concerto'], ['ams', 'fra', 'land']]);
  card = ev("document.getElementById('modalCard').textContent");
  assert.match(card, /A backhoe walks into your network/);
  assert.equal(ev("document.querySelectorAll('#modalCard .pzbig.on').length"), 3);
  const line = ev('pzShareText(pzEval())');
  assert.match(line, /^Series of Tubes puzzle Euro Trip ⭐⭐⭐ \$\d+k · seriesoftub\.es$/);
  assert.deepEqual(errors, []);
});

test('weekly puzzle: stable seed per ISO week, solvable, share string and streak', () => {
  const { ev, errors } = load();
  const a = ev("JSON.stringify(pzWeekly(new Date(2026,9,28)))"), b = ev("JSON.stringify(pzWeekly(new Date(2026,10,1)))"), c = ev("JSON.stringify(pzWeekly(new Date(2026,10,2)))");
  assert.equal(a, b, 'same week, same puzzle');
  assert.notEqual(a, c, 'next week, a new one');
  const w = JSON.parse(a);
  assert.equal(w.key, '2026-W44');
  assert.ok(w.cities.length >= 4 && w.cities.length <= 5 && w.budget > 0);
  // Every week of a few years can be solved with three stars by its own reference ring.
  for (let i = 0; i < 400; i += 7) {
    ev(`pzBegin(pzWeekly(new Date(2026,0,1+${i})))`);
    const w = JSON.parse(ev('JSON.stringify(pzWeekly(new Date(2026,0,1+' + i + ')))'));
    const cabs = w.refVia.filter((v) => v !== 'land');
    assert.equal(new Set(cabs).size, cabs.length, `week +${i}: no two hops of the reference ring share a cable`);
    build(ev, w.ref.map((x, j) => [x, w.ref[(j + 1) % w.ref.length], w.refVia[j]]));
    assert.equal(evalP(ev).stars, 3, `week +${i}`);
  }
  ev("localStorage.removeItem('sot-puzzles');pzBegin(pzWeekly(new Date(2026,9,28)))");
  build(ev, w.ref.map((x, j) => [x, w.ref[(j + 1) % w.ref.length], w.refVia[j]]));
  assert.match(ev('pzShareText(pzEval())'), /^Series of Tubes puzzle 2026-W44 ⭐⭐⭐ \$\d+k · seriesoftub\.es$/);
  assert.equal(ev("JSON.parse(localStorage.getItem('sot-puzzles')).streak.n"), 1);
  // A streak counts weeks in a row; a gap starts again.
  ev("const p=pzLoad();pzStreak(p,'2026-W45');pzStreak(p,'2026-W45');pzStreak(p,'2026-W46');window.__p=p");
  assert.equal(ev('__p.streak.n'), 3);
  ev("pzStreak(__p,'2026-W49')");
  assert.equal(ev('__p.streak.n'), 1);
  assert.equal(ev('__p.streak.best'), 3);
  assert.equal(ev("pzPrevKey('2027-W01')"), '2026-W53');
  assert.equal(ev("pzPrevKey('2026-W01')"), '2025-W52');
  assert.deepEqual(errors, []);
});

test('pack unlocking follows the stars, and bad progress data is ignored', () => {
  const { ev, errors } = load();
  ev("localStorage.removeItem('sot-puzzles')");
  assert.equal(ev("pzPackOpen('hello')"), true);
  assert.equal(ev("pzPackOpen('fire')"), false);
  ev("ACT.pzStart({id:'aloha'})");
  assert.notEqual(ev('S&&S.mode'), 'puzzle', 'a locked puzzle does not start');
  ev("localStorage.setItem('sot-puzzles',JSON.stringify({s:{hello:{st:3},eurotrip:{st:3}}}))");
  assert.equal(ev("pzPackOpen('fire')"), true, '6 stars open pack 2');
  ev('ACT.puzzleMenu({})');
  assert.match(ev("document.getElementById('modalCard').textContent"), /Next pack, Speed Runs, unlocks at 14/);
  ev("localStorage.setItem('sot-puzzles',JSON.stringify({s:{hello:{st:99,sp:'x'},nope:{st:3},__proto__:{st:3}},wk:{bad:{st:3}},streak:{n:-4,last:'<b>'}}))");
  const p = JSON.parse(ev('JSON.stringify(pzLoad())'));
  assert.deepEqual(p.s, { hello: { st: 3, sp: null } });
  assert.deepEqual(p.wk, {});
  assert.deepEqual(p.streak, { last: null, n: 0, best: 0 });
  ev("localStorage.setItem('sot-puzzles','{nope')");
  assert.equal(ev('pzStarsTotal(pzLoad())'), 0);
  assert.deepEqual(errors, []);
});

test('puzzle HUD fits a 360 px phone: bottom sheet, no tab bar, panels work', () => {
  const { dom, ev, errors } = load();
  ev("innerWidth=360;innerHeight=740;dispatchEvent(new Event('resize'))");
  ev("pzBegin(pzDef('hello'))");
  assert.equal(ev("document.getElementById('tabbar').hidden"), true);
  assert.equal(ev("document.getElementById('pzBox').hidden"), false);
  ev("selectCity('lon')");
  assert.match(ev("document.getElementById('panelBody').textContent"), /Open a POP/);
  ev("document.querySelector('#panelBody [data-act=pzPop]').click()");
  assert.ok(ev('!!S.pops.lon'));
  ev("selectCity('par')");
  assert.equal(ev("document.getElementById('panel').hidden"), true, 'other cities do nothing');
  ev("pzLinkModal('lon','nyc')");
  assert.ok(ev("document.querySelectorAll('#modalCard .tierbtn').length") === 3, 'three sizes');
  assert.deepEqual(errors, []);
  void dom;
});

test('puzzles in every language', () => {
  for (const lang of ['de', 'es', 'fr', 'it', 'pt']) {
    const { ev, errors } = load({ lang });
    ev("ACT.puzzleMenu({});pzBegin(pzDef('braces'))");
    build(ev, REF.braces.three);
    const seen = ev("['pzBox','modalCard','hud'].map(id=>document.getElementById(id).textContent).join(' ')");
    assert.ok(!/puzzles\./.test(seen), `${lang}: no raw labels`);
    assert.match(seen, /⭐/);
    assert.deepEqual(errors, [], lang);
  }
});

test('a POP in a thin market costs its higher monthly rent too, and the panel says so', () => {
  const { ev, errors } = load();
  ev("pzBegin(pzDef('kiwi'))");
  assert.ok(ev('colo("suv")') > 1, 'Suva is a thin market');
  assert.equal(ev("pzPopCost('suv')"), ev("popCost('suv')+12*popMo('suv')"));
  assert.ok(ev("pzPopCost('suv')") > ev("popCost('suv')+12*POP_MO"));
  ev("selectCity('suv')");
  assert.ok(ev("document.getElementById('panelBody').textContent").includes(ev("fmt$(popMo('suv'))") + '/mo'));
  assert.deepEqual(errors, []);
});

test('best spend: kept for the best star count, and a cheaper build at the same stars counts', () => {
  const { ev, errors } = load();
  ev("localStorage.removeItem('sot-puzzles');pzBegin(pzDef('braces'))");
  const rec = () => JSON.parse(ev("JSON.stringify(pzLoad().s.braces||null)"));
  build(ev, REF.braces.one);
  const two = evalP(ev).spend;
  assert.deepEqual(rec(), { st: 2, sp: two });
  // A gold-plated third link: N-1 but over budget is still two stars, and dearer, so the best stays.
  ev("ACT.pzLinkTo({a:'dub',b:'nyc'});ACT.pzVia({v:'havf'});ACT.pzLink({tier:2});closeModal()");
  assert.equal(evalP(ev).stars, 2);
  assert.deepEqual(rec(), { st: 2, sp: two });
  // Shrinking it to 10G earns the third star: the best spend starts again at the 3-star build.
  ev('ACT.pzTier({id:S.links[2].id,tier:0})');
  const three = evalP(ev);
  assert.equal(three.stars, 3);
  assert.deepEqual(rec(), { st: 3, sp: three.spend });
  // With a looser budget, a dearer 3-star build does not replace it; going back to the cheaper one keeps it.
  ev('S.pz.budget=1e7;ACT.pzTier({id:S.links[0].id,tier:1})');
  assert.equal(evalP(ev).stars, 3);
  assert.deepEqual(rec(), { st: 3, sp: three.spend });
  // A cheaper 3-star build after a dearer first one is recorded (the old code only recorded star rises).
  ev("localStorage.removeItem('sot-puzzles')");
  ev('ACT.pzTier({id:S.links[1].id,tier:1})');
  const dear = evalP(ev).spend;
  assert.deepEqual(rec(), { st: 3, sp: dear });
  ev('ACT.pzTier({id:S.links[1].id,tier:0});ACT.pzTier({id:S.links[0].id,tier:0})');
  assert.deepEqual(rec(), { st: 3, sp: three.spend });
  // Fewer stars never overwrite more.
  ev('ACT.pzRmLink({id:S.links[2].id})');
  assert.deepEqual(rec(), { st: 3, sp: three.spend });
  ev('ACT.puzzleMenu({})');
  assert.ok(ev("document.getElementById('modalCard').textContent").includes('best ' + ev(`fmt$(${three.spend})`)));
  assert.deepEqual(errors, []);
});
