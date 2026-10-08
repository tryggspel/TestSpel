# Julknappen i grundspelet (2.21.2)

Grundspelet har en knapp **JULKLAPPSJAKTEN 🎁** i startmenyn, direkt under TempoRush. Den öppnar julversionen (en egen spelversion med egen adress,
byggd från branchen `release/jul-2026`) **i samma flik**. Ingen iframe och ingen andra spelmotor: knappen är en vanlig navigering. Julversionen har en
knapp **← Tillbaka till Karlstad-spelet** som leder hit igen.

Ändringen i grundspelet är bara knappen och navigeringen: `julknapp.mjs` (inställning och adresskontroll), tre rader i `last-round.js`, knappen i `index.html`
och några rader CSS. Inga spelregler, inga sparfiler och ingen karta är ändrade.

## Läge just nu

Knappen är **förberedd men avstängd** (`enabled:false` i `julknapp.mjs`) och syns därför inte för spelarna. Den kopplas in först när julversionens
stabila adress är verifierad (se `JULVERSION.md` på branchen `release/jul-2026`).

## Koppla in

1. Kontrollera att julversionens produktionsadress öppnar rätt spel och visar rätt version och commit (längst ned i startvyn).
2. I `julknapp.mjs`: sätt `url` till adressen (https, utan användaruppgifter) och `enabled` till `true`.
3. `node --test tests/*.mjs`, förhandsvisa på Vercel, kontrollera att knappen syns och leder rätt, slå ihop till `main`.

## Stäng av knappen igen (utan att röra något annat)

Sätt `enabled:false` i `julknapp.mjs` (eller töm `url`). Knappen göms helt vid nästa publicering. Det går också att återställa hela ändringen med
`git revert <commit>` på den commit som kopplade in knappen.

## Återställningspunkt

Grundspelet före julknappen: commit `fadc36ad65078401e1a751c9236c1577d1bc5de8` (version 2.21.1, `main`). Backup-gren: `backup/jul-2026-baseline-2.21.1-fadc36a`.

## Provkörning lokalt

Med `?debug&julknapp=http://localhost:PORT/` på localhost visas knappen och leder till den lokala julversionen (fungerar bara på localhost med `?debug`).
