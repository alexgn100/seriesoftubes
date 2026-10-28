Object.assign(ACT,{
 // The puzzle list. The ruleset's title-screen door calls this.
 puzzleMenu:()=>{if(S&&UI.started&&!pzOn())UI.nm=S.name;pzMenu();},
 pzStart:({id})=>{const d=pzDef(id);if(!d||!pzPackOpen(d.pack))return;pzBegin(d);},
 pzWeekly:()=>pzBegin(pzWeekly()),
 pzRetry:()=>{if(!pzOn())return;pzBegin(S.pz.id==='weekly'?pzWeekly():pzDef(S.pz.id));},
 pzLeave:()=>{if(pzOn())pzLeave();},
 pzPop:({city})=>{if(!pzOn()||S.pops[city]||!['goal','via'].includes(pzKind(city)))return;pzSnap();S.pops[city]=pzNewPop();sfx('build');haptic(10);floater(CITY[city].x,CITY[city].y-30,tr('common.new_pop'),'#FF4F9A');pzAfter();},
 pzRmPop:({city})=>{if(!pzOn()||!S.pops[city])return;pzSnap();delete S.pops[city];S.links=S.links.filter(l=>l.a!==city&&l.b!==city);sfx('click');UI.sel=null;pzAfter();},
 pzLinkTo:({a,b})=>{if(!pzOn()||!S.pops[a]||a===b)return;pzLinkModal(a,b);},
 pzVia:({v})=>{const p=UI.pending;if(!pzOn()||!p)return;UI.pzVia=v;pzLinkModal(p.a,p.b,true);},
 pzDiv:({v})=>{const p=UI.pending;if(!pzOn()||!p)return;UI.pzDiv=!!+v;pzLinkModal(p.a,p.b,true);},
 pzLink:({tier})=>{tier=+tier;const p=UI.pending;if(!pzOn()||!p||!PZ_TIERS.includes(tier))return;const {a,b}=p;if(!S.pops[a]||!['goal','via'].includes(pzKind(b)))return;
   const r=pzRoutes(a,b).find(x=>x.via===UI.pzVia);if(!r||(S.pz.noSub&&r.sub)||subWaveWhy(tier,r.km,r.sub))return;
   const same=!r.sub&&UI.pzDiv===false?S.links.find(l=>edgeKey(l)===edgeKey({a,b})&&!l.cable):null,div=!r.sub&&!same&&S.links.some(l=>edgeKey(l)===edgeKey({a,b})&&!l.cable);
   pzSnap();if(!S.pops[b])S.pops[b]=pzNewPop();const id=uid(),f=r.f*(div?DIVERSE:1);
   S.links.push({id,a,b,kind:'wave',border:false,premium:false,tier,km:r.km,sub:r.sub,cable:r.cab,mo:pzMo(r,tier,div),mult:f,trench:r.cab?'cab:'+r.cab:same?(same.trench||same.id):id,cut:0,day:0});
   closeModal();sfx('build');haptic(12);floater((CITY[a].x+CITY[a].x+wrapDx(CITY[a].x,CITY[b].x))/2,(CITY[a].y+CITY[b].y)/2-20,tr('links.wave_lit',{wave:LT[tier].n}),'#FF4F9A');UI.sel=null;pzAfter();},
 pzTier:({id,tier})=>{tier=+tier;const l=pzOn()&&S.links.find(x=>x.id===id);if(!l||!PZ_TIERS.includes(tier)||l.tier===tier||subWaveWhy(tier,l.km,l.sub))return;pzSnap();l.tier=tier;l.mo=pzMo({km:l.km,sub:l.sub,f:l.mult||1},tier,false);sfx('build');pzAfter();},
 pzRmLink:({id})=>{if(!pzOn()||!S.links.some(l=>l.id===id))return;pzSnap();S.links=S.links.filter(l=>l.id!==id);sfx('click');UI.sel=null;pzAfter();},
 pzUndo:()=>{const h=UI.pzHist;if(!pzOn()||!h||!h.length)return;const o=JSON.parse(h.pop());S.pops=o.p;S.links=o.l;sfx('click');pzAfter();},
 pzReset:()=>{if(!pzOn())return;pzSnap();S.pops={};S.links=[];UI.sel=null;sfx('click');pzAfter();},
 pzShare:()=>{if(!pzOn())return;const t=pzShareText(pzEval());
   const copied=()=>toast(tr('puzzles.copied_paste_it_anywhere',{t:esc(t)}),'good'),copy=()=>{try{navigator.clipboard.writeText(t).then(copied,()=>toast(esc(t),''));}catch(e){toast(esc(t),'');}};
   if(navigator.share&&isPhone()){navigator.share({text:t}).catch(()=>{});return;}copy();track('puzzle_share');},
});
