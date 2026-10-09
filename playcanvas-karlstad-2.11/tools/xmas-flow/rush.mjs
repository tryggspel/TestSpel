#!/usr/bin/env node
// Verifiering i riktig webbläsare av JulRushen i läget MARATON (Julklappsjaktens version av TempoRush: tempot stiger var 12:e sekund och klockan blir trängre; turbon slås på av sig själv): knappen i startvyn och rushmenyn,
// start, pil och stråle, paket, tempo, liv, gåvor, resultatkort, rekord och julstämpel, att ge upp, och att övriga lägen (Julklappsjakten) är opåverkade efteråt.
// De tolv rusherna, topplistan och utmaningarna provas i levels.mjs.
// Startar det riktiga spelet i headless Chromium, låter en liten bot följa spelets egna mål bildruta för bildruta (i speltid, inte i klocktid),
// klickar på gränssnittet och kontrollerar att spelet svarar rätt. Avslutar med kod 1 om något avviker. Sparar skärmbilder om SHOTS=katalog anges.
//
//   python3 -m http.server 8902            (i spelkatalogen, på julgrenen)
//   node tools/xmas-flow/rush.mjs
//
// Env som i flow.mjs: PLAYWRIGHT, PLAYCANVAS, CHROME, PORT, VIEW (414x896m = mobil med tryckskärm), SHOTS.
// LONG=1 lägger till en lång körning (R10): boten följer banan på stadens riktiga gator till tempo 12 (flera minuters speltid, 5–15 minuter på klockan);
// LONG_SECONDS=1500 är högsta tillåtna klocktid för den.
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
  const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__blocked=blocked;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};window.__pos=()=>{const p=player.getPosition();return [p.x,p.z]};window.__turbo=()=>lastRound?.turboScale?.()||1;app.on('update',update);");
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

await page.goto(`http://localhost:${PORT}/?debug`);await ready();await helpers();


// En bot som följer spelets egna mål: varje bildruta flyttas spelaren sträckan 7,2 m/s × spelets egen fartfaktor (turbon, tempots fart och gåvornas fart: KarlstadRound.turboScale) × skicklighet, mätt i SPELTID
// (journey.elapsed), så att den går lika långt per speltidssekund oavsett hur trög mjukvarurenderingen är. skill 0 = står still.
await ev(()=>{
  window.__skill=1;
  window.__botOn=false;
  window.__botStart=()=>{
    if(window.__botOn)return;window.__botOn=true;let last=null;
    const f=()=>{
      if(!window.__botOn)return;
      const j=window.KarlstadDebug.journey(),t=j.tempo,tg=t.target;
      if(t.running&&tg){
        const el=j.elapsed;
        if(last!==null&&el>last){
          const [x,z]=window.__pos(),dx=tg.x-x,dz=tg.z-z,d=Math.hypot(dx,dz),v=7.2*window.__turbo()*window.__skill,s=Math.min(d,v*(el-last));
          if(s>0&&d>.01){window.__dist=(window.__dist||0)+s;window.__tp(x+dx/d*s,z+dz/d*s,Math.atan2(-dx,-dz)*180/Math.PI,-4);}
        }
        last=el;
      }else last=null;
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  };
  window.__botStop=()=>{window.__botOn=false;};
});
// Knapparna i startvyn och fortsättningsmenyn öppnar rushmenyn; MARATON där startar den gamla, oändliga rushen.
const startMarathon=async(from='xmasRushStart')=>{await click(from);await wait(500);await click('xmasRushMarathon');};
const rushSnap=()=>ev(()=>window.KarlstadDebug.journey().xmas.julrush.snapshot());
const hudText=()=>ev(()=>({label:document.querySelector('.xh-label').textContent,count:document.querySelector('.xh-count').textContent,hearts:document.querySelector('.xh-hearts').textContent,pts:document.querySelector('.xh-points b').textContent,name:document.querySelector('.xh-points span').textContent,chips:[...document.querySelectorAll('.xh-chip')].map(c=>c.textContent)}));
const visible=sel=>ev(s=>{const e=document.querySelector(s);if(!e||e.hidden)return false;const cs=getComputedStyle(e),r=e.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0;},sel);
// Spela tills ett villkor är sant (poll var 250 ms), högst max sekunder klocktid.
const until=async(fn,max=60)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await ev(fn))return true;await wait(250);}return false;};

// ── R0: startvyn har JULRUSHEN ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const m0=await ev(()=>({vis:!document.getElementById('round-xmas-intro').hidden,h:Math.round(document.getElementById('xmasRushStart').getBoundingClientRect().height),text:document.getElementById('xmasRushStart').textContent.trim(),note:document.getElementById('xmasRushStartNote').textContent}));
check('R0 startvyn har knappen JULRUSHEN (minst 48 px hög) med en förklaring av de tolv rusherna',m0.vis&&m0.h>=48&&/JULRUSHEN/.test(m0.text)&&/Tolv rusher/.test(m0.note),JSON.stringify(m0));
await shot('r00-start');

// ── R1: start ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
await click('xmasRushStart');await wait(500);
const menu0=await ev(()=>({panel:!document.getElementById('round-xmas-rush').hidden,tiles:document.querySelectorAll('#xmasRushGrid .xr-tile:not(.xr-ot)').length,ot:document.querySelectorAll('#xmasRushGrid .xr-tile.xr-ot').length,play:document.getElementById('xmasRushPlay').textContent.trim(),marathon:document.getElementById('xmasRushMarathon').getBoundingClientRect().height}));
check('R0b JULRUSHEN öppnar rushmenyn med tolv rutor, en bred ÖVERTID-ruta, en spelaknapp och MARATON (minst 48 px hög)',menu0.panel&&menu0.tiles===12&&menu0.ot===1&&/SPELA RUSH 1/.test(menu0.play)&&menu0.marathon>=48,JSON.stringify(menu0));
await shot('r00b-rushmeny');
await click('xmasRushMarathon');await wait(3200);
const r1=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,j=window.KarlstadDebug.journey();return {mode:x.snapshot().mode,rush:x.julrush.snapshot(),cls:['xmas-rush','xmas-cozy','xmas-on'].map(c=>document.body.classList.contains(c)),music:window.KarlstadMusic.snapshot().xmas,peaceful:j.rush.peaceful,view:x.view.snapshot(),zombies:j.actors.filter(a=>a.active).length,tempo:j.tempo.running};});
check('R1 JulRushen startar: läge rush, tempo 1, tre liv, körande klocka och inga zombier',r1.mode==='rush'&&r1.rush.state==='running'&&r1.rush.level===1&&r1.rush.lives===3&&r1.tempo&&r1.zombies===0&&r1.peaceful,JSON.stringify({mode:r1.mode,lvl:r1.rush.level,lives:r1.rush.lives,tempo:r1.tempo}));
check('R1b kroppsklasserna är rätt (xmas-rush, xmas-cozy, xmas-on) och julens rusmusik spelar',r1.cls.every(Boolean)&&r1.music.mode==='rush',JSON.stringify({cls:r1.cls,music:r1.music.mode}));
check('R1c banan är utlagd och de första paketen och målstrålen syns',r1.rush.packages>=8&&r1.view.shown>=2&&r1.view.goal===true,JSON.stringify({packages:r1.rush.packages,shown:r1.view.shown,goal:r1.view.goal}));
const arrow=await ev(()=>({vis:!document.getElementById('tempoArrow').hidden,disp:getComputedStyle(document.getElementById('tempoArrow')).display,dist:document.getElementById('tempoArrowDist').textContent,hint:document.getElementById('tempoArrowHint').textContent}));
check('R1d den stora riktningspilen visas med avstånd och text',arrow.vis&&arrow.disp!=='none'&&/ M$/.test(arrow.dist)&&arrow.hint.length>2,JSON.stringify(arrow));
const rgeo=await ev(()=>{const a=document.getElementById('tempoArrow').getBoundingClientRect(),h=document.getElementById('xmasHud').getBoundingClientRect(),vw=innerWidth,vh=innerHeight,cz={x:vw*.3,r:vw*.7,y:vh*.28,b:vh*.72};
  return {a:{x:Math.round(a.x),y:Math.round(a.y),w:Math.round(a.width),h:Math.round(a.height)},hudBottom:Math.round(h.bottom),hit:!(a.right<=cz.x||a.x>=cz.r||a.bottom<=cz.y||a.y>=cz.b),inside:a.x>=0&&a.y>=0&&a.right<=vw&&a.bottom<=vh};});
check('R1d2 JulRushens pil är en kompakt platta strax under HUD:en uppe i hörnet och skymmer inte vägen framför (mitten av bilden är fri)',rgeo.inside&&rgeo.a.y>=rgeo.hudBottom-1&&rgeo.a.y<=rgeo.hudBottom+40&&rgeo.a.w<=200&&rgeo.a.h<=60&&!rgeo.hit,JSON.stringify(rgeo));
const hud0=await hudText();
check('R1e HUD:en visar TEMPO 1, tre hjärtan, poäng 0 och tempots namn',hud0.label==='TEMPO'&&hud0.count==='1'&&hud0.hearts==='♥♥♥'&&hud0.pts==='0'&&hud0.name==='JULMYS',JSON.stringify(hud0));
const base0=await ev(()=>({thermosCards:window.KarlstadDebug.journey().xmas.rushMode,beam:document.getElementById('tempoHud')&&getComputedStyle(document.getElementById('funHud')).display}));
check('R1f grundspelets termos-HUD är dold (funHud) och grundspelets termoskort ritas inte (rushMode)',base0.thermosCards===true&&base0.beam==='none',JSON.stringify(base0));
const rb=await ev(()=>{const root=window.__app.root;let pips=0;root.find(e=>/^mission-arrow-/.test(e.name)&&e.enabled).forEach(()=>pips++);const flag=root.findByName('Ditt valda mål');return {pips,flag:!!flag&&flag.enabled};});
check('R1h grundspelets små pilar på marken och flaggan "DITT MÅL" ritas inte i JulRushen (pilen och strålen visar vägen)',rb.pips===0&&!rb.flag,JSON.stringify(rb));
check('R1i julbandet rullas ut på marken mot första paketet (minst en bit) i JulRushen',await ev(()=>window.KarlstadDebug.journey().xmas.view.snapshot().ribbon>=1),JSON.stringify(await ev(()=>window.KarlstadDebug.journey().xmas.view.snapshot())));
const tb=await ev(()=>({on:window.KarlstadRound.snapshot().turbo.on,factor:window.__turbo(),btn:document.getElementById('turboBtn').textContent,pressed:document.getElementById('turboBtn').getAttribute('aria-pressed')}));
check('R1j turbon slås på av sig själv när rushen börjar (klockan är räknad på den): knappen visar TURBO ×2 · PÅ',tb.on===true&&Math.abs(tb.factor-2)<.01&&/TURBO ×2 · PÅ/.test(tb.btn)&&tb.pressed==='true',JSON.stringify(tb));
await shot('r01-start');
// Kostnaden för att planera banan: startvalet (tre riktningar) och varje bandläggning (supplyTempo, kör fyra gånger i sekunden) mäts i klocktid.
const plan=await ev(()=>{const j=window.KarlstadDebug.journey(),t=performance.now();for(const h of [0,2.09,4.19])j.planHeading(-3,30,h);const ms=performance.now()-t;
  window.__sup=[];const orig=j.supplyTempo.bind(j);j.supplyTempo=(dt,p)=>{const a=performance.now();orig(dt,p);window.__sup.push(performance.now()-a);};return ms;});
check('R1g att välja startriktning (tre planeringar) tar under 400 ms',plan<400,plan.toFixed(1)+' ms');

// ── R2: en bot spelar ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
await ev(()=>{window.__skill=1;window.__botStart();});
const placed=new Map();let badPlaced=0;
const sample=async()=>{const pk=await ev(()=>window.KarlstadDebug.journey().xmas.julrush.list.map(k=>[k.id,k.x,k.z,k.kind]));for(const [id,x,z,kind] of pk)if(!placed.has(id)){placed.set(id,kind);if(await ev(([x,z])=>window.__blocked(x,z),[x,z]))badPlaced++;}};
let sawGift=false,sawChip=false,shotMid=false,shotLevel=false,shotGift=false;
// Spelet går i speltid och den mjukvarurenderade webbläsaren ger få bildrutor när maskinen är belastad, så klocktiden som får gå är generös: loopen avbryts så fort villkoren är uppfyllda.
const t0=Date.now();
while(Date.now()-t0<240000){
  await wait(500);await sample();
  const s=await rushSnap();
  if(!shotMid&&s.picked>=6){shotMid=true;await shot('r02-mitt-i-spelet');}
  if(!shotLevel&&s.level>=2){shotLevel=true;await wait(150);await shot('r02b-nytt-tempo');}
  if(s.gifts>=1&&!sawGift){sawGift=true;await wait(250);await shot('r03-gava');}
  if((await hudText()).chips.length)sawChip=true;
  if(s.level>=3&&s.picked>=25&&sawGift)break;
}
const r2=await rushSnap();
check('R2 boten plockar paket längs banan utan att tappa liv: minst 25 paket och tempo 3',r2.picked>=25&&r2.level>=3&&r2.lives===3,JSON.stringify({picked:r2.picked,level:r2.level,lives:r2.lives,score:r2.score}));
check('R2b tempot har höjt farten (fart ×'+r2.speed.toFixed(2)+') och poängfaktorn (×'+r2.mult.toFixed(1)+')',r2.speed>1.1&&r2.mult>1.3);
check('R2c minst ett guldpaket gav en julgåva, och gåvan syns som bricka i HUD:en',r2.gold>=1&&r2.gifts>=1&&sawChip,JSON.stringify({gold:r2.gold,gifts:r2.gifts,chip:sawChip}));
check('R2d inget paket i banan ligger i en vägg, en stånd eller en gran ('+placed.size+' paket kontrollerades)',badPlaced===0&&placed.size>=30,'felplacerade '+badPlaced+' av '+placed.size);
// HUD:en och spelets tillstånd läses i samma anrop (boten spelar vidare, så två anrop kan ge olika bildrutor). HUD:en uppdateras högst var 60:e ms, så en bildruta efter ett stort plock
// (bomb, magnet, bloss) kan visa det gamla värdet; den får därför några försök tills de stämmer.
let hud1,r2e,hudOk=false;for(const tE=Date.now();Date.now()-tE<3000&&!hudOk;){await wait(120);
  const pair=await ev(()=>{const s=window.KarlstadDebug.journey().xmas.julrush.snapshot();return {hud:{count:document.querySelector('.xh-count').textContent,pts:document.querySelector('.xh-points b').textContent,name:document.querySelector('.xh-points span').textContent},st:{level:s.level,score:s.score,name:s.name}};});
  hud1=pair.hud;r2e=pair.st;hudOk=hud1.count===String(r2e.level)&&Number(hud1.pts.replace(/\s|\u00a0/g,''))===r2e.score&&hud1.name===r2e.name;}
check('R2e HUD:en följer spelet: tempo, poäng och tempots namn stämmer med spelets tillstånd (läst i samma bildruta)',hudOk,JSON.stringify({hud:hud1,lvl:r2e.level,score:r2e.score}));
const fx=await ev(()=>({turbo:document.body.classList.contains('turbo-on'),speed:window.KarlstadRound.snapshot().mode}));
check('R2f farten syns: turbo-effekten ligger på när tempot är över 1',fx.turbo===true,JSON.stringify(fx));
const sup=await ev(()=>{const a=[...window.__sup].sort((x,y)=>x-y);return {n:a.length,max:a.at(-1),p95:a[Math.floor(a.length*.95)],mean:a.reduce((x,y)=>x+y,0)/a.length,slow:a.filter(x=>x>30).length};});
check('R2h banläggningen (supplyTempo) är billig: medel '+sup.mean.toFixed(2)+' ms, p95 '+sup.p95.toFixed(1)+' ms, värsta '+sup.max.toFixed(1)+' ms över '+sup.n+' anrop',sup.max<400&&sup.mean<20,JSON.stringify({n:sup.n,slowOver30ms:sup.slow}));
const sj=await ev(()=>({items:window.KarlstadDebug.journey().items.length,dyn:window.KarlstadDebug.journey().dyn.length,events:window.KarlstadDebug.journey().events.length}));
check('R2g banan växer inte okontrollerat (högst 100 pärlor i journey) och grundspelets händelsekö töms',sj.items<=100&&sj.events<20,JSON.stringify(sj));


// ── R3: liv och slut ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Boten står still och klockan kortas för hand (själva reglerna är de vanliga: miss → liv, tre liv → slut). Hjärtan, puff och slutkort ska följa med.
await ev(()=>{window.__skill=0;});await wait(300);
const stats0=await rushSnap();
// Brådskande klocka: mindre än 30 % kvar gör HUD:en och pilen röda.
// Gåvor som hunnit bli aktiva under körningen ovan (spöket plockar paket, magneten drar, skölden räddar ett liv) skulle blanda sig i missarna nedan: de tas bort först.
await ev(()=>{const r=window.KarlstadDebug.journey().xmas.julrush;for(const k of Object.keys(r.timers))r.timers[k]=0;r.shield=0;r.spirit.active=false;r.spirit.target=null;r.pulled.length=0;});
// Klockan är trång (några sekunder per paket): en stillastående bot skulle annars tappa ett hjärta av sig själv medan provet väntar. Klockan sätts därför om till en lång tid först.
await ev(()=>{const t=window.KarlstadDebug.journey().tempo;t.deadline=12;t.left=2.6;});
// Väntar på att spelet hunnit rita om (en belastad, mjukvarurenderad webbläsare ger få bildrutor): högst 2,2 s, innan klockan på 2,6 s hunnit gå ut
let urgent={hud:false,arrow:false};
for(let i=0;i<14;i++){await wait(150);urgent=await ev(()=>({hud:document.getElementById('xmasHud').classList.contains('urgent'),arrow:document.getElementById('tempoArrow').classList.contains('urgent')}));if(urgent.hud&&urgent.arrow)break;}
check('R3a när under 30 % av tiden återstår blir HUD:en och pilen brådskande (röda)',urgent.hud&&urgent.arrow,JSON.stringify(urgent));
await shot('r03b-bradskande');
// Varje miss tvingas fram och provet väntar på att hjärtat verkligen försvinner (den mjukvarurenderade webbläsaren ger få bildrutor, så en fast väntetid räcker inte alltid).
const hearts=[];let pill1='',prevH=(await hudText()).hearts;
for(let i=0;i<3;i++){
  await ev(()=>{window.KarlstadDebug.journey().tempo.left=.02;});
  let h=prevH;
  for(const tm=Date.now();Date.now()-tm<8000;){
    await wait(80);
    if(i===0&&!/FÖR SENT/.test(pill1)){const pp=await ev(()=>document.getElementById('xmasPill').textContent);if(/FÖR SENT/.test(pp))pill1=pp;}
    h=(await hudText()).hearts;if(h!==prevH)break;
  }
  if(i===0&&!/FÖR SENT/.test(pill1))pill1=await ev(()=>document.getElementById('xmasPill').textContent);
  hearts.push(h);prevH=h;
}
check('R3 varje missad klocka tar ett liv: hjärtana blir ♥♥♡ → ♥♡♡ → ♡♡♡',JSON.stringify(hearts)===JSON.stringify(['♥♥♡','♥♡♡','♡♡♡']),hearts.join(' → '));
check('R3b missen visas för spelaren ("FÖR SENT! 2 LIV KVAR")',/FÖR SENT! 2 LIV KVAR/.test(pill1),pill1);
await wait(1800);
const rc=await ev(()=>({panel:!document.getElementById('round-xmas-result').hidden,kicker:document.getElementById('xmasResultKicker').textContent,title:document.getElementById('xmasResultTitle').textContent,line:document.getElementById('xmasResultLine').textContent,
  points:document.getElementById('xmasResultPoints').textContent,cells:[...document.querySelectorAll('#xmasResultGrid .xr-cell')].map(c=>c.textContent),b1:document.getElementById('xmasResultContinue').textContent.trim(),b2:document.getElementById('xmasResultFree').textContent.trim(),
  parts:document.getElementById('xmasResultParts').textContent,status:document.getElementById('xmasResultStatus').textContent,over:window.KarlstadDebug.journey().xmas.julrush.result}));
check('R3c efter tredje livet visas slutkortet med tempo, paket, poäng och knapparna EN RUSH TILL och JULMENYN',rc.panel&&rc.title==='JULRUSHEN ÄR SLUT!'&&/tempo \d+ \(.+\) och plockade \d+ paket/.test(rc.line)&&rc.cells.length===4&&/EN RUSH TILL/.test(rc.b1)&&rc.b2==='JULMENYN'&&rc.over&&rc.points.replace(/\s|\u00a0/g,'')===String(rc.over.points)+'JULPOÄNG',JSON.stringify({kicker:rc.kicker,line:rc.line,points:rc.points,cells:rc.cells,b1:rc.b1,b2:rc.b2}));
check('R3d slutkortet visar rekord och gåvor, och stämpelräknaren går till 9',/GÅVOR \d+/.test(rc.parts)&&/\/ 9/.test(rc.status),rc.parts+' | '+rc.status);
await shot('r04-slutkort');
// Den riktiga lagringen läses ur webbläsarkontexten (window.localStorage är julbyggets prefixskydd): inga nycklar utan prefix får ha skrivits.
const real=((await ctx.storageState()).origins.find(o=>o.origin.includes('localhost:'+PORT))?.localStorage)||[],keys=real.map(e=>e.name);
const sv=await ev(()=>{const x=window.KarlstadDebug.journey().xmas;return {rec:x.save.state.records.julrush,runs:x.save.state.totals.runs,over:x.julrush.result};});
sv.raw=JSON.parse(real.find(e=>e.name==='karlstad-xmas:save:1')?.value||'{}').records?.julrush;sv.keys=keys;
check('R3e rekordet sparas under julbyggets egen nyckel med poäng, tempo och paket, och inget skrivs under grundspelets nycklar',sv.rec&&sv.raw&&sv.rec.points===sv.over.points&&sv.raw.points===sv.over.points&&sv.rec.level===sv.over.level&&sv.rec.packages===sv.over.collected&&sv.runs>=1&&sv.keys.includes('karlstad-xmas:save:1')&&!sv.keys.some(k=>/^karlstad:/.test(k)),JSON.stringify({rec:sv.rec,runs:sv.runs,keys:sv.keys.filter(k=>/tempo|julrush|karlstad/.test(k))}));
const clean=await ev(()=>{const j=window.KarlstadDebug.journey(),x=j.xmas;return {tempo:j.tempo.running,dyn:j.items.filter(t=>t.dyn).length,course:j.course,arrow:document.getElementById('tempoArrow').hidden,goal:x.view.snapshot().goal,rate:window.KarlstadMusic.snapshot().xmas.rate,state:x.julrush.state,shown:x.view.snapshot().shown};});
check('R3f efter slutet är banan, farten, pilen och strålen borta',!clean.tempo&&clean.dyn===0&&clean.course===null&&clean.arrow&&!clean.goal&&clean.rate===1&&clean.state==='over',JSON.stringify(clean));

// ── R4: en rush till ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
await click('xmasResultContinue');await wait(3000);
const r4=await ev(()=>({panel:document.getElementById('round-xmas-result').hidden,s:window.KarlstadDebug.journey().xmas.julrush.snapshot(),hearts:document.querySelector('.xh-hearts').textContent,mode:window.KarlstadDebug.journey().xmas.snapshot().mode,dyn:window.KarlstadDebug.journey().items.filter(t=>t.dyn).length}));
check('R4 EN RUSH TILL börjar om från noll: tempo 1, tre liv, noll poäng, nytt paketband',r4.panel&&r4.mode==='rush'&&r4.s.state==='running'&&r4.s.level===1&&r4.s.lives===3&&r4.s.score===0&&r4.s.picked===0&&r4.hearts==='♥♥♥'&&r4.dyn>=8&&r4.dyn<=40,JSON.stringify({s:r4.s.state,lvl:r4.s.level,lives:r4.s.lives,score:r4.s.score,dyn:r4.dyn}));

// R4b: stänger man av turbon (klockan är räknad på den) och missar en klocka, säger meddelandet varför
await ev(()=>{window.__skill=0;window.KarlstadDebug.turbo(false);const t=window.KarlstadDebug.journey().tempo;t.deadline=12;t.left=.02;});
let nt;for(const tm=Date.now();Date.now()-tm<8000;){await wait(80);nt=await ev(()=>({pill:document.getElementById('xmasPill').textContent,on:window.KarlstadRound.snapshot().turbo.on}));if(/FÖR SENT/.test(nt.pill))break;}
check('R4b stänger man av turbon och missar en klocka säger meddelandet "SLÅ PÅ TURBON"',nt.on===false&&/FÖR SENT! \d LIV KVAR · SLÅ PÅ TURBON/.test(nt.pill),JSON.stringify(nt));
await shot('r04b-turbo-av');
await ev(()=>{window.KarlstadDebug.turbo(true);window.__skill=1;});

// ── R5: pausmenyn fryser klockan, och att ge upp sparar körningen ───────────────────────────────────────────────────────────────────
await ev(()=>{window.__skill=1;});await wait(7000);
await click('roundPause');await wait(700);
const p0=await ev(()=>({left:window.KarlstadDebug.journey().tempo.left,el:window.KarlstadDebug.journey().tempo.elapsed,panel:!document.getElementById('round-pause').hidden,btns:['xmasWeatherBtn','xmasMenuBtn','xmasBackPause'].map(id=>!!document.getElementById(id))}));
await wait(2500);
const p1=await ev(()=>({left:window.KarlstadDebug.journey().tempo.left,el:window.KarlstadDebug.journey().tempo.elapsed}));
check('R5 pausmenyn fryser klockan och tempot (ingenting tickar medan menyn är öppen) och har julens knappar',p0.panel&&Math.abs(p1.el-p0.el)<.05&&Math.abs(p1.left-p0.left)<.05&&p0.btns.every(Boolean),JSON.stringify({p0,p1}));
await shot('r05-paus');
const before=await ev(()=>({picked:window.KarlstadDebug.journey().tempo.picked,runs:window.KarlstadDebug.journey().xmas.save.state.totals.runs}));
await click('xmasMenuBtn');await wait(900);
const q=await ev(()=>{const j=window.KarlstadDebug.journey(),x=j.xmas;return {turbo:window.KarlstadRound.snapshot().turbo.on,intro:!document.getElementById('round-xmas-intro').hidden,state:x.julrush.state,tempo:j.tempo.running,dyn:j.items.filter(t=>t.dyn).length,cls:['xmas-rush','xmas-cozy','xmas-zombies'].map(c=>document.body.classList.contains(c)),runs:x.save.state.totals.runs,mode:x.snapshot().mode,rate:window.KarlstadMusic.snapshot().xmas.rate,resultHidden:document.getElementById('round-xmas-result').hidden,note:document.getElementById('xmasRushStartNote').textContent};});
check('R5b att ge upp via JULMENY går till startvyn, städar banan och farten, återställer spelarens eget turbo-val (av) och sparar körningen som en förlust',q.intro&&q.turbo===false&&q.state==='idle'&&!q.tempo&&q.dyn===0&&q.cls.every(c=>!c)&&q.mode==='menu'&&q.rate===1&&q.resultHidden&&(before.picked===0||q.runs===before.runs+1),JSON.stringify({before,q:{state:q.state,dyn:q.dyn,cls:q.cls,runs:q.runs,mode:q.mode}}));
await click('xmasRushStart');await wait(500);
const mnote=await ev(()=>document.getElementById('xmasRushMarathonNote').textContent);
check('R5c rushmenyn visar rekordet från Maraton',/Rekord [\d\s\u00a0]+ poäng · tempo \d+/.test(mnote),mnote);
await click('xmasRushBack');await wait(400);
await shot('r06-meny-efter');

// ── R6: julstämpeln vid tempo 5 (Maraton) ─────────────────────────────────────────────────────────────────────────────────────────────
await startMarathon();await wait(2500);await ev(()=>{window.__skill=1;});
await until(()=>window.KarlstadDebug.journey().tempo.picked>=3,40);
await ev(()=>{window.__skill=0;const j=window.KarlstadDebug.journey();j.tempo.level=5;});
await wait(400);
for(let i=0;i<3;i++){await ev(()=>{window.KarlstadDebug.journey().tempo.left=.02;});await wait(800);}
await wait(1800);
const st=await ev(()=>({kicker:document.getElementById('xmasResultKicker').textContent,stampShown:!document.getElementById('xmasResultStamp').hidden,saved:!!window.KarlstadDebug.journey().xmas.save.state.stamps.julrush,status:document.getElementById('xmasResultStatus').textContent,res:window.KarlstadDebug.journey().xmas.julrush.result}));
check('R6 att nå tempo 5 ger julstämpeln JULRUSHEN: kortet säger det, stämpeln ritas och den sparas',st.res&&st.res.level>=5&&st.res.stamp===true&&st.saved&&st.stampShown&&/NY JULSTÄMPEL|NYTT REKORD/.test(st.kicker),JSON.stringify({kicker:st.kicker,stamp:st.res?.stamp,saved:st.saved,status:st.status}));
await shot('r07-stampel');

// ── R7: Julklappsjakten är orörd efteråt ─────────────────────────────────────────────────────────────────────────────────────────────
await click('xmasResultFree');await wait(700);
check('R7 JULMENYN på slutkortet leder till startvyn',await ev(()=>!document.getElementById('round-xmas-intro').hidden&&document.getElementById('round-xmas-result').hidden));
await click('xmasCozy');await wait(2800);
const c7=await ev(()=>{const j=window.KarlstadDebug.journey(),x=j.xmas;return {turbo:window.KarlstadRound.snapshot().turbo.on,mode:x.snapshot().mode,hunt:x.hunt.snapshot(),rushMode:x.rushMode,arrow:getComputedStyle(document.getElementById('tempoArrow')).display,goal:x.view.snapshot().goal,cls:document.body.classList.contains('xmas-rush'),dyn:j.items.filter(t=>t.dyn).length,tempo:j.tempo.running,music:window.KarlstadMusic.snapshot().xmas,hearts:document.querySelector('.xh-hearts').hidden,label:document.querySelector('.xh-label').textContent,zombies:j.actors.filter(a=>a.active).length};});
check('R7b Julklappsjakten startar som förut efter en rush: mål 20, inga rushdelar, ingen pil, inget tempo, turbon av som förut, lugn musik i normal fart',c7.turbo===false&&c7.mode==='cozy'&&c7.hunt.goal===20&&!c7.rushMode&&c7.arrow==='none'&&!c7.cls&&c7.dyn===0&&!c7.tempo&&c7.music.mode==='cozy'&&c7.music.rate===1&&c7.hearts&&c7.label==='PAKET'&&c7.zombies===0,JSON.stringify(c7));
await shot('r08-jakten-efter');

// ── R8: fortsättningsmenyn och en tredje start ──────────────────────────────────────────────────────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.openContinue());await wait(500);
const cm=await ev(()=>({vis:!document.getElementById('round-xmas-continue').hidden,h:Math.round(document.getElementById('xmasRushGo').getBoundingClientRect().height),note:document.getElementById('xmasRushGoNote').textContent,stamps:[...document.querySelectorAll('#xmasStampList li')].map(l=>l.textContent)}));
check('R8 fortsättningsmenyn har JULRUSHEN med en rad om framstegen och stämpelrutan JULRUSHEN är ikryssad (nio stämplar)',cm.vis&&cm.h>=48&&/rusher|Rush/.test(cm.note)&&cm.stamps.length===9&&cm.stamps.some(t=>/^✓ JULRUSHEN/.test(t)),JSON.stringify({h:cm.h,note:cm.note,n:cm.stamps.length}));
await shot('r09-fortsatt');
await startMarathon('xmasRushGo');await wait(2600);
check('R8b knappen i fortsättningsmenyn leder till rushmenyn och MARATON startar JulRushen',await ev(()=>window.KarlstadDebug.journey().xmas.snapshot().mode==='rush'&&window.KarlstadDebug.journey().xmas.julrush.state==='running'));

// ── R9: gåvorna i spelet ───────────────────────────────────────────────────────────────────────────────────────────────────────────
await ev(()=>{window.__skill=1;const x=window.KarlstadDebug.journey().xmas,p=window.__pos();x.julrush.grant('sleigh',{x:p[0],z:p[1]});});await wait(500);
const g1=await ev(()=>({rocket:document.body.classList.contains('rocket-on'),turbo:document.body.classList.contains('turbo-on'),chips:[...document.querySelectorAll('.xh-chip')].map(c=>c.textContent),mul:window.KarlstadDebug.journey().fun.power.speedMul()}));
check('R9 renssläden: farten dubblas, raketeffekten ligger på och brickan SLÄDE räknar ned',g1.mul===2&&g1.rocket&&g1.turbo&&g1.chips.some(c=>/^SLÄDE \d/.test(c)),JSON.stringify(g1));
await shot('r10-slade');
await ev(()=>{const x=window.KarlstadDebug.journey().xmas,p=window.__pos();for(const k of ['glogg','kaka','wind','skates','magnet','ghost'])x.julrush.timers[k]=0;/* gåvor som boten råkat plocka tidigare (högst sex brickor ryms) */x.julrush.grant('shield',{x:p[0],z:p[1]});x.julrush.grant('star',{x:p[0],z:p[1]});x.julrush.grant('pause',{x:p[0],z:p[1]});x.julrush.grant('golden',{x:p[0],z:p[1]});});
// HUD:en ritas om i spelets bildruta: vänta på att den hunnit (högst 6 s) i stället för en fast tid
let g2=[];
for(let i=0;i<24;i++){await wait(250);g2=await ev(()=>[...document.querySelectorAll('.xh-chip')].map(c=>c.textContent));if(['SKÖLD','STJÄRNA','PAUS','×3'].every(t=>g2.some(c=>c.startsWith(t))))break;}
check('R9b flera gåvor syns samtidigt som brickor (sköld, stjärna, paus, guldklapp)',['SKÖLD','STJÄRNA','PAUS','×3'].every(t=>g2.some(c=>c.startsWith(t))),g2.join(' | '));
await shot('r11-gavor');

// ── R10: en lång körning på stadens riktiga gator, till tempo 12 (bara med LONG=1; tar flera minuter) ───────────────────────────────────
// Klockan är trång (se PRESSURE i xmas-rushes.mjs) och den mjukvarurenderade webbläsaren ger få, långa bildrutor som äter av den, så boten får 30 % mer än full turbo (skill 1,3).
// Det som provas är att banan, klockan och minnet håller i Maraton upp till och förbi tempo 12, inte hur svårt det är (det mäts med tools/xmas-flow/difficulty.mjs).
// Boten följer målet utan att missa något. Det som kontrolleras är banan under lång tid: ligger paketen på gångbar mark, tar banan slut och måste börja om
// (anchorCourse), håller sig minnet och planeringen billiga, och går tempot hela vägen upp till 12 utan att något liv går åt.
if(process.env.LONG){
  await ev(()=>{window.__skill=0;});await ev(()=>window.KarlstadDebug.journey().xmas.startRush());await wait(2500);
  const mem0=await ev(()=>performance.memory?.usedJSHeapSize||0);
  await ev(()=>{
    const j=window.KarlstadDebug.journey();window.__anch=0;window.__sup=[];
    const a=j.anchorCourse.bind(j);j.anchorCourse=p=>{window.__anch++;return a(p);};
    const s=j.supplyTempo.bind(j);j.supplyTempo=(dt,p)=>{const t=performance.now();s(dt,p);window.__sup.push(performance.now()-t);};
    window.__skill=1.3;window.__dist=0;
  });
  const bad=new Set(),seen=new Set();let last=null;const t1=Date.now(),limit=Number(process.env.LONG_SECONDS||1500)*1000;
  while(Date.now()-t1<limit){
    await wait(700);
    const pk=await ev(()=>window.KarlstadDebug.journey().xmas.julrush.list.map(k=>[k.id,k.x,k.z]));
    for(const [id,x,z] of pk)if(!seen.has(id)){seen.add(id);if(await ev(([x,z])=>window.__blocked(x,z),[x,z]))bad.add(id);}
    last=await rushSnap();
    if(last.state==='over'||(last.level>=12&&last.seconds>=150))break;
  }
  const mem1=await ev(()=>performance.memory?.usedJSHeapSize||0);
  const sup=await ev(()=>{const a=[...window.__sup].sort((x,y)=>x-y);return {n:a.length,max:a.at(-1),p95:a[Math.floor(a.length*.95)],mean:a.reduce((x,y)=>x+y,0)/a.length,anch:window.__anch,dist:Math.round(window.__dist||0)};});
  const perKm=sup.anch/Math.max(.1,sup.dist/1000);
  check('R10 en bot följer banan på stadens gator till tempo 12 utan att tappa ett liv ('+Math.round(last.seconds)+' s speltid, '+last.picked+' paket)',last.state==='running'&&last.level>=12&&last.lives===3&&last.picked>=100,JSON.stringify({state:last.state,level:last.level,lives:last.lives,picked:last.picked,score:last.score}));
  check('R10b inget av '+seen.size+' paket låg på ogångbar mark under hela körningen',bad.size===0&&seen.size>=100,'ogångbara '+bad.size);
  // Grundspelets egen omplanering (anchorCourse) lägger banan på nytt vid spelaren när nästa paket ligger över 55 m bort. Det händer när banan viker tillbaka längs
  // samma gata (återvändsgränder: grundspelet släpper de paket som spelaren redan "passerat" längs deras riktning) och när ett tomtebloss tagit paketen framför.
  // Det kostar inget liv. Antalet följer sträckan som springs (boten går med turbon och gåvornas fart, dubbelt så långt per sekund som före 2.21.1-xmas.4), så det räknas per kilometer.
  // Här kontrolleras att det inte sker oftare än 10 gånger per kilometer och att planeringen är billig.
  check('R10c banan lades om '+sup.anch+' gånger på '+Math.round(last.seconds)+' s speltid och '+(sup.dist/1000).toFixed(1)+' km ('+perKm.toFixed(1)+' per km, högst 10 tillåtna) och planeringen är billig (medel '+sup.mean.toFixed(2)+' ms, p95 '+sup.p95.toFixed(1)+' ms, värst '+sup.max.toFixed(1)+' ms)',perKm<=10&&sup.max<400,JSON.stringify(sup));
  check('R10d minnet växer inte okontrollerat ('+((mem1-mem0)/1048576).toFixed(1)+' MB på körningen)',!mem0||mem1-mem0<80*1048576);
  await shot('r12-tempo12');
}

check('J inga oväntade fel i konsolen',errs.length===0,errs.slice(0,3).join(' | '));
console.log(`\n${VIEW}: ${results.length-failed}/${results.length} OK, ${failed} fel`);
await browser.close();
process.exit(failed?1:0);
