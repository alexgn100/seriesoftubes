/* ---------- the chaos monkey: Architect's review, as a monkey running round the map ----------
   It hops from cut to cut, sprays chaos where it snips, and dances on the spot that breaks a mission-critical site.
   Pure decoration on the animation clock: the review's result never depends on it, and with animations off the monkey
   just sits at the cut. */
const MK_RUN=0.62; // share of a review step the monkey spends running to the next cut
const MK_COLS=['#FF4F9A','#FFD23F','#22C47A','#2F8CFF','#FF8A3D','#7B61FF'];
// Where a link's middle is, in world coordinates (the shorter way round the date line).
const mkMid=l=>[(CITY[l.a].x+CITY[l.a].x+wrapDx(CITY[l.a].x,CITY[l.b].x))/2,(CITY[l.a].y+CITY[l.b].y)/2];
function mkStart(c){const C=CITY[c];UI.mk={x:C.x,y:C.y,fx:C.x,fy:C.y,tx:C.x,ty:C.y,t0:animT,dur:1,face:1,mood:'run',spray:[],sprayAt:null,bad:false};}
// Off to the next cut: arrive, then spray.
function mkRun(l,dur,bad){const m=UI.mk;if(!m)return;const [x,y]=mkMid(l);m.fx=m.x;m.fy=m.y;m.tx=x;m.ty=y;m.t0=animT;m.dur=Math.max(1,dur*MK_RUN);
  m.face=wrapDx(m.fx,x)<0?-1:1;m.mood='run';m.sprayAt=animT+m.dur;m.bad=!!bad;if(!animOn()){m.x=x;m.y=y;}}
function mkSpray(m){for(let i=0;i<(m.bad?26:16);i++){const a=Math.PI*2*i/(m.bad?26:16)+((i*37)%10)/10,v=0.05+((i*53)%10)/180;
  m.spray.push({x:m.tx,y:m.ty,vx:Math.cos(a)*v,vy:Math.sin(a)*v-0.06,c:m.bad?(i%3?'#FF4D5E':'#FFD23F'):MK_COLS[i%MK_COLS.length],t:animT,s:i%4===0?(m.bad?'💥':'✂️'):null});}}
// The review is over: a cheer when everything held, a tantrum where it broke.
function mkEnd(ok){const m=UI.mk;if(!m)return;m.mood=ok?'cheer':'dance';m.t0=animT;}
function mkStop(){UI.mk=null;}
function mkDraw(ks){const m=UI.mk;if(!m)return;
  const p=Math.min(1,(animT-m.t0)/m.dur),e=p<0.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
  if(m.mood==='run'){m.x=m.fx+wrapDx(m.fx,m.tx)*e;m.y=m.fy+(m.ty-m.fy)*e;}
  if(m.sprayAt!=null&&animT>=m.sprayAt){m.sprayAt=null;if(animOn())mkSpray(m);m.mood=m.bad?'dance':'snip';m.t0=animT;}
  const sz=Math.round(36*Math.max(0.85,Math.min(1.4,Math.sqrt(cam.z))));
  // Hops while running, bounces on the spot otherwise.
  const hop=m.mood==='run'&&p<1?Math.abs(Math.sin((animT-m.t0)/70))*sz*0.45:m.mood==='dance'?Math.abs(Math.sin((animT-m.t0)/90))*sz*0.6:m.mood==='cheer'?Math.abs(Math.sin((animT-m.t0)/120))*sz*0.35:0;
  ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
  for(let i=m.spray.length-1;i>=0;i--){const q=m.spray[i],a=(animT-q.t)/900;if(a>1){m.spray.splice(i,1);continue;}
    const dt=animT-q.t,wx=q.x+q.vx*dt/cam.z,wy=q.y+(q.vy*dt+0.00012*dt*dt)/cam.z;
    for(const k of ks){const [sx,sy]=toS(wx,wy,k);ctx.globalAlpha=1-a;if(q.s){ctx.font=`${Math.round(sz*0.7)}px sans-serif`;ctx.fillText(q.s,sx,sy);}else{ctx.fillStyle=q.c;ctx.beginPath();ctx.arc(sx,sy,Math.max(2,sz*0.13*(1-a*0.5)),0,Math.PI*2);ctx.fill();}}}
  ctx.globalAlpha=1;ctx.font=`${sz}px sans-serif`;
  for(const k of ks){const [sx,sy]=toS(m.x,m.y,k);ctx.save();ctx.translate(sx,sy-sz*0.7-hop);
    const tilt=m.mood==='snip'?Math.sin((animT-m.t0)/60)*0.35:m.mood==='dance'?Math.sin((animT-m.t0)/80)*0.5:0;ctx.rotate(tilt);ctx.scale(m.face,1);
    ctx.fillStyle='rgba(30,38,64,.18)';ctx.beginPath();ctx.ellipse(0,sz*0.62+hop,sz*0.38,sz*0.12,0,0,Math.PI*2);ctx.fill();
    // Emoji take the fill's alpha, so reset it after the shadow.
    ctx.fillStyle='#000';ctx.fillText('🐒',0,0);if(m.mood==='cheer')ctx.fillText('🎉',sz*0.7,-sz*0.5);ctx.restore();}
  ctx.restore();}
