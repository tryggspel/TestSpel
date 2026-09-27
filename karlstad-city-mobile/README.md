# Karlstad City V33 — Sharp City

V33 focuses on the two issues that were hurting the build most: the expanded map blocking play, and the 3D world looking grainy/low-resolution.

## Automap fix
- Expanded KARTA is now a **non-blocking translucent automap overlay**.
- The player can keep walking, looking around and using mobile controls while the large map is visible.
- The map button remains above the overlay and switches back to MINIKARTA.
- Expanded map zooms farther out than the minimap so it actually helps orientation instead of just enlarging the same view.
- Mission route, landmarks, blocked buildings and water remain visible.

## Sharp rendering
- Balanced mode now renders at **native hardware scaling (1.0)** on iPhone/mobile.
- Sharp mode uses modest supersampling; FPS mode remains available.
- Reduced excessive sharpen and contrast that were amplifying noise.
- Fog is reduced substantially.
- Bloom is reduced so edges stay clean.
- Mobile shadow map increased and PCF quality unified.

## Materials
- The old 128px procedural surfaces were replaced with cleaner **512px deterministic textures**.
- Asphalt no longer uses the high-frequency micro-grain bump that made the image crawl/shimmer.
- Sidewalks and square paving use larger, cleaner slab patterns.
- Texture anisotropic filtering is increased.
- Glass/metal/water keep PBR reflection but with cleaner material response.
- More central facades get readable ground-floor storefront glass/awnings.

## Duke-inspired readability
The reference is level-design clarity, not copied art/assets:
- clear street edges,
- readable building masses,
- obvious entrances,
- strong signs and wayfinding,
- a central enterable destination,
- an automap that can stay visible while playing.

V33 adds crisp curb strips on the main central streets, pavement arrows between Stora torget and Mitt i City, a stronger Mitt i City entrance portal, and a few high-contrast city signs/billboards.

## Existing V32 gameplay retained
- Hero District
- Stora torget → Mitt i City mission loop
- Domkyrkan, Rådhuset, Sandgrund, Museum
- VISA VÄGEN
- quick travel
- Sola collectibles
- city/zombie modes
- collisions / anti-stuck / water / traffic audio

Public URL:
https://tryggspel.github.io/TestSpel/karlstad-city-mobile/
