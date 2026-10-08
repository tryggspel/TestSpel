// City Explore 2.15: blixtutmaningar. Ett kort meddelande dyker upp, försvinner efter någon sekund och lämnar bara en tunn
// tidslinje i skärmens överkant, så att staden syns. Idén kommer från uppdragen i Subway Surfers och Crossy Road.
// Ren logik utan DOM. Tiden räknas bara medan spelet går (dt kommer från spelloopen).
import {seededRandom,hashSeed} from './daily-challenge.mjs?v=2.21.1';

export const FLASH=Object.freeze({firstDelay:[18,32],gap:[28,55],announce:3.4,minLevel:1});

// Varje typ: bygger en utmaning efter spelarens nivå. progress räknas av note*-funktionerna.
const KINDS=Object.freeze({
  thermos:level=>{const n=4+Math.floor(level/2),t=45+n*3;return {title:'SNABBFIKA',text:`Hitta ${n} termosar på ${t} s`,target:n,seconds:t,points:90+level*20};},
  chain:level=>{const n=4+Math.floor(level/3),t=50;return {title:'KEDJEREAKTION',text:`Nå en kedja på ${n} på ${t} s`,target:n,seconds:t,points:130+level*25};},
  rare:level=>({title:'SILVERJAKT',text:'Hitta en silver-, guld- eller regnbågstermos på 70 s',target:1,seconds:70,points:160+level*25}),
  turbo:level=>{const m=220+level*40,t=42;return {title:'TURBOSPURT',text:`Spring ${m} m i turbo på ${t} s`,target:m,seconds:t,points:140+level*20};},
  power:level=>({title:'FYNDARE',text:'Hitta en förmåga (glittrande märke) på 100 s',target:1,seconds:100,points:170+level*20})
});
export const FLASH_KINDS=Object.freeze(Object.keys(KINDS));

export class FlashChallenges{
  constructor({seed=1,enabled=true}={}){this.seed=seed;this.enabled=enabled;this.reset();}
  reset(){
    this.rnd=seededRandom(hashSeed('flash|'+this.seed));this.serial=0;this.active=null;this.last=null;this.done=0;this.failed=0;
    this.cooldown=this.between(FLASH.firstDelay);
  }
  between([a,b]){return a+(b-a)*this.rnd();}
  pickKind(level){
    const pool=FLASH_KINDS.filter(k=>k!==this.last);
    return pool[Math.floor(this.rnd()*pool.length)];
  }
  start(level=1,kind=this.pickKind(level)){
    const def=KINDS[kind](Math.max(1,level));this.serial++;this.last=kind;
    this.active={id:'flash-'+this.serial,kind,...def,progress:0,left:def.seconds,span:def.seconds,announce:FLASH.announce};
    return {type:'challenge-start',id:this.active.id,kind,title:def.title,text:def.text,seconds:def.seconds,points:def.points,target:def.target};
  }
  // Egen utmaning (till exempel en platsutmaning): titel, text, antal, sekunder och belöning anges av spelet.
  startCustom({title,text,target,seconds,points}){
    this.serial++;this.last='site';
    this.active={id:'flash-'+this.serial,kind:'site',title,text,target,seconds,points,progress:0,left:seconds,span:seconds,announce:FLASH.announce};
    return {type:'challenge-start',id:this.active.id,kind:'site',title,text,seconds,points,target};
  }
  // Returnerar händelser: challenge-start, challenge-done, challenge-fail.
  tick(dt,{level=1,busy=false}={}){
    if(!this.enabled||!(dt>0))return [];
    const a=this.active;
    if(!a){if(busy)return [];this.cooldown-=dt;if(this.cooldown<=0)return [this.start(level)];return [];}
    if(busy)return [];
    a.announce=Math.max(0,a.announce-dt);a.left-=dt;
    if(a.left<=0){this.active=null;this.failed++;this.cooldown=this.between(FLASH.gap);return [{type:'challenge-fail',id:a.id,kind:a.kind,title:a.title,progress:a.progress,target:a.target}];}
    return [];
  }
  finish(){
    const a=this.active;if(!a)return [];
    this.active=null;this.done++;this.cooldown=this.between(FLASH.gap);
    return [{type:'challenge-done',id:a.id,kind:a.kind,title:a.title,points:a.points,seconds:Math.round(a.span-a.left),giftPower:this.rnd()<.4}];
  }
  bump(kind,amount,max=false){
    const a=this.active;if(!a||a.kind!==kind)return [];
    a.progress=max?Math.max(a.progress,amount):a.progress+amount;
    return a.progress>=a.target?this.finish():[];
  }
  noteThermos({chain=0,rarity='common',power=false}={}){
    if(!this.active)return [];
    const out=[];
    out.push(...this.bump('thermos',1));
    if(this.active)out.push(...this.bump('chain',chain,true));
    if(this.active&&rarity!=='common')out.push(...this.bump('rare',1));
    if(this.active&&power)out.push(...this.bump('power',1));
    return out;
  }
  noteMeters(m){return Number.isFinite(m)&&m>0?this.bump('turbo',m):[];}
  extend(seconds){if(this.active){this.active.left+=seconds;this.active.span+=seconds;}}
  // Det HUD:en behöver. announce>0 betyder att det stora meddelandet fortfarande visas.
  snapshot(){
    const a=this.active;if(!a)return null;
    return {id:a.id,kind:a.kind,title:a.title,text:a.text,progress:Math.min(a.target,Math.floor(a.progress)),target:a.target,left:Math.max(0,a.left),span:a.span,announce:a.announce,points:a.points};
  }
}
