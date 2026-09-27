(function(){
'use strict';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){
 for(let i=0;i<260;i++){if(window.KarlstadRealCityAPI?.scene&&window.KarlstadRealCityAPI?.roadCorridors?.length)return window.KarlstadRealCityAPI;await sleep(70)}
 return null
}
function pbr(B,scene,name,hex,rough=.65,metal=.08,emissive=null){
 const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.FromHexString(hex);m.roughness=rough;m.metallic=metal;if(emissive)m.emissiveColor=B.Color3.FromHexString(emissive);return m
}
function signMat(B,scene,name,text,bg='#10181c',fg='#fff',accent='#e2b844'){
 const t=new B.DynamicTexture(name,{width:1024,height:256},scene,true),g=t.getContext();
 g.fillStyle=bg;g.fillRect(0,0,1024,256);g.fillStyle=accent;g.fillRect(0,0,1024,18);
 g.fillStyle=fg;g.font='900 92px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(text,512,142);t.update();
 const m=new B.StandardMaterial(name+' mat',scene);m.diffuseTexture=t;m.emissiveTexture=t;m.disableLighting=true;m.backFaceCulling=false;return m
}
function offsetPath(B,pts,off,y){
 const out=[];for(let i=0;i<pts.length;i++){const p=pts[i],a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;out.push(new B.Vector3(p.x+nx*off,y,p.z+nz*off))}return out
}
function curbRibbon(B,scene,pts,off,mat,name){
 const p1=offsetPath(B,pts,off-.11,.082),p2=offsetPath(B,pts,off+.11,.082);
 const mesh=B.MeshBuilder.CreateRibbon(name,{pathArray:[p1,p2],sideOrientation:B.Mesh.DOUBLESIDE},scene);mesh.material=mat;mesh.isPickable=false;mesh.receiveShadows=true;return mesh
}
function addReadableStreets(api){
 const B=BABYLON,scene=api.scene,curb=pbr(B,scene,'V33 clean curb','#e2ddd0',.72,.02),hero=/Västra Torggatan|Drottninggatan|Järnvägsgatan|Tingvallagatan|Kungsgatan/;
 let count=0;
 for(const r of api.roadCorridors){
  if(!hero.test(r.name||'')||!r.pts?.length||count>28)continue;
  const off=Math.max(2.0,(r.half||4.2)-.7);curbRibbon(B,scene,r.pts,off,curb,'V33 curb '+r.name+' L');curbRibbon(B,scene,r.pts,-off,curb,'V33 curb '+r.name+' R');count++
 }
}
function pavementArrow(B,scene,pos,rot,label){
 const root=new B.TransformNode('V33 pavement arrow '+label,scene);root.position.copyFrom(pos);root.rotation.y=rot;
 const mat=pbr(B,scene,'V33 pavement gold '+label,'#d7b44b',.54,.1,'#4b3a0c');
 const shaft=B.MeshBuilder.CreateBox('V33 arrow shaft',{width:.46,height:.035,depth:2.6},scene);shaft.parent=root;shaft.position.z=-.4;shaft.material=mat;
 const head=B.MeshBuilder.CreateCylinder('V33 arrow head',{height:.04,diameterTop:0,diameterBottom:1.4,tessellation:3},scene);head.parent=root;head.position.z=-2;head.rotation.y=Math.PI;head.material=mat;
 const tag=B.MeshBuilder.CreatePlane('V33 pavement tag',{width:3.5,height:.7,sideOrientation:B.Mesh.DOUBLESIDE},scene);tag.parent=root;tag.position.set(0,.04,1.25);tag.rotation.x=Math.PI/2;tag.material=signMat(B,scene,'V33 pavement '+label,label,'#5b4925','#fff7df','#d7b44b');
}
function portal(B,scene,pos,rot,label,color='#79c85e'){
 const root=new B.TransformNode('V33 portal '+label,scene);root.position.copyFrom(pos);root.rotation.y=rot;
 const frame=pbr(B,scene,'V33 portal frame '+label,color,.42,.18,color),dark=pbr(B,scene,'V33 portal dark '+label,'#1d2528',.56,.35);
 for(const x of [-1.85,1.85]){const p=B.MeshBuilder.CreateBox('V33 portal post',{width:.16,height:3.7,depth:.16},scene);p.parent=root;p.position.set(x,1.85,0);p.material=frame;p.checkCollisions=false}
 const lintel=B.MeshBuilder.CreateBox('V33 portal top',{width:3.86,height:.16,depth:.22},scene);lintel.parent=root;lintel.position.y=3.62;lintel.material=frame;
 const sign=B.MeshBuilder.CreatePlane('V33 portal sign',{width:3.45,height:.72,sideOrientation:B.Mesh.DOUBLESIDE},scene);sign.parent=root;sign.position.set(0,3.18,.12);sign.material=signMat(B,scene,'V33 portal sign '+label,label,dark.albedoColor.toHexString(),'#fff',color);
 return root
}
function billboard(B,scene,pos,rot,text,bg,fg){
 const root=new B.TransformNode('V33 billboard '+text,scene);root.position.copyFrom(pos);root.rotation.y=rot;
 const back=B.MeshBuilder.CreateBox('V33 billboard back',{width:5.2,height:2.25,depth:.14},scene);back.parent=root;back.position.y=1.15;back.material=pbr(B,scene,'V33 billboard back '+text,'#262d30',.48,.54);
 const face=B.MeshBuilder.CreatePlane('V33 billboard face',{width:4.9,height:1.9,sideOrientation:B.Mesh.DOUBLESIDE},scene);face.parent=root;face.position.set(0,1.2,.08);face.material=signMat(B,scene,'V33 billboard face '+text,text,bg,fg,'#d9b84f');
}
function addHeroReadability(api){
 const B=BABYLON,scene=api.scene,local=api.local;
 const torget=local([13.50295,59.380767]),mitti=local([13.50055,59.37988]);
 pavementArrow(B,scene,torget.add(new B.Vector3(-11,0.09,12)),.15,'MITT I CITY');
 pavementArrow(B,scene,mitti.add(new B.Vector3(7,0.09,11)),Math.PI+.2,'STORA TORGET');
 portal(B,scene,mitti.add(new B.Vector3(0,0,12)),Math.PI,'ENTRÉ · MITT I CITY','#79c85e');
 billboard(B,scene,torget.add(new B.Vector3(29,0,20)),-.55,'KARLSTAD','#1b3c50','#f5efd9');
 billboard(B,scene,torget.add(new B.Vector3(-30,0,-19)),2.55,'CENTRUM','#733f3d','#fff0dc');
}
function tuneExisting(scene){
 for(const m of scene.meshes){
  if(!m||!m.name)continue;
  if(/LANDMARK|Mitt i City|Domkyrka|Rådhuset|Sandgrund/i.test(m.name)&&m.enableEdgesRendering){
   try{m.enableEdgesRendering(.999);m.edgesWidth=.7;m.edgesColor=new BABYLON.Color4(.04,.05,.055,.18)}catch(e){}
  }
 }
}
ready().then(api=>{if(!api)return;addReadableStreets(api);addHeroReadability(api);tuneExisting(api.scene);window.KarlstadV33={sharpCity:true,automap:'overlay',readabilityPass:true}}).catch(e=>console.warn('V33 readability',e));
})();