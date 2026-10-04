import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,infillBuildings} from '../city-geography.mjs';
import {ComicMesh} from '../city-architecture.js';
import {PHOTO_REFERENCE_PROFILES,PHOTO_REFERENCE_IDS,photoReferenceFront,addPhotoReferenceFacade} from '../photo-reference-pass3.mjs';
import {visualTwinProfile} from '../visual-twin.mjs';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const detailed=cityBuildings(osm),all=[...detailed,...infillBuildings(osm,detailed)];

test('reference pass 3 binds only to exact photographed Karlstad addresses',()=>{
  const expected=new Map([
    [80868525,'Karlbergsgatan 3'],
    [113214352,'Karlbergsgatan 4'],
    [106078949,'Södra Kyrkogatan 7'],
    [105746439,'Södra Kyrkogatan 10']
  ]);
  assert.equal(PHOTO_REFERENCE_IDS.size,expected.size);
  for(const [id,address] of expected){
    assert.equal(PHOTO_REFERENCE_PROFILES[id]?.address,address);
    const b=all.find(x=>x.osm===id);assert.ok(b,id);
    assert.ok(photoReferenceFront(b),address+' has a real facade edge');
  }
});

test('photo references take precedence over inferred Visual Twin DNA',()=>{
  for(const id of PHOTO_REFERENCE_IDS){
    const b=all.find(x=>x.osm===id);assert.ok(b);
    assert.equal(visualTwinProfile(b),null,'no inferred facade may replace '+PHOTO_REFERENCE_PROFILES[id].address);
  }
});

test('all pass 3 reference facades produce bounded static geometry',()=>{
  for(const id of PHOTO_REFERENCE_IDS){
    const b=all.find(x=>x.osm===id),mesh=new ComicMesh();
    assert.equal(addPhotoReferenceFacade(mesh,b),true);
    assert.ok(mesh.positions.length>0);
    assert.ok(mesh.positions.every(Number.isFinite));
    assert.ok(mesh.positions.length/3<2400,'bounded geometry '+PHOTO_REFERENCE_PROFILES[id].address);
  }
});
