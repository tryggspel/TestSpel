# Från native-prototyp till kommersiellt spel

## Motorn och plattformen

Valet är Unity 6.3 LTS med Universal Render Pipeline för installerat iOS/Android-spel. Bedömningen gäller detta mobilprojekt; det finns ingen allmänt bästa spelmotor för alla mål. Projektet är versionslåst till 6000.3.25f1. URP 17.3 ingår i Unitys grafiska kärnpaket för denna editor, medan Input System, Netcode och Transport hämtas via pakethanteraren.

Officiellt underlag:
- https://unity.com/releases/unity-6
- https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@17.3/api/UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset.html
- https://docs.unity.com/en-us/engine/6000.0/manual/render-pipelines/universal-render-pipeline/requirements
- https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/advanced-topics/message-system/rpc.html
- https://github.com/Unity-Technologies/U6-First-Person-Multiplayer — officiell referens för fortsatt FPS/samspel; dess projekt har inte kopierats eller anslutits här.

Den befintliga webbpiloten och detta native-projekt har separata motorer och separata tillstånd. Befintlig webb-XP överförs inte automatiskt. Nästa produktionssteg är att få ett fungerande Unitybygge och telefonmätningar innan fler visuella system staplas på.

## Grafik som behöver riktig produktion

Procedurmodellerna gör det möjligt att granska layout och spelmekanik. För hög igenkänning och presentationsgrafik behövs godkända miljöreferenser, handgjorda moduldelar, PBR-texturer, LOD:er, avståndsculling, ljusbakar/light probes, skinnade karaktärer, rörelseanimationer och optimerade effekter. Särskilt kyrkans rum, Sandgrunds ytor och hotellens identitet behöver platsnära modellarbete. Inga påståenden om fotorealism eller CoD-kvalitet är verifierade.

## Sponsorplatser

Alla nämnda verksamheter är tänkta platser i spelet. Ingen är angiven som faktisk sponsor. Kontakt med kommunen, trafikaktören, hotell, gallerior, museum, O’Learys eller Färjestad har inte skett genom projektet.

Ett framtida platsregister bör ha fälten `placeId`, `visitorReference`, `approvedAssets`, `agreementStatus`, `sponsorLabel`, `eventSource`, `validFrom`, `validTo`, `reviewedAt`. Sponsorvisning aktiveras först när ett faktiskt samarbete är klart. Riktiga evenemang ska komma från kontrollerade källor med datum och utgångstid; prototypen innehåller inga påhittade aktuella öppningar eller avgångstider.

XP är intjänad spelvaluta i minnet under sessionen. Den säljs inte, saknar inlösenfunktion och är inte ansluten till betalning. 50 XP för gästskydd förbrukas vid acceptans; det är inte en intäkt till en restaurang. En kommersiell sponsorprodukt behöver en separat affärsmodell och avtal.

## Internet och beständighet

Den nuvarande betrodda värden räcker för lokal prototyputvärdering. Publika matcher behöver en internetanslutningslösning och en server som driver transaktioner med idempotens, bekräftad spelaridentitet och återanslutning. Lägg inte nycklar eller signeringsmaterial i Git. Molntjänster, Relay, konton, användarvillkor, avgifter och betalningar har inte aktiverats. Beständig team-XP/byggnadsägande behöver definieras innan databasmodell och drift kan färdigställas.

## Föreslagen första sponsorvisning

En verifierad telefonrunda på cirka fyra minuter: cityintro, kyrkbesök, O’Learys som skydd, laginbjudan, buss till arena och återkomst till Sandgrund. Visa både stadsläge och zombieläge. Dokumentera faktisk telefonmodell, bildfrekvens, spelbarhet och vilka miljöer som är prototyper. Detta demonstrerar sponsornyttan utan att presentera tänkta samarbeten som ingångna.
