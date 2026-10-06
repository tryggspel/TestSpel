// Haga, Inre hamn and Mariebergsskogen (2.11.29): the districts outside the bundled city extract, built from
// OpenStreetMap data fetched by .github/workflows/fetch-karlstad-outer-osm.yml (data/osm-outer-*.json, ODbL).
// Real footprints with the same window grammar as the rest of the city, roads, lawns, woods, water and trees.
// The model is pure data (testable in Node); createOuterCity() turns it into static batches and colliders.
import {ComicMesh,exposedFaces,meshChunkRanges} from './city-architecture.js?v=2.14.0';
import {cityPoint} from './city-geography.mjs?v=2.14.0';

export const OUTER_AREAS=Object.freeze(['haga','hamn','marieberg']);
const WALLS=['#e2cfa7','#d8b48b','#c98f6a','#e6dcc4','#b9a68a','#d7c39b','#c7a07a','#e9d9b6','#d9c4a0','#cf9a78'];
const FRAMES=['#efe6d2','#e8e0cc','#f4efe2','#d9ccb2','#f1e6cf','#e2d6bd'];
const ROAD_WIDTH={motorway:9,trunk:8,primary:8,secondary:7,tertiary:6,residential:5.5,unclassified:5.5,living_street:5,service:3.6,
  track:3,footway:1.8,path:1.6,cycleway:2.2,pedestrian:3.5,steps:1.8,platform:2.5,rail:1.7};
const ROAD_COLOUR={footway:'#d8cfb9',path:'#cfc1a0',cycleway:'#c8cdc4',pedestrian:'#e3d7c8',steps:'#cfc9b8',platform:'#d8d4c8',track:'#b9ac8c',rail:'#6c685f'};
const hash=n=>Math.abs((Math.imul(Math.abs(Math.floor(n)),2654435761))>>>0);
const pointIn=(x,z,poly)=>{let r=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)r=!r;}return r;};

function project(geometry){
  const pts=geometry.map(g=>{const p=cityPoint(g.lon,g.lat);return [p.x,p.z];});
  if(pts.length>1&&Math.hypot(pts[0][0]-pts.at(-1)[0],pts[0][1]-pts.at(-1)[1])<.01)pts.pop();
  return pts;
}
function footprint(polygon){
  let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity,twice=0;
  for(let i=0;i<polygon.length;i++){const [x,z]=polygon[i],[qx,qz]=polygon[(i+1)%polygon.length];minx=Math.min(minx,x);maxx=Math.max(maxx,x);minz=Math.min(minz,z);maxz=Math.max(maxz,z);twice+=x*qz-qx*z;}
  return {minx,maxx,minz,maxz,sx:maxx-minx,sz:maxz-minz,cx:(minx+maxx)/2,cz:(minz+maxz)/2,area:Math.abs(twice)/2};
}

// skipIds: OSM ids already drawn elsewhere. skipBoxes: hand-placed buildings [{x,z,w,d}] that an OSM footprint must not double.
export function buildOuterModel(datasets,{skipIds=new Set(),skipBoxes=[]}={}){
  const model={buildings:[],roads:[],areas:[],trees:[],water:[],counts:{}};
  const seen=new Set();
  for(const [area,data] of Object.entries(datasets)){
    if(!data)continue;
    let b0=model.buildings.length;
    for(const e of data.buildings||[]){
      if(seen.has(e.id)||skipIds.has(e.id))continue;seen.add(e.id);
      const polygon=project(e.geometry);if(polygon.length<3)continue;
      const f=footprint(polygon);if(f.area<14)continue;
      if(skipBoxes.some(s=>Math.abs(f.cx-s.x)<(f.sx+s.w)/2&&Math.abs(f.cz-s.z)<(f.sz+s.d)/2))continue;
      const t=e.tags||{},type=t.building;
      const levels=parseFloat(t['building:levels']);
      const small=['shed','toilets','shelter','roof','garage','garages','kiosk','hut','cabin','carport'].includes(type);
      const h=small?3.0:Math.max(3.2,(Number.isFinite(levels)?Math.min(10,levels):(f.area>900?3:f.area>200?2.5:2))*3.2);
      model.buildings.push({osm:e.id,area_name:area,name:t.name||'',tags:t,polygon,...f,h,dist:Math.hypot(f.cx,f.cz),small,type});
    }
    const buildings=model.buildings.length-b0;
    let r0=model.roads.length;
    for(const e of data.roads||[]){
      const t=e.tags||{},kind=t.railway?'rail':t.highway;if(!kind||['proposed','construction'].includes(kind))continue;
      if(area!=='marieberg'&&['footway','path','steps','cycleway','platform'].includes(kind)&&!(t.name))continue; // small unnamed paths only matter in the park
      const pts=e.geometry.map(g=>{const p=cityPoint(g.lon,g.lat);return [p.x,p.z];});if(pts.length<2)continue;
      model.roads.push({id:e.id,kind,width:ROAD_WIDTH[kind]||4,points:pts,name:t.name||'',tags:{bridge:t.bridge,highway:t.highway,railway:t.railway,name:t.name}});
    }
    const roads=model.roads.length-r0;
    for(const e of data.environment||[]){
      const t=e.tags||{};const polygon=project(e.geometry);if(polygon.length<3)continue;
      const water=t.natural==='water'||t.waterway==='riverbank';
      const kind=water?'water':(t.natural==='wood'||t.landuse==='forest')?'wood':t.natural==='scrub'?'scrub':t.natural==='beach'?'beach':
        (t.leisure==='pitch'||t.leisure==='sports_centre'||t.leisure==='stadium')?'pitch':
        (['park','garden','playground','nature_reserve'].includes(t.leisure)||['grass','meadow','recreation_ground','allotments'].includes(t.landuse)||t.tourism==='zoo')?'lawn':
        t.landuse==='cemetery'?'lawn':null;
      if(!kind)continue;
      model.areas.push({id:e.id,kind,polygon,...footprint(polygon)});
      if(water)model.water.push(polygon);
    }
    for(const t of data.trees||[]){const p=cityPoint(t.lon,t.lat);model.trees.push([p.x,p.z,hash(t.id)%3]);}
    model.counts[area]={buildings,roads,areas:model.areas.length,trees:(data.trees||[]).length};
  }
  // Woods get trees on a jittered grid so they read as woods; capped to keep the batch light.
  let scattered=0;
  for(const a of model.areas){
    if(a.kind!=='wood'&&a.kind!=='scrub')continue;
    const step=a.kind==='wood'?11:16;let n=0;
    for(let x=a.minx+step/2;x<a.maxx&&n<260&&scattered<1400;x+=step)for(let z=a.minz+step/2;z<a.maxz&&n<260&&scattered<1400;z+=step){
      const s=hash(Math.round(x*7)+Math.round(z*13)+a.id);const jx=x+((s%7)-3)*.8,jz=z+(((s>>3)%7)-3)*.8;
      if(!pointIn(jx,jz,a.polygon))continue;
      if(model.water.some(w=>pointIn(jx,jz,w)))continue;
      model.trees.push([jx,jz,a.kind==='wood'?(s%5===0?1:0):2]);n++;scattered++;
    }
  }
  return model;
}

// One glass pane per window and one sill band per storey (about 6 vertices per window instead of 18): the outer
// districts are seen from a distance and there are hundreds of long walls.
function paintLightWindows(mesh,b,faces,frame){
  for(const f of faces){
    const P=(u,y,o)=>[f.a[0]+f.tx*u+f.nx*o,y,f.a[1]+f.tz*u+f.nz*o];
    const panel=(u,y,w,ph,col,o)=>{const A=P(u,y,o),B=P(u+w,y,o),C=P(u+w,y+ph,o),D=P(u,y+ph,o);if(f.ccw)mesh.quad(B,A,D,C,col);else mesh.quad(A,B,C,D,col);};
    const floors=Math.max(1,Math.min(5,Math.round(b.h/3.2))),rowH=b.h/Math.max(1,Math.round(b.h/3.2)),cols=Math.max(2,Math.round(f.length/4.2)),cw=f.length/cols;
    for(let r=0;r<floors;r++){
      const y=r*rowH+(r===0?1.05:.95),wh=Math.min(1.55,rowH-1.2);if(wh<.6)continue;
      panel(.15,y-.16,f.length-.3,.1,frame,.07);
      for(let c=0;c<cols;c++){const w=Math.max(.7,cw-1.0);panel(c*cw+(cw-w)/2,y,w,wh,'#344e51',.09);}
    }
  }
}

export function outerWaterBlocked(model,x,z){return model.water.some(w=>pointIn(x,z,w));}

export function drawOuterModel(model,mesh=new ComicMesh()){
  const AREA_COLOUR={water:['#3b90a6',.022],lawn:['#92b57c',.012],wood:['#6f9460',.016],scrub:['#7f9f66',.014],beach:['#dccfa0',.018],pitch:['#86b06f',.02]};
  for(const a of model.areas){const [col,y]=AREA_COLOUR[a.kind];mesh.polygon(a.polygon,y,col);}
  for(const r of model.roads){
    const colour=ROAD_COLOUR[r.kind]||'#a6b2b4',y=r.kind==='rail'?.05:ROAD_WIDTH[r.kind]>=3.5?.034:.042;
    mesh.strip(r.points,r.width,y,colour);
    if(r.kind==='rail')mesh.strip(r.points,.3,.07,'#4a4640');
  }
  for(const [x,z,k] of model.trees){
    if(k===2){mesh.pyramid(x,0,z,2.4,2.4,2.8,'#5f8a52');continue;}
    mesh.box(x,.9,z,.35,1.8,.35,'#6a4f38');
    if(k===1){mesh.pyramid(x,1.4,z,2.7,2.7,3.6,'#35604a');mesh.pyramid(x,3.2,z,2.0,2.0,3.0,'#3d6b53');}
    else{mesh.pyramid(x,1.6,z,3.2,3.2,3.2,'#587f48');mesh.pyramid(x,3.2,z,2.2,2.2,2.4,'#648c50');}
  }
  const all=model.buildings;
  for(const b of all){
    const seed=hash(b.osm),wall=b.small?'#b9a07a':b.area>1200?'#dad6c8':WALLS[seed%WALLS.length],h=b.h;
    mesh.walls(b.polygon,0,h,wall);mesh.walls(b.polygon,h-.45,h,'#2b4448',.06);mesh.walls(b.polygon,.02,.7,'#7d8c84',.04);
    mesh.polygon(b.polygon,h+.01,b.small?'#5b4a3a':'#3e5357');
    if(b.area<300&&b.sx<26&&b.sz<26)mesh.roof(b.cx,h+.02,b.cz,b.sx*.92,b.sz*.92,Math.min(3,Math.min(b.sx,b.sz)*.24),b.sx>b.sz?'x':'z');
    if(b.small||b.area<40||h<5)continue;
    const faces=exposedFaces({...b,h},all,()=>true,6);
    paintLightWindows(mesh,{...b,h},faces,FRAMES[seed%FRAMES.length]);
  }
  return mesh;
}

// Creates the static batches (chunked for 16-bit safety) and returns colliders in the shape app.js expects.
export function createOuterCity(pc,app,datasets,options={}){
  const model=buildOuterModel(datasets,options);
  const mesh=drawOuterModel(model);
  const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveVertexColor=true;material.update();
  if(mesh.indices.length)mesh.finish(pc,app,'Karlstad · Haga, Inre hamn och Mariebergsskogen',material);
  const colliders=model.buildings.map(b=>({precise:true,infill:true,outer:true,polygon:b.polygon,osm:b.osm,name:b.name,tags:b.tags,cx:b.cx,cz:b.cz,dist:b.dist,area:b.area,sx:b.sx,sz:b.sz,h:b.h,height:b.h,
    minx:b.minx-.15,maxx:b.maxx+.15,minz:b.minz-.15,maxz:b.maxz+.15}));
  return {model,colliders,water:model.water,stats:{buildings:model.buildings.length,roads:model.roads.length,trees:model.trees.length,areas:model.areas.length,
    vertices:mesh.positions.length/3,drawCalls:mesh.indices.length?meshChunkRanges(mesh.positions.length/3).length:0}};
}
