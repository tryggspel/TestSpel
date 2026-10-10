// JulRushen: de tolv rusherna (nivåerna) och det som kommer efter dem. Ren modul (ingen DOM, ingen PlayCanvas).
//
// Varje rush har ett fast tempo (TempoRuns nivå 1–12 används som rushens nummer: fart, poäng, banans täthet och fångstfält följer nivån), ett mål och tre hjärtan.
// Tempot stiger från rush till rush, och klockan till nästa paket blir trängre för varje rush (PRESSURE här under), så det blir svårare för varje rush man klarar i rad.
// Målet är antingen ett antal paket eller en poängsumma (varannan rush av varje sort). Stjärnor = hjärtan som är kvar när målet nås (1–3). En rush låses upp när den förra är klarad.
// "NÄSTA RUSH" tar med sig hjärtana: ett hjärta fylls på bara om man klarade rushen utan att tappa något. Efter Rush 12 fortsätter det som ÖVERTID (Rush 13, 14 …): samma tempo
// som Rush 12 men allt trängre klocka och längre mål, så långt man orkar. Rush 13 och uppåt har inga fasta namn eller stjärnor på rutorna: bara hur långt man kommit räknas.
import {TEMPO,tempoSpeed,tempoPoints} from '../tempo-run.mjs?v=2.21.1-xmas.6';

export const RUSH_COUNT=12;                             // de namngivna rusherna
export const RUSH_MAX=99;                               // högsta rush som räknas (Rush 13 och uppåt är ÖVERTID)
const NAMES=Object.freeze(['JULMYS','PEPPARKAKA','GLÖGGFART','SNÖYRA','SLÄDFART','ISRASERI','RENRACE','NORDPOLEN','JULSTRESS','SNÖSTORM','PAKETVIRVEL','TOMTEGALET']);
const BLURBS=Object.freeze([
  'Lugn start. Lär dig banan och pilen.','Lite fortare. Börja plocka i kedjor.','Glöggen värmer. Tempot sitter i benen.','Nu gäller det att hålla kedjan.',
  'Släden tar fart. Följ pilen och släpp inte klockan.','Hala gator och snabba svängar.','Renarna rusar. Gåvorna gör skillnad.','Långt norrut och långt mellan paketen.',
  'Julstressen är här. Varje svängning räknas.','Snön yr och klockan tickar.','Paketen virvlar förbi. Ta dem som kommer.','Tomtegalet: det snabbaste tempot. Lycka till!'
]);
const OVERTIME_BLURB='Övertid: samma fart som Tomtegalet, men klockan blir trängre för varje rush. Hur långt kommer du?';

// ── Klockan ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Grundspelets klocka (deadlineFor) räknar på 85 % av gångfarten plus en stor marginal, och turbon (×2) ligger ovanpå: en perfekt spelare behövde ungefär en sekund per paket
// men fick 6–16 sekunder. I JulRushen är klockan i stället (minsta möjliga tid) × k + marginal, där minsta möjliga tid är sträckan som återstår efter fångstfältet i full fart med turbon
// på (rushen slår på turbon själv), och både k och marginalen sjunker från Rush 1 till Rush 12 och vidare i ÖVERTID. Siffrorna är provade mot simulerade spelare (tools/xmas-flow/difficulty.mjs).
export const PRESSURE={                                // (inte fryst: svårighetsprovet tools/xmas-flow/difficulty.mjs provar andra värden)
  turbo:2,                         // turbon räknas in i den högsta farten
  // klockan = minsta tid × k + marginal. k och marginalen närmar sig sina golv (kInf, slackInf) för varje rush: k(n) = kInf + kAmp × decay^(n−1)
  kInf:1,kAmp:1.9,slackInf:.1,slackAmp:1.1,decay:.74,
  grace:3,                         // första paketet i en rush: så här mycket extra tid så att man hinner titta sig omkring
  min:.8                           // klockan blir aldrig kortare än så
};
export const pressureK=p=>PRESSURE.kInf+PRESSURE.kAmp*Math.pow(PRESSURE.decay,Math.max(1,Number(p)||1)-1);
export const pressureSlack=p=>PRESSURE.slackInf+PRESSURE.slackAmp*Math.pow(PRESSURE.decay,Math.max(1,Number(p)||1)-1);
// Tiden (sekunder) till nästa paket. distance: meter från spelaren till paketet, level: tempo (1–12), pressure: rushens nummer (eller tempo i Maraton), reach: fångstfältet i meter.
export function clockFor(distance,{level=1,pressure=1,reach=4,first=false}={}){
  const lv=Math.max(1,Math.min(TEMPO.levels,Math.floor(Number(level))||1)),top=TEMPO.baseSpeed*tempoSpeed(lv)*PRESSURE.turbo;
  const need=Math.max(0,(Number.isFinite(distance)?distance:0)-(Number.isFinite(reach)?reach:0))/top;
  return Math.max(PRESSURE.min,need*pressureK(pressure)+pressureSlack(pressure))+(first?PRESSURE.grace:0);
}

// ── Målen ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Paketmålet växer med två och ett halvt för varje rush (25 i Rush 1, 52 i Rush 12) och därefter med fyra. Poängmålet i en jämn rush är räknat så att det kräver ungefär lika mycket spel som
// en paketrush (fyra paket färre): i spelet ger ett paket i snitt ungefär 68 gånger tempots poängfaktor, eftersom de flesta paketen tas i en kedja (×2–×4 efter fyra, åtta och tolv i rad)
// och med flytbonus, gåvor och sidopaket ovanpå (uppmätt med tools/xmas-flow/difficulty.mjs). Jämna femtiotal.
const roundTo=(v,m)=>Math.round(v/m)*m;
export const packagesGoal=n=>n<=RUSH_COUNT?Math.round(22+2.5*n):Math.min(120,52+4*(n-RUSH_COUNT));
const perPackage=n=>Math.round(68*tempoPoints(Math.min(n,TEMPO.levels)));
export const pointsGoal=n=>roundTo((packagesGoal(n)-4)*perPackage(n),50);

function make(n){
  const named=n<=RUSH_COUNT,tempo=Math.min(TEMPO.levels,n),byPackages=n%2===1;
  return Object.freeze({n,name:named?NAMES[n-1]:'ÖVERTID '+(n-RUSH_COUNT),tempo,blurb:named?BLURBS[n-1]:OVERTIME_BLURB,speed:+tempoSpeed(tempo).toFixed(2),mult:+tempoPoints(tempo).toFixed(1),
    pressure:n,overtime:!named,goal:Object.freeze(byPackages?{kind:'packages',target:packagesGoal(n)}:{kind:'points',target:pointsGoal(n)})});
}
export const RUSHES=Object.freeze(Array.from({length:RUSH_COUNT},(_,i)=>make(i+1)));
const more=new Map();
// Rush n (1–99). Rush 13 och uppåt skapas när de behövs.
export function rushDef(n){
  n=Math.floor(Number(n))||0;if(n<1||n>RUSH_MAX)return null;
  if(n<=RUSH_COUNT)return RUSHES[n-1];
  let d=more.get(n);if(!d){d=make(n);more.set(n,d);}
  return d;
}
const sv=v=>Math.round(v).toLocaleString('sv-SE');
export const goalText=def=>def?(def.goal.kind==='packages'?'HÄMTA '+def.goal.target+' PAKET':'NÅ '+sv(def.goal.target)+' POÄNG'):'';
// Hur långt man kommit mot målet. values: {picked, score} (TempoRuns räknare).
export function goalProgress(def,{picked=0,score=0}={}){
  if(!def)return null;
  const value=def.goal.kind==='packages'?picked:score,target=def.goal.target;
  return {kind:def.goal.kind,target,value,done:value>=target,ratio:Math.max(0,Math.min(1,value/target)),
    text:def.goal.kind==='packages'?Math.min(value,target)+'/'+target+' PAKET':sv(Math.min(value,target))+'/'+sv(target)+' P'};
}
// Stjärnor: hjärtan kvar när målet nåddes (alltid minst en, aldrig fler än tre).
export const starsFor=hearts=>Math.max(1,Math.min(TEMPO.lives,Math.floor(Number(hearts))||1));
export const starText=stars=>'★'.repeat(Math.max(0,Math.min(3,stars)))+'☆'.repeat(3-Math.max(0,Math.min(3,stars)));
// Framsteg (från sparningen): {cleared:högsta klarade rush, stars:{n:stjärnor}}. Efter Rush 12 går det vidare (ÖVERTID) tills RUSH_MAX.
export const nextRush=progress=>Math.min(RUSH_MAX,Math.max(0,Math.floor(Number(progress?.cleared)||0))+1);
export const isUnlocked=(progress,n)=>Number.isInteger(n)&&n>=1&&n<=nextRush(progress);
// Stjärnorna räknas bara för de tolv namngivna rusherna.
export const totalStars=progress=>Object.entries(progress?.stars||{}).reduce((s,[n,v])=>s+(Number(n)<=RUSH_COUNT?(Number(v)||0):0),0);
// Hjärtan in i nästa rush i en serie: klarade man rushen utan att tappa ett hjärta fylls ett på (högst tre), annars tar man med sig det man hade kvar (minst ett).
// left: hjärtan kvar, start: hjärtan man började rushen med.
export const SERIES_HEART_BONUS=1;
export function seriesHearts(left,start=TEMPO.lives){
  const l=Math.max(0,Math.floor(Number(left))||0),s=Math.max(1,Math.floor(Number(start))||TEMPO.lives);
  return Math.max(1,Math.min(TEMPO.lives,l>=s?l+SERIES_HEART_BONUS:l));
}
