import {KUNGSGATAN_PROFILES,addKungsgatanFacade} from './kungsgatan-reference.mjs?v=2.11.12';
import {INNERSTAD_PROFILES,INNERSTAD_REFERENCE_IDS,addInnerstadFacade,addInnerstadStreetFurniture} from './innerstad-reference.mjs?v=2.11.12';
import {CITY_STREETS,IDENTITY_IDS,STOREFRONTS,STREET_SIGNS,storefrontAnchor} from './city-geography.mjs?v=2.11.12';

import {SOUTH_IDS} from './city-south-space.mjs?v=2.11.12';
import {PEDESTRIAN_STREETS,PEDESTRIAN_SQUARE} from './pedestrian.mjs?v=2.11.12';
import {MALL_BUILDING_IDS} from './mall-space.mjs?v=2.11.12';

// Static, vertex-coloured geometry: one draw call per landmark, one for streets,
// one for rooflines and storefront frames. No lights, shadows or per-frame work.
const CORE_CONTOUR_RADIUS=195;
const CORE_CONTOUR_LIMIT=64;
const CORE_WALLS=['#e4d2ae','#d9b991','#c8906d','#e8ddc6','#bca98d','#d8c49c','#c8a17b','#eadab8'];
export function coreContourBuildings(buildings,max=CORE_CONTOUR_LIMIT){
  return buildings.filter(b=>b.dist<CORE_CONTOUR_RADIUS&&!IDENTITY_IDS.has(b.osm)&&!MALL_BUILDING_IDS.has(b.osm)).sort((a,b)=>a.dist-b.dist||a.osm-b.osm).slice(0,max);
}
const rgb=hex=>[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255,1];
const STREET_GLYPHS=Object.freeze({
  A:['01110','10001','10001','11111','10001','10001','10001'],
  B:['11110','10001','10001','11110','10001','10001','11110'],
  C:['01111','10000','10000','10000','10000','10000','01111'],
  D:['11110','10001','10001','10001','10001','10001','11110'],
  E:['11111','10000','10000','11110','10000','10000','11111'],
  F:['11111','10000','10000','11110','10000','10000','10000'],
  G:['01111','10000','10000','10111','10001','10001','01111'],
  H:['10001','10001','10001','11111','10001','10001','10001'],
  I:['11111','00100','00100','00100','00100','00100','11111'],
  J:['00111','00010','00010','00010','00010','10010','01100'],
  K:['10001','10010','10100','11000','10100','10010','10001'],
  L:['10000','10000','10000','10000','10000','10000','11111'],
  M:['10001','11011','10101','10101','10001','10001','10001'],
  N:['10001','11001','10101','10011','10001','10001','10001'],
  O:['01110','10001','10001','10001','10001','10001','01110'],
  P:['11110','10001','10001','11110','10000','10000','10000'],
  Q:['01110','10001','10001','10001','10101','10010','01101'],
  R:['11110','10001','10001','11110','10100','10010','10001'],
  S:['01111','10000','10000','01110','00001','00001','11110'],
  T:['11111','00100','00100','00100','00100','00100','00100'],
  U:['10001','10001','10001','10001','10001','10001','01110'],
  V:['10001','10001','10001','10001','01010','01010','00100'],
  W:['10001','10001','10001','10101','10101','11011','10001'],
  X:['10001','10001','01010','00100','01010','10001','10001'],
  Y:['10001','10001','01010','00100','00100','00100','00100'],
  Z:['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'],
  '1':['00100','01100','00100','00100','00100','00100','01110'],
  '2':['01110','10001','00001','00010','00100','01000','11111'],
  '3':['11110','00001','00001','01110','00001','00001','11110'],
  '4':['00010','00110','01010','10010','11111','00010','00010'],
  '5':['11111','10000','10000','11110','00001','00001','11110'],
  '6':['01110','10000','10000','11110','10001','10001','01110'],
  '7':['11111','00001','00010','00100','01000','01000','01000'],
  '8':['01110','10001','10001','01110','10001','10001','01110'],
  '9':['01110','10001','10001','01111','00001','00001','01110'],
  '-':['00000','00000','00000','11111','00000','00000','00000']
});
const signClamp=(v,a,b)=>a<=b?Math.max(a,Math.min(b,v)):(a+b)/2;
function pickStreetFacade(x,z,rotation,buildings){
  let best=null;
  for(const b of buildings){
    if(!Number.isFinite(b.minx)||!Number.isFinite(b.maxx)||!Number.isFinite(b.minz)||!Number.isFinite(b.maxz))continue;
    if(rotation===90){
      if(z<b.minz-6||z>b.maxz+6)continue;
      const along=z<b.minz?b.minz-z:z>b.maxz?z-b.maxz:0;
      for(const edge of [b.minx,b.maxx]){
        const edgeDist=Math.abs(x-edge);if(edgeDist>34)continue;
        const score=edgeDist+along*2.2;
        if(!best||score<best.score)best={b,score,out:x>=edge?1:-1,edge};
      }
    }else{
      if(x<b.minx-6||x>b.maxx+6)continue;
      const along=x<b.minx?b.minx-x:x>b.maxx?x-b.maxx:0;
      for(const edge of [b.minz,b.maxz]){
        const edgeDist=Math.abs(z-edge);if(edgeDist>34)continue;
        const score=edgeDist+along*2.2;
        if(!best||score<best.score)best={b,score,out:z>=edge?1:-1,edge};
      }
    }
  }
  return best;
}
function streetGlyph(ch){return STREET_GLYPHS[ch==='Ä'||ch==='Å'?'A':ch==='Ö'?'O':ch]||STREET_GLYPHS.E;}
function addStreetPixel(mesh,cx,cy,cz,tangent,normal,size,colour='#fff8de',depth=.066){
  const hw=size*.41,hh=size*.41,tx=tangent[0]*hw,tz=tangent[1]*hw,nx=normal[0]*depth,nz=normal[1]*depth;
  mesh.quad([cx+nx-tx,cy-hh,cz+nz-tz],[cx+nx+tx,cy-hh,cz+nz+tz],[cx+nx+tx,cy+hh,cz+nz+tz],[cx+nx-tx,cy+hh,cz+nz-tz],colour);
}
function addStreetNameSign(mesh,sign,buildings){
  const [sx,sz,label,rotation=0]=sign,face=pickStreetFacade(sx,sz,rotation,buildings);
  const widths=[...label].map(ch=>ch===' '?3:5),cells=widths.reduce((n,w,i)=>n+w+(i?1:0),0);
  const span=face?(rotation===90?face.b.maxz-face.b.minz:face.b.maxx-face.b.minx):5.2;
  const pixel=Math.max(.034,Math.min(.055,(Math.max(2.5,Math.min(5.15,span-.45))-.28)/cells));
  const boardW=Math.max(2.45,cells*pixel+.28),half=boardW/2;
  let x=sx,z=sz,out=face?.out||1;
  if(face){
    if(rotation===90){x=face.edge+out*.075;z=signClamp(sz,face.b.minz+half+.12,face.b.maxz-half-.12);}
    else{z=face.edge+out*.075;x=signClamp(sx,face.b.minx+half+.12,face.b.maxx-half-.12);}
  }else{
    mesh.box(x,1.45,z,.07,2.9,.07,'#29444a');
  }
  const normal=rotation===90?[out,0]:[0,out],tangent=rotation===90?[0,-out]:[out,0],y=2.78;
  if(rotation===90){
    mesh.box(x+normal[0]*.018,y,z,.095,.70,boardW+.14,'#efe4c8');
    mesh.box(x+normal[0]*.054,y,z,.105,.58,boardW,'#234d63');
  }else{
    mesh.box(x,y,z+normal[1]*.018,boardW+.14,.70,.095,'#efe4c8');
    mesh.box(x,y,z+normal[1]*.054,boardW,.58,.105,'#234d63');
  }
  let cursor=-cells*pixel/2;
  [...label].forEach((ch,i)=>{
    if(i)cursor+=pixel;
    if(ch===' '){cursor+=3*pixel;return;}
    const glyph=streetGlyph(ch);
    for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(glyph[row][col]==='1'){
      const along=cursor+(col+.5)*pixel,px=x+tangent[0]*along,pz=z+tangent[1]*along,py=y+(3-row)*pixel;
      addStreetPixel(mesh,px,py,pz,tangent,normal,pixel);
    }
    if(ch==='Ä'||ch==='Ö'){
      for(const d of [-1.2,1.2]){const along=cursor+(2+d)*pixel;addStreetPixel(mesh,x+tangent[0]*along,y+4.18*pixel,z+tangent[1]*along,tangent,normal,pixel*.72);}
    }else if(ch==='Å'){
      const along=cursor+2*pixel;addStreetPixel(mesh,x+tangent[0]*along,y+4.18*pixel,z+tangent[1]*along,tangent,normal,pixel*.78);
    }
    cursor+=5*pixel;
  });
}


function nearestStreetFacade(b,preferred=''){
  const wanted=String(preferred||'').trim().toLocaleLowerCase('sv-SE');
  let best=null;
  const scan=onlyPreferred=>{
    for(const street of CITY_STREETS){
      if(onlyPreferred&&street.name.toLocaleLowerCase('sv-SE')!==wanted)continue;
      for(let i=1;i<street.points.length;i++){
        const [x,z]=street.points[i-1],[ex,ez]=street.points[i],dx=ex-x,dz=ez-z,den=dx*dx+dz*dz||1;
        const t=Math.max(0,Math.min(1,((b.cx-x)*dx+(b.cz-z)*dz)/den)),qx=x+t*dx,qz=z+t*dz;
        const d2=(b.cx-qx)**2+(b.cz-qz)**2;
        if(!best||d2<best.d2)best={street,qx,qz,d2};
      }
    }
  };
  if(wanted)scan(true);
  if(!best)scan(false);
  if(!best||best.d2>70*70)return null;
  const dx=best.qx-b.cx,dz=best.qz-b.cz;
  if(Math.abs(dx)>Math.abs(dz)){
    const out=dx<0?-1:1;
    return {street:best.street.name,normal:[out,0],tangent:[0,-out],x:out<0?b.minx-.085:b.maxx+.085,z:Math.max(b.minz+.7,Math.min(b.maxz-.7,best.qz)),span:b.sz};
  }
  const out=dz<0?-1:1;
  return {street:best.street.name,normal:[0,out],tangent:[out,0],x:Math.max(b.minx+.7,Math.min(b.maxx-.7,best.qx)),z:out<0?b.minz-.085:b.maxz+.085,span:b.sx};
}
function addFlatSignQuad(mesh,cx,cy,cz,tangent,normal,w,h,offset,colour){
  const hw=w/2,hh=h/2,tx=tangent[0]*hw,tz=tangent[1]*hw,nx=normal[0]*offset,nz=normal[1]*offset;
  mesh.quad([cx+nx-tx,cy-hh,cz+nz-tz],[cx+nx+tx,cy-hh,cz+nz+tz],[cx+nx+tx,cy+hh,cz+nz+tz],[cx+nx-tx,cy+hh,cz+nz-tz],colour);
}
function addressText(b,face){
  const street=String(b.tags?.['addr:street']||face?.street||'').trim();
  const number=String(b.tags?.['addr:housenumber']||'').trim();
  const named=!!String(b.name||'').trim()||IDENTITY_IDS.has(b.osm)||SOUTH_IDS.has(b.osm);
  return (street+(!named&&number?' '+number:'')).toUpperCase().replace(/[^A-ZÅÄÖ0-9 -]/g,'').replace(/\s+/g,' ').trim();
}
function drawAddressPlate(mesh,b,face,label,x,z){
  const widths=[...label].map(ch=>ch===' '?3:5),cells=widths.reduce((n,w,i)=>n+w+(i?1:0),0);
  // Unified Karlstad wayfinding: same dark green / cream family as building-name signs.
  // Street plaques stay deliberately small so architecture and landmark names remain primary.
  const pixel=Math.max(.024,Math.min(.034,3.05/Math.max(1,cells)));
  const boardW=Math.max(2.10,Math.min(3.35,cells*pixel+.22)),boardH=Math.max(.36,7*pixel+.14);
  const y=2.34;
  addFlatSignQuad(mesh,x,y,z,face.tangent,face.normal,boardW+.09,boardH+.09,.075,'#f5e5bd');
  addFlatSignQuad(mesh,x,y,z,face.tangent,face.normal,boardW,boardH,.090,'#214b49');
  let cursor=-cells*pixel/2;
  [...label].forEach((ch,i)=>{
    if(i)cursor+=pixel;
    if(ch===' '){cursor+=3*pixel;return;}
    const glyph=streetGlyph(ch);if(!glyph){cursor+=5*pixel;return;}
    for(let row=0;row<7;row++)for(let col=0;col<5;col++)if(glyph[row][col]==='1'){
      const along=cursor+(col+.5)*pixel,px=x+face.tangent[0]*along,pz=z+face.tangent[1]*along,py=y+(3-row)*pixel;
      addStreetPixel(mesh,px,py,pz,face.tangent,face.normal,pixel*.86,'#f5e5bd',.116);
    }
    if(ch==='Ä'||ch==='Ö'){
      for(const d of [-1.2,1.2]){const along=cursor+(2+d)*pixel;addStreetPixel(mesh,x+face.tangent[0]*along,y+4.18*pixel,z+face.tangent[1]*along,face.tangent,face.normal,pixel*.60,'#f5e5bd',.116);}
    }else if(ch==='Å'){
      const along=cursor+2*pixel;addStreetPixel(mesh,x+face.tangent[0]*along,y+4.18*pixel,z+face.tangent[1]*along,face.tangent,face.normal,pixel*.66,'#f5e5bd',.116);
    }
    cursor+=5*pixel;
  });
}
function addBuildingAddressSign(mesh,b){
  const face=nearestStreetFacade(b,b.tags?.['addr:street']);if(!face)return 0;
  const label=addressText(b,face);if(!label)return 0;
  const named=!!String(b.name||'').trim()||IDENTITY_IDS.has(b.osm)||SOUTH_IDS.has(b.osm);
  // One small plaque near a corner on named buildings; at most two on exceptionally long generic blocks.
  const repeats=named?1:face.span>58?2:1;
  const margin=2.4;
  for(let i=0;i<repeats;i++){
    const t=named ? .16 : (repeats===1 ? .50 : (i===0 ? .24 : .76));
    let x=face.x,z=face.z;
    if(Math.abs(face.tangent[0])>.5){
      const lo=b.minx+margin,hi=b.maxx-margin;
      x=lo<hi?lo+(hi-lo)*t:(b.minx+b.maxx)/2;
    }else{
      const lo=b.minz+margin,hi=b.maxz-margin;
      z=lo<hi?lo+(hi-lo)*t:(b.minz+b.maxz)/2;
    }
    drawAddressPlate(mesh,b,face,label,x,z);
  }
  return repeats;
}
function addAddressPlates(mesh,buildings){
  let count=0;
  for(const b of buildings){
    if(b.area<28||b.h<3.2)continue;
    count+=addBuildingAddressSign(mesh,b);
  }
  return count;
}

export class ComicMesh {
  constructor(srgb=false){this.srgb=srgb;this.positions=[];this.normals=[];this.colors=[];this.indices=[];}
  tri(a,b,c,colour){
    const k=this.positions.length/3,u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n)||1;
    for(const p of [a,b,c]){this.positions.push(...p);this.normals.push(...n.map(x=>x/l));this.colors.push(...rgb(colour).map((v,i)=>this.srgb&&i<3?(v<=.04045?v/12.92:((v+.055)/1.055)**2.4):v));}
    this.indices.push(k,k+1,k+2);
  }
  quad(a,b,c,d,colour){this.tri(a,b,c,colour);this.tri(a,c,d,colour);}
  box(x,y,z,w,h,d,colour,shade=colour){
    const a=x-w/2,b=x+w/2,c=y-h/2,e=y+h/2,f=z-d/2,g=z+d/2;
    this.quad([a,c,g],[b,c,g],[b,e,g],[a,e,g],colour);
    this.quad([b,c,f],[a,c,f],[a,e,f],[b,e,f],shade);
    this.quad([a,c,f],[a,c,g],[a,e,g],[a,e,f],colour);
    this.quad([b,c,g],[b,c,f],[b,e,f],[b,e,g],shade);
    this.quad([a,e,g],[b,e,g],[b,e,f],[a,e,f],colour);
  }
  pyramid(x,y,z,w,d,h,colour='#34494d'){
    const p=[x,y+h,z],a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2];
    this.tri(a,p,b,'#25383e');this.tri(b,p,c,colour);this.tri(c,p,e,'#567073');this.tri(e,p,a,colour);
  }
  roof(x,y,z,w,d,h,axis='z'){
    const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2];
    if(axis==='x'){
      const p=[x-w/2,y+h,z],q=[x+w/2,y+h,z];this.quad(a,p,q,b,'#354b50');this.quad(p,e,c,q,'#53666a');this.tri(a,e,p,'#e2d4ba');this.tri(b,q,c,'#b6baa5');
    }else{
      const p=[x,y+h,z-d/2],q=[x,y+h,z+d/2];this.quad(a,e,q,p,'#4a6062');this.quad(p,q,c,b,'#30464b');this.tri(a,p,b,'#e2d4ba');this.tri(e,c,q,'#b6baa5');
    }
    this.box(x,y-.12,z,w+.25,.24,d+.25,'#233b40');
  }
  // Valmat tak: nock längs den längre axeln, gavelfall i båda ändar.
  hip(x,y,z,w,d,h,colour='#3d5357',side='#2d4247'){
    const along=w>=d,half=Math.min(w,d)/2,ridge=Math.max(0,(along?w:d)/2-half);
    const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2];
    const p=along?[x-ridge,y+h,z]:[x,y+h,z-ridge],q=along?[x+ridge,y+h,z]:[x,y+h,z+ridge];
    if(along){this.quad(a,p,q,b,side);this.quad(c,q,p,e,colour);this.tri(e,p,a,side);this.tri(b,q,c,colour);}
    else{this.quad(b,a,p,q,side);this.quad(e,c,q,p,colour);this.tri(a,e,p,colour);this.tri(c,b,q,side);}
    this.box(x,y-.12,z,w+.3,.24,d+.3,'#233b40');
  }
  // Extruderade väggar längs en OSM-polygon, med normalerna utåt oavsett polygonens riktning.
  walls(points,y0,y1,colour,inset=0){
    let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}
    const ccw=area>0;
    for(let i=0;i<points.length;i++){
      let a=points[i],b=points[(i+1)%points.length];if(Math.hypot(b[0]-a[0],b[1]-a[1])<.05)continue;
      if(inset){const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),o=ccw?[dz/l*inset,-dx/l*inset]:[-dz/l*inset,dx/l*inset];a=[a[0]+o[0],a[1]+o[1]];b=[b[0]+o[0],b[1]+o[1]];}
      const P0=[a[0],y0,a[1]],Q0=[b[0],y0,b[1]],P1=[a[0],y1,a[1]],Q1=[b[0],y1,b[1]];
      if(ccw)this.quad(Q0,P0,P1,Q1,colour);else this.quad(P0,Q0,Q1,P1,colour);
    }
  }
  strip(points,width,y,colour){
    for(let i=1;i<points.length;i++){
      const [x,z]=points[i-1],[ex,ez]=points[i],d=Math.hypot(ex-x,ez-z);if(d<.01)continue;
      const nx=-(ez-z)/d*width/2,nz=(ex-x)/d*width/2;
      this.quad([x+nx,y,z+nz],[ex+nx,y,ez+nz],[ex-nx,y,ez-nz],[x-nx,y,z-nz],colour);
    }
  }
  polygon(points,y,colour){
    const ps=points.filter((p,i)=>!i||Math.hypot(p[0]-points[i-1][0],p[1]-points[i-1][1])>.001).map(p=>[...p]);
    if(Math.hypot(ps[0][0]-ps.at(-1)[0],ps[0][1]-ps.at(-1)[1])<.001)ps.pop();
    const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(ps.reduce((s,a,i)=>{const b=ps[(i+1)%ps.length];return s+a[0]*b[1]-b[0]*a[1];},0)<0)ps.reverse();
    const vertex=p=>[p[0],y,p[1]];let guard=ps.length*ps.length;
    while(ps.length>2&&guard-->0){
      let cut=false;
      for(let i=0;i<ps.length;i++){
        const a=ps[(i+ps.length-1)%ps.length],b=ps[i],c=ps[(i+1)%ps.length];if(cross(a,b,c)<.00001)continue;
        if(ps.some(p=>p!==a&&p!==b&&p!==c&&cross(a,b,p)>=0&&cross(b,c,p)>=0&&cross(c,a,p)>=0))continue;
        this.tri(vertex(a),vertex(c),vertex(b),colour);ps.splice(i,1);cut=true;break;
      }
      if(!cut){const i=ps.findIndex((p,i)=>Math.abs(cross(ps[(i+ps.length-1)%ps.length],p,ps[(i+1)%ps.length]))<.00001);if(i<0)break;ps.splice(i,1);}
    }
  }
  finish(pc,app,name,material){
    const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(this.positions);mesh.setNormals(this.normals);mesh.setColors(this.colors);mesh.setIndices(this.indices);mesh.update(pc.PRIMITIVE_TRIANGLES);
    const e=new pc.Entity(name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)]});app.root.addChild(e);return e;
  }
}
export function createCityArchitecture(pc,app,buildings){
  const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveVertexColor=true;material.update();
  const road=new ComicMesh();
  // Sidewalks and their dark ink edges follow the same OSM polylines as the map.
  for(const s of CITY_STREETS)road.strip(s.points,s.width+4.7,.009,'#637a72');
  for(const s of CITY_STREETS)road.strip(s.points,s.width+4.1,.014,'#c0bda2');
  for(const s of CITY_STREETS)road.strip(s.points,s.width+.4,.020,'#33494c');
  for(const s of CITY_STREETS)if(!s.pedestrian)road.strip(s.points,s.width,.027,'#667b7d');
  // 2.11: gågator syns tydligt — rosa stenläggning hela vägen mellan husen (som stadskartans
  // gågatufärg), mörka kantstenar bort, tvärgående fogar och en ljus mittlinje av plattor.
  for(const s of PEDESTRIAN_STREETS){
    road.strip(s.points,s.width+4.3,.028,'#d6a39a');
    road.strip(s.points,s.width*.34,.031,'#ead1c4');
    for(let i=1;i<s.points.length;i++){const [x,z]=s.points[i-1],[ex,ez]=s.points[i],d=Math.hypot(ex-x,ez-z);if(d<1)continue;const ux=(ex-x)/d,uz=(ez-z)/d,hw=(s.width+4.3)/2;
      for(let t=1.5;t<d;t+=3)road.strip([[x+ux*t-uz*hw,z+uz*t+ux*hw],[x+ux*t+uz*hw,z+uz*t-ux*hw]],.09,.034,'#b98a82');}
  }
  road.polygon(PEDESTRIAN_SQUARE.points,.026,'#d6a39a');
  // The open paved square reaches the two Torggatan streets, not a fictitious central road.
  road.box(5,.009,3,128,.012,61,'#c9bc99');
  for(let x=-54;x<65;x+=8)road.strip([[x,-26],[x,32]],.035,.032,'#ada68e');
  for(let z=-22;z<32;z+=8)road.strip([[-58,z],[67,z]],.035,.033,'#ada68e');
  road.finish(pc,app,'Karlstad · verkliga gatustråk',material);

  const batches=[];const town=new ComicMesh();
  // Work recovery: 64 ordinary centre buildings use their real OSM footprints in one batch.
  // Mitt i City stays separate so its four entrances and walkable interior are untouched.
  const contours=coreContourBuildings(buildings),contourIds=new Set(contours.map(b=>b.osm));
  for(const b of contours){
    const seed=Math.abs((b.osm*2654435761)>>>0),wall=INNERSTAD_PROFILES[b.osm]?.wall||KUNGSGATAN_PROFILES[b.osm]?.wall||CORE_WALLS[seed%CORE_WALLS.length],h=Math.max(3.2,b.h);
    town.walls(b.polygon,0,h,wall);
    town.walls(b.polygon,.04,.72,'#788a80',.035);
    const floors=Math.max(1,Math.min(5,Math.round(h/3.2)));
    for(let f=0;f<floors&&!KUNGSGATAN_PROFILES[b.osm]&&!INNERSTAD_PROFILES[b.osm];f++){const y=f*3.2+1.28;if(y+1.0<h-.55)town.walls(b.polygon,y,y+1.0,'#5d7a7c',.05);}
    town.polygon(b.polygon,h+.015,'#3b5155');
    addKungsgatanFacade(town,b);
    addInnerstadFacade(town,b);
    if(b.tags['roof:shape']==='gabled'||(b.area<260&&b.sx<26&&b.sz<26))town.roof(b.cx,h+.02,b.cz,b.sx*.92,b.sz*.92,Math.min(3,Math.min(b.sx,b.sz)*.22),b.sx>b.sz?'x':'z');
  }
  // Reference houses outside the 64-house core still join the same static town batch.
  // This keeps detailed Drottninggatan work from increasing the generic draw-call budget.
  for(const b of buildings){
    if(!INNERSTAD_REFERENCE_IDS.has(b.osm)||contourIds.has(b.osm))continue;
    const p=INNERSTAD_PROFILES[b.osm],h=Math.max(3.2,b.h);
    town.walls(b.polygon,0,h,p.wall);town.walls(b.polygon,.04,.72,'#788a80',.035);
    town.polygon(b.polygon,h+.015,'#3b5155');addInnerstadFacade(town,b);
    if(b.tags['roof:shape']==='gabled'||b.tags['roof:shape']==='hipped')town.roof(b.cx,h+.02,b.cz,b.sx*.92,b.sz*.92,Math.min(3,Math.min(b.sx,b.sz)*.22),b.sx>b.sz?'x':'z');
    contourIds.add(b.osm);
  }
  for(const b of buildings){
    if(IDENTITY_IDS.has(b.osm)||MALL_BUILDING_IDS.has(b.osm)||contourIds.has(b.osm))continue;
    if(b.dist<195){
      town.box(b.cx,b.h-.1,b.cz,b.sx+.18,.25,b.sz+.18,'#2b4448');
      town.box(b.cx,b.h-.5,b.cz,b.sx+.26,.20,b.sz+.26,'#e9dcc0');
      if(b.tags['roof:shape']==='gabled'||(b.sx<35&&b.sz<50&&b.tags.building!=='retail'))town.roof(b.cx,b.h+.05,b.cz,b.sx+.25,b.sz+.25,Math.min(3.4,Math.min(b.sx,b.sz)*.16),b.sx>b.sz?'x':'z');
    }
  }
  for(const shop of STOREFRONTS){
    if(KUNGSGATAN_PROFILES[shop.osm]||INNERSTAD_PROFILES[shop.osm])continue; // Reference facade supplies the glazing; identity signs may still render separately.
    const p=storefrontAnchor(shop,buildings);if(!p)continue;const out=shop.face==='north'?-1:1;
    const green=shop.brand==='olearys'?'#155939':shop.brand==='espresso'?'#30554e':'#24477e';
    town.box(p.x,2.7,p.z,10.2,5.4,.12,green);
    town.box(p.x,3.32,p.z+out*.15,10.5,.16,.32,'#233b40');
    town.box(p.x,2.82,p.z+out*.6,10.7,.18,1.1,green);
    town.box(p.x,5.30,p.z+out*.05,10.6,.19,.3,'#eadbc0');
    for(const dx of [-3.65,-1.1,3])town.box(p.x+dx,1.34,p.z+out*.09,2.0,2.48,.08,'#77a9ad');
    town.box(p.x+1.2,1.34,p.z+out*.11,1.55,2.48,.10,'#203a42');
    town.box(p.x+1.7,1.15,p.z+out*.18,.08,.38,.09,'#f4daa1');
  }
  for(const [x,z] of STREET_SIGNS)town.box(x,1.58,z,.07,3.16,.07,'#29444a');
  addInnerstadStreetFurniture(town);
  const addressPlates=addAddressPlates(town,buildings);
  town.finish(pc,app,'Karlstad · taklinjer, referensfasader, adresskyltar och gågatumöbler',material);
  for(const b of buildings.filter(b=>IDENTITY_IDS.has(b.osm)&&!SOUTH_IDS.has(b.osm))){
    const m=new ComicMesh(),x=b.cx,z=b.cz,w=b.sx,d=b.sz;
    if(b.osm===75070676){
      // Cruciform cathedral with the bell/clock tower at its WEST end, facing Torget.
      // A visible raised stone precinct matches the simple collision footprint at the cross's corners.
      m.box(x,.45,z,w,.9,d,'#a3b19f','#79918a');
      m.box(x,6.3,z,w,12.6,18,'#f0e7d2','#d5d8c5');m.box(x+5,6.3,z,18,12.6,d,'#f0e7d2','#d5d8c5');
      m.box(x,.65,z,w+.3,1.3,18.3,'#93a69c');m.box(x+5,.65,z,18.3,1.3,d+.3,'#93a69c');
      m.roof(x,12.7,z,w+1,19.4,5.1,'x');m.roof(x+5,12.7,z,19.4,d+1,5.0,'z');
      const tx=b.minx+7.3;
      m.box(tx,12,z,14.6,24,14.6,'#f6ebd5','#dce1cd');
      for(const level of [1,16.5,23.5])m.box(tx,level,z,15,.45,15,'#bac6b3');
      m.box(tx,26,z,12.8,4.8,12.8,'#31464c');m.pyramid(tx,28.4,z,14.7,14.7,10.0);
      m.box(tx,39.6,z,.18,3,.18,'#203a40');m.box(tx,40.2,z,1.3,.15,.15,'#bba365');
    }else if(b.osm===101456563){
      // Rådhusets main facade faces EAST over Stora Torget.
      m.box(x,5.8,z,w,11.6,d,'#e7debf','#c1bca4');m.roof(x,11.7,z,w+.6,d+.6,3.4);
      for(const y of [.6,4,8,11.3])m.box(x,y,z,w+.4,.32,d+.4,y===.6?'#6c807c':'#f9efd5');
      m.box(b.maxx+.42,5.9,z,.85,11.8,13.8,'#eee4c6');
      m.roof(b.maxx-.5,11.9,z,4.2,14,2.8,'z');
      for(const dz of [-7.2,7.2])m.box(b.maxx+.96,6.9,z+dz,.5,9.8,.65,'#fbefcd');
    }else if(b.osm===75360972){
      m.box(x,5,z,w,10,d,'#c59f72','#987b59');m.box(x,10.3,z,w+1,.65,d+1,'#334b4e');
      m.box(x,3.1,z,w+.1,2.1,d+.1,'#344e55');m.box(x,7.7,z,w+.15,2.35,d+.15,'#658b8d');
      // Low public entrance on Västra Torggatan; canopy stays above the walkway.
      m.box(b.minx-1.5,3.0,z-3,3.2,.35,18,'#e9d7ad');m.box(b.minx-.13,1.3,z-3,.16,2.5,8,'#38616b');
    }else if(b.osm===102496100||b.osm===103695866){
      m.box(x,6.7,z,w,13.4,d,'#dfbd79','#bfab79');m.roof(x,13.45,z,w+.5,d+.5,3.1,w>d?'x':'z');
      for(const h of [.65,4.4,8.9,13.0])m.box(x,h,z,w+.25,.30,d+.25,'#f4e8c9');
      if(b.osm===102496100){m.box(x,7,b.maxz+.36,9,14,.72,'#f1e3bd');m.roof(x,14.0,b.maxz-.7,10,3.5,2.8,'x');}
      else for(let zz=b.minz+5;zz<b.maxz-3;zz+=11){m.box(b.minx-.3,6.6,zz,1.2,.18,3.4,'#273d41');m.box(b.minx-1,7.1,zz,.10,1.1,3.4,'#273d41');}
      m.box(b.minx-1.2,2.8,z,2.8,.17,d-1,'#2c6254');
    }else if(b.osm===102190062){
      m.box(x,8,z,w,16,d,'#ab8668','#8c725e');m.box(x,16.15,z,w+.35,.3,d+.35,'#334b4a');
      for(const h of [3.8,7.8,11.8,15.6])m.box(x,h,z,w+.3,.23,d+.3,'#e2d5b5');
      m.box(b.minx-.2,3.6,z,.5,7,d-.8,'#3c575b');
      for(let zz=b.minz+2;zz<b.maxz-1;zz+=7)m.box(b.minx-.35,7.8,zz,.7,15.6,.65,'#e6d9bf');
      m.box(b.minx-1.1,3.0,237,2.5,.22,13,'#faf0d5');
    }else if(b.osm===102026709){
      m.box(x,4.9,z,w,9.8,d,'#d8d5bd','#aaa994');m.box(x,9.95,z,w+.3,.3,d+.3,'#344b4c');
      for(const h of [3.8,7.6])m.box(x,h,z,w+.2,.22,d+.2,'#f2e7ca');
      m.box(b.maxx+.1,2,z,.25,3.7,d-1,'#42616a');m.box(b.maxx+.3,4.7,z,.55,1.55,d,'#b72d36');
      m.box(b.maxx+.7,3.4,z,1.7,.17,d,'#cebb94');
    }else if(b.osm===1151016){
      // Cyrillushuset west: red brick, inner court and a broad flared tile roof.
      m.box(-146,3.4,-497,29,6.8,36,'#a8553e','#8a4537');
      m.box(-146,6.9,-497,32,.35,39,'#723f33');m.pyramid(-146,7.05,-497,30,37,4.9,'#b97652');
      m.box(-146,7.65,-497,27,.18,34,'#995a3e');
      // Modern east building follows the curved survey footprint, as faceted timber wings.
      const shape=[[-120,-479],[-124,-510],[-109,-536],[-80,-529],[-56,-509],[-60,-480],[-83,-461],[-105,-473]];
      m.polygon(shape,7.0,'#344e50');
      for(let i=0;i<shape.length;i++){
        const a=shape[i],b=shape[(i+1)%shape.length];m.quad([a[0],0,a[1]],[b[0],0,b[1]],[b[0],6.9,b[1]],[a[0],6.9,a[1]],i%2?'#b3694b':'#bd7655');
        m.quad([b[0],0,b[1]],[a[0],0,a[1]],[a[0],6.9,a[1]],[b[0],6.9,b[1]],'#985a43');
      }
      m.box(-125,2.3,-480,13,4.6,6,'#84b1b1');m.box(-125,4.7,-480,13.5,.2,6.5,'#f1e3c4');
      m.box(-83,3,-462,10,.23,4,'#f3e4c7');
    }else if(b.osm===101186411){
      // Residenset: 1700-talets landshövdingeresidens vid Residenstorget. Två våningar puts,
      // valmat tak och en mittrisalit med fronton mot öster. Stiliserad, inte uppmätt.
      m.box(x,4.6,z,w,9.2,d,'#ead7a4','#cdbb8c');
      for(const y of [.45,4.5,9.0])m.box(x,y,z,w+.3,.3,d+.3,y===.45?'#7c8a80':'#fbf1d6');
      m.hip(x,9.25,z,w+.8,d+.8,4.2,'#3f565a','#2e4448');
      const fx=b.maxx+.5;m.box(fx,4.7,z,1.0,9.4,Math.min(12,d*.4),'#f3e2b4');
      m.roof(fx-.3,9.4,z,2.6,Math.min(12.6,d*.42),2.4,'z');
      m.box(fx+.55,1.6,z,.2,3.2,2.2,'#2a4247');m.box(fx+.6,3.45,z,.4,.25,2.8,'#fbf1d6');
      for(let dz=-d/2+2.2;dz<d/2-1.5;dz+=3.1)for(const y of [2.4,6.6])if(Math.abs(dz)>Math.min(6,d*.2))m.box(b.maxx+.08,y,z+dz,.12,1.9,1.15,'#4f6d70');
      for(const dz of [-d/2,d/2])m.box(b.maxx,4.6,z+dz,.5,9.2,.5,'#fbf1d6');
    }else if(b.osm===106864586){
      // Biskopsgården: biskopens gård norr om Domkyrkan. Tvåvånings herrgårdsvolym med brutet
      // (säteri-)tak, ljus puts och vita hörnkedjor. Stiliserad efter stadskartans läge.
      m.box(x,3.3,z,w,6.6,d,'#f0e6cf','#d3cbb5');
      m.box(x,6.7,z,w+.4,.3,d+.4,'#fbf3df');
      m.hip(x,6.85,z,w+.6,d+.6,1.4,'#4a3b39','#3a2e2c');
      m.hip(x,8.2,z,Math.max(2,w-2.6),Math.max(2,d-2.6),2.2,'#4a3b39','#3a2e2c');
      for(const [dx,dz] of [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]])m.box(x+dx,3.3,z+dz,.55,6.6,.55,'#fffaf0');
      m.box(b.maxx+.1,1.4,z,.2,2.8,1.8,'#5a4136');
      for(let dz=-d/2+1.8;dz<d/2-1;dz+=2.6)for(const y of [1.7,4.9])if(Math.abs(dz)>1.4)m.box(b.maxx+.06,y,z+dz,.1,1.5,.95,'#5b7476');
    }else if(b.osm===75896103){
      // Wermland Opera / Karlstads teater (1893) på Klarasidan vid Västra bron: salongsvolym,
      // högre scentorn bakom, pilastrad entréfasad med fronton. Stiliserad tolkning.
      const hall=Math.max(12,b.h+4);
      m.box(x,hall/2,z,w,hall,d,'#dcb98c','#b99872');
      for(const y of [.5,5.2,hall-.2])m.box(x,y,z,w+.35,.35,d+.35,'#f6e7c8');
      m.box(x-w*.18,(hall+7)/2,z,w*.42,hall+7,d*.7,'#c9a67c','#a8885f');
      m.box(x-w*.18,hall+7.1,z,w*.44,.4,d*.72,'#36504f');
      m.roof(x+w*.12,hall+.1,z,w*.55,d+.6,3.6,'z');
      const fx=b.maxx+.4;
      for(let dz=-d/2+1.5;dz<=d/2-1.4;dz+=3.4)m.box(fx,hall/2,z+dz,.7,hall-.6,.75,'#f9ecd0');
      m.box(fx+.2,3.0,z,.35,6,4.6,'#3a3433');m.box(fx+.3,6.4,z,.6,.45,5.6,'#f9ecd0');
      m.roof(fx-.5,hall+.1,z,2.6,Math.min(16,d*.55),3.2,'z');
      m.box(fx+.6,hall+1.4,z,.2,1.3,4.2,'#6f9a84');
    }else if(b.osm===95639598){
      m.box(x,2,z,w,4,d,'#f3ecd9','#d6ddcc');m.box(x,4.1,z,w+1,.28,d+1,'#344c51');
      m.box(x,2.1,b.maxz+.08,w-2,2.6,.18,'#385b68');
      m.box(x,3.85,b.maxz+2.05,w+1,.28,4.4,'#f7eedb');
      m.box(x,4.85,b.maxz+3.96,w+1,.32,.32,'#f7eedb');
      for(let dx=-w/2+1.8;dx<w/2;dx+=7.7)m.box(x+dx,2.52,b.maxz+3.94,.40,5.04,.44,'#f4ecdc');
      m.box(x,1.6,b.maxz+.23,3.3,3,.16,'#28434a');
      // The threshold is a visual, flush plane; it does not add a collision step.
      m.box(x,.03,b.maxz+2.7,w,.045,5.0,'#c7bfa8');
    }
    batches.push(m.finish(pc,app,'Karlstad · '+(b.name||b.osm),material));
  }
  return {streetWays:CITY_STREETS.length,landmarks:batches.length,contours:contours.length,addressPlates,contourIds:Object.freeze([...contourIds]),staticDrawCalls:2+batches.length};
}

// 2.11: kvartersfyllnad — stadens övriga OSM-byggnader i samma tecknade stil (färgade väggar,
// mörk taklist, fönsterband per våning, sadeltak på små hus). Ett enda statiskt batch.
const INFILL_WALLS=['#e2cfa7','#d8b48b','#c98f6a','#e6dcc4','#b9a68a','#d7c39b','#c7a07a','#e9d9b6'];
export function infillMesh(buildings,mesh=new ComicMesh()){
  for(const b of buildings){
    const seed=Math.abs((b.osm*2654435761)>>>0),wall=INFILL_WALLS[seed%INFILL_WALLS.length];
    const h=Math.max(3.2,b.h),poly=b.polygon;
    mesh.walls(poly,0,h,wall);
    mesh.walls(poly,h-.45,h,'#2b4448',.06);
    mesh.walls(poly,.02,.75,'#7d8c84',.04);
    const floors=Math.max(1,Math.round(h/3.2));
    for(let f=0;f<floors;f++){const y=f*3.2+1.25;if(y+1.1<h-.5)mesh.walls(poly,y,y+1.1,'#5d7a7c',.05);}
    mesh.polygon(poly,h+.01,'#3e5357');
    if(b.area<260&&b.sx<26&&b.sz<26)mesh.roof(b.cx,h+.02,b.cz,b.sx*.92,b.sz*.92,Math.min(3,Math.min(b.sx,b.sz)*.22),b.sx>b.sz?'x':'z');
  }
  return mesh;
}
export function createInfill(pc,app,buildings){
  const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveVertexColor=true;material.update();
  const mesh=infillMesh(buildings);if(!mesh.indices.length)return {buildings:0,addressPlates:0,staticDrawCalls:0};
  const addressPlates=addAddressPlates(mesh,buildings);
  mesh.finish(pc,app,'Karlstad · kvartersfyllnad med adresskyltar',material);
  return {buildings:buildings.length,addressPlates,triangles:mesh.indices.length/3,staticDrawCalls:1};
}
