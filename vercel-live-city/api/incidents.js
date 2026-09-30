import {ORIGIN,kmBetween,gameXY,parseWgs84,safeText,xmlEscape} from '../lib/live-utils.js';

const URL='https://api.trafikinfo.trafikverket.se/v2/data.json';
const RADIUS_KM=Math.max(5,Number(process.env.KARLSTAD_INCIDENT_RADIUS_KM||'20'));
const CACHE_SECONDS=Math.max(60,Number(process.env.INCIDENT_CACHE_SECONDS||'120'));

function normalize(payload){
  const situations=payload?.RESPONSE?.RESULT?.flatMap?.(r=>r.Situation||[])||[];
  const items=[];
  const now=Date.now();

  for(const situation of situations){
    for(const d of situation.Deviation||[]){
      const counties=Array.isArray(d.Counties)?d.Counties:
        Number.isFinite(Number(d.CountyNo))?[Number(d.CountyNo)]:[];
      if(counties.length&& !counties.map(Number).includes(17))continue;

      const endTime=d.EndTime?Date.parse(d.EndTime):NaN;
      if(Number.isFinite(endTime)&&endTime<now)continue;

      const geo=parseWgs84(d?.Geometry?.WGS84||d?.Geometry?.Point?.WGS84||d?.Geometry?.Line?.WGS84||d?.Geometry);
      if(!geo)continue;

      const distanceKm=kmBetween(ORIGIN,geo);
      if(distanceKm>RADIUS_KM)continue;

      const xy=gameXY(geo.lat,geo.lon);
      items.push({
        id:safeText(d.Id||situation.Id||('incident-'+items.length),100),
        type:safeText(d.MessageType||d.MessageCode,80),
        severity:safeText(d.SeverityText||d.SeverityCode,80),
        header:safeText(d.Header,160),
        message:safeText(d.Message,260),
        road:safeText(d.RoadNumber||d.RoadName,40),
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

const QUERY_CANDIDATES=[
  {mode:'namespace-1.6',xml:'<QUERY objecttype="Situation" namespace="Road.TrafficInfo" schemaversion="1.6" limit="100"></QUERY>'},
  {mode:'qualified-1.6',xml:'<QUERY objecttype="Road.TrafficInfo.Situation" schemaversion="1.6" limit="100"></QUERY>'},
  {mode:'legacy-1.5',xml:'<QUERY objecttype="Situation" schemaversion="1.5" limit="100"></QUERY>'}
];

function extractSituations(payload){
  const results=payload?.RESPONSE?.RESULT||[];
  const out=[];
  for(const r of results){
    if(Array.isArray(r?.Situation))out.push(...r.Situation);
    else if(Array.isArray(r?.['Road.TrafficInfo.Situation']))out.push(...r['Road.TrafficInfo.Situation']);
    else{
      const hit=Object.entries(r||{}).find(([k,v])=>/Situation$/.test(k)&&Array.isArray(v));
      if(hit)out.push(...hit[1]);
    }
  }
  return out;
}

function normalizeAdaptive(payload){
  const wrapped={RESPONSE:{RESULT:[{Situation:extractSituations(payload)}]}};
  return normalize(wrapped);
}

async function queryTrafikverket(key){
  const diagnostics=[];
  for(const candidate of QUERY_CANDIDATES){
    const body='<REQUEST><LOGIN authenticationkey="'+xmlEscape(key)+'" />'+candidate.xml+'</REQUEST>';
    const upstream=await fetch(URL,{
      method:'POST',
      headers:{'content-type':'text/xml','user-agent':'Karlstad-City-Live/2.2'},
      body
    });

    const raw=await upstream.text();
    if(!upstream.ok){
      diagnostics.push({mode:candidate.mode,status:upstream.status,detail:raw.replace(/\s+/g,' ').trim().slice(0,180)});
      continue;
    }

    let payload;
    try{payload=JSON.parse(raw);}
    catch{
      diagnostics.push({mode:candidate.mode,status:upstream.status,detail:'invalid_json'});
      continue;
    }

    const apiError=payload?.RESPONSE?.RESULT?.find?.(r=>r.ERROR)?.ERROR;
    if(apiError){
      diagnostics.push({
        mode:candidate.mode,
        status:upstream.status,
        detail:String(apiError.MESSAGE||apiError.Message||apiError.SOURCE||apiError.Source||'api_error').slice(0,180)
      });
      continue;
    }

    return {mode:candidate.mode,payload,diagnostics};
  }
  return {mode:null,payload:null,diagnostics};
}

export default async function handler(req,res){
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});

  const key=String(process.env.TRAFIKVERKET_API_KEY||'').trim();
  if(!key)return res.status(503).json({error:'trafikverket_key_missing'});

  try{
    const result=await queryTrafikverket(key);
    if(!result.payload){
      console.error('[incidents] no Trafikverket query mode accepted',result.diagnostics);
      return res.status(502).json({
        error:'incidents_upstream_failed',
        reason:'no_supported_situation_query',
        attempts:result.diagnostics
      });
    }

    const items=normalizeAdaptive(result.payload);
    res.setHeader('Cache-Control','public, s-maxage='+CACHE_SECONDS+', stale-while-revalidate=60');

    return res.status(200).json({
      source:'Trafikverket Open API · Situation',
      queryMode:result.mode,
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
      reason:'proxy_exception'
    });
  }
}
