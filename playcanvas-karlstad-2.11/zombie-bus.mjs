const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const turns=[0,1,1,-1,-1,1,-1,1];
export class ZombieBus {
  constructor(route,{duration=30}={}){
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
      if(this.elapsed>=this.duration-.00001){this.elapsed=this.duration;this.state='arrived';this.points=200+Math.round(this.steady*5);}
    }
  }
  get remaining(){return Math.max(0,this.duration-this.elapsed);}
  get instruction(){return this.elapsed<3?'DRAG RATTEN ÅT SIDORNA':this.roll>.18?'← STYR VÄNSTER':this.roll<-.18?'STYR HÖGER →':'SNYGGT! HÅLL KURSEN';}
  get quip(){return this.elapsed<4?'KÖRKORT? JAG HAR BUSSKORT.':this.elapsed>15&&this.elapsed<18?'FARTHINDER? FLYGHINDER.':this.elapsed>9&&this.elapsed<12?'KAFFET ÅKER GRATIS.':this.health<35?'DET DÄR VAR NOG HJULUPPHÄNGNINGEN.':this.passengers.some(p=>p.fallen)?'NÄSTA HÅLLPLATS: GOLVET.':'HÅLL I DIG. TIDTABELLEN ÄR ETT FÖRSLAG.';}
  snapshot(){return {state:this.state,elapsed:this.elapsed,falls:this.falls,passengers:this.passengers.map(p=>({...p})),remaining:this.remaining,roll:this.roll,turn:this.turn,health:this.health,points:this.points,progress:this.elapsed/this.duration};}
}
