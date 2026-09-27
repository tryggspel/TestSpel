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


## Real City V8

Localhost data loading is now resilient:

- building and road requests are split into smaller Overpass queries,
- three Overpass endpoints are tried automatically,
- successful core OSM data is cached locally for later launches,
- trees and environment layers load separately so they cannot block the core city,
- V7 Safari roof/facade performance limits remain in place.


## Real City V11

Visual-cleanup pass for the Stora torget vertical slice:

- filters implausibly thin/small footprint artifacts before mesh generation,
- adds procedural facade textures for plaster, brick and stone,
- adds separate dark window frames, deeper glass, facade cornices and plinth bands,
- adds small roof overhangs while preserving the Safari roof budget,
- gives Stora torget a distinct paved surface,
- adds lightweight instanced lamps, benches, planters and greenery as gameplay dressing,
- caches the deferred environment layer as well as core OSM/tree data,
- stores five nearby large building IDs/names in scene metadata as hero-building candidates for later custom replacement.

The square furniture placement is visual/gameplay dressing, not surveyed municipal placement.


## Real City V12

Street/square polish pass:

- replaces the old full-width sidewalk-under-road ribbon with separate left/right sidewalk strips,
- raises road/sidewalk surfaces to distinct heights to eliminate the visible z-fighting from V11,
- adds procedural asphalt grain and sidewalk slab textures,
- moves square furniture placement after road generation and skips candidate furniture positions too close to road corridors,
- tightens filtering for extreme thin/high-aspect footprint artifacts,
- upgrades desktop shadow filtering to medium quality while keeping mobile on the cheaper setting.

This remains a procedural gameplay interpretation of Stora torget; street furniture is not surveyed placement.


## Real City V13

Hero-building layer:

- adds a separate `hero-buildings.js` registry instead of hard-coding landmark logic into the world generator,
- resolves Sandgrund Lars Lerin and Värmlands Museum by OSM name when available, with coordinate/radius fallback,
- selects four large Stora torget buildings as a local hero cluster,
- keeps hero meshes separate from merged generic building meshes so they can later be replaced individually,
- gives heroes independent high-detail windows, entrance canopy/columns and facade accent bands,
- records resolved hero IDs/styles in scene metadata,
- reserves explicit asset-override slots for future GLB/LOD2 replacements.

Hero styling in V13 is a procedural game-art pass, not a claim of survey-accurate facade appearance.


## Real City V14

Geometry-cleanup pass before real landmark assets:

- gabled/hipped procedural roofs are now restricted to simple rectangular-ish footprints,
- complex/L-shaped footprints receive exact polygon-following flat caps instead of oversized bounding-box roofs,
- roof overhang is reduced,
- road and sidewalk ribbons receive tiny deterministic height offsets at intersections to suppress z-fighting,
- asphalt/sidewalk materials are lighter and less contrasty,
- hero entrance treatment is deliberately toned down; named landmarks keep only a small canopy and all heroes use a subtler facade band.

Hero architecture remains separate and ready for later GLB/LOD2 replacement.


## Real City V15

First dedicated landmark replacement: Sandgrund Lars Lerin.

- adds a separate `sandgrund-landmark.js` builder,
- keeps the real OSM footprint and collision position,
- replaces the generic hero extrusion for Sandgrund with a custom low horizontal pavilion shell,
- adds long glazed facade bands, dark mullions, exact footprint-following flat roof, entrance canopy and Sandgrund signage,
- keeps the landmark mesh separate from generic building merges,
- records the replacement as `procedural:sandgrund-v15` so it can later be swapped for GLB/LOD2 without changing gameplay coordinates,
- adds a SANDGRUND focus button for quick local visual testing.

The V15 shell is reference-informed game art, not survey-accurate architecture. Official public sources confirm the building was designed by Uno Asplund, opened in 1960 and is functionally inspired; exact facade dimensions/materials still require dedicated reference imagery, scan data or LOD2.
