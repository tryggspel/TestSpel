# Julklappsjakten – speldesign inför lanseringen (2.21.1-xmas.12)

Skrivet 2026-11-24 efter att användaren bett om "en logik till varför man spelar och inte slutar", ett rakt spel, ett pris (en julgran), fler gömda julklappar runt Karlstad och QR-koder som kan bytas mot kaffe eller rabatt.
Det som står under **Byggt** finns i spelet och är provat (enhetstester och Chromium, se avsnitt 11). Det som står under **Förslag** är inte byggt. Siffrorna ligger i `xmas/xmas-meta-config.mjs`
och är modellerade med `tools/xmas-meta/sim.mjs`. **Ingen människa har spelat något av detta**, inget är provat på en riktig telefon, och balansen (XP, odds, lotter) är räknad, inte spelad.

Beslut från användaren som detta bygger på: bygget ligger på den nyaste linjen (xmas.9, med Julkalendern); **butiksuppdragen och uppdragen i staden finns kvar** (Cervera, Pressbyrån, Sandgrund, Julbåten);
**Julkalendern behålls som den är** och får belöningar (ingen andra kalender); **anmälan till dragningen går via en server med molnlagring**.

**Beslut 2026-11-24 (efter xmas.11):** publicera på `karlstad-julklappsjakten`; **granen köper arrangören själv** (ingen sponsor); datum och tid enligt förslaget; villkoren (utkastet) är ok; provomgången har **bara QR-koder för rabatt på julgran** och ändras senare; molnlagring får användas (även för en kvallista); **veckofinaler varje advent i Mitt i City**; lag om **kanske tre personer**.

## 0. Svar på frågorna

| Fråga | Svar |
|---|---|
| Varför spelar man och slutar inte? | Tre tidsskalor. **Nu:** efter varje jakt syns vad man fick (XP, en prydnad, ibland en lott) och vad som är nästa mål ("12 julklappar till nästa lott"), och en stor knapp EN JAKT TILL. **Idag:** tre dagliga uppdrag och dagens julklapp, en grad som stiger. **I morgon:** serie, en ny lucka i Julkalendern, en ny ledtråd till en gömd julklapp, advent, och en dragning som kommer närmare. |
| Vad är progressen? | **Grad** 1–12 (XP), **julgran** med 24 prydnader, **dagliga uppdrag** och **serie**, **Julkalenderns luckor** (belöning per lucka), **20 gömda julklappar**, **hemliga paket** (QR) och **lotter** till dragningen om en julgran. Allt sparas på enheten. |
| Startläge? | Första gången: bara **Julklappsjakten** (första uppdraget, ca två minuter, Stora Torget). JulRushen och Tomtezombies syns inte än. Efter det: Julmenyn med graden, dagens tre uppdrag, serie, lotter och alla lägen. |
| Vilka spel från start? | Bara Julklappsjakten. Resten öppnas av **första uppdraget**, inte av en grad: Julkalenderns luckor kräver rush, zombies, butiker och platsuppdrag redan från dag 4, så ett grad-lås skulle spärra luckor. |
| Tomtezombies? | Finns kvar som ett **bonusläge** (kuslig musik, nivåer som förut). Det syns först efter första uppdraget, ger XP, prydnader och räknas i serien. Dagens uppdrag kräver det bara av den som provat det (annars väljs inget zombie-uppdrag). |
| Stadssamarbeten? | Butiksuppdragen och Sandgrund/Julbåten finns kvar (ditt beslut), men startvyn och slutkorten handlar om det raka spelet. Inga partner påstås: se `PARTNERPLATSER.md`. |
| Vinna en julgran? | Ja: lotter som tjänas genom att spela, dragning mån 21 dec kl 18 (inställning). Anmälan går via server (avsnitt 6) och är **stängd tills ansvarig och kontakt (personuppgiftsansvarig) är ifyllda** (ingen sponsor: arrangören köper granen); lotterna räknas ändå från första dagen. |
| Fler gömda paket? | 20 **gömda julklappar** på kontrollerade platser (avsnitt 3.6), alla provade i Chromium. |
| QR-koder, kaffe, rabatt? | Byggt, provat och **i produktion sedan 2026-11-24 som provomgång**: tolv affischkoder som ger en kupong, rabatt på julgran, utan belopp och utan butik (avsnitt 7). Spelet påstår inga samarbeten. |
| Lansera? | Första advent är söndag 29 nov. **Publicerat i produktion 2026-11-24 (xmas.12)** efter ditt uttryckliga ja; läget står i avsnitt 9. |
| Seriespel, 1 mot 1 live och lag? | Avsnitt 10 (förslag, inte byggt): solo först, kval, sedan live på storbildsskärm. |

## 1. Principer

- **Ett rakt spel.** Sök och hitta (spåren, tappade julklappar, leverans hos tomten) är oförändrat. Framstegen ligger runt det.
- **Positivt, inte straffande.** Ingen förlorar något på att missa en dag (en frysdag räddar serien), inga köp, inga annonser, ingen stressande nedräkning.
- **Barnvänligt.** Inga personuppgifter samlas in utom i den frivilliga anmälan till dragningen, och den kräver att man är myndig eller har en målsmans tillåtelse.
- **Fungerar utan server.** Allt en spelare gör sparas på enheten (`karlstad-xmas:meta:1`, skild från julspelets `karlstad-xmas:save:1`). Servern behövs bara för anmälan.
- **Allt är fail-soft.** Går något fel i framstegen fortsätter jakten utan dem (`M()` i `xmas-boot.js`). En belöning delas ut en gång och kan inte tas tillbaka av en uppdatering.

## 2. Spelloopen och tre tidsskalor

```
jakt (2–3 min) → slutkortet: XP + prydnad + ev. lott + "nästa mål" → EN JAKT TILL (ett tryck)
dag:  tre uppdrag (lätt/medel/svårt) → dagens julklapp (prydnad + lott) · första jakten ger +30 XP · advent: 2 lotter · dagens ledtråd
säsong: serie · grader · julgranen fylls · Julkalenderns luckor · gömda julklappar · hemliga paket · lotter till dragningen
```

## 3. Progression (byggt)

### 3.1 Grad (XP)

XP: 2 per julklapp, 6 per bonuspaket, 40 för en klarad jakt, +30 för dagens första. Fri julvandring ger samma per julklapp direkt. Tomtezombies +30 per klarad nivå, JulRushen +25 per klarad rush och 5 per stjärna,
Maraton 3 per tempo (räknas som klarad vid minst 20 paket), butiksuppdrag 40 första gången (10 därefter), Sandgrund 60 (15), gömd julklapp 60, dubblett 15, uppdrag 40/60/80. En jakt som misslyckas ger 1 XP per paket (högst 20).

| Grad | Namn | XP | Belöning när den nås |
|---|---|---|---|
| 1 | SNÖFLINGA | 0 | |
| 2 | MÖSSBÄRARE | 100 | en prydnad |
| 3 | VANTSTICKARE | 400 | en sällsynt prydnad eller bättre |
| 4 | LJUSTÄNDARE | 900 | en lott |
| 5 | SPÅRSPANARE | 1 600 | en sällsynt prydnad eller bättre |
| 6 | GLÖGGKOKARE | 2 600 | en lott |
| 7 | SLÄDDRAGARE | 3 900 | en episk prydnad eller bättre |
| 8 | RENVISKARE | 5 600 | en lott |
| 9 | STJÄRNPUTSARE | 7 800 | en episk prydnad eller bättre |
| 10 | NORDPOLSBUD | 10 500 | en lott |
| 11 | PAKETMÄSTARE | 14 000 | en episk prydnad eller bättre |
| 12 | SJÄLVASTE TOMTEN | 18 500 | två lotter och Tomtens stjärna |

Gradnamnen är medvetet *inte* de som redan används: julpoängens titlar (Nyfiken, Paketjägare, Tomtehjälpare, Julens vän, Övertomte; luckan "Bli Tomtehjälpare" och dess text hänvisar till dem på startvyn) och
kalenderns titlar (Julnisse … Karlstads tomte). **Det finns därför tre stegar** (julpoäng-titel, grad, kalenderns stjärnor). De är åtskilda i text, men en enda stege vore enklare: lösningen är en senare ändring av luckan 18 och startvyns statusrad.

### 3.2 Julgranen (24 prydnader)

12 vanliga, 7 sällsynta, 4 episka, 1 legendarisk (Tomtens stjärna), alla ritade med canvas (`xmas-tree-art.js`). En saknad prydnad visas som en siluett. Varje klarad jakt, zombie-nivå och rush ger **en dragning**:
70 % vanlig, 24 % sällsynt, 5,5 % episk, 0,5 % legendarisk. Inom en sällsynthet väger något man saknar tre gånger mer än något man har, och efter åtta dubbletter i rad får man alltid något man saknar
(aldrig stjärnan: den kommer av grad 12, lucka 24, ett hemligt paket eller en riktig tur). En dubblett ger 15 XP. Första uppdraget ger alltid en röd kula. Dagens julklapp, gömda julklappar och hemliga paket har bättre odds (`ORNAMENT_ODDS`).

### 3.3 Dagens uppdrag och dagens julklapp

Tre per dag (lätt, medel, svårt) valda av datumet så att alla får samma, och inte samma som dagen före. Valet sparas första gången det görs så att det inte ändras under dagen. Första uppdraget (genomgången) räknas inte mot dagens uppdrag.
Klarar man alla tre öppnas **dagens julklapp**: en prydnadsdragning med bättre odds och en lott. Uppdrag som kräver ett läge (Tomtezombies, rush) väljs bara om man provat det; "hitta en gömd julklapp" väljs bara när de finns.

| Nivå | Uppdrag | XP |
|---|---|---|
| Lätt | Klara en julklappsjakt · Hitta 15 julklappar | 40 |
| Medel | Hitta 40 julklappar · Hitta 2 bonuspaket · Få kombo 5 · Klara 2 julklappsjakter | 60 |
| Svårt | Klara en jakt på under 3 minuter · Få kombo 8 · Klara jakter på två olika platser · Hitta en gömd julklapp · Klara en nivå i Tomtezombies · Klara en rush | 80 |

Tröskelvärdena (under 3 minuter, kombo 8) är satta från spelets regler men inte provade på riktiga spelare.

### 3.4 Serie

En dag räknas när man klarat minst en jakt (svensk tid). En saknad dag räddas av en **frysdag** (en ny för var sjunde dag i serien, högst två sparade); annars börjar serien om. Serien visas som "n dagar i rad".
Belöningar: 3 dagar en prydnad, 7 dagar en lott och 100 XP, 14 dagar en lott, en sällsynt prydnad och 150 XP, 21 dagar två lotter, 24 dagar 200 XP (en gång var, även om serien börjar om).

### 3.5 Julkalendern (behålls som den är, får belöningar)

Kalenderns sida (`julkalender/`) och dess luckor (ett riktigt uppdrag per lucka, villkor mot julspelets sparning) är orörda. När luckan skulle räknas som klar enligt kalenderns egna regler (`evaluate` i `julkalender/rules.mjs`,
öppen sin dag) hämtas belöningen **en gång**, när menyn öppnas eller efter ett resultat. Spelet *läser* kalenderns baslinje och skriver aldrig i kalenderns sparning; kalendern skriver aldrig i framstegen.
Belöning per lucka (`CALENDAR`): XP på lucka 1, 5, 10, 14, 16, 18, 21 och 24; en prydnad på de flesta andra (sällsynta på de svårare, episka från lucka 13); lotter på 3, 6, 7, 9, 14, 17, 20 och 22 (en vardera), 23 (två) och 24 (tre, och Tomtens stjärna).
**Adventssöndagarna** (29 nov, 6, 13 och 20 dec): två lotter om man klarar en jakt den dagen, en gång per söndag. Första advent infaller före kalendern och är lanseringsdagens krok.

### 3.6 Gömda julklappar (20 platser)

Guldpaket på platser ur grundspelets skattjakt (kontrollerade mot spelets karta, 250–880 m från Torget): Tingvallas tysta hörn, Mitt på Västra bron, Stationsklockan, Perrongen, Löfbergs kaffelager, Museiparkens bänk, Rosenpergolan,
Kongressens scen, Dammen, Skeppet, Stadsträdgårdens bänk, Fontänen, Pirens sista planka, Hamnkranen, Gjutarens pokal, Glasbruket, Bryggudden, Magnolian och Herrhagen. De ligger bara i **fri julvandring**, syns med en ljusstråle inom 44 m och
en rad säger "varmt" (120 m) och "glödhet" (45 m). Ledtråden är grundspelets korta gåta; tre är framme första dagen och en ny släpps varje dag. Varje fynd ger 60 XP och en sällsynt prydnad eller bättre, och var femte en lott.
Höjden spelar ingen roll (bron, bryggan) men sikten gör det. Alla 20 plockades i Chromium (`tools/xmas-flow/meta.mjs`, kontroll 2l).

### 3.7 Lotter

En lott har koden `T-XXXX-XXXX` (sju slumpade tecken och ett kontrolltecken som fångar en felskriven bokstav). Källor: första uppdraget (1), **mätaren** (en lott per 60 julklappar, högst 3 om dagen), dagens julklapp (1 om dagen), serie, nya grader, Julkalenderns luckor,
adventssöndagarna (2 vardera), var femte gömd julklapp och hemliga paket. Högst 200 lotter per enhet. Bara mätaren är obegränsad, och den har ett dagstak; alla andra källor är ändliga.

## 4. Startläge och vad som är öppet

| Läge | Öppnas | Anmärkning |
|---|---|---|
| **Termosjakten** (huvudspåret, xmas.13) | Från start, överst | TempoRush med julens termosar, obegränsat antal rundor, dagsmål, rekord och insamlingen (avsnitt 13) |
| **Dagens julklappsjakt** (xmas.13) | Från start | En ny julklapp gömd i Karlstad varje dag, belöning en gång per dag (avsnitt 13) |
| Första uppdraget (Stora Torget) | Från start | Guidat, en genomgång: ger XP, röd kula, första lotten, serie |
| Julklappsjakt (Torget, Kungsgatan, Drottninggatan), fri julvandring, gömda julklappar | Efter första uppdraget | Nästa runda väljs av spelet |
| JulRushen och Maraton, Tomtezombies, butiksuppdrag, Sandgrund, Julbåten | Efter första uppdraget | Som förut. Inget låses av graden |
| Julkalendern (länk), lotter, julgran | Från start (kalendern öppnar 1 dec) | |

Startvyn är **den stora knappen först** (sedan xmas.13: TERMOSJAKTEN, därefter DAGENS JULKLAPPSJAKT och Julklappsjakten), sedan remsan (grad, dagens uppdrag, serie, lotter, prydnader, tre knappar). Bakåtlänken till grundspelet är kvar som en liten länk.

## 5. Efter varje jakt (slutkortet)

Belöningsraden: **+XP** och gradens stapel, prydnader som små kort (med en ritad ikon och sällsynthet), lotter (koden syns), klarade uppdrag, dagens julklapp, serien, adventssöndag och luckor, lott-mätaren och **nästa mål**.
Efter första uppdraget går FORTSÄTT till Julmenyn. Därefter är den stora knappen **EN JAKT TILL · \<plats\>** (nästa runda direkt) och JULMENYN en egen knapp. Julbåten och butiksuppdragen går tillbaka till menyn som förut.

## 6. Priset: "Vinn en julgran"

**Datum:** dragning måndag 21 december kl 18.00 och anmälan som stänger samma dag kl 12.00 (så att granen hinner levereras före jul) var mitt förslag och är **godkänt av dig 2026-11-24** ("kör vi på ditt förslag"); ändra `drawDate`, `drawTime` och `entryCloses` i `PRIZE`.

**Sponsor:** ingen. Arrangören köper granen själv, så `PRIZE.sponsor` är tomt och ingen "skänkt av" visas.

**Regler (utkast i `xmas/xmas-draw-text.mjs`):** gratis, ingen köpplikt; anmälan med namn och e-post eller telefon, bekräftelse att man är myndig eller har en målsmans tillåtelse, och samtycke; vinnaren dras slumpmässigt bland alla inskickade lottkoder;
vinnaren kontrolleras före utlämning. **Jag är inte jurist:** kontrollera om utlottningen kräver tillstånd eller anmälan, åldersgränsen, hur länge uppgifter får sparas och den rättsliga grunden innan anmälan öppnas.

**Huvudbrytare:** `PRIZE.enabled:false` döljer allt om priset (lotter, dragning, anmälan, prisknappen); lotterna räknas ändå så att de syns om du slår på det senare. Standardläget är `enabled:true` med `ready:false` (anmälan stängd): sätt `enabled:false` om du lanserar innan granen och villkoren är bekräftade, så att spelet inte lovar något som inte finns.

**Server (ditt beslut, byggt):** `api/xmas-draw.mjs` tar emot anmälan och sparar **en fil per kontakt** i ett **privat Vercel Blob-lager** (ingen publik adress; kontaktens kontrollsumma är filnamnet). Samma kontakt som skickar in fler lotter slås ihop (ETag mot
samtidiga skrivningar). Bara namn, kontakt, lottkoder, tidpunkter och grad/dagar/serie sparas; inga IP-adresser, inga cookies. Spärr mot upprepning, storleksgräns, kontroll av alla fält. Servern flaggar orimliga mängder lotter (`flags`) men avvisar dem inte.
Anmälan är **stängd** (`PRIZE.ready:false`): spelet visar då bara lotterna och "anmälan öppnar snart", och servern svarar 503 och tar inte emot något.

**Fusk:** lotterna ligger på spelarens enhet och går att fabricera av den som kan koden. Därför flaggas orimliga mängder och **vinnaren kontrolleras före utlämning** (grad, dagar, antal lotter, om hen faktiskt spelat). Ett pris av en julgrans värde motiverar inte mer.
Ska det bli rättvist på riktigt behöver lotterna utfärdas av servern (kräver att varje jakt rapporteras dit: en större ändring).

**Dragning:** `tools/xmas-draw/export.mjs` hämtar anmälningarna, `pick.mjs pool` bygger poolen och ger en kontrollsumma som du publicerar före dragningen, `pick.mjs draw --seed="…"` drar vinnare och reserver ur SHA-256 av
seed, poolens kontrollsumma och en räknare, så att vem som helst kan räkna om det ur `offentligt-bevis.json` (lottkoder, inga kontaktuppgifter). En person kan bara vinna en gång. Efter dragningen: `export.mjs --delete --yes` (senast `PRIZE.keepUntil`).

**Det som återstår för att öppna anmälan:**
1. **`controller` (vem som är personuppgiftsansvarig) och `contact` (hur man når hen) i `PRIZE`** i `xmas/xmas-meta-config.mjs` saknas: det är det enda som hindrar. Sätt därefter `ready:true`. Texten i `xmas-draw-text.mjs` fylls då automatiskt och ett test kräver att inga platshållare blir kvar. (Sponsor: ingen. Datum och tid: godkända. `keepUntil` 2027-01-31 står kvar: ändra om uppgifterna ska sparas kortare.)
2. Villkoren och integritetstexten (utkast) är godkända av dig som text. Jag är inte jurist: bestäm om en jurist ska granska dem innan anmälan öppnas.
3. **Klart 2026-11-24:** det privata Blob-lagret `julklappsjakten-dragning` (`store_cEFxaYRRl7UtWRV8`, privat, `arn1`/Stockholm) är kopplat till `karlstad-julklappsjakten`, så `BLOB_READ_WRITE_TOKEN` finns i Production, Preview och Development. Funktionen körs också i `arn1` (`vercel.json`), så att namn och kontakt inte passerar USA. Vercel flaggar variabeln som `readable-secret` (typen "encrypted": teammedlemmar kan läsa den i dashboarden); den ger läs- och skrivrätt till lagret, så markera den gärna som *Sensitive* i Vercel.
4. Prova med en riktig testanmälan när formuläret öppnats och radera den (`tools/xmas-draw/export.mjs --delete`). **En POST mot det riktiga lagret är inte provad än** (anmälan är stängd, så inget har skrivits).

## 7. Kuponger och QR-koder (byggt; provomgång med julgransrabatt i produktion)

**Hemligt paket (QR i verkligheten):** en affisch med en QR-kod öppnar spelet på `?paket=KOD`. Koden löses in första gången menyn öppnas och ger XP, en sällsynt prydnad eller bättre, ev. en lott och ev. en kupong, **en gång per enhet**.
Koderna står bara som SHA-256-kontrollsummor i `QR_CODES` (aldrig i klartext i bygget). `node tools/xmas-qr/make.mjs koder --base=https://din-adress --labels="Affisch Torget,…"` skapar koderna (12 tecken, ca 60 bitar), `qr-config.txt` att klistra in,
`koder.csv` (klartext, dela inte) och `affischer.html` att skriva ut (fyra QR per A4). QR-bilderna avkodades med en oberoende läsare (jsQR) i provet. En kod gäller först när den är inlagd i bygget och bygget är publicerat.

**Kuponger (kaffe, rabatt):** ett erbjudande är data i `COUPONS`: `{id, title, partner, text, terms, validTo, pin}`. Spelaren får kupongen som belöning (en QR-kod, en lucka, en grad) och ser den under Gömda julklappar. **Inlösen utan server:** spelaren visar kupongen,
personalen anger en **PIN** i spelarens telefon (`node tools/xmas-qr/make.mjs pin <id> <pin>` ger kontrollsumman), och kupongen blir inlöst och går inte att använda igen på enheten. Det duger för små belopp; man kan få en ny genom att rensa webbläsarens lagring.
**Provomgången (xmas.12, 2026-11-24):** tolv koder som alla ger samma kupong, **RABATT PÅ JULGRAN** (en per enhet), 30 XP och en sällsynt prydnad eller bättre, ingen lott. Kupongen anger inget belopp och ingen butik ("Visa kupongen när du köper din julgran och be om julgransrabatten."); den gäller t.o.m. 2026-12-24 och löses in med personalens PIN. **Det som är ditt att bestämma innan affischerna sätts upp:** vem som ger rabatten och hur stor den är, villkoren, var affischerna hänger och vem som får veta PIN-koden. Texten ändras i `COUPONS` (den slås upp vid visning, så den gäller också kuponger som redan delats ut) och kräver en ny publicering. Fler koder eller andra kuponger: `make.mjs koder … --coupon=<id> --lead="…"` och `make.mjs pin <id> <pin>`, klistra in raderna och publicera.

**Kupongen syns direkt:** som en egen rad överst på menyn (även för en helt ny spelare som kommer från en affisch, innan första uppdraget), som "NY KUPONG" i raden för hemligt paket och överst under Gömda julklappar. **Koderna i klartext och PIN-koden finns bara hos den som skapade dem** (`qr-out/`, ignorerad av git): förloras de går de inte att återskapa, bara ersätta med nya koder. Spelet påstår inga samarbeten: `partner` är tomt tills en butik står bakom kupongen.

**Flytt av spelet (ni flyttar allt före den offentliga lanseringen):** QR-bilden på affischen innehåller **adressen** (`https://karlstad-julklappsjakten.vercel.app/?paket=KOD`), så **skriv inte ut förrän adressen är slutlig**. Koderna hör till spelets kod (kontrollsummorna i `QR_CODES`), inte till adressen: flyttas spelet med samma `QR_CODES` och `COUPONS` gäller samma koder på den nya adressen, och bara bladet behöver göras om: `node tools/xmas-qr/make.mjs poster --from=koder.csv --base=https://nya-adressen --out=<ny mapp>` (samma koder, nya QR-bilder; vägrar om en kod inte finns i bygget). `node tools/xmas-qr/make.mjs check --from=koder.csv --pin=<PIN>` kontrollerar att alla koder, kupongen och PIN:en fortfarande hör ihop med bygget och skriver aldrig ut en kod. Paketet `julgransrabatt-2026-SPARA.zip` som skickades till dig innehåller koderna, PIN:en, bladet och en README om detta.

## 8. Mätning och intäkter

- Mätning utan egen server: Vercel Web Analytics (kakfri) kan slås på i projektet (en inställning du gör); spelet skickar inga händelser än.
- Intäktsidéer som inte kräver stadssamarbeten i spelet: en sponsor till priset ("Presenteras av …" visas i lottpanelen när `PRIZE.sponsor` är ifylld), sponsrade kuponger (butiken står för kaffet), betalda QR-affischer (ett hemligt paket med en sponsrad prydnad: `orn` kan vara ett bestämt id),
  en sponsrad dag i kalendern. Inga köp i spelet, inga annonser.

## 9. Lansering

| Steg | Status |
|---|---|
| Framstegen, gömda julklappar, hemliga paket, kuponger, anmälan (stängd) | Byggt i xmas.11 och xmas.12, provat (avsnitt 11) |
| Förhandsvisning på Vercel (`karlstad-julklappsjakten`, bakom inloggning) | Följer grenen `claude/stoic-tesla-59znyc` |
| Vilken adress är produktion? | **`karlstad-julklappsjakten.vercel.app`** (beslut 2026-11-24). `karlstad-julkalender.vercel.app` (xmas.9) är orörd |
| Provning på riktig telefon (iPhone 11, Safari), också en skanning av en utskriven affisch | **Inte gjort** |
| Produktionsdeploy | **Klar 2026-11-24:** xmas.12, `dpl_GwetMc96ce8WiUChZy3nZHwMjC6K` (commit `8f83646`), efter ditt uttryckliga ja. Återställning: `dpl_6S6JKaht5z2TWkMwButiEkn5FVmW` (xmas.6) |
| Produktionsadressen öppnas utan Vercel-inloggning | **Inte kontrollerat** (byggmiljön når inte `*.vercel.app`): öppna den i ett privat fönster före utskrift |
| Privat lager och anmälningsfunktion i Stockholm | Klart 2026-11-24 (avsnitt 6) |
| Anmälan till dragningen | **Stängd** tills `controller` och `contact` är ifyllda (avsnitt 6) |
| QR-affischer | Tolv affischer klara som PDF (A4), **inte uppsatta**. Rabattens belopp, säljare och villkor är inte bestämda |
| Slutlig adress (QR-bilderna innehåller den) | **Inte beslutad:** ni flyttar allt före den offentliga lanseringen. Skriv inte ut förrän den är bestämd; bladet kan göras om med samma koder (`make.mjs poster`) |

Rollback: förra produktionsdeployen ligger kvar och kan sättas tillbaka (`request_rollback`); en lott eller prydnad en spelare fått tas aldrig bort av en uppdatering (egen sparnyckel med version).

## 10. Seriespel, live-duell och lag (förslag, inte byggt)

Ditt önskemål: folk spelar **ensamma först** och kvalar in till ett **seriespel som körs live på en skärm i staden** (Mitt i City, eller utomhus för helgens finaler, eller för att lotta ut fler julprodukter): två spelare
**mot varandra i realtid**, en omgång på tid, "på jakt efter Karlstads största julklapp". Frågan om **lag** som samarbetar.

**Tre nivåer, olika mycket arbete:**
1. **Lagpoäng (enkelt, asynkront).** Ett lag har en lagkod och 2–5 medlemmar som spelar var för sig; lagets poäng är summan av medlemmarnas bästa kvalresultat. De samarbetar genom att alla bidrar. Kräver samma server som kvallistan.
2. **Live-duell på storbildsskärm (rekommenderas).** Två spelare (eller två lag) spelar **samma bana** samtidigt, var och en på sin egen telefon, efter en gemensam nedräkning; storbildsskärmen visar bådas ställning live (bara poäng och framsteg skickas, inte hela världen).
   Lag spelar stafett: varje medlem tar ett pass och lagets summa räknas. Det här är det som går att göra riktigt bra på en vecka eller två.
3. **Samma värld i realtid** (man ser varandra och tävlar om samma paket) kräver en riktig realtidsserver och är flera veckors arbete. Inte före jul.

**Det som måste finnas för att det ska bli rättvist:**
- **En bana som är lika för alla.** I dag slumpas var paketen tappas (sök och hitta), så poängen går inte att jämföra. Kvalet och finalen behöver en fast bana ("Största julklappen"): samma slump för alla, eller JulRushens redan fasta banor.
- **En central kvallista.** I dag finns bara lokal sparning och vännernas lista. Det betyder **molnlagring av smeknamn och poäng** (offentliga namn, inga kontaktuppgifter) och behöver **ett nytt godkännande** från dig (det du godkänt gäller bara anmälan till dragningen).
- **Finalen avgör på plats.** En poäng som skickas från en telefon går alltid att förfalska. Kvalet väljer ut kandidater; finalisterna spelar om på utrustning ni håller i, med en domare. Då är fusk i kvalet värdelöst.

**Ordning:** (1) solospelet lanseras före första advent (det som byggts nu), (2) kvallistan och en fast kvalbana öppnas några dagar senare med en färsk lista, så att ingen tappar något, (3) live-finalerna minst en vecka efter att kvalet startat.
Tekniskt för live: en storbildssida (`/live/`) som visar ställningen, en liten server för poäng (en funktion plus en snabb lagring, till exempel Redis via Vercels Marketplace; Blob duger inte för täta skrivningar), en matchkod som spelarna skriver in, och en nedräkning som startar båda samtidigt.

**Beslut jag behöver från dig innan jag bygger det:** (1) får molnlagring användas även för en kvallista med smeknamn? (2) vad är "Karlstads största julklapp": priset, eller en särskild bana (till exempel en jätteklapp vid mål)? (3) var och när hålls finalerna och vilken utrustning finns där (dator, skärm, telefoner, nät)? (4) lagstorlek (2–5?) och
om lagen ska spela stafett eller summera sina kvalpoäng?

**Svar 2026-11-24:** (1) ja, molnlagring får användas; (3) **veckofinaler varje advent i Mitt i City** (29 nov, 6, 13 och 20 dec); (4) lag om **kanske tre personer**. **Mitt förslag:** den första finalen kan inte vara 29 nov. Kvallistan och en fast bana är inte byggda, och en final fem dagar efter publiceringen skulle spelas utan kvalspel. Den första realistiska finalen är **söndag 6 dec**, och bara om kvallistan öppnar senast omkring 30 nov; annars 13 dec. Kvar att besluta: (2) vad "Karlstads största julklapp" är, (3) utrustning och nät i Mitt i City, (4) om lag om tre spelar stafett eller summerar kvalpoäng. **Inget av seriespelet är byggt.**

## 11. Vad som är provat och vad som inte är det

**Provat (kan upprepas):**
- `node --test tests/*.mjs`: 710 av 710 tester (CI grön på xmas.12), bland dem `xmas-meta` (belöningar en gång, serie, frysdagar, tak, advent, luckor, gömda, koder, kuponger, sparskydd), `xmas-draw` (formulär, server, lagring med ETag, spärr), `xmas-draw-pick` (poolen och att dragningen går att räkna om och är rättvis), `xmas-hidden` (paketmotorn).
- `node tools/xmas-flow/meta.mjs` (Chromium, mjukvarurenderad grafik): första start → första uppdraget → slutkort → Julmeny → julgran, lotter, gömda julklappar → alla 20 platser plockas → hemligt paket och kupong med PIN → klara luckor en senare dag (klockan flyttad) → anmälan mot en låtsasserver → liggande telefon (896×414).
- QR-bilderna avkodas av en oberoende läsare (jsQR; de tolv på affischbladet: 12 av 12 ger exakt adressen); SHA-256 mot Nodes egen för 200+ strängar.
- De **tolv riktiga affischkoderna och den riktiga PIN:en** i Chromium mot bygget på disk: ny spelare som skannar (adressen städas, raden nämner rabatten, kupongraden syns, stora knappen syns utan att rulla på 414×896, 375×667 och 896×414), fel och rätt PIN, en andra affisch på samma enhet (XP men ingen andra kupong), samma affisch igen ("redan hämtat"), alla tolv på var sin ny enhet, en felskriven kod, och ingen kod i klartext i det som levereras.
- `node tools/xmas-meta/sim.mjs`: takten för tre sorters spelare (nedan).

**Inte provat:** en riktig telefon (iPhone 11/Safari), en människas upplevelse (läsbarhet, tempo, om första uppdraget hittas), anmälan mot den **riktiga** lagringen (lagret finns sedan 2026-11-24 men anmälan är stängd, så ingen skrivning har gjorts; servern är provad mot en låtsaslagring med samma gränssnitt), en skanning av en **utskriven** affisch med en riktig telefon, att produktionsadressen öppnas utan Vercel-inloggning,
en POST mot funktionen på Vercel (förhandsadressen är bakom inloggning och verktyget kan bara göra GET; en GET mot `/api/xmas-draw` svarade däremot `405 POST only` från funktionen själv, vilket visar att filerna bundlades och att `@vercel/blob` installerades: 31 paket, ingen felrad i bygget), många datum i Julkalendern i webbläsaren (provat: 4 dec).

**Takten, modellerad** (`tools/xmas-meta/sim.mjs`, 400 spelare per sort, median och 10–90 %; ingen har spelat så här):

| Spelare | Jakter | Grad vid 24 dec | Prydnader | Lotter |
|---|---|---|---|---|
| Tillfällig (en jakt ungefär var tredje dag) | 10 (7–13) | 5 (4–6) | 14 (10–17) | 9 (6–13) |
| Vanlig (2–3 jakter, fem dagar av sju) | 50 (42–58) | 9 (9–10) | 24 (23–24), 64 % fyller granen | 50 (41–58) |
| Ivrig (5–8 jakter och fri vandring varje dag) | 176 (164–187) | 12 (redan i vecka 3) | 24 (redan i vecka 2) | 136 (129–141) |

Tolkning: en tillfällig spelare ser ungefär hälften av granen och några lotter; en vanlig spelare fyller granen efter två–tre veckor (vill du förlänga den: fler prydnader i `ORNAMENTS`, eller färre dragningar); den ivrigaste når toppen i vecka 2–3 och har då lotterna kvar att jaga.
Lotterna skiljer sig 15 gånger mellan tillfällig och ivrig. Vill du jämna ut det: sänk `TICKETS.dailyCap` eller höj `TICKETS.meter`.

## 12. Risker

- **Anmälan och personuppgifter:** utkast till villkor och integritetstext måste granskas; ingen anmälan öppnar av sig själv.
- **Fusk med lotter:** se avsnitt 6. Kontrollera vinnaren.
- **Tre stegar** (julpoäng-titel, grad, kalenderns stjärnor): kan förvirra; se 3.1.
- **Okänd takt:** XP, odds och lotter är modellerade; justera i konfigurationen efter de första dagarna.
- **Affischerna innehåller adressen:** en utskriven affisch pekar för alltid på adressen som stod i QR-bilden. Flyttas spelet efter utskrift fungerar affischerna bara om den gamla adressen finns kvar (ett projekt som ligger kvar eller en omdirigering). Skriv inte ut före flytten.
- **Koder och PIN finns bara hos dig:** koderna i klartext (`koder.csv`) och personalens PIN (`kupong-pin.txt`) skickades till dig och finns inte i repot (där ligger bara kontrollsummor). Spara dem: förloras de går affischerna inte att återskapa.
- **Kupongen utan belopp och butik:** den som skannar får en kupong som säger "be om julgransrabatten". Tills ni bestämt vem som ger den och hur stor den är kan personalen inte veta vad de ska göra: bestäm det före utskrift.
- **Kalendern och spelet delar adress:** belöningarna läser kalenderns baslinje. Rensar spelaren webbläsarens lagring försvinner både framstegen och kalenderns läge.

## 13. Huvudspåret och dagens julklappsjakt (2.21.1-xmas.13, byggt)

Användarens önskan 2026-11-25: Termosjakten tillbaka som huvudspåret, *TempoRush som man kan spela obegränsat varje dag*, och *en daglig julklappsjakt där QR-koder och erbjudanden kan gömmas*. Förlagan till julmarknaden är *Vinter i Solstaden* på Stora torget (julmarknad, foodtrucks, scenprogram och insamling), bara som inspiration (`KARLSTAD-JUL-2026.md`).

**Beslut (fattade i bygget, går att ändra i konfigurationen):**

- **Termosjakten = JulRushens maraton med termosar** (`xmas-termos.mjs`). Samma motor och samma svårighet som Maraton (som ställdes in med `difficulty.mjs` i xmas.4), egna rekord. Varför inte en egen motor: Maraton är redan inställd och provad, och två motorer betyder två saker att hålla i ordning. JulRushens tolv rusher finns kvar som de är.
- **Varför man spelar igen samma dag:** dagens mål (ett per datum, samma för alla, 60 XP och en prydnad en gång), dagens fem bästa rundor, rekordet, tempostämpeln och insamlingen. Ingen gräns för antalet rundor, och XP per runda är som Maraton (termosar och tempo), så det går inte att samla lotter snabbare än förut: lotterna kommer som förut av mätaren med sitt dagliga tak.
- **Insamlingen** är ett räkneverk för spelarens egna termosar, inte en verklig insamling: inga pengar, ingen organisation, ingen gemensam summa för alla spelare (den skulle kräva molnlagring, se avsnitt 10). Vill arrangören koppla spelet till en verklig insamling krävs ett avtal och en egen text, och då ska namnet stå i konfigurationen, inte i koden.
- **Dagens julklappsjakt** (`xmas-daily.mjs`): sju områden, en plats per dag ur grundspelets kontrollerade termosplatser, gåta → varmt/glödhett → områdets namn (100 s) → pil till området (220 s). Pilen leder aldrig ända fram: det ska vara en jakt. Belöningen ges en gång per dag och räknas som en klarad dag i serien.
- **Erbjudanden och QR i den dagliga jakten** läggs in per datum i `xmas-daily-config.mjs` (`DAILY_HUNTS`: `coupon`, `qr`, `area`, `spot`, `xp`, `orn`, `tickets`, `note`). En kupong delas ut en gång per spelare (samma regel som QR-koderna). QR-raden säger var en affisch hänger i verkligheten; själva koden står aldrig i bygget. **Inga erbjudanden ligger i schemat nu**: julgransrabatten delas bara ut av de tolva QR-koderna, som beslutades 2026-11-24.
- **Ljuset efter klockan:** julmarknaden och Termosjakten ser bäst ut i mörker, och i december är det mörkt från halv fyra i Karlstad. Spelaren kan välja fast dag, skymning eller kväll i pausmenyn.

**Inte provat med människor:** om dagsmålen är lagom svåra (de är satta efter bedömning och en enda botrunda, inte provade med `difficulty.mjs`), om gåtorna är för lätta eller för svåra och om 100 s och 220 s är rätt tider för hjälpen. Ändra i `DAILY_GOALS` och `DAILY`.

## 14. O'Learys, Platsjakten, julguiden och staden (2.21.1-xmas.14, byggt)

**Beslut (går att ändra i data/konfiguration):**

- **O'Learys är en lokal, inte en meny.** Man går in genom dörren på torget och går fram till stationerna; varje aktivitet är ett kort spel med fingerdrag (en slangbella), så att det fungerar på telefon. Femkampen är "samma kväll, fem grenar" och ger ett eget rekord. Färger och ton: mörk grön/svart, guld och vitt, sportbar.
- **FBK-tipset ger aldrig något som kan likna spel om pengar:** inga insatser, inga priser, inga XP och inga lotter, bara tipspoäng i spelet. Matchtider kan ändras (en källa anger en annan tid för 5 december); `result` fylls i efter matcherna.
- **Platsjakten** ska få folk att lära sig staden: bilden är tagen i spelet, inte ett foto, och tiden räcker om man vet vart man ska. Inga tappade julklappar under jakten (de förvirrar uppdraget). En ny plats för varje jakt, aldrig någon av de fyra senaste (xmas.15); belöning en gång per plats och dag, högst tre om dagen, och man kan springa om på tid hur många gånger man vill. En kampanj (period, plats, kupong, QR) läggs in i `CONTESTS` när någon står bakom ett erbjudande.
- **Julguiden** visar verkliga julbord och julmarknader med pris och källa, och säger att det inte finns något samarbete. Rabatt via QR-kod (fälten `coupon`/`qr`) kopplas på först när ett ställe vill vara med.
- **Byggnaderna:** de få byggnader man orienterar sig efter (Rådhuset, Domkyrkans spira, Fredsmonumentet) byggs som geometri efter skrivna källor. Utan bilder eller källor gissar spelet inte fram fasader på vanliga hus.

**Inte provat med människor:** om Platsjaktens tider och ledtrådar är lagom, om spelen hos O'Learys är lagom svåra med fingret, och om karlstadsbor känner igen sig. Mät gärna det sista med Platsjakten (hur fort hittar man Rådhuset och Domkyrkan?).
