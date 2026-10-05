// Bridges (2.11.30): walkable corridors over water. A road or path tagged bridge=yes in OpenStreetMap (Hagabron,
// Götgatsbron, Gubbholmsbron, Sandgrundsbron, ...) must stay passable although the river or lake polygon below it is
// blocked. Rail bridges are not walkable and are left out. Filled by app.js; pure data, testable without a browser.
export const BRIDGES=[];
const HALF={motorway:5,trunk:4.5,primary:4.5,secondary:4,tertiary:3.5,residential:3,unclassified:3,living_street:3,service:2.4,
  track:2,footway:1.6,path:1.6,cycleway:1.8,pedestrian:2.5,steps:1.6,platform:2};
export function registerBridges(roads){
  for(const r of roads){
    const tags=r.tags||{};
    if(!tags.bridge||tags.bridge==='no'||tags.railway||!tags.highway)continue;
    if(!Array.isArray(r.points)||r.points.length<2)continue;
    const half=(HALF[tags.highway]??2.4)+.9; // a little margin so the rail or kerb does not feel like a wall
    BRIDGES.push({points:r.points,half,name:tags.name||''});
  }
  return BRIDGES.length;
}
export function onBridge(x,z){
  for(const b of BRIDGES){
    const p=b.points;
    for(let i=1;i<p.length;i++){
      const [ax,az]=p[i-1],[bx,bz]=p[i],dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz;
      const t=len2?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/len2)):0;
      const qx=ax+dx*t-x,qz=az+dz*t-z;
      if(qx*qx+qz*qz<=b.half*b.half)return true;
    }
  }
  return false;
}
