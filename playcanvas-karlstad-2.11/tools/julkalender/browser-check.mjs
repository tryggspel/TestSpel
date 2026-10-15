#!/usr/bin/env node
// Verifiering av Julkalendern i riktig webbläsare (headless Chromium). Startar en egen liten filserver för spelmappen (som på Vercel),
// öppnar /julkalender/ med fast datum och påhittade Julspelssparningar (karlstad-xmas:save:1) och kontrollerar att luckorna låses,
// öppnas, bockas av och sparas som de ska.
//
//   node tools/julkalender/browser-check.mjs        (i playcanvas-karlstad-2.11)
//
// Env: PLAYWRIGHT=/väg/till/playwright/index.mjs  CHROME=/väg/till/chromium  SHOTS=katalog (sparar skärmbilder)
// Själva spelet öppnas inte här (det hämtar spelmotorn från en CDN som är blockerad i vissa sandlådor). Kalendern läser bara spelets sparning.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');   // spelmappen = Vercel-projektets rot
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const SHOTS=process.env.SHOTS||'';

const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://x');let p=path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/,'');
  let file=path.join(root,p);if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end('nej');return;}
  res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const BASE=`http://127.0.0.1:${server.address().port}/julkalender/`;
const {BASE_GAME_URL}=await import(pathToFileURL(path.join(root,'xmas/xmas-config.mjs')).href);

// En enfärgad PNG utan beroenden (till fotoplatsen).
function png(w,h,rgb){
  const crcT=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=b=>{let c=0xffffffff;for(const x of b)c=crcT[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
  const chunk=(t,d)=>{const len=Buffer.alloc(4);len.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]),c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([len,td,c]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;
  const row=Buffer.concat([Buffer.from([0]),Buffer.from(Array.from({length:w},()=>rgb).flat())]);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(Buffer.concat(Array.from({length:h},()=>row)))),chunk('IEND',Buffer.alloc(0))]);
}

const browser=await chromium.launch({executablePath:process.env.CHROME||undefined,args:['--no-sandbox']});
const results=[];let failed=0;
const check=(name,ok,detail='')=>{results.push([ok?'OK  ':'FEL ',name,ok?'':detail]);if(!ok)failed++;};

async function open({time='2026-12-10T09:00:00Z',query='',fixture=null,view={width:1100,height:800},mobile=false,reducedMotion='no-preference',photo=false}={}){
  const ctx=await browser.newContext({viewport:view,reducedMotion,...(mobile?{hasTouch:true,isMobile:true,deviceScaleFactor:2}:{})});
  const page=await ctx.newPage(),errs=[];
  page.on('pageerror',e=>errs.push('pageerror: '+e.message));
  // De två 404:orna är fotoplatsen (img/karlstad-snow.*) som är tom tills ett foto läggs dit.
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource.*404/.test(m.text()))errs.push('console: '+m.text().slice(0,200));});
  if(photo){
    await page.route('**/img/karlstad-snow.jpg',r=>r.fulfill({contentType:'image/png',body:png(640,360,[30,60,110])}));
    await page.route('**/img/credit.txt',r=>r.fulfill({contentType:'text/plain',body:'Provfoto: Någon Fotograf, CC BY 4.0'}));
  }
  await page.clock.setFixedTime(new Date(time));
  if(fixture)await page.addInitScript(f=>{if(localStorage.getItem('__seeded'))return;localStorage.setItem('__seeded','1');for(const [k,v] of Object.entries(f))localStorage.setItem(k,typeof v==='string'?v:JSON.stringify(v));},fixture);
  await page.goto(BASE+query,{waitUntil:'networkidle'});
  await page.waitForSelector('#grid .door');
  return {ctx,page,errs};
}
const shot=async(page,name)=>{if(SHOTS){fs.mkdirSync(SHOTS,{recursive:true});await page.screenshot({path:path.join(SHOTS,name+'.png')});}};
const snap=page=>page.evaluate(()=>window.Julkalender.snapshot());
const classes=(page,n)=>page.$eval(`.door[data-n="${n}"]`,e=>[...e.classList]);
const count=(page,sel)=>page.$$eval(sel,els=>els.length);
const text=(page,sel)=>page.$eval(sel,e=>e.textContent.replace(/\s+/g,' ').trim());

const SAVE='karlstad-xmas:save:1';
const save=over=>({v:1,stamps:{},records:{},totals:{packages:0,bonus:0,points:0,runs:0},opts:{weather:'full'},intro:{done:false},rush:{cleared:0,stars:{},best:{},bestStreak:0},zombies:{cleared:0,best:{}},name:'',friends:[],...over});
const PLAYED={[SAVE]:save({
  stamps:{intro:1700000000000,'round-torget':1700000000001,pressbyran:1700000000002},
  totals:{packages:80,bonus:2,points:700,runs:2},
  rush:{cleared:4,stars:{1:3,2:2,3:2,4:1},best:{1:{points:900},2:{points:2300},3:{points:1800},4:{points:3700}},bestStreak:4}
})};

// 1. Före december: allt är låst, nedräkning, inget förhandsbanner.
{
  const {ctx,page,errs}=await open({time:'2026-10-15T10:00:00Z'});
  check('före december: 24 luckor, alla låsta',await count(page,'#grid .door')===24&&await count(page,'#grid .door.is-locked')===24);
  check('före december: nedräkning till 1 dec',/Öppnas om 47 dagar/.test(await text(page,'#today')),await text(page,'#today'));
  check('före december: inget förhandsbanner',await page.$eval('#banner',e=>e.hidden));
  await page.click('.door[data-n="1"]');
  check('låst lucka visar ledtråd och antal dagar',await page.$eval('#sheet',e=>e.open)&&/Om 47 dagar/.test(await text(page,'#sheet'))&&/Ledtråd/.test(await text(page,'#sheet')),await text(page,'#sheet'));
  await shot(page,'1-fore-december');
  await page.keyboard.press('Escape');
  check('Esc stänger luckan och fokus går tillbaka till luckan',!(await page.$eval('#sheet',e=>e.open))&&await page.evaluate(()=>document.activeElement?.dataset?.n==='1'));
  check('inga fel i konsolen (före december)',errs.length===0,errs.join(' | '));
  await ctx.close();
}

// 2. Mitt i december: luckor öppnas på sin dag.
{
  const {ctx,page,errs}=await open({time:'2026-12-10T09:00:00Z'});
  const open_=[],locked=[];for(let n=1;n<=24;n++)(await classes(page,n)).includes('is-locked')?locked.push(n):open_.push(n);
  check('10 dec: lucka 1–10 öppna, 11–24 låsta',open_.join()===[1,2,3,4,5,6,7,8,9,10].join()&&locked.length===14,`${open_} / ${locked}`);
  check('10 dec: dagens lucka är 10',(await classes(page,10)).includes('is-today')&&await count(page,'.is-today')===1);
  check('10 dec: dagens kort visar lucka 10',/Rush 3 GLÖGGFART/.test(await text(page,'#today')),await text(page,'#today'));
  await page.click('.door[data-n="6"]');
  await page.waitForSelector('#sheet[open]');
  check('lucka 6 öppnas med rätt titel, mål och 3 steg',/Sandgrund: Julvernissagen/.test(await text(page,'#sheet-title'))&&await count(page,'#sheet .todo li')===3&&/Mål/.test(await text(page,'#sheet .goal')));
  check('lucka 6 är ett uppdrag i Julspelet: säger vad man trycker på och bockas av av stämpeln (inget "markera själv" som enda väg)',/SANDGRUND: JULVERNISSAGEN/.test(await text(page,'#sheet .use'))&&/Inte klar ännu/.test(await text(page,'#sheet .status'))&&await count(page,'#sheet .notice')===0&&await count(page,'#sheet .cta [data-act="manual"]')===0,await text(page,'#sheet .use')+' | '+await text(page,'#sheet .status'));
  const href=await page.$eval('#sheet .cta a',a=>a.getAttribute('href'));
  check('knappen länkar rakt till Sandgrund-uppdraget i Julspelet (djuplänk med luckans nummer)',href==='../?uppdrag=sandgrund&lucka=6',href);
  check('2:a advent visas på lucka 6',/2:a advent/.test(await text(page,'#sheet')));
  await page.keyboard.press('Escape');
  await page.click('.door[data-n="4"]');await page.waitForSelector('#sheet[open]');
  const href4=await page.$eval('#sheet .cta a',a=>a.getAttribute('href'));
  check('lucka 4 länkar rakt till Rush 1 och säger vad man trycker på om länken inte räcker',href4==='../?uppdrag=rush1&lucka=4'&&/JULRUSHEN → Rush 1/.test(await text(page,'#sheet .use')),href4+' '+await text(page,'#sheet .use'));
  const res=await page.request.get(new URL(href4,BASE+'x').href);
  check('länken till Julspelet går att öppna (startvyn finns)',res.ok()&&/Julklappsjakten/.test(await res.text()),String(res.status()));
  check('lucka 4 är öppnad i rutnätet efter besöket',(await classes(page,4)).includes('is-open'));
  check('fotens länk till Karlstad City går till grundspelet',await page.$eval('#link-city',a=>a.getAttribute('href'))===BASE_GAME_URL&&await page.$eval('#link-city-wrap',e=>!e.hidden));
  await shot(page,'2-dec10-sheet');
  await page.keyboard.press('Escape');
  check('inga fel i konsolen (10 dec)',errs.length===0,errs.join(' | '));
  await ctx.close();
}

// 3. Avläsning av Julspelets sparning och uppdatering medan man spelar i en annan flik.
{
  const {ctx,page,errs}=await open({fixture:PLAYED});
  const s=await snap(page);
  check('avläsning: luckor 1, 2, 4, 7 och 10 är klara (stämplar och rusher)',s.done.join()==='1,2,4,7,10',s.done.join());
  check('avläsning: stjärnor och titel räknas (1+2+1+2+2 = 8, Pepparkaksbagare)',s.stars===8&&s.rank==='Pepparkaksbagare',`${s.stars} ${s.rank}`);
  check('avläsning: lucka 5 räknar bara NYA rundor (baslinje 2)',!s.done.includes(5)&&s.baseline.runs===2);
  check('granen visar 5 av 24 lampor',/5 av 24 lampor/.test(await text(page,'#tree figcaption'))&&await count(page,'#tree .bulb.on')===5,await text(page,'#tree figcaption'));
  check('klara luckor har bock i rutnätet',(await classes(page,7)).includes('is-done')&&await count(page,'.is-done')===5);
  await page.click('.door[data-n="5"]');await page.waitForSelector('#sheet[open]');
  check('lucka 5 visar "0 av 3 avslutade rundor"',/0 av 3 avslutade rundor/.test(await text(page,'#sheet .status')),await text(page,'#sheet .status'));
  // Spelaren avslutar tre rundor i spelet (annan flik, samma webbläsare).
  const other=await ctx.newPage();await other.goto(BASE+'icon.svg');
  await other.evaluate(k=>{const f=JSON.parse(localStorage.getItem(k));f.totals.runs=5;f.totals.packages=130;f.stamps.sandgrund=1700000000010;f.stamps.marieberg=1700000000011;localStorage.setItem(k,JSON.stringify(f));},SAVE);
  await page.waitForFunction(()=>window.Julkalender.snapshot().done.includes(5),null,{timeout:4000}).catch(()=>{});
  const s2=await snap(page);
  check('flikbyte/storage-händelse: lucka 5 bockas av när tre nya rundor avslutats',s2.done.includes(5),s2.done.join());
  check('flikbyte: stämplarna Sandgrund och Julbåten bockar av luckorna 6 och 9',s2.done.includes(6)&&s2.done.includes(9),s2.done.join());
  check('luckan som är öppen uppdateras till "Klar"',/Klar/.test(await text(page,'#sheet .status')),await text(page,'#sheet .status'));
  check('meddelande om klara luckor visas (lucka 5 och de två nya stämplarna, 6 och 9)',/3 luckor klara/.test(await text(page,'#toast')),await text(page,'#toast'));
  await shot(page,'3-klar-lucka');
  const real=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('karlstad')||k.startsWith('xmas:')).sort().map(k=>[k,localStorage.getItem(k)])));
  check('Julspelets sparning rörs inte av kalendern (inga nya spelnycklar, bara ändringen från "spelaren")',Object.keys(real).join()===SAVE&&JSON.parse(real[SAVE]).stamps.intro===1700000000000&&JSON.parse(real[SAVE]).totals.runs===5,JSON.stringify(real).slice(0,200));
  check('inga fel i konsolen (avläsning)',errs.length===0,errs.join(' | '));
  await ctx.close();
}

// 4. Reservväg: "Markera själv" om avläsningen av någon anledning inte hittar resultatet. Sparas över omladdning och går att ångra.
{
  const {ctx,page}=await open({time:'2026-12-24T09:00:00Z'});
  check('24 dec: alla luckor öppna och finalens kort visas',await count(page,'.is-locked')===0&&/åtta av elva julstämplar/.test(await text(page,'#today')),await text(page,'#today'));
  await page.click('.door[data-n="6"]');await page.waitForSelector('#sheet[open]');
  check('lucka 6 kan markeras för hand som reservväg ("Klarade du den men ser ingen bock?")',/Inte klar ännu/.test(await text(page,'#sheet .status'))&&await count(page,'#sheet .fine [data-act="manual"]')===1);
  await page.click('#sheet .fine [data-act="manual"]');
  check('själv-markering ger bock och stjärnor (3)',(await classes(page,6)).includes('is-done')&&(await snap(page)).stars===3);
  await page.reload({waitUntil:'networkidle'});
  check('själv-markering finns kvar efter omladdning',(await snap(page)).done.join()==='6');
  await page.click('.door[data-n="6"]');await page.waitForSelector('#sheet[open]');
  await page.click('#sheet [data-act="unmark"]');
  check('ångra tar bort markeringen',!(await classes(page,6)).includes('is-done')&&(await snap(page)).done.length===0);
  await ctx.close();
}

// 5. Förhandsvisning: alla luckor öppna men egen sparnyckel, så riktiga framsteg ligger orörda.
{
  const {ctx,page}=await open({time:'2026-10-15T10:00:00Z',query:'?test'});
  check('förhandsvisning: alla 24 luckor kan öppnas och bannern visas',await count(page,'.is-locked')===0&&!(await page.$eval('#banner',e=>e.hidden)));
  await page.click('.door[data-n="6"]');await page.waitForSelector('#sheet[open]');await page.click('#sheet .fine [data-act="manual"]');
  const keys=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('julspelet:')).sort());
  check('förhandsvisning sparar under egen nyckel',keys.includes('julspelet:2026:v1:preview')&&!keys.includes('julspelet:2026:v1'),keys.join());
  await page.keyboard.press('Escape');
  await page.click('#banner [data-exit]');await page.waitForSelector('#grid .door');
  check('"Avsluta förhandsvisning" ger tillbaka de låsta luckorna med orörda framsteg',await count(page,'.is-locked')===24&&(await snap(page)).done.length===0&&!(await page.$eval('#banner',e=>!e.hidden)));
  await ctx.close();
}
{
  const {ctx,page}=await open({time:'2026-10-15T10:00:00Z',query:'?datum=2026-12-03'});
  check('?datum simulerar en dag (3 dec: lucka 1–3 öppna) och visar banner',await count(page,'.is-locked')===21&&/Simulerat datum: torsdag 3 dec/.test(await text(page,'#banner')),await text(page,'#banner'));
  await ctx.close();
}

// 6. Efter jul: allt öppet.
{
  const {ctx,page}=await open({time:'2026-12-30T09:00:00Z',fixture:PLAYED});
  check('efter jul: alla luckor öppna och texten säger det',await count(page,'.is-locked')===0&&/Julen är över/.test(await text(page,'#today')));
  await ctx.close();
}

// 7. Fotoplatsen: ett riktigt foto ersätter illustrationen och får sin bildtext.
{
  const {ctx,page}=await open({photo:true});
  await page.waitForSelector('#scene.has-photo',{timeout:4000}).catch(()=>{});
  check('foto i img/ ersätter illustrationen',await page.$eval('#scene',e=>e.classList.contains('has-photo'))&&await count(page,'#scene img.scene-photo')===1);
  await page.waitForFunction(()=>/Provfoto/.test(document.getElementById('credit').textContent),null,{timeout:3000}).catch(()=>{});
  check('bildtexten läses från img/credit.txt',/Foto: Provfoto: Någon Fotograf/.test(await text(page,'#credit')),await text(page,'#credit'));
  await ctx.close();
  const none=await open({});
  check('utan foto ritas illustrationen',!(await none.page.$eval('#scene',e=>e.classList.contains('has-photo')))&&await count(none.page,'#scene svg')===1);
  await none.ctx.close();
}

// 8. Mobil: ingen sidledes scroll, tryckytor, rörelsekänslighet.
for(const [w,h] of [[320,640],[390,844],[844,390]]){
  const {ctx,page,errs}=await open({view:{width:w,height:h},mobile:true,fixture:PLAYED});
  const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  check(`${w}×${h}: ingen sidledes scroll`,over<=0,String(over));
  const small=await page.$$eval('#grid .door',els=>els.filter(e=>{const r=e.getBoundingClientRect();return r.width<44||r.height<44;}).length);
  check(`${w}×${h}: alla luckor är minst 44 px`,small===0,String(small));
  await page.click('.door[data-n="9"]');await page.waitForSelector('#sheet[open]');
  const fits=await page.$eval('#sheet .paper',e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;});
  check(`${w}×${h}: luckans kort ryms i bredd`,fits);
  check(`${w}×${h}: lucka 9 visar vad man trycker på i Julmenyn och en knapp till spelet`,/BÅTBUSSEN TILL MARIEBERGSSKOGEN/.test(await text(page,'#sheet .use'))&&await count(page,'#sheet .notice')===0&&await count(page,'#sheet .cta a')===1&&await page.$eval('#sheet .cta a',a=>a.getAttribute('href'))==='../?uppdrag=batbuss&lucka=9');
  if(w===390)await shot(page,'8-mobil-lucka9');
  check(`${w}×${h}: inga fel i konsolen`,errs.length===0,errs.join(' | '));
  await ctx.close();
}
{
  const {ctx,page}=await open({reducedMotion:'reduce',view:{width:390,height:844},mobile:true});
  await page.click('.door[data-n="3"]');
  const opened=await page.waitForSelector('#sheet[open]',{timeout:150}).then(()=>true).catch(()=>false);
  check('minska rörelser: luckan öppnas direkt utan väntan',opened);
  await ctx.close();
}

// 9. Tillgänglighet i stort.
{
  const {ctx,page}=await open({fixture:PLAYED});
  const labels=await page.$$eval('#grid .door',els=>els.filter(e=>!e.getAttribute('aria-label')).length);
  check('alla luckor har aria-label',labels===0);
  check('luckans dialog namnges av sin rubrik',await page.$eval('#sheet',e=>e.getAttribute('aria-labelledby')==='sheet-title'));
  check('sidan har språk och rubrikordning',await page.evaluate(()=>document.documentElement.lang==='sv'&&document.querySelectorAll('h1').length===1));
  await ctx.close();
}

await browser.close();server.close();
const width=Math.max(...results.map(r=>r[1].length));
for(const [s,n,d] of results)console.log(s+n.padEnd(width+2)+d);
console.log(`\n${results.length-failed} av ${results.length} kontroller godkända.`);
process.exit(failed?1:0);
