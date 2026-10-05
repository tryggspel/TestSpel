# Fasadluckor — Kungsgatan och Torget (hittade i 2.11.23, åtgärdade i 2.11.24)

Genomgång av spelet i riktig Chromium (PlayCanvas 2.22.4, WebGL via SwiftShader). Kameran teleporterades längs Kungsgatan (x −190…230, z −31, blick N och S), runt Stora Torget (6 stopp × 8 riktningar) och framför varje icke-kurerad byggnad i området (4 sidor, ~14 m ut). Koordinater är spelets lokala meter (x öst, z syd; origo = `CITY_ORIGIN`).

**Låst och orört:** Kungsgatan 14 (104778937, Pressbyrån), Kungsgatan 16 (106078910) och Kungsgatan 18 (104529126). Inga av fixarna nedan rör dem.

## Verifierat OK (inget att göra)

Rådhuset, Stadshotellet (Kungsgatan 22 + älvfasaden), Kungsgatan 12 och 20, Västra Torggatan 9, 11 och 12, Östra Torggatan 9, 12, 13 och 15 (fronterna), Kungsgatan 8, Tingvallagatan 9, 11 och 13 (O'Learys-raden), Frimurarelogen, Domkyrkan, Östra Kyrkogatan 4 och 6.

## Luckor

| # | Prio | Byggnad (OSM) | Läge x, z | Vägg | Problem | Åtgärd | Status |
|---|------|---------------|-----------|------|---------|--------|--------|
| 1 | Hög | Västra Torggatan 16 (103695873) | −45, −94 | väst | Helt blank vit vägg, 18×46 m, 13 m hög | fönstergrammatik på hela väggen | Klar |
| 2 | Hög | Östra Torggatan 14 (101170472) | 103, −74 | väst | Helt blank vit vägg, 24×46 m | fönstergrammatik på hela väggen | Klar |
| 3 | Hög | Tingvallagatan 7 (101935913) | 108, 68 | nord | Blank beige gavel mot Torget/Östra Torggatan | fönstergrammatik | Klar |
| 4 | Hög | Östra Torggatan 10 (110997315) | 93, 95 | väst | Blank beige gavel (bakom den syns en lika blank persikofärgad vägg) | fönstergrammatik | Klar |
| 5 | Hög | okänd adress (113214347), Kungsgatan öst | 265, −47 | syd + väst | Hel byggnad (37×41 m) utan ett enda fönster, bara vit låda | fönster + sockel | Klar (övre våningar; bottenvåningen enkel på avstånd) |
| 6 | Medel | Västra Kyrkogatan 1 (101453952) | 133, −91 | alla | Torn/låda utan fönster | fönster | Klar |
| 7 | Medel | Västra Kyrkogatan 3,5 (101935869) | 132, −111 | alla | Bara horisontella gråa band, inga fönsteröppningar, ingen sockel | fönster + sockel | Klar |
| 8 | Medel | Östra Torggatan 16 (102580709) | 104, −119 | väst | Bara horisontella band, ingen fönsterrytm | fönster + sockel | Klar |
| 9 | Låg | okänd (101453951) | 235, −111 | alla | Liten blank vit torn-låda | fönster | Delvis (väggen är kortare än 6 m) |
| 10 | Låg | Västra Torggatan 10 (104529128) | −45, 119 | väst | Blank gavel mot Västra Torggatan (handbyggd innerstadsprofil) | fönstergrammatik på gaveln | Klar |
| 11 | Låg | Västra Torggatan 7 / Mitt i City (107041955) | −86, 118 | ost | Stor slät persikofärgad vägg bredvid entrén. Egen handbyggd arkitektur, ändras inte i detta pass | dokumenterad, behandlas separat | Ej åtgärdat |
| 12 | Låg | Sightseeing-kioskerna på Torget | −45…45, ±12 | alla | Enfärgade gula lådor utan detalj | rekvisita, ej fasad — lämnas | Ej åtgärdat |

Bilder: `art/facade-gaps/before/` och `art/facade-gaps/after/` (samma kameraposition).

Kontroll att Kungsgatan 14–18 är oförändrade: skärmdumpar från x = −40, −10, 20 och 50 på Kungsgatan före/efter ger identisk bild för husen (enda skillnaden är en gående figur och Östra Torggatan 14 längre bort, som fått fönster).

## Metod för att återskapa

1. `npm i playcanvas@2.22.4` och servera katalogen på `localhost:8902`.
2. Playwright med `--use-angle=swiftshader`; routa `cdn.jsdelivr.net/npm/playcanvas…` till den lokala filen.
3. Klicka `#cityClean`, kalla en teleportfunktion (utan ändring av spelkoden; skriptet lägger in den i `app.js` i farten) och ta skärmdump per position och riktning.
