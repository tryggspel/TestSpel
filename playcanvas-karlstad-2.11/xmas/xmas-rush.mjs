// JulRushen: Julklappsjaktens version av TempoRush. Ren modul (ingen DOM, ingen PlayCanvas) så att reglerna går att köra i test.
//
// Samma spelidé som TempoRush i grundspelet, och samma motor under huven:
//  - banan: ett pärlband av paket längs långa, fria gatusträckor (journey.supplyTempo, planHeading, scanRay …) som läggs ut framför spelaren
//  - klockan (TempoRun): nytt tempo var 15:e sekund (fart och poäng stiger), tre liv, och en tid till nästa paket som blir kortare för varje nivå
//  - pilen och fångstfältet: tempoReach(nivå) och catchReach(fart), samma fria sikt som termosar i 2.20.0
// Det som är jul: paketen, de guldiga paketen som bär en julgåva (i stället för grundspelets förmågor), julkedjan (COMBO) och egna nivånamn.
// Två sätt att spela: en av tolv rusher (fast tempo, ett mål och tre hjärtan; start({def}) med en post ur xmas-rushes.mjs) eller Maraton (start() utan def): tempot stiger var 15:e
// sekund tills man är ute, precis som TempoRush. Nåd målet i en rush vinner man (stjärnor = hjärtan kvar) och nästa rush låses upp.
// Gåvorna: elva sorter (renssläde, magnet, tomtespöke, stjärna, klocka, paus, guldklapp, tomtebloss, sköld, kryddbomb, paketregn). Var tredje till var fjärde paket på banan
// bär en gåva, och vid sidan av banan ligger valfria sidopaket (alltid med gåva) som kräver en avstickare: de räknas inte mot målet och kostar ingen tid om man hoppar över dem.
// Ingenting här ändrar grundspelets regler: allt sker via journey-objektets egna funktioner, och den här klassen skriver aldrig i journey.events,
// så grundspelets tempo-hanterare (som talar om termosar) körs aldrig i julbygget.
import {TEMPO,tempoPoints,tempoSpeed} from '../tempo-run.mjs?v=2.21.1-xmas.5';
import {catchReach,tempoReach,TEMPO_COURSE} from '../journey-rules.mjs?v=2.21.1-xmas.5';
import {POWER,powerFor} from '../powerups.mjs?v=2.21.1-xmas.5';
import {PACKAGE_POINTS,COMBO,comboMult} from './xmas-config.mjs?v=2.21.1-xmas.5';
import {RUSH_COUNT,RUSH_MAX,PRESSURE,clockFor,goalProgress,starsFor,seriesHearts} from './xmas-rushes.mjs?v=2.21.1-xmas.5';

export const RUSH=Object.freeze({
  id:'julrush',
  stampLevel:5,        // julstämpeln delas ut första gången man når tempo 5
  starReach:2,         // JULSTJÄRNAN: fångstfältet växer så här många meter
  starMult:2,goldenMult:3,
  marathonRate:1.25,   // Maraton: tempot stiger var 12:e sekund (15 / 1,25) i stället för var 15:e, och fortsätter efter tempo 12 med en trängre klocka
  clockSeconds:5,      // JULKLOCKAN
  shieldSeconds:3,     // PEPPARKAKSSKÖLDEN: så här lång extra tid när den räddar ett liv
  shieldMax:2,
  urgent:.3,           // klockan är "brådskande" när mindre än så här av tiden är kvar
  minPicksToSave:1,    // en körning utan ett enda paket sparas inte
  titleShare:.1,       // mot titlarna (NYFIKEN … ÖVERTOMTE) räknas en tiondel av poängen: tempofaktorerna gör en rush ungefär tio gånger större än en jakt
  speedCap:4,                                           // allt som ökar farten (renssläde, glögg, raket, medvind, skridskor) multiplicerat får aldrig bli mer än så här många gånger
  boost:Object.freeze({glogg:1.5,kaka:3,wind:1.3,skates:1.25}), // fartgåvornas faktorer (renslädens ×2 är grundspelets raketförmåga)
  windReach:2,skatesWindow:1.5,                         // MEDVIND: fångstfältet växer så här många meter. SKRIDSKOR: kedjans fönster blir så här många sekunder längre
  extraBearer:.1,      // utöver grundspelets förmågebärare (var sjätte pärla och 5,6 % av resten) bär var tionde vanlig pärla också en gåva
  sideEvery:4,sideMax:5,sideOffsets:Object.freeze([7.5,6,9,10.5]),sideLife:40, // sidopaket: var fjärde pärla får ett sidopaket 6–10,5 m åt sidan, högst fem åt gången, borta efter 40 s
  magnetReach:13,pullSeconds:.28,                       // JULMAGNETEN: paket inom 13 m med fri sikt dras in till spelaren på en kvarts sekund
  ghostRange:46,ghostFly:.42,ghostEvery:.8,             // TOMTESPÖKET: flyger till närmaste paket (högst 46 m bort) var 0,8:e sekund
  bombRadius:24,bombMax:14,                             // KRYDDBOMBEN: alla paket inom 24 m, högst 14
  rainCount:8,rainLife:12,rainMin:5,rainMax:13          // PAKETREGNET: åtta extra paket 5–13 m runt spelaren, borta efter 12 s
});

// Tempo 1–12, två nivåer per namn (som i grundspelet).
export const RUSH_NAMES=Object.freeze(['','JULMYS','JULMYS','GLÖGGFART','GLÖGGFART','SLÄDFART','SLÄDFART','RENRACE','RENRACE','JULSTRESS','JULSTRESS','TOMTEGALET','TOMTEGALET']);
export const rushName=level=>RUSH_NAMES[Math.max(1,Math.min(TEMPO.levels,Math.floor(level)||1))];

// Julgåvorna ersätter grundspelets tolv förmågor. Var och en bär ett eget namn, en förklaring och hur länge den varar (0 = engångseffekt).
export const GIFTS=Object.freeze({
  sleigh:Object.freeze({label:'RENSLÄDEN',text:'Farten fördubblas. Spring!',seconds:7,color:'#ff6b4a',short:'SLÄDE'}),
  magnet:Object.freeze({label:'JULMAGNETEN',text:'Paketen dras in mot dig.',seconds:10,color:'#4ab3ff',short:'MAGNET'}),
  ghost:Object.freeze({label:'TOMTESPÖKET',text:'Ett vänligt spöke plockar paket åt dig.',seconds:9,color:'#e6e0ff',short:'SPÖKE'}),
  star:Object.freeze({label:'JULSTJÄRNAN',text:'Dubbla poäng och större fångstfält.',seconds:9,color:'#ffd23f',short:'STJÄRNA'}),
  clock:Object.freeze({label:'JULKLOCKAN',text:'+'+RUSH.clockSeconds+' sekunder till nästa paket.',seconds:0,color:'#ffa6e0',short:'KLOCKA'}),
  pause:Object.freeze({label:'GLÖGGPAUS',text:'Klockan står still.',seconds:7,color:'#9ad8ff',short:'PAUS'}),
  golden:Object.freeze({label:'GULDKLAPPEN',text:'Allt ger tre gånger så mycket.',seconds:20,color:'#fff3a6',short:'×3'}),
  sparkler:Object.freeze({label:'TOMTEBLOSS',text:'Tar alla paket i en rak linje framför dig.',seconds:0,color:'#ff9f5a',short:'BLOSS'}),
  shield:Object.freeze({label:'PEPPARKAKSSKÖLD',text:'Räddar ett liv nästa gång klockan går ut.',seconds:0,color:'#7be495',short:'SKÖLD'}),
  bomb:Object.freeze({label:'KRYDDBOMBEN',text:'Tar alla paket inom '+RUSH.bombRadius+' meter.',seconds:0,color:'#c28bff',short:'BOMB'}),
  rain:Object.freeze({label:'PAKETREGNET',text:RUSH.rainCount+' extra paket regnar ner runt dig. Plocka!',seconds:0,color:'#d1a373',short:'REGN'}),
  // Fler fartgåvor: fyra sista är olika sätt att springa fortare (glögg, raket, medvind, skridskor) och de kombineras med renssläden, dock aldrig över RUSH.speedCap tillsammans
  glogg:Object.freeze({label:'TURBOGLÖGG',text:'Varm glögg: farten ökar med hälften.',seconds:14,color:'#e0763a',short:'GLÖGG'}),
  kaka:Object.freeze({label:'PEPPARKAKSRAKETEN',text:'Raketfart! Tre gånger så fort en kort stund.',seconds:3.5,color:'#ff5a7a',short:'RAKET'}),
  wind:Object.freeze({label:'MEDVIND',text:'Medvind: snabbare, och paketen tas från längre håll.',seconds:20,color:'#7fe0d2',short:'VIND'}),
  skates:Object.freeze({label:'SKRIDSKOR',text:'Hala skridskor: snabbare, och kedjan håller längre.',seconds:25,color:'#b9dcff',short:'SKRIDSKOR'})
});
export const GIFT_KINDS=Object.freeze(Object.keys(GIFTS));
// Hur ofta varje gåva delas ut (summan är 33). Skölden är sällsynt: den är den enda som räddar ett liv.
const GIFT_WEIGHT=Object.freeze({sleigh:3,magnet:3,ghost:2,star:2,clock:3,pause:2,golden:2,sparkler:2,shield:1,bomb:2,rain:2,glogg:3,kaka:2,wind:2,skates:2});
const GIFT_BAG=Object.freeze(GIFT_KINDS.flatMap(k=>Array(GIFT_WEIGHT[k]).fill(k)));

const hash32=s=>{let h=2166136261>>>0;const t=String(s);for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};
// Samma id ger alltid samma gåva. Vilka paket som är guldiga avgörs av grundspelets powerFor (var sjätte pärla är alltid en förmågebärare) och av RUSH.extraBearer.
export const giftFor=id=>GIFT_BAG[hash32('julgava|'+id)%GIFT_BAG.length];
export const bearsGift=(id,day)=>!!powerFor(id,day)||hash32('jxb|'+id)%1000<RUSH.extraBearer*1000;

const clamp01=v=>Math.max(0,Math.min(1,v));

export class XmasRush{
  constructor({journey,save=null}={}){
    this.j=journey;this.save=save;this.events=[];this.state='idle'; // idle | starting | running | over
    this.pk=new Map();this.list=[];this.reset();
  }
  reset(){
    this.def=null;this.startHearts=TEMPO.lives;this.streak=0;this.extra=0;this.graced=false;
    this.timers={star:0,pause:0,golden:0,magnet:0,ghost:0,glogg:0,kaka:0,wind:0,skates:0};this.shield=0;this.pendingClock=0;
    this.chain=0;this.bestChain=0;this.lastPickAt=-1e9;this.time=0;this.golds=0;this.gifts=0;this.result=null;
    this.pk.clear();this.list.length=0;
    this.side=[];this.sideSeen=new Set();this.sideSerial=0;this.sideTaken=0;this.pulled=[];
    this.spirit={active:false,x:0,z:0,fx:0,fz:0,t:0,target:null,cool:0};
  }
  get tempo(){return this.j.tempo;}
  get running(){return this.state==='running';}
  // Vyn och pilen visar paket så länge en körning pågår (även den första bildrutan innan banan lagts ut).
  get active(){return this.state==='running'||this.state==='starting';}
  emit(e){this.events.push(e);}
  drain(){const out=this.events;this.events=[];return out;}

  // ── Start och slut ────────────────────────────────────────────────────────────────────────────────────────────────
  // Själva starten sker i första steget (begin), så att banan läggs ut från spelarens verkliga plats och riktning och inte från en gammal.
  // def: en rush ur RUSHES (fast tempo, mål) eller null för Maraton. hearts: hjärtan att börja med (en serie tar med sig dem). streak: rusher klarade i rad före den här.
  start({def=null,hearts=TEMPO.lives,streak=0}={}){
    this.cleanup();this.reset();this.state='starting';this.events.length=0;
    this.def=def||null;this.startHearts=Math.max(1,Math.min(TEMPO.lives,Math.floor(Number(hearts))||TEMPO.lives));this.streak=Math.max(0,Math.floor(Number(streak))||0);
    this.j.tempo.reset();
  }
  begin(){
    const j=this.j;
    try{j.fun?.power?.reset?.();}catch{}
    j.course=null;j.lastSupply=-99;j.lastAnchor=-99;
    j.tempo.start(); // nivå 1, tre liv. Händelserna den ger används inte: grundspelets tempohanterare ska inte köras.
    const t=j.tempo,def=this.def;
    if(def){t.level=def.tempo;t.levelClock=0;} // en rush har sitt eget tempo från första sekunden och behåller det
    t.lives=this.startHearts;
    this.installClock();
    this.state='running';
    this.emit({type:'rush-start',level:t.level,lives:t.lives,name:def?def.name:rushName(1),n:def?.n||0,goal:def?{...def.goal}:null,streak:this.streak});
  }
  // Tar bort allt paketbandet och nollställer grundspelets tempo och förmågor, så att inget ligger kvar när man går vidare till ett annat läge.
  cleanup(){
    const j=this.j;
    try{j.dropPearls?.(true);}catch{}
    j.course=null;
    for(const id of this.pk.keys())j.found.delete(id);
    this.pk.clear();this.list.length=0;this.side.length=0;this.sideSeen.clear();this.pulled.length=0;this.spirit.active=false;this.spirit.target=null;
    try{j.fun?.power?.reset?.();}catch{}
    if(j.tempo.state==='running')j.tempo.reset(); // gav man upp mitt i en körning: stäng av farten
    this.removeClock();
  }
  // ── Klockan till nästa paket ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  // Grundspelets tempo sätter en generös tid när ett mål väljs (deadlineFor). I JulRushen ersätts den av en trängre tid som beror på rushens nummer (se PRESSURE i xmas-rushes.mjs).
  // Det sker på journey-objektets egen tempoinstans, så grundspelets TempoRun-klass rörs inte; removeClock tar bort den igen när körningen är slut.
  installClock(){
    const t=this.j.tempo,proto=Object.getPrototypeOf(t);
    t.setTarget=(item,distance)=>{proto.setTarget.call(t,item,distance);this.retime(distance);};
    // Fartgåvorna går genom grundspelets egen fartfaktor (last-round.js turboFactor och spelarens rörelse läser power.speedMul()), på instansen, så att grundspelets klass inte rörs.
    const pw=this.j.fun?.power;
    if(pw&&!this.baseSpeedMul){const base=pw.speedMul.bind(pw);this.baseSpeedMul=base;pw.speedMul=()=>Math.min(RUSH.speedCap,base()*this.boostMul());}
  }
  removeClock(){
    delete this.j.tempo.setTarget;
    const pw=this.j.fun?.power;if(pw&&this.baseSpeedMul){delete pw.speedMul;this.baseSpeedMul=null;}
  }
  // Den starkaste av de aktiva fartgåvorna (glögg ×1,5, pepparkaksraket ×3, medvind ×1,3, skridskor ×1,25). Renslädens ×2 kommer från grundspelet och multipliceras på.
  boostMul(){
    let m=1;for(const k of Object.keys(RUSH.boost))if(this.timers[k]>0)m=Math.max(m,RUSH.boost[k]);
    return m;
  }
  chainWindow(){return COMBO.window+(this.timers.skates>0?RUSH.skatesWindow:0);}
  // Trycket: rushens nummer, eller i Maraton tempot (och därefter ett steg per tempohöjning som inte längre går att göra).
  pressure(){return this.def?this.def.pressure:this.j.tempo.level+this.extra;}
  retime(distance){
    const t=this.j.tempo;if(!t.target||!this.running&&this.state!=='starting')return;
    const level=t.level,reach=Math.max(tempoReach(level),catchReach(TEMPO.baseSpeed*tempoSpeed(level)*PRESSURE.turbo));
    const sec=clockFor(distance,{level,pressure:this.pressure(),reach,first:!this.graced});
    this.graced=true;t.deadline=t.left=sec;
  }
  // Avbryter (pausmenyn → julmenyn). En körning med minst ett paket sparas som en förlust; en utan paket sparas inte.
  quit(){
    if(this.state==='starting'){this.cleanup();this.state='idle';return null;}
    if(this.state!=='running')return null;
    const over=this.j.tempo.quit();
    return this.finish(over,{quit:true});
  }
  finish(over,{quit=false,win=false}={}){
    const t=this.j.tempo,picked=t.picked,level=t.level+(this.def?0:this.extra),score=t.score,seconds=Math.round(t.elapsed),hearts=Math.max(0,t.lives),def=this.def;
    this.state='over';
    const save=picked>=RUSH.minPicksToSave?this.save:null;
    let record=false,stamp=false,stampId=RUSH.id,rush=null;
    if(def){
      // En av tolv rusher: bara klarade rusher sparas (bästa poäng och stjärnor) och låser upp nästa. Streak = rusher klarade i rad (en serie).
      const prevBest=this.save?.state?.rush?.best?.[def.n],reachBefore=this.save?.state?.rush?.cleared||0,streak=win?this.streak+1:0,prog=win&&save?save.recordRush(def.n,{points:score,seconds,packages:picked,hearts,cleared:true}):null;
      record=!!prog?.record;
      if(win&&save){
        if(def.n>=RUSH.stampLevel&&save.stamp(RUSH.id)){stamp=true;stampId=RUSH.id;}
        if(def.n===RUSH_COUNT&&save.stamp('julrush-12')){stamp=true;stampId='julrush-12';}
        save.noteStreak(streak);
      }
      rush={n:def.n,name:def.name,tempo:def.tempo,goal:{...def.goal},cleared:!!win,stars:win?starsFor(hearts):0,hearts,streak,first:!!prog?.first,unlockedNext:!!prog?.unlocked,
        next:win&&def.n<RUSH_MAX?def.n+1:0,nextHearts:win?seriesHearts(hearts,this.startHearts):0,startHearts:this.startHearts,flawless:!!win&&hearts>=this.startHearts,done:win&&def.n===RUSH_COUNT,overtime:!!def.overtime,newReach:!!win&&def.n>reachBefore,bestBefore:prevBest?{...prevBest}:null};
    }else{
      record=save?save.record(RUSH.id,{points:score,seconds,packages:picked,bonus:this.golds,level}):false;
      stamp=save&&level>=RUSH.stampLevel?save.stamp(RUSH.id):false;
    }
    save?.addTotals({packages:picked,bonus:this.golds,points:Math.round(score*RUSH.titleShare)});
    const best=def?this.save?.state?.rush?.best?.[def.n]:this.save?.state?.records?.[RUSH.id];
    this.result={kind:'rush',id:RUSH.id,title:'JULRUSHEN',points:score,level,name:def?def.name:rushName(level),collected:picked,gold:this.golds,gifts:this.gifts,bestChain:this.bestChain,seconds,misses:t.misses,
      record:!!record,stamp:!!stamp,stampId,quit,best:best?{...best}:null,rush,sideTaken:this.sideTaken};
    this.cleanup();
    this.emit({type:'rush-over',result:this.result});
    return this.result;
  }

  // ── Ett steg: dt i speltid (sekunder), p = spelarens position, sweep = sträckan sedan förra steget, speed i m/s ──────────────────────
  step(dt,p,sweep=null,speed=0){
    if(!(dt>=0)||(this.state!=='starting'&&this.state!=='running'))return;
    if(this.state==='starting')this.begin();
    const j=this.j,t=j.tempo;
    this.time+=dt;
    this.tickPowers(dt);
    j.supplyTempo(dt,p);this.sync();this.supplySide(p);
    this.clock(dt);
    if(this.state!=='running')return;
    // Målet: nästa paket längs banan. Försvunnet eller taget mål byts, och ligger det för långt bort (man har lämnat banan) börjar banan om vid spelaren.
    const tg=t.target;if(tg&&(!j.itemById.has(tg.id)||j.found.has(tg.id)))t.needTarget=true;
    if(t.needTarget)this.aim(p);
    const t2=t.target;
    if(t2&&Math.hypot(t2.x-p.x,t2.z-p.z)>TEMPO_COURSE.maxGap&&j.elapsed-(j.lastAnchor||-99)>TEMPO_COURSE.reanchorEvery&&((p.y??1.68)-1.68)<.6){j.anchorCourse(p);this.sync();this.aim(p);}
    this.tickMagnet(dt,p);this.tickSpirit(dt,p);
    this.catchAll(p,sweep,speed);this.tickSide(p);
    if(this.state==='running'&&t.needTarget)this.aim(p);
    if(this.chain>0&&this.time-this.lastPickAt>this.chainWindow()){const lost=this.chain;this.chain=0;if(lost>=3)this.emit({type:'rush-chain-lost',chain:lost});}
  }
  // Välj nästa mål och lägg på den extra tid som en JULKLOCKA gav innan målet fanns.
  aim(p){
    const t=this.j.tempo;this.j.pickTempoTarget(p);
    if(this.pendingClock>0&&t.target){t.extend(this.pendingClock);this.pendingClock=0;}
  }
  tickPowers(dt){
    for(const k of Object.keys(this.timers))if(this.timers[k]>0)this.timers[k]=Math.max(0,this.timers[k]-dt);
    try{this.j.fun?.power?.tick(dt);}catch{}
  }
  // Klockan och nivåerna. Pepparkaksskölden räddar ett liv: i stället för att klockan går ut får man fem sekunder till.
  clock(dt){
    const t=this.j.tempo,frozen=this.timers.pause>0;
    if(this.shield>0&&t.target&&!frozen&&t.left-dt<=0){
      this.shield--;t.left=dt+RUSH.shieldSeconds;t.deadline+=RUSH.shieldSeconds;
      this.emit({type:'rush-shield',shield:this.shield,seconds:RUSH.shieldSeconds});
    }
    if(this.def)t.levelClock=0; // fast tempo: inga nivåhöjningar mitt i en rush
    else t.levelClock+=dt*(RUSH.marathonRate-1); // Maraton: tempot stiger snabbare än i grundspelet
    for(const e of t.tick(dt,{freeze:frozen})){
      if(e.type==='tempo-level')this.emit({type:'rush-level',level:e.level,name:rushName(e.level),speed:e.speed,mult:e.mult});
      else if(e.type==='tempo-miss'){this.chain=0;this.emit({type:'rush-miss',lives:e.lives});}
      else if(e.type==='tempo-over')this.finish(e);
    }
    // Maraton efter tempo 12: grundspelet höjer inte tempot mer, men klockan fortsätter bli trängre, ett steg per tempohöjning
    if(!this.def&&this.state==='running'&&t.level>=TEMPO.levels){
      const extra=Math.max(0,Math.floor(t.levelClock/TEMPO.levelSeconds));
      if(extra>this.extra){this.extra=extra;this.emit({type:'rush-level',level:TEMPO.levels+extra,name:rushName(TEMPO.levels),speed:tempoSpeed(TEMPO.levels),mult:tempoPoints(TEMPO.levels),extra:true});}
    }
  }

  // ── Paketen: ett omslag runt varje pärla, så att journey-objektens egna poster aldrig ändras ─────────────────────────────────────────
  wrap(it){
    const gift=bearsGift(it.id,this.j.fun?.day||'')?giftFor(it.id):null;
    return {id:it.id,x:it.x,z:it.z,vx:it.x,vz:it.z,y:it.y||0,kind:gift?'bonus':'regular',gift,cluster:it.course||0,pearl:it,collected:false,pull:0};
  }
  // Banans pärlor som journey fortfarande äger (itemById). Grundspelet rensar plockade pärlor ur itemById, items och found när fler än 90 ligger kvar
  // (pruneDynamic), men låter dem ligga kvar i course.pearls. Utan den här rensningen skulle en lång körning se gamla, redan plockade paket dyka upp
  // igen bakom spelaren, och ett gammalt paket kunde väljas till mål när inget nytt ligger framför.
  sync(){
    const j=this.j,c=j.course;
    if(c&&c.pearls.some(t=>!j.itemById.has(t.id)))c.pearls=c.pearls.filter(t=>j.itemById.has(t.id));
    const pearls=c?.pearls||[];
    this.list.length=0;
    for(const it of pearls){
      if(j.found.has(it.id))continue;
      let pk=this.pk.get(it.id);if(!pk){pk=this.wrap(it);this.pk.set(it.id,pk);}
      this.list.push(pk);
    }
    if(this.pk.size>pearls.length+10){const live=new Set(pearls.map(x=>x.id));for(const id of this.pk.keys())if(!live.has(id))this.pk.delete(id);}
  }

  // ── Fångst: samma fält och sikt som TempoRush (tempoReach, catchReach, fri sikt) ────────────────────────────────────────────────────
  catchAll(p,sweep,speed){
    const j=this.j,t=j.tempo;
    let reach=Math.max(catchReach(speed),tempoReach(t.level));if(this.timers.star>0)reach+=RUSH.starReach;if(this.timers.wind>0)reach+=RUSH.windReach;
    let taken=0;
    for(const pk of this.list){
      if(j.found.has(pk.id)||pk.pull>0||!j.inCatch(pk.pearl,p,reach,sweep))continue;
      this.take(pk,p);if(++taken>=4)break;
    }
    for(const pk of this.side){
      if(taken>=4)break;
      if(pk.collected||pk.pull>0||!j.inCatch(pk.pearl,p,reach,sweep))continue;
      this.take(pk,p);taken++;
    }
  }
  // Ett paket tas: kedja, poäng (nivåfaktor och flytbonus kommer från TempoRun) och eventuell gåva.
  take(pk,p,{blast=false,by=null}={}){
    const j=this.j,t=j.tempo;
    if(pk.collected||(!pk.side&&j.found.has(pk.id))||!t.running)return null;
    if(!pk.side){j.found.add(pk.id);j.foundAt?.set(pk.id,j.elapsed);}
    pk.collected=true;pk.pull=0;
    const gold=pk.kind==='bonus';
    this.chain=this.time-this.lastPickAt<=this.chainWindow()?this.chain+1:1;this.lastPickAt=this.time;this.bestChain=Math.max(this.bestChain,this.chain);
    const cm=comboMult(this.chain),pm=(this.timers.star>0?RUSH.starMult:1)*(this.timers.golden>0?RUSH.goldenMult:1);
    const base=(gold?PACKAGE_POINTS.bonus:PACKAGE_POINTS.regular*cm)*pm;
    const before=t.score;let pick;
    // Banans paket går genom TempoRushs klocka (tar bort målet, ger flytbonus och räknas mot målet). Sidopaket och regnpaket rör varken klockan eller målet: bara poäng, kedja och gåva.
    if(pk.side){pick={mult:tempoPoints(t.level),flow:false};t.score+=Math.round(base*pick.mult);this.sideTaken++;}
    else pick=t.pick(base);
    const tier=COMBO.tiers.find(x=>x.chain===this.chain);if(tier)t.score+=tier.bonus;
    if(gold)this.golds++;
    const e={type:'rush-pick',id:pk.id,x:pk.x,z:pk.z,kind:pk.kind,gold,side:!!pk.side,rain:!!pk.rain,points:t.score-before,chain:this.chain,mult:cm,pm,levelMult:pick.mult,flow:pick.flow,praise:tier?.praise||null,tierBonus:tier?.bonus||0,score:t.score,picked:t.picked,blast,by};
    this.emit(e);
    if(pk.gift)this.grant(pk.gift,p,{blast});
    if(this.def&&this.state==='running'&&goalProgress(this.def,{picked:t.picked,score:t.score}).done)this.win();
    return e;
  }
  // Målet nått: rushen är klarad. Tempot stängs av och resultatet byggs (stjärnor = hjärtan kvar).
  win(){
    if(this.state!=='running')return null;
    const over=this.j.tempo.quit();
    return this.finish(over,{win:true});
  }

  // ── Julgåvor ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  grant(kind,p,{blast=false}={}){
    const def=GIFTS[kind];if(!def)return 0;
    const j=this.j,t=j.tempo;let count=0;this.gifts++;
    if(kind==='sleigh')j.fun.power.grant('rocket'); // farten dubblas genom grundspelets egen raketförmåga (last-round.js turboFactor läser den)
    else if(kind==='glogg'||kind==='kaka'||kind==='wind'||kind==='skates')this.timers[kind]=Math.max(this.timers[kind],def.seconds);
    else if(kind==='star')this.timers.star=def.seconds;
    else if(kind==='pause')this.timers.pause=def.seconds;
    else if(kind==='golden')this.timers.golden=def.seconds;
    else if(kind==='magnet')this.timers.magnet=def.seconds;
    else if(kind==='ghost'){this.timers.ghost=def.seconds;this.spirit.active=true;this.spirit.x=p.x;this.spirit.z=p.z;this.spirit.target=null;this.spirit.cool=.25;}
    else if(kind==='shield')this.shield=Math.min(RUSH.shieldMax,this.shield+1);
    else if(kind==='clock'){if(t.target)t.extend(RUSH.clockSeconds);else this.pendingClock+=RUSH.clockSeconds;}
    else if(kind==='sparkler'&&!blast)count=this.sparkler(p);
    else if(kind==='bomb'&&!blast)count=this.bomb(p);
    else if(kind==='rain'&&!blast)count=this.rain(p);
    this.emit({type:'rush-gift',kind,label:def.label,text:def.text,seconds:def.seconds,count});
    return count;
  }
  // Tomtebloss: alla paket i en rak, smal linje framför spelaren (samma mått som grundspelets kanelstråle).
  sparkler(p){
    const j=this.j,f=j.lastForward||{x:0,z:-1},len=Math.hypot(f.x,f.z)||1,fx=f.x/len,fz=f.z/len,py=(p.y??1.68)-1.68;
    const hits=[];
    for(const pk of this.everything()){
      if(pk.collected||(!pk.side&&j.found.has(pk.id))||Math.abs(py-pk.y)>=1.5)continue;
      const dx=pk.x-p.x,dz=pk.z-p.z,along=dx*fx+dz*fz,side=Math.abs(dx*fz-dz*fx);
      if(along>0&&along<=POWER.stripLength&&side<=POWER.stripWidth)hits.push({pk,along});
    }
    hits.sort((a,b)=>a.along-b.along);hits.length=Math.min(hits.length,POWER.stripMax);
    for(const h of hits)this.take(h.pk,p,{blast:true,by:'sparkler'});
    return hits.length;
  }

  // Kryddbomben: alla paket inom bombRadius (banans och sidopaketen), närmast först, högst bombMax. Paketen i bomben ger sina gåvor men utlöser ingen ny bomb, bloss eller regn.
  bomb(p){
    const py=(p.y??1.68)-1.68,hits=[];
    for(const pk of this.everything()){
      if(pk.collected||Math.abs(py-pk.y)>=1.5)continue;
      const d=Math.hypot(pk.x-p.x,pk.z-p.z);if(d<=RUSH.bombRadius)hits.push({pk,d});
    }
    hits.sort((a,b)=>a.d-b.d);hits.length=Math.min(hits.length,RUSH.bombMax);
    for(const h of hits)this.take(h.pk,p,{blast:true,by:'bomb'});
    return hits.length;
  }
  // Paketregnet: extra paket (utan gåvor) på fria platser runt spelaren. De räknas inte mot målet och försvinner efter rainLife sekunder.
  rain(p){
    const j=this.j,n=RUSH.rainCount,serial=++this.sideSerial,made=[];
    for(let i=0;i<n;i++){
      const h=hash32('rain|'+serial+'|'+i),a0=(i/n+((h&255)/255)*.08)*Math.PI*2;
      let d=RUSH.rainMin+((h>>>8)%1000)/1000*(RUSH.rainMax-RUSH.rainMin);
      // trånga gator: prova andra vinklar (±0,4 rad) och kortare avstånd tills en fri plats hittas, men inte tätt intill ett annat regnpaket
      for(let tries=0;tries<8;tries++,d=Math.max(RUSH.rainMin*.6,d*.82)){
        const a=a0+[0,.4,-.4,.8,-.8][tries%5],x=+(p.x+Math.sin(a)*d).toFixed(1),z=+(p.z+Math.cos(a)*d).toFixed(1);
        if(!j.freeSpot(x,z)||!j.clearLine(p.x,p.z,x,z)||made.some(k=>Math.hypot(k.x-x,k.z-z)<2.2))continue;
        const id='rn:'+serial+':'+i;made.push({id,x,z,vx:x,vz:z,y:0,kind:'regular',gift:null,cluster:900+serial,side:true,rain:true,born:this.time,collected:false,pull:0,pearl:{id,x,z,y:0}});break;
      }
    }
    this.side.push(...made);return made.length;
  }
  // Sidopaket: var fjärde pärla på banan får ett paket med gåva en bit åt sidan (en avstickare). Platsen måste vara fri och ha fri sikt från banan.
  supplySide(p){
    const j=this.j,c=j.course;if(!c)return;
    for(const it of c.pearls){
      if(this.sideSeen.has(it.id))continue;this.sideSeen.add(it.id);
      if(!Number.isFinite(it.course)||it.course%RUSH.sideEvery!==RUSH.sideEvery-1||!Number.isFinite(it.hx)||!Number.isFinite(it.hz))continue;
      if(this.side.reduce((n,k)=>n+(k.rain||k.collected?0:1),0)>=RUSH.sideMax)continue;
      const sp=this.sidePlace(it);if(sp)this.side.push(sp);
    }
    if(this.sideSeen.size>400){const live=new Set(c.pearls.map(x=>x.id));for(const id of this.sideSeen)if(!live.has(id))this.sideSeen.delete(id);}
  }
  sidePlace(it){
    const j=this.j,h=hash32('sd|'+it.id),first=h&1?1:-1,nx=-it.hz,nz=it.hx;
    for(const off of RUSH.sideOffsets)for(const sg of [first,-first]){
      const x=+(it.x+nx*off*sg).toFixed(1),z=+(it.z+nz*off*sg).toFixed(1);
      if(!j.freeSpot(x,z)||!j.segmentFree(it.x,it.z,x,z))continue;
      const id='sd:'+it.id;
      return {id,x,z,vx:x,vz:z,y:0,kind:'bonus',gift:giftFor('sd|'+it.id),cluster:it.course,side:true,born:this.time,collected:false,pull:0,pearl:{id,x,z,y:0}};
    }
    return null;
  }
  // Tar bort tagna och gamla sidopaket och regnpaket (och de som ligger långt bakom).
  tickSide(p){
    if(!this.side.length)return;
    this.side=this.side.filter(k=>!k.collected&&this.time-k.born<(k.rain?RUSH.rainLife:RUSH.sideLife)&&Math.hypot(k.x-p.x,k.z-p.z)<150);
  }
  everything(){return this.side.length?this.list.concat(this.side):this.list;}
  // Julmagneten: paket inom magnetReach med fri sikt dras mot spelaren och tas när de kommit fram. Paket som redan dragits in når fram även om magneten hinner ta slut.
  tickMagnet(dt,p){
    const j=this.j,pulled=this.pulled;
    if(this.timers.magnet>0){
      const py=(p.y??1.68)-1.68;
      for(const pk of this.everything()){
        if(pk.collected||pk.pull>0||(!pk.side&&j.found.has(pk.id))||Math.abs(py-pk.y)>=1.5)continue;
        // grundspelets kaffemagnet tar paket genom väggar; julmagneten kräver fri sikt (paket flyger inte genom hus)
        if(Math.hypot(pk.x-p.x,pk.z-p.z)>=RUSH.magnetReach||!j.clearLine(p.x,p.z,pk.x,pk.z))continue;
        pk.pull=1e-4;pulled.push(pk);
      }
    }
    for(let i=pulled.length-1;i>=0;i--){
      const pk=pulled[i];if(!pk)continue; // listan töms när det sista paketet vinner rushen (cleanup) mitt i varvet
      if(pk.collected||(!pk.side&&j.found.has(pk.id))){pulled.splice(i,1);continue;}
      pk.pull+=dt/RUSH.pullSeconds;const k=Math.min(1,pk.pull),e=k*k*(3-2*k);
      pk.vx=pk.x+(p.x-pk.x)*e;pk.vz=pk.z+(p.z-pk.z)*e;
      if(k>=1){pulled.splice(i,1);this.take(pk,p,{by:'magnet'});if(this.state!=='running')break;}
    }
  }
  // Tomtespöket: svävar fram till närmaste paket (inom ghostRange från spelaren, helst framför) och tar det åt spelaren, ett paket var ghostEvery:e sekund.
  tickSpirit(dt,p){
    const sp=this.spirit,j=this.j;
    if(!(this.timers.ghost>0)){sp.active=false;sp.target=null;return;}
    if(!sp.active){sp.active=true;sp.x=p.x;sp.z=p.z;sp.target=null;sp.cool=.2;}
    if(sp.target){
      const pk=sp.target;
      if(pk.collected||(!pk.side&&j.found.has(pk.id))){sp.target=null;sp.cool=.1;return;}
      sp.t+=dt/RUSH.ghostFly;const k=Math.min(1,sp.t),e=k*k*(3-2*k);
      sp.x=sp.fx+(pk.x-sp.fx)*e;sp.z=sp.fz+(pk.z-sp.fz)*e;
      if(k>=1){sp.target=null;sp.cool=Math.max(.05,RUSH.ghostEvery-RUSH.ghostFly);this.take(pk,p,{by:'ghost'});}
      return;
    }
    sp.cool-=dt;if(sp.cool>0)return;
    const f=j.lastForward||{x:0,z:-1},fl=Math.hypot(f.x,f.z)||1,py=(p.y??1.68)-1.68;let best=null,bs=Infinity;
    for(const pk of this.everything()){
      if(pk.collected||pk.pull>0||Math.abs(py-pk.y)>=1.5)continue;
      const dx=pk.x-p.x,dz=pk.z-p.z,d=Math.hypot(dx,dz);if(d>RUSH.ghostRange)continue;
      const ahead=(dx*f.x+dz*f.z)/fl/(d||1),score=Math.hypot(pk.x-sp.x,pk.z-sp.z)*(ahead>-.2?1:2.2); // paket bakom spelaren väger tyngre
      if(score<bs){bs=score;best=pk;}
    }
    if(best){sp.target=best;sp.fx=sp.x;sp.fz=sp.z;sp.t=0;}else sp.cool=.25;
  }

  // ── Frågor från vyn, vägledningen och gränssnittet ──────────────────────────────────────────────────────────────────────────────────
  nearby(p,maxDist,limit,out=[]){
    out.length=0;if(!this.active)return out;
    for(const k of this.list){if(k.collected||this.j.found.has(k.id))continue;const d=Math.hypot(k.x-p.x,k.z-p.z);if(d<=maxDist){k._d=d;out.push(k);}}
    for(const k of this.side){if(k.collected)continue;const d=Math.hypot(k.x-p.x,k.z-p.z);if(d<=maxDist){k._d=d;out.push(k);}}
    out.sort((a,b)=>a._d-b._d);if(out.length>limit)out.length=limit;return out;
  }
  // Guldpaketen (de som bär en gåva) inom räckvidd, för ljusstrålarna.
  giftPackages(p,maxDist,limit,out=[]){
    out.length=0;if(!this.active)return out;
    for(const k of this.everything()){if(k.kind!=='bonus'||k.collected||(!k.side&&this.j.found.has(k.id)))continue;const d=Math.hypot(k.x-p.x,k.z-p.z);if(d<maxDist){k._d=d;out.push(k);}}
    out.sort((a,b)=>a._d-b._d);if(out.length>limit)out.length=limit;return out;
  }
  targetPackage(){const id=this.j.tempo.target?.id;return id?this.pk.get(id)||null:null;}
  target(p){
    const tg=this.j.tempo.target;if(!this.running||!tg)return null;
    const pk=this.pk.get(tg.id);
    return {x:tg.x,z:tg.z,id:tg.id,kind:pk?.kind==='bonus'?'bonus':'regular',gift:pk?.gift||null,label:pk?.kind==='bonus'?'GULDPAKET':'NÄSTA PAKET',distance:Math.hypot(tg.x-p.x,tg.z-p.z)};
  }
  // För grundspelets vägledning på marken (ledpilar): bara när nästa paket ligger en bit bort.
  objective(p){
    const t=this.target(p);if(!t)return null;
    return t.distance>16?{x:t.x,z:t.z,id:t.id,kind:'xmas',label:t.label,radius:1.6}:{x:p.x,z:p.z,id:'xmas-near',kind:'wait',label:t.label,radius:2};
  }
  // Kedjan i samma form som en vanlig körning, så att julens HUD kan visa den utan särfall.
  comboView(){return {chain:this.chain,phase:this.running?'collect':'done',t:this.time,lastPickAt:this.lastPickAt,windowSec:this.chainWindow()};}
  powers(out=[]){
    out.length=0;
    const rocket=this.j.fun?.power?.timers?.rocket||0;if(rocket>0)out.push({kind:'sleigh',label:GIFTS.sleigh.short,left:rocket,seconds:GIFTS.sleigh.seconds});
    for(const k of ['glogg','kaka','wind','skates','magnet','ghost','star','pause','golden'])if(this.timers[k]>0)out.push({kind:k,label:GIFTS[k].short,left:this.timers[k],seconds:GIFTS[k].seconds});
    if(this.shield>0)out.push({kind:'shield',label:GIFTS.shield.short+(this.shield>1?' ×'+this.shield:''),left:0,seconds:0});
    return out;
  }
  snapshot(){
    const t=this.j.tempo,def=this.def;
    return {state:this.state,running:this.running,level:t.level+(def?0:this.extra),name:def?def.name:rushName(t.level),n:def?.n||0,goal:def?goalProgress(def,{picked:t.picked,score:t.score}):null,streak:this.streak,lives:t.lives,maxLives:TEMPO.lives,score:t.score,picked:t.picked,gold:this.golds,gifts:this.gifts,
      chain:this.chain,bestChain:this.bestChain,ratio:t.target&&t.deadline>0?clamp01(t.left/t.deadline):1,left:Math.max(0,t.left),hasTarget:!!t.target,urgent:!!t.target&&t.deadline>0&&t.left/t.deadline<RUSH.urgent,
      levelLeft:Math.max(0,TEMPO.levelSeconds-(t.levelClock-(t.level>=TEMPO.levels?this.extra*TEMPO.levelSeconds:0)))/(def?1:RUSH.marathonRate),speed:t.speedMul(),mult:t.pointMul(),shield:this.shield,seconds:t.elapsed,packages:this.list.length,
      side:this.side.reduce((n,k)=>n+(k.rain?0:1),0),rain:this.side.reduce((n,k)=>n+(k.rain?1:0),0),sideTaken:this.sideTaken,magnet:this.timers.magnet>0,ghost:this.spirit.active,result:this.result};
  }
}
