import {VISUAL_STREETS as CITY_STREETS} from './city-streets.mjs?v=2.18.2';
import {KUNGSGATAN_PROFILES} from './kungsgatan-reference.mjs?v=2.18.2';
import {INNERSTAD_PROFILES} from './innerstad-reference.mjs?v=2.18.2';
import {PHOTO_REFERENCE_PROFILES} from './photo-reference-pass3.mjs?v=2.18.2';

// Karlstad Visual Twin: one data-driven facade system for ordinary city buildings.
// Curated Street View/reference facades always win. Generated profiles are deliberately
// marked "inferred" until a facade has been checked against a real visual reference.

const DNA=Object.freeze({
  'KUNGSGATAN':Object.freeze({archetype:'mixed-centre',wall:['#d9d1c3','#c98b72','#e7e1d5'],frame:'#eee6d5',glass:'#46656c',ground:'#30383a',accent:'#496c7f',retail:true,balcony:true}),
  'DROTTNINGGATAN':Object.freeze({archetype:'shopping-brick',wall:['#bf7656','#a95e47','#d3a06f'],frame:'#ddc8ad',glass:'#405f66',ground:'#2d3435',accent:'#6d8069',retail:true,awning:true}),
  'VÄSTRA TORGGATAN':Object.freeze({archetype:'heritage-shopping',wall:['#dfd4c4','#c97858','#ece7dc'],frame:'#f3eadb',glass:'#405d63',ground:'#4c4a44',accent:'#567b6a',retail:true,pilasters:true}),
  'ÖSTRA TORGGATAN':Object.freeze({archetype:'retail-grid',wall:['#c78361','#d8b18b','#e4ddd0'],frame:'#e9dcc8',glass:'#45646b',ground:'#303839',accent:'#3f6f78',retail:true}),
  'TINGVALLAGATAN':Object.freeze({archetype:'classic-centre',wall:['#e5d7bd','#d3b185','#c9936d'],frame:'#f1e7d3',glass:'#49666c',ground:'#5b554b',accent:'#816b53',retail:true,pilasters:true}),
  'VÄSTRA KYRKOGATAN':Object.freeze({archetype:'civic-pale',wall:['#eadfc9','#d9c4a3','#f0e8d8'],frame:'#f7edd9',glass:'#526b70',ground:'#6c695e',accent:'#8a7960',pilasters:true}),
  'ÖSTRA KYRKOGATAN':Object.freeze({archetype:'civic-pale',wall:['#e6d9c2','#d7c3a2','#eee6d6'],frame:'#f6ecd8',glass:'#526b70',ground:'#69665c',accent:'#81735e',pilasters:true}),
  'JÄRNVÄGSGATAN':Object.freeze({archetype:'station-urban',wall:['#c6b39a','#b98a69','#d5cec1'],frame:'#e5dccd',glass:'#405e66',ground:'#343b3d',accent:'#596f78',retail:true}),
  'HAMNGATAN':Object.freeze({archetype:'harbour-mixed',wall:['#d7c6ad','#c88462','#d9d8cd'],frame:'#e9e2d5',glass:'#4f7076',ground:'#4a514d',accent:'#658a83',retail:true}),
  'NORRA STRANDGATAN':Object.freeze({archetype:'riverfront',wall:['#e1d2b6','#d7b68e','#c58b68'],frame:'#eee5d3',glass:'#4c6c72',ground:'#5a5d55',accent:'#667e77',balcony:true}),
  'MUSEIGATAN':Object.freeze({archetype:'heritage-river',wall:['#e6d9c3','#c88a69','#d7bd98'],frame:'#f0e4d1',glass:'#516d70',ground:'#605c52',accent:'#7a6b59',pilasters:true}),
  'TULLHUSGATAN':Object.freeze({archetype:'south-centre',wall:['#d7c8af','#c48a68','#e2d7c4'],frame:'#eadfcd',glass:'#4c696e',ground:'#505650',accent:'#647d76',retail:true}),
  'TRÄDGÅRDSGATAN':Object.freeze({archetype:'south-centre',wall:['#d9c9b0','#c59170','#e6dcc9'],frame:'#eee3d1',glass:'#4c696e',ground:'#53574f',accent:'#6a8176'}),
  'TOLAGSGATAN':Object.freeze({archetype:'south-centre',wall:['#d1bea3','#bd8667','#ded5c4'],frame:'#e8decc',glass:'#4b676d',ground:'#4d534e',accent:'#617971'}),
  'KARLBERGSGATAN':Object.freeze({archetype:'residential-urban',wall:['#d9c8aa','#c99370','#e5dac5'],frame:'#eee4d2',glass:'#506d72',ground:'#66675d',accent:'#72867b',balcony:true}),
  'ENESTRÖMSGATAN':Object.freeze({archetype:'residential-urban',wall:['#d8c6aa','#c18d6c','#e3d8c4'],frame:'#eee4d2',glass:'#506d72',ground:'#62645b',accent:'#71857a',balcony:true})
});
const FALLBACK=Object.freeze({archetype:'karlstad-mixed',wall:['#ddcbae','#c78d6b','#e4d9c5','#d0b58e'],frame:'#eee3cf',glass:'#4d696e',ground:'#555950',accent:'#687f76'});
const normalName=s=>String(s||'').trim().toLocaleUpperCase('sv-SE');
const hardCurated=b=>!!(KUNGSGATAN_PROFILES[b.osm]||INNERSTAD_PROFILES[b.osm]);
const hasPhotoReference=b=>!!PHOTO_REFERENCE_PROFILES[b.osm];
const curated=(b,{allowPhotoReference=false}={})=>!!(hardCurated(b)||(!allowPhotoReference&&hasPhotoReference(b)));
const PHOTO_FACE_NORMALS=Object.freeze({north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]});
const hash=id=>Math.abs(((Number(id)||0)*2654435761)>>>0);

function nearestStreet(b){
  const preferred=normalName(b.tags?.['addr:street']);
  let best=null;
  for(const street of CITY_STREETS){
    const exact=preferred&&normalName(street.name)===preferred;
    if(preferred&&!exact)continue;
    for(let i=1;i<street.points.length;i++){
      const [x,z]=street.points[i-1],[ex,ez]=street.points[i],dx=ex-x,dz=ez-z,den=dx*dx+dz*dz||1;
      const t=Math.max(0,Math.min(1,((b.cx-x)*dx+(b.cz-z)*dz)/den)),qx=x+t*dx,qz=z+t*dz,d2=(b.cx-qx)**2+(b.cz-qz)**2;
      if(!best||d2<best.d2)best={street,qx,qz,d2};
    }
  }
  if(!best&&preferred){
    const clone={...b,tags:{...(b.tags||{})}};delete clone.tags['addr:street'];
    return nearestStreet(clone);
  }
  return best;
}

export function visualTwinProfile(b,options={}){
  if(!b||curated(b,options))return null;
  const street=normalName(b.tags?.['addr:street']||nearestStreet(b)?.street?.name);
  const base=DNA[street]||FALLBACK,seed=hash(b.osm),walls=base.wall;
  return Object.freeze({...base,street:street||'KARLSTAD',wall:walls[seed%walls.length],surveyStatus:'inferred',variant:seed%7});
}

export function visualTwinFront(b,options={}){
  if(!b||curated(b,options)||!Array.isArray(b.polygon)||b.polygon.length<3)return null;
  const target=nearestStreet(b);if(!target||target.d2>75*75)return null;
  const vx=target.qx-b.cx,vz=target.qz-b.cz,vlen=Math.hypot(vx,vz)||1,desired=[vx/vlen,vz/vlen],candidates=[];
  let area=0;for(let i=0;i<b.polygon.length;i++){const a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length];area+=a[0]*q[1]-q[0]*a[1];}
  const ccw=area>0;
  for(let i=0;i<b.polygon.length;i++){
    let a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);if(length<4.2)continue;
    let tx=dx/length,tz=dz/length,nx=ccw?tz:-tz,nz=ccw?-tx:tx;
    if(nx*desired[0]+nz*desired[1]<0){[a,q]=[q,a];tx=-tx;tz=-tz;nx=-nx;nz=-nz;}
    const mx=(a[0]+q[0])/2,mz=(a[1]+q[1])/2,streetD=Math.hypot(mx-target.qx,mz-target.qz),facing=nx*desired[0]+nz*desired[1];
    if(facing<.30)continue;
    candidates.push({a,q,length,tx,tz,nx,nz,street:target.street.name,streetD,facing});
  }
  return candidates.sort((a,b)=>a.streetD-b.streetD||b.facing-a.facing||b.length-a.length)[0]||null;
}

function edgeStreetExposure(b,maxDistance=18){
  if(!b||!Array.isArray(b.polygon)||b.polygon.length<3)return [];
  let area=0;for(let i=0;i<b.polygon.length;i++){const a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length];area+=a[0]*q[1]-q[0]*a[1];}
  const ccw=area>0,out=[];
  for(let i=0;i<b.polygon.length;i++){
    let a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);if(length<5.2)continue;
    let tx=dx/length,tz=dz/length,nx=ccw?tz:-tz,nz=ccw?-tx:tx;
    const mx=(a[0]+q[0])/2,mz=(a[1]+q[1])/2;let best=null;
    for(const street of CITY_STREETS)for(let j=1;j<street.points.length;j++){
      const [sx,sz]=street.points[j-1],[ex,ez]=street.points[j],sdx=ex-sx,sdz=ez-sz,den=sdx*sdx+sdz*sdz||1;
      const t=Math.max(0,Math.min(1,((mx-sx)*sdx+(mz-sz)*sdz)/den)),qx=sx+t*sdx,qz=sz+t*sdz,vx=qx-mx,vz=qz-mz,d2=vx*vx+vz*vz;
      if(d2>maxDistance*maxDistance)continue;const vl=Math.hypot(vx,vz)||1,facing=(nx*vx+nz*vz)/vl;
      if(facing<.22)continue;
      if(!best||d2<best.d2)best={street,qx,qz,d2,facing};
    }
    if(best)out.push({a,q,length,tx,tz,nx,nz,street:best.street.name,streetD:Math.sqrt(best.d2),facing:best.facing});
  }
  return out.sort((a,b)=>a.streetD-b.streetD||b.length-a.length);
}
function sameEdge(a,b){
  if(!a||!b)return false;
  const d1=Math.hypot(a.a[0]-b.a[0],a.a[1]-b.a[1])+Math.hypot(a.q[0]-b.q[0],a.q[1]-b.q[1]);
  const d2=Math.hypot(a.a[0]-b.q[0],a.a[1]-b.q[1])+Math.hypot(a.q[0]-b.a[0],a.q[1]-b.a[1]);
  return Math.min(d1,d2)<1.2;
}
function photoReferenceProtectedEdge(b,e){
  const p=PHOTO_REFERENCE_PROFILES[b?.osm];if(!p||!e)return false;
  return [p.front,...(p.extraFaces||[])].some(face=>{
    const n=PHOTO_FACE_NORMALS[face];return !!n&&(e.nx*n[0]+e.nz*n[1])>.78;
  });
}
export function visualTwinStreetEdges(b,maxDistance=18){return edgeStreetExposure(b,maxDistance);}

function polygonEdges(b,minLength=5.2){
  if(!b||!Array.isArray(b.polygon)||b.polygon.length<3)return [];
  let area=0;for(let i=0;i<b.polygon.length;i++){const a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length];area+=a[0]*q[1]-q[0]*a[1];}
  const ccw=area>0,out=[];
  for(let i=0;i<b.polygon.length;i++){
    let a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);if(length<minLength)continue;
    let tx=dx/length,tz=dz/length,nx=ccw?tz:-tz,nz=ccw?-tx:tx;
    out.push({a,q,length,tx,tz,nx,nz,street:'',streetD:Infinity,facing:1});
  }
  return out;
}
function pointInPoly(x,z,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];
    const hit=((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi||1e-9)+xi);
    if(hit)inside=!inside;
  }
  return inside;
}
function edgeBlockedByNeighbour(edge,b,neighbours=[]){
  if(!Array.isArray(neighbours)||!neighbours.length)return false;
  let hits=0,total=0;
  for(const t of [.22,.5,.78]){
    const x=edge.a[0]+(edge.q[0]-edge.a[0])*t+edge.nx*1.05;
    const z=edge.a[1]+(edge.q[1]-edge.a[1])*t+edge.nz*1.05; total++;
    let blocked=false;
    for(const n of neighbours){
      if(!n||n.osm===b.osm||!Array.isArray(n.polygon)||n.polygon.length<3)continue;
      if(x<n.minx-1.4||x>n.maxx+1.4||z<n.minz-1.4||z>n.maxz+1.4)continue;
      if(pointInPoly(x,z,n.polygon)){blocked=true;break;}
    }
    if(blocked)hits++;
  }
  return hits>=2;
}
export function visualTwinExposedEdges(b,neighbours=[]){
  return polygonEdges(b,6.5).filter(e=>!edgeBlockedByNeighbour(e,b,neighbours));
}

export function visualTwinGroundMode(b,options={}){
  const p=visualTwinProfile(b,options);if(!p)return 'none';
  const a=p.archetype||'',v=p.variant||0;
  if(p.retail){
    if(/heritage|classic/.test(a))return v%2?'heritage-retail':'cafe';
    return ['retail','retail','cafe','office'][v%4];
  }
  if(/civic|heritage/.test(a))return 'heritage';
  if(/residential|riverfront/.test(a))return v%3===0?'mixed':'residential';
  if(/office|station/.test(a))return 'office';
  return ['mixed','residential','office'][v%3];
}

export function visualTwinFaceYaw(b){
  const e=visualTwinFront(b);if(!e)return null;
  if(Math.abs(e.nx)>Math.abs(e.nz))return e.nx>0?90:-90;
  return e.nz>0?0:180;
}

export function addVisualTwinFacade(mesh,b,options={}){
  const photo=PHOTO_REFERENCE_PROFILES[b?.osm]||null;
  const profileOptions=photo?{allowPhotoReference:true}:{};
  const inferred=visualTwinProfile(b,profileOptions);
  const p=photo&&inferred?Object.freeze({...inferred,wall:photo.wall,frame:photo.frame,glass:photo.glass,ground:photo.ground,accent:photo.accent}):inferred;
  let edge=photo?null:visualTwinFront(b,profileOptions);
  if(photo&&p){
    const street=edgeStreetExposure(b,18).filter(e=>!photoReferenceProtectedEdge(b,e));
    const exposed=visualTwinExposedEdges(b,options.neighbours||[])
      .filter(e=>!photoReferenceProtectedEdge(b,e)&&!street.some(s=>sameEdge(s,e)));
    edge=[...street,...exposed].sort((a,b)=>(a.streetD??Infinity)-(b.streetD??Infinity)||b.length-a.length)[0]||null;
  }
  if(!p||!edge)return false;
  const {a,length,tx,tz,nx,nz}=edge,h=Math.max(3.2,b.h),low=options.lod==='low',groundMode=visualTwinGroundMode(b,profileOptions);
  // The solid OSM wall is already rendered in this profile's wall colour. Bias only
  // the detail layer outward so large facade sheets never compete in the depth buffer.
  const FACE_BIAS=.07;
  const point=(u,y,out)=>[a[0]+tx*u+nx*(out+FACE_BIAS),y,a[1]+tz*u+nz*(out+FACE_BIAS)];
  // Wind the quad so it faces along the edge normal. OSM rings digitised the other way round give an edge whose
  // tangent runs against that rule; the old fixed order then produced back faces that vanished from the street.
  const faceOut=(tx*nz-tz*nx)>0;
  const panel=(u,y,w,ph,colour,out=.10)=>{if(w<=.08||ph<=.08)return;const A=point(u,y,out),B=point(u+w,y,out),C=point(u+w,y+ph,out),D=point(u,y+ph,out);if(faceOut)mesh.quad(A,B,C,D,colour);else mesh.quad(B,A,D,C,colour);};
  const drawGroundFloor=(compact=false)=>{
    const len=length,v=p.variant||0,stone=['#a7a496','#bbb4a3','#8e938c','#c3b7a2'][v%4];
    const bays=Math.max(2,Math.min(compact?4:10,Math.round(len/(groundMode==='residential'?4.1:3.35)))),bw=len/bays;
    // Every building gets a distinct plinth + cornice so the lower facade does not read as
    // the same generic strip repeated across Karlstad.
    panel(.04,.05,Math.max(.3,len-.08),.34,groundMode==='heritage'?stone:p.ground,.12);
    panel(.08,2.94,Math.max(.3,len-.16),.16,groundMode==='heritage'?p.frame:p.accent,.18);

    if(groundMode==='residential'){
      const door=Math.max(0,Math.min(bays-1,(v*3)%bays));
      for(let i=0;i<bays;i++){
        const u=i*bw+.18,w=Math.max(.36,bw-.36);
        if(i===door){
          const dw=Math.min(.92,w*.72),du=u+(w-dw)/2;
          panel(du-.08,.42,dw+.16,2.36,p.frame,.18);panel(du,.52,dw,2.15,'#3b4b4b',.21);
          panel(du+dw*.16,1.70,dw*.68,.10,p.accent,.24);
        }else{
          panel(u,.72,w,1.55,p.frame,.16);panel(u+.08,.80,Math.max(.22,w-.16),1.38,p.glass,.19);
        }
      }
      panel(.10,.40,Math.max(.3,len-.20),.12,stone,.16);
    }else if(groundMode==='heritage'){
      const door=Math.max(0,Math.min(bays-1,(v+1)%bays));
      for(let i=0;i<bays;i++){
        const u=i*bw+.13,w=Math.max(.40,bw-.26);
        panel(u-.07,.48,w+.14,2.22,p.frame,.17);
        if(i===door){
          panel(u,.58,w,2.04,'#394646',.21);panel(u+w*.42,.72,.08,1.76,p.accent,.23);
        }else{
          panel(u,.63,w,1.76,p.glass,.20);panel(u,.63,w,.15,stone,.22);panel(u,2.24,w,.15,stone,.22);
        }
        if(i<bays-1)panel(Math.max(.02,(i+1)*bw-.05),.28,.10,2.56,stone,.21);
      }
    }else if(groundMode==='office'){
      const door=Math.max(0,Math.min(bays-1,Math.floor(bays/2)+(v%2?1:-1)));
      for(let i=0;i<bays;i++){
        const u=i*bw+.10,w=Math.max(.38,bw-.20);
        panel(u,.58,w,2.15,'#34474b',.17);
        panel(u+.08,.68,Math.max(.22,w-.16),1.95,i===door?'#607c80':p.glass,.20);
        if(i%2===0)panel(u+w*.48,.68,.06,1.95,p.frame,.22);
      }
      panel(.08,2.70,Math.max(.3,len-.16),.18,p.frame,.22);
    }else{
      // retail, cafe and mixed: storefronts share a datum but vary bay width, doors,
      // awnings and solid panels. This avoids a repeated "same shop" silhouette.
      const door=Math.max(0,Math.min(bays-1,(v*2+1)%bays));
      for(let i=0;i<bays;i++){
        const u=i*bw+.10,w=Math.max(.38,bw-.20),solid=groundMode==='mixed'&&((i+v)%4===0);
        if(i===door){
          const dw=Math.min(1.0,w*.68),du=u+(w-dw)/2;
          panel(du-.07,.48,dw+.14,2.38,p.frame,.21);panel(du,.58,dw,2.16,'#2c3b3f',.24);
        }else if(solid){
          panel(u,.48,w,2.32,p.wall,.18);panel(u+.16,1.08,Math.max(.20,w-.32),.88,p.glass,.21);
        }else{
          panel(u,.55,w,2.20,p.ground,.18);panel(u+.08,.67,Math.max(.22,w-.16),1.92,p.glass,.22);
          if((i+v)%2===0)panel(u+w*.50,.67,.055,1.92,p.frame,.24);
        }
      }
      if(groundMode==='cafe'){
        for(let i=0;i<bays;i+=2){const u=i*bw+.16,w=Math.min(len-u-.16,bw*1.45);if(w>.45)panel(u,2.54,w,.20,(i+v)%4?'#884f43':p.accent,.31);}
      }else if(p.awning||groundMode==='retail'){
        panel(.18,2.66,Math.max(.4,len-.36),.20,p.accent,.28);
      }
      if(groundMode==='mixed'){
        const signW=Math.min(3.8,Math.max(1.5,len*.22)),su=Math.max(.2,len-signW-.45);
        panel(su,2.48,signW,.24,'#d1ad6b',.31);
      }
    }
  };

  if(low){
    drawGroundFloor(true);
    // options.ribbons===false: the caller paints real windows on every upper floor, so skip the long glass bands.
    const floors=options.ribbons===false?0:Math.max(1,Math.min(4,Math.round(h/3.2)-1)),rowH=Math.max(2.5,(h-3.55)/Math.max(1,floors));
    for(let row=0;row<floors;row++){
      const y=3.72+row*rowH;
      panel(.26,y,Math.max(.3,length-.52),Math.max(.58,Math.min(.92,rowH-.7)),p.glass,.15);
      panel(.20,y-.10,Math.max(.3,length-.40),.07,p.frame,.17);
    }
  }else{
    drawGroundFloor(false);
    panel(0,h-.34,length,.28,p.frame,.13);

    const floors=Math.max(1,Math.min(6,Math.round(h/3.2)-1)),upperY=3.55,rowH=Math.max(2.45,(h-upperY-.25)/floors);
    const spacing=p.archetype.includes('heritage')?2.55:p.archetype.includes('urban')?2.9:3.05;
    const cols=Math.max(3,Math.min(16,Math.round(length/spacing))),cw=length/cols;
    for(let row=0;row<floors;row++){
      const y=upperY+row*rowH+.18,wh=Math.max(.72,Math.min(1.72,rowH-.55));
      for(let col=0;col<cols;col++){
        const inset=Math.min(.36,cw*.18),u=col*cw+inset,ww=Math.max(.40,cw-inset*2);
        panel(u-.08,y-.08,ww+.16,wh+.16,p.frame,.15);
        panel(u,y,ww,wh,p.glass,.18);
        panel(u+.06,y+.07,Math.max(.16,ww*.43),Math.max(.35,wh-.14),'#789397',.20);
        if(p.pilasters&&col===0)panel(Math.max(.02,u-.22),y-.16,.12,wh+.32,p.frame,.22);
      }
      if(p.balcony&&row%2===0){
        const bw=Math.min(length*.32,5.8),u=Math.max(.3,(length-bw)/2);
        panel(u-.22,y-.22,bw+.44,.10,p.accent,.31);
        for(let x=u;x<u+bw;x+=.55)panel(x,y-.20,.035,.58,p.accent,.33);
      }
    }
    if(p.pilasters){
      const step=Math.max(5.5,length/5);
      for(let u=.12;u<length-.12;u+=step)panel(u,.22,.10,Math.max(.5,h-.55),p.frame,.21);
    }
  }

  const streetSecondary=edgeStreetExposure(b,18).filter(e=>!sameEdge(e,edge)&&!photoReferenceProtectedEdge(b,e));
  const exposedFallback=visualTwinExposedEdges(b,options.neighbours||[])
    .filter(e=>!sameEdge(e,edge)&&!photoReferenceProtectedEdge(b,e)&&!streetSecondary.some(s=>sameEdge(s,e)))
    .sort((a,b)=>b.length-a.length);
  const secondary=(low&&options.ribbons===false)?[]:[...streetSecondary,...exposedFallback].slice(0,low?2:3);

  for(const e of secondary){
    const ep=(u,y,out)=>[e.a[0]+e.tx*u+e.nx*out,y,e.a[1]+e.tz*u+e.nz*out];
    const eOut=(e.tx*e.nz-e.tz*e.nx)>0;
    const eq=(u,y,w,ph,colour,out=.11)=>{if(w<=.08||ph<=.08)return;const A=ep(u,y,out),B=ep(u+w,y,out),C=ep(u+w,y+ph,out),D=ep(u,y+ph,out);if(eOut)mesh.quad(A,B,C,D,colour);else mesh.quad(B,A,D,C,colour);};
    // Give even gable/side walls a visible architectural frame before adding windows.
    eq(.08,.10,Math.max(.3,e.length-.16),.36,p.ground,.12);
    eq(.10,3.02,Math.max(.3,e.length-.20),.12,p.frame,.13);
    eq(.10,h-.36,Math.max(.3,e.length-.20),.18,p.frame,.13);
    const floors=Math.max(1,Math.min(low?3:5,Math.round(h/3.2)-1)),rowH=Math.max(2.5,(h-3.45)/floors);
    if(low){
      // Mobile LOD: broad ribbons + sparse mullions keep a readable facade at a fraction
      // of the vertices required by individual framed windows.
      for(let row=0;row<floors;row++){
        const y=3.68+row*rowH+.12,wh=Math.max(.58,Math.min(.92,rowH-.78));
        eq(.28,y,Math.max(.35,e.length-.56),wh,p.glass,.16);
        eq(.22,y-.08,Math.max(.35,e.length-.44),.065,p.frame,.18);
        const mullions=Math.max(1,Math.min(4,Math.round(e.length/6.5)));
        for(let m=1;m<=mullions;m++){
          const u=e.length*m/(mullions+1);
          eq(u-.035,y,.07,wh,p.frame,.19);
        }
      }
    }else{
      const cols=Math.max(2,Math.min(12,Math.round(e.length/3.15))),cw=e.length/cols;
      for(let row=0;row<floors;row++){
        const y=3.58+row*rowH+.14,wh=Math.max(.65,Math.min(1.45,rowH-.62));
        for(let col=0;col<cols;col++){
          if(!e.street&&((col+row+(p.variant||0))%5===0))continue;
          const inset=Math.min(.34,cw*.20),u=col*cw+inset,ww=Math.max(.36,cw-inset*2);
          eq(u-.05,y-.05,ww+.10,wh+.10,p.frame,.14);eq(u,y,ww,wh,p.glass,.17);
        }
      }
    }
    eq(.06,.14,.10,Math.max(.6,h-.42),p.frame,.18);
    eq(Math.max(.12,e.length-.16),.14,.10,Math.max(.6,h-.42),p.frame,.18);
  }
  return true;
}

export function visualTwinAudit(buildings=[]){
  let curatedCount=0,generated=0,unresolved=0;
  for(const b of buildings){
    if(curated(b)){curatedCount++;continue;}
    if(visualTwinProfile(b)&&visualTwinFront(b))generated++;else unresolved++;
  }
  return Object.freeze({curated:curatedCount,generated,unresolved,total:buildings.length});
}

export const VISUAL_TWIN_STREET_DNA=DNA;
