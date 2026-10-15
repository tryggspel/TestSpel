#!/usr/bin/env node
// Verifiering i riktig webbläsare av djuplänkarna (2.21.1-xmas.7): ?uppdrag=<nyckel>&lucka=<n> öppnar Julspelet med ett kort för uppdraget, och knappen STARTA startar det.
// Varje scenario är en ny webbläsarkontext med en egen sparning, så att "låst" och "första uppdraget ej klart" går att prova. Själva uppdragen är provade i flow.mjs, rush.mjs, levels.mjs och
// missions.mjs; här kontrolleras att länken leder dit, att inget startar av sig självt och att adressen städas.
//
//   node tools/xmas-flow/links.mjs      (startar en egen filserver för spelmappen)
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
const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.txt':'text/plain'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://x');let p=path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/,'');
  let file=path.join(root,p);if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end('nej');return;}
  res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const PORT=server.address().port,ORIGIN=`http://127.0.0.1:${PORT}`;
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const SAVE_KEY='karlstad-xmas:save:1';
const SAVES={
  played:{v:1,stamps:{intro:1700000000000},records:{intro:{points:400,seconds:60,packages:14,bonus:1,level:0}},totals:{packages:14,bonus:1,points:400,runs:1},opts:{weather:'light'},intro:{done:true},rush:{cleared:0,stars:{},best:{},bestStreak:0},zombies:{cleared:0,best:{}},name:'',friends:[]},
  fresh:null,
  stamped:{v:1,stamps:{intro:1700000000000,sandgrund:1700000000001},records:{intro:{points:400,seconds:60,packages:14,bonus:1,level:0}},totals:{packages:14,bonus:1,points:600,runs:2},opts:{weather:'light'},intro:{done:true},rush:{cleared:0,stars:{},best:{},bestStreak:0},zombies:{cleared:0,best:{}},name:'',friends:[]}
};
let failed=0;const results=[],errs=[];
const check=(name,ok,detail='')=>{results.push([ok?'OK  ':'FEL ',name,detail]);if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};

// Öppnar spelet med en länk i en ny kontext. save = nyckel i SAVES. Returnerar hjälpare för sidan.
async function open(search,saveName,opts={}){
  const view=opts.view||V;
  const ctx=await browser.newContext({viewport:{width:+view[1],height:+view[2]},...(view[3]?{hasTouch:true,isMobile:true,deviceScaleFactor:1}:{})});
  const seed=SAVES[saveName];
  if(seed)await ctx.addInitScript(([k,s])=>{if(localStorage.getItem('__seeded'))return;localStorage.setItem('__seeded','1');localStorage.setItem(k,JSON.stringify(s));},[SAVE_KEY,seed]);
  if(opts.date)await ctx.addInitScript(iso=>{const R=Date,off=Date.parse(iso)-R.now();class D extends R{constructor(...a){if(a.length)super(...a);else super(R.now()+off);}static now(){return R.now()+off;}}window.Date=D;},opts.date);
  const page=await ctx.newPage();
  page.on('pageerror',e=>errs.push('pageerror: '+e.message+' ('+search+')'));page.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200)+' ('+search+')');});
  await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
  // provhandtag (teleportera, position, avsluta uppdrag): ingen fil på disk ändras
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
  const wait=ms=>page.waitForTimeout(ms),ev=(fn,a)=>page.evaluate(fn,a);
  await page.goto(`${ORIGIN}/?debug${search?'&'+search:''}`);
  await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await wait(700);
  const h={ctx,page,wait,ev,
    click:id=>ev(i=>document.getElementById(i)?.click(),id),
    vis:id=>ev(i=>{const e=document.getElementById(i);return !!e&&!e.hidden&&getComputedStyle(e).display!=='none';},id),
    txt:id=>ev(i=>document.getElementById(i)?.textContent||'',id),
    until:async(fn,max=40,arg=null)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await page.evaluate(fn,arg))return true;await wait(250);}return false;},
    xmas:()=>ev(()=>{const x=window.KarlstadDebug.journey().xmas;const s=x.snapshot();return {mode:s.mode,kind:s.hunt?.kind,id:s.hunt?.id,active:s.hunt?.active,rush:s.rush?.running?{n:s.rush.n}:null,zl:x.zombieLevel?.n||0};}),
    card:()=>ev(()=>{const g=id=>document.getElementById(id);const b=g('xmasLinkGo').getBoundingClientRect(),c=g('round-xmas-link').getBoundingClientRect();
      return {open:!g('round-xmas-link').hidden,kicker:g('xmasLinkKicker').textContent,title:g('xmasLinkTitle').textContent,line:g('xmasLinkLine').textContent,note:g('xmasLinkNote').hidden?'':g('xmasLinkNote').textContent,btn:g('xmasLinkGo').textContent.replace(/\s+/g,' ').trim(),
        btnH:Math.round(b.height),inView:b.top>=0&&b.bottom<=innerHeight+1&&c.left>=0&&c.right<=innerWidth+1,search:location.search};}),
    helpers:()=>ev(()=>{window.__walk=(tx,tz,step=1.3)=>new Promise(res=>{let n=0;const f=()=>{const [x,z]=window.__pos();const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz);if(d<.4||++n>700){res(d);return;}const k=Math.min(1,step/d);window.__tp(x+dx*k,z+dz*k,Math.atan2(-dx,-dz)*180/Math.PI,-5);requestAnimationFrame(f);};f();});}),
    door:()=>ev(()=>{const e=document.getElementById('xmasDoor');if(!e||e.hidden||!e.isConnected)return null;const r=e.getBoundingClientRect(),vis=getComputedStyle(e).display!=='none';
      return {vis,inCard:e.parentElement?.id||'',title:e.querySelector('.xd-title').textContent,head:e.querySelector('.xd-head').textContent,line:e.querySelector('.xd-line').textContent,next:e.querySelector('.xd-next').textContent,tail:e.querySelector('.xd-tail').textContent,menu:e.querySelector('button').textContent,cal:e.querySelector('a').getAttribute('href'),h:Math.round(r.height)};}),
    shot:async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+'.png')});}}
  };
  return h;
}

// ── 1. Sandgrund med lucka: kortet, adressen, ingen start av sig själv, och knappen startar uppdraget ────────────────────────────
{
  const g=await open('uppdrag=sandgrund&lucka=6','played');
  const c=await g.card();
  check('L1 länken visar ett kort (inte startvyn) med luckans nummer och uppdragets namn',c.open&&c.kicker==='JULKALENDERN · LUCKA 6'&&c.title==='SANDGRUND: JULVERNISSAGEN'&&!(await g.vis('round-xmas-intro')),JSON.stringify({k:c.kicker,t:c.title}));
  check('L2 kortet beskriver uppdraget (Zombie-Lerin) och knappen är stor och synlig utan att scrolla',/Zombie-Lerin/.test(c.line)&&c.btnH>=48&&c.inView&&/STARTA UPPDRAGET/.test(c.btn),JSON.stringify({line:c.line.slice(0,60),h:c.btnH,inView:c.inView,btn:c.btn}));
  check('L3 adressen städas (inga ?uppdrag eller &lucka kvar): en omladdning visar inte kortet igen',!/uppdrag|lucka/.test(c.search),c.search);
  await g.wait(1500);
  const before=await g.xmas();
  check('L4 inget startar av sig självt: efter en stund är spelet fortfarande i menyläget',before.mode==='menu'&&!before.active&&(await g.card()).open,JSON.stringify(before));
  await g.shot('l01-kort-sandgrund');
  await g.click('xmasLinkGo');
  const ok=await g.until(()=>{const s=window.KarlstadRound.snapshot();return s.mission==='sandgrund'&&s.phase==='playing'&&s.mode==='mission';},40);
  check('L5 STARTA startar Julvernissagen (uppdraget sandgrund spelas, läget är mission) och kortet är borta',ok&&!(await g.vis('round-xmas-link'))&&(await g.xmas()).mode==='mission');
  await g.ctx.close();
}
// ── 2. Båtbussen ──────────────────────────────────────────────────────────────────────────────────────
{
  const g=await open('uppdrag=batbuss&lucka=9','played');
  const c=await g.card();
  check('L6 båtbussen: kort med rätt namn och lucka',c.open&&c.kicker==='JULKALENDERN · LUCKA 9'&&c.title==='BÅTBUSSEN TILL MARIEBERGSSKOGEN',JSON.stringify({k:c.kicker,t:c.title}));
  await g.click('xmasLinkGo');
  check('L7 STARTA går ombord på båten (båtläget)',await g.until(()=>window.KarlstadRound.snapshot().mode==='boat',30));
  await g.ctx.close();
}
// ── 3. Julrundor, introduktionen ──────────────────────────────────────────────────────────────────────────────────────
{
  const g=await open('uppdrag=torget&lucka=2','played');
  const c=await g.card();
  check('L8 Torgets julklappsjakt: kortet säger målet (18 julklappar)',c.open&&c.title==='TORGETS JULKLAPPSJAKT'&&/18 julklappar/.test(c.line),c.title+' | '+c.line.slice(-60));
  await g.click('xmasLinkGo');await g.wait(1500);
  const x=await g.xmas();
  check('L9 STARTA startar just den rundan (round-torget, sök och hitta)',x.mode==='cozy'&&x.kind==='round'&&x.id==='round-torget'&&x.active,JSON.stringify(x));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=intro&lucka=1','fresh');
  const c=await g.card();
  check('L10 första uppdraget (ny spelare): kortet har rubriken HJÄLP TOMTEN! och en knapp som startar',c.open&&c.title==='HJÄLP TOMTEN!'&&/STARTA UPPDRAGET/.test(c.btn),JSON.stringify({t:c.title,b:c.btn}));
  await g.click('xmasLinkGo');await g.wait(1500);
  const x=await g.xmas();
  check('L11 STARTA startar introduktionen',x.mode==='cozy'&&x.kind==='intro'&&x.active,JSON.stringify(x));
  await g.ctx.close();
}
// ── 4. Låst: före första uppdraget och låsta rusher/nivåer ────────────────────────────────────────────────────────────
{
  const g=await open('uppdrag=sandgrund&lucka=6','fresh');
  const c=await g.card();
  check('L12 Sandgrund före första uppdraget: kortet säger att första uppdraget kommer först och knappen startar det',c.open&&/första uppdraget/.test(c.note)&&/STARTA FÖRSTA UPPDRAGET/.test(c.btn),JSON.stringify({n:c.note.slice(0,50),b:c.btn}));
  await g.click('xmasLinkGo');await g.wait(1500);
  const x=await g.xmas();
  check('L13 …och startar introduktionen i stället för Sandgrund',x.kind==='intro'&&x.active&&x.mode==='cozy',JSON.stringify(x));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=rush3&lucka=10','played');
  const c=await g.card();
  check('L14 Rush 3 är låst (ingen rush klarad): kortet säger det och erbjuder SPELA RUSH 1',c.open&&c.title.startsWith('RUSH 3 · ')&&/är låst/.test(c.note)&&c.btn.startsWith('SPELA RUSH 1'),JSON.stringify({t:c.title,n:c.note,b:c.btn}));
  await g.shot('l02-kort-last-rush');
  await g.click('xmasLinkGo');
  check('L15 knappen startar Rush 1',await g.until(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return s.rush?.running&&s.rush.n===1;},30));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=rush1&lucka=4','played');
  const c=await g.card();
  check('L16 Rush 1: kortet säger målet och knappen startar Rush 1',c.open&&c.title.startsWith('RUSH 1 · ')&&/HÄMTA \d+ PAKET|NÅ [\d\s]+ POÄNG/.test(c.line)&&/STARTA UPPDRAGET/.test(c.btn),JSON.stringify({t:c.title,l:c.line.slice(0,50)}));
  await g.click('xmasLinkGo');
  check('L17 …och Rush 1 startar',await g.until(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return s.rush?.running&&s.rush.n===1;},30));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=maraton&lucka=19','played');
  const c=await g.card();await g.click('xmasLinkGo');
  check('L18 Maraton: kort och start (tempo 1, ingen fast rush)',c.open&&c.title==='JULRUSHEN · MARATON'&&await g.until(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return s.rush?.running&&s.rush.n===0;},30),c.title);
  await g.ctx.close();
}
{
  const g=await open('uppdrag=zombies2&lucka=15','played');
  const c=await g.card();
  check('L19 Tomtezombies nivå 2 är låst: kortet erbjuder NIVÅ 1',c.open&&c.title==='TOMTEZOMBIES · NIVÅ 2'&&/Nivå 2 är låst/.test(c.note)&&c.btn.startsWith('SPELA NIVÅ 1'),JSON.stringify({t:c.title,n:c.note,b:c.btn}));
  await g.click('xmasLinkGo');await g.wait(2000);
  const x=await g.xmas();
  check('L20 knappen startar nivå 1 i zombieläget',x.mode==='zombies'&&x.zl===1&&x.active,JSON.stringify(x));
  await g.ctx.close();
}
// ── 5. Butiker, redan stämplat ─────────────────────────────────────────────────────────────────────────────────────────
{
  const g=await open('uppdrag=pressbyran&lucka=7','played');
  const c=await g.card();
  check('L21 Pressbyrån: kortet säger vad man gör (GÅ DIT) och att det är en demonstration',c.open&&/GÅ DIT vid Pressbyrån/.test(c.line)&&/demonstration/.test(c.line),c.line.slice(0,90));
  await g.click('xmasLinkGo');await g.wait(1500);
  const x=await g.xmas();
  check('L22 STARTA öppnar fri julvandring med Karlstadpasset (butikerna)',x.mode==='cozy'&&x.kind==='free'&&x.active,JSON.stringify(x));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=sandgrund&lucka=6','stamped');
  const c=await g.card();
  check('L23 redan stämplat uppdrag: kortet säger det (spela om för 40 julpoäng)',c.open&&/redan stämplad/i.test(c.note)&&/40 julpoäng/.test(c.note),c.note);
  await g.ctx.close();
}
// ── 6. Menyer direkt, okända länkar, hoppa över ──────────────────────────────────────────────────────────────────────────
{
  const g=await open('uppdrag=meny&lucka=18','played');
  check('L24 meny: Julmenyn öppnas direkt (inget kort)',await g.vis('round-xmas-continue')&&!(await g.vis('round-xmas-link')));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=topplista&lucka=16','played');
  check('L25 topplista: topplistan öppnas direkt',await g.vis('round-xmas-board')&&!(await g.vis('round-xmas-link')));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=rush&lucka=17','played');
  check('L26 rush: rushmenyn öppnas direkt',await g.vis('round-xmas-rush')&&!(await g.vis('round-xmas-link')));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=meny&lucka=24','fresh');
  check('L27 meny före första uppdraget: startvyn visas (Julmenyn finns inte än)',await g.vis('round-xmas-intro')&&!(await g.vis('round-xmas-continue')));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=finns-inte&lucka=3','played');
  const t=await g.ev(()=>document.getElementById('roundToast').textContent);
  check('L28 en okänd nyckel visar startvyn och säger att länken inte fanns',await g.vis('round-xmas-intro')&&!(await g.vis('round-xmas-link'))&&/Uppdraget i länken finns inte/.test(t),t.slice(0,80));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=sandgrund&lucka=6','played');
  await g.click('xmasLinkSkip');await g.wait(500);
  check('L29 "Till startvyn" visar startvyn och inget startar',await g.vis('round-xmas-intro')&&(await g.xmas()).mode==='menu');
  await g.page.reload({waitUntil:'load'});
  await g.page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await g.wait(700);
  check('L30 efter omladdning (adressen är städad) visas startvyn, inte kortet',await g.vis('round-xmas-intro')&&!(await g.vis('round-xmas-link')));
  await g.ctx.close();
}
// ── 7. Smal liggande telefon: kortet och knappen ryms ───────────────────────────────────────────────────────────────────────
{
  const g=await open('uppdrag=sandgrund&lucka=6','played',{view:'844x390m'.match(/(\d+)x(\d+)(m?)/)});
  const c=await g.card();
  check('L31 liggande telefon (844×390): kortet scrollar internt och knappen går att nå (klistrar fast längst ned)',c.open&&c.inView&&c.btnH>=48,JSON.stringify({inView:c.inView,h:c.btnH}));
  await g.shot('l03-liggande');
  await g.ctx.close();
}
// ── 8. Rutan "Lucka N är avklarad" ─────────────────────────────────────────────────────────────────────────────────────────
// Går som en spelare: till närmaste ej plockade julklapp tills målet är nått, sedan till tomten.
async function playHunt(g,maxSec=420){
  const t0=Date.now();
  while(Date.now()-t0<maxSec*1000){
    const st=await g.ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;if(!r)return {phase:'none'};const p=window.__pos();let best=null,bd=1e9;for(const k of r.packages){if(k.collected)continue;const d=Math.hypot(k.x-p[0],k.z-p[1]);if(d<bd){bd=d;best={x:k.x,z:k.z};}}return {phase:r.phase,best,tomte:r.tomte};});
    if(st.phase==='deliver'||st.phase==='done')return st;
    if(st.best)await g.ev(([x,z])=>window.__walk(x,z,1.4),[st.best.x,st.best.z]);else await g.wait(250);
  }
  return null;
}
{
  const g=await open('uppdrag=intro&lucka=1','fresh',{date:'2026-12-01T10:00:00Z'});
  await g.helpers();await g.click('xmasLinkGo');await g.wait(1500);
  check('T1 lucka 1 via länken: det första uppdraget startar',(await g.xmas()).kind==='intro');
  const st=await playHunt(g);
  check('T2 julklapparna är hittade (leveransläget nåddes)',!!st&&st.phase==='deliver');
  if(st){await g.ev(([x,z])=>window.__walk(x,z,1.8),[st.tomte.x,st.tomte.z]);await g.wait(2800);}
  const card=await g.vis('round-xmas-result'),d=await g.door();
  check('T3 resultatkortet har rutan "Lucka 1 är avklarad" med rätt rubrik och poäng',card&&!!d&&d.vis&&d.inCard==='round-xmas-result'&&d.title==='★ LUCKA 1 ÄR AVKLARAD!'&&/^Du fick \d+ julpoäng och 1 stjärna i kalendern\.$/.test(d.line),JSON.stringify(d));
  check('T4 rutan säger att nästa lucka öppnas imorgon den 2/12 (datumet satt till 1 dec)',!!d&&d.next==='Nästa lucka öppnas imorgon den 2/12.'&&/Under tiden kan du spela resten av Julspelet/.test(d.tail),d&&d.next+' | '+d.tail);
  check('T5 rutan har en knapp till Julmenyn och en länk till kalendern (stora tryckytor)',!!d&&/JULMENYN/.test(d.menu)&&d.cal==='./julkalender/',d&&d.menu+' '+d.cal);
  await g.ev(()=>document.getElementById('xmasDoor')?.scrollIntoView({block:'center'}));await g.shot('l04-lucka-klar');
  const bh=await g.ev(()=>[...document.querySelectorAll('#xmasDoor button,#xmasDoor a')].map(e=>Math.round(e.getBoundingClientRect().height)));
  check('T6 knapparna i rutan är minst 44 px höga',bh.length===2&&bh.every(h=>h>=44),bh.join('/'));
  await g.click('xmasDoorMenu');await g.wait(800);
  check('T7 knappen öppnar Julmenyn (där resten av Julspelet finns) och rutan försvinner',await g.vis('round-xmas-continue')&&(await g.door())===null);
  await g.ctx.close();
}
{
  const g=await open('uppdrag=sandgrund&lucka=6','played',{date:'2026-12-06T10:00:00Z'});
  await g.click('xmasLinkGo');
  await g.until(()=>{const s=window.KarlstadRound.snapshot();return s.mission==='sandgrund'&&s.phase==='playing';},40);await g.wait(800);
  await g.ev(()=>window.__lr.finish(true));await g.wait(900);
  const d=await g.door(),lab=await g.txt('roundLeave');
  check('T8 Sandgrund via lucka 6: grundspelets resultatkort har rutan "Lucka 6 är avklarad" med 200 julpoäng och nästa lucka imorgon den 7/12',!!d&&d.inCard==='round-result'&&d.title==='★ LUCKA 6 ÄR AVKLARAD!'&&/200 julpoäng och 3 stjärnor/.test(d.line)&&d.next==='Nästa lucka öppnas imorgon den 7/12.',JSON.stringify(d));
  check('T9 Tillbaka-knappen på Sandgrund-kortet heter Julmenyn',/Julmenyn/.test(lab),lab);
  await g.shot('l05-sandgrund-klar');
  await g.click('xmasDoorMenu');await g.wait(900);
  check('T10 rutans knapp öppnar Julmenyn (inte grundspelets stadsvandring)',await g.vis('round-xmas-continue')&&(await g.door())===null);
  await g.ctx.close();
}
{
  const g=await open('','played');
  await g.click('xmasCozy');await g.wait(800);await g.click('xmasSandgrund');
  await g.until(()=>{const s=window.KarlstadRound.snapshot();return s.mission==='sandgrund'&&s.phase==='playing';},40);await g.wait(800);
  await g.ev(()=>window.__lr.finish(true));await g.wait(900);
  check('T11 utan kalenderlänk (startat från Julmenyn) visas ingen luckruta',(await g.door())===null&&/JULSTÄMPEL|Redan stämplad/.test(await g.txt('roundResultTarget')));
  await g.ctx.close();
}
{
  const g=await open('uppdrag=sandgrund&lucka=6','played');
  await g.click('xmasLinkGo');
  await g.until(()=>{const s=window.KarlstadRound.snapshot();return s.mission==='sandgrund'&&s.phase==='playing';},40);await g.wait(800);
  await g.ev(()=>window.__lr.finish(false));await g.wait(900);
  check('T12 förlorat uppdrag ger ingen luckruta',(await g.door())===null);
  await g.ctx.close();
}
check('L32 inga fel i konsolen under hela körningen',errs.length===0,errs.join(' | '));
await browser.close();server.close();
console.log(`\n${results.length-failed} av ${results.length} kontroller godkända.`);
process.exit(failed?1:0);
