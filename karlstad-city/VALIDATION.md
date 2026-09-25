# Karlstad City Quest — provkörning 25 september 2026

## Miljö och avgränsning

Publicerad GitHub Pages-version, Chrome i fjärrwebbläsare. Webbläsaren saknade WebGL och körde därför Babylon NullEngine med Canvas-kompatibilitetsrenderaren. Kontrollerna nedan verifierar spelmekanik och denna renderingsväg. PBR, GPU-skuggor, vatten-shader, bloom, normal maps och verklig telefonprestanda är inte visuellt eller prestandamässigt verifierade här.

Mobilernas layout kontrollerades via `device-check.html`: 390 × 844 och 844 × 390 CSS-pixlar. Detta är responsiva vyer, inte emulering av Safari eller fysisk iPhone 11.

## Genomspelning via gränssnittet

| Steg | Observerat resultat |
| --- | --- |
| Kameraintro | Animerad stadsöverblick, titel och övergång till första person. Hoppa över-knappen fungerar. |
| Biblioteket | Guidning till signalen. Fel svar ger återkoppling. Rätt adress ger 150 XP. |
| Sandgrund | Alla tre fragment scannade i följd. Uppdraget ger 200 XP; totalt 350 XP. |
| Museet | Rätt ledtråd ger 150 XP; totalt 500 XP. Scanningsknappen fungerar i stående mobilvy. |
| Bussresan | Kamera och buss rör sig över bron. Ankomst till Mariebergsskogen ger 150 XP; totalt 650 XP. |
| Naturum | Sista frågan går att lösa efter guidning. 200 XP; totalt 850 XP och 5/5 uppdrag. |
| Kartpanel | Kartbilder, källangivelse och fem verkliga uppdragsplatser tillgängliga. Kartvyn anpassas till samtliga platser. |
| Slutvy | Solsigill, 850 XP, stadstips och fortsatt utforskning tillgängliga. |
| Sparning | Ny sidladdning återställde uppdrag 3 med 350 XP respektive uppdrag 4 med 500 XP. |
| Ljudval | Efter avstängning behöll en ny scanningsinteraktion status LJUD AV. Ljudets kvalitet är inte bedömd genom lyssning. |
| Mobil stående | Synlig styrspak, sprint, scanner, uppdragsruta och karta. Ingen horisontell dokumentöverströmning vid 390 px. |
| Mobil liggande | Uppdragsdialoger och busssekvens provspelade vid 844 × 390. Slutjusteringar flyttar interaktionsknappen ovanför uppdragsrutan och visar touchkontroller även i liten landskapsvy. |

Inga fel från spelets JavaScript rapporterades i den granskade konsolloggen under genomspelningen. Webbläsartilläggets egna fel har inte räknats som appfel.

## Kontroller i kod

- JavaScript-syntax och `git diff --check` utan anmärkning.
- Överlappande trianglar testade i kompatibilitetsrenderaren: närmaste ytan behålls oavsett ritordning.
- Takens ytnormaler kontrollerade för kvadratiska och rektangulära hus.
- Museets nya gångväg till bussen samplad mot fordonets kollisionsyta; vägen passerar bredvid den parkerade bussen.

## Kvar före kommersiell lansering

Fysisk iPhone 11/Safari och Android-provning, bildfrekvens och värme vid längre spelpass, full WebGL-grafik, tillgänglighet med hjälpmedel, nätverksavbrott och återhämtning efter förlorad grafikkontext. Google Maps kräver eget konfigurerat konto och API-nyckel; den vägen har inte testats med en nyckel här. Geometri och bussfärd är konstnärliga tolkningar. Aktuella evenemang är kurerade uppgifter och länkar, inte ett automatiskt flöde. Sponsoravtal, verkliga erbjudanden och tidtabells-/biljettintegration ingår inte.

Piloten demonstrerar en fungerande spelmotor, stadsuppdrag och filmiskt berättande. Den motsvarar ännu inte fotorealistisk AAA-grafik.
