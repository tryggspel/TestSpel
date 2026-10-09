// JulRushens topplista och utmaningar: smeknamn, länkens format och skydd mot trasiga eller manipulerade länkar, vänlistan och rangordningen.
import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanName,nameId,cleanProfile,cleanFriends,mergeFriend,encodeChallenge,decodeChallenge,challengeUrl,tokenFromSearch,shareText,leaderboard,versus,NAME_MAX,FRIENDS_MAX,MAX_POINTS} from '../xmas/xmas-board.mjs';
import {XmasSave,sanitizeSave} from '../xmas/xmas-save.mjs';
import {RUSHES} from '../xmas/xmas-rushes.mjs';

const prof=(name,bests,over={})=>({name,cleared:Math.max(0,...Object.keys(bests).map(Number)),stars:7,bests,at:1700000000000,...over});

test('smeknamn: bokstäver, siffror och några tecken, högst tolv, inget som kan bli HTML eller styrtecken',()=>{
  assert.equal(cleanName('  Åsa   Lisa '),'Åsa Lisa');assert.equal(cleanName('Kalle_A-2.0'),'Kalle_A-2.0');assert.equal(cleanName('Kalle_Anka-2.0'),'Kalle_Anka-2','tolv tecken');assert.equal(cleanName('ÖSTERLÅNGTNAMNSOMÄRFÖRLÅNGT'),'ÖSTERLÅNGTNA');
  assert.equal(Array.from(cleanName('x'.repeat(40))).length,NAME_MAX);
  assert.equal(cleanName('<img src=x onerror=alert(1)>'),'img srcx one','<, >, = och parenteser försvinner');
  for(const bad of ['<script>','"\'`&','\u0000\u0007‮','🎅🎄','   ',null,undefined,{},[]])assert.ok(!/[<>"'`&=\u0000-\u001f‮]/.test(cleanName(bad)),String(bad));
  assert.equal(cleanName('🎅Tomte🎄'),'Tomte');assert.equal(cleanName(''),'');assert.equal(cleanName(12345),'12345');
  assert.equal(nameId('Åsa Lisa'),'åsalisa');assert.equal(nameId('ÅSA-lisa'),'åsalisa','samma namn oavsett skiftläge och tecken');assert.equal(nameId('🎅'),'');
});

test('profil: bästa poäng per rush begränsas, summan och högsta klarade räknas ut och tomma namn avvisas',()=>{
  const p=cleanProfile({name:'Anna',bests:{1:500,3:1e12,4:-5,5:'x',7:700.9},stars:99,cleared:3,at:'x'});
  assert.deepEqual(p.bests,{1:500,3:MAX_POINTS,7:700});assert.equal(p.total,500+MAX_POINTS+700);assert.equal(p.cleared,7,'högsta rush med poäng');assert.equal(p.stars,36);assert.equal(p.at,0);assert.equal(p.id,'anna');
  assert.equal(cleanProfile({name:'',bests:{1:5}}),null);assert.equal(cleanProfile(null),null);assert.equal(cleanProfile('x'),null);assert.equal(cleanProfile({name:'🎅'}),null);
  assert.deepEqual(cleanProfile({name:'Nils',bests:{13:100,0:50}}).bests,{},'bara rush 1–12');
});

test('länken: rundtur bevarar profil och utmaning, och trasiga, ändrade eller konstiga länkar ger null',()=>{
  const bests={1:640,2:910,5:2200},t=encodeChallenge({name:'Åsa-Lisa',focus:5,cleared:5,stars:11,bests,at:1700000000000});
  assert.match(t,/^[A-Za-z0-9_-]{16,420}$/,'bara tecken som får finnas i en adress');
  const d=decodeChallenge(t);assert.equal(d.profile.name,'Åsa-Lisa');assert.equal(d.focus,5);assert.equal(d.toBeat,2200);assert.deepEqual(d.profile.bests,bests);assert.equal(d.profile.stars,11);assert.equal(d.profile.cleared,5);assert.equal(d.profile.at,1700000000000);
  // utan utmaning (bara en profil)
  const pr=decodeChallenge(encodeChallenge({name:'Bo',bests:{1:100}}));assert.equal(pr.focus,0);assert.equal(pr.toBeat,0);assert.equal(pr.profile.total,100);
  // fokus på en rush som avsändaren inte klarat: ingen poäng att slå
  assert.equal(decodeChallenge(encodeChallenge({name:'Bo',focus:9,bests:{1:100}})).toBeat,0);
  // ändrar man ett tecken, lägger till eller tar bort något: fel kontrollsumma, fel längd eller ogiltig text
  const flip=(s,i)=>s.slice(0,i)+(s[i]==='A'?'B':'A')+s.slice(i+1);
  for(const i of [0,5,Math.floor(t.length/2),t.length-3])assert.equal(decodeChallenge(flip(t,i)),null,'ändrat tecken '+i);
  assert.equal(decodeChallenge(t+'A'),null);assert.equal(decodeChallenge(t.slice(0,-2)),null);assert.equal(decodeChallenge(t.slice(1)),null);
  for(const bad of [null,undefined,42,{},'','abc','x'.repeat(10),'x'.repeat(500),'a b'.repeat(10),'javascript:alert(1)//aaaaaaaaaa','<script>alert(1)</script>','../../etc/passwd'])assert.equal(decodeChallenge(bad),null,String(bad).slice(0,30));
  // en handgjord länk med egen kontrollsumma men fel fält avvisas
  const mk=text=>{const h=(s=>{let x=2166136261>>>0;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619);}return (x>>>0).toString(36);})(text);return Buffer.from(text+'|'+h,'utf8').toString('base64url');};
  assert.ok(decodeChallenge(mk('J1|Kalle|3|3|6|1700000000000|1,2,3,0,0,0,0,0,0,0,0,0')),'en korrekt handgjord länk går bra');
  for(const body of ['J2|Kalle|3|3|6|1700000000000|1,2,3,0,0,0,0,0,0,0,0,0','J1|Kalle|3|3|6|1700000000000|1,2,3','J1||3|3|6|1700000000000|1,2,3,0,0,0,0,0,0,0,0,0','J1|Kalle|3|3|6|1700000000000'])assert.equal(decodeChallenge(mk(body)),null,body);
  const wild=decodeChallenge(mk('J1|<b>Kalle</b>|99|99|99|99999999999999|99999999999,-5,x,0,0,0,0,0,0,0,0,0'));assert.ok(wild,'orimliga tal begränsas');assert.ok(!/[<>]/.test(wild.profile.name));assert.equal(wild.focus,0);assert.equal(wild.profile.bests[1],MAX_POINTS);assert.equal(wild.profile.stars,36);
  // största möjliga länk är kort nog
  const big=encodeChallenge({name:'ÅÄÖÅÄÖÅÄÖÅÄÖ',focus:12,stars:36,bests:Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,MAX_POINTS])),at:4102444800000});assert.ok(big.length<=420,'länkens längd '+big.length);assert.ok(decodeChallenge(big));
  assert.equal(encodeChallenge({name:''}),null);
});

test('adressen: samma sida med ?utmaning=…, och en url från adressfältet hittas bara om den ser rätt ut',()=>{
  const t=encodeChallenge({name:'Bo',focus:1,bests:{1:300}}),base='https://karlstad-julklappsjakten.vercel.app/';
  assert.equal(challengeUrl(base,t),base+'?utmaning='+t);assert.equal(challengeUrl(base+'?debug&x=1#hash',t),base+'?utmaning='+t,'tidigare frågor och ankare tas bort');
  assert.equal(challengeUrl('inte en adress',t),'');assert.equal(challengeUrl(base,null),'');
  assert.equal(tokenFromSearch('?utmaning='+t+'&debug'),t);assert.equal(tokenFromSearch('?debug'),null);assert.equal(tokenFromSearch('?utmaning=<script>'),null);assert.equal(tokenFromSearch('?utmaning=kort'),null);assert.equal(tokenFromSearch(''),null);assert.equal(tokenFromSearch(undefined),null);
  assert.equal(decodeChallenge(tokenFromSearch('?utmaning='+t)).profile.name,'Bo');
  assert.equal(shareText({rush:RUSHES[3],points:3120,url:'https://x.se/?utmaning=abc'}),'Jag fick '+(3120).toLocaleString('sv-SE')+' poäng i Rush 4 (SNÖYRA) i Julklappsjakten. Slå mig! https://x.se/?utmaning=abc');
  assert.match(shareText({url:'https://x.se/'}),/Hur långt kommer du\? https:\/\/x\.se\/$/);
});

test('vänlistan: ny vän läggs först, samma namn uppdateras (bästa poäng behålls), högst trettio och trasiga poster rensas',()=>{
  let list=[];
  let r=mergeFriend(list,prof('Anna',{1:500,2:800}));assert.equal(r.isNew,true);assert.equal(r.friend.total,1300);list=r.list;
  r=mergeFriend(list,prof('Bo',{1:300}));assert.equal(r.list[0].name,'Bo','nyast först');list=r.list;
  r=mergeFriend(list,prof('ANNA',{1:450,2:900,3:700},{stars:9,at:1800000000000}));
  assert.equal(r.isNew,false,'samma namn, annat skiftläge');assert.equal(r.list.length,2);assert.equal(r.list[0].name,'ANNA');
  assert.deepEqual(r.friend.bests,{1:500,2:900,3:700},'bästa poäng per rush behålls');assert.equal(r.friend.total,2100);assert.equal(r.friend.stars,9);assert.equal(r.friend.cleared,3);
  assert.equal(mergeFriend(list,{name:'',bests:{}}).friend,null);assert.equal(mergeFriend(list,null).list.length,2);
  let big=[];for(let i=0;i<40;i++)big=mergeFriend(big,prof('Vän'+i,{1:10+i})).list;assert.equal(big.length,FRIENDS_MAX);assert.equal(big[0].name,'Vän39');
  assert.deepEqual(cleanFriends([null,{name:'<>'},prof('Ok',{1:5}),prof('ok',{1:6}),'x']).map(f=>f.name),['Ok'],'dubbletter och skräp rensas');assert.deepEqual(cleanFriends('inte en lista'),[]);
});

test('topplistan: du och vännerna per rush eller totalt, bara de som klarat rushen, jämna rangordningar',()=>{
  const me=prof('Jag',{1:600,2:800,3:1500}),friends=[prof('Anna',{1:700,2:500}),prof('Bo',{1:600,4:3000}),prof('Cia',{2:800})].map(cleanProfile);
  const r1=leaderboard({me,friends,n:1});assert.deepEqual(r1.map(r=>[r.rank,r.name,r.points]),[[1,'Anna',700],[2,'Jag',600],[3,'Bo',600]],'lika poäng: du före vännen');assert.equal(r1[1].you,true);assert.equal(r1[0].you,false);
  const r2=leaderboard({me,friends,n:2});assert.deepEqual(r2.map(r=>r.name),['Jag','Cia','Anna'],'lika: du först (Cia och du har båda 800)');
  assert.deepEqual(leaderboard({me,friends,n:4}).map(r=>r.name),['Bo'],'bara de som klarat rush 4');assert.deepEqual(leaderboard({me,friends,n:9}),[]);
  const tot=leaderboard({me,friends});assert.deepEqual(tot.map(r=>[r.name,r.points]),[['Bo',3600],['Jag',2900],['Anna',1200],['Cia',800]]);
  assert.deepEqual(tot.map(r=>r.rank),[1,2,3,4]);assert.deepEqual(leaderboard({me:null,friends:[]}),[]);assert.deepEqual(leaderboard({}),[]);
  assert.equal(leaderboard({me:{name:'',bests:{1:5}},n:1})[0].name,'DU','utan namn visas du som DU');
});

test('efter en rush: slog du utmanaren?',()=>{
  const a=versus({points:3400,toBeat:3120,name:'ANNA'});assert.equal(a.beat,true);assert.equal(a.diff,280);assert.match(a.text,/^DU SLOG ANNA! /);
  const b=versus({points:3000,toBeat:3120,name:'ANNA'});assert.equal(b.beat,false);assert.equal(b.diff,-120);assert.match(b.text,/^ANNA VANN MED /);
  const c=versus({points:3120,toBeat:3120,name:'ANNA'});assert.equal(c.tie,true);assert.match(c.text,/^LIKA MED ANNA/);
  assert.equal(versus({points:100,toBeat:0,name:'X'}),null);
});

test('sparningen: namn och vänner sparas, rensas vid läsning och går att ta bort',()=>{
  const m=new Map(),store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};
  const a=new XmasSave(store);assert.equal(a.setName('  <b>Åsa</b>  '),'bÅsab','tecknen som skulle bli HTML tas bort');assert.equal(a.setName('Åsa'),'Åsa');
  const r=a.addFriend(prof('Anna',{1:500}));assert.equal(r.isNew,true);assert.equal(a.addFriend({name:'',bests:{}}),null);assert.equal(a.addFriend(prof('anna',{1:600})).isNew,false);
  const b=new XmasSave(store);assert.equal(b.name,'Åsa');assert.equal(b.friends.length,1);assert.equal(b.friends[0].bests[1],600);
  assert.equal(b.removeFriend('anna'),true);assert.equal(b.removeFriend('anna'),false);assert.equal(new XmasSave(store).friends.length,0);
  const dirty=sanitizeSave({v:1,name:'<script>alert(1)</script>',friends:[{name:'Ok',bests:{1:5}},{name:'x'.repeat(50),bests:{2:1e99}},'x',null,{bests:{1:1}}]});
  assert.ok(!/[<>()]/.test(dirty.name));assert.deepEqual(dirty.friends.map(f=>f.name.length<=NAME_MAX),[true,true]);assert.equal(dirty.friends[1].bests[2],MAX_POINTS);
  // profilen som delas innehåller bara det man själv valt: namn, poäng, stjärnor (inga personuppgifter, ingen tid utöver tidsstämpeln)
  a.recordRush(1,{points:640,seconds:40,packages:13,hearts:3,cleared:true});const p=a.profile(1700000000000);assert.deepEqual(Object.keys(p).sort(),['at','bests','cleared','name','stars','total']);
});

test('LÄNGST: topplistan ordnas på hur långt man kommit i Julrushen (även över Rush 12), först på rush och sedan på summan, och länken och delningstexten bär det',()=>{
  const me=cleanProfile(prof('Jag',{1:600,2:800},{cleared:14})),friends=[prof('Anna',{1:700,2:900,3:900},{cleared:12}),prof('Bo',{1:500},{cleared:16}),prof('Cia',{1:300},{cleared:14}),prof('Dan',{},{cleared:0})].map(cleanProfile);
  assert.equal(me.cleared,14,'profilen bär hur långt man kommit (upp till Rush 99)');assert.equal(cleanProfile(prof('X',{1:5},{cleared:500})).cleared,99,'högst Rush 99');
  const far=leaderboard({me,friends,n:-1});
  assert.deepEqual(far.map(r=>[r.rank,r.name,r.points]),[[1,'Bo',16],[2,'Jag',14],[3,'Cia',14],[4,'Anna',12]],'lika långt: den med störst summa först; Dan har inte klarat något och är inte med');
  assert.equal(far[1].you,true);assert.equal(far[0].cleared,16);
  assert.deepEqual(leaderboard({me:cleanProfile(prof('Ensam',{1:5})),friends:[],n:-1}).map(r=>r.points),[1]);
  // länken bär hur långt man kommit, också över tolv
  const t=encodeChallenge({name:'Åsa',focus:0,cleared:15,stars:30,bests:{1:500,12:9000},at:1700000000000}),d=decodeChallenge(t);
  assert.equal(d.profile.cleared,15);assert.equal(d.profile.bests[12],9000);assert.equal(d.focus,0);
  const old=decodeChallenge(encodeChallenge({name:'Åsa',focus:5,cleared:5,stars:11,bests:{1:640,5:2200},at:1700000000000}));assert.equal(old.profile.cleared,5);assert.equal(old.toBeat,2200,'länkar av det gamla slaget fungerar');
  // delningstexten
  assert.match(shareText({reach:14,url:'https://x.se/'}),/Rush 14.*Kommer du längre\? https:\/\/x\.se\/$/);
  assert.match(shareText({reach:12}),/Rush 12/);assert.doesNotMatch(shareText({reach:5}),/Rush 5/,'under tolv nämns inte sträckan');assert.match(shareText({reach:5}),/Hur långt kommer du/);
  assert.match(shareText({rush:{n:3,name:'GLÖGGFART'},points:1200,reach:14}),/1.200 poäng i Rush 3 \(GLÖGGFART\)/,'en rush med poäng går före sträckan');
  assert.ok(!/[<>]/.test(shareText({name:'<b>',reach:20})));
});
