// Snabb uppslagning av avstånd till närmaste gata, för att Temporush-banan ska hålla sig till gator och inte ut i stora tomma gröna ytor.
// Gatorna kommer från OSM-geometrin i city-streets.mjs. Punkterna läggs i ett rutnät så att en fråga bara tittar på närmaste rutor.
import {VISUAL_STREETS} from './city-streets.mjs?v=2.18.1';

const CELL=40,SAMPLE=10;
let grid=null,count=0;
function build(){
  grid=new Map();count=0;
  const put=(x,z)=>{const k=Math.floor(x/CELL)+','+Math.floor(z/CELL);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(x,z);count++;};
  for(const st of VISUAL_STREETS){
    const pts=st.points||[];
    for(let i=0;i<pts.length;i++){
      put(pts[i][0],pts[i][1]);
      if(i>0){const [ax,az]=pts[i-1],[bx,bz]=pts[i],d=Math.hypot(bx-ax,bz-az),n=Math.floor(d/SAMPLE);for(let k=1;k<n;k++)put(ax+(bx-ax)*k/n,az+(bz-az)*k/n);}
    }
  }
}
// Avstånd i meter till närmaste gata, högst maxR (annars Infinity).
export function streetDistance(x,z,maxR=80){
  if(!grid)build();
  const r=Math.ceil(maxR/CELL),cx=Math.floor(x/CELL),cz=Math.floor(z/CELL);let best=Infinity;
  for(let i=cx-r;i<=cx+r;i++)for(let j=cz-r;j<=cz+r;j++){
    const a=grid.get(i+','+j);if(!a)continue;
    for(let k=0;k<a.length;k+=2){const d=Math.hypot(a[k]-x,a[k+1]-z);if(d<best)best=d;}
  }
  return best<=maxR?best:Infinity;
}
// Finns det gatudata här alls? Utanför de kartlagda kvarteren ska banan inte kräva gator.
export function streetCovered(x,z,radius=170){return streetDistance(x,z,radius)<Infinity;}
export const streetPointCount=()=>{if(!grid)build();return count;};
