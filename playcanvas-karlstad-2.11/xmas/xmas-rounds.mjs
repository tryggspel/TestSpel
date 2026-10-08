// Julklappsjakten: julrundor. En runda är en rutt genom staden (hämtad ur spelets egen gångbara karta) där paketen ligger i små grupper
// med jämna mellanrum, tre bonuspaket vid sidan av och en tomte som tar emot paketen. Ren modul: staden kommer in som funktioner
// (nav.point, nav.path, nav.clear, blocked), så att samma kod kan provas mot en påhittad karta i test och mot den riktiga i spelet.
//
// Samma regler som introduktionen: paketen ligger på gångbar mark inom ett par meter från rutten, grupperna 11–15 m isär (en insamling var
// 2–4 sekund på normal gångfart), allt som krävs för målet går att nå, och bonuspaketen är valfria avstickare 4–9 m från rutten.
import {SHAPES,TORGET_PROPS,distanceToPath,TREE,INTRO} from './xmas-layout.mjs?v=2.21.1-xmas.1';
import {STALLS,ARCH} from './xmas-decor-data.mjs?v=2.21.1-xmas.1';
import {seededRandom} from './xmas-hunt.mjs?v=2.21.1-xmas.1';

const hashStr=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
// Platser i staden (meter öster/söder om Stora Torget). Stannar på gångbar mark genom att nav.point flyttar dem till närmaste gångbara punkt.
export const WAYPOINTS=Object.freeze({
  torget:{x:0,z:27},tomte:INTRO.tomte,pressbyran14:{x:31,z:-53},domkyrkan:{x:160,z:-84},radhuset:{x:-64,z:-4},
  mitticity:{x:-117,z:36},espresso15:{x:-52,z:179},pressbyran20:{x:-158,z:158},espresso22:{x:-188,z:157},stadshotellet:{x:-132,z:-50},oleary:{x:48,z:45}
});
export const ROUNDS=Object.freeze([
  Object.freeze({id:'round-torget',title:'TORGETS PAKETREGN',blurb:'Tomtarna har tappat paket över hela torget. Plocka dem i valfri ordning.',kind:'scatter',soft:150,goalShare:.68}),
  Object.freeze({id:'round-kungsgatan',title:'KUNGSGATANS JULRUNDA',blurb:'Följ paketen längs Kungsgatan och tillbaka till tomten vid granen.',kind:'route',soft:165,goalShare:.56,
    via:Object.freeze(['torget','pressbyran14','domkyrkan','radhuset','torget'])}),
  Object.freeze({id:'round-drottninggatan',title:'DROTTNINGGATANS JULRUNDA',blurb:'En lång runda genom Mitt i City och längs Drottninggatan, tillbaka till granen.',kind:'route',soft:180,goalShare:.5,
    via:Object.freeze(['torget','mitticity','espresso15','pressbyran20','mitticity','torget'])})
]);
export const roundById=id=>ROUNDS.find(r=>r.id===id)||null;
// Nästa runda att spela: första utan stämpel, annars i tur och ordning efter hur många rundor man spelat.
export function nextRound(save){
  const open=ROUNDS.find(r=>!save.hasStamp(r.id));if(open)return open;
  const n=(save.state?.totals?.runs||0);return ROUNDS[n%ROUNDS.length];
}

// ── Rutten som en tät punktlista ────────────────────────────────────────────────────────────────────────────────────
export function routePolyline(def,nav){
  const stops=def.via.map(id=>WAYPOINTS[id]||WAYPOINTS.torget),out=[];
  for(let i=0;i<stops.length-1;i++){
    const a=nav.point(stops[i]),b=nav.point(stops[i+1]);
    let p=nav.path(a,b);if(!p||p.length<2)p=[a,b];
    if(nav.smooth)p=nav.smooth(p);
    for(let k=0;k<p.length;k++){if(out.length&&!k)continue;out.push({x:p[k].x,z:p[k].z});}
  }
  return out;
}
export function resample(poly,step=1){
  const out=[];if(poly.length<2)return poly.slice();
  let carry=0;out.push({x:poly[0].x,z:poly[0].z,s:0});let s=0;
  for(let i=1;i<poly.length;i++){
    const a=poly[i-1],b=poly[i],len=Math.hypot(b.x-a.x,b.z-a.z);if(len<1e-6)continue;
    let t=step-carry;
    while(t<=len){out.push({x:a.x+(b.x-a.x)*t/len,z:a.z+(b.z-a.z)*t/len,s:s+t});t+=step;}
    carry=len-(t-step);s+=len;
  }
  for(let i=0;i<out.length;i++){const a=out[Math.max(0,i-2)],b=out[Math.min(out.length-1,i+2)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;out[i].tx=dx/l;out[i].tz=dz/l;out[i].nx=-dz/l;out[i].nz=dx/l;}
  return out;
}

// ── Utläggning ───────────────────────────────────────────────────────────────────────────────────────────────────────
const SHAPE_ORDER=Object.freeze(['line3','pair','arc4','zig3','pair','line3','arc4','zig3']);
const GAPS=Object.freeze([16,19,17,21,18,20]);
export const ROUND_LIMITS=Object.freeze({minGap:12,maxLateral:1.6,bonusMin:4,bonusMax:9});

function placeClusters(pts,nav,idPrefix){
  const packages=[],centers=[];let s=8,k=0;
  while(s<pts[pts.length-1].s-7){
    const c=pts[Math.min(pts.length-1,Math.floor(s))];
    if(centers.every(q=>Math.hypot(q.x-c.x,q.z-c.z)>=ROUND_LIMITS.minGap)){
      const shape=SHAPES[SHAPE_ORDER[k%SHAPE_ORDER.length]],items=[];
      for(const [ds,lat] of shape){
        const a=pts[Math.min(pts.length-1,Math.floor(s+ds))];let x=a.x+a.nx*lat,z=a.z+a.nz*lat;
        if(nav.blocked(x,z)||!nav.clear(a,{x,z})){x=a.x;z=a.z;}
        if(nav.blocked(x,z))continue;
        if(packages.some(p=>Math.hypot(p.x-x,p.z-z)<1.5))continue;
        items.push({x,z});
      }
      if(items.length>=2){
        centers.push({x:c.x,z:c.z});
        for(const it of items)packages.push({id:idPrefix+':'+String(packages.length+1).padStart(2,'0'),x:+it.x.toFixed(2),z:+it.z.toFixed(2),kind:'regular',cluster:k});
        k++;
      }
    }
    s+=GAPS[k%GAPS.length];
  }
  return {packages,centers};
}
function placeBonus(pts,nav,packages,centers,idPrefix,n=3){
  const out=[];
  for(let i=0;i<n&&centers.length>4;i++){
    const ci=Math.floor(centers.length*(i+.6)/(n+.2)),c=centers[Math.min(centers.length-1,ci)];
    // närmaste punkt på rutten, och dess sida
    let best=pts[0],bd=Infinity;for(const p of pts){const d=Math.hypot(p.x-c.x,p.z-c.z);if(d<bd){bd=d;best=p;}}
    let found=null;
    for(let m=ROUND_LIMITS.bonusMin+.5;m<=ROUND_LIMITS.bonusMax&&!found;m+=.5)for(const sg of (i%2?[1,-1]:[-1,1])){
      const x=best.x+best.nx*sg*m,z=best.z+best.nz*sg*m;
      if(nav.blocked(x,z)||!nav.clear(best,{x,z}))continue;
      if(distanceToPath({x,z},pts)<ROUND_LIMITS.bonusMin)continue;
      if(packages.some(p=>Math.hypot(p.x-x,p.z-z)<3)||out.some(p=>Math.hypot(p.x-x,p.z-z)<12))continue;
      found={x,z};break;
    }
    if(found)out.push({id:idPrefix+':b'+(out.length+1),x:+found.x.toFixed(2),z:+found.z.toFixed(2),kind:'bonus',cluster:100+i});
  }
  return out;
}
// Torgets paketregn: grupper utspridda över hela torget (inget fast spår), med fria stråk mellan stånden, granen och portalen.
function scatterClusters(nav,idPrefix,rand){
  const packages=[],centers=[];let k=0,tries=0;
  const keepOut=[{x:TREE.x,z:TREE.z,r:7},{x:ARCH.x,z:ARCH.z,r:7},...STALLS.map(s=>({x:s.x,z:s.z,r:5})),...TORGET_PROPS.map(([x,z])=>({x,z,r:2.4})),{x:INTRO.tomte.x,z:INTRO.tomte.z,r:6}];
  while(centers.length<15&&tries++<900){
    const x=-46+rand()*92,z=-26+rand()*62;
    if(!(z<34))continue;
    if(keepOut.some(o=>Math.hypot(o.x-x,o.z-z)<o.r))continue;
    if(centers.some(c=>Math.hypot(c.x-x,c.z-z)<13.5))continue;
    if(nav.blocked(x,z))continue;
    const shape=SHAPES[SHAPE_ORDER[k%SHAPE_ORDER.length]],ang=rand()*Math.PI*2,tx=Math.sin(ang),tz=Math.cos(ang),items=[];
    for(const [ds,lat] of shape){const px=x+tx*ds+(-tz)*lat,pz=z+tz*ds+tx*lat;if(nav.blocked(px,pz)||keepOut.some(o=>Math.hypot(o.x-px,o.z-pz)<o.r*.7))continue;items.push({x:px,z:pz});}
    if(items.length<2)continue;
    centers.push({x,z});for(const it of items)packages.push({id:idPrefix+':'+String(packages.length+1).padStart(2,'0'),x:+it.x.toFixed(2),z:+it.z.toFixed(2),kind:'regular',cluster:k});k++;
  }
  return {packages,centers};
}
function scatterBonus(nav,packages,centers,idPrefix,rand){
  const out=[];let tries=0;
  while(out.length<3&&tries++<400){
    const x=-42+rand()*84,z=-22+rand()*54;
    if(nav.blocked(x,z)||centers.some(c=>Math.hypot(c.x-x,c.z-z)<5)||packages.some(p=>Math.hypot(p.x-x,p.z-z)<3)||out.some(p=>Math.hypot(p.x-x,p.z-z)<22))continue;
    if(Math.hypot(x-TREE.x,z-TREE.z)<9||Math.hypot(x-INTRO.tomte.x,z-INTRO.tomte.z)<8)continue;
    if(STALLS.some(s=>Math.hypot(s.x-x,s.z-z)<5)||Math.hypot(x-ARCH.x,z-ARCH.z)<7)continue;
    out.push({id:idPrefix+':b'+(out.length+1),x:+x.toFixed(2),z:+z.toFixed(2),kind:'bonus',cluster:100+out.length});
  }
  return out;
}

// Bygger en runda till ett färdigt run-objekt för XmasHunt.startRun().
export function buildRound(def,nav){
  const rand=seededRandom(hashStr(def.id));let packages,centers,pts=null,length=0;
  if(def.kind==='scatter'){
    ({packages,centers}=scatterClusters(nav,def.id,rand));
    packages.push(...scatterBonus(nav,packages,centers,def.id,rand));
    length=centers.length*14;
  }else{
    pts=resample(routePolyline(def,nav),1);
    ({packages,centers}=placeClusters(pts,nav,def.id));
    packages.push(...placeBonus(pts,nav,packages,centers,def.id));
    length=pts.at(-1)?.s||0;
  }
  const regular=packages.filter(p=>p.kind==='regular').length,goal=Math.max(12,Math.min(regular,Math.round(regular*def.goalShare)));  // målet är drygt hälften: man behöver inte ta allt
  const start=WAYPOINTS.torget,first=pts?pts[Math.min(pts.length-1,12)]:{x:0,z:0};
  const yaw=(Math.atan2(-(first.x-start.x),-(first.z-start.z))*180/Math.PI+360)%360;
  return {kind:'round',id:def.id,title:def.title,goal,packages,tomte:{...INTRO.tomte},spawn:{x:start.x,z:start.z,yaw:Math.round(yaw)},tree:{...TREE},soft:def.soft,stampId:def.id,windowSec:3.6,length:Math.round(length),route:pts};
}
