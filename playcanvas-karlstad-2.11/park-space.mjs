import {PENINSULA_SHORE,PARK_PIERS,PARK_PATHS} from './city-sites.mjs?v=2.17.1';
const half=PENINSULA_SHORE.length/2;
// OSM-derived bank limits, two-metre rows: constant-time water collision at runtime.
export function peninsulaBanks(z){
  const i=Math.max(0,Math.min(half-1,Math.round((z+846)/2)));
  return [PENINSULA_SHORE[i][0],PENINSULA_SHORE[PENINSULA_SHORE.length-1-i][0]];
}
export function inPolygon(x,z,ps){let yes=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){
  const a=ps[i],b=ps[j];if((a[1]>z)!=(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;
}return yes;}
export function waterBlocked(x,z){
  if(x>-157.6&&x<-144.7&&z>-462.8&&z<-360.9)return true;
  // 2.11: sömmen mot city-south-space (som börjar vid z=-318) lämnade en 2 m torr remsa rakt
  // över Klarälven vid z∈[-320,-318). Parkens strandrader täcker nu ända fram till -318.
  if(z>=-318)return false;
  if(z<-844)return true;
  const [left,right]=peninsulaBanks(z);
  if(x>left+.65&&x<right-.65)return false;
  if(onParkPath(x,z))return false; // drawn paths and boardwalks that lead out over the water are walkable
  return !PARK_PIERS.some(p=>inPolygon(x,z,p.points)&&inPolygon(x+.5,z,p.points)&&inPolygon(x-.5,z,p.points));
}
export function onParkPath(x,z){
  for(const path of PARK_PATHS){
    const half=(path.width||2)/2+.9,ps=path.points;
    for(let i=1;i<ps.length;i++){
      const [ax,az]=ps[i-1],[bx,bz]=ps[i],dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz;
      const t=len2?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/len2)):0;
      const qx=ax+dx*t-x,qz=az+dz*t-z;
      if(qx*qx+qz*qz<=half*half)return true;
    }
  }
  return false;
}
export const PARK_ENCOUNTERS=Object.freeze([
  {id:'museum-fight',name:'MUSEIVAKTEN HAR RAST',x:-173,z:-457,spawnX:-175,spawnZ:-446},
  {id:'pier-fight',name:'INGET BAD UTAN PÅTÅR',x:-226,z:-550,spawnX:-217,spawnZ:-571},
  {id:'grove-fight',name:'DET PRASSLAR I MAGNOLIAN',x:-245,z:-697,spawnX:-225,spawnZ:-711}
]);
