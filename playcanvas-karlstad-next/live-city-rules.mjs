export const LIVE_CITY_VERSION='2.1.0';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;

export function normalizeWeather(data,now=Date.now()){
  if(!data||!Array.isArray(data.timeSeries)||!data.timeSeries.length)return null;
  const entries=data.timeSeries.filter(x=>Number.isFinite(Date.parse(x?.time)));
  if(!entries.length)return null;
  const entry=entries.reduce((a,b)=>Math.abs(Date.parse(b.time)-now)<Math.abs(Date.parse(a.time)-now)?b:a);
  if(Math.abs(Date.parse(entry.time)-now)>2*60*60*1000)return null;
  const v=entry.data||{};
  const temperature=finite(v.air_temperature,NaN);
  if(!Number.isFinite(temperature)||temperature<-60||temperature>55)return null;
  return Object.freeze({
    source:'SMHI SNOW1g v1',
    temperature,
    wind:clamp(finite(v.wind_speed,0),0,100),
    cloud:clamp(finite(v.cloud_area_fraction,4),0,8),
    rain:clamp(finite(v.precipitation_amount_mean,0),0,200),
    validAt:entry.time,
    issuedAt:data.referenceTime||null
  });
}

export function normalizeTransport(data,origin={lat:59.380767,lon:13.50295},radiusKm=8){
  const list=Array.isArray(data?.vehicles)?data.vehicles:[];
  const lat0=origin.lat*Math.PI/180;
  const within=[];
  for(const raw of list){
    const lat=finite(raw?.lat,NaN),lon=finite(raw?.lon,NaN);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const eastKm=(lon-origin.lon)*111.32*Math.cos(lat0),northKm=(lat-origin.lat)*110.54;
    const distanceKm=Math.hypot(eastKm,northKm);
    if(distanceKm>radiusKm)continue;
    within.push(Object.freeze({
      id:String(raw.id||raw.vehicleId||within.length+1),
      label:raw.label?String(raw.label):null,
      lat,lon,distanceKm,
      x:Number.isFinite(Number(raw.x))?Number(raw.x):eastKm*1000,
      z:Number.isFinite(Number(raw.z))?Number(raw.z):-northKm*1000,
      bearing:Number.isFinite(Number(raw.bearing))?Number(raw.bearing):null,
      speed:Number.isFinite(Number(raw.speed))?Number(raw.speed):null,
      route:raw.route||raw.routeId?String(raw.route||raw.routeId):null,
      timestamp:Number.isFinite(Number(raw.timestamp))?Number(raw.timestamp):null
    }));
    if(within.length>=24)break;
  }
  return Object.freeze({
    source:data?.source||'Trafiklab GTFS-RT proxy',
    updatedAt:data?.updatedAt||null,
    feedTimestamp:data?.feedTimestamp||null,
    vehicles:Object.freeze(within)
  });
}

export function normalizeIncidents(data){
  const items=(Array.isArray(data?.items)?data.items:[]).slice(0,16).map((raw,i)=>Object.freeze({
    id:String(raw?.id||'incident-'+i),
    type:raw?.type?String(raw.type):'Trafikhändelse',
    severity:raw?.severity?String(raw.severity):null,
    header:raw?.header?String(raw.header):null,
    message:raw?.message?String(raw.message):null,
    road:raw?.road?String(raw.road):null,
    position:raw?.position?String(raw.position):null,
    x:Number.isFinite(Number(raw?.x))?Number(raw.x):null,
    z:Number.isFinite(Number(raw?.z))?Number(raw.z):null,
    distanceKm:Number.isFinite(Number(raw?.distanceKm))?Number(raw.distanceKm):null
  }));
  return Object.freeze({
    source:data?.source||'Trafikverket Open API',
    updatedAt:data?.updatedAt||null,
    count:items.length,
    items:Object.freeze(items)
  });
}

export function incidentProfile(incidents){
  const items=Array.isArray(incidents?.items)?incidents.items:[];
  if(!items.length)return Object.freeze({count:0,level:0,kind:null,id:null,title:null});
  let best=null,bestLevel=-1;
  for(const item of items){
    const text=[item.type,item.severity,item.header,item.message].filter(Boolean).join(' ').toLowerCase();
    const kind=/olyck|krock|brand/.test(text)?'accident':/vägarb|arbete|underhåll/.test(text)?'roadwork':/kö|stillastående|trängsel/.test(text)?'congestion':/hinder|blocker|stängd|avstäng/.test(text)?'obstacle':'other';
    const severityText=String(item.severity||'').toLowerCase();
    const level=/mycket stor|extrem|very high|severe/.test(severityText)?3:/stor|high/.test(severityText)?2:/medel|medium/.test(severityText)?1:kind==='other'?0:1;
    if(level>bestLevel){bestLevel=level;best={item,kind,level};}
  }
  return Object.freeze({
    count:items.length,
    level:Math.max(0,bestLevel),
    kind:best?.kind||'other',
    id:best?.item?.id||null,
    title:best?.item?.header||best?.item?.type||'Trafikhändelse'
  });
}

export function deriveCityPulse({weather=null,transport=null,incidents=0,now=new Date()}={}){
  const h=now.getHours(),day=now.getDay();
  let value;
  if(h<6||h>=23)value=18;
  else if(day!==0&&day!==6&&((h>=7&&h<9)||(h>=15&&h<18)))value=68;
  else if(h>=10&&h<20)value=54;
  else value=36;
  const buses=Math.min(24,transport?.vehicles?.length||0);
  if(buses)value+=Math.min(22,buses*1.35);
  const rain=finite(weather?.rain,0),wind=finite(weather?.wind,0),cloud=finite(weather?.cloud,4);
  if(rain>.2)value-=7;
  if(rain>2)value-=5;
  if(wind>12)value-=5;
  if(cloud<=2&&h>=8&&h<20)value+=4;
  const incidentCount=typeof incidents==='number'?incidents:(incidents?.count||incidents?.items?.length||0);
  value+=Math.min(8,Math.max(0,finite(incidentCount,0))*2);
  value=Math.round(clamp(value,0,100));
  const band=value>=75?'HÖG':value>=48?'NORMAL':value>=28?'LUGN':'NATT';
  return Object.freeze({value,band,model:'game-derived',inputs:Object.freeze({buses,rain,wind,incidents:incidentCount})});
}

export function deriveLiveModifiers(snapshot){
  const pulse=clamp(finite(snapshot?.pulse?.value,50),0,100);
  const rain=clamp(finite(snapshot?.weather?.rain,0),0,20);
  const wind=clamp(finite(snapshot?.weather?.wind,0),0,40);
  const traffic=incidentProfile(snapshot?.incidents);
  return Object.freeze({
    chaosDelayScale:clamp(1.08-(pulse/100)*.22-rain*.006-traffic.level*.025,.76,1.08),
    pursuitSpeedScale:clamp(.96+(pulse/100)*.09,.96,1.05),
    scentDecayScale:clamp(1+wind*.008+rain*.006,1,1.24),
    sunAvailability:clamp(1-rain*.08,0.35,1),
    busCount:snapshot?.transport?.vehicles?.length||0,
    trafficIncidentCount:traffic.count,
    trafficIncidentLevel:traffic.level,
    trafficIncidentKind:traffic.kind,
    trafficIncidentId:traffic.id,
    trafficIncidentTitle:traffic.title,
    source:'Live City 2.1'
  });
}

export function evaluatePerformance({baseline,current,strikes=0,coarse=false}){
  const base=finite(baseline,0),fps=finite(current,0);
  if(base<=0||fps<=0)return Object.freeze({strikes,disable:false,ratio:1});
  const ratio=fps/base;
  const floor=coarse?28:42;
  const bad=ratio<.985||fps<floor;
  const next=bad?strikes+1:Math.max(0,strikes-1);
  return Object.freeze({strikes:next,disable:next>=3,ratio});
}
