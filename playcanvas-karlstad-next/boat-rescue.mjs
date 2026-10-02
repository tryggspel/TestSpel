// Fixed slots, deterministic timing. No city AI or physics simulation aboard.
export class BoatRescue {
  constructor({calm=false,seed=1}={}){
    this.calm=calm;this.seed=seed;this.duration=calm?18:36;this.elapsed=0;this.state='playing';this.saved=0;this.missed=0;this.points=0;this.combo=0;this.bestCombo=0;this.cooldown=0;this.shots=[];
    this.people=Array.from({length:4},(_,i)=>({id:i,status:'waiting',at:1+i*1.25,round:0,until:0}));
  }
  step(dt){
    if(this.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;
    this.elapsed=Math.min(this.duration,this.elapsed+dt);this.cooldown=Math.max(0,this.cooldown-dt);
    this.shots=this.shots.filter(s=>this.elapsed-s.at<.6);
    if(!this.calm)for(const p of this.people){
      if(p.status==='waiting'&&this.elapsed>=p.at&&p.round<3){p.status='deck';p.until=this.elapsed+5.5;p.round++;}
      if(p.status==='deck'&&this.elapsed>=p.until){p.status='water';p.until=this.elapsed+4;}
      if(p.status==='water'&&this.elapsed>=p.until){this.missed++;this.combo=0;p.status='waiting';p.at=this.elapsed+1;}
      if(p.status==='safe'&&this.elapsed>=p.until){p.status='waiting';p.at=this.elapsed+.7;}
    }
    if(this.elapsed===this.duration){this.state='arrived';if(!this.calm)this.points+=this.saved>=8?100:0;}
  }
  throwTo(id){
    const p=this.people.find(p=>p.id===id);
    if(this.calm||this.state!=='playing'||this.cooldown>0||!p||!['deck','water'].includes(p.status))return null;
    const tool=p.status==='water'?'ring':'vest';this.cooldown=.32;this.saved++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);
    const points=20+(this.combo>=3?10:0);this.points+=points;p.status='safe';p.until=this.elapsed+1.2;
    this.shots.push({id,tool,at:this.elapsed});return {tool,points};
  }
  snapshot(){return {calm:this.calm,state:this.state,elapsed:this.elapsed,remaining:this.duration-this.elapsed,duration:this.duration,saved:this.saved,missed:this.missed,points:this.points,combo:this.combo,bestCombo:this.bestCombo,people:this.people.map(p=>({...p})),shots:this.shots.map(s=>({...s}))};}
}
