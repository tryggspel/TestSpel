# Karlstad City — Kaffejakten (Gameplay 2.1)

The active game remains `playcanvas-karlstad-next/`, using PlayCanvas 2.22.4 and the existing city, collisions, music and movement speeds.

## Controls

- Left stick / WASD moves and strafes. Right-side swipes / mouse turn freely through 360°. Camera steering toward targets has been removed.
- Mobile touch sensitivity is independent of the desktop mouse. PAUS offers sensitivity and a choice of relative swipes or a continuous right stick. The 180° button turns on the spot. Desktop left/right arrows also rotate without moving.
- SOLSTÖT fires immediately; holding repeats ordinary shots. Left and right fire buttons allow different thumb layouts. SUPER / Q / right click fires a stronger shot costing 40 energy. Holding never selects super.
- SIKTHJÄLP adjusts the hit margin only. It cannot rotate the camera.
- M / KARTA pauses and opens the map. Blur, visibility loss and menus clear movement, look and firing state.

## Exploration between missions

The game opens directly into a playable city. Follow purple Löfbergs thermoses through the existing streets: **135 collectibles**, each worth 25 coffee points and 15 solar energy. Collect five within six seconds of each other for a 25-point bonus. Five hidden gold thermoses award 200 points and restore health and energy.

City basic shots consume 3 energy; SUPER costs 40. At zero energy a weaker emergency shot remains available. The purple recharge button / C converts 25 coffee points into 40 energy, including during timed missions. Defeating an ambush awards 30 points; completing a special mission awards 150, or 250 for Sandgrund. Energy carries into and back out of missions. Practice cannot spend or earn banked resources.

Zombies emerge from marked paper piles outside the player's forward view, after a brief rustle. Encounters are spaced at least 18 seconds apart, use the existing bounded actor pool and can be cleared permanently. Defeat returns the player to Torget, deducting up to 25 points while retaining discoveries.

Mission portals, a gold ground route, compass and radar support walking to the next special game. The menu also keeps instant mission starts. Local progress (points, energy, health, discoveries, cleared hideouts, position, facing and destination) is saved on this browser; no account or cloud sync is involved.

The city adds original illustrated facades, a brighter palette, comic thermoses and concept kiosks for Löfbergs, Karlstads Energi and NWT. These are proposed sponsor placements, with no claimed commercial agreements. Existing signs, music and controls remain in place.

## Missions

All four missions can be selected immediately; a successful result also offers the next mission.

1. **Sista rundan — O’Learys:** existing 90-second knockback challenge, three fans and Captain Overtime. Green direction arrow and stand marker help with flanking.
2. **Fikapanik — Stora Torget:** 6 + 8 + 10 zombies in three waves, 150 seconds. Walkers, runners and tanks pursue the player. Solar shots damage and knock them back; chained hits and fast consecutive eliminations score bonuses. Between waves: three-second break, health and energy.
3. **Rädda fikat — Torget to Mitt i City:** collect three thermoses and deliver outside the existing mall within 180 seconds. Twelve zombies guard the pickups and route. Gold ground markers and the radar show a walkable route.
4. **Vernissage från graven — Sandgrund:** a fictional cartoon Zombie-Lerin pursues three visitors outside the existing museum. Approach visitors to recruit them, escort them to the green safe area and defeat the 12-HP artist. Three additional zombies interfere; the timer is 180 seconds. The museum is now guaranteed within the existing 95-building budget.

Action missions have 100 health, damage cooldowns and loss/retry. Practice removes the clock and cannot set records or create score challenges. Each mission has its own local record and completion badge. Sharing preserves the mission, seed and target score; there is no online leaderboard.

## Performance and verification

City action reuses a 12-zombie render pool, 18 nearby thermos sprites, cached illustrated textures, six pooled hit labels and a fixed grid derived from the existing collision boxes. Inactive actors do not render. The route and HUD update at a reduced rate. Navigation distinguishes grid node IDs from mission object IDs, including moving visitors and the artist.

`node --test playcanvas-karlstad-next/tests/*.test.mjs` runs 30 tests covering rotation, pointer ownership, pause/cancel, navigation, wave victory, pursuit/damage, delivery, clocks, original knockback rules, collection/persistence, point spending, ambushes, recovery, Sandgrund victory and escorting around obstacles. Read-only diagnostics: `window.KarlstadRound.snapshot()` and `window.KarlstadCoreLock`.

The real PlayCanvas 2.22.4 engine was also exercised headlessly with the city's actual building data: all four selectors, complete Fikapanik waves, delivery, a complete Sandgrund boss/escort victory, city pickups, resource carryover, saved progress, return location and isolated practice. The Sandgrund route spans 166 walkable grid nodes. These API tests use NullGraphicsDevice, not a GPU.

Control reference: [Activision’s official COD Mobile control guide](https://blog.activision.com/call-of-duty/2019-10/Getting-a-Grip-on-the-Call-of-Duty-Mobile-Controls): left movement stick, right-side relative look, separate weapon buttons and sensitivity settings.

Deployment uses the existing GitHub Pages workflow. Physical iPhone and GPU rendering checks remain necessary; Node engine tests do not replace those checks.
