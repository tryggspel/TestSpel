import {BoatRescue} from './boat-rescue.mjs?v=2.12.0';
import {HARBOUR,MARIEBERG} from './city-south-space.mjs?v=2.12.0';

const INK='#1c4249',CREAM='#fff0cb',YELLOW='#ffbe0a';
// Illustrated first-person aft deck. Static environment is baked once per resize.
export function createBoatRide(host,{onTick,onArrive}){
  const $=id=>document.getElementById(id),canvas=$('boatCanvas'),c=canvas.getContext('2d'),back=document.createElement('canvas');
  let game=null,paused=false,returning=false,from=null,to=null,drawTime=0,lastLayout='';
  const targets=Array.from({length:4},(_,i)=>$('boatPerson'+i));
  function target(p){const t=game.elapsed,water=p.status==='water';return {x:water?[.13,.87,.11,.89][p.id]:[.30,.68,.23,.77][p.id]+Math.sin(t*1.8+p.id)*.025,y:water?[.57,.61,.72,.76][p.id]:[.48,.47,.66,.66][p.id]+Math.cos(t*2+p.id)*.01};}
  const box=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  function poly(ps,color){c.beginPath();ps.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();c.strokeStyle=INK;c.lineWidth=3;c.stroke();}
  function oval(x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();c.strokeStyle=INK;c.lineWidth=3;c.stroke();}
  function person(x,y,scale,safe=false,zombie=false,phase=0){
    c.save();c.translate(x,y);c.scale(scale,scale);c.rotate(Math.sin(phase)*.09);
    poly([[-20,0],[-31,44],[31,44],[20,0]],safe?'#ed8c43':zombie?'#263f57':'#5f8eae');
    c.strokeStyle=zombie?'#aac98b':'#f1ca9e';c.lineWidth=10;c.lineCap='round';c.beginPath();c.moveTo(-20,8);c.lineTo(-37,-7+Math.sin(phase)*12);c.moveTo(20,8);c.lineTo(38,-10+Math.cos(phase)*12);c.stroke();
    oval(0,-22,23,28,zombie?'#abc881':'#efc392');oval(-8,-26,7,9,CREAM);oval(9,-23,8,10,CREAM);oval(-6,-24,2,4,INK);oval(7,-21,2,4,INK);
    box(-9,-9,20,5,INK);box(1,-9,5,6,CREAM);if(zombie){box(-27,-49,54,12,CREAM);box(-20,-60,40,17,CREAM);box(-21,-45,42,7,INK);}
    if(safe){box(-20,2,14,34,'#ffb25b');box(7,2,14,34,'#ffb25b');box(-20,13,41,5,CREAM);}c.restore();
  }
  function resize(){
    const rect=canvas.getBoundingClientRect(),w=Math.min(1100,Math.round(rect.width*(devicePixelRatio>1?1.25:1))),h=Math.round(w*rect.height/Math.max(1,rect.width));
    if(canvas.width===w&&canvas.height===h)return;
    canvas.width=back.width=w;canvas.height=back.height=h;
    const g=back.getContext('2d');g.fillStyle='#abdadd';g.fillRect(0,0,w,h);g.fillStyle='#ffe199';g.beginPath();g.arc(w*.76,h*.2,w*.1,0,7);g.fill();
    g.fillStyle='#66927b';g.beginPath();g.moveTo(0,h*.35);for(let x=0;x<w;x+=w/22)g.lineTo(x,h*(.28+.04*Math.sin(x*.02)));g.lineTo(w,h*.42);g.lineTo(0,h*.42);g.fill();
    g.fillStyle='#368e9e';g.fillRect(0,h*.38,w,h*.62);
    // Harbour brick blocks transition to the wooded shore during the crossing.
    for(let i=0;i<7;i++){const x=i*w*.14;g.fillStyle=i%2?'#bd7e62':'#d4b477';g.fillRect(x,h*.31,w*.11,h*.075);g.fillStyle='#345861';for(let k=0;k<5;k++)g.fillRect(x+k*w*.021,h*.325,w*.012,h*.025);}
  }
  function draw(){
    if(!game)return;resize();const w=canvas.width,h=canvas.height,t=game.elapsed,s=game.snapshot();c.drawImage(back,0,0);
    c.strokeStyle='#a0d9d3';c.lineWidth=2;for(let i=0;i<20;i++){const xx=((i*127+t*32)%1100)/1100*w,yy=h*(.39+i*.028);c.beginPath();c.moveTo(xx,yy);c.lineTo(xx+w*.07,yy);c.stroke();}
    // Low roll on the boat only; horizon and HUD stay stable.
    c.save();c.translate(w/2,h*.68);c.rotate(Math.sin(t*1.2)*(s.calm?.008:.025));c.translate(-w/2,-h*.68);
    poly([[w*.33,h*.43],[w*.67,h*.43],[w*.92,h],[w*.08,h]],'#bd9270');
    for(let i=0;i<10;i++){c.strokeStyle='#916a53';c.lineWidth=2;c.beginPath();c.moveTo(w*(.34+i*.032),h*.43);c.lineTo(w*(.08+i*.087),h);c.stroke();}
    poly([[w*.31,h*.42],[w*.32,h*.26],[w*.69,h*.26],[w*.70,h*.42]],CREAM);box(w*.32,h*.24,w*.38,h*.045,YELLOW);
    box(w*.35,h*.29,w*.29,h*.09,INK);person(w*.52,h*.34,w/500,false,true,t*.7);oval(w*.52,h*.375,w*.032,w*.032,'#ab895d');
    c.fillStyle=INK;c.font=`900 ${Math.max(12,w*.018)}px system-ui`;c.textAlign='center';c.fillText('VÄRMLANDSTRAFIK · BÅTBUSS',w*.505,h*.42,w*.33);
    for(const side of [-1,1]){c.strokeStyle=CREAM;c.lineWidth=6;c.beginPath();c.moveTo(w*(.5+side*.19),h*.43);c.lineTo(w*(.5+side*.43),h*.90);c.stroke();for(let i=0;i<5;i++){const q=i/4;c.beginPath();c.moveTo(w*(.5+side*(.19+q*.24)),h*(.43+q*.47));c.lineTo(w*(.5+side*(.19+q*.24)),h*(.5+q*.47));c.stroke();}}
    c.restore();
    for(const p of s.people){
      const visible=['deck','water','safe'].includes(p.status);const point=target(p);targets[p.id].hidden=!visible||s.calm||paused;
      if(!visible||s.calm)continue;
      const x=point.x*w,y=point.y*h,scale=w/570;
      if(p.status==='water')oval(x,y+24*scale,34*scale,7*scale,'#82c9c6');
      person(x,y,scale,p.status==='safe',false,t*3+p.id);
      if(p.status!=='safe'){c.fillStyle=p.status==='water'?'#ff8e64':CREAM;c.font=`900 ${Math.max(13,w*.025)}px system-ui`;c.textAlign='center';c.fillText(p.status==='water'?'◯':'VÄST',x,y-70*scale);}
      const b=targets[p.id];b.style.left=point.x*100+'%';b.style.top=point.y*100+'%';b.disabled=p.status==='safe';b.setAttribute('aria-label',p.status==='water'?'Kasta livboj till person '+(p.id+1):'Kasta flytväst till person '+(p.id+1));
    }
    for(const shot of s.shots){const end=target(s.people[shot.id]),q=Math.min(1,(t-shot.at)/.55),x=w*(.5+(end.x-.5)*q),y=h*(.93+(end.y-.93)*q)-Math.sin(q*Math.PI)*h*.15;
      if(shot.tool==='ring'){oval(x,y,22,22,'#ffb35c');oval(x,y,12,12,'#368e9e');}else{poly([[x-17,y-20],[x-4,y-14],[x+4,y-14],[x+17,y-20],[x+22,y+23],[x-22,y+23]],'#ffb35c');box(x-18,y,36,5,CREAM);}}
    $('boatClock').textContent=Math.ceil(s.remaining)+' s';$('boatScore').textContent=s.calm?'LUGN TUR':s.saved+'/12 RÄDDADE · '+s.points+' XP';$('boatProgress').style.width=(s.elapsed/s.duration*100)+'%';
    $('boatQuip').textContent=s.calm?'”Jag har sjöben. Tror jag. Vems är de?”':s.saved>=8?'”Flytvästarna har bättre koll än kaptenen.”':s.elapsed<7?'TRYCK PÅ EN PERSON · RÄTT HJÄLP KASTAS AUTOMATISKT':s.elapsed<20?'”Väjningsplikt? Jag är mer för vätskeplikt.”':'OMBORD: FLYTVÄST · I VATTNET: LIVBOJ';
  }
  function setPaused(value){if(!game)return;paused=value;targets.forEach(b=>b.hidden=value);$('boatPaused').hidden=!value;if(!value)draw();}
  function stop(){game=null;paused=false;$('boatLayer').hidden=true;document.body.classList.remove('boat-riding');host.app.autoRender=true;host.resetInput();}
  function start({calm=false,back=false,seed=1}={}){returning=back;from=back?MARIEBERG:HARBOUR;to=back?HARBOUR:MARIEBERG;game=new BoatRescue({calm:calm||back,seed});paused=false;drawTime=0;host.resetInput();document.exitPointerLock?.();host.app.autoRender=false;$('boatLayer').hidden=false;$('boatPaused').hidden=true;document.body.classList.add('boat-riding');$('boatDestination').textContent=to.name.toUpperCase();draw();}
  function update(dt){if(!game||paused)return;const before=game.elapsed;game.step(Math.min(dt,.1));onTick(game.elapsed-before);if(!game)return;drawTime+=dt;if(drawTime>=1/30){drawTime=0;draw();}if(game.state==='arrived'){const r=game.snapshot();stop();host.teleport(to.x,to.z,returning?0:90,-2);onArrive(r,to,from);}}
  targets.forEach((b,i)=>b.addEventListener('click',()=>{game?.throwTo(i);draw();}));
  $('boatPause').addEventListener('click',()=>setPaused(true));$('boatResume').addEventListener('click',()=>setPaused(false));
  $('boatAbort').addEventListener('click',()=>{if(!game)return;const p=from;stop();host.teleport(p.x,p.z,0,-2);});
  window.addEventListener('keydown',e=>{if(!game)return;if(e.code==='Escape'){e.preventDefault();setPaused(!paused);}const i=['Digit1','Digit2','Digit3','Digit4'].indexOf(e.code);if(i>=0&&!paused){e.preventDefault();game.throwTo(i);}});
  return {start,stop,update,pause:()=>setPaused(true),active:()=>!!game,snapshot:()=>game?{...game.snapshot(),paused,destination:to.name}:null};
}
