(function(){
'use strict';
const wait=()=>new Promise(r=>setTimeout(r,70));
async function ready(){
 for(let i=0;i<260;i++){if(window.KarlstadRealCityAPI?.scene&&window.KarlstadRealCityAPI?.namedRoads?.length)return window.KarlstadRealCityAPI;await wait()}
 return null
}
function mat(B,scene,name,hex,rough=.7,metal=.05,emissive=null){
 const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.FromHexString(hex);m.roughness=rough;m.metallic=metal;if(emissive)m.emissiveColor=B.Color3.FromHexString(emissive);return m
}
function signMat(B,scene,name,lines,bg='#13242b',fg='#fff'){
 const t=new B.DynamicTexture(name,{width:1024,height:420},scene,true),g=t.getContext();g.fillStyle=bg;g.fillRect(0,0,1024,420);g.strokeStyle='#ffffff99';g.lineWidth=14;g.strokeRect(9,9,1006,402);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
 const arr=Array.isArray(lines)?lines:[lines];g.font='800 92px Arial';arr.forEach((x,i)=>g.fillText(x,512,140+i*130));t.update();
 const m=new B.StandardMaterial(name+' mat',scene);m.diffuseTexture=t;m.emissiveTexture=t;m.disableLighting=true;m.backFaceCulling=false;return m
}
function streetDirectionSign(B,scene,pos,rot,title,sub,arrow='→'){
 const root=new B.TransformNode('V32 wayfinding '+title,scene);root.position.copyFrom(pos);root.rotation.y=rot;
 const pole=B.MeshBuilder.CreateCylinder('V32 sign pole',{height:3.0,diameter:.09,tessellation:12},scene);pole.parent=root;pole.position.y=1.5;
 const pm=mat(B,scene,'V32 sign metal '+title,'#343d40',.38,.66);pole.material=pm;pole.checkCollisions=true;
 const plate=B.MeshBuilder.CreatePlane('V32 sign '+title,{width:3.5,height:1.2,sideOrientation:B.Mesh.DOUBLESIDE},scene);plate.parent=root;plate.position.set(0,2.55,0);plate.material=signMat(B,scene,'V32 '+title+' tex',[title+' '+arrow,sub],'#173943','#f4f2e8');
 return root
}
function tableSet(B,scene,x,z,wood,dark,cream){
 const root=new B.TransformNode('V32 cafe set',scene);root.position.set(x,0,z);
 const top=B.MeshBuilder.CreateCylinder('V32 table',{height:.08,diameter:1.0,tessellation:18},scene);top.parent=root;top.position.y=.75;top.material=wood;
 const leg=B.MeshBuilder.CreateCylinder('V32 table leg',{height:.7,diameter:.08,tessellation:10},scene);leg.parent=root;leg.position.y=.36;leg.material=dark;
 for(let i=0;i<2;i++){const a=i*Math.PI,chair=B.MeshBuilder.CreateBox('V32 chair',{width:.38,height:.08,depth:.42},scene);chair.parent=root;chair.position.set(Math.cos(a)*.8,.46,Math.sin(a)*.8);chair.material=wood}
 const mast=B.MeshBuilder.CreateCylinder('V32 parasol mast',{height:2.4,diameter:.05,tessellation:10},scene);mast.parent=root;mast.position.y=1.2;mast.material=dark;
 const shade=B.MeshBuilder.CreateCylinder('V32 parasol',{height:.16,diameterTop:.28,diameterBottom:2.4,tessellation:18},scene);shade.parent=root;shade.position.y=2.35;shade.material=cream;
}
function bikeRack(B,scene,x,z,rot,metal){
 const root=new B.TransformNode('V32 bike rack',scene);root.position.set(x,0,z);root.rotation.y=rot;
 for(let i=0;i<5;i++){const tor=B.MeshBuilder.CreateTorus('V32 rack hoop',{diameter:.85,thickness:.055,tessellation:16},scene);tor.parent=root;tor.position.set((i-2)*.56,.46,0);tor.rotation.x=Math.PI/2;tor.material=metal;tor.checkCollisions=true}
}
function shopPylon(B,scene,x,z,rot,text,accent){
 const root=new B.TransformNode('V32 pylon '+text,scene);root.position.set(x,0,z);root.rotation.y=rot;
 const body=B.MeshBuilder.CreateBox('V32 shop pylon',{width:1.15,height:2.7,depth:.28},scene);body.parent=root;body.position.y=1.35;body.material=accent;body.checkCollisions=true;
 const p=B.MeshBuilder.CreatePlane('V32 shop pylon sign',{width:1.02,height:1.85,sideOrientation:B.Mesh.DOUBLESIDE},scene);p.parent=root;p.position.set(0,1.55,.15);p.material=signMat(B,scene,'V32 pylon '+text,[text],'#5f9b40','#fff');return root
}
function addRouteStuds(B,scene,api){
 const glow=mat(B,scene,'V32 hero route studs','#e2c164',.45,.24,'#594c1d'),names=/Drottninggatan|Västra Torggatan|Järnvägsgatan|Tingvallagatan/;
 let budget=150;
 for(const r of api.namedRoads.filter(r=>names.test(r.name||''))){
  const pts=r.pts||[];for(let i=1;i<pts.length&&budget>0;i++){
   const a=pts[i-1],b=pts[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<2)continue;
   const ux=dx/len,uz=dz/len;for(let d=2;d<len&&budget>0;d+=5.5){
    const x=a.x+ux*d,z=a.z+uz*d;if(Math.hypot(x,z)>235)continue;
    const stud=B.MeshBuilder.CreateCylinder('V32 hero stud',{height:.035,diameter:.24,tessellation:12},scene);stud.position.set(x,.092,z);stud.material=glow;stud.isPickable=false;budget--
   }
  }
 }
}
function addTorgetLife(B,scene,api){
 const wood=mat(B,scene,'V32 cafe wood','#815b3d',.7,.04),dark=mat(B,scene,'V32 cafe metal','#343d40',.36,.7),cream=mat(B,scene,'V32 parasol cream','#e9dfbf',.76,.02),metal=dark,accent=mat(B,scene,'V32 shop accent','#5f9b40',.42,.18);
 tableSet(B,scene,-18,16,wood,dark,cream);tableSet(B,scene,-13,17,wood,dark,cream);tableSet(B,scene,17,-13,wood,dark,cream);
 bikeRack(B,scene,24,18,.2,metal);bikeRack(B,scene,-25,-17,-.25,metal);
 shopPylon(B,scene,-6,22,.1,'MITT I CITY',accent);
}
function createHeroLoop(api){
 const B=BABYLON,scene=api.scene,local=api.local;
 addRouteStuds(B,scene,api);addTorgetLife(B,scene,api);
 const torget=local([13.50295,59.380767]),mall=local([13.50055,59.37988]),radhus=local([13.5014353,59.3807845]),church=local([13.5064970,59.3815484]);
 streetDirectionSign(B,scene,torget.add(new B.Vector3(-18,0,18)),.2,'MITT I CITY','VÄSTRA TORGGATAN','↙');
 streetDirectionSign(B,scene,torget.add(new B.Vector3(19,0,-14)),Math.PI,'DOMKYRKAN','KUNGSGATAN','→');
 streetDirectionSign(B,scene,mall.add(new B.Vector3(12,0,13)),Math.PI*.55,'STORA TORGET','2 MIN','↗');
 streetDirectionSign(B,scene,radhus.add(new B.Vector3(8,0,7)),-.3,'RÅDHUSET','STORA TORGET','←');
 streetDirectionSign(B,scene,church.add(new B.Vector3(-12,0,12)),Math.PI*.7,'DOMKYRKAN','KARLSTAD','↑');
 const infoMat=signMat(B,scene,'V32 hero loop map',['KARLSTAD CITY','TORGET • MITT I CITY'],'#13242b','#f4d878');
 const board=B.MeshBuilder.CreatePlane('V32 city map board',{width:4.4,height:1.8,sideOrientation:B.Mesh.DOUBLESIDE},scene);board.position=torget.add(new B.Vector3(7,2.2,10));board.rotation.y=-.4;board.material=infoMat;
 window.KarlstadV32={heroLoop:true,landmarks:{torget,mall,radhus,church}}
}
ready().then(api=>{if(api)createHeroLoop(api)}).catch(e=>console.warn('V32 hero loop',e));
})();