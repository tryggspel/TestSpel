// Julklappsjakten: kopplar ihop motorn, vyn, gränssnittet och grundspelets system. Anropas en gång från last-round.js (bara i julbygget).
// Allt här är fail-soft: om något i julkoden skulle kasta stängs jultilläggen av och grundspelet lever vidare (som platskoden i 2.21).
import {XmasHunt} from './xmas-hunt.mjs?v=2.21.1-xmas.1';
import {XmasSave} from './xmas-save.mjs?v=2.21.1-xmas.1';
import {INTRO,TREE} from './xmas-layout.mjs?v=2.21.1-xmas.1';
import {baseGameUrl,WEATHER,STAMPS,DELIVERY} from './xmas-config.mjs?v=2.21.1-xmas.1';
import {loadBuildStamp,buildDetail,baseStamp} from './xmas-build.mjs?v=2.21.1-xmas.1';
import {createSprites} from './xmas-sprites.js?v=2.21.1-xmas.1';
import {createXmasView} from './xmas-view.js?v=2.21.1-xmas.1';
import {createXmasUi,mmss} from './xmas-ui.js?v=2.21.1-xmas.1';
import {createXmasDecor} from './xmas-decor.js?v=2.21.1-xmas.1';

// Julbygget har inga termosar, hemligheter eller skatter: paketen ersätter dem. Anropas direkt efter att resan skapats, innan någon vy ritas.
export function prepareXmasJourney(journey){
  try{journey.items.length=0;journey.treasures.length=0;journey.secrets.length=0;journey.itemById?.clear?.();journey.xmasPrepared=true;}
  catch(e){console.error('[Jul] kunde inte tömma termosarna]',e);}
}

export function installXmas(ctx){
  const {pc,host,journey,root,$,texture,labelTex,toast,fanfare,sound,note,setPanel,startCity,pause,resume,isPlaying,placeActive,indoors,params,storage}=ctx;
  const save=new XmasSave(storage);
  let fault=false;
  const guard=(fn,fallback)=>{if(fault)return fallback;try{return fn();}catch(e){fault=true;console.error('[Jultillägget stängdes av efter fel]',e);try{hunt.cancel('fel');ui.showHud(false);view.clear();document.body.classList.remove('xmas-cozy');}catch{}return fallback;}};

  const nav={blocked:(x,z)=>host.blocked(x,z),snap:p=>{try{const q=journey.nav.point(p);return {x:q.x,z:q.z};}catch{return null;}}};
  const hunt=new XmasHunt({save,nav});
  const sprites=createSprites(pc,host,{texture,root});
  const view=createXmasView(pc,host,{labelTex,root,texture},sprites,hunt);
  let decor=null; // julmiljön: gran, stånd, ljus, tomtar och snöfall. Fail-soft: går något fel i den fortsätter spelet utan.
  try{decor=createXmasDecor(pc,host,{root,texture,labelTex,indoors,params:{weather:save.weather}},sprites);}catch(e){console.error('[Julmiljön hoppades över]',e);}
  const baseUrl=baseGameUrl(location.search,location.hostname);
  let stamp=baseStamp,mode='menu'; // menu | cozy | zombies
  let resultTimer=0,resultOpen=false;

  function goBase(){
    try{save.save();journey.save?.();}catch{}
    location.assign(baseUrl);
  }
  // ── Vad som händer när en körning startar ─────────────────────────────────────────────────────────────────────
  function enter(kind){
    mode='cozy';document.body.classList.add('xmas-on','xmas-cozy');
    startCity('clean');
    const {x,z,yaw}=kind==='intro'?INTRO.spawn:kind==='free'?freeSpawn():INTRO.spawn;
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
      hunt.cancel('meny');view.clear();ui.showHud(false);journey.pause?.();
      ui.renderStart(buildDetail(stamp));setPanel('xmas-intro');
    });
  }
  function openContinue(){guard(()=>{ui.renderContinue();setPanel('xmas-continue');});}
  function setWeather(level){save.setWeather(level);try{decor?.setWeather(level);}catch(e){console.error(e);}}

  const ui=createXmasUi({save,fx:{
    cozy:()=>{if(save.introDone)openContinue();else startIntro();},
    intro:()=>startIntro(),round:()=>ctx.startRound?.(),shops:()=>ctx.openShops?.(),free:()=>startFree(),zombies:()=>ctx.startZombies?.(),
    openMenu,openContinue,goBase,setWeather
  }});

  // ── Händelser från motorn → ljud, effekter och gränssnitt ──────────────────────────────────────────────────────
  const chainFreq=chain=>[523.25,587.33,659.25,698.46,783.99,880,987.77,1046.5][Math.min(7,Math.max(0,chain-1))]||1046.5;
  const handlers={
    'xmas-start':(e,now)=>{ui.setProgress(hunt.run);},
    'xmas-pick':(e,now)=>{
      const mult=e.mult>1?' ×'+e.mult:'';
      if(e.kind==='bonus'){[659.25,880,1174.66,1568].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.22,.08),i*70));view.burst(e.x,e.z,{big:true});ui.showPill('BONUSPAKET! +'+e.points,1500,now,'bonus');}
      else{note(chainFreq(e.chain),'triangle',.16,.075);setTimeout(()=>note(chainFreq(e.chain)*1.5,'sine',.2,.04),55);view.burst(e.x,e.z);ui.showPill('+'+e.points+(e.chain>=2?' · KOMBO '+e.chain+mult:''),1000,now);}
      if(e.praise){fanfare(e.praise,'+'+e.tierBonus+' poäng',1.3,'chain');}
      ui.setProgress(hunt.run);
    },
    'xmas-goal':(e,now)=>{sound('win');[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.28,.08),i*90));ui.showGoal('Bra! Lämna paketen hos tomten.',5500,now);fanfare('20 PAKET!','Följ pilen till tomten och lämna dem.',2.4,'win');ui.setProgress(hunt.run);},
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
      decor?.update(p,now,dt);
    });
  }
  // Grundspelets HUD (var 80:e ms): julens text för mål, poäng och kompass skrivs över efter grundspelets.
  function hudText(p,els){
    if(fault||mode!=='cozy'||!hunt.run||placeActive?.())return;
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
    get active(){return hunt.active;},get cozy(){return mode==='cozy';},
    update,hudText,radar:(c,point,p)=>guard(()=>view.radar(c,point,p)),openMenu,openContinue,startIntro,startFree,goBase,setWeather,
    step:(dt,p,sweep,speed)=>guard(()=>hunt.step(dt,p,sweep,speed)),
    objective:p=>fault?null:hunt.objective(p),
    snapshot:()=>({mode,fault,hunt:hunt.snapshot(),view:view.snapshot(),decor:decor?decor.snapshot():null,build:stamp,save:{stamps:save.stampCount(),weather:save.weather,intro:save.introDone}}),
    onResultClosed:()=>{resultOpen=false;}
  };
  return api;
}
