// Dagens julklappsjakt (2.21.1-xmas.13): en ny julklapp gömd i Karlstad varje dag. Ren modul: ingen DOM, ingen spelmotor.
// Gömställena är grundspelets egna termosplatser (explore-places.mjs: FX_THERMOS), som redan är kontrollerade mot spelets karta (minst 1,1 m fritt, på verkliga gator och stigar).
// En gåta pekar ut området; "varmt" och "glödhett" leder sista biten. Efter en stund står områdets namn i uppdragsraden, och ännu senare visar pilen vägen till området.
// Alla spelare har samma gömställe samma dag. Två dagar i rad ligger aldrig i samma område. Schemat för erbjudanden och QR-rader ligger i xmas-daily-config.mjs.
import {FX_THERMOS} from '../explore-places.mjs?v=2.21.1-xmas.14';
import {DAILY,DAILY_HUNTS} from './xmas-daily-config.mjs?v=2.21.1-xmas.14';

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
