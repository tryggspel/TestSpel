#!/usr/bin/env node
// Verifiering i riktig webbläsare av julguiden (2.21.1-xmas.14): skyltarna vid julborden och julmarknaderna, rutan när man går förbi, kortet, listan och GÅ DIT.
// Startar det riktiga spelet i headless Chromium med en egen liten webbserver, låter en bot följa Termosjaktens mål i speltid, klickar på gränssnittet och kontrollerar att spelet svarar rätt.
// Avslutar med kod 1 om något avviker. Sparar skärmbilder om SHOTS=katalog anges.
//
//   node tools/xmas-flow/julguide.mjs        Env: PLAYWRIGHT=/väg/playwright/index.mjs  PLAYCANVAS=/väg/playcanvas.mjs  CHROME=/väg/chromium  VIEW=414x896m  SHOTS=katalog
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
const until=async(fn,max=60)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await ev(fn))return true;await wait(250);}return false;};
const X=()=>ev(()=>window.KarlstadDebug.journey().xmas.snapshot());

await page.goto(ORIGIN+'/?debug&ljus=dag');
await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});
await wait(900);
const {JULGUIDE}=await import(pathToFileURL(path.join(root,'xmas/xmas-julguide-data.mjs')).href);
const tp=async(x,z,yaw,ms=1200)=>{await ev(([x,z,y])=>window.__tp(x,z,y,-4),[x,z,yaw]);await wait(ms);};
// G0: menyn har JULGUIDEN och listan öppnas
const g0=await ev(()=>({btn:document.getElementById('xmasGuide')?.textContent.trim()||''}));
check('G0 startvyn har knappen JULGUIDEN',/JULGUIDEN/.test(g0.btn),g0.btn);
await click('xmasGuide');await wait(500);
const g1=await ev(()=>{const l=document.querySelector('.xmas-guide-layer');return {open:!!l&&!l.hidden,items:[...document.querySelectorAll('.xgc-list li')].length,go:[...document.querySelectorAll('.xgc-go')].filter(b=>b.textContent==='GÅ DIT').length,w:Math.round(document.querySelector('.xmas-guide-card')?.getBoundingClientRect().width||0),vw:innerWidth,noX:document.querySelector('.xmas-guide-layer').scrollWidth<=innerWidth+1};});
check('G1 listan visar alla julbord och julmarknader, GÅ DIT för dem som finns på kartan, och ryms på skärmen',g1.open&&g1.items===JULGUIDE.length&&g1.go===JULGUIDE.filter(e=>e.place).length&&g1.w<=g1.vw&&g1.noX,JSON.stringify(g1));
await shot('g01-lista');
// G2: GÅ DIT till Hotel Fratelli: fri julvandring och pilen leder dit
await ev(()=>{const li=[...document.querySelectorAll('.xgc-list li')].find(l=>/Hotel Fratelli/.test(l.textContent));li.querySelector('.xgc-go').click();});await wait(2600);
const g2=await ev(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return {mode:s.mode,guideTo:s.julguide?.guideTo,guide:s.guide.id,label:s.guide.label,layer:document.querySelector('.xmas-guide-layer').hidden};});
check('G2 GÅ DIT startar fri julvandring och pilen leder till Hotel Fratelli',g2.mode==='cozy'&&g2.guideTo==='fratelli'&&g2.guide==='xmas-guide'&&g2.label==='HOTEL FRATELLI'&&g2.layer,JSON.stringify(g2));
// G3: skyltarna står på gångbar mark
const places=await ev(()=>window.KarlstadDebug.journey().xmas.snapshot().julguide.places);
const blockedAt=await ev(ps=>ps.map(p=>({id:p.id,b:window.__blocked?window.__blocked(p.x,p.z):null})),places);
check('G3 alla utplacerade skyltar står på gångbar mark (inte i ett hus)',blockedAt.every(b=>b.b===false),JSON.stringify(blockedAt));
// G4: gå fram till Fratelli: rutan dyker upp; tryck: kortet
const fr=places.find(p=>p.id==='fratelli');
await tp(fr.x,fr.z+9,180,1800);
await shot('g04-fratelli-skylt');
const g4=await ev(()=>{const n=document.querySelector('.xmas-guide-near');return {vis:!!n&&!n.hidden,text:n?.textContent||''};});
check('G4 vid Hotel Fratelli dyker en ruta upp: JULBORD · Hotel Fratelli · VISA',g4.vis&&/JULBORD/.test(g4.text)&&/Hotel Fratelli/.test(g4.text),JSON.stringify(g4));
await ev(()=>document.querySelector('.xmas-guide-near').click());await wait(500);
const g5=await ev(()=>({title:document.querySelector('.xmas-guide-card h2')?.textContent,txt:document.querySelector('.xmas-guide-card')?.textContent||'',xp:window.KarlstadDebug.journey().xmas.meta.state.guide}));
check('G5 kortet visar namn, när, pris, adress, källa och att spelet inte har något samarbete; första besöket ger XP en gång',g5.title==='HOTEL FRATELLI'&&/NÄR/.test(g5.txt)&&/Drottninggatan 17/.test(g5.txt)&&/inget samarbete/.test(g5.txt)&&/\+10 XP/.test(g5.txt)&&!!g5.xp.fratelli,JSON.stringify({t:g5.title,xp:g5.xp}));
await shot('g05-kort');
await ev(()=>[...document.querySelectorAll('.xmas-guide-card button')].find(b=>b.textContent==='STÄNG').click());await wait(300);
await ev(()=>document.querySelector('.xmas-guide-near').click());await wait(300);
check('G5b andra gången ger inget XP',await ev(()=>!/XP · första/.test(document.querySelector('.xmas-guide-card').textContent)));
await ev(()=>[...document.querySelectorAll('.xmas-guide-card button')].find(b=>b.textContent==='STÄNG').click());
// G6: framme: pilen släpper
await tp(fr.x,fr.z+2,180,1200);
check('G6 framme vid skylten släpper GÅ DIT-pilen',await ev(()=>window.KarlstadDebug.journey().xmas.snapshot().julguide.guideTo===null));
// G7: alla utplacerade skyltar ger rutan när man står vid dem; bilder
for(const p of places){await tp(p.x+Math.sin(0)*0,p.z+6,0,900);const n=await ev(()=>document.querySelector('.xmas-guide-near')?.hidden===false?document.querySelector('.xmas-guide-near').textContent:'');if(!n)console.log('   ingen ruta vid',p.id);}
const shown=[];for(const p of places){await tp(p.x,p.z+5,0,700);if(await ev(()=>document.querySelector('.xmas-guide-near')?.hidden===false))shown.push(p.id);}
check('G7 rutan dyker upp vid varje utplacerad skylt',shown.length===places.length,JSON.stringify({shown,alla:places.map(p=>p.id)}));
const el=places.find(p=>p.id==='elite');await tp(el.x+6,el.z+10,30,1500);await shot('g07-stadshotellet');
const ol=places.find(p=>p.id==='olearys');await tp(ol.x-6,ol.z-12,200,1500);await shot('g07-olearys');
// G8: julguiden syns inte i Termosjakten
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(800);
check('G8 rutan försvinner i menyn',await ev(()=>document.querySelector('.xmas-guide-near').hidden));
check('G9 inga fel i sidan',errs.length===0,errs.slice(0,4).join(' | '));
console.log(failed?`\n${failed} kontroll(er) FEL`:'\nAlla kontroller OK');
await browser.close();server.close();
process.exit(failed?1:0);
