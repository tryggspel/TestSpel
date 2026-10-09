// Julklappsjakten: tomtarnas spår i snön. Ren modul (ingen DOM, ingen PlayCanvas).
//
// I fri julvandring tappar tomtarna paket här och där. Det finns ingen pil som pekar på dem: i stället går ett spår av fotavtryck i snön från en punkt nära spelaren
// till platsen där paketen ligger, och det gäller att hitta spåret och följa det. Den här modulen gör själva spåret: längs en väg (en lista punkter) läggs ett avtryck var
// step:e meter, vänster och höger fot om vartannat, med ett litet svaj och små variationer så att det ser ut som en tomte som gått där (inte som en prickad linje).
// Allt är deterministiskt (samma väg ger samma spår), så att tester och skärmbilder är jämförbara.
//
// Avtrycken i utdata: {x,z (mitt), hx,hz (enhetsvektor: åt vilket håll tån pekar), side (0 = vänster fot, 1 = höger fot)}.
import {TRAILS} from './xmas-config.mjs?v=2.21.1-xmas.4';

const hash01=n=>{const s=Math.sin(n*12.9898+78.233)*43758.5453;return s-Math.floor(s);};
export const pathLength=path=>{let L=0;if(Array.isArray(path))for(let i=1;i<path.length;i++)L+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);return L;};

// Fotspår längs vägen path, från from meter in på vägen till stopShort meter före slutet (är vägen så lång att max avtryck inte räcker börjar spåret senare: det slutar alltid före paketen). blocked(x,z) (valfri): ett avtryck på ogångbar mark flyttas till mittlinjen eller hoppas över.
// phase: svajets fas (olika för varje spår). Returnerar högst max avtryck.
export function trailPrints(path,opts={}){
  const {lead,step,side,wobble,wobbleLen,stopShort,maxPrints}={...TRAILS,...opts},from=opts.from??lead,max=opts.max??maxPrints,blocked=opts.blocked||null,phase=opts.phase||0;
  if(!Array.isArray(path)||path.length<2)return [];
  const cum=[0];for(let i=1;i<path.length;i++)cum.push(cum[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z));
  const L=cum[cum.length-1];if(!(L>2*step))return [];
  let s0=Math.min(from,L*.4);const s1=L-stopShort;
  if(!(s1>s0+step))return [];
  if((s1-s0)/step>max-1)s0=s1-(max-1)*step;   // en lång väg: spåret täcker de sista max avtrycken fram till paketen (det slutar alltid vid paketen)
  const out=[];let seg=1;
  for(let k=0,s=s0;s<=s1+1e-6&&out.length<max;k++,s+=step){
    while(seg<path.length-1&&cum[seg]<s)seg++;
    const a=path[seg-1],b=path[seg],sl=(cum[seg]-cum[seg-1])||1,t=Math.max(0,Math.min(1,(s-cum[seg-1])/sl));
    const hx=(b.x-a.x)/sl,hz=(b.z-a.z)/sl,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    // tån pekar inte exakt längs vägen: några grader åt ena eller andra hållet, olika för varje avtryck
    const j=(hash01(k*3+1)-.5)*.3,c=Math.cos(j),sn=Math.sin(j),dx=hx*c-hz*sn,dz=hx*sn+hz*c;
    const foot=k%2,sgn=foot?1:-1,lat=sgn*side+Math.sin(s/wobbleLen*6.2832+phase)*wobble+(hash01(k*3+2)-.5)*.1;
    // höger sida om färdriktningen (hx,hz) är (−hz,hx): norr (0,−1) har öster (1,0) till höger
    let px=x-hz*lat,pz=z+hx*lat;
    if(blocked&&blocked(px,pz)){px=x-hz*sgn*side;pz=z+hx*sgn*side;if(blocked(px,pz))continue;}
    out.push({x:+px.toFixed(2),z:+pz.toFixed(2),hx:+dx.toFixed(3),hz:+dz.toFixed(3),side:foot});
  }
  return out;
}

// Fyra hörn (x,z) för ett avtryck, tån först: [bakre vänster, bakre höger, främre höger, främre vänster] sett uppifrån med färdriktningen uppåt. hw/hl = halv bredd/längd.
export function printCorners(pr,hw=TRAILS.hw,hl=TRAILS.hl,out=new Float32Array(8)){
  const rx=-pr.hz*hw,rz=pr.hx*hw,fx=pr.hx*hl,fz=pr.hz*hl;
  out[0]=pr.x-fx-rx;out[1]=pr.z-fz-rz;
  out[2]=pr.x-fx+rx;out[3]=pr.z-fz+rz;
  out[4]=pr.x+fx+rx;out[5]=pr.z+fz+rz;
  out[6]=pr.x+fx-rx;out[7]=pr.z+fz-rz;
  return out;
}

// Avstånd (m) från (x,z) till närmaste fotavtryck i de tappade högar (rains: run.rains) som fortfarande har paket kvar; Infinity om det inte finns något spår.
export function nearestPrint(rains,x,z){
  let best=Infinity;
  if(!rains)return best;
  for(const rain of rains){
    if(rain.gone||!(rain.left>0)||!rain.trail)continue;
    for(const pr of rain.trail){const d=Math.abs(pr.x-x)+Math.abs(pr.z-z);if(d<best*1.5){const e=Math.hypot(pr.x-x,pr.z-z);if(e<best)best=e;}}
  }
  return best;
}
