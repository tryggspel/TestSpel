// Rådhuset vid Stora Torget (2.21.1-xmas.14): byggt som geometri i stället för en texturbild, efter beskrivningar av huset.
// Källor (hämtade 2026-11-25): Riksantikvarieämbetets bebyggelseregister via Kringla ("gulputsade fasader med vita listverk",
// "Huvudentrén är belägen i den svagt utskjutande mittrisaliten", "kröns av ett enormt urverk som på var sida flankeras av en väldig
// örnskulptur"), domstol.se om rådhusets historia (Ernst Jacobsson, invigt 1869, nyrenässans, arkadmotiv i bottenvåningen, höga
// rundbågiga fönster och kompositpilastrar i översta våningen) och VF om örnarnas förgyllning ("fôgglera").
// Osäkert: pilastrarnas färg (vita på 1960-talet enligt KT; i dag gula). Här är de en ljusare gul än väggen med vita kapitäl.
// Ingen bild från källorna används. Måtten (antal fönsteraxlar, höjder) är uppskattade; OSM äger fotavtrycket.
export const RADHUSET_COLOURS=Object.freeze({
  wall:'#d9ad4c',rust:'#cf9f42',rustJoint:'#b98a36',pilaster:'#e4bf63',plinth:'#a39985',trim:'#f5eedb',sill:'#e2d4b0',
  glass:'#33444e',glassHi:'#4f6470',door:'#4a3626',roof:'#3e4950',roofSide:'#2f383e',
  clock:'#f7f2e2',clockRim:'#c9a23a',clockTick:'#24323a',gold:'#d2a937',goldDark:'#9b7522'
});
export const RADHUSET=Object.freeze({H:15.4,ground:5,first:10.2,bay:3.3,risalitBays:5,risalitOut:.7,attic:2.4,clockR:1.45});
// Torgfasaden: OSM-kanten (-72.3,-28.2) → (-74.0,21.5), rakt österut över torget.
export const RADHUSET_FRONT=Object.freeze({a:Object.freeze([-72.3,-28.2]),q:Object.freeze([-74.0,21.5])});

// En fasad som en kant med utåtriktad normal (samma form som exposedFaces i city-architecture.js).
export function faceFrom(a,q){
  const dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz),tx=dx/length,tz=dz/length;
  return {a,q,length,tx,tz,nx:tz,nz:-tx,ccw:true,yaw:Math.atan2(tz,-tx)*180/Math.PI};
}
// Ritverktyg på en fasad: u längs kanten, y uppåt, o ut från väggen.
export function facePainter(m,f){
  const P=(u,y,o)=>[f.a[0]+f.tx*u+f.nx*o,y,f.a[1]+f.tz*u+f.nz*o];
  const tri=(A,B,C,col,both=false)=>{if(f.ccw)m.tri(A,C,B,col);else m.tri(A,B,C,col);if(both){if(f.ccw)m.tri(A,B,C,col);else m.tri(A,C,B,col);}};
  const panel=(u,y,w,h,col,o)=>{if(w<=.02||h<=.02)return;const A=P(u,y,o),B=P(u+w,y,o),D=P(u,y+h,o),E=P(u+w,y+h,o);if(f.ccw)m.quad(B,A,D,E,col);else m.quad(A,B,E,D,col);};
  const arch=(u,y,r,col,o,n=10)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI,b=(i+1)/n*Math.PI;tri(P(u,y,o),P(u+Math.cos(a)*r,y+Math.sin(a)*r,o),P(u+Math.cos(b)*r,y+Math.sin(b)*r,o),col);}};
  const disc=(u,y,r,col,o,n=20)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;tri(P(u,y,o),P(u+Math.cos(a)*r,y+Math.sin(a)*r,o),P(u+Math.cos(b)*r,y+Math.sin(b)*r,o),col);}};
  // konvex polygon i (u,y), som en solfjäder; both = synlig från båda hållen (fristående skulptur)
  const poly=(pts,col,o,both=false)=>{for(let i=1;i<pts.length-1;i++)tri(P(pts[0][0],pts[0][1],o),P(pts[i][0],pts[i][1],o),P(pts[i+1][0],pts[i+1][1],o),col,both);};
  // en sida vinkelrätt mot fasaden (risalitens hörn): från o0 till o1 vid u
  const side=(u,y0,y1,o0,o1,col,left)=>{const A=P(u,y0,o0),B=P(u,y0,o1),C=P(u,y1,o1),D=P(u,y1,o0);if(left===f.ccw)m.quad(A,B,C,D,col);else m.quad(B,A,D,C,col);};
  const block=(u,y,w,h,o0,o1,col,top=col)=>{panel(u,y,w,h,col,o1);side(u,y,y+h,o0,o1,col,true);side(u+w,y,y+h,o0,o1,col,false);
    const A=P(u,y+h,o0),B=P(u+w,y+h,o0),C=P(u+w,y+h,o1),D=P(u,y+h,o1);if(f.ccw)m.quad(A,D,C,B,top);else m.quad(A,B,C,D,top);};
  return {P,tri,panel,arch,disc,poly,side,block};
}

// En örn på taket (fôgglera): sockel, kropp, utbredda vingar och huvud, förgyllda. Står fritt, så ytorna syns från båda hållen.
export function addEagle(m,f,u,y,o,s=1,look=1){
  const C=RADHUSET_COLOURS,{poly,block}=facePainter(m,f);
  block(u-.55*s,y,1.1*s,.75*s,o-.5*s,o+.5*s,'#e9dfc5','#f2ead6');
  const b=y+.75*s,X=(du,dy)=>[u+du*s*look,b+dy*s],oo=o+.08;
  poly([X(0,0),X(.38,.45),X(.34,1.25),X(0,1.55),X(-.34,1.25),X(-.38,.45)],C.gold,oo,true);              // kropp
  poly([X(-.25,.75),X(-.3,1.25),X(-1.35,2.15),X(-1.6,1.55),X(-1.05,.95)],C.goldDark,oo+.02,true);        // vinge
  poly([X(.25,.75),X(1.05,.95),X(1.6,1.55),X(1.35,2.15),X(.3,1.25)],C.goldDark,oo+.02,true);             // vinge
  poly([X(-.18,1.45),X(.18,1.45),X(.22,1.82),X(0,1.98),X(-.2,1.8)],C.gold,oo+.03,true);                  // huvud
  poly([X(.18,1.8),X(.5,1.7),X(.2,1.62)],C.goldDark,oo+.04,true);                                         // näbb
  poly([X(-.36,0),X(.36,0),X(.5,.18),X(-.5,.18)],C.goldDark,oo+.03,true);                                  // stjärtfjädrar mot sockeln
}

// En urtavla: guldram, vit tavla, timstreck och visarna på tio över tio.
export function addClockFace(m,f,u,y,o,r){
  const C=RADHUSET_COLOURS,{disc,poly}=facePainter(m,f);
  disc(u,y,r+.16,C.clockRim,o);disc(u,y,r,C.clock,o+.03);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,c=Math.cos(a),s=Math.sin(a),w=i%3?.035:.07,l=i%3?.16:.28;
    const p=(d,t)=>[u+c*d-s*t,y+s*d+c*t];poly([p(r-.06-l,-w),p(r-.06,-w),p(r-.06,w),p(r-.06-l,w)],C.clockTick,o+.05);}
  const hand=(deg,len,w)=>{const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),p=(d,t)=>[u+c*d-s*t,y+s*d+c*t];poly([p(-.12,-w),p(len,-w*.4),p(len,w*.4),p(-.12,w)],C.clockTick,o+.07);};
  hand(150,r*.55,.07);hand(30,r*.82,.05);disc(u,y,.08,C.clockRim,o+.08,8);
}

// En fasad. main = torgfasaden med mittrisalit, entréer, ur och örnar.
export function addRadhusetWall(m,f,{H=RADHUSET.H,main=false}={}){
  const C=RADHUSET_COLOURS,R=RADHUSET,{panel,arch,side,block,poly}=facePainter(m,f);
  const L=f.length,bays=Math.max(1,Math.round(L/R.bay)),bw=L/bays;
  const rb=main?Math.min(R.risalitBays,bays-2):0,r0=main?Math.floor((bays-rb)/2):-1,r1=r0+rb; // risalitens fönsteraxlar [r0, r1)
  const inR=i=>main&&i>=r0&&i<r1,off=i=>inR(i)?R.risalitOut:0,uR0=r0*bw,uR1=r1*bw;
  // väggen och risaliten
  panel(0,0,L,H,C.wall,.03);
  if(main){
    panel(uR0,0,uR1-uR0,H,C.wall,R.risalitOut+.03);side(uR0,0,H,.03,R.risalitOut+.03,C.wall,true);side(uR1,0,H,.03,R.risalitOut+.03,C.wall,false);
  }
  const plane=(u0,u1,y,h,col,o)=>{ // samma band över hela fasaden och runt risaliten
    if(!main){panel(u0,y,u1-u0,h,col,o);return;}
    panel(0,y,uR0,h,col,o);panel(uR1,y,L-uR1,h,col,o);panel(uR0-.02,y,uR1-uR0+.04,h,col,o+R.risalitOut);
    side(uR0-.02,y,y+h,o,o+R.risalitOut,col,true);side(uR1+.02,y,y+h,o,o+R.risalitOut,col,false);
  };
  // sockel och rusticerad bottenvåning med arkadmotiv
  plane(0,L,0,.6,C.plinth,.08);plane(0,L,.6,R.ground-.6,C.rust,.05);
  for(let y=1.22;y<R.ground-.2;y+=.62)plane(0,L,y,.06,C.rustJoint,.07);
  for(let i=0;i<bays;i++){
    const cx=(i+.5)*bw,o=off(i)+.08,door=inR(i)&&(i-r0>=1&&i-r0<=rb-2||rb<3);
    // pelarna mellan arkadbågarna
    panel(i*bw+.05,.6,.42,R.ground-.6,C.rust,o+.02);panel((i+1)*bw-.47,.6,.42,R.ground-.6,C.rust,o+.02);
    if(door){
      const w=Math.min(2.1,bw-.9),r=w/2;
      panel(cx-r-.22,0,w+.44,3.15,C.trim,o);arch(cx,3.15,r+.22,C.trim,o);
      panel(cx-r,0,w,3.15,C.door,o+.04);arch(cx,3.15,r,C.glassHi,o+.04);arch(cx,3.15,r*.8,C.glass,o+.06);
      panel(cx-.03,.15,.06,2.9,C.trim,o+.06);panel(cx-r+.12,1.2,w-.24,.08,C.goldDark,o+.06);
    }else{
      const w=Math.min(1.55,bw-1.1),r=w/2;
      panel(cx-r-.18,1.0,w+.36,2.3,C.trim,o);arch(cx,3.3,r+.18,C.trim,o);
      panel(cx-r,1.15,w,2.15,C.glass,o+.03);arch(cx,3.3,r,C.glass,o+.03);
      panel(cx-.03,1.15,.06,2.6,C.trim,o+.05);panel(cx-r,2.45,w,.06,C.trim,o+.05);
      panel(cx-r-.26,.95,w+.52,.12,C.sill,o+.06);
    }
    // nyckelsten
    poly([[cx-.18,R.ground-.62],[cx+.18,R.ground-.62],[cx+.13,R.ground-.98],[cx-.13,R.ground-.98]],C.trim,o+.08);
  }
  // gördelgesims
  plane(0,L,R.ground,.36,C.trim,.18);plane(0,L,R.ground+.36,.08,C.sill,.24);
  // första våningen: raka fönster med omfattning; frontoner i risaliten, raka överstycken utanför
  for(let i=0;i<bays;i++){
    const cx=(i+.5)*bw,o=off(i)+.06,w=Math.min(1.35,bw-1.3),y=R.ground+1.05,h=2.55;
    panel(cx-w/2-.2,y-.2,w+.4,h+.4,C.trim,o);panel(cx-w/2,y,w,h,C.glass,o+.03);
    panel(cx-.03,y,.06,h,C.trim,o+.05);panel(cx-w/2,y+h*.62,w,.06,C.trim,o+.05);
    panel(cx-w/2-.34,y-.36,w+.68,.16,C.sill,o+.05);
    if(inR(i))poly([[cx-w/2-.42,y+h+.32],[cx+w/2+.42,y+h+.32],[cx,y+h+.95]],C.trim,o+.08);
    else panel(cx-w/2-.34,y+h+.28,w+.68,.2,C.trim,o+.07);
  }
  plane(0,L,R.first,.3,C.trim,.14);
  // andra våningen: höga rundbågiga fönster mellan pilastrar med kapitäl
  const top=H-.95;
  for(let i=0;i<=bays;i++){
    const u=Math.min(L-.25,Math.max(.25,i*bw)),o=(inR(i)||inR(i-1))&&i!==r0&&i!==r1?R.risalitOut:0;
    for(const oo of (main&&(i===r0||i===r1))?[0,R.risalitOut]:[o]){
      panel(u-.24,R.first+.3,.48,top-R.first-.3,C.pilaster,oo+.07);
      panel(u-.34,top-.42,.68,.42,C.trim,oo+.1);panel(u-.3,R.first+.3,.6,.22,C.trim,oo+.09);
    }
  }
  for(let i=0;i<bays;i++){
    const cx=(i+.5)*bw,o=off(i)+.06,w=Math.min(1.3,bw-1.25),r=w/2,y=R.first+.95,h=2.05;
    panel(cx-r-.17,y-.1,w+.34,h+.1,C.trim,o);arch(cx,y+h,r+.17,C.trim,o);
    panel(cx-r,y,w,h,C.glass,o+.03);arch(cx,y+h,r,C.glass,o+.03);
    panel(cx-.03,y,.06,h+r,C.trim,o+.05);panel(cx-r,y+h,w,.06,C.trim,o+.05);
    panel(cx-r-.3,y-.26,w+.6,.14,C.sill,o+.05);
  }
  // huvudgesims med tandsnitt
  plane(0,L,top,.22,C.trim,.12);plane(0,L,top+.22,.5,C.wall,.08);plane(0,L,H-.25,.28,C.trim,.3);
  for(let u=.3;u<L-.2;u+=.55){const o=main&&u>uR0&&u<uR1?R.risalitOut:0;panel(u,top+.3,.24,.3,C.trim,o+.16);}
  if(!main)return {bays,risalit:null};
  // Krönet över risaliten: attika, uret och örnarna.
  const mid=(uR0+uR1)/2,o=R.risalitOut;
  block(uR0+.2,H,uR1-uR0-.4,.9,o-.6,o+.05,C.wall,C.trim);panel(uR0+.15,H+.9,uR1-uR0-.3,.18,C.trim,o+.12);
  for(let u=uR0+.7;u<uR1-.5;u+=.62)panel(u,H+.12,.22,.62,C.trim,o+.09);   // balusterrad
  const cw=R.clockR*2+1.3,ch=R.clockR*2+1.6;
  block(mid-cw/2,H,cw,ch,o-1.2,o+.12,C.wall,C.trim);
  panel(mid-cw/2-.12,H+ch,cw+.24,.22,C.trim,o+.2);
  poly([[mid-cw/2-.15,H+ch+.22],[mid+cw/2+.15,H+ch+.22],[mid+cw*.32,H+ch+.75],[mid,H+ch+.95],[mid-cw*.32,H+ch+.75]],C.trim,o+.18);
  addClockFace(m,f,mid,H+ch/2+.05,o+.16,R.clockR);
  for(const s of [-1,1])addEagle(m,f,mid+s*(cw/2+1.7),H+.9,o-.3,1.05,s);
  return {bays,risalit:{u0:uR0,u1:uR1,mid},clockY:H+ch/2+.05,eagles:2};
}

// Ett valmat tak på en fyrhörning (A,B,C,D runt om, A–B och C–D är kortsidorna). Trianglarna vänds så att de pekar uppåt.
export function hipQuad(m,A,B,C,D,y,h,col,colSide){
  const up=(a,b,c,k)=>{const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]),ny=u[2]*v[0]-u[0]*v[2];if(ny>=0)m.tri(a,b,c,k);else m.tri(a,c,b,k);};
  const N=[(A[0]+B[0])/2,(A[1]+B[1])/2],S=[(C[0]+D[0])/2,(C[1]+D[1])/2],len=Math.hypot(S[0]-N[0],S[1]-N[1]),d=[(S[0]-N[0])/len,(S[1]-N[1])/len];
  const hw=Math.min(Math.hypot(B[0]-A[0],B[1]-A[1])/2,len/2-.01);
  const p=[N[0]+d[0]*hw,y+h,N[1]+d[1]*hw],q=[S[0]-d[0]*hw,y+h,S[1]-d[1]*hw],V=v=>[v[0],y,v[1]];
  up(V(B),V(C),q,col);up(V(B),q,p,col);up(V(D),V(A),p,colSide);up(V(D),p,q,colSide);up(V(A),V(B),p,colSide);up(V(C),V(D),q,col);
  // takfoten
  for(const [a,b] of [[A,B],[B,C],[C,D],[D,A]]){const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);const ang=Math.atan2(dx,dz);
    m.box((a[0]+b[0])/2,y-.1,(a[1]+b[1])/2,Math.abs(Math.sin(ang))*l+.3,.22,Math.abs(Math.cos(ang))*l+.3,'#233b40');}
}
// Lågt valmat plåttak över huvudkroppen och den lilla västflygeln, efter OSM-hörnen (huset står cirka 2° snett).
export function addRadhusetRoof(m,H=RADHUSET.H){
  const C=RADHUSET_COLOURS,e=.35;
  hipQuad(m,[-87.4-e,-28.7-e],[-72.3+e,-28.2-e],[-74.0+e,21.5+e],[-89.3-e,21.0+e],H,3.0,C.roof,C.roofSide);
  hipQuad(m,[-93.2-e,-9.1-e],[-88.0,-8.9-e],[-88.6,1.0+e],[-93.5-e,0.9+e],H,1.4,C.roof,C.roofSide);
  for(const [x,z] of [[-81.2,-22],[-81.2,-10],[-81.8,8],[-82.1,17]])m.box(x,H+2.4,z,.9,1.8,.9,'#8b6f59','#76604e'); // skorstenar
}
