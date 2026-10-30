/* Puzzle map: the puzzle's cities stand out (goals with a pulsing ring and a badge for what they send or ask for,
   stepping stones with a dashed one, cities to avoid crossed out); every other city is on the map as usual, open to
   build in but not emphasised. */
function pzBadge(c){const P=S.pz;if(S.ar)return c===S.ar.hq?'🏠':S.ar.gold.includes(c)?'🥇':'';return P.src.includes(c)?'🗄️':P.dem.some(f=>f.t==='eye'&&f.a===c)?'👀':P.dem.some(f=>f.t==='l2'&&(f.a===c||f.b===c))?'🔗':'';}
function pzDrawCity(v,sc,now){const k=pzKind(v.C.id);
  if(!k||k==='off'){drawCity(v.C,v.sx,v.sy,sc,now,v.ly===null?undefined:v.ly);return;}
  const r=(CM.far?16:34)*sc,y=v.sy-(CM.far?0:6*sc),p=S.pops[v.C.id];
  ctx.save();ctx.lineWidth=3;
  if(k==='avoid'){ctx.strokeStyle='#FF4D5E';ctx.beginPath();ctx.arc(v.sx,y,r,0,7);ctx.moveTo(v.sx-r*.7,y-r*.7);ctx.lineTo(v.sx+r*.7,y+r*.7);ctx.stroke();}
  else{const a=animOn()?.55+.35*Math.sin(now/300):.8,gold=S.ar&&S.ar.gold.includes(v.C.id),dk=S.ar&&arDarkNow(v.C.id);ctx.strokeStyle=dk?`rgba(255,77,94,${a})`:gold?`rgba(224,160,0,${p?1:a})`:k==='goal'?`rgba(255,79,154,${p?1:a})`:'rgba(30,38,64,.7)';if(gold||dk)ctx.lineWidth=5;if(k==='via')ctx.setLineDash([5,5]);
    ctx.fillStyle=k==='goal'&&!p?'rgba(255,210,63,.35)':'rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(v.sx,y,r,0,7);ctx.fill();ctx.stroke();ctx.setLineDash([]);}
  ctx.restore();drawCity(v.C,v.sx,v.sy,sc,now,v.ly===null?undefined:v.ly);
  const b=k==='goal'&&!CM.far?pzBadge(v.C.id):'';if(b){ctx.font=`${Math.round(15*sc)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b,v.sx+r*.75,y-r*.75);}}
// In a puzzle every line says what it is ("2×100G · 70%"), and a selected POP lights up every pair it has links on.
function pzLinkLab(grp,up,load,cap){if(S.ar)return groupLabel(grp,up)+(cap?` · ${Math.round(load/cap*100)}%`:'');return groupLabel(grp,up)+(cap?` · ${Math.round(load/cap*100)}%`:'');}
const pzLinkHot=grp=>!!(UI.sel&&UI.sel.type==='city'&&grp.some(x=>x.a===UI.sel.id||x.b===UI.sel.id));
// Architect runs: what later briefs do here, as small numbered tags beside the city ("4🥇", "6🚫").
function arDrawTags(v,sc){const tg=arTags(v.C.id).slice(0,2);if(!tg.length||!pzKind(v.C.id))return;const r=(CM.far?16:34)*sc,y=v.sy-(CM.far?0:6*sc);const t=tg.map(x=>x.n+x.i).join(' ');
  ctx.save();ctx.font=`900 ${Math.round((CM.far?10:12)*Math.max(0.9,Math.min(1.3,sc)))}px "Baloo 2", sans-serif`;const w=ctx.measureText(t).width+12,h=18,x=v.sx-r-w*0.35,yy=y-r-4;
  ctx.fillStyle='#fff';ctx.strokeStyle='#1E2640';ctx.lineWidth=2;rr(x,yy,w,h,9);ctx.fill();ctx.stroke();ctx.fillStyle='#1E2640';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x+w/2,yy+h/2+1);ctx.restore();}
