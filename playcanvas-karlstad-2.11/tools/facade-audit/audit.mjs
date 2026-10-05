#!/usr/bin/env node
// Facade-gap audit: starts the real game in headless Chromium, collects the geometry that was actually drawn
// and counts, for every free wall of every building, the facade vertices standing in front of it.
// A wall with fewer than 12 vertices between 3.3 m and the roofline is reported as blank.
//
//   npm i playcanvas@2.22.4 playwright     (the CDN is blocked in some sandboxes; the local copy is routed in)
//   python3 -m http.server 8902            (in the game directory)
//   node tools/facade-audit/audit.mjs [out.json]
//
// Env: PLAYWRIGHT=/path/to/playwright/index.mjs  PLAYCANVAS=/path/to/playcanvas.mjs  CHROME=/path/to/chromium  PORT=8902
// Kungsgatan 14/16/18, landmarks, the mall, the south city and parking garages are skipped, like the facade passes.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {chromium}=await import(process.env.PLAYWRIGHT?pathToFileURL(process.env.PLAYWRIGHT).href:'playwright');
const pcSource=fs.readFileSync(process.env.PLAYCANVAS||path.resolve('node_modules/playcanvas/build/playcanvas.mjs'),'utf8');
const browser=await chromium.launch({executablePath:process.env.CHROME,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-sandbox']});
const page=await (await browser.newContext({viewport:{width:800,height:500}})).newPage();
await page.route(/cdn\.jsdelivr\.net\/npm\/playcanvas/,r=>r.fulfill({contentType:'text/javascript',body:pcSource}));
await page.route(/\/app\.js/,r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'app.js'),'utf8').replace("app.on('update',update);","window.__app=app;app.on('update',update);")}));
await page.goto(`http://localhost:${process.env.PORT||8902}/`);await page.waitForTimeout(4000);
await page.locator('#cityClean').first().click();await page.waitForTimeout(7000);
const meshes=await page.evaluate(()=>{const res=[];const walk=e=>{if(/^Karlstad ·/.test(e.name)&&e.render)for(const mi of e.render.meshInstances){const p=[];mi.mesh.getPositions(p);res.push(p.map(v=>Math.round(v*100)/100));}e.children.forEach(walk);};walk(window.__app.root);return res;});
await browser.close();
const {cityBuildings,infillBuildings,IDENTITY_IDS}=await import(pathToFileURL(path.join(root,'city-geography.mjs')).href);
const {KUNGSGATAN_PROFILES}=await import(pathToFileURL(path.join(root,'kungsgatan-reference.mjs')).href);
const {MALL_BUILDING_IDS}=await import(pathToFileURL(path.join(root,'mall-space.mjs')).href);
const {SOUTH_IDS}=await import(pathToFileURL(path.join(root,'city-south-space.mjs')).href);
const osm=JSON.parse(fs.readFileSync(path.join(root,'data/osm-buildings.json'),'utf8'));
const adm=cityBuildings(osm,95),all=[...adm,...infillBuildings(osm,adm)],C=8,grid=new Map();
for(const p of meshes)for(let i=0;i<p.length;i+=3){const k=Math.floor(p[i]/C)+','+Math.floor(p[i+2]/C);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(p[i],p[i+1],p[i+2]);}
const pip=(x,z,poly)=>{let r=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)r=!r;}return r;};
const res=[];
for(const b of all){
  if(KUNGSGATAN_PROFILES[b.osm]||IDENTITY_IDS.has(b.osm)||MALL_BUILDING_IDS.has(b.osm)||SOUTH_IDS.has(b.osm)||/PARKERING/i.test(b.name||'')||b.h<5||b.area<60)continue;
  const poly=b.polygon;let ar=0;for(let i=0;i<poly.length;i++){const a=poly[i],q=poly[(i+1)%poly.length];ar+=a[0]*q[1]-q[0]*a[1];}
  const ccw=ar>0,near=all.filter(n=>n!==b&&n.h>=b.h-.5&&Math.abs(n.cx-b.cx)<b.sx/2+n.sx/2+4&&Math.abs(n.cz-b.cz)<b.sz/2+n.sz/2+4);
  for(let i=0;i<poly.length;i++){
    const a=poly[i],q=poly[(i+1)%poly.length],dx=q[0]-a[0],dz=q[1]-a[1],len=Math.hypot(dx,dz);if(len<5)continue;
    const tx=dx/len,tz=dz/len,nx=ccw?tz:-tz,nz=ccw?-tx:tx;
    if([.2,.5,.8].every(t=>near.some(n=>pip(a[0]+dx*t+nx*1.2,a[1]+dz*t+nz*1.2,n.polygon))))continue;
    let n=0;const mx=a[0]+dx/2,mz=a[1]+dz/2,r=len/2+1.5;
    for(let gx=Math.floor((mx-r)/C);gx<=Math.floor((mx+r)/C);gx++)for(let gz=Math.floor((mz-r)/C);gz<=Math.floor((mz+r)/C);gz++){
      const c=grid.get(gx+','+gz);if(!c)continue;
      for(let j=0;j<c.length;j+=3){const rx=c[j]-a[0],rz=c[j+2]-a[1],u=rx*tx+rz*tz,o=rx*nx+rz*nz,y=c[j+1];if(u>=0&&u<=len&&o>.03&&o<.5&&y>3.3&&y<b.h-.2)n++;}
    }
    res.push({osm:b.osm,name:b.name||((b.tags['addr:street']||'')+' '+(b.tags['addr:housenumber']||'')).trim(),len:+len.toFixed(1),h:b.h,n,blank:n<12,mx:+mx.toFixed(1),mz:+mz.toFixed(1)});
  }
}
const blank=res.filter(x=>x.blank);
console.log(JSON.stringify({edges:res.length,blankEdges:blank.length,blankMetres:Math.round(blank.reduce((s,x)=>s+x.len,0)),blankArea:Math.round(blank.reduce((s,x)=>s+x.len*x.h,0))}));
for(const x of blank.sort((a,b)=>b.len*b.h-a.len*a.h).slice(0,15))console.log(x.osm,x.name.padEnd(26),'len',x.len,'h',Math.round(x.h),'x',x.mx,'z',x.mz);
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(res));
