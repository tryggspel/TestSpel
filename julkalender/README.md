# Karlstads Julkalender (Julspelet 2026)

Landningssida för Julspelet: en julkalender med 24 luckor byggd på en vinterbild av Karlstad. Varje lucka är ett riktigt uppdrag eller en riktig utmaning i **Karlstad City** (`../playcanvas-karlstad-2.11/`). Kalendern binder ihop spelet till en helhet med en gemensam berättelse (zombierna har gömt julklapparna), stjärnor, titlar och en julgran som tänds lampa för lampa.

Publiceras på `https://tryggspel.github.io/TestSpel/julkalender/` (se `.github/workflows/deploy-karlstad-mobile.yml`). Rotsidan `/` skickar fortfarande vidare till Karlstad City, oförändrad. Vill man att kalendern ska vara rotsidan ändrar man `index.html` i repots rot, som idag skickar vidare till spelet; det är avsiktligt inte gjort.

Kalenderns tester körs i `.github/workflows/julkalender-tests.yml`. Kalendern publiceras bara om de är gröna, men de **stoppar aldrig** publiceringen av spelet.

## Så hänger den ihop med spelet

**Karlstad City är inte ändrat.** Kalendern är en fristående sida i den här mappen som gör två saker:

1. **Länkar in i spelet.** Knappen i varje lucka öppnar ett läge som redan finns, med spelets egna länkar: `?challenge=sandgrund`, `?challenge=boat`, `?challenge=sista-rundan`, `?challenge=fikapanik`, `?challenge=radda-fikat` och `?daily=1`. Övriga luckor öppnar startskärmen och säger vilken knapp man ska trycka på.
2. **Läser av resultatet.** Spelet och kalendern ligger på samma domän och delar därför `localStorage`. Kalendern **läser** spelets sparfiler (`karlstad:missions:2`, `karlstad:rush:best:1`, `karlstad:tempo:1`, `karlstad:trail:best`, `karlstad:boat:best:1`, `karlstad:fun:1`, `karlstad:places:1`, `karlstad:daily:*`) och bockar av luckan när man kommer tillbaka (flikbyte, bakåtknapp eller att en annan flik sparar). Den **skriver aldrig** till spelets nycklar; det testas.

Kalenderns egna framsteg ligger i `julspelet:2026:v1`. Allt sparas bara på spelarens enhet. Inga konton, ingen server, inga uppgifter skickas.

### Vad som räknas

- **Uppdrag, rekord, stämplar och märken** räknas oavsett när de klarades: det man redan gjort i spelet räknas.
- **Räknare** (termosar, skatter, bussresor, blixtutmaningar, turbometer, incheckningar) räknas som *nya sedan kalendern började följa spelaren* (baslinje vid första besöket). Annars skulle en van spelare få halva kalendern gratis. Baslinjen sänks om spelsparningen nollställs.
- En lucka bockas bara av när den har **öppnats** (på sitt datum eller senare). Man kan ta igen missade dagar.
- Klara luckor förblir klara. Lucka 12 (Coop och Clas Ohlson) sparas inte i spelet och **markeras av spelaren**. På alla luckor finns dessutom "Markera själv" som reserv om avläsningen skulle misslyckas. Själv-markeringen går att ångra.

## De 24 luckorna

| Lucka | Datum | Titel | Typ | Villkor | ★ |
|---|---|---|---|---|---|
| 1 | tis 1 dec | Första julklappen | Utforska | 5 nya termosar | ★ |
| 2 | ons 2 dec | Pressbyrån: Fika på minuten (demo) | Butiksuppdrag | stämpel `pressbyran` i Karlstadpasset | ★★ |
| 3 | tor 3 dec | Rädda julklapparna | Uppdrag | uppdraget `radda-fikat` klart | ★★ |
| 4 | fre 4 dec | Cervera: Duka för fikastunden (demo) | Butiksuppdrag | stämpel `cervera` i Karlstadpasset | ★★ |
| 5 | lör 5 dec | Julbussen | Resa | 1 nya bussresor | ★ |
| 6 | sön 6 dec | Sandgrund: Vernissage från graven | Uppdrag | uppdraget `sandgrund` klart | ★★★ |
| 7 | mån 7 dec | Julrusch: Zombiejakten | Utmaning | Zombiejakten ≥ 1 000 | ★★ |
| 8 | tis 8 dec | Skattjakt i staden | Utforska | 3 nya skatter | ★★ |
| 9 | ons 9 dec | Båtbussen till Mariebergsskogen | Resa | båtbussen ≥ 1 + 3 nya termosar i Mariebergsskogen | ★★★ |
| 10 | tor 10 dec | BussQuiz: full pott på linjen | Resa | 1 nya bussturer med full pott | ★★ |
| 11 | fre 11 dec | Julhandla i Mitt i City | Utforska | 4 nya termosar i Mitt i City | ★ |
| 12 | lör 12 dec | Hjälp personalen på Coop och Clas Ohlson | Butiksuppdrag | markeras av spelaren | ★ |
| 13 | sön 13 dec | Lucia: Termosrundan | Utmaning | Termosrundan ≥ 400 | ★★ |
| 14 | mån 14 dec | Sista rundan på O’Learys | Uppdrag | uppdraget `sista-rundan` klart | ★★ |
| 15 | tis 15 dec | Julrusch: Temporush | Utmaning | Temporush, tempo ≥ 6 | ★★ |
| 16 | ons 16 dec | Blixtjul | Utforska | 3 nya blixtutmaningar | ★★ |
| 17 | tor 17 dec | Dagens Karlstad | Utmaning | 1 vunnen Dagens Karlstad i december | ★★ |
| 18 | fre 18 dec | Turbotomten | Utforska | 1 000 nya meter turbo | ★ |
| 19 | lör 19 dec | MusicPartner: checka in på Kungsgatan | Butiksuppdrag | 1 nya incheckningar | ★ |
| 20 | sön 20 dec | Bonus: Fullt pass | Butiksuppdrag | märket `pass-all` | ★ |
| 21 | mån 21 dec | Kombo-nissen | Utmaning | kombokedja ≥ 8 | ★★ |
| 22 | tis 22 dec | Julrusch: Galet tempo | Utmaning | Temporush, tempo ≥ 9 | ★★★ |
| 23 | ons 23 dec | Lilla julafton: Zombiejakten | Utmaning | Zombiejakten ≥ 1 300 | ★★★ |
| 24 | tor 24 dec | Julafton: Fikapanik på Stora Torget | Julfinal | uppdraget `fikapanik` klart | ★★★ |

Summa 46 stjärnor. Titlar efter stjärnor: Julnisse (0), Pepparkaksbagare (6), Tomtens hjälpreda (14), Julklappsjägare (24), Granmästare (34), Karlstads tomte (46). Söndagarna 6, 13 och 20 december är advent; 13 december är Luciadagen; lucka 24 är finalen på Stora Torget och tänder stjärnan i granen.

**Butiksuppdrag.** Pressbyrån och Cervera är demonstrationer i spelet (`PARTNERPLATSER.md`): inget samarbete är bekräftat, inget erbjudande finns och inga rabatter är påhittade. Luckorna märks *Demo*, och testerna felar om en lucka pekar på en plats som spelet inte räknar som spelbar eller om kalendern påstår något som spelets platsdata inte gör. När en verksamhet har avtal sätter man `status:'active'` på platsen i spelet och tar bort `demo:true` på luckan.

**Zombie-Lerin.** Lucka 6 använder spelets eget uppdrag *Vernissage från graven*, där en tecknad Zombie-Lerin jagar besökarna utanför Sandgrund. Luckan återger spelets formulering och säger att det är en tecknad spelfantasi. Stäm gärna av med Sandgrund och Lars Lerin innan en kampanj byggs kring den.

## Förhandsvisning och test

Före 1 december är alla luckor låsta (med nedräkning). För att titta på dem:

- `?test`: alla luckor öppna för förhandsvisning (`?test=0` stänger av). Finns också som knapp i fotens verktyg och som "Förhandsgranska" i nedräkningskortet.
- `?datum=2026-12-10` eller `?dag=10`: låtsas att det är en viss dag.
- Förhandsvisning och simulerat datum sparar under en **egen nyckel** (`julspelet:2026:v1:preview`), så de riktiga framstegen rörs aldrig.

Luckorna byter dag vid svensk midnatt (Europe/Stockholm), oavsett var enheten står.

## Bakgrundsfoto

Sidan levereras med en illustrerad vinterkväll i Karlstad (Östra bron, Domkyrkan, Rådhuset, Sandgrund, Stora Torget), ritad som kod. **Ett riktigt, snöigt foto läggs in utan kodändring:** lägg filen som `img/karlstad-snow.webp` eller `img/karlstad-snow.jpg` och eventuell bildtext i `img/credit.txt`. Se `img/README.md`. Tills en fil finns ger webbläsaren två 404 i konsolen för den; det är avsiktligt.

## Ändra eller lägga till

- **Texter, villkor och trösklar:** `doors.mjs`. Tröskelvärdena (till exempel Zombiejakten ≥ 1 300 och Termosrundan ≥ 400) är satta från spelets regler men **inte speltestade**; justera efter hur svårt det visar sig vara.
- **Regler (datum, avläsning, titlar):** `rules.mjs`. **Sidan:** `index.html`, `calendar.css`, `app.mjs`. **Bild:** `scene.mjs`, `snow.mjs`.
- Höj `version.mjs` och ?v=-nyckeln i `index.html` och modulerna när något ändras, så att webbläsaren inte blandar nya och gamla filer (testet `page.test.mjs` kontrollerar att de är lika).

## Verifiering

```
node --test julkalender/tests/*.test.mjs            # regler, luckor mot spelet, sidans filer
node julkalender/tools/browser-check.mjs            # webbläsarflöde i Chromium
```

Testerna läser Karlstad City men ändrar det inte, och felar om spelet slutar hålla det luckorna lovar: att uppdrag, märken och platser finns, att länkarna förstås av spelets länkläsare, att knapptexterna finns kvar och att sparnycklarna används. Webbläsarkontrollen kräver `playwright` (`PLAYWRIGHT=/väg/till/playwright/index.mjs`, `CHROME=/väg/till/chromium` om de inte hittas) och startar en egen filserver. Den öppnar inte spelet (som behöver en CDN som är blockerad i vissa sandlådor).

## Gränser

- **Inte provat på en fysisk telefon** (till exempel iPhone 11). Webbläsarkontrollen kör Chromium med mobil storlek och touch, men säger inget om känsla eller prestanda på riktiga enheter.
- **Spelet har ingen väg tillbaka till kalendern.** Spelaren använder webbläsarens bakåtknapp eller byter flik. En "Tillbaka till julkalendern"-länk i spelet kräver en ändring i spelet och är inte gjord.
- **Spelet är inte omskuret till jul.** Julklapparna är spelets termosar, och inget snö- eller julutseende finns i staden. Kalendern berättar det med text. Roadmapens December-omskinning (`GAMEPLAY_ROADMAP.md`, fas G) är en separat uppgift.
- **Avläsningen kräver samma ursprung (samma domän) som spelet**, eftersom `localStorage` är per domän. Hostas kalendern någon annanstans fungerar länkarna men inte avläsningen; då återstår själv-markering.
- Ingen statistik över alla spelare (det finns ingen server).
