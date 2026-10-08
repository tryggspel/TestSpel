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
| Grundspelets produktionsadress | https://karlstad-city-visual-twin.vercel.app/ |
| Återställningspunkt (gren) | `backup/jul-2026-baseline-2.21.1-fadc36a` = `fadc36ad65078401e1a751c9236c1577d1bc5de8` |
| Git-tagg | `jul-2026-baseline-2.21.1` finns lokalt men **kunde inte pushas**: fjärren svarar HTTP 403 på alla tagg-pushar från den miljö som byggde julversionen. Skapa den själv: `git tag -a jul-2026-baseline-2.21.1 fadc36a && git push origin jul-2026-baseline-2.21.1` (eller GitHub → Releases → Draft a new release på den commiten). |

GitHub Pages-arbetsflödet `Deploy Karlstad City Mobile` publicerar bara `main`; det berörs inte av julgrenarna.

## 2. Grenar och versioner

| Gren | Syfte | Vercel |
|---|---|---|
| `main` | Grundspelet (2.21.x). Får bara julknappen och navigeringen som behövs. **Ingen julkod slås ihop hit.** | `karlstad-city-visual-twin`, produktion |
| `release/jul-2026` | Julversionen. Det som ligger här är det som publiceras som julspelet. | Julprojektet, produktionsgren |
| `claude/stoic-tesla-59znyc` | Utvecklingsgren för julversionen. Flyttas fram till `release/jul-2026` när den är verifierad. | Förhandsvisningar |
| `feature/julknapp-grundspelet` | Grundspelets julknapp (2.21.2), byggd från `main`. Förberedd men avstängd. Se avsnitt 9. | Förhandsvisning av grundspelet |
| `backup/jul-2026-baseline-2.21.1-fadc36a` | Återställningspunkt = grundspelet före allt jularbete. | – |

Julversionens ändringar slås **inte** ihop med `main`. Förbättringar i grundspelet förs över till julgrenen med granskade Git-ändringar
(`git switch release/jul-2026 && git merge main`, lös konflikter i de få filer som julgrenen rör (avsnitt 5), kör testerna).

Versionsbeteckning: `X.Y.Z-xmas.N`, där `X.Y.Z` är basversionen på `main` och `N` räknar julbyggen (**`2.21.1-xmas.1`**). Det synliga namnet är
**Julklappsjakten – 2.21-XMS**. `node tools/set-version.mjs 2.21.1-xmas.2` sätter en enda cache-nyckel i alla moduler, HTML och CSS
(testet `version.test.mjs` och CI kräver att den är densamma överallt). Samma beteckning visas i startvyn (längst ned), i `window.KarlstadRound.version`,
i `?debug` och i `/api/build-info`.

## 3. Sammanhängande bygge (inga blandade filer)

- Inga imports till andra spelversioner, ingen kod hämtas från grundspelets adress, **ingen service worker** (testas i `tests/xmas-build.test.mjs`).
- Alla moduler, HTML och CSS bär samma `?v=`-nyckel, så en ny version kan aldrig blanda gamla och nya filer i webbläsarens cache.
- Julmusiken syntetiseras i spelet: inga ljudfiler laddas ner (grundspelets mp3 hämtas först om jukeboxen används).
- Spelmotorn (PlayCanvas 2.22.4) hämtas från jsDelivr med fast version, som i grundspelet.
- Startvyn visar `Julklappsjakten – 2.21-XMS · bygge 2.21.1-xmas.1 · <miljö> <gren> <commit> · bas 2.21.1 (fadc36a)`. `/api/build-info` (Vercel-funktion)
  ger deployens commit, gren och miljö; lokalt visas "lokalt bygge".

## 4. Vercel-projektet för julversionen

Projektet kunde **inte skapas av Claude**: Vercel-anslutningen i byggmiljön hade ingen behörighet på teamets scope (HTTP 403 vid `create_project`, `list_deployments`,
loggar och domäner). Skapa det så här (några minuter):

1. Vercel → *Add New… → Project* → importera `tryggspel/TestSpel` i teamet `kmauritz-7561`.
2. Projektnamn `karlstad-julklappsjakten` (adressen blir https://karlstad-julklappsjakten.vercel.app/ om namnet är ledigt).
3. *Root Directory*: `playcanvas-karlstad-2.11`. *Framework Preset*: Other. Inget build-kommando, ingen output-katalog.
4. *Settings → Git → Production Branch*: `release/jul-2026`. (Förhandsvisningar för övriga grenar får gärna vara på: de är till för test.)
5. *Settings → Deployment Protection → Vercel Authentication*: välj samma alternativ som i grundspelets projekt (öppna det projektets inställning och jämför). Målet är att produktionsadressen är öppen för spelare medan förhandsvisningarna kräver inloggning. Kontrollera efteråt genom att öppna produktionsadressen i ett privat fönster utan att vara inloggad på Vercel.
6. *Settings → Environment Variables → Automatically expose System Environment Variables*: på (standard), så att `/api/build-info` kan visa commit-ID.
7. Kontrollera att `https://<adressen>/api/build-info` visar `"branch":"release/jul-2026"` och rätt commit, och att startvyn visar samma version och commit.
8. Valfritt, men rekommenderat: hindra att projekten bygger varandras grenar (båda projekten är kopplade till samma repository, så annars får
   grundspelets projekt förhandsvisningar av julgrenarna och tvärtom). *Settings → Git → Ignored Build Step* (kommandot avslutas med 0 = hoppa över bygget, 1 = bygg):
   - Julprojektet: `case "$VERCEL_GIT_COMMIT_REF" in release/jul-2026|claude/*) exit 1;; *) exit 0;; esac`
   - Grundspelets projekt (`karlstad-city-visual-twin`): `case "$VERCEL_GIT_COMMIT_REF" in release/jul-2026|claude/*|backup/*) exit 0;; *) exit 1;; esac`

### Kontroll före varje publicering (team, projekt, gren, commit)

1. Rätt team (`kmauritz-7561`) och rätt projekt (`karlstad-julklappsjakten`, **inte** `karlstad-city-visual-twin`).
2. Rätt gren: produktion bygger bara `release/jul-2026`; förhandsvisningar kommer från övriga grenar.
3. Rätt commit: `git log -1 release/jul-2026` ska stämma med `/api/build-info` och med raden längst ned i startvyn.
4. Förhandsvisningen först: öppna den, kör introduktionen, kontrollera att knappen Tillbaka leder till grundspelets adress, och publicera därefter genom att flytta fram `release/jul-2026`.
5. Grundspelets projekt och adress ska vara oförändrade (öppna https://karlstad-city-visual-twin.vercel.app/ och kontrollera att versionen är den väntade).

## 5. Vad som ändrats i grundspelets filer (för framtida sammanslagningar från `main`)

All julkod ligger under `xmas/` (22 filer) och i `tests/xmas-*.test.mjs` (6 filer). Grundspelets egna filer är rörda så här (utöver cache-nyckeln `?v=` som byts överallt):

| Fil | Ändring |
|---|---|
| `app.js` | Snöfilter (`ComicMesh.snow`), vinterfärger för mark, vägar och himmel, inga XP-kulor på torget, julens kollisionsrutor, ingen snö inomhus, julmusiken (grundspelets mp3 hämtas lazy) |
| `last-round.js` | Importerar och startar `installXmas`, tömmer termosar, hindrar Halloween-jakt, panellistan, HUD-hook, radar-hook, tomtezombie-bilder, butiksuppdrag med julens platser |
| `journey-rules.mjs` | `objective()`-hook, `stepExplore()` och zombie-`step()` anropar paketjakten, `finish()` ger Tomtezombies eget slut |
| `index.html` | Titel, tre julpaneler, länk till `xmas/xmas.css`, pausmenyns rubrik, ingen preload av mp3 |
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

Startvyn: **JULKLAPPSJAKTEN 🎁** (mysigt, inga zombier), **TOMTEZOMBIES** (eget läge med zombier och kuslig musik), **← Tillbaka till Karlstad-spelet**.
Egen sparning: `karlstad-xmas:save:1` (julstämplar, rekord, summor, vädervalet) och grundspelets spelstatus under prefixet `xmas:` (`xmas:karlstad:*`).
Grundspelets sparfiler på den egna adressen rörs aldrig (andra adress = annan webbläsarlagring, och prefixet gör det dubbelt säkert).

| Läge | Vad |
|---|---|
| Introduktionen | Start söder om granen, vänd mot den med den första paketgruppen rakt framför (granen och paketen syns på samma bild, även på en stående telefon som bara ser ca 38° i sidled). Sedan 30 paket + 3 bonuspaket längs en spiral runt granen på Stora Torget (252 m), mål 20, tomte vid slutet. Inget tidskrav. Grupperna ligger 15–20 m isär. Gångtid (beräknad av väglängd och gångfart, inte mätt med en människa): 20 paket och leverans 23–39 s, hela slingan med alla 30 paket 34–58 s; med tid att läsa målet och titta sig omkring blir det 60–90 s. |
| Julrundor (2–3 min) | Torgets paketregn, Kungsgatans julrunda, Drottninggatans julrunda: rutten byggs ur stadens egen gångbara karta, 75 vanliga paket + 3 bonus, mål drygt hälften, mjuk tid som bara ger tidsbonus. |
| Butiksuppdrag | Cervera: Tomtarnas fikabord (kopp, kanna, fat). Pressbyrån: Tomtarnas fikaorder (kaffe, lussebulle, pepparkaka …) och leverans till tomten utanför. Förberett (osynligt): Kjell & Company, Åhléns, Duvan, Värmlands Museum, Sandgrund. Inga erbjudanden eller samarbeten påstås. |
| Fri julvandring | Tomtarna tappar ett nytt paketregn med jämna mellanrum (egna paket-ID, tydlig varning, försvinner efter 4 minuter). |
| Tomtezombies | Grundspelets zombieregler (AI, rörelse, pooler, högst sex aktiva, patruller, ambushar, Guld-Nisse) med julens bilder. Paket är mål och ammunition. Eget slutkort. |

Kombo, poäng och belöningar: 10 poäng per paket, ×2/×3/×4 vid 4/8/12 i rad (engångsbonus 20/40/60), bonuspaket 50, leverans 100 + tidsbonus upp till 100.
Fångstfältet är detsamma som för termosar i 2.20.0 (växer med farten, ingen insamling genom väggar). Gångfarten är 7,2 m/s (grundspelet).

## 7. Prestanda och mätningar

**Mätt här (headless Chromium med SwiftShader, 414×896, programvaruritning): relativa jämförelser, inte mobilprestanda.**

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
- **Så mäter du på en riktig enhet**: öppna spelet med `?perf` (både grundspelet och julversionen), gå samma runda (introduktionen är samma ruta som Clean City Explore från Torget), vänta tills mätningen är klar och tryck KOPIERA RESULTAT. Prioritera iPhone 11/Safari och MacBook Air 2018.

## 8. Vad som är verifierat, och vad som inte är det

**Utrustning som faktiskt använts:** en Linux-container med headless Chromium 141 och mjukvaruritning (SwiftShader), utan GPU. Skärmstorlekar som provats:
mobilformat 414×896 med emulerad tryckskärm, liggande telefon 896×414 och skrivbord 1000×640. **Ingen riktig telefon eller Mac, ingen Safari/WebKit.**

**Automatiskt:** `node --test tests/*.mjs` (404 tester, alla gröna) och CI-jobbet `Karlstad 2.11 tests` på `claude/stoic-tesla-59znyc` och `release/jul-2026`.

**Webbläsarflöden (riktigt spel, riktig tryckning på knapparna, flyttning av spelaren; inga mocker):**

| Verktyg | Vad | Resultat |
|---|---|---|
| `tools/xmas-flow/flow.mjs` (mobil 414×896) | startvy och version → introduktionen (mål 20, 30 + 3 paket, paketen syns, målet visas, leverans, resultatkort, stämpel) → sparning i egna nycklar och efter omladdning → tre rundor (Kungsgatan spelad hela vägen) → miljön (8 stånd, granar, ljusslingor, snö utomhus men inte inomhus, ~6 tomtar nära) → Pressbyrån (beställning och leverans) och Cervera → Tomtezombies (4 typer, högst sex aktiva, tagen, försök igen) → inga zombier i Julklappsjakten → väder av/på, mute → tillbaka-knapparna → inga konsolfel | körs om efter varje ändring; senaste resultat redovisas i slutrapporten |
| `tools/xmas-flow/flow.mjs` (skrivbord 1000×640) | samma | körs om efter varje ändring; senaste resultat redovisas i slutrapporten |
| `tools/xmas-flow/switch.mjs` | grundspelet (med julknappen) → julversionen → tillbaka, i samma flik, grundspelets sparade framsteg kvar | körs om efter varje ändring; senaste resultat redovisas i slutrapporten |
| engångsskript (ej incheckade) | fritt paketregn (6 paket på 43–47 m håll, alla nåbara, inga dubbla poäng, försvinner efter sin tid), liggande telefon, A/B-prestanda, musik renderad och analyserad | körda, se avsnitt 7 |

Verktygen körs mot en lokal server (se rubriken i varje fil). Ett fel som först syntes (Cervera efter Pressbyrån) berodde på att grundspelets resultatkort ligger kvar i 14 s och tar det första knapptrycket vid nästa plats: grundspelets eget beteende, inte ett fel i julkoden.
Testet trycker nu FORTSÄTT som en spelare gör, och julversionen stänger kortet själv när ett nytt läge startar.

**Inte verifierat (finns inte i den här miljön):**
- iPhone 11/Safari och MacBook Air 2018: bildfrekvens, känsla, värme, minne, WebKit-specifikt beteende (tyst läge, låsskärm/bakgrund, `100dvh`, pekkänsla).
- Riktig GPU-prestanda. De mätningar som finns är jämförelser mellan grundspelet och julversionen i samma mjukvaruritade miljö.
- Hur musiken *låter*. Den är provrenderad och analyserad (ingen klippning, rimlig frekvensbild) men ingen människa har lyssnat.
- Vercel: projektet, förhandsvisningen, produktionsadressen, `/api/build-info` med riktig commit, Git-taggen och att knappen leder till den riktiga adressen.

### Kontrollista för riktig enhet (iPhone 11/Safari, MacBook Air 2018)

1. Öppna förhandsvisningen. Raden längst ned i startvyn ska visa rätt version och commit (jämför med `git log -1 release/jul-2026`).
2. Spela introduktionen (en till två minuter). Jämn bildfrekvens? Snöfallet, texten i HUD:en, styrspaken och HOPPA/TURBO med tummarna, paketen och granen i första bilden.
3. Ljud: musiken ska starta efter första trycket, mute ska tysta den, den ska tystna när sidan läggs i bakgrunden eller skärmen låses och komma tillbaka. Prova även med iPhonens tysta läge på (iOS tystar Web Audio med ringreglaget).
4. `?perf` på båda byggena (grundspelet och julversionen): gå samma rutt, tryck KOPIERA RESULTAT och jämför bildrutetid (p95), ritanrop och minne.
5. Byt grundspel → julversion → grundspel med knapparna: det ska ske i samma flik och grundspelets framsteg ska finnas kvar.
6. Spela en hel Tomtezombies-omgång och en butiksuppdrag (Pressbyrån).
7. Vrid telefonen (liggande) och öppna pausmenyn; prova VÄDEREFFEKTER: LÄTT/AV.

## 9. Julknappen i grundspelet

Grenen `feature/julknapp-grundspelet` (från `main`, version 2.21.2) lägger en knapp **JULKLAPPSJAKTEN 🎁** direkt under TempoRush i startmenyn. Den öppnar julversionen i samma flik (ingen iframe).
Knappen är **förberedd men avstängd** (`enabled:false` i `julknapp.mjs`) och syns inte för spelare. Koppla in den först när julprojektets produktionsadress är verifierad: sätt `url` och `enabled:true`, kör testerna, förhandsvisa, slå ihop med `main`.
Stäng av den igen genom att sätta `enabled:false`. Se `JULKNAPPEN.md` på den grenen. Julversionens knapp **← Tillbaka till Karlstad-spelet** leder till `BASE_GAME_URL` i `xmas/xmas-config.mjs` (grundspelets adress, i samma flik).

## 10. Kända begränsningar och nästa steg

- Vercel-projekt, Git-tagg och produktionsadress återstår att skapa (avsnitt 1 och 4). Julknappen kopplas in efter det.
- Ingen test på riktig mobil. Kör `?perf` på iPhone 11 och MacBook Air 2018 och jämför med grundspelet innan publicering.
- Tomtezombies är grundspelets zombieläge med paketmål; vidare balansering (antal zombier, tempo) bör ske efter spelartester.
- Butiksuppdragens personal är grundspelets figurer (inte tomteklädda).
- Förberedda butiker (Kjell & Company, Åhléns, Duvan, Värmlands Museum, Sandgrund) har data men ingen interiör eller något godkänt innehåll.
- Julmiljön finns främst runt Stora Torget och utmed fasaderna däromkring; övriga delar av staden har snö men inte egna julföremål.
