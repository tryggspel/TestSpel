// Västra bron över Klarälvens västra löp, mellan Residenstorget och Klara (Teaterparken,
// Wermland Opera). Själva älven finns redan i spelet (OSM-vattenytor i city-south-data.mjs);
// det som saknades före 2.11 var bron, så Klarasidan gick inte att nå.
// Geometri: OSM 101485444/101485449 (Västra bron) + gångbanorna 101485446/101485447.
export const VASTRA_BRON=Object.freeze({a:{x:-201,z:-46},b:{x:-256,z:-116},halfWidth:9,name:'Västra bron'});
export function onVastraBron(x,z){
  const {a,b,halfWidth}=VASTRA_BRON,dx=b.x-a.x,dz=b.z-a.z,t=((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz);
  if(t<-.04||t>1.04)return false;
  const cx=a.x+dx*t,cz=a.z+dz*t;return Math.hypot(x-cx,z-cz)<=halfWidth;
}
