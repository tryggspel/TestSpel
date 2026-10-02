import test from 'node:test';
import assert from 'node:assert/strict';
import {CityNavigation,CityMission} from '../city-missions.mjs';
import {CityJourney,JOURNEY_KEY} from '../journey-rules.mjs';

const nav=new CityNavigation(),mall={x:-135,z:98};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-135,z:55,name:'Rädda fikat'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};};
const advance=(g,seconds,p,f)=>{for(let t=0;t<seconds;t+=1/60)g.step(1/60,p,f);};
const shoot=(g,a,power=false)=>g.shoot({x:a.x,z:a.z+3,y:1.68,dx:0,dz:-1,power,assist:true});

test('navigation treats actor and pickup IDs as world objects, not grid node indices',()=>{
  const origin={x:0,z:14},destination={x:12,z:-370};
  const expected=nav.path(origin,destination);
  assert.deepEqual(nav.path(origin,{...destination,id:'city-0'}),expected);
  assert.deepEqual(nav.path(origin,{...destination,id:0}),expected);
});

test('city collections, five-item bonus and secrets are awarded once and survive reloading',()=>{
  const store=storage(),g=new CityJourney(nav,mall,portals,store);
  assert.ok(g.items.length>=30&&g.items.length<320,'2.11: gatufynd var ~30 m ger fler termosar, men inventariet är fortfarande begränsat; vyn återanvänder 18 kort');assert.equal(g.actors.filter(a=>a.active).length,0);
  for(const p of g.items.slice(0,5)){g.step(.1,p);const balance=g.balance;g.step(.1,p);assert.equal(g.balance,balance);}
  assert.equal(g.found.size,5);assert.equal(g.balance,150);assert.equal(g.energy,100);
  g.step(.1,g.secrets[0]);assert.equal(g.balance,350);assert.equal(g.secretsFound.size,1);
  g.save();const loaded=new CityJourney(nav,mall,portals,store);
  assert.equal(loaded.balance,350);assert.equal(loaded.found.size,5);assert.equal(loaded.secretsFound.size,1);assert.equal(loaded.energy,100);
  loaded.step(.1,loaded.secrets[0]);assert.equal(loaded.balance,350);
});

test('coffee points buy energy in the city and missions; pause, insufficient funds and practice cannot spend them',()=>{
  const g=new CityJourney(nav,mall,portals,storage());g.reward(50);g.energy=20;
  g.pause();assert.equal(g.refill(),false);assert.equal(g.balance,50);g.resume();
  assert.equal(g.refill(),true);assert.equal(g.energy,60);assert.equal(g.balance,25);
  const mission=new CityMission('fikapanik',nav,mall);mission.start({practice:true});mission.energy=10;
  assert.equal(g.refill(mission),false);mission.start();mission.energy=10;
  assert.equal(g.refill(mission),true);assert.equal(mission.energy,50);assert.equal(g.energy,50);assert.equal(g.balance,0);
  assert.equal(g.refill(mission),false);assert.equal(mission.energy,50);
});

test('city shots consume three energy, defeats refund eight, and empty energy still permits an emergency shot',()=>{
  const g=new CityJourney(nav,mall,portals),a=g.actors[0];g.spawn(a,{x:10,z:10},'walker');g.energy=100;
  assert.ok(shoot(g,a));assert.equal(g.energy,97);assert.equal(a.hp,1);
  // Advance only the shooting cooldown here; collection requires an actual player position.
  g.cooldown=0;assert.ok(shoot(g,a));assert.equal(g.energy,100);assert.equal(a.active,false);
  g.spawn(a,{x:10,z:10},'walker');g.energy=0;g.cooldown=0;assert.ok(shoot(g,a));assert.equal(a.hp,1);assert.equal(g.energy,0);assert.ok(Math.hypot(a.vx,a.vz)<=9);
});

test('ambushes wait until out of view, give a warning, emerge, and reward each hideout once',()=>{
  const g=new CityJourney(nav,mall,portals),a=g.ambushes[0];g.ambushes=[a];
  const p=a.trigger,dx=a.spawn.x-p.x,dz=a.spawn.z-p.z,d=Math.hypot(dx,dz);
  advance(g,9,p,{x:dx/d,z:dz/d});assert.equal(g.pendingAmbush,null);assert.equal(g.actors.some(z=>z.active),false);
  g.step(.1,p,{x:-dx/d,z:-dz/d});assert.ok(g.pendingAmbush);assert.ok(g.drainEvents().some(e=>e.type==='rustle'));
  advance(g,.7,p,{x:-dx/d,z:-dz/d});const enemy=g.actors.find(z=>z.active);assert.ok(enemy);assert.equal(enemy.ambushId,a.id);
  const balance=g.balance;for(let i=0;i<4&&enemy.active;i++){g.cooldown=0;shoot(g,enemy);}
  assert.equal(enemy.active,false);assert.equal(g.balance,balance+30);assert.ok(g.cleared.has(a.id));
  advance(g,20,p,{x:-dx/d,z:-dz/d});assert.equal(g.actors.some(z=>z.active),false);
});

test('pause freezes city collectibles and a defeat preserves discoveries without ending exploration',()=>{
  const g=new CityJourney(nav,mall,portals);g.pause();g.step(1,g.items[0]);assert.equal(g.balance,0);g.resume();g.step(.1,g.items[0]);
  const found=g.found.size;g.reward(50);const before=g.balance,p={x:25,z:25};g.spawn(g.actors[0],p,'walker');g.health=16;g.contactCooldown=0;g.step(.1,p);
  assert.equal(g.phase,'playing');assert.equal(g.health,100);assert.equal(g.balance,before-25);assert.equal(g.found.size,found);
  const events=g.drainEvents();assert.ok(events.some(e=>e.type==='recover'));assert.ok(!events.some(e=>e.type==='finish'));
});

test('invalid stored values and removed collectible IDs cannot corrupt city progress',()=>{
  const store=storage();store.setItem(JOURNEY_KEY,JSON.stringify({version:1,balance:-12,energy:999,found:['missing'],secrets:['missing'],cleared:['missing'],destination:'missing',position:{x:1e9,z:-1e9}}));
  const g=new CityJourney(nav,mall,portals,store);assert.equal(g.balance,0);assert.equal(g.energy,100);assert.equal(g.found.size,0);assert.equal(g.destination,'sista-rundan');assert.ok(g.position.x<=nav.bounds.maxX&&g.position.z>=nav.bounds.minZ);
});

test('Sandgrund victory requires rescuing all three visitors and stopping the artist with real shots',()=>{
  const g=new CityMission('sandgrund',nav,mall);g.start();assert.equal(g.actors[0].kind,'artist');
  for(const a of g.actors)while(a.active){g.cooldown=0;shoot(g,a);}
  g.step(.1,g.layout.spawn);assert.equal(g.phase,'playing');assert.equal(g.rescued,0);
  for(const v of g.visitors){g.step(.1,{x:v.x,z:v.z});assert.equal(v.following,true);advance(g,20,g.safe);}
  assert.equal(g.rescued,3);assert.equal(g.phase,'won');assert.equal(g.drainEvents().filter(e=>e.type==='finish').length,1);
  g.start();assert.equal(g.rescued,0);assert.equal(g.actors[0].hp,12);assert.ok(g.visitors.every(v=>!v.rescued&&!v.following));
});

test('escorted visitors navigate around an obstacle instead of stopping short of a grid corner',()=>{
  const blocked=(x,z)=>x>-5&&x<5&&z>-12&&z<12;
  const map=new CityNavigation(blocked,{minX:-40,maxX:40,minZ:-40,maxZ:50},2);
  const g=new CityMission('sandgrund',map,{x:-30,z:30},1,{x:0,z:-25});g.start({practice:true});g.actors.forEach(a=>a.active=false);
  Object.assign(g.visitors[0],{x:0,z:20,following:true});g.visitors[1].rescued=g.visitors[2].rescued=true;
  g.safe={x:0,z:-20};advance(g,18,g.safe);assert.equal(g.visitors[0].rescued,true);assert.equal(blocked(g.visitors[0].x,g.visitors[0].z),false);
});
