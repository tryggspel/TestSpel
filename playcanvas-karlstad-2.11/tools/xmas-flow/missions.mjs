#!/usr/bin/env node
// Verifiering i riktig webbläsare av julens två uppdrag från grundspelet (2.21.1-xmas.7): SANDGRUND: JULVERNISSAGEN och BÅTBUSSEN TILL MARIEBERGSSKOGEN (Julbåten).
// Startar det riktiga spelet i headless Chromium med en sparning där introduktionen är klar, öppnar Julmenyn, startar uppdragen och kontrollerar att de börjar, går att avsluta,
// ger julstämpel och julpoäng, sparas, och leder tillbaka till Julmenyn. Själva Sandgrund-striden spelas inte (grundspelets regler, redan provade): segern anropas via ett provhandtag.
//
//   npm i playcanvas@2.22.4 playwright     (CDN:en är blockerad i vissa sandlådor; den lokala kopian routas in)
//   node tools/xmas-flow/missions.mjs      (startar en egen filserver för spelmappen)
//
// Env: PLAYWRIGHT=/väg/till/playwright/index.mjs  PLAYCANVAS=/väg/till/playcanvas.mjs  CHROME=/väg/till/chromium  VIEW=414x896m  SHOTS=katalog
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om bildfrekvens eller känsla på en riktig telefon.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const SHOTS=process.env.SHOTS||'';
const V=(process.env.VIEW||'414x896m').match(/(\d+)x(\d+)(m?)/);
const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.txt':'text/plain; charset=utf-8'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://x');let p=path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/,'');
  let file=path.join(root,p);if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end('nej');return;}
  res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const PORT=server.address().port,ORIGIN=`http://127.0.0.1:${PORT}`;
const {INTRO}=await import(pathToFileURL(path.join(root,'xmas/xmas-layout.mjs')).href);
const {MARIEBERG}=await import(pathToFileURL(path.join(root,'city-south-space.mjs')).href);

const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},...(V[3]?{hasTouch:true,isMobile:true,deviceScaleFactor:1}:{})});
const SAVE_KEY='karlstad-xmas:save:1';
await ctx.addInitScript(k=>{if(localStorage.getItem('__seeded'))return;localStorage.setItem('__seeded','1');
  localStorage.setItem(k,JSON.stringify({v:1,stamps:{intro:1700000000000},records:{intro:{points:400,seconds:60,packages:14,bonus:1,level:0}},totals:{packages:14,bonus:1,points:400,runs:1},opts:{weather:'light'},intro:{done:true},rush:{cleared:0,stars:{},best:{},bestStreak:0},zombies:{cleared:0,best:{}},name:'',friends:[]}));},SAVE_KEY);
const page=await ctx.newPage();const errs=[];
page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200));});
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
// app.js och last-round.js får några provhandtag (teleportera, position, appen, avsluta uppdrag). Ingen fil på disk ändras.
await page.route(/\/app\.js/,r=>{
  if(!r.request().url().startsWith(ORIGIN))return r.continue();
  const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__blocked=blocked;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};window.__pos=()=>{const p=player.getPosition();return [p.x,p.z]};app.on('update',update);");
  r.fulfill({contentType:'text/javascript',body:s});
});
await page.route(/\/last-round\.js/,r=>{
  if(!r.request().url().startsWith(ORIGIN))return r.continue();
  const s=fs.readFileSync(path.join(root,'last-round.js'),'utf8').replace("journey.xmas=xmas;","journey.xmas=xmas;window.__lr={finish:won=>finish(won),game:()=>game,panel:()=>panel};");
  r.fulfill({contentType:'text/javascript',body:s});
});
let failed=0;const results=[];
const check=(name,ok,detail='')=>{results.push([ok?'OK  ':'FEL ',name,detail]);if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};
const wait=ms=>page.waitForTimeout(ms),ev=(fn,a)=>page.evaluate(fn,a);
const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+'.png')});}};
const ready=async()=>{await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await wait(700);};
const click=id=>ev(i=>document.getElementById(i)?.click(),id);
const until=async(fn,max=60,arg=null)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await page.evaluate(fn,arg))return true;await wait(250);}return false;};
const vis=id=>ev(i=>{const e=document.getElementById(i);return !!e&&!e.hidden&&getComputedStyle(e).display!=='none';},id);
const save=()=>ev(k=>JSON.parse(localStorage.getItem(k)),SAVE_KEY);
const xmas=()=>ev(()=>{const x=window.KarlstadDebug.journey().xmas;return {mode:x.snapshot().mode,hunt:x.hunt.snapshot()};});
const walk=(tx,tz,step=6)=>ev(([tx,tz,step])=>new Promise(res=>{let n=0;const f=()=>{const [x,z]=window.__pos();const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz);if(d<.4||++n>900){res(d);return;}const k=Math.min(1,step/d);window.__tp(x+dx*k,z+dz*k,Math.atan2(-dx,-dz)*180/Math.PI,-5);requestAnimationFrame(f);};f();}),[tx,tz,step]);

await page.goto(`${ORIGIN}/?debug`);await ready();

// ── A: Julmenyn har de två nya uppdragen och länken till Julkalendern ────────────────────────────────────────────────
check('A1 startvyn har länken till Julkalendern (en vanlig länk till ./julkalender/)',await ev(()=>{const a=document.getElementById('xmasCalendar');return !!a&&a.tagName==='A'&&a.getAttribute('href')==='./julkalender/'&&a.getBoundingClientRect().height>=44;}));
await click('xmasCozy');await wait(900);
const menu=await ev(()=>({panel:!document.getElementById('round-xmas-continue').hidden,btns:['xmasSandgrund','xmasBoat'].map(id=>Math.round(document.getElementById(id).getBoundingClientRect().height)),
  notes:['xmasSandgrundNote','xmasBoatNote'].map(id=>document.getElementById(id).textContent),status:document.getElementById('xmasContinueStatus').textContent,stamps:document.querySelectorAll('#xmasStampList li').length,
  cal2:document.getElementById('xmasCalendar2').getAttribute('href')}));
check('A2 Julmenyn visas med knapparna SANDGRUND och BÅTBUSSEN (minst 48 px höga) och Julkalendern',menu.panel&&menu.btns.every(h=>h>=48)&&menu.cal2==='./julkalender/',JSON.stringify(menu.btns));
check('A3 noterna berättar om uppdragen (Zombie-Lerin, Inre hamn)',/Zombie-Lerin/.test(menu.notes[0])&&/Inre hamn/.test(menu.notes[1]),menu.notes.join(' | '));
check('A4 stämpellistan har elva stämplar och status säger 1 / 11',menu.stamps===11&&/JULSTÄMPLAR 1 \/ 11/.test(menu.status),menu.stamps+' '+menu.status);
await shot('m01-julmenyn');

// ── B: Sandgrund: Julvernissagen ─────────────────────────────────────────────────────────────────────────────────────────
await click('xmasSandgrund');
const started=await until(()=>{const s=window.KarlstadRound.snapshot();return s.mission==='sandgrund'&&s.phase==='playing'&&s.mode==='mission';},40);
const b1=await ev(()=>({cls:[...document.body.classList],panel:window.__lr.panel(),hud:getComputedStyle(document.getElementById('roundHud')).display,visitors:window.KarlstadRound.snapshot().visitors?.length,pos:window.__pos(),mode:window.KarlstadDebug.journey().xmas.snapshot().mode}));
check('B1 Julvernissagen startar: uppdraget sandgrund spelas, inga paneler öppna och grundspelets HUD syns',started&&b1.panel===null&&b1.hud!=='none'&&b1.visitors===3,JSON.stringify({panel:b1.panel,hud:b1.hud,visitors:b1.visitors}));
check('B2 julens egen HUD och klasser är av (xmas-on) men xmas-mission är på, och julläget är "mission"',!b1.cls.includes('xmas-on')&&b1.cls.includes('xmas-mission')&&b1.mode==='mission',b1.cls.join(' '));
await wait(700); // HUD:en skrivs om var 80:e ms
const v1=await ev(()=>{const g=window.__lr.game(),site=g.site;return {dur:g.duration,hp:g.actors[0].hp,max:g.actors[0].maxHp,shielded:g.shielded,far:g.visitors.map(v=>Math.round(Math.hypot(v.x-site.x,v.z-site.z))),apart:Math.min(...[[0,1],[0,2],[1,2]].map(([i,j])=>Math.hypot(g.visitors[i].x-g.visitors[j].x,g.visitors[i].z-g.visitors[j].z))),hud:document.getElementById('roundPhase').textContent,scene:window.KarlstadDebug.journey().xmas.decor.snapshot().scenes};});
check('B2b Julvernissagen är en längre strid: 270 s, Zombie-Lerin har 36 liv och färgsköld, och besökarna står 25–50 m från platsen och minst 20 m från varandra',v1.dur===270&&v1.hp===36&&v1.max===36&&v1.shielded&&v1.far.every(d=>d>=25&&d<=50)&&v1.apart>=20,JSON.stringify(v1));
check('B2c HUD:en säger FÄRGSKÖLD (inte 12 liv) och julscenen på Sandgrund är påslagen',/FÄRGSKÖLD/.test(v1.hud)&&v1.scene[0].name==='Sandgrund'&&v1.scene[0].on===true&&v1.scene[0].firs>=6,v1.hud+' '+JSON.stringify(v1.scene));
check('B3 spelaren står vid Sandgrund (uppdragets start)',Math.hypot(b1.pos[0]-(-13),b1.pos[1]-(-397))<140,b1.pos.map(Math.round).join(','));
await wait(2500);await shot('m02-sandgrund');
check('B4 uppdraget går i några sekunder utan fel och utan att glida ur sitt läge',(await ev(()=>window.KarlstadRound.snapshot().phase))==='playing'&&errs.length===0,errs.join(' | '));
await click('roundPause');await wait(500);
check('B5 pausmenyn i uppdraget har JULMENY och inget val som leder till grundspelets startvy',await ev(()=>!!document.getElementById('xmasMenuBtn')&&getComputedStyle(document.getElementById('cityNewRun')).display==='none'));
await click('roundResume');await wait(400);
await ev(()=>window.__lr.finish(true));await wait(700);
const b2=await ev(()=>({panel:window.__lr.panel(),target:document.getElementById('roundResultTarget').textContent,next:getComputedStyle(document.getElementById('roundNext')).display,share:getComputedStyle(document.getElementById('roundShare')).display}));
const s1=await save();
check('B6 segern ger resultatkort med julstämpeln och 200 julpoäng, och ingen NÄSTA-knapp till grundspelets uppdrag',b2.panel==='result'&&/JULSTÄMPEL: SANDGRUND · JULVERNISSAGEN · \+200/.test(b2.target)&&b2.next==='none',JSON.stringify(b2));
check('B7 stämpel, rekord och julpoäng sparas i julsparningen',!!s1.stamps.sandgrund&&!!s1.records.sandgrund&&s1.totals.points===600,JSON.stringify({stamps:Object.keys(s1.stamps),points:s1.totals.points}));
await shot('m03-sandgrund-klart');
await click('roundLeave');await wait(900);
check('B8 "Tillbaka" leder till Julmenyn (inte grundspelets stadsvandring) och uppdragsläget är avstängt',await vis('round-xmas-continue')&&await ev(()=>!document.body.classList.contains('xmas-mission')&&window.KarlstadDebug.journey().xmas.snapshot().mode==='menu'));
check('B9 notens text säger att Julvernissagen är stämplad',/stämplad/.test(await ev(()=>document.getElementById('xmasSandgrundNote').textContent)));
// en andra omgång ger bara 40 julpoäng, en förlust ingenting
await click('xmasSandgrund');await until(()=>{const s=window.KarlstadRound.snapshot();return s.mission==='sandgrund'&&s.phase==='playing';},40);await wait(500);
await ev(()=>window.__lr.finish(true));await wait(600);
const b3=await ev(()=>document.getElementById('roundResultTarget').textContent),s2=await save();
check('B10 andra segern: "Redan stämplad · +40" och totalsumman ökar med 40',/Redan stämplad · \+40/.test(b3)&&s2.totals.points===s1.totals.points+40,b3+' '+s2.totals.points);
await click('roundRetry');await wait(1200);
await ev(()=>window.__lr.finish(false));await wait(600);
const s3=await save();
check('B11 en förlorad omgång ändrar ingenting i sparningen',s3.totals.points===s2.totals.points&&JSON.stringify(s3.stamps)===JSON.stringify(s2.stamps));
await click('roundLeave');await wait(800);

// ── C: Julbåten ─────────────────────────────────────────────────────────────────────────────────────────────────────────
await click('xmasBoat');
const boarded=await until(()=>window.KarlstadRound.snapshot().mode==='boat',30);
const c1=await ev(()=>({boat:window.KarlstadRound.snapshot().boat,layer:!document.getElementById('boatLayer').hidden,cls:[...document.body.classList],mode:window.KarlstadDebug.journey().xmas.snapshot().mode}));
check('C1 båtbussen går: båtlagret syns, resan är en räddningstur (inte lugn) och julläget är "boat"',boarded&&c1.layer&&c1.boat&&c1.boat.calm===false&&c1.mode==='boat',JSON.stringify({layer:c1.layer,calm:c1.boat?.calm,mode:c1.mode}));
const sky=await ev(()=>{const c=document.getElementById('boatCanvas'),x=c.getContext('2d'),d=x.getImageData(Math.round(c.width*.4),Math.round(c.height*.12),1,1).data;return {w:c.width,rgb:[d[0],d[1],d[2]]};});
check('C1b båtresan är ett vinterlandskap: himlen är skymningsblå (inte grundspelets ljusa sommarhimmel) ',sky.rgb[2]>sky.rgb[0]&&sky.rgb[0]+sky.rgb[1]+sky.rgb[2]<420,JSON.stringify(sky));
await shot('m04-batbuss');
// rädda några passagerare under resan
for(let i=0;i<40&&(await ev(()=>window.KarlstadRound.snapshot().mode))==='boat';i++){await ev(()=>{for(const id of ['boatPerson0','boatPerson1','boatPerson2','boatPerson3'])document.getElementById(id)?.click();});await wait(900);}
const arrived=await until(()=>window.KarlstadRound.snapshot().mode!=='boat',90);
await wait(1200);
const c2=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,h=x.hunt.snapshot(),r=x.hunt.run;return {mode:x.snapshot().mode,kind:h.kind,phase:h.phase,total:h.total,bonusTotal:h.bonusTotal,goal:h.goal,pos:window.__pos(),goalText:document.getElementById('xmasGoal').textContent,cls:[...document.body.classList],panel:window.__lr.panel(),
  extra:r?.extra,pkgs:r?r.packages.map(p=>({x:p.x,z:p.z,kind:p.kind})):[],tomte:r?.tomte,hudHidden:document.getElementById('xmasHud').hidden};});
check('C2 när båten lagt till börjar jakten i Mariebergsskogen: tolv julklappar och tre bonuspaket, mål 12',arrived&&c2.kind==='marieberg'&&c2.phase==='collect'&&c2.total===12&&c2.bonusTotal===3&&c2.goal===12,JSON.stringify({kind:c2.kind,phase:c2.phase,total:c2.total,bonus:c2.bonusTotal}));
check('C3 spelaren står vid bryggan i Mariebergsskogen och julens HUD och mål syns',Math.hypot(c2.pos[0]-MARIEBERG.x,c2.pos[1]-MARIEBERG.z)<25&&!c2.hudHidden&&/Mariebergsskogen/.test(c2.goalText)&&c2.panel===null&&c2.cls.includes('xmas-on')&&c2.mode==='cozy',JSON.stringify({pos:c2.pos.map(Math.round),goal:c2.goalText,mode:c2.mode}));
const sc2=await ev(()=>window.KarlstadDebug.journey().xmas.decor.snapshot().scenes);
check('C3b julscenen vid bryggan i Mariebergsskogen är påslagen när man kommit fram',sc2[1].name==='Mariebergsskogen'&&sc2[1].on===true,JSON.stringify(sc2));
check('C4 båtresans poäng följer med jakten (extra) och är högst 300',Number.isFinite(c2.extra)&&c2.extra>=0&&c2.extra<=300,String(c2.extra));
await shot('m05-mariebergsskogen');
// samla de tolv vanliga paketen (förflyttning i stora steg genom spelets egen fångstlogik) och lämna dem hos tomten
const regular=c2.pkgs.filter(p=>p.kind==='regular');
for(const p of regular)await walk(p.x,p.z,5);
await wait(600);
const c3=await xmas();
check('C5 tolv paket plockas och fasen blir leverans',c3.hunt.collected>=12&&c3.hunt.phase==='deliver',JSON.stringify({collected:c3.hunt.collected,phase:c3.hunt.phase}));
await shot('m06-leverans');
await walk(c2.tomte.x,c2.tomte.z,4);await wait(2600);
const c4=await ev(()=>({panel:!document.getElementById('round-xmas-result').hidden,title:document.getElementById('xmasResultTitle').textContent,line:document.getElementById('xmasResultLine').textContent,cells:[...document.querySelectorAll('#xmasResultGrid .xr-cell')].map(e=>e.textContent),parts:document.getElementById('xmasResultParts').textContent,stamp:!document.getElementById('xmasResultStamp').hidden,status:document.getElementById('xmasResultStatus').textContent}));
const s4=await save();
check('C6 resultatkortet säger att julklapparna är framme, med passagerare, julklappar och julstämpel',c4.panel&&c4.title==='JULKLAPPARNA ÄR FRAMME!'&&/Mariebergsskogen/.test(c4.line)&&c4.stamp&&/PASSAGERARE/.test(c4.cells[0]),JSON.stringify({title:c4.title,cells:c4.cells}));
check('C7 poängraden räknar med båtresan och statusen visar 3 av 11 stämplar',/BÅTRESAN|båtresan/.test(c4.parts)||s4.records.marieberg.points>0,c4.parts+' | '+c4.status);
check('C8 stämpel, rekord, paket och julpoäng sparas',!!s4.stamps.marieberg&&!!s4.records.marieberg&&s4.totals.packages>=14+12&&s4.totals.points>s3.totals.points,JSON.stringify({stamps:Object.keys(s4.stamps),points:s4.totals.points,packages:s4.totals.packages}));
await shot('m07-batresultat');
await click('xmasResultContinue');await wait(900);
check('C9 FORTSÄTT leder till Julmenyn, där båtbussen nu är stämplad',await vis('round-xmas-continue')&&/stämplad/.test(await ev(()=>document.getElementById('xmasBoatNote').textContent)));
await click('xmasFree');await wait(1800);
const c5=await ev(()=>({pos:window.__pos(),kind:window.KarlstadDebug.journey().xmas.hunt.snapshot().kind}));
check('C10 fri julvandring efter Mariebergsskogen börjar vid Stora Torget, inte i parken',c5.kind==='free'&&Math.hypot(c5.pos[0]-INTRO.spawn.x,c5.pos[1]-INTRO.spawn.z)<30,JSON.stringify(c5));

// avbruten båtresa
await click('roundPause');await wait(500);await click('xmasMenuBtn');await wait(700);await click('xmasBoat');
await until(()=>window.KarlstadRound.snapshot().mode==='boat',30);await wait(600);
await click('boatAbort');await wait(900);
check('C11 avbryts båtresan hamnar man i Julmenyn (inte kvar vid hamnen utan uppdrag)',await vis('round-xmas-continue')&&(await ev(()=>window.KarlstadRound.snapshot().mode))!=='boat');

check('D1 inga fel i konsolen under hela körningen',errs.length===0,errs.join(' | '));
await browser.close();server.close();
console.log(`\n${results.length-failed} av ${results.length} kontroller godkända.`);
process.exit(failed?1:0);
