import {CITY_STREETS,IDENTITY_IDS} from './city-geography.mjs?v=2.19.0';
import {visualTwinProfile,visualTwinFront,visualTwinGroundMode} from './visual-twin.mjs?v=2.19.0';

// High-impact city pass: richer ground floors, corner identity and two focal public spaces.
// Everything is static vertex geometry: no new lights, shadows, entities or per-frame work.

const TORGET={minx:-118,maxx:142,minz:-112,maxz:112};
const OPERA_ID=75896103;
const SHOPPING_STREETS=new Set(['DROTTNINGGATAN','KUNGSGATAN','VÄSTRA TORGGATAN','ÖSTRA TORGGATAN','TINGVALLAGATAN','JÄRNVÄGSGATAN']);
const key=s=>String(s||'').trim().toLocaleUpperCase('sv-SE');

function nearestTargets(b){
  const byName=new Map();
  for(const street of CITY_STREETS){
    for(let i=1;i<street.points.length;i++){
      const [x,z]=street.points[i-1],[ex,ez]=street.points[i],dx=ex-x,dz=ez-z,den=dx*dx+dz*dz||1;
      const t=Math.max(0,Math.min(1,((b.cx-x)*dx+(b.cz-z)*dz)/den)),qx=x+t*dx,qz=z+t*dz,d2=(b.cx-qx)**2+(b.cz-qz)**2;
      const k=key(street.name),old=byName.get(k);
      if(!old||d2<old.d2)byName.set(k,{street,qx,qz,d2});
    }
  }
  return [...byName.values()].sort((a,b)=>a.d2-b.d2);
}
function edgeForTarget(b,target){
  if(!target||!Array.isArray(b.polygon)||b.polygon.length<3)return null;
  const vx=target.qx-b.cx,vz=target.qz-b.cz,l=Math.hypot(vx,vz)||1,desired=[vx/l,vz/l],candidates=[];
  let area=0;for(let i=0;i<b.polygon.length;i++){const a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length];area+=a[0]*q[1]-q[0]*a[1];}
  const ccw=area>0;
  for(let i=0;i<b.polygon.length;i++){
    let a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);if(length<4.0)continue;
    let tx=dx/length,tz=dz/length,nx=ccw?tz:-tz,nz=ccw?-tx:tx;
    if(nx*desired[0]+nz*desired[1]<0){[a,q]=[q,a];tx=-tx;tz=-tz;nx=-nx;nz=-nz;}
    const mx=(a[0]+q[0])/2,mz=(a[1]+q[1])/2,streetD=Math.hypot(mx-target.qx,mz-target.qz),facing=nx*desired[0]+nz*desired[1];
    if(facing>.28)candidates.push({a,q,length,tx,tz,nx,nz,street:target.street.name,streetD,facing});
  }
  return candidates.sort((a,b)=>a.streetD-b.streetD||b.facing-a.facing||b.length-a.length)[0]||null;
}
export function visualTwinCornerFront(b){
  if(!b||IDENTITY_IDS.has(b.osm)||!visualTwinProfile(b))return null;
  const primary=visualTwinFront(b);if(!primary)return null;
  const targets=nearestTargets(b);
  const ptarget=targets.find(t=>key(t.street.name)===key(primary.street))||targets[0];if(!ptarget)return null;
  const pv=[ptarget.qx-b.cx,ptarget.qz-b.cz],pl=Math.hypot(...pv)||1;
  for(const t of targets){
    if(key(t.street.name)===key(primary.street)||t.d2>34*34)continue;
    const v=[t.qx-b.cx,t.qz-b.cz],vl=Math.hypot(...v)||1,dot=Math.abs((pv[0]*v[0]+pv[1]*v[1])/(pl*vl));
    if(dot>.72)continue;
    const e=edgeForTarget(b,t);if(!e)continue;
    const same=Math.hypot(e.a[0]-primary.a[0],e.a[1]-primary.a[1])<.8&&Math.hypot(e.q[0]-primary.q[0],e.q[1]-primary.q[1])<.8;
    if(!same)return e;
  }
  return null;
}
function panel(mesh,e,u,y,w,h,colour,out=.22){
  if(!e||w<=.06||h<=.06)return;
  const p=(along,yy,o)=>[e.a[0]+e.tx*along+e.nx*o,yy,e.a[1]+e.tz*along+e.nz*o];
  mesh.quad(p(u,y,out),p(u+w,y,out),p(u+w,y+h,out),p(u,y+h,out),colour);
}
function bladeSign(mesh,e,u,colour){
  const y0=2.36,y1=3.38,depth=.86,half=.12;
  const bx=e.a[0]+e.tx*u,bz=e.a[1]+e.tz*u;
  const a=[bx-e.tx*half+e.nx*.34,y0,bz-e.tz*half+e.nz*.34],b=[bx+e.tx*half+e.nx*.34,y0,bz+e.tz*half+e.nz*.34];
  const c=[bx+e.tx*half+e.nx*(.34+depth),y1,bz+e.tz*half+e.nz*(.34+depth)],d=[bx-e.tx*half+e.nx*(.34+depth),y1,bz-e.tz*half+e.nz*(.34+depth)];
  mesh.quad(a,b,c,d,colour);mesh.quad(d,c,b,a,colour);
}
function richGround(mesh,b,e,p,{secondary=false}={}){
  const len=e.length,variant=p.variant||0,square=b.cx>TORGET.minx&&b.cx<TORGET.maxx&&b.cz>TORGET.minz&&b.cz<TORGET.maxz;
  const shopping=SHOPPING_STREETS.has(key(e.street)),mode=visualTwinGroundMode(b);
  const bays=Math.max(2,Math.min(9,Math.round(len/(secondary?4.1:(mode==='residential'?4.3:3.45))))),bw=len/bays;
  // Keep the wow layer consistent with the underlying Visual Twin ground-floor DNA.
  panel(mesh,e,.10,.43,Math.max(.3,len-.20),.10,(mode==='heritage'||mode==='residential')?'#aaa493':p.frame,.25);

  if((mode==='residential'||mode==='heritage')&&!shopping){
    const door=Math.max(0,Math.min(bays-1,(variant+1)%bays));
    for(let i=0;i<bays;i++){
      const u=i*bw+.16,w=Math.max(.34,bw-.32);
      if(i===door){
        const dw=Math.min(.90,w*.72),du=u+(w-dw)/2;
        panel(mesh,e,du-.06,.54,dw+.12,2.04,p.frame,.29);
        panel(mesh,e,du,.63,dw,1.86,'#354548',.32);
      }else{
        panel(mesh,e,u,.72,w,1.52,p.frame,.27);
        panel(mesh,e,u+.08,.80,Math.max(.20,w-.16),1.35,p.glass,.31);
      }
    }
    panel(mesh,e,.12,2.73,Math.max(.3,len-.24),.18,mode==='heritage'?p.frame:p.accent,.29);
  }else if(mode==='office'&&!shopping){
    for(let i=0;i<bays;i++){
      const u=i*bw+.10,w=Math.max(.35,bw-.20);
      panel(mesh,e,u,.59,w,2.02,'#34474b',.27);
      panel(mesh,e,u+.08,.69,Math.max(.20,w-.16),1.82,p.glass,.31);
      if(i%2===0)panel(mesh,e,u+w*.47,.69,.06,1.82,p.frame,.33);
    }
    panel(mesh,e,.12,2.68,Math.max(.3,len-.24),.16,p.frame,.30);
  }else{
    panel(mesh,e,.08,2.76,Math.max(.3,len-.16),.31,square?'#f2d59a':p.accent,.29);
    for(let i=0;i<bays;i++){
      const u=i*bw+.13,w=Math.max(.35,bw-.26),door=i===((variant+1)%bays),solid=mode==='mixed'&&((i+variant)%4===0);
      if(door){
        const dw=Math.max(.34,Math.min(.92,w*.58)),du=u+(w-dw)/2;
        panel(mesh,e,du-.07,.55,dw+.14,2.15,p.frame,.31);
        panel(mesh,e,du,.64,dw,1.95,'#263b40',.34);
        panel(mesh,e,du+dw*.12,.79,dw*.76,1.50,'#789b9b',.36);
      }else if(solid){
        panel(mesh,e,u,.60,w,1.96,p.wall,.27);
        panel(mesh,e,u+.15,.90,Math.max(.18,w-.30),1.20,p.glass,.31);
      }else{
        panel(mesh,e,u,.62,w,1.96,p.glass,.27);
        panel(mesh,e,u+.07,.70,Math.max(.20,w*.46),1.75,'#73979a',.30);
        if((i+variant)%2===0)panel(mesh,e,u+w*.55,.70,Math.max(.16,w*.34),1.75,'#405f66',.30);
      }
      if(!secondary&&(i+variant)%3===0)panel(mesh,e,u+w*.22,2.29,Math.max(.10,w*.54),.12,'#f3c96e',.35);
    }
  }
  if(shopping&&!secondary){
    // City-centre shopping streets get much denser first-floor identity without extra entities.
    panel(mesh,e,.16,3.18,Math.max(.3,len-.32),.11,'#f3e2bc',.30);
    for(let i=0;i<bays;i+=2){
      const u=i*bw+.18,w=Math.min(len-u-.18,bw*1.25);
      if(w>.45)panel(mesh,e,u,2.54,w,.16,(i+variant)%4===0?'#bc704b':(i+variant)%3===0?'#355f66':p.accent,.43);
    }
    if(len>9.5){const bladeU=Math.max(1.0,Math.min(len-1.0,bw*(1+(variant%Math.max(1,bays-1)))));bladeSign(mesh,e,bladeU,(variant%2)?p.accent:'#d4a24f');}
  }
  if(square&&!secondary){
    // Torget gets a stronger awning rhythm and cream shop headers along its edges.
    for(let i=0;i<bays;i+=2){const u=i*bw+.15,w=Math.min(len-u-.15,bw*1.55);if(w>.5)panel(mesh,e,u,2.57,w,.18,(i+variant)%4?'#8f4c48':'#315f58',.42);}
  }
}
export function addStreetfrontWow(mesh,b){
  if(!b||IDENTITY_IDS.has(b.osm))return {front:false,corner:false,square:false,shopping:false};
  const p=visualTwinProfile(b),front=visualTwinFront(b);if(!p||!front)return {front:false,corner:false,square:false,shopping:false};
  richGround(mesh,b,front,p);
  const corner=visualTwinCornerFront(b);
  if(corner){
    richGround(mesh,b,corner,p,{secondary:true});
    // Strong corner marker: readable at a distance and cheap enough to batch.
    panel(mesh,corner,.10,.62,Math.min(.55,corner.length*.12),3.18,p.accent,.34);
    if(corner.length>8)bladeSign(mesh,corner,Math.min(1.15,corner.length*.22),(p.variant%2)?'#d3a14e':p.accent);
  }
  const square=b.cx>TORGET.minx&&b.cx<TORGET.maxx&&b.cz>TORGET.minz&&b.cz<TORGET.maxz;
  return {front:true,corner:!!corner,square,shopping:SHOPPING_STREETS.has(key(front.street))};
}
function addTorgetFurniture(mesh){
  // Low static furniture along the edges; the centre remains open for gameplay and events.
  let n=0;
  for(const z of [-23,27])for(const x of [-45,-22,1,24,47]){
    if(Math.abs(x)<8&&z<0)continue;
    mesh.box(x,.31,z,2.25,.62,.72,'#6d6250','#544b3d');
    mesh.box(x,.82,z,1.82,.40,.52,(x+z)%2?'#5b865c':'#6d8f59');n++;
  }
  for(const [x,z,yaw] of [[-51,-11,0],[-51,13,0],[57,-11,0],[57,13,0],[-29,31,90],[29,31,90]]){
    if(yaw===0){mesh.box(x,.46,z,.55,.14,2.75,'#2b4142');mesh.box(x,.82,z-.27,.20,.72,2.75,'#2b4142');}
    else{mesh.box(x,.46,z,2.75,.14,.55,'#2b4142');mesh.box(x-.27,.82,z,2.75,.72,.20,'#2b4142');}
    n++;
  }
  return n;
}
function addOperaScene(mesh,buildings){
  const b=buildings.find(x=>x.osm===OPERA_ID);if(!b)return 0;
  // East/front threshold, dark marquee and a line of compact theatre bollards.
  const depth=Math.max(10,Math.min(20,b.sz*.52)),frontX=b.maxx+.7;
  mesh.box(frontX+.55,.055,b.cz,1.2,.08,depth,'#c8baa0');
  mesh.box(frontX+.92,3.15,b.cz,1.35,.20,Math.min(13,depth*.72),'#252d31');
  mesh.box(frontX+1.05,2.92,b.cz,1.42,.22,Math.min(8.8,depth*.48),'#d5aa54');
  let n=3;
  for(let z=b.cz-depth*.42;z<=b.cz+depth*.42;z+=3.2){
    mesh.box(frontX+2.3,.54,z,.18,1.08,.18,'#303c3e');
    mesh.box(frontX+2.3,1.12,z,.27,.10,.27,'#e8c97d');n++;
  }
  return n;
}
export function addCityWowPass(mesh,buildings=[]){
  let fronts=0,corners=0,squareEdges=0,shoppingFronts=0;
  for(const b of buildings){
    if(b.dist>225)continue;
    const s=addStreetfrontWow(mesh,b);fronts+=Number(s.front);corners+=Number(s.corner);squareEdges+=Number(s.square&&s.front);shoppingFronts+=Number(!!s.shopping);
  }
  const torgetProps=addTorgetFurniture(mesh),operaProps=addOperaScene(mesh,buildings);
  return Object.freeze({fronts,corners,squareEdges,shoppingFronts,torgetProps,operaProps});
}
