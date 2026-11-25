#!/usr/bin/env node
// Verifiering i riktig webbläsare av Tomtekön på Pressbyrån och borttagningarna i 2.21.1-xmas.16: inga länkar till grundspelet eller Julkalendern,
// Sista rundan och Löfbergs-kiosken borta från torget, och Tomtekön spelad med riktiga tryck tills ordern lämnas.
// Startar det riktiga spelet i headless Chromium med en egen liten webbserver, låter en bot följa Termosjaktens mål i speltid, klickar på gränssnittet och kontrollerar att spelet svarar rätt.
// Avslutar med kod 1 om något avviker. Sparar skärmbilder om SHOTS=katalog anges.
//
//   node tools/xmas-flow/kiosk.mjs        Env: PLAYWRIGHT=/väg/playwright/index.mjs  PLAYCANVAS=/väg/playcanvas.mjs  CHROME=/väg/chromium  VIEW=414x896m  SHOTS=katalog
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
  const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__blocked=blocked;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};window.__pos=()=>{const p=player.getPosition();return [p.x,p.z]};window.__turbo=()=>lastRound?.turboScale?.()||1;app.on('update',update);");
  r.fulfill({contentType:'text/javascript',body:s});
});
let failed=0;
const check=(name,ok,detail='')=>{if(!ok)failed++;console.log((ok?'OK   ':'FEL  ')+name+(detail?' — '+detail:''));};
const wait=ms=>page.waitForTimeout(ms),ev=(fn,a)=>page.evaluate(fn,a);
const shot=async n=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,n+'.png')});}};
const click=id=>ev(i=>document.getElementById(i)?.click(),id);
const rnd=(a,b)=>a+Math.random()*(b-a);
const until=async(fn,max=60)=>{const t0=Date.now();while(Date.now()-t0<max*1000){if(await ev(fn))return true;await wait(250);}return false;};

await page.goto(ORIGIN+'/?debug&ljus=dag');
await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});
await wait(900);
const tp=async(x,z,yaw,ms=1200,pitch=-4)=>{await ev(([x,z,y,pt])=>window.__tp(x,z,y,pt),[x,z,yaw,pitch]);await wait(ms);};
const X=()=>ev(()=>window.KarlstadDebug.journey().xmas.snapshot());
const K=()=>ev(()=>window.KarlstadDebug.journey().xmas.kiosk?.snapshot()||null);
const KG=()=>ev(()=>{const g=window.KarlstadDebug.journey().xmas.kiosk?._game();if(!g)return null;const c=g.front();return {t:g.state.t,served:g.state.served,wrong:g.state.wrong,score:g.state.score,combo:g.state.combo,lives:g.state.lives,
  front:c?{kind:c.kind,order:c.order,got:c.got,visible:g.visible(c)}:null,shelf:g.state.shelf};});
const enabled=name=>ev(n=>{const e=window.__app.root.findByName(n);return e?e.enabled:null;},name);
const tapItem=async id=>{const b=await page.$('.kr-item[data-item="'+id+'"]');if(!b)return false;const r=await b.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.up();return true;};

// K0: menyerna har inga länkar till grundspelet eller Julkalendern
const links=await ev(()=>({back:['xmasBack','xmasBackPause','xmasContinueBack'].filter(id=>document.getElementById(id)),cal:['xmasCalendar','xmasCalendar2','xmasDoorCal'].filter(id=>document.getElementById(id)),
  hrefs:[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')||'').filter(h=>/visual-twin|julkalender/.test(h))}));
check('K0 inga länkar till grundspelet (utan jul) eller Julkalendern i menyerna',!links.back.length&&!links.cal.length&&!links.hrefs.length,JSON.stringify(links));
// K1: torget utan Sista rundan och Löfbergs-kiosken
await ev(()=>window.KarlstadDebug.journey().xmas.startFree());await wait(1500);
const props={hem:await enabled('Hemgång sign'),zone:await enabled('Hemgång zone'),guard:await enabled('Vakten'),guardSign:await enabled('Starta hos vakten'),lofbergs:await enabled('Konceptplats LÖFBERGS'),fika:await enabled('Torget missions')};
check('K1 torget: ingen HEMGÅNG-skylt eller zon, ingen vakt för Sista rundan, ingen Löfbergs-kiosk',Object.values(props).every(v=>v===false),JSON.stringify(props));
await tp(-9,34,180,1200,-2);await shot('k00-torget-utan-lofbergs');
await tp(48.5,32,0,1200,-2);await shot('k01-olearys-utan-hemgang');
// K2: Pressbyrån öppnar Tomtekön
const a=await ev(()=>window.KarlstadDebug.journey().places.arrivalFor('pressbyran'));await tp(a.x,a.z,a.yaw,1500);
const prompt=await ev(()=>window.KarlstadDebug.journey().places.prompt(window.KarlstadDebug.position()));
check('K2 vid Pressbyrån: TOMTEKÖN erbjuds',!!prompt&&/TOMTEKÖN/.test(prompt.tactic),JSON.stringify(prompt));
await ev(()=>window.KarlstadDebug.use());await wait(900);
const k2=await K(),c2=await ev(()=>document.querySelector('.kr-layer .kr-card')?.textContent||'');
check('K2b spelet öppnas med startkortet (regler och specialkunder)',!!k2&&k2.open&&k2.phase==='start'&&/TOMTEKÖN/.test(c2)&&/Glömske Gösta/.test(c2)&&/ÖPPNA KASSAN/.test(c2),JSON.stringify(k2));
const run2=await ev(()=>{const r=window.KarlstadDebug.journey().places.run;return r?{phase:r.phase,external:!!r.external}:null;});
check('K2c uppdragsmotorn väntar på spelet (beställningen är extern, motorns klocka står still)',!!run2&&run2.phase==='serve'&&run2.external,JSON.stringify(run2));
await shot('k02-startkort');
// K3: öppna kassan och servera med riktiga tryck
await ev(()=>[...document.querySelectorAll('.kr-layer .kr-card button')].find(b=>/ÖPPNA KASSAN/.test(b.textContent))?.click());
await until(()=>{const g=window.KarlstadDebug.journey().xmas.kiosk?._game();return !!g&&!!g.front();},8);
let g=await KG();check('K3 kassan är öppen och första tomten står vid disken med en beställning',!!g&&!!g.front&&g.front.order.length>=2,JSON.stringify(g?.front));
await shot('k03-tomtekon');
// fel vara först
const wrong=g.shelf.find(id=>!g.front.order.includes(id));
if(wrong){await tapItem(wrong);await wait(200);const g2=await KG();check('K4 fel vara: räknas som fel och kombon nollas',g2.wrong===1&&g2.combo===0,JSON.stringify({wrong:g2.wrong,combo:g2.combo}));}
// servera i 18 sekunder
const t0=Date.now();
while(Date.now()-t0<18000){g=await KG();if(!g)break;const f=g.front;
  if(f){if(!f.visible&&f.kind==='glomsk'){await ev(()=>document.querySelector('.kr-bubble')?.click());await wait(120);continue;}
    const k=f.order.findIndex((x,i)=>!f.got[i]);if(k>=0){await tapItem(f.order[k]);await wait(140);continue;}}
  await wait(150);}
g=await KG();
check('K5 tomtar blir serverade med riktiga tryck, poäng och kombo växer',g.served>=3&&g.score>0,JSON.stringify({served:g.served,score:g.score,combo:g.combo,lives:g.lives}));
await shot('k04-mitt-i-passet');
// K6: passet slutar (förkortat i testet) med en stjärna, och ordern lämnas
await ev(()=>{const g=window.KarlstadDebug.journey().xmas.kiosk._game();g.state.served=Math.max(g.state.served,13);g.end();});await wait(700);
const end=await ev(()=>document.querySelector('.kr-layer .kr-card')?.textContent||'');
check('K6 slutkortet: stjärnor, poäng och BÄR FIKAT TILL TOMTEN',/★/.test(end)&&/BÄR FIKAT TILL TOMTEN/.test(end),end.slice(0,160));
await shot('k05-slutkort');
await ev(()=>[...document.querySelectorAll('.kr-layer .kr-card button')].find(b=>/BÄR FIKAT/.test(b.textContent))?.click());await wait(1500);
const after=await ev(()=>{const x=window.KarlstadDebug.journey().xmas,r=x.hunt.run;return {open:x.kiosk.isOpen,run:!!window.KarlstadDebug.journey().places.run,errand:r?.errand?.id||null,best:x.kiosk.snapshot().best};});
check('K7 ordern är lämnad: spelet stängt, uppdraget klart och tomten utanför väntar på fikat',!after.open&&!after.run&&after.errand==='delivery-pressbyran'&&after.best>0,JSON.stringify(after));
await shot('k06-ut-till-tomten');
// K8: Stäng mitt i ett nytt pass avbryter utan belöning
await wait(12000);
await tp(a.x,a.z,a.yaw,1200);await ev(()=>window.KarlstadDebug.use());await wait(900);
const reopened=(await K())?.open;
if(reopened){await ev(()=>document.querySelector('.kr-layer .kr-close')?.click());await wait(600);}
const k8=await ev(()=>({open:window.KarlstadDebug.journey().xmas.kiosk.isOpen,run:window.KarlstadDebug.journey().places.run?.phase||null}));
check('K8 stänger man spelet utan att lämna ordern avbryts uppdraget (inget hänger kvar)',reopened===true?(!k8.open&&!k8.run):true,JSON.stringify({reopened,k8}));
// ── Cervera: porslinsjakten och sedan DUKA JULBORDET (minnesspelet) ───────────────────────────────────
const TG=()=>ev(()=>{const g=window.KarlstadDebug.journey().xmas.tableGame?._game();return g?{phase:g.state.phase,round:g.state.round,layout:g.state.layout,placed:g.state.placed,tray:g.state.tray,score:g.state.score,stars:g.state.stars,wrong:g.state.wrong,over:g.state.over}:null;});
const tapSel=async sel=>{const b=await page.$(sel);if(!b)return false;const r=await b.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.up();return true;};
await until(()=>window.KarlstadDebug.journey().places.available(),20);
const c=await ev(()=>window.KarlstadDebug.journey().places.arrivalFor('cervera'));await tp(c.x,c.z,c.yaw,1500);
await ev(()=>window.KarlstadDebug.use());await wait(800);
const items=await ev(()=>window.KarlstadDebug.journey().places.run?.items.map(i=>({x:i.x,z:i.z})));
for(const it of items||[]){await tp(it.x,it.z,0,700,-8);}
await tp(c.x,c.z,c.yaw,700);await ev(()=>window.KarlstadDebug.use());
const tOpen=await until(()=>!!window.KarlstadDebug.journey().xmas.tableGame?.isOpen,8);
check('C1 när porslinet är lämnat öppnas Duka julbordet (och stämpeln är redan given)',tOpen&&await ev(()=>!!window.KarlstadDebug.journey().xmas.save.state.stamps.cervera));
await shot('c01-julbordet-start');
await ev(()=>[...document.querySelectorAll('.tm-layer .kr-card button')].find(b=>/BÖRJA DUKA/.test(b.textContent))?.click());await wait(600);
let tg=await TG();check('C2 Rut visar dukningen först (titta-fasen), sedan dukar man',tg&&tg.phase==='show'&&tg.layout.filter(Boolean).length===3,JSON.stringify(tg&&{phase:tg.phase,n:tg.layout.filter(Boolean).length}));
await shot('c02-titta');
for(let round=0;round<3;round++){
  await until(()=>window.KarlstadDebug.journey().xmas.tableGame._game().state.phase==='play',10);tg=await TG();
  if(round===0){const free=tg.layout.findIndex(x=>!x);await tapSel('.tm-item[data-item="'+tg.tray[0]+'"]');await wait(100);await tapSel('.tm-spot[data-spot="'+(tg.layout[free]===tg.tray[0]?tg.layout.findIndex(x=>x===tg.tray[0]):free)+'"]');await wait(150);}
  tg=await TG();
  for(let k=0;k<tg.layout.length;k++){const id=tg.layout[k];if(!id||tg.placed[k])continue;await tapSel('.tm-item[data-item="'+id+'"]');await wait(90);await tapSel('.tm-spot[data-spot="'+k+'"]');await wait(120);}
  if(round===1)await shot('c03-duka');
  await wait(500);
  if(round<2)await ev(()=>[...document.querySelectorAll('.tm-layer .kr-card button')].find(b=>/NÄSTA BORD/.test(b.textContent))?.click());
}
await wait(600);tg=await TG();
const endTxt=await ev(()=>document.querySelector('.tm-layer .kr-card')?.textContent||'');
check('C3 tre bord dukade med riktiga tryck: ett fel i första bordet, tre stjärnor och poäng',tg.over&&tg.wrong===1&&tg.stars===3&&tg.score>0&&/★★★/.test(endTxt),JSON.stringify({over:tg.over,wrong:tg.wrong,stars:tg.stars,score:tg.score}));
await shot('c04-julbordet-klart');
const xp0=await ev(()=>window.KarlstadDebug.journey().xmas.meta.state.xp);
await ev(()=>[...document.querySelectorAll('.tm-layer .kr-card button')].find(b=>/KLART/.test(b.textContent))?.click());
const shown=await until(()=>!document.getElementById('round-xmas-result').hidden,10);
const res=await ev(()=>({title:document.getElementById('xmasResultTitle').textContent,xp:window.KarlstadDebug.journey().xmas.meta.state.xp}));
check('C4 KLART: julens resultatkort FIKABORDET ÄR DUKAT! visas och stjärnorna gav XP',shown&&res.title==='FIKABORDET ÄR DUKAT!'&&res.xp>xp0,JSON.stringify({...res,xp0}));
await shot('c05-resultat');
check('K9 inga fel i sidan',errs.length===0,errs.slice(0,4).join(' | '));
console.log(failed?`\n${failed} kontroll(er) FEL`:'\nAlla kontroller OK');
await browser.close();server.close();
process.exit(failed?1:0);
