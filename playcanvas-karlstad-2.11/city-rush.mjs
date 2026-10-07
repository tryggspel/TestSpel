import {nearestByRoute} from './city-guidance.mjs?v=2.18.0';
import {beginStory,storyAction,stepStory,STREET_STORIES} from './street-stories.mjs?v=2.18.0';
import {seededRandom,saveDailyResult,dailyRecord} from './daily-challenge.mjs?v=2.18.0';
import {CityEcology} from './city-ecology.mjs?v=2.18.0';
import {FieldResearch} from './field-research.mjs?v=2.18.0';
export const RUSH=Object.freeze({seconds:180,target:1000,maxTime:210,maxEnemies:6});
// 2.12 Guld-Gunnar: one rare, fleeing zombie per hunt. Catch him for a big reward.
export const GOLDEN=Object.freeze({earliest:24,spread:26,seconds:18,points:120,time:12});
export const CHAOS=Object.freeze({minDelay:20,maxDelay:45,firstDelay:22,fallSeconds:24,blackoutSeconds:4,blackoutGap:150,firstBlackout:45});
export const POSTCARDS=Object.freeze([
  {id:'church',name:'Domkyrkan',file:'domkyrkan.jpg',x:158,z:-85},
  {id:'autumn',name:'Höstpromenaden',file:'hostgatan.jpg',x:-25,z:-145},
  {id:'street',name:'Stadens gator',file:'gatan.jpg',x:-40,z:30}
]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const tierFor=panic=>panic>=100?4:panic>=75?3:panic>=50?2:panic>=25?1:0;

export class CityRush {
  constructor(city){
    this.city=city;this.spent=0;this.mode='free';this.state='idle';this.best=0;this.xp=0;this.time=RUSH.seconds;this.contract=null;this.contractSerial=0;this.patrolSerial=0;this.storySerial=0;this.escapeGoal=null;this.busGoal=null;
    this.panic=0;this.panicTier=0;this.chaosCount=0;this.nextChaos=CHAOS.firstDelay;this.chaosTarget=null;this.fallUntil=0;this.nextFallSpawn=0;
    this.ecology=new CityEcology(this);this.seed=280926;this.random=seededRandom(this.seed);this.research=new FieldResearch(this.random);this.golden=null;this.challenge=null;this.blackoutUntil=0;this.nextBlackout=CHAOS.firstBlackout;
    try{this.best=Math.max(0,Math.min(999999,Number(city.storage?.getItem('karlstad:rush:best:1'))||0));}catch{}
  }
  start(mode='timed',options={}){
    this.city.endChallenge();this.challenge=options.challenge||null;
    if(this.challenge)this.city.beginChallenge(options.kit);
    this.seed=this.challenge?.seed||options.seed||280926;this.random=seededRandom(this.seed);
    this.replayKit=this.city.runKit();this.ecology.reset();this.blackoutUntil=0;this.nextBlackout=this.challenge?.firstChaos==='blackout'?12:CHAOS.firstBlackout;this.peakPanic=0;this.buses=0;this.streetWins=0;this.dailyBest=this.challenge?.kind==='daily'?dailyRecord(this.city.storage,this.challenge.day).best:0;
    this.mode=mode;this.state='playing';this.xp=0;this.time=this.challenge?.seconds||RUSH.seconds;this.spent=0;this.contract=null;this.contractSerial=0;this.patrolSerial=0;this.storySerial=0;this.escapeGoal=null;this.busGoal=null;
    this.nextContract=2;this.nextPatrol=6;this.alerted=false;this.exitReady=false;this.bonus=0;
    this.panic=0;this.panicTier=0;this.chaosCount=0;this.nextChaos=CHAOS.firstDelay;this.chaosTarget=null;this.fallUntil=0;this.nextFallSpawn=0;
    const g=this.city;g.clerks?.reset();g.phase='playing';g.health=100;g.energy=Math.round(Math.max(45,g.energy));g.actors.forEach(a=>a.active=false);g.found.clear();g.pendingAmbush=null;g.contactCooldown=3;g.cooldown=0;g.chains.clear();g.events=[];g.elapsed=0;g.bestChain=g.chainRun=0;g.lastZap=-100;g.score=g.captured=g.shots=g.hitShots=0;g.lastAmbush=-100;g.lastSave=0;g.collectChain=0;g.lastCollect=-100;g.position={...g.layout.spawn};g.heading=0;g.routeMode='hunt';g.newExploreRun?.();
    // Research and Guld-Gunnar use their own seeded stream so they never shift the chaos order.
    const side=seededRandom((this.seed*7+13)>>>0);this.research.reset(side);this.golden={at:GOLDEN.earliest+Math.floor(side()*GOLDEN.spread),actor:null,until:0,done:false};
    this.chaosOrder=this.challenge?.firstChaos==='blackout'?[1,2,0]:[0,1,2];
    if(!this.challenge?.firstChaos){const offset=this.seed===280926?0:Math.floor(this.random()*3);this.chaosOrder=[offset,(offset+1)%3,(offset+2)%3];}
    if(this.challenge?.firstChaos)this.nextChaos=12;
    if(this.challenge?.panic)this.raisePanic(this.challenge.panic);
    g.save();
  }
  get peaceful(){return this.mode==='clean'||this.mode==='trail';}
  spawnGolden(p,f){
    const g=this.city,actor=g.actors.find(a=>!a.active);if(!actor)return false;
    const spot=this.spot(p,f,false,.2);if(distance(p,spot)<8)return false;
    g.spawn(actor,spot,'golden');actor.patrolId=null;actor.contractId=null;
    this.golden.actor=actor;this.golden.until=this.spent+GOLDEN.seconds;
    g.events.push({type:'golden-spawn',seconds:GOLDEN.seconds,x:spot.x,z:spot.z});return true;
  }
  catchGolden(actor){
    if(!this.golden||this.golden.actor!==actor||this.golden.done)return;
    this.golden.done=true;this.golden.caught=true;this.golden.actor=null;
    this.city.reward(GOLDEN.points);this.addTime(GOLDEN.time);this.city.energy=100;this.city.fullEnergyFromShot=true;
    this.city.events.push({type:'golden-caught',points:GOLDEN.points,seconds:GOLDEN.time,x:actor.x,z:actor.z});
  }
  stepGolden(p,f){
    const gd=this.golden;if(!gd||gd.done)return;
    if(gd.actor){
      if(!gd.actor.active){gd.actor=null;gd.done=true;return;}
      if(this.spent>=gd.until){gd.actor.active=false;gd.actor=null;gd.done=true;this.city.events.push({type:'golden-escaped'});}
      return;
    }
    if(this.spent>=gd.at&&!this.exitReady&&!this.fallUntil&&!this.spawnGolden(p,f))gd.at=this.spent+3;
  }
  // 2.12: the hunt reads its own events for Fältuppdrag. Rewards go through the normal XP path.
  observe(events){
    if(this.state!=='playing'||this.peaceful)return [];
    return this.research.observe(events,(xp,seconds)=>{this.city.reward(xp);this.addTime(seconds);});
  }
  earn(points){if(this.state==='playing'){this.xp+=points;if(this.mode==='timed'&&this.xp>=RUSH.target&&!this.exitReady){this.exitReady=true;this.chaosTarget=null;this.city.events.push({type:'exit-open'});}}}
  addTime(seconds){if(this.mode==='timed'&&this.state==='playing')this.time=Math.min(RUSH.maxTime,this.time+seconds);}
  nearestSafe(p){return this.escapeGoal||nearestByRoute(this.city.nav,p,this.city.safeZones);}
  objective(p){
    if(this.mode==='timed'&&this.exitReady){this.escapeGoal ||= this.nearestSafe(p);return {...this.escapeGoal,id:'escape',kind:'escape',label:'TRYGGZON · '+this.escapeGoal.name.toUpperCase(),radius:3.3};}
    if(this.city.routeMode==='mission'||this.city.routeMode==='landmark')return null;
    if(this.city.routeMode==='bus'){this.busGoal ||= nearestByRoute(this.city.nav,p,this.city.busStops);return {...this.busGoal,id:'bus-stop',kind:'bus',label:'BUSS 666 · '+this.busGoal.name.toUpperCase(),radius:6,action:'KLIV PÅ BUSSEN'};}
    if(this.city.routeMode==='sun'&&this.ecology.sun)return {...this.ecology.sun,id:'sun',kind:'sun',label:'FÖLJ SOLA',radius:4.2};
    if(this.city.routeMode==='sun')this.city.routeMode='hunt';
    if(this.golden?.actor?.active)return {x:this.golden.actor.x,z:this.golden.actor.z,id:'golden',kind:'golden',label:'JAGA GULD-GUNNAR · '+Math.max(0,Math.ceil(this.golden.until-this.spent))+' S',radius:2.4};
    const c=this.contract;
    if(c){
      const enemy=c.kind==='hunt'?this.city.actors.find(a=>a.active&&a.contractId===c.id):null;
      return {...(enemy||c.spot),id:c.id,kind:c.kind,label:c.title,radius:2.4,action:c.action};
    }
    if(this.chaosTarget)return {...this.chaosTarget.spot,id:'gold',kind:'gold',label:this.chaosTarget.title,radius:2.3};
    // 2.12: never leave the player without arrows. Between events, point at the nearest thermos.
    const wait=Math.max(1,Math.ceil(this.nextContract-this.spent)),items=this.city.items||[],found=this.city.found;
    const thermos=items.filter(t=>!found?.has(t.id)&&!(t.y>0)&&distance(p,t)<45).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(thermos)return {x:thermos.x,z:thermos.z,id:'coffee-'+thermos.id,kind:'coffee',label:'TERMOS · HÄNDELSE OM '+wait+' S',radius:1.65};
    return {...p,id:'next-event',kind:'wait',label:'NÄSTA GATUHÄNDELSE OM '+wait+' S',radius:2.4};
  }
  beginStory(kind,p,f){if(this.peaceful)return false;return beginStory(this,kind,p,f);}
  interact(p,f){return !this.peaceful&&storyAction(this,p,f);}
  spot(p,forward={x:0,z:-1},back=false,offset=0){
    const heading=Math.atan2(forward.x,forward.z)+(back?Math.PI:0)+offset;
    let best=this.city.nav.point(p),bestDistance=0;
    for(let i=0;i<10;i++){
      const angle=heading+(i%2?1:-1)*Math.ceil(i/2)*.65;
      const q=this.city.nav.point({x:p.x+Math.sin(angle)*16,z:p.z+Math.cos(angle)*16});
      const route=this.city.nav.path(p,q),d=distance(p,q);
      if(route.length>3&&route.length<=12&&d>bestDistance){best=q;bestDistance=d;if(i<3&&d>12)return best;}
    }
    return best;
  }
  spawnEnemy(p,forward,contractId=null,offset=0){
    if(this.peaceful)return null;
    const g=this.city;if(g.actors.filter(a=>a.active).length>=RUSH.maxEnemies)return null;
    const actor=g.actors.find(a=>!a.active),spot=this.spot(p,forward,true,offset);
    if(!actor||distance(p,spot)<5)return null;
    g.spawn(actor,spot,this.spent>45&&this.patrolSerial%4===0?'tank':this.ecology.scent>=60||this.patrolSerial%3===0?'runner':'walker');
    actor.patrolId=++this.patrolSerial;actor.contractId=contractId;actor.ambushAt=g.elapsed;actor.speed*=1+Math.min(.5,this.spent/360)+this.panic*.002;
    return actor;
  }
  raisePanic(points){
    if(this.peaceful||this.state!=='playing'||!Number.isFinite(points)||points<=0)return this.panic;
    const before=this.panic;this.panic=Math.min(100,this.panic+points);this.peakPanic=Math.max(this.peakPanic||0,this.panic);const tier=tierFor(this.panic);
    for(let level=this.panicTier+1;level<=tier;level++){
      this.city.events.push({type:'panic-tier',level,panic:this.panic});
      if(level===4)this.beginFall();
    }
    this.panicTier=Math.max(this.panicTier,tier);
    return this.panic-before;
  }
  beginFall(){
    if(this.fallUntil>this.spent)return;
    this.fallUntil=this.spent+CHAOS.fallSeconds;this.nextFallSpawn=this.spent;
    this.city.events.push({type:'panic-fall',seconds:CHAOS.fallSeconds});
  }
  scheduleChaos(){this.nextChaos=this.spent+CHAOS.minDelay+Math.floor(this.random()*(CHAOS.maxDelay-CHAOS.minDelay+1));}
  tryBlackout(seconds=CHAOS.blackoutSeconds){
    if(this.peaceful)return false;
    if(this.state!=='playing'||this.spent<this.nextBlackout)return false;
    this.blackoutUntil=this.spent+Math.min(CHAOS.blackoutSeconds,Math.max(0,seconds));
    this.nextBlackout=this.spent+CHAOS.blackoutGap;return true;
  }
  triggerChaos(p,f){
    if(this.peaceful)return false;
    if(this.exitReady||this.fallUntil)return false;
    let kind=(this.chaosOrder||[0,1,2])[this.chaosCount%3];this.chaosCount++;this.scheduleChaos();
    if(kind===1&&!this.tryBlackout())kind=2;
    if(kind===0){
      const count=[-.9,0,.9].map(o=>this.spawnEnemy(p,f,null,o)).filter(Boolean).length;
      this.raisePanic(8);this.city.events.push({type:'chaos-bells',count});return true;
    }
    if(kind===1){
      const count=[-.55,.55].map(o=>this.spawnEnemy(p,f,null,o)).filter(Boolean).length;
      this.raisePanic(6);this.city.events.push({type:'chaos-blackout',seconds:CHAOS.blackoutSeconds,count});return true;
    }
    this.chaosTarget={kind:'gold',title:'GULDTERMOS',spot:this.spot(p,f,false,.35),until:this.spent+14,points:160};
    this.raisePanic(3);this.city.events.push({type:'chaos-gold',seconds:14,points:160});return true;
  }
  completeChaos(){
    const c=this.chaosTarget;if(!c)return;
    this.chaosTarget=null;this.city.reward(c.points);this.city.energy=Math.min(100,this.city.energy+30);this.addTime(6);this.raisePanic(12);this.ecology.coffee();
    this.city.events.push({type:'chaos-gold-complete',points:c.points});
  }
  beginContract(p,f){
    if(this.peaceful)return false;
    const index=(this.contractSerial++ + this.seed%3)%6,id='street-'+this.contractSerial;
    const story={1:'power',3:'news',4:'bowling'}[index];if(story){if(!this.beginStory(story,p,f))this.nextContract=this.spent+4;return;}
    if(index===2){
      const enemies=[-.7,0,.7].map(a=>this.spawnEnemy(p,f,id,a)).filter(Boolean);
      if(!enemies.length){this.nextContract=this.spent+4;return;}
      this.contract={id,kind:'hunt',title:'STOPPA FIKATJUVARNA',spot:{...p},until:this.spent+24,left:enemies.length,points:180};
    }else{
      this.contract={id,kind:index===0?'parcel':'solar',stage:0,title:index===0?'HÄMTA KAFFEVÄSKAN':'FÅNGA SOLGLIMTEN',spot:this.spot(p,f),until:this.spent+(index===0?32:16),points:index===0?180:100};
    }
    this.city.events.push({type:'street-event',title:this.contract.title,kind:this.contract.kind});
  }
  kill(actor){if(['hunt','bowling'].includes(this.contract?.kind)&&actor.contractId===this.contract.id){this.contract.left--;if(this.contract.left===0)this.completeContract();}}
  completeContract(){
    const c=this.contract;if(!c)return;this.streetWins++;this.contract=null;this.nextContract=this.spent+5;
    this.city.reward(c.points);this.city.energy=Math.min(100,this.city.energy+25);this.addTime(8);this.raisePanic(4);
    this.city.events.push({type:'street-complete',points:c.points,title:c.kind==='parcel'?'FIKAT LEVERERAT':c.kind==='solar'?'SOL I SINNET':c.kind==='power'?'KARLSTAD LYSER IGEN':c.kind==='news'?'NYHETERNA ÄR UTE':c.kind==='bowling'?'ZOMBIESTRIKE!':'FIKATJUVARNA STOPPADE'});
  }
  clock(dt){
    if(this.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;
    this.spent+=dt;this.raisePanic(dt*.035);
    if(this.mode==='trail'){this.time=Math.max(0,this.time-dt);if(this.time===0){this.state='finished';this.city.phase='paused';this.city.events.push({type:'trail-finish',score:this.xp,count:this.city.found.size});}return;}
    if(this.mode==='timed'){
      this.time=Math.max(0,this.time-dt);
      if(this.time<=30&&!this.alerted){this.alerted=true;this.city.events.push({type:'hunt-alarm'});}
      if(this.time===0)this.end(false,'Tiden tog slut. Zombierna hann ikapp.');
    }
  }
  step(dt,p,f){
    if(this.state!=='playing')return;this.clock(dt);if(this.state!=='playing'||this.peaceful)return;
    // The upper gallery is a brief refuge. The hunt clock keeps running, while
    // street events wait for the player to return to their ground-floor arena.
    if((p.y??1.68)>3.7)return;
    if(this.fallUntil){
      if(this.spent>=this.fallUntil){
        this.fallUntil=0;this.panic=55;this.panicTier=2;this.city.events.push({type:'panic-reset',panic:this.panic});
        this.nextChaos=Math.max(this.nextChaos,this.spent+12);this.nextPatrol=Math.max(this.nextPatrol,this.spent+6);this.ecology.nextSun=this.spent;
      }else if(this.spent>=this.nextFallSpawn){
        this.nextFallSpawn=this.spent+4;
        const count=[-.8,.8].map(o=>this.spawnEnemy(p,f,null,o)).filter(Boolean).length;
        if(count)this.city.events.push({type:'chaos-horde',count});
      }
    }
    this.ecology.step(dt,p,f);
    this.stepGolden(p,f);
    if(this.chaosTarget){
      if(this.spent>=this.chaosTarget.until){this.city.events.push({type:'chaos-gold-missed'});this.chaosTarget=null;}
      else if(distance(p,this.chaosTarget.spot)<2.4)this.completeChaos();
    }
    if(this.spent>=this.nextChaos&&!this.fallUntil&&!this.exitReady){
      if(!this.contract&&!this.chaosTarget)this.triggerChaos(p,f);else this.nextChaos=this.spent+5;
    }
    if(this.mode==='timed'&&this.exitReady&&this.city.safeZones.some(s=>distance(p,s)<3.3)){this.end(true);return;}
    if(!this.contract&&this.spent>=this.nextContract&&!this.exitReady&&!this.chaosTarget)this.beginContract(p,f);
    const c=this.contract;
    if(c){
      if(this.spent>=c.until){if(c.kind==='power')this.blackoutUntil=0;this.city.events.push({type:'street-missed'});this.contract=null;this.nextContract=this.spent+4;}
      else if(STREET_STORIES[c.kind])stepStory(this,dt,p,f);
      else if(c.kind!=='hunt'&&distance(p,c.spot)<2.4){
        if(c.kind==='parcel'&&c.stage===0){c.stage=1;c.title='LEVERERA KAFFEVÄSKAN';c.spot=this.spot(p,{x:-f.z,z:f.x});this.city.events.push({type:'parcel-ready'});}
        else this.completeContract();
      }
    }
    if(this.spent>=this.nextPatrol){
      this.nextPatrol=this.spent+Math.max(5,14-this.spent/30-this.panic/25);
      const a=this.spawnEnemy(p,f);if(a)this.city.events.push({type:'pursuit',count:this.city.actors.filter(a=>a.active).length});
    }
  }
  end(escaped,reason=''){
    if(this.state!=='playing')return;
    this.state=escaped?'escaped':'caught';this.bonus=escaped?Math.floor(this.time)*2:0;this.finalScore=this.xp+this.bonus;
    this.resultHealth=Math.round(this.city.health);this.resultCaptured=this.city.captured;
    if(this.challenge?.kind==='daily')this.dailyBest=saveDailyResult(this.city.storage,this.challenge.day,this.finalScore,escaped).best;
    if(escaped&&!this.challenge){this.city.reward(150);this.best=Math.max(this.best,this.finalScore);try{this.city.storage?.setItem('karlstad:rush:best:1',String(this.best));}catch{}}
    this.resultResearch=this.research.completed;if(this.golden)this.golden.actor=null;this.city.phase=escaped?'won':'lost';this.city.actors.forEach(a=>a.active=false);this.city.pendingAmbush=null;this.contract=null;this.chaosTarget=null;this.fallUntil=0;this.blackoutUntil=0;
    this.city.endChallenge();
    this.city.events.push({type:'hunt-finish',escaped,reason,score:this.finalScore});this.city.save();
  }
  snapshot(){return {research:this.research.snapshot(),golden:this.golden?{at:this.golden.at,done:this.golden.done,active:!!this.golden.actor?.active}:null,seed:this.seed,challenge:this.challenge?{...this.challenge}:null,ecology:this.ecology.snapshot(),blackoutRemaining:Math.max(0,this.blackoutUntil-(this.spent||0)),peakPanic:this.peakPanic||0,dailyBest:this.dailyBest||0,mode:this.mode,state:this.state,xp:this.xp,target:RUSH.target,time:this.time,spent:this.spent||0,best:this.best,exitReady:!!this.exitReady,panic:this.panic,panicTier:this.panicTier,chaosCount:this.chaosCount,fallRemaining:this.fallUntil?Math.max(0,this.fallUntil-this.spent):0,chaosTarget:this.chaosTarget?{...this.chaosTarget,spot:{...this.chaosTarget.spot}}:null,contract:this.contract?{...this.contract,cart:this.contract.cart?{...this.contract.cart,hit:[...this.contract.cart.hit]}:undefined,spot:{...this.contract.spot}}:null};}
}
