(function(){
'use strict';
window.KarlstadLandmarks=window.KarlstadLandmarks||{};

function pbr(B,scene,name,hex,rough=.72,metal=.04){
 const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.FromHexString(hex);m.roughness=rough;m.metallic=metal;return m
}
function edgeData(B,ring){
 let cx=0,cz=0;for(const p of ring){cx+=p.x;cz+=p.z}cx/=ring.length||1;cz/=ring.length||1;
 const edges=[];for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<1.5)continue;let nx=-dz/len,nz=dx/len;const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;if((cx-mx)*nx+(cz-mz)*nz>0){nx=-nx;nz=-nz}edges.push({a,b,dx,dz,len,nx,nz,mx,mz,ux:dx/len,uz:dz/len,angle:Math.atan2(dx,dz)})}
 return{cx,cz,edges}
}
function signMat(B,scene,name,text,bg,fg,w=900,h=180){
 const t=new B.DynamicTexture(name,{width:w,height:h},scene,true),g=t.getContext();g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.font='800 64px Arial';g.fillText(text,w/2,h/2+3);t.update();
 const m=new B.StandardMaterial(name+' mat',scene);m.diffuseTexture=t;m.emissiveTexture=t;m.disableLighting=true;m.backFaceCulling=false;return m
}
function addTallWindows(B,scene,root,e,y0,y1,count,glass,frame){
 const gap=e.len/count;
 for(let i=0;i<count;i++){
  const along=-e.len/2+gap*(i+.5),x=e.mx+e.ux*along,z=e.mz+e.uz*along;
  const fr=B.MeshBuilder.CreateBox('V32 facade frame',{width:gap*.6,height:y1-y0,depth:.08},scene);fr.position.set(x,(y0+y1)/2,z);fr.rotation.y=e.angle;fr.material=frame;fr.parent=root;
  const gl=B.MeshBuilder.CreateBox('V32 facade glass',{width:gap*.48,height:(y1-y0)*.82,depth:.11},scene);gl.position.set(x+e.nx*.06,(y0+y1)/2,z+e.nz*.06);gl.rotation.y=e.angle;gl.material=glass;gl.parent=root;
 }
}
function roofPyramid(B,scene,root,cx,cz,w,d,y,h,mat){
 const roof=B.MeshBuilder.CreateCylinder('V32 roof',{height:h,diameter:1,tessellation:4},scene);roof.position.set(cx,y+h/2,cz);roof.scaling.set(w*.74,1,d*.74);roof.rotation.y=Math.PI/4;roof.material=mat;roof.parent=root;return roof
}
function label(B,scene,root,text,x,y,z,angle,bg,fg,w=6){
 const p=B.MeshBuilder.CreatePlane('V32 '+text,{width:w,height:.8,sideOrientation:B.Mesh.DOUBLESIDE},scene);p.position.set(x,y,z);p.rotation.y=angle;p.material=signMat(B,scene,'V32 '+text+' sign',text,bg,fg);p.parent=root;return p
}

window.KarlstadLandmarks.createDomkyrka=function(ctx){
 const {B,scene,ring,holes,earcut,shadows}=ctx,root=new B.TransformNode('LANDMARK Karlstads domkyrka V32',scene),ed=edgeData(B,ring);
 const facade=pbr(B,scene,'Domkyrka plaster','#dccb97',.78,.03),stone=pbr(B,scene,'Domkyrka stone','#b7ad8b',.82,.02),roof=pbr(B,scene,'Domkyrka roof','#5d625d',.44,.2),glass=pbr(B,scene,'Domkyrka glass','#294552',.14,.3),frame=pbr(B,scene,'Domkyrka frame','#7f7156',.54,.22),metal=pbr(B,scene,'Domkyrka spire','#4f5651',.36,.56);
 const body=B.MeshBuilder.ExtrudePolygon('Karlstads domkyrka body',{shape:ring,holes,depth:12,sideOrientation:B.Mesh.DOUBLESIDE},scene,earcut);body.position.y=12;body.material=facade;body.parent=root;body.checkCollisions=true;body.receiveShadows=true;body.metadata={landmark:'domkyrka'};
 for(const e of ed.edges){addTallWindows(B,scene,root,e,2.7,8.4,Math.max(2,Math.min(7,Math.floor(e.len/4))),glass,frame)}
 const maxX=Math.max(...ring.map(p=>p.x)),minX=Math.min(...ring.map(p=>p.x)),maxZ=Math.max(...ring.map(p=>p.z)),minZ=Math.min(...ring.map(p=>p.z)),w=maxX-minX,d=maxZ-minZ,cx=ed.cx,cz=ed.cz;
 roofPyramid(B,scene,root,cx,cz,w,d,12,4.4,roof);
 let front=ed.edges[0];for(const e of ed.edges)if(e.len>front.len)front=e;
 const tx=front.mx-front.nx*1.4,tz=front.mz-front.nz*1.4;
 const tower=B.MeshBuilder.CreateBox('Domkyrka tower',{width:Math.min(9,w*.38),height:18,depth:Math.min(9,d*.38)},scene);tower.position.set(tx,15,tz);tower.rotation.y=front.angle;tower.material=facade;tower.parent=root;tower.checkCollisions=true;tower.receiveShadows=true;
 const clock=signMat(B,scene,'Domkyrka clock','12','#e6dfc5','#292d2e',512,512);for(const side of [-1,1]){const cp=B.MeshBuilder.CreatePlane('Domkyrka clock face',{width:3.1,height:3.1,sideOrientation:B.Mesh.DOUBLESIDE},scene);cp.position.set(tx+front.ux*side*.01+front.nx*(side>0?4.56:-4.56),19.5,tz+front.uz*side*.01+front.nz*(side>0?4.56:-4.56));cp.rotation.y=front.angle+(side>0?0:Math.PI);cp.material=clock;cp.parent=root}
 const spire=B.MeshBuilder.CreateCylinder('Domkyrka spire',{height:11,diameterTop:.18,diameterBottom:5.7,tessellation:16},scene);spire.position.set(tx,29.5,tz);spire.material=metal;spire.parent=root;
 const crossV=B.MeshBuilder.CreateBox('Domkyrka cross v',{width:.16,height:2.0,depth:.12},scene);crossV.position.set(tx,36,tz);crossV.material=metal;crossV.parent=root;const crossH=B.MeshBuilder.CreateBox('Domkyrka cross h',{width:1.25,height:.14,depth:.12},scene);crossH.position.set(tx,36.25,tz);crossH.material=metal;crossH.parent=root;
 label(B,scene,root,'KARLSTADS DOMKYRKA',tx-front.nx*5.2,6,tz-front.nz*5.2,front.angle+Math.PI,'#27342f','#f4eee0',8.2);
 for(const m of root.getChildMeshes()){m.receiveShadows=true;shadows?.addShadowCaster?.(m)}
 return{root,collisionMesh:body,visualMeshes:root.getChildMeshes(),height:37,kind:'domkyrka-v32'}
};

window.KarlstadLandmarks.createRadhus=function(ctx){
 const {B,scene,ring,holes,earcut,shadows}=ctx,root=new B.TransformNode('LANDMARK Rådhuset V32',scene),ed=edgeData(B,ring);
 const facade=pbr(B,scene,'Radhus facade','#d4b96f',.72,.03),trim=pbr(B,scene,'Radhus trim','#eadcae',.68,.02),roof=pbr(B,scene,'Radhus roof','#2f3437',.43,.32),glass=pbr(B,scene,'Radhus glass','#304b55',.16,.3),frame=pbr(B,scene,'Radhus frame','#5b513d',.48,.35);
 const body=B.MeshBuilder.ExtrudePolygon('Rådhuset body',{shape:ring,holes,depth:10.5,sideOrientation:B.Mesh.DOUBLESIDE},scene,earcut);body.position.y=10.5;body.material=facade;body.parent=root;body.checkCollisions=true;body.receiveShadows=true;body.metadata={landmark:'radhuset'};
 for(const e of ed.edges){addTallWindows(B,scene,root,e,2.0,8.2,Math.max(2,Math.min(8,Math.floor(e.len/3.2))),glass,frame)}
 const maxX=Math.max(...ring.map(p=>p.x)),minX=Math.min(...ring.map(p=>p.x)),maxZ=Math.max(...ring.map(p=>p.z)),minZ=Math.min(...ring.map(p=>p.z)),w=maxX-minX,d=maxZ-minZ;
 roofPyramid(B,scene,root,ed.cx,ed.cz,w,d,10.5,3.3,roof);
 let front=ed.edges[0];for(const e of ed.edges)if(e.mz>front.mz)front=e;
 const px=front.mx-front.nx*.4,pz=front.mz-front.nz*.4;
 const ped=B.MeshBuilder.CreateBox('Rådhuset pediment',{width:Math.min(8.6,front.len*.48),height:1.3,depth:.5},scene);ped.position.set(px,9.6,pz);ped.rotation.y=front.angle;ped.material=trim;ped.parent=root;
 for(let i=-2;i<=2;i++){const col=B.MeshBuilder.CreateCylinder('Rådhuset column',{height:3.7,diameter:.38,tessellation:14},scene);col.position.set(px+front.ux*i*1.15,3.0,pz+front.uz*i*1.15);col.material=trim;col.parent=root}
 label(B,scene,root,'RÅDHUSET',px-front.nx*.35,7.2,pz-front.nz*.35,front.angle+Math.PI,'#5b492d','#fff6da',5.6);
 for(const m of root.getChildMeshes()){m.receiveShadows=true;shadows?.addShadowCaster?.(m)}
 return{root,collisionMesh:body,visualMeshes:root.getChildMeshes(),height:13.8,kind:'radhuset-v32'}
};
})();