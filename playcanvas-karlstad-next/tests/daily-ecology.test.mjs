import test from 'node:test';
import assert from 'node:assert/strict';
import {CityJourney,JOURNEY_KEY} from '../journey-rules.mjs';
import {CityNavigation} from '../city-missions.mjs';
import {dailyFor,stockholmDay,validDay,challengeRequest,challengeLink,parseKit,encodeKit,dailyRecord} from '../daily-challenge.mjs';
import {SUN} from '../city-ecology.mjs';

const nav=new CityNavigation(),p={x:0,z:14},f={x:0,z:-1};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-12,z:19,name:'Fika'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
function make(){const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};return new CityJourney(nav,{x:-135,z:98},portals,storage);}
const runState=g=>({seed:g.rush.seed,time:g.rush.time,contract:g.rush.contract,panic:g.rush.panic,chaosCount:g.rush.chaosCount,nextChaos:g.rush.nextChaos,actors:g.actors.filter(a=>a.active).map(a=>({x:a.x,z:a.z,kind:a.kind,speed:a.speed}))});

test('the daily switches at Karlstad midnight in both summer and winter, not device midnight',()=>{
  assert.equal(stockholmDay(new Date('2026-09-29T21:59:59Z')),'2026-09-29');
  assert.equal(stockholmDay(new Date('2026-09-29T22:00:00Z')),'2026-09-30');
  assert.equal(stockholmDay(new Date('2026-01-02T22:59:59Z')),'2026-01-02');
  assert.equal(stockholmDay(new Date('2026-01-02T23:00:00Z')),'2026-01-03');
  assert.deepEqual(dailyFor('2026-09-29'),dailyFor('2026-09-29'));
  assert.notEqual(dailyFor('2026-09-29').seed,dailyFor('2026-09-30').seed);
});

test('shared dates, rules and kits reject malformed data; old valid dates replay instead of changing to today',()=>{
  for(const day of ['2026-02-30','2026-9-29','<script>','2026-13-01']){assert.equal(validDay(day),false);assert.ok(challengeRequest('?daily='+day).error);}
  assert.equal(validDay('2028-02-29'),true);assert.ok(challengeRequest('?daily=2026-09-29&rules=99').error);
  for(const kit of ['-1.45.0.0.0','9999999.60.0.0.0','75.101.0.0.0','75.60.zzzzzzz.0.0'])assert.equal(parseKit(kit),null);
  const r={kind:'daily',day:'2026-09-29',seed:99,score:1234};
  const url=challengeLink('https://example.org/game/?other=remove#map',r),request=challengeRequest(new URL(url).search,new Date('2026-12-24T12:00:00Z'));
  assert.equal(request.challenge.day,'2026-09-29');assert.equal(request.challenge.seed,dailyFor(r.day).seed);assert.equal(request.target,1234);
  assert.equal(new URL(url).hash,'');assert.equal(new URL(url).searchParams.has('other'),false);
  assert.equal(challengeRequest('?challenge=bus&from=unknown').from,'torget');
});

test('daily attempts have identical resources and events despite different saved progress, and cannot overwrite the wallet mid-run',()=>{
  const a=make(),b=make();a.balance=91234;a.energy=99;a.secretsFound.add(a.secrets[0].id);a.postcardsFound.add('church');a.cleared.add(a.ambushes[0].id);a.save();b.save();
  const original=a.storage.getItem(JOURNEY_KEY),challenge=dailyFor('2026-09-29');
  for(const g of [a,b])g.rush.start('timed',{challenge});
  assert.equal(a.balance,75);assert.equal(a.energy,60);assert.equal(a.secretsFound.size,0);assert.equal(a.cleared.size,0);
  for(let i=0;i<60;i++){a.rush.step(1,p,f);b.rush.step(1,p,f);assert.deepEqual(runState(a),runState(b));}
  a.reward(75);a.energy=10;a.refill();a.save();assert.equal(a.storage.getItem(JOURNEY_KEY),original);
  a.rush.start('free');assert.equal(a.balance,91234);assert.equal(a.energy,99);assert.ok(a.postcardsFound.has('church'));assert.ok(a.secretsFound.has(a.secrets[0].id));
});

test('daily victory records once, restores normal progress, and keeps each date separate',()=>{
  const g=make();g.balance=987;g.energy=85;g.save();const challenge=dailyFor('2026-09-29');
  g.rush.start('timed',{challenge});g.health=48;g.rush.earn(800);g.rush.step(.1,g.safeZones[0],f);
  assert.equal(g.rush.state,'escaped');assert.equal(g.rush.resultHealth,48);assert.equal(g.balance,987);assert.equal(g.energy,85);
  const score=g.rush.finalScore;assert.equal(dailyRecord(g.storage,challenge.day).best,score);g.rush.end(true);
  assert.equal(dailyRecord(g.storage,challenge.day).attempts,1);
  g.rush.start('timed',{challenge});g.rush.end(false,'Tiden slut.');assert.equal(dailyRecord(g.storage,challenge.day).best,score);assert.equal(dailyRecord(g.storage,challenge.day).attempts,2);
  assert.equal(dailyRecord(g.storage,'2026-09-30').best,0);assert.equal(g.balance,987);
});

test('a friend hunt link reproduces the original starting resources, discoveries, contract order and chaos seed',()=>{
  const original=make(),friend=make();original.balance=156;original.energy=83;original.secretsFound.add(original.secrets[1].id);original.cleared.add(original.ambushes[0].id);original.postcardsFound.add('church');
  original.rush.start('timed',{seed:41239});
  const record={kind:'hunt',seed:original.rush.seed,score:900,kit:original.rush.replayKit},url=challengeLink('https://example.org/game/',record);
  const request=challengeRequest(new URL(url).search);assert.deepEqual(parseKit(encodeKit(record.kit)),record.kit);
  friend.rush.start('timed',{challenge:{kind:'friend',seed:request.seed,seconds:180},kit:request.kit});
  assert.deepEqual(friend.runKit(),original.runKit());
  for(let i=0;i<70;i++){original.rush.step(1,p,f);friend.rush.step(1,p,f);assert.deepEqual(runState(friend),runState(original));}
});

test('the no-SUPER daily rule blocks the actual weapon while preserving ordinary shots',()=>{
  const g=make();let challenge;for(let day=1;day<=4;day++){const d=dailyFor('2026-10-0'+day);if(d.noSuper)challenge=d;}
  assert.ok(challenge);g.rush.start('timed',{challenge});
  assert.equal(g.shoot({x:0,z:14,dx:0,dz:-1,power:true}),null);assert.equal(g.energy,60);assert.equal(g.shots,0);
  assert.ok(g.shoot({x:0,z:14,dx:0,dz:-1}));assert.equal(g.shots,1);
});

test('coffee collected in the city raises scent, starts a bounded horde and decays after the break',()=>{
  const g=make();g.rush.start('free');for(const item of g.items.slice(0,5))g.step(.01,item,f);
  const ecology=g.rush.ecology;assert.equal(ecology.scent,100);assert.ok(ecology.hordeUntil>0);assert.ok(g.drainEvents().some(e=>e.type==='coffee-catastrophe'));
  for(let i=0;i<12;i++)g.rush.step(1,p,f);
  assert.ok(g.actors.filter(a=>a.active).length<=6);assert.equal(g.actors.length,12);
  g.rush.step(1,p,f);assert.equal(ecology.hordeUntil,0);assert.ok(ecology.scent<=55);
  const before=ecology.scent;g.rush.step(2,p,f);assert.ok(ecology.scent<before);
});

test('following the moving sun charges energy, removes scent and pays the six-second bonus only once',()=>{
  const g=make();g.rush.start('free');const e=g.rush.ecology;e.startSun(p,f);assert.ok(e.sun);const start={x:e.sun.x,z:e.sun.z};
  g.energy=10;g.health=50;e.scent=90;const balance=g.balance;
  for(let i=0;i<80;i++){const at={x:e.sun.x,z:e.sun.z};g.rush.spent+=.1;e.step(.1,at,f);assert.equal(nav.blocked(e.sun.x,e.sun.z),false);}
  assert.ok(Math.hypot(start.x-e.sun.x,start.z-e.sun.z)>1);assert.ok(g.energy>80);assert.ok(g.health>60);assert.ok(e.scent<20);
  assert.equal(g.balance,balance+SUN.reward);assert.equal(e.sunBonuses,1);assert.equal(g.drainEvents().filter(ev=>ev.type==='sun-bonus').length,1);
  const held=e.sun.held;g.pause();g.step(1,{x:e.sun.x,z:e.sun.z},f);assert.equal(e.sun.held,held);
});

test('solar zombie bonuses require a real kill in the light; ordinary kills still pay 45 XP',()=>{
  for(const solar of [false,true]){
    const g=make();g.rush.start('free');g.rush.ecology.inSun=solar;g.rush.spawnEnemy(p,f);
    const a=g.actors.find(z=>z.active);while(a.active){g.cooldown=0;g.shoot({x:a.x,z:a.z+3,y:1.68,dx:0,dz:-1,assist:true});}
    assert.equal(g.balance,solar?90:45);
  }
});

test('survival ends with a real breather and sunlight; blackout follows paused game time',()=>{
  const g=make();g.rush.start('free');g.rush.raisePanic(100);g.drainEvents();g.rush.step(25,p,f);
  assert.equal(g.rush.panic,55);assert.ok(g.rush.nextChaos>=37);assert.ok(g.rush.ecology.sun);assert.equal(g.drainEvents().some(e=>e.type==='chaos-bells'),false);
  g.rush.chaosCount=1;g.rush.triggerChaos(p,f);assert.equal(g.rush.snapshot().blackoutRemaining,12);
  g.pause();g.step(1,p,f);assert.equal(g.rush.snapshot().blackoutRemaining,12);g.resume();g.rush.clock(12);assert.equal(g.rush.snapshot().blackoutRemaining,0);
});

test('free exploration keeps selecting chaos after the fourth event without increasing the actor budget',()=>{
  const g=make();g.rush.start('free');for(let i=0;i<9;i++){g.rush.fallUntil=0;g.rush.panic=0;g.rush.panicTier=0;assert.equal(g.rush.triggerChaos(p,f),true);g.rush.chaosTarget=null;}
  assert.equal(g.rush.chaosCount,9);assert.ok(g.actors.filter(a=>a.active).length<=6);
});
