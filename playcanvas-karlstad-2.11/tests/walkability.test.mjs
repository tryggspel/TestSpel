import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BRIDGES,registerBridges,onBridge} from '../bridges.mjs';
import {onParkPath,waterBlocked} from '../park-space.mjs';
import {PARK_PATHS} from '../city-sites.mjs';
import {cityPoint} from '../city-geography.mjs';

const proj=g=>g.map(p=>{const q=cityPoint(p.lon,p.lat);return [q.x,q.z];});
const roads=[];
for(const e of JSON.parse(fs.readFileSync(new URL('../data/osm-roads.json',import.meta.url))).elements)roads.push({tags:e.tags,points:proj(e.geometry)});
for(const a of ['haga','hamn'])for(const e of JSON.parse(fs.readFileSync(new URL(`../data/osm-outer-${a}.json`,import.meta.url))).roads)roads.push({tags:e.tags,points:proj(e.geometry)});
BRIDGES.length=0;registerBridges(roads.filter(r=>r.tags&&r.tags.bridge));

test('named bridges are registered and walkable, rail bridges are not',()=>{
  assert.ok(BRIDGES.length>=15,'bridges: '+BRIDGES.length);
  for(const name of ['Hagabron','Götgatsbron','Västra bron','Tingvallabron','Gubbholmsbron']){
    const b=BRIDGES.find(x=>x.name===name);assert.ok(b,'missing '+name);
    const mid=b.points[Math.floor(b.points.length/2)];assert.equal(onBridge(mid[0],mid[1]),true,name+' midpoint');
  }
  assert.ok(!BRIDGES.some(b=>b.name==='Värmlandsbanan'),'railway bridges stay closed to walkers');
  assert.equal(onBridge(5000,5000),false);
});

test('the park paths that run out over the water are walkable, including the museum side of Sandgrundsudden',()=>{
  const path=PARK_PATHS.find(p=>p.osm===33522431);assert.ok(path);
  const [x,z]=path.points[Math.floor(path.points.length/2)];
  assert.equal(onParkPath(x,z),true);assert.equal(waterBlocked(x,z),false,'boardwalk over water must not count as water');
  assert.equal(onParkPath(x+40,z+40),false);
});

test('the museum collider follows the real footprint instead of a 7 800 m² rectangle',()=>{
  const src=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(src,/\[77107220,100024120,100024325,1151016\]\.includes\(b\.osm\)/);
  assert.match(src,/&&!onBridge\(x,z\)\)return true/);
});
