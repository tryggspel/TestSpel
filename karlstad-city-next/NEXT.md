# Karlstad City Next

Isolated vertical-slice track for the next mobile renderer. The current `/karlstad-city/` build is intentionally untouched.

## Phase 1 in this branch

- Babylon.js 9.28.0.
- WebGPU-first engine bootstrap with automatic WebGL2 fallback.
- Existing City Quest, Soljakten, Zombie Apocalypse, touch controls, audio, progression and procedural world reused.
- Optional high-fidelity asset layer for Gaussian Splats and GLB/GLTF.
- Separate PWA/service-worker scope so the prototype cannot replace the current game's offline cache.

## Asset strategy

Photographed/scanned Karlstad is the visual environment. Interactive objects remain conventional meshes. Each production location should eventually contain:

1. optimized static scan/splat,
2. low-poly collision proxy,
3. navmesh,
4. interactive GLB props,
5. mobile LOD/performance budget.

Start with one short route around Stora torget / Sandgrund / Värmlands Museum. Add assets in `next-assets.js`; gameplay files do not need to change.

## Mobile gate

Before replacing the existing renderer, validate on physical iPhone 11 and a current Android phone. Target first: stable 30 fps, responsive touch input, bounded memory, fast first meaningful frame, no gameplay regressions.
