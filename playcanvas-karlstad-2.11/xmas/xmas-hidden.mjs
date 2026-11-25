// Gömda julklappar: tjugo platser runt om i Karlstad, hämtade ur grundspelets skattjakt (explore-places.mjs: TREASURES), som redan är kontrollerade mot spelets karta. Namn, ledtråd och plats kommer därifrån,
// så att julbygget aldrig har en egen kopia som kan glida isär. De tre skatterna inne i Mitt i City tas inte med (de ligger inomhus och julbygget har sin egen miljö där).
// Ren modul: ingen DOM, ingen spelmotor. Ordningen är närmast Torget först: ledtrådarna släpps i den ordningen (hintsShown) och de första är de lättaste att nå.
import {TREASURES} from '../explore-places.mjs?v=2.21.1-xmas.14';
import {HIDDEN} from './xmas-meta-config.mjs?v=2.21.1-xmas.14';

export const HIDDEN_IDS=Object.freeze([
  't-tingvalla','t-bron','t-klockan','t-perrong','t-lofbergs','t-museiparken','t-ros','t-ccc','t-damm','t-skeppet',
  't-tradgarden','t-fontan','t-korskyrkan','t-pir','t-kranen','t-gjutaren','t-glasbruk','t-brygga','t-magnolia','t-herrhaga'
]);
export const HIDDEN_SPOTS=Object.freeze(HIDDEN_IDS.map(id=>{
  const t=TREASURES.find(x=>x.id===id);
  if(!t)throw new Error('Gömd julklapp saknar skatt i grundspelet: '+id);
  return Object.freeze({id,name:t.name,clue:t.hint,x:t.x,z:t.z});
}));
export const hiddenSpot=id=>HIDDEN_SPOTS.find(s=>s.id===id)||null;

const dayDiff=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/864e5);
// Hur många ledtrådar som är framme: hintsAtStart den första dagen och hintsPerDay fler för varje dag därefter (högst alla).
export function hintsShown(firstDay,today,cfg=HIDDEN,total=HIDDEN_SPOTS.length){
  const days=firstDay&&today?Math.max(0,dayDiff(firstDay,today)):0;
  return Math.min(total,cfg.hintsAtStart+cfg.hintsPerDay*days);
}
// Paketen som läggs in i fri julvandring (XmasHunt.addHidden): ett guldpaket per plats som ännu inte hittats. id börjar med h: så att spelet känner igen dem.
export const HIDDEN_PREFIX='h:';
export function hiddenPackages(found={}){
  return HIDDEN_SPOTS.filter(s=>!found[s.id]).map(s=>({id:HIDDEN_PREFIX+s.id,spot:s.id,x:s.x,z:s.z}));
}
export const spotOfPackage=id=>typeof id==='string'&&id.startsWith(HIDDEN_PREFIX)?id.slice(HIDDEN_PREFIX.length):'';
// Närmaste ofunna gömda julklapp: {spot,distance} eller null. Används för "varmt"-raden (HIDDEN.warm och HIDDEN.hot, meter).
export function nearestHidden(p,found={}){
  let best=null;
  for(const s of HIDDEN_SPOTS){if(found[s.id])continue;const d=Math.hypot(s.x-p.x,s.z-p.z);if(!best||d<best.distance)best={spot:s,distance:d};}
  return best;
}
export function warmth(distance,cfg=HIDDEN){return distance<=cfg.hot?'hot':distance<=cfg.warm?'warm':'cold';}
