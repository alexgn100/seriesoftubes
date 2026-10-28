Object.assign(ACT,{
 addSite:({city})=>{const p=S.pops[city];if(!p||p.site2)return;if(!spend(SITE2_COST))return;p.site2=true;p.site2Day=S.day;toast(tr('sites_peering_caches.second_site_live_in_city_b',{city:CITY[city].name,b:esc(siteName(city,'b')),a:esc(siteName(city,'a'))}),'good');sfx('build');after();},
 rmSite:({city})=>{const p=S.pops[city];if(!p||!p.site2)return;if(UI.confirm!=='site'+city){UI.confirm='site'+city;renderPanel();return;}UI.confirm=null;p.site2=0;p.sdown=null;p.ringcut=0;for(const t of S.transit)if(t.city===city)t.site='a';for(const x of S.pni)if(x.city===city)x.site='a';for(const x of S.caches)if(x.city===city)x.site='a';if(S.ixSite)for(const x of ixIdsIn(city))delete S.ixSite[x];after();},
 siteSet:({k,id,s})=>{if(!['a','b','ab'].includes(s))return;
   const o=k==='t'?S.transit.find(x=>x.id===id):k==='p'?S.pni.find(x=>x.id===id):null;if(k!=='ix'&&!o)return;if(k==='ix'&&(!isIx(id)||S.ixp[id]===undefined||!S.pops[ixCity(id)]))return;
   if(k==='ix'&&S.myIx[id]){S.ixSite=S.ixSite||{};S.ixSite[id]=s;after();return;}
   const n=()=>k==='ix'?((S.ixn||{})[id]||1):(o.n||1);
   if(s==='ab'&&n()<2){const before=n();if(k==='t')ACT.lagT({id,d:1});else if(k==='p')ACT.lagP({id,d:1});else ACT.lagIx({city:id,d:1});if(n()<2||n()===before)return;toast(tr('sites_peering_caches.second_lag_member_added_one_member'),'good');}
   if(k==='ix'){S.ixSite=S.ixSite||{};S.ixSite[id]=s;}else o.site=s;after();},
 peer:({city,net})=>{if(!isIx(city)||!isNet(net)||S.ixp[city]===undefined||!ixMembers(city).includes(net))return;const r=peerOk(net,'ix',city);if(!r.ok){toast(tr('sites_peering_caches.net_declined_why',{net:esc(NET[net].name),why:esc(r.why)}),'bad');sfx('err');return;}S.peers[net+'@'+city]=true;
   toast(`<b>${tr('sites_peering_caches.net_accepted',{net:esc(NET[net].name)})}</b><br>${NET[net].pol==='selective'?tr('sites_peering_caches.they_checked_your_pearingdb_page_and'):tr('sites_peering_caches.bgp_session_established')}`,'good');sfx('build');after();},
 unpeer:({city,net})=>{delete S.peers[net+'@'+city];after();},
 peerAll:({city})=>{if(!isIx(city)||S.ixp[city]===undefined)return;const set=ixSessions(city);let n=0;for(const id of ixMembers(city))if(!set.has(id)&&peerOk(id,'ix',city).ok){S.peers[id+'@'+city]=true;n++;}if(!n)return;toast(trn('sites_peering_caches.n_new_session_at_ix_small',n,{ix:esc(ixName(city))}),'good',[],{a:'city',v:ixCity(city)});sfx('build');after();},
 tailTog:()=>{UI.tailOpen=!UI.tailOpen;renderLeft();},
 pni:({city,net,tier})=>{const q=pniQuote(city,net,tier);if(!q)return;if(q.why){toast(q.why,'bad');sfx('err');after();return;}if(!spend(q.cost))return;const lead=pniPlace(q);
   toast(tr('sites_peering_caches.pni_with_net_ordered_eta_a',{net:esc(NET[net].name),eta:pniWhen(lead),dc:esc(siteName(city,'a'))}),'good');after();},
 pniAllOpen:({net})=>{pniAllModal(net);},
 pniAllSize:({v})=>{if(!UI.pniAll)return;pniAllModal(UI.pniAll.net,+v);$('modalCard').querySelector('[data-chg="pniAllSize"]')?.focus();},
 pniAll:({net,tier})=>{const b=pniBatch(net,tier);if(!b||!b.orders.length)return;if(!spend(b.cost))return;
   for(const q of b.orders)pniPlace(q);UI.pniAll=null;closeModal();
   toast(trn('pni_all.n_orders_with_net',b.orders.length,{net:esc(net===null?tr('common.all_networks'):NET[net].name),kept:b.kept,blocked:b.blocked.length}),'good');after();},
 pniChase:({id})=>{const p=S.pni.find(x=>x.id===id);if(!p||(pniOn(p)&&!p.up))return;const r=Math.random();
   if(r<0.15){if(p.up)p.up.ready=Math.max(S.day+1,p.up.ready-30);else p.ready=Math.max(S.day+1,p.ready-30);toast(tr('sites_peering_caches.your_account_manager_found_the_order'),'good');}
   else toast(pick([tr('sites_peering_caches.it_is_with_the_provisioning_team'),tr('sites_peering_caches.we_are_waiting_on_the_colo'),tr('sites_peering_caches.your_ticket_was_merged_into_another'),tr('sites_peering_caches.could_you_resend_the_loa_you'),tr('sites_peering_caches.your_account_manager_is_on_paternity')]));after();},
 inbox:()=>{inboxModal();},
 inboxAct:({id,a})=>{if(!['accept','decline','raise','keep'].includes(a))return;ibxAnswer(+id,a);after();inboxModal();},
 inboxPol:({p})=>{if(!PPOL.includes(p))return;ibx().pol=p;after();inboxModal();},
 inboxRaiseAll:()=>{const I=ibx(),mp=I.items.filter(x=>x.k==='mp');if(!mp.length)return;const leaks=mp.filter(x=>x.leak).length;for(const x of mp)ibxAnswer(x.id,'raise',true);
   toast(leaks?trn('sites_peering_caches.raised_n_max_prefix_limits_one',leaks,{n:mp.length,k:leaks}):tr('sites_peering_caches.raised_n_max_prefix_limits_all',{n:mp.length}),leaks?'bad':'good');after();inboxModal();},
 inboxAll:({a})=>{if(a!=='accept'&&a!=='decline')return;const I=ibx();for(const x of I.items.filter(x=>x.k==='req'))ibxAnswer(x.id,a,true);after();inboxModal();},
 inboxBot:({on})=>{const I=ibx();if(+on){if(I.bot||!spend(AI_MO))return;I.bot=true;ibxLog(N_('sites_peering_caches.hello_i_am_large_peering_model'),{});toast(tr('sites_peering_caches.large_peering_model_is_hired_your',{price:fmt$(20e6)}),'good');}else{I.bot=false;toast(tr('sites_peering_caches.the_ai_is_gone_it_left'));}after();inboxModal();},
 cancelPni:({id,ok})=>{if(!ok&&UI.confirm!==id){UI.confirm=id;renderPanel();return;}S.pni=S.pni.filter(p=>p.id!==id);UI.confirm=null;after();},
 cache:({city,net})=>{const n=NET[net];if(!n||!n.cache||!S.pops[city])return;if((R.demTo[net]||0)<n.cache.min){toast(tr('sites_peering_caches.net_says_not_yet_send_them',{net:esc(n.name),min:n.cache.min}),'bad');sfx('err');return;}if(!portGate(city,1))return;
   {const hv=S.caches.filter(x=>x.city===city&&x.net===net),nb=hv.filter(x=>x.site==='b').length;S.caches.push({id:uid(),city,net,site:S.pops[city].site2&&nb<hv.length-nb?'b':'a'});}toast(tr('sites_peering_caches.cache_installed_in_city_net_shipped',{cache:esc(n.cache.name),city:CITY[city].name,net:esc(n.name),mo:fmt$(CACHE_MO)}),'good');sfx('build');after();},
 rmCache:({id})=>{S.caches=S.caches.filter(c=>c.id!==id);after();},
 // Move one of a CDN's boxes to the other building (#69), so a dark building only takes out part of the cache.
 cacheSite:({city,net,s})=>{if(s!=='a'&&s!=='b'||!S.pops[city]||!S.pops[city].site2)return;const x=S.caches.find(c=>c.city===city&&c.net===net&&(c.site==='b'?'b':'a')!==s);if(!x)return;x.site=s;sfx('click');after();},
});
