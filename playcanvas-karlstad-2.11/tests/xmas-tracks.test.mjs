// Julklappsjakten: tomtarnas spår i snön (xmas-tracks.mjs) och hur de hänger ihop med paketen som tappats i fri julvandring (XmasHunt).
import test from 'node:test';
import assert from 'node:assert/strict';
import {trailPrints,printCorners,pathLength,nearestPrint} from '../xmas/xmas-tracks.mjs';
import {TRAILS,FREE_RAIN} from '../xmas/xmas-config.mjs';
import {XmasHunt,seededRandom} from '../xmas/xmas-hunt.mjs';

const bend=[{x:0,z:0},{x:0,z:-30},{x:25,z:-30},{x:25,z:-60}];                 // 85 m med två hörn
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// avstånd från en punkt till en bruten linje
function toPath(pt,path){
  let best=Infinity;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1e-9,t=Math.max(0,Math.min(1,((pt.x-a.x)*dx+(pt.z-a.z)*dz)/l2));
    best=Math.min(best,Math.hypot(pt.x-(a.x+dx*t),pt.z-(a.z+dz*t)));
  }
  return best;
}

test('spåret: ett avtryck var 1,35 m längs vägen, från 14 m in till 3,4 m före slutet, vänster och höger fot om vartannat',()=>{
  const pr=trailPrints(bend);
  assert.ok(pr.length>=50&&pr.length<=TRAILS.maxPrints,'antal: '+pr.length);
  assert.ok(dist(pr[0],{x:0,z:-TRAILS.lead})<1.2,'börjar '+TRAILS.lead+' m in på vägen: '+JSON.stringify(pr[0]));
  assert.ok(pathLength(bend)-3.4-8<=TRAILS.lead+pr.length*TRAILS.step,'täcker vägen');
  assert.ok(dist(pr.at(-1),{x:25,z:-60})>=TRAILS.stopShort-1.2,'slutar före paketen: '+dist(pr.at(-1),{x:25,z:-60}).toFixed(2));
  pr.forEach((p,i)=>{assert.equal(p.side,i%2,'fot '+i);assert.ok(Math.abs(Math.hypot(p.hx,p.hz)-1)<.01,'enhetsvektor');});
  // medelavstånd mellan efterföljande avtryck ≈ steget (svajet och slumpen ger några decimeters variation)
  let sum=0;for(let i=1;i<pr.length;i++){const d=dist(pr[i],pr[i-1]);sum+=d;assert.ok(d>.3&&d<2.2,'steg '+i+': '+d.toFixed(2));}
  assert.ok(Math.abs(sum/(pr.length-1)-TRAILS.step)<.25,'medelsteg '+(sum/(pr.length-1)).toFixed(2));
  // alla avtryck ligger nära vägen (aldrig längre bort än sidoavståndet plus svajet)
  for(const p of pr)assert.ok(toPath(p,bend)<=TRAILS.side+TRAILS.wobble+.2,'avtryck långt från vägen: '+toPath(p,bend).toFixed(2));
});

test('spåret: vänster fot ligger till vänster om färdriktningen och höger fot till höger, och tån pekar framåt längs vägen',()=>{
  const pr=trailPrints([{x:0,z:0},{x:0,z:-80}],{wobble:0});          // rakt norrut (−z): vänster = −x, höger = +x
  const lefts=pr.filter(p=>p.side===0),rights=pr.filter(p=>p.side===1);
  assert.ok(lefts.length>10&&rights.length>10);
  assert.ok(lefts.every(p=>p.x<0.05)&&rights.every(p=>p.x>-0.05),'rätt sida');
  assert.ok(pr.every(p=>p.hz<-.9),'tån pekar norrut (−z)');
  const east=trailPrints([{x:0,z:0},{x:80,z:0}],{wobble:0});          // österut: vänster = −z (norr), höger = +z
  assert.ok(east.filter(p=>p.side===0).every(p=>p.z<0.05)&&east.filter(p=>p.side===1).every(p=>p.z>-0.05)&&east.every(p=>p.hx>.9),'österut');
});

test('spåret är deterministiskt, kortare vägar ger kortare spår och för korta vägar inget spår',()=>{
  assert.deepEqual(trailPrints(bend),trailPrints(bend));
  assert.notDeepEqual(trailPrints(bend,{phase:1}),trailPrints(bend,{phase:2}),'olika fas ger olika svaj');
  assert.ok(trailPrints(bend,{max:12}).length===12,'taket gäller');
  const mid=trailPrints([{x:0,z:0},{x:0,z:-40}]);assert.ok(mid.length>12&&mid.length<30,'40 m: '+mid.length);
  assert.deepEqual(trailPrints([{x:0,z:0},{x:0,z:-2}]),[],'2 m: inget spår');
  assert.deepEqual(trailPrints([]),[]);assert.deepEqual(trailPrints([{x:0,z:0}]),[]);assert.deepEqual(trailPrints(null),[]);
  // en väg som är kortare än "lead" börjar vid 40 % av vägen så att spåret ändå får plats
  const short=trailPrints([{x:0,z:0},{x:0,z:-20}]);assert.ok(short.length>=3&&short[0].z<-7,'början: '+JSON.stringify(short[0]));
});

test('avtryck på ogångbar mark flyttas till mittlinjen eller hoppas över',()=>{
  const wallAt=x=>x<-.1;                                                   // allt väster om x = −0,1 är vägg
  const pr=trailPrints([{x:0,z:0},{x:0,z:-60}],{wobble:0,blocked:(x,z)=>wallAt(x)});
  assert.ok(pr.length>0&&pr.every(p=>!wallAt(p.x)),'inget avtryck i väggen');
  const none=trailPrints([{x:0,z:0},{x:0,z:-60}],{blocked:()=>true});assert.equal(none.length,0,'allt blockerat: inget spår');
});

test('avtryckets hörn: tån framåt, bredd och längd som begärt',()=>{
  const c=printCorners({x:10,z:20,hx:0,hz:-1},.3,.4);                        // tån norrut: hörn [bakre vänster, bakre höger, främre höger, främre vänster]
  assert.ok(Math.abs(c[1]-(20+.4))<1e-5&&Math.abs(c[5]-(20-.4))<1e-5,'bak = +z, fram = −z');
  assert.ok(Math.abs(c[2]-c[0]-.6)<1e-5,'bredd 0,6');
  assert.ok(c[0]<10&&c[2]>10,'vänster = −x, höger = +x när man går norrut');
  const e=printCorners({x:0,z:0,hx:1,hz:0},.3,.4);                           // tån österut: vänster = −z
  assert.ok(e[4]>0&&e[6]>0&&e[5]>0&&e[7]<0,'främre hörn österut, höger = +z');
});

test('närmaste avtryck räknar bara högar som fortfarande har paket kvar',()=>{
  const pr=trailPrints(bend);
  assert.ok(nearestPrint([{left:2,trail:pr}],0,-14)<.6);
  assert.equal(nearestPrint([{left:0,trail:pr}],0,-14),Infinity,'allt plockat: spåret räknas inte');
  assert.equal(nearestPrint([{gone:true,left:2,trail:pr}],0,-14),Infinity);
  assert.equal(nearestPrint([],0,0),Infinity);assert.equal(nearestPrint(null,0,0),Infinity);
  const far=nearestPrint([{left:2,trail:pr}],200,200);assert.ok(far>100);
});

// ── Spåret är en del av varje tappad hög ───────────────────────────────────────────────────────────────────────────────
function freeHunt(seed=3,nav={},facing=null){
  const h=new XmasHunt({rand:seededRandom(seed*7919+104729),nav:{snap:q=>q,blocked:()=>false,...nav}});h.facing=facing;h.startFree();h.drain();h.run.t=1e3;return h;
}
test('varje tappad hög har ett spår som leder dit och som slutar före paketen',()=>{
  const h=freeHunt(5);h.stepRain({x:0,z:0});const rain=h.run.rains[0];
  assert.ok(rain&&rain.trail.length>=8,'avtryck: '+rain?.trail.length);
  assert.ok(rain.left===h.run.packages.length);
  const ev=h.drain().find(e=>e.type==='xmas-rain');assert.equal(ev.prints,rain.trail.length);assert.deepEqual(ev.head,rain.head);
  assert.ok(dist(rain.head,{x:0,z:0})>=8&&dist(rain.head,{x:0,z:0})<=TRAILS.lead+3,'spårets början ligger nära spelaren: '+dist(rain.head,{x:0,z:0}).toFixed(1));
  const last=rain.trail.at(-1);assert.ok(dist(last,rain)>=TRAILS.stopShort-1.3&&dist(last,rain)<=TRAILS.stopShort+2.5,'slutar före paketen: '+dist(last,rain).toFixed(1));
  // paketen ligger inom ringen runt platsen, spridda
  for(const k of h.run.packages.filter(k=>k.kind==='regular'))assert.ok(dist(k,rain)<=FREE_RAIN.ringMax+1.5&&dist(k,rain)>=FREE_RAIN.ringMin-1.5,'paket utanför ringen: '+dist(k,rain).toFixed(1));
});
test('spåret följer vägen som spelet ger (inte en rak linje genom husen)',()=>{
  // en väg som går ett varv runt ett hus: spelet ger vägen via nav.route
  const route=(a,c)=>[{x:a.x,z:a.z},{x:a.x+40,z:a.z},{x:a.x+40,z:a.z-30},{x:c.x,z:c.z}];
  const h=freeHunt(7,{route});h.stepRain({x:0,z:0});const rain=h.run.rains[0],path=route({x:0,z:0},rain);
  assert.ok(rain.trail.length>=6);
  for(const p of rain.trail)assert.ok(toPath(p,path)<=TRAILS.side+TRAILS.wobble+.3,'avtryck utanför vägen');
  // och utan väg (eller när vägen kastar) blir det en rak linje, aldrig ett fel
  const bad=freeHunt(7,{route:()=>{throw new Error('kaos');}});bad.stepRain({x:0,z:0});assert.ok(bad.run.rains[0].trail.length>=6);
  const none=freeHunt(7,{route:()=>null});none.stepRain({x:0,z:0});assert.ok(none.run.rains[0].trail.length>=6);
});
test('avtryck läggs aldrig på ogångbar mark',()=>{
  const wall=(x,z)=>Math.abs(x-30)<2&&z<20;                                   // en vägg tvärs över rakaste vägen
  for(let seed=1;seed<=12;seed++){
    const h=freeHunt(seed,{blocked:wall});h.stepRain({x:0,z:0});
    for(const rain of h.run.rains)for(const p of rain.trail)assert.ok(!wall(p.x,p.z),'avtryck i väggen (slump '+seed+')');
  }
});
test('det första paketet tappas framför spelaren: inom 60° från blickriktningen, så att spåret syns direkt',()=>{
  for(let seed=1;seed<=30;seed++){
    for(const f of [{x:0,z:-1},{x:1,z:0},{x:-.7,z:.7}]){
      const h=freeHunt(seed,{},f);h.stepRain({x:0,z:0});const rain=h.run.rains[0],a=Math.atan2(rain.x,rain.z),fa=Math.atan2(f.x,f.z);
      let da=Math.abs(a-fa);if(da>Math.PI)da=2*Math.PI-da;
      assert.ok(da<=1.1,'slump '+seed+', riktning '+JSON.stringify(f)+': '+(da*180/Math.PI).toFixed(0)+'° från blickriktningen');
    }
  }
  // utan känd blickriktning, och för senare högar, väljs riktningen fritt
  const dirs=new Set();for(let seed=1;seed<=30;seed++){const h=freeHunt(seed);h.stepRain({x:0,z:0});dirs.add(Math.round(Math.atan2(h.run.rains[0].x,h.run.rains[0].z)*2));}
  assert.ok(dirs.size>=8,'åt olika håll: '+dirs.size);
});
test('att plocka paketen tömmer högen och spåret försvinner när sista paketet är taget',()=>{
  const h=freeHunt(11);h.stepRain({x:0,z:0});const rain=h.run.rains[0];
  assert.equal(nearestPrint(h.run.rains,rain.trail[3].x,rain.trail[3].z)<.1,true);
  for(const k of h.run.packages.filter(k=>k.rain===rain.serial))h.take(k);
  assert.equal(rain.left,0);
  assert.equal(nearestPrint(h.run.rains,rain.trail[3].x,rain.trail[3].z),Infinity,'spåret räknas inte längre');
  h.step(.1,{x:500,z:500,y:1.68});                                            // ett steg bort från allt: högen räknas som borta
  assert.equal(h.run.rains.filter(x=>x.serial===rain.serial).length,0,'högen är borta');
  assert.equal(h.snapshot().prints,h.run.rains.reduce((n,x)=>n+x.trail.length,0));
});

test('en mycket lång väg: spåret täcker de sista avtrycken fram till paketen och slutar alltid före dem',()=>{
  const far=[{x:0,z:0},{x:0,z:-300}];
  const pr=trailPrints(far);
  assert.equal(pr.length,TRAILS.maxPrints);
  assert.ok(dist(pr.at(-1),{x:0,z:-300})>=TRAILS.stopShort-1.2&&dist(pr.at(-1),{x:0,z:-300})<=TRAILS.stopShort+1.5,'slutar före paketen: '+dist(pr.at(-1),{x:0,z:-300}).toFixed(2));
  assert.ok(pr[0].z<-300+TRAILS.stopShort+(TRAILS.maxPrints-1)*TRAILS.step+1.5&&pr[0].z>-300+TRAILS.stopShort+(TRAILS.maxPrints-1)*TRAILS.step-1.5,'börjar max avtryck före slutet: '+pr[0].z.toFixed(1));
});
