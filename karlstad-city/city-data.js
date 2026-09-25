/* Public APIs: SMHI SNOW1g v1 (CC BY 4.0) and SCB PxWeb v2.
   Fixed Karlstad coordinates: no geolocation or personal data is requested. */
window.KarlstadCityData=class{
 constructor(onChange){this.onChange=onChange;this.weather=null;this.weatherStatus='loading';this.population={value:99007,year:'2025',status:'reference'};}
 async json(key,url,ttl){
  try{const cached=JSON.parse(localStorage.getItem(key));if(cached&&Number.isFinite(cached.at)&&Date.now()-cached.at<ttl&&Date.now()>=cached.at)return cached.data}catch{}
  const control=new AbortController(),timeout=setTimeout(()=>control.abort(),8000);
  try{const r=await fetch(url,{signal:control.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();try{localStorage.setItem(key,JSON.stringify({at:Date.now(),data}))}catch{}return data}finally{clearTimeout(timeout)}
 }
 async load(){await Promise.allSettled([this.loadWeather(),this.loadPopulation()]);}
 async loadWeather(){
  try{const d=await this.json('karlstad-smhi-snow1g-v1','https://opendata-download-metfcst.smhi.se/api/category/snow1g/version/1/geotype/point/lon/13.5036/lat/59.3793/data.json',1800000);
   if(!Array.isArray(d.timeSeries)||!d.timeSeries.length)throw Error('Missing forecast');const now=Date.now(),entry=d.timeSeries.reduce((a,b)=>Math.abs(Date.parse(b.time)-now)<Math.abs(Date.parse(a.time)-now)?b:a),v=entry.data;
   if(Math.abs(Date.parse(entry.time)-now)>7200000||!Number.isFinite(v?.air_temperature)||v.air_temperature< -60||v.air_temperature>55)throw Error('Stale or invalid forecast');
   const finite=(n,a,b,f)=>Number.isFinite(n)&&n>=a&&n<=b?n:f;
   this.weather={temperature:v.air_temperature,wind:finite(v.wind_speed,0,100,0),cloud:finite(v.cloud_area_fraction,0,8,4),rain:finite(v.precipitation_amount_mean,0,200,0),time:entry.time,issued:d.referenceTime};this.weatherStatus='ready';
  }catch{this.weatherStatus='unavailable';this.weather=null;}this.onChange(this);
 }
 async loadPopulation(){
  try{const q=new URLSearchParams({lang:'sv',outputFormat:'json-stat2','valueCodes[Region]':'1780','valueCodes[Civilstand]':'SC','valueCodes[Alder]':'TotSA','valueCodes[Kon]':'TotSa','valueCodes[ContentsCode]':'000007ME','valueCodes[Tid]':'2025'});
   const d=await this.json('karlstad-scb-tab5557-v1','https://api.scb.se/OV0104/v2beta/api/v2/tables/TAB5557/data?'+q,86400000),value=d.value?.[0],year=Object.keys(d.dimension?.Tid?.category?.label||{})[0];
   if(!Number.isFinite(value)||value<10000||value>1000000||year!=='2025')throw Error('Invalid population');this.population={value,year,status:'api'};
  }catch{this.population.status='reference'}this.onChange(this);
 }
};
