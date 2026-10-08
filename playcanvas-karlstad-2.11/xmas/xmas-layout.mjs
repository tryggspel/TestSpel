// Julklappsjakten: var paketen ligger. Ren modul (ingen DOM, ingen PlayCanvas) så att utläggen kan kontrolleras i test:
// antal, avstånd, att allt ligger på gångbar mark och att alla obligatoriska paket går att nå.
//
// Introduktionen är en spiralformad slinga runt julgranen på Stora Torget. Den börjar långt ut på södra sidan, där man ser granen och
// de första paketen direkt, och snurrar inåt tills den slutar vid tomten öster om granen. Paketen ligger i små grupper (2–4 st) med
// 12–17 meters mellanrum: på normal gångfart blir det en insamling var 2–4 sekund, och 20 paket tar ungefär 40–70 sekunder.
// Stora Torget är öppet i alla riktningar, så spelaren får gärna ta genvägar; vägledningen bygger på var paketen ligger, inte på väggar.

export const TREE={x:0,z:0,radius:2.6,collider:1.5,height:15};
export const INTRO_GOAL=20;
const SPIRAL=Object.freeze({turns:2.25,r0:27,r1:8.5,bearing0:180});
// Platser i grundspelets torgmiljö som paket inte får ligga i (bänkar, planteringar, lyktor, träd). Se app.js addPlazaPattern/addStreetProps.
export const TORGET_PROPS=Object.freeze([
  [-18,-18],[18,-18],[-18,17],[18,17],[-25,-20],[25,-20],[-25,20],[25,20],
  [-22,-25],[-13,-27],[14,-26],[24,-22],[-35,5],[-36,18],[34,4],[36,18],
  [-18,-12],[-6,-14],[8,-14],[20,-10],[-34,28],[34,28]
]);
export const PROP_CLEARANCE=1.6;

const rad=d=>d*Math.PI/180;
const spiralAt=t=>{const b=rad(SPIRAL.bearing0-360*SPIRAL.turns*t),r=SPIRAL.r0+(SPIRAL.r1-SPIRAL.r0)*t;return {x:r*Math.sin(b),z:-r*Math.cos(b),r,bearing:SPIRAL.bearing0-360*SPIRAL.turns*t};};
// Båglängdstabell längs spiralen, så att grupperna kan läggas på jämna avstånd i meter.
const TABLE=(()=>{const n=1600,pts=[];let len=0,prev=spiralAt(0);pts.push({t:0,s:0,x:prev.x,z:prev.z});for(let i=1;i<=n;i++){const p=spiralAt(i/n);len+=Math.hypot(p.x-prev.x,p.z-prev.z);pts.push({t:i/n,s:len,x:p.x,z:p.z});prev=p;}return pts;})();
export const SPIRAL_LENGTH=TABLE.at(-1).s;
function atArc(s){
  const S=Math.max(0,Math.min(SPIRAL_LENGTH,s));let lo=0,hi=TABLE.length-1;
  while(hi-lo>1){const m=(lo+hi)>>1;if(TABLE[m].s<=S)lo=m;else hi=m;}
  const a=TABLE[lo],b=TABLE[hi],k=b.s>a.s?(S-a.s)/(b.s-a.s):0;
  const x=a.x+(b.x-a.x)*k,z=a.z+(b.z-a.z)*k,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;
  return {x,z,tx:dx/l,tz:dz/l,nx:-dz/l,nz:dx/l};
}
// Gruppformer: [båglängd framåt, sidoförskjutning]. Sidoförskjutningen är max 1,2 m så att man tar alla genom att gå längs spåret.
const SHAPES=Object.freeze({
  line3:[[0,0],[1.9,.4],[3.8,0]],
  pair:[[0,-.6],[1.8,.6]],
  arc4:[[0,-1.2],[1.5,-.4],[3,.4],[4.5,1.2]],
  zig3:[[0,1],[1.8,-1],[3.6,1]]
});
// Gruppernas ordning och startavstånd (m från spawn längs spåret). Summan av antalen är 30 vanliga paket.
const CLUSTERS=Object.freeze([
  ['line3',7],['pair',29],['arc4',45],['zig3',66],['pair',86],['line3',104],['arc4',124],['zig3',146],['pair',168],['pair',188],['pair',212]
]);
// Bonuspaket ligger några meter vid sidan av spåret (valfria avstickare) och är större, guldiga och har en ljusstråle.
// [båglängd längs spåret, föredragen sida (+1 utåt / −1 inåt)]. Själva platsen väljs så att den ligger 5–11 m från den väg man går
// när man följer paketen, men inte så långt att man tappar den ur sikte.
const BONUS=Object.freeze([[58,1],[132,-1],[196,1]]);
export const BONUS_DETOUR=Object.freeze({min:5,max:11});

export function buildIntroLayout(){
  const pkgs=[];let n=0;
  const push=(x,z,kind,cluster)=>pkgs.push({id:kind==='bonus'?'i:b'+(pkgs.filter(p=>p.kind==='bonus').length+1):'i:'+String(++n).padStart(2,'0'),x:+x.toFixed(2),z:+z.toFixed(2),kind,cluster});
  CLUSTERS.forEach(([shape,s0],ci)=>{
    for(const [ds,lat] of SHAPES[shape]){
      const a=atArc(s0+ds);let x=a.x+a.nx*lat,z=a.z+a.nz*lat;
      ({x,z}=clearOfProps(x,z));
      push(x,z,'regular',ci);
    }
  });
  const end=atArc(SPIRAL_LENGTH),tomte={x:+(end.x+end.nx*1.4+end.tx*1.2).toFixed(2),z:+(end.z+end.nz*1.4+end.tz*1.2).toFixed(2),radius:3.4};
  const start=atArc(0),first=atArc(3);
  // Vägen man går om man tar paketen i ordning (spawn → alla vanliga paket → tomten). Bonuspaketen får inte ligga på den.
  const walked=[{x:start.x,z:start.z},...pkgs.filter(p=>p.kind==='regular'),tomte];
  BONUS.forEach(([s0,side],i)=>{
    const a=atArc(s0);let best=null;
    for(let m=BONUS_DETOUR.min+.5;m<=BONUS_DETOUR.max+2;m+=.5)for(const sg of [side,-side]){
      const c=clearOfProps(a.x+a.nx*sg*m,a.z+a.nz*sg*m),d=distanceToPath(c,walked);
      if(d>=BONUS_DETOUR.min&&d<=BONUS_DETOUR.max&&Math.hypot(c.x-TREE.x,c.z-TREE.z)>TREE.radius+3&&Math.abs(c.x)<=36&&c.z>=-30&&c.z<=36){best={x:c.x,z:c.z};break;}
    }
    if(!best){const c=clearOfProps(a.x+a.nx*side*8,a.z+a.nz*side*8);best={x:c.x,z:c.z};}
    push(best.x,best.z,'bonus',100+i);
  });
  const yaw=(Math.atan2(-(first.x-start.x),-(first.z-start.z))*180/Math.PI+360)%360;
  return {spawn:{x:+start.x.toFixed(2),z:+start.z.toFixed(2),yaw:Math.round(yaw)},tree:{...TREE},tomte,packages:pkgs,length:SPIRAL_LENGTH,goal:INTRO_GOAL};
}

export function distanceToPath(p,pts){
  let m=Infinity;
  for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz,t=l2?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l2)):0;m=Math.min(m,Math.hypot(a.x+dx*t-p.x,a.z+dz*t-p.z));}
  return m;
}
// Flytta en punkt ut ur närheten av bänkar, planteringar, lyktor och träd (högst ett par meter).
export function clearOfProps(x,z){
  for(let pass=0;pass<4;pass++){
    let moved=false;
    for(const [px,pz] of TORGET_PROPS){
      const d=Math.hypot(x-px,z-pz);
      if(d<PROP_CLEARANCE){const k=(PROP_CLEARANCE+.15)/(d||1);x=px+(x-px||.01)*k;z=pz+(z-pz||.01)*k;moved=true;}
    }
    const dt=Math.hypot(x-TREE.x,z-TREE.z);
    if(dt<TREE.radius+1.4){const k=(TREE.radius+1.55)/(dt||1);x=TREE.x+(x-TREE.x||.01)*k;z=TREE.z+(z-TREE.z||.01)*k;moved=true;}
    if(!moved)break;
  }
  return {x,z};
}
export const INTRO=buildIntroLayout();
