export const RUSH=Object.freeze({seconds:180,target:800,maxTime:210,maxEnemies:6});
export const POSTCARDS=Object.freeze([
  {id:'church',name:'Domkyrkan',file:'domkyrkan.jpg',x:68,z:-91},
  {id:'autumn',name:'Höstpromenaden',file:'hostgatan.jpg',x:-25,z:-145},
  {id:'street',name:'Stadens gator',file:'gatan.jpg',x:-40,z:30}
]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export class CityRush {
  constructor(city){
    this.city=city;this.mode='free';this.state='idle';this.best=0;this.xp=0;this.time=RUSH.seconds;this.contract=null;this.contractSerial=0;this.patrolSerial=0;
    try{this.best=Math.max(0,Math.min(999999,Number(city.storage?.getItem('karlstad:rush:best:1'))||0));}catch{}
  }
  start(mode='timed'){
    this.mode=mode;this.state='playing';this.xp=0;this.time=RUSH.seconds;this.spent=0;this.contract=null;this.contractSerial=0;this.patrolSerial=0;this.nextContract=2;this.nextPatrol=6;this.alerted=false;this.exitReady=false;this.bonus=0;
    const g=this.city;g.phase='playing';g.health=100;g.energy=Math.max(45,g.energy);g.actors.forEach(a=>a.active=false);g.found.clear();g.pendingAmbush=null;g.contactCooldown=3;g.cooldown=0;g.chains.clear();g.events=[];g.elapsed=0;g.score=g.captured=g.shots=g.hitShots=0;g.lastAmbush=-100;g.lastSave=0;g.collectChain=0;g.lastCollect=-100;g.position={...g.layout.spawn};g.heading=0;g.routeMode='hunt';
    g.save();
  }
  earn(points){if(this.state==='playing'){this.xp+=points;if(this.mode==='timed'&&this.xp>=RUSH.target&&!this.exitReady){this.exitReady=true;this.city.events.push({type:'exit-open'});}}}
  addTime(seconds){if(this.mode==='timed'&&this.state==='playing')this.time=Math.min(RUSH.maxTime,this.time+seconds);}
  nearestSafe(p){return this.city.safeZones.reduce((a,b)=>distance(p,a)<distance(p,b)?a:b);}
  objective(p){
    if(this.mode==='timed'&&this.exitReady)return {...this.nearestSafe(p),label:'TRYGGZON · SÄKRA XP',radius:3.3};
    if(this.contract&&this.city.routeMode!=='mission')return {...this.contract.spot,label:this.contract.title,radius:2.3};
    return null;
  }
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
    const g=this.city;if(g.actors.filter(a=>a.active).length>=RUSH.maxEnemies)return null;
    const actor=g.actors.find(a=>!a.active),spot=this.spot(p,forward,true,offset);
    if(!actor||distance(p,spot)<5)return null;
    g.spawn(actor,spot,this.spent>75&&this.patrolSerial%4===0?'tank':this.patrolSerial%3===0?'runner':'walker');
    actor.patrolId=++this.patrolSerial;actor.contractId=contractId;actor.ambushAt=g.elapsed;actor.speed*=1+Math.min(.5,this.spent/360);
    return actor;
  }
  beginContract(p,f){
    const index=this.contractSerial++%3,id='street-'+this.contractSerial;
    if(index===2){
      const enemies=[-.7,0,.7].map(a=>this.spawnEnemy(p,f,id,a)).filter(Boolean);
      if(!enemies.length){this.nextContract=this.spent+4;return;}
      this.contract={id,kind:'hunt',title:'STOPPA FIKATJUVARNA',spot:{...p},until:this.spent+24,left:enemies.length,points:180};
    }else{
      this.contract={id,kind:index===0?'parcel':'solar',stage:0,title:index===0?'HÄMTA KAFFEVÄSKAN':'FÅNGA SOLGLIMTEN',spot:this.spot(p,f),until:this.spent+(index===0?32:16),points:index===0?180:100};
    }
    this.city.events.push({type:'street-event',title:this.contract.title,kind:this.contract.kind});
  }
  kill(actor){if(this.contract?.kind==='hunt'&&actor.contractId===this.contract.id){this.contract.left--;if(this.contract.left===0)this.completeContract();}}
  completeContract(){
    const c=this.contract;if(!c)return;this.contract=null;this.nextContract=this.spent+5;
    this.city.reward(c.points);this.city.energy=Math.min(100,this.city.energy+25);this.addTime(8);
    this.city.events.push({type:'street-complete',points:c.points,title:c.kind==='parcel'?'FIKAT LEVERERAT':c.kind==='solar'?'SOL I SINNET':'FIKATJUVARNA STOPPADE'});
  }
  clock(dt){
    if(this.state!=='playing')return;
    this.spent+=dt;if(this.mode==='timed'){
      this.time=Math.max(0,this.time-dt);
      if(this.time<=30&&!this.alerted){this.alerted=true;this.city.events.push({type:'hunt-alarm'});}
      if(this.time===0)this.end(false,'Tiden tog slut. Zombierna hann ikapp.');
    }
  }
  step(dt,p,f){
    if(this.state!=='playing')return;this.clock(dt);if(this.state!=='playing')return;
    if(this.mode==='timed'&&this.exitReady&&distance(p,this.nearestSafe(p))<3.3){this.end(true);return;}
    if(!this.contract&&this.spent>=this.nextContract&&!this.exitReady)this.beginContract(p,f);
    const c=this.contract;
    if(c){
      if(this.spent>=c.until){this.city.events.push({type:'street-missed'});this.contract=null;this.nextContract=this.spent+4;}
      else if(c.kind!=='hunt'&&distance(p,c.spot)<2.4){
        if(c.kind==='parcel'&&c.stage===0){c.stage=1;c.title='LEVERERA KAFFEVÄSKAN';c.spot=this.spot(p,{x:-f.z,z:f.x});this.city.events.push({type:'parcel-ready'});}
        else this.completeContract();
      }
    }
    if(this.spent>=this.nextPatrol){
      this.nextPatrol=this.spent+Math.max(7,14-this.spent/30);
      const a=this.spawnEnemy(p,f);if(a)this.city.events.push({type:'pursuit',count:this.city.actors.filter(a=>a.active).length});
    }
  }
  end(escaped,reason=''){
    if(this.state!=='playing')return;
    this.state=escaped?'escaped':'caught';this.bonus=escaped?Math.floor(this.time)*2:0;this.finalScore=this.xp+this.bonus;
    if(escaped){this.city.reward(150);this.best=Math.max(this.best,this.finalScore);try{this.city.storage?.setItem('karlstad:rush:best:1',String(this.best));}catch{}}
    this.city.phase=escaped?'won':'lost';this.city.actors.forEach(a=>a.active=false);this.city.pendingAmbush=null;this.contract=null;
    this.city.events.push({type:'hunt-finish',escaped,reason,score:this.finalScore});this.city.save();
  }
  snapshot(){return {mode:this.mode,state:this.state,xp:this.xp,target:RUSH.target,time:this.time,spent:this.spent||0,best:this.best,exitReady:!!this.exitReady,contract:this.contract?{...this.contract,spot:{...this.contract.spot}}:null};}
}
