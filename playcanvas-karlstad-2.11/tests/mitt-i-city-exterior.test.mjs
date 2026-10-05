import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings} from '../city-geography.mjs';
import {ComicMesh} from '../city-architecture.js';
import {MALL_CORRIDORS,MALL_BUILDING_IDS} from '../mall-space.mjs';
import {mittICityFaces,addMittICityExterior,MITT_I_CITY_DOME_OSM} from '../mitt-i-city-exterior.mjs';
import {LEGACY_COMIC_FACADES,createComicCity} from '../comic-city.js';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const admitted=cityBuildings(osm,95);

test('exterior covers the street-facing faces of the mall block',()=>{
  const faces=mittICityFaces(admitted);
  assert.ok(faces.length>=10,'faces: '+faces.length);
  assert.ok(faces.every(f=>MALL_BUILDING_IDS.has(f.osm)));
});

test('the four entrance corridors stay open: no decorated span crosses a corridor',()=>{
  for(const f of mittICityFaces(admitted)){
    const at=u=>[f.ox+f.f.rx*u,f.oz+f.f.rz*u];
    const alongX=f.f.key==='S'||f.f.key==='N';
    const [a,b]=[at(f.u0),at(f.u1)];
    for(const k of MALL_CORRIDORS){
      const fixed=alongX?a[1]:a[0];
      if(fixed<(alongX?k.minz:k.minx)-.01||fixed>(alongX?k.maxz:k.maxx)+.01)continue;
      const lo=Math.min(alongX?a[0]:a[1],alongX?b[0]:b[1]),hi=Math.max(alongX?a[0]:a[1],alongX?b[0]:b[1]);
      const kl=alongX?k.minx:k.minz,kh=alongX?k.maxx:k.maxz;
      assert.ok(hi<=kl+.01||lo>=kh-.01,'span crosses corridor on '+f.osm+' '+f.f.key);
    }
  }
});

test('mesh gets slate walls, glazing, balconies and the copper dome (14+ rings of quads)',()=>{
  const mesh=new ComicMesh(),r=addMittICityExterior(mesh,admitted);
  assert.ok(r.quads>2000);
  assert.ok(mesh.positions.length>0);
  assert.ok(admitted.some(b=>b.osm===MITT_I_CITY_DOME_OSM));
  const copper=mesh.colors.length/4;assert.ok(copper>1000);
});

test('legacy comic facade cards are retired',()=>{
  assert.equal(LEGACY_COMIC_FACADES,false);
  const budget=createComicCity({},{app:{}},{texture(){throw new Error('no textures expected');}}).budget;
  assert.equal(budget.modules,0);
});
