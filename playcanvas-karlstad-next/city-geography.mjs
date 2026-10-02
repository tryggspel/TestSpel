// One coordinate system for buildings, signs, the street mesh and the player map.
export {CITY_STREETS} from './city-streets.mjs?v=2.9.0';
import {CITY_STREETS} from './city-streets.mjs?v=2.9.0';
import {MUSEUM_BUILDING,PENINSULA_SHORE,PARK_PATHS,PARK_PIERS} from './city-sites.mjs?v=2.9.0';
import {MALL_ENTRANCES,MALL_CORRIDORS} from './mall-space.mjs?v=2.9.0';
import {EXT_BUILDINGS,SOUTH_STREETS,RAIL_LINES} from './city-south-data.mjs?v=2.9.0';
import {SOUTH_IDS,SOUTH_PLACES} from './city-south-space.mjs?v=2.9.0';
import {drawSouthWater} from './city-south.js?v=2.9.0';
export const CITY_ORIGIN=Object.freeze({lat:59.380767,lon:13.50295});
export function cityPoint(lon,lat){return {x:(lon-CITY_ORIGIN.lon)*111320*Math.cos(CITY_ORIGIN.lat*Math.PI/180),z:-(lat-CITY_ORIGIN.lat)*110540};}
export const LANDMARKS=Object.freeze([
  {id:'radhuset',osm:101456563,name:'Rådhuset',front:'east'},
  {id:'domkyrkan',osm:75070676,name:'Domkyrkan',front:'west'},
  {id:'biblioteket',osm:75360972,name:'Stadsbiblioteket',front:'west'},
  {id:'sandgrund',osm:95639598,name:'Sandgrund',front:'south'},
  {id:'museum',osm:1151016,name:'Värmlands museum',front:'south'},
  {id:'stadshotellet',osm:102496100,name:'Elite Stadshotellet',front:'south'},
  {id:'hotel-wing',osm:103695866,name:'Stadshotellet · älvfasad',front:'west'},
  {id:'duvan',osm:102190062,name:'Galleria Duvan',front:'west'},
  {id:'ahlens',osm:102026709,name:'Åhléns',front:'east'}
]);
// Store locator pins are not always on the facade. Bind to the address's OSM building,
// then project onto its street-facing wall. Never place a shop on an arbitrary nearby house.
export const STOREFRONTS=Object.freeze([
  {id:'olearys',brand:'olearys',name:'O’Learys',address:'Tingvallagatan 9',osm:100833292,lon:13.503791,lat:59.380512,face:'north'},
  {id:'espresso22',brand:'espresso',name:'Espresso House',address:'Drottninggatan 22',osm:113214336,lon:13.49963,lat:59.3794,face:'south'},
  {id:'espresso15',brand:'espresso',name:'Espresso House',address:'Drottninggatan 15',osm:106078946,lon:13.502027,lat:59.379049,face:'north'},
  {id:'pressbyran14',brand:'pressbyran',name:'Pressbyrån',address:'Kungsgatan 14',osm:104778937,lon:13.5036259,lat:59.38107,face:'south'},
  {id:'pressbyran20',brand:'pressbyran',name:'Pressbyrån',address:'Drottninggatan 20',osm:110733723,lon:13.5001049,lat:59.37927,face:'south'}
]);
export const IDENTITY_IDS=new Set([...LANDMARKS.map(b=>b.osm),...SOUTH_IDS]);
export const SHOP_IDS=new Set(STOREFRONTS.map(b=>b.osm));
export const PLACE_ROUTES=['torget','olearys','sandgrund','domkyrkan','biblioteket','mitticity','duvan','ahlens','stadshotellet','museum','udden',...SOUTH_PLACES.map(p=>p.id)];
export const PLACE_SIGNS=Object.freeze([
  ...MALL_ENTRANCES.map((e,i)=>{const c=MALL_CORRIDORS[i];return {brand:'mitticity',name:'Mitt i City',...e,
    x:e.yaw===90?c.maxx+.22:e.yaw===-90?c.minx-.22:e.x,z:e.yaw===180?c.minz-.22:e.yaw===0?c.maxz+.22:e.z,y:3.45,w:6.5};}),
  {brand:'duvan',name:'Galleria Duvan',x:-201.25,z:237,y:4.1,yaw:-90,w:7.6},
  {brand:'ahlens',name:'Åhléns',x:-218.7,z:189,y:4.0,yaw:90,w:7.8},
  {brand:'museum',name:'Värmlands museum',x:-83,z:-457,y:2.8,yaw:0,w:6.2}
]);
export const STREET_SIGNS=Object.freeze([
  [-57,-36,'VÄSTRA TORGGATAN',0],[-57,-33,'KUNGSGATAN',90],
  [83,-26,'ÖSTRA TORGGATAN',0],[83,-23,'KUNGSGATAN',90],
  [-59,30,'TINGVALLAGATAN',90],[144,-28,'VÄSTRA KYRKOGATAN',0],
  [-51,-262,'VÄSTRA TORGGATAN',0],[-43,-375,'VÄSTRA TORGGATAN',0],
  [-66,164,'DROTTNINGGATAN',90]
]);
const reserved=new Set([...IDENTITY_IDS,...SHOP_IDS,234271401,106078938,107041955,109895687,113506286,127873579]);
export function cityBuildings(osm,max=95){
  const all=[],seen=new Set();
  for(const e of [...EXT_BUILDINGS,...(osm.elements||[]),MUSEUM_BUILDING]){
    if(seen.has(e.id))continue;seen.add(e.id);const tags=e.tags||{};
    if(!['way','relation'].includes(e.type)||!tags.building||!e.geometry||e.geometry.length<3)continue;
    const points=e.geometry.map(p=>cityPoint(+p.lon,+p.lat));
    let twiceArea=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];twiceArea+=a.x*b.z-b.x*a.z;}
    if(Math.abs(twiceArea)/2<18)continue;
    const minx=Math.min(...points.map(p=>p.x)),maxx=Math.max(...points.map(p=>p.x)),minz=Math.min(...points.map(p=>p.z)),maxz=Math.max(...points.map(p=>p.z));
    // A vertex average is not the centre of an AABB (it used to shift walls into streets).
    const cx=(minx+maxx)/2,cz=(minz+maxz)/2,dist=Math.hypot(cx,cz);
    if(dist>260&&!(reserved.has(e.id)&&dist<=650))continue;
    if(dist<9)continue;
    all.push({polygon:points.map(p=>[p.x,p.z]),osm:e.id,name:tags.name||tags['building:name']||'',tags,cx,cz,dist,minx,maxx,minz,maxz,sx:maxx-minx,sz:maxz-minz,h:Math.max(1,Math.min(8,parseFloat(tags['building:levels'])||3))*3.2});
  }
  return all.sort((a,b)=>Number(reserved.has(b.osm))-Number(reserved.has(a.osm))||a.dist-b.dist).slice(0,max);
}
export function storefrontAnchor(shop,buildings){
  const b=buildings.find(b=>b.osm===shop.osm);if(!b)return null;
  const p=cityPoint(shop.lon,shop.lat),margin=4.6;
  const x=Math.max(b.minx+margin,Math.min(b.maxx-margin,p.x));
  return {x,z:shop.face==='north'?b.minz-.26:b.maxz+.26,yaw:shop.face==='north'?180:0,osm:b.osm};
}
export function landmarkDestination(id,buildings){
  const extra=SOUTH_PLACES.find(p=>p.id===id);if(extra)return {...extra,id:'place-'+id,kind:'landmark',radius:4};
  if(id==='torget')return {x:0,z:0,id:'place-torget',kind:'landmark',label:'STORA TORGET',radius:4};
  if(id==='olearys'){const p=storefrontAnchor(STOREFRONTS.find(s=>s.id===id),buildings);return p?{...p,id:'place-olearys',kind:'landmark',label:'O’LEARYS',radius:4}:null;}
  if(id==='mitticity')return {...MALL_ENTRANCES[0],id:'place-mitticity',kind:'landmark',label:'MITT I CITY · TVÅ PLAN',radius:4,action:'GÅ IN GENOM ENTRÉN'};
  if(id==='udden')return {x:-199,z:-831,id:'place-udden',kind:'landmark',label:'SANDGRUNDSUDDEN',radius:4,action:'LETA EFTER SOLGÖMMAN'};
  const mark=LANDMARKS.find(m=>m.id===id),b=buildings.find(b=>b.osm===mark?.osm);if(!b)return null;
  const x=(b.minx+b.maxx)/2,z=(b.minz+b.maxz)/2;
  return {id:'place-'+id,kind:'landmark',label:mark.name.toUpperCase(),radius:5,action:'DU ÄR FRAMME',x:mark.front==='west'?b.minx-8:mark.front==='east'?b.maxx+8:x,z:mark.front==='south'?b.maxz+9:z};
}
const allStreets=[...CITY_STREETS,...SOUTH_STREETS];
export function streetAt(p){
  if(p.x<-10000)return 'KIL STATION';
  if(p.z>1200&&p.x<-700)return 'MARIEBERGSSKOGEN';
  if(p.z>480&&p.x>120)return 'INRE HAMN';
  if(p.z<-545)return 'SANDGRUNDSUDDEN';
  if(p.z<-460&&p.x<-40)return 'VÄRMLANDS MUSEUM';
  if(p.x>-61&&p.x<70&&p.z>-28&&p.z<41)return 'STORA TORGET';
  let best=Infinity,name='KARLSTAD';
  for(const street of allStreets)for(let i=1;i<street.points.length;i++){
    const [x,z]=street.points[i-1],[ex,ez]=street.points[i],dx=ex-x,dz=ez-z;
    const t=Math.max(0,Math.min(1,((p.x-x)*dx+(p.z-z)*dz)/(dx*dx+dz*dz||1)));
    const d=(p.x-x-t*dx)**2+(p.z-z-t*dz)**2;if(d<best){best=d;name=street.name.toUpperCase();}
  }
  return best<900?name:p.z<-355?'SANDGRUND':p.x>145&&p.z<-40&&p.z>-140?'DOMKYRKAN':'KARLSTAD';
}
const streetBounds=allStreets.map(s=>({minx:Math.min(...s.points.map(p=>p[0])),maxx:Math.max(...s.points.map(p=>p[0])),minz:Math.min(...s.points.map(p=>p[1])),maxz:Math.max(...s.points.map(p=>p[1]))}));
export function drawCityStreets(c,point,scale,size=500){
  c.save();c.lineCap='round';c.lineJoin='round';
  for(const [i,s] of allStreets.entries()){const b=streetBounds[i],[x,y]=point(b.minx,b.minz),[ex,ey]=point(b.maxx,b.maxz),pad=s.width*scale;if(ex<-pad||ey<-pad||x>size+pad||y>size+pad)continue;c.strokeStyle=s.pedestrian?'#9a9b7a':'#637d77';c.lineWidth=Math.max(1,s.width*scale);c.beginPath();s.points.forEach(([x,z],i)=>{const p=point(x,z);i?c.lineTo(...p):c.moveTo(...p);});c.stroke();}
  c.strokeStyle='#adbdb1';c.lineWidth=Math.max(1,1.8*scale);
  for(const rail of RAIL_LINES){c.beginPath();rail.forEach((q,i)=>i?c.lineTo(...point(...q)):c.moveTo(...point(...q)));c.stroke();}
  c.restore();
}
export function drawCityGround(c,point,scale){
  c.save();drawSouthWater(c,point);
  for(const [x,z,w,d,col] of [[-836,1286,68,70,'#6f915b'],[-10583.24-65,-13678.36-45,130,90,'#6f915b'],[-10583.24-53,-13678.36-4,106,24,'#b6b7a0'],[-10583.24-21,-13678.36-22,42,14,'#506151']]){const a=point(x,z);c.fillStyle=col;c.fillRect(...a,w*scale,d*scale);}
  const [x,z]=point(-500,-950),[ex,ez]=point(240,-320);c.fillStyle='#286573';c.fillRect(x,z,ex-x,ez-z);
  c.fillStyle='#6f915b';c.beginPath();PENINSULA_SHORE.forEach((p,i)=>i?c.lineTo(...point(...p)):c.moveTo(...point(...p)));c.closePath();c.fill();
  c.strokeStyle='#b7b793';c.lineWidth=Math.max(1,2.5*scale);for(const p of PARK_PATHS){c.beginPath();p.points.forEach((q,i)=>i?c.lineTo(...point(...q)):c.moveTo(...point(...q)));c.stroke();}
  c.fillStyle='#c2966e';for(const p of PARK_PIERS){c.beginPath();p.points.forEach((q,i)=>i?c.lineTo(...point(...q)):c.moveTo(...point(...q)));c.closePath();c.fill();}
  const [px,pz]=point(-157,-462),[qx,qz]=point(-145,-362);c.fillStyle='#286573';c.fillRect(px,pz,qx-px,qz-pz);c.restore();
}
