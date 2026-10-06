import test from 'node:test';
import assert from 'node:assert/strict';
import {CityGuidance,smoothPath,arrowPlacements,nextTurn} from '../city-guidance.mjs';
import {CityNavigation,LUNGE} from '../city-missions.mjs';
import {CityJourney} from '../journey-rules.mjs';
import {GOLDEN,RUSH} from '../city-rush.mjs';
import {FieldResearch,RESEARCH,RESEARCH_TASKS,pickResearch} from '../field-research.mjs';
import {seededRandom,CHALLENGE_RULES} from '../daily-challenge.mjs';

const portals={'sista-rundan':{x:45,z:35,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-12,z:19,name:'Fika'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const make=(blocked=()=>false,mode='timed')=>{const g=new CityJourney(new CityNavigation(blocked),{x:-135,z:98},portals);g.rush.start(mode);g.items=[];g.ambushes=[];g.secrets=[];g.postcards=[];return g;};
const f={x:0,z:-1},p={x:0,z:14};
const wall=(x,z)=>x>-9&&x<9&&z>-15&&z<2;

test('routes are string-pulled: fewer corners, every leg still walkable, arrows evenly spaced ahead of the player',()=>{
  const nav=new CityNavigation(wall),raw=nav.path(p,{x:0,z:-32}),smooth=smoothPath(nav,raw);
  assert.ok(smooth.length<raw.length/3,'grid staircase collapsed to corners: '+raw.length+' → '+smooth.length);
  for(let i=1;i<smooth.length;i++)assert.ok(nav.clear(smooth[i-1],smooth[i]),'leg '+i+' cuts through the wall');
  const arrows=arrowPlacements(smooth,p,{spacing:3.5,count:10});
  assert.equal(arrows.length,10);
  assert.ok(Math.hypot(arrows[0].x-p.x,arrows[0].z-p.z)>1.5,'first arrow is ahead, not under the player');
  for(let i=1;i<arrows.length;i++){const d=Math.hypot(arrows[i].x-arrows[i-1].x,arrows[i].z-arrows[i-1].z);assert.ok(d<=3.5+1e-6&&d>2,'spacing '+d);}
  // Arrow yaw uses the same convention as the arrow mesh (tip at -z): direction = (-sin, -cos).
  const a=arrows[0],dir={x:-Math.sin(a.yaw*Math.PI/180),z:-Math.cos(a.yaw*Math.PI/180)},leg={x:smooth[1].x-smooth[0].x,z:smooth[1].z-smooth[0].z},l=Math.hypot(leg.x,leg.z);
  assert.ok(dir.x*leg.x/l+dir.z*leg.z/l>.99,'arrow points along the route');
});

test('turn-by-turn text names the next real corner and its distance',()=>{
  const nav=new CityNavigation(wall),guide=new CityGuidance(nav),goal={x:0,z:-32,label:'MÅL',kind:'mission'};
  const route=guide.update(p,goal,f),corner=nextTurn(route.path,p);
  assert.equal(corner.side,'VÄNSTER');assert.ok(corner.distance>8&&corner.distance<18);
  const toward={x:route.next.x-p.x,z:route.next.z-p.z};
  assert.equal(guide.update(p,goal,toward).turn,'RAKT FRAM · VÄNSTER OM '+corner.distance+' M');
  const strip=guide.update(p,goal,toward).strip;assert.equal(strip,'MÅL · '+route.distance+' M · ← OM '+corner.distance+' M');assert.ok(strip.length<=40);
  assert.match(guide.update(p,goal,{x:-toward.x,z:-toward.z}).strip,/^VÄND DIG OM · MÅL/);
  // Standing at the corner, the instruction becomes immediate.
  const at=route.path[1],after={x:route.path[2].x-at.x,z:route.path[2].z-at.z};
  assert.match(guide.update({x:at.x-.5,z:at.z+.5},goal,after).turn,/^(RAKT FRAM|SVÄNG VÄNSTER NU)/);
});

test('a close zombie telegraphs: it stops for the wind-up, then dashes; a hit during the wind-up cancels the lunge',()=>{
  const g=make();const z=g.actors[0];g.spawn(z,{x:0,z:12},'walker');Object.assign(z,{x:0,z:12});const player={x:0,z:14};
  g.step(.05,player,f);
  assert.ok(z.windupUntil>g.elapsed,'wind-up started inside lunge range');assert.equal(Math.hypot(z.vx,z.vz),0);
  g.step(LUNGE.windup+.02,player,f);
  assert.ok(z.lungeUntil>g.elapsed,'dash follows the wind-up');assert.ok(Math.hypot(z.vx,z.vz)>z.speed*2,'dash is clearly faster than walking');
  const h=make();const y=h.actors[0];h.spawn(y,{x:0,z:12},'tank');Object.assign(y,{x:0,z:12});h.step(.05,player,f);assert.ok(y.windupUntil>h.elapsed);
  h.drainEvents();h.shoot({x:0,z:14,dx:0,dz:-1});
  assert.equal(y.windupUntil,0);assert.ok(h.drainEvents().some(e=>e.type==='lunge-broken'));
});

test('Guld-Gunnar appears once, flees instead of biting, and pays once when caught',()=>{
  const g=make();g.rush.golden.at=0;g.rush.nextContract=999;g.rush.nextPatrol=999;g.rush.nextChaos=999;g.rush.ecology.nextSun=999;
  g.step(.1,p,f);const gold=g.rush.golden.actor;
  assert.ok(gold?.active,'spawned');assert.equal(gold.kind,'golden');assert.equal(g.objective(p).kind,'golden');
  const start=Math.hypot(gold.x-p.x,gold.z-p.z);for(let i=0;i<20;i++)g.step(.1,p,f);
  assert.ok(Math.hypot(gold.x-p.x,gold.z-p.z)>start,'he runs away from the player');
  Object.assign(gold,{x:p.x,z:p.z-.6});const health=g.health;g.step(.2,p,f);assert.equal(g.health,health,'no contact damage');
  const xp=g.rush.xp,time=g.rush.time;Object.assign(gold,{x:0,z:10,hp:1});g.drainEvents();
  g.shoot({x:0,z:14,dx:0,dz:-1});g.step(.01,{x:0,z:14},f);
  assert.equal(gold.active,false);assert.ok(g.rush.xp>=xp+GOLDEN.points);assert.ok(g.rush.time>time+GOLDEN.time-1);assert.equal(g.energy,100);
  const events=g.drainEvents();assert.equal(events.filter(e=>e.type==='golden-caught').length,1);
  for(let i=0;i<30;i++)g.step(.5,p,f);assert.ok(!g.actors.some(a=>a.kind==='golden'&&a.active),'only one per hunt');
});

test('Guld-Gunnar slips away when the timer runs out',()=>{
  const g=make();g.rush.golden.at=0;g.rush.nextContract=999;g.rush.nextPatrol=999;g.rush.nextChaos=999;g.rush.ecology.nextSun=999;
  g.step(.1,p,f);const gold=g.rush.golden.actor;assert.ok(gold);
  for(let t=0;t<GOLDEN.seconds+1;t+=.5)g.step(.5,{x:200,z:200},f);
  assert.equal(gold.active,false);assert.ok(g.drainEvents().some(e=>e.type==='golden-escaped'));assert.equal(g.rush.golden.caught,undefined);
});

test('Fältuppdrag: seeded, at most one hard task, rewards through the hunt and a single breakthrough',()=>{
  const a=pickResearch(seededRandom(42)),b=pickResearch(seededRandom(42));
  assert.deepEqual(a.map(t=>t.id),b.map(t=>t.id),'same seed, same tasks');
  for(let seed=1;seed<200;seed++){const t=pickResearch(seededRandom(seed));assert.equal(t.length,3);assert.ok(t.filter(x=>RESEARCH_TASKS.find(d=>d.id===x.id).hard).length<=1);assert.equal(new Set(t.map(x=>x.id)).size,3);}
  const r=new FieldResearch(seededRandom(1));r.tasks=[{id:'runners',text:'X',goal:3,count:0,done:false},{id:'thermos',text:'Y',goal:4,count:0,done:false},{id:'sun',text:'Z',goal:1,count:0,done:false}];
  let paid=0,seconds=0;const pay=(x,s)=>{paid+=x;seconds+=s;};
  assert.equal(r.observe([{type:'zap',kind:'walker'},{type:'zap',kind:'runner'}],pay).length,0);assert.equal(r.tasks[0].count,1);
  assert.equal(r.hudLine(),'FÄLT 0/3 · X 1/3');
  for(const d of RESEARCH_TASKS)assert.ok(('FÄLT 2/3 · '+d.hud+(d.goal>1?' '+d.goal+'/'+d.goal:'')).length<=31,'HUD label too long: '+d.hud);
  r.observe([{type:'zap',kind:'runner'},{type:'zap',kind:'runner'},{type:'zap',kind:'runner'}],pay);assert.equal(r.tasks[0].done,true);assert.equal(r.tasks[0].count,3);
  r.observe(Array(4).fill({type:'thermos'}),pay);const out=r.observe([{type:'sun-bonus'},{type:'sun-bonus'}],pay);
  assert.deepEqual(out.map(e=>e.type),['research-complete','research-breakthrough']);
  assert.equal(paid,RESEARCH.taskXp*3+RESEARCH.breakthroughXp);assert.equal(seconds,RESEARCH.taskSeconds*3+RESEARCH.breakthroughSeconds);
  assert.equal(r.observe([{type:'sun-bonus'}],pay).length,0,'never pays twice');
  // Wired into the hunt: zap events from real hits move the tasks and pay XP and time.
  const g=make();g.rush.research.tasks=[{id:'zombies',text:'STOPPA',goal:1,count:0,done:false}];const xp=g.rush.xp,time=g.rush.time;
  const z=g.actors[0];g.spawn(z,{x:0,z:9},'runner');Object.assign(z,{x:0,z:9});g.shoot({x:0,z:14,dx:0,dz:-1});
  const events=g.drainEvents();assert.ok(events.some(e=>e.type==='research-complete'));assert.ok(g.rush.xp>=xp+RESEARCH.taskXp);assert.ok(g.rush.time>time+RESEARCH.taskSeconds-1);
});

test('between street events the arrows lead to a nearby thermos instead of disappearing',()=>{
  const g=make();g.rush.nextContract=999;g.rush.nextChaos=999;g.rush.golden.at=999;
  assert.equal(g.objective(p).kind,'wait');
  g.items=[{x:10,z:14,id:'near'},{x:200,z:14,id:'far'}];const goal=g.objective(p);
  assert.equal(goal.kind,'coffee');assert.equal(goal.id,'coffee-near');assert.match(goal.label,/HÄNDELSE OM \d+ S/);
  g.found.add('near');assert.equal(g.objective(p).kind,'wait','only thermoses within reach');
});

test('the hunt goal moved to 1000 XP and daily links from 2.11 are not compared with 2.12',()=>{
  assert.equal(RUSH.target,1000);assert.equal(CHALLENGE_RULES,8);
  const g=make();g.reward(999);assert.equal(g.rush.exitReady,false);g.reward(1);assert.equal(g.rush.exitReady,true);
});
