#!/usr/bin/env node
// Verifiering i riktig webbläsare av bytet mellan grundspelet och julversionen, i samma flik (ingen iframe, ingen andra spelmotor):
//   grundspelet (med julknappen) → JULKLAPPSJAKTEN 🎁 → julversionen → ← Tillbaka till Karlstad-spelet → grundspelet, med grundspelets sparade framsteg kvar.
// Kräver två lokala servrar: julversionen (den här grenen) och grundspelet med julknappen (grenen feature/julknapp-grundspelet, t.ex. i en git worktree).
//
//   python3 -m http.server 8902            (i playcanvas-karlstad-2.11 på release/jul-2026)
//   git worktree add ../julknapp-wt feature/julknapp-grundspelet
//   (cd ../julknapp-wt/playcanvas-karlstad-2.11 && python3 -m http.server 8903)
//   node tools/xmas-flow/switch.mjs
//
// Env: PLAYWRIGHT, PLAYCANVAS, CHROME (som i flow.mjs)  XMAS_PORT=8902  BASE_PORT=8903  VIEW=414x896m  SHOTS=katalog
// Julknappen är avstängd i grundspelets kod tills en verifierad adress är inkopplad. På localhost med ?debug går den att prova med
// ?julknapp=<adress> (bara http://localhost…), och julversionens tillbaka-knapp styrs med ?base=<adress> på samma villkor.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const XP=process.env.XMAS_PORT||8902,BP=process.env.BASE_PORT||8903,SHOTS=process.env.SHOTS||'';
const V=(process.env.VIEW||'414x896m').match(/(\d+)x(\d+)(m?)/);
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},...(V[3]?{hasTouch:true,isMobile:true,deviceScaleFactor:1}:{})});
const page=await ctx.newPage();const errs=[];
page.on('pageerror',e=>errs.push(e.message));
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
let failed=0;const check=(name,ok,detail='')=>{if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};
const wait=ms=>page.waitForTimeout(ms),ev=(fn,a)=>page.evaluate(fn,a);
const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+'.png')});}};
const ready=async()=>{await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await wait(600);};
const base=`http://localhost:${BP}/?debug`,xmas=`http://localhost:${XP}/`;

// 1) Grundspelet utan inkopplad adress: knappen är dold.
await page.goto(`http://localhost:${BP}/`);await ready();
const v0=await ev(()=>window.KarlstadRound.version);
check('S1 knappen är dold i grundspelet när ingen verifierad adress är inkopplad',await ev(()=>document.getElementById('cityXmas').hidden===true),'grundspelets version '+v0);
// 2) Med lokal provadress: knappen syns bredvid TempoRush.
await page.goto(`http://localhost:${BP}/?debug&julknapp=${encodeURIComponent(`${xmas}?debug&base=${encodeURIComponent(base)}`)}`);await ready();
const pos=await ev(()=>{const t=document.getElementById('cityTempo').getBoundingClientRect(),b=document.getElementById('cityXmas');const r=b.getBoundingClientRect();return {hidden:b.hidden,under:r.top>=t.bottom-1,h:Math.round(r.height),text:b.textContent.trim()};});
check('S2 knappen JULKLAPPSJAKTEN syns direkt under TempoRush och är minst 48 px hög',!pos.hidden&&pos.under&&pos.h>=48,JSON.stringify(pos));
// Något sparat i grundspelet ska finnas kvar när man varit i julversionen och kommer tillbaka.
await ev(()=>{localStorage.setItem('karlstad:probe:base','kvar');});
await ev(()=>document.getElementById('cityXmas').scrollIntoView());await shot('switch-1-grundspelet');
// 3) Knappen öppnar julversionen i samma flik.
await Promise.all([page.waitForURL(new RegExp('localhost:'+XP)),ev(()=>document.getElementById('cityXmas').click())]);
check('S3 knappen öppnar julversionen i samma flik (ingen ny flik, ingen iframe)',ctx.pages().length===1&&page.url().includes('localhost:'+XP));
await ready();
const x=await ev(()=>({title:document.title,version:window.KarlstadRound.version,probe:localStorage.getItem('karlstad:probe:base'),frames:document.querySelectorAll('iframe').length}));
check('S4 julversionen startar med sin egen titel och version',/Julklappsjakten/.test(x.title)&&/-xmas\./.test(x.version),x.title+' · '+x.version);
check('S5 julversionen läser inte grundspelets sparfiler (annan adress, eget lager)',x.probe===null);
await shot('switch-2-julversionen');
// 4) Tillbaka-knappen leder till grundspelet.
await Promise.all([page.waitForURL(new RegExp('localhost:'+BP)),ev(()=>document.getElementById('xmasBack').click())]);
await ready();
const b=await ev(()=>({title:document.title,probe:localStorage.getItem('karlstad:probe:base'),version:window.KarlstadRound.version}));
check('S6 Tillbaka till Karlstad-spelet leder till grundspelet i samma flik',!/Julklappsjakten/.test(b.title)&&b.version===v0&&ctx.pages().length===1,b.title+' · '+b.version);
check('S7 grundspelets sparade framsteg finns kvar efter besöket',b.probe==='kvar');
check('S8 inga oväntade fel',errs.length===0,errs.slice(0,3).join(' | '));
await browser.close();
process.exit(failed?1:0);
