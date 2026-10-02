import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudioEngine,MUTE_KEY} from '../audio-engine.mjs';

// Minimal Web Audio-attrapp som beter sig som iOS: element.volume har ingen effekt,
// bara GainNode-värden räknas.
function fakeAudio(){
  const log=[];let t=0;
  const param=(v=1)=>({value:v,cancelScheduledValues(){},setValueAtTime(x){this.value=x;},linearRampToValueAtTime(x){this.value=x;},exponentialRampToValueAtTime(x){this.value=x;}});
  const node=kind=>({kind,gain:param(),frequency:param(440),type:'',connect(n){(this.out||=[]).push(n);},start(){log.push('start');},stop(){}});
  const ctx={state:'suspended',get currentTime(){return t;},destination:node('dest'),
    createGain:()=>node('gain'),createOscillator:()=>node('osc'),
    createMediaElementSource:el=>{const n=node('src');el.routed=true;return n;},
    resume(){this.state='running';log.push('resume');return Promise.resolve();}};
  const els=[];
  const makeElement=src=>{const el={src,volume:1,loop:false,paused:true,currentTime:0,play(){this.paused=false;return Promise.resolve();},pause(){this.paused=true;}};els.push(el);return el;};
  const timers=[];const timerApi={set:(fn,ms)=>{timers.push(fn);return timers.length;},clear:()=>{},flush:()=>{while(timers.length)timers.shift()();}};
  return {ctx,log,els,makeElement,timers:timerApi};
}
const store=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};};

test('musik styrs via GainNode, inte element.volume (iOS-säkert)',()=>{
  const f=fakeAudio(),e=createAudioEngine({makeContext:()=>f.ctx,makeElement:f.makeElement,timers:f.timers});
  e.track('main','m.mp3',{loop:true});e.track('zombie','z.mp3',{loop:true});
  e.context();
  assert.ok(f.els.every(el=>el.routed),'alla spår ska kopplas genom Web Audio-grafen');
  assert.equal(e.routed,true);
  e.fade('main',.035,550);e.fade('zombie',.25,900);
  assert.equal(e.level('main'),.035);assert.equal(e.level('zombie'),.25);
  assert.ok(f.els.every(el=>el.volume===1),'element.volume lämnas på 1; mixen sitter i gain-noderna');
});

test('mute dämpar master, sparas och överlever omstart; nivåer bevaras',()=>{
  const f=fakeAudio(),s=store();
  const e=createAudioEngine({makeContext:()=>f.ctx,makeElement:f.makeElement,storage:s,timers:f.timers});
  e.track('main','m.mp3');e.context();e.fade('main',.23,10);
  e.setMuted(true);assert.equal(s.getItem(MUTE_KEY),'on');assert.equal(e.muted,true);
  assert.equal(e.level('main'),.23,'nivån ligger kvar så att mixen återställs vid ljud på');
  const f2=fakeAudio(),e2=createAudioEngine({makeContext:()=>f2.ctx,makeElement:f2.makeElement,storage:s,timers:f2.timers});
  assert.equal(e2.muted,true,'ljud av ska komma ihåg mellan sessioner');
});

test('effektljud tystnar vid mute och delar samma kontext',()=>{
  const f=fakeAudio();let made=0;
  const e=createAudioEngine({makeContext:()=>{made++;return f.ctx;},makeElement:f.makeElement,timers:f.timers});
  e.blip();e.blip();assert.equal(f.log.filter(x=>x==='start').length,2);
  e.setMuted(true);e.blip();assert.equal(f.log.filter(x=>x==='start').length,2,'inga plockljud när ljudet är av (bugg i 2.9.0)');
  assert.equal(made,1,'en enda AudioContext för musik och effekter');
});

test('pauseAfter pausar bara om nivån fortfarande är noll',()=>{
  const f=fakeAudio(),e=createAudioEngine({makeContext:()=>f.ctx,makeElement:f.makeElement,timers:f.timers});
  e.track('zombie','z.mp3');e.context();e.play('zombie');
  e.fade('zombie',0,300,{pauseAfter:true});e.fade('zombie',.25,300);f.timers.flush();
  assert.equal(f.els[0].paused,false,'en ny fade upp ska avbryta en planerad paus');
  e.fade('zombie',0,300,{pauseAfter:true});f.timers.flush();assert.equal(f.els[0].paused,true);
});

test('utan Web Audio används element.volume som reserv',()=>{
  const f=fakeAudio(),e=createAudioEngine({makeContext:()=>null,makeElement:f.makeElement,timers:f.timers});
  e.track('main','m.mp3');e.fade('main',.4,100);assert.equal(f.els[0].volume,.4);
  e.setMuted(true);assert.equal(f.els[0].volume,0);e.setMuted(false);assert.equal(f.els[0].volume,.4);
});
