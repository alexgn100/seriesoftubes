const GRACE_DAYS=60;
const REQS={
 lat:{only:true,l2:true,bonus:0,l:o=>tr('requirements.one_way_latency_within_max_ms',{max:o.latMax,best:(()=>{const v=R.l2lat[o.id]!==undefined?R.l2lat[o.id]:bestLat(o.city,o.city2);return isFinite(v)?v.toFixed(1)+' ms':tr('common.no_path')})()}),ok:b=>(R.l2lat[b.id]!==undefined?R.l2lat[b.id]:bestLat(b.city,b.city2))<=b.latMax},
 nni:{only:true,bonus:0,l:o=>tr('requirements.comes_in_over_fab_needs_your',{fab:FAB[o.prov]?FAB[o.prov].name:'?',city:CITY[o.city].name,bw:fmtG(o.bw)}),ok:b=>{const pt=nniPort(b.city,b.prov);return !!pt&&nniUsed(b.city,b.prov)<=NNI[pt.tier].g+1e-9;}},
 diverse:{l:tr('requirements.two_paths_that_share_no_trench'),bonus:.25,l2:true,can:(b,s=S)=>diversityPossible(b.city,b.city2,s),ok:b=>R.div[b.id]!==undefined?!!R.div[b.id]:diversePaths(b.city,b.city2)},
 sharks:{l:tr('requirements.afraid_of_sharks_needs_a_path'),bonus:.2,l2:true,ok:b=>terrestrialPath(b.city,b.city2),can:b=>!!b.city2&&!isSub(b.city,b.city2)},
 nocog:{l:tr('requirements.refuses_cogentle_transit_anywhere_on'),bonus:.15,ok:()=>!S.transit.some(t=>t.net==='cog')},
 ipv6:{l:tr('requirements.ipv6_or_bust_you_must_peer'),bonus:.1,ok:()=>Object.keys(S.ixp).some(c=>ixSessions(c).has('drz'))||S.pni.some(p=>p.net==='drz'&&pniOn(p))},
 netchill:{l:tr('requirements.wants_netchill_on_net_a_cache'),bonus:.15,ok:()=>S.caches.some(c=>c.net==='nfx')||S.pni.some(p=>p.net==='nfx'&&pniOn(p))},
 gen:{l:tr('requirements.backup_generator_in_every_city_they'),bonus:.15,ok:b=>[b.city,b.city2].filter(Boolean).every(c=>S.pops[c]&&S.pops[c].gen)},
 routers:{l:tr('requirements.insists_on_two_routers_in_their'),bonus:.15,ok:b=>((S.pops[b.city]&&S.pops[b.city].routers)||1)>=2},
 local:{l:tr('requirements.local_breakout_transit_or_an_ix'),bonus:.2,ip:true,ok:b=>S.transit.some(t=>t.city===b.city)||hasIxAt(b.city)||(isTier1()&&S.pni.some(p=>p.city===b.city))},
 metro:{l:tr('requirements.two_data_centers_in_every_metro'),bonus:.2,only:true,ok:b=>[b.city,b.city2].filter(Boolean).every(c=>S.pops[c]&&S.pops[c].site2)},
 twoup:{l:tr('requirements.wants_two_different_transit'),bonus:.15,ip:true,ok:()=>new Set(S.transit.map(t=>t.net)).size>=2||S.transit.length===0},
 china:{l:tr('requirements.needs_low_loss_reach_into_china'),bonus:.3,ip:true,ok:()=>S.transit.some(t=>t.premium&&t.city==='hkg')||S.links.some(l=>l.premium)||S.pni.some(p=>NET[p.net].cn&&pniOn(p))},
 scrubbed:{l:tr('requirements.will_only_sign_with_a_network'),bonus:.15,ok:()=>hasScrub()},
 scrubnear:{l:tr('requirements.wants_a_scrubbing_center_on_its'),bonus:.15,ip:true,ok:b=>S.scrubs.some(x=>CITY[x.city].reg===CITY[b.city].reg)},
 puns:{l:tr('requirements.their_ceo_hates_puns_please_do'),bonus:.05,ok:()=>true},
};
function terrestrialPath(a,b){const ls=S.links.filter(l=>!linkDown(l)&&!l.sub);const adj={};for(const l of ls){(adj[l.a]=adj[l.a]||[]).push(l.b);(adj[l.b]=adj[l.b]||[]).push(l.a);}const seen=new Set([a]),q=[a];while(q.length){const u=q.shift();if(u===b)return true;for(const v of adj[u]||[])if(!seen.has(v)){seen.add(v);q.push(v);}}return false;}
const reqOk=b=>(b.reqs||[]).every(k=>REQS[k]&&REQS[k].ok(b));
// Some requirements only make sense for some customers: nobody can reach another continent without getting wet.
const reqCan=(k,b)=>!REQS[k].can||REQS[k].can(b);
function reqList(o){return (o.reqs||[]).map(k=>{const ok=REQS[k].ok(o),lab=typeof REQS[k].l==='function'?REQS[k].l(o):REQS[k].l;return `<div class="meta"><b style="color:${ok?'var(--eye)':'var(--bad)'}">${ok?'✓':'✗'}</b> ${esc(lab)}</div>`;}).join('');}
function diversePaths(a,b){
  const rem=remoteCities(),ok=c=>popUp(c)||rem.includes(c);
  return disjointRoutes(a,b,S.links.filter(l=>!linkDown(l)&&ok(l.a)&&ok(l.b)));}
function disjointRoutes(a,b,live){const srlg=l=>l.kind==='vxc'?'fab:'+l.prov:(l.trench||l.id);
  const bfs=ls=>{const adj={};for(const l of ls){(adj[l.a]=adj[l.a]||[]).push([l.b,l]);(adj[l.b]=adj[l.b]||[]).push([l.a,l]);}
    const prev={[a]:null},q=[a];while(q.length){const u=q.shift();if(u===b)break;for(const [v,l] of adj[u]||[])if(!(v in prev)){prev[v]=l;q.push(v);}}
    if(!(b in prev))return null;const path=[];let v=b;while(v!==a){const l=prev[v];path.push(l);v=l.a===v?l.b:l.a;}return path;};
  const p1=bfs(live);if(!p1)return false;const used=new Set(p1.map(srlg));return !!bfs(live.filter(l=>!used.has(srlg(l))));}
// Check buildable geography, not today's POPs, capacity or outages. Parallel land
// routes can use separate trenches; all segments of one cable share its risk.
let diversityMap=null;
function diversityPossible(a,b,state=S){
  if(!CITY[a]||!CITY[b]||a===b)return false;
  const rules=state.scn&&state.scn.rules||{},key=JSON.stringify([!!state.won,rules]);
  if(!diversityMap||diversityMap.key!==key){
    const links=[],cities=CITIES.filter(c=>!(rules.banCities||[]).includes(c.id)).map(c=>c.id);
    const add=(a,b,id)=>links.push({a,b,id});
    for(let i=0;i<cities.length;i++)for(let j=i+1;j<cities.length;j++){
      const a=cities[i],b=cities[j];
      if(!isSub(a,b)){add(a,b,'land:'+a+':'+b+':1');add(a,b,'land:'+a+':'+b+':2');}
      for(const c of cablesFor(a,b))if(!(rules.banPairs||[]).some(p=>p===c.cid+':'+a+'-'+b||p===c.cid+':'+b+'-'+a))add(a,b,'cab:'+c.cid);
      if(state.won&&seaCab(a,b)&&landing(a)&&landing(b)&&!cnCity(a)&&!cnCity(b))add(a,b,'own:'+a+':'+b);
      for(const f of FABS)if(f.cities.includes(a)&&f.cities.includes(b))add(a,b,'fab:'+f.id);
    }
    diversityMap={key,links,answers:{}};
  }
  const pair=[a,b].sort().join(':');
  return diversityMap.answers[pair]??(diversityMap.answers[pair]=disjointRoutes(a,b,diversityMap.links));
}
function fiberOk(b){const l=S.links.find(x=>x.id===b.link);if(!l)return false;if(b.type==='dfpair'||b.type==='pairs')return l.ready<=S.day&&!(l.cut>S.day);return l.ready<=S.day&&!(l.cut>S.day)&&!(l.eqDown>S.day);}
function soldSlots(l){return S.biz.filter(b=>b.type==='wwave'&&b.link===l.id).reduce((a,b)=>a+(b.slots||0),0);}
// Spare capacity other carriers can rent on a dark fiber (#51): free channels for alien waves, and on your own build
// a spare pair in the trench. Random offers and broker listings follow the same rules and the same prices.
const freeCh=l=>chMax(l)-(l.ch||[]).length-soldSlots(l),pairFree=l=>!!l.own&&S.biz.filter(b=>b.type==='dfpair'&&b.link===l.id).length<2&&!S.biz.some(b=>b.type==='pairs'&&b.link===l.id);
const wwWhat=(l,n)=>trn('requirements.n_400g_alien_wave_on_your',n,{a:CITY[l.a].name,b:CITY[l.b].name});
function fiberOffer(t,l,nm,cut=1){
  if(t==='wwave'){const slots=1+Math.floor(Math.random()*Math.min(4,freeCh(l)));
    return {id:uid(),city:l.a,city2:l.b,link:l.id,slots,what:wwWhat(l,slots),name:nm(),type:t,bw:1,rate:Math.round(waveMo(l.km,false,2)*0.55*slots*cut),reqs:[],exp:S.day+30};}
  return {id:uid(),city:l.a,city2:l.b,link:l.id,what:tr('requirements.a_spare_fiber_pair_in_your',{a:CITY[l.a].name,b:CITY[l.b].name}),name:nm(),type:t,bw:1,rate:Math.round(dfLeaseMo(l.km)*0.9*cut),reqs:[],exp:S.day+30};}
