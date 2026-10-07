import {BoatRescue} from './boat-rescue.mjs?v=2.14.2';
import {HARBOUR,MARIEBERG} from './city-south-space.mjs?v=2.14.2';

const INK='#1c4249',CREAM='#fff0cb',YELLOW='#ffbe0a';
// Illustrated first-person aft deck. Static environment is baked once per resize.
export function createBoatRide(host,{onTick,onArrive,onSpot}){
  const $=id=>document.getElementById(id),canvas=$('boatCanvas'),c=canvas.getContext('2d'),back=document.createElement('canvas');
  let game=null,paused=false,returning=false,from=null,to=null,drawTime=0,lastLayout='',far=null,near=null,popups=[];
  const hash=n=>{let h=2166136261;for(const ch of String(n)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;};
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
    g.fillStyle='#368e9e';g.fillRect(0,h*.38,w,h*.62);
    // Två remsor som rullar förbi i olika fart: fjärran kullar och stad, närmare strand med hus, bryggor och tallar. Remsan är 2 × bredden och ritas två gånger.
    const L=w*2,mk=()=>{const k=document.createElement('canvas');k.width=L;k.height=Math.ceil(h*.2);return k;};
    far=mk();near=mk();const f=far.getContext('2d'),n=near.getContext('2d'),H=far.height;
    f.fillStyle='#7aa88f';f.beginPath();f.moveTo(0,H);for(let x=0;x<=L;x+=L/44)f.lineTo(x,H*(.35+.2*Math.sin(x/L*Math.PI*6)+.1*Math.sin(x/L*Math.PI*14)));f.lineTo(L,H);f.fill();
    for(let i=0;i<16;i++){const x=i*L/16+L*.01,bw=w*.05,bh=H*(.3+hash(i)*.35);f.fillStyle=['#c9a98c','#d8c79a','#b9a0a0','#a9bfae'][i%4];f.fillRect(x,H-bh,bw,bh);f.fillStyle='#6c7f82';f.fillRect(x,H-bh-6,bw,6);}
    for(let i=0;i<14;i++){const x=i*L/14+hash(i+40)*w*.05,kind=i%4;
      if(kind===0||kind===2){const bw=w*.1,bh=H*.62;n.fillStyle=i%2?'#bd7e62':'#d4b477';n.fillRect(x,H-bh,bw,bh);n.fillStyle='#345861';for(let q=0;q<5;q++)n.fillRect(x+q*bw/5.5+4,H-bh+8,bw*.08,bh*.25);n.fillStyle='#7a4a3c';n.fillRect(x-3,H-bh-5,bw+6,6);}
      else if(kind===1){n.fillStyle='#b98b5f';n.fillRect(x,H*.8,w*.12,H*.1);for(let q=0;q<4;q++){n.fillStyle='#8f6844';n.fillRect(x+q*w*.035,H*.8,5,H*.2);}}
      else{for(let q=0;q<4;q++){const tx=x+q*w*.03;n.fillStyle=q%2?'#2f6b4a':'#3f7f58';n.beginPath();n.moveTo(tx,H);n.lineTo(tx+w*.025,H*.25);n.lineTo(tx+w*.05,H);n.fill();}}}
  }
  // Allt som rör sig är en ren funktion av tiden: fåglar, båtar och fisk. Samma funktion används för att rita och för att pricka dem med fingret.
  function creatures(t,w,h){
    const out=[];
    for(let i=0;i<3;i++){const period=11+i*2.3,pass=Math.floor((t+i*3.7)/period),u=((t+i*3.7)%period)/period,x=w*(1.08-1.2*u),y=h*(.12+i*.045)+Math.sin(u*Math.PI*6+i)*h*.02;out.push({key:'gull-'+i+'-'+pass,kind:'gull',x,y,r:w*.04,flap:Math.sin(t*9+i*2)});}
    {const period=17,pass=Math.floor(t/period),u=(t%period)/period;out.push({key:'boat-'+pass,kind:'boat',x:w*(-.1+1.2*u),y:h*.4,r:w*.05});}
    {const period=6.3,pass=Math.floor((t+2)/period),u=((t+2)%period)/period;if(u<.5){const q=u/.5;out.push({key:'fish-'+pass,kind:'fish',x:w*(.2+hash(pass+9)*.6),y:h*(.5+hash(pass+3)*.15)-Math.sin(q*Math.PI)*h*.09,r:w*.035,q});}}
    return out;
  }
  function drawCreature(o){
    c.save();c.translate(o.x,o.y);
    if(o.kind==='gull'){const a=o.flap*.6;c.strokeStyle=INK;c.lineWidth=3;c.fillStyle='#fffaf0';c.beginPath();c.moveTo(-o.r*.9,-a*o.r*.5);c.quadraticCurveTo(-o.r*.4,-o.r*(.5+a*.4),0,0);c.quadraticCurveTo(o.r*.4,-o.r*(.5+a*.4),o.r*.9,-a*o.r*.5);c.quadraticCurveTo(o.r*.3,o.r*.12,0,o.r*.1);c.quadraticCurveTo(-o.r*.3,o.r*.12,-o.r*.9,-a*o.r*.5);c.fill();c.stroke();}
    else if(o.kind==='boat'){c.fillStyle='#fff';c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.moveTo(0,-o.r*1.3);c.lineTo(o.r*.8,o.r*.2);c.lineTo(0,o.r*.2);c.closePath();c.fill();c.stroke();c.fillStyle='#d86a4a';c.beginPath();c.moveTo(-o.r,o.r*.3);c.lineTo(o.r,o.r*.3);c.lineTo(o.r*.7,o.r*.7);c.lineTo(-o.r*.7,o.r*.7);c.closePath();c.fill();c.stroke();}
    else{c.rotate(-.9+o.q*1.8);c.fillStyle='#e3b04a';c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.ellipse(0,0,o.r,o.r*.45,0,0,7);c.fill();c.stroke();c.beginPath();c.moveTo(-o.r,0);c.lineTo(-o.r*1.5,-o.r*.4);c.lineTo(-o.r*1.5,o.r*.4);c.closePath();c.fill();c.stroke();}
    c.restore();
  }
  const QUIPS=['”Jag har sjöben. Tror jag. Vems är de?”','”Mås på babord. Eller var det styrbord?”','”Fika på däck räknas som sjöfart.”','”Vattnet är blött. Det har jag läst.”','”Klarälven, Vänern, eller bara en stor pöl?”','”Tryck på fåglarna. De gillar uppmärksamhet.”'];
  function draw(){
    if(!game)return;resize();const w=canvas.width,h=canvas.height,t=game.elapsed,s=game.snapshot();c.drawImage(back,0,0);
    for(const [strip,speed,y] of [[far,w*.012,h*.24],[near,w*.03,h*.215]]){const L=strip.width,o=(t*speed*(returning?-1:1)%L+L)%L;c.drawImage(strip,-o,y);c.drawImage(strip,L-o,y);}
    const live=creatures(t,w,h);for(const o of live)if(o.kind!=='boat'||true)drawCreature(o);
    popups=popups.filter(p=>t-p.at<1);for(const p of popups){c.fillStyle='#fff7d6';c.strokeStyle=INK;c.lineWidth=4;c.font=`900 ${Math.max(16,w*.03)}px system-ui`;c.textAlign='center';const y=p.y-(t-p.at)*h*.1;c.strokeText(p.text,p.x,y);c.fillText(p.text,p.x,y);}
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
    $('boatClock').textContent=Math.ceil(s.remaining)+' s';$('boatScore').textContent=s.calm?'LUGN TUR · SJÖLIV '+s.sightings+' · '+s.points+' P':s.saved+'/12 RÄDDADE · '+s.points+' XP'+(s.sightings?' · '+s.sightings+' SJÖLIV':'');$('boatProgress').style.width=(s.elapsed/s.duration*100)+'%';
    $('boatQuip').textContent=s.calm?QUIPS[Math.floor(t/5)%QUIPS.length]:s.saved>=12||s.elapsed>26?'”Alla ombord är räddade. Nu är det bara utsikt och måsar kvar.”':s.saved>=8?'”Flytvästarna har bättre koll än kaptenen.”':s.elapsed<7?'TRYCK PÅ EN PERSON · RÄTT HJÄLP KASTAS AUTOMATISKT':s.elapsed<20?'”Väjningsplikt? Jag är mer för vätskeplikt.”':'OMBORD: FLYTVÄST · I VATTNET: LIVBOJ';
  }
  function setPaused(value){if(!game)return;paused=value;targets.forEach(b=>b.hidden=value);$('boatPaused').hidden=!value;if(!value)draw();}
  function stop(){game=null;paused=false;$('boatLayer').hidden=true;document.body.classList.remove('boat-riding');host.app.autoRender=true;host.resetInput();}
  function start({calm=false,back=false,seed=1}={}){returning=back;from=back?MARIEBERG:HARBOUR;to=back?HARBOUR:MARIEBERG;game=new BoatRescue({calm:calm||back,seed});paused=false;drawTime=0;host.resetInput();document.exitPointerLock?.();host.app.autoRender=false;$('boatLayer').hidden=false;$('boatPaused').hidden=true;document.body.classList.add('boat-riding');$('boatDestination').textContent=to.name.toUpperCase();draw();}
  function update(dt){if(!game||paused)return;const before=game.elapsed;game.step(Math.min(dt,.1));onTick(game.elapsed-before);if(!game)return;drawTime+=dt;if(drawTime>=1/30){drawTime=0;draw();}if(game.state==='arrived'){const r=game.snapshot();stop();host.teleport(to.x,to.z,returning?0:90,-2);onArrive(r,to,from);}}
  targets.forEach((b,i)=>b.addEventListener('click',()=>{game?.throwTo(i);draw();}));
  // Tryck på en fågel, fisk eller båt: sjöliv ger poäng, både på lugna turen och när alla är räddade.
  canvas.addEventListener('pointerdown',e=>{
    if(!game||paused)return;const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*canvas.width,y=(e.clientY-r.top)/r.height*canvas.height;
    const hit=creatures(game.elapsed,canvas.width,canvas.height).filter(o=>Math.hypot(o.x-x,o.y-y)<o.r*1.9+14).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
    if(!hit)return;const res=game.spot(hit.key);if(res){popups.push({at:game.elapsed,x:hit.x,y:hit.y,text:(hit.kind==='gull'?'MÅS!':hit.kind==='boat'?'SEGELBÅT!':'FISK!')+' +'+res.points});onSpot?.(res,hit);draw();}
  });
  $('boatPause').addEventListener('click',()=>setPaused(true));$('boatResume').addEventListener('click',()=>setPaused(false));
  $('boatAbort').addEventListener('click',()=>{if(!game)return;const p=from;stop();host.teleport(p.x,p.z,0,-2);});
  window.addEventListener('keydown',e=>{if(!game)return;if(e.code==='Escape'){e.preventDefault();setPaused(!paused);}const i=['Digit1','Digit2','Digit3','Digit4'].indexOf(e.code);if(i>=0&&!paused){e.preventDefault();game.throwTo(i);}});
  return {start,stop,update,pause:()=>setPaused(true),active:()=>!!game,snapshot:()=>game?{...game.snapshot(),paused,destination:to.name}:null};
}
