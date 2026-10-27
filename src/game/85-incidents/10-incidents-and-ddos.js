/* ---------- failures & events ---------- */
// A few badges read the incident text: callers whose message mentions a shark, anchor, crocodile or llama pass its English as en.
function addInc(o,en=o.msg||''){if(S.loans&&S.loans.some(l=>(l.covs||[]).includes('pizza'))){S.cash-=COVS.pizza.each;S.stats.pizza=(S.stats.pizza||0)+1;}o.id=uid();o.start=S.day;S.inc.push(o);S.stats.incidents++;S.stats.by=S.stats.by||{};S.stats.by[o.type]=(S.stats.by[o.type]||0)+1;if(/shark/i.test(en))S.stats.sharks=(S.stats.sharks||0)+1;const f=S.stats.f=S.stats.f||{};if(/anchor/i.test(en))f.anchor=1;if(/crocodile/i.test(en))f.croc=1;if(/beaver/i.test(en))f.beaver=1;if(/llama/i.test(en))f.llama=1;}
const HARMLESS=[
 [tr('common.certificate_expired'),tr('incidents_and_ddos.the_tls_certificate_on_your_noc')],
 [tr('incidents_and_ddos.it_was_dns'),tr('incidents_and_ddos.someone_deleted_the_dns_record_for')],
 [tr('common.leap_second'),tr('incidents_and_ddos.a_leap_second_convinced_one_of')],
 [tr('common.change_freeze'),tr('incidents_and_ddos.management_declared_a_change_freeze')],
 [tr('incidents_and_ddos.ticket_of_the_week'),tr('incidents_and_ddos.a_customer_opened_a_p1_ticket')],
 [tr('common.monitoring'),tr('incidents_and_ddos.your_monitoring_system_went_down_you')],
 [tr('incidents_and_ddos.load_bearing_typo'),tr('incidents_and_ddos.someone_named_a_vlan_prodcution_it')],
 [tr('common.ipv6_milestone'),tr('incidents_and_ddos.your_ipv6_traffic_grew_400_from')],
 [tr('common.mystery_link'),tr('incidents_and_ddos.you_found_a_10g_link_in')],
 [tr('common.spreadsheet_ipam'),tr('incidents_and_ddos.your_ip_address_spreadsheet_hit_1')],
  [tr('common.goose_incident'),tr('incidents_and_ddos.a_goose_attacked_the_technician_on')],
 [tr('common.latency_test'),tr('incidents_and_ddos.a_carrier_pigeon_beat_one_of')],
 [tr('common.zombie_route'),tr('incidents_and_ddos.a_route_you_withdrew_in_year')],
 [tr('common.auditor_visit'),tr('incidents_and_ddos.an_auditor_asked_for_a_network')],
 [tr('incidents_and_ddos.open_to_work'),tr('incidents_and_ddos.your_peering_coordinator_updated')],
 [tr('common.hold_music'),tr('incidents_and_ddos.your_upstream_support_line_plays_the')],
 [tr('common.naming_committee'),tr('incidents_and_ddos.a_two_hour_meeting_about_router')],
 [tr('common.vendor_tac'),tr('incidents_and_ddos.vendor_support_asked_you_to_try')],
];
function lagsN(){const o=[];for(const t of S.transit)if((t.n||1)>=2&&!(t.down>S.day))o.push({k:'t',id:t.id,o:t,n:t.n,lab:tr('incidents_and_ddos.name_transit_lag_in_city',{name:NET[t.net].name,city:CITY[t.city].name})});
  for(const p of S.pni)if((p.n||1)>=2)o.push({k:'p',id:p.id,o:p,n:p.n,lab:tr('incidents_and_ddos.pni_lag_with_name_in_city',{name:NET[p.net].name,city:CITY[p.city].name})});
  for(const x in S.ixp){const n=(S.ixn||{})[x]||1;if(n>=2&&!S.myIx[x])o.push({k:'ix',id:x,n,lab:ixNamesCity(x)?tr('incidents_and_ddos.ix_lag',{ix:ixName(x)}):tr('incidents_and_ddos.ix_lag_in_city',{ix:ixName(x),city:CITY[ixCity(x)].name})});}return o;}
// Where the junk comes in: one of the city's live uplinks, or just "the edge" if it has none yet.
function ddosEntry(c){const o=[];
  for(const t of S.transit)if(t.city===c&&!(t.down>S.day))o.push({k:'t',id:t.id,lab:tr('common.net_transit',{net:NET[t.net].name})});
  for(const x of ixIdsIn(c))if(S.ixp[x]!==undefined)o.push({k:'ix',id:x,lab:tr('common.ix_peering',{ix:ixName(x)})});
  for(const p of S.pni)if(p.city===c)o.push({k:'p',id:p.id,lab:tr('common.pni_with_net',{net:NET[p.net].name})});
  return o.length?pick(o):{k:'edge',lab:''};}
// Flowspec capability of the router in a city: 0 none, 1 basic, 2 full. The flood is filtered where the
// victim POP's own router has the TCAM for it.
const fsAt=c=>{const p=S.pops[c];return p?(RG[p.rgen||0].fs||0):0;};
// Scrubbing residual for an attack: clean up to the center's capacity (to 15%), overflow leaks. On-demand
// does nothing for the first couple of days while traffic is being diverted.
function scrubEngaged(atk){return hasScrub()&&(S.scrubMode==='always'||(S.day-(atk.start||S.day))>=SCRUB_DELAY);}
// Several centers (#117): the flood goes to the nearest working one, and what it cannot take spills to the next.
// A center in another city only helps if the backbone can carry the flood there; routing works that out.
const scrubFar=c=>{const a=S.ev&&S.ev.ddos;return a&&a.until>S.day&&a.city===c&&(R.haul||[]).find(q=>q.city===c&&q.ms!==null&&q.ms>=SCRUB_FAR_MS)||null;};
function scrubPlan(atk){if(!scrubEngaged(atk))return null;const c=atk.city;let g=atk.gbps||0;const parts=[];
  for(const x of S.scrubs.filter(x=>popUp(x.city)&&(x.city===c||pathExists(c,x.city))).sort((a,b)=>(a.city===c?0:kmBetween(c,a.city))-(b.city===c?0:kmBetween(c,b.city)))){if(g<=0)break;const a=Math.min(g,SCRUB_TIERS[x.tier||0].g);parts.push({city:x.city,tier:x.tier||0,a});g-=a;}
  return parts.length?{parts,leak:g}:null;}
// What still lands on the city if every haul gets through: 15% of what is scrubbed, plus whatever no center can take.
const scrubIdeal=p=>p?p.parts.reduce((s,x)=>s+x.a*0.15,0)+p.leak:Infinity;
// The NOC's live attack view: what is hitting you, what each tool would do about it right now, and the buttons.
function ddosPanel(){
  const a=S&&S.ev&&S.ev.ddos;if(!a||a.until<=S.day||!S.pops[a.city])return '';
  const V=DDOS_VEC[a.vec]||{n:'?',fs:false},cap=fsAt(a.city),model=RG[(S.pops[a.city].rgen||0)].n,en=a.entry||{};
  const cleanT=en.k==='t'?S.transit.find(x=>x.id===en.id):null, sacP=en.k==='p'?S.pni.find(x=>x.id===en.id):null;
  let mult=1;
  if(V.fs&&cap)mult=Math.min(mult,FS_RES[cap]);
  if(cleanT&&cleanT.clean)mult=Math.min(mult,0.1);
  if(a.ixbh&&hasIxAt(a.city))mult=Math.min(mult,0.5);
  const sp=scrubPlan(a),useS=!!sp&&scrubIdeal(sp)<a.gbps*mult,hl=x=>(R.haul||[]).find(q=>q.city===a.city&&q.to===x.city);
  let land=a.bh?0:useS?sp.parts.reduce((t,x)=>{const q=x.city===a.city?null:hl(x);return t+x.a*0.15+(q?(q.a-q.h)*0.85:0);},sp.leak):a.gbps*mult;
  if(sacP&&sacP.sacrif)land=Math.min(land,liveCap(PORT[sacP.tier].g,sacP.city,sacP.site,sacP.n)*0.9);
  land=Math.round(land);
  const fsLine=!V.fs?'— '+tr('incidents_and_ddos.flowspec_cannot_catch_an_vec',{vec:esc(V.n)})
    :cap>=2?'✓ '+tr('incidents_and_ddos.flowspec_on_your_model_is_dropping',{model:esc(model),vec:esc(V.n)})
    :cap===1?'~ '+tr('incidents_and_ddos.flowspec_on_your_model_trims_vec',{model:esc(model),vec:esc(V.n)})
    :'— '+tr('incidents_and_ddos.your_model_here_has_no_flowspec',{model:esc(model)});
  const scrOne=x=>{const T=SCRUB_TIERS[x.tier],q=x.city===a.city?null:hl(x);
      return q&&q.h<q.a-0.5?'~ '+tr('incidents_and_ddos.your_backbone_can_only_haul_g',{g:fmtG(q.h),city:esc(CITY[x.city].name)})
        :q&&q.ms!==null?'✓ '+tr('incidents_and_ddos.tier_scrubbing_in_city_is_cleaning',{tier:T.n,city:esc(CITY[x.city].name),ms:Math.round(q.ms)})
        :'✓ '+tr('incidents_and_ddos.tier_scrubbing_in_city_is_cleaning_a8f6',{tier:T.n,city:esc(CITY[x.city].name)});};
  const scrLine=!hasScrub()?'— '+tr('incidents_and_ddos.no_scrubbing_center')
    :!scrubEngaged(a)?'… '+tr('incidents_and_ddos.on_demand_scrubbing_diverting_live',{n:Math.max(1,SCRUB_DELAY-(S.day-(a.start||S.day)))})
    :!sp?'— '+tr('incidents_and_ddos.no_scrubbing_center')
    :sp.parts.map(scrOne).join('<br>')+(sp.leak>0.5?'<br>~ '+tr('incidents_and_ddos.your_scrubbing_centers_are_full_g',{g:fmtG(sp.leak)}):'');
  const entryLine=cleanT&&cleanT.clean?'✓ '+tr('incidents_and_ddos.net_is_scrubbing_it_upstream_clean',{net:esc(NET[cleanT.net].name)})
    :sacP&&sacP.sacrif?'✓ '+tr('incidents_and_ddos.contained_on_your_sacrificial_net',{net:esc(NET[sacP.net].name)}):'';
  let h=`<div class="inc" style="background:#FFE2E6;border:1px solid #FF8A9A">
    <div class="nm">🚨 ${tr('incidents_and_ddos.live_attack_city',{city:esc(CITY[a.city].name)})}</div>
    <div class="meta">${tr('incidents_and_ddos.size_vec_entry_n_d_left',{size:fmtG(a.gbps),vec:esc(V.n),entry:a.entry&&a.entry.lab?' · '+esc(a.entry.lab):'',n:a.until-S.day})}</div>
    <div class="meta"><b>${a.bh?tr('incidents_and_ddos.blackholed_the_junk_is_gone_and',{city:esc(CITY[a.city].name)}):tr('incidents_and_ddos.reaching_your_network_g',{g:fmtG(land)})}</b></div>
    <div class="meta">${scrLine}</div>
    <div class="meta">${fsLine}</div>${entryLine?`\n    <div class="meta">${entryLine}</div>`:''}
    <div class="btns">${a.bh?btn(tr('common.stop_blackholing'),'unrtbh',{},'ghost sm'):btn(tr('incidents_and_ddos.blackhole_the_target_rtbh'),'rtbh',{},'red sm')}${hasIxAt(a.city)&&!a.bh?btn(a.ixbh?tr('incidents_and_ddos.ix_blackhole_on'):tr('incidents_and_ddos.ix_blackhole_half_honour_it'),'ixbh',{},a.ixbh?'green sm':'sm'):''}${btn(tr('incidents_and_ddos.hackback_3000tm_20k'),'hackback',{},'sm',S.cash<20000)}</div>
    <p class="meta">${tr('incidents_and_ddos.rtbh_is_free_and_instant_but')}</p></div>`;
  return h;}
