// Ljuset i julbygget (2.21.1-xmas.13): dag, skymning och kväll efter klockan i Karlstad (Europe/Stockholm), eller fast efter spelarens val.
// Ren modul (ingen DOM, ingen PlayCanvas): hur mörkt det är vid en viss tid och vilka färger det ger. Själva tonandet görs i xmas-light.js.
//
// Karlstad i slutet av november och december: solen går upp ungefär 08.40–09.00 och ner ungefär 14.55–15.15; den blå timmen varar till ungefär 16.00.
// Mörkret k: 0 = dag, ungefär 0,55 = skymning (blå timme), 1 = kväll och natt. Övergångarna är mjuka (smoothstep).
export const LIGHT_MODES=Object.freeze(['auto','dag','skymning','kvall']);
export const LIGHT_LABEL=Object.freeze({auto:'FÖLJER KLOCKAN',dag:'DAG',skymning:'SKYMNING',kvall:'KVÄLL'});
export const FIXED_K=Object.freeze({dag:0,skymning:.55,kvall:1});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Mörkret vid en klocktid (timmar 0–24 med decimaler).
export function darknessAt(hour){
  const h=((Number(hour)%24)+24)%24;
  if(h<12)return 1-smooth(7.4,9.3,h);                             // morgon: mörkt till 07.24, ljust från 09.18
  return .55*smooth(14.3,15.4,h)+.45*smooth(15.4,16.6,h);          // eftermiddag: skymning 14.18–15.24, kväll från 16.36
}
export function stockholmHour(date=new Date()){
  try{const s=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);const [hh,mm]=s.split(/[:.]/).map(Number);return hh+mm/60;}
  catch{return date.getHours()+date.getMinutes()/60;}
}
export function darknessFor(mode,date=new Date()){return mode in FIXED_K?FIXED_K[mode]:darknessAt(stockholmHour(date));}
export function phaseName(k){return k<.15?'dag':k<.75?'skymning':'kvall';}

const lerp=(a,b,t)=>a+(b-a)*t;
const lerp3=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t),lerp(a[2],b[2],t)];
// Tre nyckelbilder: dag (som förut), blå timme och kväll. Färger i 0–1 (linjärt mot vad materialen redan har).
const KEYS=Object.freeze([
  {k:0, world:[1,1,1],        top:[.44,.62,.86],horizon:[.70,.79,.88],fog:[.70,.79,.88],fogStart:120,fogEnd:420,sun:2.35,sunColor:[1,.91,.76],fill:.42,ambient:[.34,.38,.40],stars:0},
  {k:.55,world:[.60,.62,.80], top:[.10,.16,.38],horizon:[.86,.56,.52],fog:[.50,.48,.62],fogStart:80, fogEnd:380,sun:1.0, sunColor:[1,.64,.46],fill:.36,ambient:[.22,.24,.34],stars:.35},
  {k:1, world:[.30,.33,.51],  top:[.02,.04,.12],horizon:[.13,.18,.33],fog:[.12,.15,.27],fogStart:60, fogEnd:330,sun:.24, sunColor:[.62,.72,1],fill:.24,ambient:[.12,.14,.23],stars:1}
]);
// Färgerna för ett mörker k (0–1).
export function gradeFor(k){
  const x=Math.max(0,Math.min(1,Number(k)||0)),i=x<=KEYS[1].k?0:1,a=KEYS[i],b=KEYS[i+1],t=(x-a.k)/(b.k-a.k);
  const world=lerp3(a.world,b.world,t);
  return {k:x,world,soft:world.map(v=>Math.pow(v,.45)),top:lerp3(a.top,b.top,t),horizon:lerp3(a.horizon,b.horizon,t),fog:lerp3(a.fog,b.fog,t),
    fogStart:lerp(a.fogStart,b.fogStart,t),fogEnd:lerp(a.fogEnd,b.fogEnd,t),sun:lerp(a.sun,b.sun,t),sunColor:lerp3(a.sunColor,b.sunColor,t),fill:lerp(a.fill,b.fill,t),ambient:lerp3(a.ambient,b.ambient,t),stars:lerp(a.stars,b.stars,t)};
}
// Ska ett material tonas? (för xmas-light.js) m: {useLighting, blendType, opaque}. bright/dim: material som alltid lyser eller alltid tonas.
export function gradeKind(m,{bright=null,dim=null,BLEND_NONE=3}={}){
  if(bright&&bright.has(m))return 'bright';
  if(dim&&dim.has(m))return 'dim';
  if(m.useLighting!==false)return 'lit';               // stadens upplysta material: ljuskällorna tonas i stället
  return m.blendType===BLEND_NONE?'dim':'bright';       // ogenomskinligt utan ljus = stadens färgade trianglar; genomskinligt = sken, bildkort, paket, termosar
}
