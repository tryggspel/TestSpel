import test from 'node:test';
import assert from 'node:assert/strict';
import {createXmasMusic,MOODS} from '../xmas/xmas-music.js';

// En låtsas-AudioContext som räknar noder: provar notmaskinen utan webbläsare.
function fakeContext(){
  const made={gain:0,osc:0,filter:0,buffer:0,source:0,convolver:0};
  const param=(v=0)=>({value:v,setValueAtTime(x){this.value=x;},exponentialRampToValueAtTime(x){this.value=x;},linearRampToValueAtTime(x){this.value=x;},cancelScheduledValues(){}});
  const node=(extra={})=>({connect(){return this;},disconnect(){},...extra});
  const ctx={currentTime:0,sampleRate:8000,state:'running',made,destination:node(),
    createGain(){made.gain++;return node({gain:param(1)});},
    createOscillator(){made.osc++;return node({frequency:param(440),detune:param(0),type:'sine',start(){},stop(){}});},
    createBiquadFilter(){made.filter++;return node({frequency:param(1000),Q:param(1),type:'lowpass'});},
    createBuffer(ch,n){made.buffer++;return {getChannelData:()=>new Float32Array(n),length:n};},
    createBufferSource(){made.source++;return node({buffer:null,start(){},stop(){}});},
    createConvolver(){made.convolver++;return node({buffer:null});}};
  return ctx;
}
const audioFor=ctx=>({context:()=>ctx,bus:()=>ctx.destination,resume(){}});

test('båda stämningarna är åtta takter med fyra ackordstoner och rimliga tempon',()=>{
  for(const [name,m] of Object.entries(MOODS)){
    assert.equal(m.chords.length,8,name);assert.equal(m.melody.length,8,name);
    for(const c of m.chords)assert.equal(c.length,4);
    for(const bar of m.melody)for(const [at,midi,len] of bar){assert.ok(at>=0&&at<8&&midi>=55&&midi<=100&&len>=1);}
    assert.ok(m.bpm>=60&&m.bpm<=100);
  }
  assert.ok(MOODS.eerie.bpm<MOODS.cozy.bpm,'det kusliga läget går långsammare');
});
test('en hel slinga (åtta takter) planeras utan fel och med begränsat antal ljudnoder',()=>{
  for(const mood of ['cozy','eerie']){
    const ctx=fakeContext(),music=createXmasMusic({audio:audioFor(ctx)});
    const seconds=8*4*60/MOODS[mood].bpm;
    assert.equal(music.renderTo(mood,seconds),true);
    const s=music.snapshot();
    assert.ok(s.notes>=40&&s.notes<=420,mood+' toner: '+s.notes);
    assert.ok(ctx.made.osc<=1400,mood+' oscillatorer: '+ctx.made.osc);
    assert.ok(ctx.made.convolver===1,'ett enda efterklangsfilter');
    assert.ok(s.scheduled>=60,'åttondelar '+s.scheduled);
  }
});
test('play() startar musiken, byte av stämning ger mjuk övergång och stop() stänger av',()=>{
  const ctx=fakeContext(),music=createXmasMusic({audio:audioFor(ctx)});
  assert.equal(music.play('nonsens'),false);
  assert.equal(music.play('cozy'),true);assert.equal(music.mode,'cozy');assert.equal(music.started,true);
  const before=music.snapshot().notes;assert.ok(before>0,'första tonerna planeras direkt (snabb start)');
  assert.equal(music.play('cozy'),true,'samma stämning igen är ofarligt');
  assert.equal(music.play('eerie'),true);assert.equal(music.mode,'eerie');
  music.setPaused(true);music.setPaused(false);
  music.stop(.1);assert.equal(music.mode,'off');assert.equal(music.started,false);
});
test('utan Web Audio händer ingenting (spelet fortsätter tyst)',()=>{
  const music=createXmasMusic({audio:{context:()=>null,bus:()=>null,resume(){}}});
  assert.equal(music.play('cozy'),false);assert.equal(music.started,false);
});
test('efter bakgrund börjar notmaskinen om från nu i stället för att köa gamla toner',()=>{
  const ctx=fakeContext(),music=createXmasMusic({audio:audioFor(ctx)});
  music.play('cozy');const n1=music.snapshot().notes;
  ctx.currentTime=600; // tio minuter i bakgrunden
  music.tick();const s=music.snapshot();
  assert.equal(s.restarts>=1,true);
  assert.ok(s.notes-n1<120,'högst ett par takter planeras på en gång: '+(s.notes-n1));
  music.stop(.05);
});
