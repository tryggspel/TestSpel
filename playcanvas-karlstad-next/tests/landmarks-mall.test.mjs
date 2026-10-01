import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,landmarkDestination,PLACE_ROUTES} from '../city-geography.mjs';
import {CityNavigation} from '../city-missions.mjs';
import {CityGuidance} from '../city-guidance.mjs';
import {CityJourney} from '../journey-rules.mjs';
import {MallWalk,MALL_ENTRANCES,MALL_CACHE,mallPassage,mallGroundBlocked,mallWalkable,mallGoal} from '../mall-space.mjs';
import {createMallGuidance} from '../mall-guidance.mjs';
import {waterBlocked,peninsulaBanks,PARK_ENCOUNTERS} from '../park-space.mjs';
import {chooseAimTarget} from '../last-round-controls.mjs';
const buildings=cityBuildings(JSON.parse(fs.readFileSync(new URL('../../karlstad-city-mobile/data/osm-buildings.json',import.meta.url))));
const blocked=(x,z)=>waterBlocked(x,z)||(mallPassage(x,z)?mallGroundBlocked(x,z):buildings.some(b=>x+.57>b.minx&&x-.57<b.maxx&&z+.57>b.minz&&z-.57<b.maxz));
const nav=new CityNavigation(blocked),forward={x:0,z:-1};
const portals={'sista-rundan':{x:43,z:31,name:'O’Learys'},sandgrund:{x:-11,z:-365,name:'Sandgrund'}};
const make=()=>new CityJourney(nav,MALL_ENTRANCES[0],portals);
function routeTo(from,to){const path=nav.path(from,to);assert.ok(path.length>1);assert.ok(Math.hypot(path.at(-1).x-to.x,path.at(-1).z-to.z)<3.1,JSON.stringify(to));for(let i=0;i<path.length;i++){assert.equal(blocked(path[i].x,path[i].z),false);if(i)assert.ok(nav.clear(path[i-1],path[i]));}return path;}
function walker(x=-140,z=114.6){const walk=new MallWalk();let p={x,z,y:1.68};return {walk,get p(){return p;},move(dx,dz,seconds=1/60){p=walk.move(p,dx,dz,seconds,blocked)||{...p,x:p.x+dx,z:p.z+dz};return p;},go(x,z){for(let i=0;i<600;i++){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.16)return;p=walk.move(p,dx/d*.12,dz/d*.12,1/60,blocked)||{...p,x:p.x+dx/d*.12,z:p.z+dz/d*.12};}assert.fail('Stopped before '+x+','+z+' at '+JSON.stringify(p));}};}

test('all named landmarks, peninsula encounters and four mall entrances remain reachable in the real city',()=>{
  assert.equal(buildings.length,95);
  for(const id of PLACE_ROUTES)routeTo({x:0,z:14},landmarkDestination(id,buildings));
  for(const p of MALL_ENTRANCES){assert.equal(blocked(p.x,p.z),false,p.id);routeTo(p,{x:-145,z:116});}
  for(const a of PARK_ENCOUNTERS){routeTo({x:0,z:14},a);assert.equal(blocked(a.spawnX,a.spawnZ),false,a.id);}
});
test('both escalators carry the player smoothly to the upper gallery and back without new controls',()=>{
  const w=walker();w.go(-140,112.7);
  for(let i=0;i<18*60;i++)w.move(0,0);
  assert.equal(w.walk.level,1);assert.ok(w.walk.height>5.3);w.go(-140,93.5);
  w.go(-106,93.5);w.go(MALL_CACHE.x,MALL_CACHE.z);assert.ok(Math.abs(w.p.y-7.08)<.001);
  w.go(-106,93.5);w.go(-135,93.5);w.go(-135,95.3);
  for(let i=0;i<18*60;i++)w.move(0,0);
  assert.equal(w.walk.level,0);w.go(-135,115);assert.ok(Math.abs(w.p.y-1.68)<.001);
  w.go(-111,117);w.go(-111,91);w.go(-117.15,91);w.go(-117.15,36);w.go(-117.15,30);assert.equal(w.walk.height,0);
});
test('stair side rails and the upper atrium edge prevent falling or instant changes of floor',()=>{
  const w=walker();w.go(-140,104);const before={...w.p};
  for(let i=0;i<30;i++)w.move(.12,0,0);
  assert.ok(w.p.x<-138.7);assert.ok(Math.abs(w.p.y-before.y)<.001);
  w.go(-140,93.5);w.go(-126,93.5);for(let i=0;i<60;i++)w.move(0,.12,0);
  assert.ok(mallWalkable(w.p.x,w.p.z,true));assert.ok(w.p.y>6.7);
});
test('upper-floor guidance walks around the open atrium and directs the return trip to the down escalator',()=>{
  const g=createMallGuidance(new CityGuidance(nav)),p={x:-148,z:118,y:7.08};
  const route=g.update(p,{...MALL_CACHE,id:'mall-cache',kind:'landmark'},forward,{height:5.4});
  assert.ok(route.path.length>20);for(const q of route.path){assert.ok(mallWalkable(q.x,q.z,true));assert.equal(q.y,5.4);}
  const exit=g.update(p,mallGoal(p,true),forward,{height:5.4});assert.equal(exit.goal.id,'mall-down');assert.ok(Math.abs(exit.path.at(-1).z-93.5)<1);
});
test('the upper-floor secret requires its actual floor and cannot be farmed or hit from below',()=>{
  const g=make();g.rush.start('free');g.step(.01,{...MALL_CACHE,y:1.68},forward);assert.equal(g.secretsFound.has(MALL_CACHE.id),false);
  const before=g.balance;g.step(.01,{...MALL_CACHE,y:7.08},forward);assert.equal(g.balance,before+200);g.step(.01,{...MALL_CACHE,y:7.08},forward);assert.equal(g.balance,before+200);
  const a=g.actors[0];g.spawn(a,{x:-106,z:91},'walker');const upper={x:a.x,z:a.z,y:7.08};g.contactCooldown=0;const hp=g.health;g.step(.1,upper,forward);assert.equal(g.health,hp);
  assert.equal(chooseAimTarget({...upper,z:a.z+3},forward,[a],()=>true,null),null);
  g.cooldown=0;g.shoot({...upper,z:a.z+3,dx:0,dz:-1,assist:true});assert.equal(a.hp,2);
});
test('Sandgrundsudden has navigable dry land, a blocked pond and solid river boundaries',()=>{
  for(const z of [-330,-380,-460,-550,-640,-710,-780,-810,-831]){const [left,right]=peninsulaBanks(z);assert.equal(waterBlocked(left-5,z),true);assert.equal(waterBlocked(right+5,z),true);}
  assert.equal(waterBlocked(-151,-410),true);assert.equal(waterBlocked(-199,-831),false);assert.equal(waterBlocked(-199,-850),true);
  routeTo({x:-65,z:-360},{x:-199,z:-831});
});
test('short blackouts share a 150-second cooldown across director and power quests',()=>{
  const g=make(),r=g.rush;r.start('free');assert.equal(r.tryBlackout(),false);
  r.clock(45);assert.equal(r.tryBlackout(40),true);assert.equal(r.snapshot().blackoutRemaining,4);
  r.clock(4);assert.equal(r.snapshot().blackoutRemaining,0);assert.equal(r.beginStory('power',{x:0,z:14},forward),true);assert.equal(r.snapshot().blackoutRemaining,0);
  r.chaosCount=1;r.triggerChaos({x:0,z:14},forward);assert.equal(r.snapshot().blackoutRemaining,0);assert.equal(r.chaosTarget.kind,'gold');
  r.clock(145);assert.equal(r.tryBlackout(),false);r.clock(1);assert.equal(r.tryBlackout(3),true);assert.equal(r.snapshot().blackoutRemaining,3);
});
test('upper-floor refuge keeps the timed challenge clock running, while pause freezes it',()=>{
  const g=make();g.rush.start('timed',{seed:923});const time=g.rush.time;g.step(1,{...MALL_CACHE,y:7.08},forward);assert.equal(g.rush.time,time-1);
  assert.equal(g.actors.some(a=>a.active),false);g.pause();g.step(1,{...MALL_CACHE,y:7.08},forward);assert.equal(g.rush.time,time-1);
});
