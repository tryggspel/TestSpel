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

// ── B: introduktionen ────────────────────────────────────────────────────────────────────────────────────────────
await click('xmasCozy');await wait(2600);
const s0=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.snapshot());
check('B1 introduktionen startar med mål 20, 25–35 vanliga paket och 2–3 bonuspaket',s0.goal===20&&s0.total>=25&&s0.total<=35&&s0.bonusTotal>=2&&s0.bonusTotal<=3,JSON.stringify({goal:s0.goal,total:s0.total,bonus:s0.bonusTotal}));
const vis=await ev(()=>window.KarlstadDebug.journey().xmas.view.snapshot());
check('B2 de första paketen syns direkt',vis.shown>=3,'visas '+vis.shown);
const goalTxt=await ev(()=>document.getElementById('xmasGoal').textContent);
check('B3 målet visas som "Hjälp tomten! Samla 20 paket."',goalTxt==='Hjälp tomten! Samla 20 paket.',goalTxt);
await shot('02-intro-start');
const pk=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.packages.map(k=>({id:k.id,x:k.x,z:k.z})));
let n=0;
for(const k of pk){const ph=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.snapshot().phase);if(ph!=='collect')break;await walk(k.x,k.z,1.4);if(++n===6){await wait(90);await shot('03-intro-samlar');}}
const s1=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.snapshot());
check('B4 målet nås och fasen blir leverans',s1.phase==='deliver'&&s1.collected>=20,JSON.stringify({phase:s1.phase,collected:s1.collected}));
const cnt=await ev(()=>document.querySelector('.xh-count').textContent);
check('B5 progress visas som LÄMNA 20/20 eller mer',/\d+\/20/.test(cnt),cnt);
await wait(500);await shot('04-leverans');
const tm=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.tomte);
await walk(tm.x,tm.z,1.8);await wait(2800);
const res=await ev(()=>({panel:!document.getElementById('round-xmas-result').hidden,r:window.KarlstadDebug.journey().xmas.hunt.run?.result,stamps:window.KarlstadDebug.journey().xmas.save.state.stamps}));
check('B6 leverans ger resultatkort, poäng och första julstämpeln',res.panel&&res.r&&res.r.points>=500&&res.r.stamp===true&&!!res.stamps.intro,JSON.stringify({points:res.r?.points,stamp:res.r?.stamp}));
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

// ── D: rundor ────────────────────────────────────────────────────────────────────────────────────────────────────
for(const id of ['round-torget','round-kungsgatan','round-drottninggatan']){
  await ev(id=>window.KarlstadDebug.journey().xmas.startRound(id),id);await wait(2400);
  const s=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.snapshot());
  const hud=await ev(()=>document.querySelector('.xh-time')?.textContent||'');
  check('D '+id+' startar med mål, paket och klocka',s.kind==='round'&&s.goal>=12&&s.total>=s.goal&&/\d:\d\d/.test(hud),JSON.stringify({goal:s.goal,total:s.total,bonus:s.bonusTotal,klocka:hud}));
  if(id==='round-kungsgatan')await shot('07-runda-start');
}
await ev(()=>window.KarlstadDebug.journey().xmas.startRound('round-kungsgatan'));await wait(1500);
const pk2=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.packages.map(k=>({id:k.id,x:k.x,z:k.z})));
n=0;
for(const k of pk2){const ph=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.snapshot().phase);if(ph!=='collect')break;await walk(k.x,k.z,1.5);if(++n===8)await shot('08-runda-igang');}
const tm2=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.tomte);await walk(tm2.x,tm2.z,2.2);await wait(2800);
const r2=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run?.result);
check('D4 Kungsgatans runda går att klara och ger sin stämpel',!!r2&&r2.stampId==='round-kungsgatan'&&r2.stamp===true,JSON.stringify({points:r2?.points,collected:r2?.collected,goal:r2?.goal}));

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

// ── L: fri julvandring: paketen tar inte slut ─────────────────────────────────────────────────────────────────────────────────────────
const until=async(fn,max=60)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await ev(fn))return true;await wait(250);}return false;};
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(800);
const gotRain=await until(()=>window.KarlstadDebug.journey().xmas.hunt.run.rains.length>=1,90);
const rn1=await ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;return {t:+r.t.toFixed(1),rains:r.rains.length,packages:r.packages.filter(k=>!k.collected).length};});
// (Paketen läggs på fria platser: i trånga gator blir det färre än de åtta till tolv som begärs. På stadens karta gav 82 provpunkter i snitt 9,5 vanliga paket och aldrig färre än sex.)
check('L1 fri julvandring: första paketregnet kommer inom åtta sekunder speltid med minst sju paket (sex vanliga och ett bonus)',gotRain&&rn1.t<=8.5&&rn1.packages>=7,JSON.stringify(rn1));
await shot('free-1-regn');
// Plocka allt som finns (teleport till varje paket), fyra varv: när allt är plockat kommer nästa regn inom några sekunder i stället för efter en minut eller mer.
const runT=()=>ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.t),uncollected=()=>ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.packages.filter(k=>!k.collected).map(k=>({x:k.x,z:k.z})));
let worst=0,collected=0;
for(let round=0;round<4;round++){
  for(const k of await uncollected()){await tp(k.x,k.z,0,-4,320);collected++;}
  let left=await uncollected();for(let again=0;again<3&&left.length;again++){for(const k of left){await tp(k.x,k.z,0,-4,320);}left=await uncollected();}
  const t0=await runT();
  const got=await until(()=>window.KarlstadDebug.journey().xmas.hunt.run.packages.some(k=>!k.collected),60);
  worst=Math.max(worst,got?(await runT())-t0:999);
}
check('L2 när paketen tagit slut kommer nästa regn inom elva sekunder speltid (fyra varv, längsta tid utan paket '+worst.toFixed(1)+' s, '+collected+' paket plockade)',worst<=11&&collected>=20,JSON.stringify({worst:+worst.toFixed(1),collected}));
await shot('free-2-nytt-regn');

// ── E: butiksuppdrag ─────────────────────────────────────────────────────────────────────────────────────────────
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(1200);
const a=await ev(()=>window.KarlstadDebug.journey().places.arrivalFor('pressbyran'));await tp(a.x,a.z,a.yaw,-4,1200);
const prompt=await ev(()=>window.KarlstadDebug.journey().places.prompt(window.KarlstadDebug.position()));
check('E1 Pressbyrån erbjuder Tomtarnas fikaorder',!!prompt&&/TOMTARNAS FIKAORDER/.test(prompt.tactic),prompt?.label);
await shot('15-pressbyran');
check('E1b det snöar utomhus vid Pressbyrån',await ev(()=>window.KarlstadDebug.journey().xmas.decor.snapshot().flakes>0));
await ev(()=>window.KarlstadDebug.use());await wait(700);await shot('16-pressbyran-order');
const order=await ev(()=>window.KarlstadDebug.journey().places.run?.order.items);
for(const id of order||[]){await ev(i=>window.KarlstadDebug.journey().places.pick(i),id);await wait(150);}
await wait(1200);await shot('17-pressbyran-klart');
const del=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.snapshot());
check('E2 klar order startar leverans till tomten',del.kind==='delivery'&&del.phase==='deliver',del.kind+':'+del.phase);
// Grundspelets resultatkort ligger kvar i 14 s; en spelare trycker FORTSÄTT (annars stänger första knapptrycket vid nästa plats kortet).
await ev(()=>{const r=document.getElementById('placeResult');if(r&&!r.hidden)r.querySelector('.pr-close').click();});
check('E2b resultatkortet efter Pressbyrån går att stänga med FORTSÄTT',await ev(()=>document.getElementById('placeResult').hidden));
await wait(500);await shot('18-pressbyran-leverans');
const t3=await ev(()=>window.KarlstadDebug.journey().xmas.hunt.run.tomte);await walk(t3.x,t3.z,1.8);await wait(2600);
check('E3 leverans ger stämpeln Tomtarnas fikaorder',await ev(()=>!!window.KarlstadDebug.journey().xmas.save.state.stamps.pressbyran));
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
