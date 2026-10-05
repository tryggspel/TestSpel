// Wermland Opera / Karlstads teater (1893): the pedimented entrance front, built from the user's reference photos.
// White rendered front on a rusticated base, three tall windows (arched pediment over the middle one), three round
// windows with green stucco swags, a dentil cornice, a tympanum with a green acanthus cartouche and a gold 1893
// plaque, and three dark green doors under a glass-and-iron canopy with an arched centre. Geometry only, drawn into a
// ComicMesh; the front looks EAST (+x) over the street, u runs from the south edge to the north edge.
export const OPERA_COLOURS=Object.freeze({
  wall:'#ece8db',rust:'#e3dfd0',joint:'#cdc8b8',trim:'#fbf9f1',green:'#86b898',greenDark:'#6c9c7c',window:'#262e2c',
  door:'#1c3a2c',pane:'#4f6a62',canopy:'#a9c3ba',iron:'#1f2a24',gold:'#e0b840',roof:'#3a4044',step:'#bdb9ae'
});

// Pure helper so the geometry can be tested without a renderer: where the pieces sit on the front.
export function operaFrontLayout(W=16){
  const centres=[W*.22,W*.5,W*.78];
  return {W,centres,eaves:13.5,ridge:19,windowY:5.1,windowH:3.4,oculusY:11.5,oculusR:1.15,doorH:3.1,canopyY:4.2};
}

export function addOperaFront(m,{x0,zc,W=16}){
  const C=OPERA_COLOURS,L=operaFrontLayout(W);
  const P=(u,y,o=0)=>[x0+o,y,zc+W/2-u];
  const panel=(u,y,w,h,col,o=.02)=>{if(w<=.02||h<=.02)return;m.quad(P(u,y,o),P(u+w,y,o),P(u+w,y+h,o),P(u,y+h,o),col);};
  const disk=(u,y,r,col,o,n=18)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;m.tri(P(u,y,o),P(u+Math.cos(a)*r,y+Math.sin(a)*r,o),P(u+Math.cos(b)*r,y+Math.sin(b)*r,o),col);}};
  const halfDisk=(u,y,r,col,o,n=12)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI,b=(i+1)/n*Math.PI;m.tri(P(u,y,o),P(u+Math.cos(a)*r,y+Math.sin(a)*r,o),P(u+Math.cos(b)*r,y+Math.sin(b)*r,o),col);}};
  // A sagging band (swag) between two points: used for the green stucco garlands.
  const swag=(u1,u2,y,sag,thick,col,o,n=8)=>{for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,f=t=>y-Math.sin(t*Math.PI)*sag;panel2(u1+(u2-u1)*t0,f(t0),u1+(u2-u1)*t1,f(t1),thick,col,o);}};
  const panel2=(ua,ya,ub,yb,thick,col,o)=>m.quad(P(ua,ya,o),P(ub,yb,o),P(ub,yb+thick,o),P(ua,ya+thick,o),col);
  // Base: rusticated storey with horizontal joints, string course above.
  panel(0,0,W,3.7,C.rust,.02);
  for(let y=.6;y<3.6;y+=.6)panel(0,y,W,.07,C.joint,.04);
  panel(-.3,3.7,W+.6,.3,C.trim,.05);
  // Upper wall.
  panel(0,4,W,L.eaves-4,C.wall,.02);
  panel(-.3,L.eaves-.2,W+.6,.5,C.trim,.08);
  panel(-.25,4,.5,L.eaves-4,C.trim,.06);panel(W-.25,4,.5,L.eaves-4,C.trim,.06); // corner pilasters
  // Three tall windows with cream surrounds; hoods differ: flat on the sides, arched over the middle.
  for(const [i,u] of L.centres.entries()){
    const w=1.75,y=L.windowY,h=L.windowH;
    panel(u-w/2-.28,y-.12,w+.56,h+.24,C.trim,.06);
    panel(u-w/2,y,w,h,C.window,.09);
    panel(u-.04,y,.08,h,C.trim,.11);for(const k of [1,2])panel(u-w/2,y+h*k/3,w,.07,C.trim,.11);
    if(i===1){halfDisk(u,y+h+.12,w/2+.5,C.trim,.07);halfDisk(u,y+h+.12,w/2+.2,C.wall,.09);}
    else{panel(u-w/2-.55,y+h+.2,w+1.1,.28,C.trim,.1);panel(u-w/2-.45,y+h+.48,w+.9,.12,C.joint,.11);}
  }
  panel(-.3,9.4,W+.6,.3,C.trim,.06);
  // Three round windows with a green swag under each.
  for(const u of L.centres){
    disk(u,L.oculusY,L.oculusR+.45,C.trim,.06);disk(u,L.oculusY,L.oculusR,C.window,.09);
    panel(u-.04,L.oculusY-L.oculusR,.08,L.oculusR*2,C.trim,.11);panel(u-L.oculusR,L.oculusY-.04,L.oculusR*2,.08,C.trim,.11);
    swag(u-1.8,u+1.8,L.oculusY-1.35,.9,.42,C.green,.07);
    panel(u-1.95,L.oculusY-2.3,.4,1.1,C.green,.07);panel(u+1.55,L.oculusY-2.3,.4,1.1,C.green,.07); // hanging ends
  }
  // Pediment: white tympanum, dentil cornice, green cartouche, gold 1893.
  m.tri(P(-.3,L.eaves,.03),P(W+.3,L.eaves,.03),P(W/2,L.ridge,.03),C.wall);
  m.tri(P(.4,L.eaves+.3,.06),P(W-.4,L.eaves+.3,.06),P(W/2,L.ridge-.55,.06),C.trim);
  m.tri(P(1.2,L.eaves+.5,.08),P(W-1.2,L.eaves+.5,.08),P(W/2,L.ridge-1.4,.08),C.wall);
  for(let u=-.2;u<W+.2;u+=.65)panel(u,L.eaves-.55,.36,.35,C.trim,.14); // dentils
  disk(W/2,L.eaves+1.35,.95,C.green,.12);disk(W/2,L.eaves+1.35,.6,C.greenDark,.14);
  panel(W/2-.62,L.eaves+1.15,1.24,.4,C.gold,.16);
  swag(W/2-.9,W/2-4.2,L.eaves+.95,-.5,.34,C.green,.12,6);swag(W/2+.9,W/2+4.2,L.eaves+.95,-.5,.34,C.green,.12,6);
  // Entrance: pilasters, three dark green doors and the glass canopy.
  for(const u of [W*.36,W*.64])panel(u-.35,.4,.7,3.3,C.trim,.1);
  for(const u of L.centres){
    panel(u-1.15,0,2.3,L.doorH+.5,C.trim,.08);
    panel(u-.95,0,1.9,L.doorH,C.door,.12);
    panel(u-.78,.9,1.56,1.9,C.pane,.15);panel(u-.04,.9,.08,1.9,C.door,.17);
    m.box(x0+1.7+.5,.12,zc+W/2-u,2.6,.24,3.6,C.step); // doorstep
  }
  const cz=zc,depth=3.4,cy=L.canopyY;
  m.box(x0+depth/2,cy,cz,depth,.08,W+1.2,C.canopy,C.canopy);                       // flat glass roof
  m.box(x0+depth,cy-.1,cz,.14,.22,W+1.2,C.iron,C.iron);                             // front beam
  for(const u of [.3,W*.36,W*.64,W-.3])m.box(x0+depth-.1,cy/2,zc+W/2-u,.2,cy,.2,C.iron,C.iron); // posts
  for(let u=.6;u<W;u+=1.6)m.box(x0+depth/2,cy+.07,zc+W/2-u,depth,.05,.08,C.iron,C.iron); // glazing bars
  // Arched centre: two arcs joined by glass panes.
  const R=2.6,uc=W/2;
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI,b=(i+1)/10*Math.PI;
    const A=(ang,off)=>[x0+off,cy+.1+Math.sin(ang)*R*1.05,zc+W/2-(uc+Math.cos(ang)*R)];
    m.quad(A(a,.5),A(b,.5),A(b,depth),A(a,depth),i%2?C.canopy:C.pane);
    m.quad(A(a,depth),A(b,depth),[A(b,depth)[0]+.0,A(b,depth)[1]+.14,A(b,depth)[2]],[A(a,depth)[0],A(a,depth)[1]+.14,A(a,depth)[2]],C.iron);
  }
  // Steps down to the street.
  for(let k=0;k<3;k++){const h=.46-k*.15;m.box(x0+depth+.5+k*.55,h/2,zc,.55,h,W*.9,C.step,C.step);}
  return L;
}
