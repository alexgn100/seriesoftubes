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
