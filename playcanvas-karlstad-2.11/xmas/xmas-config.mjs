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
// 2.21.1-xmas.4: paketen tog slut och det var för långt mellan regnen (ett regn var 70–110:e sekund, högst två åt gången, och två övergivna regn kunde stoppa alla nya i fyra minuter).
// Nu: första regnet efter fem sekunder, sedan ett nytt var 22–38:e sekund, högst tre åt gången, åtta till tolv paket per regn 30–85 m bort, och har man färre än lowWater paket kvar inom
// nearRadius kommer nästa regn med högst topUpEvery sekunders mellanrum. Ett regn man lämnat långt bakom sig (leaveDistance i leaveSeconds) räknas bort så att övergivna regn inte stoppar nya.
// Paketen läggs på fria platser mellan ringMin och ringMax meter från platsen där de tappats, minst spacing meter från varandra (tries: så många platser som provas innan den fullaste används).
// 2.21.1-xmas.5: fri julvandring är sök och hitta. Paketen ligger utspridda (upp till sju meter från mitten) och syns först på nära håll (showRadius, i vyn); vägen dit visas av tomtarnas spår i snön (TRAILS).
// chainWindow: sekunder mellan två fynd för att kombon ska leva (längre än i jakterna, för att man letar).
export const FREE_RAIN=Object.freeze({first:5,every:Object.freeze([22,38]),minDistance:30,maxDistance:85,count:Object.freeze([8,12]),life:200,maxActive:3,
  lowWater:7,nearRadius:110,topUpEvery:6,leaveDistance:170,leaveSeconds:20,tries:6,ringMin:2.2,ringMax:7,spacing:1.8,showRadius:34,bonusBeam:44,radarRadius:22,chainWindow:9});

// Tomtarnas spår i snön (xmas-tracks.mjs): fotspår som leder från en punkt nära spelaren (lead meter längs vägen) till platsen där paketen tappades. Ett spår per tappad hög och det försvinner
// när alla paketen i högen är hittade eller snöat igen. step: meter mellan två fotspår, side: hur långt åt sidan ett fotavtryck ligger från mittlinjen, wobble/wobbleLen: tomtens svaj (meter, våglängd),
// stopShort: spåren slutar så här långt före paketen (ett par sista spår går runt på platsen), maxPrints: tak per spår, showRadius: spår längre bort än så ritas inte,
// hw/hl: avtryckets halva bredd och längd i vyn (större än en riktig stövel så att de syns på en telefon), idleAssist: efter så här många sekunder utan fynd pekar en liten pil mot närmaste spår,
// assistClear: är man närmare än så ett spårs början behövs ingen hjälp, nearDrop: närmare än så från platsen säger uppdragsraden att man ska leta runt.
export const TRAILS=Object.freeze({lead:14,step:1.2,side:.26,wobble:.35,wobbleLen:9,stopShort:3.4,maxPrints:90,showRadius:46,hw:.3,hl:.42,idleAssist:40,assistClear:9,nearDrop:14});

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
  Object.freeze({id:'julrush',label:'JULRUSHEN',sub:'Klara Rush 5'}),
  Object.freeze({id:'julrush-12',label:'TOMTEGALET',sub:'Klara alla tolv rusher'})
]);
export const TITLES=Object.freeze([[0,'NYFIKEN'],[250,'PAKETJÄGARE'],[900,'TOMTEHJÄLPARE'],[2400,'JULENS VÄN'],[6000,'ÖVERTOMTE']]);
export const titleFor=points=>TITLES.reduce((t,[min,name])=>points>=min?name:t,TITLES[0][1]);
