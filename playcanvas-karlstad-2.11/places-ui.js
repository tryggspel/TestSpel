// 2.21: gränssnitt för uppdrag på interaktiva platser: uppdragsremsa, beställningsknappar, resultatkort och Karlstadpasset.
// Byggs med vanliga DOM-element (textContent, aldrig HTML-strängar med data) och ligger i #roundOverlay, så allt göms automatiskt
// när en panel öppnas. Små mål: remsan är en rad, knapparna är minst 52 px och spelvärlden syns ovanför.
import {drawProp,drawStamp} from './place-art.js?v=2.21.1';
import {EVENT_TYPES,LOCAL_SCOPE_NOTE} from './partner-events.mjs?v=2.21.1';
import {PASS_TEXT,visitsLabel} from './places.mjs?v=2.21.1';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const mmss=s=>{const n=Math.max(0,Math.ceil(s));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};
// Mätvärdena i den lokala verifieringsvyn, i visningsordning.
const LOCAL_METRICS=Object.freeze([['Digitala besök',EVENT_TYPES.visit],['Start',EVENT_TYPES.start],['Klara',EVENT_TYPES.complete],['Avbrutna',EVENT_TYPES.abort],['Länkklick',EVENT_TYPES.link]]);
const iconCache=new Map();
function iconFor(kind,size=72){
  const key=kind+size;if(iconCache.has(key))return iconCache.get(key);
  const c=document.createElement('canvas');c.width=c.height=size;drawProp(c.getContext('2d'),kind,size,size);
  const url=c.toDataURL('image/png');iconCache.set(key,url);return url;
}
const img=(kind,size,cls)=>{const i=el('img',cls);i.src=iconFor(kind,size);i.alt='';i.width=i.height=size/2;i.decoding='async';return i;};

export function createPlacesUi({engine,mount,pauseAnchor,fx,showLocalReport=false,openLink=url=>window.open(url,'_blank','noopener,noreferrer')}){
  // ── Remsan ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const hud=el('section','place-hud');hud.id='placeHud';hud.hidden=true;hud.setAttribute('role','group');hud.setAttribute('aria-label','Pågående uppdrag');
  const head=el('header','ph-head'),title=el('b','ph-title'),time=el('span','ph-time'),stop=el('button','ph-x','✕');
  stop.type='button';stop.setAttribute('aria-label','Avbryt uppdraget');
  head.append(title,time,stop);
  const chips=el('div','ph-chips'),hint=el('p','ph-hint'),dock=el('div','ph-dock');dock.setAttribute('role','group');dock.setAttribute('aria-label','Välj i rätt ordning');
  const retry=el('div','ph-retry'),again=el('button','ph-again','IGEN →'),leave=el('button','ph-leave','LÄMNA');again.type=leave.type='button';retry.append(again,leave);retry.hidden=true;
  hud.append(head,chips,hint,dock,retry);
  // ── Resultatkortet ──────────────────────────────────────────────────────────────────────────────────────────────
  const result=el('section','place-result');result.id='placeResult';result.hidden=true;result.setAttribute('role','dialog');result.setAttribute('aria-modal','false');result.setAttribute('aria-labelledby','placeResultTitle');
  const stampCv=el('canvas','pr-stamp');stampCv.width=stampCv.height=168;
  const body=el('div','pr-body'),kicker=el('small','pr-kicker'),h3=el('h3','pr-title');h3.id='placeResultTitle';
  const line=el('p','pr-line'),pts=el('p','pr-points'),stampLine=el('p','pr-stampline'),offer=el('div','pr-offer');
  body.append(kicker,h3,line,pts,stampLine,offer);
  const actions=el('div','pr-actions'),closeBtn=el('button','pr-close','FORTSÄTT →'),passBtn=el('button','pr-pass','KARLSTADPASSET');closeBtn.type=passBtn.type='button';actions.append(closeBtn,passBtn);
  result.append(stampCv,body,actions);
  mount.append(hud,result);

  let shownRev=-1,shownRun=null,lastSecond=-1,resultUntil=0,resultPlace=null,chipEls=[],dockEls=[];

  // ── Rendering av remsan (bara när något ändrats) ─────────────────────────────────────────────────────────────────
  function render(){
    const run=engine.run,place=run?engine.get(run.placeId):null;
    hud.hidden=!run||!place;document.body.classList.toggle('place-hud-on',!hud.hidden);
    document.body.classList.toggle('place-order-on',!hud.hidden&&run.type==='order'); // beställningsremsan är högre: replikrutan lyfts över den
    hud.dataset.type=run?.type||'';hud.dataset.phase=run?.phase||'';
    shownRev=engine.rev;shownRun=run?run.id:null;lastSecond=-1;
    if(!run||!place){chips.replaceChildren();dock.replaceChildren();chipEls=[];dockEls=[];return;}
    const a=place.activity;
    stop.hidden=run.phase==='failed';
    if(run.type==='fetch'){
      title.textContent=a.title;time.textContent=run.found+'/'+run.items.length;
      if(!chipEls.length||chipEls.length!==run.items.length||chips.dataset.run!==run.id){
        chips.replaceChildren();chipEls=run.items.map(it=>{const c=el('span','ph-chip');c.append(img(it.art,72,'ph-ico'),el('span','ph-name',it.name));chips.append(c);return c;});chips.dataset.run=run.id;
      }
      run.items.forEach((it,i)=>{chipEls[i].classList.toggle('done',it.got);chipEls[i].classList.toggle('next',!it.got&&(!run.ordered||it.index===run.next));});
      dock.replaceChildren();dockEls=[];dock.hidden=true;retry.hidden=true;
      const next=run.items.find(it=>!it.got&&(!run.ordered||it.index===run.next));
      hint.textContent=run.phase==='deliver'?'Alla funna! '+a.deliver.label+' hos '+place.staff.name.split(' ')[0]+'.':next?next.name+': '+(next.hint||'Leta runt')+'.':'';
    }else{
      const order=run.order,failed=run.phase==='failed';
      title.textContent=failed?'TIDEN GICK UT':a.title+' · '+order.who.toUpperCase();
      time.textContent=failed?'0:00':mmss(run.left);
      chips.dataset.run=run.id+':'+(failed?'f':'s');chips.replaceChildren();
      chipEls=order.items.map((id,i)=>{const m=a.menu.find(x=>x.id===id),c=el('span','ph-chip');c.append(el('span','ph-no',String(i+1)),img(m.art,72,'ph-ico'),el('span','ph-name',m.name));chips.append(c);return c;});
      chipEls.forEach((c,i)=>{c.classList.toggle('done',i<run.step);c.classList.toggle('next',!failed&&i===run.step);});
      dock.replaceChildren();dockEls=[];dock.hidden=failed;
      if(!failed)run.menu.forEach((m,i)=>{const b=el('button','ph-btn');b.type='button';b.dataset.index=String(i);b.setAttribute('aria-label',m.name+' (tangent '+(i+1)+')');b.append(img(m.art,96,'ph-btn-ico'),el('span','ph-btn-name',m.name),el('span','ph-key',String(i+1)));b.addEventListener('click',()=>pick(i));dock.append(b);dockEls.push(b);});
      retry.hidden=!failed;
      const touch=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
      hint.textContent=failed?'Prova samma beställning igen, eller lämna och fortsätt promenaden.':'Rätt sak i rätt ordning. Fel sak kostar '+run.penalty+' sekunder.'+(touch?'':' Tangent 1–'+run.menu.length+' eller klicka.');
    }
  }
  function pick(index){
    const r=engine.pickIndex(index);
    if(!r)return false;
    hud.classList.remove('shake','pop');void hud.offsetWidth;hud.classList.add(r.wrong?'shake':'pop');
    if(dockEls[index]){dockEls[index].classList.remove('wrong','right');void dockEls[index].offsetWidth;dockEls[index].classList.add(r.wrong?'wrong':'right');}
    return true;
  }
  stop.addEventListener('click',()=>engine.cancel('user'));
  leave.addEventListener('click',()=>engine.cancel('user'));
  again.addEventListener('click',()=>engine.restart());

  // ── Resultatkortet ──────────────────────────────────────────────────────────────────────────────────────────────
  function showResult(e,now){
    const first=e.first;resultPlace=e.placeId;
    kicker.textContent=(e.demo?'DEMO · ':'')+e.name.toUpperCase();
    h3.textContent=e.questType==='order'?(e.repeat?'SERVERAD IGEN!':'SERVERAD PÅ MINUTEN!'):(e.repeat?'DUKAT IGEN!':'FIKAT ÄR RÄDDAT!');
    line.textContent=e.line;
    const parts=[];
    if(e.points>0)parts.push('+'+e.points+' KAFFEPOÄNG');else parts.push('INGA NYA POÄNG JUST NU · TACK FÖR HJÄLPEN');
    if(first&&e.speed)parts.push('FARTBONUS +'+e.speed);if(first&&e.perfect)parts.push('FELFRITT +'+e.perfect);
    pts.textContent=parts.join(' · ');
    stampLine.textContent=first?'NY STÄMPEL I KARLSTADPASSET · '+e.stampCount+' AV '+e.stampTotal:'Du har redan stämpeln. Upprepade uppdrag ger bara en liten belöning.';
    stampCv.hidden=!first;
    if(first)drawStamp(stampCv.getContext('2d'),168,{name:e.name,sub:e.title.toLowerCase().replace(/^./,m=>m.toUpperCase()).slice(0,20),color:e.placeId==='pressbyran'?'#1c5aa0':'#7a2f8f'});
    offer.replaceChildren();
    if(e.offer){
      const t=el('b','po-title',e.offer.title),x=el('span','po-text',e.offer.text),a=el('a','po-link',e.offer.label||'Läs mer');
      a.href=e.offer.url;a.target='_blank';a.rel='noopener noreferrer';
      a.addEventListener('click',ev=>{ev.preventDefault();engine.events.record(EVENT_TYPES.link,e.placeId,{offer:'approved'});openLink(e.offer.url);});
      offer.append(el('small','po-kicker','ERBJUDANDE FRÅN '+e.name.toUpperCase()),t,x,a);offer.hidden=false;offer.className='pr-offer approved';
    }else{
      offer.className='pr-offer slot';offer.append(el('small','po-kicker','PLATS FÖR PARTNERERBJUDANDE · DEMO'),el('span','po-text',PASS_TEXT.offerSlot));offer.hidden=false;
    }
    result.hidden=false;result.classList.remove('in');void result.offsetWidth;result.classList.add('in');resultUntil=now+14000; // ingen fokusflytt: mellanslag ska fortfarande hoppa
  }
  function hideResult(){result.hidden=true;resultUntil=0;}
  closeBtn.addEventListener('click',hideResult);
  passBtn.addEventListener('click',()=>{hideResult();fx.openPass?.();});

  // ── Händelser från motorn ───────────────────────────────────────────────────────────────────────────────────────
  function handle(e,now){
    switch(e.type){
      case 'place-start':hideResult();fx.sound?.('start');render();break;
      case 'place-item':{
        fx.sound?.('energy');fx.note?.(660+e.index*110);fx.setPickup?.((e.name)+' · '+e.index+' AV '+e.total,now,1600,'silver');
        const pl=engine.get(e.placeId),it=pl?.activity.items?.find(i=>i.id===e.itemId);if(it)fx.burst?.(it.x,(it.floor||0)*5.4,it.z,'gold');
        render();break;}
      case 'place-order-step':fx.note?.(520+e.index*140);render();break;
      case 'place-miss':fx.sound?.('bump');fx.flash?.();render();break;
      case 'place-fail':fx.sound?.('bump');render();break;
      case 'place-cancel':
        render();hideResult();
        if(e.reason==='user')fx.setPickup?.('UPPDRAGET AVBRÖTS · '+e.name.toUpperCase(),now,1500);
        else if(e.reason==='left'||e.reason==='far')fx.setPickup?.('UPPDRAGET PAUSAT · DU GICK FRÅN '+e.name.toUpperCase(),now,1800);
        break;
      case 'place-complete':
        fx.sound?.('win');[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>fx.note?.(f,'triangle',.28,.08),i*90));
        fx.celebrate?.(e.placeId,now);render();showResult(e,now);break;
      case 'place-visit':{
        const pl=engine.get(e.placeId),done=engine.state.places[e.placeId]?.stamped;
        if(pl&&!done&&!engine.run)fx.setPickup?.('PRATA MED '+pl.staff.name.toUpperCase()+' · UPPDRAG',now,2800,'silver');
        break;}
      default:return false;
    }
    return true;
  }

  // ── Varje bildruta: bara textuppdateringar som faktiskt ändrats ─────────────────────────────────────────────────
  function sync(now,visible){
    if(!visible){if(!hud.hidden){hud.hidden=true;document.body.classList.remove('place-hud-on','place-order-on');}if(!result.hidden&&now>resultUntil)hideResult();return;}
    const run=engine.run;
    // Efter paus göms remsan; då måste den tändas igen även om uppdraget inte ändrats.
    if(engine.rev!==shownRev||(run?run.id:null)!==shownRun||(!!run&&hud.hidden)||(!run&&!hud.hidden))render();
    if(run&&run.type==='order'&&run.phase==='serve'){
      const s=Math.ceil(run.left);
      if(s!==lastSecond){lastSecond=s;time.textContent=mmss(run.left);hud.classList.toggle('urgent',run.left<=8);}
    }else hud.classList.remove('urgent');
    if(!result.hidden&&now>resultUntil)hideResult();
  }
  function handleDigit(n){const r=engine.run;if(!r||r.type!=='order'||r.phase!=='serve'||n<1||n>r.menu.length)return false;return pick(n-1);}
  function dismissResult(){if(result.hidden)return false;hideResult();return true;}

  // ── Karlstadpasset (i pausmenyn) ────────────────────────────────────────────────────────────────────────────────
  const pass=el('section','stamp-book place-pass');pass.id='placePass';pass.setAttribute('aria-labelledby','placePassTitle');
  const pTitle=el('h3',null,'');pTitle.id='placePassTitle';
  const pInfo=el('p','round-fine',PASS_TEXT.intro),pList=el('ul','pass-list'),pLocal=el('div','pass-local');pLocal.hidden=!showLocalReport;
  pass.append(pTitle,pInfo,pList,pLocal);
  if(pauseAnchor)pauseAnchor.insertAdjacentElement('afterend',pass);else mount.append(pass);
  function renderPass(){
    const rows=engine.pass(),stamped=rows.filter(r=>r.stamped).length;
    pass.hidden=!rows.length;
    pTitle.textContent=PASS_TEXT.title+' · '+stamped+' / '+rows.length;
    pList.replaceChildren();
    for(const r of rows){
      const li=el('li','pass-row'+(r.stamped?' stamped':''));
      const cv=el('canvas','pass-stamp');cv.width=cv.height=96;
      const ctx=cv.getContext('2d');
      if(r.stamped)drawStamp(ctx,96,{name:r.name,sub:'',color:r.id==='pressbyran'?'#1c5aa0':'#7a2f8f'});
      else{ctx.strokeStyle='#9bbba3';ctx.lineWidth=4;ctx.setLineDash([5,6]);ctx.beginPath();ctx.arc(48,48,40,0,7);ctx.stroke();ctx.fillStyle='#9bbba3';ctx.font='900 12px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('STÄMPEL',48,52);}
      const info=el('div','pass-info'),nm=el('b',null,r.name.toUpperCase());
      if(r.demo)nm.append(el('small','pass-tag',' '+PASS_TEXT.demoTag));
      const sub=el('span','pass-sub',(r.venue?r.venue+' · ':'')+r.title),st=el('span','pass-status',
        (r.visited?'✓ Besökt':'○ Inte besökt')+' · '+(r.completed?'✓ Uppdrag klart'+(r.completed>1?' ('+r.completed+' gånger)':''):'○ Uppdrag kvar')+' · '+visitsLabel(r.visits));
      info.append(nm,sub,st);
      if(r.offer){const a=el('a','pass-offer',r.offer.label||'Läs mer');a.href=r.offer.url;a.target='_blank';a.rel='noopener noreferrer';a.addEventListener('click',ev=>{ev.preventDefault();engine.events.record(EVENT_TYPES.link,r.id,{offer:'approved'});openLink(r.offer.url);});info.append(a);}
      else if(r.demo)info.append(el('span','pass-note',r.note));
      const go=el('button','pass-go','VISA VÄGEN');go.type='button';go.setAttribute('aria-label','Visa vägen till '+r.name);go.addEventListener('click',()=>fx.route?.(r.id));
      const btns=el('div','pass-btns',null);btns.append(go);
      if(fx.canTeleport?.()){const tp=el('button','pass-go pass-tp','GÅ DIT');tp.type='button';tp.setAttribute('aria-label','Gå direkt till '+r.name);tp.addEventListener('click',()=>fx.teleport?.(r.id));btns.append(tp);}
      li.append(cv,info,btns);pList.append(li);
    }
    renderLocal();
  }
  function renderLocal(){
    if(!showLocalReport)return;
    pLocal.replaceChildren();
    const snap=engine.events.snapshot();
    pLocal.append(el('b','pl-head','LOKAL MÄTNING · VERIFIERING'),el('p','round-fine',LOCAL_SCOPE_NOTE));
    // En ruta per plats med siffra över etikett: ryms alltid i bredd (en tabell med sex kolumner blev 20–30 px för bred på 414 px).
    const list=el('div','pl-list');
    for(const r of engine.pass()){
      const c=snap.perPlace[r.id]||{},box=el('div','pl-place'),vals=el('div','pl-vals');
      for(const [label,type] of LOCAL_METRICS){const cell=el('span','pl-cell');cell.append(el('b',null,String(c[type]||0)),el('small',null,label));vals.append(cell);}
      box.append(el('b','pl-name',r.name.toUpperCase()),vals);list.append(box);
    }
    pLocal.append(list);
    const reset=el('button','round-secondary','NOLLSTÄLL LOKAL MÄTNING');reset.type='button';reset.addEventListener('click',()=>{engine.events.reset();renderLocal();});pLocal.append(reset);
  }
  return {handle,sync,handleDigit,pick,dismissResult,renderPass,render,hud,result,pass,get resultOpen(){return !result.hidden;},get hudOpen(){return !hud.hidden;}};
}
