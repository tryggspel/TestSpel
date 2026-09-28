import * as pc from 'playcanvas';

const $ = (id) => document.getElementById(id);
const canvas = $('application-canvas');
const boot = $('boot');
const bootText = $('bootText');
const bootFill = $('bootFill');
const fatal = $('fatal');
const coarse = matchMedia('(pointer:coarse)').matches;
const lowPower = coarse || /iPhone|iPad|iPod/i.test(navigator.userAgent);

function fail(err) {
  console.error(err);
  fatal.style.display = 'block';
  fatal.textContent = 'KARLSTAD CITY NEXT — STARTFEL\n\n' + (err?.stack || err) + '\n\nUA: ' + navigator.userAgent;
  boot.classList.add('hide');
}

function progress(text, pct) {
  bootText.textContent = text;
  bootFill.style.width = `${Math.max(8, Math.min(100, pct))}%`;
}

window.addEventListener('error', (e) => {
  if (!fatal.textContent) fail(e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  if (!fatal.textContent) fail(e.reason || 'Unhandled promise rejection');
});

const ORIGIN = { lat: 59.380767, lon: 13.50295, name: 'Stora Torget' };
const MALL_GEO = { lat: 59.37988, lon: 13.50055, name: 'Mitt i City' };
const LAT_SCALE = 110540;
const LON_SCALE = 111320 * Math.cos(ORIGIN.lat * Math.PI / 180);
const WORLD_RADIUS = 285;
const PLAYER_RADIUS = 0.58;
const EYE_HEIGHT = 1.72;

function geoToWorld(lon, lat) {
  return {
    x: (lon - ORIGIN.lon) * LON_SCALE,
    z: -(lat - ORIGIN.lat) * LAT_SCALE
  };
}

const mall = geoToWorld(MALL_GEO.lon, MALL_GEO.lat);
const mallEntrance = { x: mall.x + 25, z: mall.z };

progress('Startar PlayCanvas 2.22.4…', 14);

const app = new pc.Application(canvas, {
  graphicsDeviceOptions: {
    antialias: !lowPower,
    alpha: false,
    powerPreference: 'high-performance'
  }
});
app.graphicsDevice.maxPixelRatio = lowPower ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.start();
window.addEventListener('resize', () => app.resizeCanvas());

app.scene.ambientLight = new pc.Color(0.48, 0.52, 0.58);
app.scene.exposure = 1.05;

function material(rgb, opts = {}) {
  const m = new pc.StandardMaterial();
  m.diffuse.set(rgb[0], rgb[1], rgb[2]);
  m.specular.set(opts.specular ?? 0.08, opts.specular ?? 0.08, opts.specular ?? 0.08);
  m.metalness = opts.metalness ?? 0;
  m.gloss = opts.gloss ?? 0.22;
  if (opts.emissive) {
    m.emissive.set(opts.emissive[0], opts.emissive[1], opts.emissive[2]);
    m.emissiveIntensity = opts.emissiveIntensity ?? 1;
  }
  if (opts.unlit) m.useLighting = false;
  if (opts.twoSided) m.cull = pc.CULLFACE_NONE;
  m.update();
  return m;
}

const mats = {
  ground: material([0.23, 0.27, 0.25], { specular: 0.02 }),
  road: material([0.12, 0.14, 0.15], { specular: 0.02 }),
  plaza: material([0.44, 0.39, 0.33], { specular: 0.03 }),
  neutral: material([0.61, 0.58, 0.51], { twoSided: true }),
  warm: material([0.63, 0.44, 0.32], { twoSided: true }),
  brick: material([0.48, 0.30, 0.23], { twoSided: true }),
  stone: material([0.72, 0.69, 0.61], { twoSided: true }),
  mall: material([0.26, 0.31, 0.35], { specular: 0.12 }),
  mallTrim: material([0.92, 0.72, 0.12], { emissive: [0.3, 0.18, 0.01], emissiveIntensity: 0.3 }),
  marker: material([1.0, 0.72, 0.02], { emissive: [1.0, 0.46, 0.01], emissiveIntensity: 1.4 }),
  goal: material([0.18, 0.78, 0.43], { emissive: [0.05, 0.45, 0.18], emissiveIntensity: 0.8 }),
  zombie: material([0.46, 0.10, 0.08], { specular: 0.02 }),
  zombieHead: material([0.50, 0.55, 0.42], { specular: 0.02 })
};

function addPrimitive(name, type, position, scale, mat, castShadow = false) {
  const e = new pc.Entity(name);
  e.addComponent('render', { type, material: mat });
  e.setPosition(position.x, position.y, position.z);
  e.setLocalScale(scale.x, scale.y, scale.z);
  if (e.render) {
    e.render.castShadows = castShadow && !lowPower;
    e.render.receiveShadows = true;
  }
  app.root.addChild(e);
  return e;
}

// Ground and a readable street skeleton around Stora Torget.
addPrimitive('Ground', 'plane', { x: 0, y: -0.04, z: 0 }, { x: 660, y: 1, z: 660 }, mats.ground);
addPrimitive('Stora Torget', 'plane', { x: 0, y: 0, z: 0 }, { x: 82, y: 1, z: 72 }, mats.plaza);

function addRoad(name, a, b, width = 12) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const road = addPrimitive(name, 'plane', { x: (a.x + b.x) / 2, y: 0.015, z: (a.z + b.z) / 2 }, { x: width, y: 1, z: len }, mats.road);
  road.setEulerAngles(0, Math.atan2(dx, dz) * 180 / Math.PI, 0);
  return road;
}

const westTorgX = geoToWorld(13.50163, ORIGIN.lat).x;
const eastTorgX = geoToWorld(13.50425, ORIGIN.lat).x;
const tingZ = geoToWorld(ORIGIN.lon, 59.38025).z;
const kungZ = geoToWorld(ORIGIN.lon, 59.38128).z;
const drottZ = geoToWorld(ORIGIN.lon, 59.37932).z;
addRoad('Västra Torggatan', { x: westTorgX, z: -260 }, { x: westTorgX, z: 240 }, 12);
addRoad('Östra Torggatan', { x: eastTorgX, z: -240 }, { x: eastTorgX, z: 230 }, 12);
addRoad('Tingvallagatan', { x: -250, z: tingZ }, { x: 230, z: tingZ }, 11);
addRoad('Kungsgatan', { x: -230, z: kungZ }, { x: 245, z: kungZ }, 11);
addRoad('Drottninggatan', { x: -245, z: drottZ }, { x: 220, z: drottZ }, 12);

const sun = new pc.Entity('Sun');
sun.addComponent('light', {
  type: 'directional',
  color: new pc.Color(1, 0.93, 0.82),
  intensity: 1.45,
  castShadows: !lowPower,
  shadowDistance: 70,
  shadowResolution: lowPower ? 512 : 1024
});
sun.setEulerAngles(48, -32, 0);
app.root.addChild(sun);

const camera = new pc.Entity('PlayerCamera');
camera.addComponent('camera', {
  clearColor: new pc.Color(0.40, 0.58, 0.73),
  fov: coarse ? 76 : 82,
  nearClip: 0.08,
  farClip: 650
});
app.root.addChild(camera);

const colliders = [];
const mapPolys = [];

function polygonArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += poly[j].x * poly[i].z - poly[i].x * poly[j].z;
  return a * 0.5;
}

function bbox(poly) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of poly) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

function addCollider(poly, meta = {}) {
  const b = bbox(poly);
  colliders.push({ poly, ...b, meta });
  mapPolys.push(poly);
}

function rectPoly(cx, cz, w, d) {
  return [
    { x: cx - w / 2, z: cz - d / 2 },
    { x: cx + w / 2, z: cz - d / 2 },
    { x: cx + w / 2, z: cz + d / 2 },
    { x: cx - w / 2, z: cz + d / 2 }
  ];
}

function addSolidBox(name, cx, cz, w, h, d, mat) {
  addPrimitive(name, 'box', { x: cx, y: h / 2, z: cz }, { x: w, y: h, z: d }, mat, true);
  addCollider(rectPoly(cx, cz, w, d), { name });
}

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    const hit = ((a.z > z) !== (b.z > z)) && (x < (b.x - a.x) * (z - a.z) / ((b.z - a.z) || 1e-9) + a.x);
    if (hit) inside = !inside;
  }
  return inside;
}

function pointSegDistSq(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz || 1;
  let t = ((px - ax) * dx + (pz - az) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx, z = az + t * dz;
  const ex = px - x, ez = pz - z;
  return ex * ex + ez * ez;
}

function isBlocked(x, z, radius = PLAYER_RADIUS) {
  const r2 = radius * radius;
  for (const c of colliders) {
    if (x < c.minX - radius || x > c.maxX + radius || z < c.minZ - radius || z > c.maxZ + radius) continue;
    if (pointInPoly(x, z, c.poly)) return true;
    for (let i = 0, j = c.poly.length - 1; i < c.poly.length; j = i++) {
      const a = c.poly[j], b = c.poly[i];
      if (pointSegDistSq(x, z, a.x, a.z, b.x, b.z) < r2) return true;
    }
  }
  return false;
}

const buckets = {
  neutral: { p: [], n: [], i: [], mat: mats.neutral },
  warm: { p: [], n: [], i: [], mat: mats.warm },
  brick: { p: [], n: [], i: [], mat: mats.brick },
  stone: { p: [], n: [], i: [], mat: mats.stone }
};

function buildingBucket(tags) {
  const b = (tags.building || '').toLowerCase();
  const mat = (tags['building:material'] || '').toLowerCase();
  if (mat.includes('brick') || /apartment|residential|house/.test(b)) return buckets.brick;
  if (/church|civic|government|museum|theatre/.test(b) || tags.amenity === 'place_of_worship') return buckets.stone;
  if (/retail|commercial|hotel/.test(b) || tags.shop) return buckets.warm;
  return buckets.neutral;
}

function addExtrusion(bucket, poly, height) {
  const { p, n, i } = bucket;
  // Walls: duplicated edge vertices for crisp vertical normals.
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k], b = poly[(k + 1) % poly.length];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    const nx = dz / len, nz = -dx / len;
    const base = p.length / 3;
    p.push(a.x, 0, a.z, b.x, 0, b.z, b.x, height, b.z, a.x, height, a.z);
    for (let q = 0; q < 4; q++) n.push(nx, 0, nz);
    i.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  // Flat roof. A centroid fan is sufficient for the prototype and keeps the
  // entire district in a few draw calls; wall footprints remain exact OSM.
  let cx = 0, cz = 0;
  for (const v of poly) { cx += v.x; cz += v.z; }
  cx /= poly.length; cz /= poly.length;
  const center = p.length / 3;
  p.push(cx, height, cz); n.push(0, 1, 0);
  const ringStart = p.length / 3;
  for (const v of poly) { p.push(v.x, height, v.z); n.push(0, 1, 0); }
  for (let k = 0; k < poly.length; k++) i.push(center, ringStart + k, ringStart + ((k + 1) % poly.length));
}

function commitBucket(name, bucket) {
  if (!bucket.i.length) return;
  const mesh = new pc.Mesh(app.graphicsDevice);
  mesh.setPositions(bucket.p);
  mesh.setNormals(bucket.n);
  mesh.setIndices(bucket.i);
  mesh.update();
  const mi = new pc.MeshInstance(mesh, bucket.mat);
  mi.castShadow = !lowPower;
  mi.receiveShadow = true;
  const e = new pc.Entity(`Buildings-${name}`);
  e.addComponent('render', { meshInstances: [mi] });
  app.root.addChild(e);
}

function makeMall() {
  // OSM footprint 234271401 is replaced by a simple enterable shell. The east
  // wall faces Stora Torget and contains a real doorway so we can test interiors.
  const cx = mall.x, cz = mall.z, w = 44, d = 30, h = 12;
  addSolidBox('Mitt i City west', cx - w / 2, cz, 1.4, h, d, mats.mall);
  addSolidBox('Mitt i City north', cx, cz - d / 2, w, h, 1.4, mats.mall);
  addSolidBox('Mitt i City south', cx, cz + d / 2, w, h, 1.4, mats.mall);
  addSolidBox('Mitt i City east north', cx + w / 2, cz - 10, 1.4, h, 10, mats.mall);
  addSolidBox('Mitt i City east south', cx + w / 2, cz + 10, 1.4, h, 10, mats.mall);
  addPrimitive('Mitt i City floor', 'plane', { x: cx, y: 0.025, z: cz }, { x: w - 2, y: 1, z: d - 2 }, mats.road);
  addPrimitive('Mitt i City sign', 'box', { x: cx + w / 2 + 0.15, y: 8.8, z: cz }, { x: 0.35, y: 1.3, z: 9 }, mats.mallTrim);
  addPrimitive('Mall goal', 'cylinder', { x: cx, y: 1.7, z: cz }, { x: 0.45, y: 3.4, z: 0.45 }, mats.goal);
}

function makeMarkers() {
  addPrimitive('Start beacon', 'cylinder', { x: 0, y: 3.5, z: 0 }, { x: 0.35, y: 7, z: 0.35 }, mats.marker);
  addPrimitive('Goal beacon', 'cylinder', { x: mallEntrance.x, y: 3.5, z: mallEntrance.z }, { x: 0.30, y: 7, z: 0.30 }, mats.goal);
}

progress('Hämtar Karlstads byggnader…', 34);
let osm;
try {
  const res = await fetch('../karlstad-city-mobile/data/osm-buildings.json?v=pc1', { cache: 'force-cache' });
  if (!res.ok) throw new Error(`OSM-data HTTP ${res.status}`);
  osm = await res.json();
} catch (err) {
  fail(err);
  throw err;
}

progress('Bygger Stora Torget i 3D…', 57);
let renderedBuildings = 0;
for (const element of osm.elements || []) {
  const tags = element.tags || {};
  if (element.type !== 'way' || !tags.building || !Array.isArray(element.geometry) || element.geometry.length < 3) continue;
  if (tags.building === 'roof' || tags.amenity === 'shelter') continue;
  if (element.id === 234271401) continue; // custom enterable Mitt i City shell

  let poly = element.geometry.map(g => geoToWorld(g.lon, g.lat));
  if (poly.length > 1 && Math.hypot(poly[0].x - poly.at(-1).x, poly[0].z - poly.at(-1).z) < 0.1) poly.pop();
  if (poly.length < 3) continue;
  const cx = poly.reduce((s, v) => s + v.x, 0) / poly.length;
  const cz = poly.reduce((s, v) => s + v.z, 0) / poly.length;
  if (Math.hypot(cx, cz) > WORLD_RADIUS) continue;
  const area = Math.abs(polygonArea(poly));
  if (area < 18) continue;

  const levels = Math.max(1, Math.min(8, parseFloat(tags['building:levels']) || (2 + (element.id % 3))));
  const roofLevels = Math.max(0, Math.min(2, parseFloat(tags['roof:levels']) || 0));
  const height = 3.05 * levels + 1.3 * roofLevels;
  addExtrusion(buildingBucket(tags), poly, height);
  addCollider(poly, { id: element.id, name: tags.name || tags['building:name'] || '' });
  renderedBuildings++;
}

for (const [name, bucket] of Object.entries(buckets)) commitBucket(name, bucket);
makeMall();
makeMarkers();

progress(`Optimerar ${renderedBuildings} byggnader för mobil…`, 78);

const player = {
  x: 0, z: 0, y: 0,
  vy: 0,
  yaw: Math.atan2(-(mallEntrance.x), -(mallEntrance.z)) * 180 / Math.PI,
  pitch: -3,
  grounded: true,
  health: 100
};

const keys = new Set();
const joystick = { x: 0, y: 0 };
let autoMode = false;
let autoRoute = [];
let autoIndex = 0;
let zombieMode = false;
let zombies = [];
let mapExpanded = false;
let missionComplete = false;
let toastTimer = 0;
let lastShot = 0;

function toast(msg, ms = 1400) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function setPlayerCamera() {
  camera.setPosition(player.x, player.y + EYE_HEIGHT, player.z);
  camera.setEulerAngles(player.pitch, player.yaw, 0);
}
setPlayerCamera();

function tryMoveEntity(pos, dx, dz, radius = PLAYER_RADIUS) {
  const nx = pos.x + dx;
  if (!isBlocked(nx, pos.z, radius)) pos.x = nx;
  const nz = pos.z + dz;
  if (!isBlocked(pos.x, nz, radius)) pos.z = nz;
}

function resetPlayer() {
  player.x = 0; player.z = 0; player.y = 0; player.vy = 0; player.health = 100;
  player.yaw = Math.atan2(-(mallEntrance.x), -(mallEntrance.z)) * 180 / Math.PI;
  player.pitch = -3; autoMode = false; $('autoBtn').classList.remove('active');
  setPlayerCamera();
  toast('Tillbaka på Stora Torget');
}

function jump() {
  if (player.grounded) {
    player.vy = 6.8;
    player.grounded = false;
  }
}

function useAction() {
  const d = Math.hypot(player.x - mallEntrance.x, player.z - mallEntrance.z);
  const inside = Math.abs(player.x - mall.x) < 19 && Math.abs(player.z - mall.z) < 12;
  if (inside) {
    missionComplete = true;
    toast('MITT I CITY · Uppdrag 1 klart!', 2200);
  } else if (d < 12) {
    toast('Gå in genom entrén — dörren är öppen');
  } else {
    toast('Inget att använda här');
  }
}

function toggleMap() {
  mapExpanded = !mapExpanded;
  $('miniWrap').classList.toggle('expanded', mapExpanded);
  drawMap(true);
}

function toggleZombieMode() {
  zombieMode = !zombieMode;
  $('zombieBtn').classList.toggle('active', zombieMode);
  if (zombieMode && zombies.length === 0) spawnZombies(8);
  if (!zombieMode) {
    for (const z of zombies) z.entity.destroy();
    zombies = [];
  }
  toast(zombieMode ? 'ZOMBIE APOCALYPSE AKTIVERAD' : 'Zombie mode av');
}

function findOpenSpawn(x, z) {
  if (!isBlocked(x, z, 0.5)) return { x, z };
  for (let r = 4; r < 35; r += 4) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (!isBlocked(px, pz, 0.5)) return { x: px, z: pz };
    }
  }
  return { x, z };
}

function spawnZombies(count) {
  for (let i = 0; i < count; i++) {
    const a = i / count * Math.PI * 2 + 0.35;
    const r = 26 + (i % 3) * 10;
    const p = findOpenSpawn(player.x + Math.cos(a) * r, player.z + Math.sin(a) * r);
    const body = addPrimitive(`Zombie-${i}`, 'capsule', { x: p.x, y: 1.05, z: p.z }, { x: 0.82, y: 1.15, z: 0.82 }, mats.zombie);
    const head = addPrimitive(`ZombieHead-${i}`, 'sphere', { x: p.x, y: 2.05, z: p.z }, { x: 0.62, y: 0.62, z: 0.62 }, mats.zombieHead);
    zombies.push({ entity: body, head, x: p.x, z: p.z, hp: 1, phase: i * 1.7 });
  }
}

function fire() {
  const now = performance.now();
  if (now - lastShot < 180) return;
  lastShot = now;
  document.body.style.setProperty('--shot', Math.random());
  if (!zombies.length) { toast('PANG'); return; }
  const yaw = player.yaw * Math.PI / 180;
  const pitch = player.pitch * Math.PI / 180;
  const forward = {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: -Math.sin(pitch),
    z: -Math.cos(yaw) * Math.cos(pitch)
  };
  let best = null;
  for (const z of zombies) {
    const dx = z.x - player.x, dy = 1.35 - (player.y + EYE_HEIGHT), dz = z.z - player.z;
    const d = Math.hypot(dx, dy, dz);
    if (d > 90) continue;
    const dot = (dx * forward.x + dy * forward.y + dz * forward.z) / d;
    if (dot > 0.972 && (!best || dot > best.dot)) best = { z, dot, d };
  }
  if (best) {
    best.z.hp--;
    if (best.z.hp <= 0) {
      best.z.entity.destroy(); best.z.head.destroy();
      zombies = zombies.filter(z => z !== best.z);
      toast('TRÄFF · Zombie neutraliserad');
    }
  }
}

function planRoute(start, goal) {
  const step = 4;
  const min = -WORLD_RADIUS, max = WORLD_RADIUS;
  const size = Math.floor((max - min) / step) + 1;
  const toCell = (v) => Math.max(0, Math.min(size - 1, Math.round((v - min) / step)));
  const sx = toCell(start.x), sz = toCell(start.z), gx = toCell(goal.x), gz = toCell(goal.z);
  const total = size * size;
  const prev = new Int32Array(total); prev.fill(-2);
  const q = new Int32Array(total);
  let qh = 0, qt = 0;
  const sidx = sz * size + sx; prev[sidx] = -1; q[qt++] = sidx;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let found = -1;
  while (qh < qt) {
    const idx = q[qh++];
    const x = idx % size, z = (idx / size) | 0;
    if (Math.abs(x - gx) <= 1 && Math.abs(z - gz) <= 1) { found = idx; break; }
    for (const [dx, dz] of dirs) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= size || nz >= size) continue;
      const ni = nz * size + nx;
      if (prev[ni] !== -2) continue;
      const wx = min + nx * step, wz = min + nz * step;
      if (isBlocked(wx, wz, 0.85)) continue;
      prev[ni] = idx; q[qt++] = ni;
    }
  }
  if (found < 0) return [goal];
  const cells = [];
  for (let cur = found; cur >= 0; cur = prev[cur]) {
    const x = cur % size, z = (cur / size) | 0;
    cells.push({ x: min + x * step, z: min + z * step });
  }
  cells.reverse();
  const result = [];
  for (let i = 0; i < cells.length; i += 3) result.push(cells[i]);
  result.push(goal);
  return result;
}

function toggleAuto() {
  autoMode = !autoMode;
  $('autoBtn').classList.toggle('active', autoMode);
  if (autoMode) {
    autoRoute = planRoute(player, mallEntrance);
    autoIndex = Math.min(1, autoRoute.length - 1);
    toast('AUTOPILOT · Visar vägen till Mitt i City');
  } else toast('Autopilot av');
}

function manualIntent() {
  let strafe = 0, forward = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) forward += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) forward -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) strafe += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) strafe -= 1;
  strafe += joystick.x;
  forward += -joystick.y;
  const len = Math.hypot(strafe, forward);
  if (len > 1) { strafe /= len; forward /= len; }
  return { strafe, forward, active: len > 0.08 };
}

window.addEventListener('keydown', (e) => {
  if (['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === 'Space') jump();
  if (e.code === 'KeyE') useAction();
  if (e.code === 'KeyF') fire();
  if (e.code === 'Tab') toggleMap();
  if (e.code === 'KeyG') toggleAuto();
  if (e.code === 'KeyZ') toggleZombieMode();
  if (e.code === 'KeyR') resetPlayer();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));

canvas.addEventListener('click', () => {
  if (!coarse && document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
});
window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement !== canvas) return;
  player.yaw -= e.movementX * 0.12;
  player.pitch = Math.max(-76, Math.min(76, player.pitch - e.movementY * 0.10));
});
canvas.addEventListener('mousedown', (e) => { if (!coarse && e.button === 0 && document.pointerLockElement === canvas) fire(); });

let lookPid = null, lookX = 0, lookY = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (!coarse || e.clientX < innerWidth * 0.36) return;
  lookPid = e.pointerId; lookX = e.clientX; lookY = e.clientY;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== lookPid) return;
  const dx = e.clientX - lookX, dy = e.clientY - lookY;
  lookX = e.clientX; lookY = e.clientY;
  player.yaw -= dx * 0.21;
  player.pitch = Math.max(-72, Math.min(72, player.pitch - dy * 0.17));
});
function endLook(e) { if (e.pointerId === lookPid) lookPid = null; }
canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);

const stick = $('stick'), knob = $('stickKnob');
let stickPid = null;
function updateStick(e) {
  const r = stick.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const max = r.width * 0.31, len = Math.hypot(dx, dy) || 1;
  if (len > max) { dx *= max / len; dy *= max / len; }
  joystick.x = dx / max; joystick.y = dy / max;
  knob.style.transform = `translate(${dx}px,${dy}px)`;
}
if (stick) {
  stick.addEventListener('pointerdown', (e) => { e.preventDefault(); stickPid = e.pointerId; stick.setPointerCapture(e.pointerId); updateStick(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickPid) { e.preventDefault(); updateStick(e); } });
  const stop = (e) => { if (e.pointerId !== stickPid) return; stickPid = null; joystick.x = joystick.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', stop); stick.addEventListener('pointercancel', stop);
}

function bindPress(id, fn) {
  const e = $(id); if (!e) return;
  e.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); fn(); });
}
bindPress('jumpBtn', jump); bindPress('fireBtn', fire); bindPress('useBtn', useAction); bindPress('mapBtn', toggleMap);
bindPress('autoBtn', toggleAuto); bindPress('zombieBtn', toggleZombieMode); bindPress('resetBtn', resetPlayer);
$('miniWrap').addEventListener('pointerdown', (e) => { e.preventDefault(); toggleMap(); });

let fpsFrames = 0, fpsTime = performance.now(), fpsValue = 0;
let mapTick = 0;

function updateZombies(dt) {
  if (!zombieMode) return;
  for (const z of zombies) {
    const dx = player.x - z.x, dz = player.z - z.z;
    const d = Math.hypot(dx, dz) || 1;
    if (d > 1.25) {
      const speed = 1.55 + 0.25 * Math.sin(performance.now() * 0.001 + z.phase);
      const pos = { x: z.x, z: z.z };
      tryMoveEntity(pos, dx / d * speed * dt, dz / d * speed * dt, 0.42);
      z.x = pos.x; z.z = pos.z;
    } else {
      player.health -= 13 * dt;
      if (player.health <= 0) { resetPlayer(); player.health = 100; toast('DU BLEV TAGEN · Respawn Stora Torget', 2200); }
    }
    z.entity.setPosition(z.x, 1.05, z.z);
    z.head.setPosition(z.x, 2.05, z.z);
    z.entity.lookAt(player.x, 1.0, player.z);
  }
  if (zombieMode && zombies.length === 0) setTimeout(() => zombieMode && spawnZombies(6), 900);
}

function updateAuto(dt) {
  if (!autoMode || !autoRoute.length) return false;
  const target = autoRoute[Math.min(autoIndex, autoRoute.length - 1)];
  const dx = target.x - player.x, dz = target.z - player.z;
  const d = Math.hypot(dx, dz);
  if (d < 2.0) {
    autoIndex++;
    if (autoIndex >= autoRoute.length) {
      autoMode = false; $('autoBtn').classList.remove('active'); toast('Framme vid Mitt i City'); return false;
    }
    return true;
  }
  const desiredYaw = Math.atan2(-dx, -dz) * 180 / Math.PI;
  let delta = ((desiredYaw - player.yaw + 540) % 360) - 180;
  player.yaw += delta * Math.min(1, dt * 5.5);
  tryMoveEntity(player, dx / d * 4.8 * dt, dz / d * 4.8 * dt);
  return true;
}

app.on('update', (dt) => {
  dt = Math.min(dt, 0.05);
  const intent = manualIntent();
  if (intent.active && autoMode) { autoMode = false; $('autoBtn').classList.remove('active'); }
  if (!updateAuto(dt) && intent.active) {
    const yaw = player.yaw * Math.PI / 180;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(joystick.x, joystick.y) > 0.92;
    const speed = sprint ? 10.8 : 6.8;
    const dx = (fx * intent.forward + rx * intent.strafe) * speed * dt;
    const dz = (fz * intent.forward + rz * intent.strafe) * speed * dt;
    tryMoveEntity(player, dx, dz);
  }

  if (!player.grounded || player.vy !== 0) {
    player.vy -= 18 * dt;
    player.y += player.vy * dt;
    if (player.y <= 0) { player.y = 0; player.vy = 0; player.grounded = true; }
  }

  updateZombies(dt);
  setPlayerCamera();

  const dist = Math.hypot(player.x - mallEntrance.x, player.z - mallEntrance.z);
  $('distance').textContent = missionComplete ? 'KLART' : `${Math.round(dist)} m`;
  $('coords').textContent = `${Math.round(player.x)} · ${Math.round(player.z)}`;
  $('health').textContent = `HP ${Math.max(0, Math.round(player.health))}`;
  $('health').classList.toggle('danger', player.health < 40); $('health').classList.toggle('ok', player.health >= 40);

  fpsFrames++;
  const now = performance.now();
  if (now - fpsTime > 650) {
    fpsValue = Math.round(fpsFrames * 1000 / (now - fpsTime)); fpsFrames = 0; fpsTime = now;
    $('fps').textContent = `${fpsValue} FPS`;
  }
  mapTick += dt;
  if (mapTick > 0.12) { mapTick = 0; drawMap(false); }

  if (!missionComplete && Math.abs(player.x - mall.x) < 17 && Math.abs(player.z - mall.z) < 11) {
    missionComplete = true;
    toast('MITT I CITY · Uppdrag 1 klart!', 2400);
  }
});

function drawMap(force) {
  const c = $('mini'), wrap = $('miniWrap');
  if (!c || (!force && document.visibilityState === 'hidden')) return;
  const rect = wrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = Math.max(80, Math.round(rect.width * dpr)), h = Math.max(80, Math.round(rect.height * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cw = rect.width, ch = rect.height;
  ctx.fillStyle = '#071018'; ctx.fillRect(0, 0, cw, ch);
  const range = mapExpanded ? 310 : 245;
  const scale = Math.min(cw, ch) / (range * 2);
  const mx = (x) => cw / 2 + x * scale, mz = (z) => ch / 2 + z * scale;

  ctx.strokeStyle = '#6a747d'; ctx.lineWidth = mapExpanded ? 1.2 : 0.75;
  for (const poly of mapPolys) {
    ctx.beginPath();
    poly.forEach((p, i) => { if (i === 0) ctx.moveTo(mx(p.x), mz(p.z)); else ctx.lineTo(mx(p.x), mz(p.z)); });
    ctx.closePath(); ctx.stroke();
  }
  if (autoRoute.length) {
    ctx.strokeStyle = '#ffd400'; ctx.lineWidth = mapExpanded ? 3 : 2; ctx.beginPath();
    autoRoute.forEach((p, i) => { if (i === 0) ctx.moveTo(mx(p.x), mz(p.z)); else ctx.lineTo(mx(p.x), mz(p.z)); }); ctx.stroke();
  }
  ctx.fillStyle = '#55d68b'; ctx.beginPath(); ctx.arc(mx(mall.x), mz(mall.z), mapExpanded ? 7 : 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.arc(mx(0), mz(0), mapExpanded ? 5 : 3, 0, Math.PI * 2); ctx.fill();
  for (const z of zombies) { ctx.fillStyle = '#e5524b'; ctx.beginPath(); ctx.arc(mx(z.x), mz(z.z), mapExpanded ? 4 : 2, 0, Math.PI * 2); ctx.fill(); }

  const a = player.yaw * Math.PI / 180;
  const px = mx(player.x), pz = mz(player.z);
  ctx.save(); ctx.translate(px, pz); ctx.rotate(-a); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore();

  if (mapExpanded) {
    ctx.fillStyle = '#fff'; ctx.font = '700 12px system-ui';
    ctx.fillText('STORA TORGET', mx(0) + 10, mz(0) - 8);
    ctx.fillText('MITT I CITY', mx(mall.x) + 10, mz(mall.z) - 8);
  }
}

drawMap(true);
progress('PlayCanvas redo — startar spelet…', 100);
setTimeout(() => boot.classList.add('hide'), 280);
setTimeout(() => boot.style.display = 'none', 700);
toast(coarse ? 'Vänster joystick = gå · dra höger sida = titta' : 'WASD · mus = titta · E use · F fire · G auto · Z zombie', 2600);
