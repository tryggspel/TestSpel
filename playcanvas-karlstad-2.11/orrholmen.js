// 2.18: Orrholmen och vattnet, Stadsträdgården, Bryggudden och Karlstad C. Allt här är dekor som ritas i en enda statisk mesh (inga kollisioner):
// vågor och skum som gör vattnet tydligt, bojar och båtar, bänkar och lyktor, rabatter, träd, paviljong och fontän, kajer och hamnkran,
// samt perronger, extra spår, tak och ett tåg vid stationen. Byggnader, vatten och vägar kommer från data/osm-outer-orrholmen.json.
import {ComicMesh} from './city-architecture.js?v=2.19.1';
import {cityPoint} from './city-geography.mjs?v=2.19.1';
import {BAY_WEST,BAY_EAST,shoreE,pointIn,TRADGARD,TRADGARD_BEDS,bryggEdges,ORR_SIGNS} from './orrholmen-places.mjs?v=2.19.1';

const rngFrom=(seed)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};

// Vriden låda (ComicMesh.box är axelrät). yaw i radianer runt y.
export function rbox(m,x,y,z,w,h,d,yaw,col,side=col){
  const c=Math.cos(yaw),s=Math.sin(yaw),P=(u,v,k)=>[x+u*c-k*s,y+v,z+u*s+k*c],hw=w/2,hd=d/2,y0=-h/2,y1=h/2;
  const A=P(-hw,y0,hd),B=P(hw,y0,hd),C=P(hw,y1,hd),D=P(-hw,y1,hd),E=P(-hw,y0,-hd),F=P(hw,y0,-hd),G=P(hw,y1,-hd),H=P(-hw,y1,-hd);
  m.quad(A,B,C,D,col);m.quad(F,E,H,G,side);m.quad(E,A,D,H,col);m.quad(B,F,G,C,side);m.quad(D,C,G,H,col);
}
const tree=(m,x,z,k)=>{
  if(k===2){m.pyramid(x,0,z,2.4,2.4,2.8,'#5f8a52');return;}
  m.box(x,.9,z,.35,1.8,.35,'#6a4f38');
  if(k===1){m.pyramid(x,1.4,z,2.7,2.7,3.6,'#35604a');m.pyramid(x,3.2,z,2.0,2.0,3.0,'#3d6b53');}
  else{m.pyramid(x,1.6,z,3.2,3.2,3.2,'#587f48');m.pyramid(x,3.2,z,2.2,2.2,2.4,'#648c50');}
};
const bench=(m,x,z,yaw)=>{rbox(m,x,.48,z,1.7,.1,.5,yaw,'#8a6a45');rbox(m,x-Math.sin(yaw)*.22,.85,z+Math.cos(yaw)*.22,1.7,.5,.08,yaw,'#7a5c3a');for(const o of [-.7,.7])rbox(m,x+Math.cos(yaw)*o,.24,z+Math.sin(yaw)*o,.12,.48,.4,yaw,'#3b3f3f');};
const lamp=(m,x,z)=>{m.box(x,2.1,z,.14,4.2,.14,'#2f3b3d');m.box(x,4.3,z,.55,.28,.55,'#fff3c4','#d9c98d');};
const bollard=(m,x,z)=>{m.box(x,.4,z,.28,.8,.28,'#2d3436');m.box(x,.74,z,.3,.1,.3,'#f1f1f1');};
const buoy=(m,x,z,col='#e04b3c')=>{m.box(x,.28,z,.5,.56,.5,'#f4f4ef');m.box(x,.74,z,.36,.36,.36,col);};
const sailboat=(m,x,z,yaw,hull='#f4f1e8',stripe='#2b6a8a',sail='#ffffff')=>{
  rbox(m,x,.45,z,7.4,.9,2.4,yaw,hull);rbox(m,x,.78,z,7.5,.14,2.5,yaw,stripe);rbox(m,x-Math.cos(yaw)*.6,1.2,z-Math.sin(yaw)*.6,2.6,.6,1.6,yaw,'#d6c9a8');
  const mx=x+Math.cos(yaw)*.5,mz=z+Math.sin(yaw)*.5;rbox(m,mx,4.4,mz,.12,7.6,.12,0,'#b9b3a1');
  const bx=Math.cos(yaw),bz=Math.sin(yaw),a=[mx,8.1,mz],b=[mx,1.5,mz],c=[mx-bx*3.0,1.5,mz-bz*3.0];m.tri(a,b,c,sail);m.tri(a,c,b,'#e8e6dc');
};
const rowboat=(m,x,z,yaw,col='#b5503c')=>{rbox(m,x,.28,z,3.4,.55,1.3,yaw,col);rbox(m,x,.34,z,3.0,.1,.9,yaw,'#d9c9a4');};
const picnic=(m,x,z)=>{m.box(x,.8,z,2.2,.1,.9,'#9a7648');m.box(x,.44,z-.85,2.2,.08,.4,'#8a6a45');m.box(x,.44,z+.85,2.2,.08,.4,'#8a6a45');for(const o of [-.9,.9])m.box(x+o,.4,z,.14,.8,1.6,'#5b4a3a');};

// Skär en polygon med raden z och returnera x-intervall [[a,b],…].
function spans(poly,z){
  const xs=[];for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z))xs.push(xi+(z-zi)*(xj-xi)/(zj-zi));}
  xs.sort((a,b)=>a-b);const out=[];for(let i=0;i+1<xs.length;i+=2)out.push([xs[i],xs[i+1]]);return out;
}

// ── Vattnet: mörkare yta, skum längs stränderna, vågor, bojar och båtar ───────────────────────────────────────────────
export function drawWater(m){
  const R=rngFrom(81);
  for(const bay of [BAY_WEST,BAY_EAST]){
    m.polygon(bay,.026,'#2b86a2');
    const ring=[...bay,bay[0]];m.strip(ring,3.2,.032,'#9fd1d3');m.strip(ring,.8,.036,'#f2f9f4');
    const zs=bay.map(p=>p[1]),z0=Math.min(...zs)+10,z1=Math.max(...zs)-8;
    for(let z=z0;z<z1;z+=13){
      for(const [a,b] of spans(bay,z)){
        for(let x=a+10+R()*14;x<b-10;x+=22+R()*20){const len=6+R()*8;m.box(x,.04,z+R()*6,len,.02,.45,R()<.5?'#6db8c9':'#58a8bd');}
      }
    }
  }
  // Simlinje och farledsmärken tvärs över Orrholmsviken.
  for(let x=-700;x<-380;x+=20)buoy(m,x,1010,'#e04b3c');
  for(let x=-690;x<-480;x+=26)buoy(m,x,1260,'#f2c230');
  buoy(m,-470,1330,'#2f9e44');buoy(m,-490,1345,'#e04b3c');
  for(let z=1010;z<1330;z+=40)buoy(m,-60,z,z%80?'#e04b3c':'#2f9e44');
  // Segelbåtar och roddbåtar.
  for(const [x,z,yaw,hull,stripe] of [[-560,880,.4,'#f4f1e8','#2b6a8a'],[-620,1090,2.4,'#fff7e6','#c0392b'],[-520,1170,1.1,'#f4f1e8','#27ae60'],[-690,1200,0,'#ece7d6','#34495e'],[-440,960,2.8,'#f4f1e8','#e67e22'],[-600,1310,.9,'#fff','#8e44ad'],
    [140,1050,.3,'#f4f1e8','#2b6a8a'],[230,1150,2.0,'#fff7e6','#c0392b'],[330,1240,.9,'#f4f1e8','#27ae60'],[180,1290,2.6,'#ece7d6','#34495e'],[380,1120,1.7,'#f4f1e8','#e67e22']])sailboat(m,x,z,yaw,hull,stripe);
  for(const [x,z,yaw] of [[shoreE(1160)-30,1176,.2],[shoreE(1160)-46,1150,1.2],[-486,1352,.1],[shoreE(880)-28,892,.8]])rowboat(m,x,z,yaw);
}

// ── Orrholmen och Tullholmen: bänkar, lyktor, badplats, färjeläge, park och utsiktsplats ────────────────────────────────
export function drawOrrholmen(m){
  for(let z=760;z<=1240;z+=60)bench(m,shoreE(z)+15,z,Math.PI/2);
  for(let z=740;z<=1250;z+=45)lamp(m,shoreE(z)+17,z);
  // Badplatsen: flaggstång, badvaktsstol, solstolar och livboj på bryggan.
  const bz=1160,bx=shoreE(bz)+20;
  m.box(bx,4,bz-10,.16,8,.16,'#d9d9d2');m.quad([bx,7.9,bz-10],[bx+.1,7.9,bz-10],[bx+.1,6.6,bz-10],[bx,6.6,bz-10],'#ffd200');m.quad([bx,7.9,bz-10],[bx,7.9,bz-10+2.2],[bx,6.6,bz-10+2.2],[bx,6.6,bz-10],'#005293');
  rbox(m,bx+4,1.4,bz+12,1.2,.2,1.2,0,'#f2f2f2');for(const [a,b] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]])m.box(bx+4+a,.7,bz+12+b,.12,1.4,.12,'#d9d9d2');
  for(let i=0;i<6;i++)rbox(m,bx+3+(i%3)*2.4,.22,bz+20+Math.floor(i/3)*2.6,.8,.14,1.9,.1*i,i%2?'#e67e22':'#3498db');
  m.box(shoreE(1160)-48,.55,1160,.5,.1,.5,'#e04b3c');
  // Gamla färjeläget: ramp, pollare och den gamla färjan.
  rbox(m,-466,.14,1428,7,.28,10,0,'#7d7a70');for(const dz of [-3,3]){bollard(m,-462,1424+dz*.6);bollard(m,-470,1424+dz*.6);}
  rbox(m,-505,.7,1383,16,1.4,4.2,0,'#f5f1e6');rbox(m,-505,1.5,1383,16.4,.3,4.4,0,'#c0392b');rbox(m,-508,2.8,1383,5,2.2,3.2,0,'#dfe6e9');rbox(m,-508,3.0,1383,5.2,.7,3.3,0,'#2e4650');m.box(-500,4.5,1383,.8,3,.8,'#4b5557');
  // Orrholmsparken: picknickbord, kiosk och utsiktsplats.
  for(const [x,z] of [[-130,1475],[-70,1490],[-20,1540],[-110,1585],[-150,1530]])picnic(m,x,z);
  for(const [x,z,y] of [[-110,1450,0],[-70,1520,.4],[-35,1565,.9],[-130,1620,1.2],[-150,1560,1.9],[-90,1470,2.5]])bench(m,x,z,y);
  for(let i=0;i<7;i++)lamp(m,-190+i*22,1432+i*3);
  // Utsiktsplatsen på Orrholmens udde: fyra stolpar, däck och räcke, med trappa.
  const ux=-100,uz=1668;
  for(const [a,b] of [[-2.3,-2.3],[2.3,-2.3],[-2.3,2.3],[2.3,2.3]])m.box(ux+a,2.2,uz+b,.4,4.4,.4,'#6a4f38');
  m.box(ux,4.5,uz,5.8,.35,5.8,'#9a7648');
  for(const d of [-2.8,2.8]){m.box(ux+d,5.2,uz,.1,1.0,5.8,'#7a5c3a');m.box(ux,5.2,uz+d,5.8,1.0,.1,'#7a5c3a');}
  for(let i=0;i<8;i++)m.box(ux-3.2-i*.2,.3+i*.55,uz+1.2,.9,.18,2,'#8a6a45');
  m.pyramid(ux,5.6,uz,6.6,6.6,2.8,'#4a6a4f');
  // Tullholmen: kajkran och några pollare längs vikens norra del.
  for(let z=1000;z<1250;z+=36)bollard(m,shoreE(z)+5,z);
}

// Kon i en enda färg (ComicMesh.pyramid har fasta, mörka sidfärger som ser grå ut på små blommor).
const shade=(hex,f)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*f))).toString(16).padStart(2,'0')).join('');
function cone(m,x,y,z,r,h,col){
  const a=[x-r,y,z-r],b=[x+r,y,z-r],c=[x+r,y,z+r],e=[x-r,y,z+r],p=[x,y+h,z];
  m.tri(a,p,b,shade(col,.78));m.tri(b,p,c,shade(col,.95));m.tri(c,p,e,col);m.tri(e,p,a,shade(col,.85));
}
// Rabatter: en grön yta och små blommor utspridda inuti ytans verkliga form (inte i en omslutande ruta, som lade klossar över gatorna).
function flowerBeds(m,polys,R,cols,avoid=null){
  for(const poly of polys){
    const xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),z0=Math.min(...zs),z1=Math.max(...zs);
    if((x1-x0)*(z1-z0)>6000)continue; // för stora ytor är parker, inte rabatter
    m.polygon(poly,.056,'#5d8f4a');
    for(let x=x0+.6;x<x1;x+=1.5)for(let z=z0+.6;z<z1;z+=1.5){
      const fx=x+(R()-.5)*.8,fz=z+(R()-.5)*.8;
      if(!pointIn(fx,fz,poly)||(avoid&&avoid(fx,fz)))continue;
      // En blomma: tunn grön stjälk och ett litet färgat blomhuvud (kon), inte en kloss.
      const h=.3+R()*.2;m.box(fx,h/2+.05,fz,.05,h,.05,'#4f7d3f');cone(m,fx,h+.02,fz,.17,.3,cols[Math.floor(R()*cols.length)]);
    }
  }
}
const rectPoly=([cx,cz,w,d])=>[[cx-w/2,cz-d/2],[cx+w/2,cz-d/2],[cx+w/2,cz+d/2],[cx-w/2,cz+d/2]];
// Trädgårdsrabatter ur OSM-utdraget för Inre hamn (leisure=garden) i spelkoordinater.
export function gardenPolygons(hamn){
  const out=[];
  for(const e of hamn?.environment||[]){const t=e.tags||{};if(t.leisure!=='garden'&&!t['garden:type'])continue;
    const pts=e.geometry.map(g=>{const q=cityPoint(g.lon,g.lat);return [q.x,q.z];});if(pts.length>=4)out.push(pts);}
  return out;
}
// ── Stadsträdgården: stigar, träd, rabatter, damm, pergola, paviljong, fontän ───────────────────────────────────────────
const TRADGARD_PATHS=[
  [[-86,403],[-70,430],[-48,470],[-44,520],[-40,570],[-38,620],[-30,665]],
  [[-48,470],[-20,455],[-2,430]],
  [[-44,520],[-80,545],[-92,580],[-70,610],[-40,620]],
  [[-40,570],[-10,590],[-2,620]],
  [[-92,470],[-70,490],[-44,520]],
  [[-60,665],[-45,640],[-38,620]]
];
function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/l)):0;return Math.hypot(ax+dx*t-px,az+dz*t-pz);}
export const nearTradgardPath=(x,z,r=3.2)=>TRADGARD_PATHS.some(p=>p.some((q,i)=>i&&segDist(x,z,p[i-1][0],p[i-1][1],q[0],q[1])<r));
export function drawTradgard(m){
  const R=rngFrom(5151);
  for(const p of TRADGARD_PATHS){m.strip(p,3.4,.05,'#e0d1ad');m.strip(p,2.6,.054,'#d4c39b');}
  // Rosrabatter med blommor.
  flowerBeds(m,TRADGARD_BEDS.map(rectPoly),R,['#e84a7f','#f7a8c0','#e74c3c','#f7f1d0','#f4c430'],(x,z)=>nearTradgardPath(x,z,2.6));
  // Träd: slumpade, inte på stigarna och inte i rabatterna.
  let placed=0;const spots=[];
  for(let tries=0;tries<2200&&placed<130;tries++){
    const x=-104+R()*112,z=402+R()*290;if(!pointIn(x,z,TRADGARD))continue;
    if(nearTradgardPath(x,z,3.6)||spots.some(s=>Math.hypot(s[0]-x,s[1]-z)<6.5))continue;
    if(TRADGARD_BEDS.some(([cx,cz,w,d])=>Math.abs(x-cx)<w/2+2&&Math.abs(z-cz)<d/2+2))continue;
    if(Math.hypot(x+52,z-552)<16||Math.hypot(x+48,z-638)<9||Math.hypot(x+40,z-600)<8||Math.hypot(x+45,z-480)<9)continue;
    spots.push([x,z]);tree(m,x,z,Math.floor(R()*3));placed++;
  }
  // Damm.
  const pond=[];for(let i=0;i<20;i++){const a=i/20*Math.PI*2;pond.push([-52+Math.cos(a)*(13+Math.sin(a*3)*1.2),552+Math.sin(a)*(8.5+Math.cos(a*2))]);}
  m.polygon(pond,.058,'#7fb7c6');m.strip([...pond,pond[0]],1.4,.062,'#8e8a7a');
  for(let i=0;i<16;i++){const a=R()*Math.PI*2;m.box(-52+Math.cos(a)*14.4,.6,552+Math.sin(a)*9.6,.12,1.2,.12,'#8a9a52');}
  // Rosenpergola (två rader stolpar med ribbor och rosor).
  for(const sx of [-3.2,3.2])for(let i=0;i<6;i++){m.box(-45+sx,1.4,462+i*3.6,.22,2.8,.22,'#f2efe4');}
  for(let i=0;i<6;i++)m.box(-45,2.9,462+i*3.6,7,.14,.3,'#f2efe4');
  for(let i=0;i<40;i++)m.box(-45+(R()<.5?-3.2:3.2)+(R()-.5)*.5,.5+R()*2.4,462+R()*18,.38,.38,.38,R()<.5?'#e84a7f':'#f7a8c0');
  // Paviljong.
  for(const [a,b] of [[-3,-3],[3,-3],[-3,3],[3,3]])m.box(-40+a,1.7,600+b,.3,3.4,.3,'#f2efe4');
  m.box(-40,.15,600,7.4,.3,7.4,'#cfc7b0');m.pyramid(-40,3.4,600,8.6,8.6,3.2,'#2f6f55');
  // Fontän med bassäng.
  const fo=[];for(let i=0;i<24;i++){const a=i/24*Math.PI*2;fo.push([-48+Math.cos(a)*6,638+Math.sin(a)*6]);}
  m.polygon(fo,.07,'#8ecad8');m.strip([...fo,fo[0]],1.0,.09,'#cfc8b4');m.box(-48,.9,638,.7,1.8,.7,'#cfc8b4');m.box(-48,2.2,638,.25,1.2,.25,'#e9fbff');m.pyramid(-48,2.6,638,1.6,1.6,1.4,'#e9fbff');
  // Bänkar längs stigarna och trädgårdsmästarens bod.
  for(const [x,z,yaw] of [[-52,495,1.6],[-34,545,-1.6],[-34,590,-1.6],[-60,628,1.6],[-52,430,0],[-60,680,0]])bench(m,x,z,yaw);
  rbox(m,-80,1.6,660,5,3.2,4,0,'#8c6a46');m.roof(-80,3.2,660,5.6,4.6,1.4,'x');
  for(let i=0;i<4;i++){m.box(-98,.5,430+i*30,.9,1,28,'#4f7d42');}
}

// ── Bryggudden och Inre hamn: trädäck, pollare, bänkar, lyktor, hamnkran och förtöjda båtar ─────────────────────────────
export function drawBryggudden(m,gardens=[]){
  flowerBeds(m,gardens,rngFrom(77),['#f4c430','#f08a24','#9b59b6','#e84a7f','#f7f1d0']);
  const {west,east}=bryggEdges();
  const wp=west.map(([z,x])=>[x+4.5,z]),ep=east.map(([z,x])=>[x-4.5,z]);
  m.strip(wp,3.2,.05,'#b98f5b');m.strip(ep,3.2,.05,'#b98f5b');m.strip(wp,3.4,.047,'#8f6c40');m.strip(ep,3.4,.047,'#8f6c40');
  for(let i=0;i<wp.length;i+=1){bollard(m,wp[i][0]-2.4,wp[i][1]);bollard(m,ep[i][0]+2.4,ep[i][1]);if(i%2===0){bench(m,wp[i][0]+3.2,wp[i][1],-Math.PI/2);bench(m,ep[i][0]-3.2,ep[i][1],Math.PI/2);}if(i%3===1){lamp(m,wp[i][0]+5,wp[i][1]);lamp(m,ep[i][0]-5,ep[i][1]);}}
  // Hamnkranen längst ut på tungan (gammal kaj).
  const kx=426,kz=603;
  m.box(kx,.2,kz,9,.4,9,'#9a9588');m.box(kx,9,kz,1.4,18,1.4,'#e0a82e');m.box(kx+6,18,kz,14,1.1,1.1,'#e0a82e');m.box(kx+12.8,15,kz,.2,5.4,.2,'#3b3f3f');m.box(kx+12.8,12,kz,1.4,1.6,1.4,'#c0392b');m.box(kx-2.5,3,kz,2.4,3.2,2.2,'#4b5557');
  // Förtöjda båtar i båda vikarna.
  for(const [z,k] of [[470,0],[520,1],[580,2],[640,3]]){
    const r=west.find(p=>p[0]>=z),e=east.find(p=>p[0]>=z);
    if(r)sailboat(m,r[1]-9,z,Math.PI/2+.05,k%2?'#f4f1e8':'#fff7e6',['#2b6a8a','#c0392b','#27ae60','#8e44ad'][k]);
    if(e)sailboat(m,e[1]+9,z+6,Math.PI/2-.05,k%2?'#ece7d6':'#f4f1e8',['#e67e22','#34495e','#2b6a8a','#c0392b'][k]);
  }
  // Fiskarkiosk och ett litet torg vid Willys.
  rbox(m,318,1.6,430,5,3.2,3.6,0,'#d7b98e');m.roof(318,3.2,430,5.6,4.2,1.4,'x');m.box(318,2.2,428,3.6,.9,.1,'#2b6a8a');
}

// ── Karlstad C: perronger, extra spår, perrongtak, signaler och ett tåg ─────────────────────────────────────────────────
export function drawStation(m){
  const x0=-300,x1=-135,rail=(z)=>{
    m.strip([[x0,z],[x1,z]],3.6,.034,'#7c7b72');m.strip([[x0,z-.72],[x1,z-.72]],.14,.062,'#aeb4b0');m.strip([[x0,z+.72],[x1,z+.72]],.14,.062,'#aeb4b0');
    for(let x=x0;x<x1;x+=1.7)m.box(x,.045,z,.4,.09,2.5,'#5b4a3a');
  };
  rail(327);rail(336);
  // Perronger: längs stationshuset (spår 1) och en mittperrong mellan spår 2 och 3.
  m.box(-215,.2,317,150,.4,5.2,'#bfc0b8');m.box(-215,.42,319.3,150,.02,.35,'#f2c230');
  m.box(-215,.2,331.7,120,.4,5.0,'#bfc0b8');m.box(-215,.42,329.4,120,.02,.35,'#f2c230');m.box(-215,.42,334,120,.02,.35,'#f2c230');
  // Perrongtak med stolpar.
  m.box(-215,4.3,316.4,110,.3,7.2,'#3f5560');m.box(-215,4.55,316.4,110,.1,7.4,'#e8ece8');for(let x=-268;x<=-162;x+=9)m.box(x,2.1,319,.3,4.2,.3,'#2b3a40');
  m.box(-215,4.3,331.7,76,.3,7.4,'#3f5560');m.box(-215,4.55,331.7,76,.1,7.6,'#e8ece8');for(let x=-250;x<=-180;x+=9){m.box(x,2.1,329.7,.3,4.2,.3,'#2b3a40');m.box(x,2.1,333.7,.3,4.2,.3,'#2b3a40');}
  // Bänkar, lyktor, skyltar och cykelställ på perrongerna.
  for(let x=-262;x<=-168;x+=18){bench(m,x,316.2,0);bench(m,x+9,331.2,0);}
  for(let x=-270;x<=-160;x+=22){lamp(m,x,318.5);lamp(m,x+11,333);}
  for(const x of [-250,-215,-180]){m.box(x,1.3,333.3,.12,2.6,.12,'#2f3b3d');m.box(x,2.5,333.3,1.4,.6,.1,'#1d5a8a');}
  // Signaler.
  for(const [x,z] of [[-292,324],[-142,324]]){m.box(x,3,z,.18,6,.18,'#3b3f3f');m.box(x,5.4,z,.5,1.5,.4,'#2d3436');m.box(x,5.8,z-.22,.28,.28,.05,'#e04b3c');m.box(x,5.4,z-.22,.28,.28,.05,'#4a4a3a');m.box(x,5.0,z-.22,.28,.28,.05,'#2f9e44');}
  // Tåget: två vagnar med gul linje, mörka rutor och sluttande nos.
  const car=(xc,len,nose)=>{
    rbox(m,xc,2.2,327,len,3.0,3.0,0,'#eef0ec','#d8dcd6');rbox(m,xc,3.1,327,len-.5,.9,3.06,0,'#2e4650');rbox(m,xc,1.1,327,len,.28,3.08,0,'#f2c230');rbox(m,xc,3.85,327,len-1,.28,2.7,0,'#c7ccc6');
    if(nose){const d=nose>0?1:-1,x=xc+d*len/2;m.quad([x,.7,325.5],[x+d*2.2,.7,325.5],[x+d*2.2,2.6,326],[x,3.7,326],'#eef0ec');m.quad([x+d*2.2,.7,328.5],[x,.7,328.5],[x,3.7,328],[x+d*2.2,2.6,328],'#d8dcd6');}
  };
  car(-240,24,-1);car(-215.6,24,0);car(-191.2,24,1);
  // Stationsklocka på huset och en flaggstång.
  m.box(-220,12,297.7,2.6,2.6,.3,'#f6f6ee');m.box(-220,12,297.5,.12,1.0,.1,'#2b2b2b');m.box(-219.6,12.2,297.5,.8,.1,.1,'#2b2b2b');
  m.box(-190,5,300,.14,10,.14,'#d9d9d2');
}

// ── Skyltar (kort med text): placeras vid stränderna, parkerna och stationen. ──────────────────────────────────────────
export function createOrrholmenSigns({card,labelTex}){
  for(const [text,x,z,y,w,yaw] of ORR_SIGNS){const e=card(text,labelTex([text],'#214b49','#f5e5bd'),w,.62,x,y,z);e.setEulerAngles(0,yaw,0);}
}

export function createOrrholmen(pc,app,{hamn=null}={}){
  const m=new ComicMesh();
  drawWater(m);drawOrrholmen(m);drawTradgard(m);drawBryggudden(m,gardenPolygons(hamn));drawStation(m);
  const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveVertexColor=true;material.update();
  m.finish(pc,app,'Karlstad · Orrholmen, vattnet, Stadsträdgården, Bryggudden och stationen',material);
  return {vertices:m.positions.length/3,triangles:m.indices.length/3};
}
