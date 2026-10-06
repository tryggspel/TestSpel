// Avgångar från Karlstad Resecentrum för bussens skärm (BussQuiz). Data: Trafiklab ResRobot (öppna data, inkl. Värmlandstrafik).
// Kräver miljövariabeln TRAFIKLAB_KEY (gratis nyckel från trafiklab.se, API: "ResRobot - Reseplanerare / Stolptidtabeller").
// Utan nyckel svarar funktionen 503 och spelet använder sina inbyggda frågor. Svaret cachas i en minut.
const json=(res,status,data,cache='no-store')=>res.status(status).setHeader('Cache-Control',cache).json(data);
let stopCache=null,boardCache={at:0,data:null};
const BASE='https://api.resrobot.se/v2.1';
async function get(path,key){const r=await fetch(`${BASE}/${path}${path.includes('?')?'&':'?'}format=json&accessId=${encodeURIComponent(key)}`,{headers:{accept:'application/json'}});if(!r.ok)throw new Error('ResRobot '+r.status);return r.json();}
export function parseDepartures(data,max=10){
  const list=Array.isArray(data?.Departure)?data.Departure:[];
  return list.map(d=>{
    const line=String(d.ProductAtStop?.displayNumber||d.ProductAtStop?.num||(String(d.name||'').match(/(\d+)\s*$/)||[])[1]||'').trim();
    return {line,direction:String(d.direction||'').replace(/\s*\(.*\)\s*$/,'').trim(),time:String(d.time||'').slice(0,5)};
  }).filter(d=>d.line&&d.direction&&/^\d\d:\d\d$/.test(d.time)).slice(0,max);
}
export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'GET only'});
  const key=process.env.TRAFIKLAB_KEY;if(!key)return json(res,503,{error:'TRAFIKLAB_KEY is not configured'});
  if(boardCache.data&&Date.now()-boardCache.at<60000)return json(res,200,boardCache.data,'public, s-maxage=60');
  try{
    if(!stopCache){const found=await get('location.name?input='+encodeURIComponent('Karlstad Resecentrum'),key);const loc=(found.stopLocationOrCoordLocation||[]).map(x=>x.StopLocation).find(Boolean);if(!loc)throw new Error('stop not found');stopCache={id:loc.extId||loc.id,name:'Karlstad Resecentrum'};}
    const board=await get('departureBoard?id='+encodeURIComponent(stopCache.id)+'&maxJourneys=12',key);
    const departures=parseDepartures(board);if(!departures.length)throw new Error('no departures');
    boardCache={at:Date.now(),data:{stop:stopCache.name,updated:new Date().toISOString(),departures}};
    return json(res,200,boardCache.data,'public, s-maxage=60');
  }catch(e){return json(res,502,{error:String(e.message||e).slice(0,120)});}
}
