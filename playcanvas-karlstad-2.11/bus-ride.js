import {createCabinView} from './bus-cabin.js?v=2.11.9';
import {ZombieBus} from './zombie-bus.mjs?v=2.11.9';

// Reuses the moving city behind a cached illustrated cabin.
export function createBusRide(host,{driverTexture,passengerTextures=[driverTexture,driverTexture,driverTexture],onArrive,onCrash,onTick}){
  const $=id=>document.getElementById(id),keys=new Set();let bus=null,origin=null,destination=null,input=0,pointer=null,uiTime=0,heading=0,paused=false;
  const pad=$('busBalance'),knob=$('busThumb'),cabin=createCabinView($('busCabin'),$('busPassengers'),passengerTextures);let pointerStart=0;
  const move=x=>{const r=pad.getBoundingClientRect();input=Math.max(-1,Math.min(1,(x-pointerStart)/(r.width*.38)));knob.style.transform=`rotate(${input*85}deg)`;};
  const reset=()=>{input=0;keys.clear();if(pointer!==null&&pad.hasPointerCapture?.(pointer))pad.releasePointerCapture(pointer);pointer=null;knob.style.transform='rotate(0deg)';};
  pad.addEventListener('pointerdown',e=>{if(!bus||paused||pointer!==null)return;e.preventDefault();pointer=e.pointerId;pad.setPointerCapture(pointer);pointerStart=e.clientX;move(e.clientX);});
  pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)move(e.clientX);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,e=>{if(e.pointerId===pointer)reset();});
  window.addEventListener('keydown',e=>{if(bus&&['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',reset);
  $('busPause').addEventListener('click',()=>setPaused(!paused));$('busResume').addEventListener('click',()=>setPaused(false));
  function setPaused(value){paused=value;reset();$('busPaused').hidden=!value;}
  function stop(){cabin.stop();bus=null;reset();$('busLayer').hidden=true;document.body.classList.remove('bus-riding');$('busPaused').hidden=true;host.resetInput();}
  function start(from,to,route){
    bus=new ZombieBus(route);origin=from;destination=to;heading=bus.pose().heading;paused=false;uiTime=0;reset();host.resetInput();
    $('busLayer').hidden=false;document.body.classList.add('bus-riding');$('busDestination').textContent=to.name.toUpperCase();$('busPaused').hidden=true;
    cabin.start();cabin.draw(bus.snapshot());
    host.ridePose?.({...bus.pose(),heading});draw();
  }
  function draw(){
    $('busClock').textContent=String(Math.ceil(bus.remaining));$('busHealth').style.width=bus.health+'%';$('busHealthText').textContent=Math.ceil(bus.health)+'%';
    $('busBalanceDot').style.left=(50+Math.max(-1,Math.min(1,bus.roll))*44)+'%';
    $('busInstruction').textContent=bus.instruction;pad.setAttribute('aria-valuenow',String(Math.round(input*100)));
    $('busQuip').textContent=bus.quip;
    $('busLayer').classList.toggle('bus-danger',Math.abs(bus.roll)>.7);
    $('busProgress').style.width=(bus.elapsed/bus.duration*100)+'%';
  }
  function update(dt){
    if(!bus||paused)return;const steer=keys.has('KeyA')||keys.has('ArrowLeft')?-1:keys.has('KeyD')||keys.has('ArrowRight')?1:input;
    const before=bus.elapsed;bus.step(dt,steer);onTick(bus.elapsed-before);if(!bus)return;
    const pose=bus.pose(),delta=((pose.heading-heading+540)%360)-180;heading+=delta*(1-Math.exp(-dt*8));host.ridePose?.({...pose,heading});
    knob.style.transform=`rotate(${steer*85}deg)`;cabin.draw(bus.snapshot(),dt);
    uiTime+=dt;if(uiTime>.08){uiTime=0;draw();}
    if(bus.state!=='playing'){
      const result=bus.snapshot(),to=bus.state==='arrived'?destination:origin;stop();
      host.teleport(to.x,to.z,heading,-2);
      result.state==='arrived'?onArrive(result,to,origin):onCrash(result,to,origin);
    }
  }
  return {start,update,stop,pause:()=>setPaused(true),resume:()=>setPaused(false),active:()=>!!bus,snapshot:()=>bus?{...bus.snapshot(),input,paused,destination:destination.name}:null};
}
