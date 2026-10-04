const KARLSTAD_BOUNDS=Object.freeze({minLat:59.33,maxLat:59.43,minLon:13.38,maxLon:13.64});

function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
function inKarlstad(lat,lon){return lat>=KARLSTAD_BOUNDS.minLat&&lat<=KARLSTAD_BOUNDS.maxLat&&lon>=KARLSTAD_BOUNDS.minLon&&lon<=KARLSTAD_BOUNDS.maxLon;}
function bearing(lat1,lon1,lat2,lon2){
  const r=Math.PI/180,a=lat1*r,b=lat2*r,dLon=(lon2-lon1)*r;
  const y=Math.sin(dLon)*Math.cos(b),x=Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(dLon);
  return (Math.atan2(y,x)/r+360)%360;
}
function clamp(v,min,max,def){const x=n(v);return x===null?def:Math.max(min,Math.min(max,x));}
function json(res,status,data){res.status(status).setHeader('Cache-Control','no-store').json(data);}

export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'GET only'});
  const key=process.env.GOOGLE_STREETVIEW_API_KEY;
  if(!key)return json(res,503,{error:'Street View key is not configured'});

  const lat=n(req.query.lat),lon=n(req.query.lon);
  if(lat===null||lon===null||!inKarlstad(lat,lon))return json(res,400,{error:'lat/lon must be inside Karlstad reference bounds'});

  const radius=Math.round(clamp(req.query.radius,10,120,50));
  const metaUrl=new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
  metaUrl.searchParams.set('location',lat+','+lon);
  metaUrl.searchParams.set('radius',String(radius));
  metaUrl.searchParams.set('source','outdoor');
  metaUrl.searchParams.set('key',key);

  const metaResp=await fetch(metaUrl,{cache:'no-store'});
  const meta=await metaResp.json();
  if(!metaResp.ok||meta.status!=='OK'||!meta.location||!meta.pano_id){
    return json(res,404,{error:'No Street View panorama found',googleStatus:meta.status||metaResp.status});
  }

  const panoLat=Number(meta.location.lat),panoLon=Number(meta.location.lng);
  const autoHeading=bearing(panoLat,panoLon,lat,lon);
  const heading=clamp(req.query.heading,0,359.999,autoHeading);
  const pitch=clamp(req.query.pitch,-35,35,0);
  const fov=clamp(req.query.fov,35,100,72);
  const mode=String(req.query.mode||'image');

  const payload={
    panoId:meta.pano_id,
    captureDate:meta.date||null,
    panorama:{lat:panoLat,lon:panoLon},
    target:{lat,lon},
    heading,
    autoHeading,
    pitch,
    fov,
    copyright:meta.copyright||null
  };
  if(mode==='metadata')return json(res,200,payload);

  const imageUrl=new URL('https://maps.googleapis.com/maps/api/streetview');
  imageUrl.searchParams.set('size','640x640');
  imageUrl.searchParams.set('pano',meta.pano_id);
  imageUrl.searchParams.set('heading',String(heading));
  imageUrl.searchParams.set('pitch',String(pitch));
  imageUrl.searchParams.set('fov',String(fov));
  imageUrl.searchParams.set('return_error_code','true');
  imageUrl.searchParams.set('key',key);

  const imageResp=await fetch(imageUrl,{cache:'no-store'});
  if(!imageResp.ok)return json(res,imageResp.status,{error:'Street View image request failed',status:imageResp.status});
  const body=Buffer.from(await imageResp.arrayBuffer());
  res.status(200);
  res.setHeader('Content-Type',imageResp.headers.get('content-type')||'image/jpeg');
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-StreetView-Pano',meta.pano_id);
  if(meta.date)res.setHeader('X-StreetView-Date',meta.date);
  res.setHeader('X-StreetView-Heading',heading.toFixed(2));
  res.send(body);
}
