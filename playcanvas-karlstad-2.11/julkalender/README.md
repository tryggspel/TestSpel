# Karlstads Julkalender (landningssida för Julklappsjakten)

En julkalender med 24 luckor, byggd på en vinterbild av Karlstad. Varje lucka är ett riktigt uppdrag eller en riktig utmaning i **Julklappsjakten** (Julspelet, spelet i den här mappen): julrundor, butiksuppdrag, JulRushen, Tomtezombies, topplistan och två uppdrag ute i staden: *Sandgrund: Julvernissagen* (lucka 6) och *Båtbussen till Mariebergsskogen* (lucka 9). Kalendern binder ihop spelet med en gemensam berättelse, stjärnor, titlar och en julgran som tänds lampa för lampa.

Adress: `https://karlstad-julklappsjakten.vercel.app/julkalender/` (Julspelets Vercel-projekt har den här mappen, `playcanvas-karlstad-2.11/`, som rotkatalog, så `julkalender/` publiceras med spelet). Lokalt: `python3 -m http.server 8902` i den här mappen och öppna `/julkalender/`.

## Så hänger den ihop med spelet

**Kalendern är en fristående sida** (nya filer i `julkalender/`, `tests/julkalender-*.test.mjs` och `tools/julkalender/`) som gör två saker. Den lägger ingenting i spelet. De ändringar som finns i Julspelet för kalendern, de två uppdragen och länken i startvyn, beskrivs i `JULVERSION.md` avsnitt 12. **Karlstad City (grundspelet på `main`) är inte ändrat.**

1. **Går rakt till uppdraget.** Knappen i varje lucka är en djuplänk, `../?uppdrag=<nyckel>&lucka=<n>` (till exempel `../?uppdrag=sandgrund&lucka=6`; se *Djuplänkar* nedan). Julspelet visar då ett kort med uppdraget och en stor knapp *STARTA UPPDRAGET*; inget startar av sig självt (ljud och styrning kräver en tryckning). Luckan säger också vad man trycker på i spelet om länken inte räcker, till exempel *JULRUSHEN → Rush 5*.
2. **Läser av resultatet.** Kalendern ligger på samma adress som spelet och delar därför `localStorage`. Den **läser** Julspelets egen sparning, `karlstad-xmas:save:1` (`xmas/xmas-save.mjs`): julstämplar, JulRushens och Tomtezombies nivåer, rekord, summor och smeknamn. Den bockar av luckan när man kommer tillbaka (flikbyte, bakåtknapp eller att en annan flik sparar). Den **skriver aldrig** till spelets nycklar (`karlstad-xmas:*` och `xmas:*`); det testas.

Kalenderns egna framsteg ligger i `julspelet:2026:v1`. Allt sparas bara på spelarens enhet. Inga konton, ingen server, inga uppgifter skickas.

### Vad som räknas

- **Stämplar, nivåer, rekord och titlar** räknas oavsett när de klarades: det man redan gjort i Julspelet räknas.
- **Räknare** (paket, avslutade rundor) räknas som *nya sedan kalendern började följa spelaren* (baslinje vid första besöket). Annars skulle en van spelare få delar av kalendern gratis. Baslinjen sänks om spelsparningen nollställs.
- En lucka bockas bara av när den har **öppnats** (på sitt datum eller senare). Man kan ta igen missade dagar.
- Klara luckor förblir klara. På varje lucka finns "Markera själv" som reserv om avläsningen skulle misslyckas; den går att ångra. Ingen lucka kräver det: alla läses av i spelets sparning.
- **Fri julvandring** går inte att bocka av: spelet sparar inget från den (inget mål, ingen leverans, inga summor). Därför finns ingen lucka för den.

## De 24 luckorna

| Lucka | Datum | Titel | Typ | Villkor | ★ |
|---|---|---|---|---|---|
| 1 | tis 1 dec | Hjälp tomten på Stora Torget | Julklappsjakt | stämpel FÖRSTA PAKETEN | ★ |
| 2 | ons 2 dec | Torgets julklappsjakt | Julklappsjakt | stämpel TORGETS PAKETREGN | ★★ |
| 3 | tor 3 dec | Cervera: Tomtarnas fikabord (demo) | Butiksuppdrag | stämpel TOMTARNAS FIKABORD | ★★ |
| 4 | fre 4 dec | JulRushen: Rush 1 JULMYS | JulRushen | Rush 1 JULMYS klar | ★ |
| 5 | lör 5 dec | Tre rundor till slut | Utmaning | 3 nya avslutade rundor | ★ |
| 6 | sön 6 dec | Sandgrund: Julvernissagen | Platsuppdrag | stämpel SANDGRUND · JULVERNISSAGEN | ★★★ |
| 7 | mån 7 dec | Pressbyrån: Tomtarnas fikaorder (demo) | Butiksuppdrag | stämpel TOMTARNAS FIKAORDER | ★★ |
| 8 | tis 8 dec | Kungsgatans julrunda | Julklappsjakt | stämpel KUNGSGATANS JULRUNDA | ★★ |
| 9 | ons 9 dec | Båtbussen till Mariebergsskogen | Platsuppdrag | stämpel MARIEBERGSSKOGEN · JULBÅTEN | ★★★ |
| 10 | tor 10 dec | JulRushen: Rush 3 GLÖGGFART | JulRushen | Rush 3 GLÖGGFART klar | ★★ |
| 11 | fre 11 dec | Drottninggatans julrunda | Julklappsjakt | stämpel DROTTNINGGATANS JULRUNDA | ★★ |
| 12 | lör 12 dec | Tomtezombies: nivå 1 | Tomtezombies | Tomtezombies nivå 1 klar | ★★ |
| 13 | sön 13 dec | Lucia: Rush 5 SLÄDFART | JulRushen | stämpel JULRUSHEN | ★★ |
| 14 | mån 14 dec | Paketjägare: 100 paket | Utmaning | 100 nya paket | ★★ |
| 15 | tis 15 dec | Tomtezombies: nivå 2 | Tomtezombies | Tomtezombies nivå 2 klar | ★★ |
| 16 | ons 16 dec | Utmana en vän | Utmaning | namn sparat på topplistan | ★ |
| 17 | tor 17 dec | Perfekt rush | JulRushen | en rush med 3 stjärnor | ★★ |
| 18 | fre 18 dec | Bli Tomtehjälpare | Utmaning | 900 julpoäng totalt | ★★ |
| 19 | lör 19 dec | Maraton: tempo 6 | JulRushen | Maraton: tempo ≥ 6 | ★★ |
| 20 | sön 20 dec | JulRushen: Rush 8 NORDPOLEN | JulRushen | Rush 8 NORDPOLEN klar | ★★★ |
| 21 | mån 21 dec | Highscore: Rush 4 SNÖYRA | JulRushen | ≥ 4 500 poäng i Rush 4 | ★★★ |
| 22 | tis 22 dec | Tomtezombies: nivå 4 | Tomtezombies | Tomtezombies nivå 4 klar | ★★★ |
| 23 | ons 23 dec | Lilla julafton: Rush 10 SNÖSTORM | JulRushen | Rush 10 SNÖSTORM klar | ★★★ |
| 24 | tor 24 dec | Julafton: åtta av elva julstämplar | Julfinal | 8 av 11 julstämplar | ★★★ |

Summa 51 stjärnor. Titlar efter stjärnor: Julnisse (0), Pepparkaksbagare (6), Tomtens hjälpreda (15), Julklappsjägare (27), Granmästare (40), Karlstads tomte (51). Söndagarna 6, 13 och 20 december är advent; 13 december är Luciadagen. Rusherna kommer i trappa (1, 3, 5, 8, 10) som i spelet, och ingen lucka kräver Rush 12 TOMTEGALET eller alla elva stämplar: bara de mycket duktiga klarar det, och finalen ska gå att nå (luckorna ger tio olika stämplar, åtta krävs). Lucka 24 tänder stjärnan i granen.

**Luckorna 6 och 9 är egna uppdrag i Julklappsjakten** (`xmas/xmas-sandgrund.mjs`, `xmas/xmas-marieberg.mjs`, knappar i Julmenyn). *Julvernissagen* är grundspelets uppdrag Vernissage från graven som julvariant: samma spelregler, men julens egen stämpel, julpoäng och resultatkort, och "Tillbaka" leder till Julmenyn. *Julbåten* är grundspelets båtbuss från Inre hamn (tolv passagerare att rädda) följd av en julklappsjakt i Mariebergsskogen: tolv julklappar och tre bonuspaket som lämnas hos tomten vid bryggan. Båda ger en julstämpel (nu elva stämplar i spelet), som kalendern läser av som vilken stämpel som helst.

**Zombie-Lerin.** Lucka 6 återger grundspelets formulering om en tecknad Zombie-Lerin som jagar besökarna utanför Sandgrund. Stäm gärna av med Sandgrund och Lars Lerin innan en kampanj byggs kring den.

**Butiksuppdrag.** Pressbyrån och Cervera är demonstrationer i spelet (`PARTNERPLATSER.md`): inget samarbete är bekräftat, inget erbjudande finns och inga rabatter är påhittade. Luckorna märks *Demo*, och testerna felar om platsen inte är en demo i spelet eller om kalendern påstår något spelets platsdata inte gör.

## Djuplänkar

Länkarna förstås av Julspelet (`xmas/xmas-deeplink.mjs`, kortet i `index.html`). Kalendern importerar ingen spelkod för dem: nycklarna står som strängar i `doors.mjs` (`spel.djup`), och `tests/julkalender-doors.test.mjs` kontrollerar att varje nyckel finns i spelet och leder till det luckan kräver.

| Nyckel | Vad som händer | Luckor |
|---|---|---|
| `intro` | Första uppdraget (Hjälp tomten på Stora Torget) | 1 |
| `torget`, `kungsgatan`, `drottninggatan` | Julklappsjakten på just den banan | 2, 8, 11 |
| `cervera`, `pressbyran` | Fri julvandring med Karlstadpasset öppet (tryck GÅ DIT) | 3, 7 |
| `sandgrund`, `batbuss` | Julvernissagen respektive Julbåten | 6, 9 |
| `rush1` … `rush12` | JulRushen, just den rushen | 4 (`rush1`), 10 (`rush3`), 13 (`rush5`), 20 (`rush8`), 21 (`rush4`), 23 (`rush10`) |
| `maraton` | JulRushen: Maraton | 19 |
| `zombies1` … `zombies99` | Tomtezombies, just den nivån | 12 (`zombies1`), 15 (`zombies2`), 22 (`zombies4`) |
| `rush`, `topplista`, `meny` | Rushmenyn, topplistan respektive Julmenyn öppnas direkt (inget kort) | 17, 16, 5 + 14 + 18 + 24 |

Spelets regler gäller även via länken, och kortet säger vad som saknas i stället för att låta länken kringgå dem: **är uppdraget låst** (Rush 3 innan Rush 2 är klar, Tomtezombies nivå 2 innan nivå 1 är klar) säger kortet det och knappen startar nästa uppdrag i ordningen; **före första uppdraget** startar knappen det i stället för julrundor, butiker, Sandgrund och båtbussen (som i menyn finns först efteråt); ett **redan stämplat** uppdrag säger det. En okänd eller trasig nyckel visar startvyn med ett kort meddelande. Adressen städas när kortet visas, så en omladdning startar inte om det. En utmaningslänk från en vän (`?utmaning=…`) går före. Webbläsarkontrollen `tools/xmas-flow/links.mjs` provar de här fallen i Julspelet.

## Förhandsvisning och test

Före 1 december är alla luckor låsta (med nedräkning). För att titta på dem:

- `?test`: alla luckor öppna för förhandsvisning (`?test=0` stänger av). Finns också som knapp i fotens verktyg och som "Förhandsgranska" i nedräkningskortet.
- `?datum=2026-12-10` eller `?dag=10`: låtsas att det är en viss dag.
- Förhandsvisning och simulerat datum sparar under en **egen nyckel** (`julspelet:2026:v1:preview`), så de riktiga framstegen rörs aldrig.

Luckorna byter dag vid svensk midnatt (Europe/Stockholm), oavsett var enheten står. Vercel-förhandsvisningar av grenar ligger bakom Vercel-inloggning (som övriga förhandsvisningar i projektet).

## Landningssida: var finns den?

Kalendern ligger på `/julkalender/`, och **Julspelets startvy har en länk dit** (*JULKALENDERN · 24 LUCKOR →*, i både startvyn och Julmenyn). **Startvyn på `/` är i övrigt oförändrad**: vänutmaningarna (`https://karlstad-julklappsjakten.vercel.app/?utmaning=…`) pekar på `/` och ska fortsätta öppna spelet, och produktionsadressen ändras inte utan ett uttryckligt ja (`JULVERSION.md` avsnitt 4). Vill man senare att kalendern ska vara *första* sidan är en omskrivning i en `vercel.json` som skickar `/` till kalendern (och låter kalendern vidarebefordra `?utmaning=`) en liten ändring.

## Bakgrundsfoto

Sidan levereras med en illustrerad vinterkväll i Karlstad (Östra bron, Domkyrkan, Rådhuset, Sandgrund, Stora Torget), ritad som kod. **Ett riktigt, snöigt foto läggs in utan kodändring:** lägg filen som `img/karlstad-snow.webp` eller `img/karlstad-snow.jpg` och eventuell bildtext i `img/credit.txt`. Se `img/README.md`. Tills en fil finns ger webbläsaren två 404 i konsolen för den; det är avsiktligt.

## Ändra eller lägga till

- **Texter, villkor och trösklar:** `doors.mjs`. Tröskelvärdena (till exempel 4 500 poäng i Rush 4 och tempo 6 i Maraton) är satta från spelets regler men **inte speltestade av människor**; justera efter hur svårt det visar sig vara.
- **Regler (datum, avläsning, titlar):** `rules.mjs`. **Sidan:** `index.html`, `calendar.css`, `app.mjs`. **Bild:** `scene.mjs`, `snow.mjs`.
- Cache-nyckeln (`?v=`) är spelets: `node tools/set-version.mjs 2.21.1-xmas.N` sätter den även i kalendern, och `tests/version.test.mjs` kräver att den är densamma överallt.

## Verifiering

```
node --test tests/julkalender-*.test.mjs        # regler, luckor mot Julspelets kod, sidans filer (ingår i node --test tests/*.mjs)
node tools/julkalender/browser-check.mjs        # webbläsarflöde i Chromium
```

Testerna läser Julspelet men ändrar det inte, och felar om det kalendern lovar slutar stämma: att stämplar, rusher (namn och mål), nivåer, titlar och platser finns, att knapptexterna finns kvar, att Sandgrund- och båtknapparna finns i Julmenyn med sina stämplar, att varje luckas djuplänk förstås av Julspelet och leder till det luckan kräver, och att sparformatet läses rätt. Varje avläsbar lucka spelas dessutom "på riktigt" genom Julspelets egen skrivkod (`XmasSave`) och måste bockas av. Webbläsarkontrollen kräver `playwright` (`PLAYWRIGHT=/väg/till/playwright/index.mjs`, `CHROME=/väg/till/chromium` om de inte hittas) och startar en egen filserver. Den öppnar inte själva spelet (som hämtar spelmotorn från en CDN som är blockerad i vissa sandlådor).

## Gränser

- **Inte provat på en fysisk telefon** (till exempel iPhone 11). Webbläsarkontrollen kör Chromium med mobil storlek och touch, men säger inget om känsla eller prestanda på riktiga enheter.
- **Djuplänkarna är nya och provade i Chromium** (`tools/xmas-flow/links.mjs`), inte på en riktig telefon. Luckornas steg beskriver ändå vägen i menyerna som reserv. Ändras knapparnas texter fångar testerna det, men luckorna måste uppdateras för hand.
- **Avläsningen kräver samma ursprung (samma adress) som spelet**, eftersom `localStorage` är per adress. Hostas kalendern någon annanstans fungerar länkarna men inte avläsningen; då återstår "Markera själv".
- **Att klara en lucka är inte provat av människor**: JulRushens svårighet är mätt mot modellerade spelare (`JULVERSION.md` avsnitt 6.1), inte mot riktiga, och Tomtezombies och sök-och-hitta-jakterna har ingen människa spelat.
- Ingen statistik över alla spelare (det finns ingen server).
