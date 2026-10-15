// Julvernissagen (xmas/xmas-vernissage.mjs): grundspelets Sandgrund-uppdrag som en längre strid. Grundspelets Zombie-Lerin hade 12 liv och föll på ungefär fem sekunder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CityNavigation,CityMission} from '../city-missions.mjs';
import {XmasVernissage,VERN} from '../xmas/xmas-vernissage.mjs';

const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
// En öppen gångkarta kring Sandgrund (platsen ligger vid x −13, z −397) och torget.
const nav=()=>new CityNavigation(()=>false,{minX:-110,maxX:110,minZ:-480,maxZ:40},3);
const make=(id='sandgrund',seed=280926)=>new XmasVernissage(id,nav(),{x:20,z:20},seed);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const playing=g=>{g.start({practice:false});return g;};

test('början: 270 sekunder, Zombie-Lerin med 36 liv och trögstartad, och besökarna står långt bort från varandra och platsen',()=>{
  const g=playing(make());
  assert.equal(g.duration,VERN.duration);assert.equal(g.remaining,270);assert.equal(VERN.duration,270);
  const lerin=g.actors[0];assert.equal(lerin.kind,'artist');assert.equal(lerin.hp,36);assert.equal(lerin.maxHp,36);assert.equal(lerin.speed,VERN.sleepy.speed);
  assert.equal(g.visitors.length,3);assert.equal(g.snapshotVern().placed,3,'tre platser hittades i gångkartan');
  for(const v of g.visitors){
    assert.ok(dist(v,g.site)>=VERN.ring.min*.7,`besökaren står ${Math.round(dist(v,g.site))} m från platsen`);
    assert.ok(dist(v,g.safe)>=VERN.ring.fromSafe,'och långt från samlingsplatsen');
    assert.ok(g.nav.path(v,g.safe).length>=2&&g.nav.path(v,g.safe).length<=VERN.ring.maxPath,'men går att nå');
  }
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert.ok(dist(g.visitors[i],g.visitors[j])>=VERN.ring.apart,'besökarna står minst '+VERN.ring.apart+' m från varandra');
  assert.equal(g.rescued,0);assert.equal(g.shielded,true);
  assert.ok(g.visitors.every(v=>v.health===VERN.visitorHealth),'besökarna tål mer än i grundspelet (100)');
});
test('samma spel varje gång med samma frö, andra placeringar med ett annat',()=>{
  const a=playing(make('sandgrund',1234)).visitors.map(v=>[v.x,v.z]),b=playing(make('sandgrund',1234)).visitors.map(v=>[v.x,v.z]);
  assert.deepEqual(a,b);
});
test('färgskölden: solstötar knuffar Zombie-Lerin men tar inga liv förrän alla tre besökare är räddade, och spelet säger det',()=>{
  const g=playing(make()),lerin=g.actors[0];
  const aim=()=>{lerin.x=g.site.x;lerin.z=g.site.z;lerin.vx=lerin.vz=0;lerin.active=true;g.cooldown=0;g.energy=100;return g.shoot({x:lerin.x,z:lerin.z+4,dx:0,dz:-1});};
  const r=aim();assert.equal(r.target,lerin.id,'träffen registreras');
  assert.equal(lerin.hp,36,'men inget liv tas');assert.equal(lerin.active,true);
  assert.ok(g.events.some(e=>e.type==='vernissage-shield'&&/FÄRGSKÖLD/.test(e.title)),'meddelandet om skölden');
  const n=g.events.filter(e=>e.type==='vernissage-shield').length;for(let i=0;i<3;i++){aim();}
  assert.equal(g.events.filter(e=>e.type==='vernissage-shield').length,n,'meddelandet upprepas inte vid varje skott (högst var 4:e sekund)');
  for(const v of g.visitors){v.rescued=true;}g.rescued=3;
  assert.equal(g.shielded,false);aim();assert.equal(lerin.hp,35,'utan sköld tar solstöten ett liv');
});
test('faser: vid 24 och 12 liv kommer tomtezombier, hälsa och sol fylls på, och i sista fasen går Zombie-Lerin snabbare',()=>{
  const g=playing(make()),lerin=g.actors[0],player={x:g.site.x,z:g.site.z+26};
  g.rescued=3;g.visitors.forEach(v=>{v.rescued=true;});g.rescuedSeen=3;g.vern.rescuedSeen=3;
  g.health=50;g.energy=10;const minions=()=>g.actors.filter((a,i)=>i>0&&a.active).length;
  for(let i=0;i<12;i++)g.step(1,player); // förbi de 10 trögstartade sekunderna (och första vågen kommer först efter 18 s)
  assert.equal(lerin.speed,VERN.sleepy.normal,'efter 10 s är han vid full fart');
  g.actors.forEach((a,i)=>{if(i>0)a.active=false;});g.events.length=0;g.health=50;g.energy=10;g.vern.nextWave=1e9;
  lerin.hp=24;g.step(.1,player);
  const e1=g.events.find(e=>e.type==='vernissage-phase');
  assert.ok(e1&&e1.phase===2&&/HÄMTAR FÄRG/.test(e1.title));assert.equal(minions(),3);assert.equal(g.health,70);assert.equal(g.energy,30);
  g.events.length=0;lerin.hp=12;g.step(.1,player);
  const e2=g.events.find(e=>e.type==='vernissage-phase');
  assert.ok(e2&&e2.phase===3&&/SISTA PENSELDRAGET/.test(e2.title));assert.ok(minions()>=3&&minions()<=6);
  g.step(.1,player);assert.ok(Math.abs(lerin.speed-VERN.sleepy.normal*1.25)<1e-9,'snabbare i sista fasen: '+lerin.speed);
  g.events.length=0;g.step(.1,player);assert.equal(g.events.filter(e=>e.type==='vernissage-phase').length,0,'varje fas byts bara en gång');
});
test('vågor: första efter 18 s, sedan var 30:e sekund, högst tre, aldrig fler än sju tomtezombier och aldrig i Zombie-Lerins plats',()=>{
  const g=playing(make()),player={x:g.site.x,z:g.site.z+26},waves=[];
  g.health=1e9; // prova takten, inte överlevnad
  for(let i=0;i<240&&g.phase==='playing';i++){
    g.step(1,player);g.health=100;g.visitors.forEach(v=>{v.health=100;});
    if(i%5===4)g.actors.slice(1).forEach(a=>{a.active=false;}); // spelaren skjuter ned dem emellanåt (annars fylls poolen och en våg kan utebli, se nästa prov)
    for(const e of g.drainEvents())if(e.type==='vernissage-wave')waves.push(Math.round(g.elapsed));
    assert.ok(g.actors.slice(1).filter(a=>a.active).length<=VERN.maxMinions);assert.equal(g.actors[0].kind,'artist');
  }
  assert.equal(waves.length,VERN.waves.max,'högst '+VERN.waves.max+' vågor: '+waves);
  assert.ok(waves[0]>=18&&waves[0]<=20,'första vågen efter ca 18 s: '+waves[0]);
  assert.ok(waves[1]-waves[0]>=29&&waves[1]-waves[0]<=32,'sedan var 30:e: '+waves);
});
test('utan att skjuta ned någon fylls inte poolen över taket: en våg som inte får plats uteblir',()=>{
  const g=playing(make()),player={x:g.site.x,z:g.site.z+26};
  for(let i=0;i<200&&g.phase==='playing';i++){g.step(1,player);g.health=100;g.visitors.forEach(v=>{v.health=100;});assert.ok(g.actors.slice(1).filter(a=>a.active).length<=VERN.maxMinions);}
  assert.ok(g.actors.slice(1).filter(a=>a.active).length<=VERN.maxMinions);
});
test('besökarna som räddas fyller på hälsa och sol, och uppdraget kan vinnas först när alla är räddade och Zombie-Lerin är nere',()=>{
  const g=playing(make()),lerin=g.actors[0];
  g.health=40;g.energy=20;g.visitors[0].following=true;g.visitors[0].x=g.safe.x;g.visitors[0].z=g.safe.z;
  g.step(.1,{x:g.safe.x,z:g.safe.z});
  assert.equal(g.rescued,1);assert.equal(g.health,55);assert.equal(g.energy,40);
  // Utan alla besökare vinns inget, även om Zombie-Lerin faller: tvinga ned honom.
  g.rescued=3;g.visitors.forEach(v=>{v.rescued=true;});g.vern.rescuedSeen=3;
  const aim=()=>{lerin.x=g.site.x;lerin.z=g.site.z;lerin.vx=lerin.vz=0;g.cooldown=0;g.energy=100;g.health=100;return g.shoot({x:lerin.x,z:lerin.z+4,dx:0,dz:-1});};
  let shots=0;for(;shots<200&&g.phase==='playing';shots++){aim();g.step(.4,{x:lerin.x,z:lerin.z+40});}
  assert.equal(g.phase,'won');assert.ok(shots>=24,'minst så många skott som liv över sköld och fas (36 liv, 1–2 per skott): '+shots);
  assert.ok(g.elapsed>=shots*.38-1,'skotten har en spärrtid på 0,38 s: '+g.elapsed.toFixed(1)+' s för '+shots+' skott');
});
test('en nedtagen Zombie-Lerin utan räddade besökare vinner inget: skölden håller honom kvar (inget kan avgöras på sekunder)',()=>{
  const g=playing(make()),lerin=g.actors[0];let shots=0;
  for(;shots<300&&g.phase==='playing';shots++){lerin.x=g.site.x;lerin.z=g.site.z;lerin.vx=lerin.vz=0;g.cooldown=0;g.energy=100;g.health=100;g.shoot({x:lerin.x,z:lerin.z+4,dx:0,dz:-1});g.step(.4,{x:lerin.x,z:lerin.z+40});}
  assert.equal(lerin.hp,36,'inget liv har tagits efter '+shots+' skott');assert.notEqual(g.phase,'won');
});
test('övriga uppdrag är grundspelets: klassen rör bara Sandgrund',()=>{
  const f=make('fikapanik'),base=new CityMission('fikapanik',nav(),{x:20,z:20},280926);
  assert.equal(f.vern,undefined);assert.equal(f.duration,base.duration);assert.equal(f.wave,base.wave);assert.equal(f.actors.length,12);
  f.start({practice:false});base.start({practice:false});
  assert.deepEqual(f.actors.map(a=>[a.kind,a.hp,Math.round(a.x),Math.round(a.z)]),base.actors.map(a=>[a.kind,a.hp,Math.round(a.x),Math.round(a.z)]));
  assert.equal(f.shielded,false);
});
test('spelet använder klassen och visar skölden och nya händelser',()=>{
  const lr=read('last-round.js');
  assert.match(lr,/import \{XmasVernissage\} from '\.\/xmas\/xmas-vernissage\.mjs/);assert.match(lr,/rounds\.sandgrund=new XmasVernissage\('sandgrund'/);
  assert.match(lr,/game\.shielded\?'FÄRGSKÖLD'/,'HUD:en säger FÄRGSKÖLD och räknar mot Zombie-Lerins riktiga liv (inte 12)');assert.doesNotMatch(lr,/ZOMBIE-LERIN \$\{Math\.max\(0,game\.actors\[0\]\.hp\)\}\/12/);
  for(const t of ['vernissage-phase','vernissage-wave','vernissage-shield'])assert.match(lr,new RegExp(`'${t}':`),t);
  const src=read('xmas/xmas-vernissage.mjs');assert.doesNotMatch(src,/\b(document|window|localStorage)\b/);assert.match(src,/import .*\?v=/);
});

// En enkel spelare (bot): går mot uppdragets mål med 7,2 m/s, väjer för fiender och siktar alltid rätt. Ingen hinder i kartan, så det här är den snabbaste rimliga tiden.
function botRun(seed,{speed=7.2,aim=1}={}){
  const g=playing(make('sandgrund',seed)),P={x:g.layout.spawn.x,z:g.layout.spawn.z},dt=1/30;let t=0,s=seed*31+7;
  const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
  while(g.phase==='playing'&&t<600){
    const o=g.objective(P),dx=o.x-P.x,dz=o.z-P.z,d=Math.hypot(dx,dz)||1,lerin=g.actors[0];
    const foes=g.actors.filter(a=>a.active).map(a=>({a,d:Math.hypot(a.x-P.x,a.z-P.z)})).sort((x,y)=>x.d-y.d),near=foes[0];
    let mx=dx/d,mz=dz/d;if(near&&near.d<3){mx+=(P.x-near.a.x)/near.d*1.6;mz+=(P.z-near.a.z)/near.d*1.6;const l=Math.hypot(mx,mz)||1;mx/=l;mz/=l;}
    const fighting=!g.shielded&&lerin.active&&Math.hypot(lerin.x-P.x,lerin.z-P.z)<9;
    if(!fighting&&d>1.2){P.x+=mx*speed*dt;P.z+=mz*speed*dt;}else if(fighting){const ld=Math.hypot(lerin.x-P.x,lerin.z-P.z);if(ld<4){P.x-=(lerin.x-P.x)/ld*speed*dt;P.z-=(lerin.z-P.z)/ld*speed*dt;}}
    let tgt=null;if(!g.shielded&&lerin.active&&Math.hypot(lerin.x-P.x,lerin.z-P.z)<14)tgt=lerin;else if(near&&near.d<14)tgt=near.a;
    if(tgt&&t>.25&&rnd()<aim)g.shoot({x:P.x,z:P.z,dx:tgt.x-P.x,dz:tgt.z-P.z,assist:true,power:g.energy>=60});
    g.step(dt,P);t+=dt;g.drainEvents();
  }
  return {phase:g.phase,t};
}
test('en snabb och träffsäker spelare klarar uppdraget på mellan en halv och två minuter (grundspelets tog ungefär fem sekunder), och en långsammare tar längre tid',()=>{
  const fast=[11,22,33,44].map(seed=>botRun(seed*1013)),slow=[11,22,33,44].map(seed=>botRun(seed*1013,{speed:4.5,aim:.5}));
  for(const r of fast){assert.equal(r.phase,'won');assert.ok(r.t>=40&&r.t<=120,'snabb: '+r.t.toFixed(1)+' s');}
  for(const r of slow){assert.equal(r.phase,'won');assert.ok(r.t>=60&&r.t<=200,'långsammare: '+r.t.toFixed(1)+' s');}
  const avg=a=>a.reduce((s,r)=>s+r.t,0)/a.length;assert.ok(avg(slow)>avg(fast),'en långsammare spelare tar längre tid');
  assert.ok(Math.min(...fast.map(r=>r.t))>20,'aldrig nära grundspelets fem sekunder');
});
