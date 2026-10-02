import test from 'node:test';
import assert from 'node:assert/strict';
import {BoatRescue} from '../boat-rescue.mjs';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney} from '../journey-rules.mjs';
import {waterBlocked,peninsulaBanks} from '../park-space.mjs';
import {southWaterBlocked,HARBOUR} from '../city-south-space.mjs';
import {challengeRequest,challengeLink} from '../daily-challenge.mjs';

test('Sandgrund approach is open across the previous 320m shoreline seam',()=>{
  for(let z=-310;z>=-340;z-=.2)assert.equal(waterBlocked(-65,z),false,`Promenade blocked at ${z}`);
  for(let z=-320;z>=-336;z-=2){const [l,r]=peninsulaBanks(z);assert.ok(l<-175&&r>90);}
  assert.equal(waterBlocked(-310,-600),true);
  assert.equal(southWaterBlocked(HARBOUR.x,HARBOUR.z),false);
  assert.equal(southWaterBlocked(300,590),true);
});
const makeCity=()=>{const nav=new CityNavigation(()=>false,{minX:-40,maxX:40,minZ:-40,maxZ:50},3);return new CityJourney(nav,{x:0,z:20},{'sista-rundan':{x:4,z:4,name:'O'},fikapanik:{x:8,z:8,name:'F'},'radda-fikat':{x:8,z:15,name:'R'},sandgrund:{x:0,z:-25,name:'S'}});};
test('Clean City Explore cannot spawn pursuit, tasks, panic or blackouts after ten minutes',()=>{
  const g=makeCity();g.rush.start('clean');const p={x:0,y:1.68,z:0};
  for(let i=0;i<600;i++){g.step(1,p);g.rush.raisePanic(100);g.rush.triggerChaos(p,{x:0,z:-1});g.rush.spawnEnemy(p,{x:0,z:-1});g.rush.tryBlackout();}
  assert.equal(g.actors.filter(a=>a.active).length,0);assert.equal(g.rush.contract,null);assert.equal(g.rush.panic,0);assert.equal(g.rush.blackoutUntil,0);assert.equal(g.phase,'playing');
  assert.equal(g.objective(p).kind,'wait');assert.ok(!g.events.some(e=>/ambush|panic|chaos|street-event/.test(e.type)));
});
test('Clean pickups respect the floor and pay once; timed clean mode ends without capture',()=>{
  const g=makeCity();g.rush.start('trail');g.items=[{x:0,z:0,y:5.4,id:'upper'}];
  g.step(.1,{x:0,y:1.68,z:0});assert.equal(g.found.size,0);
  g.step(.1,{x:0,y:7.08,z:0});assert.equal(g.found.size,1);assert.equal(g.rush.xp,25);
  g.step(.1,{x:0,y:7.08,z:0});assert.equal(g.rush.xp,25);
  for(let i=0;i<180;i++)g.step(1,{x:0,y:1.68,z:0});
  assert.equal(g.phase,'paused');assert.equal(g.rush.state,'finished');assert.equal(g.health,100);assert.equal(g.events.filter(e=>e.type==='trail-finish').length,1);
});
test('Boat chooses jackets aboard and rings in the water; rescue cannot be paid twice',()=>{
  const b=new BoatRescue();b.step(1);assert.equal(b.throwTo(0).tool,'vest');assert.equal(b.throwTo(0),null);b.step(6);assert.equal(b.people[1].status,'deck');b.step(5.6);assert.equal(b.people[1].status,'water');assert.equal(b.throwTo(1).tool,'ring');assert.equal(b.saved,2);
});
test('Boat completion and score are consistent at 30/120 fps; a calm crossing has no rescue targets',()=>{
  const play=fps=>{const b=new BoatRescue();while(b.state==='playing'){b.step(1/fps);const p=b.people.find(p=>p.status==='deck');if(p)b.throwTo(p.id);}return b.snapshot();};
  const a=play(30),b=play(120);assert.equal(a.saved,12);assert.equal(a.points,b.points);assert.equal(a.state,'arrived');
  const calm=new BoatRescue({calm:true});calm.step(18);assert.equal(calm.state,'arrived');assert.equal(calm.points,0);assert.ok(calm.people.every(p=>p.status==='waiting'));
});
test('Boat postcards link to the same rescue mode and score target',()=>{
  const url=challengeLink('https://example.test/game/',{kind:'boat',seed:21,score:440});const q=challengeRequest(new URL(url).search);assert.equal(q.kind,'boat');assert.equal(q.seed,21);assert.equal(q.target,440);
});
