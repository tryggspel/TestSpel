let timers=[],state={weather:null,transport:null,incidents:null},cfg=null,stopped=false;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const sleepTimer=(fn,ms)=>{const id=setTimeout(fn,ms);timers.push(id);return id};
function clearAll(){for(const id of timers)clearTimeout(id);timers=[]}
async function json(url,timeout=8000){
  const ctl=new AbortController(),id=setTimeout(()=>ctl.abort(),timeout);
  try{
    const r=await fetch(url,{signal:ctl.signal,cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.json();
  }finally{clearTimeout(id)}
}
function normalizeWeather(data,now=Date.now()){
  if(!data||!Array.isArray(data.timeSeries)||!data.timeSeries.length)return null;
  const entries=data.timeSeries.filter(x=>Number.isFinite(Date.parse(x&&x.time)));
  if(!entries.length)return null;
  const entry=entries.reduce((a,b)=>Math.abs(Date.parse(b.time)-now)<Math.abs(Date.parse(a.time)-now)?b:a);
  if(Math.abs(Date.parse(entry.time)-now)>2*60*60*1000)return null;
  const v=entry.data||{},temperature=finite(v.air_temperature,NaN);
  if(!Number.isFinite(temperature)||temperature<-60||temperature>55)return null;
  return {source:'SMHI SNOW1g v1',temperature,wind:clamp(finite(v.wind_speed,0),0,100),cloud:clamp(finite(v.cloud_area_fraction,4),0,8),rain:clamp(finite(v.precipitation_amount_mean,0),0,200),validAt:entry.time,issuedAt:data.referenceTime||null};
}
function normalizeTransport(data,origin,radiusKm){
  const list=Array.isArray(data&&data.vehicles)?data.vehicles:[],lat0=origin.lat*Math.PI/180,within=[];
  for(const raw of list){
    const lat=finite(raw&&raw.lat,NaN),lon=finite(raw&&raw.lon,NaN);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const eastKm=(lon-origin.lon)*111.32*Math.cos(lat0),northKm=(lat-origin.lat)*110.54,distanceKm=Math.hypot(eastKm,northKm);
    if(distanceKm>radiusKm)continue;
    within.push({
      id:String(raw.id||raw.vehicleId||within.length+1),label:raw.label?String(raw.label):null,
      lat,lon,distanceKm,
      x:Number.isFinite(Number(raw.x))?Number(raw.x):eastKm*1000,
      z:Number.isFinite(Number(raw.z))?Number(raw.z):-northKm*1000,
      bearing:Number.isFinite(Number(raw.bearing))?Number(raw.bearing):null,
      speed:Number.isFinite(Number(raw.speed))?Number(raw.speed):null,
      route:raw.route||raw.routeId?String(raw.route||raw.routeId):null,
      timestamp:Number.isFinite(Number(raw.timestamp))?Number(raw.timestamp):null
    });
    if(within.length>=24)break;
  }
  return {source:data&&data.source||'Trafiklab GTFS-RT proxy',updatedAt:data&&data.updatedAt||null,feedTimestamp:data&&data.feedTimestamp||null,vehicles:within};
}
function normalizeIncidents(data){
  const items=(Array.isArray(data&&data.items)?data.items:[]).slice(0,16).map((raw,i)=>({
    id:String(raw&&raw.id||'incident-'+i),type:raw&&raw.type?String(raw.type):'Trafikhändelse',
    severity:raw&&raw.severity?String(raw.severity):null,header:raw&&raw.header?String(raw.header):null,
    message:raw&&raw.message?String(raw.message):null,road:raw&&raw.road?String(raw.road):null,
    position:raw&&raw.position?String(raw.position):null,
    x:Number.isFinite(Number(raw&&raw.x))?Number(raw.x):null,z:Number.isFinite(Number(raw&&raw.z))?Number(raw.z):null,
    distanceKm:Number.isFinite(Number(raw&&raw.distanceKm))?Number(raw.distanceKm):null
  }));
  return {source:data&&data.source||'Trafikverket Open API',updatedAt:data&&data.updatedAt||null,count:items.length,items};
}
function pulse(){
  const now=new Date(),h=now.getHours(),day=now.getDay(),weather=state.weather,transport=state.transport,incidents=state.incidents;
  let value=h<6||h>=23?18:(day!==0&&day!==6&&((h>=7&&h<9)||(h>=15&&h<18)))?68:h>=10&&h<20?54:36;
  const buses=Math.min(24,transport&&transport.vehicles?transport.vehicles.length:0);
  if(buses)value+=Math.min(22,buses*1.35);
  const rain=finite(weather&&weather.rain,0),wind=finite(weather&&weather.wind,0),cloud=finite(weather&&weather.cloud,4);
  if(rain>.2)value-=7;if(rain>2)value-=5;if(wind>12)value-=5;if(cloud<=2&&h>=8&&h<20)value+=4;
  const incidentCount=incidents&&Number.isFinite(incidents.count)?incidents.count:0;
  value+=Math.min(8,incidentCount*2);value=Math.round(clamp(value,0,100));
  return {value,band:value>=75?'HÖG':value>=48?'NORMAL':value>=28?'LUGN':'NATT',model:'game-derived',inputs:{buses,rain,wind,incidents:incidentCount}};
}
function emit(reason){postMessage({type:'snapshot',reason,at:Date.now(),weather:state.weather,transport:state.transport,incidents:state.incidents,pulse:pulse()})}
function weatherUrl(origin){return 'https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/'+Number(origin.lon||13.50295).toFixed(4)+'/lat/'+Number(origin.lat||59.380767).toFixed(4)+'/data.json'}
async function weatherTick(){
  if(stopped)return;
  try{state.weather=normalizeWeather(await json(weatherUrl(cfg.origin),8000));emit('weather')}catch(e){postMessage({type:'provider-error',provider:'weather',message:String(e&&e.message||e)})}
  if(!stopped)sleepTimer(weatherTick,cfg.weatherMs);
}
async function transportTick(){
  if(stopped||!cfg.transportProxy)return;
  try{state.transport=normalizeTransport(await json(cfg.transportProxy,7000),cfg.origin,cfg.transportRadiusKm);emit('transport')}catch(e){postMessage({type:'provider-error',provider:'transport',message:String(e&&e.message||e)})}
  if(!stopped)sleepTimer(transportTick,cfg.transportMs);
}
async function incidentTick(){
  if(stopped||!cfg.incidentProxy)return;
  try{state.incidents=normalizeIncidents(await json(cfg.incidentProxy,7000));emit('incidents')}catch(e){postMessage({type:'provider-error',provider:'incidents',message:String(e&&e.message||e)})}
  if(!stopped)sleepTimer(incidentTick,cfg.incidentMs);
}
onmessage=e=>{
  const m=e.data||{};
  if(m.type==='stop'){stopped=true;clearAll();return}
  if(m.type!=='start')return;
  stopped=false;clearAll();
  cfg={
    origin:m.config&&m.config.origin||{lat:59.380767,lon:13.50295},
    weatherMs:Math.max(15*60*1000,Number(m.config&&m.config.weatherMs)||30*60*1000),
    transportMs:Math.max(20*1000,Number(m.config&&m.config.transportMs)||30*1000),
    incidentMs:Math.max(60*1000,Number(m.config&&m.config.incidentMs)||2*60*1000),
    transportRadiusKm:Math.max(1,Math.min(20,Number(m.config&&m.config.transportRadiusKm)||8)),
    transportProxy:String(m.config&&m.config.transportProxy||'').trim(),
    incidentProxy:String(m.config&&m.config.incidentProxy||'').trim()
  };
  emit('start');weatherTick();if(cfg.transportProxy)transportTick();if(cfg.incidentProxy)incidentTick();
};
