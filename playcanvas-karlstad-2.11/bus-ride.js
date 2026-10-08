import {createCabinView} from './bus-cabin.js?v=2.21.1';
import {ZombieBus} from './zombie-bus.mjs?v=2.21.1';
import {QuizSession} from './bus-quiz.mjs?v=2.21.1';

// Reuses the moving city behind a cached illustrated cabin.
export function createBusRide(host,{driverTexture,passengerTextures=[driverTexture,driverTexture,driverTexture],onArrive,onCrash,onTick}){
  const $=id=>document.getElementById(id),keys=new Set();let bus=null,origin=null,destination=null,input=0,pointer=null,uiTime=0,heading=0,paused=false;
  const pad=$('busBalance'),knob=$('busThumb'),cabin=createCabinView($('busCabin'),$('busPassengers'),passengerTextures,driverTexture);let pointerStart=0,gps=null,gpsKey='',gpsSerial=0,incidentSeen=null;
  const gpsButtons=[0,1,2].map(i=>$('busGps'+i));
  const move=x=>{const r=pad.getBoundingClientRect();input=Math.max(-1,Math.min(1,(x-pointerStart)/(r.width*.38)));knob.style.transform=`rotate(${input*85}deg)`;};
  const reset=()=>{input=0;keys.clear();if(pointer!==null&&pad.hasPointerCapture?.(pointer))pad.releasePointerCapture(pointer);pointer=null;knob.style.transform='rotate(0deg)';};
  pad.addEventListener('pointerdown',e=>{if(!bus||paused||pointer!==null)return;e.preventDefault();pointer=e.pointerId;pad.setPointerCapture(pointer);pointerStart=e.clientX;move(e.clientX);});
  pad.addEventListener('pointermove',e=>{if(e.pointerId===pointer)move(e.clientX);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,e=>{if(e.pointerId===pointer)reset();});
  window.addEventListener('keydown',e=>{if(bus&&['KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',reset);
  $('busPause').addEventListener('click',()=>setPaused(!paused));$('busResume').addEventListener('click',()=>setPaused(false));
  function setPaused(value){paused=value;reset();$('busPaused').hidden=!value;}
  // Skärmen i bussen: i kaos-läge är texten sönder och svaren byter plats. Rätt svar startar om den, fel svar skakar bussen och ger ny fråga.
  function answerGps(i){
    if(!bus||paused||!gps||bus.incident?.kind!=='gps')return;const r=gps.answer(i);if(!r)return;
    if(r.ok){bus.fixGps();gps=null;}else{bus.bump(6);gps=new QuizSession({seed:'gps'+(++gpsSerial),count:1,chaos:true,perQuestion:99});}
    gpsKey='';renderIncident();
  }
  function shake(){if(!bus||paused)return;if(bus.incident?.kind==='sleep'){bus.shake();renderIncident();}}
  function renderIncident(){
    const box=$('busIncident'),inc=bus?.incident||null;if(!box)return;box.hidden=!inc;if(!inc){gps=null;incidentSeen=null;return;}
    if(incidentSeen!==inc){incidentSeen=inc;gpsKey='';if(inc.kind==='gps'&&!gps)gps=new QuizSession({seed:'gps'+(++gpsSerial),count:1,chaos:true,perQuestion:99});}
    $('busIncidentTitle').textContent=inc.kind==='sleep'?'CHAUFFÖREN SOMNADE · SKAKA HONOM ('+inc.need+' KVAR)':'SKÄRMEN BALLAR UR · BUSSEN KÖR FEL';
    $('busShake').hidden=inc.kind!=='sleep';$('busGps').hidden=inc.kind!=='gps';
    if(inc.kind==='gps'&&gps){const v=gps.view();if(v){const key=v.q+'|'+v.options.join('|');if(key!==gpsKey){gpsKey=key;$('busGpsQ').textContent=v.q;gpsButtons.forEach((b,i)=>{b.textContent=(i+1)+'  '+v.options[i];});}}}
  }
  $('busShake')?.addEventListener('click',shake);gpsButtons.forEach((b,i)=>b?.addEventListener('click',()=>answerGps(i)));
  window.addEventListener('keydown',e=>{if(!bus)return;if(['Space','KeyE','Enter'].includes(e.code)){e.preventDefault();shake();}const d=['Digit1','Digit2','Digit3'].indexOf(e.code);if(d>=0){e.preventDefault();answerGps(d);}});
  function stop(){cabin.stop();bus=null;gps=null;incidentSeen=null;$('busIncident')&&($('busIncident').hidden=true);reset();$('busLayer').hidden=true;document.body.classList.remove('bus-riding');$('busPaused').hidden=true;host.resetInput();}
  function start(from,to,route){
    bus=new ZombieBus(route,{incidents:true});gps=null;incidentSeen=null;origin=from;destination=to;heading=bus.pose().heading;paused=false;uiTime=0;reset();host.resetInput();
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
    if(gps)gps.tick(dt);
    const pose=bus.pose(),delta=((pose.heading-heading+540)%360)-180;heading+=delta*(1-Math.exp(-dt*8));host.ridePose?.({...pose,heading});
    knob.style.transform=`rotate(${steer*85}deg)`;cabin.draw(bus.snapshot(),dt);
    uiTime+=dt;if(uiTime>.08){uiTime=0;draw();renderIncident();}
    if(bus.state!=='playing'){
      const result=bus.snapshot(),to=bus.state==='arrived'?destination:origin;stop();
      host.teleport(to.x,to.z,heading,-2);
      result.state==='arrived'?onArrive(result,to,origin):onCrash(result,to,origin);
    }
  }
  return {start,update,stop,pause:()=>setPaused(true),resume:()=>setPaused(false),active:()=>!!bus,snapshot:()=>bus?{...bus.snapshot(),input,paused,destination:destination.name}:null};
}
