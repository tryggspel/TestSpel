import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {coreContourBuildings,ComicMesh,addFrimurareExplicitHero} from '../city-architecture.js';
import {mappedGreenAreas} from '../city-environment.mjs';
import {SOUTH_PLACES} from '../city-south-space.mjs';

test('real-centre pass batches all 95 admitted ordinary OSM contours across the 260 m core',()=>{
  const buildings=Array.from({length:110},(_,i)=>({osm:900000+i,dist:20+i*2,area:120,sx:12,sz:10,tags:{}}));
  const result=coreContourBuildings(buildings);
  assert.equal(result.length,95);
  assert.ok(result.every(b=>b.dist<260));
});


test('Frimurarelogen explicit hero creates a full four-face reference shell',()=>{
  const b={osm:101608925,minx:-65,maxx:-20,minz:43,maxz:82,h:9.6};
  const mesh=new ComicMesh();
  assert.equal(addFrimurareExplicitHero(mesh,b),true);
  assert.ok(mesh.positions.length/3>700,'hero facade should contain substantial window/pilaster geometry');
  const zs=[];for(let i=2;i<mesh.positions.length;i+=3)zs.push(mesh.positions[i]);
  assert.ok(Math.min(...zs)<b.minz-.20,'north hero skin must sit visibly in front of the OSM wall');
  assert.ok(Math.max(...zs)>b.maxz+.20,'south reference side must also exist');
  assert.ok(mesh.normals[2]<-.9,'first north-face triangle must point outward toward Tingvallagatan (-Z)');
});

test('Frimurarelogen hero4 card pipeline is present',()=>{
  const src=fs.readFileSync(new URL('../city-identity.js',import.meta.url),'utf8');
  assert.match(src,/Frimurarelogen · HERO4 · Tingvallagatan/);
  assert.match(src,/kind==='frimurare'/);
  assert.match(src,/101608925/);
});

test('Hero Card Centre Pass promotes curated reference facades through the proven card pipeline',()=>{
  const src=fs.readFileSync(new URL('../city-identity.js',import.meta.url),'utf8');
  assert.match(src,/PHOTO_REFERENCE_PROFILES/);
  assert.match(src,/INNERSTAD_PROFILES/);
  assert.match(src,/HERO_CARD_BUILDINGS/);
  assert.match(src,/CENTRE PASS 1/);
  assert.match(src,/Math\.min\(13\.8,p\.width\*\.72\)/,'Grekiska must leave more of Frimurarlogen visible');
  assert.doesNotMatch(src,/fillText\('FRIMURARELOGEN · TINGVALLAGATAN 15'/,'large facade label must stay removed');
});

test('Hero Card Centre Pass launcher has one clean build cache key',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const match=html.match(/app\.js\?v=2\.11\.21([^"']*)/);
  assert.ok(match);
  assert.equal((match[1].match(/&build=/g)||[]).length,1);
  assert.match(match[1],/&build=hero-centre2/);
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


test('Haga and Bryggudden are selectable city destinations',()=>{const places=Object.fromEntries(SOUTH_PLACES.map(p=>[p.id,p]));assert.deepEqual([places.willys.x,places.willys.z],[271,413]);assert.deepEqual([places.icahaga.x,places.icahaga.z],[566,-129]);const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.match(html,/route-place-willys/);assert.match(html,/route-place-icahaga/);});

test('Klaralven and sightseeing train stay in the static city pass',()=>{const south=fs.readFileSync(new URL('../city-south.js',import.meta.url),'utf8');assert.match(south,/#2f91a5/);assert.match(south,/KARLSTAD SIGHTSEEING/);assert.match(south,/Kungsgatan: two low glass-walled outdoor seating areas/);});
