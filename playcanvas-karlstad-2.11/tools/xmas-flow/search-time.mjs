// Julklappsjakten: hur lång tid tar ett sökuppdrag (introduktionen och de tre rundorna) för en modellerad spelare? Går rakt mot närmaste paket (efter en stunds letande vid varje ny hög) och sedan till tomten.
// Användning: node tools/xmas-flow/search-time.mjs      (SPEED=7.2 m/s och SEARCH=3 s letande per ny hög; SPEED=4 SEARCH=8 för lugn gång; ROOT=… för ett annat bygge). Öppen karta (rak linje, inga hus): en modell, inte stadens verkliga karta och inte en människa.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
// Koden som mäts: den här gren (två nivåer upp) eller en annan kodkatalog med ROOT=/väg/till/playcanvas-karlstad-2.11 (t.ex. ett äldre bygge för jämförelse).
const ROOT=process.env.ROOT||path.resolve(HERE,'../..');
const root=ROOT;
const V=JSON.parse(fs.readFileSync(root+'/version.json','utf8')).version;
const H=await import(root+'/xmas/xmas-hunt.mjs?v='+V);
const R=await import(root+'/xmas/xmas-rounds.mjs?v='+V);
const S=await import(root+'/xmas/xmas-save.mjs?v='+V);
const SPEED=+(process.env.SPEED||7.2),SEARCH=+(process.env.SEARCH||3),DT=.25;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),get length(){return m.size;},key:i=>[...m.keys()][i]??null};};
const open={snap:q=>q,blocked:()=>false};
const nav={point:p=>({x:p.x,z:p.z}),blocked:()=>false,clear:()=>true,path:(a,b)=>{const out=[],n=Math.max(1,Math.ceil(dist(a,b)/3));for(let i=0;i<=n;i++)out.push({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n});return out;}};
for(const def of [R.INTRO_SEARCH,...R.ROUNDS]){
  const goalT=[],totT=[],drops=[],picks=[];
  for(let seed=1;seed<=12;seed++){
    const run=R.buildSearch(def,nav),h=new H.XmasHunt({save:new S.XmasSave(mem()),rand:H.seededRandom(seed*7919+104729),nav:open});h.startSearch(run);h.drain();
    const p={x:run.spawn.x,z:run.spawn.z,y:1.68};h.facing={x:0,z:-1};let t=0,tg=null,done=false,search=0,serial=0;
    for(let i=0;i<4*3000&&!done;i++){
      const near=h.nearest(p);let sweep=null,speed=0;
      if(h.run.phase==='deliver'){const to=h.run.tomte,d=dist(p,to),s=Math.min(d,SPEED*DT);sweep={x:p.x,z:p.z};p.x+=(to.x-p.x)/(d||1)*s;p.z+=(to.z-p.z)/(d||1)*s;speed=SPEED;}
      else if(near){
        const rain=h.run.rains.find(x=>x.serial===near.pkg.rain);
        if(rain&&rain.serial!==serial&&dist(rain,p)<20){serial=rain.serial;search=SEARCH;}
        if(search>0)search-=DT;
        else{const d=dist(near.pkg,p),s=Math.min(d,SPEED*DT);sweep={x:p.x,z:p.z};p.x+=(near.pkg.x-p.x)/(d||1)*s;p.z+=(near.pkg.z-p.z)/(d||1)*s;speed=SPEED;}
      }
      h.step(DT,p,sweep,speed);t+=DT;
      for(const e of h.drain()){if(e.type==='xmas-goal'&&tg===null)tg=t;if(e.type==='xmas-deliver'){done=true;}}
    }
    if(done){goalT.push(tg);totT.push(t);drops.push(h.run.rainSerial);picks.push(h.run.collected+h.run.bonusCollected);}
  }
  const q=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?`${Math.round(a[0])}–${Math.round(a.at(-1))} s (median ${Math.round(a[Math.floor(a.length/2)])})`:'ingen klarade';};
  console.log(def.id.padEnd(22),'mål',String(def.search.goal).padStart(2),'| klara',totT.length+'/12','| målet nått',q(goalT),'| inlämnat',q(totT),'| högar',q(drops).replace(/ s/g,''),'| paket',q(picks).replace(/ s/g,''));
}
