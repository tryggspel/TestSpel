#!/usr/bin/env node
// Verifiering i riktig webbläsare av O'Learys Karlstad (2.21.1-xmas.14): dörren på torget, lokalen, stationerna, de fem aktiviteterna (spelade med fingerdrag),
// femkampen, FBK-tipset och vägen ut igen.
// Startar det riktiga spelet i headless Chromium med en egen liten webbserver, låter en bot följa Termosjaktens mål i speltid, klickar på gränssnittet och kontrollerar att spelet svarar rätt.
// Avslutar med kod 1 om något avviker. Sparar skärmbilder om SHOTS=katalog anges.
//
//   node tools/xmas-flow/olearys.mjs        Env: PLAYWRIGHT=/väg/playwright/index.mjs  PLAYCANVAS=/väg/playcanvas.mjs  CHROME=/väg/chromium  VIEW=414x896m  SHOTS=katalog
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om bildfrekvens, ljud i öronen eller känsla på en riktig telefon.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const SHOTS=process.env.SHOTS||'',V=(process.env.VIEW||'414x896m').match(/(\d+)x(\d+)(m?)/);
const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.txt':'text/plain'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://x');const p=path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/,'');
  let file=path.join(root,p);if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end('nej');return;}
  res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const ORIGIN=`http://127.0.0.1:${server.address().port}`;
const {dailyFor}=await import(pathToFileURL(path.join(root,'xmas/xmas-daily.mjs')).href);
const {dayOf}=await import(pathToFileURL(path.join(root,'xmas/xmas-meta.mjs')).href);

const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},...(V[3]?{hasTouch:true,isMobile:true}:{}),deviceScaleFactor:1});
// En spelare som redan gjort första uppdraget (så att hela menyn syns).
const seed={'karlstad-xmas:save:1':{v:1,stamps:{intro:1700000000000},records:{},totals:{packages:14,bonus:1,points:400,runs:1},opts:{weather:'light'},intro:{done:true},rush:{cleared:0,stars:{},best:{},bestStreak:0},zombies:{cleared:0,best:{}},name:'',friends:[]}};
await ctx.addInitScript(s=>{if(!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');for(const [k,v] of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));}},seed);
const page=await ctx.newPage(),errs=[];
page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200));});
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
await page.route(/\/app\.js/,r=>{
  if(!r.request().url().startsWith(ORIGIN))return r.continue();
  const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__blocked=blocked;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};window.__pos=()=>{const p=player.getPosition();return [p.x,p.z]};window.__turbo=()=>lastRound?.turboScale?.()||1;app.on('update',update);");
  r.fulfill({contentType:'text/javascript',body:s});
});
let failed=0;
const check=(name,ok,detail='')=>{if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};
const wait=ms=>page.waitForTimeout(ms),ev=(fn,a)=>page.evaluate(fn,a);
const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+'.png')});}};
const click=id=>ev(i=>document.getElementById(i)?.click(),id);
const rnd=(a,b)=>a+Math.random()*(b-a);
const until=async(fn,max=60)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await ev(fn))return true;await wait(250);}return false;};

await page.goto(ORIGIN+'/?debug&ljus=dag');
await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});
await wait(900);
const {VENUE,STATIONS,FBK_MATCHES}=await import(pathToFileURL(path.join(root,'xmas/olearys-data.mjs')).href);
const tp=async(x,z,yaw,ms=1200,pitch=-4)=>{await ev(([x,z,y,pt])=>window.__tp(x,z,y,pt),[x,z,yaw,pitch]);await wait(ms);};
const X=()=>ev(()=>window.KarlstadDebug.journey().xmas.snapshot());
const G=()=>ev(()=>{const g=window.KarlstadDebug.journey().xmas.olGames._game();return g?{id:g.id,phase:g.phase,o:g.origin?g.origin():null,w:g.w,h:g.h}:null;});
const canvasBox=()=>ev(()=>{const r=document.querySelector('.ol-canvas').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};});
// en slangbella: ned vid ursprunget, dra (dx,dy) px, släpp
async function fling(dx,dy){const g=await G();if(!g||!g.o)return false;const b=await canvasBox();const x=b.x+g.o.x,y=b.y+g.o.y;await page.mouse.move(x,y);await page.mouse.down();for(let i=1;i<=6;i++){await page.mouse.move(x+dx*i/6,y+dy*i/6);await wait(16);}await page.mouse.up();return true;}
const panelText=()=>ev(()=>{const p=document.querySelector('.ol-panel');return p&&!p.hidden?p.textContent:'';});
async function playUntilDone(id,step,max=90){const t0=Date.now();while(Date.now()-t0<max*1000){const g=await G();if(!g||g.id!==id)return 'inget spel';if(g.phase==='done')return 'klar';await step(g);await wait(250);}return 'tiden';}

// O0: menyn
check('O0 startvyn har knappen O\'LEARYS',/O'LEARYS/.test(await ev(()=>document.getElementById('xmasOlearys')?.textContent||'')));
// O1: fri julvandring, gå till dörren
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(1500);
await tp(VENUE.street.x,VENUE.street.z-6,180,800);await shot('o00-entren-ute');
await tp(VENUE.street.x,VENUE.street.z-2.4,180,1200);
const p1=await ev(()=>{const b=document.querySelector('.ol-prompt');return {vis:!!b&&!b.hidden,text:b?.textContent||''};});
check('O1 vid dörren på torget: knappen GÅ IN PÅ O\'LEARYS',p1.vis&&/GÅ IN PÅ O'LEARYS/.test(p1.text),JSON.stringify(p1));
await ev(()=>document.querySelector('.ol-prompt').click());await wait(1600);
const s2=await X();const pos2=await ev(()=>window.__pos());
check('O2 inne i lokalen: läget är O\'Learys, spelaren står innanför entrén och väggarna stänger',s2.mode==='venue'&&s2.olearys.inside&&Math.abs(pos2[0]-VENUE.origin.x)<3&&pos2[1]<VENUE.origin.z-1,JSON.stringify({mode:s2.mode,ol:s2.olearys,pos:pos2}));
const walls=await ev(([ox,oz])=>[window.__blocked(ox,oz+.3),window.__blocked(ox-17.4,oz-20),window.__blocked(ox+17.4,oz-20),window.__blocked(ox,oz-48.4),window.__blocked(ox,oz-10),window.__blocked(ox-13.4,oz-12)],[VENUE.origin.x,VENUE.origin.z]);
check('O2b väggarna och baren är fasta, golvet mitt i lokalen går att gå på',walls[0]&&walls[1]&&walls[2]&&walls[3]&&!walls[4]&&walls[5],JSON.stringify(walls));
// O2c: man kan gå inne i lokalen (lokalen ligger långt utanför kartan, där grundspelet annars räknar allt som vatten)
await tp(VENUE.origin.x,VENUE.origin.z-6,0,600);const w0=await ev(()=>window.__pos());
await page.keyboard.down('KeyW');await wait(900);await page.keyboard.up('KeyW');await wait(200);const w1=await ev(()=>window.__pos());
check('O2c det går att gå inne i lokalen',Math.hypot(w1[0]-w0[0],w1[1]-w0[1])>1.5,JSON.stringify({w0,w1}));
const snow=await ev(()=>window.KarlstadDebug.journey().xmas.snapshot().decor);
await shot('o01-entren-inne');
const O=VENUE.origin,views=[['o02-baren',-6,-6,-14,-12],['o03-biljard-shuffle',-6,-14,10,-24],['o04-bowling',-4,-28,-4,-46],['o05-sportvaggen',2,-10,-17,-12]];
for(const [n,x,z,tx,tz] of views){await tp(O.x+x,O.z+z,Math.atan2(-(tx-x),-(tz-z))*180/Math.PI,1200,-6);await shot(n);}
// O3: varje station ger sin knapp
const seen=[];for(const st of STATIONS){await tp(O.x+st.x,O.z+st.z,0,700);const t=await ev(()=>{const b=document.querySelector('.ol-prompt');return b&&!b.hidden?b.textContent:'';});if(t.includes(st.label))seen.push(st.id);}
check('O3 alla stationer ger sin knapp (bowling, shuffleboard, biljard, dart, straffar, femkampen, tipset, baren, karaoke)',seen.length===STATIONS.length,JSON.stringify(seen));
// O4: bowling, fem rutor med fingerdrag
const st=id=>STATIONS.find(s=>s.id===id);
await tp(O.x+st('bowling').x,O.z+st('bowling').z,0,700);await ev(()=>document.querySelector('.ol-prompt').click());await wait(600);
let g=await G();check('O4 BOWLING öppnar spelfönstret',!!g&&g.id==='bowling'&&!!g.o,JSON.stringify(g));
await shot('o06-bowling-sikta');
let rolls=0;const r4=await playUntilDone('bowling',async g=>{if(g.phase==='aim'&&g.o){await fling(rnd(-14,14),g.h*.22);rolls++;await wait(900);}},150);
const t4=await panelText();await shot('o07-bowling-klart');
check('O4b bowlingen går att spela klart (fem rutor) och resultatet visas',r4==='klar'&&/poäng på fem rutor/.test(t4)&&rolls>=5,JSON.stringify({r4,rolls,t4:t4.slice(0,80)}));
await ev(()=>window.KarlstadDebug.journey().xmas.olGames.close());
// O5: shuffleboard
await tp(O.x+st('shuffle').x,O.z+st('shuffle').z,0,700);await ev(()=>document.querySelector('.ol-prompt').click());await wait(600);
const r5=await playUntilDone('shuffle',async g=>{if(g.phase==='aim'&&g.o){await fling(0,g.h*rnd(.16,.24));await wait(400);}},120);
const t5=await panelText();await shot('o08-shuffle-klart');
check('O5 shuffleboard mot bartendern går att spela klart (fyra puckar var)',r5==='klar'&&/(vann|Oavgjort)/.test(t5),JSON.stringify({r5,t5:t5.slice(0,80)}));
await ev(()=>window.KarlstadDebug.journey().xmas.olGames.close());
// O6: dart
await tp(O.x+st('dart').x,O.z+st('dart').z,0,700);await ev(()=>document.querySelector('.ol-prompt').click());await wait(600);
const r6=await playUntilDone('dart',async g=>{if(g.phase==='aim'){const b=await canvasBox();await page.mouse.move(b.x+b.w/2,b.y+b.h*.8);await page.mouse.down();await wait(700);await page.mouse.up();await wait(200);}},90);
await wait(1200);const t6=await panelText();await shot('o09-dart-klart');
check('O6 dart: nio pilar och summan visas',r6==='klar'&&/Nio pilar/.test(t6),JSON.stringify({r6,t6:t6.slice(0,60)}));
await ev(()=>window.KarlstadDebug.journey().xmas.olGames.close());
// O7: straffar
await tp(O.x+st('straff').x,O.z+st('straff').z,0,700);await ev(()=>document.querySelector('.ol-prompt').click());await wait(600);
const r7=await playUntilDone('straff',async g=>{if(g.phase==='aim'&&g.o){const b=await canvasBox();const x=b.x+g.o.x,y=b.y+g.o.y,tx=rnd(-1,1)*Math.min(g.w*.28,150);await page.mouse.move(x,y);await page.mouse.down();for(let i=1;i<=6;i++){await page.mouse.move(x+tx*i/6*.4,y-g.h*.25*i/6);await wait(16);}await page.mouse.up();await wait(400);}},90);
const t7=await panelText();await shot('o10-straff-klart');
check('O7 straffar: fem skott och antalet mål visas',r7==='klar'&&/mål på 5 straffar/.test(t7),JSON.stringify({r7,t7:t7.slice(0,60)}));
await ev(()=>window.KarlstadDebug.journey().xmas.olGames.close());
// O8: biljard (siktar rakt uppåt mot racket, med lite variation)
await tp(O.x+st('biljard').x,O.z+st('biljard').z,0,700);await ev(()=>document.querySelector('.ol-prompt').click());await wait(600);
await shot('o11-biljard');
const r8=await playUntilDone('biljard',async g=>{if(g.phase==='aim'&&g.o){await fling(rnd(-40,40),g.h*rnd(.18,.28));await wait(500);}},150);
const t8=await panelText();
check('O8 biljard går att spela klart (alla sex eller 24 stötar)',r8==='klar'&&/(Alla sex|Du sänkte)/.test(t8),JSON.stringify({r8,t8:t8.slice(0,60)}));
await ev(()=>window.KarlstadDebug.journey().xmas.olGames.close());
const best=await ev(()=>window.KarlstadDebug.journey().xmas.olGames.state.best);
check('O8b resultaten sparas (bästa per gren)',['bowling','shuffle','dart','straff','biljard'].every(k=>Number.isFinite(best[k])),JSON.stringify(best));
// O9: FBK-tipset
await tp(O.x+st('tips').x,O.z+st('tips').z,0,700);await ev(()=>document.querySelector('.ol-prompt').click());await wait(600);
const t9=await panelText();await shot('o12-fbk-tipset');
check('O9 tipset listar FBK:s decembermatcher och säger att det är på skoj utan pengar, priser, XP eller lotter',FBK_MATCHES.every(m=>t9.includes(m.home)&&t9.includes(m.away))&&/inga pengar/.test(t9)&&/varken XP eller lotter/.test(t9),t9.slice(0,140));
await ev(()=>{const b=[...document.querySelectorAll('.ol-pick')].find(x=>x.textContent==='1');b.click();});await wait(300);
const tipSaved=await ev(()=>JSON.parse(localStorage.getItem('karlstad-xmas:olearys:1')).tips);
check('O9b ett tips sparas',Object.keys(tipSaved).length===1&&Object.values(tipSaved)[0].pick==='1',JSON.stringify(tipSaved));
await ev(()=>window.KarlstadDebug.journey().xmas.olGames.close());
// O10: femkampen startar och kan avbrytas
await tp(O.x+st('penta').x,O.z+st('penta').z,0,700);await ev(()=>document.querySelector('.ol-prompt').click());await wait(500);
const t10=await panelText();check('O10 femkampens podium visar rekordet och startknappen',/FEMKAMPEN/.test(t10)&&/STARTA FEMKAMPEN/.test(t10),t10.slice(0,80));
await ev(()=>[...document.querySelectorAll('.ol-panel button')].find(b=>/STARTA FEMKAMPEN/.test(b.textContent)).click());await wait(500);
g=await G();check('O10b femkampen börjar med bowling',g&&g.id==='bowling',JSON.stringify(g));
await ev(()=>[...document.querySelectorAll('.ol-btns button')].find(b=>b.textContent==='AVSLUTA').click());await wait(300);
check('O10c att avbryta femkampen räknas inte',/AVBRUTEN/.test(await panelText()));
await ev(()=>window.KarlstadDebug.journey().xmas.olGames.close());
// O11: ut igen
await tp(O.x+VENUE.door.x,O.z-1.6,180,900);
const p11=await ev(()=>{const b=document.querySelector('.ol-prompt');return b&&!b.hidden?b.textContent:'';});
check('O11 vid entrén inne: GÅ UT TILL TORGET',/GÅ UT TILL TORGET/.test(p11),p11);
await ev(()=>document.querySelector('.ol-prompt').click());await wait(1800);
const s11=await X(),pos11=await ev(()=>window.__pos());
check('O11b ute på torget igen i fri julvandring, vid dörren',s11.mode==='cozy'&&!s11.olearys.inside&&Math.hypot(pos11[0]-VENUE.outside.x,pos11[1]-VENUE.outside.z)<2,JSON.stringify({mode:s11.mode,pos:pos11}));
const xp=await ev(()=>window.KarlstadDebug.journey().xmas.meta.state.days);
check('O12 aktiviteterna gav XP (högst åtta om dagen)',Object.values(xp).some(d=>d.ol>=1&&d.ol<=8),JSON.stringify(Object.values(xp).map(d=>d.ol)));
check('O13 inga fel i sidan',errs.length===0,errs.slice(0,4).join(' | '));
console.log(failed?`\n${failed} kontroll(er) FEL`:'\nAlla kontroller OK');
await browser.close();server.close();
process.exit(failed?1:0);
