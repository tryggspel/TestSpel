export const CITY27_VERSION='2.7.1';
export const ORIGIN27=Object.freeze({lat:59.380767,lon:13.50295});
export const MITT_I_CITY_OSM=550299956;
export const BLACKOUT_27=Object.freeze({seconds:4,cooldown:150});
export const MALL_INTERIOR_271=Object.freeze({upper:5.4,rampDepth:11,rampWidth:2.6,rampOffset:2.6,upperWidthFactor:.48,upperDepthFactor:.42,ring:4.1});
export const PLACES27=Object.freeze([
  Object.freeze({id:'mitt-i-city',name:'MITT I CITY',lat:59.37988,lon:13.50055,kind:'mall'}),
  Object.freeze({id:'duvan',name:'DUVAN',lat:59.37857,lon:13.49948,kind:'mall'}),
  Object.freeze({id:'ahlens',name:'ÅHLÉNS',lat:59.37876,lon:13.49904,kind:'department-store'}),
  Object.freeze({id:'stadshotellet',name:'STADSHOTELLET',lat:59.38132,lon:13.500656,kind:'hotel'}),
  Object.freeze({id:'varmlands-museum',name:'VÄRMLANDS MUSEUM',lat:59.38492,lon:13.50124,kind:'museum'}),
  Object.freeze({id:'sandgrundsudden',name:'SANDGRUNDSUDDEN',lat:59.38464,lon:13.50275,kind:'park'})
]);
export const QUICK_PLACES_271=Object.freeze([
  Object.freeze({id:'torget',name:'Stora Torget'}),
  Object.freeze({id:'mitt-i-city',name:'Mitt i City'}),
  Object.freeze({id:'domkyrkan',name:'Domkyrkan'}),
  Object.freeze({id:'sandgrund',name:'Sandgrund'}),
  Object.freeze({id:'olearys',name:'O’Learys'}),
  Object.freeze({id:'varmlands-museum',name:'Värmlands museum'}),
  Object.freeze({id:'duvan',name:'Duvan'}),
  Object.freeze({id:'ahlens',name:'Åhléns'}),
  Object.freeze({id:'stadshotellet',name:'Stadshotellet'}),
  Object.freeze({id:'biblioteket',name:'Biblioteket'})
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
const asLayout=input=>Array.isArray(input)?mittICityLayout(input):input;
const wall=(name,minx,maxx,minz,maxz,extra={})=>({name,minx,maxx,minz,maxz,height:6,source:'city27-mitt-i-city',...extra});
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
export function mittICityUpperRailColliders(input=[]){
  const b=asLayout(input),cfg=MALL_INTERIOR_271,aw=Math.max(34,b.w)*cfg.upperWidthFactor,ad=Math.max(28,b.d)*cfg.upperDepthFactor;
  const hx=Math.max(.8,(aw-2*cfg.ring)/2),hz=Math.max(.8,(ad-2*cfg.ring)/2),t=.16,gap=1.65;
  const xs=[[-hx,-cfg.rampOffset-gap],[-cfg.rampOffset+gap,cfg.rampOffset-gap],[cfg.rampOffset+gap,hx]].filter(v=>v[1]-v[0]>.25);
  const rails=[];
  for(const z of [b.z-hz,b.z+hz])for(const [a,c] of xs)rails.push(wall('Mitt i City · atriumräcke',b.x+a,b.x+c,z-t,z+t,{source:'city271-upper-rail',minY:5.7,maxY:8.6,height:1.3}));
  rails.push(wall('Mitt i City · atriumräcke väst',b.x-hx-t,b.x-hx+t,b.z-hz,b.z+hz,{source:'city271-upper-rail',minY:5.7,maxY:8.6,height:1.3}));
  rails.push(wall('Mitt i City · atriumräcke öst',b.x+hx-t,b.x+hx+t,b.z-hz,b.z+hz,{source:'city271-upper-rail',minY:5.7,maxY:8.6,height:1.3}));
  return rails;
}
export function mittICityFloorAt(input,x,z,currentFeet=0){
  const b=asLayout(input),cfg=MALL_INTERIOR_271;
  if(!b||x<b.minx||x>b.maxx||z<b.minz||z>b.maxz)return 0;
  const halfD=cfg.rampDepth/2,halfW=cfg.rampWidth/2;
  for(const side of [-1,1]){
    const cx=b.x+side*cfg.rampOffset;
    if(Math.abs(x-cx)<=halfW&&z>=b.z-halfD&&z<=b.z+halfD){
      let t=(z-(b.z-halfD))/cfg.rampDepth;
      if(side>0)t=1-t;
      return .05+Math.max(0,Math.min(1,t))*(cfg.upper-.05);
    }
  }
  const aw=Math.max(34,b.w)*cfg.upperWidthFactor,ad=Math.max(28,b.d)*cfg.upperDepthFactor;
  const outer=Math.abs(x-b.x)<=aw/2&&Math.abs(z-b.z)<=ad/2;
  const innerW=Math.max(.4,aw-2*cfg.ring),innerD=Math.max(.4,ad-2*cfg.ring);
  const ring=outer&&(Math.abs(x-b.x)>=innerW/2||Math.abs(z-b.z)>=innerD/2);
  return ring&&currentFeet>=cfg.upper*.65?cfg.upper:0;
}
export function applyCity27Colliders(colliders=[],buildings=[]){
  const keep=colliders.filter(c=>Number(c.osm)!==MITT_I_CITY_OSM&&!['city27-mitt-i-city','city271-upper-rail'].includes(c.source));
  return [...keep,...mittICityColliders(buildings),...mittICityUpperRailColliders(buildings)];
}
export function pointBlockedBy(colliders,p,r=.42,y=0){
  return colliders.some(c=>{
    if(Number.isFinite(c.minY)&&y<c.minY)return false;
    if(Number.isFinite(c.maxY)&&y>c.maxY)return false;
    return p.x+r>c.minx&&p.x-r<c.maxx&&p.z+r>c.minz&&p.z-r<c.maxz;
  });
}
export function canBlackout27(spent,lastBlackout=-Infinity){
  return !Number.isFinite(lastBlackout)||spent-lastBlackout>=BLACKOUT_27.cooldown;
}
