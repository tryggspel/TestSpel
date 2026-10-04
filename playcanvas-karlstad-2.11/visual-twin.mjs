import {CITY_STREETS} from './city-streets.mjs?v=2.11.17';
import {KUNGSGATAN_PROFILES} from './kungsgatan-reference.mjs?v=2.11.17';
import {INNERSTAD_PROFILES} from './innerstad-reference.mjs?v=2.11.17';

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
const curated=b=>!!(KUNGSGATAN_PROFILES[b.osm]||INNERSTAD_PROFILES[b.osm]);
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

export function visualTwinProfile(b){
  if(!b||curated(b))return null;
  const street=normalName(b.tags?.['addr:street']||nearestStreet(b)?.street?.name);
  const base=DNA[street]||FALLBACK,seed=hash(b.osm),walls=base.wall;
  return Object.freeze({...base,street:street||'KARLSTAD',wall:walls[seed%walls.length],surveyStatus:'inferred',variant:seed%7});
}

export function visualTwinFront(b){
  if(!b||curated(b)||!Array.isArray(b.polygon)||b.polygon.length<3)return null;
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

export function visualTwinFaceYaw(b){
  const e=visualTwinFront(b);if(!e)return null;
  if(Math.abs(e.nx)>Math.abs(e.nz))return e.nx>0?90:-90;
  return e.nz>0?0:180;
}

export function addVisualTwinFacade(mesh,b){
  const p=visualTwinProfile(b),edge=visualTwinFront(b);if(!p||!edge)return false;
  const {a,length,tx,tz,nx,nz}=edge,h=Math.max(3.2,b.h);
  const point=(u,y,out)=>[a[0]+tx*u+nx*out,y,a[1]+tz*u+nz*out];
  const panel=(u,y,w,ph,colour,out=.10)=>{if(w<=.08||ph<=.08)return;mesh.quad(point(u,y,out),point(u+w,y,out),point(u+w,y+ph,out),point(u,y+ph,out),colour);};

  panel(0,.04,length,h-.04,p.wall,.07);
  panel(0,.05,length,.46,p.ground,.11);
  panel(0,3.08,length,.16,p.frame,.13);
  panel(0,h-.34,length,.28,p.frame,.13);

  const retail=!!p.retail,groundCount=Math.max(2,Math.min(10,Math.round(length/(retail?3.3:4.2)))),gw=length/groundCount;
  for(let col=0;col<groundCount;col++){
    const u=col*gw+.13,w=Math.max(.42,gw-.26);
    panel(u,.57,w,2.32,retail?p.ground:p.frame,.15);
    panel(u+.10,.70,Math.max(.25,w-.20),1.98,p.glass,.18);
    if(retail&&col%3===1)panel(u+w*.43,.70,.09,1.98,p.frame,.20);
  }
  if(p.awning)panel(.20,2.77,Math.max(.5,length-.40),.28,p.accent,.34);

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
