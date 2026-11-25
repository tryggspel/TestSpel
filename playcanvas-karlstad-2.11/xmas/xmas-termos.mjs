// Termosjakten (2.21.1-xmas.13): julbyggets huvudspår. TempoRush med julens termosar: samma bana, klocka, tempo och julgåvor som JulRushens maraton (xmas-rush.mjs),
// men med termosar i stället för paket och egna rekord. Obegränsat antal rundor varje dag. Varje dag har ett eget dagsmål (samma för alla, efter datum) som ger en belöning en gång per dag.
// Varje termos man plockar räknas till insamlingen på Stora Torget (räkneverket i insamlingsbåset): ett lekfullt mått på hur mycket man spelat, inga pengar och ingen verklig insamling.
// Ren modul: ingen DOM, ingen spelmotor.
export const TERMOS=Object.freeze({
  id:'termos',title:'TERMOSJAKTEN',
  item:'termos',items:'termosar',
  minToSave:1,          // en runda utan en enda termos sparas inte
  boardSize:5,          // dagens fem bästa rundor visas på menyn
  goalXp:60,            // dagsmålet: XP en gång per dag (och en prydnad, se xmas-meta.mjs onTermosGoal)
  stampTempo:5          // julstämpeln TERMOSJAKTEN delas ut första gången man når tempo 5
});
// Tempo 1–12 i Termosjakten (två nivåer per namn, som i grundspelet).
export const TERMOS_NAMES=Object.freeze(['','KAFFEPAUS','KAFFEPAUS','FIKAFART','FIKAFART','GLÖGGRUSH','GLÖGGRUSH','SLÄDFART','SLÄDFART','JULSTRESS','JULSTRESS','TERMOSMÄSTARE','TERMOSMÄSTARE']);
export const termosName=level=>TERMOS_NAMES[Math.max(1,Math.min(12,Math.floor(level)||1))];

// Dagsmålen: ett per dag efter datum (alla spelare har samma mål samma dag). kind: thermos (termosar i en runda) | tempo (nått tempo) | chain (bästa kedja) | points | gold (gyllene termosar) | runs (rundor i dag).
export const DAILY_GOALS=Object.freeze([
  {id:'t30',text:'Plocka 30 termosar i en runda',kind:'thermos',target:30},
  {id:'tempo5',text:'Nå tempo 5',kind:'tempo',target:5},
  {id:'kedja12',text:'Få en kedja på 12',kind:'chain',target:12},
  {id:'gold3',text:'Plocka 3 gyllene termosar i en runda',kind:'gold',target:3},
  {id:'p4000',text:'Få 4 000 poäng i en runda',kind:'points',target:4000},
  {id:'t45',text:'Plocka 45 termosar i en runda',kind:'thermos',target:45},
  {id:'tempo6',text:'Nå tempo 6',kind:'tempo',target:6},
  {id:'runs3',text:'Spela 3 rundor i dag',kind:'runs',target:3},
  {id:'kedja18',text:'Få en kedja på 18',kind:'chain',target:18},
  {id:'p7000',text:'Få 7 000 poäng i en runda',kind:'points',target:7000}
].map(g=>Object.freeze(g)));
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
const DAY=/^20\d{2}-\d{2}-\d{2}$/;
// Dagens mål (day = 'YYYY-MM-DD', svensk kalenderdag). Två dagar i rad har aldrig samma mål.
export function goalFor(day){
  if(!DAY.test(day||''))return DAILY_GOALS[0];
  const n=DAILY_GOALS.length,i=fnv('termosmal|'+day)%n,prev=new Date(Date.parse(day+'T12:00:00Z')-864e5).toISOString().slice(0,10),j=fnv('termosmal|'+prev)%n;
  return DAILY_GOALS[i===j?(i+1)%n:i];
}
// Hur långt en runda (och dagens rundor) kommit mot målet: {value, target, done}.
export function goalProgress(goal,run={},day={}){
  const v=goal.kind==='thermos'?run.thermos:goal.kind==='tempo'?run.tempo:goal.kind==='chain'?run.chain:goal.kind==='points'?run.points:goal.kind==='gold'?run.gold:goal.kind==='runs'?day.runs:0;
  const value=Math.max(0,Math.floor(Number(v)||0));return {value,target:goal.target,done:value>=goal.target};
}

// ── Sparningen (en del av julspelets sparning, xmas-save.mjs) ──────────────────────────────────────────────────────────────────
const num=(v,max,fallback=0)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):fallback;
const runOf=r=>({points:num(r.points,9999999),thermos:num(r.thermos,9999),tempo:num(r.tempo,99),chain:num(r.chain,9999),gold:num(r.gold,999),seconds:num(r.seconds,99999),at:num(r.at,4102444800000)});
export const blankTermos=()=>({best:null,total:0,runs:0,gold:0,bestTempo:0,day:{key:'',runs:0,thermos:0,top:[],goal:false}});
export function sanitizeTermos(raw){
  const out=blankTermos();if(!raw||typeof raw!=='object')return out;
  if(raw.best&&typeof raw.best==='object'&&num(raw.best.points,9999999)>0)out.best=runOf(raw.best);
  out.total=num(raw.total,99999999);out.runs=num(raw.runs,9999999);out.gold=num(raw.gold,9999999);out.bestTempo=num(raw.bestTempo,99);
  const d=raw.day&&typeof raw.day==='object'?raw.day:{};
  if(typeof d.key==='string'&&DAY.test(d.key)){
    out.day.key=d.key;out.day.runs=num(d.runs,9999);out.day.thermos=num(d.thermos,999999);out.day.goal=!!d.goal;
    if(Array.isArray(d.top))out.day.top=d.top.filter(x=>x&&typeof x==='object'&&num(x.points,9999999)>0).map(runOf).sort((a,b)=>b.points-a.points).slice(0,TERMOS.boardSize);
  }
  return out;
}
// Dagens del börjar om när datumet byts (rekordet och summorna ligger kvar).
export function termosToday(state,day){return state.day.key===day?state.day:{key:day,runs:0,thermos:0,top:[],goal:false};}
// En avslutad runda. run: {points, thermos, tempo, chain, gold, seconds}. Returnerar vad som hände, eller null om rundan inte sparas (inga termosar).
// state ändras på plats.
export function recordTermos(state,run,day,at=Date.now()){
  const r=runOf({...run,at});if(r.thermos<TERMOS.minToSave)return null;
  const prevBest=state.best?{...state.best}:null;
  const d=termosToday(state,day);state.day=d;
  const dayBestBefore=d.top[0]?.points||0;
  d.runs=Math.min(9999,d.runs+1);d.thermos=Math.min(999999,d.thermos+r.thermos);
  d.top=[...d.top,r].sort((a,b)=>b.points-a.points).slice(0,TERMOS.boardSize);
  const place=d.top.indexOf(r)+1; // 0 = utanför dagens topp fem
  state.total=Math.min(99999999,state.total+r.thermos);state.runs=Math.min(9999999,state.runs+1);state.gold=Math.min(9999999,state.gold+r.gold);
  const record=!prevBest||r.points>prevBest.points;if(record)state.best=r;
  const tempoRecord=r.tempo>state.bestTempo;if(tempoRecord)state.bestTempo=r.tempo;
  const goal=goalFor(day),prog=goalProgress(goal,r,d),goalNow=prog.done&&!d.goal;if(goalNow)d.goal=true;
  return {record,prevBest,dayBest:r.points>dayBestBefore,dayBestBefore,place,goal,goalProgress:prog,goalDone:d.goal,goalNow,tempoRecord,total:state.total,dayRuns:d.runs,dayThermos:d.thermos};
}
