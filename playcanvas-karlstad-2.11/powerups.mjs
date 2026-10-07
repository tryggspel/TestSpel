// City Explore 2.15: förmågor (power-ups) som gömmer sig i vissa termosar. Ren logik utan DOM, så att allt går att testa.
// Idéerna är lånade: frågetecken-lådorna och stjärnan i Mario Kart/Mario, Bullet Bill, färgbomben i Candy Crush,
// fjäderstövlarna i Doodle Jump och skölden i Pac-Man-lika spel. Vilka termosar som bär en förmåga byter varje dag.

export const POWERUPS=Object.freeze({
  rocket:{label:'RAKETTERMOS',text:'Farten dubblas ytterligare. Spring!',seconds:7,color:'#ff6b4a',ink:'#4a1308'},
  star:{label:'SOLSTJÄRNA',text:'Magnet, dubbla poäng och frusen kedja.',seconds:9,color:'#ffd23f',ink:'#4a3600'},
  boots:{label:'HOPPSTÖVLAR',text:'Hoppa mer än dubbelt så högt (inte inomhus).',seconds:25,color:'#5fd0ff',ink:'#06364d'},
  shield:{label:'KOMBOSKÖLD',text:'Räddar din kedja nästa gång den skulle brytas.',seconds:0,color:'#7be495',ink:'#0d3b1f'},
  clock:{label:'FIKAKLOCKA',text:'+10 sekunder på utmaningen och full kedja.',seconds:0,color:'#ffa6e0',ink:'#4c1038'},
  bomb:{label:'SOCKERBOMB',text:'Tar alla termosar inom 26 meter på en gång.',seconds:0,color:'#c28bff',ink:'#2b0f52'},
  pause:{label:'FIKAPAUS',text:'Klockan till nästa termos står still.',seconds:7,color:'#9ad8ff',ink:'#0b3550'},
  strip:{label:'KANELSTRÅLE',text:'Tar alla termosar i en rak linje framför dig.',seconds:0,color:'#ff9f5a',ink:'#4d2200'},
  rain:{label:'BÖNREGN',text:'Tio termosar regnar ner runt dig. Plocka!',seconds:0,color:'#b98a5e',ink:'#2e1a08'},
  egg:{label:'LYCKOÄGG',text:'Allt du plockar ger tre gånger så mycket.',seconds:20,color:'#fff3a6',ink:'#4d3d00'},
  ghost:{label:'SPÖKET',text:'Ett vänligt spöke plockar termosar åt dig.',seconds:10,color:'#e6e0ff',ink:'#2b2060'},
  radar:{label:'SONAR',text:'Ljusstrålar visar de sex närmaste termosarna.',seconds:15,color:'#6ff0c8',ink:'#04382c'}
});
export const POWER_KINDS=Object.freeze(Object.keys(POWERUPS));
export const POWER={rate:56,rocketMult:2,bootsMult:1.5,bombRadius:26,bombMax:14,clockSeconds:10,shieldMax:2,rocketFov:8,eggMult:3,ghostEvery:.7,ghostRange:70,ghostFly:.5,radarCount:6,radarRange:200,stripLength:80,stripWidth:6,stripMax:16,rainCount:10};
// Förmågor som delas ut som gåva efter en klarad blixtutmaning (inte de som plockar termosar direkt).
export const GIFT_KINDS=Object.freeze(['rocket','star','boots','shield','pause','egg','ghost','radar']);

function hash32(text){let h=2166136261;const s=String(text);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
// Vilken förmåga (om någon) en termos bär i dag. Ungefär var 24:e termos.
export function powerFor(id,day){
  const h=hash32('pw|'+id+'|'+day);
  if(h%1000>=POWER.rate)return null;
  return POWER_KINDS[Math.floor(h/1000)%POWER_KINDS.length];
}

export class PowerState{
  constructor(){this.timers={rocket:0,boots:0,pause:0,egg:0,ghost:0,radar:0};this.shield=0;}
  reset(){for(const k of Object.keys(this.timers))this.timers[k]=0;this.shield=0;}
  // Returnerar true om förmågan lades till här (resten hanteras av spelet: stjärna, klocka, bomb).
  grant(kind){
    const def=POWERUPS[kind];if(!def)return false;
    if(kind==='rocket'||kind==='boots'||kind==='pause'||kind==='egg'||kind==='ghost'||kind==='radar'){this.timers[kind]=Math.max(this.timers[kind],def.seconds);return true;}
    if(kind==='shield'){this.shield=Math.min(POWER.shieldMax,this.shield+1);return true;}
    return false;
  }
  tick(dt){if(!(dt>0))return;for(const k of Object.keys(this.timers))if(this.timers[k]>0)this.timers[k]=Math.max(0,this.timers[k]-dt);}
  speedMul(){return this.timers.rocket>0?POWER.rocketMult:1;}
  jumpMul(){return this.timers.boots>0?POWER.bootsMult:1;}
  // Fikapausen fryser klockan till nästa termos, utmaningen och kedjan. Lyckoägget ger tre gånger poäng.
  pausing(){return this.timers.pause>0;}
  scoreMul(){return this.timers.egg>0?POWER.eggMult:1;}
  ghosting(){return this.timers.ghost>0;}
  scanning(){return this.timers.radar>0;}
  // Skölden används när en kedja ≥ 2 skulle brytas. Returnerar true om den räddade kedjan.
  useShield(){if(this.shield<=0)return false;this.shield--;return true;}
  snapshot(){
    const list=[];
    for(const k of Object.keys(this.timers))if(this.timers[k]>0)list.push({kind:k,label:POWERUPS[k].label,left:this.timers[k]});
    if(this.shield>0)list.push({kind:'shield',label:POWERUPS.shield.label+(this.shield>1?' ×'+this.shield:''),left:0});
    return list;
  }
}
