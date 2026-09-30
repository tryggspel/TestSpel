import {ORIGIN,kmBetween,gameXY,parseWgs84,safeText,xmlEscape} from '../lib/live-utils.js';

const URL='https://api.trafikinfo.trafikverket.se/v2/data.json';
const RADIUS_KM=Math.max(5,Number(process.env.KARLSTAD_INCIDENT_RADIUS_KM||'20'));
const CACHE_SECONDS=Math.max(60,Number(process.env.INCIDENT_CACHE_SECONDS||'120'));

function normalize(payload){
  const situations=payload?.RESPONSE?.RESULT?.flatMap?.(r=>r.Situation||[])||[];
  const items=[];

  for(const situation of situations){
    for(const d of situation.Deviation||[]){
      const geo=parseWgs84(d?.Geometry?.WGS84||d?.Geometry);
      if(!geo)continue;

      const distanceKm=kmBetween(ORIGIN,geo);
      if(distanceKm>RADIUS_KM)continue;

      const xy=gameXY(geo.lat,geo.lon);
      items.push({
        id:safeText(d.Id||situation.Id,100),
        type:safeText(d.MessageType||d.MessageCode,80),
        severity:safeText(d.SeverityText||d.SeverityCode,80),
        header:safeText(d.Header,160),
        message:safeText(d.Message,260),
        road:safeText(d.RoadNumber,40),
        position:safeText(d.LocationDescriptor||d.PositionalDescription,160),
        startTime:d.StartTime||null,
        endTime:d.EndTime||null,
        lat:geo.lat,
        lon:geo.lon,
        x:Math.round(xy.x),
        z:Math.round(xy.z),
        distanceKm:Math.round(distanceKm*10)/10
      });
    }
  }

  return items.sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,16);
}

export default async function handler(req,res){
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});

  const key=process.env.TRAFIKVERKET_API_KEY;
  if(!key)return res.status(503).json({error:'trafikverket_key_missing'});

  const body='<REQUEST><LOGIN authenticationkey="'+xmlEscape(key)+'" /><QUERY objecttype="Situation" schemaversion="1.5" orderby="ModifiedTime desc" limit="100"><FILTER><ELEMENTMATCH><AND><EQ name="Deviation.CountyNo" value="17" /><OR><EXISTS name="Deviation.EndTime" value="false" /><GT name="Deviation.EndTime" value="$now" /></OR></AND></ELEMENTMATCH></FILTER><INCLUDE>Id</INCLUDE><INCLUDE>ModifiedTime</INCLUDE><INCLUDE>Deviation.Id</INCLUDE><INCLUDE>Deviation.Header</INCLUDE><INCLUDE>Deviation.Message</INCLUDE><INCLUDE>Deviation.MessageType</INCLUDE><INCLUDE>Deviation.SeverityCode</INCLUDE><INCLUDE>Deviation.SeverityText</INCLUDE><INCLUDE>Deviation.RoadNumber</INCLUDE><INCLUDE>Deviation.LocationDescriptor</INCLUDE><INCLUDE>Deviation.StartTime</INCLUDE><INCLUDE>Deviation.EndTime</INCLUDE><INCLUDE>Deviation.Geometry.WGS84</INCLUDE></QUERY></REQUEST>';

  try{
    const upstream=await fetch(URL,{
      method:'POST',
      headers:{'content-type':'text/xml','user-agent':'Karlstad-City-Live/2.1'},
      body
    });

    if(!upstream.ok){
      const detail=(await upstream.text()).replace(/\s+/g,' ').trim().slice(0,240);
      console.error('[incidents] Trafikverket HTTP',{status:upstream.status,statusText:upstream.statusText,detail});
      return res.status(502).json({
        error:'incidents_upstream_failed',
        reason:'trafikverket_http_error',
        upstreamStatus:upstream.status,
        upstreamStatusText:upstream.statusText||null,
        upstreamDetail:detail||null
      });
    }

    const payload=await upstream.json();
    const apiError=payload?.RESPONSE?.RESULT?.find?.(r=>r.ERROR)?.ERROR;
    if(apiError){
      console.error('[incidents] Trafikverket rejected query',{code:apiError.CODE||apiError.Code||null,message:apiError.MESSAGE||apiError.Message||null});
      return res.status(502).json({error:'incidents_upstream_failed',reason:'trafikverket_query_rejected'});
    }

    const items=normalize(payload);
    res.setHeader('Cache-Control','public, s-maxage='+CACHE_SECONDS+', stale-while-revalidate=60');

    return res.status(200).json({
      source:'Trafikverket Open API · Situation',
      updatedAt:new Date().toISOString(),
      radiusKm:RADIUS_KM,
      count:items.length,
      items
    });
  }catch(e){
    const message=String(e?.message||e);
    console.error('[incidents]',{message});
    return res.status(502).json({
      error:'incidents_upstream_failed',
      reason:/Trafikverket \d+/.test(message)?'trafikverket_http_error':/JSON|Unexpected token/i.test(message)?'trafikverket_invalid_json':'proxy_exception'
    });
  }
}
