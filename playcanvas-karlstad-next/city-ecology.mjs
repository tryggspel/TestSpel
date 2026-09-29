export const SCENT=Object.freeze({perThermos:20,decay:.7,quietSeconds:5,hordeSeconds:12});
export const SUN=Object.freeze({radius:4.2,duration:18,speed:1.8,holdSeconds:6,reward:100});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Two small rule systems over the existing world. No new actor pools or render loop.
export class CityEcology {
  constructor(rush){this.rush=rush;this.reset();}
  reset(){
    this.scent=0;this.lastCoffee=-100;this.hordeUntil=0;this.nextHordeSpawn=0;this.hordeCooldown=0;
    this.sun=null;this.nextSun=24;this.inSun=false;this.sunSeconds=0;this.sunBonuses=0;this.peakScent=0;
  }
  coffee(){
    if(this.rush.state!=='playing')return;
    const previous=this.scent;this.scent=Math.min(100,this.scent+SCENT.perThermos*(this.rush.challenge?.scentScale||1));this.lastCoffee=this.rush.spent;this.peakScent=Math.max(this.peakScent,this.scent);
    for(const tier of [40,60,80])if(previous<tier&&this.scent>=tier)this.rush.city.events.push({type:'scent-tier',tier});
    if(this.scent===100&&!this.hordeUntil&&this.rush.spent>=this.hordeCooldown){
      this.hordeUntil=this.rush.spent+SCENT.hordeSeconds;this.nextHordeSpawn=this.rush.spent;
      this.rush.city.events.push({type:'coffee-catastrophe',seconds:SCENT.hordeSeconds});
    }
  }
  startSun(p,f){
    const r=this.rush,start=r.city.nav.point({x:p.x+f.x*9,z:p.z+f.z*9});
    const end=r.spot(start,f),path=r.city.nav.path(start,end);
    if(path.length<2){this.nextSun=r.spent+5;return;}
    const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+distance(path[i-1],path[i]));
    this.sun={path,lengths,length:lengths.at(-1),x:path[0].x,z:path[0].z,started:r.spent,until:r.spent+(r.challenge?.sunDuration||SUN.duration),held:0,rewarded:false};
    this.rush.city.events.push({type:'sun-start',seconds:r.challenge?.sunDuration||SUN.duration});
  }
  contains(p){return !!this.sun&&distance(p,this.sun)<SUN.radius;}
  step(dt,p,f){
    const r=this.rush,g=r.city,now=r.spent;
    if(this.hordeUntil&&now>=this.hordeUntil){this.hordeUntil=0;this.scent=Math.min(this.scent,55);this.hordeCooldown=now+18;g.events.push({type:'coffee-calm'});}
    if(this.hordeUntil&&now>=this.nextHordeSpawn){this.nextHordeSpawn=now+3;for(const o of [-1,1])r.spawnEnemy(p,f,null,o);}
    if(now-this.lastCoffee>SCENT.quietSeconds)this.scent=Math.max(0,this.scent-dt*SCENT.decay);
    if(!this.sun&&now>=this.nextSun&&!r.fallUntil&&!r.exitReady)this.startSun(p,f);
    this.inSun=false;
    if(this.sun){
      const s=this.sun;
      if(now>=s.until){this.sun=null;this.nextSun=now+38;g.events.push({type:'sun-end'});return;}
      const travel=(now-s.started)*SUN.speed,cycle=travel%(s.length*2),d=cycle>s.length?s.length*2-cycle:cycle;
      let i=1;while(i<s.lengths.length-1&&s.lengths[i]<d)i++;
      const a=s.path[i-1],b=s.path[i],t=(d-s.lengths[i-1])/Math.max(.001,s.lengths[i]-s.lengths[i-1]);s.x=a.x+(b.x-a.x)*t;s.z=a.z+(b.z-a.z)*t;
      this.inSun=this.contains(p)&&g.visible(p.x,p.z,s.x,s.z);
      if(this.inSun){
        this.sunSeconds+=dt;s.held+=dt;g.energy=Math.min(100,g.energy+9*dt);g.health=Math.min(100,g.health+2*dt);g.dirty=true;
        this.scent=Math.max(0,this.scent-9*dt);r.panic=Math.max(0,r.panic-.35*dt);
        if(!s.rewarded&&s.held>=SUN.holdSeconds){s.rewarded=true;this.sunBonuses++;g.reward(SUN.reward);g.events.push({type:'sun-bonus',points:SUN.reward});}
      }
    }
  }
  snapshot(){return {scent:this.scent,peakScent:this.peakScent,inSun:this.inSun,sunSeconds:this.sunSeconds,sunBonuses:this.sunBonuses,hordeRemaining:Math.max(0,this.hordeUntil-this.rush.spent),sun:this.sun?{x:this.sun.x,z:this.sun.z,radius:SUN.radius,remaining:Math.max(0,this.sun.until-this.rush.spent),held:this.sun.held,rewarded:this.sun.rewarded}:null};}
}
