import {CITY_STREETS,IDENTITY_IDS,STOREFRONTS,STREET_SIGNS,storefrontAnchor} from './city-geography.mjs?v=2.6.0';

// Static, vertex-coloured geometry: one draw call per landmark, one for streets,
// one for rooflines and storefront frames. No lights, shadows or per-frame work.
const rgb=hex=>[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255,1];
class ComicMesh {
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
  strip(points,width,y,colour){
    for(let i=1;i<points.length;i++){
      const [x,z]=points[i-1],[ex,ez]=points[i],d=Math.hypot(ex-x,ez-z);if(d<.01)continue;
      const nx=-(ez-z)/d*width/2,nz=(ex-x)/d*width/2;
      this.quad([x+nx,y,z+nz],[ex+nx,y,ez+nz],[ex-nx,y,ez-nz],[x-nx,y,z-nz],colour);
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
  for(const s of CITY_STREETS)road.strip(s.points,s.width,s.pedestrian?.024:.027,s.pedestrian?'#aeaa92':'#667b7d');
  // The open paved square reaches the two Torggatan streets, not a fictitious central road.
  road.box(5,.009,3,128,.012,61,'#c9bc99');
  for(let x=-54;x<65;x+=8)road.strip([[x,-26],[x,32]],.035,.032,'#ada68e');
  for(let z=-22;z<32;z+=8)road.strip([[-58,z],[67,z]],.035,.033,'#ada68e');
  road.finish(pc,app,'Karlstad · verkliga gatustråk',material);

  const batches=[];const town=new ComicMesh();
  for(const b of buildings){
    if(IDENTITY_IDS.has(b.osm))continue;
    if(b.dist<195){
      town.box(b.cx,b.h-.1,b.cz,b.sx+.18,.25,b.sz+.18,'#2b4448');
      town.box(b.cx,b.h-.5,b.cz,b.sx+.26,.20,b.sz+.26,'#e9dcc0');
      if(b.tags['roof:shape']==='gabled'||(b.sx<35&&b.sz<50&&b.tags.building!=='retail'))town.roof(b.cx,b.h+.05,b.cz,b.sx+.25,b.sz+.25,Math.min(3.4,Math.min(b.sx,b.sz)*.16),b.sx>b.sz?'x':'z');
    }
  }
  for(const shop of STOREFRONTS){
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
  for(const [x,z] of STREET_SIGNS)town.box(x,1.73,z,.09,3.46,.09,'#29444a');
  town.finish(pc,app,'Karlstad · taklinjer och butiksfasader',material);
  for(const b of buildings.filter(b=>IDENTITY_IDS.has(b.osm))){
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
  return {streetWays:CITY_STREETS.length,landmarks:batches.length,staticDrawCalls:2+batches.length};
}
