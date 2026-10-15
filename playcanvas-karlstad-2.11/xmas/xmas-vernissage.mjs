// Julvernissagen: grundspelets uppdrag "Vernissage från graven" (CityMission 'sandgrund') som en längre, juligare strid.
// I grundspelet har Zombie-Lerin 12 liv och en solstöt tar ett: han faller på några sekunder, och med besökarna tätt intill var uppdraget klart på ungefär fem sekunder.
// Här är det en strid i tre delar: (1) besökarna står långt bort och ska hämtas medan tomtezombier kommer från julmarknaden, och Zombie-Lerin är skyddad av en färgsköld (solstötar knuffar
// bort honom men tar inga liv) tills alla tre är i säkerhet; (2) sedan har han 36 liv och kallar på fler tomtezombier när han tappar liv (24 och 12 kvar); (3) i sista fasen är han snabbare.
// Hälsa och solenergi fylls på när en besökare är räddad och när en fas byts, så att striden blir längre men inte orättvis.
// Allt annat (rörelse, träffar, besökarnas följande, räddning, seger och förlust) är grundspelets. Klassen ersätter bara CityMission för 'sandgrund' (last-round.js); övriga uppdrag är oförändrade.
// Ingen DOM och ingen PlayCanvas: går att köra i node.
import {CityMission} from '../city-missions.mjs?v=2.21.1-xmas.9';

export const VERN=Object.freeze({
  duration:270,                    // sekunder (grundspelets uppdrag har 180)
  sleepy:Object.freeze({until:10,speed:1.5,normal:2.1}), // Zombie-Lerin är trögstartad de första 10 sekunderna (grundspelets fart är 2,1)
  shieldNote:4,                    // sekunder mellan två meddelanden om färgskölden
  lerinHp:36,                      // grundspelet: 12
  phases:Object.freeze([           // när Zombie-Lerins liv går under `at` byter striden fas
    Object.freeze({at:24,title:'ZOMBIE-LERIN HÄMTAR FÄRG!',text:'Tomtezombier strömmar ut från julmarknaden. Skjut dem med solstötar.',spawn:3,kinds:Object.freeze(['walker','runner','walker']),heal:20,energy:20}),
    Object.freeze({at:12,title:'SISTA PENSELDRAGET!',text:'Zombie-Lerin är rasande och snabbare. Håll ut!',spawn:3,kinds:Object.freeze(['runner','tank','runner']),heal:20,energy:20,speedMul:1.25})
  ]),
  waves:Object.freeze({first:18,every:30,max:3,count:2,kinds:Object.freeze(['walker','runner','tank'])}),   // en liten våg var 30:e sekund så länge Zombie-Lerin lever
  ring:Object.freeze({min:28,max:44,apart:20,fromSafe:24,maxPath:34}), // besökarna: 28–44 m från platsen, minst 20 m från varandra, minst 24 m från samlingsplatsen, högst 34 rutor (ca 100 m) att gå
  rescueHeal:15,rescueEnergy:20,
  visitorHealth:300,               // grundspelet: 100 (Zombie-Lerin tar 12 per träff, så en besökare klarade åtta träffar; nu tjugofem: ca en minut intill honom). Förlust om en besökare tappar allt
  maxMinions:7                     // högst så många tomtezombier samtidigt (grundspelet har 12 platser i poolen)
});

const seeded=seed=>{let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};};

export class XmasVernissage extends CityMission{
  start(options={}){
    super.start(options);
    if(this.id!=='sandgrund')return;
    this.duration=this.remaining=VERN.duration;
    const lerin=this.actors[0];lerin.hp=lerin.maxHp=VERN.lerinHp;
    this.vern={phase:0,nextWave:VERN.waves.first,waves:0,rand:seeded((this.seed||1)*7919+13),rescuedSeen:0,rage:1,shieldAt:-99};
    lerin.speed=VERN.sleepy.speed;
    this.visitors.forEach(v=>{v.health=VERN.visitorHealth;});
    this.placeVisitors();
  }
  // Besökarna står långt från platsen och från varandra: en gyllene spiral av kandidater, prövade mot gångkartan (nav.point flyttar dem till närmaste gångbara ruta).
  placeVisitors(){
    const {min,max,apart,fromSafe,maxPath}=VERN.ring,site=this.site,safe=this.safe,chosen=[];
    for(let k=0;k<80&&chosen.length<3;k++){
      const a=k*2.399963+(this.seed%97)*.05,r=min+((k*13)%17)/16*(max-min);
      const p=this.nav.point({x:site.x+Math.sin(a)*r,z:site.z+Math.cos(a)*r});
      if(Math.hypot(p.x-site.x,p.z-site.z)<min*.7||Math.hypot(p.x-safe.x,p.z-safe.z)<fromSafe)continue;
      if(chosen.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<apart))continue;
      const path=this.nav.path(p,safe);if(path.length<2||path.length>maxPath)continue; // inte nåbar eller för långt bort
      chosen.push({x:p.x,z:p.z});
    }
    // Hittas inte tre platser behålls grundspelets (de ligger närmare men finns alltid).
    chosen.forEach((p,i)=>{const v=this.visitors[i];v.x=p.x;v.z=p.z;});
    this.vern.placed=chosen.length;
  }
  // Tomtezombier runt spelaren (14–22 m bort, mot platsen), i lediga platser i poolen (plats 0 är Zombie-Lerin).
  spawnMinions(n,kinds,player){
    const lerin=this.actors[0],near=player||this.site;let made=0;
    const alive=this.actors.filter((a,i)=>i>0&&a.active).length;
    for(const a of this.actors.slice(1)){
      if(made>=n||alive+made>=VERN.maxMinions)break;
      if(a.active)continue;
      const base=Math.atan2(lerin.x-near.x,lerin.z-near.z),ang=base+(this.vern.rand()-.5)*2.4,r=14+this.vern.rand()*8;
      this.spawn(a,{x:near.x+Math.sin(ang)*r,z:near.z+Math.cos(ang)*r},kinds[made%kinds.length]);
      made++;
    }
    return made;
  }
  // Färgskölden: tills alla tre besökare är räddade tar Zombie-Lerin inga liv av solstötar (han knuffas som vanligt).
  get shielded(){return this.id==='sandgrund'&&!!this.vern&&this.rescued<3&&this.actors[0].active;}
  impulse(a,dx,dz,strength,shot){
    if(a===this.actors[0]&&this.shielded){
      if(!a.active||!this.chains.has(shot)||this.chains.get(shot).has(a.id))return;
      const keep=a.hp;a.hp=Infinity;super.impulse(a,dx,dz,strength,shot);a.hp=keep;
      if(this.elapsed-this.vern.shieldAt>=VERN.shieldNote){this.vern.shieldAt=this.elapsed;this.events.push({type:'vernissage-shield',title:'FÄRGSKÖLD!',text:'Zombie-Lerin tål inga solstötar förrän alla besökare är i säkerhet.'});}
      return;
    }
    super.impulse(a,dx,dz,strength,shot);
  }
  step(dt,player){
    if(this.id!=='sandgrund'||!this.vern)return super.step(dt,player);
    const lerin0=this.actors[0];lerin0.speed=(this.elapsed<VERN.sleepy.until?VERN.sleepy.speed:VERN.sleepy.normal)*this.vern.rage;
    super.step(dt,player);
    if(this.phase!=='playing')return;
    const lerin=this.actors[0],v=this.vern;
    // Besökare räddad: hälsa och solenergi fylls på (ingen ny händelse; grundspelets visitor-safe visar redan texten)
    if(this.rescued>v.rescuedSeen){
      v.rescuedSeen=this.rescued;this.health=Math.min(100,this.health+VERN.rescueHeal);this.energy=Math.min(100,this.energy+VERN.rescueEnergy);
    }
    if(!lerin.active)return;
    // Fasbyte när Zombie-Lerin tappar liv
    const ph=VERN.phases[v.phase];
    if(ph&&lerin.hp<=ph.at){
      v.phase++;this.spawnMinions(ph.spawn,ph.kinds,player);
      this.health=Math.min(100,this.health+ph.heal);this.energy=Math.min(100,this.energy+ph.energy);
      if(ph.speedMul)v.rage=ph.speedMul;
      this.events.push({type:'vernissage-phase',phase:v.phase+1,title:ph.title,text:ph.text});
    }
    // Små vågor medan han lever
    if(this.elapsed>=v.nextWave&&v.waves<VERN.waves.max){
      v.waves++;v.nextWave=this.elapsed+VERN.waves.every;
      if(this.spawnMinions(VERN.waves.count,VERN.waves.kinds,player))this.events.push({type:'vernissage-wave',wave:v.waves,title:'NYA TOMTEZOMBIER!',text:'Julmarknaden släpper ut fler. Håll koll bakåt.'});
    }
  }
  snapshotVern(){return this.vern?{phase:this.vern.phase+1,waves:this.vern.waves,placed:this.vern.placed,shielded:this.shielded}:null;}
}
