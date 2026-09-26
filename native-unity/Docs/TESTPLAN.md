# Nästa verifiering i Unity och på telefon

Status 2026-09-26: rena C#-regeltester och syntaxkontroll är körda. Nedanstående är kvarstående verifiering, inte utförda tester.

## Import och nativebygge

- Öppna 6000.3.25f1 och invänta att paketlösning, C#-kompilering och Netcode IL-postprocessning är klara utan fel.
- Generera prototypen. Kontrollera sparad scen, nätverksprefabhashar, shader, material, renderer data och aktiva byggscener. Spela, stoppa och öppna scenen igen så att serialization verifieras.
- Bygg ARM64 APK och iOS Xcode-export. Installera på riktig telefon med giltig signering.
- Validera nätverksbehörighet och appåtergång från bakgrunden på båda plattformar.

## Mobilkänsla och tillgänglighet

- Kör på en iPhone 11 och minst en mellanprisklass-Android som första faktiska referensenheter. Dessa har inte benchmarkats här.
- Rörelse, sikte och skott samtidigt med tre pek-ID:n. Släpp ett finger utan att andra låser sig. Drag på skottknappen ska fortsätta sikta.
- Tappa appfokus, öppna lagpanel och rotera mellan tillåtna landskapsriktningar. Ingen kvarhängande rörelse, skott eller ljud.
- Kontrollera säkra skärmytor på 16:9 och 19.5:9, minsta text, hak/hemindikator, knappar och att vapnet inte blockerar målet.
- Kontrollera hopp under lågt tak, duckning/uppresning, diagonalfart och sprint vid fullt joystickutslag.

## Grafik och spelrum

- Mät CPU/GPU frame time, draw calls, minne, batteri och temperatur efter 15 minuter i Balanserad och Hög profil. 60 fps är mål, inte levererat mätvärde.
- Kontrollera interiörbelysning, kyrkans ljuskronor, fönster, moln, fog, transparenta UI-ytor och inga rosa/missade shader-varianter.
- Besök samtliga åtta interiörer. Kontrollera markkollision, entré/utgång, möbler, Duvans ramp och att spelaren inte kan lämna kartramarna.
- Kontrollera att ursprungliga stadsfigurer försvinner/ersätts av zombieaktörer vid lägesbyte och återkommer när stadsäventyret återupptas.

## Överlevnad och lag

- Full runda: tre fyrar → stunnat rum → 600 XP skydd → buss till arena → två försvarare → 150 s → evakuering.
- Solstråle stoppas av vägg, skott kräver energi, nova går inte genom vägg, zombies återhämtar sig och tar sig runt möbler.
- Testa nedslag, återstart, byte till stadsäventyr och ny zombierunda.
- Två verkliga telefoner: värd och gäst på samma Wi-Fi, sena anslutningar, laginbjudan, gästinbjudan, exakt gemensam saldoändring och spelar-ID efter återanslutning.
- Fyra i lag, konkurrerande acceptanser till sista platsen, fel mottagare, utgångna koder, replay, värdavbrott, sista medlemmen lämnar.
- Emulera 50/100/200 ms latens och paketförlust. Rörelseprediktionen är förenklad; byt till bekräftad inputhistorik/återsimulering om den korrigerar ryckigt.

Internetmultiplayer får en egen grind: autentisering, Relay/dedikerad auktoritet, beständig transaktionsjournal, belastning, återanslutning och rapporterings-/moderationsfunktioner innan publik lansering.
