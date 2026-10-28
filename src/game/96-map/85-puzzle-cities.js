/* Puzzle map: the puzzle's cities stand out (goals with a pulsing ring, stepping stones with a dashed one, cities to
   avoid crossed out); every other city stays on the map, faded and untappable. */
function pzDrawCity(v,sc,now){const k=pzKind(v.C.id);
  if(!k){ctx.save();ctx.globalAlpha=0.3;drawCity(v.C,v.sx,v.sy,sc,now,null);ctx.restore();return;}
  const r=(CM.far?16:34)*sc,y=v.sy-(CM.far?0:6*sc),p=S.pops[v.C.id];
  ctx.save();ctx.lineWidth=3;
  if(k==='avoid'){ctx.strokeStyle='#FF4D5E';ctx.beginPath();ctx.arc(v.sx,y,r,0,7);ctx.moveTo(v.sx-r*.7,y-r*.7);ctx.lineTo(v.sx+r*.7,y+r*.7);ctx.stroke();}
  else{const a=animOn()?.55+.35*Math.sin(now/300):.8;ctx.strokeStyle=k==='goal'?`rgba(255,79,154,${p?1:a})`:'rgba(30,38,64,.7)';if(k==='via')ctx.setLineDash([5,5]);
    ctx.fillStyle=k==='goal'&&!p?'rgba(255,210,63,.35)':'rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(v.sx,y,r,0,7);ctx.fill();ctx.stroke();ctx.setLineDash([]);}
  ctx.restore();drawCity(v.C,v.sx,v.sy,sc,now,v.ly===null?undefined:v.ly);}
