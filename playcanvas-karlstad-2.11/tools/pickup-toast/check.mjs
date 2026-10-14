#!/usr/bin/env node
// Verifiering i riktig webbläsare av plockrutan ("+25 KAFFEPOÄNG · +15 SOL") i Stadsjakten (2.21.2): på en telefon, stående och liggande, är den en enrads ping på 26 px högst upp,
// aldrig en hög lila ruta över gatan. Felet i 2.21.1 syntes bara på liggande telefoner bredare än 850 px (iPhone 11 är 896x414): rutan blev 222-248 px hög och låg över siktet.
// Startar det riktiga spelet i headless Chromium vid flera skärmstorlekar, tänder rutan med spelets egna texter (kort och lång), mäter den mot HUD:en och siktet, och tar en
// riktig termos (flyttar spelaren till närmaste) för att se att spelets egen händelse ger samma lilla ruta. Avslutar med kod 1 om något avviker. SHOTS=katalog sparar skärmbilder.
//
//   npm i playcanvas@2.22.4 playwright     (CDN:en är blockerad i vissa sandlådor; den lokala kopian routas in)
//   python3 -m http.server 8902            (i spelkatalogen)
//   node tools/pickup-toast/check.mjs
//
// Env: PLAYWRIGHT=/väg/till/playwright/index.mjs  PLAYCANVAS=/väg/till/playcanvas.mjs  CHROME=/väg/till/chromium  PORT=8902
//      VIEWS=896x414m,414x896m,1280x720 (m = telefon med pekskärm)  MODE=cityFree|cityClean|cityTrail  SHOTS=katalog
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om hur det ser ut eller känns på en riktig telefon.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const PORT=process.env.PORT||8902,SHOTS=process.env.SHOTS||'',MODE=process.env.MODE||'cityFree';
const VIEWS=(process.env.VIEWS||'568x320m,667x375m,812x375m,844x390m,852x393m,896x414m,926x428m,956x440m,375x667m,414x896m,430x932m,1280x720,1024x600').split(',');
const SHORT='+25 KAFFEPOÄNG · +15 SOL',LONG='+60 · KOMBO 3 (×2) · SÄLLSYNT · GÅGATSFIKA! · DUBBLA! · FLYT! · TEMPO ×1.5';
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
let failed=0;
const check=(name,ok,detail='')=>{if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};

// Mäter rutan med en given text: rektangel, stil och vilka synliga, absolut placerade element den överlappar (utom helskärmsbehållare).
// Spelet släcker rutan i varje bildruta när tiden gått ut; för mätningen hålls den tänd med en stilregel (ingen övergång som hinner börja om).
const measure=(page,text)=>page.evaluate(txt=>{
  const el=document.getElementById('journeyPickupToast');
  if(!document.getElementById('pickupHold')){const st=document.createElement('style');st.id='pickupHold';st.textContent='#journeyPickupToast{opacity:1!important;transition:none!important}';document.head.appendChild(st);}
  el.textContent=txt;el.dataset.rarity='common';el.classList.add('visible');
  const box=e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),b:Math.round(r.bottom),r:Math.round(r.right)};};
  const vis=e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0&&!e.closest('[hidden]');};
  const t=box(el),cs=getComputedStyle(el),W=innerWidth,H=innerHeight,over=[];
  for(const e of document.querySelectorAll('body *')){
    if(e===el||e.contains(el)||el.contains(e)||!vis(e))continue;
    const c=getComputedStyle(e);if((c.position!=='absolute'&&c.position!=='fixed')||['CANVAS','SCRIPT','STYLE'].includes(e.tagName))continue;
    const b=box(e);if(b.w>0.8*W&&b.h>0.8*H)continue;
    const ox=Math.max(0,Math.min(t.r,b.r)-Math.max(t.x,b.x)),oy=Math.max(0,Math.min(t.b,b.b)-Math.max(t.y,b.y));
    // Spelets övriga rutor (toast, banderoller) är tillfälliga och egna ämnen; här räknas HUD, sikte, radar och knappar.
    if(ox*oy>0&&!/toast|banner|fanfare|bark/i.test(e.id+' '+e.className))over.push((e.id||e.className||e.tagName)+':'+ox+'x'+oy);
  }
  return {t,W,H,over,display:cs.display,textOverflow:cs.textOverflow,whiteSpace:cs.whiteSpace,top:cs.top,bottom:cs.bottom,scrollW:el.scrollWidth,clientW:el.clientWidth};
},text);

for(const v of VIEWS){
  const m=v.match(/(\d+)x(\d+)(m?)/),phone=!!m[3],tag=v+' '+MODE;
  console.log('\n== '+tag);
  const ctx=await browser.newContext({viewport:{width:+m[1],height:+m[2]},deviceScaleFactor:1,...(phone?{hasTouch:true,isMobile:true}:{})});
  const page=await ctx.newPage();const errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
  await page.goto(`http://127.0.0.1:${PORT}/?debug`);
  await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});
  await page.waitForTimeout(600);
  await page.click('#'+MODE);
  await page.waitForFunction(()=>document.body.classList.contains('journey-playing'),null,{timeout:30000});
  await page.waitForTimeout(800);

  const a=await measure(page,SHORT);
  const tight=a.W<600&&a.W>a.H; // iPhone SE (1) liggande, 568 px: HUD:en tar 240 px och rutan ligger mitt i bild; överlappet fanns redan i 2.21.1 (då större) och mäts bara
  check(tag+' · rutan är en ping, inte en hög ruta',a.t.h<=(phone?28:60),a.t.w+'x'+a.t.h+' px, '+(100*a.t.w*a.t.h/(a.W*a.H)).toFixed(2)+' % av skärmen');
  if(phone){
    check(tag+' · rutan tar högst 3 % av skärmen (felet var 11-12 %)',100*a.t.w*a.t.h/(a.W*a.H)<=3);
    check(tag+' · rutan ligger i övre delen, ovanför siktet',a.t.b<=0.4*a.H,'underkant '+a.t.b+' av '+a.H+' px');
    check(tag+' · en rad, bottom släppt',a.whiteSpace==='nowrap'&&a.display!=='flex',a.display+', '+a.whiteSpace+', top '+a.top+', bottom '+a.bottom);
  }
  const sikte=a.over.filter(o=>/reticle|crosshair/i.test(o));
  check(tag+' · rutan täcker inte siktet',sikte.length===0,sikte.join(' '));
  if(!tight)check(tag+' · rutan täcker ingen HUD, radar eller knapp',a.over.length===0,a.over.join(' '));
  else console.log('NOT  '+tag+' · skärm under 600 px bred (liggande iPhone SE 1): överlapp med HUD:en mäts bara, det fanns redan i 2.21.1: '+(a.over.join(' ')||'inga'));
  if(phone&&!tight)check(tag+' · korta texten klipps inte',a.scrollW<=a.clientW+1,a.scrollW+'/'+a.clientW);
  if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,v.replace(/m$/,'')+'-'+MODE+'-kort.png')});}

  const l=await measure(page,LONG);
  check(tag+' · lång text: fortfarande en ping',l.t.h<=(phone?28:60),l.t.w+'x'+l.t.h+' px');
  check(tag+' · lång text: inom skärmen',l.t.x>=0&&l.t.r<=l.W,'x '+l.t.x+'–'+l.t.r+' av '+l.W);
  if(phone||l.whiteSpace==='nowrap')check(tag+' · lång text: slutar med tre punkter (poängen först syns)',l.whiteSpace==='nowrap'&&l.textOverflow==='ellipsis'&&l.display!=='flex'&&l.scrollW>l.clientW,l.display+', '+l.textOverflow+', '+l.scrollW+'/'+l.clientW);
  else console.log('NOT  '+tag+' · högt dator-fönster: ingen ping, långa texter bryts som förut ('+l.t.w+'x'+l.t.h+' px)');
  if(!tight)check(tag+' · lång text: ingen HUD, radar eller knapp täcks',l.over.length===0,l.over.join(' '));
  if(SHOTS)await page.screenshot({path:path.join(SHOTS,v.replace(/m$/,'')+'-'+MODE+'-lang.png')});

  // Spelets egen händelse: flytta spelaren till närmaste termos och läs rutan som spelet själv tänder (rutan nollställs först så att inget av mätningens text finns kvar).
  await page.evaluate(()=>{const j=window.KarlstadDebug.journey(),p=window.KarlstadDebug.position(),el=document.getElementById('journeyPickupToast');
    const it=j.items.filter(i=>!j.found.has(i.id)).sort((x,y)=>Math.hypot(x.x-p.x,x.z-p.z)-Math.hypot(y.x-p.x,y.z-p.z))[0];
    document.getElementById('pickupHold')?.remove();el.classList.remove('visible');el.textContent='';window.__target=it.id;window.KarlstadDebug.teleport(it.x,it.z);});
  let seen=null;
  for(let i=0;i<80&&!seen;i++){
    await page.waitForTimeout(100);
    seen=await page.evaluate(()=>{const el=document.getElementById('journeyPickupToast');if(!el.classList.contains('visible')||!/KAFFEPOÄNG|^\+\d+/.test(el.textContent)||!window.KarlstadDebug.journey().found.has(window.__target))return null;
      const r=el.getBoundingClientRect();return {text:el.textContent,w:Math.round(r.width),h:Math.round(r.height),y:Math.round(r.top)};});
  }
  check(tag+' · riktig termos: spelet tänder rutan',!!seen,seen?JSON.stringify(seen):'ingen ruta på 8 s');
  if(seen)check(tag+' · riktig termos: rutan är en ping',seen.h<=(phone?28:60),seen.w+'x'+seen.h+' px: "'+seen.text+'"');
  check(tag+' · inga sidfel',errs.length===0,errs.slice(0,2).join(' | '));
  await ctx.close();
}
await browser.close();
console.log('\n'+(failed?failed+' kontroller avvek.':'Alla kontroller OK.'));
process.exit(failed?1:0);
