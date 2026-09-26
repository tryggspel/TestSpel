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

## Karlstad art / Soljakten update — 25 September 2026

Actual automated checks (Babylon.js 7.54.3 NullEngine, original scene geometry):

- All five mission target coordinates and all 19 navigation edges are free of building/vehicle collisions.
- All 14 action targets are reachable coordinates. Standing is blocked by duck gates; crouching clears them. Walking is blocked by jump barriers; sufficient jump height clears them.
- Sequential pickups reach 14/14 and a winning result; timer expiry reaches the losing result. Score accumulates; character meshes carry their original vertex colours; geometry contains no nonfinite coordinates.
- Joystick deadzone, outer-ring sprint, primary pointer ownership, release by an unrelated finger, immediate primary release, crouch toggle and pause reset pass.
- Scene is approximately 473k triangles including background, foliage and characters. This is a geometry count, not a measured mobile frame rate. Static geometry is merged by material; character parts are merged by animated body segment.

Browser checks on the deployed version:

- Intro, new third-person explorer, museum arch/star, Sandgrund facade, town hall and original NPCs render in the software compatibility renderer.
- Library quest: guidance reaches within 5 m, the dialogue opens, correct address awards 150 XP. Switching to Soljakten and back retains 150 XP.
- Soljakten starts at 120 seconds, keyboard movement collects the first sun. Pausing leaves the timer at 98 across subsequent observations; returning to the city restores city progress.
- SMHI card shows a fetched temperature, wind, cloud fraction and timestamp. SCB card shows 99,007 residents, municipality, 2025 and “Hämtat från SCB:s API”.
- 390 × 844 mobile fixture: action controls are visible. Joystick dragging collects a sun and returns movement state to REDO after release. Duck toggle changes to DUCKAR. Joystick + duck passes the gate, reaching 2/14, combo ×2 and 275 points. Jump button clears the duck toggle.
- Changes after these observations: clearer historical nameplates, larger top controls, a wider portrait camera and narrower landscape mission panel keep the character visible. Script parsing and diff whitespace checks pass.

Coverage limits: the cloud browser uses the compatibility renderer, so GPU shadows, normal maps, bloom, real multitouch feel and sustained iPhone 11 frame rate have not been verified on a physical device. No claim of Fortnite/AAA graphical or performance parity is made. The complete original five-mission playthrough is recorded in the earlier section; this update rechecks the library flow plus all route geometry rather than claiming another full manual playthrough.

Post-deploy check of version 13: the served script URLs were confirmed as `?v=13`. At 844 × 390, Soljakten starts and the narrowed mission card leaves the explorer's complete silhouette visible between the controls. Top controls, joystick, sprint, duck and jump buttons fit inside the viewport.
Portrait 390 × 844 was also visually checked after the camera change. The final action card moves another 30 pixels down, using the space above the controls so the player's shoes remain visible. Larger top buttons fit in the portrait header.
