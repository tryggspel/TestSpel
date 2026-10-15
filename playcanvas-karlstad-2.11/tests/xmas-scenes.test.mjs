// Julscenerna (Sandgrund och Mariebergsskogen) och båtresans vinterbild (xmas/xmas-boat-art.js). Ritfunktionerna provas mot ett låtsas-2D-sammanhang (inga bilder, ingen webbläsare);
// själva utseendet är kontrollerat i Chromium (tools/xmas-flow/missions.mjs och skärmbilder).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SCENES,SANDGRUND_SCENE,MARIEBERG_SCENE} from '../xmas/xmas-decor-data.mjs';
import {winterBackdrop,winterStrips,snowfall,iceFloes,boatLights,santaHat,drawSleigh,drawIcebreaker,WINTER_QUIPS,WINTER_LABEL,WINTER_SPOT} from '../xmas/xmas-boat-art.js';
import {drawXmasVisitorExtras,drawTomteZombiePose} from '../xmas/xmas-zombie-art.js';
import {MARIEBERG} from '../city-south-space.mjs';

const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
// Ett 2D-sammanhang som bara räknar anrop: gradienter får addColorStop, allt annat är en funktion som inte gör något. Egenskaper kan sättas fritt.
function fakeCtx(){
  const calls=[],ctx=new Proxy({calls},{
    get:(t,k)=>{if(k in t)return t[k];if(k==='createLinearGradient'||k==='createRadialGradient')return()=>({addColorStop(){}});return(...a)=>{calls.push(k);};},
    set:(t,k,v)=>{t[k]=v;return true;}
  });
  return ctx;
}
const strip=(w,h)=>{const ctx=fakeCtx();return {width:w,height:h,getContext:()=>ctx,ctx};};

test('julscenerna har sina platser: Sandgrund vid galleriets plats och Mariebergsskogen vid bryggan, med granar, slingor, presenter, snögubbar, lyktor och en banderoll',()=>{
  assert.deepEqual(SCENES.map(s=>s.name),['Sandgrund','Mariebergsskogen']);
  assert.ok(Math.hypot(SANDGRUND_SCENE.center.x+13,SANDGRUND_SCENE.center.z+397)<8,'nära uppdragets utgångsplats (−13, −397)');
  assert.deepEqual({x:MARIEBERG_SCENE.center.x,z:MARIEBERG_SCENE.center.z},{x:MARIEBERG.x,z:MARIEBERG.z},'Mariebergsskogens scen ligger vid bryggan där båten lägger till');
  for(const sc of SCENES){
    assert.ok(sc.firs.length>=6&&sc.gifts.length>=3&&sc.snowmen.length>=2&&sc.lanterns.length>=2,sc.name);
    for(const f of sc.firs){assert.ok(f.h>=4&&f.h<=6.5,'granens höjd '+f.h);assert.ok(Math.hypot(f.dx,f.dz)<40,'granen ligger nära platsen');}
    for(const [a,b] of sc.strings){assert.ok(a<sc.firs.length&&b<sc.firs.length&&a!==b,'slingans fästen finns');assert.ok(Math.hypot(sc.firs[a].dx-sc.firs[b].dx,sc.firs[a].dz-sc.firs[b].dz)<16,'slingans spann är rimligt kort');}
    assert.ok(sc.banner.lines.length>=2&&sc.banner.lines.every(t=>t===t.toUpperCase()&&t.length<=18),'banderollens text: '+sc.banner.lines);
    assert.ok([0,90].includes(sc.banner.yaw));assert.ok(sc.visible>=100&&sc.visible<=250,'ritas bara i närheten: '+sc.visible);
    // presenter och snögubbar står inte ovanpå varandra
    const pts=[...sc.gifts,...sc.snowmen];for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++)assert.ok(Math.hypot(pts[i].dx-pts[j].dx,pts[i].dz-pts[j].dz)>=3,`${sc.name}: två föremål ligger ovanpå varandra`);
  }
  assert.deepEqual(MARIEBERG_SCENE.banner.lines,['GOD JUL','MARIEBERGSSKOGEN']);assert.deepEqual(SANDGRUND_SCENE.banner.lines,['JULVERNISSAGE','SANDGRUND']);
});
test('decor bygger scenerna som egna entiteter som bara är på i närheten (och ändrar inte Stora Torgets meshar)',()=>{
  const d=read('xmas/xmas-decor.js');
  assert.match(d,/function buildScene\(S,L,sc\)/);assert.match(d,/for\(const o of scenes\)buildScene\(o\.S,o\.L,o\.sc\)/);
  assert.match(d,/scenesNear\(p\)/);assert.match(d,/o\.root\.enabled=near/);assert.match(d,/root\.enabled=false/,'av tills man kommer nära');
  assert.match(d,/lightMats\[g\]/,'samma material som torgets ljus, så de blinkar tillsammans');
});
test('båtresans vinterbild: alla ritfunktioner kör utan fel och ritar något, och snöfallet är en ren funktion av tiden',()=>{
  const g=fakeCtx(),w=900,h=560;
  winterBackdrop(g,w,h);assert.ok(g.calls.length>100,'himmel, stjärnor, norrsken, måne och vatten: '+g.calls.length);
  const far=strip(w*2,Math.ceil(h*.2)),near=strip(w*2,Math.ceil(h*.2));winterStrips(far,near,w,h);
  assert.ok(far.ctx.calls.length>50&&near.ctx.calls.length>200,'kullar, stad, hus, bryggor och granar: '+far.ctx.calls.length+'/'+near.ctx.calls.length);
  for(const t of [0,3.3,12,35]){const c=fakeCtx();snowfall(c,t,w,h);assert.equal(c.calls.filter(k=>k==='arc').length,70,'70 flingor');const a=fakeCtx(),b=fakeCtx();snowfall(a,t,w,h);snowfall(b,t,w,h);assert.deepEqual(a.calls,b.calls);}
  const ic=fakeCtx();iceFloes(ic,5,w,h);assert.equal(ic.calls.filter(k=>k==='ellipse').length,18,'sex isflak med tre lager');iceFloes(fakeCtx(),5,w,h,true);
  const bl=fakeCtx();boatLights(bl,2,w,h);assert.ok(bl.calls.filter(k=>k==='arc').length>60,'slingor och en gran med ljus');
  for(const col of ['#d33a3a','#2f7a4f','#b3243a']){const c=fakeCtx();santaHat(c,col);assert.ok(c.calls.length>10);}
  const sl=fakeCtx();drawSleigh(sl,{x:100,y:80,r:45},3);assert.ok(sl.calls.length>60,'släde, renar och tomte');drawIcebreaker(fakeCtx(),{x:100,y:200,r:40});
  for(const f of [(c)=>drawXmasVisitorExtras(c,'#e9b978'),(c)=>drawXmasVisitorExtras(c,'#75bbb5'),(c)=>drawXmasVisitorExtras(c,'okänd')]){const c=fakeCtx();f(c);assert.ok(c.calls.length>10);}
  // Zombie-Lerin (artist) får tomteluva och sjal men behåller grundspelets text
  const z=fakeCtx();drawTomteZombiePose(z,'artist',1);assert.ok(z.calls.length>40);
});
test('texterna i vinterbilden finns för alla varelser och har samma antal som sommarbildens',()=>{
  const b=read('boat-ride.js'),quips=(b.match(/const QUIPS=\[(.*?)\];/s)[1].match(/'”/g)||[]).length;
  assert.equal(WINTER_QUIPS.length,quips,'lika många repliker som grundspelets');
  for(const k of ['gull','boat','fish','sleigh'])assert.ok(WINTER_SPOT[k]&&/!$/.test(WINTER_SPOT[k]),k);
  assert.match(WINTER_LABEL,/JULBÅTEN/);
});
test('grundspelets sommarbild är kvar: vinterbilden gäller bara när winter() säger det, och julbygget säger det',()=>{
  const b=read('boat-ride.js'),lr=read('last-round.js');
  assert.match(b,/winter=\(\)=>false/,'standardvärdet är sommar');
  for(const re of [/if\(winter\(\)\)winterBackdrop\(g,w,h\);else\{g\.fillStyle='#abdadd'/,/if\(winter\(\)\)\{winterStrips\(far,near,w,h\);return;\}/,/if\(winter\(\)\)iceFloes/,/if\(winter\(\)\)boatLights/,/if\(winter\(\)\)snowfall/,/if\(winter\(\)\)santaHat/])assert.match(b,re,String(re));
  assert.match(lr,/winter:\(\)=>!!xmas/);
});
test('texterna i Julvernissagen är julens: namn, mål, hälsning och resultatrubrik',()=>{
  const lr=read('last-round.js');
  assert.match(lr,/xmas&&selectedMission==='sandgrund'\?'JULVERNISSAGEN'/);assert.match(lr,/Färgskölden släpper först när alla är i säkerhet/);
  assert.match(lr,/'GOD JUL PÅ SANDGRUND!'/);assert.match(lr,/GOD JUL! JAG FÖLJER DIG!/);
});
