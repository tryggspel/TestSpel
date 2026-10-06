import test from 'node:test';
import assert from 'node:assert/strict';
import {QuizSession,QUIZ,QUESTION_BANK,networkQuestions,liveQuestions,garble,fetchLiveBoard} from '../bus-quiz.mjs';
import {BUS_NETWORK} from '../explore-places.mjs';
import handler,{parseDepartures} from '../api/varmlandstrafik.mjs';

test('frågebanken är hel: tre olika alternativ, rätt svar bland dem',()=>{
  const all=[...QUESTION_BANK,...networkQuestions()];assert.ok(all.length>=35);
  for(const [q,right,wrong] of all){assert.ok(q.length>8,q);assert.equal(wrong.length,2,q);assert.equal(new Set([right,...wrong]).size,3,'tre olika svar: '+q);}
  assert.equal(new Set(all.map(a=>a[0])).size,all.length,'inga dubbletter');
});

test('linjefrågorna stämmer med linjenätet',()=>{
  for(const [q,right] of networkQuestions()){
    let m=q.match(/^Vilken hållplats har linje (\d+)\?/);if(m)assert.equal(BUS_NETWORK.find(s=>s.line===Number(m[1])).name,right);
    m=q.match(/^Vilken linje går till (.+)\?/);if(m)assert.equal(String(BUS_NETWORK.find(s=>s.name===m[1]).line),right);
  }
  assert.ok(networkQuestions().some(([q,a])=>/längst från Torget/.test(q)&&a==='Mariebergsskogen'));
});

test('session: poäng för rätt svar, fartbonus, tidsgräns och slut',()=>{
  const s=new QuizSession({seed:7,count:3});assert.equal(s.questions.length,3);
  const v=s.view();assert.equal(v.options.length,3);assert.equal(v.total,3);
  let r=s.answer(s.current.correct);assert.equal(r.ok,true);assert.equal(r.points,QUIZ.points+QUIZ.fastBonus,'snabbt svar');
  s.tick(QUIZ.fastWithin+1);r=s.answer(s.current.correct);assert.equal(r.points,QUIZ.points,'långsamt svar utan bonus');
  const wrong=(s.current.correct+1)%3;r=s.answer(wrong);assert.equal(r.ok,false);assert.equal(r.points,0);assert.equal(s.state,'done');
  assert.deepEqual(s.summary(),{correct:2,total:3,points:QUIZ.points*2+QUIZ.fastBonus,state:'done'});
  assert.equal(s.answer(0),null,'inget efter slutet');assert.equal(s.view(),null);
  const t=new QuizSession({seed:2,count:2});let timeout=null;for(let i=0;i<80&&!timeout;i++)timeout=t.tick(.1);
  assert.ok(timeout.timeout&&timeout.ok===false);assert.equal(t.index,1,'nästa fråga efter tidsgräns');
});

test('samma frö ger samma frågor, olika frö ger andra',()=>{
  const a=new QuizSession({seed:'x',count:3}).questions.map(q=>q.q),b=new QuizSession({seed:'x',count:3}).questions.map(q=>q.q);
  assert.deepEqual(a,b);assert.notDeepEqual(a,new QuizSession({seed:'y',count:3}).questions.map(q=>q.q));
});

test('kaos-läge: garblad text, alternativ som byter plats, och rätt svar räknas på det man ser',()=>{
  const s=new QuizSession({seed:3,count:1,chaos:true}),real=s.current;
  const v1=s.view();assert.notEqual(v1.q,real.q,'texten är sönderhackad');assert.ok(v1.chaos);
  const orders=new Set();for(let i=0;i<40;i++){s.tick(.1);orders.add(s.order.join(''));}
  assert.ok(orders.size>1,'alternativen blandas om');assert.equal(s.state,'playing');
  const shown=s.order.indexOf(real.correct);const r=s.answer(shown);assert.equal(r.ok,true,'rätt svar på rätt plats trots blandningen');
  assert.equal(garble('Hej',()=>0),'###'.replace(/#/g,'#').slice(0,3));
  assert.equal(garble('a b',()=>.9),'a b','blanksteg och osnuttade tecken bevaras');
});

test('riktiga avgångar blir frågor, annars inga',()=>{
  const board={stop:'Karlstad Resecentrum',departures:[{line:'1',direction:'Skåre',time:'14:32'},{line:'4',direction:'Vallargärdet',time:'14:35'},{line:'12',direction:'Skåre',time:'14:40'}]};
  const qs=liveQuestions(board);assert.equal(qs.length,2);assert.equal(qs[0][1],'1');assert.match(qs[0][0],/Skåre/);assert.equal(qs[1][1],'Vallargärdet');
  assert.equal(new Set([qs[0][1],...qs[0][2]]).size,3);
  assert.deepEqual(liveQuestions(null),[]);assert.deepEqual(liveQuestions({departures:[{line:'1',direction:'A',time:'10:00'}]}),[]);
  const s=new QuizSession({seed:1,count:3,live:board});assert.match(s.questions[0].q,/Skåre/,'live-frågan kommer först');
});

test('fetchLiveBoard sväljer alla fel och rensar svaret',async()=>{
  const ok=async()=>({ok:true,json:async()=>({stop:'Karlstad',departures:[{line:'1',direction:'Skåre',time:'14:32:10'},{line:5,direction:'x',time:'1'},null]})});
  const b=await fetchLiveBoard(ok);assert.equal(b.departures.length,1);assert.equal(b.departures[0].time,'14:32');
  assert.equal(await fetchLiveBoard(async()=>({ok:false})),null);assert.equal(await fetchLiveBoard(async()=>{throw new Error('offline');}),null);
  assert.equal(await fetchLiveBoard(async()=>({ok:true,json:async()=>({departures:[]})})),null);assert.equal(await fetchLiveBoard(undefined),null);
});

test('API-funktionen: kräver nyckel, tolkar ResRobot och svarar bara på GET',()=>{
  const out=parseDepartures({Departure:[{name:'Buss 1',direction:'Skåre (Karlstad kn)',time:'14:32:00',ProductAtStop:{displayNumber:'1'}},{name:'Länstrafik - Buss 12',direction:'Kil',time:'14:40:00'},{name:'x',direction:'',time:'14:41:00'}]});
  assert.deepEqual(out,[{line:'1',direction:'Skåre',time:'14:32'},{line:'12',direction:'Kil',time:'14:40'}]);
  const mk=(method)=>{const r={code:0,headers:{},body:null,status(c){this.code=c;return this;},setHeader(k,v){this.headers[k]=v;return this;},json(b){this.body=b;return this;}};return [{method},r];};
  delete process.env.TRAFIKLAB_KEY;
  return Promise.all([handler(...mk('POST')),handler(...mk('GET'))]).then(()=>{const [q,r]=mk('GET');return handler(q,r).then(()=>{assert.equal(r.code,503);assert.match(r.body.error,/TRAFIKLAB_KEY/);});});
});
