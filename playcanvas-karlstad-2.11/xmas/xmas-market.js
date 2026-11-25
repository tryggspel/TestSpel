// Julmarknaden på Stora Torget (2.21.1-xmas.13): bygger foodtrucks, julmarknadsstugor, julgransförsäljningen, scenen, glasburen, tomtens stuga, eldkorgar, ståbord,
// lyktstolpar med slingor och snövallar av färgade trianglar (ComicMesh, samma teknik som stadens byggnader), och ett levande lager ovanpå: lågor, sken, ånga, scenens
// strålkastare, skyltar i en enda bildatlas, scenens skärm och insamlingens räkneverk. Platserna kommer från xmas-market-data.mjs.
//
// Ritanrop: marknadens fasta delar går i samma meshar som granen och stånden (decor S), lamporna i samma tre blinkande grupper (decor L), fönster och lyktglas i en
// mesh som alltid lyser (lamp), glaset i en genomskinlig mesh, skyltarna i en, effekterna i en, skärmen och räkneverket i var sin. Inga ljuskällor och ingen fysik.
import {TRUCKS,TRUCK,TABLES,LANE,LANE_STALL,ALLEY,LOT,LOT_TREES,STAGE,BOOTH,COTTAGE,FIRES,POLES,STRINGS,SNOWBANKS,SIGNS,stageActAt,nextActAfter} from './xmas-market-data.mjs?v=2.21.1-xmas.14';

const TAU=Math.PI*2,SNOW='#f7fbff',SNOW2='#e4eef6',WOOD='#8a5e3b',WOOD2='#6e4a2f',PLANK='#b98a5b',IRON='#2b2f36',IRON2='#1d2126';
// Små byggstenar (samma som i xmas-decor.js; egna kopior så att modulerna inte beror på varandra)
function cone(m,x,y,z,r,h,seg,c1,c2){for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;m.tri([x+Math.cos(a0)*r,y,z+Math.sin(a0)*r],[x,y+h,z],[x+Math.cos(a1)*r,y,z+Math.sin(a1)*r],i%2?c1:c2);}}
function disc(m,x,y,z,r,seg,col){for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU;m.tri([x,y,z],[x+Math.cos(a1)*r,y,z+Math.sin(a1)*r],[x+Math.cos(a0)*r,y,z+Math.sin(a0)*r],col);}}
// Lodrät cylinder (mantel och lock), seg sidor
function cyl(m,x,y,z,r,h,seg,c1,c2,top=c1){for(let i=0;i<seg;i++){const a0=i/seg*TAU,a1=(i+1)/seg*TAU,p0=[x+Math.cos(a0)*r,y,z+Math.sin(a0)*r],p1=[x+Math.cos(a1)*r,y,z+Math.sin(a1)*r];m.quad(p0,[p0[0],y+h,p0[2]],[p1[0],y+h,p1[2]],p1,i%2?c1:c2);}disc(m,x,y+h,z,r,seg,top);}
// Lokal ram för föremål som vänder sig åt ett av de fyra väderstrecken: lx = i sidled, lz = framåt (mot facing). Rutorna blir exakta (axelparallella).
function frame(m,cx,cz,fx,fz){
  const alongX=fx!==0,tx=alongX?0:1,tz=alongX?1:0,W=(lx,lz)=>[cx+tx*lx+fx*lz,cz+tz*lx+fz*lz];
  return {W,alongX,
    box:(lx,y,lz,w,h,d,c1,c2)=>{const [x,z]=W(lx,lz);m.box(x,y,z,alongX?d:w,h,alongX?w:d,c1,c2||c1);},
    P:(lx,lz,y)=>{const [x,z]=W(lx,lz);return [x,y,z];},
    quad:(a,b,c,d,col)=>m.quad(a,b,c,d,col),tri:(a,b,c,col)=>m.tri(a,b,c,col)};
}
// Sadeltak längs lx (nock i mitten av lz), med snö överst och en kant: x0..x1 i sidled, z0..z1 framåt, y0 takfot, h höjd.
function gable(f,x0,x1,z0,z1,y0,h,col,shade){
  const zm=(z0+z1)/2,P=f.P;
  f.quad(P(x0,z0,y0),P(x1,z0,y0),P(x1,zm,y0+h),P(x0,zm,y0+h),shade);f.quad(P(x0,zm,y0+h),P(x1,zm,y0+h),P(x1,z1,y0),P(x0,z1,y0),col);
  f.quad(P(x0,zm-.02,y0+h+.03),P(x1,zm-.02,y0+h+.03),P(x1,z1-(z1-zm)*.45,y0+h*.55+.04),P(x0,z1-(z1-zm)*.45,y0+h*.55+.04),SNOW);
  f.quad(P(x0,z0+(zm-z0)*.45,y0+h*.55+.04),P(x1,z0+(zm-z0)*.45,y0+h*.55+.04),P(x1,zm+.02,y0+h+.03),P(x0,zm+.02,y0+h+.03),SNOW2);
  f.tri(P(x0,z0,y0),P(x0,zm,y0+h),P(x0,z1,y0),shade);f.tri(P(x1,z1,y0),P(x1,zm,y0+h),P(x1,z0,y0),shade);
}
const hashStr=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

// ── Foodtrucks ───────────────────────────────────────────────────────────────────────────────────────────────────
// Lastbilen står med långsidan mot torget (norrut, lz framåt). Luckan är en nisch på framsidan där säljaren står; markisen fälls upp över den.
function buildTruck(S,L,G,t,i){
  const f=frame(S,t.x,t.z,t.facing.x,t.facing.z),k=t.kind,body=k.body,shade=mix(body,'#000000',.22),hw=TRUCK.len/2,hd=TRUCK.wid/2;
  f.box(0,.5,0,TRUCK.len-.3,.28,TRUCK.wid-.2,IRON,IRON2);                                              // chassi
  for(const lx of [-hw+1.0,hw-1.25])for(const lz of [-hd+.12,hd-.12]){f.box(lx,.4,lz,.8,.8,.3,'#22252b','#16181c');f.box(lx,.4,lz+(lz>0?.16:-.16),.34,.34,.04,'#c9d3dc');} // hjul och navkapslar
  // skåpet: bakre delen hel, främre delen runt luckans nisch (nischen är 3 m bred, 0,45 m djup, mellan 1,55 och 2,72 m)
  const bx0=-hw,bx1=hw-1.7,cx=(bx0+bx1)/2,bw=bx1-bx0,nx0=-1.9,nx1=1.1,nd=.45;
  f.box(cx,1.97,-nd/2,bw,2.9,TRUCK.wid-nd,body,shade);                                                // bakre delen (allt utom nischens djup)
  f.box(cx,1.08,hd-nd/2,bw,1.12,nd,body,shade);                                                      // under luckan
  f.box(cx,3.0,hd-nd/2,bw,.84,nd,body,shade);                                                        // över luckan
  f.box((bx0+nx0)/2,2.13,hd-nd/2,nx0-bx0,1.2,nd,body,shade);f.box((nx1+bx1)/2,2.13,hd-nd/2,bx1-nx1,1.2,nd,body,shade); // vid sidorna
  f.box((nx0+nx1)/2,1.6,hd-nd/2+.06,nx1-nx0+.1,.1,nd+.3,PLANK,WOOD);                                  // disken i luckan
  f.box((nx0+nx1)/2,2.13,hd-nd+.02,nx1-nx0,1.0,.04,'#3a2f2a');                                       // nischens bakvägg (mörk)
  G.box((nx0+nx1)/2,2.54,hd-nd/2,nx1-nx0-.2,.05,nd-.1,'#fff0c2');                                     // lampa i taket på nischen (alltid tänd)
  // förarhytten
  const hx=hw-.85;f.box(hx,1.45,0,1.6,1.9,TRUCK.wid-.15,body,shade);f.box(hx+.81,1.9,0,.06,.72,TRUCK.wid-.5,'#2c4a66','#203a52');
  f.box(hx+.2,2.42,0,1.2,.08,TRUCK.wid-.2,SNOW);f.box(hx+.86,.85,0,.1,.3,TRUCK.wid-.1,'#9aa6b2');      // snö på hyttaket, stötfångare
  for(const lz of [-hd+.35,hd-.35])G.box(hx+.86,1.1,lz,.06,.18,.32,'#fff6d0');                        // strålkastare
  // ränder, tak och snö
  f.box(cx,1.3,hd+.005,bw,.18,.02,k.trim);f.box(cx,1.3,-hd-.005,bw,.18,.02,k.trim);
  f.box(cx,3.47,0,bw+.15,.1,TRUCK.wid+.08,k.trim);f.box(cx,3.56,0,bw-.2,.12,TRUCK.wid-.2,SNOW,SNOW2);
  f.box(bx0+.9,3.8,-.4,.32,.5,.32,'#9aa6b2','#7e8a96');                                               // ventil (ånga)
  // markisen över luckan: randig, uppfälld snett framåt
  const P=f.P,N=8,y0=2.74,y1=2.98,z0=hd,z1=hd+.95,st=(nx1-nx0+.4)/N;
  for(let s=0;s<N;s++){const a=nx0-.2+s*st,b=a+st;f.quad(P(a,z0,y0),P(b,z0,y0),P(b,z1,y1),P(a,z1,y1),s%2?k.trim:body);}
  for(let s=0;s<=N;s++){const [x,z]=f.W(nx0-.2+s*st,z1+.02);L.add('ABC'[(s+i)%3],x,y1-.06,z,.13,s);}
  for(let s=0;s<=12;s++){const [x,z]=f.W(bx0+.1+s*(bw-.2)/12,hd+.04);L.add('ABC'[(s+i+1)%3],x,3.4,z,.12,s);} // slinga längs takkanten
  // varor på disken (muggar, påsar) och en krans på hytten
  for(let s=0;s<5;s++){const lx=nx0+.35+s*.6,c=['#f4efe3','#c8352f','#f2d36b','#3f8f5f','#f4efe3'][s];f.box(lx,1.74,hd-.2,.18,.2,.18,c);}
  ring(S,f,hx+.86,2.15,0,'x');
}
// en krans (ring av små gröna rutor med en röd rosett) på en lodrät yta, axis = normalens axel i den lokala ramen
function ring(S,f,lx,y,lz,axis){for(let k=0;k<10;k++){const a=k/10*TAU,ox=Math.cos(a)*.28,oy=Math.sin(a)*.28;const [x,z]=f.W(lx+(axis==='x'?.02:ox),lz+(axis==='x'?ox:.02));S.box(x,y+oy,z,.13,.13,.13,k%2?'#2f7a4f':'#3b8f5f');}const [x,z]=f.W(lx+.03,lz);S.box(x,y-.24,z,.16,.12,.16,'#d33a3a');}
const mix=(a,b,k)=>{const p=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));const A=p(a),B=p(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*k).toString(16).padStart(2,'0')).join('');};

// ── Julmarknadsstugor på marknadsgatan ───────────────────────────────────────────────────────────────────────────
const GOODS={
  POLKAGRISAR:(f,y,z)=>{for(let i=0;i<9;i++){const lx=-1.3+i*.32;f.box(lx,y+.22,z,.08,.44,.08,'#f4f0e6');f.box(lx,y+.12+((i%3)*.09),z+.01,.09,.06,.09,'#d83a3a');}},
  LUSSEKATTER:(f,y,z)=>{for(let i=0;i<10;i++){const lx=-1.3+(i%5)*.55,lz=z+(i<5?-.15:.15);f.box(lx,y+.06,lz,.3,.1,.22,'#f2b33a','#d99a2a');f.box(lx+.06,y+.12,lz,.05,.04,.05,'#2a1a14');}},
  JULOST:(f,y,z)=>{for(let i=0;i<4;i++){const lx=-1.1+i*.72;f.box(lx,y+.12,z,.5,.24,.5,'#f1d27a','#d9b75e');f.box(lx,y+.25,z,.52,.03,.52,'#c8352f');}},
  'LJUS & LYKTOR':(f,y,z,G)=>{for(let i=0;i<7;i++){const lx=-1.3+i*.43;f.box(lx,y+.16,z,.12,.32,.12,i%2?'#f4f0e6':'#c8352f');G.box(lx,y+.36,z,.05,.07,.05,'#ffd45a');}},
  KERAMIK:(f,y,z)=>{for(let i=0;i<6;i++){const lx=-1.25+i*.5;f.box(lx,y+.13,z,.24,.26,.24,['#3c6fb2','#c98a5d','#2f7a6f'][i%3]);}},
  HONUNG:(f,y,z)=>{for(let i=0;i<8;i++){const lx=-1.3+i*.37;f.box(lx,y+.11,z,.2,.22,.2,'#f0b23a','#d6952a');f.box(lx,y+.24,z,.21,.04,.21,'#e9dcc0');}},
  'TRÄSLÖJD':(f,y,z)=>{for(let i=0;i<5;i++){const lx=-1.2+i*.6;f.box(lx,y+.2,z,.16,.4,.12,'#b07a45','#8a5e3b');f.box(lx,y+.44,z,.1,.1,.1,'#d33a3a');}},
  JULKORT:(f,y,z)=>{for(let i=0;i<8;i++){const lx=-1.3+i*.37;f.box(lx,y+.12,z-.1,.26,.24,.03,['#f7f2e4','#c8352f','#2f7a6f','#f2d36b'][i%4]);}}
};
function buildLaneStall(S,L,G,s,i){
  const f=frame(S,s.x,s.z,s.facing.x,s.facing.z),hw=LANE_STALL.w/2,hd=LANE_STALL.d/2,k=s.kind;
  f.box(0,.08,0,LANE_STALL.w,.16,LANE_STALL.d,'#7a5a3d');                                             // golv
  f.box(0,1.35,-hd+.06,LANE_STALL.w,2.5,.12,WOOD,WOOD2);                                              // bakvägg
  for(const sx of [-1,1])f.box(sx*(hw-.06),1.35,0,.12,2.5,LANE_STALL.d,WOOD,WOOD2);                   // sidoväggar
  for(let p=0;p<5;p++)f.box(0,.4+p*.48,-hd+.13,LANE_STALL.w-.2,.04,.02,WOOD2);                         // plankfogar
  f.box(0,.55,hd-.2,LANE_STALL.w-.1,.9,.4,WOOD,WOOD2);f.box(0,1.04,hd-.15,LANE_STALL.w+.1,.08,.6,PLANK); // disk och bänkskiva
  f.box(0,1.1,hd-.15,LANE_STALL.w-.1,.04,.52,SNOW);
  (GOODS[k.sign]||GOODS.JULKORT)(f,1.12,hd-.2,G);
  f.box(0,2.62,hd-.04,LANE_STALL.w+.2,.24,.12,k.awning);                                              // överliggare med stuckatur i markisens färg
  gable(f,-hw-.25,hw+.25,-hd-.3,hd+.55,2.72,1.05,'#7a2d2d','#5f2222');                              // tak med snö
  // gavelspets fram: trekant i trä, och skylten (bildatlasen) sitter där
  for(let p=0;p<=16;p++){const [x,z]=f.W(-hw-.2+p*(LANE_STALL.w+.4)/16,hd+.58);L.add('ABC'[(p+i)%3],x,2.68-Math.sin(p/16*Math.PI)*.12,z,.14,p);} // slinga längs takfoten
  for(let g=0;g<14;g++){const [x,z]=f.W(-hw-.2+g*(LANE_STALL.w+.4)/13,hd+.6);S.box(x,2.74,z,.26,.18,.2,g%2?'#2f7a4f':'#3b8f5f');} // granrisgirlang
  const [lx,lz]=f.W(hw-.35,hd+.4);S.box(lx,2.45,lz,.04,.3,.04,IRON);G.box(lx,2.18,lz,.22,.3,.22,'#ffd98a');S.box(lx,2.36,lz,.28,.06,.28,IRON); // lykta
}

// ── Julgransförsäljningen ────────────────────────────────────────────────────────────────────────────────────────
function buildLot(S,L,G){
  const {minx,maxx,minz,maxz,gate}=LOT,post=(x,z)=>{S.box(x,.62,z,.16,1.24,.16,WOOD,WOOD2);S.box(x,1.28,z,.22,.08,.22,SNOW);};
  const rail=(x0,z0,x1,z1)=>{const len=Math.hypot(x1-x0,z1-z0),alongX=Math.abs(x1-x0)>Math.abs(z1-z0);for(const y of [.45,.95])S.box((x0+x1)/2,y,(z0+z1)/2,alongX?len:.07,.1,alongX?.07:len,PLANK,WOOD);
    const n=Math.round(len);for(let k=0;k<=n;k++)L.add('ABC'[k%3],x0+(x1-x0)*k/n,1.02,z0+(z1-z0)*k/n,.12,k);};
  const side=(x0,z0,x1,z1)=>{const len=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(len/2));for(let k=0;k<=n;k++)post(x0+(x1-x0)*k/n,z0+(z1-z0)*k/n);rail(x0,z0,x1,z1);};
  side(minx,minz,maxx,minz);side(minx,maxz,maxx,maxz);side(minx,minz,minx,maxz);side(maxx,minz,maxx,gate.minz);side(maxx,gate.maxz,maxx,maxz);
  // portalen vid öppningen: två höga stolpar och en balk med granris (skylten sitter på balken)
  for(const z of [gate.minz,gate.maxz]){S.box(maxx,1.5,z,.26,3,.26,'#7a2d2d','#5f2222');S.box(maxx,3.08,z,.34,.16,.34,SNOW);}
  S.box(maxx,2.9,(gate.minz+gate.maxz)/2,.3,.3,gate.maxz-gate.minz+.3,'#2f7a4f');
  for(let k=0;k<=10;k++)L.add('ABC'[k%3],maxx+.2,2.72,gate.minz+(gate.maxz-gate.minz)*k/10,.16,k);
  // granarna
  for(const t of LOT_TREES){
    if(t.lean){ // en bunt liggande granar i nät
      S.box(t.x,.3,t.z,t.h,.55,.55,'#3f7f56','#356c49');for(let k=0;k<5;k++)S.box(t.x-t.h/2+.2+k*t.h/5,.3,t.z,.04,.58,.58,'#e8efe8');S.box(t.x+t.h/2+.08,.3,t.z,.16,.12,.12,'#7a5236');continue;
    }
    S.box(t.x,.08,t.z,.7,.08,.12,WOOD);S.box(t.x,.08,t.z,.12,.08,.7,WOOD);                           // fot (kors)
    if(t.net){cone(S,t.x,.2,t.z,.38,t.h,8,'#4a8c63','#3f7f56');for(let k=1;k<5;k++){const y=.2+t.h*k/5,r=.38*(1-k/5)+.02;S.box(t.x,y,t.z,r*2+.04,.03,r*2+.04,'#e8efe8');}continue;}
    const sc=t.h/2.2;[[.25,1.0,.85],[.85,.9,.65],[1.4,.8,.42]].forEach(([y,h,r])=>{cone(S,t.x,y*sc,t.z,r*sc,h*sc,9,'#2f7a4f','#3b8f5f');cone(S,t.x,(y+h*.6)*sc,t.z,r*sc*.38,h*sc*.4,7,SNOW,SNOW2);});
    S.box(t.x,.15,t.z,.1,.3,.1,'#6a4630');
  }
  // boden: röd med vita knutar, dörr, fönster (alltid tänt), snö på taket, skorsten
  const h=LOT.hut,f=frame(S,h.x,h.z,1,0),hw=h.d/2,hd=h.w/2; // vänd mot öster (mot öppningen)
  f.box(0,h.h/2,0,h.d,h.h,h.w,'#a62626','#8a1f1f');
  for(const sx of [-1,1])for(const sz of [-1,1])f.box(sx*(hw-.05),h.h/2,sz*(hd-.05),.14,h.h,.14,'#f4efe3');
  f.box(-.7,1.05,hd+.02,.9,2.0,.06,'#6e4a2f');G.box(.75,1.5,hd+.03,1.1,.8,.04,'#ffe2a0');f.box(.75,1.5,hd+.05,1.2,.08,.04,'#f4efe3');f.box(.75,1.5,hd+.05,.08,.86,.04,'#f4efe3');
  gable(f,-hw-.3,hw+.3,-hd-.35,hd+.35,h.h,1.0,'#3a3a40','#2c2c33');
  const [cxw,czw]=f.W(-hw+.6,-.6);S.box(cxw,h.h+1.0,czw,.4,1.1,.4,'#7a3a2a','#5f2c20');S.box(cxw,h.h+1.6,czw,.48,.12,.48,SNOW);
  // nätmaskinen: en tratt på ben, en rulle nät
  const n=LOT.funnel;for(const dz of [-.4,.4])S.box(n.x+.5,.5,n.z+dz,.08,1,.08,IRON);for(const dz of [-.4,.4])S.box(n.x-.6,.5,n.z+dz,.08,1,.08,IRON);
  for(let k=0;k<8;k++){const a=k/8*TAU,r0=.42,r1=.18;S.quad([n.x-.8,1.1+Math.cos(a)*r0,n.z+Math.sin(a)*r0],[n.x+.8,1.1+Math.cos(a)*r1,n.z+Math.sin(a)*r1],[n.x+.8,1.1+Math.cos(a+TAU/8)*r1,n.z+Math.sin(a+TAU/8)*r1],[n.x-.8,1.1+Math.cos(a+TAU/8)*r0,n.z+Math.sin(a+TAU/8)*r0],k%2?'#c9d3dc':'#9aa6b2');}
  S.box(n.x+1.1,1.1,n.z,.3,.36,.36,'#e8efe8','#cfd8d0');
  // lastpallar och en bock med en såg
  S.box(-52,.08,7.6,1.2,.16,.8,PLANK,WOOD);S.box(-52,.24,7.6,1.2,.16,.8,PLANK,WOOD);
  S.box(-58.4,.45,8.2,1.2,.08,.12,WOOD);for(const dx of [-.5,.5])S.box(-58.4+dx,.22,8.2,.08,.45,.5,WOOD2);
}

// ── Scenen ──────────────────────────────────────────────────────────────────────────────────────────────────────
function buildStage(S,L,G){
  const {minx,maxx,minz,maxz,deck,truss}=STAGE,cx=(minx+maxx)/2,cz=(minz+maxz)/2,W=maxx-minx,D=maxz-minz;
  S.box(cx,deck/2,cz,W,deck,D,'#2a2a33','#1f1f27');S.box(cx,deck+.03,cz,W-.1,.06,D-.1,'#3a3a44');      // golv
  S.box(minx-.02,deck*.5,cz,.04,deck*.9,D-.4,'#7a1f2f');                                              // skört
  for(let s=0;s<4;s++)S.box(minx+1.2+s*.55,(s+1)*deck/4/2,maxz+.6,.55,(s+1)*deck/4,1.2,'#3a3a44');  // trappa på södra sidan
  // truss: fyra torn och balkar runt om, med diagonaler
  const T=.34,top=deck+truss,towers=[[minx+.3,minz+.3],[minx+.3,maxz-.3],[maxx-.3,minz+.3],[maxx-.3,maxz-.3]];
  for(const [x,z] of towers){for(const ox of [-T/2,T/2])for(const oz of [-T/2,T/2])S.box(x+ox,deck+truss/2,z+oz,.06,truss,.06,'#c9ced6','#9aa1ab');
    for(let y=deck+.6;y<top;y+=.8)S.box(x,y,z,T,.04,T,'#9aa1ab');}
  const beam=(x0,z0,x1,z1)=>{const alongX=Math.abs(x1-x0)>.01,len=Math.hypot(x1-x0,z1-z0);for(const oy of [-T/2,T/2])for(const o of [-T/2,T/2])S.box((x0+x1)/2+(alongX?0:o),top+oy,(z0+z1)/2+(alongX?o:0),alongX?len:.06,.06,alongX?.06:len,'#c9ced6','#9aa1ab');
    const n=Math.round(len/.8);for(let k=0;k<n;k++){const u=(k+.5)/n;S.box(x0+(x1-x0)*u,top,z0+(z1-z0)*u,alongX?.05:T,T,alongX?T:.05,'#9aa1ab');}};
  beam(minx+.3,minz+.3,minx+.3,maxz-.3);beam(maxx-.3,minz+.3,maxx-.3,maxz-.3);beam(minx+.3,minz+.3,maxx-.3,minz+.3);beam(minx+.3,maxz-.3,maxx-.3,maxz-.3);
  // tak av duk över trussen, med snö
  S.box(cx,top+.32,cz,W+.4,.08,D+.4,'#151f3d');S.box(cx,top+.4,cz,W,.06,D,SNOW);
  // fondvägg och högtalare
  S.box(maxx-.15,deck+truss/2,cz,.2,truss,D-1.2,'#101830','#0b1124');
  for(const z of [minz+1.2,maxz-1.2]){S.box(minx+.8,deck+1.0,z,.9,2,1.1,'#18191d','#101114');for(const y of [.55,1.3])S.box(minx+.34,deck+y,z,.04,.55,.7,'#30333a');}
  // strålkastare på främre balken (själva ljuset är en effekt)
  for(let k=0;k<6;k++){const z=minz+2+k*(D-4)/5;S.box(minx+.3,top-.36,z,.3,.34,.3,'#22252b');G.box(minx+.13,top-.4,z,.04,.2,.2,'#fff6d0');}
  // lampor längs trussen och en stor stjärna i mitten
  for(let k=0;k<=24;k++)L.add('ABC'[k%3],minx+.1,top-.2,minz+.3+(D-.6)*k/24,.16,k);
  for(let k=0;k<=8;k++){L.add('ABC'[k%3],minx+.3+(W-.6)*k/8,top-.2,minz+.1,.16,k);L.add('ABC'[(k+1)%3],minx+.3+(W-.6)*k/8,top-.2,maxz-.1,.16,k);}
}

// ── Glasburen (insamlingen) ───────────────────────────────────────────────────────────────────────────────────────
function buildBooth(S,L,G,glass){
  const {x,z,w,d,h}=BOOTH,fz=z+d/2,bz=z-d/2;
  S.box(x,.14,z,w+.4,.28,d+.4,'#3a3a44','#2a2a33');                                                    // sockel
  for(const px of [x-w/2,x-w/6,x+w/6,x+w/2])for(const pz of [bz,fz])S.box(px,.28+h/2,pz,.12,h,.12,'#2b2f36');
  for(const px of [x-w/2,x+w/2])S.box(px,.28+h/2,z,.12,h,.12,'#2b2f36');
  S.box(x,.28+h+.1,z,w+.3,.2,d+.3,'#7a1f4f','#5e173c');S.box(x,.28+h+.24,z,w,.1,d,SNOW);               // tak
  S.box(x,.28+h/2,bz+.05,w-.1,h,.06,'#2a1f35');                                                        // bakvägg (mörk studio)
  // glasväggar: fram och på sidorna (genomskinlig mesh)
  glass.box(x,.28+h/2,fz,w-.1,h-.05,.04,'#bfe4ff');for(const px of [x-w/2,x+w/2])glass.box(px,.28+h/2,z,.04,h-.05,d-.1,'#bfe4ff');
  // inne: bord med mikrofoner, ett lysande hjärta på bakväggen
  S.box(x,.28+.75,z+.2,w-2.2,.08,1.1,'#d9d2c4');S.box(x,.28+.37,z+.2,w-2.4,.74,.9,'#3a3a44');
  for(const px of [x-1.2,x+1.2]){S.box(px,.28+1.0,z+.5,.04,.5,.04,IRON);S.box(px,.28+1.27,z+.5,.1,.14,.1,'#22252b');}
  heart(G,x,.28+h*.62,bz+.1,.75,'#ff3d6e');
  // bössan framför: röd låda med ett hjärta, på en stolpe
  const b=BOOTH.box;S.box(b.x,.55,b.z,.12,1.1,.12,IRON);S.box(b.x,1.25,b.z,.6,.5,.4,'#c8264f','#a01d3f');heart(G,b.x,1.25,b.z+.21,.16,'#fff1f6');
  for(let k=0;k<=18;k++)L.add('ABC'[k%3],x-w/2+w*k/18,.28+h+.02,fz+.12,.14,k);
}
// ett hjärta av små rutor i planet x/y (vänt mot +z)
function heart(G,x,y,z,s,col){for(let a=0;a<TAU;a+=TAU/28){const hx=16*Math.sin(a)**3,hy=13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a);G.box(x+hx/16*s,y+hy/16*s,z,s*.14,s*.14,.05,col);}for(let r=.2;r<.8;r+=.2)G.box(x,y+s*.1-r*s*.5,z,s*(1-r)*1.1,s*.12,.05,col);}

// ── Tomtens stuga ─────────────────────────────────────────────────────────────────────────────────────────────
function buildCottage(S,L,G){
  const c=COTTAGE,f=frame(S,c.x,c.z,0,-1),hw=c.w/2,hd=c.d/2; // vänd mot norr (mot torget)
  f.box(0,c.h/2,0,c.w,c.h,c.d,'#a62626','#8a1f1f');
  for(const sx of [-1,1])for(const sz of [-1,1])f.box(sx*(hw-.06),c.h/2,sz*(hd-.06),.16,c.h,.16,'#f4efe3');
  f.box(0,1.0,hd+.02,.95,2.0,.06,'#6e4a2f');ring(S,f,0,1.6,hd+.06,'z');
  for(const sx of [-1,1]){G.box(sx*1.45,1.5,hd+.03,.8,.7,.04,'#ffe2a0');f.box(sx*1.45,1.5,hd+.05,.9,.07,.04,'#f4efe3');f.box(sx*1.45,1.5,hd+.05,.07,.76,.04,'#f4efe3');}
  gable(f,-hw-.3,hw+.3,-hd-.35,hd+.4,c.h,1.15,'#3a3a40','#2c2c33');
  const [kx,kz]=f.W(hw-.8,-.4);S.box(kx,c.h+1.05,kz,.42,1.2,.42,'#7a3a2a','#5f2c20');S.box(kx,c.h+1.7,kz,.5,.12,.5,SNOW);
  for(let k=0;k<=14;k++){const [x,z]=f.W(-hw-.25+(c.w+.5)*k/14,hd+.42);L.add('ABC'[k%3],x,c.h-.05,z,.14,k);}
  // bänk med fårskinn och en brevlåda för önskelistor
  const b=c.bench;S.box(b.x,.42,b.z,2.4,.1,.55,PLANK,WOOD);for(const dx of [-1,1])S.box(b.x+dx,.2,b.z,.12,.4,.5,WOOD2);S.box(b.x,.75,b.z+.25,2.4,.6,.08,PLANK,WOOD);
  for(const dx of [-.6,.6])S.box(b.x+dx,.5,b.z,.7,.08,.5,'#f2ead8');
  S.box(b.x+2.2,.6,b.z+.2,.1,1.2,.1,IRON);S.box(b.x+2.2,1.32,b.z+.2,.5,.36,.34,'#d33a3a','#a62626');S.box(b.x+2.2,1.32,b.z+.38,.3,.04,.02,'#ffe08a');
  // sparkar och en pulka
  for(const [x,z] of [[c.x-3.6,c.z-1.2],[c.x-4.4,c.z-.9]]){S.box(x,.04,z,.06,.06,1.6,'#9aa6b2');S.box(x+.42,.04,z,.06,.06,1.6,'#9aa6b2');S.box(x+.21,.55,z-.2,.5,.08,.4,'#c8352f');for(const dx of [0,.42])S.box(x+dx,.6,z-.55,.05,1.2,.05,'#2b2f36');S.box(x+.21,1.2,z-.55,.5,.05,.05,'#2b2f36');}
  S.box(c.x+3.4,.15,c.z-1.4,.7,.2,1.2,'#2f6fb2','#235894');S.box(c.x+3.4,.27,c.z-1.9,.7,.25,.08,'#2f6fb2');
}

// ── Eldkorgar, ståbord, stolpar med lyktor och slingor, snövallar ────────────────────────────────────────────────
function buildFire(S,f,i){
  const {x,z}=f;for(let k=0;k<3;k++){const a=k/3*TAU+i;S.box(x+Math.cos(a)*.32,.3,z+Math.sin(a)*.32,.06,.6,.06,IRON);}
  for(let k=0;k<12;k++){const a=k/12*TAU;S.box(x+Math.cos(a)*.42,.82,z+Math.sin(a)*.42,.14,.44,.14,k%2?IRON:IRON2);}
  S.box(x,.62,z,.7,.06,.7,IRON2);for(const [dx,dz,w,d] of [[0,0,.8,.14],[0,.1,.14,.8],[.1,-.1,.7,.12]])S.box(x+dx,.74,z+dz,w,.12,d,'#5a3b2a','#3e2a1e');
  S.box(x,.7,z,.5,.04,.5,'#ff8a3d');                                                                     // glöd
  if(i%2===0){const bz=z+(z>0?-1.7:1.7);S.box(x,.4,bz,1.8,.12,.42,'#6a4630','#553826');for(const dx of [-.7,.7])S.box(x+dx,.2,bz,.16,.4,.36,'#553826');S.box(x-.4,.5,bz,.6,.08,.4,'#f2ead8');}
}
function buildTable(S,G,t){S.box(t.x,.55,t.z,.12,1.1,.12,IRON);S.box(t.x,.04,t.z,.5,.08,.5,IRON);cyl(S,t.x,1.08,t.z,.42,.06,8,'#8a5e3b','#6e4a2f','#b98a5b');S.box(t.x,1.15,t.z,.6,.03,.6,SNOW);
  G.box(t.x,1.26,t.z,.16,.2,.16,'#ffd98a');S.box(t.x,1.38,t.z,.2,.04,.2,IRON);}
function buildPole(S,G,p){S.box(p.x,p.h/2,p.z,.14,p.h,.14,'#1f3a32','#16302a');S.box(p.x,.1,p.z,.34,.2,.34,'#1f3a32');S.box(p.x,p.h+.06,p.z,.4,.08,.4,'#1f3a32');
  G.box(p.x,p.h-.28,p.z,.3,.42,.3,'#ffd98a');S.box(p.x,p.h-.04,p.z,.38,.06,.38,'#1f3a32');S.box(p.x,p.h+.1,p.z,.32,.06,.32,SNOW);}
function buildStrings(L){
  for(const s of STRINGS){const a=POLES[s.a],b=POLES[s.b],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(4,Math.round(len/.9));
    for(let k=0;k<=n;k++){const u=k/n,sag=s.sag*4*u*(1-u);L.add('ABC'[k%3],a.x+(b.x-a.x)*u,a.h-.5-sag,a.z+(b.z-a.z)*u,.13,k);}}
}
function buildBank(S,b){
  const c=Math.cos(b.yaw*Math.PI/180),s=Math.sin(b.yaw*Math.PI/180),n=Math.max(3,Math.round(b.len/1.4));
  for(let k=0;k<n;k++){const u=(k+.5)/n-.5,x=b.x+c*u*b.len,z=b.z-s*u*b.len,r=b.wid/2*(.75+.25*Math.sin(k*1.7)),h=b.h*(.7+.3*Math.cos(k*1.3));cone(S,x,0,z,r,h,9,SNOW,SNOW2);}
}

// Hela marknaden: fasta delar i S, blinkande lampor i L, alltid tända fönster och lyktglas i G, glaset i glass.
export function buildMarket(S,L,G,glass){
  TRUCKS.forEach((t,i)=>buildTruck(S,L,G,t,i));
  LANE.forEach((s,i)=>buildLaneStall(S,L,G,s,i));
  buildLot(S,L,G);buildStage(S,L,G);buildBooth(S,L,G,glass);buildCottage(S,L,G);
  FIRES.forEach((f,i)=>buildFire(S,f,i));
  for(const dz of [-3.4,3.4]){const x=ALLEY.minx-1.2,z=(ALLEY.north+ALLEY.south)/2+dz;S.box(x,2.7,z,.26,5.4,.26,'#7a2d2d','#5f2222');S.box(x,5.46,z,.34,.14,.34,SNOW);for(let k=0;k<6;k++)L.add('ABC'[k%3],x+.16,.8+k*.8,z,.14,k);}TABLES.forEach(t=>buildTable(S,G,t));POLES.forEach(p=>buildPole(S,G,p));buildStrings(L);SNOWBANKS.forEach(b=>buildBank(S,b));
}

// ── Skyltar: en bildatlas och en mesh ───────────────────────────────────────────────────────────────────────────
// Alla texter i en canvas (rad för rad), rutor med två sidor. Varje skylt: {lines, x, y, z, w, h, yaw, bg, fg}.
export function marketSigns(){
  const out=[...SIGNS];
  for(const t of TRUCKS){
    // namnet på framsidan ovanför luckan och menyn till vänster om den (lastbilarna vänder framsidan norrut: skylten läses norrifrån, yaw 180)
    out.push({id:t.id+'-name',lines:[t.kind.name,t.kind.sub],x:t.x-.4,z:t.z-TRUCK.wid/2-.04,y:3.02,w:3.4,h:.6,yaw:180,bg:t.kind.trim,fg:'#1d2a2b'});
    out.push({id:t.id+'-menu',lines:t.kind.menu,x:t.x-2.55,z:t.z-TRUCK.wid/2-.04,y:2.1,w:1.1,h:.82,yaw:180,bg:'#1d2a2b',fg:'#fff4d6'});
  }
  for(const s of LANE)out.push({id:s.id+'-sign',lines:[s.kind.sign],x:s.x,z:s.z+s.facing.z*(LANE_STALL.d/2+.62),y:3.06,w:2.5,h:.5,yaw:s.facing.z>0?0:180,bg:'#3a2a22',fg:'#ffe7a0'});
  // portalen in till marknadsgränden: två stolpar, skylten (SIGNS 'lane') hänger mellan dem
  out.push({id:'lot-price',lines:['KUNGSGRAN','NORDMANN · ROSTGRAN'],x:LOT.maxx+.2,z:LOT.gate.maxz+1.6,y:1.55,w:1.7,h:.85,yaw:90,bg:'#f4efe3',fg:'#2f6b45'});
  return out;
}
export function drawSignAtlas(c,signs,W=1024){
  // packa rader: varje skylt får en ruta med höjd efter förhållandet w/h (minst 48 px)
  const cells=[];let x=0,y=0,row=0;
  for(const s of signs){const ph=s.h>=1.2?112:s.h>=.8?84:64,pw=Math.min(W,Math.round(ph*s.w/s.h));if(x+pw>W){x=0;y+=row+4;row=0;}cells.push({s,x,y,w:pw,h:ph});x+=pw+4;row=Math.max(row,ph);}
  const H=y+row;if(!c)return {cells,H};
  for(const k of cells){
    const {s}=k;c.fillStyle=s.bg;c.beginPath();c.roundRect(k.x,k.y,k.w,k.h,Math.min(14,k.h*.18));c.fill();
    c.strokeStyle=s.fg;c.globalAlpha=.55;c.lineWidth=3;c.beginPath();c.roundRect(k.x+5,k.y+5,k.w-10,k.h-10,Math.min(10,k.h*.14));c.stroke();c.globalAlpha=1;
    c.fillStyle=s.fg;c.textAlign='center';c.textBaseline='middle';
    const n=s.lines.length,big=n===1?.56:.4,small=.24;
    c.font='900 '+Math.round(k.h*big)+'px system-ui,sans-serif';c.fillText(s.lines[0],k.x+k.w/2,k.y+k.h*(n===1?.53:.38),k.w*.9);
    if(n>1){c.font='800 '+Math.round(k.h*small)+'px system-ui,sans-serif';c.fillText(s.lines[1],k.x+k.w/2,k.y+k.h*.74,k.w*.9);}
  }
  return {cells,H};
}
// Mesh med en ruta per skylt (två sidor), uv efter atlasen.
export function signMesh(pc,dev,cells,W,H){
  const pos=[],uv=[],idx=[];
  for(const k of cells){
    const s=k.s,yaw=(s.yaw||0)*Math.PI/180,ax=Math.cos(yaw),az=-Math.sin(yaw),hw=s.w/2,v=pos.length/3;
    const u0=k.x/W,u1=(k.x+k.w)/W,v1=1-k.y/H,v0=1-(k.y+k.h)/H;
    for(const [lx,ly] of [[-hw,-s.h/2],[hw,-s.h/2],[hw,s.h/2],[-hw,s.h/2]])pos.push(s.x+ax*lx,s.y+ly,s.z+az*lx);
    uv.push(u0,v0,u1,v0,u1,v1,u0,v1);idx.push(v,v+1,v+2,v,v+2,v+3);
  }
  const m=new pc.Mesh(dev);m.setPositions(pos);m.setUvs(0,uv);m.setNormals(pos.map((_,i)=>i%3===1?1:0));m.setIndices(idx);m.update(pc.PRIMITIVE_TRIANGLES);return m;
}

// ── Effekter: lågor, sken, ånga och scenens strålar i en enda mesh (bildkort mot kameran) ──────────────────────────
export const FX_CELL=64,FX_COLS=4;
// celler: 0–3 lågor, 4 sken, 5 ånga, 6 stråle, 7 gnista
export function drawFxAtlas(c){
  const W=FX_CELL*FX_COLS;c.clearRect(0,0,W,W*.5);
  for(let f=0;f<4;f++){ // lågor: tre tungor, varje bildruta lite annorlunda
    const ox=f*FX_CELL,g=c.createRadialGradient(ox+32,52,2,ox+32,44,30);g.addColorStop(0,'#fff7c8');g.addColorStop(.35,'#ffc247');g.addColorStop(.7,'#ff6a1f');g.addColorStop(1,'#ff3a0000');
    c.fillStyle=g;for(const [dx,h,w] of [[0,50-f*3,13],[-9+f*2,34+f*4,8],[9-f,38+(f%2)*6,8]]){c.beginPath();c.moveTo(ox+32+dx-w,60);c.quadraticCurveTo(ox+32+dx-w*1.2,60-h*.5,ox+32+dx+(f%2?2:-2),60-h);c.quadraticCurveTo(ox+32+dx+w*1.2,60-h*.5,ox+32+dx+w,60);c.closePath();c.fill();}
  }
  const cell=(i,fn)=>{c.save();c.translate((i%FX_COLS)*FX_CELL,Math.floor(i/FX_COLS)*FX_CELL);fn();c.restore();};
  cell(4,()=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#ffffffff');g.addColorStop(.25,'#fff0c0b0');g.addColorStop(1,'#ffd08000');c.fillStyle=g;c.fillRect(0,0,64,64);});
  cell(5,()=>{for(const [x,y,r] of [[32,36,20],[22,30,13],[42,28,14],[32,22,12]]){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#ffffffa0');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,7);c.fill();}});
  cell(6,()=>{const g=c.createLinearGradient(0,0,0,64);g.addColorStop(0,'#ffffff00');g.addColorStop(1,'#ffffffc0');c.fillStyle=g;c.beginPath();c.moveTo(24,0);c.lineTo(40,0);c.lineTo(62,64);c.lineTo(2,64);c.closePath();c.fill();});
  cell(7,()=>{c.fillStyle='#fffbe0';c.beginPath();for(let i=0;i<8;i++){const r=i%2?5:28,a=i*Math.PI/4;c.lineTo(32+Math.cos(a)*r,32+Math.sin(a)*r);}c.closePath();c.fill();});
}
const fxUv=i=>{const col=i%FX_COLS,row=Math.floor(i/FX_COLS),rows=2;return [col/FX_COLS,1-(row+1)/rows,(col+1)/FX_COLS,1-row/rows];};

// Det levande lagret: effekter, skyltar, scenens skärm och insamlingens räkneverk. Returnerar {update(p,now,dt,cam), setDonations(n), snapshot()}.
export function createMarketLife(pc,host,{root,texture,sprites},{bright=new Set(),lite=()=>0}={}){
  const dev=host.app.graphicsDevice,group=new pc.Entity('Julmarknaden · liv');root.addChild(group);
  // skyltar
  const signs=marketSigns(),{cells,H}=drawSignAtlas(null,signs),SH=Math.pow(2,Math.ceil(Math.log2(Math.max(64,H))));
  const signTex=texture(c=>drawSignAtlas(c,signs),1024,SH);
  const signMat=sprites.spriteMaterial(signTex,{alphaTest:.05});bright.add(signMat);
  const sm=new pc.Entity('Julmarknadens skyltar');sm.addComponent('render',{meshInstances:[new pc.MeshInstance(signMesh(pc,dev,cells,1024,SH),signMat)]});group.addChild(sm);
  // effekter
  const fxTex=texture(c=>drawFxAtlas(c),FX_CELL*FX_COLS,FX_CELL*2);
  const fxMat=new pc.StandardMaterial();fxMat.name='Julmarknaden effekter';fxMat.useLighting=false;fxMat.diffuse.set(0,0,0);fxMat.emissive.set(1,1,1);fxMat.emissiveMap=fxTex;fxMat.emissiveVertexColor=true;
  fxMat.opacityMap=fxTex;fxMat.opacityMapChannel='a';fxMat.blendType=pc.BLEND_ADDITIVEALPHA;fxMat.depthWrite=false;fxMat.cull=pc.CULLFACE_NONE;fxMat.update();bright.add(fxMat);
  const emitters=[];
  for(const f of FIRES){emitters.push({kind:'flame',x:f.x,y:.72,z:f.z,w:.9,h:1.25,seed:hashStr(f.id)%97});emitters.push({kind:'flame',x:f.x+.12,y:.72,z:f.z-.1,w:.7,h:.95,seed:hashStr(f.id)%53+3});emitters.push({kind:'glow',x:f.x,y:1.1,z:f.z,w:3.4,h:3.4,col:[1,.55,.2],seed:1});}
  for(const p of POLES)emitters.push({kind:'glow',x:p.x,y:p.h-.3,z:p.z,w:1.6,h:1.6,col:[1,.78,.42],seed:hashStr(p.id)%31});
  for(const t of TABLES)emitters.push({kind:'glow',x:t.x,y:1.3,z:t.z,w:.9,h:.9,col:[1,.75,.4],seed:2});
  for(const t of TRUCKS){for(let k=0;k<3;k++)emitters.push({kind:'steam',x:t.x-TRUCK.len/2+.9,y:4.1,z:t.z-.4,w:1,h:1,seed:k*1.7+hashStr(t.id)%7,life:3.2});emitters.push({kind:'glow',x:t.x-.4,y:2.2,z:t.z-TRUCK.wid/2-.2,w:3.6,h:2.2,col:[1,.85,.55],seed:3});}
  for(let k=0;k<6;k++){const z=STAGE.minz+2+k*(STAGE.maxz-STAGE.minz-4)/5;emitters.push({kind:'beam',x:STAGE.minx+.1,y:STAGE.deck+STAGE.truss-.4,z,w:1.6,h:STAGE.truss-.4,col:[[1,.45,.7],[.45,.75,1],[1,.85,.4]][k%3],seed:k*1.3});}
  emitters.push({kind:'glow',x:BOOTH.x,y:BOOTH.h*.7,z:BOOTH.z,w:5,h:3.6,col:[1,.35,.55],seed:4});
  emitters.push({kind:'glow',x:COTTAGE.x,y:1.5,z:COTTAGE.z-COTTAGE.d/2-.2,w:4.2,h:2.4,col:[1,.8,.45],seed:5});
  const N=emitters.length,fxPos=new Float32Array(N*12),fxUvs=new Float32Array(N*8),fxCol=new Uint8Array(N*16),fxIdx=new Uint16Array(N*6);
  for(let i=0;i<N;i++){const v=i*4;fxIdx.set([v,v+1,v+2,v,v+2,v+3],i*6);}
  const fxMesh=new pc.Mesh(dev);fxMesh.clear(true,false,N*4,N*6);fxMesh.setPositions(fxPos);fxMesh.setUvs(0,fxUvs);fxMesh.setColors32(fxCol);fxMesh.setIndices(fxIdx);fxMesh.update(pc.PRIMITIVE_TRIANGLES,false);
  const fxMi=new pc.MeshInstance(fxMesh,fxMat);fxMi.cull=false;const fxEnt=new pc.Entity('Julmarknaden · lågor och sken');fxEnt.addComponent('render',{meshInstances:[fxMi]});group.addChild(fxEnt);
  // scenens skärm och insamlingens räkneverk: små texturer som ritas om när något ändras
  const screenCanvas=document.createElement('canvas');screenCanvas.width=512;screenCanvas.height=220;
  const screenTex=new pc.Texture(dev,{width:512,height:220,format:pc.PIXELFORMAT_RGBA8,flipY:true,mipmaps:false,minFilter:pc.FILTER_LINEAR,magFilter:pc.FILTER_LINEAR});
  const screenMat=sprites.spriteMaterial(screenTex,{alphaTest:0});bright.add(screenMat);
  const screen=sprites.spriteEntity('Scenens skärm',screenMat,STAGE.screen.w,STAGE.screen.h,{});group.addChild(screen);
  screen.setPosition(STAGE.maxx-.3,STAGE.deck+STAGE.screen.y-STAGE.screen.h/2,0);screen.setEulerAngles(0,-90,0);
  const countCanvas=document.createElement('canvas');countCanvas.width=512;countCanvas.height=128;
  const countTex=new pc.Texture(dev,{width:512,height:128,format:pc.PIXELFORMAT_RGBA8,flipY:true,mipmaps:false,minFilter:pc.FILTER_LINEAR,magFilter:pc.FILTER_LINEAR});
  const countMat=sprites.spriteMaterial(countTex,{alphaTest:0});bright.add(countMat);
  const counter=sprites.spriteEntity('Insamlingens räkneverk',countMat,4.4,1.1,{});group.addChild(counter);
  counter.setPosition(BOOTH.x,BOOTH.h+1.45,BOOTH.z+BOOTH.d/2+.1);
  let screenKey='',donations=0,countKey='';
  const upload=(tex,canvas)=>{tex.setSource(canvas);};
  function drawScreen(h){
    const act=stageActAt(h),next=nextActAfter(h),key=(act?act.title:'-')+'|'+next.title+'|'+Math.floor(h*4);if(key===screenKey)return;screenKey=key;
    const c=screenCanvas.getContext('2d'),W=512,Hc=220;const g=c.createLinearGradient(0,0,W,Hc);g.addColorStop(0,'#151f3d');g.addColorStop(1,'#3a1f4f');c.fillStyle=g;c.fillRect(0,0,W,Hc);
    c.fillStyle='#ffd56b';c.textAlign='center';c.textBaseline='middle';c.font='900 26px system-ui,sans-serif';c.fillText(act?'PÅ SCEN NU':'SENARE IDAG',W/2,34);
    c.fillStyle='#ffffff';c.font='900 56px system-ui,sans-serif';c.fillText(act?act.title:next.title,W/2,96,W-30);
    c.fillStyle='#cfe3ff';c.font='700 24px system-ui,sans-serif';c.fillText(act?act.line:'Kl '+String(Math.floor(next.start)).padStart(2,'0')+'.'+(next.start%1?'30':'00')+' · '+next.line,W/2,146,W-30);
    c.fillStyle='#ffd56b';for(let k=0;k<24;k++){c.globalAlpha=.25+.75*((k*7)%5)/4;c.beginPath();c.arc(20+k*20.5,196,4,0,7);c.fill();}c.globalAlpha=1;
    upload(screenTex,screenCanvas);
  }
  function drawCount(){
    const key=String(donations);if(key===countKey)return;countKey=key;
    const c=countCanvas.getContext('2d');c.fillStyle='#2a0f22';c.beginPath();c.roundRect(0,0,512,128,18);c.fill();c.strokeStyle='#ff6f9a';c.lineWidth=6;c.beginPath();c.roundRect(6,6,500,116,14);c.stroke();
    c.fillStyle='#ffd6e4';c.textAlign='center';c.textBaseline='middle';c.font='800 24px system-ui,sans-serif';c.fillText('DU HAR SKÄNKT',256,32);
    c.fillStyle='#ffffff';c.font='900 52px system-ui,sans-serif';c.fillText(donations.toLocaleString('sv-SE')+' '+(donations===1?'TERMOS':'TERMOSAR'),256,82,480);
    upload(countTex,countCanvas);
  }
  const hourNow=()=>{try{const s=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());const [h,m]=s.split(/[:.]/).map(Number);return h+m/60;}catch{const d=new Date();return d.getHours()+d.getMinutes()/60;}};
  let hour=hourNow(),hourAt=0,shown=0;
  drawScreen(hour);drawCount();
  const camPos=new pc.Vec3();
  function update(p,now,dt){
    const near=Math.abs(p.x)<150&&p.z>-120&&p.z<110;if(group.enabled!==near)group.enabled=near;if(!near)return;
    if(now-hourAt>30000){hourAt=now;hour=hourNow();drawScreen(hour);}
    camPos.copy(host.camera.getPosition());const L=lite(),t=now/1000;let n=0;
    for(let i=0;i<N;i++){
      const e=emitters[i];let x=e.x,y=e.y,z=e.z,w=e.w,h=e.h,cell=4,r=1,g=1,b=1,a=1,up=0;
      const dx=camPos.x-x,dz=camPos.z-z,dist=Math.hypot(dx,dz);if(dist>95||(L>=2&&e.kind!=='flame'))continue;
      if(e.kind==='flame'){cell=Math.floor(t*9+e.seed)%4;const k=.85+.15*Math.sin(t*11+e.seed);h*=k;w*=.95+.08*Math.sin(t*7+e.seed);}
      else if(e.kind==='glow'){[r,g,b]=e.col;const k=.78+.22*Math.sin(t*(e.kind==='glow'?2.3:1)+e.seed);r*=k;g*=k;b*=k;y-=h/2;}
      else if(e.kind==='steam'){if(L>=1)continue;const u=((t+e.seed)%e.life)/e.life;cell=5;y+=u*2.4;x+=Math.sin(t*.7+e.seed)*.3*u;w=h=.6+u*1.6;a=1-u;r=g=b=.5*(1-u)+.05;}
      else if(e.kind==='beam'){cell=6;[r,g,b]=e.col;const k=.45+.25*Math.sin(t*1.3+e.seed);r*=k;g*=k;b*=k;up=1;}
      // bildkortet vänder sig mot kameran runt den lodräta axeln; strålar pekar nedåt från strålkastaren och sveper i sidled
      let ax,az;if(dist>1e-3){ax=-dz/dist;az=dx/dist;}else{ax=1;az=0;}
      const o=n*12,hw=w/2;
      if(up){const sweep=Math.sin(t*.6+e.seed)*3,tx=x-6,tz=z+sweep;const bx=tx-x,bz=tz-z,bl=Math.hypot(bx,bz)||1,y0=y,y1=STAGE.deck+.05;
        const ex=x+bx,ez=z+bz;fxPos.set([x+ax*.18,y0,z+az*.18, x-ax*.18,y0,z-az*.18, ex-ax*hw,y1,ez-az*hw, ex+ax*hw,y1,ez+az*hw],o);}
      else fxPos.set([x-ax*hw,y,z-az*hw, x+ax*hw,y,z+az*hw, x+ax*hw,y+h,z+az*hw, x-ax*hw,y+h,z-az*hw],o);
      const [u0,v0,u1,v1]=fxUv(cell),u=n*8;
      if(up){fxUvs.set([u0,v1,u1,v1,u1,v0,u0,v0],u);}else fxUvs.set([u0,v0,u1,v0,u1,v1,u0,v1],u);
      const cr=Math.round(Math.min(1,r)*255),cg=Math.round(Math.min(1,g)*255),cb=Math.round(Math.min(1,b)*255),ca=Math.round(Math.min(1,a)*255);
      for(let k=0;k<4;k++)fxCol.set([cr,cg,cb,ca],n*16+k*4);
      n++;
    }
    for(let i=n;i<shown;i++)fxPos.fill(0,i*12,i*12+12);
    shown=n;fxMesh.setPositions(fxPos);fxMesh.setUvs(0,fxUvs);fxMesh.setColors32(fxCol);fxMesh.update(pc.PRIMITIVE_TRIANGLES,false);
  }
  return {update,group,setDonations(n){donations=Math.max(0,Math.floor(n)||0);drawCount();},refreshProgram(){hourAt=0;},
    snapshot:()=>({signs:cells.length,effects:shown,emitters:N,act:(stageActAt(hour)||{}).title||null,donations}),
    drawCalls:()=>group.enabled?4:0};
}
