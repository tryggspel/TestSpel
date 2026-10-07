#!/usr/bin/env node
// Genererar data/osm-outer-orrholmen.json: viken mellan Marieberg och Orrholmen, Östra viken, Tullholmen och Orrholmen med parken.
// OBS: detta är INTE OpenStreetMap-data. Allt som saknas i OSM-utdragen är handritat efter en Google Maps-bild (satellit) och
// kalibrerat mot riktiga punkter: stigen Orrholmsrundan (OSM 38161777) ger viken östra strand, Marieberg-utdragets bostadsyta
// (OSM 38161785, x −476…−163, z 1270…1684) ger Orrholmens bebyggelse, Willys Bryggudden och Stadsträdgården ger skalan.
// Läget stämmer ungefär (±40 m), men inte byggnad för byggnad. Kör:  node tools/orrholmen/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
import {SHORE_E,SHORE_W,BAY_WEST,BAY_EAST,shoreE,shoreW} from '../../orrholmen-places.mjs';
const ORIGIN={lat:59.380767,lon:13.50295};
export const px=(x,y)=>[270.5+(x-991)*1.52,983.5+(y-549)*1.52].map(v=>Math.round(v));
export const toLatLon=([x,z])=>({lat:+(ORIGIN.lat-z/110540).toFixed(7),lon:+(ORIGIN.lon+x/(111320*Math.cos(ORIGIN.lat*Math.PI/180))).toFixed(7)});
const rng=(seed=7)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const R=rng(20261007);
const pointIn=(x,z,poly)=>{let r=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)r=!r;}return r;};

// ── Vatten ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Orrholmsviken. Östra stranden följer stigen Orrholmsrundan (OSM), västra stranden följer Mariebergs bostadsyta och stranden vid färjeläget.
export {SHORE_E,SHORE_W,BAY_WEST,BAY_EAST,shoreE,shoreW};

const buildings=[],roads=[],environment=[],trees=[];
let id=9100000;const nid=()=>++id;
const poly=pts=>pts.map(toLatLon);
const area=(tags,pts)=>environment.push({id:nid(),tags,geometry:poly([...pts,pts[0]])});
const rect=(cx,cz,w,d,rot=0)=>{const c=Math.cos(rot),s=Math.sin(rot);return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>[Math.round((cx+x*c-z*s)*10)/10,Math.round((cz+x*s+z*c)*10)/10]);};
const road=(highway,pts,name,extra={})=>roads.push({id:nid(),tags:{highway,...(name?{name}:{}),...extra},geometry:poly(pts)});
const building=(pts,tags)=>buildings.push({id:nid(),tags:{building:'yes',...tags},geometry:poly([...pts,pts[0]])});

area({natural:'water',name:'Orrholmsviken',water:'bay'},BAY_WEST);
area({natural:'water',name:'Östra viken',water:'bay'},BAY_EAST);

// ── Tullholmen (norra Orrholmen, mellan vikarna) ─────────────────────────────────────────────────────────────────
area({leisure:'park',name:'Tullholmens strandpark'},[[shoreE(730)+3,730],[shoreE(730)+30,730],[shoreE(900)+30,900],[shoreE(1100)+30,1100],[shoreE(1250)+30,1250],[shoreE(1250)+3,1250],[shoreE(1100)+3,1100],[shoreE(900)+3,900]]);
area({landuse:'grass'},[[-250,880],[-170,880],[-170,1000],[-250,1000]]);
area({natural:'beach',name:'Orrholmens badplats'},[[shoreE(1120)+3,1120],[shoreE(1120)+30,1122],[shoreE(1160)+32,1160],[shoreE(1200)+30,1200],[shoreE(1200)+3,1200],[shoreE(1160)+3,1160]]);
area({natural:'beach'},[[-640,1396],[-560,1398],[-548,1416],[-640,1418]]);
road('residential',[[-141,860],[-141,1000],[-140,1150],[-150,1290]],'Tullholmsvägen');
road('residential',[[-141,990],[-60,990],[-34,990]],'Tullholmsgatan');
road('footway',[[shoreE(700)+12,700],[shoreE(900)+12,900],[shoreE(1100)+12,1100],[shoreE(1250)+12,1250]],'Strandpromenaden');
road('footway',[[shoreE(1160)+12,1160],[-141,1170]],'Badplatsvägen');
road('pedestrian',[[shoreE(1160)+3,1160],[shoreE(1160)-50,1160]],'Badbryggan',{bridge:'yes'});
road('pedestrian',[[shoreE(880)+3,880],[shoreE(880)-36,880]],'Fiskebryggan',{bridge:'yes'});
// Byggnader: Wermland Operas orkestersal (Bageriet), restaurang och gamla magasin längs hamnkanten.
building(rect(-125,994,44,24,.1),{building:'yes',name:'Wermland Opera · Bageriet','building:levels':'3'});
building(rect(-62,938,22,14),{building:'yes',name:'Tullholmen Rotisserie & Steakhouse','building:levels':'2'});
for(const [x,z,w,d,l] of [[-226,938,34,16,2],[-226,968,34,16,2],[-226,1040,30,18,2],[-205,1096,26,16,2],[-70,1040,30,16,2],[-84,1090,26,18,3],[-70,1140,28,16,2],[-84,1200,24,16,2],[-200,1220,30,16,2]])
  building(rect(x,z,w,d),{building:'warehouse','building:levels':String(l)});
for(const [x,z] of [[-190,1160],[-180,1190],[-100,1120],[-96,1170],[-190,1100]])building(rect(x,z,9,11),{building:'house','building:levels':'2'});
building(rect(shoreE(1140)+38,1141,5,5),{building:'shed',name:'Badhuset'});
building(rect(shoreE(1190)+38,1192,4,6),{building:'toilets'});

// ── Orrholmen (söder om viken): bostadskvarter, Orrholmsparken och Gamla färjeläget ────────────────────────────────────
// Bebyggelsen ligger i Marieberg-utdragets bostadsyta (x −476…−163, z 1270…1684).
road('residential',[[-150,1290],[-200,1330],[-300,1345],[-330,1420],[-325,1560],[-322,1700]],'Orrholmsgatan');
for(const z of [1420,1520,1620])road('residential',[[-440,z],[-325,z],[-190,z+10]],z===1420?'Färjelägsgatan':z===1520?'Strandvägen':'Parkgatan');
road('footway',[[-466,1408],[-440,1420]],'Färjelägesstigen');
let k=0;
for(const z of [1370,1470,1570]){
  for(const x of [-405,-260,-215]){
    building(rect(x+(R()-.5)*4,z+12+(R()-.5)*4,13,34),{building:'apartments','building:levels':String(3+((k++)%3===0?1:0))});
  }
  building(rect(-375,z+40,9,11),{building:'house','building:levels':'2'});
  building(rect(-290,z+45,9,11),{building:'house','building:levels':'2'});
}
building(rect(-345,1650,22,16),{building:'yes',name:'Orrholmens skola','building:levels':'2'});
building(rect(-448,1432,14,9,.1),{building:'yes',name:'Färjelägets kafé','building:levels':'1'});
// Gamla färjeläget: brygga rakt ut i viken från viksöstra hörnet.
road('pedestrian',[[-466,1428],[-466,1348]],'Gamla färjeläget',{bridge:'yes'});
// Orrholmsparken i öster, mot Östra viken, med skog och en udde längst söderut.
area({leisure:'park',name:'Orrholmsparken'},[[-170,1440],[-90,1420],[-10,1440],[24,1500],[26,1580],[-10,1650],[-90,1690],[-160,1660],[-176,1560]]);
area({landuse:'forest',leaf_type:'broadleaved',name:'Orrholmsskogen'},[[-10,1440],[26,1500],[28,1580],[-8,1650],[-40,1600],[-40,1480]]);
area({natural:'wood',name:'Orrholmsudden'},[[-240,1700],[-160,1700],[-90,1724],[-100,1780],[-190,1790],[-250,1750]]);
area({leisure:'playground'},[[-205,1448],[-185,1448],[-185,1468],[-205,1468]]);
road('footway',[[-190,1430],[-130,1450],[-60,1470],[-20,1520],[-30,1590],[-90,1630],[-150,1610],[-165,1540],[-130,1470]],'Parkslingan');
road('footway',[[-90,1630],[-100,1690],[-130,1750]],'Uddestigen');
road('path',[[-20,1520],[10,1500],[20,1470]],'Skogsstigen');
road('footway',[[-190,1430],[-250,1440],[-330,1425]],'Parkvägen');
building(rect(-60,1535,8,8),{building:'shelter',name:'Parkens paviljong'});
building(rect(-120,1470,6,6),{building:'kiosk',name:'Parkkiosken'});

// ── Träd ────────────────────────────────────────────────────────────────────────────────────────────────────────
const bpolys=()=>buildings.map(b=>b.geometry.map(p=>[(p.lon-ORIGIN.lon)*111320*Math.cos(ORIGIN.lat*Math.PI/180),-(p.lat-ORIGIN.lat)*110540]));
const BP=bpolys();
const treeAt=(x,z)=>{if(pointIn(x,z,BAY_WEST)||pointIn(x,z,BAY_EAST)||BP.some(b=>pointIn(x,z,b)))return;trees.push({id:nid(),...toLatLon([Math.round(x),Math.round(z)])});};
const inWater=(x,z)=>pointIn(x,z,BAY_WEST)||pointIn(x,z,BAY_EAST);
for(let z=870;z<1300;z+=18){treeAt(-152+(R()-.5)*3,z);treeAt(-130+(R()-.5)*3,z+8);}
for(let i=0;i<160;i++){const x=-180+R()*200,z=1430+R()*250;if(!inWater(x,z)&&pointIn(x,z,[[-170,1440],[-10,1440],[26,1500],[26,1580],[-10,1650],[-90,1690],[-160,1660],[-176,1560]]))treeAt(x,z);}
for(let i=0;i<70;i++){const z=700+R()*540,x=shoreE(z)+3+R()*26;if(!inWater(x,z))treeAt(x,z);}
for(let z=1300;z<1700;z+=24){treeAt(-312+(R()-.5)*3,z);treeAt(-338+(R()-.5)*3,z+10);}
for(const [x,z] of [[-445,1445],[-430,1415],[-492,1380],[shoreE(1100)+36,1100],[shoreE(1215)+34,1215]])treeAt(x,z);

const lats=[],lons=[];for(const g of [...buildings,...roads,...environment])for(const p of g.geometry){lats.push(p.lat);lons.push(p.lon);}for(const t of trees){lats.push(t.lat);lons.push(t.lon);}
const out={area:'orrholmen',bbox:[Math.min(...lons),Math.min(...lats),Math.max(...lons),Math.max(...lats)],updated:'2026-10-07',
  source:'Handritad efter Google Maps-bild och kalibrerad mot OSM-punkter (ungefärlig, ±40 m). Inte OpenStreetMap-data. Se tools/orrholmen/build.mjs.',buildings,roads,environment,trees};
export const DATA=out;
if(process.argv[1]===fileURLToPath(import.meta.url)){
  fs.writeFileSync(path.join(root,'data/osm-outer-orrholmen.json'),JSON.stringify(out));
  console.log('Orrholmen:',buildings.length,'byggnader',roads.length,'vägar',environment.length,'ytor',trees.length,'träd');
}
