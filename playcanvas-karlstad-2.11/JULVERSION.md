# Julklappsjakten – 2.21-XMS (julgrenen)

Julversionen är ett **fristående bygge av samma spel**, inte en kopia av spelmappen. Den bor på en egen Git-gren, ska byggas av ett eget
Vercel-projekt och få en egen adress. Grundspelet fortsätter på `main` med sitt eget Vercel-projekt och sin egen adress.

## 1. Utgångsläge (dokumenterat före arbetet)

| Vad | Värde |
|---|---|
| Repository | `tryggspel/TestSpel`, spelkatalog `playcanvas-karlstad-2.11/` (trots versionsnumret 2.x) |
| Senast verifierade version enligt uppdraget | 2.20.0, commit `fdf675a8cc03da8dbc3c35877225cd90e95203ca` |
| `main` när arbetet började | **2.21.1**, commit `fadc36ad65078401e1a751c9236c1577d1bc5de8` (nyare förbättringar bevarade: butiksuppdrag och Karlstadpasset 2.21.0–2.21.1) |
| Julversionen bygger på | `fadc36ad65078401e1a751c9236c1577d1bc5de8` |
| Befintligt Vercel-projekt | `karlstad-city-visual-twin` (`prj_VsGY8BEV27Zr0CGIqpBxBWkRpyoY`), team `kmauritz-7561` (`team_R8VGNJRdhhNZtekaQs1aoVVp`), följer `main`; projektets rotkatalog är spelmappen (funktionerna i `api/` ligger där) |
| Grundspelets produktionsadress | https://karlstad-city-visual-twin.vercel.app/ (produktionsdeployen är `main` @ `fadc36a`, `dpl_FwuTrU4TtDo7Gis1UXzckwUgj4WP`; orörd av jularbetet) |
| **Julprojektet (Vercel)** | `karlstad-julklappsjakten` (`prj_VN5TE5HguK955hdkuGdIw8FWvzDl`), samma konto som grundspelets projekt, rotkatalog `playcanvas-karlstad-2.11`, kopplat till `tryggspel/TestSpel`. Se avsnitt 4. |
| **Julversionens stabila adress** | https://karlstad-julklappsjakten.vercel.app/ |
| Återställningspunkt (gren) | `backup/jul-2026-baseline-2.21.1-fadc36a` = `fadc36ad65078401e1a751c9236c1577d1bc5de8` |
| Git-tagg | `jul-2026-baseline-2.21.1` finns lokalt men **kunde inte pushas**: fjärren svarar HTTP 403 på alla tagg-pushar från den miljö som byggde julversionen. Skapa den själv: `git tag -a jul-2026-baseline-2.21.1 fadc36a && git push origin jul-2026-baseline-2.21.1` (eller GitHub → Releases → Draft a new release på den commiten). |

GitHub Pages-arbetsflödet `Deploy Karlstad City Mobile` publicerar bara `main`; det berörs inte av julgrenarna.

## 2. Grenar och versioner

| Gren | Syfte | Vercel |
|---|---|---|
| `main` | Grundspelet (2.21.x). Får bara julknappen och navigeringen som behövs. **Ingen julkod slås ihop hit.** | `karlstad-city-visual-twin`, produktion |
| `release/jul-2026` | Julversionen. Det som ligger här är det som publiceras som julspelet. | Julprojektet `karlstad-julklappsjakten` (stabil adress, se avsnitt 4) |
| `claude/stoic-tesla-59znyc` | Utvecklingsgren för julversionen. Flyttas fram till `release/jul-2026` när den är verifierad. | Förhandsvisningar |
| `feature/julknapp-grundspelet` | Grundspelets julknapp (2.21.2), byggd från `main`. Förberedd men avstängd. Se avsnitt 9. | Förhandsvisning av grundspelet |
| `backup/jul-2026-baseline-2.21.1-fadc36a` | Återställningspunkt = grundspelet före allt jularbete. | – |

Julversionens ändringar slås **inte** ihop med `main`. Förbättringar i grundspelet förs över till julgrenen med granskade Git-ändringar
(`git switch release/jul-2026 && git merge main`, lös konflikter i de få filer som julgrenen rör (avsnitt 5), kör testerna).

Versionsbeteckning: `X.Y.Z-xmas.N`, där `X.Y.Z` är basversionen på `main` och `N` räknar julbyggen (**`2.21.1-xmas.2`**). Det synliga namnet är
**Julklappsjakten – 2.21-XMS**. `node tools/set-version.mjs 2.21.1-xmas.3` (nästa bygge) sätter en enda cache-nyckel i alla moduler, HTML och CSS
(testet `version.test.mjs` och CI kräver att den är densamma överallt). Samma beteckning visas i startvyn (längst ned), i `window.KarlstadRound.version`,
i `?debug` och i `/api/build-info`.

## 3. Sammanhängande bygge (inga blandade filer)

- Inga imports till andra spelversioner, ingen kod hämtas från grundspelets adress, **ingen service worker** (testas i `tests/xmas-build.test.mjs`).
- Alla moduler, HTML och CSS bär samma `?v=`-nyckel, så en ny version kan aldrig blanda gamla och nya filer i webbläsarens cache.
- Julmusiken syntetiseras i spelet: inga ljudfiler laddas ner (grundspelets mp3 hämtas först om jukeboxen används).
- Spelmotorn (PlayCanvas 2.22.4) hämtas från jsDelivr med fast version, som i grundspelet.
- Startvyn visar `Julklappsjakten – 2.21-XMS · bygge 2.21.1-xmas.2 · <miljö> <gren> <commit> · bas 2.21.1 (fadc36a)`. `/api/build-info` (Vercel-funktion)
  ger deployens commit, gren och miljö; lokalt visas "lokalt bygge".

## 4. Vercel-projektet för julversionen

**Status:** projektet är skapat och första deployen är klar. Adressen har kontrollerats mot Vercels API men **inte öppnats i någon webbläsare av den som byggde den** (se avsnitt 8).

| | |
|---|---|
| Projekt | `karlstad-julklappsjakten` (`prj_VN5TE5HguK955hdkuGdIw8FWvzDl`), konto `team_R8VGNJRdhhNZtekaQs1aoVVp` (scope `kmauritz-7561`): samma som grundspelets projekt `karlstad-city-visual-twin` |
| Stabil adress | https://karlstad-julklappsjakten.vercel.app/ (projektets enda domän, verifierad) |
| Första deployen | `dpl_msrvXvBQp11YLWdZUNDYJD1Dud7G`, gren `release/jul-2026`, commit `f592db03374ab1432c4e9c827bd74e5bb29f9b2f`, klar (READY) efter ca 8 s. Vercel gör den första deployen i ett nytt projekt till produktion, oavsett gren. |
| Inställningar | Rotkatalog `playcanvas-karlstad-2.11`, inget ramverk, inget build-kommando, ingen output-katalog (statiska filer + funktionerna i `api/`). Vercel Authentication som i grundspelet (`all_except_custom_domains`: produktionsadressen öppen, förhandsvisningar bakom inloggning). System-miljövariabler exponeras så att `/api/build-info` kan visa commit. *Ignored Build Step* så att bara `release/jul-2026` och `claude/*` byggs: `case "$VERCEL_GIT_COMMIT_REF" in release/jul-2026\|claude/*) exit 1;; *) exit 0;; esac` |
| Grundspelets projekt | Orört. Produktion är fortfarande `main` @ `fadc36a`. (Det projektet bygger förhandsvisningar av alla grenar som pushas, även julgrenarna, eftersom det är kopplat till samma repository. De är bakom inloggning och påverkar inte grundspelets adress.) |

### Det som återstår för dig (kunde inte göras härifrån)

1. **Sätt Production Branch till `release/jul-2026`**: Vercel → `karlstad-julklappsjakten` → *Settings → Git → Production Branch*. Standardvärdet för ett nytt projekt är repots huvudgren `main`; det gick varken att läsa eller sätta via det API som byggmiljön hade.
   Tills dess blir nya pushar till `release/jul-2026` förhandsvisningar och den stabila adressen står kvar på den senaste produktionsdeployen (en säker standard: adressen ändras bara när du vill). Ett senare bygge kan också släppas med *Promote to Production* på en förhandsvisning.
2. **Öppna https://karlstad-julklappsjakten.vercel.app/ på riktiga enheter** och gå igenom kontrollistan i avsnitt 8. Kontrollera även i ett privat fönster (utan Vercel-inloggning) att adressen är öppen, och att `https://karlstad-julklappsjakten.vercel.app/api/build-info` visar `"branch":"release/jul-2026"` och rätt commit.
3. Valfritt: hindra att grundspelets projekt bygger julgrenarna. I `karlstad-city-visual-twin` → *Settings → Git → Ignored Build Step*: `case "$VERCEL_GIT_COMMIT_REF" in release/jul-2026|claude/*|backup/*) exit 0;; *) exit 1;; esac` (0 = hoppa över bygget, 1 = bygg).
4. Koppla in julknappen i grundspelet när punkt 2 är klar (avsnitt 9).

### Kontroll före varje publicering (team, projekt, gren, commit)

1. Rätt konto och projekt: `karlstad-julklappsjakten` (`prj_VN5TE5HguK955hdkuGdIw8FWvzDl`), **inte** `karlstad-city-visual-twin`.
2. Rätt gren: produktion byggs bara från `release/jul-2026`; förhandsvisningar kommer från `claude/*`.
3. Rätt commit: `git log -1 release/jul-2026` ska stämma med `/api/build-info` och med raden längst ned i startvyn.
4. Förhandsvisningen först: öppna den, kör introduktionen, kontrollera att knappen Tillbaka leder till grundspelets adress, och publicera därefter (Production Branch eller *Promote to Production*).
5. Grundspelets projekt och adress ska vara oförändrade (öppna https://karlstad-city-visual-twin.vercel.app/ och kontrollera att versionen är den väntade).

### Skapa projektet från grunden (om det tas bort)

Vercel → *Add New… → Project* → importera `tryggspel/TestSpel`; projektnamn `karlstad-julklappsjakten`; *Root Directory* `playcanvas-karlstad-2.11`; *Framework Preset* Other, inget build-kommando eller output-katalog;
*Production Branch* `release/jul-2026`; *Deployment Protection → Vercel Authentication* som i grundspelets projekt; *Automatically expose System Environment Variables* på; *Ignored Build Step* enligt tabellen ovan.

## 5. Vad som ändrats i grundspelets filer (för framtida sammanslagningar från `main`)

All julkod ligger under `xmas/` (23 filer), `tests/xmas-*.test.mjs` (7 filer) och `tools/xmas-flow/` (3 verifieringsskript). Grundspelets egna filer är rörda så här (utöver cache-nyckeln `?v=` som byts överallt):

| Fil | Ändring |
|---|---|
| `app.js` | Snöfilter (`ComicMesh.snow`), vinterfärger för mark, vägar och himmel, inga XP-kulor på torget, julens kollisionsrutor, ingen snö inomhus, julmusiken (grundspelets mp3 hämtas lazy); JulRushen: `musicTempo` styr även julmusikens tempo och stämningen `rush` ligger kvar (tre rader) |
| `last-round.js` | Importerar och startar `installXmas`, tömmer termosar, hindrar Halloween-jakt, panellistan, HUD-hook, radar-hook, tomtezombie-bilder, butiksuppdrag med julens platser |
| `journey-rules.mjs` | `objective()`-hook, `stepExplore()` och zombie-`step()` anropar paketjakten, `finish()` ger Tomtezombies eget slut |
| `index.html` | Titel, tre julpaneler, länk till `xmas/xmas.css`, pausmenyns rubrik, ingen preload av mp3; JulRushen: två knappar `JULRUSHEN` med förklaring (startvyn och fortsättningsmenyn) |
| `journey-view.js` | JulRushen: tre villkor (`journey.xmas?.rushMode`) som döljer grundspelets termoskort, cyanfyr och radarprickar medan JulRushen går (den ritar sina egna paket i `xmas/xmas-view.js`) |
| `city-architecture.js` | `ComicMesh.tri` kan färgfiltrera triangeln efter normalen (snö) |
| `city-missions.mjs`, `city-rush.mjs`, `field-research.mjs` | Zombienamn: Paket-Pelle, Stress-Nisse, Gröt-Gunnar, Guld-Nisse |
| `city-guidance.mjs` | Pilfärgen `xmas` (röd mot snön) |
| `place-art.js`, `places-view.js` | `registerProp()` för julens föremål, menytavlans rubrik följer uppdragets namn |
| `audio-engine.mjs` | `bus()` så att syntetiserad musik delar musikbuss, master och mute |
| `api/build-info.mjs`, `build-info.mjs`, `version.json`, `tools/set-version.mjs` | Versionsbeteckning med `-xmas.N` och deployens commit |
| `tests/work-recovery.test.mjs` | Regeln för modulernas cache-nyckel tillåter suffixet `-xmas.N` (en rad) |
| `.github/workflows/karlstad-2.11-tests.yml` | Testerna körs även vid push till `release/**` och `claude/**` (grundspelet körs som förut på `main` och pull requests) |

Kontrollerat med diff mot `fadc36a` (utan cache-nyckeln): inga andra av grundspelets filer är ändrade. Fasadmodulerna (`kungsgatan-reference.mjs`,
`photo-reference-pass3.mjs`, `residenset-facade.mjs`, `opera-facade.mjs`, `innerstad-reference.mjs`) är byte-för-byte oförändrade, så Kungsgatan 14, 16 och 18 är orörda.

## 6. Julversionen i korthet

Startvyn: **JULKLAPPSJAKTEN 🎁** (mysigt, inga zombier), **JULRUSHEN** (TempoRush med paket), **TOMTEZOMBIES** (eget läge med zombier och kuslig musik), **← Tillbaka till Karlstad-spelet**.
Egen sparning: `karlstad-xmas:save:1` (julstämplar, rekord, summor, vädervalet) och grundspelets spelstatus under prefixet `xmas:` (`xmas:karlstad:*`).
Grundspelets sparfiler på den egna adressen rörs aldrig (andra adress = annan webbläsarlagring, och prefixet gör det dubbelt säkert).

| Läge | Vad |
|---|---|
| Introduktionen | Start söder om granen, vänd mot den med den första paketgruppen rakt framför (granen och paketen syns på samma bild, även på en stående telefon som bara ser ca 38° i sidled). Sedan 30 paket + 3 bonuspaket längs en spiral runt granen på Stora Torget (252 m), mål 20, tomte vid slutet. Inget tidskrav. Grupperna ligger 15–20 m isär. Gångtid (beräknad av väglängd och gångfart, inte mätt med en människa): 20 paket och leverans 23–39 s, hela slingan med alla 30 paket 34–58 s; med tid att läsa målet och titta sig omkring blir det 60–90 s. |
| Julrundor (2–3 min) | Torgets paketregn, Kungsgatans julrunda, Drottninggatans julrunda: rutten byggs ur stadens egen gångbara karta, 75 vanliga paket + 3 bonus, mål drygt hälften, mjuk tid som bara ger tidsbonus. |
| Butiksuppdrag | Cervera: Tomtarnas fikabord (kopp, kanna, fat). Pressbyrån: Tomtarnas fikaorder (kaffe, lussebulle, pepparkaka …) och leverans till tomten utanför. Förberett (osynligt): Kjell & Company, Åhléns, Duvan, Värmlands Museum, Sandgrund. Inga erbjudanden eller samarbeten påstås. |
| Fri julvandring | Tomtarna tappar ett nytt paketregn med jämna mellanrum (egna paket-ID, tydlig varning, försvinner efter 4 minuter). |
| Tomtezombies | Grundspelets zombieregler (AI, rörelse, pooler, högst sex aktiva, patruller, ambushar, Guld-Nisse) med julens bilder. Paket är mål och ammunition. Eget slutkort. |
| JulRushen | TempoRush i julens värld: ett paketband längs gatorna, tempot stiger var 15:e sekund, tre liv, julgåvor, rekord och en julstämpel. Se 6.1. |

Kombo, poäng och belöningar: 10 poäng per paket, ×2/×3/×4 vid 4/8/12 i rad (engångsbonus 20/40/60), bonuspaket 50, leverans 100 + tidsbonus upp till 100.
Fångstfältet är detsamma som för termosar i 2.20.0 (växer med farten, ingen insamling genom väggar). Gångfarten är 7,2 m/s (grundspelet).

### 6.1 JulRushen – TempoRush med paket

**JULRUSHEN** finns i startvyn och i fortsättningsmenyn. Det är grundspelets TempoRush (tempot stiger var 15:e sekund, tre liv, en klocka till nästa mål) i julens värld.
Banan, klockan, fångstfältet och pilen är **grundspelets egna**: julkoden anropar `journey.supplyTempo`, `pickTempoTarget`, `tempoAim`, `inCatch` och använder `journey.tempo`.
Det som är jul är paketen, gåvorna, poängen, namnen, musiken och gränssnittet. Julkoden skriver aldrig i grundspelets händelsekö, så grundspelets termosmeddelanden för tempo körs aldrig.

| Del | Så fungerar det |
|---|---|
| Start | På Stora Torget, vänd åt det håll där banan får den längsta fria gatusträckan (grundspelets `planHeading` prövas i tre riktningar). Banan läggs ut i första bildrutan från spelarens verkliga plats och riktning. |
| Banan | Ett pärlband av paket längs långa, fria sträckor, 150–320 m framåt, 11,5 m mellan paketen på tempo 1 och 28 m på tempo 12. Aldrig i väggar, stånd, granar eller vatten (kontrollerat mot spelets egna kollisioner); sträckorna viker av vid hinder och följer gator där det finns gatudata. Hamnar man långt från banan (bussresa, omväg) börjar den om vid spelaren. Samma omplanering (grundspelets `anchorCourse`, när nästa paket ligger över 55 m bort) sker också när banan viker tillbaka längs samma gata (grundspelet släpper de paket som spelaren redan "passerat" längs deras riktning) och när ett tomtebloss tagit paketen framför. Det kostar inget liv; i provet på stadens gator (200 s speltid till tempo 12) skedde det 5–7 gånger. |
| Klockan | Tempo 1–12, nytt tempo var 15:e sekund: fart ×(1 + 0,08 per steg), högst ×1,9, och poäng ×(1 + 0,3 per steg). Tre liv. Tiden till nästa paket är sträckan med omväg vid 85 % av tempots fart plus en marginal som krymper från 9 s (tempo 1) till 2,2 s; går den ut tappar man ett liv. Första paketet ligger ca 12 m bort med ca 12 s på klockan. |
| Fångst | Som i TempoRush: `tempoReach` (3,6 m på tempo 1, upp till 6,5 m) eller `catchReach(fart)`, hela sträckan sedan förra steget räknas och fri sikt krävs (ingen fångst genom väggar). |
| Poäng | Vanligt paket 10 × kedjefaktor (×2/×3/×4 vid 4/8/12 i rad som i jakten, engångsbonus 20/40/60), guldpaket 50. Därefter tempots poängfaktor och **flyt**: +12 × tempo om paketet tas med minst hälften av klockan kvar. Julstjärnan (×2) och Guldklappen (×3) gäller ovanpå. |
| Guldpaket | Guldpaketen är grundspelets förmågebärare: var sjätte pärla är alltid ett, plus de som dagens förmågefördelning ger, så ungefär vart femte paket. Varje guldpaket ger en av sju julgåvor (tabellen nedan). |
| Pil och stråle | Grundspelets stora riktningspil (siktar en bit längre fram på banan) och kantmarkörer när målet är utanför bilden, på en mörk platta mot snön. Nästa paket är större och har en hög grön ljusstråle (smal på nära håll, bredare på långt håll) och en ring på marken. Guldpaketen har gyllene strålar. Radarn visar paketen och nästa paket som en grön ring (på kanten om det ligger utanför). |
| Gränssnitt | Överst: TEMPO och nivån, en stapel för tiden till nästa paket (röd och blinkande under 30 %), liv som hjärtan. Under: tempots namn och poäng, kombo, och aktiva gåvor som små brickor. Slutkort med tempo, paket, bästa kombo, tid, gåvor, rekord och julstämpel. |
| Stämpel och rekord | Julstämpeln **JULRUSHEN** delas ut första gången man når tempo 5 (stämpelräknaren går från 7 till 8). Rekordet (poäng, tempo, paket, tid, guldpaket) sparas i `karlstad-xmas:save:1`. Mot titlarna (NYFIKEN … ÖVERTOMTE) räknas en tiondel av poängen, eftersom tempofaktorerna gör en rush ungefär tio gånger större än en jakt. Att ge upp via pausmenyn (JULMENY) sparar körningen som en förlust om den hade minst ett paket; en körning utan paket sparas inte. |
| Musik | Egen stämning `rush` (G – D – Em – C, 116 slag/min, slädklockor på varje åttondel, mjuk puls på varje slag). Tempot följer nivån (×1,00 → ×1,33), som grundspelets musik gör i TempoRush. |
| Nivånamn | JULMYS (1–2), GLÖGGFART (3–4), SLÄDFART (5–6), RENRACE (7–8), JULSTRESS (9–10), TOMTEGALET (11–12). |

Julgåvorna ersätter grundspelets tolv förmågor:

| Gåva | Effekt | Tid |
|---|---|---|
| RENSLÄDEN | Farten fördubblas (grundspelets raketförmåga, som turbon räknar med) | 7 s |
| JULSTJÄRNAN | Dubbla poäng och 2 m större fångstfält | 9 s |
| JULKLOCKAN | +8 s till nästa paket | – |
| GLÖGGPAUS | Klockan till nästa paket står still (tempot går vidare) | 7 s |
| GULDKLAPPEN | Allt ger tre gånger så mycket | 20 s |
| TOMTEBLOSS | Tar alla paket i en rak linje framför dig (högst 16, inom 80 m och ±6 m) | – |
| PEPPARKAKSSKÖLD | Räddar ett liv nästa gång klockan går ut (+5 s), högst två åt gången; den sällsyntaste gåvan | – |

Skillnader mot grundspelets TempoRush: grundspelets termosbaserade förmågor bomb, bönregn, spöke, sonar, hoppstövlar och kombosköld finns inte i julen (de hade ingen funktion i en bana av paket),
och JULKLOCKAN lägger sina åtta sekunder på *nästa* mål även om den plockas mellan två mål. I grundspelets TempoRush försvinner den tiden när nästa mål väljs (kontrollerat med grundspelets egen kod: `takeItem` plockar först, lägger sedan till tiden, och `setTarget` skriver över den). Det är lämnat som det är i grundspelet (`main` är orört).


## 7. Prestanda och mätningar

**Mätt här (headless Chromium med SwiftShader, 414×896, programvaruritning): relativa jämförelser, inte mobilprestanda.** Mätningarna är gjorda på commit `39f30d8` och har inte upprepats efter slutjusteringarna (startpunkt, mindre upplockningspuff, resultatkort), som inte ökar kostnaden.

| Mått (samma rutt, samma upplägg) | Grundspelet (Clean City Explore) | Julklappsjakten (introduktionen) |
|---|---|---|
| Ritanrop, snitt (max) | 88 (198) | 97 (206) |
| Bildruta, median / p95 (programvaruritning) | 200 / 300–367 ms | 233–250 / 433–450 ms |
| Laddningstid till start | 15,9 s | 14,1–15,5 s |
| JS-minne efter rutten | 133–139 MB | 117–132 MB |
| JS-tid per bildruta för julens delar (decor, vy, gränssnitt, paketmotor) | – | 0,4 ms |

- Julens delar kostar knappt någon CPU (0,4 ms per bildruta på servern). Skillnaden i programvaruritning är fyllnad (genomskinliga bildkort), vilket en riktig GPU hanterar mycket lättare, men det är **inte mätt på någon telefon**.
- A/B i samma miljö visade att det stora mjuka skenet i snön kring granen var den dyraste enskilda delen; det är borttaget. Snöfallet (en enda mesh, 100 flingor) kostade inget mätbart.
- Automatisk lättnad: spelet mäter riktiga bildrutetider; ligger de över 40 ms i tre sekunder halveras snöfallet, tomtefönstren försvinner och blinkningen blir långsammare, därefter minimala effekter. Sparas inte (nästa start prövar full kvalitet). Av i automatiska tester (`navigator.webdriver`), `?gov` tvingar på, `?nogov` stänger av.
- Användaren kan själv minska eller stänga av vädereffekterna (PAUS → VÄDEREFFEKTER: FULLT / LÄTT / AV).
- **JulRushen** (mätt i samma mjukvaruritade miljö, `tools/xmas-flow/rush.mjs`): att välja startriktning (tre planeringar av banan) tar 12–20 ms; läggningen av banan (`supplyTempo`, fyra gånger i sekunden) kostar i snitt 0,07 ms och högst 4–7 ms per anrop under 60–75 s spel. Det är grundspelets egen banplanering, som TempoRush redan använder. Fartens effekter (turboeffekten) och paketen är platta bildkort som i övriga julläget, plus en hög genomskinlig stråle. Ingen bildfrekvens är mätt för JulRushen, varken här eller på en riktig enhet; den automatiska lättnaden (se ovan) gäller även JulRushen.
- **Så mäter du på en riktig enhet**: öppna spelet med `?perf` (både grundspelet och julversionen), gå samma runda (introduktionen är samma ruta som Clean City Explore från Torget), vänta tills mätningen är klar och tryck KOPIERA RESULTAT. Prioritera iPhone 11/Safari och MacBook Air 2018.

## 8. Vad som är verifierat, och vad som inte är det

**Utrustning som faktiskt använts:** en Linux-container med headless Chromium 141 och mjukvaruritning (SwiftShader), utan GPU. Skärmstorlekar som provats:
mobilformat 414×896 med emulerad tryckskärm, liggande telefon 896×414 och skrivbord 1000×640. **Ingen riktig telefon eller Mac, ingen Safari/WebKit.**

**Automatiskt:** `node --test tests/*.mjs` (432 tester, alla gröna; 28 av dem är nya för JulRushen) och CI-jobbet `Karlstad 2.11 tests` på `claude/stoic-tesla-59znyc` och `release/jul-2026`.

**Webbläsarflöden (riktigt spel, riktig tryckning på knapparna, flyttning av spelaren; inga mocker).** Verifierad kod: commit `6cbffce` (JulRushen, 2.21.1-xmas.2); commits därefter ändrar bara dokumentation.

| Verktyg | Vad | Resultat |
|---|---|---|
| `tools/xmas-flow/flow.mjs` (mobil 414×896) | startvy och version → introduktionen (mål 20, 30 + 3 paket, paketen syns, målet visas, leverans, resultatkort, stämpel) → sparning i egna nycklar och efter omladdning → tre rundor (Kungsgatan spelad hela vägen) → miljön (8 stånd, granar, ljusslingor, snö utomhus men inte inomhus, ~6 tomtar nära) → Pressbyrån (beställning och leverans) och Cervera → Tomtezombies (4 typer, högst sex aktiva, tagen, försök igen) → inga zombier i Julklappsjakten → väder av/på, mute → tillbaka-knapparna → inga konsolfel | **37/37 OK** (omkörd på JulRushen-bygget 2.21.1-xmas.2: oförändrat resultat) |
| `tools/xmas-flow/flow.mjs` (skrivbord 1000×640) | samma | **37/37 OK** (omkörd på 2.21.1-xmas.2) |
| `tools/xmas-flow/switch.mjs` (mobil 414×896) | grundspelet (med julknappen) → julversionen → tillbaka, i samma flik, grundspelets sparade framsteg kvar | **8/8 OK** (omkörd på 2.21.1-xmas.2) |
| `tools/xmas-flow/rush.mjs` (mobil 414×896, liggande 896×414, skrivbord 1000×640) | **JulRushen:** knappen i startvyn (≥ 48 px) → start (läge, tempo 1, tre liv, rusmusik, inga zombier, pil, stråle, paket, HUD) → en bot följer spelets egna mål i speltid: ≥ 25 paket, tempo 3, inga förlorade liv, guldpaket ger gåvor som syns som brickor, inga paket i väggar, stånd eller granar (≈ 66 paket kontrollerade mot spelets kollisioner), fart och poängfaktor stiger, turbo-effekten ligger på → brådskande klocka (HUD och pil röda) → tre missade klockor ger ♥♥♡ → ♥♡♡ → ♡♡♡ och slutkort → rekordet sparas under julbyggets nyckel utan att något skrivs under grundspelets nycklar → EN RUSH TILL börjar om från noll → pausmenyn fryser klockan och JULMENY sparar körningen och städar banan, farten och musiken → tempo 5 ger julstämpeln (kortet, stämpeln, sparningen, 8 stämplar) → Julklappsjakten startar som förut efter en rush (inga rushdelar kvar) → fortsättningsmenyn → alla gåvor syns som brickor (släde dubblar farten) → planeringens kostnad → inga konsolfel | **35/35 OK på varje skärmstorlek** (mobil, liggande, skrivbord) |
| `tools/xmas-flow/rush.mjs` med `LONG=1` (mobil 414×896) | en bot följer banan på stadens riktiga gator i 200 s speltid till tempo 12: inget liv förlorat, 145 paket, inget av 280 paket på ogångbar mark, banan lades om 5 gånger (grundspelets omplanering, se 6.1), planeringen i snitt 0,16 ms (värsta 22 ms), JS-minnet +10 MB under körningen | **39/39 OK** |
| Vercel (via API, `karlstad-julklappsjakten`) | projektet finns i samma konto som grundspelets, endast domänen `karlstad-julklappsjakten.vercel.app`, första deployen klar (READY), gren `release/jul-2026`, commit `f592db0`, alias tilldelade utan fel; grundspelets produktionsdeploy oförändrad (`main` @ `fadc36a`) | **kontrollerat** (men adressen är inte öppnad i någon webbläsare) |
| engångsskript (ej incheckade) | fritt paketregn (5–6 paket på 43–48 m håll, alla nåbara, inga dubbla poäng, försvinner efter sin tid), liggande telefon, A/B-prestanda, musik renderad och analyserad | körda, se avsnitt 7 |

Verktygen körs mot en lokal server (se rubriken i varje fil). Ett fel som först syntes (Cervera efter Pressbyrån) berodde på att grundspelets resultatkort ligger kvar i 14 s och tar det första knapptrycket vid nästa plats: grundspelets eget beteende, inte ett fel i julkoden.
Testet trycker nu FORTSÄTT som en spelare gör, och julversionen stänger kortet själv när ett nytt läge startar.

**Inte verifierat (finns inte i den här miljön):**
- iPhone 11/Safari och MacBook Air 2018: bildfrekvens, känsla, värme, minne, WebKit-specifikt beteende (tyst läge, låsskärm/bakgrund, `100dvh`, pekkänsla).
- Riktig GPU-prestanda. De mätningar som finns är jämförelser mellan grundspelet och julversionen i samma mjukvaruritade miljö.
- Hur musiken *låter*, inklusive JulRushens (`rush`, 116 slag/min, tempot följer nivån). Den är provrenderad i riktig webbläsare och analyserad (ingen klippning, topp 0,26) men ingen människa har lyssnat.
- **Hur JulRushen känns att spela**: balansen (hur snabbt tempot stiger, hur ofta gåvor kommer, hur svåra klockorna är) är TempoRushs egna siffror, och guldpaketen kommer ungefär vart femte paket. Boten är lika snabb som spelet kräver och säger inget om hur en människa med tummarna klarar tempo 6–12.
- Vercel: att adressen faktiskt öppnas och startar spelet (byggmiljöns nätverkspolicy blockerar `*.vercel.app`, och Vercels skyddslänk kräver en behörighet som anslutningen saknade), att `/api/build-info` visar rätt commit i en riktig deploy, Git-taggen, Production Branch-inställningen och att knappen leder till den riktiga adressen. Vercels bygglogg kunde inte läsas (samma behörighet); deployen är klar enligt API:t.

### Kontrollista för riktig enhet (iPhone 11/Safari, MacBook Air 2018)

1. Öppna förhandsvisningen. Raden längst ned i startvyn ska visa rätt version och commit (jämför med `git log -1 release/jul-2026`).
2. Spela introduktionen (en till två minuter). Jämn bildfrekvens? Snöfallet, texten i HUD:en, styrspaken och HOPPA/TURBO med tummarna, paketen och granen i första bilden.
3. Ljud: musiken ska starta efter första trycket, mute ska tysta den, den ska tystna när sidan läggs i bakgrunden eller skärmen låses och komma tillbaka. Prova även med iPhonens tysta läge på (iOS tystar Web Audio med ringreglaget).
4. `?perf` på båda byggena (grundspelet och julversionen): gå samma rutt, tryck KOPIERA RESULTAT och jämför bildrutetid (p95), ritanrop och minne.
5. Byt grundspel → julversion → grundspel med knapparna: det ska ske i samma flik och grundspelets framsteg ska finnas kvar.
6. Spela en hel Tomtezombies-omgång och ett butiksuppdrag (Pressbyrån).
7. Vrid telefonen (liggande) och öppna pausmenyn; prova VÄDEREFFEKTER: LÄTT/AV.

## 9. Julknappen i grundspelet

Grenen `feature/julknapp-grundspelet` (från `main`, version 2.21.2) lägger en knapp **JULKLAPPSJAKTEN 🎁** direkt under TempoRush i startmenyn. Den öppnar julversionen i samma flik (ingen iframe).
Knappen är **förberedd men avstängd** (`enabled:false` i `julknapp.mjs`) och syns inte för spelare. Julversionens adress (https://karlstad-julklappsjakten.vercel.app/) är redan förifylld; koppla in knappen först när adressen är verifierad på riktiga enheter: sätt `enabled:true`, höj versionen, kör testerna, förhandsvisa, slå ihop med `main`.
Stäng av den igen genom att sätta `enabled:false`. Se `JULKNAPPEN.md` på den grenen. Julversionens knapp **← Tillbaka till Karlstad-spelet** leder till `BASE_GAME_URL` i `xmas/xmas-config.mjs` (grundspelets adress, i samma flik).

## 10. Kända begränsningar och nästa steg

- Vercel-projektet och den stabila adressen finns (avsnitt 4), men Production Branch ska sättas, adressen ska öppnas och verifieras på riktiga enheter, och Git-taggen ska skapas (avsnitt 1). Julknappen kopplas in efter det.
- Ingen test på riktig mobil. Kör `?perf` på iPhone 11 och MacBook Air 2018 och jämför med grundspelet innan publicering.
- Tomtezombies är grundspelets zombieläge med paketmål; vidare balansering (antal zombier, tempo) bör ske efter spelartester.
- JulRushen är inte spelad av en människa på en riktig enhet. Balansen är TempoRushs egen (nivåer, klockor, fångstfält) med guldpaket ungefär vart femte paket; titlarna räknar bara en tiondel av rushpoängen. Grundspelets skylt "DITT MÅL ↓" visas även över nästa paket (grundspelets markör för målet) och kan ligga bakom pilen på en stående telefon.
- Butiksuppdragens personal är grundspelets figurer (inte tomteklädda).
- Förberedda butiker (Kjell & Company, Åhléns, Duvan, Värmlands Museum, Sandgrund) har data men ingen interiör eller något godkänt innehåll.
- Julmiljön finns främst runt Stora Torget och utmed fasaderna däromkring; övriga delar av staden har snö men inte egna julföremål.
- På skrivbord syns grundspelets båtbusshållplats (en låg platta med skylten BÅTBUSS) i högerkanten av första bilden. Det är grundspelets eget föremål och är inte ändrat.
