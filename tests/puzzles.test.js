// Puzzle mode (#190): small builds with stars, no clock, and a main save that is never touched.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// Reference solutions: [a, b, route ('land' or a cable id), tier (0 = 10G, 1 = 100G)].
// `one` earns the goal star, `three` earns all three. A second land link on the same pair is a diverse route.
const REF = {
  hello: { one: [['lon', 'nyc', 'grace']], three: [['lon', 'nyc', 'grace'], ['lon', 'nyc', 'amitie']] },
  eurotrip: { one: [['lon', 'ams', 'uly'], ['ams', 'fra', 'land']], three: [['lon', 'ams', 'uly'], ['lon', 'ams', 'concerto'], ['ams', 'fra', 'land'], ['ams', 'fra', 'land']] },
  shining: { one: [['nyc', 'chi', 'land'], ['chi', 'dal', 'land'], ['dal', 'sjc', 'land']], three: [['nyc', 'chi', 'land'], ['chi', 'sjc', 'land'], ['sjc', 'dal', 'land'], ['dal', 'nyc', 'land']] },
  smorgas: { one: [['osl', 'sto', 'land'], ['sto', 'hel', 'land'], ['osl', 'cph', 'land']], three: [['osl', 'sto', 'land'], ['sto', 'hel', 'land'], ['hel', 'cph', 'land'], ['cph', 'osl', 'land']] },
  downunder: { one: [['syd', 'mel', 'land'], ['mel', 'adl', 'land'], ['syd', 'bne', 'land']], three: [['syd', 'mel', 'land'], ['mel', 'adl', 'land'], ['adl', 'bne', 'land'], ['bne', 'syd', 'land']] },
  aloha: { one: [['sjc', 'hnl', 'scx'], ['hnl', 'syd', 'hwk']], three: [['sjc', 'hnl', 'scx'], ['sjc', 'hnl', 'aag'], ['hnl', 'syd', 'hwk'], ['hnl', 'syd', 'aloha']] },
  rimshot: { one: [['sea', 'tok', 'fast'], ['tok', 'hkg', 'adc'], ['hkg', 'sin', 'sjc2']], three: [['sea', 'tok', 'fast'], ['sea', 'tok', 'ncp'], ['tok', 'hkg', 'adc'], ['tok', 'hkg', 'apg'], ['hkg', 'sin', 'sjc2'], ['hkg', 'sin', 'land']] },
  fire: { one: [['tok', 'hkg', 'adc'], ['hkg', 'sin', 'sjc2'], ['sin', 'syd', 'indigo'], ['syd', 'tok', 'guam']], three: [['tok', 'hkg', 'adc'], ['hkg', 'sin', 'sjc2'], ['sin', 'syd', 'indigo'], ['syd', 'tok', 'guam']] },
  kiwi: { one: [['akl', 'sea', 'hwk'], ['akl', 'syd', 'tasman']], three: [['akl', 'sea', 'hwk'], ['sea', 'hnl', 'hwk'], ['hnl', 'akl', 'hwk'], ['akl', 'syd', 'tasman'], ['akl', 'syd', 'scx']] },
  guam: { one: [['tok', 'gum', 'jga'], ['gum', 'syd', 'guam'], ['tok', 'mnl', 'jup']], three: [['tok', 'mnl', 'jup'], ['mnl', 'gum', 'bifrost'], ['gum', 'syd', 'guam'], ['syd', 'tok', 'guam']] },
  flash: { one: [['nyc', 'lon', 'hibx']], three: [['nyc', 'lon', 'hibx'], ['nyc', 'lon', 'grace']] },
  pingpong: { one: [['lax', 'tok', 'jup']], three: [['lax', 'tok', 'jup'], ['lax', 'sea', 'land'], ['sea', 'tok', 'fast']] },
  suez: { one: [['fra', 'mrs', 'land'], ['mrs', 'sin', 'peace']], three: [['fra', 'mrs', 'land'], ['fra', 'mrs', 'land'], ['mrs', 'sin', 'peace'], ['mrs', 'bom', 'twoaf'], ['bom', 'sin', 'land']] },
  samba: { one: [['sao', 'mia', 'monet']], three: [['sao', 'mia', 'monet'], ['sao', 'for', 'land'], ['for', 'mia', 'monet']] },
  sharks: { one: [['lis', 'mad', 'land'], ['mad', 'par', 'land'], ['par', 'mil', 'land']], three: [['lis', 'mad', 'land'], ['mad', 'par', 'land'], ['par', 'mil', 'land'], ['mil', 'lis', 'land']] },
  braces: { one: [['nyc', 'lon', 'grace'], ['lon', 'dub', 'celtix']], three: [['nyc', 'lon', 'grace'], ['lon', 'dub', 'celtix'], ['dub', 'nyc', 'havf']] },
  nofra: { one: [['ams', 'ber', 'land'], ['ber', 'muc', 'land'], ['muc', 'zrh', 'land']], three: [['ams', 'ber', 'land'], ['ber', 'muc', 'land'], ['muc', 'zrh', 'land'], ['zrh', 'ams', 'land']] },
  fatpipes: { one: [['par', 'mrs', 'land', 1], ['mrs', 'mil', 'land', 1], ['mil', 'zrh', 'land', 1]], three: [['par', 'mrs', 'land', 1], ['mrs', 'mil', 'land', 1], ['mil', 'zrh', 'land', 1], ['zrh', 'par', 'land', 1]] },
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
  ev("ACT.start({});S.cash=1e7;for(const g of GOALS)S.done[g.id]=0;ACT.launchBB({city:'fra'});ACT.buildPop({city:'ams'});save(true);window.__slot=UI.slot");
  const before = ev("slotRaw(UI.slot||window.__slot)");
  const name = ev('S.name'), day = ev('S.day');
  ev('ACT.puzzleMenu({})');
  assert.match(ev("document.getElementById('modalCard').textContent"), /Hello, World/);
  ev("ACT.pzStart({id:'hello'})");
  assert.equal(ev('S.mode'), 'puzzle');
  build(ev, REF.hello.three);
  ev("save(true);for(let i=0;i<5;i++)frame(performance.now()+6000*i);window.dispatchEvent(new Event('pagehide'));ACT.exportSave({})");
  assert.equal(ev("slotRaw(UI.slot||window.__slot)"), before, 'untouched while in the puzzle');
  assert.equal(ev("JSON.parse(localStorage.getItem('sot-puzzles')).s.hello.st"), 3, 'the stars are kept');
  ev('ACT.pzLeave({})');
  assert.equal(ev('S.mode'), 'normal');
  assert.equal(ev('S.name'), name);
  assert.equal(ev('S.day'), day);
  assert.ok(ev('!!S.pops.ams'));
  assert.equal(ev('UI.started'), true);
  assert.equal(ev("slotRaw(UI.slot||window.__slot)"), before, 'and after');
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
  assert.equal(ev("slotIdx(true).length"), 0, 'no network was saved');
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
  for (let i = 0; i < 160; i += 7) {
    ev(`pzBegin(pzWeekly(new Date(2026,0,1+${i})))`);
    const ring = JSON.parse(ev('JSON.stringify(pzWeekly(new Date(2026,0,1+' + i + ')).ref)'));
    const links = ring.map((x, j) => { const y = ring[(j + 1) % ring.length]; return [x, y, ev(`pzRoutes('${x}','${y}').sort((p,q)=>pzLinkCost(p,0)-pzLinkCost(q,0))[0].via`)]; });
    build(ev, links);
    assert.equal(evalP(ev).stars, 3, `week +${i}`);
  }
  ev("localStorage.removeItem('sot-puzzles');pzBegin(pzWeekly(new Date(2026,9,28)))");
  const ring = w.ref;
  build(ev, ring.map((x, j) => { const y = ring[(j + 1) % ring.length]; return [x, y, ev(`pzRoutes('${x}','${y}').sort((p,q)=>pzLinkCost(p,0)-pzLinkCost(q,0))[0].via`)]; }));
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
