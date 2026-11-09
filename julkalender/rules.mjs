// Julkalenderns regler: datum, luckor som öppnas, och avläsning av vad spelaren gjort i Karlstad City.
// Ren logik utan DOM, så att allt går att testa. Kalendern ÄNDRAR ALDRIG spelets sparfiler: allt som börjar med
// "karlstad:" läses bara. Kalenderns egna framsteg ligger i en egen nyckel (STORAGE_KEY).
// Allt som läser lagring är fail-soft: saknas nyckeln, är den trasig eller kastar lagringen så räknas det som "ingenting gjort".
export const SEASON=Object.freeze({year:2026,first:'2026-12-01',last:'2026-12-24'});
export const STORAGE_KEY='julspelet:2026:v1';
export const TEST_KEY='julspelet:2026:test';

// Spelets sparnycklar (playcanvas-karlstad-2.11). tests/doors.test.mjs kontrollerar att de fortfarande finns i spelets källkod.
export const GAME_KEYS=Object.freeze({
  missions:'karlstad:missions:2',   // {sista-rundan:true, fikapanik:true, radda-fikat:true, sandgrund:true}
  rush:'karlstad:rush:best:1',      // Zombiejaktens rekord (poäng), sparas när man tar sig till tryggzonen
  tempo:'karlstad:tempo:1',         // Temporush: {level,score,picked,runs}, bästa värden
  trail:'karlstad:trail:best',      // Termosrundans rekord (poäng)
  boat:'karlstad:boat:best:1',      // Båtbussens räddningstur: bästa poäng
  fun:'karlstad:fun:1',             // Fikaalbum, märken, statistik ({stats:{thermos,rides,...}, badges:[...], collected:[...], bestChain})
  places:'karlstad:places:1',       // Karlstadpasset: {places:{cervera:{completed,stamped},...}}
  dailyPrefix:'karlstad:daily:'     // Dagens Karlstad: karlstad:daily:<regler>:<yyyy-mm-dd> = {best,attempts,wins}
});
// Mått som räknas upp över tid (nya sedan kalendern började följa spelaren). Namnen är kalenderns egna.
export const METRICS=Object.freeze(['thermos','rides','quizCorrect','quizPerfect','treasures','flashDone','powerups','turboMeters','checkins','mall','marieberg']);
export const RECORDS=Object.freeze(['rush','boat','trail','tempoLevel','tempoScore','chain']);

// ── Datum ────────────────────────────────────────────────────────────────────────────────────────────────────
const pad=n=>String(n).padStart(2,'0');
const WEEKDAYS=['söndag','måndag','tisdag','onsdag','torsdag','fredag','lördag'];
const MONTHS=['jan','feb','mars','apr','maj','juni','juli','aug','sep','okt','nov','dec'];
// Dagens datum i Karlstad (Europe/Stockholm). Luckorna byter alltid dag vid svensk midnatt, oavsett var telefonen står.
export function stockholmDay(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const get=t=>parts.find(p=>p.type===t).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }catch{return date.toISOString().slice(0,10);}
}
export function validDay(day){
  if(typeof day!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(day))return false;
  const d=new Date(day+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day;
}
export const doorDay=(n,year=SEASON.year)=>`${year}-12-${pad(n)}`;
export const daysBetween=(from,to)=>Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);
export const weekdayOf=day=>WEEKDAYS[new Date(day+'T12:00:00Z').getUTCDay()];
export const shortDate=day=>`${Number(day.slice(8,10))} ${MONTHS[Number(day.slice(5,7))-1]}`;
// De fyra söndagarna före jul (första advent först). 2026: 29 nov, 6, 13 och 20 dec.
export function adventSundays(year=SEASON.year){
  const xmas=new Date(Date.UTC(year,11,25,12)),back=xmas.getUTCDay()===0?7:xmas.getUTCDay();
  return [3,2,1,0].map(i=>{const d=new Date(xmas);d.setUTCDate(25-back-7*i);return d.toISOString().slice(0,10);});
}
// Vilken dag kalendern ska räkna som "idag". ?datum=2026-12-10 eller ?dag=10 simulerar en dag (för förhandsvisning och test).
export function resolveToday(now=new Date(),search=''){
  const q=new URLSearchParams(search||''),datum=q.get('datum'),dag=q.get('dag');
  if(datum&&validDay(datum))return {day:datum,simulated:true};
  if(/^\d{1,2}$/.test(dag||'')&&Number(dag)>=1&&Number(dag)<=24)return {day:doorDay(Number(dag)),simulated:true};
  return {day:stockholmDay(now),simulated:false};
}
export const phaseOf=(day,season=SEASON)=>day<season.first?'before':day>season.last?'after':'during';
// Testläget öppnar alla luckor för förhandsvisning. Slås på med ?test (och ?test=0 stänger av), och kommer ihåg valet.
export function testModeFrom(search='',storage=null){
  const q=new URLSearchParams(search||'');
  if(q.has('test')){const on=q.get('test')!=='0';try{if(on)storage?.setItem(TEST_KEY,'1');else storage?.removeItem(TEST_KEY);}catch{}return on;}
  try{return storage?.getItem(TEST_KEY)==='1';}catch{return false;}
}
// Är lucka n öppningsbar? Alla luckor öppnas på sin dag och står sedan öppna. Testläget öppnar alla.
export function doorAccess(n,today,test=false){
  const opens=doorDay(n);
  return {open:test||today>=opens,today:today===opens,opens,daysLeft:Math.max(0,daysBetween(today,opens))};
}

// ── Avläsning av spelets sparfiler (skrivskyddad) ────────────────────────────────────────────────────────
const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const obj=v=>isObj(v)?v:{};
const num=(v,max=1e9)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):0;
function getRaw(storage,key){try{return storage?.getItem(key)??null;}catch{return null;}}
function getJson(storage,key){try{const raw=getRaw(storage,key);return raw==null?null:JSON.parse(raw);}catch{return null;}}
function keysOf(storage){
  try{const out=[];for(let i=0;i<(storage?.length||0);i++){const k=storage.key(i);if(typeof k==='string')out.push(k);}return out;}catch{return [];}
}
export function readGame(storage){
  const missions=obj(getJson(storage,GAME_KEYS.missions)),fun=obj(getJson(storage,GAME_KEYS.fun)),stats=obj(fun.stats),tempo=obj(getJson(storage,GAME_KEYS.tempo));
  const places=obj(obj(getJson(storage,GAME_KEYS.places)).places),collected=Array.isArray(fun.collected)?fun.collected.map(String):[];
  const stamps=Object.entries(places).filter(([id,r])=>/^[a-z][a-z0-9-]{1,30}$/.test(id)&&isObj(r)&&num(r.stamped,9e15)>0&&num(r.completed,9e15)>0).map(([id])=>id);
  const dailyWins=[];
  for(const key of keysOf(storage)){
    const m=key.startsWith(GAME_KEYS.dailyPrefix)&&key.match(/(\d{4}-\d{2}-\d{2})$/);
    if(m&&validDay(m[1])&&num(obj(getJson(storage,key)).wins)>0)dailyWins.push(m[1]);
  }
  const area=re=>collected.filter(id=>re.test(id)).length;
  const metrics={
    thermos:num(stats.thermos),rides:num(stats.rides),quizCorrect:num(stats.quizCorrect),quizPerfect:num(stats.quizPerfect),treasures:num(stats.treasures),
    flashDone:num(stats.flashDone),powerups:num(stats.powerups),turboMeters:num(stats.turboMeters),checkins:num(stats.checkins),
    mall:area(/^(fx-)?mall-/),marieberg:area(/^(fx-)?marieberg-/)
  };
  return {
    missions:Object.fromEntries(Object.entries(missions).filter(([,v])=>v===true)),
    records:{rush:num(getRaw(storage,GAME_KEYS.rush),999999),boat:num(getRaw(storage,GAME_KEYS.boat),999999),trail:num(getRaw(storage,GAME_KEYS.trail),999999),
      tempoLevel:num(tempo.level,12),tempoScore:num(tempo.score),chain:num(fun.bestChain,9999)},
    badges:Array.isArray(fun.badges)?fun.badges.map(String):[],stamps,dailyWins,metrics
  };
}
export const emptyGame=()=>readGame(null);

// Utvärderar ett villkor mot det spelaren gjort. Returnerar {done,have,need}; 'all' lägger till parts, 'manual' markeras med manual:true.
//   mission  uppdrag klarat (alla gånger, även före kalendern)       record   rekord ≥ min (alla gånger)
//   stamp    stämpel i Karlstadpasset                                badge    märke i Fikaalbumet
//   count    nya sedan kalendern började följa spelaren (mått − baslinje)
//   daily    vunna Dagens Karlstad från och med 1 december           all      alla delvillkor
//   manual   inget som går att läsa av: spelaren markerar själv
export function evaluate(check,game,baseline={},season=SEASON){
  const g=game||emptyGame();
  switch(check?.kind){
    case 'mission':{const done=!!g.missions[check.id];return {done,have:done?1:0,need:1};}
    case 'record':{const raw=g.records[check.src]||0;return {done:raw>=check.min,have:Math.min(raw,check.min),need:check.min,raw};}
    case 'stamp':{const done=g.stamps.includes(check.id);return {done,have:done?1:0,need:1};}
    case 'badge':{const done=g.badges.includes(check.id);return {done,have:done?1:0,need:1};}
    case 'count':{const raw=Math.max(0,(g.metrics[check.metric]||0)-(baseline[check.metric]||0));return {done:raw>=check.n,have:Math.min(raw,check.n),need:check.n,raw};}
    case 'daily':{const raw=g.dailyWins.filter(d=>d>=season.first).length;return {done:raw>=check.n,have:Math.min(raw,check.n),need:check.n,raw};}
    case 'all':{
      const parts=check.of.map(c=>({...evaluate(c,g,baseline,season),label:c.label||''}));
      return {done:parts.every(p=>p.done),have:parts.filter(p=>p.done).length,need:parts.length,parts};
    }
    default:return {done:false,have:0,need:1,manual:true};
  }
}
export const hasAutoCheck=check=>!!check&&check.kind!=='manual';

// ── Titlar ───────────────────────────────────────────────────────────────────────────────────────────────
// Stjärnor ger titlar. Högsta titeln kräver alla stjärnor (kontrolleras i testerna).
export const RANKS=Object.freeze([
  {min:0,name:'Julnisse'},{min:6,name:'Pepparkaksbagare'},{min:14,name:'Tomtens hjälpreda'},
  {min:24,name:'Julklappsjägare'},{min:34,name:'Granmästare'},{min:46,name:'Karlstads tomte'}
]);
export function rankFor(stars,ranks=RANKS){
  let i=0;for(let k=0;k<ranks.length;k++)if(stars>=ranks[k].min)i=k;
  return {...ranks[i],index:i,next:ranks[i+1]||null};
}

// ── Kalenderns tillstånd ─────────────────────────────────────────────────────────────────────────────────
const blank=()=>({version:1,baseline:null,opened:{},done:{}});
const validN=n=>Number.isInteger(n)&&n>=1&&n<=24;
export class Julkalender{
  constructor({doors,storage=null,key=STORAGE_KEY}={}){
    this.doors=doors;this.byN=new Map(doors.map(d=>[d.n,d]));this.storage=storage;this.key=key;this.state=blank();this.load();
  }
  load(){
    const v=getJson(this.storage,this.key);if(!isObj(v)||v.version!==1)return;
    const s=blank();
    if(isObj(v.baseline)){s.baseline={};for(const m of METRICS)s.baseline[m]=num(v.baseline[m]);}
    for(const [k,val] of Object.entries(obj(v.opened))){const n=Number(k);if(validN(n)&&this.byN.has(n)&&val===true)s.opened[n]=true;}
    for(const [k,val] of Object.entries(obj(v.done))){
      const n=Number(k);if(!validN(n)||!this.byN.has(n)||!isObj(val))continue;
      s.done[n]={at:validDay(val.at)?val.at:'',how:val.how==='manual'?'manual':'auto'};s.opened[n]=true;
    }
    this.state=s;
  }
  save(){try{this.storage?.setItem(this.key,JSON.stringify(this.state));}catch{}}
  door(n){return this.byN.get(n)||null;}
  isDone(n){return !!this.state.done[n];}
  isOpened(n){return !!this.state.opened[n];}
  how(n){return this.state.done[n]?.how||null;}
  get baseline(){return this.state.baseline||{};}
  get doneCount(){return Object.keys(this.state.done).length;}
  get stars(){return this.doors.reduce((sum,d)=>sum+(this.isDone(d.n)?d.stjarnor:0),0);}
  get totalStars(){return this.doors.reduce((sum,d)=>sum+d.stjarnor,0);}
  get rank(){return rankFor(this.stars);}
  // Spelarens ögonblicksbild av det som räknas mot luckan (för "3 av 5").
  progress(n,game){const d=this.door(n);return d?evaluate(d.check,game,this.baseline):null;}
  open(n){if(!this.byN.has(n)||this.state.opened[n])return false;this.state.opened[n]=true;this.save();return true;}
  // Själv-markering: för uppdrag som spelet inte sparar (och som reserv om en avläsning misslyckas). Går att ångra.
  markManual(n,day=''){
    if(!this.byN.has(n)||this.state.done[n])return false;
    this.state.done[n]={at:validDay(day)?day:'',how:'manual'};this.state.opened[n]=true;this.save();return true;
  }
  unmarkManual(n){if(this.state.done[n]?.how!=='manual')return false;delete this.state.done[n];this.save();return true;}
  // Läs av spelet och bocka av de luckor som är öppna och uppfyllda. Returnerar nummer som blev klara nu.
  // Baslinjen (mått vid första besöket) hålls aldrig över nuvarande värde, så att en nollställd spelsparning inte blockerar framsteg.
  refresh(game,{day='',isOpen=()=>true}={}){
    const g=game||emptyGame(),before=JSON.stringify(this.state.baseline),base=this.state.baseline||{},next={};
    for(const m of METRICS)next[m]=this.state.baseline?Math.min(base[m]||0,g.metrics[m]||0):(g.metrics[m]||0);
    this.state.baseline=next;
    const newly=[];
    for(const d of this.doors){
      if(this.isDone(d.n)||!isOpen(d.n)||!hasAutoCheck(d.check))continue;
      if(evaluate(d.check,g,next).done){this.state.done[d.n]={at:validDay(day)?day:'',how:'auto'};this.state.opened[d.n]=true;newly.push(d.n);}
    }
    if(newly.length||before!==JSON.stringify(next))this.save();
    return newly;
  }
  reset(){this.state=blank();this.save();}
}
