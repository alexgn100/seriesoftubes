const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

function setup(ev) {
  ev("ACT.start({});S.cash=1e8;S.offers=[];S.biz=[];S.nextFail=S.nextEvent=1e6;for(const g of GOALS)S.done[g.id]=0;S.pops.fra.rgen=3;ACT.buyTransit({city:'fra',net:'lvl',tier:1});compute()");
}
function offer(ev, id, extra = {}) {
  ev(`S.offers.push(${JSON.stringify({ id, city: 'fra', name: id, type: 'dia', bw: 1, rate: 600, reqs: [], exp: 30, ...extra })})`);
}

test('auto-accept waits five real seconds at every game speed and the toggle stops it', () => {
  for (const speed of [0.5, 1, 2, 4, 8]) {
    const { ev, dom, errors } = load();
    setup(ev);
    offer(ev, 'first');
    ev("ACT.autoToggle({k:'autoSales'});UI.autoSalesAt=1000");
    const start = ev('UI.autoSalesAt');
    ev(`UI.speed=${speed};automationTick(${start + 4999})`);
    assert.equal(ev('S.biz.length'), 0, speed);
    ev(`automationTick(${start + 5000})`);
    assert.equal(ev('S.biz[0].id'), 'first', speed);
    offer(ev, 'second');
    ev(`automationTick(${start + 9999})`);
    assert.equal(ev('S.biz.length'), 1, speed);
    ev(`automationTick(${start + 10000})`);
    assert.equal(ev('S.biz.length'), 2, speed);
    ev("ACT.autoToggle({k:'autoSales'})");
    offer(ev, 'off');
    ev(`automationTick(${start + 20000});ACT.accept({id:'off',auto:true})`);
    assert.equal(ev('S.biz.length'), 2, speed);
    assert.equal(ev('S.offers[0].id'), 'off', speed);
    assert.deepEqual(errors, []);
    dom.window.close();
  }
});

test('Accept buttons share a real-time countdown in Deals, city offers and fiber broker offers', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  offer(ev, 'ready');
  offer(ev, 'waiting', { reqs: ['gen'] });
  ev("window.testNow=1000;performance.now=()=>testNow;ACT.leftTab({t:'deals'});UI.sel={type:'city',id:'fra'};UI.tab='cust';UI.leftOpen=true;renderAll()");
  assert.equal(dom.window.document.querySelectorAll('[data-auto-sales]').length, 0);
  ev("ACT.autoToggle({k:'autoSales'});renderAutoCountdown()");
  const counts = () => [...dom.window.document.querySelectorAll('[data-auto-sales]')];
  const readyCounts = () => counts().filter(el => el.dataset.autoSales === 'ready');
  assert.ok(readyCounts().length >= 2, 'Deals and the city panel both show it');
  assert.ok(readyCounts().every(el => el.textContent === '(5)'));
  assert.ok(counts().filter(el => el.dataset.autoSales === 'waiting').every(el => el.textContent === ''), 'unmet requirements have no countdown');
  ev('testNow=2001;renderAutoCountdown()');
  assert.ok(readyCounts().every(el => el.textContent === '(4)'));
  ev('testNow=3000;UI.speed=8;renderAutoCountdown()');
  assert.ok(readyCounts().every(el => el.textContent === '(3)'));
  ev('UI.speed=0.5;renderAll();renderAutoCountdown()');
  assert.ok(readyCounts().every(el => el.textContent === '(3)'), 'game speed and re-rendering leave the real-time clock alone');
  assert.match(dom.window.document.querySelector('#leftBody [data-act="accept"]').textContent, /Accept \(3\)/);
  ev("ACT.buildPop({city:'ams'});S.links.push({id:'fiber',a:'fra',b:'ams',kind:'df',sys:'lite',ch:[],own:true,km:450,ready:0,cut:0,mo:1})");
  offer(ev, 'broker', { type: 'wwave', city2: 'ams', link: 'fiber', slots: 1, what: 'One wave' });
  ev("compute();UI.sel={type:'link',id:'fiber'};renderPanel()");
  const broker = dom.window.document.querySelector('#panelBody [data-act="accept"] [data-auto-sales]');
  assert.ok(broker);
  assert.equal(broker.textContent, '(3)');
  ev('testNow=6000;automationTick(testNow);renderAutoCountdown()');
  assert.equal(ev("S.biz.some(b=>b.id==='ready')"), true);
  assert.equal(ev("S.offers.some(o=>o.id==='waiting')"), true, 'the countdown does not bypass requirements');
  offer(ev, 'next-ready');
  ev('renderAll();renderAutoCountdown()');
  assert.ok(counts().filter(el => el.dataset.autoSales === 'next-ready').every(el => el.textContent === '(5)'), 'the next check starts a fresh countdown');
  ev("ACT.autoToggle({k:'autoSales'});renderAutoCountdown()");
  assert.equal(counts().length, 0);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('only ready offers get a countdown, including after requirements or capacity change', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  offer(ev, 'ready');
  offer(ev, 'needs-generator', { reqs: ['gen'] });
  offer(ev, 'too-big', { bw: 1000 });
  offer(ev, 'expired', { exp: 0 });
  ev("window.testNow=1000;performance.now=()=>testNow;ACT.leftTab({t:'deals'});ACT.autoToggle({k:'autoSales'});renderAutoCountdown()");
  const count = id => dom.window.document.querySelector(`#leftBody [data-auto-sales="${id}"]`).textContent;
  assert.equal(count('ready'), '(5)');
  assert.equal(count('needs-generator'), '');
  assert.equal(count('too-big'), '');
  assert.equal(count('expired'), '');
  ev('S.pops.fra.gen=true;after()');
  assert.equal(count('needs-generator'), '(5)', 'becoming eligible shows the timer');
  ev('S.pops.fra.gen=false;compute();renderAutoCountdown()');
  assert.equal(count('needs-generator'), '', 'a requirement becoming false hides it immediately');
  ev("S.offers.find(o=>o.id==='too-big').bw=2;after()");
  assert.equal(count('too-big'), '(5)', 'actions invalidate the capacity preview');
  ev('testNow=6000;automationTick(testNow);renderAutoCountdown()');
  assert.equal(ev("S.offers.some(o=>o.id==='needs-generator')"), true, 'acceptance checks requirements again');
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('readiness trials are shared between views and are not repeated for every redraw', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  offer(ev, 'ready');
  ev("window.testNow=1000;performance.now=()=>testNow;ACT.leftTab({t:'deals'});UI.sel={type:'city',id:'fra'};UI.tab='cust';window.originalAutoOffer=autoOffer;window.trials=0;window.autoOffer=o=>{trials++;return originalAutoOffer(o)};ACT.autoToggle({k:'autoSales'})");
  assert.equal(ev('trials'), 1);
  ev('renderAll();compute();renderAll();renderAutoCountdown()');
  assert.equal(ev('trials'), 1, 'ordinary routing refreshes reuse the preview');
  ev('after()');
  assert.equal(ev('trials'), 2, 'a real action refreshes readiness');
  ev('window.autoOffer=originalAutoOffer');
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('auto-accept leaves unready and expired offers alone without failure notifications', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  offer(ev, 'generator', { reqs: ['gen'] });
  offer(ev, 'missing-pop', { city: 'ams' });
  offer(ev, 'scrub', { type: 'scrub' });
  offer(ev, 'expired', { exp: 0 });
  offer(ev, 'ipv6', { reqs: ['ipv6'] });
  const log = ev('S.log.length');
  ev('S.autoSales=true;UI.autoGame=S;UI.autoSalesAt=0;automationTick(5000)');
  assert.equal(ev('S.biz.length'), 0);
  assert.equal(ev('S.offers.length'), 5);
  assert.equal(ev('S.log.length'), log, 'no repeated failed manual-action toasts');
  ev('S.pops.fra.gen=true;compute();automationTick(10000)');
  assert.equal(ev('S.biz.length'), 1);
  assert.equal(ev('S.biz[0].id'), 'generator');
  // Manual acceptance keeps its existing sign-now, provision-later behavior.
  ev("ACT.accept({id:'scrub'})");
  assert.equal(ev("S.biz.some(b=>b.id==='scrub')"), true);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('the trial includes new bandwidth and later offers cannot overbook earlier accepted sales', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  offer(ev, 'one', { bw: 60 });
  offer(ev, 'two', { bw: 60 });
  const state = ev('JSON.stringify(S)');
  ev('window.beforeState=S;window.beforeResult=R;window.beforeHot=UI.hotMap');
  assert.equal(ev('!!autoOffer(S.offers[0])'), true);
  assert.equal(ev('JSON.stringify(S)'), state);
  assert.equal(ev('S===beforeState&&R===beforeResult&&UI.hotMap===beforeHot'), true);
  ev('S.autoSales=true;UI.autoGame=S;UI.autoSalesAt=0;automationTick(5000)');
  assert.equal(ev('S.biz.length'), 1);
  assert.equal(ev('S.offers[0].id'), 'two');
  assert.ok(ev('bizSf(S.biz[0])') >= 0.95);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('auto-accept checks actual circuits, latency and NNI capacity', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev("ACT.buildPop({city:'ams'});S.pops.ams.rgen=3;compute()");
  offer(ev, 'circuit', { type: 'hft', city2: 'ams', bw: 10, latMax: 50, reqs: ['lat'] });
  assert.equal(ev('!!autoOffer(S.offers[0])'), false, 'POPs alone are not a circuit');
  ev("S.links.push({id:'path',a:'fra',b:'ams',kind:'wave',tier:1,km:450,sub:false,cut:0,mo:1});compute()");
  assert.equal(ev('!!autoOffer(S.offers[0])'), true);
  ev('S.offers[0].latMax=0.1');
  assert.equal(ev('!!autoOffer(S.offers[0])'), false, 'latency budget must pass');
  ev("S.offers=[];window.fabric=FABS.find(f=>f.cities.includes('fra')).id;ACT.buyNni({city:'fra',prov:fabric,tier:0})");
  const prov = ev('fabric');
  const bandwidth = ev('NNI[0].g * 0.75');
  offer(ev, 'fabric-one', { type: 'fabip', prov, bw: bandwidth, reqs: ['nni'] });
  offer(ev, 'fabric-two', { type: 'fabip', prov, bw: bandwidth, reqs: ['nni'] });
  // Transit has enough headroom, so the second rejection is the shared NNI port.
  ev("S.transit[0].tier=4;compute();S.autoSales=true;UI.autoGame=S;UI.autoSalesAt=0;automationTick(5000)");
  assert.equal(ev('S.biz.length'), 1);
  assert.equal(ev('S.offers[0].id'), 'fabric-two');
  assert.ok(ev("nniUsed('fra',fabric)<=NNI[0].g"));
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('new circuits do not take service away from healthy signed customers', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev("ACT.buildPop({city:'ams'});S.pops.ams.rgen=3;S.links.push({id:'path',a:'fra',b:'ams',kind:'wave',tier:1,km:450,sub:false,cut:0,mo:1});S.transit[0].city='ams';compute()");
  offer(ev, 'existing', { bw: 80 });
  ev("ACT.accept({id:'existing'})");
  offer(ev, 'new-circuit', { type: 'l2vpn', city2: 'ams', bw: 50 });
  assert.equal(ev('bizWhy(S.biz[0]).length'), 0);
  assert.equal(ev('!!autoOffer(S.offers[0])'), false);
  assert.ok(ev('bizSf(S.biz[0])') >= 0.95, 'failed preview leaves the old routing result intact');
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('fiber sales check live equipment and free spectrum, and repeated carrier orders still merge', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev("ACT.buildPop({city:'ams'});S.pops.ams.rgen=3;S.links=[{id:'fiber',a:'fra',b:'ams',kind:'df',own:true,sys:'lite',ch:Array(14).fill('zr4'),km:450,sub:false,ready:0,cut:0,mo:1}];S.biz=[{id:'old',name:'Same Carrier',type:'wwave',city:'fra',city2:'ams',link:'fiber',bw:1,rate:1000,slots:1,reqs:[],mood:100,since:0}];compute()");
  offer(ev, 'full', { type: 'wwave', city2: 'ams', link: 'fiber', slots: 2 });
  assert.equal(ev('!!autoOffer(S.offers[0])'), false);
  ev("S.offers[0].slots=1;S.offers[0].name='Same Carrier';S.links[0].eqDown=10;compute()");
  assert.equal(ev('!!autoOffer(S.offers[0])'), false, 'a broken amplifier prevents a wave sale');
  ev('S.links[0].eqDown=0;compute();S.autoSales=true;UI.autoGame=S;UI.autoSalesAt=0;automationTick(5000)');
  assert.equal(ev('S.biz.length'), 1);
  assert.equal(ev('S.biz[0].slots'), 2);
  assert.equal(ev('S.biz[0].rate'), 1600);
  assert.equal(ev('freeCh(S.links[0])'), 0);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('capacity pair sales need completed infrastructure and reserve it for the accepted contract', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  offer(ev, 'pairs', { type: 'capfib', city2: 'ams', slots: 2, win: 90 });
  assert.equal(ev('!!autoOffer(S.offers[0])'), false);
  ev("ACT.buildPop({city:'ams'});S.links=[{id:'own',a:'fra',b:'ams',kind:'df',own:true,sys:'roadm',ch:[],km:450,sub:false,ready:0,cut:0,mo:1}];compute()");
  assert.equal(ev('!!autoOffer(S.offers[0])'), true);
  ev('S.autoSales=true;UI.autoGame=S;UI.autoSalesAt=0;automationTick(5000)');
  assert.equal(ev('S.biz[0].link'), 'own');
  assert.equal(ev('capPend(S.biz[0])'), true, 'normal delivery handover still happens on a game day');
  offer(ev, 'second-pairs', { type: 'capfib', city2: 'ams', slots: 2, win: 90 });
  assert.equal(ev('!!autoOffer(S.offers[0])'), false, 'the same trench cannot be promised twice');
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('future event demand is tested before signing, with booked events reserving headroom', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  offer(ev, 'event', { type: 'event', bw: 80, rate: 0, start: 10, dur: 3, fee: 5000, exp: 9 });
  assert.equal(ev('!!autoOffer(S.offers[0])'), true);
  ev('S.autoSales=true;UI.autoGame=S;UI.autoSalesAt=0;automationTick(5000)');
  assert.equal(ev('S.biz[0].start'), 10, 'the trial does not move the actual event date');
  assert.equal(ev('R.cityDem.fra'), 0);
  offer(ev, 'too-large', { bw: 30 });
  assert.equal(ev('!!autoOffer(S.offers[0])'), false);
  ev('S.offers[0].bw=10');
  assert.equal(ev('!!autoOffer(S.offers[0])'), true);
  assert.equal(ev('S.biz[0].start'), 10);
  assert.equal(ev('R.cityDem.fra'), 0);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('failed capacity trials restore game, routing and map state even when compute throws', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  offer(ev, 'ready');
  ev("window.beforeState=S;window.beforeResult=R;window.beforeHot=UI.hotMap;window.originalCompute=compute;window.compute=()=>{throw new Error('trial failed')}");
  assert.throws(() => ev('autoOffer(S.offers[0])'), /trial failed/);
  assert.equal(ev('S===beforeState&&R===beforeResult&&UI.hotMap===beforeHot'), true);
  ev('window.compute=originalCompute');
  assert.equal(ev('S.biz.length'), 0);
  assert.equal(ev('S.offers.length'), 1);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('auto-pay rushes affordable repairs once, skips unaffordable and expired incidents, and obeys its toggle', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev(`S.cash=10000;S.links=[{id:'fiber',a:'fra',b:'ams',kind:'df',sys:'lite',ch:['zr4'],km:450,sub:false,ready:0,cut:0,eqDown:10,chFail:{i:0,until:10},mo:1}];
    S.pops.fra.down=8;S.inc=[
      {id:'amp',type:'amp',ref:'fiber',until:10,cost:30000,msg:'Broken amp'},
      {id:'optic',type:'optic',ref:'fiber',until:10,cost:5000,msg:'Broken optic'},
      {id:'slow',type:'crash',ref:'fra',until:8,cost:2000,slow:true,msg:'Slow boot'},
      {id:'orphan',type:'amp',ref:'gone',until:10,cost:299,msg:'Removed equipment'},
      {id:'expired',type:'amp',ref:'fiber',until:0,cost:1000,msg:'Expired'},
      {id:'ddos',type:'ddos',ref:'fra',until:10,cost:1000,msg:'Attack'}];
    S.autoRepair=true;UI.autoGame=S;UI.autoSalesAt=0;automationTick(1)`);
  assert.equal(ev('S.cash'), 3000);
  assert.equal(ev("S.inc.some(i=>i.id==='optic')"), false);
  assert.equal(ev('S.links[0].chFail'), null);
  assert.equal(ev("S.inc.find(i=>i.id==='slow').rushed"), true);
  assert.equal(ev("S.inc.find(i=>i.id==='slow').until"), 1);
  assert.equal(ev("S.inc.find(i=>i.id==='slow').cost"), 0);
  assert.equal(ev('S.pops.fra.down'), 1);
  ev('automationTick(2)');
  assert.equal(ev('S.cash'), 3000, 'no duplicate rush payment');
  ev('S.cash=40000;automationTick(3)');
  assert.equal(ev('S.cash'), 10000);
  assert.equal(ev('S.links[0].eqDown'), 0);
  assert.equal(ev("S.inc.some(i=>i.id==='amp')"), false);
  ev("ACT.autoToggle({k:'autoRepair'});S.inc.push({id:'new',type:'amp',ref:'fiber',until:10,cost:1000,msg:'New failure'});automationTick(4)");
  assert.equal(ev('S.cash'), 10000);
  assert.equal(ev("S.inc.some(i=>i.id==='new')"), true);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('automation pauses with the game, dialogs, hidden pages and game over', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  offer(ev, 'paused');
  ev('S.autoSales=true;UI.autoGame=S;UI.autoSalesAt=0;UI.speed=0;automationTick(5000)');
  assert.equal(ev('S.biz.length'), 0);
  ev('UI.speed=1;automationTick(9999)');
  assert.equal(ev('S.biz.length'), 0, 'resume starts a fresh five-second wait');
  ev("openModal('<p>Menu</p>');automationTick(10000);closeModal()");
  ev("Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});automationTick(15000)");
  ev("Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});S.lost=true;automationTick(20000);S.lost=false;automationTick(24999)");
  assert.equal(ev('S.biz.length'), 0);
  ev('automationTick(25000)');
  assert.equal(ev('S.biz.length'), 1);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('the frame loop repairs new incidents without waiting for the sales timer', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  ev(`S.autoRepair=true;S.links=[{id:'fiber',a:'fra',b:'ams',kind:'df',sys:'lite',ch:['zr4'],km:450,sub:false,ready:0,cut:0,mo:1}];
    window.originalDay=dayTick;window.dayTick=()=>{S.links[0].eqDown=10;S.inc.push({id:'new',type:'amp',ref:'fiber',until:10,cost:1000,msg:'Broken amp'})};
    window.cashBefore=S.cash;last=0;acc=DAY_MS;frame(16);window.dayTick=originalDay`);
  assert.equal(ev('S.cash'), ev('cashBefore-1000'));
  assert.equal(ev('S.inc.length'), 0);
  assert.equal(ev('S.links[0].eqDown'), 0);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('toggles persist, old and malformed saves default off, and the timer resets for another game', () => {
  const { ev, dom, errors } = load();
  setup(ev);
  assert.equal(ev('S.autoSales||S.autoRepair'), false);
  ev("ACT.autoToggle({k:'autoSales'});ACT.autoToggle({k:'autoRepair'});save();S=migrate(JSON.parse(localStorage.getItem('sot-save-v1')))");
  assert.equal(ev('S.autoSales&&S.autoRepair'), true);
  ev("delete S.autoSales;delete S.autoRepair;S=migrate(S)");
  assert.equal(ev('S.autoSales||S.autoRepair'), false);
  ev("S.autoSales='true';S.autoRepair=1;S=migrate(S);ACT.autoToggle({k:'cash'})");
  assert.equal(ev('S.autoSales||S.autoRepair'), false);
  ev('UI.autoGame=S;UI.autoSalesAt=0;S=migrate(JSON.parse(JSON.stringify(S)));S.autoSales=true;compute()');
  offer(ev, 'imported');
  ev('automationTick(100000)');
  assert.equal(ev('S.biz.length'), 0, 'an imported game does not inherit another game timer');
  ev('automationTick(105000)');
  assert.equal(ev('S.biz.length'), 1);
  assert.deepEqual(errors, []);
  dom.window.close();
});

test('both toggle buttons work by keyboard-compatible DOM events on phones in every language', () => {
  for (const lang of ['en', 'it', 'pt', 'fr', 'es']) {
    const { ev, dom, errors } = load(lang === 'en' ? {} : { lang });
    setup(ev);
    dom.window.innerWidth = 360;
    for (const [tab, key] of [['deals', 'autoSales'], ['noc', 'autoRepair']]) {
      ev(`ACT.leftTab({t:'${tab}'});renderAll()`);
      const button = [...dom.window.document.querySelectorAll('#leftBody [data-act="autoToggle"]')].find(b => JSON.parse(b.dataset.args).k === key);
      assert.ok(button, lang);
      assert.equal(button.getAttribute('aria-pressed'), 'false', lang);
      button.focus();
      button.click();
      const updated = dom.window.document.querySelector('#leftBody [data-act="autoToggle"]');
      assert.equal(updated.getAttribute('aria-pressed'), 'true', lang);
      assert.equal(ev(`S.${key}`), true, lang);
      assert.doesNotMatch(dom.window.document.getElementById('leftBody').textContent, /automation\./, lang);
    }
    assert.deepEqual(errors, [], lang);
    dom.window.close();
  }
});
