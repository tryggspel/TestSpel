export const CITY27_VERSION='2.7.0';
export const ORIGIN27=Object.freeze({lat:59.380767,lon:13.50295});
export const MITT_I_CITY_OSM=550299956;
export const BLACKOUT_27=Object.freeze({seconds:4,cooldown:150});
export const PLACES27=Object.freeze([
  Object.freeze({id:'mitt-i-city',name:'MITT I CITY',lat:59.37988,lon:13.50055,kind:'mall'}),
  Object.freeze({id:'duvan',name:'DUVAN',lat:59.37857,lon:13.49948,kind:'mall'}),
  Object.freeze({id:'ahlens',name:'ÅHLÉNS',lat:59.37876,lon:13.49904,kind:'department-store'}),
  Object.freeze({id:'stadshotellet',name:'STADSHOTELLET',lat:59.38132,lon:13.500656,kind:'hotel'}),
  Object.freeze({id:'varmlands-museum',name:'VÄRMLANDS MUSEUM',lat:59.38492,lon:13.50124,kind:'museum'}),
  Object.freeze({id:'sandgrundsudden',name:'SANDGRUNDSUDDEN',lat:59.38464,lon:13.50275,kind:'park'})
]);

export function city27Point(lon,lat){
  const lat0=ORIGIN27.lat*Math.PI/180;
  return {x:(lon-ORIGIN27.lon)*111320*Math.cos(lat0),z:-(lat-ORIGIN27.lat)*110540};
}
export function place27(id){
  const p=PLACES27.find(p=>p.id===id);return p?{...p,...city27Point(p.lon,p.lat)}:null;
}
export function mittICityLayout(buildings=[]){
  const b=buildings.find(b=>Number(b.osm)===MITT_I_CITY_OSM);
  if(b&&[b.minx,b.maxx,b.minz,b.maxz].every(Number.isFinite)){
    return {osm:MITT_I_CITY_OSM,x:(b.minx+b.maxx)/2,z:(b.minz+b.maxz)/2,minx:b.minx,maxx:b.maxx,minz:b.minz,maxz:b.maxz,w:b.maxx-b.minx,d:b.maxz-b.minz};
  }
  const p=place27('mitt-i-city');
  return {osm:MITT_I_CITY_OSM,x:p.x,z:p.z,minx:p.x-21,maxx:p.x+21,minz:p.z-16,maxz:p.z+16,w:42,d:32};
}
const wall=(name,minx,maxx,minz,maxz)=>({name,minx,maxx,minz,maxz,height:6,source:'city27-mitt-i-city'});
export function mittICityColliders(buildings=[]){
  const b=mittICityLayout(buildings),gap=7.2,t=.65,x=(b.minx+b.maxx)/2,z=(b.minz+b.maxz)/2;
  const leftEnd=x-gap/2,rightStart=x+gap/2,topEnd=z-gap/2,bottomStart=z+gap/2;
  return [
    wall('Mitt i City · nordvägg A',b.minx,leftEnd,b.minz-t,b.minz+t),wall('Mitt i City · nordvägg B',rightStart,b.maxx,b.minz-t,b.minz+t),
    wall('Mitt i City · sydvägg A',b.minx,leftEnd,b.maxz-t,b.maxz+t),wall('Mitt i City · sydvägg B',rightStart,b.maxx,b.maxz-t,b.maxz+t),
    wall('Mitt i City · västvägg A',b.minx-t,b.minx+t,b.minz,topEnd),wall('Mitt i City · västvägg B',b.minx-t,b.minx+t,bottomStart,b.maxz),
    wall('Mitt i City · östvägg A',b.maxx-t,b.maxx+t,b.minz,topEnd),wall('Mitt i City · östvägg B',b.maxx-t,b.maxx+t,bottomStart,b.maxz)
  ];
}
export function applyCity27Colliders(colliders=[],buildings=[]){
  const keep=colliders.filter(c=>Number(c.osm)!==MITT_I_CITY_OSM&&c.source!=='city27-mitt-i-city');
  return [...keep,...mittICityColliders(buildings)];
}
export function pointBlockedBy(colliders,p,r=.42){
  return colliders.some(c=>p.x+r>c.minx&&p.x-r<c.maxx&&p.z+r>c.minz&&p.z-r<c.maxz);
}
export function canBlackout27(spent,lastBlackout=-Infinity){
  return !Number.isFinite(lastBlackout)||spent-lastBlackout>=BLACKOUT_27.cooldown;
}
