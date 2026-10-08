// Julklappsjakten: egen sparning (julstämplar, rekord, summor och inställningar). Egen nyckel, så grundspelets sparfiler aldrig berörs.
// Alltid fail-soft: utan lagring (privat läge, blockerad) spelas spelet ändå, bara utan att något sparas.
import {SAVE_KEY,STAMPS,WEATHER_ORDER,titleFor} from './xmas-config.mjs?v=2.21.1-xmas.1';

const STAMP_IDS=new Set(STAMPS.map(s=>s.id));
const num=(v,max,fallback=0)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):fallback;
export const blankSave=()=>({v:1,stamps:{},records:{},totals:{packages:0,bonus:0,points:0,runs:0},opts:{weather:'full'},intro:{done:false}});

export function sanitizeSave(raw){
  const out=blankSave();
  if(!raw||typeof raw!=='object'||raw.v!==1)return out;
  for(const [id,at] of Object.entries(raw.stamps||{}))if(STAMP_IDS.has(id))out.stamps[id]=num(at,4102444800000,0)||1;
  for(const [id,r] of Object.entries(raw.records||{})){
    if(!/^[a-z0-9:-]{1,40}$/.test(id)||!r||typeof r!=='object')continue;
    out.records[id]={points:Math.floor(num(r.points,9999999)),seconds:Math.floor(num(r.seconds,99999,0)),packages:Math.floor(num(r.packages,9999)),bonus:Math.floor(num(r.bonus,99))};
  }
  const t=raw.totals||{};
  out.totals={packages:Math.floor(num(t.packages,9999999)),bonus:Math.floor(num(t.bonus,9999999)),points:Math.floor(num(t.points,99999999)),runs:Math.floor(num(t.runs,9999999))};
  out.opts.weather=WEATHER_ORDER.includes(raw.opts?.weather)?raw.opts.weather:'full';
  out.intro.done=!!raw.intro?.done||!!out.stamps.intro;
  return out;
}

export class XmasSave{
  constructor(storage=null){
    this.storage=storage;this.state=blankSave();this.dirty=false;
    try{this.state=sanitizeSave(JSON.parse(storage?.getItem(SAVE_KEY)||'null'));}catch{}
  }
  save(){try{this.storage?.setItem(SAVE_KEY,JSON.stringify(this.state));this.dirty=false;return true;}catch{return false;}}
  hasStamp(id){return !!this.state.stamps[id];}
  stampCount(){return Object.keys(this.state.stamps).length;}
  stampTotal(){return STAMPS.length;}
  // Första gången: true och sparas. Annars false (stämpeln ges aldrig två gånger).
  stamp(id,at=Date.now()){
    if(!STAMP_IDS.has(id)||this.state.stamps[id])return false;
    this.state.stamps[id]=at;if(id==='intro')this.state.intro.done=true;this.dirty=true;this.save();return true;
  }
  // Rekord per körning: bäst poäng räknas. Returnerar om det blev ett nytt rekord.
  record(id,{points=0,seconds=0,packages=0,bonus=0}={}){
    if(!/^[a-z0-9:-]{1,40}$/.test(id))return false;
    const old=this.state.records[id],better=!old||points>old.points||(points===old.points&&seconds>0&&seconds<old.seconds);
    if(better)this.state.records[id]={points:Math.floor(num(points,9999999)),seconds:Math.floor(num(seconds,99999)),packages:Math.floor(num(packages,9999)),bonus:Math.floor(num(bonus,99))};
    this.dirty=true;this.save();return !!better&&!!old;
  }
  addTotals({packages=0,bonus=0,points=0}={}){
    const t=this.state.totals;t.packages=Math.min(9999999,t.packages+Math.max(0,Math.floor(packages)));t.bonus=Math.min(9999999,t.bonus+Math.max(0,Math.floor(bonus)));
    t.points=Math.min(99999999,t.points+Math.max(0,Math.floor(points)));t.runs=Math.min(9999999,t.runs+1);this.dirty=true;this.save();
  }
  setWeather(level){if(!WEATHER_ORDER.includes(level))return false;this.state.opts.weather=level;this.dirty=true;this.save();return true;}
  get weather(){return this.state.opts.weather;}
  get introDone(){return !!this.state.intro.done;}
  title(){return titleFor(this.state.totals.points);}
  reset(){this.state=blankSave();this.save();}
}
