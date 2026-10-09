// JulRushens tolv nivåer: tabellen (tempo, mål), stjärnor, upplåsning och serier. Ren logik, ingen webbläsare.
import test from 'node:test';
import assert from 'node:assert/strict';
import {RUSHES,RUSH_COUNT,rushDef,goalText,goalProgress,pointsGoal,packagesGoal,starsFor,starText,nextRush,isUnlocked,totalStars,seriesHearts,SERIES_HEART_BONUS} from '../xmas/xmas-rushes.mjs';
import {TEMPO,tempoSpeed,tempoPoints} from '../tempo-run.mjs';

test('tolv rusher med eget namn, stigande tempo och ett mål var',()=>{
  assert.equal(RUSH_COUNT,12);assert.equal(RUSHES.length,12);assert.equal(TEMPO.levels,12,'en rush per tempo i TempoRun');
  assert.equal(new Set(RUSHES.map(r=>r.name)).size,12,'unika namn');
  RUSHES.forEach((r,i)=>{
    assert.equal(r.n,i+1);assert.equal(r.tempo,i+1,'tempot är rushens nummer');assert.ok(r.name.length>=5&&r.blurb.length>10);
    assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.goal));assert.equal(r.speed,+tempoSpeed(r.n).toFixed(2));assert.equal(r.mult,+tempoPoints(r.n).toFixed(1));
    if(i)assert.ok(r.speed>=RUSHES[i-1].speed&&r.tempo>RUSHES[i-1].tempo,'tempot stiger från rush till rush');
  });
  assert.equal(RUSHES[0].name,'JULMYS');assert.equal(RUSHES[11].name,'TOMTEGALET');assert.ok(RUSHES[11].speed>RUSHES[0].speed*1.7,'sista rushen går nästan dubbelt så fort');
  assert.equal(rushDef(1),RUSHES[0]);assert.equal(rushDef('12'),RUSHES[11]);assert.equal(rushDef(0),null);assert.equal(rushDef(13),null);assert.equal(rushDef('x'),null);assert.equal(rushDef(null),null);
});

test('målen: varannan rush paket, varannan poäng, och båda stiger',()=>{
  const pk=RUSHES.filter(r=>r.n%2),pt=RUSHES.filter(r=>!(r.n%2));
  assert.ok(pk.every(r=>r.goal.kind==='packages')&&pt.every(r=>r.goal.kind==='points'));
  for(let i=1;i<pk.length;i++)assert.ok(pk[i].goal.target>pk[i-1].goal.target,'paketmålen stiger');
  for(let i=1;i<pt.length;i++)assert.ok(pt[i].goal.target>pt[i-1].goal.target,'poängmålen stiger');
  assert.ok(pk[0].goal.target>=12&&pk.at(-1).goal.target<=20,'13–18 paket: en rush tar ungefär en minut');
  assert.ok(pt.every(r=>r.goal.target%50===0),'jämna femtiotal');assert.equal(pointsGoal(2),RUSHES[1].goal.target);assert.equal(packagesGoal(1),RUSHES[0].goal.target);
  // Poängmålet motsvarar ungefär lika många paket som en paketrush, räknat med kedja ×2 och flytbonus på rushens tempo (ett paket mindre).
  for(const r of pt){const per=Math.round(20*tempoPoints(r.n))+TEMPO.flowBonus*r.n,need=r.goal.target/per;assert.ok(Math.abs(need-(packagesGoal(r.n)-1))<=.6,'rush '+r.n+': '+need.toFixed(1)+' paket med kedja ×2 mot '+(packagesGoal(r.n)-1));}
  assert.deepEqual(pt.map(r=>r.goal.target),[600,1100,1700,2350,3100,3900],'poängmålen (jämna femtiotal)');
  assert.equal(goalText(RUSHES[0]),'HÄMTA 13 PAKET');assert.equal(goalText(RUSHES[1]),'NÅ '+RUSHES[1].goal.target.toLocaleString('sv-SE')+' POÄNG');assert.equal(goalText(null),'');
});

test('målets framsteg: paket räknas för sig, poäng för sig, och det går aldrig över 100 %',()=>{
  const a=RUSHES[0],g=goalProgress(a,{picked:5,score:99999});assert.equal(g.kind,'packages');assert.equal(g.value,5);assert.equal(g.target,13);assert.equal(g.done,false);assert.equal(g.text,'5/13 PAKET');assert.ok(Math.abs(g.ratio-5/13)<1e-9);
  assert.equal(goalProgress(a,{picked:13,score:0}).done,true);assert.equal(goalProgress(a,{picked:40}).ratio,1);assert.equal(goalProgress(a,{picked:40}).text,'13/13 PAKET');
  const b=RUSHES[1],h=goalProgress(b,{picked:99,score:100});assert.equal(h.kind,'points');assert.equal(h.value,100);assert.equal(h.done,false);assert.equal(h.text,'100/'+b.goal.target.toLocaleString('sv-SE')+' P');
  assert.equal(goalProgress(b,{score:b.goal.target}).done,true);assert.equal(goalProgress(b,{}).value,0);assert.equal(goalProgress(null,{}),null);
});

test('stjärnor = hjärtan kvar (1–3), upplåsning i ordning och serier som tar med hjärtan',()=>{
  assert.deepEqual([3,2,1,0,-1,NaN,9].map(starsFor),[3,2,1,1,1,1,3],'alltid minst en stjärna för en klarad rush, aldrig fler än tre');
  assert.equal(starText(0),'☆☆☆');assert.equal(starText(2),'★★☆');assert.equal(starText(3),'★★★');assert.equal(starText(9),'★★★');
  assert.equal(nextRush({cleared:0}),1);assert.equal(nextRush({cleared:5}),6);assert.equal(nextRush({cleared:12}),12,'efter sista ligger man kvar på tolv');assert.equal(nextRush(null),1);assert.equal(nextRush({cleared:'x'}),1);
  const p={cleared:3};assert.deepEqual([0,1,3,4,5,13,1.5,'2'].map(n=>isUnlocked(p,n)),[false,true,true,true,false,false,false,false]);
  assert.equal(isUnlocked({cleared:12},12),true);assert.equal(isUnlocked({cleared:12},13),false);
  assert.equal(totalStars({stars:{1:3,2:2,3:1}}),6);assert.equal(totalStars(null),0);
  assert.equal(SERIES_HEART_BONUS,1);assert.deepEqual([3,2,1,0].map(seriesHearts),[3,3,2,1],'ett hjärta tillbaka, högst tre, minst ett');
});
