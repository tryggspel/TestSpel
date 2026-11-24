#!/usr/bin/env node
// Verifiering i riktig webbläsare av framstegen i julbygget (2.21.1-xmas.11): grad, julgran, dagliga uppdrag, serie, lotter, belöningsraden på slutkortet, gömda julklappar, hemligt paket (?paket=)
// och belöningar för Julkalenderns luckor. Startar det riktiga spelet i headless Chromium och går igenom kedjan som en spelare: första start → första uppdraget → slutkortet → julmenyn → julgranen,
// lotterna och de gömda julklapparna → fri julvandring → alla tjugo gömda platser går att plocka → hemligt paket i länken → en senare dag med klara luckor.
// Själva jakten spelas inte på riktigt (den tar minuter i mjukvarurenderad grafik): målet sätts via ett provhandtag och leveransen sker på riktigt hos tomten.
//
//   node tools/xmas-flow/meta.mjs      (startar en egen filserver för spelmappen)
//
// Env: PLAYWRIGHT=/väg/till/playwright/index.mjs  PLAYCANVAS=/väg/till/playcanvas.mjs  CHROME=/väg/till/chromium  VIEW=414x896m (m = telefon)  SHOTS=katalog
// Det här är en webbläsarkontroll med mjukvarurenderad grafik. Den säger inget om bildfrekvens, känsla eller hur det ser ut på en riktig telefon.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const SHOTS=process.env.SHOTS||'';
const V=(process.env.VIEW||'414x896m').match(/(\d+)x(\d+)(m?)/);
const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.txt':'text/plain'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://x');let p=path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/,'');
  let file=path.join(root,p);if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end('nej');return;}
  res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const ORIGIN=`http://127.0.0.1:${server.address().port}`;
const {HIDDEN_SPOTS}=await import(pathToFileURL(path.join(root,'xmas/xmas-hidden.mjs')).href);
const SAVE_KEY='karlstad-xmas:save:1',META_KEY='karlstad-xmas:meta:1';

const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
let failed=0;
const check=(name,ok,detail='')=>{if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};

// En ny webbläsare per scenario. seed = sparning att börja med; day = datum som klockan ska visa (ISO med tid), annars riktig tid.
async function open({seed=null,day=null,search='?debug'}={}){
  const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},...(V[3]?{hasTouch:true,isMobile:true,deviceScaleFactor:1}:{})});
  await ctx.addInitScript(([seed,day])=>{
    if(day){const off=Date.parse(day)-Date.now(),R=Date;class F extends R{constructor(...a){if(a.length===0)super(R.now()+off);else super(...a);}static now(){return R.now()+off;}}globalThis.Date=F;}
    if(seed&&!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');for(const [k,v] of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));}
  },[seed,day]);
  const page=await ctx.newPage(),errs=[];
  page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200));});
  await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
  await page.route(/\/app\.js/,r=>{
    if(!r.request().url().startsWith(ORIGIN))return r.continue();
    const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__blocked=blocked;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};window.__pos=()=>{const p=player.getPosition();return [p.x,p.z]};app.on('update',update);");
    r.fulfill({contentType:'text/javascript',body:s});
  });
  await page.goto(ORIGIN+'/'+search);
  await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});
  await page.waitForTimeout(900);
  const h={ctx,page,errs,wait:ms=>page.waitForTimeout(ms),ev:(fn,a)=>page.evaluate(fn,a)};
  h.click=id=>h.ev(i=>document.getElementById(i)?.click(),id);
  h.vis=id=>h.ev(i=>{const e=document.getElementById(i);return !!e&&!e.hidden&&getComputedStyle(e).display!=='none';},id);
  h.text=id=>h.ev(i=>document.getElementById(i)?.textContent||'',id);
  h.meta=()=>h.ev(k=>JSON.parse(localStorage.getItem(k)||'null'),META_KEY);
  h.save=()=>h.ev(k=>JSON.parse(localStorage.getItem(k)||'null'),SAVE_KEY);
  h.tp=async(x,z,ms=500)=>{await h.ev(([x,z])=>window.__tp(x,z,0,-4),[x,z]);await h.wait(ms);};
  h.shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+'.png')});}};
  h.until=async(fn,max=30,arg=null)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await page.evaluate(fn,arg))return true;await page.waitForTimeout(250);}return false;};
  // Inget ska rinna ut åt sidan: kortets innehåll får inte vara bredare än kortet.
  h.fits=id=>h.ev(i=>{const e=document.getElementById(i);return !!e&&e.scrollWidth<=e.clientWidth+1;},id);
  return h;
}
const scenario=async(name,fn)=>{console.log('\n== '+name);const t=Date.now();try{await fn();}catch(e){failed++;console.log('FEL  '+name+' kraschade — '+(e&&e.stack||e));}console.log('   ('+Math.round((Date.now()-t)/1000)+' s)');};

// ── Scenario 1: en helt ny spelare ────────────────────────────────────────────────────────────────────────────────────
await scenario('1 · första start och första uppdraget',async()=>{
  const g=await open();
  check('1a startvyn har bara Julklappsjakten: JulRushen och Tomtezombies är dolda före första uppdraget',await g.ev(()=>['xmasRushStart','xmasZombies'].every(id=>document.getElementById(id).hidden)&&!document.getElementById('xmasCozy').hidden));
  check('1b remsan med grad och uppdrag syns inte än, men en rad om priset gör det',await g.ev(()=>document.getElementById('xmasStripStart').hidden&&!document.getElementById('xmasPrizeNote').hidden&&/dragningen om en julgran/.test(document.getElementById('xmasPrizeNote').textContent)));
  await g.shot('1a-start');
  await g.click('xmasCozy');await g.wait(1600);
  check('1c första uppdraget startar (fri sök-och-hitta på Stora Torget)',await g.ev(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return s.mode==='cozy'&&s.hunt.kind==='intro';}));
  // provhandtag: målet nått (14 julklappar, 1 bonus), sedan leverans hos tomten på riktigt
  await g.ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;r.collected=14;r.bonusCollected=1;r.points=480;r.bestChain=5;r.t=118;r.phase='deliver';});
  const tomte=await g.ev(()=>{const t=window.KarlstadDebug.journey().xmas.hunt.run.tomte;return {x:t.x,z:t.z};});
  await g.tp(tomte.x,tomte.z,300);
  check('1d slutkortet visas efter leveransen',await g.until(()=>!document.getElementById('round-xmas-result').hidden,12));
  await g.wait(400);
  const card=await g.ev(()=>{
    const r=document.getElementById('xmasReward');
    return {shown:!!r&&!r.hidden&&r.closest('#round-xmas-result')!==null,xp:r?.querySelector('.xrw-xp')?.textContent,grade:r?.querySelector('.xrw-grade')?.textContent,chips:[...(r?.querySelectorAll('.xrw-chip')||[])].map(c=>c.textContent.replace(/\s+/g,' ')),
      list:[...(r?.querySelectorAll('.xrw-list li')||[])].map(l=>l.textContent),goal:r?.querySelector('.xrw-goal')?.textContent,
      btn:document.getElementById('xmasResultContinue').textContent.replace(/\s+/g,' ').trim(),menu:!document.getElementById('xmasResultMenu').hidden,icons:r?document.querySelectorAll('#xmasReward canvas').length:0};
  });
  check('1e belöningsraden visar XP, grad 2, röd kula och första lotten',card.shown&&/^\+\d+ XP$/.test(card.xp)&&/GRAD 2/.test(card.grade)&&card.chips.some(c=>/Röd kula/.test(c)&&/NY/.test(c))&&card.chips.some(c=>/T-[2-9A-Z]{4}-[2-9A-Z]{4}/.test(c)&&/FÖRSTA UPPDRAGET/.test(c)),JSON.stringify(card).slice(0,420));
  check('1f raden säger att serien börjar och vad nästa mål är; ornamentet ritas (canvas)',card.list.some(l=>/SERIE/.test(l))&&!!card.goal&&card.icons>=1,JSON.stringify({list:card.list,goal:card.goal}));
  check('1g stora knappen är EN JAKT TILL (nästa runda) och JULMENYN finns som egen knapp',/EN JAKT TILL · TORGET/.test(card.btn)&&card.menu,card.btn);
  check('1h inget rinner ut åt sidan i slutkortet',await g.fits('round-xmas-result'));
  await g.shot('1b-slutkort');
  const m=await g.meta();
  check('1i framstegen sparas: XP, röd kula, en lott, serie 1 dag, första uppdraget klart',m&&m.xp>=100&&m.orn['orn-red']===1&&m.tickets.length===1&&m.streak.cur===1&&m.tried.intro&&m.welcomed,JSON.stringify({xp:m?.xp,orn:m?.orn,t:m?.tickets?.length,s:m?.streak?.cur}));
  // en jakt till i ett tryck
  await g.click('xmasResultContinue');await g.wait(1500);
  check('1j EN JAKT TILL startar nästa runda (Torgets julklappsjakt) direkt',await g.ev(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return s.mode==='cozy'&&s.hunt.id==='round-torget';}));
  check('1k inga fel i sidan',g.errs.length===0,g.errs.slice(0,2).join(' | '));
  await g.ctx.close();
});

// ── Scenario 2: menyerna, julgranen, lotterna och de gömda julklapparna ───────────────────────────────────────────────
const SEED_DONE={[SAVE_KEY]:{v:1,stamps:{intro:1700000000000},records:{intro:{points:400,seconds:60,packages:14,bonus:1,level:0}},totals:{packages:14,bonus:1,points:400,runs:1},opts:{weather:'light'},intro:{done:true},rush:{cleared:0,stars:{},best:{},bestStreak:0},zombies:{cleared:0,best:{}},name:'',friends:[]}};
await scenario('2 · julmenyn, julgranen, lotter och gömda julklappar (spelare som klarat första uppdraget)',async()=>{
  const g=await open({seed:SEED_DONE});
  const news=await g.ev(()=>({start:!document.getElementById('xmasNewsStart').hidden,rows:[...document.querySelectorAll('#xmasNewsStart .xn-row')].map(x=>x.textContent)}));
  check('2a en spelare som klarat första uppdraget före framstegen får en välkomstrad med röd kula och första lotten',news.start&&news.rows.some(r=>/VÄLKOMMEN TILLBAKA/.test(r)&&/Röd kula/.test(r)&&/T-[2-9A-Z]{4}-/.test(r)),news.rows.join(' | '));
  const st=await g.ev(()=>({strip:!document.getElementById('xmasStripStart').hidden,rush:!document.getElementById('xmasRushStart').hidden,zom:!document.getElementById('xmasZombies').hidden,
    missions:document.querySelectorAll('#xmasStripStart .xs-missions li:not(.xs-title):not(.xs-gift)').length,chips:document.querySelectorAll('#xmasStripStart .xs-chip').length,
    btns:[...document.querySelectorAll('#xmasStripStart .xs-btn')].map(b=>[b.textContent.trim(),Math.round(b.getBoundingClientRect().height)]),grade:document.querySelector('#xmasStripStart .xs-grade')?.textContent,prize:document.getElementById('xmasPrizeNote').hidden}));
  check('2b startvyn visar remsan (grad, tre uppdrag, serie/lotter/prydnader, tre knappar ≥ 48 px) och nu även JulRushen och Tomtezombies',st.strip&&st.rush&&st.zom&&st.missions===3&&st.chips===3&&st.btns.length===3&&st.btns.every(b=>b[1]>=48)&&st.prize,JSON.stringify(st));
  check('2b2 den stora knappen JULKLAPPSJAKTEN syns utan att rulla (före remsan) på en telefon',await g.ev(()=>{const r=document.getElementById('xmasCozy').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),await g.ev(()=>JSON.stringify(document.getElementById('xmasCozy').getBoundingClientRect())));
  await g.shot('2a-start');
  // julgranen
  await g.ev(()=>document.querySelector('#xmasStripStart .xs-btn').click());await g.wait(500);
  const tree=await g.ev(()=>{
    const c=document.getElementById('xmasTreeCanvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let px=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)px++;
    return {panel:!document.getElementById('round-xmas-tree').hidden,count:document.getElementById('xmasTreeCount').textContent,items:document.querySelectorAll('#xmasTreeList li').length,have:document.querySelectorAll('#xmasTreeList li.have').length,px,w:c.width,h:c.height,first:document.querySelector('#xmasTreeList li.have .xo-name')?.textContent};
  });
  check('2c julgranen öppnas: 24 platser i listan, röda kulan finns, granen är ritad',tree.panel&&tree.items===24&&tree.have===1&&tree.first==='Röd kula'&&tree.count==='1 / 24'&&tree.px>tree.w*tree.h*.3,JSON.stringify(tree));
  await g.shot('2b-julgran');
  check('2d inget rinner ut åt sidan på julgranen',await g.fits('round-xmas-tree'));
  await g.click('xmasTreeBack');await g.wait(300);
  check('2e TILLBAKA leder till menyn man kom från (startvyn) och NYA-markeringen är borta',await g.ev(()=>!document.getElementById('round-xmas-intro').hidden&&!/NYA/.test(document.querySelector('#xmasStripStart .xs-btn').textContent)));
  // lotterna
  await g.ev(()=>document.querySelectorAll('#xmasStripStart .xs-btn')[1].click());await g.wait(400);
  const draw=await g.ev(()=>({panel:!document.getElementById('round-xmas-draw').hidden,count:document.getElementById('xmasDrawCount').textContent,tickets:[...document.querySelectorAll('#xmasDrawTickets li')].map(l=>l.textContent),form:!document.getElementById('xmasDrawForm').hidden,soon:document.getElementById('xmasDrawSoon').textContent,
    line:document.getElementById('xmasDrawLine').textContent,meter:document.querySelector('#xmasDrawMeter .xs-next')?.textContent}));
  check('2f lotterna: en lott syns, anmälan är stängd tills arrangören fyllt i uppgifterna (inget formulär, inget påstående om sponsor)',draw.panel&&draw.count==='1'&&draw.tickets.length===1&&!draw.form&&/öppnar snart/.test(draw.soon)&&/Dragning måndag 21 december kl 18.00/.test(draw.line)&&!/Presenteras av/.test(draw.line)&&/julklappar till nästa lott/.test(draw.meter),JSON.stringify(draw));
  await g.shot('2c-lotter');
  check('2g inget rinner ut åt sidan bland lotterna',await g.fits('round-xmas-draw'));
  await g.click('xmasDrawBack');await g.wait(300);
  // gömda julklappar
  await g.ev(()=>document.querySelectorAll('#xmasStripStart .xs-btn')[2].click());await g.wait(400);
  const sec=await g.ev(()=>({panel:!document.getElementById('round-xmas-secrets').hidden,count:document.getElementById('xmasSecretsCount').textContent,rows:document.querySelectorAll('#xmasSecretsList li').length,open:document.querySelectorAll('#xmasSecretsList li:not(.locked):not(.found)').length,locked:document.querySelectorAll('#xmasSecretsList li.locked').length,
    coupons:!document.getElementById('xmasCoupons').hidden,code:!!document.getElementById('xmasCodeInput')}));
  check('2h gömda julklappar: 20 rader, tre ledtrådar framme första dagen, resten låsta, inga kuponger, kodfält finns',sec.panel&&sec.rows===20&&sec.open===3&&sec.locked===17&&!sec.coupons&&sec.code&&sec.count==='0 / 20',JSON.stringify(sec));
  await g.shot('2d-gomda');
  check('2i inget rinner ut åt sidan bland de gömda julklapparna',await g.fits('round-xmas-secrets'));
  // koden: en okänd kod ger ett vänligt besked och ingenting annat
  await g.ev(()=>{document.getElementById('xmasCodeInput').value='fel-kod 123';document.getElementById('xmasCodeGo').click();});
  check('2j en okänd kod ger ett besked och ingen belöning',/känns inte igen/.test(await g.text('xmasCodeStatus'))&&(await g.meta()).tickets.length===1);
  // fri julvandring med de gömda julklapparna
  await g.click('xmasSecretsFree');await g.wait(1500);
  const free=await g.ev(()=>{const x=window.KarlstadDebug.journey().xmas,r=x.hunt.run;return {mode:x.snapshot().mode,kind:r.kind,hidden:r.packages.filter(p=>p.hidden).length,total:r.regularTotal,bonusTotal:r.bonusTotal,ids:r.packages.filter(p=>p.hidden).map(p=>p.id)};});
  check('2k fri julvandring lägger ut de tjugo gömda julklapparna utan att röra paketräknarna',free.mode==='cozy'&&free.kind==='free'&&free.hidden===20&&free.total===0&&free.bonusTotal===0,JSON.stringify({m:free.mode,k:free.kind,h:free.hidden,t:free.total}));
  // alla tjugo platser går att plocka (höjd, väggar och räckvidd): teleportera till varje och se att julklappen tas
  const got=[];
  for(const s of HIDDEN_SPOTS){
    await g.tp(s.x,s.z,350);
    const ok=await g.ev(id=>{const k=window.KarlstadDebug.journey().xmas.hunt.run.byId.get('h:'+id);return !!k&&k.collected;},s.id);
    if(!ok){await g.tp(s.x+.4,s.z+.4,450);}
    got.push([s.id,await g.ev(id=>{const k=window.KarlstadDebug.journey().xmas.hunt.run.byId.get('h:'+id);return !!k&&k.collected;},s.id)]);
  }
  const miss=got.filter(x=>!x[1]).map(x=>x[0]);
  check('2l alla tjugo gömda platser går att plocka när man står på dem',miss.length===0,miss.length?'missade: '+miss.join(', '):'20 av 20');
  const m2=await g.meta();
  check('2m belöningarna sparas: tjugo gömda, XP, lotter var femte (4), inga dubbla',Object.keys(m2.hidden).length===20&&m2.tickets.filter(t=>t.s==='hidden').length===4&&m2.xp>=20*60,JSON.stringify({h:Object.keys(m2.hidden).length,t:m2.tickets.map(t=>t.s).join(),xp:m2.xp}));
  await g.shot('2e-efter-gomda');
  check('2n inga fel i sidan',g.errs.length===0,g.errs.slice(0,2).join(' | '));
  await g.ctx.close();
});

// ── Scenario 3: ett hemligt paket i länken (?paket=) som inte finns ───────────────────────────────────────────────────
await scenario('3 · ?paket= med en okänd kod städas bort och ger ett besked',async()=>{
  const g=await open({seed:SEED_DONE,search:'?debug&paket=FELKOD123'});
  const r=await g.ev(()=>({url:location.search,rows:[...document.querySelectorAll('#xmasNewsStart .xn-row')].map(x=>[x.className,x.textContent])}));
  check('3a adressen städas (ingen ?paket= kvar) och spelaren får veta att koden inte känns igen',!/paket=/.test(r.url)&&r.rows.some(x=>/codebad/.test(x[0])&&/känns inte igen/.test(x[1])),JSON.stringify(r));
  check('3b ingenting delades ut',(await g.meta()).tickets.length===1);
  await g.ctx.close();
});

// ── Scenario 4: en senare dag med klara luckor i Julkalendern ───────────────────────────────────────────────────────────
await scenario('4 · den 4 december: klara luckor ger belöning en gång',async()=>{
  const seed={[SAVE_KEY]:{...SEED_DONE[SAVE_KEY],stamps:{intro:1700000000000,'round-torget':1700000001000},records:{intro:{points:400,seconds:60,packages:14,bonus:1,level:0}}}};
  const g=await open({seed,day:'2026-12-04T10:00:00+01:00'});
  const rows=await g.ev(()=>[...document.querySelectorAll('#xmasNewsStart .xn-row')].map(x=>x.textContent));
  check('4a lucka 1 och 2 är klara och ger sina belöningar (XP, en prydnad)',rows.some(r=>/LUCKA 1 ÄR KLAR/.test(r)&&/\+60 XP/.test(r))&&rows.some(r=>/LUCKA 2 ÄR KLAR/.test(r)&&/prydnad/.test(r)),rows.join(' | '));
  const m1=await g.meta();
  check('4b belöningarna sparas och luckorna är markerade som hämtade',m1.cal.doors['1']===true&&m1.cal.doors['2']===true&&m1.xp>=60,JSON.stringify({doors:m1.cal.doors,xp:m1.xp}));
  await g.ctx.reload?.();
  await g.page.reload();await g.page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await g.wait(900);
  const rows2=await g.ev(()=>[...document.querySelectorAll('#xmasNewsStart .xn-row')].map(x=>x.textContent));
  const m2=await g.meta();
  check('4c efter omladdning ger samma luckor ingenting igen',!rows2.some(r=>/LUCKA/.test(r))&&m2.xp===m1.xp&&m2.tickets.length===m1.tickets.length,JSON.stringify({rows2,xp:[m1.xp,m2.xp]}));
  await g.ctx.close();
});

// ── Scenario 5: liggande telefon ───────────────────────────────────────────────────────────────────────────────────────
await scenario('5 · liggande telefon (896×414): remsan och granen ryms och knapparna går att nå',async()=>{
  const keep=V;const ctx=await browser.newContext({viewport:{width:896,height:414},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  await ctx.addInitScript(seed=>{if(!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');for(const [k,v] of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));}},SEED_DONE);
  const page=await ctx.newPage();await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
  await page.goto(ORIGIN+'/?debug');await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await page.waitForTimeout(900);
  const L=await page.evaluate(()=>{
    const out={};
    {const e=document.getElementById('round-xmas-intro'),b=document.getElementById('xmasCozy').getBoundingClientRect();out['round-xmas-intro']={noX:e.scrollWidth<=e.clientWidth+1,h:Math.round(e.getBoundingClientRect().height),vh:innerHeight,ctaBottom:Math.round(b.bottom)};}
    window.KarlstadDebug.journey().xmas.openContinue();
    {const e=document.getElementById('round-xmas-continue'),b=document.getElementById('xmasRound').getBoundingClientRect();out['round-xmas-continue']={noX:e.scrollWidth<=e.clientWidth+1,h:Math.round(e.getBoundingClientRect().height),vh:innerHeight,ctaBottom:Math.round(b.bottom)};}
    document.querySelector('#xmasStripContinue .xs-btn').click();
    return out;
  });
  await page.waitForTimeout(400);
  const T=await page.evaluate(()=>{const e=document.getElementById('round-xmas-tree'),c=document.getElementById('xmasTreeCanvas').getBoundingClientRect(),l=document.getElementById('xmasTreeList').getBoundingClientRect();return {noX:e.scrollWidth<=e.clientWidth+1,side:l.left>=c.right-2,canvasW:Math.round(c.width)};});
  if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,'5a-liggande-julgran.png')});}
  check('5a liggande: startvyn och julmenyn rinner inte ut åt sidan, och stora knappen syns utan att rulla',L['round-xmas-intro'].noX&&L['round-xmas-continue'].noX&&L['round-xmas-intro'].ctaBottom<=L['round-xmas-intro'].vh&&L['round-xmas-continue'].ctaBottom<=L['round-xmas-continue'].vh,JSON.stringify(L));
  check('5b liggande: julgranen och listan ligger sida vid sida utan sidled rullning',T.noX&&T.side,JSON.stringify(T));
  void keep;await ctx.close();
});

await browser.close();server.close();
console.log('\n'+(failed?failed+' kontroller avvek.':'Alla kontroller OK.'));
process.exit(failed?1:0);
