// xmas.14: O'Learys (regler, fysik, ritning, FBK-tipset), julguiden och Platsjakten.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bowlingScore,pinsStanding,BOWL_FRAMES,dartScore,DART_ORDER,shuffleZone,shuffleScore,SHUFFLE,pentaPoints,tipPoints,tipOpen,matchStart,outcomeOf,tipTotals,
  blankOlearys,sanitizeOlearys,recordActivity,recordPenta,ACTIVITIES} from '../xmas/olearys-rules.mjs';
import {makeWorld,addBody,stepWorld,moving,drain} from '../xmas/olearys-physics.mjs';
import {VENUE,FURNITURE,STATIONS,LANES,venueColliders,inVenue,toWorld,FBK_MATCHES} from '../xmas/olearys-data.mjs';
import {JULGUIDE,placedGuide,nearestGuide,guideById,GUIDE} from '../xmas/xmas-julguide-data.mjs';
import {PLATSER,platsjaktFor,compass,found,sanitizePlatsjakt,PLATSJAKT,contestFor,nextPlace,RECENT_KEEP} from '../xmas/xmas-platsjakt.mjs';
import {missionView} from '../xmas/xmas-guide.mjs';
import {XmasMeta} from '../xmas/xmas-meta.mjs';
import {XP,COUPONS} from '../xmas/xmas-meta-config.mjs';
import {marketColliders,TRUCKS,TRUCK} from '../xmas/xmas-market-data.mjs';
import {frameMarks} from '../xmas/olearys-games.js';

const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};
const days=(from,n)=>Array.from({length:n},(_,i)=>new Date(Date.parse(from+'T12:00:00Z')+i*864e5).toISOString().slice(0,10));

test('bowling: fem rutor med strike, spärr och sista rutans extraslag', ()=>{
  assert.equal(bowlingScore([10,10,10,10,10,10,10]).total,150);                       // perfekt serie i fem rutor
  assert.ok(bowlingScore([10,10,10,10,10,10,10]).done);
  assert.equal(bowlingScore([9,0,9,0,9,0,9,0,9,0]).total,45);
  assert.equal(bowlingScore([5,5,3,0,0,0,0,0,0,0]).total,16);                           // spärr + nästa slag
  assert.equal(bowlingScore([10,3,4,0,0,0,0,0,0]).total,24);                            // strike + två slag
  assert.ok(!bowlingScore([10,3]).done);assert.equal(bowlingScore([10,3]).frames[0].score,null);
  assert.equal(bowlingScore([0,0,0,0,0,0,0,0,7,3,5]).total,15);                          // sista rutan: spärr ger ett tredje slag
  assert.ok(!bowlingScore([0,0,0,0,0,0,0,0,7,3]).done);
  assert.equal(pinsStanding([]),10);assert.equal(pinsStanding([7]),3);assert.equal(pinsStanding([7,2]),10);assert.equal(pinsStanding([10]),10);
  assert.equal(pinsStanding([0,0,0,0,0,0,0,0,10]),10);assert.equal(pinsStanding([0,0,0,0,0,0,0,0,10,4]),6);assert.equal(pinsStanding([0,0,0,0,0,0,0,0,6,4]),10);
  assert.deepEqual(frameMarks([10],false),['X']);assert.deepEqual(frameMarks([7,3],false),['7','/']);assert.deepEqual(frameMarks([0,5],false),['–','5']);
  assert.deepEqual(frameMarks([10,10,10],true),['X','X','X']);assert.deepEqual(frameMarks([7,3,10],true),['7','/','X']);
});

test('dart: tavlans poäng med riktiga proportioner', ()=>{
  assert.deepEqual(dartScore(0,0),{score:50,label:'BULL'});
  assert.equal(dartScore(0,.07).score,25);
  assert.equal(dartScore(0,.5).score,20);                    // rakt upp: 20
  assert.equal(dartScore(0,.6).score,60);                    // trippel 20
  assert.equal(dartScore(0,.98).score,40);                   // dubbel 20
  assert.equal(dartScore(0,1.05).score,0);
  assert.equal(dartScore(.5,0).score,6);                     // rakt höger: 6
  assert.equal(dartScore(0,-.5).score,3);                    // rakt ned: 3
  assert.equal(dartScore(-.5,0).score,11);                   // rakt vänster: 11
  assert.equal(DART_ORDER.length,20);
});

test('shuffleboard: zonerna och att bara den ledande får poäng', ()=>{
  assert.equal(shuffleZone(.5),0);assert.equal(shuffleZone(.7),1);assert.equal(shuffleZone(.8),2);assert.equal(shuffleZone(.95),3);assert.equal(shuffleZone(.99),4);assert.equal(shuffleZone(1.01),0);
  assert.deepEqual(shuffleScore([{who:'p',t:.95,on:true},{who:'p',t:.8,on:true},{who:'c',t:.85,on:true}]),{p:3,c:0,leader:'p'});  // bara pucken före motståndarens bästa
  assert.deepEqual(shuffleScore([{who:'p',t:.7,on:true},{who:'c',t:.99,on:true},{who:'c',t:.4,on:false}]),{p:0,c:4,leader:'c'});
  assert.deepEqual(shuffleScore([]),{p:0,c:0,leader:null});
  assert.equal(SHUFFLE.pucks,4);
});

test('femkampen: varje gren 0–100', ()=>{
  assert.equal(pentaPoints('bowling',150),100);assert.equal(pentaPoints('bowling',60),50);
  assert.equal(pentaPoints('dart',300),100);assert.equal(pentaPoints('straff',{goals:3,of:5}),60);
  assert.equal(pentaPoints('biljard',{shots:6,potted:6,of:6}),100);assert.ok(pentaPoints('biljard',{shots:20,potted:6,of:6})<pentaPoints('biljard',{shots:10,potted:6,of:6}));
  assert.equal(pentaPoints('biljard',{shots:24,potted:3,of:6}),25);
  assert.ok(pentaPoints('shuffle',{p:5,c:2})>pentaPoints('shuffle',{p:5,c:7}));
  for(const a of ACTIVITIES)assert.ok(a.name&&a.text);
});

test('fysiken: krockar bevarar rörelsemängd, friktion stoppar, fickor och kanter', ()=>{
  const w=makeWorld({w:10,h:10,friction:1,restitution:1});
  const a=addBody(w,{x:2,y:5,r:.5,m:1,vx:3}),b=addBody(w,{x:5,y:5,r:.5,m:1});
  for(let i=0;i<12;i++)stepWorld(w,.1);assert.ok(Math.abs(a.vx)<.05&&Math.abs(b.vx-3)<.05,'lika massa: farten går över');
  const w2=makeWorld({w:10,h:10,friction:.3});const c=addBody(w2,{x:5,y:1,r:.1,vy:2});for(let i=0;i<60;i++)stepWorld(w2,.1);assert.ok(!moving(w2));
  const w3=makeWorld({w:1,h:2,friction:.9,walls:{left:'bounce',right:'bounce',top:'bounce',bottom:'bounce'},pockets:[{x:1,y:2,r:.07}]});const d=addBody(w3,{x:.5,y:1,r:.03,vx:1,vy:2});
  for(let i=0;i<30;i++)stepWorld(w3,.1);assert.ok(d.alive===false||d.y<=2,'bollen hålls på bordet');
  const w4=makeWorld({w:1,h:5,friction:.95,walls:{left:'fall',right:'fall',top:'fall',bottom:'open'}});const e=addBody(w4,{x:.5,y:1,r:.03,vy:8});for(let i=0;i<20;i++)stepWorld(w4,.1);assert.equal(e.alive,false);assert.ok(drain(w4).some(x=>x.type==='fall'));
});

test('FBK-tipset: poäng, stängt vid nedsläpp, inga XP', ()=>{
  assert.equal(outcomeOf(3,1),'1');assert.equal(outcomeOf(2,2),'X');assert.equal(outcomeOf(0,4),'2');
  assert.equal(tipPoints({pick:'1'},{home:3,away:1}),3);assert.equal(tipPoints({pick:'1',home:3,away:1},{home:3,away:1}),8);assert.equal(tipPoints({pick:'2'},{home:3,away:1}),0);assert.equal(tipPoints({pick:'1'},null),null);
  const m=FBK_MATCHES[0];assert.ok(tipOpen(m,Date.UTC(2026,11,3,17,59)));assert.ok(!tipOpen(m,Date.UTC(2026,11,3,18,0)));  // 19.00 svensk tid = 18.00 UTC
  for(const x of FBK_MATCHES){assert.match(x.start,/^2026-12-\d\dT\d\d:\d\d$/);assert.ok([x.home,x.away].includes('Färjestad BK'));assert.equal(x.result,null);}
  assert.deepEqual(tipTotals({},FBK_MATCHES),{points:0,settled:0,right:0});
  // tipset ger aldrig XP: framstegen har ingen funktion för tips, och O'Learys-rutans text säger det
  const src=fs.readFileSync(new URL('../xmas/olearys-games.js',import.meta.url),'utf8');assert.match(src,/varken XP eller lotter/);assert.doesNotMatch(src,/onTip/);
});

test("O'Learys-sparningen tvättas och rekorden räknas", ()=>{
  const s=blankOlearys();assert.ok(recordActivity(s,'dart',120));assert.ok(!recordActivity(s,'dart',80));assert.equal(s.best.dart,120);assert.equal(s.plays.dart,2);assert.equal(recordActivity(s,'okänd',5),false);
  assert.deepEqual(recordPenta(s,300,'2026-12-01'),{dayBest:true,record:true});assert.deepEqual(recordPenta(s,200,'2026-12-01'),{dayBest:false,record:false});assert.deepEqual(recordPenta(s,250,'2026-12-02'),{dayBest:true,record:false});
  const raw={v:1,visits:'3',best:{dart:'500',x:1},penta:{best:900,day:'fel'},tips:{'fbk-2026-12-03':{pick:'1',home:3,away:'1'},'<x>':{pick:'1'},'fbk-2026-12-05':{pick:'Q'}}};
  const t=sanitizeOlearys(raw);assert.equal(t.visits,3);assert.equal(t.best.dart,500);assert.equal(t.penta.best,500);assert.equal(t.penta.day,'');assert.deepEqual(Object.keys(t.tips),['fbk-2026-12-03']);assert.equal(t.tips['fbk-2026-12-03'].away,1);
  assert.deepEqual(sanitizeOlearys(null),blankOlearys());
});

test("O'Learys-ritningen: inredningen i lokalen, stationerna fria och nåbara, dörren fri från foodtrucks", ()=>{
  const hw=VENUE.w/2;
  for(const f of FURNITURE){assert.ok(f.x-f.w/2>=-hw-.01&&f.x+f.w/2<=hw+.01&&f.z+f.d/2<=.01&&f.z-f.d/2>=-VENUE.d-.01,f.id);}
  const solid=FURNITURE.filter(f=>f.solid),inBox=(p,f,m=0)=>Math.abs(p.x-f.x)<f.w/2+m&&Math.abs(p.z-f.z)<f.d/2+m;
  for(const s of STATIONS)assert.ok(!solid.some(f=>inBox(s,f,.35)),'stationen '+s.id+' står fritt');
  assert.ok(!solid.some(f=>inBox({x:0,z:-3.2},f,.4)),'man kommer in på fri golvyta');
  const cols=venueColliders();assert.ok(cols.length>=FURNITURE.filter(f=>f.solid).length+4);assert.ok(cols.every(c=>c.minx>2000&&c.maxz<-2000),'långt från staden');
  assert.ok(inVenue(toWorld({x:0,z:-20})));assert.ok(!inVenue({x:0,z:0}));
  assert.equal(LANES.count,6);
  // entrén på torget: inga foodtrucks eller marknadens kollisioner framför dörren
  const door=VENUE.street;for(const c of marketColliders()){const dx=Math.max(c.minx-door.x,0,door.x-c.maxx),dz=Math.max(c.minz-(door.z-5),0,(door.z-5)-c.maxz);assert.ok(Math.hypot(dx,dz)>1.2||c.maxz<door.z-9,'fritt framför dörren: '+c.id);}
  for(const t of TRUCKS)assert.ok(Math.abs(t.x-door.x)>TRUCK.len/2+2.5,'truck '+t.id+' står inte framför dörren');
});

test('julguiden: uppgifter, platser och närhet', ()=>{
  const ids=new Set();for(const e of JULGUIDE){assert.ok(!ids.has(e.id));ids.add(e.id);assert.ok(['julbord','julmarknad'].includes(e.kind));for(const k of ['name','address','when','price','text','source','checked'])assert.ok(e[k],e.id+' '+k);assert.match(e.checked,/^2026-11-\d\d$/);if(e.coupon)assert.ok(COUPONS.some(c=>c.id===e.coupon));}
  const placed=placedGuide();assert.ok(placed.length>=8);for(const e of placed)assert.ok(Number.isFinite(e.x)&&Number.isFinite(e.z)&&Number.isFinite(e.yaw),e.id);
  assert.ok(JULGUIDE.some(e=>e.id==='fratelli'&&e.address==='Drottninggatan 17'));
  const f=guideById('fratelli');assert.equal(nearestGuide({x:f.x+3,z:f.z+3}).entry.id,'fratelli');assert.equal(nearestGuide({x:f.x+GUIDE.near+5,z:f.z}),null);
  // ingen påstådd rabatt: inga erbjudanden ligger inne förrän ett ställe vill
  assert.ok(JULGUIDE.every(e=>!e.coupon&&!e.qr));
  const m=new XmasMeta({storage:mem()});assert.equal(m.onGuide('fratelli').xp,XP.guide);assert.equal(m.onGuide('fratelli'),null);assert.equal(m.onGuide('<x>'),null);
});

test('Platsjakten: en ny plats för varje jakt, aldrig någon av de senaste, samma plats vid FÖRSÖK IGEN', ()=>{
  let seed=7;const rand=()=>((seed=(seed*16807)%2147483647)/2147483647);
  const recent=[],seen=new Set();
  for(let i=0;i<60;i++){const x=platsjaktFor('2026-12-02',{recent,rand});assert.ok(x.seconds>=60&&x.seconds<=PLATSJAKT.maxSeconds);
    assert.ok(!recent.slice(-RECENT_KEEP).includes(x.place.id),'inte en av de '+RECENT_KEEP+' senaste: '+x.place.id);recent.push(x.place.id);seen.add(x.place.id);}
  assert.equal(seen.size,PLATSER.length,'alla platser kommer');
  const first=platsjaktFor('2026-12-02',{recent:[],rand:()=>0}),again=platsjaktFor('2026-12-02',{recent:[first.place.id],placeId:first.place.id});assert.equal(again.place.id,first.place.id,'FÖRSÖK IGEN: samma plats');
  assert.notEqual(nextPlace([first.place.id],()=>0).id,first.place.id);
  const camp=[{id:'t',from:'2026-12-10',to:'2026-12-12',place:'domkyrkan',title:'KAMPANJ'}];
  assert.equal(platsjaktFor('2026-12-11',{recent:['domkyrkan'],contests:camp}).place.id,'domkyrkan','kampanjens plats gäller för alla');
  assert.equal(platsjaktFor('fel'),null);assert.equal(contestFor('2026-12-01'),null);
  for(const p of PLATSER){assert.ok(Math.hypot(p.view.x-p.x,p.view.z-p.z)>15,'kameran står en bit ut');assert.ok(Math.hypot(p.look.x-p.x,p.look.z-p.z)<4,'målet ligger vid fasaden');}
  assert.equal(compass({x:0,z:0},{x:0,z:-100}),'norrut');assert.equal(compass({x:0,z:0},{x:100,z:0}),'österut');assert.equal(compass({x:0,z:0},{x:-50,z:50}),'sydväst');
  assert.ok(found({x:-69,z:-15},PLATSER[0]));assert.ok(!found({x:0,z:0},PLATSER[0]));
  // uppdragsraden i Platsjakten: inga spår i snön
  assert.deepEqual(missionView({plats:true,drops:true,phase:'free',packages:[],rains:[],goal:0}).rows.map(r=>r.text),['HITTA PLATSEN']);
});

test('Platsjakten: belöning en gång per plats och dag, högst tre platser om dagen, rekordtiden alltid', ()=>{
  const m=new XmasMeta({storage:mem(),rng:()=>.4}),when=new Date('2026-12-02T12:00:00Z');
  const a=m.onPlatsjakt('radhuset',80,{xp:70,orn:'rare'},when);assert.ok(a.R&&a.R.xp>=70&&a.best);assert.equal(a.left,2);
  const b=m.onPlatsjakt('radhuset',60,{xp:70},when);assert.equal(b.R,null);assert.ok(b.best&&b.already);assert.equal(m.state.platsjakt.best.radhuset,60);
  assert.ok(m.onPlatsjakt('domkyrkan',90,{},when).R);assert.ok(m.onPlatsjakt('ahlens',90,{},when).R);
  const d=m.onPlatsjakt('duvan',90,{},when);assert.equal(d.R,null,'högst tre om dagen');assert.ok(!d.already);assert.equal(d.left,0);
  assert.equal(m.platsjaktWon(when),3);
  assert.ok(m.onPlatsjakt('duvan',95,{},new Date('2026-12-03T12:00:00Z')).R,'nästa dag igen');
  m.notePlatsjakt('sandgrund');m.notePlatsjakt('ahlens');m.notePlatsjakt('sandgrund');assert.deepEqual(m.state.platsjakt.recent,['ahlens','sandgrund']);
  for(const id of ['radhuset','domkyrkan','duvan','biblioteket'])m.notePlatsjakt(id);assert.equal(m.state.platsjakt.recent.length,RECENT_KEEP);
  // äldre sparning (en sträng per dag) blir en lista; okända platser och fel datum försvinner
  assert.deepEqual(sanitizePlatsjakt({best:{radhuset:'55.55',okänd:3},won:{'2026-12-02':'radhuset','2026-12-03':['ahlens','x','ahlens'],fel:'x'},recent:['ahlens','<x>']}),
    {best:{radhuset:55.6},won:{'2026-12-02':['radhuset'],'2026-12-03':['ahlens']},recent:['ahlens']});
});

test("O'Learys-aktiviteterna ger XP, högst åtta gånger om dagen", ()=>{
  const m=new XmasMeta({storage:mem()}),when=new Date('2026-12-02T12:00:00Z');
  let n=0;for(let i=0;i<12;i++){if(m.onActivity({id:'dart',points:100},when))n++;}
  assert.equal(n,XP.activityDay);
  const m2=new XmasMeta({storage:mem()});assert.equal(m2.onActivity({id:'penta',points:430,penta:true},when).xp,43);assert.equal(m2.onActivity({id:'penta',points:500,penta:true},when).xp,XP.pentaMax);
});

test('menyerna har de nya knapparna', ()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const id of ['xmasPlatsjakt','xmasPlatsjaktGo','xmasGuide','xmasGuideGo','xmasOlearys','xmasOlearysGo'])assert.ok(html.includes('id="'+id+'"'),id);
});
