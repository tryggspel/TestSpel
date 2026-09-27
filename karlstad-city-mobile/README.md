# Karlstad City V28 — World Physics + Minimap

Public mobile-first browser prototype for iPhone and desktop.

## V28
- Hard player collisions are enabled for buildings and the ground.
- Cars, buses, NPCs and infected get dedicated collision proxies.
- Collision feedback gives a short physical push-back and a thud cue.
- A persistent local minimap is back, drawn from the bundled OpenStreetMap snapshot so it does not depend on live map tiles.
- The minimap follows the player and shows Stora torget, Mitt i City and O'Learys.
- Current street name is shown under the minimap.
- Blue street-name signs are generated from OSM `name=*` data for important streets around central Karlstad.
- Water is now gameplay-aware: entering water slows movement, triggers splash feedback, and deeper exposure moves the player back to the last safe point with a small health penalty.
- Traffic has positional engine sound; nearby people generate low-volume positional city chatter.
- Rendering is sharpened further with stronger contrast, lower fog and improved environment reflections.
- V27 Mitt i City interior, coffee city mode and optional zombie mode remain.

Desktop: WASD · mouse look · Shift sprint · Space jump · E interact · Z toggle city/zombie · LMB fire in zombie mode.
iPhone: left joystick · drag right side to look · USE · ZOMBIE/CITY · FIRE in zombie mode.

Public URL:
https://tryggspel.github.io/TestSpel/karlstad-city-mobile/
