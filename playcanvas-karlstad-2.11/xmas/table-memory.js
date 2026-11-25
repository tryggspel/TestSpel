// DUKA JULBORDET på Cervera (2.21.1-xmas.16): gränssnittet. Reglerna i table-memory.mjs; kopplingen (efter porslinsjakten) i xmas-boot.js.
import {createTableGame,TABLE,TABLE_ITEMS,TABLE_KEY,blankTable,sanitizeTable,recordTable} from './table-memory.mjs?v=2.21.1-xmas.16';
import {drawProp} from '../place-art.js?v=2.21.1-xmas.16';
import {registerXmasProps} from './xmas-place-art.js?v=2.21.1-xmas.16';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
const ICONS=new Map();
function icon(kind){if(ICONS.has(kind))return ICONS.get(kind);let url='';try{registerXmasProps();const c=document.createElement('canvas');c.width=c.height=128;if(drawProp(c.getContext('2d'),kind,128,128))url=c.toDataURL();}catch{}ICONS.set(kind,url);return url;}
const ART=Object.fromEntries(TABLE_ITEMS.map(i=>[i.id,i.art])),NAME=Object.fromEntries(TABLE_ITEMS.map(i=>[i.id,i.name]));
const load=s=>{try{return sanitizeTable(JSON.parse(s?.getItem(TABLE_KEY)||'null'));}catch{return blankTable();}};
const store=(s,st)=>{try{s?.setItem(TABLE_KEY,JSON.stringify(st));}catch{}};

export function createTableMemory({storage=null,sound=null,rand=Math.random}={}){
  const layer=el('div','tm-layer');layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
  const head=el('div','tm-head'),brand=el('div','tm-brand','CERVERA · DUKA JULBORDET'),close=el('button','kr-close','✕');close.type='button';close.setAttribute('aria-label','Stäng');
  const stats=el('div','tm-stats'),roundEl=el('b','tm-round','BORD 1/3'),clock=el('b','tm-clock',''),score=el('b','tm-score','0');stats.append(roundEl,el('span','kr-lab','TID'),clock,el('span','kr-lab','POÄNG'),score);head.append(brand,close,stats);
  const say=el('div','tm-say','');const table=el('div','tm-table');const spots=[];
  for(let i=0;i<TABLE.spots;i++){const b=el('button','tm-spot');b.type='button';b.dataset.spot=String(i);b.addEventListener('pointerdown',ev=>{ev.preventDefault();onSpot(i);});spots.push(b);table.append(b);}
  const showBar=el('div','tm-showbar'),showIn=el('i');showBar.append(showIn);
  const tray=el('div','tm-tray'),card=el('section','kr-card');card.hidden=true;
  layer.append(head,say,showBar,table,tray,card);document.body.append(layer);
  let game=null,raf=0,last=0,onDone=null,state=load(storage),phase='idle',result=null,trayKey='';
  const play=k=>{try{sound?.(k);}catch{}};
  function onSpot(i){if(!game||game.state.phase!=='play')return;const r=game.place(i);if(r.wrong){spots[i].classList.remove('bad');void spots[i].offsetWidth;spots[i].classList.add('bad');setTimeout(()=>spots[i].classList.remove('bad'),450);}events();render();}
  function events(){for(const e of game.drain()){
    if(e.type==='show'){play('show');say.textContent='Rut: ”Kolla noga hur jag dukar bord '+e.round+'!”';}
    else if(e.type==='play'){play('go');say.textContent='DUKA! Tryck på en sak i brickan och sedan på dess plats.';}
    else if(e.type==='right')play('right');else if(e.type==='wrong'){play('wrong');say.textContent='Nej, den stod inte där. Försök igen!';}
    else if(e.type==='round'){play(e.star?'star':e.done?'right':'wrong');showBetween(e);}
    else if(e.type==='over')finish();
  }}
  function render(){
    if(!game)return;const g=game.state,R=TABLE.rounds[Math.min(g.round,TABLE.rounds.length-1)];
    roundEl.textContent='BORD '+Math.min(g.phase==='between'||g.phase==='over'?g.round:g.round+1,TABLE.rounds.length)+'/'+TABLE.rounds.length;clock.textContent=g.phase==='play'?Math.ceil(g.left)+' s':'';clock.classList.toggle('urgent',g.phase==='play'&&g.left<8);
    score.textContent=g.score.toLocaleString('sv-SE');
    showBar.hidden=g.phase!=='show';showIn.style.width=(Math.max(0,g.show/R.show)*100)+'%';
    spots.forEach((b,i)=>{const show=g.phase==='show'?g.layout[i]:g.placed[i];b.classList.toggle('filled',!!show);b.classList.toggle('locked',g.phase==='play'&&!!g.placed[i]);
      b.classList.toggle('target',g.phase==='play'&&!!g.selected&&!g.placed[i]);
      const want=show?icon(ART[show]):'';if(b.dataset.icon!==want){b.dataset.icon=want;b.replaceChildren();if(want){const im=el('img');im.src=want;im.alt=NAME[show];b.append(im);}}});
    const key=g.phase+'|'+g.tray.join(',')+'|'+g.selected;
    if(key!==trayKey){trayKey=key;tray.replaceChildren(...(g.phase==='play'?g.tray:[]).map(id=>{const b=el('button','tm-item'+(g.selected===id?' sel':''));b.type='button';b.dataset.item=id;const im=el('img');im.src=icon(ART[id]);im.alt='';b.append(im,el('span',null,NAME[id]));
      b.addEventListener('pointerdown',ev=>{ev.preventDefault();game.select(id);play('pick');render();});return b;}));}
  }
  function loop(now){if(phase!=='play'){raf=0;return;}const dt=Math.min(.1,(now-last)/1000);last=now;game.step(dt);events();render();raf=requestAnimationFrame(loop);}
  function run(){phase='play';card.hidden=true;game.start();events();render();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
  function showBetween(e){
    if(game.state.over)return;phase='between';cancelAnimationFrame(raf);raf=0;card.replaceChildren();card.hidden=false;
    card.append(el('div','kr-kicker','BORD '+e.round+' AV '+TABLE.rounds.length),el('h2',null,e.star?'SNYGGT DUKAT!':e.done?'DUKAT, MEN …':'TIDEN TOG SLUT'),
      el('div','kr-stars',e.star?'★':'☆'),el('p','kr-lead',e.done?(e.wrong?e.wrong+' fel på vägen.':'Inga fel alls!'):'Bordet hann inte bli klart.'),
      el('p','kr-fine','Nästa bord: '+TABLE.rounds[e.round].items+' saker och kortare tid att titta'+(TABLE.rounds[e.round].decoys?', och lockbeten i brickan':'')+'.'));
    const go=el('button','kr-go','NÄSTA BORD');go.type='button';go.addEventListener('click',run);card.append(go);
  }
  function finish(){
    phase='over';cancelAnimationFrame(raf);raf=0;const g=game.state,record=recordTable(state,{score:g.score,stars:g.stars});store(storage,state);
    result={score:g.score,stars:g.stars,wrong:g.wrong,record};play(g.stars?'win':'lose');
    card.replaceChildren();card.hidden=false;
    card.append(el('div','kr-kicker','JULBORDET ÄR DUKAT'),el('h2',null,g.stars===3?'PERFEKT!':g.stars?'BRA JOBBAT!':'NÄSTA GÅNG!'),el('div','kr-stars','★'.repeat(g.stars)+'☆'.repeat(3-g.stars)),
      el('p','kr-lead',g.score.toLocaleString('sv-SE')+' poäng · '+g.wrong+' fel'+(record?' · NYTT REKORD!':' · rekord '+state.best.toLocaleString('sv-SE'))),
      el('p','kr-fine','En stjärna per bord som dukas klart i tid med högst ett fel.'));
    const done=el('button','kr-go','KLART');done.type='button';done.addEventListener('click',()=>{const f=onDone,r=result;hide();f?.(r);});card.append(done);
    const again=el('button','kr-ghost','Duka en gång till');again.type='button';again.addEventListener('click',()=>{game=createTableGame({rand});trayKey='';run();});card.append(again);
  }
  function hide(){phase='idle';cancelAnimationFrame(raf);raf=0;layer.hidden=true;document.body.classList.remove('kiosk-on');}
  close.addEventListener('click',()=>{const f=onDone,r=result||{score:game?.state.score||0,stars:0,wrong:game?.state.wrong||0,record:false,closed:true};hide();f?.(r);});
  function open({onDone:f=null}={}){
    onDone=f;result=null;game=createTableGame({rand});trayKey='';layer.hidden=false;document.body.classList.add('kiosk-on');phase='start';
    say.textContent='Rut: ”Porslinet är på plats. Nu dukar vi julbordet!”';render();card.replaceChildren();card.hidden=false;
    card.append(el('div','kr-kicker','CERVERA · MITT I CITY'),el('h2',null,'DUKA JULBORDET'),
      el('p','kr-lead','Rut dukar bordet en kort stund. Sedan plockar hon undan, och du dukar ur minnet: tryck på en sak i brickan och sedan på platsen där den stod.'),
      el('p','kr-fine','Tre bord: 3, 5 och 7 saker. Fel plats kostar poäng. En stjärna per bord som blir klart i tid med högst ett fel.'+(state.best?' Ditt rekord: '+state.best.toLocaleString('sv-SE')+' poäng.':'')));
    const go=el('button','kr-go','BÖRJA DUKA');go.type='button';go.addEventListener('click',run);card.append(go);
  }
  return {open,close:()=>hide(),get isOpen(){return !layer.hidden;},_game:()=>game,next:()=>run(),
    snapshot:()=>({open:!layer.hidden,phase,round:game?.state.round??0,gamePhase:game?.state.phase??null,score:game?.state.score??0,stars:game?.state.stars??0,best:state.best,result})};
}
