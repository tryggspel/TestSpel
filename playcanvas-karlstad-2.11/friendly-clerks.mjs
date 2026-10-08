import {MALL_ROOMS,mallRoom} from './mall-space.mjs?v=2.21.0';
import {STOREFRONTS,storefrontAnchor} from './city-geography.mjs?v=2.21.0';
const stories={
  coop:{name:'Kvittot-Kjell',itemName:'KVITTOT',request:'Kassan vägrar ta emot gurkan. Hämta kvittot så kan jag reklamera mig själv.',thanks:'Kvittot säger att jag varit utgången sedan tisdag. Men du får bonus!',panic:'Det PIPER! Är det kassan? Är det jag?!'},
  cervera:{name:'Rut i returen',itemName:'KOPPEN',request:'Jag har lagt kaffekoppen bland returerna. Hämta den? Jag vågar inte fråga mig själv.',thanks:'Tack! Jag skulle erbjuda kaffe, men glömde vilken ände av koppen man använder.',panic:'Tänk om allt porslin går sönder samtidigt!'},
  clas:{name:'Skruv-Siv',itemName:'SKRUVASKEN',request:'En skruv lös? Det står i mitt utvecklingssamtal. Hämta asken vid hyllan!',thanks:'Rätt skruv! Fel huvud. Mitt alltså. Tack för hjälpen!',panic:'Varför finns det så många sorters skruvar?!'},
  press:{name:'Påtårs-Per',itemName:'TIDNINGEN',request:'Jag kan visa vägen! Nej, vänta … min tidning blåste bort. Hämta den så läser jag kartan.',thanks:'Torget är mittpunkten. Följ Västra Torggatan norrut mot biblioteket och Sandgrund. Jag stannar här och … arbetar?',panic:'Rubriken säger ZOMBIES I STAN! Tur att vi är personal.'}
};
const sameFloor=(p,q)=>Math.abs((p.y??1.68)-1.68-(q.y||0))<1.3;
export class FriendlyClerks {
  constructor(city,buildings=[]){
    this.city=city;
    this.people=MALL_ROOMS.map(r=>{const a=r.door.yaw*Math.PI/180;return {id:r.id,room:r.id,...stories[r.id],...r.clerk,y:r.floor*5.4,service:{x:r.clerk.x+Math.sin(a)*3,z:r.clerk.z+Math.cos(a)*3},item:{...r.item,y:r.floor*5.4}};});
    const anchor=storefrontAnchor(STOREFRONTS.find(s=>s.id==='pressbyran14'),buildings);
    if(anchor){const p=city.nav.point({x:anchor.x+2,z:anchor.z+2.8}),item=city.nav.point({x:p.x+7,z:p.z+4});this.people.push({id:'press',...stories.press,...p,y:0,service:{...p},item:{...item,y:0}});}
    this.reset();
  }
  reset(){this.active=null;for(const q of this.people){q.stage='idle';q.stress=0;q.calmUntil=0;q.greeted=false;}this.elapsed=0;}
  near(p){return this.people.find(q=>sameFloor(p,q)&&Math.hypot(p.x-q.x,p.z-q.z)<3.6&&(!q.room||mallRoom(p)?.id===q.room));}
  // 2.21: i vanliga City Explore fungerar personalens hjälpuppdrag (frivilligt) precis som i zombieläget, utan stress och zombier.
  // Personal vars butik har ett eget platsuppdrag (Cervera, Pressbyrån) lämnar över till det (PlaceQuests) i Explore.
  explore(){const c=this.city;return c.rush?.mode==='clean'&&!c.tempo?.running&&!c.rush?.challenge;}
  owned(q){return this.explore()&&!!this.city.places?.handles?.(q.id)&&!!this.city.places.available();}
  calm(){return !!this.city.rush?.peaceful&&!this.explore();}
  prompt(p){const q=this.near(p);if(!q||this.owned(q))return null;return this.calm()?'PRATA':q.stress>=60?'LUGNA':q.stage==='found'?'LÄMNA '+q.itemName:q.stage==='done'?'PRATA':'HJÄLP';}
  say(q,text,reward=0){this.city.events.push({type:'friendly',name:q.name,text,points:reward});}
  interact(p){
    const q=this.near(p);if(!q||this.owned(q))return false;
    if(this.calm()){this.say(q,q.thanks.replace('Men du får bonus!','Kvittot kan du få ändå.'));return true;}
    if(this.city.rush?.exitReady){this.say(q,'Du har poängen! Följ grönt till tryggzonen, jag vaktar … någonting.');return true;}
    if(q.stress>=60){q.stress=12;q.calmUntil=this.elapsed+12;this.say(q,'Okej. Andas in. Andas … behöver jag andas? Tack. Nu tar vi en sak i taget.');return true;}
    if(q.stage==='found'){
      q.stage='done';this.active=null;this.city.routeMode='hunt';this.city.reward(80);this.city.energy=Math.min(100,this.city.energy+20);this.city.rush?.raisePanic(-8);this.city.save();this.say(q,q.thanks,80);return true;
    }
    if(q.stage==='done'){this.say(q,q.thanks);return true;}
    this.active=q.id;if(q.stage==='idle')q.stage='search';this.city.routeMode='help';this.say(q,q.request);return true;
  }
  objective(){
    const q=this.people.find(q=>q.id===this.active);if(!q||q.stage==='done')return null;
    const found=q.stage==='found';return {...(found?q.service:q.item),y:q.y,id:'help-'+q.id+'-'+q.stage,kind:'landmark',label:found?'TILLBAKA TILL '+q.name.toUpperCase():'HÄMTA '+q.itemName,radius:found?2:1.1,action:found?'TRYCK LÄMNA':'GÅ NÄRA FÖR ATT PLOCKA UPP'};
  }
  step(dt,p){
    this.elapsed+=dt;
    for(const q of this.people){
      const near=sameFloor(p,q)&&Math.hypot(p.x-q.x,p.z-q.z)<14;if(!near)continue;
      const danger=this.city.actors.some(a=>a.active&&q.y===0&&Math.hypot(a.x-q.x,a.z-q.z)<9)||(this.city.rush?.panic||0)>65;
      const before=q.stress;q.stress=Math.max(0,Math.min(100,q.stress+dt*(danger&&this.elapsed>q.calmUntil?14:-9)));
      if(before<60&&q.stress>=60)this.say(q,q.panic);
      if(q.stage==='search'&&sameFloor(p,q.item)&&Math.hypot(p.x-q.item.x,p.z-q.item.z)<1.15){q.stage='found';this.say(q,q.itemName+' hittad! Ta den till mig. Jag har nästan förstått kassan.');}
    }
  }
  snapshot(){return {active:this.active,people:this.people.map(q=>({id:q.id,name:q.name,x:q.x,z:q.z,y:q.y,stage:q.stage,stress:Math.round(q.stress),friendly:true}))};}
}
