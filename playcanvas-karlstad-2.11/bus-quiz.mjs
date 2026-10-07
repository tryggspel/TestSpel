// BussQuiz: frågorna på skärmen i bussen. Ren logik utan DOM, så att allt går att testa.
// Frågorna kommer från tre håll: en fast frågebank om Karlstad, frågor som spelet själv räknar fram ur linjenätet,
// och (om /api/varmlandstrafik svarar) riktiga avgångar. Utan nätverk eller nyckel fungerar de två första.
// I zombiebussen går skärmen sönder: texten garbleras och svarsalternativen byter plats tills rätt svar rebootar den.
import {seededRandom,hashSeed} from './daily-challenge.mjs?v=2.15.0';
import {BUS_NETWORK} from './explore-places.mjs?v=2.15.0';

export const QUIZ=Object.freeze({perQuestion:5,points:30,fastBonus:10,fastWithin:2.4,wrongCost:0,glitchEvery:1.1});

// [fråga, rätt svar, två fel svar]. Rätt svar blandas in av sessionen.
export const QUESTION_BANK=Object.freeze([
  ['Vilken älv rinner genom Karlstad?','Klarälven',['Dalälven','Göta älv']],
  ['Vid vilken sjö ligger Karlstad?','Vänern',['Vättern','Mälaren']],
  ['Vilket landskap är Karlstad huvudort i?','Värmland',['Dalarna','Småland']],
  ['Vilken konstnär är känd för akvarellerna på Sandgrund?','Lars Lerin',['Carl Larsson','Anders Zorn']],
  ['Vilken dryck rostas hos Löfbergs i Karlstad?','Kaffe',['Te','Kakao']],
  ['Vilken opera har sitt hem i Karlstad?','Wermland Opera',['Göteborgsoperan','Norrlandsoperan']],
  ['Hur många linjer kan du välja på från Torget i spelet?','8',['5','12']],
  ['Vad kallas Karlstads kyrka vid Östra Torggatan?','Domkyrkan',['Skeppskyrkan','Storkyrkan']],
  ['Vad heter parken i spelets västra del med djurpark och friluftsteater?','Mariebergsskogen',['Frödingsparken','Badhusparken']],
  ['Vilken färg har Värmlandstrafiks bussar i spelet?','Gul',['Lila','Grön']],
  ['Vad ska man göra med flytvästen på båtbussen?','Kasta den till den som behöver den',['Ta på sig den bakochfram','Sälja den']],
  ['Vem kör bussen i zombieläget?','Någon som borde ha sovit',['Lars Lerin','Alla andra']],
  ['Vad är den viktigaste regeln på en buss?','Håll i dig',['Stå upp i kurvorna','Prata med föraren']],
  ['Vad kostar kaffet på bussen i spelet?','Det åker gratis',['Fem kronor','Hundra poäng']],
  ['Vilken stad är residensstad i Värmland?','Karlstad',['Arvika','Kristinehamn']],
  ['Vilken av dessa är en riktig stadsdel i Karlstad?','Haga',['Hagastan Norra','Hagaköping']],
  ['Hur många tunnlar går bussen genom på väg till Åttkanten?','Inga',['Tre','Sjutton']],
  ['Vilket djur syns oftast på skyltarna i Värmland?','Älg',['Giraff','Pingvin']],
  ['Vad heter spelets zombie-förare?','Chauffören',['Pilot','Lotsen']]
]);

const shuffle=(list,rnd)=>{const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

// Frågor som räknas fram ur linjenätet, så att de alltid stämmer med spelet.
export function networkQuestions(network=BUS_NETWORK){
  const stops=network.filter(s=>!s.hub);if(stops.length<4)return [];
  const out=[];
  for(const s of stops){
    const others=stops.filter(o=>o!==s);
    out.push([`Vilken hållplats har linje ${s.line}?`,s.name,[others[(s.line)%others.length].name,others[(s.line+3)%others.length].name]]);
    out.push([`Vilken linje går till ${s.name}?`,String(s.line),[String((s.line%stops.length)+1),String(((s.line+2)%stops.length)+1)]]);
  }
  const far=[...stops].filter(s=>s.x!==undefined).sort((a,b)=>Math.hypot(b.x+19,b.z-35)-Math.hypot(a.x+19,a.z-35))[0];
  if(far)out.push(['Vilken hållplats ligger längst från Torget?',far.name,['Domkyrkan','Karlstad C']]);
  return out;
}

// En riktig avgångstavla: {stop, departures:[{line,direction,time}]}. Returnerar frågor eller [].
export function liveQuestions(board){
  const deps=(board?.departures||[]).filter(d=>d&&d.line&&d.direction&&d.time);if(deps.length<2)return [];
  const out=[],lines=[...new Set(deps.map(d=>String(d.line)))];
  const first=deps[0];
  const wrong=lines.filter(l=>l!==String(first.line));
  while(wrong.length<2)wrong.push(String(Number(first.line)+wrong.length+1||wrong.length+2));
  out.push([`Närmast från ${board.stop||'hållplatsen'} just nu: vilken linje går mot ${first.direction}?`,String(first.line),wrong.slice(0,2)]);
  const second=deps.find(d=>d.direction!==first.direction);
  if(second){const dirs=[...new Set(deps.map(d=>d.direction))].filter(x=>x!==second.direction);while(dirs.length<2)dirs.push('Skoghall');out.push([`Vart går linje ${second.line} härifrån?`,second.direction,dirs.slice(0,2)]);}
  return out;
}

// Garblar text deterministiskt (zombiechauffören har rört i systemet).
export function garble(text,rnd){
  const noise='#%&?¤§@Ø';return String(text).split('').map(ch=>/\s/.test(ch)?ch:rnd()<.38?noise[Math.floor(rnd()*noise.length)]:ch).join('');
}

export class QuizSession{
  // count frågor, perQuestion sekunder var. chaos: skärmen är sönder. live: avgångstavla eller null.
  constructor({seed=1,count=3,chaos=false,live=null,network=BUS_NETWORK,perQuestion=QUIZ.perQuestion}={}){
    this.rnd=seededRandom(hashSeed('quiz|'+seed));this.chaos=chaos;this.perQuestion=perQuestion;
    const pool=[...liveQuestions(live),...shuffle([...networkQuestions(network),...QUESTION_BANK],this.rnd)];
    // Live-frågan kommer först om den finns (den är nyast), resten blandas.
    this.questions=pool.slice(0,Math.max(1,count)).map(([q,right,wrong])=>{
      const options=shuffle([right,...wrong.slice(0,2)],this.rnd);return {q,options,correct:options.indexOf(right),right};
    });
    this.index=0;this.timeLeft=perQuestion;this.score=0;this.correct=0;this.answered=0;this.state='playing';this.flash=0;this.glitchAt=0;this.order=[0,1,2];this.last=null;
  }
  get current(){return this.state==='playing'?this.questions[this.index]:null;}
  // Det som visas just nu: i kaos-läget garblad text och blandade alternativ.
  view(){
    const cur=this.current;if(!cur)return null;
    if(!this.chaos)return {q:cur.q,options:[...cur.options],index:this.index,total:this.questions.length,timeLeft:this.timeLeft,chaos:false};
    const r=seededRandom(hashSeed('g|'+this.index+'|'+Math.floor(this.glitchAt)));
    return {q:garble(cur.q,r),options:this.order.map(i=>garble(cur.options[i],r)),index:this.index,total:this.questions.length,timeLeft:this.timeLeft,chaos:true};
  }
  // Svar på position i det som visas (i kaos-läget är ordningen blandad).
  answer(shown){
    const cur=this.current;if(!cur)return null;
    const real=this.chaos?this.order[shown]:shown;if(!(real>=0&&real<3))return null;
    const ok=real===cur.correct,fast=this.perQuestion-this.timeLeft<=QUIZ.fastWithin;
    const points=ok?QUIZ.points+(fast?QUIZ.fastBonus:0):0;
    this.answered++;if(ok){this.correct++;this.score+=points;}
    this.last={ok,points,right:cur.right,chosen:cur.options[real],fast};
    this.advance();return this.last;
  }
  advance(){this.index++;this.timeLeft=this.perQuestion;if(this.index>=this.questions.length)this.state='done';}
  tick(dt){
    if(this.state!=='playing'||!(dt>0))return null;
    this.flash=Math.max(0,this.flash-dt);
    if(this.chaos){this.glitchAt+=dt/QUIZ.glitchEvery;const turn=Math.floor(this.glitchAt);if(turn!==this.lastTurn){this.lastTurn=turn;this.order=shuffle([0,1,2],seededRandom(hashSeed('o|'+this.index+'|'+turn)));}}
    this.timeLeft-=dt;
    if(this.timeLeft<=0){this.answered++;this.last={ok:false,points:0,right:this.current.right,chosen:null,timeout:true};const l=this.last;this.advance();return l;}
    return null;
  }
  summary(){return {correct:this.correct,total:this.questions.length,points:this.score,state:this.state};}
}

// Hämtar riktiga avgångar. Aldrig fel mot spelaren: allt som går snett blir null och quizen använder reservfrågorna.
export async function fetchLiveBoard(fetchImpl=globalThis.fetch,url='/api/varmlandstrafik',timeoutMs=1800){
  if(typeof fetchImpl!=='function')return null;
  try{
    const ctl=typeof AbortController==='function'?new AbortController():null,timer=ctl?setTimeout(()=>ctl.abort(),timeoutMs):0;
    const res=await fetchImpl(url,{signal:ctl?.signal,headers:{accept:'application/json'}});clearTimeout(timer);
    if(!res||!res.ok)return null;const data=await res.json();
    const deps=Array.isArray(data?.departures)?data.departures.filter(d=>d&&typeof d.line==='string'&&typeof d.direction==='string'&&typeof d.time==='string').slice(0,12).map(d=>({line:d.line.slice(0,6),direction:d.direction.slice(0,40),time:d.time.slice(0,5)})):[];
    return deps.length?{stop:String(data.stop||'Karlstad').slice(0,40),updated:data.updated||null,departures:deps}:null;
  }catch{return null;}
}
