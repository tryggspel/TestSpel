import {challengeLink,CHALLENGE_RULES} from './daily-challenge.mjs?v=2.17.1';

// Draw only on a paused/result screen. Original canvas art; no network or GPU readback.
export function drawPostcard(canvas,r){
  canvas.width=720;canvas.height=900;
  const c=canvas.getContext('2d'),ink='#173d34',cream='#ffefc6',purple='#7848a6',orange='#f09b60';
  const box=(x,y,w,h,fill)=>{c.fillStyle=fill;c.fillRect(x,y,w,h);};
  const text=(str,x,y,size=24,color=ink,align='left',max=640)=>{c.fillStyle=color;c.textAlign=align;c.font=`900 ${size}px system-ui, sans-serif`;c.fillText(str,x,y,max);};
  const circle=(x,y,r,fill)=>{c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();};
  box(0,0,720,900,cream);c.strokeStyle=ink;c.lineWidth=12;c.strokeRect(16,16,688,868);
  box(32,32,656,61,ink);text('KARLSTAD CITY',51,73,33,cream);text('EFTER STÄNGNING',666,71,12,'#a8dfb5','right',175);
  const label=r.kind==='daily'?'DAGENS KARLSTAD · '+r.day:r.kind==='boat'?'BÅTBUSS · MARIEBERGSSKOGEN':r.kind==='bus'?'LINJE 666 · '+(r.place||'KARLSTAD').toUpperCase():r.kind==='mission'?'SPECIALUPPDRAG · '+r.place.toUpperCase():'STADSJAKTEN · 3 MINUTER';
  text(label,42,126,18,ink,'left',636);
  c.save();c.beginPath();c.rect(32,144,656,204);c.clip();box(32,144,656,204,'#b8dbbe');
  for(let i=0;i<14;i++){const a=i*Math.PI/7;c.beginPath();c.moveTo(567,191);c.lineTo(567+Math.cos(a)*530,191+Math.sin(a)*530);c.lineTo(567+Math.cos(a+.13)*530,191+Math.sin(a+.13)*530);c.fillStyle='#e7cc76';c.fill();}
  circle(567,191,45,'#ffd260');circle(555,184,3,ink);circle(579,184,3,ink);c.strokeStyle=ink;c.lineWidth=3;c.beginPath();c.arc(567,192,16,0,Math.PI);c.stroke();
  for(let i=0;i<8;i++){const x=25+i*89,y=245+(i%3)*13;box(x,y,79,109,i%2?'#689887':'#8cb3a0');c.strokeStyle=ink;c.lineWidth=3;c.strokeRect(x,y,79,109);for(let k=0;k<6;k++)box(x+10+(k%3)*22,y+12+Math.floor(k/3)*29,13,18,cream);}
  box(148,211,64,137,ink);box(169,175,24,41,ink);c.beginPath();c.moveTo(160,177);c.lineTo(181,144);c.lineTo(202,177);c.fillStyle=ink;c.fill();box(170,231,20,35,cream);
  if(r.kind==='bus'){
    box(253,247,333,91,ink);box(260,252,319,75,orange);
    for(let i=0;i<4;i++)box(271+i*71,263,59,30,ink);
    circle(515,278,13,'#a8cd7b');circle(511,275,3,cream);circle(519,275,3,cream);
    text('666',281,319,17,ink);circle(300,337,17,ink);circle(538,337,17,ink);circle(300,337,8,cream);circle(538,337,8,cream);
  }else{
    box(432,261,56,87,purple);box(439,248,42,16,ink);box(434,287,52,30,cream);text('KAFFE',460,307,12,purple,'center',48);
    circle(601,297,24,'#b8d883');box(578,322,46,42,purple);circle(593,290,8,cream);circle(610,294,8,cream);circle(594,292,3,ink);circle(610,296,3,ink);box(592,311,21,5,ink);
  }
  c.restore();box(32,349,656,140,ink);
  const lines=r.kind==='boat'?['KAPTENEN VAR DÖD.','JAG HADE LIVBOJAR.']:r.kind==='bus'?(r.won?['ÖVERLEVDE','ZOMBIEBUSSEN.']:['AVSTIGNING.','OPLANERAD.']):r.won?['KARLSTAD FÖRSÖKTE.','JAG KOM UNDAN.']:['KAFFET VAR GOTT.','SLUTET VAR SÄMRE.'];
  lines.forEach((line,i)=>text(line,52,408+i*53,42,i? '#ffcf6e':cream,'left',613));
  text(String(r.score),43,607,110,ink,'left',470);text(r.kind==='mission'?'POÄNG':'XP',669,603,29,purple,'right');
  const seconds=Math.round(r.seconds||0),time=Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  box(42,631,636,57,'#e8d7a9');
  text(r.kind==='boat'?`${r.saved||0} PASSAGERARE RÄDDADE`:r.kind==='bus'?`${Math.round(r.health)}% BUSS KVAR`:`${r.kills||0} ZOMBIES · ${Math.round(r.health)}% LIV`,56,668,23,ink,'left',462);text(time,659,668,25,ink,'right',124);
  text(r.title||'EN HELT VANLIG DAG I VÄRMLAND.',43,724,23,purple,'left',634);
  text('SEED '+r.seed+' · REGLER '+CHALLENGE_RULES+(r.kind==='daily'?' · SAMMA START FÖR ALLA':''),43,758,14,ink,'left',634);
  box(42,786,636,51,orange);text('UTMANA EN VÄN →',360,821,27,ink,'center',600);
  text('tryggspel.github.io/TestSpel/playcanvas-karlstad-next/',360,862,13,ink,'center',637);
  canvas.setAttribute('aria-label',`${r.title}. ${r.score} poäng. ${Math.round(r.health)} procent ${r.kind==='bus'?'buss kvar':'liv'}. Seed ${r.seed}.`);
}

export function createPostcard(canvas,linkField,saveButton){
  let current=null,file=null,revision=0;
  function show(record){
    current={...record,url:challengeLink(location.href,record)};file=null;linkField.hidden=true;saveButton.disabled=true;
    const ticket=++revision;drawPostcard(canvas,current);
    canvas.toBlob?.(blob=>{if(!blob||ticket!==revision)return;file=new File([blob],`karlstad-${current.kind}-${current.day||current.seed}.png`,{type:'image/png'});saveButton.disabled=false;},'image/png');
  }
  function exposeLink(button){linkField.hidden=false;linkField.value=current.url;linkField.select();button.textContent='KOPIERA LÄNKEN NEDAN';}
  async function share(button){
    if(!current)return;
    const data={title:'Karlstad City · '+current.title,text:`${current.won?'Jag klarade det!':'Mitt försök:'} ${current.score} poäng. ${current.title}. Slå min runda!`,url:current.url};
    try{
      if(navigator.share){
        if(file&&navigator.canShare?.({files:[file]}))await navigator.share({...data,files:[file]});else await navigator.share(data);
      }else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(current.url);button.textContent='UTMANINGSLÄNK KOPIERAD';}
      else exposeLink(button);
    }catch(e){if(e.name!=='AbortError')exposeLink(button);}
  }
  function download(){
    if(!file)return;const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  saveButton.addEventListener('click',download);
  return {show,share,record:()=>current?{...current}:null};
}
