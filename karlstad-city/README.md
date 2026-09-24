# Karlstad City Quest — pilot

Öppna `index.html` från en lokal HTTP-server eller på GitHub Pages. Direktlänk när den ligger på `main`: `https://tryggspel.github.io/TestSpel/karlstad-city/`.

## Vad som går att spela

Fem uppdrag i en kedja: Stadsbibliotekets tillfälliga lokaler i Arkaden, Sandgrund Lars Lerin med ett kort förstapersonsminispel, Värmlands Museum, en **simulerad** bussresa och naturum Värmland i Mariebergsskogen. Välj svar, samla poäng och spela från valfri plats. ”Jag är på plats” kan ge bonus med frivillig GPS-kontroll inom cirka 130 meter. Inga platshistorikdata sparas av spelet; framsteg sparas lokalt i webbläsaren. Kartleverantören får dock sedvanliga nätverksanrop när kartan används.

Musik och korta ljudeffekter kan slås på med ♪. De startar först efter en användarinteraktion. I Solsprint byter du spår med A/D, vänster/höger piltangenter eller skärmknapparna.

## Karta

För att piloten ska kunna spelas utan API-konto används Leaflet och OpenStreetMap i standardläget. Det finns en Google Maps JavaScript API-adapter i `game.js`: ange en webbläsarbegränsad API-nyckel i `config.js` och aktivera Maps JavaScript API och fakturering för att testa Google-kartan. Begränsa nyckeln till webbplatsens domän, välj API-begränsning och kostnadskontroll. Kolla även Google Maps Platform-villkoren för Sverige innan kommersiell drift.

Den publika OSM-tile-servern är avsedd för en liten pilot. Använd en tile-leverantör med avtal eller egen kartserver vid kommersiell trafik. Visa alltid kartans attribution. Om kartbiblioteket inte laddar finns en enkel, spelbar reservvy.

## Innehåll och integrationer

- Bibliotekets adress: [Karlstads kommun](https://karlstad.se/nyheter/uppleva-och-gora/uppleva-och-gora/2026-09-02-stadsbiblioteket-och-kontaktcenter-har-oppnat-i-sina-tillfalliga-lokaler).
- Museets plats: [Värmlands Museum](https://varmlandsmuseum.se/besok-oss/hitta-hit/).
- Evenemang: en datumbegränsad gästutställning på [Sandgrund Lars Lerin](https://sandgrund.org/sandgrund/) visas under sin angivna period 30 maj–8 november 2026. Spelet länkar också till [Visit Karlstad](https://visitkarlstad.se/visit-karlstad/evenemang) och [kommunens kulturkalender](https://karlstad.se/uppleva-och-gora/kultur/kultur-i-karlstad---kalender).
- Bussmomentet använder ännu inga avgångsdata. [Värmlandstrafik](https://www.varmlandstrafik.se/) öppnas för riktiga resor. En fortsatt integration kan bygga på Trafiklabs GTFS Regional-feed för Värmlandstrafik, men kräver API-nyckel och test av faktiska resor/hållplatser.

Rutten och kartmarkörerna är ett spelupplägg, inte navigeringsanvisningar. Resan i spelet verifierar varken biljett eller faktisk ombordstigning. Projektet är inte ett officiellt samarbete med kommunen eller Värmlandstrafik.
