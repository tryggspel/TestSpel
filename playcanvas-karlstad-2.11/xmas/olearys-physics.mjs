// O'Learys-aktiviteterna (2.21.1-xmas.14): enkel och stabil 2D-fysik för runda föremål (bowlingklot och käglor, shuffleboardpuckar, biljardbollar, pucken).
// Ren modul: ingen DOM. Fasta delsteg (1/240 s) så att resultatet är detsamma oavsett bildfrekvens.
// En värld: {bodies:[{x,y,vx,vy,r,m,alive,kind}], w, h, friction (andel fart kvar per sekund), walls:{left,right,top,bottom} ('bounce' | 'fall' | 'open'), restitution, pockets:[{x,y,r}]}
// Koordinater i meter, y uppåt (bort från spelaren).
export function makeWorld(o){return {bodies:[],friction:.6,restitution:.9,walls:{left:'bounce',right:'bounce',top:'bounce',bottom:'bounce'},pockets:[],t:0,events:[],...o};}
export function addBody(w,b){const body={vx:0,vy:0,m:1,alive:true,kind:'',spin:0,...b};w.bodies.push(body);return body;}
const SUB=1/240;
export function stepWorld(w,dt){
  let left=Math.min(dt,.1);
  while(left>1e-9){const h=Math.min(SUB,left);left-=h;substep(w,h);}
}
function substep(w,h){
  w.t+=h;const B=w.bodies;
  for(const b of B){
    if(!b.alive)continue;
    // spinn (bowling: kurva) böjer banan lite åt sidan så länge klotet rullar
    if(b.spin&&(b.vx||b.vy)){const sp=Math.hypot(b.vx,b.vy);if(sp>.2){b.vx+=b.spin*h*Math.min(1,sp/4);}}
    const f=Math.pow(b.friction??w.friction,h);b.vx*=f;b.vy*=f;
    const sp=Math.hypot(b.vx,b.vy);if(sp<(b.stop??.02)){b.vx=0;b.vy=0;}
    b.x+=b.vx*h;b.y+=b.vy*h;
    // fickor (biljard)
    for(const p of w.pockets)if(Math.hypot(b.x-p.x,b.y-p.y)<p.r){b.alive=false;b.vx=b.vy=0;w.events.push({type:'pocket',body:b});break;}
    if(!b.alive)continue;
    // väggar
    const edge=(side,over)=>{const m=w.walls[side];if(m==='bounce')return 'bounce';if(m==='fall'&&over){b.alive=false;b.vx=b.vy=0;w.events.push({type:'fall',body:b,side});}return m;};
    if(b.x-b.r<0){if(edge('left',b.x<0)==='bounce'){b.x=b.r;b.vx=Math.abs(b.vx)*w.restitution;}}
    if(b.alive&&b.x+b.r>w.w){if(edge('right',b.x>w.w)==='bounce'){b.x=w.w-b.r;b.vx=-Math.abs(b.vx)*w.restitution;}}
    if(b.alive&&b.y-b.r<0){if(edge('bottom',b.y<0)==='bounce'){b.y=b.r;b.vy=Math.abs(b.vy)*w.restitution;}}
    if(b.alive&&b.y+b.r>w.h){if(edge('top',b.y>w.h)==='bounce'){b.y=w.h-b.r;b.vy=-Math.abs(b.vy)*w.restitution;}}
  }
  // krockar mellan kroppar (elastiska, med massa)
  for(let i=0;i<B.length;i++){const a=B[i];if(!a.alive)continue;
    for(let j=i+1;j<B.length;j++){const b=B[j];if(!b.alive)continue;
      const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=a.r+b.r;if(d>=min||d<1e-9)continue;
      const nx=dx/d,ny=dy/d,over=min-d,ma=a.m,mb=b.m,ts=ma+mb;
      a.x-=nx*over*mb/ts;a.y-=ny*over*mb/ts;b.x+=nx*over*ma/ts;b.y+=ny*over*ma/ts;
      const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv>0)continue;
      const e=Math.min(a.e??w.restitution,b.e??w.restitution),jn=-(1+e)*rv/(1/ma+1/mb);
      a.vx-=jn*nx/ma;a.vy-=jn*ny/ma;b.vx+=jn*nx/mb;b.vy+=jn*ny/mb;
      if(-rv>.25)w.events.push({type:'hit',a,b,speed:-rv});
      a.hit=b.hit=true; // för bowlingen: en kägla som träffats räknas som påverkad
    }
  }
}
export const moving=(w,eps=.03)=>w.bodies.some(b=>b.alive&&Math.hypot(b.vx,b.vy)>eps);
export const drain=w=>{const e=w.events;w.events=[];return e;};
