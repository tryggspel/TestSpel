// Dragningsverktyget (tools/xmas-draw/pick.mjs): poolen, dragningen och att vem som helst kan räkna om den. Ingen riktig anmälan eller lagring.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPool,drawWinners,verifyDraw} from '../tools/xmas-draw/pick.mjs';
import {makeTicket} from '../xmas/xmas-ticket.mjs';

const mulberry=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const tickets=(n,seed)=>{const r=mulberry(seed),out=new Set();while(out.size<n)out.add(makeTicket(r));return [...out];};
const entry=(owner,t,o={})=>({owner,data:{name:owner,contact:owner+'@exempel.se',tickets:t,first:'2026-12-10T10:00:00.000Z',flags:[],facts:{grade:4,days:8,streak:3},...o}});

test('poolen: sorterad, unika giltiga lotter, kontrollsumma som ändras när något ändras',()=>{
  const a=entry('a',tickets(5,1)),b=entry('b',tickets(7,2));
  const p=buildPool([a,b]);assert.equal(p.tickets.length,12);assert.equal(p.entries,2);
  assert.deepEqual(p.tickets.map(t=>t.code),[...p.tickets.map(t=>t.code)].sort());
  assert.match(p.poolHash,/^[0-9a-f]{64}$/);
  assert.equal(buildPool([b,a]).poolHash,p.poolHash,'ordningen på anmälningarna spelar ingen roll');
  assert.notEqual(buildPool([a,entry('b',[...b.data.tickets,...tickets(1,9)])]).poolHash,p.poolHash);
  const dirty=buildPool([entry('c',[...tickets(3,3),'T-AAAA-AAAA','skräp',null])]);assert.equal(dirty.tickets.length,3,'falska lotter kommer inte med');
});
test('samma lott i två anmälningar: den som skickade först behåller den och den andra rapporteras',()=>{
  const shared=tickets(3,4);
  const first=entry('tidig',shared,{first:'2026-12-02T08:00:00.000Z'}),late=entry('sen',[...shared.slice(0,2),...tickets(2,5)],{first:'2026-12-09T08:00:00.000Z'});
  const p=buildPool([late,first]);
  assert.equal(p.tickets.length,5);assert.equal(p.conflicts.length,2);assert.ok(p.conflicts.every(c=>c.keptBy==='tidig'&&c.alsoIn==='sen'));
  assert.ok(shared.slice(0,2).every(c=>p.tickets.find(t=>t.code===c).owner==='tidig'));
});
test('flaggade anmälningar listas och kan hållas utanför',()=>{
  const ok=entry('ok',tickets(4,6)),fl=entry('fl',tickets(40,7),{flags:['manga','ny']});
  const all=buildPool([ok,fl]),skip=buildPool([ok,fl],{skipFlagged:true});
  assert.equal(all.flagged.length,1);assert.deepEqual(all.flagged[0].flags,['manga','ny']);assert.equal(all.tickets.length,44);
  assert.equal(skip.tickets.length,4);assert.equal(skip.entries,1);assert.equal(skip.flagged.length,1);
});
test('dragningen är deterministisk, en vinst per person, och tom pool eller tom seed ger ingen vinnare',()=>{
  const p=buildPool([entry('a',tickets(10,1)),entry('b',tickets(30,2)),entry('c',tickets(60,3))]);
  const w1=drawWinners(p,'tärning 4 2 6',3),w2=drawWinners(p,'tärning 4 2 6',3);
  assert.deepEqual(w1,w2);assert.equal(w1.length,3);assert.equal(new Set(w1.map(w=>w.owner)).size,3,'tre olika personer');assert.deepEqual(w1.map(w=>w.rank),[0,1,2]);
  assert.ok(new Set(['a','b','c','d','e','f'].map(x=>drawWinners(p,'seed '+x,1)[0].code)).size>1,'olika seed ger olika vinnare');
  assert.equal(drawWinners(p,'x',10).length,3,'bara tre personer finns');
  assert.deepEqual(drawWinners({tickets:[],poolHash:'x'},'s',1),[]);assert.deepEqual(drawWinners(p,'',1),[]);
  assert.ok(w1.every(w=>p.tickets[w.index].code===w.code&&p.tickets[w.index].owner===w.owner));
});
test('rättvis: chansen att vinna är proportionell mot antalet lotter (10, 30 och 60 av 100)',()=>{
  const p=buildPool([entry('a',tickets(10,11)),entry('b',tickets(30,12)),entry('c',tickets(60,13))]);
  const wins={a:0,b:0,c:0},N=6000;
  for(let i=0;i<N;i++)wins[drawWinners(p,'seed-'+i,1)[0].owner]++;
  const pct=o=>wins[o]/N*100;
  assert.ok(Math.abs(pct('a')-10)<2,'a '+pct('a'));assert.ok(Math.abs(pct('b')-30)<2.5,'b '+pct('b'));assert.ok(Math.abs(pct('c')-60)<2.5,'c '+pct('c'));
});
test('vem som helst kan räkna om dragningen ur lottkoderna, seed och kontrollsumma, och manipulerade lotter fångas',()=>{
  const p=buildPool([entry('a',tickets(10,21)),entry('b',tickets(25,22)),entry('c',tickets(15,23))]),seed='slutkurs 1234,56 och en tärning 5';
  const winners=drawWinners(p,seed,3),codes=p.tickets.map(t=>t.code),owners=Object.fromEntries(p.tickets.map(t=>[t.code,t.owner]));
  assert.deepEqual(verifyDraw({codes,seed,poolHash:p.poolHash,winners,owners}),{ok:true});
  assert.equal(verifyDraw({codes:codes.slice(1),seed,poolHash:p.poolHash,winners,owners}).ok,false,'en lott borttagen');
  assert.equal(verifyDraw({codes,seed:seed+'!',poolHash:p.poolHash,winners,owners}).ok,false,'annan seed');
  assert.equal(verifyDraw({codes,seed,poolHash:p.poolHash,winners:[{...winners[0],code:codes[0]},...winners.slice(1)],owners}).ok,codes[0]===winners[0].code,'en annan vinnare');
  const one=drawWinners(p,seed,1);assert.deepEqual(verifyDraw({codes,seed,poolHash:p.poolHash,winners:one,owners}),{ok:true});
});
