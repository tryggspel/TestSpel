const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
process.chdir(path.resolve(__dirname,'../..'));
function element(){return {handlers:{},classList:{add(){},remove(){},toggle(){}},style:{},attrs:{},addEventListener(t,f){(this.handlers[t]??=[]).push(f)},setAttribute(k,v){this.attrs[k]=v},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:116,height:116}},emit(t,e){for(const f of this.handlers[t]||[])f({preventDefault(){},...e})}}}
const buttons=Object.fromEntries(['sprintButton','crouchButton','jumpButton'].map(k=>[k,element()])),input={x:0,y:0},canvas=element(),stick=element(),knob=element();
const sandbox={window:element(),document:{...element(),pointerLockElement:null,getElementById:k=>buttons[k]},matchMedia:()=>({matches:true}),innerWidth:390,innerHeight:844};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('karlstad-city/controls.js','utf8'),sandbox);
const controls=sandbox.window.KarlstadControls({canvas,stick,knob,input,active:()=>true,onLook(){},onJump(){},onGesture(){}});
assert.equal(controls.radial(1,1,39).x,0,'rest zone must not drift');assert(controls.radial(39,0,39).outer,'outer edge must sprint');
stick.emit('pointerdown',{pointerId:1,clientX:58,clientY:20});const before=input.y;assert(before>.9);
stick.emit('pointerdown',{pointerId:2,clientX:95,clientY:58});assert.equal(input.y,before,'second pointer must not steal joystick');
stick.emit('pointerup',{pointerId:2});assert.equal(input.y,before,'unrelated release must not stop the first pointer');
stick.emit('pointerup',{pointerId:1});assert.equal(input.y,0,'release must stop immediately');assert.equal(input.autoSprint,false);assert.equal(stick.attrs['aria-label'],'Styr rörelsen');
buttons.crouchButton.emit('pointerdown',{});assert(input.crouch);controls.reset();assert(!input.crouch);assert.equal(input.x,0);
console.log('PASS: deadzone, outer-ring sprint, pointer ownership, immediate release, crouch, accessible state and reset');
