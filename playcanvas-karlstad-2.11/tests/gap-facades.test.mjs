import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,infillBuildings} from '../city-geography.mjs';
import {GAP_FACADES,gapFaces,addGapFacades,ComicMesh} from '../city-architecture.js';
import {KUNGSGATAN_PROFILES} from '../kungsgatan-reference.mjs';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const admitted=cityBuildings(osm,95),infill=infillBuildings(osm,admitted),all=[...admitted,...infill];
const byId=id=>all.find(b=>b.osm===id);

test('gap facades never list the approved Kungsgatan 14/16/18 houses',()=>{
  for(const id of Object.keys(KUNGSGATAN_PROFILES))assert.equal(GAP_FACADES[id],undefined,'locked house listed: '+id);
  for(const id of Object.keys(KUNGSGATAN_PROFILES)){const b=byId(Number(id));if(b)assert.deepEqual(gapFaces(b,all),[]);}
});

test('every listed gap building exists and gets at least one window wall',()=>{
  for(const id of Object.keys(GAP_FACADES)){
    const b=byId(Number(id));assert.ok(b,'missing building '+id);
    const mesh=new ComicMesh(),n=addGapFacades(mesh,b,{neighbours:all,lod:'low'});
    assert.ok(n>0,id+' has no exposed wall to fill');assert.ok(mesh.positions.length>0);
  }
});

test('gap facades only face the listed directions and skip party walls',()=>{
  const b=byId(103695873),faces=gapFaces(b,all);
  assert.ok(faces.length>=1);
  for(const f of faces)assert.ok(Math.abs(((f.yaw+90)%360+540)%360-180)<=40,'only the west wall is listed for VT16');
});
