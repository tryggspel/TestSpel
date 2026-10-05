import {KUNGSGATAN_PROFILES} from './kungsgatan-reference.mjs?v=2.11.24';
import {INNERSTAD_PROFILES,referenceFaceYaw} from './innerstad-reference.mjs?v=2.11.24';
import {visualTwinFaceYaw} from './visual-twin.mjs?v=2.11.24';
import {PHOTO_REFERENCE_PROFILES,photoReferenceFaceYaw,photoReferenceFaceYaws} from './photo-reference-pass3.mjs?v=2.11.24';
import {IDENTITY_IDS,SHOP_IDS,LANDMARKS} from './city-geography.mjs?v=2.11.24';
import {MALL_CORRIDORS} from './mall-space.mjs?v=2.11.24';
import {TORGET_AUDIT_IDS} from './city-architecture.js?v=2.11.24';
const ink='#253d40',cream='#fff0c8';
const palettes=[['#eeb985','#d88c67','#ae4e45'],['#a7c7b4','#789e91','#367c75'],['#dec5a0','#b29a7e','#70568a'],['#c4b6d7','#9886b7','#a85159']];
// 2.11.21: fallback panels stay enabled only on unclaimed/secondary walls; curated reference fronts keep ownership.
export const LEGACY_COMIC_FACADES=true;
export function drawComicFacade(c,w,h,variant=0,upperOnly=false){
  c.save();c.scale(w/640,h/768);c.lineJoin='round';const [wall,shade,accent]=palettes[variant%4];
  const box=(x,y,w,h,fill,line=3)=>{c.fillStyle=fill;c.fillRect(x,y,w,h);if(line){c.strokeStyle=ink;c.lineWidth=line;c.strokeRect(x,y,w,h);}};
  box(0,0,640,768,wall,0);box(0,0,640,20,ink,0);box(0,23,640,14,cream,0);box(0,40,640,19,shade,0);
  // Ink hatch shadows and dotted print texture, baked into four shared textures.
  c.fillStyle=shade;for(let x=15;x<640;x+=22)for(let y=65;y<610;y+=25)c.fillRect(x+(y%2)*6,y,2,2);
  box(0,60,25,545,shade,0);box(615,60,25,545,shade,0);
  for(const y of [211,381,551]){box(15,y+6,610,12,shade,0);box(12,y,616,6,cream,0);}
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
    const x=46+col*147,y=70+row*170;box(x+9,y+13,103,127,shade,0);box(x-7,y-6,111,133,cream,3);box(x,y,97,116,'#385e6a',5);
    c.save();c.beginPath();c.rect(x+3,y+3,91,110);c.clip();c.fillStyle='#a4d5cf';c.beginPath();c.moveTo(x,y+12);c.lineTo(x+83,y);c.lineTo(x+7,y+104);c.lineTo(x,y+104);c.fill();c.fillStyle='#c6dfcf55';c.beginPath();c.moveTo(x+74,y);c.lineTo(x+94,y);c.lineTo(x+39,y+117);c.lineTo(x+20,y+117);c.fill();c.restore();
    box(x+44,y,8,117,cream,2);box(x,y+48,97,7,cream,2);box(x-12,y+123,121,10,ink,0);box(x-14,y+118,123,9,cream,2);
    if((row+col+variant)%3===0){box(x+6,y+106,85,18,accent,3);c.fillStyle='#357665';for(let leaf=0;leaf<6;leaf++){c.beginPath();c.ellipse(x+15+leaf*13,y+100-(leaf%2)*7,10,12,leaf*.5,0,Math.PI*2);c.fill();}c.fillStyle='#ffe0aa';for(let j=0;j<3;j++){c.beginPath();c.arc(x+20+j*26,y+92,5,0,Math.PI*2);c.fill();}}
  }
  // Four different unbranded ground-floor types share the same texture budget.
  // Real businesses are layered on top by city-identity.js.
  const ground=variant%4;box(14,587,612,181,ink,0);
  if(ground===0){
    // Traditional city-centre retail: two large display bays, central recessed door, striped awning.
    box(22,626,271,135,'#487e82',3);box(349,626,269,135,'#3a696d',3);box(297,626,48,142,'#303c3c',3);box(305,637,31,74,'#b9cbb0',2);box(331,722,5,12,cream,0);
    for(const x of [82,403]){c.strokeStyle=ink;c.lineWidth=4;c.beginPath();c.moveTo(x,625);c.lineTo(x,649);c.stroke();c.fillStyle='#f5d28d';c.beginPath();c.moveTo(x-22,665);c.lineTo(x,644);c.lineTo(x+22,665);c.fill();box(x-25,713,117,8,'#e1b98b',3);for(let j=0;j<3;j++){box(x-10+j*32,690,20,21,cream,2);c.strokeStyle=cream;c.lineWidth=4;c.strokeRect(x+10+j*32,695,7,9);}}
    box(12,548,616,52,accent,4);for(let i=0;i<14;i++){box(12+i*44,601,44,25,i%2?cream:accent,1);c.fillStyle=i%2?cream:accent;c.beginPath();c.arc(34+i*44,626,22,0,Math.PI);c.fill();c.strokeStyle=ink;c.lineWidth=2;c.stroke();}
  }else if(ground===1){
    // Cafe / restaurant: three warm glazed bays, side entrance and visible table rhythm.
    box(20,617,600,144,'#355e62',3);for(const x of [34,211,388])box(x,632,150,111,'#629396',3);box(550,621,52,137,'#2f3e3e',3);box(559,637,34,76,'#b8c9ae',2);
    c.fillStyle='#efc66f';for(const x of [88,265,442]){c.beginPath();c.arc(x,653,10,0,Math.PI*2);c.fill();box(x-34,704,68,7,'#d6b07f',2);box(x-3,708,6,31,ink,0);}
    box(12,553,616,47,accent,4);for(let x=20;x<626;x+=72){c.fillStyle=(x/72)%2?cream:accent;c.beginPath();c.moveTo(x,600);c.lineTo(x+36,600);c.lineTo(x+26,620);c.lineTo(x+10,620);c.closePath();c.fill();}
  }else if(ground===2){
    // Office / service frontage: calmer stone base, broad glazing and a clear lobby.
    box(19,607,602,154,'#415f62',3);box(32,622,210,118,'#759fa0',3);box(250,622,210,118,'#759fa0',3);box(468,612,132,146,'#2d3b3d',3);box(492,632,84,99,'#9ab8ad',2);
    for(const y of [656,690]){box(52,y,166,7,'#d7cba8',0);box(270,y,166,7,'#d7cba8',0);}box(12,553,616,45,shade,4);box(430,562,158,25,accent,2);
  }else{
    // Small-shop row: three narrower units with separate doors and window displays.
    const bays=[[22,188,'#4b7c80'],[224,188,'#426e73'],[426,192,'#355e65']];
    for(const [x,bw,col] of bays){box(x,617,bw,143,col,3);box(x+14,632,bw-72,106,'#79a6a7',2);box(x+bw-48,626,35,129,'#2d3a3c',2);box(x+bw-41,644,22,68,'#aebfa8',1);}
    for(const x of [63,265,467]){box(x,696,76,8,'#d8b17d',2);for(let j=0;j<2;j++)box(x+8+j*31,674,22,20,cream,2);}
    box(12,553,616,45,accent,4);for(let x=18;x<626;x+=102)box(x,560,82,27,ground%2?shade:cream,2);
  }
  // Small generic open/welcome card only; never invent a chain name.
  c.save();c.translate(520,690);c.rotate(-.04);box(-44,-27,91,58,'#ffe4a4',3);c.fillStyle=ink;c.textAlign='center';c.font='900 13px sans-serif';c.fillText('ÖPPET',0,-2);c.fillText('VÄLKOMMEN',0,17,83);c.restore();
  box(29,743,248,18,cream,1);box(0,758,640,10,ink,0);
  if(upperOnly)c.clearRect(0,548,640,220); // Real businesses supply their own ground-floor artwork and logo.
  c.restore();
}
// Full-width modules keep windows at a readable scale even on long OSM blocks.
// Four baked textures, spatial batches, no per-window entities or frame-time canvas work.
const CARDINAL_YAW=Object.freeze({south:0,east:90,north:180,west:-90});
const angleDiff=(a,b)=>Math.abs((((a-b)+540)%360)-180);
const sameDirection=(a,b,tolerance=34)=>Number.isFinite(a)&&Number.isFinite(b)&&angleDiff(a,b)<=tolerance;
const identityFrontYaw=osm=>{
  const mark=LANDMARKS.find(x=>x.osm===osm);
  return mark?CARDINAL_YAW[mark.front]??null:null;
};
const identityCanUseFallback=b=>{
  if(!IDENTITY_IDS.has(b.osm))return true;
  const t=b.tags||{},mark=LANDMARKS.find(x=>x.osm===b.osm);
  // Landmarks are opt-in, not opt-out: only broad commercial/public boxes that benefit
  // from secondary facade rhythm may use this fallback. Historic/iconic silhouettes stay
  // entirely hand-built even if an auxiliary OSM source has sparse tags.
  return ['hotel','retail','civic'].includes(String(t.building||''))||mark?.id==='duvan';
};
function polygonFacadeFaces(b){
  const poly=Array.isArray(b.polygon)?b.polygon:null;
  if(!poly||poly.length<3){
    const cx=(b.minx+b.maxx)/2,cz=(b.minz+b.maxz)/2;
    return [
      {x:cx,z:b.minz-.25,yaw:180,w:b.maxx-b.minx,tx:-1,tz:0,nx:0,nz:-1},
      {x:cx,z:b.maxz+.25,yaw:0,w:b.maxx-b.minx,tx:1,tz:0,nx:0,nz:1},
      {x:b.minx-.25,z:cz,yaw:-90,w:b.maxz-b.minz,tx:0,tz:1,nx:-1,nz:0},
      {x:b.maxx+.25,z:cz,yaw:90,w:b.maxz-b.minz,tx:0,tz:-1,nx:1,nz:0}
    ];
  }
  let area=0;
  for(let i=0;i<poly.length;i++){const a=poly[i],q=poly[(i+1)%poly.length];area+=a[0]*q[1]-q[0]*a[1];}
  const ccw=area>0,out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],q=poly[(i+1)%poly.length],dx=q[0]-a[0],dz=q[1]-a[1],w=Math.hypot(dx,dz);
    if(w<2)continue;
    const tx=dx/w,tz=dz/w,nx=ccw?tz:-tz,nz=ccw?-tx:tx;
    const x=(a[0]+q[0])/2,z=(a[1]+q[1])/2,yaw=Math.atan2(nx,nz)*180/Math.PI;
    out.push({x,z,yaw,w,tx,tz,nx,nz,a,q});
  }
  return out;
}

export function facadePanels(buildings,blocked=()=>false){
  const panels=[];
  if(!LEGACY_COMIC_FACADES)return panels;
  for(const b of buildings){
    if(b.height<5||!identityCanUseFallback(b))continue;
    // Torget audit facades draw all four sides themselves; legacy cards would z-fight/cover them.
    if(TORGET_AUDIT_IDS.has(b.osm))continue;
    const h=b.height-.08,faces=polygonFacadeFaces(b),markYaw=identityFrontYaw(b.osm);
    for(const face of faces){
      // Curated or hand-built primary fronts keep ownership; secondary/exposed sides
      // still receive fallback architecture so a whole block never becomes a blank plane.
      if(KUNGSGATAN_PROFILES[b.osm]&&sameDirection(face.yaw,0))continue;
      if(INNERSTAD_PROFILES[b.osm]&&sameDirection(face.yaw,referenceFaceYaw(b.osm)))continue;
      if(PHOTO_REFERENCE_PROFILES[b.osm]&&photoReferenceFaceYaws(b.osm).some(y=>sameDirection(face.yaw,y)))continue;
      if(!KUNGSGATAN_PROFILES[b.osm]&&!INNERSTAD_PROFILES[b.osm]&&!PHOTO_REFERENCE_PROFILES[b.osm]&&sameDirection(face.yaw,visualTwinFaceYaw(b)))continue;
      if(IDENTITY_IDS.has(b.osm)&&sameDirection(face.yaw,markYaw))continue;

      const {tx,tz,nx,nz}=face;
      // Test on the real polygon's exterior normal, not on an AABB side. This is the key
      // to keeping slanted/L-shaped OSM blocks from silently losing their facade layer.
      if(face.w<2||[-.35,0,.35].every(t=>blocked(face.x+tx*face.w*t+nx*1.2,face.z+tz*face.w*t+nz*1.2)))continue;

      const count=Math.max(1,Math.ceil(face.w/13)),w=face.w/count;
      for(let i=0;i<count;i++){
        const offset=-face.w/2+(i+.5)*w,x=face.x+tx*offset,z=face.z+tz*offset;
        let parts=[{lo:-w/2,hi:w/2,y:SHOP_IDS.has(b.osm)?5.4:.04,top:h}];
        // Do not paint over any of the real mall entrance passages.
        for(const cut of MALL_CORRIDORS){
          const alongX=Math.abs(tx)>.5,fixed=alongX?z:x;
          if(fixed<(alongX?cut.minz:cut.minx)-.6||fixed>(alongX?cut.maxz:cut.maxx)+.6)continue;
          const sign=alongX?tx:tz,origin=alongX?x:z;
          const aa=((alongX?cut.minx:cut.minz)-origin)/(sign||1e-9),bb=((alongX?cut.maxx:cut.maxz)-origin)/(sign||1e-9),lo=Math.min(aa,bb),hi=Math.max(aa,bb),next=[];
          for(const q of parts){
            const l=Math.max(q.lo,lo),r=Math.min(q.hi,hi);
            if(r<=l||q.y>=3.4){next.push(q);continue;}
            if(q.lo<l)next.push({...q,hi:l});
            if(r<q.hi)next.push({...q,lo:r});
            next.push({...q,lo:l,hi:r,y:3.4});
          }
          parts=next;
        }
        for(const q of parts)if(q.top>q.y)panels.push({osm:b.osm,x,z,tx,tz,nx,nz,w,h,...q,variant:Math.abs(b.osm)%4,edgeYaw:face.yaw});
      }
    }
  }
  return panels;
}

export const COMIC_FACE_BIAS=.16;
export function createComicCity(pc,host,{texture}){
  if(!LEGACY_COMIC_FACADES){
    const budget=Object.freeze({buildings:0,modules:0,staticBatches:0,textures:0,textureSize:0,mode:'real-reference-centre'});
    if(typeof window!=='undefined')window.KarlstadFacades=budget;
    return {update(){},budget};
  }
  const textures=Array.from({length:4},(_,i)=>texture((c,w,h)=>drawComicFacade(c,w,h,i),1024,1024));
  const materials=textures.map(t=>{t.anisotropy=Math.min(4,host.app.graphicsDevice.maxAnisotropy||1);const m=new pc.StandardMaterial();m.useLighting=false;m.diffuse.set(0,0,0);m.emissive.set(1,1,1);m.emissiveMap=t;m.update();return m;});
  const panels=facadePanels(host.colliders,host.blocked),groups=new Map();
  for(const p of panels){
    const key=p.variant+':'+Math.floor(p.x/160)+':'+Math.floor(p.z/160);
    if(!groups.has(key))groups.set(key,{positions:[],normals:[],uv:[],indices:[],variant:p.variant,minx:Infinity,maxx:-Infinity,minz:Infinity,maxz:-Infinity});
    const g=groups.get(key),k=g.positions.length/3;
    for(const [t,y] of [[p.lo,p.y],[p.hi,p.y],[p.hi,p.top],[p.lo,p.top]]){
      const x=p.x+p.tx*t+p.nx*COMIC_FACE_BIAS,z=p.z+p.tz*t+p.nz*COMIC_FACE_BIAS;g.positions.push(x,y,z);g.normals.push(p.nx,0,p.nz);g.uv.push(t/p.w+.5,y/p.h);
      g.minx=Math.min(g.minx,x);g.maxx=Math.max(g.maxx,x);g.minz=Math.min(g.minz,z);g.maxz=Math.max(g.maxz,z);
    }
    g.indices.push(k,k+1,k+2,k,k+2,k+3);
  }
  const views=[];
  for(const [key,g] of groups){
    const mesh=new pc.Mesh(host.app.graphicsDevice);mesh.setPositions(g.positions);mesh.setNormals(g.normals);mesh.setUvs(0,g.uv);mesh.setIndices(g.indices);mesh.update(pc.PRIMITIVE_TRIANGLES);
    const e=new pc.Entity('Karlstad · fönster, puts och butiksvåning '+key);e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,materials[g.variant])]});host.app.root.addChild(e);views.push({...g,e});
  }
  const budget={buildings:new Set(panels.map(p=>p.osm)).size,modules:panels.length,staticBatches:views.length,textures:4,textureSize:1024};
  if(typeof window!=='undefined')window.KarlstadFacades=Object.freeze(budget);
  return {update(p){for(const v of views){const dx=Math.max(v.minx-p.x,0,p.x-v.maxx),dz=Math.max(v.minz-p.z,0,p.z-v.maxz);v.e.enabled=dx*dx+dz*dz<145*145;}},count:views.length};
}
