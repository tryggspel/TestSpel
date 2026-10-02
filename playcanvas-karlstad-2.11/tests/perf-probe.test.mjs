import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerfProbe,percentile} from '../perf-probe.mjs';

test('percentiler räknas på sorterade frametider',()=>{
  const s=Array.from({length:100},(_,i)=>i+1);
  assert.equal(percentile(s,50),50);assert.equal(percentile(s,95),95);assert.equal(percentile(s,99),99);assert.equal(percentile([],95),0);
});
test('proben hoppar över uppvärmning, räknar hack och avslutas efter vald tid',()=>{
  const p=createPerfProbe({seconds:2,warmup:1});let t=0,report=null;
  p.sample(t);
  for(let i=0;i<400&&!report;i++){t+=(i%20===0)?60:16.7;report=p.sample(t,120+(i%3));}
  assert.ok(report,'rapport efter 3 s');assert.ok(report.over50ms>0,'hack över 50 ms ska synas');
  assert.ok(report.p50>16&&report.p50<17);assert.ok(report.avgFps>40&&report.avgFps<60);
  assert.equal(report.drawCallsMax,122);assert.equal(p.sample(t+16),null,'inga fler prover efter avslut');
});
test('långa uppehåll (flik i bakgrunden) räknas inte som frames',()=>{
  const p=createPerfProbe({seconds:1,warmup:0});p.sample(0);p.sample(16);p.sample(9000);
  assert.equal(p.summarize().frames,1);
});
