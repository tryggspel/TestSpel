// O'Learys i julbygget (2.21.1-xmas.14): reglerna för aktiviteterna och FBK-tipset. Ren modul: ingen DOM, ingen spelmotor.
// Spelet påstår inget samarbete med O'Learys eller Färjestad BK. Tipset är på skoj: inga pengar, inga priser, och tipspoängen ger varken XP eller lotter
// (så att tipset aldrig kan bli ett vad om något av värde, till exempel dragningen om julgranen).
export const OL_KEY='karlstad-xmas:olearys:1';
export const ACTIVITIES=Object.freeze([
  {id:'bowling',name:'BOWLING',short:'Bowling',text:'Fem rutor. Dra bollen bakåt, sikta och släpp. Strike och spärr räknas som vanligt.'},
  {id:'shuffle',name:'SHUFFLEBOARD',short:'Shuffleboard',text:'Fyra puckar var mot bartendern. Den som har puck längst fram får poäng för alla sina som ligger före motståndarens bästa.'},
  {id:'biljard',name:'BILJARD',short:'Biljard',text:'Sänk sex bollar på så få stötar som möjligt. Dra bakåt från den vita bollen för att sikta och ta i.'},
  {id:'dart',name:'DART',short:'Dart',text:'Nio pilar. Siktet gungar: tryck när det ligger där du vill träffa.'},
  {id:'straff',name:'STRAFFAR',short:'Straffar',text:'Fem straffar mot målvakten. Dra från pucken mot målet och släpp.'}
].map(a=>Object.freeze(a)));
export const activity=id=>ACTIVITIES.find(a=>a.id===id)||null;

// ── Bowling: fem rutor ──────────────────────────────────────────────────────────────────────────────────────────────
export const BOWL_FRAMES=5;
// rolls: antal fällda käglor per slag. Returnerar {frames:[{rolls,score|null}], total, done, maxSoFar}. Sista rutan: strike eller spärr ger extra slag (som tionde rutan i vanlig bowling).
export function bowlingScore(rolls,frames=BOWL_FRAMES){
  const r=rolls.map(n=>Math.max(0,Math.min(10,Math.floor(Number(n)||0))));
  const out=[];let i=0,total=0;
  for(let f=0;f<frames;f++){
    const last=f===frames-1;
    if(i>=r.length){out.push({rolls:[],score:null});continue;}
    if(!last){
      if(r[i]===10){const b=r[i+1],c=r[i+2];const sc=b!=null&&c!=null?10+b+c:null;if(sc!=null)total+=sc;out.push({rolls:[10],strike:true,score:sc!=null?total:null});i+=1;continue;}
      const a=r[i],b=r[i+1];
      if(b==null){out.push({rolls:[a],score:null});i+=1;continue;}
      if(a+b===10){const c=r[i+2];const sc=c!=null?10+c:null;if(sc!=null)total+=sc;out.push({rolls:[a,b],spare:true,score:sc!=null?total:null});}
      else{total+=a+b;out.push({rolls:[a,b],score:total});}
      i+=2;continue;
    }
    // sista rutan: upp till tre slag
    const a=r[i],b=r[i+1],c=r[i+2],rolls3=[a,b,c].filter(x=>x!=null);
    const needThird=a===10||(b!=null&&a+b===10);
    const complete=b!=null&&(!needThird||c!=null);
    if(complete){total+=a+b+(needThird?c:0);out.push({rolls:rolls3,score:total,strike:a===10,spare:a!==10&&a+b===10});}
    else out.push({rolls:rolls3,score:null});
    i+=rolls3.length;
  }
  const done=out.length===frames&&out.every(f=>f.score!=null);
  return {frames:out,total,done};
}
// Hur många käglor står kvar inför nästa slag (10 i början av en ruta).
export function pinsStanding(rolls,frames=BOWL_FRAMES){
  let i=0,f=0;const r=rolls;
  while(f<frames-1&&i<r.length){if(r[i]===10){i++;f++;continue;}if(i+1<r.length){i+=2;f++;continue;}return 10-r[i];}
  if(f<frames-1)return 10;
  const t=r.slice(i);
  if(t.length===0)return 10;
  if(t.length===1)return t[0]===10?10:10-t[0];
  if(t.length===2){if(t[0]===10)return t[1]===10?10:10-t[1];return t[0]+t[1]===10?10:0;}
  return 0;
}

// ── Dart ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const DART_ORDER=Object.freeze([20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5]);
// Poäng för en träff: x, y i tavlans radie (1 = ytterkanten av dubbelringen), y uppåt. Riktiga proportioner (mm/170).
export function dartScore(x,y){
  const r=Math.hypot(x,y);
  if(r<=6.35/170)return {score:50,label:'BULL'};
  if(r<=15.9/170)return {score:25,label:'25'};
  if(r>1)return {score:0,label:'MISS'};
  let a=Math.atan2(x,y)*180/Math.PI;if(a<0)a+=360; // 0 = rakt upp, medurs
  const seg=DART_ORDER[Math.floor(((a+9)%360)/18)];
  if(r>=162/170)return {score:seg*2,label:'D'+seg};
  if(r>=99/170&&r<=107/170)return {score:seg*3,label:'T'+seg};
  return {score:seg,label:String(seg)};
}

// ── Shuffleboard ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Bordet: puckens läge längs bordet t (0 = startlinjen, 1 = bortre kanten). Zonerna: 1 (från ZONES[0]), 2, 3 och hängare (4) ytterst; utanför bordet = 0.
export const SHUFFLE=Object.freeze({zones:Object.freeze([.62,.78,.9,.985]),pucks:4});
export function shuffleZone(t){const Z=SHUFFLE.zones;if(!(t>=0)||t>1)return 0;return t>=Z[3]?4:t>=Z[2]?3:t>=Z[1]?2:t>=Z[0]?1:0;}
// pucks: [{who:'p'|'c', t, on:true|false}]. Den som har pucken längst fram får poäng för alla sina puckar som ligger före motståndarens bästa.
export function shuffleScore(pucks){
  const live=pucks.filter(p=>p.on&&p.t>=0&&p.t<=1);
  const best=who=>live.filter(p=>p.who===who).reduce((m,p)=>Math.max(m,p.t),-1);
  const bp=best('p'),bc=best('c');if(bp<0&&bc<0)return {p:0,c:0,leader:null};
  const leader=bp>bc?'p':'c',other=leader==='p'?bc:bp;
  const pts=live.filter(p=>p.who===leader&&p.t>other).reduce((s,p)=>s+shuffleZone(p.t),0);
  return {p:leader==='p'?pts:0,c:leader==='c'?pts:0,leader};
}

// ── Femkampen ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// Varje gren ger 0–100 poäng. raw: bowling (0–150), shuffle {p,c} (poäng och motståndarens), biljard {shots, potted, of}, dart (0–540), straff {goals, of}.
export function pentaPoints(id,raw){
  const c=v=>Math.max(0,Math.min(100,Math.round(v)));
  switch(id){
    case 'bowling':return c(raw/120*100);                                   // 120 av 150 är ett mycket bra resultat i fem rutor
    case 'shuffle':return c(raw.p*12+(raw.p>raw.c?30:0));                   // poäng och vinst
    case 'biljard':return raw.potted<raw.of?c(raw.potted/raw.of*50):c(100-(raw.shots-raw.of)*8);
    case 'dart':return c(raw/300*100);                                      // 300 med nio pilar är riktigt bra
    case 'straff':return c(raw.goals/raw.of*100);
    default:return 0;
  }
}

// ── FBK-tipset ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const TIP_POINTS=Object.freeze({outcome:3,exact:5});
export const outcomeOf=(h,a)=>h>a?'1':h<a?'2':'X';
// En match är öppen för tips fram till nedsläpp. start: 'YYYY-MM-DDTHH:MM' i svensk tid.
export function matchStart(m){
  const [d,t]=m.start.split('T');const [Y,M,D]=d.split('-').map(Number);const [h,mi]=t.split(':').map(Number);
  // svensk tid i december = UTC+1
  return Date.UTC(Y,M-1,D,h-1,mi);
}
export const tipOpen=(m,now=Date.now())=>now<matchStart(m);
// Poäng för ett tips: {pick:'1'|'X'|'2', home?, away?} mot resultatet {home, away}. null om resultatet inte är känt.
export function tipPoints(tip,result){
  if(!tip||!result||!Number.isFinite(result.home)||!Number.isFinite(result.away))return null;
  const o=outcomeOf(result.home,result.away);let p=0;
  if(tip.pick===o)p+=TIP_POINTS.outcome;
  if(Number.isFinite(tip.home)&&Number.isFinite(tip.away)&&tip.home===result.home&&tip.away===result.away)p+=TIP_POINTS.exact;
  return p;
}

// ── Sparningen (egen nyckel, så att julspelets och framstegens sparningar inte berörs) ─────────────────────────────────
const num=(v,max)=>{const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.min(max,Math.floor(n))):0;};
const DAY=/^20\d{2}-\d{2}-\d{2}$/;
export const blankOlearys=()=>({v:1,visits:0,best:{},plays:{},penta:{best:0,day:'',dayBest:0,runs:0},tips:{}});
export function sanitizeOlearys(raw){
  const out=blankOlearys();if(!raw||typeof raw!=='object'||raw.v!==1)return out;
  out.visits=num(raw.visits,999999);
  for(const a of ACTIVITIES){out.best[a.id]=num(raw.best?.[a.id],9999);out.plays[a.id]=num(raw.plays?.[a.id],999999);}
  const p=raw.penta||{};out.penta={best:num(p.best,500),day:DAY.test(p.day||'')?p.day:'',dayBest:num(p.dayBest,500),runs:num(p.runs,999999)};
  if(raw.tips&&typeof raw.tips==='object')for(const [id,t] of Object.entries(raw.tips).slice(0,80)){
    if(!/^[a-z0-9-]{1,40}$/.test(id)||!t||typeof t!=='object'||!['1','X','2'].includes(t.pick))continue;
    const h=Number.isFinite(Number(t.home))&&t.home!==null&&t.home!==''?num(t.home,20):null,a=Number.isFinite(Number(t.away))&&t.away!==null&&t.away!==''?num(t.away,20):null;
    out.tips[id]={pick:t.pick,home:h,away:a,at:num(t.at,4102444800000)};
  }
  return out;
}
// Bästa resultat i en gren (högre är bättre, utom biljard där färre stötar är bättre: där sparas femkampspoängen).
export function recordActivity(state,id,points){
  if(!activity(id))return false;const p=Math.max(0,Math.floor(points));state.plays[id]=(state.plays[id]||0)+1;
  if(p>(state.best[id]||0)){state.best[id]=p;return true;}return false;
}
export function recordPenta(state,total,day){
  const t=Math.max(0,Math.min(500,Math.floor(total)));state.penta.runs++;
  if(state.penta.day!==day){state.penta.day=day;state.penta.dayBest=0;}
  const dayBest=t>state.penta.dayBest,record=t>state.penta.best;
  if(dayBest)state.penta.dayBest=t;if(record)state.penta.best=t;
  return {dayBest,record};
}
// Summan av tipspoängen och hur många tips som är avgjorda.
export function tipTotals(tips,matches){
  let points=0,settled=0,right=0;
  for(const m of matches){const t=tips[m.id];if(!t||!m.result)continue;const p=tipPoints(t,m.result);if(p==null)continue;settled++;points+=p;if(p>0)right++;}
  return {points,settled,right};
}
