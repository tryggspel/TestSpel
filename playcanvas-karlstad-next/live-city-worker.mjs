import {normalizeWeather,normalizeTransport,deriveCityPulse} from './live-city-rules.mjs?v=2.0.0';

let timers=[],state={weather:null,transport:null,incidents:0};
let cfg=null,stopped=false;

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
function emit(reason){
  const pulse=deriveCityPulse({weather:state.weather,transport:state.transport,incidents:state.incidents,now:new Date()});
  postMessage({type:'snapshot',reason,at:Date.now(),weather:state.weather,transport:state.transport,pulse});
}
function weatherUrl(origin){
  const lat=Number(origin?.lat||59.380767).toFixed(4),lon=Number(origin?.lon||13.50295).toFixed(4);
  const p='air_temperature,wind_speed,cloud_area_fraction,precipitation_amount_mean';
  return 'https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/'+lon+'/lat/'+lat+'/data.json?timeseries=4&parameters='+p;
}
async function weatherTick(){
  if(stopped)return;
  try{state.weather=normalizeWeather(await json(weatherUrl(cfg.origin),8000));emit('weather');}
  catch(e){postMessage({type:'provider-error',provider:'weather',message:String(e?.message||e)});}
  if(!stopped)sleepTimer(weatherTick,cfg.weatherMs);
}
async function transportTick(){
  if(stopped||!cfg.transportProxy)return;
  try{state.transport=normalizeTransport(await json(cfg.transportProxy,6000),cfg.origin,cfg.transportRadiusKm);emit('transport');}
  catch(e){postMessage({type:'provider-error',provider:'transport',message:String(e?.message||e)});}
  if(!stopped)sleepTimer(transportTick,cfg.transportMs);
}
self.onmessage=e=>{
  const m=e.data||{};
  if(m.type==='stop'){stopped=true;clearAll();return;}
  if(m.type!=='start')return;
  stopped=false;clearAll();
  cfg={
    origin:m.config?.origin||{lat:59.380767,lon:13.50295},
    weatherMs:Math.max(15*60*1000,Number(m.config?.weatherMs)||30*60*1000),
    transportMs:Math.max(20*1000,Number(m.config?.transportMs)||30*1000),
    transportRadiusKm:Math.max(1,Math.min(20,Number(m.config?.transportRadiusKm)||8)),
    transportProxy:String(m.config?.transportProxy||'').trim()
  };
  weatherTick();
  if(cfg.transportProxy)transportTick();
  emit('start');
};
