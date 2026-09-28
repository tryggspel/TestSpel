# Karlstad City — Efter stängning (Gameplay 2.0)

The active game remains `playcanvas-karlstad-next/`, using PlayCanvas 2.22.4 and the existing city, collisions, music and movement speeds.

## Controls

- Left stick / WASD moves and strafes. Right-side swipes / mouse turn freely through 360°. Camera steering toward targets has been removed.
- Mobile touch sensitivity is independent of the desktop mouse. PAUS offers sensitivity and a choice of relative swipes or a continuous right stick. The 180° button turns on the spot. Desktop left/right arrows also rotate without moving.
- SOLSTÖT fires immediately; holding repeats ordinary shots. Left and right fire buttons allow different thumb layouts. SUPER / Q / right click fires a stronger shot costing 40 energy. Holding never selects super.
- SIKTHJÄLP adjusts the hit margin only. It cannot rotate the camera.
- M / KARTA pauses and opens the map. Blur, visibility loss and menus clear movement, look and firing state.

## Missions

All three missions can be selected immediately; a successful result also offers the next mission.

1. **Sista rundan — O’Learys:** existing 90-second knockback challenge, three fans and Captain Overtime. Green direction arrow and stand marker help with flanking.
2. **Fikapanik — Stora Torget:** 6 + 8 + 10 zombies in three waves, 150 seconds. Walkers, runners and tanks pursue the player. Solar shots damage and knock them back; chained hits and fast consecutive eliminations score bonuses. Between waves: three-second break, health and energy.
3. **Rädda fikat — Torget to Mitt i City:** collect three thermoses and deliver outside the existing mall within 180 seconds. Twelve zombies guard the pickups and route. Gold ground markers and the radar show a walkable route.

Action missions have 100 health, damage cooldowns and loss/retry. Practice removes the clock and cannot set records or create score challenges. Each mission has its own local record and completion badge. Sharing preserves the mission, seed and target score; there is no online leaderboard.

## Performance and verification

City action reuses a 12-zombie render pool, cached illustrated textures, six pooled hit labels and a fixed grid derived from the existing collision boxes. Inactive actors do not render. The route and HUD update at a reduced rate.

`node --test playcanvas-karlstad-next/tests/*.test.mjs` covers rotation, pointer ownership, pause/cancel, navigation, wave victory, pursuit/damage, delivery, clocks and original knockback rules. Read-only diagnostics: `window.KarlstadRound.snapshot()` and `window.KarlstadCoreLock`.

Control reference: [Activision’s official COD Mobile control guide](https://blog.activision.com/call-of-duty/2019-10/Getting-a-Grip-on-the-Call-of-Duty-Mobile-Controls): left movement stick, right-side relative look, separate weapon buttons and sensitivity settings.

Deployment uses the existing GitHub Pages workflow. Physical iPhone and GPU rendering checks remain necessary; Node engine tests do not replace those checks.
