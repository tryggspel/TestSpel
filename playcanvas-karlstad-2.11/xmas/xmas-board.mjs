// JulRushen: topplistan och utmaningarna. Ren modul (ingen DOM, ingen PlayCanvas, inget nätverk).
//
// Topplistan bor på enheten: den visar dina egna bästa resultat och dina vänners. Vänner kommer in via utmaningslänkar. En länk bär en liten profil (namn, bästa poäng i varje
// rush, stjärnor) och ofta en utmaning ("slå mina 3 120 poäng i rush 4"). När någon öppnar länken sparas avsändaren i vänlistan och utmaningen visas. Ingen server och inga
// personuppgifter lämnar enheten: namnet är ett smeknamn man själv skriver, och det som delas är det man själv väljer att skicka.
// En delad topplista för alla spelare kräver lagring i molnet och är en egen sak (se JULVERSION.md).
//
// Länkens innehåll är text som går att skriva för hand, så den kontrolleras noga när den läses: format, längd, tal inom gränser, kontrollsumma. Ett trasigt eller manipulerat
// värde ger null (aldrig ett fel) och allt som visas skrivs med textContent.
import {RUSH_COUNT,RUSH_MAX} from './xmas-rushes.mjs?v=2.21.1-xmas.5';

export const NAME_MAX=12,FRIENDS_MAX=30,MAX_POINTS=9999999;
const TOKEN_RE=/^[A-Za-z0-9_-]{16,420}$/;
const num=(v,max)=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;};

// Smeknamn: bokstäver, siffror, mellanslag, punkt, understreck och bindestreck. Högst tolv tecken. Tomt eller bara skräp ger ''.
export function cleanName(v){
  let s=String(v??'').normalize('NFC').replace(/[^\p{L}\p{N} ._-]/gu,'').replace(/\s+/g,' ').trim();
  s=Array.from(s).slice(0,NAME_MAX).join('').trim();
  return s;
}
export const nameId=name=>cleanName(name).toLocaleLowerCase('sv-SE').replace(/[^\p{L}\p{N}]/gu,'')||'';

const hash=text=>{let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
const toB64=s=>{const bytes=new TextEncoder().encode(s);let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const fromB64=t=>{const b=t.replace(/-/g,'+').replace(/_/g,'/'),bin=atob(b+'='.repeat((4-b.length%4)%4)),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new TextDecoder('utf-8',{fatal:true}).decode(bytes);};

// En profil: {name, cleared, stars, bests:{n:poäng}, at}. Rensar och begränsar allt.
export function cleanProfile(raw){
  if(!raw||typeof raw!=='object')return null;
  const name=cleanName(raw.name);if(!name)return null;
  const bests={};let total=0,stars=0,cleared=0;
  for(let n=1;n<=RUSH_COUNT;n++){const v=num(raw.bests?.[n]??raw.bests?.[String(n)],MAX_POINTS);if(v>0){bests[n]=v;total+=v;cleared=Math.max(cleared,n);}}
  stars=num(raw.stars,RUSH_COUNT*3);
  return {id:nameId(name),name,cleared:Math.max(cleared,num(raw.cleared,RUSH_MAX)),stars,bests,total,at:num(raw.at,4102444800000)};
}
export function cleanFriends(list){
  const out=[],seen=new Set();
  for(const raw of Array.isArray(list)?list:[]){const f=cleanProfile(raw);if(f&&!seen.has(f.id)){seen.add(f.id);out.push(f);}if(out.length>=FRIENDS_MAX)break;}
  return out;
}
// Lägger in (eller uppdaterar) en vän. Samma namn = samma vän; den nyaste profilen gäller och bästa poäng per rush behålls. Högst trettio, de senaste först.
export function mergeFriend(list,entry){
  const f=cleanProfile(entry);if(!f)return {list:cleanFriends(list),friend:null,isNew:false};
  const cur=cleanFriends(list),i=cur.findIndex(x=>x.id===f.id),old=i>=0?cur[i]:null;
  const merged=old?{...f,bests:{...old.bests},stars:Math.max(old.stars,f.stars)}:f;
  if(old){for(const [n,v] of Object.entries(f.bests))merged.bests[n]=Math.max(old.bests[n]||0,v);merged.total=Object.values(merged.bests).reduce((s,v)=>s+v,0);merged.cleared=Math.max(old.cleared,f.cleared);merged.at=Math.max(old.at,f.at);}
  const rest=cur.filter(x=>x.id!==f.id);rest.unshift(merged);
  return {list:rest.slice(0,FRIENDS_MAX),friend:merged,isNew:!old};
}

// ── Länken ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// J1|namn|rush att slå (0 = ingen utmaning)|högsta klarade rush|stjärnor|tid|poäng i rush 1,2,…,12|kontrollsumma
export function encodeChallenge({name,focus=0,cleared=0,stars=0,bests={},at=Date.now()}={}){
  const f=cleanProfile({name,cleared,stars,bests,at});if(!f)return null;
  const foc=Math.max(0,Math.min(RUSH_COUNT,Math.floor(Number(focus))||0));
  const body=['J1',f.name,foc,f.cleared,f.stars,f.at,Array.from({length:RUSH_COUNT},(_,i)=>f.bests[i+1]||0).join(',')].join('|');
  return toB64(body+'|'+hash(body));
}
export function decodeChallenge(token){
  try{
    if(typeof token!=='string'||!TOKEN_RE.test(token))return null;
    const text=fromB64(token),cut=text.lastIndexOf('|');if(cut<0)return null;
    const body=text.slice(0,cut);if(hash(body)!==text.slice(cut+1))return null;
    const p=body.split('|');if(p.length!==7||p[0]!=='J1')return null;
    const b=p[6].split(',');if(b.length!==RUSH_COUNT)return null;
    const bests={};b.forEach((v,i)=>{const n=num(v,MAX_POINTS);if(n>0)bests[i+1]=n;});
    const profile=cleanProfile({name:p[1],cleared:p[3],stars:p[4],at:p[5],bests});if(!profile)return null;
    const focus=Math.floor(Number(p[2]));
    return {profile,focus:focus>=1&&focus<=RUSH_COUNT?focus:0,toBeat:focus>=1&&focus<=RUSH_COUNT?profile.bests[focus]||0:0};
  }catch{return null;}
}
// Adressen en vän öppnar: samma sida, med ?utmaning=… Bara tokenens tecken (A–Z a–z 0–9 _ -) hamnar i adressen.
export function challengeUrl(base,token){
  if(!token)return '';
  try{const u=new URL(base);u.search='';u.hash='';u.searchParams.set('utmaning',token);return u.href;}catch{return '';}
}
export function tokenFromSearch(search){
  try{const t=new URLSearchParams(search).get('utmaning');return t&&TOKEN_RE.test(t)?t:null;}catch{return null;}
}
const sv=v=>Math.round(v).toLocaleString('sv-SE');
export function shareText({name,rush,points,reach,url}={}){
  return (rush&&points?'Jag fick '+sv(points)+' poäng i Rush '+rush.n+' ('+rush.name+') i Julklappsjakten. Slå mig!':reach>=RUSH_COUNT?'Jag har klarat Rush '+reach+' i Julrushen i Julklappsjakten. Kommer du längre?':'Kolla in min julrush i Julklappsjakten. Hur långt kommer du?')+(url?' '+url:'');
}

// ── Topplistan ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Rader för en rush (n), totalt (n=0) eller hur långt man kommit (n=-1: högsta klarade rush, och det kan vara över tolv). me: din egen profil. Sorterat på poäng (totalt: summan av bästa poäng per rush,
// sedan stjärnor; längst: högsta rush, sedan summan). Bara de som klarat rushen (eller kommit så långt) finns med.
export function leaderboard({me,friends=[],n=0}={}){
  const rows=[];
  const add=(p,you)=>{
    if(!p)return;
    const total=p.total??Object.values(p.bests||{}).reduce((s,v)=>s+v,0);
    const points=n<0?p.cleared||0:n?p.bests?.[n]||0:total;
    if(points>0)rows.push({id:you?'du':p.id,name:p.name||'DU',you,points,stars:p.stars||0,cleared:p.cleared||0,total});
  };
  add(me,true);for(const f of cleanFriends(friends))add(f,false);
  rows.sort((a,b)=>b.points-a.points||(n<0?b.total-a.total:0)||b.stars-a.stars||(a.you?-1:b.you?1:0));
  rows.forEach((r,i)=>{r.rank=i+1;});
  return rows;
}
// Efter en rush: hur gick det mot en utmaning? {beat, diff, text}
export function versus({points,toBeat,name}){
  if(!(toBeat>0))return null;
  const beat=points>toBeat,tie=points===toBeat;
  return {beat,tie,diff:points-toBeat,text:beat?'DU SLOG '+name+'! '+sv(points)+' mot '+sv(toBeat):tie?'LIKA MED '+name+'! '+sv(points)+' poäng':name+' VANN MED '+sv(toBeat-points)+' POÄNG ('+sv(toBeat)+' mot '+sv(points)+')'};
}
