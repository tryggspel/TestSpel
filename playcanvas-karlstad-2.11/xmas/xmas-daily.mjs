// Dagens julklappsjakt (2.21.1-xmas.13): en ny julklapp gömd i Karlstad varje dag. Ren modul: ingen DOM, ingen spelmotor.
// Gömställena är grundspelets egna termosplatser (explore-places.mjs: FX_THERMOS), som redan är kontrollerade mot spelets karta (minst 1,1 m fritt, på verkliga gator och stigar).
// En gåta pekar ut området; "varmt" och "glödhett" leder sista biten. Efter en stund står områdets namn i uppdragsraden, och ännu senare visar pilen vägen till området.
// Alla spelare har samma gömställe samma dag. Två dagar i rad ligger aldrig i samma område. Schemat för erbjudanden och QR-rader ligger i xmas-daily-config.mjs.
import {FX_THERMOS} from '../explore-places.mjs?v=2.21.1-xmas.17';
import {DAILY,DAILY_HUNTS} from './xmas-daily-config.mjs?v=2.21.1-xmas.17';
import {compass} from './xmas-platsjakt.mjs?v=2.21.1-xmas.17';

const near=(list,max=720)=>list.map(([x,z])=>({x,z})).filter(p=>Math.hypot(p.x,p.z)<max).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
// Områdena: namn, gåta (pekar ut området, inte platsen) och gömställena (närmast Torget först).
export const DAILY_AREAS=Object.freeze([
  {id:'klara',name:'Klara och Residensparken',riddle:'Tomten tog en genväg västerut, där kvarteren slutar och älven tar vid. Där tappade han dagens julklapp.',spots:near(FX_THERMOS.klara).filter(p=>p.z<250)},
  {id:'station',name:'Tågstationen',riddle:'Tomten skulle hinna med tåget hem till Nordpolen. På perrongen föll en julklapp ur säcken.',spots:near(FX_THERMOS.station)},
  {id:'tradgard',name:'Stadsträdgården',riddle:'Där rosorna sover under snön och dammen har frusit söder om stan. Tomten vilade på en bänk och glömde något.',spots:near(FX_THERMOS.tradgard)},
  {id:'bryggudden',name:'Bryggudden',riddle:'Båtarna ligger uppdragna för vintern, men tomten gick ut på udden för att se på isen. Leta där bryggorna pekar ut mot vattnet.',spots:near(FX_THERMOS.bryggudden)},
  {id:'sandgrund',name:'Sandgrund och Museiparken',riddle:'Norrut längs älven, där konsten bor och museet vaktar parken. En julklapp ligger i snön mellan träden.',spots:near(FX_THERMOS.park)},
  {id:'hamn',name:'Inre hamn',riddle:'Det doftar nyrostat kaffe vid kajerna söder om stan. Tomten stannade för en kopp, och en julklapp blev kvar.',spots:near(FX_THERMOS.hamn)},
  {id:'haga',name:'Haga',riddle:'Österut, bland kyrkor, trähus och idrottsplatser i Haga. Tomtens släde tappade en julklapp i en kurva.',spots:near(FX_THERMOS.haga)}
].map(a=>Object.freeze({...a,spots:Object.freeze(a.spots.map(s=>Object.freeze(s))),center:Object.freeze({x:a.spots.reduce((s,p)=>s+p.x,0)/a.spots.length,z:a.spots.reduce((s,p)=>s+p.z,0)/a.spots.length})})));
export const areaById=id=>DAILY_AREAS.find(a=>a.id===id)||null;

const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const DAY=/^20\d{2}-\d{2}-\d{2}$/;
const dayNum=day=>Math.round(Date.parse(day+'T12:00:00Z')/864e5);
export const DAILY_PREFIX='d:';
// Dagens gömställe och belöning. day = 'YYYY-MM-DD' (svensk kalenderdag).
// Område: en fast ordning som roterar (ingen dag har samma område som dagen före), förskjuten efter årets dag. Plats inom området: efter datumet.
export function dailyFor(day,hunts=DAILY_HUNTS){
  if(!DAY.test(day||''))return null;
  const extra=hunts[day]||{},n=DAILY_AREAS.length,k=dayNum(day);
  let area=areaById(extra.area)||DAILY_AREAS[((k*3)%n+n)%n]; // steg 3 i en ring av 7: alla områden kommer i tur och ordning, aldrig samma två dagar i rad
  const i=Number.isInteger(extra.spot)&&extra.spot>=0&&extra.spot<area.spots.length?extra.spot:fnv('dagens|'+day)%area.spots.length;
  const spot=area.spots[i];
  return Object.freeze({day,id:DAILY_PREFIX+day,area:{id:area.id,name:area.name,riddle:area.riddle,center:area.center},spot:{x:spot.x,z:spot.z,i},
    reward:Object.freeze({xp:Number.isFinite(extra.xp)?extra.xp:DAILY.xp,orn:extra.orn||'rare',tickets:Number.isInteger(extra.tickets)?extra.tickets:0,coupon:typeof extra.coupon==='string'?extra.coupon:''}),
    qr:typeof extra.qr==='string'?extra.qr:'',note:typeof extra.note==='string'?extra.note:''});
}
export const isDailyId=id=>typeof id==='string'&&id.startsWith(DAILY_PREFIX);
// Hur varmt det är (samma ord som de gömda julklapparna): 'hot' | 'warm' | 'cold'.
export function dailyWarmth(distance,cfg=DAILY){return distance<=cfg.hot?'hot':distance<=cfg.warm?'warm':'cold';}
// Vilken hjälp som är framme efter så här många sekunders letande: 1 = gåtan, 2 = områdets namn, 3 = pilen till området.
export function hintLevel(seconds,cfg=DAILY){return seconds>=cfg.arrowAfter?3:seconds>=cfg.areaHintAfter?2:1;}
// Tid till nästa dag (midnatt i Karlstad), för "ny julklapp om 5 h 12 min".
export function untilTomorrow(now=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(now);
    const h=+parts.find(p=>p.type==='hour').value%24,m=+parts.find(p=>p.type==='minute').value;
    const left=24*60-(h*60+m);return {h:Math.floor(left/60),m:left%60};
  }catch{return {h:0,m:0};}
}

// ── Ledtrådstrappan och värmemätaren (2.21.1-xmas.17) ─────────────────────────────────────────────────────────────
// Dagens julklappsjakt är ett eget läge (inga tappade julklappar eller spår i snön). Hjälpen kommer i steg, efter tid eller med knappen LEDTRÅD NU (bonus):
//   1 gåtan · 2 området · 3 väderstreck och avstånd härifrån · 4 pilen till området · 5 pilen ända fram till julklappen.
export const DAILY_STEPS=Object.freeze([
  {n:1,key:'riddle',label:'GÅTAN',row:'LÖS GÅTAN'},{n:2,key:'area',label:'OMRÅDET',row:'SÖK I OMRÅDET'},{n:3,key:'compass',label:'VÄDERSTRECK',row:'GÅ I RÄTT RIKTNING'},
  {n:4,key:'arrow',label:'PILEN TILL OMRÅDET',row:'FÖLJ PILEN'},{n:5,key:'spot',label:'PILEN ÄNDA FRAM',row:'PILEN VISAR VÄGEN'}
].map(o=>Object.freeze(o)));
const STEP_AT=cfg=>[0,cfg.areaHintAfter,cfg.compassAfter,cfg.arrowAfter,cfg.spotArrowAfter];
export function dailyStep(seconds,bonus=0,cfg=DAILY){const t=STEP_AT(cfg);let s=1;for(let i=1;i<t.length;i++)if(seconds>=t[i])s=i+1;return Math.min(5,s+Math.max(0,Math.floor(bonus)||0));}
// Sekunder till nästa steg som kommer av sig själv (null när alla steg är framme).
export function nextStepIn(seconds,step,cfg=DAILY){const t=STEP_AT(cfg);return step>=5?null:Math.max(0,t[step]-seconds);}
export const WARMTH_LABELS=Object.freeze(['ISKALLT','KALLT','LJUMMET','VARMT','GLÖDHETT']);
export function warmthLevel(distance,cfg=DAILY){return distance<=cfg.hot?4:distance<=cfg.warm?3:distance<=cfg.cool?2:distance<=cfg.cold?1:0;}
export function distanceText(m){return m<100?'under 100 m':'ungefär '+(Math.round(m/50)*50).toLocaleString('sv-SE')+' m';}
// Texten för ett steg (p = där spelaren står).
export function stepText(step,def,p){
  if(step<=1)return '”'+def.area.riddle+'”';
  if(step===2)return 'Dagens julklapp ligger i '+def.area.name+'.';
  if(step===3)return 'Den ligger '+compass(p,def.spot)+' härifrån, '+distanceText(Math.hypot(def.spot.x-p.x,def.spot.z-p.z))+'.';
  if(step===4)return 'Pilen visar vägen till '+def.area.name+'. Där blir det varmt.';
  return 'Pilen visar nu vägen ända fram till julklappen.';
}
