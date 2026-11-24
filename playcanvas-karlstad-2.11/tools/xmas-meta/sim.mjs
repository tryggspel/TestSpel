#!/usr/bin/env node
// Modell av hur framstegen i julbygget (xmas/xmas-meta.mjs) går för tre sorters spelare under säsongen 27 nov – 24 dec. Ingen människa har spelat: det här är en räkneövning med slumpade jakter,
// som visar om grader, prydnader och lotter hamnar någorlunda rätt, inte hur det känns. Ändra siffrorna i xmas/xmas-meta-config.mjs och kör igen.
//
//   node tools/xmas-meta/sim.mjs [antal spelare per sort, standard 300] [--bias=3] [--pity=8]   (prova andra värden för ORNAMENT_POLICY utan att ändra konfigurationen)
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const {XmasMeta,dayOf,dayDiff,doorDay}=await import(pathToFileURL(path.join(root,'xmas/xmas-meta.mjs')).href);
const {HIDDEN_SPOTS}=await import(pathToFileURL(path.join(root,'xmas/xmas-hidden.mjs')).href);
const {ORNAMENTS,CALENDAR,LEVELS}=await import(pathToFileURL(path.join(root,'xmas/xmas-meta-config.mjs')).href);
const N=Math.max(20,Math.floor(Number(process.argv.find(a=>/^\d+$/.test(a)))||300));
const arg=k=>{const a=process.argv.find(x=>x.startsWith('--'+k+'='));return a?Number(a.split('=')[1]):null;};
const {ORNAMENT_POLICY}=await import(pathToFileURL(path.join(root,'xmas/xmas-meta-config.mjs')).href);
const POLICY={bias:arg('bias')??ORNAMENT_POLICY.bias,pity:arg('pity')??ORNAMENT_POLICY.pity};
const mulberry=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};};
const ROUNDS=[['round-torget','torget'],['round-kungsgatan','kungsgatan'],['round-drottninggatan','drottninggatan']];

// Profiler: dagar man spelar (sannolikhet per dag), jakter per speldag, fri vandring (julklappar per dag), gömda julklappar per dag, andel kalenderluckor som klaras när de öppnas.
const PROFILES={
  tillfällig:{label:'Tillfällig (en jakt, ungefär var tredje dag)',p:.33,runs:[1,1],walk:0,hidden:0,doors:.15},
  vanlig:{label:'Vanlig (2–3 jakter, fem dagar av sju)',p:.71,runs:[2,3],walk:10,hidden:.15,doors:.5},
  ivrig:{label:'Ivrig (5–8 jakter och fri vandring varje dag)',p:.97,runs:[5,8],walk:40,hidden:.7,doors:.9}
};
const pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))];};
const out={};
for(const [key,P] of Object.entries(PROFILES)){
  const res=[];
  for(let i=0;i<N;i++){
    const rnd=mulberry(1000*i+key.length*7+13),m=new XmasMeta({storage:mem(),rng:mulberry(i*31+5),policy:POLICY});
    const between=([a,b])=>a+Math.floor(rnd()*(b-a+1));
    let first=true,hiddenFound=0,playedDays=0,runsTotal=0;
    const willDo=Array.from({length:25},()=>rnd()<P.doors),delay=Array.from({length:25},()=>Math.floor(rnd()*4)),line=[];
    for(let n=0;n<28;n++){
      const date=new Date(Date.UTC(2026,10,27+n,9)),day=dayOf(date);
      if(!(first||rnd()<P.p)){if([6,13,20,27].includes(n)){const t=m.status(date);line.push([t.level.n,t.ornaments.owned,t.tickets]);}continue;}
      playedDays++;
      const runs=between(P.runs);
      for(let k=0;k<runs;k++){
        const when=new Date(date.getTime()+k*40*60e3),[id,area]=first?['intro','torget']:ROUNDS[Math.floor(rnd()*3)];
        const packages=first?14:18+Math.floor(rnd()*10),chain=2+Math.floor(rnd()*9);
        m.onRun({kind:'hunt',id,cleared:true,packages,bonus:1+Math.floor(rnd()*3),chain,seconds:110+Math.floor(rnd()*160),area},when);
        first=false;runsTotal++;
      }
      for(let k=0;k<P.walk;k++)m.onPick({kind:rnd()<.12?'bonus':'regular',chain:1+Math.floor(rnd()*4)},new Date(date.getTime()+6*3600e3+k*20e3));
      if(rnd()<P.hidden&&hiddenFound<HIDDEN_SPOTS.length){const s=HIDDEN_SPOTS.filter(x=>!(x.id in m.state.hidden))[0];if(s){m.onHidden(s.id,date);hiddenFound++;}}
      // kalenderluckor: de som öppnats och som spelaren klarar
      m.syncCalendar(d=>willDo[d]&&dayDiff(doorDay(d),day)>=delay[d],date);
      if([6,13,20,27].includes(n)){const t=m.status(new Date(date.getTime()+12*3600e3));line.push([t.level.n,t.ornaments.owned,t.tickets]);}
    }
    const s=m.status(new Date(Date.UTC(2026,11,24,12)));
    const bySrc={};for(const t of m.state.tickets)bySrc[t.s]=(bySrc[t.s]||0)+1;
    res.push({line,grade:s.level.n,xp:s.xp,orn:s.ornaments.owned,tickets:s.tickets,streak:m.state.streak.best,days:playedDays,runs:runsTotal,hidden:hiddenFound,bySrc});
  }
  out[key]=res;
  const f=k=>`${pct(res.map(r=>r[k]),.1)} / ${pct(res.map(r=>r[k]),.5)} / ${pct(res.map(r=>r[k]),.9)}`;
  console.log(`\n${P.label}   (${N} spelare; tiondel / median / nionde tiondel)`);
  console.log(`  speldagar ${f('days')} · jakter ${f('runs')} · längsta serie ${f('streak')}`);
  console.log(`  grad (av ${LEVELS.length}) ${f('grade')} · XP ${f('xp')} · prydnader (av ${ORNAMENTS.length}) ${f('orn')} · lotter ${f('tickets')} · gömda ${f('hidden')}`);
  const srcs=new Set(res.flatMap(r=>Object.keys(r.bySrc)));
  console.log('  lotter per källa (median): '+[...srcs].sort().map(s=>s+' '+pct(res.map(r=>r.bySrc[s]||0),.5)).join(' · '));
  const med=i=>[0,1,2].map(k=>pct(res.map(r=>(r.line[i]||[0,0,0])[k]),.5)).join('/');
  console.log(`  mitt i säsongen (grad/prydnader/lotter, median) efter vecka 1: ${med(0)} · vecka 2: ${med(1)} · vecka 3: ${med(2)} · vecka 4: ${med(3)}`);
  console.log(`  andel som fyllt granen: ${Math.round(100*res.filter(r=>r.orn===ORNAMENTS.length).length/N)} % · nått grad 12: ${Math.round(100*res.filter(r=>r.grade===12).length/N)} %`);
}
void CALENDAR;
