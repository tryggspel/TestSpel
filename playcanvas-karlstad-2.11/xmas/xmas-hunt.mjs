// Julklappsjakten: spelmotorn för paketjakten. Ren modul: ingen DOM, ingen PlayCanvas. Spelet (xmas-boot.js) matar den med spelarens
// position varje steg och läser händelser (xmas-pick, xmas-goal, xmas-deliver, ...) som vyn, ljudet och gränssnittet reagerar på.
//
// Regler i korthet:
//  - Paketen har stabila ID. Ett plockat paket kan aldrig plockas igen i samma körning, hur man än rör sig (inga poäng två gånger).
//  - Fångstfältet är detsamma som i 2.20.0 (växer med farten) och kräver fri sikt: inget paket tas genom en vägg.
//  - Introduktionen har ingen tidsgräns. Rundor har en mjuk tid: den ger bara tidsbonus, man kan alltid lämna in.
//  - Sök och hitta (fri julvandring, introduktionen och rundorna): tomtarna tappar paket här och där ('regn'). Regnen läggs långt från varandra och från spelaren, aldrig direkt efter ett fynd
//    (xmas-drops.mjs, FREE_RAIN); varje regn har egna ID och ett spår av fotavtryck, och försvinner efter en stund. Ett uppdrag med mål (introduktionen, rundorna) delar ut precis så många regn som behövs.
import {CATCH,catchReach} from '../journey-rules.mjs?v=2.21.1-xmas.6';
import {PACKAGE_POINTS,COMBO,comboMult,DELIVERY,timeBonus,FREE_RAIN,TRAILS,STAMPS} from './xmas-config.mjs?v=2.21.1-xmas.6';
import {INTRO,INTRO_GOAL} from './xmas-layout.mjs?v=2.21.1-xmas.6';
import {GUIDE} from './xmas-guide.mjs?v=2.21.1-xmas.6';
import {trailPrints} from './xmas-tracks.mjs?v=2.21.1-xmas.6';
import {sampleCentre,inArea,bearingDeg,angleGap,between} from './xmas-drops.mjs?v=2.21.1-xmas.6';

function closestOnSegment(px,pz,ax,az,bx,bz){
  const dx=bx-ax,dz=bz-az,len2=dx*dx+dz*dz,t=len2>0?Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/len2)):0,x=ax+dx*t,z=az+dz*t;
  return {x,z,d:Math.hypot(x-px,z-pz)};
}
export const seededRandom=seed=>{let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};};

export class XmasHunt{
  constructor({save=null,nav={},rand=Math.random,reward=null}={}){
    this.save=save;this.nav={blocked:()=>false,snap:p=>p,...nav};this.rand=rand;this.reward=reward;
    this.run=null;this.events=[];this.serial=0;this.lastStep=null;this.guideId='';
    this.facing=null; // åt vilket håll spelaren tittar ({x,z}, sätts av spelet varje bildruta): det första tappade paketet i fri julvandring läggs framför spelaren
  }
  get active(){return !!this.run&&this.run.phase!=='done'&&this.run.phase!=='ended';}
  emit(e){this.events.push(e);}
  drain(){const out=this.events;this.events=[];return out;}

  // ── Starta körningar ──────────────────────────────────────────────────────────────────────────────────────────
  // Den ordnade spiralen runt granen (30 paket i grupper, mål 20). Julklappsjakten är sök och hitta sedan 2.21.1-xmas.6 (startSearch), men Tomtezombies nivå 1 och testerna använder spiralen.
  startSpiral(){
    return this.startRun({kind:'intro',id:'intro',title:'HJÄLP TOMTEN!',goal:INTRO_GOAL,packages:INTRO.packages,tomte:INTRO.tomte,spawn:INTRO.spawn,windowSec:COMBO.introWindow,soft:0,tree:INTRO.tree,stampId:'intro',ordered:true});
  }
  startRun(def){
    const packages=def.packages.map(p=>({id:p.id,x:p.x,z:p.z,y:p.y||0,kind:p.kind==='bonus'?'bonus':'regular',cluster:p.cluster??0,collected:false,at:0}));
    const regular=packages.filter(p=>p.kind==='regular').length,bonus=packages.length-regular;
    this.run={serial:++this.serial,kind:def.kind,id:def.id,title:def.title||'',phase:def.phase||(def.kind==='free'?'free':'collect'),goal:def.goal||0,packages,byId:new Map(packages.map(p=>[p.id,p])),
      collected:0,bonusCollected:0,regularTotal:regular,bonusTotal:bonus,points:0,chain:0,bestChain:0,lastPickAt:-1e9,t:0,tomte:def.tomte||null,spawn:def.spawn||null,tree:def.tree||null,
      windowSec:def.windowSec||COMBO.window,soft:def.soft||0,ordered:!!def.ordered,late:false,stampId:def.stampId||null,level:def.level||0,lastPickT:0,nextRainAt:Infinity,rains:[],rainSerial:0,result:null,
      // sök och hitta: drops = true, cfg = inställningarna (FREE_RAIN med ev. ändringar för uppdraget), area = var högarna får läggas, recent = mitten på de senaste högarna, errand = ett ärende vid sidan om (butiksuppdrag)
      drops:!!def.drops,cfg:null,area:null,areaState:{},recent:[],errand:null,lastRainAt:-1e9};
    if(def.drops){const c=this.run.cfg={...FREE_RAIN,...(def.drops.cfg||{})};this.run.area=def.drops.area||null;this.run.nextRainAt=c.first;if(this.run.area&&this.run.area.kind==='route')this.run.areaState={prog:0};}
    this.lastStep=null;this.guideId='';
    this.emit({type:'xmas-start',kind:def.kind,id:def.id,title:this.run.title,goal:this.run.goal,total:regular,bonusTotal:bonus});
    return this.run;
  }
  startFree(){return this.startRun({kind:'free',id:'free',title:'FRI JULVANDRING',goal:0,packages:[],tomte:null,windowSec:FREE_RAIN.chainWindow,drops:{}});}
  // Ett uppdrag med mål som är sök och hitta: introduktionen och rundorna (se xmas-rounds.mjs: buildSearch). def: {kind,id,title,goal,tomte,spawn,tree,stampId,drops:{cfg,area}}.
  startSearch(def){return this.startRun({windowSec:FREE_RAIN.chainWindow,soft:0,...def,packages:[],drops:def.drops||{}});}
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
    if(r.drops&&(r.phase==='free'||r.phase==='collect'))this.stepRain(p,dt);
    if(r.errand&&Math.hypot(p.x-r.errand.tomte.x,p.z-r.errand.tomte.z)<=r.errand.tomte.radius)this.finishErrand();
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
    if(pkg.rain){const rn=r.rains.find(x=>x.serial===pkg.rain);if(rn)rn.left--;}
    this.emit({type:'xmas-pick',id:pkg.id,x:pkg.x,z:pkg.z,kind:pkg.kind,points,chain:r.chain,mult,praise,tierBonus,collected:r.collected,goal:r.goal,total:r.regularTotal,bonusCollected:r.bonusCollected,bonusTotal:r.bonusTotal,rain:pkg.rain||0,score:r.points});
    if(r.phase==='collect'&&r.goal&&r.collected>=r.goal){r.phase='deliver';this.emit({type:'xmas-goal',kind:r.kind,id:r.id,collected:r.collected,goal:r.goal,tomte:r.tomte});}
  }

  // ── Leverans hos tomten ───────────────────────────────────────────────────────────────────────────────────────
  deliver(){
    const r=this.run;if(!r||r.phase!=='deliver')return null;
    r.phase='done';
    const seconds=Math.round(r.t),tb=r.drops||r.late?0:(r.soft?timeBonus(r.t,{fast:r.soft*.45,slow:r.soft}):timeBonus(r.t)),total=r.points+DELIVERY.points+tb;
    const stamp=r.stampId?this.save?.stamp(r.stampId)??false:false;
    const recordId=r.id;const record=this.save?this.save.record(recordId,{points:total,seconds,packages:r.collected,bonus:r.bonusCollected}):false;
    this.save?.addTotals({packages:r.collected,bonus:r.bonusCollected,points:total});
    r.result={kind:r.kind,id:r.id,title:r.title,points:total,parts:{packages:r.points,delivery:DELIVERY.points,time:tb},seconds,collected:r.collected,goal:r.goal,regularTotal:r.regularTotal,
      bonusCollected:r.bonusCollected,bonusTotal:r.bonusTotal,bestChain:r.bestChain,stamp,stampId:r.stampId,record,late:r.late,level:r.level,drops:r.drops};
    this.emit({type:'xmas-deliver',result:r.result});
    return r.result;
  }

  // ── Sök och hitta: tappade paket ('regn') med egna ID och spår i snön ─────────────────────────────────────────────────
  // Ett regn är en klunga paket runt en punkt på gångbar mark. Regnen delas ut så här (inställningar: FREE_RAIN, ändrade per uppdrag):
  //  - det första efter first sekunder, framför spelaren; därefter ett planerat nytt var every sekunder, högst maxActive åt gången;
  //  - är ett regn klart (allt hittat, borta eller övergivet) och inget annat finns kvar kommer nästa efter afterDone[0]–afterDone[1] sekunder, aldrig direkt efter ett fynd;
  //  - ingen ny hög medan spelaren står vid en hög hen håller på att plocka (busyRadius);
  //  - ett uppdrag med mål (goal) lägger bara ut fler regn när paketen på kartan inte räcker till målet plus reserve;
  //  - nya regn läggs minst separation meter från aktiva och senaste regn och i en annan riktning (spread grader) än de aktiva spåren (xmas-drops.mjs).
  stepRain(p,dt=0){
    const r=this.run,F=r.cfg||FREE_RAIN,rnd=range=>between(range,this.rand);
    for(const rain of r.rains){
      if(rain.gone)continue;
      const left=r.packages.filter(k=>k.rain===rain.serial&&!k.collected);
      rain.away=Math.hypot(rain.x-p.x,rain.z-p.z)>F.leaveDistance?(rain.away||0)+dt:0; // ett regn man lämnat långt bakom sig räknas bort efter en stund
      if(!left.length||r.t-rain.at>=F.life||rain.away>=F.leaveSeconds){
        rain.gone=true;rain.doneAt=r.t;
        for(const k of left)k.expired=true;r.packages=r.packages.filter(k=>!k.expired);r.byId=new Map(r.packages.map(k=>[k.id,k]));
        r.recent.push({x:rain.x,z:rain.z,at:r.t});if(r.recent.length>F.recent)r.recent.shift();
        this.emit({type:'xmas-rain-gone',rain:rain.serial,missed:left.length,done:!left.length,count:rain.count});
        // Nästa regn kommer inte direkt: tidigast afterDone[0] s efter att det här blev klart. Finns inget annat regn kvar kommer nästa efter afterDone[0]–afterDone[1] s (hellre än att man väntar ut
        // hela det planerade mellanrummet utan något att hitta).
        const others=r.rains.some(x=>x!==rain&&!x.gone);
        r.nextRainAt=others?Math.max(r.nextRainAt,r.t+F.afterDone[0]):r.t+rnd(F.afterDone);
      }
    }
    r.rains=r.rains.filter(x=>!x.gone);
    if(r.phase!=='free'&&r.phase!=='collect')return;             // målet är nått: inga fler regn
    if(r.rains.length>=F.maxActive||r.t<r.nextRainAt)return;
    if(r.goal>0){                                                 // uppdrag med mål: bara så många paket som behövs (plus reserve)
      let supply=0;for(const k of r.packages)if(!k.collected&&k.kind==='regular')supply++;
      if(supply>=r.goal-r.collected+F.reserve){r.nextRainAt=r.t+2;return;}
    }
    for(const a of r.rains)if(Math.hypot(a.x-p.x,a.z-p.z)<F.busyRadius){r.nextRainAt=Math.max(r.nextRainAt,r.t+2.5);return;}
    const rain=this.makeRain(p);
    if(!rain){r.nextRainAt=r.t+4;return;}
    r.lastRainAt=r.t;
    r.nextRainAt=r.t+rnd(F.every);
  }
  // Paketen i ett regn läggs på riktiga fria platser (inte blockerade, fri sikt till mitten, minst spacing meter från varandra); i trånga kvarter får ett regn färre paket, men aldrig färre än
  // fyra vanliga och ett bonus. Några mitter provas och det regn som blev fullast (och längst från de andra) används. Hittas ingen mitt som uppfyller avstånds- och riktningskraven lättas de i två steg.
  makeRain(p){
    const r=this.run,F=r.cfg||FREE_RAIN,free=(x,z)=>!this.nav.blocked(x,z),area=r.area;
    const sight=(c,x,z)=>{const n=Math.ceil(Math.hypot(x-c.x,z-c.z)/.5);for(let i=1;i<=n;i++)if(!free(c.x+(x-c.x)*i/n,c.z+(z-c.z)*i/n))return false;return true;};
    const actives=r.rains.filter(x=>!x.gone),others=[...actives,...r.recent];
    const levels=[[F.separation,F.spread],[F.separation*.6,F.spread*.5],[0,0]];
    let best=null;
    for(let lv=0;lv<levels.length&&!best;lv++){
      const [sep,spread]=levels[lv];
      for(let attempt=0;attempt<F.tries;attempt++){
        const cand=sampleCentre(area,{p,F,rand:this.rand,facing:this.facing,first:r.rainSerial===0&&attempt<4,state:r.areaState});
        const c=this.nav.snap({x:cand.x,z:cand.z});
        if(!c||Math.hypot(c.x-p.x,c.z-p.z)<F.minDistance*.7||!free(c.x,c.z)||!inArea(area,c))continue;
        let minD=Infinity,ok=true;
        for(const o of others){const d=Math.hypot(o.x-c.x,o.z-c.z);if(d<minD)minD=d;if(d<sep){ok=false;break;}}
        if(!ok)continue;
        if(spread>0){const b=bearingDeg(p,c);for(const o of actives)if(Math.hypot(o.x-p.x,o.z-p.z)<160&&angleGap(b,bearingDeg(p,o))<spread){ok=false;break;}}
        if(!ok)continue;
        const want=F.count[0]+Math.floor(this.rand()*(F.count[1]-F.count[0]+1)),phase=this.rand()*Math.PI*2,spots=[];
        for(let i=0;i<want;i++){
          for(let t=0;t<4;t++){
            const a=phase+i*2.39996+(t?(this.rand()-.5)*1.4:0),rr=F.ringMin+(F.ringMax-F.ringMin)*Math.sqrt((i+.5)/want)+(t?(this.rand()-.5)*1.6:0);
            const x=c.x+Math.sin(a)*rr,z=c.z+Math.cos(a)*rr;
            if(!free(x,z)||!sight(c,x,z)||spots.some(s=>Math.hypot(s.x-x,s.z-z)<F.spacing))continue;
            spots.push({x,z});break;
          }
        }
        if(spots.length<4)continue;
        const score=spots.length*10+Math.min(minD,200)/20;
        if(!best||score>best.score)best={c,spots,score,s:cand.s,want};
        if(best.spots.length>=best.want)break;
      }
    }
    if(!best)return null;
    const {c,spots}=best,serial=++r.rainSerial,made=spots.map((s,i)=>({id:'f'+r.serial+'.'+serial+':'+i,x:+s.x.toFixed(2),z:+s.z.toFixed(2),y:0,kind:'regular',cluster:serial,collected:false,at:0,rain:serial}));
    made.push({id:'f'+r.serial+'.'+serial+':b',x:+c.x.toFixed(2),z:+c.z.toFixed(2),y:0,kind:'bonus',cluster:serial,collected:false,at:0,rain:serial});
    r.packages.push(...made);for(const k of made)r.byId.set(k.id,k);
    if(best.s!==undefined)r.areaState.lastS=best.s;
    // Tomtarnas spår: fotavtryck längs gångvägen från en punkt nära spelaren till platsen där paketen tappades (rak linje om spelet inte har någon väg att erbjuda).
    let route=null;try{route=typeof this.nav.route==='function'?this.nav.route(p,c):null;}catch{route=null;}
    const path=Array.isArray(route)&&route.length>=2?route:[{x:p.x,z:p.z},{x:c.x,z:c.z}];
    const trail=trailPrints(path,{blocked:(x,z)=>!free(x,z),phase:serial*1.7});
    const head=trail.length?{x:trail[0].x,z:trail[0].z}:{x:c.x,z:c.z};
    const rain={serial,at:r.t,x:c.x,z:c.z,count:made.length-1,left:made.length,trail,head,s:best.s};r.rains.push(rain);
    r.regularTotal+=made.length-1;r.bonusTotal+=1;
    this.emit({type:'xmas-rain',rain:serial,x:c.x,z:c.z,count:made.length-1,life:F.life,head,prints:trail.length,first:serial===1});
    return rain;
  }

  // ── Ärenden: en butiksutmaning som slutar med en leverans till en tomte utanför (Pressbyrån) pågår vid sidan om jakten, som inte avbryts ──────────────────
  startErrand(def){
    const r=this.run;if(!r||!this.active||!def||!def.tomte)return false;
    r.errand={id:def.id||'ärende',title:def.title||'',tomte:{x:def.tomte.x,z:def.tomte.z,radius:def.tomte.radius||3.2},stampId:def.stampId||null,at:r.t};
    this.emit({type:'xmas-errand',id:r.errand.id,title:r.errand.title,tomte:r.errand.tomte});return true;
  }
  finishErrand(){
    const r=this.run,e=r&&r.errand;if(!e)return null;
    r.errand=null;r.points+=DELIVERY.points;
    const stamp=e.stampId?this.save?.stamp(e.stampId)??false:false;this.save?.addTotals({points:DELIVERY.points});
    this.emit({type:'xmas-errand-done',id:e.id,title:e.title,points:DELIVERY.points,stamp,stampId:e.stampId,score:r.points});
    return {stamp};
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
    if(r.errand)return {x:r.errand.tomte.x,z:r.errand.tomte.z,id:'xmas-errand',kind:'tomte',label:'TOMTEN',radius:r.errand.tomte.radius,distance:Math.hypot(r.errand.tomte.x-p.x,r.errand.tomte.z-p.z)};
    if(r.phase==='deliver'&&r.tomte)return {x:r.tomte.x,z:r.tomte.z,id:'xmas-tomte',kind:'tomte',label:'TOMTEN',radius:r.tomte.radius,distance:Math.hypot(r.tomte.x-p.x,r.tomte.z-p.z)};
    const near=this.nearest(p);if(!near)return null;
    return {x:near.pkg.x,z:near.pkg.z,id:near.pkg.id,kind:near.pkg.kind,label:near.pkg.kind==='bonus'?'BONUSPAKET':'NÄSTA PAKET',radius:1.6,distance:near.distance};
  }
  // Pilens mål. Efter målet: tomten. Annars paketet som pilen ska peka på: i ordnade körningar (introduktionen, rutterundorna, Tomtezombies) det närmaste av
  // de fyra närmaste ej plockade paketen i ordning (så att pilen följer spåret och inte hoppar över till nästa varv av spiralen), annars det närmaste ej
  // plockade. Bonuspaketen är valfria avstickare och pekas bara ut när inga vanliga paket finns kvar (fri vandring). Ett nytt mål måste vara klart närmare
  // än det nuvarande för att pilen ska byta, så att den inte fladdrar mellan två lika nära paket.
  guideTarget(p){
    const r=this.run;if(!r||!this.active&&r.phase!=='free')return null;
    // Ett ärende (leverans efter en butiksutmaning) går före allt: pilen pekar på tomten som väntar.
    if(r.errand)return this.target(p);
    // Sök och hitta (fri julvandring, introduktionen, rundorna): ingen pil till paketen. Har man gått länge utan att hitta något (och inte är nära ett spår eller paket) pekar en liten pil mot
    // närmaste spårs början. När målet är nått pekar pilen på tomten som förut.
    if(r.drops&&r.phase!=='deliver')return this.trailHint(p);
    if(r.phase==='deliver'&&r.tomte)return {x:r.tomte.x,z:r.tomte.z,id:'xmas-tomte',kind:'tomte',label:'TOMTEN',radius:r.tomte.radius,distance:Math.hypot(r.tomte.x-p.x,r.tomte.z-p.z)};
    let best=null,bd=Infinity,cur=null,cd=Infinity,seen=0;
    for(const k of r.packages){
      if(k.collected||k.kind!=='regular')continue;
      if(r.ordered&&seen++>=GUIDE.window)break;
      const d=Math.hypot(k.x-p.x,k.z-p.z);
      if(d<bd){bd=d;best=k;}
      if(k.id===this.guideId){cur=k;cd=d;}
    }
    if(!best){for(const k of r.packages){if(k.collected)continue;const d=Math.hypot(k.x-p.x,k.z-p.z);if(d<bd){bd=d;best=k;}}cur=null;}
    if(!best){this.guideId='';return null;}
    if(cur&&best!==cur&&!(bd*GUIDE.keep+GUIDE.keepExtra<cd)){best=cur;bd=cd;}
    this.guideId=best.id;
    return {x:best.x,z:best.z,id:best.id,kind:best.kind,label:best.kind==='bonus'?'BONUSPAKET':'NÄSTA PAKET',radius:1.6,distance:bd};
  }
  idleSeconds(){const r=this.run;return r?r.t-r.lastPickT:0;}
  // Hjälp i fri julvandring: närmaste spårs början, bara när det gått TRAILS.idleAssist sekunder sedan senaste fyndet och man varken står vid ett spår eller har ett paket i närheten.
  trailHint(p){
    const r=this.run;if(!r||!r.drops||r.phase==='deliver'||this.idleSeconds()<TRAILS.idleAssist)return null;
    let best=null,bd=Infinity;
    for(const rain of r.rains){
      if(rain.gone||!(rain.left>0))continue;
      const d=Math.hypot(rain.head.x-p.x,rain.head.z-p.z);
      if(d<TRAILS.assistClear||Math.hypot(rain.x-p.x,rain.z-p.z)<TRAILS.nearDrop*2)return null;
      if(d<bd){bd=d;best=rain;}
    }
    if(!best)return null;
    return {x:best.head.x,z:best.head.z,id:'trail:'+best.serial,kind:'trail',label:'SPÅR I SNÖN',radius:2,distance:bd};
  }
  objective(p){
    const r=this.run;if(!r||!this.active&&r.phase!=='free')return null;
    if(r.drops&&r.phase!=='deliver'&&!r.errand)return {x:p.x,z:p.z,id:'xmas-wait',kind:'wait',label:r.kind==='free'?'FRI JULVANDRING':'JULKLAPPSJAKTEN',radius:2}; // inga pilar på marken och ingen flagga: spåren i snön visar vägen
    const t=this.target(p);
    if(!t)return {x:p.x,z:p.z,id:'xmas-wait',kind:'wait',label:'FRI JULVANDRING',radius:2};
    // Pilarna på marken: alltid mot tomten efter målet, annars bara när nästa paket är långt bort eller det går trögt.
    const guide=t.kind==='tomte'||t.distance>16||this.idleSeconds()>7;
    return guide?{x:t.x,z:t.z,id:t.id,kind:'xmas',label:t.kind==='tomte'?'TOMTEN · LÄMNA PAKETEN':t.label,radius:t.radius}:{x:p.x,z:p.z,id:'xmas-near',kind:'wait',label:t.label,radius:2};
  }
  snapshot(){
    const r=this.run;if(!r)return {active:false};
    return {active:this.active,kind:r.kind,id:r.id,phase:r.phase,t:+r.t.toFixed(2),goal:r.goal,collected:r.collected,bonusCollected:r.bonusCollected,total:r.regularTotal,bonusTotal:r.bonusTotal,points:r.points,chain:r.chain,bestChain:r.bestChain,late:r.late,left:r.packages.filter(k=>!k.collected).length,rains:r.rains.length,prints:r.rains.reduce((n,x)=>n+(x.trail?x.trail.length:0),0),drops:r.drops,errand:r.errand?r.errand.id:null,nextRainIn:r.drops?Math.max(0,+(r.nextRainAt-r.t).toFixed(1)):null,result:r.result};
  }
}
export const STAMP_LABEL=id=>STAMPS.find(s=>s.id===id)?.label||id;
