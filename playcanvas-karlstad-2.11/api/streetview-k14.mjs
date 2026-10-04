const TARGET=Object.freeze({label:'Kungsgatan 14',lat:59.38134151,lon:13.50336136});
const CAMERA=Object.freeze({lat:59.3810358,lon:13.5030645});

function bearing(lat1,lon1,lat2,lon2){
  const r=Math.PI/180,a=lat1*r,b=lat2*r,dLon=(lon2-lon1)*r;
  const y=Math.sin(dLon)*Math.cos(b),x=Math.cos(a)*Math.sin(b)-Math.sin(a)*Math.cos(b)*Math.cos(dLon);
  return (Math.atan2(y,x)/r+360)%360;
}
export default async function handler(req,res){
  const key=process.env.GOOGLE_STREETVIEW_API_KEY;
  if(!key)return res.status(503).json({error:'missing key'});
  const metaUrl=new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
  metaUrl.searchParams.set('location',CAMERA.lat+','+CAMERA.lon);
  metaUrl.searchParams.set('radius','24');metaUrl.searchParams.set('source','outdoor');metaUrl.searchParams.set('key',key);
  const meta=await (await fetch(metaUrl,{cache:'no-store'})).json();
  if(meta.status!=='OK'||!meta.pano_id||!meta.location)return res.status(502).json({error:'metadata',status:meta.status});
  const heading=bearing(Number(meta.location.lat),Number(meta.location.lng),TARGET.lat,TARGET.lon);
  const imageUrl=new URL('https://maps.googleapis.com/maps/api/streetview');
  imageUrl.searchParams.set('size','640x640');imageUrl.searchParams.set('pano',meta.pano_id);
  imageUrl.searchParams.set('heading',String(heading));imageUrl.searchParams.set('pitch','0');imageUrl.searchParams.set('fov','72');
  imageUrl.searchParams.set('return_error_code','true');imageUrl.searchParams.set('key',key);
  const imgResp=await fetch(imageUrl,{cache:'no-store'});
  if(!imgResp.ok)return res.status(502).json({error:'image',status:imgResp.status});
  const base64=Buffer.from(await imgResp.arrayBuffer()).toString('base64');
  res.setHeader('Cache-Control','private, no-store');
  res.status(200).json({label:TARGET.label,panoId:meta.pano_id,date:meta.date||null,heading,imageBase64:base64});
}
