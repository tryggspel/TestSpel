// City Explore 2.15: förmågor (power-ups) som gömmer sig i vissa termosar. Ren logik utan DOM, så att allt går att testa.
// Idéerna är lånade: frågetecken-lådorna och stjärnan i Mario Kart/Mario, Bullet Bill, färgbomben i Candy Crush,
// fjäderstövlarna i Doodle Jump och skölden i Pac-Man-lika spel. Vilka termosar som bär en förmåga byter varje dag.

export const POWERUPS=Object.freeze({
  rocket:{label:'RAKETTERMOS',text:'Farten dubblas ytterligare. Spring!',seconds:7,color:'#ff6b4a',ink:'#4a1308'},
  star:{label:'SOLSTJÄRNA',text:'Magnet, dubbla poäng och frusen kedja.',seconds:9,color:'#ffd23f',ink:'#4a3600'},
  boots:{label:'HOPPSTÖVLAR',text:'Hoppa mer än dubbelt så högt (inte inomhus).',seconds:25,color:'#5fd0ff',ink:'#06364d'},
  shield:{label:'KOMBOSKÖLD',text:'Räddar din kedja nästa gång den skulle brytas.',seconds:0,color:'#7be495',ink:'#0d3b1f'},
  clock:{label:'FIKAKLOCKA',text:'+10 sekunder på utmaningen och full kedja.',seconds:0,color:'#ffa6e0',ink:'#4c1038'},
  bomb:{label:'SOCKERBOMB',text:'Tar alla termosar inom 26 meter på en gång.',seconds:0,color:'#c28bff',ink:'#2b0f52'}
});
export const POWER_KINDS=Object.freeze(Object.keys(POWERUPS));
export const POWER={rate:42,rocketMult:2,bootsMult:1.5,bombRadius:26,bombMax:14,clockSeconds:10,shieldMax:2,rocketFov:8};

function hash32(text){let h=2166136261;const s=String(text);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
// Vilken förmåga (om någon) en termos bär i dag. Ungefär var 24:e termos.
export function powerFor(id,day){
  const h=hash32('pw|'+id+'|'+day);
  if(h%1000>=POWER.rate)return null;
  return POWER_KINDS[Math.floor(h/1000)%POWER_KINDS.length];
}

export class PowerState{
  constructor(){this.timers={rocket:0,boots:0};this.shield=0;}
  reset(){this.timers.rocket=0;this.timers.boots=0;this.shield=0;}
  // Returnerar true om förmågan lades till här (resten hanteras av spelet: stjärna, klocka, bomb).
  grant(kind){
    const def=POWERUPS[kind];if(!def)return false;
    if(kind==='rocket'||kind==='boots'){this.timers[kind]=Math.max(this.timers[kind],def.seconds);return true;}
    if(kind==='shield'){this.shield=Math.min(POWER.shieldMax,this.shield+1);return true;}
    return false;
  }
  tick(dt){if(!(dt>0))return;for(const k of Object.keys(this.timers))if(this.timers[k]>0)this.timers[k]=Math.max(0,this.timers[k]-dt);}
  speedMul(){return this.timers.rocket>0?POWER.rocketMult:1;}
  jumpMul(){return this.timers.boots>0?POWER.bootsMult:1;}
  // Skölden används när en kedja ≥ 2 skulle brytas. Returnerar true om den räddade kedjan.
  useShield(){if(this.shield<=0)return false;this.shield--;return true;}
  snapshot(){
    const list=[];
    for(const k of Object.keys(this.timers))if(this.timers[k]>0)list.push({kind:k,label:POWERUPS[k].label,left:this.timers[k]});
    if(this.shield>0)list.push({kind:'shield',label:POWERUPS.shield.label+(this.shield>1?' ×'+this.shield:''),left:0});
    return list;
  }
}
