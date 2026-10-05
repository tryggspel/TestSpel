# Karlstad City — 2.11.26 · Logotyper och neonskyltar

Butikernas uppgifter fanns men syntes bara som små textkort. Alla 20 verkliga verksamheter har nu egenritade logotyper (`brand-logos.mjs`) på fascian, en stor neonskylt (4,2–7,2 m) ovanför butiken, en hängskylt med logotyp och, för verksamheter utan butiksfasad, en logotypplatta. Rådhuscaféets skylt som göms bakom Rådhusets pelare är framflyttad, och KICKS/Apoteket Örnen ligger fria från Galleria Duvans skylt och pelare. Pressbyrån på Kungsgatan 14 är orörd. Se `art/BUSINESS-SOURCES.md`.

## Föregående version

# Karlstad City — 2.11.25 · Fasadluckor i hela staden

Kameraoberoende mätning av det körande spelet (`tools/facade-audit/audit.mjs`) visade 252 blanka väggar (41 930 m²). Orsak: Visual Twin målar en fasadkant per hus, sidoväggspasset hoppade över väggar som pekar som fronten, allt längre bort än 230 m och Torget-audit-husen, och lägre grannar räknades som brandväggar. Nya pass (`addMissingWalls`, `addAuditSideWalls`, `completeBlankWalls`) målar exakt de väggar som inget annat pass ritat; kvartersfyllnadens fönster ligger i en egen batch. Resultat: 8 blanka väggar och 481 m² kvar, alla under 6 m. Kungsgatan 14, 16 och 18 är orörda och vaktas av test. Detaljer, orsaker och det som kvarstår (handbyggda landmärkeslådor, Mitt i City, södra stadsdelen): `art/FACADE-GAPS.md`.

## Föregående version

# Karlstad City — 2.11.24 · Fasadluckor Kungsgatan och Torget

Genomgång av spelet i riktig Chromium dokumenterade blanka väggar kring Kungsgatan och Stora Torget (`art/FACADE-GAPS.md`, bilder före/efter i `art/facade-gaps/`). Tio byggnader fick nya fönsterväggar via `GAP_FACADES` i `city-architecture.js`: Västra Torggatan 10 och 16, Östra Torggatan 10, 14 och 16, Tingvallagatan 7, Västra Kyrkogatan 1 och 3,5 samt två byggnader utan adress öster om Domkyrkan. Samma fönstergrammatik som sidoväggspasset (karm, glas, mittpost, våningsrytm), brandväggar lämnas släta och väggar som sidoväggspasset redan ritar hoppas över.

Kungsgatan 14 (Pressbyrån), 16 och 18 är låsta: de står inte i listan och `tests/gap-facades.test.mjs` vaktar det. En pixeljämförelse före/efter från gatan visar identisk bild för de tre husen.

Ej åtgärdat (dokumenterat): Mitt i City-väggen vid Västra Torggatan 7 (egen handbyggd arkitektur) och Sightseeing-kioskerna på Torget (rekvisita).

## Föregående version

# Karlstad City — 2.11.22 · Rotorsaksfix: kurerade fasader når alltid skärmen

Fasadändringar syntes inte för att tre spärrar skickade kurerade hus till andra renderare än Kungsgatan-vägen:

1. **Frimurarelogen/Grekiska** (101608925) låg i `SOUTH_IDS` och ritades som en generisk gul låda i `city-south.js`. Alla tidigare Frimurare-fixar, inklusive "root fix"-grenen i `city-architecture.js`, var död kod.
2. **10 foto/Street View-profiler** låg längre bort än 260 m. De ritades som grå PlayCanvas-lådor i `app.js` i stället för med sina profiler.
3. **Gamla serietexturkort** (`comic-city.js`) låg över Torget-audit-fasaderna och z-fightade med dem.

Dessutom var cache-nycklarna blandade (`?v=2.11.21` och `?v=2.11.21&build=…`). Därför laddades `city-architecture.js` och `photo-reference-pass3.mjs` som två separata modulinstanser.

Fix: `curatedRoute()` i `city-architecture.js` är nu enda sanningskällan för vilka hus som går Kungsgatan-vägen, och `city-south.js` hoppar över dem. Torget-audit-hus får inga serietexturkort. Alla moduler använder en enda nyckel, `?v=2.11.22`. Medvetna undantag är Mitt i City-väggarna (VT7, 106078938), Tingvallagymnasiet och Bilan, som har egen handbyggd arkitektur.

Verifiering: routingkontrollen körs som `tests/render-routing.test.mjs` tillsammans med övriga tester (`node --test tests/*.test.mjs`).

2.11.23: canary-läget är borttaget. Ny sidoväggspass (`addSideWallFacades`): Visual Twin- och kurerade hus fick tidigare bara detaljer på gatufronten, så övriga väggar var blanka. Exponerade sidoväggar får nu Kungsgatan-fönster (karm, glas, mittpost, våningsrytm). Kungsgatan-, Torget-audit-husen och Frimurarelogen ändras inte, och väggar mot grannhus (brandväggar) lämnas släta. Kvartersfyllnaden får en enklare variant inom 230 m.

## Föregående version

# Karlstad City — 2.11.9 · Västra Torggatan, östra fasadraden

Detta pass bygger den motsatta sidan av Västra Torggatan med samma referensmetod som 2.11.4–2.11.8. Tre ytterligare OSM-hus får individuella gatufasader: **Home Hotel Plaza, Västra Torggatan 2**, **Västra Torggatan 8** och **Västra Torggatan 10**.

Home Hotel Plaza bygger på hotellets aktuella officiella exteriörbild: ljusbrunt tegel, vit putsdekor, välvda fönster, små järnbalkonger och markerad mittentré. Västra Torggatan 8 får den dokumenterade ljusa klassicistiska fasaden, butiksvåning med markiser och mörk/glaserad påbyggnad överst. Västra Torggatan 10 följer Karlstads lokalhistoriska dokumentation av ett i huvudsak bevarat 1860-talshus med central inkörsport och regelbunden putsfasad.

Google Street View-länkar har genererats från respektive OSM-hus som positionsankare. Den interaktiva Street View-renderingen är fortfarande inte åtkomlig i den här exekveringsmiljön, därför modelleras bara detaljer som också kan verifieras i offentliga exteriörbilder. Inga Google- eller tredjepartsbilder distribueras i spelet.

Alla tre hus reserveras inom den befintliga 95-husbudgeten, använder exakt OSM-polygon för kollision och renderas i den befintliga statiska stadsbatchen.

## Föregående version

# Karlstad City — 2.11.8 · Drottninggatan 24 + Västra Torggatan 3/9

Detta pass fortsätter den handbyggda innerstadslinjen med tre nya adressbundna OSM-fasader. **Drottninggatan 24** får sin karakteristiska rosa/grå stenbeklädnad, höga blå fönsterfält och blå horisontella skärmtak. **Västra Torggatan 9** får en ljus, historiserande fasad med pilastrar, markerade fönsteromfattningar och en tydlig butikssockel i linje med Karlstads kulturmiljöprogram. **Västra Torggatan 3** görs försiktigt som en tegelbaserad fortsättning av det dokumenterade gågatustråket, utan påhittade företagsnamn.

Gågatan kompletteras samtidigt norrut med fler mörka lyktstolpar, bänkar, planteringar och en sammanhängande stenlagd rytm. All ny geometri ligger kvar i den statiska innerstadsbatchen. Västra Torggatan 7 lämnas fortsatt till Mitt i City-entrélogiken i stället för att få en separat fasad som riskerar att blockera eller visuellt konkurrera med galleriaentrén.

## Föregående version

# Karlstad City — 2.11.7 · Street View/referenspass, Drottninggatan + Stadshotellet

Detta pass fortsätter den handbyggda innerstadsmetoden med fokus på igenkänning framför mängd. **Drottninggatan 21** får en egen rödbrun tegelfasad med staplade burspråk, mörkt entréband och stora butiksglas. **Elite Stadshotellet, Kungsgatan 22** får en särskild gul/vit fasad med höga bågfönster, vita pilastrar, gröna markiser, svarta balkongräcken och svart ELITE-entrétak i stället för den generiska hotellfasaden.

Gågatorna får samtidigt ett första möbleringspass med bänkar, mörka lyktstolpar och smala stenlagda zoner vid Drottninggatan 21 och Västra Torggatan 5. Allt läggs i den befintliga statiska stadsbatchen: inga nya kollisionskroppar och inget extra arbete per bildruta.

Google Street View har försökts som primär referensmetod. Den interaktiva Street View-renderingen är inte direkt styrbar i den här exekveringsmiljön, så visuella detaljer i denna release bygger på verifierade offentliga fasadbilder från Lärande/fastighetskällor och Elite Hotels, kompletterat med Google-adress/platsverifiering och OSM. Inga Street View- eller tredjepartsbilder distribueras med spelet.

## Föregående version

# Karlstad City — 2.11.6 · Drottninggatan västerut + Västra Torggatan

Andra innerstadspasset fortsätter den handbyggda referensmetoden från 2.11.4–2.11.5. Fyra ytterligare OSM-hus får egna gatufasader: **Hotel Fratelli, Drottninggatan 17**, **Drottninggatan 20**, **Drottninggatan 26** och **Hotel Savoy, Västra Torggatan 1**.

Fratelli får varm tegelkaraktär, ljusa fönsteromfattningar och randiga markiser. Drottninggatan 20 får 1960-tals tegel över en ljus butiksbas och lång metallkanopy. Drottninggatan 26 tolkas som ett sent 1970-tals kontors-/butikshus med regelbundet fasadgrid och tyngre takfot. Savoy får mörkt hotell-/restaurangband, varm tegelfasad och tydlig entré. Fratelli och Savoy använder nu endast läsbara verksamhetsskyltar ovanpå de handbyggda fasaderna i stället för generiska verksamhetspaneler.

OSM står fortsatt för adress, fotavtryck och höjd. Referensbilder används endast för handbyggd geometri och färg-/rytmtolkning; inga fotografier distribueras med spelet. De nya husen reserveras inom den befintliga detaljbudgeten i stället för att höja antalet hus eller lägga till arbete per bildruta.

## Föregående version

# Karlstad City — 2.11.5 · Innerstadens referensfasader, pass 1

Första fortsättningen på Kungsgatan-metoden från 2.11.4. Fem riktiga OSM-hus får egna handbyggda gatufasader i stället för generisk stadsdekor: **Drottninggatan 19**, **Västra Torggatan 5**, **Västra Torggatan 11**, **Kungsgatan 12** och **Kungsgatan 20**.

Fotavtryck, adress, skala och höjd kommer fortsatt från OSM. Referensbilder styr färg, fönsterrytm, bottenvåning och karaktärsdetaljer. Drottninggatan 19 reserveras inom den befintliga 95-husbudgeten i stället för att höja budgeten. Alla fem fasader ligger i samma statiska stadsbatch som tidigare, och den generiska comic-fasaden stängs av endast på den sida som ersatts.

Detta är början på stråket: Drottninggatan och Västra Torggatan fortsätter hus för hus, därefter fortsätter Kungsgatan utanför 14–18. Den här körmiljön kan inte rendera interaktiv Google Street View direkt, så första batchen bygger på spårbara offentliga fasadbilder och OSM. Exakta Street View-/panoramalänkar kan sedan användas för finjustering utan att ändra datastrukturen eller prestandabudgeten.

## Föregående version

# Karlstad City — 2.11.4 · Kungsgatan vid Stora Torget

Första Street View-baserade fasadpasset för Kungsgatan 14, 16 och 18. Tre individuella färger och fönsterrytmer ersätter de generiska sydfasaderna. Fasadytorna följer OSM-polygonernas sneda gatukant. Kungsgatan 14 får grå paneler, smala fönsterposter och lägre Pressbyrån-skylt; grannhusen får ljus respektive rosatonad puts, med röda detaljer på det ljusa huset.

De två befintliga uteserveringarna får mörka stolpar, uppdelade glastak, låga vindskärmar, bord och stolar. De ligger fortfarande på torgsidan av Kungsgatan och lämnar mittpassagen fri. Geometrin använder de befintliga statiska batcherna; inga nya texturer, ljus eller arbete per bildruta tillkommer.

Referens: användarens Google Street View-panorama vid 59.3810358, 13.5030645, fotograferat juni 2026 och granskat 3 oktober 2026. Egna geometriska tolkningar, inga kopierade panoramabilder. Byggnadshöjder från befintlig OSM-data; fönsterantal, materialfärger och serveringsmått är visuella uppskattningar. Endast denna fasadrad har granskats, inte hela torget.

Validering: samtliga 123 befintliga tester passerade efter fasadändringen. Tre nya geometritester verifierar adressbindning, utåtvända trianglar, avsaknad av överlappande generiska sydfasader och fri mittpassage. Separat mjukvarurendering av de faktiska vertexdata har granskats. Riktig PlayCanvas-rendering och telefonprestanda återstår att verifiera; den lokala speladressen kunde inte öppnas i granskningswebbläsaren.

## Föregående version

# Karlstad City — 2.11.0 (isolerad förbättringsversion)

## 2.11.0 — hela kvarteren, gågator, Västra bron och Ryde

Byggd på 2.10.0. Gåkärnan **1.3.0** är oförändrad till fots. Stadskartan från 2006 har använts som referens för namn och läge (gågator, parker, stadsdelar, byggnader); all geometri kommer från OpenStreetMap-utdraget i `data/`.

### Staden

- **Kompletta kvarter:** 134 fler riktiga byggnader från OSM-utdraget (totalt 229). De 95 detaljerade husen är oförändrade; resten ritas som kvartersfyllnad i samma tecknade stil (väggfärg, mörk taklist, fönsterband per våning, sadeltak på små hus) i ett enda batch (≈16 600 trianglar, 1 draw call). Kollision mot exakt fotavtryck.
- **Tre nya landmärken i Domkyrkans stil:** Residenset (valmat tak, mittrisalit mot öster), Biskopsgården (brutet tak, hörnkedjor) och Wermland Opera (salong, scentorn, pilastrad entré). OSM-fotavtryck; formerna är stiliserade, inte uppmätta.
- **Västra bron** över Klarälvens västra löp. Utan den gick Klarasidan (Teaterparken, Wermland Opera) inte att nå.
- **Söm i älven lagad:** vid z = −320 möttes två vattensystem med en 2 m torr remsa emellan — i 2.9/2.10 kunde man gå rakt över Klarälven där.
- **Kartan:** stadsdelar (Tingvallastaden, Klara, Haga, Viken), parker (Residensparken, Teaterparken, Badhusparken, Frödingsparken, Museiparken, Sandgrundsparken), Klarälven och Västra bron namnges.

### Gågator

- Enligt OSM är **Drottninggatan och Västra Torggatan** gågator i spelets område (samma sträckor som är rosa på stadskartan), plus en gatstensyta längs kajen vid Museigatan.
- Rosa stenläggning med fogar i 3D, blå **GÅGATA**-skyltar där gågatan börjar, rosa på kartan och radarn, och "· GÅGATA" i gatunamnet.
- Termosar på gågatan ger **+10 kaffepoäng** (gågatsfika).

### Ryde

- 15 elsparkcyklar ligger slängda i staden. **KÖR RYDE** med använd-knappen/E; tryck igen för att parkera.
- Dubbel gånghastighet (uppmätt 15,1 m/s mot 7,2 till fots i webbläsaren). **På gågator gångfart**, som en riktig slow zone.
- Batteri 100 s. Parkering i en av fem gröna **Ryde-zoner** ger +40 kaffepoäng och fullt batteri till nästa åkare.
- Om ingen ledig scooter finns inom 120 m läggs en ut 20–40 m bort ("någon har slängt en").
- Zombieträff = vurpa. Inte inomhus, inte på övervåningen, parkeras automatiskt före båt/tåg/buss.
- Ryde nämns i spelets sponsorfriskrivning; ingen logotyp används.

### Kortare promenader, fler skäl att gå vidare

- **Gatufynd:** termosar ungefär var 30:e meter längs alla centrumgator (112 nya). Testat: längs gågatorna är det aldrig mer än 45 m till närmaste.
- **Nästa stämpel:** i Clean Explore pekar kompassen alltid mot närmaste ostämplade plats, med avstånd.
- **Stämpelkartan** har 26 platser: nya är Residenset, Biskopsgården, Wermland Opera, båda gågatorna, Västra bron, Teaterparken och Residensparken.
- Verklig skala behålls; tempot kommer från scootrar, täta fynd och ett alltid synligt nästa mål.

### Rättade fel från 2.10

- Spökrundans HUD och (nu) Ryde-HUD:en låg i en behållare som är dold i lugnt läge — spöket syntes aldrig i HUD:en. Flyttade.
- "FIKAKEDJA!" visades vid varje termos i Clean Explore.

### Prestanda

- Byggnadskollision via rutnätsindex. Navigeringsnätet byggs på ~0,7 s med 229 byggnader, mot ~2,5 s för 2.10:s 95 byggnader med linjär sökning (Node på byggservern; telefon är långsammare).
- `southPassage` letade igenom alla byggnader vid varje kollisionsanrop; nu cachat.

### Validering

- **113 tester** (+9): bro och väg till Klarasidan, ingen torr söm, gågator och bonus, gatufynd, Ryde-logik, startplatser/zoner på gångbar mark, landmärken, kvartersfyllnad, och att varje DOM-id koden använder finns (ett saknat id kraschade starten under arbetet).
- Röktest i Chromium med `?debug`-krokar: plocka upp, köra, gångfart på Drottninggatan, parkera i zon med bonus, nästa-stämpel-kompass, kartan, Halloween, alla spellägen — inga sidfel.
- **Inte verifierat:** riktig 3D-rendering av de nya husen, bron, skyltarna och scootrarna, samt prestanda på telefon. Kör `?perf` på iPhone.
- Utmaningsreglerna höjs till **7**.

## Föregående version

# Karlstad City — 2.10.0 (isolerad förbättringsversion)

## 2.10.0 — iPhone-ljud, stabilare loop, läsbar HUD och tre nya sätt att utforska

Byggd ovanpå City Explore 2.9.0. Rörelsekärnan **1.3.0** är oförändrad (gång 7.2, blick 0.12, radie 0.42, sprintmultiplikator 1.55). Ligger i en egen katalog med egen OSM-data och påverkar inte `playcanvas-karlstad-next`.

### Rättningar

- **Ljud på iPhone.** iOS Safari ignorerar `<audio>.volume`, så i 2.9.0 fungerade varken mute, crossfades eller den tysta bakgrundsmixen på iPhone: huvud- och zombietemat spelades samtidigt på full volym. Ny `audio-engine.mjs` styr all volym via Web Audio `GainNode`. Musik och effektljud delar nu en enda `AudioContext` (förut två), kontexten återupptas efter avbrott (samtal, låsskärm) och **ljud av** sparas mellan sessioner. Plockljudet för termosar spelades tidigare även med ljudet avstängt; det är rättat.
- **Tidssteg.** Spelsimuleringen tar som mest 0,1 s per frame (förut 1 s). Ett hack flyttar inte längre zombier, båt och klocka en hel sekund på en gång.
- **DOM-arbete per frame.** `app.js` skrev statusraden och uppdragsraden varje frame medan `last-round.js` skrev samma element var 80:e ms. Nu skriver bara HUD-loopen, 18 HUD-element skrivs bara om när texten ändras, och elementuppslag cachas.
- **Utvecklarjargong** ("Core Lock 1.3", "Landmark Storefront 1.7", FPS) syns inte längre för spelaren. FPS visas med `?debug`.

### Spelbarhet

- **Mobilsprint.** Dra tummen förbi spakens kant framåt för att springa; spaken lyser gult. Samma multiplikator som Shift på dator (höger Shift fungerar nu också). Eftersom mobilspelare nu kan springa höjs utmaningsreglerna till **6**; länkar från 2.9 får den vanliga "andra regler"-hänvisningen.
- **Läsbarhet.** Ingen synlig text under 11 px. 123 deklarationer höjdes (minsta var 7 px i HUD och uppdragsväljare). Kontrollerat med skärmbilder i 414 × 750 för meny, jakt-HUD, paus, karta och uppdragsväljare.
- **Stämpelkarta.** 18 riktiga platser (Stora Torget, Domkyrkan, Sandgrundsudden, Karlstad C, Löfbergs, Kil, Mariebergsskogen …). Gå dit för en stämpel; de sparas mellan rundor och visas i PAUS. Påverkar inte poäng eller utmaningar.
- **Spökrunda i Termosrundan.** Din bästa runda spelas in lokalt (var 0,2 s, under 20 kB) och springer bredvid dig nästa gång. HUD:en visar om du ligger före eller efter i antal termosar.
- **Halloween — 13 förbannade termosar (roadmap F1).** Aktiv 17 okt–2 nov 2026 (Stockholmstid) eller med `?season=halloween`. Tretton av de vanliga termosarna, utspridda över staden och lika för alla spelare, får en förbannad skepnad. Varje fynd ger en ledtråd till nästa (gata, avstånd, väderstreck), fyller en mätare och startar en kort, rent visuell händelse. Alla 13 låser upp **MIDNATT PÅ TORGET**. Poängen är exakt som för en vanlig termos, så utmaningar och rekord påverkas inte. *Själva bossen/händelsen vid midnatt är inte byggd* — bara upplåsningen.

### Verktyg

- `?perf` mäter 60 s riktiga frametider efter 3 s uppvärmning: snitt-FPS, p50/p95/p99, max, antal frames över 33/50 ms och draw calls, med en knapp som kopierar resultatet. Kör den på en iPhone 11 längs samma rutt varje release.
- `version.json` + `build-info.mjs` är enda källan för versionen. `node tools/set-version.mjs 2.10.1` uppdaterar alla `?v=`-nycklar; utan argument kontrollerar den att inga blandade nycklar finns (jfr cachefelet i 2.7.1). OSM-datan hämtas från spelets egen `data/` med versionsparameter i stället för `force-cache` från en annan katalog.
- Händelserna från spelreglerna hanteras i en tabell (`EVENT_HANDLERS`, 51 typer) i stället för en if-kedja i `update()`.
- `tools/smoke/` kör spelet i riktig Chromium med en PlayCanvas-attrapp: menyer, HUD, ljudgraf och händelser utan 3D.
- CI-förslag i `../ci-forslag/`: tester före deploy, och OSM-uppdateringen öppnar en PR efter testkörning i stället för att pusha till main.

### Validering och gränser

- **104 tester** (89 från 2.9.0, varav ett uppdaterat för regelversion 6, plus 15 nya för ljud, version, mätning, sprint, stämplar, spöke, Halloween och modulsyntax).
- Röktest i Chromium med PlayCanvas-attrapp för Clean Explore, Termosrundan, Zombiejakten (26 s; samma händelser och toasts som 2.9.0), Dagens utmaning, paus och Halloween-läge: inga sidfel. Ljudgrafen bekräftades routad (alla fyra spåren genom `GainNode`, kontext `running`).
- **Inte verifierat här:** riktig 3D-rendering (spöket, de förbannade termosarnas textur), prestanda på telefon och ljud på en fysisk iPhone. Det är vad `?perf` och ett test på enheten är till för.

## Föregående version

# Karlstad City — City Explore 2.9.0

## 2.9.0 — clearer view, a peaceful city and trips by water and rail

Built on the existing PlayCanvas game and movement core.

- **Clean City Explore** is the first start button: no pursuit, damage, panic, blackouts or street/special challenges. Collect thermoses, discover golden caches, choose a real place on the map, visit the mall and chat with friendly zombie staff. **Termosrundan** is a separate three-minute, enemy-free collection run with a local record; ordinary thermoses refill for each new run.
- **Clear mobile view:** one compact status strip, one direction strip and a small map/pause control. Large duplicated mission, panic, scent and control panels are removed from the view. Additional action-mode statistics live in the paused map; clean mode shows collection statistics. The existing one-thumb walking/turning control is retained, with a jump button in clean mode.
- **Sandgrundsudden is reachable:** corrected a discontinuity in the western shoreline at the southern approach. World water, collision and map use the same outline. A thermos trail continues to the tip.
- **Mapped city expansion:** real OSM footprints for Tingvallagymnasiet and its two adjacent school buildings, Löfbergs Kaffeskrapa/office, Karlstad Central, Home Hotel Bilan and Frimurarlogen are reserved within the existing 95-building cap. The schoolyard is open rather than a solid bounding box. New street/rail and shoreline data around Inre hamn appear in both the world and the map. Torget gains Fredsmonumentet at its mapped location, benches and small market stalls.
- **Båtbuss:** board at Inre hamn and arrive at the Mariebergsskogen landing. Clean mode has an 18-second calm crossing and a return boat. Action mode has a 36-second illustrated deck rescue: tap a passenger to throw a lifejacket aboard or a lifebuoy in the water. Rescue up to 12 people, earn a local best and share a replay postcard. Same one-button input; pause and abort are available.
- **Rail and bus trips:** Karlstad Central has a periodic in-game boarding window for a short train trip to Kil, seven platform thermoses and a return train. Clean-mode buses offer calm travel between city stops. Three-dimensional yellow/grey buses use the official Värmlandstrafik logo. These are game trips, not live timetables.
- **Bilan:** a small enterable lobby/cell corridor with bars, a thermos and an always-open return to the street. No trap locks the player in.
- **More expressive zombies:** four cached poses per hostile type with uneven eyes, a loose tooth, arm/leg motion and character accessories. Existing AI and actor pools are reused.
- **Mitt i City stability:** removed the wrapped whole-mesh escalator translation that snapped every cycle; the existing continuous player conveyor remains. Increased the camera near plane from 0.05 to 0.12 to reduce depth fighting. Indoor standing height and continuous ascent were checked in the actual engine.

### Validation and scope

- 89 main rule tests / 97 on the Live City branch. Includes ten minutes of peaceful simulation, same-floor pickup and three-minute completion, shoreline access, deterministic rescue at 30/120 simulation FPS, replay links and all existing mission, bus, daily, mall and clerk rules.
- Actual PlayCanvas 2.22.4 integration checks cover existing missions, input, daily results and sharing. Chromium/SwiftShader checks cover 414 × 750 mobile HUD, real navigation to the peninsula and new destinations, indoor height stability, ascent, calm ferry/bus/train return trips, and a full 12-person rescue. Software rendering is not a physical iPhone performance measurement.
- Movement core **1.3.0** is unchanged: walking 7.2, look sensitivity 0.12, radius 0.42; mobile DPR cap 1.25; 95 buildings; six director zombies; 18 pooled thermos views. The southern extension adds five static geometry batches. Generic facade batches drop from 37 to 33 because additional landmarks replace generic blocks. Zombie textures are baked at startup, not repainted every frame. The 3D world does not render behind the boat/train overlays.
- **The city remains a stylized interpretation.** Mapped footprints, street axes and dock positions are based on OSM; heights, facade detail and interiors are simplified. Mariebergsskogen currently has a small explorable landing garden, and Kil has a station forecourt/platform; neither destination is a complete town/park reconstruction. Bilan's lobby is a playable interpretation.
- Challenge rules advance to **5** because expanded collection and travel change scoring opportunities. Earlier rule links receive the existing clear fallback.
- Sources and logo attribution: [art/GEOGRAPHY-SOURCES.md](art/GEOGRAPHY-SOURCES.md).

## Previous release

# Karlstad City — Graphics & shops 2.8.1

## 2.8.1 — sharper Karlstad, a playable mall and helpful zombie clerks

- 81 ordinary OSM blocks now have full-width, modular comic facades: window frames, cornices, flower boxes, awnings and shop displays. Four cached 1024² textures and 37 spatial mesh batches replace the former 16-house, two-face, 24-metre coverage limit. No textures are repainted while walking. Mall passages are cut out of the artwork.
- Nine reference-based landmark volumes include Rådhuset, Domkyrkan, Sandgrund, Stadsbiblioteket, Duvan, Åhléns, Stadshotellet with its river wing, and Värmlands museum. Their coordinates, the streets, destinations and map share one OSM projection. Generic facades are stylized; this is not a surveyed replica of every window.
- Mitt i City has four street entrances, an atrium/food court, an upper shopping loop and two continuously moving escalators. Walk onto a ramp to ride it; no extra controls. Rails prevent sideways falls and the upper floor has separate pathfinding. The map shows the floor and the route back down.
- Enter **Coop City and Cervera on plan 0**, and **Clas Ohlson on plan 1**. Rooms have shelves, counters and friendly fictional zombie staff. Tenant names/floors and the three original logos are from the current centre directory; room layouts are a playable interpretation, not an exact indoor survey. Eight additional tenant fronts remain visible.
- Four friendly clerks, including a helper outside Pressbyrån, offer small find-and-return encounters. Same interaction button / E: **HJÄLP → LÄMNA**, or **LUGNA** when they become stressed. Each pays 80 XP and 20 solar energy once per run; they never enter the hostile actor or auto-aim pools. No new movement controls or modal dialogue.
- Sandgrundsudden follows the real peninsula, paths and piers with a blocked river/pond, planted valleys, a northern secret and bounded ambushes. Upper-floor treasure requires the correct floor. Cross-floor attacks are rejected.
- Blackouts last at most four seconds and share a 150-second cooldown, including power events. The ordinary first blackout cannot occur before 45 seconds.
- The 2.7.6 clickable map pins are retained alongside centre/peninsula zoom and indoor maps. **GÅ DIREKT IN I MITT I CITY** remains available in exploration, the timed hunt and daily/friend challenges until the escape goal opens. The walking route and named destinations remain available as before. The direct shortcut does not reset score, energy, challenge seed or elapsed time.

### Validation / performance boundaries

- Main: 83 Node tests; Live City branch: 91. Includes actual OSM reachability, all four entrances, both escalators, shop entry/counters, upper-floor collection, friendly rewards/stress, blackout cooldown and existing mission/bus/daily rules.
- Actual PlayCanvas 2.22.4 API integration: movement, four missions, bus balance, daily sharing, guidance and sign UV/backfaces. Browser/WebGL checks used Chromium + SwiftShader: no page errors; map pin → mall direct entry → clerk request → pickup → return produced exactly +80 XP.
- Movement core remains 1.3.0 (walk 7.2, look .12, radius .42), mobile DPR cap 1.25, desktop 1.6, 95 buildings, six director enemies / twelve pooled hostile views. Four fixed friendly views have distance culling and no pathfinding. The mall uses two static batches and two moving-step meshes; park geometry uses three static batches. No real-time shadows or reflections were added.
- Physical iPhone 11 frame rate has not been measured in this environment. Software WebGL verifies rendering, not device performance.
- Source details: [art/GEOGRAPHY-SOURCES.md](art/GEOGRAPHY-SOURCES.md).

## Historical release notes

# Karlstad City — Graphics / Navigation 2.7.6

## 2.7.6 — current Mitt i City shell, recognizable facade and direct map entry

- **Root cause fixed:** the old Mitt i City OSM id no longer exists in the current city snapshot. The game now binds the mall to the current retail building way `234271401`, removes that shell from generic city rendering/collision, and reserves it inside the 95-building budget.
- **Recognizable exterior:** the custom mall uses a light facade, glass shopfront rhythm and green/white **MITT I CITY** entrance branding based on current street references instead of an anonymous brown block.
- **Current interior cues:** lightweight shop signs include Coop City on plan 0 and Clas Ohlson, Cubus and Deichmann on plan 1, matching the current centre directory.
- **Direct map shortcut:** a large **GÅ DIREKT IN I MITT I CITY** button teleports the player to the ground-floor atrium, closes the map and leaves the escalators available immediately. It works during normal exploration and daily/friend challenges until the 800-XP escape objective takes precedence.
- **Walking still works:** the ordinary "Väg till Mitt i City" destination remains available for players who want to walk there.

# Karlstad City — Navigation 2.7.5

## 2.7.5 — Mitt i City entrance shortcut

- **Mitt i City now routes through a door instead of stopping at the facade.** Selecting the mall chooses the nearest of four open entrances by actual walkable route distance.
- Street navigation leads to an outside entrance point, then explicit waypoints continue through the collision gap to a point inside the atrium.
- Once the player crosses the doorway, guidance immediately switches to the atrium and never points back outside.
- Four **INGÅNG** signs make the playable openings visible, and the map shortcut is labelled **Mitt i City · GÅ IN**.
- This is a walking shortcut, not a teleport; the locked movement core and the two-floor interior remain unchanged.

# Karlstad City — UI 2.7.4

## 2.7.4 — map destinations remain selectable in Dagens utmaning

- Fixes the disabled destination buttons shown during daily/friend challenges.
- Challenge mode still locks mission rerolls and manually chosen street events, preserving the shared challenge setup.
- Navigation is no longer treated as a challenge-changing action: Mitt i City, Domkyrkan, Sandgrund, O’Learys and the other quick destinations remain selectable from both the real map pins and the named buttons.
- After 800 XP, quick destinations still lock as intended so the green escape/safe-zone objective takes precedence.

# Karlstad City — UI 2.7.3

## 2.7.3 — real touch buttons on the map

- Replaced the Safari-sensitive canvas pointer hit testing from 2.7.2 with real HTML buttons positioned over every selectable map destination.
- Each pin now has a 48 × 48 CSS-pixel touch target with ordinary button click handling, while the canvas remains purely visual.
- The overlay travels with the responsive square map and works independently of the scrollable map panel.
- Destination selection still updates the same route, compass, radar and cyan ground arrows; the named buttons below the map remain as a second path.

# Karlstad City — Graphics 2.7.2

## 2.7.2 — tappable map destinations on mobile

- Landmark dots on the actual map canvas are now interactive, not just visual. Tap Mitt i City, Sandgrund, Domkyrkan, O’Learys, Stora Torget or another quick destination directly on the map.
- Interactive map pins use an approximately 48 px hit diameter on the 500 px canvas and a larger visible marker, while the named quick-destination buttons remain below the map as a fallback.
- Pointer movement greater than 14 CSS pixels is treated as scrolling rather than a selection, so vertical map-card scrolling does not accidentally choose a destination.
- Choosing a map pin still feeds the same destination into compass, radar and cyan ground arrows.

# Karlstad City — Graphics 2.7.1

## 2.7.1 — playable Mitt i City upper floor + city wayfinding

- **Playable two-level Mitt i City:** both escalators now drive the player's actual floor height. The upper shopping ring holds the player at 5.4 metres, descending the opposite escalator returns smoothly to ground level, and height-aware atrium rails only collide on the upper floor.
- **Map quick destinations:** Stora Torget, Mitt i City, Domkyrkan, Sandgrund, O’Learys, Värmlands museum, Duvan, Åhléns, Stadshotellet and Biblioteket are direct destination buttons. Choosing one feeds the same cached route to the map, compass, radar and cyan ground arrows.
- **Street wayfinding:** three low-cost signposts point toward the main destinations around Torget, Mitt i City and the northern Sandgrund route. They share the existing sign texture atlas and static city batch, so they add no per-frame logic or dynamic lights.
- **Cache correctness:** Journey now imports the current city-rush module under the 2.7.1 cache key, preventing an older 2.6 cached director from leaking into this release.

# Karlstad City — Staden jagar dig (Graphics 2.7)

## Graphics 2.7 — Mitt i City interior and a more recognisable Karlstad

- **Mitt i City is now enterable:** the sealed OSM collision shell is replaced by eight wall segments with four open entrances. A batched interior adds an atrium, upper shopping ring and two escalators without changing the 1.3.0 movement core.
- **More Karlstad landmarks:** Duvan, Åhléns, Elite Stadshotellet and Värmlands Museum receive simplified comic-style landmark masses and shared in-world signs. Sandgrundsudden gets a park, riverside paths, water edges and trees so the route north reads as a real district instead of empty ground.
- **Rare, short darkness:** blackout duration is capped at **4 seconds** and repeated blackouts are separated by at least **150 seconds**. Other Chaos Director events may still occur between them.
- **Performance rule:** the 2.7 expansion is two static draw calls (one vertex-colour city batch + one shared sign atlas). No new dynamic lights, shadows, actor pools or per-frame texture uploads are introduced.
- **Regression coverage:** eight 2.7 tests cover real-place data, Mitt i City entrance/collision behaviour and blackout timing, extending the 2.6 suite from 70 to 78 tests.

The new locations use the same Stora Torget projection as Graphics 2.6. The 2.7 coordinate anchors are based on the real central-Karlstad locations for Mitt i City, Duvan, Åhléns, Stadshotellet, Värmlands Museum and Sandgrundsudden; the meshes remain stylised game interpretations rather than survey-grade replicas.

The active game remains `playcanvas-karlstad-next/`, using PlayCanvas 2.22.4, the existing city data, music and movement speeds.

## Graphics 2.6 — recognisable Karlstad, real streets and shopfronts

- **Four guaranteed landmarks:** Rådhuset faces Stora Torget, Domkyrkan has a cruciform body and a west tower with clocks and a 41 m stylised spire, Stadsbiblioteket anchors Västra Torggatan, and Sandgrund has its white portico, long glazing and orange roof sign. Domkyrkan previously fell outside the distance-ranked building cap; the library was outside the ordinary radius. Both are now explicitly admitted **inside the unchanged 95-building budget**.
- **Real street geometry:** 82 OSM ways replace the invented straight crossroads and the promenade through the library. World paving, the map and radar share the same data. Building boxes now use the midpoint of their actual bounds, correcting the old vertex-average offset. The existing 3 m navigation grid extends to the cathedral and Drottninggatan without changing its alignment or movement physics.
- **Actual shop signs:** original O’Learys, Espresso House and Pressbyrån logos at five verified addresses. Signs attach to the corresponding OSM building and street-facing facade. O’Learys moves from the freestanding slab to Tingvallagatan 9; its existing outdoor game remains. The two Espresso House and two Pressbyrån locations are listed in [the sources and asset notes](art/GEOGRAPHY-SOURCES.md).
- **Visual orientation:** enamel street signs at major intersections, a small current-street label in the existing objective panel, named landmarks on the map, and selectable walking directions to Domkyrkan and the library. Optional chaos does not replace the chosen landmark. Earning the timed escape still takes precedence.
- **Comic continuity:** baked architectural drawings, arched windows, ink outlines, rooflines and coloured shop canopies use the existing palette. Shared texture assets stay small: the three original brand files total about 42 kB. Actual signs load once from the game's own host; text fallback remains if a logo cannot load.

The architectural mesh pass uses **six static draw calls** (streets, rooflines/shop frames and four landmarks), plus static facade/sign cards. The real-engine integration has **644 entities versus 752 in 2.5**. These are structural budgets, not physical-phone FPS measurements. No new shadow maps, dynamic lights, actor pools or per-frame texture uploads were added. Core 1.3.0 movement, camera input, one-thumb controls, speed and DPR limits are preserved.

**Validation:** 70 Node tests pass, including real OSM navigation to all four landmarks and five shop approaches, facade binding, correct street projection and destination persistence. The real PlayCanvas 2.22.4 integration passes full mission victories, bus/pause/crash, mobile movement, daily replay, map selection and HUD guidance against the corrected geometry. Architectural textures and the original logo files were separately rendered and visually inspected. The engine check uses NullGraphicsDevice; actual WebGL rendering and sustained iPhone 11 frame pacing remain unverified in this environment.

The changed map affects route distances and collectible paths. Daily/friend links and records therefore use **rules 3** so scores from the previous map are not silently mixed. Existing normal progression is retained.

## Gameplay 2.5 — one clear destination, inside bus 666, and interactive streets

- **One destination:** BYT MÅL opens the map with the active event, bus, sunlight and four mission destinations. Compass, ground arrows, map route and HUD use the same cached walkable path, including directions to turn or turn around. Manual mission choices survive optional events. The suggested escape and bus stop stay pinned; every marked safe zone still accepts a successful escape. Old competing yellow trails and the permanent mall objective column are removed, and distant signs are culled.
- **Inside bus 666:** a cached comic cabin frames the existing moving 3D city, with seats, windows, grab handles, wipers and local humour. One finger drags a visible steering wheel; A/D or arrow keys also work. Three passengers slide, tumble and recover; coffee flies and a pothole causes a collective fall. Steering corrects lateral drift, preserving the established route, 30-second trip and 200–350 XP reward. The camera tilts down only during transit so the road is visible through the windscreen. Walking/camera controls are unchanged.
- **Tänd Karlstad / Karlstads Energi:** reach and activate three separate power boxes in 55 seconds, while the city is dark. Restoring power awards 260 XP, reduces panic and briefly stops active zombies. Each box restores 12 solar energy; the final reward also receives the normal street completion bonus.
- **NWT: Extra! Extra!:** collect newspapers and complete two nearby deliveries in 45 seconds. Absurd news headlines accompany the stages. Completion awards 220 XP.
- **Zombiebowling:** move behind a shopping cart, aim and use the existing context button to kick it. The rolling cart uses the same navigation/collision and damage systems. Stop its marked zombies in 40 seconds for 220 XP; cart eliminations pay another 30 XP each. One-hand auto fire waits while within interaction range of the cart.
- **Comic city:** four shared original facade textures add bold cornices, window reflections, planters, striped awnings, illustrated shop displays and local jokes. Up to two accessible street faces on sixteen nearby buildings use these textures and distance culling. No new building colliders or large image downloads.

New stories join the automatic event rotation and can be selected in BYT MÅL during ordinary play. Daily/friend challenges keep deterministic event selection and disable manual rerolls. Challenge links and daily records use **rules 2**, so scores from the earlier rules are not silently mixed.

The bus paints its static cabin only on start/resize. Three passenger sprites update at most 30 times per second, only during transit, with a maximum 1000-pixel canvas dimension. Floor arrows reuse one mesh and a fixed 18-entity pool; gameplay retains the six-active-city-zombie cap. The real-city headless integration contains 752 entities versus 729 in 2.4; this is an entity count, not a device FPS measurement.

## Gameplay 2.4 — coffee risk, moving sunlight, daily challenges and result postcards

This release continues the existing game and ships four connected roadmap steps. The PlayCanvas movement core (1.3.0), camera controls, speed, city mesh budget and Safari zoom fixes are retained.

- **Kaffedoft:** each thermos adds 20 scent (more in the espresso daily). At 40%, zombies detect from 38 metres instead of 22; at 60%, new director enemies are runners; at 80%, side-street ambushes detect farther and trigger more frequently. At 100%, a 12-second coffee horde begins, then scent drops to at most 55. Scent fades after five seconds without coffee and much faster in sunlight. All sources share the six-active-city-zombie limit and the existing pool.
- **Sola över Karlstad:** a moving yellow field appears near the player after about 24 seconds, then recurs with a breather. Its path follows connected city navigation. Inside: +9 solar energy and +2 health per second, rapid scent removal and double zombie XP. Zombies in the field move at half speed. Follow it for six accumulated seconds for a one-time 100 XP bonus. The ordinary field lasts 18 seconds; the sun daily lasts 24. One flat translucent primitive and one cached sign represent the field. No dynamic light or shadow maps.
- **Dagens Karlstad:** one date-based seed and modifier set for everyone. The day switches at midnight in Europe/Stockholm. Four variants rotate: no SUPER, stronger coffee scent, panic/early blackout, and a 2:30 sunlight hunt. Every attempt starts at Torget with 100 health, 60 energy and 75 coffee points, all run discoveries reset. Existing save data is archived and protected even during autosaves or reload; finishing or leaving restores it. Special missions are unavailable during a shared city challenge, so a paused timer cannot be used to farm their rewards. Records and attempt counts are local to this browser, keyed by date and rule version. There is no global leaderboard or server score validation.
- **Challenge postcards:** an original 720×900 comic card is prepared on the result/pause screen with result, score, health, time and seed. City results and special missions generate cards automatically; bus arrival/crash remembers a card under PAUS → MITT SENASTE CHALLENGE-VYKORT. Native sharing attaches PNG + link when supported, otherwise shares/copies the link or exposes a selectable field. SPARA VYKORT exports PNG. No screenshot, remote image, canvas export or large image allocation runs in the walking loop. User cancellation does not force a fallback.

Daily links preserve their date when opened on another day. Normal city hunt links include bounded starting resources/discovery masks and the seed, replayed in an isolated challenge. Bus links open a dedicated 30-second replay from the original stop with retry, result card and friend target. Existing special-mission seed links still work. Links are tagged with rule version 1; unsupported versions show a clear fallback rather than pretending to replay the same rules.

Gameplay 2.3 fixes included: after 100% panic, the city gets a 12-second break from new chaos and actual sunlight; blackout uses paused gameplay time instead of wall-clock timers; the gold thermos now has a visible world marker; free exploration continues generating chaos after the fourth event.

## Controls

- Left stick / WASD moves and strafes. Right-side swipes / mouse turn freely through 360°. Camera steering toward targets has been removed.
- Mobile touch sensitivity is independent of the desktop mouse. PAUS offers sensitivity and a choice of relative swipes or a continuous right stick. The 180° button turns on the spot. Desktop left/right arrows also rotate without moving.
- SOLSTÖT fires immediately; holding repeats ordinary shots. Left and right fire buttons allow different thumb layouts. SUPER / Q / right click fires a stronger shot costing 40 energy. Holding never selects super.
- SIKTHJÄLP adjusts the hit margin only. It cannot rotate the camera.
- M / KARTA pauses and opens the map. Blur, visibility loss and menus clear movement, look and firing state.

## Stadsjakten: the new city loop

The opening brief gives one goal: **earn 800 XP, then reach any green safe zone before the three-minute clock or health runs out**. A successful escape adds a remaining-time score bonus, a personal best and a friend-challenge link. Optional free exploration has no timer. Failed hunts can be retried; coffee points, secrets and postcard discoveries remain saved. Starting a new hunt respawns ordinary thermoses.

The city now has **48 spaced-out thermoses**, down from 135, and six rotating short events (the three new stories above plus):

- Pick up a coffee bag and carry it to a second nearby marker within 32 seconds: 180 XP.
- Reach a temporary solar glint within 16 seconds: 100 XP.
- Stop up to three coffee thieves within 24 seconds: 180 XP.

Completed street events add 25 solar energy and eight seconds. A new opportunity follows after a short break. The first event begins after two seconds; pursuit begins after six seconds. Enemies approach from the rear/side using the existing navigation grid. Pressure increases gradually, with at most six director-controlled enemies and the existing 12-actor render pool. Old hideout ambushes and five secrets remain.

City basic shots cost 3 energy; SUPER costs 40. At zero energy a weak emergency shot remains available. The recharge button / C converts 25 coffee points into 40 energy. Coffee points are a persistent spendable balance; hunt XP is the score earned this run and is not reduced by spending. Special missions pause the city hunt and award 150 XP, or 250 for Sandgrund. Practice cannot change banked resources.

## One-hand mobile controls

New mobile sessions default to **one thumb**: the main stick's vertical axis walks forward/backward and its horizontal axis turns continuously in place. Walking speed, collision radius, gravity and the existing movement curve remain unchanged. The sensitivity setting also affects thumb turning. Releasing/cancelling the pointer stops the input.

Auto fire triggers only when an enemy is in the reticle and visible. It never rotates the camera. At O’Learys it also waits for a good push angle. If energy is exhausted, auto fire can buy a refill for 25 coffee points; this is explained in the controls. SUPER remains optional. The crowded manual buttons are hidden in this mode, leaving the stick, SUPER and the contextual mission/bus button. The radar still opens the map.

PAUS switches between one-hand and the existing two-hand controls. Desktop WASD/mouse/manual fire remain available. Choices are saved on the browser.

## Zombie-bussen / Linje 666

Board at Torget, Domkyrkan or Sandgrund. The contextual button changes to **KLIV PÅ BUSSEN** within reach. The trip lasts 30 seconds and follows a collision-checked route through the existing 3D city. Drag the steering wheel with one finger, or use A/D / arrow keys, to counter lateral drift and keep the course marker green. Zombies tumble around the illustrated cabin and recover between turns.

A successful trip awards 200–350 XP and moves the player to the destination. A crash returns to the departure stop with 20 health lost, preserving at least 25 health; the hunt continues. The hunt clock advances during transit. Bus pause, backgrounding and focus loss freeze both clocks. City combat, route markers, collectibles and their view updates are suspended during the ride. There is no second engine or extra 3D city.

## Postcards and performance

The three user-provided comic photographs are collectibles near Domkyrkan, the north promenade and the western street route. A first discovery awards 100 XP and eight seconds. PAUS → MINA VYKORT displays unlocked originals. JPEG requests start only when the paused album is opened, with native lazy loading and asynchronous decoding. They are not WebGL textures, preload requests, or part of the walking frame loop. Original images and their visible watermarks are preserved.

The bright palette, original comic facades, Löfbergs thermoses and concept kiosks for Löfbergs, Karlstads Energi and NWT remain. These are proposed sponsor placements; there are no claimed commercial agreements. The creative roadmap in `/GAMEPLAY_ROADMAP.md` is retained.

## Missions

All four missions can be selected immediately; a successful result also offers the next mission.

1. **Sista rundan — O’Learys:** existing 90-second knockback challenge, three fans and Captain Overtime. Green direction arrow and stand marker help with flanking.
2. **Fikapanik — Stora Torget:** 6 + 8 + 10 zombies in three waves, 150 seconds. Walkers, runners and tanks pursue the player. Solar shots damage and knock them back; chained hits and fast consecutive eliminations score bonuses. Between waves: three-second break, health and energy.
3. **Rädda fikat — Torget to Mitt i City:** collect three thermoses and deliver outside the existing mall within 180 seconds. Twelve zombies guard the pickups and route. Gold ground markers and the radar show a walkable route.
4. **Vernissage från graven — Sandgrund:** a fictional cartoon Zombie-Lerin pursues three visitors outside the existing museum. Approach visitors to recruit them, escort them to the green safe area and defeat the 12-HP artist. Three additional zombies interfere; the timer is 180 seconds. The museum is now guaranteed within the existing 95-building budget.

Action missions have 100 health, damage cooldowns and loss/retry. Practice removes the clock and cannot set records or create score challenges. Each mission has its own local record and completion badge. Sharing preserves the mission, seed and target score; there is no online leaderboard.

## Performance and verification

City action reuses a 12-zombie render pool, 18 nearby thermos sprites, cached illustrated textures, six pooled hit labels and a fixed grid derived from the existing collision boxes. Inactive actors do not render. The route and HUD update at a reduced rate. Navigation distinguishes grid node IDs from mission object IDs, including moving visitors and the artist.

`node --test playcanvas-karlstad-next/tests/*.test.mjs` runs 70 tests covering rotation, pointer ownership, pause/cancel, navigation, wave victory, pursuit/damage, delivery, clocks, original knockback rules, collection/persistence, point spending, ambushes, recovery, Sandgrund victory escorting around obstacles, timed hunt completion/capture, event expiry and rewards, postcard persistence, one-thumb intent, bus success/crash and 30/120 FPS consistency. Read-only diagnostics: `window.KarlstadRound.snapshot()` and `window.KarlstadCoreLock`.

The real PlayCanvas 2.22.4 engine was also exercised headlessly with the city's actual building data: all four selectors, complete Fikapanik waves, delivery, a complete Sandgrund boss/escort victory, city pickups, resource carryover, saved progress, return location and isolated practice. The integration run also completes the new street delivery, an actual bus route to Sandgrund with pointer steering, bus pause/resume/crash, one-thumb turning/walking/cancellation, auto fire without camera rotation, an 800-XP escape and the lazy-loaded postcard album. The Sandgrund walking route spans 166 grid nodes. The 2.4 integration also plays a daily attempt through a real moving-sun route, follows the field for its bonus, completes escape, shares a PNG/dated-link payload and retries with restored resources. Archived daily links and standalone bus links are exercised through boot, pause, victory/crash, sharing and retry. These API tests use NullGraphicsDevice and mock DOM/share APIs, not a GPU or the physical iOS share sheet. The exported card drawing is separately rendered and visually inspected using a local canvas implementation. The 2.5 integration also verifies goal selection, wall-aware guidance, all three power switches and restored light, newspaper pickup/two deliveries, cart interaction/physical motion, and disabled daily rerolls through the actual UI handlers. The cabin, passengers and new facade drawings were rendered and visually inspected with a local canvas implementation.

Control reference: [Activision’s official COD Mobile control guide](https://blog.activision.com/call-of-duty/2019-10/Getting-a-Grip-on-the-Call-of-Duty-Mobile-Controls): left movement stick, right-side relative look, separate weapon buttons and sensitivity settings.

Deployment uses the existing GitHub Pages workflow. Physical iPhone and GPU rendering checks remain necessary; Node engine tests do not replace those checks.


## Gameplay 2.3 — Chaos Director + Karlstad Panik

The city layer now follows the creative roadmap instead of adding more collectibles. A lightweight Chaos Director can interrupt travel roughly every 20–45 seconds with small reusable events while preserving the existing movement/FPS core and actor pool.

Current chaos set:
- **Domkyrkan ringer:** bells pull extra zombies into the active route.
- **Blackout:** a short visual blackout plus extra pressure, implemented as a lightweight screen treatment rather than new heavy assets.
- **Guldtermos:** a short optional detour worth 160 XP, solar energy and extra hunt time.

The new **KARLSTAD PANIK 0–100%** meter rises from time, thermos pickups, shooting and completed events. Thresholds at 25/50/75% warn the player and increase city pressure. At 100%, **KARLSTAD HAR FALLIT** starts a short survival spike with repeated horde pressure. Surviving the spike partially resets panic instead of ending the run.

The director stays inside the existing six-active-enemy budget, reuses the navigation/actor pool, and does not alter the locked walking speed, collision radius, camera feel or render DPR policy.
