// De 24 luckorna. Varje lucka är ett riktigt uppdrag eller en riktig utmaning i Julklappsjakten (Julspelet, den här mappens spel).
// Kalendern lägger ingenting i spelet: den länkar rakt till uppdraget och läser av resultatet i Julspelets sparning efteråt (rules.mjs).
//
//   typ      jakt | butik | rush | zombie | plats | utmaning | final      (plats = uppdrag ute i staden: Sandgrund, båtbussen)
//   spel     {knapp, valj, djup}  valj = vad man trycker på i spelet om länken inte räcker. djup = uppdragsnyckeln i djuplänken (?uppdrag=…): Julspelets xmas/xmas-deeplink.mjs förstår den,
//            och tests/julkalender-doors.test.mjs kontrollerar att nyckeln finns och att den leder till uppdraget som luckan kräver.
//   check    villkoret som läses av i Julspelets sparning, se evaluate() i rules.mjs. 'manual' = spelaren markerar själv (reservväg, ingen lucka använder den som enda väg)
//   demo     true om luckan använder en butiksplats som är en DEMO i spelet (inget samarbete är bekräftat, se PARTNERPLATSER.md)
//   stjarnor 1–3 efter hur mycket det kräver. Summan ger titlarna i RANKS.
//
// Länken (gameLink) går rakt till uppdraget: Julspelet visar ett kort med uppdraget och en knapp STARTA (inget startar av sig självt). Är uppdraget låst säger kortet det och erbjuder det som går.
// Gränser (tröskelvärden för rekord) är satta från spelets egna regler men inte speltestade på riktiga spelare. Justera här.
export const GAME_PATH='../';
// Grundspelets adress bor på ett enda ställe i julbygget (tests/xmas-build.test.mjs kräver det): xmas/xmas-config.mjs. Modulen är ren (inga beroenden).
import {BASE_GAME_URL} from '../xmas/xmas-config.mjs?v=2.21.1-xmas.7';
export const KARLSTAD_CITY=BASE_GAME_URL;
export const TYPES=Object.freeze({
  jakt:{label:'Julklappsjakt',icon:'gift'},
  butik:{label:'Butiksuppdrag',icon:'bag'},
  rush:{label:'JulRushen',icon:'bolt'},
  zombie:{label:'Tomtezombies',icon:'hat'},
  utmaning:{label:'Utmaning',icon:'star'},
  plats:{label:'Platsuppdrag',icon:'flag'},
  final:{label:'Julfinal',icon:'tree'}
});
const JAKT=(valj,djup,knapp='Starta i Julklappsjakten')=>({knapp,valj,djup});
const PASS='Tryck JULKLAPPSJAKTEN och sedan BUTIKSUTMANINGAR. Karlstadpasset öppnas: tryck GÅ DIT vid ';
const NEXT='Tryck JULKLAPPSJAKTEN och sedan NÄSTA JULKLAPPSJAKT. Spelet väljer den första runda du saknar stämpel från.';

export const DOORS=Object.freeze([
  {n:1,typ:'jakt',titel:'Hjälp tomten på Stora Torget',plats:'Stora Torget',stjarnor:1,
    ledtrad:'Någon har tappat något. Det syns i snön.',
    story:'Tomtarna har tappat julklapparna på Stora Torget. Följ deras spår i snön, hitta paketen och lämna dem hos tomten vid granen.',
    mal:'Klara Julklappsjaktens första uppdrag och få julstämpeln FÖRSTA PAKETEN.',
    steg:['Tryck JULKLAPPSJAKTEN i spelet.','Gå runt på Stora Torget och leta efter tomtarnas fotspår i snön. De leder till de tappade paketen.','Hitta julklapparna och lämna dem hos tomten. Då bockas luckan av.'],
    spel:JAKT('JULKLAPPSJAKTEN','intro'),check:{kind:'stamp',id:'intro'}},

  {n:2,typ:'jakt',titel:'Torgets julklappsjakt',plats:'Stora Torget',stjarnor:2,
    ledtrad:'Fotspår åt alla håll.',
    story:'Tomtarna har tappat julklappar över hela torget. Leta efter deras spår i snön och följ dem.',
    mal:'Hitta 18 julklappar och lämna dem hos tomten, så får du julstämpeln TORGETS PAKETREGN.',
    steg:[NEXT,'Följ tomtarnas spår i snön och hitta 18 julklappar. Bonuspaketen är valfria avstickare.','Lämna paketen hos tomten vid granen.'],
    spel:JAKT('JULKLAPPSJAKTEN → NÄSTA JULKLAPPSJAKT','torget'),check:{kind:'stamp',id:'round-torget'}},

  {n:3,typ:'butik',titel:'Cervera: Tomtarnas fikabord',plats:'Mitt i City, plan 0',stjarnor:2,demo:true,
    ledtrad:'Porslinet har gömt sig bland julpyntet.',
    story:'Tomtarna kommer på fika om en minut och porslinet har gömt sig bland julpyntet. Rut i returen behöver hjälp.',
    mal:'Hitta koppen, kannan och fatet och lämna dem på disken hos Cervera. Då får du julstämpeln TOMTARNAS FIKABORD.',
    steg:[PASS+'Cervera.','Tryck HJÄLP RUT.','Hitta koppen (östra hyllan vid dörren), kannan (cafébordet i atriet) och fatet (västra hyllan längst in) och lämna dem på disken.'],
    spel:JAKT('JULKLAPPSJAKTEN → BUTIKSUTMANINGAR','cervera'),check:{kind:'stamp',id:'cervera'}},

  {n:4,typ:'rush',titel:'JulRushen: Rush 1 JULMYS',plats:'Hela Karlstad',stjarnor:1,
    ledtrad:'Lugn start. Klockan tickar redan.',
    story:'JulRushen har tolv rusher med stigande tempo. Börja med Rush 1, där du får lära dig banan och pilen.',
    mal:'Klara Rush 1 JULMYS: hämta 25 paket innan klockan till nästa paket går ut.',
    steg:['Tryck JULRUSHEN och välj Rush 1.','Följ pilen till nästa paket. Klockan till nästa paket tickar, och du har tre hjärtan.','Hämta 25 paket för att klara rushen.'],
    spel:JAKT('JULRUSHEN → Rush 1','rush1'),check:{kind:'rush',n:1}},

  {n:5,typ:'utmaning',titel:'Tre rundor till slut',plats:'Hela Karlstad',stjarnor:1,
    ledtrad:'Julen är en uthållighetsgren.',
    story:'Julen kräver uthållighet. Spela tre rundor, uppdrag eller rusher från början till slut. Vilka du väljer är upp till dig.',
    mal:'Avsluta tre rundor, uppdrag eller rusher i Julklappsjakten (räknas från att du öppnade kalendern).',
    steg:['Välj JULKLAPPSJAKTEN, JULRUSHEN eller TOMTEZOMBIES i spelet.','Spela till slutkortet. Klarar du målet eller tar rushen slut spelar det ingen roll: avslutade rundor räknas.','Tre avslutade rundor räcker.'],
    spel:JAKT('JULKLAPPSJAKTEN, JULRUSHEN eller TOMTEZOMBIES','meny','Öppna Julmenyn'),check:{kind:'count',metric:'runs',n:3,unit:'avslutade rundor'}},

  {n:6,typ:'plats',ikon:'flag',titel:'Sandgrund: Julvernissagen',plats:'Sandgrund',stjarnor:3,
    ledtrad:'”Rör inte konsten.” Konsten rör sig själv.',
    story:'Zombie-Lerin har öppnat en julvernissage på Sandgrund och besökarna står kvar utanför. En tecknad spelfantasi, men räddningen är på riktigt: led besökarna till grönt och stoppa honom med solstötar.',
    mal:'Klara uppdraget Sandgrund: Julvernissagen och få julstämpeln SANDGRUND · JULVERNISSAGEN.',
    steg:['Tryck JULKLAPPSJAKTEN och sedan SANDGRUND: JULVERNISSAGEN. Menyn med uppdragen finns när du klarat det första uppdraget (lucka 1).','Gå nära tre besökare utanför Sandgrund. De följer dig till den gröna samlingsplatsen.','Stoppa Zombie-Lerin med solstötar. När uppdraget är klart får du stämpeln och luckan bockas av.'],
    spel:JAKT('JULKLAPPSJAKTEN → SANDGRUND: JULVERNISSAGEN','sandgrund'),check:{kind:'stamp',id:'sandgrund'}},

  {n:7,typ:'butik',titel:'Pressbyrån: Tomtarnas fikaorder',plats:'Kungsgatan 14',stjarnor:2,demo:true,
    ledtrad:'Tomtekön växer. Rätt ordning, tack.',
    story:'Tomtekön växer! Varje tomte vill ha sin julfika i exakt rätt ordning, och Påtårs-Per står ensam vid disken.',
    mal:'Ta emot tomtarnas beställning på Pressbyrån och få julstämpeln TOMTARNAS FIKAORDER.',
    steg:[PASS+'Pressbyrån.','Tryck TA EMOT ORDER och tryck rätt saker i rätt ordning på 40 sekunder (knapparna eller 1–6). Fel sak kostar tid.','Bär sedan fikat till tomten som väntar utanför.'],
    spel:JAKT('JULKLAPPSJAKTEN → BUTIKSUTMANINGAR','pressbyran'),check:{kind:'stamp',id:'pressbyran'}},

  {n:8,typ:'jakt',titel:'Kungsgatans julrunda',plats:'Kungsgatan',stjarnor:2,
    ledtrad:'Gå gatan fram. Spåren väntar.',
    story:'Gå Kungsgatan fram, leta spår i snön och hitta julklapparna. Lämna dem hos tomten vid granen.',
    mal:'Hitta 24 julklappar på Kungsgatans julrunda och få julstämpeln KUNGSGATANS JULRUNDA.',
    steg:[NEXT,'Gå Kungsgatan fram och följ tomtarnas spår i snön. Paketen ligger längre fram längs gatan.','Hitta 24 julklappar och lämna dem hos tomten.'],
    spel:JAKT('JULKLAPPSJAKTEN → NÄSTA JULKLAPPSJAKT','kungsgatan'),check:{kind:'stamp',id:'round-kungsgatan'}},

  {n:9,typ:'plats',ikon:'boat',titel:'Båtbussen till Mariebergsskogen',plats:'Inre hamn → Mariebergsskogen',stjarnor:3,
    ledtrad:'Passagerarna hoppar överbord. Kaptenen hade visst sjöben.',
    story:'Zombie-båtbussen lägger ut från Inre hamn med tolv passagerare och en kapten som hade visst sjöben. På andra sidan väntar julklapparna i Mariebergsskogen, och tomten väntar vid bryggan.',
    mal:'Åk båtbussen från Inre hamn, hämta tolv julklappar i Mariebergsskogen och lämna dem hos tomten. Få julstämpeln MARIEBERGSSKOGEN · JULBÅTEN.',
    steg:['Tryck JULKLAPPSJAKTEN och sedan BÅTBUSSEN TILL MARIEBERGSSKOGEN. Menyn med uppdragen finns när du klarat det första uppdraget (lucka 1).','Tryck på passagerarna under överfarten: väst på däck, ring i vattnet. Varje räddad passagerare ger poäng i jakten.','Kliv iland i Mariebergsskogen, samla tolv julklappar och lämna dem hos tomten vid bryggan.'],
    spel:JAKT('JULKLAPPSJAKTEN → BÅTBUSSEN TILL MARIEBERGSSKOGEN','batbuss'),check:{kind:'stamp',id:'marieberg'}},

  {n:10,typ:'rush',titel:'JulRushen: Rush 3 GLÖGGFART',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Glöggen värmer. Tempot sitter i benen.',
    story:'Glöggen värmer och tempot stiger. I Rush 3 gäller det att börja plocka i kedjor.',
    mal:'Klara Rush 3 GLÖGGFART: hämta 30 paket.',
    steg:['Tryck JULRUSHEN och välj Rush 3 (den låses upp när Rush 2 är klar).','Plocka paket i en kedja: fyra i rad ger dubbla poäng.','Hämta 30 paket innan klockan går ut och hjärtana tar slut.'],
    spel:JAKT('JULRUSHEN → Rush 3','rush3'),check:{kind:'rush',n:3}},

  {n:11,typ:'jakt',titel:'Drottninggatans julrunda',plats:'Mitt i City och Drottninggatan',stjarnor:2,
    ledtrad:'En lång runda med många fönster.',
    story:'En lång runda genom Mitt i City och längs Drottninggatan. Följ tomtarnas spår i snön och hitta julklapparna.',
    mal:'Hitta 28 julklappar på Drottninggatans julrunda och få julstämpeln DROTTNINGGATANS JULRUNDA.',
    steg:[NEXT,'Följ spåren genom Mitt i City och längs Drottninggatan.','Hitta 28 julklappar och lämna dem hos tomten.'],
    spel:JAKT('JULKLAPPSJAKTEN → NÄSTA JULKLAPPSJAKT','drottninggatan'),check:{kind:'stamp',id:'round-drottninggatan'}},

  {n:12,typ:'zombie',titel:'Tomtezombies: nivå 1',plats:'Stora Torget',stjarnor:2,
    ledtrad:'Julmusik i moll. Tomtarna ser inte glada ut.',
    story:'Ett separat julläge med zombier och kuslig julmusik. Paketen är både mål och ammunition, och tomtezombierna jagar dig.',
    mal:'Samla 20 paket, lämna dem hos tomten och klara nivå 1 av Tomtezombies.',
    steg:['Tryck TOMTEZOMBIES i spelet.','Samla 20 paket i spiralen runt granen. Paketen är också ammunition: skjut tomtezombierna med SOLSTÖT.','Lämna paketen hos tomten.'],
    spel:JAKT('TOMTEZOMBIES','zombies1'),check:{kind:'zombies',n:1}},

  {n:13,typ:'rush',titel:'Lucia: Rush 5 SLÄDFART',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Ljus i mörkret, och släden tar fart.',
    story:'Luciadagen: ljus i mörkret. Släden tar fart i Rush 5, och här delas julstämpeln JULRUSHEN ut.',
    mal:'Klara Rush 5 SLÄDFART (35 paket) eller nå tempo 5 i Maraton och få julstämpeln JULRUSHEN.',
    steg:['Tryck JULRUSHEN och välj Rush 5.','Följ pilen och släpp inte klockan. Gåvorna (renssläden, turboglöggen) ger fart.','Hämta 35 paket.'],
    spel:JAKT('JULRUSHEN → Rush 5','rush5'),check:{kind:'stamp',id:'julrush'}},

  {n:14,typ:'utmaning',titel:'Paketjägare: 100 paket',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Räkna paketen, inte dagarna.',
    story:'Tomtarnas lista är lång. Alla paket du hämtar i avslutade rundor räknas, oavsett om det är i jakten, rushen eller bland tomtezombierna.',
    mal:'Hämta 100 paket i avslutade rundor (räknas från att du öppnade kalendern).',
    steg:['Spela jakter, rusher eller Tomtezombies till slutkortet. Paketen räknas först när rundan är avslutad.','Alla lägen räknas: jakter, rusher, Tomtezombies och uppdrag.','Kom tillbaka hit när du har hämtat 100.'],
    spel:JAKT('JULKLAPPSJAKTEN, JULRUSHEN eller TOMTEZOMBIES','meny','Öppna Julmenyn'),check:{kind:'count',metric:'packages',n:100,unit:'paket'}},

  {n:15,typ:'zombie',titel:'Tomtezombies: nivå 2',plats:'Torgets bana',stjarnor:2,
    ledtrad:'Fler paket och fler tomtar med dåligt humör.',
    story:'Nivå 2 går Torgets bana med två paket fler att samla och tomtezombier som kommer tätare och går snabbare.',
    mal:'Klara nivå 2 av Tomtezombies: samla 22 paket och lämna dem hos tomten.',
    steg:['Tryck TOMTEZOMBIES. Nivå 2 låses upp när nivå 1 är klar.','Samla 22 paket på Torgets bana. Tomtezombierna går fem procent snabbare än på nivå 1.','Lämna paketen hos tomten.'],
    spel:JAKT('TOMTEZOMBIES','zombies2'),check:{kind:'zombies',n:2}},

  {n:16,typ:'utmaning',titel:'Utmana en vän',plats:'Topplistan',stjarnor:1,
    ledtrad:'Skriv ditt namn och skicka det vidare.',
    story:'Julrushen blir roligare med någon att slå. Skriv ditt namn på topplistan och skicka en utmaningslänk till en vän.',
    mal:'Skriv ditt namn på topplistan (högst 12 tecken) och skicka en utmaning.',
    steg:['Tryck JULRUSHEN och sedan TOPPLISTA OCH UTMANING.','Skriv ditt namn i rutan DITT NAMN.','Tryck SKICKA UTMANING och skicka länken. Kalendern bockar av luckan när ditt namn är sparat.'],
    spel:JAKT('JULRUSHEN → TOPPLISTA OCH UTMANING','topplista','Öppna topplistan'),check:{kind:'name'}},

  {n:17,typ:'rush',titel:'Perfekt rush',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Tre hjärtan in, tre hjärtan ut.',
    story:'Stjärnorna i JulRushen är hjärtana du har kvar när målet nås. Tre stjärnor betyder att du klarade rushen utan att tappa ett enda hjärta.',
    mal:'Klara en rush utan att tappa ett hjärta, så att den får tre stjärnor.',
    steg:['Tryck JULRUSHEN och välj en rush du klarar, till exempel Rush 1–3.','Tappa inte ett enda paket: varje gång klockan går ut förlorar du ett hjärta.','Klara målet med alla tre hjärtan kvar.'],
    spel:JAKT('JULRUSHEN','rush','Öppna JulRushen'),check:{kind:'rushStars',min:3}},

  {n:18,typ:'utmaning',titel:'Bli Tomtehjälpare',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Titeln står på startvyn.',
    story:'Julpoängen ger titlar: Nyfiken, Paketjägare, Tomtehjälpare, Julens vän och Övertomte. Titeln syns på startvyn.',
    mal:'Samla 900 julpoäng och få titeln TOMTEHJÄLPARE.',
    steg:['Spela jakter, rusher och uppdrag. Varje avslutad runda ger julpoäng.','Titeln PAKETJÄGARE kommer vid 250 poäng och TOMTEHJÄLPARE vid 900.','Din titel står på startvyn, efter JULSTÄMPLAR n / 9.'],
    spel:JAKT('JULKLAPPSJAKTEN, JULRUSHEN eller TOMTEZOMBIES','meny','Öppna Julmenyn'),check:{kind:'points',min:900,unit:'julpoäng'}},

  {n:19,typ:'rush',titel:'Maraton: tempo 6',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Tempot stiger var tolfte sekund.',
    story:'I Maraton stiger tempot var 12:e sekund tills du är ute. Det är det ursprungliga JulRushen-läget.',
    mal:'Nå tempo 6 i Maraton.',
    steg:['Tryck JULRUSHEN och sedan MARATON.','Plocka paket och håll kedjan. Tempot stiger var 12:e sekund.','Håll dig kvar tills tempot är 6, ungefär en minut in.'],
    spel:JAKT('JULRUSHEN → MARATON','maraton'),check:{kind:'marathon',min:6,unit:'tempo'}},

  {n:20,typ:'rush',titel:'JulRushen: Rush 8 NORDPOLEN',plats:'Hela Karlstad',stjarnor:3,
    ledtrad:'Långt norrut och långt mellan paketen.',
    story:'Långt norrut och långt mellan paketen. Rush 8 är en poängrush: det räcker inte att hämta paket, du ska också plocka dem i kedjor.',
    mal:'Klara Rush 8 NORDPOLEN: nå 8 000 poäng.',
    steg:['Tryck JULRUSHEN och välj Rush 8 (alla rusher före måste vara klara).','Bygg kedjor: fyra paket i rad ger ×2, åtta ger ×3 och tolv ger ×4.','Plocka guldpaketen för gåvorna. Nå 8 000 poäng.'],
    spel:JAKT('JULRUSHEN → Rush 8','rush8'),check:{kind:'rush',n:8}},

  {n:21,typ:'rush',titel:'Highscore: Rush 4 SNÖYRA',plats:'Hela Karlstad',stjarnor:3,
    ledtrad:'Klara den. Slå sedan målet.',
    story:'Att klara en rush är en sak. Att slå poängmålet med marginal är en annan. Rush 4 SNÖYRA har målet 3 600 poäng.',
    mal:'Nå 4 500 poäng i Rush 4 SNÖYRA (målet för att klara rushen är 3 600).',
    steg:['Tryck JULRUSHEN och välj Rush 4.','Håll kedjan så länge du kan. Flytbonusen ger extra poäng för paket som tas med minst halva klockan kvar.','Ditt bästa resultat i rushen sparas. Nå 4 500.'],
    spel:JAKT('JULRUSHEN → Rush 4','rush4'),check:{kind:'rushPoints',n:4,min:4500,unit:'poäng'}},

  {n:22,typ:'zombie',titel:'Tomtezombies: nivå 4',plats:'Drottninggatan',stjarnor:3,
    ledtrad:'Nu går de snabbare än du minns.',
    story:'Nivå 4 går Drottninggatans bana med fler paket att samla och tomtezombier som går femton procent snabbare än på nivå 1.',
    mal:'Klara nivå 4 av Tomtezombies: samla 26 paket och lämna dem hos tomten.',
    steg:['Tryck TOMTEZOMBIES och spela dig upp till nivå 4 (en nivå i taget).','Samla 26 paket. Nästa tomtezombie kommer högst var nionde sekund.','Skjut med SOLSTÖT och lämna paketen hos tomten.'],
    spel:JAKT('TOMTEZOMBIES','zombies4'),check:{kind:'zombies',n:4}},

  {n:23,typ:'rush',titel:'Lilla julafton: Rush 10 SNÖSTORM',plats:'Hela Karlstad',stjarnor:3,
    ledtrad:'Snön yr och klockan tickar.',
    story:'Lilla julafton. Snön yr och klockan tickar. Rush 10 är en av de svåraste: nästan ingen marginal finns kvar mellan paketen.',
    mal:'Klara Rush 10 SNÖSTORM: nå 10 850 poäng.',
    steg:['Tryck JULRUSHEN och välj Rush 10.','Använd gåvorna: fartgåvorna och Julmagneten gör störst skillnad.','Nå 10 850 poäng innan hjärtana tar slut.'],
    spel:JAKT('JULRUSHEN → Rush 10','rush10'),check:{kind:'rush',n:10}},

  {n:24,typ:'final',titel:'Julafton: åtta av elva julstämplar',plats:'Stora Torget',stjarnor:3,
    ledtrad:'Tomtarna samlas vid granen och räknar.',
    story:'Julafton. Tomtarna samlas vid granen på Stora Torget och räknar stämplarna. Elva finns att samla, och åtta räcker för att julen ska bli räddad.',
    mal:'Samla minst åtta av elva julstämplar.',
    steg:['Tryck JULKLAPPSJAKTEN. Dina stämplar syns som JULSTÄMPLAR n / 11 på startvyn.','Saknar du någon? Luckorna 1, 2, 3, 6, 7, 8, 9, 11, 12 och 13 ger en stämpel var.','När du har åtta bockas luckan av, och stjärnan tänds i granen här.'],
    spel:JAKT('JULKLAPPSJAKTEN','meny','Öppna Julmenyn'),check:{kind:'stamps',n:8,unit:'julstämplar'}}
]);

// Länk till spelet för en lucka: ../?uppdrag=<nyckel>&lucka=<n>. Relativ, så att den fungerar både lokalt och på Vercel. Utan lucka (eller utan nyckel) är det bara spelets startvy.
export function gameLink(door,base=GAME_PATH){
  const key=door?.spel?.djup;
  return key?`${base}?uppdrag=${encodeURIComponent(key)}&lucka=${door.n}`:base;
}
