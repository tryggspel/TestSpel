# Karlstad City — EDuke32/WASM prototype

This directory is the source pipeline for a separate **BUILD/EDuke32** gameplay prototype.

It does **not** replace the Babylon browser build. The goal is to test whether the Duke-style sector engine gives Karlstad City the fast FPS feel, clear geometry and automap behaviour we have been trying to reach.

## Prototype 0

The first generated map deliberately stays small:

- Player starts at **Stora torget**.
- The existing bundled OSM building snapshot is converted to BUILD v7 geometry.
- Nearby real building footprints become solid inner wall loops.
- The real **Mitt i City** point is kept open and replaced with a deliberately simple enterable shell with a doorway.
- The EDuke32 classic renderer handles movement/collision.
- TAB uses BUILD/EDuke32's native automap.
- The browser shell adds coarse-pointer controls for iPhone/iPad: joystick, MAP, USE, JUMP and FIRE.

The public build output is committed to /eduke32-karlstad/ by GitHub Actions, then deployed by the normal TestSpel Pages workflow.

## Data reused from the current game

Source data remains in:

- karlstad-city-mobile/data/osm-buildings.json
- Stora torget origin: 13.50295, 59.380767
- Mitt i City: 13.50055, 59.37988

The map generator is tools/osm_to_build_map.py.

## Engine source

The CI build pins:

DigitalCyberSoft/eduke32-wasm@37b56eefaf8125eaa853c417512019cc7ad94b81

The BUILD source license is copied into the generated public prototype as BUILDLIC.TXT. This prototype is for technical evaluation; commercial use of BUILD requires resolving the Build Engine license separately.
