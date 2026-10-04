import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,infillBuildings} from '../city-geography.mjs';
import {ComicMesh,infillMesh,meshChunkRanges} from '../city-architecture.js';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const detailed=cityBuildings(osm),infill=infillBuildings(osm,detailed);

test('large static city meshes are split well below the 16-bit vertex limit',()=>{
  const ranges=meshChunkRanges(130005);
  assert.ok(ranges.length>=3);
  assert.equal(ranges[0][0],0);
  assert.equal(ranges.at(-1)[1],130005);
  for(const [start,end] of ranges){
    assert.equal(start%3,0);assert.equal(end%3,0);
    assert.ok(end-start<=48000);
  }
});

test('real infill geometry always receives safe chunk ranges',()=>{
  const mesh=infillMesh(infill,new ComicMesh()),vertices=mesh.positions.length/3,ranges=meshChunkRanges(vertices);
  assert.ok(vertices>0);
  assert.equal(ranges.reduce((n,[a,b])=>n+(b-a),0),vertices);
  assert.ok(ranges.every(([a,b])=>b-a<=48000));
});

test('runtime colliders preserve the geometry fields Visual Twin needs',()=>{
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/tags:b\.tags,cx:b\.cx,cz:b\.cz,dist:b\.dist,area:b\.area,sx:b\.sx,sz:b\.sz,h:b\.h,height:b\.h/);
});
