// Where a flood goes and who pays for it: junk enters at its ingress ports and rides your backbone to the victim.
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

test('a flood entering over a PNI with NetChill competes on that PNI at its own rank, as real traffic does', () => {
  for (const net of ['nfx', 'lvl']) {
    const { ev, errors } = load();
    ev("ACT.start({});if(UI.pendGame)ACT.pitchSkip();S.cash=1e9;S.lvl=6;ACT.launchBB({city:'fra'});S.pops.fra.bb.d=5000;S.pops.fra.rgen=RG.length-1;S.pops.fra.routers=8");
    ev(`S.transit=[];S.ixp={};S.peers={};S.grace=null;S.pni=[{id:'pa',net:'${net}',city:'fra',tier:1}];compute()`);
    assert.equal(ev(`R.netEg.${net}.p`), 100, 'the 100G PNI is full of real traffic');
    ev("S.ev.ddos={id:'x',city:'fra',vec:'http',gbps:100,start:S.day,until:S.day+5,entries:[{k:'p',id:'pa',city:'fra',share:1}]};compute()");
    assert.equal(ev('R.usePni.pa'), 100);
    assert.ok(!(ev(`R.netEg.${net}?.p||0`) > 1), `${net}: the junk is not routed behind the real traffic as if it were a cone route`);
    assert.deepEqual(errors, []);
  }
});

// Frankfurt has the eyeballs and no transit; all transit is in Amsterdam, 100G of wave away.
const remoteIngress = (ev, flip) => {
  ev("ACT.start({});S.cash=1e9;S.nextFail=1e9;S.nextEvent=1e9;ACT.buildPop({city:'ams'});ACT.launchBB({city:'fra'});S.links.push({id:'L',a:'fra',b:'ams',kind:'wave',tier:1,km:400,mo:1,cut:0});ACT.buyTransit({city:'ams',net:NETS.find(n=>sellsAt(n,'ams')).id,tier:1})");
  if (flip) ev("const p=S.pops;S.pops={ams:p.ams,fra:p.fra}");
  ev("compute()");
};

test('a flood entering in another city crosses the backbone to its victim, whatever order the POPs were built in', () => {
  const out = [];
  for (const flip of [false, true]) {
    const { ev, errors } = load({ seed: 5 });
    remoteIngress(ev, flip);
    assert.ok(ev("sfOf(R,'fra')") > 0.95, 'fine before the attack');
    ev("S.day=60;S.ev.ddos={id:'a',city:'fra',vec:'http',gbps:300,start:S.day,until:S.day+3,entry:{k:'distributed',lab:''},entries:[{k:'t',id:S.transit[0].id,city:'ams',share:1}]};compute()");
    assert.equal(ev('R.load.L'), 100, 'the junk fills the wave to the victim');
    assert.ok(ev("R.nodeLoad.fra") >= 100, "and the victim's router");
    assert.ok(ev("sfOf(R,'fra')") < 0.05, 'the victim goes dark');
    out.push(ev("JSON.stringify([R.load.L,R.useT[S.transit[0].id],sfOf(R,'fra')])"));
    assert.deepEqual(errors, []);
  }
  assert.equal(out[0], out[1], 'POP build order does not change the outcome');
});

test('an attack is held or lost at its victim; other POPs and their DDoS-protected customers are not charged', () => {
  const { ev, errors } = load({ seed: 5 });
  ev("ACT.start({});S.cash=1e9;S.lvl=6;S.nextFail=1e9;S.nextEvent=1e9;ACT.buildPop({city:'nyc'});for(const c of ['fra','nyc']){S.pops[c].bb={d:50};S.pops[c].rgen=3}");
  ev("S.transit=[{id:'tf',city:'fra',net:'cog',tier:2},{id:'tn',city:'nyc',net:'cog',tier:1}];S.scrubs=[{city:'fra',tier:1}];S.scrubMode='always'");
  // New York is struggling on its own (a 10G port for 50G of eyeballs), and has a DDoS-protected customer.
  ev("S.pops.nyc.bb.d=200;S.biz.push({id:'sc',type:'scrub',name:'Shield',city:'nyc',bw:1,rate:1000,mood:80,since:0})");
  ev("S.day=60;S.ev.ddos={id:'a',city:'fra',vec:'http',gbps:20,start:S.day,until:S.day+3,entry:{k:'distributed',lab:''},entries:[{k:'t',id:'tf',city:'fra',share:.5},{k:'t',id:'tn',city:'nyc',share:.5}]};compute()");
  assert.ok(ev("sfOf(R,'nyc')") < 0.85, 'New York is under water anyway');
  assert.ok(ev("sfOf(R,'fra')") >= 0.97, 'the victim is fine');
  assert.equal(ev('ddosSf(S.ev.ddos)'), ev("sfOf(R,'fra')"));
  const cash = ev('S.cash');
  ev('dayTick()');
  assert.deepEqual(JSON.parse(ev('JSON.stringify(S.ev.ddos.sla||[])')), [], 'no SLA payout for a customer in another city');
  assert.equal(ev('S.stats.sla||0'), 0);
  ev('S.day=S.ev.ddos.until;ddosExpire()');
  assert.equal(ev('S.stats.ddosOk||0'), 1, 'held at the victim');
  assert.equal(ev('S.stats.ddosLost||0'), 0);
  assert.ok(cash > 0);
  assert.deepEqual(errors, []);
});

test('an attack keeps its biggest ingress ports and folds the long tail, so saves stay small', () => {
  const { ev, errors } = load({ seed: 5 });
  ev("ACT.start({});S.cash=1e9;S.lvl=6;for(const c of ['fra','ams','lon','par'])if(!S.pops[c])ACT.buildPop({city:c});for(const c in S.pops){S.pops[c].bb={d:100};S.pops[c].rgen=3}");
  ev("S.transit=[];const nets=NETS.filter(n=>n.type!=='t1').slice(0,40);for(const c in S.pops)for(const n of nets.slice(0,8))S.pni.push({id:n.id+'@'+c,net:n.id,city:c,tier:1});compute()");
  ev("S.day=60;S.ddosStarts=[];ddosAttack()");
  const ports = ev('ddosEntries().length');
  assert.ok(ports > 20, `many ports carry traffic (${ports})`);
  const en = JSON.parse(ev('JSON.stringify(S.ev.ddos.entries)'));
  assert.equal(en.length, 13, 'twelve named ports and one remainder');
  assert.equal(en.at(-1).k, 'rest');
  assert.equal(en.at(-1).city, ev('S.ev.ddos.city'));
  assert.ok(Math.abs(en.reduce((n, x) => n + x.share, 0) - 1) < 1e-9);
  assert.match(ev("S.inc.at(-1).msg"), new RegExp(`across ${ports} transit and peering ports`), 'the message still counts every port');
  // The remainder is routed like the rest of the flood, and survives a save.
  ev('compute()');
  assert.ok(Math.abs(ev('R.ddos.reduce((n,m)=>n+m.reaching,0)') - ev('S.ev.ddos.gbps')) < 1e-6);
  ev('S=migrate(JSON.parse(JSON.stringify(S)));compute()');
  assert.equal(ev('S.ev.ddos.entries.length'), 13);
  // An old save with every port is folded on load.
  ev("S.ev.ddos.entries=Array.from({length:300},(_,i)=>({k:'p',id:'x'+i,city:'fra',lab:'',share:1}));S=migrate(JSON.parse(JSON.stringify(S)))");
  assert.equal(ev('S.ev.ddos.entries.length'), 13);
  assert.equal(ev("S.ev.ddos.entries.find(e=>e.k==='rest').share.toFixed(4)"), (288/300).toFixed(4));
  assert.deepEqual(errors, []);
});
