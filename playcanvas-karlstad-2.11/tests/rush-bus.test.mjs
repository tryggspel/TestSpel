import test from 'node:test';
import assert from 'node:assert/strict';
import {CityJourney} from '../journey-rules.mjs';
import {CityNavigation} from '../city-missions.mjs';
import {RUSH} from '../city-rush.mjs';
import {ZombieBus} from '../zombie-bus.mjs';
import {oneThumbIntent} from '../fps-controls.mjs';
const nav=new CityNavigation(),portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-12,z:19,name:'Fika'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const make=()=>{const saved=new Map(),storage={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)};return new CityJourney(nav,{x:-135,z:98},portals,storage);};
const step=(g,seconds,p={x:0,z:14})=>{for(let t=0;t<seconds&&g.phase==='playing';t+=1/60)g.step(1/60,p,{x:0,z:-1});};
test('the hunt starts at three minutes; menus pause the clock and spending cannot reduce earned XP',()=>{
  const g=make();g.rush.start();assert.equal(g.rush.time,180);assert.equal(g.rush.xp,0);g.reward(100);g.energy=20;assert.equal(g.refill(),true);assert.equal(g.rush.xp,100);assert.equal(g.balance,75);
  g.pause();g.step(1,{x:0,z:14});assert.equal(g.rush.time,180);g.resume();g.step(.5,{x:0,z:14});assert.equal(g.rush.time,179.5);
});
test('a delivery has a pickup and a separate destination; completion rewards exactly once',()=>{
  const g=make();g.rush.start();step(g,2.1);let c=g.rush.contract;assert.equal(c.kind,'parcel');
  const pickup={...c.spot};g.step(.01,pickup);assert.equal(c.stage,1);assert.ok(Math.hypot(c.spot.x-pickup.x,c.spot.z-pickup.z)>5);
  const before=g.rush.xp,time=g.rush.time,destination={...c.spot};g.step(.01,destination);assert.equal(g.rush.contract,null);assert.ok(g.rush.xp>=before+180);assert.ok(g.rush.time>time+7.9);
  const balance=g.balance;g.step(.01,destination);assert.equal(g.balance,balance);
});
test('short events expire and a new opportunity replaces them without blocking the main hunt',()=>{
  const g=make();g.rush.start();g.rush.step(2.1,{x:0,z:14},{x:0,z:-1});const old=g.rush.contract;
  g.rush.step(33,{x:0,z:14},{x:0,z:-1});assert.equal(g.rush.contract,null);assert.ok(g.drainEvents().some(e=>e.type==='street-missed'));
  g.rush.step(4.1,{x:0,z:14},{x:0,z:-1});assert.notEqual(g.rush.contract?.id,old.id);assert.equal(g.rush.contract.kind,'power');
});
test('a hunt wave can be defeated through actual shots and reused actors do not inherit reward IDs',()=>{
  const g=make();g.rush.start();g.rush.contractSerial=2;g.rush.beginContract({x:0,z:14},{x:0,z:-1});const c=g.rush.contract;assert.equal(c.kind,'hunt');
  for(const a of g.actors){while(a.active){g.cooldown=0;g.shoot({x:a.x,z:a.z+3,y:1.68,dx:0,dz:-1,assist:true});}}
  assert.equal(g.rush.contract,null);assert.ok(g.rush.xp>=180+45);assert.equal(g.drainEvents().filter(e=>e.type==='street-complete').length,1);
  const a=g.actors[0];g.spawn(a,{x:20,z:20},'walker');assert.equal(a.patrolId,null);assert.equal(a.contractId,null);
});
test('800 XP must be secured in a safe zone; victory has a time bonus and cannot pay twice',()=>{
  const g=make();g.rush.start();g.reward(800);assert.equal(g.rush.exitReady,true);assert.equal(g.phase,'playing');
  const before=g.balance;g.step(.1,g.safeZones[0]);assert.equal(g.phase,'won');assert.equal(g.rush.state,'escaped');assert.ok(g.rush.finalScore>800);assert.equal(g.balance,before+150);
  g.rush.end(true);g.step(1,g.safeZones[0]);assert.equal(g.balance,before+150);assert.equal(g.drainEvents().filter(e=>e.type==='hunt-finish').length,1);
});
test('capture and timeout finish the hunt while a retry preserves the wallet and respawns ordinary finds',()=>{
  const g=make();g.rush.start();g.reward(75);g.found.add(g.items[0].id);g.postcardsFound.add('church');g.rush.clock(180);assert.equal(g.phase,'lost');assert.equal(g.rush.state,'caught');
  g.rush.start();assert.equal(g.balance,75);assert.equal(g.found.size,0);assert.ok(g.postcardsFound.has('church'));assert.equal(g.rush.time,180);
  g.health=16;g.contactCooldown=0;g.spawn(g.actors[0],g.layout.spawn,'walker');g.step(.01,g.layout.spawn);assert.equal(g.rush.state,'caught');
});
test('the director creates early pursuit and respects the six-enemy limit on repeated waves',()=>{
  const g=make();g.rush.start('free');const p={x:0,z:14},f={x:0,z:-1};
  g.rush.step(6.1,p,f);assert.ok(g.actors.some(a=>a.active));
  for(let i=0;i<30;i++)g.rush.step(10,p,f);assert.ok(g.actors.filter(a=>a.active).length<=RUSH.maxEnemies);assert.equal(g.actors.length,12);
});
test('postcards are collected once, extend the clock and survive a new session',()=>{
  const g=make();g.rush.start();const p=g.postcards[0];g.step(.1,p);assert.ok(g.postcardsFound.has(p.id));assert.ok(g.rush.xp>=100);assert.ok(g.rush.time>180);
  const before=g.balance;g.step(.1,p);assert.equal(g.balance,before);g.save();const again=new CityJourney(nav,{x:-135,z:98},portals,g.storage);assert.ok(again.postcardsFound.has(p.id));
});
test('one thumb turns in place and can walk while turning; vertical input never causes sideways drift',()=>{
  assert.deepEqual(oneThumbIntent(1,0),{turn:150,forward:0,strafe:0});assert.deepEqual(oneThumbIntent(-1,-1),{turn:-150,forward:-1,strafe:0});assert.deepEqual(oneThumbIntent(0,0),{turn:0,forward:0,strafe:0});
  assert.equal(oneThumbIntent(9,9).turn,150);assert.equal(oneThumbIntent(0,-1).forward,-1);
});
const route=[{x:0,z:0},{x:0,z:-50},{x:-30,z:-50},{x:-30,z:-130}];
function ride(fps,controlled){const b=new ZombieBus(route);let frames=0;while(b.state==='playing'&&frames++<fps*40)b.step(1/fps,controlled?(Math.abs(b.roll)<.2?0:-Math.sign(b.roll)):0);return b;}
test('leaving the chaotic bus unbalanced crashes; a player can reach the stop with corrective inputs',()=>{
  assert.equal(ride(60,false).state,'crashed');const b=ride(60,true);assert.equal(b.state,'arrived');assert.ok(b.points>=200&&b.points<=350);assert.deepEqual(b.sample(1),route.at(-1));
});
test('bus simulation stays consistent across 30 and 120 FPS and the route never cuts its corners',()=>{
  const a=ride(30,true),b=ride(120,true);assert.equal(a.state,b.state);assert.ok(Math.abs(a.points-b.points)<=2);assert.ok(Math.abs(a.health-b.health)<2);
  const bus=new ZombieBus(route);for(let i=0;i<=100;i++){const p=bus.sample(i/100);assert.ok((p.x===0&&p.z>=-50)||(p.z===-50&&p.x>=-30)||(p.x===-30&&p.z<=-50));}
});


test('panic meter rises from thermoses and shooting while chaos stays within the actor budget',()=>{
  const g=make();g.rush.start('free');const item=g.items[0];
  g.step(.1,item,{x:0,z:-1});assert.ok(g.rush.panic>=5);
  const before=g.rush.panic;g.cooldown=0;g.shoot({x:0,z:14,y:1.68,dx:0,dz:-1,assist:true});assert.ok(g.rush.panic>before);
  const p={x:0,z:14},f={x:0,z:-1};for(let i=0;i<60;i++)g.rush.step(1,p,f);
  assert.ok(g.rush.chaosCount>=1);assert.ok(g.actors.filter(a=>a.active).length<=RUSH.maxEnemies);
});
test('100 panic starts Karlstad has fallen and later partially resets',()=>{
  const g=make();g.rush.start('free');g.rush.raisePanic(100);assert.ok(g.rush.fallUntil>0);
  const events=g.drainEvents();assert.ok(events.some(e=>e.type==='panic-fall'));assert.ok(events.some(e=>e.type==='panic-tier'&&e.level===4));
  const p={x:0,z:14},f={x:0,z:-1};g.rush.step(25,p,f);assert.ok(g.rush.panic>=55&&g.rush.panic<60);assert.equal(g.rush.panicTier,2);
});
test('the chaos director can create a gold thermos objective that pays once',()=>{
  const g=make();g.rush.start('free');const p={x:0,z:14},f={x:0,z:-1};
  g.rush.chaosCount=2;g.rush.triggerChaos(p,f);assert.equal(g.rush.chaosTarget.kind,'gold');
  const target={...g.rush.chaosTarget.spot},before=g.balance;g.rush.step(.01,target,f);assert.equal(g.rush.chaosTarget,null);assert.ok(g.balance>=before+160);
  const after=g.balance;g.rush.step(.01,target,f);assert.equal(g.balance,after);
});
