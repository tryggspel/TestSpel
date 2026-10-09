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

Versionsbeteckning: `X.Y.Z-xmas.N`, där `X.Y.Z` är basversionen på `main` och `N` räknar julbyggen (**`2.21.1-xmas.4`**). Det synliga namnet är
**Julklappsjakten – 2.21-XMS**. `node tools/set-version.mjs 2.21.1-xmas.5` (nästa bygge) sätter en enda cache-nyckel i alla moduler, HTML och CSS
(testet `version.test.mjs` och CI kräver att den är densamma överallt). Samma beteckning visas i startvyn (längst ned), i `window.KarlstadRound.version`,
i `?debug` och i `/api/build-info`.

## 3. Sammanhängande bygge (inga blandade filer)

- Inga imports till andra spelversioner, ingen kod hämtas från grundspelets adress, **ingen service worker** (testas i `tests/xmas-build.test.mjs`).
- Alla moduler, HTML och CSS bär samma `?v=`-nyckel, så en ny version kan aldrig blanda gamla och nya filer i webbläsarens cache.
- Julmusiken syntetiseras i spelet: inga ljudfiler laddas ner (grundspelets mp3 hämtas först om jukeboxen används).
- Spelmotorn (PlayCanvas 2.22.4) hämtas från jsDelivr med fast version, som i grundspelet.
- Startvyn visar `Julklappsjakten – 2.21-XMS · bygge 2.21.1-xmas.4 · <miljö> <gren> <commit> · bas 2.21.1 (fadc36a)`. `/api/build-info` (Vercel-funktion)
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

All julkod ligger under `xmas/` (27 filer), `tests/xmas-*.test.mjs` (13 filer) och `tools/xmas-flow/` (6 skript: fem webbläsarkontroller och svårighetsprovet `difficulty.mjs`). Grundspelets egna filer är rörda så här (utöver cache-nyckeln `?v=` som byts överallt):

| Fil | Ändring |
|---|---|
| `app.js` | Snöfilter (`ComicMesh.snow`), vinterfärger för mark, vägar och himmel, inga XP-kulor på torget, julens kollisionsrutor, ingen snö inomhus, julmusiken (grundspelets mp3 hämtas lazy); JulRushen: `musicTempo` styr även julmusikens tempo och stämningen `rush` ligger kvar (tre rader) |
| `last-round.js` | Importerar och startar `installXmas`, tömmer termosar, hindrar Halloween-jakt, panellistan (nu även `xmas-rush`, `xmas-board`, `xmas-challenge`), HUD-hook, radar-hook, tomtezombie-bilder, butiksuppdrag med julens platser. Vägledningen: en villkorsrad i `updateRoute` (`!destination.quiet`) och en egenskap `quiet` på tempomålet i JulRushen, så att grundspelets små pilar på marken och flaggan "DITT MÅL" inte ritas för julens mål. 2.21.1-xmas.4: kroken `setTurbo(on)` i listan som `installXmas` får (slår på eller av turbon utan meddelande och ger tillbaka det tidigare valet; JulRushen slår på turbon när en rush börjar eftersom klockan är räknad på den, och återställer spelarens eget val när man lämnar rushen) |
| `journey-rules.mjs` | `objective()`-hook, `stepExplore()` och zombie-`step()` anropar paketjakten, `finish()` ger Tomtezombies eget slut |
| `index.html` | Titel, tre julpaneler, länk till `xmas/xmas.css`, pausmenyns rubrik, ingen preload av mp3; JulRushen: två knappar `JULRUSHEN` med förklaring (startvyn och fortsättningsmenyn), rushmenyn, topplistan, utmaningskortet och knappen UTMANA EN VÄN på slutkortet; en rad med id `xmasZombieNote` under Tomtezombies-knappen (nivån man kommit till) |
| `mall-space.mjs` | 2.21.1-xmas.4: butikströsklarna i Mitt i City (`MALL_DOORWAYS`, en funktion och två villkor i `mallPassage` och `mallWalkable`): se 6 (Butiksuppdrag). Felet finns också i grundspelet (`main`), som inte är ändrat |
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

Startvyn: **JULKLAPPSJAKTEN 🎁** (mysigt, inga zombier), **JULRUSHEN** (TempoRush med paket: tolv rusher och Maraton), **TOMTEZOMBIES** (eget läge med zombier och kuslig musik), **← Tillbaka till Karlstad-spelet**.
Egen sparning: `karlstad-xmas:save:1` (julstämplar, rekord, summor, vädervalet) och grundspelets spelstatus under prefixet `xmas:` (`xmas:karlstad:*`).
Grundspelets sparfiler på den egna adressen rörs aldrig (andra adress = annan webbläsarlagring, och prefixet gör det dubbelt säkert).

| Läge | Vad |
|---|---|
| Vägledning | I paketjakten (introduktionen, rundorna, fri vandring, Tomtezombies): en stor pil som alltid sitter på skärmen, kantmarkörer, ett rött julband med pilar som rullas ut på marken, en grön målstråle och en uppdragsrad som säger vad man ska göra. Se 6.2. |
| Introduktionen | Start söder om granen, vänd mot den med den första paketgruppen rakt framför (granen och paketen syns på samma bild, även på en stående telefon som bara ser ca 38° i sidled). Sedan 30 paket + 3 bonuspaket längs en spiral runt granen på Stora Torget (252 m), mål 20, tomte vid slutet. Inget tidskrav. Grupperna ligger 15–20 m isär. Gångtid (beräknad av väglängd och gångfart, inte mätt med en människa): 20 paket och leverans 23–39 s, hela slingan med alla 30 paket 34–58 s; med tid att läsa målet och titta sig omkring blir det 60–90 s. |
| Julrundor (2–3 min) | Torgets paketregn, Kungsgatans julrunda, Drottninggatans julrunda: rutten byggs ur stadens egen gångbara karta, 75 vanliga paket + 3 bonus, mål drygt hälften, mjuk tid som bara ger tidsbonus. |
| Butiksuppdrag | Cervera: Tomtarnas fikabord (kopp, kanna, fat). Pressbyrån: Tomtarnas fikaorder (kaffe, lussebulle, pepparkaka …) och leverans till tomten utanför. **2.21.1-xmas.4: dörrarna i Mitt i City.** Det gick inte att gå in i Cervera, och efter uppdraget fastnade man inne: butikens framsida mot atriet är helt öppen, men gångytorna tar slut 0,45 m från varje vägg, och i glappet mellan atriets och butikens gångyta låg en spärrad remsa på 10–20 cm (köpcentrets byggnadsruta täckte den), en osynlig vägg tvärs över hela fronten som man fastnade i om steget råkade sluta i den. Samma sak fanns vid Coop City och Clas Ohlson. Nu är tröskeln (där butikens golv och atriet överlappar, utom 0,45 m från sidoväggarna) gångbar. Provat i spelet med spelets egen rörelse och kollision: 24 av 24 försök att gå in och ut fastnade förut, 0 av 24 nu.  Förberett (osynligt): Kjell & Company, Åhléns, Duvan, Värmlands Museum, Sandgrund. Inga erbjudanden eller samarbeten påstås. |
| Fri julvandring | Tomtarna tappar paketregn hela tiden (egna paket-ID, tydlig varning): första regnet efter 5 s, sedan ett nytt var 22–38:e sekund, åtta till tolv paket plus ett bonuspaket per regn 30–85 m bort, högst tre regn åt gången, och har man färre än sju paket kvar inom 110 m kommer nästa regn inom 6 s. Ett regn som ingen rört försvinner efter 200 s, och ett regn man lämnat mer än 170 m bakom sig i 20 s räknas bort (förut kunde två övergivna regn stoppa alla nya i fyra minuter, och mellanrummet var 70–110 s). Mätt med en simulerad spelare som går (7,2 m/s) mot närmaste paket i tio minuter (sex körningar med olika slump): förut 7 regn och 65 paket, och 88 % av tiden utan ett enda paket att plocka (längsta väntan 92 s); nu i snitt 66 regn och 710 paket, 1 % av tiden utan paket och längsta väntan 4,8 s. Det är en modell av en spelare som alltid går rakt mot paketen (med en påhittad karta där hela marken är fri); en människa som går vilse eller stannar får längre väntan. **Placeringen:** paketen i ett regn läggs på riktiga fria platser (inte blockerade, fri sikt till regnets mitt, minst 1,4 m från varandra) i stället för på stadens navigeringsrutnät, vars punkter ligger tre meter isär och som lät flera paket hamna på samma punkt. Mätt på stadens riktiga karta (82 provpunkter över staden, engångsskript): förut i snitt 6,0 vanliga paket per regn (vart femte regn bara fyra), nu 9,5 (minst sex) utan två paket närmare än 1,4 m och inget på blockerad mark; ett regn tar 1,8 ms att lägga (högst 10 ms) på en server. Poängen i fri julvandring sparas inte, så de ger ingen titel. |
| Tomtezombies | Grundspelets zombieregler (AI, rörelse, pooler, högst sex aktiva, patruller, ambushar, Guld-Nisse) med julens bilder. Paket är mål och ammunition. Eget slutkort. **Nivåer (2.21.1-xmas.4):** efter första rundan gick man förut vidare till Julklappsjaktens meny. Nu är tomtejakten nivåer: nivå 1 är spiralen runt granen (20 paket), nivå 2–4 är julrundornas banor (Torget, Kungsgatan, Drottninggatan) och därefter om igen, med två paket mer per nivå (högst 40), tomtezombier som kommer tätare (nästa patrull högst 11 s fram på nivå 2, ner till 3,5 s på nivå 10) och går 5 % snabbare per nivå (högst ×1,5). En klarad nivå sparas (bästa poäng per nivå) och låser upp nästa; slutkortet har NÄSTA NIVÅ och JULMENYN, och efter en förlust FÖRSÖK IGEN · NIVÅ n. Startvyns knapp startar nästa nivå och raden under säger hur långt man kommit. Stämpeln TOMTEZOMBIES delas ut första gången man klarar en nivå (den som fick den förut har klarat nivå 1). |
| JulRushen | TempoRush i julens värld: **tolv rusher** med fast, stigande tempo, en allt trängre klocka, mål, hjärtan, stjärnor och upplåsning, **ÖVERTID** (Rush 13, 14 … så långt man orkar), **Maraton** (tempot stiger var 12:e sekund), femton julgåvor varav fem ökar farten, sidopaket, topplista (även LÄNGST) och utmaningar. Se 6.1 och 6.3. |

Kombo, poäng och belöningar: 10 poäng per paket, ×2/×3/×4 vid 4/8/12 i rad (engångsbonus 20/40/60), bonuspaket 50, leverans 100 + tidsbonus upp till 100.
Fångstfältet är detsamma som för termosar i 2.20.0 (växer med farten, ingen insamling genom väggar). Gångfarten är 7,2 m/s (grundspelet).

### 6.1 JulRushen – TempoRush med paket (tolv rusher och Maraton)

**JULRUSHEN** finns i startvyn och i fortsättningsmenyn och öppnar **rushmenyn**: tolv rusher (nivåer) i ett rutnät, en spelaknapp, MARATON och TOPPLISTA OCH UTMANING. Det är grundspelets TempoRush (en klocka till nästa mål, tre liv, ett tempo som styr fart och poäng) i julens värld.
Banan, klockan, fångstfältet och pilen är **grundspelets egna**: julkoden anropar `journey.supplyTempo`, `pickTempoTarget`, `tempoAim`, `inCatch` och använder `journey.tempo`.
Det som är jul är paketen, gåvorna, poängen, namnen, musiken och gränssnittet. Julkoden skriver aldrig i grundspelets händelsekö, så grundspelets termosmeddelanden för tempo körs aldrig.

| Läge | Så fungerar det |
|---|---|
| Tolv rusher | Varje rush har ett **fast tempo från första sekunden** (rush *n* = TempoRuns tempo *n*: fart ×1,00 → ×1,88, poäng ×1,0 → ×4,3, glesare paket, större fångstfält) och ändras inte under rushen. Tempot stiger alltså **från rush till rush**, och det gör också **klockan till nästa paket**, som blir trängre för varje rush (se Klockan nedan). Varje rush har ett mål och tre hjärtan: udda rusher har ett paketmål (25 paket i Rush 1, 50 i Rush 11), jämna rusher ett poängmål (2 000 poäng i Rush 2, 14 000 i Rush 12; räknat så att det kräver lika mycket spel som en paketrush). När målet nås är rushen klarad: **stjärnor = hjärtan som är kvar** (1–3), bästa poäng och stjärnor sparas och nästa rush låses upp. Tappar man alla hjärtan slutar rushen utan stjärnor och utan upplåsning. Turbon slås på av sig själv när en rush börjar (klockan är räknad på den). |
| Serie | NÄSTA RUSH på slutkortet startar nästa rush direkt och tar med hjärtana. **Ett hjärta fylls på bara om man klarade rushen utan att tappa något** (aldrig över tre); har man tappat ett hjärta tar man med sig det man har kvar, aldrig färre än ett. Slutkortet säger vad som gäller. Rusher klarade i rad räknas som en serie (längsta serien sparas). En rush som startas från rushmenyn börjar alltid med tre hjärtan. |
| ÖVERTID | När alla tolv är klarade fortsätter det med **Rush 13, 14, 15 …** (ÖVERTID 1, 2, 3 …): **samma fart och poäng som Rush 12** men en klocka som blir trängre för varje rush och ett mål som växer (56 paket i Rush 13, 16 350 poäng i Rush 14, 64 paket i Rush 15 …, till högst 120 paket och 33 850 poäng vid Rush 29–30). Det går att fortsätta så långt man orkar, högst Rush 99. Hur långt man kommit sparas (`rush.cleared`) och visas i rushmenyn (en bred ruta ÖVERTID under de tolv), på slutkortet ("LÄNGRE ÄN NÅGONSIN!") och i topplistan (LÄNGST I JULRUSHEN). Rush 13 och uppåt har inga stjärnor på rutorna: bara hur långt man kommit räknas, och bästa poäng sparas per rush som förut. |
| Maraton | Det ursprungliga JulRushen-läget: tempot stiger **var 12:e sekund** (tempo 1–12) tills man är ute. Efter tempo 12 stiger farten inte mer, men klockan fortsätter bli trängre ett steg var 12:e sekund (ÖVERTID också här); tempot i resultatet och i rekordet räknar med stegen ("tempo 15"). Rekord (poäng, tempo, paket) och julstämpeln JULRUSHEN vid tempo 5 som förut. |

De tolv rusherna (fart ×/poäng × är tempots; klockan är k × minsta tid + marginal, se Klockan; målen är samma varje gång):

| Rush | Namn | Tempo (fart / poäng) | Mål | Klockan (k / marginal) |
|---|---|---|---|---|
| 1 | JULMYS | ×1,00 / ×1,0 | hämta 25 paket | ×2,90 / 1,20 s |
| 2 | PEPPARKAKA | ×1,08 / ×1,3 | nå 2 000 poäng | ×2,41 / 0,91 s |
| 3 | GLÖGGFART | ×1,16 / ×1,6 | hämta 30 paket | ×2,04 / 0,70 s |
| 4 | SNÖYRA | ×1,24 / ×1,9 | nå 3 600 poäng | ×1,77 / 0,55 s |
| 5 | SLÄDFART | ×1,32 / ×2,2 | hämta 35 paket | ×1,57 / 0,43 s |
| 6 | ISRASERI | ×1,40 / ×2,5 | nå 5 600 poäng | ×1,42 / 0,34 s |
| 7 | RENRACE | ×1,48 / ×2,8 | hämta 40 paket | ×1,31 / 0,28 s |
| 8 | NORDPOLEN | ×1,56 / ×3,1 | nå 8 000 poäng | ×1,23 / 0,23 s |
| 9 | JULSTRESS | ×1,64 / ×3,4 | hämta 45 paket | ×1,17 / 0,20 s |
| 10 | SNÖSTORM | ×1,72 / ×3,7 | nå 10 850 poäng | ×1,13 / 0,17 s |
| 11 | PAKETVIRVEL | ×1,80 / ×4,0 | hämta 50 paket | ×1,09 / 0,15 s |
| 12 | TOMTEGALET | ×1,88 / ×4,3 | nå 14 000 poäng | ×1,07 / 0,14 s |
| 13+ | ÖVERTID 1, 2 … | ×1,88 / ×4,3 | 56 paket, 16 350 poäng, 64 paket … | ×1,05 → ×1,00 / 0,13 → 0,10 s |

**Svårighet: vad som är mätt och vad som inte är det.** Önskemålet var att det inte ska vara lätt att ta sig vidare, och att inte alla ska klara alla tolv rusher på första försöket. Klockan var för snäll: den räknade på 85 % av gångfarten plus en stor marginal, och turbon (×2) kom ovanpå, så en perfekt spelare behövde ungefär en sekund per paket men fick 6–16 sekunder. Mätt med samma svårighetsprov på koden för 2.21.1-xmas.3 klarade de simulerade typerna C (nybörjare), A (vanlig) och G (duktig) alla tolv rusher på första försöket i varje försök (8 försök per typ), utan att tappa ett enda hjärta. Klockan, målen och hjärtareglerna är därför ändrade (se Klockan och Serie) och provade med `node tools/xmas-flow/difficulty.mjs`: ett Node-program som spelar den **riktiga motorn** (`XmasRush` ovanpå grundspelets `CityJourney`: samma bana, klocka, fångstfält och gåvor, utan webbläsare) med fem **modellerade** spelartyper. Typerna är en fart (andel av högsta fart med turbo, lägre i högt tempo), en svängfart, en tvekan när nästa paket ligger åt sidan och lite brus:

| Typ | Fart (tempo 1 → 12) | Sväng | Tvekan |
|---|---|---|---|
| P perfekt | 100 % → 100 % | 720°/s | 0 |
| E mycket duktig | 98 % → 88 % | 420°/s | 0,10 s |
| G duktig | 92 % → 72 % | 290°/s | 0,22 s |
| A vanlig | 85 % → 55 % | 200°/s | 0,38 s |
| C nybörjare | 72 % → 40 % | 140°/s | 0,60 s |
| H, J, K (med slarv) | som G, A och C | som G, A och C | som G, A och C, plus 12 % chans per paket att tappa ungefär en sekund |

Resultat (12 försök per typ utom P, som är perfekt och kördes 2 gånger; varje försök på en egen bana; `node tools/xmas-flow/difficulty.mjs --skills <typ> --runs 12 --over 1 --max 13 --mseconds 900`, mätt på koden för 2.21.1-xmas.4):

| Typ | Första försöket i varje rush (tre hjärtan) | Serie från Rush 1 (hjärtana följer med) | Maraton: tempo när det tar slut (median) |
|---|---|---|---|
| C nybörjare | klarar Rush 1–5, aldrig Rush 6 | 5 rusher i rad | 9 |
| A vanlig | klarar Rush 1–7 (tappar i snitt ett hjärta i Rush 7), aldrig Rush 8 | 7 | 9 |
| G duktig | klarar Rush 1–9, aldrig Rush 10 | 9 | 14 |
| E mycket duktig | klarar Rush 1–12 (tappar i snitt 0,1 hjärta i Rush 12), aldrig Rush 13 | 12, sedan slut | 32 (kvartilerna 23 och 35) |
| P perfekt | klarar allt (första försöket till Rush 16, serie till Rush 40, 15 minuters Maraton utan att förlora) | alla | slutar aldrig |

En rush tar för E 13–39 s och för A 16–43 s; hela serien Rush 1–12 tar för E ungefär 5 minuter.

Typerna ovan är jämna: de håller samma fart hela vägen, så gränserna är skarpa. Människor är inte det, så tre typer till är lika snabba som C, A och G men har **slarv**: vid varje nytt paket är det 12 % chans att de tittar bort, missar svängen eller trycker fel och tappar ungefär en sekund (0,5–1,5 s). Det är en gissning om hur en människa spelar, inte en mätning. Resultat (20 försök per typ):

| Typ | Första försöket i varje rush (andel som klarar, hjärtan kvar) | Serie från Rush 1 | Maraton (tempo, median) |
|---|---|---|---|
| H duktig med slarv (som G) | Rush 1–3: 100 %, Rush 4: 100 % (2,8 hjärtan), Rush 5: 90 %, Rush 6–7: 60 %, Rush 8–9: 35–45 %, från Rush 10: 0 % | 5 i rad (längst 7) | 10 |
| J vanlig med slarv (som A) | Rush 1–4: 100 %, Rush 5: 75 %, Rush 6: 50 %, Rush 7: 20 %, från Rush 8: 0 % | 5 i rad (längst 6) | 9 |
| K nybörjare med slarv (som C) | Rush 1–3: 100 % (2,6 hjärtan kvar i Rush 3), Rush 4: 95 % (1,8), Rush 5: 60 %, från Rush 6: 0 % | 4 i rad (längst 5) | 8 |

Med slarv blir gränserna mjukare och ligger lägre: Rush 1–2 är trygga även för en nybörjare, och därefter kostar varje rush hjärtan. **Det här är en modell, inte människor.** Typerna håller en jämn fart hela vägen, så gränserna är skarpa; riktiga spelare varierar mer (en miss här, en bra stund där) och har pekskärmens styrning, så deras gränser är mjukare och ligger troligen lägre än typernas. Hur riktiga spelare ligger till mot A, G och E är **okänt** tills någon har spelat. Det som provet visar är riktningen: med den gamla klockan klarade nybörjaren alla tolv, med den nya klarar bara en mycket duktig spelare alla tolv på första försöket, och därefter är det slut för alla utom en perfekt spelare. Alla siffror ligger samlade och går att ändra: `PRESSURE` (kAmp, decay, slackAmp …) och målformlerna i `xmas-rushes.mjs`, `GIFT_WEIGHT` och `RUSH` i `xmas-rush.mjs`. Kör provet igen efter en ändring, till exempel `node tools/xmas-flow/difficulty.mjs --skills G,A --press '{"decay":0.8}' --runs 12`.

| Del | Så fungerar det |
|---|---|
| Start | På Stora Torget, vänd åt det håll där banan får den längsta fria gatusträckan (grundspelets `planHeading` prövas i tre riktningar). Banan läggs ut i första bildrutan från spelarens verkliga plats och riktning. |
| Banan | Ett pärlband av paket längs långa, fria sträckor, 150–320 m framåt, 11,5 m mellan paketen på tempo 1 och 28 m på tempo 12. Aldrig i väggar, stånd, granar eller vatten (kontrollerat mot spelets egna kollisioner); sträckorna viker av vid hinder och följer gator där det finns gatudata. Hamnar man långt från banan (bussresa, omväg) börjar den om vid spelaren. Samma omplanering (grundspelets `anchorCourse`, när nästa paket ligger över 55 m bort) sker också när banan viker tillbaka längs samma gata (grundspelet släpper de paket som spelaren redan "passerat" längs deras riktning) och när ett tomtebloss eller en kryddbomb tagit paketen framför. Det kostar inget liv. |
| Klockan | Tiden till nästa paket är **minsta möjliga tid × k + marginal**, där minsta möjliga tid är sträckan som återstår efter fångstfältet i full fart med turbon på (7,2 m/s × tempots fart × 2). k och marginalen sjunker för varje rush: k(n) = 1 + 1,9 × 0,74^(n−1) och marginal(n) = 0,1 + 1,1 × 0,74^(n−1) sekunder, aldrig under 0,8 s. En sträcka på 30 m ger i Rush 1 6,5 s (minsta möjliga tid är 1,8 s), i Rush 6 2,1 s (1,2 s), i Rush 12 1,07 s (0,87 s) och i ÖVERTID drygt 1 s (k närmar sig 1). Första paketet i en rush får tre sekunder extra (4–10 s på klockan) så att man hinner titta sig omkring. Går klockan ut tappar man ett hjärta och kedjan bryts. I en rush är tempot fast och trycket är rushens nummer; i Maraton är trycket tempot (och därefter ett steg per tempohöjning som inte längre går att göra). Grundspelets egen klocka (`deadlineFor`: 85 % av gångfarten plus en marginal på 9 s som krymper till 2,2 s) ersätts i JulRushen genom ett byte av `setTarget` på journey-objektets egen tempoinstans (`installClock`, borttaget igen när körningen är slut), så att grundspelets klass inte ändras. Klockan är alltså räknad på att turbon är på, och JulRushen slår på den själv. |
| Fångst | Som i TempoRush: `tempoReach` (3,6 m på tempo 1, upp till 6,5 m) eller `catchReach(fart)`, hela sträckan sedan förra steget räknas och fri sikt krävs (ingen fångst genom väggar). |
| Poäng | Vanligt paket 10 × kedjefaktor (×2/×3/×4 vid 4/8/12 i rad som i jakten, engångsbonus 20/40/60), guldpaket 50. Därefter tempots poängfaktor och **flyt**: +12 × tempo om paketet tas med minst hälften av klockan kvar. Julstjärnan (×2) och Guldklappen (×3) gäller ovanpå. |
| Guldpaket | Ungefär vart tredje paket på banan bär en gåva: grundspelets förmågebärare (var sjätte pärla är alltid ett, plus de som dagens fördelning ger) och dessutom var tionde vanligt paket (`RUSH.extraBearer`). Gåvan är bestämd av paketets id (samma paket, samma gåva). Varje guldpaket har en **bricka med gåvans symbol** över sig och en gyllene stråle, så att man ser vad man får innan man tar det. |
| Sidopaket | Var fjärde pärla på banan får ett valfritt guldpaket med gåva 6–10,5 m åt sidan (en avstickare; högst fem åt gången, borta efter 40 s, alltid på fri mark med fri sikt från banan). Det räknas **inte** mot målet och rör varken klockan eller nästa mål: man tjänar bara poäng (50 × tempots faktor), kedja och gåva, och förlorar ingenting på att hoppa över det. |
| Pil, stråle och band | Grundspelets stora riktningspil (siktar en bit längre fram på banan) och kantmarkörer när målet är utanför bilden, på en mörk platta mot snön. Nästa paket är större och har en hög grön ljusstråle och en ring på marken. Längs vägen dit rullas **julbandet** ut (6.2) i stället för grundspelets små pilar och flaggan "DITT MÅL". Radarn visar paketen och nästa paket som en grön ring. |
| Gränssnitt | Överst: RUSH och numret (TEMPO i Maraton), en stapel för tiden till nästa paket (röd och blinkande under 30 %), hjärtan. Under: rushens namn och poäng, **målraden** (HÄMTA PAKET 5/25 eller NÅ POÄNGEN 640/2 000 med en förloppsstapel), kombo och aktiva gåvor som små brickor. Slutkort med stjärnor, paket, bästa kombo, tid, gåvor, sidopaket, tidigare rekord, serie, hjärtana in i nästa rush (och varför ett hjärta fylls på eller inte), NÄSTA RUSH / FÖRSÖK IGEN, UTMANA EN VÄN och RUSHMENYN. I övertiden säger kortet "LÄNGRE ÄN NÅGONSIN!" när man kommit längre än förut. På låga skärmar (högst 760 px: till exempel en iPhone i Safari med adressfältet synligt, och liggande telefon) visas de tolv rusherna i två rader om sex med bara siffra och stjärnor, så att spelaknappen syns utan att bläddra. På liggande telefon utgår ingressen i rushmenyn och huvudknappen (NÄSTA RUSH, SPELA RUSH, TA UTMANINGEN) följer med i kortets kant när kortet är högre än skärmen. Texter som klipps av sin ruta har tre pixlars luft upptill så att prickarna på Å, Ä och Ö syns (en kontroll i webbläsarverktygen mäter det). |
| Stämplar och rekord | Julstämpeln **JULRUSHEN** delas ut första gången man klarar Rush 5 (eller når tempo 5 i Maraton); julstämpeln **TOMTEGALET** när man klarar Rush 12 (stämpelräknaren går till 9). Per rush sparas bästa poäng, tid, paket och hjärtan samt stjärnor, och längsta serie, i `karlstad-xmas:save:1` (`rush`), också för Rush 13 och uppåt (`rush.cleared` är högsta klarade rush, högst 99); Maratonrekordet ligger kvar i `records.julrush` (tempot räknar med stegen efter tempo 12). Bara klarade rusher sparas. Mot titlarna (NYFIKEN … ÖVERTOMTE) räknas en tiondel av poängen. Att ge upp via pausmenyn (JULMENY) räknas som en förlust: ingenting av rushen sparas utöver summorna om den hade minst ett paket. |
| Musik | Egen stämning `rush` (G – D – Em – C, 116 slag/min, slädklockor på varje åttondel, mjuk puls på varje slag). Tempot följer rushens nivå (×1,00 → ×1,35, högst så), som grundspelets musik gör i TempoRush. |

Julgåvorna ersätter grundspelets tolv förmågor (femton sorter; "andel" är chansen att en gåva är just den, av 33):

| Gåva | Effekt | Tid | Andel |
|---|---|---|---|
| RENSLÄDEN | Farten fördubblas (grundspelets raketförmåga, som turbon räknar med) | 7 s | 3/33 |
| **TURBOGLÖGG** | Farten ökar med hälften (×1,5) | 14 s | 3/33 |
| **PEPPARKAKSRAKETEN** | Raketfart: tre gånger så fort (×3) en kort stund | 3,5 s | 2/33 |
| **MEDVIND** | Farten ×1,3 och 2 m större fångstfält | 20 s | 2/33 |
| **SKRIDSKOR** | Farten ×1,25 och kedjans fönster blir 1,5 s längre (3,4 → 4,9 s) | 25 s | 2/33 |
| JULMAGNETEN | Paket inom 13 m med fri sikt (banans och sidopaketen) dras in mot dig på en kvarts sekund och tas. Genom väggar dras inget | 10 s | 3/33 |
| TOMTESPÖKET | Ett vänligt spöke med tomteluva flyger till närmaste paket (högst 46 m bort, helst framför dig) och tar det åt dig, ett var 0,8:e sekund (ungefär nio paket) | 9 s | 2/33 |
| JULSTJÄRNAN | Dubbla poäng och 2 m större fångstfält | 9 s | 2/33 |
| JULKLOCKAN | +5 s till nästa paket | – | 3/33 |
| GLÖGGPAUS | Klockan till nästa paket står still | 7 s | 2/33 |
| GULDKLAPPEN | Allt ger tre gånger så mycket | 20 s | 2/33 |
| TOMTEBLOSS | Tar alla paket i en rak linje framför dig (högst 16, inom 80 m och ±6 m) | – | 2/33 |
| PEPPARKAKSSKÖLD | Räddar ett hjärta nästa gång klockan går ut (+3 s), högst två åt gången; den sällsyntaste gåvan | – | 1/33 |
| KRYDDBOMBEN | Tar alla paket inom 24 m (högst 14), närmast först | – | 2/33 |
| PAKETREGNET | Åtta extra paket (färre där det är trångt) på fria platser 5–13 m runt dig. De räknas inte mot målet och försvinner efter 12 s | – | 2/33 |

**Fartgåvorna** (de fem första: släde, glögg, raket, medvind, skridskor) var förut bara en (renssläden, 3 av 24 = 12 %) och är nu 12 av 33 (36 %). De går genom grundspelets egen fartfaktor (`journey.fun.power.speedMul()`, som `last-round.js` och spelarens rörelse läser), så att de verkar på samma sätt som raketen i grundspelet. Fartgåvorna läggs **inte ihop med varandra** (den starkaste av glögg, raket, medvind och skridskor gäller, ett nytt plock av samma sort förlänger tiden) men de multipliceras med renssläden, och allt som ökar farten får **aldrig bli mer än ×4 tillsammans** (`RUSH.speedCap`, utöver turbon och tempots fart). Farten är en fördel som klockan inte väntar på: klockan är räknad på turbon och tempots fart, så en fartgåva ger marginal och flytbonus (+12 × tempo om paketet tas med minst hälften av klockan kvar), men den gör inte rushen lättare att klara än den är för en spelare som redan håller full fart. Hela tillägget sätts på journey-objektets egen instans (`installClock`) och tas bort när körningen slutar. Mätt i svårighetsprovet är en fartgåva på 40–80 % av tiden för en spelare som tar varje paket längs banan (medelfaktor ×1,2–1,6), eftersom ungefär vart tredje paket bär en gåva och var tredje gåva ökar farten. Provet räknar med dem, men antar att spelaren kan styra i den ökade farten (spelartypens andel av full fart gäller även den); det är inte provat med människor (se avsnitt 10).

Paket som tas av bloss, bomb, magnet eller spöke ger sina gåvor, men ett paket i ett bloss eller en bomb utlöser aldrig ett nytt bloss, en ny bomb eller ett nytt regn (annars kunde det rulla utan slut).

Skillnader mot grundspelets TempoRush: grundspelets termosbaserade förmågor hoppstövlar, sonar och kombosköld finns inte i julen (de hade ingen funktion i en bana av paket); bomb, bönregn, spöke och magnet är med, i julens skepnad.
JULKLOCKAN lägger sina fem sekunder på *nästa* mål även om den plockas mellan två mål. I grundspelets TempoRush försvinner den tiden när nästa mål väljs (kontrollerat med grundspelets egen kod: `takeItem` plockar först, lägger sedan till tiden, och `setTarget` skriver över den). Det är lämnat som det är i grundspelet (`main` är orört).
Grundspelets kaffemagnet tar termosar genom väggar; julmagneten gör det inte (paket flyger inte genom hus).

### 6.2 Vägledning i Julklappsjakten

Frågan var: "det är svårt att följa åt vilket håll man ska gå, markeringen i marken är för otydlig, och det blir oklart vad man ska göra". Orsakerna i den tidigare versionen (mätt i bild på en stående telefon, 414×896):
grundspelets markering är **22 små platta pilar** (1 m stora, 3,5 m isär) som bara visas när nästa paket är över 16 m bort. På mobilens ögonhöjd (1,7 m) blir en platt pil på 9 m håll ca 70 px bred men bara ca 15 px hög, och på 20 m ett streck; när paketet var nära fanns ingen markering alls, bara en liten kompasspill ("NÄSTA PAKET · 3 M") som pekade rakt på paketet (genom hus). Och målet ("Samla 20 paket") syntes bara i sju sekunder.

Vägledningen (`xmas/xmas-guide.mjs`, `xmas-guide-ui.js`, ritningen i `xmas-view.js`) gäller introduktionen, rundorna, fri julvandring och Tomtezombies:

| Del | Så fungerar det |
|---|---|
| Stor pil | Sitter fast mitt på skärmen (en mörk platta mot snön) och pekar mot nästa kurva på gångvägen: finns fri sikt pekar den rakt på paketet, annars följer den grundspelets stigsökning runt husen (pilen siktar på det längsta hörn man kan gå rakt till). Texten visar vad den pekar på och avståndet längs vägen ("NÄSTA PAKET · 24 M") och vad man ska göra: GÅ RAKT FRAM / SVÄNG HÖGER / SVÄNG VÄNSTER / VÄND DIG OM. Pilen är grön när man går rätt, röd när målet ligger bakom, och rörs mjukt (7/s) så att den inte hoppar. |
| Kantmarkörer | Det håll man ska vända sig åt lyser i bildens kant när målet ligger utanför mitten (22°–72°: växande), båda kanterna (röda) när det ligger bakom. |
| Julband | Ett brett rött band med gyllene kanter och ljusa pilar som pekar framåt rullas ut på marken längs vägen till målet, från 4,5 m framför spelaren till 40 m bort (2,4 m långa bitar, 1,1 m breda; bitarna följer kurvorna). Det är förankrat vid målet: man går fram över det, och nya bitar rullas ut längst bort. Pilarna rör sig mot målet. Bandet slutar strax före paketet. (En första variant med svävande stjärnor lades ner: på knähöjd blev de en hög i bildens mitt när man går rakt fram.) Samma band visas i JulRushen mot nästa paket. |
| Stråle | En hög grön ljusstråle och en ring vid pilens mål (nästa paket; tomten efter målet). Strålen är smal på nära håll så att den inte färgar paketet. |
| Uppdragsrad | Under HUD:en, alltid: SAMLA PAKET 3/20 › LÄMNA HOS TOMTEN (steg 1 blir ✓ när målet nåtts och steg 2 lyser), BÄR FIKAT TILL TOMTEN (efter Pressbyrån), PLOCKA PAKETEN · 4 KVAR eller NÄSTA PAKETREGN OM 17 S (fri vandring). På liggande telefon visas bara det aktuella steget. |
| Målval | I introduktionen, rundorna och Tomtezombies pekar pilen på det närmaste av de fyra närmaste ej plockade paketen i ordning (så att den följer spåret och inte hoppar till nästa varv av spiralen), annars på det närmaste; ett nytt mål måste vara 35 % (och 2 m) närmare för att pilen ska byta. Efter målet: tomten. Bonuspaketen är valfria avstickare (gyllene strålar) och pekas bara ut när inget annat finns. |
| Borta | Grundspelets lilla kompasspill döljs i alla julklappslägen. Under ett butiksuppdrag och i menyer är pil, band och rad av (grundspelets egen vägledning gäller). |

Stigsökningen är grundspelets (`CityNavigation.path`, ett fält per mål: ca 9 ms i snitt och 24 ms värst i en kall körning i headless Chromium på kartan med 65 000 noder). Den används **bara när den raka linjen till målet är blockerad** (`nav.clear`, 0,17 ms för 60 m); i det öppna fallet beräknas ingenting. Vägen räknas om högst var 90:e ms och när målet byts.

### 6.3 Topplista och utmana en vän

**Vad som finns:** en topplista på enheten och en vänlista som fylls via utmaningslänkar. **Vad som inte finns:** en gemensam topplista för alla spelare. Den kräver lagring i molnet (till exempel Vercel Blob eller en databas), en liten server-funktion och regler för publika namn, och är en egen sak som kräver ditt godkännande (se avsnitt 10).

| Del | Så fungerar det |
|---|---|
| Topplistan | TOPPLISTA OCH UTMANING i rushmenyn (och UTMANA EN VÄN på slutkortet). Väljaren visar TOTALT (summan av bästa poäng i varje rush), **LÄNGST I JULRUSHEN** (högsta klarade rush, och det kan vara över tolv; lika långt: störst summa först) eller en enskild rush, med dig och dina vänner, sorterat på poäng (lika poäng: du först). Bara de som klarat rushen finns med. Efter en övertidsrush (Rush 13 och uppåt) öppnar UTMANA EN VÄN listan LÄNGST. |
| Namn | Ett smeknamn man själv skriver (högst 12 tecken: bokstäver, siffror, mellanslag, punkt, understreck, bindestreck; annat tas bort). Sparas i `karlstad-xmas:save:1`. Det är det enda som delas, tillsammans med poängen. |
| Utmaningslänk | `https://karlstad-julklappsjakten.vercel.app/?utmaning=…` Länken bär en liten profil (namn, bästa poäng i varje rush, stjärnor, och hur långt man kommit: Rush 13 och uppåt bärs av fältet "klarat") och en utmaning ("slå mina 3 120 poäng i Rush 4"). SKICKA UTMANING öppnar telefonens delningsruta (Web Share) och faller tillbaka på KOPIERA LÄNKEN. Formatet: `J1|namn|rush|klarat|stjärnor|tid|poäng ×12|kontrollsumma`, base64url (oförändrat: länkar från tidigare byggen fungerar, och "klarat" kan nu vara upp till 99). Delningstexten säger "Jag har klarat Rush 14 i Julrushen i Julklappsjakten. Kommer du längre?" när man klarat Rush 12 eller längre. |
| Att öppna länken | Spelet visar utmaningskortet först ("ÅSA UTMANAR DIG! Slå 3 120 poäng i Rush 4 · SNÖYRA"). **En vän sparas först när man väljer det** (TA UTMANINGEN eller BARA SPARA VÄNNEN), aldrig bara av att länken öppnas. Är rushen inte upplåst startar knappen nästa rush man kan spela, och utmaningen ligger kvar tills man klarat den (så länge sidan är öppen: en omladdning glömmer utmaningen, men vännen finns kvar i topplistan och kan slås därifrån). Adressen städas (`?utmaning` tas bort) så att en omladdning inte visar kortet igen. Efter rushen jämförs resultatet: "DU SLOG ÅSA! 3 400 mot 3 120" eller "ÅSA VANN MED 280 POÄNG". |
| Skydd | Länken kontrolleras noga när den läses: format och längd, kontrollsumma, tal inom gränser, namnet rensas. En trasig eller ändrad länk ger startvyn som vanligt med ett meddelande. Allt som visas skrivs med `textContent`. Vänlistan har högst 30 vänner (de senaste), samma namn är samma vän (bästa poäng per rush behålls). |

**Begränsning (ärligt):** ingen server kontrollerar poängen, så en handgjord länk kan visa vilken poäng som helst (kontrollsumman skyddar mot misstag, inte mot den som vill fuska). Det är en vänutmaning, inte en tävling med pris. En delad lista på riktigt kräver servern ovan.

## 7. Prestanda och mätningar

**Mätt här (headless Chromium med SwiftShader, 414×896, programvaruritning): relativa jämförelser, inte mobilprestanda.** Tabellen är gjord på commit `39f30d8` (2.21.1-xmas.1, introduktionen) och har inte upprepats; mätningarna av 2.21.1-xmas.3 (vägledning, rushnivåer, gåvor) står under tabellen.

| Mått (samma rutt, samma upplägg) | Grundspelet (Clean City Explore) | Julklappsjakten (introduktionen) |
|---|---|---|
| Ritanrop, snitt (max) | 88 (198) | 97 (206) |
| Bildruta, median / p95 (programvaruritning) | 200 / 300–367 ms | 233–250 / 433–450 ms |
| Laddningstid till start | 15,9 s | 14,1–15,5 s |
| JS-minne efter rutten | 133–139 MB | 117–132 MB |
| JS-tid per bildruta för julens delar (decor, vy, gränssnitt, paketmotor) | – | 0,4 ms |

**2.21.1-xmas.3 (vägledning, julband, rushnivåer, gåvor).** JS-tiden för *allt* julkoden gör varje bildruta, alltså anropet `xmas.update` som grundspelet gör (vägledning, vy, julband, gränssnitt, paket- och rushmotor, dekor). Mätt med ett engångsskript (ej incheckat) som slår in anropet; 30 s per läge efter 2,5 s uppvärmning, 414×896, samma mjukvaruritade miljö, en bot som följer spelets egna mål:

| Läge | Bildrutor | Snitt | p95 | Högst |
|---|---|---|---|---|
| Introduktionen, stilla (pil, stråle, uppdragsrad) | 195 | 0,35 ms | 0,6 ms | 2,7 ms |
| Introduktionen, gående (även julbandet) | 200 | 0,59 ms | 1,3 ms | 2,2 ms |
| Rush 1 | 228 | 0,52 ms | 1,2 ms | 2,7 ms |
| Rush 6 | 250 | 0,52 ms | 1,7 ms | 4,8 ms |
| Rush 12 | 275 | 0,43 ms | 1,2 ms | 3,2 ms |
| Maraton | 228 | 0,56 ms | 1,6 ms | 3,0 ms |
| Tomtezombies, stilla | 190 | 0,35 ms | 0,7 ms | 2,6 ms |

Det är tiden julkoden själv tar i JavaScript på en server. Det är **inte** ritningen (som i den här miljön görs av processorn) och **inte** en telefons tid; en telefon är flera gånger långsammare på JavaScript, men hur många gånger är inte mätt. Tiden är i nivå med den tidigare mätningen (0,4 ms) trots att vägledningen, julbandet, gåvorna och rushmotorn tillkommit.

Ritanrop per bildruta (samma miljö, 20 s per läge, mätt medan en annan webbläsarkörning pågick; antalet beror inte på belastningen): introduktionen gående 115 i snitt (p95 204, högst 209; mätningen i tabellen ovan, före vägledningen, gav 97 och högst 206 på en något annan rutt, så skillnaden stämmer med julbandet som är högst 18 platta bitar), Rush 1 92 (högst 118), Rush 12 76 (högst 128), Maraton 93 (högst 118), Tomtezombies stilla 132. Julbandet har högst 18 bitar (9 i lätt läge), gåvobrickorna högst 6, spöket 1 och sidopaketen högst 5. Ritanrop betyder olika mycket på en riktig GPU; ingen bildfrekvens är mätt på någon telefon.

- Julens delar kostar knappt någon CPU (0,4 ms per bildruta på servern). Skillnaden i programvaruritning är fyllnad (genomskinliga bildkort), vilket en riktig GPU hanterar mycket lättare, men det är **inte mätt på någon telefon**.
- A/B i samma miljö visade att det stora mjuka skenet i snön kring granen var den dyraste enskilda delen; det är borttaget. Snöfallet (en enda mesh, 100 flingor) kostade inget mätbart.
- Automatisk lättnad: spelet mäter riktiga bildrutetider; ligger de över 40 ms i tre sekunder halveras snöfallet, tomtefönstren försvinner och blinkningen blir långsammare, därefter minimala effekter. Sparas inte (nästa start prövar full kvalitet). Av i automatiska tester (`navigator.webdriver`), `?gov` tvingar på, `?nogov` stänger av.
- Användaren kan själv minska eller stänga av vädereffekterna (PAUS → VÄDEREFFEKTER: FULLT / LÄTT / AV).
- **JulRushen** (mätt i samma mjukvaruritade miljö, `tools/xmas-flow/rush.mjs`, 2.21.1-xmas.3): att välja startriktning (tre planeringar av banan) tar 7–11 ms; läggningen av banan (`supplyTempo`, fyra gånger i sekunden) kostar i snitt 0,04–0,06 ms (p95 0,1 ms) och högst 5,6–10,8 ms per anrop under 60–75 s spel. I den långa körningen (200 s speltid, tempo 12, 4 804 anrop) var snittet 0,24 ms, p95 0,2 ms och värsta 28 ms (körningen delade processorn med en annan mätning). Det är grundspelets egen banplanering, som TempoRush redan använder. Fartens effekter (turboeffekten) och paketen är platta bildkort som i övriga julläget, plus en hög genomskinlig stråle. Ingen bildfrekvens är mätt för JulRushen, varken här eller på en riktig enhet; den automatiska lättnaden (se ovan) gäller även JulRushen.
- **Så mäter du på en riktig enhet**: öppna spelet med `?perf` (både grundspelet och julversionen), gå samma runda (introduktionen är samma ruta som Clean City Explore från Torget), vänta tills mätningen är klar och tryck KOPIERA RESULTAT. Prioritera iPhone 11/Safari och MacBook Air 2018.

## 8. Vad som är verifierat, och vad som inte är det

**Status för 2.21.1-xmas.4 (svårare klocka, ÖVERTID, fartgåvor, Cervera-dörren, fri julvandring, Tomtezombies-nivåer):** allt nedan är körd mot den slutliga koden. Källträdet (allt utom tester, verktyg och data) har kontrollsumman `6a36379ddf61cd2d91783eaa3dd80bdc497a124b`; den togs före webbläsarkörningarna och var densamma efter dem. Det är commit `7a4d704`, och commits därefter ändrar bara dokumentation. Prestandamätningarna i avsnitt 7 är gjorda på samma träd.

**Utrustning som faktiskt använts:** en Linux-container med headless Chromium 141 och mjukvaruritning (SwiftShader), utan GPU. Skärmstorlekar som provats:
mobilformat 414×896 med emulerad tryckskärm, 414×715 (höjden på en iPhone i Safari med adressfältet synligt), liggande telefon 896×414, liten telefon 375×667 och skrivbord 1000×640.
**Ingen riktig telefon eller Mac, ingen Safari/WebKit** (bara Chromium finns i miljön).

**Automatiskt:** `node --test tests/*.mjs`: **498 tester, alla gröna** (24 fler än i 2.21.1-xmas.3: bl.a. dörrarna i Mitt i City 3, Tomtezombies-nivåerna 4, fri julvandring 4, och klockan, övertiden, hjärtareglerna och fartgåvorna) och CI-jobbet `Karlstad 2.11 tests` (kör testerna och kontrollen av cache-nyckeln): grönt på `claude/stoic-tesla-59znyc` (körning 349 på `eabb1a6` och 350 på `f8a3671`).

**Webbläsarflöden (riktigt spel, riktig tryckning på knapparna, flyttning av spelaren; inga mocker).** Verifierad kod: källträdet med kontrollsumman `6a36379…` (commit `7a4d704`, 2.21.1-xmas.4); samma kontrollsumma före och efter körningarna, och filerna är byte-för-byte de som checkades in. Körningen skedde i två faser: de tidskänsliga kontrollerna (guide, flow, switch) en i taget på en i övrigt ledig maskin, därefter levels och rush två och två. **674 kontroller, alla OK** (inga omkörningar).

| Verktyg | Vad | Resultat |
|---|---|---|
| `tools/xmas-flow/guide.mjs` (414×896, 896×414, 1000×640) | **Vägledningen i Julklappsjakten:** pilen finns direkt och pekar på första paketet (rakt fram, med avstånd och namn) → uppdragsraden visar båda stegen och klipper inte prickarna på Å, Ä, Ö → grundspelets små pilar, DITT MÅL-flagga och kompasspill ritas inte → pilen vrids åt rätt håll när man vänder sig (höger, vänster, bakom), kanterna lyser, pilen blir grön när man går rätt → efter varje paket byter pilen mål i ordning, uppdragsraden räknar, efter målet pekar den på tomten → utan fri sikt följer pilen gångvägen runt hus (inte genom dem) och julbandet ligger längs vägen → på öppen mark syns minst åtta bitar av julbandet ovanför styrkontrollerna, smalnar av mot horisonten och rör sig → Tomtezombies har samma vägledning → JulRushen behåller grundspelets pil → butiksuppdrag och menyer lämnas ifred → inga konsolfel | **34/34 OK** på alla tre storlekar (414×715 och 375×667 kördes inte om för xmas.4; de gick 34/34 på xmas.3) |
| `tools/xmas-flow/levels.mjs` (samma fem storlekar) | **JulRushens tolv nivåer, gåvor, topplista och utmaningar:** rushmenyn (tolv rutor, bara Rush 1 öppen, alla minst 48 px) → Rush 1 startar med mål och HUD (HÄMTA PAKET 0/13, prickarna syns), en bot klarar den: slutkort med tre stjärnor, sparning i julbyggets egen nyckel, Rush 2 upplåst → NÄSTA RUSH: Rush 2 med poängmål, fast tempo, hjärtana följer med, rushmenyn visar stjärnor och nästa rush → tre missade klockor: slut på hjärtan, inga stjärnor, ingen upplåsning → Rush 12 på tempo 12 → magnet och tomtespöke (brickor, spöket ritas, gåvobrickor på guldpaket), paketregn, kryddbomb och sidopaket i riktig 3D → topplistan, namn, utmaningslänk (kopieras, avkodas i Node), **en andra spelare i en ny webbläsarkontext öppnar länken**: utmaningskortet, TA UTMANINGEN, jämförelsen efter rushen ("DU SLOG …"), vänlistan → trasig länk, profil utan utmaning, adressen städas → **xmas.4:** ÖVERTID-rutan (låst tills alla tolv är klarade), Rush 13 (ÖVERTID 1) på tempo 12 med målet 56 paket, "LÄNGRE ÄN NÅGONSIN!", hjärtareglen förklarad på slutkortet, topplistan LÄNGST, de fyra nya fartgåvorna som brickor (raketen ×3, med turbon ×11,3), högst sex brickor plus en "+N"-bricka → inga konsolfel | **52/52 OK** på alla fem storlekar |
| `tools/xmas-flow/flow.mjs` (414×896, 1000×640) | startvy och version → introduktionen (mål 20, 30 + 3 paket, paketen syns, målet visas, leverans, resultatkort, stämpel) → sparning i egna nycklar och efter omladdning → tre rundor (Kungsgatan spelad hela vägen) → miljön (8 stånd, granar, ljusslingor, snö utomhus men inte inomhus, ~6 tomtar nära) → **fri julvandring** (första regnet inom 8 s speltid med minst sju paket; plockar man allt fyra varv i rad kommer nästa regn inom 11 s: längsta väntan 3,8 s på 414×896) → Pressbyrån (beställning och leverans) och Cervera (**24 gånger in och 24 ut genom hela butiksfronten med små steg, ingen fastnar**) → **Tomtezombies** (4 typer, högst sex aktiva, tagen: FÖRSÖK IGEN · NIVÅ 1, klarad nivå 1: NÄSTA NIVÅ · 2 i stället för Julklappsjaktens meny, nivå 2–4 klaras på Torget, Kungsgatan och Drottninggatan, nivå 5 börjar om på Torget med 28 paket och zombierna ×1,2, startvyns knapp och HUD:ens "NIVÅ n · JULPOÄNG", zombiefarten återställd i menyn) → inga zombier i Julklappsjakten → väder av/på, mute → tillbaka-knapparna → inga konsolfel | **50/50 OK** på båda |
| `tools/xmas-flow/rush.mjs` (414×896, 414×715, 896×414, 1000×640) | **JulRushen (Maraton) och helheten kring den:** knappen i startvyn (≥ 48 px) → rushmenyn → start (läge, tempo 1, tre liv, rusmusik, inga zombier, pil, stråle, julband, paket, HUD) → en bot följer spelets egna mål i speltid: ≥ 25 paket, tempo 3, inga förlorade liv, guldpaket ger gåvor som syns som brickor, inga paket i väggar, stånd eller granar (39–55 paket kontrollerade mot spelets kollisioner per körning), fart och poängfaktor stiger, HUD:en stämmer med spelet → brådskande klocka → tre missade klockor ger ♥♥♡ → ♥♡♡ → ♡♡♡ och slutkort → rekordet sparas under julbyggets nyckel utan att något skrivs under grundspelets → EN RUSH TILL börjar om → pausmenyn fryser klockan och JULMENY sparar körningen och städar banan, farten och musiken → tempo 5 ger julstämpeln → Julklappsjakten startar som förut efter en rush → fortsättningsmenyn → alla gåvor syns som brickor (släde dubblar farten) → planeringens kostnad → turbon slås på av sig själv när en rush börjar, och efter en miss utan turbo säger meddelandet SLÅ PÅ TURBON → inga konsolfel | **40/40 OK** på alla fyra storlekar |
| `tools/xmas-flow/rush.mjs` med `LONG=1` (414×896) | en bot följer banan på stadens riktiga gator i 150 s speltid (med turbon och gåvornas fart) förbi tempo 12 in i ÖVERTID (Rush 13): inget liv förlorat, 571 paket, inget av 796 paket på ogångbar mark, banan lades om 15 gånger på 9,0 km (1,7 per km; grundspelets omplanering, se 6.1; planeringen medel 0,67 ms, p95 2,6 ms, värsta 89 ms), JS-minnet +0,9 MB (körningen delade processorn med levels-körningarna) | **44/44 OK** |
| `tools/xmas-flow/switch.mjs` (414×896) | grundspelet (2.21.2 med julknappen, den förberedda grenen) → julversionen → tillbaka, i samma flik, grundspelets sparade framsteg kvar | **8/8 OK** |
| Vercel (via API, `karlstad-julklappsjakten`) | se avsnitt 4: projektet finns i samma konto som grundspelets, endast domänen `karlstad-julklappsjakten.vercel.app`; grundspelets produktionsdeploy oförändrad (`main` @ `fadc36a`). Den senaste deployen (`release/jul-2026`) visar sin commit längst ned i startvyn och i `/api/build-info` | **kontrollerat via API** (men adressen är inte öppnad i någon webbläsare) |
| engångsskript (ej incheckade) | JS-tid och ritanrop per bildruta (avsnitt 7), felsökning av HUD mot spelets tillstånd, paketregnens placering mot stadens riktiga karta (82 provpunkter: i snitt 9,5 vanliga paket per regn, aldrig under sex, inget på blockerad mark, inga två närmare än 1,4 m), fritt paketregn (alla nåbara, inga dubbla poäng, försvinner efter sin tid), A/B-prestanda, musik renderad och analyserad | körda, se avsnitt 7 |

**Det som gick fel under verifieringen, och vad det berodde på.** (1) Uppdragsraden visade "LAMNA HOS TOMTEN": prickarna på Ä klipptes av ett element med `overflow:hidden` och tät radhöjd; samma fel fanns i HUD:ens målrad (skärmbilden visade "HAMTA PAKET" och "NA POANGEN"), och topplistans namn hade samma CSS-mönster (där har jag inte sett felet, men Å i ett namn hade klippts på samma sätt). Det syntes först när jag tittade på skärmbilderna, inte i någon kontroll. Åtgärdat och nu mätt av kontroller i `guide.mjs` och `levels.mjs` (kontrollen i uppdragsraden misslyckades på den gamla koden, med prickarna 1,1 px utanför, och lyckas på den nya). (2) `rush.mjs` R2e (HUD jämfört med spelets poäng) föll en gång eftersom boten plockade många paket på en gång (bomb, magnet) mellan två avläsningar och HUD:en uppdateras högst var 60:e ms; kontrollen läser nu båda i samma anrop. (3) `rush.mjs` R2d kräver att minst ett antal paket granskas; på liggande telefon granskades 39 mot kravet 40 (inget felplacerat); kravet är nu 30 (körningarna granskade 39–55). Båda kontrollerna är körda om på `1c032f0`. (4) Den första körningen av `guide.mjs` på 414×896 föll på F3 eftersom kontrollen förväntade sig att julbandet inte fanns i JulRushen (det finns där sedan 2.21.1-xmas.3, pilen och uppdragsraden finns inte); kontrollen är rättad. **2.21.1-xmas.4:** (5) Cervera: en osynlig spärr tvärs över butiksfronten (se 6, Butiksuppdrag). Den syntes inte i något av de tidigare flödena, eftersom de flyttar spelaren rakt in; den hittades först när en bot gick med spelets egen rörelse i små steg, och 24 av 24 försök fastnade före åtgärden. (6) Fri julvandring: på stadens riktiga karta gav ett paketregn i snitt 6,0 vanliga paket i stället för de 8–12 som begärdes (navigeringsrutnätet har tre meters rutor och flera paket hamnade på samma punkt); enhetstesterna med en påhittad karta såg inte det. Åtgärdat, och ett enhetstest med en grov rutnätskarta kontrollerar placeringen. (7) Flera webbläsarkontroller föll under arbetet på tidpunkter (en pil som inte hunnit vridas, en text som lästes före nästa bildruta, en rush som inte hann till tempo 3 på en belastad maskin): kontrollerna väntar nu på de verkliga händelserna i stället för fasta tider, och de tidskänsliga körs ensamma. (8) `rush.mjs` R10c räknade omläggningar av banan per sekund; med turbon och gåvornas fart går boten dubbelt så långt per sekund, så kontrollen räknar nu per kilometer.

Verktygen körs mot en lokal server (se rubriken i varje fil). Ett fel som först syntes tidigare (Cervera efter Pressbyrån) berodde på att grundspelets resultatkort ligger kvar i 14 s och tar det första knapptrycket vid nästa plats: grundspelets eget beteende, inte ett fel i julkoden.
Testet trycker nu FORTSÄTT som en spelare gör, och julversionen stänger kortet själv när ett nytt läge startar.

**Inte verifierat (finns inte i den här miljön):**
- iPhone 11/Safari och MacBook Air 2018: bildfrekvens, känsla, värme, minne, WebKit-specifikt beteende (tyst läge, låsskärm/bakgrund, `100dvh`, pekkänsla, adressfältets höjd).
- Riktig GPU-prestanda. De mätningar som finns är jämförelser mellan grundspelet och julversionen i samma mjukvaruritade miljö, och JS-tid på en server.
- Hur musiken och gåvornas ljud *låter*, inklusive JulRushens (`rush`, 116 slag/min, tempot följer nivån). Den är provrenderad i riktig webbläsare och analyserad (ingen klippning, topp 0,26) men ingen människa har lyssnat.
- **Hur JulRushen känns att spela**: balansen (målen, hur snabbt tempot stiger, hur ofta gåvor kommer, hur svåra klockorna är, om hjärtana räcker) är räknad och provkörd med en bot som är lika snabb som spelet kräver. Ingen människa har spelat Rush 1–12; hur svåra Rush 6–12 är för en människa med tummarna är **okänt**.
- **Delningen och länkarna på en telefon:** telefonens delningsruta (`navigator.share`) finns inte i headless Chromium och är inte provad; urklippet och länken är provade, liksom att en andra spelare öppnar länken. Att länken klarar att skickas via iMessage, WhatsApp eller Messenger (som kan ändra eller korta adresser) och öppnas i deras egna webbläsare är inte provat.
- **Ingen gemensam topplista för alla spelare** är byggd (se avsnitt 6.3 och 10).
- **Tomtezombies-nivåerna (2–99) och fri julvandring är inte spelade av en människa.** Webbläsarprovet klarar nivå 2–5 genom att flytta spelaren till paketen med zombierna avstängda, så att banan, kortet, sparningen och knapparna provas; om en människa klarar nivå 2–5 mot zombierna, och hur svåra nivå 6–99 är (nästa patrull var 7:e till var 3,5:e sekund, zombier ×1,25–1,5), är **inte provat**. Paketregnens takt och storlek är provade med en modell och på stadens karta (avsnitt 6), inte med en människa som går vilse eller stannar.
- **Cervera-dörren är provad med spelets egen rörelsekod** (små och stora steg, flera startlägen, 24 in och 24 ut), men inte med en tumme på en pekskärm eller på en riktig telefon. Samma osynliga spärr finns i grundspelet (`main`, Mitt i City) och är **inte** åtgärdad där.
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
- **Tomtezombies har nivåer (2.21.1-xmas.4) som ingen människa har spelat.** Nivå 1 är den gamla jakten, nivå 2–99 går julrundornas banor i tur och ordning (Torget, Kungsgatan, Drottninggatan) med två paket mer per nivå (högst 40), nästa patrull högst 11 s fram på nivå 2 och ner till 3,5 s på nivå 10, och zombier som går 5 % snabbare per nivå (högst ×1,5). Hjärtan, energi och zombieklasserna är grundspelets och rörs inte; farten sätts när en zombie skapas och tätheten genom att nästa patrull aldrig ligger längre fram än nivåns takt (`xmas-zombie-levels.mjs`, `xmas-boot.js`). Siffrorna (`zombieGoal`, `zombiePatrolEvery`, `zombieSpeed`) är gissade utifrån grundspelets egen takt och är de som ska ändras efter spelartester; ingen simulering av hur långt en spelare kommer finns för Tomtezombies (till skillnad från JulRushen).
- **Fri julvandring och dess paketregn** (avsnitt 6) är inställda med en modell av en spelare som alltid går rakt mot paketen och med stadens karta; siffrorna i `FREE_RAIN` (`xmas-config.mjs`) är de att ändra om det i verkligheten blir för många eller för få paket. Regnen är inte sparade och poängen ger ingen titel.
- **Dörrspärren i Mitt i City finns också i grundspelet.** Butikerna i Mitt i City (Cervera, Coop City, Clas Ohlson) har en osynlig spärr tvärs över fronten mot atriet; den är åtgärdad i julbyggets `mall-space.mjs` (avsnitt 5) men inte på `main`. Vill du ha rättningen i grundspelet är det en separat, liten ändring (en funktion och två villkor) som kan tas dit efter att julbyggets rörelsetester körts där.
- **JulRushen är inte spelad av en människa, varken på en telefon eller en dator.** Svårigheten (klockan som blir trängre för varje rush, målen 25–50 paket och 2 000–14 000 poäng, hjärtareglerna, övertiden och hur ofta gåvor kommer: ungefär vart tredje paket, plus sidopaket) är räknad och provad mot **modellerade spelartyper** (`tools/xmas-flow/difficulty.mjs`, se 6.1), inte mot människor. Provet säger att en simulerad nybörjare nu stannar vid Rush 6, en vanlig vid Rush 8, en duktig vid Rush 10 och en mycket duktig vid Rush 13, men hur riktiga spelare med tummarna ligger till, om Rush 1–3 är för svåra för en riktig nybörjare, och hur ofta riktiga spelare lyckas plocka fartgåvorna i tid är **okänt**. Siffrorna ligger samlade (`PRESSURE` och målformlerna i `xmas-rushes.mjs`, `RUSH` och `GIFT_WEIGHT` i `xmas-rush.mjs`) och går att justera efter de första spelarna; provet kan köras om efter varje ändring. Titlarna (NYFIKEN … ÖVERTOMTE) räknar bara en tiondel av rushpoängen.
- **Klockan är räknad på turbon.** JulRushen slår på turbon när en rush börjar (och återställer spelarens eget val när man lämnar den). Stänger man av turbon i en rush hinner man inte långt: det är avsiktligt, men det är inte provat med riktiga spelare att det känns rätt, och en spelare som aldrig hittar turbo-knappen får en svår start. Knappen är den vanliga TURBO-knappen från grundspelet.
- **Ingen gemensam topplista för alla spelare.** Topplistan visar dig och de vänner som skickat dig en utmaningslänk (högst 30), sparat på enheten. En lista som alla delar kräver att namn och poäng lagras på en server (till exempel Vercel Blob eller en databas, plus en liten serverfunktion), regler för publika namn (barn spelar) och skydd mot fusk. Det är inte byggt och kräver ditt godkännande, eftersom det skapar lagring i molnet och sparar uppgifter om spelare.
- **Utmaningslänkar går att förfalska.** Ingen server kontrollerar poängen i en länk; kontrollsumman fångar skrivfel och trasiga länkar, inte en avsiktligt handgjord länk. Det är en vänutmaning, inte en tävling med pris.
- **Vägledningen** (pil, julband, kantmarkörer, uppdragsrad) är bara prövad i headless Chromium med mjukvaruritad grafik på tre skärmstorlekar. Hur väl den syns i solljus, på en riktig telefon och för någon som aldrig spelat är inte provat. Julbandet är högst 18 platta bitar (9 i lätt läge) och pilen och raden är vanliga HTML-element, så kostnaden bör vara liten, men det är inte mätt på någon telefon.
- **Hög fart är inte provad med människor.** Med turbon, tempo 12 (×1,88) och fartgåvor (högst ×4 tillsammans) kan farten bli upp till 15 gånger gångfarten (ungefär 100 m/s) en kort stund; grundspelets egen högsta fart i TempoRush är ×7,5 (renssläde, turbo och tempo 12). Rörelsen delas i delsteg så att inga väggar hoppas över, men hur svårt det är att *styra* i den farten på en telefon är okänt. Är det för svårt är `RUSH.speedCap` (4) och `RUSH.boost` (glögg ×1,5, raket ×3, medvind ×1,3, skridskor ×1,25) i `xmas-rush.mjs` de siffror att sänka; kör sedan svårighetsprovet igen.
- **Fartgåvor:** fem gåvor ökar farten (renssläden ×2, turboglöggen ×1,5, pepparkaksraketen ×3, medvinden ×1,3 och skridskorna ×1,25; den starkaste gäller, släden multipliceras på, högst ×4 tillsammans); de fyra nya kom i 2.21.1-xmas.4. Fler kan läggas till i `GIFTS`, `RUSH.boost` och `GIFT_WEIGHT` i `xmas-rush.mjs` (en post per gåva, med vikt och effekt) och en bild i `xmas-art.js`.
- Butiksuppdragens personal är grundspelets figurer (inte tomteklädda).
- Förberedda butiker (Kjell & Company, Åhléns, Duvan, Värmlands Museum, Sandgrund) har data men ingen interiör eller något godkänt innehåll.
- Julmiljön finns främst runt Stora Torget och utmed fasaderna däromkring; övriga delar av staden har snö men inte egna julföremål.
- På skrivbord syns grundspelets båtbusshållplats (en låg platta med skylten BÅTBUSS) i högerkanten av första bilden. Det är grundspelets eget föremål och är inte ändrat.
