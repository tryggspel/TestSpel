import {LIVE_CITY_VERSION,deriveCityPulse,deriveLiveModifiers,evaluatePerformance} from './live-city-rules.mjs?v=2.0.0';

const CACHE_KEY='karlstad:live-city:2';
const median=a=>{const b=[...a].sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:0};
const safeStorage=()=>{
  try{return localStorage}catch{return null}
};
function staleSnapshot(s){
  if(!s||!Number.isFinite(s.at))return null;
  const age=Date.now()-s.at;
  if(age>6*60*60*1000)return null;
  return {...s,stale:age>45*60*1000};
}
function summary(s){
  if(!s)return '';
  const temp=Number.isFinite(s.weather?.temperature)?Math.round(s.weather.temperature)+'°C':'—';
  const bus=s.transport?.vehicles?.length;
  return 'LIVE2 '+temp+' · PULS '+(s.pulse?.value??'—')+(Number.isFinite(bus)?' · BUSS '+bus:'');
}

export function createLiveCity({app,origin,coarse=false,config={},onSnapshot=()=>{}}={}){
  let worker=null,started=false,suspended=false,baseline=0,strikes=0,latest=null;
  let baselineSamples=[],monitor=null,hud='LIVE2 INIT',providerErrors={};
  const storage=safeStorage();
  const listeners=new Set();

  function publish(raw,source='live'){
    const pulse=raw?.pulse||deriveCityPulse({weather:raw?.weather,transport:raw?.transport});
    latest=Object.freeze({...raw,pulse,source,version:LIVE_CITY_VERSION});
    hud=summary(latest);
    try{storage?.setItem(CACHE_KEY,JSON.stringify({...latest,at:Date.now()}));}catch{}
    onSnapshot(latest);
    for(const fn of listeners){try{fn(latest)}catch(e){console.warn('[Live City listener]',e)}}
  }
  function fps(){return Math.max(0,Number(app?.stats?.frame?.fps)||0)}
  function stopWorker(){if(worker){try{worker.postMessage({type:'stop'});worker.terminate()}catch{}worker=null}}
  function suspend(reason='manual'){
    if(suspended)return;
    suspended=true;stopWorker();
    hud='LIVE2 PAUS · '+String(reason).toUpperCase();
    console.warn('[Live City 2.0] suspended:',reason);
  }
  function monitorPerformance(){
    const current=fps();if(!current)return;
    if(!baseline){
      baselineSamples.push(current);
      if(baselineSamples.length>=4){
        baseline=median(baselineSamples);
        hud='LIVE2 CONNECT';
        beginWorker();
      }
      return;
    }
    const gate=evaluatePerformance({baseline,current,strikes,coarse});
    strikes=gate.strikes;
    if(gate.disable)suspend('fps guard');
  }
  function beginWorker(){
    if(worker||suspended)return;
    try{
      worker=new Worker(new URL('./live-city-worker.js?v=2.0.1',import.meta.url),{name:'karlstad-live-city'});
      worker.onmessage=e=>{
        const m=e.data||{};
        if(m.type==='snapshot')publish(m,'worker');
        else if(m.type==='provider-error'){providerErrors[m.provider]=m.message;console.warn('[Live City '+m.provider+']',m.message)}
      };
      worker.onerror=e=>{providerErrors.worker=String(e.message||e);console.warn('[Live City worker]',e)};
      worker.postMessage({type:'start',config:{
        origin,
        weatherMs:config.weatherMs,
        transportMs:config.transportMs,
        transportRadiusKm:config.transportRadiusKm,
        transportProxy:config.transportProxy||''
      }});
    }catch(e){providerErrors.worker=String(e?.message||e);console.warn('[Live City 2.0 unavailable]',e)}
  }
  function start(){
    if(started)return;started=true;
    const kick=()=>{
      const cached=staleSnapshot((()=>{try{return JSON.parse(storage?.getItem(CACHE_KEY)||'null')}catch{return null}})());
      if(cached)publish(cached,'cache');
      else hud='LIVE2 BASELINE';
      monitor=setInterval(monitorPerformance,2000);
      monitorPerformance();
    };
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if('requestIdleCallback'in window)requestIdleCallback(kick,{timeout:900});
      else setTimeout(kick,600);
    }));
  }
  function destroy(){if(monitor)clearInterval(monitor);monitor=null;stopWorker();started=false}
  function subscribe(fn){listeners.add(fn);if(latest)fn(latest);return()=>listeners.delete(fn)}
  return Object.freeze({
    version:LIVE_CITY_VERSION,start,destroy,suspend,subscribe,
    snapshot:()=>latest,
    modifiers:()=>deriveLiveModifiers(latest),
    hudLine:()=>hud,
    diagnostics:()=>Object.freeze({started,suspended,baselineFps:baseline,currentFps:fps(),strikes,worker:!!worker,providerErrors:{...providerErrors},snapshot:latest})
  });
}
