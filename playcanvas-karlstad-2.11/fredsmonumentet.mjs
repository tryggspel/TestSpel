// Fredsmonumentet på Stora Torget (2.21.1-xmas.14): Ivar Johnssons bronsskulptur från 1955 till minne av unionsupplösningen 1905.
// En kvinna håller upp ett brutet svärd över huvudet med båda händerna; ena foten vilar på huvudet av en soldat med hjälm.
// Brons på en granitsockel. Källor (hämtade 2026-11-25): statues.vanderkrogt.net (se054), Udda Utflykter, visitvarmland.com, SVT.
// Måtten är uppskattade. SVT rapporterade att statyn fördes till Göteborg för renovering; spelet visar den på sin plats på torget.
export const FREDS_COLOURS=Object.freeze({step:'#b9bcb2',granite:'#8f9590',graniteDark:'#777d78',cap:'#a5aaa4',bronze:'#55634f',bronzeDark:'#3e4a3d',bronzeHi:'#728067'});
// Ett fyrkantigt prisma från a till b (världskoordinater) med tjockleken t: armar, ben och svärd som inte står lodrätt.
export function beam(m,a,b,t,col,colSide=col){
  const d=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],l=Math.hypot(...d)||1,u=d.map(v=>v/l);
  let s=Math.abs(u[1])<.9?[0,1,0]:[1,0,0];
  const cross=(p,q)=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]],norm=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
  const e1=norm(cross(u,s)),e2=norm(cross(u,e1)),h=t/2;
  const corner=(p,i,j)=>[p[0]+e1[0]*h*i+e2[0]*h*j,p[1]+e1[1]*h*i+e2[1]*h*j,p[2]+e1[2]*h*i+e2[2]*h*j];
  const ring=[[1,1],[-1,1],[-1,-1],[1,-1]];
  for(let k=0;k<4;k++){const [i0,j0]=ring[k],[i1,j1]=ring[(k+1)%4];
    m.quad(corner(a,i0,j0),corner(b,i0,j0),corner(b,i1,j1),corner(a,i1,j1),k%2?col:colSide);
    m.quad(corner(a,i1,j1),corner(b,i1,j1),corner(b,i0,j0),corner(a,i0,j0),k%2?col:colSide);} // båda hållen: tunna delar ska synas runt om
  for(const p of [a,b]){m.quad(corner(p,1,1),corner(p,-1,1),corner(p,-1,-1),corner(p,1,-1),col);m.quad(corner(p,1,-1),corner(p,-1,-1),corner(p,-1,1),corner(p,1,1),col);}
}
// x, z = monumentets mitt; f = 1 om figuren vänder sig mot +z (söder), -1 mot norr.
export function addFredsmonumentet(m,x,z,f=1){
  const C=FREDS_COLOURS,B=C.bronze,D=C.bronzeDark,H=C.bronzeHi,Z=v=>z+v*f;
  // sockeln: trappsteg, avsmalnande granit och täckhäll
  m.box(x,.18,z,4.6,.36,4.6,C.step,'#a7aaa0');
  m.box(x,1.6,z,2.5,2.5,2.5,C.granite,C.graniteDark);m.box(x,2.95,z,2.8,.24,2.8,C.cap,C.graniteDark);m.box(x,.5,z,2.8,.3,2.8,C.cap,C.graniteDark);
  const y0=3.07;
  // soldatens huvud med hjälm under kvinnans fot
  m.box(x+.15,y0+.22,Z(.62),.62,.44,.56,D,B);m.pyramid(x+.15,y0+.42,Z(.62),.78,.72,.32,D);m.box(x+.15,y0+.44,Z(.62),.86,.06,.8,D,D);
  // kvinnan: ben (det ena framåt, uppe på huvudet), kjol, kropp, huvud
  beam(m,[x-.2,y0,Z(-.1)],[x-.18,y0+1.45,Z(-.05)],.3,D,B);
  beam(m,[x+.18,y0+.7,Z(.55)],[x+.16,y0+1.5,Z(.12)],.3,D,B);
  m.box(x,y0+1.7,z,.92,.62,.62,B,D);m.pyramid(x,y0+1.05,z,1.05,.8,.62,B);
  beam(m,[x,y0+1.9,z],[x,y0+2.95,z],.72,B,D);
  m.box(x,y0+3.05,Z(.12),.62,.32,.3,H,B); // bröstpartiet
  beam(m,[x,y0+2.95,z],[x,y0+3.18,z],.26,D,D); // hals
  m.box(x,y0+3.42,z,.4,.46,.42,H,B);m.box(x,y0+3.58,Z(-.18),.34,.3,.2,D,D); // huvud och hår
  // armarna uppåt och det brutna svärdet tvärs över huvudet
  const L=[x-.38,y0+2.85,z],R=[x+.38,y0+2.85,z],hl=[x-.62,y0+4.25,Z(.05)],hr=[x+.5,y0+4.3,Z(.05)];
  beam(m,L,hl,.2,B,D);beam(m,R,hr,.2,B,D);
  beam(m,[hl[0]-.12,hl[1]+.08,hl[2]],[hl[0]+.18,hl[1]+.08,hl[2]],.16,D,D);                  // fästet i vänster hand
  beam(m,[hl[0]-.02,hl[1]-.25,hl[2]],[hl[0]-.02,hl[1]+.42,hl[2]],.1,H,H);                    // parerstången
  beam(m,[hl[0]+.18,hl[1]+.09,hl[2]],[hr[0]+.38,hr[1]+.1,hr[2]],.09,H,B);                    // klingan
  m.tri([hr[0]+.38,hr[1]+.16,hr[2]],[hr[0]+.38,hr[1]+.04,hr[2]],[hr[0]+.52,hr[1]+.18,hr[2]],H); // brottet
  m.tri([hr[0]+.38,hr[1]+.04,hr[2]],[hr[0]+.38,hr[1]+.16,hr[2]],[hr[0]+.52,hr[1]+.18,hr[2]],H);
  return {top:hr[1]+.3};
}
