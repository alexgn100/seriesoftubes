/* ================= HELPERS ================= */
const fmt$=v=>{const a=Math.abs(v),s=v<0?'-':'';if(a>=1e6)return s+'$'+(a/1e6).toFixed(a>=1e7?1:2)+'M';if(a>=1e3)return s+'$'+(a/1e3).toFixed(a>=1e5?0:1)+'k';return s+'$'+Math.round(a);};
const fmtG=g=>g>=1000?(g/1000).toFixed(g>=10000?1:2)+' Tbps':(g>=100?g.toFixed(0):g.toFixed(1))+' Gbps';
const pct=x=>Math.round(x*100)+'%';
// Reach never rounds up to 100%: Tier 1 needs more than 99.9%, and 99.6% must not look like a full house (#73).
const reachPct=x=>x>0.999?'100%':x>=0.99?(Math.floor(x*1000)/10).toFixed(1)+'%':pct(x);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(Math.random()*a.length)];
// Names already given to customers, each once: only whether a name is in the list counts. Once every name had been
// used, the same names were added again every day (half a million entries, half of a late-game save).
const useName=n=>{if(!S.usedNames.includes(n))S.usedNames.push(n);};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dateStr(d){const y=1+Math.floor(d/360),m=Math.floor(d/30)%12,dd=d%30+1;return tr('helpers.y_y_mon_d',{y,mon:MONTHS[m],d:dd});}
function wrapDx(a,b){let dx=b-a;if(dx>W/2)dx-=W;if(dx<-W/2)dx+=W;return dx;}
function kmBetween(a,b){const A=CITY[a],B=CITY[b];return Math.max(20,Math.round(hav(A.lon,A.lat,B.lon,B.lat)));}
// Cities on a land bridge belong to two landmasses: Cairo reaches Asia overland across the Sinai, the way
// Istanbul does across the Bosporus (#47). Overland between continents still costs the intercontinental price.
const lands=C=>C.land2?[C.land,C.land2]:[C.land];
const isSub=(a,b)=>{const A=lands(CITY[a]),B=lands(CITY[b]);return !A.some(x=>B.includes(x));};
const popUp=c=>S.pops[c]&&!(S.pops[c].down>S.day);
const regionsCount=()=>new Set(Object.keys(S.pops).map(c=>CITY[c].reg)).size;
const ixCity=x=>String(x).split('~')[0];
function ixIdsIn(c){const o=ixStatic(c);if(S&&S.myIx&&S.myIx[c]&&!o.includes(c))o.unshift(c);return o;}
const hasIxAt=c=>ixIdsIn(c).some(x=>S.ixp[x]!==undefined);
function ixName(c){if(XIXM[c])return XIXM[c].name;return S.myIx[c]?S.myIx[c].name:CITY[c].ix;}
// IX.brrr Campinas already says where it is, so messages skip "in Campinas" (#134)
const ixNamesCity=c=>String(ixName(c)||'').toLowerCase().includes(CITY[ixCity(c)].name.toLowerCase());
