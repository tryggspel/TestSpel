// Julklappsjakten: kopplar ihop motorn, vyn, gränssnittet och grundspelets system. Anropas en gång från last-round.js (bara i julbygget).
// Allt här är fail-soft: om något i julkoden skulle kasta stängs jultilläggen av och grundspelet lever vidare (som platskoden i 2.21).
import {registerXmasProps} from './xmas-place-art.js?v=2.21.1-xmas.13';
import {XmasHunt} from './xmas-hunt.mjs?v=2.21.1-xmas.13';
import {XmasGuide,missionView} from './xmas-guide.mjs?v=2.21.1-xmas.13';
import {createGuideUi} from './xmas-guide-ui.js?v=2.21.1-xmas.13';
import {XmasRush} from './xmas-rush.mjs?v=2.21.1-xmas.13';
import {XmasSave} from './xmas-save.mjs?v=2.21.1-xmas.13';
import {rushDef,isUnlocked,nextRush,goalText} from './xmas-rushes.mjs?v=2.21.1-xmas.13';
import {decodeChallenge,tokenFromSearch,versus} from './xmas-board.mjs?v=2.21.1-xmas.13';
import {INTRO,TREE,INTRO_GOAL} from './xmas-layout.mjs?v=2.21.1-xmas.13';
import {baseGameUrl,WEATHER,STAMPS,DELIVERY} from './xmas-config.mjs?v=2.21.1-xmas.13';
import {loadBuildStamp,buildDetail,baseStamp} from './xmas-build.mjs?v=2.21.1-xmas.13';
import {createSprites} from './xmas-sprites.js?v=2.21.1-xmas.13';
import {createXmasView} from './xmas-view.js?v=2.21.1-xmas.13';
import {createXmasUi,mmss} from './xmas-ui.js?v=2.21.1-xmas.13';
import {createXmasDecor} from './xmas-decor.js?v=2.21.1-xmas.13';
import {createXmasLight} from './xmas-light.js?v=2.21.1-xmas.13';
import {LIGHT_MODES} from './xmas-light.mjs?v=2.21.1-xmas.13';
import {nextRound,roundById,buildRound,buildSearch,INTRO_SEARCH} from './xmas-rounds.mjs?v=2.21.1-xmas.13';
import {zombieLevel,nextZombieLevel,isZombieUnlocked,ZOMBIE_MAX} from './xmas-zombie-levels.mjs?v=2.21.1-xmas.13';
import {smoothPath} from '../city-guidance.mjs?v=2.21.1-xmas.13';
import {HARBOUR,atMarieberg} from '../city-south-space.mjs?v=2.21.1-xmas.13';
import {SANDGRUND,sandgrundOutcome,sandgrundLine} from './xmas-sandgrund.mjs?v=2.21.1-xmas.13';
import {BOAT,buildMarieberg,boatBonus} from './xmas-marieberg.mjs?v=2.21.1-xmas.13';
import {parseLink,describeLink,LINK_PARAM,DOOR_PARAM} from './xmas-deeplink.mjs?v=2.21.1-xmas.13';
import {doorBox,resultMatches} from './xmas-door.mjs?v=2.21.1-xmas.13';
import {XmasMeta} from './xmas-meta.mjs?v=2.21.1-xmas.13';
import {PRIZE} from './xmas-meta-config.mjs?v=2.21.1-xmas.13';
import {hiddenPackages,nearestHidden,warmth,hiddenSpot} from './xmas-hidden.mjs?v=2.21.1-xmas.13';
import {TERMOS,goalFor as termosGoalFor} from './xmas-termos.mjs?v=2.21.1-xmas.13';
import {DAILY} from './xmas-daily-config.mjs?v=2.21.1-xmas.13';
import {dailyFor,isDailyId,dailyWarmth,hintLevel} from './xmas-daily.mjs?v=2.21.1-xmas.13';
import {COTTAGE} from './xmas-market-data.mjs?v=2.21.1-xmas.13';
import {DOORS} from '../julkalender/doors.mjs?v=2.21.1-xmas.13';
import {GAME_SAVE_KEY,STORAGE_KEY as CALENDAR_KEY,readGame,evaluate,hasAutoCheck,metricsOf} from '../julkalender/rules.mjs?v=2.21.1-xmas.13';

// Julbygget har inga termosar, hemligheter eller skatter: paketen ersätter dem. Anropas direkt efter att resan skapats, innan någon vy ritas.
export function prepareXmasJourney(journey){
  try{journey.items.length=0;journey.treasures.length=0;journey.secrets.length=0;journey.itemById?.clear?.();journey.xmasPrepared=true;}
  catch(e){console.error('[Jul] kunde inte tömma termosarna]',e);}
}

export function installXmas(ctx){
  const {pc,host,journey,root,$,texture,labelTex,toast,fanfare,sound,note,setPanel,startCity,pause,resume,isPlaying,placeActive,indoors,openPass,dismissPlaceResult,params,storage,startMission,boardBoat,boatActive,explore}=ctx;
  registerXmasProps();
  const save=new XmasSave(storage);
  // Framstegen (xmas-meta.mjs): grad, julgran, dagliga uppdrag, serie, lotter, gömda julklappar. Alltid fail-soft: går något fel där fortsätter jakten utan dem.
  const meta=new XmasMeta({storage});
  const M=(fn,fallback=null)=>{try{return fn();}catch(e){console.error('[Framstegen]',e);return fallback;}};
  const newsRaw=[]; // nyheter sedan sist som visas överst på nästa meny: {R,label}
  M(()=>{const R=meta.adopt({introDone:save.introDone,zombies:save.zombies.cleared,rush:save.rush.cleared});if(R)newsRaw.push({R,label:'VÄLKOMMEN TILLBAKA'});});
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
  // Ljuset (xmas-light.js): dag, skymning och kväll efter klockan i Karlstad, eller spelarens fasta val. ?ljus=dag|skymning|kvall|auto gäller bara den här sidvisningen och sparas inte.
  const ljusParam=params?.get?.('ljus');
  // Insamlingen på Stora Torget: räkneverket visar alla termosar spelaren plockat i Termosjakten (xmas-termos.mjs).
  const syncDonations=()=>{try{decor?.market?.setDonations?.(save.termos?.total||0);}catch(e){console.error(e);}};
  syncDonations();
  let light=null;try{light=createXmasLight(pc,host,{decor,mode:LIGHT_MODES.includes(ljusParam)?ljusParam:save.light});}catch(e){console.error('[Ljuset hoppades över]',e);}
  const baseUrl=baseGameUrl(location.search,location.hostname);
  let stamp=baseStamp,mode='menu'; // menu | cozy | zombies | rush | mission (Julvernissagen) | boat (Julbåten, tills båten lagt till)
  let boatInfo=null; // båtresans resultat (räddade, poäng) som följer med jakten i Mariebergsskogen
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
  // Djuplänk (xmas-deeplink.mjs): ?uppdrag=sandgrund&lucka=6 visar ett kort med uppdraget när menyn öppnas första gången. En utmaningslänk går före (den kommer från en vän och har ingen lucka).
  // link = länken som väntar på menyn, pendingLink = kortet som visas just nu.
  let link=null,pendingLink=null,linkBad=false;
  // Luckan man kom från (djuplänkens kort, när man tryckt STARTA): när just det uppdraget är klart visas rutan "Lucka N är avklarad" (xmas-door.mjs). Nollas när man går till menyn.
  let doorLink=null;
  const doorFor=res=>{try{return doorLink&&resultMatches(doorLink.gives,res)?doorBox({door:doorLink.door,state:save.state,points:res.points||0}):null;}catch{return null;}};
  // ── Framstegen: belöningar efter varje körning ──────────────────────────────────────────────────────────────────────────────────────────────
  const AREA={intro:'torget','round-torget':'torget','round-kungsgatan':'kungsgatan','round-drottninggatan':'drottninggatan',marieberg:'marieberg'};
  // Julkalenderns luckor: samma villkor som kalendern själv (julkalender/rules.mjs: evaluate) mot spelets sparning och kalenderns baslinje (skrivskyddat: kalendern och julspelet ändras inte).
  // Luckan ger sin belöning när kalendern skulle räkna den som klar och dagen har kommit (xmas-meta.mjs: syncCalendar).
  function syncDoors(){
    return M(()=>{
      const game=readGame({getItem:k=>k===GAME_SAVE_KEY?JSON.stringify(save.state):null});
      let base=null;try{const c=JSON.parse(storage.getItem(CALENDAR_KEY)||'null');if(c&&c.version===1&&c.baseline&&typeof c.baseline==='object')base=c.baseline;}catch{}
      const baseline=base||metricsOf(game); // inget besök i kalendern än: räknare mäts från nu, så ingen lucka blir klar av gammal statistik
      return meta.syncCalendar(n=>{const d=DOORS[n-1];return !!d&&hasAutoCheck(d.check)&&evaluate(d.check,game,baseline).done;});
    });
  }
  // Ett resultat från spelet som en körning för framstegen (xmas-meta.mjs: onRun). null = räknas inte.
  function metaRun(res){
    switch(res.kind){
      case 'intro':case 'round':case 'marieberg':return {kind:'hunt',id:res.id,cleared:true,packages:res.collected,bonus:res.bonusCollected,chain:res.bestChain,seconds:res.seconds,area:AREA[res.id]||''};
      case 'delivery':case 'place':return {kind:'place',id:res.id,cleared:true,first:!!res.stamp};
      case 'zombies':return {kind:'zombies',id:'zombies',cleared:!res.failed,level:res.level,packages:res.collected,bonus:res.bonusCollected,chain:res.bestChain,seconds:res.seconds,countPackages:!res.failed};
      case 'rush':{if(res.skin==='termos')return {kind:'termos',id:'termos',cleared:true,tempo:res.level,packages:res.collected,bonus:0,chain:res.bestChain,seconds:res.seconds,goalNow:!!res.termos?.goalNow};
        const k=res.rush;return {kind:'rush',id:k?'rush-'+k.n:'maraton',cleared:!!(k&&k.cleared),level:k?k.n:0,stars:k?k.stars:0,tempo:res.level,packages:res.collected,bonus:0,chain:res.bestChain,seconds:res.seconds};}
      default:return null;
    }
  }
  // Delar ut belöningen för ett resultat och lägger den på resultatet (res.meta) så att slutkortet kan visa den. Anropas högst en gång per körning.
  function giveMeta(res){
    const run=metaRun(res);if(!run)return res;
    const R=M(()=>meta.onRun(run));if(!R)return res;
    const cal=run.cleared?syncDoors():null;
    res.meta={R,cal,status:M(()=>meta.status()),goal:M(()=>meta.nextGoal(undefined,{tickets:PRIZE.enabled}))};
    return res;
  }
  // Det som händer mitt i en vandring (uppdrag klart, ny grad, lott, prydnad): en rad i taget efter fyndets egen puff. skip = sådant som redan sagts.
  function announce(R,{skip=[]}={}){
    const lines=[];
    for(const l of R.levelUps)lines.push({text:'GRAD '+l.n+' · '+l.name+'!',big:true});
    for(const m of R.missions)lines.push({text:'UPPDRAG KLART · +'+m.xp+' XP'});
    if(R.gift)lines.push({text:'DAGENS JULKLAPP ÖPPNAD!',big:true});
    if(!skip.includes('orn'))for(const o of R.ornaments)lines.push({text:(o.isNew?'NY PRYDNAD · ':'DUBBLETT · ')+o.name.toUpperCase()});
    if(PRIZE.enabled&&!skip.includes('ticket'))for(const t of R.tickets)lines.push({text:'NY LOTT · '+t.code});
    lines.slice(0,4).forEach((l,i)=>setTimeout(()=>guard(()=>{
      if(mode!=='cozy'||!hunt.active)return;
      if(l.big){try{sound('win');}catch{}}
      ui.showPill(l.text,1800,performance.now(),'bonus');
    }),700+i*1900));
  }
  // Nyheter sedan sist (luckor som blivit klara, ett hemligt paket): en rad var överst på menyn, en gång.
  function flushNews(){
    const items=[];
    for(const n of newsRaw.splice(0)){
      if(n.text){items.push({kind:n.kind||'',text:n.text});continue;}
      const R=n.R;
      if(R.calendar&&R.calendar.length){
        for(const c of R.calendar){const bits=[...c.ornaments.map(o=>(o.isNew?'ny prydnad ':'dubblett ')+o.name),...(PRIZE.enabled&&c.tickets.length?[c.tickets.length+' '+(c.tickets.length===1?'lott':'lotter')]:[]),...(c.xp?['+'+c.xp+' XP']:[])];items.push({kind:'door',text:'LUCKA '+c.n+' ÄR KLAR · '+(bits.join(' · ')||'tack!')});}
      }else{
        const bits=ui.meta?ui.meta.describe(R).map(x=>x.text):[];if(bits.length)items.push({kind:'welcome',text:(n.label?n.label+' · ':'')+bits.join(' · ')});
      }
    }
    M(()=>ui.meta?.setNews(items));
  }
  // Butiksuppdrag (Cervera, och Pressbyrån när leveransen sker mitt i en jakt) har inget eget resultatkort i julbygget: grundspelets lilla kort döljs (xmas.css) och det här visas i julens färger,
  // med rutan "Lucka N är avklarad" om man kom från kalendern. Spelet pausas och FORTSÄTT JULVANDRINGEN tar upp det där man var.
  const PLACE_TITLES={cervera:'FIKABORDET ÄR DUKAT!',pressbyran:'FIKAT ÄR LEVERERAT!'};
  function showPlaceDone(i){
    guard(()=>{
      const res={kind:'place',id:i.placeId,stampId:i.placeId,title:PLACE_TITLES[i.placeId]||'UPPDRAGET ÄR KLART!',line:i.line||'',points:i.points||0,stamp:!!i.first,seconds:i.seconds||0,mistakes:i.mistakes};
      res.door=doorFor(res);giveMeta(res);
      clearTimeout(resultTimer);
      resultTimer=setTimeout(()=>guard(()=>{try{dismissPlaceResult?.();}catch{}journey.pause?.();ui.showResult(res);setPanel('xmas-result');resultOpen=true;}),i.delay??800);
    });
  }
  function placeResume(){guard(()=>{resultOpen=false;ui.placeDoor(null);if(mode==='cozy')resume?.();else openMenu();});}
  try{
    const l=parseLink(location.search);
    if(l){if(!incoming&&!badLink)link=l;const u=new URL(location.href);u.searchParams.delete(LINK_PARAM);u.searchParams.delete(DOOR_PARAM);history.replaceState(null,'',u.pathname+u.search+u.hash);}
  }catch{}
  // Hemligt paket (?paket=KOD, QR på en affisch): koden löses in första gången menyn öppnas, aldrig mitt i en jakt. Adressen städas så att en omladdning inte löser in den igen.
  let pendingCode='';
  try{const q=new URLSearchParams(location.search).get('paket');if(q){pendingCode=q;const u=new URL(location.href);u.searchParams.delete('paket');history.replaceState(null,'',u.pathname+u.search+u.hash);}}catch{}
  const guideUi=createGuideUi({});

  function goBase(){
    try{save.save();journey.save?.();}catch{}
    location.assign(baseUrl);
  }
  // ── Vad som händer när en körning startar ─────────────────────────────────────────────────────────────────────
  function enter(kind,spawn=null){
    try{dismissPlaceResult?.();}catch{} // grundspelets resultatkort från ett butiksuppdrag ska inte ligga kvar över nästa läge
    clearTimeout(resultTimer); // ett resultatkort som väntar på sin tur (butiksuppdrag, leverans) hör till körningen som precis slutade
    const zombies=kind==='zombies',rushing=kind==='rush';
    leaveRush();if(!rushing)restoreTurbo();zombieTune.off();if(!zombies)zLevel=null;
    mode=zombies?'zombies':rushing?'rush':'cozy';caughtAt=0;
    document.body.classList.remove('xmas-mission');document.body.classList.add('xmas-on');document.body.classList.toggle('xmas-cozy',!zombies);document.body.classList.toggle('xmas-zombies',zombies);document.body.classList.toggle('xmas-rush',rushing);
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
  // Fri julvandring börjar där man står, utom i Mariebergsskogen (utanför stadens gångbara karta): därifrån börjar den vid granen.
  const freeSpawn=()=>{const p=host.player.getPosition();return atMarieberg(p)?INTRO.spawn:{x:p.x,z:p.z,yaw:journey.heading||0};};
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
  // skin 'termos': Termosjakten (maratonet med termosar, xmas-termos.mjs). Bara med n = 0.
  function startRush(n=0,series=null,skin='paket'){
    guard(()=>{
      const def=n?rushDef(n):null,termos=!def&&skin==='termos';
      if(n&&(!def||!isUnlocked(save.rush,n))){openRush();return;}
      hunt.cancel('rush');enter('rush',rushSpawn());julrush.start({def,hearts:series?.hearts||3,streak:series?.streak||0,skin:termos?'termos':'paket',day:M(()=>meta.today(),'')||''});
      try{const was=ctx.setTurbo?.(true);if(turboBefore==null&&typeof was==='boolean')turboBefore=was;}catch{} // klockan är räknad på turbons fart: den slås på av sig själv (man kan stänga av den, men då hinner man inte långt)
      try{host.music?.tempo?.(def?Math.min(1.35,1+.03*(def.tempo-1)):1);}catch{}
      if(termos){
        const g=termosGoalFor(M(()=>meta.today(),'')||''),td=save.termosDay(M(()=>meta.today(),'')||'');
        toast('TERMOSJAKTEN','Följ pilen och den gröna strålen till nästa termos. Tempot stiger var 12:e sekund och klockan blir trängre. Dagens mål: '+g.text.toLowerCase()+(td.goal?' (klart!)':'')+'.',4);
        ui.showGoal('Hinn fram till nästa termos före klockan!',5500);
      }else
      toast(def?'RUSH '+def.n+' · '+def.name:'JULRUSHEN · MARATON',def?goalText(def)+'. Följ pilen och den gröna strålen. Turbon är på.':'Följ pilen och den gröna strålen till nästa paket. Tempot stiger var 12:e sekund och klockan blir trängre. Turbon är på.',3.6);
      if(!termos)ui.showGoal(def?goalText(def)+'!':'Följ pilen: hinn fram före klockan!',5500);
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
    giveMeta(res);
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
  // ── Julvernissagen (Sandgrund) och Julbåten (Mariebergsskogen): grundspelets uppdrag i julens meny (2.21.1-xmas.7) ──────────────────────────────────
  // Allt som körs mellan två lägen: städa det förra läget utan att öppna en panel (openMenu gör det med panel).
  function quietLeave(){
    try{dismissPlaceResult?.();}catch{}
    clearTimeout(resultTimer);resultOpen=false;
    if(julrush.active)julrush.quit();
    hunt.cancel('uppdrag');leaveRush();restoreTurbo();zombieTune.off();try{host.music?.tempo?.(1);}catch{}
    view.clear();ui.showHud(false);guide.reset();guideUi.show(false);view.setGuide(null);guideShown=false;caughtAt=0;boatInfo=null;journey.actors?.forEach(a=>{a.active=false;});
  }
  // Sandgrund: grundspelets uppdrag "Vernissage från graven" (besökare att leda till grönt, Zombie-Lerin att stoppa). Grundspelets uppdrags-HUD gäller (därför tas xmas-on bort); vid seger delas julstämpeln ut.
  function startSandgrund(){
    guard(()=>{
      quietLeave();mode='mission';
      document.body.classList.remove('xmas-on','xmas-cozy','xmas-zombies','xmas-rush');document.body.classList.add('xmas-mission');
      startMission(SANDGRUND.id);
    });
  }
  // Grundspelet anropar detta när uppdraget är slut (last-round.js: finish). Bara en vunnen omgång på riktigt räknas; övning och förlust ger inget.
  function missionDone(r){
    return guard(()=>{
      if(mode!=='mission'||!r||r.id!==SANDGRUND.id)return false;
      const o=sandgrundOutcome(r,{hadStamp:save.hasStamp(SANDGRUND.id)});
      const leave=document.getElementById('roundLeave');if(leave)leave.textContent='Tillbaka till Julmenyn';
      const det=document.getElementById('roundResultDetail');if(det)det.textContent=(r.rescued||0)+'/3 besökare räddade · '+(r.accuracy||0)+'% träffsäkerhet · bästa kedja '+(r.bestChain||0)+'×'; // grundspelets rad nämner kaffepoäng till en stadsvandring som inte finns i julspelet
      if(!o.count){ui.placeDoor(null);M(()=>ui.meta?.placeReward(null));return true;}
      if(o.stamp)save.stamp(SANDGRUND.id);
      save.record(SANDGRUND.id,{points:r.score,seconds:r.seconds,packages:r.rescued,bonus:0});
      save.addTotals({points:o.points});
      const line=sandgrundLine(o,{label:STAMPS.find(s=>s.id===SANDGRUND.id)?.label||''}),t=document.getElementById('roundResultTarget');
      if(t&&line)t.textContent=line;
      ui.placeDoor(doorFor({id:SANDGRUND.id,stampId:SANDGRUND.id,points:o.points}),document.getElementById('round-result'),document.getElementById('roundNext')); // rutan "Lucka N är avklarad" om man kom från kalendern
      M(()=>{const R=meta.onRun({kind:'sandgrund',id:SANDGRUND.id,cleared:true,first:!!o.stamp}),cal=syncDoors();ui.meta?.placeReward({R,cal,status:meta.status(),goal:meta.nextGoal(undefined,{tickets:PRIZE.enabled})},document.getElementById('round-result'),document.getElementById('roundNext'));});
      if(o.stamp)try{sound('win');}catch{}
      return true;
    },false);
  }
  // "Tillbaka" på uppdragets resultatkort: tillbaka till Julmenyn (i stället för grundspelets stadsvandring).
  function afterMission(){
    if(mode!=='mission')return false;
    return guard(()=>{explore();openMenu();openContinue();return true;},false);
  }
  // Julbåten: grundspelets båtbuss från Inre hamn (36 s, räddningstur med passagerare). Vid ankomsten börjar paketjakten i Mariebergsskogen.
  function startBoat(){
    guard(()=>{
      quietLeave();mode='boat';
      document.body.classList.remove('xmas-cozy','xmas-zombies','xmas-rush','xmas-mission');document.body.classList.add('xmas-on');
      startCity('free');
      const r=journey.rush;r.nextContract=1e9;r.nextChaos=1e9;r.nextBlackout=1e9;r.ecology.nextSun=1e9;r.nextPatrol=1e9; // inga tomtezombier: resan och jakten är fredliga, bara båtens passagerare ska räddas
      host.teleport(HARBOUR.x,HARBOUR.z,180,-2);journey.position={x:HARBOUR.x,z:HARBOUR.z};journey.lastStep=null;journey.heading=180;journey.routeMode='hunt';
      try{host.music?.mood?.('eerie');}catch{}
      boardBoat();
      if(!boatActive()){toast('BÅTBUSSEN','Båten gick inte att kliva på. Försök igen från Julmenyn.',3.4);openMenu();openContinue();}
    });
  }
  // Grundspelet anropar detta när båten lagt till. true = hanterat här (ingen grundspelsbelöning); jakten i parken börjar.
  function boatArrive(result){
    if(mode!=='boat'||!result||result.calm)return false;
    guard(()=>startMarieberg(boatBonus(result)));
    return true;
  }
  function boatAbort(){
    if(mode!=='boat')return false;
    guard(()=>{openMenu();openContinue();});
    return true;
  }
  function startMarieberg(info){
    const def=buildMarieberg({blocked:(x,z)=>host.blocked(x,z)});
    if(!def.ok){toast('MARIEBERGSSKOGEN','Parken gick inte att nå från bryggan. Försök igen från Julmenyn.',3.6);openMenu();openContinue();return;}
    enter('marieberg',def.spawn);boatInfo=info;
    hunt.startRun({kind:'marieberg',id:BOAT.id,title:BOAT.title,goal:def.goal,packages:def.packages,tomte:def.tomte,spawn:def.spawn,tree:null,windowSec:BOAT.windowSec,soft:0,stampId:BOAT.id,ordered:false,
      extra:info.points,extraLabel:'BÅTRESAN'});
    toast('FRAMME I MARIEBERGSSKOGEN',(info.saved?'Du räddade '+info.saved+' av 12 passagerare. ':'')+'Hämta '+def.goal+' julklappar i parken och lämna dem hos tomten vid bryggan.',4.6);
    ui.showGoal('Hämta '+def.goal+' julklappar i Mariebergsskogen!',7500);
    ui.setProgress(hunt.run);view.clear();
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
      showPlaceDone({placeId:e.placeId,points:e.points||0,first,line:e.line,seconds:e.seconds,mistakes:e.mistakes});
    });
  }
  function openShops(){
    guard(()=>{
      startFree();
      setTimeout(()=>guard(()=>{try{openPass?.();}catch(err){console.error(err);}}),60);
    });
  }
  // Dagens julklapp (xmas-daily.mjs) ligger alltid gömd i fri julvandring tills den är hittad, så den går att snubbla över. Med DAGENS JULKLAPPSJAKT (startDaily) börjar man vid
  // tomtens stuga på Torget med dagens gåta, och hjälpen kommer efter hand: områdets namn, sedan pilen till området.
  let daily=null; // {def, t0, level, band, said, found}
  const todayKey=()=>M(()=>meta.today(),'')||'';
  function addDaily(){
    const def=dailyFor(todayKey());if(!def||M(()=>meta.dailyFound(),false))return null;
    M(()=>hunt.addHidden([{id:def.id,spot:'daily',x:def.spot.x,z:def.spot.z}]));return def;
  }
  function startFree(opts={}){
    guard(()=>{
      const keep=!opts.spawn&&mode==='cozy'&&isPlaying();
      if(!keep)enter('free',opts.spawn||null);else{setPanel(null);resume?.();}
      hunt.startFree();setPanel(null);
      M(()=>{hunt.addHidden(hiddenPackages(meta.state.hidden));hiddenBand='cold';});
      const dd=addDaily();daily=opts.daily&&dd?{def:dd,t0:performance.now(),level:1,band:'cold',said:0,found:false}:null;
      if(daily){
        const d=daily.def;
        toast('DAGENS JULKLAPPSJAKT','"'+d.area.riddle+'"'+(d.note?' '+d.note:''),6.5);
        ui.showGoal('Lös gåtan och hitta dagens julklapp. Det blir varmare när du närmar dig.',7000);
      }else{
        const clue=M(()=>{const h=meta.status().hidden;const open=h.hints.filter(x=>x.visible&&!x.found);return open.length?open[open.length-1].clue:'';},'');
        toast('FRI JULVANDRING','Tomtarna tappar julklappar här och där i staden. Leta efter deras spår i snön och följ dem.'+(clue?' Gömd julklapp: "'+clue+'"':''),clue?5.6:4);
      }
      ui.showHud(true);ui.setProgress(hunt.run);view.clear();
    });
  }
  // DAGENS JULKLAPPSJAKT: start vid tomtens stuga, vänd mot dagens område. Redan hittad: fri julvandring och ett besked om när nästa göms.
  function startDaily(){
    guard(()=>{
      const def=dailyFor(todayKey());
      if(!def||M(()=>meta.dailyFound(),false)){toast('DAGENS JULKLAPP','Du har redan hittat dagens julklapp. En ny göms i natt, någon annanstans i Karlstad.',3.6);startFree();return;}
      const x=COTTAGE.x+3,z=COTTAGE.z-6.5,c=def.area.center,yaw=Math.round(Math.atan2(-(c.x-x),-(c.z-z))*180/Math.PI);
      startFree({spawn:{x,z,yaw},daily:true});
    });
  }
  // Varmt och glödhett, och hjälpen efter hand. Anropas några gånger i sekunden i fri julvandring.
  function dailyHint(p,now){
    const d=daily;if(!d||d.found)return;
    const dist=Math.hypot(d.def.spot.x-p.x,d.def.spot.z-p.z),band=dailyWarmth(dist),lv=hintLevel((now-d.t0)/1000);
    if(lv>d.level){
      d.level=lv;
      if(lv===2)fanfare('TIPS','Dagens julklapp ligger i '+d.def.area.name+'.',2.6,'energy');
      if(lv===3)fanfare('TIPS','Pilen visar vägen till '+d.def.area.name+'. Där blir det varmt.',2.6,'energy');
    }
    if(band==='cold'){d.band='cold';return;}
    if(band===d.band&&now-d.said<(band==='hot'?8000:25000))return;
    d.band=band;d.said=now;
    ui.showPill(band==='hot'?'GLÖDHET! DAGENS JULKLAPP ÄR HÄR NÄRA':'VARMT · DAGENS JULKLAPP ÄR I NÄRHETEN',2200,now,'bonus');
  }
  function dailyFoundAt(e,now){
    const def=dailyFor(todayKey());if(!def)return;
    const R=M(()=>meta.onDaily(def.reward));
    if(daily)daily.found=true;daily=null;
    sound('win');[523.25,659.25,783.99,1046.5,1318.5,1568,2093].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.3,.09),i*80));
    view.burst(e.x,e.z,{big:true,y:1.2});
    const o=R&&R.ornaments[0],cp=R&&R.coupons[0];
    fanfare('DAGENS JULKLAPP!',(R?'+'+R.xp+' XP'+(o?' · '+(o.isNew?'ny prydnad: ':'dubblett: ')+o.name:'')+(cp?' · NY KUPONG: '+cp.title:'')+(PRIZE.enabled&&R.tickets.length?' · en lott':''):'Den här har du redan hittat.')+' En ny göms i natt.',3.8,'win');
    if(cp)setTimeout(()=>guard(()=>toast('NY KUPONG',cp.title+'. Du hittar den i Julmenyn under dina kuponger.',4)),4200);
    if(R)announce(R,{skip:['orn','ticket']});
  }
  function openMenu(){
    guard(()=>{
      try{dismissPlaceResult?.();}catch{}clearTimeout(resultTimer);
      if(julrush.active){julrush.quit();} // att ge upp i pausmenyn sparar körningen som en förlust (om den hade några paket)
      leaveRush();restoreTurbo();zombieTune.off();try{host.music?.tempo?.(1);}catch{}
      daily=null;doorLink=null;ui.placeDoor(null);hunt.cancel('meny');view.clear();ui.showHud(false);guide.reset();guideUi.show(false);view.setGuide(null);guideShown=false;journey.pause?.();mode='menu';boatInfo=null;caughtAt=0;journey.actors?.forEach(a=>{a.active=false;});document.body.classList.remove('xmas-cozy','xmas-zombies','xmas-rush','xmas-mission');
      if(incoming){ui.renderChallenge(incoming);setPanel('xmas-challenge');return;}
      if(link){const l=link;link=null;if(showLink(l))return;}
      menuFrom='intro';takeCode();flushNews();
      ui.renderStart(buildDetail(stamp));setPanel('xmas-intro');
      if(badLink){badLink=false;toast('UTMANINGEN','Länken gick inte att läsa. Be din vän skicka den igen.',3.4);}
      if(linkBad){linkBad=false;toast('LÄNKEN','Uppdraget i länken finns inte. Det här är startvyn.',3.6);} // efter setPanel, som annars tar bort meddelandet
    });
  }
  // Djuplänken: ett kort med uppdraget och en knapp (aldrig en start av sig själv), eller panelen direkt för rushmenyn, topplistan och Julmenyn. false = länken gick inte att använda, startvyn visas.
  function showLink(l){
    const d=l.known?describeLink(l.key,{save,door:l.door}):null;
    if(!d){linkBad=true;return false;}
    if(d.direct)return linkRun(d.go);
    pendingLink=d;ui.renderLink(d);setPanel('xmas-link');return true;
  }
  function linkRun(go){
    switch(go?.fn){
      case 'intro':startIntro();return true;
      case 'round':startRound(go.arg);return true;
      case 'shops':openShops();return true;
      case 'sandgrund':startSandgrund();return true;
      case 'boat':startBoat();return true;
      case 'rush':startRush(go.arg);return true;
      case 'marathon':startRush(0);return true;
      case 'zombies':startZombies(go.arg);return true;
      case 'rushmenu':openRush();return true;
      case 'board':openBoard(0);return true;
      case 'continue':openContinue();return true;
      default:return false; // 'menu' (Julmenyn före första uppdraget): startvyn visas som vanligt
    }
  }
  function linkGo(){guard(()=>{const d=pendingLink;pendingLink=null;if(!d){openMenu();return;}doorLink=d.startable&&d.door?{door:d.door,gives:d.gives}:null;linkRun(d.startable?d.go:d.instead);});}
  // Knappen i rutan "Lucka N klar": Julmenyn (efter första uppdraget) eller startvyn
  function doorMenuGo(){guard(()=>{openMenu();if(save.introDone)openContinue();});}
  function linkSkip(){guard(()=>{pendingLink=null;openMenu();});}
  function openContinue(){guard(()=>{menuFrom='continue';takeCode();flushNews();ui.renderContinue();setPanel('xmas-continue');});}
  // Panelerna för julgranen, lotterna och de gömda julklapparna: tillbaka går till menyn man kom från.
  let menuFrom='intro';
  const menuBack=()=>{if(menuFrom==='continue'&&save.introDone)openContinue();else openMenu();};
  function openTree(){guard(()=>{ui.meta?.renderTree();setPanel('xmas-tree');});}
  function openDraw(){guard(()=>{ui.meta?.renderDraw();setPanel('xmas-draw');});}
  function openSecrets(){guard(()=>{ui.meta?.renderSecrets();setPanel('xmas-secrets');});}
  // Kalenderns luckor och ett hemligt paket (?paket=) räknas när menyn öppnas, aldrig mitt i en jakt.
  function takeCode(){
    M(()=>{const R=syncDoors();if(R)newsRaw.push({R});});
    if(!pendingCode)return;
    const code=pendingCode;pendingCode='';
    M(()=>{
      const r=meta.redeemCode(code);
      if(r.ok){const bits=ui.meta?ui.meta.describe(r.reward).map(x=>x.text):[];newsRaw.push({kind:'code',text:'HEMLIGT PAKET! '+(r.label?r.label+' · ':'')+'+'+r.reward.xp+' XP'+(bits.length?' · '+bits.join(' · '):'')});}
      else newsRaw.push({kind:'codebad',text:r.reason==='anvand'?'Det här hemliga paketet har du redan hämtat.':'Koden från länken känns inte igen.'});
    });
  }
  function codeRedeemed(r){M(()=>{if(r&&r.ok)sound('win');});}
  function setWeather(level){save.setWeather(level);try{decor?.setWeather(level);}catch(e){console.error(e);}}
  function setLight(m){save.setLight(m);try{light?.setMode(m);}catch(e){console.error(e);}}

  const ui=createXmasUi({save,meta,fx:{
    cozy:()=>{if(save.introDone)openContinue();else startIntro();},
    intro:()=>startIntro(),round:()=>startRound(),shops:()=>openShops(),free:()=>startFree(),zombies:()=>startZombies(),zombiesNext,zombiesAgain,sandgrund:()=>startSandgrund(),boat:()=>startBoat(),
    termos:()=>startRush(0,null,'termos'),daily:()=>startDaily(),
    openRush:()=>openRush(),rushPlay:n=>startRush(n),marathon:()=>startRush(0),rushNext,rushAgain,openBoard,boardBack:()=>{if(boardFrom==='result')setPanel('xmas-result');else openRush(ui.selectedRush());},challengeGo,challengeSave,challengeSkip,
    openMenu,openContinue,goBase,setWeather,setLight,linkGo,linkSkip,doorMenu:doorMenuGo,placeResume,
    openTree:()=>openTree(),openDraw:()=>openDraw(),openSecrets:()=>openSecrets(),menuBack:()=>menuBack(),codeRedeemed:r=>codeRedeemed(r)
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
      // Fri julvandring har inget slutkort: varje julklapp ger XP och räknas mot mätaren och dagens uppdrag direkt (xmas-meta.mjs: onPick).
      if(mode==='cozy'&&hunt.run&&hunt.run.kind==='free'){const R=M(()=>meta.onPick({kind:e.kind,chain:e.chain}));if(R&&R.notable)announce(R);}
      if(mode==='zombies')journey.energy=Math.min(100,(journey.energy||0)+(e.kind==='bonus'?30:8)); // paketen är ammunition i Tomtezombies
      const mult=e.mult>1?' ×'+e.mult:'';
      if(e.kind==='bonus'){[659.25,880,1174.66,1568].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.22,.08),i*70));view.burst(e.x,e.z,{big:true});ui.showPill('BONUSPAKET! +'+e.points,1500,now,'bonus');}
      else{note(chainFreq(e.chain),'triangle',.16,.075);setTimeout(()=>note(chainFreq(e.chain)*1.5,'sine',.2,.04),55);view.burst(e.x,e.z);ui.showPill('+'+e.points+(e.chain>=2?' · KOMBO '+e.chain+mult:''),1000,now);}
      if(e.praise){fanfare(e.praise,'+'+e.tierBonus+' poäng',1.3,'chain');}
      ui.setProgress(hunt.run);
    },
    'xmas-goal':(e,now)=>{sound('win');[523.25,659.25,783.99,1046.5].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.28,.08),i*90));ui.showGoal('Bra! Lämna julklapparna hos tomten.',5500,now);fanfare(e.goal+' JULKLAPPAR!','Följ pilen till tomten och lämna dem.',2.4,'win');ui.setProgress(hunt.run);},
    'xmas-chain-lost':(e,now)=>{ui.showPill('KEDJAN BRÖTS · '+e.chain+' I RAD',1200,now,'lost');},
    // En gömd julklapp (xmas-hidden.mjs) hittad i fri julvandring: egen fanfar, XP, en prydnad och ibland en lott.
    'xmas-hidden':(e,now)=>{
      if(isDailyId(e.id)){dailyFoundAt(e,now);return;}
      const R=M(()=>meta.onHidden(e.spot));
      sound('win');[523.25,659.25,783.99,1046.5,1318.5,1568].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.3,.09),i*80));
      view.burst(e.x,e.z,{big:true,y:1.2});
      const sp=hiddenSpot(e.spot),o=R&&R.ornaments[0];
      fanfare('GÖMD JULKLAPP!',(sp?sp.name+'. ':'')+(R?'+'+R.xp+' XP'+(o?' · '+(o.isNew?'ny prydnad: ':'dubblett: ')+o.name:'')+(PRIZE.enabled&&R.tickets.length?' · en lott':'')+' · '+R.hidden.count+' av '+R.hidden.total:''),3.4,'win');
      if(R)announce(R,{skip:['orn','ticket']});
    },
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
    'xmas-errand-done':(e,now)=>{sound('win');[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.3,.08),i*90));ui.showPill(e.stamp?'JULSTÄMPEL! '+(STAMPS.find(s=>s.id===e.stampId)?.label||'')+' · +'+e.points:'FIKAT LEVERERAT! +'+e.points,2600,now,'bonus');ui.showGoal('Tack! Tomten fick sitt fika. Nu fortsätter jakten på julklappar.',4200,now);ui.setProgress(hunt.run);showPlaceDone({placeId:e.stampId,points:e.points||0,first:!!e.stamp,line:'Tomten fick sin julfika, precis som beställt. Tack för hjälpen!',delay:1300});},
    'xmas-late':(e,now)=>{ui.showPill('SEN, MEN DET GÅR ATT LÄMNA IN',2000,now,'lost');},
    // JulRushen
    'rush-start':(e,now)=>{ui.setRush(julrush.snapshot(),julrush.powers([]),now);},
    'rush-pick':(e,now)=>{
      if(e.gold){[659.25,880,1174.66,1568].forEach((f,i)=>setTimeout(()=>note(f,'triangle',.22,.08),i*70));view.burst(e.x,e.z,{big:true});}
      else{note(chainFreq(e.chain),'triangle',.16,.075);setTimeout(()=>note(chainFreq(e.chain)*1.5,'sine',.2,.04),55);view.burst(e.x,e.z);}
      // Allt i en enda puff (i det här tempot hinner en separat kombotavla inte läsas): poäng, flyt och kombo eller kombonivåns beröm.
      const who=e.by==='ghost'?'SPÖKET · ':e.by==='magnet'?'MAGNET · ':e.side&&!e.rain?(julrush.termos?'SIDOTERMOS · ':'SIDOPAKET · '):'';
      ui.showPill(who+'+'+e.points+(e.flow?' · FLYT':'')+(e.praise?' · '+e.praise:e.chain>=2?' · KOMBO '+e.chain:''),e.gold||e.praise?1500:900,now,e.gold||e.praise?'bonus':'');
    },
    'rush-gift':(e,now)=>{
      sound(e.kind==='bomb'?'boss':'win');(GIFT_JINGLE[e.kind]||GIFT_JINGLE.default).forEach(([f,type],i)=>setTimeout(()=>note(f,type||'triangle',.2,.07),i*(e.kind==='sleigh'?45:e.kind==='kaka'?35:e.kind==='ghost'?85:65)));
      fanfare((julrush.termos&&e.kind==='rain'?'TERMOSREGNET':e.label)+(e.count>0?' · '+e.count+(julrush.termos?' TERMOSAR':' PAKET'):'')+'!',e.text+(e.seconds?' '+String(e.seconds).replace('.',',')+' sekunder.':''),2.2,'energy');
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
      if(r.skin==='termos')syncDonations();
      // en tagen utmaning: slog du vännen? (en rush som inte klarades räknas inte, och utmaningen ligger kvar tills den är slagen)
      r.door=doorFor({...r,kind:'rush',rush:k||null});
      {const tmp={...r,kind:'rush',rush:k||null};giveMeta(tmp);if(tmp.meta)r.meta=tmp.meta;}
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
      if(e.result.kind==='marieberg')e.result={...e.result,boat:boatInfo||{saved:0,points:0}};
      e.result={...e.result,door:doorFor(e.result)};giveMeta(e.result);
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
    let tgt=hunt.guideTarget(p);
    // Dagens julklappsjakt, steg 3: pilen leder till dagens område (inte till själva julklappen).
    if(daily&&!daily.found&&daily.level>=3&&mode==='cozy'){const c=daily.def.area.center,d=Math.hypot(c.x-p.x,c.z-p.z);if(d>DAILY.areaRadius*.6)tgt={x:c.x,z:c.z,id:'xmas-daily',kind:'tomte',label:daily.def.area.name.toUpperCase(),radius:DAILY.areaRadius*.6,distance:d};}
    const g=guide.update(p,host.camera.forward,tgt,dt,now,view.lite);
    guideUi.set(g);view.setGuide(g.on?g:null);guideShown=true;
    // Butiksraden visas inte i det första uppdraget (bara jakten): där räcker spår och tomte.
    if(now-missionAt>140){
      missionAt=now;const mv=missionView(hunt.run,p,hunt.run.drops&&mode==='cozy'&&hunt.run.kind!=='intro'?shopRow(p):null);
      if(mv&&daily&&!daily.found){const t='DAGENS JULKLAPP · '+(daily.level>=2?daily.def.area.name.toUpperCase():'LÖS GÅTAN');mv.rows.unshift({id:'daily',text:t,state:'now'});mv.key='daily:'+t+'|'+mv.key;}
      guideUi.setMission(mv);
    }
  }

  // Gömda julklappar: en rad när man kommer nära (varmt, glödhet). Samma band två gånger i rad sägs inte om förrän det gått en stund.
  let hiddenAt=0,hiddenBand='cold',hiddenSaid=0;
  function hiddenHint(p,now){
    const n=nearestHidden(p,meta.state.hidden);if(!n)return;
    const band=warmth(n.distance);
    if(band==='cold'){hiddenBand='cold';return;}
    if(band===hiddenBand&&now-hiddenSaid<(band==='hot'?9000:30000))return;
    hiddenBand=band;hiddenSaid=now;
    ui.showPill(band==='hot'?'GLÖDHET! EN GÖMD JULKLAPP ÄR HÄR NÄRA':'VARMT · EN GÖMD JULKLAPP I NÄRHETEN',2200,now,'bonus');
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
      if(mode==='cozy'&&hunt.run&&hunt.run.kind==='free'&&hunt.active&&now-hiddenAt>900){hiddenAt=now;hiddenHint(p,now);dailyHint(p,now);}
      updateGuide(p,now,dt);
      view.update(p,now,dt);
      if(mode==='rush'&&julrush.active&&now-rushHudAt>60){rushHudAt=now;ui.setRush(julrush.snapshot(),julrush.powers(powerBuf),now);}
      ui.tick(mode==='rush'?julrush.comboView():hunt.run,now);
      if(mode==='zombies')ui.setVitals(journey.health,journey.energy);
      decor?.update(p,now,dt);light?.update(now);govern(now);
    });
  }
  // Grundspelets HUD (var 80:e ms): julens text för mål, poäng och kompass skrivs över efter grundspelets.
  function hudText(p,els){
    if(fault||mode==='menu'||placeActive?.())return;
    if(mode==='rush'){ // kompassen pekar på nästa paket (samma mål som den stora pilen och den gröna strålen)
      const t=julrush.running?julrush.target(p):null;els.score.textContent=julrush.tempo.score.toLocaleString('sv-SE');
      if(t){const ang=Math.atan2(t.x-p.x,t.z-p.z)-Math.atan2(host.camera.forward.x,host.camera.forward.z);els.compassArrow.style.transform='rotate('+(-ang*180/Math.PI)+'deg)';els.compassArrow.textContent='↑';els.compassText.textContent=t.label+' · '+Math.round(t.distance)+' M';}
      else{els.compassText.textContent=julrush.running?(julrush.termos?'LETAR NÄSTA TERMOS':'LETAR NÄSTA PAKET'):'SLUT';els.compassArrow.textContent='⌖';els.compassArrow.style.transform='none';}
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
    hunt,save,meta,view,ui,sprites,handlers,decor,syncDoors,giveMeta,
    get active(){return mode==='rush'?julrush.active:hunt.active;},get cozy(){return mode==='cozy';},get zombieMode(){return mode==='zombies';},get zombieLevel(){return zLevel;},get rushMode(){return mode==='rush'&&julrush.active;},julrush,
    startSandgrund,missionDone,afterMission,startBoat,boatArrive,boatAbort,get missionMode(){return mode==='mission';},get boatMode(){return mode==='boat';},
    update,hudText,startRound,startZombies,startRush,openRush,openBoard,challengeGo,rushNext,rushAgain,caught,openShops,onPlaceEvent,runBusy,radar:(c,point,p)=>guard(()=>view.radar(c,point,p)),openMenu,openContinue,startIntro,startFree,startDaily,startTermos:()=>startRush(0,null,'termos'),get daily(){return daily;},goBase,setWeather,setLight,get light(){return light;},
    // Medan ett butiksuppdrag pågår står jaktens tid still (inga nya tappade julklappar, inget som försvinner).
    step:(dt,p,sweep,speed)=>guard(()=>mode==='rush'?julrush.step(dt,p,sweep,speed):hunt.step(placeActive?.()?0:dt,p,sweep,speed)),
    // Grundspelets små pilar på marken och flaggan "DITT MÅL" ritas inte för julens mål (quiet): julbandet, pilen och strålen ersätter dem (i JulRushen pilen och strålen). Radarn och kartan visar vägen som förut.
    objective:p=>{if(fault)return null;const o=mode==='rush'?julrush.objective(p):hunt.objective(p);return o&&o.kind==='xmas'?{...o,quiet:true}:o;},
    guide,guideUi,
    gov,
    snapshot:()=>({mode,fault,gov:{level:gov.level,ema:+gov.ema.toFixed(1),on:gov.on},hunt:hunt.snapshot(),rush:julrush.snapshot(),guide:{on:guide.state.on,id:guide.state.id,label:guide.state.label,distance:guide.state.distance,angle:+guide.state.angle.toFixed(1),hint:guide.state.hint,straight:guide.state.straight,segs:guide.state.segCount,edgeL:guide.state.edgeL,edgeR:guide.state.edgeR,mission:guideUi.missionText},incoming:incoming?{name:incoming.profile.name,focus:incoming.focus,toBeat:incoming.toBeat}:null,pending:pending?{...pending}:null,view:view.snapshot(),decor:decor?decor.snapshot():null,light:light?light.snapshot():null,daily:daily?{day:daily.def.day,area:daily.def.area.id,level:daily.level,found:daily.found}:null,dailyFound:M(()=>meta.dailyFound(),null),termos:{...save.termos,day:undefined,today:save.termosDay(todayKey())},build:stamp,save:{stamps:save.stampCount(),weather:save.weather,intro:save.introDone},meta:M(()=>{const m=meta.status();return {xp:m.xp,grade:m.level.n,tickets:m.tickets,orn:m.ornaments.owned,streak:m.streak.cur,hidden:m.hidden.found,missions:m.missionsDone};})}),
    onResultClosed:()=>{resultOpen=false;}
  };
  return api;
}
