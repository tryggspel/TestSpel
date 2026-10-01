import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY27_VERSION,MITT_I_CITY_OSM,BLACKOUT_27,PLACES27,city27Point,mittICityLayout,mittICityColliders,applyCity27Colliders,pointBlockedBy,canBlackout27} from '../city-27.mjs';
const mall={osm:MITT_I_CITY_OSM,minx:-20,maxx:20,minz:-16,maxz:16,cx:0,cz:0};

test('2.7 identifies the graphics release',()=>assert.equal(CITY27_VERSION,'2.7.0'));
test('2.7 contains the requested Karlstad landmarks',()=>assert.deepEqual(PLACES27.map(p=>p.id),['mitt-i-city','duvan','ahlens','stadshotellet','varmlands-museum','sandgrundsudden']));
test('Karlstad projection keeps Stora Torget at the origin',()=>{const p=city27Point(13.50295,59.380767);assert.ok(Math.abs(p.x)<1e-9);assert.ok(Math.abs(p.z)<1e-9);});
test('Mitt i City uses its real OSM building when available',()=>{const p=mittICityLayout([mall]);assert.equal(p.osm,MITT_I_CITY_OSM);assert.equal(p.w,40);assert.equal(p.d,32);});
test('Mitt i City has four open entrance gaps',()=>{const c=mittICityColliders([mall]);for(const p of [{x:0,z:-16},{x:0,z:16},{x:-20,z:0},{x:20,z:0}])assert.equal(pointBlockedBy(c,p,.1),false);});
test('Mitt i City walls still block walking through the facade',()=>{const c=mittICityColliders([mall]);assert.equal(pointBlockedBy(c,{x:-10,z:-16},.1),true);assert.equal(pointBlockedBy(c,{x:20,z:-10},.1),true);});
test('2.7 replaces the sealed mall shell with eight wall segments',()=>{const out=applyCity27Colliders([{osm:MITT_I_CITY_OSM,name:'sealed',minx:-20,maxx:20,minz:-16,maxz:16},{name:'other',minx:50,maxx:51,minz:50,maxz:51}],[mall]);assert.equal(out.some(c=>c.name==='sealed'),false);assert.equal(out.filter(c=>c.source==='city27-mitt-i-city').length,8);assert.equal(out.some(c=>c.name==='other'),true);});
test('blackouts are capped at four seconds and spaced by 150 seconds',()=>{assert.equal(BLACKOUT_27.seconds,4);assert.equal(BLACKOUT_27.cooldown,150);assert.equal(canBlackout27(149,0),false);assert.equal(canBlackout27(150,0),true);});
