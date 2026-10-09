// Julklappsjakten: vägledningen i paketjakten. Ren modul (ingen DOM, ingen PlayCanvas): matas med spelarens position och kamerans riktning och
// svarar med vad som ska visas: åt vilket håll pilen pekar, hur långt det är, vilka kanter som lyser, var julbandets bitar ligger och
// vad uppdragsraden säger. Spelet (xmas-boot.js) ritar det med xmas-guide-ui.js (pil, kanter, uppdragsrad) och xmas-view.js (julband, stråle).
//
// Varför det här är tydligare än grundspelets markeringar på marken:
//  - Pilen pekar mot nästa kurva på gångvägen (inte rakt genom husen): finns fri sikt pekar den rakt på paketet. Den sitter fast på skärmen,
//    så man ser åt vilket håll man ska gå även när paketet är bakom en, bakom ett hörn eller långt bort.
//  - Markeringen på marken är ett brett rött julband med gyllene kanter och pilar som rullas ut längs gångvägen. Grundspelets pilar är en meter stora och blir
//    nålsmå i den låga vinkel en telefon har (1,7 m ögonhöjd); ett långt, sammanhängande band syns tydligt på 30–40 m och visar riktningen med sin form och sina pilar.
//    Bandet ligger fast i världen (förankrat vid målet): man går fram över det och nya bitar rullas ut längst bort.
//  - Uppdragsraden säger alltid vad man ska göra nu och vad som kommer sedan (samla paket, lämna hos tomten).
import {CityGuidance} from '../city-guidance.mjs?v=2.21.1-xmas.2';
import {arrowInfo} from '../tempo-run.mjs?v=2.21.1-xmas.2';

export const GUIDE=Object.freeze({
  recalcMs:90,moveEps:.4,maxAgeMs:600,          // hur ofta vägen räknas om (när man rör sig) och hur gammal den får bli
  turnRate:7,                                    // pilens utjämning (1/s): den ska inte hoppa när målet byter från ett hörn till paketet
  ahead:18,behind:120,                           // grader: "rakt fram" och "vänd dig om"
  edgeFrom:22,edgeFull:72,                       // grader: från när kanterna börjar lysa, och när de lyser fullt
  window:4,                                      // i ordnade körningar väljer pilen bland de närmaste fyra ej plockade paketen i ordning
  keep:1.35,keepExtra:2,                         // ett nytt mål måste vara 35 % (och 2 m) närmare än det nuvarande, annars byter pilen inte
  // Bandet börjar 4,5 m framför spelaren (närmare ligger det under bildens nederkant och styrkontrollerna) och slutar strax före paketet.
  ribbon:Object.freeze({seg:2.4,lead:4.5,maxLen:40,stopShort:1.8,max:18,width:1.1}),
  // färre effekter (spelets automatiska lättnad): kortare band, samma förankring
  ribbonLite:Object.freeze({seg:2.4,lead:4.5,maxLen:22,stopShort:1.8,max:9,width:1.1})
});

const wrap=a=>{while(a>180)a-=360;while(a<-180)a+=360;return a;};
export const hintFor=angle=>{const ab=Math.abs(angle);return ab<=GUIDE.ahead?'GÅ RAKT FRAM':ab>=GUIDE.behind?'VÄND DIG OM':angle<0?'SVÄNG HÖGER':'SVÄNG VÄNSTER';};
// Kantmarkörer: lyser den sida man ska vända sig åt när målet ligger utanför mitten av bilden, båda när det ligger bakom. Positivt = vänster.
export function edgeLevels(angle){
  const ab=Math.abs(angle),off=ab<GUIDE.edgeFrom?0:.35+.65*Math.min(1,(ab-GUIDE.edgeFrom)/(GUIDE.edgeFull-GUIDE.edgeFrom)),behind=ab>=GUIDE.behind;
  return {l:angle>0||behind?off:0,r:angle<0||behind?off:0,behind};
}

// Julbandet: ett brett band på marken som rullas ut längs vägen till målet. Bandet byggs av korta, platta bitar; en bit är kordan mellan två punkter på vägen,
// så att grannbitar möts i samma punkt och följer kurvorna. Bitarna är förankrade vid målet och ligger kvar i världen när man går.
// Bit j ligger mellan stopShort + j·seg och stopShort + (j+1)·seg meter före målet; bara de som ligger mellan lead och lead+maxLen längs vägen tas med.
// Utdata: {x,z (mitten), yaw (grader, −z framåt mot målet), len, s (avstånd längs vägen från spelaren till bitens mitt), j}. Returnerar antalet.
export function ribbonSegments(path,out,{seg=GUIDE.ribbon.seg,lead=GUIDE.ribbon.lead,maxLen=GUIDE.ribbon.maxLen,stopShort=GUIDE.ribbon.stopShort,max=GUIDE.ribbon.max}={}){
  if(!Array.isArray(path)||path.length<2)return 0;
  let L=0;const cum=[0];for(let i=1;i<path.length;i++){L+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);cum.push(L);}
  const at=(s,o)=>{let i=1;while(i<path.length-1&&cum[i]<s)i++;const a=path[i-1],b=path[i],len=cum[i]-cum[i-1]||1,t=Math.max(0,Math.min(1,(s-cum[i-1])/len));o.x=a.x+(b.x-a.x)*t;o.z=a.z+(b.z-a.z)*t;};
  const A={x:0,z:0},B={x:0,z:0};let n=0;
  for(let j=Math.max(0,Math.ceil((L-stopShort-lead-maxLen)/seg));n<max;j++){
    const sEnd=L-stopShort-j*seg,sStart=sEnd-seg;
    if(sStart<lead)break;
    at(sStart,A);at(sEnd,B);
    const dx=B.x-A.x,dz=B.z-A.z,len=Math.hypot(dx,dz);if(len<.3)continue;
    const m=out[n]||(out[n]={x:0,z:0,yaw:0,len:0,s:0,j:0});
    m.x=(A.x+B.x)/2;m.z=(A.z+B.z)/2;m.yaw=Math.atan2(-dx,-dz)*180/Math.PI;m.len=len;m.s=(sStart+sEnd)/2;m.j=j;n++;
  }
  return n;
}

export class XmasGuide{
  // nav: spelets gångbara karta (CityNavigation). cityGuidance: valfri färdig CityGuidance (i test).
  constructor({nav,cityGuidance=null}={}){
    this.nav=nav||null;this.cg=cityGuidance||(nav&&nav.nearest&&nav.path?new CityGuidance(nav):null);
    this.segs=[];
    this.state={on:false,id:'',label:'',kind:'',distance:0,straight:true,angle:0,hint:'',ahead:false,behind:false,edgeL:0,edgeR:0,steerX:0,steerZ:0,targetX:0,targetZ:0,segs:this.segs,segCount:0,rev:0};
    this.path=[];this.reset();
  }
  reset(){this.tid='';this.last=null;this.at=-1e9;this.steer=null;this.angleSet=false;this.path.length=0;this.state.on=false;this.state.segCount=0;this.state.rev++;}
  // Räknar om vägen: fri sikt = rakt på målet (ingen stigsökning), annars grundspelets stigsökning runt hus (cachad per mål).
  route(p,t,fwd,lite=false){
    const s=this.state,goal={x:t.x,z:t.z,id:t.id,kind:'xmas',label:t.label,radius:t.radius||1.6};
    let straight=true,dist=Math.hypot(t.x-p.x,t.z-p.z),steer=goal,path=this.path;
    path.length=0;path.push({x:p.x,z:p.z});
    if(this.nav&&this.nav.clear&&!this.nav.clear(p,goal)&&this.cg){
      const g=this.cg.update(p,goal,fwd);
      if(g&&g.path&&g.path.length){straight=false;dist=g.distance;steer=g.next||goal;for(const q of g.path)path.push({x:q.x,z:q.z});if(path.length<2||Math.hypot(path.at(-1).x-goal.x,path.at(-1).z-goal.z)>.6)path.push({x:goal.x,z:goal.z});}
    }
    if(straight)path.push({x:goal.x,z:goal.z});
    dist=0;for(let i=1;i<path.length;i++)dist+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z); // vägens längd (grundspelets egen summa kan sluta en ruta före målet)
    this.steer=steer;s.straight=straight;s.distance=Math.round(dist);s.steerX=steer.x;s.steerZ=steer.z;
    s.segCount=ribbonSegments(path,this.segs,lite?GUIDE.ribbonLite:GUIDE.ribbon);s.rev++;
  }
  // En bildruta. target: {id,x,z,kind,label,radius} eller null (då är vägledningen av). fwd: kamerans framåtvektor. Returnerar den delade tillståndsposten.
  update(p,fwd,target,dt,now,lite=false){
    const s=this.state;
    if(!p||!fwd||!target){if(s.on)this.reset();return s;}
    const fresh=!this.last||target.id!==this.tid,moved=this.last?Math.hypot(p.x-this.last.x,p.z-this.last.z):Infinity;
    if(fresh||(moved>=GUIDE.moveEps&&now-this.at>=GUIDE.recalcMs)||now-this.at>=GUIDE.maxAgeMs){
      this.route(p,target,fwd,lite);this.at=now;this.last={x:p.x,z:p.z};this.tid=target.id;
    }
    const raw=arrowInfo(p,fwd,this.steer);if(!raw)return s;
    if(!this.angleSet){s.angle=raw.angle;this.angleSet=true;}
    else s.angle=wrap(s.angle+wrap(raw.angle-s.angle)*Math.min(1,Math.max(0,dt)*GUIDE.turnRate));
    const ab=Math.abs(s.angle),e=edgeLevels(s.angle);
    s.on=true;s.id=target.id;s.label=target.label;s.kind=target.kind;s.targetX=target.x;s.targetZ=target.z;
    s.ahead=ab<=GUIDE.ahead;s.behind=ab>=GUIDE.behind;s.hint=hintFor(s.angle);s.edgeL=e.l;s.edgeR=e.r;
    return s;
  }
}

// Uppdragsraden: vad man ska göra nu och sedan. Rader: {id,text,state} där state är now | next | done | wait. `key` ändras bara när något ska ritas om.
export function missionView(run){
  if(!run)return null;
  const rows=[];
  if(run.kind==='free'){
    const left=run.packages.reduce((n,k)=>n+(k.collected?0:1),0);
    if(left>0)rows.push({id:'free',text:'PLOCKA PAKETEN · '+left+' KVAR',state:'now'});
    else rows.push({id:'wait',text:'NÄSTA PAKETREGN OM '+Math.max(1,Math.ceil((run.nextRainAt-run.t)||0))+' S',state:'wait'});
  }else if(run.kind==='delivery'){
    rows.push({id:'deliver',text:'BÄR FIKAT TILL TOMTEN',state:run.phase==='done'?'done':'now'});
  }else{
    const collecting=run.phase==='collect',g=run.goal||0;
    rows.push({id:'collect',text:'SAMLA PAKET '+(collecting?run.collected:g)+'/'+g,state:collecting?'now':'done'});
    rows.push({id:'deliver',text:'LÄMNA HOS TOMTEN',state:run.phase==='deliver'?'now':run.phase==='done'?'done':'next'});
  }
  return {rows,key:rows.map(r=>r.id+':'+r.state+':'+r.text).join('|')};
}
