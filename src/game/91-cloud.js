/* ================= CLOUD SYNC =================
   Opt-in: with a username and password one network also lives on our server, so it moves between devices. The local
   saves and export/import work exactly as before. The account holds one network, linked on each device to one of its
   slots (CL.slot): only that one is pushed and pulled, and only while it is open in this window, so the other networks
   on a device and puzzles never touch the cloud. On a device with no linked network, the cloud copy arrives as a new
   network next to the others, like an import. The server keeps a revision number and refuses a push based on an older
   one, so when two devices both played, the player picks. */
const SYNC_API='/api',SYNC_MS=60000;
let CL=(()=>{try{const j=JSON.parse(localStorage.getItem('sot-cloud')||'null');
  return j&&typeof j.u==='string'&&typeof j.t==='string'?{u:j.u.slice(0,32),t:j.t,rev:Math.max(0,j.rev|0),h:typeof j.h==='string'?j.h:'',at:typeof j.at==='string'?j.at:'',slot:typeof j.slot==='string'&&/^[a-z0-9]{1,24}$/.test(j.slot)?j.slot:null}:null;}catch(e){return null;}})();
const clKeep=()=>{try{if(CL)localStorage.setItem('sot-cloud',JSON.stringify(CL));else localStorage.removeItem('sot-cloud');}catch(e){}};
// A network is open in this window (puzzles never sync).
const clOpen=()=>!!(S&&UI.started&&!S.lost&&!pzOn()&&UI.slot);
// The linked network, while it still exists on this device.
const clSlot=()=>CL&&CL.slot&&slotIdx().some(e=>e.id===CL.slot)?CL.slot:null;
const clLocal=()=>!!CL&&clOpen()&&UI.slot===CL.slot;
const clLink=()=>{CL.slot=UI.slot;CL.h='';clKeep();};
const clName=()=>{const e=CL&&CL.slot&&slotIdx().find(x=>x.id===CL.slot);return e?e.name||tr('common.unnamed_network'):'';};
// Fingerprint of a network without the camera, speed, save stamp and event log, which change all the time (the log with
// every message, sync's own included) but are not progress.
function clHash(s){const {cam,uiSpeed,sv,log,...r}=s;const t=JSON.stringify(r);let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36)+'.'+t.length;}
const clDirty=()=>clLocal()&&clHash(S)!==CL.h;
// The cloud copy arrives packed (#176): compare it as it would load.
const clSame=s=>{try{return clHash(migrate(JSON.parse(JSON.stringify(s))))===clHash(S);}catch(e){return false;}};
async function clApi(method,path,body){const r=await fetch(SYNC_API+path,{method,cache:'no-store',headers:{'content-type':'application/json',...(CL?{authorization:'Bearer '+CL.t}:{})},body:body===undefined?undefined:JSON.stringify(body)});let j=null;try{j=await r.json();}catch(e){}return {st:r.status,j:j&&typeof j==='object'?j:{}};}
function clMsg(st,j){const e=j.err;
  if(e==='wrong')return tr('save.wrong_username_or_password');if(e==='taken')return tr('save.that_username_is_taken');
  if(e==='bad_user')return tr('save.usernames_are_3_to_32_letters');if(e==='bad_pass')return tr('save.passwords_need_at_least_8_characters');
  if(e==='limit')return tr('save.too_many_tries_wait_a_few');return tr('save.the_cloud_server_did_not_answer');}
// A revoked or deleted login: forget it here, keep the game.
function clLost(){CL=null;clKeep();toast(tr('save.your_cloud_login_ended_your_game'),'bad');refreshCloud();}
async function cloudAuth(kind,u,p){u=String(u||'').trim();p=String(p||'');UI.clUser=u;UI.clErr='';
  if(!/^[A-Za-z0-9._-]{3,32}$/.test(u))UI.clErr=clMsg(400,{err:'bad_user'});else if(kind==='register'&&p.length<8)UI.clErr=clMsg(400,{err:'bad_pass'});
  if(UI.clErr||UI.clBusy){refreshCloud();return;}
  UI.clBusy=true;refreshCloud();let r;try{CL=null;r=await clApi('POST','/'+kind,{user:u,pass:p});}catch(e){r={st:0,j:{}};}UI.clBusy=false;
  if(r.st!==200&&r.st!==201){UI.clErr=clMsg(r.st,r.j);refreshCloud();return;}
  CL={u:String(r.j.user).slice(0,32),t:String(r.j.token),rev:0,h:'',at:'',slot:null};clKeep();track('cloud_'+kind);
  toast(tr('save.cloud_sync_is_on_your_network'),'good');sfx('coin');
  await cloudPull('go');refreshCloud();}
/* Bring the linked network up to date. how: undefined in the background, 'go' when the player asked (it may link the open
   network, or bring the cloud copy in as a new one), 'take' to load the cloud copy over the linked network whatever happens.
   Linked and open: same revision → push if we played; newer in the cloud → load it, or ask if we played too. */
async function cloudPull(how){if(!CL||UI.clBusy||UI.clConf)return;const here=clLocal(),mine=clSlot();
  if(!how&&!here&&mine)return;// the linked network syncs when it is opened again
  UI.clBusy=true;let r;
  try{r=await clApi('GET','/save?have='+(how==='take'||how&&!here?-1:CL.rev));}catch(e){r={st:0,j:{}};}UI.clBusy=false;if(!CL)return;
  if(r.st===401)return clLost();if(r.st!==200){UI.clErr=clMsg(r.st,r.j);return;}UI.clErr='';
  const j=r.j,rev=Math.max(0,j.rev|0);
  if(!j.save){if(rev===0&&!mine&&clOpen())clLink();// an empty cloud takes the network being played
    if(clLocal()){CL.rev=rev;clKeep();if(clDirty())await cloudPush();}return;}
  const p=parseSave(JSON.stringify(j.save));if(p.err){UI.clErr=p.err;return;}
  if(here){if(how==='take'||!clDirty()||clSame(p.s))return cloudAdopt(p.s,rev,j.at,false);return cloudConflict(j);}
  if(mine){if(how)slotOpen(mine,false);return;}// Sync now from another network: go to the linked one, which pulls as it opens
  // Nothing linked here yet: the open network if it is the same one (logged in again), else the cloud copy as a new network.
  if(clOpen()&&clSame(p.s)){clLink();CL.rev=rev;CL.at=typeof j.at==='string'?j.at:'';CL.h=clHash(S);clKeep();return;}
  if(how)cloudAdopt(p.s,rev,j.at,true);else{CL.rev=rev;clKeep();}}// seen: the background asks again only when it changes
/* Swap in the cloud copy: over the linked network (fresh: as a new network next to the others, the one playing here kept and
   saved, like an import). On failure the current game is untouched. */
function adoptSave(s0,fresh){let nx;try{nx=migrate(JSON.parse(JSON.stringify(s0)));}catch(e){return false;}delete nx.sv;
  if(fresh&&pzOn())pzLeave();const was=S;
  try{S=nx;compute();checkGoals();}catch(e){S=was;if(S)compute();renderAll();return false;}
  if(fresh){const im=S;S=was;slotLeave();S=im;slotNew();}
  UI.confirm=null;$('bankBox').hidden=true;$('dash').hidden=true;UI.started=true;UI.sel=null;UI.speed=[0,0.5,1,2,4,8].includes(S.uiSpeed)?S.uiSpeed:1;
  if(S.cam&&isFinite(S.cam.x))Object.assign(cam,S.cam);else{const h=CITY[S.home];if(h){cam.x=h.x;cam.y=h.y;}}
  closeModal();$('modal').hidden=true;compute();renderAll();save(true);return true;}
function cloudAdopt(s,rev,at,fresh){const local=clLocal();if(!adoptSave(s,fresh)){UI.clErr=tr('save.the_cloud_save_is_damaged_and');return;}
  if(fresh)CL.slot=UI.slot;
  toast(local?tr('save.loaded_from_the_cloud_name_carries',{name:esc(S.name),date:dateStr(S.day)}):tr('save.welcome_back_name_loaded_from_the',{name:esc(S.name)}),'good');
  CL.rev=rev;CL.at=typeof at==='string'?at:'';CL.h=clHash(S);clKeep();} // after the toast, which lands in the network's log
// base: the revision this push replaces; a newer one in the cloud is refused unless the player chose to overwrite it.
async function cloudPush(base){if(!CL||UI.clBusy||!clLocal())return;UI.clBusy=true;const h=clHash(S);let r;
  try{r=await clApi('PUT','/save',{base:base===undefined?CL.rev:base,save:packSave(S)});}catch(e){r={st:0,j:{}};}UI.clBusy=false;if(!CL)return;
  if(r.st===200){CL.rev=r.j.rev|0;CL.at=String(r.j.at||'');CL.h=h;UI.clErr='';clKeep();return;}
  if(r.st===401)return clLost();if(r.st===409)return cloudConflict(r.j);UI.clErr=clMsg(r.st,r.j);}
const cloudTick=()=>{if(CL&&!UI.clConf&&clDirty())cloudPush();};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')cloudTick();else cloudPull();});
function cloudConflict(j){const m=j.meta||{},side=(lab,name,day,cash)=>`<div class="kv"><span>${lab}</span><b>${esc(name)} · ${esc(dateStr(Math.max(0,day|0)))} · ${tr('save.cash_in_the_bank',{cash:fmt$(+cash||0)})}</b></div>`;
  UI.clConf={rev:Math.max(0,j.rev|0)};UI.clOpen=false;
  openModal(`<div class="eyebrow">${tr('common.cloud_sync')}</div><h2 style="font-size:26px">${tr('save.two_versions_of_your_network')}</h2><p class="tagline">${tr('save.this_device_and_the_cloud_both')}</p>
  ${side(tr('common.this_device'),S.name,S.day,S.cash)}${side(tr('common.cloud'),String(m.name||''),m.day,m.cash)}<div class="btns" style="margin-top:12px">${btn(tr('save.keep_this_device'),'clKeepLocal',{},'pink big')}${btn(tr('save.load_the_cloud_save'),'clTakeCloud',{},'ghost big')}</div>`);}
function cloudModal(){return `<div style="display:flex;align-items:center"><h2 style="font-size:26px">☁️ ${tr('common.cloud_sync')}</h2><button class="x" data-act="cloudClose" aria-label="${tr('common.close')}">×</button></div>${cloudHtml()}<div class="btns" style="margin-top:12px">${btn(tr('common.done_8dd3'),'cloudClose',{},'pink')}</div>`;}
const refreshCloud=()=>{if(UI.clOpen)openModal(cloudModal());};
async function cloudProbe(){if(UI.clOk!==undefined)return;UI.clOk=null;let ok=false;try{const r=await fetch(SYNC_API+'/health',{cache:'no-store'});ok=r.ok&&!!(await r.json()).ok;}catch(e){}UI.clOk=ok;refreshCloud();}
function cloudHtml(){let h='';const err=UI.clErr?`<p class="note" style="color:var(--bad);margin:6px 0">${esc(UI.clErr)}</p>`:'';
  if(CL){const mine=clSlot();
    h+=`<p class="meta" style="margin:0 0 6px">${tr('save.signed_in_as_user',{user:esc(CL.u)})} ${CL.at&&isFinite(Date.parse(CL.at))?tr('save.last_synced_time',{time:esc(new Date(CL.at).toLocaleString(LANG))}):tr('save.not_synced_yet')}</p>
    <p class="meta" style="margin:0 0 6px">${!mine?tr('save.no_network_on_this_device_is'):clLocal()?tr('save.cloud_sync_keeps_name_in_step',{name:esc(clName())}):tr('save.cloud_sync_keeps_name_open_it',{name:esc(clName())})}</p>${err}`;
    if(UI.clDel)return h+`<p class="meta" style="margin:0 0 6px">${tr('save.your_account_and_the_network_saved')}</p><input class="t" id="clDelPass" type="password" maxlength="200" autocomplete="current-password" aria-label="${tr('common.password')}"><div class="btns" style="margin-top:8px">${btn(tr('save.delete_cloud_account'),'cloudDel',{},'red sm',UI.clBusy)}${btn(tr('common.cancel'),'cloudDelAsk',{off:1},'ghost sm')}</div>`;
    return h+`<div class="btns">${btn(tr('common.sync_now'),'cloudSync',{},'ghost sm',UI.clBusy)}${btn(tr('common.log_out'),'cloudLogout',{},'ghost sm')}${btn(tr('save.delete_cloud_account'),'cloudDelAsk',{},'ghost sm')}</div>`;}
  if(UI.clOk===false)return h+`<p class="meta" style="margin:0 0 6px">${tr('save.cloud_sync_is_not_available_on')}</p>`;
  return h+`<p class="meta" style="margin:0 0 6px">${tr('save.optional_with_an_account_your')}</p>
  <label class="f" for="clUser">${tr('common.username')}</label><input class="t" id="clUser" maxlength="32" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(UI.clUser||'')}"><label class="f" for="clPass">${tr('common.password')}</label><input class="t" id="clPass" type="password" maxlength="200" autocomplete="current-password">${err}
  <div class="btns" style="margin-top:8px">${btn(tr('common.log_in'),'cloudLogin',{},'pink sm',UI.clBusy)}${btn(tr('common.create_account'),'cloudLogin',{reg:1},'ghost sm',UI.clBusy)}</div>`;}
