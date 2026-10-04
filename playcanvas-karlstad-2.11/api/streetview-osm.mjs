import fs from 'node:fs';

const BUILDINGS=JSON.parse(fs.readFileSync(new URL('../data/osm-buildings.json',import.meta.url),'utf8')).elements||[];
const ROADS=JSON.parse(fs.readFileSync(new URL('../data/osm-roads.json',import.meta.url),'utf8')).elements||[];
const RAD=Math.PI/180;

function json(res,status,data){res.status(status).setHeader('Cache-Control','private, no-store, max-age=0').json(data);}
function centroid(geometry=[]){
  if(!geometry.length)return null;
  let lat=0,lon=0;for(const p of geometry){lat+=Number(p.lat);lon+=Number(p.lon);}
  return {lat:lat/geometry.length,lon:lon/geometry.length};
}
function localXY(lat,lon,lat0,lon0){
  return {x:(lon-lon0)*111320*Math.cos(lat0*RAD),z:(lat-lat0)*110540};
}
function fromLocal(x,z,lat0,lon0){
  return {lat:lat0+z/110540,lon:lon0+x/(111320*Math.cos(lat0*RAD))};
}
function nearestRoadPoint(target){
  let best=null;
  for(const road of ROADS){
    const name=road.tags?.name,highway=road.tags?.highway;
    if(!name||!road.geometry?.length||road.geometry.length<2)continue;
    if(['motorway','trunk','raceway','steps'].includes(String(highway)))continue;
    const pts=road.geometry.map(p=>localXY(Number(p.lat),Number(p.lon),target.lat,target.lon));
    for(let i=1;i<pts.length;i++){
      const a=pts[i-1],b=pts[i],dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz||1;
      const t=Math.max(0,Math.min(1,-(a.x*dx+a.z*dz)/den));
      const x=a.x+t*dx,z=a.z+t*dz,d2=x*x+z*z;
      const penalty=['footway','path','cycleway'].includes(String(highway))?45:0;
      const score=d2+penalty;
      if(!best||score<best.score)best={score,d2,name,highway,x,z};
    }
  }
  if(!best)return null;
  return {...fromLocal(best.x,best.z,target.lat,target.lon),distance:Math.sqrt(best.d2),name:best.name,highway:best.highway};
}
function bearing(lat1,lon1,lat2,lon2){
  const a=lat1*RAD,b=lat2*RAD,dLon=(lon2-lon1)*RAD;
  const y=Math.sin(dLon)*Math.cos(b),x=Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(dLon);
  return (Math.atan2(y,x)/RAD+360)%360;
}

export default async function handler(req,res){
  // Development/reference tool only. Never expose Google reference imagery from the live game.
  if(process.env.VERCEL_ENV==='production')return json(res,404,{error:'Not available in production'});
  if(req.method!=='GET')return json(res,405,{error:'GET only'});
  const key=process.env.GOOGLE_STREETVIEW_API_KEY;
  if(!key)return json(res,503,{error:'Street View key is not configured'});
  const osm=Number(req.query.osm);
  if(!Number.isFinite(osm))return json(res,400,{error:'numeric osm id required'});
  const b=BUILDINGS.find(x=>Number(x.id)===osm);
  if(!b||!b.geometry?.length)return json(res,404,{error:'OSM building not found'});
  const target=centroid(b.geometry),camera=nearestRoadPoint(target);
  if(!camera)return json(res,404,{error:'No named road near building'});
  if(camera.distance>80)return json(res,422,{error:'Nearest named road is too far away',distance:camera.distance});

  const metaUrl=new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
  metaUrl.searchParams.set('location',camera.lat+','+camera.lon);
  metaUrl.searchParams.set('radius',String(Math.max(12,Math.min(35,Math.round(camera.distance+12)))));
  metaUrl.searchParams.set('source','outdoor');metaUrl.searchParams.set('key',key);
  const meta=await (await fetch(metaUrl,{cache:'no-store'})).json();
  if(meta.status!=='OK'||!meta.pano_id||!meta.location)return json(res,502,{error:'Street View metadata',status:meta.status,osm});

  const panoLat=Number(meta.location.lat),panoLon=Number(meta.location.lng),heading=bearing(panoLat,panoLon,target.lat,target.lon);
  const imageUrl=new URL('https://maps.googleapis.com/maps/api/streetview');
  imageUrl.searchParams.set('size','640x640');imageUrl.searchParams.set('pano',meta.pano_id);
  imageUrl.searchParams.set('heading',String(heading));imageUrl.searchParams.set('pitch','0');imageUrl.searchParams.set('fov','72');
  imageUrl.searchParams.set('return_error_code','true');imageUrl.searchParams.set('key',key);
  const imgResp=await fetch(imageUrl,{cache:'no-store'});
  if(!imgResp.ok)return json(res,502,{error:'Street View image',status:imgResp.status,osm});
  const base64=Buffer.from(await imgResp.arrayBuffer()).toString('base64');
  const address=[b.tags?.['addr:street'],b.tags?.['addr:housenumber']].filter(Boolean).join(' ');
  return json(res,200,{osm,address,name:b.tags?.name||null,road:camera.name,roadDistance:camera.distance,panoId:meta.pano_id,date:meta.date||null,heading,target,camera:{lat:camera.lat,lon:camera.lon},imageBase64:base64});
}
