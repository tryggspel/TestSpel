import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {coreContourBuildings} from '../city-architecture.js';
import {mappedGreenAreas} from '../city-environment.mjs';
import {SOUTH_PLACES} from '../city-south-space.mjs';

test('city pass batches at most 64 ordinary OSM contours',()=>{
  const buildings=Array.from({length:80},(_,i)=>({osm:900000+i,dist:20+i,area:120,sx:12,sz:10,tags:{}}));
  const result=coreContourBuildings(buildings);
  assert.equal(result.length,64);
  assert.ok(result.every(b=>b.dist<195));
});

test('green map pass is capped to 31 nearest mapped areas',()=>{
  const origin={lat:59.380767,lon:13.50295};
  const elements=Array.from({length:40},(_,i)=>{const d=.00003*(i+1),lat=origin.lat+d,lon=origin.lon;return {id:700000+i,type:'way',tags:{landuse:'grass'},geometry:[{lat,lon},{lat,lon:lon+.00012},{lat:lat+.00012,lon:lon+.00012},{lat:lat+.00012,lon},{lat,lon}]};});
  const areas=mappedGreenAreas({elements});
  assert.equal(areas.length,31);
  assert.ok(areas[0].dist<=areas.at(-1).dist);
});

test('mobile pickup feedback has fixed 26px height and clears bottom positioning',()=>{
  const css=fs.readFileSync(new URL('../last-round.css',import.meta.url),'utf8');
  assert.match(css,/height:26px!important/);
  assert.match(css,/bottom:auto!important/);
});


test('Haga and Bryggudden are real selectable city destinations',()=>{
  const places=Object.fromEntries(SOUTH_PLACES.map(p=>[p.id,p]));
  assert.deepEqual([places.willys.x,places.willys.z],[271,413]);
  assert.deepEqual([places.icahaga.x,places.icahaga.z],[566,-129]);
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/route-place-willys/);assert.match(html,/route-place-icahaga/);
});

test('Klaralven and sightseeing train stay in the static city pass',()=>{
  const south=fs.readFileSync(new URL('../city-south.js',import.meta.url),'utf8');
  assert.match(south,/#2f91a5/);assert.match(south,/KARLSTAD SIGHTSEEING/);assert.match(south,/Kungsgatan: two low glass-walled outdoor seating areas/);
});
