import {LastRound, RULES, layoutFor, normalizeSeed} from './last-round-rules.mjs?v=1.8.0';

export function createLastRound(pc, host) {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const seed = normalizeSeed(params.get('seed'));
  const target = Math.max(0, Math.min(999999, Number(params.get('target')) || 0));
  const layout = layoutFor(seed, host.origin);
  const game = new LastRound(layout, host.blocked);
  const coarse = matchMedia('(pointer:coarse)').matches;
  const root = new pc.Entity('Sista rundan at OLearys'); host.app.root.addChild(root);
  const actorViews = new Map(); const chargers = [];
  let panel = 'intro', previousTime = performance.now(), uiTime = 0;
  let pressAt = null, pressPointer = null, shotFlash = 0, toastUntil = 0, soundEnabled = true, audio;
  let hadPointerLock = false;
  const recordKey = 'karlstad:last-round:' + RULES.version + ':' + seed;
  let best = 0;
  try {best = Math.max(0, Number(localStorage.getItem(recordKey)) || 0);} catch {}

  function material(hex) {
    const m = new pc.StandardMaterial(); m.diffuse = new pc.Color().fromString(hex); m.gloss = .15; m.update(); return m;
  }
  const dark = material('#163b32'), gold = material('#f2c44e'), cream = material('#fff1cb');
  function primitive(name, type, x, y, z, sx, sy, sz, mat = dark, parent = root) {
    const e = new pc.Entity(name); e.addComponent('render', {type}); e.render.material = mat;
    e.setLocalPosition(x, y, z); e.setLocalScale(sx, sy, sz); parent.addChild(e); return e;
  }
  function texture(draw, w = 512, h = 512) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new pc.Texture(host.app.graphicsDevice, {width: w, height: h, mipmaps: true, minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR, magFilter: pc.FILTER_LINEAR});
    t.setSource(c); return t;
  }
  function card(name, tex, w, h, x, y, z) {
    const mesh = new pc.Mesh(host.app.graphicsDevice);
    mesh.setPositions([-w / 2, 0, 0, w / 2, 0, 0, w / 2, h, 0, -w / 2, h, 0]);
    mesh.setNormals([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    mesh.setUvs(0, [0, 0, 1, 0, 1, 1, 0, 1]); mesh.setIndices([0, 1, 2, 0, 2, 3]); mesh.update(pc.PRIMITIVE_TRIANGLES);
    const m = new pc.BasicMaterial(); m.colorMap = tex; m.blendType = pc.BLEND_NORMAL; m.alphaTest = .12; m.cull = pc.CULLFACE_NONE; m.update();
    const e = new pc.Entity(name); e.addComponent('render', {meshInstances: [new pc.MeshInstance(mesh, m)]});
    e.setPosition(x, y, z); root.addChild(e); return e;
  }
  function labelTex(lines, bg = '#163b32', fg = '#ffe7a0') {
    return texture((c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = fg; c.lineWidth = 12; c.strokeRect(9, 9, w - 18, h - 18);
      c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach((text, i) => {c.font = `900 ${lines.length === 1 ? 64 : 46}px sans-serif`; c.fillText(text, w / 2, (i + .5) * h / lines.length, w - 40);});
    }, 512, 160);
  }
  function fanTex(kind, shirt = '#f6bd42') {
    return texture((c, w, h) => {
      c.scale(w / 256, h / 384); c.lineJoin = 'round'; c.lineCap = 'round';
      function shape(fill, fn, stroke = '#122b2b', width = 7) {c.beginPath(); fn(); c.fillStyle = fill; c.fill(); c.strokeStyle = stroke; c.lineWidth = width; c.stroke();}
      function box(x, y, a, b, fill, r = 9) {shape(fill, () => c.roundRect(x, y, a, b, r));}
      function oval(x, y, a, b, fill) {shape(fill, () => c.ellipse(x, y, a, b, 0, 0, Math.PI * 2));}
      if (kind === 'bin') {
        box(58, 113, 142, 221, '#548170'); box(47, 99, 164, 29, '#264b43');
        box(90, 87, 73, 18, '#d0d5ae'); box(77, 148, 106, 90, '#f4cb5f');
        c.fillStyle = '#213e36'; c.font = '900 32px sans-serif'; c.textAlign = 'center'; c.fillText('PANT', 129, 204);
        for (let x = 86; x < 182; x += 28) box(x, 256, 7, 50, '#294e42', 2);
        oval(78, 344, 14, 17, '#20332f'); oval(180, 344, 14, 17, '#20332f'); return;
      }
      const guard = kind === 'guard', boss = kind === 'boss';
      box(82, 278, 34, 73, '#3b475b'); box(140, 278, 34, 73, '#3b475b');
      box(65, 337, 58, 24, '#efe5c3'); box(136, 337, 58, 24, '#efe5c3');
      box(61, 161, 137, 139, guard ? '#283c44' : shirt, 20);
      shape(guard ? '#eac49c' : '#a4c978', () => {c.moveTo(69, 179); c.lineTo(43, 248); c.lineTo(60, 262); c.lineTo(90, 218); c.closePath();});
      shape(guard ? '#eac49c' : '#a4c978', () => {c.moveTo(189, 179); c.lineTo(222, 210); c.lineTo(208, 232); c.lineTo(175, 214); c.closePath();});
      box(88, 82, 83, 92, guard ? '#efc597' : '#bdd88d', 27);
      oval(87, 125, 11, 15, guard ? '#eac49c' : '#a4c978');
      box(83, 73, 95, 35, guard ? '#162830' : '#214b48', 9);
      if (guard) {
        box(97, 120, 63, 15, '#162830', 4); c.strokeStyle = '#d6ecdd'; c.lineWidth = 3; c.beginPath(); c.moveTo(104, 124); c.lineTo(117, 124); c.stroke();
        box(80, 204, 94, 33, '#f3d66b', 3); c.fillStyle = '#21362e'; c.font = '900 18px sans-serif'; c.textAlign = 'center'; c.fillText('VAKT', 127, 227);
      } else {
        oval(108, 123, 14, 17, '#fff9db'); oval(148, 125, 16, 20, '#fff9db');
        oval(111, 127, 4, 7, '#16332f'); oval(146, 131, 5, 7, '#16332f');
        box(106, 149, 46, 12, '#273d34', 4); box(127, 149, 9, 11, '#fff8de', 1);
        box(92, 171, 73, 18, '#fff2c4', 4); box(92, 179, 18, 66, '#fff2c4', 4);
        c.fillStyle = '#193c35'; c.font = '900 58px sans-serif'; c.textAlign = 'center'; c.fillText(boss ? '90+' : '12', 137, 262);
      }
      if (boss) {
        shape('#f6c34b', () => {c.moveTo(194, 226); c.lineTo(181, 158); c.lineTo(185, 67); c.quadraticCurveTo(198, 53, 209, 69); c.lineTo(210, 130); c.lineTo(229, 119); c.lineTo(246, 139); c.lineTo(240, 211); c.closePath();});
        c.fillStyle = '#18372e'; c.font = '900 47px sans-serif'; c.fillText('1', 213, 185);
      }
    }, 256, 384);
  }

  // Five inexpensive illustrated billboards keep the existing render budget intact.
  const shirts = ['#e7b94e', '#72afd0', '#e87963'];
  game.actors.forEach((a, i) => {
    const h = a.kind === 'boss' ? 3.4 : a.kind === 'bin' ? 1.7 : 2.55;
    const e = card(a.name, fanTex(a.kind, shirts[i % 3]), h * .7, h, a.x, .03, a.z);
    const shadowMat = material('#3d4d43');
    const shadow = primitive('fan-shadow', 'cylinder', a.x, .055, a.z, a.radius * 2, .02, a.radius * 1.3, shadowMat);
    actorViews.set(a.id, {e, shadow, h});
  });
  const guard = card('Vakten', fanTex('guard'), 1.65, 2.6, layout.guard.x, .02, layout.guard.z);
  const guardSign = card('Starta hos vakten', labelTex(['SISTA RUNDAN', '90 SEK • PRATA MED VAKTEN']), 4.7, 1.4, layout.guard.x, 3.0, layout.guard.z);
  const oSign = card('OLearys readable sign', labelTex(["O’LEARYS"], '#f3eccf', '#145c38'), 9.9, .69, host.origin.x - 1.37, 4.3, host.origin.z);
  oSign.setEulerAngles(0, -90, 0);
  const goalTexture = texture((c, w, h) => {
    c.fillStyle = '#184b42bb'; c.beginPath(); c.arc(w / 2, h / 2, 234, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffdc78'; c.lineWidth = 17; c.setLineDash([35, 13]); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#ffecb7'; c.textAlign = 'center'; c.font = '900 66px sans-serif'; c.fillText('HEMGÅNG', w / 2, h / 2 + 23);
    c.font = '900 25px sans-serif'; c.fillText('KNUFFA FANSEN HIT', w / 2, h / 2 + 68);
  });
  const goal = card('Hemgång zone', goalTexture, layout.goal.radius * 2, layout.goal.radius * 2, layout.goal.x, .1, layout.goal.z + layout.goal.radius);
  goal.setEulerAngles(-90, 0, 0);
  const goalSign = card('Hemgång sign', labelTex(['HEMGÅNG', '↓ FANSEN HIT ↓']), 5.4, 1.6, layout.goal.x, 2.5, layout.goal.z - 4);
  primitive('sign-post', 'box', layout.goal.x, 1.35, layout.goal.z - 4, .15, 2.7, .15);
  const b = layout.bounds;
  primitive('court-line-a', 'box', b.minX, .07, (b.minZ + b.maxZ) / 2, .12, .025, b.maxZ - b.minZ, gold);
  primitive('court-line-b', 'box', b.maxX, .07, (b.minZ + b.maxZ) / 2, .12, .025, b.maxZ - b.minZ, gold);
  primitive('court-line-c', 'box', (b.minX + b.maxX) / 2, .07, b.maxZ, b.maxX - b.minX, .025, .12, gold);
  for (const c of layout.chargers) {
    primitive('solar-pad', 'cylinder', c.x, .07, c.z, 1.7, .08, 1.7, dark);
    chargers.push(primitive('solar-charge', 'sphere', c.x, .85, c.z, .65, .65, .65, gold));
  }

  $('roundSeed').textContent = `RUNDA ${seed} · ${target ? 'SLÅ ' + target.toLocaleString('sv-SE') + ' POÄNG' : 'DITT REKORD: ' + best.toLocaleString('sv-SE')}`;
  $('roundIntroControls').textContent = coarse ? 'Dra för att sikta · tryck SOLSTÖT · håll för superstöten' : 'WASD: gå · mus: sikta · klick: solstöt · håll + släpp: superstöt';
  function setPanel(name) {
    panel = name; document.body.classList.toggle('round-panel-open', !!name);
    $('roundPanel').hidden = !name;
    for (const id of ['intro', 'pause', 'result', 'map']) $('round-' + id).hidden = name !== id;
    host.resetInput(); pressAt = null; pressPointer = null;
    if (name) {document.exitPointerLock?.(); queueMicrotask(() => $('round-' + name).querySelector('button')?.focus({preventScroll: true}));}
  }
  function lockPointer() {
    if (coarse) return;
    try {const p = host.canvas.requestPointerLock?.(); p?.catch?.(() => {});} catch {}
  }
  function start() {
    game.start(); host.resetPickups(); host.teleport(layout.spawn.x, layout.spawn.z, 0, -5);
    document.body.classList.add('round-playing');
    setPanel(null); previousTime = performance.now();
    $('roundHud').hidden = false; $('roundLaunch').hidden = true;
    toast('SISTA RUNDAN!', 'Knuffa fansen till den gula HEMGÅNG-zonen.', 4.5);
    sound('start'); lockPointer();
  }
  function explore() {
    game.phase = 'ready'; setPanel(null); $('roundHud').hidden = true; $('roundLaunch').hidden = false;
    document.body.classList.remove('round-playing');
    host.resetInput(); lockPointer(); toast('KARLSTAD ÄR DITT', 'Träffa vakten vid O’Learys eller välj Sista rundan.', 3);
  }
  function pause(name = 'pause') {
    if (panel || game.phase !== 'playing') return;
    game.pause(); setPanel(name);
  }
  function resume() {
    game.resume(); setPanel(null); previousTime = performance.now(); lockPointer();
  }
  function toast(title, subtitle = '', seconds = 2) {
    $('roundToastTitle').textContent = title; $('roundToastText').textContent = subtitle;
    $('roundToast').classList.add('visible'); toastUntil = performance.now() + seconds * 1000;
  }
  function sound(kind) {
    if (!soundEnabled) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(() => {});
      const freq = {shot: 170, charge: 95, capture: 620, chain: 780, boss: 90, energy: 900, start: 420, win: 660, bump: 130}[kind] || 360;
      const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
      o.type = kind === 'shot' || kind === 'charge' ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(kind === 'shot' || kind === 'charge' ? 35 : freq * 1.5, t + .17);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.06, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + .24);
    } catch {}
  }
  function beginShot(e) {
    if (panel || game.phase !== 'playing' || (e.button !== undefined && e.button !== 0)) return;
    if (!coarse && e.currentTarget === host.canvas && document.pointerLockElement !== host.canvas) {lockPointer(); return;}
    if (pressAt !== null) return;
    pressAt = performance.now(); pressPointer = e.pointerId;
    if (e.currentTarget === $('fireBtn')) {e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault();}
  }
  function endShot(e) {
    if (pressAt === null || (e.pointerId !== undefined && e.pointerId !== pressPointer)) return;
    const held = (performance.now() - pressAt) / 1000; pressAt = null; pressPointer = null;
    const p = host.player.getPosition(), f = host.camera.forward;
    const shot = game.shoot({x: p.x, z: p.z, y: p.y, dx: f.x, dz: f.z, dy: f.y, held, assist: coarse});
    if (shot) {shotFlash = .19; $('solarWeapon').classList.remove('recoil'); void $('solarWeapon').offsetWidth; $('solarWeapon').classList.add('recoil');}
  }
  function use() {
    if (panel) return;
    if (game.phase === 'playing') {toast('VAKTEN: ”INGEN FÖRLÄNGNING.”', 'Sikta på fansen. Håll solstöten för mer kraft.'); return;}
    const p = host.player.getPosition();
    if (Math.hypot(p.x - layout.guard.x, p.z - layout.guard.z) < 7) setPanel('intro');
    else toast('VAKTEN VÄNTAR', 'Följ kompassen till O’Learys.');
  }
  function showMap() {
    if (panel === 'map') {game.phase === 'paused' ? resume() : setPanel(null); return;}
    if (panel) return;
    if (game.phase === 'playing') game.pause(); setPanel('map'); drawMap();
  }
  function drawMap() {
    const c = $('roundMap').getContext('2d'), size = 500;
    c.fillStyle = '#142b29'; c.fillRect(0, 0, size, size);
    const scale = 1.45, center = {x: 0, z: 15};
    const point = (x, z) => [(x - center.x) * scale + size / 2, (z - center.z) * scale + size / 2];
    c.strokeStyle = '#537064'; c.lineWidth = 10;
    for (const [x1, z1, x2, z2] of [[-26, -180, -26, 180], [-180, 20, 180, 20]]) {
      c.beginPath(); c.moveTo(...point(x1, z1)); c.lineTo(...point(x2, z2)); c.stroke();
    }
    c.fillStyle = '#52695b';
    for (const b of host.colliders) {const [x, y] = point(b.minx, b.minz); c.fillRect(x, y, (b.maxx - b.minx) * scale, (b.maxz - b.minz) * scale);}
    function dot(x, z, label, color) {const [px, py] = point(x, z); c.fillStyle = color; c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fill(); c.font = 'bold 14px sans-serif'; c.fillText(label, px + 10, py - 5);}
    dot(0, 0, 'TORGET', '#f5ecd1'); dot(host.mall.x, host.mall.z, 'MITT I CITY', '#c9d7c9');
    dot(layout.goal.x, layout.goal.z, 'SISTA RUNDAN', '#f5c558');
    const p = host.player.getPosition(); dot(p.x, p.z, 'DU', '#73ded0');
    const f = host.camera.forward, [px, py] = point(p.x, p.z);
    c.strokeStyle = '#73ded0'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px + f.x * 17, py + f.z * 17); c.stroke();
  }
  function finish(won) {
    const previousBest = best;
    if (won && game.score > best) {best = game.score; try {localStorage.setItem(recordKey, String(best));} catch {}}
    $('roundResultEyebrow').textContent = won ? 'O’LEARYS ÄR RÄDDAT' : 'VAKTEN BEGÄR FÖRSTÄRKNING';
    $('roundResultTitle').textContent = won ? 'STÄNGT & KLART.' : 'DE VILL HA FÖRLÄNGNING.';
    $('roundResultScore').textContent = game.score.toLocaleString('sv-SE');
    $('roundResultDetail').textContent = `${game.captured}/4 fans hemma · ${game.accuracy}% träffsäkerhet · bästa kedja ${game.bestChain}×`;
    $('roundResultRecord').textContent = won && best > previousBest ? 'NYTT PERSONBÄSTA!' : `DITT REKORD: ${best.toLocaleString('sv-SE')}`;
    $('roundResultTarget').textContent = target ? (won && game.score > target ? `Du slog utmaningen på ${target} poäng!` : `Kompisens resultat: ${target} poäng`) : `Runda ${seed} · samma placeringar varje försök`;
    $('roundShare').textContent = 'UTMANA EN VÄN'; $('roundShare').disabled = !won;
    setPanel('result'); sound(won ? 'win' : 'boss');
  }
  async function share() {
    const url = new URL(location.href); url.search = ''; url.hash = '';
    url.searchParams.set('challenge', 'sista-rundan'); url.searchParams.set('seed', String(seed)); url.searchParams.set('target', String(game.score));
    const data = {title: 'Sista rundan i Karlstad', text: `Jag skickade hem zombiefansen på O’Learys med ${game.score} poäng. Slå min runda!`, url: url.href};
    try {
      if (navigator.share) await navigator.share(data);
      else if (navigator.clipboard?.writeText) {await navigator.clipboard.writeText(url.href); $('roundShare').textContent = 'LÄNK KOPIERAD!';}
      else { $('roundShareLink').hidden = false; $('roundShareLink').value = url.href; $('roundShareLink').select(); }
    } catch (e) {if (e.name !== 'AbortError') { $('roundShareLink').hidden = false; $('roundShareLink').value = url.href; $('roundShareLink').select(); }}
  }
  $('roundStart').addEventListener('click', start); $('roundRetry').addEventListener('click', start);
  $('roundExplore').addEventListener('click', explore); $('roundLeave').addEventListener('click', explore);
  $('roundResume').addEventListener('click', resume); $('roundRestart').addEventListener('click', start);
  $('roundQuit').addEventListener('click', explore); $('roundShare').addEventListener('click', share);
  $('roundLaunch').addEventListener('click', () => setPanel('intro'));
  $('roundPause').addEventListener('click', () => game.phase === 'playing' ? pause() : setPanel('intro'));
  $('roundMapClose').addEventListener('click', () => {game.phase === 'paused' ? resume() : setPanel(null);});
  $('roundMute').addEventListener('click', () => {soundEnabled = !soundEnabled; $('roundMute').textContent = soundEnabled ? 'LJUD PÅ' : 'LJUD AV';});
  $('fireBtn').addEventListener('pointerdown', beginShot); host.canvas.addEventListener('pointerdown', beginShot);
  window.addEventListener('pointerup', endShot); window.addEventListener('pointercancel', () => {pressAt = null; pressPointer = null;});
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === host.canvas;
    if (hadPointerLock && !locked && game.phase === 'playing') pause(); hadPointerLock = locked;
  });
  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'Escape') {if (!panel) pause(); else if (panel === 'pause' || panel === 'map') resume();}
    if (panel) return;
    if (e.code === 'KeyE') use();
    if (e.code === 'KeyM') showMap();
    if (e.code === 'KeyR' && game.phase === 'playing') pause();
  });
  window.addEventListener('blur', () => {host.resetInput(); pressAt = null; if (game.phase === 'playing') pause();});
  document.addEventListener('visibilitychange', () => {if (document.hidden && game.phase === 'playing') pause();});
  $('fireBtn').textContent = 'SOLSTÖT'; $('useBtn').textContent = 'PRATA'; $('jumpBtn').textContent = 'HOPPA';
  window.KarlstadRound = Object.freeze({version: '1.8.0', snapshot: () => ({phase: game.phase, score: game.score, energy: game.energy,
    remaining: game.remaining, seed, captured: game.captured, shots: game.shots, bestChain: game.bestChain,
    player: {x: host.player.getPosition().x, z: host.player.getPosition().z}, forward: {x: host.camera.forward.x, y: host.camera.forward.y, z: host.camera.forward.z},
    actors: game.actors.map(a => ({id: a.id, x: a.x, z: a.z, active: a.active})), goal: {...layout.goal}})});
  setPanel('intro');

  function update() {
    const now = performance.now(), dt = Math.min(1, Math.max(0, (now - previousTime) / 1000)); previousTime = now;
    const p = host.player.getPosition();
    if (game.phase === 'playing') game.step(dt, p);
    for (const event of game.drainEvents()) {
      if (event.type === 'shot') {sound(event.charged ? 'charge' : 'shot'); $('reticle').classList.toggle('hit', event.hit); if (!event.hit && game.shots < 3) toast('SIKTA PÅ FANSEN', 'Knuffa dem från din sida mot HEMGÅNG.');}
      if (event.type === 'chain') {sound('chain'); toast(`${event.count}× KEDJETRÄFF!`, 'Det där räknas som lagarbete.');}
      if (event.type === 'capture') {sound('capture'); toast(event.boss ? 'INGEN MER ÖVERTID.' : 'HEM MED DIG!', event.boss ? 'Vakten kan äntligen gå på rast.' : event.name + ' har lämnat matchen.');}
      if (event.type === 'boss') {sound('boss'); toast('KAPTEN ÖVERTID!', 'Stor skumhand. Liten verklighetsförankring. Håll för superstöt.', 4);}
      if (event.type === 'energy') {sound('energy'); toast('SOLENERGI +35', 'Håll solstöten och släpp för extra kraft.');}
      if (event.type === 'bump') {sound('bump'); toast('”JAG STOD FAKTISKT HÄR.”', 'Håll lite avstånd. −15 poäng.');}
      if (event.type === 'finish') finish(event.won);
    }
    for (const a of game.actors) {
      const v = actorViews.get(a.id); v.e.enabled = a.active; v.shadow.enabled = a.active;
      if (!a.active) continue;
      const speed = Math.hypot(a.vx, a.vz), bounce = game.phase === 'playing' ? Math.abs(Math.sin(game.elapsed * 5 + a.phase)) * .045 + Math.min(.3, speed * .014) : 0;
      v.e.setPosition(a.x, .025 + bounce, a.z); v.e.setEulerAngles(0, Math.atan2(p.x - a.x, p.z - a.z) * 180 / Math.PI, Math.sin(game.elapsed * 9) * Math.min(13, speed));
      v.shadow.setPosition(a.x, .055, a.z);
    }
    const face = Math.atan2(p.x - layout.guard.x, p.z - layout.guard.z) * 180 / Math.PI;
    guard.setEulerAngles(0, face, 0); guardSign.setEulerAngles(0, face, 0);
    chargers.forEach((e, i) => {e.enabled = game.chargerTimes[i] === 0; e.setLocalPosition(layout.chargers[i].x, .85 + Math.sin(now / 600 + i) * .12, layout.chargers[i].z);});
    if (now > toastUntil) $('roundToast').classList.remove('visible');
    shotFlash = Math.max(0, shotFlash - dt);
    $('solarFlash').style.opacity = shotFlash > 0 ? String(shotFlash * 3) : '0';
    if (!shotFlash) $('reticle').classList.remove('hit');
    const charging = pressAt === null ? 0 : Math.min(1, (now - pressAt) / (RULES.chargeSeconds * 1000));
    document.body.classList.toggle('solar-charged', charging === 1 && game.energy >= RULES.chargeCost);
    $('chargeArc').style.setProperty('--charge', (charging * 100) + '%');
    $('solarWeapon').hidden = game.phase === 'ready' || !!panel;
    uiTime += dt;
    if (uiTime > .08) {
      uiTime = 0;
      $('roundScore').textContent = game.score.toLocaleString('sv-SE'); $('roundTime').textContent = String(Math.ceil(game.remaining)).padStart(2, '0');
      $('roundTime').classList.toggle('urgent', game.remaining <= 15); $('roundProgress').textContent = `${game.captured}/4`;
      $('roundEnergy').style.width = game.energy + '%'; $('roundEnergyText').textContent = Math.round(game.energy) + '%';
      $('roundPhase').textContent = game.captured < 3 ? 'KNUFFA 3 FANS TILL HEMGÅNG' : 'SKICKA HEM KAPTEN ÖVERTID';
      const dist = Math.hypot(p.x - layout.guard.x, p.z - layout.guard.z);
      if (game.phase === 'ready') {
        $('mission').textContent = dist < 7 ? (coarse ? 'PRATA MED VAKTEN · STARTA SISTA RUNDAN' : 'E · PRATA MED VAKTEN · STARTA SISTA RUNDAN') : `O’LEARYS · SISTA RUNDAN · ${Math.round(dist)} m`;
      } else $('mission').textContent = 'SISTA RUNDAN · O’LEARYS';
      $('status').textContent = `FPS ${Math.round(host.app.stats.frame.fps)} · ${host.pickupCount()}/8 fynd`;
      const direction = Math.atan2(layout.guard.x - p.x, layout.guard.z - p.z) - Math.atan2(host.camera.forward.x, host.camera.forward.z);
      $('roundCompassArrow').style.transform = `rotate(${-direction * 180 / Math.PI}deg)`;
      $('roundCompassText').textContent = game.phase === 'playing' ? 'HEMGÅNG: GUL ZON' : `O’LEARYS ${Math.round(dist)} m`;
      if (game.phase === 'playing' && (p.x < b.minX - 5 || p.x > b.maxX + 5 || p.z < b.minZ - 5 || p.z > b.maxZ + 5)) $('roundPhase').textContent = 'TILLBAKA TILL O’LEARYS · TIDEN GÅR';
    }
  }
  return {update, use, showMap, blocksInput: () => !!panel, playing: () => game.phase === 'playing',
    onPickup: (type, value) => {if (game.phase === 'playing') {if(type === 'energy') game.energy = Math.min(100, game.energy + value); else game.score += value;}}};
}
