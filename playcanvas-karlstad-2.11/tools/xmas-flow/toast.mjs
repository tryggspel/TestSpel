#!/usr/bin/env node
// Verifiering i riktig webbläsare av grundspelets plockruta (#journeyPickupToast) i julbygget (2.21.1-xmas.7): i Tomtezombies och JulRushen på en telefon, stående och liggande, är den en enrads ping
// på 26 px högst upp, aldrig en hög lila ruta över gatan. Felet fanns i grundspelet 2.21.1 och därmed i xmas.1–6: den lilla pingen gällde bara skärmar smalare än 850 px, så en liggande telefon bredare
// än så (iPhone 11 är 896x414; 852-956 px är nyare iPhone, Pro Max och Pixel) fick en 222-248 px hög lila ruta mitt i bild. Rutan är dold i Julklappsjakten och fri julvandring (xmas.css), så felet
// syntes bara i Tomtezombies (pansarrutor som PANIKHORD och BAKHÅLL KLARAT) och där grundspelets text visas.
// Startar det riktiga spelet i headless Chromium, startar läget, tänder rutan med spelets egna texter (kort och lång) och mäter den mot HUD:en, uppdragsraden, pilen och siktet.
// Avslutar med kod 1 om något avviker. SHOTS=katalog sparar skärmbilder.
//
//   python3 -m http.server 8902      (i spelkatalogen, på julgrenen)
//   node tools/xmas-flow/toast.mjs
//
// Env som i guide.mjs: PLAYWRIGHT, PLAYCANVAS, CHROME, PORT, SHOTS. VIEWS=896x414m,414x896m,1280x720 (m = telefon med pekskärm), MODES=zombies,cozy,rush,free
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om hur det ser ut eller känns på en riktig telefon.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const PORT=process.env.PORT||8902,SHOTS=process.env.SHOTS||'';
const VIEWS=(process.env.VIEWS||'667x375m,852x393m,896x414m,926x428m,414x896m,1024x600,1280x720').split(',');
const MODES=(process.env.MODES||'zombies,cozy,rush').split(',');
const TEXTS={kort:'+25 KAFFEPOÄNG · +15 SOL',horde:'PANIKHORD · 4 NYA ZOMBIES',lang:'+60 · KOMBO 3 (×2) · SÄLLSYNT · GÅGATSFIKA! · DUBBLA! · FLYT! · TEMPO ×1.5'};
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
let failed=0;
const check=(name,ok,detail='')=>{if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};

// Spelet släcker rutan i varje bildruta när tiden gått ut; för mätningen hålls den tänd med en stilregel (ingen övergång som hinner börja om).
// Rutan mäts även när julbygget döljer den (Julklappsjakten, fri julvandring): där ska den vara osynlig, inte en hög ruta.
const measure=(page,text)=>page.evaluate(txt=>{
  const el=document.getElementById('journeyPickupToast');
  if(!document.getElementById('pickupHold')){const st=document.createElement('style');st.id='pickupHold';st.textContent='#journeyPickupToast{opacity:1!important;transition:none!important}';document.head.appendChild(st);}
  el.textContent=txt;el.dataset.rarity='common';el.classList.add('visible');
  const box=e=>{const r=e.getBoundingClientRect();return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),b:Math.round(r.bottom),r:Math.round(r.right)};};
  const vis=e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return cs.display!=='none'&&cs.visibility!=='hidden'&&r.width>0&&r.height>0&&!e.closest('[hidden]');};
  const cs=getComputedStyle(el),t=box(el),W=innerWidth,H=innerHeight,over=[];
  const shown=cs.display!=='none'&&t.w>0;
  if(shown)for(const e of document.querySelectorAll('body *')){
    if(e===el||e.contains(el)||el.contains(e)||!vis(e))continue;
    const c=getComputedStyle(e);if((c.position!=='absolute'&&c.position!=='fixed')||['CANVAS','SCRIPT','STYLE'].includes(e.tagName))continue;
    const b=box(e);if(b.w>0.8*W&&b.h>0.8*H)continue;
    const ox=Math.max(0,Math.min(t.r,b.r)-Math.max(t.x,b.x)),oy=Math.max(0,Math.min(t.b,b.b)-Math.max(t.y,b.y));
    // Spelets övriga rutor (toast, banderoller) är tillfälliga och egna ämnen; här räknas HUD, uppdragsrad, pil, sikte, radar och knappar.
    if(ox*oy>0&&!/toast|banner|fanfare|bark|snow/i.test(e.id+' '+e.className))over.push((e.id||e.className||e.tagName)+':'+ox+'x'+oy);
  }
  return {shown,t,W,H,over,display:cs.display,textOverflow:cs.textOverflow,whiteSpace:cs.whiteSpace,top:cs.top,bottom:cs.bottom,scrollW:el.scrollWidth,clientW:el.clientWidth,body:document.body.className};
},text);

for(const v of VIEWS){
  const m=v.match(/(\d+)x(\d+)(m?)/),phone=!!m[3];
  const ctx=await browser.newContext({viewport:{width:+m[1],height:+m[2]},deviceScaleFactor:1,...(phone?{hasTouch:true,isMobile:true}:{})});
  const page=await ctx.newPage();const errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
  await page.goto(`http://127.0.0.1:${PORT}/?debug`);
  await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});
  await page.waitForTimeout(700);
  for(const mode of MODES){
    const tag=v+' '+mode;
    console.log('\n== '+tag);
    await page.evaluate(md=>{const x=window.KarlstadDebug.journey().xmas;if(md==='zombies')x.startZombies();else if(md==='rush')x.startRush();else if(md==='free')x.startFree();else x.startIntro?.();},mode);
    await page.waitForTimeout(2800);
    const cozy=mode==='cozy'||mode==='free'||mode==='rush'; // xmas-cozy sitter på alla lägen utom Tomtezombies (även JulRushen)
    const a=await measure(page,TEXTS.kort);
    if(cozy){
      // Julklappsjakten och fri julvandring döljer rutan helt (xmas.css): ingen ruta att mäta, och den får inte ta plats.
      check(tag+' · rutan är dold i Julklappsjakten, fri julvandring och JulRushen',!a.shown,'display '+a.display+', '+a.t.w+'x'+a.t.h+' px');
      continue;
    }
    check(tag+' · rutan är en ping, inte en hög ruta',a.t.h<=(phone?28:60),a.t.w+'x'+a.t.h+' px, '+(100*a.t.w*a.t.h/(a.W*a.H)).toFixed(2)+' % av skärmen, '+a.body.replace(/\s+/g,' ').slice(0,80));
    if(phone){
      check(tag+' · rutan tar högst 3 % av skärmen (felet var 11-12 %)',100*a.t.w*a.t.h/(a.W*a.H)<=3);
      check(tag+' · rutan ligger i övre delen, ovanför siktet',a.t.b<=0.4*a.H,'underkant '+a.t.b+' av '+a.H+' px');
      check(tag+' · en rad, bottom släppt',a.whiteSpace==='nowrap'&&a.display!=='flex',a.display+', '+a.whiteSpace+', top '+a.top+', bottom '+a.bottom);
    }
    const tight=a.W<600&&a.W>a.H;
    const sikte=a.over.filter(o=>/reticle|crosshair/i.test(o));
    check(tag+' · rutan täcker inte siktet',sikte.length===0,sikte.join(' '));
    if(!tight)check(tag+' · rutan täcker ingen HUD, uppdragsrad, pil, radar eller knapp',a.over.length===0,a.over.join(' '));
    else console.log('NOT  '+tag+' · skärm under 600 px bred (liggande iPhone SE 1): överlapp mäts bara: '+(a.over.join(' ')||'inga'));
    if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,v.replace(/m$/,'')+'-'+mode+'-kort.png')});}
    const h=await measure(page,TEXTS.horde);
    check(tag+' · PANIKHORD-texten ryms på en rad',h.t.h<=(phone?28:60)&&h.scrollW<=h.clientW+1,h.t.w+'x'+h.t.h+' px, '+h.scrollW+'/'+h.clientW);
    const l=await measure(page,TEXTS.lang);
    check(tag+' · lång text: en ping inom skärmen som slutar med tre punkter',l.t.h<=(phone?28:60)&&l.t.x>=0&&l.t.r<=l.W&&(!(phone||l.whiteSpace==='nowrap')||(l.whiteSpace==='nowrap'&&l.textOverflow==='ellipsis'&&l.display!=='flex'&&l.scrollW>l.clientW)),l.t.w+'x'+l.t.h+' px, '+l.display+', '+l.textOverflow+', '+l.scrollW+'/'+l.clientW);
    if(!tight)check(tag+' · lång text: ingen HUD, uppdragsrad, pil, radar eller knapp täcks',l.over.length===0,l.over.join(' '));
    if(SHOTS)await page.screenshot({path:path.join(SHOTS,v.replace(/m$/,'')+'-'+mode+'-lang.png')});
    await page.evaluate(()=>{document.getElementById('pickupHold')?.remove();document.getElementById('journeyPickupToast').classList.remove('visible');});
  }
  check(v+' · inga sidfel',errs.length===0,errs.slice(0,2).join(' | '));
  await ctx.close();
}
await browser.close();
console.log('\n'+(failed?failed+' kontroller avvek.':'Alla kontroller OK.'));
process.exit(failed?1:0);
