// JulRushens tolv nivåer: tabellen (tempo, mål), stjärnor, upplåsning och serier. Ren logik, ingen webbläsare.
import test from 'node:test';
import assert from 'node:assert/strict';
import {RUSHES,RUSH_COUNT,RUSH_MAX,PRESSURE,pressureK,pressureSlack,clockFor,rushDef,goalText,goalProgress,pointsGoal,packagesGoal,starsFor,starText,nextRush,isUnlocked,totalStars,seriesHearts,SERIES_HEART_BONUS} from '../xmas/xmas-rushes.mjs';
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
  assert.equal(rushDef(1),RUSHES[0]);assert.equal(rushDef('12'),RUSHES[11]);assert.equal(rushDef(0),null);assert.equal(rushDef(RUSH_MAX+1),null);assert.equal(rushDef('x'),null);assert.equal(rushDef(null),null);
  RUSHES.forEach((r,i)=>assert.equal(r.pressure,i+1,'trycket (klockan) följer rushens nummer'));
});

test('övertid: efter Rush 12 fortsätter det med samma tempo, längre mål och allt trängre klocka, upp till Rush 99',()=>{
  assert.equal(RUSH_MAX,99);
  const a=rushDef(13),b=rushDef(14),z=rushDef(RUSH_MAX);
  assert.ok(a&&b&&z);assert.equal(rushDef(13),a,'samma post varje gång');
  assert.ok(Object.isFrozen(a)&&Object.isFrozen(a.goal));assert.equal(a.n,13);assert.equal(a.overtime,true);assert.equal(RUSHES.some(r=>r.overtime),false);
  assert.equal(a.name,'ÖVERTID 1');assert.equal(b.name,'ÖVERTID 2');assert.equal(a.tempo,12,'tempot går inte högre än 12');assert.equal(a.speed,RUSHES[11].speed);assert.equal(a.mult,RUSHES[11].mult);
  assert.equal(a.goal.kind,'packages');assert.equal(b.goal.kind,'points','varannan sort fortsätter');
  assert.ok(a.goal.target>packagesGoal(12)&&a.goal.target>RUSHES[10].goal.target,'målet fortsätter att växa: '+a.goal.target);
  assert.ok(rushDef(15).goal.target>a.goal.target&&rushDef(16).goal.target>b.goal.target);
  assert.ok(packagesGoal(RUSH_MAX)<=120,'paketmålet har ett tak');
  assert.equal(a.pressure,13);assert.equal(z.pressure,99);assert.ok(a.blurb.length>10);
});

test('klockan: trängre för varje rush, aldrig under golvet, och första paketet får extra tid',()=>{
  for(let p=2;p<=RUSH_MAX;p++){assert.ok(pressureK(p)<pressureK(p-1)+1e-12,'k sjunker: '+p);assert.ok(pressureSlack(p)<pressureSlack(p-1)+1e-12,'marginalen sjunker: '+p);}
  assert.ok(pressureK(1)>2.5&&pressureK(1)<3.2,'Rush 1 ger mer än dubbla minsta tiden: '+pressureK(1));
  assert.ok(pressureK(12)>PRESSURE.kInf&&pressureK(12)<1.2,'Rush 12 ger bara en dryg tiondel extra: '+pressureK(12));
  assert.ok(pressureK(RUSH_MAX)>=PRESSURE.kInf&&pressureSlack(RUSH_MAX)>=PRESSURE.slackInf,'golvet');
  assert.equal(pressureK(0),pressureK(1),'orimligt tryck räknas som Rush 1');assert.equal(pressureK(NaN),pressureK(1));
  // tiden = minsta möjliga tid (sträckan efter fångstfältet i full fart med turbo) × k + marginal
  const d=20,reach=4,lvl=6,top=7.2*tempoSpeed(lvl)*PRESSURE.turbo,need=(d-reach)/top;
  const sec=clockFor(d,{level:lvl,pressure:6,reach});assert.ok(Math.abs(sec-Math.max(PRESSURE.min,need*pressureK(6)+pressureSlack(6)))<1e-9,'formeln');
  assert.ok(Math.abs(clockFor(d,{level:lvl,pressure:6,reach,first:true})-sec-PRESSURE.grace)<1e-9,'första paketet: extra tid');
  assert.ok(clockFor(40,{level:6,pressure:6,reach})>clockFor(20,{level:6,pressure:6,reach}),'längre sträcka ger mer tid');
  assert.equal(clockFor(0,{level:12,pressure:99,reach:6}),PRESSURE.min,'aldrig kortare än golvet');assert.equal(clockFor(NaN,{}),Math.max(PRESSURE.min,pressureSlack(1)));
  // en typisk sträcka (avstånd från att målet väljs): generös i Rush 1, knappt i Rush 12, och trängre i övertid
  const typical=lv=>clockFor(16.4+(Math.min(12,lv)-1)*1.6,{level:Math.min(12,lv),pressure:lv,reach:3.8+(Math.min(12,lv)-1)*.25}); // avståndet när målet väljs, mätt i spelet: 16 m i Rush 1 och 34 m i Rush 12
  assert.ok(typical(1)>3,'Rush 1: '+typical(1).toFixed(2));assert.ok(typical(12)<2,'Rush 12: '+typical(12).toFixed(2));assert.ok(typical(20)<typical(12),'övertid är trängre än Rush 12');
  for(let n=2;n<=30;n++)assert.ok(typical(n)<=typical(n-1)+1e-9,'klockan växer aldrig med rushen: '+n);
});

test('målen: varannan rush paket, varannan poäng, och båda stiger',()=>{
  const pk=RUSHES.filter(r=>r.n%2),pt=RUSHES.filter(r=>!(r.n%2));
  assert.ok(pk.every(r=>r.goal.kind==='packages')&&pt.every(r=>r.goal.kind==='points'));
  for(let i=1;i<pk.length;i++)assert.ok(pk[i].goal.target>pk[i-1].goal.target,'paketmålen stiger');
  for(let i=1;i<pt.length;i++)assert.ok(pt[i].goal.target>pt[i-1].goal.target,'poängmålen stiger');
  assert.ok(pk[0].goal.target>=20&&pk.at(-1).goal.target<=60,'25–50 paket: en rush tar en halv till en och en halv minut');
  assert.ok(pt.every(r=>r.goal.target%50===0),'jämna femtiotal');assert.equal(pointsGoal(2),RUSHES[1].goal.target);assert.equal(packagesGoal(1),RUSHES[0].goal.target);
  // Poängmålet motsvarar ungefär lika många paket som en paketrush (fyra färre): ett paket ger i snitt ungefär 68 gånger tempots poängfaktor i spelet (kedja, flytbonus, gåvor).
  for(const r of pt){const per=Math.round(68*tempoPoints(r.n)),need=r.goal.target/per;assert.ok(Math.abs(need-(packagesGoal(r.n)-4))<=.6,'rush '+r.n+': '+need.toFixed(1)+' paket mot '+(packagesGoal(r.n)-4));}
  assert.ok(pt[0].goal.target>=500&&pt[0].goal.target<=3000&&pt.at(-1).goal.target<=16000,'poängmålen ligger i rimliga storlekar: '+pt.map(r=>r.goal.target).join(', '));
  assert.equal(goalText(RUSHES[0]),'HÄMTA '+RUSHES[0].goal.target+' PAKET');assert.equal(goalText(RUSHES[1]),'NÅ '+RUSHES[1].goal.target.toLocaleString('sv-SE')+' POÄNG');assert.equal(goalText(null),'');
});

test('målets framsteg: paket räknas för sig, poäng för sig, och det går aldrig över 100 %',()=>{
  const a=RUSHES[0],g=goalProgress(a,{picked:5,score:99999});assert.equal(g.kind,'packages');assert.equal(g.value,5);assert.equal(g.target,a.goal.target);assert.equal(g.done,false);assert.equal(g.text,'5/'+a.goal.target+' PAKET');assert.ok(Math.abs(g.ratio-5/a.goal.target)<1e-9);
  assert.equal(goalProgress(a,{picked:a.goal.target,score:0}).done,true);assert.equal(goalProgress(a,{picked:99}).ratio,1);assert.equal(goalProgress(a,{picked:99}).text,a.goal.target+'/'+a.goal.target+' PAKET');
  const b=RUSHES[1],h=goalProgress(b,{picked:99,score:100});assert.equal(h.kind,'points');assert.equal(h.value,100);assert.equal(h.done,false);assert.equal(h.text,'100/'+b.goal.target.toLocaleString('sv-SE')+' P');
  assert.equal(goalProgress(b,{score:b.goal.target}).done,true);assert.equal(goalProgress(b,{}).value,0);assert.equal(goalProgress(null,{}),null);
});

test('stjärnor = hjärtan kvar (1–3), upplåsning i ordning och serier som tar med hjärtan',()=>{
  assert.deepEqual([3,2,1,0,-1,NaN,9].map(starsFor),[3,2,1,1,1,1,3],'alltid minst en stjärna för en klarad rush, aldrig fler än tre');
  assert.equal(starText(0),'☆☆☆');assert.equal(starText(2),'★★☆');assert.equal(starText(3),'★★★');assert.equal(starText(9),'★★★');
  assert.equal(nextRush({cleared:0}),1);assert.equal(nextRush({cleared:5}),6);assert.equal(nextRush({cleared:12}),13,'efter Rush 12 fortsätter det med övertid');assert.equal(nextRush({cleared:RUSH_MAX}),RUSH_MAX,'taket');assert.equal(nextRush(null),1);assert.equal(nextRush({cleared:'x'}),1);
  const p={cleared:3};assert.deepEqual([0,1,3,4,5,13,1.5,'2'].map(n=>isUnlocked(p,n)),[false,true,true,true,false,false,false,false]);
  assert.equal(isUnlocked({cleared:12},12),true);assert.equal(isUnlocked({cleared:12},13),true);assert.equal(isUnlocked({cleared:12},14),false);assert.equal(isUnlocked({cleared:20},21),true);assert.equal(isUnlocked({cleared:20},RUSH_MAX+1),false);
  assert.equal(totalStars({stars:{1:3,2:2,3:1}}),6);assert.equal(totalStars(null),0);assert.equal(totalStars({stars:{1:3,12:3,13:3,40:3}}),6,'stjärnor räknas bara för de tolv namngivna rusherna');
  // hjärtan i en serie: ett hjärta fylls på bara om man klarade rushen utan att tappa något (högst tre), annars tar man med sig det man hade kvar (minst ett)
  assert.equal(SERIES_HEART_BONUS,1);
  assert.deepEqual([[3,3],[2,3],[1,3],[0,3],[2,2],[1,1],[1,2],[3,1]].map(([left,start])=>seriesHearts(left,start)),[3,2,1,1,3,2,1,3],'(kvar, början) → hjärtan in i nästa');
  assert.equal(seriesHearts(2),2,'utan startvärde räknas tre');assert.equal(seriesHearts(NaN,NaN),1);
});
