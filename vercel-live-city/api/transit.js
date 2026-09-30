import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import {ORIGIN,kmBetween,gameXY,number,safeText} from '../lib/live-utils.js';

const URL='https://opendata.samtrafiken.se/gtfs-rt-sweden/varm/VehiclePositionsSweden.pb';
const RADIUS_KM=Number(process.env.KARLSTAD_TRANSIT_RADIUS_KM||'8');
const CACHE_SECONDS=Math.max(30,Number(process.env.TRANSIT_CACHE_SECONDS||'90'));

export default async function handler(req,res){
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});

  const key=String(process.env.TRAFIKLAB_API_KEY||'').trim();
  if(!key)return res.status(503).json({error:'trafiklab_key_missing'});

  try{
    const upstream=await fetch(URL+'?key='+encodeURIComponent(key),{
      headers:{'user-agent':'Karlstad-City-Live/2.1'}
    });
    if(!upstream.ok){
      const detail=(await upstream.text()).replace(/\s+/g,' ').trim().slice(0,240);
      console.error('[transit] Trafiklab HTTP',{status:upstream.status,statusText:upstream.statusText,detail});
      return res.status(502).json({
        error:'transit_upstream_failed',
        reason:'trafiklab_http_error',
        upstreamStatus:upstream.status,
        upstreamStatusText:upstream.statusText||null,
        upstreamDetail:detail||null
      });
    }

    const bytes=new Uint8Array(await upstream.arrayBuffer());
    const feed=GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
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
      source:'Trafiklab GTFS Sweden 3 · Värmlandstrafik',
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
      reason:/decode|protobuf|wire|illegal tag/i.test(message)?'gtfs_decode_failed':'proxy_exception'
    });
  }
}
