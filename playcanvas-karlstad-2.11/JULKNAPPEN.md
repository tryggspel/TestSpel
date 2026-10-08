# Julknappen i grundspelet (2.21.2)

Grundspelet har en knapp **JULKLAPPSJAKTEN 🎁** i startmenyn, direkt under TempoRush. Den öppnar julversionen (en egen spelversion med egen adress,
byggd från branchen `release/jul-2026`) **i samma flik**. Ingen iframe och ingen andra spelmotor: knappen är en vanlig navigering. Julversionen har en
knapp **← Tillbaka till Karlstad-spelet** som leder hit igen.

Ändringen i grundspelet är bara knappen och navigeringen: `julknapp.mjs` (inställning och adresskontroll), tre rader i `last-round.js`, knappen i `index.html`
och några rader CSS. Inga spelregler, inga sparfiler och ingen karta är ändrade.

## Läge just nu

Knappen är **förberedd men avstängd** (`enabled:false` i `julknapp.mjs`) och syns därför inte för spelarna. Julversionens stabila adress är
**förifylld**: https://karlstad-julklappsjakten.vercel.app/ (Vercel-projektet `karlstad-julklappsjakten`, produktion, byggd från `release/jul-2026`).
Adressen är kontrollerad mot Vercels API (deployen är klar, rätt commit och gren) men har inte öppnats på någon enhet av den som byggde den (se `JULVERSION.md`
på branchen `release/jul-2026`). Därför är knappen fortfarande avstängd.

## Koppla in

1. Öppna https://karlstad-julklappsjakten.vercel.app/ på riktiga enheter (iPhone 11/Safari, MacBook Air 2018): kontrollera att rätt spel startar, att version och commit
   längst ned i startvyn stämmer med `release/jul-2026`, att `/api/build-info` visar `release/jul-2026`, och att knappen Tillbaka leder hit.
2. I `julknapp.mjs`: sätt `enabled` till `true` (adressen finns redan).
3. `node tools/set-version.mjs 2.21.3`, `node --test tests/*.mjs` (testet som kräver `enabled:false` byts mot ett som kräver `enabled:true`), förhandsvisa på Vercel,
   kontrollera att knappen syns och leder rätt, slå ihop till `main`.

## Stäng av knappen igen (utan att röra något annat)

Sätt `enabled:false` i `julknapp.mjs` (eller töm `url`). Knappen göms helt vid nästa publicering. Det går också att återställa hela ändringen med
`git revert <commit>` på den commit som kopplade in knappen.

## Återställningspunkt

Grundspelet före julknappen: commit `fadc36ad65078401e1a751c9236c1577d1bc5de8` (version 2.21.1, `main`). Backup-gren: `backup/jul-2026-baseline-2.21.1-fadc36a`.

## Provkörning lokalt

Med `?debug&julknapp=http://localhost:PORT/` på localhost visas knappen och leder till den lokala julversionen (fungerar bara på localhost med `?debug`).
