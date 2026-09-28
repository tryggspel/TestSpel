(()=>{'use strict';
const B=window.BABYLON;
if(!B)return;

const TOUCH=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>1;
const ORIGIN={lat:59.380767,lon:13.50295};
const MLON=111320*Math.cos(ORIGIN.lat*Math.PI/180),MLAT=110540;
const local=(lon,lat)=>new B.Vector3((lon-ORIGIN.lon)*MLON,0,-(lat-ORIGIN.lat)*MLAT);
const CITY={
  population:99007,
  populationDate:'31 DEC 2025',
  populationSource:'KARLSTADS KOMMUN',
  weather:null,
  traffic:{level:'NORMAL',factor:.62,source:'TIDSBASERAD MODELL'},
  walkers:[],
  cars:[],
  parked:[],
  puddles:[],
  routes:[],
  mats:{},
  ready:false,
  lastUi:0
};

function waitScene(){
  return new Promise(resolve=>{
    let n=0;
    const t=setInterval(()=>{
      const scene=B.Engine?.LastCreatedScene;
      if(scene?.activeCamera){clearInterval(t);resolve(scene)}
      else if(++n>240){clearInterval(t);resolve(null)}
    },50);
  });
}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function weatherText(code){
  if(code===0)return'SOL';
  if(code<=3)return'MOLN';
  if([45,48].includes(code))return'DIMMA';
  if(code>=51&&code<=67)return'REGN';
  if(code>=71&&code<=77)return'SNÖ';
  if(code>=80&&code<=82)return'SKURAR';
  if(code>=95)return'ÅSKA';
  return'VÄXLANDE';
}
function trafficModel(){
  const d=new Date(),h=d.getHours(),day=d.getDay();
  let factor=.52,label='NORMAL';
  if(day===0||day===6){factor=.42;label='LUGN'}
  else if((h>=7&&h<9)||(h>=15&&h<18)){factor=.92;label='HÖG'}
  else if(h>=10&&h<15){factor=.66;label='NORMAL'}
  else if(h>=22||h<6){factor=.24;label='LÅG'}
  if(CITY.weather?.weather_code>=51&&CITY.weather?.weather_code<=82)factor*=.88;
  CITY.traffic={level:label,factor:clamp(factor,.18,1),source:'TIDSBASERAD MODELL'};
}
async function loadWeather(){
  const url='https://api.open-meteo.com/v1/forecast?latitude=59.380767&longitude=13.50295&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,precipitation,is_day&timezone=Europe%2FStockholm';
  try{
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok)throw Error('weather '+r.status);
    const j=await r.json();
    CITY.weather=j.current||null;
  }catch(e){
    console.warn('[V35] weather fallback',e);
    CITY.weather={temperature_2m:null,weather_code:3,cloud_cover:65,wind_speed_10m:null,precipitation:0,is_day:1,fallback:true};
  }
  trafficModel();
}
function injectUi(){
  const style=document.createElement('style');
  style.textContent=
  '#v35live{position:fixed;left:max(12px,env(safe-area-inset-left));top:max(92px,calc(env(safe-area-inset-top) + 82px));z-index:70;pointer-events:none;width:min(360px,72vw);padding:9px 11px;border:1px solid #ffffff24;border-radius:11px;background:#061118d9;backdrop-filter:blur(12px);box-shadow:0 12px 35px #0006;color:#fff;font:700 10px/1.45 system-ui;letter-spacing:.055em}'+
  '#v35live b{color:#9fe1ca}#v35live .muted{color:#ffffff8c;font-weight:600}#v35live .row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}#v35live .dot{width:6px;height:6px;border-radius:50%;background:#8fe2be;box-shadow:0 0 10px #8fe2be}'+
  '@media(max-width:680px){#v35live{top:max(126px,calc(env(safe-area-inset-top) + 116px));width:min(290px,70vw);font-size:9px;padding:7px 9px}}';
  document.head.appendChild(style);
  const p=document.createElement('div');
  p.id='v35live';
  p.innerHTML='<div class="row"><i class="dot"></i><b>LIVING CITY V35</b><span class="muted" id="v35clock">LIVE</span></div><div id="v35weather">VÄDER · HÄMTAS…</div><div id="v35traffic">TRAFIK · BERÄKNAS…</div><div id="v35people">STADSLIV · STARTAR…</div><div class="muted">INVÅNARE · 99 007 · 31 DEC 2025</div>';
  document.body.appendChild(p);
}
function updateUi(){
  const w=CITY.weather||{};
  const temp=Number.isFinite(w.temperature_2m)?Math.round(w.temperature_2m)+'°C':'—';
  const wind=Number.isFinite(w.wind_speed_10m)?Math.round(w.wind_speed_10m)+' KM/H':'—';
  const wt=document.getElementById('v35weather');
  const tr=document.getElementById('v35traffic');
  const pe=document.getElementById('v35people');
  const ck=document.getElementById('v35clock');
  if(wt)wt.textContent='VÄDER · '+temp+' · '+weatherText(w.weather_code||0)+' · VIND '+wind+(w.fallback?' · SIM':'');
  if(tr)tr.textContent='TRAFIK · '+CITY.traffic.level+' · '+CITY.traffic.source;
  if(pe)pe.textContent='STADSLIV · '+CITY.walkers.length+' PERSONER · '+(CITY.cars.length+CITY.parked.length)+' BILAR';
  if(ck)ck.textContent=new Date().toLocaleTimeString('sv-SE',{hour:'2-digit',minute:'2-digit'});
}
function material(scene,name,hex,metal=.05,rough=.72){
  const m=new B.PBRMaterial('V35 '+name,scene);
  m.albedoColor=B.Color3.FromHexString(hex);
  m.metallic=metal;m.roughness=rough;
  return m;
}
function buildMaterials(scene){
  CITY.mats.skin=material(scene,'skin','#c99579',0,.82);
  CITY.mats.hair=material(scene,'hair','#241d1a',0,.92);
  CITY.mats.dark=material(scene,'dark','#232a2d',.05,.82);
  CITY.mats.coats=['#315a68','#8b5a48','#4f6649','#625078','#6b5d38','#39445e'].map((c,i)=>material(scene,'coat '+i,c,0,.82));
  CITY.mats.car=['#1f4e68','#6c2527','#d6d4cf','#25282d','#6b7354','#9c7a33'].map((c,i)=>material(scene,'car '+i,c,.55,.33));
  CITY.mats.glass=material(scene,'glass','#80a7b5',.2,.16);CITY.mats.glass.alpha=.72;
  CITY.mats.rubber=material(scene,'rubber','#141719',.05,.9);
}
function person(scene,i){
  const r=new B.TransformNode('V35 pedestrian '+i,scene);
  const coat=CITY.mats.coats[i%CITY.mats.coats.length];
  const body=B.MeshBuilder.CreateCapsule('V35 body '+i,{height:1.05,radius:.22,tessellation:8},scene);body.parent=r;body.position.y=1.14;body.material=coat;
  const head=B.MeshBuilder.CreateSphere('V35 head '+i,{diameter:.36,segments:8},scene);head.parent=r;head.position.y=1.88;head.material=CITY.mats.skin;
  const hair=B.MeshBuilder.CreateSphere('V35 hair '+i,{diameter:.37,segments:8,slice:.52},scene);hair.parent=r;hair.position.y=1.99;hair.scaling.y=.48;hair.material=CITY.mats.hair;
  for(const s of [-1,1]){
    const leg=B.MeshBuilder.CreateCapsule('V35 leg '+i+' '+s,{height:.72,radius:.08,tessellation:6},scene);leg.parent=r;leg.position.set(s*.11,.48,0);leg.material=CITY.mats.dark;leg.metadata={limb:true,side:s};
    const arm=B.MeshBuilder.CreateCapsule('V35 arm '+i+' '+s,{height:.66,radius:.065,tessellation:6},scene);arm.parent=r;arm.position.set(s*.29,1.24,0);arm.material=coat;arm.metadata={limb:true,side:s,arm:true};
  }
  for(const m of r.getChildMeshes()){m.isPickable=false;m.checkCollisions=false;m.receiveShadows=!TOUCH}
  r.metadata={v35:true,kind:'walker',phase:i*.83,speed:.72+(i%3)*.10};
  return r;
}
function car(scene,i,parked=false){
  const r=new B.TransformNode((parked?'V35 parked car ':'V35 traffic car ')+i,scene);
  const body=B.MeshBuilder.CreateBox('V35 car body '+i,{width:1.78,height:.56,depth:3.85},scene);body.parent=r;body.position.y=.58;body.material=CITY.mats.car[i%CITY.mats.car.length];
  const cabin=B.MeshBuilder.CreateBox('V35 car cabin '+i,{width:1.52,height:.62,depth:1.85},scene);cabin.parent=r;
  cabin.position.set(0,1.04,-.18);cabin.material=CITY.mats.glass;
  const bumper=B.MeshBuilder.CreateBox('V35 car bumper '+i,{width:1.72,height:.18,depth:.18},scene);bumper.parent=r;bumper.position.set(0,.42,1.93);bumper.material=CITY.mats.dark;
  for(const x of [-.83,.83])for(const z of [-1.24,1.22]){
    const w=B.MeshBuilder.CreateCylinder('V35 wheel '+i,{height:.18,diameter:.48,tessellation:10},scene);w.parent=r;w.position.set(x,.39,z);w.rotation.z=Math.PI/2;w.material=CITY.mats.rubber;
  }
  for(const m of r.getChildMeshes()){m.isPickable=false;m.checkCollisions=false;m.receiveShadows=!TOUCH}
  r.scaling.setAll(.94);r.metadata={v35:true,kind:parked?'parked':'car',speed:parked?0:6.2+(i%3)*1.1};
  return r;
}
function routeInfo(points){
  if(points.length<2)return null;
  const lens=[],cum=[0];let total=0;
  for(let i=1;i<points.length;i++){const d=B.Vector3.Distance(points[i-1],points[i]);lens.push(d);total+=d;cum.push(total)}
  if(total<8)return null;
  return{points,lens,cum,total};
}
function sampleRoute(route,d){
  d=((d%route.total)+route.total)%route.total;
  let i=1;while(i<route.cum.length&&route.cum[i]<d)i++;
  i=Math.min(i,route.points.length-1);
  const a=route.points[i-1],b=route.points[i],start=route.cum[i-1],len=route.lens[i-1]||1,t=(d-start)/len;
  return{p:B.Vector3.Lerp(a,b,clamp(t,0,1)),dir:b.subtract(a).normalize()};
}
async function loadRoutes(){
  try{
    const r=await fetch('./data/osm-roads.json',{cache:'force-cache'}),j=await r.json();
    const ways=(j.elements||[]).filter(e=>e.type==='way'&&e.geometry?.length>1);
    const trafficNames=['Järnvägsgatan','Tingvallagatan','Kungsgatan','Västra Torggatan','Norra Strandgatan','Västra Kanalgatan'];
    const walkNames=['Drottninggatan','Västra Torggatan','Kungsgatan','Museigatan'];
    const toRoute=e=>routeInfo(e.geometry.map(p=>local(p.lon,p.lat)).filter(p=>Math.hypot(p.x,p.z)<360));
    CITY.routes=ways.map(e=>({name:e.tags?.name||'',highway:e.tags?.highway||'',route:toRoute(e)})).filter(x=>x.route);
    CITY.trafficRoutes=CITY.routes.filter(x=>trafficNames.includes(x.name)&&!/(pedestrian|path|footway)/.test(x.highway));
    CITY.walkRoutes=CITY.routes.filter(x=>walkNames.includes(x.name)&&!/(motorway|trunk)/.test(x.highway));
  }catch(e){console.warn('[V35] routes fallback',e);CITY.trafficRoutes=[];CITY.walkRoutes=[]}
}
function fallbackWalkRoutes(){
  const loops=[
    [[-25,-14],[-9,-14],[12,-14],[24,-4],[14,12],[-10,14],[-25,4],[-25,-14]],
    [[-12,18],[5,18],[18,10],[12,-3],[-4,-8],[-15,3],[-12,18]],
    [[-128,87],[-118,66],[-112,45],[-104,26],[-96,7]]
  ];
  return loops.map(a=>({name:'CITY LOOP',route:routeInfo(a.map(p=>new B.Vector3(p[0],0,p[1])))}));
}
function fallbackTrafficRoutes(){
  const loops=[
    [[-62,-42],[-20,-42],[20,-42],[62,-42],[62,18],[20,25],[-25,25],[-62,18],[-62,-42]],
    [[-38,42],[-12,42],[16,41],[46,35],[52,-8],[34,-31],[-8,-32],[-38,-20],[-38,42]]
  ];
  return loops.map(a=>({name:'CITY TRAFFIC',route:routeInfo(a.map(p=>new B.Vector3(p[0],0,p[1])))}));
}
function spawnLife(scene){
  const wr=(CITY.walkRoutes?.length?CITY.walkRoutes:fallbackWalkRoutes()).filter(x=>x.route);
  const tr=(CITY.trafficRoutes?.length?CITY.trafficRoutes:fallbackTrafficRoutes()).filter(x=>x.route);
  const nWalk=TOUCH?5:9;
  const nCars=Math.max(2,Math.round((TOUCH?3:5)*CITY.traffic.factor));
  for(let i=0;i<nWalk;i++){
    const x=person(scene,i),rr=wr[i%wr.length]?.route;if(!rr)continue;
    x.metadata.route=rr;x.metadata.dist=(rr.total/nWalk)*i;const s=sampleRoute(rr,x.metadata.dist);x.position.copyFrom(s.p);x.rotation.y=Math.atan2(s.dir.x,s.dir.z);CITY.walkers.push(x);
  }
  for(let i=0;i<nCars;i++){
    const x=car(scene,i,false),rr=tr[i%tr.length]?.route;if(!rr)continue;
    x.metadata.route=rr;x.metadata.dist=(rr.total/nCars)*i+7*i;const s=sampleRoute(rr,x.metadata.dist);x.position.copyFrom(s.p);x.rotation.y=Math.atan2(s.dir.x,s.dir.z);CITY.cars.push(x);
  }
  const parked=[
    [13.50326,59.38030,.1],[13.50217,59.38102,1.55],[13.50015,59.38034,1.52],
    [13.50465,59.38108,-1.55],[13.50118,59.37930,.06],[13.50618,59.38102,1.6]
  ];
  parked.slice(0,TOUCH?3:6).forEach((p,i)=>{const x=car(scene,30+i,true);x.position.copyFrom(local(p[0],p[1]));x.rotation.y=p[2];CITY.parked.push(x)});
}
function addWetStreet(scene){
  const w=CITY.weather||{},wet=(w.precipitation||0)>.03||((w.weather_code||0)>=51&&(w.weather_code||0)<=82);
  if(!wet)return;
  const m=new B.PBRMaterial('V35 wet asphalt',scene);m.albedoColor=B.Color3.FromHexString('#172128');m.metallic=.18;m.roughness=.12;m.alpha=.42;m.transparencyMode=B.PBRMaterial.PBRMATERIAL_ALPHABLEND;
  const pts=[[-15,-23,3.6,1.4],[8,-19,4.8,1.2],[23,9,3.2,1.1],[-33,11,4.2,1.0],[4,29,3.5,1.2]];
  pts.slice(0,TOUCH?3:5).forEach((p,i)=>{const e=B.MeshBuilder.CreateDisc('V35 puddle '+i,{radius:1,tessellation:24},scene);e.position.set(p[0],.025,p[1]);e.rotation.x=Math.PI/2;e.scaling.set(p[2],p[3],1);e.material=m;e.isPickable=false;CITY.puddles.push(e)});
}
function polishScene(scene){
  const ip=scene.imageProcessingConfiguration;
  if(ip){
    ip.toneMappingEnabled=true;
    if(B.ImageProcessingConfiguration?.TONEMAPPING_ACES!==undefined)ip.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
    ip.exposure=TOUCH?1.055:1.075;ip.contrast=1.25;ip.vignetteWeight=.14;
  }
  const w=CITY.weather||{},cloud=clamp((w.cloud_cover||50)/100,0,1),day=w.is_day!==0;
  scene.ambientColor=day?new B.Color3(.24,.26,.28):new B.Color3(.09,.11,.16);
  if(day)scene.clearColor=new B.Color4(.43*(1-cloud*.45),.64*(1-cloud*.38),.79*(1-cloud*.32),1);
  else scene.clearColor=new B.Color4(.015,.025,.05,1);
  const weatherCode=w.weather_code||0;
  scene.fogDensity=(weatherCode===45||weatherCode===48)?.00115:(weatherCode>=51&&weatherCode<=82)?.00065:.00034;
  for(const l of scene.lights||[]){
    if(l instanceof B.DirectionalLight){
      const base=day?2.35:.72;l.intensity=base*(1-cloud*.28);
      if(day)l.diffuse=new B.Color3(1,.94,.83);else l.diffuse=new B.Color3(.45,.55,.78);
    }
  }
}
function animate(dt){
  for(const w of CITY.walkers){
    const r=w.metadata.route;if(!r)continue;w.metadata.dist+=w.metadata.speed*dt;
    const s=sampleRoute(r,w.metadata.dist);w.position.copyFrom(s.p);w.rotation.y=Math.atan2(s.dir.x,s.dir.z);
    const phase=performance.now()*.007+w.metadata.phase;
    for(const m of w.getChildMeshes()){
      if(!m.metadata?.limb)continue;
      const swing=Math.sin(phase)*.34*m.metadata.side;
      m.rotation.x=m.metadata.arm?-swing:swing;
    }
  }
  for(const c of CITY.cars){
    const r=c.metadata.route;if(!r)continue;c.metadata.dist+=c.metadata.speed*dt*CITY.traffic.factor;
    const s=sampleRoute(r,c.metadata.dist);c.position.copyFrom(s.p);c.rotation.y=Math.atan2(s.dir.x,s.dir.z);
  }
}
async function boot(){
  injectUi();
  await loadWeather();
  updateUi();
  const scene=await waitScene();if(!scene)return;
  buildMaterials(scene);
  await loadRoutes();
  polishScene(scene);
  spawnLife(scene);
  addWetStreet(scene);
  CITY.ready=true;updateUi();
  let last=performance.now();
  scene.onBeforeRenderObservable.add(()=>{
    const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;animate(dt);
    if(now-CITY.lastUi>15000){CITY.lastUi=now;trafficModel();updateUi()}
  });
  console.log('[V35] Living City ready',CITY);
}
window.KarlstadLivingCity=CITY;
boot().catch(e=>console.error('[V35] init failed',e));
})();