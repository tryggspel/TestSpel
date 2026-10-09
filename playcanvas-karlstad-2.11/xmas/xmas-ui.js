// Julklappsjakten: gränssnittet. Startvyn, fortsättningsmenyn och resultatkortet är vanliga paneler i index.html; HUD:en och pausmenyns
// tillägg byggs här med textContent (aldrig HTML-strängar med data). Små mål: knappar är minst 52 px höga och spelvärlden syns ovanför.
// JulRushen använder samma HUD: tempo och klockan i raden överst (stapeln är tiden till nästa paket), liv som hjärtan, poäng, kombo och gåvorna som små brickor.
import {STAMPS,WEATHER,WEATHER_ORDER,titleFor,TITLES} from './xmas-config.mjs?v=2.21.1-xmas.4';
import {drawXmasStamp} from './xmas-art.js?v=2.21.1-xmas.4';
import {nextRound} from './xmas-rounds.mjs?v=2.21.1-xmas.4';
import {RUSH} from './xmas-rush.mjs?v=2.21.1-xmas.4';
import {RUSHES,rushDef,goalText,nextRush,isUnlocked,totalStars,starText,RUSH_COUNT,RUSH_MAX} from './xmas-rushes.mjs?v=2.21.1-xmas.4';
import {leaderboard,encodeChallenge,challengeUrl,shareText,cleanName,NAME_MAX} from './xmas-board.mjs?v=2.21.1-xmas.4';
import {zombieLevel,nextZombieLevel} from './xmas-zombie-levels.mjs?v=2.21.1-xmas.4';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
export const mmss=s=>{const n=Math.max(0,Math.round(s));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};

export function createXmasUi({save,mount=document.getElementById('roundOverlay'),pauseCard=document.getElementById('round-pause'),fx,shareBase=()=>location.origin+location.pathname}){
  const $=id=>document.getElementById(id);
  // ── HUD: mål, framsteg, poäng och kombo ───────────────────────────────────────────────────────────────────────
  const hud=el('div');hud.id='xmasHud';hud.hidden=true;hud.setAttribute('role','status');
  const goal=el('div','xh-goal');goal.id='xmasGoal';
  const row=el('div','xh-row'),count=el('b','xh-count','0/20'),label=el('span','xh-label','PAKET'),bar=el('i','xh-bar'),fill=el('u');bar.append(fill);row.append(label,count,bar);
  const pts=el('div','xh-points');const ptsVal=el('b',null,'0'),ptsLabel=el('span',null,'JULPOÄNG'),timeEl=el('em','xh-time','');timeEl.hidden=true;pts.append(ptsLabel,ptsVal);row.append(timeEl);
  const hearts=el('em','xh-hearts','♥♥♥');hearts.hidden=true;hearts.setAttribute('aria-label','Liv');row.append(hearts);
  // Målraden i en rush: vad som ska klaras och hur långt man kommit
  const goalRow=el('div','xh-goal'),goalLabel=el('span',null,''),goalCount=el('b',null,''),goalBar=el('i'),goalFill=el('u');goalBar.append(goalFill);goalRow.append(goalLabel,goalCount,goalBar);goalRow.hidden=true;
  const powers=el('div','xh-powers');powers.hidden=true;
  const combo=el('div','xh-combo');combo.hidden=true;const comboChain=el('b',null,'KOMBO 2'),comboMult=el('span',null,'×2'),comboBar=el('i','xh-combo-bar'),comboFill=el('u');comboBar.append(comboFill);combo.append(comboChain,comboMult,comboBar);
  const pill=el('div','xh-pill');pill.id='xmasPill';
  // Liv och solenergi (bara i Tomtezombies)
  const vit=el('div','xh-vitals');vit.hidden=true;const hp=el('i','xh-hp'),hpFill=el('u'),sun=el('i','xh-sun'),sunFill=el('u');hp.append(hpFill);sun.append(sunFill);vit.append(el('span',null,'LIV'),hp,el('span',null,'SOL'),sun);
  let vitHp=-1,vitSun=-1;
  hud.append(row,pts,goalRow,combo,vit,powers);
  mount.append(goal,hud,pill);
  let goalUntil=0,pillUntil=0,state={goal:0,total:0,kind:'',phase:''};

  function showGoal(text,ms=6500,now=performance.now()){goal.textContent=text;goal.classList.add('on');goalUntil=now+ms;}
  function showPill(text,ms=1100,now=performance.now(),tone=''){pill.textContent=text;pill.dataset.tone=tone;pill.classList.remove('on');void pill.offsetWidth;pill.classList.add('on');pillUntil=now+ms;}
  function setProgress(run){
    if(!run)return;
    const g=run.goal||0;
    state={goal:g,total:run.regularTotal,kind:run.kind,phase:run.phase};
    if(run.kind==='free'){label.textContent='PAKET';count.textContent=String(run.collected);fill.style.width='0%';}
    else if(run.kind==='delivery'){label.textContent='LEVERERA';count.textContent='☕';fill.style.width='100%';}
    else if(run.phase==='deliver'||run.phase==='done'){label.textContent='LÄMNA';count.textContent=run.collected+'/'+g;fill.style.width='100%';}
    else{label.textContent='PAKET';count.textContent=run.collected+'/'+g;fill.style.width=Math.min(100,Math.round(run.collected/Math.max(1,g)*100))+'%';}
    ptsVal.textContent=run.points.toLocaleString('sv-SE');
    hud.dataset.phase=run.phase;
  }
  function setCombo(run){
    const on=!!run&&run.chain>=2&&run.phase!=='done';
    if(combo.hidden===on)combo.hidden=!on;
    if(!on)return;
    const m=run.chain>=12?4:run.chain>=8?3:run.chain>=4?2:1;
    comboChain.textContent='KOMBO '+run.chain;comboMult.textContent=m>1?'×'+m:'';combo.dataset.tier=String(m);
    comboFill.style.width=Math.max(0,Math.min(100,Math.round((1-(run.t-run.lastPickAt)/run.windowSec)*100)))+'%';
  }
  function setTime(run){
    const on=!!run&&run.kind==='round'&&run.soft>0&&run.phase!=='done';
    if(timeEl.hidden===on)timeEl.hidden=!on;
    if(!on)return;
    const late=run.t>=run.soft,text=late?'SEN':mmss(run.soft-run.t);
    if(timeEl.textContent!==text){timeEl.textContent=text;timeEl.classList.toggle('late',late);}
  }
  function tick(run,now){
    if(goal.classList.contains('on')&&now>goalUntil)goal.classList.remove('on');
    if(pill.classList.contains('on')&&now>pillUntil)pill.classList.remove('on');
    setCombo(run);setTime(run);
  }
  // Tomtezombies: nivån står framför poängen i HUD:en.
  function setZombieLevel(n){ptsLabel.textContent='NIVÅ '+n+' · JULPOÄNG';}
  function setMode(m){
    hud.dataset.mode=m;vit.hidden=m!=='zombies';
    const rush=m==='rush';hearts.hidden=!rush;powers.hidden=true;powers.replaceChildren();powersKey='';hud.classList.remove('urgent');goalRow.hidden=true;
    if(!rush){ptsLabel.textContent='JULPOÄNG';label.textContent='PAKET';}
  }
  // JulRushen: raden överst visar tempo och tiden till nästa paket (stapeln), under den namnet på tempot och poängen. s = XmasRush.snapshot().
  let powersKey='',heartsText='';
  const CHIPS_MAX=6;
  function setRush(s,list,now){
    const fixed=s.n>0,lbl=fixed?'RUSH':'TEMPO';if(label.textContent!==lbl)label.textContent=lbl;const lv=String(fixed?s.n:s.level);if(count.textContent!==lv)count.textContent=lv;
    if(s.goal){
      if(goalRow.hidden)goalRow.hidden=false;
      const gl=s.goal.kind==='packages'?'HÄMTA PAKET':'NÅ POÄNGEN',gc=s.goal.kind==='packages'?Math.min(s.goal.value,s.goal.target)+'/'+s.goal.target:Math.min(s.goal.value,s.goal.target).toLocaleString('sv-SE')+'/'+s.goal.target.toLocaleString('sv-SE');
      if(goalLabel.textContent!==gl)goalLabel.textContent=gl;if(goalCount.textContent!==gc)goalCount.textContent=gc;
      goalFill.style.width=Math.round(s.goal.ratio*100)+'%';
    }else if(!goalRow.hidden)goalRow.hidden=true;
    fill.style.width=Math.round(s.ratio*100)+'%';
    if(hud.classList.contains('urgent')!==s.urgent)hud.classList.toggle('urgent',s.urgent);
    const hs='♥'.repeat(Math.max(0,s.lives))+'♡'.repeat(Math.max(0,s.maxLives-s.lives));if(hs!==heartsText){heartsText=hs;hearts.textContent=hs;hearts.dataset.lives=String(s.lives);}
    if(ptsLabel.textContent!==s.name)ptsLabel.textContent=s.name;
    const sc=s.score.toLocaleString('sv-SE');if(ptsVal.textContent!==sc)ptsVal.textContent=sc;
    hud.dataset.phase=s.running?'rush':'done';
    const key=list.map(x=>x.kind+':'+Math.ceil(x.left)+':'+x.label).join('|');
    if(key!==powersKey){
      powersKey=key;powers.replaceChildren();powers.hidden=list.length===0;
      // Högst sex brickor syns (fem fartgåvor och fem andra kan vara på samtidigt): skölden, som räddar ett liv, visas alltid, och resten räknas som "+N".
      let shown=list;if(list.length>CHIPS_MAX){shown=list.slice(0,CHIPS_MAX);const sh=list.find(x=>x.kind==='shield');if(sh&&!shown.includes(sh))shown[CHIPS_MAX-1]=sh;}
      for(const x of shown){const chip=el('span','xh-chip',x.label+(x.left>0?' '+Math.ceil(x.left):''));chip.dataset.kind=x.kind;powers.append(chip);}
      if(list.length>shown.length){const more=el('span','xh-chip','+'+(list.length-shown.length));more.dataset.kind='more';powers.append(more);}
    }
  }
  function hitHearts(){hearts.classList.remove('hit');void hearts.offsetWidth;hearts.classList.add('hit');}
  function setVitals(h,e){
    const a=Math.max(0,Math.min(100,Math.round(h??0))),b=Math.max(0,Math.min(100,Math.round(e??0)));
    if(a!==vitHp){vitHp=a;hpFill.style.width=a+'%';hp.dataset.low=a<=30?'1':'0';}
    if(b!==vitSun){vitSun=b;sunFill.style.width=b+'%';}
  }
  function showHud(on){hud.hidden=!on;if(!on){goal.classList.remove('on');pill.classList.remove('on');combo.hidden=true;}}

  // ── Resultatkort ───────────────────────────────────────────────────────────────────────────────────────────────
  const result=$('round-xmas-result');
  let resultMode='ok',lastRushN=0;
  // JulRushens resultat: en av tolv rusher (stjärnor, upplåsning, nästa rush) eller Maraton (tempo och poäng som förut).
  function showRushResult(res){
    const k=res.rush,stampCv=$('xmasResultStamp'),best=res.best,def=k?rushDef(k.n):null;lastRushN=k?k.n:0;
    resultMode=k?(k.cleared?(k.next?'rush-next':'rush-done'):'rush-again'):'rush';
    const sh=$('xmasResultShare');sh.hidden=!(k&&k.cleared);
    $('xmasResultContinue').firstChild.textContent=k?(k.cleared?(k.next?'NÄSTA RUSH · '+k.next+' ':'TILL JULRUSHEN '):'FÖRSÖK IGEN '):'EN RUSH TILL ';
    $('xmasResultFree').textContent=k?'RUSHMENYN':'JULMENYN';
    $('xmasResultKicker').textContent=res.record?'NYTT REKORD!':res.stamp?'NY JULSTÄMPEL!':k?(k.cleared?(k.newReach&&k.n>RUSH_COUNT?'LÄNGRE ÄN NÅGONSIN!':k.overtime?'ÖVERTID KLAR!':'RUSH KLAR!'):res.quit?'AVBRUTET':'SLUT PÅ HJÄRTAN'):res.quit?'AVBRUTET':'SLUT PÅ LIV';
    $('xmasResultTitle').textContent=k?(k.cleared?(k.done?'TOMTEGALET KLARAT!':'RUSH '+k.n+' KLAR!'):'RUSH '+k.n+' · '+k.name):'JULRUSHEN ÄR SLUT!';
    if(k){
      const g=k.goal,vs=res.versus?res.versus.text+'. ':'';
      const did=g.kind==='packages'?'Du hämtade '+res.collected+' paket (målet var '+g.target+')':'Du nådde '+res.points.toLocaleString('sv-SE')+' poäng (målet var '+g.target.toLocaleString('sv-SE')+')';
      $('xmasResultLine').textContent=k.cleared
        ?vs+did+' och hade '+k.hearts+(k.hearts===1?' hjärta':' hjärtan')+' kvar.'+(k.done?' Alla tolv rusher är klarade: nu börjar övertiden, med samma fart men allt trängre klocka.':k.unlockedNext?' Rush '+k.next+' är upplåst.':'')+(k.newReach&&k.n>RUSH_COUNT?' Du har aldrig kommit så långt som Rush '+k.n+'.':'')
        :vs+'Du hann '+(g.kind==='packages'?res.collected+' av '+g.target+' paket':res.points.toLocaleString('sv-SE')+' av '+g.target.toLocaleString('sv-SE')+' poäng')+' i Rush '+k.n+' ('+k.name+').'+(res.collected?'':' Följ pilen och den gröna strålen till nästa paket.');
    }else{
      $('xmasResultLine').textContent='Du kom till tempo '+res.level+' ('+res.name+') och plockade '+res.collected+' paket'+(res.gold?', varav '+res.gold+' guldpaket':'')+'.'+(res.record?' Det är ditt bästa hittills!':res.collected?'':' Nästa gång: följ pilen och den gröna strålen.');
    }
    stampCv.hidden=!res.stamp;
    if(res.stamp){const st=STAMPS.find(x=>x.id===res.stampId);if(st){stampCv.width=stampCv.height=220;drawXmasStamp(stampCv.getContext('2d'),220,{label:st.label,sub:st.sub});}else stampCv.hidden=true;}
    $('xmasResultPoints').textContent=res.points.toLocaleString('sv-SE')+' JULPOÄNG';
    const grid=$('xmasResultGrid');grid.replaceChildren();
    const cells=k?[['STJÄRNOR',starText(k.stars)],['PAKET',String(res.collected)],['BÄSTA KOMBO',String(res.bestChain)],['TID',mmss(res.seconds)]]:[['PAKET',String(res.collected)],['TEMPO',String(res.level)],['BÄSTA KOMBO',String(res.bestChain)],['TID',mmss(res.seconds)]];
    for(const [kk,v] of cells){const c=el('div','xr-cell');c.append(el('b',null,v),el('span',null,kk));grid.append(c);}
    $('xmasResultParts').textContent=k
      ?'GÅVOR '+res.gifts+(res.sideTaken?' · SIDOPAKET '+res.sideTaken:'')+(k.bestBefore&&k.cleared?' · TIDIGARE REKORD '+k.bestBefore.points.toLocaleString('sv-SE')+' P':'')+(k.streak>1?' · SERIE: '+k.streak+' RUSHER I RAD':'')+(k.cleared&&k.next?' · NÄSTA RUSH MED '+k.nextHearts+' '+(k.nextHearts===1?'HJÄRTA':'HJÄRTAN')+(k.flawless&&k.nextHearts>k.hearts?' (ETT NYTT: INGET HJÄRTA TAPPAT)':k.nextHearts<3?' (HJÄRTAN FYLLS BARA PÅ OM DU KLARAR EN RUSH UTAN ATT TAPPA ETT)':''):'')
      :'GÅVOR '+res.gifts+(best?' · REKORD '+best.points.toLocaleString('sv-SE')+' P · TEMPO '+(best.level||'–'):'')+(res.stamp?'':res.level<RUSH.stampLevel?' · Julstämpeln delas ut vid tempo '+RUSH.stampLevel+'.':'');
    $('xmasResultStatus').textContent='JULSTÄMPLAR '+save.stampCount()+' / '+save.stampTotal()+' · '+save.title()+(k?' · RUSHSTJÄRNOR '+totalStars(save.rush)+' / '+RUSH_COUNT*3:'');
  }
  function showResult(res){
    if(res.kind==='rush')return showRushResult(res);
    const stampCv=$('xmasResultStamp');
    $('xmasResultShare').hidden=true;
    // Tomtezombies har nivåer: en klarad nivå leder till nästa (NÄSTA NIVÅ), en förlorad kan göras om, och båda har JULMENYN som andra val. Julrundorna går vidare till fortsättningsmenyn som förut.
    const zombies=res.kind==='zombies',zl=Math.max(1,Math.floor(res.level)||1);
    resultMode=res.failed?'fail':zombies?(res.next?'zombies-next':'zombies-done'):'ok';
    $('xmasResultContinue').firstChild.textContent=res.failed?(zombies?'FÖRSÖK IGEN · NIVÅ '+zl+' ':'FÖRSÖK IGEN '):zombies?(res.next?'NÄSTA NIVÅ · '+res.next+' ':'JULMENYN '):'FORTSÄTT ';
    $('xmasResultFree').textContent=res.failed||zombies?'JULMENYN':'FRI JULVANDRING';
    if(res.failed){
      $('xmasResultKicker').textContent='TOMTEJAKTEN';$('xmasResultTitle').textContent='DU BLEV TAGEN!';
      $('xmasResultLine').textContent=(zombies?'Nivå '+zl+'. ':'')+'Tomtezombierna hann ikapp dig. Du hann samla '+res.collected+' av '+res.goal+' paket. Försök igen: skjut dem med SOLSTÖT och ta paketen för att fylla på solenergin.';
      stampCv.hidden=true;$('xmasResultPoints').textContent=res.points.toLocaleString('sv-SE')+' JULPOÄNG';
      const grid=$('xmasResultGrid');grid.replaceChildren();
      for(const [k,v] of [['PAKET',res.collected+'/'+res.goal],['BÄSTA KOMBO',String(res.bestChain)],['TID',mmss(res.seconds)]]){const c=el('div','xr-cell');c.append(el('b',null,v),el('span',null,k));grid.append(c);}
      $('xmasResultParts').textContent='Ingen stämpel den här gången. Paket du samlat räknas inte förrän du lämnat dem hos tomten.';
      $('xmasResultStatus').textContent='JULSTÄMPLAR '+save.stampCount()+' / '+save.stampTotal()+' · '+save.title();
      return;
    }
    $('xmasResultKicker').textContent=zombies?(res.stamp?'NY JULSTÄMPEL!':res.levelRecord?'NYTT REKORD!':'NIVÅ '+zl+' KLAR!'):res.stamp?'NY JULSTÄMPEL!':res.late?'KLART · SENT MEN GOTT':'KLART!';
    $('xmasResultTitle').textContent=res.kind==='intro'?'TOMTEN ÄR RÄDDAD!':res.kind==='delivery'?'FIKAT ÄR LEVERERAT!':zombies?'TOMTEJAKTEN · NIVÅ '+zl+' KLARAD!':'JULRUNDAN ÄR KLAR!';
    $('xmasResultLine').textContent=res.kind==='intro'
      ?'Tomten får tillbaka sina paket och skickar dig vidare med en julstämpel.':res.kind==='delivery'?'Tomten fick sin julfika, precis som beställt. Tack för hjälpen!':zombies?(res.stamp?'Tomten fick sina paket trots tomtezombierna. Stämpeln är din!':'Du samlade '+res.collected+' paket trots tomtezombierna och lämnade dem hos tomten.')+(res.next?' Nästa nivå: '+res.next+' · '+res.nextPlace+', med '+res.nextGoal+' paket och snabbare tomtezombier.':' Du har klarat den sista nivån!'):'Tomtarna tackar för hjälpen och tappar säkert fler paket i morgon.';
    const stamp=STAMPS.find(s=>s.id===res.stampId);
    stampCv.hidden=!stamp;
    if(stamp){stampCv.width=stampCv.height=220;drawXmasStamp(stampCv.getContext('2d'),220,{label:stamp.label,sub:stamp.sub});}
    $('xmasResultPoints').textContent=res.points.toLocaleString('sv-SE')+' JULPOÄNG';
    const grid=$('xmasResultGrid');grid.replaceChildren();
    const cells=res.kind==='delivery'?[['TID',mmss(res.seconds)],['JULPOÄNG',res.points.toLocaleString('sv-SE')]]:[['PAKET',res.collected+'/'+res.regularTotal],['BONUS',res.bonusCollected+'/'+res.bonusTotal],['BÄSTA KOMBO',String(res.bestChain)],['TID',mmss(res.seconds)]];
    for(const [k,v] of cells){const c=el('div','xr-cell');c.append(el('b',null,v),el('span',null,k));grid.append(c);}
    $('xmasResultParts').textContent=(res.kind==='delivery'?'Leverans '+res.parts.delivery:'Paket '+res.parts.packages+' + leverans '+res.parts.delivery)+(res.parts.time?' + snabbhet '+res.parts.time:'')+(res.record?' · NYTT REKORD':'');
    $('xmasResultStatus').textContent='JULSTÄMPLAR '+save.stampCount()+' / '+save.stampTotal()+' · '+save.title();
  }

  // ── Startvy och fortsättningsmeny ──────────────────────────────────────────────────────────────────────────────
  function renderStart(build){
    const s=save.state,done=save.introDone;
    $('xmasCozy').firstChild.textContent=done?'JULKLAPPSJAKTEN 🎁 ':'JULKLAPPSJAKTEN 🎁 ';
    $('xmasCozyNote').textContent=done?'Fortsätt julen: nya rundor, butiksuppdrag och fri julvandring.':'Mysigt paketäventyr på Stora Torget. Inga zombies. Första uppdraget tar ungefär en minut.';
    const rec=s.records.intro;
    $('xmasStatus').textContent='JULSTÄMPLAR '+save.stampCount()+' / '+save.stampTotal()+' · '+save.title()+(rec?' · REKORD '+rec.points+' P':'');
    if(build)$('xmasBuild').textContent=build;
    rushNote($('xmasRushStartNote'));
    // Tomtezombies har nivåer: knappen startar nästa nivå och raden under säger hur långt man kommit.
    const cz=save.zombies.cleared,zn=nextZombieLevel(save.zombies),zl=zombieLevel(zn),zb=$('xmasZombies'),zNote=$('xmasZombieNote');
    if(zb?.firstChild)zb.firstChild.textContent='TOMTEZOMBIES'+(cz?' · NIVÅ '+zn:'')+' ';
    if(zNote)zNote.textContent=!cz?'Ett separat julläge med zombier och kuslig julmusik. Julklappsjakten är helt utan zombier. Klara en nivå så kommer nästa, med fler paket och snabbare tomtezombier.'
      :'Du har klarat '+cz+(cz===1?' nivå':' nivåer')+'. Nästa: nivå '+zn+' · '+zl.place+' ('+zl.goal+' paket, snabbare tomtezombier). Ett separat julläge med zombier och kuslig julmusik.';
  }
  function rushNote(node){
    if(!node)return;const R=save.rush,next=nextRush(R),def=rushDef(next);
    node.textContent=!R.cleared?'Tolv rusher med stigande tempo, mål, hjärtan och stjärnor. Börja med Rush 1.'
      :R.cleared>=RUSH_COUNT?'Du har klarat Rush '+R.cleared+(R.cleared>RUSH_COUNT?' i övertiden':'')+' ('+totalStars(R)+' av '+RUSH_COUNT*3+' stjärnor). Nästa: Rush '+next+' · '+def.name+'. Hur långt kommer du?'
      :'Du har klarat '+R.cleared+' av '+RUSH_COUNT+' rusher. Nästa: Rush '+next+' · '+def.name+' ('+goalText(def).toLowerCase()+').';
  }
  function renderContinue(){
    const s=save.state;
    const nr=nextRound(save);$('xmasRoundNote').textContent='Nästa: '+nr.title+'. '+nr.blurb;
    $('xmasContinueStatus').textContent='JULSTÄMPLAR '+save.stampCount()+' / '+save.stampTotal()+' · '+save.title()+' · '+s.totals.packages+' PAKET';
    rushNote($('xmasRushGoNote'));
    const list=$('xmasStampList');list.replaceChildren();
    for(const st of STAMPS){const li=el('li',save.hasStamp(st.id)?'stamped':'',(save.hasStamp(st.id)?'✓ ':'○ ')+st.label);list.append(li);}
  }

  // ── Rushmenyn: tolv nivåer ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  let selected=1;
  function renderRush(pick=0){
    const R=save.rush,next=nextRush(R);
    selected=pick&&isUnlocked(R,pick)?pick:next; // utan val: nästa rush att spela
    $('xmasRushStars').textContent='★ '+totalStars(R)+' / '+RUSH_COUNT*3+(R.cleared>RUSH_COUNT?' · RUSH '+R.cleared:'');
    const grid=$('xmasRushGrid');grid.replaceChildren();
    for(const d of RUSHES){
      const open=isUnlocked(R,d.n),stars=R.stars[d.n]||0,b=el('button','xr-tile');
      b.type='button';b.dataset.n=String(d.n);b.dataset.state=!open?'locked':stars?'done':'open';b.disabled=!open;b.setAttribute('aria-pressed',d.n===selected?'true':'false');
      b.setAttribute('aria-label','Rush '+d.n+', '+d.name+(open?(stars?', '+stars+' stjärnor':', öppen'):', låst'));
      b.append(el('b',null,String(d.n)),el('span',null,open?d.name:'LÅST'),el('i',null,open?starText(stars):'– – –'));
      b.addEventListener('click',()=>renderRush(d.n));grid.append(b);
    }
    // Övertid: efter Rush 12 går det vidare (Rush 13, 14 …) så långt man orkar. En ruta som alltid pekar på nästa övertidsrush.
    {
      const otOpen=R.cleared>=RUSH_COUNT,otN=Math.min(RUSH_MAX,Math.max(RUSH_COUNT+1,next)),b=el('button','xr-tile xr-ot');
      b.type='button';b.dataset.n=String(otN);b.dataset.state=!otOpen?'locked':R.cleared>RUSH_COUNT?'done':'open';b.disabled=!otOpen;b.setAttribute('aria-pressed',selected>RUSH_COUNT?'true':'false');
      b.setAttribute('aria-label',otOpen?'Övertid: Rush '+otN+(R.cleared>RUSH_COUNT?', längst klarat Rush '+R.cleared:''):'Övertid, låst tills Rush 12 är klarad');
      b.append(el('b',null,otOpen?String(otN):'13+'),el('span',null,'ÖVERTID'),el('i',null,otOpen?(R.cleared>RUSH_COUNT?'✓ '+R.cleared:'NY'):'– – –'));
      b.addEventListener('click',()=>renderRush(otN));grid.append(b);
    }
    const d=rushDef(selected),best=R.best[selected];
    $('xmasRushInfoTitle').textContent='RUSH '+d.n+' · '+d.name;
    $('xmasRushInfoGoal').textContent=goalText(d)+' · FART ×'+d.speed.toFixed(2).replace('.',',')+' · POÄNG ×'+d.mult.toFixed(1).replace('.',',');
    $('xmasRushInfoBest').textContent=(best?'REKORD '+best.points.toLocaleString('sv-SE')+' P · '+starText(R.stars[selected]||0):d.blurb)+(R.bestStreak>1?' · LÄNGSTA SERIE '+R.bestStreak:'');
    $('xmasRushPlay').firstChild.textContent='SPELA RUSH '+selected+' ';
    const rec=save.state.records[RUSH.id];
    $('xmasRushMarathonNote').textContent='Maraton: tempot stiger var 12:e sekund och klockan blir trängre, även efter tempo 12. Tre hjärtan hela vägen.'+(rec?' Rekord '+rec.points.toLocaleString('sv-SE')+' poäng · tempo '+(rec.level||'–')+'.':'');
  }
  const selectedRush=()=>selected;

  // ── Topplistan och utmaningen ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  let boardN=0,link='';
  const boardSelect=$('xmasBoardRush');
  if(boardSelect&&!boardSelect.options.length){
    boardSelect.append(new Option('TOTALT (SUMMAN AV ALLA RUSHER)','0'));
    boardSelect.append(new Option('LÄNGST I JULRUSHEN','reach'));
    for(const d of RUSHES)boardSelect.append(new Option('RUSH '+d.n+' · '+d.name,String(d.n)));
  }
  function boardStatus(t){const n=$('xmasBoardStatus');if(n)n.textContent=t||'';}
  // Länken beror på namnet i fältet (utan att skriva tillbaka det medan man skriver) och på dina bästa resultat.
  function refreshLink(){
    const name=cleanName($('xmasBoardName').value),p=save.profile(),focus=boardN>0&&p.bests[boardN]?boardN:0;
    const token=name?encodeChallenge({name,focus,cleared:p.cleared,stars:p.stars,bests:p.bests}):null;
    link=token?challengeUrl(shareBase(),token):'';
    $('xmasBoardLink').value=link;
    const d=focus?rushDef(focus):null;
    $('xmasBoardShareText').textContent=!name?'Skriv ditt namn så att vännen ser vem som utmanar.':d?'Du utmanar med dina '+p.bests[focus].toLocaleString('sv-SE')+' poäng i Rush '+d.n+' ('+d.name+'). Vännen får också din profil i sin topplista.'
      :'Du skickar din profil: din bästa poäng i varje rush'+(p.cleared>RUSH_COUNT?' och att du klarat Rush '+p.cleared+'.':p.cleared?'.':'. Klara en rush först om du vill utmana i den.');
    for(const id of ['xmasBoardShare','xmasBoardCopy'])$(id).disabled=!link;
  }
  function renderBoard(n=0,{focusName=false}={}){
    boardN=n==='reach'||n===-1||Number(n)>RUSH_COUNT?-1:Math.max(0,Math.floor(Number(n))||0);boardSelect.value=boardN<0?'reach':String(boardN);
    const me=save.profile();me.name=me.name||'DU';
    const rows=leaderboard({me,friends:save.friends,n:boardN}),ol=$('xmasBoardList');ol.replaceChildren();
    if(!rows.length){const li=el('li','empty',boardN>0?'Ingen har klarat Rush '+boardN+' än. Klara den, eller bjud in en vän!':'Inga resultat än. Klara en rush och bjud in en vän!');ol.append(li);}
    for(const r of rows.slice(0,20)){
      const li=el('li',r.you?'you':'');li.append(el('span','rk',String(r.rank)),el('span','nm',r.you?(save.name?save.name+' (DU)':'DU'):r.name),el('span','pt',boardN<0?'RUSH '+r.points:r.points.toLocaleString('sv-SE')),el('span','st','★'+r.stars));ol.append(li);
    }
    $('xmasBoardNote').textContent='Listan visar dig och vännerna som skickat dig en utmaning ('+save.friends.length+' '+(save.friends.length===1?'vän':'vänner')+'). En gemensam lista för alla spelare finns inte än.';
    const inp=$('xmasBoardName');if(document.activeElement!==inp)inp.value=save.name;
    boardStatus('');refreshLink();
    if(focusName)queueMicrotask(()=>inp.focus({preventScroll:true}));
  }
  const copyLink=async()=>{
    if(!link)return false;
    try{await navigator.clipboard.writeText(link);return true;}catch{}
    try{const i=$('xmasBoardLink');i.focus();i.select();i.setSelectionRange(0,link.length);return document.execCommand('copy');}catch{return false;}
  };
  async function shareLink(){
    if(!link)return;
    const d=boardN>0?rushDef(boardN):null,text=shareText({rush:d,points:d?save.rush.best[boardN]?.points:0,reach:save.rush.cleared});
    if(navigator.share){try{await navigator.share({title:'Julklappsjakten',text,url:link});boardStatus('Skickat!');return;}catch(e){if(e&&e.name==='AbortError')return;}}
    boardStatus((await copyLink())?'Länken är kopierad. Klistra in den i ett meddelande till din vän.':'Markera länken ovan och kopiera den för hand.');
  }
  // Inkommande utmaning (från en länk): vem som utmanar, vad som ska slås och vad det går att göra.
  function renderChallenge(ch,{rushOpen=true}={}){
    const p=ch.profile,d=ch.focus?rushDef(ch.focus):null;
    const NAME=p.name.toLocaleUpperCase('sv-SE');
    $('xmasChallengeTitle').textContent=d?NAME+' UTMANAR DIG!':NAME+' VILL VARA DIN VÄN';
    $('xmasChallengeLine').textContent=d?'Slå '+ch.toBeat.toLocaleString('sv-SE')+' poäng i Rush '+d.n+' · '+d.name+' ('+goalText(d).toLowerCase()+').':p.name+' har skickat sin profil. Spara den så syns '+p.name+' i din topplista.';
    const grid=$('xmasChallengeStats');grid.replaceChildren();
    for(const [k,v] of [[p.cleared>RUSH_COUNT?'LÄNGST':'KLARAT',p.cleared>RUSH_COUNT?'RUSH '+p.cleared:p.cleared+' / '+RUSH_COUNT],['STJÄRNOR','★ '+p.stars],['SUMMA',p.total.toLocaleString('sv-SE')]]){const c=el('div','xr-cell');c.append(el('b',null,v),el('span',null,k));grid.append(c);}
    const R=save.rush,reachable=d?isUnlocked(R,d.n):true;
    $('xmasChallengeNote').textContent=d&&!reachable?'Du har inte kommit till Rush '+d.n+' än. Klara Rush '+nextRush(R)+' först: utmaningen ligger kvar tills du är där.':'';
    $('xmasChallengeGo').firstChild.textContent=d?(reachable?'TA UTMANINGEN ':'SPELA RUSH '+nextRush(R)+' '):'SPARA VÄNNEN ';
    $('xmasChallengeSave').hidden=!d;
  }

  // ── Pausmenyns tillägg: vädereffekter och vägen tillbaka ───────────────────────────────────────────────────────
  const pauseBox=el('div','xmas-pause');
  const weatherBtn=el('button','round-secondary');weatherBtn.type='button';weatherBtn.id='xmasWeatherBtn';
  const modeBtn=el('button','round-secondary','JULMENY');modeBtn.type='button';modeBtn.id='xmasMenuBtn';
  const backBtn=el('button','round-tertiary','← Tillbaka till Karlstad-spelet');backBtn.type='button';backBtn.id='xmasBackPause';
  pauseBox.append(weatherBtn,modeBtn,backBtn);
  const resume=pauseCard?.querySelector('#roundResume');if(pauseCard)pauseCard.insertBefore(pauseBox,resume||pauseCard.firstChild);
  function renderWeather(level=save.weather){weatherBtn.textContent='VÄDEREFFEKTER: '+WEATHER[level].label;weatherBtn.setAttribute('aria-label','Vädereffekter: '+WEATHER[level].label+'. Tryck för att byta.');}
  weatherBtn.addEventListener('click',()=>{const next=WEATHER_ORDER[(WEATHER_ORDER.indexOf(save.weather)+1)%WEATHER_ORDER.length];fx.setWeather(next);renderWeather(next);});
  modeBtn.addEventListener('click',()=>fx.openMenu());
  backBtn.addEventListener('click',()=>fx.goBase());
  renderWeather();

  // ── Knappar ────────────────────────────────────────────────────────────────────────────────────────────────────
  const on=(id,fn)=>{const b=$(id);if(b)b.addEventListener('click',fn);};
  on('xmasCozy',()=>fx.cozy());on('xmasZombies',()=>fx.zombies());on('xmasRushStart',()=>fx.openRush());on('xmasRushGo',()=>fx.openRush());on('xmasBack',()=>fx.goBase());
  on('xmasRushPlay',()=>fx.rushPlay(selected));on('xmasRushMarathon',()=>fx.marathon());on('xmasRushBoard',()=>fx.openBoard(selected));on('xmasRushBack',()=>fx.openMenu());
  on('xmasBoardBack',()=>fx.boardBack());on('xmasBoardShare',()=>shareLink());on('xmasBoardCopy',async()=>boardStatus((await copyLink())?'Länken är kopierad. Klistra in den i ett meddelande till din vän.':'Markera länken ovan och kopiera den för hand.'));
  on('xmasChallengeGo',()=>fx.challengeGo());on('xmasChallengeSave',()=>fx.challengeSave());on('xmasChallengeSkip',()=>fx.challengeSkip());
  on('xmasResultShare',()=>fx.openBoard(lastRushN,true));
  if(boardSelect)boardSelect.addEventListener('change',()=>renderBoard(boardSelect.value));
  const nameInput=$('xmasBoardName');
  if(nameInput){nameInput.addEventListener('input',()=>refreshLink());nameInput.addEventListener('change',()=>{save.setName(nameInput.value);nameInput.value=save.name;refreshLink();});nameInput.addEventListener('blur',()=>{save.setName(nameInput.value);nameInput.value=save.name;refreshLink();});}
  on('xmasContinueIntro',()=>fx.intro());on('xmasRound',()=>fx.round());on('xmasShops',()=>fx.shops());on('xmasFree',()=>fx.free());on('xmasContinueMenu',()=>fx.openMenu());on('xmasContinueBack',()=>fx.goBase());
  on('xmasResultContinue',()=>resultMode==='rush'?fx.marathon():resultMode==='rush-next'?fx.rushNext():resultMode==='rush-again'?fx.rushAgain():resultMode==='rush-done'?fx.openRush():resultMode==='fail'?fx.zombiesAgain():resultMode==='zombies-next'?fx.zombiesNext():resultMode==='zombies-done'?fx.openMenu():fx.openContinue());
  on('xmasResultFree',()=>resultMode==='rush'||resultMode==='fail'||resultMode.startsWith('zombies')?fx.openMenu():resultMode.startsWith('rush-')?fx.openRush():fx.free());
  return {hud,showGoal,showPill,setProgress,setCombo,setMode,setZombieLevel,setVitals,setRush,hitHearts,tick,showHud,showResult,renderStart,renderContinue,renderWeather,renderRush,renderBoard,renderChallenge,selectedRush,
    get goalText(){return goal.textContent;},get progressText(){return count.textContent;}};
}
