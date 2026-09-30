import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import {ORIGIN,kmBetween,gameXY,number,safeText} from '../lib/live-utils.js';

const SOURCES=[
  {
    mode:'sweden3-realtime',
    url:'https://opendata.samtrafiken.se/gtfs-rt-sweden/varm/VehiclePositionsSweden.pb'
  },
  {
    mode:'regional-realtime',
    url:'https://opendata.samtrafiken.se/gtfs-rt/varm/VehiclePositions.pb'
  }
];
const RADIUS_KM=Number(process.env.KARLSTAD_TRANSIT_RADIUS_KM||'8');
const CACHE_SECONDS=Math.max(30,Number(process.env.TRANSIT_CACHE_SECONDS||'90'));

async function fetchFeed(key){
  const attempts=[];
  for(const source of SOURCES){
    const upstream=await fetch(source.url+'?key='+encodeURIComponent(key),{
      headers:{'user-agent':'Karlstad-City-Live/2.2'}
    });

    if(!upstream.ok){
      const detail=(await upstream.text()).replace(/\s+/g,' ').trim().slice(0,220);
      attempts.push({
        mode:source.mode,
        status:upstream.status,
        detail:detail||null
      });
      continue;
    }

    try{
      const bytes=new Uint8Array(await upstream.arrayBuffer());
      const feed=GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
      return {mode:source.mode,feed,attempts};
    }catch(e){
      attempts.push({
        mode:source.mode,
        status:upstream.status,
        detail:'protobuf_decode_failed'
      });
    }
  }
  return {mode:null,feed:null,attempts};
}

export default async function handler(req,res){
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});

  const key=String(process.env.TRAFIKLAB_API_KEY||'').trim();
  if(!key)return res.status(503).json({error:'trafiklab_key_missing'});

  try{
    const result=await fetchFeed(key);
    if(!result.feed){
      console.error('[transit] no Trafiklab feed accepted key',result.attempts);
      return res.status(502).json({
        error:'transit_upstream_failed',
        reason:'no_supported_trafiklab_feed',
        attempts:result.attempts
      });
    }

    const feed=result.feed;
    const vehicles=[];

    for(const entity of feed.entity||[]){
      const v=entity.vehicle,p=v?.position;
      const lat=number(p?.latitude),lon=number(p?.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;

      const distanceKm=kmBetween(ORIGIN,{lat,lon});
      if(distanceKm>RADIUS_KM)continue;

      const xy=gameXY(lat,lon);
      vehicles.push({
        id:safeText(v.vehicle?.id||entity.id,80),
        label:safeText(v.vehicle?.label,80),
        routeId:safeText(v.trip?.routeId,80),
        tripId:safeText(v.trip?.tripId,100),
        lat,lon,
        x:Math.round(xy.x*10)/10,
        z:Math.round(xy.z*10)/10,
        bearing:number(p?.bearing),
        speed:number(p?.speed),
        distanceKm:Math.round(distanceKm*100)/100,
        timestamp:v.timestamp?Number(v.timestamp.toString?.()||v.timestamp):null
      });
    }

    vehicles.sort((a,b)=>a.distanceKm-b.distanceKm);
    res.setHeader('Cache-Control','public, s-maxage='+CACHE_SECONDS+', stale-while-revalidate=45');

    return res.status(200).json({
      source:'Trafiklab GTFS-RT · Värmlandstrafik',
      feedMode:result.mode,
      operator:'varm',
      updatedAt:new Date().toISOString(),
      feedTimestamp:feed.header?.timestamp?Number(feed.header.timestamp.toString?.()||feed.header.timestamp):null,
      radiusKm:RADIUS_KM,
      vehicles:vehicles.slice(0,24)
    });
  }catch(e){
    const message=String(e?.message||e);
    console.error('[transit]',{message});
    return res.status(502).json({
      error:'transit_upstream_failed',
      reason:'proxy_exception'
    });
  }
}
