// City Explore 2.13: det som gör kaffejakten svår att lägga ifrån sig, på ett snällt sätt.
// Turbo, kombokedja, sällsynta termosar med superkrafter, nivåer, fikaalbum, dagsmål med streak och märken.
// Idéerna är lånade: kombo och beröm från Candy Crush, regnbågstermosen från Mario Karts frågetecken-lådor,
// dagsmål och streak från Duolingo och Pokémon GO, hett/kallt från geocaching, album från samlarkort.
// Ren spellogik utan DOM och rendering, så att allt går att testa. Bara 'clean'-läget (City Explore) använder den.
import {stockholmDay} from './daily-challenge.mjs?v=2.21.1-xmas.5';
import {ALBUM_AREAS,areaOf} from './explore-places.mjs?v=2.21.1-xmas.5';
import {PowerState,powerFor,POWERUPS} from './powerups.mjs?v=2.21.1-xmas.5';

export const FUN_KEY='karlstad:fun:1';
export const BASE_POINTS=25;

// ── Turbo ────────────────────────────────────────────────────────────────────────────────────────────────────
// Dubbel fart till fots och på Ryde. Bara i City Explore, bara utomhus (gallerian och övervåningar är trånga).
export const TURBO=Object.freeze({multiplier:2,fov:9,key:'KeyT',maxStep:.38,maxSteps:12});
export function turboAllowed({mode='free',indoors=false,upper=false,transport=false}={}){return mode==='clean'&&!indoors&&!upper&&!transport;}
export function turboScale(on,ctx){return on&&turboAllowed(ctx)?TURBO.multiplier:1;}
// Hur många delsteg en förflyttning ska delas i, så att höga farter aldrig hoppar över en vägg.
export function moveSteps(dx,dz,maxStep=TURBO.maxStep,cap=TURBO.maxSteps){
  const d=Math.hypot(dx,dz);if(!Number.isFinite(d)||d<=maxStep)return 1;
  return Math.max(1,Math.min(cap,Math.ceil(d/maxStep)));
}
// Kortaste avstånd från en punkt till sträckan a→b (för att inte missa en termos mellan två bildrutor).
export function segmentDistance(px,pz,ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz;
  const t=len2>0?Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/len2)):0;
  return Math.hypot(ax+dx*t-px,az+dz*t-pz);
}

// ── Hjälpare ─────────────────────────────────────────────────────────────────────────────────────────────────
export function hash32(text){let h=2166136261;const s=String(text);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
export function prevDay(day){
  const d=new Date(String(day)+'T12:00:00Z');if(!Number.isFinite(d.getTime()))return '';
  d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);
}
const clampInt=(v,max)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;

// ── Kombokedja ───────────────────────────────────────────────────────────────────────────────────────────────
// Hitta nästa termos innan fönstret går ut. Kedjan ger poängmultiplikator och beröm vid milstolpar.
export const COMBO=Object.freeze({window:9,perLevel:.5,maxWindow:13,tiers:Object.freeze([[1,1],[3,2],[6,3],[10,4],[15,5]])});
export const PRAISE=Object.freeze([[3,'GOTT!'],[5,'MUMS!'],[8,'SUPERGOTT!'],[12,'FIKARUSH!'],[20,'KANELBULLE-KRASCH!'],[30,'LEGENDARISKT FIKA!']]);
export const multiplierFor=chain=>COMBO.tiers.reduce((m,[n,v])=>chain>=n?v:m,1);
export const praiseFor=chain=>PRAISE.find(([n])=>n===chain)?.[1]||null;
// Pentatonisk skala: varje termos i kedjan spelar nästa ton, som i Candy Crush. Fem toner, sedan fem en oktav upp; därefter loopar den övre oktaven.
const NOTES=[523.25,587.33,659.25,783.99,880];
export function chainFreq(chain){const i=Math.max(0,Math.floor(chain)-1);return NOTES[i%5]*2**Math.min(1,Math.floor(i/5));}
export class ComboMeter{
  constructor(){this.chain=0;this.left=0;this.span=COMBO.window;this.best=0;}
  hit(span=COMBO.window){this.chain=this.left>0?this.chain+1:1;this.span=span;this.left=span;this.best=Math.max(this.best,this.chain);return this.chain;}
  // Returnerar antalet i kedjan när den går ut, annars 0. Fryst: tiden står still.
  tick(dt,frozen=false){
    if(this.chain===0||frozen||!Number.isFinite(dt)||dt<=0)return 0;
    this.left-=dt;if(this.left>0)return 0;
    const lost=this.chain;this.chain=0;this.left=0;return lost;
  }
}

// ── Sällsynta termosar och superkrafter ──────────────────────────────────────────────────────────────────────
// Vilka termosar som är speciella byter varje dag (dagens hash), så att det alltid finns en anledning att gå förbi igen.
export const RARITY=Object.freeze({
  common:{mult:1,label:'',color:'#9b6cc6'},
  silver:{mult:2,label:'SILVERTERMOS',color:'#b8c7d9'},
  gold:{mult:5,label:'GULDTERMOS',color:'#f8c650'},
  rainbow:{mult:3,label:'REGNBÅGSTERMOS',color:'#ff7ad9'}
});
export function rarityFor(id,day){const h=hash32(String(id)+'|'+String(day))%1000;return h<8?'rainbow':h<48?'gold':h<160?'silver':'common';}
export const BOOSTERS=Object.freeze({
  magnet:{label:'KAFFEMAGNET',text:'Termosar inom 16 meter dras till dig.',seconds:20,radius:16},
  double:{label:'DUBBLA POÄNG',text:'Allt du hittar ger dubbelt.',seconds:25},
  freeze:{label:'KOMBOFRYS',text:'Kedjan går inte ut.',seconds:20}
});
export function boosterFor(id,day){return ['magnet','double','freeze'][hash32('booster|'+id+'|'+day)%3];}

// ── Nivåer ───────────────────────────────────────────────────────────────────────────────────────────────────
// Tidiga nivåer går fort (en minut, tre minuter), de sista tar timmar. Poängen är spelets samlade kaffepoäng.
export const LEVELS=Object.freeze([0,500,1500,3500,7000,12000,20000,32000,50000,75000]);
export const TITLES=Object.freeze(['Turist','Nyinflyttad','Torgvandrare','Fikakännare','Kaffeproffs','Älvpromenör','Stadsguide','Termosmästare','Klarälvsikon','Karlstadslegend']);
export const LEVEL_STEP=25000;
export function levelFor(xp){
  const v=Math.max(0,Number.isFinite(Number(xp))?Number(xp):0);let level=1;
  for(let i=1;i<LEVELS.length;i++)if(v>=LEVELS[i])level=i+1;
  if(level===LEVELS.length&&v>=LEVELS.at(-1))level+=Math.floor((v-LEVELS.at(-1))/LEVEL_STEP);
  const from=level<=LEVELS.length?LEVELS[level-1]:LEVELS.at(-1)+(level-LEVELS.length)*LEVEL_STEP;
  const to=level<LEVELS.length?LEVELS[level]:LEVELS.at(-1)+(level-LEVELS.length+1)*LEVEL_STEP;
  return {level,title:TITLES[Math.min(level,TITLES.length)-1],from,to,progress:Math.max(0,Math.min(1,(v-from)/(to-from))),xp:v};
}

// ── Dagsmål ──────────────────────────────────────────────────────────────────────────────────────────────────
export const goalForDay=day=>20+hash32('goal|'+day)%16;
export const dailyBonus=streak=>250+50*Math.min(6,Math.max(0,streak-1));

// ── Märken ───────────────────────────────────────────────────────────────────────────────────────────────────
export const BADGES=Object.freeze([
  {id:'first-cup',name:'Första koppen',desc:'Hitta din första termos.',test:s=>s.thermos>=1},
  {id:'cups-25',name:'Termosfamn',desc:'Hitta 25 termosar.',test:s=>s.thermos>=25},
  {id:'cups-100',name:'Kaffekarusell',desc:'Hitta 100 termosar.',test:s=>s.thermos>=100},
  {id:'cups-300',name:'Termoskung',desc:'Hitta 300 termosar.',test:s=>s.thermos>=300},
  {id:'chain-5',name:'Kedjereaktion',desc:'Få en kombokedja på 5.',test:s=>s.bestChain>=5},
  {id:'chain-12',name:'Fikarush',desc:'Få en kombokedja på 12.',test:s=>s.bestChain>=12},
  {id:'chain-25',name:'Legendarisk kedja',desc:'Få en kombokedja på 25.',test:s=>s.bestChain>=25},
  {id:'gold-5',name:'Guldfeber',desc:'Hitta 5 guldtermosar.',test:s=>s.gold>=5},
  {id:'rainbow-1',name:'Regnbåge över Klarälven',desc:'Hitta en regnbågstermos.',test:s=>s.rainbow>=1},
  {id:'treasure-1',name:'Skattjägare',desc:'Hitta din första gömda skatt.',test:s=>s.treasures>=1},
  {id:'treasure-8',name:'Äventyrare',desc:'Hitta 8 gömda skatter.',test:s=>s.treasures>=8},
  {id:'treasure-all',name:'Skattmästare',desc:'Hitta alla gömda skatter.',test:s=>s.treasureTotal>0&&s.treasures>=s.treasureTotal},
  {id:'bus-1',name:'Första bussen',desc:'Åk buss till en ny hållplats.',test:s=>s.stops>=1},
  {id:'bus-all',name:'Hela linjenätet',desc:'Besök alla hållplatser.',test:s=>s.stopTotal>0&&s.stops>=s.stopTotal},
  {id:'quiz-10',name:'Busskunskap',desc:'Svara rätt på 10 frågor i bussens BussQuiz.',test:s=>s.quizCorrect>=10},
  {id:'quiz-perfect',name:'Full pott på linjen',desc:'Svara rätt på alla frågor under en busstur.',test:s=>s.quizPerfect>=1},
  {id:'checkin-1',name:'Incheckad',desc:'Checka in hos MusicPartner på Kungsgatan.',test:s=>s.checkins>=1},
  {id:'turbo-2k',name:'Turbotok',desc:'Kör 2 kilometer i turbo.',test:s=>s.turboMeters>=2000},
  {id:'area-1',name:'Områdeskungen',desc:'Samla alla termosar i ett område.',test:s=>s.areasDone>=1},
  {id:'streak-3',name:'Stammis',desc:'Nå dagsmålet tre dagar i rad.',test:s=>s.bestStreak>=3},
  {id:'streak-7',name:'Veckans fikavän',desc:'Nå dagsmålet sju dagar i rad.',test:s=>s.bestStreak>=7},
  {id:'level-5',name:'Kaffeproffs',desc:'Nå nivå 5.',test:s=>s.level>=5},
  {id:'power-5',name:'Fyndare',desc:'Hitta 5 förmågor (glittrande märken).',test:s=>s.powerups>=5},
  {id:'flash-5',name:'Blixtsnabb',desc:'Klara 5 blixtutmaningar.',test:s=>s.flashDone>=5},
  {id:'tempo-5',name:'Rusningstid',desc:'Nå tempo 5 i Temporush.',test:s=>s.tempoLevel>=5},
  {id:'tempo-10',name:'Vansinnesfart',desc:'Nå tempo 10 i Temporush.',test:s=>s.tempoLevel>=10},
  {id:'pass-1',name:'Första stämpeln',desc:'Gör ett butiksuppdrag och få en stämpel i Karlstadpasset.',test:s=>s.partnerStamps>=1},
  {id:'pass-all',name:'Fullt pass',desc:'Samla alla stämplar i Karlstadpasset.',test:s=>s.partnerTotal>0&&s.partnerStamps>=s.partnerTotal}
]);

// Hett/kallt för gömda skatter, som geocaching. Avstånd i meter.
export const HEAT=Object.freeze([[10,'BRINNER!',4],[25,'HETT',3],[50,'VARMT',2],[90,'LJUMT',1]]);
export function heatFor(distance){for(const [d,label,level] of HEAT)if(distance<=d)return {label,level};return null;}

const freshState=()=>({version:1,collected:[],treasures:[],stops:[],badges:[],areasDone:[],day:'',dayCount:0,dayDone:false,
  streak:0,lastDone:'',bestStreak:0,bestChain:0,levelSeen:1,
  checkinDay:'',stats:{thermos:0,silver:0,gold:0,rainbow:0,turboMeters:0,rides:0,treasures:0,quizCorrect:0,quizPerfect:0,checkins:0,powerups:0,flashDone:0,tempoLevel:0,partnerStamps:0}});
const idList=(v,max=2000)=>Array.isArray(v)?[...new Set(v.filter(x=>typeof x==='string'&&x.length>0&&x.length<64))].slice(0,max):[];

export class ExploreFun{
  // items: alla termosar i spelet (för områdesräkningen). treasureIds: alla skatter. stopIds: hållplatser man kan besöka (utan navet).
  constructor({storage=null,clock=()=>new Date(),items=[],treasureIds=[],stopIds=[],xp=0}={}){
    this.storage=storage;this.clock=clock;this.state=freshState();this.dirty=false;
    this.combo=new ComboMeter();this.boosters={magnet:0,double:0,freeze:0};this.power=new PowerState();this.run=0;
    this.areaById=new Map();this.areaTotals=new Map();
    for(const t of items){const a=areaOf(t);this.areaById.set(t.id,a);this.areaTotals.set(a,(this.areaTotals.get(a)||0)+1);}
    this.treasureTotal=treasureIds.length;this.treasureIds=new Set(treasureIds);
    this.stopIds=new Set(stopIds);
    const existed=this.load();
    // Den som redan spelat får inte en flod av nivåmeddelanden första gången.
    if(!existed)this.state.levelSeen=levelFor(xp).level;
    this.recount();
  }
  load(){
    let v=null;try{v=JSON.parse(this.storage?.getItem(FUN_KEY)||'null');}catch{}
    if(!v||v.version!==1)return false;
    const s=this.state;
    s.collected=idList(v.collected);s.treasures=idList(v.treasures,200);s.stops=idList(v.stops,50);s.badges=idList(v.badges,100);s.areasDone=idList(v.areasDone,50);
    s.day=typeof v.day==='string'?v.day.slice(0,10):'';s.dayCount=clampInt(v.dayCount,9999);s.dayDone=!!v.dayDone;
    s.streak=clampInt(v.streak,9999);s.lastDone=typeof v.lastDone==='string'?v.lastDone.slice(0,10):'';s.bestStreak=clampInt(v.bestStreak,9999);s.bestChain=clampInt(v.bestChain,9999);
    s.levelSeen=Math.max(1,clampInt(v.levelSeen,999));s.checkinDay=typeof v.checkinDay==='string'?v.checkinDay.slice(0,10):'';
    for(const k of Object.keys(s.stats))s.stats[k]=clampInt(v.stats?.[k],1e9);
    return true;
  }
  save(){if(!this.dirty)return;try{this.storage?.setItem(FUN_KEY,JSON.stringify(this.state));this.dirty=false;}catch{}}
  recount(){
    this.collectedSet=new Set(this.state.collected);this.areaCount=new Map();
    for(const id of this.collectedSet){const a=this.areaById.get(id);if(a)this.areaCount.set(a,(this.areaCount.get(a)||0)+1);}
  }
  // Datumet räknas om högst var femte sekund (Intl är dyrt och journey-vyn frågar varje bildruta).
  get day(){const ms=+this.clock();if(this._day&&Math.abs(ms-this._dayAt)<5000)return this._day;this._dayAt=ms;this._day=stockholmDay(new Date(ms));return this._day;}
  rollDay(){const day=this.day,s=this.state;if(s.day!==day){s.day=day;s.dayCount=0;s.dayDone=false;this.dirty=true;}return day;}
  streakNow(){const s=this.state,day=this.day;return s.lastDone===day||s.lastDone===prevDay(day)?s.streak:0;}
  windowFor(){return Math.min(COMBO.maxWindow,COMBO.window+COMBO.perLevel*(this.state.levelSeen-1));}
  pickupRadius(base=1.65){return this.boosters.magnet>0?BOOSTERS.magnet.radius:base;}
  activate(kind){this.boosters[kind]=BOOSTERS[kind].seconds;}
  badgeStats(xp=0){
    const s=this.state;
    return {...s.stats,partnerTotal:this.partnerTotal||0,bestChain:s.bestChain,treasures:s.treasures.length,treasureTotal:this.treasureTotal,stops:s.stops.length,stopTotal:this.stopIds.size,
      areasDone:s.areasDone.length,bestStreak:s.bestStreak,level:Math.max(s.levelSeen,levelFor(xp).level)};
  }
  // Nya märken som uppfyllts just nu, som händelser.
  badgeEvents(xp=0){
    const s=this.state,have=new Set(s.badges),stats=this.badgeStats(xp),out=[];
    for(const b of BADGES)if(!have.has(b.id)&&b.test(stats)){s.badges.push(b.id);this.dirty=true;out.push({type:'badge',id:b.id,name:b.name,desc:b.desc});}
    return out;
  }
  // En ny runda börjar utan kedja och utan superkrafter. Nivå, album, märken och dagsmål ligger kvar.
  newRun(){this.combo=new ComboMeter();this.run=0;this.power.reset();for(const k of Object.keys(this.boosters))this.boosters[k]=0;}
  tick(dt){
    if(!Number.isFinite(dt)||dt<=0)return {lost:0};
    for(const k of Object.keys(this.boosters))if(this.boosters[k]>0)this.boosters[k]=Math.max(0,this.boosters[k]-dt);
    this.power.tick(dt);
    const lost=this.combo.tick(dt,this.boosters.freeze>0||this.power.pausing());
    // Kombosköld: en kedja på 2 eller mer räddas en gång och får tillbaka drygt halva tiden.
    if(lost>=2&&this.power.useShield()){this.combo.chain=lost;this.combo.left=this.combo.span*.6;return {lost:0,saved:lost};}
    return {lost};
  }
  // En termos plockas upp. Returnerar poäng, bonus och händelser; spelet delar ut poängen (reward) och skickar vidare händelserna.
  pickup(item,{gagata=false,dyn=false}={}){
    const day=this.rollDay(),s=this.state,events=[];
    const power=powerFor(item.id,day),rarity=power?'common':rarityFor(item.id,day),chain=this.combo.hit(this.windowFor()),mult=multiplierFor(chain),doubled=this.boosters.double>0;
    const lucky=this.power.scoreMul()>1,points=Math.round(BASE_POINTS*RARITY[rarity].mult*mult*(doubled?2:1)*this.power.scoreMul())+(gagata?10:0);
    let bonus=0;
    s.stats.thermos++;this.run++;if(rarity!=='common')s.stats[rarity]++;
    if(chain>s.bestChain)s.bestChain=chain;
    if(rarity==='rainbow'){const kind=boosterFor(item.id,day);this.activate(kind);events.push({type:'booster',kind,label:BOOSTERS[kind].label,text:BOOSTERS[kind].text,seconds:BOOSTERS[kind].seconds});}
    if(power){s.stats.powerups++;events.push(this.applyPower(power));}
    const praise=praiseFor(chain);if(praise)events.push({type:'combo-praise',chain,mult,text:praise});
    const first=!dyn&&!this.collectedSet.has(item.id);
    if(first){
      this.collectedSet.add(item.id);s.collected.push(item.id);
      const area=this.areaById.get(item.id);
      if(area){
        const n=(this.areaCount.get(area)||0)+1;this.areaCount.set(area,n);
        const total=this.areaTotals.get(area)||0;
        if(total>0&&n>=total&&!s.areasDone.includes(area)){
          s.areasDone.push(area);const def=ALBUM_AREAS.find(a=>a.id===area);bonus+=def?.bonus||300;
          events.push({type:'area-done',area,name:def?.name||area,bonus:def?.bonus||300,total});
        }
      }
    }
    s.dayCount++;
    if(!s.dayDone&&s.dayCount>=goalForDay(day)){
      s.dayDone=true;s.streak=s.lastDone===prevDay(day)?s.streak+1:1;s.lastDone=day;s.bestStreak=Math.max(s.bestStreak,s.streak);
      const extra=dailyBonus(s.streak);bonus+=extra;events.push({type:'daily-done',bonus:extra,streak:s.streak,goal:goalForDay(day)});
    }
    this.dirty=true;
    events.push(...this.badgeEvents());
    return {points,bonus,rarity,chain,mult,doubled,lucky,first,power,events};
  }
  // En gömd skatt hittas (både de gamla hemligheterna och de nya skatterna).
  treasure(id){
    const s=this.state;if(s.treasures.includes(id))return null;
    s.treasures.push(id);s.stats.treasures++;this.dirty=true;
    return {count:s.treasures.length,total:this.treasureTotal,events:this.badgeEvents()};
  }
  // En busstur till en hållplats. Navet (Torget) räknas inte som ny hållplats.
  ride(stop,bonus=150,quiz=null){
    const s=this.state;s.stats.rides++;this.dirty=true;
    if(quiz&&quiz.total>0){s.stats.quizCorrect+=quiz.correct;if(quiz.correct===quiz.total)s.stats.quizPerfect++;}
    const first=!stop.hub&&this.stopIds.has(stop.id)&&!s.stops.includes(stop.id);
    if(first)s.stops.push(stop.id);
    return {first,bonus:first?bonus:0,visited:s.stops.length,total:this.stopIds.size,events:this.badgeEvents()};
  }
  addTurbo(meters){
    if(!Number.isFinite(meters)||meters<=0)return [];
    this.state.stats.turboMeters+=meters;this.dirty=true;
    return this.badgeEvents();
  }
  // En förmåga plockas upp. Rakett, stövlar och sköld bor i PowerState, stjärnan i boosters; klocka och bomb hanteras av spelet.
  applyPower(kind){
    const def=POWERUPS[kind];
    if(kind==='star'){for(const k of ['magnet','double','freeze'])this.boosters[k]=Math.max(this.boosters[k],def.seconds);}
    else if(kind==='clock'){this.combo.left=this.combo.span;}
    else this.power.grant(kind);
    this.dirty=true;
    return {type:'power',kind,label:def.label,text:def.text,seconds:def.seconds};
  }
  noteFlash(){this.state.stats.flashDone++;this.dirty=true;return this.badgeEvents();}
  // Karlstadpasset: antal stämplar och hur många som finns. Räknaren sparas (högsta värdet), totalen kommer från spelet.
  notePartnerStamps(count,total){
    const n=clampInt(count,999);this.partnerTotal=clampInt(total,999);
    if(n>this.state.stats.partnerStamps){this.state.stats.partnerStamps=n;this.dirty=true;}
    return this.badgeEvents();
  }
  noteTempo(level){if(level>this.state.stats.tempoLevel){this.state.stats.tempoLevel=level;this.dirty=true;}return this.badgeEvents();}
  // Incheckning hos MusicPartner: en gång per dag.
  checkIn(){
    const s=this.state,day=this.rollDay();if(s.checkinDay===day)return {first:false,events:[]};
    s.checkinDay=day;s.stats.checkins++;this.dirty=true;return {first:true,events:this.badgeEvents()};
  }
  checkedInToday(){return this.state.checkinDay===this.day;}
  // Återställ nivån (poängen nollställs av spelet). Album, skatter, märken och dagsmål ligger kvar.
  resetLevel(){this.state.levelSeen=1;this.combo=new ComboMeter();this.dirty=true;}
  // Efter varje poängutdelning: nivåhöjning och märken som beror på nivån.
  afterReward(xp){
    const out=[],lv=levelFor(xp),s=this.state;
    if(lv.level>s.levelSeen){s.levelSeen=lv.level;this.dirty=true;out.push({type:'level-up',level:lv.level,title:lv.title,window:this.windowFor()});}
    out.push(...this.badgeEvents(xp));
    return out;
  }
  snapshot(xp=0){
    const lv=levelFor(xp),s=this.state,day=this.rollDay();
    return {
      level:lv.level,title:lv.title,levelProgress:lv.progress,levelFrom:lv.from,levelTo:lv.to,xp:lv.xp,
      combo:{chain:this.combo.chain,mult:multiplierFor(this.combo.chain),left:this.combo.left,span:this.combo.span,frozen:this.boosters.freeze>0},
      boosters:Object.entries(this.boosters).filter(([,v])=>v>0).map(([kind,left])=>({kind,label:BOOSTERS[kind].label,left})),
      power:this.power.snapshot(),
      daily:{day,count:s.dayCount,goal:goalForDay(day),done:s.dayDone,streak:this.streakNow(),best:s.bestStreak},
      album:ALBUM_AREAS.map(a=>({id:a.id,name:a.name,found:this.areaCount.get(a.id)||0,total:this.areaTotals.get(a.id)||0,done:s.areasDone.includes(a.id),bonus:a.bonus})),
      treasures:{found:s.treasures.length,total:this.treasureTotal},
      stops:{visited:s.stops.length,total:this.stopIds.size,ids:[...s.stops]},
      badges:BADGES.map(b=>({id:b.id,name:b.name,desc:b.desc,earned:s.badges.includes(b.id)})),
      run:this.run,stats:{...s.stats,bestChain:s.bestChain}
    };
  }
}
