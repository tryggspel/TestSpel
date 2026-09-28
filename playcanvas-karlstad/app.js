import * as pc from 'https://cdn.jsdelivr.net/npm/playcanvas@2.22.4/build/playcanvas.mjs';

const canvas=document.getElementById('game');
const loading=document.getElementById('loading');
const loadText=document.getElementById('loadText');
const loadBar=document.getElementById('loadBar');
const status=document.getElementById('status');
const mission=document.getElementById('mission');
const errorEl=document.getElementById('error');

const ORIGIN={lat:59.380767,lon:13.50295};
const MALL={lat:59.37988,lon:13.50055};
const RADIUS=260;
const PLAYER_RADIUS=0.42;
const EYE=1.68;
let app,player,camera,yaw=210,pitch=-3;
let vy=0,onGround=true;
let colliders=[];
let moveX=0,moveY=0;
let lookDX=0,lookDY=0;
const keys=new Set();

function fail(e){
  console.error(e);
  errorEl.textContent=String(e&&e.stack?e.stack:e);
  errorEl.classList.add('show');
  loadText.textContent='Fel vid start';
}
window.addEventListener('error',e=>fail(e.error||e.message));
window.addEventListener('unhandledrejection',e=>fail(e.reason||e));

function localXY(lon,lat){
  const lat0=ORIGIN.lat*Math.PI/180;
  const x=(lon-ORIGIN.lon)*111320*Math.cos(lat0);
  const z=-(lat-ORIGIN.lat)*110540;
  return [x,z];
}
function color(hex){ return new pc.Color(((hex>>16)&255)/255,((hex>>8)&255)/255,(hex&255)/255); }
function mat(hex,metal=0,gloss=.25){
  const m=new pc.StandardMaterial();
  m.diffuse=color(hex); m.metalness=metal; m.gloss=gloss; m.update(); return m;
}
const M={
  ground:null,plaza:null,building:null,stone:null,plaster:null,brick:null,light:null,glass:null,
  hero:null,heroDark:null,road:null,sidewalk:null,marking:null,grass:null,tree:null,trunk:null,
  metal:null,marker:null
};

function addBox(name,x,y,z,sx,sy,sz,material){
  const e=new pc.Entity(name);
  e.addComponent('render',{type:'box'});
  e.setPosition(x,y,z); e.setLocalScale(sx,sy,sz);
  e.render.material=material;
  app.root.addChild(e);
  return e;
}
function addCylinder(name,x,y,z,r,h,material){
  const e=new pc.Entity(name);
  e.addComponent('render',{type:'cylinder'});
  e.setPosition(x,y,z); e.setLocalScale(r*2,h,r*2); e.render.material=material; app.root.addChild(e); return e;
}
function addSphere(name,x,y,z,r,material){
  const e=new pc.Entity(name);
  e.addComponent('render',{type:'sphere'});
  e.setPosition(x,y,z); e.setLocalScale(r*2,r*2,r*2); e.render.material=material; app.root.addChild(e); return e;
}
function hashStr(s){
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function addCrosswalk(x,z,axis='x'){
  for(let i=-3;i<=3;i++){
    const off=i*1.35;
    if(axis==='x') addBox('crosswalk',x+off,.045,z,0.72,.018,5.8,M.marking);
    else addBox('crosswalk',x,.045,z+off,5.8,.018,.72,M.marking);
  }
}
function addTree(x,z,scale=1){
  addCylinder('tree-trunk',x,1.15*scale,z,.16*scale,2.3*scale,M.trunk);
  addSphere('tree-crown',x,3.05*scale,z,1.28*scale,M.tree);
}
function addLamp(x,z){
  addCylinder('lamp-post',x,2.2,z,.055,4.4,M.metal);
  addSphere('lamp-head',x,4.45,z,.18,M.marking);
}
function addStreetProps(){
  const trees=[
    [-22,-25],[-13,-27],[14,-26],[24,-22],[-35,5],[-36,18],[34,4],[36,18],
    [-55,42],[-43,48],[48,45],[58,36]
  ];
  trees.forEach((p,i)=>addTree(p[0],p[1],.9+(i%3)*.08));
  [[-18,-12],[-6,-14],[8,-14],[20,-10],[-34,28],[34,28],[-48,45],[48,45]].forEach(p=>addLamp(p[0],p[1]));
}

function initScene(){
  M.ground=mat(0x52665b,0,.08);
  M.grass=mat(0x445b45,0,.05);
  M.plaza=mat(0x817b70,0,.12);
  M.building=mat(0x83796f,0,.2);
  M.stone=mat(0x8b8177,0,.18);
  M.plaster=mat(0xc4b9a7,0,.16);
  M.brick=mat(0x8f5545,0,.12);
  M.light=mat(0xd8d0c1,0,.2);
  M.glass=mat(0x536873,.15,.62);
  M.hero=mat(0xc29a61,0,.3);
  M.heroDark=mat(0x2d363b,.08,.5);
  M.road=mat(0x303438,0,.08);
  M.sidewalk=mat(0x77766f,0,.1);
  M.marking=mat(0xe8e3d6,0,.18);
  M.tree=mat(0x365843,0,.05);
  M.trunk=mat(0x654a37,0,.08);
  M.metal=mat(0x3a4145,.2,.5);
  M.marker=mat(0xe7c149,0,.52);

  // Big, cheap surfaces first: readable city structure without texture downloads.
  addBox('ground',0,-.35,0,620,.6,620,M.ground);
  addBox('road-v',-26,-.03,0,10,.12,520,M.road);
  addBox('road-h',0,-.025,20,520,.11,9,M.road);
  addBox('sidewalk-v-l',-32,.015,0,2.6,.06,520,M.sidewalk);
  addBox('sidewalk-v-r',-20,.015,0,2.6,.06,520,M.sidewalk);
  addBox('sidewalk-h-a',0,.018,14,520,.06,2.3,M.sidewalk);
  addBox('sidewalk-h-b',0,.018,26,520,.06,2.3,M.sidewalk);
  addBox('torget',0,-.005,0,65,.08,58,M.plaza);
  // A subtle darker edge makes the square read as a designed space.
  addBox('torget-edge-n',0,.025,-28,65,.04,.7,M.sidewalk);
  addBox('torget-edge-s',0,.025,28,65,.04,.7,M.sidewalk);
  addCrosswalk(-26,-7,'x');
  addCrosswalk(-26,47,'x');

  player=new pc.Entity('player');
  player.setPosition(0,EYE,0);
  app.root.addChild(player);

  camera=new pc.Entity('camera');
  camera.addComponent('camera',{clearColor:new pc.Color(.46,.61,.70),nearClip:.05,farClip:620,fov:74});
  player.addChild(camera);
  camera.setLocalPosition(0,0,0);

  // Scandinavian late-afternoon look: warm key, cool ambience, cheap linear fog.
  const sun=new pc.Entity('sun');
  sun.addComponent('light',{type:'directional',intensity:2.35,color:new pc.Color(1,.91,.76),castShadows:false});
  sun.setEulerAngles(52,32,0); app.root.addChild(sun);
  const fill=new pc.Entity('fill');
  fill.addComponent('light',{type:'directional',intensity:.42,color:new pc.Color(.58,.72,1)});
  fill.setEulerAngles(-35,210,0); app.root.addChild(fill);
  app.scene.ambientLight=new pc.Color(.34,.38,.40);
  if(pc.FOG_LINEAR!==undefined){
    app.scene.fog=pc.FOG_LINEAR;
    app.scene.fogColor=new pc.Color(.46,.61,.70);
    app.scene.fogStart=185;
    app.scene.fogEnd=470;
  }

  addStreetProps();

  const [mx,mz]=localXY(MALL.lon,MALL.lat);
  addCylinder('mitt-i-city-marker',mx,5,mz,.72,10,M.marker);
  addBox('mitt-i-city-plaza',mx,.02,mz,19,.05,14,M.sidewalk);
  addCrosswalk(mx+12,mz,'z');
  const beacon=new pc.Entity('beacon');
  beacon.addComponent('light',{type:'omni',range:24,intensity:1.7,color:new pc.Color(1,.72,.22)});
  beacon.setPosition(mx,4.5,mz); app.root.addChild(beacon);
}

function polygonArea(pts){
  let a=0; for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length];a+=p[0]*q[1]-q[0]*p[1];} return Math.abs(a/2);
}
function addBuildings(osm){
  const items=[];
  for(const e of osm.elements||[]){
    if(e.type!=='way'||!e.geometry||e.geometry.length<3) continue;
    const t=e.tags||{}; if(!t.building) continue;
    const pts=e.geometry.map(p=>localXY(+p.lon,+p.lat));
    const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length, cz=pts.reduce((s,p)=>s+p[1],0)/pts.length;
    const dist=Math.hypot(cx,cz); if(dist>RADIUS) continue;
    const area=polygonArea(pts); if(area<18) continue;
    let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity;
    pts.forEach(p=>{minx=Math.min(minx,p[0]);maxx=Math.max(maxx,p[0]);minz=Math.min(minz,p[1]);maxz=Math.max(maxz,p[1]);});
    const sx=Math.max(2,maxx-minx), sz=Math.max(2,maxz-minz);
    const levels=Math.max(1,Math.min(8,parseFloat(t['building:levels'])||3));
    const h=levels*3.2;
    items.push({dist,area,cx,cz,sx,sz,h,name:t.name||t['building:name']||'',tags:t});
  }
  items.sort((a,b)=>a.dist-b.dist);
  let count=0;
  const cityMats=[M.stone,M.plaster,M.brick,M.light,M.building,M.glass];
  for(const b of items.slice(0,95)){
    if(Math.hypot(b.cx,b.cz)<9) continue;
    const hero=/Mitt i City|Domkyrka|Residenset|Sandgrund|bibliotek|Wermland/i.test(b.name);
    const seed=hashStr((b.name||'byggnad')+'|'+Math.round(b.cx)+'|'+Math.round(b.cz));
    const facade=hero?M.hero:cityMats[seed%cityMats.length];
    addBox(b.name||'building',b.cx,b.h/2,b.cz,b.sx,b.h,b.sz,facade);

    // Only nearby/important buildings get extra geometry, keeping mobile draw calls sane.
    if(hero||b.dist<92){
      const baseMat=hero?M.heroDark:M.glass;
      addBox((b.name||'building')+'-shopfront',b.cx,1.25,b.cz,b.sx*1.012,2.35,b.sz*1.012,baseMat);
    }
    if(hero){
      addBox((b.name||'building')+'-roof',b.cx,b.h+.18,b.cz,b.sx*1.03,.32,b.sz*1.03,M.heroDark);
    }

    colliders.push({minx:b.cx-b.sx/2-.15,maxx:b.cx+b.sx/2+.15,minz:b.cz-b.sz/2-.15,maxz:b.cz+b.sz/2+.15});
    count++;
  }
  return count;
}

function blocked(x,z){
  for(const c of colliders){
    if(x+PLAYER_RADIUS>c.minx&&x-PLAYER_RADIUS<c.maxx&&z+PLAYER_RADIUS>c.minz&&z-PLAYER_RADIUS<c.maxz) return true;
  }
  return false;
}
function tryMove(dx,dz){
  const p=player.getPosition();
  const nx=p.x+dx,nz=p.z+dz;
  if(!blocked(nx,p.z)) p.x=nx;
  if(!blocked(p.x,nz)) p.z=nz;
  player.setPosition(p);
}

function setupDesktop(){
  window.addEventListener('keydown',e=>{keys.add(e.code); if(e.code==='Space')e.preventDefault();});
  window.addEventListener('keyup',e=>keys.delete(e.code));
  canvas.addEventListener('click',()=>canvas.requestPointerLock?.());
  window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){lookDX+=e.movementX;lookDY+=e.movementY;}});
}
function setupTouch(){
  const joy=document.getElementById('joy'),knob=joy.querySelector('i'); let jp=null;
  function jm(x,y){
    const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=x-cx,dy=y-cy; const max=r.width*.32,l=Math.hypot(dx,dy)||1;
    if(l>max){dx*=max/l;dy*=max/l;} moveX=dx/max;moveY=dy/max;knob.style.transform='translate('+dx+'px,'+dy+'px)';
  }
  joy.addEventListener('pointerdown',e=>{jp=e.pointerId;joy.setPointerCapture(jp);jm(e.clientX,e.clientY);e.preventDefault();});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===jp){jm(e.clientX,e.clientY);e.preventDefault();}});
  const je=e=>{if(jp!==null&&e.pointerId!==jp)return;jp=null;moveX=moveY=0;knob.style.transform='';};
  joy.addEventListener('pointerup',je);joy.addEventListener('pointercancel',je);

  const look=document.getElementById('look'); let lp=null,lx=0,ly=0;
  look.addEventListener('pointerdown',e=>{lp=e.pointerId;lx=e.clientX;ly=e.clientY;look.setPointerCapture(lp);e.preventDefault();});
  look.addEventListener('pointermove',e=>{if(e.pointerId!==lp)return;lookDX+=e.clientX-lx;lookDY+=e.clientY-ly;lx=e.clientX;ly=e.clientY;e.preventDefault();});
  const le=e=>{if(lp!==null&&e.pointerId!==lp)return;lp=null;};
  look.addEventListener('pointerup',le);look.addEventListener('pointercancel',le);

  document.getElementById('jumpBtn').addEventListener('pointerdown',e=>{keys.add('Space');setTimeout(()=>keys.delete('Space'),100);e.preventDefault();});
  document.getElementById('fireBtn').addEventListener('pointerdown',e=>{document.getElementById('fireBtn').textContent='BANG!';setTimeout(()=>document.getElementById('fireBtn').textContent='FIRE',120);e.preventDefault();});
  document.getElementById('useBtn').addEventListener('pointerdown',e=>{mission.textContent='USE · INTERAKTION KOMMER I P2';setTimeout(()=>mission.textContent='UPPDRAG: TA DIG TILL MITT I CITY',1200);e.preventDefault();});
  document.getElementById('mapBtn').addEventListener('pointerdown',e=>{mission.textContent='KARTA · MÅL: MITT I CITY';setTimeout(()=>mission.textContent='UPPDRAG: TA DIG TILL MITT I CITY',1200);e.preventDefault();});
}

function update(dt){
  const sens=0.12;
  yaw-=lookDX*sens; pitch=Math.max(-78,Math.min(78,pitch-lookDY*sens)); lookDX=lookDY=0;
  player.setEulerAngles(0,yaw,0); camera.setLocalEulerAngles(pitch,0,0);

  let ix=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+moveX;
  let iz=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0)+moveY;
  const len=Math.hypot(ix,iz); if(len>1){ix/=len;iz/=len;}
  const sprint=keys.has('ShiftLeft')?1.55:1;
  const speed=7.2*sprint;
  const a=yaw*Math.PI/180;
  const dx=(ix*Math.cos(a)+iz*Math.sin(a))*speed*dt;
  const dz=(-ix*Math.sin(a)+iz*Math.cos(a))*speed*dt;
  tryMove(dx,dz);

  if(onGround&&keys.has('Space')){vy=6.2;onGround=false;}
  vy-=16*dt;
  const p=player.getPosition(); p.y+=vy*dt;
  if(p.y<=EYE){p.y=EYE;vy=0;onGround=true;} player.setPosition(p);

  const [mx,mz]=localXY(MALL.lon,MALL.lat);
  const d=Math.hypot(p.x-mx,p.z-mz);
  status.textContent='FPS '+Math.round(app.stats.frame.fps)+'\nMITT I CITY '+Math.round(d)+' m';
  if(d<8) mission.textContent='MÅL NÅTT · MITT I CITY';
}

async function boot(){
  try{
    loadText.textContent='Initierar PlayCanvas…'; loadBar.style.width='25%';
    app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:false,antialias:true,powerPreference:'high-performance'}});
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO,Math.min(window.devicePixelRatio||1,1.35));
    initScene();
    loadText.textContent='Läser Karlstads geodata…'; loadBar.style.width='55%';
    const r=await fetch('../karlstad-city-mobile/data/osm-buildings.json',{cache:'force-cache'});
    if(!r.ok) throw new Error('OSM '+r.status);
    const osm=await r.json();
    const n=addBuildings(osm);
    loadText.textContent='Lägger grafikpass 1.1… '+n+' byggnader'; loadBar.style.width='82%';
    setupDesktop();setupTouch();
    app.on('update',update);
    app.start();
    addEventListener('resize',()=>app.resizeCanvas());
    setTimeout(()=>{loadBar.style.width='100%';loading.classList.add('hide');},350);
  }catch(e){fail(e);}
}
boot();