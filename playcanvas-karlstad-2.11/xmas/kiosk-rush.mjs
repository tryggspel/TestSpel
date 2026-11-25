// TOMTEKÖN på Pressbyrån (2.21.1-xmas.16): butiksutmaningen som ett riktigt arkadspel i stället för fyra beställningar i rad.
// Tomtar ställer sig i kö vid disken med en pratbubbla (beställningen). Man trycker på varorna på hyllan; ordningen inom en beställning spelar ingen roll.
// Varje tomte har ett tålamod som rinner ut (långsammare för dem som står längre bak i kön). Rätt beställning: poäng × kombo. Fel vara: tålamodet minskar
// och kombon nollas. Går tre tomtar sin väg är butiken stängd. Takten ökar under passet: fler varor per beställning, tätare kö och fler specialkunder:
//   glomsk  Glömske Gösta   bubblan syns bara en kort stund; tryck på den för att kika igen (kostar tålamod)
//   bratt   Bråttom-Britt   halva tålamodet, dubbla poängen
//   andrar  Tomtemor        ändrar sig efter första varan ("Äh, nej …"): en vara byts
//   patar   Påtårs-Per      vill ha samma sak två gånger
//   guld    Guldtomten      sällsynt, tre gånger poängen
// Hyllan flyttas om var femte serverade tomte. Ren modul: ingen DOM. Slumpen kommer utifrån (rand) så att testerna kan styra den.
export const KIOSK_ITEMS=Object.freeze([
  {id:'kaffe',name:'KAFFE',art:'kaffe'},{id:'lussebulle',name:'LUSSEBULLE',art:'lussebulle'},{id:'pepparkaka',name:'PEPPARKAKA',art:'pepparkaka'},
  {id:'tidning',name:'TIDNING',art:'tidning'},{id:'choklad',name:'CHOKLAD',art:'choklad'},{id:'glogg',name:'GLÖGG',art:'glogg'}
].map(o=>Object.freeze(o)));
export const KIOSK=Object.freeze({
  seconds:75,lives:3,maxQueue:4,shuffleEvery:5,
  gap:Object.freeze([2.6,1.05]),          // sekunder mellan nya tomtar i början och i slutet av passet
  items:Object.freeze([2,5]),            // varor per beställning i början och i slutet
  patience:Object.freeze({base:5.5,perItem:1.7,backFactor:.6}), // sekunder; de som står bakom i kön tappar tålamod långsammare
  wrongCost:2.2,peekCost:1.2,peekShow:1.1,glomskShow:2.4,
  points:Object.freeze({base:40,perItem:15,patience:45}),        // + upp till patience × kvarvarande andel
  combo:Object.freeze({step:.25,max:8,rush:5}),                   // multiplikator 1 + step × min(kombo, max); JULRUSH från rush
  special:Object.freeze({start:.12,end:.5}),                       // andel specialkunder i början och slutet
  stars:Object.freeze([12,21,30])                                   // serverade tomtar för en, två och tre stjärnor
});
export const CUSTOMERS=Object.freeze({
  vanlig:Object.freeze({name:'Tomte',patience:1,points:1}),
  glomsk:Object.freeze({name:'Glömske Gösta',patience:1.1,points:1.4,line:'Vad var det nu jag skulle ha …?'}),
  bratt:Object.freeze({name:'Bråttom-Britt',patience:.5,points:2,line:'Fort, fort! Släden står på tomgång!'}),
  andrar:Object.freeze({name:'Tomtemor',patience:1.15,points:1.5,line:'Äh, nej, jag tar hellre …'}),
  patar:Object.freeze({name:'Påtårs-Per',patience:1,points:1.3,line:'Två av samma, tack. Påtår är en livsstil.'}),
  guld:Object.freeze({name:'Guldtomten',patience:.9,points:3,line:'God jul! Det glittrar om fikat.'})
});
const SPECIALS=Object.freeze(['glomsk','bratt','andrar','patar','guld']);
const lerp=(a,b,t)=>a+(b-a)*Math.max(0,Math.min(1,t));
export const starsFor=served=>KIOSK.stars.filter(n=>served>=n).length;
export const comboMult=c=>1+KIOSK.combo.step*Math.min(Math.max(0,c),KIOSK.combo.max);

export function createKioskGame({rand=Math.random,cfg=KIOSK}={}){
  const g={t:0,left:cfg.seconds,score:0,served:0,lost:0,wrong:0,combo:0,bestCombo:0,lives:cfg.lives,queue:[],shelf:KIOSK_ITEMS.map(i=>i.id),
    nextAt:.6,serial:0,over:false,reason:'',events:[],shuffles:0};
  const pick=list=>list[Math.min(list.length-1,Math.floor(rand()*list.length))];
  const phase=()=>Math.min(1,g.t/cfg.seconds);
  const emit=e=>{g.events.push(e);};
  function makeCustomer(){
    const ph=phase(),special=rand()<lerp(cfg.special.start,cfg.special.end,ph);
    let kind=special?pick(SPECIALS):'vanlig';if(kind==='guld'&&rand()<.5)kind=pick(['glomsk','bratt','andrar','patar']); // guld är sällsynt
    const n=Math.round(lerp(cfg.items[0],cfg.items[1],ph+(rand()-.5)*.3));
    const ids=KIOSK_ITEMS.map(i=>i.id),order=[];
    if(kind==='patar'){const a=pick(ids);order.push(a,a);while(order.length<Math.max(2,n)){const b=pick(ids.filter(x=>x!==a));order.push(b);}}
    else{const pool=[...ids];while(order.length<Math.max(2,Math.min(n,5))&&pool.length){const k=Math.floor(rand()*pool.length);order.push(pool.splice(k,1)[0]);}}
    const C=CUSTOMERS[kind],patience=(cfg.patience.base+cfg.patience.perItem*order.length)*C.patience;
    return {id:++g.serial,kind,name:C.name,order,got:order.map(()=>false),patience,max:patience,changed:false,arrived:g.t,frontAt:null,peekUntil:0};
  }
  function front(){return g.queue[0]||null;}
  function leave(c,why){
    g.queue=g.queue.filter(x=>x!==c);
    if(why==='served')return;
    g.lost++;g.lives--;g.combo=0;emit({type:'walkout',id:c.id,kind:c.kind,lives:g.lives});
    if(g.lives<=0)end('stängt');
  }
  function end(reason){if(g.over)return;g.over=true;g.reason=reason;emit({type:'over',reason,score:g.score,served:g.served,stars:starsFor(g.served)});}
  function serve(c){
    const C=CUSTOMERS[c.kind],P=cfg.points;
    g.combo++;g.bestCombo=Math.max(g.bestCombo,g.combo);
    const raw=(P.base+P.perItem*c.order.length+P.patience*Math.max(0,c.patience/c.max))*C.points,pts=Math.round(raw*comboMult(g.combo-1));
    g.score+=pts;g.served++;leave(c,'served');
    emit({type:'served',id:c.id,kind:c.kind,points:pts,combo:g.combo,rush:g.combo>=cfg.combo.rush});
    if(g.served%cfg.shuffleEvery===0)shuffle();
  }
  function shuffle(){const s=g.shelf;for(let i=s.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[s[i],s[j]]=[s[j],s[i]];}g.shuffles++;emit({type:'shuffle'});}
  // Ett tryck på en vara på hyllan.
  function tap(itemId){
    const c=front();if(g.over||!c)return {ok:false,none:true};
    const i=c.order.findIndex((x,k)=>x===itemId&&!c.got[k]);
    if(i<0){c.patience=Math.max(0,c.patience-cfg.wrongCost);g.wrong++;g.combo=0;emit({type:'wrong',id:c.id,item:itemId});return {ok:false,wrong:true};}
    c.got[i]=true;emit({type:'item',id:c.id,item:itemId});
    // Tomtemor ändrar sig efter första varan: en vara som inte är tagen byts mot en annan som inte redan finns i beställningen
    if(c.kind==='andrar'&&!c.changed&&c.got.filter(Boolean).length===1){
      const open=c.order.map((x,k)=>k).filter(k=>!c.got[k]),k=open.length?pick(open):-1,other=KIOSK_ITEMS.map(x=>x.id).filter(x=>!c.order.includes(x));
      if(k>=0&&other.length){const from=c.order[k];c.order[k]=pick(other);c.changed=true;emit({type:'change',id:c.id,from,to:c.order[k]});}
    }
    if(c.got.every(Boolean)){serve(c);return {ok:true,done:true};}
    return {ok:true,done:false};
  }
  // Glömske Gösta: kika på bubblan igen (kostar tålamod).
  function peek(){const c=front();if(g.over||!c||c.kind!=='glomsk')return false;c.peekUntil=g.t+cfg.peekShow;c.patience=Math.max(0,c.patience-cfg.peekCost);emit({type:'peek',id:c.id});return true;}
  // Glömske Gösta visar beställningen glomskShow sekunder från att han når disken, och en kort stund efter varje kik.
  function visible(c){return !!c&&(c.kind!=='glomsk'||c.frontAt==null||g.t<c.frontAt+cfg.glomskShow||g.t<c.peekUntil);}
  function step(dt){
    if(g.over||!(dt>0))return;
    dt=Math.min(dt,.25);g.t+=dt;g.left=Math.max(0,cfg.seconds-g.t);
    if(g.t>=g.nextAt&&g.queue.length<cfg.maxQueue){const c=makeCustomer();g.queue.push(c);emit({type:'arrive',id:c.id,kind:c.kind});g.nextAt=g.t+lerp(cfg.gap[0],cfg.gap[1],phase())*(.8+rand()*.4);}
    else if(g.t>=g.nextAt)g.nextAt=g.t+.5;
    if(g.queue[0]&&g.queue[0].frontAt==null)g.queue[0].frontAt=g.t;
    for(let i=0;i<g.queue.length;i++){const c=g.queue[i];c.patience-=dt*(i===0?1:cfg.patience.backFactor);}
    for(const c of [...g.queue])if(c.patience<=0)leave(c,'walkout');
    if(!g.over&&g.left<=0)end('tiden');
  }
  const drain=()=>{const e=g.events;g.events=[];return e;};
  return {state:g,step,tap,peek,front,visible:c=>visible(c||front()),drain,stars:()=>starsFor(g.served),end:()=>end('avbrutet')};
}

// Sparningen: bästa poäng, flest serverade, stjärnor och antal pass (egen nyckel; påverkar inte framstegen).
export const KIOSK_KEY='karlstad-xmas:kiosk:1';
export const blankKiosk=()=>({v:1,best:0,served:0,stars:0,plays:0});
export function sanitizeKiosk(raw){
  const o=blankKiosk();if(!raw||typeof raw!=='object')return o;
  for(const k of ['best','served','plays']){const v=Math.floor(Number(raw[k]));if(Number.isFinite(v)&&v>=0&&v<1e7)o[k]=v;}
  const s=Math.floor(Number(raw.stars));if(s>=0&&s<=3)o.stars=s;return o;
}
export function recordKiosk(st,{score,served}){
  st.plays++;const rec=score>st.best;if(rec)st.best=score;st.served=Math.max(st.served,served);st.stars=Math.max(st.stars,starsFor(served));return rec;
}
