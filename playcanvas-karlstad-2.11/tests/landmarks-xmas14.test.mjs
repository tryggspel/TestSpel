// xmas.14: Rådhuset, Domkyrkans torn och Fredsmonumentet som geometri, byggda efter beskrivningar av de verkliga byggnaderna.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ComicMesh} from '../city-architecture.js';
import {addRadhusetWall,addRadhusetRoof,faceFrom,RADHUSET,RADHUSET_FRONT,RADHUSET_COLOURS} from '../radhuset-facade.mjs';
import {addDomkyrkanTower,towerFaces,DOMKYRKAN_TOWER} from '../domkyrkan-tower.mjs';
import {addFredsmonumentet} from '../fredsmonumentet.mjs';
import {FREDSMONUMENT} from '../city-south-data.mjs';

const stats=m=>{const p=m.positions;let minY=1e9,maxY=-1e9,ok=true;for(let i=0;i<p.length;i+=3){if(!p.slice(i,i+3).every(Number.isFinite))ok=false;minY=Math.min(minY,p[i+1]);maxY=Math.max(maxY,p[i+1]);}return {tris:m.indices.length/3,minY,maxY,ok};};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const hasColour=(m,hex)=>{const c=rgb(hex);for(let i=0;i<m.colors.length;i+=4)if(Math.abs(m.colors[i]-c[0])<.01&&Math.abs(m.colors[i+1]-c[1])<.01&&Math.abs(m.colors[i+2]-c[2])<.01)return true;return false;};

test('Rådhuset: gul torgfasad österut med mittrisalit, ur och två örnar ovanför takfoten', ()=>{
  const f=faceFrom(RADHUSET_FRONT.a,RADHUSET_FRONT.q);
  assert.ok(f.nx>.99,'torgfasaden vetter österut mot torget');assert.ok(f.length>45&&f.length<55);
  const m=new ComicMesh(),r=addRadhusetWall(m,f,{main:true}),s=stats(m);
  assert.ok(s.ok&&s.tris>1500);assert.equal(r.eagles,2);assert.ok(r.risalit.u1-r.risalit.u0>12&&r.risalit.u1-r.risalit.u0<20,'risaliten är 5 axlar bred');
  assert.ok(Math.abs(r.risalit.mid-f.length/2)<2,'risaliten sitter mitt på fasaden');
  assert.ok(r.clockY>RADHUSET.H+1,'uret kröner risaliten över takfoten');assert.ok(s.maxY>RADHUSET.H+3.5,'örnarna och urets krön syns över taket');
  assert.ok(hasColour(m,RADHUSET_COLOURS.wall)&&hasColour(m,RADHUSET_COLOURS.gold)&&hasColour(m,RADHUSET_COLOURS.clock));
  // fasadens ytor pekar ut mot torget (annars döljer WebGL dem)
  let out=0,inn=0;for(let i=0;i<m.normals.length;i+=9){const nx=m.normals[i];if(nx>.9)out++;else if(nx<-.9)inn++;}
  assert.ok(out>inn*3,'de flesta ytorna vänder ut mot torget: '+out+' / '+inn);
  const side=new ComicMesh(),q=addRadhusetWall(side,faceFrom([-74,21.5],[-89.3,21]),{});assert.equal(q.risalit,null);
  const roof=new ComicMesh();addRadhusetRoof(roof);const rs=stats(roof);assert.ok(rs.ok&&rs.minY>=RADHUSET.H-.3&&rs.maxY<RADHUSET.H+4);
  let up=0;for(let i=1;i<roof.normals.length;i+=9)if(roof.normals[i]>.05)up++;assert.ok(up>=10,'taket vänder uppåt');
});

test('Domkyrkan: västtorn med hög spira (58–65 m), fyra urtavlor och kors', ()=>{
  const m=new ComicMesh(),r=addDomkyrkanTower(m,175.8,-83.9),s=stats(m);
  assert.ok(s.ok&&s.tris>800);assert.equal(r.clocks,4);
  assert.ok(s.maxY>=58&&s.maxY<=65,'tornets höjd '+s.maxY.toFixed(1));assert.equal(r.top,DOMKYRKAN_TOWER.top);
  const faces=towerFaces(0,0,10);for(const f of faces){const mx=f.a[0]+f.tx*5,mz=f.a[1]+f.tz*5;assert.ok(mx*f.nx+mz*f.nz>4,'sidans normal pekar utåt');}
  assert.deepEqual(faces.map(f=>[Math.round(f.nx)+0,Math.round(f.nz)+0]),[[0,1],[-1,0],[0,-1],[1,0]]);
});

test('Fredsmonumentet: granitsockel och bronsfigur med svärdet över huvudet', ()=>{
  const m=new ComicMesh(),r=addFredsmonumentet(m,FREDSMONUMENT.x,FREDSMONUMENT.z),s=stats(m);
  assert.ok(s.ok&&s.tris>150);assert.ok(r.top>6.5&&r.top<9,'svärdet hålls högt: '+r.top.toFixed(2));assert.ok(s.minY>=0);
});

test('kopplingen: inga gamla texturkort över de nya byggnaderna, nya moduler med versionsnyckel', ()=>{
  const id=fs.readFileSync(new URL('../city-identity.js',import.meta.url),'utf8'),ar=fs.readFileSync(new URL('../city-architecture.js',import.meta.url),'utf8'),so=fs.readFileSync(new URL('../city-south.js',import.meta.url),'utf8');
  assert.doesNotMatch(id,/Domkyrkan · tornfasad|Rådhuset · torgfasad/);
  assert.match(ar,/radhuset-facade\.mjs\?v=/);assert.match(ar,/domkyrkan-tower\.mjs\?v=/);assert.match(so,/fredsmonumentet\.mjs\?v=/);
  assert.match(ar,/const tx=b\.minx\+7\.3,n0=tx\+6\.5/);assert.match(ar,/addDomkyrkanTower\(m,tx,z\)/);assert.match(ar,/addRadhusetWall\(m,faceFrom\(RADHUSET_FRONT\.a,RADHUSET_FRONT\.q\),\{H,main:true\}\)/);
});
