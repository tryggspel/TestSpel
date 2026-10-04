import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,IDENTITY_IDS} from '../city-geography.mjs';
import {facadePanels} from '../comic-city.js';
import {MALL_ROOMS,MallWalk,mallRoom,mallWalkable,mallPassage,mallGroundBlocked} from '../mall-space.mjs';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney} from '../journey-rules.mjs';
import {FriendlyClerks} from '../friendly-clerks.mjs';
import {chooseAimTarget} from '../last-round-controls.mjs';
const buildings=cityBuildings(JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url))));
const blocked=(x,z)=>mallPassage(x,z)?mallGroundBlocked(x,z):buildings.some(b=>x+.57>b.minx&&x-.57<b.maxx&&z+.57>b.minz&&z-.57<b.maxz);
const nav=new CityNavigation(blocked);
function city(){const g=new CityJourney(nav,{x:-117,z:36},{'sista-rundan':{x:43,z:31},sandgrund:{x:-11,z:-365}});g.clerks=new FriendlyClerks(g,buildings);g.rush.start('free');return g;}
const eye=q=>({...q,y:(q.y||0)+1.68});
test('legacy comic facade overlay is disabled in the real-reference centre pass',()=>{
  const b={osm:123456,minx:-40,maxx:40,minz:200,maxz:220,height:12};
  assert.deepEqual(facadePanels([b]),[]);
  assert.deepEqual(facadePanels(buildings.map(b=>({...b,height:b.h})),blocked),[]);
});
test('all three shops are enterable on their verified floors; counters and wrong-floor entries block',()=>{
  for(const r of MALL_ROOMS){
    const a=r.door.yaw*Math.PI/180,nx=Math.sin(a),nz=Math.cos(a),walk=new MallWalk();walk.level=r.floor;walk.height=r.floor*5.4;
    let p={x:r.door.x+nx*1,z:r.door.z+nz*1,y:1.68+walk.height};
    for(let i=0;i<30;i++)p=walk.move(p,-nx*.1,-nz*.1,1/60,blocked);
    assert.equal(mallRoom(p)?.id,r.id);assert.equal(walk.level,r.floor);assert.ok(mallWalkable(p.x,p.z,!!r.floor));
    const c=r.counter;assert.equal(mallWalkable((c.minx+c.maxx)/2,(c.minz+c.maxz)/2,!!r.floor),false);
  }
  assert.equal(mallWalkable(-139,79,false),false);
});
test('friendly quests collect and hand back the item, grant one reward and never enter hostile aim pools',()=>{
  const g=city(),q=g.clerks.people[0],p=eye({...q.service,y:q.y});
  assert.ok(g.clerks.interact(p));assert.equal(q.stage,'search');assert.equal(g.objective(p).id,'help-coop-search');
  g.clerks.step(.1,eye(q.item));assert.equal(q.stage,'found');assert.equal(g.objective(p).id,'help-coop-found');
  const balance=g.balance;assert.ok(g.clerks.interact(p));assert.equal(g.balance,balance+80);g.clerks.interact(p);assert.equal(g.balance,balance+80);
  assert.equal(g.actors.some(a=>a.id===q.id),false);assert.equal(chooseAimTarget(p,{x:-1,z:0},g.clerks.people,()=>true,null),null);
});
test('clerks can be calmed; paused city updates do not advance their stress or collect across floors',()=>{
  const g=city(),q=g.clerks.people.find(q=>q.id==='clas'),p=eye({...q.service,y:q.y});
  g.clerks.interact(p);g.clerks.step(.1,{...q.item,y:1.68});assert.equal(q.stage,'search');
  g.rush.panic=80;g.clerks.step(5,p);assert.ok(q.stress>=60);g.clerks.interact(p);assert.equal(q.stress,12);assert.equal(q.stage,'search');
  g.clerks.step(1,p);assert.ok(q.stress<12);const stress=q.stress;g.pause();g.step(1,p);assert.equal(q.stress,stress);
  g.rush.start('timed',{seed:17});assert.ok(g.clerks.people.every(q=>q.stage==='idle'));assert.equal(g.clerks.active,null);
});
