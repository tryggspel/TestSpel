# Karlstad · Efter regnet — City Quest 3D

Spelbar webbpresentation: https://tryggspel.github.io/TestSpel/karlstad-city/

Tidigare kartpilot: https://tryggspel.github.io/TestSpel/karlstad-city/map.html

## Version 3

Babylon.js 7.54.3 driver en sammanhängande, konstnärligt byggd 3D-värld. Ett 23 sekunder långt kameraintro övergår till fri rörelse i första person. Miljön har procedurbyggda fasader, skyltfönster, älv, bro, park, människor, fåglar, skuggor, PBR-material, animerat vatten, atmosfärisk himmel, blomning och färgtoning. Musik, stadsambience, fotsteg och scannerljud skapas med Web Audio efter användarinteraktion.

Fem uppdrag: hitta bibliotekets tillfälliga lokaler; samla tre ljusfragment vid Sandgrund; lösa museets ledtråd; göra en filmisk, simulerad bussresa; hitta naturum Värmland. Uppdrag och poäng sparas lokalt i webbläsaren. Den nya 3D-versionen samlar inte in GPS-data.

### Kontroller

- Dator: WASD/pilar, dra med musen eller klicka för muslås, Shift för sprint, E för scanner, mellanslag för hopp, M för karta, Escape för paus.
- Telefon: vänster styrspak för rörelse, dra över spelbilden för att se dig omkring, ⇧ för sprint, ⌖ för scanner.
- Följ spåret: guidat gångläge längs en väg genom miljön. Manuell rörelse avbryter guidningen.
- Pausmenyn: Mobil, Balanserad eller Filmisk grafik; aktuella stadstips; spela om introt; nollställ framsteg.
- Reducerad rörelse i operativsystemet hoppar över introt.

## Verklighet och spelvärld

Arkitektur, avstånd, gator och bussväg i 3D är komprimerade konstnärliga tolkningar. De är inte fotogrammetri, exakta byggnadsmodeller eller navigeringsanvisningar. Inga Call of Duty-tillgångar används. Modeller, texturer och ljud skapas av projektets egen kod. Google Fonts levererar Manrope och Barlow Condensed; Babylon.js och Leaflet hämtas från CDN. Reflektionsmiljön kommer från Babylon.js offentliga tillgångar.

Den separata kartan visar de verkliga platsernas koordinater med OpenStreetMap. En Google Maps JavaScript API-nyckel kan anges i `config.js`; då använder kartpanelen Google Maps. API, fakturering, domänbegränsning och kostnadskontroll behöver konfigureras av kontoägaren. 3D-världen är fortfarande den egna spelmiljön; Google Maps 3D Tiles ingår inte.

Den publika OSM-servern passar en liten pilot. Kommersiell trafik behöver en lämplig kartleverantör och avtal. Kartans attribution visas.

## Verifierade innehållskällor

- Bibliotekets tillfälliga adress: https://karlstad.se/nyheter/uppleva-och-gora/uppleva-och-gora/2026-09-02-stadsbiblioteket-och-kontaktcenter-har-oppnat-i-sina-tillfalliga-lokaler
- Sandgrund och datumbegränsat utställningstips: https://sandgrund.org/sandgrund/
- Värmlands Museum: https://varmlandsmuseum.se/besok-oss/hitta-hit/
- naturum Värmland: https://karlstad.se/mariebergsskogen/upptack-mariebergsskogen/naturum-varmland
- Riktiga resor: https://www.varmlandstrafik.se/
- Aktuella evenemang: https://visitkarlstad.se/visit-karlstad/evenemang

Kontrollerade 24 september 2026. Utställningen med Sven X:et Erixson visas i spelet endast 30 maj–8 november 2026, utifrån enhetens datum. Öppettider, entré och förändringar kontrolleras hos arrangören.

Bussresan saknar tidtabell, biljettkontroll och verifierad ombordstigning. Inga sponsoravtal, kommunala godkännanden eller verkliga rabatter är kopplade till piloten. Det här är en grafisk och funktionell prototyp för att visa konceptet.

## Filer och drift

`index.html`, `cinematic.css`, `world.js`, `cinematic.js`, `audio.js` och `map-leaflet.css` är den nya 3D-klienten. `map.html`, `game.js` och `style.css` är kartpiloten. Ingen byggprocess krävs; kör med valfri HTTP-server eller GitHub Pages. WebGL krävs för 3D, och ett tydligt felmeddelande länkar till kartversionen om motorn inte kan starta.

Grafik är adaptiv men fysisk iPhone-testning behöver göras före extern användartest eller sponsorpresentation. Nästa produktionssteg är konstnärsproducerade modeller av verkliga platser, professionellt ljud, validerade färdvägar, innehållsverktyg och enhetsprovning.
