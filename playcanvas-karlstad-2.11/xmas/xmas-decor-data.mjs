// Julklappsjakten: var julens fasta föremål står (granen, marknadsstånden, små granar, tomtar vid stånden). Ren modul utan DOM och utan
// PlayCanvas, så att utläggen kan kontrolleras i test: inget står ovanpå paketen, tomten, spawn eller grundspelets bänkar och lyktor.
//
// Stånden och granarna står på en ring runt granen utanför introduktionens spiral (spiralen börjar på 27 m och går inåt), så ingenting
// hindrar den som följer paketen. Stånden är fasta föremål (kollisionsrutor som läggs in före rutnätet byggs), granarna är bara utsmyckning.
import {TREE,INTRO,TORGET_PROPS,distanceToPath} from './xmas-layout.mjs?v=2.21.1-xmas.1';

export const RING={r:33.5,bearings:Object.freeze([20,65,110,155,205,250,295,340])};
export const STALL=Object.freeze({w:3.2,d:1.9,h:2.55});
// Varje stånd har en säljare (tomtevariant, se TOMTE_STYLES), en skylt och en färg på markisen.
export const STALL_KINDS=Object.freeze([
  {sign:'GLÖGG',awning:'#c93a3a',goods:'#8f2d56',tomte:4},
  {sign:'PEPPARKAKOR',awning:'#3f8f5f',goods:'#c98a45',tomte:5},
  {sign:'JULKLAPPAR',awning:'#3c6fb2',goods:'#e0b53f',tomte:1},
  {sign:'VARMA VAFFLOR',awning:'#d88a2c',goods:'#f1dfb2',tomte:0},
  {sign:'GRANKRANSAR',awning:'#c93a3a',goods:'#2f7a4f',tomte:2},
  {sign:'STICKAT',awning:'#7b4aa6',goods:'#d9d2c4',tomte:3},
  {sign:'NÖTTER OCH MANDEL',awning:'#3f8f5f',goods:'#a8743c',tomte:5},
  {sign:'TOMTENS VERKSTAD',awning:'#3c6fb2',goods:'#c93a3a',tomte:1}
]);

// Portalen i norra änden av torget: ses bakom granen från startpunkten och ger en tydlig riktning att orientera sig mot.
export const ARCH=Object.freeze({x:0,z:-33.5,half:4.2,post:.55,h:5.6});
const rad=d=>d*Math.PI/180;
const at=(b,r)=>({x:+(r*Math.sin(rad(b))).toFixed(1),z:+(-r*Math.cos(rad(b))).toFixed(1)});
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Stånden vänder sig mot granen längs den axel där de ligger längst bort (så att rutorna blir exakta).
export function buildStalls(){
  return RING.bearings.map((b,i)=>{
    const p=at(b,RING.r),alongX=Math.abs(p.x)>Math.abs(p.z);
    const fx=alongX?-Math.sign(p.x):0,fz=alongX?0:-Math.sign(p.z);
    const hw=STALL.w/2,hd=STALL.d/2;
    const rect=alongX?{minx:p.x-hd,maxx:p.x+hd,minz:p.z-hw,maxz:p.z+hw}:{minx:p.x-hw,maxx:p.x+hw,minz:p.z-hd,maxz:p.z+hd};
    const kind=STALL_KINDS[i%STALL_KINDS.length];
    return {id:'stall-'+i,x:p.x,z:p.z,fx,fz,yaw:Math.round(Math.atan2(-fx,-fz)*180/Math.PI),rect,kind,
      seller:{x:+(p.x-fx*(hd+.35)).toFixed(2),z:+(p.z-fz*(hd+.35)).toFixed(2)}};
  });
}
export const STALLS=Object.freeze(buildStalls());

// Små granar mellan stånden: första förslaget, därefter en liten sökning så att de inte hamnar på något.
export function buildFirs(){
  const taken=[...STALLS.map(s=>({x:s.x,z:s.z,min:4.5})),...TORGET_PROPS.map(([x,z])=>({x,z,min:2.8})),{x:INTRO.spawn.x,z:INTRO.spawn.z,min:6},{x:INTRO.tomte.x,z:INTRO.tomte.z,min:6}];
  const path=[{x:INTRO.spawn.x,z:INTRO.spawn.z},...INTRO.packages.filter(p=>p.kind==='regular'),{x:INTRO.tomte.x,z:INTRO.tomte.z}];
  const out=[];
  for(let k=0;k<8;k++){
    const b0=RING.bearings[k]+22.5;let best=null;
    for(const dr of [0,1.5,3,-1.5])for(const db of [0,4,-4,8,-8]){
      const c=at(b0+db,RING.r+dr+.5);
      if(taken.some(t=>near(c,t)<t.min)||out.some(o=>near(c,o)<7))continue;
      if(distanceToPath(c,path)<5)continue;
      if(Math.abs(c.x)>46||c.z<-37||c.z>37)continue;
      best=c;break;
    }
    if(best)out.push({id:'fir-'+k,x:best.x,z:best.z,h:4.6+((k*7)%3)*.5});
  }
  return out;
}
export const FIRS=Object.freeze(buildFirs());

// Tomtar som står still och gör torget levande: vid granen, på presenterna vid foten, bredvid de små granarna och bakom stånden.
// Fler spots (fönster, tak) räknas fram ur byggnaderna när spelet startar.
export function buildTomteSpots(){
  const spots=[];
  const add=(kind,x,z,y,v,scale)=>spots.push({id:kind+'-'+spots.length,kind,x:+x.toFixed(2),z:+z.toFixed(2),y,v,scale});
  for(const [x,z,v] of [[-4.2,2.6,0],[2.4,-5.0,3],[4.6,4.8,2]])add('ground',x,z,0,v,1);
  for(const [x,z,y,v] of [[-4.5,-1.6,.05,5],[3.9,-2.7,.05,1]])add('ground',x,z,y,v,.8);          // vid presenthögarna
  FIRS.forEach((f,i)=>{const a=(i*137)%360*Math.PI/180;add('fir',f.x+Math.sin(a)*1.5,f.z+Math.cos(a)*1.5,0,(i+2)%6,.85);});
  for(const s of STALLS)spots.push({id:s.id+'-seller',kind:'stall',x:s.seller.x,z:s.seller.z,y:0,v:s.kind.tomte,scale:.95});
  return spots;
}
export const TOMTE_SPOTS=Object.freeze(buildTomteSpots());

// Kollisionsrutor för det som är fast: granen (stammen) och stånden. Samma form som grundspelets partnerytor (places-space.mjs).
export function xmasColliders(){
  // Namnlösa: grundspelet sätter ett namnskylt på varje namngiven ruta, och julens egna föremål har egna skyltar.
  const box=(id,label,r,h)=>{const cx=(r.minx+r.maxx)/2,cz=(r.minz+r.maxz)/2;return {precise:false,osm:'xmas-'+id,name:'',label,tags:{},cx,cz,dist:Math.hypot(cx,cz),area:(r.maxx-r.minx)*(r.maxz-r.minz),sx:r.maxx-r.minx,sz:r.maxz-r.minz,h,height:h,minx:r.minx-.15,maxx:r.maxx+.15,minz:r.minz-.15,maxz:r.maxz+.15};};
  const k=TREE.collider,q=ARCH.post/2;
  return [box('tree','Julgranen',{minx:TREE.x-k,maxx:TREE.x+k,minz:TREE.z-k,maxz:TREE.z+k},TREE.height),...STALLS.map(s=>box(s.id,'Julmarknad · '+s.kind.sign,s.rect,STALL.h)),
    ...[-1,1].map(side=>box('arch-'+side,'Julportal',{minx:ARCH.x+side*ARCH.half-q,maxx:ARCH.x+side*ARCH.half+q,minz:ARCH.z-q,maxz:ARCH.z+q},ARCH.h))];
}

// ── Fasader runt torget ────────────────────────────────────────────────────────────────────────────────────────────
// Ur byggnadernas fotavtryck (grundspelets kollisionsrutor med polygon) väljs de väggar som vetter mot torget. Där hänger ljusslingor,
// tomtefönster (fasta kort längs väggen) och tomtar på takkanten. Valet är deterministiskt, så att det ser likadant ut för alla.
export const FACADE={maxDist:96,minLength:9,stringY:3.4,stringSpacing:1.5,windowYs:Object.freeze([3.5,6.7]),stringLimit:22,windowLimit:14,roofLimit:6,bulbCap:520,bulb:.4};
const hash=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
export function facadeSpots(colliders,{origin={x:0,z:0},limits={}}={}){
  const L={...FACADE,...limits},edges=[],roofs=[];
  for(const c of colliders||[]){
    if(!c||!Array.isArray(c.polygon)||c.polygon.length<3)continue;
    const id=String(c.osm);if(id.startsWith('xmas-')||id.startsWith('partner-'))continue;
    const h=c.h||c.height||0;if(h<7)continue;
    const poly=c.polygon;let cx=0,cz=0;for(const q of poly){cx+=q[0];cz+=q[1];}cx/=poly.length;cz/=poly.length;
    let bestV=null,bestD=Infinity;
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      const dv=Math.hypot(a[0]-origin.x,a[1]-origin.z);if(dv<bestD){bestD=dv;bestV=a;}
      const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<L.minLength)continue;
      const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;
      let nx=dz/len,nz=-dx/len;if(nx*(mx-cx)+nz*(mz-cz)<0){nx=-nx;nz=-nz;}
      const d=Math.hypot(mx-origin.x,mz-origin.z);if(d>L.maxDist)continue;
      if(nx*(origin.x-mx)+nz*(origin.z-mz)<=.25*d)continue;
      edges.push({id,ax:a[0],az:a[1],bx:b[0],bz:b[1],mx,mz,nx,nz,len,h,d});
    }
    if(bestV&&bestD<=L.maxDist&&h>=10){
      const ix=cx-bestV[0],iz=cz-bestV[1],il=Math.hypot(ix,iz)||1;
      roofs.push({id:'roof-'+id,osm:id,x:+(bestV[0]+ix/il*1.1).toFixed(2),z:+(bestV[1]+iz/il*1.1).toFixed(2),y:h,d:bestD});
    }
  }
  edges.sort((p,q)=>p.d-q.d||p.id.localeCompare(q.id));
  const strings=edges.slice(0,L.stringLimit).map(e=>({...e,ax:e.ax+e.nx*.14,az:e.az+e.nz*.14,bx:e.bx+e.nx*.14,bz:e.bz+e.nz*.14,y:L.stringY}));
  const windows=[];
  for(const e of edges){
    if(windows.length>=L.windowLimit)break;
    for(const f of [.3,.7]){
      if(windows.length>=L.windowLimit)break;
      const x=e.ax+(e.bx-e.ax)*f+e.nx*.22,z=e.az+(e.bz-e.az)*f+e.nz*.22;
      if(windows.some(w=>Math.hypot(w.x-x,w.z-z)<11))continue;
      const k=hash(e.id+':'+f);
      const y=e.h>=13?L.windowYs[k%2]:L.windowYs[0];
      windows.push({id:'win-'+windows.length,x:+x.toFixed(2),z:+z.toFixed(2),y,nx:e.nx,nz:e.nz,yaw:Math.round(Math.atan2(e.nx,e.nz)*180/Math.PI),v:k%3});
    }
  }
  roofs.sort((p,q)=>p.d-q.d||p.id.localeCompare(q.id));
  const roofSpots=[];for(const r of roofs){if(roofSpots.length>=L.roofLimit)break;if(roofSpots.some(o=>Math.hypot(o.x-r.x,o.z-r.z)<18))continue;roofSpots.push({...r,id:'roof-'+roofSpots.length,kind:'roof',v:hash(r.osm)%6,scale:2.3});}
  return {strings,windows,roofs:roofSpots};
}
// Lampor längs en slinga: punkter på jämna avstånd med en liten hängning mellan fästena (var tredje meter).
export function stringBulbs(s,spacing=FACADE.stringSpacing){
  const n=Math.max(2,Math.round(s.len/spacing)),out=[];
  for(let i=0;i<=n;i++){
    const u=i/n,seg=3.3/s.len,w=(u%seg)/seg,sag=.34*4*w*(1-w);
    out.push({x:s.ax+(s.bx-s.ax)*u,z:s.az+(s.bz-s.az)*u,y:s.y-sag,i});
  }
  return out;
}
