// Gågator i spelets område enligt OpenStreetMap (highway=pedestrian), © OpenStreetMap contributors.
// Drottninggatan och Västra Torggatan är Karlstads gågator i centrum, plus en gatstensyta vid Museigatan.
// Gångfartsområden (living_street) räknas inte som gågata.
import {CITY_STREETS} from './city-streets.mjs?v=2.11.24';
export const PEDESTRIAN_STREETS=Object.freeze(CITY_STREETS.filter(s=>s.pedestrian).map(s=>Object.freeze({osm:s.osm,name:s.name,width:s.width,points:s.points})));
// Gågatuyta med gatsten längs Klarälven vid Museigatan (OSM way 923099551, highway=pedestrian,
// area=yes, surface=sett). Saknar namn i OSM; spelet kallar den efter gatan den följer.
export const PEDESTRIAN_SQUARE=Object.freeze({osm:923099551,name:'Museigatan · kajen',points:[[-164.64, -47.15], [-167.94, -47.99], [-171.34, -49.04], [-174.15, -49.32], [-178.77, -48.7], [-178.71, -52.03], [-179.67, -54.46], [-182.06, -57.19], [-184.79, -59.49], [-179.05, -64.85], [-174.49, -70.16], [-169.6, -76.81], [-164.36, -89.89], [-160.76, -100.96], [-157.15, -114.67], [-154.35, -126.65], [-151.66, -137.51], [-149.65, -145.36], [-148.68, -152.37], [-148.36, -155.84], [-149.28, -165.49], [-150.11, -174.4], [-153.25, -199.49], [-156.94, -223.39], [-167.45, -272.03], [-173.45, -297.55], [-178.16, -310.94], [-182.45, -325.63], [-174.21, -325.35], [-165.93, -325.14], [-148.94, -324.78], [-149.12, -321.68], [-149.52, -319.27], [-158.56, -319.1], [-162.39, -312.4], [-159.47, -300.68], [-156.44, -288.41], [-153.42, -274.73], [-150.13, -259.58], [-149.13, -254.57], [-147.49, -246.38], [-143.63, -228.9], [-141.09, -216.05], [-138.95, -202.64], [-137.03, -189.7], [-136.75, -178.14], [-136.77, -167.14], [-137.77, -157.95], [-138.68, -155.68], [-139.17, -153.25], [-147.0, -116.86], [-147.25, -112.85], [-153.39, -87.48], [-158.96, -66.42], [-158.23, -65.11], [-155.94, -60.9], [-155.92, -58.06], [-157.16, -53.53], [-158.85, -51.5], [-162.11, -52.23], [-164.81, -51.17], [-164.64, -47.15]]});
export const PEDESTRIAN_NAMES=Object.freeze([...new Set(PEDESTRIAN_STREETS.map(s=>s.name))]);
const SQ={minx:Math.min(...PEDESTRIAN_SQUARE.points.map(p=>p[0])),maxx:Math.max(...PEDESTRIAN_SQUARE.points.map(p=>p[0])),minz:Math.min(...PEDESTRIAN_SQUARE.points.map(p=>p[1])),maxz:Math.max(...PEDESTRIAN_SQUARE.points.map(p=>p[1]))};
function inside(x,z,ps){let hit=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const a=ps[i],b=ps[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
const segs=PEDESTRIAN_STREETS.flatMap(s=>s.points.slice(1).map((p,i)=>({a:s.points[i],b:p,w:s.width/2+2.2,name:s.name})));
const box=segs.map(s=>({minx:Math.min(s.a[0],s.b[0])-s.w,maxx:Math.max(s.a[0],s.b[0])+s.w,minz:Math.min(s.a[1],s.b[1])-s.w,maxz:Math.max(s.a[1],s.b[1])+s.w}));
// Returnerar gatunamnet om punkten ligger på en gågata (inkl. trottoarbredd), annars null.
export function pedestrianAt(p){
  if(!p)return null;const x=p.x,z=p.z;
  if(x>SQ.minx&&x<SQ.maxx&&z>SQ.minz&&z<SQ.maxz&&inside(x,z,PEDESTRIAN_SQUARE.points))return PEDESTRIAN_SQUARE.name;
  for(let i=0;i<segs.length;i++){
    const b=box[i];if(x<b.minx||x>b.maxx||z<b.minz||z>b.maxz)continue;
    const s=segs[i],dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],t=Math.max(0,Math.min(1,((x-s.a[0])*dx+(z-s.a[1])*dz)/((dx*dx+dz*dz)||1)));
    if(Math.hypot(x-s.a[0]-t*dx,z-s.a[1]-t*dz)<=s.w)return s.name;
  }
  return null;
}
// GÅGATA-skyltar där gågatan börjar/slutar mot vanlig gata (ändpunkter som inte delas av en annan gågatudel).
export const GAGATA_SIGNS=Object.freeze((()=>{
  const ends=[];
  for(const s of PEDESTRIAN_STREETS)for(const [p,q] of [[s.points[0],s.points[1]],[s.points.at(-1),s.points.at(-2)]]){
    const shared=PEDESTRIAN_STREETS.some(o=>o!==s&&[o.points[0],o.points.at(-1)].some(e=>Math.hypot(e[0]-p[0],e[1]-p[1])<1.5));
    if(shared)continue;const d=Math.hypot(q[0]-p[0],q[1]-p[1])||1;
    // Skylten står vid trottoarkanten, tittar längs gatan.
    ends.push({x:p[0]+(q[1]-p[1])/d*(s.width/2+1.6),z:p[1]-(q[0]-p[0])/d*(s.width/2+1.6),yaw:Math.atan2(p[0]-q[0],p[1]-q[1])*180/Math.PI,name:s.name});
  }
  return ends.filter((e,i)=>!ends.slice(0,i).some(o=>Math.hypot(o.x-e.x,o.z-e.z)<12));
})());
