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
