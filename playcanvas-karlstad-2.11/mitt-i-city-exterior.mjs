// Mitt i City exterior (2.11.27), built from the user's reference photo of the block:
// dark slate-grey rendered walls with shuttered windows and balcony railings, a ground floor of wood-framed glazing,
// set-back top storeys in white render and yellow timber cladding, and a copper dome with a ball finial.
// Geometry only, drawn into a ComicMesh. The mall is made of axis-aligned boxes (the OSM footprints are cut by the
// four street entrances), so every face here follows those boxes and leaves the entrance corridors open.
import {MALL_BUILDING_IDS,MALL_CORRIDORS} from './mall-space.mjs?v=2.14.1';

export const MITT_I_CITY_DOME_OSM=107041955; // Västra Torggatan 7, the east entrance block facing Torget
const C=Object.freeze({
  slate:'#555b66',shutter:'#3b4048',slat:'#2d3137',frame:'#cfccc3',glass:'#2a3941',glassHi:'#4b6670',
  wood:'#b07b3c',woodDark:'#7f5429',plinth:'#3a3c41',shelf:'#2e3238',slab:'#3d4148',rail:'#23262b',
  white:'#ebe8df',yellow:'#d7a243',cap:'#8b8981',copper:'#6e6658',rib:'#5a5247',finial:'#43433e',drumGlass:'#33464d'
});
const FACES=Object.freeze([
  {key:'S',nx:0,nz:1,rx:1,rz:0},{key:'N',nx:0,nz:-1,rx:-1,rz:0},
  {key:'E',nx:1,nz:0,rx:0,rz:-1},{key:'W',nx:-1,nz:0,rx:0,rz:1}
]);
const hash=n=>Math.abs((n*2654435761)>>>0);
const inside=(x,z,b,m=0)=>x>b.minx-m&&x<b.maxx+m&&z>b.minz-m&&z<b.maxz+m;

// Faces of the mall boxes that look at the street (not at another mall box), with the u-ranges of the entrance
// corridors removed from the width they decorate.
export function mittICityFaces(buildings){
  const boxes=buildings.filter(b=>MALL_BUILDING_IDS.has(b.osm));
  const out=[];
  for(const b of boxes){
    for(const f of FACES){
      const alongX=f.key==='S'||f.key==='N';
      const width=alongX?b.maxx-b.minx:b.maxz-b.minz;
      const ox=f.key==='E'?b.maxx:f.key==='W'?b.minx:f.key==='S'||f.key==='N'?(f.key==='S'?b.minx:b.maxx):0;
      const oz=f.key==='S'?b.maxz:f.key==='N'?b.minz:f.key==='E'?b.maxz:b.minz;
      const at=u=>[ox+f.rx*u,oz+f.rz*u];
      // Keep only the stretches that face open air.
      let spans=[[0,width]];
      for(let u=0;u<=width;u+=.5){const [x,z]=at(u);if(boxes.some(o=>o!==b&&inside(x+f.nx*1.3,z+f.nz*1.3,o))){spans=spans.flatMap(([a,c])=>u>=a&&u<=c?[[a,Math.max(a,u-.5)],[Math.min(c,u+.5),c]]:[[a,c]]);}}
      // Remove entrance corridors (plus a margin) so the portals stay open and readable.
      const cuts=[];
      for(const k of MALL_CORRIDORS){
        const [x0,z0]=at(0),fixed=alongX?z0:x0;
        if(fixed<(alongX?k.minz:k.minx)-.7||fixed>(alongX?k.maxz:k.maxx)+.7)continue;
        const lo=alongX?k.minx:k.minz,hi=alongX?k.maxx:k.maxz,base=alongX?x0:z0,s=alongX?f.rx:f.rz;
        const a=(lo-base)/s,c=(hi-base)/s;cuts.push([Math.min(a,c)-.6,Math.max(a,c)+.6]);
      }
      for(const [ca,cb] of cuts)spans=spans.flatMap(([a,c])=>cb<=a||ca>=c?[[a,c]]:[[a,Math.max(a,ca)],[Math.min(c,cb),c]]);
      for(const [a,c] of spans)if(c-a>=2.4)out.push({osm:b.osm,h:b.h,f,ox,oz,u0:a,u1:c,width,b});
    }
  }
  return out;
}

export function addMittICityExterior(mesh,buildings){
  const faces=mittICityFaces(buildings);let quads=0;
  for(const F of faces){
    const {f,ox,oz,h}=F;
    const P=(u,y,o)=>[ox+f.rx*u+f.nx*o,y,oz+f.rz*u+f.nz*o];
    const panel=(u,y,w,ph,col,o)=>{if(w<=.04||ph<=.04)return;mesh.quad(P(u,y,o),P(u+w,y,o),P(u+w,y+ph,o),P(u,y+ph,o),col);quads++;};
    const len=F.u1-F.u0,bays=Math.max(1,Math.round(len/3)),bw=len/bays,seed=hash(F.osm+f.key.charCodeAt(0)*977);
    const floors=Math.max(1,Math.round((h-3.6)/3));
    // Ground floor: dark plinth, wood-framed glazing, shelf above.
    panel(F.u0,0,len,.5,C.plinth,.20);
    for(let i=0;i<bays;i++){
      const u=F.u0+i*bw;
      panel(u+.06,.5,bw-.12,2.8,C.wood,.21);
      panel(u+.28,.72,bw-.56,2.36,C.glass,.23);
      panel(u+.28,2.1,bw-.56,.9,C.glassHi,.235);
      panel(u+bw/2-.05,.72,.1,2.36,C.woodDark,.25);
    }
    panel(F.u0,3.3,len,.3,C.shelf,.22);
    // Upper storeys: slate render, shuttered windows, some balconies on the first floor.
    panel(F.u0,3.6,len,h-3.6,C.slate,.20);
    for(let r=0;r<floors;r++){
      const y0=3.6+r*((h-3.6)/floors),wh=1.75;
      for(let i=0;i<bays;i++){
        const u=F.u0+i*bw,cx=u+bw/2;
        panel(cx-.62,y0+.55,1.24,wh+.14,C.frame,.22);
        panel(cx-.52,y0+.62,1.04,wh,C.glass,.24);
        panel(cx-.04,y0+.62,.08,wh,C.frame,.25);
        for(const s of [-1,1]){
          const su=s<0?cx-1.2:cx+.64;
          panel(su,y0+.55,.56,wh+.14,C.shutter,.23);
          for(let k=1;k<=4;k++)panel(su+.04,y0+.55+k*(wh+.14)/5,.48,.045,C.slat,.24);
        }
        if(r===0&&(i+(seed&1))%2===0){
          const L=bw*.78,cu=cx,mx=ox+f.rx*cu+f.nx*.6,mz=oz+f.rz*cu+f.nz*.6,alongX=f.key==='S'||f.key==='N';
          mesh.box(mx,y0+.12,mz,alongX?L:1.0,.2,alongX?1.0:L,C.slab);quads+=6;
          const rx=ox+f.rx*cu+f.nx*1.08,rz=oz+f.rz*cu+f.nz*1.08;
          mesh.box(rx,y0+1.12,rz,alongX?L:.07,.07,alongX?.07:L,C.rail);quads+=6;
          for(let k=0;k<=4;k++){const pu=cu-L/2+k*L/4;mesh.box(ox+f.rx*pu+f.nx*1.08,y0+.62,oz+f.rz*pu+f.nz*1.08,.06,1.0,.06,C.rail);quads+=6;}
        }
      }
    }
    // Roofline.
    panel(F.u0,h-.28,len,.28,C.shelf,.26);
  }
  // Set-back top storeys: white render with yellow timber cladding, one volume per box.
  const boxes=buildings.filter(b=>MALL_BUILDING_IDS.has(b.osm));
  for(const b of boxes){
    const inset=Math.min(4.5,(b.maxx-b.minx)*.2,(b.maxz-b.minz)*.2),vh=3.3,x=(b.minx+b.maxx)/2,z=(b.minz+b.maxz)/2;
    const w=b.maxx-b.minx-inset*2,d=b.maxz-b.minz-inset*2;if(w<4||d<4)continue;
    mesh.box(x,b.h+vh/2,z,w,vh,d,C.white,C.white);
    mesh.box(x,b.h+vh+.1,z,w+.5,.2,d+.5,C.cap,C.cap);
    const seed=hash(b.osm);
    for(const f of FACES){
      const alongX=f.key==='S'||f.key==='N',span=alongX?w:d,cnt=Math.max(2,Math.round(span/3.2)),cw=span/cnt;
      for(let i=0;i<cnt;i++){
        const off=-span/2+(i+.5)*cw;
        const mx=alongX?x+f.rx*off:x+f.nx*(w/2+.03),mz=alongX?z+f.nz*(d/2+.03):z+f.rz*off;
        if(((seed>>i)+i)%2===0)mesh.box(mx,b.h+vh/2,mz,alongX?cw*.96:.05,vh*.96,alongX?.05:cw*.96,C.yellow,C.yellow);
        mesh.box(mx,b.h+vh*.55,mz,alongX?cw*.5:.07,1.5,alongX?.07:cw*.5,C.glass,C.glass);
      }
    }
  }
  const dome=boxes.find(b=>b.osm===MITT_I_CITY_DOME_OSM);
  if(dome)addDome(mesh,(dome.minx+dome.maxx)/2,dome.h+3.4+.2,(dome.minz+dome.maxz)/2);
  return {faces:faces.length,quads};
}

// Copper dome on a glazed drum, with a ball on top. Rings of quads, wound to face outward.
export function addDome(mesh,cx,y0,cz,R=4.4){
  const N=16,ring=(r,y,i)=>{const a=i/N*Math.PI*2;return [cx+Math.cos(a)*r,y,cz+Math.sin(a)*r];};
  const drumH=1.7;
  for(let i=0;i<N;i++){
    mesh.quad(ring(R,y0,i),ring(R,y0+drumH,i),ring(R,y0+drumH,i+1),ring(R,y0,i+1),i%2?C.drumGlass:C.wood); // drum: glass bays between timber posts
  }
  const rings=8,H=3.9,top=y0+drumH+.2;
  for(let k=0;k<rings;k++){
    const t0=k/rings*(Math.PI/2)*.94,t1=(k+1)/rings*(Math.PI/2)*.94;
    const r0=(R+.35)*Math.cos(t0),r1=(R+.35)*Math.cos(t1),yy0=top+H*Math.sin(t0),yy1=top+H*Math.sin(t1);
    for(let i=0;i<N;i++){
      mesh.quad(ring(r0,yy0,i),ring(r1,yy1,i),ring(r1,yy1,i+1),ring(r0,yy0,i+1),i%2?C.copper:C.rib);
    }
  }
  mesh.box(cx,top-.1,cz,(R+.5)*2,.25,(R+.5)*2,C.cap,C.cap);
  const bx=cx,by=top+H*.99+.35,bz=cz,br=.55;
  for(let k=0;k<4;k++){
    const t0=-Math.PI/2+k/4*Math.PI,t1=-Math.PI/2+(k+1)/4*Math.PI;
    for(let i=0;i<8;i++){
      const a0=i/8*Math.PI*2,a1=(i+1)/8*Math.PI*2,P=(t,a)=>[bx+Math.cos(t)*Math.cos(a)*br,by+Math.sin(t)*br,bz+Math.cos(t)*Math.sin(a)*br];
      mesh.quad(P(t0,a0),P(t1,a0),P(t1,a1),P(t0,a1),C.finial);
    }
  }
}
