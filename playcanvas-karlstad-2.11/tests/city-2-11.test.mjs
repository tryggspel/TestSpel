import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cityBuildings,infillBuildings,LANDMARKS,PLACE_ROUTES,landmarkDestination} from '../city-geography.mjs';
import {onVastraBron,VASTRA_BRON} from '../city-water.mjs';
import {waterBlocked} from '../park-space.mjs';
import {southWaterBlocked,footprintContains} from '../city-south-space.mjs';
import {PEDESTRIAN_NAMES,pedestrianAt,GAGATA_SIGNS} from '../pedestrian.mjs';
import {RydeFleet,RYDE,RYDE_ZONES,RYDE_SPAWNS} from '../ryde.mjs';
import {ColliderGrid} from '../collider-grid.mjs';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney,GAGATA_BONUS} from '../journey-rules.mjs';
import {infillMesh} from '../city-architecture.js';

const osm=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url)));
const admitted=cityBuildings(osm,95),infill=infillBuildings(osm,admitted);
// Samma kollisionsregler som app.js: detaljerade hus = AABB, kvartersfyllnad = exakt polygon.
const colliders=[...admitted.map(b=>({...b,precise:false,minx:b.minx-.15,maxx:b.maxx+.15,minz:b.minz-.15,maxz:b.maxz+.15})),...infill.map(b=>({...b,precise:true,minx:b.minx-.15,maxx:b.maxx+.15,minz:b.minz-.15,maxz:b.maxz+.15}))];
const grid=new ColliderGrid(colliders);
const inBuilding=(x,z)=>{for(const c of grid.near(x,z,.5)){if(x<c.minx||x>c.maxx||z<c.minz||z>c.maxz)continue;if(!c.precise||footprintContains(x,z,c.polygon))return true;}return false;};
const blocked=(x,z)=>waterBlocked(x,z)||(southWaterBlocked(x,z)&&!onVastraBron(x,z))||inBuilding(x,z);

test('kvartersfyllnad: resten av OSM-utdraget, inga dubbletter, utåtvända väggar',()=>{
  assert.equal(admitted.length,95,'de 95 detaljerade husen är oförändrade till antalet');
  assert.ok(infill.length>100,'över hundra fler riktiga byggnader: '+infill.length);
  const ids=new Set(admitted.map(b=>b.osm));assert.ok(infill.every(b=>!ids.has(b.osm)));
  const m=infillMesh(infill);assert.ok(m.positions.length/3<65535,'ryms i 16-bitars index');
});

test('nya landmärken i domkyrkostil finns med och har riktiga OSM-fotavtryck',()=>{
  for(const id of ['residenset','biskopsgarden','opera']){
    const mark=LANDMARKS.find(l=>l.id===id);assert.ok(admitted.some(b=>b.osm===mark.osm),id);
    assert.ok(PLACE_ROUTES.includes(id));const d=landmarkDestination(id,admitted);assert.ok(d&&!blocked(d.x,d.z),id+' går att gå fram till');
  }
});

test('Västra bron: Klarasidan (Teaterparken, Wermland Opera) går att nå över bron',()=>{
  // Älven fanns redan (OSM-vattenytor); utan bron var Klarasidan avskuren.
  const mid={x:(VASTRA_BRON.a.x+VASTRA_BRON.b.x)/2,z:(VASTRA_BRON.a.z+VASTRA_BRON.b.z)/2};
  assert.equal(southWaterBlocked(mid.x,mid.z),true,'bron går över vatten');
  for(let t=0;t<=1;t+=.05){const x=VASTRA_BRON.a.x+(VASTRA_BRON.b.x-VASTRA_BRON.a.x)*t,z=VASTRA_BRON.a.z+(VASTRA_BRON.b.z-VASTRA_BRON.a.z)*t;assert.equal(blocked(x,z),false,'brobana '+t.toFixed(2));}
  assert.equal(blocked(mid.x+14,mid.z-10),true,'bredvid bron är det fortfarande vatten');
  const without=new CityNavigation((x,z)=>waterBlocked(x,z)||southWaterBlocked(x,z)||inBuilding(x,z));
  const before=without.path({x:-170,z:-30},{x:-300,z:-110});assert.ok(!before.length||Math.hypot(before.at(-1).x+300,before.at(-1).z+110)>10,'utan bron fanns ingen väg (2.10)');
  const nav=new CityNavigation(blocked),path=nav.path({x:-170,z:-30},{x:-300,z:-110});
  assert.ok(path.length>5&&Math.hypot(path.at(-1).x+300,path.at(-1).z+110)<4,'väg till Teaterparken');
  assert.ok(path.some(p=>onVastraBron(p.x,p.z)),'vägen går över Västra bron');
});

test('gågator: Drottninggatan och Västra Torggatan enligt OSM, med skyltar och bonus',()=>{
  assert.deepEqual([...PEDESTRIAN_NAMES].sort(),['Drottninggatan','Västra Torggatan']);
  assert.equal(pedestrianAt({x:-5,z:172}),'Drottninggatan');assert.equal(pedestrianAt({x:-69,z:100}),'Västra Torggatan');
  assert.equal(pedestrianAt({x:0,z:0}),null,'Stora Torget är torg, inte gågata');
  assert.ok(GAGATA_SIGNS.length>=3);for(const s of GAGATA_SIGNS)assert.equal(blocked(s.x,s.z),false,'skylt '+s.name);
  const nav=new CityNavigation();
  const g=new CityJourney(nav,{x:-135,z:98},{'sista-rundan':{x:46,z:37},fikapanik:{x:8,z:6},'radda-fikat':{x:-135,z:55},sandgrund:{x:-12,z:-370}});
  g.rush.start('clean');
  const onStreet=g.items.find(i=>pedestrianAt(i)),plain=g.items.find(i=>!pedestrianAt(i));
  assert.ok(onStreet,'det finns termosar på gågatorna');
  let b=g.balance;g.step(.1,{...plain,y:1.68});assert.equal(g.balance-b,25);
  b=g.balance;g.step(.1,{...onStreet,y:1.68});assert.equal(g.balance-b,25+GAGATA_BONUS);
});

test('gatufynd: något att hitta inom ett kvarter längs centrumgatorna',()=>{
  const g=new CityJourney(new CityNavigation(),{x:-135,z:98},{'sista-rundan':{x:46,z:37},fikapanik:{x:8,z:6},'radda-fikat':{x:-135,z:55},sandgrund:{x:-12,z:-370}});
  const street=g.items.filter(i=>i.id.startsWith('s:'));assert.ok(street.length>60,'gatufynd: '+street.length);
  // Längs Drottninggatan och Västra Torggatan: max ~45 m mellan termosarna.
  for(const p of [[-150,170],[-100,170],[-30,172],[30,174],[-68,60],[-66,0],[-60,-90]]){
    const d=Math.min(...g.items.map(i=>Math.hypot(i.x-p[0],i.z-p[1])));assert.ok(d<45,p+' närmaste termos '+Math.round(d)+' m');
  }
});

test('Ryde: startplatser och zoner ligger på gångbar mark',()=>{
  for(const s of RYDE_SPAWNS)assert.equal(blocked(s.x,s.z),false,'spawn '+s.id+' '+s.x+','+s.z);
  for(const z of RYDE_ZONES)assert.equal(blocked(z.x,z.z),false,'zon '+z.name);
});

test('Ryde: plocka upp, dubbel fart, gångfart på gågata, parkering, batteri, ny scooter i närheten',()=>{
  const f=new RydeFleet({slowAt:pedestrianAt,walkable:p=>!blocked(p.x,p.z)});
  const s=f.scooters[0],here={x:s.x+1,z:s.z};
  assert.equal(f.speedScale(here),0);assert.equal(f.canPickUp({x:s.x+5,z:s.z}),false);
  assert.ok(f.pickUp(here));assert.equal(f.speedScale({x:0,z:0}),RYDE.speed);assert.equal(f.speedScale({x:-5,z:172}),RYDE.slowSpeed);
  f.drain();f.step(.1,{x:-5,z:172});assert.ok(f.drain().some(e=>e.type==='ryde-slow'));
  const z=RYDE_ZONES[0];const ev=f.park({x:z.x,z:z.z});assert.equal(ev.bonus,RYDE.parkBonus);assert.equal(f.riding,null);
  f.pickUp({x:z.x,z:z.z});f.park({x:z.x+30,z:z.z+30});const plain=f.drain().find(e=>e.type==='ryde-park'&&e.reason==='player'&&!e.zone);assert.ok(plain,'parkering utanför zon ger ingen bonus');
  f.pickUp({x:z.x+30,z:z.z+30});for(let t=0;t<RYDE.batterySeconds+1;t+=.5)f.step(.5,{x:0,z:0},true);
  assert.equal(f.riding,null,'tomt batteri parkerar');assert.ok(f.drain().some(e=>e.type==='ryde-park'&&e.reason==='battery'));
  // Långt ifrån alla scootrar: en läggs ut 22–42 m bort efter kontrollintervallet.
  const nav=new CityNavigation(blocked);// som i spelet: snäpp till närmaste gångbara nod
  const g=new RydeFleet({snap:p=>{const q=nav.point(p);return {x:q.x,z:q.z};},slowAt:pedestrianAt,walkable:p=>!blocked(p.x,p.z)});let far=null;
  for(let x=-280;x<=400&&!far;x+=10)for(let z=-800;z<=600&&!far;z+=10)if(!blocked(x,z)&&!g.nearest({x,z},RYDE.nearRadius+10))far={x,z};
  assert.ok(far,'det finns platser långt från alla scootrar');
  g.step(RYDE.respawnEvery+.1,far);const drop=g.drain().find(e=>e.type==='ryde-drop');
  assert.ok(drop&&drop.distance>=12&&drop.distance<=45,'drop '+JSON.stringify({drop,far}));
  assert.ok(g.nearest(far,45),'scootern ligger nu nära');assert.equal(blocked(drop.x,drop.z),false);
});
