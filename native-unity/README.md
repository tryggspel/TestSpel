# Karlstad After the Sun — installerat mobilspel

**Inriktning: iOS och Android först. Unity 6.3 LTS / URP.**

Detta är native-projektets källkodsprototyp, tillagd 2026-09-26. Den befintliga Babylon-versionen i `../karlstad-city` finns kvar som separat webbpilot. Unity-projektet behöver öppnas, genereras, kompileras och speltestas i Unity innan det finns en installerbar app. **Ingen APK, IPA, Unity-renderad bild eller uppmätt telefonprestanda ingår i denna leverans.**

## Vad källkoden innehåller

- Mobil FPS med separata pek-ID:n för joystick, sikte och solstråle; omedelbar lokal rörelse, radial dödzon, automatisk sprint, hopp, duckning, säker skärmyta och fokusåterställning.
- Originalbyggd, komprimerad Karlstadmiljö och åtta besökbara spelinteriörer: Domkyrkan, Bergvik, Hotel Fratelli, Scandic Karlstad City, Duvan, Sandgrund, O’Learys och Löfbergs Arena.
- Rörlig startkamera, URP-material, arkitektoniska detaljer, möbler, gatulyktor, älv, programmerad molnhimmel, dimma, färgsättning, solprojektor och egen syntetiserad musik.
- Zombieknapp, max 28 zombies, kollisionsmedveten navigering, solstrålar med sju sekunders neutralisering, solnova, mat/vatten, död/återstart och en uppdragskedja med fem steg.
- Spelbuss till Bergvik och arenan. Två stiliserade hockeyförsvarare kan rekryteras efter bussresan till arenan. De följer spelaren och neutraliserar fiender inom fri sikt.
- Fiktiv Lars Lerin-museivärd med nyskriven dialog. Egna abstrakta konstpaneler; inga kopierade Lerinverk, pressbilder, klubbemblem eller kommersiella musikspår.
- Unity Netcode for GameObjects / Unity Transport för **lokal testsession på samma Wi-Fi**. Solo använder lokal värd. Upp till åtta deltagare, fyra i varje lag. Lagets pengar, byggnadsägande, skott och belöningar avgörs av värden.
- Lag kan slå ihop solo-XP, säkra ett tomt/neutraliserat rum för 600 XP och bjuda in gäster. Gästens lag betalar 50 XP för tre minuters skydd först när rätt gäst accepterar. Inbjudan går ut efter två minuter och kan inte återanvändas.

Detta är en första teknisk och konstnärlig prototyp. Den är inte en färdig produktion med Call of Duty-grafik, exakta fastighetsmodeller, verifierat internetmultiplayer eller färdiga sponsorintegrationer.

## Öppna och skapa spelvärlden

1. Installera **Unity 6000.3.25f1** med Android Build Support (SDK/NDK/OpenJDK), och iOS Build Support för iPhone-arbete. Unity Hub hanterar licens/installation på utvecklingsdatorn.
2. Lägg till katalogen `native-unity` som projekt i Unity Hub och öppna. Vänta tills paket och skript har importerats.
3. Välj **Karlstad → 1. Generate mobile prototype**. Menyn skapar scen, material, renderprofiler och registrerade nätverksprefabs i `Assets/Karlstad/Generated`. Kör menyn igen för att återskapa genererat innehåll; spara egna ändringar utanför den katalogen.
4. Input System används. Om Unity begär omstart efter inställningsändringen, starta om editorn. Kontrollera Project Settings → Player → Active Input Handling = Input System Package (New).
5. Öppna den genererade `KarlstadMobile`-scenen och tryck Play. Välj **Spela solo**. **Zombie** växlar hela sessionens läge. I en flerspelarsession gör värden detta.
6. Använd Game View i 16:9 och 19.5:9 liggande. Device Simulator och fysisk telefon behövs för riktiga samtidiga touchtester.

Editorhjälp: WASD, mellanslag, C, håll höger musknapp för sikte och vänster för skott, eller F. Interaktion görs med skärmknappen. Tangentbordet är för utveckling; primär design är touch.

## Bygg för telefon

**Android:** välj `Karlstad → 2. Build Android development APK`. Resultatet ska hamna i `Builds/Android/KarlstadMobile-dev.apk`. Menyn kräver installerad Android-byggmodul och ett lyckat Unitybygge. ARM64, IL2CPP, Vulkan med GLES3 som alternativ. Detta är utvecklingsbygge, inte en butikssignerad release.

**iOS:** välj `Karlstad → 3. Export iOS Xcode project`. Öppna exporten i Xcode på Mac, välj rätt utvecklingsteam och unik bundle identifier, bygg och signera för en fysisk iPhone. iOS 15 är projektets lägsta inställning. Apple-signering/TestFlight och enhetsprovisionering är inte konfigurerade här. Lokal nätverksförklaring läggs till för Wi-Fi-samspel.

För automatisering i en redan installerad och licensierad Unitymiljö:

```sh
Unity -batchmode -quit -projectPath /absolute/path/native-unity -executeMethod Karlstad.Editor.PrototypeBuilder.Generate -logFile generate.log
Unity -batchmode -quit -projectPath /absolute/path/native-unity -executeMethod Karlstad.Editor.PrototypeBuilder.BuildAndroid -logFile android-build.log
```

## Spelrundan

1. Aktivera Zombie Apocalypse. Tänd tre solfyrar längs huvudgatan, 350 gemensam XP per fyr. En zombies första neutralisering per runda ger 75 XP.
2. Gå in i en byggnad, neutralisera rummets zombies och använd terminalen för **Säkra byggnad — 600 XP**. Ägande gäller sessionen.
3. Ta bussen från city till arenan. Gå in och rekrytera två hockeyförsvarare.
4. Överlev till 150 sekunder. O’Learys och andra matställen erbjuder +35 hälsa och full solenergi med 30 sekunders återhämtning; zombierummet behöver vara lugnt.
5. Återvänd till Sandgrund och aktivera evakuering vid älven. Tre solfyrar, lagets skyddsbyggnad och försvarare krävs.

I stadsäventyret går det att besöka platserna utan zombiehot och möta museivärden. Stadens tidigare webbuppdrag, liveväder och API-data har **inte** migrerats till denna native-prototyp ännu. Spelbussens resor är snabba speltransporter och visar inga verkliga avgångstider.

## Lag, säkerhet och nätverk

Välj **Värd på samma Wi-Fi** på en telefon. Övriga anger värdens lokala IP-adress och ansluter. UDP-port 7777 används; ingen routerport ska öppnas. Acceptera telefonens lokala nätverksbehörighet om den visas. Under **Lag** ser man anslutna spelar-ID:n och kan bjuda in. Solo-lagets XP och byggnader följer med vid accepterad laginbjudan; fulla lag kontrolleras även vid acceptans.

Värden kontrollerar rörelsetakt, skottintervall, energi, siktlinje, interaktionsavstånd, lagkapacitet, XP och inbjudningar. Klienter skickar aldrig ett XP-belopp. Värden är dock en betrodd spelare, inte en dedikerad produktionsserver. Lokal rörelseprediktion har enklare korrigering och behöver latens-/paketförlusttester. Värdavbrott avslutar sessionen; ingen host migration eller återanslutningsidentitet finns. Inga internetlobbyer, Relay, autentisering, databas, köp, chatt eller beständiga XP-konton är anslutna.

Grafikval under Lag: Batteri (30 fps mål), Balanserad (60 fps mål), Hög (60 fps mål). Dessa är **mål**, inte uppmätta resultat. Högre kvalitet kräver enhetstest; världens originalgeometri är utbytbar mot detaljmodeller senare.

## Verifierat i denna arbetsmiljö

```sh
python3 Tools/verify.py --dotnet /path/to/dotnet
```

- 39 kompilerade/körda kontrollpunkter för XP, dubbelutbetalning, lagkapacitet, sammanläggning, inbjudans mottagare, engångsanvändning, utgångstid, gästrättigheter, frånkoppling och mobilens inmatningsmatematik.
- C# 9-syntax kontrollerad med Roslyn i samtliga C#-källfiler under Assets.
- Centrala Netcode-API:er jämförda med Unitys publicerade paketkälla, URP-version mot officiell dokumentation.
- Unity Editor, IL-postprocessning av RPC:er, scenbygge, shaderkompilering, Android/iOS-bygge, rendering, ljud, kontroller på telefon och två verkliga klienter **har inte kunnat köras här**. Läs `Docs/TESTPLAN.md` för nästa verifieringsgrind.

## Underlag och kommersiell fortsättning

Se `Docs/PLATSUNDERLAG.md` för besökskällor och vilka delar som är fria speltolkningar. Sponsorplatser, avtal, verkliga evenemang, rättighetshantering och framtida internettjänster beskrivs i `Docs/PRODUKTION.md`. Inga platser presenteras som faktiska sponsorer.
