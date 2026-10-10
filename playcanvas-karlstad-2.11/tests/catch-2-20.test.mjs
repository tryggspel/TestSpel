// 2.20: fångstfält som växer med farten i alla lägen (City Explore, Termosrundan och zombiejakten).
import test from 'node:test';
import assert from 'node:assert/strict';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney,CATCH,catchReach} from '../journey-rules.mjs';
import {rarityFor} from '../explore-fun.mjs';
import {powerFor} from '../powerups.mjs';
import {stockholmDay} from '../daily-challenge.mjs';

const mall={x:-135,z:98};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-135,z:55,name:'Rädda fikat'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
const day=()=>stockholmDay(new Date());
const plain=g=>g.items.filter(t=>!t.y&&rarityFor(t.id,day())==='common'&&!powerFor(t.id,day())&&!/^(kil|marieberg)-/.test(t.id));
// En vanlig termos som ingen annan termos ligger nära: vilka termosar som är vanliga beror på dagens datum, och en granne i närheten skulle ge fler träffar än provet väntar sig.
const lone=(g,r=45)=>plain(g).find(t=>!g.items.some(q=>q!==t&&!q.y&&Math.hypot(q.x-t.x,q.z-t.z)<r))||plain(g)[0];
const make=(mode,nav=new CityNavigation())=>{const g=new CityJourney(nav,mall,portals,storage());if(mode)g.rush.start(mode);g.drainEvents();return g;};
// Spring längs x med farten v (m/s) i 60 bilder/s, sidled z0 från termosen. Returnerar alla termos-händelser.
function run(g,t,v,lateral){
  const out=[],dx=v/60;
  for(let x=t.x-30;x<=t.x+30;x+=dx){g.step(1/60,{x,z:t.z+lateral,y:1.68},{x:1,z:0});out.push(...g.drainEvents());}
  return out.filter(e=>e.type==='thermos');
}

test('fångstradien växer med farten: 2,4 m till fots, mer i sprint och turbo, aldrig mer än taket',()=>{
  assert.equal(catchReach(0),CATCH.base);assert.equal(catchReach(CATCH.walk),CATCH.base);
  assert.ok(catchReach(11.2)>catchReach(7.2)&&catchReach(14.4)>catchReach(11.2));
  assert.ok(catchReach(14.4)>=3.6,'turbo ×2: '+catchReach(14.4));
  assert.equal(catchReach(500),CATCH.max);assert.equal(catchReach(NaN),CATCH.base);assert.equal(catchReach(-5),CATCH.base);
  assert.ok(CATCH.base>1.65,'större än den gamla radien');
});

test('City Explore: en termos 3,2 m vid sidan tas i turbo men inte på långsam promenad',()=>{
  const slow=make('clean'),a=lone(slow);
  assert.equal(run(slow,a,3.6,3.2).filter(e=>e.id===a.id).length,0,'långsamt: utanför 2,4 m');
  const fast=make('clean'),b=lone(fast);
  assert.equal(run(fast,b,14.4,3.2).filter(e=>e.id===b.id).length,1,'turbo: fångas i farten');
});

test('City Explore: en termos tas inte genom en vägg eller över vatten',()=>{
  const g0=make('clean'),t=lone(g0);
  const wall=(x,z)=>Math.abs(x-t.x)<25&&z>t.z+.8&&z<t.z+2.4;
  const g=make('clean',new CityNavigation(wall));
  assert.equal(run(g,t,14.4,3.2).filter(e=>e.id===t.id).length,0,'väggen stoppar fångsten');
  // en stolpe (en blockerad punkt) stoppar inte
  const pole=(x,z)=>Math.hypot(x-t.x,z-(t.z+1.6))<.3,h=make('clean',new CityNavigation(pole));
  assert.equal(run(h,t,14.4,3.2).filter(e=>e.id===t.id).length,1,'en smal stolpe hindrar inte');
});

test('Termosrundan och zombiejakten får samma fångstfält som City Explore',()=>{
  for(const mode of ['trail',null]){
    const slow=make(mode),a=lone(slow),fast=make(mode),b=lone(fast);
    assert.equal(run(slow,a,3.6,3).filter(e=>e.id===a.id).length,0,(mode||'zombie')+': långsamt');
    assert.equal(run(fast,b,11.2,3).filter(e=>e.id===b.id).length,1,(mode||'zombie')+': sprint fångar 3 m från banan');
  }
});

test('stillastående och teleport: radien följer verklig fart, inte hopp',()=>{
  const g=make('clean'),t=lone(g);
  g.step(1/60,{x:t.x+3,z:t.z,y:1.68},{x:1,z:0});assert.equal(g.drainEvents().filter(e=>e.type==='thermos').length,0,'3 m bort utan fart tas den inte');
  assert.ok(g.speed<1,'fart ~0');
  g.step(1/60,{x:t.x+3,z:t.z,y:1.68},{x:1,z:0});g.lastStep=null;g.speed=0;
  g.step(1/60,{x:t.x+500,z:t.z,y:1.68},{x:1,z:0});assert.equal(g.speed,0,'teleport ger ingen fart');
});

test('kaffemagneten fungerar som förut: 16 m, högst tre per steg, genom väggar',()=>{
  const g0=make('clean'),t=lone(g0),g=make('clean',new CityNavigation((x,z)=>Math.abs(x-(t.x+5))<1&&Math.abs(z-t.z)<30));
  g.fun.boosters.magnet=20;g.step(.1,{x:t.x+10,z:t.z,y:1.68},{x:1,z:0});
  const ev=g.drainEvents().filter(e=>e.type==='thermos');assert.ok(ev.some(e=>e.id===t.id)&&ev.length<=3,'magnet tar den över muren: '+ev.length);
});
