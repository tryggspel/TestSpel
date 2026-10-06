import test from 'node:test';
import assert from 'node:assert/strict';
import {ZombieBus,INCIDENTS} from '../zombie-bus.mjs';

const route=[{x:0,z:0},{x:0,z:-80},{x:40,z:-160}];
const drive=(bus,seconds,steer=()=>0)=>{for(let t=0;t<seconds&&bus.state==='playing';t+=1/60)bus.step(1/60,steer(bus));};

test('utan incidents är bussen oförändrad (äldre regler och utmaningar)',()=>{
  const a=new ZombieBus(route),b=new ZombieBus(route,{incidents:false});
  drive(a,12);drive(b,12);assert.equal(a.incident,null);assert.equal(a.roll,b.roll);assert.equal(a.snapshot().incident,null);
});

test('chauffören somnar vid 5,5 s och bussen driver iväg tills han skakas',()=>{
  const bus=new ZombieBus(route,{incidents:true});
  const ctl=b=>Math.max(-1,Math.min(1,-b.roll*2)),peak=(b,sec)=>{let m=0;for(let t=0;t<sec;t+=1/60){b.step(1/60,ctl(b));m=Math.max(m,Math.abs(b.roll));}return m;};
  drive(bus,5.4,ctl);assert.equal(bus.incident,null);drive(bus,.3,ctl);assert.equal(bus.incident?.kind,'sleep');assert.equal(bus.incident.need,3);
  assert.match(bus.instruction,/SKAKA/);assert.ok(bus.snapshot().driver.sleeping);
  const clean=new ZombieBus(route);drive(clean,bus.elapsed,ctl);
  const pBus=peak(bus,2.5),pClean=peak(clean,2.5);assert.ok(pBus>pClean+.05,'drift syns i rullningen: '+pBus+' mot '+pClean);
  assert.equal(bus.shake(),false);assert.equal(bus.shake(),false);assert.equal(bus.incident.need,1);assert.equal(bus.shake(),true);
  assert.equal(bus.incident,null);assert.equal(bus.resolved,1);assert.equal(bus.shake(),false,'inget att skaka');
});

test('skärmen ballar ur vid 14,5 s och rätt svar startar om den, fel svar skakar bussen',()=>{
  const bus=new ZombieBus(route,{incidents:true});
  drive(bus,5.6);bus.shake();bus.shake();bus.shake();drive(bus,9.1,b=>-b.roll*2);
  assert.equal(bus.incident?.kind,'gps');assert.match(bus.quip,/SKÄRMEN/);assert.ok(bus.snapshot().driver.panic);
  assert.equal(bus.shake(),false,'GPS kan inte skakas');const hp=bus.health;bus.bump(6);assert.equal(bus.health,hp-6);
  assert.equal(bus.fixGps(),true);assert.equal(bus.incident,null);assert.equal(bus.resolved,2);
});

test('olöst incident äter bussens skick efter åtta sekunder, och löst ger bonus vid ankomst',()=>{
  const lazy=new ZombieBus(route,{incidents:true});drive(lazy,16,b=>Math.max(-1,Math.min(1,-b.roll*3)));
  assert.ok(lazy.health<100,'orörd förare kostar skick: '+lazy.health);
  const good=new ZombieBus(route,{incidents:true});
  drive(good,30,b=>{if(b.incident?.kind==='sleep')while(!b.shake());if(b.incident?.kind==='gps')b.fixGps();return Math.max(-1,Math.min(1,-b.roll*3));});
  assert.equal(good.state,'arrived');assert.equal(good.resolved,INCIDENTS.length);
  const plain=new ZombieBus(route);drive(plain,30,b=>Math.max(-1,Math.min(1,-b.roll*3)));
  assert.ok(good.points>=200+INCIDENTS.length*40,'bonus för varje löst klantigt ögonblick: '+good.points);void plain;
});

test('bump kan krascha bussen men bara en gång och bara under körning',()=>{
  const bus=new ZombieBus(route,{incidents:true});bus.bump(500);assert.equal(bus.state,'crashed');bus.bump(5);assert.equal(bus.state,'crashed');
});
