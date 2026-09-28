#!/usr/bin/env python3
"""
Generate a tiny Duke/BUILD v7 user map from the Karlstad OSM snapshot already
stored in this repository.

Prototype goals:
- One large outdoor sector centred on Stora torget.
- Real OSM building footprints become solid inner wall loops.
- Mitt i City is deliberately left open and rebuilt as a simple enterable
  blocking-sprite shell with a doorway, so the first mission route can be tested.
- Player starts at Stora torget.

This is NOT a final art pass. It is a movement/level-design prototype to test
BUILD/EDuke32 feel using the same Karlstad data as the Babylon prototype.
"""
from __future__ import annotations
import argparse, json, math, os, struct
from pathlib import Path

ORIGIN_LON = 13.50295
ORIGIN_LAT = 59.380767
MALL_LON = 13.50055
MALL_LAT = 59.37988

# BUILD Wiki: ~1024 XY units ~= 2 metres.
UNITS_PER_M = 512.0
MAX_RADIUS_M = 235.0
MAX_BUILDINGS = 120
MAX_RING_POINTS = 12

# Temporary shareware-art tile ids from Duke's names.h.
TILE_WALL = 626       # BRICK
TILE_SKY = 80         # MOONSKY1
TILE_FLOOR = 626      # deliberately plain prototype texture
TILE_MALL = 626

CEILING_Z = -32768
FLOOR_Z = 0
PLAYER_Z = -8192

SECTOR_FMT = "<hhiiHHhhbBBBhhbBBBBBhhh"   # 40 bytes
WALL_FMT = "<iihhhHhhbBBBBBhhh"           # 32 bytes
SPRITE_FMT = "<iiiHhbBBBBBbbhhhhhhhhhh"   # 44 bytes

assert struct.calcsize(SECTOR_FMT) == 40
assert struct.calcsize(WALL_FMT) == 32
assert struct.calcsize(SPRITE_FMT) == 44


def local_xy(lon: float, lat: float) -> tuple[int, int]:
    lat0 = math.radians(ORIGIN_LAT)
    dx_m = (lon - ORIGIN_LON) * 111320.0 * math.cos(lat0)
    dy_m = -(lat - ORIGIN_LAT) * 110540.0
    return int(round(dx_m * UNITS_PER_M)), int(round(dy_m * UNITS_PER_M))


def ring_area(ring):
    a = 0.0
    for i, p in enumerate(ring):
        q = ring[(i + 1) % len(ring)]
        a += p[0] * q[1] - q[0] * p[1]
    return a * 0.5


def centroid(ring):
    if not ring:
        return (0.0, 0.0)
    return (sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring))


def point_line_distance(p, a, b):
    ax, ay = a; bx, by = b; px, py = p
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax)*dx + (py - ay)*dy)/(dx*dx + dy*dy)))
    x, y = ax + t*dx, ay + t*dy
    return math.hypot(px - x, py - y)


def rdp(points, eps):
    if len(points) <= 2:
        return points
    a, b = points[0], points[-1]
    best_d, best_i = 0.0, -1
    for i in range(1, len(points)-1):
        d = point_line_distance(points[i], a, b)
        if d > best_d:
            best_d, best_i = d, i
    if best_d > eps:
        left = rdp(points[:best_i+1], eps)
        right = rdp(points[best_i:], eps)
        return left[:-1] + right
    return [a, b]


def simplify_closed(ring):
    if len(ring) > 1 and ring[0] == ring[-1]:
        ring = ring[:-1]
    if len(ring) < 3:
        return []
    pts = rdp(ring + [ring[0]], 1.5 * UNITS_PER_M)
    if pts and pts[-1] == pts[0]:
        pts = pts[:-1]
    if len(pts) > MAX_RING_POINTS:
        step = len(pts) / MAX_RING_POINTS
        pts = [pts[int(i * step) % len(pts)] for i in range(MAX_RING_POINTS)]
    # Remove accidental duplicates.
    out = []
    for p in pts:
        if not out or p != out[-1]:
            out.append(p)
    return out if len(out) >= 3 else []


def ensure_orientation(ring, clockwise):
    # BUILD uses screen-style coordinates where +Y points down. In that
    # coordinate system a visually clockwise loop has POSITIVE shoelace area.
    # Sector outer loops must be clockwise; hole loops must be counter-clockwise.
    a = ring_area(ring)
    if clockwise and a < 0:
        return list(reversed(ring))
    if not clockwise and a > 0:
        return list(reversed(ring))
    return ring


def building_rings(osm_path: Path):
    data = json.loads(osm_path.read_text(encoding="utf-8"))
    mall_xy = local_xy(MALL_LON, MALL_LAT)
    candidates = []
    for e in data.get("elements", []):
        if e.get("type") != "way" or len(e.get("geometry") or []) < 3:
            continue
        tags = e.get("tags") or {}
        if not ("building" in tags or tags.get("amenity")):
            continue
        raw = [local_xy(float(p["lon"]), float(p["lat"])) for p in e["geometry"]]
        ring = simplify_closed(raw)
        if len(ring) < 3:
            continue
        cx, cy = centroid(ring)
        dist_m = math.hypot(cx, cy) / UNITS_PER_M
        if dist_m > MAX_RADIUS_M:
            continue
        # Keep Mitt i City open; the prototype creates its own enterable shell.
        if math.hypot(cx - mall_xy[0], cy - mall_xy[1]) < 44 * UNITS_PER_M:
            continue
        area_m2 = abs(ring_area(ring)) / (UNITS_PER_M * UNITS_PER_M)
        if area_m2 < 25:
            continue
        candidates.append((dist_m, area_m2, ring))
    candidates.sort(key=lambda x: (x[0], -x[1]))
    return [ensure_orientation(x[2], clockwise=False) for x in candidates[:MAX_BUILDINGS]]


def pack_sector(wall_count):
    return struct.pack(
        SECTOR_FMT,
        0, wall_count,
        CEILING_Z, FLOOR_Z,
        1, 0,                  # parallax ceiling, normal floor
        TILE_SKY, 0,
        0, 0, 0, 0,
        TILE_FLOOR, 0,
        4, 0, 0, 0,
        16, 0,
        0, 0, -1
    )


def pack_wall(x, y, point2, cstat=65, pic=TILE_WALL):
    return struct.pack(
        WALL_FMT,
        int(x), int(y),
        int(point2), -1, -1,
        int(cstat),
        int(pic), -1,
        0, 0, 8, 16, 0, 0,
        0, 0, -1
    )


def pack_sprite(x, y, z, ang, pic=TILE_MALL, xrepeat=64, yrepeat=64, cstat=401):
    # cstat 1 block + 16 wall-aligned + 128 centered + 256 hitscan
    return struct.pack(
        SPRITE_FMT,
        int(x), int(y), int(z),
        int(cstat), int(pic),
        0, 0, 32, 0,
        int(max(1, min(255, xrepeat))), int(max(1, min(255, yrepeat))),
        0, 0,
        0, 0,
        int(ang) & 2047, -1,
        0, 0, 0,
        0, 0, -1
    )


def edge_sprite(a, b, pic=TILE_MALL, height_repeat=80):
    ax, ay = a; bx, by = b
    mx, my = (ax+bx)//2, (ay+by)//2
    dx, dy = bx-ax, by-ay
    length = max(1.0, math.hypot(dx, dy))
    # BUILD angles: 0 east, increase clockwise.
    angle = int(round((math.atan2(dy, dx) % (2*math.pi)) * 2048 / (2*math.pi)))
    # 1024 map units ~= 64px tile at default scale. xrepeat 64 is roughly native.
    xr = int(max(8, min(255, 64 * length / 1024.0)))
    return pack_sprite(mx, my, -15000, angle, pic, xr, height_repeat, 401)


def mall_shell_sprites():
    cx, cy = local_xy(MALL_LON, MALL_LAT)
    # Approximate hero shell around the real mall point. Front side has a 5m doorway.
    hw = int(22 * UNITS_PER_M)
    hd = int(15 * UNITS_PER_M)
    door = int(2.5 * UNITS_PER_M)
    left, right = cx-hw, cx+hw
    top, bottom = cy-hd, cy+hd
    segs = [
        ((left, top), (right, top)),
        ((right, top), (right, bottom)),
        ((right, bottom), (cx+door, bottom)),
        ((cx-door, bottom), (left, bottom)),
        ((left, bottom), (left, top)),
    ]
    return [edge_sprite(a,b) for a,b in segs]


def generate(osm_path: Path, out_path: Path, meta_path: Path | None = None):
    rings = building_rings(osm_path)

    # Outer loop covers the hero district. BUILD's outer loop is clockwise;
    # inner solid loops use the opposite direction.
    half_x = int(265 * UNITS_PER_M)
    half_y = int(220 * UNITS_PER_M)
    outer = ensure_orientation([
        (-half_x,-half_y), (half_x,-half_y), (half_x,half_y), (-half_x,half_y)
    ], clockwise=True)

    # Fail the build rather than publishing an inside-out BUILD sector.
    # Positive area = clockwise in BUILD's +Y-down coordinate system.
    if ring_area(outer) <= 0:
        raise RuntimeError("BUILD outer loop must be clockwise (positive signed area)")
    bad_holes = [i for i, ring in enumerate(rings) if ring_area(ring) >= 0]
    if bad_holes:
        raise RuntimeError(f"BUILD hole loops must be counter-clockwise (negative signed area): {bad_holes[:8]}")

    loops = [outer] + rings
    walls = []
    cursor = 0
    for li, ring in enumerate(loops):
        start = cursor
        for i, (x,y) in enumerate(ring):
            point2 = start + ((i+1) % len(ring))
            walls.append(pack_wall(x,y,point2,65,TILE_WALL))
            cursor += 1

    sprites = mall_shell_sprites()

    posx, posy = local_xy(ORIGIN_LON, ORIGIN_LAT)
    with out_path.open("wb") as f:
        f.write(struct.pack("<iiii hh", 7, posx, posy, PLAYER_Z, 1536, 0))
        f.write(struct.pack("<H", 1))
        f.write(pack_sector(len(walls)))
        f.write(struct.pack("<H", len(walls)))
        for w in walls:
            f.write(w)
        f.write(struct.pack("<H", len(sprites)))
        for sp in sprites:
            f.write(sp)

    expected = 4*4 + 2*2 + 2 + 40 + 2 + 32*len(walls) + 2 + 44*len(sprites)
    actual = out_path.stat().st_size
    if actual != expected:
        raise RuntimeError(f"MAP size mismatch: expected {expected}, got {actual}")

    meta = {
        "format": 7,
        "origin": {"name":"Stora torget","lon":ORIGIN_LON,"lat":ORIGIN_LAT},
        "mitt_i_city": {"lon":MALL_LON,"lat":MALL_LAT},
        "units_per_m": UNITS_PER_M,
        "building_loops": len(rings),
        "walls": len(walls),
        "sprites": len(sprites),
        "size_bytes": actual,
    }
    if meta_path:
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(meta, ensure_ascii=False))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--osm", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--meta")
    args = ap.parse_args()
    generate(Path(args.osm), Path(args.out), Path(args.meta) if args.meta else None)


if __name__ == "__main__":
    main()
