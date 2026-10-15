// Rutan "Lucka N är avklarad" (xmas/xmas-door.mjs): visas när man klarat ett uppdrag man kom till från Julkalendern. Spelet frågar kalenderns egna regler om luckan är klar.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isDoorDone,resultMatches,nextDoor,doorBox,DOOR_MAX} from '../xmas/xmas-door.mjs';
import {describeLink} from '../xmas/xmas-deeplink.mjs';
import {XmasSave} from '../xmas/xmas-save.mjs';
import {DOORS} from '../julkalender/doors.mjs';

class Store{constructor(){this.m=new Map();}getItem(k){return this.m.has(k)?this.m.get(k):null;}setItem(k,v){this.m.set(k,String(v));}removeItem(k){this.m.delete(k);}}
const fresh=()=>new XmasSave(new Store());
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('nästa lucka: imorgon, ett senare datum, redan öppen och efter lucka 24',()=>{
  assert.deepEqual(nextDoor(1,'2026-12-01'),{n:2,day:'2026-12-02',date:'2/12',when:'imorgon'});
  assert.equal(nextDoor(1,'2026-10-15').when,'senare');assert.equal(nextDoor(1,'2026-10-15').date,'2/12');
  assert.equal(nextDoor(1,'2026-12-02').when,'öppen');assert.equal(nextDoor(1,'2026-12-20').when,'öppen');
  assert.deepEqual(nextDoor(23,'2026-12-23'),{n:24,day:'2026-12-24',date:'24/12',when:'imorgon'});
  assert.equal(nextDoor(24,'2026-12-24'),null);assert.equal(nextDoor(0),null);assert.equal(nextDoor(25),null);assert.equal(DOOR_MAX,24);
});
test('luckan är klar enligt kalenderns villkor mot spelets sparning, och inte före',()=>{
  const s=fresh();
  assert.equal(isDoorDone(1,s.state),false);s.stamp('intro');assert.equal(isDoorDone(1,s.state),true);
  assert.equal(isDoorDone(6,s.state),false);s.stamp('sandgrund');assert.equal(isDoorDone(6,s.state),true);
  assert.equal(isDoorDone(9,s.state),false);s.stamp('marieberg');assert.equal(isDoorDone(9,s.state),true);
  assert.equal(isDoorDone(4,s.state),false);s.recordRush(1,{points:900,seconds:30,packages:25,hearts:2,cleared:true});assert.equal(isDoorDone(4,s.state),true);
  assert.equal(isDoorDone(21,s.state),false,'Rush 4 med för få poäng räcker inte');
  assert.equal(isDoorDone(0,s.state),false);assert.equal(isDoorDone(99,s.state),false);assert.equal(isDoorDone(1,null),false);
});
test('rutan för lucka 1: rubrik, poäng, stjärnor, nästa lucka imorgon och vad man kan göra under tiden',()=>{
  const s=fresh();s.stamp('intro');
  const b=doorBox({door:1,state:s.state,points:540,today:'2026-12-01'});
  assert.equal(b.title,'LUCKA 1 ÄR AVKLARAD!');assert.match(b.heading,/Hjälp tomten/);
  assert.equal(b.line,'Du fick 540 julpoäng och 1 stjärna i kalendern.');
  assert.equal(b.next,'Nästa lucka öppnas imorgon den 2/12.');
  assert.equal(b.tail,'Under tiden kan du spela resten av Julspelet här:');assert.equal(b.final,false);
  const c=doorBox({door:1,state:s.state,points:540,today:'2026-10-15'});assert.equal(c.next,'Nästa lucka öppnas den 2/12.');
  const d=doorBox({door:1,state:s.state,points:0,today:'2026-12-01'});assert.equal(d.line,'Du fick 1 stjärna i kalendern.','utan poäng nämns bara stjärnan');
  const e=doorBox({door:1,state:s.state,points:540,today:'2026-12-09'});assert.match(e.next,/Lucka 2 är redan öppen/);assert.match(e.tail,/Du kan också/);
});
test('rutan visas bara när luckan är klar, och efter lucka 24 säger den god jul',()=>{
  assert.equal(doorBox({door:1,state:fresh().state,points:100,today:'2026-12-01'}),null);
  assert.equal(doorBox({door:0,state:fresh().state}),null);assert.equal(doorBox({door:25,state:fresh().state}),null);
  const s=fresh();for(const id of ['intro','round-torget','cervera','pressbyran','round-kungsgatan','round-drottninggatan','sandgrund','marieberg'])s.stamp(id);
  const f=doorBox({door:24,state:s.state,points:0,today:'2026-12-24'});
  assert.ok(f&&f.final);assert.match(f.next,/God jul/);assert.match(f.line,/3 stjärnor/);
});
test('resultatet måste höra ihop med det luckan ber om (stämpel, rush, nivå, maraton), och ett misslyckat försök räknas aldrig',()=>{
  assert.equal(resultMatches({stamp:'intro'},{kind:'intro',id:'intro',stampId:'intro'}),true);
  assert.equal(resultMatches({stamp:'round-torget'},{kind:'round',id:'round-torget',stampId:'round-torget'}),true);
  assert.equal(resultMatches({stamp:'round-torget'},{kind:'round',id:'round-kungsgatan',stampId:'round-kungsgatan'}),false);
  assert.equal(resultMatches({stamp:'marieberg'},{kind:'marieberg',id:'marieberg',stampId:'marieberg'}),true);
  assert.equal(resultMatches({stamp:'sandgrund'},{id:'sandgrund',stampId:'sandgrund'}),true);
  assert.equal(resultMatches({rush:3,stamp:undefined},{kind:'rush',rush:{n:3,cleared:true}}),true);
  assert.equal(resultMatches({rush:3},{kind:'rush',rush:{n:3,cleared:false}}),false,'en rush som inte klarades räknas inte');
  assert.equal(resultMatches({rush:3},{kind:'rush',rush:{n:2,cleared:true}}),false);
  assert.equal(resultMatches({zombies:2},{kind:'zombies',level:2}),true);assert.equal(resultMatches({zombies:2},{kind:'zombies',level:1}),false);
  assert.equal(resultMatches({zombies:2},{kind:'zombies',level:2,failed:true}),false);
  assert.equal(resultMatches({marathon:true},{kind:'rush',rush:null}),true);assert.equal(resultMatches({marathon:true},{kind:'rush',rush:{n:1,cleared:true}}),false);
  assert.equal(resultMatches({},{kind:'intro',stampId:'intro'}),false);assert.equal(resultMatches(null,{}),false);assert.equal(resultMatches({stamp:'intro'},{failed:true,stampId:'intro'}),false);
});
test('varje lucka som djuplänken kan starta får sin ruta när uppdraget är klart: länkens gives hör ihop med luckans villkor',()=>{
  const played=()=>{const s=fresh();s.stamp('intro');return s;};
  let seen=0;
  for(const d of DOORS){
    const key=d.spel.djup,card=describeLink(key,{save:played(),door:d.n});if(card.direct)continue;seen++;
    const s=played();
    const g=card.gives;
    if(g.stamp)s.stamp(g.stamp);
    if(g.rush)for(let n=1;n<=g.rush;n++)s.recordRush(n,{points:d.check.min||1000,seconds:30,packages:25,hearts:3,cleared:true});
    if(g.zombies)for(let n=1;n<=g.zombies;n++)s.recordZombies(n,{points:500,seconds:60,packages:20});
    if(g.marathon)continue; // Maraton kräver tempo 6: prövas nedan
    const b=doorBox({door:d.n,state:s.state,points:100,today:'2026-12-01'});
    assert.ok(b,`lucka ${d.n} (${key}): rutan visas när uppdraget är klart`);assert.equal(b.door,d.n);assert.equal(b.stars,d.stjarnor);
  }
  assert.ok(seen>=17,'djuplänkar med uppdrag: '+seen);
  const m=played();m.record('julrush',{points:3000,seconds:80,packages:20,bonus:1,level:6});assert.ok(doorBox({door:19,state:m.state,points:100,today:'2026-12-19'}),'Maraton tempo 6');
  const w=played();w.record('julrush',{points:1000,seconds:60,packages:10,bonus:0,level:3});assert.equal(doorBox({door:19,state:w.state,points:100,today:'2026-12-19'}),null,'Maraton tempo 3 räcker inte');
});
test('spelet använder rutan på alla ställen där ett uppdrag kan sluta: resultatkorten, Sandgrund, butikerna och ärendet; och nollar luckan i menyn',()=>{
  const boot=read('xmas/xmas-boot.js'),ui=read('xmas/xmas-ui.js'),css=read('xmas/xmas.css');
  assert.match(boot,/e\.result=\{\.\.\.e\.result,door:doorFor\(e\.result\)\}/,'hunt, nivå och båt: resultatkortet');
  assert.match(boot,/r\.door=doorFor\(\{\.\.\.r,kind:'rush',rush:k\|\|null\}\)/,'JulRushen');
  assert.match(boot,/ui\.placeDoor\(doorFor\(\{id:SANDGRUND\.id/,'Sandgrund (grundspelets resultatkort)');
  assert.match(boot,/doorToast\(\{id:e\.placeId/,'butiksstämpeln (Cervera)');assert.match(boot,/doorToast\(\{id:e\.stampId/,'ärendet (Pressbyrån)');
  assert.match(boot,/doorLink=null;ui\.placeDoor\(null\);hunt\.cancel\('meny'\)/,'menyn nollar luckan');
  assert.match(boot,/doorLink=d\.startable&&d\.door\?\{door:d\.door,gives:d\.gives\}:null/,'bara när man tryckt STARTA på ett startbart kort');
  assert.match(boot,/doorMenu:doorMenuGo/);
  assert.match(ui,/function placeDoor\(/);assert.match(ui,/placeDoor\(res\.door\|\|null,result,\$\('xmasResultContinue'\)\)/);
  assert.match(css,/\.xmas-door/);
  const src=read('xmas/xmas-door.mjs');assert.doesNotMatch(src,/\b(document|window|localStorage|location)\b/);
});
