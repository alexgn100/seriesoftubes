const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// Work done once when a game loads (the possible-diversity map, link curves, the map's sea and hills) has shortcuts;
// each must give exactly what the plain version gives.

test('link curves: skipping far-away cities gives the same bend around the ones in the way', (t) => {
  const { ev, dom, errors } = load(); t.after(() => dom.window.close());
  ev('ACT.start({})');
  // bezGeom() as it was: every other city is measured against every candidate curve.
  ev(`window.plainGeom=(l,i)=>{const A=CITY[l.a],B=CITY[l.b];const bx=A.x+wrapDx(A.x,B.x),by=B.y;const dx=bx-A.x,dy=by-A.y,len=Math.hypot(dx,dy)||1;let nx=-dy/len,ny=dx/len;if(ny>0){nx=-nx;ny=-ny;}
    const base=Math.max(4,Math.min(len*0.1,90)),step=Math.min(16,len*.06),off0=i<=0?base:(i%2?-1:1)*(base*(i%2?0.2:1)+Math.ceil(i/2)*step);const mx=(A.x+bx)/2,my=(A.y+by)/2;
    const obs=CITIES.filter(c=>c.id!==l.a&&c.id!==l.b).map(c=>[mx+wrapDx(mx,c.x),c.y]);
    const clear=(cx,cy)=>{let m=Infinity;const g={ax:A.x,ay:A.y,bx,by,cx,cy};for(let t=0.08;t<0.93;t+=0.06){const [px,py]=qpt(g,t);for(const [ox,oy] of obs){const d=Math.hypot(px-ox,py-oy);if(d<m)m=d;}}return m;};
    const sg=Math.sign(off0)||1,mag=Math.abs(off0);const need=Math.min(24,Math.max(7,len*0.2)),cap=Math.max(mag,len*0.32),lim=o=>Math.sign(o)*Math.min(Math.abs(o),cap);
    const cand=[1,1.5,2.1,2.9,3.8].map(k=>lim(sg*mag*k)).concat([1,1.5,2.1,2.9,3.8].map(k=>lim(-sg*Math.max(mag,base)*k)));let best=null,bs=-Infinity;
    for(const off of cand){const cx=mx+nx*off,cy=my+ny*off,c=clear(cx,cy);if(c>=need){best=[cx,cy];break;}const sc=Math.min(c,need)-Math.abs(off)*0.35;if(sc>bs){bs=sc;best=[cx,cy];}}
    return {ax:A.x,ay:A.y,bx,by,cx:best[0],cy:best[1],len};}`);
  const bad = JSON.parse(ev(`(()=>{const ids=CITIES.map(c=>c.id),bad=[];for(let i=0;i<ids.length;i+=6)for(let j=i+1;j<ids.length;j+=5)for(const k of [0,1,4]){
    const l={id:'x'+i+'_'+j,a:ids[i],b:ids[j]};if(JSON.stringify(bezGeom(l,k))!==JSON.stringify(plainGeom(l,k)))bad.push(l.a+'-'+l.b+'#'+k);}return JSON.stringify(bad)})()`));
  assert.deepEqual(bad, []);
  assert.deepEqual(errors, []);
});

test('land test: the bounding box shortcut agrees with walking every coastline', (t) => {
  const { ev, dom, errors } = load(); t.after(() => dom.window.close());
  const bad = ev(`(()=>{const plain=(x,y,pts)=>{let ins=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))ins=!ins;}return ins;};
    let bad=0;for(let x=0;x<W;x+=7)for(let y=0;y<H;y+=7)for(const p of COAST)if(inPoly(x,y,p)!==plain(x,y,p))bad++;for(const c of CITIES)for(const p of COAST)if(inPoly(c.x,c.y,p)!==plain(c.x,c.y,p))bad++;return bad;})()`);
  assert.equal(bad, 0);
  assert.equal(ev('WAVES.length+HILLS.length'), 350);
  assert.deepEqual(errors, []);
});
