// Julklappsjakten: vägledningen (xmas-guide.mjs): pilens riktning och hint, kantmarkörer, julbandets förankring, vägen runt hinder med grundspelets
// stigsökning, målvalet (XmasHunt.guideTarget) och uppdragsraden.
import test from 'node:test';
import assert from 'node:assert/strict';
import {GUIDE,hintFor,edgeLevels,ribbonSegments,XmasGuide,missionView} from '../xmas/xmas-guide.mjs';
import {XmasHunt} from '../xmas/xmas-hunt.mjs';
import {INTRO} from '../xmas/xmas-layout.mjs';
import {CityNavigation} from '../city-missions.mjs';

const north={x:0,z:-1};   // kameran tittar mot −z; positiv vinkel = vänster (som kompassen)
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const open={clear:()=>true};
const T=(x,z,over={})=>({id:'t'+x+':'+z,x,z,kind:'regular',label:'NÄSTA PAKET',radius:1.6,...over});

test('hint och kanter: rakt fram, höger, vänster och vänd dig om (samma gränser som grundspelets pil)',()=>{
  assert.equal(hintFor(0),'GÅ RAKT FRAM');assert.equal(hintFor(GUIDE.ahead),'GÅ RAKT FRAM');
  assert.equal(hintFor(-60),'SVÄNG HÖGER');assert.equal(hintFor(60),'SVÄNG VÄNSTER');
  assert.equal(hintFor(GUIDE.behind),'VÄND DIG OM');assert.equal(hintFor(-175),'VÄND DIG OM');
  const ahead=edgeLevels(5);assert.deepEqual([ahead.l,ahead.r,ahead.behind],[0,0,false],'ingen kant lyser när målet är mitt i bilden');
  const left=edgeLevels(50),right=edgeLevels(-50);
  assert.ok(left.l>.35&&left.r===0&&right.r>.35&&right.l===0,'den sida man ska vända sig åt lyser');
  assert.equal(edgeLevels(80).l,1,'lyser fullt från 72°');
  const back=edgeLevels(150);assert.ok(back.l>0&&back.r>0&&back.behind,'båda kanterna när målet ligger bakom');
  assert.ok(edgeLevels(30).l<edgeLevels(60).l,'kanten växer med vinkeln');
});

const R=GUIDE.ribbon;
test('julbandet: förankrat vid målet, sammanhängande bitar, aldrig för nära spelaren eller målet',()=>{
  const path=[{x:0,z:0},{x:0,z:-60}],out=[];
  const n=ribbonSegments(path,out);
  assert.ok(n>=12&&n<=R.max,'antal bitar: '+n);
  for(let i=0;i<n;i++){
    const m=out[i];assert.ok(Math.abs(m.x)<1e-9,'ligger på vägen');assert.ok(Math.abs(m.len-R.seg)<1e-6,'varje bit är '+R.seg+' m');
    assert.ok(Math.abs(m.yaw)<1e-6||Math.abs(Math.abs(m.yaw)-360)<1e-6,'pekar framåt mot målet (−z): '+m.yaw);
    assert.ok(-m.z-R.seg/2>=R.lead-1e-9,'börjar inte närmare spelaren än '+R.lead+' m: '+m.z);
    assert.ok(-m.z+R.seg/2<=60-R.stopShort+1e-9,'slutar inte närmare målet än '+R.stopShort+' m');
    if(i)assert.ok(Math.abs(out[i-1].z-m.z-(-R.seg))<1e-6||Math.abs(Math.abs(out[i-1].z-m.z)-R.seg)<1e-6,'grannbitarna möts (inget glapp)');
  }
  // Stilla i världen: flyttar sig spelaren 1,3 m längs vägen ligger de gemensamma bitarna exakt där de låg (förankrade vid målet, inte vid spelaren).
  const out2=[],n2=ribbonSegments([{x:0,z:-1.3},{x:0,z:-60}],out2);
  const zs=new Set(out.slice(0,n).map(m=>m.z.toFixed(4)));let shared=0;for(let i=0;i<n2;i++)if(zs.has(out2[i].z.toFixed(4)))shared++;
  assert.ok(shared>=Math.min(n,n2)-2,'bitarna ligger kvar i världen när man går ('+shared+' av '+n+')');
});

test('julbandet följer vägen runt ett hörn, saknas när målet är nära och är begränsat på långa vägar',()=>{
  const bend=[{x:0,z:0},{x:0,z:-26},{x:30,z:-26}],out=[];
  const n=ribbonSegments(bend,out);assert.ok(n>=8);
  assert.ok(out.slice(0,n).some(m=>Math.abs(m.x)<1e-6&&m.z<-4)&&out.slice(0,n).some(m=>m.x>1&&Math.abs(m.z+26)<2),'några före och några efter hörnet');
  const yaws=out.slice(0,n).map(m=>m.yaw);
  assert.ok(yaws.some(y=>Math.abs(y)<1e-6),'bitarna före hörnet pekar rakt fram (mot −z)');
  assert.ok(yaws.some(y=>Math.abs(y+90)<1e-6),'bitarna efter hörnet pekar mot öster (−90°)');
  assert.ok(yaws.some(y=>y<-1&&y>-89),'en bit som tar hörnet vinklas mellan de två lederna, så att grannbitarna möts');
  const far=[{x:0,z:0},{x:0,z:-900}],o2=[];const n2=ribbonSegments(far,o2);
  assert.ok(n2<=R.max&&n2>=12,'långa vägar ger högst '+R.max+' bitar: '+n2);
  for(let i=0;i<n2;i++)assert.ok(-o2[i].z+R.seg/2<=R.lead+R.maxLen+1e-6,'bara det som ligger inom synhåll längs vägen');
  assert.equal(ribbonSegments([{x:0,z:0}],[]),0);
  assert.equal(ribbonSegments([{x:0,z:0},{x:0,z:-2}],[]),0,'inget band när målet är nära');
  assert.equal(ribbonSegments([{x:0,z:0},{x:0,z:-(R.lead+R.stopShort+R.seg-.5)}],[]),0,'inte heller strax under en bits längd');
  assert.equal(ribbonSegments([{x:0,z:0},{x:0,z:-(R.lead+R.stopShort+R.seg+.5)}],[]),1,'en bit så fort det får plats');
  const lite=ribbonSegments(far,[],GUIDE.ribbonLite);assert.ok(lite<n2&&lite>=7,'lätt läge: kortare band ('+lite+' bitar)');
});

test('pilen: pekar rakt på målet vid fri sikt, jämnas ut och tar kortaste vägen runt (±180°)',()=>{
  const g=new XmasGuide({nav:open}),p={x:0,z:0};
  let s=g.update(p,north,T(0,-30),1/60,0);
  assert.ok(s.on&&s.straight&&s.distance===30);assert.ok(Math.abs(s.angle)<1e-6&&s.ahead&&s.hint==='GÅ RAKT FRAM','rakt fram från start');
  assert.equal(s.label,'NÄSTA PAKET');assert.ok(s.segCount>=8,'bandet rullas ut mot paketet 30 m bort: '+s.segCount);
  // målet åt höger (+x): negativ vinkel, pilen vrids mjukt (inte i ett hugg) mot −90°
  s=g.update(p,north,T(30,0),1/60,100);
  assert.ok(s.angle<0&&s.angle>-30,'första bildrutan: bara en liten bit på vägen ('+s.angle.toFixed(1)+')');
  for(let i=0;i<120;i++)s=g.update(p,north,T(30,0),1/60,200+i*16);
  assert.ok(Math.abs(s.angle+90)<1.5,'efter två sekunder pekar den åt höger ('+s.angle.toFixed(1)+')');
  assert.equal(s.hint,'SVÄNG HÖGER');assert.ok(s.edgeR>.35&&s.edgeL===0,'högra kanten lyser');
  // bakom (+z): den roterar det korta hållet, inte genom 0°
  const back=new XmasGuide({nav:open});back.update(p,north,T(0,-30),1/60,0);
  let min=0,max=0,t=0;for(let i=0;i<90;i++){const q=back.update(p,north,T(1,30),1/60,t+=16);min=Math.min(min,q.angle);max=Math.max(max,q.angle);}
  assert.ok(Math.abs(Math.abs(back.state.angle)-180)<8,'pekar bakåt: '+back.state.angle.toFixed(1));
  assert.ok(back.state.behind&&back.state.hint==='VÄND DIG OM'&&back.state.edgeL>0&&back.state.edgeR>0);
  assert.ok(Math.min(Math.abs(min),Math.abs(max))<1e-6||Math.max(Math.abs(min),Math.abs(max))<=180,'vinkeln stannar i −180…180');
  // kameran vänder sig: blickar man åt målet är pilen rak
  const turned=new XmasGuide({nav:open}),east={x:1,z:0};
  for(let i=0;i<30;i++)turned.update(p,east,T(30,0),1/60,i*16);
  assert.ok(Math.abs(turned.state.angle)<1&&turned.state.ahead);
});

test('pilen är av utan mål och startar om rent när ett mål dyker upp igen',()=>{
  const g=new XmasGuide({nav:open}),p={x:0,z:0};
  assert.equal(g.update(p,north,null,.016,0).on,false);
  g.update(p,north,T(30,0),.016,0);assert.equal(g.state.on,true);
  g.update(p,north,null,.016,16);assert.equal(g.state.on,false);assert.equal(g.state.segCount,0);
  const s=g.update(p,north,T(-30,0),.016,32);assert.ok(Math.abs(s.angle-90)<1e-6,'första rutan efter paus hoppar direkt rätt, ingen sväng från gammalt värde');
});

test('vägen räknas om högst ungefär var 90:e ms och när målet byts, inte varje bildruta',()=>{
  let calls=0;const nav={clear:()=>{calls++;return true;}},g=new XmasGuide({nav}),p={x:0,z:0};
  for(let i=0;i<60;i++){p.z-=.06;g.update(p,north,T(0,-80),1/60,i*16.7);}
  assert.ok(calls<=14,'60 bildrutor (1 s) ger '+calls+' vägkontroller');
  const before=calls;g.update(p,north,T(40,-40),1/60,1000);assert.equal(calls,before+1,'nytt mål räknas om direkt');
});

// ── Stigsökning runt hinder med grundspelets kartmodell ───────────────────────────────────────────────────────────────
const wallNav=()=>new CityNavigation((x,z)=>x>-2&&x<2&&z>-24&&z<24,{minX:-60,maxX:60,minZ:-60,maxZ:60},3);

test('bakom en vägg pekar pilen mot hörnet på gångvägen, och spåret går runt väggen',()=>{
  const nav=wallNav(),g=new XmasGuide({nav}),p={x:-12,z:0},target=T(12,0),east={x:1,z:0}; // man står framför väggen och tittar mot den (och målet bakom)
  let s;for(let i=0;i<30;i++)s=g.update(p,east,target,1/60,i*100);
  assert.equal(s.straight,false,'väggen står i vägen');
  assert.ok(s.distance>=55,'vägen runt är längre än luftlinjen (24 m): '+s.distance);
  assert.ok(Math.abs(s.steerX-target.x)>1||Math.abs(s.steerZ-target.z)>1,'pilen siktar inte rakt genom väggen');
  assert.ok(Math.abs(s.steerZ)>=20,'utan väggens ände i sikte: '+s.steerX+','+s.steerZ);
  assert.ok(Math.abs(s.angle)>25&&Math.abs(s.angle)<100,'pilen pekar snett fram mot hörnet, inte rakt fram genom väggen: '+s.angle.toFixed(1));
  const zs=[];for(let i=0;i<s.segCount;i++)zs.push(s.segs[i].z);
  assert.ok(zs.some(z=>Math.abs(z)>20),'bandet går på vägen runt väggen');
  for(let i=0;i<s.segCount;i++)assert.ok(!(s.segs[i].x>-2&&s.segs[i].x<2&&s.segs[i].z>-24&&s.segs[i].z<24),'ingen bit inne i väggen');
  // väl förbi väggens hörn är sikten fri igen: rakt på målet
  const p2={x:-8,z:58};let s2;const g2=new XmasGuide({nav});for(let i=0;i<10;i++)s2=g2.update(p2,east,target,1/60,i*100);
  assert.equal(s2.straight,true);assert.equal(s2.steerX,target.x);
});

test('ett fel i stigsökningen ger en rak pil, aldrig ett avstängt jultillägg',()=>{
  const g=new XmasGuide({nav:{clear:()=>false},cityGuidance:{update:()=>{throw new Error('kaos');}}}),s=g.update({x:0,z:0},north,T(0,-30),1/60,0);
  assert.equal(s.on,true);assert.equal(s.straight,true);assert.equal(s.steerZ,-30);assert.ok(s.segCount>=3);
});

test('utan fri sikt men utan karta: ändå en rak pil (inget kraschar)',()=>{
  const g=new XmasGuide({nav:{clear:()=>false}}),s=g.update({x:0,z:0},north,T(0,-20),1/60,0);
  assert.equal(s.on,true);assert.equal(s.straight,true);assert.equal(s.steerZ,-20);assert.ok(s.segCount>=1);
});

// ── Målvalet ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function hunt(){const h=new XmasHunt({});h.startIntro();return h;}
test('målvalet i introduktionen: det närmaste av de fyra närmaste paketen i ordning, inte nästa varv av spiralen',()=>{
  const h=hunt(),reg=INTRO.packages.filter(p=>p.kind==='regular');
  const t0=h.guideTarget(INTRO.spawn);assert.equal(t0.id,reg[0].id,'första paketet först');assert.equal(t0.label,'NÄSTA PAKET');assert.equal(t0.kind,'regular');
  // står man vid sjätte paketet pekar pilen på sjunde, aldrig på ett paket 5–8 m bort på spiralens inre varv som ligger närmare
  for(let i=0;i<5;i++)h.run.byId.get(reg[i].id).collected=true;
  const mid=reg[5],t=h.guideTarget({x:mid.x,z:mid.z});
  const window=reg.slice(5,9).map(p=>p.id);assert.ok(window.includes(t.id),'pilen väljer bland de fyra närmaste i ordning: '+t.id);
  // ett paket som ligger närmare men utanför de fyra första ska inte väljas
  const farOne=reg.slice(9).sort((a,b)=>dist(a,mid)-dist(b,mid))[0];
  if(dist(farOne,mid)<dist(h.run.byId.get(t.id),mid))assert.ok(window.includes(t.id),'inte '+farOne.id);
});
test('målvalet byter inte fram och tillbaka mellan två lika nära paket (hysteres)',()=>{
  const h=new XmasHunt({});h.startRun({kind:'round',id:'r',goal:2,packages:[{id:'a',x:-6,z:-10,kind:'regular'},{id:'b',x:6,z:-10,kind:'regular'},{id:'c',x:0,z:-60,kind:'regular'}],tomte:{x:0,z:-80,radius:3},windowSec:3});
  let p={x:0,z:0},first=h.guideTarget(p).id,flips=0,last=first;
  for(let i=0;i<40;i++){p={x:Math.sin(i)*2,z:-i*.05};const id=h.guideTarget(p).id;if(id!==last){flips++;last=id;}}
  assert.ok(flips<=1,'byten: '+flips);
  // men är det andra paketet klart närmare byter pilen
  h.run.byId.get(first)&&null;
  const other=first==='a'?'b':'a',o=h.run.byId.get(other);
  assert.equal(h.guideTarget({x:o.x+.5,z:o.z+.5}).id,other);
});
test('målvalet: oordnade körningar tar det närmaste, plockade paket hoppas över, tomten efter målet, bonus bara när inget annat finns',()=>{
  const h=new XmasHunt({});
  h.startRun({kind:'round',id:'s',goal:2,ordered:false,packages:[{id:'far',x:0,z:-50,kind:'regular'},{id:'near',x:0,z:-9,kind:'regular'},{id:'bon',x:3,z:-2,kind:'bonus'}],tomte:{x:20,z:0,radius:3},windowSec:3});
  assert.equal(h.guideTarget({x:0,z:0}).id,'near','närmaste vanliga, inte bonuspaketet som ligger närmare');
  h.run.byId.get('near').collected=true;assert.equal(h.guideTarget({x:0,z:0}).id,'far');
  h.run.byId.get('far').collected=true;const b=h.guideTarget({x:0,z:0});assert.equal(b.id,'bon');assert.equal(b.label,'BONUSPAKET');
  h.run.byId.get('bon').collected=true;assert.equal(h.guideTarget({x:0,z:0}),null,'inget kvar');
  const d=new XmasHunt({});d.startIntro();d.run.phase='deliver';
  const t=d.guideTarget({x:5,z:5});assert.equal(t.kind,'tomte');assert.equal(t.label,'TOMTEN');assert.equal(t.x,INTRO.tomte.x);assert.equal(t.radius,INTRO.tomte.radius);
  d.run.phase='done';assert.equal(d.guideTarget({x:0,z:0}),null,'ingen pil när körningen är slut');
  assert.equal(new XmasHunt({}).guideTarget({x:0,z:0}),null,'ingen körning, ingen pil');
});
test('målvalet i fri vandring: närmaste paketet i regnet, ingen pil medan man väntar',()=>{
  const h=new XmasHunt({nav:{snap:p=>p,blocked:()=>false}});h.startFree();
  assert.equal(h.guideTarget({x:0,z:0}),null);
  h.run.t=1e3;h.stepRain({x:0,z:0});assert.ok(h.run.packages.length>=4);
  const t=h.guideTarget({x:0,z:0});assert.ok(t&&t.kind==='regular');
});

// ── Uppdragsraden ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('uppdragsraden säger vad man ska göra nu och sedan i varje läge',()=>{
  const h=hunt(),txt=v=>v.rows.map(r=>r.state+':'+r.text);
  assert.deepEqual(txt(missionView(h.run)),['now:SAMLA PAKET 0/20','next:LÄMNA HOS TOMTEN']);
  h.run.collected=7;const a=missionView(h.run);assert.deepEqual(txt(a),['now:SAMLA PAKET 7/20','next:LÄMNA HOS TOMTEN']);
  h.run.collected=20;h.run.phase='deliver';assert.deepEqual(txt(missionView(h.run)),['done:SAMLA PAKET 20/20','now:LÄMNA HOS TOMTEN']);
  h.run.phase='done';assert.deepEqual(txt(missionView(h.run)),['done:SAMLA PAKET 20/20','done:LÄMNA HOS TOMTEN']);
  assert.notEqual(a.key,missionView(h.run).key,'nyckeln ändras när något ska ritas om');
  assert.equal(missionView(null),null);
  const d=new XmasHunt({});d.startRun({kind:'delivery',id:'d',title:'Fika',goal:0,packages:[],tomte:{x:5,z:5,radius:3},phase:'deliver',windowSec:3});
  assert.deepEqual(txt(missionView(d.run)),['now:BÄR FIKAT TILL TOMTEN']);
  const f=new XmasHunt({nav:{snap:p=>p,blocked:()=>false}});f.startFree();
  const w=missionView(f.run);assert.equal(w.rows.length,1);assert.equal(w.rows[0].state,'wait');assert.match(w.rows[0].text,/^NÄSTA PAKETREGN OM \d+ S$/);
  f.run.t=1e3;f.stepRain({x:0,z:0});const r=missionView(f.run);assert.equal(r.rows[0].state,'now');assert.match(r.rows[0].text,/^PLOCKA PAKETEN · \d+ KVAR$/);
});
