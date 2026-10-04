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

test('Visual Twin never replaces curated Kungsgatan or innerstad facades',()=>{
  for(const b of buildings.filter(b=>KUNGSGATAN_PROFILES[b.osm]||INNERSTAD_REFERENCE_IDS.has(b.osm))){
    assert.equal(visualTwinProfile(b),null);
    assert.equal(visualTwinFront(b),null);
    const mesh=new ComicMesh();assert.equal(addVisualTwinFacade(mesh,b),false);
  }
});

test('photo-reference buildings keep verified fronts while Visual Twin rescues other exposed walls',()=>{
  const all=[...buildings,...infill];
  for(const id of [101935916,100833292,101608925]){
    const b=all.find(x=>x.osm===id);assert.ok(b,'photo building '+id);
    assert.equal(visualTwinProfile(b),null,'public inferred profile must stay hidden for '+id);
    assert.equal(visualTwinFront(b),null,'verified primary front must stay reference-owned for '+id);
    const mesh=new ComicMesh();
    assert.equal(addVisualTwinFacade(mesh,b,{neighbours:all}),true,'secondary rescue facade '+id);
    assert.ok(mesh.positions.length>0,'secondary rescue geometry '+id);
    assert.ok(mesh.positions.every(Number.isFinite),'finite rescue geometry '+id);
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


test('fallback facades follow real OSM edges and cover large commercial blocks',()=>{
  const all=[...buildings,...infill].map(b=>({...b,height:b.h}));
  const panels=facadePanels(all);
  const mall=panels.filter(p=>p.osm===234271401);
  assert.ok(mall.length>0,'Mitt i City exterior must not be a blank slab');
  const duvan=panels.filter(p=>p.osm===102190062);
  assert.ok(duvan.length>0,'Duvan secondary walls must receive facade coverage');
  const ahlens=panels.filter(p=>p.osm===102026709);
  assert.ok(ahlens.length>0,'Åhléns secondary walls must receive facade coverage');

  const olearys=panels.filter(p=>p.osm===100833292);
  assert.ok(olearys.length>0,'O’Learys block must receive fallback facade coverage');
  const directions=new Set(olearys.map(p=>Math.round((p.edgeYaw||0)/10)*10));
  assert.ok(directions.size>=2,'long O’Learys block should be covered on more than one exposed direction');
});

test('photo-curated primary fronts stay clean while secondary walls can be filled',()=>{
  const all=[...buildings,...infill].map(b=>({...b,height:b.h}));
  const panels=facadePanels(all);
  const eastYaw=90;
  const blind=panels.filter(p=>p.osm===101935916);
  assert.ok(blind.length>0,'Södra Kyrkogatan 3 may receive secondary-side coverage');
  const diff=a=>Math.abs((((a-eastYaw)+540)%360)-180);
  assert.ok(blind.every(p=>diff(p.edgeYaw)>34),'the verified east blind-brick facade stays owned by Street View geometry');
});
