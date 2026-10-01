# Karlstad City — UI 2.7.4

## 2.7.4 — map destinations remain selectable in Dagens utmaning

- Fixes the disabled destination buttons shown during daily/friend challenges.
- Challenge mode still locks mission rerolls and manually chosen street events, preserving the shared challenge setup.
- Navigation is no longer treated as a challenge-changing action: Mitt i City, Domkyrkan, Sandgrund, O’Learys and the other quick destinations remain selectable from both the real map pins and the named buttons.
- After 800 XP, quick destinations still lock as intended so the green escape/safe-zone objective takes precedence.

# Karlstad City — UI 2.7.3

## 2.7.3 — real touch buttons on the map

- Replaced the Safari-sensitive canvas pointer hit testing from 2.7.2 with real HTML buttons positioned over every selectable map destination.
- Each pin now has a 48 × 48 CSS-pixel touch target with ordinary button click handling, while the canvas remains purely visual.
- The overlay travels with the responsive square map and works independently of the scrollable map panel.
- Destination selection still updates the same route, compass, radar and cyan ground arrows; the named buttons below the map remain as a second path.

# Karlstad City — Graphics 2.7.2

## 2.7.2 — tappable map destinations on mobile

- Landmark dots on the actual map canvas are now interactive, not just visual. Tap Mitt i City, Sandgrund, Domkyrkan, O’Learys, Stora Torget or another quick destination directly on the map.
- Interactive map pins use an approximately 48 px hit diameter on the 500 px canvas and a larger visible marker, while the named quick-destination buttons remain below the map as a fallback.
- Pointer movement greater than 14 CSS pixels is treated as scrolling rather than a selection, so vertical map-card scrolling does not accidentally choose a destination.
- Choosing a map pin still feeds the same destination into compass, radar and cyan ground arrows.

# Karlstad City — Graphics 2.7.1

## 2.7.1 — playable Mitt i City upper floor + city wayfinding

- **Playable two-level Mitt i City:** both escalators now drive the player's actual floor height. The upper shopping ring holds the player at 5.4 metres, descending the opposite escalator returns smoothly to ground level, and height-aware atrium rails only collide on the upper floor.
- **Map quick destinations:** Stora Torget, Mitt i City, Domkyrkan, Sandgrund, O’Learys, Värmlands museum, Duvan, Åhléns, Stadshotellet and Biblioteket are direct destination buttons. Choosing one feeds the same cached route to the map, compass, radar and cyan ground arrows.
- **Street wayfinding:** three low-cost signposts point toward the main destinations around Torget, Mitt i City and the northern Sandgrund route. They share the existing sign texture atlas and static city batch, so they add no per-frame logic or dynamic lights.
- **Cache correctness:** Journey now imports the current city-rush module under the 2.7.1 cache key, preventing an older 2.6 cached director from leaking into this release.

# Karlstad City — Staden jagar dig (Graphics 2.7)

## Graphics 2.7 — Mitt i City interior and a more recognisable Karlstad

- **Mitt i City is now enterable:** the sealed OSM collision shell is replaced by eight wall segments with four open entrances. A batched interior adds an atrium, upper shopping ring and two escalators without changing the 1.3.0 movement core.
- **More Karlstad landmarks:** Duvan, Åhléns, Elite Stadshotellet and Värmlands Museum receive simplified comic-style landmark masses and shared in-world signs. Sandgrundsudden gets a park, riverside paths, water edges and trees so the route north reads as a real district instead of empty ground.
- **Rare, short darkness:** blackout duration is capped at **4 seconds** and repeated blackouts are separated by at least **150 seconds**. Other Chaos Director events may still occur between them.
- **Performance rule:** the 2.7 expansion is two static draw calls (one vertex-colour city batch + one shared sign atlas). No new dynamic lights, shadows, actor pools or per-frame texture uploads are introduced.
- **Regression coverage:** eight 2.7 tests cover real-place data, Mitt i City entrance/collision behaviour and blackout timing, extending the 2.6 suite from 70 to 78 tests.

The new locations use the same Stora Torget projection as Graphics 2.6. The 2.7 coordinate anchors are based on the real central-Karlstad locations for Mitt i City, Duvan, Åhléns, Stadshotellet, Värmlands Museum and Sandgrundsudden; the meshes remain stylised game interpretations rather than survey-grade replicas.

The active game remains `playcanvas-karlstad-next/`, using PlayCanvas 2.22.4, the existing city data, music and movement speeds.

## Graphics 2.6 — recognisable Karlstad, real streets and shopfronts

- **Four guaranteed landmarks:** Rådhuset faces Stora Torget, Domkyrkan has a cruciform body and a west tower with clocks and a 41 m stylised spire, Stadsbiblioteket anchors Västra Torggatan, and Sandgrund has its white portico, long glazing and orange roof sign. Domkyrkan previously fell outside the distance-ranked building cap; the library was outside the ordinary radius. Both are now explicitly admitted **inside the unchanged 95-building budget**.
- **Real street geometry:** 82 OSM ways replace the invented straight crossroads and the promenade through the library. World paving, the map and radar share the same data. Building boxes now use the midpoint of their actual bounds, correcting the old vertex-average offset. The existing 3 m navigation grid extends to the cathedral and Drottninggatan without changing its alignment or movement physics.
- **Actual shop signs:** original O’Learys, Espresso House and Pressbyrån logos at five verified addresses. Signs attach to the corresponding OSM building and street-facing facade. O’Learys moves from the freestanding slab to Tingvallagatan 9; its existing outdoor game remains. The two Espresso House and two Pressbyrån locations are listed in [the sources and asset notes](art/GEOGRAPHY-SOURCES.md).
- **Visual orientation:** enamel street signs at major intersections, a small current-street label in the existing objective panel, named landmarks on the map, and selectable walking directions to Domkyrkan and the library. Optional chaos does not replace the chosen landmark. Earning the timed escape still takes precedence.
- **Comic continuity:** baked architectural drawings, arched windows, ink outlines, rooflines and coloured shop canopies use the existing palette. Shared texture assets stay small: the three original brand files total about 42 kB. Actual signs load once from the game's own host; text fallback remains if a logo cannot load.

The architectural mesh pass uses **six static draw calls** (streets, rooflines/shop frames and four landmarks), plus static facade/sign cards. The real-engine integration has **644 entities versus 752 in 2.5**. These are structural budgets, not physical-phone FPS measurements. No new shadow maps, dynamic lights, actor pools or per-frame texture uploads were added. Core 1.3.0 movement, camera input, one-thumb controls, speed and DPR limits are preserved.

**Validation:** 70 Node tests pass, including real OSM navigation to all four landmarks and five shop approaches, facade binding, correct street projection and destination persistence. The real PlayCanvas 2.22.4 integration passes full mission victories, bus/pause/crash, mobile movement, daily replay, map selection and HUD guidance against the corrected geometry. Architectural textures and the original logo files were separately rendered and visually inspected. The engine check uses NullGraphicsDevice; actual WebGL rendering and sustained iPhone 11 frame pacing remain unverified in this environment.

The changed map affects route distances and collectible paths. Daily/friend links and records therefore use **rules 3** so scores from the previous map are not silently mixed. Existing normal progression is retained.

## Gameplay 2.5 — one clear destination, inside bus 666, and interactive streets

- **One destination:** BYT MÅL opens the map with the active event, bus, sunlight and four mission destinations. Compass, ground arrows, map route and HUD use the same cached walkable path, including directions to turn or turn around. Manual mission choices survive optional events. The suggested escape and bus stop stay pinned; every marked safe zone still accepts a successful escape. Old competing yellow trails and the permanent mall objective column are removed, and distant signs are culled.
- **Inside bus 666:** a cached comic cabin frames the existing moving 3D city, with seats, windows, grab handles, wipers and local humour. One finger drags a visible steering wheel; A/D or arrow keys also work. Three passengers slide, tumble and recover; coffee flies and a pothole causes a collective fall. Steering corrects lateral drift, preserving the established route, 30-second trip and 200–350 XP reward. The camera tilts down only during transit so the road is visible through the windscreen. Walking/camera controls are unchanged.
- **Tänd Karlstad / Karlstads Energi:** reach and activate three separate power boxes in 55 seconds, while the city is dark. Restoring power awards 260 XP, reduces panic and briefly stops active zombies. Each box restores 12 solar energy; the final reward also receives the normal street completion bonus.
- **NWT: Extra! Extra!:** collect newspapers and complete two nearby deliveries in 45 seconds. Absurd news headlines accompany the stages. Completion awards 220 XP.
- **Zombiebowling:** move behind a shopping cart, aim and use the existing context button to kick it. The rolling cart uses the same navigation/collision and damage systems. Stop its marked zombies in 40 seconds for 220 XP; cart eliminations pay another 30 XP each. One-hand auto fire waits while within interaction range of the cart.
- **Comic city:** four shared original facade textures add bold cornices, window reflections, planters, striped awnings, illustrated shop displays and local jokes. Up to two accessible street faces on sixteen nearby buildings use these textures and distance culling. No new building colliders or large image downloads.

New stories join the automatic event rotation and can be selected in BYT MÅL during ordinary play. Daily/friend challenges keep deterministic event selection and disable manual rerolls. Challenge links and daily records use **rules 2**, so scores from the earlier rules are not silently mixed.

The bus paints its static cabin only on start/resize. Three passenger sprites update at most 30 times per second, only during transit, with a maximum 1000-pixel canvas dimension. Floor arrows reuse one mesh and a fixed 18-entity pool; gameplay retains the six-active-city-zombie cap. The real-city headless integration contains 752 entities versus 729 in 2.4; this is an entity count, not a device FPS measurement.

## Gameplay 2.4 — coffee risk, moving sunlight, daily challenges and result postcards

This release continues the existing game and ships four connected roadmap steps. The PlayCanvas movement core (1.3.0), camera controls, speed, city mesh budget and Safari zoom fixes are retained.

- **Kaffedoft:** each thermos adds 20 scent (more in the espresso daily). At 40%, zombies detect from 38 metres instead of 22; at 60%, new director enemies are runners; at 80%, side-street ambushes detect farther and trigger more frequently. At 100%, a 12-second coffee horde begins, then scent drops to at most 55. Scent fades after five seconds without coffee and much faster in sunlight. All sources share the six-active-city-zombie limit and the existing pool.
- **Sola över Karlstad:** a moving yellow field appears near the player after about 24 seconds, then recurs with a breather. Its path follows connected city navigation. Inside: +9 solar energy and +2 health per second, rapid scent removal and double zombie XP. Zombies in the field move at half speed. Follow it for six accumulated seconds for a one-time 100 XP bonus. The ordinary field lasts 18 seconds; the sun daily lasts 24. One flat translucent primitive and one cached sign represent the field. No dynamic light or shadow maps.
- **Dagens Karlstad:** one date-based seed and modifier set for everyone. The day switches at midnight in Europe/Stockholm. Four variants rotate: no SUPER, stronger coffee scent, panic/early blackout, and a 2:30 sunlight hunt. Every attempt starts at Torget with 100 health, 60 energy and 75 coffee points, all run discoveries reset. Existing save data is archived and protected even during autosaves or reload; finishing or leaving restores it. Special missions are unavailable during a shared city challenge, so a paused timer cannot be used to farm their rewards. Records and attempt counts are local to this browser, keyed by date and rule version. There is no global leaderboard or server score validation.
- **Challenge postcards:** an original 720×900 comic card is prepared on the result/pause screen with result, score, health, time and seed. City results and special missions generate cards automatically; bus arrival/crash remembers a card under PAUS → MITT SENASTE CHALLENGE-VYKORT. Native sharing attaches PNG + link when supported, otherwise shares/copies the link or exposes a selectable field. SPARA VYKORT exports PNG. No screenshot, remote image, canvas export or large image allocation runs in the walking loop. User cancellation does not force a fallback.

Daily links preserve their date when opened on another day. Normal city hunt links include bounded starting resources/discovery masks and the seed, replayed in an isolated challenge. Bus links open a dedicated 30-second replay from the original stop with retry, result card and friend target. Existing special-mission seed links still work. Links are tagged with rule version 1; unsupported versions show a clear fallback rather than pretending to replay the same rules.

Gameplay 2.3 fixes included: after 100% panic, the city gets a 12-second break from new chaos and actual sunlight; blackout uses paused gameplay time instead of wall-clock timers; the gold thermos now has a visible world marker; free exploration continues generating chaos after the fourth event.

## Controls

- Left stick / WASD moves and strafes. Right-side swipes / mouse turn freely through 360°. Camera steering toward targets has been removed.
- Mobile touch sensitivity is independent of the desktop mouse. PAUS offers sensitivity and a choice of relative swipes or a continuous right stick. The 180° button turns on the spot. Desktop left/right arrows also rotate without moving.
- SOLSTÖT fires immediately; holding repeats ordinary shots. Left and right fire buttons allow different thumb layouts. SUPER / Q / right click fires a stronger shot costing 40 energy. Holding never selects super.
- SIKTHJÄLP adjusts the hit margin only. It cannot rotate the camera.
- M / KARTA pauses and opens the map. Blur, visibility loss and menus clear movement, look and firing state.

## Stadsjakten: the new city loop

The opening brief gives one goal: **earn 800 XP, then reach any green safe zone before the three-minute clock or health runs out**. A successful escape adds a remaining-time score bonus, a personal best and a friend-challenge link. Optional free exploration has no timer. Failed hunts can be retried; coffee points, secrets and postcard discoveries remain saved. Starting a new hunt respawns ordinary thermoses.

The city now has **48 spaced-out thermoses**, down from 135, and six rotating short events (the three new stories above plus):

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

Board at Torget, Domkyrkan or Sandgrund. The contextual button changes to **KLIV PÅ BUSSEN** within reach. The trip lasts 30 seconds and follows a collision-checked route through the existing 3D city. Drag the steering wheel with one finger, or use A/D / arrow keys, to counter lateral drift and keep the course marker green. Zombies tumble around the illustrated cabin and recover between turns.

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

`node --test playcanvas-karlstad-next/tests/*.test.mjs` runs 70 tests covering rotation, pointer ownership, pause/cancel, navigation, wave victory, pursuit/damage, delivery, clocks, original knockback rules, collection/persistence, point spending, ambushes, recovery, Sandgrund victory escorting around obstacles, timed hunt completion/capture, event expiry and rewards, postcard persistence, one-thumb intent, bus success/crash and 30/120 FPS consistency. Read-only diagnostics: `window.KarlstadRound.snapshot()` and `window.KarlstadCoreLock`.

The real PlayCanvas 2.22.4 engine was also exercised headlessly with the city's actual building data: all four selectors, complete Fikapanik waves, delivery, a complete Sandgrund boss/escort victory, city pickups, resource carryover, saved progress, return location and isolated practice. The integration run also completes the new street delivery, an actual bus route to Sandgrund with pointer steering, bus pause/resume/crash, one-thumb turning/walking/cancellation, auto fire without camera rotation, an 800-XP escape and the lazy-loaded postcard album. The Sandgrund walking route spans 166 grid nodes. The 2.4 integration also plays a daily attempt through a real moving-sun route, follows the field for its bonus, completes escape, shares a PNG/dated-link payload and retries with restored resources. Archived daily links and standalone bus links are exercised through boot, pause, victory/crash, sharing and retry. These API tests use NullGraphicsDevice and mock DOM/share APIs, not a GPU or the physical iOS share sheet. The exported card drawing is separately rendered and visually inspected using a local canvas implementation. The 2.5 integration also verifies goal selection, wall-aware guidance, all three power switches and restored light, newspaper pickup/two deliveries, cart interaction/physical motion, and disabled daily rerolls through the actual UI handlers. The cabin, passengers and new facade drawings were rendered and visually inspected with a local canvas implementation.

Control reference: [Activision’s official COD Mobile control guide](https://blog.activision.com/call-of-duty/2019-10/Getting-a-Grip-on-the-Call-of-Duty-Mobile-Controls): left movement stick, right-side relative look, separate weapon buttons and sensitivity settings.

Deployment uses the existing GitHub Pages workflow. Physical iPhone and GPU rendering checks remain necessary; Node engine tests do not replace those checks.


## Gameplay 2.3 — Chaos Director + Karlstad Panik

The city layer now follows the creative roadmap instead of adding more collectibles. A lightweight Chaos Director can interrupt travel roughly every 20–45 seconds with small reusable events while preserving the existing movement/FPS core and actor pool.

Current chaos set:
- **Domkyrkan ringer:** bells pull extra zombies into the active route.
- **Blackout:** a short visual blackout plus extra pressure, implemented as a lightweight screen treatment rather than new heavy assets.
- **Guldtermos:** a short optional detour worth 160 XP, solar energy and extra hunt time.

The new **KARLSTAD PANIK 0–100%** meter rises from time, thermos pickups, shooting and completed events. Thresholds at 25/50/75% warn the player and increase city pressure. At 100%, **KARLSTAD HAR FALLIT** starts a short survival spike with repeated horde pressure. Surviving the spike partially resets panic instead of ending the run.

The director stays inside the existing six-active-enemy budget, reuses the navigation/actor pool, and does not alter the locked walking speed, collision radius, camera feel or render DPR policy.
