# Focused regression checks

Development dependencies: Babylon.js 7.54.3 and `@napi-rs/canvas` (only needed for headless geometry checks). The game itself still loads the pinned engine CDN and has no build step.

From the repository root:

```sh
npm install --no-save babylonjs@7.54.3 @napi-rs/canvas
node karlstad-city/tests/engine-check.cjs
node karlstad-city/tests/controls-check.cjs
```

`BABYLON_PATH` may point to a locally available copy of the same pinned Babylon version instead of the npm module.

Engine checks construct the actual scene and verify that five mission destinations, 19 route edges and all 14 sun pickup locations are clear of building collisions. They verify duck/jump gate conditions, course completion, timer expiry, character vertex colours and finite geometry. Control checks exercise joystick deadzone, outer-edge sprint, competing pointer IDs, release and reset. These tests do not measure GPU performance or replace a physical multitouch device test.

`soljakten-preview.jpg` is an actual browser capture of the game in its software compatibility renderer, not a concept illustration or a claim of full GPU output.

## Zombie survival regression checks

`node karlstad-city/tests/zombie-check.cjs` builds the real city and tests transformation/restoration of all citizens, accessible relays and exit, ray hits and building occlusion, temporary stun expiry, energy recharge, nova cooldown, all relay gates, dawn before evacuation, victory, defeat, damage grace period and cleanup. Control checks now include simultaneous movement and fire, aiming while holding the trigger, independent pointer ownership, cancellation and reset.

`zombie-mobile-v16.jpg` is a browser capture on 2026-09-26 of the published web pilot in an 844×390 landscape viewport, using the software compatibility renderer. The Zombie button, single tap solar shot (+125 points), defeat panel and retry were exercised. It is not a capture of the separate Unity native project or a physical-phone GPU benchmark.
