# Operation Gryning · webbpilot 17

Den fortsatta huvudversionen är Babylon.js i webbläsaren, med en installerbar webbapp. Unity-projektet finns kvar som ett separat framtidsspår.

## Spelbart i denna version

- Tre solfyrar, 135 sekunder till gryning och evakuering vid museet.
- Samma stadsbor förvandlas till zombier. Förstärkningar innehåller snabba löpare och större väktare som tål tre kroppsträffar.
- Solprojektor, precisionsträffar, kombopoäng, tillfällig neutralisering, solnova och upphämtning av sköld/energi.
- Gångbar konsthall vid Sandgrund. Solfyren aktiverar skyddet; en begränsad reserv återställer skölden. Spelaren kan lämna igen genom entrén.
- Resultatbetyg, träffsäkerhet, sparad XP, nivåer och tre färgutföranden för solprojektorn. All progression är lokal och kosmetisk, utan köp.
- Förfinad mobilspak med mindre dödzon, snabbare start/stopp och hysteres för automatisk sprint. Siktskänsligheten sparas.
- Nya fasad-, tegel-, granit- och plåtmaterial; skala i världsmeter, härledda normaler, utställningsdetaljer och varmare interiörljus. Högsta inställningen renderar upp till två gånger CSS-upplösningen. Automatisk nedväxling prioriterar rörelse vid låg bildfrekvens.
- Manifest, hemskärmsikoner och versionsbundet offlinepaket. Internet krävs första gången. Kartor, SMHI/SCB-data och den externa miljöreflexionskartan ingår inte i offlinepaketet; grundspelet har reservmaterial och fungerar utan dessa. Offlineprestanda och iOS-installation behöver verifieras på fysisk telefon.

## Vad modellerna föreställer

Stadens positioner och proportioner är komprimerade för spelet. Sandgrunds exteriör har arkitektoniska igenkänningsdrag, men interiören är en **fiktiv spelplan**, inte en offentlig ritning eller uppmätt modell. Tavlorna är egna generativa älvstudier, inte Lars Lerins konst. Materialens normaler är visuella approximationer, inte uppmätta PBR-skanningar. Inga sponsoravtal eller varumärkesgodkännanden är införda.

## Verifiering

Från repots rot, med Babylon.js 7.54.3 och `@napi-rs/canvas` tillgängliga:

```sh
node karlstad-city/tests/engine-check.cjs
node karlstad-city/tests/controls-check.cjs
node karlstad-city/tests/zombie-check.cjs
node karlstad-city/tests/progression-check.cjs
node karlstad-city/tests/web-bundle-check.cjs
```

`BABYLON_PATH` kan ange en lokal kopia av samma Babylon-version. Tester med NullEngine verifierar logik, geometri och kollisioner. De mäter inte GPU-prestanda eller känslan på en fysisk pekskärm.

Nästa kvalitetsgrind är en riktig iPhone 11: bildfrekvens, värme, sikte under samtidig rörelse och eld, avbrott, hemskärmsstart och offlineomstart. Webbversionen är fortfarande en prototyp. Fotogrammetri/uppmätta Karlstadmodeller, mer avancerad animation, nätverksteam och serverlagrad progression återstår.

## Publiceringskontroll 2026-09-27

Webbpaketet är publicerat genom GitHub Pages. I den tillgängliga Chrome-testmiljön startar zombierundan, en solstråle träffar och förbrukar 8 energi, paus/återuppta fungerar, låsta kosmetiska utseenden visas korrekt och webbappen bekräftar att offlinepaketet sparats. Faktisk frånkopplad omstart är ännu inte provad. Uppdragskedjan, vinst/förlust, skyddet, interiörens kollisioner och XP-persistens passerar de automatiska kontrollerna.

Testwebbläsaren saknar WebGL och använder därför kompatibilitetsrenderaren. Inga mätningar från den miljön ska tolkas som GPU- eller telefonprestanda. Ett korrigerande webbpaket **18** märker förenklad grafik i gränssnittet och inaktiverar grafikval som kräver acceleration. Det förändrar inte rundans regler eller sparformat.

`tests/responsive.html` öppnar exakt samma spel i porträtt-, landskaps- eller desktopstorlek för manuell layoutkontroll.
