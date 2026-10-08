# Partnerplatser i Karlstad City (2.21)

Det här är grunden för betalda lokala samarbeten: en verksamhet får en egen, rolig plats i spelet, spelaren gör ett frivilligt uppdrag,
får en belöning och en stämpel i **Karlstadpasset**, och kan (om verksamheten godkänt det) se ett erbjudande eller en länk.

**Status i 2.21:** två fungerande demonstrationer (Cervera och Pressbyrån). Ingen verksamhet har bekräftat något samarbete,
inget erbjudande finns och inga rabatter är påhittade. Platserna är märkta DEMO i spelet.

## Så provar du

Starta **CLEAN CITY EXPLORE** (inte Temporush, Termosrundan, zombielägena eller en delad utmaning; där är uppdragen avstängda).

| Plats | Hitta dit | Uppdrag |
|---|---|---|
| **Cervera · Duka för fikastunden** | Mitt i City, plan 0, butiken söder om atriet. En orange UPPDRAG-skylt syns över dörren. Karta (M) → stjärnmärket CERVERA, eller Karlstadpasset → VISA VÄGEN (eller GÅ DIT för att hoppa direkt). | Prata med Rut (knappen **HJÄLP RUT**). Hitta koppen (östra hyllan vid dörren), kannan (cafébordet i atriet) och fatet (västra hyllan längst in). Kompassen och pilarna visar vägen. Lämna på disken (**LÄMNA PÅ DISKEN**). |
| **Pressbyrån · Fika på minuten** | Kungsgatan 14. Ny serviceyta (blå disk med randig markis) på trottoaren framför entrén. | Stå vid disken (knappen **TA EMOT ORDER**). Tryck rätt saker i rätt ordning på 40 s (knapparna eller tangent 1–6). Fel sak kostar 4 s. Tiden slut: **IGEN →** eller **LÄMNA**. |

Karlstadpasset öppnas i pausmenyn (Ⅱ) och från resultatkortet. Lokal mätning visas där om du öppnar spelet med `?partner` (eller `?debug`).
Öppna spelet direkt på `…/playcanvas-karlstad-2.11/?partner`: startsidan (`/`) skickar vidare till spelet och tappar `?partner`.

## Demo på tre minuter (kundmöte)

1. Öppna spelet och välj **CLEAN CITY EXPLORE**.
2. Tryck Ⅱ → **Karlstadpasset** → **GÅ DIT** vid Cervera. Passet visar 0 av 2.
3. Tryck **HJÄLP RUT**. Hitta koppen, kannan och fatet (rutan nere visar vad som är kvar, pilarna och kompassen visar vägen) och tryck **LÄMNA PÅ DISKEN**. Resultatkortet visar poäng, stämpel och platsen där verksamhetens egna, godkända erbjudande skulle visas.
4. Tryck Ⅱ → **GÅ DIT** vid Pressbyrån → **TA EMOT ORDER**. Tryck rätt saker i rätt ordning (1–6 eller knapparna). Låt klockan gå ut en gång för att visa **IGEN**.
5. Visa Karlstadpasset igen: 2 av 2 och märket *Fullt pass* i Fikaalbumet. Öppna spelet med `?partner` för att visa den lokala mätningen (digitala besök, start, klara, avbrutna).
6. Säg tydligt att det är demonstrationer: inget samarbete är bekräftat och mätningen gäller bara den här enheten.

## Vad en verksamhet får (för kundmöten)

- En **egen plats i spelet** med personal, ett uppdrag som passar verksamheten och en skylt som syns på håll (och som stjärna på kartan).
- Ett **digitalt platsbesök** varje gång en spelare går in i butiken eller fram till serviceytan, samt **startade, avslutade och avbrutna uppdrag**.
- En **stämpel i Karlstadpasset** som får spelaren att komma tillbaka och samla fler platser.
- Utrymme för ett **eget, godkänt erbjudande eller en länk** efter avslutat uppdrag. Det visas först när verksamheten godkänt texten och länken (se nedan). Tills dess visas en tydligt märkt exempelplats.

## Vad som är färdigt och vad som inte är det

- Färdigt: modell, två uppdragstyper, två demonstrationer, Karlstadpass med sparande, händelsegränssnitt (lokalt), tester och webbläsarflöde.
- **Aggregerad statistik över alla spelare finns inte.** Händelserna sparas bara på den egna enheten (`karlstad:partner-events:1`). För riktig rapportering krävs en mottagare (en server), en integritetstext och ett beslut om vad som får mätas. `beaconSink()` i `partner-events.mjs` är en färdig men avstängd mottagare.
- Inga personuppgifter och ingen position samlas in. En händelse innehåller typ, plats-id, dag och ett fåtal tillåtna fält.
- Inte verifierat på fysisk telefon (iPhone 11). Webbläsarkontrollerna kör mjukvarurenderad grafik och säger inget om bildfrekvens eller känsla.

## Modellen (`places.mjs`)

En plats är ett objekt i `PLACES`:

| Fält | Betydelse |
|---|---|
| `id`, `name`, `venue`, `kind` | Identitet och visningsnamn. |
| `status` | `active` (bekräftat samarbete), `demo` (fungerande demo, märks DEMO) eller `future` (planerad, syns aldrig). |
| `partner` | `{confirmed:false, note}`. En demo får inte påstå `confirmed:true` (testas). |
| `where`, `entrance`, `talk`, `staff`, `kiosk` | Position, våning, entré, samtalspunkt, personal och eventuell fristående serviceyta. Antingen ett butiksrum i Mitt i City (`where.roomId`) eller en butiksfasad (`where.storefront` + `along`/`out` i meter). |
| `visit` | Vad som räknas som ett digitalt besök: `room` eller `radius`. |
| `activity` | Uppdraget: `type` (`fetch` eller `order`), texter och innehåll (`items`/`deliver` eller `menu`/`orders`/`seconds`/`penalty`). `ordered:true` på `fetch` ger en ledtrådskedja (museum/konst). |
| `reward` | `points`, `repeatPoints`, `repeatCooldown`, fart- och felfribonus (order) och `stamp:{id,label}`. |
| `offer` | `{approved,title,text,url,label,approval:{by,at}}`. Visas bara om `approved:true`, `url` börjar med `https://` och `approval` anger vem och när verksamheten godkände. |

`validatePlace` kontrollerar allt ovan (kör i testerna). Uppdragsmotorn `PlaceQuests` (`place-quests.mjs`) är en enda tillståndsmaskin för alla platser.

### Regler som motorn garanterar

- Uppdrag startas bara av en frivillig knapptryckning vid personalen.
- En belöning betalas högst en gång per genomfört uppdrag; upprepade knapptryck ger inget. En stämpel kräver ett genomfört uppdrag och ges bara första gången.
- Upprepade uppdrag ger en liten belöning (`repeatPoints`) högst en gång per `repeatCooldown` sekunder; permanenta stämplar och rundans kaffepoäng hålls isär.
- Tiden räknas bara medan spelet går (paus fryser allt). Läget byts, Temporush startar eller spelaren går för långt bort → uppdraget avbryts snällt.

## Lägga till nästa betalande partner

Exempel: **Kjell & Company** (teknikpussel = uppdragstypen `order`).

1. **Underlag från verksamheten:** namn, personalrollens namn, 3–6 föremål eller saker som passar, en kort replik per steg, vilken belöning/vilket erbjudande de vill ge, och **skriftligt godkännande** av texter och länk.
2. **Datapost i `PLACES`:** ändra posten från `status:'future'` till `demo` (eller `active` när avtal finns), fyll i `where`, `entrance`, `talk`, `staff`, `activity`, `reward`, `offer`. Kopiera Cervera (hämta) eller Pressbyrån (order) och byt innehåll.
3. **Geometri:** en butik med fasad (`where.storefront` finns i `STOREFRONTS`) får serviceyta och samtalspunkt med `along`/`out`, utan kod. En butik inne i Mitt i City behöver ett rum i `MALL_ROOMS` (idag Coop, Cervera, Clas Ohlson; Kjell & Company har bara en fasad och behöver ett rum eller en serviceyta). Egna föremål behöver en position som går att nå (kontrolleras i testet).
4. **Personal:** återanvänd en befintlig figur med `staff.clerk` eller utelämna `clerk`, så ritas en generisk personal på `staff.x/z`.
5. **Godkänt erbjudande:** sätt `offer.approved:true`, `url` (https), `title`, `text`, `label` och `approval:{by, at}`. Annars visas bara exempelplatsen.
6. **Kör `node --test tests/*.mjs`** (datamodellen valideras) och **`node tools/places-flow/flow.mjs`** (spelar igenom i webbläsare). Lägg till platsen i flödet om den ska ingå.
7. **Version och publicering:** `node tools/set-version.mjs X.Y.Z`, commit, förhandsgranska, publicera enligt vanligt flöde.

Nya uppdragstyper (till exempel gemensam jakt genom flera butiker, `hunt`) kräver ny kod i `place-quests.mjs` och i `places-ui.js`. Typen finns förberedd men är inte implementerad.

## Verifiering

- `node --test tests/*.mjs`: modell, motor, belöningar, sparande, mätning, personal i Explore och att andra lägen lämnas ifred.
- `node tools/places-flow/flow.mjs`: spelar igenom båda uppdragen i riktig Chromium, inklusive paus, avbrott, misslyckande, omladdning och övriga lägen.
- `node tools/explore-spots/check.mjs`: kontrollerar att inga termosar hamnat i den nya serviceytan.
