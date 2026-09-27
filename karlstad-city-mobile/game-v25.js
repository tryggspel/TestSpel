(()=>{'use strict';
const B=BABYLON,canvas=document.getElementById('renderCanvas');
const TOUCH=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>1;
const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const ORIGIN={lat:59.380767,lon:13.50295},metersLon=111320*Math.cos(ORIGIN.lat*Math.PI/180),metersLat=110540;
const local=(lon,lat)=>new B.Vector3((lon-ORIGIN.lon)*metersLon,0,-(lat-ORIGIN.lat)*metersLat);
const ASSETS={
 rifle:'https://cdn.3dassets.dev/assets/33318/v1/model.glb',
 car:'https://cdn.3dassets.dev/assets/32487/v1/model.glb',
 bus:'https://cdn.3dassets.dev/assets/34194/v1/model.glb',
 civilian:'https://cdn.3dassets.dev/assets/36337/v1/model.glb',
 infected:'https://cdn.3dassets.dev/assets/11976/v1/model.glb'
};
const State={started:false,health:100,ammo:24,reserve:120,score:0,kills:0,phase:-1,mode:'city',mouseSens:.00285,touchSens:.0062,ads:false,fireHeld:false,lastShot:0,weapon:null,coffee:null,pivot:null,muzzle:null,npcs:[],zombies:[],containers:{},traffic:[],core:null,extract:null,nearNpc:null,quality:1,waveSpawned:false,mapRoads:[],mapBuildings:[],waterZones:[],lastLandPos:null,waterEnteredAt:0,lastWaterCheck:0,lastCollisionAt:0,lastPos:null,lastDelta:null,audioCtx:null,audioReady:false,vehicleAudio:[],lastChatter:0,lastMapDraw:0,currentStreet:'STORA TORGET',stamina:100,sprintHeld:false,bobPhase:0,footDistance:0,lastStepAt:0,hasRadio:false,lastSave:0,missionDone:false,impactCooldown:0,guideOn:false,routePoints:[],routeGraph:null,guideMeshes:[],safePos:null,collisionBurst:0,lastCollisionMesh:null,quickTarget:null};
function split(u){const i=u.lastIndexOf('/');return{root:u.slice(0,i+1),file:u.slice(i+1)}}
function addContactShadow(scene,root,rx=.45,rz=.45){
 const disc=B.MeshBuilder.CreateDisc('V29 contact shadow',{radius:1,tessellation:28},scene);disc.parent=root;disc.rotation.x=Math.PI/2;disc.position.y=.018;disc.scaling.set(rx,rz,1);
 const m=new B.StandardMaterial('V29 shadow mat '+Math.random(),scene);m.diffuseColor=B.Color3.Black();m.emissiveColor=B.Color3.Black();m.alpha=.16;m.disableLighting=true;disc.material=m;disc.isPickable=false;disc.renderingGroupId=0;return disc;
}
function addVehicleLights(scene,root,kind){
 const white=new B.StandardMaterial('V29 headlight '+Math.random(),scene);white.emissiveColor=B.Color3.FromHexString('#fff2c8');white.disableLighting=true;
 const red=new B.StandardMaterial('V29 taillight '+Math.random(),scene);red.emissiveColor=B.Color3.FromHexString('#d62525');red.disableLighting=true;
 const zFront=kind==='bus'?4.6:1.95,zBack=-zFront,x=kind==='bus'?1.05:.72,y=kind==='bus'?1.15:.64;
 for(const side of [-1,1]){
  const h=B.MeshBuilder.CreateSphere('V29 vehicle headlight',{diameter:kind==='bus'?.18:.12,segments:10},scene);h.parent=root;h.position.set(side*x,y,zFront);h.material=white;
  const t=B.MeshBuilder.CreateSphere('V29 vehicle taillight',{diameter:kind==='bus'?.18:.12,segments:10},scene);t.parent=root;t.position.set(side*x,y,zBack);t.material=red;
 }
}
function addCollider(scene,root,kind='npc'){
 const dims=kind==='bus'?[3.0,3.0,10.2]:kind==='car'?[2.05,1.6,4.25]:kind==='zombie'?[.72,1.8,.72]:[.68,1.8,.68];
 const c=B.MeshBuilder.CreateBox('V28 collider '+kind,{width:dims[0],height:dims[1],depth:dims[2]},scene);
 c.parent=root;c.position.y=dims[1]/2;c.visibility=0;c.isPickable=false;c.checkCollisions=true;c.metadata={collisionKind:kind,owner:root};
 root.metadata={...(root.metadata||{}),collider:c};return c;
}
function pointSegDist(px,pz,a,b){
 const vx=b.x-a.x,vz=b.z-a.z,wx=px-a.x,wz=pz-a.z,c1=vx*wx+vz*wz;
 if(c1<=0)return Math.hypot(px-a.x,pz-a.z);const c2=vx*vx+vz*vz;if(c2<=c1)return Math.hypot(px-b.x,pz-b.z);
 const t=c1/c2,qx=a.x+t*vx,qz=a.z+t*vz;return Math.hypot(px-qx,pz-qz);
}
function pointInRing(x,z,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];const hit=((a.z>z)!==(b.z>z))&&(x<(b.x-a.x)*(z-a.z)/((b.z-a.z)||1e-8)+a.x);if(hit)inside=!inside}return inside}
function routeKey(p){return (Math.round(p.x*2)/2).toFixed(1)+','+(Math.round(p.z*2)/2).toFixed(1)}
function buildRouteGraph(){
 const nodes=new Map();
 function node(p){const k=routeKey(p);if(!nodes.has(k))nodes.set(k,{k,p:new B.Vector3(p.x,0,p.z),edges:[]});return nodes.get(k)}
 for(const r of State.mapRoads){
  if(!r.pts||r.pts.length<2)continue;
  const bad=/motorway|trunk_link/i.test(r.type||'');if(bad)continue;
  for(let i=1;i<r.pts.length;i++){
   const a=node(r.pts[i-1]),b=node(r.pts[i]),d=B.Vector3.Distance(a.p,b.p);if(!Number.isFinite(d)||d<.3||d>80)continue;
   a.edges.push([b.k,d]);b.edges.push([a.k,d]);
  }
 }
 State.routeGraph=nodes;return nodes
}
function nearestRouteNode(pos){
 const g=State.routeGraph||buildRouteGraph();let best=null,bd=Infinity;
 for(const n of g.values()){const dx=n.p.x-pos.x,dz=n.p.z-pos.z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=n}}
 return best
}
function computeRoute(start,target){
 const g=State.routeGraph||buildRouteGraph(),a=nearestRouteNode(start),b=nearestRouteNode(target);if(!a||!b)return[start.clone(),target.clone()];
 const dist=new Map([[a.k,0]]),prev=new Map(),q=new Set(g.keys());
 while(q.size){
  let uk=null,ud=Infinity;for(const k of q){const d=dist.get(k);if(d!=null&&d<ud){ud=d;uk=k}}
  if(uk==null||uk===b.k)break;q.delete(uk);const u=g.get(uk);
  for(const [vk,w] of u.edges){if(!q.has(vk))continue;const alt=ud+w;if(alt<(dist.get(vk)??Infinity)){dist.set(vk,alt);prev.set(vk,uk)}}
 }
 if(!dist.has(b.k))return[start.clone(),target.clone()];
 const keys=[];let cur=b.k;keys.push(cur);while(cur!==a.k&&prev.has(cur)){cur=prev.get(cur);keys.push(cur)}keys.reverse();
 const pts=[start.clone(),...keys.map(k=>g.get(k).p.clone()),target.clone()];
 const compact=[];for(const p of pts){if(!compact.length||B.Vector3.Distance(compact[compact.length-1],p)>.8)compact.push(p)}return compact
}
function clearGuide(){
 for(const m of State.guideMeshes){try{m.dispose()}catch(e){}}State.guideMeshes=[];State.routePoints=[];State.guideOn=false;
 const b=document.getElementById('v31guide');if(b)b.textContent='VISA VÄGEN'
}
function buildGuideVisual(scene,route){
 clearGuide();State.routePoints=route;State.guideOn=true;
 const mat=new B.StandardMaterial('V31 guide glow',scene);mat.emissiveColor=B.Color3.FromHexString('#ffd34e');mat.diffuseColor=B.Color3.FromHexString('#6f5e22');mat.disableLighting=true;mat.alpha=.92;
 let total=0,prev=route[0],nextAt=2.2,count=0;
 for(let i=1;i<route.length&&count<95;i++){
  const a=prev,b=route[i],seg=B.Vector3.Distance(a,b);if(seg<.1){prev=b;continue}
  const dir=b.subtract(a).normalize();
  while(total+seg>=nextAt&&count<95){
   const d=nextAt-total,p=a.add(dir.scale(d));
   const ring=B.MeshBuilder.CreateTorus('V31 guide '+count,{diameter:.58,thickness:.085,tessellation:14},scene);ring.position.set(p.x,.105,p.z);ring.rotation.x=Math.PI/2;ring.material=mat;ring.isPickable=false;State.guideMeshes.push(ring);nextAt+=3.0;count++;
  }total+=seg;prev=b;
 }
 const target=route[route.length-1],beacon=B.MeshBuilder.CreateCylinder('V31 objective beacon',{height:3.8,diameter:.32,tessellation:12},scene);beacon.position.set(target.x,1.9,target.z);beacon.material=mat;beacon.isPickable=false;State.guideMeshes.push(beacon);
 const b=document.getElementById('v31guide');if(b)b.textContent='DÖLJ VÄGEN'
}
function toggleGuide(scene,camera){
 if(State.guideOn){clearGuide();return}
 const target=objectivePoint();if(!target){missionFlash('INGET AKTIVT MÅL');return}
 const route=computeRoute(camera.position,target);buildGuideVisual(scene,route);missionFlash('VÄGEN VISAS')
}
function teleportTo(camera,key){
 const spots={
  torget:{label:'STORA TORGET',p:local(13.50295,59.380767),offset:new B.Vector3(0,1.8,10)},
  mitticity:{label:'MITT I CITY',p:local(13.50055,59.37988),offset:new B.Vector3(0,1.8,16)},
  sandgrund:{label:'SANDGRUND',p:local(13.502961,59.384639),offset:new B.Vector3(0,1.8,24)},
  museum:{label:'VÄRMLANDS MUSEUM',p:local(13.50124,59.38492),offset:new B.Vector3(8,1.8,18)},
  olearys:{label:"O'LEARYS",p:local(13.503791,59.380512),offset:new B.Vector3(8,1.8,12)}
 };
 const s=spots[key];if(!s)return;camera.position.copyFrom(s.p.add(s.offset));camera.setTarget(new B.Vector3(s.p.x,2,s.p.z));State.safePos=camera.position.clone();clearGuide();missionFlash(s.label)
}

function isWaterAt(x,z){
 for(const w of State.waterZones){
  if(w.kind==='polygon'&&pointInRing(x,z,w.ring))return true;
  if(w.kind==='river'){for(let i=1;i<w.pts.length;i++)if(pointSegDist(x,z,w.pts[i-1],w.pts[i])<(w.width||30)/2)return true}
 }
 return false;
}
function mapLocalGeom(geom){return (geom||[]).map(p=>local(p.lon,p.lat))}
async function loadV28MapData(scene){
 try{
  const [roadsRaw,buildRaw,envRaw]=await Promise.all([
   fetch('./data/osm-roads.json',{cache:'force-cache'}).then(r=>r.json()),
   fetch('./data/osm-buildings.json',{cache:'force-cache'}).then(r=>r.json()),
   fetch('./data/osm-environment.json',{cache:'force-cache'}).then(r=>r.json())
  ]);
  State.mapRoads=(roadsRaw.elements||[]).filter(e=>e.type==='way'&&e.geometry?.length>1).map(e=>({name:e.tags?.name||'',type:e.tags?.highway||'',pts:mapLocalGeom(e.geometry)}));
  State.mapBuildings=(buildRaw.elements||[]).filter(e=>e.type==='way'&&e.geometry?.length>2).map(e=>({pts:mapLocalGeom(e.geometry)}));
  State.waterZones=[];
  for(const e of envRaw.elements||[]){
   if(e.type!=='way'||!e.geometry?.length)continue;
   const t=e.tags||{},pts=mapLocalGeom(e.geometry);
   if(t.waterway==='river')State.waterZones.push({kind:'river',pts,width:Math.max(22,Math.min(70,parseFloat(t.width)||34))});
   else if(t.natural==='water'||t.waterway==='riverbank')State.waterZones.push({kind:'polygon',ring:pts});
  }
  createStreetSigns(scene,State.mapRoads);
 }catch(e){console.warn('V28 map data unavailable',e)}
}
function signMat(scene,name){
 const t=new B.DynamicTexture('street sign '+name,{width:768,height:180},scene,true),g=t.getContext();
 g.fillStyle='#1f4e84';g.fillRect(0,0,768,180);g.strokeStyle='#f0f3f4';g.lineWidth=12;g.strokeRect(7,7,754,166);
 g.fillStyle='#ffffff';g.font='800 66px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(name.toUpperCase(),384,94);
 t.update();const m=new B.StandardMaterial('street sign mat '+name,scene);m.diffuseTexture=t;m.emissiveTexture=t;m.disableLighting=true;m.backFaceCulling=false;return m;
}
function createStreetSigns(scene,roads){
 const reject=/tillf|leveranser|rondell|crossing|gångbana|bana/i,seen=new Set(),priority=['Drottninggatan','Järnvägsgatan','Västra Torggatan','Östra Torggatan','Tingvallagatan','Västra Kyrkogatan','Östra Kyrkogatan','Kungsgatan','Hamngatan','Norra Strandgatan','Sandgrundsgatan','Museigatan'];
 const named=roads.filter(r=>r.name&&!reject.test(r.name)&&r.pts.length>1);
 named.sort((a,b)=>(priority.indexOf(a.name)<0?99:priority.indexOf(a.name))-(priority.indexOf(b.name)<0?99:priority.indexOf(b.name)));
 let count=0;
 for(const r of named){if(seen.has(r.name)||count>=24)continue;seen.add(r.name);const mid=r.pts[Math.floor(r.pts.length/2)],next=r.pts[Math.min(r.pts.length-1,Math.floor(r.pts.length/2)+1)];if(!mid||!next)continue;
  const pole=B.MeshBuilder.CreateCylinder('street pole '+r.name,{height:2.65,diameter:.075,tessellation:10},scene);pole.position.set(mid.x,1.325,mid.z);const pm=new B.PBRMaterial('street pole mat '+count,scene);pm.albedoColor=B.Color3.FromHexString('#5f6668');pm.metallic=.72;pm.roughness=.34;pole.material=pm;pole.checkCollisions=true;pole.isPickable=false;
  const pl=B.MeshBuilder.CreatePlane('street '+r.name,{width:Math.min(4.5,1.6+r.name.length*.13),height:.52,sideOrientation:B.Mesh.DOUBLESIDE},scene);pl.position.set(mid.x,2.62,mid.z);pl.material=signMat(scene,r.name);pl.billboardMode=B.Mesh.BILLBOARDMODE_Y;pl.isPickable=false;count++;
 }
}
function nearestStreet(camera){
 let best='',bd=22;
 for(const r of State.mapRoads){if(!r.name)continue;for(let i=1;i<r.pts.length;i++){const d=pointSegDist(camera.position.x,camera.position.z,r.pts[i-1],r.pts[i]);if(d<bd){bd=d;best=r.name}}}
 return best||'CENTRALA KARLSTAD';
}
function drawMap(camera){
 const now=performance.now();if(now-State.lastMapDraw<90)return;State.lastMapDraw=now;
 const c=document.getElementById('v28map');if(!c)return;const g=c.getContext('2d'),W=c.width,H=c.height,range=TOUCH?92:115,cx=camera.position.x,cz=camera.position.z,sx=x=>W/2+(x-cx)/range*(W/2),sy=z=>H/2+(z-cz)/range*(H/2);
 g.fillStyle='#142128';g.fillRect(0,0,W,H);
 g.fillStyle='#25343a';for(const b of State.mapBuildings){const pts=b.pts;if(!pts.length)continue;let near=false;for(const p of pts){if(Math.abs(p.x-cx)<range*1.2&&Math.abs(p.z-cz)<range*1.2){near=true;break}}if(!near)continue;g.beginPath();g.moveTo(sx(pts[0].x),sy(pts[0].z));for(let i=1;i<pts.length;i++)g.lineTo(sx(pts[i].x),sy(pts[i].z));g.closePath();g.fill()}
 g.strokeStyle='#819098';g.lineCap='round';for(const r of State.mapRoads){const pts=r.pts;if(pts.length<2)continue;let near=false;for(const p of pts){if(Math.abs(p.x-cx)<range*1.3&&Math.abs(p.z-cz)<range*1.3){near=true;break}}if(!near)continue;g.lineWidth=/primary|secondary/.test(r.type)?5:/tertiary|residential/.test(r.type)?3:1.7;g.beginPath();g.moveTo(sx(pts[0].x),sy(pts[0].z));for(let i=1;i<pts.length;i++)g.lineTo(sx(pts[i].x),sy(pts[i].z));g.stroke()}
 g.strokeStyle='#3d87a6';g.lineWidth=7;for(const w of State.waterZones){if(w.kind==='river'){const pts=w.pts;if(pts.length<2)continue;g.beginPath();g.moveTo(sx(pts[0].x),sy(pts[0].z));for(let i=1;i<pts.length;i++)g.lineTo(sx(pts[i].x),sy(pts[i].z));g.stroke()}else if(w.kind==='polygon'){const pts=w.ring;if(!pts.length)continue;g.fillStyle='#286d8d';g.beginPath();g.moveTo(sx(pts[0].x),sy(pts[0].z));for(let i=1;i<pts.length;i++)g.lineTo(sx(pts[i].x),sy(pts[i].z));g.closePath();g.fill()}}
 const marks=[['TORGET',local(13.50295,59.380767),'#e3bc4d'],['MITT I CITY',local(13.50055,59.37988),'#79d15a'],["O'LEARYS",local(13.503791,59.380512),'#d0644d']];
 g.font='800 17px Arial';g.textAlign='center';for(const [label,p,col] of marks){if(Math.abs(p.x-cx)>range||Math.abs(p.z-cz)>range)continue;g.fillStyle=col;g.beginPath();g.arc(sx(p.x),sy(p.z),7,0,Math.PI*2);g.fill();g.fillStyle='#fff';g.fillText(label,sx(p.x),sy(p.z)-12)} const target=objectivePoint();if(target&&Math.abs(target.x-cx)<range*1.4&&Math.abs(target.z-cz)<range*1.4){const tx=Math.max(10,Math.min(W-10,sx(target.x))),ty=Math.max(10,Math.min(H-10,sy(target.z)));g.strokeStyle='#f1c85a';g.lineWidth=2;g.setLineDash([7,7]);g.beginPath();g.moveTo(W/2,H/2);g.lineTo(tx,ty);g.stroke();g.setLineDash([]);g.fillStyle='#f1c85a';g.save();g.translate(tx,ty);g.rotate(Math.PI/4);g.fillRect(-6,-6,12,12);g.restore()}
 g.save();g.translate(W/2,H/2);g.rotate(-camera.rotation.y);g.fillStyle='#fff';g.strokeStyle='#071015';g.lineWidth=3;g.beginPath();g.moveTo(0,-15);g.lineTo(10,11);g.lineTo(0,7);g.lineTo(-10,11);g.closePath();g.fill();g.stroke();g.restore();
 g.fillStyle='#ffffff99';g.font='900 18px Arial';g.textAlign='left';g.fillText('N',10,22);
 const street=nearestStreet(camera);if(street!==State.currentStreet){State.currentStreet=street;text('v28street',street.toUpperCase())}
}
function ensureAudio(){
 if(State.audioReady&&State.audioCtx){State.audioCtx.resume?.();return State.audioCtx}
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;State.audioCtx=State.audioCtx||new AC();State.audioCtx.resume?.();State.audioReady=true;initTrafficAudio();return State.audioCtx}catch(e){return null}
}
function pannerAt(ctx,pos){
 const p=ctx.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2.5;p.maxDistance=70;p.rolloffFactor=1.35;
 p.positionX.value=pos.x;p.positionY.value=pos.y||1;p.positionZ.value=pos.z;return p;
}
function oneShot(kind,pos){
 const ctx=ensureAudio();if(!ctx)return;const now=ctx.currentTime,p=pannerAt(ctx,pos||new B.Vector3());
 const level=kind==='bump'?.08:kind==='splash'?.06:kind==='step'?.022:kind==='brake'?.035:.025;
 const dur=kind==='bump'?.22:kind==='splash'?.45:kind==='step'?.13:kind==='brake'?.55:.5;
 const g=ctx.createGain();g.gain.setValueAtTime(level,now);g.gain.exponentialRampToValueAtTime(.0001,now+dur);p.connect(g);g.connect(ctx.destination);
 if(kind==='bump'||kind==='brake'){
  const o=ctx.createOscillator();o.type=kind==='brake'?'sawtooth':'triangle';o.frequency.setValueAtTime(kind==='brake'?210:92,now);o.frequency.exponentialRampToValueAtTime(kind==='brake'?72:42,now+dur*.82);o.connect(p);o.start(now);o.stop(now+dur)
 }else{
  const len=Math.floor(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),ch=buf.getChannelData(0);for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*Math.exp(-i/(len*(kind==='step'?.2:.55)));
  const src=ctx.createBufferSource(),f=ctx.createBiquadFilter();f.type=kind==='splash'?'bandpass':'lowpass';f.frequency.value=kind==='splash'?950:kind==='step'?260:650;f.Q.value=kind==='step'?.9:.65;src.buffer=buf;src.connect(f);f.connect(p);src.start(now)
 }
}
function initTrafficAudio(){
 const ctx=State.audioCtx;if(!ctx)return;for(const v of State.vehicleAudio){try{v.osc.stop()}catch(e){}}
 State.vehicleAudio=[];
 for(const t of State.traffic){const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=pannerAt(ctx,t.r.position);o.type=t.kind==='bus'?'sawtooth':'triangle';o.frequency.value=t.kind==='bus'?58:78;f.type='lowpass';f.frequency.value=t.kind==='bus'?280:360;g.gain.value=t.kind==='bus'?.025:.014;o.connect(f);f.connect(p);p.connect(g);g.connect(ctx.destination);o.start();State.vehicleAudio.push({track:t,osc:o,panner:p,gain:g})}
}
function updateAudio(camera){
 const ctx=State.audioCtx;if(!ctx)return;const L=ctx.listener,p=camera.position,f=camera.getDirection(B.Axis.Z);
 if(L.positionX){L.positionX.value=p.x;L.positionY.value=p.y;L.positionZ.value=p.z;if(L.forwardX){L.forwardX.value=f.x;L.forwardY.value=f.y;L.forwardZ.value=f.z}}
 for(const a of State.vehicleAudio){const q=a.track.r.position;a.panner.positionX.value=q.x;a.panner.positionY.value=1;a.panner.positionZ.value=q.z}
 const now=performance.now();if(now-State.lastChatter>4200&&State.npcs.length){let best=null,bd=18;for(const n of State.npcs){const d=B.Vector3.Distance(camera.position,n.position);if(d<bd){bd=d;best=n}}if(best){State.lastChatter=now+Math.random()*1800;oneShot('chatter',best.position)}}
}
function handleWater(camera){
 const now=performance.now();if(now-State.lastWaterCheck<90)return;State.lastWaterCheck=now;
 const inside=isWaterAt(camera.position.x,camera.position.z),overlay=document.getElementById('v28water');
 if(inside){camera.cameraDirection.scaleInPlace(.38);overlay?.classList.add('show');if(!State.waterEnteredAt){State.waterEnteredAt=now;oneShot('splash',camera.position)}
  if(now-State.waterEnteredAt>1150&&State.lastLandPos){camera.position.copyFrom(State.lastLandPos);State.health=Math.max(1,State.health-10);State.waterEnteredAt=0;overlay?.classList.remove('show');dialog('Klarälven','För djupt. Du flyttades tillbaka till stranden.');update()}
 }else{State.waterEnteredAt=0;overlay?.classList.remove('show');State.lastLandPos=camera.position.clone()}
}
function collisionFeedback(camera,mesh){
 const now=performance.now();if(now-State.lastCollisionAt<230)return;State.lastCollisionAt=now;
 const kind=mesh?.metadata?.collisionKind||'world',movingVehicle=(kind==='car'||kind==='bus')&&State.traffic.some(t=>t.r===mesh?.metadata?.owner);
 const e=document.getElementById('v28bump');if(e){e.textContent=kind==='npc'?'URSÄKTA!':movingVehicle?'BANG!':'DUNS';e.classList.add('show');setTimeout(()=>e.classList.remove('show'),190)}
 oneShot('bump',mesh?.absolutePosition||camera.position);if(navigator.vibrate)navigator.vibrate(movingVehicle?35:12);
 if(movingVehicle&&now>State.impactCooldown){State.impactCooldown=now+900;State.health=Math.max(1,State.health-(kind==='bus'?9:5));update()}
 const d=State.lastDelta;if(d&&d.lengthSquared()>.0001){const n=d.normalize();camera.position.addInPlace(n.scale(movingVehicle?-.34:-.17));camera.cameraDirection.scaleInPlace(movingVehicle?-.46:-.22)}
}

function objectivePoint(){
 if(State.mode==='zombie'&&State.phase===1){let best=null,bd=Infinity;for(const z of State.zombies){if(!z||z.metadata.dead||!z.isEnabled())continue;const d=z.position.lengthSquared();if(d<bd){bd=d;best=z.position}}return best?.clone?.()||null}
 if(State.mode==='zombie'&&State.phase===2)return local(13.503791,59.380512);
 if(State.phase<4){const m=State.npcs.find(n=>n.metadata?.npcName==='Mira');return m?.position?.clone?.()||new B.Vector3(-12,0,-9)}
 if(State.phase===4||State.phase===5)return local(13.50055,59.37988);
 if(State.phase===7)return local(13.50295,59.380767);
 return null;
}
function updateMovementFeel(camera,dt){
 const d=State.lastDelta||B.Vector3.Zero(),moved=Math.hypot(d.x,d.z),moving=moved>.0015,sprinting=State.sprintHeld&&State.stamina>1&&moving;
 if(sprinting)State.stamina=Math.max(0,State.stamina-.34*dt);else State.stamina=Math.min(100,State.stamina+.22*dt);
 const fill=document.getElementById('v30staminaFill');if(fill)fill.style.width=State.stamina+'%';
 camera.speed=sprinting?1.48:.88;if(TOUCH&&sprinting)camera.cameraDirection.scaleInPlace(1.14);
 if(moving){
  State.footDistance+=moved;State.bobPhase+=moved*(sprinting?8.5:6.4);
  const stepEvery=sprinting?1.45:1.85;if(State.footDistance>stepEvery){State.footDistance=0;if(State.audioReady)oneShot('step',camera.position)}
  camera.rotation.z=Math.sin(State.bobPhase)* (sprinting?.007:.0042);
 }else camera.rotation.z*=.72;
 const fovTarget=State.ads?.78:(sprinting?1.105:1.04);camera.fov+=(fovTarget-camera.fov)*.11*dt;
 if(State.coffee&&State.mode==='city'){State.coffee.position.x=.34+Math.sin(State.bobPhase*.55)*(moving?.012:0)}
}
function css(){const s=document.createElement('style');s.textContent=`
html,body{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
#v25hud{position:fixed;inset:0;pointer-events:none;z-index:22;color:#fff;font-family:Inter,system-ui,sans-serif}
#v25stats{position:absolute;left:max(10px,env(safe-area-inset-left));top:max(10px,env(safe-area-inset-top));display:flex;gap:6px}
.v25box{background:#071218d9;border:1px solid #ffffff24;border-left:3px solid #e1b646;border-radius:8px;padding:7px 9px;box-shadow:0 10px 28px #0006}
.v25box b{display:block;font:800 8px/1 ui-monospace,monospace;letter-spacing:.12em;color:#eac45d}.v25box strong{display:block;margin-top:3px;font:900 15px/1 ui-monospace,monospace}
#v25objective{position:absolute;left:max(10px,env(safe-area-inset-left));top:73px;max-width:min(420px,60vw);font:800 10px/1.35 system-ui}
#v25prompt{position:absolute;left:50%;top:58%;transform:translateX(-50%);padding:9px 13px;border-radius:8px;background:#071218e8;border:1px solid #e2bd5a66;font:800 11px/1 system-ui;opacity:0;transition:.15s}
#v25prompt.show{opacity:1}#v25dialog{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);width:min(620px,78vw);padding:13px 16px;border-radius:9px;background:#061116ed;border-left:3px solid #e8bd4b;box-shadow:0 18px 50px #0008;font:600 13px/1.45 system-ui;opacity:0;transition:.18s}#v25dialog.show{opacity:1}
#v25hint{position:absolute;left:50%;bottom:88px;transform:translateX(-50%);padding:8px 12px;border-radius:8px;background:#071218dc;border:1px solid #ffffff25;font:800 10px/1 ui-monospace,monospace;letter-spacing:.08em}
#v25cross{position:absolute;left:50%;top:50%;width:16px;height:16px;margin:-8px;border:1px solid #fff9;border-radius:50%;box-shadow:0 0 12px #fff4}#v25cross:before,#v25cross:after{content:"";position:absolute;background:#fff9}#v25cross:before{left:7px;top:-6px;width:1px;height:28px}#v25cross:after{top:7px;left:-6px;width:28px;height:1px}
.v25btn{display:none;position:absolute;pointer-events:auto;border:1px solid #ffffff38;background:#0a141bdc;color:#fff;box-shadow:0 10px 28px #0008;backdrop-filter:blur(8px);font:900 10px/1 system-ui;letter-spacing:.08em;touch-action:none}
#v25fire{right:max(16px,env(safe-area-inset-right));bottom:max(22px,calc(env(safe-area-inset-bottom) + 22px));width:84px;height:84px;border-radius:50%;background:#81291fe8}
#v25jump{right:max(108px,calc(env(safe-area-inset-right) + 108px));bottom:max(36px,calc(env(safe-area-inset-bottom) + 36px));width:58px;height:58px;border-radius:50%}
#v25aim{right:max(26px,calc(env(safe-area-inset-right) + 26px));bottom:max(116px,calc(env(safe-area-inset-bottom) + 116px));width:58px;height:58px;border-radius:50%}
#v25use{right:max(100px,calc(env(safe-area-inset-right) + 100px));bottom:max(108px,calc(env(safe-area-inset-bottom) + 108px));width:58px;height:58px;border-radius:50%}
#v25reload{right:max(168px,calc(env(safe-area-inset-right) + 168px));bottom:max(108px,calc(env(safe-area-inset-bottom) + 108px));width:52px;height:52px;border-radius:50%;font-size:8px}
#v25settings{right:max(10px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));width:38px;height:38px;border-radius:10px;font-size:16px}
#v25look{display:none;position:absolute;right:0;top:0;bottom:0;width:64%;pointer-events:auto;touch-action:none}
#v25panel{display:none;position:fixed;z-index:40;left:50%;top:50%;transform:translate(-50%,-50%);width:min(410px,88vw);padding:18px;background:#071218f4;border:1px solid #ffffff32;border-radius:14px;box-shadow:0 30px 100px #000d;pointer-events:auto}#v25panel.show{display:block}#v25panel h3{margin:0 0 14px}#v25panel label{display:block;margin:12px 0 5px;font-size:12px;color:#ffffffb5}#v25panel input{width:100%}#v25panel button{width:100%;margin-top:14px;padding:12px;border-radius:9px;border:1px solid #ffffff30;background:#17313d;color:#fff;font-weight:900}
#rotateV25{display:none;position:fixed;z-index:50;inset:0;background:#061015f4;place-items:center;text-align:center;padding:28px}#rotateV25 b{display:block;font-size:24px;margin-bottom:8px}#rotateV25 small{color:#ffffffaa;line-height:1.45}

#v28mapWrap{position:absolute;right:max(12px,env(safe-area-inset-right));top:max(58px,calc(env(safe-area-inset-top) + 52px));width:186px;height:206px;padding:8px;background:#061015e6;border:1px solid #ffffff2b;border-radius:15px;box-shadow:0 18px 50px #0009;backdrop-filter:blur(10px)}
#v28map{display:block;width:168px;height:168px;border-radius:10px;background:#142128;border:1px solid #ffffff18}
#v28street{height:27px;padding-top:7px;text-align:center;font:900 10px/1 ui-monospace,monospace;letter-spacing:.1em;color:#f1d071;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#v28bump{position:absolute;left:50%;top:47%;transform:translate(-50%,-50%) scale(.9);font:900 17px/1 system-ui;letter-spacing:.16em;color:#fff;text-shadow:0 2px 12px #000;opacity:0;transition:opacity .09s,transform .09s}
#v28bump.show{opacity:1;transform:translate(-50%,-50%) scale(1)}
#v28water{position:absolute;inset:0;background:linear-gradient(#387c9a15,#1e6f9b55);box-shadow:inset 0 0 90px #1d6f9c99;opacity:0;transition:opacity .18s}
#v28water.show{opacity:1}
#v28waterText{position:absolute;left:50%;top:70%;transform:translateX(-50%);padding:8px 12px;border-radius:9px;background:#071218df;border:1px solid #79c8e659;font:900 10px/1 ui-monospace,monospace;letter-spacing:.1em;color:#d9f4ff;opacity:0}
#v28water.show #v28waterText{opacity:1}
#v30stamina{position:absolute;left:max(10px,env(safe-area-inset-left));top:132px;width:174px;height:7px;border-radius:999px;background:#071218cf;border:1px solid #ffffff24;overflow:hidden;box-shadow:0 8px 20px #0005}
#v30stamina i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#74c68b,#d7b94a);transition:width .12s}
#v30run{left:max(92px,calc(env(safe-area-inset-left) + 92px));bottom:max(126px,calc(env(safe-area-inset-bottom) + 126px));width:60px;height:60px;border-radius:50%;background:#173c49dd}
#v30mission{position:absolute;left:50%;top:18%;transform:translateX(-50%);padding:10px 14px;background:#071218e9;border:1px solid #e8bd4b66;border-radius:10px;font:900 12px/1 system-ui;letter-spacing:.08em;opacity:0;transition:opacity .15s;box-shadow:0 16px 50px #0008}
#v30mission.show{opacity:1}

@media(pointer:coarse){html,body,#renderCanvas{height:100dvh!important}.brand,.actions,.source,.status{display:none!important}#v25look,.v25btn{display:block}#v25hint{display:none}#v25stats{top:max(6px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));gap:4px}.v25box{padding:5px 7px;border-radius:7px}.v25box strong{font-size:13px}#v25objective{top:60px;left:max(8px,env(safe-area-inset-left));max-width:52vw;font-size:9px;padding:6px 8px}#v25dialog{bottom:150px;width:72vw;font-size:11px;padding:10px 12px}.joy{width:128px!important;height:128px!important;left:max(12px,env(safe-area-inset-left))!important;bottom:max(12px,calc(env(safe-area-inset-bottom) + 12px))!important}.knob{width:44px!important;height:44px!important;left:42px!important;top:42px!important}#look{pointer-events:none!important}#v25fire{right:max(10px,env(safe-area-inset-right));bottom:max(12px,calc(env(safe-area-inset-bottom) + 12px));width:76px;height:76px}#v25aim{right:max(20px,calc(env(safe-area-inset-right) + 20px));bottom:max(96px,calc(env(safe-area-inset-bottom) + 96px));width:54px;height:54px}#v25jump{right:max(94px,calc(env(safe-area-inset-right) + 94px));bottom:max(18px,calc(env(safe-area-inset-bottom) + 18px));width:58px;height:58px}#v25use{right:max(88px,calc(env(safe-area-inset-right) + 88px));bottom:max(94px,calc(env(safe-area-inset-bottom) + 94px));width:50px;height:50px}#v25reload{right:max(148px,calc(env(safe-area-inset-right) + 148px));bottom:max(96px,calc(env(safe-area-inset-bottom) + 96px));width:46px;height:46px;font-size:7px}#v25settings{right:max(8px,env(safe-area-inset-right));top:max(154px,calc(env(safe-area-inset-top) + 154px));width:36px;height:36px}#v28mapWrap{right:max(8px,env(safe-area-inset-right));top:max(7px,env(safe-area-inset-top));width:140px;height:162px;padding:6px;border-radius:12px}#v28map{width:126px;height:126px}#v28street{height:24px;padding-top:6px;font-size:8px}#v30stamina{top:113px;left:max(8px,env(safe-area-inset-left));width:122px;height:5px}#v30run{display:block}.error{display:none!important}}
@media(pointer:coarse) and (orientation:portrait){#rotateV25{display:grid}}
`;document.head.appendChild(s)}
function ui(){css();const d=document.createElement('div');d.id='v25hud';d.innerHTML=`
<div id="v25stats"><div class="v25box"><b>HEALTH</b><strong id="v25hp">100</strong></div><div class="v25box"><b id="v25itemlabel">ITEM</b><strong id="v25itemmain">KAFFE</strong><div id="v25itemsub" style="font:700 8px/1.2 ui-monospace,monospace;color:#ffffff90;margin-top:3px">CITY MODE</div></div><div class="v25box"><b>SCORE</b><strong id="v25score">0000</strong></div></div>
<div id="v25objective" class="v25box"><b>OBJECTIVE</b><span id="v25obj">PRATA MED MIRA</span></div><div id="v30stamina"><i id="v30staminaFill"></i></div><div id="v25prompt"></div><div id="v25dialog"></div><div id="v25hint">KLICKA I SPELVYN · MUS = SIKTE</div><div id="v25cross"></div><div id="v25look"></div><div id="v28mapWrap"><canvas id="v28map" width="336" height="336"></canvas><div id="v28street">STORA TORGET</div></div><div id="v28bump">DUNS</div><div id="v30mission"></div><div id="v28water"><div id="v28waterText">VATTEN · VÄND TILLBAKA</div></div>
<button id="v25fire" class="v25btn">FIRE</button><button id="v30run" class="v25btn">RUN</button><button id="v25jump" class="v25btn">JUMP</button><button id="v25aim" class="v25btn">AIM</button><button id="v25use" class="v25btn">USE</button><button id="v25reload" class="v25btn">RELOAD</button><button id="v27mode" class="v25btn" style="right:max(172px,calc(env(safe-area-inset-right) + 172px));bottom:max(28px,calc(env(safe-area-inset-bottom) + 28px));width:68px;height:52px;border-radius:14px;background:#2a4b2fe8">ZOMBIE</button><button id="v25settings" class="v25btn">⚙</button>
<div id="v25panel"><h3>V30 · Playable City Loop</h3><label>Touch-känslighet <span id="v25touchVal">120%</span></label><input id="v25touch" type="range" min="60" max="190" value="120"><label>Desktop-mus <span id="v25mouseVal">130%</span></label><input id="v25mouse" type="range" min="70" max="200" value="130"><label>Grafik</label><input id="v25quality" type="range" min="0" max="2" step="1" value="1"><button id="v25close">KLAR</button></div><div id="rotateV25"><div><b>Vrid iPhone till liggande</b><small>V28 är mobile first och kontrollerna är optimerade för landscape.</small></div></div><div id="v25install" style="display:none;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(430px,82vw);padding:16px 18px;border-radius:14px;background:#071218f4;border:1px solid #ffffff2c;box-shadow:0 30px 90px #000c;pointer-events:auto;text-align:center"><b style="display:block;font-size:15px;margin-bottom:8px">Spela som app på iPhone</b><span style="display:block;font-size:12px;line-height:1.45;color:#ffffffb8">Tryck Dela i Safari och välj Lägg till på hemskärmen. Då försvinner Safaris stora överkant och spelet får mer plats.</span><button id="v25installClose" style="margin-top:12px;padding:10px 16px;border-radius:9px;border:1px solid #ffffff32;background:#17313d;color:#fff;font-weight:900">FORTSÄTT I SAFARI</button></div>`;document.body.appendChild(d);const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(ios&&!navigator.standalone&&!localStorage.getItem('karlstad-v25-install-hint')){setTimeout(()=>{const p=document.getElementById('v25install');if(p)p.style.display='block'},1400);document.getElementById('v25installClose')?.addEventListener('click',()=>{localStorage.setItem('karlstad-v25-install-hint','1');document.getElementById('v25install').style.display='none'})}}
function text(id,v){const e=document.getElementById(id);if(e)e.textContent=v}
function update(){
 text('v25hp',Math.max(0,Math.round(State.health)));
 text('v25score',String(State.score).padStart(4,'0'));
 if(State.mode==='city'){text('v25itemlabel','ITEM');text('v25itemmain','KAFFE');text('v25itemsub','CITY MODE')}
 else{text('v25itemlabel','AMMO');text('v25itemmain',State.ammo+'/'+State.reserve);text('v25itemsub','ZOMBIE MODE')}
}
function objective(v){text('v25obj',v)}
function missionFlash(v){const e=document.getElementById('v30mission');if(!e)return;e.textContent=v;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),1700)}
function dialog(name,v){const e=document.getElementById('v25dialog');e.innerHTML='<b>'+name+'</b> · '+v;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),4600)}
async function loadContainer(scene,key,url){try{const s=split(url),c=await B.SceneLoader.LoadAssetContainerAsync(s.root,s.file,scene);State.containers[key]=c;return c}catch(e){console.warn('V25 asset failed',key,e);return null}}
function spawn(scene,key,name,pos,rot=0,scale=1){
 const c=State.containers[key];if(!c)return null;
 try{
  const i=c.instantiateModelsToScene(n=>name+' '+n,false),r=new B.TransformNode(name,scene);
  for(const n of i.rootNodes||[])n.parent=r;r.position.copyFrom(pos);r.rotation.y=rot;r.scaling.setAll(scale);
  const sg=scene.lights.map(l=>l.getShadowGenerator?.()).find(Boolean);
  for(const m of r.getChildMeshes()){m.receiveShadows=true;m.isPickable=false;sg?.addShadowCaster?.(m)}
  addContactShadow(scene,r,key==='bus'?1.9:key==='car'?1.35:.46,key==='bus'?4.4:key==='car'?1.85:.55);
  if(key==='car'||key==='bus')addVehicleLights(scene,r,key);
  return r
 }catch(e){return null}
}
function fallbackNpc(scene,name,pos){
 const r=new B.TransformNode(name,scene);r.position.copyFrom(pos);
 const coat=new B.PBRMaterial(name+' coat',scene);coat.albedoColor=B.Color3.FromHexString(name.includes('INFECTED')?'#3b4340':'#334f63');coat.roughness=.86;
 const shirt=new B.PBRMaterial(name+' shirt',scene);shirt.albedoColor=B.Color3.FromHexString(name.includes('INFECTED')?'#6a6d5c':'#d6d0c0');shirt.roughness=.9;
 const pants=new B.PBRMaterial(name+' pants',scene);pants.albedoColor=B.Color3.FromHexString('#2d3235');pants.roughness=.92;
 const skin=new B.PBRMaterial(name+' skin',scene);skin.albedoColor=B.Color3.FromHexString(name.includes('INFECTED')?'#83906b':'#c69b82');skin.roughness=.82;
 const hair=new B.PBRMaterial(name+' hair',scene);hair.albedoColor=B.Color3.FromHexString('#2a211c');hair.roughness=.95;
 const torso=B.MeshBuilder.CreateCapsule(name+' torso',{height:.9,radius:.24,tessellation:16},scene);torso.parent=r;torso.position.y=1.25;torso.scaling.x=.88;torso.material=coat;
 const chest=B.MeshBuilder.CreateBox(name+' chest',{width:.34,height:.36,depth:.16},scene);chest.parent=r;chest.position.set(0,1.37,-.18);chest.material=shirt;
 const head=B.MeshBuilder.CreateSphere(name+' head',{diameter:.39,segments:16},scene);head.parent=r;head.position.y=1.91;head.scaling.set(.92,1.05,.94);head.material=skin;
 const hairCap=B.MeshBuilder.CreateSphere(name+' hair',{diameter:.405,segments:12,slice:.5},scene);hairCap.parent=r;hairCap.position.set(0,2.03,0);hairCap.scaling.y=.45;hairCap.material=hair;
 for(const side of [-1,1]){
  const leg=B.MeshBuilder.CreateCapsule(name+' leg '+side,{height:.82,radius:.095,tessellation:10},scene);leg.parent=r;leg.position.set(side*.12,.53,0);leg.material=pants;
  const shoe=B.MeshBuilder.CreateBox(name+' shoe '+side,{width:.18,height:.11,depth:.33},scene);shoe.parent=r;shoe.position.set(side*.12,.095,-.08);shoe.material=hair;
  const arm=B.MeshBuilder.CreateCapsule(name+' arm '+side,{height:.68,radius:.075,tessellation:10},scene);arm.parent=r;arm.position.set(side*.31,1.28,0);arm.rotation.z=side*.09;arm.material=coat;
  const hand=B.MeshBuilder.CreateSphere(name+' hand '+side,{diameter:.13,segments:10},scene);hand.parent=r;hand.position.set(side*.34,.93,0);hand.material=skin;
 }
 const sg=scene.lights.map(l=>l.getShadowGenerator?.()).find(Boolean);for(const m of r.getChildMeshes()){m.receiveShadows=true;sg?.addShadowCaster?.(m)}
 addContactShadow(scene,r,.43,.5);
 return r
}
function makeNpc(scene,name,line,pos,rot=0){let r=spawn(scene,'civilian','NPC '+name,pos,rot,1)||fallbackNpc(scene,'NPC '+name,pos);r.metadata={npc:true,npcName:name,npcLine:line};addCollider(scene,r,'npc');State.npcs.push(r);return r}
function nearestNpc(camera){let best=null,bd=3.7;for(const n of State.npcs){const d=B.Vector3.Distance(camera.position,n.position);if(d<bd){bd=d;best=n}}return best}
function makeMarker(scene,pos,color='#e5bb50'){const m=B.MeshBuilder.CreateTorus('objective marker',{diameter:2.4,thickness:.09,tessellation:32},scene);m.position.copyFrom(pos);m.position.y=.15;const x=new B.StandardMaterial('marker mat',scene);x.emissiveColor=B.Color3.FromHexString(color);x.disableLighting=true;m.material=x;return m}
function interact(scene,camera){
 const n=nearestNpc(camera);if(!n)return;dialog(n.metadata.npcName,n.metadata.npcLine);
 if(n.metadata.npcName==='Mira'&&State.phase<4){
  State.phase=4;objective('GÅ TILL MITT I CITY · JÄRNVÄGSGATAN');missionFlash('CITY MISSION · MITT I CITY');
 }else if(n.metadata.npcName==='Centervärd'&&State.mode==='city'&&State.phase>=5&&State.phase<7){
  State.phase=7;State.hasRadio=true;State.score+=600;update();objective('NÖDRADIO HÄMTAD · ÅTERVÄND TILL STORA TORGET');missionFlash('NÖDRADIO HÄMTAD');
 }else if(State.phase===2&&n.metadata.npcName==='Alex'){
  State.phase=3;State.score+=2500;State.missionDone=true;update();objective('MISSION COMPLETE · KARLSTAD HÅLLER LINJEN');missionFlash('ZOMBIE MISSION KLAR');
 }
}
function fallbackEnemy(scene,pos,id){const r=fallbackNpc(scene,'INFECTED '+id,pos);for(const m of r.getChildMeshes()){if(m.material?.albedoColor)m.material.albedoColor=B.Color3.FromHexString('#5b6652');m.isPickable=true;m.metadata={zombieRoot:r}}return r}
function enemy(scene,pos,id){let r=spawn(scene,'infected','INFECTED '+id,pos,0,1)||fallbackEnemy(scene,pos,id);r.metadata={zombie:true,hp:100,dead:false};for(const m of r.getChildMeshes()){m.isPickable=true;m.metadata={...(m.metadata||{}),zombieRoot:r}}addCollider(scene,r,'zombie');State.zombies.push(r);return r}
function wave(scene){State.phase=1;objective('RENSA TORGET · 6 INFECTED');[[-20,-18],[18,-19],[-28,10],[26,13],[-8,27],[13,30]].forEach((p,i)=>enemy(scene,new B.Vector3(p[0],0,p[1]),i))}
function rayHit(scene,camera){const ray=camera.getForwardRay(110),hit=scene.pickWithRay(ray,m=>!!(m.metadata?.zombieRoot));if(hit?.hit){const z=hit.pickedMesh.metadata.zombieRoot;if(z&&!z.metadata.dead){z.metadata.hp-=34;if(z.metadata.hp<=0){z.metadata.dead=true;z.setEnabled(false);State.kills++;State.score+=300;update();if(State.kills>=6){State.phase=2;objective("NÅ O'LEARYS · PRATA MED ALEX")}}}}}
function shoot(scene,camera){if(State.mode!=='zombie'||!State.started||State.ammo<=0)return;const now=performance.now();if(now-State.lastShot<92)return;State.lastShot=now;State.ammo--;update();rayHit(scene,camera);if(State.muzzle){State.muzzle.setEnabled(true);setTimeout(()=>State.muzzle?.setEnabled(false),42)}}
function reload(){if(State.mode!=='zombie'||State.ammo>=24||State.reserve<=0)return;const need=24-State.ammo,take=Math.min(need,State.reserve);State.ammo+=take;State.reserve-=take;update()}
async function weapon(scene,camera){const h=new B.TransformNode('AR-25',scene);h.parent=camera;h.position.set(.25,-.34,.72);State.weapon=h;const p=new B.TransformNode('recoil',scene);p.parent=h;State.pivot=p;try{const s=split(ASSETS.rifle),r=await B.SceneLoader.ImportMeshAsync('',s.root,s.file,scene);for(const m of r.meshes){if(!m.parent)m.parent=p;m.isPickable=false;m.renderingGroupId=2}p.scaling.setAll(TOUCH?.58:.54)}catch(e){const metal=new B.PBRMaterial('fallback rifle',scene);metal.albedoColor=B.Color3.FromHexString('#1c2225');metal.metallic=.78;metal.roughness=.3;const body=B.MeshBuilder.CreateBox('fallback rifle',{width:.13,height:.15,depth:.72},scene);body.parent=p;body.position.z=.35;body.material=metal;const barrel=B.MeshBuilder.CreateCylinder('fallback barrel',{height:.55,diameter:.045,tessellation:16},scene);barrel.parent=p;barrel.rotation.x=Math.PI/2;barrel.position.z=.92;barrel.material=metal}const fm=new B.StandardMaterial('flash',scene);fm.emissiveColor=B.Color3.FromHexString('#ffd176');fm.disableLighting=true;const f=B.MeshBuilder.CreateSphere('flash',{diameter:.12,segments:8},scene);f.parent=h;f.position.set(0,.01,1.03);f.material=fm;f.setEnabled(false);State.muzzle=f;h.setEnabled(false)}
function coffee(scene,camera){
 const root=new B.TransformNode('V27 COFFEE',scene);root.parent=camera;root.position.set(.34,-.34,.76);root.rotation.set(.08,-.3,.08);State.coffee=root;
 const cupMat=new B.PBRMaterial('coffee cup',scene);cupMat.albedoColor=B.Color3.FromHexString('#8b623c');cupMat.roughness=.78;
 const sleeveMat=new B.PBRMaterial('coffee sleeve',scene);sleeveMat.albedoColor=B.Color3.FromHexString('#d4c19e');sleeveMat.roughness=.9;
 const lidMat=new B.PBRMaterial('coffee lid',scene);lidMat.albedoColor=B.Color3.FromHexString('#e6e1d7');lidMat.roughness=.65;
 const skin=new B.PBRMaterial('coffee hand',scene);skin.albedoColor=B.Color3.FromHexString('#c99d83');skin.roughness=.88;
 const cup=B.MeshBuilder.CreateCylinder('coffee',{height:.27,diameterTop:.105,diameterBottom:.086,tessellation:18},scene);cup.parent=root;cup.material=cupMat;
 const sleeve=B.MeshBuilder.CreateCylinder('sleeve',{height:.12,diameterTop:.108,diameterBottom:.09,tessellation:18},scene);sleeve.parent=root;sleeve.material=sleeveMat;
 const lid=B.MeshBuilder.CreateCylinder('lid',{height:.025,diameterTop:.115,diameterBottom:.11,tessellation:18},scene);lid.parent=root;lid.position.y=.145;lid.material=lidMat;
 const hand=B.MeshBuilder.CreateSphere('coffee hand mesh',{diameter:.15,segments:12},scene);hand.parent=root;hand.position.set(.07,-.07,.02);hand.material=skin;
}
function setMode(scene,mode){
 const zombie=mode==='zombie';
 if(zombie&&State.phase<8){missionFlash('SLUTFÖR CITY MISSION FÖRST');dialog('Mira','Gå till Mitt i City, hämta nödradion och kom tillbaka till torget först.');return}
 State.mode=mode;
 State.weapon?.setEnabled(zombie);State.coffee?.setEnabled(!zombie);
 for(const z of State.zombies)z?.setEnabled?.(zombie);
 const modeBtn=document.getElementById('v27mode');if(modeBtn)modeBtn.textContent=zombie?'CITY':'ZOMBIE';
 for(const id of ['v25fire','v25aim','v25reload']){const e=document.getElementById(id);if(e){e.style.opacity=zombie?'1':'.28';e.style.pointerEvents=zombie?'auto':'none'}}
 if(zombie&&!State.waveSpawned){State.waveSpawned=true;wave(scene);missionFlash('ZOMBIE MODE · TORGET')}
 if(!zombie){
  objective(State.phase>=8?'CITY MISSION KLAR · Z / MODE = ZOMBIE MODE':State.phase===7?'ÅTERVÄND TILL STORA TORGET':State.phase>=4?'GÅ TILL MITT I CITY · JÄRNVÄGSGATAN':'PRATA MED MIRA · STORA TORGET')
 }
 update();
}
async function world(scene){
 await Promise.all(Object.entries(ASSETS).filter(([k])=>k!=='rifle').map(([k,u])=>loadContainer(scene,k,u)));
 const op=local(13.503791,59.380512),museum=local(13.50124,59.38492),mall=local(13.50055,59.37988);
 makeNpc(scene,'Mira','Ta kaffet med dig och gå till Mitt i City. Där inne finns centervärden.',new B.Vector3(-12,0,-9),.3);
 makeNpc(scene,'Alex',"O'Learys blir säker zon om zombie mode aktiveras.",new B.Vector3(op.x+4,0,op.z+6),-1.4);
 makeNpc(scene,'Museivärd','Museet håller öppet i city mode.',new B.Vector3(museum.x+5,0,museum.z+7),2.3);
 makeNpc(scene,'Centervärd','Välkommen in. Plan 0 har mat, caféer och eventyta; butiker finns på flera plan.',new B.Vector3(mall.x,mall.y,mall.z),Math.PI);
 const crowd=[[-8,-5],[-4,8],[8,8],[15,-4],[mall.x+5,mall.z+3],[mall.x-5,mall.z+2],[mall.x+4,mall.z-5],[mall.x-4,mall.z-7],[mall.x+7,mall.z-9],[mall.x-7,mall.z-10]];
 crowd.forEach((p,i)=>makeNpc(scene,'Stadsgäst '+(i+1),i%3===0?'Jag är på väg mot Mitt i City.':i%3===1?'Det är mer folk ute på stan nu.':'Bussen går snart från torget.',new B.Vector3(p[0],0,p[1]),(i*.7)%6.2));
 const car=State.containers.car;if(car){
  [[34,-15,.05],[-20,14,1.7],[56,9,1.58],[mall.x+12,mall.z+12,1.55],[mall.x-14,mall.z+8,-1.55]].forEach((v,i)=>{const c=spawn(scene,'car','city car '+i,new B.Vector3(v[0],0,v[1]),v[2],1);if(c)addCollider(scene,c,'car')});
  const m=spawn(scene,'car','moving car',new B.Vector3(-55,0,-41),Math.PI/2,1);if(m){addCollider(scene,m,'car');State.traffic.push({r:m,a:new B.Vector3(-55,0,-41),b:new B.Vector3(55,0,-41),t:.1,d:1,s:.0017,kind:'car'})}
 }
 const bus=spawn(scene,'bus','Värmland city bus',new B.Vector3(64,0,-48),0,1);if(bus){addCollider(scene,bus,'bus');State.traffic.push({r:bus,a:new B.Vector3(64,0,-48),b:new B.Vector3(64,0,48),t:.1,d:1,s:.001,kind:'bus'})}
}
function start(scene,camera){if(State.started)return;State.started=true;State.phase=-1;coffee(scene,camera);weapon(scene,camera);setTimeout(()=>setMode(scene,'city'),80);update();objective('PRATA MED MIRA · STORA TORGET')}
function quality(engine,v){State.quality=Number(v);engine.setHardwareScalingLevel(State.quality===0?1.42:State.quality===2?1:(IOS?1.18:1.12))}
async function init(){ui();let tries=0;while((!B.Engine.LastCreatedScene||!B.Engine.LastCreatedScene.activeCamera)&&tries++<200)await new Promise(r=>setTimeout(r,50));const scene=B.Engine.LastCreatedScene,camera=scene?.activeCamera,engine=scene?.getEngine();if(!scene||!camera||!engine)return;
try{camera.inputs.removeByType('FreeCameraMouseInput')}catch(e){}camera.fov=1.04;camera.speed=.88;camera.checkCollisions=true;camera.applyGravity=true;camera.ellipsoid=new B.Vector3(.38,.88,.38);scene.imageProcessingConfiguration.exposure=1.03;scene.imageProcessingConfiguration.contrast=1.34;scene.imageProcessingConfiguration.vignetteWeight=.38;scene.fogDensity=.00082;
for(const l of scene.lights||[])if(l instanceof B.DirectionalLight)l.intensity=Math.min(Math.max(l.intensity,2.35),2.65);if(TOUCH)engine.setHardwareScalingLevel(IOS?1.18:1.12);
const baseLook=document.getElementById('look');if(baseLook)baseLook.style.pointerEvents='none';const baseBrand=document.querySelector('.brand span');if(baseBrand)baseBrand.textContent='REAL CITY V30 · PLAYABLE CITY LOOP';
await Promise.all([world(scene),loadV28MapData(scene)]);start(scene,camera);State.lastPos=camera.position.clone();State.lastLandPos=camera.position.clone();camera.onCollide=mesh=>collisionFeedback(camera,mesh);document.addEventListener('pointerdown',ensureAudio,{once:true,capture:true});
canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('pointerdown',e=>{ensureAudio();if(TOUCH)return;if(document.pointerLockElement!==canvas){canvas.requestPointerLock?.();return}if(e.button===0){State.fireHeld=true;shoot(scene,camera)}if(e.button===2)State.ads=true});document.addEventListener('mouseup',e=>{if(e.button===0)State.fireHeld=false;if(e.button===2)State.ads=false});document.addEventListener('mousemove',e=>{if(TOUCH||document.pointerLockElement!==canvas)return;const m=State.ads?.52:1;camera.rotation.y+=e.movementX*State.mouseSens*m;camera.rotation.x=Math.max(-1.3,Math.min(1.3,camera.rotation.x+e.movementY*State.mouseSens*.76*m))});
document.addEventListener('pointerlockchange',()=>{const h=document.getElementById('v25hint');if(h)h.style.display=document.pointerLockElement===canvas?'none':'block'});
document.addEventListener('keydown',e=>{ensureAudio();if(e.code==='KeyR')reload();if(e.code==='KeyE')interact(scene,camera);if(e.code==='KeyZ')setMode(scene,State.mode==='city'?'zombie':'city');if(e.code==='ShiftLeft'||e.code==='ShiftRight')State.sprintHeld=true;if(e.code==='Space')camera.cameraDirection.y=.22});document.addEventListener('keyup',e=>{if(e.code==='ShiftLeft'||e.code==='ShiftRight')State.sprintHeld=false});
const look=document.getElementById('v25look');let lx=0,ly=0,lid=null;look.addEventListener('pointerdown',e=>{lid=e.pointerId;lx=e.clientX;ly=e.clientY;look.setPointerCapture(e.pointerId)});look.addEventListener('pointermove',e=>{if(e.pointerId!==lid)return;const dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;const m=State.ads?.62:1;camera.rotation.y+=dx*State.touchSens*m;camera.rotation.x=Math.max(-1.32,Math.min(1.32,camera.rotation.x+dy*State.touchSens*.78*m))});look.addEventListener('pointerup',e=>{if(e.pointerId===lid)lid=null});look.addEventListener('pointercancel',()=>lid=null);
const hold=(id,on,off)=>{const e=document.getElementById(id);e.addEventListener('pointerdown',x=>{x.preventDefault();on()});e.addEventListener('pointerup',x=>{x.preventDefault();off?.()});e.addEventListener('pointercancel',()=>off?.())};hold('v25fire',()=>{State.fireHeld=true;shoot(scene,camera)},()=>State.fireHeld=false);hold('v25aim',()=>State.ads=true,()=>State.ads=false);hold('v25jump',()=>camera.cameraDirection.y=.22);hold('v25use',()=>interact(scene,camera));hold('v25reload',reload);hold('v27mode',()=>setMode(scene,State.mode==='city'?'zombie':'city'));hold('v30run',()=>State.sprintHeld=true,()=>State.sprintHeld=false);
const panel=document.getElementById('v25panel');document.getElementById('v25settings').addEventListener('pointerdown',e=>{e.preventDefault();panel.classList.add('show')});document.getElementById('v25close').addEventListener('click',()=>panel.classList.remove('show'));document.getElementById('v25touch').addEventListener('input',e=>{const v=Number(e.target.value);State.touchSens=.00515*(v/100);text('v25touchVal',v+'%')});document.getElementById('v25mouse').addEventListener('input',e=>{const v=Number(e.target.value);State.mouseSens=.0022*(v/100);text('v25mouseVal',v+'%')});document.getElementById('v25quality').addEventListener('input',e=>quality(engine,e.target.value));quality(engine,1);
scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(2.1,engine.getDeltaTime()/16.67);const curPos=camera.position.clone();State.lastDelta=State.lastPos?curPos.subtract(State.lastPos):B.Vector3.Zero();State.lastPos=curPos;updateMovementFeel(camera,dt);drawMap(camera);handleWater(camera);updateAudio(camera);if(State.mode==='zombie'&&State.fireHeld&&performance.now()-State.lastShot>96)shoot(scene,camera);if(State.coffee&&State.mode==='city'){State.coffee.rotation.z=.08+Math.sin(performance.now()*.003)*.025;State.coffee.position.y=-.34+Math.sin(performance.now()*.0024)*.008}if(State.weapon&&State.mode==='zombie'){const tx=State.ads?.015:.27,ty=State.ads?-.29:-.39,tz=State.ads?.61:.78;camera.fov+=((State.ads?.78:(State.sprintHeld&&State.stamina>1?1.105:1.04))-camera.fov)*.18*dt;State.weapon.position.x+=(tx-State.weapon.position.x)*.18*dt;State.weapon.position.y+=(ty-State.weapon.position.y)*.18*dt;State.weapon.position.z+=(tz-State.weapon.position.z)*.18*dt}for(const t of State.traffic){t.t+=t.s*dt*t.d;let turned=false;if(t.t>1){t.t=1;t.d=-1;turned=true}else if(t.t<0){t.t=0;t.d=1;turned=true}const p=B.Vector3.Lerp(t.a,t.b,t.t);t.r.position.copyFrom(p);const q=(t.d>0?t.b:t.a).subtract(p);if(q.lengthSquared()>.01)t.r.rotation.y=Math.atan2(q.x,q.z);if(turned&&t.kind==='bus'&&State.audioReady)oneShot('brake',p)}const n=nearestNpc(camera),pr=document.getElementById('v25prompt');State.nearNpc=n;if(n){pr.textContent=(TOUCH?'USE':'E')+' · '+n.metadata.npcName;pr.classList.add('show')}else pr.classList.remove('show');const mallPos=local(13.50055,59.37988),torgetPos=local(13.50295,59.380767);if(State.mode==='city'&&State.phase===4&&B.Vector3.Distance(camera.position,mallPos)<20){State.phase=5;objective('GÅ IN I MITT I CITY · PRATA MED CENTERVÄRD');missionFlash('MITT I CITY')}if(State.mode==='city'&&State.phase===7&&B.Vector3.Distance(camera.position,torgetPos)<18){State.phase=8;State.missionDone=true;State.score+=900;update();objective('CITY MISSION KLAR · Z / MODE = ZOMBIE MODE');missionFlash('ZOMBIE MODE UPPLÅST');dialog('Mira','Bra. Radion fungerar. Nu kan du aktivera zombie mode när du vill.')}if(State.mode==='zombie'&&State.phase===1)for(const z of State.zombies){if(!z||z.metadata.dead||!z.isEnabled())continue;const dx=camera.position.x-z.position.x,dz=camera.position.z-z.position.z,d=Math.hypot(dx,dz);if(d<55&&d>1.7){z.position.x+=dx/d*.045*dt;z.position.z+=dz/d*.045*dt;z.rotation.y=Math.atan2(dx,dz)}else if(d<=1.7){State.health-=.12*dt;update()}}});
}
init().catch(e=>console.error('V28 init failed',e));
})();