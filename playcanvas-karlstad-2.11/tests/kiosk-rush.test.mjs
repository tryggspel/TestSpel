// xmas.16: TOMTEKÖN på Pressbyrån (reglerna, svårigheten, sparningen) och uppdragsmotorns krok för ett eget spel (markExternal/finishExternal).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createKioskGame,KIOSK,KIOSK_ITEMS,CUSTOMERS,starsFor,comboMult,blankKiosk,sanitizeKiosk,recordKiosk} from '../xmas/kiosk-rush.mjs';
import {PlaceQuests} from '../place-quests.mjs';
import {XMAS_PLACES,XMAS_PRESSBYRAN} from '../xmas/xmas-places.mjs';

const seeded=s=>()=>((s=(s*16807)%2147483647)/2147483647);
const need=c=>c.order.find((x,k)=>!c.got[k]);
const until=(g,fn,max=20)=>{let t=0;while(!fn()&&t<max){g.step(.05);t+=.05;}return fn();};

test('Tomtekön: rätt varor i valfri ordning serverar tomten, kombo växer, fel vara kostar tålamod och nollar kombon', ()=>{
  const g=createKioskGame({rand:seeded(5)});
  assert.ok(until(g,()=>g.front()),'första tomten kommer');
  let c=g.front();const n=c.order.length;assert.ok(n>=2&&n<=5);
  for(const id of [...c.order].reverse())g.tap(id);                 // baklänges: ordningen spelar ingen roll
  assert.equal(g.state.served,1);assert.equal(g.state.combo,1);assert.ok(g.state.score>0);
  assert.ok(until(g,()=>g.front()));c=g.front();
  const wrongId=KIOSK_ITEMS.map(i=>i.id).find(id=>!c.order.includes(id));
  if(wrongId){const p=c.patience,r=g.tap(wrongId);assert.ok(r.wrong);assert.equal(g.state.combo,0);assert.ok(c.patience<=p-KIOSK.wrongCost+1e-9);assert.equal(g.state.wrong,1);}
  assert.equal(comboMult(0),1);assert.equal(comboMult(4),1+4*KIOSK.combo.step);assert.equal(comboMult(99),1+KIOSK.combo.max*KIOSK.combo.step);
});

test('Tomtekön: specialkunderna (Glömske Gösta, Tomtemor, Påtårs-Per) gör det de ska', ()=>{
  // tvinga fram en kund av en viss sort genom att byta den första i kön
  const withKind=(kind,seed=11)=>{const g=createKioskGame({rand:seeded(seed)});until(g,()=>g.front());const c=g.front();c.kind=kind;c.name=CUSTOMERS[kind].name;return {g,c};};
  {const {g,c}=withKind('glomsk');c.frontAt=g.state.t;assert.ok(g.visible(c));c.patience=c.max=99;for(let t=0;t<KIOSK.glomskShow+.1;t+=.05)g.step(.05);
    if(g.front()===c){assert.ok(!g.visible(c),'bubblan döljs');const p=c.patience;assert.ok(g.peek());assert.ok(g.visible(c),'kik visar igen');assert.ok(c.patience<p);}}
  {const {g,c}=withKind('andrar');const before=[...c.order];g.tap(c.order[0]);
    if(c.order.length>1){assert.ok(c.changed);assert.notDeepEqual(c.order,before,'en vara byttes');assert.equal(new Set(c.order).size,c.order.length);}}
  {const g=createKioskGame({rand:seeded(3)});let found=null;for(let i=0;i<4000&&!found;i++){g.step(.05);for(const q of g.state.queue)if(q.kind==='patar')found=q;if(g.front())g.tap(need(g.front()));}
    assert.ok(found,'Påtårs-Per dyker upp');assert.ok(found.order.length>new Set(found.order).size,'samma sak två gånger');}
});

test('Tomtekön: tre tomtar som går stänger kassan; annars tar tiden slut; hyllan flyttas var femte', ()=>{
  const g=createKioskGame({rand:seeded(9)});let t=0;while(!g.state.over&&t<KIOSK.seconds+5){g.step(.1);t+=.1;}
  assert.equal(g.state.reason,'stängt');assert.equal(g.state.lost,KIOSK.lives);assert.ok(g.drain().some(e=>e.type==='over'));
  const h=createKioskGame({rand:seeded(9)});const shelf0=[...h.state.shelf];
  while(!h.state.over){h.step(.05);const c=h.front();if(c&&h.visible(c))h.tap(need(c));else if(c&&c.kind==='glomsk')h.peek();}
  assert.equal(h.state.reason,'tiden');assert.ok(h.state.served>=KIOSK.shuffleEvery*2);assert.ok(h.state.shuffles>=2);assert.notDeepEqual(h.state.shelf,shelf0);
  assert.equal(starsFor(KIOSK.stars[0]-1),0);assert.equal(starsFor(KIOSK.stars[0]),1);assert.equal(starsFor(KIOSK.stars[2]+5),3);
});

test('Tomtekön: svårigheten (simulerade spelare) – långsam ofta en stjärna, vanlig två, snabb tre', ()=>{
  const play=(tapEvery,react,err,seed)=>{const rand=seeded(seed),g=createKioskGame({rand});let next=0,cur=null;
    while(!g.state.over){g.step(.05);const c=g.front();if(!c)continue;if(c!==cur){cur=c;next=g.state.t+react;}
      if(g.state.t>=next){next=g.state.t+tapEvery;if(!g.visible(c)&&c.kind==='glomsk'){g.peek();continue;}g.tap(rand()<err?'tidning':need(c));}}
    return g.state;};
  const avg=(a,b,c)=>{let s=0;const st=[0,0,0,0];for(let i=1;i<=30;i++){const r=play(a,b,c,i*7919);s+=r.served;st[starsFor(r.served)]++;}return {served:s/30,st};};
  const slow=avg(.8,.9,.15),mid=avg(.6,.7,.12),fast=avg(.35,.35,.05);
  assert.ok(slow.st[0]+slow.st[1]+slow.st[2]>=25,'långsam: sällan tre stjärnor '+JSON.stringify(slow));
  assert.ok(slow.st[1]+slow.st[2]+slow.st[3]>=24,'långsam: oftast minst en stjärna '+JSON.stringify(slow));
  assert.ok(mid.served>slow.served&&fast.served>mid.served);
  assert.ok(fast.st[3]>=24,'snabb: tre stjärnor '+JSON.stringify(fast));
});

test('Tomtekön: sparningen tvättas och rekordet räknas', ()=>{
  const s=blankKiosk();assert.ok(recordKiosk(s,{score:900,served:14}));assert.ok(!recordKiosk(s,{score:500,served:22}));
  assert.deepEqual(s,{v:1,best:900,served:22,stars:2,plays:2});
  assert.deepEqual(sanitizeKiosk({best:'77',served:-3,stars:9,plays:2.9}),{v:1,best:77,served:0,stars:0,plays:2});assert.deepEqual(sanitizeKiosk(null),blankKiosk());
});

test('uppdragsmotorn: ett eget spel tar över Pressbyråns beställning (klockan står still, resultatet ger stämpel och poäng)', ()=>{
  const m=new Map(),store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};
  const events=[],rewards=[];let now=1_800_000_000_000;
  const q=new PlaceQuests({places:XMAS_PLACES,anchors:{pressbyran14:{x:30.78,z:-52.68,yaw:0}},faces:{pressbyran14:'south'},storage:store,clock:()=>now,host:{push:e=>events.push(e),reward:p=>rewards.push(p),available:()=>true}});
  const press=q.get('pressbyran');assert.equal(press.activity.title,'TOMTEKÖN');assert.equal(XMAS_PRESSBYRAN.activity.verb,'ÖPPNA KASSAN');
  const at={x:press.talk.x,z:press.talk.z,y:1.68};
  q.start(press);assert.equal(q.run.phase,'serve');assert.ok(q.markExternal());
  for(let i=0;i<200;i++)q.step(1,at);                                // 200 s: motorns egen klocka får inte stänga
  assert.equal(q.run.phase,'serve');
  const out=q.finishExternal({ok:true,fraction:2/3,mistakes:0,line:'Tomtekön är tom!'});
  assert.ok(out&&out.first&&out.points>press.reward.points,'första gången: poäng och bonus');
  const done=events.find(e=>e.type==='place-complete');assert.ok(done&&done.stamp&&done.line==='Tomtekön är tom!');assert.equal(q.run,null);
  // misslyckat pass: uppdraget blir "failed" (FÖRSÖK IGEN), ingen belöning
  now+=10*60e3;q.step(30,at);q.start(press);q.markExternal();assert.equal(q.finishExternal({ok:false}),null);assert.equal(q.run.phase,'failed');
  assert.equal(q.finishExternal({ok:true}),null,'inget eget spel pågår');
});

test('julbygget: Tomtekön är inkopplad, och Sista rundan och Löfbergs-kiosken är borta från torget', ()=>{
  const boot=fs.readFileSync(new URL('../xmas/xmas-boot.js',import.meta.url),'utf8'),lr=fs.readFileSync(new URL('../last-round.js',import.meta.url),'utf8'),jv=fs.readFileSync(new URL('../journey-view.js',import.meta.url),'utf8');
  assert.match(boot,/e\.type==='place-start'&&e\.placeId==='pressbyran'/);assert.match(boot,/Q\?\.markExternal\?\.\(\)/);assert.match(boot,/kiosk-rush\.js\?v=/);
  assert.doesNotMatch(boot,/function goBase|location\.assign\(baseUrl\)/,'ingen väg till grundspelet');
  assert.match(lr,/if\(xmas\)\{for\(const e of lastRoundProps\)e\.enabled=false;journeyView\.hideStation\('coffee'\);\}/);
  assert.match(lr,/guardSign\.enabled=!isJourney\(\)&&!xmas/);assert.match(jv,/function hideStation\(type\)/);
});
