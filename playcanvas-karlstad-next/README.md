# Karlstad City — Staden jagar dig (Gameplay 2.2)

The active game remains `playcanvas-karlstad-next/`, using PlayCanvas 2.22.4 and the existing city, collisions, music and movement speeds.

## Controls

- Left stick / WASD moves and strafes. Right-side swipes / mouse turn freely through 360°. Camera steering toward targets has been removed.
- Mobile touch sensitivity is independent of the desktop mouse. PAUS offers sensitivity and a choice of relative swipes or a continuous right stick. The 180° button turns on the spot. Desktop left/right arrows also rotate without moving.
- SOLSTÖT fires immediately; holding repeats ordinary shots. Left and right fire buttons allow different thumb layouts. SUPER / Q / right click fires a stronger shot costing 40 energy. Holding never selects super.
- SIKTHJÄLP adjusts the hit margin only. It cannot rotate the camera.
- M / KARTA pauses and opens the map. Blur, visibility loss and menus clear movement, look and firing state.

## Stadsjakten: the new city loop

The opening brief gives one goal: **earn 800 XP, then reach any green safe zone before the three-minute clock or health runs out**. A successful escape adds a remaining-time score bonus, a personal best and a friend-challenge link. Optional free exploration has no timer. Failed hunts can be retried; coffee points, secrets and postcard discoveries remain saved. Starting a new hunt respawns ordinary thermoses.

The city now has **48 spaced-out thermoses**, down from 135, and three rotating short events:

- Pick up a coffee bag and carry it to a second nearby marker within 32 seconds: 180 XP.
- Reach a temporary solar glint within 16 seconds: 100 XP.
- Stop up to three coffee thieves within 24 seconds: 180 XP.

Completed street events add 25 solar energy and eight seconds. A new opportunity follows after a short break. The first event begins after two seconds; pursuit begins after six seconds. Enemies approach from the rear/side using the existing navigation grid. Pressure increases gradually, with at most six director-controlled enemies and the existing 12-actor render pool. Old hideout ambushes and five secrets remain.

City basic shots cost 3 energy; SUPER costs 40. At zero energy a weak emergency shot remains available. The recharge button / C converts 25 coffee points into 40 energy. Coffee points are a persistent spendable balance; hunt XP is the score earned this run and is not reduced by spending. Special missions pause the city hunt and award 150 XP, or 250 for Sandgrund. Practice cannot change banked resources.

## One-hand mobile controls

New mobile sessions default to **one thumb**: the main stick's vertical axis walks forward/backward and its horizontal axis turns continuously in place. Walking speed, collision radius, gravity and the existing movement curve remain unchanged. The sensitivity setting also affects thumb turning. Releasing/cancelling the pointer stops the input.

Auto fire triggers only when an enemy is in the reticle and visible. It never rotates the camera. At O’Learys it also waits for a good push angle. If energy is exhausted, auto fire can buy a refill for 25 coffee points; this is explained in the controls. SUPER remains optional. The crowded manual buttons are hidden in this mode, leaving the stick, SUPER and the contextual mission/bus button. The radar still opens the map.

PAUS switches between one-hand and the existing two-hand controls. Desktop WASD/mouse/manual fire remain available. Choices are saved on the browser.

## Zombie-bussen / Linje 666

Board at Torget, Domkyrkan or Sandgrund. The contextual button changes to **KLIV PÅ BUSSEN** within reach. The trip lasts 30 seconds and follows a collision-checked route through the existing 3D city. Move passenger weight with one horizontal finger drag, or A/D / arrow keys, to counter the zombie driver's swerves and keep the balance marker green.

A successful trip awards 200–350 XP and moves the player to the destination. A crash returns to the departure stop with 20 health lost, preserving at least 25 health; the hunt continues. The hunt clock advances during transit. Bus pause, backgrounding and focus loss freeze both clocks. City combat, route markers, collectibles and their view updates are suspended during the ride. There is no second engine or extra 3D city.

## Postcards and performance

The three user-provided comic photographs are collectibles near Domkyrkan, the north promenade and the western street route. A first discovery awards 100 XP and eight seconds. PAUS → MINA VYKORT displays unlocked originals. JPEG requests start only when the paused album is opened, with native lazy loading and asynchronous decoding. They are not WebGL textures, preload requests, or part of the walking frame loop. Original images and their visible watermarks are preserved.

The bright palette, original comic facades, Löfbergs thermoses and concept kiosks for Löfbergs, Karlstads Energi and NWT remain. These are proposed sponsor placements; there are no claimed commercial agreements. The creative roadmap in `/GAMEPLAY_ROADMAP.md` is retained.

## Missions

All four missions can be selected immediately; a successful result also offers the next mission.

1. **Sista rundan — O’Learys:** existing 90-second knockback challenge, three fans and Captain Overtime. Green direction arrow and stand marker help with flanking.
2. **Fikapanik — Stora Torget:** 6 + 8 + 10 zombies in three waves, 150 seconds. Walkers, runners and tanks pursue the player. Solar shots damage and knock them back; chained hits and fast consecutive eliminations score bonuses. Between waves: three-second break, health and energy.
3. **Rädda fikat — Torget to Mitt i City:** collect three thermoses and deliver outside the existing mall within 180 seconds. Twelve zombies guard the pickups and route. Gold ground markers and the radar show a walkable route.
4. **Vernissage från graven — Sandgrund:** a fictional cartoon Zombie-Lerin pursues three visitors outside the existing museum. Approach visitors to recruit them, escort them to the green safe area and defeat the 12-HP artist. Three additional zombies interfere; the timer is 180 seconds. The museum is now guaranteed within the existing 95-building budget.

Action missions have 100 health, damage cooldowns and loss/retry. Practice removes the clock and cannot set records or create score challenges. Each mission has its own local record and completion badge. Sharing preserves the mission, seed and target score; there is no online leaderboard.

## Performance and verification

City action reuses a 12-zombie render pool, 18 nearby thermos sprites, cached illustrated textures, six pooled hit labels and a fixed grid derived from the existing collision boxes. Inactive actors do not render. The route and HUD update at a reduced rate. Navigation distinguishes grid node IDs from mission object IDs, including moving visitors and the artist.

`node --test playcanvas-karlstad-next/tests/*.test.mjs` runs 41 tests covering rotation, pointer ownership, pause/cancel, navigation, wave victory, pursuit/damage, delivery, clocks, original knockback rules, collection/persistence, point spending, ambushes, recovery, Sandgrund victory escorting around obstacles, timed hunt completion/capture, event expiry and rewards, postcard persistence, one-thumb intent, bus success/crash and 30/120 FPS consistency. Read-only diagnostics: `window.KarlstadRound.snapshot()` and `window.KarlstadCoreLock`.

The real PlayCanvas 2.22.4 engine was also exercised headlessly with the city's actual building data: all four selectors, complete Fikapanik waves, delivery, a complete Sandgrund boss/escort victory, city pickups, resource carryover, saved progress, return location and isolated practice. The integration run also completes the new street delivery, an actual bus route to Sandgrund with pointer balancing, bus pause/resume/crash, one-thumb turning/walking/cancellation, auto fire without camera rotation, an 800-XP escape and the lazy-loaded postcard album. The Sandgrund walking route spans 166 grid nodes. These API tests use NullGraphicsDevice, not a GPU.

Control reference: [Activision’s official COD Mobile control guide](https://blog.activision.com/call-of-duty/2019-10/Getting-a-Grip-on-the-Call-of-Duty-Mobile-Controls): left movement stick, right-side relative look, separate weapon buttons and sensitivity settings.

Deployment uses the existing GitHub Pages workflow. Physical iPhone and GPU rendering checks remain necessary; Node engine tests do not replace those checks.
