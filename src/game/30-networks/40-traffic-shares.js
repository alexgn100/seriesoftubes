const NET=Object.fromEntries(NETS.map(n=>[n.id,n])),NET_IDS=NETS.map(n=>n.id);
// The networks a PNI with each upstream reaches: the upstream itself plus everyone who buys transit from it.
const PNI_NETS={};for(const n of NETS)PNI_NETS[n.id]=[n.id].concat(NETS.filter(x=>x.up&&x.up.includes(n.id)).map(x=>x.id));
for(const X of XIX){X.members=NETS.filter(n=>Array.isArray(n.ix)&&n.ix.includes(X.id)||!n.tail&&(X.core?X.core.includes(n.id):(n.ix==='ALL'||Array.isArray(n.ix)&&n.ix.includes(X.c))&&hstr(n.id+'|'+X.id)%100<(n.ix==='ALL'?72:X.take*100))).map(n=>n.id);}
const NSH={}; {const t=NETS.reduce((a,n)=>a+n.share,0); NETS.forEach(n=>NSH[n.id]=n.share/t);}
// After Glitch leaves Korea, Seoul viewers watch half as much of it and the rest moves to everyone else.
const NSH_KRX={}; {const w=id=>NSH[id]*(id==='amz'?0.5:1),t=NETS.reduce((a,n)=>a+w(n.id),0); NETS.forEach(n=>NSH_KRX[n.id]=w(n.id)/t);}
const CN_W={ctc:.2,cun:.14,cmb:.08,tcs:.22,abc:.14,byd:.08,bdc:.08,akm:.02,msf:.02,amz:.01,drz:.01};
const RU_W={ydx:.24,vkl:.12,rtc:.14,ggl:.12,bdc:.08,akm:.05,cfl:.06,msf:.04,amz:.03,tly:.02,cog:.02,drz:.01};
const NSH_RU={}; {const t=Object.values(RU_W).reduce((a,b)=>a+b,0); for(const k in RU_W)NSH_RU[k]=RU_W[k]/t;}
const NSH_CN={}; {const t=Object.values(CN_W).reduce((a,b)=>a+b,0); for(const k in CN_W)NSH_CN[k]=CN_W[k]/t;}
const CN_BLOCKED=NETS.filter(n=>!CN_W[n.id]&&n.type==='cdn').map(n=>n.name);
const TYPE_L={t1:tr('common.tier_1'),t2:tr('common.tier_2'),cdn:tr('common.cdn_content'),eye:tr('common.eyeballs')};
const initials=n=>n.name.replace(/[^A-Za-z ]/g,'').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,3).toUpperCase();

