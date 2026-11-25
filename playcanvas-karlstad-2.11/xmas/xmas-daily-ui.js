// Dagens julklappsjakt (2.21.1-xmas.17): panelen överst under jakten. Ett eget uppdrag med egen panel, så att det inte blandas ihop med tomtarnas
// tappade julklappar: gåtan, värmemätaren (iskallt → glödhett, och om det blir varmare eller kallare när man går), ledtrådarna som kommit, när nästa
// kommer och knappen LEDTRÅD NU. Tryck på panelen för att fälla ihop den. Reglerna i xmas-daily.mjs, körningen i xmas-boot.js.
import {DAILY_STEPS,WARMTH_LABELS} from './xmas-daily.mjs?v=2.21.1-xmas.17';
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
const mmss=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
export function createDailyUi({onHint=null}={}){
  const hud=el('section','xd-hud');hud.hidden=true;hud.setAttribute('aria-label','Dagens julklapp');
  const top=el('button','xd-top');top.type='button';top.setAttribute('aria-expanded','true');
  const kicker=el('span','xd-kicker','DAGENS JULKLAPP'),stepEl=el('span','xd-step','');top.append(kicker,stepEl);
  const meter=el('div','xd-meter'),segs=WARMTH_LABELS.map((_,i)=>{const s=el('i','xd-seg s'+i);meter.append(s);return s;});
  const warmRow=el('div','xd-warm'),warmLab=el('b','xd-wlab','ISKALLT'),trend=el('span','xd-trend','');warmRow.append(warmLab,trend);
  const body=el('div','xd-body'),riddle=el('p','xd-riddle',''),hints=el('ul','xd-hints');
  const foot=el('div','xd-foot'),next=el('span','xd-next',''),btn=el('button','xd-btn','LEDTRÅD NU');btn.type='button';foot.append(next,btn);
  const more=el('p','xd-more','');
  body.append(riddle,hints,more,foot);hud.append(top,meter,warmRow,body);document.body.append(hud);
  let open=true,shown=[],state=null;
  // tryck: kompakt (två senaste ledtrådarna) → alla ledtrådar → ihopfälld → kompakt
  let view=0;const setView=v=>{view=v;open=v!==2;hud.classList.toggle('all',v===1);hud.classList.toggle('closed',v===2);top.setAttribute('aria-expanded',String(open));};
  top.addEventListener('click',()=>setView((view+1)%3));hud.addEventListener('click',e=>{if(e.target===btn||top.contains(e.target))return;if(view===0)setView(1);});
  btn.addEventListener('click',ev=>{ev.stopPropagation();onHint?.();});
  function start(def){setView(0);hud.classList.remove('found');riddle.textContent='”'+def.area.riddle+'”';hints.replaceChildren();shown=[];hud.hidden=false;state=null;}
  // s: {step, texts:{2:'…',3:'…'}, warm (0–4), trend (-1 kallare, 0, 1 varmare), nextIn (s eller null)}
  function update(s){
    state=s;stepEl.textContent='LEDTRÅD '+s.step+'/5 · '+DAILY_STEPS[s.step-1].row;
    segs.forEach((g,i)=>g.classList.toggle('on',i<=s.warm));hud.dataset.warm=String(s.warm);
    warmLab.textContent=WARMTH_LABELS[s.warm];trend.textContent=s.trend>0?'▲ VARMARE':s.trend<0?'▼ KALLARE':'';trend.className='xd-trend'+(s.trend>0?' up':s.trend<0?' down':'');
    for(let k=2;k<=s.step;k++)if(!shown.includes(k)&&s.texts[k]){shown.push(k);const li=el('li','new');li.append(el('b',null,DAILY_STEPS[k-1].label+': '),document.createTextNode(s.texts[k]));hints.append(li);setTimeout(()=>li.classList.remove('new'),1600);}
    // bara de två senaste ledtrådarna syns; trycker man på panelen visas alla
    [...hints.children].forEach((li,i,a)=>li.classList.toggle('old',i<a.length-2));more.textContent=hints.children.length>2?'+'+(hints.children.length-2)+' tidigare: tryck på panelen':'';
    next.textContent=s.nextIn==null?'Alla ledtrådar är framme.':'Nästa ledtråd om '+mmss(s.nextIn);btn.hidden=s.step>=5;
  }
  function found(){hud.classList.add('found');stepEl.textContent='HITTAD!';btn.hidden=true;next.textContent='Fri julvandring igen om en stund.';}
  function stop(){hud.hidden=true;state=null;}
  return {start,update,found,stop,get open(){return !hud.hidden;},snapshot:()=>({open:!hud.hidden,collapsed:!open,step:state?.step??0,warm:state?.warm??null,hints:shown.length,riddle:riddle.textContent})};
}
