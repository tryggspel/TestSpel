// Julbåten: båtbussen från Inre hamn till Mariebergsskogen och julklapparna där. Ren modul (ingen DOM, ingen PlayCanvas).
//
// Resan är grundspelets båtbuss (boat-ride.js, boat-rescue.mjs): 36 sekunder, upp till tolv passagerare att rädda. När båten lägger till vid Mariebergsskogens brygga börjar en paketjakt:
// tolv julklappar och tre bonuspaket i parken, och en tomte vid bryggan som tar emot dem. Jakten är grundspelets paketmotor (XmasHunt) med en fast bana; ingen nav-karta behövs, för
// Mariebergsskogen ligger utanför stadens gångbara karta. Paketen läggs därför ut mot spelets egna kollisioner (blocked) när jakten startar.
import {MARIEBERG,HARBOUR} from '../city-south-space.mjs?v=2.21.1-xmas.8';

export const BOAT=Object.freeze({
  id:'marieberg',                    // jaktens id (rekordet) och julstämpelns id
  title:'JULKLAPPAR I MARIEBERGSSKOGEN',
  menu:'BÅTBUSSEN TILL MARIEBERGSSKOGEN',
  goal:12,bonus:3,                   // vanliga paket att samla och valfria bonuspaket
  windowSec:4.6,                     // kombofönstret
  tomteRadius:3.4,
  spacing:7.5,                       // minsta avstånd mellan två paket (m)
  reach:Object.freeze({min:11,max:92}), // hur långt från bryggan paketen får ligga (m)
  clearance:1.3,                     // fri yta runt varje paket (m): inget paket ligger intill en vägg, ett träd eller vattnet
  maxBoatPoints:300,                 // tak för båtresans poäng som räknas in i jakten
  harbour:Object.freeze({x:HARBOUR.x,z:HARBOUR.z}),landing:Object.freeze({x:MARIEBERG.x,z:MARIEBERG.z})
});
// Grundspelets sex termospunkter i Mariebergsskogen (journey-rules.mjs: marieberg-0…5), som spelets egen platskontroll (tools/explore-spots/check.mjs) har visat är fria och nåbara.
// De är de första kandidaterna, så att jakten alltid har paket nära bryggan även om parkens kollisioner skulle vara ofullständiga.
const KNOWN=Object.freeze(Array.from({length:6},(_,i)=>Object.freeze({x:-787-i*5,z:1310+(i%2)*24})));
const GOLDEN=Math.PI*(3-Math.sqrt(5));

const free=(blocked,x,z,c)=>!blocked(x,z)&&!blocked(x+c,z)&&!blocked(x-c,z)&&!blocked(x,z+c)&&!blocked(x,z-c);
function nearestFree(blocked,x,z,{from=0,to=12,step=1.5}={}){
  for(let r=from;r<=to;r+=step)for(let k=0;k<(r?16:1);k++){
    const a=k*Math.PI*2/16,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;
    if(free(blocked,px,pz,.6))return {x:+px.toFixed(2),z:+pz.toFixed(2)};
  }
  return null;
}
// Banan: {spawn,tomte,packages,goal,bonusTotal,regularTotal}. blocked(x,z) är spelets kollisioner (true = i vägen). Deterministisk: samma kollisioner ger samma bana.
export function buildMarieberg({blocked=()=>false,landing=BOAT.landing}={}){
  const C=BOAT.clearance,sp=BOAT.spacing,[rMin,rMax]=[BOAT.reach.min,BOAT.reach.max];
  const spawn=nearestFree(blocked,landing.x,landing.z,{to:10})||{x:landing.x,z:landing.z};
  // Tomten står någon meter från bryggan, åt parken till (västerut).
  const tomte=nearestFree(blocked,landing.x-6,landing.z,{from:0,to:14})||{x:+(landing.x-6).toFixed(2),z:landing.z};
  const need=BOAT.goal+BOAT.bonus,picked=[];
  const ok=(x,z)=>{
    const d=Math.hypot(x-landing.x,z-landing.z);
    return d>=rMin&&d<=rMax&&Math.hypot(x-tomte.x,z-tomte.z)>=6&&free(blocked,x,z,C)&&picked.every(q=>Math.hypot(q.x-x,q.z-z)>=sp);
  };
  for(const k of KNOWN)if(picked.length<need&&ok(k.x,k.z))picked.push({x:k.x,z:k.z});
  // Resten: en solrosspiral över parken väster om bryggan (jämn täckning utan mönster), prövad mot kollisionerna.
  const cx=landing.x-46,cz=landing.z;
  for(let i=0;i<900&&picked.length<need;i++){
    const r=Math.sqrt(i/900)*74,a=i*GOLDEN,x=+(cx+Math.sin(a)*r).toFixed(2),z=+(cz+Math.cos(a)*r*.9).toFixed(2);
    if(ok(x,z))picked.push({x,z});
  }
  // De tre bonuspaketen är de längst bort från bryggan (valfria avstickare); resten är de vanliga.
  const byFar=picked.map((p,i)=>({p,i,d:Math.hypot(p.x-landing.x,p.z-landing.z)})).sort((a,b)=>b.d-a.d||a.i-b.i);
  const bonusIdx=new Set(byFar.slice(0,Math.min(BOAT.bonus,Math.max(0,picked.length-BOAT.goal))).map(e=>e.i));
  let rn=0,bn=0;
  const packages=picked.map((p,i)=>bonusIdx.has(i)?{id:'m:b'+(++bn),x:p.x,z:p.z,kind:'bonus',cluster:100+bn}:{id:'m:'+String(++rn).padStart(2,'0'),x:p.x,z:p.z,kind:'regular',cluster:0});
  const regularTotal=packages.filter(p=>p.kind==='regular').length;
  const yaw=90; // vänd västerut, in mot parken
  return {spawn:{x:spawn.x,z:spawn.z,yaw},tomte:{x:tomte.x,z:tomte.z,radius:BOAT.tomteRadius},packages,goal:Math.min(BOAT.goal,regularTotal),regularTotal,bonusTotal:packages.length-regularTotal,ok:regularTotal>=4};
}
// Båtresans bidrag: räddade passagerare och poäng (grundspelets BoatRescue: 20 per räddad, +10 i kedja, +100 vid minst åtta, +5 per sedd fågel eller båt).
export function boatBonus(result){
  const r=result||{};
  return {saved:Math.max(0,Math.min(12,Math.floor(Number(r.saved))||0)),points:Math.max(0,Math.min(BOAT.maxBoatPoints,Math.round(Number(r.points)||0))),calm:!!r.calm};
}
export const boatNote=stamped=>stamped?'Julbåten är stämplad. Åk igen för fler julpoäng.':'Zombie-båtbussen lägger ut från Inre hamn i vinterskymningen. Rädda passagerarna, hämta julklapparna i Mariebergsskogen och lämna dem hos tomten.';
