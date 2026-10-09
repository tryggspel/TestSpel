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

Versionsbeteckning: `X.Y.Z-xmas.N`, där `X.Y.Z` är basversionen på `main` och `N` räknar julbyggen (**`2.21.1-xmas.3`**). Det synliga namnet är
**Julklappsjakten – 2.21-XMS**. `node tools/set-version.mjs 2.21.1-xmas.4` (nästa bygge) sätter en enda cache-nyckel i alla moduler, HTML och CSS
(testet `version.test.mjs` och CI kräver att den är densamma överallt). Samma beteckning visas i startvyn (längst ned), i `window.KarlstadRound.version`,
i `?debug` och i `/api/build-info`.

## 3. Sammanhängande bygge (inga blandade filer)

- Inga imports till andra spelversioner, ingen kod hämtas från grundspelets adress, **ingen service worker** (testas i `tests/xmas-build.test.mjs`).
- Alla moduler, HTML och CSS bär samma `?v=`-nyckel, så en ny version kan aldrig blanda gamla och nya filer i webbläsarens cache.
- Julmusiken syntetiseras i spelet: inga ljudfiler laddas ner (grundspelets mp3 hämtas först om jukeboxen används).
- Spelmotorn (PlayCanvas 2.22.4) hämtas från jsDelivr med fast version, som i grundspelet.
- Startvyn visar `Julklappsjakten – 2.21-XMS · bygge 2.21.1-xmas.3 · <miljö> <gren> <commit> · bas 2.21.1 (fadc36a)`. `/api/build-info` (Vercel-funktion)
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

All julkod ligger under `xmas/` (27 filer), `tests/xmas-*.test.mjs` (10 filer) och `tools/xmas-flow/` (5 verifieringsskript). Grundspelets egna filer är rörda så här (utöver cache-nyckeln `?v=` som byts överallt):

| Fil | Ändring |
|---|---|
| `app.js` | Snöfilter (`ComicMesh.snow`), vinterfärger för mark, vägar och himmel, inga XP-kulor på torget, julens kollisionsrutor, ingen snö inomhus, julmusiken (grundspelets mp3 hämtas lazy); JulRushen: `musicTempo` styr även julmusikens tempo och stämningen `rush` ligger kvar (tre rader) |
| `last-round.js` | Importerar och startar `installXmas`, tömmer termosar, hindrar Halloween-jakt, panellistan (nu även `xmas-rush`, `xmas-board`, `xmas-challenge`), HUD-hook, radar-hook, tomtezombie-bilder, butiksuppdrag med julens platser. Vägledningen: en villkorsrad i `updateRoute` (`!destination.quiet`) och en egenskap `quiet` på tempomålet i JulRushen, så att grundspelets små pilar på marken och flaggan "DITT MÅL" inte ritas för julens mål |
| `journey-rules.mjs` | `objective()`-hook, `stepExplore()` och zombie-`step()` anropar paketjakten, `finish()` ger Tomtezombies eget slut |
| `index.html` | Titel, tre julpaneler, länk till `xmas/xmas.css`, pausmenyns rubrik, ingen preload av mp3; JulRushen: två knappar `JULRUSHEN` med förklaring (startvyn och fortsättningsmenyn), rushmenyn, topplistan, utmaningskortet och knappen UTMANA EN VÄN på slutkortet |
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
| Butiksuppdrag | Cervera: Tomtarnas fikabord (kopp, kanna, fat). Pressbyrån: Tomtarnas fikaorder (kaffe, lussebulle, pepparkaka …) och leverans till tomten utanför. Förberett (osynligt): Kjell & Company, Åhléns, Duvan, Värmlands Museum, Sandgrund. Inga erbjudanden eller samarbeten påstås. |
| Fri julvandring | Tomtarna tappar ett nytt paketregn med jämna mellanrum (egna paket-ID, tydlig varning, försvinner efter 4 minuter). |
| Tomtezombies | Grundspelets zombieregler (AI, rörelse, pooler, högst sex aktiva, patruller, ambushar, Guld-Nisse) med julens bilder. Paket är mål och ammunition. Eget slutkort. |
| JulRushen | TempoRush i julens värld: **tolv rusher** med fast, stigande tempo, mål, hjärtan, stjärnor och upplåsning, **Maraton** (tempot stiger var 15:e sekund), elva julgåvor, sidopaket, topplista och utmaningar. Se 6.1 och 6.3. |

Kombo, poäng och belöningar: 10 poäng per paket, ×2/×3/×4 vid 4/8/12 i rad (engångsbonus 20/40/60), bonuspaket 50, leverans 100 + tidsbonus upp till 100.
Fångstfältet är detsamma som för termosar i 2.20.0 (växer med farten, ingen insamling genom väggar). Gångfarten är 7,2 m/s (grundspelet).

### 6.1 JulRushen – TempoRush med paket (tolv rusher och Maraton)

**JULRUSHEN** finns i startvyn och i fortsättningsmenyn och öppnar **rushmenyn**: tolv rusher (nivåer) i ett rutnät, en spelaknapp, MARATON och TOPPLISTA OCH UTMANING. Det är grundspelets TempoRush (en klocka till nästa mål, tre liv, ett tempo som styr fart och poäng) i julens värld.
Banan, klockan, fångstfältet och pilen är **grundspelets egna**: julkoden anropar `journey.supplyTempo`, `pickTempoTarget`, `tempoAim`, `inCatch` och använder `journey.tempo`.
Det som är jul är paketen, gåvorna, poängen, namnen, musiken och gränssnittet. Julkoden skriver aldrig i grundspelets händelsekö, så grundspelets termosmeddelanden för tempo körs aldrig.

| Läge | Så fungerar det |
|---|---|
| Tolv rusher | Varje rush har ett **fast tempo från första sekunden** (rush *n* = TempoRuns tempo *n*: fart ×1,00 → ×1,88, poäng ×1,0 → ×4,3, tätare klockor, glesare paket, större fångstfält) och ändras inte under rushen. Tempot stiger alltså **från rush till rush**. Varje rush har ett mål och tre hjärtan: udda rusher har ett paketmål (13–18 paket), jämna rusher ett poängmål (lika mycket spel som en paketrush, räknat med kedja ×2 och flytbonus). När målet nås är rushen klarad: **stjärnor = hjärtan som är kvar** (1–3), bästa poäng och stjärnor sparas och nästa rush låses upp. Tappar man alla hjärtan slutar rushen utan stjärnor och utan upplåsning. |
| Serie | NÄSTA RUSH på slutkortet startar nästa rush direkt och tar med hjärtana (plus ett nytt, högst tre). Rusher klarade i rad räknas som en serie (längsta serien sparas). Eftersom tempot stiger för varje rush och hjärtana följer med blir det svårt att klara många rusher i rad. En rush som startas från rushmenyn börjar alltid med tre hjärtan. |
| Maraton | Det ursprungliga JulRushen-läget: tempot stiger var 15:e sekund (tempo 1–12) tills man är ute. Rekord (poäng, tempo, paket) och julstämpeln JULRUSHEN vid tempo 5 som förut. |

De tolv rusherna (fart ×/poäng × är tempots; målen är samma varje gång):

| Rush | Namn | Tempo (fart / poäng) | Mål |
|---|---|---|---|
| 1 | JULMYS | ×1,00 / ×1,0 | hämta 13 paket |
| 2 | PEPPARKAKA | ×1,08 / ×1,3 | nå 600 poäng |
| 3 | GLÖGGFART | ×1,16 / ×1,6 | hämta 14 paket |
| 4 | SNÖYRA | ×1,24 / ×1,9 | nå 1 100 poäng |
| 5 | SLÄDFART | ×1,32 / ×2,2 | hämta 15 paket |
| 6 | ISRASERI | ×1,40 / ×2,5 | nå 1 700 poäng |
| 7 | RENRACE | ×1,48 / ×2,8 | hämta 16 paket |
| 8 | NORDPOLEN | ×1,56 / ×3,1 | nå 2 350 poäng |
| 9 | JULSTRESS | ×1,64 / ×3,4 | hämta 17 paket |
| 10 | SNÖSTORM | ×1,72 / ×3,7 | nå 3 100 poäng |
| 11 | PAKETVIRVEL | ×1,80 / ×4,0 | hämta 18 paket |
| 12 | TOMTEGALET | ×1,88 / ×4,3 | nå 3 900 poäng |

Poängmålen är räknade, inte provspelade av människor: en perfekt bot klarar rush 2 på ungefär 12 s speltid med tre hjärtan, och hur svåra rush 6–12 är för en människa med tummarna är **inte känt** (se avsnitt 8 och 10).

| Del | Så fungerar det |
|---|---|
| Start | På Stora Torget, vänd åt det håll där banan får den längsta fria gatusträckan (grundspelets `planHeading` prövas i tre riktningar). Banan läggs ut i första bildrutan från spelarens verkliga plats och riktning. |
| Banan | Ett pärlband av paket längs långa, fria sträckor, 150–320 m framåt, 11,5 m mellan paketen på tempo 1 och 28 m på tempo 12. Aldrig i väggar, stånd, granar eller vatten (kontrollerat mot spelets egna kollisioner); sträckorna viker av vid hinder och följer gator där det finns gatudata. Hamnar man långt från banan (bussresa, omväg) börjar den om vid spelaren. Samma omplanering (grundspelets `anchorCourse`, när nästa paket ligger över 55 m bort) sker också när banan viker tillbaka längs samma gata (grundspelet släpper de paket som spelaren redan "passerat" längs deras riktning) och när ett tomtebloss eller en kryddbomb tagit paketen framför. Det kostar inget liv. |
| Klockan | Tiden till nästa paket är sträckan med omväg vid 85 % av tempots fart plus en marginal som krymper från 9 s (tempo 1) till 2,2 s; går den ut tappar man ett hjärta. I en rush är tempot fast (nivåklockan nollas före varje steg); i Maraton stiger det var 15:e sekund. Första paketet ligger ca 12 m bort med ca 12 s på klockan. |
| Fångst | Som i TempoRush: `tempoReach` (3,6 m på tempo 1, upp till 6,5 m) eller `catchReach(fart)`, hela sträckan sedan förra steget räknas och fri sikt krävs (ingen fångst genom väggar). |
| Poäng | Vanligt paket 10 × kedjefaktor (×2/×3/×4 vid 4/8/12 i rad som i jakten, engångsbonus 20/40/60), guldpaket 50. Därefter tempots poängfaktor och **flyt**: +12 × tempo om paketet tas med minst hälften av klockan kvar. Julstjärnan (×2) och Guldklappen (×3) gäller ovanpå. |
| Guldpaket | Ungefär vart tredje paket på banan bär en gåva: grundspelets förmågebärare (var sjätte pärla är alltid ett, plus de som dagens fördelning ger) och dessutom var tionde vanligt paket (`RUSH.extraBearer`). Gåvan är bestämd av paketets id (samma paket, samma gåva). Varje guldpaket har en **bricka med gåvans symbol** över sig och en gyllene stråle, så att man ser vad man får innan man tar det. |
| Sidopaket | Var fjärde pärla på banan får ett valfritt guldpaket med gåva 6–10,5 m åt sidan (en avstickare; högst fem åt gången, borta efter 40 s, alltid på fri mark med fri sikt från banan). Det räknas **inte** mot målet och rör varken klockan eller nästa mål: man tjänar bara poäng (50 × tempots faktor), kedja och gåva, och förlorar ingenting på att hoppa över det. |
| Pil, stråle och band | Grundspelets stora riktningspil (siktar en bit längre fram på banan) och kantmarkörer när målet är utanför bilden, på en mörk platta mot snön. Nästa paket är större och har en hög grön ljusstråle och en ring på marken. Längs vägen dit rullas **julbandet** ut (6.2) i stället för grundspelets små pilar och flaggan "DITT MÅL". Radarn visar paketen och nästa paket som en grön ring. |
| Gränssnitt | Överst: RUSH och numret (TEMPO i Maraton), en stapel för tiden till nästa paket (röd och blinkande under 30 %), hjärtan. Under: rushens namn och poäng, **målraden** (HÄMTA PAKET 5/13 eller NÅ POÄNGEN 640/1 100 med en förloppsstapel), kombo och aktiva gåvor som små brickor. Slutkort med stjärnor, paket, bästa kombo, tid, gåvor, sidopaket, tidigare rekord, serie, NÄSTA RUSH / FÖRSÖK IGEN, UTMANA EN VÄN och RUSHMENYN. På låga skärmar (högst 760 px: till exempel en iPhone i Safari med adressfältet synligt, och liggande telefon) visas de tolv rusherna i två rader om sex med bara siffra och stjärnor, så att spelaknappen syns utan att bläddra. På liggande telefon utgår ingressen i rushmenyn och huvudknappen (NÄSTA RUSH, SPELA RUSH, TA UTMANINGEN) följer med i kortets kant när kortet är högre än skärmen. Texter som klipps av sin ruta har tre pixlars luft upptill så att prickarna på Å, Ä och Ö syns (en kontroll i webbläsarverktygen mäter det). |
| Stämplar och rekord | Julstämpeln **JULRUSHEN** delas ut första gången man klarar Rush 5 (eller når tempo 5 i Maraton); julstämpeln **TOMTEGALET** när man klarar Rush 12 (stämpelräknaren går till 9). Per rush sparas bästa poäng, tid, paket och hjärtan samt stjärnor, och längsta serie, i `karlstad-xmas:save:1` (`rush`); Maratonrekordet ligger kvar i `records.julrush`. Bara klarade rusher sparas. Mot titlarna (NYFIKEN … ÖVERTOMTE) räknas en tiondel av poängen. Att ge upp via pausmenyn (JULMENY) räknas som en förlust: ingenting av rushen sparas utöver summorna om den hade minst ett paket. |
| Musik | Egen stämning `rush` (G – D – Em – C, 116 slag/min, slädklockor på varje åttondel, mjuk puls på varje slag). Tempot följer rushens nivå (×1,00 → ×1,33), som grundspelets musik gör i TempoRush. |

Julgåvorna ersätter grundspelets tolv förmågor (elva sorter; "andel" är chansen att en gåva är just den, av 24):

| Gåva | Effekt | Tid | Andel |
|---|---|---|---|
| RENSLÄDEN | Farten fördubblas (grundspelets raketförmåga, som turbon räknar med) | 7 s | 3/24 |
| JULMAGNETEN | Paket inom 13 m med fri sikt (banans och sidopaketen) dras in mot dig på en kvarts sekund och tas. Genom väggar dras inget | 10 s | 3/24 |
| TOMTESPÖKET | Ett vänligt spöke med tomteluva flyger till närmaste paket (högst 46 m bort, helst framför dig) och tar det åt dig, ett var 0,8:e sekund (ungefär nio paket) | 9 s | 2/24 |
| JULSTJÄRNAN | Dubbla poäng och 2 m större fångstfält | 9 s | 2/24 |
| JULKLOCKAN | +8 s till nästa paket | – | 3/24 |
| GLÖGGPAUS | Klockan till nästa paket står still | 7 s | 2/24 |
| GULDKLAPPEN | Allt ger tre gånger så mycket | 20 s | 2/24 |
| TOMTEBLOSS | Tar alla paket i en rak linje framför dig (högst 16, inom 80 m och ±6 m) | – | 2/24 |
| PEPPARKAKSSKÖLD | Räddar ett hjärta nästa gång klockan går ut (+5 s), högst två åt gången; den sällsyntaste gåvan | – | 1/24 |
| KRYDDBOMBEN | Tar alla paket inom 24 m (högst 14), närmast först | – | 2/24 |
| PAKETREGNET | Åtta extra paket (färre där det är trångt) på fria platser 5–13 m runt dig. De räknas inte mot målet och försvinner efter 12 s | – | 2/24 |

Paket som tas av bloss, bomb, magnet eller spöke ger sina gåvor, men ett paket i ett bloss eller en bomb utlöser aldrig ett nytt bloss, en ny bomb eller ett nytt regn (annars kunde det rulla utan slut).

Skillnader mot grundspelets TempoRush: grundspelets termosbaserade förmågor hoppstövlar, sonar och kombosköld finns inte i julen (de hade ingen funktion i en bana av paket); bomb, bönregn, spöke och magnet är med, i julens skepnad.
JULKLOCKAN lägger sina åtta sekunder på *nästa* mål även om den plockas mellan två mål. I grundspelets TempoRush försvinner den tiden när nästa mål väljs (kontrollerat med grundspelets egen kod: `takeItem` plockar först, lägger sedan till tiden, och `setTarget` skriver över den). Det är lämnat som det är i grundspelet (`main` är orört).
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
| Topplistan | TOPPLISTA OCH UTMANING i rushmenyn (och UTMANA EN VÄN på slutkortet). Väljaren visar TOTALT (summan av bästa poäng i varje rush) eller en enskild rush, med dig och dina vänner, sorterat på poäng (lika poäng: du först). Bara de som klarat rushen finns med. |
| Namn | Ett smeknamn man själv skriver (högst 12 tecken: bokstäver, siffror, mellanslag, punkt, understreck, bindestreck; annat tas bort). Sparas i `karlstad-xmas:save:1`. Det är det enda som delas, tillsammans med poängen. |
| Utmaningslänk | `https://karlstad-julklappsjakten.vercel.app/?utmaning=…` Länken bär en liten profil (namn, bästa poäng i varje rush, stjärnor) och en utmaning ("slå mina 3 120 poäng i Rush 4"). SKICKA UTMANING öppnar telefonens delningsruta (Web Share) och faller tillbaka på KOPIERA LÄNKEN. Formatet: `J1|namn|rush|klarat|stjärnor|tid|poäng ×12|kontrollsumma`, base64url. |
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

**Utrustning som faktiskt använts:** en Linux-container med headless Chromium 141 och mjukvaruritning (SwiftShader), utan GPU. Skärmstorlekar som provats:
mobilformat 414×896 med emulerad tryckskärm, 414×715 (höjden på en iPhone i Safari med adressfältet synligt), liggande telefon 896×414, liten telefon 375×667 och skrivbord 1000×640.
**Ingen riktig telefon eller Mac, ingen Safari/WebKit** (bara Chromium finns i miljön).

**Automatiskt:** `node --test tests/*.mjs`: **474 tester, alla gröna** (42 fler än i 2.21.1-xmas.2: vägledning 14, rushnivåer 4, topplista och länkar 8, JulRushen 16) och CI-jobbet `Karlstad 2.11 tests` (kör testerna och kontrollen av cache-nyckeln) på `claude/stoic-tesla-59znyc` och `release/jul-2026` (grönt på `1c032f0`, körning 340).

**Webbläsarflöden (riktigt spel, riktig tryckning på knapparna, flyttning av spelaren; inga mocker).** Verifierad kod: commit `1c032f0` (2.21.1-xmas.3). Spelets filer (allt utom tester, verktyg och data) hade samma kontrollsumma före och efter körningarna, och de är byte-för-byte de som checkades in; commits därefter ändrar bara dokumentation.

| Verktyg | Vad | Resultat |
|---|---|---|
| `tools/xmas-flow/guide.mjs` (414×896, 414×715, 896×414, 375×667, 1000×640) | **Vägledningen i Julklappsjakten:** pilen finns direkt och pekar på första paketet (rakt fram, med avstånd och namn) → uppdragsraden visar båda stegen och klipper inte prickarna på Å, Ä, Ö → grundspelets små pilar, DITT MÅL-flagga och kompasspill ritas inte → pilen vrids åt rätt håll när man vänder sig (höger, vänster, bakom), kanterna lyser, pilen blir grön när man går rätt → efter varje paket byter pilen mål i ordning, uppdragsraden räknar, efter målet pekar den på tomten → utan fri sikt följer pilen gångvägen runt hus (inte genom dem) och julbandet ligger längs vägen → på öppen mark syns minst åtta bitar av julbandet ovanför styrkontrollerna, smalnar av mot horisonten och rör sig → Tomtezombies har samma vägledning → JulRushen behåller grundspelets pil → butiksuppdrag och menyer lämnas ifred → inga konsolfel | **34/34 OK** på alla fem storlekar |
| `tools/xmas-flow/levels.mjs` (samma fem storlekar) | **JulRushens tolv nivåer, gåvor, topplista och utmaningar:** rushmenyn (tolv rutor, bara Rush 1 öppen, alla minst 48 px) → Rush 1 startar med mål och HUD (HÄMTA PAKET 0/13, prickarna syns), en bot klarar den: slutkort med tre stjärnor, sparning i julbyggets egen nyckel, Rush 2 upplåst → NÄSTA RUSH: Rush 2 med poängmål, fast tempo, hjärtana följer med, rushmenyn visar stjärnor och nästa rush → tre missade klockor: slut på hjärtan, inga stjärnor, ingen upplåsning → Rush 12 på tempo 12 → magnet och tomtespöke (brickor, spöket ritas, gåvobrickor på guldpaket), paketregn, kryddbomb och sidopaket i riktig 3D → topplistan, namn, utmaningslänk (kopieras, avkodas i Node), **en andra spelare i en ny webbläsarkontext öppnar länken**: utmaningskortet, TA UTMANINGEN, jämförelsen efter rushen ("DU SLOG …"), vänlistan → trasig länk, profil utan utmaning, adressen städas → inga konsolfel | **38/38 OK** på alla fem storlekar |
| `tools/xmas-flow/flow.mjs` (414×896, 1000×640) | startvy och version → introduktionen (mål 20, 30 + 3 paket, paketen syns, målet visas, leverans, resultatkort, stämpel) → sparning i egna nycklar och efter omladdning → tre rundor (Kungsgatan spelad hela vägen) → miljön (8 stånd, granar, ljusslingor, snö utomhus men inte inomhus, ~6 tomtar nära) → Pressbyrån (beställning och leverans) och Cervera → Tomtezombies (4 typer, högst sex aktiva, tagen, försök igen) → inga zombier i Julklappsjakten → väder av/på, mute → tillbaka-knapparna → inga konsolfel | **37/37 OK** på båda |
| `tools/xmas-flow/rush.mjs` (414×896, 414×715, 896×414, 1000×640) | **JulRushen (Maraton) och helheten kring den:** knappen i startvyn (≥ 48 px) → rushmenyn → start (läge, tempo 1, tre liv, rusmusik, inga zombier, pil, stråle, julband, paket, HUD) → en bot följer spelets egna mål i speltid: ≥ 25 paket, tempo 3, inga förlorade liv, guldpaket ger gåvor som syns som brickor, inga paket i väggar, stånd eller granar (39–55 paket kontrollerade mot spelets kollisioner per körning), fart och poängfaktor stiger, HUD:en stämmer med spelet → brådskande klocka → tre missade klockor ger ♥♥♡ → ♥♡♡ → ♡♡♡ och slutkort → rekordet sparas under julbyggets nyckel utan att något skrivs under grundspelets → EN RUSH TILL börjar om → pausmenyn fryser klockan och JULMENY sparar körningen och städar banan, farten och musiken → tempo 5 ger julstämpeln → Julklappsjakten startar som förut efter en rush → fortsättningsmenyn → alla gåvor syns som brickor (släde dubblar farten) → planeringens kostnad → inga konsolfel | **38/38 OK** på alla fyra storlekar |
| `tools/xmas-flow/rush.mjs` med `LONG=1` (414×896) | en bot följer banan på stadens riktiga gator i 200 s speltid till tempo 12: inget liv förlorat, 176 paket, inget av 354 paket på ogångbar mark, banan lades om 9 gånger (grundspelets omplanering, se 6.1), JS-minnet +9 MB (körningen delade processorn med en annan mätning) | **42/42 OK** |
| `tools/xmas-flow/switch.mjs` (414×896) | grundspelet (2.21.2 med julknappen, den förberedda grenen) → julversionen → tillbaka, i samma flik, grundspelets sparade framsteg kvar | **8/8 OK** |
| Vercel (via API, `karlstad-julklappsjakten`) | se avsnitt 4: projektet finns i samma konto som grundspelets, endast domänen `karlstad-julklappsjakten.vercel.app`; grundspelets produktionsdeploy oförändrad (`main` @ `fadc36a`). Den senaste deployen (`release/jul-2026`) visar sin commit längst ned i startvyn och i `/api/build-info` | **kontrollerat via API** (men adressen är inte öppnad i någon webbläsare) |
| engångsskript (ej incheckade) | JS-tid och ritanrop per bildruta (avsnitt 7), felsökning av HUD mot spelets tillstånd, fritt paketregn (5–6 paket på 43–48 m håll, alla nåbara, inga dubbla poäng, försvinner efter sin tid), A/B-prestanda, musik renderad och analyserad | körda, se avsnitt 7 |

**Det som gick fel under verifieringen, och vad det berodde på.** (1) Uppdragsraden visade "LAMNA HOS TOMTEN": prickarna på Ä klipptes av ett element med `overflow:hidden` och tät radhöjd; samma fel fanns i HUD:ens målrad (skärmbilden visade "HAMTA PAKET" och "NA POANGEN"), och topplistans namn hade samma CSS-mönster (där har jag inte sett felet, men Å i ett namn hade klippts på samma sätt). Det syntes först när jag tittade på skärmbilderna, inte i någon kontroll. Åtgärdat och nu mätt av kontroller i `guide.mjs` och `levels.mjs` (kontrollen i uppdragsraden misslyckades på den gamla koden, med prickarna 1,1 px utanför, och lyckas på den nya). (2) `rush.mjs` R2e (HUD jämfört med spelets poäng) föll en gång eftersom boten plockade många paket på en gång (bomb, magnet) mellan två avläsningar och HUD:en uppdateras högst var 60:e ms; kontrollen läser nu båda i samma anrop. (3) `rush.mjs` R2d kräver att minst ett antal paket granskas; på liggande telefon granskades 39 mot kravet 40 (inget felplacerat); kravet är nu 30 (körningarna granskade 39–55). Båda kontrollerna är körda om på `1c032f0`. (4) Den första körningen av `guide.mjs` på 414×896 föll på F3 eftersom kontrollen förväntade sig att julbandet inte fanns i JulRushen (det finns där sedan 2.21.1-xmas.3, pilen och uppdragsraden finns inte); kontrollen är rättad.

Verktygen körs mot en lokal server (se rubriken i varje fil). Ett fel som först syntes tidigare (Cervera efter Pressbyrån) berodde på att grundspelets resultatkort ligger kvar i 14 s och tar det första knapptrycket vid nästa plats: grundspelets eget beteende, inte ett fel i julkoden.
Testet trycker nu FORTSÄTT som en spelare gör, och julversionen stänger kortet själv när ett nytt läge startar.

**Inte verifierat (finns inte i den här miljön):**
- iPhone 11/Safari och MacBook Air 2018: bildfrekvens, känsla, värme, minne, WebKit-specifikt beteende (tyst läge, låsskärm/bakgrund, `100dvh`, pekkänsla, adressfältets höjd).
- Riktig GPU-prestanda. De mätningar som finns är jämförelser mellan grundspelet och julversionen i samma mjukvaruritade miljö, och JS-tid på en server.
- Hur musiken och gåvornas ljud *låter*, inklusive JulRushens (`rush`, 116 slag/min, tempot följer nivån). Den är provrenderad i riktig webbläsare och analyserad (ingen klippning, topp 0,26) men ingen människa har lyssnat.
- **Hur JulRushen känns att spela**: balansen (målen, hur snabbt tempot stiger, hur ofta gåvor kommer, hur svåra klockorna är, om hjärtana räcker) är räknad och provkörd med en bot som är lika snabb som spelet kräver. Ingen människa har spelat Rush 1–12; hur svåra Rush 6–12 är för en människa med tummarna är **okänt**.
- **Delningen och länkarna på en telefon:** telefonens delningsruta (`navigator.share`) finns inte i headless Chromium och är inte provad; urklippet och länken är provade, liksom att en andra spelare öppnar länken. Att länken klarar att skickas via iMessage, WhatsApp eller Messenger (som kan ändra eller korta adresser) och öppnas i deras egna webbläsare är inte provat.
- **Ingen gemensam topplista för alla spelare** är byggd (se avsnitt 6.3 och 10).
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
- **JulRushen är inte spelad av en människa, varken på en telefon eller en dator.** Tempot per rush (TempoRushs nivåer 1–12), de tre hjärtana, klockorna, målen (13–18 paket och 600–3 900 poäng) och hur ofta gåvor kommer (ungefär vart tredje paket, plus sidopaket) är räknade och provkörda med en bot, inte provspelade. Hur svåra Rush 6–12 är för en människa med tummarna, och om Rush 12 går att klara alls, är **okänt**. Siffrorna ligger samlade (`xmas-rushes.mjs`, `RUSH` i `xmas-rush.mjs`) och går att justera efter de första spelarna. Titlarna (NYFIKEN … ÖVERTOMTE) räknar bara en tiondel av rushpoängen.
- **Ingen gemensam topplista för alla spelare.** Topplistan visar dig och de vänner som skickat dig en utmaningslänk (högst 30), sparat på enheten. En lista som alla delar kräver att namn och poäng lagras på en server (till exempel Vercel Blob eller en databas, plus en liten serverfunktion), regler för publika namn (barn spelar) och skydd mot fusk. Det är inte byggt och kräver ditt godkännande, eftersom det skapar lagring i molnet och sparar uppgifter om spelare.
- **Utmaningslänkar går att förfalska.** Ingen server kontrollerar poängen i en länk; kontrollsumman fångar skrivfel och trasiga länkar, inte en avsiktligt handgjord länk. Det är en vänutmaning, inte en tävling med pris.
- **Vägledningen** (pil, julband, kantmarkörer, uppdragsrad) är bara prövad i headless Chromium med mjukvaruritad grafik på tre skärmstorlekar. Hur väl den syns i solljus, på en riktig telefon och för någon som aldrig spelat är inte provat. Julbandet är högst 18 platta bitar (9 i lätt läge) och pilen och raden är vanliga HTML-element, så kostnaden bör vara liten, men det är inte mätt på någon telefon.
- **"Saker som ökar hastigheten":** den enda gåva som direkt ökar farten är RENSLÄDEN (×2 i 7 s). Tempot (för varje rush) och grundspelets turbo påverkar farten i övrigt. Fler fartgåvor kan läggas till i `GIFTS` i `xmas-rush.mjs` (en post per gåva, med vikt och effekt).
- Butiksuppdragens personal är grundspelets figurer (inte tomteklädda).
- Förberedda butiker (Kjell & Company, Åhléns, Duvan, Värmlands Museum, Sandgrund) har data men ingen interiör eller något godkänt innehåll.
- Julmiljön finns främst runt Stora Torget och utmed fasaderna däromkring; övriga delar av staden har snö men inte egna julföremål.
- På skrivbord syns grundspelets båtbusshållplats (en låg platta med skylten BÅTBUSS) i högerkanten av första bilden. Det är grundspelets eget föremål och är inte ändrat.
