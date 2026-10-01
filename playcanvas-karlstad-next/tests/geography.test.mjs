import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,cityPoint,LANDMARKS,STOREFRONTS,storefrontAnchor,landmarkDestination,CITY_STREETS,streetAt} from '../city-geography.mjs';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney} from '../journey-rules.mjs';
import {CHALLENGE_RULES,challengeRequest} from '../daily-challenge.mjs';
const osm=JSON.parse(fs.readFileSync(new URL('../../karlstad-city-mobile/data/osm-buildings.json',import.meta.url)));
const buildings=cityBuildings(osm),blocked=(x,z)=>buildings.some(b=>x+.57>b.minx&&x-.57<b.maxx&&z+.57>b.minz&&z-.57<b.maxz);
const nav=new CityNavigation(blocked);

test('real landmark and business buildings survive the 95-building budget, regardless of source order',()=>{
  assert.equal(buildings.length,95);assert.equal(new Set(buildings.map(b=>b.osm)).size,95);
  for(const p of [...LANDMARKS,...STOREFRONTS])assert.ok(buildings.some(b=>b.osm===p.osm),p.id);
  assert.deepEqual(cityBuildings({...osm,elements:[...osm.elements].reverse()}).map(b=>b.osm),buildings.map(b=>b.osm));
  for(const b of buildings){assert.ok(Math.abs(b.cx-(b.minx+b.maxx)/2)<1e-9);assert.ok(Math.abs(b.cz-(b.minz+b.maxz)/2)<1e-9);}
});
test('Torget, cathedral, library and gallery have geographically faithful, unblocked walking destinations',()=>{
  const church=landmarkDestination('domkyrkan',buildings),gallery=landmarkDestination('sandgrund',buildings),library=landmarkDestination('biblioteket',buildings);
  assert.ok(church.x>155&&church.z<0);assert.ok(gallery.z<-390&&Math.abs(gallery.x)<20);assert.ok(library.z< -300&&library.z>gallery.z);
  for(const mark of LANDMARKS){const p=landmarkDestination(mark.id,buildings),route=nav.path({x:0,z:14},p),last=route.at(-1);
    assert.ok(route.length>1);assert.ok(Math.hypot(last.x-p.x,last.z-p.z)<3,mark.id+' stays at the actual landmark, not at the edge of the old grid');
    for(let i=0;i<route.length;i++){assert.equal(blocked(route[i].x,route[i].z),false);if(i)assert.ok(nav.clear(route[i-1],route[i]));}
  }
  const atLibrary=nav.path({x:0,z:14},gallery).filter(p=>p.z<-284&&p.z>-353);
  assert.ok(atLibrary.length>15);assert.ok(atLibrary.every(p=>p.x<-37),'Sandgrund approach passes west of the library on Västra Torggatan');
});
test('each official business sign is bound to its address building and faces the correct street',()=>{
  for(const shop of STOREFRONTS){
    const p=storefrontAnchor(shop,buildings),b=buildings.find(b=>b.osm===shop.osm),outside=shop.face==='north'?-1:1;
    assert.ok(p.x>b.minx&&p.x<b.maxx);assert.equal(p.osm,shop.osm);assert.equal(p.yaw,shop.face==='north'?180:0);
    assert.ok(Math.abs(p.z-(shop.face==='north'?b.minz:b.maxz))<.3);
    assert.equal(blocked(p.x,p.z+outside*3),false,shop.id+' storefront opens onto a walkable pavement');
    const approach={x:p.x,z:p.z+outside*3},path=nav.path({x:0,z:14},approach);assert.ok(Math.hypot(path.at(-1).x-approach.x,path.at(-1).z-approach.z)<3);
  }
  assert.equal(storefrontAnchor(STOREFRONTS[0],[]),null,'Never place a logo on an unrelated fallback building');
});
test('map streets retain their original OSM axes and use the same metre projection as buildings',()=>{
  const roads=JSON.parse(fs.readFileSync(new URL('../../karlstad-city-mobile/data/osm-roads.json',import.meta.url)));
  for(const street of CITY_STREETS){const source=roads.elements.find(e=>e.id===street.osm);assert.ok(source);assert.equal(source.tags.name,street.name);
    for(let i=0;i<street.points.length;i++){const p=cityPoint(source.geometry[i].lon,source.geometry[i].lat);assert.ok(Math.abs(p.x-street.points[i][0])<.006);assert.ok(Math.abs(p.z-street.points[i][1])<.006);}
  }
  assert.equal(streetAt({x:0,z:14}),'STORA TORGET');assert.equal(streetAt({x:-51,z:-375}),'VÄSTRA TORGGATAN');assert.equal(streetAt({x:146,z:-90}),'VÄSTRA KYRKOGATAN');
});
test('a chosen architectural destination stays selected during chaos, then yields to earned escape',()=>{
  const portals={'sista-rundan':{x:43,z:31,name:'O’Learys'},sandgrund:{x:-11,z:-365,name:'Sandgrund'}};
  const g=new CityJourney(nav,cityPoint(13.50055,59.37988),portals);g.rush.start('free');g.routeMode='landmark';g.landmarkGoal=landmarkDestination('domkyrkan',buildings);
  g.rush.beginStory('news',{x:0,z:14},{x:0,z:-1});assert.equal(g.objective().id,'place-domkyrkan');
  g.rush.mode='timed';g.reward(800);assert.equal(g.objective().kind,'escape');
  assert.equal(CHALLENGE_RULES,4);assert.ok(challengeRequest('?daily=2026-09-30&rules=3').error,'Previous map scores must not be presented as comparable');
});
