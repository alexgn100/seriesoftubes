const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const start = "ACT.start({});S.cash=1e9;S.lvl=13;S.nextFail=1e9;S.nextEvent=1e9;for(const g of GOALS)S.done[g.id]=0";
const g = n => `RG.findIndex(r=>r.n===${JSON.stringify(n)})`;

test('every router is classed by the highest backbone it runs', () => {
  const { ev, errors } = load();
  const want = {
    0: ['Rusty Router 9000', 'Edge Lord 400', 'Sonic the Whitebox 32'],
    1: ['Mikrowtik CCR', 'Mikrowtik CCR 3.2T'],
    2: ['Chonk 800', 'Brocadabra MLX-16', 'Extremely Networks SLX 9740'],
    3: ['Absolute Unit 1.6T', 'Arrrhipster 7280R', 'Arrrhipster 7800R', 'Arrrhipster 7800R5'],
    4: ['Absolute Unit 3.2T', 'Disco 8K', 'Disco 8K Ultra', 'Knockia 7750', 'Knockia 7950 XRS', 'Sonic the Whitebox 64', 'The Router at the End of the Universe'],
  };
  for (const [lv, names] of Object.entries(want)) for (const n of names) assert.equal(ev(`RG[${g(n)}].cr`), +lv, n);
  assert.equal(ev('RG.length'), Object.values(want).flat().length, 'every model is classed');
  assert.equal(ev("RG.filter(r=>r.v==='arrrhipster').some(r=>r.cr>=4)"), false, 'no Arrrhipster runs SRv6');
  assert.equal(ev("RG.filter(r=>r.v==='disco'||r.v==='knockia').every(r=>r.cr===4)"), true, 'every Disco and Knockia does');
  // Everything below its top, except the whitebox that does SRv6 natively and no MPLS at all.
  assert.equal(ev(`[0,1,2,3,4].map(L=>rgCore(${g('Disco 8K')},L)).join()`), 'true,true,true,true,true');
  assert.equal(ev(`[0,1,2,3,4].map(L=>rgCore(${g('Sonic the Whitebox 64')},L)).join()`), 'true,false,false,false,true');
  assert.equal(ev(`[0,1,2].map(L=>rgCore(${g('Mikrowtik CCR')},L)).join()`), 'true,true,false');
  // The two new ones go at the end, so saved POPs keep their models.
  assert.equal(ev(g('Brocadabra MLX-16')), ev('RG.length') - 2);
  assert.equal(ev("RG[RG_TOP].n"), 'The Router at the End of the Universe');
  assert.equal(ev("RG_ART.length"), ev("RG.length"), 'a picture for each');
  assert.equal(ev("mainRG(1)"), ev(g('Edge Lord 400')), 'the default upgrade path is unchanged');
  assert.equal(ev(`PZ_RG.includes(${g('Brocadabra MLX-16')})`), false, 'puzzles keep their router list');
  assert.deepEqual(errors, []);
});

test('a new network runs plain IGP: no Auto-TE until the backbone is upgraded, one step at a time', () => {
  const { ev, dom, errors } = load();
  ev(start);
  assert.deepEqual(JSON.parse(ev('JSON.stringify(S.core)')), { lv: 0, run: 0 });
  ev('ACT.buyTE()');
  assert.equal(ev('!!S.te'), false, 'no Auto-TE on plain IGP');
  ev("ACT.leftTab({t:'noc'})");
  assert.match(dom.window.document.body.textContent, /Backbone/);
  assert.match(dom.window.document.body.textContent, /Auto-TE needs an RSVP-TE/);
  const cash = ev('S.cash');
  ev('ACT.coreUp()');
  assert.equal(ev('S.core.lv'), 1);
  assert.equal(cash - ev('S.cash'), ev('CORE_COST[1]'));
  ev('ACT.buyTE()');
  assert.equal(ev('!!S.te'), false, 'LDP has no TE either');
  ev('ACT.coreUp()');
  assert.equal(ev('S.core.run'), 2);
  ev('ACT.buyTE()');
  assert.equal(ev('!!S.te'), true, 'RSVP-TE unlocks Auto-TE');
  // Customer levels gate each step.
  ev('S.lvl=3;ACT.coreUp()');
  assert.equal(ev('S.core.lv'), 2, 'SR-MPLS needs customer level 5');
  assert.deepEqual(errors, []);
});

test('running a lower level is free, and Auto-TE and RouteScript pause below RSVP-TE', () => {
  const { ev, errors } = load();
  ev(start + ";ACT.coreUp();ACT.coreUp();ACT.coreUp();ACT.buyTE();S.te.script='spill at 80%'");
  assert.equal(ev('S.core.lv'), 3);
  assert.ok(ev('!!teRules()'), 'RouteScript runs on SR-MPLS');
  const cash = ev('S.cash');
  ev('ACT.coreSet({v:1})');
  assert.equal(ev('S.core.run'), 1);
  assert.equal(ev('S.cash'), cash, 'free');
  assert.equal(ev('teRules()'), null, 'paused on LDP');
  ev('compute()');
  assert.equal(ev('R.teMoved'), 0);
  ev('ACT.coreSet({v:3})');
  assert.ok(ev('!!teRules()'), 'back on, script and all');
  ev('ACT.coreSet({v:4})');
  assert.equal(ev('S.core.run'), 3, 'cannot run what was never bought');
  assert.deepEqual(errors, []);
});

test('the core costs router CPU, less the higher it goes; POPs whose router cannot run it stay outside', () => {
  const { ev, errors } = load();
  ev(start + `;ACT.buildPop({city:'ams'});S.pops.fra.rgen=${g('Disco 8K')}`);
  const cap = c => ev(`nodeCap('${c}')`);
  const base = cap('fra');
  const at = [];
  for (let L = 1; L <= 4; L++) { ev('ACT.coreUp()'); at.push(cap('fra') / base); }
  assert.deepEqual(at.map(x => +x.toFixed(2)), [0.9, 0.92, 0.95, 0.97], 'LDP costs the most CPU, SRv6 the least');
  assert.equal(ev("inCore('ams')"), false, 'a Rusty Router cannot run SRv6');
  assert.equal(cap('ams'), ev('RG[0].cap'), 'and pays no CPU for it');
  assert.deepEqual(JSON.parse(ev('JSON.stringify(coreOut())')), ['ams']);
  assert.deepEqual(errors, []);
});

test('label switching: traffic passing through a POP costs its router less from LDP up', () => {
  const pass = lv => {
    const { ev, errors } = load();
    ev(start + ";ACT.buildPop({city:'ams'});ACT.buildPop({city:'bru'});ACT.launchBB({city:'ams'});S.pops.ams.bb.d=150");
    ev(`for(const c in S.pops)S.pops[c].rgen=${g('Mikrowtik CCR')};S.pops.bru.rgen=${g('Chonk 800')};`);
    ev("const L=(a,b,t)=>{openLinkModal(a,b);ACT.buildLink({tier:t});closeModal();};L('ams','bru',1);L('bru','fra',1);ACT.buyTransit({city:'fra',net:'cog',tier:1})");
    for (let i = 0; i < lv; i++) ev('ACT.coreUp()');
    ev('compute()');
    assert.deepEqual(errors, []);
    return { load: ev("R.nodeLoad.bru||0"), served: ev('R.served') };
  };
  const ip = pass(0), ldp = pass(1);
  assert.ok(ip.served > 50 && Math.abs(ldp.served - ip.served) < 1, 'same traffic either way');
  assert.ok(ldp.load < ip.load * 0.7, `Brussels only passes it on: lighter with labels (${ldp.load.toFixed(1)} vs ${ip.load.toFixed(1)})`);
});

test('interop failures: only with mixed vendors at the top of what some router can do', () => {
  const { ev, errors } = load();
  ev(start + `;ACT.buildPop({city:'ams'});S.pops.fra.rgen=${g('Disco 8K')};S.pops.ams.rgen=${g('Knockia 7750')};`);
  ev("const L=(a,b,t)=>{openLinkModal(a,b);ACT.buildLink({tier:t});closeModal();};L('fra','ams',1)");
  for (let i = 0; i < 4; i++) ev('ACT.coreUp()');
  assert.ok(ev('coreIopRisk()') > 0, 'Disco and Knockia at SRv6, the top for both');
  ev('ACT.coreSet({v:3})');
  assert.equal(ev('coreIopRisk()'), 0, 'one step below: they get along');
  ev('ACT.coreSet({v:4})');
  ev(`S.pops.ams.rgen=${g('Disco 8K Ultra')}`);
  assert.equal(ev('coreIopRisk()'), 0, 'one vendor never fights itself');
  ev(`S.pops.ams.rgen=${g('Knockia 7750')};ACT.coreSet({v:2})`);
  assert.equal(ev('coreIopRisk()'), 0, 'RSVP-TE is below both');
  ev(`S.pops.fra.rgen=${g('Chonk 800')}`);
  assert.ok(ev('coreIopRisk()') > 0, 'a Chonk 800 at RSVP-TE is at its top');
  assert.ok(ev('coreIopRisk()') < ev('CORE_IOP[4]'), 'and RSVP-TE squabbles less than SRv6');
  ev("fireFailure('interop')");
  const inc = "S.inc.find(i=>i.type==='interop')";
  assert.ok(ev(`!!${inc}`), 'an interop incident');
  assert.equal(ev(`linkDown(S.links.find(l=>l.id===${inc}.ref))`), true, 'the link between the vendors is down');
  assert.equal(ev("incTitle('interop')"), 'Vendor interop failure');
  assert.deepEqual(errors, []);
});

test('a new game never gets interop incidents or CPU costs: the classic game is unchanged', () => {
  const { ev, errors } = load();
  ev(start + `;ACT.buildPop({city:'ams'});S.pops.ams.rgen=${g('Knockia 7750')};S.pops.fra.rgen=${g('Disco 8K')}`);
  assert.equal(ev('coreIopRisk()'), 0);
  assert.equal(ev("nodeCap('ams')"), ev(`RG[${g('Knockia 7750')}].cap`));
  assert.deepEqual(errors, []);
});

test('saves: an old save with Auto-TE keeps it on the old rules, scenarios ignore the core, garbage is repaired', () => {
  const { ev, errors } = load();
  ev(start + ";ACT.coreUp();ACT.coreUp();ACT.buyTE()");
  ev("const s=JSON.parse(JSON.stringify(S));delete s.core;window.__t=migrate(s)");
  assert.deepEqual(JSON.parse(ev('JSON.stringify(__t.core)')), { lv: 2, run: 2, legacy: true }, 'Auto-TE bought before backbones: legacy RSVP-TE');
  ev("S=__t;compute()");
  assert.equal(ev('coreOn()'), false, 'the old rules');
  assert.equal(ev('coreTE()'), true, 'Auto-TE keeps running');
  ev('ACT.coreSet({v:2})');
  assert.equal(ev('coreOn()'), true, 'changing the backbone switches to the new rules');
  ev("const s=JSON.parse(JSON.stringify(S));delete s.core;delete s.te;window.__t=migrate(s)");
  assert.deepEqual(JSON.parse(ev('JSON.stringify(__t.core)')), { lv: 0, run: 0 }, 'no Auto-TE: plain IGP');
  ev("const s=JSON.parse(JSON.stringify(S));s.core={lv:9,run:-3,legacy:'yes'};window.__t=migrate(s)");
  assert.deepEqual(JSON.parse(ev('JSON.stringify(__t.core)')), { lv: 4, run: 0 });
  ev("S.scn={id:'x',rules:{},days:9};S.core={lv:0,run:0}");
  assert.equal(ev('coreOn()'), false, 'scenarios set TE up themselves');
  assert.deepEqual(errors, []);
});

test('the backbone panel and the router panels, on a phone too', () => {
  for (const w of [1280, 360]) {
    const { ev, dom, errors } = load();
    ev("ACT.start({});if(UI.pendGame)ACT.pitchSkip()");
    ev(`window.innerWidth=${w};` + start.replace('ACT.start({});', '') + `;ACT.buildPop({city:'ams'});S.pops.fra.rgen=${g('Disco 8K')};ACT.coreUp();ACT.coreUp();ACT.leftTab({t:'noc'});renderAll()`);
    const txt = dom.window.document.body.textContent;
    assert.match(txt, /RSVP-TE\/MPLS/, `${w}px`);
    assert.match(txt, /outside the backbone/, 'Amsterdam is left out');
    assert.match(txt, /Upgrade to SR-MPLS/);
    ev("UI.sel={type:'city',id:'fra'};UI.tab='links';UI.models=true;renderPanel()");
    const p = dom.window.document.getElementById('panelBody').textContent;
    assert.match(p, /Disco · backbone up to SRv6/);
    assert.match(p, /Brocadabra · backbone up to RSVP-TE\/MPLS/);
    assert.match(p, /Whitebox · backbone up to SRv6 · no MPLS, SRv6 only/);
    assert.deepEqual(errors, []);
  }
});
