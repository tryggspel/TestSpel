// Halloween 2026 / roadmap F1 — 13 förbannade termosar.
// Lätt version som återanvänder termossystemet: 13 av de vanliga termosarna blir förbannade.
// Poängen är exakt densamma som för en vanlig termos (påverkar inte utmaningar eller rekord).
// Varje fynd ger en ledtråd till nästa, fyller bossmätaren och startar en kort, rent visuell
// "övernaturlig" händelse. Alla 13 låser upp MIDNATT PÅ TORGET (själva bossen är inte byggd).
export const CURSED_COUNT=13;
export const SEASON={year:2026,from:'2026-10-17',to:'2026-11-02'};
export const HALLOWEEN_KEY='karlstad:halloween:'+SEASON.year;
const COMPASS=['norr','nordost','öster','sydost','söder','sydväst','väster','nordväst'];

export function stockholmDate(date=new Date()){
  try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}catch{return date.toISOString().slice(0,10);}
}
export function halloweenActive(date=new Date(),search=''){
  const q=new URLSearchParams(search||'').get('season');
  if(q==='halloween')return true;if(q==='off')return false;
  const d=stockholmDate(date);return d>=SEASON.from&&d<=SEASON.to;
}
// Väljer 13 termosar långt ifrån varandra (farthest-point sampling). Deterministiskt: samma
// karta ger samma platser för alla spelare. Fjärrplatserna Kil/Marieberg tas inte med.
export function pickCursed(items,n=CURSED_COUNT){
  const pool=items.filter(t=>t&&Number.isFinite(t.x)&&Number.isFinite(t.z)&&!/^(kil|marieberg)-/.test(t.id)).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  if(!pool.length)return [];
  let first=pool[0];for(const t of pool)if(Math.hypot(t.x,t.z)<Math.hypot(first.x,first.z))first=t;
  const picked=[first],dist=new Map(pool.map(t=>[t.id,Math.hypot(t.x-first.x,t.z-first.z)]));
  while(picked.length<Math.min(n,pool.length)){
    let best=null;for(const t of pool)if(!picked.includes(t)&&(!best||dist.get(t.id)>dist.get(best.id)))best=t;
    picked.push(best);for(const t of pool)dist.set(t.id,Math.min(dist.get(t.id),Math.hypot(t.x-best.x,t.z-best.z)));
  }
  return picked;
}
export function bearing(from,to){
  const deg=(Math.atan2(to.x-from.x,-(to.z-from.z))*180/Math.PI+360)%360;
  return COMPASS[Math.round(deg/45)%8];
}
const OMENS=[
  ['KYRKKLOCKORNA SLÅR TRETTON','Ingen i Domkyrkan erkänner något.'],
  ['DIMMAN STIGER UR KLARÄLVEN','Den luktar svagt av bryggkaffe.'],
  ['GATLJUSEN BLINKAR I TAKT','Morse? Nej. Bara elräkningen.'],
  ['NÅGON VISKAR DITT NAMN','Det var bara en duva. Förmodligen.'],
  ['TERMOSEN ÄR ISKALL','Kaffet inuti kokar fortfarande.'],
  ['SKUGGORNA PEKAR MOT TORGET','Midnatt närmar sig.']
];
export class CursedHunt{
  constructor(items,storage=null,streetAt=()=>''){
    this.cursed=pickCursed(items);this.ids=new Set(this.cursed.map(t=>t.id));this.storage=storage;this.streetAt=streetAt;
    this.found=new Set();this.load();
  }
  load(){try{const v=JSON.parse(this.storage?.getItem(HALLOWEEN_KEY)||'null');if(v?.version===1&&Array.isArray(v.found))for(const id of v.found)if(this.ids.has(id))this.found.add(id);}catch{}}
  save(){try{this.storage?.setItem(HALLOWEEN_KEY,JSON.stringify({version:1,found:[...this.found],unlocked:this.unlocked}));}catch{}}
  get total(){return this.cursed.length;}
  get count(){return this.found.size;}
  get unlocked(){return this.total>0&&this.count===this.total;}
  get meter(){return this.total?this.count/this.total:0;}
  pending(id){return this.ids.has(id)&&!this.found.has(id);}
  next(from){return this.cursed.filter(t=>!this.found.has(t.id)).sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-Math.hypot(b.x-from.x,b.z-from.z))[0]||null;}
  clue(from){
    const t=this.next(from);if(!t)return 'Alla tretton är funna. Gå till Torget vid midnatt.';
    const street=this.streetAt(t)||'';const d=Math.round(Math.hypot(t.x-from.x,t.z-from.z)/10)*10;
    if(d<15)return `Nästa: ${street?street+' · ':''}alldeles i närheten.`;
    return `Nästa: ${street?street+' · ':''}ca ${d} m åt ${bearing(from,t)}.`;
  }
  collect(id,at){
    if(!this.pending(id))return null;
    this.found.add(id);this.save();
    const [title,text]=this.unlocked?['MIDNATT PÅ TORGET','Alla 13 förbannade termosar är funna. Något vaknar under Stora Torget.']:OMENS[(this.count-1)%OMENS.length];
    return {count:this.count,total:this.total,unlocked:this.unlocked,title,text,clue:this.clue(at||this.cursed.find(t=>t.id===id))};
  }
}
