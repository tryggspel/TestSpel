(function(){
'use strict';
window.KarlstadLandmarks=window.KarlstadLandmarks||{};

function pbr(B,scene,name,hex,rough=.7,metal=.05){
  const m=new B.PBRMaterial(name,scene);
  m.albedoColor=B.Color3.FromHexString(hex);
  m.roughness=rough;
  m.metallic=metal;
  return m;
}
function edgeData(B,ring){
  let cx=0,cz=0;
  for(const p of ring){cx+=p.x;cz+=p.z}
  cx/=ring.length||1;cz/=ring.length||1;
  const edges=[];
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    if(len<1.5)continue;
    let nx=-dz/len,nz=dx/len;
    const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
    if((cx-mx)*nx+(cz-mz)*nz>0){nx=-nx;nz=-nz}
    edges.push({a,b,dx,dz,len,nx,nz,mx,mz,ux:dx/len,uz:dz/len,angle:Math.atan2(dx,dz)});
  }
  return{cx,cz,edges};
}
function dynSign(B,scene,name,text,bg,fg,w=1024,h=256,vertical=false){
  const tex=new B.DynamicTexture(name,{width:w,height:h},scene,true),g=tex.getContext();
  g.fillStyle=bg;g.fillRect(0,0,w,h);
  g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
  if(vertical){
    const lines=['MITT','I','CITY'];
    g.font='800 118px Arial';
    const ys=[h*.22,h*.5,h*.78];
    lines.forEach((line,i)=>g.fillText(line,w/2,ys[i]));
  }else{
    g.font='800 108px Arial';
    g.fillText(text,w/2,h/2+5);
  }
  tex.update();
  const mat=new B.StandardMaterial(name+' mat',scene);
  mat.diffuseTexture=tex;mat.emissiveTexture=tex;mat.disableLighting=true;mat.backFaceCulling=false;
  return mat;
}
function edgeBox(B,scene,root,e,name,height,depth,mat,y=height/2,offset=0){
  const m=B.MeshBuilder.CreateBox(name,{width:e.len,height,depth},scene);
  m.position.set(e.mx+e.nx*offset,y,e.mz+e.nz*offset);
  m.rotation.y=e.angle;
  m.material=mat;m.parent=root;m.receiveShadows=true;m.checkCollisions=true;m.isPickable=false;
  return m;
}
function splitFront(B,scene,root,e,mat,wood){
  const entrance=Math.min(7.4,Math.max(4.8,e.len*.22)),side=(e.len-entrance)/2;
  const out=[];
  for(const s of [-1,1]){
    if(side<1)return out;
    const along=s*(entrance/2+side/2);
    const x=e.mx+e.ux*along,z=e.mz+e.uz*along;
    const wall=B.MeshBuilder.CreateBox('Mitt i City front wall',{width:side,height:7.4,depth:.5},scene);
    wall.position.set(x,3.7,z);wall.rotation.y=e.angle;wall.material=mat;wall.parent=root;wall.checkCollisions=true;wall.receiveShadows=true;out.push(wall);
    const glass=B.MeshBuilder.CreateBox('Mitt i City front glass',{width:Math.max(1,side-.5),height:2.8,depth:.08},scene);
    glass.position.set(x+e.nx*.29,2.4,z+e.nz*.29);glass.rotation.y=e.angle;glass.material=window.KarlstadMallV27Mats.glass;glass.parent=root;glass.isPickable=false;
  }
  const canopy=B.MeshBuilder.CreateBox('Mitt i City entrance canopy',{width:entrance+2,height:.22,depth:2.6},scene);
  canopy.position.set(e.mx+e.nx*1.0,4.15,e.mz+e.nz*1.0);canopy.rotation.y=e.angle;canopy.material=wood;canopy.parent=root;canopy.receiveShadows=true;
  return out;
}
function addWoodSlats(B,scene,root,e,wood){
  const count=Math.max(10,Math.min(34,Math.floor(e.len/.75)));
  for(let i=0;i<count;i++){
    const t=(i+.5)/count,along=(t-.5)*e.len;
    if(Math.abs(along)<3.8)continue;
    const slat=B.MeshBuilder.CreateBox('Mitt i City wood slat',{width:.11,height:2.65,depth:.16},scene);
    slat.position.set(e.mx+e.ux*along+e.nx*.38,2.65,e.mz+e.uz*along+e.nz*.38);
    slat.rotation.y=e.angle;slat.material=wood;slat.parent=root;slat.isPickable=false;
  }
}
function addUpperWindows(B,scene,root,e,glass,frame){
  const count=Math.max(3,Math.min(14,Math.floor(e.len/2.9))),gap=e.len/count;
  for(let i=0;i<count;i++){
    const along=-e.len/2+gap*(i+.5);
    const fr=B.MeshBuilder.CreateBox('Mitt i City upper frame',{width:gap*.72,height:1.65,depth:.09},scene);
    fr.position.set(e.mx+e.ux*along+e.nx*.36,6.35,e.mz+e.uz*along+e.nz*.36);
    fr.rotation.y=e.angle;fr.material=frame;fr.parent=root;
    const gl=B.MeshBuilder.CreateBox('Mitt i City upper glass',{width:gap*.62,height:1.48,depth:.11},scene);
    gl.position.set(e.mx+e.ux*along+e.nx*.41,6.35,e.mz+e.uz*along+e.nz*.41);
    gl.rotation.y=e.angle;gl.material=glass;gl.parent=root;
  }
}
function pointFrom(front,inward,lateral,y=0){
  return new BABYLON.Vector3(
    front.mx-front.nx*inward+front.ux*lateral,
    y,
    front.mz-front.nz*inward+front.uz*lateral
  );
}
function shop(B,scene,root,front,label,inward,lateral,side,glass,frame){
  const p=pointFrom(front,inward,lateral,2.05);
  const wall=B.MeshBuilder.CreateBox('shop '+label,{width:5.2,height:4.1,depth:.16},scene);
  wall.position.copyFrom(p);
  wall.rotation.y=front.angle+(side<0?Math.PI/2:-Math.PI/2);
  wall.material=glass;wall.parent=root;wall.isPickable=false;
  const sign=B.MeshBuilder.CreatePlane('shop sign '+label,{width:3.3,height:.62,sideOrientation:B.Mesh.DOUBLESIDE},scene);
  sign.position=pointFrom(front,inward,lateral+(side<0?-.13:.13),3.9);
  sign.rotation.y=front.angle+(side<0?0:Math.PI);
  sign.material=dynSign(B,scene,'shop '+label,label,'#f2efe9','#1d2225',1024,220);
  sign.parent=root;
}
function tableSet(B,scene,root,front,inward,lateral,wood,dark){
  const p=pointFrom(front,inward,lateral,0);
  const top=B.MeshBuilder.CreateCylinder('food table',{height:.08,diameter:1.15,tessellation:20},scene);
  top.position.set(p.x,.78,p.z);top.material=wood;top.parent=root;
  const leg=B.MeshBuilder.CreateCylinder('food table leg',{height:.72,diameter:.11,tessellation:12},scene);
  leg.position.set(p.x,.38,p.z);leg.material=dark;leg.parent=root;
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2,chair=B.MeshBuilder.CreateBox('food chair',{width:.42,height:.08,depth:.42},scene);
    chair.position.set(p.x+Math.cos(a)*.95,.48,p.z+Math.sin(a)*.95);chair.material=wood;chair.parent=root;
    const cl=B.MeshBuilder.CreateCylinder('chair leg',{height:.46,diameter:.055,tessellation:8},scene);
    cl.position.set(chair.position.x,.23,chair.position.z);cl.material=dark;cl.parent=root;
  }
}

window.KarlstadLandmarks.createMittICity=function(ctx){
  const {B,scene,ring,holes,earcut,shadows,props}=ctx;
  const root=new B.TransformNode('LANDMARK Mitt i City V27',scene);
  root.metadata={
    key:'mitt-i-city',label:'Mitt i City',version:27,
    source:'OSM footprint + official Mitt i City information + public architectural references',
    note:'V27 is a gameplay-optimized interpretation, not a survey-accurate BIM model'
  };
  const facade=pbr(B,scene,'Mitt i City charcoal','#4c5052',.78,.06);
  const facade2=pbr(B,scene,'Mitt i City upper','#626769',.72,.08);
  const wood=pbr(B,scene,'Mitt i City timber','#9a6d43',.72,.04);
  const glass=pbr(B,scene,'Mitt i City glass','#42606d',.12,.34);glass.alpha=.9;
  const frame=pbr(B,scene,'Mitt i City frames','#252b2e',.38,.62);
  const floor=pbr(B,scene,'Mitt i City floor','#c9c5bc',.82,.03);
  const white=pbr(B,scene,'Mitt i City interior','#ebe8e0',.62,.02);
  const green=pbr(B,scene,'Mitt i City green','#5a983e',.72,.04);
  const dark=pbr(B,scene,'Mitt i City dark','#24292b',.46,.48);
  window.KarlstadMallV27Mats={glass};

  const ed=edgeData(B,ring),edges=ed.edges;
  let front=edges[0];
  for(const e of edges)if(e.mz>front.mz)front=e;
  const walls=[];
  for(const e of edges){
    if(e===front)walls.push(...splitFront(B,scene,root,e,facade,wood));
    else walls.push(edgeBox(B,scene,root,e,'Mitt i City perimeter',7.4,.48,facade));
    addUpperWindows(B,scene,root,e,glass,frame);
  }
  addWoodSlats(B,scene,root,front,wood);

  const footprint=B.MeshBuilder.CreatePolygon('Mitt i City interior floor',{shape:ring,holes,sideOrientation:B.Mesh.DOUBLESIDE},scene,earcut);
  footprint.position.y=.055;footprint.material=floor;footprint.parent=root;footprint.receiveShadows=true;footprint.isPickable=false;

  const entranceGlass=B.MeshBuilder.CreateBox('Mitt i City entrance doors',{width:5.4,height:3.3,depth:.07},scene);
  const ep=pointFrom(front,.18,0,1.65);entranceGlass.position.copyFrom(ep);entranceGlass.rotation.y=front.angle;entranceGlass.material=glass;entranceGlass.parent=root;entranceGlass.isPickable=false;

  const sign=B.MeshBuilder.CreatePlane('Mitt i City vertical sign',{width:1.45,height:5.0,sideOrientation:B.Mesh.DOUBLESIDE},scene);
  sign.position=pointFrom(front,-.4,-Math.min(front.len*.34,7.6),4.25);
  sign.rotation.y=front.angle+Math.PI;
  sign.material=dynSign(B,scene,'Mitt i City vertical','MITT I CITY','#5d9d40','#ffffff',420,1280,true);
  sign.parent=root;

  const c=new B.Vector3(ed.cx,0,ed.cz);
  const upper1=B.MeshBuilder.CreateBox('Mitt i City roof residence A',{width:10,height:3.5,depth:7},scene);
  upper1.position.set(c.x-4,9.15,c.z-1);upper1.material=facade2;upper1.parent=root;upper1.receiveShadows=true;
  const upper2=B.MeshBuilder.CreateBox('Mitt i City roof residence B',{width:8,height:3.2,depth:6},scene);
  upper2.position.set(c.x+6,9.0,c.z+1.5);upper2.material=facade2;upper2.parent=root;upper2.receiveShadows=true;
  shadows?.addShadowCaster(upper1);shadows?.addShadowCaster(upper2);

  const drum=B.MeshBuilder.CreateCylinder('Mitt i City dome drum',{height:1.35,diameter:6.4,tessellation:32},scene);
  drum.position.set(c.x,10.0,c.z);drum.material=glass;drum.parent=root;
  const dome=B.MeshBuilder.CreateSphere('Mitt i City dome',{diameter:6.5,segments:28},scene);
  dome.scaling.y=.48;dome.position.set(c.x,11.05,c.z);dome.material=dark;dome.parent=root;
  const finial=B.MeshBuilder.CreateSphere('Mitt i City dome finial',{diameter:.55,segments:12},scene);
  finial.position.set(c.x,12.75,c.z);finial.material=dark;finial.parent=root;

  const entranceDepth=Math.min(18,Math.max(12,front.len*.45));
  const corridorFloor=B.MeshBuilder.CreateBox('Mitt i City arcade floor',{width:8.2,height:.12,depth:entranceDepth},scene);
  const cp=pointFrom(front,entranceDepth/2+1.5,0,.09);
  corridorFloor.position.copyFrom(cp);corridorFloor.rotation.y=front.angle;corridorFloor.material=floor;corridorFloor.parent=root;

  const ceiling=B.MeshBuilder.CreateBox('Mitt i City arcade ceiling',{width:8.3,height:.16,depth:entranceDepth},scene);
  ceiling.position=pointFrom(front,entranceDepth/2+1.5,0,4.35);ceiling.rotation.y=front.angle;ceiling.material=white;ceiling.parent=root;

  const labels=['APOTEKET','INDISKA','LEVI\'S','GLITTER','KJELL & COMPANY','KAFÉ BÖNAN'];
  for(let i=0;i<3;i++){
    shop(B,scene,root,front,labels[i],4+i*4,-4.35,-1,glass,frame);
    shop(B,scene,root,front,labels[i+3],4+i*4,4.35,1,glass,frame);
  }

  const mezzL=B.MeshBuilder.CreateBox('Mitt i City mezzanine L',{width:3.2,height:.18,depth:entranceDepth-2},scene);
  mezzL.position=pointFrom(front,entranceDepth/2+2,-3.0,4.35);mezzL.rotation.y=front.angle;mezzL.material=floor;mezzL.parent=root;
  const mezzR=mezzL.clone('Mitt i City mezzanine R');mezzR.position=pointFrom(front,entranceDepth/2+2,3.0,4.35);mezzR.parent=root;
  const railMat=pbr(B,scene,'Mitt i City rail','#9fb4bd',.18,.5);railMat.alpha=.65;
  for(const side of [-1,1]){
    const rail=B.MeshBuilder.CreateBox('Mitt i City glass rail',{width:.1,height:1.05,depth:entranceDepth-2},scene);
    rail.position=pointFrom(front,entranceDepth/2+2,side*1.55,4.92);rail.rotation.y=front.angle;rail.material=railMat;rail.parent=root;
  }

  const escalator=B.MeshBuilder.CreateBox('Mitt i City escalator',{width:1.05,height:.18,depth:7.2},scene);
  escalator.position=pointFrom(front,10.5,-.95,2.0);escalator.rotation.y=front.angle;escalator.rotation.x=-.48;escalator.material=dark;escalator.parent=root;
  const escalator2=escalator.clone('Mitt i City escalator 2');escalator2.position=pointFrom(front,10.5,.95,2.0);escalator2.rotation.x=.48;escalator2.parent=root;

  for(let i=0;i<5;i++)tableSet(B,scene,root,front,entranceDepth+2+(i%2)*2.2,-4.2+i*2.1,wood,dark);

  const foodSign=B.MeshBuilder.CreatePlane('Mitt i City food court sign',{width:5.8,height:.78,sideOrientation:B.Mesh.DOUBLESIDE},scene);
  foodSign.position=pointFrom(front,entranceDepth+4,0,3.4);foodSign.rotation.y=front.angle+Math.PI;
  foodSign.material=dynSign(B,scene,'Mitt i City food','MAT & CAFÉ','#262c2f','#f3efe6',1024,220);foodSign.parent=root;

  for(let i=0;i<6;i++){
    const lp=pointFrom(front,3+i*2.7,(i%2?1.8:-1.8),4.02);
    const light=B.MeshBuilder.CreateCylinder('Mitt i City ceiling light',{height:.08,diameter:.34,tessellation:16},scene);
    light.position.copyFrom(lp);light.material=white;light.parent=root;
    const pl=new B.PointLight('Mitt i City warm light '+i,lp.clone(),scene);
    pl.diffuse=B.Color3.FromHexString('#ffd9a8');pl.intensity=.45;pl.range=7;pl.parent=root;
  }

  createEntryMarker(B,scene,root,front,green);
  root.metadata.entry={x:front.mx-front.nx*1.5,z:front.mz-front.nz*1.5};
  const collisionMesh=walls[0]||upper1;
  collisionMesh.metadata={...(collisionMesh.metadata||{}),landmark:'mitt-i-city',entry:root.metadata.entry};
  return{root,collisionMesh,visualMeshes:[...walls,upper1,upper2,dome],height:12.8,kind:'mitt-i-city-v27'};
};

function createEntryMarker(B,scene,root,front,green){
  const p=pointFrom(front,1.5,0,.04);
  const ring=B.MeshBuilder.CreateTorus('Mitt i City entry marker',{diameter:2.2,thickness:.055,tessellation:28},scene);
  ring.position.copyFrom(p);ring.rotation.x=Math.PI/2;
  const m=new B.StandardMaterial('Mitt i City entry glow',scene);m.emissiveColor=B.Color3.FromHexString('#78d35a');m.disableLighting=true;
  ring.material=m;ring.parent=root;ring.visibility=.72;
}
})();