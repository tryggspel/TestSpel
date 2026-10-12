// Julklappsjakten: simulering av hur tappade paket (högar) delas ut. En spelare går 7,2 m/s mot närmaste paket (efter 3 s letande vid en ny hög) och står stilla när inget finns; SLOW=0.5 ger en långsam spelare.
// Mäter spridningen i tid och rum på en öppen karta (ingen riktig karta, inga hus): en modell, inte människor. Tolv körningar med olika slump.
// Användning: node tools/xmas-flow/drops.mjs [etikett] [minuter] [läge: free (fri julvandring) | plaza (introduktionen)]      (ROOT=… för ett annat bygge, SLOW=0.5 för en långsam spelare)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
// Koden som mäts: den här gren (två nivåer upp) eller en annan kodkatalog med ROOT=/väg/till/playcanvas-karlstad-2.11 (t.ex. ett äldre bygge för jämförelse).
const ROOT=process.env.ROOT||path.resolve(HERE,'../..');
const root=ROOT,label=process.argv[2]||'xmas',MIN=+(process.argv[3]||10),MODE=process.argv[4]||'free';
const V=JSON.parse(fs.readFileSync(root+'/version.json','utf8')).version;
const H=await import(root+'/xmas/xmas-hunt.mjs?v='+V);
const SLOW=+(process.env.SLOW||1),SPEED=7.2*SLOW,SEARCH=3/SLOW**1.5,DT=.25,SEEDS=[1,2,3,4,5,6,7,8,9,10,11,12];
const open={snap:q=>q,blocked:()=>false};
const stat=a=>{if(!a.length)return {n:0};a=a.slice().sort((x,y)=>x-y);const q=f=>a[Math.min(a.length-1,Math.floor(f*a.length))];return {n:a.length,min:+a[0].toFixed(1),p10:+q(.1).toFixed(1),med:+q(.5).toFixed(1),p90:+q(.9).toFixed(1),max:+a.at(-1).toFixed(1)};};
const all={spawnGap:[],doneToSpawn:[],minOtherDist:[],minBearing:[],dropsPer10:[],idlePct:[],multiPct:[],longestIdle:[],startDist:[],closeSpawns:0,spawns:0,pairsClose:0};
for(const seed of SEEDS){
  const h=new H.XmasHunt({rand:H.seededRandom(seed*7919+104729),nav:open});
  if(MODE==='plaza'&&h.startSearch){
    h.startSearch({kind:'intro',id:'intro',title:'T',goal:14,tomte:{x:6,z:-2,radius:3.4},spawn:{x:-3,z:30,yaw:0},drops:{cfg:{first:3,every:[30,45],afterDone:[8,14],maxActive:1,count:[6,8],minDistance:32,maxDistance:75,separation:45,spread:40},area:{kind:'rect',minx:-46,maxx:46,minz:-26,maxz:34,keepOut:[{x:0,z:0,r:7}]}}});
  }else h.startFree();
  h.drain();
  const p={x:0,z:0,y:1.68};h.facing={x:0,z:-1};
  let lastSpawn=null,lastDone=null,idle=0,idleRun=0,longest=0,multi=0,steps=0,drops=0,searchLeft=0,searchSerial=0,doneT=null;
  for(let i=0;i<MIN*60/DT;i++){
    const near=h.nearest(p);let sweep=null,speed=0;
    if(near){
      const d=Math.hypot(near.pkg.x-p.x,near.pkg.z-p.z),rain=h.run.rains.find(x=>x.serial===near.pkg.rain);
      if(rain&&rain.serial!==searchSerial&&Math.hypot(rain.x-p.x,rain.z-p.z)<20){searchSerial=rain.serial;searchLeft=SEARCH;}
      if(searchLeft>0)searchLeft-=DT;
      else{const s=Math.min(d,SPEED*DT);sweep={x:p.x,z:p.z};p.x+=(near.pkg.x-p.x)/(d||1)*s;p.z+=(near.pkg.z-p.z)/(d||1)*s;speed=SPEED;}
    }
    const actBefore=h.run.rains.slice();
    h.step(DT,p,sweep,speed);
    for(const e of h.drain()){
      if(e.type==='xmas-rain'){
        drops++;all.spawns++;const t=h.run.t;
        if(lastSpawn!=null)all.spawnGap.push(t-lastSpawn);lastSpawn=t;
        if(doneT!=null){all.doneToSpawn.push(t-doneT);doneT=null;}
        const mine=h.run.rains.find(x=>x.serial===e.rain),others=h.run.rains.filter(x=>x!==mine);
        all.startDist.push(Math.hypot(e.x-p.x,e.z-p.z));
        if(others.length){
          const md=Math.min(...others.map(o=>Math.hypot(o.x-e.x,o.z-e.z)));all.minOtherDist.push(md);if(md<60)all.closeSpawns++;
          const b=o=>Math.atan2(o.x-p.x,o.z-p.z)*180/Math.PI,gap=Math.min(...others.map(o=>{let d=Math.abs(b(o)-b(mine))%360;return d>180?360-d:d;}));all.minBearing.push(gap);
        }
      }
      if(e.type==='xmas-rain-gone'&&e.done)doneT=h.run.t;
    }
    const left=h.run.packages.filter(k=>!k.collected).length;
    steps++;if(left===0){idle+=DT;idleRun+=DT;longest=Math.max(longest,idleRun);}else idleRun=0;
    if(h.run.rains.length>=2)multi++;
  }
  all.dropsPer10.push(drops*10/MIN);all.idlePct.push(100*idle/(steps*DT));all.multiPct.push(100*multi/steps);all.longestIdle.push(longest);
}
const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
console.log('==',label,MODE,MIN,'min x',SEEDS.length,'körningar');
console.log('regn per 10 min (snitt)',avg(all.dropsPer10).toFixed(1),'| paket plockas hela tiden: andel av tiden utan ett enda paket',avg(all.idlePct).toFixed(1),'% (längsta väntan snitt',avg(all.longestIdle).toFixed(1),'s, max',Math.max(...all.longestIdle).toFixed(0),'s)');
console.log('andel av tiden med två regn samtidigt',avg(all.multiPct).toFixed(1),'%');
console.log('tid mellan två regn (s)',JSON.stringify(stat(all.spawnGap)));
console.log('tid från klart regn till nästa (s)',JSON.stringify(stat(all.doneToSpawn)));
console.log('avstånd regnets mitt – spelaren (m)',JSON.stringify(stat(all.startDist)));
console.log('avstånd till närmaste andra aktiva regn vid ett nytt (m)',JSON.stringify(stat(all.minOtherDist)),' närmare än 60 m:',all.closeSpawns,'av',all.minOtherDist.length);
console.log('vinkel mellan riktningarna till två aktiva regn (grader)',JSON.stringify(stat(all.minBearing)));
