import test from 'node:test';
import assert from 'node:assert/strict';
import {SEASON,STORAGE_KEY,TEST_KEY,GAME_KEYS,METRICS,stockholmDay,validDay,doorDay,daysBetween,weekdayOf,shortDate,adventSundays,resolveToday,phaseOf,testModeFrom,doorAccess,
  readGame,emptyGame,evaluate,rankFor,RANKS,Julkalender} from '../rules.mjs';
import {DOORS} from '../doors.mjs';

// Minimal Storage med samma gränssnitt som webbläsarens (inklusive length/key, som dagliga vinster läses med).
class Store{
  constructor(init={}){this.m=new Map(Object.entries(init).map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)]));}
  get length(){return this.m.size;}
  key(i){return [...this.m.keys()][i]??null;}
  getItem(k){return this.m.has(k)?this.m.get(k):null;}
  setItem(k,v){this.m.set(k,String(v));}
  removeItem(k){this.m.delete(k);}
}
const boom={get length(){throw new Error('lagring avstängd');},key(){throw new Error('x');},getItem(){throw new Error('x');},setItem(){throw new Error('x');},removeItem(){throw new Error('x');}};

// ── Datum ────────────────────────────────────────────────────────────────────────────────────────────────────
test('dagens datum räknas i svensk tid, också runt midnatt och sommartid',()=>{
  assert.equal(stockholmDay(new Date('2026-12-01T22:59:59Z')),'2026-12-01');
  assert.equal(stockholmDay(new Date('2026-12-01T23:00:00Z')),'2026-12-02','svensk midnatt (UTC+1 på vintern)');
  assert.equal(stockholmDay(new Date('2026-07-01T22:00:00Z')),'2026-07-02','UTC+2 på sommaren');
});
test('datumhjälpare: giltighet, luckdatum, veckodag, advent och antal dagar',()=>{
  assert.ok(validDay('2026-12-24'));assert.ok(!validDay('2026-02-30'));assert.ok(!validDay('24 dec'));assert.ok(!validDay(null));
  assert.equal(doorDay(5),'2026-12-05');assert.equal(doorDay(24),'2026-12-24');
  assert.equal(daysBetween('2026-10-15','2026-12-01'),47);assert.equal(daysBetween('2026-12-05','2026-12-01'),-4);
  assert.equal(weekdayOf('2026-12-24'),'torsdag');assert.equal(weekdayOf('2026-12-01'),'tisdag');
  assert.equal(shortDate('2026-12-06'),'6 dec');
  assert.deepEqual(adventSundays(2026),['2026-11-29','2026-12-06','2026-12-13','2026-12-20']);
  for(const d of adventSundays(2026))assert.equal(weekdayOf(d),'söndag');
  assert.deepEqual(adventSundays(2023),['2023-12-03','2023-12-10','2023-12-17','2023-12-24'],'julafton på en söndag: fjärde advent är samma dag');
});
test('?datum och ?dag simulerar en dag, ogiltiga värden ignoreras',()=>{
  const now=new Date('2026-10-15T10:00:00Z');
  assert.deepEqual(resolveToday(now,''),{day:'2026-10-15',simulated:false});
  assert.deepEqual(resolveToday(now,'?datum=2026-12-10'),{day:'2026-12-10',simulated:true});
  assert.deepEqual(resolveToday(now,'?dag=7'),{day:'2026-12-07',simulated:true});
  for(const bad of ['?dag=0','?dag=25','?dag=abc','?datum=2026-13-01','?datum=x'])assert.equal(resolveToday(now,bad).simulated,false,bad);
});
test('säsongens faser: före, under och efter',()=>{
  assert.equal(phaseOf('2026-11-30'),'before');assert.equal(phaseOf('2026-12-01'),'during');assert.equal(phaseOf('2026-12-24'),'during');assert.equal(phaseOf('2026-12-25'),'after');
});
test('testläget slås på och av med ?test och sparas',()=>{
  const s=new Store();
  assert.equal(testModeFrom('',s),false);
  assert.equal(testModeFrom('?test',s),true);assert.equal(s.getItem(TEST_KEY),'1');
  assert.equal(testModeFrom('',s),true,'minns valet');
  assert.equal(testModeFrom('?test=0',s),false);assert.equal(s.getItem(TEST_KEY),null);
  assert.equal(testModeFrom('?test',boom),true,'trasig lagring stoppar inte');assert.equal(testModeFrom('',boom),false);
});
test('luckor öppnas på sin dag och står sedan öppna; testläget öppnar alla',()=>{
  assert.equal(doorAccess(1,'2026-11-30').open,false);assert.equal(doorAccess(1,'2026-11-30').daysLeft,1);
  assert.equal(doorAccess(1,'2026-12-01').open,true);assert.equal(doorAccess(1,'2026-12-01').today,true);
  assert.equal(doorAccess(1,'2026-12-02').open,true);assert.equal(doorAccess(1,'2026-12-02').today,false);
  assert.equal(doorAccess(24,'2026-12-23').open,false);assert.equal(doorAccess(24,'2027-01-02').open,true);
  assert.equal(doorAccess(24,'2026-10-15',true).open,true);assert.equal(doorAccess(24,'2026-10-15',true).daysLeft,70);
});

// ── Avläsning av spelet ──────────────────────────────────────────────────────────────────────────────────
const played=()=>new Store({
  [GAME_KEYS.missions]:{'radda-fikat':true,sandgrund:true,fikapanik:false},
  [GAME_KEYS.rush]:'1240',[GAME_KEYS.boat]:'210',[GAME_KEYS.trail]:'455',
  [GAME_KEYS.tempo]:{level:7,score:900,picked:30,runs:4},
  [GAME_KEYS.fun]:{version:1,collected:['marieberg-a','fx-marieberg-b','mall-1','mall-2','mall-3','t-1','kil-1'],badges:['pass-1','chain-5'],bestChain:9,
    stats:{thermos:42,rides:3,quizCorrect:5,quizPerfect:1,treasures:4,flashDone:2,powerups:1,turboMeters:1500,checkins:1}},
  [GAME_KEYS.places]:{version:1,places:{pressbyran:{completed:1,stamped:1700000000000},cervera:{completed:0,stamped:1700000000000},x:{completed:1,stamped:0}}},
  'karlstad:daily:8:2026-12-03':{best:1100,attempts:2,wins:1},
  'karlstad:daily:8:2026-11-20':{best:1100,attempts:1,wins:1},
  'karlstad:daily:8:2026-12-04':{best:0,attempts:3,wins:0},
  'karlstad:daily:8:inte-ett-datum':{wins:5},'annat:nyckel':'x'
});
test('readGame läser allt kalendern behöver ur spelets sparfiler',()=>{
  const g=readGame(played());
  assert.deepEqual(g.missions,{'radda-fikat':true,sandgrund:true},'bara klarade uppdrag');
  assert.deepEqual(g.records,{rush:1240,boat:210,trail:455,tempoLevel:7,tempoScore:900,chain:9});
  assert.deepEqual(g.badges,['pass-1','chain-5']);
  assert.deepEqual(g.stamps,['pressbyran'],'stämpel kräver genomfört uppdrag, precis som i spelet');
  assert.deepEqual(g.dailyWins.sort(),['2026-11-20','2026-12-03']);
  assert.deepEqual(g.metrics,{thermos:42,rides:3,quizCorrect:5,quizPerfect:1,treasures:4,flashDone:2,powerups:1,turboMeters:1500,checkins:1,mall:3,marieberg:2});
  assert.deepEqual(Object.keys(g.metrics).sort(),[...METRICS].sort());
});
test('readGame tål saknad, trasig, felformad och avstängd lagring',()=>{
  const none=emptyGame();
  assert.deepEqual(none.missions,{});assert.equal(none.records.rush,0);assert.deepEqual(none.stamps,[]);assert.equal(none.metrics.thermos,0);
  const junk=new Store({[GAME_KEYS.missions]:'{inte json',[GAME_KEYS.fun]:'[1,2]',[GAME_KEYS.tempo]:'"x"',[GAME_KEYS.places]:{places:[1]},[GAME_KEYS.rush]:'NaN',[GAME_KEYS.trail]:'-5'});
  assert.deepEqual(readGame(junk),none);
  assert.deepEqual(readGame(boom),none);assert.deepEqual(readGame(undefined),none);
  const wild=readGame(new Store({[GAME_KEYS.fun]:{stats:{thermos:'7',rides:-3,turboMeters:1e30},bestChain:'9',badges:[1,2]},[GAME_KEYS.rush]:'99999999'}));
  assert.equal(wild.metrics.thermos,7);assert.equal(wild.metrics.rides,0);assert.equal(wild.metrics.turboMeters,1e9);assert.equal(wild.records.chain,9);assert.equal(wild.records.rush,999999);assert.deepEqual(wild.badges,['1','2']);
});
test('readGame ändrar aldrig spelets sparfiler',()=>{
  const s=played(),before=JSON.stringify([...s.m]);readGame(s);
  assert.equal(JSON.stringify([...s.m]),before);
});

// ── Villkor ──────────────────────────────────────────────────────────────────────────────────────────────
test('evaluate: uppdrag, rekord, stämpel, märke och dagens utmaning',()=>{
  const g=readGame(played());
  assert.equal(evaluate({kind:'mission',id:'sandgrund'},g).done,true);
  assert.equal(evaluate({kind:'mission',id:'fikapanik'},g).done,false);
  const r=evaluate({kind:'record',src:'rush',min:1300},g);assert.deepEqual([r.done,r.have,r.need,r.raw],[false,1240,1300,1240]);
  assert.equal(evaluate({kind:'record',src:'rush',min:1000},g).done,true);
  assert.equal(evaluate({kind:'record',src:'tempoLevel',min:9},g).done,false);assert.equal(evaluate({kind:'record',src:'tempoLevel',min:6},g).done,true);
  assert.equal(evaluate({kind:'stamp',id:'pressbyran'},g).done,true);assert.equal(evaluate({kind:'stamp',id:'cervera'},g).done,false);
  assert.equal(evaluate({kind:'badge',id:'chain-5'},g).done,true);assert.equal(evaluate({kind:'badge',id:'pass-all'},g).done,false);
  assert.equal(evaluate({kind:'daily',n:1},g).done,true,'3 dec räknas');assert.equal(evaluate({kind:'daily',n:2},g).done,false,'20 nov ligger före säsongen');
});
test('evaluate: räknare mäts mot baslinjen, aldrig under noll',()=>{
  const g=readGame(played());
  const c={kind:'count',metric:'thermos',n:5};
  assert.deepEqual(evaluate(c,g,{}),{done:true,have:5,need:5,raw:42});
  assert.deepEqual(evaluate(c,g,{thermos:40}),{done:false,have:2,need:5,raw:2});
  assert.equal(evaluate(c,g,{thermos:42}).raw,0);assert.equal(evaluate(c,g,{thermos:99}).raw,0);
});
test('evaluate: all kräver alla delar och visar var och en; manuella villkor läses inte av',()=>{
  const g=readGame(played());
  const all={kind:'all',of:[{kind:'record',src:'boat',min:1,label:'A'},{kind:'count',metric:'marieberg',n:3,label:'B'}]};
  const e=evaluate(all,g,{});
  assert.deepEqual([e.done,e.have,e.need],[false,1,2]);assert.deepEqual(e.parts.map(p=>[p.label,p.done]),[['A',true],['B',false]]);
  assert.equal(evaluate(all,g,{marieberg:-1}).done,true);
  const m=evaluate({kind:'manual'},g);assert.deepEqual([m.done,m.manual],[false,true]);
  assert.equal(evaluate(undefined,g).done,false);assert.equal(evaluate({kind:'okänt'},g).done,false);assert.equal(evaluate({kind:'mission',id:'x'},null).done,false);
});

// ── Titlar ───────────────────────────────────────────────────────────────────────────────────────────────
test('titlar följer stjärnorna',()=>{
  assert.equal(rankFor(0).name,'Julnisse');assert.equal(rankFor(5).name,'Julnisse');assert.equal(rankFor(6).name,'Pepparkaksbagare');
  assert.equal(rankFor(45).name,'Granmästare');assert.equal(rankFor(46).name,'Karlstads tomte');assert.equal(rankFor(46).next,null);
  assert.equal(rankFor(0).next.min,6);
  const total=DOORS.reduce((s,d)=>s+d.stjarnor,0);
  assert.equal(RANKS.at(-1).min,total,'högsta titeln kräver alla stjärnor');
  assert.ok(RANKS.every((r,i)=>i===0||r.min>RANKS[i-1].min),'stigande gränser');
});

// ── Kalenderns tillstånd ─────────────────────────────────────────────────────────────────────────────────
const open=day=>({day,isOpen:n=>n<=Number(day.slice(8))});
test('första besöket sätter baslinjen och bockar av öppna luckor som redan är uppfyllda',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  const g1=readGame(new Store({[GAME_KEYS.fun]:{stats:{thermos:20,rides:2},badges:[]},[GAME_KEYS.missions]:{sandgrund:true}}));
  const newly=cal.refresh(g1,open('2026-12-06'));
  assert.deepEqual(newly,[6],'bara sandgrund: lucka 1 kräver 5 NYA termosar och räknas från 20');
  assert.equal(cal.baseline.thermos,20);assert.equal(cal.isDone(1),false);
  const g2=readGame(new Store({[GAME_KEYS.fun]:{stats:{thermos:26,rides:2},badges:[]},[GAME_KEYS.missions]:{sandgrund:true}}));
  assert.deepEqual(cal.refresh(g2,open('2026-12-06')),[1]);
  assert.equal(cal.how(1),'auto');assert.ok(cal.isOpened(1),'en klar lucka räknas som öppnad');
});
test('luckor som inte öppnats än bockas aldrig av, även om spelet redan klarat dem',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  const g=readGame(played());
  const newly=cal.refresh(g,open('2026-12-03'));
  assert.ok(newly.every(n=>n<=3),String(newly));
  assert.ok(!cal.isDone(6)&&!cal.isDone(24));
  const later=cal.refresh(g,open('2026-12-24'));
  assert.ok(later.includes(6)&&later.includes(7)&&later.includes(15),'dagen efter öppnas de och räknas');
});
test('manuella luckor kräver själv-markering och går att ångra; avlästa går inte att ångra',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  cal.refresh(emptyGame(),open('2026-12-24'));
  assert.equal(cal.isDone(12),false,'lucka 12 sparas inte i spelet');
  assert.equal(cal.markManual(12,'2026-12-12'),true);assert.equal(cal.how(12),'manual');assert.equal(cal.markManual(12),false);
  assert.equal(cal.unmarkManual(12),true);assert.equal(cal.isDone(12),false);assert.equal(cal.unmarkManual(12),false);
  cal.refresh(readGame(new Store({[GAME_KEYS.missions]:{fikapanik:true}})),open('2026-12-24'));
  assert.equal(cal.how(24),'auto');assert.equal(cal.unmarkManual(24),false);
  assert.equal(cal.markManual(99),false);
});
test('klara luckor blir kvar även om spelsparningen nollställs, och baslinjen följer med ner',()=>{
  const s=new Store(),cal=new Julkalender({doors:DOORS,storage:s});
  cal.refresh(readGame(new Store({[GAME_KEYS.fun]:{stats:{thermos:100}},[GAME_KEYS.missions]:{sandgrund:true}})),open('2026-12-10'));
  assert.equal(cal.isDone(6),true);
  const empty=cal.refresh(emptyGame(),open('2026-12-10'));
  assert.deepEqual(empty,[]);assert.equal(cal.isDone(6),true,'klar förblir klar');assert.equal(cal.baseline.thermos,0,'baslinjen sänks');
  const again=cal.refresh(readGame(new Store({[GAME_KEYS.fun]:{stats:{thermos:5}}})),open('2026-12-10'));
  assert.deepEqual(again,[1],'5 nya termosar efter nollställningen räknas');
});
test('stjärnor, antal klara och titel',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  assert.equal(cal.totalStars,46);assert.equal(cal.stars,0);assert.equal(cal.rank.name,'Julnisse');
  cal.markManual(6);cal.markManual(24);cal.markManual(2);
  assert.equal(cal.doneCount,3);assert.equal(cal.stars,3+3+2);assert.equal(cal.rank.name,'Pepparkaksbagare');
});
test('tillståndet sparas, läses tillbaka och valideras',()=>{
  const s=new Store(),a=new Julkalender({doors:DOORS,storage:s});
  a.open(3);a.markManual(12,'2026-12-12');a.refresh(readGame(new Store({[GAME_KEYS.missions]:{sandgrund:true}})),open('2026-12-24'));
  const b=new Julkalender({doors:DOORS,storage:s});
  assert.equal(b.isOpened(3),true);assert.equal(b.how(12),'manual');assert.equal(b.how(6),'auto');assert.equal(b.doneCount,a.doneCount);assert.deepEqual(b.baseline,a.baseline);
  const evil=new Store({[STORAGE_KEY]:{version:1,opened:{99:true,'x':true,5:true,6:'ja'},done:{0:{how:'auto'},25:{how:'auto'},4:{how:'hack',at:'imorgon'},7:'x'},baseline:{thermos:'9',okänd:5}}});
  const c=new Julkalender({doors:DOORS,storage:evil});
  assert.deepEqual(Object.keys(c.state.opened).map(Number).sort((x,y)=>x-y),[4,5]);
  assert.deepEqual(c.state.done[4],{at:'',how:'auto'});assert.equal(c.doneCount,1);assert.equal(c.baseline.thermos,9);assert.ok(!('okänd' in c.baseline));
  for(const junk of ['{','[]','"x"','null',JSON.stringify({version:2,done:{1:{how:'auto'}}})])assert.equal(new Julkalender({doors:DOORS,storage:new Store({[STORAGE_KEY]:junk})}).doneCount,0);
});
test('kalendern fungerar utan lagring (privat läge) och när lagringen kastar',()=>{
  for(const st of [null,undefined,boom]){
    const cal=new Julkalender({doors:DOORS,storage:st});
    assert.doesNotThrow(()=>{cal.open(1);cal.markManual(12);cal.refresh(emptyGame(),open('2026-12-24'));cal.reset();});
  }
  const cal=new Julkalender({doors:DOORS,storage:null});cal.markManual(12);assert.equal(cal.isDone(12),true,'minnet räcker under sidans liv');
});
test('reset nollställer allt i kalendern men inte spelet',()=>{
  const s=new Store({'karlstad:rush:best:1':'1500'}),cal=new Julkalender({doors:DOORS,storage:s});
  cal.markManual(12);cal.open(2);cal.reset();
  assert.equal(cal.doneCount,0);assert.equal(cal.isOpened(2),false);assert.equal(s.getItem('karlstad:rush:best:1'),'1500');
  assert.equal(new Julkalender({doors:DOORS,storage:s}).doneCount,0);
});
test('progress ger siffrorna för en lucka',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  cal.refresh(readGame(new Store({[GAME_KEYS.fun]:{stats:{thermos:10}}})),{day:'2026-12-01',isOpen:()=>false});
  const p=cal.progress(1,readGame(new Store({[GAME_KEYS.fun]:{stats:{thermos:13}}})));
  assert.deepEqual([p.have,p.need,p.done],[3,5,false]);assert.equal(cal.progress(99,emptyGame()),null);
});
