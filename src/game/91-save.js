/* ================= SAVE ================= */
function save(){if(!S||S.lost)return;S.uiSpeed=UI.speed;S.cam={x:cam.x,y:cam.y,z:cam.z};try{localStorage.setItem('sot-save-v1',JSON.stringify(S));}catch(e){}UI.lastSave=performance.now();}
// Save whenever the player might be leaving: tab hidden, page closing or reloading.
addEventListener('pagehide',()=>save());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){save();cloudTick();}else{checkUpdate();cloudPull();}});
/* Export / import: move a network to another device or keep a backup. The file is the same
   object the autosave writes, wrapped with a little metadata. */
function saveFileName(){const d=new Date().toISOString().slice(0,10),n=(S&&S.name||'network').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'network';return `series-of-tubes-${n}-${d}.json`;}
function exportSave(){if(!S)return;save();const blob=new Blob([JSON.stringify({app:'series-of-tubes',version:APP_VERSION,exported:new Date().toISOString(),S},null,1)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=saveFileName();document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
  toast(tr('save.save_exported_file_is_in_your',{file:esc(saveFileName())}),'good');}
function parseSave(txt){if(typeof txt!=='string')return {err:tr('save.that_file_is_not_valid_json')};let j;try{j=JSON.parse(txt);}catch(e){return {err:tr('save.that_file_is_not_valid_json')};}
  const s=j&&j.app==='series-of-tubes'&&j.S?j.S:j;
  if(!s||typeof s!=='object'||s.v!==1||typeof s.day!=='number'||typeof s.cash!=='number'||!s.pops||typeof s.pops!=='object'||!Array.isArray(s.links))return {err:tr('save.that_does_not_look_like_a')};
  if(s.lost)return {err:tr('save.that_network_went_bankrupt_it_cannot')};
  for(const c of Object.keys(s.pops))if(!isCity(c))return {err:tr('save.that_save_has_a_pop_in',{city:esc(String(c).slice(0,12))})};
  return {s,ver:j.version||'?',name:String(s.name||tr('common.unnamed_network'))};}
function importFile(file){if(!file)return;if(file.size>8e6){toast(tr('save.that_file_is_too_big_to'),'bad');return;}
  const rd=new FileReader();rd.onload=()=>{const r=parseSave(String(rd.result));if(r.err){toast(tr('save.import_failed_err',{err:esc(r.err)}),'bad');sfx('err');return;}
    UI.importing=r.s;openModal(`<div class="eyebrow">${tr('common.import_a_save')}</div><h2 style="font-size:26px">${tr('save.load_name',{name:esc(r.name)})}</h2><p class="tagline">${esc(dateStr(r.s.day))} · ${tr('save.cash_in_the_bank',{cash:fmt$(r.s.cash)})} · ${trn('save.n_pop',Object.keys(r.s.pops).length)} · ${tr('save.saved_by_v_ver',{ver:esc(r.ver)})}</p>${S&&UI.started&&!S.lost?`<p class="note" style="color:var(--bad)">${tr('save.this_replaces_name_export_it_first',{name:esc(S.name)})}</p>`:''}<div class="btns">${btn(tr('save.load_this_network'),'importGo',{},'pink big')}${btn(tr('common.cancel'),UI.started?'closeModal':'helpClose',{},'ghost big')}</div>`);};
  rd.readAsText(file);}
function loadSave(){try{const t=localStorage.getItem('sot-save-v1');if(t){const s=JSON.parse(t);if(s&&s.v===1&&!s.lost)return s;}}catch(e){}return null;}
// Swap in a whole network (an imported file or the cloud copy). On failure the current game is untouched.
function adoptSave(s0){const prev=S;try{S=migrate(JSON.parse(JSON.stringify(s0)));compute();checkGoals();renderAll();}catch(e){S=prev;if(S)compute();renderAll();return false;}
  UI.confirm=null;$('bankBox').hidden=true;$('dash').hidden=true;UI.started=true;UI.sel=null;UI.speed=S.uiSpeed===undefined?1:S.uiSpeed;if(S.cam&&isFinite(S.cam.x))Object.assign(cam,S.cam);else{const h=CITY[S.home];if(h){cam.x=h.x;cam.y=h.y;}}closeModal();$('modal').hidden=true;compute();renderAll();save();return true;}

/* ================= CLOUD SYNC =================
   Opt-in: with a username and password the same save also lives on our server, so a network moves
   between devices. The local save and export/import work exactly as before. The server keeps a revision
   number and refuses a push based on an older one, so when two devices both played, the player picks. */
const SYNC_API='/api',SYNC_MS=60000;
let CL=(()=>{try{const j=JSON.parse(localStorage.getItem('sot-cloud')||'null');return j&&typeof j.u==='string'&&typeof j.t==='string'?{u:j.u.slice(0,32),t:j.t,rev:Math.max(0,j.rev|0),h:typeof j.h==='string'?j.h:'',at:typeof j.at==='string'?j.at:''}:null;}catch(e){return null;}})();
const clKeep=()=>{try{if(CL)localStorage.setItem('sot-cloud',JSON.stringify(CL));else localStorage.removeItem('sot-cloud');}catch(e){}};
const clLocal=()=>!!(S&&UI.started&&!S.lost);
// Fingerprint of a network without the camera and speed, which change all the time but are not progress.
function clHash(s){const {cam,uiSpeed,...r}=s;const t=JSON.stringify(r);let h=0x811c9dc5;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36)+'.'+t.length;}
const clDirty=()=>clLocal()&&clHash(S)!==CL.h;
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
  CL={u:String(r.j.user).slice(0,32),t:String(r.j.token),rev:0,h:'',at:''};clKeep();track('cloud_'+kind);
  toast(tr('save.cloud_sync_is_on_your_network'),'good');sfx('coin');
  await cloudPull();refreshCloud();}
// Bring this device up to date (take: load the cloud copy whatever happens): same revision → push if we played; newer in the cloud → load it, or ask if we played too.
async function cloudPull(take){if(!CL||UI.clBusy||UI.clConf)return;UI.clBusy=true;let r;
  try{r=await clApi('GET','/save?have='+(take?-1:CL.rev));}catch(e){r={st:0,j:{}};}UI.clBusy=false;if(!CL)return;
  if(r.st===401)return clLost();if(r.st!==200){UI.clErr=clMsg(r.st,r.j);return;}UI.clErr='';
  const j=r.j,rev=Math.max(0,j.rev|0);
  if(!j.save){CL.rev=rev;clKeep();if(clDirty())await cloudPush();return;}
  const p=parseSave(JSON.stringify(j.save));if(p.err){UI.clErr=p.err;return;}
  if(take||!clLocal()||clHash(p.s)===clHash(S)||!clDirty())return cloudAdopt(p.s,rev,j.at);
  cloudConflict(j);}
function cloudAdopt(s,rev,at){const local=clLocal();if(!adoptSave(s)){UI.clErr=tr('save.the_cloud_save_is_damaged_and');return;}
  toast(local?tr('save.loaded_from_the_cloud_name_carries',{name:esc(S.name),date:dateStr(S.day)}):tr('save.welcome_back_name_loaded_from_the',{name:esc(S.name)}),'good');
  CL.rev=rev;CL.at=typeof at==='string'?at:'';CL.h=clHash(S);clKeep();} // after the toast, which lands in the network's log
// base: the revision this push replaces; a newer one in the cloud is refused unless the player chose to overwrite it.
async function cloudPush(base){if(!CL||UI.clBusy||!clLocal())return;UI.clBusy=true;const h=clHash(S);let r;
  try{r=await clApi('PUT','/save',{base:base===undefined?CL.rev:base,save:S});}catch(e){r={st:0,j:{}};}UI.clBusy=false;if(!CL)return;
  if(r.st===200){CL.rev=r.j.rev|0;CL.at=String(r.j.at||'');CL.h=h;UI.clErr='';clKeep();return;}
  if(r.st===401)return clLost();if(r.st===409)return cloudConflict(r.j);UI.clErr=clMsg(r.st,r.j);}
const cloudTick=()=>{if(CL&&!UI.clConf&&clDirty())cloudPush();};
function cloudConflict(j){const m=j.meta||{},side=(lab,name,day,cash)=>`<div class="kv"><span>${lab}</span><b>${esc(name)} · ${esc(dateStr(Math.max(0,day|0)))} · ${tr('save.cash_in_the_bank',{cash:fmt$(+cash||0)})}</b></div>`;
  UI.clConf={rev:Math.max(0,j.rev|0)};UI.clOpen=false;
  openModal(`<div class="eyebrow">${tr('common.cloud_sync')}</div><h2 style="font-size:26px">${tr('save.two_versions_of_your_network')}</h2><p class="tagline">${tr('save.this_device_and_the_cloud_both')}</p>
  ${side(tr('common.this_device'),S.name,S.day,S.cash)}${side(tr('common.cloud'),String(m.name||''),m.day,m.cash)}<div class="btns" style="margin-top:12px">${btn(tr('save.keep_this_device'),'clKeepLocal',{},'pink big')}${btn(tr('save.load_the_cloud_save'),'clTakeCloud',{},'ghost big')}</div>`);}
function cloudModal(){return `<div style="display:flex;align-items:center"><h2 style="font-size:26px">☁️ ${tr('common.cloud_sync')}</h2><button class="x" data-act="cloudClose" aria-label="${tr('common.close')}">×</button></div>${cloudHtml()}<div class="btns" style="margin-top:12px">${btn(tr('common.done_8dd3'),'cloudClose',{},'pink')}</div>`;}
const refreshCloud=()=>{if(UI.clOpen)openModal(cloudModal());};
async function cloudProbe(){if(UI.clOk!==undefined)return;UI.clOk=null;let ok=false;try{const r=await fetch(SYNC_API+'/health',{cache:'no-store'});ok=r.ok&&!!(await r.json()).ok;}catch(e){}UI.clOk=ok;refreshCloud();}
function cloudHtml(){let h='';const err=UI.clErr?`<p class="note" style="color:var(--bad);margin:6px 0">${esc(UI.clErr)}</p>`:'';
  if(CL){h+=`<p class="meta" style="margin:0 0 6px">${tr('save.signed_in_as_user',{user:esc(CL.u)})} ${CL.at&&isFinite(Date.parse(CL.at))?tr('save.last_synced_time',{time:esc(new Date(CL.at).toLocaleString(LANG))}):tr('save.not_synced_yet')}</p>${err}`;
    if(UI.clDel)return h+`<p class="meta" style="margin:0 0 6px">${tr('save.your_account_and_the_network_saved')}</p><input class="t" id="clDelPass" type="password" maxlength="200" autocomplete="current-password" aria-label="${tr('common.password')}"><div class="btns" style="margin-top:8px">${btn(tr('save.delete_cloud_account'),'cloudDel',{},'red sm',UI.clBusy)}${btn(tr('common.cancel'),'cloudDelAsk',{off:1},'ghost sm')}</div>`;
    return h+`<div class="btns">${btn(tr('common.sync_now'),'cloudSync',{},'ghost sm',UI.clBusy)}${btn(tr('common.log_out'),'cloudLogout',{},'ghost sm')}${btn(tr('save.delete_cloud_account'),'cloudDelAsk',{},'ghost sm')}</div>`;}
  if(UI.clOk===false)return h+`<p class="meta" style="margin:0 0 6px">${tr('save.cloud_sync_is_not_available_on')}</p>`;
  return h+`<p class="meta" style="margin:0 0 6px">${tr('save.optional_with_an_account_your')}</p>
  <label class="f" for="clUser">${tr('common.username')}</label><input class="t" id="clUser" maxlength="32" autocomplete="username" autocapitalize="none" spellcheck="false" value="${esc(UI.clUser||'')}"><label class="f" for="clPass">${tr('common.password')}</label><input class="t" id="clPass" type="password" maxlength="200" autocomplete="current-password">${err}
  <div class="btns" style="margin-top:8px">${btn(tr('common.log_in'),'cloudLogin',{},'pink sm',UI.clBusy)}${btn(tr('common.create_account'),'cloudLogin',{reg:1},'ghost sm',UI.clBusy)}</div>`;}

