// Julkalenderns regler: datum, luckor som öppnas, och avläsning av vad spelaren gjort i Julklappsjakten (Julspelet).
// Ren logik utan DOM, så att allt går att testa. Kalendern ÄNDRAR ALDRIG Julspelets sparning: den läser bara julspelets egen sparnyckel
// (SAVE_KEY, se xmas/xmas-save.mjs). Kalenderns egna framsteg ligger i en annan nyckel (STORAGE_KEY).
// Allt som läser lagring är fail-soft: saknas nyckeln, är den trasig eller kastar lagringen så räknas det som "ingenting gjort".
// Avläsningen kräver att kalendern ligger på samma adress som Julspelet (localStorage är per adress): det gör den, i mappen julkalender/.
export const SEASON=Object.freeze({year:2026,first:'2026-12-01',last:'2026-12-24'});
export const STORAGE_KEY='julspelet:2026:v1';
export const TEST_KEY='julspelet:2026:test';

// Julspelets sparning (karlstad-xmas:save:1). tests/julkalender-doors.test.mjs kontrollerar att nyckeln och formatet fortfarande stämmer med xmas/xmas-save.mjs.
//   stamps {id: tid}                         julstämplar (xmas-config STAMPS)
//   rush {cleared, stars:{n}, best:{n:{points,...}}}   JulRushens nivåer (n = 1–99; 13 och uppåt är ÖVERTID)
//   zombies {cleared, best:{n}}              Tomtezombies-nivåer
//   records {id:{points,level,...}}          rekord per uppdrag, och 'julrush' = Maraton (level = tempo)
//   totals {packages, bonus, points, runs}   summor över alla avslutade rundor
//   name                                     smeknamnet på topplistan
export const GAME_SAVE_KEY='karlstad-xmas:save:1';
// Mått som räknas upp över tid (nya sedan kalendern började följa spelaren). Namnen är kalenderns egna.
export const METRICS=Object.freeze(['packages','bonus','points','runs']);

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

// ── Avläsning av Julspelets sparning (skrivskyddad) ──────────────────────────────────────────────────────
const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const obj=v=>isObj(v)?v:{};
const num=(v,max=1e9)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):0;
function getRaw(storage,key){try{return storage?.getItem(key)??null;}catch{return null;}}
function getJson(storage,key){try{const raw=getRaw(storage,key);return raw==null?null:JSON.parse(raw);}catch{return null;}}
// Samma regler som spelets egen sanering (sanitizeSave i xmas/xmas-save.mjs): en klarad nivå kan inte vara låst, och stämpeln i Tomtezombies räknas som nivå 1.
export function readGame(storage){
  const raw=obj(getJson(storage,GAME_SAVE_KEY)),ok=raw.v===1,r=ok?obj(raw.rush):{},z=ok?obj(raw.zombies):{},t=ok?obj(raw.totals):{};
  const stamps=ok?Object.keys(obj(raw.stamps)).filter(id=>/^[a-z][a-z0-9-]{1,30}$/.test(id)&&num(raw.stamps[id],4102444800000)>0):[];
  const levels=(src,max)=>{
    const best={};for(const [k,b] of Object.entries(obj(src.best))){const n=Number(k);if(Number.isInteger(n)&&n>=1&&n<=max&&isObj(b)&&num(b.points)>0)best[n]=Math.floor(num(b.points));}
    return {best,cleared:Math.max(Math.floor(num(src.cleared,max)),...Object.keys(best).map(Number),0)};
  };
  const rush=levels(r,99),zombies=levels(z,99);
  if(stamps.includes('zombies'))zombies.cleared=Math.max(zombies.cleared,1);
  const stars={};for(const [k,v] of Object.entries(obj(r.stars))){const n=Number(k);if(Number.isInteger(n)&&n>=1&&n<=99&&num(v,3)>0)stars[n]=Math.floor(num(v,3));}
  const julrush=obj(obj(raw.records).julrush);
  return {
    stamps,rush:{cleared:rush.cleared,best:rush.best,stars},zombies,
    marathon:{level:Math.floor(num(julrush.level,999)),points:Math.floor(num(julrush.points,9999999))},
    totals:{packages:Math.floor(num(t.packages,9999999)),bonus:Math.floor(num(t.bonus,9999999)),points:Math.floor(num(t.points,99999999)),runs:Math.floor(num(t.runs,9999999))},
    name:ok&&typeof raw.name==='string'?raw.name.trim().slice(0,12):''
  };
}
export const emptyGame=()=>readGame(null);
// Mått (kalenderns namn) ur en avläsning.
export const metricsOf=g=>({packages:g.totals.packages,bonus:g.totals.bonus,points:g.totals.points,runs:g.totals.runs});

// Utvärderar ett villkor mot det spelaren gjort. Returnerar {done,have,need}; 'all' lägger till parts, 'manual' markeras med manual:true.
// Det som spelaren redan klarat i Julspelet räknas (stämplar, nivåer, rekord, titlar). Räknare mäts i stället som NYA sedan kalendern började följa spelaren.
//   stamp    julstämpel (id)                       stamps   minst n julstämplar
//   rush     JulRushen: rush n klarad (n ≥ 13 är ÖVERTID)   rushPoints  bästa poäng i rush n ≥ min     rushStars  minst min stjärnor i någon rush
//   marathon Maraton: tempo ≥ min                  zombies  Tomtezombies: nivå n klarad
//   points   julpoäng totalt (titlarna) ≥ min      count    nya sedan kalendern började (mått − baslinje)
//   name     smeknamn valt på topplistan           all      alla delvillkor        manual   inget som går att läsa av: spelaren markerar själv
export function evaluate(check,game,baseline={}){
  const g=game||emptyGame(),cap=(have,need)=>Math.min(have,need);
  switch(check?.kind){
    case 'stamp':{const done=g.stamps.includes(check.id);return {done,have:done?1:0,need:1};}
    case 'stamps':return {done:g.stamps.length>=check.n,have:cap(g.stamps.length,check.n),need:check.n,raw:g.stamps.length};
    case 'rush':return {done:g.rush.cleared>=check.n,have:cap(g.rush.cleared,check.n),need:check.n,raw:g.rush.cleared};
    case 'rushPoints':{const raw=g.rush.best[check.n]||0;return {done:raw>=check.min,have:cap(raw,check.min),need:check.min,raw};}
    case 'rushStars':{const raw=Math.max(0,...Object.values(g.rush.stars));return {done:raw>=check.min,have:cap(raw,check.min),need:check.min,raw};}
    case 'marathon':return {done:g.marathon.level>=check.min,have:cap(g.marathon.level,check.min),need:check.min,raw:g.marathon.level};
    case 'zombies':return {done:g.zombies.cleared>=check.n,have:cap(g.zombies.cleared,check.n),need:check.n,raw:g.zombies.cleared};
    case 'points':return {done:g.totals.points>=check.min,have:cap(g.totals.points,check.min),need:check.min,raw:g.totals.points};
    case 'count':{const raw=Math.max(0,(metricsOf(g)[check.metric]||0)-(baseline[check.metric]||0));return {done:raw>=check.n,have:cap(raw,check.n),need:check.n,raw};}
    case 'name':{const done=g.name.length>0;return {done,have:done?1:0,need:1};}
    case 'all':{
      const parts=check.of.map(c=>({...evaluate(c,g,baseline),label:c.label||''}));
      return {done:parts.every(p=>p.done),have:parts.filter(p=>p.done).length,need:parts.length,parts};
    }
    default:return {done:false,have:0,need:1,manual:true};
  }
}
export const hasAutoCheck=check=>!!check&&check.kind!=='manual';

// ── Titlar ───────────────────────────────────────────────────────────────────────────────────────────────
// Stjärnor ger titlar. Högsta titeln kräver alla stjärnor (kontrolleras i testerna).
export const RANKS=Object.freeze([
  {min:0,name:'Julnisse'},{min:6,name:'Pepparkaksbagare'},{min:15,name:'Tomtens hjälpreda'},
  {min:27,name:'Julklappsjägare'},{min:40,name:'Granmästare'},{min:51,name:'Karlstads tomte'}
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
    const now=metricsOf(g);for(const m of METRICS)next[m]=this.state.baseline?Math.min(base[m]||0,now[m]||0):(now[m]||0);
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
