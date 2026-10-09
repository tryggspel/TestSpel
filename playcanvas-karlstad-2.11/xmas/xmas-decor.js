// Julklappsjakten: julens miljö kring Stora Torget. Allt fast byggs en gång av färgade trianglar (samma teknik som stadens egna byggnader,
// ComicMesh) och slås ihop till få ritanrop: granen, stånden, små granar och presenter i en mesh, ljusen i tre (som blinkar var för sig),
// stjärnan i en. Tomtar, tomtefönster och snöfall är bildkort och en enda dynamisk mesh. Inga ljuskällor, ingen fysik och inga nya ytor
// som kan flimra; snön på marken och taken är ett färgfilter (xmas-snow.mjs) som redan är aktivt när stadens byggnader skapas.
import {ComicMesh} from '../city-architecture.js?v=2.21.1-xmas.4';
import {TREE} from './xmas-layout.mjs?v=2.21.1-xmas.4';
import {STALLS,STALL,FIRS,TOMTE_SPOTS,ARCH,facadeSpots,stringBulbs,FACADE} from './xmas-decor-data.mjs?v=2.21.1-xmas.4';
import {WEATHER} from './xmas-config.mjs?v=2.21.1-xmas.4';
import {createSnowfall} from './xmas-snowfall.js?v=2.21.1-xmas.4';
import {drawWindowAtlas,WINDOW_CELL,WINDOW_STYLES} from './xmas-art.js?v=2.21.1-xmas.4';
import {hash32} from './xmas-sprites.js?v=2.21.1-xmas.4';

const TAU=Math.PI*2;
const BULB_COLORS=Object.freeze({A:['#ff4d4d','#ff8fb1','#ff7a3d'],B:['#fff2a8','#ffe27a','#ffd1a0'],C:['#7dffb0','#7fd2ff','#b9a8ff']});
const TIERS=Object.freeze([{y:3.0,h:3.7,r:4.7},{y:5.0,h:3.5,r:3.95},{y:7.0,h:3.3,r:3.25},{y:9.0,h:3.1,r:2.55},{y:11.0,h:2.9,r:1.9},{y:12.9,h:2.6,r:1.25}]);
export const TREE_TOP=15.5;
const radiusAt=y=>{let r=0;for(const t of TIERS)if(y>=t.y&&y<=t.y+t.h)r=Math.max(r,t.r*(1-(y-t.y)/t.h));return r;};

// ── Små byggstenar ─────────────────────────────────────────────────────────────────────────────────────────────────
function cone(m,x,y,z,r,h,seg,c1,c2){
  for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;m.tri([x+Math.cos(a0)*r,y,z+Math.sin(a0)*r],[x,y+h,z],[x+Math.cos(a1)*r,y,z+Math.sin(a1)*r],i%2?c1:c2);}
}
function gem(m,x,y,z,r,colour,shade){
  const t=[x,y+r,z],b=[x,y-r,z],p=[[x+r,y,z],[x,y,z+r],[x-r,y,z],[x,y,z-r]];
  for(let i=0;i<4;i++){const a=p[i],c=p[(i+1)%4];m.tri(a,t,c,i%2?colour:shade);m.tri(c,b,a,i%2?shade:colour);}
}
function star(m,cx,cy,cz,R,thick,colour,shade,plane='xy'){
  const pts=[];for(let i=0;i<10;i++){const r=i%2?R*.45:R,a=-Math.PI/2+i*Math.PI/5;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}
  const P=(q,side)=>plane==='xy'?[cx+q[0],cy+q[1],cz+side]:[cx+side,cy+q[1],cz+q[0]];
  const c0=P([0,0],thick),c1=P([0,0],-thick);
  for(let i=0;i<10;i++){
    const a=pts[i],b=pts[(i+1)%10];
    m.tri(c0,P(a,0),P(b,0),colour);                       // framsida (ihålig mot spetsen = pyramid)
    m.tri(c1,P(b,0),P(a,0),shade);                       // baksida
  }
}
class Lights{
  constructor(cap){this.mesh={A:new ComicMesh(true),B:new ComicMesh(true),C:new ComicMesh(true)};this.n=0;this.cap=cap;}
  add(g,x,y,z,s=.17,i=0){if(this.n>=this.cap)return false;const cols=BULB_COLORS[g];this.mesh[g].box(x,y,z,s,s,s,cols[i%cols.length]);this.n++;return true;}
}

// ── Granen ───────────────────────────────────────────────────────────────────────────────────────────────────────
function buildTree(m,L){
  const x=TREE.x,z=TREE.z;
  m.box(x,1.6,z,.95,3.2,.95,'#6a4630','#553826');
  cone(m,x,.02,z,3.6,.7,16,'#f7fbff','#e6eff6');                                  // snöhög runt foten
  for(const t of TIERS){
    cone(m,x,t.y,z,t.r,t.h,14,'#2f7a4f','#3b8f5f');
    cone(m,x,t.y+t.h*.64,z,t.r*.36,t.h*.36,10,'#f7fbff','#e4eef6');            // snö i toppen på varje etage
    // snötofsar längs den nedre kanten
    for(let k=0;k<7;k++){const a=k/7*TAU+t.y,rr=t.r*.88;gem(m,x+Math.cos(a)*rr,t.y+.22,z+Math.sin(a)*rr,.2,'#f7fbff','#dfeaf3');}
  }
  // kulor
  const balls=[['#d93a3a','#a82a2a'],['#3c6fb2','#2a5189'],['#f2c744','#c99d28'],['#c9d3dc','#97a6b3'],['#8f2d56','#6c2040']];
  TIERS.forEach((t,ti)=>{
    const n=Math.max(5,Math.round(t.r*2.1));
    for(let k=0;k<n;k++){const a=k/n*TAU+ti*.7,fy=t.y+t.h*(.16+.09*(k%3)),rr=t.r*(1-(fy-t.y)/t.h)+.07,[c1,c2]=balls[(k+ti)%balls.length];gem(m,x+Math.cos(a)*rr,fy,z+Math.sin(a)*rr,.27,c1,c2);}
  });
  // guldig girlang i spiral
  for(let s=0;s<=1;s+=.0062){const y=3.2+s*11.4,rr=radiusAt(y)+.1,a=s*TAU*5.3;m.box(x+Math.cos(a)*rr,y,z+Math.sin(a)*rr,.19,.19,.19,Math.round(s*190)%2?'#ffd45a':'#f4f0e6');}
  // presenter vid foten (utanför stammens kollisionsruta)
  const gifts=[[2.6,0.5,.9,'#d94a4a','#ffe9a6'],[3.4,1.8,.8,'#3f9462','#fff1ce'],[2.2,-1.9,.75,'#4a86c9','#fff1ce'],[-2.7,.9,.95,'#8a5bb8','#ffe9a6'],[-3.1,-1.5,.7,'#ffcf3f','#d94a4a'],[-1.0,3.1,.85,'#ee9a3e','#fff1ce'],[1.2,-3.2,.8,'#f4efe3','#d94a4a'],[-2.0,-3.0,.65,'#d94a4a','#fff1ce']];
  for(const [gx,gz,s,c1,c2] of gifts){
    m.box(x+gx,s/2,z+gz,s,s,s,c1);
    m.box(x+gx,s/2,z+gz,s+.04,s+.04,.13,c2);m.box(x+gx,s/2,z+gz,.13,s+.04,s+.04,c2);
    m.box(x+gx,s+.1,z+gz,.3,.2,.3,c2);
  }
}
function buildFir(m,L,f,idx){
  const k=f.h/4.6,x=f.x,z=f.z;
  m.box(x,.25,z,.9,.5,.9,'#a33a32','#8c2e28');m.box(x,.75,z,.24,.5,.24,'#6a4630');
  const tiers=[[.7,2.0,1.55],[1.8,1.8,1.2],[2.8,1.6,.85]];
  tiers.forEach(([y,h,r],ti)=>{
    cone(m,x,y*k+.2,z,r*k,h*k,10,'#2f7a4f','#3b8f5f');cone(m,x,(y+h*.62)*k+.2,z,r*k*.36,h*k*.38,8,'#f7fbff','#e4eef6');
    for(let n=0;n<7;n++){const a=n/7*TAU+ti,rr=r*k*.6,yy=(y+h*.28)*k+.2;L.add('ABC'[(n+ti)%3],x+Math.cos(a)*rr,yy,z+Math.sin(a)*rr,.15,n+idx);}
  });
  gem(m,x,(2.8+1.6)*k+.38,z,.2,'#ffd45a','#e0a920');
}

// ── Portalen i norr ─────────────────────────────────────────────────────────────────────────────────────────────────
function buildArch(m,L){
  const {x,z,half,post,h}=ARCH;
  for(const side of [-1,1]){
    m.box(x+side*half,h/2,z,post,h,post,'#7a2d2d','#5f2222');
    m.box(x+side*half,h+.18,z,post+.2,.36,post+.2,'#f7fbff');                                  // snö på stolpen
    m.box(x+side*half,.3,z,post+.4,.6,post+.4,'#f7fbff');                                      // snö kring foten
    for(let i=0;i<5;i++)m.box(x+side*half,.7+i*(h-1)/5,z+post/2+.02,post+.04,.1,.04,i%2?'#f6f1e6':'#c93a3a');   // randig stolpe
  }
  m.box(x,h-.1,z,half*2+post,.28,.3,'#2f7a4f');                                                // granrisbalk
  m.box(x,h+.08,z,half*2+post,.14,.34,'#f7fbff');
  for(let i=0;i<=16;i++){const lx=x-half+i*(half*2/16);L.add('ABC'[i%3],lx,h-.38-Math.sin(i/16*Math.PI)*.18,z+.2,.22,i);}
}

// ── Stånden ────────────────────────────────────────────────────────────────────────────────────────────────────────
function buildStall(m,L,s,idx){
  const alongX=s.fx!==0,tx=alongX?0:1,tz=alongX?1:0,hw=STALL.w/2,hd=STALL.d/2;
  const W=(lx,lz)=>[s.x+tx*lx+s.fx*lz,s.z+tz*lx+s.fz*lz];
  const box=(lx,y,lz,w,h,d,c1,c2)=>{const [wx,wz]=W(lx,lz);m.box(wx,y,wz,alongX?d:w,h,alongX?w:d,c1,c2||c1);};
  const quad=(a,b,c,d,col)=>m.quad(a,b,c,d,col);
  const P=(lx,lz,y)=>{const [wx,wz]=W(lx,lz);return [wx,y,wz];};
  const wood='#8a5e3b',dark='#6e4a2f',plank='#b98a5b',snow='#f7fbff';
  box(0,.06,0,STALL.w,.12,STALL.d,'#7a5a3d');                                // golv
  box(0,.58,hd-.45,STALL.w-.1,.95,.8,wood,dark);                             // disk
  box(0,1.09,hd-.45,STALL.w,.07,.95,plank);box(0,1.14,hd-.45,STALL.w-.12,.04,.8,snow); // bänkskiva med snö
  box(0,1.2,-hd+.04,STALL.w-.05,2.2,.08,'#7f6446',dark);                     // bakvägg
  for(const sx of [-1,1])for(const sz of [-1,1])box(sx*(hw-.07),1.25,sz*(hd-.07),.13,2.5,.13,dark);   // stolpar
  // tak: lutar framåt, ränder i markisens färg och vitt, snö på bakre delen
  const yB=2.75,yF=2.42,lzB=-hd-.12,lzF=hd+.32,N=8,x0=-hw-.14,x1=hw+.14,stripe=(x1-x0)/N;
  for(let i=0;i<N;i++){
    const a=x0+i*stripe,b=a+stripe,col=i%2?'#f6f1e6':s.kind.awning;
    quad(P(a,lzB,yB),P(b,lzB,yB),P(b,lzF,yF),P(a,lzF,yF),col);
    quad(P(a,lzB,yB+.02),P(b,lzB,yB+.02),P(b,lzB+(lzF-lzB)*.62,yB+(yF-yB)*.62+.025),P(a,lzB+(lzF-lzB)*.62,yB+(yF-yB)*.62+.025),snow);
  }
  // kappa längs framkanten
  const M=N*2,vs=(x1-x0)/M;
  for(let i=0;i<M;i++){const a=x0+i*vs,b=a+vs,col=i%2?'#f6f1e6':s.kind.awning;quad(P(a,lzF,yF),P(b,lzF,yF),P(b,lzF,yF-.3),P(a,lzF,yF-.3),col);}
  // varor på disken
  for(let i=0;i<6;i++){const lx=-1.2+i*.48,k=hash32(s.id+i),h=.12+(k%4)*.06,col=i%2?s.kind.goods:['#d94a4a','#3f9462','#ffcf3f','#f4efe3','#4a86c9'][k%5];box(lx,1.18+h/2,hd-.45,.34,h,.34,col);}
  // lampor längs kappan
  for(let i=0;i<=M;i+=1){const lx=x0+i*vs,[wx,wz]=W(lx,lzF+.04);L.add('ABC'[(i+idx)%3],wx,yF-.06,wz,.15,i);}
}

// ── Allt tillsammans ─────────────────────────────────────────────────────────────────────────────────────────────────
export function createXmasDecor(pc,host,{root,texture,labelTex,indoors=null,params=null},sprites){
  const app=host.app;
  const decorRoot=new pc.Entity('Julmiljö');root.addChild(decorRoot);
  const vertexMat=(name,{cull=pc.CULLFACE_NONE}={})=>{const m=new pc.StandardMaterial();m.name=name;m.useLighting=false;m.diffuse.set(0,0,0);m.emissive.set(1,1,1);m.emissiveVertexColor=true;m.cull=cull;m.update();return m;};
  const staticMat=vertexMat('Jul fast'),lightMats={A:vertexMat('Jul ljus A'),B:vertexMat('Jul ljus B'),C:vertexMat('Jul ljus C')},starMat=vertexMat('Jul stjärna');
  const keep=ComicMesh.snow;ComicMesh.snow=null; // julens egna föremål har egna färger (och egen snö); filtret är till för stadens ytor
  const S=new ComicMesh(true),L=new Lights(FACADE.bulbCap+260),T=new ComicMesh(true),stats={bulbs:0,strings:0,windows:0,roofs:0};
  let facade={strings:[],windows:[],roofs:[]};
  try{
    buildTree(S,L);
    for(let i=0;i<FIRS.length;i++)buildFir(S,L,FIRS[i],i);
    for(let i=0;i<STALLS.length;i++)buildStall(S,L,STALLS[i],i);
    buildArch(S,L);
    // ljus på granen: tre ringar per etage, tre grupper som blinkar för sig
    TIERS.forEach((t,ti)=>{for(let k=0;k<12;k++){const a=k/12*TAU+ti*.5,fy=t.y+t.h*.42+((k%2)*.25),rr=t.r*(1-(fy-t.y)/t.h)+.12;L.add('ABC'[k%3],TREE.x+Math.cos(a)*rr,fy,TREE.z+Math.sin(a)*rr,.2,k+ti);}});
    try{facade=facadeSpots(host.colliders||[],{});}catch(e){console.error('[Jul] fasadval hoppades över',e);}
    for(const s of facade.strings){for(const b of stringBulbs(s)){if(!L.add('ABC'[b.i%3],b.x,b.y,b.z,FACADE.bulb,b.i))break;}stats.strings++;}
    star(T,0,0,0,1.25,.22,'#ffe27a','#f2c13d','xy');star(T,0,0,0,1.25,.22,'#ffe27a','#f2c13d','zy');
  }finally{ComicMesh.snow=keep;}
  const place=(ent,name)=>{ent.name=name;decorRoot.addChild(ent);return ent;};
  place(S.finish(pc,app,'Julmiljö · granar, stånd och presenter',staticMat),'Julmiljö · fast');
  for(const g of ['A','B','C'])place(L.mesh[g].finish(pc,app,'Julljus '+g,lightMats[g]),'Julljus '+g);
  stats.bulbs=L.n;stats.windows=facade.windows.length;stats.roofs=facade.roofs.length;
  const starEntity=place(T.finish(pc,app,'Granens stjärna',starMat),'Granens stjärna');starEntity.setPosition(TREE.x,TREE_TOP,TREE.z);
  const starGlow=sprites.spriteEntity('Stjärnans sken',sprites.glowGold,4.2,4.2,{});decorRoot.addChild(starGlow);starGlow.setPosition(TREE.x,TREE_TOP-2.5,TREE.z);
  const banner=sprites.spriteEntity('Portalens banderoll',sprites.spriteMaterial(labelTex(['GOD JUL','STORA TORGET'],'#b0302f','#fff1ce'),{alphaTest:.1}),2*ARCH.half-.2,2.4,{});decorRoot.addChild(banner);banner.setPosition(ARCH.x,ARCH.h-2.7,ARCH.z+.28);
  // (Ett mjukt sken i snön kring granen provades men kostade mer fyllnad än det gav: se JULVERSION.md, mätningar.)
  // skyltar
  const signs=STALLS.map(s=>{
    const tex=labelTex([s.kind.sign],'#3a2a22','#ffe7a0'),mat=sprites.spriteMaterial(tex,{alphaTest:.1});
    const e=sprites.spriteEntity('Skylt '+s.kind.sign,mat,2.7,.72,{});decorRoot.addChild(e);
    e.setPosition(s.x+s.fx*(STALL.d/2+.34),2.62,s.z+s.fz*(STALL.d/2+.34));e.setEulerAngles(0,Math.atan2(s.fx,s.fz)*180/Math.PI,0);return e;
  });

  // ── Tomtar och tomtefönster (pooler) ─────────────────────────────────────────────────────────────────────────────
  const POOL_G=4,POOL_R=2,POOL_T=POOL_G+POOL_R,POOL_W=5,groundSpots=TOMTE_SPOTS,roofSpots=facade.roofs;
  const tPool=Array.from({length:POOL_T},(_,i)=>({e:place(sprites.spriteEntity('Tomte '+i,sprites.tomteMaterials[0][0],1.35,2,{enabled:false}),'Tomte '+i),id:'',v:-1,f:-1,roof:i>=POOL_G}));
  const winTex=texture((c)=>drawWindowAtlas(c),WINDOW_CELL.w*WINDOW_STYLES.length,WINDOW_CELL.h);
  const winMats=WINDOW_STYLES.map((_,i)=>sprites.spriteMaterial(winTex,{tiling:[1/WINDOW_STYLES.length,1],offset:[i/WINDOW_STYLES.length,0],alphaTest:.1}));
  const wPool=Array.from({length:POOL_W},(_,i)=>({e:place(sprites.spriteEntity('Tomtefönster '+i,winMats[0],2.3,3.45,{enabled:false}),'Tomtefönster '+i),id:'',v:-1}));
  const dist2=(a,p)=>(a.x-p.x)*(a.x-p.x)+(a.z-p.z)*(a.z-p.z);
  let lastPick=-1e9,tShown=0,wShown=0;
  function pick(p){
    // Marktomtar (vid granen, granarna och stånden) och taktomtar har var sin pool, så att de nära tomtarna inte tränger bort de på taken.
    const fill=(list,maxDist,roof,count)=>{
      const cand=[];for(const s of list){const d=Math.sqrt(dist2(s,p));if(d<maxDist)cand.push({s,d});}
      cand.sort((a,b)=>a.d-b.d);const want=cand.slice(0,count),ids=new Set(want.map(w=>w.s.id)),slots=tPool.filter(sl=>sl.roof===roof);
      for(const slot of slots)if(slot.id&&!ids.has(slot.id)){slot.id='';slot.e.enabled=false;}
      for(const w of want){if(slots.some(sl=>sl.id===w.s.id))continue;const free=slots.find(sl=>!sl.id);if(!free)break;free.id=w.s.id;free.spot=w.s;
        const sc=w.s.scale||1;free.e.setLocalScale(1.35*sc,2*sc,1);free.e.setPosition(w.s.x,w.s.y||0,w.s.z);free.e.enabled=true;}
    };
    fill(groundSpots,62,false,POOL_G);fill(roofSpots,115,true,auto>=1?1:POOL_R);
    tShown=tPool.filter(sl=>sl.id).length;
    const wc=[];if(auto===0)for(const s of facade.windows){const d=Math.sqrt(dist2(s,p));if(d<88)wc.push({s,d});}
    wc.sort((a,b)=>a.d-b.d);const ww=wc.slice(0,POOL_W),wids=new Set(ww.map(w=>w.s.id));
    for(const slot of wPool)if(slot.id&&!wids.has(slot.id)){slot.id='';slot.e.enabled=false;}
    for(const w of ww){if(wPool.some(sl=>sl.id===w.s.id))continue;const free=wPool.find(sl=>!sl.id);if(!free)break;free.id=w.s.id;
      free.e.setPosition(w.s.x,w.s.y,w.s.z);free.e.setEulerAngles(0,w.s.yaw,0);sprites.setMaterial(free.e,winMats[w.s.v]);free.e.enabled=true;}
    wShown=wPool.filter(sl=>sl.id).length;
  }

  // ── Snöfall och väder ──────────────────────────────────────────────────────────────────────────────────────────
  const snow=createSnowfall(pc,host,{root:decorRoot,material:sprites.flakeMat,max:100});
  let weather='full',wasInside=false,twinkleAt=0,starK=1,auto=0;
  const flakesNow=()=>Math.round(WEATHER[weather].flakes*(auto===0?1:auto===1?.5:0));
  // Automatisk lättnad (0 = full, 1 = lätt, 2 = minimal): spelet mäter riktiga bildrutetider och tar bort det som är dyrast först. Sparas inte.
  function setAuto(level){auto=Math.max(0,Math.min(2,level|0));snow.setCount(flakesNow());if(auto>=1){starGlow.enabled=false;for(const s of wPool){s.id='';s.e.enabled=false;}wShown=0;}else starGlow.enabled=true;}
  function setWeather(level){weather=WEATHER[level]?level:'full';snow.setCount(flakesNow());if(!WEATHER[weather].decor){for(const g of 'ABC'){lightMats[g].emissiveIntensity=1;lightMats[g].update();}}}
  setWeather(params?.weather||'full');

  function update(p,now,dt){
    const inside=!!indoors?.(p);
    if(inside!==wasInside){wasInside=inside;decorRoot.enabled=!inside;}
    if(inside){snow.update(dt,false);return;}
    const w=WEATHER[weather],twinkleEvery=auto===0?120:auto===1?400:1e9;
    if(w.decor>0&&now-twinkleAt>twinkleEvery){
      twinkleAt=now;
      lightMats.A.emissiveIntensity=.62+.38*Math.sin(now/310)*w.decor+(1-w.decor)*.38;
      lightMats.B.emissiveIntensity=.62+.38*Math.sin(now/420+2.1)*w.decor+(1-w.decor)*.38;
      lightMats.C.emissiveIntensity=.62+.38*Math.sin(now/370+4.2)*w.decor+(1-w.decor)*.38;
      for(const g of 'ABC')lightMats[g].update();
      starK=1+.07*Math.sin(now/520)*w.decor;starEntity.setLocalScale(starK,starK,starK);starEntity.setEulerAngles(0,(now/22)%360,0);
      const gs=4.2*(1+.08*Math.sin(now/600)*w.decor);starGlow.setLocalScale(gs,gs,1);
    }
    if(auto===0)starGlow.setEulerAngles(0,Math.atan2(host.camera.getPosition().x-TREE.x,host.camera.getPosition().z-TREE.z)*180/Math.PI,0);
    if(now-lastPick>260){lastPick=now;pick(p);}
    for(const slot of tPool){
      if(!slot.id)continue;const s=slot.spot,v=((s.v??0)+6)%6,f=Math.floor(now/(520+(hash32(slot.id)%5)*90))%2;
      if(slot.v!==v||slot.f!==f){slot.v=v;slot.f=f;sprites.setMaterial(slot.e,sprites.tomteMaterials[v][f]);}
      slot.e.setEulerAngles(0,sprites.yawToward(s.x,s.z,p),Math.sin(now/600+slot.id.length)*1.5);
    }
    snow.update(dt,true);
  }
  setWeather(params?.weather||'full');
  return {update,setWeather,setAuto,get auto(){return auto;},decorRoot,snow,facade,
    snapshot:()=>({weather,auto,flakes:snow.shown,tomte:tShown,windows:wShown,bulbs:stats.bulbs,strings:stats.strings,facadeWindows:stats.windows,facadeRoofs:stats.roofs,stalls:STALLS.length,firs:FIRS.length,decor:WEATHER[weather].decor}),
    drawCalls:()=>3+1+1+3+2+signs.length+tShown+wShown+(snow.shown?1:0)};
}
