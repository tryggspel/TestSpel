// Julklappsjakten: kopplar ihop motorn, vyn, gränssnittet och grundspelets system. Anropas en gång från last-round.js (bara i julbygget).
// Allt här är fail-soft: om något i julkoden skulle kasta stängs jultilläggen av och grundspelet lever vidare (som platskoden i 2.21).
import {registerXmasProps} from './xmas-place-art.js?v=2.21.1-xmas.6';
import {XmasHunt} from './xmas-hunt.mjs?v=2.21.1-xmas.6';
import {XmasGuide,missionView} from './xmas-guide.mjs?v=2.21.1-xmas.6';
import {createGuideUi} from './xmas-guide-ui.js?v=2.21.1-xmas.6';
import {XmasRush} from './xmas-rush.mjs?v=2.21.1-xmas.6';
import {XmasSave} from './xmas-save.mjs?v=2.21.1-xmas.6';
import {rushDef,isUnlocked,nextRush,goalText} from './xmas-rushes.mjs?v=2.21.1-xmas.6';
import {decodeChallenge,tokenFromSearch,versus} from './xmas-board.mjs?v=2.21.1-xmas.6';
import {INTRO,TREE,INTRO_GOAL} from './xmas-layout.mjs?v=2.21.1-xmas.6';
import {baseGameUrl,WEATHER,STAMPS,DELIVERY} from './xmas-config.mjs?v=2.21.1-xmas.6';
import {loadBuildStamp,buildDetail,baseStamp} from './xmas-build.mjs?v=2.21.1-xmas.6';
import {createSprites} from './xmas-sprites.js?v=2.21.1-xmas.6';
import {createXmasView} from './xmas-view.js?v=2.21.1-xmas.6';
import {createXmasUi,mmss} from './xmas-ui.js?v=2.21.1-xmas.6';
import {createXmasDecor} from './xmas-decor.js?v=2.21.1-xmas.6';
import {nextRound,roundById,buildRound,buildSearch,INTRO_SEARCH} from './xmas-rounds.mjs?v=2.21.1-xmas.6';
import {zombieLevel,nextZombieLevel,isZombieUnlocked,ZOMBIE_MAX} from './xmas-zombie-levels.mjs?v=2.21.1-xmas.6';
import {smoothPath} from '../city-guidance.mjs?v=2.21.1-xmas.6';

// Julbygget har inga termosar, hemligheter eller skatter: paketen ersätter dem. Anropas direkt efter att resan skapats, innan någon vy ritas.
export function prepareXmasJourney(journey){
  try{journey.items.length=0;journey.treasures.length=0;journey.secrets.length=0;journey.itemById?.clear?.();journey.xmasPrepared=true;}
  catch(e){console.error('[Jul] kunde inte tömma termosarna]',e);}
}

export function installXmas(ctx){
  const {pc,host,journey,root,$,texture,labelTex,toast,fanfare,sound,note,setPanel,startCity,pause,resume,isPlaying,placeActive,indoors,openPass,dismissPlaceResult,params,storage}=ctx;
  registerXmasProps();
  const save=new XmasSave(storage);
  let fault=false;
  const guard=(fn,fallback)=>{if(fault)return fallback;try{return fn();}catch(e){fault=true;console.error('[Jultillägget stängdes av efter fel]',e);try{hunt.cancel('fel');julrush.cleanup();zombieTune.off();ui.showHud(false);view.clear();document.body.classList.remove('xmas-on','xmas-cozy','xmas-zombies','xmas-rush');journey.xmas=null;}catch{}return fallback;}}; // grundspelets HUD och regler tar över igen

  // route: gångvägen mellan två punkter (för tomtarnas spår i snön i fri julvandring); null om det inte finns någon, då blir spåret en rak linje.
  const nav={blocked:(x,z)=>host.blocked(x,z),snap:p=>{try{const q=journey.nav.point(p);return {x:q.x,z:q.z};}catch{return null;}},
    // Bara de sista 160 m av vägen behövs (ett spår har högst 90 avtryck), så utjämningen av en lång omväg blir inte dyr.
    route:(a,b)=>{try{
      const raw=journey.nav.path(a,b);if(!Array.isArray(raw)||raw.length<2)return null;
      let L=0,from=0;for(let i=raw.length-1;i>0;i--){L+=Math.hypot(raw[i].x-raw[i-1].x,raw[i].z-raw[i-1].z);if(L>160){from=i;break;}}
      return smoothPath(journey.nav,from>0?raw.slice(from):raw);
    }catch{return null;}}};
  // Spelets egen gångbara karta för rundorna (rutter, hinder, fri sikt).
  const roundNav={point:p=>journey.nav.point(p),path:(a,b)=>journey.nav.path(a,b),clear:(a,b)=>journey.nav.clear(a,b),blocked:(x,z)=>host.blocked(x,z),smooth:p=>smoothPath(journey.nav,p)};
  const hunt=new XmasHunt({save,nav});
  const julrush=new XmasRush({journey,save}); // JulRushen: TempoRushs bana och klocka (journey.tempo) med julens paket, gåvor och poäng
  const guide=new XmasGuide({nav:journey.nav}); // pilen, kantmarkörerna, stjärnspåret och uppdragsraden i paketjakten (inte i JulRushen, som har grundspelets pil)
  let guideShown=false,missionAt=0;
  const rushArrow=document.getElementById('tempoArrow');let rushGoal=null,rushArrowAt=0,rushArrowTop=-1; // rushGoal (målrutan) skapas av gränssnittet längre ned och slås upp första gången den behövs
  const sprites=createSprites(pc,host,{texture,root});
  const view=createXmasView(pc,host,{labelTex,root,texture},sprites,hunt,julrush);
  let decor=null; // julmiljön: gran, stånd, ljus, tomtar och snöfall. Fail-soft: går något fel i den fortsätter spelet utan.
  try{decor=createXmasDecor(pc,host,{root,texture,labelTex,indoors,params:{weather:save.weather}},sprites);}catch(e){console.error('[Julmiljön hoppades över]',e);}
  const baseUrl=baseGameUrl(location.search,location.hostname);
  let stamp=baseStamp,mode='menu'; // menu | cozy | zombies | rush
  let rainToastAt=-1e9; // när den senaste hela fanfaren om tappade julklappar visades
  let shopTipShown=false; // tipset om butiksutmaningarna visas en gång per spelstart
  // Tomtezombies-nivåer (xmas-zombie-levels.mjs): zLevel = nivån som spelas, lastZombie = senaste klarade nivåns resultat (för NÄSTA NIVÅ). Tomtezombierna blir snabbare genom att farten sätts när
  // en zombie skapas (ett byte av spawn på journey-objektets egen instans, borttaget när läget lämnas) och tätare genom att nästa patrull aldrig ligger längre fram än nivåns takt (update).
  let zLevel=null,lastZombie=null,lastZombieN=0;
  const zombieTune={
    on(level){
      this.off();if(!(level.speedMul>1))return;
      const base=journey.spawn;
      journey.spawn=function(a,p,kind){const r=base.call(this,a,p,kind);if(a&&Number.isFinite(a.speed))a.speed*=level.speedMul;return r;};
    },
    off(){if(Object.prototype.hasOwnProperty.call(journey,'spawn'))delete journey.spawn;}
  };
  let turboBefore=null; // spelarens eget turbo-val före rushen (rushen slår på turbon); det återställs när man lämnar rushen
  let caughtAt=0;
  // Automatisk lättnad vid segt spel: mäter riktiga bildrutetider (inte spelets klippta dt) och minskar julens effekter ett steg i taget.
  // Av i automatiska tester (navigator.webdriver) och med ?nogov; ?gov tvingar på den. Sparas inte: nästa start prövar full kvalitet igen.
  const gov={ema:16,last:0,slowSec:0,cool:0,on:!!(params&&params.has('gov'))||(!(typeof navigator!=='undefined'&&navigator.webdriver)&&!(params&&params.has('nogov'))),level:0};
  function govern(now){
    if(!gov.on||(hunt.run==null&&!julrush.active))return;
    const d=gov.last?now-gov.last:0;gov.last=now;if(!(d>0&&d<250))return;
    gov.ema+=(d-gov.ema)*.05;
    if(now<gov.cool)return;
    if(gov.ema>40){gov.slowSec+=d/1000;}else gov.slowSec=Math.max(0,gov.slowSec-d/500);
    if(gov.slowSec>=3&&gov.level<2){
      gov.level++;gov.slowSec=0;gov.cool=now+6000;gov.ema=22;
      try{decor?.setAuto(gov.level);view.setLite(true);}catch(e){console.error(e);}
      ui.showPill(gov.level===1?'FÄRRE EFFEKTER FÖR JÄMNARE SPEL':'MINIMALA EFFEKTER FÖR JÄMNARE SPEL',2400,now,'lost');
    }
  }
  let resultTimer=0,resultOpen=false,rushHudAt=0;const powerBuf=[];
  // Utmaningar: incoming = en länk någon skickat (visas när menyn öppnas), pending = en utmaning man tagit (jämförs när rushen är klarad), lastRush = senaste rushens resultat (för NÄSTA RUSH).
  let incoming=null,pending=null,lastRush=null,boardFrom='rush',badLink=false;
  try{
    const tok=tokenFromSearch(location.search);
    if(tok){incoming=decodeChallenge(tok);badLink=!incoming;}else badLink=new URLSearchParams(location.search).has('utmaning');
    if(badLink||incoming){const u=new URL(location.href);u.searchParams.delete('utmaning');history.replaceState(null,'',u.pathname+u.search+u.hash);} // adressen städas så att en omladdning inte visar utmaningen igen
  }catch{}
  const guideUi=createGuideUi({});

  function goBase(){
    try{save.save();journey.save?.();}catch{}
    location.assign(baseUrl);
  }
  // ── Vad som händer när en körning startar ─────────────────────────────────────────────────────────────────────
  function enter(kind,spawn=null){
    try{dismissPlaceResult?.();}catch{} // grundspelets resultatkort från ett butiksuppdrag ska inte ligga kvar över nästa läge
    const zombies=kind==='zombies',rushing=kind==='rush';
    leaveRush();if(!rushing)restoreTurbo();zombieTune.off();if(!zombies)zLevel=null;
    mode=zombies?'zombies':rushing?'rush':'cozy';caughtAt=0;
    document.body.classList.add('xmas-on');document.body.classList.toggle('xmas-cozy',!zombies);document.body.classList.toggle('xmas-zombies',zombies);document.body.classList.toggle('xmas-rush',rushing);
    startCity(zombies?'free':'clean');
    if(zombies){ // grundspelets zombieregler (patruller, ambushar, Guld-Nisse, max sex aktiva) men utan kontrakt, kaos, strömavbrott och sol: paketen är målet
      const r=journey.rush;r.nextContract=1e9;r.nextChaos=1e9;r.nextBlackout=1e9;r.ecology.nextSun=1e9;r.nextPatrol=Math.max(r.nextPatrol,9);
    }
    ui.setMode(zombies?'zombies':rushing?'rush':'cozy');
    try{if(zombies)host.music?.mood?.('eerie');else if(rushing)host.music?.mood?.('rush');else host.music?.mood?.('cozy',{keep:false});host.music?.tempo?.(1);}catch{}
    const {x,z,yaw}=spawn||(kind==='intro'?INTRO.spawn:kind==='free'?freeSpawn():INTRO.spawn);
    host.teleport(x,z,yaw,-4);journey.position={x,z};journey.lastStep=null;journey.heading=yaw;journey.routeMode='hunt';
    ui.showHud(true);
  }
  const freeSpawn=()=>{const p=host.player.getPosition();return {x:p.x,z:p.z,yaw:journey.heading||0};};
  // JulRushen: städa bort paketbandet, farten och tempot så att inget ligger kvar i nästa läge (grundspelets termosband och tempo är annars delade med journey).
  function leaveRush(){try{julrush.cleanup();julrush.drain();julrush.state='idle';}catch(e){console.error(e);}}
  // Turbon som rushen slog på går tillbaka till det spelaren själv hade valt (när man lämnar rushen, inte mellan två rusher i rad).
  function restoreTurbo(){if(turboBefore==null)return;const was=turboBefore;turboBefore=null;try{ctx.setTurbo?.(was);}catch{}}
  // JulRushen börjar på Stora Torget, vänd åt det håll där banan får den längsta, fria gatusträckan (grundspelets planHeading prövar tre riktningar: de täcker hela varvet).
  function rushSpawn(){
    const s=INTRO.spawn;let best=null;
    for(const h0 of [0,Math.PI*2/3,Math.PI*4/3]){const pl=journey.planHeading?.(s.x,s.z,h0);if(pl&&(!best||pl.score>best.score))best=pl;}
    const yaw=best?(Math.atan2(-Math.sin(best.h),-Math.cos(best.h))*180/Math.PI+360)%360:s.yaw;
    return {x:s.x,z:s.z,yaw:Math.round(yaw)};
  }
  // Julklappsjakten är sök och hitta (2.21.1-xmas.6): tomtarna tappar julklappar här och där, och man hittar dem genom att följa deras spår i snön. Ingen pil eller julband visar vägen till paketen.
  function startIntro(){
    guard(()=>{
      const def=buildSearch(INTRO_SEARCH,roundNav);
      enter('intro',def.spawn);hunt.startSearch(def);
      toast('JULKLAPPSJAKTEN','Tomtarna har tappat julklappar! Leta efter deras spår i snön och följ dem.',4);
      ui.showGoal('Hjälp tomten! Hitta '+def.goal+' julklappar.',7000);
      ui.setProgress(hunt.run);view.clear();
    });
  }
  // n = 0: Maraton (tempot stiger var 12:e sekund, och klockan blir trängre). n = 1–99: en rush med fast tempo och ett mål (13 och uppåt är ÖVERTID). series: hjärtan och rusher i rad när man går vidare från en klarad rush.
  function startRush(n=0,series=null){
    guard(()=>{
      const def=n?rushDef(n):null;
      if(n&&(!def||!isUnlocked(save.rush,n))){openRush();return;}
      hunt.cancel('rush');enter('rush',rushSpawn());julrush.start({def,hearts:series?.hearts||3,streak:series?.streak||0});
      try{const was=ctx.setTurbo?.(true);if(turboBefore==null&&typeof was==='boolean')turboBefore=was;}catch{} // klockan är räknad på turbons fart: den slås på av sig själv (man kan stänga av den, men då hinner man inte långt)
      try{host.music?.tempo?.(def?Math.min(1.35,1+.03*(def.tempo-1)):1);}catch{}
      toast(def?'RUSH '+def.n+' · '+def.name:'JULRUSHEN · MARATON',def?goalText(def)+'. Följ pilen och den gröna strålen. Turbon är på.':'Följ pilen och den gröna strålen till nästa paket. Tempot stiger var 12:e sekund och klockan blir trängre. Turbon är på.',3.6);
      ui.showGoal(def?goalText(def)+'!':'Följ pilen: hinn fram före klockan!',5500);
      ui.setRush(julrush.snapshot(),julrush.powers([]),performance.now());view.clear();
    });
  }
  function openRush(pick=0){guard(()=>{try{dismissPlaceResult?.();}catch{}ui.renderRush(pick);setPanel('xmas-rush');});}
  function openBoard(n=0,fromResult=false){guard(()=>{boardFrom=fromResult?'result':'rush';ui.renderBoard(n,{focusName:fromResult&&!save.name});setPanel('xmas-board');});}
  const rushNext=()=>{if(lastRush&&lastRush.next)startRush(lastRush.next,{hearts:lastRush.nextHearts,streak:lastRush.streak});else openRush();};
  const rushAgain=()=>{if(lastRush)startRush(lastRush.n,{hearts:3,streak:0});else openRush();};
  // Inkommande utmaning: en vän sparas först när man väljer det (aldrig bara av att öppna en länk)
  function challengeGo(){
    guard(()=>{
      const ch=incoming;incoming=null;if(!ch){openMenu();return;}
      const saved=save.addFriend(ch.profile);
      if(!ch.focus){toast('VÄN SPARAD',ch.profile.name+' finns nu i din topplista.',2.6);openBoard(0);return;}
      pending={focus:ch.focus,toBeat:ch.toBeat,name:ch.profile.name};void saved;
      startRush(isUnlocked(save.rush,ch.focus)?ch.focus:nextRush(save.rush));
    });
  }
  function challengeSave(){guard(()=>{const ch=incoming;incoming=null;if(ch){save.addFriend(ch.profile);toast('VÄN SPARAD',ch.profile.name+' finns nu i din topplista.',2.6);}openMenu();});}
  function challengeSkip(){guard(()=>{incoming=null;openMenu();});}
  // n = 0: nästa nivå att spela (den efter den högsta klarade). Nivå 1 är spiralen runt granen, därefter julrundornas banor med fler paket och snabbare tomtezombier.
  function startZombies(n=0){
    guard(()=>{
      const lv=zombieLevel(n&&isZombieUnlocked(save.zombies,n)?n:nextZombieLevel(save.zombies));
      let layout={packages:INTRO.packages,tomte:INTRO.tomte,spawn:INTRO.spawn,tree:INTRO.tree,windowSec:4.6,ordered:true,goal:lv.goal};
      if(lv.layout!=='intro'){
        const run=buildRound(roundById(lv.layout),roundNav),regular=run.packages.filter(k=>k.kind==='regular').length;
        layout={packages:run.packages,tomte:run.tomte,spawn:run.spawn,tree:run.tree,windowSec:4.6,ordered:!!run.route,goal:Math.min(lv.goal,regular)};
      }
      zLevel=lv;lastZombieN=lv.n;
      enter('zombies',layout.spawn);
      zombieTune.on(lv);ui.setZombieLevel(lv.n);
      hunt.startRun({kind:'zombies',id:lv.id,title:lv.title,level:lv.n,goal:layout.goal,packages:layout.packages,tomte:layout.tomte,spawn:layout.spawn,tree:layout.tree,windowSec:layout.windowSec,soft:0,stampId:'zombies',ordered:layout.ordered});
      toast(lv.n>1?lv.title+' · '+lv.place:'TOMTEZOMBIES','Samla '+layout.goal+' paket och lämna dem hos tomten. Tomtezombierna jagar dig: skjut med SOLSTÖT.'+(lv.n>1?' Fler och snabbare tomtezombier än förra nivån.':''),4.4);
      ui.showGoal('Samla '+layout.goal+' paket. Tomtezombierna jagar dig!',7500);
      ui.setProgress(hunt.run);view.clear();
    });
  }
  const zombiesNext=()=>{if(lastZombie&&lastZombie.next)startZombies(lastZombie.next);else openMenu();};
  const zombiesAgain=()=>startZombies(lastZombieN||0);
  // Grundspelet anropar detta när liven tar slut i zombieläget. true = hanterat här (ingen återhämtning, run avslutas med ett eget kort).
  function caught(){
    if(mode!=='zombies')return false;
    if(caughtAt)return true;
    const r=hunt.run;if(!r||!hunt.active)return true;
    caughtAt=performance.now();
    const res={kind:'zombies',failed:true,level:zLevel?.n||r.level||1,collected:r.collected,goal:r.goal,regularTotal:r.regularTotal,bonusCollected:r.bonusCollected,bonusTotal:r.bonusTotal,bestChain:r.bestChain,seconds:Math.round(r.t),points:r.points};
    hunt.cancel('tagen');journey.pause?.();journey.actors.forEach(a=>{a.active=false;});
    clearTimeout(resultTimer);
    resultTimer=setTimeout(()=>guard(()=>{ui.showResult(res);setPanel('xmas-result');resultOpen=true;}),900);
    return true;
  }
  function startRound(id=null){
    guard(()=>{
      const def=(id&&roundById(id))||nextRound(save);
      const run=buildSearch(def,roundNav);
      enter('round',run.spawn);hunt.startSearch(run);
      toast(def.title,def.blurb,4.2);
      ui.showGoal('Hitta '+run.goal+' julklappar och lämna dem hos tomten.',7500);
      ui.setProgress(hunt.run);view.clear();
    });
  }
  // ── Butiksuppdrag: stämplar och leverans till tomten ────────────────────────────────────────────────────────────────
  // Butiksutmaningarna går att göra mitt i Julklappsjakten och fri julvandring (det finns ingen pil som tävlar om platsen). JulRushen går före butikerna.
  const runBusy=()=>mode==='rush'&&julrush.active;
  function tomteSpotFor(place){
    const t=place.talk||place.where;
    for(const r of [12,9,15,7])for(let k=0;k<12;k++){
      const a=k*30*Math.PI/180,x=t.x+Math.sin(a)*r,z=t.z+Math.cos(a)*r;if(host.blocked(x,z))continue;
      let q=null;try{q=journey.nav.point({x,z});}catch{}
      if(q&&Math.hypot(q.x-x,q.z-z)<1.5&&journey.nav.clear(t,q))return {x:+q.x.toFixed(2),z:+q.z.toFixed(2)};
    }
    return {x:+(t.x+8).toFixed(2),z:+t.z.toFixed(2)};
  }
  function startDelivery(place){
    const spot=tomteSpotFor(place);
    hunt.startRun({kind:'delivery',id:'delivery-'+place.id,title:place.activity.title,goal:0,packages:[],tomte:{x:spot.x,z:spot.z,radius:3.2},phase:'deliver',stampId:place.id,windowSec:3.6});
    ui.setProgress(hunt.run);ui.showHud(true);view.clear();
    ui.showGoal('Bär fikat till tomten som väntar utanför!',7000);
    toast('TOMTEN VÄNTAR','Följ pilen och lämna fikat. Tomten står '+Math.round(Math.hypot(spot.x-host.player.getPosition().x,spot.z-host.player.getPosition().z))+' m bort.',3.4);
  }
  function onPlaceEvent(e){
    if(!e||e.type!=='place-complete')return;
    guard(()=>{
      const place=journey.places?.get?.(e.placeId);if(!place)return;
      if(e.placeId==='pressbyran'){
        // Mitt i en jakt (Julklappsjakten, fri julvandring) avbryts inte jakten: leveransen till tomten utanför är ett ärende vid sidan om. Annars är leveransen ett eget uppdrag.
        if(hunt.run&&hunt.active&&hunt.run.drops){
          const spot=tomteSpotFor(place);
          hunt.startErrand({id:'delivery-'+place.id,title:place.activity.title,tomte:{x:spot.x,z:spot.z,radius:3.2},stampId:place.id});
          ui.showGoal('Bär fikat till tomten som väntar utanför!',7000);
          toast('TOMTEN VÄNTAR','Följ pilen och lämna fikat. Tomten står '+Math.round(Math.hypot(spot.x-host.player.getPosition().x,spot.z-host.player.getPosition().z))+' m bort. Jakten på julklappar väntar på dig.',3.6);
        }else startDelivery(place);
        return;
      }
      const first=save.stamp(e.placeId);
      save.addTotals({points:e.points||0});
      if(first){ui.showPill('JULSTÄMPEL! '+(e.stamp?.label||place.name),2600,performance.now());sound('win');}
    });
  }
  function openShops(){
    guard(()=>{
      startFree();
      setTimeout(()=>guard(()=>{try{openPass?.();}catch(err){console.error(err);}}),60);
    });
  }
  function startFree(){
    guard(()=>{
      const keep=mode==='cozy'&&isPlaying();
      if(!keep)enter('free');else{setPanel(null);resume?.();}
      hunt.startFree();setPanel(null);
      toast('FRI JULVANDRING','Tomtarna tappar julklappar här och där i staden. Leta efter deras spår i snön och följ dem.',4);
      ui.showHud(true);ui.setProgress(hunt.run);view.clear();
    });
  }
  function openMenu(){
    guard(()=>{
      try{dismissPlaceResult?.();}catch{}clearTimeout(resultTimer);
      if(julrush.active){julrush.quit();} // att ge upp i pausmenyn sparar körningen som en förlust (om den hade några paket)
      leaveRush();restoreTurbo();zombieTune.off();try{host.music?.tempo?.(1);}catch{}
      hunt.cancel('meny');view.clear();ui.showHud(false);guide.reset();guideUi.show(false);view.setGuide(null);guideShown=false;journey.pause?.();mode='menu';caughtAt=0;journey.actors?.forEach(a=>{a.active=false;});document.body.classList.remove('xmas-cozy','xmas-zombies','xmas-rush');
      if(incoming){ui.renderChallenge(incoming);setPanel('xmas-challenge');return;}
      ui.renderStart(buildDetail(stamp));setPanel('xmas-intro');
      if(badLink){badLink=false;toast('UTMANINGEN','Länken gick inte att läsa. Be din vän skicka den igen.',3.4);}
    });
  }
  function openContinue(){guard(()=>{ui.renderContinue();setPanel('xmas-continue');});}
  function setWeather(level){save.setWeather(level);try{decor?.setWeather(level);}catch(e){console.error(e);}}

  const ui=createXmasUi({save,fx:{
    cozy:()=>{if(save.introDone)openContinue();else startIntro();},
    intro:()=>startIntro(),round:()=>startRound(),shops:()=>openShops(),free:()=>startFree(),zombies:()=>startZombies(),zombiesNext,zombiesAgain,
    openRush:()=>openRush(),rushPlay:n=>startRush(n),marathon:()=>startRush(0),rushNext,rushAgain,openBoard,boardBack:()=>{if(boardFrom==='result')setPanel('xmas-result');else openRush(ui.selectedRush());},challengeGo,challengeSave,challengeSkip,
    openMenu,openContinue,goBase,setWeather
  }});

  // ── Händelser från motorn → ljud, effekter och gränssnitt ──────────────────────────────────────────────────────
  // Varje gåva har sitt eget lilla ljud: släden stiger snabbt, magneten sveper nedåt, spöket klingar, bomben mullrar, regnet porlar.
  const GIFT_JINGLE={default:[[659.25],[880],[1174.66]],sleigh:[[392,'sawtooth'],[523.25,'sawtooth'],[659.25,'sawtooth'],[880,'sawtooth']],magnet:[[880,'sine'],[740,'sine'],[622,'sine'],[523.25,'sine'],[440,'sine']],
    ghost:[[1046.5],[987.77],[880],[783.99],[659.25]],bomb:[[110,'sawtooth'],[82.4,'sawtooth'],[164.8,'square']],rain:[[1318.5],[1174.66],[1046.5],[987.77],[880],[783.99]],
    glogg:[[392],[493.88],[587.33],[739.99]],kaka:[[330,'sawtooth'],[440,'sawtooth'],[587.33,'sawtooth'],[783.99,'sawtooth'],[1046.5,'sawtooth']],wind:[[600,'sine'],[800,'sine'],[1000,'sine'],[1200,'sine']],skates:[[1568],[1760],[2093]]};
  const chainFreq=chain=>[523.25,587.33,659.25,698.46,783.99,880,987.77,1046.5][Math.min(7,Math.max(0,chain-1))]||1046.5;
  const handlers={
    'xmas-start':(e,now)=>{ui.setProgress(hunt.run);},
    'xmas-pick':(e,now)=>{
      if(mode==='zombies')journey.energy=Math.min(100,(journey.energy||0)+(e.kind==='bonus'?30:8)); // paketen är ammunition i Tomtezombies
      const mult=e.mult>1?' ×'+e.mult:'';
      if(e.kind==='bonus'){[659.25,880,1174.66,1568].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.22,.08),i*70));view.burst(e.x,e.z,{big:true});ui.showPill('BONUSPAKET! +'+e.points,1500,now,'bonus');}
      else{note(chainFreq(e.chain),'triangle',.16,.075);setTimeout(()=>note(chainFreq(e.chain)*1.5,'sine',.2,.04),55);view.burst(e.x,e.z);ui.showPill('+'+e.points+(e.chain>=2?' · KOMBO '+e.chain+mult:''),1000,now);}
      if(e.praise){fanfare(e.praise,'+'+e.tierBonus+' poäng',1.3,'chain');}
      ui.setProgress(hunt.run);
    },
    'xmas-goal':(e,now)=>{sound('win');[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.28,.08),i*90));ui.showGoal('Bra! Lämna julklapparna hos tomten.',5500,now);fanfare(e.goal+' JULKLAPPAR!','Följ pilen till tomten och lämna dem.',2.4,'win');ui.setProgress(hunt.run);},
    'xmas-chain-lost':(e,now)=>{ui.showPill('KEDJAN BRÖTS · '+e.chain+' I RAD',1200,now,'lost');},
    // Tomtarna tappar julklappar med god tid emellan (xmas-drops.mjs): hela fanfaren bara om den förra är mer än 25 s gammal, annars en kort rad.
    // Det finns ingen pil: spåren i snön leder till julklapparna (fri julvandring och Julklappsjakten är sök och hitta).
    'xmas-rain':(e,now)=>{sound('energy');if(now-rainToastAt>25000){rainToastAt=now;ui.showGoal('Tomtarna tappade julklappar! Leta efter deras spår i snön.',5200,now);fanfare('TAPPADE JULKLAPPAR!','Följ tomtarnas spår i snön och leta upp '+e.count+' julklappar och ett bonuspaket.',2.6,'energy');}else ui.showPill('NYA SPÅR I SNÖN · '+e.count+' JULKLAPPAR',1600,now);},
    'xmas-rain-gone':(e,now)=>{
      if(e.done){
        ui.showPill('ALLA JULKLAPPAR HITTADE!',1500,now,'bonus');
        // En enda gång per spelstart: berätta att butikerna har utmaningar (Pressbyrån på Kungsgatan 14, Cervera i Mitt i City) medan man går runt.
        if(!shopTipShown&&hunt.run&&hunt.run.drops&&hunt.run.phase!=='deliver'&&(!save.hasStamp('pressbyran')||!save.hasStamp('cervera'))){shopTipShown=true;setTimeout(()=>guard(()=>{if(mode==='cozy'&&hunt.active)toast('BUTIKSUTMANINGAR','Pressbyrån på Kungsgatan 14 och Cervera i Mitt i City har uppdrag åt tomtarna. Gå dit och prata med dem.',4.6);}),1800);}
      }else if(e.missed>0)ui.showPill('SNÖN TÄCKTE SPÅREN',1400,now,'lost');
    },
    // Ett ärende (leveransen efter Pressbyrån) klart mitt i jakten: poäng och stämpel, och jakten fortsätter.
    'xmas-errand-done':(e,now)=>{sound('win');[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.3,.08),i*90));ui.showPill(e.stamp?'JULSTÄMPEL! '+(STAMPS.find(s=>s.id===e.stampId)?.label||'')+' · +'+e.points:'FIKAT LEVERERAT! +'+e.points,2600,now,'bonus');ui.showGoal('Tack! Tomten fick sitt fika. Nu fortsätter jakten på julklappar.',4200,now);ui.setProgress(hunt.run);},
    'xmas-late':(e,now)=>{ui.showPill('SEN, MEN DET GÅR ATT LÄMNA IN',2000,now,'lost');},
    // JulRushen
    'rush-start':(e,now)=>{ui.setRush(julrush.snapshot(),julrush.powers([]),now);},
    'rush-pick':(e,now)=>{
      if(e.gold){[659.25,880,1174.66,1568].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.22,.08),i*70));view.burst(e.x,e.z,{big:true});}
      else{note(chainFreq(e.chain),'triangle',.16,.075);setTimeout(()=>note(chainFreq(e.chain)*1.5,'sine',.2,.04),55);view.burst(e.x,e.z);}
      // Allt i en enda puff (i det här tempot hinner en separat kombotavla inte läsas): poäng, flyt och kombo eller kombonivåns beröm.
      const who=e.by==='ghost'?'SPÖKET · ':e.by==='magnet'?'MAGNET · ':e.side&&!e.rain?'SIDOPAKET · ':'';
      ui.showPill(who+'+'+e.points+(e.flow?' · FLYT':'')+(e.praise?' · '+e.praise:e.chain>=2?' · KOMBO '+e.chain:''),e.gold||e.praise?1500:900,now,e.gold||e.praise?'bonus':'');
    },
    'rush-gift':(e,now)=>{
      sound(e.kind==='bomb'?'boss':'win');(GIFT_JINGLE[e.kind]||GIFT_JINGLE.default).forEach(([f,type],i)=>setTimeout(()=>note(f,type||'triangle',.2,.07),i*(e.kind==='sleigh'?45:e.kind==='kaka'?35:e.kind==='ghost'?85:65)));
      fanfare(e.label+(e.count>0?' · '+e.count+' PAKET':'')+'!',e.text+(e.seconds?' '+String(e.seconds).replace('.',',')+' sekunder.':''),2.2,'energy');
    },
    'rush-level':(e,now)=>{
      sound('boss');host.music?.tempo?.(Math.min(1.35,1+.03*(e.level-1)));
      fanfare('TEMPO '+e.level+' · '+(e.extra?'ÖVERTID':e.name),e.extra?'Samma fart, men klockan blir trängre.':'Fart ×'+e.speed.toFixed(2).replace('.',',')+' · poäng ×'+e.mult.toFixed(1).replace('.',','),2.2,'chain');
    },
    // Klockan är räknad på turbon: har spelaren stängt av den (en knapptryckning räcker) får hen veta varför det går så fort.
    'rush-miss':(e,now)=>{sound('bump');let noTurbo=false;try{noTurbo=ctx.setTurbo?.()===false;}catch{}ui.showPill((e.lives>0?'FÖR SENT! '+e.lives+' LIV KVAR':'INGA LIV KVAR')+(noTurbo&&e.lives>0?' · SLÅ PÅ TURBON':''),1800,now,'lost');ui.hitHearts();},
    'rush-shield':(e,now)=>{sound('capture');ui.showPill('PEPPARKAKSSKÖLDEN RÄDDADE ETT LIV · +'+e.seconds+' S',2400,now,'bonus');},
    'rush-chain-lost':(e,now)=>{ui.showPill('KEDJAN BRÖTS · '+e.chain+' I RAD',1200,now,'lost');},
    'rush-over':(e,now)=>{
      const r=e.result,k=r.rush;lastRush=k||null;
      // en tagen utmaning: slog du vännen? (en rush som inte klarades räknas inte, och utmaningen ligger kvar tills den är slagen)
      if(k&&k.cleared&&pending&&pending.focus===k.n){const v=versus({points:r.points,toBeat:pending.toBeat,name:pending.name.toLocaleUpperCase('sv-SE')});if(v){r.versus=v;if(v.beat)pending=null;}}
      host.music?.tempo?.(1);sound(r.record||(k&&k.cleared)?'win':'boss');ui.setRush(julrush.snapshot(),[],now);
      clearTimeout(resultTimer);
      resultTimer=setTimeout(()=>guard(()=>{journey.pause?.();ui.showResult(e.result);setPanel('xmas-result');resultOpen=true;}),1100);
    },
    'xmas-deliver':(e,now)=>{
      // Tomtezombies: en klarad nivå sparas och låser upp nästa; resultatkortet får veta vilken nivå som kommer.
      if(e.result.kind==='zombies'){
        const n=e.result.level||zLevel?.n||1,prog=save.recordZombies(n,{points:e.result.points,seconds:e.result.seconds,packages:e.result.collected}),nx=n<ZOMBIE_MAX?zombieLevel(n+1):null;
        e.result={...e.result,level:n,next:nx?nx.n:0,nextPlace:nx?nx.place:'',nextGoal:nx?nx.goal:0,levelFirst:prog.first,levelRecord:prog.record};lastZombie=e.result;
      }
      sound('win');[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.34,.09),i*100));
      ui.setProgress(hunt.run);view.burst(hunt.run.tomte.x,hunt.run.tomte.z,{big:true,y:1.4});ui.showGoal('Tack! Du räddade julen.',4000,now);
      clearTimeout(resultTimer);
      resultTimer=setTimeout(()=>guard(()=>{journey.pause?.();ui.showResult(e.result);setPanel('xmas-result');resultOpen=true;}),1400);
    }
  };
  const handle=(now)=>{for(const e of hunt.drain())handlers[e.type]?.(e,now);for(const e of julrush.drain())handlers[e.type]?.(e,now);};

  // Butiksutmaningar nära spelaren (Cervera, Pressbyrån): en rad i uppdragsraden när man är inom 60 m från en butik man inte har stämpel från. Ingen pil: butiken syns på marknaden.
  function shopRow(p){
    try{
      let best=null,bd=60;
      for(const pl of journey.places?.list?.()||[]){
        const t=pl.talk;if(!t||pl.status==='future'||save.hasStamp(pl.id))continue;
        const d=Math.hypot(t.x-p.x,t.z-p.z);if(d<bd){bd=d;best=pl;}
      }
      return best?{text:'UPPDRAG: '+best.name.toUpperCase(),near:bd<=25}:null;
    }catch{return null;}
  }
  // ── Vägledning i paketjakten: pil, kantmarkörer, stjärnspår och uppdragsrad (JulRushen och butiksuppdragen har egna) ───────────────────
  function updateGuide(p,now,dt){
    // JulRushen: bara julbandet på marken (pilen, stråle och kantmarkörer är grundspelets och JulRushens egna); målet är nästa paket längs banan
    if(mode==='rush'&&julrush.running&&!placeActive?.()){
      const t=julrush.target(p),g=guide.update(p,host.camera.forward,t,dt,now,view.lite);
      if(guideShown&&guideUi.arrowShown)guideUi.show(false);
      view.setGuide(g.on?g:null);guideShown=true;return;
    }
    const on=(mode==='cozy'||mode==='zombies')&&!!hunt.run&&hunt.active&&!placeActive?.();
    if(!on){if(guideShown||guide.state.on){guide.reset();guideUi.show(false);view.setGuide(null);guideShown=false;}return;}
    const g=guide.update(p,host.camera.forward,hunt.guideTarget(p),dt,now,view.lite);
    guideUi.set(g);view.setGuide(g.on?g:null);guideShown=true;
    // Butiksraden visas inte i det första uppdraget (bara jakten): där räcker spår och tomte.
    if(now-missionAt>140){missionAt=now;guideUi.setMission(missionView(hunt.run,p,hunt.run.drops&&mode==='cozy'&&hunt.run.kind!=='intro'?shopRow(p):null));}
  }

  // ── Varje bildruta ──────────────────────────────────────────────────────────────────────────────────────────────
  function update(p,now,dt){
    guard(()=>{
      // JulRushens pil (grundspelets #tempoArrow) ligger strax under HUD:ens underkant, som växer när fler gåvor är på; läses högst fyra gånger i sekunden.
      if(rushArrow){
        if(mode==='rush'){
          if(now-rushArrowAt>250){
            rushArrowAt=now;rushGoal=rushGoal||document.getElementById('xmasGoal');const b=Math.round(ui.hud.getBoundingClientRect().bottom)+8;
            if(b!==rushArrowTop&&b>20){rushArrowTop=b;rushArrow.style.top=b+'px';if(rushGoal)rushGoal.style.top=(b+(rushArrow.offsetHeight||44)+8)+'px';} // målrutan ligger under pilen
          }
        }else if(rushArrowTop!==-1){rushArrowTop=-1;rushArrow.style.top='';if(rushGoal)rushGoal.style.top='';}
      }
      // Blickriktningen: det första tappade paketet i fri julvandring läggs framför spelaren så att spåret syns direkt.
      {const f=host.camera.forward,h=hunt.facing||(hunt.facing={x:0,z:0});h.x=f.x;h.z=f.z;}
      // Tomtezombies från nivå 2: nästa patrull ligger aldrig längre fram än nivåns takt (grundspelets egen takt är 14 s i början).
      if(mode==='zombies'&&zLevel?.patrolEvery&&hunt.active){const zr=journey.rush;if(zr&&zr.state==='playing'){const cap=zr.spent+zLevel.patrolEvery;if(zr.nextPatrol>cap)zr.nextPatrol=cap;}}
      handle(now);
      updateGuide(p,now,dt);
      view.update(p,now,dt);
      if(mode==='rush'&&julrush.active&&now-rushHudAt>60){rushHudAt=now;ui.setRush(julrush.snapshot(),julrush.powers(powerBuf),now);}
      ui.tick(mode==='rush'?julrush.comboView():hunt.run,now);
      if(mode==='zombies')ui.setVitals(journey.health,journey.energy);
      decor?.update(p,now,dt);govern(now);
    });
  }
  // Grundspelets HUD (var 80:e ms): julens text för mål, poäng och kompass skrivs över efter grundspelets.
  function hudText(p,els){
    if(fault||mode==='menu'||placeActive?.())return;
    if(mode==='rush'){ // kompassen pekar på nästa paket (samma mål som den stora pilen och den gröna strålen)
      const t=julrush.running?julrush.target(p):null;els.score.textContent=julrush.tempo.score.toLocaleString('sv-SE');
      if(t){const ang=Math.atan2(t.x-p.x,t.z-p.z)-Math.atan2(host.camera.forward.x,host.camera.forward.z);els.compassArrow.style.transform='rotate('+(-ang*180/Math.PI)+'deg)';els.compassArrow.textContent='↑';els.compassText.textContent=t.label+' · '+Math.round(t.distance)+' M';}
      else{els.compassText.textContent=julrush.running?'LETAR NÄSTA PAKET':'SLUT';els.compassArrow.textContent='⌖';els.compassArrow.style.transform='none';}
      return;
    }
    if(!hunt.run)return;
    const r=hunt.run,t=hunt.target(p);
    els.score.textContent=r.points.toLocaleString('sv-SE');
    if(r.drops&&(r.phase==='free'||r.phase==='collect')&&!r.errand){els.compassText.textContent='LETA SPÅR I SNÖN';els.compassArrow.textContent='⌖';els.compassArrow.style.transform='none';return;} // sök och hitta: ingen kompass mot paketen
    if(t){const ang=Math.atan2(t.x-p.x,t.z-p.z)-Math.atan2(host.camera.forward.x,host.camera.forward.z);els.compassArrow.style.transform='rotate('+(-ang*180/Math.PI)+'deg)';els.compassArrow.textContent='↑';els.compassText.textContent=t.kind==='tomte'?'TILL TOMTEN · '+Math.round(t.distance)+' M':t.label+' · '+Math.round(t.distance)+' M';}
    else{els.compassText.textContent='KLART';els.compassArrow.textContent='⌖';els.compassArrow.style.transform='none';}
  }

  // ── Start ───────────────────────────────────────────────────────────────────────────────────────────────────────
  loadBuildStamp().then(s=>{stamp=s;try{$('xmasBuild').textContent=buildDetail(s);const v=document.querySelectorAll('.game-version');v.forEach(x=>{x.textContent=s.version;});}catch{}});
  ui.renderStart(buildDetail(stamp));
  const api={
    hunt,save,view,ui,sprites,handlers,decor,
    get active(){return mode==='rush'?julrush.active:hunt.active;},get cozy(){return mode==='cozy';},get zombieMode(){return mode==='zombies';},get zombieLevel(){return zLevel;},get rushMode(){return mode==='rush'&&julrush.active;},julrush,
    update,hudText,startRound,startZombies,startRush,openRush,openBoard,challengeGo,rushNext,rushAgain,caught,openShops,onPlaceEvent,runBusy,radar:(c,point,p)=>guard(()=>view.radar(c,point,p)),openMenu,openContinue,startIntro,startFree,goBase,setWeather,
    // Medan ett butiksuppdrag pågår står jaktens tid still (inga nya tappade julklappar, inget som försvinner).
    step:(dt,p,sweep,speed)=>guard(()=>mode==='rush'?julrush.step(dt,p,sweep,speed):hunt.step(placeActive?.()?0:dt,p,sweep,speed)),
    // Grundspelets små pilar på marken och flaggan "DITT MÅL" ritas inte för julens mål (quiet): julbandet, pilen och strålen ersätter dem (i JulRushen pilen och strålen). Radarn och kartan visar vägen som förut.
    objective:p=>{if(fault)return null;const o=mode==='rush'?julrush.objective(p):hunt.objective(p);return o&&o.kind==='xmas'?{...o,quiet:true}:o;},
    guide,guideUi,
    gov,
    snapshot:()=>({mode,fault,gov:{level:gov.level,ema:+gov.ema.toFixed(1),on:gov.on},hunt:hunt.snapshot(),rush:julrush.snapshot(),guide:{on:guide.state.on,id:guide.state.id,label:guide.state.label,distance:guide.state.distance,angle:+guide.state.angle.toFixed(1),hint:guide.state.hint,straight:guide.state.straight,segs:guide.state.segCount,edgeL:guide.state.edgeL,edgeR:guide.state.edgeR,mission:guideUi.missionText},incoming:incoming?{name:incoming.profile.name,focus:incoming.focus,toBeat:incoming.toBeat}:null,pending:pending?{...pending}:null,view:view.snapshot(),decor:decor?decor.snapshot():null,build:stamp,save:{stamps:save.stampCount(),weather:save.weather,intro:save.introDone}}),
    onResultClosed:()=>{resultOpen=false;}
  };
  return api;
}
