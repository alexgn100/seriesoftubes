// Architect runs (prototype): one network built brief by brief, reviewed by a chaos monkey.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// Reference builds, brief by brief: [a, b, route] lays a tube (a diverse trench when the pair has one), ['@rm', city]
// closes a POP. Each must pass every brief within budget and land at par.
const REF = {
  euro: [[['ams', 'fra', 'land']], [['ams', 'par', 'land'], ['ams', 'lon', 'nshuttle']], [['par', 'fra', 'land']],
    [['ams', 'zrh', 'land'], ['par', 'zrh', 'land']], [['lon', 'par', 'pasdc'], ['ams', 'lon', 'concerto']], [['@rm', 'fra'], ['ams', 'dus', 'land'], ['ams', 'dus', 'land']]],
  usa: [[['ash', 'nyc', 'land']], [['ash', 'chi', 'land']], [['nyc', 'chi', 'land']], [], [['chi', 'dal', 'land'], ['dal', 'sjc', 'land']], [['chi', 'sjc', 'land']]],
  pacific: [[['tok', 'hkg', 'adc']], [['hkg', 'sin', 'land']], [['tok', 'hkg', 'apg']], [['hkg', 'sin', 'sjc2']], [['sin', 'syd', 'indigo']]],
};
const lay = (ev, a, b, via, div = 1) => ev(`ACT.pzLinkTo({a:'${a}',b:'${b}'});ACT.pzVia({v:'${via}'});ACT.pzDiv({v:${div}});ACT.pzLink({tier:AR_TIER});closeModal()`);
const review = (ev) => { ev('arShowStart();arShowSkip()'); return ev('S.ar.passed===pzSig()'); };

test('architect runs: every reference passes each brief, on plan and within budget', () => {
  const { ev, errors } = load();
  assert.deepEqual(JSON.parse(ev('JSON.stringify(AR_RUNS.map(r=>r.id))')).sort(), Object.keys(REF).sort());
  for (const [id, plan] of Object.entries(REF)) {
    ev(`ACT.pzArStart({id:'${id}'})`);
    assert.equal(ev('arOn()&&!!S.pops[S.ar.hq]'), true, `${id}: starts with a POP at HQ`);
    plan.forEach((steps, i) => {
      for (const s of steps) if (s[0] === '@rm') ev(`ACT.pzRmPop({city:'${s[1]}'})`); else lay(ev, ...s);
      assert.equal(review(ev), true, `${id} brief ${i + 1}: ${ev('arEval().why')} ${ev('JSON.stringify(UI.arFail)')}`);
      if (i < plan.length - 1) ev('ACT.pzArNext()');
    });
    assert.equal(ev('arOver()'), 0, `${id}: never over a brief's tubes`);
    assert.equal(ev('arSpend()<=arRun().budget'), true, `${id}: within budget`);
    assert.ok(ev('arSpend()>arRun().budget*0.95'), `${id}: the budget sits just above the reference`);
    ev('ACT.pzArNext()');
    assert.equal(ev('JSON.parse(localStorage.getItem(AR_KEY)).runs[S.ar.id].st'), 3, `${id}: three stars stored`);
  }
  assert.deepEqual(errors, []);
});

test('architect runs: the chaos monkey finds a shared trench, edits clear the cut, old builds are paid for', () => {
  const { ev, errors } = load();
  ev("ACT.pzArStart({id:'euro'})");
  assert.equal(ev("arHide('lis')&&arHide('bru')"), true, 'cities outside the run are hidden');
  assert.deepEqual(JSON.parse(ev("JSON.stringify([arHide('dus'),arTags('dus'),arTags('fra').map(t=>t.n+t.i)])")), [false, [{ n: 6, i: '🚨' }], ['3🚨', '6🚫']], 'later briefs show on the map, numbered');
  ev('ACT.pzArAll()');
  assert.equal(ev("arHide('lis')"), false, 'and shown on request');
  ev('ACT.pzArAll()');
  lay(ev, 'ams', 'fra', 'land'); review(ev); ev('ACT.pzArNext()');
  lay(ev, 'ams', 'par', 'land'); lay(ev, 'ams', 'lon', 'nshuttle'); review(ev); ev('ACT.pzArNext()');
  lay(ev, 'ams', 'fra', 'land', 0); // the same trench: looks redundant, is not
  assert.equal(review(ev), false);
  assert.deepEqual(JSON.parse(ev('JSON.stringify(UI.arFail.gold)')), ['fra']);
  assert.ok(ev('S.links.some(l=>l.cut)'), 'the failing cut stays on the map');
  ev('ACT.pzUndo()');
  assert.equal(ev('!UI.arFail&&!S.links.some(l=>l.cut)'), true, 'an edit clears it');
  const sunk = ev('S.ar.sunk');
  ev("ACT.pzRmLink({id:S.links.find(l=>l.br===0).id})");
  assert.ok(ev('S.ar.sunk') > sunk, 'removing an earlier brief\'s tube refunds nothing');
  ev('ACT.pzReset()');
  assert.equal(ev('S.ar.sunk'), sunk, 'reset goes back to the start of the brief');
  // Two diverse trenches would make both gold, but the plan has one tube: the ring is the answer.
  lay(ev, 'ams', 'fra', 'land'); lay(ev, 'ams', 'par', 'land');
  assert.deepEqual(JSON.parse(ev('JSON.stringify(arTubes())')), { u: 2, max: 1, over: 1 });
  ev('ACT.pzReset()');
  lay(ev, 'par', 'fra', 'land');
  assert.equal(ev('arTubes().over'), 0);
  assert.equal(review(ev), true);
  assert.deepEqual(errors, []);
});

test('architect runs: a latency brief needs the fast path, and normal puzzles are untouched', () => {
  const { ev, errors } = load();
  ev("ACT.pzArStart({id:'usa'})");
  lay(ev, 'ash', 'nyc', 'land'); review(ev); ev('ACT.pzArNext()');
  lay(ev, 'ash', 'chi', 'land'); review(ev); ev('ACT.pzArNext()');
  lay(ev, 'ash', 'nyc', 'land'); assert.equal(review(ev), true, 'a diverse trench makes New York gold'); ev('ACT.pzArNext()');
  assert.equal(ev('arEval().lat.ok'), false, 'via Ashburn is too slow');
  lay(ev, 'nyc', 'chi', 'land');
  assert.equal(ev('arEval().lat.ok&&arEval().ready'), true);
  ev("ACT.pzStart({id:'hello'})");
  assert.equal(ev('!S.ar&&pzKind("lon")==="goal"&&!arHide("par")'), true);
  assert.deepEqual(errors, []);
});

test('architect runs: Play on the title screen\'s puzzle list starts a run', () => {
  const { ev, errors } = load();
  ev('ACT.puzzleMenu()');
  assert.equal(ev('S'), null, 'no game loaded yet');
  ev("document.querySelector('#modal [data-act=pzArStart]').click()");
  assert.equal(ev('arOn()&&S.ar.id'), 'euro');
  assert.deepEqual(errors, []);
});

test('architect runs: a ring goal needs one cycle through its cities', () => {
  const { ev, errors } = load();
  ev("ACT.pzArStart({id:'euro'})");
  lay(ev, 'ams', 'fra', 'land'); review(ev); ev('ACT.pzArNext()');
  lay(ev, 'ams', 'par', 'land'); lay(ev, 'ams', 'lon', 'nshuttle'); review(ev); ev('ACT.pzArNext()');
  lay(ev, 'par', 'fra', 'land'); review(ev); ev('ACT.pzArNext()');
  lay(ev, 'ams', 'zrh', 'land'); lay(ev, 'par', 'zrh', 'land'); review(ev); ev('ACT.pzArNext()');
  assert.equal(ev("arRingOk(['ams','par','lon'])"), false, 'London hangs off Amsterdam: no ring');
  assert.match(ev('arEval().why'), /ring/i);
  lay(ev, 'lon', 'par', 'pasdc');
  assert.equal(ev("arRingOk(['ams','par','lon'])&&arEval().ready"), true);
  assert.ok(ev("arSum(arRun().briefs[5])").includes('Frankfurt'), 'the plan shows what is coming');
  assert.deepEqual(errors, []);
});

test('architect runs: the detour needs room, and a roomy but pricey build misses the budget star', () => {
  const { ev, errors } = load();
  ev("ACT.pzArStart({id:'euro'})");
  const head = [[['ams', 'fra', 'land']], [['ams', 'par', 'land'], ['ams', 'lon', 'nshuttle']], [['par', 'fra', 'land']]];
  const run = (plan) => plan.forEach((steps, i) => {
    for (const s of steps) if (s[0] === '@rm') ev(`ACT.pzRmPop({city:'${s[1]}'})`); else lay(ev, ...s);
    assert.equal(review(ev), true, `brief ${i + 1}: ${ev('arEval().why')} ${ev('JSON.stringify(UI.arFail)')}`);
    ev('ACT.pzArNext()');
  });
  run(head);
  // Zürich hung off Frankfurt: connected both ways, but a cut on Amsterdam-Frankfurt sends Frankfurt and Zürich through
  // Paris, and that tube is too thin for all three.
  lay(ev, 'fra', 'zrh', 'land'); lay(ev, 'par', 'zrh', 'land');
  assert.equal(review(ev), false);
  assert.ok(JSON.parse(ev('JSON.stringify(UI.arFail.short)')).length > 0, 'someone still connected runs short');
  assert.deepEqual(JSON.parse(ev('JSON.stringify(UI.arFail.gold)')), [], 'nobody gold is cut off');
  ev('ACT.pzReset()');
  lay(ev, 'ams', 'zrh', 'land'); lay(ev, 'par', 'zrh', 'land');
  assert.equal(review(ev), true, 'Zürich straight to HQ spreads the detours');
  ev('ACT.pzArNext()');
  // Paris doubles: a second Amsterdam-Paris trench gives room, at a price.
  lay(ev, 'lon', 'par', 'pasdc'); lay(ev, 'ams', 'par', 'land');
  assert.equal(review(ev), true); ev('ACT.pzArNext()');
  ev("ACT.pzRmPop({city:'fra'})"); lay(ev, 'ams', 'dus', 'land'); lay(ev, 'dus', 'zrh', 'land');
  assert.equal(review(ev), true);
  assert.equal(ev('arOver()'), 0);
  assert.ok(ev('arSpend()') > ev('arRun().budget'));
  assert.equal(ev('arStars(arSpend())'), 2, 'on plan, over budget: two stars');
  assert.deepEqual(errors, []);
});

test('architect runs: a bigger tube brings a bigger router, and changing an old tube is a new lease', () => {
  const { ev, errors } = load();
  ev("ACT.pzArStart({id:'euro'})");
  lay(ev, 'ams', 'fra', 'land'); review(ev); ev('ACT.pzArNext()');
  assert.equal(ev("S.pops.ams.rgen||0"), 0, 'the free router takes 100G');
  const sunk = ev('S.ar.sunk');
  ev("ACT.pzTier({id:S.links[0].id,tier:2})");
  assert.ok(ev("RG[S.pops.ams.rgen].maxLT>=2&&RG[S.pops.fra.rgen].maxLT>=2"), '400G needs a bigger router at both ends');
  assert.ok(ev('S.ar.sunk') > sunk, 'the old 100G lease is paid for');
  ev('ACT.pzUndo()');
  assert.equal(ev("(S.pops.ams.rgen||0)===0&&S.ar.sunk===" + sunk), true, 'undo puts it all back');
  assert.deepEqual(errors, []);
});
