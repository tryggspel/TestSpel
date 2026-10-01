import {CITY27_VERSION,PLACES27,place27,city27Point,mittICityLayout,mittICityEntrances,MALL_INTERIOR_271} from './city-27.mjs?v=2.7.5';

const rgb=hex=>[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255,1];
class Batch27{
  constructor(){this.positions=[];this.normals=[];this.colors=[];this.indices=[];}
  tri(a,b,c,colour){
    const k=this.positions.length/3,u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;
    for(const p of [a,b,c]){this.positions.push(...p);this.normals.push(...n.map(x=>x/l));this.colors.push(...rgb(colour));}
    this.indices.push(k,k+1,k+2);
  }
  quad(a,b,c,d,colour){this.tri(a,b,c,colour);this.tri(a,c,d,colour);}
  box(x,y,z,w,h,d,colour,shade=colour){
    const a=x-w/2,b=x+w/2,c=y-h/2,e=y+h/2,f=z-d/2,g=z+d/2;
    this.quad([a,c,g],[b,c,g],[b,e,g],[a,e,g],colour);this.quad([b,c,f],[a,c,f],[a,e,f],[b,e,f],shade);
    this.quad([a,c,f],[a,c,g],[a,e,g],[a,e,f],colour);this.quad([b,c,g],[b,c,f],[b,e,f],[b,e,g],shade);this.quad([a,e,g],[b,e,g],[b,e,f],[a,e,f],colour);
  }
  roof(x,y,z,w,d,h,colour='#34494d'){
    const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],p=[x,y+h,z-d/2],q=[x,y+h,z+d/2];
    this.quad(a,e,q,p,colour);this.quad(p,q,c,b,'#253a3e');this.tri(a,p,b,'#e8ddc2');this.tri(e,c,q,'#c6c2aa');
  }
  wedge(x,z,w,d,y0,y1,colour){
    const a=[x-w/2,y0,z-d/2],b=[x+w/2,y0,z-d/2],c=[x+w/2,y1,z+d/2],e=[x-w/2,y1,z+d/2];
    this.quad(a,b,c,e,colour);this.quad([x-w/2,0,z-d/2],[x+w/2,0,z-d/2],b,a,'#253a3e');
    this.quad([x-w/2,0,z+d/2],e,c,[x+w/2,0,z+d/2],'#253a3e');this.quad([x-w/2,0,z-d/2],a,e,[x-w/2,0,z+d/2],'#344c50');this.quad(b,[x+w/2,0,z-d/2],[x+w/2,0,z+d/2],c,'#20383e');
  }
  finish(pc,app,name){
    const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveVertexColor=true;material.update();
    const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(this.positions);mesh.setNormals(this.normals);mesh.setColors(this.colors);mesh.setIndices(this.indices);mesh.update(pc.PRIMITIVE_TRIANGLES);
    const e=new pc.Entity(name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)]});app.root.addChild(e);return e;
  }
}
function drawMittICity(batch,buildings){
  const b=mittICityLayout(buildings),cfg=MALL_INTERIOR_271,x=b.x,z=b.z,w=Math.max(34,b.w),d=Math.max(28,b.d),wall='#d9d4c6',ink='#223f43',glass='#5f929a',accent='#b23d33';
  batch.box(x,.035,z,w,.06,d,'#bdb79f');
  const gap=8,sideW=(w-gap)/2,sideD=(d-gap)/2;
  for(const zz of [z-d/2,z+d/2]){batch.box(x-w/4-gap/4,3.2,zz,sideW,6.4,.45,wall);batch.box(x+w/4+gap/4,3.2,zz,sideW,6.4,.45,wall);}
  for(const xx of [x-w/2,x+w/2]){batch.box(xx,3.2,z-d/4-gap/4,.45,6.4,sideD,wall);batch.box(xx,3.2,z+d/4+gap/4,.45,6.4,sideD,wall);}
  for(const [xx,zz] of [[x-w/2,z-d/2],[x+w/2,z-d/2],[x-w/2,z+d/2],[x+w/2,z+d/2]])batch.box(xx,5.6,zz,1.15,11.2,1.15,ink);
  const aw=w*cfg.upperWidthFactor,ad=d*cfg.upperDepthFactor,ring=cfg.ring,y=cfg.upper-.18;
  batch.box(x,y,z-ad/2,aw,.36,ring,wall);batch.box(x,y,z+ad/2,aw,.36,ring,wall);batch.box(x-aw/2,y,z,ring,.36,ad-ring,wall);batch.box(x+aw/2,y,z,ring,.36,ad-ring,wall);
  for(const [xx,zz] of [[x-aw/2,z-ad/2],[x+aw/2,z-ad/2],[x-aw/2,z+ad/2],[x+aw/2,z+ad/2]])batch.box(xx,2.65,zz,.65,5.3,.65,ink);
  batch.wedge(x-cfg.rampOffset,z,cfg.rampWidth,cfg.rampDepth,.05,cfg.upper,'#6a8586');batch.wedge(x+cfg.rampOffset,z,cfg.rampWidth,cfg.rampDepth,cfg.upper,.05,'#6a8586');
  for(const side of [-1,1])for(let i=1;i<9;i++){const zz=z-cfg.rampDepth/2+i*cfg.rampDepth/9;const t=i/9,h=side<0?.05+t*(cfg.upper-.05):cfg.upper-t*(cfg.upper-.05);batch.box(x+side*cfg.rampOffset,h+.04,zz,cfg.rampWidth*.9,.07,.18,'#e2d3a7');}
  const innerW=Math.max(.4,aw-2*ring),innerD=Math.max(.4,ad-2*ring),hx=innerW/2,hz=innerD/2,railY=cfg.upper+.62;
  for(const xx of [x-hx,x+hx])batch.box(xx,railY,z,.12,1.25,innerD,'#36565a');
  for(const zz of [z-hz,z+hz]){batch.box(x-hx*.72,railY,zz,hx*.55,1.25,.12,'#36565a');batch.box(x,railY,zz,Math.max(.4,hx*.28),1.25,.12,'#36565a');batch.box(x+hx*.72,railY,zz,hx*.55,1.25,.12,'#36565a');}
  batch.box(x,8.5,z,w*.55,.28,d*.52,glass);batch.box(x,8.72,z,w*.57,.18,d*.54,ink);
  batch.box(x,6.6,z-d/2-.28,16,.8,.35,accent);batch.box(x,6.6,z+d/2+.28,16,.8,.35,accent);
  return b;
}
function drawLandmarks(batch){
  const duvan=place27('duvan'),ahlens=place27('ahlens'),hotel=place27('stadshotellet'),museum=place27('varmlands-museum'),sand=place27('sandgrundsudden');
  batch.box(duvan.x,5.1,duvan.z,42,10.2,28,'#b59a78','#8f785f');batch.box(duvan.x,2.0,duvan.z-14.1,25,3.2,.3,'#5d8e96');batch.box(duvan.x,7.2,duvan.z-14.2,27,.9,.35,'#263f43');
  batch.box(ahlens.x,6.0,ahlens.z,35,12,25,'#ddd8ca','#b7b4aa');batch.box(ahlens.x,2.0,ahlens.z+12.6,25,3.1,.35,'#546f73');batch.box(ahlens.x,12.25,ahlens.z,36,.5,26,'#a93d35');
  batch.box(hotel.x,7.0,hotel.z,46,14,23,'#e2d8bf','#c5bda8');batch.roof(hotel.x,14.0,hotel.z,47,24,5.2,'#32484c');for(let dx=-18;dx<=18;dx+=6)batch.box(hotel.x+dx,6.8,hotel.z+11.6,2.4,5.6,.18,'#607f84');
  batch.box(museum.x-15,6.2,museum.z,30,12.4,27,'#a66547','#7f503d');batch.roof(museum.x-15,12.4,museum.z,31,28,4.3,'#34494b');batch.box(museum.x+15,5.0,museum.z+3,29,10,22,'#354f54','#263e43');batch.box(museum.x+15,4.0,museum.z+14.1,24,6.0,.25,'#6f9da2');
  const px=(museum.x+sand.x)/2,pz=(museum.z+sand.z)/2;
  batch.box(px,.025,pz,112,.05,94,'#6f8d68');batch.box(px,.055,pz,16,.06,102,'#c7bda1');batch.box(px-64,.015,pz,24,.03,118,'#4b8494');batch.box(px+64,.015,pz,24,.03,118,'#4b8494');
  for(let i=0;i<9;i++){const xx=px-43+(i%5)*21,zz=pz-31+Math.floor(i/5)*54;batch.box(xx,2.0,zz,.55,4,.55,'#584b39');batch.box(xx,5.0,zz,4.2,6,4.2,'#42654b');}
}
function arrowFor(from,to){
  const dx=to.x-from.x,dz=to.z-from.z,a=(Math.atan2(dx,-dz)+Math.PI*2)%(Math.PI*2),arrows=['↑','↗','→','↘','↓','↙','←','↖'];
  return arrows[Math.round(a/(Math.PI/4))%8];
}
function wayfindingPosts(buildings){
  const mall=mittICityLayout(buildings),church=buildings.find(b=>Number(b.osm)===75070676),sand=buildings.find(b=>Number(b.osm)===95639598);
  const center=b=>b?{x:(b.minx+b.maxx)/2,z:(b.minz+b.maxz)/2}:null;
  const targets={
    'MITT I CITY':{x:mall.x,z:mall.z},
    'DOMKYRKAN':center(church)||{x:145,z:-105},
    'SANDGRUND':center(sand)||{x:-22,z:-397},
    'O’LEARYS':city27Point(13.503791,59.380512),
    'VÄRMLANDS MUSEUM':place27('varmlands-museum'),
    'STORA TORGET':{x:0,z:0}
  };
  return [
    {x:18,z:20,yaw:0,names:['MITT I CITY','DOMKYRKAN','SANDGRUND','O’LEARYS']},
    {x:mall.x+11,z:mall.z-8,yaw:90,names:['STORA TORGET','O’LEARYS','DOMKYRKAN']},
    {x:-52,z:-260,yaw:0,names:['SANDGRUND','VÄRMLANDS MUSEUM','STORA TORGET']}
  ].map(post=>({...post,signs:post.names.map((name,i)=>({text:arrowFor(post,targets[name])+' '+name,x:post.x,y:2.4+i*.78,z:post.z,w:name.length>15?10.8:8.7,h:.62,yaw:post.yaw}))}));
}
function createSigns(pc,app,buildings){
  const mall=mittICityLayout(buildings);const labelData=[
    {text:'MITT I CITY',x:mall.x,y:7.3,z:mall.minz-.55,w:13,h:1.8,yaw:0},
    {...place27('duvan'),text:'DUVAN',y:8.0,w:10,h:1.6,yaw:0},
    {...place27('ahlens'),text:'ÅHLÉNS',y:9.0,w:10,h:1.6,yaw:0},
    {...place27('stadshotellet'),text:'STADSHOTELLET',y:11.0,w:15,h:1.6,yaw:90},
    {...place27('varmlands-museum'),text:'VÄRMLANDS MUSEUM',y:10.0,w:18,h:1.7,yaw:0},
    ...mittICityEntrances(mall).map(e=>({text:'INGÅNG',...e.sign,w:7.2,h:.9})),
    ...wayfindingPosts(buildings).flatMap(p=>p.signs)
  ];
  const rows=labelData.length,canvas=document.createElement('canvas');canvas.width=1024;canvas.height=rows*128;const c=canvas.getContext('2d');
  c.textAlign='center';c.textBaseline='middle';
  labelData.forEach((s,i)=>{const y=i*128;c.fillStyle=i<5?'#173d39':'#24516a';c.fillRect(0,y,1024,128);c.strokeStyle='#f0d18a';c.lineWidth=12;c.strokeRect(8,y+8,1008,112);c.fillStyle='#fff0c8';c.font='900 62px system-ui,sans-serif';c.fillText(s.text,512,y+64,930);});
  const tex=new pc.Texture(app.graphicsDevice,{width:canvas.width,height:canvas.height,flipY:true,mipmaps:true,minFilter:pc.FILTER_LINEAR_MIPMAP_LINEAR,magFilter:pc.FILTER_LINEAR});tex.setSource(canvas);
  const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveMap=tex;material.cull=pc.CULLFACE_NONE;material.update();
  const positions=[],normals=[],uvs=[],indices=[];
  labelData.forEach((s,i)=>{const k=positions.length/3,a=s.yaw*Math.PI/180,rx=Math.cos(a)*s.w/2,rz=-Math.sin(a)*s.w/2;
    positions.push(s.x-rx,s.y-s.h/2,s.z-rz,s.x+rx,s.y-s.h/2,s.z+rz,s.x+rx,s.y+s.h/2,s.z+rz,s.x-rx,s.y+s.h/2,s.z-rz);
    normals.push(0,0,1,0,0,1,0,0,1,0,0,1);const v0=1-(i+1)/rows,v1=1-i/rows;uvs.push(0,v0,1,v0,1,v1,0,v1);indices.push(k,k+1,k+2,k,k+2,k+3);
  });
  const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(positions);mesh.setNormals(normals);mesh.setUvs(0,uvs);mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_TRIANGLES);
  const e=new pc.Entity('Karlstad 2.7.5 · landmärken, entréer och vägvisning');e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)]});app.root.addChild(e);return e;
}
export function createCityExpansion27(pc,app,buildings=[]){
  const batch=new Batch27();const mall=drawMittICity(batch,buildings);drawLandmarks(batch);for(const p of wayfindingPosts(buildings))batch.box(p.x,1.45,p.z,.18,2.9,.18,'#263f46');batch.finish(pc,app,'Karlstad · Graphics 2.7.5');createSigns(pc,app,buildings);
  return Object.freeze({version:CITY27_VERSION,staticDrawCalls:2,places:PLACES27.length,wayfindingPosts:3,mall:{x:mall.x,z:mall.z,w:mall.w,d:mall.d,entrances:4,upperFloor:true,upperHeight:MALL_INTERIOR_271.upper,escalators:2}});
}
