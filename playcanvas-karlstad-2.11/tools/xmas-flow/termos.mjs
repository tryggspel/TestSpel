#!/usr/bin/env node
// Verifiering i riktig webbläsare av julbyggets huvudspår (2.21.1-xmas.13): TERMOSJAKTEN (TempoRush med julens termosar, obegränsat antal rundor, dagsmål, rekord och insamlingen på Torget)
// och DAGENS JULKLAPPSJAKT (en ny julklapp gömd i staden varje dag, gåta, varmt och glödhett, hjälp efter hand, belöning en gång per dag). Dessutom ljusvalet i pausmenyn.
// Startar det riktiga spelet i headless Chromium med en egen liten webbserver, låter en bot följa Termosjaktens mål i speltid, klickar på gränssnittet och kontrollerar att spelet svarar rätt.
// Avslutar med kod 1 om något avviker. Sparar skärmbilder om SHOTS=katalog anges.
//
//   node tools/xmas-flow/termos.mjs        Env: PLAYWRIGHT=/väg/playwright/index.mjs  PLAYCANVAS=/väg/playcanvas.mjs  CHROME=/väg/chromium  VIEW=414x896m  SHOTS=katalog
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
  const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};window.__pos=()=>{const p=player.getPosition();return [p.x,p.z]};window.__turbo=()=>lastRound?.turboScale?.()||1;app.on('update',update);");
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
const today=dayOf(new Date()),def=dailyFor(today);

// ── T0: menyn ──────────────────────────────────────────────────────────────────────────────────────────────────────
const m0=await ev(()=>{const b=id=>{const e=document.getElementById(id);const r=e?.getBoundingClientRect();return e?{text:e.textContent.trim(),h:Math.round(r.height),y:Math.round(r.y),primary:e.classList.contains('xmas-primary')}:null;};
  return {panel:!document.getElementById('round-xmas-intro').hidden,termos:b('xmasTermos'),daily:b('xmasDaily'),cozy:b('xmasCozy'),tNote:document.getElementById('xmasTermosNote').textContent,dNote:document.getElementById('xmasDailyNote').textContent};});
check('T0 startvyn: TERMOSJAKTEN är den stora huvudknappen överst, DAGENS JULKLAPPSJAKT under, Julklappsjakten därefter',m0.panel&&/TERMOSJAKTEN/.test(m0.termos.text)&&m0.termos.primary&&m0.termos.h>=52&&m0.daily.y>m0.termos.y&&m0.cozy.y>m0.daily.y&&!m0.cozy.primary,JSON.stringify({t:m0.termos,d:m0.daily,c:m0.cozy}));
check('T0b raden under Termosjakten säger dagens mål; raden under dagens julklappsjakt har dagens gåta',/Dagens mål/.test(m0.tNote)&&m0.dNote.includes(def.area.riddle.slice(0,30)),JSON.stringify({t:m0.tNote,d:m0.dNote.slice(0,90)}));
await shot('t00-meny');

// ── T1: Termosjakten startar ─────────────────────────────────────────────────────────────────────────────────────────
await click('xmasTermos');await wait(3200);
const t1=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,s=x.julrush.snapshot(),thermos=x.sprites.thermos(),root=window.__app.root;
  let th=0,pk=0;for(const e of root.find(n=>n.enabled&&n.render&&n.render.meshInstances?.length===1)){const m=e.render.meshInstances[0].material;if(thermos.includes(m))th++;else if(x.sprites.packageMaterials.includes(m))pk++;}
  return {mode:x.snapshot().mode,skin:s.skin,state:s.state,level:s.level,lives:s.lives,name:s.name,packages:s.packages,th,pk,hud:document.querySelector('.xh-points span')?.textContent};});
check('T1 TERMOSJAKTEN startar TempoRush med termosar: läge rush, tempo 1, tre liv, tempots namn KAFFEPAUS',t1.mode==='rush'&&t1.skin==='termos'&&t1.state==='running'&&t1.level===1&&t1.lives===3&&t1.name==='KAFFEPAUS'&&t1.hud==='KAFFEPAUS',JSON.stringify(t1));
check('T1b banan är utlagd och det som syns är termosar, inga paket',t1.packages>=6&&t1.th>=2&&t1.pk===0,JSON.stringify({packages:t1.packages,termosar:t1.th,paket:t1.pk}));
await shot('t01-termosjakten');

// ── T2: en bot följer målen i speltid ────────────────────────────────────────────────────────────────────────────────
await ev(()=>{window.__botOn=true;let last=null;const f=()=>{if(!window.__botOn)return;const j=window.KarlstadDebug.journey(),t=j.tempo,tg=t.target;
  if(t.running&&tg){const el=j.elapsed;if(last!==null&&el>last){const [x,z]=window.__pos(),dx=tg.x-x,dz=tg.z-z,d=Math.hypot(dx,dz),s=Math.min(d,7.2*window.__turbo()*(el-last));if(s>0&&d>.01)window.__tp(x+dx/d*s,z+dz/d*s,Math.atan2(-dx,-dz)*180/Math.PI,-4);}last=el;}else last=null;requestAnimationFrame(f);};requestAnimationFrame(f);});
const got=await until(()=>window.KarlstadDebug.journey().tempo.picked>=12,150);
const t2=await ev(()=>{const s=window.KarlstadDebug.journey().xmas.julrush.snapshot();return {picked:window.KarlstadDebug.journey().tempo.picked,score:s.score,lives:s.lives,compass:document.getElementById('compassText')?.textContent||''};});
check('T2 boten plockar termosar och poängen stiger',got&&t2.picked>=12&&t2.score>0,JSON.stringify(t2));
await shot('t02-termosar');
// ── T3: boten släpper: klockan går ut tre gånger och rundan tar slut ───────────────────────────────────────────────────
await ev(()=>{window.__botOn=false;});
const over=await until(()=>!document.getElementById('round-xmas-result').hidden,150);
const t3=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,s=x.save.termos,m=x.decor?.market?.snapshot?.();const q=id=>document.getElementById(id)?.textContent||'';
  return {kicker:q('xmasResultKicker'),title:q('xmasResultTitle'),line:q('xmasResultLine'),grid:[...document.querySelectorAll('#xmasResultGrid .xr-cell span')].map(e=>e.textContent),parts:q('xmasResultParts'),status:q('xmasResultStatus'),cont:q('xmasResultContinue'),
    result:x.julrush.snapshot().result,total:s.total,runs:s.runs,best:s.best,today:x.save.termosDay(x.meta.today()),donations:m?.donations,xp:x.meta.state.xp,tried:x.meta.state.tried};});
check('T3 rundan slutar med Termosjaktens resultatkort: TERMOSJAKTEN · TEMPO, termosar, dagens mål, rekord och EN RUNDA TILL',over&&/^TERMOSJAKTEN · TEMPO \d+$/.test(t3.title)&&t3.grid[0]==='TERMOSAR'&&/DAGENS MÅL/.test(t3.parts)&&/REKORD/.test(t3.parts)&&/EN RUNDA TILL/.test(t3.cont)&&/termosar|termos/.test(t3.line),JSON.stringify({k:t3.kicker,t:t3.title,g:t3.grid,p:t3.parts,c:t3.cont}));
check('T3b rundan sparas: rekord, dagens runda och insamlingens summa; räkneverket i insamlingsbåset visar samma tal',t3.total>=12&&t3.runs===1&&t3.best&&t3.best.thermos===t3.total&&t3.today.runs===1&&t3.today.top.length===1&&t3.donations===t3.total&&/INSAMLINGEN: \d+ TERMOSAR/.test(t3.status),JSON.stringify({total:t3.total,runs:t3.runs,today:t3.today.runs,donations:t3.donations,status:t3.status}));
console.log('   resultat:',JSON.stringify({chain:t3.result?.bestChain,collected:t3.result?.collected,termos:t3.result?.termos}));
check('T3c framstegen räknar rundan (XP, Termosjakten provad: dagens uppdrag börjar)',t3.xp>0&&t3.tried.termos===true,JSON.stringify({xp:t3.xp,tried:t3.tried}));
await shot('t03-resultat');

// ── T4: EN RUNDA TILL, sedan ge upp via pausmenyn; menyn visar dagens bästa ────────────────────────────────────────────
await click('xmasResultContinue');await wait(3000);
const t4=await ev(()=>{const s=window.KarlstadDebug.journey().xmas.julrush.snapshot();return {skin:s.skin,state:s.state,level:s.level};});
check('T4 EN RUNDA TILL startar en ny runda Termosjakten direkt (obegränsat antal rundor)',t4.skin==='termos'&&t4.state==='running'&&t4.level===1,JSON.stringify(t4));
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(900);
const t4b=await ev(()=>({panel:!document.getElementById('round-xmas-intro').hidden,note:document.getElementById('xmasTermosNote').textContent,mode:window.KarlstadDebug.journey().xmas.snapshot().mode}));
check('T4b julmenyn igen: raden under TERMOSJAKTEN visar dagens bästa, rekordet och insamlingen',t4b.panel&&t4b.mode==='menu'&&/Dagens bästa/.test(t4b.note)&&/Rekord/.test(t4b.note)&&/insamlingen/.test(t4b.note),JSON.stringify(t4b));

// ── T5: dagens julklappsjakt ──────────────────────────────────────────────────────────────────────────────────────────
await click('xmasDaily');await wait(2600);
const t5=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,s=x.snapshot(),[px,pz]=window.__pos();return {mode:s.mode,daily:s.daily,pos:[Math.round(px),Math.round(pz)],hunt:s.hunt.kind||s.hunt.run?.kind||null,mission:x.handlers?null:null};});
check('T5 DAGENS JULKLAPPSJAKT startar vid tomtens stuga på Torget med dagens gåta (steg 1)',t5.mode==='cozy'&&t5.daily&&t5.daily.day===today&&t5.daily.area===def.area.id&&t5.daily.level===1&&Math.hypot(t5.pos[0]+27,t5.pos[1]-31)<4,JSON.stringify(t5));
await wait(600);
const mission=await ev(()=>[...document.querySelectorAll('.xg-mission li, .xg-mission div, #xmasMission *')].map(e=>e.textContent).join(' | ')||document.body.innerText.match(/DAGENS JULKLAPP[^\n]*/)?.[0]||'');
check('T5b uppdragsraden visar DAGENS JULKLAPP · LÖS GÅTAN',/DAGENS JULKLAPP · LÖS GÅTAN/.test(mission),mission.slice(0,160));
// 2.21.1-xmas.17: eget läge – inga tappade julklappar eller spår i snön, bara dagens julklapp; panelen med gåtan och värmemätaren
await wait(8000);
const t5m=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,r=x.hunt.run,s=x.snapshot();return {mode:!!r.dailyMode,rains:r.rains.length,ids:r.packages.filter(k=>!k.collected).map(k=>String(k.id)),panel:s.daily?.panel,
  text:document.body.innerText};});
check('T5m dagens jakt är ett eget läge: inga tappade julklappar eller spår i snön (vänta längre än första regnet), bara dagens julklapp',t5m.mode&&t5m.rains===0&&t5m.ids.length===1&&t5m.ids[0].startsWith('d:')&&!/TAPPADE JULKLAPPAR|HITTA TOMTARNAS SPÅR|NYA SPÅR/.test(t5m.text),JSON.stringify({mode:t5m.mode,rains:t5m.rains,ids:t5m.ids}));
check('T5n panelen överst: DAGENS JULKLAPP med gåtan, värmemätaren och ledtråd 1/5',!!t5m.panel&&t5m.panel.open&&t5m.panel.step===1&&t5m.panel.riddle.includes(def.area.riddle.slice(0,25))&&Number.isInteger(t5m.panel.warm)&&/LEDTRÅD 1\/5/.test(t5m.text),JSON.stringify(t5m.panel));
await shot('t05-dagens');
// steg 2 och 3 med tiden: området, sedan väderstreck och avstånd (ingen pil än)
await ev(()=>{const d=window.KarlstadDebug.journey().xmas.daily;d.t0=performance.now()-125000;});await wait(1800);
const t5k=await ev(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return {level:s.daily?.level,hints:s.daily?.panel.hints,guide:s.guide.on?s.guide.id:null,text:document.querySelector('.xd-hints')?.textContent||''};});
check('T5k efter två minuter: ledtrådarna OMRÅDET och VÄDERSTRECK står i panelen, och ingen pil än',t5k.level===3&&t5k.hints===2&&t5k.text.includes(def.area.name)&&/(norrut|nordost|österut|sydost|söderut|sydväst|västerut|nordväst)/.test(t5k.text)&&!t5k.guide,JSON.stringify(t5k));
await shot('t05k-ledtradar');
// steg 4: pilen leder till området (tiden spolas fram)
await ev(()=>{const d=window.KarlstadDebug.journey().xmas.daily;d.t0=performance.now()-190000;});await wait(1800);
const t5c=await ev(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return {level:s.daily?.level,guide:s.guide.id,label:s.guide.label,on:s.guide.on};});
check('T5c efter tre minuter leder pilen till dagens område (inte till julklappen, aldrig till spår)',t5c.level===4&&t5c.guide==='xmas-daily'&&t5c.label===def.area.name.toUpperCase(),JSON.stringify(t5c));
// LEDTRÅD NU: steg 5, pilen ända fram
await ev(()=>document.querySelector('.xd-btn')?.click());await wait(1500);
const t5l=await ev(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return {level:s.daily?.level,bonus:s.daily?.bonus,guide:s.guide.id,on:s.guide.on};});
check('T5l LEDTRÅD NU: sista steget, pilen visar vägen ända fram till julklappen',t5l.level===5&&t5l.bonus===1&&t5l.on&&t5l.guide==='xmas-daily-spot',JSON.stringify(t5l));
await shot('t05c-pilen');
// varmt nära julklappen, sedan hittad
const sp=def.spot;
await ev(([x,z])=>window.__tp(x+38,z,90,-4),[sp.x,sp.z]);await wait(1500);
const warm=await ev(()=>({lab:document.querySelector('.xd-wlab')?.textContent||'',warm:window.KarlstadDebug.journey().xmas.snapshot().daily?.panel.warm}));
check('T5d nära gömstället: värmemätaren säger VARMT eller GLÖDHETT',warm.warm>=3&&/VARMT|GLÖDHETT/.test(warm.lab),JSON.stringify(warm));
await shot('t05d-varmt');
for(const k of [20,10,4,1.5,0]){await ev(([x,z,k])=>window.__tp(x+k,z,90,-8),[sp.x,sp.z,k]);await wait(500);}
const foundOk=await until(()=>window.KarlstadDebug.journey().xmas.snapshot().dailyFound===true,20);
await wait(800);
const t5e=await ev(()=>{const x=window.KarlstadDebug.journey().xmas;return {found:x.snapshot().dailyFound,daily:x.meta.state.daily,orn:Object.keys(x.meta.state.orn).length,xp:x.meta.state.xp,text:document.body.innerText.match(/DAGENS JULKLAPP![^\n]*\n?[^\n]*/)?.[0]||''};});
check('T5e julklappen hittas: belöning (XP och en prydnad) och dagen är markerad som hittad',foundOk&&t5e.found&&t5e.daily[today]>0&&t5e.xp>t3.xp,JSON.stringify(t5e));
await shot('t05e-hittad');
await wait(5500);
const t5h=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,r=x.hunt.run;return {mode:!!r?.dailyMode,title:r?.title,panel:x.snapshot().daily,open:!document.querySelector('.xd-hud')?.hidden};});
check('T5h efter fyndet: tillbaka i vanlig fri julvandring (tomtarna tappar julklappar igen) och panelen är borta',!t5h.mode&&t5h.title==='FRI JULVANDRING'&&!t5h.open,JSON.stringify(t5h));
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(900);
const t5f=await ev(()=>({btn:document.getElementById('xmasDaily').textContent.trim(),found:document.getElementById('xmasDaily').classList.contains('found'),note:document.getElementById('xmasDailyNote').textContent}));
check('T5f menyn: DAGENS JULKLAPP HITTAD ✓ och när nästa göms',/HITTAD ✓/.test(t5f.btn)&&t5f.found&&/En ny julklapp göms om/.test(t5f.note),JSON.stringify(t5f));
await click('xmasDaily');await wait(2400);
const t5g=await ev(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return {mode:s.mode,daily:s.daily};});
check('T5g en andra gång samma dag blir fri julvandring (ingen andra belöning)',t5g.mode==='cozy'&&t5g.daily===null,JSON.stringify(t5g));
await shot('t05g-meny');

// ── T6: ljuset i pausmenyn ──────────────────────────────────────────────────────────────────────────────────────────
const l0=await ev(()=>({btn:document.getElementById('xmasLightBtn')?.textContent,light:window.KarlstadDebug.journey().xmas.snapshot().light}));
await click('xmasLightBtn');await wait(300);await click('xmasLightBtn');await wait(400); // två steg: sidan laddades med ?ljus=dag, så det första steget (efter klockan → dag) ändrar inte ljuset
const l1=await ev(()=>({btn:document.getElementById('xmasLightBtn')?.textContent,light:window.KarlstadDebug.journey().xmas.snapshot().light,saved:JSON.parse(localStorage.getItem('karlstad-xmas:save:1')).opts.light}));
check('T6 pausmenyns LJUS-knapp byter läge, ljuset följer med och valet sparas',/^LJUS: /.test(l0.btn||'')&&l1.btn!==l0.btn&&l1.light.mode===l1.saved&&l1.light.mode!==l0.light.mode,JSON.stringify({l0:l0.btn,m0:l0.light.mode,l1:l1.btn,m1:l1.light.mode,saved:l1.saved}));

check('T9 inga fel i sidan',errs.length===0,errs.slice(0,4).join(' | '));
console.log(failed?`\n${failed} kontroll(er) FEL`:'\nAlla kontroller OK');
await browser.close();server.close();
process.exit(failed?1:0);
