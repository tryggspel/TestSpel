#!/usr/bin/env node
// Svårighetsprov för JulRushen och Maraton: simulerade spelare med olika skicklighet spelar mot den riktiga motorn (XmasRush ovanpå grundspelets CityJourney:
// samma bana, klocka, fångstfält och gåvor som i spelet, men utan webbläsare). Skriver hur långt varje spelartyp kommer: första försöket i varje rush (med tre hjärtan),
// en hel serie från Rush 1 (hjärtana följer med) och Maraton. Används för att ställa in klockan (xmas-rushes.mjs: PRESSURE) så att det blir svårare för varje rush.
//
//   node tools/xmas-flow/difficulty.mjs                 (alla spelartyper, 12 försök vardera)
//   node tools/xmas-flow/difficulty.mjs --runs 30 --skills A,G --series 1 --attempts 1 --marathon 0
//   --from 12 --max 12 (bara Rush 12), --over 4 (fyra övertidsrusher efter Rush 12), --press '{"decay":0.8}' (prova andra värden i PRESSURE), --detail 1 (paket, tid och poäng per paket), --seconds, --mseconds
//
// Spelartyperna är en modell, inte människor: fart (andel av högsta fart med turbo), sväng (grader/s), tvekan (s när nästa paket ligger åt sidan) och brus. De är
// valda så att P är en perfekt spelare, E en mycket duktig, G en duktig, A en vanlig och C en nybörjare. Hur riktiga spelare ligger till mot dem är inte känt.
import fs from 'node:fs';
import {CityNavigation} from '../../city-missions.mjs';
import {CityJourney} from '../../journey-rules.mjs';
import {seededRandom,hashSeed} from '../../daily-challenge.mjs';
import {XmasSave} from '../../xmas/xmas-save.mjs';
// Spelets moduler importerar varandra med cache-nyckeln (?v=…). Rushmodulerna måste hämtas med samma nyckel för att vara samma instans som motorn använder.
const VERSION=JSON.parse(fs.readFileSync(new URL('../../version.json',import.meta.url),'utf8')).version;
const {XmasRush}=await import('../../xmas/xmas-rush.mjs?v='+VERSION);
const RUSHES=await import('../../xmas/xmas-rushes.mjs?v='+VERSION);

const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,all)=>v.startsWith('--')?[...a,[v.slice(2),all[i+1]&&!all[i+1].startsWith('--')?all[i+1]:'1']]:a,[]));
if(args.press)Object.assign(RUSHES.PRESSURE,JSON.parse(args.press));
const RUNS=Number(args.runs||12),DT=Number(args.dt||1/30),MAXN=Number(args.max||30),MAXSEC=Number(args.seconds||260);
const wantSkills=String(args.skills||'P,E,G,A,C').split(',');
const DO={attempts:args.attempts!=='0',series:args.series!=='0',marathon:args.marathon!=='0'};
const VERBOSE=!!args.verbose;

// Spelartyper. speed1/speed12: andel av högsta fart (turbo ×2 räknas in) som spelaren håller på raksträckor i tempo 1 och tempo 12: ju fortare det går desto svårare är det att styra,
// så en vanlig spelare tappar mer av sin fart i högt tempo. turn: grader/s, lag: tvekan i sekunder när nästa paket ligger helt åt sidan, noise: fartvariation.
export const SKILLS=Object.freeze({
  P:{name:'perfekt',speed1:1,speed12:1,turn:720,lag:0,noise:0},
  E:{name:'mycket duktig',speed1:.98,speed12:.88,turn:420,lag:.1,noise:.04},
  G:{name:'duktig',speed1:.92,speed12:.72,turn:290,lag:.22,noise:.08},
  A:{name:'vanlig',speed1:.85,speed12:.55,turn:200,lag:.38,noise:.12},
  C:{name:'nybörjare',speed1:.72,speed12:.4,turn:140,lag:.6,noise:.16},
  // Samma som G och A men med slarv: vid varje nytt paket är det en viss chans (slip) att spelaren tittar bort, missar svängen eller trycker fel, och tappar ungefär slipT sekunder.
  // Människor är oftare så än jämna: gränserna blir mjukare och ligger lägre (se JULVERSION.md 6.1).
  H:{name:'duktig med slarv',speed1:.92,speed12:.72,turn:290,lag:.22,noise:.08,slip:.12,slipT:1},
  J:{name:'vanlig med slarv',speed1:.85,speed12:.55,turn:200,lag:.38,noise:.12,slip:.12,slipT:1}
});
const fraction=(sk,level)=>sk.speed1+(sk.speed12-sk.speed1)*(Math.max(1,Math.min(12,level))-1)/11;

const nav=new CityNavigation(),mall={x:-135,z:98};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-135,z:55,name:'Rädda fikat'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const START={x:-19,z:35};
const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};

function mk(seed){
  const g=new CityJourney(nav,mall,portals,storage());g.rush.start('clean');g.drainEvents();
  g.items.length=0;g.treasures.length=0;g.secrets.length=0;g.itemById.clear();
  g.dynRnd=seededRandom(hashSeed('dyn'+seed));
  const save=new XmasSave(storage()),rush=new XmasRush({journey:g,save});
  g.xmas={step:(dt,p,sweep,speed)=>rush.step(dt,p,sweep,speed),objective:p=>rush.objective(p)};
  return {g,rush,save,pos:{...START},heading:Math.PI,lag:0,seed};
}
// En spelare går mot målet bildruta för bildruta. Rör sig längs sin riktning (kan alltså svänga för vidare och missa), saktar in när målet ligger åt sidan.
function frame(c,sk,rnd){
  const g=c.g,t=g.tempo,tg=t.target;
  if(tg&&t.running){
    const dx=tg.x-c.pos.x,dz=tg.z-c.pos.z,want=Math.atan2(dx,dz),dh=wrap(want-c.heading);
    if(c.lastTarget!==tg.id){c.lastTarget=tg.id;c.lag=sk.lag*Math.abs(dh)/Math.PI*(.6+.8*rnd());if(sk.slip&&rnd()<sk.slip)c.lag+=sk.slipT*(.5+rnd());}
    const maxTurn=sk.turn*Math.PI/180*DT,turn=Math.max(-maxTurn,Math.min(maxTurn,dh));c.heading+=turn;
    const err=Math.abs(wrap(want-c.heading)),align=err<.35?1:Math.max(.25,1-(err-.35)/1.2);
    let v=0;
    if(c.lag>0)c.lag-=DT;
    else v=7.2*2*t.speedMul()*g.fun.power.speedMul()*fraction(sk,t.level)*align*(1+(rnd()-.5)*2*sk.noise);
    const s=v*DT;c.pos={x:c.pos.x+Math.sin(c.heading)*s,z:c.pos.z+Math.cos(c.heading)*s};
  }
  const before=t.target&&t.deadline>0?t.left/t.deadline:null,beforeId=t.target?.id;
  g.step(DT,{x:c.pos.x,z:c.pos.z,y:1.68},{x:Math.sin(c.heading),z:Math.cos(c.heading)});
  for(const e of c.rush.drain())if(e.type==='rush-pick'&&!e.side&&e.id===beforeId&&before!=null&&c.margins)c.margins.push(before);
  g.drainEvents();
}
// En rush (def) eller Maraton (def=null). Returnerar utfallet.
function playOne(sk,rnd,{def=null,hearts=3,streak=0,seed=1,maxSeconds=MAXSEC}={}){
  const c=mk(seed);c.margins=[];c.rush.start({def,hearts,streak});
  let n=0;const limit=Math.ceil(maxSeconds/DT);
  while(c.rush.state!=='over'&&n++<limit)frame(c,sk,rnd);
  const r=c.rush.result;
  if(!r){c.rush.quit?.();return {win:false,timeout:true,hearts:0,seconds:maxSeconds,picked:c.g.tempo.picked,level:c.g.tempo.level,score:c.g.tempo.score};}
  return {margins:c.margins,win:!!r.rush?.cleared,hearts:r.rush?.hearts??0,seconds:r.seconds,picked:r.collected,level:r.level,score:r.points,next:r.rush?.next||0,nextHearts:r.rush?.nextHearts||0,misses:r.misses,gifts:r.gifts};
}
const pct=(a,n)=>Math.round(100*a/n)+'%';
const quant=(a,q)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(q*s.length))];};

const out=[];
const log=s=>{out.push(s);console.log(s);};
const count=RUSHES.RUSH_COUNT;
for(const key of wantSkills){
  const sk=SKILLS[key];if(!sk)continue;
  log('\n══ '+key+' · '+sk.name+' (fart '+sk.speed1+'→'+sk.speed12+', sväng '+sk.turn+'°/s, tvekan '+sk.lag+' s) ══');
  if(DO.attempts){
    const row=[];
    for(let n=Math.max(1,Number(args.from||1));n<=Math.min(count+(args.over?Number(args.over):0),MAXN);n++){
      const def=RUSHES.rushDef(n);let wins=0,secs=0,hs=0,pk=0,ws=0,sc=0;const mg=[];
      for(let r=0;r<RUNS;r++){const rnd=seededRandom(hashSeed(key+'a'+n+'x'+r));const o=playOne(sk,rnd,{def,seed:r+1});if(o.win){wins++;hs+=o.hearts;pk+=o.picked;ws+=o.seconds;sc+=o.score;}secs+=o.seconds;if(o.margins)mg.push(...o.margins);if(VERBOSE)console.log('  rush',n,'försök',r,JSON.stringify(o));}
      row.push(n+':'+pct(wins,RUNS)+(wins?'('+(hs/wins).toFixed(1)+'♥'+(args.detail?' '+Math.round(pk/wins)+'pk '+Math.round(ws/wins)+'s '+Math.round(sc/pk)+'p/pk':'')+')':'')+(args.margins&&mg.length?'[kvar p10 '+quant(mg,.1).toFixed(2)+']':''));
    }
    log('första försöket per rush (andel som klarar, snitt hjärtan kvar): '+row.join('  '));
  }
  if(DO.series){
    const reach=[],secs=[];
    for(let r=0;r<RUNS;r++){
      const rnd=seededRandom(hashSeed(key+'s'+r));let hearts=3,streak=0,total=0,n=1;
      for(;n<=MAXN;n++){
        const def=RUSHES.rushDef(n);const o=playOne(sk,rnd,{def,hearts,streak,seed:r*50+n});total+=o.seconds;
        if(!o.win)break;hearts=o.nextHearts||hearts;streak++;
      }
      reach.push(Math.min(n-1,MAXN));secs.push(total);
    }
    const all12=reach.filter(x=>x>=count).length;
    log('serie från Rush 1: klarade rusher i rad, median '+quant(reach,.5)+' (p25 '+quant(reach,.25)+', p75 '+quant(reach,.75)+', längst '+Math.max(...reach)+'); alla '+count+' i rad: '+pct(all12,RUNS)+'; tid median '+Math.round(quant(secs,.5))+' s');
  }
  if(DO.marathon){
    const lv=[],pk=[],sc=[];
    for(let r=0;r<RUNS;r++){const rnd=seededRandom(hashSeed(key+'m'+r));const o=playOne(sk,rnd,{def:null,seed:r+7,maxSeconds:Number(args.mseconds||600)});lv.push(o.level);pk.push(o.picked);sc.push(o.seconds);}
    log('Maraton: tempo när det tar slut, median '+quant(lv,.5)+' (p25 '+quant(lv,.25)+', p75 '+quant(lv,.75)+'); paket median '+quant(pk,.5)+'; tid median '+Math.round(quant(sc,.5))+' s');
  }
}
