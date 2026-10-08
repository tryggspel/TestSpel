# Julklappsjakten – 2.21-XMS (julgrenen)

Julversionen är ett **fristående bygge av samma spel**, inte en kopia av spelmappen. Den bor på en egen Git-gren, byggs av ett eget
Vercel-projekt och har en egen adress. Grundspelet fortsätter på `main` med sitt eget Vercel-projekt och sin egen adress.

## Utgångsläge (dokumenterat före arbetet)

| Vad | Värde |
|---|---|
| Repository | `tryggspel/TestSpel`, spelkatalog `playcanvas-karlstad-2.11/` (trots versionsnumret 2.x) |
| Senast verifierade version enligt uppdraget | 2.20.0, commit `fdf675a8cc03da8dbc3c35877225cd90e95203ca` |
| `main` när arbetet började | **2.21.1**, commit `fadc36ad65078401e1a751c9236c1577d1bc5de8` (nyare förbättringar bevarade: butiksuppdrag och Karlstadpasset 2.21.0–2.21.1) |
| Julversionen bygger på | `fadc36ad65078401e1a751c9236c1577d1bc5de8` |
| Befintligt Vercel-projekt | `karlstad-city-visual-twin` (`prj_VsGY8BEV27Zr0CGIqpBxBWkRpyoY`), team `kmauritz-7561` (`team_R8VGNJRdhhNZtekaQs1aoVVp`), följer `main` |
| Grundspelets produktionsadress | https://karlstad-city-visual-twin.vercel.app/ |
| Återställningspunkt (gren) | `backup/jul-2026-baseline-2.21.1-fadc36a` = `fadc36ad65078401e1a751c9236c1577d1bc5de8` |
| Git-tagg | `jul-2026-baseline-2.21.1` finns lokalt men **kunde inte pushas**: fjärren svarar HTTP 403 på alla tagg-pushar från den här miljön. Skapa den själv: `git tag -a jul-2026-baseline-2.21.1 fadc36a && git push origin jul-2026-baseline-2.21.1` (eller via GitHub → Releases → Draft a new release). |

## Grenar och versioner

| Gren | Syfte | Vercel |
|---|---|---|
| `main` | Grundspelet (2.21.x). Får bara julknappen och navigeringen som behövs. | `karlstad-city-visual-twin`, produktion |
| `release/jul-2026` | Julversionen. Det som ligger här är det som publiceras som julspelet. | Julprojektet, produktionsgren |
| `claude/stoic-tesla-59znyc` | Utvecklingsgren för julversionen. Varje push ger en förhandsvisning. Flyttas fram till `release/jul-2026` när den är verifierad. | Förhandsvisningar |

Julversionens ändringar slås **inte** ihop med `main`. Förbättringar i grundspelet förs över till julgrenen med granskade Git-ändringar
(`git switch release/jul-2026 && git merge main`, lös konflikter i de få filer som julgrenen rör, kör testerna).

Versionsbeteckning: `X.Y.Z-xmas.N`, där `X.Y.Z` är basversionen på `main` och `N` räknar julbyggen (`2.21.1-xmas.1`). Det synliga namnet är
**Julklappsjakten – 2.21-XMS**. `node tools/set-version.mjs 2.21.1-xmas.2` sätter en enda cache-nyckel i alla moduler, HTML och CSS
(testet `version.test.mjs` och CI kräver att den är densamma överallt). Bygget visar versionen och det deployade commit-ID:t
(från `/api/build-info`); öppna `/api/build-info` på adressen för att se exakt vilket commit som körs.

## Sammanhängande bygge

- Inga imports till andra spelversioner, ingen kod hämtas från grundspelets adress, ingen service worker (testas i `tests/xmas-build.test.mjs`).
- Alla moduler och resurser har samma cache-nyckel. Ljudfiler har innehållshash i filnamnet.
- Spelmotorn (PlayCanvas 2.22.4) hämtas från jsDelivr med fast version, som i grundspelet.

## Vercel-projektet för julversionen

Projektet kunde **inte skapas av Claude** i den session som byggde julversionen: Vercel-anslutningen hade ingen behörighet på teamets
scope (HTTP 403 vid `create_project`). Skapa det så här (några minuter):

1. Vercel → *Add New… → Project* → importera `tryggspel/TestSpel` i teamet `kmauritz-7561`.
2. Projektnamn `karlstad-julklappsjakten` (adressen blir https://karlstad-julklappsjakten.vercel.app/ om namnet är ledigt).
3. *Root Directory*: `playcanvas-karlstad-2.11`. *Framework Preset*: Other. Inget build-kommando, ingen output-katalog.
4. *Settings → Environments → Production → Branch Tracking*: `release/jul-2026`.
5. *Settings → Deployment Protection → Vercel Authentication*: samma som grundspelet (Standard Protection, `all_except_custom_domains`), så att produktionsadressen är öppen och förhandsvisningar kräver inloggning.
6. *Settings → Environment Variables → Automatically expose System Environment Variables*: på (standard), så att `/api/build-info` kan visa commit-ID.
7. Kontrollera att `https://<adressen>/api/build-info` visar `"branch":"release/jul-2026"` och rätt commit.

## Julknappen i grundspelet

Se avsnittet *Julknappen* nedan när den är kopplad.
