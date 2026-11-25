// Julklappsjakten: framstegen runt jakten. Varför man spelar en omgång till: XP och tomtegrad, en julgran som fylls med 24 prydnader, tre dagliga uppdrag med en julklapp som belöning, en serie dagar i rad,
// belöningar för Julkalenderns luckor, adventssöndagarna, gömda julklappar, hemliga paket (QR) och lotter till dragningen om en julgran. Ren modul: ingen DOM, ingen spelmotor, så att allt går att testa.
// Egen sparning (karlstad-xmas:meta:1), skild från julspelets (karlstad-xmas:save:1) som Julkalendern läser: den här modulen ändrar aldrig den och kalendern ändrar aldrig den här.
// Alla belöningar delas ut av den här modulen och bara en gång: en lucka, en söndag, en gömd julklapp eller en kod kan inte ge samma sak två gånger, hur man än laddar om eller rör klockan.
// Tiden är svensk kalenderdag (Europe/Stockholm). Spelet och kalendern räknar likadant (tests/xmas-meta.test.mjs jämför dem).
import {LEVELS,XP,ORNAMENTS,RARITIES,ORNAMENT_ODDS,ORNAMENT_POLICY,FIRST_ORNAMENT,MISSIONS,MISSION_TIERS,STREAK,CALENDAR,ADVENT,TICKETS,MAX_TICKETS,HIDDEN,QR_CODES,COUPONS} from './xmas-meta-config.mjs?v=2.21.1-xmas.16';
import {makeTicket,validTicket} from './xmas-ticket.mjs?v=2.21.1-xmas.16';
import {codeHash,pinHash,normalizeCode} from './xmas-hash.mjs?v=2.21.1-xmas.16';
import {HIDDEN_SPOTS,hintsShown} from './xmas-hidden.mjs?v=2.21.1-xmas.16';
import {sanitizePlatsjakt,PLATSJAKT,RECENT_KEEP} from './xmas-platsjakt.mjs?v=2.21.1-xmas.16';

export const META_KEY='karlstad-xmas:meta:1';
const ORN_BY_ID=new Map(ORNAMENTS.map(o=>[o.id,o]));
const MISSION_BY_ID=new Map(MISSIONS.map(m=>[m.id,m]));
const SPOT_IDS=new Set(HIDDEN_SPOTS.map(s=>s.id));
const TICKET_SOURCES=new Set(['welcome','meter','gift','grade','streak','calendar','advent','hidden','code','daily']);
const DAY=/^20\d{2}-\d{2}-\d{2}$/;
const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const num=(v,max=1e9,min=0)=>{const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.floor(n))):min;};
const dayOk=d=>typeof d==='string'&&DAY.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'));
const fnv=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

// ── Datum ────────────────────────────────────────────────────────────────────────────────────────────────────────
// Dagens datum i Karlstad (Europe/Stockholm), som julkalenderns stockholmDay. Faller tillbaka på UTC om webbläsaren saknar tidszonsstöd.
export function dayOf(date=new Date()){
  try{
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Stockholm',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
    const get=t=>parts.find(p=>p.type===t).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }catch{return date.toISOString().slice(0,10);}
}
export const dayDiff=(a,b)=>Math.round((Date.parse(b+'T12:00:00Z')-Date.parse(a+'T12:00:00Z'))/864e5);
export const doorDay=n=>`2026-12-${String(n).padStart(2,'0')}`;

// ── Grad ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export function levelFor(xp,levels=LEVELS){
  let i=0;for(let k=0;k<levels.length;k++)if(xp>=levels[k].xp)i=k;
  const cur=levels[i],next=levels[i+1]||null,into=xp-cur.xp,span=next?next.xp-cur.xp:0;
  return {n:cur.n,name:cur.name,xp:cur.xp,next:next?{n:next.n,name:next.name,xp:next.xp}:null,into,span,toNext:next?next.xp-xp:0,frac:next?Math.min(1,into/span):1};
}

// ── Sparning ─────────────────────────────────────────────────────────────────────────────────────────────────────
const blankDay=()=>({runs:0,clears:0,packages:0,bonus:0,chain:0,fast:0,areas:[],hidden:0,zombies:0,rush:0,termos:0,termosRuns:0,termosGoal:false,daily:false,ol:0,shop:0,meter:0,first:false,gift:false,done:{},pick:[]});
export const blankMeta=()=>({v:1,xp:0,lv:1,dry:0,orn:{},seen:{},tickets:[],meter:0,days:{},streak:{cur:0,best:0,last:'',freezes:0,got:{}},cal:{doors:{},advent:{}},hidden:{},qr:{},daily:{},guide:{},platsjakt:{best:{},won:{},recent:[]},coupons:[],draw:{sent:[],at:0},tried:{intro:false,zombies:false,rush:false,termos:false},welcomed:false,first:''});

function sanitizeDay(r){
  const d=blankDay();if(!isObj(r))return d;
  for(const k of ['runs','clears','packages','bonus','chain','hidden','zombies','rush','meter','termosRuns','ol','shop'])d[k]=num(r[k],9999);
  d.termos=num(r.termos,999999);d.termosGoal=!!r.termosGoal;d.daily=!!r.daily;
  d.fast=num(r.fast,99999);d.first=!!r.first;d.gift=!!r.gift;
  d.areas=Array.isArray(r.areas)?[...new Set(r.areas.filter(a=>typeof a==='string'&&/^[a-z0-9-]{1,30}$/.test(a)))].slice(0,12):[];
  if(isObj(r.done))for(const id of Object.keys(r.done))if(MISSION_BY_ID.has(id)&&r.done[id]===true)d.done[id]=true;
  d.pick=Array.isArray(r.pick)?r.pick.filter(id=>MISSION_BY_ID.has(id)).slice(0,3):[];
  return d;
}
export function sanitizeMeta(raw){
  const out=blankMeta();
  if(!isObj(raw)||raw.v!==1)return out;
  out.dry=num(raw.dry,99);out.xp=num(raw.xp,999999);out.lv=Math.max(1,Math.min(LEVELS.length,num(raw.lv,LEVELS.length,1)));
  if(isObj(raw.orn))for(const [id,c] of Object.entries(raw.orn))if(ORN_BY_ID.has(id)&&num(c,99)>0)out.orn[id]=num(c,99);
  if(isObj(raw.seen))for(const id of Object.keys(raw.seen))if(out.orn[id]&&raw.seen[id]===true)out.seen[id]=true;
  if(Array.isArray(raw.tickets)){
    const have=new Set();
    for(const t of raw.tickets){
      if(!isObj(t)||!validTicket(t.c)||have.has(t.c))continue;
      have.add(t.c);out.tickets.push({c:t.c,d:dayOk(t.d)?t.d:'',s:TICKET_SOURCES.has(t.s)?t.s:'meter'});
      if(out.tickets.length>=MAX_TICKETS)break;
    }
  }
  out.meter=num(raw.meter,TICKETS.meter-1);
  if(isObj(raw.days)){
    for(const day of Object.keys(raw.days).filter(dayOk).sort().slice(-45))out.days[day]=sanitizeDay(raw.days[day]);
  }
  const s=isObj(raw.streak)?raw.streak:{};
  out.streak={cur:num(s.cur,999),best:num(s.best,999),last:dayOk(s.last)?s.last:'',freezes:num(s.freezes,STREAK.maxFreezes),got:{}};
  out.streak.best=Math.max(out.streak.best,out.streak.cur);
  if(isObj(s.got))for(const m of STREAK.milestones)if(s.got[m.days]===true)out.streak.got[m.days]=true;
  const c=isObj(raw.cal)?raw.cal:{};
  if(isObj(c.doors))for(let n=1;n<=24;n++)if(c.doors[n]===true)out.cal.doors[n]=true;
  if(isObj(c.advent))for(const a of ADVENT)if(c.advent[a.id]===true)out.cal.advent[a.id]=true;
  if(isObj(raw.hidden))for(const [id,day] of Object.entries(raw.hidden))if(SPOT_IDS.has(id))out.hidden[id]=dayOk(day)?day:'';
  out.platsjakt=sanitizePlatsjakt(raw.platsjakt);
  if(isObj(raw.guide))for(const [id,day] of Object.entries(raw.guide).slice(0,60))if(/^[a-z0-9-]{1,30}$/.test(id))out.guide[id]=dayOk(day)?day:'';
  if(isObj(raw.daily))for(const day of Object.keys(raw.daily).filter(dayOk).sort().slice(-60))out.daily[day]=num(raw.daily[day],4102444800000);
  if(isObj(raw.qr))for(const [id,day] of Object.entries(raw.qr))if(/^[a-z0-9-]{1,40}$/.test(id))out.qr[id]=dayOk(day)?day:'';
  if(Array.isArray(raw.coupons)){
    for(const c2 of raw.coupons){
      if(!isObj(c2)||typeof c2.id!=='string'||!/^[a-z0-9-]{1,40}$/.test(c2.id)||out.coupons.some(x=>x.id===c2.id))continue;
      out.coupons.push({id:c2.id,at:num(c2.at,4102444800000),used:num(c2.used,4102444800000)});
    }
  }
  const dr=isObj(raw.draw)?raw.draw:{};
  out.draw={sent:Array.isArray(dr.sent)?[...new Set(dr.sent.filter(validTicket))].slice(0,MAX_TICKETS):[],at:num(dr.at,4102444800000)};
  const t=isObj(raw.tried)?raw.tried:{};
  out.tried={intro:!!t.intro,zombies:!!t.zombies,rush:!!t.rush,termos:!!t.termos};
  out.welcomed=!!raw.welcomed;out.first=dayOk(raw.first)?raw.first:'';
  return out;
}

// ── Klassen ──────────────────────────────────────────────────────────────────────────────────────────────────────
export class XmasMeta{
  // storage: som localStorage. rng: slump i [0,1). now: ger ett Date. hidden: finns gömda julklappar i bygget (uppdraget "hitta en gömd julklapp" väljs bara då).
  // qr och coupons: se xmas-meta-config.mjs (tomma tills det finns riktiga koder och erbjudanden).
  constructor({storage=null,rng=Math.random,now=()=>new Date(),hidden=true,qr=QR_CODES,coupons=COUPONS,policy=ORNAMENT_POLICY}={}){
    this.storage=storage;this.rng=rng;this.policy=policy;this.clock=now;this.hiddenOn=!!hidden;this.qr=qr;this.couponDefs=coupons;
    this.state=blankMeta();
    try{this.state=sanitizeMeta(JSON.parse(storage?.getItem(META_KEY)||'null'));}catch{}
  }
  save(){try{this.storage?.setItem(META_KEY,JSON.stringify(this.state));return true;}catch{return false;}}
  today(when=this.clock()){return dayOf(when);}

  // ── Det som visas ────────────────────────────────────────────────────────────────────────────────────────────
  get level(){return levelFor(this.state.xp);}
  get ticketCount(){return this.state.tickets.length;}
  ticketCodes(){return this.state.tickets.map(t=>t.c);}
  unsentTickets(){const sent=new Set(this.state.draw.sent);return this.state.tickets.map(t=>t.c).filter(c=>!sent.has(c));}
  markSent(codes,at=Date.now()){
    const have=new Set(this.state.tickets.map(t=>t.c)),sent=new Set(this.state.draw.sent);
    for(const c of codes)if(have.has(c))sent.add(c);
    this.state.draw={sent:[...sent],at:num(at,4102444800000)};this.save();
  }
  ornamentCount(){return Object.keys(this.state.orn).length;}
  newOrnaments(){return Object.keys(this.state.orn).filter(id=>!this.state.seen[id]);}
  markSeen(){for(const id of Object.keys(this.state.orn))this.state.seen[id]=true;this.save();}
  // Hela granen för vyn: alla 24 med antal, och om de är nya sedan senast granen visades.
  ornamentList(){return ORNAMENTS.map(o=>({...o,count:this.state.orn[o.id]||0,owned:!!this.state.orn[o.id],isNew:!!this.state.orn[o.id]&&!this.state.seen[o.id]}));}

  _day(day){
    const st=this.state;
    if(!st.first)st.first=day;
    if(!st.days[day]){
      st.days[day]=blankDay();
      const keys=Object.keys(st.days).sort();
      for(const k of keys.slice(0,Math.max(0,keys.length-45)))delete st.days[k];
    }
    return st.days[day];
  }
  _open(m){
    switch(m.needs){
      case 'tried-zombies':return !!this.state.tried.zombies;
      case 'tried-rush':return !!this.state.tried.rush;
      case 'hidden':return this.hiddenOn;
      default:return true;
    }
  }
  // Dagens tre uppdrag: ett lätt, ett medel och ett svårt, valda av datumet (alla får samma) bland sådant som är öppet. Valet sparas första gången det görs så att det inte ändras under dagen.
  _picks(day,d){
    if(d.pick.length)return d.pick;
    const prev=new Set();
    const before=Object.keys(this.state.days).filter(k=>k<day).sort();
    if(before.length)for(const id of this.state.days[before[before.length-1]].pick)prev.add(id);
    const out=[];
    for(const tier of MISSION_TIERS){
      const pool=MISSIONS.filter(m=>m.tier===tier&&this._open(m));
      if(!pool.length)continue;
      let i=fnv(day+':'+tier)%pool.length;
      if(pool.length>1&&prev.has(pool[i].id))i=(i+1)%pool.length; // inte samma uppdrag två dagar i rad
      out.push(pool[i].id);
    }
    d.pick=out;return out;
  }
  _progress(m,d){
    switch(m.kind){
      case 'runs':return d.runs;case 'packages':return d.packages;case 'bonus':return d.bonus;case 'chain':return d.chain;
      case 'fast':return d.fast>0&&d.fast<=m.target?1:0;
      case 'areas':return d.areas.length;case 'hidden':return d.hidden;case 'zombies':return d.zombies;case 'rush':return d.rush;
      case 'termosRuns':return d.termosRuns;case 'termos':return d.termos;case 'daily':return d.daily?1:0;
      default:return 0;
    }
  }
  _target(m){return m.kind==='fast'?1:m.target;}

  // Allt som hubben och slutkortet visar just nu.
  status(when=this.clock()){
    const day=dayOf(when),st=this.state,d=this._day(day),L=this.level;
    const ids=st.tried.intro||st.tried.termos?this._picks(day,d):[]; // dagens uppdrag börjar efter första uppdraget eller första rundan i Termosjakten (huvudspåret)
    const missions=ids.map(id=>{
      const m=MISSION_BY_ID.get(id),have=this._progress(m,d),target=this._target(m);
      return {id,tier:m.tier,text:m.text,have:Math.min(have,target),target,done:!!d.done[id],xp:XP.mission[m.tier]||0,detail:m.kind==='fast'&&d.fast?d.fast:0};
    });
    const s=st.streak,counted=s.last===day,alive=!!s.last&&(counted||dayDiff(s.last,day)<=1+s.freezes);
    const cap=TICKETS.dailyCap,capped=d.meter>=cap&&st.meter>=TICKETS.meter-1;
    const advent=ADVENT.find(a=>a.date===day)||null;
    const shown=hintsShown(st.first||day,day,HIDDEN);
    const found=Object.keys(st.hidden).length;
    return {
      day,xp:st.xp,level:L,
      missions,missionsDone:missions.filter(m=>m.done).length,gift:{ready:missions.length>0&&missions.every(m=>m.done),opened:d.gift},
      streak:{cur:alive?s.cur:0,best:s.best,freezes:s.freezes,counted,atRisk:!!s.last&&!counted&&alive&&s.cur>0},
      meter:{have:st.meter,target:TICKETS.meter,left:TICKETS.meter-st.meter,capped,today:d.meter,cap},
      tickets:st.tickets.length,
      ornaments:{owned:this.ornamentCount(),total:ORNAMENTS.length,fresh:this.newOrnaments().length},
      hidden:{enabled:this.hiddenOn,found,total:HIDDEN_SPOTS.length,shown,hints:HIDDEN_SPOTS.map((s2,i)=>({id:s2.id,name:s2.name,clue:s2.clue,found:!!st.hidden[s2.id],visible:i<shown||!!st.hidden[s2.id]}))},
      advent:advent?{id:advent.id,label:advent.label,tickets:advent.tickets,claimed:!!st.cal.advent[advent.id]}:null,
      coupons:this.couponList(when),
      welcomed:st.welcomed,introDone:st.tried.intro
    };
  }
  // En rad om det närmaste målet: det som är närmast att nås först (en lott, en grad, ett uppdrag).
  // tickets:false = priset är avstängt (PRIZE.enabled): lotter nämns inte.
  nextGoal(when=this.clock(),{tickets=true}={}){
    const s=this.status(when);
    if(tickets&&!s.meter.capped&&s.meter.left<=25)return {kind:'ticket',text:s.meter.left+(s.meter.left===1?' julklapp':' julklappar')+' till nästa lott'};
    if(s.level.next&&s.level.toNext<=60)return {kind:'grade',text:s.level.toNext+' XP till grad '+s.level.next.n+' · '+s.level.next.name};
    const open=s.missions.find(m=>!m.done);
    if(open)return {kind:'mission',text:'Dagens uppdrag: '+open.text.toLowerCase()};
    if(tickets&&s.meter.capped)return {kind:'tomorrow',text:'Dagens lotter från mätaren är slut. Nya uppdrag i morgon.'};
    if(s.level.next)return {kind:'grade',text:s.level.toNext+' XP till grad '+s.level.next.n+' · '+s.level.next.name};
    return tickets?{kind:'ticket',text:s.meter.left+' julklappar till nästa lott'}:{kind:'tomorrow',text:'Du har nått högsta graden. Spela vidare och fyll granen!'};
  }

  // ── Belöningar ───────────────────────────────────────────────────────────────────────────────────────────────
  _reward(){return {xp:0,parts:[],before:this.level.n,after:this.level.n,levelUps:[],ornaments:[],tickets:[],missions:[],gift:null,streak:null,calendar:[],advent:null,coupons:[],code:null,meter:null,welcome:false,hidden:null,daily:null,termosGoal:false,notable:false};}
  _xp(R,amount,label){
    amount=Math.floor(amount);if(!(amount>0))return;
    this.state.xp=Math.min(999999,this.state.xp+amount);R.xp+=amount;R.parts.push({label,xp:amount});
  }
  // Slumpar en prydnad: sällsyntheten ur oddsen (men inte under min). Inom sällsyntheten väger något man saknar policy.bias gånger mer än något man har. Efter policy.pity dubbletter i rad ges alltid något
  // man saknar (först i samma sällsynthet, annars den närmaste), om det finns något.
  _draw(odds,min='common'){
    const table=ORNAMENT_ODDS[odds]||ORNAMENT_ODDS.normal,lo=Math.max(0,RARITIES.indexOf(min)),{bias,pity}=this.policy;
    const w=RARITIES.map((r,i)=>i>=lo?(table[r]||0):0);let total=w.reduce((a,b)=>a+b,0);
    if(total<=0){w[lo]=1;total=1;}
    const x=this.rng()*total;let acc=0,pick=lo;
    for(let i=0;i<w.length;i++){if(w[i]<=0)continue;acc+=w[i];pick=i;if(x<acc)break;}
    const pool=i=>ORNAMENTS.filter(o=>o.rarity===RARITIES[i]),fresh=i=>pool(i).filter(o=>!this.state.orn[o.id]);
    if(this.state.dry>=pity){
      // Den legendariska prydnaden (Tomtens stjärna) delas aldrig ut av det här skyddet: den kommer av en grad, en lucka, ett hemligt paket eller en riktig tur.
      const top=lo===RARITIES.length-1?RARITIES.length-1:RARITIES.length-2;
      let list=fresh(Math.min(pick,top));
      for(let step=1;step<RARITIES.length&&!list.length;step++){
        for(const j of [Math.min(pick,top)+step,Math.min(pick,top)-step]){if(j>=lo&&j<=top){const l=fresh(j);if(l.length){list=l;break;}}}
      }
      if(list.length)return list[Math.min(list.length-1,Math.floor(this.rng()*list.length))];
    }
    const items=pool(pick),weights=items.map(o=>this.state.orn[o.id]?1:bias),sum=weights.reduce((a,b)=>a+b,0);
    let r=this.rng()*sum;for(let i=0;i<items.length;i++){r-=weights[i];if(r<0)return items[i];}
    return items[items.length-1];
  }
  _ornament(R,{odds='normal',min='common',id=null,label=''}={}){
    const o=id&&ORN_BY_ID.has(id)?ORN_BY_ID.get(id):this._draw(odds,min),st=this.state,had=st.orn[o.id]||0;
    st.orn[o.id]=Math.min(99,had+1);
    if(!had){delete st.seen[o.id];st.dry=0;}else st.dry=Math.min(99,st.dry+1);
    const rec={id:o.id,name:o.name,rarity:o.rarity,color:o.color,shape:o.shape,isNew:!had,dupe:!!had,label};
    R.ornaments.push(rec);R.notable=true;
    if(had)this._xp(R,XP.dupe,'Dubblett: '+o.name);
    return rec;
  }
  _ticket(R,src,day){
    const st=this.state;if(st.tickets.length>=MAX_TICKETS)return null;
    const have=new Set(st.tickets.map(t=>t.c));let code='',tries=0;
    do{code=makeTicket(this.rng);}while(have.has(code)&&++tries<30);
    if(have.has(code))return null;
    st.tickets.push({c:code,d:day,s:src});R.tickets.push({code,src});R.notable=true;return code;
  }
  // Allt en belöning kan innehålla: {xp, orn (lägsta sällsynthet), tickets, coupon}.
  _give(R,spec,{day,label,odds='normal'}){
    if(spec.xp)this._xp(R,spec.xp,label);
    if(spec.orn)this._ornament(R,ORN_BY_ID.has(spec.orn)?{id:spec.orn,label}:{odds,min:spec.orn,label}); // orn = en sällsynthet, eller en bestämd prydnad (t.ex. en sponsrad)
    for(let i=0;i<(spec.tickets||0);i++)this._ticket(R,spec.src||'calendar',day);
    if(spec.coupon)this._coupon(R,spec.coupon,day);
  }
  _levels(R,day){
    for(let guard=0;guard<14;guard++){
      const L=levelFor(this.state.xp);
      if(L.n<=this.state.lv)break;
      const next=LEVELS[this.state.lv]; // graden efter den som redan belönats
      this.state.lv=next.n;R.levelUps.push({n:next.n,name:next.name,orn:next.orn||null,tickets:next.tickets||0});R.notable=true;
      if(next.orn)this._ornament(R,{odds:'normal',min:next.orn,label:'Grad '+next.n});
      for(let i=0;i<(next.tickets||0);i++)this._ticket(R,'grade',day);
    }
  }
  _meter(R,day,d,n){
    if(!(n>0))return;
    let m=this.state.meter+n;
    while(m>=TICKETS.meter){
      if(d.meter>=TICKETS.dailyCap){m=TICKETS.meter-1;break;} // dagens tak: mätaren väntar full till i morgon
      m-=TICKETS.meter;d.meter++;this._ticket(R,'meter',day);
    }
    this.state.meter=m;
    R.meter={have:m,target:TICKETS.meter,left:TICKETS.meter-m,added:n,capped:d.meter>=TICKETS.dailyCap&&m>=TICKETS.meter-1,today:d.meter,cap:TICKETS.dailyCap};
  }
  _missions(R,day,d){
    if(!this.state.tried.intro&&!this.state.tried.termos)return;
    const ids=this._picks(day,d);
    for(const id of ids){
      const m=MISSION_BY_ID.get(id);if(!m||d.done[id])continue;
      if(this._progress(m,d)>=this._target(m)){
        d.done[id]=true;const xp=XP.mission[m.tier]||0;this._xp(R,xp,'Uppdrag: '+m.text);R.missions.push({id,text:m.text,tier:m.tier,xp});R.notable=true;
      }
    }
    if(!d.gift&&ids.length&&ids.every(id=>d.done[id])){
      d.gift=true;
      const orn=this._ornament(R,{odds:'dailyGift',label:'Dagens julklapp'}),ticket=TICKETS.missionDay>0?this._ticket(R,'gift',day):null;
      for(let i=1;i<TICKETS.missionDay;i++)this._ticket(R,'gift',day);
      R.gift={ornament:orn,ticket};
    }
  }
  _streak(R,day){
    const s=this.state.streak;if(s.last===day)return;
    let status='start';
    if(s.last){
      const gap=dayDiff(s.last,day);
      if(gap<=0)return; // klockan har gått bakåt: serien rörs inte
      if(gap===1){s.cur++;status='up';}
      else if(s.freezes>=gap-1){s.freezes-=gap-1;s.cur++;status='froze';}
      else{s.cur=1;status='reset';}
    }else s.cur=1;
    s.last=day;s.best=Math.max(s.best,s.cur);
    let earned=false;
    if(status!=='reset'&&s.cur%STREAK.freezeEvery===0&&s.freezes<STREAK.maxFreezes){s.freezes++;earned=true;}
    const mile=[];
    for(const m of STREAK.milestones){
      if(s.cur>=m.days&&!s.got[m.days]){s.got[m.days]=true;mile.push(m.days);this._give(R,{...m,src:'streak'},{day,label:'Serie '+m.days+' dagar'});}
    }
    R.streak={cur:s.cur,status,freezeEarned:earned,freezes:s.freezes,milestones:mile};R.notable=true;
  }
  _advent(R,day){
    const a=ADVENT.find(x=>x.date===day);if(!a||this.state.cal.advent[a.id])return;
    this.state.cal.advent[a.id]=true;
    for(let i=0;i<a.tickets;i++)this._ticket(R,'advent',day);
    R.advent={id:a.id,label:a.label,tickets:a.tickets};R.notable=true;
  }
  _finish(R,day){
    this._levels(R,day);R.after=this.level.n;this.save();return R;
  }

  // ── Händelser från spelet ──────────────────────────────────────────────────────────────────────────────────────
  // run: {kind: hunt|zombies|rush|place|sandgrund, id, cleared, packages, bonus, chain, seconds, area, first, level, stars, countPackages}. Returnerar belöningen (R) som slutkortet visar.
  //   hunt: introduktionen, rundorna och Mariebergsskogen (alltid klarade när de rapporteras). area säger vilken plats (torget, kungsgatan, drottninggatan, marieberg).
  //   zombies: level = nivån. cleared:false = tagen (paketen räknas då inte: countPackages:false). rush: level = rushens nummer (0 = Maraton), stars = stjärnor, tempo i level för Maraton via run.tempo.
  //   place: butiksuppdrag och leverans (first = ny julstämpel). sandgrund: Julvernissagen (first = ny julstämpel).
  onRun(run,when=this.clock()){
    const day=dayOf(when),st=this.state,d=this._day(day),R=this._reward(),kind=run.kind;
    const maraton=kind==='rush'&&!(run.level>0),termos=kind==='termos';
    let cleared=!!run.cleared;
    const pk=run.countPackages===false?0:num(run.packages,999),bn=run.countPackages===false?0:num(run.bonus,999);
    if(maraton)cleared=pk+bn>=XP.marathonMin;
    if(termos){
      // Termosjakten (huvudspåret): termosarna räknas som julklappar i dagens uppdrag, och dagsmålet (xmas-termos.mjs) ger en belöning en gång per dag.
      cleared=pk+bn>=XP.termosMin;if(pk+bn>0)st.tried.termos=true;
      if(pk+bn>0){d.termosRuns=Math.min(9999,d.termosRuns+1);d.termos=Math.min(999999,d.termos+pk+bn);}
      if(run.goalNow&&!d.termosGoal){d.termosGoal=true;this._xp(R,XP.termosGoal,'Dagens termosmål');this._ornament(R,{odds:'dailyGift',label:'Dagens termosmål'});R.termosGoal=true;R.notable=true;}
    }
    if(kind==='zombies')st.tried.zombies=true;
    if(kind==='rush')st.tried.rush=true;
    const isIntro=kind==='hunt'&&run.id==='intro';
    // Första uppdraget är en genomgång: det ger XP, röd kula, första lotten, serie och mätare, men räknas inte mot dagens uppdrag (slutkortet ska inte svämma över och uppdragen börjar på noll).
    const tutorial=cleared&&isIntro&&!st.welcomed;
    if(cleared&&isIntro)st.tried.intro=true;
    if(cleared&&kind==='hunt')st.tried.intro=true; // en jakt kan inte klaras utan att första uppdraget är gjort (sparningen kan ha rensats)
    // räknare
    if(pk+bn>0&&!tutorial){d.packages=Math.min(9999,d.packages+pk+bn);d.bonus=Math.min(9999,d.bonus+bn);}
    if(!tutorial)d.chain=Math.max(d.chain,num(run.chain,99));
    if(cleared){
      d.clears++;
      if(kind==='hunt'&&!tutorial){
        d.runs++;
        const sec=num(run.seconds,99999);if(sec>0)d.fast=d.fast?Math.min(d.fast,sec):sec;
        const area=typeof run.area==='string'&&/^[a-z0-9-]{1,30}$/.test(run.area)?run.area:'';if(area&&!d.areas.includes(area))d.areas.push(area);
      }
      if(kind==='zombies')d.zombies++;
      if(kind==='rush'&&!maraton)d.rush++;
    }
    // XP
    if(cleared){
      const stars=num(run.stars,3);
      if(kind==='hunt'){this._xp(R,pk*XP.perPackage,'Julklappar');this._xp(R,bn*XP.perBonus,'Bonuspaket');this._xp(R,XP.complete,'Klarad jakt');}
      else if(kind==='zombies'){this._xp(R,XP.zombieLevel,'Tomtezombies nivå '+num(run.level,99));this._xp(R,pk*XP.perPackage,'Julklappar');this._xp(R,bn*XP.perBonus,'Bonuspaket');}
      else if(kind==='rush'&&!maraton){this._xp(R,XP.rushClear,'Rush '+num(run.level,99)+' klar');this._xp(R,stars*XP.rushStar,'Stjärnor');this._xp(R,(pk+bn)*XP.perPackage,'Paket');}
      else if(maraton){this._xp(R,(pk+bn)*XP.perPackage,'Paket');this._xp(R,num(run.tempo,99)*XP.marathonPerTempo,'Tempo');}
      else if(termos){this._xp(R,(pk+bn)*XP.perPackage,'Termosar');this._xp(R,num(run.tempo,99)*XP.marathonPerTempo,'Tempo');}
      else if(kind==='place')this._xp(R,run.first?XP.place.first:XP.place.repeat,run.first?'Ny julstämpel':'Uppdrag klart');
      else if(kind==='sandgrund')this._xp(R,run.first?XP.sandgrund.first:XP.sandgrund.repeat,run.first?'Ny julstämpel':'Uppdrag klart');
    }else{
      this._xp(R,Math.min(XP.failedMax,pk+bn)*XP.failedPerPackage,'För mödan');
    }
    if(cleared){
      if(!d.first){d.first=true;this._xp(R,XP.firstOfDay,'Dagens första');}
      // belöningar för en klarad körning
      const draws=kind==='hunt'||kind==='zombies'||kind==='rush'||kind==='termos'||((kind==='place'||kind==='sandgrund')&&run.first);
      if(isIntro&&!st.welcomed){
        st.welcomed=true;R.welcome=true;
        this._ornament(R,{id:st.orn[FIRST_ORNAMENT]?null:FIRST_ORNAMENT,label:'Första uppdraget'});
        for(let i=0;i<TICKETS.welcome;i++)this._ticket(R,'welcome',day);
      }else if(draws)this._ornament(R,{odds:'normal',label:'Klarad'});
      this._streak(R,day);
      this._advent(R,day);
    }
    this._meter(R,day,d,pk+bn);
    if(!tutorial)this._missions(R,day,d);
    return this._finish(R,day);
  }
  // En julklapp i fri julvandring (som inte har något slutkort): XP, mätare och uppdrag räknas direkt. pick: {kind:'regular'|'bonus', chain}.
  onPick(pick,when=this.clock()){
    const day=dayOf(when),d=this._day(day),R=this._reward(),bonus=pick?.kind==='bonus';
    d.packages=Math.min(9999,d.packages+1);if(bonus)d.bonus=Math.min(9999,d.bonus+1);
    d.chain=Math.max(d.chain,num(pick?.chain,99));
    this._xp(R,bonus?XP.free.perBonus:XP.free.perPackage,bonus?'Bonuspaket':'Julklapp');
    this._meter(R,day,d,1);
    this._missions(R,day,d);
    return this._finish(R,day);
  }
  // En gömd julklapp hittad (spot = id i xmas-hidden.mjs). Returnerar null om den redan är hittad eller inte finns.
  onHidden(spot,when=this.clock()){
    const st=this.state;if(!SPOT_IDS.has(spot)||Object.prototype.hasOwnProperty.call(st.hidden,spot))return null;
    const day=dayOf(when),d=this._day(day),R=this._reward();
    st.hidden[spot]=day;d.hidden++;
    this._xp(R,XP.hidden,'Gömd julklapp');
    this._ornament(R,{odds:'hidden',label:'Gömd julklapp'});
    const n=Object.keys(st.hidden).length;
    if(n%TICKETS.hiddenEvery===0)this._ticket(R,'hidden',day);
    R.hidden={spot,count:n,total:HIDDEN_SPOTS.length};R.notable=true;
    this._missions(R,day,d);
    return this._finish(R,day);
  }
  // Dagens julklapp hittad (xmas-daily.mjs). spec: {xp, orn, tickets, coupon} för dagen (DAILY_HUNTS i xmas-daily-config.mjs). En gång per dag; null om dagens redan är hittad.
  onDaily(spec={},when=this.clock()){
    const day=dayOf(when),st=this.state;if(Object.prototype.hasOwnProperty.call(st.daily,day))return null;
    const d=this._day(day),R=this._reward();
    st.daily[day]=Date.now();d.daily=true;
    this._give(R,{xp:spec.xp??XP.daily,orn:spec.orn||'rare',tickets:spec.tickets||0,coupon:spec.coupon,src:'daily'},{day,label:'Dagens julklapp',odds:'dailyGift'});
    const found=Object.keys(st.daily).length;R.daily={day,found};R.notable=true;
    this._streak(R,day); // dagens julklapp räknas som en klarad dag i serien
    this._missions(R,day,d);
    return this._finish(R,day);
  }
  // Julguiden (xmas-julguide-data.mjs): första gången man öppnar kortet för ett ställe. null om det redan är läst.
  onGuide(id,when=this.clock()){
    const st=this.state;if(typeof id!=='string'||!/^[a-z0-9-]{1,30}$/.test(id)||Object.prototype.hasOwnProperty.call(st.guide,id))return null;
    const day=dayOf(when),R=this._reward();st.guide[id]=day;this._xp(R,XP.guide,'Julguiden');
    return this._finish(R,day);
  }
  // Platsjakten (xmas-platsjakt.mjs): platsen hittad på seconds sekunder. Bästa tiden sparas alltid; belöningen (reward: {xp, orn, coupon, tickets}) en gång per plats och dag,
  // högst PLATSJAKT.rewardsPerDay platser om dagen.
  onPlatsjakt(place,seconds,reward={},when=this.clock()){
    const st=this.state,P=st.platsjakt,day=dayOf(when),sec=Math.round(Math.max(0,Number(seconds)||0)*10)/10;
    if(typeof place!=='string'||!/^[a-z0-9-]{1,30}$/.test(place))return {R:null,best:false,left:0};
    const prev=P.best[place],best=!(prev>0)||sec<prev;if(best)P.best[place]=sec;
    const won=P.won[day]||[];let R=null;
    if(!won.includes(place)&&won.length<PLATSJAKT.rewardsPerDay){
      P.won[day]=[...won,place];const d=this._day(day);R=this._reward();
      this._give(R,{xp:reward.xp??XP.platsjakt,orn:reward.orn||'rare',tickets:reward.tickets||0,coupon:reward.coupon,src:'daily'},{day,label:'Platsjakten',odds:'dailyGift'});
      R.notable=true;this._missions(R,day,d);R=this._finish(R,day);
    }else this.save();
    return {R,best,left:Math.max(0,PLATSJAKT.rewardsPerDay-(P.won[day]||[]).length),already:won.includes(place)};
  }
  // En jakt har börjat på place: den kommer inte tillbaka som ny plats förrän RECENT_KEEP andra har varit.
  notePlatsjakt(place){const P=this.state.platsjakt;if(typeof place!=='string')return;P.recent=[...P.recent.filter(x=>x!==place),place].slice(-RECENT_KEEP);this.save();}
  platsjaktWon(when=this.clock()){return (this.state.platsjakt.won[dayOf(when)]||[]).length;}
  // O'Learys (olearys-games.js): en avslutad aktivitet eller femkamp. Högst XP.activityDay belöningar om dagen. null när dagens tak är nått.
  onActivity({id='',points=0,penta=false}={},when=this.clock()){
    const day=dayOf(when),d=this._day(day);if(d.ol>=XP.activityDay)return null;
    const R=this._reward();d.ol++;
    this._xp(R,penta?Math.min(XP.pentaMax,Math.round(num(points,500)/10)):XP.activity,penta?'Femkampen':"O'Learys");
    return this._finish(R,day);
  }
  // Butiksspelen (2.21.1-xmas.16): Tomtekön på Pressbyrån och Duka julbordet på Cervera. XP.shopStar per stjärna, högst XP.shopDay belönade omgångar om dagen (alla butiksspel tillsammans).
  onShopGame({id='',stars=0}={},when=this.clock()){
    const st=Math.max(0,Math.min(3,Math.floor(Number(stars)||0)));if(!st||!/^[a-z0-9-]{1,30}$/.test(String(id)))return null;
    const day=dayOf(when),d=this._day(day);if(d.shop>=XP.shopDay)return null;
    const R=this._reward();d.shop++;this._xp(R,XP.shopStar*st,id==='julbordet'?'Duka julbordet':'Tomtekön');
    return this._finish(R,day);
  }
  dailyFound(when=this.clock()){return Object.prototype.hasOwnProperty.call(this.state.daily,dayOf(when));}
  dailyCount(){return Object.keys(this.state.daily).length;}
  // Julkalenderns luckor: isDone(n) säger om kalendern räknar lucka n som klar (öppen sin dag och uppdraget uppfyllt). Varje lucka ger sin belöning en gång.
  syncCalendar(isDone,when=this.clock()){
    const day=dayOf(when),st=this.state,R=this._reward();let any=false;
    for(let n=1;n<=24;n++){
      if(st.cal.doors[n]||doorDay(n)>day)continue;
      let done=false;try{done=!!isDone(n);}catch{}
      if(!done)continue;
      st.cal.doors[n]=true;any=true;
      const spec=CALENDAR[n-1]||{},before={orn:R.ornaments.length,tickets:R.tickets.length,xp:R.xp};
      this._give(R,{...spec,src:'calendar'},{day,label:'Lucka '+n});
      R.calendar.push({n,xp:R.xp-before.xp,ornaments:R.ornaments.slice(before.orn),tickets:R.tickets.slice(before.tickets)});R.notable=true;
    }
    if(!any)return null;
    return this._finish(R,day);
  }
  // Migrering: den som klarat första uppdraget i en version före framstegen får sin första lott och röda kula (inget retroaktivt XP).
  adopt({introDone=false,zombies=0,rush=0}={},when=this.clock()){
    const st=this.state,day=dayOf(when),R=this._reward();let changed=false;
    if(introDone&&!st.tried.intro){st.tried.intro=true;changed=true;}
    if(zombies>0&&!st.tried.zombies){st.tried.zombies=true;changed=true;}
    if(rush>0&&!st.tried.rush){st.tried.rush=true;changed=true;}
    if(introDone&&!st.welcomed){
      st.welcomed=true;R.welcome=true;changed=true;this._day(day);
      if(!st.orn[FIRST_ORNAMENT])this._ornament(R,{id:FIRST_ORNAMENT,label:'Första uppdraget'});
      for(let i=0;i<TICKETS.welcome;i++)this._ticket(R,'welcome',day);
    }
    if(!changed)return null;
    return this._finish(R,day);
  }

  // ── Hemliga paket (QR) ─────────────────────────────────────────────────────────────────────────────────────────
  // Resultat: {ok:true, id, label, reward:R} | {ok:false, reason:'tom'|'okand'|'anvand'}. En kod går bara att lösa in en gång per enhet.
  redeemCode(raw,when=this.clock()){
    const code=normalizeCode(raw);if(!code)return {ok:false,reason:'tom'};
    const h=codeHash(code),def=this.qr.find(q=>q&&q.h===h);
    if(!def)return {ok:false,reason:'okand'};
    if(Object.prototype.hasOwnProperty.call(this.state.qr,def.id))return {ok:false,reason:'anvand',id:def.id,label:def.label||''};
    const day=dayOf(when),R=this._reward();this._day(day);
    this.state.qr[def.id]=day;
    const spec=def.reward||{};
    this._give(R,{xp:spec.xp??XP.code,orn:spec.orn||'rare',tickets:spec.tickets||0,coupon:spec.coupon,src:'code'},{day,label:def.label||'Hemligt paket',odds:'code'});
    R.code={id:def.id,label:def.label||''};R.notable=true;
    this._finish(R,day);
    return {ok:true,id:def.id,label:def.label||'',reward:R};
  }

  // ── Kuponger ─────────────────────────────────────────────────────────────────────────────────────────────────
  // Ett erbjudande finns i COUPONS (tom tills det finns riktiga). Kupongen ägs av spelaren när den delats ut och löses in med personalens PIN (kontrollsumma i bygget).
  _coupon(R,id,day){
    const def=this.couponDefs.find(c=>c&&c.id===id);
    if(!def||this.state.coupons.some(c=>c.id===id))return false;
    this.state.coupons.push({id,at:Date.now(),used:0});R.coupons.push({id,title:def.title||''});R.notable=true;return true;
  }
  couponList(when=this.clock()){
    const day=dayOf(when);
    return this.state.coupons.map(c=>{
      const def=this.couponDefs.find(x=>x&&x.id===c.id);if(!def)return null;
      const expired=!!def.validTo&&day>def.validTo;
      return {id:c.id,title:def.title||'',partner:def.partner||'',text:def.text||'',terms:def.terms||'',validTo:def.validTo||'',used:c.used>0,usedAt:c.used,status:c.used>0?'used':expired?'expired':'valid'};
    }).filter(Boolean);
  }
  // Personalen anger PIN i spelarens telefon. Resultat: {ok:true} | {ok:false, reason:'okand'|'anvand'|'utgangen'|'pin'}.
  redeemCoupon(id,pin,when=this.clock()){
    const c=this.state.coupons.find(x=>x.id===id),def=this.couponDefs.find(x=>x&&x.id===id);
    if(!c||!def)return {ok:false,reason:'okand'};
    if(c.used>0)return {ok:false,reason:'anvand'};
    if(def.validTo&&dayOf(when)>def.validTo)return {ok:false,reason:'utgangen'};
    if(!def.pin||pinHash(id,pin)!==def.pin)return {ok:false,reason:'pin'};
    c.used=when.getTime();this.save();return {ok:true};
  }
  grantCoupon(id){const R=this._reward(),ok=this._coupon(R,id,this.today());if(ok)this.save();return ok;}

  reset(){this.state=blankMeta();this.save();}
}
