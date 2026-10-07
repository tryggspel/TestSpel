// City Explore 2.15: TEMPORUSH. Samma stad och termosar, men tempot stiger varje 15:e sekund.
// Fart, poäng och trycket ökar tillsammans: nästa termos måste plockas innan fikaklockan går ut, annars tappar du ett liv.
// Idéerna kommer från Tetris (nivåer som snabbar upp), Temple Run (farten ökar), Crazy Taxi (tid för snabba leveranser) och Pac-Man (liv).
// Ren logik utan DOM.
export const TEMPO=Object.freeze({
  key:'karlstad:tempo:1',levels:12,levelSeconds:15,lives:3,
  baseSpeed:7.2,speedStep:.08,speedMax:1.9,pointStep:.3,
  minDeadline:5,slackBase:9,slackStep:.7,slackMin:2.2,detour:1.4,flowShare:.5,flowBonus:12
});
export const tempoSpeed=level=>Math.min(TEMPO.speedMax,1+TEMPO.speedStep*(Math.max(1,level)-1));
export const tempoPoints=level=>1+TEMPO.pointStep*(Math.max(1,level)-1);
export const tempoSlack=level=>Math.max(TEMPO.slackMin,TEMPO.slackBase-TEMPO.slackStep*(Math.max(1,level)-1));
// Hur länge man får på sig till nästa termos: sträckan (med omväg) vid ungefär 85 % av farten på den nivån, plus marginal.
export function deadlineFor(distance,level){
  const d=Number.isFinite(distance)?Math.max(0,distance):0;
  return Math.max(TEMPO.minDeadline,d*TEMPO.detour/(TEMPO.baseSpeed*tempoSpeed(level)*.85)+tempoSlack(level));
}
export const TEMPO_NAMES=Object.freeze(['','LUGNT','LUGNT','JOGG','JOGG','SNABBT','SNABBT','RASANDE','RASANDE','GALET','GALET','VANSINNE','VANSINNE']);
export const tempoName=level=>TEMPO_NAMES[Math.max(1,Math.min(TEMPO.levels,level))];

export class TempoRun{
  constructor(storage=null){
    this.storage=storage;this.best={level:0,score:0,picked:0,runs:0};this.load();this.reset();
  }
  load(){
    try{const v=JSON.parse(this.storage?.getItem(TEMPO.key)||'null');
      if(v&&typeof v==='object'){const n=(x,max)=>Number.isFinite(Number(x))?Math.max(0,Math.min(max,Math.floor(Number(x)))):0;
        this.best={level:n(v.level,TEMPO.levels),score:n(v.score,1e9),picked:n(v.picked,1e6),runs:n(v.runs,1e6)};}
    }catch{}
  }
  save(){try{this.storage?.setItem(TEMPO.key,JSON.stringify(this.best));}catch{}}
  reset(){
    this.state='idle';this.level=1;this.lives=TEMPO.lives;this.elapsed=0;this.levelClock=0;this.picked=0;this.score=0;this.misses=0;
    this.target=null;this.deadline=0;this.left=0;this.needTarget=false;this.result=null;
  }
  get running(){return this.state==='running';}
  start(){this.reset();this.state='running';this.needTarget=true;return [{type:'tempo-start',level:1,lives:this.lives}];}
  // Sätt nästa mål: item är {id,x,z}, distance i meter från spelaren.
  setTarget(item,distance){
    this.target=item?{id:item.id,x:item.x,z:item.z,y:item.y||0}:null;this.needTarget=!item;
    this.deadline=this.left=deadlineFor(distance,this.level);
  }
  speedMul(){return this.running?tempoSpeed(this.level):1;}
  pointMul(){return this.running?tempoPoints(this.level):1;}
  // En termos plockades. Returnerar poängfaktor och flytbonus (snabb plockning).
  pick(points=0){
    if(!this.running)return {mult:1,extra:0,flow:false};
    const flow=this.deadline>0&&this.left/this.deadline>=TEMPO.flowShare,mult=tempoPoints(this.level);
    const extra=Math.round(points*(mult-1))+(flow?TEMPO.flowBonus*this.level:0);
    this.picked++;this.score+=Math.round(points*mult)+(flow?TEMPO.flowBonus*this.level:0);
    this.target=null;this.needTarget=true;
    return {mult,extra,flow};
  }
  extend(seconds){if(this.running&&seconds>0){this.left+=seconds;this.deadline+=seconds;}}
  tick(dt){
    if(!this.running||!(dt>0))return [];
    const out=[];this.elapsed+=dt;this.levelClock+=dt;
    if(this.levelClock>=TEMPO.levelSeconds&&this.level<TEMPO.levels){
      this.levelClock-=TEMPO.levelSeconds;this.level++;
      out.push({type:'tempo-level',level:this.level,name:tempoName(this.level),speed:tempoSpeed(this.level),mult:tempoPoints(this.level)});
    }
    if(this.target){
      this.left-=dt;
      if(this.left<=0){
        this.lives--;this.misses++;this.target=null;this.needTarget=true;
        out.push({type:'tempo-miss',lives:this.lives});
        if(this.lives<=0)out.push(this.finish());
      }
    }
    return out;
  }
  finish(){
    this.state='over';const b=this.best;
    const record=this.score>b.score||this.level>b.level&&this.score>=b.score;
    b.runs++;if(this.score>b.score)b.score=this.score;if(this.level>b.level)b.level=this.level;if(this.picked>b.picked)b.picked=this.picked;
    this.save();
    this.result={type:'tempo-over',level:this.level,score:this.score,picked:this.picked,seconds:Math.round(this.elapsed),record,best:{...b}};
    return this.result;
  }
  // Ger upp (pausmenyn) och sparar rundan på samma sätt som en förlust.
  quit(){if(!this.running)return null;return this.finish();}
  snapshot(){
    return {state:this.state,level:this.level,name:tempoName(this.level),lives:this.lives,elapsed:this.elapsed,levelLeft:Math.max(0,TEMPO.levelSeconds-this.levelClock),
      picked:this.picked,score:this.score,left:Math.max(0,this.left),deadline:this.deadline,target:this.target,speed:this.speedMul(),mult:this.pointMul(),best:{...this.best}};
  }
}
