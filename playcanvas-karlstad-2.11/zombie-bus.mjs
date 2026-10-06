const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const turns=[0,1,1,-1,-1,1,-1,1];
// Zombiechauffören klantar sig: somnar vid ratten, och bussens skärm (BussQuiz/GPS) ballar ur så att bussen vill åt fel håll.
// Spelaren fixar det: skaka föraren (3 gånger) eller svara rätt på skärmen. Bara med incidents:true, så att äldre regler och tester är oförändrade.
export const INCIDENTS=Object.freeze([{at:5.5,kind:'sleep',dir:1},{at:14.5,kind:'gps',dir:-1},{at:22,kind:'sleep',dir:-1}]);
export class ZombieBus {
  constructor(route,{duration=30,incidents=false}={}){
    this.incidents=!!incidents;this.incident=null;this.nextIncident=0;this.resolved=0;this.drift=0;this.incidentLog=[];
    if(route.length<2)throw new Error('Bussen behöver en sammanhängande färdväg.');
    this.route=route.map(p=>({...p}));this.lengths=[0];for(let i=1;i<route.length;i++)this.lengths.push(this.lengths[i-1]+Math.hypot(route[i].x-route[i-1].x,route[i].z-route[i-1].z));
    this.distance=this.lengths.at(-1);this.duration=duration;this.elapsed=0;this.roll=0;this.velocity=0;this.health=100;this.steady=0;this.state='playing';this.turn=0;this.points=0;this.lastBeat=-1;this.falls=0;this.passengers=Array.from({length:3},(_,i)=>({x:(i-1)*.05,vx:0,angle:0,bounce:0,fallen:false,recover:0}));
  }
  sample(progress){
    const d=clamp(progress,0,1)*this.distance;let i=1;while(i<this.lengths.length-1&&this.lengths[i]<d)i++;
    const a=this.route[i-1],b=this.route[i],t=(d-this.lengths[i-1])/Math.max(.001,this.lengths[i]-this.lengths[i-1]);
    return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
  }
  pose(){const p=this.sample(this.elapsed/this.duration),ahead=this.sample(Math.min(1,(this.elapsed+.65)/this.duration));return {...p,heading:Math.atan2(p.x-ahead.x,p.z-ahead.z)*180/Math.PI,roll:clamp(this.roll*7,-11,11)};}
  step(dt,input=0){
    if(this.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;
    let left=Math.min(dt,.5);input=clamp(Number(input)||0,-1,1);
    while(left>.000001&&this.state==='playing'){
      const h=Math.min(left,1/120,this.duration-this.elapsed);left-=h;this.elapsed+=h;
      const beat=Math.min(turns.length-1,Math.floor(this.elapsed/4));this.turn=turns[beat];
      // Steering corrects lateral drift. Passengers react, without changing FPS controls.
      const jolt=this.elapsed>4?Math.sin(this.elapsed*2.5)*.25:0;
      if(this.incidents)this.stepIncident(h);
      this.velocity+=(this.turn*3+input*4.2+jolt-this.roll*.5-this.velocity*2.2)*h;
      this.roll=clamp(this.roll+this.velocity*h,-2,2);
      for(const [i,p] of this.passengers.entries()){
        const pothole=this.elapsed>16&&this.elapsed<16.25?5:0;
        p.vx+=(this.turn*(.7+i*.1)+this.velocity*2-p.x*2-p.vx*2.6)*h;p.x=clamp(p.x+p.vx*h,-1.3,1.3);
        p.bounce=Math.max(0,Math.sin((this.elapsed-16)*10))*(this.elapsed>16&&this.elapsed<16.65?.65:0);
        const tumble=Math.abs(p.x)>.38||Math.abs(this.roll)>.65||pothole>0;
        if(tumble&&!p.fallen&&p.recover<=0){p.fallen=true;p.recover=1.3;this.falls++;}
        p.recover=Math.max(0,p.recover-h);if(p.fallen&&p.recover===0&&Math.abs(p.x)<.6)p.fallen=false;
        const tilt=p.fallen?(p.x>=0?1:-1)*1.12:clamp(p.x*.55,-.45,.45);p.angle+=(tilt-p.angle)*(1-Math.exp(-h*9));
      }
      if(Math.abs(this.roll)<.4)this.steady+=h;
      if(Math.abs(this.roll)>.7)this.health=Math.max(0,this.health-(Math.abs(this.roll)-.7)*38*h);
      if(this.health===0){this.state='crashed';break;}
      if(this.elapsed>=this.duration-.00001){this.elapsed=this.duration;this.state='arrived';this.points=200+Math.round(this.steady*5)+this.resolved*40;}
    }
  }
  stepIncident(h){
    const next=INCIDENTS[this.nextIncident];
    if(!this.incident&&next&&this.elapsed>=next.at){this.nextIncident++;this.incident={kind:next.kind,since:this.elapsed,need:next.kind==='sleep'?3:1,dir:next.dir};this.incidentLog.push({kind:next.kind,at:this.elapsed});}
    if(!this.incident){this.drift=0;return;}
    const age=this.elapsed-this.incident.since;this.drift=this.incident.dir*Math.min(3.4,1.4+age*.45);this.velocity+=this.drift*h;
    if(age>8)this.health=Math.max(0,this.health-4*h);
  }
  // Skaka föraren: tre skakar väcker honom. Returnerar true när incidenten är löst.
  shake(){const i=this.incident;if(!i||i.kind!=='sleep')return false;i.need--;if(i.need>0)return false;this.incident=null;this.resolved++;return true;}
  // Skärmen startas om (rätt svar i quizet).
  fixGps(){const i=this.incident;if(!i||i.kind!=='gps')return false;this.incident=null;this.resolved++;return true;}
  // Fel svar på skärmen skakar om bussen.
  bump(damage=6){this.health=Math.max(0,this.health-damage);if(this.health===0&&this.state==='playing')this.state='crashed';}
  get remaining(){return Math.max(0,this.duration-this.elapsed);}
  get instruction(){if(this.incident)return this.incident.kind==='sleep'?'FÖRAREN SOMNAR! SKAKA HONOM':'SKÄRMEN BALLAR UR! SVARA RÄTT';return this.elapsed<3?'DRAG RATTEN ÅT SIDORNA':this.roll>.18?'← STYR VÄNSTER':this.roll<-.18?'STYR HÖGER →':'SNYGGT! HÅLL KURSEN';}
  get quip(){if(this.incident)return this.incident.kind==='sleep'?'CHAUFFÖREN: ”ZZZ… ÄR VI FRAMME?”':'SKÄRMEN: ”SVÄNG VÄNSTER I VÄNERN.”';return this.elapsed<4?'KÖRKORT? JAG HAR BUSSKORT.':this.elapsed>15&&this.elapsed<18?'FARTHINDER? FLYGHINDER.':this.elapsed>9&&this.elapsed<12?'KAFFET ÅKER GRATIS.':this.health<35?'DET DÄR VAR NOG HJULUPPHÄNGNINGEN.':this.passengers.some(p=>p.fallen)?'NÄSTA HÅLLPLATS: GOLVET.':'HÅLL I DIG. TIDTABELLEN ÄR ETT FÖRSLAG.';}
  snapshot(){return {incident:this.incident?{kind:this.incident.kind,need:this.incident.need,age:this.elapsed-this.incident.since}:null,resolved:this.resolved,driver:{sleeping:this.incident?.kind==='sleep',panic:this.incident?.kind==='gps'},state:this.state,elapsed:this.elapsed,falls:this.falls,passengers:this.passengers.map(p=>({...p})),remaining:this.remaining,roll:this.roll,turn:this.turn,health:this.health,points:this.points,progress:this.elapsed/this.duration};}
}
