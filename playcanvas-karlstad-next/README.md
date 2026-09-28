# Karlstad City — Sista rundan (Gameplay 1.8)

This is an additive gameplay pass for the active `playcanvas-karlstad-next/` game. Root navigation, PlayCanvas 2.22.4, the city data, Landmark Storefront 1.7 and Core Lock 1.3 movement constants are retained.

## Play

Choose **Nu stänger vi** to start the 90-second O’Learys challenge, or explore the existing city and speak to the guard with **E / PRATA**.

- WASD + mouse; Shift to sprint and Space to jump. Mobile retains the existing joystick and look area.
- Click/tap and release **SOLSTÖT** for a free shot. Hold at least 0.38 seconds and release for a stronger shot costing 40 solar energy.
- Push three fans into the yellow **HEMGÅNG** circle, then send Captain Overtime home. The bin transfers impulses and earns chain bonuses.
- Solar pads restore 35 energy and recharge after 12 seconds. Basic shots never need energy.
- Escape / PAUS pauses the round. M / KARTA opens a real local map and pauses active play. Losing focus also pauses and clears touch/keyboard input.
- Results show accuracy, best chain and score; retry resets the same round. A winning result can share `?challenge=sista-rundan&seed=280926&target=SCORE`.
- Records are local to the browser and seed. This is not an online leaderboard or a server-verified competition.

## Files and checks

`last-round-rules.mjs` owns deterministic spawns, impulses, line-of-sight, chain scoring, progress and the round clock. `last-round.js` adds the illustrated characters, signs, UI and audio to the existing PlayCanvas scene. `last-round.css` styles the overlay without changing core control dimensions.

Run `node --test playcanvas-karlstad-next/tests/last-round.test.mjs` from the repository root. Tests cover complete victory, timeout, replay, pause, charge use, blocked shots, chains and frame-rate behavior.

Read-only diagnostics: `window.KarlstadRound.snapshot()` and `window.KarlstadCoreLock`. No engine switch, old prototype edits, backend or additional build tool is required. GitHub Pages uses the existing deploy workflow.
