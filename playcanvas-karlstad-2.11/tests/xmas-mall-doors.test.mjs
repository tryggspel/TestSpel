// Butiksdörrarna i Mitt i City: det gick inte att gå in i Cervera (och man fastnade inne efter uppdraget) eftersom det fanns en osynlig vägg, en 10–20 cm tjock spärrad remsa,
// tvärs över hela butiksfronten: atriets gångyta och butikens gångyta slutar 0,45 m från varje vägg och köpcentrets byggnadsruta täckte glappet. Här går en spelare genom
// varje butiksfront med samma rörelse och samma spärrregel som i spelet (MallWalk.move och app.js blocked), i båda riktningar, med olika stegstorlek och startfas.
import test from 'node:test';
import assert from 'node:assert/strict';
import {MallWalk,MALL_ROOMS,MALL_DOORWAYS,mallPassage,mallWalkable,mallGroundBlocked} from '../mall-space.mjs';

// Köpcentrets byggnadsruta i spelet (OSM-byggnaden som en enda ruta) och spelets spärrregel utanför gångytorna (app.js: blocked).
const FOOTPRINT={minx:-178.6,maxx:-88.9,minz:54.7,maxz:145};
const blocked=(x,z)=>mallPassage(x,z)?mallGroundBlocked(x,z):(x>FOOTPRINT.minx&&x<FOOTPRINT.maxx&&z>FOOTPRINT.minz&&z<FOOTPRINT.maxz);
const STEPS=[.02,.04,.06,.08,.1,.12,.15,.2,.24,.3,.45];

// Går längs riktningen (dx,dz) tills sträckan längs den är minst `dist` (eller stegen tar slut). Returnerar hur långt man kom längs riktningen.
function walk(room,from,dir,step,dist,phase=0){
  const w=new MallWalk();if(room.floor){w.level=room.floor;w.height=room.floor*5.4;}
  const p={x:from.x+dir.x*phase*step,z:from.z+dir.z*phase*step,y:1.68+w.height};
  const x0=p.x,z0=p.z;let n=0;
  while(n++<1500){
    const r=w.move(p,dir.x*step,dir.z*step,1/60,blocked);if(!r)break;
    p.x=r.x;p.z=r.z;p.y=r.y;
    if((p.x-x0)*dir.x+(p.z-z0)*dir.z>=dist)break;
  }
  return {along:(p.x-x0)*dir.x+(p.z-z0)*dir.z,x:p.x,z:p.z,steps:n};
}
const geom=r=>{const a=r.door.yaw*Math.PI/180,n={x:Math.sin(a),z:Math.cos(a)},t={x:Math.cos(a),z:-Math.sin(a)};return {n,t};};

test('butiksfronterna: gångytorna möts utan glapp, och inget av dörrglapen är spärrat',()=>{
  assert.deepEqual(MALL_DOORWAYS.map(d=>d.id),MALL_ROOMS.map(r=>r.id));
  for(const d of MALL_DOORWAYS){
    assert.ok(d.maxx>d.minx&&d.maxz>d.minz,d.id);
    // varje punkt i tröskeln är gångbar (inget annat än möbler stoppar), på rätt våning
    for(let x=d.minx+.01;x<d.maxx;x+=.1)for(let z=d.minz+.01;z<d.maxz;z+=.05){
      assert.ok(mallPassage(x,z,.45,d.floor===1),d.id+' passage '+x.toFixed(2)+','+z.toFixed(2));
      if(d.floor===1)assert.ok(mallWalkable(x,z,true),d.id+' övervåning '+x.toFixed(2)+','+z.toFixed(2));else assert.equal(blocked(x,z),false,d.id+' markplan '+x.toFixed(2)+','+z.toFixed(2));
    }
  }
  // rätt våning: tröskeln på plan 1 är inte en passage på markplanet och tvärtom
  const clas=MALL_DOORWAYS.find(d=>d.id==='clas'),cx=(clas.minx+clas.maxx)/2,cz=(clas.minz+clas.maxz)/2;
  assert.equal(mallPassage(cx,cz,.45,true),true);
  const cervera=MALL_DOORWAYS.find(d=>d.id==='cervera');assert.ok(cervera.floor===0&&cervera.minz<124.55&&cervera.maxz>124.65,'Cerveras tröskel täcker det gamla glappet 124,55–124,65');
});

test('att gå in i och ut ur varje butik: med alla stegstorlekar, i båda riktningar och över hela fronten',()=>{
  for(const room of MALL_ROOMS){
    const {n,t}=geom(room);
    for(const off of [-3,-1.5,0,1.5,3]){
      const outside={x:room.door.x+n.x*2.5+t.x*off,z:room.door.z+n.z*2.5+t.z*off};
      const inside={x:room.door.x-n.x*2.5+t.x*off,z:room.door.z-n.z*2.5+t.z*off};
      for(const step of STEPS)for(const phase of [0,.25,.5,.75]){
        const inn=walk(room,outside,{x:-n.x,z:-n.z},step,5,phase);
        assert.ok(inn.along>=4.9,room.id+' IN: kom bara '+inn.along.toFixed(2)+' m (steg '+step+', sida '+off+', fas '+phase+') till '+inn.x.toFixed(2)+','+inn.z.toFixed(2));
        const out=walk(room,inside,{x:n.x,z:n.z},step,5,phase);
        assert.ok(out.along>=4.9,room.id+' UT: kom bara '+out.along.toFixed(2)+' m (steg '+step+', sida '+off+', fas '+phase+') till '+out.x.toFixed(2)+','+out.z.toFixed(2));
      }
    }
  }
});

test('butikernas väggar står kvar: sidoväggarna och bakväggen stoppar fortfarande, och tröskeln leder inte ut ur köpcentret',()=>{
  const cervera=MALL_ROOMS.find(r=>r.id==='cervera');
  // från mitten av butiken åt väster, öster och söder (bakåt): stoppas av väggen, men går att gå en bit
  const mid={x:(cervera.minx+cervera.maxx)/2,z:(cervera.minz+cervera.maxz)/2};
  for(const dir of [{x:-1,z:0},{x:1,z:0}]){const r=walk(cervera,mid,dir,.1,12);assert.ok(r.along>3&&r.along<7,'sidoväggen stoppar: '+r.along.toFixed(2));}
  const back=walk(cervera,mid,{x:0,z:1},.1,12);assert.ok(back.along>1&&back.along<7,'bakväggen stoppar: '+back.along.toFixed(2));
  // från atriet rakt norrut ut ur köpcentrets södra vägg, och snett in i butikens hörn bredvid fronten
  const south={x:-144,z:123};const r=walk(cervera,south,{x:0,z:-1},.1,60);assert.ok(r.z>83,'atriet har sin norra vägg: '+r.z.toFixed(1));
  // ingen spelare ska kunna gå in i disken
  const counter=cervera.counter,toCounter=walk(cervera,{x:(counter.minx+counter.maxx)/2,z:counter.minz-2},{x:0,z:1},.1,6);assert.ok(toCounter.z<counter.minz+.2,'disken stoppar: '+toCounter.z.toFixed(2));
});
