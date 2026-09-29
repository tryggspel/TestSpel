import {CityMission} from './city-missions.mjs?v=2.1.0';

export const JOURNEY_KEY='karlstad:journey:1';
const bounded=(v,max,fallback=0)=>Number.isFinite(Number(v))?Math.max(0,Math.min(max,Number(v))):fallback;
export class CityJourney extends CityMission {
  constructor(nav,mall,portals,storage=null){
    super('journey',nav,mall);this.storage=storage;this.portals=portals;this.layout.duration=Infinity;this.duration=this.remaining=Infinity;this.phase='playing';
    this.actors.forEach(a=>a.active=false);this.layout.chargers=[];this.chargerTimes=[];this.events=[];this.elapsed=0;this.balance=0;this.lifetime=0;this.energy=45;this.destination='sista-rundan';
    this.found=new Set();this.secretsFound=new Set();this.cleared=new Set();this.lastCollect=-100;this.collectChain=0;this.lastAmbush=-100;this.lastSave=0;this.dirty=false;this.pendingAmbush=null;
    const unique=new Map(),routes=[];
    for(const destination of [portals['sista-rundan'],this.delivery,portals.sandgrund]){
      const route=nav.path(this.layout.spawn,destination);routes.push(route);
      route.forEach((p,i)=>{if(i>0&&i%2===0){const id=`t:${p.x}:${p.z}`;unique.set(id,{...p,id});}});
    }
    for(const p of [{x:1,z:7},{x:1,z:1},{x:7,z:1},{x:13,z:1},{x:19,z:7},{x:-8,z:14}]){const q=nav.point(p);unique.set(`t:${q.x}:${q.z}`,{...q,id:`t:${q.x}:${q.z}`});}
    const sg=portals.sandgrund;
    this.secrets=[[-43,-8,'Bakom rubrikerna'],[53,5,'Bortaklackens gömma'],[-164,48,'Gallerian efter stängning'],[68,-91,'Domkyrkans skugga'],[sg.x+30,sg.z+12,'Penselns hemlighet']].map(([x,z,name],i)=>({...nav.point({x,z}),id:'secret-'+i,name}));
    this.items=[...unique.values()].filter(p=>!this.secrets.some(s=>Math.hypot(p.x-s.x,p.z-s.z)<3));
    this.ambushes=[];
    routes.forEach((route,ri)=>{for(let i=10;i<route.length-4;i+=22){const trigger=route[i],next=route[i+1],dx=next.x-trigger.x,dz=next.z-trigger.z;
      const spawn=nav.point({x:trigger.x-dz*1.5,z:trigger.z+dx*1.5});this.ambushes.push({id:`ambush-${ri}-${i}`,trigger,spawn});}});
    this.position={...this.layout.spawn};this.heading=0;this.load();
  }
  load(){
    try{const v=JSON.parse(this.storage?.getItem(JOURNEY_KEY)||'null');if(!v||v.version!==1)return;
      this.balance=bounded(v.balance,999999);this.lifetime=bounded(v.lifetime,9999999);this.energy=bounded(v.energy,100,45);this.health=bounded(v.health,100,100)||100;
      const pick=(list,valid)=>new Set(Array.isArray(list)?list.filter(id=>valid.some(p=>p.id===id)):[]);
      this.found=pick(v.found,this.items);this.secretsFound=pick(v.secrets,this.secrets);this.cleared=pick(v.cleared,this.ambushes);
      if(v.position&&Number.isFinite(v.position.x)&&Number.isFinite(v.position.z))this.position=this.nav.point(v.position);
      if(Number.isFinite(v.heading))this.heading=v.heading;
      if(this.portals[v.destination])this.destination=v.destination;
    }catch{}
  }
  save(){
    try{this.storage?.setItem(JOURNEY_KEY,JSON.stringify({version:1,balance:this.balance,lifetime:this.lifetime,energy:this.energy,health:this.health,found:[...this.found],secrets:[...this.secretsFound],cleared:[...this.cleared],position:this.position,heading:this.heading,destination:this.destination}));this.dirty=false;}catch{}
  }
  reward(points){this.balance+=points;this.lifetime+=points;this.dirty=true;}
  refill(target=this){
    if(target.phase!=='playing'||target.practice||this.balance<25||target.energy>60)return false;
    this.balance-=25;target.energy=Math.min(100,target.energy+40);this.energy=target.energy;this.dirty=true;target.events.push({type:'refill'});this.save();return true;
  }
  shoot(args){
    this.weakShot=!args.power&&this.energy<3;
    const before=this.energy,kills=this.captured;
    const result=super.shoot(args);if(result){if(!args.power)this.energy=Math.min(100,Math.max(0,before-3)+8*(this.captured-kills));this.dirty=true;}return result;
  }
  impulse(actor,dx,dz,strength,shot){
    const wasActive=actor.active;super.impulse(actor,dx,dz,this.weakShot?Math.min(9,strength):strength,shot);
    if(wasActive&&!actor.active&&actor.ambushId&&!this.cleared.has(actor.ambushId)){this.cleared.add(actor.ambushId);this.reward(30);this.events.push({type:'ambush-clear'});}
  }
  finish(won){
    if(won)return;
    this.balance=Math.max(0,this.balance-25);this.health=100;this.energy=Math.max(20,this.energy);this.contactCooldown=8;this.actors.forEach(a=>a.active=false);this.pendingAmbush=null;
    this.events.push({type:'recover'});this.dirty=true;
  }
  objective(){const p=this.portals[this.destination];return {...p,label:p.name,radius:4};}
  nearestPortal(p){return Object.entries(this.portals).map(([id,q])=>({id,...q,distance:Math.hypot(p.x-q.x,p.z-q.z)})).sort((a,b)=>a.distance-b.distance)[0];}
  step(dt,player,forward={x:0,z:-1}){
    if(this.phase!=='playing'||!player||!Number.isFinite(dt)||dt<=0)return;
    this.position={x:player.x,z:player.z};this.heading=Math.atan2(-forward.x,-forward.z)*180/Math.PI;super.step(dt,player);
    for(const item of this.items)if(!this.found.has(item.id)&&Math.hypot(player.x-item.x,player.z-item.z)<1.65){
      this.found.add(item.id);this.collectChain=this.elapsed-this.lastCollect<6?this.collectChain+1:1;this.lastCollect=this.elapsed;
      const bonus=this.collectChain%5===0?25:0;this.reward(25+bonus);this.energy=Math.min(100,this.energy+15);
      this.events.push({type:'thermos',points:25+bonus,chain:this.collectChain,x:item.x,z:item.z});
    }
    for(const s of this.secrets)if(!this.secretsFound.has(s.id)&&Math.hypot(player.x-s.x,player.z-s.z)<1.8){
      this.secretsFound.add(s.id);this.reward(200);this.energy=100;this.health=100;this.events.push({type:'secret',name:s.name});
    }
    if(this.pendingAmbush&&this.elapsed>=this.pendingAmbush.at){
      const free=this.actors.find(a=>!a.active),ambush=this.pendingAmbush.ambush;
      if(free){this.spawn(free,ambush.spawn,this.cleared.size%3===0?'runner':'walker');free.ambushId=ambush.id;free.ambushAt=this.elapsed;this.events.push({type:'ambush'});}
      this.pendingAmbush=null;
    }
    if(this.elapsed>8&&!this.pendingAmbush&&this.elapsed-this.lastAmbush>18&&this.actors.filter(a=>a.active).length<3){
      const ambush=this.ambushes.find(a=>{
        const dx=a.spawn.x-player.x,dz=a.spawn.z-player.z,d=Math.hypot(dx,dz);
        const outOfView=(dx*forward.x+dz*forward.z)/Math.max(.01,d)<.35||!this.visible(player.x,player.z,a.spawn.x,a.spawn.z);
        return outOfView&&!this.cleared.has(a.id)&&!this.actors.some(z=>z.active&&z.ambushId===a.id)&&Math.hypot(player.x-a.trigger.x,player.z-a.trigger.z)<7&&d>2.5;
      });
      if(ambush){this.pendingAmbush={ambush,at:this.elapsed+.65};this.lastAmbush=this.elapsed;this.events.push({type:'rustle'});}
    }
    // A tiny reserve restores an emergency shot; thermoses and points power strong attacks.
    if(this.energy<12)this.energy=Math.min(12,this.energy+dt*.75);
    if(this.elapsed-this.lastSave>=4){this.lastSave=this.elapsed;this.save();}
  }
}
