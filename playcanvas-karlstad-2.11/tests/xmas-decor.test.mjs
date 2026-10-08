import test from 'node:test';
import assert from 'node:assert/strict';
import {STALLS,FIRS,TOMTE_SPOTS,STALL,xmasColliders} from '../xmas/xmas-decor-data.mjs';
import {INTRO,TREE,TORGET_PROPS,distanceToPath} from '../xmas/xmas-layout.mjs';

const rectDistance=(r,p)=>{const dx=Math.max(r.minx-p.x,0,p.x-r.maxx),dz=Math.max(r.minz-p.z,0,p.z-r.maxz);return Math.hypot(dx,dz);};
const walked=[{x:INTRO.spawn.x,z:INTRO.spawn.z},...INTRO.packages.filter(p=>p.kind==='regular'),{x:INTRO.tomte.x,z:INTRO.tomte.z}];

test('åtta marknadsstånd med exakta kollisionsrutor och unika skyltar',()=>{
  assert.equal(STALLS.length,8);
  assert.equal(new Set(STALLS.map(s=>s.kind.sign)).size,8);
  for(const s of STALLS){
    assert.ok(Math.abs((s.rect.maxx-s.rect.minx)*(s.rect.maxz-s.rect.minz)-STALL.w*STALL.d)<1e-6,s.id+' ruta');
    assert.equal(Math.abs(s.fx)+Math.abs(s.fz),1,s.id+' vänder sig åt ett håll');
  }
});
test('inget stånd, ingen gran och ingen kollisionsruta ligger i närheten av paket, spawn, tomte eller grundspelets föremål',()=>{
  const targets=[...INTRO.packages,{x:INTRO.spawn.x,z:INTRO.spawn.z},{x:INTRO.tomte.x,z:INTRO.tomte.z}];
  for(const c of xmasColliders()){
    for(const t of targets){
      const r=t.x===INTRO.tomte.x&&t.z===INTRO.tomte.z?5:2.4;
      assert.ok(rectDistance(c,t)>=r,c.osm+' för nära '+(t.id||'mål')+' ('+rectDistance(c,t).toFixed(1)+' m)');
    }
    for(const [px,pz] of TORGET_PROPS)assert.ok(rectDistance(c,{x:px,z:pz})>=1.4,c.osm+' för nära bänk/lykta '+px+','+pz);
  }
  for(const f of FIRS){
    assert.ok(distanceToPath(f,walked)>=5,f.id+' ligger på spåret');
    for(const t of INTRO.packages)assert.ok(Math.hypot(f.x-t.x,f.z-t.z)>=3,f.id+' ligger vid paket '+t.id);
    for(const [px,pz] of TORGET_PROPS)assert.ok(Math.hypot(f.x-px,f.z-pz)>=2.5,f.id+' ligger vid bänk/lykta');
  }
});
test('granens stam och stånden är fasta föremål av samma slag som grundspelets partnerytor',()=>{
  const list=xmasColliders();
  assert.equal(list.length,11); // granen, åtta stånd och två portalstolpar
  const tree=list[0];
  assert.ok(tree.minx<TREE.x&&tree.maxx>TREE.x&&tree.minz<TREE.z&&tree.maxz>TREE.z);
  for(const c of list){assert.equal(c.precise,false);assert.ok(c.minx<c.maxx&&c.minz<c.maxz);assert.ok(Number.isFinite(c.dist)&&c.h>0);}
});
test('granarna är åtta (eller nästan) och inga två ligger tätt',()=>{
  assert.ok(FIRS.length>=6,'minst sex granar, fick '+FIRS.length);
  for(let i=0;i<FIRS.length;i++)for(let j=i+1;j<FIRS.length;j++)assert.ok(Math.hypot(FIRS[i].x-FIRS[j].x,FIRS[i].z-FIRS[j].z)>=6.9);
});
test('tomtespots: vid granen, vid de små granarna och en säljare per stånd, alla fria från paketen',()=>{
  assert.equal(TOMTE_SPOTS.filter(s=>s.kind==='ground').length,5);
  assert.equal(TOMTE_SPOTS.filter(s=>s.kind==='fir').length,FIRS.length);
  assert.equal(TOMTE_SPOTS.filter(s=>s.kind==='stall').length,8);
  assert.equal(new Set(TOMTE_SPOTS.map(s=>s.id)).size,TOMTE_SPOTS.length,'unika id');
  for(const s of TOMTE_SPOTS)for(const p of INTRO.packages)assert.ok(Math.hypot(s.x-p.x,s.z-p.z)>=1.9,s.id+' står vid paket '+p.id);
});

import {facadeSpots,stringBulbs,FACADE} from '../xmas/xmas-decor-data.mjs';
import {flakeSeed,flakePosition,SNOW_BOX} from '../xmas/xmas-snowfall.js';
const square=(cx,cz,w,d,h,osm)=>({osm,h,height:h,cx,cz,polygon:[[cx-w/2,cz-d/2],[cx+w/2,cz-d/2],[cx+w/2,cz+d/2],[cx-w/2,cz+d/2]]});
test('fasadutsmyckning väljer bara väggar som vetter mot torget, med utåtriktad normal',()=>{
  const west=square(-60,0,20,30,16,'b1'),north=square(0,-70,40,16,14,'b2'),far=square(400,400,30,30,20,'far'),low=square(-40,40,20,10,4,'low');
  const r=facadeSpots([west,north,far,low]);
  assert.ok(r.strings.length>=2);
  for(const s of r.strings){assert.ok(s.nx*(0-s.mx)+s.nz*(0-s.mz)>0,'slingan vetter mot torget');assert.ok(Math.hypot(s.mx,s.mz)<=FACADE.maxDist);assert.notEqual(s.id,'far');assert.notEqual(s.id,'low');}
  assert.ok(r.windows.length>=2);
  for(const w of r.windows){assert.ok(w.nx*(0-w.x)+w.nz*(0-w.z)>0);assert.ok(w.v>=0&&w.v<3);}
  assert.ok(r.roofs.length>=1&&r.roofs.every(o=>o.y>=10));
});
test('fasadvalet är deterministiskt och ignorerar julens och partnernas egna rutor',()=>{
  const a=[square(-60,0,20,30,16,'b1'),square(0,-70,40,16,14,'b2'),{...square(-30,10,5,5,20,'xmas-tree')},{...square(30,10,5,5,20,'partner-x')}];
  assert.deepEqual(facadeSpots(a),facadeSpots(a));
  const r=facadeSpots(a);assert.ok(![...r.strings,...r.roofs].some(s=>/xmas|partner/.test(s.id+(s.osm||''))));
});
test('lampslingor: jämna avstånd, hänger mellan fästena och går att räkna',()=>{
  const s={ax:0,az:0,bx:20,bz:0,len:20,y:3.3};
  const b=stringBulbs(s);
  assert.ok(b.length>=12&&b.length<=25);
  for(const q of b){assert.ok(q.y<=3.3&&q.y>=3.3-.4);}
  assert.equal(b[0].x,0);assert.ok(Math.abs(b.at(-1).x-20)<1e-9);
});
test('snöflingor stannar i lådan runt kameran och faller nedåt',()=>{
  const cam={x:12.5,y:1.7,z:-3};
  for(let i=0;i<100;i++){
    const s=flakeSeed(i,100);const p=flakePosition(s,3.2,cam.x,cam.y,cam.z,{});
    assert.ok(Math.abs(p.x-cam.x)<=SNOW_BOX.w/2+1e-9&&Math.abs(p.z-cam.z)<=SNOW_BOX.w/2+1e-9);
    assert.ok(p.y>=cam.y-SNOW_BOX.h*.35-1e-9&&p.y<=cam.y+SNOW_BOX.h*.65+1e-9);
    assert.ok(s.size>=.07&&s.size<=.16&&s.fall>0);
  }
  // framåt i tiden: en fling har ramlat (eller slagit runt uppifrån)
  const s=flakeSeed(7,100),a=flakePosition(s,1,0,0,0,{}),b=flakePosition(s,1.1,0,0,0,{});
  assert.ok(b.y<a.y||b.y-a.y>SNOW_BOX.h*.5);
});
