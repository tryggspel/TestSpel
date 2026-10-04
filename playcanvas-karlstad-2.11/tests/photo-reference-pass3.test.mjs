import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,infillBuildings} from '../city-geography.mjs';
import {ComicMesh} from '../city-architecture.js';
import {PHOTO_REFERENCE_PROFILES,PHOTO_REFERENCE_IDS,photoReferenceFront,photoReferenceFrontSegments,photoReferenceFaceYaws,addPhotoReferenceFacade} from '../photo-reference-pass3.mjs';
import {visualTwinProfile} from '../visual-twin.mjs';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const detailed=cityBuildings(osm),all=[...detailed,...infillBuildings(osm,detailed)];

test('reference pass 3 binds only to exact photographed Karlstad addresses',()=>{
  const expected=new Map([
    [80868525,'Karlbergsgatan 3'],
    [113214352,'Karlbergsgatan 4'],
    [107041950,'Karlbergsgatan 2'],
    [105746440,'Karlbergsgatan 5'],
    [386222434,'Karlbergsgatan 6'],
    [104778921,'Karlbergsgatan 7'],
    [110733732,'Östra Kyrkogatan 4'],
    [110733736,'Östra Kyrkogatan 4D'],
    [105746438,'Östra Kyrkogatan 6'],
    [102583814,'Södra Kyrkogatan 1'],
    [101935916,'Södra Kyrkogatan 3'],
    [103767833,'Södra Kyrkogatan 4'],
    [103767825,'Södra Kyrkogatan 6'],
    [106078949,'Södra Kyrkogatan 7'],
    [105746439,'Södra Kyrkogatan 10'],
    [103695891,'Södra Kyrkogatan 11'],
    [100833292,'Tingvallagatan 9'],
    [100839528,'Tingvallagatan 11'],
    [101430152,'Tingvallagatan 13'],
    [101608925,'Tingvallagatan 15'],
    [77107220,'Stora Torget / Kungsgatan'],
    [106078938,'Tingvallagatan 19,21,23']
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


test('Street View reference batch is materially varied rather than one generic facade',()=>{
  const kinds=new Set(Object.values(PHOTO_REFERENCE_PROFILES).map(p=>p.kind));
  assert.ok(kinds.size>=12,'expected many distinct reference kinds');
  const streetView=Object.values(PHOTO_REFERENCE_PROFILES).filter(p=>String(p.source).includes('Google Street View'));
  assert.ok(streetView.length>=12,'first automated Street View batch should be present');
});


test('Stora Torget south side is reference-driven from OLearys through the old bookshop',()=>{
  const row=[
    [100833292,'ting9bergqvist'],
    [100839528,'ting11merchant'],
    [101430152,'wermlandsbanken'],
    [101608925,'frimurarebok']
  ];
  for(const [id,kind] of row){
    assert.equal(PHOTO_REFERENCE_PROFILES[id]?.kind,kind);
    assert.equal(PHOTO_REFERENCE_PROFILES[id]?.front,'north');
    const b=all.find(x=>x.osm===id);assert.ok(b,'OSM building '+id);
    const mesh=new ComicMesh();
    assert.equal(addPhotoReferenceFacade(mesh,b),true);
    assert.ok(mesh.positions.length/3>120,'Torget facade should contain real architectural detail: '+id);
  }
});

test('Wermlandsbanken and Frimurarelogen have distinct architectural signatures',()=>{
  const bank=PHOTO_REFERENCE_PROFILES[101430152],book=PHOTO_REFERENCE_PROFILES[101608925],olearys=PHOTO_REFERENCE_PROFILES[100833292];
  assert.equal(bank.name,'Wermlandsbanken');
  assert.match(book.name,/Herman Anderssons bokhandel/);
  assert.match(olearys.name,/O'Learys/);
  assert.notEqual(bank.wall,book.wall);
  assert.notEqual(olearys.kind,bank.kind);
});


test('Torget hero facades span the full split OSM frontage like Kungsgatan',()=>{
  const expectedMin=new Map([
    [100833292,30],
    [100839528,24],
    [101430152,24],
    [101608925,38]
  ]);
  for(const [id,minLength] of expectedMin){
    const b=all.find(x=>x.osm===id);assert.ok(b,'OSM building '+id);
    const front=photoReferenceFront(b);assert.ok(front,'front '+id);
    assert.ok(front.length>=minLength,PHOTO_REFERENCE_PROFILES[id].address+' frontage '+front.length.toFixed(1)+'m < '+minLength+'m');
    assert.ok((front.segments||1)>=2,PHOTO_REFERENCE_PROFILES[id].address+' should merge split OSM segments');
  }
});


test('Tingvallagymnasiet is a real yellow-brick hero facade, not generic office DNA',()=>{
  const p=PHOTO_REFERENCE_PROFILES[77107220];
  assert.equal(p?.kind,'tingvalla-school');
  assert.equal(p?.front,'north');
  const b=all.find(x=>x.osm===77107220);assert.ok(b);
  const fronts=photoReferenceFrontSegments(b,'north',8).filter(e=>e.length>=5);
  const total=fronts.reduce((sum,e)=>sum+e.length,0);
  assert.ok(fronts.length>=2,'school should use multiple north-facing OSM segments');
  assert.ok(total>80,'school north frontage total '+total);
  const mesh=new ComicMesh();assert.equal(addPhotoReferenceFacade(mesh,b),true);
  assert.ok(mesh.positions.length/3>180);
});

test('Tingvallagatan 19-23 gets a reference-driven active retail ground floor',()=>{
  const p=PHOTO_REFERENCE_PROFILES[106078938];
  assert.equal(p?.kind,'ting19shops');
  const b=all.find(x=>x.osm===106078938);assert.ok(b);
  const front=photoReferenceFront(b);assert.ok(front&&front.length>45);
  const mesh=new ComicMesh();assert.equal(addPhotoReferenceFacade(mesh,b),true);
  assert.ok(mesh.positions.length/3>180);
});

test('Frimurarelogen protects and renders both verified north and west facades',()=>{
  assert.deepEqual(photoReferenceFaceYaws(101608925).sort((a,b)=>a-b),[-90,180]);
  const b=all.find(x=>x.osm===101608925);assert.ok(b);
  const north=photoReferenceFront(b,'north'),west=photoReferenceFront(b,'west');
  assert.ok(north&&north.length>35,'north bookshop frontage');
  assert.ok(west&&west.length>20,'west arched side frontage');
  const mesh=new ComicMesh();assert.equal(addPhotoReferenceFacade(mesh,b),true);
  assert.ok(mesh.positions.length/3>500,'3D hero geometry should be substantial on both faces');
  const xs=[],zs=[];for(let i=0;i<mesh.positions.length;i+=3){xs.push(mesh.positions[i]);zs.push(mesh.positions[i+2]);}
  assert.ok(Math.min(...zs)<b.minz-.50,'north hero details must project visibly in front of the wall');
  assert.ok(Math.min(...xs)<b.minx-.50,'west hero details must project visibly in front of the wall');
});
