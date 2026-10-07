// 2.11: Västra bron, stenvalvsbro över Klarälvens västra löp. Ett statiskt batch.
import {ComicMesh} from './city-architecture.js?v=2.17.0';
import {VASTRA_BRON} from './city-water.mjs?v=2.17.0';
export function riverMesh(){
  // Västra bron: stenvalvsbro. Brobanan ligger i marknivå (ingen trappa i kollisionen);
  // bröstvärn och valvkanter ger silhuetten.
  const bridge=new ComicMesh(true),{a,b,halfWidth:hw}=VASTRA_BRON,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),nx=-dz/l,nz=dx/l;
  bridge.strip([[a.x,a.z],[b.x,b.z]],hw*2,.06,'#b9ad92');
  bridge.strip([[a.x,a.z],[b.x,b.z]],hw*2-6,.075,'#8f9488');
  for(const side of [-1,1]){
    const ox=nx*side*(hw-.4),oz=nz*side*(hw-.4);
    for(const [y,w,c] of [[.55,.7,'#a39a83'],[1.05,.55,'#d8cdb0']]){
      const p=[[a.x+ox,a.z+oz],[b.x+ox,b.z+oz]];
      bridge.strip(p,w,y,c);
    }
    // Bröstvärnets vertikala sidor och valvbågar ned mot vattnet.
    const steps=24;for(let i=0;i<steps;i++){const t0=i/steps,t1=(i+1)/steps,x0=a.x+dx*t0+ox,z0=a.z+dz*t0+oz,x1=a.x+dx*t1+ox,z1=a.z+dz*t1+oz;
      bridge.quad([x0,0,z0],[x1,0,z1],[x1,1.3,z1],[x0,1.3,z0],'#a39a83');bridge.quad([x1,0,z1],[x0,0,z0],[x0,1.3,z0],[x1,1.3,z1],'#8a816c');
      const arch=Math.abs(Math.sin(t0*Math.PI*4))*1.4;bridge.quad([x0,-arch,z0],[x1,-arch,z1],[x1,0,z1],[x0,0,z0],'#6f6a5c');}
  }
  return {bridge};
}
export function createRiverArchitecture(pc,app){
  const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveVertexColor=true;material.update();
  const {bridge}=riverMesh();bridge.finish(pc,app,'Västra bron',material);
  return {staticDrawCalls:1};
}
