// CI: storefront recovery branch verifies rendering data without changing gameplay collision.
import test from 'node:test';
import assert from 'node:assert/strict';
import {REAL_BUSINESSES,UNMAPPED_BUSINESSES,businessAnchor} from '../businesses.mjs';
import {MALL_SHOPS} from '../mall-architecture.js';

test('real facade list contains the requested Karlstad examples',()=>{
  const ids=new Set(REAL_BUSINESSES.map(b=>b.id));
  for(const id of ['musicpartner','synsam','normal','hemkop','burgerking','sibylla','grekiska','leprechaun','fratelli'])assert.ok(ids.has(id),id);
  assert.equal(ids.size,REAL_BUSINESSES.length);
  assert.ok(MALL_SHOPS.some(s=>s.name==='APOTEKET'&&s.floor===0),'Apoteket belongs inside Mitt i City');
  assert.ok(UNMAPPED_BUSINESSES.some(b=>b.id==='gobanana'&&/37B/.test(b.address)),'Go Banana stays staged until west OSM buildings are mapped');
});

test('MusicPartner stays on the south face of its mapped building',()=>{
  const b=REAL_BUSINESSES.find(x=>x.id==='musicpartner');
  const a=businessAnchor(b,[{osm:b.osm,minx:278.9,maxx:312.5,minz:-65.5,maxz:-25.6}]);
  assert.equal(a.yaw,0);assert.ok(a.z>-25.7&&a.z<-25.3);assert.ok(a.width<=11.5);
});

test('east and west shopfronts rotate onto street-facing walls',()=>{
  const east=businessAnchor({face:'east',osm:1,width:8},[{osm:1,minx:10,maxx:20,minz:30,maxz:50}]);
  const west=businessAnchor({face:'west',osm:2,width:8},[{osm:2,minx:70,maxx:90,minz:30,maxz:50}]);
  assert.equal(east.yaw,90);assert.equal(east.x,20.1);assert.equal(west.yaw,-90);assert.equal(west.x,69.9);
});
