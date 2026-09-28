(async()=>{'use strict';
const B=BABYLON,$=id=>document.getElementById(id),canvas=$('renderCanvas'),status=$('status'),loading=$('loading'),loadText=$('loadText'),loadProgress=$('loadProgress'),errorBox=$('error');
const ORIGIN={lat:59.380767,lon:13.50295};
const BBOX={west:13.4974,south:59.3780,east:13.5086,north:59.3857};
const BASE='https://gi.karlstad.se/arcgis/rest/services/external/KARLSTAD_BaseMap_Sweref99_1330/MapServer';
const TREES='https://gi.karlstad.se/arcgis/rest/services/external/Karlstad_Samlingstjanst/MapServer';
const sceneStats={buildings:0,roads:0,trees:0,land:0,filtered:0,hero:0,landmarks:0,source:'Karlstads kommun'};const HERO=window.KarlstadHeroBuildings||{targets:[],squareCluster:null,styles:{}};
const buildingGroups=new Map(),roadMeshes=[],sidewalkMeshes=[],roofMeshes=[],buildingFootprints=[],roadCorridors=[],heroMeshes=[],waterZones=[],namedRoads=[];let heroById=new Map();
const metersLon=111320*Math.cos(ORIGIN.lat*Math.PI/180),metersLat=110540;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const local=([lon,lat])=>new B.Vector3((lon-ORIGIN.lon)*metersLon,0,-(lat-ORIGIN.lat)*metersLat);
function setProgress(n,text){loadProgress.style.width=n+'%';if(text)loadText.textContent=text}
function showError(text){errorBox.textContent=text;errorBox.classList.add('show')}
function hash(v){const s=String(v??'');let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0)/4294967295}
function area2D(ring){let a=0;for(let i=0,j=ring.length-1;i<ring.length;j=i++)a+=ring[j].x*ring[i].z-ring[i].x*ring[j].z;return Math.abs(a*.5)}
function cleanRing(coords){if(!coords?.length)return[];const out=coords.map(local);if(out.length>1&&B.Vector3.DistanceSquared(out[0],out[out.length-1])<.0001)out.pop();return out}
function mat(name,hex,rough=.82,metal=0){const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.FromHexString(hex);m.roughness=rough;m.metallic=metal;return m}
const mobileDevice=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>1;
const appleTouch=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let engine;
try{
 if(!appleTouch&&B.WebGPUEngine&&navigator.gpu&&location.protocol==='https:'){const ok=await B.WebGPUEngine.IsSupportedAsync;if(ok){engine=new B.WebGPUEngine(canvas);await engine.initAsync();engine.__backend='WebGPU'}}
}catch(e){console.warn('WebGPU fallback',e)}
if(!engine){engine=new B.Engine(canvas,true,{antialias:true,stencil:true,adaptToDeviceRatio:true,preserveDrawingBuffer:false});engine.__backend=appleTouch?'WebGL2 · MOBILE':'WebGL2'}
if(mobileDevice)engine.setHardwareScalingLevel(1.18)
const scene=new B.Scene(engine);scene.skipPointerMovePicking=true;scene.performancePriority=B.ScenePerformancePriority?.Aggressive??scene.performancePriority;scene.clearColor=new B.Color4(.56,.69,.75,1);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.00034;scene.fogColor=new B.Color3(.58,.70,.75);scene.gravity=new B.Vector3(0,-.42,0);scene.collisionsEnabled=true;scene.ambientColor=new B.Color3(.22,.23,.22);
scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;scene.imageProcessingConfiguration.exposure=1.02;scene.imageProcessingConfiguration.contrast=1.20;scene.imageProcessingConfiguration.vignetteEnabled=true;scene.imageProcessingConfiguration.vignetteWeight=.18;scene.imageProcessingConfiguration.vignetteStretch=.05;scene.imageProcessingConfiguration.vignetteColor=new B.Color4(.03,.04,.045,1);try{scene.environmentTexture=B.CubeTexture.CreateFromPrefilteredData('https://assets.babylonjs.com/environments/environmentSpecular.env',scene);scene.environmentIntensity=.62}catch(e){}
const camera=new B.UniversalCamera('player',new B.Vector3(0,1.8,0),scene);camera.minZ=.05;camera.maxZ=1300;camera.fov=1.06;camera.inertia=.58;camera.angularSensibility=4100;camera.speed=.72;camera.checkCollisions=true;camera.applyGravity=true;camera.ellipsoid=new B.Vector3(.38,.88,.38);camera.ellipsoidOffset=new B.Vector3(0,-.04,0);camera.keysUp.push(87);camera.keysDown.push(83);camera.keysLeft.push(65);camera.keysRight.push(68);camera.attachControl(canvas,true);camera.setTarget(new B.Vector3(0,1.8,-40));
const hemi=new B.HemisphericLight('sky',new B.Vector3(0,1,0),scene);hemi.intensity=.72;hemi.diffuse=B.Color3.FromHexString('#d5e1e0');hemi.groundColor=B.Color3.FromHexString('#4d5648');
const sun=new B.DirectionalLight('sun',new B.Vector3(.55,-.75,.36),scene);sun.position=new B.Vector3(-220,320,-250);sun.diffuse=B.Color3.FromHexString('#ffe1b0');sun.intensity=2.45;
const shadows=new B.ShadowGenerator(mobileDevice?512:2048,sun);shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=mobileDevice?B.ShadowGenerator.QUALITY_LOW:B.ShadowGenerator.QUALITY_MEDIUM;shadows.bias=.0014;shadows.normalBias=.03;shadows.darkness=mobileDevice?.19:.28;
try{const pipe=new B.DefaultRenderingPipeline('real-city-pipe',true,scene,[camera]);pipe.fxaaEnabled=true;pipe.bloomEnabled=!mobileDevice;pipe.bloomThreshold=1.12;pipe.bloomWeight=.018;pipe.bloomKernel=18;pipe.sharpenEnabled=true;pipe.sharpen.edgeAmount=mobileDevice?.20:.42;pipe.sharpen.colorAmount=mobileDevice?.55:.70;pipe.samples=1}catch(e){}
const M={ground:mat('ground','#7e8773',.96),asphalt:mat('asphalt','#5b6467',.9),paving:mat('square granite','#aaa99d',.68),sidewalk:mat('sidewalk','#a6a99f',.9),water:mat('river','#3f7888',.16,.24),roof:mat('roof','#35464b',.54,.34),tree:mat('leaves','#4e7440',.94),trunk:mat('trunk','#5a4332',.98),glass:mat('window glass','#284854',.16,.45),frame:mat('window frames','#30383a',.38,.58),door:mat('doors','#46372c',.78),park:mat('park grass','#64804f',.96),metal:mat('street metal','#343d40',.42,.7),bench:mat('bench wood','#73513a',.72),planter:mat('planter','#5b6360',.82)};
const buildingMats=[mat('ochre plaster','#b89a72',.82),mat('brick','#7a5548',.9),mat('pale stone','#c7c0aa',.84),mat('warm grey','#8c8c80',.88),mat('painted facade','#a8b0a4',.86),mat('civic stone','#afa892',.78)];
const heroMaterials=new Map();
function heroMaterial(spec){const key=spec.style||'square';if(heroMaterials.has(key))return heroMaterials.get(key);const s=HERO.styles?.[key]||HERO.styles?.square||{facade:'#a79478'};const m=mat('hero '+key,s.facade||'#a79478',.72,.05);m.albedoTexture=procTex('hero '+key+' tex',key==='museum'?'stone':'plaster',s.facade||'#a79478','#6c665c');m.albedoTexture.uScale=5;m.albedoTexture.vScale=5;heroMaterials.set(key,m);return m}

function procTex(name,kind,base,line){
 const size=512,t=new B.DynamicTexture(name,{width:size,height:size},scene,false),g=t.getContext();
 g.fillStyle=base;g.fillRect(0,0,size,size);
 if(kind==='brick'){
  g.strokeStyle=line;g.globalAlpha=.72;g.lineWidth=3;
  const bh=52,bw=104;
  for(let y=0;y<size;y+=bh){g.beginPath();g.moveTo(0,y);g.lineTo(size,y);g.stroke();const off=((y/bh)%2)*bw/2;for(let x=-bw+off;x<size;x+=bw){g.beginPath();g.moveTo(x,y);g.lineTo(x,y+bh);g.stroke()}}
 }else if(kind==='stone'){
  g.strokeStyle=line;g.globalAlpha=.38;g.lineWidth=2;
  for(let x=0;x<size;x+=96){g.beginPath();g.moveTo(x,0);g.lineTo(x,size);g.stroke()}
  for(let y=0;y<size;y+=72){g.beginPath();g.moveTo(0,y);g.lineTo(size,y);g.stroke()}
 }else if(kind==='asphalt'){
  g.fillStyle=base;g.fillRect(0,0,size,size);
  g.globalAlpha=.08;g.fillStyle='#ffffff';for(let i=0;i<18;i++){const y=18+i*29;g.fillRect(0,y,size,1)}
  g.globalAlpha=.08;g.fillStyle='#20272a';for(let i=0;i<8;i++){const x=(i*71+23)%size;g.fillRect(x,0,2,size)}
 }else{
  const grad=g.createLinearGradient(0,0,size,size);grad.addColorStop(0,base);grad.addColorStop(.55,base);grad.addColorStop(1,line);g.globalAlpha=.13;g.fillStyle=grad;g.fillRect(0,0,size,size);
  g.globalAlpha=.10;g.fillStyle='#ffffff';for(let y=64;y<size;y+=128)g.fillRect(0,y,size,2)
 }
 g.globalAlpha=1;t.update(false);t.wrapU=t.wrapV=B.Texture.WRAP_ADDRESSMODE;t.uScale=3;t.vScale=3;
 t.anisotropicFilteringLevel=8;try{t.updateSamplingMode(B.Texture.TRILINEAR_SAMPLINGMODE)}catch(e){}
 return t
}
buildingMats[0].albedoTexture=procTex('plaster tex','plaster','#c4a982','#8d775d');buildingMats[1].albedoTexture=procTex('brick tex','brick','#875e4f','#573f37');buildingMats[2].albedoTexture=procTex('stone tex','stone','#c7c0ad','#918b7c');buildingMats[3].albedoTexture=procTex('grey tex','plaster','#96978d','#6b6d67');buildingMats[4].albedoTexture=procTex('paint tex','plaster','#b3b9ae','#7f877f');buildingMats[5].albedoTexture=procTex('civic tex','stone','#b8b09b','#827a6a');
const pavingTex=procTex('torget stone grid','stone','#b9b7ad','#929188');pavingTex.uScale=7;pavingTex.vScale=7;M.paving.albedoTexture=pavingTex;
const asphaltTex=procTex('asphalt clean','asphalt','#575f63','#454d50');asphaltTex.uScale=5;asphaltTex.vScale=5;M.asphalt.albedoTexture=asphaltTex;
const sidewalkTex=procTex('sidewalk slabs','stone','#b6b7ae','#92958d');sidewalkTex.uScale=5;sidewalkTex.vScale=5;M.sidewalk.albedoTexture=sidewalkTex;
const stoneBump=procTex('V33 stone bump','stone','#999999','#777777');stoneBump.uScale=5;stoneBump.vScale=5;M.asphalt.bumpTexture=null;M.paving.bumpTexture=stoneBump;M.paving.bumpTexture.level=.035;M.sidewalk.bumpTexture=stoneBump;M.sidewalk.bumpTexture.level=.025;
M.glass.environmentIntensity=.9;M.glass.microSurface=.95;M.water.environmentIntensity=.86;M.water.microSurface=.96;M.metal.environmentIntensity=.82;M.asphalt.roughness=.86;M.sidewalk.roughness=.82;M.paving.roughness=.74;
const V29={marking:mat('V29 road marking','#e8e1c7',.58,.04),cross:mat('V29 crossing','#f2eee2',.54,.02),shelter:mat('V29 shelter metal','#30383b',.34,.72),shelterGlass:mat('V29 shelter glass','#547786',.12,.28),accent:mat('V29 city accent','#d9a93d',.46,.22)};
V29.marking.emissiveColor=B.Color3.FromHexString('#24221c');V29.cross.emissiveColor=B.Color3.FromHexString('#25231e');V29.shelterGlass.alpha=.62;V29.shelterGlass.transparencyMode=B.PBRMaterial.PBRMATERIAL_ALPHABLEND;



const lowDetail=matchMedia('(pointer:coarse), (max-width:900px)').matches;const isSafari=/^((?!chrome|android).)*safari/i.test(navigator.userAgent);let windowBudget=lowDetail?220:760,doorBudget=lowDetail?58:165,roofBudget=(lowDetail||isSafari)?72:180,corniceBudget=lowDetail?34:88,storeBudget=lowDetail?42:120;const frameSource=B.MeshBuilder.CreateBox('window frame source',{width:1.02,height:1.34,depth:.065},scene);frameSource.material=M.frame;frameSource.position.y=-500;frameSource.isPickable=false;const windowSource=B.MeshBuilder.CreateBox('window source',{width:.82,height:1.12,depth:.075},scene);windowSource.material=M.glass;windowSource.position.y=-500;windowSource.isPickable=false;const doorSource=B.MeshBuilder.CreateBox('door source',{width:1.1,height:2.15,depth:.08},scene);doorSource.material=M.door;doorSource.position.y=-500;doorSource.isPickable=false;const corniceSource=B.MeshBuilder.CreateBox('cornice source',{width:1,height:.2,depth:.16},scene);corniceSource.material=M.frame;corniceSource.position.y=-500;corniceSource.isPickable=false;const plinthSource=B.MeshBuilder.CreateBox('plinth source',{width:1,height:.36,depth:.13},scene);plinthSource.material=M.frame;plinthSource.position.y=-500;plinthSource.isPickable=false;const heroCanopySource=B.MeshBuilder.CreateBox('hero canopy source',{width:3.2,height:.14,depth:.9},scene);heroCanopySource.material=M.frame;heroCanopySource.position.y=-500;const heroBandSource=B.MeshBuilder.CreateBox('hero band source',{width:1,height:.12,depth:.09},scene);heroBandSource.material=M.frame;heroBandSource.position.y=-500;
const storeGlassMat=mat('V33 storefront glass','#365765',.12,.42);storeGlassMat.environmentIntensity=.86;
const awningMat=mat('V33 awning','#a94636',.58,.08);
const storeWindowSource=B.MeshBuilder.CreateBox('V33 storefront source',{width:1.65,height:2.15,depth:.085},scene);storeWindowSource.material=storeGlassMat;storeWindowSource.position.y=-500;storeWindowSource.isPickable=false;
const awningSource=B.MeshBuilder.CreateBox('V33 awning source',{width:1.8,height:.14,depth:.58},scene);awningSource.material=awningMat;awningSource.position.y=-500;awningSource.isPickable=false;
function centroid2D(ring){let x=0,z=0;for(const p of ring){x+=p.x;z+=p.z}const n=ring.length||1;return new B.Vector3(x/n,0,z/n)}
function longestAxis(ring){let best={len:0,u:new B.Vector3(1,0,0)};for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len>best.len)best={len,u:new B.Vector3(dx/len,0,dz/len)}}const v=new B.Vector3(-best.u.z,0,best.u.x),center=centroid2D(ring);let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;for(const p of ring){const d=p.subtract(center),pu=B.Vector3.Dot(d,best.u),pv=B.Vector3.Dot(d,v);minU=Math.min(minU,pu);maxU=Math.max(maxU,pu);minV=Math.min(minV,pv);maxV=Math.max(maxV,pv)}return{u:best.u,v,center,hu:(maxU-minU)/2,hv:(maxV-minV)/2}}
function roofRectangularity(ring){const o=longestAxis(ring),box=Math.max(.01,(o.hu*2)*(o.hv*2));return area2D(ring)/box}
function normName(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function featureId(f){return String(f?.properties?.FID??f?.properties?.OBJECTID??'')}
function featureCenter(f){const ring=polygonParts(f)[0]?.[0];if(!ring?.length)return null;let x=0,z=0;for(const p of ring){const v=local(p);x+=v.x;z+=v.z}return new B.Vector3(x/ring.length,0,z/ring.length)}
function featureArea(f){const ring=polygonParts(f)[0]?.[0];return ring?.length?area2D(cleanRing(ring)):0}
function resolveHeroBuildings(features){const out=new Map(),taken=new Set();for(const target of HERO.targets||[]){let best=null,bestD=Infinity;const targetPos=local([target.lon,target.lat]);for(const f of features){const id=featureId(f),props=f.properties||{},name=normName(props.name),matched=(target.match||[]).some(m=>name.includes(normName(m)));const p=featureCenter(f);if(!p)continue;const d=B.Vector3.DistanceSquared(p,targetPos);if((matched||d<target.radius*target.radius)&&d<bestD){best=f;bestD=d}}if(best){const id=featureId(best);out.set(id,{...target,id});taken.add(id)}}const sq=HERO.squareCluster;if(sq){const p0=local([sq.lon,sq.lat]),candidates=features.filter(f=>{const id=featureId(f),p=featureCenter(f);return p&&!taken.has(id)&&B.Vector3.DistanceSquared(p,p0)<sq.radius*sq.radius&&featureArea(f)>=sq.minArea}).sort((a,b)=>featureArea(b)-featureArea(a)).slice(0,sq.max||4);candidates.forEach((f,i)=>out.set(featureId(f),{...sq,key:sq.key+'-'+(i+1),id:featureId(f),clusterIndex:i}))}return out}
function addHeroDetails(ring,h,spec,index){const center=centroid2D(ring),edges=[];for(let e=0;e<ring.length;e++){const a=ring[e],b=ring[(e+1)%ring.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<5)continue;let nx=-dz/len,nz=dx/len,mid=new B.Vector3((a.x+b.x)/2,0,(a.z+b.z)/2);if((center.x-mid.x)*nx+(center.z-mid.z)*nz>0){nx=-nx;nz=-nz}edges.push({a,b,dx,dz,len,nx,nz})}edges.sort((a,b)=>b.len-a.len);for(const edge of edges.slice(0,2)){const floors=clamp(Math.round((h-1)/3.05),2,5),count=Math.min(7,Math.max(3,Math.floor(edge.len/3.2)));for(let floor=0;floor<floors;floor++){const y=1.45+floor*3.05;if(y+1>h)break;for(let w=0;w<count;w++){const t=(w+1)/(count+1),x=edge.a.x+edge.dx*t,z=edge.a.z+edge.dz*t,fr=frameSource.createInstance('hero window frame'),wi=windowSource.createInstance('hero window');fr.position.set(x+edge.nx*.05,y,z+edge.nz*.05);wi.position.set(x+edge.nx*.09,y,z+edge.nz*.09);fr.rotation.y=wi.rotation.y=Math.atan2(edge.nx,edge.nz)}}}const front=edges[0];if(front){const mx=(front.a.x+front.b.x)/2,mz=(front.a.z+front.b.z)/2,ang=Math.atan2(front.nx,front.nz),named=spec.key==='sandgrund'||spec.key==='varmlands-museum';if(named){const can=heroCanopySource.createInstance('hero canopy');can.position.set(mx+front.nx*.48,2.45,mz+front.nz*.48);can.rotation.y=ang}const band=heroBandSource.createInstance('hero upper band');band.position.set(mx+front.nx*.075,Math.max(3,h*.74),mz+front.nz*.075);band.rotation.y=ang;band.scaling.x=Math.max(3,front.len*(named?.62:.48))}}

function addFacadeDetails(ring,h,props,index){if(windowBudget<=0)return;const floors=clamp(Math.round((h-1)/3.05),1,lowDetail?4:6),center=centroid2D(ring);let longest={len:0,a:null,b:null,n:null};for(let e=0;e<ring.length;e++){const a=ring[e],b=ring[(e+1)%ring.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<4)continue;let nx=-dz/len,nz=dx/len,mid=new B.Vector3((a.x+b.x)/2,0,(a.z+b.z)/2);if((center.x-mid.x)*nx+(center.z-mid.z)*nz>0){nx=-nx;nz=-nz}if(len>longest.len)longest={len,a,b,n:{x:nx,z:nz}};const count=Math.max(1,Math.min(lowDetail?3:5,Math.floor((len-1.2)/2.7)));for(let floor=0;floor<floors&&windowBudget>0;floor++){const y=1.35+floor*3.05;if(y+1>h)break;for(let w=0;w<count&&windowBudget>0;w++){const t=(w+1)/(count+1),x=a.x+dx*t,z=a.z+dz*t,frame=frameSource.createInstance('window frame i'),win=windowSource.createInstance('window i');frame.position.set(x+nx*.045,y,z+nz*.045);frame.rotation.y=Math.atan2(nx,nz);win.position.set(x+nx*.083,y,z+nz*.083);win.rotation.y=frame.rotation.y;frame.isPickable=win.isPickable=false;windowBudget--;}}}if(longest.a){const {a,b,n}=longest,mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;if(doorBudget>0){const door=doorSource.createInstance('door i');door.position.set(mx+n.x*.085,1.075,mz+n.z*.085);door.rotation.y=Math.atan2(n.x,n.z);door.isPickable=false;doorBudget--}const central=Math.hypot(center.x,center.z)<205;if(central&&storeBudget>0&&longest.len>9){const dx=b.x-a.x,dz=b.z-a.z,count=Math.min(3,Math.max(2,Math.floor(longest.len/5.5)));for(let q=0;q<count&&storeBudget>0;q++){const t=(q+1)/(count+1),x=a.x+dx*t,z=a.z+dz*t,sw=storeWindowSource.createInstance('V33 storefront'),aw=awningSource.createInstance('V33 awning');sw.position.set(x+n.x*.095,1.45,z+n.z*.095);sw.rotation.y=Math.atan2(n.x,n.z);aw.position.set(x+n.x*.32,2.7,z+n.z*.32);aw.rotation.y=sw.rotation.y;storeBudget--}}if(corniceBudget>0&&longest.len>8){const ang=Math.atan2(n.x,n.z),corn=corniceSource.createInstance('cornice i'),pl=plinthSource.createInstance('plinth i');corn.position.set(mx+n.x*.07,h-.13,mz+n.z*.07);corn.rotation.y=ang;corn.scaling.x=Math.max(1,longest.len*.94);pl.position.set(mx+n.x*.065,.2,mz+n.z*.065);pl.rotation.y=ang;pl.scaling.x=Math.max(1,longest.len*.94);corn.isPickable=pl.isPickable=false;corniceBudget--;}}}
function customRoof(name,ring,h,kind){const o=longestAxis(ring);let hu=o.hu,hv=o.hv;if(hu<2||hv<2)return null;const rise=clamp(Math.min(3.8,hv*.55),1.15,4.2),rf=kind==='hipped'?.58:1,u=o.u,v=o.v,c=o.center;hu+=.16;hv+=.16;function P(du,dv,y){return[c.x+u.x*du+v.x*dv,y,c.z+u.z*du+v.z*dv]}const A=P(-hu,-hv,h),B1=P(hu,-hv,h),C1=P(hu,hv,h),D=P(-hu,hv,h),E=P(-hu*rf,0,h+rise),F=P(hu*rf,0,h+rise),pos=[],idx=[];function face(points){const base=pos.length/3;for(const p of points)pos.push(...p);if(points.length===3)idx.push(base,base+1,base+2);else idx.push(base,base+1,base+2,base,base+2,base+3)}face([A,B1,F,E]);face([D,E,F,C1]);face([A,E,D]);face([B1,C1,F]);const vd=new B.VertexData();vd.positions=pos;vd.indices=idx;vd.normals=[];B.VertexData.ComputeNormals(pos,idx,vd.normals);const m=new B.Mesh(name,scene);vd.applyToMesh(m);m.material=M.roof;m.receiveShadows=true;m.isPickable=false;roofMeshes.push(m);return m}
function addRoof(ring,holes,h,props,index){if(roofBudget<=0)return;const t=String(props['roof:shape']||props.roof_shape||'').toLowerCase(),a=area2D(ring),r=hash((props.FID||props.OBJECTID||index)+'roof');if(a<45)return;const rectangularity=roofRectangularity(ring),simple=ring.length<=8&&rectangularity>=.76;let kind='flat';if(simple){kind=t.includes('hip')?'hipped':t.includes('gable')?'gabled':t.includes('flat')?'flat':(a>1200?'flat':r<.48?'gabled':r<.76?'hipped':'flat')}let made=null;if(kind==='flat'){try{made=B.MeshBuilder.CreatePolygon('roof cap '+index,{shape:ring,holes,sideOrientation:B.Mesh.DOUBLESIDE},scene,earcut);made.position.y=h+.04;made.material=M.roof;made.receiveShadows=true;made.isPickable=false;roofMeshes.push(made)}catch(e){}}else made=customRoof('roof '+kind+' '+index,ring,h,kind);if(made){made.freezeWorldMatrix();roofBudget--;}}

const ground=B.MeshBuilder.CreateGround('ground',{width:1300,height:1300,subdivisions:1},scene);ground.material=M.ground;ground.receiveShadows=true;ground.checkCollisions=true;ground.position.y=-.03;
const square=B.MeshBuilder.CreateGround('Stora torget paving',{width:108,height:82,subdivisions:1},scene);square.position.set(0,.012,0);square.material=M.paving;square.receiveShadows=true;square.isPickable=false;
const lampPoleSource=B.MeshBuilder.CreateCylinder('lamp pole source',{height:4.5,diameter:.12,tessellation:8},scene);lampPoleSource.material=M.metal;lampPoleSource.position.y=-500;const lampHeadSource=B.MeshBuilder.CreateSphere('lamp head source',{diameter:.38,segments:6},scene);lampHeadSource.material=M.frame;lampHeadSource.position.y=-500;const benchSeatSource=B.MeshBuilder.CreateBox('bench seat source',{width:2.2,height:.16,depth:.55},scene);benchSeatSource.material=M.bench;benchSeatSource.position.y=-500;const benchBackSource=B.MeshBuilder.CreateBox('bench back source',{width:2.2,height:.72,depth:.12},scene);benchBackSource.material=M.bench;benchBackSource.position.y=-500;const planterSource=B.MeshBuilder.CreateCylinder('planter source',{height:.55,diameter:1.25,tessellation:10},scene);planterSource.material=M.planter;planterSource.position.y=-500;const planterGreenSource=B.MeshBuilder.CreateIcoSphere('planter green source',{radius:.62,subdivisions:1},scene);planterGreenSource.material=M.tree;planterGreenSource.position.y=-500;
function roadDistanceSq(x,z){let best=Infinity;for(const r of roadCorridors)for(let i=0;i<r.pts.length-1;i++)best=Math.min(best,segDistSq(x,z,r.pts[i],r.pts[i+1])-r.half*r.half);return best}

function v29RoadMarkings(){
 let budget=matchMedia('(pointer:coarse)').matches?115:210;
 for(const r of roadCorridors){
  if(budget<=0)break;
  const cls=String(r.properties?.KLASS||r.properties?.highway||'').toLowerCase();
  if(!/(primary|secondary|tertiary|residential|0|1|2|3|4|5)/.test(cls))continue;
  for(let i=1;i<r.pts.length&&budget>0;i++){
   const a=r.pts[i-1],b=r.pts[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<4)continue;
   const ux=dx/len,uz=dz/len,ang=Math.atan2(dx,dz);
   for(let d=4;d<len-1&&budget>0;d+=9){
    const dash=B.MeshBuilder.CreateBox('V29 lane dash',{width:.13,height:.025,depth:2.35},scene);
    dash.position.set(a.x+ux*d,.071,a.z+uz*d);dash.rotation.y=ang;dash.material=V29.marking;dash.isPickable=false;budget--;
   }
  }
 }
 function crossing(x,z,rot,w=5.6){
  for(let i=-4;i<=4;i++){const stripe=B.MeshBuilder.CreateBox('V29 zebra',{width:w,height:.028,depth:.38},scene);stripe.position.set(x+Math.sin(rot)*i*.68,.078,z+Math.cos(rot)*i*.68);stripe.rotation.y=rot;stripe.material=V29.cross;stripe.isPickable=false}
 }
 crossing(0,-34,0,6.8);crossing(0,34,0,6.8);crossing(-48,0,Math.PI/2,6.2);crossing(48,0,Math.PI/2,6.2);
}
function v29BusShelter(x,z,rot=0){
 const root=new B.TransformNode('V29 bus shelter',scene);root.position.set(x,0,z);root.rotation.y=rot;
 for(const sx of [-1.55,1.55]){const p=B.MeshBuilder.CreateBox('bus shelter post',{width:.08,height:2.45,depth:.08},scene);p.parent=root;p.position.set(sx,1.225,0);p.material=V29.shelter;p.checkCollisions=!mobileDevice}
 const roof=B.MeshBuilder.CreateBox('bus shelter roof',{width:3.35,height:.12,depth:1.35},scene);roof.parent=root;roof.position.set(0,2.42,0);roof.material=V29.shelter;
 const back=B.MeshBuilder.CreateBox('bus shelter glass',{width:3.15,height:2.05,depth:.055},scene);back.parent=root;back.position.set(0,1.22,-.58);back.material=V29.shelterGlass;
 const side=B.MeshBuilder.CreateBox('bus shelter side',{width:.055,height:2.05,depth:1.12},scene);side.parent=root;side.position.set(-1.56,1.22,0);side.material=V29.shelterGlass;
 const bench=B.MeshBuilder.CreateBox('bus shelter bench',{width:2.0,height:.12,depth:.38},scene);bench.parent=root;bench.position.set(.2,.62,-.26);bench.material=M.bench;
 const sign=B.MeshBuilder.CreateCylinder('bus stop pole',{height:2.7,diameter:.08,tessellation:10},scene);sign.parent=root;sign.position.set(1.9,1.35,.1);sign.material=V29.shelter;
 const plate=B.MeshBuilder.CreateBox('bus stop sign',{width:.44,height:.52,depth:.06},scene);plate.parent=root;plate.position.set(1.9,2.48,.1);plate.material=V29.accent;
 return root;
}
function v29StreetProps(){
 v29BusShelter(36,-30,Math.PI/2);v29BusShelter(-35,30,-Math.PI/2);
 const positions=[[-44,-24],[-30,-24],[30,-24],[44,-24],[-44,24],[-30,24],[30,24],[44,24]];
 for(const [x,z] of positions){const b=B.MeshBuilder.CreateCylinder('V29 bollard',{height:.72,diameter:.16,tessellation:12},scene);b.position.set(x,.36,z);b.material=V29.shelter;b.checkCollisions=!mobileDevice}
}

function v31SignMaterial(name,text,bg='#13222a',fg='#ffffff',w=768,h=180){
 const t=new B.DynamicTexture(name,{width:w,height:h},scene,true),g=t.getContext();g.fillStyle=bg;g.fillRect(0,0,w,h);g.strokeStyle='#ffffffaa';g.lineWidth=7;g.strokeRect(6,6,w-12,h-12);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.font='800 62px Arial';g.fillText(text,w/2,h/2+3);t.update();
 const m=new B.StandardMaterial(name+' mat',scene);m.diffuseTexture=t;m.emissiveTexture=t;m.disableLighting=true;m.backFaceCulling=false;return m
}
function v31PeaceMonument(){
 const root=new B.TransformNode('Fredsmonumentet V31',scene);root.position.set(0,0,0);
 const stone=mat('peace red granite','#7e4b49',.62,.08),bronze=mat('peace bronze','#4b5b4b',.42,.58);
 const base=B.MeshBuilder.CreateBox('peace base',{width:3.2,height:.55,depth:3.2},scene);base.parent=root;base.position.y=.275;base.material=stone;base.checkCollisions=true;
 const plinth=B.MeshBuilder.CreateBox('peace plinth',{width:2.2,height:2.1,depth:2.0},scene);plinth.parent=root;plinth.position.y=1.6;plinth.material=stone;plinth.checkCollisions=true;
 const torso=B.MeshBuilder.CreateCapsule('peace figure',{height:1.65,radius:.24,tessellation:16},scene);torso.parent=root;torso.position.y=3.35;torso.material=bronze;
 const head=B.MeshBuilder.CreateSphere('peace head',{diameter:.38,segments:14},scene);head.parent=root;head.position.y=4.26;head.material=bronze;
 for(const side of [-1,1]){
  const arm=B.MeshBuilder.CreateCapsule('peace arm',{height:1.02,radius:.075,tessellation:10},scene);arm.parent=root;arm.position.set(side*.42,3.88,0);arm.rotation.z=side*-1.02;arm.material=bronze;
  const hand=B.MeshBuilder.CreateSphere('peace hand',{diameter:.16,segments:10},scene);hand.parent=root;hand.position.set(side*.78,4.18,0);hand.material=bronze;
 }
 const sword=B.MeshBuilder.CreateBox('broken sword',{width:.08,height:.78,depth:.06},scene);sword.parent=root;sword.position.set(.78,4.5,0);sword.rotation.z=-.35;sword.material=bronze;
 const bird=B.MeshBuilder.CreateBox('peace dove',{width:.48,height:.08,depth:.22},scene);bird.parent=root;bird.position.set(-.83,4.5,0);bird.rotation.z=.18;bird.material=bronze;
 const label=B.MeshBuilder.CreatePlane('peace label',{width:4.5,height:.72,sideOrientation:B.Mesh.DOUBLESIDE},scene);label.parent=root;label.position.set(0,2.1,-1.03);label.material=v31SignMaterial('peace label mat','FREDSMONUMENTET','#5f3d3c','#f7eee7',900,180);
 for(const m of root.getChildMeshes()){m.receiveShadows=true;shadows.addShadowCaster(m)}
}
function v31Froding(){
 const root=new B.TransformNode('Gustaf Fröding V31',scene);root.position.set(-42,0,28);
 const bronze=mat('froding bronze','#465447',.48,.56),stone=mat('froding stone','#74746d',.72,.12);
 const base=B.MeshBuilder.CreateBox('froding base',{width:1.5,height:.6,depth:1.5},scene);base.parent=root;base.position.y=.3;base.material=stone;base.checkCollisions=true;
 const body=B.MeshBuilder.CreateCapsule('froding body',{height:1.55,radius:.22,tessellation:14},scene);body.parent=root;body.position.y=1.55;body.material=bronze;
 const head=B.MeshBuilder.CreateSphere('froding head',{diameter:.36,segments:12},scene);head.parent=root;head.position.y=2.42;head.material=bronze;
 const hat=B.MeshBuilder.CreateCylinder('froding hat',{height:.12,diameter:.52,tessellation:18},scene);hat.parent=root;hat.position.y=2.64;hat.material=bronze;
 const sign=B.MeshBuilder.CreatePlane('froding label',{width:3.2,height:.55,sideOrientation:B.Mesh.DOUBLESIDE},scene);sign.parent=root;sign.position.set(0,1.0,-.78);sign.material=v31SignMaterial('froding label mat','GUSTAF FRÖDING','#26342f','#f4efe5',768,160);
 for(const m of root.getChildMeshes()){m.receiveShadows=true;shadows.addShadowCaster(m)}
}
function v31KarlstadFlags(){
 function flagTex(name){const t=new B.DynamicTexture(name,{width:512,height:320},scene,true),g=t.getContext();g.fillStyle='#f7f7f4';g.fillRect(0,0,512,320);g.fillStyle='#f4bd32';g.beginPath();g.arc(256,160,54,0,Math.PI*2);g.fill();g.strokeStyle='#f4bd32';g.lineWidth=14;for(let i=0;i<12;i++){const a=i*Math.PI/6;g.beginPath();g.moveTo(256+Math.cos(a)*72,160+Math.sin(a)*72);g.lineTo(256+Math.cos(a)*108,160+Math.sin(a)*108);g.stroke()}t.update();const m=new B.StandardMaterial(name+' mat',scene);m.diffuseTexture=t;m.emissiveTexture=t;m.disableLighting=true;m.backFaceCulling=false;return m}
 const fm=flagTex('Karlstad sun flag');
 for(const x of [-9,9]){const pole=B.MeshBuilder.CreateCylinder('Karlstad flag pole',{height:8.8,diameter:.09,tessellation:12},scene);pole.position.set(x,4.4,-5);pole.material=M.metal;pole.checkCollisions=true;const flag=B.MeshBuilder.CreatePlane('Karlstad flag',{width:2.7,height:1.65,sideOrientation:B.Mesh.DOUBLESIDE},scene);flag.position.set(x+1.35,7.6,-5);flag.material=fm}
}
function v31WaterBoundaries(){
 const rail=mat('V31 river rail','#3f484b',.38,.68);let budget=70;
 for(const w of waterZones){if(w.kind!=='river'||budget<=0)continue;const pts=w.pts||[],off=(w.width||34)/2+1.0;
  for(let i=1;i<pts.length&&budget>0;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<4)continue;const ux=dx/len,uz=dz/len,nx=-uz,nz=ux;
   for(const side of [-1,1]){const mx=(a.x+b.x)/2+nx*off*side,mz=(a.z+b.z)/2+nz*off*side;if(Math.hypot(mx,mz)>260)continue;const top=B.MeshBuilder.CreateBox('V31 river railing',{width:len,height:.07,depth:.07},scene);top.position.set(mx,1.08,mz);top.rotation.y=Math.atan2(dx,dz);top.material=rail;top.checkCollisions=true;for(let d=0;d<=len;d+=3.4){const p=B.MeshBuilder.CreateBox('V31 river post',{width:.07,height:1.05,depth:.07},scene);p.position.set(a.x+ux*d+nx*off*side,.54,a.z+uz*d+nz*off*side);p.material=rail;p.checkCollisions=true;budget--}
    budget--
   }
  }
 }
}
function dressSquare(){function safe(x,z){return roadDistanceSq(x,z)>4}const lamps=[[-42,-29],[-21,-29],[0,-29],[21,-29],[42,-29],[-42,29],[-21,29],[0,29],[21,29],[42,29]];for(const [x,z] of lamps){if(!safe(x,z))continue;const p=lampPoleSource.createInstance('torget lamp'),h=lampHeadSource.createInstance('torget lamp head');p.position.set(x,2.25,z);h.position.set(x,4.55,z)}const benches=[[-28,-19,0],[0,-19,0],[28,-19,0],[-28,19,Math.PI],[0,19,Math.PI],[28,19,Math.PI]];for(const [x,z,r] of benches){if(!safe(x,z))continue;const s=benchSeatSource.createInstance('torget bench'),b=benchBackSource.createInstance('torget bench back');s.position.set(x,.58,z);b.position.set(x,.95,z-.27);s.rotation.y=b.rotation.y=r}const planters=[[-39,-18],[39,-18],[-39,18],[39,18]];for(const [x,z] of planters){if(!safe(x,z))continue;const p=planterSource.createInstance('torget planter'),g=planterGreenSource.createInstance('torget planter green');p.position.set(x,.275,z);g.position.set(x,1.05,z)}}

function arcgisUrl(root,layer,outFields='*'){
 const u=new URL(`${root}/${layer}/query`);u.search=new URLSearchParams({where:'1=1',geometry:`${BBOX.west},${BBOX.south},${BBOX.east},${BBOX.north}`,geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',outFields,returnGeometry:'true',outSR:'4326',f:'geojson'}).toString();return u.toString();
}
async function getJson(url,ms=18000){const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(url,{signal:ctrl.signal,mode:'cors'});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json()}finally{clearTimeout(timer)}}
async function loadMunicipal(){
 const urls={buildings:arcgisUrl(BASE,23,'FID,DETALJTYP,OBJEKTTYP,BALSTATUS'),roads:arcgisUrl(BASE,29,'FID,KLASS,RLID'),land:arcgisUrl(BASE,36,'FID,DETALJTYP,OBJEKTTYP'),trees:arcgisUrl(TREES,190,'OBJECTID,objid,tradslag,tradtyp,dbh,storlek')};
 const pairs=await Promise.allSettled(Object.entries(urls).map(async([k,u])=>[k,await getJson(u,6000)]));const data={};for(const p of pairs)if(p.status==='fulfilled')data[p.value[0]]=p.value[1];
 if(!data.buildings?.features?.length)throw Error('Kommunens byggnadslager kunde inte läsas');return data;
}
const OVERPASS_ENDPOINTS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter'];
async function overpass(query,ms=12000){
 let lastError;
 for(const endpoint of OVERPASS_ENDPOINTS){
  try{return await getJson(endpoint+'?data='+encodeURIComponent(query),ms)}
  catch(e){lastError=e;console.warn('Overpass endpoint failed:',endpoint,e.message)}
 }
 throw lastError||Error('Ingen Overpass-endpoint svarade');
}
function osmFeatureProps(e){return{...e.tags,FID:e.id,OBJECTID:e.id,OBJEKTTYP:e.tags?.building||'',BALSTATUS:'Gällande'}}
function parseBuildings(j){const out=[];for(const e of j.elements||[]){if(e.type!=='way'||!e.geometry?.length||!e.tags?.building)continue;const coords=e.geometry.map(p=>[p.lon,p.lat]);if(coords.length>2)out.push({type:'Feature',properties:osmFeatureProps(e),geometry:{type:'Polygon',coordinates:[coords]}})}return out}
function parseRoads(j){const out=[];for(const e of j.elements||[]){if(e.type!=='way'||!e.geometry?.length||!e.tags?.highway)continue;out.push({type:'Feature',properties:{...osmFeatureProps(e),KLASS:e.tags.highway},geometry:{type:'LineString',coordinates:e.geometry.map(p=>[p.lon,p.lat])}})}return out}
function parseEnvironment(j){const land=[];for(const e of j.elements||[]){if(e.type!=='way'||!e.geometry?.length)continue;const props={...osmFeatureProps(e),OBJEKTTYP:e.tags?.natural||e.tags?.waterway||e.tags?.leisure||e.tags?.landuse||''},coords=e.geometry.map(p=>[p.lon,p.lat]);if(e.tags?.waterway==='river')land.push({type:'Feature',properties:{...props,OBJEKTTYP:'river',width:e.tags.width},geometry:{type:'LineString',coordinates:coords}});else if(coords.length>2)land.push({type:'Feature',properties:props,geometry:{type:'Polygon',coordinates:[coords]}})}return land}
function parseTrees(j){const trees=[];for(const e of j.elements||[]){if(e.type!=='node')continue;trees.push({type:'Feature',properties:{OBJECTID:e.id,tradslag:e.tags?.species||e.tags?.genus||'',dbh:e.tags?.diameter_crown||40},geometry:{type:'Point',coordinates:[e.lon,e.lat]}})}return trees}
async function loadBundledOsm(){
 const [b,r,e,t]=await Promise.all([
  getJson('./data/osm-buildings.json',8000),
  getJson('./data/osm-roads.json',8000),
  getJson('./data/osm-environment.json',8000),
  getJson('./data/osm-trees.json',8000)
 ]);
 const buildings=parseBuildings(b),roads=parseRoads(r),land=parseEnvironment(e),trees=parseTrees(t);
 if(!buildings.length||!roads.length)throw Error('Bundlad OSM-snapshot saknar kärndata');
 sceneStats.source='OpenStreetMap snapshot';
 return{buildings:{features:buildings},roads:{features:roads},land:{features:land},trees:{features:trees}};
}
async function loadOsmFallback(){
 const cacheKey='karlstad-real-city-core-v9';
 try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached?.buildings?.features?.length&&cached?.roads?.features?.length){sceneStats.source='OpenStreetMap cache';return cached}}catch(e){}
 const qb=`[out:json][timeout:12];way[building](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});out tags geom;`;
 const qr=`[out:json][timeout:12];way[highway](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});out tags geom;`;
 let results,buildings=[],roads=[];
 for(let attempt=1;attempt<=3;attempt++){
  results=await Promise.allSettled([overpass(qb,12000),overpass(qr,12000)]);
  buildings=results[0].status==='fulfilled'?parseBuildings(results[0].value):[];
  roads=results[1].status==='fulfilled'?parseRoads(results[1].value):[];
  if(buildings.length&&roads.length)break;
  setProgress(14+attempt*3,'OSM svarade inte komplett – försöker igen ('+attempt+'/3)…');
  await new Promise(r=>setTimeout(r,700*attempt));
 }
 if(!buildings.length||!roads.length)throw Error('OSM kärndata kunde inte läsas efter 3 försök');
 const data={buildings:{features:buildings},roads:{features:roads},land:{features:[]},trees:{features:[]}};
 sceneStats.source='OpenStreetMap fallback';
 try{localStorage.setItem(cacheKey,JSON.stringify(data))}catch(e){console.warn('OSM cache skipped:',e.message)}
 return data;
}
async function loadOsmEnvironment(){
 const cacheKey='karlstad-real-city-environment-v11';try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(Array.isArray(cached)&&cached.length)return cached}catch(e){}
 const q=`[out:json][timeout:12];(way[waterway=river](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});way[natural=water](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});way[waterway=riverbank](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});way[leisure=park](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});way[landuse=grass](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}););out tags geom;`;
 const j=await overpass(q,12000),land=parseEnvironment(j);
 try{if(land.length)localStorage.setItem(cacheKey,JSON.stringify(land))}catch(e){}return land;
}
async function loadOsmTrees(){
 const cacheKey='karlstad-real-city-trees-v10';
 try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(Array.isArray(cached)&&cached.length)return cached}catch(e){}
 const q=`[out:json][timeout:10];node[natural=tree](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});out tags;`;
 const j=await overpass(q,10000),trees=parseTrees(j);
 try{if(trees.length)localStorage.setItem(cacheKey,JSON.stringify(trees))}catch(e){}
 return trees;
}
function estimateHeight(props,ring){const tagged=parseFloat(props.height);if(Number.isFinite(tagged))return clamp(tagged,3,35);const levels=parseFloat(props['building:levels']);if(Number.isFinite(levels))return clamp(levels*3.05+1,4,32);const t=String(props.OBJEKTTYP||props.building||'').toLowerCase(),a=area2D(ring),r=hash(props.FID||props.OBJECTID||a);let h=t.includes('samhäll')||t.includes('civic')?12:t.includes('industri')?8:t.includes('komplement')?4.2:t.includes('kyrk')||t.includes('samfund')?14:t.includes('verksam')?10:9;if(a>900)h+=3;if(a>2200)h+=2;return clamp(h+(r-.5)*5,4,22)}
function buildingMaterial(props){const t=String(props.OBJEKTTYP||props.building||'').toLowerCase();if(t.includes('samhäll')||t.includes('civic')||t.includes('samfund'))return buildingMats[5];if(t.includes('industri'))return buildingMats[3];if(t.includes('verksam'))return buildingMats[2];const i=Math.floor(hash(props.FID||props.OBJECTID)*5);return buildingMats[i]}
function polygonParts(feature){const g=feature.geometry;if(!g)return[];if(g.type==='Polygon')return[g.coordinates];if(g.type==='MultiPolygon')return g.coordinates;return[]}
function footprintDims(ring){const o=longestAxis(ring),w=o.hu*2,d=o.hv*2;return{w,d,min:Math.min(w,d),max:Math.max(w,d)}}
function featureDistanceSq(feature){const parts=polygonParts(feature),ring=parts[0]?.[0];if(!ring?.length)return Infinity;let x=0,z=0;for(const p of ring){const v=local(p);x+=v.x;z+=v.z}x/=ring.length;z/=ring.length;return x*x+z*z}
function pointInPoly(x,z,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=ring[i].x,zi=ring[i].z,xj=ring[j].x,zj=ring[j].z;const hit=((zi>z)!=(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi+1e-9)+xi);if(hit)inside=!inside}return inside}
function segDistSq(px,pz,a,b){const dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;if(!l2)return(px-a.x)**2+(pz-a.z)**2;let t=((px-a.x)*dx+(pz-a.z)*dz)/l2;t=clamp(t,0,1);const x=a.x+t*dx,z=a.z+t*dz;return(px-x)**2+(pz-z)**2}
function safeSpawnNearSquare(){let best=new B.Vector3(0,1.8,0),bestClear=-1;for(let x=-24;x<=24;x+=4)for(let z=-24;z<=24;z+=4){let blocked=false,minD=Infinity;for(const ring of buildingFootprints){if(pointInPoly(x,z,ring)){blocked=true;break}for(let i=0;i<ring.length;i++)minD=Math.min(minD,segDistSq(x,z,ring[i],ring[(i+1)%ring.length]))}if(!blocked&&minD>bestClear){bestClear=minD;best.set(x,1.8,z)}}return best}

function createBuilding(feature,index){let made=0;for(const poly of polygonParts(feature)){const outer=cleanRing(poly[0]);if(outer.length<3||area2D(outer)<7)continue;const holes=(poly.slice(1)||[]).map(cleanRing).filter(r=>r.length>2);const props=feature.properties||{},dims=footprintDims(outer),a=area2D(outer);if(a<16||dims.min<1.7||((dims.max/Math.max(.01,dims.min))>7&&a<180)){sceneStats.filtered++;continue}const h=estimateHeight(props,outer),hero=heroById.get(String(props.FID??props.OBJECTID??''));buildingFootprints.push(outer);try{if(hero?.key==='mitt-i-city'&&window.KarlstadLandmarks?.createMittICity){const lm=window.KarlstadLandmarks.createMittICity({B,scene,ring:outer,holes,earcut,shadows,props,spec:hero});if(lm?.collisionMesh){heroMeshes.push(lm.collisionMesh);sceneStats.landmarks++;made++;continue}}if(hero?.key==='sandgrund'&&window.KarlstadLandmarks?.createSandgrund){const lm=window.KarlstadLandmarks.createSandgrund({B,scene,ring:outer,holes,earcut,shadows,props,spec:hero});if(lm?.collisionMesh){heroMeshes.push(lm.collisionMesh);sceneStats.landmarks++;made++;continue}}if(hero?.key==='domkyrka'&&window.KarlstadLandmarks?.createDomkyrka){const lm=window.KarlstadLandmarks.createDomkyrka({B,scene,ring:outer,holes,earcut,shadows,props,spec:hero});if(lm?.collisionMesh){heroMeshes.push(lm.collisionMesh);sceneStats.landmarks++;made++;continue}}if(hero?.key==='radhuset'&&window.KarlstadLandmarks?.createRadhus){const lm=window.KarlstadLandmarks.createRadhus({B,scene,ring:outer,holes,earcut,shadows,props,spec:hero});if(lm?.collisionMesh){heroMeshes.push(lm.collisionMesh);sceneStats.landmarks++;made++;continue}}const mesh=B.MeshBuilder.ExtrudePolygon(`building ${props.FID||index}`,{shape:outer,holes,depth:h,sideOrientation:B.Mesh.DOUBLESIDE},scene,earcut);mesh.position.y=h;mesh.material=hero?heroMaterial(hero):buildingMaterial(props);mesh.checkCollisions=true;mesh.receiveShadows=true;mesh.isPickable=false;mesh.metadata={source:sceneStats.source,height:h,properties:props,hero:hero||null};if(hero){heroMeshes.push(mesh);shadows.addShadowCaster(mesh);addHeroDetails(outer,h,hero,index)}else{if(!buildingGroups.has(mesh.material))buildingGroups.set(mesh.material,[]);buildingGroups.get(mesh.material).push(mesh);addFacadeDetails(outer,h,props,index)}addRoof(outer,holes,h,props,index);made++}catch(e){console.warn('building skipped',e)}}return made}
function lineParts(g){if(!g)return[];if(g.type==='LineString')return[g.coordinates];if(g.type==='MultiLineString')return g.coordinates;return[]}
function roadWidth(props){const c=String(props.KLASS||props.highway||'').toLowerCase();if(['0','1','2','primary','secondary','trunk'].includes(c))return 7;if(['3','4','5','tertiary','residential'].includes(c))return 5;return 3.2}
function createRoad(feature,index){let made=0;for(const coords of lineParts(feature.geometry)){const pts=coords.map(local);if(pts.length<2)continue;const roadHalf=roadWidth(feature.properties||{})/2,sideInner=roadHalf+.12,sideOuter=roadHalf+2.05,lift=(index%11)*.00055;function offsetPath(off,y){const out=[];for(let i=0;i<pts.length;i++){const p=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;out.push(new B.Vector3(p.x+nx*off,y,p.z+nz*off))}return out}try{const leftOuter=offsetPath(sideOuter,.052+lift),leftInner=offsetPath(sideInner,.052+lift),rightInner=offsetPath(-sideInner,.052+lift),rightOuter=offsetPath(-sideOuter,.052+lift),roadLeft=offsetPath(roadHalf,.032+lift),roadRight=offsetPath(-roadHalf,.032+lift);const sl=B.MeshBuilder.CreateRibbon(`sidewalk L ${index}`,{pathArray:[leftOuter,leftInner],sideOrientation:B.Mesh.DOUBLESIDE},scene),sr=B.MeshBuilder.CreateRibbon(`sidewalk R ${index}`,{pathArray:[rightInner,rightOuter],sideOrientation:B.Mesh.DOUBLESIDE},scene),rm=B.MeshBuilder.CreateRibbon(`road ${index}`,{pathArray:[roadLeft,roadRight],sideOrientation:B.Mesh.DOUBLESIDE},scene);for(const s of [sl,sr]){s.material=M.sidewalk;s.receiveShadows=true;s.isPickable=false;sidewalkMeshes.push(s)}rm.material=M.asphalt;rm.receiveShadows=true;rm.isPickable=false;roadMeshes.push(rm);roadCorridors.push({pts,half:sideOuter+.6,name:feature.properties?.name||'',properties:feature.properties||{}});if(feature.properties?.name)namedRoads.push({name:feature.properties.name,pts,half:sideOuter+.6,properties:feature.properties||{}});made++}catch(e){console.warn('road skipped',e)}}return made}
function createLand(feature,index){const type=String(feature.properties?.OBJEKTTYP||feature.properties?.DETALJTYP||'').toLowerCase();if(feature.geometry?.type==='LineString'&&type.includes('river')){const pts=feature.geometry.coordinates.map(local);if(pts.length<2)return 0;const width=clamp(parseFloat(feature.properties?.width)||68,22,85),left=[],right=[];for(let i=0;i<pts.length;i++){const p=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;left.push(new B.Vector3(p.x+nx*width/2,.018,p.z+nz*width/2));right.push(new B.Vector3(p.x-nx*width/2,.018,p.z-nz*width/2))}try{const m=B.MeshBuilder.CreateRibbon(`river ${index}`,{pathArray:[left,right],sideOrientation:B.Mesh.DOUBLESIDE},scene);m.material=M.water;m.isPickable=false;waterZones.push({kind:'river',pts,width});return 1}catch(e){return 0}}if(!(type.includes('vatten')||type.includes('water')||type.includes('riverbank')||type.includes('sjö')||type.includes('vattendrag')||type.includes('torg')||type.includes('park')||type.includes('grass')))return 0;let made=0;for(const poly of polygonParts(feature)){const outer=cleanRing(poly[0]);if(outer.length<3)continue;const holes=(poly.slice(1)||[]).map(cleanRing).filter(r=>r.length>2);try{const m=B.MeshBuilder.CreatePolygon(`land ${index}`,{shape:outer,holes,sideOrientation:B.Mesh.DOUBLESIDE},scene,earcut),isSquare=type.includes('torg'),isGreen=type.includes('park')||type.includes('grass');m.position.y=isSquare?.03:.014;m.material=isSquare?M.paving:isGreen?M.park:M.water;m.receiveShadows=isSquare||isGreen;m.isPickable=false;if(!isSquare&&!isGreen)waterZones.push({kind:'polygon',ring:outer});made++}catch(e){}}return made}
const trunkSource=B.MeshBuilder.CreateCylinder('tree trunk source',{height:3,diameterTop:.26,diameterBottom:.38,tessellation:7},scene);trunkSource.material=M.trunk;trunkSource.position.y=-100;
const crownSource=B.MeshBuilder.CreateIcoSphere('tree crown source',{radius:1.55,subdivisions:1},scene);crownSource.material=M.tree;crownSource.position.y=-100;const crownSource2=B.MeshBuilder.CreateIcoSphere('tree crown source 2',{radius:1.18,subdivisions:1},scene);crownSource2.material=M.tree;crownSource2.position.y=-100;
function createTree(feature,index){if(feature.geometry?.type!=='Point')return 0;const p=local(feature.geometry.coordinates),dbh=Number(feature.properties?.dbh)||40,scale=clamp(.72+dbh/115,.72,1.55),r=hash(feature.properties?.OBJECTID||index);const t=trunkSource.createInstance('trunk '+index);t.position.set(p.x,1.55*scale,p.z);t.scaling.set(scale*.9,scale,scale*.9);const c=crownSource.createInstance('crown '+index);c.position.set(p.x,4.05*scale,p.z);c.scaling.set(scale*(.95+r*.18),scale*(.82+r*.12),scale*(.95+r*.18));const c2=crownSource2.createInstance('crown top '+index);c2.position.set(p.x+(.35-r*.7)*scale,5.05*scale,p.z+(r-.5)*.55*scale);c2.scaling.set(scale*.9,scale*.8,scale*.9);return 1}
function label(text,lon,lat,color='#ffcb70'){const p=local([lon,lat]),root=new B.TransformNode(text,scene);root.position.set(p.x,0,p.z);const ring=B.MeshBuilder.CreateTorus(text+' ring',{diameter:2.6,thickness:.05,tessellation:40},scene);ring.parent=root;ring.position.y=.08;const em=new B.StandardMaterial(text+' glow',scene);em.emissiveColor=B.Color3.FromHexString(color);em.disableLighting=true;ring.material=em;const tex=new B.DynamicTexture(text+' tex',{width:512,height:96},scene,true),ctx=tex.getContext();ctx.clearRect(0,0,512,96);ctx.fillStyle='#071218dd';ctx.fillRect(0,0,512,96);ctx.fillStyle='#f5f0df';ctx.font='700 28px system-ui';ctx.textAlign='center';ctx.fillText(text,256,60);tex.update();const lm=new B.StandardMaterial(text+' mat',scene);lm.diffuseTexture=tex;lm.opacityTexture=tex;lm.emissiveColor=new B.Color3(.55,.55,.55);lm.backFaceCulling=false;const pl=B.MeshBuilder.CreatePlane(text+' label',{width:7.2,height:1.35},scene);pl.parent=root;pl.position.y=4.4;pl.material=lm;pl.billboardMode=B.Mesh.BILLBOARDMODE_ALL;return root}
label('STORA TORGET',13.50295,59.380767);label('RÅDHUSET',13.5014353,59.3807845,'#f1c968');label('KARLSTADS DOMKYRKA',13.5064970,59.3815484,'#f3df9a');label('SANDGRUND',13.502961,59.384639,'#9de0c9');label('VÄRMLANDS MUSEUM',13.50124,59.38492,'#9de0c9');
const localPilot=location.hostname==='localhost'||location.hostname==='127.0.0.1';
let data;
setProgress(12,'Laddar lokal Karlstad-karta…');
try{
 data=await loadBundledOsm();
}catch(snapshotError){
 console.warn('Bundled OSM snapshot failed',snapshotError);
 setProgress(16,'Lokal karta saknas – hämtar OpenStreetMap live…');
 try{
  data=await loadOsmFallback();
  if(sceneStats.source==='OpenStreetMap fallback')sceneStats.source='OpenStreetMap live';
 }catch(osmError){
  console.warn('OSM live failed',osmError);
  setProgress(20,'OSM live svarade inte. Försöker Karlstads kommun…');
  try{
   data=await loadMunicipal();
   sceneStats.source='Karlstads kommun fallback';
  }catch(municipalError){
   console.error(municipalError);
   showError('Kartdata kunde inte läsas just nu. Försök ladda om sidan.');
   data={buildings:{features:[]},roads:{features:[]},land:{features:[]},trees:{features:[]}};
  }
 }
}
setProgress(38,'Bygger verkliga byggnadsytor…');await new Promise(r=>requestAnimationFrame(r));
const orderedBuildings=[...(data.buildings?.features||[])].sort((a,b)=>featureDistanceSq(a)-featureDistanceSq(b));heroById=resolveHeroBuildings(orderedBuildings);sceneStats.hero=heroById.size;scene.metadata={...(scene.metadata||{}),heroTargets:[...heroById.values()].map(h=>({key:h.key,label:h.label,id:h.id,style:h.style}))};console.info('Hero building targets',scene.metadata.heroTargets);for(const [i,f] of orderedBuildings.entries()){if(String(f.properties?.BALSTATUS||'Gällande').toLowerCase().includes('planerad'))continue;sceneStats.buildings+=createBuilding(f,i);if(i%60===0)await new Promise(r=>requestAnimationFrame(r))}
setProgress(58,'Optimerar byggnader…');for(const [material,meshes] of buildingGroups){if(!meshes.length)continue;const merged=B.Mesh.MergeMeshes(meshes,true,true,undefined,false,false);if(merged){merged.name='real buildings / '+material.name;merged.material=material;merged.checkCollisions=true;merged.receiveShadows=true;merged.isPickable=false;merged.freezeWorldMatrix();if(!mobileDevice)shadows.addShadowCaster(merged)}await new Promise(r=>requestAnimationFrame(r))}for(const m of heroMeshes){m.freezeWorldMatrix();m.receiveShadows=true}setProgress(62,'Förbereder tak…');for(const r of roofMeshes){r.receiveShadows=true;r.freezeWorldMatrix?.()}await new Promise(r=>requestAnimationFrame(r));
setProgress(66,'Lägger ut gator, trottoarer och Klarälven…');for(const [i,f] of (data.roads?.features||[]).entries())sceneStats.roads+=createRoad(f,i);dressSquare();v29RoadMarkings();v29StreetProps();v31PeaceMonument();v31Froding();v31KarlstadFlags();if(sidewalkMeshes.length>1){const sw=B.Mesh.MergeMeshes(sidewalkMeshes,true,true,undefined,false,false);if(sw){sw.name='real sidewalks';sw.material=M.sidewalk;sw.receiveShadows=true;sw.freezeWorldMatrix()}}if(roadMeshes.length>1){const mergedRoad=B.Mesh.MergeMeshes(roadMeshes,true,true,undefined,false,false);if(mergedRoad){mergedRoad.name='real roads';mergedRoad.material=M.asphalt;mergedRoad.receiveShadows=true;mergedRoad.freezeWorldMatrix()}}for(const [i,f] of (data.land?.features||[]).entries())sceneStats.land+=createLand(f,i);v31WaterBoundaries();
setProgress(78,'Planterar tillgängliga träd…');for(const [i,f] of (data.trees?.features||[]).slice(0,mobileDevice?170:450).entries())sceneStats.trees+=createTree(f,i);
setProgress(91,'Optimerar scenen för mobilen…');scene.blockMaterialDirtyMechanism=true;for(const material of scene.materials)material.freeze?.();console.info('Visual cleanup filtered footprints:',sceneStats.filtered);
window.KarlstadRealCityAPI={scene,camera,engine,ORIGIN,BBOX,local,sceneStats,buildingFootprints,roadCorridors,namedRoads,waterZones,heroMeshes,getData:()=>data};
setProgress(100,'Karlstad klart');status.textContent=engine.__backend+' · '+(sceneStats.source.includes('OpenStreetMap')?'OSM · ':'')+sceneStats.buildings+' HUS · '+sceneStats.roads+' VÄGAR · '+sceneStats.trees+' TRÄD · '+sceneStats.hero+' HERO · '+sceneStats.landmarks+' LANDMARK';
setTimeout(()=>loading.classList.add('hidden'),350);
if(sceneStats.land===0){
 loadOsmEnvironment().then(features=>{for(const [i,f] of features.entries())sceneStats.land+=createLand(f,i)}).catch(e=>console.warn('OSM environment layer deferred:',e));
}
if(sceneStats.trees===0){
 loadOsmTrees().then(features=>{for(const [i,f] of features.slice(0,mobileDevice?170:450).entries())sceneStats.trees+=createTree(f,i);status.textContent=engine.__backend+' · '+(sceneStats.source.includes('OpenStreetMap')?'OSM · ':'')+sceneStats.buildings+' HUS · '+sceneStats.roads+' VÄGAR · '+sceneStats.trees+' TRÄD · '+sceneStats.hero+' HERO · '+sceneStats.landmarks+' LANDMARK';}).catch(e=>console.warn('Tree layer deferred:',e));
}
const spawn=safeSpawnNearSquare();camera.position.copyFrom(spawn);camera.setTarget(new B.Vector3(spawn.x,1.8,spawn.z-35));$('reset').addEventListener('click',()=>{camera.position.copyFrom(spawn);camera.rotation.set(0,Math.PI,0);camera.setTarget(new B.Vector3(spawn.x,1.8,spawn.z-35))});$('collision').textContent='COLL ON';$('collision').addEventListener('click',()=>{camera.checkCollisions=!camera.checkCollisions;camera.applyGravity=camera.checkCollisions;$('collision').textContent=camera.checkCollisions?'COLL ON':'COLL OFF';});const sandgrundPos=local([13.502961,59.384639]);$('sandgrund')?.addEventListener('click',()=>{camera.position.set(sandgrundPos.x,1.8,sandgrundPos.z+28);camera.rotation.set(0,0,0);camera.setTarget(new B.Vector3(sandgrundPos.x,2.3,sandgrundPos.z));});
let joy={active:false,id:null,x:0,y:0,mag:0,vx:0,vz:0},joyEl=$('joy'),knob=$('knob');
function joyPos(x,y){
 const r=joyEl.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=x-cx,dy=y-cy,max=Math.max(36,r.width*.31),raw=Math.hypot(dx,dy);
 if(raw>max){dx*=max/raw;dy*=max/raw}const mag=Math.min(1,Math.hypot(dx,dy)/max),dead=.13,scaled=mag<=dead?0:(mag-dead)/(1-dead);
 if(mag>0){joy.x=(dx/max)*(scaled/(mag||1));joy.y=(dy/max)*(scaled/(mag||1))}else joy.x=joy.y=0;
 joy.mag=scaled;window.KarlstadJoyMagnitude=scaled;knob.style.left=(r.width/2-knob.offsetWidth/2+dx)+'px';knob.style.top=(r.height/2-knob.offsetHeight/2+dy)+'px'
}
joyEl.addEventListener('pointerdown',e=>{window.KarlstadGameAPI?.stopAuto?.('MANUELL KONTROLL');joy.active=true;joy.id=e.pointerId;joyEl.setPointerCapture(e.pointerId);joyPos(e.clientX,e.clientY)});
joyEl.addEventListener('pointermove',e=>{if(joy.active&&e.pointerId===joy.id)joyPos(e.clientX,e.clientY)});
function joyEnd(e){if(e.pointerId===joy.id){joy.active=false;joy.x=joy.y=joy.mag=0;window.KarlstadJoyMagnitude=0;knob.style.left=knob.style.top=''}}
joyEl.addEventListener('pointerup',joyEnd);joyEl.addEventListener('pointercancel',joyEnd);
let look={active:false,id:null,x:0,y:0},lookEl=$('look');lookEl.addEventListener('pointerdown',e=>{look.active=true;look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;lookEl.setPointerCapture(e.pointerId)});lookEl.addEventListener('pointermove',e=>{if(!look.active||e.pointerId!==look.id)return;const dx=e.clientX-look.x,dy=e.clientY-look.y;look.x=e.clientX;look.y=e.clientY;camera.rotation.y+=dx*.0037;camera.rotation.x=clamp(camera.rotation.x+dy*.0028,-1.35,1.35)});lookEl.addEventListener('pointerup',e=>{if(e.pointerId===look.id)look.active=false});lookEl.addEventListener('pointercancel',e=>{if(e.pointerId===look.id)look.active=false});
scene.onBeforeRenderObservable.add(()=>{
 const dt=Math.min(2,engine.getDeltaTime()/16.67),manual=joy.active&&joy.mag>.01;
 const sprint=manual&&joy.mag>.86,forward=-joy.y,right=joy.x,y=camera.rotation.y,speed=sprint?.145:.092;
 const tx=manual?(Math.sin(y)*forward+Math.cos(y)*right)*speed:0,tz=manual?(Math.cos(y)*forward-Math.sin(y)*right)*speed:0;
 const blend=1-Math.pow(.72,dt);joy.vx+=(tx-joy.vx)*blend;joy.vz+=(tz-joy.vz)*blend;
 if(Math.abs(joy.vx)+Math.abs(joy.vz)>.0005)camera.cameraDirection.addInPlace(new B.Vector3(joy.vx*dt,0,joy.vz*dt));
 window.KarlstadTouchSprint=sprint;
});
engine.runRenderLoop(()=>scene.render());addEventListener('resize',()=>engine.resize());
})();
