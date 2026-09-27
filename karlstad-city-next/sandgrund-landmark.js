(function(){
'use strict';
window.KarlstadLandmarks=window.KarlstadLandmarks||{};

function makePbr(B,scene,name,hex,rough,metal){
  const m=new B.PBRMaterial(name,scene);
  m.albedoColor=B.Color3.FromHexString(hex);
  m.roughness=rough;
  m.metallic=metal;
  return m;
}

function edgeData(B,ring){
  const cx=ring.reduce((s,p)=>s+p.x,0)/ring.length;
  const cz=ring.reduce((s,p)=>s+p.z,0)/ring.length;
  const edges=[];
  for(let i=0;i<ring.length;i++){
    const a=ring[i],b=ring[(i+1)%ring.length];
    const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    if(len<3)continue;
    let nx=-dz/len,nz=dx/len;
    const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
    if((cx-mx)*nx+(cz-mz)*nz>0){nx=-nx;nz=-nz}
    edges.push({a,b,dx,dz,len,nx,nz,mx,mz,angle:Math.atan2(nx,nz)});
  }
  edges.sort((a,b)=>b.len-a.len);
  return edges;
}

function centroid(B,ring){
  let x=0,z=0;
  for(const p of ring){x+=p.x;z+=p.z}
  return new B.Vector3(x/ring.length,0,z/ring.length);
}

function basis(B,ring){
  const edges=edgeData(B,ring),front=edges[0];
  const u=new B.Vector3(front.dx/front.len,0,front.dz/front.len);
  const v=new B.Vector3(-u.z,0,u.x);
  const c=centroid(B,ring);
  let minU=Infinity,maxU=-Infinity,minV=Infinity,maxV=-Infinity;
  for(const p of ring){
    const d=p.subtract(c),pu=B.Vector3.Dot(d,u),pv=B.Vector3.Dot(d,v);
    minU=Math.min(minU,pu);maxU=Math.max(maxU,pu);
    minV=Math.min(minV,pv);maxV=Math.max(maxV,pv);
  }
  return{u,v,c,hu:(maxU-minU)/2,hv:(maxV-minV)/2};
}

function quad(B,scene,name,pts,material,parent){
  const positions=pts.flatMap(p=>[p.x,p.y,p.z]),indices=[0,1,2,0,2,3],normals=[];
  B.VertexData.ComputeNormals(positions,indices,normals);
  const vd=new B.VertexData();vd.positions=positions;vd.indices=indices;vd.normals=normals;
  const m=new B.Mesh(name,scene);vd.applyToMesh(m);m.material=material;m.receiveShadows=true;m.isPickable=false;m.parent=parent;return m;
}

function makeSignTexture(B,scene,name,text){
  const tex=new B.DynamicTexture(name,{width:1024,height:256},scene,true);
  const g=tex.getContext();
  g.clearRect(0,0,1024,256);
  g.font='italic 700 118px Georgia';
  g.textAlign='center';g.textBaseline='middle';
  g.lineWidth=12;g.strokeStyle='#a84418';g.fillStyle='#ef6b24';
  g.strokeText(text,512,132);g.fillText(text,512,132);
  tex.hasAlpha=true;tex.update();
  const mat=new B.StandardMaterial(name+' material',scene);
  mat.diffuseTexture=tex;mat.opacityTexture=tex;mat.emissiveTexture=tex;
  mat.disableLighting=true;mat.backFaceCulling=false;mat.useAlphaFromDiffuseTexture=true;
  return mat;
}

function addPanelSeams(B,scene,edge,root,seamMat,h){
  const count=Math.max(4,Math.min(18,Math.floor(edge.len/2.7)));
  for(let i=1;i<count;i++){
    const t=i/count,x=edge.a.x+edge.dx*t,z=edge.a.z+edge.dz*t;
    const s=B.MeshBuilder.CreateBox('Sandgrund panel seam',{width:.035,height:h-.45,depth:.045},scene);
    s.material=seamMat;s.position.set(x+edge.nx*.04,(h-.45)/2+.2,z+edge.nz*.04);s.rotation.y=edge.angle;s.parent=root;s.isPickable=false;
  }
}

function addHorizontalWindows(B,scene,edge,root,glass,frame,y,countScale=.42){
  const count=Math.max(3,Math.min(12,Math.floor(edge.len*countScale/2)));
  const start=.12,end=.88,usable=edge.len*(end-start),gap=.16;
  const w=Math.max(.65,usable/count-gap);
  for(let i=0;i<count;i++){
    const t=start+(i+.5)/count*(end-start),x=edge.a.x+edge.dx*t,z=edge.a.z+edge.dz*t;
    const fr=B.MeshBuilder.CreateBox('Sandgrund aluminium window frame',{width:w+.13,height:.94,depth:.09},scene);
    fr.material=frame;fr.position.set(x+edge.nx*.06,y,z+edge.nz*.06);fr.rotation.y=edge.angle;fr.parent=root;fr.isPickable=false;
    const gl=B.MeshBuilder.CreateBox('Sandgrund clerestory glass',{width:w,height:.78,depth:.105},scene);
    gl.material=glass;gl.position.set(x+edge.nx*.1,y,z+edge.nz*.1);gl.rotation.y=edge.angle;gl.parent=root;gl.isPickable=false;
  }
}

function addRiverWindows(B,scene,edge,root,glass,frame){
  const count=Math.max(6,Math.min(16,Math.floor(edge.len/2.2)));
  const w=Math.max(.85,edge.len*.78/count*.82);
  for(let i=0;i<count;i++){
    const t=.11+(i+.5)/count*.78,x=edge.a.x+edge.dx*t,z=edge.a.z+edge.dz*t;
    const fr=B.MeshBuilder.CreateBox('Sandgrund panorama frame',{width:w+.12,height:2.5,depth:.09},scene);
    fr.material=frame;fr.position.set(x+edge.nx*.055,2.15,z+edge.nz*.055);fr.rotation.y=edge.angle;fr.parent=root;fr.isPickable=false;
    const gl=B.MeshBuilder.CreateBox('Sandgrund panorama glass',{width:w,height:2.34,depth:.11},scene);
    gl.material=glass;gl.position.set(x+edge.nx*.105,2.15,z+edge.nz*.105);gl.rotation.y=edge.angle;gl.parent=root;gl.isPickable=false;
  }
}

window.KarlstadLandmarks.createSandgrund=function(ctx){
  const {B,scene,ring,holes,earcut,shadows,props}=ctx;
  const root=new B.TransformNode('LANDMARK Sandgrund Lars Lerin V16',scene);
  root.metadata={
    key:'sandgrund',
    label:'Sandgrund Lars Lerin',
    source:'real OSM footprint + Karlstad municipal culture-environment description + exterior photo references',
    accuracy:'footprint/position geodata-based; facade/roof composition reference-informed for V16',
    architect:'Uno Asplund',
    built:1960,
    version:16
  };

  const facade=makePbr(B,scene,'Sandgrund white panels','#e6e6df',.82,.01);
  const roof=makePbr(B,scene,'Sandgrund black sheet roof','#252b2d',.5,.42);
  const blueEdge=makePbr(B,scene,'Sandgrund blue roof edge','#587786',.44,.55);
  const aluminium=makePbr(B,scene,'Sandgrund aluminium','#9ca5a7',.28,.78);
  const glass=makePbr(B,scene,'Sandgrund glass','#274650',.12,.26);glass.alpha=.9;
  const black=makePbr(B,scene,'Sandgrund rail','#202527',.38,.68);
  const whiteFrame=makePbr(B,scene,'Sandgrund entrance frame','#f0f0eb',.74,.03);
  const seamMat=makePbr(B,scene,'Sandgrund panel seams','#c4c7c2',.88,.02);

  const baseH=4.45;
  const shell=B.MeshBuilder.ExtrudePolygon('Sandgrund white panel shell',{
    shape:ring,holes,depth:baseH,sideOrientation:B.Mesh.DOUBLESIDE
  },scene,earcut);
  shell.position.y=baseH;shell.material=facade;shell.checkCollisions=true;shell.receiveShadows=true;shell.isPickable=false;shell.parent=root;
  shell.metadata={...root.metadata,properties:props||{}};
  shadows?.addShadowCaster(shell);

  const edges=edgeData(B,ring),front=edges[0],rear=edges[1]||edges[0],b=basis(B,ring);

  // White facade panel seams.
  for(const e of edges.slice(0,4))addPanelSeams(B,scene,e,root,seamMat,baseH);

  // Street facade: narrow aluminium clerestory windows like the current entrance photos.
  addHorizontalWindows(B,scene,front,root,glass,aluminium,2.9,.52);
  if(edges[2])addHorizontalWindows(B,scene,edges[2],root,glass,aluminium,2.95,.34);

  // River side: larger landscape windows, documented as a key modernist feature.
  addRiverWindows(B,scene,rear,root,glass,aluminium);

  // North/south roof composition. Local z decreases towards geographic north.
  const zs=ring.map(p=>p.z),minZ=Math.min(...zs),maxZ=Math.max(...zs),split=minZ+(maxZ-minZ)*.46;
  const northCenter=ring.filter(p=>p.z<=split).length?centroid(B,ring.filter(p=>p.z<=split)):b.c;
  const southCenter=ring.filter(p=>p.z>split).length?centroid(B,ring.filter(p=>p.z>split)):b.c;
  const northHv=b.hv*.5,northHu=b.hu*.96,ridgeY=5.82,eaveY=5.08;
  const P=(c,du,dv,y)=>new B.Vector3(c.x+b.u.x*du+b.v.x*dv,y,c.z+b.u.z*du+b.v.z*dv);
  quad(B,scene,'Sandgrund north gable A',[
    P(northCenter,-northHu,-northHv,eaveY),P(northCenter,northHu,-northHv,eaveY),P(northCenter,northHu,0,ridgeY),P(northCenter,-northHu,0,ridgeY)
  ],roof,root);
  quad(B,scene,'Sandgrund north gable B',[
    P(northCenter,-northHu,0,ridgeY),P(northCenter,northHu,0,ridgeY),P(northCenter,northHu,northHv,eaveY),P(northCenter,-northHu,northHv,eaveY)
  ],roof,root);
  const southHv=b.hv*.52,southHu=b.hu*.94;
  quad(B,scene,'Sandgrund south mono pitch',[
    P(southCenter,-southHu,-southHv,4.98),P(southCenter,southHu,-southHv,4.98),P(southCenter,southHu,southHv,4.58),P(southCenter,-southHu,southHv,4.58)
  ],roof,root);

  // Blue painted sheet-metal edge, called out in the municipal inventory.
  for(const e of edges){
    const f=B.MeshBuilder.CreateBox('Sandgrund blue roof edge',{width:1,height:.17,depth:.15},scene);
    f.material=blueEdge;f.position.set(e.mx+e.nx*.06,4.55,e.mz+e.nz*.06);f.rotation.y=e.angle;f.scaling.x=e.len;f.parent=root;f.isPickable=false;
  }

  if(front){
    // Characteristic white entrance frame / canopy, based on exterior reference photos.
    const entryT=.56,ex=front.a.x+front.dx*entryT,ez=front.a.z+front.dz*entryT;
    const canopy=B.MeshBuilder.CreateBox('Sandgrund white entrance canopy',{width:8.6,height:.24,depth:3.35},scene);
    canopy.material=whiteFrame;canopy.position.set(ex+front.nx*1.55,3.45,ez+front.nz*1.55);canopy.rotation.y=front.angle;canopy.parent=root;canopy.receiveShadows=true;

    const postOffsets=[-3.45,3.45];
    for(const s of postOffsets){
      const p=B.MeshBuilder.CreateBox('Sandgrund angular entrance post',{width:.34,height:3.65,depth:.42},scene);
      p.material=whiteFrame;p.position.set(ex+front.dx/front.len*s+front.nx*1.62,1.82,ez+front.dz/front.len*s+front.nz*1.62);p.rotation.y=front.angle;p.parent=root;
      const arm=B.MeshBuilder.CreateBox('Sandgrund inward folded post arm',{width:2.15,height:.28,depth:.42},scene);
      arm.material=whiteFrame;arm.position.set(ex+front.dx/front.len*(s*.73)+front.nx*1.6,3.56,ez+front.dz/front.len*(s*.73)+front.nz*1.6);arm.rotation.y=front.angle;arm.parent=root;
    }

    // Glass entrance doors and dark ramp.
    for(const s of [-.7,.7]){
      const d=B.MeshBuilder.CreateBox('Sandgrund aluminium entrance door',{width:1.25,height:2.35,depth:.11},scene);
      d.material=glass;d.position.set(ex+front.dx/front.len*s+front.nx*.15,1.2,ez+front.dz/front.len*s+front.nz*.15);d.rotation.y=front.angle;d.parent=root;
    }

    const ramp=B.MeshBuilder.CreateBox('Sandgrund entrance ramp',{width:3.0,height:.16,depth:8.4},scene);
    ramp.material=makePbr(B,scene,'Sandgrund ramp','#777b77',.92,.01);ramp.position.set(ex+front.nx*4.1,.12,ez+front.nz*4.1);ramp.rotation.y=front.angle;ramp.rotation.x=-.018;ramp.parent=root;
    for(const side of [-1,1]){
      const rail=B.MeshBuilder.CreateBox('Sandgrund black ramp rail',{width:.08,height:.08,depth:8.15},scene);
      rail.material=black;rail.position.set(ex+front.dx/front.len*side*1.42+front.nx*4.05,.92,ez+front.dz/front.len*side*1.42+front.nz*4.05);rail.rotation.y=front.angle;rail.parent=root;
      for(let i=0;i<4;i++){
        const rp=B.MeshBuilder.CreateBox('Sandgrund ramp rail post',{width:.07,height:.84,depth:.07},scene);
        rp.material=black;rp.position.set(ex+front.dx/front.len*side*1.42+front.nx*(1.2+i*1.8),.5,ez+front.dz/front.len*side*1.42+front.nz*(1.2+i*1.8));rp.rotation.y=front.angle;rp.parent=root;
      }
    }

    const signMat=makeSignTexture(B,scene,'Sandgrund orange sign texture','Sandgrund');
    const sign=B.MeshBuilder.CreatePlane('Sandgrund orange entrance sign',{width:8.8,height:2.0,sideOrientation:B.Mesh.DOUBLESIDE},scene);
    sign.material=signMat;sign.position.set(ex+front.nx*1.83,4.42,ez+front.nz*1.83);sign.rotation.y=front.angle+Math.PI;sign.parent=root;

    // Second original Sandgrund sign on an adjacent facade when enough edge is available.
    const side=edges.find(e=>e!==front&&e.len>10);
    if(side){
      const sign2=B.MeshBuilder.CreatePlane('Sandgrund orange side sign',{width:5.2,height:1.18,sideOrientation:B.Mesh.DOUBLESIDE},scene);
      sign2.material=signMat;sign2.position.set(side.mx+side.nx*.14,3.45,side.mz+side.nz*.14);sign2.rotation.y=side.angle+Math.PI;sign2.parent=root;
    }
  }

  return{root,collisionMesh:shell,visualMeshes:[shell],height:baseH,kind:'sandgrund-v16'};
};
})();