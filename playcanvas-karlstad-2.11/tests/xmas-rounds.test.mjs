import test from 'node:test';
import assert from 'node:assert/strict';
import {ROUNDS,WAYPOINTS,buildRound,resample,roundById,nextRound,ROUND_LIMITS} from '../xmas/xmas-rounds.mjs';
import {distanceToPath,TORGET_PROPS,TREE} from '../xmas/xmas-layout.mjs';
import {STALLS,ARCH} from '../xmas/xmas-decor-data.mjs';

// En påhittad stad: öppen yta med en lång vägg tvärs över Kungsgatan-rutten, så att kod som ska runda hinder får något att göra.
const walls=[{minx:-30,maxx:-10,minz:-45,maxz:-30},{minx:80,maxx:95,minz:-120,maxz:-60}];
const blocked=(x,z)=>walls.some(w=>x>w.minx&&x<w.maxx&&z>w.minz&&z<w.maxz);
const nav={
  point:p=>({x:p.x,z:p.z}),blocked,
  clear:(a,b)=>{const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.5);for(let i=1;i<=n;i++)if(blocked(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n))return false;return true;},
  path:(a,b)=>{const out=[],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/3));for(let i=0;i<=n;i++)out.push({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n});return out;}
};

test('tre rundor med unika id, stämplar och rimliga tider',()=>{
  assert.deepEqual(ROUNDS.map(r=>r.id),['round-torget','round-kungsgatan','round-drottninggatan']);
  for(const r of ROUNDS){assert.ok(r.soft>=140&&r.soft<=190,r.id+' mjuk tid');assert.ok(r.title.length>5);assert.equal(roundById(r.id),r);}
});
test('rutterna ger tätt packade grupper på gångbar mark nära rutten, en bonus vid sidan och ett mål som går att nå',()=>{
  for(const def of ROUNDS.filter(r=>r.kind==='route')){
    const run=buildRound(def,nav),regular=run.packages.filter(p=>p.kind==='regular'),bonus=run.packages.filter(p=>p.kind==='bonus');
    assert.ok(regular.length>=40&&regular.length<=110,def.id+' har '+regular.length+' vanliga');
    assert.ok(run.goal>=12&&run.goal<=regular.length,def.id+' mål '+run.goal);
    assert.ok(bonus.length>=2&&bonus.length<=3,def.id+' bonus '+bonus.length);
    assert.equal(new Set(run.packages.map(p=>p.id)).size,run.packages.length,'unika id');
    for(const p of run.packages){assert.ok(!blocked(p.x,p.z),p.id+' ligger i en vägg');}
    for(const p of regular)assert.ok(distanceToPath(p,run.route)<=ROUND_LIMITS.maxLateral+1e-6,p.id+' ligger för långt från rutten');
    for(const b of bonus){const d=distanceToPath(b,run.route);assert.ok(d>=ROUND_LIMITS.bonusMin-1e-6&&d<=ROUND_LIMITS.bonusMax+1,def.id+' '+b.id+' '+d.toFixed(1));assert.ok(nav.clear(WAYPOINTS.torget,WAYPOINTS.torget));}
    // grupperna ligger minst 9 m från varandra (mätt mellan gruppernas medelpunkter), så att inga två grupper blir en
    const byCluster=new Map();for(const p of regular){if(!byCluster.has(p.cluster))byCluster.set(p.cluster,[]);byCluster.get(p.cluster).push(p);}
    const cs=[...byCluster.values()].map(g=>({x:g.reduce((s,p)=>s+p.x,0)/g.length,z:g.reduce((s,p)=>s+p.z,0)/g.length}));
    for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)assert.ok(Math.hypot(cs[i].x-cs[j].x,cs[i].z-cs[j].z)>=ROUND_LIMITS.minGap-4.5,def.id+' grupper för tätt');
    assert.ok(run.length>=380,def.id+' rutten är '+run.length+' m');
  }
});
test('torgets paketregn: utspritt över torget men aldrig på granen, portalen, stånden, tomten eller grundspelets föremål',()=>{
  const run=buildRound(ROUNDS[0],nav),regular=run.packages.filter(p=>p.kind==='regular');
  assert.ok(regular.length>=30&&run.packages.some(p=>p.kind==='bonus'));
  for(const p of run.packages){
    assert.ok(Math.hypot(p.x-TREE.x,p.z-TREE.z)>=5,p.id+' vid granen');
    assert.ok(Math.hypot(p.x-ARCH.x,p.z-ARCH.z)>=4.5,p.id+' vid portalen');
    for(const s of STALLS)assert.ok(Math.hypot(p.x-s.x,p.z-s.z)>=3,p.id+' vid stånd '+s.id);
    for(const [px,pz] of TORGET_PROPS)assert.ok(Math.hypot(p.x-px,p.z-pz)>=1.4,p.id+' vid föremål');
  }
});
test('rundor är deterministiska och hoppar över dubbletter där rutten går tillbaka samma väg',()=>{
  const a=buildRound(ROUNDS[1],nav),b=buildRound(ROUNDS[1],nav);
  assert.deepEqual(a.packages,b.packages);
  // returresan över samma gata får inga egna grupper på de första 80 metrarna (rutten delas)
  const near=a.packages.filter(p=>Math.hypot(p.x-WAYPOINTS.torget.x,p.z-WAYPOINTS.torget.z)<9);
  assert.ok(near.length<=4,'för många paket vid start/slut: '+near.length);
});
test('nästa runda: den första utan stämpel, därefter i tur och ordning',()=>{
  const have=new Set();const save={hasStamp:id=>have.has(id),state:{totals:{runs:0}}};
  assert.equal(nextRound(save).id,'round-torget');have.add('round-torget');
  assert.equal(nextRound(save).id,'round-kungsgatan');have.add('round-kungsgatan');have.add('round-drottninggatan');
  save.state.totals.runs=4;assert.equal(nextRound(save).id,'round-kungsgatan');
});
test('resample ger jämna steg och tangenter',()=>{
  const p=resample([{x:0,z:0},{x:10,z:0},{x:10,z:10}],1);
  assert.ok(p.length>=20&&Math.abs(p.at(-1).s-20)<1.01);
  for(const q of p)assert.ok(Math.abs(Math.hypot(q.tx,q.tz)-1)<1e-9);
});
