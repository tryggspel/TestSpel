// Röktest i riktig Chromium med en attrapp av PlayCanvas (3D ritas inte, men all spellogik,
// HUD, menyer, ljudgraf och händelser körs). Fångar t.ex. syntaxfel, saknade element och
// undantag i update-loopen — det som annars bara märks när spelet startas.
//
//   npm i -D playwright && npx playwright install chromium
//   python3 -m http.server 8902   (i spelkatalogen)
//   node tools/smoke/smoke.mjs http://localhost:8902/ '#cityClean,3000'
//   node tools/smoke/smoke.mjs http://localhost:8902/ '#cityStart,26000'
//   node tools/smoke/smoke.mjs "http://localhost:8902/?season=halloween" '#cityClean,1500,#roundPause,800'
//
// Steg: '#id' trycker på ett synligt element, ett tal väntar så många ms.
// Avslutar med kod 1 om sidan kastade fel. Skärmbild sparas som smoke.png.
import {chromium} from 'playwright';
import fs from 'node:fs';
const [,, url='http://localhost:8902/', flow='#cityClean,3000'] = process.argv;
const stub=fs.readFileSync(new URL('./pcstub.js',import.meta.url),'utf8');
const browser=await chromium.launch(process.env.CHROME?{executablePath:process.env.CHROME}:{});
const ctx=await browser.newContext({viewport:{width:414,height:750},deviceScaleFactor:2,hasTouch:true,isMobile:true});
const page=await ctx.newPage();const errors=[];
page.on('pageerror',e=>errors.push('PAGEERROR '+e.message));
page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text().slice(0,300));});
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:stub}));
await page.goto(url);await page.waitForTimeout(2500);
const log=[];
for(const s of flow.split(',')){
  if(s.startsWith('#')){const el=page.locator(s);const ok=await el.count()&&await el.first().isVisible();if(ok){await el.first().tap();await page.waitForTimeout(1200);}log.push(s+':'+(ok?'ok':'saknas'));}
  else{await page.waitForTimeout(Number(s)||800);}
}
await page.screenshot({path:'smoke.png'});
const state=await page.evaluate(()=>({music:window.KarlstadMusic?.snapshot?.(),toast:document.getElementById('roundToastTitle')?.textContent,status:document.getElementById('status')?.textContent,body:document.body.className}));
console.log(JSON.stringify({log,state,errors},null,1));
await browser.close();process.exit(errors.length?1:0);
