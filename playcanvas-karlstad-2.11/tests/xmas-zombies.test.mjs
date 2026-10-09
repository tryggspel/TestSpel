// Tomtezombies: nivåerna. Efter första rundan hamnade man förut i Julklappsjaktens meny; nu går det att gå vidare: nivå 1 är spiralen runt granen, därefter julrundornas banor med fler paket
// och tomtezombier som kommer tätare och går snabbare, och en klarad nivå sparas och låser upp nästa. Ren logik: ingen webbläsare.
import test from 'node:test';
import assert from 'node:assert/strict';
import {ZOMBIE_MAX,ZOMBIE_LAYOUTS,zombieLevel,zombieGoal,zombiePatrolEvery,zombieSpeed,nextZombieLevel,isZombieUnlocked} from '../xmas/xmas-zombie-levels.mjs';
import {INTRO_GOAL} from '../xmas/xmas-layout.mjs';
import {ROUNDS} from '../xmas/xmas-rounds.mjs';
import {XmasSave,sanitizeSave,blankSave} from '../xmas/xmas-save.mjs';
import {XmasHunt} from '../xmas/xmas-hunt.mjs';

const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};

test('nivåerna: nivå 1 är spiralen med tjugo paket, därefter julrundornas banor i tur och ordning, och det blir hårdare för varje nivå',()=>{
  const a=zombieLevel(1);
  assert.deepEqual([a.n,a.layout,a.goal,a.patrolEvery,a.speedMul,a.id,a.next],[1,'intro',INTRO_GOAL,null,1,'zombies',2],'nivå 1 är som förut: grundspelets egen takt och fart');
  assert.equal(INTRO_GOAL,20);assert.ok(Object.isFrozen(a));
  // banorna: Torget, Kungsgatan, Drottninggatan, sedan om igen. Alla finns bland julrundorna.
  assert.deepEqual([2,3,4,5,6,7].map(n=>zombieLevel(n).layout),['round-torget','round-kungsgatan','round-drottninggatan','round-torget','round-kungsgatan','round-drottninggatan']);
  for(const l of ZOMBIE_LAYOUTS.slice(1))assert.ok(ROUNDS.some(r=>r.id===l.id),l.id);
  assert.deepEqual([2,3,4].map(n=>zombieLevel(n).place),['TORGET','KUNGSGATAN','DROTTNINGGATAN']);assert.equal(zombieLevel(7).title,'TOMTEZOMBIES · NIVÅ 7');assert.equal(zombieLevel(7).id,'zombies-7');
  // målet växer med två per nivå till högst 40, tätheten och farten stiger och planar ut
  assert.deepEqual([1,2,3,10,11,12,50].map(zombieGoal),[20,22,24,38,40,40,40]);
  for(let n=2;n<=40;n++){
    assert.ok(zombieGoal(n)>=zombieGoal(n-1),'målet sjunker aldrig: '+n);assert.ok(zombieSpeed(n)>=zombieSpeed(n-1),'farten sjunker aldrig: '+n);
    if(n>2)assert.ok(zombiePatrolEvery(n)<=zombiePatrolEvery(n-1),'zombierna kommer aldrig glesare: '+n);
  }
  assert.deepEqual([2,3,9,10,50].map(zombiePatrolEvery),[11,10,4,3.5,3.5]);assert.equal(zombiePatrolEvery(1),null);
  assert.deepEqual([1,2,3,11,12,50].map(zombieSpeed),[1,1.05,1.1,1.5,1.5,1.5]);
  // orimliga nivåer ger inget fel
  assert.equal(zombieLevel(0).n,1);assert.equal(zombieLevel(NaN).n,1);assert.equal(zombieLevel(1000).n,ZOMBIE_MAX);assert.equal(zombieLevel(ZOMBIE_MAX).next,0,'efter den sista finns ingen mer');assert.equal(zombieLevel(98).next,99);
});

test('framsteg: nästa nivå är den efter den högsta klarade, och nivåerna låses upp i ordning',()=>{
  assert.deepEqual([null,{},{cleared:0},{cleared:1},{cleared:12},{cleared:ZOMBIE_MAX},{cleared:'x'}].map(nextZombieLevel),[1,1,1,2,13,ZOMBIE_MAX,1]);
  const p={cleared:3};assert.deepEqual([0,1,3,4,5,1.5,'2'].map(n=>isZombieUnlocked(p,n)),[false,true,true,true,false,false,false]);
});

test('sparningen: en klarad nivå sparas (bästa poäng) och låser upp nästa, gamla sparfiler räknas, och orimliga värden begränsas',()=>{
  const m=mem(),a=new XmasSave(m);
  assert.deepEqual(a.zombies,{cleared:0,best:{}});assert.equal(nextZombieLevel(a.zombies),1);
  assert.deepEqual(a.recordZombies(1,{points:900,seconds:70,packages:21}),{record:false,first:true,unlocked:true},'första gången: nästa nivå låses upp');
  assert.deepEqual(a.recordZombies(1,{points:700,seconds:60,packages:20}),{record:false,first:false,unlocked:false},'sämre poäng är inget rekord');
  assert.deepEqual(a.recordZombies(1,{points:1200,seconds:50,packages:22}),{record:true,first:false,unlocked:false},'bättre poäng är ett rekord');
  assert.equal(a.zombies.best[1].points,1200);assert.equal(a.zombies.cleared,1);
  assert.deepEqual(a.recordZombies(2,{points:1500,seconds:80,packages:24}),{record:false,first:true,unlocked:true});assert.equal(nextZombieLevel(a.zombies),3);
  assert.deepEqual(a.recordZombies(ZOMBIE_MAX,{points:5,seconds:1,packages:1}),{record:false,first:true,unlocked:false},'efter den sista nivån finns ingen mer');
  assert.deepEqual(a.recordZombies(0,{points:5}),{record:false,first:false,unlocked:false});assert.deepEqual(a.recordZombies(100,{points:5}),{record:false,first:false,unlocked:false});
  const b=new XmasSave(m);assert.equal(b.zombies.cleared,ZOMBIE_MAX,'sparas');assert.equal(b.zombies.best[2].points,1500);
  // en klarad nivå kan inte vara låst, och den som fick Tomtezombies-stämpeln i en tidigare version har klarat nivå 1
  const s1=sanitizeSave({v:1,zombies:{cleared:0,best:{5:{points:100,seconds:10,packages:5}}}});assert.equal(s1.zombies.cleared,5);
  const s2=sanitizeSave({v:1,stamps:{zombies:1700000000000}});assert.equal(s2.zombies.cleared,1);assert.equal(nextZombieLevel(s2.zombies),2);
  const s3=sanitizeSave({v:1,zombies:{cleared:1e9,best:{1:{points:1e12,seconds:-5,packages:1e9},2:{points:0},x:{points:5}}}});
  assert.equal(s3.zombies.cleared,ZOMBIE_MAX);assert.equal(s3.zombies.best[1].points,9999999);assert.equal(s3.zombies.best[2],undefined);
  assert.deepEqual(sanitizeSave(null).zombies,{cleared:0,best:{}});assert.deepEqual(blankSave().zombies,{cleared:0,best:{}});
});

test('tomtejakten bär sin nivå: körningen och resultatet vet vilken nivå det var, och stämpeln delas ut en gång för alla nivåer',()=>{
  const save=new XmasSave(mem()),h=new XmasHunt({save});
  const run=n=>{
    h.startRun({kind:'zombies',id:zombieLevel(n).id,title:zombieLevel(n).title,level:n,goal:1,packages:[{id:'a',x:0,z:0,kind:'regular'}],tomte:{x:20,z:0,radius:3},stampId:'zombies'});h.drain();
    assert.equal(h.run.level,n);h.step(.1,{x:0,z:0,y:1.68},null,0);h.step(.1,{x:20,z:0,y:1.68},null,0);
    return h.drain().find(e=>e.type==='xmas-deliver').result;
  };
  const r1=run(1),r2=run(2);
  assert.deepEqual([r1.kind,r1.id,r1.level,r1.stamp],['zombies','zombies',1,true]);assert.deepEqual([r2.kind,r2.id,r2.level,r2.stamp],['zombies','zombies-2',2,false],'ingen ny stämpel för nivå 2');
  assert.ok(save.state.records.zombies&&save.state.records['zombies-2'],'ett rekord per nivå');
});
