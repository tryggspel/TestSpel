// Julklappsjakten: utläggets mått (antal, avstånd, tid), paketjaktens regler, sparning och sparskyddet.
import test from 'node:test';
import assert from 'node:assert/strict';
import {INTRO,INTRO_GOAL,SPIRAL_LENGTH,TORGET_PROPS,PROP_CLEARANCE,TREE} from '../xmas/xmas-layout.mjs';
import {XmasHunt,seededRandom} from '../xmas/xmas-hunt.mjs';
import {XmasSave,sanitizeSave,blankSave} from '../xmas/xmas-save.mjs';
import {COMBO,comboMult,timeBonus,DELIVERY,FREE_RAIN,STAMPS,titleFor,baseGameUrl,BASE_GAME_URL,WEATHER,WEATHER_ORDER} from '../xmas/xmas-config.mjs';
import {namespacedStorage,installNamespacedStorage} from '../xmas/xmas-storage.mjs';
import {CATCH,catchReach} from '../journey-rules.mjs';

const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),get length(){return m.size;},key:i=>[...m.keys()][i]??null,m};};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Går en polyline med jämn fart och matar motorn som spelet gör: ett steg per bildruta med sträckan sedan förra steget.
function walk(hunt,points,speed,{fps=60,start=null}={}){
  let pos={...(start||points[0])},from=null;const dt=1/fps;
  for(let i=start?0:1;i<points.length;i++){
    const to=points[i];
    while(dist(pos,to)>speed*dt){
      const d=dist(pos,to);from={...pos};pos={x:pos.x+(to.x-pos.x)/d*speed*dt,z:pos.z+(to.z-pos.z)/d*speed*dt};
      hunt.step(dt,{x:pos.x,z:pos.z,y:1.68},from,speed);
    }
  }
  return pos;
}
const trail=()=>[INTRO.spawn,...INTRO.packages.filter(p=>p.kind==='regular'),INTRO.tomte];

test('introduktionens utlägg: 25–35 vanliga paket, 2–3 bonuspaket, mål 20 och tät, tydlig slinga',()=>{
  const reg=INTRO.packages.filter(p=>p.kind==='regular'),bon=INTRO.packages.filter(p=>p.kind==='bonus');
  assert.ok(reg.length>=25&&reg.length<=35,'vanliga paket: '+reg.length);
  assert.ok(bon.length>=2&&bon.length<=3,'bonuspaket: '+bon.length);
  assert.equal(INTRO_GOAL,20);assert.ok(reg.length>INTRO_GOAL,'fler vanliga paket än målet, så ett missat paket inte spelar roll');
  assert.equal(new Set(INTRO.packages.map(p=>p.id)).size,INTRO.packages.length,'stabila, unika ID');
  for(const p of INTRO.packages){assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));}
  // Första paketen syns och kan tas inom några sekunder.
  assert.ok(dist(INTRO.spawn,reg[0])<=8,'första paketet ligger '+dist(INTRO.spawn,reg[0]).toFixed(1)+' m från start');
  // Avstånd: inga paket i varandra, inte i bänkar/lyktor/träd, inte i granen.
  let minPair=1e9;for(let i=0;i<INTRO.packages.length;i++)for(let j=i+1;j<INTRO.packages.length;j++)minPair=Math.min(minPair,dist(INTRO.packages[i],INTRO.packages[j]));
  assert.ok(minPair>=1.5,'minsta avstånd mellan paket '+minPair.toFixed(2));
  for(const p of INTRO.packages){
    for(const [x,z] of TORGET_PROPS)assert.ok(Math.hypot(p.x-x,p.z-z)>=PROP_CLEARANCE-.05,p.id+' ligger i en bänk, lykta eller planta');
    assert.ok(dist(p,TREE)>=TREE.radius+1.3,p.id+' ligger för nära granen');
  }
  // Takten: i ordning är det ~2 m i grupperna och 12–20 m mellan grupperna: en insamling var 2–4 sekund på normal fart.
  const gaps=[];for(let i=1;i<reg.length;i++)gaps.push(dist(reg[i-1],reg[i]));
  const inter=gaps.filter(g=>g>6);assert.ok(inter.length>=8&&inter.length<=11,'grupper: '+(inter.length+1));
  for(const g of inter)assert.ok(g>=12&&g<=20,'avstånd mellan grupper '+g.toFixed(1));
  for(const g of gaps.filter(g=>g<=6))assert.ok(g<=3,'avstånd i grupp '+g.toFixed(1));
  assert.ok(SPIRAL_LENGTH>220&&SPIRAL_LENGTH<300,'slingans längd '+SPIRAL_LENGTH.toFixed(0));
  // Tomten ligger vid slutet av slingan och syns från start (långt från granens skugga).
  const last=reg.at(-1);assert.ok(dist(last,INTRO.tomte)<30,'tomten nära slutet');
  assert.ok(dist(INTRO.spawn,INTRO.tomte)>15&&dist(INTRO.spawn,INTRO.tomte)<45);
  // Bonuspaketen är valfria avstickare: på 6–14 m från närmaste vanliga paket, så att de inte råkas ta på vägen men syns från spåret.
  for(const b of bon){const nr=Math.min(...reg.map(r=>dist(r,b)));assert.ok(nr>=5&&nr<=14,b.id+' avstickare '+nr.toFixed(1));}
});

test('introduktionen tar ungefär 60–90 sekunder för en ny spelare och är snabbare för en van',()=>{
  const tr=trail();let len=0;for(let i=1;i<tr.length;i++)len+=dist(tr[i-1],tr[i]);
  const pickupOverhead=8+6; // läsa målet i början och hinna fram till tomten i slutet (sekunder)
  const slow=len/4.2+pickupOverhead,typical=len/5+pickupOverhead,fast=len/7.2+pickupOverhead;
  assert.ok(typical>=55&&typical<=90,'normal fart '+typical.toFixed(0)+' s');
  assert.ok(slow<=105,'långsam fart '+slow.toFixed(0)+' s');assert.ok(fast>=35,'snabb fart '+fast.toFixed(0)+' s');
  // En insamling (grupp av 2–4 paket) var 2–4 sekund på normal fart.
  const reg=INTRO.packages.filter(p=>p.kind==='regular');const inter=[];for(let i=1;i<reg.length;i++){const g=dist(reg[i-1],reg[i]);if(g>6)inter.push(g);}
  const per=inter.reduce((a,b)=>a+b,0)/inter.length/5;assert.ok(per>=2&&per<=4,'sekunder mellan insamlingar '+per.toFixed(2));
  // 20 paket tar ungefär 20–35 sekunder av gåendet, resten är start och leverans.
  let l20=0,prev=INTRO.spawn;for(const p of reg.slice(0,20)){l20+=dist(prev,p);prev=p;}assert.ok(l20/5>=18&&l20/5<=40,'20 paket på '+(l20/5).toFixed(0)+' s');
});

test('hela slingan går att samla på gångfart: 20 paket, leverans hos tomten, stämpel och rekord',()=>{
  const save=new XmasSave(mem());const hunt=new XmasHunt({save});hunt.startIntro();
  assert.deepEqual(hunt.drain().map(e=>e.type),['xmas-start']);
  walk(hunt,trail(),CATCH.walk);
  const ev=hunt.drain();
  const picks=ev.filter(e=>e.type==='xmas-pick'),goal=ev.find(e=>e.type==='xmas-goal'),del=ev.find(e=>e.type==='xmas-deliver');
  assert.ok(picks.length>=29,'plockade '+picks.length);
  assert.equal(goal.collected,INTRO_GOAL,'målet nås vid exakt 20');
  assert.ok(del,'leveransen sker automatiskt vid tomten');
  assert.equal(del.result.stamp,true);assert.equal(del.result.stampId,'intro');assert.ok(save.hasStamp('intro'));assert.equal(save.introDone,true);
  assert.equal(del.result.collected,hunt.run.collected);assert.ok(del.result.collected>=20);
  assert.equal(del.result.parts.packages+del.result.parts.delivery+del.result.parts.time,del.result.points);
  assert.ok(del.result.seconds>=30&&del.result.seconds<=75,'tid '+del.result.seconds);
  assert.equal(hunt.active,false);assert.equal(hunt.run.phase,'done');
  assert.equal(save.state.records.intro.points,del.result.points);assert.equal(save.state.totals.runs,1);
  // Ingenting händer efter leveransen, och inga fler poäng.
  const before=hunt.run.points;walk(hunt,trail(),CATCH.walk);assert.equal(hunt.run.points,before);assert.equal(hunt.drain().length,0);
});

test('målet nås före tomten: vägledningen byter från paket till tomte, och leverans kräver tomten',()=>{
  const hunt=new XmasHunt({save:new XmasSave(mem())});hunt.startIntro();hunt.drain();
  const reg=INTRO.packages.filter(p=>p.kind==='regular');
  walk(hunt,[INTRO.spawn,...reg.slice(0,20)],CATCH.walk);
  const e=hunt.drain();const goalEv=e.find(x=>x.type==='xmas-goal');assert.ok(goalEv);assert.equal(goalEv.collected,20,'målhändelsen kommer vid exakt 20');assert.equal(hunt.run.phase,'deliver');assert.ok(hunt.run.collected>=20&&hunt.run.collected<=22);
  assert.ok(!e.some(x=>x.type==='xmas-deliver'),'ingen leverans förrän man är hos tomten');
  const p={x:reg[19].x,z:reg[19].z,y:1.68};const startCount=hunt.run.collected;
  const o=hunt.objective(p);assert.equal(o.kind,'xmas');assert.match(o.label,/TOMTEN/);assert.equal(o.x,INTRO.tomte.x);
  assert.equal(hunt.target(p).kind,'tomte');
  // Fler paket går fortfarande att ta på vägen (extra poäng).
  const left=reg.slice(20);walk(hunt,[reg[19],...left,INTRO.tomte],CATCH.walk);
  assert.ok(hunt.drain().some(x=>x.type==='xmas-deliver'));assert.equal(hunt.run.collected,30);assert.ok(30>startCount);
});

test('ett plockat paket ger aldrig poäng igen, hur man än går tillbaka',()=>{
  const hunt=new XmasHunt({save:null});hunt.startIntro();hunt.drain();
  const reg=INTRO.packages.filter(p=>p.kind==='regular');
  const p0=reg[0];hunt.step(.016,{x:p0.x,z:p0.z,y:1.68},null,0);
  assert.ok(hunt.run.collected>=1&&hunt.run.collected<=2);const points=hunt.run.points;
  for(let i=0;i<50;i++)hunt.step(.016,{x:p0.x,z:p0.z,y:1.68},null,0);
  walk(hunt,[{x:p0.x+30,z:p0.z},{x:p0.x,z:p0.z},{x:p0.x-3,z:p0.z}],CATCH.walk,{start:{x:p0.x,z:p0.z}});
  assert.equal(hunt.drain().filter(e=>e.type==='xmas-pick'&&e.id===p0.id).length,1);
  assert.ok(hunt.run.points>=points);
  // Ny körning = nya paket (avsiktlig omstart), men stämpeln delas bara ut en gång.
});

test('fångstfältet: 2,4 m till fots, större i hög fart, och aldrig genom väggar',()=>{
  const mk=(blocked=()=>false)=>{const h=new XmasHunt({nav:{blocked}});h.startRun({kind:'test',id:'t',goal:1,packages:[{id:'a',x:0,z:0,kind:'regular'}],tomte:{x:50,z:50,radius:3}});h.drain();return h;};
  let h=mk();h.step(.016,{x:0,z:2.0,y:1.68},null,CATCH.walk);assert.equal(h.run.collected,1,'2,0 m ligger inom fältet till fots');
  h=mk();h.step(.016,{x:0,z:2.6,y:1.68},null,CATCH.walk);assert.equal(h.run.collected,0,'2,6 m ligger utanför fältet till fots');
  h=mk();h.step(.016,{x:0,z:3.6,y:1.68},null,15);assert.equal(h.run.collected,1,'3,6 m tas i turbofart (fält '+catchReach(15).toFixed(1)+' m)');
  h=mk();h.step(.016,{x:0,z:4.3,y:1.68},null,15);assert.equal(h.run.collected,0,'4,3 m ligger utanför fältet vid 15 m/s');
  h=mk();h.step(.016,{x:0,z:5.5,y:1.68},null,60);assert.equal(h.run.collected,1,'fältet toppar på '+catchReach(60).toFixed(1)+' m');
  h=mk();h.step(.016,{x:0,z:6.2,y:1.68},null,60);assert.equal(h.run.collected,0,'aldrig större än taket');
  // Sträckan sedan förra steget räknas: man hinner inte missa ett paket mellan två bildrutor.
  h=mk();h.step(.016,{x:0,z:-1.2,y:1.68},{x:0,z:1.2},40);assert.equal(h.run.collected,1);
  // Vägg mellan spelaren och paketet: inget tas (3 blockerade punkter i rad).
  h=mk((x,z)=>z>.6&&z<2);h.step(.016,{x:0,z:2.2,y:1.68},null,CATCH.walk);assert.equal(h.run.collected,0,'inte genom en vägg (tre blockerade punkter i rad)');
  h=mk((x,z)=>Math.abs(z-1.2)<.2);h.step(.016,{x:0,z:2.2,y:1.68},null,CATCH.walk);assert.equal(h.run.collected,1,'en stolpe stoppar inte');
  // Våningar: paket på marken tas inte från plan 1.
  h=mk();h.step(.016,{x:0,z:0,y:5.4},null,0);assert.equal(h.run.collected,0);
});

test('kombo: kedjan växer inom fönstret, poängen stiger i tydliga steg och bryts efter tystnad',()=>{
  const pk=(n)=>Array.from({length:n},(_,i)=>({id:'k'+i,x:i*3.2,z:0,kind:'regular'}));
  const h=new XmasHunt({});h.startRun({kind:'test',id:'t',goal:99,packages:pk(14),tomte:{x:99,z:99,radius:3},windowSec:COMBO.window});h.drain();
  const picks=[];
  for(let i=0;i<14;i++){h.step(.5,{x:i*3.2,z:0,y:1.68},null,0);picks.push(...h.drain().filter(e=>e.type==='xmas-pick'));}
  assert.deepEqual(picks.map(e=>e.mult),[1,1,1,2,2,2,2,3,3,3,3,4,4,4]);
  assert.deepEqual(picks.filter(e=>e.praise).map(e=>[e.chain,e.tierBonus]),[[4,20],[8,40],[12,60]]);
  assert.equal(h.run.bestChain,14);
  // Tystnad längre än fönstret bryter kedjan; nästa paket startar om på 1.
  const g=new XmasHunt({});g.startRun({kind:'test',id:'t',goal:99,packages:pk(4),tomte:{x:99,z:99,radius:3},windowSec:COMBO.window});g.drain();
  g.step(.1,{x:0,z:0,y:1.68},null,0);g.step(.1,{x:3.2,z:0,y:1.68},null,0);assert.equal(g.run.chain,2);
  for(let i=0;i<5;i++)g.step(1,{x:50,z:50,y:1.68},null,0);assert.equal(g.run.chain,0);
  g.step(.1,{x:6.4,z:0,y:1.68},null,0);assert.equal(g.run.chain,1);
  assert.equal(comboMult(1),1);assert.equal(comboMult(4),2);assert.equal(comboMult(8),3);assert.equal(comboMult(12),4);assert.equal(comboMult(40),4);
});

test('bonuspaket ger extra belöning men krävs inte för att klara uppdraget',()=>{
  const save=new XmasSave(mem());const h=new XmasHunt({save});h.startIntro();h.drain();
  walk(h,trail(),CATCH.walk);const del=h.drain().find(e=>e.type==='xmas-deliver');
  assert.equal(del.result.bonusCollected,0,'bonuspaketen ligger vid sidan av spåret (valfria avstickare)');assert.equal(del.result.bonusTotal,3);assert.ok(del.result.stamp);
  const bon=INTRO.packages.filter(p=>p.kind==='bonus');
  const h2=new XmasHunt({});h2.startIntro();h2.drain();
  for(const b of bon)h2.step(.016,{x:b.x,z:b.z,y:1.68},null,0);
  assert.equal(h2.run.bonusCollected,3);assert.equal(h2.run.collected,0,'bonuspaket räknas inte mot målet');assert.equal(h2.run.points,150);
});

test('timeBonus: snabbare ger mer, ingen tidsgräns som misslyckas',()=>{
  assert.equal(timeBonus(DELIVERY.fast),DELIVERY.maxTimeBonus);assert.equal(timeBonus(DELIVERY.slow),0);assert.equal(timeBonus(900),0);
  assert.ok(timeBonus(75)>timeBonus(100));assert.equal(timeBonus(10),DELIVERY.maxTimeBonus);
  const h=new XmasHunt({save:new XmasSave(mem())});h.startIntro();h.drain();
  for(let i=0;i<4000;i++)h.step(.5,{x:0,z:60,y:1.68},null,0);// 2000 sekunder långt från paketen
  assert.equal(h.active,true,'ingen förlust av att vara långsam');
});

test('fri julvandring: nya paketregn med egna ID, tydligt utlagda och som försvinner efter en stund',()=>{
  const rand=seededRandom(7),h=new XmasHunt({rand,nav:{snap:p=>p,blocked:()=>false}});h.startFree();h.drain();
  const p={x:0,z:0,y:1.68};const rains=[];
  for(let i=0;i<2400;i++){h.step(.25,p,null,0);for(const e of h.drain())if(e.type==='xmas-rain')rains.push(e);}
  assert.ok(rains.length>=3,'regn: '+rains.length);
  assert.ok(rains[0].count>=FREE_RAIN.count[0]&&rains[0].count<=FREE_RAIN.count[1]);
  const d=Math.hypot(rains[0].x,rains[0].z);assert.ok(d>=FREE_RAIN.minDistance*.7&&d<=FREE_RAIN.maxDistance+4,'avstånd '+d.toFixed(0));
  assert.ok(h.run.rains.length<=FREE_RAIN.maxActive);
  const ids=h.run.packages.map(k=>k.id);assert.equal(new Set(ids).size,ids.length);
  // Ett regn som ingen rört försvinner efter sin livstid.
  const h2=new XmasHunt({rand:seededRandom(3),nav:{snap:q=>q,blocked:()=>false}});h2.startFree();h2.drain();
  let gone=null;for(let i=0;i<4000&&!gone;i++){h2.step(.5,p,null,0);gone=h2.drain().find(e=>e.type==='xmas-rain-gone')||null;}
  assert.ok(gone,'regnet försvinner');assert.ok(gone.missed>0);
  // Plockade paket kan inte plockas igen när man kommer tillbaka.
  const h3=new XmasHunt({rand:seededRandom(5),nav:{snap:q=>q,blocked:()=>false}});h3.startFree();h3.drain();
  let rain=null;for(let i=0;i<200&&!rain;i++){h3.step(.25,p,null,0);rain=h3.drain().find(e=>e.type==='xmas-rain')||null;}
  const pk=h3.run.packages.filter(k=>k.rain===rain.rain);
  for(const k of pk){h3.step(.016,{x:k.x,z:k.z,y:1.68},null,0);}
  const pts=h3.run.points;assert.ok(pts>0);for(const k of pk)h3.step(.016,{x:k.x,z:k.z,y:1.68},null,0);assert.equal(h3.run.points,pts);
});

test('rundor har mjuk tid: sen leverans ger ingen tidsbonus men går alltid att göra',()=>{
  const save=new XmasSave(mem());const h=new XmasHunt({save});
  h.startRun({kind:'round',id:'round-torget',title:'T',goal:2,packages:[{id:'r1',x:0,z:0,kind:'regular'},{id:'r2',x:2,z:0,kind:'regular'}],tomte:{x:6,z:0,radius:3},soft:10,stampId:'round-torget'});h.drain();
  for(let i=0;i<30;i++)h.step(.5,{x:30,z:30,y:1.68},null,0);assert.ok(h.drain().some(e=>e.type==='xmas-late'));
  h.step(.1,{x:0,z:0,y:1.68},null,0);h.step(.1,{x:2,z:0,y:1.68},null,0);h.step(.1,{x:6,z:0,y:1.68},null,0);
  const del=h.drain().find(e=>e.type==='xmas-deliver');assert.equal(del.result.parts.time,0);assert.equal(del.result.late,true);assert.ok(del.result.stamp);
});

test('sparningen: stämpel en gång, rekord, summor och skydd mot trasiga sparfiler',()=>{
  const st=mem();const s=new XmasSave(st);
  assert.equal(s.stamp('intro'),true);assert.equal(s.stamp('intro'),false);assert.equal(s.stamp('finns-inte'),false);assert.equal(s.stampCount(),1);assert.equal(s.stampTotal(),STAMPS.length);
  s.record('intro',{points:300,seconds:70});assert.equal(s.record('intro',{points:200,seconds:60}),false,'sämre poäng är inget rekord');assert.equal(s.state.records.intro.points,300);
  assert.equal(s.record('intro',{points:400,seconds:80}),true);assert.equal(s.state.records.intro.points,400);
  s.addTotals({packages:12,bonus:1,points:400});assert.equal(s.state.totals.runs,1);
  assert.equal(s.setWeather('light'),true);assert.equal(s.setWeather('storm'),false);
  const again=new XmasSave(st);assert.equal(again.hasStamp('intro'),true);assert.equal(again.weather,'light');assert.equal(again.state.totals.packages,12);assert.equal(again.title(),titleFor(400));
  for(const bad of ['inte json','{"v":2}','null','[]','{"v":1,"stamps":{"x":1},"totals":{"packages":"NaN"},"opts":{"weather":"storm"}}']){
    const m=mem();m.setItem('karlstad-xmas:save:1',bad);const t=new XmasSave(m);assert.equal(t.stampCount(),0);assert.equal(t.weather,'full');assert.ok(Number.isFinite(t.state.totals.packages));
  }
  assert.deepEqual(sanitizeSave(null),blankSave());
  assert.equal(new XmasSave(null).stamp('intro'),true,'utan lagring spelas det ändå');
  const broken={getItem(){throw new Error('x');},setItem(){throw new Error('x');}};assert.doesNotThrow(()=>{const b=new XmasSave(broken);b.stamp('intro');b.save();});
});

test('egen sparning: grundspelets nycklar prefixas, julspelets egna rörs inte och clear tar bara julspelets',()=>{
  const real=mem();real.setItem('karlstad:journey:1','grund');real.setItem('karlstad:muted:1','off');
  const ns=namespacedStorage(real);
  ns.setItem('karlstad:journey:1','jul');assert.equal(real.getItem('karlstad:journey:1'),'grund','grundspelets nyckel är orörd');assert.equal(real.getItem('xmas:karlstad:journey:1'),'jul');
  assert.equal(ns.getItem('karlstad:journey:1'),'jul');assert.equal(ns.getItem('karlstad:muted:1'),null,'julspelet ser inte grundspelets ljudval');
  ns.setItem('karlstad-xmas:save:1','x');assert.equal(real.getItem('karlstad-xmas:save:1'),'x');
  ns.clear();assert.equal(real.getItem('karlstad:journey:1'),'grund');assert.equal(real.getItem('karlstad:muted:1'),'off');assert.equal(real.getItem('xmas:karlstad:journey:1'),null);assert.equal(real.getItem('karlstad-xmas:save:1'),null);
  ns.setItem('karlstad:fun:1','1');assert.equal(ns.length,1);assert.equal(ns.key(0),'karlstad:fun:1');ns.removeItem('karlstad:fun:1');assert.equal(ns.length,0);
  const win={localStorage:real};assert.equal(installNamespacedStorage(win),true);win.localStorage.setItem('karlstad:x','1');assert.equal(real.getItem('xmas:karlstad:x'),'1');assert.equal(installNamespacedStorage(win),true,'idempotent');
  assert.equal(installNamespacedStorage(null),false);
  const locked={};Object.defineProperty(locked,'localStorage',{value:real,configurable:false});assert.equal(installNamespacedStorage(locked),false,'faller tillbaka tyst om webbläsaren inte tillåter det');
});

test('adressen tillbaka till Karlstad-spelet är grundspelets, och kan bara åsidosättas lokalt med ?debug',()=>{
  assert.equal(baseGameUrl('',''),BASE_GAME_URL);assert.match(BASE_GAME_URL,/^https:\/\/karlstad-city-visual-twin\.vercel\.app\/$/);
  assert.equal(baseGameUrl('?base=http://localhost:8902/','localhost'),BASE_GAME_URL,'kräver ?debug');
  assert.equal(baseGameUrl('?debug&base=http://localhost:8902/','localhost'),'http://localhost:8902/');
  assert.equal(baseGameUrl('?debug&base=http://localhost:8902/','karlstad-julklappsjakten.vercel.app'),BASE_GAME_URL,'bara på localhost');
  assert.equal(baseGameUrl('?debug&base=https://evil.example/','localhost'),BASE_GAME_URL,'ingen extern adress');
  assert.deepEqual([...WEATHER_ORDER],Object.keys(WEATHER));assert.ok(WEATHER.full.flakes>=60&&WEATHER.full.flakes<=100&&WEATHER.off.flakes===0);
});
