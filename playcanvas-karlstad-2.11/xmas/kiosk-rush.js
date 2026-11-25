// TOMTEKÖN på Pressbyrån (2.21.1-xmas.16): gränssnittet. Reglerna ligger i kiosk-rush.mjs; kopplingen till butiksuppdraget (stämpel, belöning,
// leveransen till tomten utanför) i xmas-boot.js. Ett eget lager över spelet, byggt för telefon: stora knappar, tangenterna 1–6 på dator.
import {createKioskGame,KIOSK,KIOSK_ITEMS,CUSTOMERS,starsFor,comboMult,KIOSK_KEY,blankKiosk,sanitizeKiosk,recordKiosk} from './kiosk-rush.mjs?v=2.21.1-xmas.16';
import {drawProp} from '../place-art.js?v=2.21.1-xmas.16';
import {registerXmasProps} from './xmas-place-art.js?v=2.21.1-xmas.16';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
const ICONS=new Map();
function icon(kind){
  if(ICONS.has(kind))return ICONS.get(kind);
  let url='';try{registerXmasProps();const c=document.createElement('canvas');c.width=c.height=128;if(drawProp(c.getContext('2d'),kind,128,128))url=c.toDataURL();}catch{}
  ICONS.set(kind,url);return url;
}
const NAME=Object.fromEntries(KIOSK_ITEMS.map(i=>[i.id,i.name]));
const ART=Object.fromEntries(KIOSK_ITEMS.map(i=>[i.id,i.art]));
// Tomtar som enkla bilder: ansikte, skägg, luva; specialkunderna har sina kännetecken.
const HAT={vanlig:'#c8322b',glomsk:'#3a6ea5',bratt:'#e0782a',andrar:'#a1306c',patar:'#5b7f3a',guld:'#d9a92e'};
export function tomteSvg(kind='vanlig',mood=1){
  const hat=HAT[kind]||HAT.vanlig,mouth=mood>.5?'M40 62 Q50 70 60 62':mood>.25?'M41 64 L59 64':'M40 67 Q50 59 60 67';
  const extra=kind==='glomsk'?'<text x="74" y="22" font-size="20" font-weight="900" fill="#fff">?</text>'
    :kind==='bratt'?'<path d="M80 40 q6 8 0 12 q-6-4 0-12" fill="#9fd3ff"/>'
    :kind==='andrar'?'<circle cx="41" cy="48" r="6" fill="none" stroke="#333" stroke-width="2"/><circle cx="59" cy="48" r="6" fill="none" stroke="#333" stroke-width="2"/><path d="M47 48h6" stroke="#333" stroke-width="2"/>'
    :kind==='patar'?'<rect x="72" y="58" width="12" height="14" rx="2" fill="#fff"/><path d="M84 61 q5 3 0 7" stroke="#fff" stroke-width="2" fill="none"/>'
    :kind==='guld'?'<path d="M20 14 l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1z" fill="#ffe27a"/>':'';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M22 40 Q50 -8 80 34 L86 44 Q50 34 16 44z" fill="'+hat+'"/><circle cx="84" cy="44" r="7" fill="#fff"/>'+
    '<rect x="16" y="38" width="68" height="10" rx="5" fill="#fff"/><circle cx="50" cy="54" r="20" fill="#f2c9a5"/><path d="M28 58 Q50 98 72 58 Q60 66 50 66 Q40 66 28 58" fill="#fff"/>'+
    '<circle cx="42" cy="50" r="2.6" fill="#333"/><circle cx="58" cy="50" r="2.6" fill="#333"/><circle cx="50" cy="56" r="3.4" fill="#e59a86"/><path d="'+mouth+'" stroke="#7a3b2e" stroke-width="2.4" fill="none"/>'+extra+'</svg>';
}

export const loadKiosk=storage=>{try{return sanitizeKiosk(JSON.parse(storage?.getItem(KIOSK_KEY)||'null'));}catch{return blankKiosk();}};
export const saveKiosk=(storage,st)=>{try{storage?.setItem(KIOSK_KEY,JSON.stringify(st));return true;}catch{return false;}};

export function createKioskRush({storage=null,sound=null,rand=Math.random}={}){
  const layer=el('div','kr-layer');layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
  const head=el('div','kr-head'),brand=el('div','kr-brand','PRESSBYRÅN · TOMTEKÖN'),close=el('button','kr-close','✕');close.type='button';close.setAttribute('aria-label','Stäng');
  const stats=el('div','kr-stats'),clock=el('b','kr-clock','1:15'),score=el('b','kr-score','0'),combo=el('span','kr-combo',''),lives=el('span','kr-lives','');
  stats.append(el('span','kr-lab','TID'),clock,el('span','kr-lab','POÄNG'),score,combo,lives);head.append(brand,close,stats);
  const queue=el('div','kr-queue'),counter=el('div','kr-counter');
  const who=el('div','kr-who'),bubble=el('button','kr-bubble');bubble.type='button';const bar=el('div','kr-bar'),barIn=el('i');bar.append(barIn);
  const line=el('div','kr-line','');counter.append(who,bubble,bar,line);
  const shelf=el('div','kr-shelf'),fx=el('div','kr-fx'),banner=el('div','kr-banner','');
  const card=el('section','kr-card');card.hidden=true;
  layer.append(head,queue,counter,shelf,fx,banner,card);document.body.append(layer);
  let game=null,raf=0,last=0,onFinish=null,onCancel=null,state=loadKiosk(storage),phase='idle',result=null,shelfKey='',keyHandler=null;
  const play=k=>{try{sound?.(k);}catch{}};
  function float(text,cls=''){const f=el('div','kr-float '+cls,text);fx.append(f);setTimeout(()=>f.remove(),900);}
  function flashBanner(text){banner.textContent=text;banner.classList.remove('on');void banner.offsetWidth;banner.classList.add('on');}
  function buildShelf(){
    const key=game.state.shelf.join(',');if(key===shelfKey)return;shelfKey=key;shelf.replaceChildren();
    game.state.shelf.forEach((id,i)=>{const b=el('button','kr-item');b.type='button';b.dataset.item=id;b.setAttribute('aria-label',NAME[id]+' (tangent '+(i+1)+')');
      const im=el('img');im.src=icon(ART[id]);im.alt='';b.append(im,el('span','kr-name',NAME[id]),el('span','kr-key',String(i+1)));
      b.addEventListener('pointerdown',ev=>{ev.preventDefault();tap(id,b);});shelf.append(b);});
  }
  function tap(id,btn=null){
    if(phase!=='play'||!game)return;
    const r=game.tap(id);
    if(r.wrong){btn?.classList.remove('bad');void btn?.offsetWidth;btn?.classList.add('bad');setTimeout(()=>btn?.classList.remove('bad'),450);}
    handleEvents();render();
  }
  function handleEvents(){
    for(const e of game.drain()){
      if(e.type==='item')play('item');
      else if(e.type==='wrong'){play('wrong');float('FEL VARA!','bad');counter.classList.remove('shake');void counter.offsetWidth;counter.classList.add('shake');}
      else if(e.type==='served'){play(e.rush?'rush':'served');float('+'+e.points+(e.combo>1?' · ×'+comboMult(e.combo-1).toFixed(2).replace(/\.?0+$/,''):''),e.kind==='guld'?'gold':'');
        if(e.combo===KIOSK.combo.rush)flashBanner('JULRUSH!');else if(e.kind==='guld')flashBanner('GULDTOMTEN!');}
      else if(e.type==='walkout'){play('walkout');float('TOMTEN GICK!','bad');}
      else if(e.type==='change'){play('change');flashBanner('”ÄH, NEJ, JAG TAR '+NAME[e.to]+'!”');}
      else if(e.type==='shuffle'){play('shuffle');flashBanner('HYLLAN ÄR OMFLYTTAD!');}
      else if(e.type==='arrive'&&e.kind!=='vanlig'&&game.state.queue.length===1)play('special');
      else if(e.type==='over')finish();
    }
  }
  function render(){
    if(!game)return;const g=game.state,c=game.front();
    const s=Math.ceil(g.left);clock.textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');clock.classList.toggle('urgent',g.left<15);
    score.textContent=g.score.toLocaleString('sv-SE');combo.textContent=g.combo>1?'KOMBO ×'+comboMult(g.combo).toFixed(2).replace(/\.?0+$/,''):'';combo.classList.toggle('rush',g.combo>=KIOSK.combo.rush);
    lives.textContent='🎅'.repeat(Math.max(0,g.lives))+'·'.repeat(Math.max(0,KIOSK.lives-g.lives));
    // kön: de som väntar bakom den första
    queue.replaceChildren(...g.queue.slice(1).map(q=>{const d=el('div','kr-q q-'+q.kind);d.innerHTML=tomteSvg(q.kind,q.patience/q.max);const m=el('div','kr-mini');const i=el('i');i.style.width=Math.max(0,q.patience/q.max*100)+'%';m.append(i);d.append(m);return d;}));
    if(!c){who.innerHTML='';bubble.replaceChildren(el('span','kr-wait','Väntar på nästa tomte …'));barIn.style.width='0%';line.textContent='';bubble.disabled=true;}
    else{
      who.innerHTML=tomteSvg(c.kind,c.patience/c.max);who.className='kr-who w-'+c.kind;
      const vis=game.visible(c);bubble.disabled=c.kind!=='glomsk'||vis;
      bubble.replaceChildren(...(vis?c.order.map((id,k)=>{const b=el('span','kr-want'+(c.got[k]?' got':''));const im=el('img');im.src=icon(ART[id]);im.alt=NAME[id];b.append(im);return b;})
        :[el('span','kr-wait','? ? ?  TRYCK FÖR ATT KIKA (−'+KIOSK.peekCost+' s)')]));
      const f=Math.max(0,c.patience/c.max);barIn.style.width=(f*100)+'%';bar.className='kr-bar'+(f<.3?' low':'');
      line.textContent=c.name+(CUSTOMERS[c.kind].line?' · '+CUSTOMERS[c.kind].line:'');
    }
    buildShelf();
  }
  function loop(now){
    if(phase!=='play'){raf=0;return;}
    const dt=Math.min(.1,(now-last)/1000);last=now;game.step(dt);handleEvents();render();
    raf=requestAnimationFrame(loop);
  }
  function startGame(){
    game=createKioskGame({rand});shelfKey='';phase='play';card.hidden=true;result=null;layer.classList.add('playing');
    render();last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);play('start');
  }
  function finish(){
    if(phase!=='play')return;phase='over';layer.classList.remove('playing');cancelAnimationFrame(raf);raf=0;
    const g=game.state,stars=starsFor(g.served),record=recordKiosk(state,{score:g.score,served:g.served});saveKiosk(storage,state);
    result={score:g.score,served:g.served,lost:g.lost,wrong:g.wrong,bestCombo:g.bestCombo,stars,record,reason:g.reason};
    play(stars?'win':'lose');showEnd();
  }
  function showStart(){
    phase='start';card.replaceChildren();card.hidden=false;
    card.append(el('div','kr-kicker','PRESSBYRÅN · KUNGSGATAN'),el('h2',null,'TOMTEKÖN'),
      el('p','kr-lead','Tomtarna köar för julfika! Tryck på varorna i pratbubblan: ordningen spelar ingen roll, men tålamodet rinner ut. Tre tomtar som går = stängt.'));
    const ul=el('ul','kr-rules');
    for(const [k,t] of [['glomsk','Glömske Gösta glömmer: tryck på bubblan för att kika.'],['bratt','Bråttom-Britt: halva tålamodet, dubbla poängen.'],['andrar','Tomtemor ändrar sig efter första varan.'],['patar','Påtårs-Per vill ha samma sak två gånger.'],['guld','Guldtomten ger tre gånger poängen.']]){
      const li=el('li');const f=el('span','kr-face');f.innerHTML=tomteSvg(k);li.append(f,el('span',null,t));ul.append(li);}
    card.append(ul,el('p','kr-fine','Kombo för varje tomte i rad utan fel. Hyllan flyttas om var femte tomte. '+KIOSK.seconds+' sekunder. Stjärnor: '+KIOSK.stars.join(', ')+' serverade tomtar.'+(state.best?' Ditt rekord: '+state.best.toLocaleString('sv-SE')+' poäng.':'')));
    const go=el('button','kr-go','ÖPPNA KASSAN');go.type='button';go.addEventListener('click',startGame);card.append(go);
  }
  function showEnd(){
    const r=result;card.replaceChildren();card.hidden=false;
    card.append(el('div','kr-kicker',r.reason==='stängt'?'TRE TOMTAR GICK':'PASSET ÄR SLUT'),el('h2',null,r.stars?'BRA JOBBAT!':'KASSAN STÄNGD'),
      el('div','kr-stars','★'.repeat(r.stars)+'☆'.repeat(3-r.stars)),
      el('p','kr-lead',r.served+' tomtar fick sin julfika · '+r.score.toLocaleString('sv-SE')+' poäng · bästa kombo '+r.bestCombo+(r.record?' · NYTT REKORD!':' · rekord '+state.best.toLocaleString('sv-SE'))));
    if(r.stars){
      card.append(el('p','kr-fine','Fikat är klart! Bär det till tomten som väntar utanför.'));
      const go=el('button','kr-go','BÄR FIKAT TILL TOMTEN');go.type='button';go.addEventListener('click',()=>{const f=onFinish;hide();f?.(r);});card.append(go);
    }else{
      card.append(el('p','kr-fine','Det behövs '+KIOSK.stars[0]+' serverade tomtar för första stjärnan. Kom ihåg: de bakom i kön väntar också!'));
      const again=el('button','kr-go','FÖRSÖK IGEN');again.type='button';again.addEventListener('click',startGame);card.append(again);
    }
    if(r.stars){const again=el('button','kr-ghost','Spela igen för rekordet (fikat lämnas sen)');again.type='button';again.addEventListener('click',startGame);card.append(again);}
  }
  function hide(){phase='idle';cancelAnimationFrame(raf);raf=0;layer.hidden=true;layer.classList.remove('playing');document.body.classList.remove('kiosk-on');
    if(keyHandler){window.removeEventListener('keydown',keyHandler,true);keyHandler=null;}onFinish=null;onCancel=null;}
  close.addEventListener('click',()=>{const c=onCancel,done=result&&result.stars&&phase==='over'?onFinish:null,r=result;hide();if(done)done(r);else c?.();});
  bubble.addEventListener('click',()=>{if(phase==='play'&&game.peek()){handleEvents();render();}});
  function open({onFinish:f=null,onCancel:c=null}={}){
    onFinish=f;onCancel=c;layer.hidden=false;document.body.classList.add('kiosk-on');result=null;game=null;showStart();
    keyHandler=e=>{if(layer.hidden)return;const n=Number(e.key);if(phase==='play'&&n>=1&&n<=6&&game){e.preventDefault();e.stopPropagation();tap(game.state.shelf[n-1],shelf.children[n-1]);}
      else if(e.key===' '&&phase==='play'){e.preventDefault();e.stopPropagation();if(game.peek()){handleEvents();render();}}
      else if(/^(KeyW|KeyA|KeyS|KeyD|Arrow)/.test(e.code))e.stopPropagation();};
    window.addEventListener('keydown',keyHandler,true);
  }
  return {open,close:()=>{const c=onCancel;hide();c?.();},get isOpen(){return !layer.hidden;},get phase(){return phase;},start:()=>startGame(),_game:()=>game,
    snapshot:()=>({open:!layer.hidden,phase,score:game?.state.score??0,served:game?.state.served??0,lives:game?.state.lives??0,queue:game?.state.queue.length??0,best:state.best,stars:state.stars,plays:state.plays,result})};
}
