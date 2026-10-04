import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,infillBuildings} from '../city-geography.mjs';
import {ComicMesh} from '../city-architecture.js';
import {visualTwinGroundMode,visualTwinExposedEdges,addVisualTwinFacade} from '../visual-twin.mjs';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const detailed=cityBuildings(osm),infill=infillBuildings(osm,detailed),all=[...detailed,...infill];

test('Karlstad uses several deterministic ground-floor archetypes instead of one generic base',()=>{
  const modes=new Set(all.map(visualTwinGroundMode).filter(m=>m&&m!=='none'));
  assert.ok(modes.size>=5,'expected at least five lower-facade modes, got '+[...modes].join(', '));
  for(const required of ['retail','residential','office','mixed'])assert.ok(modes.has(required),required);
});

test('low-LOD buildings can decorate multiple exposed walls without becoming dynamic',()=>{
  const b=infill.find(x=>visualTwinExposedEdges(x,all).length>=2);
  assert.ok(b,'need a real infill building with multiple exposed walls');
  const mesh=new ComicMesh();
  assert.equal(addVisualTwinFacade(mesh,b,{lod:'low',neighbours:all}),true);
  assert.ok(mesh.positions.length/3>80,'low LOD should contain primary plus exposed-wall detail');
  assert.ok(mesh.positions.every(Number.isFinite));
});

test('ground-floor mode is stable for the same OSM building',()=>{
  const sample=all.find(b=>visualTwinGroundMode(b)!=='none');
  assert.ok(sample);
  assert.equal(visualTwinGroundMode(sample),visualTwinGroundMode(sample));
});
