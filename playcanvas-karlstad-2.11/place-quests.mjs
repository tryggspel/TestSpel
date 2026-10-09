// 2.21: uppdragsmotor för interaktiva platser. En enda tillståndsmaskin för alla platser; innehållet kommer ur places.mjs.
// Ren logik utan DOM och utan PlayCanvas. Tiden räknas bara medan spelet går (step(dt) anropas av City Explore), så paus fryser allt.
//
// Regler som motorn garanterar (och testerna kontrollerar):
//  • Ett uppdrag startas bara av en frivillig knapptryckning vid personalen.
//  • En belöning betalas högst en gång per genomfört uppdrag. Ett avslut kan inte upprepas genom att trycka igen.
//  • En stämpel i Karlstadpasset kräver ett genomfört uppdrag och ges bara första gången.
//  • Upprepade uppdrag är roliga men ger bara en liten, tidsbegränsad belöning. Permanent samling (stämplar, besök) och
//    rundans poäng (kaffepoäng) hålls isär: stämplar sparas här, poängen går via host.reward.
import {PLACES,PLAYABLE,ACTIVITY_TYPES,resolvePlaces,approvedOffer,PASS_TEXT} from './places.mjs?v=2.21.1-xmas.5';
import {PartnerEvents,EVENT_TYPES} from './partner-events.mjs?v=2.21.1-xmas.5';
import {mallRoom} from './mall-space.mjs?v=2.21.1-xmas.5';
import {segmentDistance} from './explore-fun.mjs?v=2.21.1-xmas.5';
import {seededRandom,hashSeed} from './daily-challenge.mjs?v=2.21.1-xmas.5';

export const PLACE_KEY='karlstad:places:1';
export const QUEST=Object.freeze({
  floorHeight:5.4,floorTolerance:2,   // samma våning om höjdskillnaden är under 2 m
  restartDelay:2.5,                   // sekunder efter ett avslut innan samma uppdrag kan startas igen
  leaveRadius:14,                     // en beställning på tid avbryts om spelaren går längre bort än så
  farRadius:170,                      // ett hämta-uppdrag avbryts om spelaren är mycket långt från platsen
  visitRadius:9
});
const bounded=(v,max=1e9)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Math.floor(Number(v)))):0;
const blank=()=>({visits:0,firstVisit:0,started:0,completed:0,aborted:0,stamped:0,firstDone:0,lastDone:0,lastReward:0});

export class PlaceQuests{
  // anchors/faces: butiksfasader för platser som ligger vid en fasad (se resolvePlaces).
  constructor({places=PLACES,anchors={},faces={},storage=null,events=null,host={},clock=()=>Date.now(),roomAt=p=>mallRoom(p)?.id||null}={}){
    this.storage=storage;this.clock=clock;this.host=host;this.roomAt=roomAt;
    this.events=events||new PartnerEvents({storage,clock});
    this.places=resolvePlaces(places,{anchors,faces}).filter(p=>p.resolved&&PLAYABLE.includes(p.status)&&ACTIVITY_TYPES[p.activity?.type]?.implemented);
    this.byId=new Map(this.places.map(p=>[p.id,p]));
    this.state={version:1,places:{}};this.extra={};this.load();
    this.run=null;this.rev=0;this.elapsed=0;this.serial=0;this.visited=new Set();this.lastPos=null;this.cooldownUntil=0;this.afterDone=null;
  }
  // ── Sparande (egen nyckel, rör inte övriga sparfiler) ───────────────────────────────────────────────────────────
  load(){
    try{
      const v=JSON.parse(this.storage?.getItem(PLACE_KEY)||'null');if(!v||v.version!==1||typeof v.places!=='object')return;
      for(const [id,r] of Object.entries(v.places||{})){
        if(!r||typeof r!=='object'||!/^[a-z][a-z0-9-]{1,30}$/.test(id))continue;
        const rec={...blank()};for(const k of Object.keys(rec))rec[k]=bounded(r[k],9e15);
        // En stämpel utan genomfört uppdrag är ogiltig och tas bort (skydd mot handredigerade sparfiler).
        if(rec.stamped&&!rec.completed)rec.stamped=0;
        if(this.byId.has(id))this.state.places[id]=rec;else this.extra[id]=rec;
      }
    }catch{}
  }
  save(){try{this.storage?.setItem(PLACE_KEY,JSON.stringify({version:1,places:{...this.extra,...this.state.places}}));}catch{}}
  rec(id){return this.state.places[id]??(this.state.places[id]=blank());}
  resetProgress(){this.state.places={};this.extra={};this.save();this.touch();}
  touch(){this.rev++;}
  // ── Frågor ──────────────────────────────────────────────────────────────────────────────────────────────────────
  available(){if(!this.places.length)return false;return this.host.available?this.host.available()!==false:true;}
  get(id){return this.byId.get(id)||null;}
  list(){return this.places;}
  handles(clerkId){return this.places.some(p=>p.staff?.clerk===clerkId);}
  stampCount(){return this.places.filter(p=>this.state.places[p.id]?.stamped).length;}
  stampTotal(){return this.places.length;}
  sameFloor(p,floor=0){return Math.abs((p.y??1.68)-1.68-floor*QUEST.floorHeight)<QUEST.floorTolerance;}
  atTalk(place,p){const t=place.talk;return !!t&&this.sameFloor(p,t.floor||0)&&Math.hypot(p.x-t.x,p.z-t.z)<t.radius;}
  nearPlace(p){return this.places.find(pl=>this.atTalk(pl,p))||null;}
  // Karlstadpasset: bara spelbara platser. Framtida platser finns inte här.
  pass(){
    return this.places.map(pl=>{
      const r=this.state.places[pl.id]||blank();
      return {id:pl.id,name:pl.name,venue:pl.venue,status:pl.status,demo:pl.status!=='active',title:pl.activity.title,pitch:pl.activity.pitch,
        visited:r.visits>0,visits:r.visits,completed:r.completed,stamped:!!r.stamped,stampLabel:pl.reward.stamp.label,stampedAt:r.stamped||0,
        offer:approvedOffer(pl),note:pl.partner?.confirmed?'':pl.partner?.note||''};
    });
  }
  // ── Händelser ───────────────────────────────────────────────────────────────────────────────────────────────────
  push(event){this.host.push?.(event);}
  say(place,text){this.push({type:'friendly',name:place.staff.name,text,points:0});}
  track(type,place,meta){return this.events.record(type,place.id,meta);}
  // ── Kontextknappen ──────────────────────────────────────────────────────────────────────────────────────────────
  // {placeId,label,tactic} eller null. Anropas ofta, så den gör bara billiga jämförelser.
  prompt(p){
    if(!this.available())return null;
    const r=this.run;
    if(r){
      const place=this.byId.get(r.placeId),other=this.nearPlace(p);
      // Ett uppdrag i taget: vid en annan plats förklarar knappen varför det inte går att starta ett till.
      if(other&&other.id!==place.id)return {placeId:other.id,label:'UPPDRAG PÅGÅR',tactic:other.name.toUpperCase()+' · AVSLUTA FÖRST DITT UPPDRAG HOS '+place.name.toUpperCase()+' (✕)'};
      if(r.type==='order'){return this.atTalk(place,p)||r.phase==='failed'?{placeId:place.id,label:r.phase==='failed'?'IGEN · NY ORDER':'LÄMNA ORDERN',tactic:place.name.toUpperCase()+' · '+place.activity.title+' · '+(r.phase==='failed'?'TRYCK IGEN FÖR ATT PROVA IGEN':'TRYCK 1–'+r.menu.length+' ELLER KNAPPARNA')}:null;}
      if(!this.atTalk(place,p))return null;
      if(r.phase==='deliver')return {placeId:place.id,label:place.activity.deliver.label,tactic:place.staff.name.toUpperCase()+' · '+place.name.toUpperCase()+' · TRYCK '+place.activity.deliver.label};
      return {placeId:place.id,label:'PRATA MED '+place.staff.name.split(' ')[0].toUpperCase(),tactic:place.name.toUpperCase()+' · UPPDRAG PÅGÅR · '+r.found+'/'+r.items.length+' FUNNA'};
    }
    const place=this.nearPlace(p);if(!place)return null;
    if(this.elapsed<this.cooldownUntil&&this.afterDone===place.id)return {placeId:place.id,label:'PRATA MED '+place.staff.name.split(' ')[0].toUpperCase(),tactic:place.staff.name.toUpperCase()+' · '+place.name.toUpperCase()+' · TACK FÖR HJÄLPEN'};
    const done=this.state.places[place.id]?.stamped;
    return {placeId:place.id,label:place.activity.verb,tactic:place.name.toUpperCase()+' · UPPDRAG: '+place.activity.title+(done?' · IGEN':'')+' · TRYCK '+place.activity.verb};
  }
  // Returnerar true om knapptryckningen togs om hand.
  interact(p){
    if(!this.available())return false;
    const r=this.run;
    if(r){
      const place=this.byId.get(r.placeId),other=this.nearPlace(p);
      if(other&&other.id!==place.id){this.say(other,'Jag väntar gärna! Avsluta ditt andra uppdrag först (✕ i rutan), så tar vi nästa.');return true;}
      if(r.type==='order'){
        if(r.phase==='failed'){this.restart();return true;}
        if(this.atTalk(place,p)){this.cancel('user');return true;}
        return false;
      }
      if(!this.atTalk(place,p))return false;
      if(r.phase==='deliver'){this.complete(place);return true;}
      this.say(place,place.activity.remind);return true;
    }
    const place=this.nearPlace(p);if(!place)return false;
    if(this.elapsed<this.cooldownUntil&&this.afterDone===place.id){this.say(place,'Tack för hjälpen! Ge mig en liten stund så kommer det en ny omgång.');return true;}
    this.start(place);return true;
  }
  // ── Start ───────────────────────────────────────────────────────────────────────────────────────────────────────
  start(place,{retry=false}={}){
    const a=place.activity,st=this.rec(place.id);
    this.serial++;this.afterDone=null;
    const base={id:'run-'+this.serial,placeId:place.id,type:a.type,startedAt:this.clock(),t:0,rewarded:false,attempt:retry?(this.run?.attempt||0)+1:0};
    if(a.type==='fetch'){
      this.run={...base,phase:'run',ordered:!!a.ordered,next:0,found:0,
        items:a.items.map((it,i)=>({id:it.id,name:it.name,art:it.art,x:it.x,z:it.z,floor:it.floor||0,reach:it.reach||QUEST.floorHeight/3,hint:it.hint||'',clue:it.clue||'',got:false,index:i}))};
    }else{
      const order=a.orders[st.completed%a.orders.length],rnd=seededRandom(hashSeed(place.id+'|'+st.completed+'|'+base.attempt+'|'+this.serial));
      const menu=a.menu.map(m=>({id:m.id,name:m.name,art:m.art}));
      for(let i=menu.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[menu[i],menu[j]]=[menu[j],menu[i]];}
      const seconds=order.seconds||a.seconds;
      this.run={...base,phase:'serve',order:{id:order.id,who:order.who,items:[...order.items],done:order.done},menu,step:0,mistakes:0,seconds,left:seconds,penalty:a.penalty||0};
    }
    st.started++;this.save();this.touch();
    this.track(EVENT_TYPES.start,place,{quest:place.activity.type,reason:retry?'retry':''});
    this.push({type:'place-start',placeId:place.id,name:place.name,title:a.title,questType:a.type,staff:place.staff.name,seconds:this.run.seconds||0,retry});
    this.say(place,retry?'Ny order, nytt försök!':a.intro);
    this.lastPos=null;
    return this.run;
  }
  restart(){
    const r=this.run;if(!r||r.type!=='order'||r.phase!=='failed')return false;
    return !!this.start(this.byId.get(r.placeId),{retry:true});
  }
  // ── Avbryt ──────────────────────────────────────────────────────────────────────────────────────────────────────
  cancel(reason='user'){
    const r=this.run;if(!r)return false;
    const place=this.byId.get(r.placeId);this.run=null;this.touch();
    // En order som redan räknats som avbruten (tiden gick ut) räknas inte en gång till.
    if(r.phase!=='failed'){this.rec(place.id).aborted++;this.save();this.track(EVENT_TYPES.abort,place,{reason});}
    this.push({type:'place-cancel',placeId:place.id,name:place.name,reason});
    return true;
  }
  // ── Föremål (hämta-uppdrag) ─────────────────────────────────────────────────────────────────────────────────────
  // Föremål som just nu är synliga och går att ta.
  activeItems(){
    const r=this.run;if(!r||r.type!=='fetch'||r.phase!=='run')return [];
    return r.ordered?r.items.filter(i=>i.index===r.next&&!i.got):r.items.filter(i=>!i.got);
  }
  // Nästa mål för vägledningen: närmaste föremål, annars lämnapunkten. null om inget uppdrag pågår.
  objective(p){
    const r=this.run;if(!r||r.type!=='fetch')return null;
    const place=this.byId.get(r.placeId);
    if(r.phase==='deliver')return {x:place.talk.x,z:place.talk.z,y:(place.talk.floor||0)*QUEST.floorHeight,id:'place-deliver-'+r.id,kind:'landmark',label:place.activity.deliver.label+' · '+place.staff.name.toUpperCase(),radius:1.6,action:'TRYCK '+place.activity.deliver.label};
    let best=null,bd=Infinity;
    for(const it of this.activeItems()){const d=Math.hypot(it.x-p.x,it.z-p.z);if(d<bd){bd=d;best=it;}}
    return best?{x:best.x,z:best.z,y:best.floor*QUEST.floorHeight,id:'place-item-'+r.id+'-'+best.id,kind:'landmark',label:best.name+' · '+best.hint.toUpperCase(),radius:1.2,action:'GÅ NÄRA FÖR ATT PLOCKA UPP'}:null;
  }
  // Var spelaren hamnar om hen väljer GÅ DIT i Karlstadpasset: 2,4 m framför samtalspunkten, med blicken mot den, så att knappen finns direkt.
  arrivalFor(id,back=2.4){
    const pl=this.byId.get(id);if(!pl)return null;
    const yaw=pl.entrance?.yaw??0,a=yaw*Math.PI/180;
    return {x:+(pl.talk.x+Math.sin(a)*back).toFixed(2),z:+(pl.talk.z+Math.cos(a)*back).toFixed(2),yaw,floor:pl.talk.floor||0};
  }
  goalFor(id){
    const pl=this.byId.get(id);if(!pl)return null;
    const t=pl.talk;return {x:t.x,z:t.z,y:(t.floor||0)*QUEST.floorHeight,id:'place-'+pl.id,kind:'landmark',label:pl.name.toUpperCase()+' · '+pl.activity.title,radius:2.2,action:'DU ÄR FRAMME · PRATA MED '+pl.staff.name.toUpperCase()};
  }
  // ── Beställning (order-uppdrag) ─────────────────────────────────────────────────────────────────────────────────
  // index: 0-baserad plats i menyraden som spelaren ser. Returnerar {ok,done,wrong,...} eller null om ingen order pågår.
  pickIndex(index){const r=this.run;if(!r||r.type!=='order'||r.phase!=='serve')return null;const m=r.menu[index];return m?this.pick(m.id):null;}
  pick(itemId){
    const r=this.run;if(!r||r.type!=='order'||r.phase!=='serve')return null;
    const place=this.byId.get(r.placeId),want=r.order.items[r.step];
    if(itemId!==want){
      r.mistakes++;r.left=Math.max(0,r.left-r.penalty);this.touch();
      this.push({type:'place-miss',placeId:place.id,itemId,want,penalty:r.penalty,left:r.left,mistakes:r.mistakes});
      if(r.left<=0)this.fail(place,'timeout');
      return {ok:false,wrong:true,left:r.left};
    }
    r.step++;this.touch();
    this.push({type:'place-order-step',placeId:place.id,itemId,index:r.step,total:r.order.items.length});
    if(r.step>=r.order.items.length){this.complete(place);return {ok:true,done:true};}
    return {ok:true,done:false,step:r.step};
  }
  fail(place,reason){
    const r=this.run;if(!r||r.phase==='failed')return;
    r.phase='failed';r.left=0;this.rec(place.id).aborted++;this.save();this.touch();
    this.track(EVENT_TYPES.abort,place,{reason,mistakes:r.mistakes});
    this.push({type:'place-fail',placeId:place.id,name:place.name,title:place.activity.title,reason,mistakes:r.mistakes});
  }
  // ── Avslut och belöning ─────────────────────────────────────────────────────────────────────────────────────────
  complete(place){
    const r=this.run;if(!r||r.rewarded||r.phase==='done'||r.phase==='failed')return null;
    r.rewarded=true;r.phase='done';
    const a=place.activity,rw=place.reward,st=this.rec(place.id),now=this.clock();
    const first=!st.stamped,cool=!first&&now-st.lastReward<rw.repeatCooldown*1000;
    let speed=0,perfect=0;
    if(a.type==='order'){speed=Math.round((rw.speedBonus||0)*Math.max(0,r.left)/r.seconds);perfect=r.mistakes===0?(rw.perfectBonus||0):0;}
    const points=first?rw.points+speed+perfect:cool?0:rw.repeatPoints+Math.floor((speed+perfect)/4);
    st.completed++;st.lastDone=now;if(points>0)st.lastReward=now;if(first){st.stamped=now;st.firstDone=now;}
    const seconds=Math.round(r.t*10)/10;
    this.run=null;this.afterDone=place.id;this.cooldownUntil=this.elapsed+QUEST.restartDelay;
    if(points>0)this.host.reward?.(points);
    this.save();this.touch();
    this.track(EVENT_TYPES.complete,place,{points,first,seconds,mistakes:r.mistakes||0});
    const stampCount=this.stampCount(),stampTotal=this.stampTotal();
    const line=a.type==='order'?r.order.done:a.deliver.line;
    this.push({type:'place-complete',placeId:place.id,name:place.name,title:a.title,questType:a.type,points,speed,perfect,first,cool,repeat:!first,seconds,mistakes:r.mistakes||0,
      stamp:first?{...rw.stamp}:null,stampCount,stampTotal,offer:approvedOffer(place),demo:place.status!=='active',line,staff:place.staff.name});
    this.say(place,line);
    if(first)this.host.onStamp?.(stampCount,stampTotal);
    return {points,first};
  }
  // ── Varje bildruta (billigt) ────────────────────────────────────────────────────────────────────────────────────
  step(dt,p){
    if(!(dt>0)||!p)return;
    if(!this.available()){if(this.run)this.cancel('mode');this.lastPos=null;return;}
    this.elapsed+=Math.min(dt,1);
    const r=this.run;
    if(r){
      r.t+=Math.min(dt,1);
      const place=this.byId.get(r.placeId);
      if(r.type==='order'){
        if(r.phase==='serve'){
          r.left=Math.max(0,r.left-Math.min(dt,1));
          if(r.left<=0)this.fail(place,'timeout');
          else if(this.farFrom(place,p,QUEST.leaveRadius))this.cancel('left');
        }else if(r.phase==='failed'&&this.farFrom(place,p,QUEST.leaveRadius*1.4)){this.run=null;this.touch();this.push({type:'place-cancel',placeId:place.id,name:place.name,reason:'left'});}
      }else{
        if(this.farFrom(place,p,QUEST.farRadius)){this.cancel('far');}
        else this.pickItems(place,p);
      }
    }
    // Digitala besök: en gång per sida du laddar (session), och räknas permanent som antal besök.
    for(const pl of this.places){
      if(this.visited.has(pl.id)||!this.inVisitZone(pl,p))continue;
      this.visited.add(pl.id);const st=this.rec(pl.id);st.visits++;if(!st.firstVisit)st.firstVisit=this.clock();this.save();this.touch();
      this.track(EVENT_TYPES.visit,pl,{first:st.visits===1});
      this.push({type:'place-visit',placeId:pl.id,name:pl.name,first:st.visits===1});
    }
    this.lastPos={x:p.x,z:p.z,y:p.y};
  }
  farFrom(place,p,radius){const t=place.talk;return Math.hypot(p.x-t.x,p.z-t.z)>radius;}
  inVisitZone(place,p){
    const v=place.visit||{};
    if(v.kind==='room')return this.roomAt(p)===v.roomId;
    const t=place.talk;return this.sameFloor(p,t.floor||0)&&Math.hypot(p.x-t.x,p.z-t.z)<(v.radius||QUEST.visitRadius);
  }
  pickItems(place,p){
    const r=this.run;if(!r||r.phase!=='run')return;
    const from=this.lastPos&&Math.hypot(p.x-this.lastPos.x,p.z-this.lastPos.z)<14?this.lastPos:null;
    for(const it of this.activeItems()){
      if(!this.sameFloor(p,it.floor))continue;
      const d=from?segmentDistance(it.x,it.z,from.x,from.z,p.x,p.z):Math.hypot(p.x-it.x,p.z-it.z);
      if(d>=it.reach)continue;
      it.got=true;r.found++;if(r.ordered)r.next++;
      const ready=r.found>=r.items.length;if(ready)r.phase='deliver';
      this.touch();
      this.push({type:'place-item',placeId:place.id,itemId:it.id,name:it.name,index:r.found,total:r.items.length,ready,art:it.art});
      const item=place.activity.items.find(i=>i.id===it.id);
      const nextClue=r.ordered&&!ready?(r.items[r.next]?.clue?' '+r.items[r.next].clue:''):'';
      this.say(place,(item?.found||it.name+' hittad!')+(ready?' '+place.activity.ready:nextClue));
      if(ready)break;
    }
  }
  // ── Information till gränssnittet ────────────────────────────────────────────────────────────────────────────
  snapshot(){
    const r=this.run;
    return {rev:this.rev,available:this.available(),stamps:this.stampCount(),total:this.stampTotal(),
      run:r?{placeId:r.placeId,type:r.type,phase:r.phase,found:r.found??0,total:r.items?.length??r.order?.items.length??0,left:r.left??null,seconds:r.seconds??null,mistakes:r.mistakes??0,step:r.step??0}:null};
  }
}
