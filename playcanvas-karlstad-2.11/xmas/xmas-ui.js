// Julklappsjakten: gränssnittet. Startvyn, fortsättningsmenyn och resultatkortet är vanliga paneler i index.html; HUD:en och pausmenyns
// tillägg byggs här med textContent (aldrig HTML-strängar med data). Små mål: knappar är minst 52 px höga och spelvärlden syns ovanför.
// JulRushen använder samma HUD: tempo och klockan i raden överst (stapeln är tiden till nästa paket), liv som hjärtan, poäng, kombo och gåvorna som små brickor.
import {STAMPS,WEATHER,WEATHER_ORDER,titleFor,TITLES} from './xmas-config.mjs?v=2.21.1-xmas.2';
import {drawXmasStamp} from './xmas-art.js?v=2.21.1-xmas.2';
import {nextRound} from './xmas-rounds.mjs?v=2.21.1-xmas.2';
import {RUSH} from './xmas-rush.mjs?v=2.21.1-xmas.2';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
export const mmss=s=>{const n=Math.max(0,Math.round(s));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};

export function createXmasUi({save,mount=document.getElementById('roundOverlay'),pauseCard=document.getElementById('round-pause'),fx}){
  const $=id=>document.getElementById(id);
  // ── HUD: mål, framsteg, poäng och kombo ───────────────────────────────────────────────────────────────────────
  const hud=el('div');hud.id='xmasHud';hud.hidden=true;hud.setAttribute('role','status');
  const goal=el('div','xh-goal');goal.id='xmasGoal';
  const row=el('div','xh-row'),count=el('b','xh-count','0/20'),label=el('span','xh-label','PAKET'),bar=el('i','xh-bar'),fill=el('u');bar.append(fill);row.append(label,count,bar);
  const pts=el('div','xh-points');const ptsVal=el('b',null,'0'),ptsLabel=el('span',null,'JULPOÄNG'),timeEl=el('em','xh-time','');timeEl.hidden=true;pts.append(ptsLabel,ptsVal);row.append(timeEl);
  const hearts=el('em','xh-hearts','♥♥♥');hearts.hidden=true;hearts.setAttribute('aria-label','Liv');row.append(hearts);
  const powers=el('div','xh-powers');powers.hidden=true;
  const combo=el('div','xh-combo');combo.hidden=true;const comboChain=el('b',null,'KOMBO 2'),comboMult=el('span',null,'×2'),comboBar=el('i','xh-combo-bar'),comboFill=el('u');comboBar.append(comboFill);combo.append(comboChain,comboMult,comboBar);
  const pill=el('div','xh-pill');pill.id='xmasPill';
  // Liv och solenergi (bara i Tomtezombies)
  const vit=el('div','xh-vitals');vit.hidden=true;const hp=el('i','xh-hp'),hpFill=el('u'),sun=el('i','xh-sun'),sunFill=el('u');hp.append(hpFill);sun.append(sunFill);vit.append(el('span',null,'LIV'),hp,el('span',null,'SOL'),sun);
  let vitHp=-1,vitSun=-1;
  hud.append(row,pts,combo,vit,powers);
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
  function setMode(m){
    hud.dataset.mode=m;vit.hidden=m!=='zombies';
    const rush=m==='rush';hearts.hidden=!rush;powers.hidden=true;powers.replaceChildren();powersKey='';hud.classList.remove('urgent');
    if(!rush){ptsLabel.textContent='JULPOÄNG';label.textContent='PAKET';}
  }
  // JulRushen: raden överst visar tempo och tiden till nästa paket (stapeln), under den namnet på tempot och poängen. s = XmasRush.snapshot().
  let powersKey='',heartsText='';
  function setRush(s,list,now){
    if(label.textContent!=='TEMPO')label.textContent='TEMPO';const lv=String(s.level);if(count.textContent!==lv)count.textContent=lv;
    fill.style.width=Math.round(s.ratio*100)+'%';
    if(hud.classList.contains('urgent')!==s.urgent)hud.classList.toggle('urgent',s.urgent);
    const hs='♥'.repeat(Math.max(0,s.lives))+'♡'.repeat(Math.max(0,s.maxLives-s.lives));if(hs!==heartsText){heartsText=hs;hearts.textContent=hs;hearts.dataset.lives=String(s.lives);}
    if(ptsLabel.textContent!==s.name)ptsLabel.textContent=s.name;
    const sc=s.score.toLocaleString('sv-SE');if(ptsVal.textContent!==sc)ptsVal.textContent=sc;
    hud.dataset.phase=s.running?'rush':'done';
    const key=list.map(x=>x.kind+':'+Math.ceil(x.left)+':'+x.label).join('|');
    if(key!==powersKey){
      powersKey=key;powers.replaceChildren();powers.hidden=list.length===0;
      for(const x of list){const chip=el('span','xh-chip',x.label+(x.left>0?' '+Math.ceil(x.left):''));chip.dataset.kind=x.kind;powers.append(chip);}
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
  let resultMode='ok';
  function showRushResult(res){
    const stampCv=$('xmasResultStamp'),best=res.best;
    resultMode='rush';
    $('xmasResultContinue').firstChild.textContent='EN RUSH TILL ';$('xmasResultFree').textContent='JULMENYN';
    $('xmasResultKicker').textContent=res.record?'NYTT REKORD!':res.stamp?'NY JULSTÄMPEL!':res.quit?'AVBRUTET':'SLUT PÅ LIV';
    $('xmasResultTitle').textContent='JULRUSHEN ÄR SLUT!';
    $('xmasResultLine').textContent='Du kom till tempo '+res.level+' ('+res.name+') och plockade '+res.collected+' paket'+(res.gold?', varav '+res.gold+' guldpaket':'')+'.'+(res.record?' Det är ditt bästa hittills!':res.collected?'':' Nästa gång: följ pilen och den gröna strålen.');
    stampCv.hidden=!res.stamp;
    if(res.stamp){const st=STAMPS.find(x=>x.id===res.stampId);if(st){stampCv.width=stampCv.height=220;drawXmasStamp(stampCv.getContext('2d'),220,{label:st.label,sub:st.sub});}else stampCv.hidden=true;}
    $('xmasResultPoints').textContent=res.points.toLocaleString('sv-SE')+' JULPOÄNG';
    const grid=$('xmasResultGrid');grid.replaceChildren();
    for(const [k,v] of [['PAKET',String(res.collected)],['TEMPO',String(res.level)],['BÄSTA KOMBO',String(res.bestChain)],['TID',mmss(res.seconds)]]){const c=el('div','xr-cell');c.append(el('b',null,v),el('span',null,k));grid.append(c);}
    $('xmasResultParts').textContent='GÅVOR '+res.gifts+(best?' · REKORD '+best.points.toLocaleString('sv-SE')+' P · TEMPO '+(best.level||'–'):'')+(res.stamp?'':res.level<RUSH.stampLevel?' · Julstämpeln delas ut vid tempo '+RUSH.stampLevel+'.':'');
    $('xmasResultStatus').textContent='JULSTÄMPLAR '+save.stampCount()+' / '+save.stampTotal()+' · '+save.title();
  }
  function showResult(res){
    if(res.kind==='rush')return showRushResult(res);
    const stampCv=$('xmasResultStamp');
    resultMode=res.failed?'fail':'ok';
    $('xmasResultContinue').firstChild.textContent=res.failed?'FÖRSÖK IGEN ':'FORTSÄTT ';$('xmasResultFree').textContent=res.failed?'JULMENYN':'FRI JULVANDRING';
    if(res.failed){
      $('xmasResultKicker').textContent='TOMTEJAKTEN';$('xmasResultTitle').textContent='DU BLEV TAGEN!';
      $('xmasResultLine').textContent='Tomtezombierna hann ikapp dig. Du hann samla '+res.collected+' av '+res.goal+' paket. Försök igen: skjut dem med SOLSTÖT och ta paketen för att fylla på solenergin.';
      stampCv.hidden=true;$('xmasResultPoints').textContent=res.points.toLocaleString('sv-SE')+' JULPOÄNG';
      const grid=$('xmasResultGrid');grid.replaceChildren();
      for(const [k,v] of [['PAKET',res.collected+'/'+res.goal],['BÄSTA KOMBO',String(res.bestChain)],['TID',mmss(res.seconds)]]){const c=el('div','xr-cell');c.append(el('b',null,v),el('span',null,k));grid.append(c);}
      $('xmasResultParts').textContent='Ingen stämpel den här gången. Paket du samlat räknas inte förrän du lämnat dem hos tomten.';
      $('xmasResultStatus').textContent='JULSTÄMPLAR '+save.stampCount()+' / '+save.stampTotal()+' · '+save.title();
      return;
    }
    $('xmasResultKicker').textContent=res.stamp?'NY JULSTÄMPEL!':res.late?'KLART · SENT MEN GOTT':'KLART!';
    $('xmasResultTitle').textContent=res.kind==='intro'?'TOMTEN ÄR RÄDDAD!':res.kind==='delivery'?'FIKAT ÄR LEVERERAT!':res.kind==='zombies'?'TOMTEJAKTEN KLARAD!':'JULRUNDAN ÄR KLAR!';
    $('xmasResultLine').textContent=res.kind==='intro'
      ?'Tomten får tillbaka sina paket och skickar dig vidare med en julstämpel.':res.kind==='delivery'?'Tomten fick sin julfika, precis som beställt. Tack för hjälpen!':res.kind==='zombies'?'Tomten fick sina paket trots tomtezombierna. Stämpeln är din!':'Tomtarna tackar för hjälpen och tappar säkert fler paket i morgon.';
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
  }
  function rushNote(node){
    if(!node)return;const rec=save.state.records[RUSH.id];
    node.textContent='Samma jakt som TempoRush, men med paket: tre liv och ett tempo som stiger var 15:e sekund.'+(rec?' Rekord: '+rec.points.toLocaleString('sv-SE')+' poäng · tempo '+(rec.level||'–')+'.':' Hur långt kommer du?');
  }
  function renderContinue(){
    const s=save.state;
    const nr=nextRound(save);$('xmasRoundNote').textContent='Nästa: '+nr.title+'. '+nr.blurb;
    $('xmasContinueStatus').textContent='JULSTÄMPLAR '+save.stampCount()+' / '+save.stampTotal()+' · '+save.title()+' · '+s.totals.packages+' PAKET';
    rushNote($('xmasRushGoNote'));
    const list=$('xmasStampList');list.replaceChildren();
    for(const st of STAMPS){const li=el('li',save.hasStamp(st.id)?'stamped':'',(save.hasStamp(st.id)?'✓ ':'○ ')+st.label);list.append(li);}
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
  on('xmasCozy',()=>fx.cozy());on('xmasZombies',()=>fx.zombies());on('xmasRushStart',()=>fx.rush());on('xmasRushGo',()=>fx.rush());on('xmasBack',()=>fx.goBase());
  on('xmasContinueIntro',()=>fx.intro());on('xmasRound',()=>fx.round());on('xmasShops',()=>fx.shops());on('xmasFree',()=>fx.free());on('xmasContinueMenu',()=>fx.openMenu());on('xmasContinueBack',()=>fx.goBase());
  on('xmasResultContinue',()=>resultMode==='rush'?fx.rush():resultMode==='fail'?fx.zombies():fx.openContinue());on('xmasResultFree',()=>resultMode==='rush'||resultMode==='fail'?fx.openMenu():fx.free());
  return {hud,showGoal,showPill,setProgress,setCombo,setMode,setVitals,setRush,hitHearts,tick,showHud,showResult,renderStart,renderContinue,renderWeather,
    get goalText(){return goal.textContent;},get progressText(){return count.textContent;}};
}
