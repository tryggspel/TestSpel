import {GAME_VERSION} from './build-info.mjs?v=2.11.9';
// Versioned, local challenge rules. Dates always follow Karlstad's calendar.
// The corrected city geometry changes walkable routes and pickup paths.
// Keep scores/replays from the previous map out of the new challenge comparison.
export const CHALLENGE_RULES=7;
export const DAILY_VARIANTS=Object.freeze([
  {id:'no-super',title:'SOL UTAN SUPER',description:'800 XP och hem. Vanliga solstötar får göra hela jobbet.',seconds:180,noSuper:true},
  {id:'espresso',title:'DUBBEL ESPRESSO',description:'800 XP och hem. Kaffet doftar starkare. Följ solen för att skaka av dig doften.',seconds:180,scentScale:1.6},
  {id:'blackout',title:'SKYMNING ÖVER TORGET',description:'800 XP och hem. Panik från start och ett tidigt strömavbrott.',seconds:180,panic:50,firstChaos:'blackout'},
  {id:'sun-chase',title:'JAKTEN PÅ SOLA',description:'800 XP på 2:30. Längre solpauser ger dig chans till dubbla zombiepoäng.',seconds:150,sunDuration:24}
].map(v=>Object.freeze(v)));
export function stockholmDay(now=new Date()){
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=type=>parts.find(p=>p.type===type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validDay(day){
  if(typeof day!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(day))return false;
  const d=new Date(day+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day;
}
export function hashSeed(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)%999999+1;}
export function seededRandom(seed){let state=seed>>>0;return ()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};}
export function dailyFor(day=stockholmDay()){
  if(!validDay(day))throw new Error('Ogiltigt datum för Dagens Karlstad.');
  const seed=hashSeed('Karlstad:daily:'+CHALLENGE_RULES+':'+day),variant=DAILY_VARIANTS[Math.floor(Date.parse(day+'T12:00:00Z')/86400000)%DAILY_VARIANTS.length];
  return Object.freeze({kind:'daily',day,seed,rules:CHALLENGE_RULES,target:800,...variant});
}
const number=(s,max,fallback=0)=>/^\d{1,7}$/.test(String(s))?Math.min(max,Number(s)):fallback;
export function parseKit(value){
  if(typeof value!=='string'||!/^\d{1,6}\.\d{1,3}\.[0-9a-z]{1,7}\.[0-9a-z]{1,7}\.[0-9a-z]{1,7}$/.test(value))return null;
  const [balance,energy,secrets,cleared,postcards]=value.split('.');
  if(Number(balance)>999999||Number(energy)>100||[secrets,cleared,postcards].some(s=>parseInt(s,36)>0xffffffff))return null;
  return {balance:Number(balance),energy:Number(energy),secrets:parseInt(secrets,36),cleared:parseInt(cleared,36),postcards:parseInt(postcards,36)};
}
export function encodeKit(kit){return [kit.balance,Math.round(kit.energy),kit.secrets.toString(36),kit.cleared.toString(36),kit.postcards.toString(36)].join('.');}
export function challengeRequest(search,now=new Date()){
  const p=new URLSearchParams(search),target=number(p.get('target'),999999),seed=number(p.get('seed'),999999,280926)||280926;
  if(p.has('rules')&&p.get('rules')!==String(CHALLENGE_RULES))return {error:'Den här länken använder andra utmaningsregler. Välj en ny runda här.'};
  if(p.has('daily')){
    const day=p.get('daily')==='1'?stockholmDay(now):p.get('daily');
    if(!validDay(day))return {error:'Datumet i utmaningslänken är ogiltigt. Dagens runda finns här.'};
    return {kind:'daily',challenge:dailyFor(day),target};
  }
  if(p.get('challenge')==='boat')return {kind:'boat',seed,target};
  if(p.get('challenge')==='bus')return {kind:'bus',from:['torget','domkyrkan','sandgrund'].includes(p.get('from'))?p.get('from'):'torget',seed,target};
  if(p.has('hunt'))return {kind:'hunt',seed,target,kit:parseKit(p.get('kit'))};
  return {kind:null,target,seed};
}
export function challengeLink(base,record){
  const url=new URL(base);url.search='';url.hash='';url.searchParams.set('v',GAME_VERSION);url.searchParams.set('rules',String(CHALLENGE_RULES));
  if(record.kind==='daily')url.searchParams.set('daily',record.day);
  else if(record.kind==='boat')url.searchParams.set('challenge','boat');
  else if(record.kind==='bus'){url.searchParams.set('challenge','bus');url.searchParams.set('from',record.from);}
  else if(record.kind==='mission')url.searchParams.set('challenge',record.mission);
  else {url.searchParams.set('hunt','1');if(record.kit)url.searchParams.set('kit',encodeKit(record.kit));}
  url.searchParams.set('seed',String(record.seed));url.searchParams.set('target',String(Math.max(0,Math.round(record.score))));
  return url.href;
}
export function dailyRecord(storage,day){
  try{const r=JSON.parse(storage?.getItem('karlstad:daily:'+CHALLENGE_RULES+':'+day)||'null');return {best:number(r?.best,999999),attempts:number(r?.attempts,999999),wins:number(r?.wins,999999)};}catch{return {best:0,attempts:0,wins:0};}
}
export function saveDailyResult(storage,day,score,won){
  const r=dailyRecord(storage,day);r.attempts++;if(won){r.wins++;r.best=Math.max(r.best,Math.round(score));}
  try{storage?.setItem('karlstad:daily:'+CHALLENGE_RULES+':'+day,JSON.stringify(r));}catch{}
  return r;
}
