import test from 'node:test';
import assert from 'node:assert/strict';
import {StampBook,STAMP_KEY} from '../city-stamps.mjs';
import {GhostRun,GHOST_KEY} from '../ghost-run.mjs';
import {CursedHunt,pickCursed,halloweenActive,bearing,HALLOWEEN_KEY,CURSED_COUNT} from '../halloween.mjs';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney} from '../journey-rules.mjs';

const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
const places=[{id:'torget',label:'STORA TORGET',x:0,z:0},{id:'domkyrkan',label:'DOMKYRKAN',x:145,z:-117},{id:'kil',label:'KIL',x:-10583,z:-13678,radius:30}];

test('stämplar: en per plats, bara på marknivå, sparas mellan sessioner',()=>{
  const s=storage(),b=new StampBook(places,s);
  assert.equal(b.check({x:30,z:0}),null);
  assert.equal(b.check({x:2,z:3,y:1.68+5.4}),null,'övervåning räknas inte');
  const first=b.check({x:2,z:3});assert.equal(first.place.id,'torget');assert.equal(first.count,1);assert.equal(first.total,3);
  assert.equal(b.check({x:2,z:3}),null,'samma plats ger ingen ny stämpel');
  const again=new StampBook(places,s);assert.equal(again.count,1);
  again.check({x:146,z:-110});const done=again.check({x:-10570,z:-13660});assert.equal(done.complete,true);
  s.setItem(STAMP_KEY,'{trasig');assert.equal(new StampBook(places,s).count,0,'trasig lagring kraschar inte');
});

test('spöke: bästa rundan sparas, sämre ersätter inte, uppspelning interpolerar',()=>{
  const s=storage(),g=new GhostRun(s);
  for(let t=0;t<=10;t+=1/60)g.record(t,{x:t*2,z:-t},Math.floor(t));
  assert.equal(g.finish(250,10),true);
  const pose=new GhostRun(s).pose(5);assert.ok(Math.abs(pose.x-10)<.3&&Math.abs(pose.z+5)<.2);assert.equal(pose.score,250);
  for(let t=0;t<=10;t+=1/60)g.record(t,{x:0,z:0},1);
  assert.equal(g.finish(100,1),false,'sämre runda skriver inte över');
  assert.equal(JSON.parse(s.getItem(GHOST_KEY)).score,250);
  for(let t=0;t<=4;t+=1/60)g.record(t,{x:9,z:9},0);
  for(let t=0;t<=2;t+=1/60)g.record(t,{x:1,z:1},0); // ny runda (tiden backade)
  assert.ok(g.rec.x.length>=10&&g.rec.x.length<=11,'inspelningen började om när tiden backade');
  assert.ok(JSON.stringify(new GhostRun(s).best).length<20000,'ryms gott i localStorage');
});

test('halloween: säsong, 13 deterministiska och utspridda platser, ingen påverkan på poäng',()=>{
  assert.equal(halloweenActive(new Date('2026-10-02T12:00:00Z')),false);
  assert.equal(halloweenActive(new Date('2026-10-31T22:00:00Z')),true);
  assert.equal(halloweenActive(new Date('2026-11-02T23:30:00Z')),false,'Stockholmstid: 3 nov efter midnatt');
  assert.equal(halloweenActive(new Date('2026-10-02T12:00:00Z'),'?season=halloween'),true);
  assert.equal(bearing({x:0,z:0},{x:0,z:-10}),'norr');assert.equal(bearing({x:0,z:0},{x:10,z:0}),'öster');
  const journey=new CityJourney(new CityNavigation(),{x:-135,z:98},{'sista-rundan':{x:46,z:37},fikapanik:{x:8,z:6},'radda-fikat':{x:-135,z:55},sandgrund:{x:-12,z:-370}});
  const a=pickCursed(journey.items),b=pickCursed([...journey.items].reverse());
  assert.equal(a.length,CURSED_COUNT);assert.deepEqual(a.map(t=>t.id),b.map(t=>t.id),'samma för alla spelare oavsett ordning');
  let min=Infinity;for(const p of a)for(const q of a)if(p!==q)min=Math.min(min,Math.hypot(p.x-q.x,p.z-q.z));
  assert.ok(min>40,'utspridda över staden, minsta avstånd '+Math.round(min)+' m');
  assert.ok(a.every(t=>!/^(kil|marieberg)-/.test(t.id)));
  const s=storage(),h=new CursedHunt(journey.items,s,()=>'Kungsgatan');
  const before=journey.balance;
  const first=h.collect(a[0].id,a[0]);assert.equal(first.count,1);assert.match(first.clue,/^Nästa: Kungsgatan · ca \d+ m åt /);
  assert.equal(h.collect(a[0].id,a[0]),null);assert.equal(journey.balance,before,'jakten ger inga extra poäng');
  for(const t of a.slice(1))h.collect(t.id,t);assert.equal(h.unlocked,true);
  assert.equal(new CursedHunt(journey.items,s).count,13,'fynden sparas över säsongen');
  assert.ok(s.getItem(HALLOWEEN_KEY).includes('"unlocked":true'));
});
