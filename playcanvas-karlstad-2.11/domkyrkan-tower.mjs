// Domkyrkans västtorn (2.21.1-xmas.14): stadens tydligaste riktmärke, byggt som geometri. Det syns över taken från Stora Torget,
// precis som i verkligheten. Källor (hämtade 2026-11-25): Riksantikvarieämbetets bebyggelseregister via Kringla (västtorn 1734–37,
// "hög, konformig spira", "urverk med urtavlor åt samtliga väderstreck", spiran "avslutas med ett kors på en urnliknande kula",
// byte av kopparplåten på spiran vid en restaurering), Svenska kyrkan ("vitputsad stenkyrka"), Svenska Wikipedia och Wikidata
// (tornets höjd 65 respektive 58 m). Spiran ritades efter stadsbranden 1865 (Albert Törnqvist).
// Osäkert: spirans exakta form och kopparns nyans. Här en åttakantig kon i patinerad koppar. Ingen bild från källorna används.
export const DOMKYRKAN_COLOURS=Object.freeze({
  wall:'#f3ecdc',wallShade:'#dcd6c6',pilaster:'#fbf6ea',cornice:'#e2dccb',plinth:'#a3a597',louvre:'#2b3a3f',glass:'#3a4a52',door:'#4a3626',
  copper:'#5f9482',copperDark:'#467767',copperLight:'#79ac99',gold:'#d4ae43',goldDark:'#a5822a',clock:'#f6f1e2',tick:'#1f2c32'
});
export const DOMKYRKAN_TOWER=Object.freeze({side:13,shaft:30,spireBase:30.6,drum:34.4,tip:57.2,top:60.6});

// Tornets fyra sidor som fasader (samma form som exposedFaces) runt mitten (x, z) med sidan s.
export function towerFaces(x,z,s){
  const h=s/2,c=[[x+h,z+h],[x-h,z+h],[x-h,z-h],[x+h,z-h]]; // sidorna mot söder, väster, norr och öster; normalen (tz, -tx) pekar utåt
  return c.map((a,i)=>{const q=c[(i+1)%4],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz),tx=dx/length,tz=dz/length;return {a,q,length,tx,tz,nx:tz,nz:-tx,ccw:true};});
}
function painter(m,f){
  const P=(u,y,o)=>[f.a[0]+f.tx*u+f.nx*o,y,f.a[1]+f.tz*u+f.nz*o];
  const tri=(A,B,C,col)=>m.tri(A,C,B,col);
  const panel=(u,y,w,h,col,o)=>{const A=P(u,y,o),B=P(u+w,y,o),D=P(u,y+h,o),E=P(u+w,y+h,o);m.quad(B,A,D,E,col);};
  const arch=(u,y,r,col,o,n=10)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI,b=(i+1)/n*Math.PI;tri(P(u,y,o),P(u+Math.cos(a)*r,y+Math.sin(a)*r,o),P(u+Math.cos(b)*r,y+Math.sin(b)*r,o),col);}};
  const disc=(u,y,r,col,o,n=20)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;tri(P(u,y,o),P(u+Math.cos(a)*r,y+Math.sin(a)*r,o),P(u+Math.cos(b)*r,y+Math.sin(b)*r,o),col);}};
  const poly=(pts,col,o)=>{for(let i=1;i<pts.length-1;i++)tri(P(pts[0][0],pts[0][1],o),P(pts[i][0],pts[i][1],o),P(pts[i+1][0],pts[i+1][1],o),col);};
  return {P,panel,arch,disc,poly};
}
function clockFace(m,f,u,y,o,r){
  const C=DOMKYRKAN_COLOURS,{disc,poly}=painter(m,f);
  disc(u,y,r+.18,C.gold,o);disc(u,y,r,C.clock,o+.03);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,c=Math.cos(a),s=Math.sin(a),w=i%3?.04:.08,l=i%3?.18:.3,p=(d,t)=>[u+c*d-s*t,y+s*d+c*t];poly([p(r-.07-l,-w),p(r-.07,-w),p(r-.07,w),p(r-.07-l,w)],C.tick,o+.05);}
  for(const [deg,len,w] of [[150,.55,.08],[30,.82,.055]]){const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),p=(d,t)=>[u+c*d-s*t,y+s*d+c*t];poly([p(-.12,-w),p(r*len,-w*.4),p(r*len,w*.4),p(-.12,w)],C.tick,o+.07);}
}
// Ett lodrätt n-kantigt prisma/kon från radien r0 vid y0 till r1 vid y1. Kanterna får omväxlande nyanser så att formen läses.
function ring(m,x,z,n,y0,r0,y1,r1,cols,rot=Math.PI/n){
  for(let i=0;i<n;i++){
    const a=rot+i/n*Math.PI*2,b=rot+(i+1)/n*Math.PI*2,col=cols[i%cols.length];
    const A=[x+Math.cos(a)*r0,y0,z+Math.sin(a)*r0],B=[x+Math.cos(b)*r0,y0,z+Math.sin(b)*r0],Cc=[x+Math.cos(b)*r1,y1,z+Math.sin(b)*r1],D=[x+Math.cos(a)*r1,y1,z+Math.sin(a)*r1];
    if(r1<1e-3)m.tri(A,D,B,col);else m.quad(A,D,Cc,B,col);
  }
}

// Västtornet med spira. x, z = tornets mitt. westDoor: portalen åt väster (mot torget).
export function addDomkyrkanTower(m,x,z,{westDoor=true}={}){
  const C=DOMKYRKAN_COLOURS,T=DOMKYRKAN_TOWER,S=T.side,h=S/2;
  // skaftet: vitputsat, sockel, hörnlisener och gesimser
  m.box(x,T.shaft/2,z,S,T.shaft,S,C.wall,C.wallShade);
  m.box(x,.5,z,S+.5,1,S+.5,C.plinth,'#8f9284');
  for(const [dx,dz] of [[-1,-1],[1,-1],[1,1],[-1,1]])m.box(x+dx*(h-.3),T.shaft/2,z+dz*(h-.3),.9,T.shaft,.9,C.pilaster,C.cornice);
  for(const [y,t,e] of [[12.8,.5,.5],[21.2,.4,.4],[T.shaft-.3,.7,1.1]])m.box(x,y,z,S+e,t,S+e,C.cornice,'#cfc8b6');
  for(const f of towerFaces(x,z,S)){
    const {panel,arch,disc}=painter(m,f),mid=S/2;
    // ljudöppningar i klockvåningen (två per sida) och ett runt fönster under
    for(const du of [-2.2,2.2]){panel(mid+du-1,23.2,2,3.6,C.cornice,.06);arch(mid+du,26.8,1,C.cornice,.06);panel(mid+du-.8,23.4,1.6,3.4,C.louvre,.1);arch(mid+du,26.8,.8,C.louvre,.1);
      for(let y=23.8;y<26.8;y+=.5)panel(mid+du-.8,y,1.6,.08,'#56676b',.12);}
    disc(mid,17.2,1.25,C.cornice,.06);disc(mid,17.2,1,C.glass,.09);
    panel(mid-1,14.2,2,.14,C.cornice,.08);
  }
  if(westDoor){const f=towerFaces(x,z,S).find(f=>f.nx<-.5),{panel,arch}=painter(m,f);
    panel(h-2.1,0,4.2,6.4,C.cornice,.08);arch(h,6.4,2.1,C.cornice,.08);panel(h-1.6,0,3.2,6.0,C.door,.14);arch(h,6.0,1.6,C.door,.14);
    panel(h-.04,.2,.08,5.8,'#2e231a',.17);panel(h-2.5,8.9,5,.4,C.cornice,.18);}
  // spirans fot: koppartak från skaftets krön in till trumman, med en urgavel åt varje väderstreck
  const yb=T.spireBase,rb=h+.25;
  ring(m,x,z,4,yb,rb*Math.SQRT2,T.drum,3.6,[C.copper,C.copperDark,C.copper,C.copperDark],Math.PI/4);
  for(const f of towerFaces(x,z,4.2)){
    const {P,panel,poly}=painter(m,f),mid=2.1;
    panel(mid-1.75,yb,3.5,3.9,C.wall,4.5);
    // gavelns tak
    const a=P(mid-2.05,yb+3.9,4.55),b=P(mid+2.05,yb+3.9,4.55),t=P(mid,yb+5.5,4.55),a0=P(mid-2.05,yb+3.9,-.2),b0=P(mid+2.05,yb+3.9,-.2),t0=P(mid,yb+5.5,-.2);
    m.quad(a,a0,t0,t,C.copperDark);m.quad(t,t0,b0,b,C.copper);poly([[mid-1.95,yb+3.9],[mid+1.95,yb+3.9],[mid,yb+5.35]],C.cornice,4.56);
    // gavelns sidor in mot spiran
    for(const s of [-1,1]){const u=mid+s*1.75,A=P(u,yb,4.5),B=P(u,yb,-.2),Cc=P(u,yb+3.9,-.2),D=P(u,yb+3.9,4.5);if(s<0)m.quad(B,A,D,Cc,C.wallShade);else m.quad(A,B,Cc,D,C.wallShade);}
    clockFace(m,f,mid,yb+2.05,4.56,1.25);
  }
  // trumman och den höga åttakantiga spiran
  ring(m,x,z,8,T.drum,3.6,T.drum+2.2,3.25,[C.copperLight,C.copper]);
  ring(m,x,z,8,T.drum+2.2,3.25,T.drum+2.6,3.6,[C.copperDark]);
  ring(m,x,z,8,T.drum+2.6,3.35,T.tip,.22,[C.copper,C.copperDark,C.copperLight,C.copperDark]);
  // den urnliknande kulan och korset
  ring(m,x,z,8,T.tip,.22,T.tip+.6,.62,[C.gold,C.goldDark]);ring(m,x,z,8,T.tip+.6,.62,T.tip+1.25,.08,[C.gold,C.goldDark]);
  m.box(x,T.tip+2.25,z,.2,2.2,.2,C.gold,C.goldDark);m.box(x,T.top-.85,z,.2,.2,1.3,C.gold,C.goldDark);
  return {top:T.top,clocks:4};
}
