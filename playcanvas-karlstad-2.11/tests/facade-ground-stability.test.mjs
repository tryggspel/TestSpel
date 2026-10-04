import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,infillBuildings} from '../city-geography.mjs';
import {VISUAL_STREETS} from '../city-streets.mjs';
import {visualTwinStreetEdges,addVisualTwinFacade} from '../visual-twin.mjs';
import {ComicMesh,ROAD_RENDER_LEVELS} from '../city-architecture.js';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const detailed=cityBuildings(osm),all=[...detailed,...infillBuildings(osm,detailed)];

test('facade-only network includes previously missing Karlstad side streets',()=>{
  const names=new Set(VISUAL_STREETS.map(s=>s.name));
  for(const name of ['Karlbergsgatan','Södra Kyrkogatan','Herrgårdsgatan','Eneströmsgatan','Hamngatan'])assert.ok(names.has(name),name);
});

test('street-exposed side walls receive secondary facade rhythm',()=>{
  const candidates=all.filter(b=>['Karlbergsgatan','Södra Kyrkogatan','Herrgårdsgatan','Eneströmsgatan'].includes(String(b.tags?.['addr:street']||'')));
  assert.ok(candidates.length>0);
  const exposed=candidates.find(b=>visualTwinStreetEdges(b).length>=2);
  assert.ok(exposed,'at least one building on the reported side streets should expose two street faces');
  const mesh=new ComicMesh(),before=mesh.positions.length;
  assert.equal(addVisualTwinFacade(mesh,exposed,{lod:'low'}),true);
  assert.ok(mesh.positions.length-before>=72,'primary plus secondary street facade should add visible geometry');
});

test('road and pavement visual layers are separated enough to avoid mobile z-fighting',()=>{
  const ordered=[
    ROAD_RENDER_LEVELS.sidewalkBase,
    ROAD_RENDER_LEVELS.sidewalk,
    ROAD_RENDER_LEVELS.edge,
    ROAD_RENDER_LEVELS.road,
    ROAD_RENDER_LEVELS.pedestrian,
    ROAD_RENDER_LEVELS.pedestrianMid,
    ROAD_RENDER_LEVELS.seam
  ];
  for(let i=1;i<ordered.length;i++)assert.ok(ordered[i]-ordered[i-1]>=.019,'layer '+i+' separation');
  assert.ok(ROAD_RENDER_LEVELS.squareBase+.025 < ROAD_RENDER_LEVELS.square,'square base must sit below pedestrian square');
});
