export const ORIGIN=Object.freeze({lat:59.380767,lon:13.50295});

export function kmBetween(a,b){
  const lat0=((a.lat+b.lat)/2)*Math.PI/180;
  return Math.hypot((a.lon-b.lon)*111.32*Math.cos(lat0),(a.lat-b.lat)*110.54);
}
export function gameXY(lat,lon,origin=ORIGIN){
  const lat0=origin.lat*Math.PI/180;
  return Object.freeze({
    x:(lon-origin.lon)*111320*Math.cos(lat0),
    z:-(lat-origin.lat)*110540
  });
}
export function number(v,fallback=null){
  const n=Number(v);return Number.isFinite(n)?n:fallback;
}
export function safeText(v,max=180){
  if(v===null||v===undefined)return null;
  return String(v).replace(/\s+/g,' ').trim().slice(0,max)||null;
}
export function parseWgs84(value){
  if(!value)return null;
  if(typeof value==='object'){
    const lat=number(value.lat??value.latitude??value.y),lon=number(value.lon??value.lng??value.longitude??value.x);
    if(Number.isFinite(lat)&&Number.isFinite(lon))return {lat,lon};
    for(const v of Object.values(value)){const p=parseWgs84(v);if(p)return p;}
    return null;
  }
  const m=String(value).match(/(?:POINT\s*\()?\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)/i);
  if(!m)return null;
  const a=Number(m[1]),b=Number(m[2]);
  return Math.abs(a)<=180&&Math.abs(b)<=90?{lon:a,lat:b}:null;
}
export function xmlEscape(s=''){
  return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
}
