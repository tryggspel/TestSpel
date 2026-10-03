import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings} from '../city-geography.mjs';
import {ComicMesh} from '../city-architecture.js';
import {facadePanels} from '../comic-city.js';
import {INNERSTAD_PROFILES,INNERSTAD_REFERENCE_IDS,referenceFront,referenceFaceYaw,addInnerstadFacade} from '../innerstad-reference.mjs';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const buildings=cityBuildings(osm);
const targets=buildings.filter(b=>INNERSTAD_REFERENCE_IDS.has(b.osm));
const desired={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]};

test('first inner-city reference batch binds to five real OSM address buildings',()=>{
  assert.equal(targets.length,5);
  for(const b of targets){
    const p=INNERSTAD_PROFILES[b.osm];
    assert.equal(p.address,b.tags['addr:street']+' '+b.tags['addr:housenumber']);
  }
  assert.ok(targets.some(b=>b.osm===104396327),'Drottninggatan 19 must stay inside the 95-building detail budget');
});

test('reference fronts face their real street side and generate bounded static geometry',()=>{
  for(const b of targets){
    const p=INNERSTAD_PROFILES[b.osm],edge=referenceFront(b),d=desired[p.front];
    assert.ok(edge,p.address);
    assert.ok(edge.nx*d[0]+edge.nz*d[1]>.92,p.address+' outward normal');
    const mesh=new ComicMesh();assert.equal(addInnerstadFacade(mesh,b),true);
    assert.ok(mesh.positions.every(Number.isFinite));
    for(let i=0;i<mesh.positions.length;i+=3)assert.ok(mesh.positions[i+1]>=0&&mesh.positions[i+1]<=b.h+.02,p.address+' y range');
    assert.ok(mesh.indices.length/3<1800,p.address+' triangle budget');
  }
});

test('generic comic facades cannot cover the five hand-built street fronts',()=>{
  for(const b of targets){
    const p=INNERSTAD_PROFILES[b.osm],yaw=referenceFaceYaw(b.osm),ps=facadePanels([{...b,height:b.h}]);
    const normal=yaw===0?[0,1]:yaw===180?[0,-1]:yaw===90?[1,0]:[-1,0];
    assert.ok(ps.length>0,p.address);
    assert.ok(ps.every(q=>q.nx*normal[0]+q.nz*normal[1]<.9),INNERSTAD_PROFILES[b.osm].address);
  }
});
