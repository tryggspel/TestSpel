// Render-routing guard (2.11.22): varje kurerad fasadprofil måste nå skärmen,
// ingen annan renderare får rita över den, och alla moduler ska dela en cache-nyckel.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const v=fs.readFileSync(path.join(root,'build-info.mjs'),'utf8').match(/GAME_VERSION='([^']+)'/)[1];
const imp=f=>import(path.join(root,f)+'?v='+v);

const KNOWN_EXCLUDED={ // medvetna undantag — måste ha en anledning
  107041955:'Mitt i City-vägg med entréöppningar (mall-logik)',106078938:'Mitt i City-vägg med entréöppningar (mall-logik)',
  77107220:'Tingvallagymnasiet har egen handbyggd arkitektur i city-south.js',80868525:'Home Hotel Bilan har egen handbyggd arkitektur i city-south.js'};

async function load(){
  const [A,G,C,K,P,SS]=await Promise.all(['city-architecture.js','city-geography.mjs','comic-city.js','kungsgatan-reference.mjs','photo-reference-pass3.mjs','city-south-space.mjs'].map(imp));
  const osm=JSON.parse(fs.readFileSync(path.join(root,'data/osm-buildings.json')));
  const adm=G.cityBuildings(osm,95);
  return {A,C,K,P,SS,adm,contour:new Set(A.coreContourBuildings(adm).map(b=>b.osm)),admitted:new Map(adm.map(b=>[b.osm,b]))};
}
const ctx=load();

test('alla lokala modul-/CSS-importer använder en enda cache-nyckel ?v=<GAME_VERSION>',()=>{
  const keys=new Map();
  for(const f of fs.readdirSync(root).filter(f=>/\.(m?js|html)$/.test(f)))
    for(const m of fs.readFileSync(path.join(root,f),'utf8').matchAll(/\.\/[\w.-]+\.(?:m?js|css)(\?[^'"\s)]*)/g))keys.set(m[1],(keys.get(m[1])||0)+1);
  assert.deepEqual([...keys.keys()],['?v='+v],'blandade nycklar ger dubbla modulinstanser/gammal cache: '+JSON.stringify(Object.fromEntries(keys)));
});

test('varje kurerad profil ritas via Kungsgatan-vägen (eller är ett dokumenterat undantag)',async()=>{
  const {A,K,P,contour,admitted}=await ctx;
  const curated=new Map();
  for(const [src,o] of [['Kungsgatan',K.KUNGSGATAN_PROFILES],['Foto/Street View',P.PHOTO_REFERENCE_PROFILES],['Torget-audit',A.TORGET_AUDIT_PROFILES]])
    for(const id of Object.keys(o))curated.set(+id,src);
  assert.ok(curated.size>0);
  const fail=[];
  for(const [id,src] of curated){
    const b=admitted.get(id),name=(b?.name||A.TORGET_AUDIT_PROFILES[id]?.name||'')+` (${src})`;
    if(!b)fail.push(`${id} ${name}: inte bland de 95 inlästa husen`);
    else if(!contour.has(id)&&!KNOWN_EXCLUDED[id])fail.push(`${id} ${name}: profilen når aldrig skärmen`);
  }
  assert.deepEqual(fail,[]);
});

test('ingen fasad ritas både av city-south och stadsmeshen',async()=>{
  const {A,SS,contour,admitted}=await ctx;
  const dup=[...contour].filter(id=>SS.SOUTH_IDS.has(id)&&!A.curatedRoute(admitted.get(id)));
  assert.deepEqual(dup,[]);
});

test('inga gamla serietexturkort ligger över Torget-audit-fasader',async()=>{
  const {A,C,adm}=await ctx;
  const panels=C.facadePanels(adm.map(b=>({...b,height:b.h})),()=>false);
  assert.deepEqual([...new Set(panels.filter(p=>A.TORGET_AUDIT_IDS.has(p.osm)).map(p=>p.osm))],[]);
});

test('Frimurarelogen/Grekiska ritas av fotoreferensen, inte som generisk sydlåda',async()=>{
  const {A,adm,contour}=await ctx;
  const frim=adm.find(b=>b.osm===101608925);
  assert.ok(frim,'Frimurarelogen saknas bland inlästa hus');
  assert.ok(A.curatedRoute(frim));
  assert.ok(contour.has(101608925));
});

test('2.11.23 sidoväggar: Twin/kurerade hus får Kungsgatan-fönster på blanka sidor, Kungsgatan och Torget orörda',async()=>{
  const {A,adm,K}=await ctx;
  const G=await imp('city-geography.mjs');
  const osm=JSON.parse(fs.readFileSync(path.join(root,'data/osm-buildings.json')));
  const all=adm.concat(G.infillBuildings(osm,adm));
  for(const id of Object.keys(K.KUNGSGATAN_PROFILES))assert.equal(A.sideWallFaces(adm.find(b=>b.osm===+id),all).length,0,'Kungsgatan '+id+' får inte ändras');
  for(const id of A.TORGET_AUDIT_IDS){const b=adm.find(x=>x.osm===id);if(b)assert.equal(A.sideWallFaces(b,all).length,0);}
  assert.equal(A.sideWallFaces(adm.find(b=>b.osm===101608925),all).length,0,'Frimurarelogen behåller sin egen fasad');
  const covered=A.coreContourBuildings(adm).filter(b=>A.sideWallFaces(b,all).length);
  assert.ok(covered.length>=10,'minst tio stadskärnehus ska få sidofasader, fick '+covered.length);
  for(const b of covered)for(const f of A.sideWallFaces(b,all))assert.ok(f.length>=6);
  const m=new A.ComicMesh();const n=A.addSideWallFacades(m,covered[0],{neighbours:all});
  assert.ok(n>0&&m.positions.length>0);
});
