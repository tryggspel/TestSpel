import {ComicMesh} from './city-architecture.js?v=2.11.4';
import {cityPoint} from './city-geography.mjs?v=2.11.4';

const isGreen=t=>t?.leisure==='park'||t?.leisure==='garden'||t?.landuse==='grass'||t?.landuse==='recreation_ground'||t?.natural==='wood'||t?.landuse==='forest'||t?.natural==='scrub';
function area2(points){let n=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];n+=a[0]*b[1]-b[0]*a[1];}return n;}
export function mappedGreenAreas(osm,max=31){
  const out=[];
  for(const e of osm?.elements||[]){
    const tags=e.tags||{};if(!isGreen(tags)||!Array.isArray(e.geometry)||e.geometry.length<3)continue;
    const polygon=e.geometry.map(p=>{const q=cityPoint(+p.lon,+p.lat);return [q.x,q.z];});
    const area=Math.abs(area2(polygon))/2;if(area<40)continue;
    const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
    out.push(Object.freeze({osm:e.id,name:tags.name||'',kind:tags.leisure||tags.landuse||tags.natural||'green',polygon,area,dist:Math.hypot(cx,cz)}));
  }
  return Object.freeze(out.sort((a,b)=>a.dist-b.dist||b.area-a.area).slice(0,max));
}
export function createCityEnvironment(pc,app,osm){
  const areas=mappedGreenAreas(osm);if(!areas.length)return Object.freeze({greenAreas:0,staticDrawCalls:0,ids:Object.freeze([])});
  const material=new pc.StandardMaterial();material.useLighting=false;material.diffuse.set(0,0,0);material.emissive.set(1,1,1);material.emissiveVertexColor=true;material.update();
  const mesh=new ComicMesh();
  for(const a of areas)mesh.polygon(a.polygon,.011,a.kind==='grass'?'#6f9f70':'#5f9169');
  mesh.finish(pc,app,'Karlstad · OSM parker och grönytor',material);
  return Object.freeze({greenAreas:areas.length,staticDrawCalls:1,ids:Object.freeze(areas.map(a=>a.osm))});
}
