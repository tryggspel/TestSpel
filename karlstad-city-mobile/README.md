# Karlstad City V34 — Playable Core

V34 is a gameplay-first rebuild for iPhone and desktop.

## What was wrong
The V33 scene became too expensive on iPhone and the HUD had too many overlapping controls. The joystick movement also injected large per-frame camera movement, which made collisions feel jerky.

## V34 movement
- New joystick dead-zone and acceleration/deceleration smoothing.
- Movement speed is substantially reduced from the old raw camera-direction injection.
- Full joystick throw automatically enables sprint on touch.
- The separate RUN button is hidden on touch so the left thumb area stays clear.
- Starting manual joystick movement cancels Auto Tour immediately.

## V34 mobile HUD
- Joystick gets a dedicated bottom-left zone above every other layer.
- Quick-travel buttons are hidden during normal touch play.
- The top navigation is reduced to the important controls.
- Zombie-only FIRE/AIM/RELOAD buttons are completely hidden in city mode.
- Expanded map stays on the right side instead of covering the centre of play.

## V34 performance
- iPhone/iPad uses the stable WebGL path instead of attempting WebGPU.
- Mobile shadow map reduced from 1536 to 512.
- Bloom disabled on touch; FXAA and a light sharpen remain.
- Generic building detail budgets are reduced on mobile while hero landmarks remain.
- Mobile tree count is reduced.
- Imported NPC/car/bus meshes use cheap contact shadows on touch instead of dynamic shadow casting.
- Balanced quality is adaptive: it starts around 1.18 hardware scaling and moves toward smoother or sharper rendering based on measured FPS.
- Map redraw and spatial-audio updates are throttled.

## Navigation / map
- The minimap now falls back to the already-built real-city road/building geometry if the raw OSM snapshot is unavailable.
- Expanded map remains non-blocking.

## LED MIG / Auto Tour
- LED MIG now plays the city mission automatically.
- Auto Tour temporarily disables world collisions so the tour cannot get trapped on bollards, pedestrians or facade edges.
- It walks to Mira, follows the route to Mitt i City, enters to the Centervärd, collects the emergency radio and returns to Stora torget.
- Manual camera look still works during the tour.
- Touching the joystick stops the tour and returns control to the player.
- Normal collisions and gravity are restored when the tour stops.

## Engine direction
V34 intentionally stays on Babylon.js. The immediate problem was not the lack of a game engine; Babylon is already the web 3D engine driving the project. The next decision about Unity/Unreal should be made after this browser build has a stable, enjoyable core loop.

Public URL:
https://tryggspel.github.io/TestSpel/karlstad-city-mobile/


## V34.1 emergency gameplay fix
- Ground/road/sidewalk/paving/floor collisions no longer trigger `STÄNGT · GÅ RUNT`.
- Floor contact no longer increments anti-stuck or teleports the player, which caused the apparent freeze on Stora torget.
- Small street props and street-sign poles are non-blocking on touch devices.
- Building feedback is reserved for real building-like obstacles.
- Collision pushback is reduced to remove rubber-band movement.
