// Julbyggets huvudspår (xmas.13): Termosjakten (rekord, dagens rundor, dagsmål, insamlingen) och dagens julklappsjakt (gömställe per dag, schema, belöning en gång per dag).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TERMOS,DAILY_GOALS,goalFor,goalProgress,blankTermos,sanitizeTermos,recordTermos,termosToday,termosName} from '../xmas/xmas-termos.mjs';
import {DAILY_AREAS,dailyFor,dailyWarmth,hintLevel,isDailyId,untilTomorrow} from '../xmas/xmas-daily.mjs';
import {DAILY,DAILY_HUNTS} from '../xmas/xmas-daily-config.mjs';
import {FX_THERMOS,areaOf} from '../explore-places.mjs';
import {COUPONS,XP,MISSIONS} from '../xmas/xmas-meta-config.mjs';
import {XmasMeta} from '../xmas/xmas-meta.mjs';
import {XmasSave,sanitizeSave} from '../xmas/xmas-save.mjs';
import {STAMPS} from '../xmas/xmas-config.mjs';
import {THERMOS_STYLES} from '../xmas/xmas-art.js';

const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const days=(from,n)=>Array.from({length:n},(_,i)=>new Date(Date.parse(from+'T12:00:00Z')+i*864e5).toISOString().slice(0,10));
const at=day=>new Date(day+'T11:00:00Z');
const run=o=>({points:1000,thermos:20,tempo:3,chain:8,gold:1,seconds:90,...o});

// ── Termosjakten ───────────────────────────────────────────────────────────────────────────────────────────────────────
test('dagsmålet: ett per dag, samma för alla, aldrig samma två dagar i rad, alla mål förekommer', ()=>{
  const seen=new Set();let prev=null;
  for(const d of days('2026-11-20',60)){const g=goalFor(d);assert.ok(DAILY_GOALS.includes(g));assert.notEqual(g.id,prev,d);prev=g.id;seen.add(g.id);assert.equal(goalFor(d),g);}
  assert.equal(seen.size,DAILY_GOALS.length);
  assert.equal(goalFor('fel'),DAILY_GOALS[0]);
  for(const g of DAILY_GOALS)assert.ok(['thermos','tempo','chain','points','gold','runs'].includes(g.kind)&&g.target>0&&g.text.length>5,g.id);
  assert.deepEqual(goalProgress({kind:'tempo',target:5},{tempo:6}),{value:6,target:5,done:true});
  assert.deepEqual(goalProgress({kind:'runs',target:3},{},{runs:2}),{value:2,target:3,done:false});
  assert.equal(termosName(1),'KAFFEPAUS');assert.equal(termosName(12),'TERMOSMÄSTARE');assert.equal(termosName(99),'TERMOSMÄSTARE');
});

test('en runda sparas: rekord, dagens topplista, insamlingens summa; en runda utan termosar sparas inte', ()=>{
  const st=blankTermos(),d='2026-12-03';
  assert.equal(recordTermos(st,run({thermos:0}),d),null);assert.equal(st.runs,0);
  const a=recordTermos(st,run({points:900,thermos:15}),d,1);
  assert.ok(a.record&&!a.prevBest&&a.dayBest&&a.place===1);assert.equal(st.total,15);assert.equal(st.day.runs,1);
  const b=recordTermos(st,run({points:500,thermos:10}),d,2);
  assert.ok(!b.record&&!b.dayBest);assert.equal(b.place,2);assert.equal(st.total,25);assert.equal(st.best.points,900);
  const c=recordTermos(st,run({points:1500,thermos:30,tempo:7}),d,3);
  assert.ok(c.record&&c.prevBest.points===900&&c.dayBest&&c.tempoRecord);assert.equal(st.bestTempo,7);
  for(let i=0;i<8;i++)recordTermos(st,run({points:100+i}),d,10+i);
  assert.equal(st.day.top.length,TERMOS.boardSize);assert.equal(st.day.top[0].points,1500);assert.equal(st.day.runs,11);
  // ny dag: dagens del börjar om, rekord och summa ligger kvar
  const e=recordTermos(st,run({points:200}),'2026-12-04',20);
  assert.equal(st.day.key,'2026-12-04');assert.equal(st.day.runs,1);assert.ok(e.dayBest);assert.equal(st.best.points,1500);assert.ok(st.total>25);
  assert.equal(termosToday(st,'2026-12-05').runs,0);
});

test('dagsmålet ges en gång per dag', ()=>{
  const day=days('2026-12-01',30).find(d=>goalFor(d).kind==='tempo');assert.ok(day);
  const g=goalFor(day),st=blankTermos();
  const a=recordTermos(st,run({tempo:g.target-1}),day);assert.ok(!a.goalNow&&!a.goalDone);
  const b=recordTermos(st,run({tempo:g.target}),day);assert.ok(b.goalNow&&b.goalDone);
  const c=recordTermos(st,run({tempo:g.target+3}),day);assert.ok(!c.goalNow&&c.goalDone);
  const runsDay=days('2026-12-01',40).find(d=>goalFor(d).kind==='runs'),st2=blankTermos(),gr=goalFor(runsDay);
  let hit=0;for(let i=0;i<gr.target+2;i++){const r=recordTermos(st2,run({points:10+i}),runsDay);if(r.goalNow)hit++;if(i<gr.target-1)assert.ok(!r.goalDone);}
  assert.equal(hit,1);
});

test('sparningen: Termosjakten tvättas, äldre sparfiler får en tom, stämpeln finns', ()=>{
  const s=new XmasSave(mem());assert.deepEqual(s.termos,blankTermos());
  const r=s.recordTermos(run(),'2026-12-02');assert.ok(r.record);assert.equal(s.termos.total,20);
  const raw={v:1,termos:{best:{points:'5000',thermos:40,tempo:8,chain:20,gold:3,seconds:300,at:1},total:'123',runs:4,gold:2,bestTempo:'99',day:{key:'2026-12-02',runs:2,thermos:50,goal:true,top:[{points:10},{points:-1},'x',{points:5000}]}}};
  const t=sanitizeSave(raw).termos;
  assert.equal(t.best.points,5000);assert.equal(t.total,123);assert.equal(t.bestTempo,99);assert.equal(t.day.top.length,2);assert.equal(t.day.top[0].points,5000);assert.ok(t.day.goal);
  assert.deepEqual(sanitizeSave({v:1}).termos,blankTermos());
  assert.deepEqual(sanitizeTermos({day:{key:'<script>',runs:5}}).day,blankTermos().day);
  assert.ok(STAMPS.some(x=>x.id==='termos'));
  assert.equal(THERMOS_STYLES.length,7);assert.ok(THERMOS_STYLES[6].gold);
});

test('framstegen: Termosjakten ger XP, räknas i dagens uppdrag och dagsmålet ger en belöning en gång', ()=>{
  const m=new XmasMeta({storage:mem(),rng:()=>.5});const d='2026-12-02';
  const a=m.onRun({kind:'termos',id:'termos',cleared:true,tempo:4,packages:30,bonus:0,chain:9,seconds:120,goalNow:true},at(d));
  assert.ok(a.parts.some(p=>p.label==='Termosar'));assert.ok(a.parts.some(p=>p.label==='Dagens termosmål'&&p.xp===XP.termosGoal));assert.ok(a.termosGoal);
  assert.ok(m.state.tried.termos);assert.equal(m.state.days[d].termos,30);assert.equal(m.state.days[d].termosRuns,1);
  const b=m.onRun({kind:'termos',id:'termos',cleared:true,tempo:4,packages:30,bonus:0,chain:9,seconds:120,goalNow:true},at(d));
  assert.ok(!b.parts.some(p=>p.label==='Dagens termosmål'),'dagsmålet ger bara en gång per dag');
  const short=m.onRun({kind:'termos',id:'termos',cleared:true,tempo:1,packages:5,bonus:0,chain:2,seconds:30},at(d));
  assert.equal(short.ornaments.length,0,'en kort runda (under '+XP.termosMin+' termosar) ger ingen prydnad');
  // dagens uppdrag startar efter första rundan i Termosjakten även utan första uppdraget
  assert.equal(m.status(at(d)).missions.length,3);
  assert.ok(MISSIONS.some(x=>x.kind==='termos')&&MISSIONS.some(x=>x.kind==='daily'));
});

// ── Dagens julklappsjakt ───────────────────────────────────────────────────────────────────────────────────────────────
test('gömställena är grundspelets kontrollerade termosplatser och ligger i sina områden', ()=>{
  const all=new Set(Object.values(FX_THERMOS).flat().map(([x,z])=>x+','+z));
  assert.equal(DAILY_AREAS.length,7);
  for(const a of DAILY_AREAS){
    assert.ok(a.spots.length>=5,a.id);assert.ok(a.riddle.length>40&&a.name.length>3);
    for(const s of a.spots){assert.ok(all.has(s.x+','+s.z),a.id+' '+s.x+','+s.z);assert.ok(Math.hypot(s.x,s.z)<720,'inom 720 m från Torget');}
    const area=a.id==='sandgrund'?['sandgrund','udden']:[a.id==='hamn'?'hamn':a.id];
    const ok=a.id==='hamn'?['hamn','bryggudden']:area; // Inre hamn gränsar till Bryggudden
    for(const s of a.spots)assert.ok(ok.includes(areaOf({x:s.x,z:s.z})),a.id+' → '+areaOf({x:s.x,z:s.z}));
    const dc=Math.min(...a.spots.map(s=>Math.hypot(s.x-a.center.x,s.z-a.center.z)));assert.ok(dc<DAILY.areaRadius*2,'pilens mål ligger i området: '+a.id);
  }
});

test('en ny julklapp varje dag: samma för alla, aldrig samma område två dagar i rad, alla områden kommer', ()=>{
  let prev=null;const areas=new Set();
  for(const d of days('2026-11-20',60)){
    const x=dailyFor(d);assert.equal(x.day,d);assert.ok(isDailyId(x.id));assert.deepEqual(dailyFor(d),x);
    const plain=dailyFor(d,{});if(prev&&!DAILY_HUNTS[d]&&!DAILY_HUNTS[prev.day])assert.notEqual(plain.area.id,prev.area.id,d);
    prev=plain;areas.add(x.area.id);
    assert.ok(x.reward.xp>0&&['common','rare','epic','legendary'].includes(x.reward.orn));
  }
  assert.equal(areas.size,DAILY_AREAS.length);
  assert.equal(dailyFor('inte-ett-datum'),null);
});

test('schemat: datum, områden, platser och kuponger finns; inga koder i klartext', ()=>{
  for(const [d,h] of Object.entries(DAILY_HUNTS)){
    assert.match(d,/^2026-(11|12)-\d{2}$/);
    if(h.area)assert.ok(DAILY_AREAS.some(a=>a.id===h.area),d);
    if(h.spot!=null){const a=DAILY_AREAS.find(x=>x.id===h.area);assert.ok(a&&h.spot<a.spots.length,d);assert.equal(dailyFor(d).spot.i,h.spot);}
    if(h.coupon)assert.ok(COUPONS.some(c=>c.id===h.coupon),d);
    if(h.qr)assert.doesNotMatch(h.qr,/paket=/i,'en QR-rad får aldrig innehålla själva koden');
  }
  // ett erbjudande och en QR-rad följer med dagens julklapp när de står i schemat
  const x=dailyFor('2026-12-08',{'2026-12-08':{coupon:'julgransrabatt',qr:'Affischen hänger vid julgransförsäljningen.',xp:150,orn:'epic',area:'haga',spot:2}});
  assert.equal(x.reward.coupon,'julgransrabatt');assert.equal(x.reward.xp,150);assert.equal(x.area.id,'haga');assert.equal(x.spot.i,2);assert.match(x.qr,/Affischen/);
  assert.equal(dailyFor('2026-12-24').reward.orn,'legendary');
});

test('varmt, glödhett och hjälpen efter hand', ()=>{
  assert.equal(dailyWarmth(DAILY.hot),'hot');assert.equal(dailyWarmth(DAILY.warm),'warm');assert.equal(dailyWarmth(DAILY.warm+1),'cold');
  assert.equal(hintLevel(0),1);assert.equal(hintLevel(DAILY.areaHintAfter),2);assert.equal(hintLevel(DAILY.arrowAfter),3);
  const t=untilTomorrow(new Date(Date.UTC(2026,11,10,22,30)));assert.deepEqual(t,{h:0,m:30}); // 23.30 i Karlstad
});

test('dagens julklapp ger sin belöning en gång per dag, med kupong när schemat säger det', ()=>{
  const m=new XmasMeta({storage:mem(),rng:()=>.3});
  const R=m.onDaily({xp:80,orn:'rare',coupon:'julgransrabatt',tickets:1},at('2026-12-08'));
  assert.ok(R.daily&&R.xp>=80);assert.equal(R.coupons[0].id,'julgransrabatt');assert.equal(R.ornaments.length,1);assert.equal(R.tickets.length,1);
  assert.ok(m.dailyFound(at('2026-12-08')));assert.equal(m.onDaily({},at('2026-12-08')),null);
  assert.ok(!m.dailyFound(at('2026-12-09')));assert.ok(m.onDaily({},at('2026-12-09')));assert.equal(m.dailyCount(),2);
  assert.equal(m.state.days['2026-12-09'].daily,true);
  const again=new XmasMeta({storage:{getItem:()=>JSON.stringify(m.state),setItem(){}}});assert.ok(again.dailyFound(at('2026-12-09')));
});

test('menyn och spelet: knapparna finns och huvudspåret är överst', ()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),boot=fs.readFileSync(new URL('../xmas/xmas-boot.js',import.meta.url),'utf8');
  for(const id of ['xmasTermos','xmasTermosNote','xmasDaily','xmasDailyNote','xmasTermosGo','xmasDailyGo'])assert.ok(html.includes('id="'+id+'"'),id);
  const intro=html.slice(html.indexOf('id="round-xmas-intro"'),html.indexOf('id="round-xmas-continue"'));
  assert.ok(intro.indexOf('id="xmasTermos"')<intro.indexOf('id="xmasDaily"')&&intro.indexOf('id="xmasDaily"')<intro.indexOf('id="xmasCozy"'));
  assert.match(intro,/id="xmasTermos" class="round-primary xmas-primary/);
  assert.match(boot,/isDailyId\(e\.id\)/);assert.match(boot,/syncDonations/);
});
