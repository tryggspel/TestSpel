import test from 'node:test';
import assert from 'node:assert/strict';
import {ComicMesh} from '../city-architecture.js';
import {addOperaFront,operaFrontLayout,OPERA_COLOURS} from '../opera-facade.mjs';
import {addResidensetWall,addResidensetRoof,RESIDENSET_COLOURS} from '../residenset-facade.mjs';

test('Opera front: three bays, pediment above the eaves, canopy and doors',()=>{
  const L=operaFrontLayout(16);
  assert.equal(L.centres.length,3);
  assert.ok(L.ridge>L.eaves&&L.eaves>L.oculusY&&L.oculusY>L.windowY);
  const m=new ComicMesh();addOperaFront(m,{x0:0,zc:0,W:16});
  assert.ok(m.positions.length/3>1200,'enough geometry for the sculpted front');
  const ys=m.positions.filter((_,i)=>i%3===1);assert.ok(Math.max(...ys)>=L.ridge-.1,'pediment reaches the ridge');
  const cols=new Set();for(let i=0;i<m.colors.length;i+=4)cols.add(m.colors.slice(i,i+3).map(v=>v.toFixed(2)).join());
  assert.ok(cols.size>=8,'cream, green stucco, gold, dark doors and glass are all present');
});

test('Residenset is ochre with a dark mansard roof and differs from the bright yellow Stadshotellet',()=>{
  const m=new ComicMesh();
  addResidensetWall(m,{a:[0,0],q:[40,0],length:40,tx:1,tz:0,nx:0,nz:1,ccw:false},10.4);
  addResidensetRoof(m,{minx:0,maxx:18,minz:0,maxz:49,H:10.4});
  assert.ok(m.positions.length/3>1500);
  const hex=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
  const [r,g,b]=hex(RESIDENSET_COLOURS.wall);assert.ok(r>g&&g>b,'warm ochre');
  const stadshotellet=hex('#dfbd79');
  assert.ok(Math.abs(stadshotellet[0]-r)+Math.abs(stadshotellet[1]-g)+Math.abs(stadshotellet[2]-b)>30,'clearly not the same wall colour');
  assert.ok(hex(RESIDENSET_COLOURS.roof).every(v=>v<110),'dark slate roof');
});

test('Opera palette keeps the cream trim apart from the wall',()=>{
  const d=(a,b)=>[1,3,5].reduce((s,i)=>s+Math.abs(parseInt(a.slice(i,i+2),16)-parseInt(b.slice(i,i+2),16)),0);
  assert.ok(d(OPERA_COLOURS.wall,OPERA_COLOURS.trim)>=12);
});
