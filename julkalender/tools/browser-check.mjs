#!/usr/bin/env node
// Verifiering av Julkalendern i riktig webbläsare (headless Chromium). Startar en egen liten filserver för hela repot, öppnar sidan med
// fast datum och påhittade spelsparningar och kontrollerar att luckorna låses, öppnas, bockas av och sparas som de ska.
//
//   node julkalender/tools/browser-check.mjs
//
// Env: PLAYWRIGHT=/väg/till/playwright/index.mjs  CHROME=/väg/till/chromium  SHOTS=katalog (sparar skärmbilder)
// Spelet öppnas inte här (det behöver en CDN som är blockerad i vissa sandlådor). Kalendern läser bara spelets sparfiler.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
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

const PLAYED={
  'karlstad:missions:2':{sandgrund:true,'radda-fikat':true,fikapanik:false},
  'karlstad:rush:best:1':'1180',
  'karlstad:fun:1':{version:1,stats:{thermos:30,rides:2,treasures:1},badges:[],collected:[]},
  'karlstad:places:1':{version:1,places:{pressbyran:{completed:1,stamped:1700000000000}}}
};

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
  check('10 dec: dagens kort visar lucka 10',/BussQuiz/.test(await text(page,'#today')),await text(page,'#today'));
  await page.click('.door[data-n="6"]');
  await page.waitForSelector('#sheet[open]');
  check('lucka 6 öppnas med rätt titel, mål och 3 steg',/Sandgrund: Vernissage från graven/.test(await text(page,'#sheet-title'))&&await count(page,'#sheet .todo li')===3&&/Mål/.test(await text(page,'#sheet .goal')));
  const href=await page.$eval('#sheet .cta a',a=>a.getAttribute('href'));
  check('knappen länkar till spelets Sandgrund-uppdrag',href==='../playcanvas-karlstad-2.11/?challenge=sandgrund',href);
  const res=await page.request.get(new URL(href,BASE+'x').href);
  check('länken till spelet går att öppna',res.ok(),String(res.status()));
  check('2:a advent visas på lucka 6',/2:a advent/.test(await text(page,'#sheet')));
  check('lucka 6 är öppnad i rutnätet efter besöket',(await classes(page,6)).includes('is-open'));
  await shot(page,'2-dec10-sheet');
  await page.keyboard.press('Escape');
  check('inga fel i konsolen (10 dec)',errs.length===0,errs.join(' | '));
  await ctx.close();
}

// 3. Avläsning av spelets sparfiler och uppdatering medan man spelar i en annan flik.
{
  const {ctx,page,errs}=await open({fixture:PLAYED});
  const s=await snap(page);
  check('avläsning: luckor 2, 3, 6 och 7 är klara (stämpel, uppdrag, uppdrag, rekord)',s.done.join()==='2,3,6,7',s.done.join());
  check('avläsning: stjärnor och titel räknas (2+2+3+2 = 9, Pepparkaksbagare)',s.stars===9&&s.rank==='Pepparkaksbagare',`${s.stars} ${s.rank}`);
  check('avläsning: lucka 1 räknar bara NYA termosar (baslinje 30)',!s.done.includes(1)&&s.baseline.thermos===30);
  check('granen visar 4 av 24 lampor',/4 av 24 lampor/.test(await text(page,'#tree figcaption'))&&await count(page,'#tree .bulb.on')===4,await text(page,'#tree figcaption'));
  check('klara luckor har bock i rutnätet',(await classes(page,6)).includes('is-done')&&await count(page,'.is-done')===4);
  await page.click('.door[data-n="1"]');await page.waitForSelector('#sheet[open]');
  check('lucka 1 visar "0 av 5 termosar"',/0 av 5 termosar/.test(await text(page,'#sheet .status')),await text(page,'#sheet .status'));
  // Spelaren plockar sex termosar i spelet (annan flik, samma webbläsare).
  const other=await ctx.newPage();await other.goto(BASE+'icon.svg');
  await other.evaluate(()=>{const f=JSON.parse(localStorage.getItem('karlstad:fun:1'));f.stats.thermos=36;localStorage.setItem('karlstad:fun:1',JSON.stringify(f));});
  await page.waitForFunction(()=>window.Julkalender.snapshot().done.includes(1),null,{timeout:4000}).catch(()=>{});
  const s2=await snap(page);
  check('flikbyte/storage-händelse: lucka 1 bockas av när 5 nya termosar plockats',s2.done.includes(1),s2.done.join());
  check('luckan som är öppen uppdateras till "Klar"',/Klar/.test(await text(page,'#sheet .status')),await text(page,'#sheet .status'));
  check('meddelande om klar lucka visas',/Lucka 1 klar/.test(await text(page,'#toast')),await text(page,'#toast'));
  await shot(page,'3-klar-lucka');
  const real=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('karlstad:')).sort().map(k=>[k,localStorage.getItem(k)])));
  const want=Object.fromEntries(Object.entries(PLAYED).filter(([k])=>k!=='karlstad:fun:1').map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)]));
  const sameKeys=Object.keys(real).sort().join()==='karlstad:fun:1,karlstad:missions:2,karlstad:places:1,karlstad:rush:best:1';
  check('spelets sparfiler rörs inte av kalendern (nycklar och värden oförändrade)',sameKeys&&Object.entries(want).every(([k,v])=>real[k]===v),JSON.stringify(real));
  check('inga fel i konsolen (avläsning)',errs.length===0,errs.join(' | '));
  await ctx.close();
}

// 4. Själv-markering (lucka 12 sparas inte i spelet), sparas över omladdning och går att ångra.
{
  const {ctx,page}=await open({time:'2026-12-24T09:00:00Z'});
  check('24 dec: alla luckor öppna och finalens kort visas',await count(page,'.is-locked')===0&&/Fikapanik/.test(await text(page,'#today')));
  await page.click('.door[data-n="12"]');await page.waitForSelector('#sheet[open]');
  check('lucka 12 säger att den markeras av spelaren',/Markeras av dig/.test(await text(page,'#sheet .status')));
  await page.click('#sheet [data-act="manual"]');
  check('själv-markering ger bock och stjärna',(await classes(page,12)).includes('is-done')&&(await snap(page)).stars===1);
  await page.reload({waitUntil:'networkidle'});
  check('själv-markering finns kvar efter omladdning',(await snap(page)).done.join()==='12');
  await page.click('.door[data-n="12"]');await page.waitForSelector('#sheet[open]');
  await page.click('#sheet [data-act="unmark"]');
  check('ångra tar bort markeringen',!(await classes(page,12)).includes('is-done')&&(await snap(page)).done.length===0);
  await ctx.close();
}

// 5. Förhandsvisning: alla luckor öppna men egen sparnyckel, så riktiga framsteg ligger orörda.
{
  const {ctx,page}=await open({time:'2026-10-15T10:00:00Z',query:'?test'});
  check('förhandsvisning: alla 24 luckor kan öppnas och bannern visas',await count(page,'.is-locked')===0&&!(await page.$eval('#banner',e=>e.hidden)));
  await page.click('.door[data-n="12"]');await page.waitForSelector('#sheet[open]');await page.click('#sheet [data-act="manual"]');
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
  check(`${w}×${h}: lucka 9 visar båda delmålen`,await count(page,'#sheet .parts li')===2,String(await count(page,'#sheet .parts li')));
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
