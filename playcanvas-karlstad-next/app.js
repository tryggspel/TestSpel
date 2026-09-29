import * as pc from 'https://cdn.jsdelivr.net/npm/playcanvas@2.22.4/build/playcanvas.mjs';
import {createLastRound} from './last-round.js?v=2.2.0';
import {FpsLook, wrapYaw,oneThumbIntent} from './fps-controls.mjs?v=2.2.0';

const canvas=document.getElementById('game');
const loading=document.getElementById('loading');
const loadText=document.getElementById('loadText');
const loadBar=document.getElementById('loadBar');
const status=document.getElementById('status');
const mission=document.getElementById('mission');
const errorEl=document.getElementById('error');
const bark=document.getElementById('bark');

const ORIGIN={lat:59.380767,lon:13.50295};
const MALL={lat:59.37988,lon:13.50055};
const OLEARYS={lat:59.380512,lon:13.503791};
const MARIEBERG={lat:59.36883,lon:13.48725};
const RADIUS=260;
const REMOTE_HERO_RADIUS=500;
const PLAYER_RADIUS=0.42;
const EYE=1.68;
const CORE_LOCK=Object.freeze({version:'1.3.0',baseline:'1.2.2',lookSensitivity:.12,walkSpeed:7.2,sprintMultiplier:1.55,jumpVelocity:6.2,gravity:16,playerRadius:.42,mobileMaxPixelRatio:1.25,desktopMaxPixelRatio:1.6,maxBuildings:95,detailRadius:92});
window.KarlstadCoreLock=CORE_LOCK;
const GRAPHICS_PASS=Object.freeze({version:'1.7.0',core:'1.3.0',mode:'landmark-storefront',heroBudget:8,rule:'no-core-feel-changes'});
window.KarlstadGraphicsPass=GRAPHICS_PASS;
const TOUCH_TUNE=Object.freeze({deadzone:.13,expo:.42,maxStick:.34,lookScale:.9});
const fpsLook=new FpsLook({span:Math.min(window.innerWidth,window.innerHeight)});
let oneHand=matchMedia('(pointer:coarse)').matches;
try{const saved=JSON.parse(localStorage.getItem('karlstad:fps-controls:v2')||'null');if(saved){fpsLook.sensitivity=Math.max(.45,Math.min(1.8,Number(saved.sensitivity)||1));fpsLook.mode=saved.mode==='stick'?'stick':'drag';}}catch{}
try{const hand=localStorage.getItem('karlstad:one-hand:1');if(hand!==null)oneHand=hand==='on';}catch{}
let app,player,camera,yaw=54,pitch=-5;
let vy=0,onGround=true;
let colliders=[];
let moveX=0,moveY=0;
let lookDX=0,lookDY=0;
const keys=new Set();
let objectiveMarker=null,objectiveLight=null;
let pickups=[];
let pickupCount=0;
let cityPower=0;
let barkTimer=0;
let audioCtx=null;
let lowFpsSeconds=0;
let bootStage='module';
let lastRound=null;
let resetTouch=()=>{};

const MUSIC_STATE={
  ready:false,unlocked:false,muted:false,mode:'silent',fadeJobs:new Map(),roundTimer:0,
  main:null,arena:null,transition:null,zombie:null
};
function musicInit(){
  if(MUSIC_STATE.ready)return;
  const make=(file,loop=false)=>{const a=new Audio('./audio/'+file);a.preload='auto';a.loop=loop;a.playsInline=true;a.volume=0;return a};
  MUSIC_STATE.main=make('karlstad-main.mp3',true);
  MUSIC_STATE.arena=make('karlstad-arena-layer.mp3',false);
  MUSIC_STATE.transition=make('karlstad-zombie-transition.mp3',false);
  MUSIC_STATE.zombie=make('karlstad-zombie-main.mp3',true);
  MUSIC_STATE.ready=true;
  // Warm the browser cache without delaying PlayCanvas boot.
  for(const file of ['karlstad-main.mp3','karlstad-arena-layer.mp3','karlstad-zombie-transition.mp3','karlstad-zombie-main.mp3']){
    fetch('./audio/'+file,{cache:'force-cache'}).catch(()=>{});
  }
}
function musicCancelFade(a){
  const id=MUSIC_STATE.fadeJobs.get(a);if(id)cancelAnimationFrame(id);MUSIC_STATE.fadeJobs.delete(a);
}
function musicFade(a,to,ms=650,pauseAfter=false){
  if(!a)return;
  musicCancelFade(a);
  const target=MUSIC_STATE.muted?0:Math.max(0,Math.min(1,to));
  const from=Number.isFinite(a.volume)?a.volume:0,start=performance.now();
  const step=now=>{
    const k=Math.min(1,(now-start)/Math.max(1,ms)),e=k*k*(3-2*k);
    a.volume=Math.max(0,Math.min(1,from+(target-from)*e));
    if(k<1)MUSIC_STATE.fadeJobs.set(a,requestAnimationFrame(step));
    else{MUSIC_STATE.fadeJobs.delete(a);if(pauseAfter&&target<=.001){try{a.pause()}catch{}}}
  };
  MUSIC_STATE.fadeJobs.set(a,requestAnimationFrame(step));
}
function musicPlay(a,restart=false){
  if(!a||!MUSIC_STATE.unlocked)return;
  if(restart){try{a.currentTime=0}catch{}}
  const p=a.play();p?.catch?.(()=>{});
}
function musicUnlock(){
  musicInit();MUSIC_STATE.unlocked=true;
}
function musicCity(withArena=false){
  musicUnlock();clearTimeout(MUSIC_STATE.roundTimer);MUSIC_STATE.mode='city';
  if(MUSIC_STATE.transition){try{MUSIC_STATE.transition.pause();MUSIC_STATE.transition.currentTime=0}catch{}}
  musicFade(MUSIC_STATE.zombie,0,500,true);
  if(MUSIC_STATE.main){
    if(MUSIC_STATE.main.paused)musicPlay(MUSIC_STATE.main,false);
    musicFade(MUSIC_STATE.main,.23,850);
  }
  if(withArena&&MUSIC_STATE.arena){
    musicPlay(MUSIC_STATE.arena,true);musicFade(MUSIC_STATE.arena,.08,550);
    setTimeout(()=>{if(MUSIC_STATE.mode==='city')musicFade(MUSIC_STATE.arena,0,1800,true)},9000);
  }
}
function musicRoundStart(){
  musicUnlock();clearTimeout(MUSIC_STATE.roundTimer);MUSIC_STATE.mode='round';
  musicFade(MUSIC_STATE.arena,0,250,true);
  musicFade(MUSIC_STATE.main,.035,550,false);
  if(MUSIC_STATE.transition){
    MUSIC_STATE.transition.volume=MUSIC_STATE.muted?0:.58;
    musicPlay(MUSIC_STATE.transition,true);
  }
  MUSIC_STATE.roundTimer=setTimeout(()=>{
    if(MUSIC_STATE.mode!=='round')return;
    musicPlay(MUSIC_STATE.zombie,true);musicFade(MUSIC_STATE.zombie,.25,900);
    musicFade(MUSIC_STATE.main,0,600,true);
  },900);
}
function musicRoundEnd(){
  clearTimeout(MUSIC_STATE.roundTimer);MUSIC_STATE.mode='results';
  musicFade(MUSIC_STATE.zombie,0,800,true);
  musicFade(MUSIC_STATE.main,.13,1300,false);
}
function musicPause(){
  if(MUSIC_STATE.mode==='round')musicFade(MUSIC_STATE.zombie,.07,320,false);
  else if(MUSIC_STATE.mode==='city')musicFade(MUSIC_STATE.main,.08,320,false);
}
function musicResume(){
  if(MUSIC_STATE.mode==='round')musicFade(MUSIC_STATE.zombie,.25,420,false);
  else if(MUSIC_STATE.mode==='city')musicFade(MUSIC_STATE.main,.23,420,false);
}
function musicSetMuted(v){
  MUSIC_STATE.muted=!!v;
  if(MUSIC_STATE.muted){
    [MUSIC_STATE.main,MUSIC_STATE.arena,MUSIC_STATE.transition,MUSIC_STATE.zombie].forEach(a=>musicFade(a,0,120,false));
  }else if(MUSIC_STATE.mode==='round'){
    musicFade(MUSIC_STATE.zombie,.25,250,false);
  }else{
    musicFade(MUSIC_STATE.main,.23,250,false);
  }
}
const GAME_MUSIC=Object.freeze({
  init:musicInit,unlock:musicUnlock,city:musicCity,roundStart:musicRoundStart,roundEnd:musicRoundEnd,
  pause:musicPause,resume:musicResume,setMuted:musicSetMuted,
  snapshot:()=>({ready:MUSIC_STATE.ready,unlocked:MUSIC_STATE.unlocked,muted:MUSIC_STATE.muted,mode:MUSIC_STATE.mode})
});
window.KarlstadMusic=GAME_MUSIC;

function resetInput(){
  keys.clear(); moveX=moveY=lookDX=lookDY=0;
  resetTouch();
  const knob=document.querySelector('#joy i'); if(knob) knob.style.transform='';
}

function fail(e){
  console.error('[Karlstad boot]',bootStage,e);
  const raw=String(e&&e.stack?e.stack:e);
  const msg=raw.split('\n')[0].slice(0,180);
  errorEl.textContent='STEG: '+bootStage+'\n'+raw;
  errorEl.classList.add('show');
  loadText.textContent='Startfel · '+bootStage+' · '+msg;
  loadBar.style.width='100%';
  loading.classList.add('failed');
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
  metal:null,marker:null,windowCool:null,windowWarm:null,door:null,accent:null,concrete:null,
  olearysGreen:null,olearysDark:null,xp:null,energy:null
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
function addBollard(x,z){
  addCylinder('bollard',x,.42,z,.11,.84,M.metal);
  addCylinder('bollard-cap',x,.85,z,.13,.05,M.marking);
}
function addBench(x,z,rot=0){
  const seat=addBox('bench-seat',x,.48,z,2.2,.16,.62,M.heroDark);
  const back=addBox('bench-back',x,.92,z-.26,2.2,.72,.12,M.heroDark);
  const l1=addBox('bench-leg',x-.72,.25,z,.12,.5,.38,M.metal);
  const l2=addBox('bench-leg',x+.72,.25,z,.12,.5,.38,M.metal);
  [seat,back,l1,l2].forEach(e=>e.setEulerAngles(0,rot,0));
}
function addPlanter(x,z){
  addBox('planter',x,.34,z,1.35,.68,1.35,M.concrete);
  addSphere('planter-green',x,1.15,z,.62,M.tree);
}
function addPlazaPattern(){
  // Crisp paving seams make Stora Torget read as a designed plaza rather than one flat slab.
  for(let x=-28;x<=28;x+=7) addBox('plaza-seam-x',x,.044,0,.055,.012,52,M.marking);
  for(let z=-24;z<=24;z+=6) addBox('plaza-seam-z',0,.045,z,60,.012,.055,M.marking);

  // A strong center landmark gives the player a Duke-style orientation anchor.
  addBox('torget-landmark-base',0,.22,-3,4.2,.44,4.2,M.concrete);
  addCylinder('torget-landmark',0,2.5,-3,.72,4.7,M.hero);
  addSphere('torget-landmark-cap',0,5.08,-3,.9,M.marker);

  [[-18,-18,0],[18,-18,180],[-18,17,0],[18,17,180]].forEach(p=>addBench(p[0],p[1],p[2]));
  [[-25,-20],[25,-20],[-25,20],[25,20]].forEach(p=>addPlanter(p[0],p[1]));
  for(let z=-18;z<=18;z+=6){ addBollard(-31,z); addBollard(31,z); }
}
function addRoadDetails(){
  for(let z=-240;z<=240;z+=14) addBox('lane-dash-v',-26,.045,z,.16,.018,5.7,M.marking);
  for(let x=-240;x<=240;x+=14) addBox('lane-dash-h',x,.046,20,5.7,.018,.16,M.marking);
  [[-34,-7],[-18,-7],[-34,47],[-18,47]].forEach(p=>addBollard(p[0],p[1]));
}
function addRouteMarkers(){
  const [mx,mz]=localXY(MALL.lon,MALL.lat);
  const d=Math.hypot(mx,mz),steps=Math.max(3,Math.floor(d/17));
  for(let i=1;i<steps;i++){
    const t=i/steps;
    const x=mx*t,z=mz*t;
    const e=addCylinder('route-pip',x,.065,z,.18,.035,M.marker);
    e.__routePhase=i*.47;
  }
}
function showBark(text){
  if(!bark) return;
  bark.textContent=text;
  bark.classList.remove('show');
  void bark.offsetWidth;
  bark.classList.add('show');
  clearTimeout(barkTimer);
  barkTimer=setTimeout(()=>bark.classList.remove('show'),1350);
}
function rewardSound(kind){
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    if(!audioCtx) audioCtx=new AC();
    if(audioCtx.state==='suspended') audioCtx.resume();
    const now=audioCtx.currentTime;
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type='triangle';
    o.frequency.setValueAtTime(kind==='energy'?420:620,now);
    o.frequency.exponentialRampToValueAtTime(kind==='energy'?690:940,now+.11);
    g.gain.setValueAtTime(.0001,now);
    g.gain.exponentialRampToValueAtTime(.055,now+.012);
    g.gain.exponentialRampToValueAtTime(.0001,now+.14);
    o.connect(g);g.connect(audioCtx.destination);o.start(now);o.stop(now+.15);
  }catch(e){}
}
const PICKUP_BARKS=[
  'NU SNACKAR VI.',
  'KARLSTADKRAFT +',
  'EXAKT VAD JAG BEHÖVDE.',
  'GRATIS LOOT. TACKAR.',
  'FULL FART IGEN.',
  'DÄR SATT DEN.'
];
function addPickup(x,z,type='xp',value=25){
  const e=addSphere(type==='energy'?'energy-pickup':'xp-pickup',x,1.05,z,type==='energy'?.39:.32,type==='energy'?M.energy:M.xp);
  e.__baseY=1.05;
  e.__phase=pickups.length*.9;
  e.__type=type;
  e.__value=value;
  pickups.push(e);
}
function addGraphicsPass12(){
  addPlazaPattern();
  addRoadDetails();
  addRouteMarkers();
  // Small rewards make the square worth exploring rather than only crossing.
  addPickup(-12,-10,'xp',20);
  addPickup(12,-9,'energy',30);
  addPickup(-12,11,'xp',20);
  addPickup(12,10,'energy',30);
}
function addFacadePass12(b,hero,seed){
  const near=b.dist<CORE_LOCK.detailRadius;
  if(!near&&!hero) return;
  const cool=(seed&1)?M.windowCool:M.windowWarm;
  const frontZ=b.cz-b.sz/2-.035;
  const backZ=b.cz+b.sz/2+.035;
  const floors=Math.max(1,Math.min(4,Math.round(b.h/3.2)-1));
  for(let i=0;i<floors;i++){
    const y=3.0+i*2.85;
    if(y>b.h-.8) break;
    addBox((b.name||'building')+'-win-f-'+i,b.cx,y,frontZ,b.sx*.72,.64,.055,cool);
    addBox((b.name||'building')+'-win-b-'+i,b.cx,y,backZ,b.sx*.72,.64,.055,cool);
  }
  // Ground-floor rhythm: darker storefront plus a readable door/canopy.
  addBox((b.name||'building')+'-ground-band',b.cx,1.22,frontZ-.02,b.sx*.78,1.75,.07,M.heroDark);
  addBox((b.name||'building')+'-door',b.cx,1.12,frontZ-.065,1.25,2.15,.11,M.door);
  if(hero){
    addBox((b.name||'building')+'-accent',b.cx,b.h-.72,frontZ-.08,b.sx*.64,.42,.12,M.marker);
    addBox((b.name||'building')+'-canopy',b.cx,2.45,frontZ-.72,4.1,.18,1.5,M.accent);
  }
  if(/Domkyrka/i.test(b.name)){
    addBox('domkyrka-tower',b.cx,b.h+4.8,b.cz,4.2,9.6,4.2,M.stone);
    addCylinder('domkyrka-spire',b.cx,b.h+10.4,b.cz,.72,2.2,M.heroDark);
  }
}

function addHeroLandmarkPass14(b){
  // Graphics Pass 1.4 is intentionally static: reused primitive meshes/materials,
  // no textures, no new update loops and no changes to movement/camera/collision.
  const n=b.name||'';
  const frontZ=b.cz-b.sz/2-.11;
  const frontX=b.cx+b.sx/2+.11;
  const w=Math.max(4,Math.min(b.sx,18));

  if(/Mitt i City/i.test(n)){
    addBox('g14-mitt-glass-entry',b.cx,2.15,frontZ-.05,Math.min(8,w*.62),3.7,.12,M.glass);
    addBox('g14-mitt-sign',b.cx,4.75,frontZ-.13,Math.min(9,w*.7),.68,.14,M.accent);
    addBox('g14-mitt-canopy',b.cx,2.72,frontZ-.82,Math.min(7,w*.58),.16,1.55,M.heroDark);
    addPlanter(b.cx-4.8,frontZ-1.8); addPlanter(b.cx+4.8,frontZ-1.8);
    return;
  }

  if(/Domkyrka/i.test(n)){
    addBox('g14-dom-portal',b.cx,2.55,frontZ-.09,4.8,5.1,.16,M.stone);
    addBox('g14-dom-door',b.cx,1.95,frontZ-.19,2.35,3.75,.17,M.door);
    addBox('g14-dom-pilaster-l',b.cx-3.05,4.2,frontZ-.08,.42,7.8,.18,M.light);
    addBox('g14-dom-pilaster-r',b.cx+3.05,4.2,frontZ-.08,.42,7.8,.18,M.light);
    return;
  }

  if(/Rådhus|Radhus|Residens/i.test(n)){
    addBox('g14-radhus-cornice',b.cx,b.h-.6,frontZ-.08,w*.88,.42,.15,M.light);
    addBox('g14-radhus-portal',b.cx,1.7,frontZ-.18,2.25,3.25,.16,M.door);
    for(let i=-1;i<=1;i++) addBox('g14-radhus-window-'+i,b.cx+i*3.2,4.25,frontZ-.15,1.55,2.2,.12,M.windowCool);
    addBox('g14-radhus-side-accent',frontX,Math.min(5.2,b.h*.52),b.cz,.12,2.8,Math.min(7,b.sz*.55),M.stone);
    return;
  }

  if(/Sandgrund/i.test(n)){
    addBox('g14-sandgrund-glass',b.cx,2.45,frontZ-.12,Math.min(12,w*.82),4.1,.14,M.glass);
    addBox('g14-sandgrund-sign',b.cx,5.0,frontZ-.18,Math.min(8,w*.58),.56,.14,M.heroDark);
    addBox('g14-sandgrund-terrace',b.cx,.18,frontZ-2.2,Math.min(13,w*.86),.22,3.9,M.light);
  }
}

function addContentGraphicsPass15(){
  // Keep the 1.5 reward breadcrumbs, but the old O'Learys slab is retired.
  // The actual storefront is now owned by Landmark Storefront 1.7.
  const [ox,oz]=localXY(OLEARYS.lon,OLEARYS.lat);
  addPickup(ox-4.0,oz-4.8,'xp',25);
  addPickup(ox-4.0,oz+4.8,'energy',35);
  const [mx,mz]=localXY(MALL.lon,MALL.lat);
  addPickup(mx+7,mz+4,'xp',30);
}

function addOLearysStorefront17(){
  const [ox,oz]=localXY(OLEARYS.lon,OLEARYS.lat);
  const fx=ox-1.15;

  // A real storefront mass instead of the old thin green placeholder.
  addBox('o17-body',ox+1.45,2.65,oz,3.6,5.3,13.2,M.olearysDark);
  addBox('o17-facade',fx,2.65,oz,.28,5.3,12.8,M.olearysGreen);

  // Strong sign band and canopy.
  addBox('o17-sign-band',fx-.08,4.65,oz,.14,.78,10.8,M.marking);
  addBox('o17-sign-cap',fx-.12,5.22,oz,.12,.18,11.4,M.olearysGreen);
  addBox('o17-awning',fx-.72,2.95,oz,1.28,.18,9.8,M.olearysDark);

  // Door + three separate window bays to create a readable restaurant frontage.
  addBox('o17-door-frame',fx-.06,1.5,oz-3.65,.14,3.0,2.35,M.olearysDark);
  addBox('o17-door',fx-.11,1.5,oz-3.65,.08,2.7,1.75,M.door);
  addBox('o17-window-a',fx-.07,1.88,oz+.15,.10,2.55,3.25,M.windowWarm);
  addBox('o17-window-b',fx-.07,1.88,oz+3.75,.10,2.55,2.75,M.windowCool);
  addBox('o17-window-c',fx-.07,1.88,oz-6.1,.10,2.55,2.65,M.windowCool);
  addBox('o17-pilaster-a',fx-.02,2.7,oz-6.25,.22,5.0,.42,M.olearysDark);
  addBox('o17-pilaster-b',fx-.02,2.7,oz+6.25,.22,5.0,.42,M.olearysDark);

  // Projecting circular street sign.
  const badgeBack=addCylinder('o17-badge-back',fx-.95,4.05,oz-5.4,.72,.12,M.olearysDark);
  badgeBack.setEulerAngles(0,0,90);
  const badgeFace=addCylinder('o17-badge-face',fx-1.01,4.05,oz-5.4,.58,.08,M.marking);
  badgeFace.setEulerAngles(0,0,90);
  const badgeCore=addCylinder('o17-badge-core',fx-1.07,4.05,oz-5.4,.33,.06,M.olearysGreen);
  badgeCore.setEulerAngles(0,0,90);

  addBox('o17-threshold',fx-.88,.05,oz-3.65,1.35,.04,2.75,M.sidewalk);
  addPlanter(ox-.95,oz-6.5);
  addPlanter(ox-.95,oz+6.0);
}

function addLandmarkIdentityPass16(){
  // 1.7 keeps the locked gameplay core and upgrades landmark identity only.
  addOLearysStorefront17();

  // Mitt i City: make the entrance read as the shopping-hub objective at a glance.
  const [mx,mz]=localXY(MALL.lon,MALL.lat);
  addBox('g16-mitt-entry-glass',mx,2.35,mz-.72,7.8,4.25,.16,M.glass);
  addBox('g16-mitt-entry-header',mx,4.85,mz-.86,9.4,.72,.18,M.light);
  addBox('g16-mitt-entry-accent',mx,5.43,mz-.92,6.1,.18,.20,M.accent);
  addPlanter(mx-6.2,mz-2.2); addPlanter(mx+6.2,mz-2.2);

  // Sandgrund approach: a light promenade extension toward the real museum.
  // The actual OSM building is selectively admitted by addBuildings().
  addBox('g16-sandgrund-promenade',-8,.008,-338,8,.035,250,M.sidewalk);
  for(let z=-235;z>=-430;z-=38) addLamp(-12,z);

  // Mariebergsskogen is a destination marker in 1.6, not a full zone yet.
  // Use the real bearing, clamped to the edge of the current playable district.
  const [rx,rz]=localXY(MARIEBERG.lon,MARIEBERG.lat);
  const len=Math.hypot(rx,rz)||1, edge=RADIUS-24;
  const px=rx/len*edge, pz=rz/len*edge;
  addBox('g16-marieberg-gate-l',px-3.2,2.0,pz,.55,4.0,.55,M.trunk);
  addBox('g16-marieberg-gate-r',px+3.2,2.0,pz,.55,4.0,.55,M.trunk);
  addBox('g16-marieberg-gate-top',px,3.85,pz,7.0,.5,.65,M.park||M.tree);
  addSphere('g16-marieberg-marker',px,5.25,pz,.72,M.marker);
  addTree(px-5.6,pz+2.4,.8); addTree(px+5.4,pz+2.8,.9); addTree(px,pz+5.8,.82);
  addPickup(px,pz-3.2,'energy',40);
}

function addHeroLandmarkPass16(b){
  const n=b.name||'';
  if(/Sandgrund|Lars Lerin/i.test(n)){
    const frontZ=b.cz-b.sz/2-.16;
    const w=Math.max(7,Math.min(16,b.sx*.86));
    addBox('g16-sandgrund-glass-ribbon',b.cx,2.15,frontZ-.06,w,2.75,.14,M.windowCool);
    addBox('g16-sandgrund-white-band',b.cx,3.9,frontZ-.11,w*.96,.36,.17,M.light);
    addBox('g16-sandgrund-lerin-sign',b.cx,5.15,frontZ-.19,Math.min(10,w*.68),.72,.18,M.marker);
    addBox('g16-sandgrund-entry',b.cx,1.35,frontZ-.21,2.15,2.6,.18,M.door);
    addPlanter(b.cx-4.8,frontZ-1.9); addPlanter(b.cx+4.8,frontZ-1.9);
  }
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
  M.ground=mat(0x779a7e,0,.08);
  M.grass=mat(0x609b70,0,.05);
  M.plaza=mat(0xc1ad87,0,.12);
  M.building=mat(0xe2a17b,0,.2);
  M.stone=mat(0xcbbd97,0,.18);
  M.plaster=mat(0xf2d6a0,0,.16);
  M.brick=mat(0xd87960,0,.12);
  M.light=mat(0xf6e6bb,0,.2);
  M.glass=mat(0x517f8b,.15,.62);
  M.hero=mat(0xe6b467,0,.3);
  M.heroDark=mat(0x2d363b,.08,.5);
  M.road=mat(0x475763,0,.08);
  M.sidewalk=mat(0xa79b80,0,.1);
  M.marking=mat(0xe8e3d6,0,.18);
  M.tree=mat(0x388466,0,.05);
  M.trunk=mat(0x654a37,0,.08);
  M.metal=mat(0x3a4145,.2,.5);
  M.marker=mat(0xe7c149,0,.62);
  M.windowCool=mat(0x487e8a,.16,.78);
  M.windowWarm=mat(0xe5bb68,.08,.72);
  M.door=mat(0x263036,.12,.68);
  M.accent=mat(0xb33b30,.05,.38);
  M.concrete=mat(0x6c6e6a,0,.15);
  M.olearysGreen=mat(0x17623b,.02,.42);
  M.olearysDark=mat(0x12362b,.04,.5);
  M.xp=mat(0x5bc0eb,.04,.62);
  M.energy=mat(0xf4c542,.02,.68);

  // Big, cheap surfaces first: readable city structure without texture downloads.
  addBox('ground',0,-.35,-95,760,.6,950,M.ground);
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
  camera.addComponent('camera',{clearColor:new pc.Color(.53,.77,.86),nearClip:.05,farClip:620,fov:74});
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
  if(pc.FOG_LINEAR!==undefined && app.scene.fog){
    app.scene.fog.type=pc.FOG_LINEAR;
    app.scene.fog.color=new pc.Color(.53,.77,.86);
    app.scene.fog.start=185;
    app.scene.fog.end=470;
  }

  addStreetProps();
  // Enhancement passes are fail-soft: never let content detail kill the playable base scene.
  try { addGraphicsPass12(); } catch(e) { console.error('[Graphics 1.2 decorations skipped]',e); }
  try { addContentGraphicsPass15(); } catch(e) { console.error('[Content/Graphics 1.5 skipped]',e); }
  try { addLandmarkIdentityPass16(); } catch(e) { console.error('[Landmark Storefront 1.7 skipped]',e); }

  const [mx,mz]=localXY(MALL.lon,MALL.lat);
  objectiveMarker=addCylinder('mitt-i-city-marker',mx,5,mz,.72,10,M.marker);
  addBox('mitt-i-city-plaza',mx,.02,mz,19,.05,14,M.sidewalk);
  addCrosswalk(mx+12,mz,'z');
  const beacon=new pc.Entity('beacon');
  beacon.addComponent('light',{type:'omni',range:24,intensity:1.7,color:new pc.Color(1,.72,.22)});
  beacon.setPosition(mx,4.5,mz); app.root.addChild(beacon); objectiveLight=beacon;
  // Architectural target frame: readable from Stora Torget even before the player sees the mall facade.
  addBox('mitt-i-city-gate-left',mx-5.1,2.9,mz,1.0,5.8,1.0,M.heroDark);
  addBox('mitt-i-city-gate-right',mx+5.1,2.9,mz,1.0,5.8,1.0,M.heroDark);
  addBox('mitt-i-city-gate-top',mx,5.35,mz,11.2,.9,1.0,M.accent);
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
    const dist=Math.hypot(cx,cz);
    const remoteHero=/Sandgrund|Lars Lerin/i.test(t.name||t['building:name']||'');
    if(dist>RADIUS && !(remoteHero && dist<=REMOTE_HERO_RADIUS)) continue;
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
  const remote=items.filter(b=>b.dist>RADIUS&&/Sandgrund|Lars Lerin/i.test(b.name));
  const admitted=[...items.filter(b=>b.dist<=RADIUS).slice(0,CORE_LOCK.maxBuildings-remote.length),...remote];
  for(const b of admitted){
    if(Math.hypot(b.cx,b.cz)<9) continue;
    const hero=/Mitt i City|Domkyrka|Rådhus|Radhus|Residenset|Sandgrund|bibliotek|Wermland/i.test(b.name);
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
    try { addFacadePass12(b,hero,seed); } catch(e) { console.warn('[Facade detail skipped]',b.name||b.cx,e); }
    if(hero){ try { addHeroLandmarkPass14(b); } catch(e) { console.warn('[Graphics 1.4 hero detail skipped]',b.name||b.cx,e); } }
    if(hero){ try { addHeroLandmarkPass16(b); } catch(e) { console.warn('[Landmark Identity 1.6 hero detail skipped]',b.name||b.cx,e); } }

    colliders.push({name:b.name,height:b.h,minx:b.cx-b.sx/2-.15,maxx:b.cx+b.sx/2+.15,minz:b.cz-b.sz/2-.15,maxz:b.cz+b.sz/2+.15});
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
  window.addEventListener('keydown',e=>{if(lastRound?.blocksInput())return; keys.add(e.code); if(e.code==='Space'||e.code==='ArrowLeft'||e.code==='ArrowRight')e.preventDefault();});
  window.addEventListener('keyup',e=>keys.delete(e.code));
  canvas.addEventListener('click',()=>{if(!lastRound?.blocksInput()){try{canvas.requestPointerLock?.()?.catch?.(()=>{});}catch{}}});
  window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){lookDX+=e.movementX;lookDY+=e.movementY;}});
}
function installIosZoomGuard(){
  if(!(navigator.maxTouchPoints>0)) return;
  let lastTouchEnd=0,lastX=0,lastY=0;
  const editable=target=>target?.closest?.('input,textarea,select,[contenteditable="true"]');
  document.addEventListener('touchend',e=>{
    if(e.changedTouches.length!==1||editable(e.target)) return;
    const t=e.changedTouches[0],now=performance.now();
    const close=Math.hypot(t.clientX-lastX,t.clientY-lastY)<32;
    if(lastTouchEnd&&now-lastTouchEnd<360&&close) e.preventDefault();
    lastTouchEnd=now;lastX=t.clientX;lastY=t.clientY;
  },{passive:false,capture:true});
  document.addEventListener('dblclick',e=>{if(!editable(e.target))e.preventDefault();},{passive:false,capture:true});
  document.addEventListener('touchmove',e=>{if(e.touches.length>1)e.preventDefault();},{passive:false,capture:true});
  for(const type of ['gesturestart','gesturechange','gestureend']){
    document.addEventListener(type,e=>e.preventDefault(),{passive:false,capture:true});
  }
}

function setupTouch(){
  const joy=document.getElementById('joy'),knob=joy.querySelector('i'); let jp=null;
  function jm(x,y){
    const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=x-cx,dy=y-cy; const max=r.width*TOUCH_TUNE.maxStick,l=Math.hypot(dx,dy);
    if(l>max){dx*=max/l;dy*=max/l;}
    const mag=Math.min(1,(Math.hypot(dx,dy)/max));
    const live=Math.max(0,(mag-TOUCH_TUNE.deadzone)/(1-TOUCH_TUNE.deadzone));
    const curved=(1-TOUCH_TUNE.expo)*live+TOUCH_TUNE.expo*live*live;
    const dl=Math.hypot(dx,dy)||1;
    moveX=(dx/dl)*curved; moveY=(dy/dl)*curved;
    knob.style.transform='translate('+dx+'px,'+dy+'px)';
  }
  joy.addEventListener('pointerdown',e=>{if(lastRound?.blocksInput()||jp!==null)return;jp=e.pointerId;joy.setPointerCapture(jp);jm(e.clientX,e.clientY);e.preventDefault();});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===jp){jm(e.clientX,e.clientY);e.preventDefault();}});
  const je=e=>{if(jp!==null&&e.pointerId!==jp)return;jp=null;moveX=moveY=0;knob.style.transform='';};
  joy.addEventListener('pointerup',je);joy.addEventListener('pointercancel',je);

  const look=document.getElementById('look'),pad=document.getElementById('lookPad'); let lp=null;
  look.addEventListener('pointerdown',e=>{
    if(lastRound?.blocksInput()||!fpsLook.begin(e.pointerId,e.clientX,e.clientY))return;
    lp=e.pointerId;look.setPointerCapture(lp);pad.hidden=fpsLook.mode!=='stick';pad.style.left=e.clientX+'px';pad.style.top=e.clientY+'px';e.preventDefault();
  });
  look.addEventListener('pointermove',e=>{if(e.pointerId!==lp)return;fpsLook.move(lp,e.clientX,e.clientY);e.preventDefault();});
  const le=e=>{if(lp!==null&&e.pointerId!==lp)return;fpsLook.end(lp);lp=null;pad.hidden=true;};
  look.addEventListener('pointerup',le);look.addEventListener('pointercancel',le);
  joy.addEventListener('lostpointercapture',je);look.addEventListener('lostpointercapture',le);
  resetTouch=()=>{
    const oldJp=jp,oldLp=lp;jp=lp=null;fpsLook.reset();pad.hidden=true;
    if(oldJp!==null&&joy.hasPointerCapture(oldJp))joy.releasePointerCapture(oldJp);
    if(oldLp!==null&&look.hasPointerCapture(oldLp))look.releasePointerCapture(oldLp);
  };

  document.getElementById('jumpBtn').addEventListener('pointerdown',e=>{keys.add('Space');setTimeout(()=>keys.delete('Space'),100);e.preventDefault();});
  document.getElementById('useBtn').addEventListener('pointerdown',e=>{lastRound?.use();e.preventDefault();});
  document.getElementById('mapBtn').addEventListener('pointerdown',e=>{lastRound?.showMap();e.preventDefault();});
  document.getElementById('turnBtn').addEventListener('pointerdown',e=>{if(!lastRound?.blocksInput()){yaw=wrapYaw(yaw+180);player.setEulerAngles(0,yaw,0);}e.preventDefault();});
  const mode=document.getElementById('lookModeBtn'),sensitivity=document.getElementById('lookSensitivity');
  const settings=()=>{
    document.body.classList.toggle('one-hand',oneHand);
    document.getElementById('handModeBtn').textContent=oneHand?'EN HAND · AUTOELD':'TVÅ HÄNDER · MANUELL ELD';
    document.getElementById('handModeHint').textContent=oneHand?'En spak: upp/ned går, vänster/höger svänger. Solstötar avfyras när du siktar på en zombie. Ingen automatisk kameravridning.':'Vänster spak går och sidstegar. Svep till höger för blicken. Skjut med solknappen.';
    document.getElementById('pauseControlSummary').textContent=oneHand?'EN SPAK: upp/ned för att gå, vänster/höger för att svänga. AUTOELD: sikta på en zombie så skjuter du. Vid O’Learys skjuter autoeld först när knuffvinkeln är rätt. SUPER är valfri.':'VÄNSTER: gå och sidstega. HÖGER: vrid dig fritt. SOLSTÖT: tryck eller håll. SUPER: egen knapp, 40 energi. Sikthjälp vrider aldrig kameran.';
    mode.textContent=fpsLook.mode==='drag'?'SIKTA: SVEPA':'SIKTA: HÖGERSPAK';
    document.getElementById('lookHint').textContent=oneHand?'EN SPAK · GÅ OCH SVÄNG · AUTOELD':fpsLook.mode==='drag'?'SVEPA HÄR · VÄND 360°':'DRA OCH HÅLL · VÄND 360°';
    document.getElementById('lookSensitivityValue').textContent=Math.round(fpsLook.sensitivity*100)+'%';
    try{localStorage.setItem('karlstad:fps-controls:v2',JSON.stringify({mode:fpsLook.mode,sensitivity:fpsLook.sensitivity}));}catch{}
    try{localStorage.setItem('karlstad:one-hand:1',oneHand?'on':'off');}catch{}
  };
  sensitivity.value=String(fpsLook.sensitivity);
  sensitivity.addEventListener('input',()=>{fpsLook.sensitivity=Number(sensitivity.value);settings();});
  mode.addEventListener('click',()=>{fpsLook.reset();fpsLook.mode=fpsLook.mode==='drag'?'stick':'drag';settings();});settings();
  document.getElementById('handModeBtn').addEventListener('click',()=>{resetInput();oneHand=!oneHand;pitch=-2;settings();});
}

function update(dt){
  if(lastRound?.blocksInput()){lastRound.update();return;}
  const sens=CORE_LOCK.lookSensitivity;
  const now=performance.now()*.001;
  fpsLook.span=Math.min(window.innerWidth,window.innerHeight);
  const touch=fpsLook.consume(dt),turnKeys=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),thumb=oneHand?oneThumbIntent(moveX,moveY):null;
  yaw=wrapYaw(yaw-lookDX*sens-touch.x-turnKeys*150*dt-(thumb?.turn||0)*fpsLook.sensitivity*dt);
  pitch=Math.max(-78,Math.min(78,pitch-lookDY*sens-touch.y));lookDX=lookDY=0;
  player.setEulerAngles(0,yaw,0); camera.setLocalEulerAngles(pitch,0,0);

  let ix=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+(thumb?0:moveX);
  let iz=(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0)+moveY;
  const len=Math.hypot(ix,iz); if(len>1){ix/=len;iz/=len;}
  const sprint=keys.has('ShiftLeft')?CORE_LOCK.sprintMultiplier:1;
  const speed=CORE_LOCK.walkSpeed*sprint;
  const a=yaw*Math.PI/180;
  const dx=(ix*Math.cos(a)+iz*Math.sin(a))*speed*dt;
  const dz=(-ix*Math.sin(a)+iz*Math.cos(a))*speed*dt;
  tryMove(dx,dz);

  if(onGround&&keys.has('Space')){vy=CORE_LOCK.jumpVelocity;onGround=false;}
  vy-=CORE_LOCK.gravity*dt;
  const p=player.getPosition(); p.y+=vy*dt;
  if(p.y<=EYE){p.y=EYE;vy=0;onGround=true;} player.setPosition(p);

  const [mx,mz]=localXY(MALL.lon,MALL.lat);
  const d=Math.hypot(p.x-mx,p.z-mz);

  // Animated landmark + pickups: low-cost motion gives the scene a living focal point.
  if(objectiveMarker) objectiveMarker.setEulerAngles(0,(now*34)%360,0);
  if(objectiveLight&&objectiveLight.light) objectiveLight.light.intensity=1.45+Math.sin(now*2.2)*.28;
  pickups.forEach((e,i)=>{
    if(lastRound?.isJourney?.()){e.enabled=false;return;}
    if(!e.enabled) return;
    e.setLocalEulerAngles(0,(now*80+i*33)%360,0);
    const ep=e.getPosition();
    e.setPosition(ep.x,e.__baseY+Math.sin(now*2.4+e.__phase)*.16,ep.z);
    if(Math.hypot(p.x-ep.x,p.z-ep.z)<1.35){
      e.enabled=false; pickupCount++; cityPower+=e.__value||0;
      lastRound?.onPickup(e.__type,e.__value||0);
      rewardSound(e.__type);
      const barkText=PICKUP_BARKS[(pickupCount-1)%PICKUP_BARKS.length]+(e.__type==='energy'?' ENERGI +'+e.__value:' XP +'+e.__value);
      showBark(barkText);
      mission.textContent=(e.__type==='energy'?'ENERGI':'XP')+' +'+e.__value+' · POWER '+cityPower;
    }
  });

  const [ox,oz]=localXY(OLEARYS.lon,OLEARYS.lat);
  const od=Math.hypot(p.x-ox,p.z-oz);
  const fps=Math.round(app.stats.frame.fps);
  status.textContent='FPS '+fps+'\nMITT I CITY '+Math.round(d)+' m\nPOWER '+cityPower+' · '+pickupCount+'/'+pickups.length;
  if(od<9 && d>=8) mission.textContent="O'LEARYS · TINGVALLAGATAN 9 · LANDMARK";
  if(d<8) mission.textContent='MÅL NÅTT · MITT I CITY · CORE LOCK 1.3';
  lastRound?.update();
}

async function boot(){
  try{
    bootStage='PlayCanvas Application';
    loadText.textContent='Initierar PlayCanvas…'; loadBar.style.width='18%';
    app=new pc.Application(canvas,{graphicsDeviceOptions:{alpha:false,antialias:true,powerPreference:'high-performance'}});
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);

    bootStage='iPhone renderbuffer';
    loadText.textContent='Förbereder grafik…'; loadBar.style.width='28%';
    // Keep the iPhone 11 path conservative. DPR is an optional quality boost, not a boot requirement.
    try{
      const coarse=window.matchMedia&&matchMedia('(pointer:coarse)').matches;
      app.graphicsDevice.maxPixelRatio=Math.min(window.devicePixelRatio||1,coarse?CORE_LOCK.mobileMaxPixelRatio:CORE_LOCK.desktopMaxPixelRatio);
      app.setCanvasResolution(pc.RESOLUTION_AUTO);
    }catch(e){
      console.warn('[DPR fallback]',e);
      app.setCanvasResolution(pc.RESOLUTION_AUTO);
    }

    bootStage='Grundscen';
    loadText.textContent='Bygger Stora Torget…'; loadBar.style.width='40%';
    initScene();

    bootStage='Karlstad geodata';
    loadText.textContent='Läser Karlstads geodata…'; loadBar.style.width='55%';
    const r=await fetch('../karlstad-city-mobile/data/osm-buildings.json',{cache:'force-cache'});
    if(!r.ok) throw new Error('OSM '+r.status);
    const osm=await r.json();
    bootStage='Byggnader';
    const n=addBuildings(osm);
    loadText.textContent='Lägger Core Lock 1.3 + Landmark Storefront 1.7… '+n+' byggnader'; loadBar.style.width='82%';

    bootStage='Kontroller';
    setupDesktop();installIosZoomGuard();setupTouch();
    bootStage='Sista rundan';
    musicInit();
    const [ox,oz]=localXY(OLEARYS.lon,OLEARYS.lat);
    const [mx,mz]=localXY(MALL.lon,MALL.lat);
    lastRound=createLastRound(pc,{
      app,player,camera,canvas,origin:{x:ox,z:oz},mall:{x:mx,z:mz},colliders,blocked,resetInput,music:GAME_MUSIC,
      pickupCount:()=>pickupCount,
      oneHand:()=>oneHand,
      ridePose:pose=>{player.setPosition(pose.x,2.4,pose.z);yaw=pose.heading;pitch=-2;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,pose.roll);},
      resetPickups:()=>{pickups.forEach(e=>e.enabled=true);pickupCount=0;cityPower=0;},
      teleport:(x,z,heading,tilt)=>{resetInput();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=heading;pitch=tilt;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);}
    });
    app.on('update',update);

    bootStage='Startar spel';
    app.start();
    addEventListener('resize',()=>app.resizeCanvas());
    bootStage='Klar';
    setTimeout(()=>{loadBar.style.width='100%';loading.classList.add('hide');},350);
  }catch(e){fail(e);}
}
boot();
