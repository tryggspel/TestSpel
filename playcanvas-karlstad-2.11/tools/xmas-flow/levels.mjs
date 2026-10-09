#!/usr/bin/env node
// Verifiering i riktig webbläsare av JulRushens tolv nivåer, övertiden efter Rush 12 (ÖVERTID, Rush 13 och uppåt), de nya gåvorna (fyra fartgåvor), topplistan (med LÄNGST) och utmaningarna:
//  - rushmenyn (tolv rutor, låsta och öppna), start av Rush 1, HUD med mål, en bot som klarar rushen, slutkort med stjärnor, sparning och upplåsning av nästa
//  - NÄSTA RUSH (hjärtan följer med, tempot är högre), att förlora (ingen upplåsning), magnet, tomtespöke, kryddbomb, paketregn och sidopaket i riktig 3D
//  - topplistan med namn, utmaningslänken (avkodas här i Node), en andra spelare som öppnar länken i en ny webbläsarkontext, utmaningen och jämförelsen efter rushen,
//    trasiga länkar och att adressen städas
// Startar det riktiga spelet i headless Chromium. Avslutar med kod 1 om något avviker. SHOTS=katalog sparar skärmbilder.
//
//   python3 -m http.server 8902      (i spelkatalogen, på julgrenen)
//   node tools/xmas-flow/levels.mjs
//
// Env som i flow.mjs: PLAYWRIGHT, PLAYCANVAS, CHROME, PORT, VIEW (414x896m = mobil med tryckskärm), SHOTS.
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om bildfrekvens eller känsla på en riktig telefon.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const PORT=process.env.PORT||8902,SHOTS=process.env.SHOTS||'';
const VIEW=process.env.VIEW||'1000x640',V=VIEW.match(/(\d+)x(\d+)(m?)/);
const board=await import(pathToFileURL(path.join(root,'xmas/xmas-board.mjs')).href);
const rushes=await import(pathToFileURL(path.join(root,'xmas/xmas-rushes.mjs')).href);
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const errs=[];
const results=[];let failed=0;
const check=(name,ok,detail='')=>{results.push([ok?'OK  ':'FEL ',name,detail]);if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};
const G={page:null,ctx:null};
const wait=ms=>G.page.waitForTimeout(ms),ev=(fn,a)=>G.page.evaluate(fn,a);
const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await G.page.screenshot({path:path.join(SHOTS,n+'.png')});}};
const click=id=>ev(i=>document.getElementById(i)?.click(),id);
// Ett nytt spel i en egen webbläsarkontext (egen lagring), med spelets hjälpfunktioner för testet inlagda (som i flow.mjs).
async function openGame(query=''){
  const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},permissions:['clipboard-read','clipboard-write'],...(V[3]?{hasTouch:true,isMobile:true,deviceScaleFactor:1}:{})});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push('console: '+m.text().slice(0,160));});
  await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
  await page.route(/\/app\.js/,r=>{
    if(!r.request().url().includes('localhost:'+PORT))return r.continue();
    const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__blocked=blocked;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};window.__pos=()=>{const p=player.getPosition();return [p.x,p.z]};window.__turbo=()=>lastRound?.turboScale?.()||1;app.on('update',update);");
    r.fulfill({contentType:'text/javascript',body:s});
  });
  G.page=page;G.ctx=ctx;
  await page.goto(`http://localhost:${PORT}/?debug${query}`);
  await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await wait(800);
  await injectBot();
}
// En bot som följer spelets egna mål i speltid (som i rush.mjs). skill 0 = står still. Måste läggas in igen efter varje omladdning.
async function injectBot(){
  await ev(()=>{
    window.__skill=1;window.__botOn=false;
    window.__botStart=()=>{if(window.__botOn)return;window.__botOn=true;let last=null;const f=()=>{if(!window.__botOn)return;const j=window.KarlstadDebug.journey(),t=j.tempo,tg=t.target;
      if(t.running&&tg){const el=j.elapsed;if(last!==null&&el>last){const [x,z]=window.__pos(),dx=tg.x-x,dz=tg.z-z,d=Math.hypot(dx,dz),v=7.2*window.__turbo()*window.__skill,s=Math.min(d,v*(el-last));if(s>0&&d>.01)window.__tp(x+dx/d*s,z+dz/d*s,Math.atan2(-dx,-dz)*180/Math.PI,-4);}last=el;}else last=null;requestAnimationFrame(f);};requestAnimationFrame(f);};
    window.__botStop=()=>{window.__botOn=false;};
  });
}
const X='window.KarlstadDebug.journey().xmas';
const rush=()=>ev(()=>window.KarlstadDebug.journey().xmas.julrush.snapshot());
const vis=sel=>ev(s=>{const e=document.querySelector(s);if(!e||e.hidden)return false;const cs=getComputedStyle(e),r=e.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0;},sel);
const text=sel=>ev(s=>document.querySelector(s)?.textContent?.trim()||'',sel);
// Versaler med prickar eller ring (Å, Ä, Ö) når högre än resten av raden. I ett element med overflow:hidden och tät radhöjd klipps de bort ("LÄMNA" blev "LAMNA").
// Mäter med canvas var teckenets överkant hamnar jämfört med elementets övre (padding)kant; under 1 px marginal räknas som klippt.
const clipped=sel=>ev(s=>{
  const out=[],cv=document.createElement('canvas').getContext('2d');
  for(const el of document.querySelectorAll(s)){
    const cs=getComputedStyle(el);
    if(cs.overflowY==='visible'||!el.getClientRects().length)continue;
    const raw=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
    const t=cs.textTransform==='uppercase'?raw.toUpperCase():raw,m=t.match(/[ÅÄÖ]/);
    if(!m)continue;
    cv.font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const g=cv.measureText(m[0]),content=g.fontBoundingBoxAscent+g.fontBoundingBoxDescent,lh=cs.lineHeight==='normal'?content:parseFloat(cs.lineHeight);
    const room=(lh-content)/2+g.fontBoundingBoxAscent-g.actualBoundingBoxAscent+parseFloat(cs.paddingTop);
    if(room<1)out.push({text:t.slice(0,28),room:+room.toFixed(2)});
  }
  return out;
},sel);
const until=async(fn,max=60,arg)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await ev(fn,arg))return true;await wait(250);}return false;};
const hud=()=>ev(()=>({label:document.querySelector('.xh-label').textContent,count:document.querySelector('.xh-count').textContent,hearts:document.querySelector('.xh-hearts').textContent,name:document.querySelector('.xh-points span').textContent,
  goalHidden:document.querySelector('.xh-goal').hidden,goalLabel:document.querySelector('.xh-goal span').textContent,goalCount:document.querySelector('.xh-goal b').textContent,chips:[...document.querySelectorAll('.xh-chip')].map(c=>c.textContent)}));
const panelOpen=id=>ev(i=>!document.getElementById(i).hidden,id);

// ═══ Spelare 1 ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
await openGame();

// ── L0: rushmenyn ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
await click('xmasRushStart');await wait(500);
const m0=await ev(()=>({panel:!document.getElementById('round-xmas-rush').hidden,tiles:[...document.querySelectorAll('#xmasRushGrid .xr-tile:not(.xr-ot)')].map(t=>[t.dataset.n,t.dataset.state,t.disabled,Math.round(t.getBoundingClientRect().height)]),ot:[...document.querySelectorAll('#xmasRushGrid .xr-tile.xr-ot')].map(t=>({n:t.dataset.n,state:t.dataset.state,disabled:t.disabled,h:Math.round(t.getBoundingClientRect().height),w:Math.round(t.getBoundingClientRect().width),text:t.textContent.trim()})),grid:Math.round(document.getElementById('xmasRushGrid').getBoundingClientRect().width),
  play:document.getElementById('xmasRushPlay').textContent.trim(),title:document.getElementById('xmasRushInfoTitle').textContent,goal:document.getElementById('xmasRushInfoGoal').textContent,stars:document.getElementById('xmasRushStars').textContent}));
check('L0 rushmenyn: tolv rutor, bara Rush 1 öppen (de andra låsta och inte tryckbara), alla minst 48 px höga',m0.panel&&m0.tiles.length===12&&m0.tiles[0][1]==='open'&&!m0.tiles[0][2]&&m0.tiles.slice(1).every(t=>t[1]==='locked'&&t[2])&&m0.tiles.every(t=>t[3]>=48),JSON.stringify(m0.tiles.map(t=>t.slice(0,3).join(':'))));
check('L0a efter de tolv rutorna kommer en bred ÖVERTID-ruta (Rush 13 och uppåt) som är låst tills alla tolv är klarade, minst 48 px hög',m0.ot.length===1&&m0.ot[0].n==='13'&&m0.ot[0].state==='locked'&&m0.ot[0].disabled&&m0.ot[0].h>=48&&m0.ot[0].w>m0.grid*.8&&/ÖVERTID/.test(m0.ot[0].text),JSON.stringify(m0.ot));
check('L0b rutan visar "RUSH 1 · JULMYS", målet och spelaknappen "SPELA RUSH 1"',m0.title==='RUSH 1 · JULMYS'&&new RegExp('^HÄMTA '+rushes.RUSHES[0].goal.target+' PAKET · FART ×1,00 · POÄNG ×1,0$').test(m0.goal)&&/^SPELA RUSH 1/.test(m0.play)&&m0.stars==='★ 0 / 36',JSON.stringify({t:m0.title,g:m0.goal,p:m0.play,s:m0.stars}));
await shot('l00-rushmeny');

// ── L1: start av Rush 1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
await click('xmasRushPlay');await wait(3300);
const s1=await rush(),h1=await hud();
check('L1 Rush 1 startar: läge rush, tempo 1, tre hjärtan, målet '+rushes.RUSHES[0].goal.target+' paket och turbon på av sig själv',s1.state==='running'&&s1.n===1&&s1.level===1&&s1.lives===3&&s1.goal&&s1.goal.kind==='packages'&&s1.goal.target===rushes.RUSHES[0].goal.target&&s1.goal.value===0&&(await ev(()=>window.KarlstadRound.snapshot().turbo.on)),JSON.stringify({n:s1.n,lvl:s1.level,lives:s1.lives,goal:s1.goal}));
check('L1b HUD:en visar RUSH 1, namnet JULMYS, tre hjärtan och målraden "HÄMTA PAKET 0/25"',h1.label==='RUSH'&&h1.count==='1'&&h1.name==='JULMYS'&&h1.hearts==='♥♥♥'&&!h1.goalHidden&&h1.goalLabel==='HÄMTA PAKET'&&h1.goalCount==='0/'+rushes.RUSHES[0].goal.target,JSON.stringify(h1));
check('L1c HUD:ns texter klipps inte: prickarna i HÄMTA PAKET syns',(await clipped('#xmasHud *')).length===0&&/HÄMTA/.test(await text('.xh-goal span')),JSON.stringify(await clipped('#xmasHud *')));
await shot('l01-rush1');

// ── L2: en bot klarar Rush 1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────
await ev(()=>{window.__skill=1;window.__botStart();});
let sawGoalMid=false;
const won1=await until(()=>{const s=window.KarlstadDebug.journey().xmas.julrush.snapshot();return s.state==='over';},240);
const mid=await ev(()=>window.KarlstadDebug.journey().xmas.julrush.result);
await wait(1800);
const rc1=await ev(()=>({panel:!document.getElementById('round-xmas-result').hidden,kicker:document.getElementById('xmasResultKicker').textContent,title:document.getElementById('xmasResultTitle').textContent,line:document.getElementById('xmasResultLine').textContent,
  cells:[...document.querySelectorAll('#xmasResultGrid .xr-cell')].map(c=>c.textContent),b1:document.getElementById('xmasResultContinue').textContent.trim(),b2:document.getElementById('xmasResultFree').textContent.trim(),share:!document.getElementById('xmasResultShare').hidden,
  parts:document.getElementById('xmasResultParts').textContent,status:document.getElementById('xmasResultStatus').textContent,points:document.getElementById('xmasResultPoints').textContent}));
check('L2 boten klarar Rush 1: slutkortet säger RUSH 1 KLAR! med tre stjärnor och knapparna NÄSTA RUSH · 2, UTMANA EN VÄN och RUSHMENYN',won1&&rc1.panel&&rc1.title==='RUSH 1 KLAR!'&&/★★★/.test(rc1.cells[0])&&/^NÄSTA RUSH · 2/.test(rc1.b1)&&rc1.share&&rc1.b2==='RUSHMENYN',JSON.stringify({kicker:rc1.kicker,title:rc1.title,cells:rc1.cells,b1:rc1.b1,b2:rc1.b2,share:rc1.share}));
check('L2b slutkortet säger att Rush 2 är upplåst och visar serien och rushstjärnorna',/Rush 2 är upplåst/.test(rc1.line)&&/RUSHSTJÄRNOR 3 \/ 36/.test(rc1.status),rc1.line+' | '+rc1.status);
await shot('l02-rush1-klar');
const sv1=await ev(()=>{const x=window.KarlstadDebug.journey().xmas;return {rush:x.save.state.rush,rec:x.save.state.records.julrush,over:x.julrush.result};});
const real=((await G.ctx.storageState()).origins.find(o=>o.origin.includes('localhost:'+PORT))?.localStorage)||[];
const raw=JSON.parse(real.find(e=>e.name==='karlstad-xmas:save:1')?.value||'{}');
check('L2c Rush 1 sparas i julbyggets egen nyckel: klarad, tre stjärnor, bästa poäng; Maratonrekordet är orört',sv1.rush.cleared===1&&sv1.rush.stars[1]===3&&sv1.rush.best[1].points===sv1.over.points&&raw.rush?.cleared===1&&raw.rush?.best?.[1]?.points===sv1.over.points&&!sv1.rec,JSON.stringify({cleared:sv1.rush.cleared,stars:sv1.rush.stars,pts:sv1.over.points,raw:raw.rush?.cleared}));
void mid;void sawGoalMid;

// ── L3: NÄSTA RUSH: tempo 2, målet är poäng, hjärtana följer med ───────────────────────────────────────────────────────────────────────
await click('xmasResultContinue');await wait(3300);
const s3=await rush(),h3=await hud();
check('L3 NÄSTA RUSH startar Rush 2: tempo 2, tre hjärtan, poängmålet och HUD "NÅ POÄNGEN"',s3.n===2&&s3.level===2&&s3.lives===3&&s3.goal.kind==='points'&&s3.goal.target===rushes.RUSHES[1].goal.target&&h3.label==='RUSH'&&h3.count==='2'&&h3.name==='PEPPARKAKA'&&h3.goalLabel==='NÅ POÄNGEN',JSON.stringify({n:s3.n,lvl:s3.level,goal:s3.goal,h:h3}));
check('L3b tempot är fast: farten är den för tempo 2 och ingen tempohöjning sker under rushen',await ev(()=>{const t=window.KarlstadDebug.journey().tempo;return t.level===2&&t.levelClock<.5;}));
check('L3c HUD:ns målrad klipps inte: ringen på Å och prickarna på Ä i NÅ POÄNGEN syns',(await clipped('#xmasHud *')).length===0&&/NÅ POÄNGEN/.test(await text('.xh-goal span')),JSON.stringify(await clipped('#xmasHud *')));
await ev(()=>{window.__skill=1;window.__botStart();});
const won2=await until(()=>window.KarlstadDebug.journey().xmas.julrush.snapshot().state==='over',240);
await wait(1800);
const rc2=await ev(()=>({title:document.getElementById('xmasResultTitle').textContent,line:document.getElementById('xmasResultLine').textContent,b1:document.getElementById('xmasResultContinue').textContent.trim(),res:window.KarlstadDebug.journey().xmas.julrush.result.rush}));
check('L3c boten klarar Rush 2 (poängmålet): RUSH 2 KLAR! och NÄSTA RUSH · 3, och tempot var 2 hela vägen',won2&&rc2.title==='RUSH 2 KLAR!'&&/^NÄSTA RUSH · 3/.test(rc2.b1)&&rc2.res.cleared&&rc2.res.tempo===2,JSON.stringify({title:rc2.title,line:rc2.line,b1:rc2.b1}));
await shot('l03-rush2-klar');

// ── L4: rushmenyn efter två klarade rusher ───────────────────────────────────────────────────────────────────────────────────────────
await click('xmasResultFree');await wait(500);
const m4=await ev(()=>({panel:!document.getElementById('round-xmas-rush').hidden,tiles:[...document.querySelectorAll('#xmasRushGrid .xr-tile')].map(t=>t.dataset.state+':'+t.querySelector('i').textContent),play:document.getElementById('xmasRushPlay').textContent.trim(),stars:document.getElementById('xmasRushStars').textContent,best:document.getElementById('xmasRushInfoBest').textContent}));
check('L4 rushmenyn visar stjärnorna på Rush 1–2, Rush 3 som nästa (öppen) och resten låsta; spelaknappen går till Rush 3',m4.panel&&/^done:★/.test(m4.tiles[0])&&/^done:★/.test(m4.tiles[1])&&m4.tiles[2].startsWith('open:')&&m4.tiles.slice(3).every(t=>t.startsWith('locked:'))&&/^SPELA RUSH 3/.test(m4.play),JSON.stringify({tiles:m4.tiles.slice(0,5),play:m4.play,stars:m4.stars}));
await shot('l04-rushmeny-efter');
// ett klick på en klarad rush väljer den och visar rekordet; en låst går inte att välja
await ev(()=>document.querySelector('#xmasRushGrid .xr-tile[data-n="1"]').click());await wait(200);
const sel1=await ev(()=>({title:document.getElementById('xmasRushInfoTitle').textContent,best:document.getElementById('xmasRushInfoBest').textContent,play:document.getElementById('xmasRushPlay').textContent.trim()}));
await ev(()=>document.querySelector('#xmasRushGrid .xr-tile[data-n="9"]').click());await wait(200);
const sel9=await ev(()=>document.getElementById('xmasRushInfoTitle').textContent);
check('L4b att välja Rush 1 visar rekordet och spelaknappen "SPELA RUSH 1", och en låst ruta går inte att välja',sel1.title==='RUSH 1 · JULMYS'&&/^REKORD [\d\s ]+ P · ★★★/.test(sel1.best)&&/^SPELA RUSH 1/.test(sel1.play)&&sel9==='RUSH 1 · JULMYS',JSON.stringify({sel1,sel9}));

// ── L5: att förlora ger inga stjärnor och ingen upplåsning ──────────────────────────────────────────────────────────────────────────────
await ev(()=>document.querySelector('#xmasRushGrid .xr-tile[data-n="3"]').click());await wait(150);await click('xmasRushPlay');await wait(3000);
await ev(()=>{window.__botStop();const t=window.KarlstadDebug.journey().tempo;t.deadline=12;t.left=12;}); // en lång klocka så att inget hjärta går åt av sig självt innan missarna tvingas fram
const hearts=[];
for(let i=0;i<3;i++){await ev(()=>{window.KarlstadDebug.journey().tempo.left=.02;});await wait(i?900:700);hearts.push((await hud()).hearts);}
await wait(1900);
const rc3=await ev(()=>({title:document.getElementById('xmasResultTitle').textContent,kicker:document.getElementById('xmasResultKicker').textContent,line:document.getElementById('xmasResultLine').textContent,b1:document.getElementById('xmasResultContinue').textContent.trim(),b2:document.getElementById('xmasResultFree').textContent.trim(),
  share:!document.getElementById('xmasResultShare').hidden,cleared:window.KarlstadDebug.journey().xmas.save.state.rush.cleared,stars:document.getElementById('xmasResultGrid').firstChild.textContent}));
check('L5 tre missade klockor tar alla hjärtan: Rush 3 slutar med SLUT PÅ HJÄRTAN, FÖRSÖK IGEN och ingen delningsknapp',hearts.join('>')==='♥♥♡>♥♡♡>♡♡♡'&&rc3.kicker==='SLUT PÅ HJÄRTAN'&&rc3.title==='RUSH 3 · GLÖGGFART'&&/^FÖRSÖK IGEN/.test(rc3.b1)&&rc3.b2==='RUSHMENYN'&&!rc3.share,JSON.stringify({hearts,kicker:rc3.kicker,title:rc3.title,b1:rc3.b1}));
check('L5b ingen stjärna och ingen upplåsning: Rush 3 är inte klarad (sparningen oförändrad)',rc3.cleared===2&&/☆☆☆/.test(rc3.stars)&&/Du hann/.test(rc3.line),JSON.stringify({cleared:rc3.cleared,stars:rc3.stars,line:rc3.line}));
await shot('l05-forlust');

// ── L6: Rush 12 (tempo 12) i riktig 3D: farten, klockan och banan följer tempot ────────────────────────────────────────────────────────────
await ev(()=>{const x=window.KarlstadDebug.journey().xmas;x.save.state.rush.cleared=11;x.save.save();});
await click('xmasResultFree');await wait(400);
await ev(()=>document.querySelector('#xmasRushGrid .xr-tile[data-n="12"]').click());await wait(150);await click('xmasRushPlay');await wait(3300);
const s6=await rush(),h6=await hud(),t6=await ev(()=>{const j=window.KarlstadDebug.journey();return {level:j.tempo.level,speed:j.tempo.speedMul(),deadline:j.tempo.deadline,gap:(()=>{const l=j.xmas.julrush.list;return Math.hypot(l[1].x-l[0].x,l[1].z-l[0].z);})(),turbo:document.body.classList.contains('turbo-on')};});
check('L6 Rush 12 startar på tempo 12: fart ×1,88, poängmål '+rushes.RUSHES[11].goal.target+', namnet TOMTEGALET, glest mellan paketen och turboeffekt',s6.n===12&&s6.level===12&&Math.abs(t6.speed-1.88)<.01&&s6.goal.target===rushes.RUSHES[11].goal.target&&h6.name==='TOMTEGALET'&&t6.gap>=22&&t6.turbo,JSON.stringify({lvl:s6.level,speed:t6.speed,gap:+t6.gap.toFixed(1),dl:+t6.deadline.toFixed(1),goal:s6.goal.target}));
await shot('l06-rush12');
await ev(()=>{window.__skill=0;});

// ── L6b: ÖVERTID: när alla tolv rusher är klarade fortsätter det med Rush 13, 14 … ────────────────────────────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(600);
// som en spelare som klarat Rush 1–12 på riktigt: båda rushstämplarna är delade
await ev(()=>{const x=window.KarlstadDebug.journey().xmas;x.save.state.rush.cleared=12;x.save.stamp('julrush');x.save.stamp('julrush-12');x.save.save();});
await click('xmasRushStart');await wait(500);
const ot=await ev(()=>{const t=document.querySelector('#xmasRushGrid .xr-tile.xr-ot');return {n:t.dataset.n,state:t.dataset.state,disabled:t.disabled,text:t.textContent.trim().replace(/\s+/g,' '),title:document.getElementById('xmasRushInfoTitle').textContent,goal:document.getElementById('xmasRushInfoGoal').textContent,play:document.getElementById('xmasRushPlay').textContent.trim(),pressed:t.getAttribute('aria-pressed'),h:Math.round(t.getBoundingClientRect().height)};});
check('L6b när alla tolv är klarade öppnas ÖVERTID-rutan: Rush 13 är vald (rubriken ÖVERTID 1), spelaknappen säger SPELA RUSH 13 och rutan är minst 48 px hög',ot.state==='open'&&!ot.disabled&&ot.n==='13'&&ot.title==='RUSH 13 · ÖVERTID 1'&&/^SPELA RUSH 13/.test(ot.play)&&ot.pressed==='true'&&/ÖVERTID/.test(ot.text)&&ot.h>=48&&new RegExp('^HÄMTA '+rushes.rushDef(13).goal.target+' PAKET · FART ×1,88').test(ot.goal),JSON.stringify(ot));
check('L6b2 rushmenyns texter klipps inte (ÖVERTID i rutan, Å och Ä i rubriker)',(await clipped('#xmasRushGrid .xr-tile span, #xmasRushGrid .xr-tile b, #xmasRushInfoTitle, #xmasRushPlay')).length===0,JSON.stringify(await clipped('#xmasRushGrid .xr-tile span, #xmasRushGrid .xr-tile b, #xmasRushInfoTitle, #xmasRushPlay')));
await shot('l06b-overtid-meny');
await click('xmasRushPlay');await wait(3300);
const o1=await rush(),oh=await hud(),oc=await ev(()=>{const j=window.KarlstadDebug.journey();return {level:j.tempo.level,speed:j.tempo.speedMul(),deadline:j.tempo.deadline,turbo:window.KarlstadRound.snapshot().turbo.on};});
const d13=rushes.rushDef(13);
check('L6c Rush 13 (ÖVERTID 1) startar med samma fart som Rush 12 (tempo 12), målet '+d13.goal.target+' paket och HUD "RUSH 13 · ÖVERTID 1"',o1.n===13&&o1.level===12&&o1.goal.target===d13.goal.target&&oc.level===12&&Math.abs(oc.speed-1.88)<.01&&oc.turbo&&oh.label==='RUSH'&&oh.count==='13'&&oh.name==='ÖVERTID 1'&&oh.goalCount==='0/'+d13.goal.target,JSON.stringify({n:o1.n,lvl:o1.level,goal:o1.goal.target,h:oh}));
check('L6c2 HUD:ns texter klipps inte i övertiden',(await clipped('#xmasHud *')).length===0,JSON.stringify(await clipped('#xmasHud *')));
await shot('l06c-overtid-start');
// Boten spelar rusherna med högsta möjliga fart. I den mjukvarurenderade webbläsaren är bildrutorna få och långa och varje bildruta äter av den trånga klockan, så boten får 30 % mer än full turbo:
// det som provas är att banan, klockan och målet fungerar i övertiden, inte hur svårt det är (det mäts med tools/xmas-flow/difficulty.mjs).
await ev(()=>{window.__skill=1.3;window.__botStart();});
await until(()=>window.KarlstadDebug.journey().xmas.julrush.snapshot().picked>=12,200);
const o2=await rush();
check('L6d boten plockar minst 12 paket i övertiden utan att tappa ett hjärta ('+o2.picked+' paket, '+o2.lives+' hjärtan)',o2.picked>=12&&o2.lives===3,JSON.stringify({picked:o2.picked,lives:o2.lives,score:o2.score,state:o2.state}));
// resten av målet hoppas över för att spara tid: räknaren sätts nära målet och boten tar de sista paketen
await ev(()=>{const t=window.KarlstadDebug.journey().tempo;t.picked=Math.max(t.picked,window.KarlstadDebug.journey().xmas.julrush.def.goal.target-2);});
await until(()=>window.KarlstadDebug.journey().xmas.julrush.snapshot().state==='over',120);await wait(1800);
const oc2=await ev(()=>({title:document.getElementById('xmasResultTitle').textContent,kicker:document.getElementById('xmasResultKicker').textContent,line:document.getElementById('xmasResultLine').textContent,b1:document.getElementById('xmasResultContinue').textContent.trim(),share:!document.getElementById('xmasResultShare').hidden,
  cleared:window.KarlstadDebug.journey().xmas.save.state.rush.cleared,parts:document.getElementById('xmasResultParts').textContent,res:window.KarlstadDebug.journey().xmas.julrush.result.rush}));
check('L6e Rush 13 klaras: RUSH 13 KLAR!, "LÄNGRE ÄN NÅGONSIN!", "Du har aldrig kommit så långt som Rush 13" och knappen NÄSTA RUSH · 14',oc2.title==='RUSH 13 KLAR!'&&oc2.kicker==='LÄNGRE ÄN NÅGONSIN!'&&/aldrig kommit så långt som Rush 13/.test(oc2.line)&&/^NÄSTA RUSH · 14/.test(oc2.b1)&&oc2.share&&oc2.cleared===13&&oc2.res.overtime&&oc2.res.newReach&&oc2.res.next===14,JSON.stringify({title:oc2.title,kicker:oc2.kicker,line:oc2.line,b1:oc2.b1,cleared:oc2.cleared}));
check('L6f resultatkortet förklarar hjärtareglen (hjärtan fylls bara på om du klarar en rush utan att tappa ett) och texterna klipps inte',(/NÄSTA RUSH MED \d HJÄRT/.test(oc2.parts))&&(await clipped('#round-xmas-result *')).length===0,JSON.stringify({parts:oc2.parts,clip:await clipped('#round-xmas-result *')}));
await shot('l06e-overtid-klar');
// LÄNGST: topplistan kan sorteras på hur långt man kommit, och UTMANA EN VÄN efter en övertidsrush öppnar den
await click('xmasResultShare');await wait(500);
const lb=await ev(()=>({sel:document.getElementById('xmasBoardRush').value,rows:[...document.querySelectorAll('#xmasBoardList li')].map(l=>l.textContent),opts:[...document.getElementById('xmasBoardRush').options].map(o=>o.value),txt:document.getElementById('xmasBoardShareText').textContent}));
check('L6g UTMANA EN VÄN efter Rush 13 öppnar topplistan LÄNGST I JULRUSHEN med "RUSH 13" och väljaren har TOTALT, LÄNGST och tolv rusher (14 val)',lb.sel==='reach'&&lb.rows.length===1&&/RUSH 13/.test(lb.rows[0])&&lb.opts.length===14&&lb.opts[1]==='reach'&&/Skriv ditt namn/.test(lb.txt),JSON.stringify(lb));
await shot('l06g-langst');
await click('xmasBoardBack');await wait(400);
await click('xmasResultFree');await wait(500);
const ot2=await ev(()=>{const t=document.querySelector('#xmasRushGrid .xr-tile.xr-ot');return {n:t.dataset.n,state:t.dataset.state,text:t.textContent.trim().replace(/\s+/g,' '),head:document.getElementById('xmasRushStars').textContent,play:document.getElementById('xmasRushPlay').textContent.trim()};});
check('L6h efter Rush 13 pekar ÖVERTID-rutan på Rush 14 och visar hur långt du kommit (✓ 13), och rubriken visar RUSH 13',ot2.n==='14'&&ot2.state==='done'&&/✓ 13/.test(ot2.text)&&/RUSH 13$/.test(ot2.head)&&/^SPELA RUSH 14/.test(ot2.play),JSON.stringify(ot2));
await shot('l06h-overtid-meny-efter');
// tillbaka till Rush 12-läget för gåvorna nedan
await ev(()=>{const x=window.KarlstadDebug.journey().xmas;x.startRush(12);x.julrush.timers.pause=9999;window.__skill=0;});await wait(2600); // klockan fryst direkt: inget hjärta går åt medan provet står och tittar

// ── L7: gåvorna i 3D: magnet, tomtespöke, kryddbomb och paketregn, och sidopaket ─────────────────────────────────────────────────────────────
await ev(()=>{const x=window.KarlstadDebug.journey().xmas,r=x.julrush,j=window.KarlstadDebug.journey();r.timers.pause=9999;const p=window.__pos(),f=j.lastForward||{x:0,z:-1};
  // ett guldpaket med gåva en bit framför spelaren, så att brickan och spöket alltid har något att visa
  const id='tp:lvl1',it={id,x:p[0]+f.x*14,z:p[1]+f.z*14,dyn:true,course:900,hx:f.x,hz:f.z};j.course.pearls.push(it);j.items.push(it);j.itemById.set(id,it);r.sync();const pk=r.pk.get(id);pk.gift='star';pk.kind='bonus';
  r.grant('magnet',{x:p[0],z:p[1],y:1.68});r.grant('ghost',{x:p[0],z:p[1],y:1.68});});await wait(900);
const g7=await ev(()=>({view:window.KarlstadDebug.journey().xmas.view.snapshot(),chips:[...document.querySelectorAll('.xh-chip')].map(c=>c.textContent),rs:window.KarlstadDebug.journey().xmas.julrush.snapshot()}));
check('L7 magnet och tomtespöke syns: brickorna MAGNET och SPÖKE, spöket ritas och gåvobrickor sitter på guldpaketen',g7.chips.some(c=>/^MAGNET \d/.test(c))&&g7.chips.some(c=>/^SPÖKE \d/.test(c))&&g7.view.ghost===true&&g7.view.badges>=1&&g7.rs.magnet&&g7.rs.ghost,JSON.stringify({chips:g7.chips,ghost:g7.view.ghost,badges:g7.view.badges}));
await shot('l07-magnet-spoke');
await ev(()=>{const r=window.KarlstadDebug.journey().xmas.julrush,p=window.__pos();r.timers.magnet=0;r.timers.ghost=0;r.grant('rain',{x:p[0],z:p[1],y:1.68});});await wait(800);
const rain=await ev(()=>({rs:window.KarlstadDebug.journey().xmas.julrush.snapshot(),shown:window.KarlstadDebug.journey().xmas.view.snapshot().shown}));
check('L7b paketregnet lägger extra paket runt spelaren (minst fyra, beroende på hur trångt det är) som syns i vyn',rain.rs.rain>=4&&rain.shown>=4,JSON.stringify({rain:rain.rs.rain,shown:rain.shown}));
await shot('l07b-regn');
await ev(()=>{const r=window.KarlstadDebug.journey().xmas.julrush,p=window.__pos();r.grant('bomb',{x:p[0],z:p[1],y:1.68});});await wait(700);
const bomb=await ev(()=>({rs:window.KarlstadDebug.journey().xmas.julrush.snapshot(),rain:window.KarlstadDebug.journey().xmas.julrush.side.filter(k=>k.rain&&!k.collected).length}));
check('L7c kryddbomben tar paketen runt spelaren: regnpaketen är borta och poängen har stigit',bomb.rain===0&&bomb.rs.score>0,JSON.stringify({rain:bomb.rain,score:bomb.rs.score}));
// De fyra fartgåvorna (glögg, pepparkaksraket, medvind, skridskor): brickor, fart (den starkaste gäller, raketen ×3) och effekt
await ev(()=>{const r=window.KarlstadDebug.journey().xmas.julrush,p=window.__pos();for(const k of ['glogg','kaka','wind','skates'])r.grant(k,{x:p[0],z:p[1],y:1.68});});await wait(700);
const fg=await ev(()=>({chips:[...document.querySelectorAll('.xh-chip')].map(c=>c.textContent),mul:window.KarlstadDebug.journey().fun.power.speedMul(),scale:window.__turbo(),rocket:document.body.classList.contains('rocket-on'),turbo:document.body.classList.contains('turbo-on'),
  fit:[...document.querySelectorAll('.xh-chip')].every(c=>{const r=c.getBoundingClientRect();return r.left>=0&&r.right<=window.innerWidth;}),chipClip:null}));
check('L7e de fyra nya fartgåvorna syns som brickor (GLÖGG, RAKET, VIND, SKRIDSKOR), den starkaste gäller (raketen: farten ×3, med turbon ×'+(2*3*1.88).toFixed(1)+') och alla brickor ryms på skärmen',['GLÖGG','RAKET','VIND','SKRIDSKOR'].every(t=>fg.chips.some(c=>c.startsWith(t)))&&fg.mul===3&&Math.abs(fg.scale-2*3*1.88)<.05&&fg.rocket&&fg.turbo&&fg.fit,JSON.stringify(fg));
check('L7e2 brickornas texter klipps inte',(await clipped('.xh-chip')).length===0,JSON.stringify(await clipped('.xh-chip')));
await shot('l07e-fartgavor');
await ev(()=>{window.__skill=0;});
// sidopaket: botten springer en stund på en lugn nivå (Rush 12 har glest, så starta Rush 1) och sidopaket ska dyka upp med gåva
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(600);
await ev(()=>window.KarlstadDebug.journey().xmas.startRush(1));await wait(2500);await ev(()=>{window.__skill=1;window.__botStart();});
const sawSide=await until(()=>window.KarlstadDebug.journey().xmas.julrush.side.some(k=>!k.rain),60);
const side=await ev(()=>{const r=window.KarlstadDebug.journey().xmas.julrush;const k=r.side.find(x=>!x.rain);return k?{id:k.id,gift:k.gift,kind:k.kind,blocked:window.__blocked(k.x,k.z),view:window.KarlstadDebug.journey().xmas.view.snapshot()}:null;});
check('L7d ett sidopaket (guldpaket med gåva) ligger vid sidan av banan på gångbar mark och syns med en gåvobricka',sawSide&&side&&side.kind==='bonus'&&!!side.gift&&!side.blocked&&side.view.badges>=1,JSON.stringify(side));
await shot('l07d-sidopaket');
await ev(()=>{window.__botStop();window.KarlstadDebug.journey().xmas.openMenu();});await wait(600);

// ── L8: topplistan, namnet och utmaningslänken ─────────────────────────────────────────────────────────────────────────────────────────────
await click('xmasRushStart');await wait(500);
await ev(()=>document.querySelector('#xmasRushGrid .xr-tile[data-n="2"]').click());await wait(150);
await click('xmasRushBoard');await wait(500);
const b0=await ev(()=>({panel:!document.getElementById('round-xmas-board').hidden,sel:document.getElementById('xmasBoardRush').value,rows:[...document.querySelectorAll('#xmasBoardList li')].map(l=>l.textContent),name:document.getElementById('xmasBoardName').value,link:document.getElementById('xmasBoardLink').value,
  share:document.getElementById('xmasBoardShare').disabled,txt:document.getElementById('xmasBoardShareText').textContent,note:document.getElementById('xmasBoardNote').textContent,opts:document.getElementById('xmasBoardRush').options.length}));
check('L8 topplistan öppnas för vald rush: listan innehåller dig, väljaren har 14 val (TOTALT, LÄNGST och tolv rusher), utan namn går det inte att skicka och texten ber om ett namn',b0.panel&&b0.sel==='2'&&b0.opts===14&&b0.rows.length===1&&/^1DU\d/.test(b0.rows[0])&&b0.share===true&&b0.link===''&&/Skriv ditt namn/.test(b0.txt),JSON.stringify({sel:b0.sel,rows:b0.rows,share:b0.share,txt:b0.txt}));
await ev(()=>{const i=document.getElementById('xmasBoardName');i.focus();});
await G.page.keyboard.type('Åsa Lisa Bo');await wait(300);
const b1=await ev(()=>({link:document.getElementById('xmasBoardLink').value,share:document.getElementById('xmasBoardShare').disabled,copy:document.getElementById('xmasBoardCopy').disabled,txt:document.getElementById('xmasBoardShareText').textContent,name:document.getElementById('xmasBoardName').value}));
const tok=b1.link.split('utmaning=')[1],dec=board.decodeChallenge(tok),mine=await ev(()=>window.KarlstadDebug.journey().xmas.save.profile(0));
check('L8b när namnet skrivits blir länken giltig: rätt adress, namnet, utmaningen i Rush 2 med dina poäng, och profilen med dina bästa poäng',b1.link.startsWith('http://localhost:'+PORT+'/?utmaning=')&&!b1.share&&!b1.copy&&dec&&dec.profile.name==='Åsa Lisa Bo'&&dec.focus===2&&dec.toBeat===mine.bests[2]&&dec.profile.bests[1]===mine.bests[1]&&dec.profile.stars===mine.stars,JSON.stringify({name:dec?.profile.name,focus:dec?.focus,toBeat:dec?.toBeat,bests:dec?.profile.bests,txt:b1.txt}));
await shot('l08-topplista');
await click('xmasBoardCopy');await wait(500);
const cp=await ev(async()=>({status:document.getElementById('xmasBoardStatus').textContent,clip:await navigator.clipboard.readText().catch(()=>null)}));
check('L8c KOPIERA LÄNKEN lägger länken i urklipp och säger det',/Länken är kopierad/.test(cp.status)&&cp.clip===b1.link,JSON.stringify({status:cp.status,same:cp.clip===b1.link}));
await ev(()=>{const i=document.getElementById('xmasBoardName');i.blur();});await wait(200);
check('L8d namnet sparas och finns kvar efter omladdning av vyn',await ev(()=>window.KarlstadDebug.journey().xmas.save.name==='Åsa Lisa Bo'));
// väljaren byter rush och listan följer
await ev(()=>{const s=document.getElementById('xmasBoardRush');s.value='0';s.dispatchEvent(new Event('change'));});await wait(250);
const tot=await ev(()=>[...document.querySelectorAll('#xmasBoardList li')].map(l=>l.textContent));
check('L8e TOTALT visar summan av dina bästa poäng',tot.length===1&&tot[0].includes(mine.total.toLocaleString('sv-SE')),tot.join('|'));
// LÄNGST via väljaren: listan visar hur långt man kommit (Rush 13 efter övertiden ovan)
await ev(()=>{const s=document.getElementById('xmasBoardRush');s.value='reach';s.dispatchEvent(new Event('change'));});await wait(250);
const farRows=await ev(()=>({sel:document.getElementById('xmasBoardRush').value,rows:[...document.querySelectorAll('#xmasBoardList li')].map(l=>l.textContent)}));
check('L8g väljaren LÄNGST I JULRUSHEN visar hur långt du kommit: "RUSH 13"',farRows.sel==='reach'&&farRows.rows.length===1&&/^1Åsa Lisa Bo \(DU\)RUSH 13★\d+$/.test(farRows.rows[0]),JSON.stringify(farRows));
await shot('l08g-langst-vaeljare');
await ev(()=>{const s=document.getElementById('xmasBoardRush');s.value='0';s.dispatchEvent(new Event('change'));});await wait(200);
check('L8f namnen i topplistan klipps inte (ett namn som börjar på Å visar sin ring)',(await clipped('#xmasBoardList .nm')).length===0&&/^Å/.test(await text('#xmasBoardList .nm')),JSON.stringify({c:await clipped('#xmasBoardList .nm'),t:await text('#xmasBoardList .nm')}));
const sharedToken=tok;
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(400);

// ═══ Spelare 2: öppnar länken ═════════════════════════════════════════════════════════════════════════════════════════════════════════
const p1={page:G.page,ctx:G.ctx};
await openGame('&utmaning='+sharedToken);
const c0=await ev(()=>({panel:!document.getElementById('round-xmas-challenge').hidden,intro:!document.getElementById('round-xmas-intro').hidden,title:document.getElementById('xmasChallengeTitle').textContent,line:document.getElementById('xmasChallengeLine').textContent,
  stats:[...document.querySelectorAll('#xmasChallengeStats .xr-cell')].map(c=>c.textContent),note:document.getElementById('xmasChallengeNote').textContent,go:document.getElementById('xmasChallengeGo').textContent.trim(),search:location.search,friends:window.KarlstadDebug.journey().xmas.save.friends.length,inc:window.KarlstadDebug.journey().xmas.snapshot().incoming}));
check('L9 en vän som öppnar länken får utmaningskortet först: "ÅSA LISA BO UTMANAR DIG!", vad som ska slås och sin egen nivå (Rush 2 är inte upplåst)',c0.panel&&!c0.intro&&c0.title==='ÅSA LISA BO UTMANAR DIG!'&&/^Slå [\d\s ]+ poäng i Rush 2 · PEPPARKAKA/.test(c0.line)&&/Rush 2 än/.test(c0.note)&&/^SPELA RUSH 1/.test(c0.go),JSON.stringify({title:c0.title,line:c0.line,note:c0.note,go:c0.go}));
check('L9b adressen städas (inget ?utmaning kvar) och ingen vän sparas bara av att länken öppnas',!/utmaning/.test(c0.search)&&c0.friends===0&&c0.inc&&c0.inc.focus===2,JSON.stringify({search:c0.search,friends:c0.friends}));
await shot('l09-utmaning');
// låt spelare 2 ha klarat Rush 1 så att Rush 2 är nåbar, ta utmaningen via en ny sidladdning av samma länk
await ev(()=>{const x=window.KarlstadDebug.journey().xmas;x.save.recordRush(1,{points:640,seconds:40,packages:13,hearts:3,cleared:true});});
await G.page.goto(`http://localhost:${PORT}/?debug&utmaning=${sharedToken}`);
await G.page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await wait(900);
await injectBot();
const c1=await ev(()=>({go:document.getElementById('xmasChallengeGo').textContent.trim(),note:document.getElementById('xmasChallengeNote').textContent,save:!document.getElementById('xmasChallengeSave').hidden}));
check('L9c när Rush 2 är nåbar säger knappen TA UTMANINGEN och rutan om nivån är borta',/^TA UTMANINGEN/.test(c1.go)&&c1.note===''&&c1.save,JSON.stringify(c1));
await click('xmasChallengeGo');await wait(3400);
const s9=await ev(()=>({rush:window.KarlstadDebug.journey().xmas.julrush.snapshot(),pending:window.KarlstadDebug.journey().xmas.snapshot().pending,friends:window.KarlstadDebug.journey().xmas.save.friends.map(f=>[f.name,f.total,f.bests[2]])}));
check('L9d att ta utmaningen sparar vännen och startar Rush 2 med utmaningen som väntande',s9.rush.n===2&&s9.rush.state==='running'&&s9.pending&&s9.pending.focus===2&&s9.pending.name==='Åsa Lisa Bo'&&s9.friends.length===1&&s9.friends[0][0]==='Åsa Lisa Bo',JSON.stringify(s9));
await ev(()=>{window.__skill=1;window.__botStart();});
await until(()=>window.KarlstadDebug.journey().xmas.julrush.snapshot().state==='over',240);await wait(1800);
const v9=await ev(()=>({line:document.getElementById('xmasResultLine').textContent,title:document.getElementById('xmasResultTitle').textContent,pending:window.KarlstadDebug.journey().xmas.snapshot().pending}));
check('L9e efter rushen jämförs resultatet med utmaningen: "DU SLOG ÅSA LISA BO!" eller "ÅSA LISA BO VANN MED …"',/^(DU SLOG ÅSA LISA BO!|ÅSA LISA BO VANN MED|LIKA MED ÅSA LISA BO)/.test(v9.line)&&v9.title==='RUSH 2 KLAR!',JSON.stringify({line:v9.line}));
await shot('l09e-jamforelse');
// vännen finns i topplistan
await click('xmasResultShare');await wait(500);
const fl=await ev(()=>({rows:[...document.querySelectorAll('#xmasBoardList li')].map(l=>l.textContent),sel:document.getElementById('xmasBoardRush').value,name:document.getElementById('xmasBoardName').value,txt:document.getElementById('xmasBoardShareText').textContent}));
check('L9f UTMANA EN VÄN på slutkortet öppnar topplistan för Rush 2 med både dig och vännen, och ber om ett namn',fl.sel==='2'&&fl.rows.length===2&&fl.rows.some(r=>/Åsa Lisa Bo/.test(r))&&fl.rows.some(r=>/^\d(DU|.+ \(DU\))\d/.test(r))&&/Skriv ditt namn/.test(fl.txt),JSON.stringify(fl));
await shot('l09f-vanlista');
await click('xmasBoardBack');await wait(400);
check('L9g TILLBAKA från topplistan går till slutkortet',await panelOpen('round-xmas-result'));

// ── L10: trasig länk och profil utan utmaning ────────────────────────────────────────────────────────────────────────────────────────────
await G.ctx.close();
await openGame('&utmaning=trasig_lank_som_inte_stammer_1234567890');
const bad=await ev(()=>({intro:!document.getElementById('round-xmas-intro').hidden,chal:!document.getElementById('round-xmas-challenge').hidden,toast:document.getElementById('roundToast').textContent,search:location.search}));
check('L10 en trasig länk visar startvyn som vanligt med ett meddelande, och adressen städas',bad.intro&&!bad.chal&&/Länken gick inte att läsa/.test(bad.toast)&&!/utmaning/.test(bad.search),JSON.stringify(bad));
await G.ctx.close();
const profTok=board.encodeChallenge({name:'Nisse',focus:0,cleared:4,stars:10,bests:{1:500,2:800,3:1200,4:2000},at:Date.now()});
await openGame('&utmaning='+profTok);
const pr=await ev(()=>({title:document.getElementById('xmasChallengeTitle').textContent,line:document.getElementById('xmasChallengeLine').textContent,save:document.getElementById('xmasChallengeSave').hidden,go:document.getElementById('xmasChallengeGo').textContent.trim()}));
check('L10b en profil utan utmaning ("NISSE VILL VARA DIN VÄN") har en enda knapp som sparar vännen',/^NISSE VILL VARA DIN VÄN$/.test(pr.title)&&pr.save&&/^SPARA VÄNNEN/.test(pr.go),JSON.stringify(pr));
await click('xmasChallengeGo');await wait(700);
const pr2=await ev(()=>({friends:window.KarlstadDebug.journey().xmas.save.friends.map(f=>[f.name,f.total]),board:!document.getElementById('round-xmas-board').hidden,rows:[...document.querySelectorAll('#xmasBoardList li')].map(l=>l.textContent)}));
check('L10c vännen sparas och topplistan visar honom',pr2.board&&pr2.friends.length===1&&pr2.friends[0][0]==='Nisse'&&pr2.rows.some(r=>/Nisse/.test(r)),JSON.stringify(pr2));
await shot('l10-profil');
void p1;

check('J inga oväntade fel i konsolen',errs.length===0,errs.slice(0,3).join(' | '));
console.log(`\n${VIEW}: ${results.length-failed}/${results.length} OK, ${failed} fel`);
await browser.close();
process.exit(failed?1:0);
