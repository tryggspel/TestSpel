# Karlstad City Next

Isolated vertical-slice track for the next mobile renderer. The current `/karlstad-city/` build is intentionally untouched.

## Phase 1 in this branch

- Babylon.js 9.28.0.
- WebGPU-first engine bootstrap with automatic WebGL2 fallback.
- Existing City Quest, Soljakten, Zombie Apocalypse, touch controls, audio and progression reused.
- Optional high-fidelity asset layer for Gaussian Splats and GLB/GLTF.
- Separate PWA/service-worker scope so the prototype cannot replace the current game's offline cache.

## Real City pilot

`real-city.html` is the first no-LOD2 geodata vertical slice around Stora torget, Sandgrund and Värmlands Museum.

The pilot currently:

- reads Karlstad municipality's public ArcGIS building footprints,
- reads municipal road/land layers and the public tree inventory when reachable,
- converts WGS84 coordinates to a local metre-scale Babylon world,
- extrudes real building footprints into playable collision geometry,
- estimates heights until measured/LOD2 heights are available,
- marks Stora torget, Sandgrund and Värmlands Museum,
- falls back to OpenStreetMap buildings/roads if the municipal live endpoint cannot be reached from the browser,
- supports desktop WASD/mouse and mobile joystick/look controls.

This pilot is intentionally separate from the current procedural game world. We can validate scale, coverage, mobile performance and visual direction before moving missions/zombies into the geodata world.

## World strategy without LOD2

The scalable base world is now:

1. real footprints, roads, water, land and vegetation from open geodata,
2. generated building height/facades/roofs where measured 3D is unavailable,
3. hero buildings/locations as optimized GLB or scan assets,
4. gameplay collision/nav data kept separate from visual meshes,
5. optional future LOD2 replacement layer keyed by building/location ID.

LOD2 is therefore an upgrade layer, not a blocker. If municipal LOD2 becomes available later, selected generated buildings can be replaced without rebuilding gameplay.

RealityScan is no longer intended for scanning the whole city. Use it only for a small number of hero locations or interiors where the extra realism is worth the asset cost.

## Mobile gate

Before replacing the existing renderer, validate on physical iPhone 11 and a current Android phone. Initial target: stable 30 fps, responsive touch input, bounded memory, fast first meaningful frame and no gameplay regressions.


## Real City V5

The no-LOD2 pilot now adds a visual generation layer on top of the real geodata:

- procedural facade windows and entrances with a strict mobile detail budget,
- deterministic flat, gabled and hipped roof generation,
- wider sidewalk ribbons below real road centerlines,
- OSM water/river/park fallback layers for localhost testing,
- a first Klarälven ribbon derived from real river geometry,
- denser two-cluster tree crowns without multiplying unique materials.

These details are generated separately from the footprint/collision layer so measured heights, hero assets or future municipal LOD2 can replace the visual shell without changing gameplay coordinates.
