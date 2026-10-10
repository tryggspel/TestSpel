#!/usr/bin/env node
// Verifiering i riktig webbläsare av julversionen (Julklappsjakten – 2.21-XMS): startvy, introduktion, leverans, sparning, rundor,
// butiksuppdrag (Cervera, Pressbyrån), Tomtezombies, miljö, väder, ljud och vägen tillbaka. Startar det riktiga spelet i headless Chromium,
// flyttar spelaren, klickar på gränssnittet och kontrollerar att spelet svarar rätt. Avslutar med kod 1 om något avviker.
// Sparar skärmbilder om SHOTS=katalog anges (ett urval av introduktionen, miljön, rundorna, butiksuppdragen och zombieläget).
//
//   npm i playcanvas@2.22.4 playwright     (CDN:en är blockerad i vissa sandlådor; den lokala kopian routas in)
//   python3 -m http.server 8902            (i spelkatalogen, på julgrenen)
//   node tools/xmas-flow/flow.mjs
//
// Env: PLAYWRIGHT=/väg/till/playwright/index.mjs  PLAYCANVAS=/väg/till/playcanvas.mjs  CHROME=/väg/till/chromium  PORT=8902
//      VIEW=1000x640 (eller 414x896m för mobil med tryckskärm, 896x414m för liggande telefon)  SHOTS=katalog
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om bildfrekvens, ljud i öronen eller känsla på en riktig telefon.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const PORT=process.env.PORT||8902,SHOTS=process.env.SHOTS||'';
const VIEW=process.env.VIEW||'1000x640',V=VIEW.match(/(\d+)x(\d+)(m?)/);
const {STALLS}=await import(pathToFileURL(path.join(root,'xmas/xmas-decor-data.mjs')).href);
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},...(V[3]?{hasTouch:true,isMobile:true,deviceScaleFactor:1}:{})});
const page=await ctx.newPage();const errs=[];
page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push('console: '+m.text().slice(0,160));});
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
// app.js får fyra hjälpfunktioner för testet (teleportera, position, blockerad ruta, appen). Ingen fil på disk ändras.
await page.route(/\/app\.js/,r=>{
  if(!r.request().url().includes('localhost:'+PORT))return r.continue();
  const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__blocked=blocked;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};window.__pos=()=>{const p=player.getPosition();return [p.x,p.z]};window.__turbo=()=>lastRound?.turboScale?.()||1;window.__tryMove=tryMove;app.on('update',update);");
  r.fulfill({contentType:'text/javascript',body:s});
});
const results=[];let failed=0;
const check=(name,ok,detail='')=>{results.push([ok?'OK  ':'FEL ',name,detail]);if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};
const wait=ms=>page.waitForTimeout(ms),ev=(fn,a)=>page.evaluate(fn,a);
const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+'.png')});}};
const ready=async()=>{await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await wait(700);};
// __walk går mot en punkt i små steg (som en spelare som håller inne gå-knappen). Måste läggas in igen efter varje omladdning.
const helpers=()=>ev(()=>{window.__walk=(tx,tz,step=1.3)=>new Promise(res=>{let n=0;const f=()=>{const [x,z]=window.__pos();const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz);if(d<.4||++n>700){res(d);return;}const k=Math.min(1,step/d);window.__tp(x+dx*k,z+dz*k,Math.atan2(-dx,-dz)*180/Math.PI,-5);requestAnimationFrame(f);};f();});});
const walk=(x,z,step)=>ev(([x,z,s])=>window.__walk(x,z,s),[x,z,step]);
const tp=async(x,z,yaw,pitch=-4,ms=1300)=>{await ev(([x,z,y,p])=>window.__tp(x,z,y,p),[x,z,yaw,pitch]);await wait(ms);};
const yawTo=(px,pz,tx,tz)=>Math.atan2(-(tx-px),-(tz-pz))*180/Math.PI;
const click=id=>ev(i=>document.getElementById(i)?.click(),id);
const until=async(fn,max=60)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await ev(fn))return true;await wait(250);}return false;};
const snap=()=>ev(()=>window.KarlstadDebug.journey().xmas.hunt.snapshot());
// Sök och hitta (introduktionen, rundorna, fri julvandring) är utan pilar till paketen. Testet går som en spelare som följer spåren: till närmaste ej plockade paket (i små steg genom spelets egen
// fångstlogik), och väntar på nästa tappade hög när inget finns. Stannar när fasen inte längre är "collect" (målet nått). Läser också av var varje ny hög hamnade (avstånd mellan högarna).
const collectHunt=async(maxSec=180,onPick=null)=>{
  const t0=Date.now(),centres=new Map();let picked=0;
  while(Date.now()-t0<maxSec*1000){
    const st=await ev(()=>{
      const r=window.KarlstadDebug.journey().xmas.hunt.run;if(!r)return {phase:'none',rains:[],best:null};
      const p=window.__pos();let best=null,bd=1e9;for(const k of r.packages){if(k.collected)continue;const d=Math.hypot(k.x-p[0],k.z-p[1]);if(d<bd){bd=d;best={x:k.x,z:k.z};}}
      return {phase:r.phase,rains:r.rains.map(a=>({s:a.serial,x:a.x,z:a.z,at:a.at})),best};
    });
    for(const a of st.rains)if(!centres.has(a.s))centres.set(a.s,a);
    if(st.phase!=='collect'&&st.phase!=='free')break;
    if(onPick&&await onPick(picked))break;
    if(st.best){await walk(st.best.x,st.best.z,1.4);picked++;}else await wait(250);
  }
  const list=[...centres.values()].sort((a,b)=>a.s-b.s),gaps=[];
  for(let i=1;i<list.length;i++)gaps.push(Math.round(Math.hypot(list[i].x-list[i-1].x,list[i].z-list[i-1].z)));
  return {rains:list.length,picked,gaps,secs:+((Date.now()-t0)/1000).toFixed(1)};
};

await page.goto(`http://localhost:${PORT}/?debug`);await ready();await helpers();

// ── A: startvyn och versionen ────────────────────────────────────────────────────────────────────────────────────
const menu=await ev(()=>({visible:!document.getElementById('round-xmas-intro').hidden,build:document.getElementById('xmasBuild').textContent,title:document.title,
  btns:['xmasCozy','xmasZombies','xmasBack'].map(id=>Math.round(document.getElementById(id).getBoundingClientRect().height)),version:window.KarlstadRound.version}));
const VERSION=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8')).version;
check('A1 startvyn visas med Julklappsjakten, Tomtezombies och Tillbaka',menu.visible);
check('A2 rätt version visas i startvyn och i spelet',menu.version===VERSION&&menu.build.includes(VERSION),menu.build);
check('A3 knapparna är minst 48 px höga',menu.btns.every(h=>h>=48),menu.btns.join('/'));
check('A4 titeln är julversionens',/Julklappsjakten/.test(menu.title),menu.title);
await shot('01-start');

// ── B: introduktionen: gå runt, leta spår i snön och hitta julklapparna (sök och hitta) ─────────────────────────────────────
await click('xmasCozy');await wait(900);
const s0=await snap();
const goalTxt=await ev(()=>document.getElementById('xmasGoal').textContent);
check('B1 introduktionen är en jakt: mål 14 julklappar och inga färdiga paket vid start (tomtarna tappar dem efter ett tag)',s0.kind==='intro'&&s0.drops===true&&s0.goal===14&&s0.phase==='collect'&&s0.total===0&&s0.rains===0,JSON.stringify({kind:s0.kind,goal:s0.goal,total:s0.total,rains:s0.rains,t:s0.t}));
check('B3 målet visas som "Hjälp tomten! Hitta 14 julklappar."',goalTxt==='Hjälp tomten! Hitta 14 julklappar.',goalTxt);
const gotFirst=await until(()=>window.KarlstadDebug.journey().xmas.hunt.run.rains.length>=1,40);
const f1=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,r=x.hunt.run,v=x.view.snapshot(),g=x.snapshot().guide;
  return {t:+r.t.toFixed(1),rains:r.rains.length,packages:r.packages.filter(k=>!k.collected).length,prints:r.rains.reduce((n,a)=>n+a.trail.length,0),printQuads:v.printQuads,ribbon:v.ribbon,goalRing:v.goal,arrow:g.on};});
check('B2 första tappade julklapparna kommer inom sju sekunder speltid: minst fem paket och ett spår av avtryck i snön',gotFirst&&f1.t<=7&&f1.packages>=5&&f1.prints>=6,JSON.stringify(f1));
check('B2b spåren syns i snön men ingen pil, strålband eller ring pekar på paketen medan man letar',f1.printQuads>=3&&!f1.arrow&&f1.ribbon===0&&!f1.goalRing,JSON.stringify({printQuads:f1.printQuads,arrow:f1.arrow,ribbon:f1.ribbon,ring:f1.goalRing}));
const goalTxt2=await ev(()=>document.getElementById('xmasGoal').textContent);
check('B3b när de första spåren kommer säger spelet att man ska följa dem ("spår i snön")',/spår i snön/.test(goalTxt2),goalTxt2);
await shot('02-intro-start');
let nShot=0;
const hx=await collectHunt(200,async()=>{if(++nShot===6){await wait(90);await shot('03-intro-samlar');}return false;});
const s1=await snap();
check('B4 målet nås genom att följa spåren och fasen blir leverans (minst två högar behövdes, '+hx.picked+' paket plockades på '+hx.secs+' s)',s1.phase==='deliver'&&s1.collected>=14&&hx.rains>=2,JSON.stringify({phase:s1.phase,collected:s1.collected,rains:hx.rains}));
check('B4b högarna ligger långt från varandra (minst 27 m mellan varje ny hög och den förra: '+hx.gaps.join('/')+' m)',hx.gaps.length>=1&&hx.gaps.every(g=>g>=27),hx.gaps.join('/'));
const cnt=await ev(()=>({count:document.querySelector('.xh-count').textContent,label:document.querySelector('.xh-label').textContent,guide:window.KarlstadDebug.journey().xmas.snapshot().guide}));
check('B5 efter målet visar HUD:en LÄMNA 14/14 och pilen pekar på tomten',/^\d+\/14$/.test(cnt.count)&&cnt.label==='LÄMNA'&&cnt.guide.on&&cnt.guide.id==='xmas-tomte',JSON.stringify(cnt));
await wait(500);await shot('04-leverans');
const tm=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.tomte);
await walk(tm.x,tm.z,1.8);await wait(2800);
const res=await ev(()=>({panel:!document.getElementById('round-xmas-result').hidden,r:window.KarlstadDebug.journey().xmas.hunt.run?.result,stamps:window.KarlstadDebug.journey().xmas.save.state.stamps,cells:[...document.querySelectorAll('#xmasResultGrid .xr-cell span')].map(e=>e.textContent)}));
check('B6 leverans ger resultatkort (JULKLAPPAR, inga paket "x/y"), poäng och första julstämpeln',res.panel&&res.r&&res.r.points>=240&&res.r.stamp===true&&!!res.stamps.intro&&res.cells[0]==='JULKLAPPAR',JSON.stringify({points:res.r?.points,stamp:res.r?.stamp,cells:res.cells}));
await shot('05-resultat');

// ── C: fortsätt, spara, ladda om ─────────────────────────────────────────────────────────────────────────────────
await click('xmasResultContinue');await wait(800);
check('C1 fortsättningsmenyn visar ny runda, butiksuppdrag och fri vandring',await ev(()=>!document.getElementById('round-xmas-continue').hidden&&['xmasRound','xmasShops','xmasFree'].every(id=>!!document.getElementById(id))));
await shot('06-fortsatt');
// Spelets egen sparning går via ett prefix. Den riktiga webbläsarlagringen läses via en ram som inte går via prefixet.
const keys=await ev(()=>{const f=document.createElement('iframe');document.body.append(f);const real=f.contentWindow.localStorage,out=[];for(let i=0;i<real.length;i++)out.push(real.key(i));f.remove();return out;});
check('C2 sparningen ligger i julens egna nycklar (inga oprefixade karlstad:-nycklar)',keys.length>0&&keys.every(k=>/^(xmas:karlstad:|karlstad-xmas:)/.test(k)),keys.join(', ').slice(0,200));
await page.reload();await ready();await wait(600);await helpers();
const after=await ev(()=>({stamps:window.KarlstadDebug.journey().xmas.save.state.stamps,status:document.getElementById('xmasStatus').textContent}));
check('C3 julstämpeln finns kvar efter omladdning',!!after.stamps.intro,after.status);

// ── D: rundor: tre julklappsjakter (Torget, Kungsgatan, Drottninggatan), samma upplägg som introduktionen ───────────────────────
for(const [id,goal] of [['round-torget',18],['round-kungsgatan',24],['round-drottninggatan',28]]){
  await ev(id=>window.KarlstadDebug.journey().xmas.startRound(id),id);await wait(1200);
  const s=await snap();
  const hud=await ev(()=>({timeHidden:document.querySelector('.xh-time')?.hidden??true,label:document.querySelector('.xh-label')?.textContent,mission:window.KarlstadDebug.journey().xmas.snapshot().guide.mission}));
  check('D '+id+' startar som jakt: mål '+goal+', inga färdiga paket, ingen klocka och HUD-texten JULKLAPPAR',s.kind==='round'&&s.drops===true&&s.goal===goal&&s.total===0&&hud.timeHidden&&hud.label==='JULKLAPPAR',JSON.stringify({kind:s.kind,goal:s.goal,total:s.total,klockaDold:hud.timeHidden,label:hud.label}));
  if(id==='round-kungsgatan')await shot('07-runda-start');
}
await ev(()=>window.KarlstadDebug.journey().xmas.startRound('round-kungsgatan'));await wait(1000);
let nShot2=0;
const hx2=await collectHunt(260,async()=>{if(++nShot2===8)await shot('08-runda-igang');return false;});
const s2=await snap();
check('D3 Kungsgatans runda: målet (24) nås genom att följa spåren längs gatan, minst tre högar, och högarna ligger långt från varandra ('+hx2.gaps.join('/')+' m)',s2.phase==='deliver'&&s2.collected>=24&&hx2.rains>=3&&hx2.gaps.every(g=>g>=50),JSON.stringify({phase:s2.phase,collected:s2.collected,rains:hx2.rains,gaps:hx2.gaps,secs:hx2.secs}));
const tm2=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.tomte);await walk(tm2.x,tm2.z,2.2);await wait(2800);
const r2=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run?.result);
check('D4 Kungsgatans runda går att klara och ger sin stämpel',!!r2&&r2.stampId==='round-kungsgatan'&&r2.stamp===true&&r2.drops===true,JSON.stringify({points:r2?.points,collected:r2?.collected,goal:r2?.goal}));

// ── K: miljön runt Stora Torget ──────────────────────────────────────────────────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(1500);
await tp(0,27,0,-3,1500);
const env=await ev(()=>window.KarlstadDebug.journey().xmas.decor.snapshot());
check('K1 julmiljön finns: åtta stånd, granar, ljusslingor på fasaderna och snöfall',env.stalls===8&&env.firs>=4&&env.bulbs>0&&env.strings>0&&env.flakes>=60,JSON.stringify({stalls:env.stalls,firs:env.firs,bulbs:env.bulbs,strings:env.strings,flakes:env.flakes}));
check('K2 tomtar syns nära spelaren (högst sex aktiva)',env.tomte>=1&&env.tomte+env.windows<=12,JSON.stringify({tomte:env.tomte,fonster:env.windows}));
await tp(0,14,0,9,1500);await shot('09-granen');
const st=STALLS[2],sx=st.x+st.fx*6.5,sz=st.z+st.fz*6.5;await tp(sx,sz,yawTo(sx,sz,st.x,st.z),-3,1500);await shot('10-stand');
await tp(0,-12,0,-1,1500);await shot('11-portalen');
await tp(8,18,-90,-3,1500);await shot('12-torget-ost');
const fa=await ev(()=>{const d=window.KarlstadDebug.journey().xmas.decor.facade;return {w:d.windows.slice(0,1),r:d.roofs.slice(0,1)};});
if(fa.w[0]){const w=fa.w[0],px=w.x+w.nx*14,pz=w.z+w.nz*14;await tp(px,pz,yawTo(px,pz,w.x,w.z),6,1800);await shot('13-fonster');}
if(fa.r[0]){const r=fa.r[0],d=Math.hypot(r.x,r.z)||1,px=r.x-r.x/d*34,pz=r.z-r.z/d*34;await tp(px,pz,yawTo(px,pz,r.x,r.z),14,1800);await shot('14-tak');}
// Julens ljus är egna objekt framför husen. Fasadmodulerna (bl.a. Kungsgatan 14, 16 och 18) är oförändrade mot grundspelet (JULVERSION.md, avsnitt 5).
check('K3 fasadljusen ligger på husen längs torget',fa.w.length>0&&fa.r.length>0,JSON.stringify({fonster:env.facadeWindows,tak:env.facadeRoofs}));

// ── L: fri julvandring: paketen tar inte slut, och högarna kommer med god spridning i tid och plats ─────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(800);
const gotRain=await until(()=>window.KarlstadDebug.journey().xmas.hunt.run.rains.length>=1,90);
const rn1=await ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;return {t:+r.t.toFixed(1),rains:r.rains.length,packages:r.packages.filter(k=>!k.collected).length,prints:r.rains.reduce((n,x)=>n+x.trail.length,0)};});
// (Paketen läggs på fria platser: i trånga gator blir det färre än de sex till nio som begärs, men aldrig färre än fyra vanliga och ett bonus.)
check('L1 fri julvandring: första tappade paketen kommer inom sju sekunder speltid, minst fem (fyra vanliga och ett bonus), med ett spår av avtryck till dem',gotRain&&rn1.t<=7&&rn1.packages>=5&&rn1.prints>=6,JSON.stringify(rn1));
await shot('free-1-regn');
// Plocka allt som finns (teleport till varje paket), fyra varv: när allt är plockat kommer nästa hög efter 8–14 sekunder (inte direkt, men heller inte efter en minut eller mer). Var ny hög noteras.
const runT=()=>ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.t),uncollected=()=>ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.packages.filter(k=>!k.collected).map(k=>({x:k.x,z:k.z})));
const seen=new Map(),noteRains=async()=>{for(const a of await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.rains.map(a=>({s:a.serial,x:a.x,z:a.z,at:a.at,n:a.count}))))if(!seen.has(a.s))seen.set(a.s,a);};
await noteRains();
let worst=0,best=1e9,collected=0;
for(let round=0;round<4;round++){
  for(const k of await uncollected()){await tp(k.x,k.z,0,-4,320);collected++;}
  let left=await uncollected();for(let again=0;again<3&&left.length;again++){for(const k of left){await tp(k.x,k.z,0,-4,320);}left=await uncollected();}
  const t0=await runT();
  const got=await until(()=>window.KarlstadDebug.journey().xmas.hunt.run.packages.some(k=>!k.collected),60);
  const gap=got?(await runT())-t0:999;worst=Math.max(worst,gap);best=Math.min(best,gap);
  await noteRains();
}
check('L2 när paketen tagit slut kommer nästa hög efter 8–14 s speltid, aldrig direkt och aldrig efter mer än 17 s (fyra varv, kortast '+best.toFixed(1)+' s, längst '+worst.toFixed(1)+' s, '+collected+' paket plockade)',worst<=17&&best>=7&&collected>=20,JSON.stringify({kortast:+best.toFixed(1),längst:+worst.toFixed(1),collected}));
const rainOrder=[...seen.values()].sort((a,b)=>a.s-b.s),spread=[];
for(let i=1;i<rainOrder.length;i++)spread.push(Math.round(Math.hypot(rainOrder[i].x-rainOrder[i-1].x,rainOrder[i].z-rainOrder[i-1].z)));
check('L3 högarna ligger långt från varandra: minst 36 m mellan varje ny hög och den förra ('+spread.join('/')+' m, '+rainOrder.length+' högar)',rainOrder.length>=4&&spread.every(g=>g>=36),JSON.stringify({spread,högar:rainOrder.length}));
await shot('free-2-nytt-regn');

// ── E: butiksuppdrag ─────────────────────────────────────────────────────────────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(1200);
const a=await ev(()=>window.KarlstadDebug.journey().places.arrivalFor('pressbyran'));await tp(a.x,a.z,a.yaw,-4,1200);
const prompt=await ev(()=>window.KarlstadDebug.journey().places.prompt(window.KarlstadDebug.position()));
check('E1 Pressbyrån erbjuder Tomtarnas fikaorder',!!prompt&&/TOMTARNAS FIKAORDER/.test(prompt.tactic),prompt?.label);
await shot('15-pressbyran');
check('E1b det snöar utomhus vid Pressbyrån',await ev(()=>window.KarlstadDebug.journey().xmas.decor.snapshot().flakes>0));
await wait(400);
const shopRowTxt=await ev(()=>window.KarlstadDebug.journey().xmas.snapshot().guide.mission);
check('E1c i fri julvandring visar uppdragsraden att en butiksutmaning finns i närheten (UPPDRAG: …), utan pil',/UPPDRAG: /.test(shopRowTxt),shopRowTxt);
const serialBefore=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.serial);
await ev(()=>window.KarlstadDebug.use());await wait(700);await shot('16-pressbyran-order');
const order=await ev(()=>window.KarlstadDebug.journey().places.run?.order.items);
for(const id of order||[]){await ev(i=>window.KarlstadDebug.journey().places.pick(i),id);await wait(150);}
await wait(1200);await shot('17-pressbyran-klart');
const del=await snap();
const delGuide=await ev(()=>window.KarlstadDebug.journey().xmas.snapshot().guide);
check('E2 klar order startar ett ärende vid sidan om jakten (leverans till tomten medan fri julvandring fortsätter): samma körning, pilen pekar på tomten',del.kind==='free'&&del.errand==='delivery-pressbyran'&&del.drops===true&&delGuide.on&&delGuide.id==='xmas-errand'&&/BÄR FIKAT/.test(delGuide.mission),JSON.stringify({kind:del.kind,errand:del.errand,pil:delGuide.id,rad:delGuide.mission}));
// Grundspelets resultatkort ligger kvar i 14 s; en spelare trycker FORTSÄTT (annars stänger första knapptrycket vid nästa plats kortet).
await ev(()=>{const r=document.getElementById('placeResult');if(r&&!r.hidden)r.querySelector('.pr-close').click();});
check('E2b resultatkortet efter Pressbyrån går att stänga med FORTSÄTT',await ev(()=>document.getElementById('placeResult').hidden));
await wait(500);await shot('18-pressbyran-leverans');
const pointsBefore=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.points);
const t3=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.errand.tomte);await walk(t3.x,t3.z,1.8);await wait(1200);
const done3=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,r=x.hunt.run;return {stamp:!!x.save.state.stamps.pressbyran,serial:r.serial,errand:r.errand,points:r.points,phase:r.phase,result:!document.getElementById('round-xmas-result').hidden};});
check('E3 leverans ger stämpeln Tomtarnas fikaorder och +100 poäng; jakten fortsätter i samma körning utan eget resultatkort',done3.stamp&&done3.errand===null&&done3.serial===serialBefore&&done3.phase==='free'&&done3.points>=pointsBefore+100&&!done3.result,JSON.stringify({...done3,serialBefore,pointsBefore}));
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(1000);
const c=await ev(()=>window.KarlstadDebug.journey().places.arrivalFor('cervera'));await tp(c.x,c.z,c.yaw,-4,1500);
check('E4b det snöar inte inomhus i Mitt i City (snöfallet är av, ingen snö i hallen)',await ev(()=>window.KarlstadDebug.journey().xmas.decor.snapshot().flakes===0));
await ev(()=>window.KarlstadDebug.use());await wait(700);await shot('19-cervera');
const items=await ev(()=>window.KarlstadDebug.journey().places.run?.items.map(i=>({x:i.x,z:i.z})));
for(const it of items||[]){await tp(it.x,it.z,0,-8,700);}
await tp(c.x,c.z,c.yaw,-4,600);await ev(()=>window.KarlstadDebug.use());await wait(1000);
check('E4 Cervera: Tomtarnas fikabord ger stämpel',await ev(()=>!!window.KarlstadDebug.journey().xmas.save.state.stamps.cervera));
// E4c: in och ut genom butiksfronten till fots. Provet går med små steg (som på en riktig enhet med 60 bilder per sekund; i den här webbläsaren är stegen annars stora och hoppar över
// en smal spärr) genom spelets egen rörelse och kollision (tryMove), över hela fronten, i båda riktningar. Förut fanns en osynlig, 10 cm tjock vägg tvärs över fronten.
const door=await ev(()=>{
  const e=window.KarlstadDebug.journey().places.get('cervera').entrance,a=e.yaw*Math.PI/180,n={x:Math.sin(a),z:Math.cos(a)},t={x:Math.cos(a),z:-Math.sin(a)},res=[];
  for(const step of [.03,.07,.11,.2])for(const off of [-3,0,3])for(const sgn of [-1,1]){
    const sx=e.x-sgn*n.x*2.5+t.x*off,sz=e.z-sgn*n.z*2.5+t.z*off;window.__tp(sx,sz,0,-4);
    let moved=0;for(let i=0;i<500&&moved<5;i++){window.__tryMove(sgn*n.x*step,sgn*n.z*step,1/60);const [x,z]=window.__pos();moved=(x-sx)*sgn*n.x+(z-sz)*sgn*n.z;}
    res.push({dir:sgn<0?'in':'ut',step,off,moved:+moved.toFixed(2)});
  }
  return res;
});
check('E4c man går in i och ut ur Cervera genom hela butiksfronten med små steg (24 gånger in och 24 ut, ingen fastnar)',door.every(r=>r.moved>=4.9),JSON.stringify(door.filter(r=>r.moved<4.9).slice(0,4))||'');

// E5: butiksutmaningarna är en del av Julklappsjakten: Cervera-uppdraget går att göra mitt i Torgets runda utan att jakten tappas bort (samma körning, fortfarande i insamlingsfasen).
await ev(()=>window.KarlstadDebug.journey().xmas.startRound('round-torget'));await wait(1000);
const r5=await ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;return {serial:r.serial,id:r.id};});
const c5=await ev(()=>window.KarlstadDebug.journey().places.arrivalFor('cervera'));await tp(c5.x,c5.z,c5.yaw,-4,1500);
await ev(()=>window.KarlstadDebug.use());await wait(700);
const items5=await ev(()=>window.KarlstadDebug.journey().places.run?.items.map(i=>({x:i.x,z:i.z})));
for(const it of items5||[]){await tp(it.x,it.z,0,-8,700);}
await tp(c5.x,c5.z,c5.yaw,-4,600);await ev(()=>window.KarlstadDebug.use());await wait(1200);
const after5=await ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;return {serial:r.serial,id:r.id,phase:r.phase,items:!!window.KarlstadDebug.journey().places.run};});
check('E5 butiksutmaningen i Cervera går att göra mitt i Torgets julklappsjakt: jakten är kvar (samma körning, fortfarande insamling) och uppdraget har startat',!!items5&&items5.length>0&&after5.serial===r5.serial&&after5.id===r5.id&&after5.phase==='collect',JSON.stringify({före:r5,efter:after5,föremål:items5?.length}));
await ev(()=>{const r=document.getElementById('placeResult');if(r&&!r.hidden)r.querySelector('.pr-close').click();});

// ── F: Tomtezombies ──────────────────────────────────────────────────────────────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.startZombies());await wait(2600);
const zs=await ev(()=>({mode:window.KarlstadDebug.journey().xmas.snapshot().mode,peaceful:window.KarlstadDebug.journey().rush.peaceful,vit:!document.querySelector('.xh-vitals').hidden,music:window.KarlstadMusic.snapshot().xmas.mode}));
check('F1 Tomtezombies startar i zombieläge med liv och kuslig musik',zs.mode==='zombies'&&!zs.peaceful&&zs.vit&&zs.music==='eerie',JSON.stringify(zs));
check('F1b grundspelets resultatkort från Cervera ligger inte kvar över Tomtezombies',await ev(()=>document.getElementById('placeResult').hidden));
await ev(()=>{const j=window.KarlstadDebug.journey();const p=window.__pos();for(const [i,k] of ['walker','runner','tank','golden'].entries()){const a=j.actors.find(a=>!a.active);j.spawn(a,{x:p[0]-4.5+i*3,z:p[1]-9},k);}});
// Direkt efter att de skapats: de jagar spelaren och Stress-Nisse är snabb, så en stund senare kan en redan ha nått fram och försvunnit.
const names=await ev(()=>window.KarlstadDebug.journey().actors.filter(a=>a.active).map(a=>a.name));
check('F2 de fyra tomtezombierna finns (Paket-Pelle, Stress-Nisse, Gröt-Gunnar, Guld-Nisse)',['Paket-Pelle','Stress-Nisse','Gröt-Gunnar','Guld-Nisse'].every(nm=>names.includes(nm)),names.join(','));
await wait(1200);await shot('20-tomtezombies');
const act=await ev(()=>window.KarlstadDebug.journey().actors.filter(a=>a.active).length);
check('F3 högst sex aktiva zombier (grundspelets gräns)',act<=6,String(act));
await ev(()=>{const j=window.KarlstadDebug.journey();j.health=1;const p=window.__pos();const a=j.actors.find(a=>!a.active)||j.actors[0];j.spawn(a,{x:p[0]+.3,z:p[1]-.3},'walker');j.contactCooldown=0;});await wait(3500);
check('F4 när liven tar slut visas eget slutkort med Försök igen',await ev(()=>!document.getElementById('round-xmas-result').hidden&&/FÖRSÖK IGEN/.test(document.getElementById('xmasResultContinue').textContent)));
await shot('21-tomtezombies-slut');

// F4b–F11: Tomtezombies har nivåer. Efter ett förlorat försök kan samma nivå göras om, en klarad nivå leder till nästa i stället för till Julklappsjaktens meny, och nivå 2 är en annan bana med fler
// paket, snabbare och tätare tomtezombier. Spelet går på riktigt (paket plockas, tomten tar emot dem); zombierna hålls borta bara medan paketen plockas så att provet inte förlorar på vägen.
const failCard=await ev(()=>({title:document.getElementById('xmasResultTitle').textContent,line:document.getElementById('xmasResultLine').textContent,b1:document.getElementById('xmasResultContinue').textContent.trim(),b2:document.getElementById('xmasResultFree').textContent.trim()}));
check('F4b slutkortet efter att man blivit tagen säger nivån: "FÖRSÖK IGEN · NIVÅ 1" och JULMENYN',failCard.title==='DU BLEV TAGEN!'&&/^FÖRSÖK IGEN · NIVÅ 1/.test(failCard.b1)&&failCard.b2==='JULMENYN'&&/^Nivå 1\./.test(failCard.line),JSON.stringify(failCard));
await click('xmasResultContinue');await wait(2800);
const again=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,r=x.hunt.run;return {lv:x.zombieLevel?.n,goal:r.goal,collected:r.collected,mode:x.snapshot().mode,health:Math.round(window.KarlstadDebug.journey().health)};});
check('F5 FÖRSÖK IGEN startar samma nivå (nivå 1, tjugo paket, noll insamlade) med full hälsa',again.lv===1&&again.goal===20&&again.collected===0&&again.mode==='zombies'&&again.health>=90,JSON.stringify(again));
check('F5b HUD:en visar nivån framför poängen ("NIVÅ 1 · JULPOÄNG")',await ev(()=>document.querySelector('.xh-points span').textContent)==='NIVÅ 1 · JULPOÄNG');
const calm=()=>ev(()=>{const j=window.KarlstadDebug.journey();j.actors.forEach(a=>{a.active=false;});j.rush.nextPatrol=1e9;j.health=100;});
const collectGoal=async()=>{
  await calm();
  for(let round=0;round<4;round++){
    const left=await ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;return r.collected>=r.goal?[]:r.packages.filter(k=>!k.collected&&k.kind==='regular').slice(0,r.goal-r.collected).map(k=>({x:k.x,z:k.z}));});
    if(!left.length)break;
    for(const k of left){await calm();await tp(k.x,k.z,0,-4,330);}
  }
};
await collectGoal();
const tomte=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.tomte);await calm();await tp(tomte.x,tomte.z,0,-4,2800);
const z1=await ev(()=>({shown:!document.getElementById('round-xmas-result').hidden,kicker:document.getElementById('xmasResultKicker').textContent,title:document.getElementById('xmasResultTitle').textContent,line:document.getElementById('xmasResultLine').textContent,
  b1:document.getElementById('xmasResultContinue').textContent.trim(),b2:document.getElementById('xmasResultFree').textContent.trim(),cleared:window.KarlstadDebug.journey().xmas.save.state.zombies.cleared,stamp:!!window.KarlstadDebug.journey().xmas.save.state.stamps.zombies}));
check('F6 klarad nivå 1: kortet säger NIVÅ 1 KLARAD, erbjuder NÄSTA NIVÅ · 2 (inte Julklappsjaktens meny) och JULMENYN, sparar nivån och ger stämpeln',z1.shown&&/NIVÅ 1 KLARAD/.test(z1.title)&&/^NÄSTA NIVÅ · 2/.test(z1.b1)&&z1.b2==='JULMENYN'&&z1.cleared===1&&z1.stamp&&/Nästa nivå: 2 · TORGET, med 22 paket/.test(z1.line),JSON.stringify(z1));
await shot('22-zombies-nivå-klar');
await click('xmasResultContinue');await wait(3000);
const z2=await ev(()=>{
  const j=window.KarlstadDebug.journey(),x=j.xmas,r=x.hunt.run,p=window.__pos(),a=j.actors.find(q=>!q.active);j.spawn(a,{x:p[0]+6,z:p[1]-6},'walker');
  return {mode:x.snapshot().mode,lv:x.zombieLevel?.n,layout:x.zombieLevel?.layout,id:r.id,goal:r.goal,packages:r.packages.filter(k=>k.kind==='regular').length,label:document.querySelector('.xh-points span').textContent,speed:+a.speed.toFixed(3),tuned:Object.prototype.hasOwnProperty.call(j,'spawn'),title:r.title};
});
check('F7 NÄSTA NIVÅ startar nivå 2 på Torget: 22 paket att samla, HUD "NIVÅ 2 · JULPOÄNG" och snabbare tomtezombier (Paket-Pelle ×1,05)',z2.mode==='zombies'&&z2.lv===2&&z2.layout==='round-torget'&&z2.id==='zombies-2'&&z2.goal===22&&z2.packages>=22&&z2.label==='NIVÅ 2 · JULPOÄNG'&&Math.abs(z2.speed-1.65*1.05)<.01&&z2.tuned,JSON.stringify(z2));
await wait(1500);
const z2b=await ev(()=>{const r=window.KarlstadDebug.journey().rush;return {ahead:+(r.nextPatrol-r.spent).toFixed(2),state:r.state};});
check('F8 nästa patrull ligger högst 11 s fram på nivå 2 (grundspelets egen takt är 14 s i början)',z2b.state==='playing'&&z2b.ahead<=11.05,JSON.stringify(z2b));
await shot('23-zombies-nivå-2');
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(900);
const z3=await ev(()=>({intro:!document.getElementById('round-xmas-intro').hidden,btn:document.getElementById('xmasZombies').textContent.replace(/\s+/g,' ').trim(),note:document.getElementById('xmasZombieNote').textContent,tuned:Object.prototype.hasOwnProperty.call(window.KarlstadDebug.journey(),'spawn')}));
check('F9 i startvyn står nästa nivå på Tomtezombies-knappen och raden under säger hur långt man kommit; zombiefarten är återställd',z3.intro&&/^TOMTEZOMBIES · NIVÅ 2/.test(z3.btn)&&/Du har klarat 1 nivå\. Nästa: nivå 2 · TORGET \(22 paket/.test(z3.note)&&!z3.tuned,JSON.stringify(z3));
await shot('24-zombies-startvy');
await click('xmasZombies');await wait(2800);
check('F10 knappen startar nästa nivå (nivå 2) och inte om nivå 1',await ev(()=>window.KarlstadDebug.journey().xmas.zombieLevel?.n===2));
// Nivå 2, 3 och 4 klaras i tur och ordning på julrundornas banor (Torget, Kungsgatan, Drottninggatan); NÄSTA NIVÅ på kortet startar nästa.
const lvl=[];
for(const [n,layout,goal] of [[2,'round-torget',22],[3,'round-kungsgatan',24],[4,'round-drottninggatan',26]]){
  const st=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,r=x.hunt.run;return {lv:x.zombieLevel?.n,layout:x.zombieLevel?.layout,goal:r.goal,mode:x.snapshot().mode};});
  await collectGoal();
  const t=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.tomte);await calm();await tp(t.x,t.z,0,-4,2800);
  const card=await ev(()=>({shown:!document.getElementById('round-xmas-result').hidden,title:document.getElementById('xmasResultTitle').textContent,b1:document.getElementById('xmasResultContinue').textContent.trim(),
    cleared:window.KarlstadDebug.journey().xmas.save.state.zombies.cleared}));
  lvl.push({n,ok:st.lv===n&&st.layout===layout&&st.goal===goal&&st.mode==='zombies'&&card.shown&&new RegExp('NIVÅ '+n+' KLARAD').test(card.title)&&new RegExp('^NÄSTA NIVÅ · '+(n+1)).test(card.b1)&&card.cleared===n,st,card});
  if(n===3)await shot('25-zombies-kungsgatan-klar');
  await click('xmasResultContinue');await wait(3000);
}
check('F11 nivå 2, 3 och 4 går att klara i tur och ordning (Torget 22, Kungsgatan 24, Drottninggatan 26 paket) och sparas',lvl.every(l=>l.ok),lvl.map(l=>l.n+':'+(l.ok?'ok':JSON.stringify({st:l.st,card:l.card}))).join(' | '));
const z5=await ev(()=>{
  const j=window.KarlstadDebug.journey(),x=j.xmas,p=window.__pos(),a=j.actors.find(q=>!q.active);j.spawn(a,{x:p[0]+6,z:p[1]-6},'walker');
  return {lv:x.zombieLevel?.n,layout:x.zombieLevel?.layout,goal:x.hunt.run.goal,speed:+a.speed.toFixed(3),label:document.querySelector('.xh-points span').textContent,every:x.zombieLevel?.patrolEvery};
});
check('F12 nivå 5 börjar om på Torget med 28 paket, zombierna är ×1,2 snabbare och patrullerna kommer med högst 8 s mellanrum',z5.lv===5&&z5.layout==='round-torget'&&z5.goal===28&&Math.abs(z5.speed-1.65*1.2)<.01&&z5.label==='NIVÅ 5 · JULPOÄNG'&&z5.every===8,JSON.stringify(z5));
await shot('26-zombies-nivå-5');
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(600);

// ── G: Julklappsjakten har inga zombier ──────────────────────────────────────────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.startIntro());await wait(6000);
const cz=await ev(()=>({zombies:window.KarlstadDebug.journey().actors.filter(a=>a.active).length,music:window.KarlstadMusic.snapshot().xmas.mode,peaceful:window.KarlstadDebug.journey().rush.peaceful}));
check('G1 Julklappsjakten har inga zombier och lugn musik',cz.zombies===0&&cz.peaceful&&cz.music==='cozy',JSON.stringify(cz));

// ── H: väder och ljud ────────────────────────────────────────────────────────────────────────────────────────────
const w0=await ev(()=>window.KarlstadDebug.journey().xmas.decor.snapshot().flakes);
await click('roundPause');await wait(700);await shot('22-pausmeny');
await click('xmasWeatherBtn');await wait(300);await click('xmasWeatherBtn');await wait(300);
const wl=await ev(()=>({btn:document.getElementById('xmasWeatherBtn').textContent,weather:window.KarlstadDebug.journey().xmas.save.weather}));
await click('roundResume');await wait(1500);
const w1=await ev(()=>window.KarlstadDebug.journey().xmas.decor.snapshot().flakes);
check('H1 vädereffekter går att minska och stänga av (100 → 0 flingor) och valet sparas',w0>=90&&w1===0&&wl.weather==='off',JSON.stringify({före:w0,efter:w1,val:wl.weather}));
await ev(()=>window.KarlstadMusic.setMuted(true));check('H2 mute stänger av musiken',await ev(()=>window.KarlstadMusic.muted===true));await ev(()=>window.KarlstadMusic.setMuted(false));

// ── I: vägen tillbaka till grundspelet ───────────────────────────────────────────────────────────────────────────
check('I1 knappen Tillbaka till Karlstad-spelet finns i startvyn och i pausmenyn',await ev(()=>!!document.getElementById('xmasBack')&&!!document.getElementById('xmasBackPause')));
check('J inga oväntade fel i konsolen',errs.length===0,errs.slice(0,3).join(' | '));

console.log(`\n${VIEW}: ${results.length-failed}/${results.length} OK, ${failed} fel`);
await browser.close();
process.exit(failed?1:0);
