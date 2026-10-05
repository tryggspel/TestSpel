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

import {completeBlankWalls,missingWallFaces,auditSideFaces,infillWindowsMesh,infillMesh} from '../city-architecture.js';
import {visualTwinFront} from '../visual-twin.mjs';

test('the blank-wall safety net never touches the approved Kungsgatan houses',()=>{
  const locked=all.filter(b=>KUNGSGATAN_PROFILES[b.osm]);
  assert.equal(locked.length,3);
  const mesh=new ComicMesh();
  assert.equal(completeBlankWalls(mesh,locked,{neighbours:all}),0);
  assert.equal(mesh.positions.length,0);
  for(const b of locked){assert.deepEqual(missingWallFaces(b,all),[]);assert.deepEqual(auditSideFaces(b,all),[]);}
});

test('missing-wall pass never repaints the edge Visual Twin already draws',()=>{
  const same=(e,f)=>{const eq=(p,q)=>Math.abs(p[0]-q[0])<.02&&Math.abs(p[1]-q[1])<.02;return (eq(e.a,f.a)&&eq(e.q,f.q))||(eq(e.a,f.q)&&eq(e.q,f.a));};
  let checked=0;
  for(const b of infill){const front=visualTwinFront(b);if(!front)continue;checked++;assert.ok(!missingWallFaces(b,all,'high').some(f=>same(f,front)),'front repainted: '+b.osm);}
  assert.ok(checked>50);
});

test('blank-wall safety net is idempotent and the infill window batch stays chunkable',()=>{
  const base=infillMesh(infill,undefined,admitted),windows=infillWindowsMesh(infill,undefined,admitted,[base]);
  assert.ok(windows.positions.length>0);
  assert.equal(completeBlankWalls(windows,infill,{neighbours:all,reference:[base],lod:'low'}),0,'a second run finds nothing left to paint');
  assert.ok(base.positions.length/3<65535,'base infill keeps the 16-bit budget');
});

test('a wall above a lower neighbour is free, beside an equally tall neighbour it is a party wall',()=>{
  // VT16 is listed with its west wall; place a neighbour right against that wall.
  const b={osm:103695873,h:12.8,area:300,sx:10,sz:10,cx:0,cz:0,polygon:[[-5,-5],[5,-5],[5,5],[-5,5]],dist:100};
  const west={osm:2,h:3.2,area:300,sx:10,sz:10,cx:-10.2,cz:0,polygon:[[-15,-5],[-5.2,-5],[-5.2,5],[-15,5]]};
  assert.equal(gapFaces(b,[{...west}]).length,1,'low neighbour leaves the wall free');
  assert.equal(gapFaces(b,[{...west,h:12.8}]).length,0,'tall neighbour makes it a party wall');
});
