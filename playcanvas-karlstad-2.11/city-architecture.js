import {KUNGSGATAN_PROFILES,addKungsgatanFacade} from './kungsgatan-reference.mjs?v=2.17.0';
import {addResidensetWall,addResidensetRoof,RESIDENSET_COLOURS} from './residenset-facade.mjs?v=2.17.0';
import {addOperaFront,OPERA_COLOURS} from './opera-facade.mjs?v=2.17.0';
import {visualTwinProfile,addVisualTwinFacade,visualTwinAudit,visualTwinFaceYaw,visualTwinFront} from './visual-twin.mjs?v=2.17.0';
import {PHOTO_REFERENCE_PROFILES,PHOTO_REFERENCE_IDS,addPhotoReferenceFacade,photoReferenceFaceYaws} from './photo-reference-pass3.mjs?v=2.17.0';
import {addCityWowPass} from './city-wow-pass.mjs?v=2.17.0';
import {INNERSTAD_PROFILES,INNERSTAD_REFERENCE_IDS,addInnerstadFacade,addInnerstadStreetFurniture,referenceFaceYaw} from './innerstad-reference.mjs?v=2.17.0';
import {CITY_STREETS,IDENTITY_IDS,STOREFRONTS,STREET_SIGNS,storefrontAnchor} from './city-geography.mjs?v=2.17.0';

import {SOUTH_IDS,SOUTH_HANDBUILT_IDS} from './city-south-space.mjs?v=2.17.0';
import {PEDESTRIAN_STREETS,PEDESTRIAN_SQUARE} from './pedestrian.mjs?v=2.17.0';
import {MALL_BUILDING_IDS} from './mall-space.mjs?v=2.17.0';

// Static, vertex-coloured geometry: one draw call per landmark, one for streets,
// one for rooflines and storefront frames. No lights, shadows or per-frame work.
const CORE_CONTOUR_RADIUS=260;
const CORE_CONTOUR_LIMIT=95;
const CORE_WALLS=['#e4d2ae','#d9b991','#c8906d','#e8ddc6','#bca98d','#d8c49c','#c8a17b','#eadab8'];
// RENDER ROUTING — single source of truth (2.11.22 root fix).
// A building with a curated reference profile (Kungsgatan, photo/Street View, Torget audit)
// is ALWAYS drawn through the Kungsgatan route: hand-built geometry in the static town mesh.
// Before 2.11.22 three gates silently sent curated buildings elsewhere, so profile edits never
// reached the screen: dist>=260 (generic PlayCanvas box in app.js), SOUTH_IDS (generic box in
// city-south.js — this is why Frimurarelogen/Grekiska never changed) and MALL_BUILDING_IDS.
// Mall buildings stay excluded on purpose: their walls are cut for the four real entrances.
export function curatedRoute(b){
  const id=b?.osm;
  if(!(TORGET_AUDIT_PROFILES[id]||PHOTO_REFERENCE_PROFILES[id]||KUNGSGATAN_PROFILES[id]))return false;
  if(MALL_BUILDING_IDS.has(id)||SOUTH_HANDBUILT_IDS.has(id))return false;
  if(IDENTITY_IDS.has(id)&&!SOUTH_IDS.has(id))return false; // hand-built landmark meshes keep ownership
  return true;
}
// 2.11.23 side-wall pass: Visual Twin and curated houses only get detail on their street front,
// so their other walls used to render as blank planes. Exposed side walls now get the same
// window grammar as the approved Kungsgatan facades (frame, glass, mullion, floor rhythm).
// Kungsgatan and Torget-audit houses are never touched. Party walls (a neighbour footprint
// right outside the wall) stay plain. Depth stays below COMIC_FACE_BIAS (.16) so existing
// comic cards still sit on top where they are drawn.
const pointInPolygon=(x,z,poly)=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;}return inside;};
const SIDE_WALL_LOW_RADIUS=230; // infill keeps the 16-bit single-mesh budget
const yawGap=(a,b)=>Math.abs(((a-b)%360+540)%360-180);
export function sideWallFaces(b,neighbours=[]){
  if(!b||!Array.isArray(b.polygon)||b.polygon.length<3)return [];
  if(KUNGSGATAN_PROFILES[b.osm]||TORGET_AUDIT_IDS.has(b.osm)||b.osm===FRIMURARE_OSM||Math.max(3.2,b.h)<5)return [];
  const curatedFront=PHOTO_REFERENCE_PROFILES[b.osm]||INNERSTAD_PROFILES[b.osm];
  if(!curatedFront&&!visualTwinProfile(b))return []; // plain houses already get window bands on every wall
  const fronts=[...photoReferenceFaceYaws(b.osm),referenceFaceYaw(b.osm),curatedFront?null:visualTwinFaceYaw(b)].filter(Number.isFinite);
  const poly=b.polygon;let area=0;for(let i=0;i<poly.length;i++){const a=poly[i],q=poly[(i+1)%poly.length];area+=a[0]*q[1]-q[0]*a[1];}
  const ccw=area>0,near=neighbours.filter(n=>n!==b&&n.osm!==b.osm&&Array.isArray(n.polygon)&&Math.abs(n.cx-b.cx)<b.sx/2+n.sx/2+4&&Math.abs(n.cz-b.cz)<b.sz/2+n.sz/2+4),out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],q=poly[(i+1)%poly.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);
    if(length<6)continue;
    const tx=dx/length,tz=dz/length,nx=ccw?tz:-tz,nz=ccw?-tx:tx,yaw=Math.atan2(nx,nz)*180/Math.PI;
    if(fronts.some(f=>yawGap(yaw,f)<=34))continue;
    const party=[.2,.5,.8].every(t=>{const x=a[0]+dx*t+nx*1.2,z=a[1]+dz*t+nz*1.2;return near.some(n=>pointInPolygon(x,z,n.polygon));});
    if(party)continue;
    out.push({a,q,length,tx,tz,nx,nz,yaw,ccw});
  }
  return out;
}
export function addSideWallFacades(mesh,b,{neighbours=[],frame=null,lod='high',force=false}={}){
  if(!force&&lod==='low'&&!(b.dist<SIDE_WALL_LOW_RADIUS))return 0;
  const faces=sideWallFaces(b,neighbours);if(!faces.length)return 0;
  const fr=frame||PHOTO_REFERENCE_PROFILES[b.osm]?.frame||INNERSTAD_PROFILES[b.osm]?.frame||visualTwinProfile(b)?.frame||'#e8e0cc';
  paintWindowFaces(mesh,b,faces,fr,lod==='low');
  return faces.length;
}
// Shared window grammar (frame, glass, mullion, floor rhythm) for walls without a hand-built profile.
export function paintWindowFaces(mesh,b,faces,fr,low){
  const h=Math.max(3.2,b.h);
  for(const f of faces){
    const P=(u,y,o)=>[f.a[0]+f.tx*u+f.nx*o,y,f.a[1]+f.tz*u+f.nz*o];
    const panel=(u,y,w,ph,colour,o)=>{const P0=P(u,y,o),Q0=P(u+w,y,o),P1=P(u,y+ph,o),Q1=P(u+w,y+ph,o);if(f.ccw)mesh.quad(Q0,P0,P1,Q1,colour);else mesh.quad(P0,Q0,Q1,P1,colour);};
    panel(0,3.15,f.length,.16,fr,.06);
    const floors=Math.max(1,Math.round(h/3.2)-1),rh=(h-3.7)/floors,count=Math.max(2,Math.round(f.length/2.9)),cw=f.length/count;
    // Ground floor: plain plinth windows, no shopfronts on side streets.
    if(!low)for(let col=0;col<count;col++){const u=col*cw+.4,ww=cw-.8;if(ww<.7)continue;panel(u-.06,1.0,ww+.12,1.5,fr,.07);panel(u,1.06,ww,1.38,'#41595d',.09);}
    for(let row=0;row<floors;row++){
      const y=3.75+row*rh,wh=Math.min(1.7,rh-.62);if(wh<.5||y+wh>h-.4)continue;
      for(let col=0;col<count;col++){
        const u=col*cw+.3,ww=cw-.6;if(ww<.7)continue;
        panel(u-.08,y-.08,ww+.16,wh+.16,fr,.07);
        panel(u,y,ww,wh,'#344e51',.09);
        if(low)continue;
        panel(u+.06,y+.08,ww*.48,wh-.16,'#718f8c',.10);
        panel(u+ww*.48,y,.065,wh,fr,.11);
        panel(u-.12,y-.13,ww+.24,.10,fr,.12);
      }
    }
  }
}
// 2.11.24 facade-gap pass (art/FACADE-GAPS.md): walls found blank in the Kungsgatan/Torget walk-through.
// Listed walls get the window grammar above. 'all' = every exposed wall (plain infill with no windows
// at all); otherwise cardinal outward directions (N/E/S/W, +-40 deg). Party walls stay plain.
// Kungsgatan 14/16/18 are never listed (KUNGSGATAN_PROFILES guard below as well).
export const GAP_FACADES=Object.freeze({
  103695873:Object.freeze({name:'Västra Torggatan 16',faces:['W']}),
  101170472:Object.freeze({name:'Östra Torggatan 14',faces:['W']}),
  101935913:Object.freeze({name:'Tingvallagatan 7',faces:['N','S']}),
  110997315:Object.freeze({name:'Östra Torggatan 10',faces:['W']}),
  113214347:Object.freeze({name:'Kungsgatan öst',faces:'all'}),
  101453952:Object.freeze({name:'Västra Kyrkogatan 1',faces:'all'}),
  101935869:Object.freeze({name:'Västra Kyrkogatan 3,5',faces:'all'}),
  102580709:Object.freeze({name:'Östra Torggatan 16',faces:'all'}),
  101453951:Object.freeze({name:'Torn Kungsgatan öst',faces:'all'}),
  104529128:Object.freeze({name:'Västra Torggatan 10',faces:['W']}),
  // 2.11.25 rest-of-city walk-through (art/FACADE-GAPS.md, part 2): curated houses with a blank wall.
  // (Visual Twin houses are completed generically by missingWallFaces below.)
  101485439:Object.freeze({name:'Drottninggatan 24',faces:['E','S']}),
  106078949:Object.freeze({name:'Södra Kyrkogatan 7',faces:['S','E']})
});
const GAP_YAW=Object.freeze({S:0,E:90,N:180,W:-90});
export function exposedFaces(b,neighbours,accept,minLength){
  const poly=b.polygon;let area=0;for(let i=0;i<poly.length;i++){const a=poly[i],q=poly[(i+1)%poly.length];area+=a[0]*q[1]-q[0]*a[1];}
  // A wall is only a party wall where the neighbour is about as tall; above a lower neighbour it is a free wall.
  const ccw=area>0,near=neighbours.filter(n=>n!==b&&n.osm!==b.osm&&Array.isArray(n.polygon)&&n.h>=b.h-.5&&Math.abs(n.cx-b.cx)<b.sx/2+n.sx/2+4&&Math.abs(n.cz-b.cz)<b.sz/2+n.sz/2+4),out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],q=poly[(i+1)%poly.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);
    if(length<minLength)continue;
    const tx=dx/length,tz=dz/length,nx=ccw?tz:-tz,nz=ccw?-tx:tx,yaw=Math.atan2(nx,nz)*180/Math.PI;
    if(!accept(yaw))continue;
    const party=[.2,.5,.8].every(t=>{const x=a[0]+dx*t+nx*1.2,z=a[1]+dz*t+nz*1.2;return near.some(n=>pointInPolygon(x,z,n.polygon));});
    if(party)continue;
    out.push({a,q,length,tx,tz,nx,nz,yaw,ccw});
  }
  return out;
}
export function gapFaces(b,neighbours=[]){
  const spec=GAP_FACADES[b?.osm];
  if(!spec||KUNGSGATAN_PROFILES[b.osm]||!Array.isArray(b.polygon)||b.polygon.length<3||Math.max(3.2,b.h)<5)return [];
  return exposedFaces(b,neighbours,yaw=>spec.faces==='all'||spec.faces.some(c=>yawGap(yaw,GAP_YAW[c])<=40),6);
}
// 2.11.25: Visual Twin paints ONE front edge per house and the side-wall pass skips edges that point the same way
// as the front (and everything beyond 230 m in the infill), so many walls stayed plain boxes. missingWallFaces()
// returns exactly the exposed edges no other pass paints; they get the same window grammar, with a per-house
// frame colour so streets do not repeat. Curated, landmark, mall and Kungsgatan houses are never touched here.
const PLAIN_FRAMES=Object.freeze(['#efe6d2','#e8e0cc','#f4efe2','#d9ccb2','#f1e6cf','#e2d6bd']);
const NEAR_DETAIL_RADIUS=170;
const sameEdgeXZ=(e,f)=>{const eq=(p,q)=>Math.abs(p[0]-q[0])<.02&&Math.abs(p[1]-q[1])<.02;return (eq(e.a,f.a)&&eq(e.q,f.q))||(eq(e.a,f.q)&&eq(e.q,f.a));};
export function isTwinHouse(b){
  return !!b&&Array.isArray(b.polygon)&&b.polygon.length>=3&&b.area>=60&&Math.max(3.2,b.h)>=5&&!GAP_FACADES[b.osm]&&!!visualTwinProfile(b)
    &&!PHOTO_REFERENCE_PROFILES[b.osm]&&!INNERSTAD_PROFILES[b.osm]&&!KUNGSGATAN_PROFILES[b.osm]&&!TORGET_AUDIT_IDS.has(b.osm)&&!IDENTITY_IDS.has(b.osm)&&!MALL_BUILDING_IDS.has(b.osm)&&!SOUTH_IDS.has(b.osm);
}
export function missingWallFaces(b,neighbours=[],lod='high',twinFront=true){
  if(!isTwinHouse(b))return [];
  const painted=[];
  // In the infill batch Visual Twin only draws the ground floor (ribbons:false), so the front needs windows too.
  const front=twinFront?visualTwinFront(b):null;if(front)painted.push(front);
  if(lod!=='low'||b.dist<SIDE_WALL_LOW_RADIUS)painted.push(...sideWallFaces(b,neighbours));
  return exposedFaces(b,neighbours,()=>true,5).filter(f=>!painted.some(e=>sameEdgeXZ(e,f)));
}
export function addMissingWalls(mesh,b,{neighbours=[],lod='high',twinFront=true}={}){
  const faces=missingWallFaces(b,neighbours,lod,twinFront);if(!faces.length)return 0;
  const frame=visualTwinProfile(b)?.frame||PLAIN_FRAMES[Math.abs((b.osm*2654435761)>>>0)%PLAIN_FRAMES.length];
  paintWindowFaces(mesh,b,faces,frame,lod==='low');
  return faces.length;
}
// Torget-audit houses keep their hand-built front, but their other exposed walls were plain boxes.
const AUDIT_FRONT_YAW=Object.freeze({south:0,east:90,north:180,west:-90});
export function auditSideFaces(b,neighbours=[]){
  const prof=TORGET_AUDIT_PROFILES[b?.osm];
  if(!prof||!Array.isArray(b.polygon)||b.polygon.length<3||Math.max(3.2,b.h)<5)return [];
  const front=AUDIT_FRONT_YAW[prof.front];
  return exposedFaces(b,neighbours,yaw=>!Number.isFinite(front)||yawGap(yaw,front)>40,6);
}
export function addAuditSideWalls(mesh,b,{neighbours=[]}={}){
  const faces=auditSideFaces(b,neighbours);if(!faces.length)return 0;
  paintWindowFaces(mesh,b,faces,auditFrame(b),false);
  return faces.length;
}
const auditFrame=b=>TORGET_AUDIT_PROFILES[b.osm]?.frame||'#e8e0cc';
// Safety net, run after every other facade pass: measure the geometry that was really drawn in front of each free
// wall and paint the walls that are still bare. Curated, Visual Twin and side-wall passes each choose their own
// edges, so a wall can fall between them; this closes any such gap without knowing which pass missed it.
const COVER_CELL=8,COVER_MIN_VERTICES=12;
function coverageGrid(meshes){
  const grid=new Map();
  for(const m of meshes){const p=m.positions;for(let i=0;i<p.length;i+=3){const k=Math.floor(p[i]/COVER_CELL)+','+Math.floor(p[i+2]/COVER_CELL);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(p[i],p[i+1],p[i+2]);}}
  return grid;
}
function edgeDetail(grid,f,h){
  let n=0;const mx=f.a[0]+f.tx*f.length/2,mz=f.a[1]+f.tz*f.length/2,r=f.length/2+1.5;
  for(let gx=Math.floor((mx-r)/COVER_CELL);gx<=Math.floor((mx+r)/COVER_CELL);gx++)for(let gz=Math.floor((mz-r)/COVER_CELL);gz<=Math.floor((mz+r)/COVER_CELL);gz++){
    const a=grid.get(gx+','+gz);if(!a)continue;
    for(let i=0;i<a.length;i+=3){
      const rx=a[i]-f.a[0],rz=a[i+2]-f.a[1],u=rx*f.tx+rz*f.tz,o=rx*f.nx+rz*f.nz,y=a[i+1];
      if(u>=0&&u<=f.length&&o>.03&&o<.5&&y>3.3&&y<h-.2&&++n>=COVER_MIN_VERTICES)return n;
    }
  }
  return n;
}
export function completeBlankWalls(mesh,buildings,{neighbours=[],reference=[],lod='high'}={}){
  const grid=coverageGrid([mesh,...reference]);let painted=0;
  for(const b of buildings){
    if(!b||!Array.isArray(b.polygon)||b.area<60||Math.max(3.2,b.h)<5)continue;
    if(KUNGSGATAN_PROFILES[b.osm]||IDENTITY_IDS.has(b.osm)||MALL_BUILDING_IDS.has(b.osm)||SOUTH_IDS.has(b.osm)||/PARKERING/i.test(b.name||''))continue;
    const h=Math.max(3.2,b.h),faces=exposedFaces(b,neighbours,()=>true,6).filter(f=>edgeDetail(grid,f,h)<COVER_MIN_VERTICES);
    if(!faces.length)continue;
    const frame=visualTwinProfile(b)?.frame||PHOTO_REFERENCE_PROFILES[b.osm]?.frame||INNERSTAD_PROFILES[b.osm]?.frame||TORGET_AUDIT_PROFILES[b.osm]?.frame||PLAIN_FRAMES[Math.abs((b.osm*2654435761)>>>0)%PLAIN_FRAMES.length];
    paintWindowFaces(mesh,b,faces,frame,lod==='low'&&!(b.dist<NEAR_DETAIL_RADIUS));painted+=faces.length;
  }
  return painted;
}
export function addGapFacades(mesh,b,{neighbours=[],lod='high'}={}){
  // Walls the side-wall pass already paints are skipped, so nothing is drawn twice.
  const done=lod==='low'&&!(b.dist<SIDE_WALL_LOW_RADIUS)?[]:sideWallFaces(b,neighbours);
  const faces=gapFaces(b,neighbours).filter(f=>!done.some(d=>d.a===f.a&&d.q===f.q));if(!faces.length)return 0;
  paintWindowFaces(mesh,b,faces,'#e8e0cc',lod==='low');
  return faces.length;
}
export function coreContourBuildings(buildings,max=CORE_CONTOUR_LIMIT){
  const ordinary=b=>b.dist<CORE_CONTOUR_RADIUS&&!IDENTITY_IDS.has(b.osm)&&!MALL_BUILDING_IDS.has(b.osm);
  return buildings.filter(b=>curatedRoute(b)||ordinary(b))
    .sort((a,b)=>Number(curatedRoute(b))-Number(curatedRoute(a))||a.dist-b.dist||a.osm-b.osm).slice(0,max);
}
const rgb=hex=>{
  const safe=/^#[0-9a-f]{6}$/i.test(String(hex||''))?String(hex):'#d8c8aa';
  return [parseInt(safe.slice(1,3),16)/255,parseInt(safe.slice(3,5),16)/255,parseInt(safe.slice(5,7),16)/255,1];
};
export function meshChunkRanges(vertexCount,maxVertices=48000){
  const safe=Math.max(3,Math.floor(maxVertices/3)*3),out=[];
  for(let start=0;start<vertexCount;start+=safe)out.push([start,Math.min(vertexCount,start+safe)]);
  return out;
}
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
  // Landmark/south buildings get curated name + street plaques from the identity layer.
  if(IDENTITY_IDS.has(b.osm)||SOUTH_IDS.has(b.osm))return 0;
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
    const vertexCount=this.positions.length/3,ranges=meshChunkRanges(vertexCount);
    if(ranges.length===1){
      const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(this.positions);mesh.setNormals(this.normals);mesh.setColors(this.colors);mesh.setIndices(this.indices);mesh.update(pc.PRIMITIVE_TRIANGLES);
      const e=new pc.Entity(name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)]});app.root.addChild(e);return e;
    }
    // iPhone/WebGL safety: ComicMesh writes unique vertices per triangle, so chunks can be
    // sliced on triangle boundaries with local sequential indices. This avoids giant
    // cross-building triangles when a driver falls back to 16-bit indices.
    const parent=new pc.Entity(name);app.root.addChild(parent);
    for(const [start,end] of ranges){
      const positions=this.positions.slice(start*3,end*3),normals=this.normals.slice(start*3,end*3),colors=this.colors.slice(start*4,end*4);
      const count=end-start,indices=Array.from({length:count},(_,i)=>i);
      const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(positions);mesh.setNormals(normals);mesh.setColors(colors);mesh.setIndices(indices);mesh.update(pc.PRIMITIVE_TRIANGLES);
      const child=new pc.Entity(name+' · del '+(parent.children.length+1));child.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)]});parent.addChild(child);
    }
    return parent;
  }
}

const FRIMURARE_OSM=101608925;

// Explicit hero facade for Frimurarelogen / Tingvallagatan 15.
// This intentionally bypasses generic photoReferenceFront() face detection: the north facade
// is known from OSM and the current Grekiska storefront already anchors to this exact building.
// The reference skin sits just outside the structural wall but behind the business overlay.
export function addFrimurareExplicitHero(mesh,b){
  if(!b||b.osm!==FRIMURARE_OSM)return false;
  const h=Math.max(9.6,b.h),minx=b.minx,maxx=b.maxx,minz=b.minz,maxz=b.maxz;
  const wall='#a58d84',frame='#cdbfb2',glass='#4e676b',stone='#8a8982',ink='#756b64',roof='#3f4d4b';
  const nz=minz-.22,sz=maxz+.22,wx=minx-.22,ex=maxx+.22;

  // Outward winding is deliberate: north=-Z, south=+Z, west=-X, east=+X.
  // hero2 had the north face reversed, so WebGL backface culling could hide the entire facade.
  const qN=(x0,y0,x1,y1,col,z=nz)=>mesh.quad([x1,y0,z],[x0,y0,z],[x0,y1,z],[x1,y1,z],col);
  const qS=(x0,y0,x1,y1,col,z=sz)=>mesh.quad([x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z],col);
  const qW=(z0,y0,z1,y1,col,x=wx)=>mesh.quad([x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0],col);
  const qE=(z0,y0,z1,y1,col,x=ex)=>mesh.quad([x,y0,z1],[x,y0,z0],[x,y1,z0],[x,y1,z1],col);

  const drawNorth=()=>{
    const width=maxx-minx,bays=9,bw=width/bays;
    qN(minx,.03,maxx,h-.03,wall);
    qN(minx,.03,maxx,3.08,stone);
    for(const y of [.55,1.12,1.69,2.26])qN(minx+.04,y,maxx-.04,y+.055,ink,nz-.015);
    // Strong classical string courses.
    qN(minx,3.02,maxx,3.24,frame,nz-.02);
    qN(minx,6.38,maxx,6.62,frame,nz-.02);
    qN(minx,h-.52,maxx,h-.25,roof,nz-.02);

    const center=Math.floor(bays/2);
    for(let i=0;i<bays;i++){
      const x0=minx+i*bw,x1=x0+bw,mid=(x0+x1)/2;
      // Ground level — Grekiska overlay remains in front because it sits at minz-.34.
      if(i!==center){
        qN(x0+bw*.20,.78,x1-bw*.20,2.72,frame,nz-.035);
        qN(x0+bw*.25,.88,x1-bw*.25,2.57,glass,nz-.05);
      }else{
        qN(x0+bw*.15,.48,x1-bw*.15,2.90,frame,nz-.04);
        qN(x0+bw*.22,.62,x1-bw*.22,2.78,'#344247',nz-.055);
      }
      // Piano nobile.
      qN(x0+bw*.19,3.66,x1-bw*.19,5.98,frame,nz-.04);
      qN(x0+bw*.25,3.78,x1-bw*.25,5.78,glass,nz-.055);
      qN(mid-.035,3.80,mid+.035,5.76,'#e7e0cf',nz-.065);
      qN(x0+bw*.17,5.72,x1-bw*.17,6.02,frame,nz-.065);
      // Upper floor / attic rhythm.
      qN(x0+bw*.25,6.92,x1-bw*.25,8.25,frame,nz-.04);
      qN(x0+bw*.31,7.02,x1-bw*.31,8.08,glass,nz-.055);
      // Paired pilasters are a defining feature of the real facade.
      if(i<bays-1)qN(x1-.12,3.20,x1+.12,h-.58,frame,nz-.075);
    }
    // Central risalit and crest.
    const cx=(minx+maxx)/2,rw=Math.min(7.2,width*.18);
    qN(cx-rw/2,3.18,cx+rw/2,h-.55,'#ad9489',nz-.018);
    qN(cx-rw*.46,3.66,cx+rw*.46,5.98,frame,nz-.085);
    qN(cx-rw*.39,3.79,cx+rw*.39,5.78,glass,nz-.10);
    qN(cx-1.25,8.38,cx+1.25,h-.62,frame,nz-.09);
    qN(cx-.48,8.62,cx+.48,9.06,'#986b50',nz-.11);
  };

  const drawSide=(face)=>{
    const z0=minz,z1=maxz,depth=z1-z0,bays=Math.max(4,Math.min(7,Math.round(depth/4.6))),bw=depth/bays;
    const q=face==='west'?qW:qE;
    q(z0,.03,z1,h-.03,wall);
    q(z0,.03,z1,3.08,stone);
    q(z0,3.02,z1,3.24,frame);
    q(z0,6.38,z1,6.62,frame);
    q(z0,h-.52,z1,h-.25,roof);
    for(let i=0;i<bays;i++){
      const a=z0+i*bw,e=a+bw;
      for(const [y0,y1] of [[.84,2.58],[3.72,5.74],[6.98,8.08]]){
        q(a+bw*.22,y0,e-bw*.22,y1,frame);
        q(a+bw*.29,y0+.10,e-bw*.29,y1-.12,glass);
      }
      if(i<bays-1)q(e-.10,3.18,e+.10,h-.58,frame);
    }
  };

  const drawSouth=()=>{
    const width=maxx-minx,bays=8,bw=width/bays;
    qS(minx,.03,maxx,h-.03,wall);qS(minx,.03,maxx,3.08,stone);
    qS(minx,3.02,maxx,3.24,frame);qS(minx,6.38,maxx,6.62,frame);qS(minx,h-.52,maxx,h-.25,roof);
    for(let i=0;i<bays;i++){
      const x0=minx+i*bw,x1=x0+bw;
      for(const [y0,y1] of [[.86,2.58],[3.74,5.72],[6.98,8.08]]){
        qS(x0+bw*.22,y0,x1-bw*.22,y1,frame);
        qS(x0+bw*.29,y0+.10,x1-bw*.29,y1-.12,glass);
      }
    }
  };

  drawNorth();drawSide('west');drawSide('east');drawSouth();
  return true;
}

// Graphics audit 2026-10-05: explicit real-centre treatment for the remaining blank
// Torget facades. These are deliberately hand-coded by OSM building id, just like the
// Kungsgatan reference pass. Every exposed side gets window/cornice rhythm so a player
// never meets a large empty beige/brown wall when circling Stora Torget.
export const TORGET_AUDIT_PROFILES=Object.freeze({
  101935889:Object.freeze({name:'Västra Torggatan 12',front:'west',style:'sv-vt12',wall:'#b77b70',frame:'#d2c0b2',glass:'#4a6368',ground:'#8f968f',accent:'#2f3435'}),
  107041955:Object.freeze({name:'Västra Torggatan 7',front:'east',style:'sv-vt7',wall:'#c4b7a8',frame:'#ded7cb',glass:'#4c6268',ground:'#696a65',accent:'#2c3335'}),
  101247031:Object.freeze({name:'Östra Torggatan 9',front:'east',style:'sv-ot9',wall:'#6f5750',frame:'#4d4744',glass:'#293f46',ground:'#332f2d',accent:'#8b7a68'}),
  101456562:Object.freeze({name:'Tingvallagatan 10',front:'south',style:'government',wall:'#d8c7a5',frame:'#efe4cc',glass:'#516b71',ground:'#8a8375',accent:'#9b794a'}),
  471365594:Object.freeze({name:'Tingvallagatan · Torget öst',front:'north',style:'brickcity',wall:'#b56f56',frame:'#e2ceb6',glass:'#516c73',ground:'#49443f',accent:'#6c7b67'})
});
export const TORGET_AUDIT_IDS=new Set(Object.keys(TORGET_AUDIT_PROFILES).map(Number));

export function addTorgetAuditFacade(mesh,b){
  const p=TORGET_AUDIT_PROFILES[b?.osm];if(!p)return false;
  const h=Math.max(7.2,b.h||9.6),minx=b.minx,maxx=b.maxx,minz=b.minz,maxz=b.maxz;
  const qN=(u0,y0,u1,y1,col,out=.18)=>{const z=minz-out;mesh.quad([minx+u1,y0,z],[minx+u0,y0,z],[minx+u0,y1,z],[minx+u1,y1,z],col);};
  const qS=(u0,y0,u1,y1,col,out=.18)=>{const z=maxz+out;mesh.quad([minx+u0,y0,z],[minx+u1,y0,z],[minx+u1,y1,z],[minx+u0,y1,z],col);};
  const qW=(u0,y0,u1,y1,col,out=.18)=>{const x=minx-out;mesh.quad([x,y0,minz+u0],[x,y0,minz+u1],[x,y1,minz+u1],[x,y1,minz+u0],col);};
  const qE=(u0,y0,u1,y1,col,out=.18)=>{const x=maxx+out;mesh.quad([x,y0,minz+u1],[x,y0,minz+u0],[x,y1,minz+u0],[x,y1,minz+u1],col);};
  const faces={north:{len:maxx-minx,q:qN},south:{len:maxx-minx,q:qS},west:{len:maxz-minz,q:qW},east:{len:maxz-minz,q:qE}};
  const front=p.front;

  // Street View pass 1. For these audited facades the real reference owns the street front.
  // Use shallow 3D boxes rather than zero-thickness quads so the details stay visible in Safari/WebGL.
  const frontBox=(u,y,w,hh,depth,colour,out=.20)=>{
    if(front==='east'||front==='west'){
      const x=front==='east'?maxx+out:minx-out,z=minz+u+w/2;
      mesh.box(x,y+hh/2,z,depth,hh,w,colour,colour);
    }else{
      const z=front==='south'?maxz+out:minz-out,x=minx+u+w/2;
      mesh.box(x,y+hh/2,z,w,hh,depth,colour,colour);
    }
  };
  const drawStreetViewFront=()=>{
    const len=faces[front].len;
    if(p.style==='sv-vt12'){
      // Västra Torggatan 12 · Street View 2017-05:
      // dusty rose upper facade, grey rusticated base, large arched shop windows and passage.
      frontBox(0,.02,len,h-.05,.18,p.wall,.17);
      frontBox(0,.04,len,3.08,.20,p.ground,.21);
      frontBox(0,3.00,len,.24,.22,p.frame,.24);
      frontBox(0,h-.42,len,.24,.22,p.frame,.23);
      const bays=Math.max(4,Math.min(6,Math.round(len/4.8))),bw=len/bays;
      for(let i=0;i<bays;i++){
        const u=i*bw+.22,w=Math.max(.75,bw-.44);
        // Ground-floor stone piers and large dark shop glazing.
        frontBox(u,.50,w,2.16,.14,p.frame,.29);
        frontBox(u+.12,.68,w-.24,1.76,.11,p.glass,.36);
        frontBox(u+.12,2.18,w-.24,.26,.11,'#31464b',.36);
        // Upper tall white-framed windows.
        frontBox(u+.15,3.72,w-.30,1.90,.13,p.frame,.28);
        frontBox(u+.26,3.84,w-.52,1.66,.10,'#667d80',.35);
        frontBox(u+w*.48,3.88,.07,1.58,.07,'#d8d5cc',.41);
        if(h>7.1){
          frontBox(u+.18,6.18,w-.36,1.48,.13,p.frame,.28);
          frontBox(u+.28,6.30,w-.56,1.23,.10,'#667d80',.35);
        }
      }
      // Central carriage passage/portal, visible landmark in the reference.
      const pw=Math.min(3.2,len*.18),pu=(len-pw)/2;
      frontBox(pu,.30,pw,2.63,.15,'#575a56',.41);
      frontBox(pu+.28,.46,pw-.56,2.30,.11,'#28363a',.47);
      return true;
    }
    if(p.style==='sv-vt7'){
      // Västra Torggatan 7 · Street View 2017-05:
      // calm beige facade, very tall narrow upper windows and oversized shop glazing.
      frontBox(0,.02,len,h-.05,.18,p.wall,.17);
      frontBox(0,.04,len,.50,.20,'#6c6d69',.22);
      const groundBays=Math.max(3,Math.min(5,Math.round(len/4.2))),gb=len/groundBays;
      for(let i=0;i<groundBays;i++){
        const u=i*gb+.18,w=Math.max(.75,gb-.36);
        frontBox(u,.62,w,2.24,.13,'#80786e',.27);
        frontBox(u+.10,.75,w-.20,1.98,.10,p.glass,.34);
      }
      frontBox(0,3.02,len,.16,.20,'#8f8981',.23);
      const cols=Math.max(4,Math.min(7,Math.round(len/3.0))),cw=len/cols;
      for(let i=0;i<cols;i++){
        const u=i*cw+.34,w=Math.max(.45,cw-.68);
        frontBox(u,3.52,w,2.05,.12,p.frame,.27);
        frontBox(u+.12,3.63,w-.24,1.82,.09,'#6f8588',.34);
        if(h>7.0){
          frontBox(u,6.10,w,1.68,.12,p.frame,.27);
          frontBox(u+.12,6.20,w-.24,1.46,.09,'#6f8588',.34);
        }
      }
      // Dark recessed entrance volume from the photographed Mitt i City frontage.
      const ew=Math.min(3.4,len*.22),eu=len-ew-.22;
      frontBox(eu,.36,ew,2.72,.18,'#222a2c',.43);
      frontBox(eu+.28,.55,ew-.56,2.25,.11,'#52666a',.50);
      frontBox(eu+.24,2.46,ew-.48,.30,.12,'#9e7f55',.51);
      return true;
    }
    if(p.style==='sv-ot9'){
      // Östra Torggatan 9 · Street View 2026-06:
      // dark brown cladding, broad dark window bands and a projecting glass/metal canopy.
      frontBox(0,.02,len,h-.05,.20,p.wall,.18);
      frontBox(0,.04,len,3.00,.22,p.ground,.23);
      const rows=Math.max(2,Math.min(4,Math.round((h-3.4)/2.35)));
      for(let r=0;r<rows;r++){
        const y=3.42+r*2.25;
        frontBox(.22,y,len-.44,1.16,.14,p.frame,.26);
        const cols=Math.max(3,Math.min(7,Math.round(len/4.1))),cw=(len-.44)/cols;
        for(let i=0;i<cols;i++){
          const u=.22+i*cw+.16,w=Math.max(.55,cw-.32);
          frontBox(u,y+.10,w,.94,.10,p.glass,.34);
        }
      }
      // Ground restaurant glazing and the glass canopy visible across the facade.
      const gb=Math.max(3,Math.min(7,Math.round(len/3.8))),bw=len/gb;
      for(let i=0;i<gb;i++){
        const u=i*bw+.14,w=Math.max(.58,bw-.28);
        frontBox(u,.48,w,2.12,.12,'#3d3b39',.30);
        frontBox(u+.08,.61,w-.16,1.79,.09,'#22373d',.37);
      }
      frontBox(.12,2.62,len-.24,.22,.38,'#70685f',.48);
      frontBox(.28,2.46,len-.56,.10,.72,'#98a0a0',.56);
      return true;
    }
    return false;
  };
  const hasStreetViewFront=drawStreetViewFront();

  const drawFace=(face)=>{
    const {len,q}=faces[face];if(len<2.4)return;
    if(hasStreetViewFront&&face===front)return;
    const isFront=face===front,baseH=p.style==='government'?3.15:3.0;
    q(0,.03,len,h-.03,p.wall,.16);
    q(0,.03,len,baseH,p.ground,.20);
    q(0,baseH-.08,len,baseH+.16,p.frame,.23);
    q(0,h-.48,len,h-.24,p.style==='arcade90'?'#4f5758':p.accent,.22);

    if(p.style==='government'){
      for(let y=.48;y<baseH-.22;y+=.58)q(.04,y,len-.04,y+.045,'#756f65',.24);
    }else if(p.style==='brickcity'||p.style==='merchant'){
      for(let y=baseH+.22;y<h-.70;y+=.72)q(.05,y,len-.05,y+.035,'#7d5748',.19);
    }

    // Ground floor: active shop/entrance rhythm only on the actual street front.
    if(isFront){
      const bays=Math.max(3,Math.min(10,Math.round(len/(p.style==='arcade90'?4.3:3.5)))),bw=len/bays;
      for(let i=0;i<bays;i++){
        const u=i*bw+.16,w=Math.max(.48,bw-.32);
        if(p.style==='government'&&i===Math.floor(bays/2)){
          q(u-.08,.50,u+w+.08,baseH-.20,p.frame,.31);
          q(u+.08,.68,u+w-.08,baseH-.38,'#334347',.35);
        }else{
          q(u,.56,u+w,baseH-.32,p.frame,.27);
          q(u+.10,.70,u+w-.10,baseH-.48,p.glass,.31);
        }
        if((p.style==='merchant'||p.style==='brickcity')&&i%2===0)q(u-.02,baseH-.44,u+w+.02,baseH-.18,p.accent,.36);
      }
      if(p.style==='arcade90'){
        q(.10,baseH-.08,len-.10,baseH+.34,'#596163',.38);
        for(let u=.32;u<len-.3;u+=Math.max(3.2,len/8))q(u,.30,u+.12,baseH+.16,p.frame,.39);
      }
    }else{
      const sideBays=Math.max(2,Math.min(7,Math.round(len/4.5))),bw=len/sideBays;
      for(let i=0;i<sideBays;i++){
        const u=i*bw+.38,w=Math.max(.42,bw-.76);
        q(u,.88,u+w,2.34,p.frame,.24);q(u+.08,.99,u+w-.08,2.18,p.glass,.28);
      }
    }

    // Upper floors: distinct real-city proportions instead of generic continuous window bands.
    const upperStart=baseH+.55,available=Math.max(2.0,h-upperStart-.78);
    const rows=Math.max(1,Math.min(4,Math.round(available/2.55))),rowH=available/rows;
    const cols=Math.max(3,Math.min(12,Math.round(len/(p.style==='arcade90'?3.8:3.15)))),cw=len/cols;
    for(let r=0;r<rows;r++){
      const y=upperStart+r*rowH+.18,wh=Math.max(.74,Math.min(1.55,rowH-.48));
      for(let i=0;i<cols;i++){
        const u=i*cw+.34,w=Math.max(.42,cw-.68);
        if(p.style==='arcade90'){
          q(u-.08,y-.08,u+w+.08,y+wh+.08,'#b9b1a6',.23);
          q(u,y,u+w,y+wh,p.glass,.28);
          if((i+r)%3===1)q(u-.12,y+wh+.13,u+w+.12,y+wh+.26,p.accent,.32);
        }else if(p.style==='classic'||p.style==='government'){
          q(u-.11,y-.11,u+w+.11,y+wh+.11,p.frame,.25);
          q(u,y,u+w,y+wh,p.glass,.30);
          q(u-.08,y+wh+.14,u+w+.08,y+wh+.25,p.frame,.31);
        }else{
          q(u-.08,y-.08,u+w+.08,y+wh+.08,p.frame,.24);
          q(u,y,u+w,y+wh,p.glass,.29);
        }
        q(u+w*.47,y+.04,u+w*.53,y+wh-.04,'#e2e4d9',.32);
      }
      if(p.style==='classic'||p.style==='government')q(.04,y+wh+.38,len-.04,y+wh+.48,p.accent,.22);
    }

    // Strong corner/pilaster language makes the block readable while turning around it.
    if(p.style==='classic'||p.style==='government'){
      q(.08,baseH+.18,.24,h-.58,p.frame,.34);
      q(len-.24,baseH+.18,len-.08,h-.58,p.frame,.34);
    }
  };

  drawFace('north');drawFace('south');drawFace('west');drawFace('east');
  return true;
}

export const ROAD_RENDER_LEVELS=Object.freeze({
  sidewalkBase:.045,
  sidewalk:.065,
  edge:.085,
  road:.105,
  pedestrian:.125,
  pedestrianMid:.145,
  seam:.165,
  square:.125,
  squareBase:.055,
  squareLine:.165
});

export function createCityArchitecture(pc,app,buildings,others=[]){
  const wallNeighbours=others.length?buildings.concat(others):buildings;
  const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveVertexColor=true;material.update();
  const road=new ComicMesh();
  // Sidewalks and their dark ink edges follow the same OSM polylines as the map.
  for(const s of CITY_STREETS)road.strip(s.points,s.width+4.7,ROAD_RENDER_LEVELS.sidewalkBase,'#637a72');
  for(const s of CITY_STREETS)road.strip(s.points,s.width+4.1,ROAD_RENDER_LEVELS.sidewalk,'#c0bda2');
  for(const s of CITY_STREETS)road.strip(s.points,s.width+.4,ROAD_RENDER_LEVELS.edge,'#33494c');
  for(const s of CITY_STREETS)if(!s.pedestrian)road.strip(s.points,s.width,ROAD_RENDER_LEVELS.road,'#667b7d');
  // 2.11: gågator syns tydligt — rosa stenläggning hela vägen mellan husen (som stadskartans
  // gågatufärg), mörka kantstenar bort, tvärgående fogar och en ljus mittlinje av plattor.
  for(const s of PEDESTRIAN_STREETS){
    road.strip(s.points,s.width+4.3,ROAD_RENDER_LEVELS.pedestrian,'#d6a39a');
    road.strip(s.points,s.width*.34,ROAD_RENDER_LEVELS.pedestrianMid,'#ead1c4');
    for(let i=1;i<s.points.length;i++){const [x,z]=s.points[i-1],[ex,ez]=s.points[i],d=Math.hypot(ex-x,ez-z);if(d<1)continue;const ux=(ex-x)/d,uz=(ez-z)/d,hw=(s.width+4.3)/2;
      for(let t=1.5;t<d;t+=3)road.strip([[x+ux*t-uz*hw,z+uz*t+ux*hw],[x+ux*t+uz*hw,z+uz*t-ux*hw]],.09,ROAD_RENDER_LEVELS.seam,'#b98a82');}
  }
  road.polygon(PEDESTRIAN_SQUARE.points,ROAD_RENDER_LEVELS.square,'#d6a39a');
  // The open paved square reaches the two Torggatan streets, not a fictitious central road.
  road.box(5,ROAD_RENDER_LEVELS.squareBase,3,128,.05,61,'#c9bc99');
  for(let x=-54;x<65;x+=8)road.strip([[x,-26],[x,32]],.035,ROAD_RENDER_LEVELS.squareLine,'#ada68e');
  for(let z=-22;z<32;z+=8)road.strip([[-58,z],[67,z]],.035,ROAD_RENDER_LEVELS.squareLine,'#ada68e');
  road.finish(pc,app,'Karlstad · verkliga gatustråk',material);

  const batches=[];const town=new ComicMesh();
  // 2.11.20 real-centre pass: all 95 admitted ordinary centre buildings use their real OSM footprints in one static batch.
  // Mitt i City stays separate so its four entrances and walkable interior are untouched.
  const contours=coreContourBuildings(buildings),contourIds=new Set(contours.map(b=>b.osm));let sideWalls=0;
  for(const b of contours){
    const seed=Math.abs((b.osm*2654435761)>>>0),twin=visualTwinProfile(b),wall=TORGET_AUDIT_PROFILES[b.osm]?.wall||PHOTO_REFERENCE_PROFILES[b.osm]?.wall||INNERSTAD_PROFILES[b.osm]?.wall||KUNGSGATAN_PROFILES[b.osm]?.wall||twin?.wall||CORE_WALLS[seed%CORE_WALLS.length],h=Math.max(3.2,b.h);

    // Frimurarelogen is a deterministic hero building. Do not route it through a separate
    // reference mesh: build the structural shell and all facade detail in the same known-good
    // town mesh so Safari/iPhone cannot lose it through a second material/render path.
    if(b.osm===FRIMURARE_OSM){
      // Root fix 2026-10-05: there used to be TWO Frimurarelogen renderers.
      // The legacy axis-aligned addFrimurareExplicitHero() path returned early here and
      // permanently bypassed the newer Street View/OSM-face renderer below. The facade
      // the player actually saw was therefore the old blank shell even while the modern
      // photo-reference profile was being updated.
      //
      // Keep one source of truth: structural OSM shell + addPhotoReferenceFacade() in
      // the SAME static town mesh used by the Kungsgatan pipeline.
      const fp=PHOTO_REFERENCE_PROFILES[b.osm];
      town.walls(b.polygon,0,h,fp?.wall||'#a58d84');
      town.walls(b.polygon,.04,.72,fp?.ground||'#8a8982',.035);
      town.polygon(b.polygon,h+.015,'#3f4d4b');
      addPhotoReferenceFacade(town,b);
      town.hip(b.cx,h+.02,b.cz,b.sx*.96,b.sz*.96,Math.min(3.8,Math.min(b.sx,b.sz)*.24),'#3f4d4b','#303f3e');
      continue;
    }

    town.walls(b.polygon,0,h,wall);
    town.walls(b.polygon,.04,.72,'#788a80',.035);
    const floors=Math.max(1,Math.min(5,Math.round(h/3.2)));
    for(let f=0;f<floors&&!TORGET_AUDIT_PROFILES[b.osm]&&!KUNGSGATAN_PROFILES[b.osm]&&!INNERSTAD_PROFILES[b.osm]&&!PHOTO_REFERENCE_PROFILES[b.osm]&&!twin;f++){const y=f*3.2+1.28;if(y+1.0<h-.55)town.walls(b.polygon,y,y+1.0,'#5d7a7c',.05);}
    town.polygon(b.polygon,h+.015,'#3b5155');
    addKungsgatanFacade(town,b);
    addInnerstadFacade(town,b);
    // Curated photo/Street View profiles use the exact Kungsgatan route: hand-built geometry in the main static town mesh.
    addPhotoReferenceFacade(town,b);
    addTorgetAuditFacade(town,b);
    if(!TORGET_AUDIT_PROFILES[b.osm])addVisualTwinFacade(town,b,{neighbours:buildings});
    sideWalls+=addSideWallFacades(town,b,{neighbours:wallNeighbours});
    sideWalls+=addGapFacades(town,b,{neighbours:wallNeighbours});
    sideWalls+=addMissingWalls(town,b,{neighbours:wallNeighbours});
    sideWalls+=addAuditSideWalls(town,b,{neighbours:wallNeighbours});
    if(b.tags['roof:shape']==='hipped')town.hip(b.cx,h+.02,b.cz,b.sx*.96,b.sz*.96,Math.min(3.8,Math.min(b.sx,b.sz)*.24),'#425a56','#314744');
    else if(b.tags['roof:shape']==='gabled'||(b.area<260&&b.sx<26&&b.sz<26))town.roof(b.cx,h+.02,b.cz,b.sx*.92,b.sz*.92,Math.min(3,Math.min(b.sx,b.sz)*.22),b.sx>b.sz?'x':'z');
  }
  // Reference houses outside the 64-house core still join the same static town batch.
  // This keeps detailed Drottninggatan work from increasing the generic draw-call budget.
  const outsideCore=[];
  for(const b of buildings){
    if(!INNERSTAD_REFERENCE_IDS.has(b.osm)||contourIds.has(b.osm))continue;
    outsideCore.push(b);
    const p=INNERSTAD_PROFILES[b.osm],h=Math.max(3.2,b.h);
    town.walls(b.polygon,0,h,p.wall);town.walls(b.polygon,.04,.72,'#788a80',.035);
    town.polygon(b.polygon,h+.015,'#3b5155');addInnerstadFacade(town,b);
    sideWalls+=addSideWallFacades(town,b,{neighbours:wallNeighbours});
    sideWalls+=addGapFacades(town,b,{neighbours:wallNeighbours});
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
    if(KUNGSGATAN_PROFILES[shop.osm]||INNERSTAD_PROFILES[shop.osm]||PHOTO_REFERENCE_PROFILES[shop.osm])continue; // Curated facade supplies the real glazing; readable identity signs still render separately.
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
  const wow=addCityWowPass(town,buildings);
  const addressPlates=addAddressPlates(town,buildings);
  sideWalls+=completeBlankWalls(town,[...contours,...outsideCore],{neighbours:wallNeighbours});
  town.finish(pc,app,'Karlstad · taklinjer, adresskyltar och gågatumöbler',material);
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
      if(b.osm===102496100){
        // Keep the central roof crown, but do not place an opaque stucco slab in front
        // of the illustrated Elite facade. The old .72 m deep white box hid the hotel's
        // central windows and made the entrance look like a blank billboard.
        m.roof(x,14.0,b.maxz-.7,10,3.5,2.8,'x');
      }
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
      // Residenset, from the reference photo: ochre render, grey rusticated ground floor, mansard roof with
      // dormers and a flag (see residenset-facade.mjs). Deliberately unlike the bright yellow Stadshotellet.
      const H=10.4;
      m.walls(b.polygon,0,H,RESIDENSET_COLOURS.wall);
      for(const f of exposedFaces({...b,h:H},[],()=>true,3.5))addResidensetWall(m,f,H);
      addResidensetRoof(m,{minx:b.minx,maxx:b.maxx,minz:b.minz,maxz:b.maxz,H});
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
      // Wermland Opera / Karlstads teater (1893): the real footprint extruded in white, a pedimented hall with the
      // photographed entrance front facing east, and a taller stage tower at the west end (see opera-facade.mjs).
      const H1=10.5,wing={...b,h:H1};
      m.walls(b.polygon,0,H1,OPERA_COLOURS.wall);m.walls(b.polygon,0,3.3,OPERA_COLOURS.rust,.04);
      m.walls(b.polygon,H1-.5,H1,OPERA_COLOURS.trim,.08);m.polygon(b.polygon,H1+.02,'#3a4448');
      const hallX1=-297.0,hallW=31,hallZ=-145.5,hallD=16,eaves=13.5;
      m.box(hallX1-hallW/2,eaves/2,hallZ,hallW,eaves,hallD,OPERA_COLOURS.wall,OPERA_COLOURS.wall);
      m.roof(hallX1-hallW/2,eaves,hallZ,hallW,hallD+.4,5.5,'x');
      const tw=15;m.box(b.minx+13.5,10,hallZ+2,tw,20,14,OPERA_COLOURS.wall,OPERA_COLOURS.wall);
      m.box(b.minx+13.5,20.15,hallZ+2,tw+.6,.3,14.6,OPERA_COLOURS.roof,OPERA_COLOURS.roof);
      addOperaFront(m,{x0:hallX1+.02,zc:hallZ,W:hallD});
      // Windows on every exposed wall of the wings and tower so the sides are not bare.
      const side=exposedFaces(wing,[],()=>true,5).filter(f=>f.nx<.7);
      paintWindowFaces(m,wing,side,OPERA_COLOURS.trim,false);
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
  const visualTwin=visualTwinAudit(buildings);
  return {streetWays:CITY_STREETS.length,landmarks:batches.length,contours:contours.length,sideWalls,addressPlates,visualTwin,wow,frimurareRenderer:'photo-reference-mainmesh',contourIds:Object.freeze([...contourIds]),staticDrawCalls:2+batches.length};
}

// 2.11: kvartersfyllnad — stadens övriga OSM-byggnader i samma tecknade stil (färgade väggar,
// mörk taklist, fönsterband per våning, sadeltak på små hus). Ett enda statiskt batch.
const INFILL_WALLS=['#e2cfa7','#d8b48b','#c98f6a','#e6dcc4','#b9a68a','#d7c39b','#c7a07a','#e9d9b6'];
export function infillMesh(buildings,mesh=new ComicMesh(),others=[]){
  const wallNeighbours=others.length?buildings.concat(others):buildings;
  for(const b of buildings){
    const seed=Math.abs((b.osm*2654435761)>>>0),twin=visualTwinProfile(b),wall=PHOTO_REFERENCE_PROFILES[b.osm]?.wall||twin?.wall||INFILL_WALLS[seed%INFILL_WALLS.length];
    const h=Math.max(3.2,b.h),poly=b.polygon;
    mesh.walls(poly,0,h,wall);
    mesh.walls(poly,h-.45,h,'#2b4448',.06);
    mesh.walls(poly,.02,.75,'#7d8c84',.04);
    const floors=Math.max(1,Math.round(h/3.2));
    if(!twin)for(let f=0;f<floors;f++){const y=f*3.2+1.25;if(y+1.1<h-.5)mesh.walls(poly,y,y+1.1,'#5d7a7c',.05);}
    mesh.polygon(poly,h+.01,'#3e5357');
    addPhotoReferenceFacade(mesh,b);
    addVisualTwinFacade(mesh,b,{lod:'low',neighbours:buildings,ribbons:false});
    addSideWallFacades(mesh,b,{neighbours:wallNeighbours,lod:'low'});
    if(b.area<260&&b.sx<26&&b.sz<26)mesh.roof(b.cx,h+.02,b.cz,b.sx*.92,b.sz*.92,Math.min(3,Math.min(b.sx,b.sz)*.22),b.sx>b.sz?'x':'z');
  }
  return mesh;
}
// Windows for kvartersfyllnad live in their own batch: the base infill mesh is already at the 16-bit vertex budget.
export function infillWindowsMesh(buildings,mesh=new ComicMesh(),others=[],reference=[]){
  const wallNeighbours=others.length?buildings.concat(others):buildings;
  for(const b of buildings){
    const lod=b.dist<NEAR_DETAIL_RADIUS?'high':'low';
    if(GAP_FACADES[b.osm]){addGapFacades(mesh,b,{neighbours:wallNeighbours,lod});continue;}
    addMissingWalls(mesh,b,{neighbours:wallNeighbours,lod,twinFront:false});
    if(lod==='low'&&!(b.dist<SIDE_WALL_LOW_RADIUS)&&!isTwinHouse(b))addSideWallFacades(mesh,b,{neighbours:wallNeighbours,lod:'low',force:true});
  }
  completeBlankWalls(mesh,buildings,{neighbours:wallNeighbours,reference,lod:'low'});
  return mesh;
}
export function createInfill(pc,app,buildings,others=[]){
  const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveVertexColor=true;material.update();
  const mesh=infillMesh(buildings,new ComicMesh(),others);if(!mesh.indices.length)return {buildings:0,addressPlates:0,staticDrawCalls:0};
  const addressPlates=addAddressPlates(mesh,buildings);
  mesh.finish(pc,app,'Karlstad · kvartersfyllnad med adresskyltar',material);
  const windows=infillWindowsMesh(buildings,new ComicMesh(),others,[mesh]);let windowDrawCalls=0;
  if(windows.indices.length){windows.finish(pc,app,'Karlstad · kvartersfyllnad fönster',material);windowDrawCalls=meshChunkRanges(windows.positions.length/3).length;}
  return {buildings:buildings.length,addressPlates,visualTwin:visualTwinAudit(buildings),triangles:(mesh.indices.length+windows.indices.length)/3,windowTriangles:windows.indices.length/3,staticDrawCalls:1+windowDrawCalls};
}
