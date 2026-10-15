// Julkalenderns regler: datum, luckor som öppnas, avläsning av Julspelets sparning och kalenderns eget tillstånd.
import test from 'node:test';
import assert from 'node:assert/strict';
import {SEASON,STORAGE_KEY,TEST_KEY,GAME_SAVE_KEY,METRICS,stockholmDay,validDay,doorDay,daysBetween,weekdayOf,shortDate,adventSundays,resolveToday,phaseOf,testModeFrom,doorAccess,
  readGame,emptyGame,metricsOf,evaluate,rankFor,RANKS,Julkalender} from '../julkalender/rules.mjs';
import {DOORS} from '../julkalender/doors.mjs';

// Minimal Storage med samma gränssnitt som webbläsarens.
class Store{
  constructor(init={}){this.m=new Map(Object.entries(init).map(([k,v])=>[k,typeof v==='string'?v:JSON.stringify(v)]));}
  get length(){return this.m.size;}
  key(i){return [...this.m.keys()][i]??null;}
  getItem(k){return this.m.has(k)?this.m.get(k):null;}
  setItem(k,v){this.m.set(k,String(v));}
  removeItem(k){this.m.delete(k);}
}
const boom={get length(){throw new Error('lagring avstängd');},key(){throw new Error('x');},getItem(){throw new Error('x');},setItem(){throw new Error('x');},removeItem(){throw new Error('x');}};
const save=over=>({v:1,stamps:{},records:{},totals:{packages:0,bonus:0,points:0,runs:0},opts:{weather:'full'},intro:{done:false},rush:{cleared:0,stars:{},best:{},bestStreak:0},zombies:{cleared:0,best:{}},name:'',friends:[],...over});
const store=over=>new Store({[GAME_SAVE_KEY]:save(over)});

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

// ── Avläsning av Julspelets sparning ─────────────────────────────────────────────────────────────────────
const played=()=>store({
  stamps:{intro:1700000000000,'round-torget':1700000000001,zombies:1700000000002},
  records:{julrush:{points:5200,seconds:70,packages:30,bonus:2,level:7},intro:{points:400,seconds:60,packages:14,bonus:1,level:0}},
  totals:{packages:120,bonus:5,points:1300,runs:9},
  rush:{cleared:5,stars:{1:3,2:2,5:1},best:{1:{points:900},2:{points:2300},4:{points:4700},5:{points:5000}},bestStreak:3},
  zombies:{cleared:2,best:{1:{points:800},2:{points:900}}},name:'  Åsa  '
});
test('readGame läser allt kalendern behöver ur Julspelets sparning',()=>{
  const g=readGame(played());
  assert.deepEqual(g.stamps.sort(),['intro','round-torget','zombies']);
  assert.deepEqual(g.rush,{cleared:5,best:{1:900,2:2300,4:4700,5:5000},stars:{1:3,2:2,5:1}});
  assert.deepEqual(g.zombies,{cleared:2,best:{1:800,2:900}});
  assert.deepEqual(g.marathon,{level:7,points:5200});
  assert.deepEqual(g.totals,{packages:120,bonus:5,points:1300,runs:9});
  assert.equal(g.name,'Åsa');
  assert.deepEqual(metricsOf(g),{packages:120,bonus:5,points:1300,runs:9});
  assert.deepEqual(Object.keys(metricsOf(g)).sort(),[...METRICS].sort());
});
test('readGame följer spelets egen sanering: en klarad nivå kan inte vara låst, och Tomtezombies-stämpeln är nivå 1',()=>{
  const g=readGame(store({rush:{cleared:0,stars:{},best:{3:{points:2000}}},zombies:{cleared:0,best:{}},stamps:{zombies:5}}));
  assert.equal(g.rush.cleared,3);assert.equal(g.zombies.cleared,1);
});
test('readGame tål saknad, trasig, felformad, främmande version och avstängd lagring',()=>{
  const none=emptyGame();
  assert.deepEqual(none.stamps,[]);assert.equal(none.rush.cleared,0);assert.equal(none.zombies.cleared,0);assert.equal(none.totals.packages,0);assert.equal(none.name,'');
  for(const raw of ['{inte json','[1,2]','"x"','null','42',JSON.stringify({v:2,stamps:{intro:1}}),JSON.stringify({v:1,stamps:[1],rush:'x',zombies:7,totals:'y',records:5,name:9})]){
    assert.deepEqual(readGame(new Store({[GAME_SAVE_KEY]:raw})),none,raw);
  }
  assert.deepEqual(readGame(boom),none);assert.deepEqual(readGame(undefined),none);
  const wild=readGame(store({totals:{packages:'7',bonus:-3,points:1e30,runs:'x'},rush:{cleared:'99999',stars:{1:9,x:2,0:3,100:3},best:{1000:{points:5},2:{points:-9}}},name:'abcdefghijklmnopqrstuvwxyz'}));
  assert.equal(wild.totals.packages,7);assert.equal(wild.totals.bonus,0);assert.equal(wild.totals.points,99999999);assert.equal(wild.totals.runs,0);
  assert.equal(wild.rush.cleared,99);assert.deepEqual(wild.rush.stars,{1:3});assert.deepEqual(wild.rush.best,{});assert.equal(wild.name,'abcdefghijkl');
});
test('readGame ändrar aldrig Julspelets sparning',()=>{
  const s=played(),before=JSON.stringify([...s.m]);readGame(s);
  assert.equal(JSON.stringify([...s.m]),before);
});

// ── Villkor ──────────────────────────────────────────────────────────────────────────────────────────────
test('evaluate: stämplar, rusher, poäng, stjärnor, Maraton och Tomtezombies',()=>{
  const g=readGame(played());
  assert.equal(evaluate({kind:'stamp',id:'intro'},g).done,true);assert.equal(evaluate({kind:'stamp',id:'cervera'},g).done,false);
  assert.deepEqual(evaluate({kind:'stamps',n:5},g),{done:false,have:3,need:5,raw:3});assert.equal(evaluate({kind:'stamps',n:3},g).done,true);
  assert.deepEqual(evaluate({kind:'rush',n:8},g),{done:false,have:5,need:8,raw:5});assert.equal(evaluate({kind:'rush',n:5},g).done,true);
  const rp=evaluate({kind:'rushPoints',n:4,min:4500},g);assert.deepEqual([rp.done,rp.have,rp.raw],[true,4500,4700]);
  assert.equal(evaluate({kind:'rushPoints',n:4,min:4800},g).done,false);assert.equal(evaluate({kind:'rushPoints',n:3,min:1},g).done,false,'rush 3 saknar rekord');
  assert.equal(evaluate({kind:'rushStars',min:3},g).done,true);assert.equal(evaluate({kind:'rushStars',min:3},readGame(store({rush:{cleared:2,stars:{1:2,2:2},best:{1:{points:1},2:{points:1}}}}))).done,false);
  assert.equal(evaluate({kind:'marathon',min:6},g).done,true);assert.equal(evaluate({kind:'marathon',min:8},g).done,false);
  assert.equal(evaluate({kind:'zombies',n:2},g).done,true);assert.equal(evaluate({kind:'zombies',n:4},g).done,false);
  assert.deepEqual(evaluate({kind:'points',min:900},g).done,true);assert.equal(evaluate({kind:'points',min:2400},g).done,false);
  assert.equal(evaluate({kind:'name'},g).done,true);assert.equal(evaluate({kind:'name'},emptyGame()).done,false);
});
test('evaluate: räknare mäts mot baslinjen, aldrig under noll',()=>{
  const g=readGame(played());
  const c={kind:'count',metric:'packages',n:50};
  assert.deepEqual(evaluate(c,g,{}),{done:true,have:50,need:50,raw:120});
  assert.deepEqual(evaluate(c,g,{packages:100}),{done:false,have:20,need:50,raw:20});
  assert.equal(evaluate(c,g,{packages:120}).raw,0);assert.equal(evaluate(c,g,{packages:999}).raw,0);
});
test('evaluate: all kräver alla delar och visar var och en; manuella villkor läses inte av',()=>{
  const g=readGame(played());
  const all={kind:'all',of:[{kind:'stamp',id:'intro',label:'A'},{kind:'stamp',id:'cervera',label:'B'}]};
  const e=evaluate(all,g,{});
  assert.deepEqual([e.done,e.have,e.need],[false,1,2]);assert.deepEqual(e.parts.map(p=>[p.label,p.done]),[['A',true],['B',false]]);
  const m=evaluate({kind:'manual'},g);assert.deepEqual([m.done,m.manual],[false,true]);
  assert.equal(evaluate(undefined,g).done,false);assert.equal(evaluate({kind:'okänt'},g).done,false);assert.equal(evaluate({kind:'stamp',id:'x'},null).done,false);
});

// ── Titlar ───────────────────────────────────────────────────────────────────────────────────────────────
test('titlar följer stjärnorna',()=>{
  assert.equal(rankFor(0).name,'Julnisse');assert.equal(rankFor(5).name,'Julnisse');assert.equal(rankFor(6).name,'Pepparkaksbagare');
  const total=DOORS.reduce((s,d)=>s+d.stjarnor,0);
  assert.equal(rankFor(total-1).name,'Granmästare');assert.equal(rankFor(total).name,'Karlstads tomte');assert.equal(rankFor(total).next,null);
  assert.equal(rankFor(0).next.min,6);
  assert.equal(RANKS.at(-1).min,total,'högsta titeln kräver alla stjärnor');
  assert.ok(RANKS.every((r,i)=>i===0||r.min>RANKS[i-1].min),'stigande gränser');
});

// ── Kalenderns tillstånd ─────────────────────────────────────────────────────────────────────────────────
const open=day=>({day,isOpen:n=>n<=Number(day.slice(8))});
test('första besöket sätter baslinjen; räknare räknas från den, stämplar och nivåer räknas alltid',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  const g1=readGame(store({stamps:{intro:1},totals:{packages:80,bonus:0,points:0,runs:2}}));
  assert.deepEqual(cal.refresh(g1,open('2026-12-14')),[1],'stämpeln intro räknas även om den togs före kalendern');
  assert.equal(cal.baseline.packages,80);assert.equal(cal.isDone(14),false,'lucka 14 kräver 100 NYA paket');
  const g2=readGame(store({stamps:{intro:1},totals:{packages:150,bonus:0,points:0,runs:2}}));
  assert.deepEqual(cal.refresh(g2,open('2026-12-14')),[],'70 nya paket räcker inte');
  const g3=readGame(store({stamps:{intro:1},totals:{packages:185,bonus:0,points:0,runs:2}}));
  assert.deepEqual(cal.refresh(g3,open('2026-12-14')),[14]);
  assert.equal(cal.how(14),'auto');assert.ok(cal.isOpened(14),'en klar lucka räknas som öppnad');
});
test('luckor som inte öppnats än bockas aldrig av, även om spelet redan klarat dem',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  const g=readGame(played());
  const newly=cal.refresh(g,open('2026-12-03'));
  assert.ok(newly.every(n=>n<=3),String(newly));
  assert.ok(!cal.isDone(12)&&!cal.isDone(24));
  const later=cal.refresh(g,open('2026-12-24'));
  assert.ok(later.includes(12)&&later.includes(4)&&later.includes(21),'dagen efter öppnas de och räknas: '+later);
});
test('manuella luckor kräver själv-markering och går att ångra; avlästa går inte att ångra',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  cal.refresh(emptyGame(),open('2026-12-24'));
  assert.equal(cal.isDone(6),false,'Sandgrund finns i Karlstad City, inte i Julspelet');
  assert.equal(cal.markManual(6,'2026-12-06'),true);assert.equal(cal.how(6),'manual');assert.equal(cal.markManual(6),false);
  assert.equal(cal.unmarkManual(6),true);assert.equal(cal.isDone(6),false);assert.equal(cal.unmarkManual(6),false);
  cal.refresh(readGame(store({stamps:{intro:1}})),open('2026-12-24'));
  assert.equal(cal.how(1),'auto');assert.equal(cal.unmarkManual(1),false);
  assert.equal(cal.markManual(99),false);
});
test('klara luckor blir kvar även om spelsparningen nollställs, och baslinjen följer med ner',()=>{
  const s=new Store(),cal=new Julkalender({doors:DOORS,storage:s});
  cal.refresh(readGame(store({stamps:{intro:1},totals:{packages:500,bonus:0,points:0,runs:0}})),open('2026-12-24'));
  assert.equal(cal.isDone(1),true);
  const empty=cal.refresh(emptyGame(),open('2026-12-24'));
  assert.deepEqual(empty,[]);assert.equal(cal.isDone(1),true,'klar förblir klar');assert.equal(cal.baseline.packages,0,'baslinjen sänks');
  const again=cal.refresh(readGame(store({totals:{packages:120,bonus:0,points:0,runs:0}})),open('2026-12-24'));
  assert.deepEqual(again,[14],'120 nya paket efter nollställningen räknas');
});
test('stjärnor, antal klara och titel',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  assert.equal(cal.totalStars,DOORS.reduce((s,d)=>s+d.stjarnor,0));assert.equal(cal.stars,0);assert.equal(cal.rank.name,'Julnisse');
  cal.markManual(6);cal.markManual(24);cal.markManual(2);
  assert.equal(cal.doneCount,3);assert.equal(cal.stars,3+3+2);assert.equal(cal.rank.name,'Pepparkaksbagare');
});
test('tillståndet sparas, läses tillbaka och valideras',()=>{
  const s=new Store(),a=new Julkalender({doors:DOORS,storage:s});
  a.open(3);a.markManual(6,'2026-12-06');a.refresh(readGame(store({stamps:{intro:1}})),open('2026-12-24'));
  const b=new Julkalender({doors:DOORS,storage:s});
  assert.equal(b.isOpened(3),true);assert.equal(b.how(6),'manual');assert.equal(b.how(1),'auto');assert.equal(b.doneCount,a.doneCount);assert.deepEqual(b.baseline,a.baseline);
  const evil=new Store({[STORAGE_KEY]:{version:1,opened:{99:true,'x':true,5:true,6:'ja'},done:{0:{how:'auto'},25:{how:'auto'},4:{how:'hack',at:'imorgon'},7:'x'},baseline:{packages:'9',okänd:5}}});
  const c=new Julkalender({doors:DOORS,storage:evil});
  assert.deepEqual(Object.keys(c.state.opened).map(Number).sort((x,y)=>x-y),[4,5]);
  assert.deepEqual(c.state.done[4],{at:'',how:'auto'});assert.equal(c.doneCount,1);assert.equal(c.baseline.packages,9);assert.ok(!('okänd' in c.baseline));
  for(const junk of ['{','[]','"x"','null',JSON.stringify({version:2,done:{1:{how:'auto'}}})])assert.equal(new Julkalender({doors:DOORS,storage:new Store({[STORAGE_KEY]:junk})}).doneCount,0);
});
test('kalendern fungerar utan lagring (privat läge) och när lagringen kastar',()=>{
  for(const st of [null,undefined,boom]){
    const cal=new Julkalender({doors:DOORS,storage:st});
    assert.doesNotThrow(()=>{cal.open(1);cal.markManual(6);cal.refresh(emptyGame(),open('2026-12-24'));cal.reset();});
  }
  const cal=new Julkalender({doors:DOORS,storage:null});cal.markManual(6);assert.equal(cal.isDone(6),true,'minnet räcker under sidans liv');
});
test('reset nollställer allt i kalendern men inte spelet',()=>{
  const s=store({stamps:{intro:1}}),cal=new Julkalender({doors:DOORS,storage:s}),before=s.getItem(GAME_SAVE_KEY);
  cal.markManual(6);cal.open(2);cal.reset();
  assert.equal(cal.doneCount,0);assert.equal(cal.isOpened(2),false);assert.equal(s.getItem(GAME_SAVE_KEY),before);
  assert.equal(new Julkalender({doors:DOORS,storage:s}).doneCount,0);
});
test('progress ger siffrorna för en lucka',()=>{
  const cal=new Julkalender({doors:DOORS,storage:new Store()});
  cal.refresh(readGame(store({totals:{packages:10,bonus:0,points:0,runs:0}})),{day:'2026-12-01',isOpen:()=>false});
  const p=cal.progress(14,readGame(store({totals:{packages:60,bonus:0,points:0,runs:0}})));
  assert.deepEqual([p.have,p.need,p.done],[50,100,false]);assert.equal(cal.progress(99,emptyGame()),null);
});
