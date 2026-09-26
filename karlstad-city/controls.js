/* Pointer-ID isolated controls. No frame-delayed joystick smoothing. */
window.KarlstadControls=function({canvas,stick,knob,input,active,onLook,onJump,onGesture,fireEnabled=()=>false,onFire=()=>{}}){
 let stickId=null,lookId=null,origin=null,look=null,sprintId=null,fireId=null,fireLook=null;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function radial(dx,dy,radius){const length=Math.hypot(dx,dy),n=clamp(length/radius,0,1);if(n<=.085)return {x:0,y:0,outer:false};const response=Math.pow((n-.085)/.915,.85);return {x:dx/(length||1)*response,y:-dy/(length||1)*response,outer:n>.91};}
 function stickMove(e){if(e.pointerId!==stickId||!origin)return;const dx=e.clientX-origin.x,dy=e.clientY-origin.y,r=origin.radius,v=radial(dx,dy,r);input.x=v.x;input.y=v.y;input.autoSprint=v.outer;const ratio=Math.min(1,r/(Math.hypot(dx,dy)||1));knob.style.transform=`translate(${dx*ratio}px,${dy*ratio}px)`;stick.classList.toggle('sprinting',v.outer);stick.setAttribute('aria-label',v.outer?'Styr rörelsen · sprint':'Styr rörelsen');}
 stick.addEventListener('pointerdown',e=>{if(!active()||stickId!==null)return;e.preventDefault();onGesture();const r=stick.getBoundingClientRect();origin={x:r.left+r.width/2,y:r.top+r.height/2,radius:r.width*.34};stickId=e.pointerId;stick.setPointerCapture(e.pointerId);stick.classList.add('pressed');stickMove(e)});
 stick.addEventListener('pointermove',stickMove);
 function releaseStick(e){if(e&&e.pointerId!==stickId)return;stickId=null;origin=null;input.x=input.y=0;input.autoSprint=false;knob.style.transform='';stick.classList.remove('pressed','sprinting');stick.setAttribute('aria-label','Styr rörelsen')}
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(ev,releaseStick);
 canvas.addEventListener('pointerdown',e=>{if(!active()||lookId!==null||e.button>0)return;onGesture();lookId=e.pointerId;look={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);if(e.pointerType==='mouse'){if(fireEnabled()){input.fire=true;onFire();}if(!matchMedia('(pointer:coarse)').matches){try{canvas.requestPointerLock?.()?.catch?.(()=>{})}catch{}}}});
 canvas.addEventListener('pointermove',e=>{if(!active())return;let dx,dy;if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY}else if(e.pointerId===lookId&&look){dx=e.clientX-look.x;dy=e.clientY-look.y;look={x:e.clientX,y:e.clientY}}else return;const scale=e.pointerType==='mouse'?.0028:2.7/Math.max(390,Math.min(innerWidth,innerHeight));onLook(clamp(dx,-120,120)*scale,clamp(dy,-120,120)*scale*.78)});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(ev,e=>{if(e.pointerId===lookId){lookId=null;look=null;input.fire=false}});
 const fire=document.getElementById('fireButton');
 fire?.addEventListener('pointerdown',e=>{if(!active()||!fireEnabled()||fireId!==null)return;e.preventDefault();onGesture();fireId=e.pointerId;fireLook={x:e.clientX,y:e.clientY};fire.setPointerCapture(e.pointerId);input.fire=true;onFire();fire.classList.add('pressed')});
 fire?.addEventListener('pointermove',e=>{if(e.pointerId!==fireId||!fireLook||!active())return;const scale=2.7/Math.max(390,Math.min(innerWidth,innerHeight));onLook(clamp(e.clientX-fireLook.x,-120,120)*scale,clamp(e.clientY-fireLook.y,-120,120)*scale*.78);fireLook={x:e.clientX,y:e.clientY}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])fire?.addEventListener(ev,e=>{if(e.pointerId===fireId){fireId=null;fireLook=null;input.fire=false;fire.classList.remove('pressed')}});
 const sprint=document.getElementById('sprintButton'),duck=document.getElementById('crouchButton'),jump=document.getElementById('jumpButton');
 sprint.addEventListener('pointerdown',e=>{if(!active()||sprintId!==null)return;e.preventDefault();sprintId=e.pointerId;sprint.setPointerCapture(e.pointerId);input.sprint=true;sprint.classList.add('pressed')});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])sprint.addEventListener(ev,e=>{if(e.pointerId===sprintId){sprintId=null;input.sprint=false;sprint.classList.remove('pressed')}});
 duck.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();onGesture();input.crouch=!input.crouch;duck.classList.toggle('pressed',input.crouch);duck.setAttribute('aria-pressed',String(input.crouch))});
 jump.addEventListener('pointerdown',e=>{if(!active())return;e.preventDefault();onGesture();input.crouch=false;duck.classList.remove('pressed');duck.setAttribute('aria-pressed','false');onJump()});
 function reset(){releaseStick();lookId=null;look=null;sprintId=null;fireId=null;fireLook=null;input.fire=false;fire?.classList.remove('pressed');input.sprint=false;input.crouch=false;sprint.classList.remove('pressed');duck.classList.remove('pressed');duck.setAttribute('aria-pressed','false')}
 window.addEventListener('blur',reset);window.addEventListener('pagehide',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
 return {reset,radial};
};
