// Spökrunda för Termosrundan: spelar in din bästa runda lokalt och visar den som ett spöke
// nästa gång. Rundan är redan tidsbunden (3 min) och deterministisk, så spöket är rättvist.
export const GHOST_KEY='karlstad:trail-ghost:1';
export const GHOST_STEP=.2, GHOST_MAX=1200;
export class GhostRun{
  constructor(storage=null){this.storage=storage;this.best=this.load();this.reset();}
  reset(){this.rec=null;this.lastT=-1;}
  load(){
    try{const v=JSON.parse(this.storage?.getItem(GHOST_KEY)||'null');
      if(v?.version===1&&Array.isArray(v.x)&&v.x.length===v.z.length&&v.x.length===v.f.length&&v.x.length>1&&v.x.length<=GHOST_MAX)return v;
    }catch{}
    return null;
  }
  // Anropas varje frame. t = sekunder sedan rundans start.
  record(t,p,found){
    if(!Number.isFinite(t)||!p)return;
    if(!this.rec||t<this.lastT-.5){this.rec={version:1,step:GHOST_STEP,x:[],z:[],y:[],f:[]};}
    this.lastT=t;
    const i=Math.floor(t/GHOST_STEP);
    if(i<this.rec.x.length||this.rec.x.length>=GHOST_MAX)return;
    while(this.rec.x.length<=i&&this.rec.x.length<GHOST_MAX){
      this.rec.x.push(Math.round(p.x*10));this.rec.z.push(Math.round(p.z*10));this.rec.y.push((p.y??1.68)>3.7?1:0);this.rec.f.push(found|0);
    }
  }
  // Rundan klar: spara om den slog tidigare bästa. Returnerar true om nytt spöke sparades.
  finish(score,count){
    const r=this.rec;this.reset();
    if(!r||r.x.length<2)return false;
    if(this.best&&(this.best.score>score||(this.best.score===score&&this.best.count>=count)))return false;
    this.best={...r,score:score|0,count:count|0};
    try{this.storage?.setItem(GHOST_KEY,JSON.stringify(this.best));}catch{}
    return true;
  }
  pose(t){
    const b=this.best;if(!b||!Number.isFinite(t)||t<0)return null;
    const u=t/b.step,i=Math.min(b.x.length-1,Math.floor(u)),j=Math.min(b.x.length-1,i+1),k=Math.min(1,u-i);
    if(u>b.x.length-1+5)return null;
    return {x:(b.x[i]+(b.x[j]-b.x[i])*k)/10,z:(b.z[i]+(b.z[j]-b.z[i])*k)/10,upper:!!b.y[i],found:b.f[i],score:b.score,count:b.count};
  }
}
