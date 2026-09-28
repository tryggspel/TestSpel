import test from 'node:test';
import assert from 'node:assert/strict';
import {FpsLook,wrapYaw} from '../fps-controls.mjs';
test('two comfortable mobile swipes turn a full 360 degrees without movement or target input',()=>{
  const input=new FpsLook({span:390});let rotation=0;
  for(let i=0;i<2;i++){input.begin(i,100,200);input.move(i,334,200);input.end(i);rotation+=input.consume(1/60).x;}
  assert.equal(rotation,360);assert.deepEqual(input.consume(1),{x:0,y:0});
  assert.equal(wrapYaw(-360),0);assert.equal(wrapYaw(179+180),-1);
});
test('right stick can turn continuously on the spot and stops immediately on release or pause',()=>{
  const input=new FpsLook({mode:'stick'});input.begin(1,100,200);input.move(1,156,200);
  let degrees=0;for(let i=0;i<96;i++)degrees+=input.consume(1/60).x;
  assert.equal(degrees,360);input.end(1);assert.equal(input.consume(1).x,0);
  input.begin(2,100,200);input.move(2,0,200);input.reset();assert.deepEqual(input.consume(1),{x:0,y:0});
});
test('touch ownership, independent sensitivity and frame rate do not leak camera motion',()=>{
  const input=new FpsLook({span:390});assert.equal(input.begin(1,100,100),true);assert.equal(input.begin(2,0,0),false);
  input.move(2,300,300);input.end(2);assert.deepEqual(input.consume(1),{x:0,y:0});
  input.move(1,178,100);input.sensitivity=.5;assert.equal(input.consume(1/60).x,30);
  input.end(1);assert.deepEqual(input.consume(10),{x:0,y:0});
  for(const hz of [30,120]){const stick=new FpsLook({mode:'stick'});stick.begin(3,0,0);stick.move(3,-56,0);let total=0;for(let i=0;i<hz;i++)total+=stick.consume(1/hz).x;assert.ok(Math.abs(total+225)<.001);}
});
