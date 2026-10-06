export const KARLSTAD_C={x:-220,z:279,name:'Karlstad C'};
// OSM way 100310623, projected with the same Karlstad origin as the city.
export const KIL={x:-10583.24,z:-13678.36,name:'Kil station'};
export const atKil=p=>Math.hypot(p.x-KIL.x,p.z-KIL.z)<180;
export const trainWait=elapsed=>elapsed%60<18?0:Math.ceil(60-elapsed%60);

export function createScenicRide(host,{onTick,onArrive}){
  const $=id=>document.getElementById(id),canvas=$('scenicCanvas'),c=canvas.getContext('2d');let trip=null,paused=false,paint=0;
  const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  function draw(){
    if(!trip)return;const w=Math.min(1000,Math.round(innerWidth*1.1)),h=Math.round(w*innerHeight/innerWidth);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    rect(0,0,w,h,'#e5dac2');rect(0,h*.22,w,h*.42,'#a8d2d6');rect(0,h*.51,w,h*.13,'#769667');
    for(let i=0;i<22;i++){const x=((i*83-trip.elapsed*92)%1800+1800)%1800/1800*w;c.fillStyle=i%2?'#467763':'#64866a';c.beginPath();c.moveTo(x,h*.31);c.lineTo(x-w*.05,h*.56);c.lineTo(x+w*.05,h*.56);c.fill();rect(x-2,h*.51,4,h*.11,'#665542');}
    for(const x of [0,w*.49,w*.98]){rect(x,h*.19,w*.025,h*.48,'#263f46');rect(x+w*.025,h*.19,w*.012,h*.48,'#d2c5a6');}
    rect(0,h*.17,w,h*.055,'#f4e9cf');rect(0,h*.65,w,h*.05,'#546467');rect(0,h*.7,w,h*.3,'#717773');
    for(const x of [-w*.08,w*.70]){rect(x,h*.77,w*.36,h*.24,'#314b5f');rect(x+w*.02,h*.78,w*.32,h*.08,'#728d99');rect(x+w*.03,h*.88,w*.3,h*.07,'#f7bd20');}
    rect(w*.13,h*.65,w*.75,h*.035,'#e4c995');rect(w*.31,h*.81,w*.4,h*.12,'#e7d1a5');
    rect(w*.44,h*.69,w*.055,h*.10,'#72438f');rect(w*.435,h*.69,w*.065,h*.018,'#324b4f');
    c.fillStyle='#fff0c8';c.font=`900 ${Math.max(10,w*.009)}px system-ui`;c.textAlign='center';c.fillText('LÖFBERGS',w*.468,h*.754,w*.05);
    $('scenicProgress').style.width=trip.elapsed/trip.duration*100+'%';$('scenicClock').textContent=Math.ceil(trip.duration-trip.elapsed)+' S';
  }
  function stop(){trip=null;$('scenicLayer').hidden=true;document.body.classList.remove('boat-riding');host.app.autoRender=true;host.resetInput();}
  function pause(value=true){if(!trip)return;paused=value;$('scenicPaused').hidden=!value;}
  function start(from,to,kind='train',opts={}){
    trip={from,to,kind,elapsed:0,duration:opts.duration||(kind==='train'?20:10),line:opts.line||0};paused=false;paint=0;host.resetInput();document.exitPointerLock?.();host.app.autoRender=false;document.body.classList.add('boat-riding');$('scenicLayer').hidden=false;$('scenicPaused').hidden=true;
    $('scenicDestination').textContent=(kind==='train'?'TÅG 70 · ':trip.line?'LINJE '+trip.line+' · ':'BUSS · ')+to.name.toUpperCase();$('scenicFrom').textContent=from.name.toUpperCase()+' → '+to.name.toUpperCase();draw();
  }
  function update(dt){if(!trip||paused)return;const d=Math.min(dt,.1);trip.elapsed=Math.min(trip.duration,trip.elapsed+d);onTick(d);if(!trip)return;paint+=dt;if(paint>1/24){paint=0;draw();}if(trip.elapsed>=trip.duration){const {to,kind}=trip;stop();host.teleport(to.x,to.z,0,-2);onArrive(to,kind);}}
  $('scenicPause').addEventListener('click',()=>pause());$('scenicResume').addEventListener('click',()=>pause(false));$('scenicAbort').addEventListener('click',()=>{if(!trip)return;const p=trip.from;stop();host.teleport(p.x,p.z,0,-2);});
  window.addEventListener('keydown',e=>{if(trip&&e.code==='Escape'){e.preventDefault();pause(!paused);}});
  return {start,stop,update,pause,active:()=>!!trip,snapshot:()=>trip?{...trip,paused}:null};
}
