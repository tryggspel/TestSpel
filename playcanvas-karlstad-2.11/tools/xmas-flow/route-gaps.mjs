// Julklappsjakten: hur ligger högarna i gaturundorna (Kungsgatan, Drottninggatan) på stadens riktiga karta? Går rakt mot närmaste paket (7,2 m/s, 3 s letande vid varje ny hög) och noterar avstånden mellan högarnas mitt.
// Användning: node tools/xmas-flow/route-gaps.mjs      (ROOT=… för ett annat bygge). Modellerad spelare, 16 körningar per runda.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
// Koden som mäts: den här gren (två nivåer upp) eller en annan kodkatalog med ROOT=/väg/till/playcanvas-karlstad-2.11 (t.ex. ett äldre bygge för jämförelse).
const ROOT=process.env.ROOT||path.resolve(HERE,'../..');
const root=ROOT;
const V=JSON.parse(fs.readFileSync(root+'/version.json','utf8')).version;
const {CityNavigation}=await import(root+'/city-missions.mjs?v='+V);
const H=await import(root+'/xmas/xmas-hunt.mjs?v='+V);
const R=await import(root+'/xmas/xmas-rounds.mjs?v='+V);
const S=await import(root+'/xmas/xmas-save.mjs?v='+V);
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),get length(){return m.size;},key:i=>[...m.keys()][i]??null};};
const nav=new CityNavigation();
const roundNav={point:p=>nav.point(p),path:(a,b)=>nav.path(a,b),clear:(a,b)=>nav.clear(a,b),blocked:(x,z)=>nav.blocked(x,z)};
const huntNav={blocked:(x,z)=>nav.blocked(x,z),snap:p=>{try{const q=nav.point(p);return {x:q.x,z:q.z};}catch{return null;}},route:(a,b)=>{try{const r=nav.path(a,b);return Array.isArray(r)&&r.length>=2?r:null;}catch{return null;}}};
const SPEED=7.2,SEARCH=3,DT=.25,dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
for(const def of R.ROUNDS.filter(r=>r.search.area==='route')){
  const run=R.buildSearch(def,roundNav),all=[];let done=0,below55=0,below36=0,drops=0;
  for(let seed=1;seed<=16;seed++){
    const h=new H.XmasHunt({save:new S.XmasSave(mem()),rand:H.seededRandom(seed*7919+104729),nav:huntNav});h.startSearch(run);h.drain();
    const p={x:run.spawn.x,z:run.spawn.z,y:1.68};const yaw=run.spawn.yaw*Math.PI/180;h.facing={x:-Math.sin(yaw),z:-Math.cos(yaw)};
    let t=0,search=0,serial=0,centres=[],ok=false;
    for(let i=0;i<4*1500&&!ok;i++){
      const near=h.nearest(p);let sweep=null,speed=0;
      if(h.run.phase==='deliver'){const to=h.run.tomte,d=dist(p,to),s=Math.min(d,SPEED*DT);sweep={x:p.x,z:p.z};p.x+=(to.x-p.x)/(d||1)*s;p.z+=(to.z-p.z)/(d||1)*s;speed=SPEED;}
      else if(near){const rain=h.run.rains.find(x=>x.serial===near.pkg.rain);if(rain&&rain.serial!==serial&&dist(rain,p)<20){serial=rain.serial;search=SEARCH;}
        if(search>0)search-=DT;else{const d=dist(near.pkg,p),s=Math.min(d,SPEED*DT);sweep={x:p.x,z:p.z};p.x+=(near.pkg.x-p.x)/(d||1)*s;p.z+=(near.pkg.z-p.z)/(d||1)*s;speed=SPEED;}}
      h.step(DT,p,sweep,speed);t+=DT;
      for(const e of h.drain()){if(e.type==='xmas-rain')centres.push({x:e.x,z:e.z});if(e.type==='xmas-deliver')ok=true;}
    }
    if(ok)done++;
    for(let k=1;k<centres.length;k++){const g=dist(centres[k],centres[k-1]);all.push(Math.round(g));if(g<55)below55++;if(g<36)below36++;}
    drops+=centres.length;
  }
  console.log(def.id.padEnd(22),'rutt',run.length,'m | klarade',done+'/16','| högar/körning',(drops/16).toFixed(1),'| avstånd mellan på varandra följande högar: min',Math.min(...all),'median',all.sort((a,b)=>a-b)[Math.floor(all.length/2)],'| under 55 m:',below55+'/'+all.length,'under 36 m:',below36+'/'+all.length);
}
