// Folklivet på julmarknaden (2.21.1-xmas.13): ritar folkmassan (xmas-crowd.mjs) och scenens artister som bildkort i en enda mesh (ett ritanrop).
// Varje figur vänder sig mot kameran runt den lodräta axeln och speglas efter gångriktningen (den som går åt vänster i bild ses från sidan åt vänster).
// Bara när spelaren är vid torget; simuleringen går med full fart inom 140 m och står still längre bort.
import {Crowd,CROWD} from './xmas-crowd.mjs?v=2.21.1-xmas.16';
import {PEOPLE_STYLES,PEOPLE_ATLAS,PEOPLE_CELL,drawPeopleAtlas,peopleUv,stylesOf,styleIndex} from './xmas-people-art.js?v=2.21.1-xmas.16';
import {STAGE,stageActAt} from './xmas-market-data.mjs?v=2.21.1-xmas.16';

const FIG=178/192; // figurens höjd i cellen (vuxen): kortet är lite högre än personen
export function quadHeight(style){const s=PEOPLE_STYLES[style];return s.kind==='kid'?s.h/(.74*FIG):s.h/FIG;}
// Scenens artister för en akt: [{kind, dx (m från scenens framkant), dz}]
export function performersFor(act){
  if(!act)return [];
  if(act.act==='choir')return [-4.4,-2.2,0,2.2,4.4].map((dz,i)=>({kind:'choir',dx:2.2+(i%2)*.5,dz}));
  if(act.act==='band')return [{kind:'singer',dx:1.6,dz:0},{kind:'guitar',dx:2.6,dz:-3},{kind:'bass',dx:2.6,dz:3}];
  if(act.act==='tomte')return [{kind:'tomte',dx:2,dz:-.8},{kind:'tomtemor',dx:2,dz:.8}];
  return [];
}

export function createCrowdView(pc,host,{root,texture},{lite=()=>0,dim=null}={}){
  const dev=host.app.graphicsDevice;
  const tex=texture(c=>drawPeopleAtlas(c),PEOPLE_ATLAS.w,PEOPLE_ATLAS.h);
  const mat=new pc.StandardMaterial();mat.name='Julmarknadens folk';mat.useLighting=false;mat.diffuse.set(0,0,0);mat.emissive.set(1,1,1);mat.emissiveMap=tex;mat.opacityMap=tex;mat.opacityMapChannel='a';
  mat.alphaTest=.18;mat.cull=pc.CULLFACE_NONE;mat.update();if(dim)dim.add(mat);
  const styles={walk:stylesOf('adult','bags','cup'),kid:stylesOf('kid'),slow:stylesOf('elder','stroller'),tree:styleIndex('tree'),staff:k=>Math.max(0,styleIndex(k))};
  const crowd=new Crowd({styles,count:CROWD.visitors});
  const MAX=CROWD.visitors+crowd.staff.length+12;
  const pos=new Float32Array(MAX*12),uv=new Float32Array(MAX*8),idx=new Uint16Array(MAX*6);
  for(let i=0;i<MAX;i++){const v=i*4;idx.set([v,v+1,v+2,v,v+2,v+3],i*6);}
  const mesh=new pc.Mesh(dev);mesh.clear(true,false,MAX*4,MAX*6);mesh.setPositions(pos);mesh.setUvs(0,uv);mesh.setIndices(idx);mesh.update(pc.PRIMITIVE_TRIANGLES,false);
  const mi=new pc.MeshInstance(mesh,mat);mi.cull=false;
  const ent=new pc.Entity('Julmarknadens folk');ent.addComponent('render',{meshInstances:[mi]});root.addChild(ent);
  let shown=0,lastLite=-1,hourAt=-1e9,act=null,stageCrew=[],t=0;
  const cam=new pc.Vec3(),hourNow=()=>{try{const s=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());const [h,m]=s.split(/[:.]/).map(Number);return h+m/60;}catch{const d=new Date();return d.getHours()+d.getMinutes()/60;}};
  function setAct(a){act=a;stageCrew=performersFor(a).map((p,i)=>({style:Math.max(0,styleIndex(p.kind)),x:STAGE.minx+p.dx,z:p.dz,y:STAGE.deck,phase:i*.37}));}
  setAct(stageActAt(hourNow()));
  function update(p,now,dt){
    const near=Math.abs(p.x)<160&&p.z>-130&&p.z<120;
    if(ent.enabled!==near)ent.enabled=near;if(!near)return;
    const L=lite();if(L!==lastLite){lastLite=L;crowd.setCount(L>=2?Math.round(CROWD.visitors*.3):L===1?Math.round(CROWD.visitors*.6):CROWD.visitors);}
    if(now-hourAt>30000){hourAt=now;setAct(stageActAt(hourNow()));}
    t+=dt;crowd.step(Math.min(dt,.1),{x:p.x,z:p.z});
    cam.copy(host.camera.getPosition());
    const fwdX=-Math.sin(0),people=crowd.people();let n=0;
    // kamerans högerriktning (för spegling)
    const cf=host.camera.forward,rx=-cf.z,rz=cf.x,rl=Math.hypot(rx,rz)||1;
    const put=(x,y,z,style,frame,mirror)=>{
      if(n>=MAX)return;
      const dx=cam.x-x,dz=cam.z-z,d=Math.hypot(dx,dz);if(d>110)return;
      const h=quadHeight(style),w=h*PEOPLE_CELL.w/PEOPLE_CELL.h,ax=d>1e-3?-dz/d:1,az=d>1e-3?dx/d:0,hw=w/2,o=n*12;
      pos.set([x-ax*hw,y,z-az*hw, x+ax*hw,y,z+az*hw, x+ax*hw,y+h,z+az*hw, x-ax*hw,y+h,z-az*hw],o);
      const [u0,v0,u1,v1]=peopleUv(style,frame),a=mirror?u1:u0,b=mirror?u0:u1;
      uv.set([a,v0,b,v0,b,v1,a,v1],n*8);n++;
    };
    for(const q of people){const m=q.moving&&((q.face.x*rx+q.face.z*rz)/rl<0);put(q.x,q.y,q.z,q.style,q.frame,m);}
    for(const s of stageCrew)put(s.x,s.y,s.z,s.style,Math.floor(t*2.2+s.phase*3)%2,false);
    for(let i=n;i<shown;i++)pos.fill(0,i*12,i*12+12);
    shown=n;mesh.setPositions(pos);mesh.setUvs(0,uv);mesh.update(pc.PRIMITIVE_TRIANGLES,false);
  }
  return {update,crowd,material:mat,entity:ent,snapshot:()=>({shown,act:act?act.title:null,performers:stageCrew.length,...crowd.snapshot()}),setAct};
}
