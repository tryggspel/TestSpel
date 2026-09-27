# Karlstad City V31 — Navigation + Recognition

Public mobile-first browser prototype for iPhone and desktop.

## Why V31 exists
V30 was still too hard to read as a game world. V31 prioritizes:
1. knowing where you are,
2. knowing where you are allowed to go,
3. knowing where the current mission is,
4. recognizing central Karlstad.

## Navigation
- New **VISA VÄGEN** button.
- Route is calculated through the bundled OSM road network instead of only drawing a straight line.
- The route is visible both on the minimap and as bright ground markers in the 3D world.
- The minimap has higher contrast:
  - light roads = routes/walkable street network
  - red/brown blocks = buildings / blocked space
  - blue = water / no-go
- Current street remains visible under the minimap.
- Quick-travel panel:
  - Stora torget
  - Mitt i City
  - Sandgrund
  - Värmlands Museum
  - O'Learys

## Anti-stuck
- Repeated building collisions automatically return the player to the last known safe point.
- NPC collisions are soft: the pedestrian moves aside instead of trapping the player.
- Closed building collisions display **STÄNGT · GÅ RUNT**.
- Moving vehicles still produce a stronger impact.

## Recognition
- Stora torget now has a stylized **Fredsmonumentet** centerpiece.
- A stylized **Gustaf Fröding** statue is added near the square.
- Karlstad sun flags make the square easier to identify.
- Mitt i City gets a much clearer playable entrance, stronger exterior branding and updated shop signs based on current centre information.
- River edges get physical rail cues where the local river geometry is available.

## Existing gameplay retained
- City mission → Mitt i City → emergency radio → return to Stora torget.
- Zombie mode unlock after the city mission.
- Coffee in city mode, weapon in zombie mode.
- Sprint/stamina, footsteps, traffic/chatter positional audio, vehicle impacts, street signs and water safety.

Public URL:
https://tryggspel.github.io/TestSpel/karlstad-city-mobile/
