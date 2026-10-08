// Julklappsjakten: spelmotorn för paketjakten. Ren modul: ingen DOM, ingen PlayCanvas. Spelet (xmas-boot.js) matar den med spelarens
// position varje steg och läser händelser (xmas-pick, xmas-goal, xmas-deliver, ...) som vyn, ljudet och gränssnittet reagerar på.
//
// Regler i korthet:
//  - Paketen har stabila ID. Ett plockat paket kan aldrig plockas igen i samma körning, hur man än rör sig (inga poäng två gånger).
//  - Fångstfältet är detsamma som i 2.20.0 (växer med farten) och kräver fri sikt: inget paket tas genom en vägg.
//  - Introduktionen har ingen tidsgräns. Rundor har en mjuk tid: den ger bara tidsbonus, man kan alltid lämna in.
//  - Fri julvandring delar ut nya paketregn med jämna mellanrum; varje regn har egna ID och en tydlig varning, och försvinner efter en stund.
import {CATCH,catchReach} from '../journey-rules.mjs?v=2.21.1-xmas.1';
import {PACKAGE_POINTS,COMBO,comboMult,DELIVERY,timeBonus,FREE_RAIN,STAMPS} from './xmas-config.mjs?v=2.21.1-xmas.1';
import {INTRO,INTRO_GOAL} from './xmas-layout.mjs?v=2.21.1-xmas.1';

function closestOnSegment(px,pz,ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz,t=len2>0?Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/len2)):0,x=ax+dx*t,z=az+dz*t;
  return {x,z,d:Math.hypot(x-px,z-pz)};
}
export const seededRandom=seed=>{let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};};

export class XmasHunt{
  constructor({save=null,nav={},rand=Math.random,reward=null}={}){
    this.save=save;this.nav={blocked:()=>false,snap:p=>p,...nav};this.rand=rand;this.reward=reward;
    this.run=null;this.events=[];this.serial=0;this.lastStep=null;
  }
  get active(){return !!this.run&&this.run.phase!=='done'&&this.run.phase!=='ended';}
  emit(e){this.events.push(e);}
  drain(){const out=this.events;this.events=[];return out;}

  // ── Starta körningar ──────────────────────────────────────────────────────────────────────────────────────────
  startIntro(){
    return this.startRun({kind:'intro',id:'intro',title:'HJÄLP TOMTEN!',goal:INTRO_GOAL,packages:INTRO.packages,tomte:INTRO.tomte,spawn:INTRO.spawn,windowSec:COMBO.introWindow,soft:0,tree:INTRO.tree,stampId:'intro'});
  }
  startRun(def){
    const packages=def.packages.map(p=>({id:p.id,x:p.x,z:p.z,y:p.y||0,kind:p.kind==='bonus'?'bonus':'regular',cluster:p.cluster??0,collected:false,at:0}));
    const regular=packages.filter(p=>p.kind==='regular').length,bonus=packages.length-regular;
    this.run={serial:++this.serial,kind:def.kind,id:def.id,title:def.title||'',phase:def.phase||(def.kind==='free'?'free':'collect'),goal:def.goal||0,packages,byId:new Map(packages.map(p=>[p.id,p])),
      collected:0,bonusCollected:0,regularTotal:regular,bonusTotal:bonus,points:0,chain:0,bestChain:0,lastPickAt:-1e9,t:0,tomte:def.tomte||null,spawn:def.spawn||null,tree:def.tree||null,
      windowSec:def.windowSec||COMBO.window,soft:def.soft||0,late:false,stampId:def.stampId||null,lastPickT:0,nextRainAt:def.kind==='free'?FREE_RAIN.first:Infinity,rains:[],rainSerial:0,result:null};
    this.lastStep=null;
    this.emit({type:'xmas-start',kind:def.kind,id:def.id,title:this.run.title,goal:this.run.goal,total:regular,bonusTotal:bonus});
    return this.run;
  }
  startFree(){return this.startRun({kind:'free',id:'free',title:'FRI JULVANDRING',goal:0,packages:[],tomte:null,windowSec:COMBO.window});}
  cancel(reason='avbruten'){
    if(!this.run)return;const r=this.run;
    if(this.active){r.phase='ended';this.emit({type:'xmas-cancel',kind:r.kind,id:r.id,reason});}
    this.run=null;this.lastStep=null;
  }

  // ── Fångst: samma fält och sikt som termosar i 2.20.0 ───────────────────────────────────────────────────────────
  clearLine(ax,az,bx,bz){
    const d=Math.hypot(bx-ax,bz-az);if(d<=CATCH.near)return true;
    const n=Math.ceil(d/CATCH.lineStep);let run=0;
    for(let i=1;i<n;i++){if(this.nav.blocked(ax+(bx-ax)*i/n,az+(bz-az)*i/n)){if(++run>=CATCH.blockedRun)return false;}else run=0;}
    return true;
  }
  inCatch(pkg,p,reach,sweep){
    if(Math.abs((p.y??1.68)-1.68-(pkg.y||0))>=1.5)return false;
    const q=sweep?closestOnSegment(pkg.x,pkg.z,sweep.x,sweep.z,p.x,p.z):{x:p.x,z:p.z,d:Math.hypot(p.x-pkg.x,p.z-pkg.z)};
    if(q.d>=reach)return false;
    return q.d<=CATCH.near||this.clearLine(q.x,q.z,pkg.x,pkg.z);
  }

  // ── Ett steg: dt i speltid (sekunder), p = spelarens position, sweep = sträckan sedan förra steget, speed i m/s ──────────────────
  step(dt,p,sweep=null,speed=0){
    const r=this.run;if(!r||r.phase==='done'||r.phase==='ended'||!(dt>=0))return;
    r.t+=dt;
    if(r.chain>0&&r.t-r.lastPickAt>r.windowSec){const lost=r.chain;r.chain=0;if(lost>=3)this.emit({type:'xmas-chain-lost',chain:lost});}
    if(r.soft&&!r.late&&r.t>=r.soft&&r.phase!=='free'){r.late=true;this.emit({type:'xmas-late',kind:r.kind,id:r.id});}
    const reach=catchReach(speed);let taken=0;
    for(const pkg of r.packages){
      if(pkg.collected)continue;
      if(Math.abs(pkg.x-p.x)>14||Math.abs(pkg.z-p.z)>14)continue;
      if(!this.inCatch(pkg,p,reach,sweep))continue;
      this.take(pkg);if(++taken>=4)break;
    }
    if(r.kind==='free')this.stepRain(p);
    if(r.phase==='deliver'&&r.tomte&&Math.hypot(p.x-r.tomte.x,p.z-r.tomte.z)<=r.tomte.radius)this.deliver();
  }

  take(pkg){
    const r=this.run;pkg.collected=true;pkg.at=r.t;
    const chainOk=r.t-r.lastPickAt<=r.windowSec;r.chain=chainOk?r.chain+1:1;r.lastPickAt=r.t;r.lastPickT=r.t;r.bestChain=Math.max(r.bestChain,r.chain);
    const mult=comboMult(r.chain),isBonus=pkg.kind==='bonus';
    let points=isBonus?PACKAGE_POINTS.bonus:PACKAGE_POINTS.regular*mult,praise=null,tierBonus=0;
    const tier=COMBO.tiers.find(t=>t.chain===r.chain);if(tier){tierBonus=tier.bonus;praise=tier.praise;points+=tierBonus;}
    r.points+=points;
    if(isBonus)r.bonusCollected++;else r.collected++;
    this.emit({type:'xmas-pick',id:pkg.id,x:pkg.x,z:pkg.z,kind:pkg.kind,points,chain:r.chain,mult,praise,tierBonus,collected:r.collected,goal:r.goal,total:r.regularTotal,bonusCollected:r.bonusCollected,bonusTotal:r.bonusTotal,rain:pkg.rain||0,score:r.points});
    if(r.phase==='collect'&&r.goal&&r.collected>=r.goal){r.phase='deliver';this.emit({type:'xmas-goal',kind:r.kind,id:r.id,collected:r.collected,goal:r.goal,tomte:r.tomte});}
  }

  // ── Leverans hos tomten ───────────────────────────────────────────────────────────────────────────────────────
  deliver(){
    const r=this.run;if(!r||r.phase!=='deliver')return null;
    r.phase='done';
    const seconds=Math.round(r.t),tb=r.late?0:(r.soft?timeBonus(r.t,{fast:r.soft*.45,slow:r.soft}):timeBonus(r.t)),total=r.points+DELIVERY.points+tb;
    const stamp=r.stampId?this.save?.stamp(r.stampId)??false:false;
    const recordId=r.id;const record=this.save?this.save.record(recordId,{points:total,seconds,packages:r.collected,bonus:r.bonusCollected}):false;
    this.save?.addTotals({packages:r.collected,bonus:r.bonusCollected,points:total});
    r.result={kind:r.kind,id:r.id,title:r.title,points:total,parts:{packages:r.points,delivery:DELIVERY.points,time:tb},seconds,collected:r.collected,goal:r.goal,regularTotal:r.regularTotal,
      bonusCollected:r.bonusCollected,bonusTotal:r.bonusTotal,bestChain:r.bestChain,stamp,stampId:r.stampId,record,late:r.late};
    this.emit({type:'xmas-deliver',result:r.result});
    return r.result;
  }

  // ── Fri julvandring: tydliga, tidsbegränsade paketregn med egna ID ─────────────────────────────────────────────────
  stepRain(p){
    const r=this.run;
    for(const rain of r.rains){
      if(rain.gone)continue;
      const left=r.packages.filter(k=>k.rain===rain.serial&&!k.collected);
      if(!left.length||r.t-rain.at>=FREE_RAIN.life){rain.gone=true;for(const k of left)k.expired=true;r.packages=r.packages.filter(k=>!k.expired);r.byId=new Map(r.packages.map(k=>[k.id,k]));this.emit({type:'xmas-rain-gone',rain:rain.serial,missed:left.length});}
    }
    r.rains=r.rains.filter(x=>!x.gone);
    if(r.t<r.nextRainAt||r.rains.length>=FREE_RAIN.maxActive)return;
    const rain=this.makeRain(p);
    if(!rain){r.nextRainAt=r.t+8;return;}
    r.nextRainAt=r.t+FREE_RAIN.every[0]+this.rand()*(FREE_RAIN.every[1]-FREE_RAIN.every[0]);
  }
  makeRain(p){
    const r=this.run;
    for(let attempt=0;attempt<14;attempt++){
      const ang=this.rand()*Math.PI*2,dist=FREE_RAIN.minDistance+this.rand()*(FREE_RAIN.maxDistance-FREE_RAIN.minDistance);
      const c=this.nav.snap({x:p.x+Math.sin(ang)*dist,z:p.z+Math.cos(ang)*dist});
      if(!c||Math.hypot(c.x-p.x,c.z-p.z)<FREE_RAIN.minDistance*.7)continue;
      const n=FREE_RAIN.count[0]+Math.floor(this.rand()*(FREE_RAIN.count[1]-FREE_RAIN.count[0]+1)),made=[];
      const serial=++r.rainSerial;
      for(let i=0;i<n;i++){
        const a=i/n*Math.PI*2+this.rand()*.6,rr=1.6+this.rand()*2.4,x=c.x+Math.sin(a)*rr,z=c.z+Math.cos(a)*rr;
        const q=this.nav.snap({x,z});if(!q||Math.hypot(q.x-x,q.z-z)>1.4||this.nav.blocked(q.x,q.z))continue;
        made.push({id:'f'+r.serial+'.'+serial+':'+i,x:+q.x.toFixed(2),z:+q.z.toFixed(2),y:0,kind:'regular',cluster:serial,collected:false,at:0,rain:serial});
      }
      if(made.length<4){r.rainSerial--;continue;}
      made.push({id:'f'+r.serial+'.'+serial+':b',x:+c.x.toFixed(2),z:+c.z.toFixed(2),y:0,kind:'bonus',cluster:serial,collected:false,at:0,rain:serial});
      r.packages.push(...made);for(const k of made)r.byId.set(k.id,k);
      const rain={serial,at:r.t,x:c.x,z:c.z,count:made.length-1};r.rains.push(rain);
      r.regularTotal+=made.length-1;r.bonusTotal+=1;
      this.emit({type:'xmas-rain',rain:serial,x:c.x,z:c.z,count:made.length-1,life:FREE_RAIN.life});
      return rain;
    }
    return null;
  }

  // ── Frågor från vyn och vägledningen ────────────────────────────────────────────────────────────────────────────
  nearest(p,{max=Infinity,kind=null}={}){
    const r=this.run;if(!r)return null;let best=null,bd=max;
    for(const k of r.packages){if(k.collected||(kind&&k.kind!==kind))continue;const d=Math.hypot(k.x-p.x,k.z-p.z);if(d<bd){bd=d;best=k;}}
    return best?{pkg:best,distance:bd}:null;
  }
  // De närmaste ej plockade paketen inom räckvidd (vyn återanvänder ett fast antal renderobjekt).
  nearby(p,maxDist,limit,out=[]){
    out.length=0;const r=this.run;if(!r)return out;
    for(const k of r.packages){if(k.collected)continue;const d=Math.hypot(k.x-p.x,k.z-p.z);if(d<=maxDist){k._d=d;out.push(k);}}
    out.sort((a,b)=>a._d-b._d);if(out.length>limit)out.length=limit;return out;
  }
  // Vad pekar kompassen och ledpilarna på? Efter målet: tomten. Annars nästa paket; pilarna på marken visas bara när man behöver dem.
  target(p){
    const r=this.run;if(!r||!this.active&&r.phase!=='free')return null;
    if(r.phase==='deliver'&&r.tomte)return {x:r.tomte.x,z:r.tomte.z,id:'xmas-tomte',kind:'tomte',label:'TOMTEN',radius:r.tomte.radius,distance:Math.hypot(r.tomte.x-p.x,r.tomte.z-p.z)};
    const near=this.nearest(p);if(!near)return null;
    return {x:near.pkg.x,z:near.pkg.z,id:near.pkg.id,kind:near.pkg.kind,label:near.pkg.kind==='bonus'?'BONUSPAKET':'NÄSTA PAKET',radius:1.6,distance:near.distance};
  }
  idleSeconds(){const r=this.run;return r?r.t-r.lastPickT:0;}
  objective(p){
    const r=this.run;if(!r||!this.active&&r.phase!=='free')return null;
    const t=this.target(p);
    if(!t)return {x:p.x,z:p.z,id:'xmas-wait',kind:'wait',label:'FRI JULVANDRING',radius:2};
    // Pilarna på marken: alltid mot tomten efter målet, annars bara när nästa paket är långt bort eller det går trögt.
    const guide=t.kind==='tomte'||t.distance>16||this.idleSeconds()>7;
    return guide?{x:t.x,z:t.z,id:t.id,kind:'xmas',label:t.kind==='tomte'?'TOMTEN · LÄMNA PAKETEN':t.label,radius:t.radius}:{x:p.x,z:p.z,id:'xmas-near',kind:'wait',label:t.label,radius:2};
  }
  snapshot(){
    const r=this.run;if(!r)return {active:false};
    return {active:this.active,kind:r.kind,id:r.id,phase:r.phase,t:+r.t.toFixed(2),goal:r.goal,collected:r.collected,bonusCollected:r.bonusCollected,total:r.regularTotal,bonusTotal:r.bonusTotal,points:r.points,chain:r.chain,bestChain:r.bestChain,late:r.late,left:r.packages.filter(k=>!k.collected).length,rains:r.rains.length,result:r.result};
  }
}
export const STAMP_LABEL=id=>STAMPS.find(s=>s.id===id)?.label||id;
