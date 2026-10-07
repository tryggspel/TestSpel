import {QuizSession} from './bus-quiz.mjs?v=2.15.0';
export const KARLSTAD_C={x:-220,z:279,name:'Karlstad C'};
// OSM way 100310623, projected with the same Karlstad origin as the city.
export const KIL={x:-10583.24,z:-13678.36,name:'Kil station'};
export const atKil=p=>Math.hypot(p.x-KIL.x,p.z-KIL.z)<180;
export const trainWait=elapsed=>elapsed%60<18?0:Math.ceil(60-elapsed%60);

export function createScenicRide(host,{onTick,onArrive}){
  const $=id=>document.getElementById(id),canvas=$('scenicCanvas'),c=canvas.getContext('2d');let trip=null,paused=false,paint=0,quiz=null,shown='',feedback=null;
  const rect=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
  const hash=n=>{let h=2166136261;for(const ch of String(n)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;};
  const THEMES={tingvalla:'water',hamn:'water',sandgrund:'water',marieberg:'park',haga:'city',attkanten:'city',station:'city',domkyrkan:'city',torget:'city'};
  // Bussen: vägen, husen och träden rullar förbi i flera lager, med mötande trafik, och en LED-skylt i taket.
  function drawBus(w,h){
    const t=trip.elapsed,p=t/trip.duration,theme=THEMES[trip.to.id]||'city',v=210; // pixlar per sekund i närmaste lager
    const g=c.createLinearGradient(0,0,0,h*.62);g.addColorStop(0,p<.5?'#8fcbe3':'#f3c98e');g.addColorStop(1,'#f4ead0');c.fillStyle=g;c.fillRect(0,0,w,h);
    c.fillStyle='#fff4c8';c.beginPath();c.arc(w*(.2+.6*p),h*.2,w*.045,0,7);c.fill();
    c.fillStyle='#ffffffcc';for(let i=0;i<5;i++){const x=(((i*340-t*18)%1700)+1700)%1700/1700*(w+260)-130,y=h*(.1+hash('c'+i)*.14);c.beginPath();c.ellipse(x,y,70,17,0,0,7);c.ellipse(x+34,y-9,48,15,0,0,7);c.fill();}
    // Fjärran kullar
    c.fillStyle='#7fae94';c.beginPath();c.moveTo(0,h*.5);for(let x=0;x<=w;x+=20)c.lineTo(x,h*(.42+.05*Math.sin((x+t*14)*.011)+.025*Math.sin((x+t*14)*.027)));c.lineTo(w,h*.56);c.lineTo(0,h*.56);c.fill();
    // Mellanlager: hus, vatten eller skog efter målet
    const L=2200,shift=t*v*.45;
    if(theme==='water'){c.fillStyle='#4aa7bd';c.fillRect(0,h*.5,w,h*.14);c.fillStyle='#d9f3f2aa';for(let i=0;i<22;i++){const x=(((i*97-shift*1.3)%w)+w)%w;c.fillRect(x,h*(.52+(i%5)*.022),30+(i%3)*14,2);}
      for(let i=0;i<3;i++){const x=(((i*L/3-shift)%L)+L)%L-200;c.fillStyle='#b98b5f';c.fillRect(x,h*.46,120,10);c.fillStyle='#8f6844';c.fillRect(x+10,h*.46,6,34);c.fillRect(x+100,h*.46,6,34);}}
    else{for(let i=0;i<14;i++){const base=(((i*L/14-shift)%L)+L)%L-160,bw=90+hash('b'+i)*80,bh=h*(.10+hash('h'+i)*(theme==='park'?.03:.12));
        if(theme==='park'){c.fillStyle=i%2?'#3f7a58':'#4e8c63';c.beginPath();c.moveTo(base,h*.58);c.lineTo(base+bw/2,h*(.58)-bh*2.2);c.lineTo(base+bw,h*.58);c.fill();c.fillStyle='#6a4b34';c.fillRect(base+bw/2-4,h*.57,8,h*.03);}
        else{c.fillStyle=['#d9a27c','#e3cc96','#b9c7a0','#cf8f7a','#c8b7a2'][i%5];c.fillRect(base,h*.58-bh,bw,bh);c.fillStyle='#7e5648';c.beginPath();c.moveTo(base-6,h*.58-bh);c.lineTo(base+bw/2,h*.58-bh-bw*.22);c.lineTo(base+bw+6,h*.58-bh);c.fill();c.fillStyle='#fff3c0';for(let k=0;k<Math.floor(bw/28);k++)for(let r=0;r<Math.floor(bh/32);r++)c.fillRect(base+10+k*26,h*.58-bh+8+r*28,12,16);}}}
    // Gräs och trottoar
    c.fillStyle='#8cb26a';c.fillRect(0,h*.58,w,h*.05);c.fillStyle='#c9c2ad';c.fillRect(0,h*.63,w,h*.025);
    // Närlager: stolpar och träd
    const near=t*v;for(let i=0;i<8;i++){const x=(((i*w/3-near)%(w*2.7))+w*2.7)%(w*2.7)-120;c.fillStyle='#4a3a30';c.fillRect(x,h*.38,7,h*.26);c.fillStyle='#fff6c8';c.beginPath();c.arc(x+3,h*.38,9,0,7);c.fill();}
    for(let i=0;i<5;i++){const x=(((i*w*.62-near*1.25)%(w*3.1))+w*3.1)%(w*3.1)-140;c.fillStyle='#2f6b4a';c.beginPath();c.moveTo(x,h*.66);c.lineTo(x+55,h*.3);c.lineTo(x+110,h*.66);c.fill();c.fillStyle='#4b3a2c';c.fillRect(x+50,h*.64,10,h*.04);}
    // Väg
    c.fillStyle='#4f5a5e';c.fillRect(0,h*.665,w,h*.2);c.fillStyle='#e8dca8';
    for(let i=-1;i<12;i++){const x=(((i*140-near*1.6)%1680)+1680)%1680-140;c.fillRect(x,h*.76,70,6);}
    c.fillStyle='#e4e0d4';c.fillRect(0,h*.672,w,3);
    // Mötande trafik
    for(let k=0;k<3;k++){const period=trip.duration/3.1,u=((t+k*period*.8)%period)/period*1.35;if(u>1.2)continue;const x=w*(1.1-u*1.3),col=['#c24b3a','#3a6fb0','#e7b93f'][k];
      c.fillStyle=col;c.fillRect(x,h*.69,100,34);c.fillRect(x+16,h*.665,62,22);c.fillStyle='#d5ecf2';c.fillRect(x+22,h*.672,22,14);c.fillRect(x+50,h*.672,22,14);c.fillStyle='#222';c.beginPath();c.arc(x+22,h*.725,9,0,7);c.arc(x+80,h*.725,9,0,7);c.fill();}
    // Bussens inre: pelare, tak med LED-skylt och instrumentbräda
    c.fillStyle='#1e3236';c.fillRect(0,0,w,h*.25);c.fillRect(0,0,w*.045,h);c.fillRect(w*.955,0,w*.045,h);c.fillRect(0,h*.86,w,h*.14);
    c.fillStyle='#10201f';c.fillRect(w*.25,h*.155,w*.5,h*.06);c.strokeStyle='#f4b83a';c.lineWidth=2;c.strokeRect(w*.25,h*.155,w*.5,h*.06);
    c.save();c.beginPath();c.rect(w*.255,h*.16,w*.49,h*.05);c.clip();c.fillStyle='#ffb629';c.font=`900 ${Math.max(14,w*.026)}px system-ui`;c.textAlign='left';
    const msg=`LINJE ${trip.line||''} ${trip.to.name.toUpperCase()}   ►   NÄSTA: ${trip.to.name.toUpperCase()}   ►   HÅLL I DIG   ►   `;const mw=c.measureText(msg).width||600;
    for(let k=0;k<3;k++)c.fillText(msg,w*.26-((t*80)%mw)+k*mw,h*.198);c.restore();
    // Färdkarta: prickar mellan start och mål med bussen på väg
    const y=h*.235,x0=w*.12,x1=w*.88;c.strokeStyle='#ffffff55';c.lineWidth=4;c.beginPath();c.moveTo(x0,y);c.lineTo(x1,y);c.stroke();c.strokeStyle='#ffd56c';c.beginPath();c.moveTo(x0,y);c.lineTo(x0+(x1-x0)*p,y);c.stroke();
    for(const [x,col] of [[x0,'#fff'],[x1,trip.to.color||'#f59554']]){c.fillStyle=col;c.beginPath();c.arc(x,y,7,0,7);c.fill();}
    c.fillStyle='#ffd56c';c.beginPath();c.arc(x0+(x1-x0)*p,y,9,0,7);c.fill();c.strokeStyle='#10201f';c.lineWidth=3;c.stroke();
    // gungning
    c.save();c.translate(0,Math.sin(t*9)*1.3);c.restore();
  }
  function drawTrain(){
    const w=Math.min(1000,Math.round(innerWidth*1.1)),h=Math.round(w*innerHeight/innerWidth);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    rect(0,0,w,h,'#e5dac2');rect(0,h*.22,w,h*.42,'#a8d2d6');rect(0,h*.51,w,h*.13,'#769667');
    for(let i=0;i<22;i++){const x=((i*83-trip.elapsed*92)%1800+1800)%1800/1800*w;c.fillStyle=i%2?'#467763':'#64866a';c.beginPath();c.moveTo(x,h*.31);c.lineTo(x-w*.05,h*.56);c.lineTo(x+w*.05,h*.56);c.fill();rect(x-2,h*.51,4,h*.11,'#665542');}
    for(const x of [0,w*.49,w*.98]){rect(x,h*.19,w*.025,h*.48,'#263f46');rect(x+w*.025,h*.19,w*.012,h*.48,'#d2c5a6');}
    rect(0,h*.17,w,h*.055,'#f4e9cf');rect(0,h*.65,w,h*.05,'#546467');rect(0,h*.7,w,h*.3,'#717773');
    for(const x of [-w*.08,w*.70]){rect(x,h*.77,w*.36,h*.24,'#314b5f');rect(x+w*.02,h*.78,w*.32,h*.08,'#728d99');rect(x+w*.03,h*.88,w*.3,h*.07,'#f7bd20');}
    rect(w*.13,h*.65,w*.75,h*.035,'#e4c995');rect(w*.31,h*.81,w*.4,h*.12,'#e7d1a5');
    rect(w*.44,h*.69,w*.055,h*.10,'#72438f');rect(w*.435,h*.69,w*.065,h*.018,'#324b4f');
    c.fillStyle='#fff0c8';c.font=`900 ${Math.max(10,w*.009)}px system-ui`;c.textAlign='center';c.fillText('LÖFBERGS',w*.468,h*.754,w*.05);
  }
  function draw(){
    if(!trip)return;const w=Math.min(1000,Math.round(innerWidth*1.1)),h=Math.round(w*innerHeight/innerWidth);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    if(trip.kind==='bus')drawBus(w,h);else drawTrain();
    $('scenicProgress').style.width=trip.elapsed/trip.duration*100+'%';$('scenicClock').textContent=Math.ceil(trip.duration-trip.elapsed)+' S';
    renderQuiz();
  }
  const answers=[0,1,2].map(i=>$('scenicA'+i));
  function renderQuiz(){
    const box=$('scenicScreen');if(!box)return;
    if(!quiz){box.hidden=true;return;}
    box.hidden=false;const v=quiz.view(),fb=feedback&&performance.now()-feedback.at<1300?feedback:null;
    const key=v?[v.index,v.q,v.options.join('|'),fb?fb.at:0].join('~'):'done';
    if(v)$('scenicQTime').style.width=Math.max(0,Math.min(100,v.timeLeft/quiz.perQuestion*100))+'%';
    if(key===shown)return;shown=key;
    if(!v){$('scenicQHead').textContent='BUSSQUIZ KLART';$('scenicQ').textContent=quiz.correct+' av '+quiz.questions.length+' rätt · +'+quiz.score+' poäng';answers.forEach(b=>{b.hidden=true;});$('scenicQTime').style.width='0%';return;}
    $('scenicQHead').textContent='BUSSQUIZ '+(v.index+1)+'/'+v.total+(v.chaos?' · SYSTEMFEL':'');
    $('scenicQ').textContent=fb?(fb.ok?'RÄTT! +'+fb.points:fb.timeout?'För sent. Rätt: '+fb.right:'Fel. Rätt: '+fb.right):v.q;
    answers.forEach((b,i)=>{b.hidden=false;b.textContent=(i+1)+'  '+v.options[i];});
  }
  function answer(i){if(!quiz||paused||!trip)return;const r=quiz.answer(i);if(r){feedback={...r,at:performance.now()};opts_onAnswer?.(r);}renderQuiz();}
  let opts_onAnswer=null;
  answers.forEach((b,i)=>b?.addEventListener('click',()=>answer(i)));
  window.addEventListener('keydown',e=>{if(trip&&quiz&&['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();answer(Number(e.code.slice(5))-1);}});
  function stop(){trip=null;quiz=null;feedback=null;shown='';$('scenicScreen')&&($('scenicScreen').hidden=true);$('scenicLayer').hidden=true;document.body.classList.remove('boat-riding');host.app.autoRender=true;host.resetInput();}
  function pause(value=true){if(!trip)return;paused=value;$('scenicPaused').hidden=!value;}
  function start(from,to,kind='train',opts={}){
    trip={from,to,kind,elapsed:0,duration:opts.duration||(kind==='train'?20:10),line:opts.line||0};
    quiz=null;feedback=null;shown='';opts_onAnswer=opts.onAnswer||null;
    if(kind==='bus'&&opts.quiz!==false){const count=Math.max(2,Math.min(4,Math.round(trip.duration/4.2)));quiz=new QuizSession({seed:opts.seed??Math.floor(performance.now()),count,live:opts.live||null,perQuestion:(trip.duration-.8)/count});}paused=false;paint=0;host.resetInput();document.exitPointerLock?.();host.app.autoRender=false;document.body.classList.add('boat-riding');$('scenicLayer').hidden=false;$('scenicPaused').hidden=true;
    $('scenicDestination').textContent=(kind==='train'?'TÅG 70 · ':trip.line?'LINJE '+trip.line+' · ':'BUSS · ')+to.name.toUpperCase();$('scenicFrom').textContent=from.name.toUpperCase()+' → '+to.name.toUpperCase();draw();
  }
  function update(dt){if(!trip||paused)return;const d=Math.min(dt,.1);trip.elapsed=Math.min(trip.duration,trip.elapsed+d);if(quiz){const r=quiz.tick(d);if(r){feedback={...r,at:performance.now()};opts_onAnswer?.(r);}}onTick(d);if(!trip)return;paint+=dt;if(paint>1/24){paint=0;draw();}if(trip.elapsed>=trip.duration){const {to,kind}=trip,result=quiz?quiz.summary():null;stop();host.teleport(to.x,to.z,0,-2);onArrive(to,kind,result);}}
  $('scenicPause').addEventListener('click',()=>pause());$('scenicResume').addEventListener('click',()=>pause(false));$('scenicAbort').addEventListener('click',()=>{if(!trip)return;const p=trip.from;stop();host.teleport(p.x,p.z,0,-2);});
  window.addEventListener('keydown',e=>{if(trip&&e.code==='Escape'){e.preventDefault();pause(!paused);}});
  return {start,stop,update,pause,active:()=>!!trip,snapshot:()=>trip?{...trip,paused}:null};
}
