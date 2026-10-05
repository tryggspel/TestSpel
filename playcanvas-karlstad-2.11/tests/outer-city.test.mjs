import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {OUTER_AREAS,buildOuterModel,drawOuterModel,outerWaterBlocked} from '../outer-city.js';
import {OUTER_WATER,mariebergBlocked,MARIEBERG,HARBOUR,outerWaterBlocked as spaceBlocked} from '../city-south-space.mjs';

const data={};for(const a of OUTER_AREAS)data[a]=JSON.parse(fs.readFileSync(new URL(`../data/osm-outer-${a}.json`,import.meta.url)));
const SKIP={skipBoxes:[{x:566,z:-129,w:44,d:30},{x:271,z:413,w:38,d:26}]};

test('outer data covers Haga, Inre hamn and Mariebergsskogen with real footprints',()=>{
  const m=buildOuterModel(data,SKIP);
  assert.ok(m.counts.haga.buildings>150,'Haga buildings: '+m.counts.haga.buildings);
  assert.ok(m.counts.hamn.buildings>80,'Inre hamn buildings: '+m.counts.hamn.buildings);
  assert.ok(m.counts.marieberg.buildings>=20,'Mariebergsskogen buildings: '+m.counts.marieberg.buildings);
  assert.ok(m.roads.length>300&&m.trees.length>300&&m.areas.length>80);
  assert.ok(m.buildings.every(b=>b.polygon.length>=3&&b.area>=14&&b.h>=3));
});

test('hand-placed ICA Hagahallen and Willys are not doubled by an OSM footprint',()=>{
  const m=buildOuterModel(data,SKIP);
  for(const s of SKIP.skipBoxes)assert.ok(!m.buildings.some(b=>Math.abs(b.cx-s.x)<(b.sx+s.w)/2&&Math.abs(b.cz-s.z)<(b.sz+s.d)/2),'doubled at '+s.x);
});

test('batch stays within a sane vertex budget',()=>{
  const mesh=drawOuterModel(buildOuterModel(data,SKIP));
  assert.ok(mesh.positions.length/3<340000,'vertices '+mesh.positions.length/3);
});

test('boat landings are on dry land and the park is open instead of a walled garden',()=>{
  const m=buildOuterModel(data,SKIP);
  OUTER_WATER.length=0;for(const w of m.water)OUTER_WATER.push(w);
  for(const p of [MARIEBERG,{x:-789,z:1315},HARBOUR,{x:240,z:555}])assert.equal(spaceBlocked(p.x,p.z),false,'landing in water at '+p.x);
  assert.equal(mariebergBlocked(MARIEBERG.x+60,MARIEBERG.z+10),null,'no invisible garden wall once the park is loaded');
  assert.equal(outerWaterBlocked(m,MARIEBERG.x,MARIEBERG.z),false);
  OUTER_WATER.length=0;
  assert.equal(mariebergBlocked(MARIEBERG.x+100,MARIEBERG.z),true,'fallback keeps the old bounded garden');
});
