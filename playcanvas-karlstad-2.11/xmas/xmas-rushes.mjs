// JulRushen: de tolv rusherna (nivåerna). Ren modul (ingen DOM, ingen PlayCanvas).
//
// Varje rush har ett fast tempo (TempoRuns nivå 1–12 används som rushens nummer: fart, poäng, klocka, banans täthet och fångstfält följer nivån), ett mål och tre hjärtan.
// Tempot stiger från rush till rush, så det blir svårare för varje rush man klarar i rad. Målet är antingen ett antal paket eller en poängsumma (varannan rush av varje sort).
// Stjärnor = hjärtan som är kvar när målet nås (1–3). En rush låses upp när den förra är klarad. "NÄSTA RUSH" tar med sig hjärtana (och ger ett nytt hjärta om det saknas något),
// så att en lång serie blir svår: klarar man rusher i rad utan att tappa hjärtan håller man tempot, annars tar de slut.
import {TEMPO,tempoSpeed,tempoPoints} from '../tempo-run.mjs?v=2.21.1-xmas.3';
import {PACKAGE_POINTS} from './xmas-config.mjs?v=2.21.1-xmas.3';

export const RUSH_COUNT=12;
export const SERIES_HEART_BONUS=1;                      // så många hjärtan får man tillbaka när man går vidare till nästa rush i en serie (högst TEMPO.lives)
const NAMES=Object.freeze(['JULMYS','PEPPARKAKA','GLÖGGFART','SNÖYRA','SLÄDFART','ISRASERI','RENRACE','NORDPOLEN','JULSTRESS','SNÖSTORM','PAKETVIRVEL','TOMTEGALET']);
const BLURBS=Object.freeze([
  'Lugn start. Lär dig banan och pilen.','Lite fortare. Börja plocka i kedjor.','Glöggen värmer. Tempot sitter i benen.','Nu gäller det att hålla kedjan.',
  'Släden tar fart. Följ pilen och släpp inte klockan.','Hala gator och snabba svängar.','Renarna rusar. Gåvorna gör skillnad.','Långt norrut och långt mellan paketen.',
  'Julstressen är här. Varje svängning räknas.','Snön yr och klockan tickar.','Paketen virvlar förbi. Ta dem som kommer.','Tomtegalet: det snabbaste tempot. Lycka till!'
]);
// Paketmålet växer med en var annan rush (13, 14, 15 … 18). Poängmålet i en jämn rush är lika många paket minus ett, räknat med kedja ×2 och flytbonus på rushens tempo:
// det kräver alltså ungefär lika mycket spel som en paketrush, men ger utrymme för gåvor och sidopaket. Jämna 50-tal.
const roundTo=(v,m)=>Math.round(v/m)*m;
const perPackage=n=>Math.round(2*PACKAGE_POINTS.regular*tempoPoints(n))+TEMPO.flowBonus*n;
export const packagesGoal=n=>12+Math.ceil(n/2);
export const pointsGoal=n=>roundTo((packagesGoal(n)-1)*perPackage(n),50);

export const RUSHES=Object.freeze(Array.from({length:RUSH_COUNT},(_,i)=>{
  const n=i+1,byPackages=n%2===1;
  return Object.freeze({n,name:NAMES[i],tempo:n,blurb:BLURBS[i],speed:+tempoSpeed(n).toFixed(2),mult:+tempoPoints(n).toFixed(1),
    goal:Object.freeze(byPackages?{kind:'packages',target:packagesGoal(n)}:{kind:'points',target:pointsGoal(n)})});
}));
export const rushDef=n=>RUSHES[(Math.floor(Number(n))||0)-1]||null;
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
// Framsteg (från sparningen): {cleared:högsta klarade rush, stars:{n:stjärnor}}.
export const nextRush=progress=>Math.min(RUSH_COUNT,Math.max(0,Math.floor(Number(progress?.cleared)||0))+1);
export const isUnlocked=(progress,n)=>Number.isInteger(n)&&n>=1&&n<=nextRush(progress);
export const totalStars=progress=>Object.values(progress?.stars||{}).reduce((s,v)=>s+(Number(v)||0),0);
// Hjärtan in i nästa rush i en serie: det man hade kvar plus ett, högst tre.
export const seriesHearts=left=>Math.max(1,Math.min(TEMPO.lives,(Math.floor(Number(left))||0)+SERIES_HEART_BONUS));
