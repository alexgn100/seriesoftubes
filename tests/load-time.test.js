const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

// Work done once when a game loads (the possible-diversity map, link curves, the map's sea and hills) has shortcuts;
// each must give exactly what the plain version gives.

test('land test: the bounding box shortcut agrees with walking every coastline', (t) => {
  const { ev, dom, errors } = load(); t.after(() => dom.window.close());
  const bad = ev(`(()=>{const plain=(x,y,pts)=>{let ins=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))ins=!ins;}return ins;};
    let bad=0;for(let x=0;x<W;x+=7)for(let y=0;y<H;y+=7)for(const p of COAST)if(inPoly(x,y,p)!==plain(x,y,p))bad++;for(const c of CITIES)for(const p of COAST)if(inPoly(c.x,c.y,p)!==plain(c.x,c.y,p))bad++;return bad;})()`);
  assert.equal(bad, 0);
  assert.equal(ev('WAVES.length+HILLS.length'), 350);
  assert.deepEqual(errors, []);
});
