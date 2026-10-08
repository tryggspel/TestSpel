// Julklappsjakten: kopplar ihop motorn, vyn, gränssnittet och grundspelets system. Anropas en gång från last-round.js (bara i julbygget).
// Allt här är fail-soft: om något i julkoden skulle kasta stängs jultilläggen av och grundspelet lever vidare (som platskoden i 2.21).
import {registerXmasProps} from './xmas-place-art.js?v=2.21.1-xmas.1';
import {XmasHunt} from './xmas-hunt.mjs?v=2.21.1-xmas.1';
import {XmasSave} from './xmas-save.mjs?v=2.21.1-xmas.1';
import {INTRO,TREE,INTRO_GOAL} from './xmas-layout.mjs?v=2.21.1-xmas.1';
import {baseGameUrl,WEATHER,STAMPS,DELIVERY} from './xmas-config.mjs?v=2.21.1-xmas.1';
import {loadBuildStamp,buildDetail,baseStamp} from './xmas-build.mjs?v=2.21.1-xmas.1';
import {createSprites} from './xmas-sprites.js?v=2.21.1-xmas.1';
import {createXmasView} from './xmas-view.js?v=2.21.1-xmas.1';
import {createXmasUi,mmss} from './xmas-ui.js?v=2.21.1-xmas.1';
import {createXmasDecor} from './xmas-decor.js?v=2.21.1-xmas.1';
import {nextRound,roundById,buildRound} from './xmas-rounds.mjs?v=2.21.1-xmas.1';
import {smoothPath} from '../city-guidance.mjs?v=2.21.1-xmas.1';

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
  const guard=(fn,fallback)=>{if(fault)return fallback;try{return fn();}catch(e){fault=true;console.error('[Jultillägget stängdes av efter fel]',e);try{hunt.cancel('fel');ui.showHud(false);view.clear();document.body.classList.remove('xmas-on','xmas-cozy','xmas-zombies');journey.xmas=null;}catch{}return fallback;}}; // grundspelets HUD och regler tar över igen

  const nav={blocked:(x,z)=>host.blocked(x,z),snap:p=>{try{const q=journey.nav.point(p);return {x:q.x,z:q.z};}catch{return null;}}};
  // Spelets egen gångbara karta för rundorna (rutter, hinder, fri sikt).
  const roundNav={point:p=>journey.nav.point(p),path:(a,b)=>journey.nav.path(a,b),clear:(a,b)=>journey.nav.clear(a,b),blocked:(x,z)=>host.blocked(x,z),smooth:p=>smoothPath(journey.nav,p)};
  const hunt=new XmasHunt({save,nav});
  const sprites=createSprites(pc,host,{texture,root});
  const view=createXmasView(pc,host,{labelTex,root,texture},sprites,hunt);
  let decor=null; // julmiljön: gran, stånd, ljus, tomtar och snöfall. Fail-soft: går något fel i den fortsätter spelet utan.
  try{decor=createXmasDecor(pc,host,{root,texture,labelTex,indoors,params:{weather:save.weather}},sprites);}catch(e){console.error('[Julmiljön hoppades över]',e);}
  const baseUrl=baseGameUrl(location.search,location.hostname);
  let stamp=baseStamp,mode='menu'; // menu | cozy | zombies
  let caughtAt=0;
  // Automatisk lättnad vid segt spel: mäter riktiga bildrutetider (inte spelets klippta dt) och minskar julens effekter ett steg i taget.
  // Av i automatiska tester (navigator.webdriver) och med ?nogov; ?gov tvingar på den. Sparas inte: nästa start prövar full kvalitet igen.
  const gov={ema:16,last:0,slowSec:0,cool:0,on:!!(params&&params.has('gov'))||(!(typeof navigator!=='undefined'&&navigator.webdriver)&&!(params&&params.has('nogov'))),level:0};
  function govern(now){
    if(!gov.on||hunt.run==null)return;
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
  let resultTimer=0,resultOpen=false;

  function goBase(){
    try{save.save();journey.save?.();}catch{}
    location.assign(baseUrl);
  }
  // ── Vad som händer när en körning startar ─────────────────────────────────────────────────────────────────────
  function enter(kind,spawn=null){
    try{dismissPlaceResult?.();}catch{} // grundspelets resultatkort från ett butiksuppdrag ska inte ligga kvar över nästa läge
    const zombies=kind==='zombies';
    mode=zombies?'zombies':'cozy';caughtAt=0;
    document.body.classList.add('xmas-on');document.body.classList.toggle('xmas-cozy',!zombies);document.body.classList.toggle('xmas-zombies',zombies);
    startCity(zombies?'free':'clean');
    if(zombies){ // grundspelets zombieregler (patruller, ambushar, Guld-Nisse, max sex aktiva) men utan kontrakt, kaos, strömavbrott och sol: paketen är målet
      const r=journey.rush;r.nextContract=1e9;r.nextChaos=1e9;r.nextBlackout=1e9;r.ecology.nextSun=1e9;r.nextPatrol=Math.max(r.nextPatrol,9);
    }
    ui.setMode(zombies?'zombies':'cozy');
    try{if(zombies)host.music?.mood?.('eerie');else host.music?.mood?.('cozy',{keep:false});}catch{}
    const {x,z,yaw}=spawn||(kind==='intro'?INTRO.spawn:kind==='free'?freeSpawn():INTRO.spawn);
    host.teleport(x,z,yaw,-4);journey.position={x,z};journey.lastStep=null;journey.heading=yaw;journey.routeMode='hunt';
    ui.showHud(true);
  }
  const freeSpawn=()=>{const p=host.player.getPosition();return {x:p.x,z:p.z,yaw:journey.heading||0};};
  function startIntro(){
    guard(()=>{
      enter('intro');hunt.startIntro();
      toast('JULKLAPPSJAKTEN','Följ paketen runt granen. De syns på långt håll.',3);
      ui.showGoal('Hjälp tomten! Samla 20 paket.',7000);
      ui.setProgress(hunt.run);view.clear();
    });
  }
  function startZombies(){
    guard(()=>{
      enter('zombies',INTRO.spawn);
      hunt.startRun({kind:'zombies',id:'zombies',title:'TOMTEZOMBIES',goal:INTRO_GOAL,packages:INTRO.packages,tomte:INTRO.tomte,spawn:INTRO.spawn,tree:INTRO.tree,windowSec:4.6,soft:0,stampId:'zombies'});
      toast('TOMTEZOMBIES','Samla '+INTRO_GOAL+' paket och lämna dem hos tomten. Tomtezombierna jagar dig: skjut med SOLSTÖT.',4.4);
      ui.showGoal('Samla '+INTRO_GOAL+' paket. Tomtezombierna jagar dig!',7500);
      ui.setProgress(hunt.run);view.clear();
    });
  }
  // Grundspelet anropar detta när liven tar slut i zombieläget. true = hanterat här (ingen återhämtning, run avslutas med ett eget kort).
  function caught(){
    if(mode!=='zombies')return false;
    if(caughtAt)return true;
    const r=hunt.run;if(!r||!hunt.active)return true;
    caughtAt=performance.now();
    const res={kind:'zombies',failed:true,collected:r.collected,goal:r.goal,regularTotal:r.regularTotal,bonusCollected:r.bonusCollected,bonusTotal:r.bonusTotal,bestChain:r.bestChain,seconds:Math.round(r.t),points:r.points};
    hunt.cancel('tagen');journey.pause?.();journey.actors.forEach(a=>{a.active=false;});
    clearTimeout(resultTimer);
    resultTimer=setTimeout(()=>guard(()=>{ui.showResult(res);setPanel('xmas-result');resultOpen=true;}),900);
    return true;
  }
  function startRound(id=null){
    guard(()=>{
      const def=(id&&roundById(id))||nextRound(save);
      const run=buildRound(def,roundNav);
      enter('round',run.spawn);
      hunt.startRun({kind:'round',id:run.id,title:run.title,goal:run.goal,packages:run.packages,tomte:run.tomte,spawn:run.spawn,tree:run.tree,windowSec:run.windowSec,soft:run.soft,stampId:run.stampId});
      toast(def.title,def.blurb,3.6);
      ui.showGoal('Samla '+run.goal+' paket och lämna dem hos tomten.',7500);
      ui.setProgress(hunt.run);view.clear();
    });
  }
  // ── Butiksuppdrag: stämplar och leverans till tomten ────────────────────────────────────────────────────────────────
  // En runda eller introduktionen går före butikerna (annars skulle två uppdrag tävla om samma pil och samma knapp).
  const runBusy=()=>!!hunt.run&&hunt.active&&(hunt.run.kind==='intro'||hunt.run.kind==='round');
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
      if(e.placeId==='pressbyran'){startDelivery(place);return;}
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
      toast('FRI JULVANDRING','Gå runt i julstaden. Tomtarna tappar nya paket här och där: följ pilen.',3.2);
      ui.showHud(true);ui.setProgress(hunt.run);view.clear();
    });
  }
  function openMenu(){
    guard(()=>{
      try{dismissPlaceResult?.();}catch{}hunt.cancel('meny');view.clear();ui.showHud(false);journey.pause?.();mode='menu';caughtAt=0;journey.actors?.forEach(a=>{a.active=false;});document.body.classList.remove('xmas-cozy','xmas-zombies');
      ui.renderStart(buildDetail(stamp));setPanel('xmas-intro');
    });
  }
  function openContinue(){guard(()=>{ui.renderContinue();setPanel('xmas-continue');});}
  function setWeather(level){save.setWeather(level);try{decor?.setWeather(level);}catch(e){console.error(e);}}

  const ui=createXmasUi({save,fx:{
    cozy:()=>{if(save.introDone)openContinue();else startIntro();},
    intro:()=>startIntro(),round:()=>startRound(),shops:()=>openShops(),free:()=>startFree(),zombies:()=>startZombies(),
    openMenu,openContinue,goBase,setWeather
  }});

  // ── Händelser från motorn → ljud, effekter och gränssnitt ──────────────────────────────────────────────────────
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
    'xmas-goal':(e,now)=>{sound('win');[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.28,.08),i*90));ui.showGoal('Bra! Lämna paketen hos tomten.',5500,now);fanfare(e.goal+' PAKET!','Följ pilen till tomten och lämna dem.',2.4,'win');ui.setProgress(hunt.run);},
    'xmas-chain-lost':(e,now)=>{ui.showPill('KEDJAN BRÖTS · '+e.chain+' I RAD',1200,now,'lost');},
    'xmas-rain':(e,now)=>{sound('energy');ui.showGoal('Tomtarna tappade fler paket! Följ pilen.',5200,now);fanfare('PAKETREGN!',e.count+' paket och ett bonuspaket. Följ pilen.',2.6,'energy');},
    'xmas-rain-gone':(e,now)=>{if(e.missed>0)ui.showPill('PAKETREGNET FÖRSVANN',1400,now,'lost');},
    'xmas-late':(e,now)=>{ui.showPill('SEN, MEN DET GÅR ATT LÄMNA IN',2000,now,'lost');},
    'xmas-deliver':(e,now)=>{
      sound('win');[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.34,.09),i*100));
      ui.setProgress(hunt.run);view.burst(hunt.run.tomte.x,hunt.run.tomte.z,{big:true,y:1.4});ui.showGoal('Tack! Du räddade julen.',4000,now);
      clearTimeout(resultTimer);
      resultTimer=setTimeout(()=>guard(()=>{journey.pause?.();ui.showResult(e.result);setPanel('xmas-result');resultOpen=true;}),1400);
    }
  };
  const handle=(now)=>{for(const e of hunt.drain())handlers[e.type]?.(e,now);};

  // ── Varje bildruta ──────────────────────────────────────────────────────────────────────────────────────────────
  function update(p,now,dt){
    guard(()=>{
      handle(now);
      view.update(p,now,dt);
      ui.tick(hunt.run,now);
      if(mode==='zombies')ui.setVitals(journey.health,journey.energy);
      decor?.update(p,now,dt);govern(now);
    });
  }
  // Grundspelets HUD (var 80:e ms): julens text för mål, poäng och kompass skrivs över efter grundspelets.
  function hudText(p,els){
    if(fault||mode==='menu'||!hunt.run||placeActive?.())return;
    const r=hunt.run,t=hunt.target(p);
    els.score.textContent=r.points.toLocaleString('sv-SE');
    if(t){const ang=Math.atan2(t.x-p.x,t.z-p.z)-Math.atan2(host.camera.forward.x,host.camera.forward.z);els.compassArrow.style.transform='rotate('+(-ang*180/Math.PI)+'deg)';els.compassArrow.textContent='↑';els.compassText.textContent=t.kind==='tomte'?'TILL TOMTEN · '+Math.round(t.distance)+' M':t.label+' · '+Math.round(t.distance)+' M';}
    else{els.compassText.textContent=r.kind==='free'?'VÄNTA PÅ PAKETREGN':'KLART';els.compassArrow.textContent='⌖';els.compassArrow.style.transform='none';}
  }

  // ── Start ───────────────────────────────────────────────────────────────────────────────────────────────────────
  loadBuildStamp().then(s=>{stamp=s;try{$('xmasBuild').textContent=buildDetail(s);const v=document.querySelectorAll('.game-version');v.forEach(x=>{x.textContent=s.version;});}catch{}});
  ui.renderStart(buildDetail(stamp));
  const api={
    hunt,save,view,ui,sprites,handlers,decor,
    get active(){return hunt.active;},get cozy(){return mode==='cozy';},get zombieMode(){return mode==='zombies';},
    update,hudText,startRound,startZombies,caught,openShops,onPlaceEvent,runBusy,radar:(c,point,p)=>guard(()=>view.radar(c,point,p)),openMenu,openContinue,startIntro,startFree,goBase,setWeather,
    step:(dt,p,sweep,speed)=>guard(()=>hunt.step(dt,p,sweep,speed)),
    objective:p=>fault?null:hunt.objective(p),
    gov,
    snapshot:()=>({mode,fault,gov:{level:gov.level,ema:+gov.ema.toFixed(1),on:gov.on},hunt:hunt.snapshot(),view:view.snapshot(),decor:decor?decor.snapshot():null,build:stamp,save:{stamps:save.stampCount(),weather:save.weather,intro:save.introDone}}),
    onResultClosed:()=>{resultOpen=false;}
  };
  return api;
}
