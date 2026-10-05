// Residenset (Karlstad), built from the user's reference photo and kept clearly different from Elite Stadshotellet:
// warm ochre render, a grey rusticated ground floor with round-arched windows, cream pilasters and window surrounds,
// a strong cornice, and a dark slate mansard roof with round-windowed dormers and a flagpole with the Swedish flag.
// Stadshotellet stays bright yellow with white pilasters and tall arched bays. Geometry only (ComicMesh).
export const RESIDENSET_COLOURS=Object.freeze({
  wall:'#d09c4e',rust:'#cfc6ab',rustJoint:'#b4ab92',trim:'#efe4c8',sill:'#c9b78d',glass:'#394852',glassHi:'#566975',
  cornice:'#e6d6af',roof:'#4d5662',roofSide:'#3b434d',dormer:'#e9dcbd',flagBlue:'#1f5ca8',flagYellow:'#f2c230',door:'#4a3a2c'
});

// Paints one wall edge. `f` is an exposed edge {a,q,length,tx,tz,nx,nz,ccw}; H is the wall height.
export function addResidensetWall(m,f,H){
  const C=RESIDENSET_COLOURS;
  const P=(u,y,o)=>[f.a[0]+f.tx*u+f.nx*o,y,f.a[1]+f.tz*u+f.nz*o];
  const panel=(u,y,w,h,col,o)=>{if(w<=.03||h<=.03)return;const A=P(u,y,o),B=P(u+w,y,o),D=P(u,y+h,o),E=P(u+w,y+h,o);if(f.ccw)m.quad(B,A,D,E,col);else m.quad(A,B,E,D,col);};
  const arch=(u,y,r,col,o,n=10)=>{for(let i=0;i<n;i++){const a=i/n*Math.PI,b=(i+1)/n*Math.PI;const c=P(u,y,o),p=P(u+Math.cos(a)*r,y+Math.sin(a)*r,o),q=P(u+Math.cos(b)*r,y+Math.sin(b)*r,o);if(f.ccw)m.tri(c,q,p,col);else m.tri(c,p,q,col);}};
  const L=f.length,bays=Math.max(2,Math.round(L/3.1)),bw=L/bays;
  // Ground floor: grey rustication with joints, round-arched windows, one arched doorway on long walls.
  panel(0,0,L,3.5,C.rust,.04);
  for(let y=.55;y<3.4;y+=.55)panel(0,y,L,.06,C.rustJoint,.06);
  const doorBay=L>20?Math.floor(bays/2):-1;
  for(let i=0;i<bays;i++){
    const cx=(i+.5)*bw,w=1.25;
    panel(cx-w/2-.2,.6,w+.4,1.9,C.trim,.08);arch(cx,2.5,w/2+.2,C.trim,.08);
    if(i===doorBay){panel(cx-w/2,0,w,2.5,C.door,.1);arch(cx,2.5,w/2,C.door,.1);panel(cx-w/2+.2,.5,w-.4,1.6,C.glass,.12);}
    else{panel(cx-w/2,.8,w,1.7,C.glass,.1);arch(cx,2.5,w/2,C.glass,.1);panel(cx-.04,.8,.08,2.1,C.trim,.12);}
  }
  panel(-.1,3.5,L+.2,.28,C.cornice,.1); // belt course
  // Upper storeys: ochre wall, cream pilaster strips and surrounds, windows with sills; first floor has hoods.
  panel(0,3.78,L,H-3.78-.55,C.wall,.04);
  for(let i=0;i<=bays;i+=Math.max(1,Math.round(bays/ (L>20?6:2))))panel(Math.min(L-.5,Math.max(0,i*bw-.25)),3.78,.5,H-4.33,C.trim,.07);
  panel(0,3.78,.5,H-4.33,C.trim,.07);panel(L-.5,3.78,.5,H-4.33,C.trim,.07);
  for(let r=0;r<2;r++){
    const y=4.5+r*3.0,h=1.75;
    for(let i=0;i<bays;i++){
      const cx=(i+.5)*bw,w=1.05;
      panel(cx-w/2-.18,y-.12,w+.36,h+.3,C.trim,.08);
      panel(cx-w/2,y,w,h,C.glass,.11);panel(cx-.035,y,.07,h,C.trim,.13);panel(cx-w/2,y+h*.55,w,.06,C.trim,.13);
      panel(cx-w/2-.3,y-.24,w+.6,.14,C.sill,.1);
      if(r===0)panel(cx-w/2-.3,y+h+.22,w+.6,.18,C.trim,.1);
    }
  }
  // Cornice.
  panel(-.2,H-.55,L+.4,.55,C.cornice,.16);panel(-.15,H-.62,L+.3,.1,C.sill,.2);
}

// Mansard roof (steep lower slope, flat top) in four slabs, with dormers and a flagpole.
export function addResidensetRoof(m,{minx,maxx,minz,maxz,H}){
  const C=RESIDENSET_COLOURS,w=maxx-minx+.8,d=maxz-minz+.8,cx=(minx+maxx)/2,cz=(minz+maxz)/2,rise=3.4,inset=Math.min(2.2,Math.min(w,d)*.22);
  const x1=cx-w/2,x2=cx+w/2,z1=cz-d/2,z2=cz+d/2,u1=x1+inset,u2=x2-inset,v1=z1+inset,v2=z2-inset,y0=H,y1=H+rise;
  m.quad([x1,y0,z2],[x2,y0,z2],[u2,y1,v2],[u1,y1,v2],C.roof);   // south slope
  m.quad([x2,y0,z1],[x1,y0,z1],[u1,y1,v1],[u2,y1,v1],C.roofSide); // north slope
  m.quad([x1,y0,z1],[x1,y0,z2],[u1,y1,v2],[u1,y1,v1],C.roofSide); // west slope
  m.quad([x2,y0,z2],[x2,y0,z1],[u2,y1,v1],[u2,y1,v2],C.roof);     // east slope
  m.quad([u1,y1,v2],[u2,y1,v2],[u2,y1,v1],[u1,y1,v1],'#5b6572');   // flat top
  m.box(cx,H-.1,cz,w+.3,.3,d+.3,C.cornice,C.cornice);
  // Dormers with round windows on the two long slopes.
  const long=(maxz-minz)>(maxx-minx);
  const n=Math.max(2,Math.round((long?d:w)/7));
  for(let i=0;i<n;i++){
    const t=(i+.5)/n;
    for(const side of [-1,1]){
      const mid=y0+rise*.45;
      const px=long?(side<0?x1+inset*.45:x2-inset*.45):x1+t*w,pz=long?z1+t*d:(side<0?z1+inset*.45:z2-inset*.45);
      m.box(px,mid,pz,long?1.5:1.7,1.6,long?1.7:1.5,C.dormer,C.dormer);
      m.roof(px,mid+.8,pz,long?1.9:2.0,long?2.0:1.9,.8,long?'z':'x');
      m.box(px+(long?side*(inset*.0+.78):0),mid,pz+(long?0:side*.78),long?.05:.9,.9,long?.9:.05,C.glass,C.glass);
    }
  }
  // Flagpole with the Swedish flag on the flat top.
  const fx=cx,fz=cz,top=y1+6.5;
  m.box(fx,y1+3.2,fz,.1,6.6,.1,'#d9d4c4','#d9d4c4');
  m.box(fx+.9,top-.9,fz,1.7,1.1,.04,C.flagBlue,C.flagBlue);
  m.box(fx+.9,top-.9,fz+.01,1.7,.22,.05,C.flagYellow,C.flagYellow);m.box(fx+.55,top-.9,fz+.01,.22,1.1,.05,C.flagYellow,C.flagYellow);
}
