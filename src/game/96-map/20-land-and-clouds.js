function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function inPoly(x,y,pts){let ins=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))ins=!ins;}return ins;}
function smoothPath(pts){const p=new Path2D();const n=pts.length;const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];let m=mid(pts[n-1],pts[0]);p.moveTo(m[0],m[1]);for(let i=0;i<n;i++){const nx=pts[(i+1)%n];m=mid(pts[i],nx);p.quadraticCurveTo(pts[i][0],pts[i][1],m[0],m[1]);}p.closePath();return p;}
const LANDP_ALL=COAST.map(smoothPath);
// Zoomed out, hundreds of tiny Arctic and Pacific islets, each with a thick outline, turn into noise.
// The far view skips islands smaller than ~600 map px² (Sardinia-sized) unless a city is on them.
const ringArea=p=>{let a=0;for(let i=0,j=p.length-1;i<p.length;j=i++)a+=(p[j][0]+p[i][0])*(p[j][1]-p[i][1]);return Math.abs(a/2);};
const LANDP_FAR=COAST.map((p,i)=>ringArea(p)>=600||CITIES.some(c=>inPoly(c.x,c.y,p))?LANDP_ALL[i]:null).filter(Boolean);
const ALLPOLY=COAST;
const onLand=(x,y)=>ALLPOLY.some(p=>inPoly(x,y,p));
const R1=rng(7),WAVES=[],HILLS=[];
while(WAVES.length<220){const x=R1()*W,y=R1()*H;if(!onLand(x,y)&&!onLand(x+12,y)&&!onLand(x-12,y))WAVES.push([x,y,R1()]);}
while(HILLS.length<130){const x=R1()*W,y=R1()*H;if(onLand(x,y)&&!CITIES.some(c=>Math.hypot(c.x-x,c.y-y)<40))HILLS.push([x,y,6+R1()*10,R1()]);}
const CLOUDS=Array.from({length:7},(_,i)=>({x:R1()*W,y:60+R1()*(H-120),s:.7+R1()*.6,v:3+R1()*4}));
const FLOATS=[];
// Stamped with the map's animation clock, which stops while paused: on the real clock, every floater born after a
// pause lingered off-screen for as long as the pause had lasted, and paydays piled up hundreds of them.
function floater(x,y,text,col){if(!animOn()||UI.mapHid)return;FLOATS.push({x,y,text,col,t:animT});}
