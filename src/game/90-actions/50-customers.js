Object.assign(ACT,{
 advertise:({id})=>{const l=S.links.find(x=>x.id===id);if(!l||l.kind!=='df'||l.ready>S.day)return;if(S.offers.some(o=>o.link===l.id))return;
   const t=freeCh(l)>=1?'wwave':pairFree(l)?'dfpair':null;if(!t){toast(tr('customers.nothing_spare_to_sell_on_this'),'bad');sfx('err');return;}
   const T=BIZ_T[t],nm=()=>{const list=T.names.filter(n=>!S.usedNames.includes(n)),n=list.length?pick(list):pick(T.names);useName(n);return n;};
   // A capacity broker finds a buyer at once and keeps 10% of the monthly price.
   const o=fiberOffer(t,l,nm,0.9);o.broker=true;S.offers.push(o);toast(tr('customers.listed_with_a_capacity_broker_name',{name:esc(o.name),what:esc(o.what)}),'good');sfx('click');after();},
 autoToggle:({k})=>{if(k!=='autoSales'&&k!=='autoRepair')return;S[k]=!S[k];if(k==='autoSales'){UI.autoGame=S;UI.autoSalesAt=performance.now();}sfx('click');after();},
 accept:({id,auto=false})=>{const o=S.offers.find(x=>x.id===id);if(!o)return;const customer=auto?(S.autoSales&&autoOffer(o)):offerCustomer(o);if(!customer)return;if(!bHas(o)){toast(tr('customers.you_need_a_pop_in_every'),'bad');return;}
   if(o.type==='wwave'){const l=S.links.find(x=>x.id===o.link);if(!l||chMax(l)-(l.ch||[]).length-soldSlots(l)<o.slots){toast(tr('customers.not_enough_free_channels_on_that'),'bad');return;}}
   if(BIZ_T[o.type].event&&S.day>=o.start){toast(tr('customers.too_late_the_event_has_already'),'bad');return;}
   // A carrier renting more alien waves on a fiber it already rents grows its contract, like a real order for extra waves,
   // instead of a new customer for every few waves (a big fiber business otherwise fills the save with tiny contracts).
   const more=o.type==='wwave'&&S.biz.find(b=>b.type==='wwave'&&b.link===o.link&&b.name===o.name);
   if(more){const l=S.links.find(x=>x.id===o.link);S.offers=S.offers.filter(x=>x!==o);more.slots=(more.slots||0)+(o.slots||0);more.rate+=o.rate;if(l)more.what=wwWhat(l,more.slots);
     floater(CITY[o.city].x,CITY[o.city].y-30,tr('common.signed'),'#16A866');sfx('coin');after();return;}
   S.offers=S.offers.filter(x=>x!==o);S.biz.push(customer);
   floater(CITY[o.city].x,CITY[o.city].y-30,tr('common.signed'),'#16A866');sfx('coin');after();},
 decline:({id})=>{S.offers=S.offers.filter(x=>x.id!==id);after();},
 dropBiz:({id})=>{const b0=S.biz.find(x=>x.id===id);if(!b0)return;if(BIZ_T[b0.type].event&&S.day>=b0.start){toast(tr('customers.the_event_is_already_running_the'),'bad');sfx('err');return;}if(UI.confirm!==id){UI.confirm=id;renderPanel();return;}S.biz=S.biz.filter(b=>b.id!==id);UI.confirm=null;after();},
});
