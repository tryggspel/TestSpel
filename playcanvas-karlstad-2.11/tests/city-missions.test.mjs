import test from 'node:test';
import assert from 'node:assert/strict';
import {CityNavigation,CityMission} from '../city-missions.mjs';
const nav=new CityNavigation();const mall={x:-135,z:98};
const advance=(g,seconds,p)=>{for(let t=0;t<seconds;t+=1/60)g.step(1/60,p);};
function shootAt(g,a,power=false){return g.shoot({x:a.x,z:a.z+3,dx:0,dz:-1,y:1.68,power,assist:true});}
test('city routes go around buildings and all deliveries lie in the connected walkable region',()=>{
  const blocked=(x,z)=>x>-5&&x<5&&z>-12&&z<12;
  const map=new CityNavigation(blocked,{minX:-25,maxX:25,minZ:-25,maxZ:25},2);
  const path=map.path({x:0,z:20},{x:0,z:-20});assert.ok(path.length>20);
  for(let i=0;i<path.length;i++){assert.equal(blocked(path[i].x,path[i].z),false);if(i)assert.equal(map.clear(path[i-1],path[i]),true);}
  const goal=map.point({x:0,z:0});assert.equal(blocked(goal.x,goal.z),false);assert.ok(map.path({x:0,z:20},goal).length>1);
});
test('three complete zombie waves are winnable by shots, use a bounded pool, and finish at 24',()=>{
  const g=new CityMission('fikapanik',nav,mall);g.start();let attempts=0;
  assert.equal(g.actors.filter(a=>a.active).length,6);
  while(g.phase==='playing'&&attempts++<130){const a=g.actors.find(a=>a.active);if(a)shootAt(g,a,g.energy>=40);advance(g,a?.active?.65:3.1);}
  assert.equal(g.phase,'won');assert.equal(g.wave,3);assert.equal(g.captured,24);assert.equal(g.actors.length,12);
  assert.equal(g.drainEvents().filter(e=>e.type==='wave').length,3);
});
test('zombies pursue, damage has a cooldown, loss ends once, and pause stops attacks',()=>{
  const g=new CityMission('fikapanik',nav,mall);g.start();const a=g.actors[0],p={x:0,z:13};
  const d=Math.hypot(a.x-p.x,a.z-p.z);advance(g,1,p);assert.ok(Math.hypot(a.x-p.x,a.z-p.z)<d);
  Object.assign(a,{x:p.x,z:p.z});g.step(.01,p);assert.equal(g.health,84);g.step(.1,p);assert.equal(g.health,84);
  g.pause();const snapshot=JSON.stringify(g.actors);g.step(10,p);assert.equal(JSON.stringify(g.actors),snapshot);assert.equal(g.health,84);
  g.resume();g.health=16;g.contactCooldown=0;Object.assign(a,{x:p.x,z:p.z});g.step(.01,p);
  assert.equal(g.phase,'lost');assert.equal(g.health,0);g.step(1,p);assert.equal(g.drainEvents().filter(e=>e.type==='finish').length,1);
});
test('delivery requires all three thermoses, counts each once and resets on retry',()=>{
  const g=new CityMission('radda-fikat',nav,mall);g.start();g.actors.forEach(a=>a.active=false);
  g.step(.1,g.delivery);assert.equal(g.phase,'playing');assert.equal(g.collected,0);
  for(const p of g.pickups){g.step(.1,p);const count=g.collected;g.step(.1,p);assert.equal(g.collected,count);}
  assert.equal(g.collected,3);assert.equal(g.objective().label,'LEVERERA FIKAT');g.step(.1,g.delivery);assert.equal(g.phase,'won');
  g.start();assert.equal(g.collected,0);assert.equal(g.health,100);assert.equal(g.actors.filter(a=>a.active).length,12);
});
test('mission timers use their own duration and practice suppresses the clock',()=>{
  const g=new CityMission('radda-fikat',nav,mall);g.start();advance(g,90);assert.equal(g.phase,'playing');assert.ok(g.remaining>89);
  g.start({practice:true});advance(g,181);assert.equal(g.phase,'playing');assert.equal(g.remaining,180);
});
