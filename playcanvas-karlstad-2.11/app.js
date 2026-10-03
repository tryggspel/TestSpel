import * as pc from 'https://cdn.jsdelivr.net/npm/playcanvas@2.22.4/build/playcanvas.mjs';
import {createLastRound} from './last-round.js?v=2.11.5';
import {FpsLook, wrapYaw,oneThumbIntent,stickSprint} from './fps-controls.mjs?v=2.11.5';
import {cityBuildings,infillBuildings,IDENTITY_IDS} from './city-geography.mjs?v=2.11.5';
import {createCityArchitecture,createInfill,coreContourBuildings} from './city-architecture.js?v=2.11.5';
import {createCityEnvironment} from './city-environment.mjs?v=2.11.5';
import {INNERSTAD_REFERENCE_IDS} from './innerstad-reference.mjs?v=2.11.5';
import {ColliderGrid} from './collider-grid.mjs?v=2.11.5';
import {onVastraBron} from './city-water.mjs?v=2.11.5';
import {createRiverArchitecture} from './river-architecture.js?v=2.11.5';
import {createMallArchitecture} from './mall-architecture.js?v=2.11.5';
import {MallWalk,MALL_BUILDING_IDS,MALL_ENTRANCES,mallPassage,mallGroundBlocked,splitMallWall} from './mall-space.mjs?v=2.11.5';
import {createParkArchitecture} from './park-architecture.js?v=2.11.5';
import {atKil,KIL} from './scenic-transit.js?v=2.11.5';
import {createSouthCity} from './city-south.js?v=2.11.5';
import {SOUTH_IDS,footprintContains,southWaterBlocked,mariebergBlocked,southPassage} from './city-south-space.mjs?v=2.11.5';
import {waterBlocked} from './park-space.mjs?v=2.11.5';
import {GAME_VERSION,DEBUG,PERF} from './build-info.mjs?v=2.11.5';
import {createAudioEngine} from './audio-engine.mjs?v=2.11.5';
import {createPerfProbe,mountPerfOverlay} from './perf-probe.mjs?v=2.11.5';

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
const GRAPHICS_PASS=Object.freeze({version:GAME_VERSION,core:'1.3.0',mode:'geographic-comic-city',heroBudget:9,rule:'no-core-feel-changes'});
window.KarlstadGraphicsPass=GRAPHICS_PASS;
const TOUCH_TUNE=Object.freeze({deadzone:.13,expo:.42,maxStick:.34,lookScale:.9});
const fpsLook=new FpsLook({span:Math.min(window.innerWidth,window.innerHeight)});
let oneHand=matchMedia('(pointer:coarse)').matches;
try{const saved=JSON.parse(localStorage.getItem('karlstad:fps-controls:v2')||'null');if(saved){fpsLook.sensitivity=Math.max(.45,Math.min(1.8,Number(saved.sensitivity)||1));fpsLook.mode=saved.mode==='stick'?'stick':'drag';}}catch{}
try{const hand=localStorage.getItem('karlstad:one-hand:1');if(hand!==null)oneHand=hand==='on';}catch{}
let app,player,camera,yaw=54,pitch=-5;
let vy=0,onGround=true;
const mallWalk=new MallWalk();
let mallGraphics=null;
let colliders=[];
let colliderGrid=null;
let southGate=colliders; // 2.11: southPassage letade igenom alla byggnader vid varje anrop
let moveX=0,moveY=0,touchSprint=false;
let lookDX=0,lookDY=0;
const keys=new Set();
let objectiveMarker=null,objectiveLight=null;
let pickups=[];
let pickupCount=0;
let cityPower=0;
let barkTimer=0;
let lowFpsSeconds=0;
let bootStage='module';
let lastRound=null;
let perf=null;
let resetTouch=()=>{};

// 2.10: all musik går genom audio-engine.mjs (GainNode) eftersom iOS ignorerar <audio>.volume.
const AUDIO=createAudioEngine({storage:(()=>{try{return localStorage;}catch{return null;}})()});
const MUSIC_STATE={ready:false,unlocked:false,mode:'silent',roundTimer:0,arenaTimer:0};
function musicInit(){
  if(MUSIC_STATE.ready)return;
  AUDIO.track('main','./audio/karlstad-main.mp3',{loop:true});
  AUDIO.track('arena','./audio/karlstad-arena-layer.mp3');
  AUDIO.track('transition','./audio/karlstad-zombie-transition.mp3');
  AUDIO.track('zombie','./audio/karlstad-zombie-main.mp3',{loop:true});
  MUSIC_STATE.ready=true;
}
function musicUnlock(){musicInit();AUDIO.context();AUDIO.resume();MUSIC_STATE.unlocked=true;}
function musicCity(withArena=false){
  musicUnlock();clearTimeout(MUSIC_STATE.roundTimer);clearTimeout(MUSIC_STATE.arenaTimer);MUSIC_STATE.mode='city';
  AUDIO.stop('transition');
  AUDIO.fade('zombie',0,500,{pauseAfter:true});
  AUDIO.play('main');AUDIO.fade('main',.23,850);
  if(withArena){
    AUDIO.play('arena',{restart:true});AUDIO.fade('arena',.08,550);
    MUSIC_STATE.arenaTimer=setTimeout(()=>{if(MUSIC_STATE.mode==='city')AUDIO.fade('arena',0,1800,{pauseAfter:true});},9000);
  }
}
function musicRoundStart(){
  musicUnlock();clearTimeout(MUSIC_STATE.roundTimer);clearTimeout(MUSIC_STATE.arenaTimer);MUSIC_STATE.mode='round';
  AUDIO.fade('arena',0,250,{pauseAfter:true});
  AUDIO.fade('main',.035,550);
  AUDIO.fade('transition',.58,10);AUDIO.play('transition',{restart:true});
  MUSIC_STATE.roundTimer=setTimeout(()=>{
    if(MUSIC_STATE.mode!=='round')return;
    AUDIO.play('zombie',{restart:true});AUDIO.fade('zombie',.25,900);AUDIO.fade('main',0,600,{pauseAfter:true});
  },900);
}
function musicRoundEnd(){
  clearTimeout(MUSIC_STATE.roundTimer);MUSIC_STATE.mode='results';
  AUDIO.fade('zombie',0,800,{pauseAfter:true});
  AUDIO.play('main');AUDIO.fade('main',.13,1300);
}
function musicPause(){
  if(MUSIC_STATE.mode==='round')AUDIO.fade('zombie',.07,320);
  else if(MUSIC_STATE.mode==='city')AUDIO.fade('main',.08,320);
}
function musicResume(){
  AUDIO.resume();
  if(MUSIC_STATE.mode==='round')AUDIO.fade('zombie',.25,420);
  else if(MUSIC_STATE.mode==='city')AUDIO.fade('main',.23,420);
}
function musicSetMuted(v){AUDIO.setMuted(v);}
const GAME_MUSIC=Object.freeze({
  init:musicInit,unlock:musicUnlock,city:musicCity,roundStart:musicRoundStart,roundEnd:musicRoundEnd,
  pause:musicPause,resume:musicResume,setMuted:musicSetMuted,
  get muted(){return AUDIO.muted;},
  // Spelets korta effektljud (last-round.js) delar samma AudioContext och mute.
  sfx:opts=>AUDIO.blip(opts),
  snapshot:()=>({ready:MUSIC_STATE.ready,unlocked:MUSIC_STATE.unlocked,mode:MUSIC_STATE.mode,...AUDIO.snapshot()})
});
window.KarlstadMusic=GAME_MUSIC;
// iOS kan pausa ljudkontexten (samtal, låsskärm). Återuppta vid nästa beröring.
addEventListener('pointerdown',()=>{if(MUSIC_STATE.unlocked)AUDIO.resume();},{passive:true});

function resetInput(){
  keys.clear(); moveX=moveY=lookDX=lookDY=0; touchSprint=false; document.getElementById('joy')?.classList.remove('sprint');
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

  [[-18,-18,0],[18,-18,180],[-18,17,0],[18,17,180]].forEach(p=>addBench(p[0],p[1],p[2]));
  [[-25,-20],[25,-20],[-25,20],[25,20]].forEach(p=>addPlanter(p[0],p[1]));
  for(let z=-18;z<=18;z+=6){ addBollard(-31,z); addBollard(31,z); }
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
  AUDIO.blip(kind==='energy'?{from:420,to:690,attack:.012,length:.14}:{from:620,to:940,attack:.012,length:.14});
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
  // Route guidance is owned by the active mission; no competing legacy trail.
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

function addLandmarkIdentityPass16(){
  // Real storefronts are attached to their address's OSM facade by the 2.6 pass.

  // Sandgrund approach: a light promenade extension toward the real museum.
  // The actual OSM building is selectively admitted by addBuildings().
  for(let z=-240;z>=-430;z-=38) addLamp(-63+(Math.abs(z)-240)*.035,z);


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
  addBox('ground',0,-.35,170,1080,.6,980,M.ground);
  // Roads and square paving are built together from actual street lines after OSM loads.

  player=new pc.Entity('player');
  player.setPosition(0,EYE,0);
  app.root.addChild(player);

  camera=new pc.Entity('camera');
  camera.addComponent('camera',{clearColor:new pc.Color(.53,.77,.86),nearClip:.12,farClip:620,fov:74});
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

  // Mitt i City now uses its four real street entrances and a walkable interior.
}

function addBuildings(osm,environment){
  const admitted=cityBuildings(osm,CORE_LOCK.maxBuildings);
  const contourIds=new Set(coreContourBuildings(admitted).map(b=>b.osm));
  const cityMats=[M.stone,M.plaster,M.brick,M.light,M.building];
  for(const b of admitted){
    const identity=IDENTITY_IDS.has(b.osm);
    const hero=/Mitt i City|Residenset|Wermland/i.test(b.name);
    const seed=hashStr((b.name||'byggnad')+'|'+Math.round(b.cx)+'|'+Math.round(b.cz));
    if(!identity&&b.osm!==234271401&&MALL_BUILDING_IDS.has(b.osm)){
      const cut=splitMallWall(b),colour=cityMats[seed%cityMats.length];
      for(const q of cut.pieces)addBox('Mitt i City · kvartersfasad',(q.minx+q.maxx)/2,b.h/2,(q.minz+q.maxz)/2,q.maxx-q.minx,b.h,q.maxz-q.minz,colour);
      for(const q of cut.openings)addBox('Mitt i City · entrévalv',(q.minx+q.maxx)/2,(b.h+3.4)/2,(q.minz+q.maxz)/2,q.maxx-q.minx,b.h-3.4,q.maxz-q.minz,colour);
    }else if(!identity&&b.osm!==234271401&&!contourIds.has(b.osm)&&!INNERSTAD_REFERENCE_IDS.has(b.osm)){
      addBox(b.name||'building',b.cx,b.h/2,b.cz,b.sx,b.h,b.sz,hero?M.hero:cityMats[seed%cityMats.length]);
      if(hero||b.dist<92)addBox((b.name||'building')+'-shopfront',b.cx,1.25,b.cz,b.sx*1.002,2.35,b.sz*1.002,hero?M.heroDark:M.glass);
      if(hero)addBox((b.name||'building')+'-roof',b.cx,b.h+.18,b.cz,b.sx*1.03,.32,b.sz*1.03,M.heroDark);
      addFacadePass12(b,hero,seed);
      if(hero)addHeroLandmarkPass14(b);
    }
    colliders.push({precise:[77107220,100024120,100024325].includes(b.osm),polygon:b.polygon,osm:b.osm,name:b.name,height:b.h,minx:b.minx-.15,maxx:b.maxx+.15,minz:b.minz-.15,maxz:b.maxz+.15});
  }
  // 2.11: resten av kvarteren från OSM-utdraget (kollision mot exakt fotavtryck).
  const infill=infillBuildings(osm,admitted);
  for(const b of infill)colliders.push({precise:true,infill:true,polygon:b.polygon,osm:b.osm,name:b.name,height:b.h,minx:b.minx-.15,maxx:b.maxx+.15,minz:b.minz-.15,maxz:b.maxz+.15});
  colliderGrid=new ColliderGrid(colliders);southGate=colliders.filter(b=>b.osm===80868525);
  const infillGraphics=createInfill(pc,app,infill),river=createRiverArchitecture(pc,app);
  const geometry=createCityArchitecture(pc,app,admitted),environmentGraphics=createCityEnvironment(pc,app,environment),south=createSouthCity(pc,app,admitted);
  mallGraphics=createMallArchitecture(pc,app,admitted);const {update:animateMall,...mall}=mallGraphics,park=createParkArchitecture(pc,app);
  window.KarlstadArchitecture=Object.freeze({...geometry,buildings:admitted.length,infill:infillGraphics,environment:environmentGraphics,river,mall,park,south,staticDrawCalls:geometry.staticDrawCalls+mall.staticDrawCalls+park.staticDrawCalls+south.staticDrawCalls+infillGraphics.staticDrawCalls+environmentGraphics.staticDrawCalls+river.staticDrawCalls});
  return admitted.length+infill.length;
}

function blocked(x,z){
  if(atKil({x,z}))return !(x>KIL.x-48&&x<KIL.x+48&&z>KIL.z-4&&z<KIL.z+24);
  const remote=mariebergBlocked(x,z);if(remote!==null)return remote;
  if(waterBlocked(x,z)||(southWaterBlocked(x,z)&&!onVastraBron(x,z)))return true;
  if(southPassage(x,z,southGate))return false;
  if(mallPassage(x,z))return mallGroundBlocked(x,z);
  for(const c of colliderGrid?colliderGrid.near(x,z,PLAYER_RADIUS+.5):colliders){
    if(x+PLAYER_RADIUS<=c.minx||x-PLAYER_RADIUS>=c.maxx||z+PLAYER_RADIUS<=c.minz||z-PLAYER_RADIUS>=c.maxz)continue;
    if(c.precise){if(footprintContains(x,z,c.polygon)||footprintContains(x+.42,z,c.polygon)||footprintContains(x-.42,z,c.polygon)||footprintContains(x,z+.42,c.polygon)||footprintContains(x,z-.42,c.polygon))return true;continue;}
    return true;
  }
  return false;
}
function tryMove(dx,dz,dt){
  const p=player.getPosition();
  const indoor=mallWalk.move(p,dx,dz,dt,blocked);
  if(indoor){player.setPosition(indoor.x,indoor.y,indoor.z);return;}
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
    touchSprint=stickSprint(l,max,moveY);joy.classList.toggle('sprint',touchSprint);
    knob.style.transform='translate('+dx+'px,'+dy+'px)';
  }
  joy.addEventListener('pointerdown',e=>{if(lastRound?.blocksInput()||jp!==null)return;jp=e.pointerId;joy.setPointerCapture(jp);jm(e.clientX,e.clientY);e.preventDefault();});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===jp){jm(e.clientX,e.clientY);e.preventDefault();}});
  const je=e=>{if(jp!==null&&e.pointerId!==jp)return;jp=null;moveX=moveY=0;touchSprint=false;joy.classList.remove('sprint');knob.style.transform='';};
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
    document.getElementById('handModeHint').textContent=oneHand?'En spak: upp/ned går, vänster/höger svänger. Dra tummen förbi kanten framåt för att springa. Solstötar avfyras när du siktar på en zombie. Ingen automatisk kameravridning.':'Vänster spak går och sidstegar; dra förbi kanten framåt för att springa. Svep till höger för blicken. Skjut med solknappen.';
    document.getElementById('pauseControlSummary').textContent=oneHand?'EN SPAK: upp/ned för att gå, vänster/höger för att svänga. AUTOELD: sikta på en zombie så skjuter du. Vid O’Learys skjuter autoeld först när knuffvinkeln är rätt. SUPER är valfri.':'VÄNSTER: gå och sidstega. HÖGER: vrid dig fritt. SOLSTÖT: tryck eller håll. SUPER: egen knapp, 40 energi. Sikthjälp vrider aldrig kameran.';
    mode.textContent=fpsLook.mode==='drag'?'SIKTA: SVEPA':'SIKTA: HÖGERSPAK';
    document.getElementById('lookHint').textContent=oneHand?'EN SPAK · DRA UT FRAMÅT = SPRING · AUTOELD':fpsLook.mode==='drag'?'SVEPA HÄR · VÄND 360°':'DRA OCH HÅLL · VÄND 360°';
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
  const sprint=(keys.has('ShiftLeft')||keys.has('ShiftRight')||touchSprint)?CORE_LOCK.sprintMultiplier:1;
  // 2.11: på en Ryde ersätts sprint av scooterns fart (gåkärnan 1.3.0 är oförändrad till fots).
  const ride=lastRound?.rideSpeed?.()||0;
  const speed=ride?CORE_LOCK.walkSpeed*ride:CORE_LOCK.walkSpeed*sprint;
  const a=yaw*Math.PI/180;
  const dx=(ix*Math.cos(a)+iz*Math.sin(a))*speed*dt;
  const dz=(-ix*Math.sin(a)+iz*Math.cos(a))*speed*dt;
  tryMove(dx,dz,dt);

  if(onGround&&keys.has('Space')&&!ride){vy=CORE_LOCK.jumpVelocity;onGround=false;}
  vy-=CORE_LOCK.gravity*dt;
  const p=player.getPosition(); p.y+=vy*dt;
  const floor=mallWalk.height;
  if(p.y<=EYE+floor){p.y=EYE+floor;vy=0;onGround=true;} player.setPosition(p);
  mallGraphics?.update(dt,p);

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
    }
  });

  // 2.10: statusraden/uppdragsraden skrivs bara av last-round (var 80:e ms). Tidigare skrev
  // app.js samma element varje frame och de två loopar skrev över varandra.
  if(perf){perf.overlay.update();perf.probe.sample(performance.now(),app.stats?.drawCalls?.total);}
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
    const [r,environmentResponse]=await Promise.all([fetch('./data/osm-buildings.json?v='+GAME_VERSION),fetch('./data/osm-environment.json?v='+GAME_VERSION)]);
    if(!r.ok) throw new Error('OSM '+r.status);
    const osm=await r.json(),environment=environmentResponse.ok?await environmentResponse.json():{elements:[]};
    bootStage='Byggnader';
    const n=addBuildings(osm,environment);
    loadText.textContent='Bygger Karlstad… '+n+' byggnader'; loadBar.style.width='82%';

    bootStage='Kontroller';
    setupDesktop();installIosZoomGuard();setupTouch();
    bootStage='Sista rundan';
    musicInit();
    const [ox,oz]=localXY(OLEARYS.lon,OLEARYS.lat);
    const [mx,mz]=localXY(MALL.lon,MALL.lat);
    lastRound=createLastRound(pc,{
      app,player,camera,canvas,origin:{x:ox,z:oz},mall:{x:MALL_ENTRANCES[0].x,z:MALL_ENTRANCES[0].z},colliders,blocked,resetInput,music:GAME_MUSIC,mallWalk,
      pickupCount:()=>pickupCount,
      oneHand:()=>oneHand,
      ridePose:pose=>{player.setPosition(pose.x,2.4,pose.z);yaw=pose.heading;pitch=-14;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,pose.roll);},
      resetPickups:()=>{pickups.forEach(e=>e.enabled=true);pickupCount=0;cityPower=0;},
      teleport:(x,z,heading,tilt)=>{resetInput();mallWalk.reset();vy=0;onGround=true;player.setPosition(x,EYE,z);yaw=heading;pitch=tilt;player.setEulerAngles(0,yaw,0);camera.setLocalEulerAngles(pitch,0,0);}
    });
    app.on('update',update);

    if(PERF){
      const probe=createPerfProbe({seconds:60});
      perf={probe,overlay:mountPerfOverlay(document,probe,()=>({version:GAME_VERSION,dpr:app.graphicsDevice.maxPixelRatio,canvas:canvas.width+'×'+canvas.height,ua:navigator.userAgent}))};
    }
    document.body.classList.toggle('debug',DEBUG);
    document.querySelectorAll('.game-version').forEach(el=>{el.textContent=GAME_VERSION;});
    bootStage='Startar spel';
    app.start();
    addEventListener('resize',()=>app.resizeCanvas());
    bootStage='Klar';
    setTimeout(()=>{loadBar.style.width='100%';loading.classList.add('hide');},350);
  }catch(e){fail(e);}
}
boot();
