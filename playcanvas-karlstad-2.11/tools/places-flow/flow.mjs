#!/usr/bin/env node
// Verifiering i riktig webbläsare av butiksuppdragen (2.21): Cervera "Duka för fikastunden" och Pressbyrån "Fika på minuten".
// Startar det riktiga spelet i headless Chromium, flyttar spelaren dit, trycker på kontextknappen och klickar på gränssnittet,
// och kontrollerar att spelet svarar rätt. Avslutar med kod 1 om något avviker. Sparar skärmbilder om SHOTS=katalog anges.
//
//   npm i playcanvas@2.22.4 playwright     (CDN:en är blockerad i vissa sandlådor; den lokala kopian routas in)
//   python3 -m http.server 8902            (i spelkatalogen)
//   node tools/places-flow/flow.mjs
//
// Env: PLAYWRIGHT=/väg/till/playwright/index.mjs  PLAYCANVAS=/väg/till/playcanvas.mjs  CHROME=/väg/till/chromium  PORT=8902
//      VIEW=1000x640 (eller 414x896m för mobil med tryckskärm)  SHOTS=katalog
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om bildfrekvens eller känsla på en riktig telefon.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const PORT=process.env.PORT||8902,SHOTS=process.env.SHOTS||'';
const V=(process.env.VIEW||'1000x640').match(/(\d+)x(\d+)(m?)/);
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},...(V[3]?{hasTouch:true,isMobile:true,deviceScaleFactor:1}:{})});
const page=await ctx.newPage();const errs=[];
page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,200));});
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
await page.route(/\/app\.js/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__blocked=blocked;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};app.on('update',update);")}));
const results=[];let failed=0;
const check=(name,ok,detail='')=>{results.push([ok?'OK  ':'FEL ',name,detail]);if(!ok)failed++;};
const wait=ms=>page.waitForTimeout(ms),ev=(fn,a)=>page.evaluate(fn,a);
const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+'.png')});}};
const tp=async(x,z,h,t=-4)=>{await ev(([x,z,h,t])=>window.__tp(x,z,h,t),[x,z,h,t]);await wait(1300);};
const S=()=>ev(()=>{const d=window.KarlstadDebug,pl=d.places(),r=pl.run;return {run:r?{place:r.placeId,phase:r.phase,found:r.found,step:r.step,left:r.left}:null,stamps:pl.stampCount(),btn:document.getElementById('useBtn').textContent,hud:!document.getElementById('placeHud').hidden,result:!document.getElementById('placeResult').hidden,balance:d.journey().balance};});
const use=async()=>{await ev(()=>window.KarlstadDebug.use());await wait(900);};
const click=sel=>ev(s=>document.querySelector(s)?.click(),sel);
const yawTo=(a,b)=>(Math.atan2(-(b.x-a.x),-(b.z-a.z))*180/Math.PI+360)%360;

await page.goto(`http://localhost:${PORT}/?debug`);await wait(4000);
await page.locator('#cityClean').first().click();await wait(3500);
const avail=await ev(()=>window.KarlstadDebug.places().available());check('platsuppdrag är tillgängliga i Clean City Explore',avail===true);

// ── Cervera ──────────────────────────────────────────────────────────────────────────────────────────────────────
const cerv=await ev(()=>{const p=window.KarlstadDebug.places().get('cervera');return {talk:p.talk,items:p.activity.items.map(i=>({id:i.id,x:i.x,z:i.z}))};});
await tp(cerv.talk.x,cerv.talk.z-1.8,180);let s=await S();
check('Cervera: kontextknappen säger HJÄLP RUT vid disken',s.btn==='HJÄLP RUT',s.btn);await shot('cervera-1-prompt');
check('Cervera: inget startar av sig självt',s.run===null);
await use();s=await S();check('Cervera: uppdraget startar frivilligt med knappen',s.run?.phase==='run'&&s.hud,JSON.stringify(s.run));await shot('cervera-2-start');
for(const it of cerv.items){await tp(it.x,it.z+(it.id==='kanna'?1.6:.4),180,-6);if(it.id==='fat')await shot('cervera-3-sista-foremalet');}
s=await S();check('Cervera: alla tre föremål kan plockas upp',s.run?.found===3&&s.run?.phase==='deliver',JSON.stringify(s.run));
check('Cervera: ingen belöning före avlämning',s.stamps===0);
await tp(cerv.talk.x,cerv.talk.z,180);s=await S();check('Cervera: knappen säger LÄMNA PÅ DISKEN',s.btn==='LÄMNA PÅ DISKEN',s.btn);
const bal0=s.balance;await use();s=await S();
check('Cervera: stämpel och resultatkort efter avlämning',s.stamps===1&&s.run===null&&s.result);await shot('cervera-4-resultat');
await use();await use();await use();const again=await S();
check('Cervera: poängen betalas en gång trots upprepade tryck',again.balance-bal0===150,'+'+(again.balance-bal0));
check('Cervera: E stänger resultatkortet och startar inget nytt uppdrag direkt',!again.result&&again.run===null,JSON.stringify(again.run));

// ── Pressbyrån ───────────────────────────────────────────────────────────────────────────────────────────────────
const press=await ev(()=>window.KarlstadDebug.places().get('pressbyran').talk);
await tp(press.x,press.z+1.8,0,-8);await shot('pressbyran-1-serviceyta');s=await S();
check('Pressbyrån: kontextknappen säger TA EMOT ORDER',s.btn==='TA EMOT ORDER',s.btn);
await use();s=await S();check('Pressbyrån: beställningen startar med tid',s.run?.phase==='serve'&&s.run.left>30,JSON.stringify(s.run));
// Replikrutan (personalens första rad) ska ligga helt ovanför beställningsremsan, aldrig bakom den. Mäts före skärmbilden (rutan visas 4,5 s).
const toastGap=await ev(()=>{const t=document.getElementById('roundToast'),h=document.getElementById('placeHud');if(!t||!h||h.hidden)return null;const a=t.getBoundingClientRect(),b=h.getBoundingClientRect();return {shown:t.classList.contains('visible'),gap:Math.round(b.top-a.bottom)};});
check('Pressbyrån: replikrutan ligger ovanför beställningsremsan',!!toastGap&&toastGap.shown&&toastGap.gap>=0,JSON.stringify(toastGap));
await shot('pressbyran-2-bestallning');
const order=await ev(()=>({o:window.KarlstadDebug.places().run.order.items,m:window.KarlstadDebug.places().run.menu.map(m=>m.id)}));
const wrong=order.m.findIndex(id=>!order.o.includes(id));await click(`.ph-btn:nth-child(${wrong+1})`);await wait(300);
s=await S();check('Pressbyrån: fel sak kostar tid men ordern lever',s.run?.step===0&&s.run.left<37,JSON.stringify(s.run));
// pausa och fortsätt
const before=s.run.left;await click('#roundPause');await wait(2200);const paused=await S();
check('Pressbyrån: tiden står still under paus',Math.abs(paused.run.left-before)<.6,before+' → '+paused.run.left);
await click('#roundResume');await wait(1200);s=await S();check('Pressbyrån: remsan är tillbaka efter paus och tiden går',s.hud&&s.run.left<paused.run.left,JSON.stringify(s.run));
await page.keyboard.press('Digit'+(order.m.indexOf(order.o[0])+1));await wait(500);
await click(`.ph-btn:nth-child(${order.m.indexOf(order.o[1])+1})`);await wait(500);
await click(`.ph-btn:nth-child(${order.m.indexOf(order.o[2])+1})`);await wait(900);s=await S();
check('Pressbyrån: rätt saker i rätt ordning ger stämpel',s.stamps===2&&s.run===null&&s.result);await shot('pressbyran-3-resultat');await click('.pr-close');
// misslyckande och snabb omstart
for(let i=0;i<80&&(await S()).btn!=='TA EMOT ORDER';i++)await wait(500);
await use();await ev(()=>{window.KarlstadDebug.places().run.left=.5;});await wait(2500);s=await S();
check('Pressbyrån: tiden går ut och ger tydligt misslyckande',s.run?.phase==='failed');await shot('pressbyran-4-misslyckad');
await click('.ph-again');await wait(600);s=await S();check('Pressbyrån: snabb omstart direkt',s.run?.phase==='serve'&&s.run.left>38);
await click('.ph-x');await wait(500);s=await S();check('Pressbyrån: man kan lämna aktiviteten direkt',s.run===null&&!s.hud);

// ── Karlstadpasset och sparande ───────────────────────────────────────────────────────────────────────────────────
const pass0=await ev(()=>window.KarlstadDebug.places().pass().map(r=>[r.id,r.stamped,r.completed]));
await page.reload();await wait(4500);await page.locator('#cityClean').first().click();await wait(3500);
const pass1=await ev(()=>window.KarlstadDebug.places().pass().map(r=>[r.id,r.stamped,r.completed]));
check('Stämplarna finns kvar efter omladdning',JSON.stringify(pass0)===JSON.stringify(pass1)&&pass1.every(r=>r[1]),JSON.stringify(pass1));
await click('#roundPause');await wait(800);await ev(()=>document.getElementById('placePass')?.scrollIntoView({block:'center'}));await wait(300);await shot('karlstadpasset');
check('Karlstadpasset visas i pausmenyn',await ev(()=>!!document.querySelector('#placePass .pass-row.stamped')));
const passText=await ev(()=>[...document.querySelectorAll('#placePass .pass-status')].map(e=>e.textContent));
check('Karlstadpasset: "1 digitalt besök" i singular, aldrig "1 digitala"',passText.length===2&&passText.every(t=>/ 1 digitalt besök$/.test(t)),JSON.stringify(passText));
const fit=await ev(()=>{const box=document.querySelector('#placePass .pass-local');if(!box||box.hidden)return null;const R=box.getBoundingClientRect(),cells=[...box.querySelectorAll('.pl-cell')];
  return {cells:cells.length,utanför:cells.filter(c=>{const b=c.getBoundingClientRect();return b.right>R.right+1||b.left<R.left-1;}).length,sidled:box.scrollWidth-box.clientWidth};});
check('Karlstadpasset: den lokala mätningen ryms i bredd (inget klipps)',!!fit&&fit.cells===10&&fit.utanför===0&&fit.sidled<=1,JSON.stringify(fit));
for(const [row,label,btn] of [[2,'Pressbyrån','TA EMOT ORDER'],[1,'Cervera','HJÄLP RUT']]){
  await click(`#placePass .pass-row:nth-child(${row}) .pass-tp`);await wait(1800);s=await S();
  const open=await ev(()=>document.body.classList.contains('round-panel-open'));
  check('Karlstadpasset: GÅ DIT tar spelaren till '+label+' med knappen redo',!open&&s.btn===btn,s.btn);if(row===2)await shot('pass-ga-dit-pressbyran');
  if(row===2){await click('#roundPause');await wait(900);}
}

// ── Övriga lägen lämnas ifred ───────────────────────────────────────────────────────────────────────────────────
for(const [btn,name,expectLegacy] of [['#cityTempo','Temporush',false],['#cityStart','zombiejakten',true]]){
  await page.reload();await wait(4500);await page.locator(btn).first().click();await wait(3500);
  await tp(cerv.talk.x,cerv.talk.z,180);
  const m=await ev(()=>{const d=window.KarlstadDebug,j=d.journey();return {avail:d.places().available(),prompt:d.places().prompt({x:-144,z:129.8,y:1.68}),hud:!document.getElementById('placeHud').hidden,clerk:j.clerks.prompt({x:-144,z:129.8,y:1.68})};});
  check(name+': inga platsuppdrag och ingen remsa',m.avail===false&&m.prompt===null&&m.hud===false,JSON.stringify(m));
  check(name+': personalen '+(expectLegacy?'har kvar sitt hjälpuppdrag':'pratar bara'),expectLegacy?m.clerk==='HJÄLP':m.clerk==='PRATA',m.clerk);
}
check('inga fel i webbläsarens konsol',errs.length===0,errs.slice(0,3).join(' | '));
for(const r of results)console.log(r.join(' '));
console.log(`\n${results.length-failed} av ${results.length} kontroller klara`+(SHOTS?` · skärmbilder i ${SHOTS}`:''));
await browser.close();process.exit(failed?1:0);
