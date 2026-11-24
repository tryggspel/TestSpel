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
const {codeHash,pinHash}=await import(pathToFileURL(path.join(root,'xmas/xmas-hash.mjs')).href);
const SAVE_KEY='karlstad-xmas:save:1',META_KEY='karlstad-xmas:meta:1';

const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
let failed=0;
const check=(name,ok,detail='')=>{if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};

// En ny webbläsare per scenario. seed = sparning att börja med; day = datum som klockan ska visa (ISO med tid), annars riktig tid.
async function open({seed=null,day=null,search='?debug',config=null,routes=null}={}){
  const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},...(V[3]?{hasTouch:true,isMobile:true,deviceScaleFactor:1}:{})});
  await ctx.addInitScript(([seed,day])=>{
    if(day){const off=Date.parse(day)-Date.now(),R=Date;class F extends R{constructor(...a){if(a.length===0)super(R.now()+off);else super(...a);}static now(){return R.now()+off;}}globalThis.Date=F;}
    if(seed&&!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');for(const [k,v] of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));}
  },[seed,day]);
  const page=await ctx.newPage(),errs=[];
  page.on('pageerror',e=>errs.push('pageerror: '+e.message));page.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push('console: '+m.text().slice(0,200));});
  await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
  // config: (källtext) => ny källtext för xmas-meta-config.mjs (för prov med riktiga koder, kuponger och öppen anmälan, utan att någon fil på disk ändras)
  if(config)await page.route(/\/xmas\/xmas-meta-config\.mjs/,r=>{if(!r.request().url().startsWith(ORIGIN))return r.continue();r.fulfill({contentType:'text/javascript',body:config(fs.readFileSync(path.join(root,'xmas/xmas-meta-config.mjs'),'utf8'))});});
  if(routes)await routes(page);
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
  check('1g efter första uppdraget är stora knappen FORTSÄTT (till Julmenyn), JULMENYN-knappen behövs inte och slutkortet säger inte att uppdragen är klara',/^FORTSÄTT/.test(card.btn)&&!card.menu&&!card.list.some(l=>/UPPDRAG KLART/.test(l)),card.btn);
  check('1h inget rinner ut åt sidan i slutkortet',await g.fits('round-xmas-result'));
  await g.shot('1b-slutkort');
  const m=await g.meta();
  check('1i framstegen sparas: XP, röd kula, en lott, serie 1 dag, första uppdraget klart, inga uppdrag räknade',m&&m.xp>=100&&m.orn['orn-red']>=1&&m.tickets.length===1&&m.streak.cur===1&&m.tried.intro&&m.welcomed&&Object.values(m.days).every(d=>d.packages===0&&!Object.keys(d.done).length),JSON.stringify({xp:m?.xp,orn:m?.orn,t:m?.tickets?.length,s:m?.streak?.cur}));
  await g.click('xmasResultContinue');await g.wait(700);
  const hub=await g.ev(()=>({panel:!document.getElementById('round-xmas-continue').hidden,grade:document.querySelector('#xmasStripContinue .xs-grade')?.textContent,missions:document.querySelectorAll('#xmasStripContinue .xs-missions li:not(.xs-title):not(.xs-gift)').length,done:document.querySelectorAll('#xmasStripContinue .xs-missions li.done').length,
    title:document.querySelector('#xmasStripContinue .xs-missions .xs-title')?.textContent,round:document.getElementById('xmasRound').getBoundingClientRect().bottom<=innerHeight}));
  check('1j Julmenyn visar graden, tre uppdrag på noll och nästa jakt utan att rulla',hub.panel&&/GRAD 2/.test(hub.grade)&&hub.missions===3&&hub.done===0&&/0\/3/.test(hub.title)&&hub.round,JSON.stringify(hub));
  await g.shot('1c-julmeny');
  // en vanlig jakt: nästa runda startar direkt från slutkortet
  await g.click('xmasRound');await g.wait(1500);
  await g.ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;r.collected=18;r.bonusCollected=2;r.points=520;r.bestChain=6;r.t=150;r.phase='deliver';});
  const tomte2=await g.ev(()=>{const t=window.KarlstadDebug.journey().xmas.hunt.run.tomte;return {x:t.x,z:t.z};});
  await g.tp(tomte2.x,tomte2.z,300);
  check('1k slutkortet efter en vanlig jakt visas',await g.until(()=>!document.getElementById('round-xmas-result').hidden,12));
  await g.wait(400);
  const c2=await g.ev(()=>({btn:document.getElementById('xmasResultContinue').textContent.replace(/\s+/g,' ').trim(),menu:!document.getElementById('xmasResultMenu').hidden,list:[...document.querySelectorAll('#xmasReward .xrw-list li')].map(l=>l.textContent),xp:document.querySelector('#xmasReward .xrw-xp')?.textContent}));
  check('1l efter en vanlig jakt är stora knappen EN JAKT TILL (nästa runda) och JULMENYN finns som egen knapp; uppdrag räknas nu',/EN JAKT TILL · KUNGSGATAN/.test(c2.btn)&&c2.menu&&c2.list.some(l=>/UPPDRAG KLART/.test(l)),JSON.stringify(c2));
  await g.shot('1d-vanlig-jakt');
  await g.click('xmasResultContinue');await g.wait(1500);
  check('1m EN JAKT TILL startar nästa runda (Kungsgatans julrunda) direkt',await g.ev(()=>{const s=window.KarlstadDebug.journey().xmas.snapshot();return s.mode==='cozy'&&s.hunt.id==='round-kungsgatan';}));
  check('1n inga fel i sidan',g.errs.length===0,g.errs.slice(0,2).join(' | '));
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
  // nära en gömd julklapp (30 m): ljusstrålen syns och raden säger glödhet
  {const s0=HIDDEN_SPOTS[0];await g.tp(s0.x+30,s0.z,1700);
   const near=await g.ev(()=>{const x=window.KarlstadDebug.journey().xmas,v=x.view.snapshot();return {beams:v.beams,shown:v.shown,pill:document.getElementById('xmasPill').textContent,on:document.getElementById('xmasPill').classList.contains('on')};});
   check('2k2 30 m från en gömd julklapp syns en ljusstråle och raden säger varmt eller glödhet',near.beams>=1&&/VARMT|GLÖDHET/.test(near.pill),JSON.stringify(near));
   await g.shot('2f-nara-gomd');
   await g.tp(s0.x+300,s0.z+300,400);}
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

// ── Scenario 3: hemligt paket (?paket=) och kuponger ────────────────────────────────────────────────────────────────────
await scenario('3 · ?paket=: okänd kod, riktig kod med kupong (en gång per enhet), kupongen löses in med PIN',async()=>{
  const g=await open({seed:SEED_DONE,search:'?debug&paket=FELKOD123'});
  const r=await g.ev(()=>({url:location.search,rows:[...document.querySelectorAll('#xmasNewsStart .xn-row')].map(x=>[x.className,x.textContent])}));
  check('3a okänd kod: adressen städas (ingen ?paket= kvar) och spelaren får veta att koden inte känns igen',!/paket=/.test(r.url)&&r.rows.some(x=>/codebad/.test(x[0])&&/känns inte igen/.test(x[1])),JSON.stringify(r));
  check('3b ingenting delades ut',(await g.meta()).tickets.length===1);
  await g.ctx.close();
  const CODE='TESTKOD12345';
  // Byter ut hela listan (QR_CODES och COUPONS är flerradiga i konfigurationen och slutar med "]);" i första kolumnen). Kastar om satsen inte hittas, så att provet aldrig körs mot fel konfiguration.
  const swap=(src,name,value)=>{
    const re=new RegExp('export const '+name+'=Object\\.freeze\\(\\[[\\s\\S]*?\\n?\\]\\);');
    if(!re.test(src))throw new Error(name+' hittades inte i xmas-meta-config.mjs');
    return src.replace(re,()=>value);
  };
  const cfg=src=>swap(swap(src,'QR_CODES',`export const QR_CODES=Object.freeze([{h:'${codeHash(CODE)}',id:'test-1',label:'TESTAFFISCH',reward:{xp:50,orn:'epic',tickets:1,coupon:'kaffe'}}]);`),
    'COUPONS',`export const COUPONS=Object.freeze([{id:'kaffe',title:'EN KAFFE PÅ HUSET',partner:'Provkaféet',text:'Visa kupongen för personalen.',terms:'Gäller en gång.',validTo:'2026-12-24',pin:'${pinHash('kaffe','4711')}'}]);`);
  const g2=await open({seed:SEED_DONE,search:'?debug&paket=testkod-1234%205',config:cfg});
  const n=await g2.ev(()=>[...document.querySelectorAll('#xmasNewsStart .xn-row.code')].map(x=>x.textContent));
  check('3c riktig kod (skriven med små bokstäver, streck och mellanrum): hemligt paket med XP, prydnad, lott och kupong',n.length===1&&/HEMLIGT PAKET! TESTAFFISCH/.test(n[0])&&/\+50 XP/.test(n[0])&&/NY PRYDNAD/.test(n[0])&&/NY LOTT/.test(n[0])&&/NY KUPONG: EN KAFFE PÅ HUSET/.test(n[0]),n.join(' | '));
  const crow=await g2.ev(()=>{const b=document.querySelector('#xmasStripStart .xs-couponbtn');return {txt:b?.textContent,sub:document.querySelector('#xmasStripStart .xs-couponsub')?.textContent,first:document.getElementById('xmasStripStart').firstElementChild?.className};});
  check('3c2 kupongen har en egen rad överst i remsan, med giltighet',/KUPONG · EN KAFFE PÅ HUSET/.test(crow.txt||'')&&/Provkaféet · giltig t\.o\.m\. 24 december/.test(crow.sub||'')&&/xs-couponrow/.test(crow.first||''),JSON.stringify(crow));
  const m=await g2.meta();
  check('3d belöningen sparas: koden är använd, två lotter, en kupong ägs',m.qr['test-1']&&m.tickets.length===2&&m.coupons.length===1&&m.coupons[0].id==='kaffe'&&m.xp>=50,JSON.stringify({qr:m.qr,t:m.tickets.length,c:m.coupons.length}));
  await g2.ev(()=>document.querySelector('#xmasStripStart .xs-couponbtn').click());await g2.wait(400);
  const box=await g2.ev(()=>({shown:!document.getElementById('xmasCoupons').hidden,title:document.querySelector('#xmasCoupons .xs-coupon b')?.textContent,pin:!!document.querySelector('#xmasCoupons .xs-pin'),cls:document.querySelector('#xmasCoupons .xs-coupon')?.className}));
  check('3e kupongen syns under gömda julklappar med PIN-fält för personalen',box.shown&&box.title==='EN KAFFE PÅ HUSET'&&box.pin&&/valid/.test(box.cls),JSON.stringify(box));
  await g2.shot('3a-kupong');
  await g2.ev(()=>{document.querySelector('#xmasCoupons .xs-pin').value='1111';document.querySelector('#xmasCoupons .xs-coupon .round-secondary').click();});
  check('3f fel PIN löser inte in kupongen',/Fel PIN/.test(await g2.ev(()=>document.querySelector('#xmasCoupons .round-fine:last-child').textContent))&&(await g2.meta()).coupons[0].used===0);
  await g2.ev(()=>{document.querySelector('#xmasCoupons .xs-pin').value='4711';document.querySelector('#xmasCoupons .xs-coupon .round-secondary').click();});
  const after=await g2.meta();
  check('3g rätt PIN löser in kupongen och den visas som inlöst',after.coupons[0].used>0&&await g2.ev(()=>/used/.test(document.querySelector('#xmasCoupons .xs-coupon').className)),JSON.stringify(after.coupons));
  // samma länk igen (omladdning): ingenting delas ut en andra gång
  await g2.page.goto(ORIGIN+'/?debug&paket=TESTKOD12345');await g2.page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await g2.wait(900);
  const again=await g2.ev(()=>[...document.querySelectorAll('#xmasNewsStart .xn-row')].map(x=>x.className+': '+x.textContent));
  const m2=await g2.meta();
  check('3h samma kod en andra gång: "redan hämtat" och ingen ny belöning',again.some(x=>/codebad/.test(x)&&/redan hämtat/.test(x))&&m2.tickets.length===2&&m2.xp===after.xp,again.join(' | '));
  check('3i inga fel i sidan',g2.errs.length===0,g2.errs.slice(0,2).join(' | '));
  await g2.ctx.close();
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

// ── Scenario 6: anmälan till dragningen (öppen i det här provet, servern är en låtsasserver) ────────────────────────────────────
await scenario('6 · vinn en julgran: formuläret, kontroll, inskickning och fel (låtsasserver, ingen riktig lagring)',async()=>{
  const cfg=src=>src.replace("ready:false,","ready:true,").replace("controller:'',contact:'',","controller:'Provföreningen',contact:'info@exempel.se',").replace("sponsor:'',","sponsor:'Provträdgården',");
  let answer={status:200,json:{ok:true,stored:1,total:1}},sent=[];
  const g=await open({seed:SEED_DONE,config:cfg,routes:async page=>{await page.route(/\/api\/xmas-draw$/,async route=>{sent.push(JSON.parse(route.request().postData()||'null'));await route.fulfill({status:answer.status,contentType:'application/json',body:JSON.stringify(answer.json)});});}});
  await g.ev(()=>document.querySelectorAll('#xmasStripStart .xs-btn')[1].click());await g.wait(400);
  const f=await g.ev(()=>({form:!document.getElementById('xmasDrawForm').hidden,soon:!document.getElementById('xmasDrawSoon').hidden,line:document.getElementById('xmasDrawLine').textContent,send:document.getElementById('xmasDrawSend').textContent.replace(/\s+/g,' ').trim(),
    rules:document.getElementById('xmasDrawRules').textContent,priv:document.getElementById('xmasDrawPrivacy').textContent}));
  check('6a med öppen anmälan syns formuläret, sponsorn och villkoren (med ansvarig och kontakt ifyllda)',f.form&&!f.soon&&/Presenteras av Provträdgården/.test(f.line)&&/SKICKA IN 1 LOTT/.test(f.send)&&/Provföreningen/.test(f.rules)&&/info@exempel\.se/.test(f.priv)&&!/\[[A-ZÅÄÖ]+\]/.test(f.rules+f.priv),JSON.stringify(f).slice(0,300));
  await g.shot('6a-anmalan');
  check('6b inget rinner ut åt sidan i anmälan',await g.fits('round-xmas-draw'));
  await g.click('xmasDrawSend');
  check('6c tomt formulär: ett begripligt fel och inget skickas',/namn/i.test(await g.text('xmasDrawStatus'))&&sent.length===0,await g.text('xmasDrawStatus'));
  await g.ev(()=>{document.getElementById('xmasDrawName').value='Kim Karlsson';document.getElementById('xmasDrawContact').value='kim@exempel.se';});
  await g.click('xmasDrawSend');
  check('6d utan bekräftelse av ålder och samtycke skickas inget',/myndig|målsman/i.test(await g.text('xmasDrawStatus'))&&sent.length===0,await g.text('xmasDrawStatus'));
  await g.ev(()=>{document.getElementById('xmasDrawGuardian').checked=true;document.getElementById('xmasDrawConsent').checked=true;});
  answer={status:503,json:{ok:false,error:'ej_redo'}};
  await g.click('xmasDrawSend');await g.wait(500);
  check('6e servern ej redo: ett besked, formuläret kan användas igen och lotten är inte markerad som inskickad',/inte öppen/.test(await g.text('xmasDrawStatus'))&&!(await g.ev(()=>document.getElementById('xmasDrawSend').disabled))&&(await g.meta()).draw.sent.length===0,await g.text('xmasDrawStatus'));
  answer={status:200,json:{ok:true,stored:1,total:1}};
  await g.click('xmasDrawSend');await g.wait(600);
  const body=sent.at(-1);
  check('6f godkänd inskickning: förfrågan har rätt innehåll och personuppgifterna går bara dit',!!body&&body.v===1&&body.name==='Kim Karlsson'&&body.contact==='kim@exempel.se'&&body.guardian===true&&body.consent===true&&Array.isArray(body.tickets)&&body.tickets.length===1&&/^T-/.test(body.tickets[0])&&body.facts&&body.facts.grade>=1,JSON.stringify(body));
  const m=await g.meta();
  check('6g lotten markeras som inskickad, knappen säger 0 lotter och spelet tackar',m.draw.sent.length===1&&/SKICKA IN 0 LOTTER/.test(await g.ev(()=>document.getElementById('xmasDrawSend').textContent.replace(/\s+/g,' ').trim()))&&/Tack/.test(await g.text('xmasDrawStatus')),JSON.stringify(m.draw));
  check('6h den inskickade lotten visas som inskickad i listan',await g.ev(()=>/inskickad/.test(document.querySelector('#xmasDrawTickets li').textContent)));
  const stored=await g.ev(()=>JSON.stringify(localStorage));
  check('6i namn och kontakt sparas inte på enheten',!/Kim Karlsson|kim@exempel/.test(stored));
  check('6j inga fel i sidan',g.errs.length===0,g.errs.slice(0,2).join(' | '));
  await g.ctx.close();
});

// ── Scenario 7: liten stående telefon ───────────────────────────────────────────────────────────────────────────────────────
await scenario('7 · liten stående telefon (375×667): stora knappen syns direkt, även med en nyhetsrad, och inget rinner ut',async()=>{
  const ctx=await browser.newContext({viewport:{width:375,height:667},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  await ctx.addInitScript(seed=>{if(!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');for(const [k,v] of Object.entries(seed))localStorage.setItem(k,JSON.stringify(v));}},SEED_DONE);
  const page=await ctx.newPage();await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
  await page.goto(ORIGIN+'/?debug');await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});await page.waitForTimeout(900);
  const R=await page.evaluate(()=>{const b=document.getElementById('xmasCozy').getBoundingClientRect(),n=document.getElementById('xmasNewsStart'),c=document.getElementById('round-xmas-intro');return {ctaTop:Math.round(b.top),ctaBottom:Math.round(b.bottom),vh:innerHeight,news:!n.hidden,noX:c.scrollWidth<=c.clientWidth+1};});
  if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,'7a-liten-telefon.png')});}
  check('7a 375×667 med en nyhetsrad: stora knappen JULKLAPPSJAKTEN syns utan att rulla och inget rinner ut',R.news&&R.ctaBottom<=R.vh&&R.noX,JSON.stringify(R));
  await ctx.close();
});

// ── Scenario 8: priset avstängt ────────────────────────────────────────────────────────────────────────────────────────────
await scenario('8 · PRIZE.enabled:false: inget om lotter, dragning eller anmälan någonstans (lotterna sparas ändå)',async()=>{
  const g=await open({seed:SEED_DONE,config:src=>src.replace('enabled:true,ready:false,','enabled:false,ready:false,')});
  const TXT=/\blott|\blotter|dragning|VINN EN|anmälan/i;
  const start=await g.ev(()=>document.getElementById('round-xmas-intro').innerText);
  check('8a startvyn och remsan nämner inga lotter, ingen dragning och ingen prisknapp',!TXT.test(start)&&await g.ev(()=>document.querySelectorAll('#xmasStripStart .xs-btn').length===2),start.replace(/\s+/g,' ').slice(0,160));
  await g.click('xmasCozy');await g.wait(700);
  check('8b julmenyn nämner inga lotter',!TXT.test(await g.ev(()=>document.getElementById('round-xmas-continue').innerText)));
  await g.click('xmasRound');await g.wait(1500);
  await g.ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;r.collected=18;r.bonusCollected=2;r.points=520;r.bestChain=9;r.t=100;r.phase='deliver';});
  const t=await g.ev(()=>{const t=window.KarlstadDebug.journey().xmas.hunt.run.tomte;return {x:t.x,z:t.z};});
  await g.tp(t.x,t.z,300);await g.until(()=>!document.getElementById('round-xmas-result').hidden,12);await g.wait(400);
  const card=await g.ev(()=>document.getElementById('round-xmas-result').innerText);
  check('8c slutkortet nämner inga lotter (men visar XP och prydnader)',!TXT.test(card)&&/XP/.test(card)&&/GRAD/.test(card),card.replace(/\s+/g,' ').slice(0,200));
  const m=await g.meta();
  check('8d lotterna räknas ändå (så att de finns om priset slås på senare)',m.tickets.length>=1,String(m.tickets.length));
  check('8e inga fel i sidan',g.errs.length===0,g.errs.slice(0,2).join(' | '));
  await g.ctx.close();
});

// ── Scenario 9: Tomtezombies (förlorad nivå, klarad nivå) och JulRushen ───────────────────────────────────────────────────
await scenario('9 · Tomtezombies och JulRushen: förlorad nivå visar bara nästa mål, klarad nivå och rush ger belöning',async()=>{
  const g=await open({seed:SEED_DONE});
  await g.ev(()=>window.KarlstadDebug.journey().xmas.startZombies());await g.wait(2500);
  await g.ev(()=>window.KarlstadDebug.journey().xmas.caught());
  check('9a en förlorad nivå: slutkortet visas',await g.until(()=>!document.getElementById('round-xmas-result').hidden,12));await g.wait(300);
  const lost=await g.ev(()=>({title:document.getElementById('xmasResultTitle').textContent,xp:document.querySelector('#xmasReward .xrw-xp')?.textContent||'',goal:document.querySelector('#xmasReward .xrw-goal')?.textContent||'',shown:!document.getElementById('xmasReward').hidden}));
  check('9b förlorad nivå: ingen "+0 XP"-rad, bara nästa mål, och läget räknas som provat',/TAGEN/.test(lost.title)&&lost.xp===''&&/NÄSTA MÅL/.test(lost.goal)&&(await g.meta()).tried.zombies===true,JSON.stringify(lost));
  await g.ev(()=>window.KarlstadDebug.journey().xmas.openMenu());await g.wait(500);
  // en klarad nivå
  await g.ev(()=>window.KarlstadDebug.journey().xmas.startZombies());await g.wait(2500);
  await g.ev(()=>{const r=window.KarlstadDebug.journey().xmas.hunt.run;r.collected=r.goal;r.bonusCollected=1;r.points=700;r.bestChain=4;r.t=120;r.phase='deliver';});
  const tz=await g.ev(()=>{const t=window.KarlstadDebug.journey().xmas.hunt.run.tomte;return {x:t.x,z:t.z};});
  await g.tp(tz.x,tz.z,300);
  check('9c en klarad nivå: slutkortet visas',await g.until(()=>!document.getElementById('round-xmas-result').hidden,15));await g.wait(400);
  const won=await g.ev(()=>({xp:document.querySelector('#xmasReward .xrw-xp')?.textContent||'',chips:document.querySelectorAll('#xmasReward .xrw-chip').length,btn:document.getElementById('xmasResultContinue').textContent.replace(/\s+/g,' ').trim()}));
  check('9d en klarad nivå ger XP och en prydnad, och knappen är NÄSTA NIVÅ',/^\+\d+ XP$/.test(won.xp)&&won.chips>=1&&/NÄSTA NIVÅ/.test(won.btn),JSON.stringify(won));
  const m=await g.meta();check('9e en klarad zombienivå räknas som körning och ger serie',m.tried.zombies&&m.streak.cur===1,JSON.stringify({s:m.streak.cur}));
  await g.shot('9a-zombies-klar');
  check('9f inga fel i sidan',g.errs.length===0,g.errs.slice(0,2).join(' | '));
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
