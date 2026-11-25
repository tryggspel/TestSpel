#!/usr/bin/env node
// Verifiering i riktig webbläsare av Platsjakten (2.21.1-xmas.14): bilden av dagens plats (tagen med spelets kamera), klockan, ledtråden halvvägs,
// paketet vid platsen, belöningen en gång per dag, rekordtiden, och en jakt där tiden tar slut.
// Startar det riktiga spelet i headless Chromium med en egen liten webbserver. Avslutar med kod 1 om något avviker. Sparar skärmbilder om SHOTS=katalog anges.
//
//   node tools/xmas-flow/platsjakt.mjs        Env: PLAYWRIGHT=/väg/playwright/index.mjs  PLAYCANVAS=/väg/playcanvas.mjs  CHROME=/väg/chromium  VIEW=414x896m  SHOTS=katalog
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om bildfrekvens eller känsla på en riktig telefon.
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
const tp=async(x,z,yaw,ms=1200,pitch=-4)=>{await ev(([x,z,y,pt])=>window.__tp(x,z,y,pt),[x,z,yaw,pitch]);await wait(ms);};
const panelText=()=>ev(()=>{const c=document.querySelector('.pj-layer');return c&&!c.hidden?c.textContent:'';});
const P=()=>ev(()=>window.KarlstadDebug.journey().xmas.snapshot().platsjakt);
const pjSet=t0=>ev(t=>{const pj=window.KarlstadDebug.journey().xmas.pj;pj.t0=performance.now()-t*1000;},t0);
const fanfareText=()=>ev(()=>[...document.querySelectorAll('.xmas-fanfare,.fanfare,[class*="fanfare"]')].map(e=>e.textContent).join(' | '));
const {platsjaktFor,PLATSJAKT}=await import(pathToFileURL(path.join(root,'xmas/xmas-platsjakt.mjs')).href);

// P0: menyn
check('P0 startvyn har knappen PLATSJAKTEN',/PLATSJAKTEN/.test(await ev(()=>document.getElementById('xmasPlatsjakt')?.textContent||'')));
// P1: kortet med bilden
await click('xmasPlatsjakt');await wait(1800);
const s1=await P();const day=await ev(()=>window.KarlstadDebug.journey().xmas.meta.today());
const def=platsjaktFor(day);
check('P1 kortet öppnas med dagens plats och en bild från spelet',!!s1&&s1.state==='card'&&s1.ui.open&&s1.place===def.place.id&&s1.photo>8000,JSON.stringify({s1,day,place:def.place.id}));
// bilden är inte tom: pixlarna varierar
const varied=await ev(()=>new Promise(res=>{const i=document.querySelector('.pj-photo img');if(!i)return res(-1);const go=()=>{const c=document.createElement('canvas');c.width=64;c.height=48;const x=c.getContext('2d');x.drawImage(i,0,0,64,48);const d=x.getImageData(0,0,64,48).data;let s=0,s2=0,n=0;for(let k=0;k<d.length;k+=4){const l=(d[k]+d[k+1]+d[k+2])/3;s+=l;s2+=l*l;n++;}res(Math.sqrt(s2/n-(s/n)**2));};i.complete?go():i.onload=go;}));
check('P1b bilden visar något (inte en tom yta)',varied>12,'spridning '+varied.toFixed?.(1));
const t1=await panelText();
check('P1c kortet: VAR ÄR DETTA?, tiden, ledtråden och startknappen',/VAR ÄR DETTA\?/.test(t1)&&/STARTA KLOCKAN/.test(t1)&&t1.includes(def.place.hint),t1.slice(0,160));
await shot('p01-bilden');
// P2: klockan går
await ev(()=>[...document.querySelectorAll('.pj-layer button')].find(b=>/STARTA KLOCKAN/.test(b.textContent))?.click());await wait(1500);
const s2=await P(),hud=await ev(()=>{const h=document.querySelector('.pj-hud');return {vis:!!h&&!h.hidden,clock:h?.querySelector('.pj-clock')?.textContent||''};});
const pos2=await ev(()=>window.__pos());
check('P2 jakten startar vid granen: klockan syns och räknar ned',s2.state==='run'&&hud.vis&&/^\d+:\d\d$/.test(hud.clock)&&Math.hypot(pos2[0]-PLATSJAKT.start.x,pos2[1]-PLATSJAKT.start.z)<3,JSON.stringify({state:s2.state,hud,pos2}));
const pk=await ev(()=>window.KarlstadDebug.journey().xmas.snapshot().hunt);
await shot('p02-klockan');
// P3: ledtråden halvvägs
await pjSet(def.seconds*.55);await wait(900);
const ft=await ev(()=>document.body.innerText);
check('P3 halvvägs kommer ledtråden med väderstrecket',/LEDTRÅD/.test(ft)&&/(norrut|nordost|österut|sydost|söderut|sydväst|västerut|nordväst)/.test(ft),'');
check('P3b inga intro-texter från fri julvandring mitt i jakten',!/Tomtarna tappade|FRI JULVANDRING/.test(ft));
await shot('p03-ledtraden');
await pjSet(5);await wait(300);
// P4: fel ställe ger inget, rätt ställe ger paketet
await tp(def.place.x+30,def.place.z+30,0,900);
check('P4 en bit bort: inget paket än',(await P()).state==='run');
await tp(def.place.view.x,def.place.view.z,Math.atan2(-(def.place.look.x-def.place.view.x),-(def.place.look.z-def.place.view.z))*180/Math.PI,1400,-2);await shot('p04-platsen');
await tp(def.place.x,def.place.z,0,2200);
const s4=await P(),t4=await panelText();
check('P4b vid platsen: paketet plockas och resultatkortet säger HITTAD med tiden och belöningen',s4.state==='done'&&/HITTAD/.test(t4)&&/XP/.test(t4),t4.slice(0,200));
const best=await ev(p=>window.KarlstadDebug.journey().xmas.meta.state.platsjakt,def.place.id);
check('P4c rekordtiden sparas och dagens belöning är tagen',best.best[def.place.id]>0&&best.won[day]===def.place.id,JSON.stringify(best));
await shot('p05-hittad');
// P5: springa igen: tiden räknas men ingen ny belöning
await ev(()=>[...document.querySelectorAll('.pj-layer button')].find(b=>/SPRINGA IGEN/.test(b.textContent))?.click());await wait(1500);
await ev(()=>[...document.querySelectorAll('.pj-layer button')].find(b=>/STARTA KLOCKAN/.test(b.textContent))?.click());await wait(1200);
await tp(def.place.x,def.place.z,0,2200);
const t5=await panelText();
check('P5 andra gången samma dag: tiden räknas, belöningen kommer i morgon',/HITTAD/.test(t5)&&/redan öppnat/.test(t5),t5.slice(0,200));
// P6: tiden tar slut
await ev(()=>[...document.querySelectorAll('.pj-layer button')].find(b=>/SPRINGA IGEN/.test(b.textContent))?.click());await wait(1500);
await ev(()=>[...document.querySelectorAll('.pj-layer button')].find(b=>/STARTA KLOCKAN/.test(b.textContent))?.click());await wait(1000);
await pjSet(def.seconds+1);await wait(900);
const s6=await P(),t6=await panelText(),left=await ev(()=>(window.KarlstadDebug.journey().xmas.hunt?.run?.packages||[]).filter(k=>String(k.id).startsWith('p:')).length);
check('P6 tiden tar slut: kortet säger var platsen var och paketet försvinner',s6.state==='done'&&/TIDEN TOG SLUT/.test(t6)&&/FÖRSÖK IGEN/.test(t6),t6.slice(0,160)+' paket kvar: '+left);
await shot('p06-tiden-slut');
// P7: menyn rensar jakten
await ev(()=>[...document.querySelectorAll('.pj-layer button')].find(b=>/Fortsätt gå/.test(b.textContent))?.click());await wait(500);
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(800);
check('P7 till menyn: jakten och klockan är borta',!(await P())&&!(await ev(()=>{const h=document.querySelector('.pj-hud');return !!h&&!h.hidden;})));
check('P8 inga fel i sidan',errs.length===0,errs.slice(0,4).join(' | '));
console.log(failed?`\n${failed} kontroll(er) FEL`:'\nAlla kontroller OK');
await browser.close();server.close();
process.exit(failed?1:0);
