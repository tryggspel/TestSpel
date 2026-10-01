import {IDENTITY_IDS,SHOP_IDS} from './city-geography.mjs?v=2.8.0';
import {MALL_CORRIDORS} from './mall-space.mjs?v=2.8.0';
const ink='#253d40',cream='#fff0c8';
const palettes=[['#eeb985','#d88c67','#ae4e45'],['#a7c7b4','#789e91','#367c75'],['#dec5a0','#b29a7e','#70568a'],['#c4b6d7','#9886b7','#a85159']];
const shops=[['PÅTÅR & PANIK','ÖPPET TILLS VIDARE'],['KARLSTAD LEVER','KAFFE • KULTUR • KAOS'],['HERR GÅRMAN','GÅ. GÄRNA FORT.'],['DEN SISTA BULLEN','EN PER ÖVERLEVANDE']];
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
  box(14,587,612,181,ink,0);box(22,626,271,135,'#487e82',3);box(349,626,269,135,'#3a696d',3);box(297,626,48,142,'#303c3c',3);box(305,637,31,74,'#b9cbb0',2);box(331,722,5,12,cream,0);
  // Illustrated shop displays: lamp, cups, pastry, plant, hand-lettered humour.
  for(const x of [82,403]){c.strokeStyle=ink;c.lineWidth=4;c.beginPath();c.moveTo(x,625);c.lineTo(x,649);c.stroke();c.fillStyle='#f5d28d';c.beginPath();c.moveTo(x-22,665);c.lineTo(x,644);c.lineTo(x+22,665);c.fill();box(x-25,713,117,8,'#e1b98b',3);for(let j=0;j<3;j++){box(x-10+j*32,690,20,21,cream,2);c.strokeStyle=cream;c.lineWidth=4;c.strokeRect(x+10+j*32,695,7,9);}}
  c.save();c.translate(520,690);c.rotate(-.07);box(-44,-27,91,58,'#ffe4a4',3);c.fillStyle=ink;c.textAlign='center';c.font='900 15px sans-serif';c.fillText('INGEN',0,-4);c.fillText('ÅTERBÄRING',0,17,83);c.restore();
  box(12,548,616,52,accent,4);c.fillStyle=cream;c.font='900 29px sans-serif';c.textAlign='center';c.fillText(shops[variant%4][0],320,585,570);
  for(let i=0;i<14;i++){box(12+i*44,601,44,25,i%2?cream:accent,1);c.fillStyle=i%2?cream:accent;c.beginPath();c.arc(34+i*44,626,22,0,Math.PI);c.fill();c.strokeStyle=ink;c.lineWidth=2;c.stroke();}
  box(29,743,248,18,cream,1);c.fillStyle=ink;c.font='900 10px sans-serif';c.fillText(shops[variant%4][1],153,756,237);
  box(0,758,640,10,ink,0);
  if(upperOnly)c.clearRect(0,548,640,220); // Real businesses supply their own ground-floor artwork and logo.
  c.restore();
}
// Full-width modules keep windows at a readable scale even on long OSM blocks.
// Four baked textures, spatial batches, no per-window entities or frame-time canvas work.
export function facadePanels(buildings,blocked=()=>false){
  const panels=[];
  for(const b of buildings){
    if(b.height<5||IDENTITY_IDS.has(b.osm)||b.osm===234271401)continue;
    const cx=(b.minx+b.maxx)/2,cz=(b.minz+b.maxz)/2,h=b.height-.08;
    const faces=[{x:cx,z:b.minz-.25,yaw:180,w:b.maxx-b.minx},{x:cx,z:b.maxz+.25,yaw:0,w:b.maxx-b.minx},{x:b.minx-.25,z:cz,yaw:-90,w:b.maxz-b.minz},{x:b.maxx+.25,z:cz,yaw:90,w:b.maxz-b.minz}];
    for(const face of faces){
      const a=face.yaw*Math.PI/180,tx=Math.cos(a),tz=-Math.sin(a),nx=Math.sin(a),nz=Math.cos(a);
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
          const a=((alongX?cut.minx:cut.minz)-origin)/sign,b=((alongX?cut.maxx:cut.maxz)-origin)/sign,lo=Math.min(a,b),hi=Math.max(a,b),next=[];
          for(const q of parts){const l=Math.max(q.lo,lo),r=Math.min(q.hi,hi);if(r<=l||q.y>=3.4){next.push(q);continue;}
            if(q.lo<l)next.push({...q,hi:l});if(r<q.hi)next.push({...q,lo:r});next.push({...q,lo:l,hi:r,y:3.4});}
          parts=next;
        }
        for(const q of parts)if(q.top>q.y)panels.push({osm:b.osm,x,z,tx,tz,nx,nz,w,h,...q,variant:Math.abs(b.osm)%4});
      }
    }
  }
  return panels;
}
export function createComicCity(pc,host,{texture}){
  const textures=Array.from({length:4},(_,i)=>texture((c,w,h)=>drawComicFacade(c,w,h,i),1024,1024));
  const materials=textures.map(t=>{t.anisotropy=Math.min(4,host.app.graphicsDevice.maxAnisotropy||1);const m=new pc.StandardMaterial();m.useLighting=false;m.diffuse.set(0,0,0);m.emissive.set(1,1,1);m.emissiveMap=t;m.update();return m;});
  const panels=facadePanels(host.colliders,host.blocked),groups=new Map();
  for(const p of panels){
    const key=p.variant+':'+Math.floor(p.x/160)+':'+Math.floor(p.z/160);
    if(!groups.has(key))groups.set(key,{positions:[],normals:[],uv:[],indices:[],variant:p.variant,minx:Infinity,maxx:-Infinity,minz:Infinity,maxz:-Infinity});
    const g=groups.get(key),k=g.positions.length/3;
    for(const [t,y] of [[p.lo,p.y],[p.hi,p.y],[p.hi,p.top],[p.lo,p.top]]){
      const x=p.x+p.tx*t,z=p.z+p.tz*t;g.positions.push(x,y,z);g.normals.push(p.nx,0,p.nz);g.uv.push(t/p.w+.5,y/p.h);
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
