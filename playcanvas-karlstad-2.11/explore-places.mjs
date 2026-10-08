// City Explore 2.13: platser för det nya utforskarläget. Ren data (inga beroenden), så att logik, vy och tester delar samma källa.
// Koordinater är spelets lokala meter (x öst, z syd). Alla platser är kontrollerade mot spelets verkliga blocked() med
// minst 1,1 m fritt runt om (termosar) respektive 1,6 m (skatter) och ligger på verkliga OSM-vägar och parkstigar.

import {NEW_TREASURES,NEW_THERMOS} from './orrholmen-places.mjs?v=2.20.0';

// Fler termosar långt ut: stigar och gator i Haga, Inre hamn, Mariebergsskogen, Sandgrundsparken och Klara.
export const FX_THERMOS=Object.freeze({
  haga:Object.freeze([[349.8,21.7],[407.6,-255.8],[335.6,-304.2],[547.4,-234.6],[568.6,-135],[772.9,1.6],[863.4,65.7],[1006.8,-124.2],[1017,-315],[1161.6,178.3],[783.4,-270.7],[567.3,84.6],[1189,-27.2],[724.3,184.8],[982.4,190.9],[1147.1,-208.1],[1011.5,25.9],[439.5,178.4],[719,-136.3],[866.5,-100.5],[484.8,-23.2],[917.1,-227],[658.8,-312.7],[642.2,-31.2],[848.2,181.5],[1097,93],[445.9,75.1],[1105.2,-87.4],[713.4,88.6],[809.5,-177.7]]),
  hamn:Object.freeze([[172.4,398],[66.2,445.8],[144.8,579.5],[123.9,613.7],[496.7,610.2],[416.4,556.1],[285.1,461.4],[622.2,256.7],[-165.4,583.1],[-39.9,823.1],[343,817.8],[424.3,318.4],[600.8,449.5],[-170,379.3],[147.1,844],[285.4,662.7]]),
  marieberg:Object.freeze([[-860,1319.6],[-904.6,1206],[-972.4,1172.6],[-981.9,1249.3],[-1005.6,1315.8],[-775.3,1045.8],[-958.3,1007.2],[-918.9,1436.1],[-803.1,1159.4],[-868.7,1080.6],[-820.3,1244.1],[-948.8,1093.6],[-944.9,1362.8],[-926.3,1290.8],[-849.1,1023.6],[-902.6,1145.8],[-796.9,1099.9],[-888.5,1372.7],[-881.9,1256.9],[-849.9,1189.2],[-904,1038.8],[-991.7,1048.8]]),
  park:Object.freeze([[-174.1,-464.7],[-226.4,-554.9],[-247.1,-699.5],[-223.9,-753.7],[-96.8,-562],[-43.6,-445.7],[-113.1,-358.8],[-144.6,-619.7],[-107.2,-465.1],[-49.3,-510],[-146.6,-520.3],[-140.8,-412.7],[-248.8,-639.4],[-80.6,-405.5]]),
  klara:Object.freeze([[-238,-0.8],[-267.5,80.4],[-308.2,255.1],[-322.9,158.1],[-265.3,170.8],[-327.2,42.9]]),
  // Mitt i City: [x,z,våningshöjd]
  mall:Object.freeze([[-108,100,0],[-124,88,0],[-150,100,0],[-148,100,5.4],[-110,108,5.4],[-118,120,5.4]]),
  // 2.18: Orrholmen, Stadsträdgården, Bryggudden och stationen (orrholmen-places.mjs).
  ...NEW_THERMOS
});

// Gömda skatter (utöver de sju gamla hemligheterna). Visas som guldtermos inom 30 m, bara i City Explore.
export const TREASURES=Object.freeze([
  {id:'t-ccc',name:"Kongressens hemliga scen",x:393,z:-258,points:300,hint:"Där Karlstad håller kongress, med älven bakom."},
  {id:'t-korskyrkan',name:"Korskyrkans kaffeklocka",x:557,z:-223,points:300,hint:"Bredvid ett kors i Haga. Kaffe efter gudstjänsten."},
  {id:'t-gjutaren',name:"Gjutarens glömda pokal",x:738.3,z:-14.7,points:350,hint:"Bakom idrottshallen där Haga tränar."},
  {id:'t-herrhaga',name:"Herrhagens lekplatsguld",x:873,z:43.4,points:400,hint:"Barnen hittade den först, i Herrhagsparken."},
  {id:'t-attkanten',name:"Åttkantens skattkammare",x:1009.8,z:-110.5,points:500,hint:"Längst österut i Haga, där staden tar slut."},
  {id:'t-lokstallet',name:"Lokstallets sista lok",x:1002.1,z:-315.4,points:500,hint:"Loken är borta men kaffet finns kvar. Lokstallsparken."},
  {id:'t-lofbergs',name:"Löfbergs kaffelager",x:152.3,z:379.6,points:300,hint:"Där kaffet rostas. Följ doften söderut."},
  {id:'t-skeppet',name:"Skeppets förskepp",x:169.6,z:530.4,points:350,hint:"Ett skepp på land, nära Inre hamn."},
  {id:'t-tradgarden',name:"Stadsträdgårdens hemliga bänk",x:-27,z:569,points:350,hint:"Under de gröna kronorna söder om hamnen."},
  {id:'t-glasbruk',name:"Glasbrukets sista glas",x:474,z:606,points:450,hint:"Vid bron långt sydost, där det en gång blåstes glas."},
  {id:'t-ebba',name:"Ebbas glasskassa",x:-845.5,z:1319,points:300,hint:"Först glass, sedan guld. Nära båtbryggan i Mariebergsskogen."},
  {id:'t-teater',name:"Friluftsteaterns kulisser",x:-974.9,z:1214.4,points:400,hint:"Bakom scenen i Mariebergsskogen."},
  {id:'t-faglar',name:"Fågeldammens vass",x:-1036.5,z:1122.5,points:400,hint:"Vid vattnet där fåglarna samlas."},
  {id:'t-vadersag',name:"Vädersågens kugghjul",x:-1079.5,z:1226,points:450,hint:"Där vinden sågar. Längst västerut i parken."},
  {id:'t-kvarn',name:"Skvaltkvarnens damm",x:-1072.8,z:1427.1,points:450,hint:"Där vattnet mal, nära parkens sydvästra hörn."},
  {id:'t-naturum',name:"Naturums lönndörr",x:-921,z:1524.5,points:500,hint:"Längst söderut i skogen, vid Naturum."},
  {id:'t-pir',name:"Pirens sista planka",x:-256.1,z:-552.2,points:350,hint:"Där bryggan tar slut och vattnet börjar."},
  {id:'t-magnolia',name:"Magnolians rot",x:-258,z:-689.5,points:400,hint:"I lunden där det prasslar i buskarna."},
  {id:'t-museiparken',name:"Museiparkens tysta bänk",x:-140.1,z:-395.3,points:250,hint:"Mellan museet och älven."},
  {id:'t-bron',name:"Mitt på Västra bron",x:-230.3,z:-76.1,points:250,hint:"Där Klarälven rinner under dig."},
  {id:'t-tingvalla',name:"Tingvallas tysta hörn",x:80,z:-207,points:250,hint:"Norr om Torget, i ett kvarter bakom Tingvallagatan."},
  {id:'t-coop',name:'Coops frysdisk',x:-157,z:86,y:0,points:300,hint:'Inne på Mitt i City, där det är kallt och gott.'},
  {id:'t-cervera',name:'Cerveras provhytt',x:-147.5,z:127,y:0,points:300,hint:'Mitt i City, plan 0. Bakom hyllorna.'},
  {id:'t-clas',name:'Clas Ohlsons verktygshylla',x:-135,z:80,y:5.4,points:400,hint:'Mitt i City, plan 1. Hitta rätt skruv.'},
  ...NEW_TREASURES
]);

// Ledtrådar till de sju gamla hemligheterna (de nya skatterna har egna 'hint').
export const LEGACY_HINTS=Object.freeze({
  'secret-0':'Bakom kiosken på Torget, där rubrikerna hänger.',
  'secret-1':'Nära O’Learys, där bortafansen brukar samlas.',
  'secret-2':'Utanför Mitt i City på västra sidan, efter stängning.',
  'secret-3':'I Domkyrkans skugga, väster om kyrkan.',
  'secret-4':'Vid Sandgrund, där konsten bor.',
  'mall-upper':'Mitt i City, övervåningen. Åk rulltrappan.',
  'udden-cache':'Längst ut på Sandgrundsudden.'
});

// MusicPartners kontor, Kungsgatan 6D (OSM-byggnad 119214077, söderfasaden). Man står på trottoaren framför dörren.
// Där kan man checka in (en gång per dag), lyssna på spelets musik och återställa sina poäng och nivåer.
export const MUSIC_OFFICE=Object.freeze({id:'musicpartner',name:'MusicPartner',address:'Kungsgatan 6D',x:302,z:-23.5,radius:8,checkinBonus:100});
export const JUKEBOX=Object.freeze([
  {id:'main',label:'Karlstad City-temat',note:'Spelets stadsmusik'},
  {id:'zombie',label:'Zombiejakten',note:'Musiken från stadsjakten'},
  {id:'arena',label:'Arenalagret',note:'Kort spår, 18 sekunder'}
]);

// Fikaalbumet: sjutton områden. Varje område har ett antal termosar; att hitta alla ger en samlingsbonus.
// Ordningen är avgörande: första träffen gäller.
export const ALBUM_AREAS=Object.freeze([
  {id:'kil',name:'Kil station',bonus:200},
  {id:'marieberg',name:'Mariebergsskogen',bonus:500},
  {id:'mall',name:'Mitt i City',bonus:300},
  {id:'udden',name:'Sandgrundsudden',bonus:400},
  {id:'sandgrund',name:'Sandgrund och Museiparken',bonus:350},
  {id:'haga',name:'Haga',bonus:600},
  {id:'hamn',name:'Inre hamn och Löfbergs',bonus:450},
  {id:'klara',name:'Klara och Residensparken',bonus:300},
  {id:'torget',name:'Torget och Kungsgatan',bonus:400},
  {id:'norr',name:'Tingvallastaden',bonus:350},
  {id:'soder',name:'Södra centrum och stationen',bonus:350},
  {id:'ost',name:'Östra stan',bonus:350},
  {id:'vast',name:'Västra stan',bonus:350},
  // 2.18: ordningen spelar ingen roll här, areaOf() avgör vilket område en plats tillhör.
  {id:'orrholmen',name:'Orrholmen och viken',bonus:700},
  {id:'tradgard',name:'Stadsträdgården',bonus:450},
  {id:'bryggudden',name:'Bryggudden',bonus:400},
  {id:'station',name:'Tågstationen',bonus:350}
]);
// Område för en termos eller skatt. Id-prefix först (fjärrplatserna och gallerian), sedan läge.
export function areaOf(t){
  const id=String(t?.id||''),x=Number(t?.x),z=Number(t?.z);
  if(/^kil-/.test(id))return 'kil';
  if(/^(fx-)?marieberg-/.test(id))return 'marieberg';
  if(/^(fx-)?mall-/.test(id)||/^mall-/.test(id))return 'mall';
  if(!Number.isFinite(x)||!Number.isFinite(z))return 'torget';
  if(x<-5000)return 'kil';
  if(x<-440&&z>900)return 'marieberg';
  if((z>900||(z>850&&x<-150))&&x<=620)return 'orrholmen'; // Tullholmen, Orrholmen, parken och Östra viken
  if(x>=-105&&x<=8&&z>=402&&z<=692)return 'tradgard';
  if(x>=235&&x<=475&&z>=405&&z<=650)return 'bryggudden';
  if(x>=-300&&x<=-130&&z>=280&&z<=350)return 'station';
  if(z<-600)return 'udden';
  if(z<-330)return 'sandgrund';
  if(x>330&&z<250)return 'haga';
  if(z>250)return 'hamn';
  if(x<-230)return 'klara';
  if(Math.hypot(x,z)<=110)return 'torget';
  if(z<-150)return 'norr';
  if(z>150)return 'soder';
  if(x>150)return 'ost';
  return 'vast';
}

// Busslinjer från Torget. Torget, Sandgrund och Domkyrkan finns redan som hållplatser (positionen snäpps av spelet);
// övriga hållplatser har verifierade koordinater. 'bus' är var bussmodellen står (förskjutning från stolpen).
export const BUS_NETWORK=Object.freeze([
  {id:'torget',name:'Torget',line:0,hub:true,color:'#f59554'},
  {id:'sandgrund',name:'Sandgrund',line:1,color:'#a276d1',blurb:'Konsthallen och Klarälven'},
  {id:'tingvalla',name:'Tingvalla',line:2,x:90,z:-210,bus:[-6,2],color:'#4cc1c7',blurb:'Sandgrundsudden är bilfri: gå eller cykla härifrån'},
  {id:'haga',name:'Haga',line:3,x:566,z:-100,bus:[6,2],color:'#e86f6f',blurb:'Hagahallen och östra Karlstad'},
  {id:'attkanten',name:'Åttkanten',line:4,x:1000,z:-100,bus:[6,2],color:'#e3b341',blurb:'Östra kanten av kartan'},
  {id:'hamn',name:'Inre hamn',line:5,x:218,z:532.1,bus:[-6,2],color:'#4a9ee0',blurb:'Båtbussen och Löfbergs'},
  {id:'station',name:'Karlstad C',line:6,x:-204.3,z:264.5,bus:[-6,2],color:'#7bc36a',blurb:'Tåget till Kil'},
  {id:'marieberg',name:'Mariebergsskogen',line:7,x:-902,z:1210,bus:[6,2],color:'#58b58a',blurb:'Parken, djurparken och teatern'},
  {id:'domkyrkan',name:'Domkyrkan',line:8,color:'#c98bd6',blurb:'Domkyrkan och Östra Torggatan'}
]);
export const BUS_FIRST_RIDE_BONUS=150;
// Restid i sekunder mellan två hållplatser: 8–15 s, längre ju längre bort.
export function busRideSeconds(a,b){
  const d=Math.hypot(a.x-b.x,a.z-b.z);
  return Math.round(Math.max(8,Math.min(15,7+d/130)));
}
