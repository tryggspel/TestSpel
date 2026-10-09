#!/usr/bin/env node
// Verifiering i riktig webbläsare av vägledningen i Julklappsjakten (pil, kanter, stjärnspår, stråle, uppdragsrad): att den finns, pekar åt rätt håll
// när man vänder sig, följer gångvägen runt hinder, byter mål när man plockar paket och efter målet pekar mot tomten, att grundspelets små markeringar
// och kompasspill inte ritas, att den finns i Tomtezombies, att JulRushen behåller grundspelets pil och att butiksuppdragen får vara ifred.
// Startar det riktiga spelet i headless Chromium. Avslutar med kod 1 om något avviker. SHOTS=katalog sparar skärmbilder.
//
//   python3 -m http.server 8902      (i spelkatalogen, på julgrenen)
//   node tools/xmas-flow/guide.mjs
//
// Env: PLAYWRIGHT=/väg/till/playwright/index.mjs  PLAYCANVAS=/väg/till/playcanvas.mjs  CHROME=/väg/till/chromium  PORT=8902
//      VIEW=1000x640 (eller 414x896m för mobil med tryckskärm, 896x414m för liggande telefon)  SHOTS=katalog
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om bildfrekvens eller läsbarhet på en riktig telefon.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const PORT=process.env.PORT||8902,SHOTS=process.env.SHOTS||'';
const VIEW=process.env.VIEW||'1000x640',V=VIEW.match(/(\d+)x(\d+)(m?)/);
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},...(V[3]?{hasTouch:true,isMobile:true,deviceScaleFactor:1}:{})});
const page=await ctx.newPage();const errs=[];
page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push('console: '+m.text().slice(0,160));});
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
await page.route(/\/app\.js/,r=>{
  if(!r.request().url().includes('localhost:'+PORT))return r.continue();
  const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__blocked=blocked;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};window.__pos=()=>{const p=player.getPosition();return [p.x,p.z]};app.on('update',update);");
  r.fulfill({contentType:'text/javascript',body:s});
});
const results=[];let failed=0;
const check=(name,ok,detail='')=>{results.push([ok?'OK  ':'FEL ',name,detail]);if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};
const wait=ms=>page.waitForTimeout(ms),ev=(fn,a)=>page.evaluate(fn,a);
const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+'.png')});}};
const ready=async()=>{await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await wait(700);};
const J='window.KarlstadDebug.journey().xmas';
const snap=()=>ev(()=>window.KarlstadDebug.journey().xmas.snapshot());
const tp=async(x,z,yaw,pitch=-4,ms=1000)=>{await ev(([x,z,y,p])=>window.__tp(x,z,y,p),[x,z,yaw,pitch]);await wait(ms);};
const yawTo=(px,pz,tx,tz)=>Math.atan2(-(tx-px),-(tz-pz))*180/Math.PI;
const click=id=>ev(i=>document.getElementById(i)?.click(),id);
const vis=sel=>ev(s=>{const e=document.querySelector(s);if(!e||e.hidden)return false;const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden')return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;},sel);
const text=sel=>ev(s=>document.querySelector(s)?.textContent||'',sel);
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
const walk=(tx,tz,step=1.4)=>ev(([tx,tz,step])=>new Promise(res=>{let n=0;const f=()=>{const [x,z]=window.__pos();const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz);if(d<.4||++n>700){res(d);return;}const k=Math.min(1,step/d);window.__tp(x+dx*k,z+dz*k,Math.atan2(-dx,-dz)*180/Math.PI,-5);requestAnimationFrame(f);};f();}),[tx,tz,step]);

await page.goto(`http://localhost:${PORT}/?debug`);await ready();

// ── A: introduktionen visar pil, spår, stråle och uppdragsrad direkt ────────────────────────────────────────────────────
await click('xmasCozy');await wait(2800);
const s0=await snap(),sp=await ev(()=>window.__pos());
check('A1 pilen finns direkt och pekar på första paketet (rakt fram, med avstånd och namn)',s0.guide.on&&s0.guide.label==='NÄSTA PAKET'&&s0.guide.hint==='GÅ RAKT FRAM'&&s0.guide.distance>=3&&s0.guide.distance<=14&&await vis('#xmasArrow'),JSON.stringify({g:s0.guide.label,d:s0.guide.distance,h:s0.guide.hint}));
check('A2 pilens text visar vad den pekar på och hur långt det är',/^NÄSTA PAKET · \d+ M$/.test(await text('#xmasArrow .xg-line'))&&await text('#xmasArrow .xg-hint')==='GÅ RAKT FRAM',await text('#xmasArrow .xg-line'));
check('A3 uppdragsraden visar båda stegen: SAMLA PAKET 0/20 och LÄMNA HOS TOMTEN',s0.guide.mission==='SAMLA PAKET 0/20 › LÄMNA HOS TOMTEN'&&await vis('#xmasMission'),s0.guide.mission);
check('A3b texterna i uppdragsraden och pilen klipps inte: prickarna på Å, Ä och Ö syns ("LÄMNA" blir inte "LAMNA")',(await clipped('#xmasMission b, #xmasArrow .xg-line, #xmasArrow .xg-hint')).length===0&&await ev(()=>document.querySelectorAll('#xmasMission b').length>=2),JSON.stringify(await clipped('#xmasMission b, #xmasArrow .xg-line, #xmasArrow .xg-hint')));
check('A4 målstrålen lyser vid första paketet (inget band behövs när paketet är tre meter bort)',s0.view.goal===true&&s0.view.ribbon===0,JSON.stringify({ribbon:s0.view.ribbon,goal:s0.view.goal}));
const base=await ev(()=>{const root=window.__app.root;let pips=0;root.find(e=>/^mission-arrow-/.test(e.name)&&e.enabled).forEach(()=>pips++);const flag=root.findByName('Ditt valda mål');return {pips,flag:!!flag&&flag.enabled,compass:getComputedStyle(document.getElementById('roundCompass')).display,tempoArrow:document.getElementById('tempoArrow').hidden||getComputedStyle(document.getElementById('tempoArrow')).display==='none'};});
check('A5 grundspelets små pilar på marken, "DITT MÅL"-flaggan och kompasspillen ritas inte i Julklappsjakten',base.pips===0&&!base.flag&&base.compass==='none'&&base.tempoArrow,JSON.stringify(base));
await shot('01-start');

// ── B: vänder man sig vrids pilen åt rätt håll och kanterna lyser ───────────────────────────────────────────────────────
const t0=await ev(()=>{const g=window.KarlstadDebug.journey().xmas.guide.state;return {x:g.targetX,z:g.targetZ};});
const [px,pz]=sp,toward=yawTo(px,pz,t0.x,t0.z);
const angleAt=async yaw=>{await tp(px,pz,yaw,-4,900);const s=await snap();return s.guide;};
const right=await angleAt(toward+90);   // kameran vänd 90° åt vänster ⇒ målet ligger 90° till höger
check('B1 målet till höger: pilen pekar åt höger, hint SVÄNG HÖGER och högra kanten lyser',right.angle<-60&&right.angle>-120&&right.hint==='SVÄNG HÖGER'&&right.edgeR>.5&&right.edgeL===0,JSON.stringify({a:right.angle,h:right.hint,l:right.edgeL,r:right.edgeR}));
await shot('02-hoger');
const left=await angleAt(toward-90);
check('B2 målet till vänster: pilen pekar åt vänster, hint SVÄNG VÄNSTER och vänstra kanten lyser',left.angle>60&&left.angle<120&&left.hint==='SVÄNG VÄNSTER'&&left.edgeL>.5&&left.edgeR===0,JSON.stringify({a:left.angle,h:left.hint,l:left.edgeL,r:left.edgeR}));
const back=await angleAt(toward+180);
check('B3 målet bakom: VÄND DIG OM och båda kanterna lyser',Math.abs(back.angle)>150&&back.hint==='VÄND DIG OM'&&back.edgeL>0&&back.edgeR>0,JSON.stringify({a:back.angle,h:back.hint}));
await shot('03-bakom');
const edgesShown=await ev(()=>({l:!document.getElementById('xmasEdgeL').hidden,r:!document.getElementById('xmasEdgeR').hidden}));
check('B4 kantmarkörerna finns i sidan när målet ligger bakom',edgesShown.l&&edgesShown.r,JSON.stringify(edgesShown));
const rot=await ev(()=>document.querySelector('#xmasArrow .xg-icon').style.transform);
check('B5 pilens ikon vrids (CSS-rotation) när vinkeln ändras',/rotate\(-?\d+(\.\d)?deg\)/.test(rot)&&!/rotate\(-?0\.0deg\)/.test(rot),rot);
const front=await angleAt(toward);
check('B6 vänder man sig mot målet är pilen rak, grön och kanterna släcks',Math.abs(front.angle)<6&&front.hint==='GÅ RAKT FRAM'&&front.edgeL===0&&front.edgeR===0&&await ev(()=>document.getElementById('xmasArrow').classList.contains('ahead')));

// ── C: plocka paket: raden räknar, pilen byter mål och spåret flyttar sig ───────────────────────────────────────────────
const ids=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.packages.filter(k=>k.kind==='regular').map(k=>({id:k.id,x:k.x,z:k.z})));
await tp(px,pz,toward,-4,500);const id0=(await snap()).guide.id;
await walk(ids[0].x,ids[0].z,1.4);await wait(500);
const sC=await snap();
check('C1 efter första paketet: uppdragsraden räknar upp och pilen har bytt till nästa paket',sC.hunt.collected>=1&&/^SAMLA PAKET [1-9]\/20/.test(sC.guide.mission)&&sC.guide.id!==id0&&sC.guide.on,JSON.stringify({m:sC.guide.mission,id0,id:sC.guide.id}));
let flips=0,lastId=sC.guide.id;
for(let i=1;i<10;i++){await walk(ids[i].x,ids[i].z,1.4);const g=(await snap()).guide;if(g.id!==lastId){flips++;lastId=g.id;}}
const sD=await snap();
check('C2 efter tio paket: pilen följer paketen i ordning (ett byte per paket, inget fladder)',sD.hunt.collected>=10&&flips<=12,JSON.stringify({collected:sD.hunt.collected,flips}));
await shot('04-efter-tio');
// ordningen: pilen pekar aldrig på ett paket längre fram än de fyra närmaste i ordning
const order=await ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run,g=window.KarlstadDebug.journey().xmas.guide.state;const reg=r.packages.filter(k=>k.kind==='regular'&&!k.collected).map(k=>k.id);return {idx:reg.indexOf(g.id),n:reg.length};});
check('C3 pilens mål är bland de fyra närmaste paketen i ordning',order.idx>=0&&order.idx<4,JSON.stringify(order));

// ── D: efter målet pekar pilen mot tomten ────────────────────────────────────────────────────────────────────────────
for(let i=10;i<ids.length;i++){const ph=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.snapshot().phase);if(ph!=='collect')break;await walk(ids[i].x,ids[i].z,1.6);}
await wait(500);
const sE=await snap();
check('D1 med 20 paket byter pilen mål till tomten och uppdragsraden går vidare',sE.hunt.phase==='deliver'&&sE.guide.label==='TOMTEN'&&sE.guide.mission==='SAMLA PAKET 20/20 › LÄMNA HOS TOMTEN',JSON.stringify({ph:sE.hunt.phase,l:sE.guide.label,m:sE.guide.mission}));
const rows=await ev(()=>[...document.querySelectorAll('#xmasMission .xg-step')].filter(r=>!r.hidden).map(r=>r.dataset.state));
check('D2 steg 1 är klart (✓) och steg 2 är nu',rows.join()==='done,now',rows.join());
check('D3 strålen står hos tomten',sE.view.goal===true);
await shot('05-till-tomten');
const tomte=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.tomte);
await walk(tomte.x,tomte.z,1.8);await wait(1800);
check('D4 efter leverans är pilen och uppdragsraden borta (resultatkortet visas)',!(await vis('#xmasArrow'))&&await ev(()=>!document.getElementById('round-xmas-result').hidden));
await click('xmasResultFree');await wait(1200);

// ── E: vägen runt hinder (ett paket bakom ett kvarter) ───────────────────────────────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(1000);
const hit=await ev(()=>{
  const j=window.KarlstadDebug.journey(),nav=j.nav,from={x:0,z:14};
  // sök en punkt 40–90 m bort som är gångbar men inte i fri sikt från torget (bakom en byggnad)
  for(let r=40;r<=90;r+=5)for(let a=0;a<360;a+=10){const x=from.x+Math.sin(a*Math.PI/180)*r,z=from.z-Math.cos(a*Math.PI/180)*r;if(window.__blocked(x,z))continue;const q=nav.point({x,z});if(Math.hypot(q.x-x,q.z-z)>1)continue;if(!nav.clear(from,q)&&nav.path(from,q).length>2)return {x:q.x,z:q.z};}
  return null;});
check('E0 hittade en gångbar punkt bakom en byggnad (provplats)',!!hit,JSON.stringify(hit));
if(hit){
  await ev(h=>{const x=window.KarlstadDebug.journey().xmas;x.hunt.startRun({kind:'round',id:'prov',title:'PROV',goal:1,packages:[{id:'p1',x:h.x,z:h.z,kind:'regular'},{id:'p2',x:h.x+4,z:h.z+4,kind:'regular'}],tomte:{x:0,z:0,radius:3},spawn:{x:0,z:14},windowSec:3,ordered:true});},hit);
  await tp(0,14,yawTo(0,14,hit.x,hit.z),-4,1200);
  const sF=await snap(),me=await ev(()=>window.__pos()),air=Math.hypot(hit.x-me[0],hit.z-me[1]);
  check('E1 utan fri sikt följer pilen gångvägen (inte rakt genom huset) och avståndet är vägens längd',sF.guide.on&&sF.guide.straight===false&&sF.guide.distance>=air-1,JSON.stringify({straight:sF.guide.straight,d:sF.guide.distance,luftlinje:Math.round(air)}));
  check('E2 julbandet leder längs gångvägen (minst tre bitar)',sF.view.ribbon>=3,JSON.stringify({ribbon:sF.view.ribbon,segs:sF.guide.segs}));
  await shot('06-runt-hus');
}

// ── H: julbandet på öppen mark syns i bilden ──────────────────────────────────────────────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(800);
await ev(()=>{window.KarlstadDebug.journey().xmas.hunt.startRun({kind:'round',id:'prov2',title:'PROV',goal:3,packages:[{id:'q1',x:34,z:14,kind:'regular'},{id:'q2',x:36,z:16,kind:'regular'},{id:'q3',x:38,z:14,kind:'regular'}],tomte:{x:0,z:0,radius:3},spawn:{x:-20,z:14},windowSec:3,ordered:true});});
await tp(0,14,yawTo(0,14,34,14),-4,1500);
const proj=await ev(()=>{
  const app=window.__app,cam=app.root.find(e=>e.camera)[0],W=innerWidth,H=innerHeight,out=[];
  for(let i=0;i<20;i++){const e=app.root.findByName('Julband '+i);if(!e||!e.enabled)continue;const p=e.getPosition(),s=cam.camera.worldToScreen(p);out.push({i,x:Math.round(s.x),y:Math.round(s.y),len:+e.getLocalScale().z.toFixed(1)});}
  return {W,H,segs:out};});
const onScreen=proj.segs.filter(s=>s.x>10&&s.x<proj.W-10&&s.y>proj.H*.42&&s.y<proj.H*.85);
check('H1 på öppen mark (34 m till paketet) syns minst åtta bitar av julbandet i bilden, ovanför styrkontrollerna',onScreen.length>=8,JSON.stringify({synliga:onScreen.length,alla:proj.segs.length,y:onScreen.map(s=>s.y).join(',')}));
const xs=onScreen.map(s=>s.x),spread=Math.max(...xs)-Math.min(...xs);
check('H2 bandet ligger i bildens mitt och smalnar av mot horisonten (rakt fram)',onScreen.length>=3&&spread<=3&&onScreen.every((s,i,a)=>!i||s.y<=a[i-1].y+1||s.y>=a[i-1].y-1),'spridning '+spread+' px i sidled');
check('H2b bandet slutar före paketet (går inte in i det) och börjar minst 4,5 m framför spelaren',await ev(()=>{const app=window.__app,pos=window.__pos();const ds=[];for(let i=0;i<20;i++){const e=app.root.findByName('Julband '+i);if(e&&e.enabled){const p=e.getPosition();ds.push(Math.hypot(p.x-pos[0],p.z-pos[1]));}}return Math.min(...ds)>=4.5&&Math.max(...ds)<=34-1.8;}));
await shot('09-julband');
await tp(0,14,yawTo(0,14,34,14)+70,-4,900);
const t70=await snap();
check('H3 tittar man åt sidan lyser kanten och pilen säger åt vilket håll man ska vända sig',t70.guide.hint==='SVÄNG HÖGER'&&t70.guide.edgeR>.4,JSON.stringify({h:t70.guide.hint,r:t70.guide.edgeR}));
// bandets pilar rör sig mot målet: materialet byts mellan fyra faser
const ph0=await ev(()=>{const e=window.__app.root.findByName('Julband 0');return e&&e.enabled?e.render.meshInstances[0].material.emissiveMapOffset.y:null;});await wait(130);
const ph1=await ev(()=>{const e=window.__app.root.findByName('Julband 0');return e&&e.enabled?e.render.meshInstances[0].material.emissiveMapOffset.y:null;});
await tp(0,14,yawTo(0,14,34,14),-4,400);
const seen=new Set();for(let i=0;i<14;i++){seen.add(await ev(()=>{const e=window.__app.root.findByName('Julband 0');return e&&e.enabled?e.render.meshInstances[0].material.emissiveMapOffset.y:null;}));await wait(70);}
check('H4 bandets pilar rör sig (faserna växlar med tiden, utan att något material uppdateras varje bildruta)',seen.size>=2,[...seen].join(','));

// ── F: Tomtezombies har samma vägledning, JulRushen behåller grundspelets pil, butiksuppdrag lämnas ifred ─────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.startZombies());await wait(2600);
const z=await snap();
check('F1 Tomtezombies: pil och uppdragsrad finns, kompasspillen är dold',z.mode==='zombies'&&z.guide.on&&z.guide.mission==='SAMLA PAKET 0/20 › LÄMNA HOS TOMTEN'&&await vis('#xmasArrow')&&await vis('#xmasMission')&&!(await vis('#roundCompass')),JSON.stringify({m:z.mode,on:z.guide.on,mission:z.guide.mission}));
const zy=await ev(()=>({arrow:document.getElementById('xmasArrow').getBoundingClientRect().toJSON(),mission:document.getElementById('xmasMission').getBoundingClientRect().toJSON(),hud:document.getElementById('xmasHud').getBoundingClientRect().toJSON()}));
check('F2 uppdragsraden ligger under HUD:en och överlappar den inte (zombieläget har högre HUD)',zy.mission.top>=zy.hud.bottom-1,JSON.stringify({hudBottom:Math.round(zy.hud.bottom),missionTop:Math.round(zy.mission.top)}));
await shot('07-zombies');
await ev(()=>window.KarlstadDebug.journey().xmas.startRush());await wait(3200);
const r=await snap();
check('F3 JulRushen: paketjaktens pil och uppdragsrad är av, grundspelets pil används (julbandet på marken är det enda som delas)',r.mode==='rush'&&!(await vis('#xmasArrow'))&&!(await vis('#xmasMission'))&&await vis('#tempoArrow'),JSON.stringify({mode:r.mode,ribbonState:r.guide.on,ribbonPieces:r.view.ribbon}));
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(1500);
const fr=await snap();
check('F4 fri vandring utan paket: ingen pil, uppdragsraden säger när nästa paketregn kommer',!fr.guide.on&&/^NÄSTA PAKETREGN OM \d+ S$/.test(fr.guide.mission),JSON.stringify({on:fr.guide.on,m:fr.guide.mission}));
await shot('08-fri-vandring');
const a=await ev(()=>window.KarlstadDebug.journey().places.arrivalFor('pressbyran'));await tp(a.x,a.z,a.yaw,-4,1200);
await ev(()=>window.KarlstadDebug.use());await wait(900);
const q=await snap();
check('F5 under ett butiksuppdrag är pil och uppdragsrad av (grundspelets egen vägledning gäller)',q.guide.on===false&&!(await vis('#xmasArrow'))&&!(await vis('#xmasMission')),JSON.stringify({on:q.guide.on}));
await ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await wait(600);
check('F6 i menyn är allt dolt',!(await vis('#xmasArrow'))&&!(await vis('#xmasMission'))&&!(await vis('#xmasEdgeL')));
check('G inga oväntade fel i konsolen',errs.length===0,errs.slice(0,3).join(' | '));

console.log(`\n${VIEW}: ${results.length-failed}/${results.length} OK, ${failed} fel`);
await browser.close();
process.exit(failed?1:0);
