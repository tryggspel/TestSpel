import test from 'node:test';
import assert from 'node:assert/strict';
import {CityGuidance} from '../city-guidance.mjs';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney} from '../journey-rules.mjs';
import {ZombieBus} from '../zombie-bus.mjs';
const portals={'sista-rundan':{x:45,z:35,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-12,z:19,name:'Fika'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const make=(blocked=()=>false)=>{const g=new CityJourney(new CityNavigation(blocked),{x:-135,z:98},portals);g.rush.start('free');g.items=[];g.ambushes=[];g.secrets=[];g.postcards=[];return g;};
const f={x:0,z:-1},p={x:0,z:14};
test('compass and floor route guide around a wall and change turning instructions when the player rotates',()=>{
  const nav=new CityNavigation((x,z)=>x>-9&&x<9&&z>-15&&z<2),guide=new CityGuidance(nav),goal={x:0,z:-32,label:'MÅL',kind:'mission'};
  const out=guide.update(p,goal,f);assert.ok(out.distance>46);assert.ok(nav.clear(p,out.next));assert.equal(nav.clear(p,goal),false);
  for(let i=1;i<out.path.length;i++)assert.ok(nav.clear(out.path[i-1],out.path[i]));
  const toward={x:out.next.x-p.x,z:out.next.z-p.z};assert.match(guide.update(p,goal,toward).turn,/^RAKT FRAM · VÄNSTER OM \d+ M$/);assert.equal(guide.update(p,goal,{x:-toward.x,z:-toward.z}).turn,'VÄND DIG OM');
  const wait=guide.update(p,{...p,kind:'wait',label:'VÄNTA'},f);assert.equal(wait.path.length,0);
});
test('manual mission focus survives new stories and optional chaos, and the escape destination stays pinned',()=>{
  const g=make();g.routeMode='mission';g.destination='sandgrund';g.rush.beginStory('power',p,f);g.rush.chaosCount=2;g.rush.triggerChaos(p,f);
  assert.equal(g.objective(p).id,'mission-sandgrund');
  g.rush.mode='timed';g.reward(1000);const exit=g.objective(p);assert.equal(exit.kind,'escape');assert.deepEqual(g.objective({x:-160,z:100}),exit);
  const alternative=g.safeZones.find(s=>s.x!==exit.x||s.z!==exit.z);g.rush.step(.01,alternative,f);assert.equal(g.rush.state,'escaped','Every marked safe zone still accepts the escape');
});
test('a power outage requires three separate nearby interactions, pauses safely and restores the light once',()=>{
  const g=make();g.rush.panic=40;assert.equal(g.rush.beginStory('power',p,f),true);const c=g.rush.contract;
  assert.equal(g.rush.interact(p,f),false);g.pause();const time=g.rush.time,spent=g.rush.spent;g.step(8,c.spot,f);assert.equal(g.rush.spent,spent);assert.equal(g.rush.time,time);assert.equal(g.rush.interact(c.spot,f),false);g.resume();
  for(let i=0;i<3;i++){const old={...c.spot};assert.equal(g.rush.interact(old,f),true);if(i<2)assert.ok(Math.hypot(c.spot.x-old.x,c.spot.z-old.z)>5);}
  assert.equal(g.rush.contract,null);assert.equal(g.rush.blackoutUntil,0);assert.equal(g.rush.xp,260);assert.ok(g.rush.panic<40);assert.equal(g.rush.interact(c.spot,f),false);
  assert.equal(g.drainEvents().filter(e=>e.type==='power-restored').length,1);
});
test('power failure clears darkness, and an NWT pickup plus two deliveries rewards only once',()=>{
  const g=make();g.rush.beginStory('power',p,f);g.rush.step(56,p,f);assert.equal(g.rush.blackoutUntil,0);assert.equal(g.rush.contract,null);
  g.rush.beginStory('news',p,f);const c=g.rush.contract;for(let i=0;i<3;i++){const pos={...c.spot};g.rush.step(.01,pos,f);if(i<2)assert.ok(Math.hypot(c.spot.x-pos.x,c.spot.z-pos.z)>5);}
  assert.equal(g.rush.contract,null);assert.equal(g.rush.xp,220);g.rush.step(.01,c.spot,f);assert.equal(g.rush.xp,220);
});
test('a real kicked cart kills targets, pays the bowling reward, and cannot hit through a wall',()=>{
  const g=make((x,z)=>z<-18);assert.equal(g.rush.beginStory('bowling',p,f),true);const c=g.rush.contract,cart=c.cart;
  const actors=g.actors.filter(a=>a.active&&a.contractId===c.id);assert.ok(actors.length>0);
  // Place the spawned targets along the cart's actual path; use the real impulse/kill chain.
  actors.forEach((a,i)=>Object.assign(a,{x:cart.x,z:cart.z-2-i*2,hp:2,speed:0}));
  const before=g.rush.xp;assert.equal(g.rush.interact(cart,f),true);assert.equal(g.rush.interact(cart,f),false);
  for(let i=0;i<120&&g.rush.contract;i++)g.rush.step(1/60,{x:90,z:90},f);
  assert.equal(g.rush.contract,null);assert.ok(g.rush.xp>=before+220+actors.length*30);assert.equal(g.drainEvents().filter(e=>e.type==='street-complete').length,1);
  const other=make((x,z)=>z<-4);other.rush.beginStory('bowling',p,f);const c2=other.rush.contract;const target=other.actors.find(a=>a.active);Object.assign(c2.cart,{x:0,z:0});c2.spot={x:0,z:0};Object.assign(target,{x:0,z:-8,hp:2,speed:0});
  other.rush.interact(c2.spot,f);for(let i=0;i<120;i++)other.rush.step(1/60,{x:90,z:90},f);assert.equal(target.hp,2);assert.ok(c2.cart.z>=-4);
});
test('bus passengers visibly fall and recover while successful steering remains stable across frame rates',()=>{
  const run=fps=>{const b=new ZombieBus([{x:0,z:0},{x:0,z:-80}]);let fell=false,recovered=false;for(let i=0;i<31*fps&&b.state==='playing';i++){b.step(1/fps,Math.abs(b.roll)<.2?0:-Math.sign(b.roll));if(b.passengers.some(p=>p.fallen))fell=true;if(fell&&b.elapsed>8&&b.passengers.some(p=>!p.fallen))recovered=true;assert.ok(b.passengers.every(p=>Math.abs(p.x)<=1.3&&Number.isFinite(p.angle)));}return {b,fell,recovered};};
  const a=run(30),b=run(120);assert.equal(a.b.state,'arrived');assert.equal(b.b.state,'arrived');assert.ok(a.fell&&a.recovered);assert.ok(b.fell&&b.recovered);assert.ok(Math.abs(a.b.points-b.b.points)<=2);assert.ok(Math.abs(a.b.falls-b.b.falls)<=3);
  const snapshot=a.b.snapshot();a.b.step(1,1);assert.deepEqual(a.b.snapshot(),snapshot);snapshot.passengers[0].x=99;assert.notEqual(a.b.passengers[0].x,99);
});
