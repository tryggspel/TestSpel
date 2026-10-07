import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney} from '../journey-rules.mjs';
import {ComicMesh} from '../city-architecture.js';
import {cityPoint} from '../city-geography.mjs';
import {buildOuterModel,OUTER_AREAS} from '../outer-city.js';
import {BAY_WEST,BAY_EAST,SHORE_E,SHORE_W,shoreE,shoreW,pointIn,inOrrWater,TRADGARD,TRADGARD_BEDS,HAMN_BEDS,NEW_TREASURES,NEW_THERMOS,SITE_CHALLENGES,ORR_SIGNS,bryggEdges} from '../orrholmen-places.mjs';
import {FX_THERMOS,TREASURES,ALBUM_AREAS,areaOf} from '../explore-places.mjs';
import {drawWater,drawOrrholmen,drawTradgard,drawBryggudden,drawStation,nearTradgardPath,rbox,gardenPolygons} from '../orrholmen.js';
import {footprintContains} from '../city-south-space.mjs';

const read=n=>JSON.parse(fs.readFileSync(new URL('../data/osm-outer-'+n+'.json',import.meta.url)));
const proj=g=>g.map(p=>{const q=cityPoint(p.lon,p.lat);return [q.x,q.z];});
const nav=new CityNavigation(),mall={x:-135,z:98};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-135,z:55,name:'Rädda fikat'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
const clean=()=>{const g=new CityJourney(nav,mall,portals,storage());g.rush.start('clean');g.drainEvents();return g;};
const step=(g,p,dt=.1)=>{g.step(dt,{x:p.x,z:p.z,y:p.y??1.68},{x:0,z:-1});return g.drainEvents();};
const spans=(poly,z)=>{const xs=[];for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z))xs.push(xi+(z-zi)*(xj-xi)/(zj-zi));}xs.sort((a,b)=>a-b);return xs;};

test('Orrholmen: datafilen har samma form som de andra utdragen och uppger ärligt att den är handritad',()=>{
  assert.ok(OUTER_AREAS.includes('orrholmen'));
  const d=read('orrholmen');
  for(const k of ['area','bbox','source','buildings','roads','environment','trees'])assert.ok(k in d,k);
  assert.match(d.source,/Handritad/);assert.match(d.source,/Inte OpenStreetMap/i);
  const ids=[...d.buildings,...d.roads,...d.environment,...d.trees].map(e=>e.id);assert.equal(new Set(ids).size,ids.length,'unika id:n');
  assert.ok(d.buildings.length>=30&&d.roads.length>=12&&d.trees.length>=150);
  for(const e of d.environment)assert.ok(e.geometry.length>=4,'polygon');
  const water=d.environment.filter(e=>e.tags.natural==='water');assert.equal(water.length,2);
});

test('Orrholmen: inga byggnader eller träd i vattnet, och inget överlappar riktiga OSM-byggnader',()=>{
  const d=read('orrholmen'),mine=d.buildings.map(b=>({id:b.id,poly:proj(b.geometry)}));
  const others=[];for(const a of ['hamn','marieberg','haga'])for(const b of read(a).buildings)others.push(proj(b.geometry));
  const main=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));for(const e of main.elements||[])if(e.geometry)others.push(proj(e.geometry));
  for(const m of mine){
    const c=[m.poly.reduce((a,p)=>a+p[0],0)/m.poly.length,m.poly.reduce((a,p)=>a+p[1],0)/m.poly.length];
    assert.equal(inOrrWater(c[0],c[1]),false,'i vatten: '+m.id);for(const p of m.poly)assert.equal(inOrrWater(p[0],p[1]),false,'hörn i vatten: '+m.id);
    for(const o of others)assert.ok(!(pointIn(c[0],c[1],o)||o.some(p=>pointIn(p[0],p[1],m.poly))),'överlappar OSM-byggnad: '+m.id);
  }
  for(const t of d.trees){const q=cityPoint(t.lon,t.lat);assert.equal(inOrrWater(q.x,q.z),false,'träd i vatten');assert.ok(!mine.some(m=>pointIn(q.x,q.z,m.poly)),'träd i byggnad');}
});

test('Vattnet: viken är bred nog att tydligt skilja Orrholmen från Marieberg, och östra stranden följer OSM-stigen Orrholmsrundan',()=>{
  for(const z of [760,900,1000,1100,1200,1300]){
    const xs=spans(BAY_WEST,z);assert.ok(xs.length>=2,'vatten på z='+z);
    assert.ok(xs.at(-1)-xs[0]>=300,'minst 300 m vatten på z='+z+': '+Math.round(xs.at(-1)-xs[0]));
  }
  // Marieberg-sidan: landningen i Mariebergsskogen (−778,1321) och bryggparken ligger på land.
  assert.equal(inOrrWater(-778,1321),false);assert.equal(inOrrWater(-826,1321),false);assert.equal(inOrrWater(-141,1000),false,'Orrholmens mitt är land');
  assert.equal(inOrrWater(-560,1000),true);assert.equal(inOrrWater(200,1200),true,'Östra viken är vatten');
  // Stigen i Marieberg-utdraget ligger på land-sidan om vår östra strand (högst 45 m från den).
  const path=read('marieberg').roads.find(r=>r.id===38161777);assert.ok(path,'Orrholmsrundan finns i OSM-utdraget');
  const pts=proj(path.geometry).filter(([x,z])=>z>=700&&z<=1350);assert.ok(pts.length>20);
  for(const [x,z] of pts){const off=x-shoreE(z);assert.ok(off>=-4&&off<=45,'stigen ligger vid stranden: z='+Math.round(z)+' avstånd '+off.toFixed(1));}
  assert.equal(SHORE_E.length>5,true);assert.ok(shoreW(1000)<shoreE(1000)-250);
});

test('Vattnet är kollisionsyta och bryggorna går att gå på',()=>{
  const model=buildOuterModel({orrholmen:read('orrholmen')});
  assert.equal(model.water.length,2,'båda vikarna blir vattenpolygoner');
  assert.ok(model.water.some(w=>footprintContains(-560,1000,w)));assert.ok(!model.water.some(w=>footprintContains(-141,1000,w)));
  const bridges=model.roads.filter(r=>r.tags.bridge);assert.ok(bridges.length>=3,'bryggor: '+bridges.length);
  for(const b of bridges){const [x,z]=b.points.at(-1);assert.ok(model.water.some(w=>footprintContains(x,z,w)),'bryggan ligger ut över vattnet: '+b.name);const [sx,sz]=b.points[0];assert.ok(!model.water.some(w=>footprintContains(sx,sz,w)),'bryggan börjar på land: '+b.name);}
});

test('Nya platser: unika id:n, inte i vatten, i rätt album-område, och inget i de gamla områdena ändras',()=>{
  const all=[...TREASURES];assert.equal(new Set(all.map(t=>t.id)).size,all.length,'unika skatt-id:n');
  for(const t of NEW_TREASURES){assert.ok(TREASURES.some(x=>x.id===t.id));assert.equal(inOrrWater(t.x,t.z),false,t.id);assert.ok(t.hint.length>12&&t.name.length>5&&t.points>=250);}
  const expected={'t-bageriet':'orrholmen','t-farjan':'marieberg','t-uddevag':'orrholmen','t-utsikt':'orrholmen','t-orrskog':'orrholmen','t-ros':'tradgard','t-damm':'tradgard','t-fontan':'tradgard','t-brygga':'bryggudden','t-kranen':'bryggudden','t-perrong':'station','t-klockan':'station'};
  for(const [id,area] of Object.entries(expected)){const t=TREASURES.find(x=>x.id===id);assert.equal(areaOf(t),area,id);}
  assert.equal(areaOf({id:'x',x:-350,z:1150}),'orrholmen');
  for(const [key,list] of Object.entries(NEW_THERMOS)){
    assert.ok(list.length>=8,key);assert.ok(ALBUM_AREAS.some(a=>a.id===key),'album-område '+key);
    list.forEach(([x,z],i)=>{assert.equal(inOrrWater(x,z),false,key+i);
      const a=areaOf({id:`fx-${key}-${i}`,x,z});assert.ok(a===key||(key==='orrholmen'&&a==='marieberg'),`${key}-${i} hamnar i ${a}`);});
    assert.equal(new Set(list.map(p=>p.join(','))).size,list.length);
  }
  assert.ok(FX_THERMOS.orrholmen&&FX_THERMOS.tradgard&&FX_THERMOS.bryggudden&&FX_THERMOS.station);
  // Gamla album-områden behåller sina platser: haga och marieberg-listorna är oförändrade i storlek och område.
  for(const [id,x,z] of [['fx-haga-0',...FX_THERMOS.haga[0]],['fx-marieberg-0',...FX_THERMOS.marieberg[0]],['fx-hamn-0',...FX_THERMOS.hamn[0]]])assert.ok(['haga','marieberg','hamn'].includes(areaOf({id,x,z})));
  for(const a of ['orrholmen','tradgard','bryggudden','station'])assert.ok(ALBUM_AREAS.find(x=>x.id===a).bonus>=350);
});

test('Spelet: nya termosar och skatter nås från Torget i spelets egen karta (kontrolleras också av tools/explore-spots/check.mjs)',()=>{
  const g=clean();const ids=new Set(g.items.map(i=>i.id));
  for(const [key,list] of Object.entries(NEW_THERMOS))list.forEach((_,i)=>assert.ok(ids.has(`fx-${key}-${i}`),`fx-${key}-${i} finns bland termosarna`));
  for(const t of NEW_TREASURES)assert.ok(g.treasures.some(x=>x.id===t.id),t.id);
  assert.equal(g.fun.treasureTotal,g.secrets.length+TREASURES.length,'alla skatter räknas: '+g.fun.treasureTotal);
  const snap=g.fun.snapshot(0);for(const a of ['orrholmen','tradgard','bryggudden','station'])assert.ok(snap.album.find(x=>x.id===a).total>=8,a);
});

test('Ritning: varje delritning ger ändliga hörn, rimligt antal trianglar och rörliga vågor, bojar, båtar och tåg',()=>{
  const sizes={};
  for(const [name,fn] of [['vatten',drawWater],['orrholmen',drawOrrholmen],['tradgard',drawTradgard],['bryggudden',drawBryggudden],['station',drawStation]]){
    const m=new ComicMesh();fn(m,name==='bryggudden'?gardenPolygons(read('hamn')):undefined);const n=m.positions.length/3;sizes[name]=n;
    assert.ok(n>200&&n<400000,name+' hörn: '+n);assert.ok(m.positions.every(Number.isFinite),name+' NaN');
    assert.equal(m.indices.length%3,0);assert.equal(m.colors.length/4,n);
  }
  assert.ok(sizes.vatten>5000,'vågor och båtar: '+sizes.vatten);assert.ok(sizes.tradgard>3000,'träd och rabatter: '+sizes.tradgard);
  const m=new ComicMesh();rbox(m,0,1,0,2,2,2,.7,'#fff');assert.equal(m.positions.length/3,5*6,'fem sidor à sex hörn');
});

test('Stadsträdgården: träd ligger inte på stigarna, och rabatterna finns på rätt plats i parken',()=>{
  for(const [cx,cz] of TRADGARD_BEDS)assert.ok(pointIn(cx,cz,TRADGARD),'rosrabatt i parken '+cx+','+cz);
  for(const [cx,cz] of HAMN_BEDS)assert.equal(pointIn(cx,cz,TRADGARD),false,'hamnrabatter ligger utanför parken');
  assert.equal(nearTradgardPath(-44,520),true);assert.equal(nearTradgardPath(-90,700),false);
  const m=new ComicMesh();drawTradgard(m);assert.ok(m.positions.length/3>3000);
});

test('Bryggudden: kajkanterna följer spelets vattenrader och spetsen ligger nära (436,644)',()=>{
  const {west,east}=bryggEdges();assert.ok(west.length>=15&&east.length===west.length);
  for(let i=0;i<west.length;i++)assert.ok(east[i][1]>west[i][1]+20,'tungan har bredd vid z='+west[i][0]);
  const w=west.at(-1),e=east.at(-1);assert.ok(w[0]>=630&&e[1]-w[1]<60,'tungan smalnar av mot spetsen');
});

test('Skyltar: ligger inte i vattnet, har läsbar text och finns vid alla nya platser',()=>{
  const texts=ORR_SIGNS.map(s=>s[0]);assert.ok(texts.some(t=>/MARIEBERG/.test(t)),'skylt som förklarar vattnet mot Marieberg');
  assert.ok(texts.some(t=>/ORRHOLMEN/.test(t)));assert.ok(texts.some(t=>/STADSTRÄDGÅRDEN/.test(t)));assert.ok(texts.some(t=>/BRYGGUDDEN/.test(t)));assert.ok(texts.some(t=>/KARLSTAD C/.test(t)));
  for(const [text,x,z,y,w] of ORR_SIGNS){assert.ok(text.length>=8&&text.length<=48,text);assert.equal(inOrrWater(x,z),false,'skylt i vatten: '+text);assert.ok(w>=4&&w<=12&&y>=2.5&&y<=7);}
});

test('Platsutmaningar: gå in i cirkeln, plocka alla termosar i tid, få belöning och städa upp',()=>{
  const g=clean();const def=SITE_CHALLENGES.find(s=>s.id==='ros');
  assert.equal(SITE_CHALLENGES.length,4);for(const d of SITE_CHALLENGES){assert.ok(d.points.length>=5&&d.seconds>=40&&d.reward>=300);d.points.forEach(([x,z])=>assert.equal(inOrrWater(x,z),false));}
  // utanför cirkeln händer ingenting
  let ev=step(g,{x:def.x+60,z:def.z});assert.equal(g.activeSite,null);assert.equal(ev.some(e=>e.type==='challenge-start'),false);
  ev=step(g,{x:def.x,z:def.z});const start=ev.find(e=>e.type==='challenge-start');assert.ok(start,'utmaningen startar');assert.equal(start.kind,'site');assert.match(start.title,/ROSJAKTEN/);
  assert.equal(g.activeSite.items.length,def.points.length);assert.equal(g.flash.snapshot().target,def.points.length);
  const before=g.balance;let done=null;
  for(const [x,z] of def.points){const e=step(g,{x,z});done=done||e.find(x=>x.type==='challenge-done');}
  assert.ok(done,'klar efter sista termosen');assert.ok(g.balance-before>=def.reward,'belöningen betalas ut');assert.equal(g.activeSite,null);assert.equal(g.items.some(i=>i.site),false,'utlagda termosar städas bort');
  assert.equal(g.fun.state.stats.flashDone,1);
  // bara en gång per runda
  step(g,{x:def.x+80,z:def.z});ev=step(g,{x:def.x,z:def.z});assert.equal(ev.some(e=>e.type==='challenge-start'),false,'samma plats startar inte igen');
  g.rush.start('clean');assert.equal(g.sitesDone.size,0,'ny runda nollställer');
});

test('Platsutmaningar: tiden kan gå ut, då försvinner termosarna, och de startar inte under Temporush eller under en annan utmaning',()=>{
  const g=clean(),def=SITE_CHALLENGES.find(s=>s.id==='tag');
  step(g,{x:def.x,z:def.z});assert.ok(g.activeSite);
  let out=[];for(let i=0;i<60&&!out.some(e=>e.type==='challenge-fail');i++)out=out.concat(step(g,{x:def.x+90,z:def.z+90},1));
  assert.ok(out.some(e=>e.type==='challenge-fail'&&e.kind==='site'),'misslyckas när tiden går ut');assert.equal(g.activeSite,null);assert.equal(g.items.some(i=>i.site),false);
  const t=clean();t.startTempo();step(t,{x:SITE_CHALLENGES[0].x,z:SITE_CHALLENGES[0].z});assert.equal(t.activeSite,null,'inte under Temporush');
  const f=clean();f.flash.start(1,'chain');step(f,{x:SITE_CHALLENGES[1].x,z:SITE_CHALLENGES[1].z});assert.equal(f.activeSite,null,'inte medan en blixtutmaning pågår');
});

test('Rabatter: blommorna är små blomhuvuden på stjälkar inne i rabattens form, inte klossar',()=>{
  const gardens=gardenPolygons(read('hamn'));assert.ok(gardens.length>=6,'rabatter i utdraget: '+gardens.length);
  class Rec extends ComicMesh{constructor(){super();this.tris=[];this.boxes=[];}tri(a,b,c,col){this.tris.push([a,b,c]);return super.tri(a,b,c,col);}box(x,y,z,w,h,d,...r){this.boxes.push([x,y,z,w,h,d]);return super.box(x,y,z,w,h,d,...r);}}
  const m=new Rec();drawBryggudden(m,gardens);
  const stems=m.boxes.filter(b=>Math.abs(b[3]-.05)<.001&&Math.abs(b[5]-.05)<.001);
  assert.ok(stems.length>80,'många blommor med stjälk: '+stems.length);
  assert.equal(stems.filter(b=>!gardens.some(g=>pointIn(b[0],b[2],g))).length,0,'blommor utanför rabatterna');
  assert.ok(stems.every(b=>b[1]+b[4]/2<.65),'låga stjälkar');
  assert.equal(m.boxes.filter(b=>Math.abs(b[3]-.26)<.001).length,0,'inga gamla blomklossar');
});
