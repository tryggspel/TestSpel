// Svårighetsprovet (tools/xmas-flow/difficulty.mjs) spelar den riktiga motorn med modellerade spelartyper. Här kontrolleras att provet går att köra och att önskemålet bakom 2.21.1-xmas.4 gäller:
// inte alla klarar alla tolv rusher på första försöket. En perfekt spelare klarar Rush 12 med tre hjärtan, men inte en duktig, en vanlig eller en nybörjare.
// Provet är en modell, inte människor (se JULVERSION.md 6.1): det här skyddar riktningen, inte de exakta siffrorna.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const tool=fileURLToPath(new URL('../tools/xmas-flow/difficulty.mjs',import.meta.url));
const run=args=>{
  const r=spawnSync(process.execPath,[tool,...args],{encoding:'utf8',timeout:120000});
  assert.equal(r.status,0,'provet avslutades med fel: '+r.stderr);
  return Object.fromEntries([...r.stdout.matchAll(/══ (\w) · [^\n]*\n[^\n]*?\): (.*)/g)].map(m=>[m[1],m[2]]));
};

test('svårighetsprovet: en perfekt spelare klarar Rush 12 på första försöket, men inte en duktig, en vanlig eller en nybörjare',()=>{
  const rows=run(['--skills','P,G,A,C','--from','12','--max','12','--runs','2','--series','0','--marathon','0']);
  assert.deepEqual(Object.keys(rows).sort(),['A','C','G','P']);
  assert.match(rows.P,/^12:100%\(3\.0♥\)/,'perfekt: '+rows.P);
  for(const k of ['G','A','C'])assert.match(rows[k],/^12:0%/,k+' klarar inte Rush 12 på första försöket: '+rows[k]);
});

test('svårighetsprovet: det blir svårare för varje rush: nybörjaren klarar de första, men inte de sista, och en perfekt spelare fortsätter i övertiden',()=>{
  const c=run(['--skills','C','--from','1','--max','12','--runs','1','--series','0','--marathon','0']).C;
  assert.match(c,/1:100%\(3\.0♥\)/,'nybörjaren klarar Rush 1: '+c);assert.match(c,/12:0%/,'men inte Rush 12: '+c);
  // aldrig lättare längre fram: när en rush har förlorats vinns ingen senare (jämna fart- och klockkurvor)
  const wins=[...c.matchAll(/(\d+):(\d+)%/g)].map(m=>+m[2]);const firstLoss=wins.findIndex(w=>w<100);assert.ok(firstLoss>=3&&firstLoss<=10,'första förlusten kommer mitt i raden: Rush '+(firstLoss+1));
  assert.ok(wins.slice(firstLoss).every(w=>w===0),'efter första förlusten vinns inget mer: '+wins.join(','));
  const p=run(['--skills','P','--from','13','--over','4','--max','16','--runs','1','--series','0','--marathon','0']).P;
  assert.match(p,/13:100%/,'perfekt klarar ÖVERTID 1: '+p);assert.match(p,/16:100%/,'och ÖVERTID 4: '+p);
});
