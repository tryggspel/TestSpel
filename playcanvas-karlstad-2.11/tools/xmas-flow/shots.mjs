#!/usr/bin/env node
// Skärmbilder av julbygget från fasta platser (för att jämföra grafiken före och efter en ändring) och ett mått på ritanropen.
// Startar det riktiga spelet i headless Chromium, startar fri julvandring, flyttar spelaren till varje vy och tar en bild.
//
//   node tools/xmas-flow/shots.mjs                     (alla vyer)   SHOTS=katalog  VIEW=414x896m | 896x414m | 1280x720   ONLY=torget-syd,granen
//   LJUS=dag | skymning | kvall | auto                 (ljuset, se xmas-light.mjs; utan LJUS: dag, så att bilderna går att jämföra oavsett klockslag)
//   PLAYWRIGHT=/väg/playwright/index.mjs PLAYCANVAS=/väg/playcanvas.mjs CHROME=/väg/chromium
//
// Bilden är mjukvaruritad (SwiftShader): färger och former stämmer, men den säger inget om bildfrekvens på en riktig telefon.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const SHOTS=process.env.SHOTS||path.join(root,'shots');
const V=(process.env.VIEW||'414x896m').match(/(\d+)x(\d+)(m?)/);
const ONLY=(process.env.ONLY||'').split(',').filter(Boolean);
const LJUS=process.env.LJUS||'dag';
const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.txt':'text/plain'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://x');const p=path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/,'');
  let file=path.join(root,p);if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end('nej');return;}
  res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const ORIGIN=`http://127.0.0.1:${server.address().port}`;

// [namn, x, z, mot x, mot z, lutning i grader]. Spelaren tittar från (x,z) mot (mot x, mot z).
const VIEWS=[
  ['torget-syd',-2,31,0,0,2],
  ['torget-ost',40,3,0,0,2],
  ['granen',0,10,0,0,22],
  ['foodtrucks',30,19,36,37,4],
  ['scenen',38,2,62,0,6],
  ['julgranar',-38,-1,-58,-1,3],
  ['marknadsgranden',28,-30,44,-41,5],
  ['insamlingen',-34,-19,-40,-30,6],
  ['tomtens-stuga',-24,25,-30,37,4],
  ['publiken',40,-22,56,0,4],
  ['oversikt',-28,28,10,-10,8],
  ['kungsgatan',-6,-34,-6,-90,3]
].filter(v=>!ONLY.length||ONLY.includes(v[0]));

const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:+V[1],height:+V[2]},...(V[3]?{hasTouch:true,isMobile:true}:{}),deviceScaleFactor:1});
const seed={'karlstad-xmas:save:1':{v:1,stamps:{intro:1700000000000},records:{},totals:{packages:14,bonus:1,points:400,runs:1},opts:{weather:'light'},intro:{done:true},rush:{cleared:0,stars:{},best:{},bestStreak:0},zombies:{cleared:0,best:{}},name:'',friends:[]}};
await ctx.addInitScript(s=>{if(!localStorage.getItem('__seeded')){localStorage.setItem('__seeded','1');for(const [k,v] of Object.entries(s))localStorage.setItem(k,JSON.stringify(v));}},seed);
const page=await ctx.newPage(),errs=[];
page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/404|Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,200));});
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
await page.route(/\/app\.js/,r=>{
  if(!r.request().url().startsWith(ORIGIN))return r.continue();
  const s=fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;window.__tp=(x,z,h,t)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=h;pitch=t;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);};app.on('update',update);");
  r.fulfill({contentType:'text/javascript',body:s});
});
await page.goto(ORIGIN+'/?debug&ljus='+encodeURIComponent(LJUS));
await page.waitForFunction(()=>{const l=document.getElementById('loading');return l&&l.classList.contains('hide')&&getComputedStyle(l).opacity==='0';},null,{timeout:180000});
await page.waitForTimeout(800);
fs.mkdirSync(SHOTS,{recursive:true});
const tag=V[1]+'x'+V[2]+(LJUS==='dag'?'':'-'+LJUS);
await page.screenshot({path:path.join(SHOTS,'meny-'+tag+'.png')});
await page.evaluate(()=>window.KarlstadDebug.journey().xmas.startFree());
await page.waitForTimeout(1500);
const stats=[];
for(const [name,x,z,tx,tz,tilt] of VIEWS){
  const yaw=Math.atan2(-(tx-x),-(tz-z))*180/Math.PI;
  await page.evaluate(([x,z,yaw,tilt])=>window.__tp(x,z,yaw,tilt),[x,z,yaw,tilt]);
  await page.waitForTimeout(1400);
  const s=await page.evaluate(()=>{const a=window.__app,st=a&&a.stats;return {draw:st?.drawCalls?.total??null,tris:st?.frame?.triangles??null};});
  stats.push({name,...s});
  await page.screenshot({path:path.join(SHOTS,name+'-'+tag+'.png')});
}
const snap=await page.evaluate(()=>{const x=window.KarlstadDebug.journey().xmas.snapshot();return {gov:x.gov,decor:x.decor,light:x.light};});
console.log(JSON.stringify({view:tag,stats,gov:snap.gov,light:snap.light,decor:snap.decor,errors:errs.slice(0,5)},null,1));
await browser.close();server.close();
