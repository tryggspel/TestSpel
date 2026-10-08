// 2.21: händelsegränssnitt för mätning av partnerplatser. Fem händelser, ett enda ställe att skicka dem till.
//
// VIKTIGT OM VAD DET HÄR ÄR (och inte är):
//  • Händelserna sparas bara LOKALT på den här enheten (localStorage). Det är till för verifiering under utveckling och i kundmöten.
//  • Det är INTE statistik över alla spelare. Aggregerad produktionsstatistik kräver en server som tar emot händelserna och
//    återstår. Gränssnittet är förberett: addSink() tar emot en funktion som skickar vidare, och beaconSink() är en färdig
//    (men avstängd) mottagare. Ingen av dem är kopplad till något i spelet.
//  • Inga personuppgifter och ingen position. Bara händelsetyp, plats-id, ett fåtal tillåtna fält och dag/klockslag.
export const EVENT_TYPES=Object.freeze({
  visit:'place_visit',      // digitalt platsbesök (spelaren gick in i butiken eller fram till serviceytan i spelet)
  start:'quest_start',      // uppdraget startades
  complete:'quest_complete',// uppdraget slutfördes
  abort:'quest_abort',      // uppdraget avbröts (spelaren, tiden, läget eller något annat avslutade det)
  link:'link_click'         // klick på verksamhetens godkända länk
});
export const PARTNER_EVENTS_KEY='karlstad:partner-events:1';
export const LOCAL_SCOPE_NOTE='Lokal mätning på den här enheten för verifiering. Inte statistik över alla spelare. Aggregerad statistik kräver en server och återstår.';
const TYPES=new Set(Object.values(EVENT_TYPES));
// Tillåtna extra fält. Allt annat kastas bort, så att ingen position eller identitet kan smyga med.
const META_KEYS=Object.freeze({reason:'s',seconds:'n',points:'n',first:'b',mistakes:'n',offer:'s',quest:'s'});
const MAX_RECENT=40;

const clampInt=(v,max=1e9)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
export function cleanMeta(meta){
  const out={};
  if(!meta||typeof meta!=='object')return out;
  for(const [k,kind] of Object.entries(META_KEYS)){
    const v=meta[k];if(v===undefined||v===null)continue;
    if(kind==='s'&&typeof v==='string')out[k]=v.replace(/[^\p{L}\p{N} _:.\-]/gu,'').slice(0,32);
    else if(kind==='n'&&Number.isFinite(v))out[k]=Math.round(v*10)/10;
    else if(kind==='b'&&typeof v==='boolean')out[k]=v;
  }
  return out;
}
// Dag (Stockholm) som ÅÅÅÅ-MM-DD. Intl är dyrt men händelser är sällsynta.
export function dayOf(ms){try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm'}).format(new Date(ms));}catch{return new Date(ms).toISOString().slice(0,10);}}

export class PartnerEvents{
  constructor({storage=null,clock=()=>Date.now(),knownPlaces=null}={}){
    this.storage=storage;this.clock=clock;this.known=knownPlaces?new Set(knownPlaces):null;this.sinks=[];
    this.totals={};this.perPlace={};this.recent=[];this.since=this.clock();this.load();
  }
  load(){
    try{
      const v=JSON.parse(this.storage?.getItem(PARTNER_EVENTS_KEY)||'null');
      if(!v||v.version!==1)return;
      for(const [place,counts] of Object.entries(v.perPlace||{})){
        if(!/^[a-z][a-z0-9-]{1,30}$/.test(place)||!counts||typeof counts!=='object')continue;
        for(const t of TYPES)if(counts[t])(this.perPlace[place]??={})[t]=clampInt(counts[t]);
      }
      for(const t of TYPES)this.totals[t]=Object.values(this.perPlace).reduce((n,c)=>n+(c[t]||0),0);
      this.recent=Array.isArray(v.recent)?v.recent.filter(e=>e&&TYPES.has(e.type)&&typeof e.place==='string').slice(-MAX_RECENT).map(e=>({type:e.type,place:e.place.slice(0,31),day:String(e.day||'').slice(0,10),at:clampInt(e.at,9e15),meta:cleanMeta(e.meta)})):[];
      if(Number.isFinite(v.since))this.since=v.since;
    }catch{}
  }
  save(){try{this.storage?.setItem(PARTNER_EVENTS_KEY,JSON.stringify({version:1,since:this.since,perPlace:this.perPlace,recent:this.recent}));}catch{}}
  addSink(fn){if(typeof fn==='function')this.sinks.push(fn);return ()=>{this.sinks=this.sinks.filter(s=>s!==fn);};}
  // Returnerar den lagrade händelsen eller null om typen eller platsen inte är giltig.
  record(type,placeId,meta={}){
    if(!TYPES.has(type)||typeof placeId!=='string'||!/^[a-z][a-z0-9-]{1,30}$/.test(placeId))return null;
    if(this.known&&!this.known.has(placeId))return null;
    const at=this.clock(),event={type,place:placeId,day:dayOf(at),at,meta:cleanMeta(meta)};
    const c=(this.perPlace[placeId]??={});c[type]=(c[type]||0)+1;this.totals[type]=(this.totals[type]||0)+1;
    this.recent.push(event);if(this.recent.length>MAX_RECENT)this.recent.splice(0,this.recent.length-MAX_RECENT);
    this.save();
    // Det som lämnar enheten (om en mottagare kopplas på) är avsiktligt mindre: ingen exakt tid, bara dag.
    const out={type,place:placeId,day:event.day,meta:event.meta};
    for(const s of this.sinks){try{s(out);}catch{}}
    return event;
  }
  count(type,placeId=null){return placeId?(this.perPlace[placeId]?.[type]||0):(this.totals[type]||0);}
  snapshot(){
    return {scope:'local-device',note:LOCAL_SCOPE_NOTE,since:this.since,totals:{...this.totals},perPlace:JSON.parse(JSON.stringify(this.perPlace)),recent:this.recent.slice(-10)};
  }
  reset(){this.totals={};this.perPlace={};this.recent=[];this.since=this.clock();this.save();}
}

// Färdig men AVSTÄNGD mottagare. Kopplas inte på av spelet. Används när en server finns och en integritetstext är på plats.
// send är injicerbar så att den kan testas utan nätverk.
export function beaconSink(url,{send=null}={}){
  const target=/^https:\/\//.test(url||'')?url:null;
  return event=>{
    if(!target)return false;
    const body=JSON.stringify(event);
    try{
      if(send)return !!send(target,body);
      if(typeof navigator!=='undefined'&&navigator.sendBeacon)return navigator.sendBeacon(target,body);
    }catch{}
    return false;
  };
}
