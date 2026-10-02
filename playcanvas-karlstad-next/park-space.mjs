import {PENINSULA_SHORE,PARK_PIERS} from './city-sites.mjs?v=2.9.0';
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
  if(z>=-320)return false;
  if(z<-844)return true;
  const [left,right]=peninsulaBanks(z);
  if(x>left+.65&&x<right-.65)return false;
  return !PARK_PIERS.some(p=>inPolygon(x,z,p.points)&&inPolygon(x+.5,z,p.points)&&inPolygon(x-.5,z,p.points));
}
export const PARK_ENCOUNTERS=Object.freeze([
  {id:'museum-fight',name:'MUSEIVAKTEN HAR RAST',x:-173,z:-457,spawnX:-175,spawnZ:-446},
  {id:'pier-fight',name:'INGET BAD UTAN PÅTÅR',x:-226,z:-550,spawnX:-217,spawnZ:-571},
  {id:'grove-fight',name:'DET PRASSLAR I MAGNOLIAN',x:-245,z:-697,spawnX:-225,spawnZ:-711}
]);
