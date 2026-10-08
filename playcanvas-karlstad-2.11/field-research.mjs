// 2.12 Fältuppdrag: three small, seeded research tasks per zombie hunt (in the spirit of
// Pokémon GO field research). They only listen to events the game already emits, so they
// add goals without adding a new system to the world. Same seed → same three tasks, which
// keeps Dagens Karlstad fair between friends.
export const RESEARCH=Object.freeze({count:3,taskXp:30,taskSeconds:8,breakthroughXp:60,breakthroughSeconds:12});

export const RESEARCH_TASKS=Object.freeze([
  {id:'zombies',hud:'ZOMBIES',goal:8,text:'STOPPA 8 ZOMBIES',match:e=>e.type==='zap'},
  {id:'runners',hud:'SPRINT-STEFFE',goal:3,text:'STOPPA 3 SPRINT-STEFFE',match:e=>e.type==='zap'&&e.kind==='runner'},
  {id:'walkers',hud:'PÅTÅRS-PIA',goal:4,text:'STOPPA 4 PÅTÅRS-PIA',match:e=>e.type==='zap'&&e.kind==='walker'},
  {id:'tank',hud:'FÄLL TERMOS-TORSTEN',goal:1,text:'FÄLL TERMOS-TORSTEN',match:e=>e.type==='zap'&&e.kind==='tank',hard:true},
  {id:'streak',hud:'SOLSTREAK ×3',goal:1,text:'SOLSTREAK × 3',match:e=>e.type==='zap'&&e.combo>=3},
  {id:'thermos',hud:'TERMOSAR',goal:4,text:'PLOCKA 4 TERMOSAR',match:e=>e.type==='thermos'},
  {id:'gagata',hud:'GÅGATUTERMOSAR',goal:2,text:'2 TERMOSAR PÅ GÅGATA',match:e=>e.type==='thermos'&&e.gagata},
  {id:'street',hud:'GATUHÄNDELSER',goal:2,text:'KLARA 2 GATUHÄNDELSER',match:e=>e.type==='street-complete'},
  {id:'sun',hud:'SOLBADA 6 S',goal:1,text:'SOLBADA 6 SEKUNDER',match:e=>e.type==='sun-bonus'},
  {id:'golden',hud:'FÅNGA GULD-NISSE',goal:1,text:'FÅNGA GULD-NISSE',match:e=>e.type==='golden-caught',hard:true}
]);

export function pickResearch(random){
  const pool=[...RESEARCH_TASKS],picked=[];
  while(picked.length<RESEARCH.count&&pool.length){
    const task=pool.splice(Math.floor(random()*pool.length),1)[0];
    // At most one hard task, and never two kill-count tasks that overlap completely.
    if(task.hard&&picked.some(t=>t.hard))continue;
    if(task.id==='zombies'&&picked.some(t=>t.id==='walkers'))continue;
    if(task.id==='walkers'&&picked.some(t=>t.id==='zombies'))continue;
    picked.push(task);
  }
  return picked.map(t=>({id:t.id,text:t.text,hud:t.hud,goal:t.goal,count:0,done:false}));
}

export class FieldResearch {
  constructor(random=Math.random){this.reset(random);}
  reset(random=Math.random){this.tasks=pickResearch(random);this.breakthrough=false;}
  get completed(){return this.tasks.filter(t=>t.done).length;}
  current(){return this.tasks.find(t=>!t.done)||null;}
  // Returns the reward events; the caller pays XP/time through its own reward path.
  observe(events,pay=()=>{}){
    const out=[];
    for(const e of events)for(const task of this.tasks){
      if(task.done)continue;
      const def=RESEARCH_TASKS.find(t=>t.id===task.id);if(!def?.match(e))continue;
      task.count=Math.min(task.goal,task.count+1);
      if(task.count===task.goal){
        task.done=true;pay(RESEARCH.taskXp,RESEARCH.taskSeconds);
        out.push({type:'research-complete',id:task.id,text:task.text,points:RESEARCH.taskXp,seconds:RESEARCH.taskSeconds,completed:this.completed,total:this.tasks.length});
      }
    }
    if(!this.breakthrough&&this.tasks.length&&this.completed===this.tasks.length){
      this.breakthrough=true;pay(RESEARCH.breakthroughXp,RESEARCH.breakthroughSeconds);
      out.push({type:'research-breakthrough',points:RESEARCH.breakthroughXp,seconds:RESEARCH.breakthroughSeconds});
    }
    return out;
  }
  hudLine(){
    const t=this.current();
    // Fits the phone status strip (about 30 characters); the full task text is in the toast.
    if(!t)return 'FÄLT 3/3 · GENOMBROTT KLART';
    return 'FÄLT '+this.completed+'/'+this.tasks.length+' · '+(t.hud||t.text)+(t.goal>1?' '+t.count+'/'+t.goal:'');
  }
  snapshot(){return {breakthrough:this.breakthrough,tasks:this.tasks.map(t=>({...t}))};}
}
