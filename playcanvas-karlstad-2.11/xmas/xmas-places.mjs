// Julklappsjakten: butiksuppdragen i julversionen. Samma datamodell som grundspelets platser (places.mjs), samma uppdragsmotor
// (place-quests.mjs) och samma interiörer, bara med julens texter och föremål. Nästa plats = ett nytt objekt här, ingen ny kod.
// Inga erbjudanden, samarbeten eller avtal påstås: alla platser är demonstrationer (status demo) eller planerade (future, syns aldrig).
import {PLACES} from '../places.mjs?v=2.21.1-xmas.3';

const base=id=>PLACES.find(p=>p.id===id);
const cervera=base('cervera'),pressbyran=base('pressbyran');

export const XMAS_CERVERA={...cervera,
  activity:{...cervera.activity,
    title:'TOMTARNAS FIKABORD',pitch:'Hjälp Rut duka tomtarnas fikabord: hitta kopp, kanna och fat.',verb:'HJÄLP RUT',marker:'UPPDRAG · TOMTARNAS FIKABORD',
    intro:'Tomtarna kommer på fika om en minut och porslinet har gömt sig bland julpyntet! Hitta koppen, kannan och fatet och lämna dem på disken. Jag dukar … så fort jag hittat tomteluvan.',
    remind:'Tre saker saknas: kopp, kanna och fat. Leta längs hyllorna, och kolla cafébordet i atriet.',
    ready:'Allt är hittat! Kom till disken och lämna porslinet till Rut.',
    deliver:{...cervera.activity.deliver,line:'Perfekt dukat! Rut: ”Kopp, kanna, fat och en liten tomte i grytan. Nu kan julen börja.”'},
    items:cervera.activity.items.map(it=>({...it,found:{
      kopp:'KOPPEN! Den gömde sig bakom ett pepparkakshjärta. Jag sa ju att jag inte vågade fråga.',
      kanna:'KANNAN! Den låtsades vara en julvas på cafébordet. Smart. Inte smart nog.',
      fat:'FATET! Någon hade lagt lussekatter på det. Fatet överlevde. Lussekatterna … mindre.'
    }[it.id]||it.found}))
  },
  reward:{...cervera.reward,stamp:{id:'cervera',label:'CERVERA · TOMTARNAS FIKABORD'}}
};

export const XMAS_PRESSBYRAN={...pressbyran,
  activity:{...pressbyran.activity,
    title:'TOMTARNAS FIKAORDER',pitch:'Ta emot tomtarnas julfika i rätt ordning och bär den till tomten utanför.',verb:'TA EMOT ORDER',marker:'UPPDRAG · TOMTARNAS FIKAORDER',
    intro:'Tomtekön växer! Varje tomte vill ha sin julfika i exakt rätt ordning. Tryck på rätt sak, en i taget, innan klockan går ut. Sedan ska fikat bäras till tomten som väntar utanför.',
    remind:'Följ beställningen uppe på skärmen. Rätt sak i rätt ordning.',
    menu:[{id:'kaffe',name:'KAFFE',art:'kaffe'},{id:'lussebulle',name:'LUSSEBULLE',art:'lussebulle'},{id:'pepparkaka',name:'PEPPARKAKA',art:'pepparkaka'},
      {id:'tidning',name:'TIDNING',art:'tidning'},{id:'choklad',name:'CHOKLAD',art:'choklad'},{id:'glogg',name:'GLÖGG',art:'glogg'}],
    orders:[
      {id:'frukost',who:'Tomtens frukost',items:['kaffe','lussebulle','tidning'],seconds:40,done:'Kaffe, lussebulle och tidning. Tomtens frukost sitter. Påtårs-Per: ”Jag skulle sagt god jul, men jag hade redan påtår.”'},
      {id:'pepparkaksfika',who:'Pepparkaksfikat',items:['kaffe','pepparkaka','lussebulle'],seconds:40,done:'Kaffe, pepparkaka och lussebulle. Hela adventsfikat på tre tryck.'},
      {id:'glogg',who:'Glöggstunden',items:['glogg','pepparkaka','choklad'],seconds:40,done:'Glögg, pepparkaka och choklad. Påtårs-Per: ”Det här är inte på menyn, men det borde det vara.”'},
      {id:'rusning',who:'Julrusningen',items:['lussebulle','kaffe','pepparkaka','choklad'],seconds:48,done:'Fyra saker i rätt ordning mitt i julruschen. Påtårs-Per applåderar med en pepparkaka.'}
    ]
  },
  reward:{...pressbyran.reward,stamp:{id:'pressbyran',label:'PRESSBYRÅN · TOMTARNAS FIKAORDER'}}
};

// Förberett för kommande partner. Visas aldrig för spelaren (status future) och har ingen interiör. Inga erbjudanden eller samarbeten påstås.
export const XMAS_FUTURE=Object.freeze([
  {id:'kjell',name:'Kjell & Company',venue:'Mitt i City',kind:'shop',status:'future',plan:'Julklappsteknik: hjälp en tomte välja rätt tillbehör (laddare, kabel, hörlurar) till barnbarnet. Återanvänder uppdragstypen order.',
    activity:{type:'order',title:'RÄTT TILLBEHÖR TILL JULKLAPPEN'},reward:{points:140,stamp:{id:'kjell',label:'KJELL & COMPANY · JULKLAPPSTEKNIK'}}},
  {id:'ahlens',name:'Åhléns',venue:'Drottninggatan',kind:'shop',status:'future',plan:'Presentjakten: hitta tre julklappar till en tomtefamilj och lämna dem vid kassan. Återanvänder uppdragstypen fetch.',
    activity:{type:'fetch',title:'TOMTEFAMILJENS PRESENTJAKT'},reward:{points:150,stamp:{id:'ahlens',label:'ÅHLÉNS · PRESENTJAKT'}}},
  {id:'duvan',name:'Duvan',venue:'Duvan',kind:'center',status:'future',plan:'Tomtejakten genom flera deltagande butiker med en stämpel per butik. Kräver ny kod för kedjan (hunt).',
    activity:{type:'hunt',title:'TOMTEJAKTEN PÅ DUVAN',stops:[]},reward:{points:250,stamp:{id:'duvan',label:'DUVAN · TOMTEJAKTEN'}}},
  {id:'museum',name:'Värmlands Museum',venue:'Sandgrundsudden',kind:'museum',status:'future',plan:'Julmysteriet på museet: en ledtrådskedja genom utställningen (fetch med ordered:true).',
    activity:{type:'fetch',ordered:true,title:'MUSEETS JULMYSTERIUM'},reward:{points:200,stamp:{id:'museum',label:'VÄRMLANDS MUSEUM · JULMYSTERIET'}}},
  {id:'sandgrund',name:'Sandgrund',venue:'Sandgrund',kind:'gallery',status:'future',plan:'Jul i konsten: hitta julmotiven i tavlornas detaljer i rätt ordning (fetch med ordered:true).',
    activity:{type:'fetch',ordered:true,title:'JUL I KONSTEN'},reward:{points:200,stamp:{id:'sandgrund',label:'SANDGRUND · JUL I KONSTEN'}}}
]);

export const XMAS_PLACES=Object.freeze([XMAS_CERVERA,XMAS_PRESSBYRAN,...XMAS_FUTURE]);
