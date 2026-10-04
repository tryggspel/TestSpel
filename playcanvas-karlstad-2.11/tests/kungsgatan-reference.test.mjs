import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings} from '../city-geography.mjs';
import {ComicMesh,coreContourBuildings} from '../city-architecture.js';
import {facadePanels} from '../comic-city.js';
import {KUNGSGATAN_PROFILES,kungsgatanFront,addKungsgatanFacade,addKungsgatanTerraces} from '../kungsgatan-reference.mjs';
const buildings=cityBuildings(JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url))));
const targets=buildings.filter(b=>KUNGSGATAN_PROFILES[b.osm]);

test('reference facades bind to all three actual address contours and face the square',()=>{
  assert.equal(targets.length,3);
  const contours=new Set(coreContourBuildings(buildings).map(b=>b.osm));
  for(const b of targets){
    assert.ok(contours.has(b.osm));
    assert.equal(KUNGSGATAN_PROFILES[b.osm].address,b.tags['addr:street']+' '+b.tags['addr:housenumber']);
    const edge=kungsgatanFront(b);assert.ok(edge.nz>.99);
    assert.ok(Math.abs(edge.a[1]-b.maxz)<2&&Math.abs(edge.q[1]-b.maxz)<2);
    const mesh=new ComicMesh();assert.equal(addKungsgatanFacade(mesh,b),true);
    assert.ok(mesh.positions.every(Number.isFinite));
    for(let i=0;i<mesh.normals.length;i+=3)assert.ok(mesh.normals[i+2]>.99,'front triangles must face south');
    for(let i=0;i<mesh.positions.length;i+=3){assert.ok(mesh.positions[i+1]>=0&&mesh.positions[i+1]<=b.h);}
    // Avoid per-window box geometry and retain a bounded static mesh budget.
    assert.ok(mesh.indices.length/3<700);
  }
});

test('generic artwork cannot cover the reference front, but still covers other sides',()=>{
  for(const b of targets){
    const ps=facadePanels([{...b,height:b.h}]);
    assert.ok(ps.length>0);assert.ok(ps.every(p=>p.nz<.9),'generic artwork must stay off the south reference front');
    assert.ok(ps.some(p=>p.nz<-.55),'north/side walls still receive fallback artwork');
  }
});

test('terraces leave the street axis and the central crossing open',()=>{
  const mesh=new ComicMesh();addKungsgatanTerraces(mesh);
  for(let i=0;i<mesh.positions.length;i+=3){
    const x=mesh.positions[i],z=mesh.positions[i+2];
    assert.ok(z>=-43&&z<=-37,'stay on the square side of Kungsgatan');
    assert.ok(x<-17||x>11,'leave the central crossing free');
  }
  assert.ok(mesh.indices.length/3<1500);
});
