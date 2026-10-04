import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CITY_STREETS,cityBuildings,infillBuildings} from '../city-geography.mjs';
import {REAL_BUSINESSES,businessAnchor} from '../businesses.mjs';
import {ComicMesh} from '../city-architecture.js';
import {addCityWowPass,visualTwinCornerFront} from '../city-wow-pass.mjs';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const detailed=cityBuildings(osm);
const infill=infillBuildings(osm,detailed);

test('Opera quarter gains its real OSM street skeleton',()=>{
  const names=new Set(CITY_STREETS.map(s=>s.name));
  for(const name of ['Älvgatan','Våxnäsgatan','Sandbäcksgatan','Södra Klaragatan'])assert.ok(names.has(name),name);
  assert.ok(CITY_STREETS.some(s=>s.name==='Älvgatan'&&s.points.some(([x])=>x<-275)));
  assert.ok(CITY_STREETS.some(s=>s.name==='Våxnäsgatan'&&s.points.some(([x])=>x<-360)));
});

test('verified Gossip & Bubbels renders on its mapped Älvgatan 2 building',()=>{
  const b=REAL_BUSINESSES.find(x=>x.id==='gossip');
  assert.ok(b);assert.equal(b.address,'Älvgatan 2');assert.equal(b.osm,101202579);
  const a=businessAnchor(b,[...detailed,...infill]);
  assert.ok(a);assert.equal(a.yaw,0);assert.ok(a.width>=8);
});

test('wow pass upgrades ground floors, corners, Stora Torget and Opera without dynamic systems',()=>{
  const mesh=new ComicMesh(),stats=addCityWowPass(mesh,detailed);
  assert.ok(stats.fronts>=30,'broad centre coverage');
  assert.ok(stats.corners>=5,'corner identity');
  assert.ok(stats.squareEdges>=8,'Stora Torget edge coverage');
  assert.ok(stats.torgetProps>=10);
  assert.ok(stats.operaProps>=4);
  assert.ok(mesh.positions.length>0&&mesh.positions.every(Number.isFinite));
  assert.ok(mesh.positions.length/3<18000,'wow geometry remains comfortably static/batched');
});

test('corner logic finds at least several genuine two-street buildings',()=>{
  const corners=detailed.filter(b=>visualTwinCornerFront(b));
  assert.ok(corners.length>=5);
  assert.ok(corners.every(b=>b.dist<260));
});
