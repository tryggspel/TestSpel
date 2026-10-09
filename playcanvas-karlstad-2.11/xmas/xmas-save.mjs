// Julklappsjakten: egen sparning (julstämplar, rekord, summor och inställningar). Egen nyckel, så grundspelets sparfiler aldrig berörs.
// Alltid fail-soft: utan lagring (privat läge, blockerad) spelas spelet ändå, bara utan att något sparas.
import {SAVE_KEY,STAMPS,WEATHER_ORDER,titleFor} from './xmas-config.mjs?v=2.21.1-xmas.5';
import {RUSH_COUNT,RUSH_MAX,starsFor} from './xmas-rushes.mjs?v=2.21.1-xmas.5';
import {cleanName,cleanFriends,mergeFriend} from './xmas-board.mjs?v=2.21.1-xmas.5';
import {ZOMBIE_MAX} from './xmas-zombie-levels.mjs?v=2.21.1-xmas.5';

const STAMP_IDS=new Set(STAMPS.map(s=>s.id));
const MAXP=9999999;
const num=(v,max,fallback=0)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):fallback;
// rush: framstegen i JulRushens tolv nivåer ({cleared: högsta klarade, stars:{n:1–3}, best:{n:{points,seconds,packages,hearts}}, bestStreak}). name och friends: topplistan (xmas-board.mjs).
export const blankRush=()=>({cleared:0,stars:{},best:{},bestStreak:0});
// zombies: framstegen i Tomtezombies ({cleared: högsta klarade nivå, best:{n:{points,seconds,packages}}}), se xmas-zombie-levels.mjs.
export const blankZombies=()=>({cleared:0,best:{}});
export const blankSave=()=>({v:1,stamps:{},records:{},totals:{packages:0,bonus:0,points:0,runs:0},opts:{weather:'full'},intro:{done:false},rush:blankRush(),zombies:blankZombies(),name:'',friends:[]});

export function sanitizeSave(raw){
  const out=blankSave();
  if(!raw||typeof raw!=='object'||raw.v!==1)return out;
  for(const [id,at] of Object.entries(raw.stamps||{}))if(STAMP_IDS.has(id))out.stamps[id]=num(at,4102444800000,0)||1;
  for(const [id,r] of Object.entries(raw.records||{})){
    if(!/^[a-z0-9:-]{1,40}$/.test(id)||!r||typeof r!=='object')continue;
    out.records[id]={points:Math.floor(num(r.points,9999999)),seconds:Math.floor(num(r.seconds,99999,0)),packages:Math.floor(num(r.packages,9999)),bonus:Math.floor(num(r.bonus,999)),level:Math.floor(num(r.level,99))};
  }
  const t=raw.totals||{};
  out.totals={packages:Math.floor(num(t.packages,9999999)),bonus:Math.floor(num(t.bonus,9999999)),points:Math.floor(num(t.points,99999999)),runs:Math.floor(num(t.runs,9999999))};
  out.opts.weather=WEATHER_ORDER.includes(raw.opts?.weather)?raw.opts.weather:'full';
  out.intro.done=!!raw.intro?.done||!!out.stamps.intro;
  const r=raw.rush&&typeof raw.rush==='object'?raw.rush:{};
  out.rush.cleared=Math.floor(num(r.cleared,RUSH_MAX));out.rush.bestStreak=Math.floor(num(r.bestStreak,RUSH_MAX));
  for(let n=1;n<=RUSH_MAX;n++){
    const st=Math.floor(num(r.stars?.[n],3)),b=r.best?.[n];
    if(st>0)out.rush.stars[n]=st;
    if(b&&typeof b==='object'&&num(b.points,MAXP)>0)out.rush.best[n]={points:Math.floor(num(b.points,MAXP)),seconds:Math.floor(num(b.seconds,99999)),packages:Math.floor(num(b.packages,9999)),hearts:Math.floor(num(b.hearts,3))};
  }
  for(const n of Object.keys(out.rush.best))out.rush.cleared=Math.max(out.rush.cleared,+n);   // en klarad rush kan inte vara låst
  // Tomtezombies: nivåerna. Den som fick stämpeln i en tidigare version har klarat nivå 1.
  const z=raw.zombies&&typeof raw.zombies==='object'?raw.zombies:{};
  out.zombies.cleared=Math.floor(num(z.cleared,ZOMBIE_MAX));
  for(let n=1;n<=ZOMBIE_MAX;n++){const b=z.best?.[n];if(b&&typeof b==='object'&&num(b.points,MAXP)>0)out.zombies.best[n]={points:Math.floor(num(b.points,MAXP)),seconds:Math.floor(num(b.seconds,99999)),packages:Math.floor(num(b.packages,9999))};}
  for(const n of Object.keys(out.zombies.best))out.zombies.cleared=Math.max(out.zombies.cleared,+n);
  if(out.stamps.zombies)out.zombies.cleared=Math.max(out.zombies.cleared,1);
  out.name=cleanName(raw.name);out.friends=cleanFriends(raw.friends);
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
  record(id,{points=0,seconds=0,packages=0,bonus=0,level=0}={}){
    if(!/^[a-z0-9:-]{1,40}$/.test(id))return false;
    const old=this.state.records[id],better=!old||points>old.points||(points===old.points&&seconds>0&&seconds<old.seconds);
    if(better)this.state.records[id]={points:Math.floor(num(points,9999999)),seconds:Math.floor(num(seconds,99999)),packages:Math.floor(num(packages,9999)),bonus:Math.floor(num(bonus,999)),level:Math.floor(num(level,99))};
    this.dirty=true;this.save();return !!better&&!!old;
  }
  addTotals({packages=0,bonus=0,points=0}={}){
    const t=this.state.totals;t.packages=Math.min(9999999,t.packages+Math.max(0,Math.floor(packages)));t.bonus=Math.min(9999999,t.bonus+Math.max(0,Math.floor(bonus)));
    t.points=Math.min(99999999,t.points+Math.max(0,Math.floor(points)));t.runs=Math.min(9999999,t.runs+1);this.dirty=true;this.save();
  }
  // JulRushens nivåer. Bara klarade rusher sparas (stjärnor = hjärtan kvar). Returnerar {record, first, unlocked}: nytt rekord i rushen, första gången den klaras och om nästa rush just låstes upp.
  recordRush(n,{points=0,seconds=0,packages=0,hearts=0,cleared=false}={}){
    n=Math.floor(Number(n));const R=this.state.rush;
    if(!cleared||!(n>=1&&n<=RUSH_MAX))return {record:false,first:false,unlocked:false};
    const prev=R.best[n],first=!R.stars[n],unlocked=n>=R.cleared+1&&n<RUSH_MAX;
    R.stars[n]=Math.max(R.stars[n]||0,starsFor(hearts));
    const record=!prev||points>prev.points;
    if(record)R.best[n]={points:Math.floor(num(points,MAXP)),seconds:Math.floor(num(seconds,99999)),packages:Math.floor(num(packages,9999)),hearts:Math.floor(num(hearts,3))};
    R.cleared=Math.max(R.cleared,n);this.dirty=true;this.save();
    return {record:!!record&&!!prev,first,unlocked};
  }
  // Tomtezombies-nivåerna: en klarad nivå sparas (bästa poäng) och låser upp nästa. Returnerar {record, first, unlocked} som recordRush.
  recordZombies(n,{points=0,seconds=0,packages=0}={}){
    n=Math.floor(Number(n));const Z=this.state.zombies;
    if(!(n>=1&&n<=ZOMBIE_MAX))return {record:false,first:false,unlocked:false};
    const prev=Z.best[n],first=!prev,unlocked=n>=Z.cleared+1&&n<ZOMBIE_MAX,record=!prev||points>prev.points;
    if(record)Z.best[n]={points:Math.floor(num(points,MAXP)),seconds:Math.floor(num(seconds,99999)),packages:Math.floor(num(packages,9999))};
    Z.cleared=Math.max(Z.cleared,n);this.dirty=true;this.save();
    return {record:!!record&&!!prev,first,unlocked};
  }
  get zombies(){return this.state.zombies;}
  noteStreak(len){const R=this.state.rush,v=Math.floor(num(len,99));if(v>R.bestStreak){R.bestStreak=v;this.dirty=true;this.save();return true;}return false;}
  get rush(){return this.state.rush;}
  // Summan av bästa poäng i varje klarad rush (de tolv namngivna), och antalet stjärnor: det som visas på topplistan och går med i utmaningslänken (som bara bär de tolv).
  // Hur långt man kommit i övertiden (Rush 13 och uppåt) syns i `cleared` och i listan LÄNGST; övertidens poäng och stjärnor räknas inte in här, så att din summa är jämförbar med vännernas.
  profile(at=Date.now()){
    const R=this.state.rush,bests={};let total=0,stars=0;
    for(const [n,b] of Object.entries(R.best)){if(+n>RUSH_COUNT)continue;bests[n]=b.points;total+=b.points;}
    for(const [n,v] of Object.entries(R.stars))if(+n<=RUSH_COUNT)stars+=v;
    return {name:this.state.name,cleared:R.cleared,stars,bests,total,at};
  }
  get name(){return this.state.name;}
  setName(v){const n=cleanName(v);this.state.name=n;this.dirty=true;this.save();return n;}
  get friends(){return this.state.friends;}
  // En väns profil (från en utmaningslänk). Returnerar {friend,isNew} eller null om profilen inte var godtagbar.
  addFriend(profile){const r=mergeFriend(this.state.friends,profile);if(!r.friend)return null;this.state.friends=r.list;this.dirty=true;this.save();return {friend:r.friend,isNew:r.isNew};}
  removeFriend(id){const n=this.state.friends.length;this.state.friends=this.state.friends.filter(f=>f.id!==id);if(this.state.friends.length!==n){this.dirty=true;this.save();return true;}return false;}
  setWeather(level){if(!WEATHER_ORDER.includes(level))return false;this.state.opts.weather=level;this.dirty=true;this.save();return true;}
  get weather(){return this.state.opts.weather;}
  get introDone(){return !!this.state.intro.done;}
  title(){return titleFor(this.state.totals.points);}
  reset(){this.state=blankSave();this.save();}
}
