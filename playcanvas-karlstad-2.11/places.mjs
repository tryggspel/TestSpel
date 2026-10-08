// 2.21: interaktiva platser och Karlstadpasset. En enda datamodell för butiker och besöksmål som kan bli betalda lokala samarbeten.
// Allt som skiljer en plats från en annan står här som data: namn, plats, entré, personal, uppdragstyp, föremål, belöning, stämpel,
// godkänt erbjudande och status. Uppdragsmotorn (place-quests.mjs) och vyerna läser bara det här. Nästa plats = ett nytt objekt i PLACES.
// Ren modul utan DOM och utan PlayCanvas, så att spelet, testerna och verktygen delar samma källa.
import {MALL_ROOMS} from './mall-space.mjs?v=2.21.0';

export const PLACES_VERSION=1;
// active  = samarbete bekräftat och godkänt innehåll (inget sådant finns än).
// demo    = fungerande demonstration utan bekräftat samarbete. Märks "DEMO" för spelaren.
// future  = planerat innehåll. Visas aldrig för spelaren och har ingen interiör.
export const STATUS=Object.freeze({active:'active',demo:'demo',future:'future'});
export const PLAYABLE=Object.freeze(['active','demo']);

// Uppdragstyper. implemented=true betyder att motorn kan köra dem med enbart data. De andra är förberedda men visas inte.
export const ACTIVITY_TYPES=Object.freeze({
  fetch:{implemented:true,label:'Hitta och lämna',requires:['items','deliver'],note:'Hitta föremål och lämna dem vid disken. ordered:true gör det till en ledtrådskedja.'},
  order:{implemented:true,label:'Beställning i rätt ordning',requires:['menu','orders','seconds'],note:'Välj rätt föremål i rätt ordning på tid.'},
  hunt:{implemented:false,label:'Gemensam jakt',requires:['stops'],note:'En jakt genom flera deltagande platser. Kräver ny kod för kedjan mellan platserna.'}
});

// Kontrollerade lokala källor till fraser så att texten står på ett ställe (och går att granska av verksamheten).
export const PASS_TEXT=Object.freeze({
  title:'KARLSTADPASSET',
  intro:'Gör ett uppdrag hos en plats i Clean City Explore och få en stämpel. Stämplarna sparas på den här enheten.',
  demoTag:'DEMO',
  demoNote:'Demonstration. Inget samarbete eller avtal är bekräftat.',
  offerSlot:'Här visar verksamheten ett eget, godkänt erbjudande eller en länk. Exempelplats, inget verkligt erbjudande.',
  visitWord:'digitala besök'
});

const cervera=MALL_ROOMS.find(r=>r.id==='cervera');
const counterMid=c=>({x:(c.minx+c.maxx)/2,z:(c.minz+c.maxz)/2});
const rad=yaw=>yaw*Math.PI/180;
const cervTalk=(()=>{const m=counterMid(cervera.counter),a=rad(cervera.door.yaw);return {x:+(m.x+Math.sin(a)*2.4).toFixed(2),z:+(m.z+Math.cos(a)*2.4).toFixed(2)};})();

export const PLACES=Object.freeze([
  {
    id:'cervera',name:'Cervera',venue:'Mitt i City',kind:'shop',status:'demo',
    partner:{confirmed:false,note:PASS_TEXT.demoNote},
    where:{area:'mitticity',floor:0,roomId:'cervera',...counterMid(cervera.counter)},
    entrance:{x:cervera.door.x,z:cervera.door.z,yaw:cervera.door.yaw,floor:0,label:'CERVERA · ENTRÉ'},
    staff:{id:'rut',clerk:'cervera',name:'Rut i returen',x:cervera.clerk.x,z:cervera.clerk.z,floor:0,title:'PERSONAL'},
    talk:{...cervTalk,radius:3,floor:0,label:'STÅ HÄR · PRATA MED RUT'},
    visit:{kind:'room',roomId:'cervera'},
    activity:{
      type:'fetch',title:'DUKA FÖR FIKASTUNDEN',pitch:'Hjälp Rut hitta kopp, kanna och fat och duka disken.',
      verb:'HJÄLP RUT',marker:'UPPDRAG · DUKA FÖR FIKASTUNDEN',
      intro:'Fikastunden börjar om en minut och porslinet har ställt sig på fel hyllor! Hitta koppen, kannan och fatet och lämna dem på disken. Jag dukar … så fort jag minns hur.',
      remind:'Tre saker saknas: kopp, kanna och fat. Leta längs hyllorna, och kolla cafébordet i atriet.',
      ready:'Allt är hittat! Kom till disken och lämna porslinet till Rut.',
      deliver:{label:'LÄMNA PÅ DISKEN',radius:3,line:'Perfekt dukat! Rut: ”Kopp i handen, kanna i … vänta, vilken ände?” Fikastunden är räddad.'},
      items:[
        {id:'kopp',name:'KOPPEN',art:'kopp',x:-141.2,z:126,floor:0,reach:2.1,hint:'På östra hyllan, nära dörren',found:'KOPPEN! Den gömde sig bland returerna. Jag sa ju att jag inte vågade fråga.'},
        {id:'kanna',name:'KANNAN',art:'kanna',x:-119,z:112,floor:0,reach:2.6,hint:'På cafébordet ute i atriet',found:'KANNAN! Den låtsades vara en vas på cafébordet. Smart. Inte smart nog.'},
        {id:'fat',name:'FATET',art:'fat',x:-147.6,z:131.4,floor:0,reach:2.1,hint:'På västra hyllan, längst in',found:'FATET! Någon hade använt det som frisbee. Det överlevde. Nästan.'}
      ]
    },
    reward:{points:150,repeatPoints:30,repeatCooldown:90,stamp:{id:'cervera',label:'CERVERA · FIKASTUNDEN'}},
    offer:{approved:false,title:'',text:'',url:'',label:'',approval:null}
  },
  {
    id:'pressbyran',name:'Pressbyrån',venue:'Kungsgatan 14',kind:'kiosk',status:'demo',
    partner:{confirmed:false,note:PASS_TEXT.demoNote},
    where:{area:'kungsgatan',floor:0,storefront:'pressbyran14',along:-3.6,out:2.7},
    entrance:{storefront:'pressbyran14',along:-1.4,out:.4,floor:0,label:'PRESSBYRÅN · ENTRÉ'},
    staff:{id:'per',clerk:'press',name:'Påtårs-Per',along:2,out:2.8,floor:0,title:'PERSONAL'},
    talk:{along:-3.6,out:4.6,radius:3.2,floor:0,label:'STÅ HÄR · FIKA PÅ MINUTEN'},
    visit:{kind:'radius',radius:9},
    // Serviceytan är en fristående disk på trottoaren framför entrén. Fasaden ändras inte.
    kiosk:{along:-3.6,out:2.7,width:3.4,depth:.95},
    activity:{
      type:'order',title:'FIKA PÅ MINUTEN',pitch:'Ta emot en fikaorder och tryck rätt i rätt ordning på tid.',
      verb:'TA EMOT ORDER',marker:'UPPDRAG · FIKA PÅ MINUTEN',
      intro:'Kön växer! Kunden vill ha sin beställning i exakt rätt ordning. Tryck på rätt sak, en i taget, innan klockan går ut.',
      remind:'Följ beställningen uppe på skärmen. Rätt sak i rätt ordning.',
      seconds:40,penalty:4,
      menu:[
        {id:'kaffe',name:'KAFFE',art:'kaffe'},{id:'kanelbulle',name:'BULLE',art:'kanelbulle'},{id:'tidning',name:'TIDNING',art:'tidning'},
        {id:'vatten',name:'VATTEN',art:'vatten'},{id:'choklad',name:'CHOKLAD',art:'choklad'},{id:'banan',name:'BANAN',art:'banan'}
      ],
      orders:[
        {id:'klassikern',who:'Klassikern',items:['kaffe','kanelbulle','tidning'],seconds:40,done:'Kaffe, bulle och tidning. Klassikern sitter. Påtårs-Per: ”Jag skulle sagt tack, men jag hade redan påtår.”'},
        {id:'skoldagen',who:'Skoldagen',items:['vatten','choklad','banan'],seconds:40,done:'Vatten, choklad och banan. Hela näringslära på tre sekunder.'},
        {id:'dubbla',who:'Dubbla',items:['kaffe','kaffe','kanelbulle'],seconds:40,done:'Två kaffe och en bulle. Det är så Karlstad tänker.'},
        {id:'rusning',who:'Rusningen',items:['kanelbulle','kaffe','tidning','choklad'],seconds:48,done:'Fyra saker i rätt ordning. Påtårs-Per applåderar med en baguette.'}
      ]
    },
    reward:{points:110,speedBonus:50,perfectBonus:20,repeatPoints:25,repeatCooldown:90,stamp:{id:'pressbyran',label:'PRESSBYRÅN · FIKA PÅ MINUTEN'}},
    offer:{approved:false,title:'',text:'',url:'',label:'',approval:null}
  },
  // ── Förberett för kommande partner. Visas aldrig för spelaren (status future) och saknar interiör. ───────────────
  {id:'kjell',name:'Kjell & Company',venue:'Mitt i City',kind:'shop',status:'future',
    plan:'Teknikpussel: hjälp en kund välja rätt tillbehör (kabel, adapter, laddare) i rätt ordning. Återanvänder uppdragstypen order.',
    activity:{type:'order',title:'RÄTT TILLBEHÖR'},reward:{points:140,stamp:{id:'kjell',label:'KJELL & COMPANY · TILLBEHÖR'}}},
  {id:'ahlens',name:'Åhléns',venue:'Drottninggatan',kind:'shop',status:'future',
    plan:'Presentjakt: hitta tre presenter till en person och lämna dem vid kassan. Återanvänder uppdragstypen fetch.',
    activity:{type:'fetch',title:'PRESENTJAKTEN'},reward:{points:150,stamp:{id:'ahlens',label:'ÅHLÉNS · PRESENTJAKT'}}},
  {id:'duvan',name:'Duvan',venue:'Duvan',kind:'center',status:'future',
    plan:'Gemensam jakt genom flera deltagande butiker med en stämpel per butik. Kräver ny kod för kedjan (hunt).',
    activity:{type:'hunt',title:'DUVANJAKTEN',stops:[]},reward:{points:250,stamp:{id:'duvan',label:'DUVAN · JAKTEN'}}},
  {id:'museum',name:'Värmlands Museum',venue:'Sandgrundsudden',kind:'museum',status:'future',
    plan:'Historiskt mysterium: en ledtrådskedja genom utställningen (fetch med ordered:true).',
    activity:{type:'fetch',ordered:true,title:'MUSEETS MYSTERIUM'},reward:{points:200,stamp:{id:'museum',label:'VÄRMLANDS MUSEUM · MYSTERIET'}}},
  {id:'sandgrund',name:'Sandgrund',venue:'Sandgrund',kind:'gallery',status:'future',
    plan:'Konstjakt med detaljer och ledtrådar: hitta tavlornas detaljer i rätt ordning (fetch med ordered:true).',
    activity:{type:'fetch',ordered:true,title:'KONSTJAKTEN'},reward:{points:200,stamp:{id:'sandgrund',label:'SANDGRUND · KONSTJAKTEN'}}}
]);

export const PLACE_IDS=Object.freeze(PLACES.map(p=>p.id));
export const placeById=id=>PLACES.find(p=>p.id===id)||null;

// ── Geometri längs en butiksfasad ───────────────────────────────────────────────────────────────────────────────
// along = meter längs fasaden i kartans led (x för norr- och söderfasader, z för öster- och västerfasader; positivt är österut/söderut),
// out = meter rakt ut från fasaden.
const FACE_OUT={north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]};
export function storefrontSpot(anchor,face,{along=0,out=0}={}){
  if(!anchor)return null;
  const [ox,oz]=FACE_OUT[face]||FACE_OUT.south,ax=oz===0?0:1,az=ox===0?0:1;
  return {x:+(anchor.x+ax*along+ox*out).toFixed(2),z:+(anchor.z+az*along+oz*out).toFixed(2)};
}

// Gör om data till absoluta koordinater. anchors: {storefrontId:{x,z,yaw}} och faces: {storefrontId:'south'}.
// Platser vars fasad inte hittas utelämnas (de kan inte spelas). Ingenting muteras.
export function resolvePlaces(places=PLACES,{anchors={},faces={}}={}){
  const out=[];
  for(const place of places){
    if(!PLAYABLE.includes(place.status)){out.push({...place,resolved:false});continue;}
    const w=place.where||{};
    if(w.storefront){
      const anchor=anchors[w.storefront],face=faces[w.storefront]||'south';
      if(!anchor)continue;
      const at=o=>storefrontSpot(anchor,face,o);
      const entrance=place.entrance?{...place.entrance,...at(place.entrance),yaw:anchor.yaw??0}:null;
      const staff=place.staff?{...place.staff,...at(place.staff)}:null;
      const talk=place.talk?{...place.talk,...at(place.talk)}:null;
      const kiosk=place.kiosk?(()=>{const c=at(place.kiosk),horizontal=face==='north'||face==='south',hw=(horizontal?place.kiosk.width:place.kiosk.depth)/2,hd=(horizontal?place.kiosk.depth:place.kiosk.width)/2;
        return {...place.kiosk,x:c.x,z:c.z,face,rect:{minx:+(c.x-hw).toFixed(2),maxx:+(c.x+hw).toFixed(2),minz:+(c.z-hd).toFixed(2),maxz:+(c.z+hd).toFixed(2)}};})():null;
      out.push({...place,resolved:true,where:{...w,...at(w)},entrance,staff,talk,kiosk});
    }else out.push({...place,resolved:true});
  }
  return out;
}

// ── Kontroll av datamodellen ─────────────────────────────────────────────────────────────────────────────────────
const ID=/^[a-z][a-z0-9-]{1,30}$/;
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export function validatePlace(p){
  const bad=[],need=(ok,msg)=>{if(!ok)bad.push(p?.id+': '+msg);};
  need(p&&typeof p==='object','plats saknas');if(!p||typeof p!=='object')return bad;
  need(ID.test(p.id||''),'ogiltigt id');need(typeof p.name==='string'&&p.name.length>1,'namn saknas');
  need(Object.values(STATUS).includes(p.status),'ogiltig status '+p.status);
  need(p.activity&&ACTIVITY_TYPES[p.activity.type],'okänd uppdragstyp '+p.activity?.type);
  need(p.reward&&finite(p.reward.points)&&p.reward.points>0,'belöning saknas');
  need(p.reward?.stamp&&ID.test(p.reward.stamp.id||'')&&typeof p.reward.stamp.label==='string','stämpel saknas');
  if(p.status==='future'){need(!!p.plan,'plan saknas för framtida plats');return bad;}
  const type=ACTIVITY_TYPES[p.activity?.type];
  need(!!type?.implemented,'uppdragstypen är inte implementerad');
  const a=p.activity||{};
  for(const key of type?.requires||[])need(a[key]!==undefined,'uppdraget saknar '+key);
  need(typeof a.title==='string'&&typeof a.intro==='string'&&typeof a.pitch==='string','uppdragstexter saknas');
  need(!!p.where&&p.where.floor!==undefined,'plats saknar våning');need(!!p.entrance,'entré saknas');need(!!p.staff&&typeof p.staff.name==='string','personal saknas');need(!!p.talk&&finite(p.talk.radius),'samtalspunkt saknas');
  need(p.partner&&typeof p.partner.confirmed==='boolean','partnerstatus saknas');
  if(p.status==='demo')need(p.partner?.confirmed===false,'en demo får inte påstå bekräftat samarbete');
  if(a.type==='fetch'){
    need(Array.isArray(a.items)&&a.items.length>=1&&a.items.length<=6,'1–6 föremål');
    const ids=new Set();for(const it of a.items||[]){need(ID.test(it.id||'')&&!ids.has(it.id),'föremål-id '+it.id);ids.add(it.id);need(typeof it.name==='string'&&typeof it.art==='string'&&typeof it.found==='string','föremålstexter '+it.id);}
    need(!!a.deliver&&typeof a.deliver.label==='string','lämnapunkt saknas');
  }
  if(a.type==='order'){
    need(Array.isArray(a.menu)&&a.menu.length>=3&&a.menu.length<=8,'3–8 val');
    const ids=new Set((a.menu||[]).map(m=>m.id));need(ids.size===(a.menu||[]).length,'menyn har dubletter');
    need(Array.isArray(a.orders)&&a.orders.length>=1,'beställningar saknas');
    for(const o of a.orders||[]){need(ID.test(o.id||'')&&Array.isArray(o.items)&&o.items.length>=2&&o.items.length<=6,'beställning '+o.id);for(const i of o.items||[])need(ids.has(i),'beställning '+o.id+' har okänd sak '+i);need(finite(o.seconds||a.seconds)&&(o.seconds||a.seconds)>=10,'tid '+o.id);}
    need(finite(a.seconds)&&a.seconds>=10&&finite(a.penalty)&&a.penalty>=0,'tid och straff');
  }
  need(!!p.offer&&typeof p.offer.approved==='boolean','erbjudande saknas (approved:false räcker)');
  if(p.offer?.approved){
    need(/^https:\/\//.test(p.offer.url||''),'godkänd länk måste börja med https://');
    need(!!p.offer.approval&&!!p.offer.approval.by&&!!p.offer.approval.at,'godkänt erbjudande kräver vem och när verksamheten godkände');
    need(typeof p.offer.title==='string'&&p.offer.title.length>0&&typeof p.offer.label==='string','erbjudandet saknar text');
  }else need(!p.offer?.url,'ett ogodkänt erbjudande får inte ha en länk');
  return bad;
}
export const validateAll=(places=PLACES)=>{const seen=new Set(),bad=[];for(const p of places){if(seen.has(p.id))bad.push(p.id+': dubblerat id');seen.add(p.id);bad.push(...validatePlace(p));}return bad;};

// Det spelaren får se: bara spelbara platser.
export const playablePlaces=(places=PLACES)=>places.filter(p=>PLAYABLE.includes(p.status));
// Ett godkänt erbjudande eller null. Ogodkänt innehåll visas aldrig.
export function approvedOffer(place){
  const o=place?.offer;if(!o?.approved)return null;
  return /^https:\/\//.test(o.url||'')?{title:o.title,text:o.text,url:o.url,label:o.label||'Läs mer',by:o.approval?.by||''}:null;
}
