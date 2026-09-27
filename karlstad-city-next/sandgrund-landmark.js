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

window.KarlstadLandmarks.createSandgrund=function(ctx){
  const {B,scene,ring,holes,earcut,shadows,props,spec}=ctx;
  const root=new B.TransformNode('LANDMARK Sandgrund Lars Lerin',scene);
  root.metadata={
    key:'sandgrund',
    label:'Sandgrund Lars Lerin',
    source:'real OSM footprint + reference-informed custom shell',
    accuracy:'footprint/position geodata-based; facade/roof details approximated for V15',
    architect:'Uno Asplund',
    built:1960
  };

  const facade=makePbr(B,scene,'Sandgrund facade','#b4ad9e',.78,.03);
  const roof=makePbr(B,scene,'Sandgrund roof','#3a4648',.58,.25);
  const frame=makePbr(B,scene,'Sandgrund frames','#252f32',.34,.62);
  const glass=makePbr(B,scene,'Sandgrund glass','#284a55',.13,.35);
  glass.alpha=.88;
  const dark=makePbr(B,scene,'Sandgrund sign','#1f2729',.42,.45);

  const h=5.35;
  const shell=B.MeshBuilder.ExtrudePolygon('Sandgrund shell',{
    shape:ring,holes,depth:h,sideOrientation:B.Mesh.DOUBLESIDE
  },scene,earcut);
  shell.position.y=h;
  shell.material=facade;
  shell.checkCollisions=true;
  shell.receiveShadows=true;
  shell.isPickable=false;
  shell.parent=root;
  shell.metadata={...root.metadata,properties:props||{}};
  shadows?.addShadowCaster(shell);

  try{
    const cap=B.MeshBuilder.CreatePolygon('Sandgrund exact roof',{
      shape:ring,holes,sideOrientation:B.Mesh.DOUBLESIDE
    },scene,earcut);
    cap.position.y=h+.08;
    cap.material=roof;
    cap.receiveShadows=true;
    cap.isPickable=false;
    cap.parent=root;
  }catch(e){console.warn('Sandgrund roof skipped',e)}

  const edges=edgeData(B,ring);
  const fasciaSource=B.MeshBuilder.CreateBox('Sandgrund fascia source',{width:1,height:.24,depth:.18},scene);
  fasciaSource.material=roof;fasciaSource.position.y=-500;fasciaSource.parent=root;fasciaSource.isPickable=false;

  for(const e of edges){
    const f=fasciaSource.createInstance('Sandgrund roof fascia');
    f.position.set(e.mx+e.nx*.05,h+.05,e.mz+e.nz*.05);
    f.rotation.y=e.angle;
    f.scaling.x=e.len;
    f.parent=root;
  }

  const glassSource=B.MeshBuilder.CreateBox('Sandgrund glass source',{width:1,height:2.45,depth:.08},scene);
  glassSource.material=glass;glassSource.position.y=-500;glassSource.parent=root;glassSource.isPickable=false;
  const mullionSource=B.MeshBuilder.CreateBox('Sandgrund mullion source',{width:.07,height:2.65,depth:.13},scene);
  mullionSource.material=frame;mullionSource.position.y=-500;mullionSource.parent=root;mullionSource.isPickable=false;

  for(const e of edges.slice(0,2)){
    const count=Math.max(5,Math.min(18,Math.floor(e.len/2.15)));
    const usable=e.len*.78;
    const panelW=Math.max(.85,usable/count*.78);
    for(let i=0;i<count;i++){
      const t=.11+(i+.5)/count*.78;
      const x=e.a.x+e.dx*t,z=e.a.z+e.dz*t;
      const g=glassSource.createInstance('Sandgrund glazed facade');
      g.position.set(x+e.nx*.09,2.2,z+e.nz*.09);
      g.rotation.y=e.angle;
      g.scaling.x=panelW;
      g.parent=root;
      if(i<count-1){
        const m=mullionSource.createInstance('Sandgrund mullion');
        const tt=.11+(i+1)/count*.78;
        m.position.set(e.a.x+e.dx*tt+e.nx*.13,2.2,e.a.z+e.dz*tt+e.nz*.13);
        m.rotation.y=e.angle;
        m.parent=root;
      }
    }
  }

  const front=edges[0];
  if(front){
    const canopy=B.MeshBuilder.CreateBox('Sandgrund entrance canopy',{width:6.1,height:.18,depth:2.1},scene);
    canopy.material=frame;
    canopy.position.set(front.mx+front.nx*1.0,2.75,front.mz+front.nz*1.0);
    canopy.rotation.y=front.angle;
    canopy.parent=root;
    canopy.receiveShadows=true;

    const doorMat=glass;
    for(const s of [-.72,.72]){
      const d=B.MeshBuilder.CreateBox('Sandgrund entrance glass door',{width:1.25,height:2.45,depth:.1},scene);
      d.material=doorMat;
      d.position.set(front.mx+front.nx*.14+front.dx/front.len*s,1.25,front.mz+front.nz*.14+front.dz/front.len*s);
      d.rotation.y=front.angle;
      d.parent=root;
    }

    const tex=new B.DynamicTexture('Sandgrund sign texture',{width:1024,height:160},scene,true);
    const g=tex.getContext();
    g.clearRect(0,0,1024,160);
    g.fillStyle='#1f2729';
    g.fillRect(0,0,1024,160);
    g.fillStyle='#f4f1e7';
    g.font='700 52px system-ui';
    g.textAlign='center';
    g.textBaseline='middle';
    g.fillText('SANDGRUND · LARS LERIN',512,80);
    tex.update();
    const signMat=new B.StandardMaterial('Sandgrund sign material',scene);
    signMat.diffuseTexture=tex;
    signMat.emissiveTexture=tex;
    signMat.disableLighting=true;
    signMat.backFaceCulling=false;
    const sign=B.MeshBuilder.CreatePlane('Sandgrund sign',{width:7.8,height:1.22},scene);
    sign.material=signMat;
    sign.position.set(front.mx+front.nx*.13,4.22,front.mz+front.nz*.13);
    sign.rotation.y=front.angle;
    sign.parent=root;
  }

  const plinthMat=dark;
  for(const e of edges.slice(0,3)){
    const p=B.MeshBuilder.CreateBox('Sandgrund plinth',{width:1,height:.34,depth:.14},scene);
    p.material=plinthMat;
    p.position.set(e.mx+e.nx*.07,.18,e.mz+e.nz*.07);
    p.rotation.y=e.angle;
    p.scaling.x=e.len*.96;
    p.parent=root;
  }

  return{
    root,
    collisionMesh:shell,
    visualMeshes:[shell],
    height:h,
    kind:'sandgrund-v15'
  };
};
})();