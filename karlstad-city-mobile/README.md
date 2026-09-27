# Karlstad City V25 — Mobile First

Public browser prototype for iPhone/desktop testing.

## V22–V25 consolidated

- V22: control reset — faster mouse look, continuous fire, better ADS sensitivity.
- V23: mobile-first controls — landscape HUD, larger movement stick, touch look, FIRE/AIM/USE/JUMP/RELOAD.
- V24: visual cleanup — cleaner weapon presentation, rebalanced exposure, reduced washed-out look, PBR assets.
- V25: public PWA build — installable shell, service worker, quality presets, intended for GitHub Pages/HTTPS testing on iPhone.

## Controls

Desktop: WASD · mouse look · LMB fire · RMB ADS · Shift sprint · Space jump · E interact · R reload.

iPhone: left joystick move · drag right side to look · FIRE · AIM · USE · JUMP · RELOAD.

## Public test target

Once GitHub Pages is enabled for this repo using **GitHub Actions**, the expected URL is:

https://tryggspel.github.io/TestSpel/

The workflow publishes only the `karlstad-city-mobile` directory as the Pages site.
