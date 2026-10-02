// Stämpelkarta: besök Karlstads riktiga platser och samla stämplar som sparas mellan rundor.
// Ger Clean City Explore ett långsiktigt mål utan fiender och utan att påverka poäng/utmaningar.
export const STAMP_KEY='karlstad:stamps:1';
export const STAMP_RADIUS=10;
export class StampBook{
  constructor(places,storage=null,clock=()=>Date.now()){
    const seen=new Set();
    this.places=places.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&!seen.has(p.id)&&seen.add(p.id));
    this.storage=storage;this.clock=clock;this.stamped=new Map();this.load();
  }
  load(){
    try{const v=JSON.parse(this.storage?.getItem(STAMP_KEY)||'null');
      if(v?.version===1&&v.stamps&&typeof v.stamps==='object')for(const [id,at] of Object.entries(v.stamps))if(this.places.some(p=>p.id===id))this.stamped.set(id,Number(at)||0);
    }catch{}
  }
  save(){try{this.storage?.setItem(STAMP_KEY,JSON.stringify({version:1,stamps:Object.fromEntries(this.stamped)}));}catch{}}
  get count(){return this.stamped.size;}
  get total(){return this.places.length;}
  // Returnerar en ny stämpel eller null. Bara på marknivå (övervåningen i gallerian räknas inte
  // som att stå på torget), och högst en stämpel per anrop.
  check(p){
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return null;
    for(const place of this.places){
      if(this.stamped.has(place.id))continue;
      const r=place.radius??STAMP_RADIUS;
      if(Math.hypot(p.x-place.x,p.z-place.z)>r)continue;
      if(Math.abs((p.y??1.68)-1.68-(place.y??0))>2)continue;
      this.stamped.set(place.id,this.clock());this.save();
      return {place,count:this.count,total:this.total,complete:this.count===this.total};
    }
    return null;
  }
  list(){return this.places.map(p=>({id:p.id,label:p.label,stamped:this.stamped.has(p.id)}));}
}
