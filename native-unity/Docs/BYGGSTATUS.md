# Verkligt byggförsök 2026-09-27

**Resultat: stopp före paketimport och spelkompilering. Ingen APK, IPA eller Xcode-export skapades.**

Utgångspunkt: GitHub-commit `d9a0f5313f126d1b2d548002a068a13c0f0309a6`.

## Utfört

- Unity Editor **6000.3.25f1**, revision `e1dba0a9aba4`, hämtades från Unitys officiella Linux-arkiv och packades upp. `Unity -version` returnerade rätt version med exitkod 0.
- Editorn startades med `-batchmode -quit -nographics -projectPath …/native-unity -executeMethod Karlstad.Editor.PrototypeBuilder.Generate`.
- Unity öppnade projektets sökväg, men avslutades med **exitkod 1** innan den genererade scenen skapades.
- `Bygg-iPhone.command` kontrollerades med `bash -n`. Dess kontroll för fel operativsystem kördes och stoppade korrekt på Linux. Skriptet är inte verifierat genom ett helt Mac-/iPhone-bygge.

## Observerade hinder

Licenstjänsten kunde inte initieras:

```text
[Licensing::Module] Error: Licensing initialization failed after 0.00s
```

Miljön nekade läsning av nätverksgränssnitt. Unity Package Manager kraschade i Node-funktionen `networkInterfaces`:

```text
Error getting interface addresses: Operation not permitted
SystemError [ERR_SYSTEM_ERROR]: A system error occurred: uv_interface_addresses returned Unknown system error 1 (Unknown system error 1)
[Package Manager] Could not connect to IPC stream "Upm-6" after 30.0 seconds.
```

Detta är ett fel i byggmiljön innan spelkompileringen. Försöket visar inte att C#-kod, RPC-generering, shaders eller någon spelplattform har byggts utan fel. Det visar inte heller om en Unity-licens skulle vara giltig efter en fungerande licensinitiering.

Den fullständiga lokala loggen finns i `Builds/Logs/linux-generate.log` när denna arbetsmiljö finns kvar. Katalogen innehåller byggartefakter och är inte versionshanterad; relevanta fel och resultat är bevarade här.

## Nästa körning på Mac

1. Använd en Mac där Unity Hub har en aktiverad licens, Unity **6000.3.25f1** med **iOS Build Support**, samt en Xcode-version kompatibel med datorns macOS och testtelefonen.
2. Hämta senaste projektet och stäng det i Unity om det redan är öppet.
3. Kör `native-unity/Bygg-iPhone.command`. Det genererar scenen och exporterar till Xcode i två separata Unity-processer, med loggar för båda stegen.
4. Om Unity rapporterar kompileringsfel behöver dessa rättas innan Xcode-steget. Ingen lyckad kompilering förutsätts av skriptet eller denna rapport.
5. Välj utvecklingsteam och fysisk iPhone i Xcode och kör appen. Signering, installation, telefonens kontroller och multiplayer återstår att verifiera.

Det finns ingen uppkopplad Mac eller iPhone till denna arbetsmiljö. Xcode och iPhone-signering har därför inte körts. Inga konton, betalningar eller licensvillkor har aktiverats eller accepterats i försöket.

Officiellt underlag: [Unity-versionen](https://unity.com/releases/editor/whats-new/6000.3.25f1), [Unity-licenser](https://docs.unity3d.com/6000.3/Documentation/Manual/ManagingYourUnityLicense.html), [Xcode-systemkrav](https://developer.apple.com/xcode/system-requirements/).
