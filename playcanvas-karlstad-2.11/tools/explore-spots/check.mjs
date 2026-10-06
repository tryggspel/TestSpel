#!/usr/bin/env node
// Kontroll av City Explore-platserna (2.13): termosarna långt ut, de gömda skatterna och busshållplatserna.
// Startar det riktiga spelet i headless Chromium och frågar spelets egen blocked() (vatten, broar, byggnader, parkstigar):
//   * termosar: minst 1,1 m fritt runt om, skatter: 1,6 m, hållplatser: 3,4 m (och 2,2 m där bussmodellen står)
//   * alla platser ska gå att nå från Torget över det gångbara rutnätet (3 m), inte ligga i en innesluten ficka
//   * inga två termosar närmare än 3 m
// Mitt i City (båda planen) kontrolleras mot mall-space.mjs i stället, eftersom blocked() inte känner gallerians våningar.
//
//   npm i playcanvas@2.22.4 playwright     (CDN:en är blockerad i vissa sandlådor; den lokala kopian routas in)
//   python3 -m http.server 8902            (i spelkatalogen)
//   node tools/explore-spots/check.mjs
//
// Env: PLAYWRIGHT=/path/to/playwright/index.mjs  PLAYCANVAS=/path/to/playcanvas.mjs  CHROME=/path/to/chromium  PORT=8902
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const places=await import(pathToFileURL(path.join(root,'explore-places.mjs')).href);
const mallSpace=await import(pathToFileURL(path.join(root,'mall-space.mjs')).href);
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const page=await (await browser.newContext({viewport:{width:800,height:500}})).newPage();
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
await page.route(/\/app\.js/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__blocked=blocked;app.on('update',update);")}));
await page.goto(`http://localhost:${process.env.PORT||8902}/`);await page.waitForTimeout(4000);
await page.locator('#cityClean').first().click();await page.waitForTimeout(7000);

const spots=[];
for(const [area,list] of Object.entries(places.FX_THERMOS))list.forEach(([x,z,y],i)=>spots.push({id:`fx-${area}-${i}`,kind:'termos',x,z,y:y||0,clear:1.1}));
for(const t of places.TREASURES)spots.push({id:t.id,kind:'skatt',x:t.x,z:t.z,y:t.y||0,clear:1.6});
const stops=places.BUS_NETWORK.filter(s=>s.x!==undefined);
for(const s of stops){spots.push({id:'stop-'+s.id,kind:'hållplats',x:s.x,z:s.z,y:0,clear:3.4});const [dx,dz]=s.bus||[6,2];spots.push({id:'buss-'+s.id,kind:'bussmodell',x:s.x+dx,z:s.z+dz,y:0,clear:2.2});}
const outdoor=spots.filter(s=>!(s.id.startsWith('fx-mall-')||/^t-(coop|cervera|clas)$/.test(s.id)));
const res=await page.evaluate(({outdoor})=>{
  const free=(x,z,R)=>{for(let k=0;k<8;k++){const a=k*Math.PI/4;if(window.__blocked(x+Math.cos(a)*R,z+Math.sin(a)*R))return false;}return !window.__blocked(x,z);};
  // Flodfyllning på ett 3 m-rutnät över alla platser, från Torget.
  const xs=outdoor.map(s=>s.x),zs=outdoor.map(s=>s.z),X0=Math.min(0,...xs)-30,X1=Math.max(0,...xs)+30,Z0=Math.min(14,...zs)-30,Z1=Math.max(14,...zs)+30,S=3;
  const W=Math.ceil((X1-X0)/S),H=Math.ceil((Z1-Z0)/S);
  // För stora ytor delas rutnätet i grova steg; platser långt ifrån varandra är förbundna av öppen mark.
  const blockedCell=new Uint8Array(W*H);for(let j=0;j<H;j++)for(let i=0;i<W;i++)blockedCell[j*W+i]=window.__blocked(X0+i*S,Z0+j*S)?1:0;
  const seen=new Uint8Array(W*H),q=[Math.round((14-Z0)/S)*W+Math.round((0-X0)/S)];seen[q[0]]=1;
  for(let h=0;h<q.length;h++){const c=q[h],x=c%W,y=(c/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const n=ny*W+nx;if(seen[n]||blockedCell[n])continue;seen[n]=1;q.push(n);}}
  return outdoor.map(s=>{const ci=Math.round((s.x-X0)/S),cj=Math.round((s.z-Z0)/S);let reach=false;for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const a=ci+dx,b=cj+dy;if(a>=0&&b>=0&&a<W&&b<H&&seen[b*W+a])reach=true;}return {id:s.id,free:free(s.x,s.z,s.clear),reach};});
},{outdoor});
await browser.close();

const problems=[];
for(const r of res){if(!r.free)problems.push(r.id+': blockerad eller för trångt');if(!r.reach)problems.push(r.id+': går inte att nå från Torget');}
for(const s of spots.filter(s=>!outdoor.includes(s))){const ok=mallSpace.mallWalkable(s.x,s.z,s.y>0);if(!ok)problems.push(s.id+': inte gångbar i gallerian (plan '+(s.y>0?1:0)+')');}
const near=spots.filter(s=>s.kind==='termos');
for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++)if(Math.hypot(near[i].x-near[j].x,near[i].z-near[j].z,near[i].y-near[j].y)<3)problems.push(near[i].id+' och '+near[j].id+' ligger närmare än 3 m');
console.log(`Kontrollerade ${spots.length} platser (${near.length} termosar, ${places.TREASURES.length} skatter, ${stops.length} hållplatser).`);
if(problems.length){console.error('PROBLEM:\n'+problems.join('\n'));process.exit(1);}
console.log('Alla platser är fria och nåbara.');
