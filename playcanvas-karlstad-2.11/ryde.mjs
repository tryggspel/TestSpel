// Elsparkcyklar ("Ryde") som ligger slängda i staden. Plocka upp, kör, parkera.
// Ren spellogik utan rendering: positioner, batteri, geofence på gågator och parkeringszoner.
// Varumärket används som sponsorkoncept på samma sätt som spelets övriga lokala varumärken.
export const RYDE=Object.freeze({
  speed:2.1,          // × gånghastighet (CORE_LOCK.walkSpeed) — gåkänslan är oförändrad
  slowSpeed:1.0,      // på gågator: samma fart som att gå (som en riktig slow zone)
  batterySeconds:100, // full laddning räcker 100 s körning
  reach:2.4,          // hur nära man måste stå för att plocka upp
  parkBonus:40,       // kaffepoäng för parkering i Ryde-zon
  respawnEvery:20,    // sekunder mellan kontroller av "finns det någon scooter i närheten?"
  nearRadius:120,     // om ingen ledig scooter finns inom så här många meter …
  dropMin:22,dropMax:42 // … läggs den närmaste lediga scootern ut så här långt bort
});
export const RYDE_ZONES=Object.freeze([
  {id:'torget',name:'Stora Torget',x:-50,z:34,r:6},
  {id:'drottninggatan',name:'Drottninggatan väst',x:-150,z:175,r:5},
  {id:'centralen',name:'Karlstad C',x:-186,z:282,r:7},
  {id:'sandgrund',name:'Sandgrund',x:-2,z:-396,r:5},
  {id:'domkyrkan',name:'Domkyrkan',x:150,z:-30,r:6}
]);
// Fasta startplatser, utspridda där det annars blir långa promenader. Snäpps till gångbar mark.
export const RYDE_SPAWNS=Object.freeze([
  [-48,40],[30,40],[-64,118],[-120,175],[60,180],[-190,270],[110,-30],[175,-120],
  [-60,-150],[-40,-300],[-10,-398],[-164,-520],[-300,-110],[120,300],[280,140]
].map(([x,z],i)=>({id:'ryde-'+i,x,z})));
const hash=(a,b)=>{let h=2166136261;for(const c of a+'|'+b)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967296;};

export class RydeFleet{
  constructor({snap=p=>p,walkable=()=>true,slowAt=()=>null}={}){
    this.snap=snap;this.walkable=walkable;this.slowAt=slowAt;
    this.scooters=RYDE_SPAWNS.map(s=>{const q=snap(s);return {id:s.id,x:q.x,z:q.z,battery:1,tilt:hash(s.id,'t')*360};}).filter(s=>walkable(s));
    this.riding=null;this.clock=0;this.lastCheck=0;this.rides=0;this.events=[];
  }
  nearest(p,maxD=Infinity){let best=null,bd=maxD;for(const s of this.scooters){if(s===this.riding)continue;const d=Math.hypot(s.x-p.x,s.z-p.z);if(d<bd&&s.battery>.05){bd=d;best=s;}}return best;}
  canPickUp(p){return !this.riding&&!!this.nearest(p,RYDE.reach);}
  pickUp(p){
    if(this.riding)return null;const s=this.nearest(p,RYDE.reach);if(!s)return null;
    this.riding=s;this.rides++;this.events.push({type:'ryde-start',battery:s.battery});return s;
  }
  zoneAt(p){return RYDE_ZONES.find(z=>Math.hypot(p.x-z.x,p.z-z.z)<=z.r)||null;}
  // Parkera där man står. I en Ryde-zon: bonus och fullt batteri till nästa åkare.
  park(p,reason='player'){
    const s=this.riding;if(!s)return null;this.riding=null;
    s.x=p.x;s.z=p.z;s.tilt=hash(s.id,this.clock)*360;
    const zone=reason==='player'?this.zoneAt(p):null;if(zone)s.battery=1;
    const ev={type:'ryde-park',reason,zone:zone?.name||null,bonus:zone?RYDE.parkBonus:0};this.events.push(ev);return ev;
  }
  // Fartfaktor att multiplicera gånghastigheten med. 0 = inte på scooter.
  speedScale(p){if(!this.riding)return 0;return this.slowAt(p)?RYDE.slowSpeed:RYDE.speed;}
  step(dt,p,moving=true){
    if(!Number.isFinite(dt)||dt<=0)return;this.clock+=dt;
    const s=this.riding;
    if(s){
      s.x=p.x;s.z=p.z;
      if(moving){
        const was=s.battery;s.battery=Math.max(0,s.battery-dt/RYDE.batterySeconds);
        if(was>.2&&s.battery<=.2)this.events.push({type:'ryde-low'});
        const slow=this.slowAt(p);if(slow&&!this.inSlow)this.events.push({type:'ryde-slow',street:slow});this.inSlow=!!slow;
        if(s.battery<=0)this.park(p,'battery');
      }
      return;
    }
    this.inSlow=false;
    if(this.clock-this.lastCheck<RYDE.respawnEvery)return;this.lastCheck=this.clock;
    if(this.nearest(p,RYDE.nearRadius))return;
    // Någon har slängt en scooter i närheten: flytta den lediga scooter som ligger längst bort.
    const far=this.scooters.filter(x=>x!==this.riding).sort((a,b)=>Math.hypot(b.x-p.x,b.z-p.z)-Math.hypot(a.x-p.x,a.z-p.z))[0];if(!far)return;
    for(let k=0;k<16;k++){
      const ang=hash(far.id,Math.floor(this.clock)+k)*Math.PI*2,d=RYDE.dropMin+(RYDE.dropMax-RYDE.dropMin)*hash(far.id,k);
      const q=this.snap({x:p.x+Math.sin(ang)*d,z:p.z+Math.cos(ang)*d});
      if(this.walkable(q)&&Math.hypot(q.x-p.x,q.z-p.z)>12){far.x=q.x;far.z=q.z;far.battery=Math.max(far.battery,.6);far.tilt=hash(far.id,k)*360;this.events.push({type:'ryde-drop',x:q.x,z:q.z,distance:Math.round(Math.hypot(q.x-p.x,q.z-p.z))});return;}
    }
  }
  drain(){const e=this.events;this.events=[];return e;}
}
