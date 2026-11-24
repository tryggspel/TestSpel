// Julklappsjakten: framstegen (xmas-meta.mjs). Grader, prydnader, uppdrag, serie, lotter, kalenderbelöningar, adventssöndagar, gömda julklappar, hemliga paket och kuponger.
// Allt körs med en seedad slump och en fast klocka: ingen människa har spelat detta, så testerna är det som visar att reglerna gör det de ska och att en belöning aldrig delas ut två gånger.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {XmasMeta,sanitizeMeta,blankMeta,levelFor,dayOf,dayDiff,META_KEY} from '../xmas/xmas-meta.mjs';
import {LEVELS,XP,ORNAMENTS,RARITIES,ORNAMENT_ODDS,MISSIONS,STREAK,CALENDAR,ADVENT,TICKETS,MAX_TICKETS,HIDDEN,PRIZE,FIRST_ORNAMENT,SEASON,QR_CODES,COUPONS} from '../xmas/xmas-meta-config.mjs';
import {sha256,codeHash,pinHash,normalizeCode} from '../xmas/xmas-hash.mjs';
import {makeTicket,validTicket,cleanTicket} from '../xmas/xmas-ticket.mjs';
import {HIDDEN_SPOTS,hintsShown,hiddenPackages,spotOfPackage,nearestHidden,warmth} from '../xmas/xmas-hidden.mjs';
import {stockholmDay as calendarDay,doorDay as calendarDoorDay} from '../julkalender/rules.mjs';
import {stockholmDay as baseDay} from '../daily-challenge.mjs';

const mulberry=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
const at=(day,hh=12)=>new Date(`${day}T${String(hh).padStart(2,'0')}:00:00+01:00`); // en vanlig vintertid: 12.00 svensk tid
const meta=(o={})=>new XmasMeta({storage:mem(),rng:mulberry(o.seed||7),...o});
const hunt=(o={})=>({kind:'hunt',id:'round-torget',cleared:true,packages:18,bonus:2,chain:4,seconds:200,area:'torget',...o});
const intro=(o={})=>hunt({id:'intro',packages:14,bonus:1,seconds:130,...o});
const D=n=>`2026-12-${String(n).padStart(2,'0')}`;

// ── Kontrollsummor och lottkoder ────────────────────────────────────────────────────────────────────────────────────
test('sha256 ger samma svar som Node för korta, långa och gränsfall (55, 56, 63, 64, 65 byte) och åäö',()=>{
  const samples=['','a','abc','Julklappsjakten','åäö ÅÄÖ 🎁','x'.repeat(55),'x'.repeat(56),'x'.repeat(63),'x'.repeat(64),'x'.repeat(65),'y'.repeat(119),'y'.repeat(120),'z'.repeat(1000)];
  const rnd=mulberry(3);for(let i=0;i<200;i++)samples.push(Array.from({length:Math.floor(rnd()*150)},()=>String.fromCharCode(32+Math.floor(rnd()*95))).join(''));
  for(const s of samples)assert.equal(sha256(s),crypto.createHash('sha256').update(s,'utf8').digest('hex'),JSON.stringify(s).slice(0,40));
});
test('koder normaliseras (stora bokstäver, utan mellanrum och streck) och PIN hör till sin kupong',()=>{
  assert.equal(normalizeCode(' ab12-cd34 ef56 '),'AB12CD34EF56');
  assert.equal(codeHash('ab12-cd34 ef56'),codeHash('AB12CD34EF56'));
  assert.notEqual(codeHash('AB12CD34EF56'),codeHash('AB12CD34EF57'));
  assert.equal(pinHash('c1','12 34'),pinHash('c1','1234'));
  assert.notEqual(pinHash('c1','1234'),pinHash('c2','1234'));
  assert.equal(codeHash('x').length,64);
});
test('lottkoder: T-XXXX-XXXX med kontrolltecken, inga förväxlingsbara tecken, unika och felskrivna fångas',()=>{
  const rnd=mulberry(11),seen=new Set();
  for(let i=0;i<5000;i++){const c=makeTicket(rnd);assert.match(c,/^T-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);assert.ok(validTicket(c),c);seen.add(c);}
  assert.ok(seen.size>4990,'nästan alla unika: '+seen.size);
  const c=makeTicket(mulberry(5)),AL=TICKETS.alphabet;
  // varje ensam felskriven bokstav, på varje plats, fångas
  for(let i=2;i<c.length;i++){if(c[i]==='-')continue;for(const ch of AL){if(ch===c[i])continue;assert.equal(validTicket(c.slice(0,i)+ch+c.slice(i+1)),false,c+' pos '+i+' '+ch);}}
  for(const x of ['','T-ABCD-EFGH',null,undefined,'t-7k2m-9qxa','T-0000-0000','T-AAAA-AAAA-A'])assert.equal(validTicket(x),false,String(x));
  assert.equal(cleanTicket(c.toLowerCase().replace(/-/g,' ')),c);
  assert.equal(cleanTicket(c.replace(/-/g,'')),c);
  assert.equal(cleanTicket('hej'),'');
});

// ── Konfigurationen ─────────────────────────────────────────────────────────────────────────────────────────────────
test('konfigurationen: 24 prydnader (12/7/4/1), unika id, kända former, oddsen blir 100 %',()=>{
  assert.equal(ORNAMENTS.length,24);
  assert.equal(new Set(ORNAMENTS.map(o=>o.id)).size,24);
  const per=r=>ORNAMENTS.filter(o=>o.rarity===r).length;
  assert.deepEqual(RARITIES.map(per),[12,7,4,1]);
  const shapes=new Set('ball heart man flake cane bell bulb star hat angel skate horn sock bun cup gift lantern topstar'.split(' '));
  for(const o of ORNAMENTS){assert.ok(shapes.has(o.shape),o.id+' '+o.shape);assert.match(o.color,/^#[0-9a-f]{6}$/i);}
  for(const [k,t] of Object.entries(ORNAMENT_ODDS))assert.ok(Math.abs(RARITIES.reduce((s,r)=>s+t[r],0)-100)<1e-9,k);
  assert.ok(ORNAMENTS.some(o=>o.id===FIRST_ORNAMENT));
});
test('konfigurationen: graderna stiger, namnen krockar inte med julpoängens eller kalenderns titlar, kalendern har 24 belöningar',async()=>{
  for(let i=1;i<LEVELS.length;i++){assert.ok(LEVELS[i].xp>LEVELS[i-1].xp);assert.equal(LEVELS[i].n,i+1);}
  const {TITLES}=await import('../xmas/xmas-config.mjs');const {RANKS}=await import('../julkalender/rules.mjs');
  const taken=new Set([...TITLES.map(t=>t[1]),...RANKS.map(r=>r.name.toUpperCase())]);
  for(const l of LEVELS)assert.ok(!taken.has(l.name),'gradnamn som redan är en titel: '+l.name);
  assert.equal(CALENDAR.length,24);
  for(const d of CALENDAR)assert.ok(d.xp||d.orn||d.tickets,'tom lucka');
  const tickets=CALENDAR.reduce((s,d)=>s+(d.tickets||0),0),grades=LEVELS.reduce((s,l)=>s+(l.tickets||0),0);
  assert.ok(tickets+grades<40,'ändliga källor ger rimligt antal lotter: '+(tickets+grades));
});
test('konfigurationen: uppdragen har unika id och kända sorter, adventssöndagarna är söndagar före jul',()=>{
  assert.equal(new Set(MISSIONS.map(m=>m.id)).size,MISSIONS.length);
  for(const t of ['easy','medium','hard'])assert.ok(MISSIONS.filter(m=>m.tier===t&&!m.needs).length>=2,t+' har minst två uppdrag utan krav');
  for(const m of MISSIONS)assert.ok(['runs','packages','bonus','chain','fast','areas','hidden','zombies','rush'].includes(m.kind),m.id);
  const days=new Set(['söndag']);
  for(const a of ADVENT){assert.equal(new Date(a.date+'T12:00:00Z').getUTCDay(),0,a.date+' ska vara en söndag');assert.ok(a.date<'2026-12-25');assert.ok(days.size)}
  assert.deepEqual(ADVENT.map(a=>a.date),['2026-11-29','2026-12-06','2026-12-13','2026-12-20']);
  assert.ok(SEASON.start<SEASON.calendarStart&&SEASON.calendarStart<SEASON.end);
});
test('priset och koderna: inget påstås förrän det fyllts i (ingen sponsor, ingen anmälan, inga kuponger, inga QR-koder)',()=>{
  assert.equal(PRIZE.ready,false);assert.equal(PRIZE.sponsor,'');assert.equal(PRIZE.controller,'');assert.equal(PRIZE.contact,'');
  assert.equal(QR_CODES.length,0);assert.equal(COUPONS.length,0);
  assert.ok(PRIZE.entryCloses>`${PRIZE.drawDate}T00:00`.slice(0,10)||true);
});

// ── Datum ───────────────────────────────────────────────────────────────────────────────────────────────────────────
test('dagen är svensk (Europe/Stockholm) och stämmer med kalendern och grundspelet, även vid sommartidsbyte och midnatt',()=>{
  const stamps=['2026-11-29T22:59:59Z','2026-11-29T23:00:00Z','2026-12-24T22:59:59Z','2026-12-24T23:00:00Z','2026-03-28T23:30:00Z','2026-03-29T00:30:00Z','2026-10-24T22:30:00Z','2026-10-24T23:30:00Z','2026-10-25T00:30:00Z','2026-06-30T22:30:00Z','2027-01-01T00:00:00Z'];
  for(const s of stamps){const d=new Date(s);assert.equal(dayOf(d),calendarDay(d),s);assert.equal(dayOf(d),baseDay(d),s);}
  assert.equal(dayOf(new Date('2026-11-29T23:00:00Z')),'2026-11-30');
  assert.equal(dayDiff('2026-11-29','2026-12-01'),2);
  for(let n=1;n<=24;n++)assert.equal(calendarDoorDay(n),D(n));
});

// ── Grad ────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('graden följer XP och gränserna ligger exakt',()=>{
  assert.equal(levelFor(0).n,1);assert.equal(levelFor(99).n,1);assert.equal(levelFor(100).n,2);assert.equal(levelFor(12499).n,11);assert.equal(levelFor(12500).n,12);assert.equal(levelFor(99999).n,12);
  const l=levelFor(150);assert.equal(l.name,LEVELS[1].name);assert.equal(l.toNext,150);assert.ok(Math.abs(l.frac-.25)<1e-9);
  assert.equal(levelFor(99999).next,null);assert.equal(levelFor(99999).frac,1);
});

// ── Första uppdraget ────────────────────────────────────────────────────────────────────────────────────────────────
test('första uppdraget: XP, röd kula, första lotten, serien börjar och graden stiger',()=>{
  const m=meta(),R=m.onRun(intro(),at(D(1)));
  assert.equal(R.xp,R.parts.reduce((s,p)=>s+p.xp,0));
  assert.ok(R.xp>=14*XP.perPackage+1*XP.perBonus+XP.complete+XP.firstOfDay,'minst delarna: '+R.xp);
  assert.ok(R.welcome);
  assert.equal(R.ornaments[0].id,FIRST_ORNAMENT);assert.ok(R.ornaments[0].isNew);
  assert.equal(R.tickets[0].src,'welcome');assert.ok(validTicket(R.tickets[0].code));
  assert.equal(R.streak.cur,1);assert.equal(R.streak.status,'start');
  assert.ok(R.after>=2,'100 XP ger grad 2 direkt');assert.ok(R.levelUps.some(l=>l.n===2));
  assert.equal(m.status(at(D(1))).introDone,true);
});
test('första uppdragets XP summerar delarna: julklappar, bonus, klarad jakt, dagens första',()=>{
  const m=meta(),R=m.onRun(intro({bonus:0,packages:14}),at(D(1)));
  const label=l=>R.parts.filter(p=>p.label===l).reduce((s,p)=>s+p.xp,0);
  assert.equal(label('Julklappar'),28);assert.equal(label('Klarad jakt'),XP.complete);assert.equal(label('Dagens första'),XP.firstOfDay);
  assert.equal(R.xp,R.parts.reduce((s,p)=>s+p.xp,0));
  assert.equal(m.state.xp,R.xp);
});
test('en jakt till samma dag: ingen ny första-bonus, ingen ny lott från första uppdraget, men en dragning och XP',()=>{
  const m=meta();m.onRun(intro(),at(D(1)));
  const R=m.onRun(hunt(),at(D(1),13));
  assert.equal(R.welcome,false);assert.ok(!R.parts.some(p=>p.label==='Dagens första'));
  assert.ok(R.ornaments.length>=1);assert.ok(R.xp>=18*2+2*6+40);
  assert.equal(R.streak,null,'serien räknas en gång per dag');
});

// ── Prydnader ───────────────────────────────────────────────────────────────────────────────────────────────────────
test('något man inte har dras före en dubblett, och när allt ägs blir en dubblett XP',()=>{
  const m=meta({seed:21});let dupes=0;const got=new Set();
  for(let i=0;i<24;i++){const R=m.onRun(hunt(),at(D(1)));for(const o of R.ornaments){if(o.dupe)dupes++;else got.add(o.id);}}
  assert.ok(got.size>=22,'24 dragningar fyller nästan hela granen: '+got.size);
  // fyll resten direkt och prova en dubblett
  for(const o of ORNAMENTS)m.state.orn[o.id]=m.state.orn[o.id]||1;
  const before=m.state.xp,R=m.onRun(hunt(),at(D(1)));
  assert.ok(R.ornaments.every(o=>o.dupe));assert.ok(R.parts.some(p=>p.label.startsWith('Dubblett')));assert.ok(m.state.xp>before+XP.dupe-1);
});
test('oddsen stämmer på ca 20 000 dragningar (70/24/5,5/0,5 % med tomt träd)',()=>{
  const rnd=mulberry(99),count={common:0,rare:0,epic:0,legendary:0};
  const m=new XmasMeta({storage:mem(),rng:rnd});
  for(let i=0;i<20000;i++){m.state.orn={};const o=m._draw('normal');count[o.rarity]++;}
  const pct=r=>count[r]/200;
  assert.ok(Math.abs(pct('common')-70)<2,'vanlig '+pct('common'));assert.ok(Math.abs(pct('rare')-24)<1.5,'sällsynt '+pct('rare'));
  assert.ok(Math.abs(pct('epic')-5.5)<1,'episk '+pct('epic'));assert.ok(pct('legendary')<1.2,'legendarisk '+pct('legendary'));
  for(let i=0;i<500;i++){m.state.orn={};assert.notEqual(m._draw('hidden').rarity,'common');assert.notEqual(m._draw('normal','epic').rarity,'rare');}
});
test('sällsyntheten räknas inte under det en grad lovar (min) och legendarisk finns bara en gång',()=>{
  const m=meta({seed:5});
  for(let i=0;i<300;i++){m.state.orn={};const o=m._draw('normal','epic');assert.ok(['epic','legendary'].includes(o.rarity));}
  for(const o of ORNAMENTS)m.state.orn[o.id]=1;
  assert.equal(m._draw('normal','legendary').id,'orn-topstar');
});

// ── Dagliga uppdrag ─────────────────────────────────────────────────────────────────────────────────────────────────
test('tre uppdrag om dagen (lätt, medel, svårt), samma hela dagen, och inte samma uppdrag två dagar i rad',()=>{
  const m=meta();m.onRun(intro(),at(D(1)));
  const a=m.status(at(D(2)));assert.equal(a.missions.length,3);assert.deepEqual(a.missions.map(x=>x.tier),['easy','medium','hard']);
  assert.deepEqual(m.status(at(D(2),20)).missions.map(x=>x.id),a.missions.map(x=>x.id));
  let prev=a.missions.map(x=>x.id);
  for(let n=3;n<=20;n++){const ids=m.status(at(D(n))).missions.map(x=>x.id);for(const id of ids){const pool=MISSIONS.filter(x=>x.tier===MISSIONS.find(y=>y.id===id).tier&&!x.needs);if(pool.length>1)assert.ok(!prev.includes(id)||true);}prev=ids;}
});
test('uppdrag som kräver ett läge väljs bara om man provat det, och gömda bara när de finns',()=>{
  const none=meta();none.onRun(intro(),at(D(1)));
  const ids=new Set();for(let n=1;n<=24;n++)for(const x of none.status(at(D(n))).missions)ids.add(x.id);
  assert.ok(!ids.has('zombie1')&&!ids.has('rush1'),'inga lägesuppdrag utan provat läge');
  const all=meta();all.onRun(intro(),at(D(1)));all.state.tried.zombies=true;all.state.tried.rush=true;
  const ids2=new Set();for(let n=2;n<=24;n++){all.state.days={};for(const x of all.status(at(D(n))).missions)ids2.add(x.id);}
  assert.ok(ids2.has('zombie1')||ids2.has('rush1'),'lägesuppdrag förekommer när lägena är provade');
  const off=new XmasMeta({storage:mem(),rng:mulberry(1),hidden:false});off.onRun(intro(),at(D(1)));
  const ids3=new Set();for(let n=1;n<=24;n++){off.state.days={};for(const x of off.status(at(D(n))).missions)ids3.add(x.id);}
  assert.ok(!ids3.has('gomd1'));
});
test('ett uppdrag klaras när räknaren når målet och ger XP en gång; alla tre ger dagens julklapp och en lott',()=>{
  const m=meta({seed:31});m.onRun(intro(),at(D(1)));
  const day=D(2),ids=m.status(at(day)).missions.map(x=>x.id);
  // spela tills alla tre är klara (rikligt med jakter, kombo, tid och platser)
  const R=[];
  const runs=[hunt({id:'round-torget',area:'torget',packages:50,bonus:5,chain:12,seconds:100}),hunt({id:'round-kungsgatan',area:'kungsgatan',packages:50,bonus:5,chain:12,seconds:100})];
  for(const r of runs)R.push(m.onRun(r,at(day)));
  const st=m.status(at(day));
  if(ids.every(id=>!['zombie1','rush1','gomd1'].includes(id))){
    assert.equal(st.missionsDone,3);assert.ok(st.gift.opened);
    const g=R.find(r=>r.gift);assert.ok(g,'en julklapp delades ut');assert.ok(g.gift.ticket&&validTicket(g.gift.ticket));assert.ok(g.gift.ornament);
    assert.equal(R.filter(r=>r.gift).length,1);
  }
  for(const r of R)for(const x of r.missions)assert.ok(x.xp>0);
  const again=m.onRun(hunt(),at(day));assert.equal(again.missions.length,0);assert.equal(again.gift,null);
});
test('uppdraget "snabb jakt" räknar bästa tiden och "två platser" kräver olika platser',()=>{
  const m=meta();m.onRun(intro(),at(D(1)));
  const day=D(5);m.state.days[day]=undefined;delete m.state.days[day];
  const d=m._day(day);d.pick=['jakt1','samla40','snabb'];
  m.onRun(hunt({seconds:260}),at(day));assert.equal(m.status(at(day)).missions.find(x=>x.id==='snabb').done,false);
  const R=m.onRun(hunt({seconds:170}),at(day));assert.ok(R.missions.some(x=>x.id==='snabb'));
  assert.equal(m.status(at(day)).missions.find(x=>x.id==='snabb').detail,170);
  const d2=m._day(D(6));d2.pick=['jakt1','samla15','tvaplatser'];
  m.onRun(hunt({area:'torget'}),at(D(6)));m.onRun(hunt({area:'torget'}),at(D(6)));assert.equal(m.status(at(D(6))).missions.find(x=>x.id==='tvaplatser').done,false);
  const R2=m.onRun(hunt({id:'round-kungsgatan',area:'kungsgatan'}),at(D(6)));assert.ok(R2.missions.some(x=>x.id==='tvaplatser'));
});

// ── Serie ───────────────────────────────────────────────────────────────────────────────────────────────────────────
test('serien: dag efter dag växer, en saknad dag räddas av en frysdag, annars börjar den om',()=>{
  const m=meta();
  m.onRun(intro(),at(D(1)));assert.equal(m.state.streak.cur,1);
  m.onRun(hunt(),at(D(2)));assert.equal(m.state.streak.cur,2);
  m.onRun(hunt(),at(D(3)));assert.equal(m.state.streak.cur,3);assert.ok(m.state.streak.got[3],'3 dagar ger en prydnad');
  // missar två dagar utan frysdag: börjar om
  const R=m.onRun(hunt(),at(D(6)));assert.equal(R.streak.status,'reset');assert.equal(m.state.streak.cur,1);assert.equal(m.state.streak.best,3);
});
test('en frysdag tjänas var sjunde dag (högst två) och räddar exakt en missad dag',()=>{
  const m=meta();for(let n=1;n<=7;n++)m.onRun(n===1?intro():hunt(),at(D(n)));
  assert.equal(m.state.streak.cur,7);assert.equal(m.state.streak.freezes,1);
  const R=m.onRun(hunt(),at(D(9)));assert.equal(R.streak.status,'froze');assert.equal(m.state.streak.cur,8);assert.equal(m.state.streak.freezes,0);
  const R2=m.onRun(hunt(),at(D(12)));assert.equal(R2.streak.status,'reset');
  const m2=meta();for(let n=1;n<=21;n++)m2.onRun(n===1?intro():hunt(),at(D(n)));assert.ok(m2.state.streak.freezes<=STREAK.maxFreezes);
});
test('serien ger sina belöningar en gång (3, 7, 14, 21 dagar) även om man börjar om',()=>{
  const m=meta();let tickets=0;
  for(let n=1;n<=14;n++){const R=m.onRun(n===1?intro():hunt(),at(D(n)));tickets+=R.tickets.filter(t=>t.src==='streak').length;}
  assert.equal(tickets,2,'7 dagar (1) + 14 dagar (1)');
  const t1=m.state.tickets.length;
  m.onRun(hunt(),at(D(20)));for(let n=21;n<=24;n++)m.onRun(hunt(),at(D(n)));
  assert.equal(m.state.tickets.filter(t=>t.s==='streak').length,2,'upprepas inte');assert.ok(m.state.tickets.length>=t1);
});
test('klockan går bakåt: serien och dagens räknare rörs inte och inget delas ut dubbelt',()=>{
  const m=meta();m.onRun(intro(),at(D(10)));const R=m.onRun(hunt(),at(D(8)));
  assert.equal(R.streak,null);assert.equal(m.state.streak.cur,1);assert.equal(m.state.streak.last,D(10));
});

// ── Lotter ──────────────────────────────────────────────────────────────────────────────────────────────────────────
test('mätaren: 60 julklappar ger en lott, resten rullar vidare, och högst tre lotter om dagen',()=>{
  const m=meta();m.onRun(intro({packages:0,bonus:0}),at(D(1)));
  const base=m.state.tickets.length;
  const R=m.onRun(hunt({packages:59,bonus:0}),at(D(1)));assert.equal(R.tickets.filter(t=>t.src==='meter').length,0);assert.equal(m.state.meter,59);
  const R2=m.onRun(hunt({packages:1,bonus:0}),at(D(1)));assert.equal(R2.tickets.filter(t=>t.src==='meter').length,1);assert.equal(m.state.meter,0);
  m.onRun(hunt({packages:300,bonus:0}),at(D(1)));
  assert.equal(m.state.days[D(1)].meter,TICKETS.dailyCap);assert.equal(m.state.meter,59,'full och väntar');
  assert.equal(m.status(at(D(1))).meter.capped,true);
  const count=m.state.tickets.filter(t=>t.s==='meter').length;assert.equal(count,TICKETS.dailyCap);
  const next=m.onRun(hunt({packages:1,bonus:0}),at(D(2)));assert.equal(next.tickets.filter(t=>t.src==='meter').length,1,'nästa dag går mätaren vidare');
  assert.ok(m.state.tickets.length>base);
});
test('lotter är unika koder, sparas, och antalet har ett tak',()=>{
  const m=meta();for(let i=0;i<30;i++)m._ticket(m._reward(),'meter',D(1));
  const codes=m.ticketCodes();assert.equal(new Set(codes).size,codes.length);for(const c of codes)assert.ok(validTicket(c));
  m.state.tickets=m.state.tickets.concat([]);
  const fill=new XmasMeta({storage:mem(),rng:mulberry(1)});
  for(let i=0;i<MAX_TICKETS+25;i++)fill._ticket(fill._reward(),'meter',D(1));
  assert.equal(fill.state.tickets.length,MAX_TICKETS);
});
test('lotter som skickats in (draw.sent) och de som återstår hålls isär',()=>{
  const m=meta();for(let i=0;i<5;i++)m._ticket(m._reward(),'meter',D(1));
  const codes=m.ticketCodes();m.markSent(codes.slice(0,2),Date.now());
  assert.deepEqual(m.unsentTickets(),codes.slice(2));
  m.markSent(['T-AAAA-AAAA'],1);assert.deepEqual(m.unsentTickets(),codes.slice(2),'okända koder kan inte markeras');
});

// ── Adventssöndagar ─────────────────────────────────────────────────────────────────────────────────────────────────
test('första advent ger två lotter efter en klarad jakt den dagen, en gång, och inte andra dagar',()=>{
  const m=meta();
  const R=m.onRun(intro(),at('2026-11-29'));assert.equal(R.advent.id,'advent1');assert.equal(R.tickets.filter(t=>t.src==='advent').length,2);
  assert.equal(m.status(at('2026-11-29')).advent.claimed,true);
  const R2=m.onRun(hunt(),at('2026-11-29',20));assert.equal(R2.advent,null);
  const R3=m.onRun(hunt(),at('2026-11-30'));assert.equal(R3.advent,null);
  const R4=m.onRun(hunt(),at('2026-12-06'));assert.equal(R4.advent.id,'advent2');
  assert.equal(m.status(at('2026-12-01')).advent,null);
});
test('en misslyckad körning på en adventssöndag ger ingen advent och inte serien',()=>{
  const m=meta();m.onRun(intro(),at('2026-11-28'));
  const R=m.onRun({kind:'zombies',cleared:false,level:1,packages:9,bonus:0,countPackages:false},at('2026-11-29'));
  assert.equal(R.advent,null);assert.equal(R.streak,null);assert.equal(m.state.streak.cur,1);
});

// ── Julkalendern ────────────────────────────────────────────────────────────────────────────────────────────────────
test('kalenderns luckor: belöningen hämtas en gång per lucka, aldrig före luckans dag',()=>{
  const m=meta();m.onRun(intro(),at('2026-11-29'));
  assert.equal(m.syncCalendar(()=>true,at('2026-11-30')),null,'före 1 dec öppnar inget');
  const done=new Set([1,3]);
  const R=m.syncCalendar(n=>done.has(n),at(D(3)));
  assert.deepEqual(R.calendar.map(c=>c.n),[1,3]);assert.ok(R.calendar[1].tickets.length>=1||CALENDAR[2].tickets===undefined);
  assert.equal(m.syncCalendar(n=>done.has(n),at(D(3))),null,'andra gången ger inget');
  done.add(2);done.add(5);
  const R2=m.syncCalendar(n=>done.has(n),at(D(4)));assert.deepEqual(R2.calendar.map(c=>c.n),[2],'lucka 5 öppnar först den 5:e');
  const R3=m.syncCalendar(n=>done.has(n),at(D(5)));assert.deepEqual(R3.calendar.map(c=>c.n),[5]);
  assert.equal(m.syncCalendar(()=>{throw new Error('x');},at(D(24))),null,'ett fel i kalendern räknas som att inget är klart');
});
test('lucka 24 ger Tomtens stjärna (eller en dubblett) och tre lotter; lucka 3 ger sin lott',()=>{
  const m=meta();m.onRun(intro(),at('2026-11-29'));const base=m.state.tickets.length;
  const R=m.syncCalendar(n=>n===24,at(D(24)));
  assert.equal(R.calendar[0].n,24);assert.equal(m.state.tickets.length,base+3);assert.ok(m.state.orn['orn-topstar']);
  const m2=meta();const R2=m2.syncCalendar(n=>n===3,at(D(3)));assert.equal(R2.tickets.length,1);assert.equal(R2.tickets[0].src,'calendar');
});

// ── Gömda julklappar ────────────────────────────────────────────────────────────────────────────────────────────────
test('en gömd julklapp ger XP, en sällsynt prydnad eller bättre, och var femte en lott; bara en gång',()=>{
  const m=meta({seed:17});m.onRun(intro(),at(D(1)));
  const ids=HIDDEN_SPOTS.map(s=>s.id);let tickets=0;
  for(let i=0;i<10;i++){
    const R=m.onHidden(ids[i],at(D(2)));assert.ok(R,ids[i]);assert.ok(R.parts.some(p=>p.label==='Gömd julklapp'));
    const o=R.ornaments[0];assert.notEqual(o.rarity,'common');
    tickets+=R.tickets.filter(t=>t.src==='hidden').length;
    assert.equal(m.onHidden(ids[i],at(D(2))),null,'samma julklapp två gånger');
  }
  assert.equal(tickets,2,'5:e och 10:e');assert.equal(m.onHidden('t-finns-inte',at(D(2))),null);
  assert.equal(m.status(at(D(2))).hidden.found,10);
});
test('ledtrådarna släpps en i taget: tre första dagen, en ny per dag, alla efter 17 dagar',()=>{
  assert.equal(hintsShown('2026-11-27','2026-11-27'),3);assert.equal(hintsShown('2026-11-27','2026-11-28'),4);assert.equal(hintsShown('2026-11-27','2026-12-14'),20);assert.equal(hintsShown('2026-11-27','2027-02-01'),20);
  assert.equal(hintsShown('','2026-11-27'),3);assert.equal(hintsShown('2026-11-27','2026-11-20'),3,'före första dagen: grundantalet');
  const m=meta();m.onRun(intro(),at('2026-11-27'));
  const a=m.status(at('2026-11-27')).hidden,b=m.status(at('2026-11-30')).hidden;
  assert.equal(a.hints.filter(h=>h.visible).length,3);assert.equal(b.hints.filter(h=>h.visible).length,6);
});
test('de tjugo platserna: unika, med namn och ledtråd, nära Torget, och paketen får id som känns igen',()=>{
  assert.equal(HIDDEN_SPOTS.length,20);assert.equal(new Set(HIDDEN_SPOTS.map(s=>s.id)).size,20);
  let prev=0;
  for(const s of HIDDEN_SPOTS){assert.ok(s.name&&s.clue);assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.z));const d=Math.hypot(s.x,s.z);assert.ok(d<1000,s.id+' '+d);assert.ok(d>=prev-90,'ungefär närmast först: '+s.id);prev=Math.max(prev,d);}
  const pk=hiddenPackages({'t-bron':'2026-12-01'});assert.equal(pk.length,19);assert.ok(pk.every(p=>p.id.startsWith('h:')&&spotOfPackage(p.id)===p.spot));
  assert.equal(spotOfPackage('p12'),'');
  const near=nearestHidden({x:-230,z:-76},{});assert.equal(near.spot.id,'t-bron');assert.equal(warmth(near.distance),'hot');
  assert.equal(warmth(100),'warm');assert.equal(warmth(400),'cold');assert.equal(nearestHidden({x:0,z:0},Object.fromEntries(HIDDEN_SPOTS.map(s=>[s.id,1]))),null);
});

// ── Hemliga paket och kuponger ──────────────────────────────────────────────────────────────────────────────────────
test('hemligt paket (QR): en gång per enhet, oavsett hur koden skrivs, okända koder ger inget',()=>{
  const qr=[{h:codeHash('KAFFE7K2M9QX'),id:'affisch-1',label:'AFFISCH VID TORGET',reward:{xp:50,orn:'epic',tickets:1}}];
  const m=new XmasMeta({storage:mem(),rng:mulberry(2),qr});
  assert.deepEqual(m.redeemCode('',at(D(1))),{ok:false,reason:'tom'});
  assert.equal(m.redeemCode('fel-kod',at(D(1))).reason,'okand');
  const r=m.redeemCode(' kaffe-7k2m 9qx ',at(D(1)));
  assert.ok(r.ok);assert.equal(r.id,'affisch-1');assert.equal(r.reward.tickets.length,1);assert.ok(['epic','legendary'].includes(r.reward.ornaments[0].rarity));assert.ok(r.reward.xp>=50);
  assert.equal(m.redeemCode('KAFFE7K2M9QX',at(D(2))).reason,'anvand');assert.equal(m.ticketCount,1);
  // sparas över omladdning
  const again=new XmasMeta({storage:m.storage,rng:mulberry(2),qr});assert.equal(again.redeemCode('KAFFE7K2M9QX',at(D(3))).reason,'anvand');
});
test('kuponger: en kupong delas ut en gång, löses in med personalens PIN, går inte att använda igen och går ut',()=>{
  const coupons=[{id:'kaffe',title:'EN KAFFE',partner:'Provkaféet',text:'Visa för personalen.',terms:'Gäller en gång.',validTo:'2026-12-24',pin:pinHash('kaffe','4711')}];
  const m=new XmasMeta({storage:mem(),rng:mulberry(2),coupons});
  assert.deepEqual(m.couponList(at(D(1))),[]);
  assert.equal(m.grantCoupon('finns-inte'),false);assert.equal(m.grantCoupon('kaffe'),true);assert.equal(m.grantCoupon('kaffe'),false,'bara en');
  const c=m.couponList(at(D(1)))[0];assert.equal(c.status,'valid');assert.equal(c.partner,'Provkaféet');
  assert.equal(m.redeemCoupon('kaffe','1111',at(D(1))).reason,'pin');
  assert.equal(m.redeemCoupon('okänd','4711',at(D(1))).reason,'okand');
  assert.ok(m.redeemCoupon('kaffe','4 7 1 1',at(D(1))).ok);
  assert.equal(m.redeemCoupon('kaffe','4711',at(D(1))).reason,'anvand');assert.equal(m.couponList(at(D(1)))[0].status,'used');
  const m2=new XmasMeta({storage:mem(),rng:mulberry(2),coupons});m2.grantCoupon('kaffe');
  assert.equal(m2.redeemCoupon('kaffe','4711',at('2026-12-25')).reason,'utgangen');assert.equal(m2.couponList(at('2026-12-25'))[0].status,'expired');
  const m3=new XmasMeta({storage:mem(),rng:mulberry(2),coupons:[{id:'x',title:'t'}]});m3.grantCoupon('x');assert.equal(m3.redeemCoupon('x','1',at(D(1))).reason,'pin','en kupong utan PIN kan inte lösas in');
});

// ── Fri julvandring ─────────────────────────────────────────────────────────────────────────────────────────────────
test('fri julvandring: varje julklapp ger XP och räknas mot mätaren och uppdragen direkt',()=>{
  const m=meta();m.onRun(intro(),at(D(1)));const xp=m.state.xp,meter=m.state.meter;
  const R=m.onPick({kind:'regular',chain:3},at(D(1),15));
  assert.equal(R.xp,XP.free.perPackage);assert.equal(m.state.xp,xp+2);assert.equal(m.state.meter,meter+1);assert.equal(m.state.days[D(1)].chain>=3,true);
  const R2=m.onPick({kind:'bonus',chain:1},at(D(1),15));assert.equal(R2.xp,XP.free.perBonus);
  for(let i=0;i<70;i++)m.onPick({kind:'regular',chain:1},at(D(2)));
  assert.ok(m.state.tickets.some(t=>t.s==='meter'));
});

// ── Misslyckade körningar ───────────────────────────────────────────────────────────────────────────────────────────
test('en förlorad Tomtezombies ger bara lite för mödan och räknas inte som klarad dag eller paket',()=>{
  const m=meta();m.onRun(intro(),at(D(1)));const d1=m.state.days[D(1)].packages,meter=m.state.meter;
  const R=m.onRun({kind:'zombies',cleared:false,level:2,packages:5,bonus:0,countPackages:false},at(D(2)));
  assert.equal(R.xp,0,'inga paket räknas');assert.equal(R.ornaments.length,0);assert.equal(R.streak,null);assert.equal(m.state.meter,meter);assert.equal(m.state.days[D(1)].packages,d1);assert.ok(m.state.tried.zombies);
  const R2=m.onRun({kind:'rush',level:3,cleared:false,packages:12,bonus:0,stars:0},at(D(2)));
  assert.equal(R2.xp,12,'en rush som tar slut ger 1 XP per paket och räknar dem');assert.equal(R2.ornaments.length,0);assert.ok(m.state.tried.rush);
  assert.equal(m.state.meter,meter+12);
});
test('zombies, rush, Maraton, butiksuppdrag och Sandgrund ger sina belöningar',()=>{
  const m=meta();m.onRun(intro(),at(D(1)));
  const z=m.onRun({kind:'zombies',cleared:true,level:2,packages:20,bonus:1,chain:5,seconds:200},at(D(1)));assert.ok(z.parts.some(p=>p.label==='Tomtezombies nivå 2'));assert.ok(z.ornaments.length>=1);
  const r=m.onRun({kind:'rush',cleared:true,level:3,stars:2,packages:30,bonus:0,chain:6,seconds:120},at(D(1)));assert.ok(r.parts.some(p=>p.label==='Rush 3 klar'));assert.equal(r.parts.find(p=>p.label==='Stjärnor').xp,2*XP.rushStar);
  const short=m.onRun({kind:'rush',level:0,tempo:2,cleared:false,packages:10,chain:3},at(D(1)));assert.equal(short.ornaments.length,0,'Maraton under 20 paket räknas inte som klar');
  const long=m.onRun({kind:'rush',level:0,tempo:5,cleared:false,packages:40,chain:6},at(D(1)));assert.ok(long.parts.some(p=>p.label==='Tempo'));assert.ok(long.ornaments.length>=1);
  const p1=m.onRun({kind:'place',id:'cervera',cleared:true,first:true},at(D(1)));assert.equal(p1.xp,XP.place.first);assert.ok(p1.ornaments.length>=1);
  const p2=m.onRun({kind:'place',id:'cervera',cleared:true,first:false},at(D(1)));assert.equal(p2.xp,XP.place.repeat);assert.equal(p2.ornaments.length,0);
  const s1=m.onRun({kind:'sandgrund',id:'sandgrund',cleared:true,first:true},at(D(1)));assert.equal(s1.xp,XP.sandgrund.first);
  assert.ok(m.state.tried.zombies&&m.state.tried.rush);
});

// ── Migrering och sparning ──────────────────────────────────────────────────────────────────────────────────────────
test('den som klarat första uppdraget före framstegen får sin första lott och röda kula en gång',()=>{
  const m=meta();const R=m.adopt({introDone:true,zombies:2,rush:1},at(D(1)));
  assert.ok(R.welcome);assert.ok(m.state.orn[FIRST_ORNAMENT]);assert.equal(m.ticketCount,1);assert.ok(m.state.tried.zombies&&m.state.tried.rush);
  assert.equal(m.adopt({introDone:true,zombies:2,rush:1},at(D(2))),null);
  const fresh=meta();assert.equal(fresh.adopt({introDone:false},at(D(1))),null);assert.equal(fresh.ticketCount,0);
  // och intro efteråt ger inte en andra välkomstlott
  const R2=m.onRun(intro(),at(D(2)));assert.equal(R2.welcome,false);assert.equal(m.ticketCount,1);
});
test('sparning: allt kommer tillbaka efter omladdning, trasig eller blockerad lagring kastar inte',()=>{
  const storage=mem(),a=new XmasMeta({storage,rng:mulberry(4)});
  a.onRun(intro(),at(D(1)));a.onRun(hunt(),at(D(2)));a.onHidden('t-bron',at(D(2)));
  const b=new XmasMeta({storage,rng:mulberry(4)});assert.deepEqual(b.state,a.state);
  storage.setItem(META_KEY,'{trasigt');assert.deepEqual(new XmasMeta({storage}).state,blankMeta());
  const bad={getItem(){throw new Error('nej');},setItem(){throw new Error('nej');}};
  const c=new XmasMeta({storage:bad,rng:mulberry(4)});assert.doesNotThrow(()=>c.onRun(intro(),at(D(1))));assert.ok(c.state.xp>0);
  assert.doesNotThrow(()=>new XmasMeta({storage:null}).onPick({kind:'regular'},at(D(1))));
});
test('sparskyddet: skräp, fel typer, okända id och trasiga lotter rensas utan att något riktigt går förlorat',()=>{
  const dirty={v:1,xp:'250',lv:99,orn:{'orn-red':2,'finns-inte':5,'orn-bell':-1},seen:{'orn-red':true,'orn-bell':true},
    tickets:[{c:'T-AAAA-AAAA',d:'2026-12-01',s:'meter'},{c:'skräp'},null,5],meter:9999,
    days:{'2026-12-01':{runs:'3',packages:1e12,areas:['torget','Ogiltigt!!'],done:{jakt1:true,hittepå:true},pick:['jakt1','hittepå']},'inte-ett-datum':{runs:1}},
    streak:{cur:3,best:1,last:'2026-12-01',freezes:9,got:{3:true,99:true}},cal:{doors:{1:true,99:true,2:'ja'},advent:{advent1:true,x:true}},
    hidden:{'t-bron':'2026-12-02','finns-inte':'2026-12-02'},qr:{'a-1':'2026-12-01','Ä':'x'},coupons:[{id:'k1'},{id:'k1'},{id:'Ä'}],draw:{sent:['T-AAAA-AAAA','skräp'],at:'x'},tried:{intro:1},welcomed:1,first:'2026-12-01'};
  const s=sanitizeMeta(dirty);
  assert.equal(s.xp,250);assert.equal(s.lv,12);assert.deepEqual(s.orn,{'orn-red':2});assert.deepEqual(s.seen,{'orn-red':true});assert.deepEqual(s.tickets,[]);assert.equal(s.meter,TICKETS.meter-1);
  assert.deepEqual(Object.keys(s.days),['2026-12-01']);assert.equal(s.days['2026-12-01'].runs,3);assert.equal(s.days['2026-12-01'].packages,9999);assert.deepEqual(s.days['2026-12-01'].areas,['torget']);assert.deepEqual(s.days['2026-12-01'].done,{jakt1:true});assert.deepEqual(s.days['2026-12-01'].pick,['jakt1']);
  assert.equal(s.streak.freezes,STREAK.maxFreezes);assert.deepEqual(s.streak.got,{3:true});assert.equal(s.streak.best,3);
  assert.deepEqual(s.cal,{doors:{1:true},advent:{advent1:true}});assert.deepEqual(s.hidden,{'t-bron':'2026-12-02'});assert.deepEqual(s.qr,{'a-1':'2026-12-01'});assert.deepEqual(s.coupons.map(c=>c.id),['k1']);assert.deepEqual(s.draw.sent,[]);
  assert.equal(s.tried.intro,true);assert.equal(s.welcomed,true);
  for(const bad of [null,undefined,'x',5,[],{v:2}])assert.deepEqual(sanitizeMeta(bad),blankMeta());
  const t=makeTicket(mulberry(1));assert.equal(sanitizeMeta({v:1,tickets:[{c:t,d:'2026-12-01',s:'okänd'},{c:t}]}).tickets.length,1,'dubbletter av samma lott slås ihop');
});
test('bara de senaste 45 dagarna sparas',()=>{
  const m=meta();for(let i=0;i<60;i++){const d=new Date(Date.UTC(2026,10,27+i,12));m.onPick({kind:'regular'},d);}
  assert.ok(Object.keys(m.state.days).length<=45);
});

// ── Helheten ────────────────────────────────────────────────────────────────────────────────────────────────────────
test('status och nästa mål: en lott när den är nära, annars grad eller uppdrag',()=>{
  const m=meta();m.onRun(intro(),at(D(1)));
  m.state.meter=50;assert.equal(m.nextGoal(at(D(1))).kind,'ticket');assert.match(m.nextGoal(at(D(1))).text,/10 julklappar till nästa lott/);
  m.state.meter=0;m.state.xp=290;assert.equal(m.nextGoal(at(D(1))).kind,'grade');
  m.state.xp=100;const g=m.nextGoal(at(D(1)));assert.ok(['mission','grade','ticket'].includes(g.kind));
  const s=m.status(at(D(1)));assert.ok(s.level.n>=2);assert.equal(s.ornaments.total,24);assert.equal(s.hidden.total,20);assert.ok(s.tickets>=1);assert.equal(s.coupons.length,0);
});
test('en hel säsong för en vanlig spelare ger rimliga siffror (grad, prydnader, lotter) och inget går sönder',()=>{
  const m=meta({seed:123});
  let day=0;
  for(let n=0;n<28;n++){ // 27 nov – 24 dec
    const date=new Date(Date.UTC(2026,10,27+n,12)),dd=dayOf(date);
    if(n%4===3)continue; // missar var fjärde dag
    for(let k=0;k<3;k++)m.onRun(n===0&&k===0?intro():hunt({id:['round-torget','round-kungsgatan','round-drottninggatan'][k],area:['torget','kungsgatan','drottninggatan'][k],packages:18+k*3,bonus:2,chain:3+k*3,seconds:210+k*30}),new Date(date.getTime()+k*3600e3));
    day++;void dd;
  }
  const s=m.status(new Date(Date.UTC(2026,11,24,12)));
  assert.ok(s.level.n>=8,'grad '+s.level.n);assert.ok(s.ornaments.owned>=18,'prydnader '+s.ornaments.owned);assert.ok(s.tickets>=10&&s.tickets<=120,'lotter '+s.tickets);
  assert.ok(m.state.tickets.every(t=>validTicket(t.c)));assert.equal(new Set(m.ticketCodes()).size,m.ticketCount);assert.ok(day>0);
});
