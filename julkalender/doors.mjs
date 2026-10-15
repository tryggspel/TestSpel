// De 24 luckorna. Varje lucka är ett riktigt uppdrag eller en riktig utmaning i Karlstad City (playcanvas-karlstad-2.11).
// Kalendern lägger ingenting i spelet: den länkar in i ett läge som redan finns och läser av resultatet efteråt (rules.mjs).
//
//   typ      utforska | uppdrag | utmaning | resa | butik | final
//   spel     {query, knapp, valj}  query = länkparametrar till spelet ('' = startskärmen), valj = vad man trycker på där
//   check    villkoret som läses av i spelets sparfil, se evaluate() i rules.mjs. 'manual' = spelaren markerar själv
//   demo     true om luckan använder en butiksplats som är en DEMO i spelet (inget samarbete är bekräftat, se PARTNERPLATSER.md)
//   stjarnor 1–3 efter hur mycket det kräver. Summan ger titlarna i RANKS.
//
// Gränser (tröskelvärden för rekord) är satta från spelets egna regler men inte speltestade på riktiga spelare. Justera här.
export const GAME_PATH='../playcanvas-karlstad-2.11/';
export const TYPES=Object.freeze({
  utforska:{label:'Utforska',icon:'flask'},
  uppdrag:{label:'Uppdrag',icon:'flag'},
  utmaning:{label:'Utmaning',icon:'bolt'},
  resa:{label:'Resa',icon:'bus'},
  butik:{label:'Butiksuppdrag',icon:'bag'},
  final:{label:'Julfinal',icon:'tree'}
});
const EXPLORE={query:'',knapp:'Öppna Karlstad City',valj:'CLEAN CITY EXPLORE'};
const PASS='Tryck Ⅱ (paus) och öppna Karlstadpasset. Tryck GÅ DIT vid ';

export const DOORS=Object.freeze([
  {n:1,typ:'utforska',titel:'Första julklappen',plats:'Hela Karlstad',stjarnor:1,
    ledtrad:'Något varmt gömmer sig i varje termos.',
    story:'Zombierna har tömt Karlstad på julklappar och gömt dem i termosar. Tomtens lista har tjugofyra rader, och den första är den enklaste.',
    mal:'Hitta 5 termosar i Clean City Explore.',
    steg:['Öppna spelet och välj CLEAN CITY EXPLORE.','Följ pilarna till närmaste termos. Varje termos är en julklapp.','Plocka fem och kom tillbaka hit. Luckan bockas av själv.'],
    spel:EXPLORE,check:{kind:'count',metric:'thermos',n:5,unit:'termosar'}},

  {n:2,typ:'butik',titel:'Pressbyrån: Fika på minuten',plats:'Kungsgatan 14',stjarnor:2,demo:true,
    ledtrad:'Någon står ensam vid disken. Med en baguette.',
    story:'Julhandeln har börjat och Påtårs-Per står ensam vid disken. Kaffe, bulle och tidning: allt i rätt ordning, och snabbt.',
    mal:'Klara beställningen hos Pressbyrån och få stämpeln i Karlstadpasset.',
    steg:['Välj CLEAN CITY EXPLORE.',PASS+'Pressbyrån.','Tryck TA EMOT ORDER och tryck rätt saker i rätt ordning på 40 sekunder (knapparna eller 1–6). Fel sak kostar 4 sekunder.'],
    spel:EXPLORE,check:{kind:'stamp',id:'pressbyran',label:'Stämpel från Pressbyrån'}},

  {n:3,typ:'uppdrag',titel:'Rädda julklapparna',plats:'Stora Torget → Mitt i City',stjarnor:2,
    ledtrad:'Tre paket, tolv vakter och en lång promenad.',
    story:'Tre julklappstermosar på Torget och tolv zombies mellan dig och Mitt i City. Håll paketen varma och dig själv vid liv.',
    mal:'Klara uppdraget Rädda fikat.',
    steg:['Öppna uppdraget med knappen nedan och tryck STARTA UPPDRAG DIREKT.','Hämta de tre termosarna på Torget.','Följ de gula markörerna till leveransplatsen utanför Mitt i City.'],
    spel:{query:'challenge=radda-fikat',knapp:'Till uppdraget Rädda fikat'},check:{kind:'mission',id:'radda-fikat'}},

  {n:4,typ:'butik',titel:'Cervera: Duka för fikastunden',plats:'Mitt i City, plan 0',stjarnor:2,demo:true,
    ledtrad:'Julserviset har blivit bortgömt bland returerna.',
    story:'Rut i returen har tappat bort julserviset: koppen, kannan och fatet. Hon vågar inte fråga sig själv.',
    mal:'Hitta koppen, kannan och fatet åt Rut och få stämpeln i Karlstadpasset.',
    steg:['Välj CLEAN CITY EXPLORE.',PASS+'Cervera.','Tryck HJÄLP RUT. Koppen står på östra hyllan vid dörren, kannan på cafébordet i atriet och fatet på västra hyllan längst in. Tryck LÄMNA PÅ DISKEN.'],
    spel:EXPLORE,check:{kind:'stamp',id:'cervera',label:'Stämpel från Cervera'}},

  {n:5,typ:'resa',titel:'Julbussen',plats:'Busslinjerna från Torget',stjarnor:1,
    ledtrad:'Chauffören är fortfarande zombie. Håll i dig.',
    story:'Zombiebussen går även i december. Chauffören har inte blivit lugnare av julhandeln, så håll bussen på vägen.',
    mal:'Åk buss till en hållplats i Clean City Explore.',
    steg:['Välj CLEAN CITY EXPLORE.','Gå till en busshållplats, till exempel på Torget, tryck på knappen som dyker upp och välj en linje.','Håll bussen på vägen tills du är framme.'],
    spel:EXPLORE,check:{kind:'count',metric:'rides',n:1,unit:'bussresor'}},

  {n:6,typ:'uppdrag',titel:'Sandgrund: Vernissage från graven',plats:'Sandgrund',stjarnor:3,
    ledtrad:'”Rör inte konsten.” Konsten rör sig själv.',
    story:'Zombie-Lerin har öppnat en vernissage på Sandgrund och besökarna står kvar utanför. En tecknad spelfantasi, men räddningen är på riktigt.',
    mal:'Klara uppdraget Vernissage från graven vid Sandgrund.',
    steg:['Öppna uppdraget med knappen nedan och tryck STARTA UPPDRAG DIREKT.','Gå nära tre besökare. De följer dig till den gröna samlingsplatsen.','Stoppa Zombie-Lerin med solstötar.'],
    spel:{query:'challenge=sandgrund',knapp:'Till Sandgrund'},check:{kind:'mission',id:'sandgrund'}},

  {n:7,typ:'utmaning',titel:'Julrusch: Zombiejakten',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Tre minuter. Tusen poäng. Noll tålamod.',
    story:'Julruschen är här: tre minuter, tusen poäng och zombies som också vill åt klapparna. Ta dig i mål till en tryggzon.',
    mal:'Nå 1 000 XP och ta dig till tryggzonen i Zombiejakten.',
    steg:['Tryck ZOMBIEJAKTEN · 3:00 på startskärmen.','Jaga termosar och skjut solstötar. Vid 1 000 XP öppnas utgången.','Följ den gröna markören till tryggzonen. Rekordet sparas när du är framme.'],
    spel:{query:'',knapp:'Starta julruschen',valj:'ZOMBIEJAKTEN · 3:00'},check:{kind:'record',src:'rush',min:1000,unit:'XP'}},

  {n:8,typ:'utforska',titel:'Skattjakt i staden',plats:'Överallt i Karlstad',stjarnor:2,
    ledtrad:'Hett, varmt, ljumt … brinner!',
    story:'De extra fina klapparna har tomten gömt på riktiga ställen i Karlstad. Varje skatt har en ledtråd, och spelet säger hett eller kallt.',
    mal:'Hitta 3 gömda skatter i Clean City Explore.',
    steg:['Välj CLEAN CITY EXPLORE.','Öppna Fikaalbumet i pausmenyn (Ⅱ) och läs en skatts ledtråd.','Gå dit. Spelet säger LJUMT, VARMT, HETT och BRINNER! när du närmar dig.'],
    spel:EXPLORE,check:{kind:'count',metric:'treasures',n:3,unit:'skatter'}},

  {n:9,typ:'resa',ikon:'boat',titel:'Båtbussen till Mariebergsskogen',plats:'Inre hamn → Mariebergsskogen',stjarnor:3,
    ledtrad:'Passagerarna hoppar överbord. Kaptenen hade visst sjöben.',
    story:'Zombie-båtbussen lägger ut från Inre hamn med tolv passagerare och en kapten som hade visst sjöben. På andra sidan väntar julklapparna i Mariebergsskogen.',
    mal:'Klara båtbussens räddningstur och hämta 3 julklappar (termosar) i Mariebergsskogen.',
    steg:['Kliv ombord med knappen nedan. Tryck på passagerarna: väst på däck, ring i vattnet.','Åk sedan båtbussen i Clean City Explore från Inre hamn till Mariebergsskogen.','Kliv iland och samla tre termosar i parken. Det är klapparna.'],
    spel:{query:'challenge=boat',knapp:'Kliv ombord'},
    check:{kind:'all',of:[{kind:'record',src:'boat',min:1,label:'Räddningsturen klar',unit:'poäng'},{kind:'count',metric:'marieberg',n:3,label:'Julklappar i Mariebergsskogen',unit:'termosar'}]}},

  {n:10,typ:'resa',titel:'BussQuiz: full pott på linjen',plats:'Värmlandstrafiks linjer',stjarnor:2,
    ledtrad:'Chauffören tål inga fel svar.',
    story:'Under bussturen ställer chauffören frågor om Värmlandstrafik. Svarar du fel tittar han bara tyst på dig.',
    mal:'Svara rätt på alla frågor under en busstur.',
    steg:['Välj CLEAN CITY EXPLORE.','Gå till en hållplats och kliv på en buss.','Svara på frågorna under resan. Alla rätt ger full pott.'],
    spel:EXPLORE,check:{kind:'count',metric:'quizPerfect',n:1,unit:'resor med full pott'}},

  {n:11,typ:'utforska',titel:'Julhandla i Mitt i City',plats:'Mitt i City',stjarnor:1,
    ledtrad:'Inomhus, men inte lugnare för det.',
    story:'Gallerian är full av julhandlare och några zombier som bara tittar. Termosarna står mellan skyltarna.',
    mal:'Hitta 4 termosar inne i Mitt i City.',
    steg:['Välj CLEAN CITY EXPLORE.','Öppna kartan och välj Mitt i City som mål.','Gå in i gallerian och plocka fyra termosar.'],
    spel:EXPLORE,check:{kind:'count',metric:'mall',n:4,unit:'termosar i Mitt i City'}},

  {n:12,typ:'butik',titel:'Hjälp personalen på Coop och Clas Ohlson',plats:'Mitt i City',stjarnor:1,
    ledtrad:'Ett kvitto och en skruvask har kommit bort.',
    story:'Kvittot-Kjell på Coop har tappat sitt kvitto och Skruv-Siv på Clas Ohlson sin skruvask. Ingen blir gladare av julhandel.',
    mal:'Hjälp Kvittot-Kjell (Coop) och Skruv-Siv (Clas Ohlson). Det här uppdraget sparas inte i spelet, så luckan markerar du själv.',
    steg:['Välj CLEAN CITY EXPLORE och gå in i Mitt i City.','Gå fram till personalen och tryck HJÄLP.','Hämta KVITTOT respektive SKRUVASKEN och lämna tillbaka den. Markera sedan luckan som klar här.'],
    spel:EXPLORE,check:{kind:'manual'}},

  {n:13,typ:'utmaning',titel:'Lucia: Termosrundan',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Varje termos är ett ljus i mörkret.',
    story:'Luciadagen: ljus i mörkret. Termosrundan är tre minuter där varje termos är ett ljus, och ditt spöke från förra rundan springer bredvid.',
    mal:'Nå 400 poäng i Termosrundan.',
    steg:['Tryck TERMOSRUNDAN · 3 MINUTER på startskärmen.','Plocka så många termosar du hinner på tre minuter.','Din bästa runda sparas som ett spöke du kan springa mot.'],
    spel:{query:'',knapp:'Öppna Karlstad City',valj:'TERMOSRUNDAN · 3 MINUTER'},check:{kind:'record',src:'trail',min:400,unit:'poäng'}},

  {n:14,typ:'uppdrag',titel:'Sista rundan på O’Learys',plats:'Tingvallagatan 9',stjarnor:2,
    ledtrad:'Matchen är slut. Fansen håller inte med.',
    story:'Matchen är slut och zombiefansen vill inte gå hem. Knuffa dem mot HEMGÅNG innan Kapten Övertid dyker upp.',
    mal:'Klara uppdraget Sista rundan.',
    steg:['Öppna uppdraget med knappen nedan och tryck STARTA UPPDRAG DIREKT.','Knuffa tre fans till HEMGÅNG. Gå bakom dem och använd soptunnan för kedjeträffar.','Stoppa Kapten Övertid med solstötar och SUPER.'],
    spel:{query:'challenge=sista-rundan',knapp:'Till O’Learys'},check:{kind:'mission',id:'sista-rundan'}},

  {n:15,typ:'utmaning',titel:'Julrusch: Temporush',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Tempot stiger var femtonde sekund.',
    story:'Julklappsrushen: tempot stiger varje femtonde sekund och nästa termos måste plockas innan fikaklockan går ut.',
    mal:'Nå tempo 6 (SNABBT) i Temporush.',
    steg:['Tryck TEMPORUSH · TEMPOT STIGER på startskärmen.','Följ pilen och ljusstrålen till nästa termos. Tappar du tid tappar du liv.','Håll dig kvar tills tempot är 6.'],
    spel:{query:'',knapp:'Öppna Karlstad City',valj:'TEMPORUSH · TEMPOT STIGER'},check:{kind:'record',src:'tempoLevel',min:6,unit:'tempo'}},

  {n:16,typ:'utforska',titel:'Blixtjul',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Plötsligt står det ett meddelande i bild.',
    story:'Då och då ploppar en blixtutmaning upp: snabbfika, kedjereaktion, turbosprint eller silverjakt. En tunn tidslinje tickar i överkanten.',
    mal:'Klara 3 blixtutmaningar i Clean City Explore.',
    steg:['Välj CLEAN CITY EXPLORE.','Vänta in en blixtutmaning. De kommer av sig själva.','Klara den innan tidslinjen tar slut. Tre klarade räcker.'],
    spel:EXPLORE,check:{kind:'count',metric:'flashDone',n:3,unit:'blixtutmaningar'}},

  {n:17,typ:'utmaning',titel:'Dagens Karlstad',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Alla i staden får samma runda i dag.',
    story:'Alla spelare får samma utmaning samma dag, med nya regler varje gång. En vunnen runda i december räknas.',
    mal:'Vinn en runda av Dagens Karlstad i december (1 000 XP och hem).',
    steg:['Öppna dagens utmaning med knappen nedan och tryck SPELA UTMANINGEN.','Nå 1 000 XP.','Ta dig till tryggzonen innan tiden är slut.'],
    spel:{query:'daily=1',knapp:'Spela dagens utmaning'},check:{kind:'daily',n:1,unit:'vunna rundor'}},

  {n:18,typ:'utforska',titel:'Turbotomten',plats:'Gator och torg',stjarnor:1,
    ledtrad:'Dubbel fart. Utomhus, helst.',
    story:'Tomten hinner inte med en hel stad till fots. Slå på turbon och springa dubbelt så fort.',
    mal:'Kör 1 kilometer i turbo i Clean City Explore.',
    steg:['Välj CLEAN CITY EXPLORE.','Slå på TURBO (knappen på pekskärm, tangent T på dator).','Spring längs gator och torg. Turbon fungerar inte inomhus.'],
    spel:EXPLORE,check:{kind:'count',metric:'turboMeters',n:1000,unit:'meter'}},

  {n:19,typ:'butik',titel:'MusicPartner: checka in på Kungsgatan',plats:'Kungsgatan 6D',stjarnor:1,
    ledtrad:'Ibland räcker det att säga hej.',
    story:'Även zombier behöver musik till julstädningen. Titta in hos MusicPartner på Kungsgatan och checka in.',
    mal:'Checka in hos MusicPartner på Kungsgatan.',
    steg:['Välj CLEAN CITY EXPLORE.','Gå till MusicPartner på Kungsgatan 6D (se kartan).','Tryck CHECKA IN. Du kan checka in en gång per dag.'],
    spel:EXPLORE,check:{kind:'count',metric:'checkins',n:1,unit:'incheckningar'}},

  {n:20,typ:'butik',titel:'Bonus: Fullt pass',plats:'Karlstadpasset',stjarnor:1,
    ledtrad:'Alla stämplar på samma sida.',
    story:'Karlstadpasset är fullt när du har en stämpel från varje butik som har ett uppdrag. Det är en bonus som kommer av sig själv när du gjort butiksluckorna.',
    mal:'Samla alla stämplar i Karlstadpasset.',
    steg:['Gör butiksuppdragen från lucka 2 och 4 (Pressbyrån och Cervera).','Öppna Karlstadpasset i pausmenyn (Ⅱ) och kontrollera att passet är fullt.','Märket Fullt pass dyker upp i Fikaalbumet.'],
    spel:EXPLORE,check:{kind:'badge',id:'pass-all'}},

  {n:21,typ:'utmaning',titel:'Kombo-nissen',plats:'Hela Karlstad',stjarnor:2,
    ledtrad:'Nästa termos måste komma innan fönstret stängs.',
    story:'En kedja startar när du hittar nästa termos inom några sekunder. Ju längre kedja, desto större gåva.',
    mal:'Få en kombokedja på 8 termosar.',
    steg:['Välj CLEAN CITY EXPLORE.','Plocka en termos och leta direkt upp nästa. Kedjan går ut om du tar för lång tid.','Tonerna stiger för varje termos i kedjan. Åtta räcker.'],
    spel:EXPLORE,check:{kind:'record',src:'chain',min:8,unit:'i kedja'}},

  {n:22,typ:'utmaning',titel:'Julrusch: Galet tempo',plats:'Hela Karlstad',stjarnor:3,
    ledtrad:'Två minuter utan att blinka.',
    story:'Nu blir julruschen på allvar. Tempot stiger tills det är rent galet, och klockan till nästa termos blir allt kortare.',
    mal:'Nå tempo 9 (GALET) i Temporush.',
    steg:['Tryck TEMPORUSH · TEMPOT STIGER på startskärmen.','Plocka termosar snabbt, så får du flytbonus.','Håll dig kvar till tempo 9, ungefär två minuter in.'],
    spel:{query:'',knapp:'Öppna Karlstad City',valj:'TEMPORUSH · TEMPOT STIGER'},check:{kind:'record',src:'tempoLevel',min:9,unit:'tempo'}},

  {n:23,typ:'utmaning',titel:'Lilla julafton: Zombiejakten',plats:'Hela Karlstad',stjarnor:3,
    ledtrad:'Slå ditt rekord från i går.',
    story:'Lilla julafton. Julruschen är som värst, och poängen ska vara högre än någonsin. Tidsbonusen räknas med.',
    mal:'Nå 1 300 poäng (XP plus tidsbonus) i Zombiejakten.',
    steg:['Tryck ZOMBIEJAKTEN · 3:00 på startskärmen.','Nå 1 000 XP fort. Varje sekund som är kvar ger två bonuspoäng.','Ta dig till tryggzonen. Rekordet sparas när du är framme.'],
    spel:{query:'',knapp:'Starta julruschen',valj:'ZOMBIEJAKTEN · 3:00'},check:{kind:'record',src:'rush',min:1300,unit:'poäng'}},

  {n:24,typ:'final',titel:'Julafton: Fikapanik på Stora Torget',plats:'Stora Torget',stjarnor:3,
    ledtrad:'Alla har samlats på torget.',
    story:'Julafton. Alla zombier har samlats på Stora Torget för att ta tillbaka sina klappar. Klara tre vågor, så tänds granen och julen är räddad.',
    mal:'Klara Fikapanik: tre vågor på Stora Torget.',
    steg:['Öppna uppdraget med knappen nedan och tryck STARTA UPPDRAG DIREKT.','Rensa tre vågor: 6, 8 och 10 zombies. Spring, vänd och skjut solstötar.','Sprint-Steffe är snabb och Termos-Torsten tål mer. Ny våg ger liv och solenergi.'],
    spel:{query:'challenge=fikapanik',knapp:'Till Stora Torget'},check:{kind:'mission',id:'fikapanik'}}
]);

// Länk till spelet för en lucka. Relativ, så att den fungerar både på GitHub Pages och lokalt.
export function gameLink(door,base=GAME_PATH){
  const q=door?.spel?.query||'';
  return base+(q?'?'+q:'');
}
