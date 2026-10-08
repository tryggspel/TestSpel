// Julklappsjakten: alla siffror och texter som styr spelkänslan på ett ställe. Ren modul (inga beroenden på DOM eller spelmotorn).

// Grundspelets vanliga adress. "Tillbaka till Karlstad-spelet" navigerar hit i samma flik (ingen iframe, ingen andra spelmotor).
// Enda stället i julbygget som känner till adressen. Under utveckling kan en lokal adress anges med ?base=http://localhost:PORT/ (bara med ?debug).
export const BASE_GAME_URL='https://karlstad-city-visual-twin.vercel.app/';
export function baseGameUrl(search='',host=''){
  try{
    const q=new URLSearchParams(search);const override=q.get('base');
    if(override&&q.has('debug')&&/^(localhost|127\.0\.0\.1)$/.test(host)){const u=new URL(override);if(u.protocol==='http:'&&/^(localhost|127\.0\.0\.1)$/.test(u.hostname))return u.href;}
  }catch{}
  return BASE_GAME_URL;
}

export const SAVE_KEY='karlstad-xmas:save:1';

// Insamling. Fångstfältet och skyddet mot insamling genom väggar kommer från 2.20.0 (journey-rules.mjs: CATCH, catchReach).
export const PACKAGE_POINTS=Object.freeze({regular:10,bonus:50});
// Kombo: paket som tas inom fönstret bygger en kedja. Poängfaktorn stiger i tydliga steg och varje steg ger en engångsbonus.
export const COMBO=Object.freeze({window:3.4,introWindow:4.6,tiers:Object.freeze([
  Object.freeze({chain:4,mult:2,bonus:20,praise:'KOMBO ×2!'}),
  Object.freeze({chain:8,mult:3,bonus:40,praise:'KOMBO ×3 · JULIGT!'}),
  Object.freeze({chain:12,mult:4,bonus:60,praise:'KOMBO ×4 · MAGISKT!'})
])});
export const comboMult=chain=>COMBO.tiers.reduce((m,t)=>chain>=t.chain?t.mult:m,1);

// Leverans hos tomten. Tidsbonus: ju snabbare, desto mer, men det finns ingen tidsgräns som gör att man misslyckas.
// Gångfarten är 7,2 m/s (grundspelet), så introduktionens 252 m tar ~40 s utan avbrott och 60–90 s för den som tittar sig omkring. Rundor skalar med sin mjuka tid.
export const DELIVERY=Object.freeze({points:100,fast:45,slow:110,maxTimeBonus:100});
export const timeBonus=(seconds,{fast=DELIVERY.fast,slow=DELIVERY.slow}={})=>Math.max(0,Math.min(DELIVERY.maxTimeBonus,Math.round((slow-seconds)/(slow-fast)*DELIVERY.maxTimeBonus)));

// Fortsättning: nya paketregn i fri julvandring. Varje regn har egna paket-ID, så inget paket kan ge poäng två gånger.
export const FREE_RAIN=Object.freeze({first:18,every:Object.freeze([70,110]),minDistance:42,maxDistance:105,count:Object.freeze([7,10]),life:240,maxActive:2});

export const WEATHER=Object.freeze({full:Object.freeze({label:'FULLT',flakes:100,decor:1}),light:Object.freeze({label:'LÄTT',flakes:50,decor:.5}),off:Object.freeze({label:'AV',flakes:0,decor:0})});
export const WEATHER_ORDER=Object.freeze(['full','light','off']);

// Julstämplar (egen sparning). Stämpeln delas ut första gången uppdraget klaras.
export const STAMPS=Object.freeze([
  Object.freeze({id:'intro',label:'FÖRSTA PAKETEN',sub:'Hjälp tomten på Stora Torget'}),
  Object.freeze({id:'round-torget',label:'TORGETS PAKETREGN',sub:'Julrunda 1'}),
  Object.freeze({id:'round-kungsgatan',label:'KUNGSGATANS JULRUNDA',sub:'Julrunda 2'}),
  Object.freeze({id:'round-drottninggatan',label:'DROTTNINGGATANS JULRUNDA',sub:'Julrunda 3'}),
  Object.freeze({id:'cervera',label:'TOMTARNAS FIKABORD',sub:'Cervera'}),
  Object.freeze({id:'pressbyran',label:'TOMTARNAS FIKAORDER',sub:'Pressbyrån'}),
  Object.freeze({id:'zombies',label:'TOMTEZOMBIES',sub:'Överlev en tomtejakt'}),
  Object.freeze({id:'julrush',label:'JULRUSHEN',sub:'Nå tempo 5'})
]);
export const TITLES=Object.freeze([[0,'NYFIKEN'],[250,'PAKETJÄGARE'],[900,'TOMTEHJÄLPARE'],[2400,'JULENS VÄN'],[6000,'ÖVERTOMTE']]);
export const titleFor=points=>TITLES.reduce((t,[min,name])=>points>=min?name:t,TITLES[0][1]);
