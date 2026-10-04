import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,infillBuildings} from '../city-geography.mjs';
import {ComicMesh,coreContourBuildings} from '../city-architecture.js';
import {facadePanels} from '../comic-city.js';
import {KUNGSGATAN_PROFILES} from '../kungsgatan-reference.mjs';
import {INNERSTAD_REFERENCE_IDS} from '../innerstad-reference.mjs';
import {PHOTO_REFERENCE_IDS} from '../photo-reference-pass3.mjs';
import {visualTwinProfile,visualTwinFront,visualTwinFaceYaw,addVisualTwinFacade,visualTwinAudit} from '../visual-twin.mjs';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const buildings=cityBuildings(osm);
const infill=infillBuildings(osm,buildings);

test('Visual Twin never replaces curated Street View/reference facades',()=>{
  for(const b of buildings.filter(b=>KUNGSGATAN_PROFILES[b.osm]||INNERSTAD_REFERENCE_IDS.has(b.osm)||PHOTO_REFERENCE_IDS.has(b.osm))){
    assert.equal(visualTwinProfile(b),null);
    assert.equal(visualTwinFront(b),null);
    const mesh=new ComicMesh();assert.equal(addVisualTwinFacade(mesh,b),false);
  }
});

test('ordinary centre buildings receive deterministic street DNA and bounded facade geometry',()=>{
  const ordinary=coreContourBuildings(buildings).filter(b=>!KUNGSGATAN_PROFILES[b.osm]&&!INNERSTAD_REFERENCE_IDS.has(b.osm)&&!PHOTO_REFERENCE_IDS.has(b.osm));
  let generated=0;
  for(const b of ordinary){
    const p=visualTwinProfile(b),edge=visualTwinFront(b);assert.ok(p);assert.equal(p.surveyStatus,'inferred');
    if(!edge)continue;
    generated++;const mesh=new ComicMesh();assert.equal(addVisualTwinFacade(mesh,b),true);
    assert.ok(mesh.positions.every(Number.isFinite));
    assert.ok(mesh.indices.length/3<1500,'bounded triangle budget for '+b.osm);
  }
  assert.ok(generated>=Math.max(20,Math.floor(ordinary.length*.45)),'most remaining core generic houses should get a street-facing twin: '+generated+'/'+ordinary.length);
});

test('generic comic texture cannot cover the generated primary street facade',()=>{
  const sample=coreContourBuildings(buildings).find(b=>!KUNGSGATAN_PROFILES[b.osm]&&!INNERSTAD_REFERENCE_IDS.has(b.osm)&&!PHOTO_REFERENCE_IDS.has(b.osm)&&visualTwinFaceYaw(b)!==null);
  assert.ok(sample);
  const yaw=visualTwinFaceYaw(sample),panels=facadePanels([{...sample,height:sample.h}]);
  assert.ok(panels.length>0);
  assert.ok(panels.every(p=>p.yaw!==yaw),'generic front must stay off the Visual Twin face');
});

test('audit distinguishes curated, generated and unresolved buildings without changing collision data',()=>{
  const all=[...buildings,...infill],audit=visualTwinAudit(all);
  assert.ok(audit.curated>=19);
  assert.ok(audit.generated>audit.curated);
  assert.equal(audit.total,audit.curated+audit.generated+audit.unresolved);
  for(const b of all)assert.ok(Array.isArray(b.polygon)&&Number.isFinite(b.minx)&&Number.isFinite(b.maxx));
});
