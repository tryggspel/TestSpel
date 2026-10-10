import {cityPoint} from './city-geography.mjs?v=2.21.1-xmas.6';

const FACE_YAW=Object.freeze({north:180,south:0,east:90,west:-90});
const FACADE_OFFSET=.34; // comic-city panels sit at .25; real businesses must render in front.
const PALETTES=Object.freeze({
  musicpartner:{bg:'#252729',fg:'#f5efdf',accent:'#e78336',kind:'music-office'},
  synsam:{bg:'#232729',fg:'#f36a32',accent:'#f36a32',kind:'optics'},
  apoteket:{bg:'#258a43',fg:'#ffffff',accent:'#72bd44',kind:'pharmacy'},
  normal:{bg:'#1d2425',fg:'#ffffff',accent:'#31bea9',kind:'retail'},
  gobanana:{bg:'#214a36',fg:'#ffd74f',accent:'#ffd74f',kind:'retail'},
  hemkop:{bg:'#292929',fg:'#ed4242',accent:'#ed4242',kind:'grocery'},
  burgerking:{bg:'#2b2520',fg:'#f6e5bd',accent:'#e34d2d',kind:'food'},
  sibylla:{bg:'#19538b',fg:'#ffffff',accent:'#e33333',kind:'food'},
  grekiska:{bg:'#244d72',fg:'#ffffff',accent:'#6badd0',kind:'restaurant'},
  leprechaun:{bg:'#174b35',fg:'#f3d27a',accent:'#d7aa44',kind:'pub'},
  fratelli:{bg:'#43352c',fg:'#f7ead6',accent:'#b98257',kind:'hotel'},
  hm:{bg:'#f3efe7',fg:'#c51f36',accent:'#c51f36',kind:'retail'},
  scandic:{bg:'#252a31',fg:'#ffffff',accent:'#d84b62',kind:'hotel'},
  radhuscafe:{bg:'#654936',fg:'#fff0d5',accent:'#d49a56',kind:'cafe'},
  savoy:{bg:'#191f21',fg:'#f6efe3',accent:'#c94e37',kind:'hotel'},
  homeplaza:{bg:'#302b27',fg:'#f5eee3',accent:'#b98258',kind:'hotel'},
  gossip:{bg:'#241f28',fg:'#fff2df',accent:'#d8a64e',kind:'restaurant'},
  lindex:{bg:'#f1eee7',fg:'#1f2527',accent:'#d7a04b',kind:'retail'},
  kjell:{bg:'#1f2529',fg:'#f8df4d',accent:'#f8df4d',kind:'electronics'},
  kicks:{bg:'#141719',fg:'#ffffff',accent:'#e7b7cb',kind:'beauty'},
  apoteket:{bg:'#258a43',fg:'#ffffff',accent:'#72bd44',kind:'pharmacy'}
});
const B=(id,name,address,osm,face,extra={})=>Object.freeze({id,name,address,osm,face,...PALETTES[id],...extra});

// Real Karlstad businesses used only as lightweight facade identity.
// Coordinates are address pins where the OSM building lacks the exact sub-address; approximate anchors are flagged.
export const REAL_BUSINESSES=Object.freeze([
  B('musicpartner','MusicPartner','Kungsgatan 6D',119214077,'south',{lon:13.508280,lat:59.381016,width:11.5,door:.72}),
  B('synsam','Synsam','Östra Torggatan 11',100833292,'east',{lon:13.5040455,lat:59.380140,width:8.4}),
  B('normal','Normal','Drottninggatan 11',104778905,'north',{lon:13.5028741,lat:59.3792396,width:9.4,approximateBuilding:true,door:.60}),
  B('hm','H&M','Drottninggatan 12',471365595,'south',{lon:13.502617,lat:59.379395,width:12.0,approximateBuilding:true,door:.50}),
  B('scandic','Scandic Karlstad City','Drottninggatan 4',106864598,'south',{width:11.5,door:.55}),
  B('radhuscafe','Rådhuscaféet','Tingvallagatan 8',101456563,'east',{width:8.8,door:.62,out:2.6}),
  B('savoy','Hotel Savoy','Västra Torggatan 1',106078942,'east',{width:10.6,door:.20,signOnly:true}),
  B('homeplaza','Home Hotel Plaza','Västra Torggatan 2',110733713,'west',{width:11.2,door:.50,signOnly:true}),
  B('fratelli','Hotel Fratelli','Drottninggatan 17',104529134,'north',{width:8.8,signOnly:true}),
  B('hemkop','Hemköp','Drottninggatan 33',101257268,'north',{width:10.8,door:.52}),
  B('burgerking','Burger King','Östra Torggatan 9',101247031,'east',{width:9.6,door:.78}),
  B('sibylla','Sibylla','Östra Torggatan 7',101588783,'east',{width:8.8,door:.30}),
  B('grekiska','Grekiska Grill & Bar','Tingvallagatan 15',101608925,'north',{width:10.8,door:.72}),
  B('leprechaun','The Leprechaun','Östra Torggatan 4',101217187,'west',{width:9.0,door:.28}),
  B('gossip','Gossip & Bubbels','Älvgatan 2',101202579,'south',{width:11.8,door:.56}),
  B('lindex','Lindex','Drottninggatan 15',106078946,'north',{width:8.2,shift:4.2,signOnly:true}),
  B('kjell','Kjell & Company','Drottninggatan 18',109895687,'south',{width:9.4,shift:-3.4}),
  B('kicks','KICKS','Järnvägsgatan 2',102190062,'west',{width:7.4,shift:-10.5,signOnly:true,out:.9}),
  B('apoteket','Apoteket Örnen','Järnvägsgatan 2',102190062,'west',{width:7.4,shift:10.5,signOnly:true,out:.9}),
  B('synsamoutlet','Synsam Outlet','Drottninggatan 19',104396327,'north',{width:8.8,signOnly:true,bg:'#232729',fg:'#f36a32',accent:'#f36a32',kind:'optics'})
]);

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function businessAnchor(business,colliders=[]){
  const face=business.face||'north',yaw=FACE_YAW[face]??180;
  const pin=Number.isFinite(business.lon)&&Number.isFinite(business.lat)?cityPoint(business.lon,business.lat):null;
  let b=colliders.find(x=>x.osm===business.osm)||null;
  if(!b&&pin){
    let best=null;
    for(const x of colliders){
      const dx=pin.x< x.minx?x.minx-pin.x:pin.x>x.maxx?pin.x-x.maxx:0;
      const dz=pin.z< x.minz?x.minz-pin.z:pin.z>x.maxz?pin.z-x.maxz:0;
      const d=Math.hypot(dx,dz);if(d<28&&(!best||d<best.d))best={x,d};
    }
    b=best?.x||null;
  }
  if(!b&&pin)return Object.freeze({x:pin.x,z:pin.z,yaw,width:business.width||8,direct:true});
  if(!b)return null;
  const margin=1.6,p=pin||{x:(b.minx+b.maxx)/2,z:(b.minz+b.maxz)/2};
  if(face==='north'||face==='south'){
    const span=Math.max(3,b.maxx-b.minx-2*margin),width=Math.min(business.width||10,span);
    return Object.freeze({x:clamp(p.x+(business.shift||0),b.minx+margin,b.maxx-margin),z:(face==='north'?b.minz-FACADE_OFFSET-(business.out||0):b.maxz+FACADE_OFFSET+(business.out||0)),yaw,width,direct:false});
  }
  const span=Math.max(3,b.maxz-b.minz-2*margin),width=Math.min(business.width||10,span);
  return Object.freeze({x:(face==='west'?b.minx-FACADE_OFFSET-(business.out||0):b.maxx+FACADE_OFFSET+(business.out||0)),z:clamp(p.z+(business.shift||0),b.minz+margin,b.maxz-margin),yaw,width,direct:false});
}

// Known real businesses just outside the current OSM building snapshot. They are kept as
// source data but not rendered as floating facades until the west-city building extract expands.
export const UNMAPPED_BUSINESSES=Object.freeze([
  Object.freeze({id:'gobanana',name:'Go Banana',address:'Drottninggatan 37B',lon:13.4955016,lat:59.3792166,...PALETTES.gobanana})
]);
export const BUSINESS_OSM_IDS=new Set(REAL_BUSINESSES.map(b=>b.osm).filter(Number.isFinite));
