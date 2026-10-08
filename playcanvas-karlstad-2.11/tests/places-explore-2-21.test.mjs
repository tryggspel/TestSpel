// 2.21: personalens hjälpuppdrag och platsuppdragen i vanliga City Explore, och att övriga lägen lämnas ifred.
import test from 'node:test';
import assert from 'node:assert/strict';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney} from '../journey-rules.mjs';
import {FriendlyClerks} from '../friendly-clerks.mjs';
import {PlaceQuests} from '../place-quests.mjs';
import {PLACES} from '../places.mjs';
import {MALL_ROOMS} from '../mall-space.mjs';

const nav=new CityNavigation(),mall={x:-135,z:98};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-135,z:55,name:'Rädda fikat'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
const ANCHORS={pressbyran14:{x:30.78,z:-52.68,yaw:0}},FACES={pressbyran14:'south'};
function world(mode,store=storage()){
  const j=new CityJourney(nav,mall,portals,store);
  if(mode)j.rush.start(mode);j.drainEvents();
  j.clerks=new FriendlyClerks(j,[]);
  j.places=new PlaceQuests({anchors:ANCHORS,faces:FACES,storage:store,host:{push:e=>j.events.push(e),reward:p=>j.reward(p),onStamp:(n,t)=>j.fun.notePartnerStamps(n,t),
    available:()=>j.rush.mode==='clean'&&j.rush.state==='playing'&&!j.tempo.running&&!j.rush.challenge}});
  return j;
}
const at=(x,z,y=1.68)=>({x,z,y});
const step=(j,p,dt=.1)=>{j.step(dt,p,{x:0,z:-1});return j.drainEvents();};
const room=id=>MALL_ROOMS.find(r=>r.id===id);

test('Cervera i City Explore: personalen lämnar över till platsuppdraget; i zombieläget finns det gamla hjälpuppdraget kvar',()=>{
  const cerv=PLACES.find(p=>p.id==='cervera'),clean=world('clean'),zombie=world('timed');
  const p=at(-144,129.2);
  assert.equal(clean.places.prompt(p).label,'HJÄLP RUT');
  assert.equal(clean.clerks.prompt(p),null,'personalen har inget eget gammalt uppdrag här i Explore');
  assert.equal(clean.clerks.interact(p),false);
  assert.equal(zombie.places.prompt(p),null,'inga platsuppdrag i zombieläget');
  const zp=at(-144,129.8); // det gamla uppdraget räknar avståndet från personalen bakom disken
  assert.equal(zombie.clerks.prompt(zp),'HJÄLP','zombieläget oförändrat');
  assert.equal(zombie.clerks.interact(zp),true);assert.equal(zombie.clerks.active,'cervera');assert.equal(zombie.routeMode,'help');
  assert.ok(cerv);
});

test('Coop i City Explore: personalens hjälpuppdrag fungerar nu även utan zombier (hitta föremålet, lämna, få poäng)',()=>{
  const j=world('clean'),coop=room('coop'),clerk=j.clerks.people.find(q=>q.id==='coop'),here=at(-160.5,88);
  assert.equal(j.clerks.prompt(here),'HJÄLP');assert.equal(j.places.prompt(here),null,'Coop har inget platsuppdrag');
  assert.equal(j.clerks.interact(here),true);assert.equal(clerk.stage,'search');assert.equal(j.routeMode,'help');
  assert.match(j.objective(here).label,/HÄMTA KVITTOT/,'vägledningen pekar på föremålet i Explore också');
  const ev=step(j,at(clerk.item.x,clerk.item.z));
  assert.equal(clerk.stage,'found');assert.ok(ev.some(e=>e.type==='friendly'&&/KVITTOT hittad/.test(e.text)));
  assert.equal(j.clerks.prompt(here),'LÄMNA KVITTOT');
  const before=j.balance;assert.equal(j.clerks.interact(here),true);
  assert.equal(j.balance-before,80);assert.equal(clerk.stage,'done');assert.equal(j.routeMode,'hunt');
  assert.equal(j.clerks.prompt(here),'PRATA');
  assert.ok(coop);
});

test('Clas Ohlson (plan 1) i City Explore: samma hjälpuppdrag, på rätt våning',()=>{
  const j=world('clean'),clerk=j.clerks.people.find(q=>q.id==='clas'),up=1.68+5.4,here=at(-139,77.2,up);
  assert.equal(clerk.y,5.4);assert.equal(j.clerks.prompt(here),'HJÄLP');assert.equal(j.clerks.prompt(at(-139,77.2)),null,'inte på plan 0');
  assert.equal(j.clerks.interact(here),true);assert.equal(clerk.stage,'search');
  step(j,at(clerk.item.x,clerk.item.z,1.68));assert.equal(clerk.stage,'search','fel våning hittar ingenting');
  const ev=step(j,at(clerk.item.x,clerk.item.z,up));assert.equal(clerk.stage,'found');assert.ok(ev.some(e=>e.type==='friendly'&&/SKRUVASKEN hittad/.test(e.text)));
  const bal=j.balance;j.clerks.interact(here);assert.equal(j.balance-bal,80);
});

test('Temporush, Termosrundan och delade utmaningar: inga platsuppdrag, personalen bara pratar',()=>{
  const cerv=at(-144,129.2),coopSpot=at(-160.5,88);
  // Temporush
  const t=world('clean');t.places.interact(cerv);assert.ok(t.places.run);
  t.startTempo();step(t,cerv);
  assert.equal(t.places.run,null,'Temporush avbryter uppdraget');assert.equal(t.places.available(),false);assert.equal(t.places.prompt(cerv),null);
  assert.equal(t.clerks.prompt(coopSpot),'PRATA','personalen pratar bara under Temporush');
  assert.equal(t.clerks.interact(coopSpot),true);assert.equal(t.clerks.people.find(q=>q.id==='coop').stage,'idle','inget hjälpuppdrag startar');
  // Termosrundan
  const tr=world('trail');assert.equal(tr.places.available(),false);assert.equal(tr.places.prompt(cerv),null);assert.equal(tr.clerks.prompt(coopSpot),'PRATA');
  // delad utmaning
  const ch=world('clean');ch.rush.challenge={kind:'daily',day:'2026-10-08'};assert.equal(ch.places.available(),false);assert.equal(ch.places.interact(cerv),false);assert.equal(ch.clerks.prompt(coopSpot),'PRATA');
});

test('uppdrag styrs av spelets vanliga steg: besök, föremål, avbrott när ett nytt pass börjar',()=>{
  const j=world('clean'),cerv=j.places.get('cervera'),items=cerv.activity.items;
  step(j,at(cerv.talk.x,cerv.talk.z));
  assert.equal(j.places.events.count('place_visit','cervera'),1);
  j.places.interact(at(cerv.talk.x,cerv.talk.z));assert.ok(j.places.run);
  assert.match(j.objective(at(cerv.talk.x,cerv.talk.z)).label,/KOPPEN|KANNAN|FATET/,'vägledningen visar nästa föremål');
  const ev=step(j,at(items[0].x,items[0].z));assert.ok(ev.some(e=>e.type==='place-item'));
  j.newExploreRun(7);assert.equal(j.places.run,null,'ett nytt pass avbryter pågående uppdrag');
});

test('belöningen går via vanliga kaffepoäng och räknas i rundan, stämpeln i passet och märket i fikaalbumet',()=>{
  const j=world('clean'),cerv=j.places.get('cervera');
  const xp0=j.rush.xp,bal0=j.balance;
  j.places.interact(at(cerv.talk.x,cerv.talk.z));
  for(const it of cerv.activity.items)step(j,at(it.x,it.z));
  const ev=[];j.places.interact(at(cerv.talk.x,cerv.talk.z));ev.push(...j.drainEvents());
  assert.ok(ev.some(e=>e.type==='place-complete'&&e.points===150));
  assert.ok(j.balance-bal0>=150,'poängen läggs på kaffepoängen (andra fynd på vägen kan ge mer)');assert.ok(j.rush.xp-xp0>=150,'räknas i rundans poäng');
  assert.equal(j.places.stampCount(),1);assert.ok(j.fun.state.badges.includes('pass-1'));
});

test('karaktärerna bakom uppdragen finns i personalens lista och heter som i spelet',()=>{
  const j=world('clean');
  for(const p of PLACES.filter(p=>p.status==='demo')){const q=j.clerks.people.find(x=>x.id===p.staff.clerk);if(p.id==='cervera'){assert.ok(q,'Cervera-personal finns');assert.equal(q.name,p.staff.name);}}
  assert.equal(j.clerks.people.find(q=>q.id==='cervera').name,'Rut i returen');
});
