import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,infillBuildings} from '../city-geography.mjs';
import {REAL_BUSINESSES,businessAnchor} from '../businesses.mjs';
import {ComicMesh} from '../city-architecture.js';
import {addCityWowPass} from '../city-wow-pass.mjs';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const detailed=cityBuildings(osm),all=[...detailed,...infillBuildings(osm,detailed)];

test('pass 2 includes the verified shopping-street brands',()=>{
  const byId=new Map(REAL_BUSINESSES.map(b=>[b.id,b]));
  for(const id of ['lindex','kjell','kicks','apoteket','synsamoutlet'])assert.ok(byId.has(id),id);
  assert.equal(byId.get('lindex').address,'Drottninggatan 15');
  assert.equal(byId.get('kjell').address,'Drottninggatan 18');
  assert.equal(byId.get('kicks').address,'Järnvägsgatan 2');
  assert.equal(byId.get('apoteket').address,'Järnvägsgatan 2');
  assert.equal(byId.get('synsamoutlet').address,'Drottninggatan 19');
});

test('multiple brands on the same Duvan facade get separate anchors',()=>{
  const kicks=businessAnchor(REAL_BUSINESSES.find(b=>b.id==='kicks'),all);
  const apoteket=businessAnchor(REAL_BUSINESSES.find(b=>b.id==='apoteket'),all);
  assert.ok(kicks&&apoteket);
  assert.ok(Math.hypot(kicks.x-apoteket.x,kicks.z-apoteket.z)>6);
});

test('shopping spine gets broad static sign and corner coverage',()=>{
  const mesh=new ComicMesh(),stats=addCityWowPass(mesh,detailed);
  console.log('PASS2_STATS',JSON.stringify(stats));
  assert.ok(stats.shoppingFronts>=20,'major shopping streets should dominate the centre pass');
  assert.ok(stats.corners>=5);
  assert.ok(mesh.positions.length>0&&mesh.positions.every(Number.isFinite));
  assert.ok(mesh.positions.length/3<22000,'sign density must remain inside a conservative static geometry budget');
});
