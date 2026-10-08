import {atKil,KIL,KARLSTAD_C} from './scenic-transit.js?v=2.21.2';
import {SOUTH_PLACES,atMarieberg,MARIEBERG} from './city-south-space.mjs?v=2.21.2';
import {CityMission} from './city-missions.mjs?v=2.21.2';
import {CityRush,POSTCARDS} from './city-rush.mjs?v=2.21.2';
import {MALL_CACHE,mallGoal} from './mall-space.mjs?v=2.21.2';
import {PARK_ENCOUNTERS} from './park-space.mjs?v=2.21.2';
import {CITY_STREETS} from './city-streets.mjs?v=2.21.2';
import {pedestrianAt} from './pedestrian.mjs?v=2.21.2';
import {ExploreFun,segmentDistance,heatFor,levelFor} from './explore-fun.mjs?v=2.21.2';
import {POWER,POWER_KINDS,GIFT_KINDS,powerFor} from './powerups.mjs?v=2.21.2';
import {seededRandom,hashSeed} from './daily-challenge.mjs?v=2.21.2';
import {streetDistance,streetCovered} from './street-index.mjs?v=2.21.2';
import {SITE_CHALLENGES} from './orrholmen-places.mjs?v=2.21.2';
import {FlashChallenges} from './challenges.mjs?v=2.21.2';
import {TempoRun} from './tempo-run.mjs?v=2.21.2';
import {FX_THERMOS,TREASURES,BUS_NETWORK,BUS_FIRST_RIDE_BONUS,MUSIC_OFFICE} from './explore-places.mjs?v=2.21.2';
// 2.11: gatufynd — termosar längs alla gator i centrum, så att det alltid finns något inom
// ett kvarter. Gågator ger fikabonus.
export const STREET_ITEM_SPACING=30, GAGATA_BONUS=10;
// 2.13: en uppplockad termos dyker upp igen i City Explore efter fyra minuter, om man är minst 80 m därifrån. Då finns det alltid en runda att gå om.
export const RESPAWN=Object.freeze({after:240,minDistance:80,every:2});
// Temporush: termosarna kommer tillbaka fort, annars tar jakten slut på närliggande termosar.
export const TEMPO_RESPAWN=Object.freeze({after:45,minDistance:40,every:2});
const GIFTS=GIFT_KINDS;
// Temporush: nya termosar skapas framför spelaren så att det alltid finns något nära att springa mot, även efter en lång runda.
// 2.17: banan i Temporush är långa raka sträckor. Termosar läggs ut som ett pärlband längs en fri rak linje (med lätt slingring),
// och när linjen tar slut planeras nästa sträcka från slutpunkten. Pilen pekar alltid på nästa pärla längs banan.
// 2.19: fångstradie i Temporush. I turbo hinner man inte sikta, så pärlor tas i ett brett fält längs hela banan (och längs hela steget, se sweep).
export const TEMPO_CATCH=Object.freeze({base:3.6,perLevel:.35,max:6.5,aim:34,aimPerLevel:3,aimMax:70});
export const tempoReach=level=>Math.min(TEMPO_CATCH.max,TEMPO_CATCH.base+TEMPO_CATCH.perLevel*(Math.max(1,level)-1));
// 2.20: fångstfält som växer med farten, i alla lägen. Med turbo hinner man inte sikta, så en termos tas redan när man passerar inom några meter,
// mätt mot hela sträckan sedan förra steget. Över capAbove (kaffemagneten) räknas inte sikt och högst tre tas per steg.
export const CATCH=Object.freeze({base:2.4,walk:7.2,gain:.2,max:5.8,near:1.7,lineStep:.5,blockedRun:3,capAbove:8,maxSpeed:60});
export const catchReach=speed=>Math.min(CATCH.max,CATCH.base+Math.max(0,(Number.isFinite(speed)?speed:0)-CATCH.walk)*CATCH.gain);
function closestOnSegment(px,pz,ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz,t=len2>0?Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/len2)):0,x=ax+dx*t,z=az+dz*t;
  return {x,z,d:Math.hypot(x-px,z-pz)};
}
export const TEMPO_COURSE=Object.freeze({step:2,maxRay:520,maxTurn:110,turnPenalty:.55,rays:24,minLeg:30,wobble:1,streetNear:24,greenRun:48,maxGap:55,reanchorEvery:2.5,lookBase:150,lookPerLevel:14,lookMax:320,spacingBase:10,spacingPerLevel:1.5,spacingMax:28,behindDrop:12,perTick:14,every:.25,clearance:2});
export const TEMPO_SUPPLY=Object.freeze({want:8,perTick:3,every:.3,baseRadius:70,perLevel:8,maxRadius:150,minAhead:16,keep:90,powerEvery:6,spread:.85});

export const JOURNEY_KEY='karlstad:journey:1';
const bounded=(v,max,fallback=0)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):fallback;
export class CityJourney extends CityMission {
  constructor(nav,mall,portals,storage=null){
    super('journey',nav,mall);this.storage=storage;this.portals=portals;this.layout.duration=Infinity;this.duration=this.remaining=Infinity;this.phase='playing';
    this.actors.forEach(a=>a.active=false);this.layout.chargers=[];this.chargerTimes=[];this.events=[];this.elapsed=0;this.balance=0;this.lifetime=0;this.energy=45;this.destination='sista-rundan';
    this.found=new Set();this.secretsFound=new Set();this.cleared=new Set();this.lastCollect=-100;this.collectChain=0;this.lastAmbush=-100;this.lastSave=0;this.dirty=false;this.pendingAmbush=null;
    const unique=new Map(),routes=[];
    for(const destination of [portals['sista-rundan'],this.delivery,portals.sandgrund]){
      const route=nav.path(this.layout.spawn,destination);routes.push(route);
      route.forEach((p,i)=>{if(i>0&&i%6===0){const id=`t:${p.x}:${p.z}`;unique.set(id,{...p,id});}});
    }
    for(const p of [{x:1,z:7},{x:1,z:1},{x:7,z:1},{x:13,z:1},{x:19,z:7},{x:-8,z:14}]){const q=nav.point(p);unique.set(`t:${q.x}:${q.z}`,{...q,id:`t:${q.x}:${q.z}`});}
    const sg=portals.sandgrund;
    this.secrets=[[-43,-8,'Bakom rubrikerna'],[53,5,'Bortaklackens gömma'],[-164,48,'Gallerian efter stängning'],[68,-91,'Domkyrkans skugga'],[sg.x+30,sg.z+12,'Penselns hemlighet']].map(([x,z,name],i)=>({...nav.point({x,z}),id:'secret-'+i,name}));
    this.secrets.push({...MALL_CACHE},{...nav.point({x:-199,z:-831}),id:'udden-cache',name:'Sola längst ut på Sandgrundsudden'});
    for(const destination of [...SOUTH_PLACES,{x:-199,z:-831}]){const path=nav.path(this.layout.spawn,destination);for(let i=8;i<path.length;i+=8){const q=path[i];unique.set(`t:${q.x}:${q.z}`,{...q,id:`t:${q.x}:${q.z}`});}}
    for(const [i,q] of [[-144,119,0],[-140,116,0],[-140,92,5.4],[-128,90,5.4],[-108,90,5.4],[-104,117,5.4]].entries())unique.set('mall-term-'+i,{x:q[0],z:q[1],y:q[2],id:'mall-term-'+i});
    for(let i=0;i<6;i++)unique.set('marieberg-'+i,{x:-787-i*5,z:1310+(i%2)*24,id:'marieberg-'+i});
    for(let i=0;i<7;i++)unique.set('kil-'+i,{x:KIL.x-35+i*11,z:KIL.z+16,id:'kil-'+i});
    unique.set('bilan-cell',{x:326.89,z:155,id:'bilan-cell'});
    const near=(q,r)=>[...unique.values()].some(t=>Math.hypot(t.x-q.x,t.z-q.z)<r);
    for(const st of CITY_STREETS){
      let carry=STREET_ITEM_SPACING/2;
      for(let i=1;i<st.points.length;i++){
        const [x,z]=st.points[i-1],[ex,ez]=st.points[i],d=Math.hypot(ex-x,ez-z);if(d<.5)continue;
        const ux=(ex-x)/d,uz=(ez-z)/d,side=(i%2?1:-1)*(st.width/2+1.6);
        for(;carry<d;carry+=STREET_ITEM_SPACING){
          const raw={x:x+ux*carry-uz*side,z:z+uz*carry+ux*side};if(Math.hypot(raw.x,raw.z)>300)continue;
          const q=nav.point(raw);if(Math.hypot(q.x-raw.x,q.z-raw.z)>6||near(q,12))continue;
          const id=`s:${q.x}:${q.z}`;unique.set(id,{...q,id});
        }
        carry-=d;
      }
    }
    this.items=[...unique.values()].filter(p=>!this.secrets.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<3));
    // 2.13: fler termosar långt ut (Haga, Inre hamn, Mariebergsskogen, udden, Klara, Mitt i City) och gömda skatter.
    // De läggs sist, så att de gamla termos-id:na och Halloween-urvalet inte påverkas.
    this.treasures=TREASURES.map(t=>({...t}));
    const extra=[];
    for(const [area,list] of Object.entries(FX_THERMOS))list.forEach(([x,z,y],i)=>{if(!this.secrets.some(s=>Math.hypot(x-s.x,z-s.z)<3)&&!this.treasures.some(t=>Math.hypot(x-t.x,z-t.z)<3))extra.push({x,z,...(y?{y}:{}),id:`fx-${area}-${i}`});});
    this.items.push(...extra);this.treasuresFound=new Set();
    this.ambushes=[];
    routes.forEach((route,ri)=>{for(let i=10;i<route.length-4;i+=22){const trigger=route[i],next=route[i+1],dx=next.x-trigger.x,dz=next.z-trigger.z;
      const spawn=nav.point({x:trigger.x-dz*1.5,z:trigger.z+dx*1.5});this.ambushes.push({id:`ambush-${ri}-${i}`,trigger,spawn});}});
    for(const p of [...PARK_ENCOUNTERS,{id:'mall-fight',name:'REAN ÄR ODÖDLIG',x:-127,z:104,spawnX:-151,spawnZ:116}])this.ambushes.push({id:p.id,name:p.name,trigger:nav.point(p),spawn:nav.point({x:p.spawnX,z:p.spawnZ})});
    this.busStops=[{id:'torget',name:'Torget',...nav.point({x:-19,z:35})},{id:'domkyrkan',name:'Domkyrkan',...nav.point({x:145,z:-117})},{id:'sandgrund',name:'Sandgrund',...nav.point({x:sg.x+9,z:sg.z+12})}];
    // 2.13: linjenät från Torget i City Explore. Torget och Sandgrund återanvänder de gamla hållplatserna.
    this.busNetwork=BUS_NETWORK.map(s=>{const old=this.busStops.find(b=>b.id===s.id);return old?{...s,x:old.x,z:old.z}:{...s};});
    this.safeZones=[{...nav.point({x:5,z:24}),name:'Torget'}, {...nav.point(this.delivery),name:'Mitt i City'},...this.busStops.slice(1)];
    this.postcards=POSTCARDS.map(p=>({...p,...nav.point(p)}));this.postcardsFound=new Set();this.routeMode='hunt';
    this.position={...this.layout.spawn};this.heading=0;this.load();
    this.fun=new ExploreFun({storage,items:this.items,treasureIds:[...this.secrets.map(s=>s.id),...this.treasures.map(t=>t.id)],stopIds:this.busNetwork.filter(s=>!s.hub).map(s=>s.id),xp:this.lifetime});
    this.lastStep=null;this.speed=0;this.foundAt=new Map();this.lastRespawn=0;this.itemById=new Map(this.items.map(t=>[t.id,t]));this.rush=new CityRush(this);
    this.flash=new FlashChallenges({seed:1});this.tempo=new TempoRun(storage);
    this.sitesDone=new Set();this.activeSite=null;this.dyn=[];this.dynSerial=0;this.dynRnd=seededRandom(hashSeed('dyn'));this.lastSupply=0;this.lastForward={x:0,z:-1};this.helper={active:false,x:0,z:0,target:null,t:0,cool:0};
  }
  progress(){return {version:1,balance:this.balance,lifetime:this.lifetime,energy:this.energy,health:this.health,found:[...this.found].filter(id=>!String(id).startsWith('tp:')),secrets:[...this.secretsFound],treasures:[...this.treasuresFound],cleared:[...this.cleared],postcards:[...this.postcardsFound],position:{...this.position},heading:this.heading,destination:this.destination};}
  applyProgress(v){
    if(!v||v.version!==1)return;
    this.balance=bounded(v.balance,999999);this.lifetime=bounded(v.lifetime,9999999);this.energy=bounded(v.energy,100,45);this.health=bounded(v.health,100,100)||100;
    const pick=(list,valid)=>new Set(Array.isArray(list)?list.filter(id=>valid.some(p=>p.id===id)):[]);
    this.found=pick(v.found,this.items);this.secretsFound=pick(v.secrets,this.secrets);this.treasuresFound=pick(v.treasures,this.treasures);this.cleared=pick(v.cleared,this.ambushes);this.postcardsFound=pick(v.postcards,this.postcards);
    if(v.position&&Number.isFinite(v.position.x)&&Number.isFinite(v.position.z))this.position=atKil(v.position)?{x:KIL.x,z:KIL.z}:atMarieberg(v.position)?{x:MARIEBERG.x,z:MARIEBERG.z}:this.nav.point(v.position);
    if(Number.isFinite(v.heading))this.heading=v.heading;
    if(this.portals[v.destination])this.destination=v.destination;
  }
  load(){try{this.applyProgress(JSON.parse(this.storage?.getItem(JOURNEY_KEY)||'null'));}catch{}}
  save(){try{this.storage?.setItem(JOURNEY_KEY,JSON.stringify(this.challengeArchive||this.progress()));this.dirty=false;}catch{}this.fun?.save();}
  runKit(){
    const mask=(list,found)=>list.reduce((bits,p,i)=>found.has(p.id)?(bits|2**i)>>>0:bits,0);
    return {balance:Math.floor(bounded(this.balance,999999)),energy:Math.round(Math.max(45,this.energy)),secrets:mask(this.secrets,this.secretsFound),cleared:mask(this.ambushes,this.cleared),postcards:mask(this.postcards,this.postcardsFound)};
  }
  beginChallenge(kit=null){
    this.challengeArchive=this.progress();this.balance=kit?.balance??75;this.energy=kit?.energy??60;this.lifetime=0;
    const fromMask=(list,bits)=>new Set(list.filter((_,i)=>(bits||0)&2**i).map(p=>p.id));
    this.secretsFound=fromMask(this.secrets,kit?.secrets);this.cleared=fromMask(this.ambushes,kit?.cleared);this.postcardsFound=fromMask(this.postcards,kit?.postcards);
  }
  endChallenge(){if(this.challengeArchive){this.applyProgress(this.challengeArchive);this.challengeArchive=null;this.save();}}
  movementScale(actor){return this.rush?.ecology.contains(actor) ? .5 : 1;}
  reward(points){
    this.balance+=points;this.lifetime+=points;this.rush?.earn(points);this.dirty=true;
    if(this.fun&&this.rush?.mode==='clean'&&this.rush.state==='playing')for(const e of this.fun.afterReward(this.lifetime))this.events.push(e);
  }
  refill(target=this){
    if(target.phase!=='playing'||target.practice||this.balance<25||target.energy>60)return false;
    this.balance-=25;target.energy=Math.min(100,target.energy+40);this.energy=target.energy;this.dirty=true;target.events.push({type:'refill'});this.save();return true;
  }
  shoot(args){
    if(this.rush?.peaceful||args.power&&this.rush?.challenge?.noSuper)return null;
    this.weakShot=!args.power&&this.energy<3;
    const before=this.energy,kills=this.captured;
    this.fullEnergyFromShot=false;const result=super.shoot(args);if(result){if(!args.power)this.energy=Math.min(100,Math.max(0,before-3)+8*(this.captured-kills));if(this.fullEnergyFromShot){this.energy=100;this.fullEnergyFromShot=false;}this.rush?.raisePanic(args.power?3.5:1.2);this.dirty=true;}return result;
  }
  impulse(actor,dx,dz,strength,shot){
    const wasActive=actor.active;super.impulse(actor,dx,dz,this.weakShot?Math.min(9,strength):strength,shot);
    if(wasActive&&!actor.active&&actor.ambushId&&!this.cleared.has(actor.ambushId)){this.cleared.add(actor.ambushId);this.reward(30*(this.rush?.ecology.inSun?2:1));this.events.push({type:'ambush-clear'});}
    if(wasActive&&!actor.active){if(actor.patrolId)this.reward(45*(this.rush?.ecology.inSun?2:1));if(actor.kind==='golden')this.rush?.catchGolden(actor);this.rush?.kill(actor);}
  }
  drainEvents(){
    const events=super.drainEvents();if(!this.rush)return events;
    const research=this.rush.observe(events);if(!research.length)return events;
    // Rewards may themselves emit events (for example exit-open at 800 XP).
    return events.concat(research,super.drainEvents());
  }
  finish(won){
    if(won)return;
    if(this.rush?.state==='playing'&&this.rush.mode==='timed'){this.rush.end(false,'Du blev tillfångatagen av zombierna.');return;}
    this.balance=Math.max(0,this.balance-25);this.health=100;this.energy=Math.max(20,this.energy);this.contactCooldown=8;this.actors.forEach(a=>a.active=false);this.pendingAmbush=null;
    this.events.push({type:'recover'});this.dirty=true;
  }
  objective(player=this.position){if(atKil(player))return {...KIL,id:'return-train',kind:'landmark',label:'RETURTÅG · KARLSTAD C',radius:8,action:'KLIV OMBORD'};if(atMarieberg(player))return {...MARIEBERG,id:'return-boat',kind:'landmark',label:'RETURBÅT · INRE HAMN',radius:7,action:'KLIV OMBORD'};if(this.rush.peaceful&&this.routeMode==='bus'){const bus=this.nearestBus(player);return {...bus,id:'clean-bus-'+bus.id,kind:'landmark',label:'BUSSHÅLLPLATS · '+bus.name.toUpperCase(),radius:6};}if(this.rush.peaceful&&this.routeMode!=='landmark'){const quest=this.places?.objective?.(player)||(this.routeMode==='help'?this.clerks?.objective():null);if(quest)return quest;if(this.rush.mode==='trail'){const item=this.items.filter(t=>!this.found.has(t.id)).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0];if(item)return {...item,kind:'coffee',label:'NÄSTA TERMOS',radius:1.8};}return {...player,id:'explore',kind:'wait',label:'CITY EXPLORE · VÄLJ PLATS PÅ KARTAN',radius:2};}if(this.routeMode==='help'&&!this.rush?.exitReady){const help=this.clerks?.objective();if(help)return help;}const goal=this.rush?.state==='playing'?this.rush.objective(player):null;if(goal)return goal;if(this.routeMode==='landmark'&&this.landmarkGoal)return this.landmarkGoal.id==='place-mitticity'?mallGoal(player,this.rush.mode==='trail'||this.secretsFound.has(MALL_CACHE.id)):this.landmarkGoal;const p=this.portals[this.destination];return {...p,id:'mission-'+this.destination,kind:'mission',label:p.name.toUpperCase(),radius:4,action:'TRYCK STARTA UPPDRAG'};}
  // Sträckan sedan förra steget (om spelaren inte teleporterats) och en jämnad fartuppskattning i m/s.
  trackMove(dt,p){
    const from=this.lastStep,d=from?Math.hypot(p.x-from.x,p.z-from.z):0,sweep=from&&d<14?from:null;this.lastStep={x:p.x,z:p.z};
    const inst=sweep&&dt>0?Math.min(CATCH.maxSpeed,d/dt):0;this.speed+=(inst-this.speed)*Math.min(1,Math.max(0,dt)*8);
    return sweep;
  }
  // Fri sikt mellan två punkter. Några blockerade punkter i rad (vägg, vatten) stoppar; en stolpe eller bänk gör det inte.
  clearLine(ax,az,bx,bz){
    const d=Math.hypot(bx-ax,bz-az);if(d<=CATCH.near)return true;
    const n=Math.ceil(d/CATCH.lineStep);let run=0;
    for(let i=1;i<n;i++){if(this.nav.blocked(ax+(bx-ax)*i/n,az+(bz-az)*i/n)){if(++run>=CATCH.blockedRun)return false;}else run=0;}
    return true;
  }
  // Ligger termosen inom fångstfältet? Närmaste punkt på sträckan sedan förra steget räknas, och det krävs fri sikt dit (utom för kaffemagneten).
  inCatch(item,p,reach,sweep){
    if(Math.abs((p.y??1.68)-1.68-(item.y||0))>=1.5)return false;
    const q=sweep?closestOnSegment(item.x,item.z,sweep.x,sweep.z,p.x,p.z):{x:p.x,z:p.z,d:Math.hypot(p.x-item.x,p.z-item.z)};
    if(q.d>=reach)return false;
    return reach>=CATCH.capAbove||q.d<=CATCH.near||this.clearLine(q.x,q.z,item.x,item.z);
  }
  stepExplore(dt,p,f){
    this.elapsed+=dt;this.position={x:p.x,z:p.z};this.heading=Math.atan2(-f.x,-f.z)*180/Math.PI;this.lastForward={x:f.x,z:f.z};
    this.actors.forEach(a=>a.active=false);this.pendingAmbush=null;this.rush.clock(dt);
    if(this.rush.state!=='playing')return;
    const fun=this.rush.mode==='clean'?this.fun:null,py=(p.y??1.68)-1.68;
    // Sträckan sedan förra steget: med turbo och Ryde hinner man 1–3 m per bildruta, och en termos får inte missas mellan två steg.
    const sweep=this.trackMove(dt,p);
    if(fun){
      const t=fun.tick(dt);if(t.lost>=3)this.events.push({type:'combo-lost',chain:t.lost});if(t.saved)this.events.push({type:'shield-save',chain:t.saved});
      this.tickFlash(dt);this.tickTempo(dt,p);this.tickGhost(dt,p,fun);this.tickSites(p);
      if(this.clerks?.explore())this.clerks.step(dt,p); // 2.21: personalens hjälpuppdrag (hitta föremålet) fungerar även i City Explore
    }
    try{this.places?.step(dt,p);}catch(e){if(!this.placesFault){this.placesFault=true;console.error('[Platsuppdrag] fel i steget',e);}} // 2.21: butiksuppdrag och digitala besök; avbryter själv om läget inte tillåter dem
    let reach=catchReach(this.speed);let taken=0;
    if(fun)reach=fun.pickupRadius(reach);
    if(fun&&this.tempo.running)reach=Math.max(reach,tempoReach(this.tempo.level));
    for(const item of this.items){
      if(this.found.has(item.id)||!this.inCatch(item,p,reach,sweep))continue;
      if(reach>=CATCH.capAbove&&++taken>3)break; // kaffemagneten tar högst tre per steg
      if(fun){this.takeItem(item,p,fun);continue;}
      const gagata=pedestrianAt(item);
      this.found.add(item.id);this.energy=Math.min(100,this.energy+15);
      const pts=25+(gagata?GAGATA_BONUS:0);this.reward(pts);
      this.events.push({type:'thermos',points:pts,chain:0,x:item.x,z:item.z,id:item.id,gagata});
    }
    const respawn=this.tempo.running?TEMPO_RESPAWN:RESPAWN;
    if(fun&&this.elapsed-this.lastRespawn>=respawn.every){
      this.lastRespawn=this.elapsed;
      for(const [id,at] of this.foundAt){
        if(this.elapsed-at<respawn.after)continue;
        const it=this.itemById.get(id);if(!it){this.foundAt.delete(id);continue;}
        if(Math.hypot(p.x-it.x,p.z-it.z)<respawn.minDistance)continue;
        this.found.delete(id);this.foundAt.delete(id);
      }
    }
    if(this.rush.mode==='clean'){
      // De sju gamla hemligheterna och de nya gömda skatterna fungerar likadant: gå nära och plocka.
      for(const [list,found,legacy] of [[this.secrets,this.secretsFound,true],[this.treasures,this.treasuresFound,false]])
        for(const item of list){
          if(found.has(item.id)||Math.abs(py-(item.y||0))>=1.5||Math.hypot(p.x-item.x,p.z-item.z)>=(legacy?1.8:2.2))continue;
          found.add(item.id);const points=legacy?200:item.points,t=fun.treasure(item.id);
          this.events.push({type:'secret',name:item.name,points,fun:true,id:item.id,x:item.x,z:item.z,found:t?.count??found.size,total:fun.treasureTotal});
          for(const e of t?.events||[])this.events.push(e);
          this.reward(points);this.save();
        }
    }
    if(this.elapsed-this.lastSave>=4){this.lastSave=this.elapsed;this.save();}
  }
  // En termos plockas i City Explore. Poäng, kedja, förmåga, utmaning och Temporush hanteras här på ett ställe.
  takeItem(item,p,fun,{blast=false}={}){
    const gagata=pedestrianAt(item),dyn=!!item.dyn;
    this.found.add(item.id);this.energy=Math.min(100,this.energy+15);this.foundAt.set(item.id,this.elapsed);
    const r=fun.pickup(item,{gagata:!!gagata,dyn});
    let extra=0;
    if(this.tempo.running){
      const t=this.tempo.pick(r.points);extra=t.extra;
      this.events.push({type:'tempo-pick',mult:t.mult,flow:t.flow,extra:t.extra,picked:this.tempo.picked,score:this.tempo.score});
    }
    this.events.push({type:'thermos',points:r.points+extra,chain:r.chain,mult:r.mult,rarity:r.rarity,first:r.first,doubled:r.doubled,lucky:r.lucky,fun:true,x:item.x,z:item.z,y:item.y||0,id:item.id,gagata,power:r.power});
    for(const e of r.events)this.events.push(e);
    this.reward(r.points+r.bonus+extra);
    if(item.site&&this.activeSite?.def.id===item.site)for(const e of this.flash.bump('site',1))this.handleFlash(e);
    for(const e of this.flash.noteThermos({chain:r.chain,rarity:r.rarity,power:!!r.power}))this.handleFlash(e);
    if(r.power==='clock'){this.flash.extend(POWER.clockSeconds);this.tempo.extend(8);}
    if(!blast){
      if(r.power==='bomb')this.blast(item,p,fun);
      else if(r.power==='strip')this.strip(p,fun);
      else if(r.power==='rain')this.rain(p);
      else if(r.power==='ghost')this.startGhost(p);
    }
    return r;
  }
  // Sockerbomben: alla termosar inom radien på samma våning plockas direkt, så att kedjan rusar iväg.
  blast(center,p,fun){
    const py=(p.y??1.68)-1.68;
    const near=this.items.filter(t=>!this.found.has(t.id)&&Math.abs(py-(t.y||0))<1.5&&Math.hypot(t.x-center.x,t.z-center.z)<=POWER.bombRadius)
      .sort((a,b)=>Math.hypot(a.x-center.x,a.z-center.z)-Math.hypot(b.x-center.x,b.z-center.z)).slice(0,POWER.bombMax);
    for(const it of near)this.takeItem(it,p,fun,{blast:true});
    this.events.push({type:'bomb',count:near.length,x:center.x,z:center.z});
    return near.length;
  }
  // Blixtutmaningar: händelser från FlashChallenges. Klarade ger poäng, märken och ibland en förmåga.
  handleFlash(e){
    this.events.push(e);
    if((e.type==='challenge-done'||e.type==='challenge-fail')&&e.kind==='site')this.endSite();
    if(e.type!=='challenge-done')return;
    this.reward(e.points);
    for(const b of this.fun.noteFlash())this.events.push(b);
    if(e.giftPower){const kind=GIFTS[(this.flash.serial+e.points)%GIFTS.length];this.events.push(this.fun.applyPower(kind));}
  }
  tickFlash(dt){
    this.flash.enabled=this.rush.mode==='clean'&&!this.tempo.running;
    if(this.fun.power.pausing())return;
    for(const e of this.flash.tick(dt,{level:levelFor(this.lifetime).level}))this.handleFlash(e);
  }
  // Temporush: tickar nivåer och fikaklocka, och pekar ut närmaste termos som nästa mål.
  tickTempo(dt,p){
    if(!this.tempo.running)return;
    this.supplyTempo(dt,p);
    for(const e of this.tempo.tick(dt,{freeze:this.fun.power.pausing()})){
      this.events.push(e);
      if(e.type==='tempo-level')for(const b of this.fun.noteTempo(e.level))this.events.push(b);
      if(e.type==='tempo-over'){for(const b of this.fun.noteTempo(e.level))this.events.push(b);this.save();}
    }
    const tg=this.tempo.target;if(this.tempo.running&&tg&&(!this.itemById.has(tg.id)||this.found.has(tg.id)))this.tempo.needTarget=true;
    if(this.tempo.running&&this.tempo.needTarget)this.pickTempoTarget(p);
    // Ligger nästa mål för långt bort (man har lämnat banan) börjar banan om vid spelaren.
    const t2=this.tempo.target;
    if(this.tempo.running&&t2&&Math.hypot(t2.x-p.x,t2.z-p.z)>TEMPO_COURSE.maxGap&&this.elapsed-(this.lastAnchor||-99)>TEMPO_COURSE.reanchorEvery&&((p.y??1.68)-1.68)<.6){this.anchorCourse(p);this.pickTempoTarget(p);}
  }
  // Pilens siktpunkt: en bit längre fram på banan än nästa pärla, så att pilen pekar längs banans riktning och inte svänger vilt när man susar förbi pärlorna.
  tempoAim(p){
    const tg=this.tempo.target;if(!tg)return null;
    const want=Math.min(TEMPO_CATCH.aimMax,TEMPO_CATCH.aim+TEMPO_CATCH.aimPerLevel*(this.tempo.level-1));
    const open=(this.course?.pearls||[]).filter(t=>!this.found.has(t.id)&&t.course>=(tg.course??-1)).sort((a,b)=>a.course-b.course);
    for(const t of open)if(Math.hypot(t.x-p.x,t.z-p.z)>=want)return {x:t.x,z:t.z};
    const last=open.at(-1)||tg;return {x:last.x,z:last.z};
  }
  // Närmaste termos, men en bit framför spelaren väger lättare än en bakom, så att pilen sällan pekar bakåt när man springer fort.
  pickTempoTarget(p){
    const py=(p.y??1.68)-1.68;
    // Följ banan: nästa pärla i ordning. Finns ingen (inomhus, bara nyss startad) faller vi tillbaka på närmaste termos.
    const open=this.course?.pearls.filter(t=>!this.found.has(t.id)).sort((a,b)=>a.course-b.course)||[];
    // Pärlor man precis sprungit förbi hoppas över så länge det finns något framför.
    const lane=open.find(t=>!this.passed(t,p,1))||open[0];
    if(lane&&py<.6){this.tempo.setTarget(lane,Math.hypot(lane.x-p.x,lane.z-p.z));return;}
    const f=this.lastForward,fa=Math.atan2(f.x,f.z);let best=null,bs=Infinity,bd=0;
    for(const t of this.items){
      if(this.found.has(t.id)||Math.abs(py-(t.y||0))>=1.5||/^(kil|marieberg)-/.test(t.id))continue;
      const dx=t.x-p.x,dz=t.z-p.z,d=Math.hypot(dx,dz);
      let a=Math.atan2(dx,dz)-fa;while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;
      const score=d*(1+.6*Math.abs(a)/Math.PI);
      if(score<bs){bs=score;best=t;bd=d;}
    }
    if(best&&bd<500)this.tempo.setTarget(best,bd);
  }
  // Skapar en ny termos (märkt dyn) på en fri plats. Varje N:te är en förmåga. Returnerar posten eller null.
  spawnDynamic(p,{angle,minD=16,maxD=60,forcePower=false}={}){
    const rnd=this.dynRnd;
    for(let tries=0;tries<8;tries++){
      const a=(angle??0)+(rnd()-.5)*2*TEMPO_SUPPLY.spread,d=minD+rnd()*(maxD-minD);
      const raw={x:p.x+Math.sin(a)*d,z:p.z+Math.cos(a)*d};
      if(this.nav.blocked(raw.x,raw.z))continue;
      const n=this.nav.point(raw);if(Math.hypot(n.x-raw.x,n.z-raw.z)>6)continue;
      if(this.dyn.some(t=>!this.found.has(t.id)&&Math.hypot(t.x-raw.x,t.z-raw.z)<4))continue;
      let id='tp:'+(++this.dynSerial);
      if(forcePower){const day=this.fun.day;for(let k=0;k<400&&!powerFor(id,day);k++)id='tp:'+this.dynSerial+':'+k;}
      const it={id,x:+raw.x.toFixed(1),z:+raw.z.toFixed(1),dyn:true};
      this.items.push(it);this.itemById.set(id,it);this.dyn.push(it);this.pruneDynamic();
      return it;
    }
    return null;
  }
  pruneDynamic(){
    if(this.dyn.length<=TEMPO_SUPPLY.keep)return;
    for(let i=0;i<this.dyn.length&&this.dyn.length>TEMPO_SUPPLY.keep;){
      const t=this.dyn[i];
      if(this.found.has(t.id)){this.dyn.splice(i,1);this.found.delete(t.id);this.foundAt.delete(t.id);this.itemById.delete(t.id);const k=this.items.indexOf(t);if(k>=0)this.items.splice(k,1);}
      else i++;
    }
  }
  // Fri yta för en termos: mitten och åtta punkter runt omkring får inte vara blockerade (håller banan borta från strandkanter och husväggar).
  freeSpot(x,z){
    const c=TEMPO_COURSE.clearance,d=c*.72,n=this.nav;
    return !n.blocked(x,z)&&!n.blocked(x+c,z)&&!n.blocked(x-c,z)&&!n.blocked(x,z+c)&&!n.blocked(x,z-c)
      &&!n.blocked(x+d,z+d)&&!n.blocked(x-d,z-d)&&!n.blocked(x+d,z-d)&&!n.blocked(x-d,z+d);
  }
  // Hela sträckan mellan två punkter ska vara fri, inte bara ändpunkterna (annars hoppar banan över smala hinder och vatten).
  segmentFree(ax,az,bx,bz){
    const d=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.ceil(d/3));
    for(let i=1;i<=n;i++)if(!this.freeSpot(ax+(bx-ax)*i/n,az+(bz-az)*i/n))return false;
    return true;
  }
  // Rakt fram från (x,z) i riktningen h (radianer, dx=sin, dz=cos). Returnerar den användbara längden och hur mycket av den som ligger vid gator.
  // Sträckan tar slut vid första hindret, och i kvarter med gatudata även där det blir en lång grön/tom bit utan gator.
  scanRay(x,z,h,urban){
    const dx=Math.sin(h),dz=Math.cos(h),step=TEMPO_COURSE.step*1.5;let d=0,samples=0,near=0,green=0,len=0;
    for(;d<TEMPO_COURSE.maxRay;d+=step){
      const px=x+dx*(d+TEMPO_COURSE.step),pz=z+dz*(d+TEMPO_COURSE.step);
      if(!this.freeSpot(px,pz)||(this.covered&&!this.covered(px,pz)))break; // 2.19.1: banan lämnar aldrig det byggda kartområdet (öppet vatten/obyggd mark utanför)
      len=d+step;
      if(urban){
        samples++;const on=streetDistance(px,pz,TEMPO_COURSE.streetNear+2)<=TEMPO_COURSE.streetNear;
        if(on){near++;green=0;}else{green+=step;if(green>=TEMPO_COURSE.greenRun){len=Math.max(0,d-green+step);break;}}
      }
    }
    return {len,frac:samples?near/samples:1};
  }
  rayLength(x,z,h){return this.scanRay(x,z,h,false).len;}
  // Välj nästa riktning: lång sträcka längs gator vinner, stora svängar straffas så att banan fortsätter ungefär rakt fram.
  planHeading(x,z,heading){
    const urban=streetCovered(x,z);
    const run=(useUrban)=>{
      let best=null;
      for(let i=0;i<TEMPO_COURSE.rays;i++){
        let turn=(i/TEMPO_COURSE.rays)*2*Math.PI;if(turn>Math.PI)turn-=2*Math.PI;
        if(Math.abs(turn)*180/Math.PI>TEMPO_COURSE.maxTurn)continue;
        const h=heading+turn,r=this.scanRay(x,z,h,useUrban),score=r.len*(.35+.65*r.frac)*(1-TEMPO_COURSE.turnPenalty*Math.abs(turn)/Math.PI);
        if(!best||score>best.score)best={h,len:r.len,score};
      }
      return best&&best.len>=TEMPO_COURSE.minLeg?best:null;
    };
    return (urban?run(true):null)||run(false);
  }
  startCourse(p){
    const f=this.lastForward,h0=Math.atan2(f.x,f.z),o=this.freeSpot(p.x,p.z)?p:this.nav.point(p),plan=this.planHeading(o.x,o.z,h0);
    this.course={x:o.x,z:o.z,heading:plan?plan.h:h0,idx:0,leg:plan?plan.len:0,legStart:{x:o.x,z:o.z},pearls:[]};
    this.spawned=0;
  }
  // Börja om banan vid spelaren (hamnat för långt från banan, till exempel efter en bussresa eller en omväg).
  anchorCourse(p){this.dropPearls(true);this.course=null;this.tempo.needTarget=true;this.lastAnchor=this.elapsed;this.startCourse(p);this.lastSupply=-99;this.supplyTempo(0,p);}
  // Lägg ut pärlor längs banan tills det ligger tillräckligt långt framför spelaren. Pärlor som hamnat bakom spelaren tas bort.
  supplyTempo(dt,p){
    if(this.elapsed-this.lastSupply<TEMPO_COURSE.every)return;
    this.lastSupply=this.elapsed;
    const py=(p.y??1.68)-1.68;if(py>.6)return;
    if(!this.course)this.startCourse(p);
    const level=this.tempo.level;
    const look=Math.min(TEMPO_COURSE.lookMax,TEMPO_COURSE.lookBase+TEMPO_COURSE.lookPerLevel*level);
    const spacing=Math.min(TEMPO_COURSE.spacingMax,TEMPO_COURSE.spacingBase+TEMPO_COURSE.spacingPerLevel*level);
    if(Math.hypot(this.course.x-p.x,this.course.z-p.z)>look*2.5)this.anchorCourse(p);
    const cc=this.course;let laid=0,fails=0;
    while(Math.hypot(cc.x-p.x,cc.z-p.z)<look&&laid<TEMPO_COURSE.perTick&&fails<3){
      const nx=cc.x+Math.sin(cc.heading)*spacing,nz=cc.z+Math.cos(cc.heading)*spacing;
      const legUsed=Math.hypot(nx-cc.legStart.x,nz-cc.legStart.z);
      cc.idx++;
      const lat=Math.sin(cc.idx*.55)*TEMPO_COURSE.wobble,px=nx+Math.cos(cc.heading)*lat,pz=nz-Math.sin(cc.heading)*lat;
      // Sträckan är slut (hinder eller lång grön yta) eller något ligger i vägen mellan pärlorna: planera en ny sträcka härifrån.
      if(legUsed>cc.leg||!this.segmentFree(cc.x,cc.z,px,pz)){
        const plan=this.planHeading(cc.x,cc.z,cc.heading);fails++;
        if(!plan){cc.heading+=Math.PI/3;cc.leg=0;cc.legStart={x:cc.x,z:cc.z};continue;}
        cc.heading=plan.h;cc.leg=plan.len;cc.legStart={x:cc.x,z:cc.z};continue;
      }
      cc.x=nx;cc.z=nz;
      this.spawned=(this.spawned||0)+1;
      let id='tp:'+(++this.dynSerial);
      if(this.spawned%TEMPO_SUPPLY.powerEvery===0){const day=this.fun.day;for(let k=0;k<400&&!powerFor(id,day);k++)id='tp:'+this.dynSerial+':'+k;}
      const it={id,x:+px.toFixed(1),z:+pz.toFixed(1),dyn:true,course:cc.idx,hx:+Math.sin(cc.heading).toFixed(3),hz:+Math.cos(cc.heading).toFixed(3)};
      this.items.push(it);this.itemById.set(id,it);this.dyn.push(it);cc.pearls.push(it);laid++;
    }
    // Fastnar banan (inga pärlor lagda): börja om från närmaste gångbara punkt åt ett nytt håll.
    if(!cc.pearls.length&&fails>=3){const o=this.nav.point(p);cc.x=o.x;cc.z=o.z;cc.heading+=Math.PI*.7;cc.legStart={x:o.x,z:o.z};cc.leg=0;}
    // Finns inga pärlor kvar framför spelaren (trångt eller blockerat): lägg ut en kort kedja på närmaste gångbara noder rakt fram.
    if(!cc.pearls.some(t=>!this.found.has(t.id)))this.nodePearls(p);
    this.dropPearls(false,p);
  }
  nodePearls(p){
    const cc=this.course;if(!cc)return;const f=this.lastForward,len=Math.hypot(f.x,f.z)||1,fx=f.x/len,fz=f.z/len;
    let last={x:p.x,z:p.z},n=0;
    for(let k=1;k<=7&&n<6;k++){
      const raw={x:p.x+fx*14*k,z:p.z+fz*14*k},q=this.nav.point(raw);
      if(Math.hypot(q.x-raw.x,q.z-raw.z)>18||Math.hypot(q.x-last.x,q.z-last.z)<6)continue;
      cc.idx++;const it={id:'tp:'+(++this.dynSerial),x:+q.x.toFixed(1),z:+q.z.toFixed(1),dyn:true,course:cc.idx,hx:+fx.toFixed(3),hz:+fz.toFixed(3)};
      this.items.push(it);this.itemById.set(it.id,it);this.dyn.push(it);cc.pearls.push(it);last=q;n++;
    }
    if(n){cc.x=last.x;cc.z=last.z;cc.heading=Math.atan2(fx,fz);cc.legStart={x:last.x,z:last.z};cc.leg=0;}
  }
  // En pärla är passerad när spelaren hamnat längre fram än den längs banans egen riktning där (inte kamerans riktning, som kan peka åt sidan i en kurva).
  passed(t,p,margin){return ((p.x-t.x)*t.hx+(p.z-t.z)*t.hz)>margin;}
  // Ta bort pärlor som är passerade (långt bakom spelaren längs banan) eller, vid omstart, alla.
  dropPearls(all,p=null){
    const c=this.course;if(!c)return;
    c.pearls=c.pearls.filter(t=>{
      const gone=all||(!this.found.has(t.id)&&p&&this.passed(t,p,TEMPO_COURSE.behindDrop)&&Math.hypot(t.x-p.x,t.z-p.z)>TEMPO_COURSE.behindDrop);
      if(gone){const k=this.items.indexOf(t);if(k>=0)this.items.splice(k,1);this.itemById.delete(t.id);const j=this.dyn.indexOf(t);if(j>=0)this.dyn.splice(j,1);this.found.delete(t.id);this.foundAt.delete(t.id);return false;}
      return true;
    });
    this.pruneDynamic();
  }
  // Platsutmaningar (Orrholmen, Stadsträdgården, stationen, Bryggudden): gå in i cirkeln så läggs några termosar ut och tiden går.
  tickSites(p){
    if(this.tempo.running||this.flash.active||this.activeSite||((p.y??1.68)-1.68)>.6)return;
    for(const def of SITE_CHALLENGES){
      if(this.sitesDone.has(def.id)||Math.hypot(p.x-def.x,p.z-def.z)>def.radius)continue;
      this.startSite(def);break;
    }
  }
  startSite(def){
    this.sitesDone.add(def.id);
    const items=def.points.map(([x,z],i)=>{const id='site:'+def.id+':'+i,it={id,x,z,dyn:true,site:def.id};this.items.push(it);this.itemById.set(id,it);this.dyn.push(it);this.found.delete(id);return it;});
    this.activeSite={def,items};
    this.events.push(this.flash.startCustom({title:def.name,text:def.text+' på '+def.seconds+' s',target:def.points.length,seconds:def.seconds,points:def.reward}));
  }
  endSite(){
    const a=this.activeSite;if(!a)return;this.activeSite=null;
    for(const it of a.items){const k=this.items.indexOf(it);if(k>=0)this.items.splice(k,1);this.itemById.delete(it.id);const j=this.dyn.indexOf(it);if(j>=0)this.dyn.splice(j,1);this.found.delete(it.id);this.foundAt.delete(it.id);}
  }
  // Kanelstrålen: alla termosar i en rak, smal linje framför spelaren.
  strip(p,fun){
    const py=(p.y??1.68)-1.68,f=this.lastForward,len=Math.hypot(f.x,f.z)||1,fx=f.x/len,fz=f.z/len;
    const hits=this.items.map(t=>{const dx=t.x-p.x,dz=t.z-p.z;return {t,along:dx*fx+dz*fz,side:Math.abs(dx*fz-dz*fx)};})
      .filter(h=>!this.found.has(h.t.id)&&Math.abs(py-(h.t.y||0))<1.5&&h.along>0&&h.along<=POWER.stripLength&&h.side<=POWER.stripWidth)
      .sort((a,b)=>a.along-b.along).slice(0,POWER.stripMax);
    for(const h of hits)this.takeItem(h.t,p,fun,{blast:true});
    this.events.push({type:'strip',count:hits.length,x:p.x,z:p.z});
    return hits.length;
  }
  // Bönregn: tio termosar skapas i en ring runt spelaren.
  rain(p){
    const py=(p.y??1.68)-1.68;if(py>.6)return 0;
    let n=0;for(let i=0;i<POWER.rainCount*3&&n<POWER.rainCount;i++){
      const a=this.dynRnd()*Math.PI*2,d=3.5+this.dynRnd()*7;
      const raw={x:p.x+Math.sin(a)*d,z:p.z+Math.cos(a)*d};
      if(this.nav.blocked(raw.x,raw.z))continue;const q=this.nav.point(raw);if(Math.hypot(q.x-raw.x,q.z-raw.z)>6)continue;
      const id='tp:'+(++this.dynSerial),it={id,x:+raw.x.toFixed(1),z:+raw.z.toFixed(1),dyn:true};
      this.items.push(it);this.itemById.set(id,it);this.dyn.push(it);n++;
    }
    this.pruneDynamic();this.events.push({type:'rain',count:n});return n;
  }
  // Spöket: ett vänligt spöke flyger till närmaste termos och plockar den, tills tiden är slut.
  startGhost(p){this.helper={active:true,x:p.x,z:p.z,target:null,t:0,cool:0};}
  tickGhost(dt,p,fun){
    const h=this.helper;
    if(!fun.power.ghosting()){h.active=false;h.target=null;return;}
    if(!h.active){h.active=true;h.x=p.x;h.z=p.z;h.target=null;h.t=0;}
    if(!h.target){
      h.cool-=dt;if(h.cool>0){h.x+=(p.x-h.x)*Math.min(1,dt*4);h.z+=(p.z-h.z)*Math.min(1,dt*4);return;}
      const py=(p.y??1.68)-1.68;let best=null,bd=POWER.ghostRange;
      for(const t of this.items){if(this.found.has(t.id)||Math.abs(py-(t.y||0))>=1.5)continue;const d=Math.hypot(t.x-p.x,t.z-p.z);if(d<bd){bd=d;best=t;}}
      if(best){h.target=best;h.t=0;h.fromX=h.x;h.fromZ=h.z;}else h.cool=.4;
      return;
    }
    h.t+=dt/POWER.ghostFly;const k=Math.min(1,h.t),t=h.target;
    h.x=h.fromX+(t.x-h.fromX)*k;h.z=h.fromZ+(t.z-h.fromZ)*k;
    if(k>=1){h.target=null;h.cool=POWER.ghostEvery-POWER.ghostFly>0?POWER.ghostEvery-POWER.ghostFly:.05;if(!this.found.has(t.id))this.takeItem(t,p,fun,{blast:true});}
  }
  startTempo(){
    if(this.rush?.mode!=='clean')return null;
    this.course=null;
    this.flash.reset();const ev=this.tempo.start();for(const e of ev)this.events.push(e);return ev;
  }
  // Ny City Explore-runda: ingen kedja, inga superkrafter, alla termosar tillbaka.
  newExploreRun(seed=Math.floor(Math.random()*1e6)){this.lastStep=null;this.lastRespawn=0;this.foundAt.clear();this.fun.newRun();this.flash.seed=seed;this.flash.reset();this.tempo.reset();this.dropPearls?.(true);this.course=null;this.endSite?.();this.sitesDone?.clear();this.places?.cancel('mode');}
  // Närmaste ofunna skatt på samma våning, för hett/kallt-mätaren.
  nearestHidden(p){
    const py=(p.y??1.68)-1.68;let best=null,bd=Infinity;
    for(const [list,found] of [[this.secrets,this.secretsFound],[this.treasures,this.treasuresFound]])
      for(const t of list){if(found.has(t.id)||Math.abs(py-(t.y||0))>2.5)continue;const d=Math.hypot(p.x-t.x,p.z-t.z);if(d<bd){bd=d;best=t;}}
    return best?{item:best,distance:bd,heat:heatFor(bd)}:null;
  }
  // Turbo-kilometer räknas av spelet; här delas märken ut.
  noteTurbo(meters){if(this.rush?.mode!=='clean')return;for(const e of this.fun.addTurbo(meters))this.events.push(e);for(const e of this.flash.noteMeters(meters))this.handleFlash(e);}
  // MusicPartner på Kungsgatan: incheckning ger bonus en gång per dag. Bara i City Explore.
  musicCheckIn(){
    if(this.rush?.mode!=='clean')return null;const r=this.fun.checkIn();
    if(r.first){this.events.push({type:'checkin',name:MUSIC_OFFICE.name,bonus:MUSIC_OFFICE.checkinBonus});for(const e of r.events)this.events.push(e);this.reward(MUSIC_OFFICE.checkinBonus);this.save();}
    return {first:r.first,bonus:r.first?MUSIC_OFFICE.checkinBonus:0};
  }
  nearOffice(p){return Math.hypot(p.x-MUSIC_OFFICE.x,p.z-MUSIC_OFFICE.z)<MUSIC_OFFICE.radius;}
  // Återställ poäng och nivå (inte album, skatter eller märken).
  resetXp(){this.balance=0;this.lifetime=0;if(this.rush)this.rush.xp=0;this.fun.resetLevel();this.dirty=true;this.save();return {balance:0,lifetime:0};}
  // Framme med bussen: första besöket på en hållplats ger bonus, och märken kan låsas upp.
  busArrive(stop,quiz=null){
    if(this.rush?.mode!=='clean')return null;
    const r=this.fun.ride(stop,BUS_FIRST_RIDE_BONUS,quiz),qp=Math.max(0,Math.min(500,Math.round(quiz?.points||0)));
    this.events.push({type:'bus-arrive',id:stop.id,name:stop.name,first:r.first,bonus:r.bonus,visited:r.visited,total:r.total,quiz:quiz?{correct:quiz.correct,total:quiz.total,points:qp}:null});
    for(const e of r.events)this.events.push(e);
    if(r.bonus+qp)this.reward(r.bonus+qp);
    this.save();return r;
  }
  nearestBus(p){return (this.rush?.peaceful?this.busNetwork:this.busStops).map(s=>({...s,distance:Math.hypot(p.x-s.x,p.z-s.z)})).sort((a,b)=>a.distance-b.distance)[0];}
  nearestPortal(p){return Object.entries(this.portals).map(([id,q])=>({id,...q,distance:Math.hypot(p.x-q.x,p.z-q.z)})).sort((a,b)=>a.distance-b.distance)[0];}
  step(dt,player,forward={x:0,z:-1}){
    if(this.phase!=='playing'||!player||!Number.isFinite(dt)||dt<=0)return;
    if(this.rush.peaceful||atMarieberg(player)||atKil(player)){this.stepExplore(Math.min(dt,1),player,forward);return;}
    this.position={x:player.x,z:player.z};this.heading=Math.atan2(-forward.x,-forward.z)*180/Math.PI;this.pursuitRange=this.rush.ecology.scent>=40?38:22;super.step(dt,player);
    if(this.phase!=='playing')return;
    this.clerks?.step(Math.min(dt,1),player);
    this.rush.step(Math.min(dt,1),player,forward);if(this.phase!=='playing')return;
    const sweep=this.trackMove(dt,player),reach=catchReach(this.speed);
    for(const item of this.items)if(!this.found.has(item.id)&&this.inCatch(item,player,reach,sweep)){
      this.found.add(item.id);this.collectChain=this.elapsed-this.lastCollect<6?this.collectChain+1:1;this.lastCollect=this.elapsed;
      const gagata=pedestrianAt(item),bonus=(this.collectChain%5===0?25:0)+(gagata?GAGATA_BONUS:0);this.reward(25+bonus);this.energy=Math.min(100,this.energy+15);this.rush?.raisePanic(5);this.rush?.ecology.coffee();
      this.events.push({type:'thermos',points:25+bonus,chain:this.collectChain,x:item.x,z:item.z,id:item.id,gagata});
    }
    for(const s of this.secrets)if(Math.abs((player.y??1.68)-1.68-(s.y??0))<1.8&&!this.secretsFound.has(s.id)&&Math.hypot(player.x-s.x,player.z-s.z)<1.8){
      this.secretsFound.add(s.id);this.reward(200);this.energy=100;this.health=100;this.events.push({type:'secret',name:s.name});
    }
    for(const p of this.postcards)if((player.y??1.68)<3.7&&!this.postcardsFound.has(p.id)&&Math.hypot(player.x-p.x,player.z-p.z)<2.4){this.postcardsFound.add(p.id);this.reward(100);this.rush.addTime(8);this.events.push({type:'postcard',name:p.name});this.save();}
    if(this.pendingAmbush&&this.elapsed>=this.pendingAmbush.at){
      const free=this.actors.find(a=>!a.active),ambush=this.pendingAmbush.ambush;
      if(free&&(player.y??1.68)<3.7&&this.actors.filter(a=>a.active).length<6){this.spawn(free,ambush.spawn,this.rush.ecology.scent>=60||this.cleared.size%3===0?'runner':'walker');free.ambushId=ambush.id;free.ambushAt=this.elapsed;this.events.push({type:'ambush',name:ambush.name});}
      this.pendingAmbush=null;
    }
    if((player.y??1.68)<3.7&&this.elapsed>8&&!this.pendingAmbush&&this.elapsed-this.lastAmbush>(this.rush.ecology.scent>=80?10:18)&&this.actors.filter(a=>a.active).length<3){
      const ambush=this.ambushes.find(a=>{
        const dx=a.spawn.x-player.x,dz=a.spawn.z-player.z,d=Math.hypot(dx,dz);
        const outOfView=(dx*forward.x+dz*forward.z)/Math.max(.01,d)<.35||!this.visible(player.x,player.z,a.spawn.x,a.spawn.z);
        return outOfView&&!this.cleared.has(a.id)&&!this.actors.some(z=>z.active&&z.ambushId===a.id)&&Math.hypot(player.x-a.trigger.x,player.z-a.trigger.z)<(this.rush.ecology.scent>=80?13:7)&&d>2.5;
      });
      if(ambush){this.pendingAmbush={ambush,at:this.elapsed+.65};this.lastAmbush=this.elapsed;this.events.push({type:'rustle'});}
    }
    // A tiny reserve restores an emergency shot; thermoses and points power strong attacks.
    if(this.energy<12)this.energy=Math.min(12,this.energy+dt*.75);
    if(this.elapsed-this.lastSave>=4){this.lastSave=this.elapsed;this.save();}
  }
}
