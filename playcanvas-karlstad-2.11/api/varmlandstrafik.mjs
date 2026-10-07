// Avgångar från Karlstad Resecentrum för bussens skärm (BussQuiz). Data: Trafiklab ResRobot (öppna data, inkl. Värmlandstrafik).
// Kräver miljövariabeln TRAFIKLAB_KEY (gratis nyckel från trafiklab.se, API: "ResRobot - Reseplanerare / Stolptidtabeller").
// Utan nyckel svarar funktionen 503 och spelet använder sina inbyggda frågor. Svaret cachas i en minut.
const json=(res,status,data,cache='no-store')=>res.status(status).setHeader('Cache-Control',cache).json(data);
let stopCache=null,boardCache={at:0,data:null};
const BASE='https://api.resrobot.se/v2.1';
async function get(path,key){const r=await fetch(`${BASE}/${path}${path.includes('?')?'&':'?'}format=json&accessId=${encodeURIComponent(key)}`,{headers:{accept:'application/json'}});if(!r.ok)throw new Error('ResRobot '+r.status);return r.json();}
// Tavlan innehåller även tåg och expressbussar från andra län (t.ex. Kristianstad). Spelet ska handla om Värmlandstrafik:
// har ResRobot angett operatör behåller vi bara Värmlandstrafik, annars släpper vi långväga linjer (fyrsiffriga nummer).
const isVarmland=d=>/värmland|varmland/i.test([d.ProductAtStop?.operator,d.ProductAtStop?.operatorInfo?.name,d.ProductAtStop?.operatorCode].filter(Boolean).join(' '));
export function parseDepartures(data,max=10){
  const list=Array.isArray(data?.Departure)?data.Departure:[];
  const rows=list.map(d=>{
    const line=String(d.ProductAtStop?.displayNumber||d.ProductAtStop?.num||(String(d.name||'').match(/(\d+)\s*$/)||[])[1]||'').trim();
    return {local:isVarmland(d),line,direction:String(d.direction||'').replace(/\s*\(.*\)\s*$/,'').trim(),time:String(d.time||'').slice(0,5)};
  }).filter(d=>d.line&&d.direction&&/^\d\d:\d\d$/.test(d.time));
  const local=rows.filter(d=>d.local);
  const kept=local.length>=2?local:rows.filter(d=>!/^\d{4,}$/.test(d.line));
  return kept.slice(0,max).map(({line,direction,time})=>({line,direction,time}));
}
export const operatorsIn=data=>[...new Set((data?.Departure||[]).map(d=>d.ProductAtStop?.operator).filter(Boolean))].slice(0,8);
export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'GET only'});
  const key=process.env.TRAFIKLAB_KEY;if(!key)return json(res,503,{error:'TRAFIKLAB_KEY is not configured'});
  if(boardCache.data&&Date.now()-boardCache.at<60000)return json(res,200,boardCache.data,'public, s-maxage=60');
  try{
    if(!stopCache){const found=await get('location.name?input='+encodeURIComponent('Karlstad Resecentrum'),key);const loc=(found.stopLocationOrCoordLocation||[]).map(x=>x.StopLocation).find(Boolean);if(!loc)throw new Error('stop not found');stopCache={id:loc.extId||loc.id,name:'Karlstad Resecentrum'};}
    const board=await get('departureBoard?id='+encodeURIComponent(stopCache.id)+'&maxJourneys=40',key);
    const departures=parseDepartures(board);const operators=operatorsIn(board);if(!departures.length)throw new Error('no departures');
    boardCache={at:Date.now(),data:{stop:stopCache.name,updated:new Date().toISOString(),departures,operators}};
    return json(res,200,boardCache.data,'public, s-maxage=60');
  }catch(e){return json(res,502,{error:String(e.message||e).slice(0,120)});}
}
