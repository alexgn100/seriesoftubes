/* ---------- puzzles: the card, the panels, the link picker, the results and the list ---------- */
const PZ_ICON={goal:'🎯',via:'🪨',avoid:'🚫'};
function pzTwistTxt(t){const P=S.pz;
  if(t.k==='sub')return tr('puzzles.no_subsea_cables');
  if(t.k==='ring')return tr('puzzles.one_ring_through_every_pop');
  if(t.k==='g')return tr('puzzles.every_link_n_g_or_more',{n:P.minG});
  if(t.k==='avoid')return tr('puzzles.no_pop_in_list',{list:P.avoid.map(c=>CITY[c].name).join(', ')});
  const [a,b,ms]=P.lat;return isFinite(t.ms)?tr('puzzles.a_to_b_under_ms_now',{a:CITY[a].name,b:CITY[b].name,ms,now:t.ms.toFixed(1)}):tr('puzzles.a_to_b_under_ms',{a:CITY[a].name,b:CITY[b].name,ms});}
// The short version, for the puzzle list.
function pzTwistTag(d){const t=[];if(d.noSub)t.push(tr('puzzles.no_subsea'));if(d.ring)t.push(tr('puzzles.ring'));if(d.lat)t.push(tr('puzzles.under_n_ms',{n:d.lat[2]}));if(d.minG)t.push(tr('puzzles.n_g_links',{n:d.minG}));if(d.avoid&&d.avoid.length)t.push(tr('puzzles.avoid_list',{list:d.avoid.map(c=>CITY[c].name).join(', ')}));return t;}
const pzUnitName=u=>{const l=S.links.find(x=>pzUnit(x)===u);return l?`${CITY[l.a].name} ⇄ ${CITY[l.b].name}${l.cable?' ('+esc(CAB[l.cable].name)+')':''}`:'';};
function pzRender(){const el=$('pzBox');if(!pzOn()){el.hidden=true;return;}el.hidden=false;
  const e=pzEval(),P=S.pz,d=pzDef(P.id),pk=d&&PZ_PACKS.find(x=>x.id===d.pack);
  const star=(on,l)=>`<span class="${on?'on':''}">⭐<small>${l}</small></span>`;
  let h=`<div class="grab" data-grab="pz" aria-hidden="true"></div><div class="pzh"><div class="grow"><div class="eyebrow">${pk?esc(pk.n):P.theme&&own(PZ_WK_THEMES,P.theme)?`${PZ_WK_THEMES[P.theme].i} ${tr('puzzles.weekly_puzzle')} · ${tr(PZ_WK_THEMES[P.theme].t)}`:tr('puzzles.weekly_puzzle')}</div><h3>${esc(pzName(d||P))}</h3></div>${btn('☰','puzzleMenu',{},'ghost sm')}</div>`;
  if(d)h+=`<p class="pzj">${esc(d.j)}</p>`;else if(P.wj)h+=`<p class="pzj">${esc(pzTxt(P.wj))}</p>`;
  h+=`<div class="pzs">${star(e.goal,tr('puzzles.goal'))}${star(e.goal&&e.cheap,P.budget?tr('puzzles.budget'):tr('puzzles.free'))}${star(e.goal&&e.n1,'N-1')}</div>`;
  h+=`<div class="pzck">${e.marks.map(m=>`<span class="pzc s${m.st}">${esc(CITY[m.c].name)}${m.st===2?' ✓':m.st===1?' ·':' …'}</span>`).join('')}</div>`;
  for(const t of e.tw)h+=`<div class="pztw ${t.ok?'ok':''}">${t.ok?'✓':'✗'} ${pzTwistTxt(t)}</div>`;
  const sp=fmt$(e.spend);
  h+=P.budget?`<div class="pzbud"><div class="kv"><span>${tr('puzzles.spent_x_of_y',{x:sp,y:fmt$(P.budget)})}</span><b>${e.cheap?'✓':'✗'}</b></div><div class="bar ${e.cheap?(e.spend>P.budget*0.85?'warn':''):'bad'}"><i style="width:${Math.min(100,e.spend/P.budget*100).toFixed(1)}%"></i></div></div>`
    :`<div class="pzbud"><div class="kv"><span>${tr('puzzles.spent_x',{x:sp})}</span><b>${tr('puzzles.no_budget_star_on_the_house')}</b></div></div>`;
  h+=!e.conn?`<div class="pzn1">🛡 ${tr('puzzles.n_1_connect_everything_first')}</div>`:e.n1?`<div class="pzn1 on">🛡 ${tr('puzzles.survives_any_single_cut')}</div>`:`<div class="pzn1 bad">⚠️ ${tr('puzzles.one_cut_splits_it_where',{where:pzUnitName(e.weak[0])})}</div>`;
  h+=`<div class="btns">${btn('↶ '+tr('puzzles.undo'),'pzUndo',{},'ghost sm',!(UI.pzHist&&UI.pzHist.length))}${btn(tr('puzzles.reset'),'pzReset',{},'ghost sm',!S.links.length&&!Object.keys(S.pops).length)}${btn(UI.pzFrom==='game'?tr('puzzles.back_to_my_network'):tr('puzzles.back_to_the_title'),'pzLeave',{},'ghost sm')}</div>`;
  if(h!==UI._pzh){UI._pzh=h;morph(el,h);}}
function pzPanel(sel){const head=(eb,name,facts)=>`<div class="ph"><div style="min-width:0"><div class="eyebrow">${eb}</div><h2>${name}</h2>${facts?`<div class="facts">${facts}</div>`:''}</div><button class="x" data-act="closePanel" aria-label="${tr('common.close')}">×</button></div>`;
  if(sel.type==='city'){const c=sel.id,k=pzKind(c),p=S.pops[c],C=CITY[c];if(!k)return '';
    const eb=k==='goal'?tr('puzzles.goal_city'):k==='via'?tr('puzzles.stepping_stone_optional'):tr('puzzles.off_limits');
    let h=head(`${PZ_ICON[k]} ${eb}`,esc(C.name),p?`<span class="fact mine">${tr('common.your_pop')}</span>`:'')+'<div class="scroll">';
    if(k==='avoid')return h+`<p class="lead">${tr('puzzles.not_this_one_find_a_way_around')}</p></div>`;
    if(!p)h+=`<p class="lead">${tr('puzzles.a_pop_costs_setup_plus_a_year',{setup:fmt$(popCost(c)),mo:fmt$(POP_MO)})}</p><div class="btns">${btn(tr('puzzles.open_a_pop_cost',{cost:fmt$(pzPopCost(c))}),'pzPop',{city:c},'pink big')}</div>`;
    else{const others=[...S.pz.cities,...S.pz.via].filter(x=>x!==c);
      h+=`<p class="lead">${tr('puzzles.drag_from_this_pop_onto_another')}</p><h3>${tr('puzzles.lease_a_wave_to')}</h3><div class="seg">${others.map(x=>btn(esc(CITY[x].name),'pzLinkTo',{a:c,b:x},S.pops[x]?'':'ghost')).join('')}</div>`;
      const ls=S.links.filter(l=>l.a===c||l.b===c);if(ls.length)h+=`<h3 style="margin-top:10px">${tr('common.links')}</h3>`+ls.map(l=>`<div class="row"><div class="grow"><div class="nm">${esc(CITY[l.a===c?l.b:l.a].name)}</div><div class="meta">${capName(l)} · ${linkLat(l).toFixed(1)} ms</div></div>${btn(tr('common.open'),'selLink',{id:l.id},'ghost sm')}</div>`).join('');
      h+=`<div class="btns" style="margin-top:10px">${btn(tr('puzzles.remove_this_pop'),'pzRmPop',{city:c},'red sm')}</div>`;}
    return h+'</div>';}
  const l=S.links.find(x=>x.id===sel.id);if(!l)return '';
  let h=head(l.cable?esc(CAB[l.cable].name):tr('common.overland'),`${esc(CITY[l.a].name)} ⇄ ${esc(CITY[l.b].name)}`,`<span class="fact">${capName(l)}</span><span class="fact">${l.km.toLocaleString()} km</span><span class="fact">${linkLat(l).toFixed(1)} ms</span><span class="fact">${tr('puzzles.price_per_year',{price:fmt$(l.mo*PZ_YEAR)})}</span>`)+'<div class="scroll">';
  h+=`<h3>${tr('puzzles.size')}</h3><div class="seg">${PZ_TIERS.map(i=>{const r={km:l.km,sub:l.sub,f:l.mult||1},why=subWaveWhy(i,l.km,l.sub);return btn(`${LT[i].n} <small>${tr('puzzles.price_per_year',{price:fmt$(pzMo(r,i,false)*PZ_YEAR)})}</small>`,'pzTier',{id:l.id,tier:i},l.tier===i?'pink':'ghost',!!why||l.tier===i);}).join('')}</div>`;
  return h+`<div class="btns" style="margin-top:10px">${btn(tr('puzzles.remove_this_link'),'pzRmLink',{id:l.id},'red sm')}</div></div>`;}
// The link picker: overland or one of the real cables between the two cities, and a size. Prices are for a year.
function pzLinkModal(a,b,keep){const kb=pzKind(b);
  if(!kb||kb==='avoid'||!pzKind(a)){toast(kb==='avoid'?tr('puzzles.not_this_one_find_a_way_around'):tr('puzzles.that_city_is_not_part_of'),'bad');sfx('err');return;}
  if(!keep){UI.pzVia=null;UI.pzDiv=true;}UI.pending={a,b};const rs=pzRoutes(a,b),P=S.pz;
  const head=`<div style="display:flex;align-items:center"><div><div class="eyebrow">${kmBetween(a,b).toLocaleString()} km</div><h2 style="font-size:26px">${esc(CITY[a].name)} → ${esc(CITY[b].name)}</h2></div><button class="x" data-act="closeModal" aria-label="${tr('common.close')}">×</button></div>`;
  if(!rs.length){openModal(head+`<p class="lead" style="margin-top:10px">${tr('puzzles.no_cable_lands_in_both_try',{a:esc(CITY[a].name),b:esc(CITY[b].name)})}</p>`);return;}
  const r=rs.find(x=>x.via===UI.pzVia)||rs.find(x=>!(P.noSub&&x.sub))||rs[0];UI.pzVia=r.via;
  const land=!r.sub&&S.links.some(l=>edgeKey(l)===edgeKey({a,b})&&!l.cable),div=land&&UI.pzDiv!==false,pop=S.pops[b]?0:pzPopCost(b);
  let h=head+`<h4 class="sub4">${tr('common.route')}</h4><div class="seg">${rs.map(x=>btn(`${x.cab?esc(CAB[x.cab].name):tr('common.overland')} <small>${x.ms.toFixed(1)} ms${x.cab&&CAB[x.cab].age==='old'?'':''}</small>`,'pzVia',{v:x.via},x.via===r.via?'pink':'ghost',P.noSub&&x.sub)).join('')}</div>`;
  if(P.noSub&&r.sub)h+=`<p class="why">${tr('puzzles.the_sharks_say_no')}</p>`;
  if(r.cab)h+=`<p class="note">${esc(CAB[r.cab].blurb)}</p>`;
  if(land)h+=`<div class="seg" style="margin-top:8px">${btn(tr('puzzles.diverse_route_40_survives_a_backhoe'),'pzDiv',{v:1},div?'pink':'ghost')}${btn(tr('puzzles.same_trench_cheaper_one_backhoe_cuts'),'pzDiv',{v:0},div?'ghost':'pink')}</div>`;
  if(pop)h+=`<p class="lead" style="margin-top:8px">${tr('puzzles.includes_a_new_pop_in_city',{city:esc(CITY[b].name),price:fmt$(pop)})}</p>`;
  h+=`<div class="tiers">${PZ_TIERS.map(i=>{const why=subWaveWhy(i,r.km,r.sub),c=pzLinkCost(r,i,div)+pop;return `<button class="tierbtn" data-act="pzLink" data-args='{"tier":${i}}'${why||(P.noSub&&r.sub)?' disabled':''}><span class="sz">${LT[i].n}</span><span class="grow meta">${why?tr('common.too_far_for_this_cable'):pop?tr('puzzles.with_the_pop_price',{price:fmt$(c)}):''}</span><span class="pr num">${tr('puzzles.price_per_year',{price:fmt$(pzLinkCost(r,i,div))})}</span></button>`;}).join('')}</div>`;
  openModal(h);}
// ---------- results ----------
function pzLine(e){return e.stars>=3?tr('puzzles.a_backhoe_walks_into_your_network'):!e.n1&&!e.cheap?tr('puzzles.it_works_finance_and_the_backhoe'):!e.n1?tr('puzzles.one_backhoe_away_from_a_very'):tr('puzzles.rock_solid_and_gold_plated_the');}
function pzConfetti(){if(!animOn())return '';const cols=['#FF4F9A','#FFD23F','#22C47A','#2F8CFF','#FF8A3D','#7B61FF'];let h='';
  for(let i=0;i<28;i++)h+=`<i style="--x:${(i*37)%100}%;--c:${cols[i%cols.length]};--r:${(i%2?1:-1)*(180+(i*53)%360)}deg;--t:${1.4+(i%5)*0.25}s;--dl:${((i*7)%10)/10}s"></i>`;
  return `<div class="pzconf" aria-hidden="true">${h}</div>`;}
function pzResults(e,prev){const P=S.pz,nx=P.id==='weekly'?null:pzNextDef();
  const row=(ok,l,v)=>`<div class="kv"><span>${ok?'⭐':'☆'} ${l}</span><b>${v}</b></div>`;
  const stars=[0,1,2].map(i=>`<span class="pzbig${i<e.stars?' on':''}${i>=prev&&i<e.stars?' pop':''}" style="--d:${Math.max(0,i-prev)*0.45}s">⭐</span>`).join('');
  openModal(`<div class="pzres">${e.stars>=3?pzConfetti():''}<div style="display:flex;align-items:center"><div class="grow"><div class="eyebrow">${tr('puzzles.puzzle_solved')}</div><h2 style="font-size:28px">${esc(pzName(pzDef(P.id)||P))}</h2></div><button class="x" data-act="closeModal" aria-label="${tr('common.close')}">×</button></div>
  <div class="pzstars">${stars}</div><p class="tagline" style="text-align:center">${pzLine(e)}</p>
  ${row(true,tr('puzzles.goal'),tr('puzzles.connected'))}${row(e.cheap,tr('puzzles.budget'),P.budget?tr('puzzles.spent_x_of_y',{x:fmt$(e.spend),y:fmt$(P.budget)}):tr('puzzles.on_the_house'))}${row(e.n1,'N-1',e.n1?tr('puzzles.survives_any_single_cut'):tr('puzzles.one_cut_splits_it'))}
  <div class="btns cta" style="margin-top:12px">${nx?btn(tr('puzzles.next_puzzle'),'pzStart',{id:nx.id},'pink big'):btn(tr('puzzles.more_puzzles'),'puzzleMenu',{},'pink big')}${e.stars<3?btn(tr('puzzles.retry_for_3_stars'),'pzRetry',{},''):''}${btn(tr('common.share_2cd9'),'pzShare',{},'')}${btn(tr('puzzles.keep_building'),'closeModal',{},'ghost')}</div></div>`);
  for(let i=prev;i<e.stars;i++)setTimeout(()=>{sfx('star');haptic(15);},Math.max(0,i-prev)*450+150);
  if(e.stars>=3&&prev<3)setTimeout(()=>sfx('fanfare'),(3-prev)*450+250);}
// ---------- the list ----------
// The weekly row: the published puzzle once it has come (or the seeded one), its countdown and the streak.
function pzWkRow(){const p=pzLoad(),w=pzWkDef(),wr=p.wk[w.key],st=p.streak,streak=st.last===w.key||st.last===pzPrevKey(w.key)?st.n:0,T=PZ_WK_THEMES[w.theme],load=pzWkLoading(),tg=pzTwistTag(w);
  return `<div class="scn wk" id="pzWk"><div class="grow"><div class="eyebrow">📅 ${tr('puzzles.weekly_puzzle_key',{key:esc(w.key)})}${wr?'':` <span class="pznew">${tr('puzzles.new_this_sunday')}</span>`}</div>
  <div class="nm">${load?tr('puzzles.loading_this_week_s_puzzle'):`${T?T.i+' ':''}${esc(pzName(w))}`} ${wr?`<span class="pzst">${pzStarStr(wr.st)}</span>`:''}</div>${w.wj?`<div class="meta">${esc(pzTxt(w.wj))}</div>`:''}
  <div class="meta">${w.cities.map(c=>esc(CITY[c].name)).join(' · ')} · ${tr('puzzles.budget_x',{x:fmt$(w.budget)})}${tg.length?' · <b>'+tg.join(' · ')+'</b>':''}${wr&&wr.sp!=null?' · '+tr('puzzles.best_x',{x:fmt$(wr.sp)}):''}</div>
  <div class="meta">${tr('puzzles.same_puzzle_for_everyone_this_week')}${streak?' · 🔥 '+trn('puzzles.n_week_streak',streak):''}</div><div class="meta pzcd">⏳ ${pzWkNext(Date.now())}</div></div>${btn(tr('common.play'),'pzWeekly',{},wr&&wr.st>=3?'ghost':'pink',load)}</div>`;}
function pzMenu(){pzWkEnsure();const p=pzLoad(),tot=pzStarsTotal(p),max=PZ.length*3,nxP=PZ_PACKS.find(x=>x.need>tot);
  let h=`<div style="display:flex;align-items:center"><div class="grow"><div class="eyebrow">${tr('puzzles.puzzles')}</div><h2 style="font-size:28px">${tr('puzzles.small_calm_network_builds')}</h2></div><button class="x" data-act="helpClose" aria-label="${tr('common.close')}">×</button></div>
  <p class="tagline">${tr('puzzles.no_clock_no_bills_nothing_breaks')}</p>
  <div class="pzprog"><div class="kv"><span>${tr('puzzles.your_stars')}</span><b>⭐ ${tot} / ${max}</b></div><div class="bar me"><i style="width:${(tot/max*100).toFixed(1)}%"></i></div>${nxP?`<div class="meta">${tr('puzzles.next_pack_unlocks_at_n',{n:nxP.need,pack:esc(nxP.n)})}</div>`:''}</div>`;
  if(pzOn())h+=`<div class="btns" style="margin:8px 0">${btn(UI.pzFrom==='game'?tr('puzzles.back_to_my_network'):tr('puzzles.back_to_the_title'),'pzLeave',{},'')}${btn(tr('puzzles.keep_building'),'closeModal',{},'ghost')}</div>`;
  h+=pzWkRow();
  for(const pk of PZ_PACKS){const open=tot>=pk.need,got=PZ.filter(x=>x.pack===pk.id).reduce((a,x)=>a+((p.s[x.id]||{}).st|0),0),n=PZ.filter(x=>x.pack===pk.id).length;
    h+=`<h3 class="pzpack">${open?'':'🔒 '}${esc(pk.n)} <span class="meta">⭐ ${got}/${n*3}</span></h3><p class="meta" style="margin:0 0 2px">${open?esc(pk.d):tr('puzzles.unlocks_at_n_stars',{n:pk.need})}</p>`;
    for(const d of PZ.filter(x=>x.pack===pk.id)){const r=p.s[d.id],tg=pzTwistTag(d);
      h+=`<div class="scn${open?'':' lock'}"><div class="grow"><div class="nm">${esc(d.n)} <span class="pzst">${pzStarStr(r?r.st:0)}</span></div><div class="meta">${esc(d.j)}</div><div class="meta">${d.cities.map(c=>esc(CITY[c].name)).join(' · ')} · ${d.budget?tr('puzzles.budget_x',{x:fmt$(d.budget)}):tr('puzzles.no_budget')}${tg.length?' · <b>'+tg.join(' · ')+'</b>':''}${r&&r.sp!=null?' · '+tr('puzzles.best_x',{x:fmt$(r.sp)}):''}</div></div>${btn(tr('common.play'),'pzStart',{id:d.id},r&&r.st>=3?'ghost':'',!open)}</div>`;}}
  openModal(h);}
