import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWeather,normalizeTransport,normalizeIncidents,incidentProfile,deriveCityPulse,deriveLiveModifiers,evaluatePerformance} from '../live-city-rules.mjs';

const now=Date.parse('2026-09-30T08:00:00Z');
test('normalizes current SMHI forecast',()=>{
  const w=normalizeWeather({referenceTime:'2026-09-30T07:00:00Z',timeSeries:[{time:'2026-09-30T08:00:00Z',data:{air_temperature:11.4,wind_speed:4.2,cloud_area_fraction:5,precipitation_amount_mean:.3}}]},now);
  assert.equal(w.temperature,11.4);assert.equal(w.source,'SMHI SNOW1g v1');assert.equal(w.rain,.3);
});
test('rejects stale forecast',()=>{
  const w=normalizeWeather({timeSeries:[{time:'2026-09-29T01:00:00Z',data:{air_temperature:10}}]},now);
  assert.equal(w,null);
});
test('transport is radius bounded and capped',()=>{
  const t=normalizeTransport({vehicles:[{id:'near',lat:59.381,lon:13.503},{id:'far',lat:60.2,lon:14.2}]},{lat:59.380767,lon:13.50295},8);
  assert.equal(t.vehicles.length,1);assert.equal(t.vehicles[0].id,'near');assert.ok(Number.isFinite(t.vehicles[0].x));assert.ok(Number.isFinite(t.vehicles[0].z));
});
test('keeps proxy projected bus coordinates',()=>{
  const t=normalizeTransport({vehicles:[{id:'bus',lat:59.381,lon:13.503,x:12.5,z:-44.2,routeId:'1'}]},{lat:59.380767,lon:13.50295},8);
  assert.equal(t.vehicles[0].x,12.5);assert.equal(t.vehicles[0].z,-44.2);assert.equal(t.vehicles[0].route,'1');
});
test('profiles Trafikverket incidents without inventing severity',()=>{
  const incidents=normalizeIncidents({items:[{id:'a',type:'Vägarbete',header:'Arbete på väg',severity:'Stor påverkan',x:1,z:2}]});
  const p=incidentProfile(incidents);assert.equal(p.count,1);assert.equal(p.kind,'roadwork');assert.equal(p.level,2);assert.equal(p.id,'a');
});
test('city pulse is a labelled model, not a visitor count',()=>{
  const p=deriveCityPulse({weather:{rain:0,wind:2,cloud:1},transport:{vehicles:Array.from({length:10},(_,i)=>({id:i}))},now:new Date('2026-09-30T16:00:00+02:00')});
  assert.ok(p.value>=50&&p.value<=100);assert.equal(p.model,'game-derived');assert.equal(p.inputs.buses,10);
});
test('modifiers remain deliberately narrow',()=>{
  const m=deriveLiveModifiers({pulse:{value:100},weather:{rain:8,wind:20}});
  assert.ok(m.chaosDelayScale>=.8);assert.ok(m.pursuitSpeedScale<=1.05);assert.ok(m.scentDecayScale<=1.24);
});
test('performance guard disables after three regressions',()=>{
  let strikes=0;
  for(let i=0;i<3;i++)strikes=evaluatePerformance({baseline:60,current:57,strikes,coarse:true}).strikes;
  const r=evaluatePerformance({baseline:60,current:57,strikes:2,coarse:true});
  assert.equal(r.disable,true);
});
