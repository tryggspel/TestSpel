// Julklappsjakten: gränssnittet. Startvyn, fortsättningsmenyn och resultatkortet är vanliga paneler i index.html; HUD:en och pausmenyns
// tillägg byggs här med textContent (aldrig HTML-strängar med data). Små mål: knappar är minst 52 px höga och spelvärlden syns ovanför.
import {STAMPS,WEATHER,WEATHER_ORDER,titleFor,TITLES} from './xmas-config.mjs?v=2.21.1-xmas.1';
import {drawXmasStamp} from './xmas-art.js?v=2.21.1-xmas.1';
import {nextRound} from './xmas-rounds.mjs?v=2.21.1-xmas.1';

const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
export const mmss=s=>{const n=Math.max(0,Math.round(s));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');};

export function createXmasUi({save,mount=document.getElementById('roundOverlay'),pauseCard=document.getElementById('round-pause'),fx}){
  const $=id=>document.getElementById(id);
  // ── HUD: mål, framsteg, poäng och kombo ───────────────────────────────────────────────────────────────────────
  const hud=el('div');hud.id='xmasHud';hud.hidden=true;hud.setAttribute('role','status');
  const goal=el('div','xh-goal');goal.id='xmasGoal';
  const row=el('div','xh-row'),count=el('b','xh-count','0/20'),label=el('span','xh-label','PAKET'),bar=el('i','xh-bar'),fill=el('u');bar.append(fill);row.append(label,count,bar);
  const pts=el('div','xh-points');const ptsVal=el('b',null,'0'),ptsLabel=el('span',null,'JULPOÄNG'),timeEl=el('em','xh-time','');timeEl.hidden=true;pts.append(ptsLabel,ptsVal);row.append(timeEl);
  const combo=el('div','xh-combo');combo.hidden=true;const comboChain=el('b',null,'KOMBO 2'),comboMult=el('span',null,'×2'),comboBar=el('i','xh-combo-bar'),comboFill=el('u');comboBar.append(comboFill);combo.append(comboChain,comboMult,comboBar);
  const pill=el('div','xh-pill');pill.id='xmasPill';
  hud.append(row,pts,combo);
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
  function showHud(on){hud.hidden=!on;if(!on){goal.classList.remove('on');pill.classList.remove('on');combo.hidden=true;}}

  // ── Resultatkort ───────────────────────────────────────────────────────────────────────────────────────────────
  const result=$('round-xmas-result');
  function showResult(res){
    const stampCv=$('xmasResultStamp');
    $('xmasResultKicker').textContent=res.stamp?'NY JULSTÄMPEL!':res.late?'KLART · SENT MEN GOTT':'KLART!';
    $('xmasResultTitle').textContent=res.kind==='intro'?'TOMTEN ÄR RÄDDAD!':res.kind==='delivery'?'FIKAT ÄR LEVERERAT!':'JULRUNDAN ÄR KLAR!';
    $('xmasResultLine').textContent=res.kind==='intro'
      ?'Tomten får tillbaka sina paket och skickar dig vidare med en julstämpel.':res.kind==='delivery'?'Tomten fick sin julfika, precis som beställt. Tack för hjälpen!':'Tomtarna tackar för hjälpen och tappar säkert fler paket i morgon.';
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
  }
  function renderContinue(){
    const s=save.state;
    const nr=nextRound(save);$('xmasRoundNote').textContent='Nästa: '+nr.title+'. '+nr.blurb;
    $('xmasContinueStatus').textContent='JULSTÄMPLAR '+save.stampCount()+' / '+save.stampTotal()+' · '+save.title()+' · '+s.totals.packages+' PAKET';
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
  on('xmasCozy',()=>fx.cozy());on('xmasZombies',()=>fx.zombies());on('xmasBack',()=>fx.goBase());
  on('xmasContinueIntro',()=>fx.intro());on('xmasRound',()=>fx.round());on('xmasShops',()=>fx.shops());on('xmasFree',()=>fx.free());on('xmasContinueMenu',()=>fx.openMenu());on('xmasContinueBack',()=>fx.goBase());
  on('xmasResultContinue',()=>fx.openContinue());on('xmasResultFree',()=>fx.free());
  return {hud,showGoal,showPill,setProgress,setCombo,tick,showHud,showResult,renderStart,renderContinue,renderWeather,
    get goalText(){return goal.textContent;},get progressText(){return count.textContent;}};
}
