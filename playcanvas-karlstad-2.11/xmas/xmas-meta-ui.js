// Julklappsjakten: gränssnittet för framstegen (xmas-meta.mjs). Remsan på start- och julmenyn (grad, dagens uppdrag, serie, lotter), belöningsraden på slutkortet, julgranen, lotterna och gömda julklappar.
// Allt skrivs med textContent (aldrig HTML-strängar med data). Knapparna är minst 48 px höga. Panelerna finns som tomma kort i index.html och fylls här.
import {RARITY_LABEL,PRIZE,TICKETS,TIER_LABEL,LEVELS} from './xmas-meta-config.mjs?v=2.21.1-xmas.16';
import {drawOrnament,drawTree} from './xmas-tree-art.js?v=2.21.1-xmas.16';
import {HIDDEN_SPOTS} from './xmas-hidden.mjs?v=2.21.1-xmas.16';
import {drawDateText,entryAvailable,entryOpen,validateEntry,buildPayload,submitEntry,reasonText} from './xmas-draw-client.mjs?v=2.21.1-xmas.16';
import {drawTexts} from './xmas-draw-text.mjs?v=2.21.1-xmas.16';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const fmt=n=>Number(n).toLocaleString('sv-SE');
const plural=(n,one,many)=>n===1?one:many;

function iconCanvas(o,size=30,{dim=false}={}){
  const c=el('canvas','xo-icon');c.width=c.height=size*2;c.style.width=c.style.height=size+'px';c.setAttribute('aria-hidden','true');
  try{drawOrnament(c.getContext('2d'),size,size+1,size*.58,o,{dim});}catch{}
  return c;
}

export function createMetaUi({meta,save,fx,$,mount=document.getElementById('roundOverlay')}){
  // PRIZE.enabled:false är huvudbrytaren för priset: då nämns inga lotter, ingen dragning och ingen anmälan någonstans i spelet (lotterna sparas ändå, så att de syns om priset slås på senare).
  const prizeOn=!!PRIZE.enabled;
  // ── Remsan på start- och julmenyn ────────────────────────────────────────────────────────────────────────────
  const strips=[$('xmasStripStart'),$('xmasStripContinue')].filter(Boolean);
  const newsBoxes=[$('xmasNewsStart'),$('xmasNewsContinue')].filter(Boolean);
  let news=[];
  function bar(frac,cls='xs-bar'){const b=el('i',cls),u=el('u');u.style.width=Math.round(Math.max(0,Math.min(1,frac))*100)+'%';b.append(u);return b;}
  function chip(label,value,cls=''){const c=el('span','xs-chip'+(cls?' '+cls:''));c.append(el('b',null,String(value)),el('span',null,label));return c;}
  // En kupong som går att använda syns som en egen rad överst, även före första uppdraget: den som kommer från en affisch ska hitta den direkt (och den som står vid kassan ska slippa leta).
  const SV_MONTHS=['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'];
  const svDate=v=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v||''));return m?(+m[3])+' '+SV_MONTHS[+m[2]-1]:String(v||'');};
  const validTo=c=>c.validTo?'giltig t.o.m. '+svDate(c.validTo):'';
  function couponRow(list){
    const box=el('div','xs-couponrow');
    for(const c of list){
      const b=el('button','round-secondary xs-btn xs-couponbtn','KUPONG · '+c.title+' · VISA');b.type='button';b.addEventListener('click',()=>fx.openSecrets());
      box.append(b,el('p','xs-couponsub',[c.partner,validTo(c),'visa den för personalen'].filter(Boolean).join(' · ')));
    }
    return box;
  }
  function renderStrip(){
    const s=meta.status(),show=s.introDone,live=s.coupons.filter(c=>c.status==='valid');
    for(const t of strips){
      t.hidden=!show&&!live.length;t.replaceChildren();
      if(live.length)t.append(couponRow(live));
      if(!show)continue;
      const head=el('div','xs-head'),L=s.level;
      head.append(el('b','xs-grade','GRAD '+L.n),el('span','xs-name',L.name),el('span','xs-xp',fmt(s.xp)+' XP'));
      t.append(head,bar(L.frac),el('p','xs-next',L.next?fmt(L.toNext)+' XP till grad '+L.next.n+' · '+L.next.name:'Högsta graden: Självaste tomten'));
      const list=el('ul','xs-missions');
      list.setAttribute('aria-label','Dagens uppdrag');
      list.append(el('li','xs-title','DAGENS UPPDRAG · '+s.missionsDone+'/'+s.missions.length));
      for(const m of s.missions){
        const li=el('li',m.done?'done':'');li.dataset.tier=m.tier;
        li.append(el('span','xs-mark',m.done?'✓':'○'),el('span','xs-text',m.text),el('span','xs-have',m.done?'+'+m.xp+' XP':(m.target>1?m.have+'/'+m.target:TIER_LABEL[m.tier])));
        list.append(li);
      }
      if(s.gift.opened)list.append(el('li','xs-gift','★ Dagens julklapp är öppnad'));
      else if(s.missions.length)list.append(el('li','xs-gift dim','Klara alla tre för dagens julklapp: en prydnad'+(prizeOn?' och en lott':'')));
      t.append(list);
      const chips=el('div','xs-chips');
      chips.append(chip(plural(s.streak.cur,'dag i rad','dagar i rad'),s.streak.cur,s.streak.atRisk?'risk':''));
      if(prizeOn)chips.append(chip('lotter',s.tickets));
      chips.append(chip('prydnader',s.ornaments.owned+'/'+s.ornaments.total));
      if(!prizeOn)chips.append(chip(s.hidden.enabled?'gömda julklappar':'grad',s.hidden.enabled?s.hidden.found+'/'+s.hidden.total:s.level.n));
      t.append(chips);
      const g=meta.nextGoal(undefined,{tickets:prizeOn});t.append(el('p','xs-goal','NÄSTA MÅL · '+g.text));
      // Dagens ledtråd till en gömd julklapp (den nyaste som är framme och ännu inte hittad): en anledning att komma tillbaka varje dag.
      if(s.hidden.enabled){const open=s.hidden.hints.filter(h=>h.visible&&!h.found);if(open.length)t.append(el('p','xs-clue','GÖMD JULKLAPP · "'+open[open.length-1].clue+'"'));}
      if(prizeOn&&s.advent&&!s.advent.claimed)t.append(el('p','xs-advent',s.advent.label+': klara en jakt idag och få '+s.advent.tickets+' lotter'));
      const row=el('div','xs-buttons');
      const b1=el('button','round-secondary xs-btn','JULGRANEN '+s.ornaments.owned+'/'+s.ornaments.total+(s.ornaments.fresh?' · '+s.ornaments.fresh+' NYA':''));b1.type='button';b1.addEventListener('click',()=>fx.openTree());
      row.append(b1);
      if(prizeOn){const b2=el('button','round-secondary xs-btn','VINN '+PRIZE.name.toUpperCase()+' · '+s.tickets+' '+plural(s.tickets,'LOTT','LOTTER'));b2.type='button';b2.addEventListener('click',()=>fx.openDraw());row.append(b2);}
      if(s.hidden.enabled){const b3=el('button','round-secondary xs-btn','GÖMDA JULKLAPPAR '+s.hidden.found+'/'+s.hidden.total);b3.type='button';b3.addEventListener('click',()=>fx.openSecrets());row.append(b3);}
      t.append(row);
    }
  }
  // Nyheter sedan sist (luckor som blivit klara, ett hemligt paket): en rad per sak överst på menyn. items: [{kind,text}]
  function setNews(items){
    news=Array.isArray(items)?items.filter(x=>x&&x.text):[];
    for(const b of newsBoxes){
      b.replaceChildren();b.hidden=!news.length;
      for(const n of news){const p=el('p','xn-row'+(n.kind?' '+n.kind:''),n.text);b.append(p);}
    }
  }
  // Rader för en belöning (en lista med enkla texter): används av nyhetsraderna och slutkortet.
  function describe(R){
    const out=[];
    if(!R)return out;
    for(const l of R.levelUps)out.push({kind:'level',text:'GRAD '+l.n+' · '+l.name+(prizeOn&&l.tickets?' · '+l.tickets+' '+plural(l.tickets,'lott','lotter'):'')});
    for(const o of R.ornaments)out.push({kind:'orn',text:(o.isNew?'NY PRYDNAD: ':'DUBBLETT: ')+o.name+' ('+RARITY_LABEL[o.rarity].toLowerCase()+')',orn:o});
    if(prizeOn)for(const t of R.tickets)out.push({kind:'ticket',text:'NY LOTT: '+t.code});
    for(const c of R.coupons||[])out.push({kind:'coupon',text:'NY KUPONG: '+c.title});
    return out;
  }

  // ── Belöningsraden på slutkortet ──────────────────────────────────────────────────────────────────────────────
  const reward=el('div','xmas-reward');reward.id='xmasReward';reward.hidden=true;reward.setAttribute('role','status');
  // info = {R, cal, status, goal} eller null (raden tas bort). parent/before = var på kortet raden ska ligga.
  function placeReward(info,parent=null,before=null){
    if(!info||!info.R||!parent){reward.hidden=true;if(reward.parentNode)reward.remove();return;}
    const {R,cal,status:s,goal}=info,L=s.level;
    const xp=R.xp+(cal?cal.xp:0);
    reward.replaceChildren();
    // En förlorad nivå ger ingenting: då visas bara nästa mål, inte en tom rad med +0 XP.
    if(!R.notable&&xp===0&&!(cal&&cal.notable)){
      if(goal)reward.append(el('p','xrw-goal','NÄSTA MÅL · '+goal.text));
      reward.hidden=!goal;
      if(!goal)return;
      if(before&&before.parentNode===parent)parent.insertBefore(reward,before);else parent.append(reward);
      return;
    }
    const top=el('div','xrw-top');
    top.append(el('b','xrw-xp',(xp>0?'+'+fmt(xp):'+0')+' XP'),el('span','xrw-grade','GRAD '+L.n+' · '+L.name));
    reward.append(top,bar(L.frac,'xrw-bar'),el('p','xrw-sub',L.next?fmt(L.toNext)+' XP till grad '+L.next.n+' · '+L.next.name:'Högsta graden!'));
    const chips=el('div','xrw-chips');
    const add=(R2,label)=>{
      for(const o of R2.ornaments){const c=el('div','xrw-chip orn'+(o.isNew?' new':'')+' r-'+o.rarity);c.append(iconCanvas(o,30));const t=el('span','xrw-t');t.append(el('b',null,o.name),el('em',null,(o.isNew?'NY · ':'DUBBLETT · ')+RARITY_LABEL[o.rarity]+(o.label?' · '+o.label:'')));c.append(t);chips.append(c);}
      if(prizeOn)for(const t of R2.tickets){const c=el('div','xrw-chip ticket');const tt=el('span','xrw-t');tt.append(el('b',null,t.code),el('em',null,'LOTT · '+({welcome:'FÖRSTA UPPDRAGET',meter:'60 JULKLAPPAR',gift:'DAGENS JULKLAPP',grade:'NY GRAD',streak:'SERIE',calendar:'JULKALENDERN',advent:'ADVENT',hidden:'GÖMDA JULKLAPPAR',code:'HEMLIGT PAKET'}[t.src]||'')));c.append(el('span','xo-ticket','🎟'),tt);chips.append(c);}
    };
    add(R);if(cal)add(cal);
    if(chips.childElementCount)reward.append(chips);
    const rows=el('ul','xrw-list');
    for(const l of R.levelUps)rows.append(el('li','level','GRAD '+l.n+' · '+l.name+'!'+(prizeOn&&l.tickets?' Du får '+l.tickets+' '+plural(l.tickets,'lott','lotter')+'.':'')+(l.orn?' Du får en prydnad.':'')));
    for(const m of R.missions)rows.append(el('li','mission','UPPDRAG KLART · '+m.text+' · +'+m.xp+' XP'));
    if(R.gift)rows.append(el('li','gift','DAGENS JULKLAPP: alla tre uppdrag klara. Du får en prydnad'+(prizeOn?' och en lott.':'.')));
    if(R.streak){
      const st=R.streak,txt=st.status==='reset'?'SERIEN BÖRJADE OM · 1 DAG':st.status==='start'?'SERIE · 1 DAG. Spela i morgon igen så växer den.':'SERIE · '+st.cur+' '+plural(st.cur,'DAG','DAGAR')+' I RAD'+(st.status==='froze'?' (en frysdag räddade serien)':'')+(st.freezeEarned?' · du fick en frysdag':'');
      rows.append(el('li','streak',txt));
    }
    if(prizeOn&&R.advent)rows.append(el('li','advent',R.advent.label+' · '+R.advent.tickets+' lotter'));
    if(cal)for(const c of cal.calendar)rows.append(el('li','door','LUCKA '+c.n+' I JULKALENDERN GAV DIG EN BELÖNING'));
    if(prizeOn&&R.meter&&R.meter.added>0){
      const m=R.meter;rows.append(el('li','meter',m.capped?'DAGENS LOTTER FRÅN MÄTAREN ÄR SLUT · mätaren väntar full till i morgon':'LOTT-MÄTARE · '+m.have+'/'+m.target+' julklappar'));
    }
    if(rows.childElementCount)reward.append(rows);
    if(goal)reward.append(el('p','xrw-goal','NÄSTA MÅL · '+goal.text));
    reward.hidden=false;
    if(before&&before.parentNode===parent)parent.insertBefore(reward,before);else parent.append(reward);
  }

  // ── Julgranen ────────────────────────────────────────────────────────────────────────────────────────────────
  function renderTree(){
    const list=meta.ornamentList(),owned=list.filter(o=>o.owned).length;
    $('xmasTreeCount').textContent=owned+' / '+list.length;
    const cv=$('xmasTreeCanvas'),ctx=cv.getContext('2d');
    try{drawTree(ctx,cv.width,cv.height,list);}catch(e){console.error('[Julgranen]',e);}
    const fresh=list.filter(o=>o.isNew).length;
    $('xmasTreeLine').textContent=owned===list.length?'Hela granen är full! Tomtens stjärna sitter överst.':'Varje klarad jakt ger en prydnad. Dagens uppdrag, serien, graderna och de gömda julklapparna ger fler'+(fresh?'. '+fresh+' nya sedan sist.':'.');
    const ul=$('xmasTreeList');ul.replaceChildren();
    for(const o of list){
      const li=el('li',(o.owned?'have':'miss')+' r-'+o.rarity+(o.isNew?' new':''));
      li.append(iconCanvas(o,28,{dim:!o.owned}),el('span','xo-name',o.owned?o.name:'???'),el('span','xo-rarity',RARITY_LABEL[o.rarity]),el('span','xo-count',o.owned?(o.count>1?'×'+o.count:(o.isNew?'NY':'✓')):''));
      ul.append(li);
    }
    meta.markSeen();
  }

  // ── Lotter ───────────────────────────────────────────────────────────────────────────────────────────────────
  function renderDraw(){
    const s=meta.status(),codes=meta.ticketCodes(),sent=new Set(meta.state.draw.sent);
    $('xmasDrawTitle').textContent=PRIZE.name.toUpperCase()+'.';
    $('xmasDrawLine').textContent=(PRIZE.sponsor?'Presenteras av '+PRIZE.sponsor+'. ':'')+'Varje lott är en chans. '+drawDateText(PRIZE);
    $('xmasDrawCount').textContent=String(codes.length);
    $('xmasDrawCountLabel').textContent=plural(codes.length,'LOTT','LOTTER');
    const m=$('xmasDrawMeter');m.replaceChildren(bar(s.meter.have/s.meter.target,'xs-bar'),el('p','xs-next',s.meter.capped?'Dagens lotter från mätaren är slut. Mätaren väntar full till i morgon.':s.meter.left+' '+plural(s.meter.left,'julklapp','julklappar')+' till nästa lott (högst '+TICKETS.dailyCap+' om dagen så här)'));
    const ul=$('xmasDrawTickets');ul.replaceChildren();
    if(!codes.length)ul.append(el('li','empty','Du har inga lotter än. Klara ditt första uppdrag så får du en.'));
    for(const c of codes.slice().reverse())ul.append(el('li',sent.has(c)?'sent':'',c+(sent.has(c)?'  ✓ inskickad':'')));
    $('xmasDrawHow').textContent='Lotter får du av: första uppdraget, var 60:e julklapp, dagens tre uppdrag, serier, nya grader, adventssöndagarna och var femte gömd julklapp.';
    renderDrawForm();
  }
  // Anmälan: bara när arrangören fyllt i uppgifterna (PRIZE.ready), läget är api och tiden inte gått ut. Annars sparas lotterna på enheten och räknas med när anmälan öppnar.
  function renderDrawForm(){
    const form=$('xmasDrawForm'),soon=$('xmasDrawSoon'),ok=entryAvailable();
    if(!form||!soon)return;
    form.hidden=!ok;soon.hidden=ok;
    if(!ok){soon.textContent=!PRIZE.enabled?'':!PRIZE.ready?'Anmälan öppnar snart. Dina lotter sparas på din enhet och räknas med när anmälan öppnar.':entryOpen()?'Anmälan är inte tillgänglig just nu.':'Anmälan är stängd.';return;}
    const n=meta.unsentTickets().length,send=$('xmasDrawSend');
    send.firstChild.textContent='SKICKA IN '+n+' '+plural(n,'LOTT','LOTTER')+' ';send.disabled=!n;
    const t=drawTexts(PRIZE);
    for(const [id,list] of [['xmasDrawRules',t.rules],['xmasDrawPrivacy',t.privacy]]){const box=$(id);box.replaceChildren();for(const para of list)box.append(el('p','round-fine',para));}
  }
  const sendBtn=$('xmasDrawSend');
  if(sendBtn)sendBtn.addEventListener('click',async()=>{
    const status=$('xmasDrawStatus'),v=validateEntry({name:$('xmasDrawName').value,contact:$('xmasDrawContact').value,guardian:$('xmasDrawGuardian').checked,consent:$('xmasDrawConsent').checked,tickets:meta.unsentTickets()});
    if(!v.ok){status.textContent=Object.values(v.errors)[0];return;}
    sendBtn.disabled=true;status.textContent='Skickar …';
    const r=await submitEntry((...a)=>fetch(...a),buildPayload(v,{grade:meta.level.n,days:Object.keys(meta.state.days).length,streak:meta.state.streak.best}));
    if(r.ok){meta.markSent(v.tickets);status.textContent='Tack! Anmälan är mottagen: '+v.tickets.length+' '+plural(v.tickets.length,'lott','lotter')+' skickades in'+(r.total?' (du har '+r.total+' hos oss).':'.')+' Nya lotter du får senare kan du skicka in med samma kontaktuppgift.';renderDraw();}
    else{status.textContent=reasonText(r.reason);sendBtn.disabled=false;}
  });

  // ── Gömda julklappar, hemliga paket och kuponger ────────────────────────────────────────────────────────────
  function renderSecrets(){
    const s=meta.status(),h=s.hidden;
    $('xmasSecretsCount').textContent=h.found+' / '+h.total;
    $('xmasSecretsLine').textContent='Tjugo gömda julklappar ligger på platser runt om i Karlstad. Gå runt i FRI JULVANDRING: de syns som guldpaket med en ljusstråle på nära håll, och raden "varmt" säger till när du är nära. Du hittar dem i vilken ordning du vill. En ny ledtråd släpps varje dag.';
    const ul=$('xmasSecretsList');ul.replaceChildren();
    for(const t of h.hints){
      const li=el('li',t.found?'found':t.visible?'':'locked');
      li.append(el('span','xs-mark',t.found?'✓':t.visible?'○':'🔒'),el('span','xs-text',t.found?t.name:t.visible?t.clue:'Ny ledtråd kommer i morgon'));
      ul.append(li);
    }
    const cs=$('xmasCoupons');cs.replaceChildren();cs.hidden=!s.coupons.length;
    for(const c of s.coupons){
      const box=el('div','xs-coupon '+c.status);
      box.append(el('b',null,c.title),el('span',null,[c.partner,validTo(c)].filter(Boolean).join(' · ')),el('p','round-fine',c.text));
      if(c.terms)box.append(el('p','round-fine',c.terms));
      if(c.status==='valid'){
        const pin=el('input','xs-pin');pin.type='password';pin.inputMode='numeric';pin.autocomplete='off';pin.placeholder='PIN FRÅN PERSONALEN';pin.setAttribute('aria-label','PIN från personalen');pin.maxLength=8;
        const go=el('button','round-secondary','PERSONAL: LÖS IN');go.type='button';
        const msg=el('p','round-fine');
        go.addEventListener('click',()=>{const r=meta.redeemCoupon(c.id,pin.value);msg.textContent=r.ok?'Inlöst. Tack!':({pin:'Fel PIN.',anvand:'Kupongen är redan använd.',utgangen:'Kupongen har gått ut.',okand:'Kupongen finns inte.'}[r.reason]||'Gick inte.');if(r.ok)renderSecrets();});
        box.append(pin,go,msg);
      }else box.append(el('p','round-fine',c.status==='used'?'INLÖST':'UTGÅNGEN'));
      cs.append(box);
    }
  }
  const CODE_MSG={tom:'Skriv eller klistra in koden från affischen.',okand:'Koden känns inte igen. Kontrollera att du skrivit rätt.',anvand:'Det här paketet har du redan hämtat.'};
  function codeStatus(r){
    const box=$('xmasCodeStatus');if(!box)return;
    if(!r){box.textContent='';return;}
    if(r.ok){const t=describe(r.reward).map(x=>x.text);box.textContent='HEMLIGT PAKET! '+(r.label?r.label+'. ':'')+'+'+r.reward.xp+' XP'+(t.length?' · '+t.join(' · '):'');}
    else box.textContent=CODE_MSG[r.reason]||'Gick inte.';
  }
  const codeGo=$('xmasCodeGo');
  if(codeGo)codeGo.addEventListener('click',()=>{const r=meta.redeemCode($('xmasCodeInput').value);codeStatus(r);if(r.ok){$('xmasCodeInput').value='';fx.codeRedeemed?.(r);renderSecrets();}});

  return {renderStrip,setNews,describe,placeReward,renderTree,renderDraw,renderSecrets,codeStatus,iconCanvas,LEVELS};
}
