// Julvernissagen (Sandgrund) och Julbåten (Mariebergsskogen): julens version av två av grundspelets uppdrag.
// Reglerna för själva uppdragen är grundspelets; här provas det julen lägger till: stämplarna, banan i Mariebergsskogen, poängen och texterna.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STAMPS} from '../xmas/xmas-config.mjs';
import {SANDGRUND,sandgrundOutcome,sandgrundLine,sandgrundNote} from '../xmas/xmas-sandgrund.mjs';
import {BOAT,buildMarieberg,boatBonus,boatNote} from '../xmas/xmas-marieberg.mjs';
import {XmasHunt} from '../xmas/xmas-hunt.mjs';
import {XmasSave} from '../xmas/xmas-save.mjs';
import {MISSIONS} from '../city-missions.mjs';
import {MARIEBERG,HARBOUR} from '../city-south-space.mjs';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
class Store{constructor(){this.m=new Map();}getItem(k){return this.m.has(k)?this.m.get(k):null;}setItem(k,v){this.m.set(k,String(v));}removeItem(k){this.m.delete(k);}}
// En påhittad park: vatten öster om bryggan och träd var 13:e meter.
const park=(x,z)=>x>MARIEBERG.x+6||(Math.abs(((x%13)+13)%13)<1.6&&Math.abs(((z%13)+13)%13)<1.6);

test('de två nya julstämplarna finns och hör ihop med uppdragen',()=>{
  for(const id of ['sandgrund','marieberg']){const st=STAMPS.find(s=>s.id===id);assert.ok(st&&st.label&&st.sub,id);assert.ok(st.label.length<=30,'stämpeln ryms på stämpelkortet: '+st.label);}
  assert.equal(STAMPS.length,11);assert.equal(new Set(STAMPS.map(s=>s.id)).size,STAMPS.length,'unika id');
  assert.equal(SANDGRUND.id,'sandgrund');assert.ok(MISSIONS.some(m=>m.id===SANDGRUND.id),'Sandgrund finns som uppdrag i grundspelet');
  assert.equal(BOAT.id,'marieberg');
  assert.match(MISSIONS.find(m=>m.id==='sandgrund').place,/Sandgrund/);
});
test('Julvernissagen: bara en vunnen omgång på riktigt räknas; första gången ger stämpel och 200 julpoäng, sedan 40',()=>{
  assert.deepEqual(sandgrundOutcome({won:true,practice:false,score:900}),{count:true,stamp:true,points:200});
  assert.deepEqual(sandgrundOutcome({won:true,practice:false},{hadStamp:true}),{count:true,stamp:false,points:40});
  for(const r of [{won:false},{won:true,practice:true},null,undefined])assert.deepEqual(sandgrundOutcome(r),{count:false,stamp:false,points:0});
  assert.match(sandgrundLine({count:true,stamp:true,points:200},{label:'SANDGRUND · JULVERNISSAGEN'}),/JULSTÄMPEL: SANDGRUND · JULVERNISSAGEN · \+200/);
  assert.match(sandgrundLine({count:true,stamp:false,points:40}),/Redan stämplad · \+40/);assert.equal(sandgrundLine({count:false}),'');
  assert.match(sandgrundNote(false),/Zombie-Lerin/);assert.match(sandgrundNote(true),/stämplad/);
});
test('Julvernissagen sparas som stämpel, rekord och julpoäng i julsparningen',()=>{
  const st=new Store(),save=new XmasSave(st);
  const o=sandgrundOutcome({won:true,practice:false,score:1200,rescued:3,seconds:70},{hadStamp:save.hasStamp('sandgrund')});
  assert.equal(save.stamp('sandgrund'),o.stamp);save.record('sandgrund',{points:1200,seconds:70,packages:3,bonus:0});save.addTotals({points:o.points});
  const again=new XmasSave(st);
  assert.equal(again.hasStamp('sandgrund'),true);assert.equal(again.state.records.sandgrund.points,1200);assert.equal(again.state.totals.points,200);assert.equal(again.stampTotal(),11);
  assert.equal(save.stamp('sandgrund'),false,'stämpeln ges bara en gång');
});

test('Marieberg-banan: tolv paket och tre bonuspaket på fri mark, jämnt utspridda och inom räckhåll från bryggan',()=>{
  const open=buildMarieberg({blocked:()=>false});
  assert.equal(open.ok,true);assert.equal(open.goal,12);assert.equal(open.regularTotal,12);assert.equal(open.bonusTotal,3);assert.equal(open.packages.length,15);
  const walls=buildMarieberg({blocked:park});
  for(const d of [open,walls]){
    assert.ok(d.ok,'banan går att lägga');assert.equal(new Set(d.packages.map(p=>p.id)).size,d.packages.length,'unika id');
    for(const p of d.packages){
      const r=dist(p,BOAT.landing);assert.ok(r>=BOAT.reach.min&&r<=BOAT.reach.max,`${p.id} ligger ${Math.round(r)} m från bryggan`);
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));assert.ok(['regular','bonus'].includes(p.kind));
    }
    for(let i=0;i<d.packages.length;i++)for(let j=i+1;j<d.packages.length;j++)assert.ok(dist(d.packages[i],d.packages[j])>=BOAT.spacing-.01,'för tätt: '+d.packages[i].id+' och '+d.packages[j].id);
    assert.ok(dist(d.spawn,BOAT.landing)<=10,'start vid bryggan');assert.ok(dist(d.tomte,BOAT.landing)<=16,'tomten väntar vid bryggan');assert.equal(d.tomte.radius,BOAT.tomteRadius);
    for(const p of d.packages)assert.ok(dist(p,d.tomte)>=6,'inget paket ligger i tomtens leveransring');
  }
  for(const p of walls.packages)for(const [dx,dz] of [[0,0],[1.3,0],[-1.3,0],[0,1.3],[0,-1.3]])assert.equal(park(p.x+dx,p.z+dz),false,`${p.id} har fri yta runt sig`);
  assert.ok(walls.spawn&&!park(walls.spawn.x,walls.spawn.z)&&!park(walls.tomte.x,walls.tomte.z),'start och tomte står på fri mark');
});
test('Marieberg-banan är deterministisk, har bonuspaketen längst bort och börjar vid spelets egna fria platser',()=>{
  const a=buildMarieberg({blocked:park}),b=buildMarieberg({blocked:park});assert.deepEqual(a,b);
  const bonus=a.packages.filter(p=>p.kind==='bonus'),regular=a.packages.filter(p=>p.kind==='regular');
  assert.equal(bonus.length,3);assert.ok(Math.min(...bonus.map(p=>dist(p,BOAT.landing)))>=Math.min(...regular.map(p=>dist(p,BOAT.landing))),'bonuspaketen är avstickare');
  assert.ok(bonus.every(p=>/^m:b\d$/.test(p.id))&&regular.every(p=>/^m:\d\d$/.test(p.id)));
  const open=buildMarieberg({blocked:()=>false});
  assert.deepEqual(open.packages.filter(p=>p.kind==='regular').slice(0,2).map(p=>[p.x,p.z]),[[-787,1310],[-792,1334]],'grundspelets termospunkter (marieberg-0 och -1) först');
});
test('Marieberg-banan ger upp snyggt när parken är för trång, men aldrig fler än målet',()=>{
  const tight=buildMarieberg({blocked:(x,z)=>x<MARIEBERG.x-30||z>MARIEBERG.z+20||z<MARIEBERG.z-20||x>MARIEBERG.x+4});
  assert.ok(tight.goal<=12&&tight.goal<=tight.regularTotal);
  const none=buildMarieberg({blocked:()=>true});assert.equal(none.ok,false);assert.equal(none.packages.length,0);assert.equal(none.goal,0);
});
test('båtresans bidrag räknas högst 300 poäng och 12 passagerare, och tål trasiga värden',()=>{
  assert.deepEqual(boatBonus({saved:9,points:260,calm:false}),{saved:9,points:260,calm:false});
  assert.deepEqual(boatBonus({saved:99,points:99999}),{saved:12,points:BOAT.maxBoatPoints,calm:false});
  assert.deepEqual(boatBonus(null),{saved:0,points:0,calm:false});assert.deepEqual(boatBonus({saved:'x',points:-5}),{saved:0,points:0,calm:false});
  assert.match(boatNote(false),/Inre hamn/);assert.match(boatNote(true),/stämplad/);
  assert.ok(dist(BOAT.harbour,HARBOUR)<1&&dist(BOAT.landing,MARIEBERG)<1,'hamnen och bryggan är grundspelets');
});
test('Julbåtens jakt spelas genom jaktmotorn: samla tolv, lämna hos tomten, stämpel, rekord och båtpoängen med',()=>{
  const st=new Store(),save=new XmasSave(st),hunt=new XmasHunt({save,nav:{blocked:park}});
  const def=buildMarieberg({blocked:park}),boat=boatBonus({saved:9,points:260});
  hunt.startRun({kind:'marieberg',id:BOAT.id,title:BOAT.title,goal:def.goal,packages:def.packages,tomte:def.tomte,spawn:def.spawn,tree:null,windowSec:BOAT.windowSec,soft:0,stampId:BOAT.id,ordered:false,extra:boat.points,extraLabel:'BÅTRESAN'});
  let t=0;const step=p=>{hunt.step(.5,{x:p.x,z:p.z,y:1.68},null,0);t+=.5;};
  for(const p of def.packages.filter(p=>p.kind==='regular')){step({x:p.x+30,z:p.z});step(p);}
  assert.equal(hunt.run.collected,12);assert.equal(hunt.run.phase,'deliver','målet är nått: dags att lämna');
  const ev=hunt.drain();assert.ok(ev.some(e=>e.type==='xmas-goal'));
  step({x:def.tomte.x+30,z:def.tomte.z});assert.equal(hunt.run.phase,'deliver','man måste fram till tomten');
  step(def.tomte);
  const res=hunt.drain().find(e=>e.type==='xmas-deliver')?.result;
  assert.ok(res,'leveransen gav ett resultat');assert.equal(res.kind,'marieberg');assert.equal(res.stamp,true);assert.equal(res.stampId,'marieberg');
  assert.equal(res.parts.extra,260);assert.equal(res.parts.extraLabel,'BÅTRESAN');assert.equal(res.points,res.parts.packages+res.parts.delivery+res.parts.time+260);
  const again=new XmasSave(st);assert.equal(again.hasStamp('marieberg'),true);assert.equal(again.state.records.marieberg.points,res.points);assert.equal(again.state.totals.points,res.points);assert.equal(again.state.totals.packages,12);
  // en jakt utan båtpoäng (alla andra jakter) har ingen extra-rad: resultatet är oförändrat
  hunt.startRun({kind:'zombies',id:'zombies',goal:1,packages:[{id:'a',x:0,z:0}],tomte:{x:5,z:0,radius:3},stampId:null});
  hunt.step(.5,{x:0,z:0,y:1.68});hunt.step(.5,{x:5,z:0,y:1.68});
  assert.ok(!('extra' in hunt.drain().find(e=>e.type==='xmas-deliver').result.parts));
});

test('koden i julbygget: knapparna, krokarna och länken till Julkalendern finns',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const id of ['xmasSandgrund','xmasSandgrundNote','xmasBoat','xmasBoatNote','xmasCalendar','xmasCalendar2'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/id="xmasCalendar" class="xmas-link" href="\.\/julkalender\/"/);
  const lr=fs.readFileSync(new URL('../last-round.js',import.meta.url),'utf8');
  for(const hook of ['xmas?.missionDone','xmas?.boatArrive','xmas?.boatAbort','xmas?.afterMission','startMission:','boardBoat:','boatActive:','explore:'])assert.ok(lr.includes(hook),'last-round.js saknar '+hook);
  const br=fs.readFileSync(new URL('../boat-ride.js',import.meta.url),'utf8');assert.match(br,/onAbort/);
  const boot=fs.readFileSync(new URL('../xmas/xmas-boot.js',import.meta.url),'utf8');
  for(const fn of ['startSandgrund','missionDone','afterMission','startBoat','boatArrive','boatAbort','startMarieberg'])assert.ok(boot.includes('function '+fn),fn);
  assert.match(boot,/sandgrund:\(\)=>startSandgrund\(\),boat:\(\)=>startBoat\(\)/);
  const css=fs.readFileSync(new URL('../xmas/xmas.css',import.meta.url),'utf8');assert.match(css,/body\.xmas-mission #cityNewRun/);assert.match(css,/a\.xmas-link/);
});
