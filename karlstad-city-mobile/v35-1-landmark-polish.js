(()=>{'use strict';
const B=window.BABYLON;if(!B)return;
const TOUCH=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>1;
const ORIGIN={lat:59.380767,lon:13.50295};
const MLON=111320*Math.cos(ORIGIN.lat*Math.PI/180),MLAT=110540;
const local=(lon,lat)=>new B.Vector3((lon-ORIGIN.lon)*MLON,0,-(lat-ORIGIN.lat)*MLAT);

function waitScene(){return new Promise(resolve=>{let n=0;const t=setInterval(()=>{const s=B.Engine?.LastCreatedScene;if(s?.activeCamera){clearInterval(t);resolve(s)}else if(++n>240){clearInterval(t);resolve(null)}},50)})}
function pbr(scene,name,hex,rough=.72,metal=.04){const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.FromHexString(hex);m.roughness=rough;m.metallic=metal;return m}
function std(scene,name,hex){const m=new B.StandardMaterial(name,scene);m.diffuseColor=B.Color3.FromHexString(hex);m.emissiveColor=B.Color3.FromHexString(hex);m.disableLighting=true;return m}
function tune(scene,needle,hex,rough,metal){
  const n=needle.toLowerCase();for(const m of scene.materials||[]){if(!String(m.name||'').toLowerCase().includes(n))continue;
    const c=B.Color3.FromHexString(hex);if(m.albedoColor)m.albedoColor=c;if(m.diffuseColor)m.diffuseColor=c;
    if(rough!=null&&'roughness'in m)m.roughness=rough;if(metal!=null&&'metallic'in m)m.metallic=metal;
  }
}
function texMat(scene,name,draw,w=1024,h=256){
  const t=new B.DynamicTexture(name,{width:w,height:h},scene,true),g=t.getContext();draw(g,w,h);t.update();
  const m=new B.StandardMaterial(name+' mat',scene);m.diffuseTexture=t;m.emissiveTexture=t;m.disableLighting=true;m.backFaceCulling=false;t.hasAlpha=true;m.useAlphaFromDiffuseTexture=true;return m
}
function sign(scene,name,text,bg,fg){
  return texMat(scene,name,(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';g.font='900 74px Arial';g.fillText(text,w/2,h/2+4)},1024,220)
}
function plane(scene,name,w,h,pos,rotY,mat,parent=null){
  const p=B.MeshBuilder.CreatePlane(name,{width:w,height:h,sideOrientation:B.Mesh.DOUBLESIDE},scene);p.position.copyFrom(pos);p.rotation.y=rotY;p.material=mat;p.isPickable=false;p.checkCollisions=false;p.parent=parent;return p
}
function box(scene,name,w,h,d,pos,rotY,mat,parent=null){
  const x=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);x.position.copyFrom(pos);x.rotation.y=rotY;x.material=mat;x.isPickable=false;x.checkCollisions=false;x.parent=parent;return x
}
function bounds(mesh){mesh.computeWorldMatrix(true);const b=mesh.getBoundingInfo().boundingBox;return{min:b.minimumWorld.clone(),max:b.maximumWorld.clone(),c:b.centerWorld.clone()}}
function find(scene,needle){return (scene.meshes||[]).find(m=>String(m.name||'').toLowerCase().includes(needle.toLowerCase()))}
function root(scene,needle){return (scene.transformNodes||[]).find(n=>String(n.name||'').toLowerCase().includes(needle.toLowerCase()))}

function polishRadhus(scene){
  tune(scene,'Radhus facade','#dec88f',.76,.02);tune(scene,'Radhus trim','#f0e3b8',.7,.01);tune(scene,'Radhus roof','#363a3b',.48,.25);
  const body=find(scene,'Rådhuset body');if(!body)return;const b=bounds(body),r=root(scene,'Rådhuset V32');
  const frontX=b.max.x+.05,cz=b.c.z;
  const archMat=texMat(scene,'V35.1 radhus arched windows',(g,w,h)=>{
    g.clearRect(0,0,w,h);for(let i=0;i<5;i++){const x=95+i*202;g.fillStyle='#28434d';g.beginPath();g.roundRect(x,48,128,144,56);g.fill();g.strokeStyle='#efe3bc';g.lineWidth=14;g.stroke()}
  },1100,240);
  plane(scene,'V35.1 Rådhuset arched facade',Math.min(18,b.max.z-b.min.z-1),4.0,new B.Vector3(frontX,6.9,cz),Math.PI/2,archMat,r);
  const green=pbr(scene,'V35.1 radhus awning','#285a49',.66,.02);
  for(let i=-2;i<=2;i++)box(scene,'V35.1 Rådhuset green awning',2.15,.22,1.25,new B.Vector3(frontX+.58,2.65,cz+i*3.0),0,green,r);
  const clockMat=texMat(scene,'V35.1 radhus clock',(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#f4eed9';g.beginPath();g.arc(w/2,h/2,w*.42,0,Math.PI*2);g.fill();g.strokeStyle='#35312b';g.lineWidth=15;g.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6;g.beginPath();g.moveTo(w/2+Math.cos(a)*w*.30,h/2+Math.sin(a)*h*.30);g.lineTo(w/2+Math.cos(a)*w*.37,h/2+Math.sin(a)*h*.37);g.lineWidth=8;g.stroke()}g.beginPath();g.moveTo(w/2,h/2);g.lineTo(w/2,h*.26);g.moveTo(w/2,h/2);g.lineTo(w*.66,h*.58);g.lineWidth=12;g.stroke()},512,512);
  plane(scene,'V35.1 Rådhuset clock',2.3,2.3,new B.Vector3(frontX+.03,11.85,cz),Math.PI/2,clockMat,r);
  const bronze=pbr(scene,'V35.1 bronze eagle','#51463a',.48,.52);
  for(const dz of [-3.0,3.0]){
    const bird=new B.TransformNode('V35.1 Rådhuset eagle',scene);bird.position.set(frontX,13.0,cz+dz);bird.parent=r;
    const bodyE=B.MeshBuilder.CreateSphere('eagle body',{diameter:.55,segments:8},scene);bodyE.scaling.set(1.3,.65,.65);bodyE.material=bronze;bodyE.parent=bird;
    for(const s of [-1,1]){const wing=B.MeshBuilder.CreateBox('eagle wing',{width:.85,height:.12,depth:.42},scene);wing.position.z=s*.48;wing.rotation.x=s*.28;wing.material=bronze;wing.parent=bird}
  }
}

function polishDomkyrka(scene){
  tune(scene,'Domkyrka plaster','#eee9dd',.8,.01);tune(scene,'Domkyrka stone','#d8d1c1',.82,.01);tune(scene,'Domkyrka spire','#49362f',.45,.36);tune(scene,'Domkyrka roof','#34383a',.55,.18);
  const body=find(scene,'Karlstads domkyrka body');if(!body)return;const b=bounds(body),r=root(scene,'domkyrka V32');
  const west=b.min.x-.06,cz=b.c.z;
  const portal=pbr(scene,'V35.1 domkyrka portal','#d8d1c2',.82,.01),door=pbr(scene,'V35.1 domkyrka door','#1e4036',.68,.08);
  box(scene,'V35.1 domkyrka portal frame',4.8,5.6,.45,new B.Vector3(west-.22,3.15,cz),Math.PI/2,portal,r);
  box(scene,'V35.1 domkyrka green door',2.4,3.85,.18,new B.Vector3(west-.48,2.15,cz),Math.PI/2,door,r);
  const round=texMat(scene,'V35.1 domkyrka round window',(g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle='#243f49';g.beginPath();g.arc(w/2,h/2,w*.36,0,Math.PI*2);g.fill();g.strokeStyle='#ded7c7';g.lineWidth=18;g.stroke()},512,512);
  plane(scene,'V35.1 domkyrka round window',2.6,2.6,new B.Vector3(west-.52,6.5,cz),Math.PI/2,round,r);
  const trim=pbr(scene,'V35.1 domkyrka white trim','#f5f0e6',.78,.01);
  for(const z of [b.min.z+1.4,b.max.z-1.4])box(scene,'V35.1 domkyrka corner pilaster',.42,8.8,.42,new B.Vector3(west-.20,6.1,z),0,trim,r);
}

function polishSandgrund(scene){
  tune(scene,'Sandgrund white panels','#efefea',.84,.01);tune(scene,'Sandgrund glass','#365763',.16,.22);
  const shell=find(scene,'Sandgrund white panel shell');if(!shell)return;const b=bounds(shell),r=root(scene,'Sandgrund Lars Lerin V25');
  const terrace=pbr(scene,'V35.1 Sandgrund terrace','#e8e5dd',.82,.01),rail=pbr(scene,'V35.1 Sandgrund terrace rail','#d8d8d2',.55,.28),dark=pbr(scene,'V35.1 Sandgrund furniture','#34383a',.55,.24);
  const z=b.max.z+2.2,x=b.c.x;
  box(scene,'V35.1 Sandgrund terrace',Math.min(16,b.max.x-b.min.x-2),.16,3.8,new B.Vector3(x,.12,z),0,terrace,r);
  for(const s of [-1,1])box(scene,'V35.1 Sandgrund terrace rail',.09,1.0,3.8,new B.Vector3(x+s*7.4,.58,z),0,rail,r);
  box(scene,'V35.1 Sandgrund front rail',14.9,.09,.09,new B.Vector3(x,.92,z+1.84),0,rail,r);
  const count=TOUCH?2:4;
  for(let i=0;i<count;i++){
    const tx=x-5.4+i*3.6;
    const top=B.MeshBuilder.CreateCylinder('V35.1 Sandgrund cafe table',{height:.08,diameter:1.0,tessellation:14},scene);top.position.set(tx,.78,z);top.material=dark;top.parent=r;
    const leg=B.MeshBuilder.CreateCylinder('V35.1 Sandgrund cafe leg',{height:.68,diameter:.08,tessellation:8},scene);leg.position.set(tx,.4,z);leg.material=dark;leg.parent=r;
  }
}

function polishMittICity(scene){
  tune(scene,'Mitt i City charcoal','#505356',.8,.04);tune(scene,'Mitt i City glass','#496b78',.14,.26);tune(scene,'Mitt i City timber','#9a6a43',.75,.03);
  const c=local(13.50055,59.37988),r=root(scene,'Mitt i City V32');
  const orange=pbr(scene,'V35.1 orange pennants','#ef7d32',.7,.02),wire=pbr(scene,'V35.1 pennant wire','#31383a',.55,.4);
  const rows=TOUCH?2:3;
  for(let row=0;row<rows;row++){
    const z=c.z+11+row*5.2;
    box(scene,'V35.1 Mitt i City banner wire',20,.035,.035,new B.Vector3(c.x,5.6,z),0,wire,r);
    for(let i=-4;i<=4;i++){
      const tri=B.MeshBuilder.CreateCylinder('V35.1 Mitt i City pennant',{height:.65,diameterTop:.02,diameterBottom:.54,tessellation:3},scene);
      tri.position.set(c.x+i*2.2,5.22,z);tri.rotation.z=Math.PI;tri.material=orange;tri.parent=r;tri.isPickable=false;
    }
  }
  const pink=sign(scene,'V35.1 Mitt i City pink sign','MITT I CITY','#b93e74','#ffffff');
  plane(scene,'V35.1 Mitt i City street sign',5.4,1.35,new B.Vector3(c.x+7.5,4.7,c.z+8),Math.PI/2,pink,r);
  const wood=pbr(scene,'V35.1 street bench','#8b6b4a',.78,.03),metal=pbr(scene,'V35.1 street metal','#4d5659',.48,.46),leaf=pbr(scene,'V35.1 tree leaf','#426a3e',.9,.01),trunk=pbr(scene,'V35.1 tree trunk','#5c4938',.92,.01);
  for(const s of [-1,1]){
    const bx=c.x+s*8,bz=c.z+15;
    box(scene,'V35.1 Mitt i City bench',2.4,.18,.55,new B.Vector3(bx,.55,bz),0,wood,r);
    box(scene,'V35.1 Mitt i City bench back',2.4,.65,.12,new B.Vector3(bx,.92,bz+.25),0,wood,r);
    const tr=B.MeshBuilder.CreateCylinder('V35.1 Mitt i City tree',{height:3.8,diameter:.32,tessellation:8},scene);tr.position.set(c.x+s*11,1.9,c.z+12);tr.material=trunk;tr.parent=r;
    const crown=B.MeshBuilder.CreateSphere('V35.1 Mitt i City tree crown',{diameter:3.1,segments:8},scene);crown.position.set(c.x+s*11,4.2,c.z+12);crown.scaling.y=.82;crown.material=leaf;crown.parent=r;
  }
}

function polishSquare(scene){
  const stone=pbr(scene,'V35.1 square stone','#8f8d88',.95,.01),wood=pbr(scene,'V35.1 square wood','#866748',.82,.01);
  const red=pbr(scene,'V35.1 market red','#a74a3f',.76,.01),cream=pbr(scene,'V35.1 market cream','#e8dbbd',.82,.01),green=pbr(scene,'V35.1 market green','#58775a',.82,.01);
  const mats=[red,cream,green];const count=TOUCH?2:4;
  for(let i=0;i<count;i++){
    const x=-13+i*8.5,z=7+(i%2)*5;
    const pole=B.MeshBuilder.CreateCylinder('V35.1 market pole',{height:2.7,diameter:.09,tessellation:8},scene);pole.position.set(x,1.35,z);pole.material=stone;
    const shade=B.MeshBuilder.CreateCylinder('V35.1 market umbrella',{height:.22,diameterTop:.55,diameterBottom:4.0,tessellation:16},scene);shade.position.set(x,2.72,z);shade.material=mats[i%mats.length];
    const table=B.MeshBuilder.CreateBox('V35.1 market table',{width:2.4,height:.75,depth:1.0},scene);table.position.set(x,.55,z);table.material=wood;
  }
  const cobble=pbr(scene,'V35.1 square cobble accent','#777a77',.98,.01);
  for(let i=-3;i<=3;i++)box(scene,'V35.1 cobble seam',.07,.015,48,new B.Vector3(i*7,.02,0),0,cobble);
}

async function boot(){
  const scene=await waitScene();if(!scene)return;
  setTimeout(()=>{try{
    polishRadhus(scene);polishDomkyrka(scene);polishSandgrund(scene);polishMittICity(scene);polishSquare(scene);
    window.KarlstadLandmarkV351={ready:true,version:'35.1'};
    console.log('[V35.1] Landmark polish ready');
  }catch(e){console.error('[V35.1] landmark polish failed',e)}},900);
}
boot();
})();