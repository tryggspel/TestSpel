import {CITY_STREETS,IDENTITY_IDS,STOREFRONTS,STREET_SIGNS,storefrontAnchor} from './city-geography.mjs?v=2.8.1';

// Static, vertex-coloured geometry: one draw call per landmark, one for streets,
// one for rooflines and storefront frames. No lights, shadows or per-frame work.
const rgb=hex=>[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255,1];
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
  for(const s of CITY_STREETS)road.strip(s.points,s.width,s.pedestrian?.024:.027,s.pedestrian?'#aeaa92':'#667b7d');
  // The open paved square reaches the two Torggatan streets, not a fictitious central road.
  road.box(5,.009,3,128,.012,61,'#c9bc99');
  for(let x=-54;x<65;x+=8)road.strip([[x,-26],[x,32]],.035,.032,'#ada68e');
  for(let z=-22;z<32;z+=8)road.strip([[-58,z],[67,z]],.035,.033,'#ada68e');
  road.finish(pc,app,'Karlstad · verkliga gatustråk',material);

  const batches=[];const town=new ComicMesh();
  for(const b of buildings){
    if(IDENTITY_IDS.has(b.osm)||b.osm===234271401)continue;
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
