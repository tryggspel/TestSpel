import {WATER_ROWS,FERRY_PORTS,EXT_BUILDINGS} from './city-south-data.mjs?v=2.11.22';
export const SOUTH_IDS=new Set(EXT_BUILDINGS.map(b=>b.id));
// South/extension buildings with their own hand-built architecture in city-south.js.
// Every other SOUTH_IDS building is drawn there only as a generic box, so a curated
// reference profile may take it over (see curatedRoute() in city-architecture.js).
export const SOUTH_HANDBUILT_IDS=new Set([80278038,356121937,80868525,77107220,100024120,100024325]);
export const HARBOUR={...FERRY_PORTS.hamn,x:236,z:552,id:'hamn',name:'Inre hamn'};
export const MARIEBERG={...FERRY_PORTS.marieberg,x:-778,z:1321,id:'marieberg',name:'Mariebergsskogen'};
export const SOUTH_PLACES=Object.freeze([
  {id:'tingvalla',label:'TINGVALLAGYMNASIET',x:196,z:25},
  {id:'bilan',label:'HOME HOTEL BILAN · GAMLA FÄNGELSET',x:318,z:162},
  {id:'station',label:'KARLSTAD C · JÄRNVÄGEN',x:-220,z:279},
  {id:'lofbergs',label:'LÖFBERGS · KAFFESKRAPAN',x:128,z:395},
  {id:'hamn',label:'INRE HAMN · BÅTBUSSEN',x:HARBOUR.x,z:HARBOUR.z},
  {id:'willys',label:'WILLYS BRYGGUDDEN',x:271,z:413},
  {id:'icahaga',label:'ICA SUPERMARKET HAGAHALLEN · HAGA',x:566,z:-129}
]);
export const atMarieberg=p=>Math.hypot(p.x-MARIEBERG.x,p.z-MARIEBERG.z)<140;
export function southWaterBlocked(x,z){
  if(z<-318||z>680||x<-540||x>530)return false;
  const row=WATER_ROWS[Math.max(0,Math.min(WATER_ROWS.length-1,Math.round((z+318)/2)))];
  // The pier at the real Inre hamn stop is a safe boarding platform.
  if(x>230&&x<249&&z>544&&z<565)return false;
  return row.some(([a,b])=>x>a&&x<b);
}
export function mariebergBlocked(x,z){
  // Bounded landing garden keeps the distant destination independent of the city's AI grid.
  if(Math.hypot(x-MARIEBERG.x,z-MARIEBERG.z)>140)return null;
  return !(x>-826&&x<-771&&z>1292&&z<1349);
}
export function southPassage(x,z,buildings){
  const b=buildings.find(b=>b.osm===80868525);if(!b)return false;
  const cx=(b.minx+b.maxx)/2;
  return x>cx-3.4&&x<cx+3.4&&z>b.maxz-10&&z<b.maxz+2;
}

export function footprintContains(x,z,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
