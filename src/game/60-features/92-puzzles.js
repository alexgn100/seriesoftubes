/* ================= PUZZLES (#190) =================
   Small, calm builds: connect a few cities, earn up to three stars. A puzzle runs as its own S (S.mode='puzzle'):
   no clock, no bills, no incidents, links up at once. That S is never saved. Only progress (stars and best spend per
   puzzle, weekly results and the weekly streak) is kept, under its own key, so the main save is never touched. */
const PZ_KEY='sot-puzzles',PZ_YEAR=12;
const pzOn=()=>!!(S&&S.mode==='puzzle'&&S.pz);
const pzDef=id=>PZ.find(p=>p.id===id)||null;
const pzKind=c=>!pzOn()?null:S.pz.cities.includes(c)?'goal':S.pz.via.includes(c)?'via':S.pz.avoid.includes(c)?'avoid':null;
const pzName=d=>d.id==='weekly'?tr('puzzles.weekly_puzzle_key',{key:d.key}):d.n;
const pzStarStr=n=>'⭐'.repeat(n)+'⬜'.repeat(3-n);
// ---------- progress (localStorage, never trusted) ----------
function pzClean(j){const o={s:{},wk:{},streak:{last:null,n:0,best:0}};if(!j||typeof j!=='object')return o;
  const rec=r=>r&&typeof r==='object'?{st:int(r.st,0,3,0),sp:r.sp==null||!isFinite(+r.sp)||+r.sp<0?null:Math.round(+r.sp)}:null;
  if(j.s&&typeof j.s==='object')for(const k of Object.keys(j.s)){const r=rec(j.s[k]);if(pzDef(k)&&r)o.s[k]=r;}
  if(j.wk&&typeof j.wk==='object')for(const k of Object.keys(j.wk)){const r=rec(j.wk[k]);if(/^\d{4}-W\d{2}$/.test(k)&&r)o.wk[k]=r;}
  const st=j.streak;if(st&&typeof st==='object'){o.streak.last=typeof st.last==='string'&&/^\d{4}-W\d{2}$/.test(st.last)?st.last:null;o.streak.n=int(st.n,0,9999,0);o.streak.best=int(st.best,0,9999,0);}
  return o;}
function pzLoad(){try{return pzClean(JSON.parse(localStorage.getItem(PZ_KEY)||'{}'));}catch(e){return pzClean(null);}}
function pzStore(p){try{localStorage.setItem(PZ_KEY,JSON.stringify(p));}catch(e){}}
const pzStarsTotal=p=>PZ.reduce((a,x)=>a+((p.s[x.id]||{}).st|0),0);
const pzPackOpen=(k,p)=>{const P=PZ_PACKS.find(x=>x.id===k);return !!P&&pzStarsTotal(p||pzLoad())>=P.need;};
// ---------- prices: the real game's waves, on day 0, for a year ----------
const pzMood=(a,b,sub)=>{const k=waveMarket(a,b,sub);return k.m/k.ero;};
// Overland (when the two cities share a landmass) and every cable between them, each with its price factor and latency.
function pzRoutes(a,b){const out=[],sub=isSub(a,b);
  if(!sub){const km=kmBetween(a,b);out.push({via:'land',cab:null,km,sub:false,f:landMult(a,b)*pzMood(a,b,false),ms:km*1.3/200});}
  for(const c of cablesFor(a,b))if(!out.some(r=>r.via===c.cid))out.push({via:c.cid,cab:c.cid,km:c.km,sub:true,f:CAB[c.cid].price*pzMood(a,b,true),ms:c.km*(CAB[c.cid].lat||1)/200});
  return out;}
const pzMo=(r,tier,div)=>Math.round(waveMo(r.km,r.sub,tier)*r.f*(div?DIVERSE:1));
const pzLinkCost=(r,tier,div)=>pzMo(r,tier,div)*PZ_YEAR;// leased waves have no setup fee: a year of rent
const pzPopCost=c=>popCost(c)+PZ_YEAR*POP_MO;
const PZ_TIERS=[0,1,2];
function pzSpend(){let s=0;for(const c in S.pops)s+=pzPopCost(c);for(const l of S.links)s+=l.mo*PZ_YEAR;return s;}
// What one backhoe or one anchor takes out: waves in the same trench, or on the same cable between the same cities.
const pzUnit=l=>l.cable?'cab:'+l.cable+':'+edgeKey(l):String(l.trench||l.id);
// ---------- checks ----------
function pzComp(ls,skip,from){const adj={};for(const l of ls){if(skip&&pzUnit(l)===skip)continue;(adj[l.a]=adj[l.a]||[]).push(l.b);(adj[l.b]=adj[l.b]||[]).push(l.a);}
  const seen=new Set([from]),q=[from];while(q.length){const u=q.pop();for(const v of adj[u]||[])if(!seen.has(v)){seen.add(v);q.push(v);}}return seen;}
function pzRingOk(ls){const nb={};for(const l of ls){(nb[l.a]=nb[l.a]||new Set()).add(l.b);(nb[l.b]=nb[l.b]||new Set()).add(l.a);}
  const ns=Object.keys(nb);if(ns.length<3||!S.pz.cities.every(c=>nb[c])||!Object.keys(S.pops).every(c=>nb[c])||!ns.every(c=>nb[c].size===2))return false;
  let prev=null,cur=ns[0],n=0;do{const nx=[...nb[cur]].find(x=>x!==prev);prev=cur;cur=nx;n++;}while(cur!==ns[0]&&n<=ns.length);return cur===ns[0]&&n===ns.length;}
function pzEval(){const P=S.pz,ls=S.links,cs=P.cities,spend=pzSpend();
  // The checklist ticks the goal cities that are already joined up: the group holding the most of them.
  let best=new Set();for(const c of cs){if(!S.pops[c]||best.has(c))continue;const g=pzComp(ls,null,c);if(cs.filter(x=>g.has(x)).length>cs.filter(x=>best.has(x)).length)best=g;}
  const joined=cs.filter(c=>best.has(c)).length>=2?best:new Set();
  const marks=cs.map(c=>({c,st:joined.has(c)?2:S.pops[c]?1:0}));
  const conn=cs.every(c=>joined.has(c));
  const tw=[];if(P.noSub)tw.push({k:'sub',ok:!S.links.some(l=>l.sub)});
  if(P.ring)tw.push({k:'ring',ok:pzRingOk(ls)});
  if(P.lat){const ms=S.pops[P.lat[0]]&&S.pops[P.lat[1]]?bestLat(P.lat[0],P.lat[1]):Infinity;tw.push({k:'lat',ok:ms<=P.lat[2],ms});}
  if(P.minG)tw.push({k:'g',ok:ls.every(l=>LT[l.tier].g>=P.minG)});
  if(P.avoid.length)tw.push({k:'avoid',ok:P.avoid.every(c=>!S.pops[c])});
  const goal=conn&&tw.every(t=>t.ok),units=[...new Set(ls.map(pzUnit))];
  // N-1: the goal cities stay joined whichever single trench or cable segment is cut.
  const weak=conn?units.filter(u=>{const g=pzComp(ls,u,cs[0]);return !cs.every(c=>g.has(c));}):[];
  const n1=conn&&units.length>0&&!weak.length,cheap=!P.budget||spend<=P.budget;
  return {marks,conn,tw,goal,spend,cheap,n1,weak,stars:goal?1+(cheap?1:0)+(n1?1:0):0};}
// ---------- the weekly puzzle: the same for everyone, seeded by the ISO week like the weekly challenge ----------
function pzWeekKey(dt){const {y,w}=isoWeek(dt);return `${y}-W${String(w).padStart(2,'0')}`;}
function pzPrevKey(key){const m=/^(\d{4})-W(\d{2})$/.exec(key);if(!m)return null;return pzWeekKey(new Date(+m[1],0,4+(+m[2]-2)*7));}
function pzWeekly(dt){const key=pzWeekKey(dt||new Date());let r=hstr('puzzle|'+key)||1;const nx=()=>{r=(Math.imul(r,1103515245)+12345)>>>0;return r/4294967296;};
  const pool=PZ_WEEK_POOLS[Math.floor(nx()*PZ_WEEK_POOLS.length)].slice(),n=4+Math.floor(nx()*2),cities=[];
  while(cities.length<n&&pool.length)cities.push(pool.splice(Math.floor(nx()*pool.length),1)[0]);
  // The budget is a ring through the cities, nearest first, on the cheapest 10G route of each hop, plus 10%:
  // a ring survives any single cut, so three stars are always possible.
  const ring=[cities[0]],left=cities.slice(1);while(left.length){const u=ring[ring.length-1];left.sort((a,b)=>kmBetween(u,a)-kmBetween(u,b));ring.push(left.shift());}
  let cost=cities.reduce((a,c)=>a+pzPopCost(c),0);for(let i=0;i<ring.length;i++)cost+=Math.min(...pzRoutes(ring[i],ring[(i+1)%ring.length]).map(x=>pzLinkCost(x,0,false)));
  return {id:'weekly',key,cities,via:[],budget:Math.ceil(cost*1.1/10000)*10000,ref:ring};}
function pzStreak(p,key){const st=p.streak;if(st.last===key)return;st.n=st.last&&st.last===pzPrevKey(key)?st.n+1:1;st.last=key;st.best=Math.max(st.best,st.n);}
function pzShareText(e){const P=S.pz;return tr('puzzles.share_line',{what:P.id==='weekly'?P.key:pzName(pzDef(P.id)),stars:pzStarStr(e.stars),spend:fmt$(e.spend)});}
// ---------- entering and leaving ----------
// The running game gets its usual save first, so leaving the puzzle can load it back exactly as booting does. A huge
// save is compressed in the background and may not have landed yet, so the game object is kept in memory too.
function pzFlush(){save(true);UI.pzKeep=UI.gzBusy||saveFailing()?S:null;}
function pzBegin(def){if(!def)return;
  const go=()=>{newGame(pzName(def),def.cities[0]);S.pops={};S.mode='puzzle';S.nextFail=S.nextEvent=1e9;S.tut=null;
    S.pz={id:def.id,key:def.key||null,cities:def.cities.slice(),via:(def.via||[]).slice(),avoid:(def.avoid||[]).slice(),budget:def.budget||0,noSub:!!def.noSub,ring:!!def.ring,minG:def.minG||0,lat:def.lat?def.lat.slice():null};
    UI.pzHist=[];UI.pzTop=0;UI.speed=0;UI.resumeSpeed=null;UI.started=true;UI.sel=null;UI.leftOpen=false;UI.confirm=null;UI._pzh=null;
    $('dash').hidden=true;$('bankBox').hidden=true;closeModal();document.body.classList.add('pz');
    compute();pzCam();renderAll();track('puzzle_'+def.id);
    toast(`<b>${esc(pzName(def))}</b><br>${tr('puzzles.connect_list',{list:def.cities.map(c=>CITY[c].name).join(', ')})}`,'goal');};
  if(pzOn()){go();return;}
  const live=!!(S&&UI.started&&!S.lost);UI.pzFrom=live?'game':'title';
  if(live)pzFlush();go();}
function pzLeave(){const from=UI.pzFrom;document.body.classList.remove('pz');UI.sel=null;UI.pzHist=null;UI.pzFrom=null;closeModal();$('panel').hidden=true;$('pzBox').hidden=true;S=null;R=emptyR();UI.started=false;
  if(from==='game'){const sv=UI.pzKeep||loadSave();UI.pzKeep=null;
    if(sv){try{S=migrate(sv);compute();UI.started=true;UI.speed=[0,0.5,1,2,4,8].includes(S.uiSpeed)?S.uiSpeed:1;if(S.cam&&isFinite(S.cam.x))Object.assign(cam,S.cam);renderAll();return;}catch(e){S=null;UI.started=false;}}}
  renderAll();showTitle();}
// The camera frames the puzzle's cities, leaving room for the puzzle card (left on wide screens, a bottom sheet on phones).
function pzCam(){const cs=[...S.pz.cities,...S.pz.via].map(c=>CITY[c]),x0=cs[0].x;let a=Infinity,b=-Infinity,c=Infinity,d=-Infinity;
  for(const C of cs){const x=x0+wrapDx(x0,C.x);a=Math.min(a,x);b=Math.max(b,x);c=Math.min(c,C.y);d=Math.max(d,C.y);}
  const ph=isPhone(),pl=ph?0:330,pb=ph?Math.min(230,CH*0.4):0,aw=Math.max(120,CW-pl-90),ah=Math.max(120,CH-pb-150);
  cam.z=clamp(Math.min(aw/Math.max(40,b-a),ah/Math.max(40,d-c)),0.5,4);cam.x=(a+b)/2-pl/2/cam.z;cam.y=(c+d)/2+(pb/2-30)/cam.z;wrapCam();}
// ---------- building ----------
function pzSnap(){const h=UI.pzHist||(UI.pzHist=[]);h.push(JSON.stringify({p:S.pops,l:S.links}));if(h.length>60)h.shift();}
const pzNewPop=()=>({day:0,bb:null,boost:0,down:0,routers:1,gen:false});
function pzAfter(){if(UI.sel&&((UI.sel.type==='link'&&!S.links.some(l=>l.id===UI.sel.id))||(UI.sel.type==='city'&&!pzKind(UI.sel.id))))UI.sel=null;
  compute();renderAll();pzCheck();}
// Stars count the moment they are earned: a better result than this attempt has had opens the results card.
function pzCheck(){const e=pzEval();if(e.stars<=(UI.pzTop||0))return e;const prev=UI.pzTop||0;UI.pzTop=e.stars;pzRecord(e);pzResults(e,prev);return e;}
function pzRecord(e){const p=pzLoad(),P=S.pz,bag=P.id==='weekly'?p.wk:p.s,k=P.id==='weekly'?P.key:P.id,r=bag[k]||{st:0,sp:null};
  r.st=Math.max(r.st,e.stars);r.sp=r.sp==null?e.spend:Math.min(r.sp,e.spend);bag[k]=r;if(P.id==='weekly')pzStreak(p,P.key);pzStore(p);}
// The next puzzle in the list whose pack is open.
function pzNextDef(){const p=pzLoad(),i=PZ.findIndex(x=>x.id===S.pz.id);for(let j=i+1;j<PZ.length;j++)if(pzPackOpen(PZ[j].pack,p))return PZ[j];return null;}
