function renderHint(){
  const hn=$('hint');if(!S||UI.hintOff||(S.tut!==undefined&&S.tut!==null)||(innerWidth<760&&(UI.sel||UI.leftOpen)&&!(UI.drag&&UI.drag.mode==='link'))){hn.hidden=true;return;}
  let t='';
  if(UI.drag&&UI.drag.mode==='link')t=UI.snap?tr('hint.release_to_plan_a_link'):tr('hint.drag_onto_another_city');
  else if(!S.links.length&&S.done.tr)t=tr('hint.tip_drag_from_your_pink_router');
  else if(!S.done.bb)t=tr('hint.tap_your_city_then_launch_broadband');
  hn.textContent=t;hn.hidden=!t;
}

