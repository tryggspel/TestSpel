import {LastRound, RULES, layoutFor, normalizeSeed} from './last-round-rules.mjs?v=2.0.0';
import {chooseAimTarget, pushGuide} from './last-round-controls.mjs?v=2.0.0';
import {CityNavigation, CityMission, MISSIONS} from './city-missions.mjs?v=2.0.0';

export function createLastRound(pc, host) {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const seed = normalizeSeed(params.get('seed'));
  const target = Math.max(0, Math.min(999999, Number(params.get('target')) || 0));
  const olearyLayout = layoutFor(seed, host.origin);
  const navigation = new CityNavigation(host.blocked);
  const rounds = {'sista-rundan':new LastRound(olearyLayout,host.blocked),fikapanik:new CityMission('fikapanik',navigation,host.mall,seed),'radda-fikat':new CityMission('radda-fikat',navigation,host.mall,seed)};
  let selectedMission = MISSIONS.some(m=>m.id===params.get('challenge')) ? params.get('challenge') : 'sista-rundan';
  let game = rounds['sista-rundan'], layout = olearyLayout;
  const missionInfo = () => MISSIONS.find(m=>m.id===selectedMission);
  const isPush = () => game === rounds['sista-rundan'];
  const coarse = matchMedia('(pointer:coarse)').matches;
  const root = new pc.Entity('Sista rundan at OLearys'); host.app.root.addChild(root);
  const actorViews = new Map(); const chargers = [], chargerPads = [];
  let panel = 'intro', previousTime = performance.now(), uiTime = 0;
  let shotFlash = 0, toastUntil = 0, soundEnabled = true, audio;
  let aimHelp = true, currentTarget = null, currentGuide = null, triggerPointer = null, damageFlash = 0;
  try {const saved = localStorage.getItem('karlstad:aim-help:v2'); if (saved !== null) aimHelp = saved === 'on';} catch {}
  let hadPointerLock = false;
  let recordKey = ''; const completedKey='karlstad:missions:2'; let completed={};
  try {completed=JSON.parse(localStorage.getItem(completedKey)||'{}')||{};} catch {}
  let best = 0;


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
    const t = new pc.Texture(host.app.graphicsDevice, {width: w, height: h, flipY: true, mipmaps: true, minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR, magFilter: pc.FILTER_LINEAR});
    t.setSource(c); return t;
  }
  function card(name, tex, w, h, x, y, z, twoSided = false) {
    const mesh = new pc.Mesh(host.app.graphicsDevice);
    mesh.setPositions([-w / 2, 0, 0, w / 2, 0, 0, w / 2, h, 0, -w / 2, h, 0]);
    mesh.setNormals([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
    mesh.setUvs(0, [0, 0, 1, 0, 1, 1, 0, 1]); mesh.setIndices([0, 1, 2, 0, 2, 3]); mesh.update(pc.PRIMITIVE_TRIANGLES);
    const m = new pc.StandardMaterial(); m.useLighting = false; m.diffuse.set(0, 0, 0);
    m.emissive.set(1, 1, 1); m.emissiveMap = tex; m.opacityMap = tex; m.opacityMapChannel = 'a';
    m.blendType = pc.BLEND_NORMAL; m.alphaTest = .12; m.cull = pc.CULLFACE_BACK; m.update();
    const instances = [new pc.MeshInstance(mesh, m)];
    if (twoSided) {
      // A separately UV-mapped back keeps lettering readable from either side.
      const back = new pc.Mesh(host.app.graphicsDevice);
      back.setPositions([-w / 2, 0, 0, w / 2, 0, 0, w / 2, h, 0, -w / 2, h, 0]);
      back.setNormals([0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1]);
      back.setUvs(0, [1, 0, 0, 0, 0, 1, 1, 1]); back.setIndices([0, 2, 1, 0, 3, 2]); back.update(pc.PRIMITIVE_TRIANGLES);
      instances.push(new pc.MeshInstance(back, m));
    }
    const e = new pc.Entity(name); e.addComponent('render', {meshInstances: instances});
    e.setPosition(x, y, z); root.addChild(e); return e;
  }
  function labelTex(lines, bg = '#163b32', fg = '#ffe7a0') {
    return texture((c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = fg; c.lineWidth = 12; c.strokeRect(9, 9, w - 18, h - 18);
      c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach((text, i) => {c.font = `900 ${lines.length === 1 ? 64 : 46}px sans-serif`; c.fillText(text, w / 2, (i + .5) * h / lines.length, w - 40);});
    }, 512, 160);
  }
  const fanTextures = new Map();
  function fanTex(kind, shirt = '#f6bd42') {
    const key=kind+shirt;if(fanTextures.has(key))return fanTextures.get(key);
    const result=texture((c, w, h) => {
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
        c.fillStyle = '#193c35'; c.font = '900 58px sans-serif'; c.textAlign = 'center'; c.fillText(boss ? '90+' : kind==='runner' ? '>>' : kind==='tank' ? 'XL' : kind==='walker' ? 'KAFFE' : '12', 137, 262);
      }
      if(kind==='runner'){box(85,99,89,12,'#ff7656',3);}
      if(kind==='tank'){box(187,195,40,93,'#c9dfdb',8);box(188,187,39,17,'#34584c',3);}
      if (boss) {
        shape('#f6c34b', () => {c.moveTo(194, 226); c.lineTo(181, 158); c.lineTo(185, 67); c.quadraticCurveTo(198, 53, 209, 69); c.lineTo(210, 130); c.lineTo(229, 119); c.lineTo(246, 139); c.lineTo(240, 211); c.closePath();});
        c.fillStyle = '#18372e'; c.font = '900 47px sans-serif'; c.fillText('1', 213, 185);
      }
    }, 256, 384);
    fanTextures.set(key,result);return result;
  }

  // One reusable 12-zombie pool; inactive billboards and shadows are not rendered.
  const shirts = ['#e7b94e', '#72afd0', '#e87963'];
  [...game.actors, ...rounds.fikapanik.actors].forEach((a, i) => {
    const h = a.kind === 'boss' ? 3.4 : a.kind === 'bin' ? 1.7 : 2.55;
    const e = card(a.name, fanTex(a.kind, shirts[i % 3]), h * .7, h, a.x, .03, a.z);
    const shadowMat = material('#3d4d43');
    const shadow = primitive('fan-shadow', 'cylinder', a.x, .055, a.z, a.radius * 2, .02, a.radius * 1.3, shadowMat);
    actorViews.set(a.id, {e, shadow, h, kind:a.kind});
  });
  const guard = card('Vakten', fanTex('guard'), 1.65, 2.6, layout.guard.x, .02, layout.guard.z);
  const guardSign = card('Starta hos vakten', labelTex(['SISTA RUNDAN', '90 SEK • PRATA MED VAKTEN']), 4.7, 1.4, layout.guard.x, 3.0, layout.guard.z);
  const oSign = card('OLearys readable sign', labelTex(["O’LEARYS"], '#f3eccf', '#145c38'), 9.9, .69, host.origin.x - 1.37, 4.3, host.origin.z, true);
  oSign.setEulerAngles(0, -90, 0);
  const goalTexture = texture((c, w, h) => {
    c.fillStyle = '#184b42bb'; c.beginPath(); c.arc(w / 2, h / 2, 234, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#ffdc78'; c.lineWidth = 17; c.setLineDash([35, 13]); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#ffecb7'; c.textAlign = 'center'; c.font = '900 66px sans-serif'; c.fillText('HEMGÅNG', w / 2, h / 2 + 23);
    c.font = '900 25px sans-serif'; c.fillText('KNUFFA FANSEN HIT', w / 2, h / 2 + 68);
  });
  const goal = card('Hemgång zone', goalTexture, layout.goal.radius * 2, layout.goal.radius * 2, layout.goal.x, .1, layout.goal.z + layout.goal.radius);
  goal.setEulerAngles(-90, 0, 0);
  const goalSign = card('Hemgång sign', labelTex(['HEMGÅNG', '↓ FANSEN HIT ↓']), 5.4, 1.6, layout.goal.x, 2.5, layout.goal.z - 4, true);
  primitive('sign-post', 'box', layout.goal.x, 1.35, layout.goal.z - 4, .15, 2.7, .15);
  let b = layout.bounds;
  primitive('court-line-a', 'box', b.minX, .07, (b.minZ + b.maxZ) / 2, .12, .025, b.maxZ - b.minZ, gold);
  primitive('court-line-b', 'box', b.maxX, .07, (b.minZ + b.maxZ) / 2, .12, .025, b.maxZ - b.minZ, gold);
  primitive('court-line-c', 'box', (b.minX + b.maxX) / 2, .07, b.maxZ, b.maxX - b.minX, .025, .12, gold);
  for (const c of layout.chargers) {
    chargerPads.push(primitive('solar-pad', 'cylinder', c.x, .07, c.z, 1.7, .08, 1.7, dark));
    chargers.push(primitive('solar-charge', 'sphere', c.x, .85, c.z, .65, .65, .65, gold));
  }

  const mint = material('#84e9bb'), orange = material('#f5ad62');
  const stance = primitive('Stand here', 'cylinder', 0, .09, 0, 1.3, .025, 1.3, mint);
  const stanceSign = card('Stand here label', labelTex(['STÅ HÄR'], '#173c32', '#a7f4ce'), 1.6, .5, 0, .6, 0);
  const pushLine = primitive('Actual push direction', 'box', 0, .13, 0, .12, .035, 2.4, mint);
  const pushHead = [0, 1].map(i => primitive('Push arrow ' + i, 'box', 0, .13, 0, .12, .035, .7, mint));
  const guideViews = [stance, stanceSign, pushLine, ...pushHead];
  guideViews.forEach(e => e.enabled = false);

  const thermosMaterial=material('#c4ded5');
  const thermosViews=rounds['radda-fikat'].pickupSpots.map((p,i)=>{
    const group=new pc.Entity('Fikatermos '+(i+1));root.addChild(group);group.setPosition(p.x,0,p.z);
    primitive('thermos-body','cylinder',0,.8,0,.65,1.1,.65,thermosMaterial,group);
    primitive('thermos-cap','cylinder',0,1.42,0,.68,.16,.68,dark,group);
    primitive('thermos-handle','box',.38,.9,0,.2,.5,.15,gold,group);
    primitive('thermos-marker','cylinder',0,.12,0,2.3,.03,2.3,gold,group);
    const label=card('Fika label',labelTex(['FIKA']),1.2,.38,0,1.7,0);group.addChild(label);
    group.enabled=false;return {group,label};
  });
  const delivery=rounds['radda-fikat'].delivery;
  const deliverySign=card('Fika delivery',labelTex(['LEVERERA FIKAT','MITT I CITY']),4.5,1.5,delivery.x,2.1,delivery.z,true);
  const deliveryPad=primitive('delivery-zone','cylinder',delivery.x,.09,delivery.z,5.5,.04,5.5,gold);
  deliverySign.enabled=deliveryPad.enabled=false;
  const plazaSign=card('Torget missions',labelTex(['FIKAPANIK','TORGET • 3 ZOMBIEVÅGOR']),4.6,1.4,8,2.6,6,true);
  const routePips=Array.from({length:18},(_,i)=>primitive('mission-route-'+i,'cylinder',0,.12,0,.34,.035,.34,gold));
  routePips.forEach(e=>e.enabled=false);
  const popTexture=labelTex(['SOLPAUS!'],'#ffda62','#183e31');
  const pops=Array.from({length:6},()=>({e:card('solar-pop',popTexture,2,.7,0,0,0),life:0,x:0,z:0}));
  pops.forEach(p=>p.e.enabled=false);let popIndex=0;
  function spawnPop(x,z){const pop=pops[popIndex++%pops.length];Object.assign(pop,{life:.65,x,z});}
  function updateMissionViews(p,dt,now){
    const deliveryActive=!isPush()&&selectedMission==='radda-fikat'&&game.phase!=='ready';
    thermosViews.forEach((v,i)=>{v.group.enabled=deliveryActive&&!game.pickups[i].collected;if(v.group.enabled){v.group.setLocalPosition(game.pickups[i].x,Math.sin(now/500+i)*.08,game.pickups[i].z);v.label.setEulerAngles(0,Math.atan2(p.x-game.pickups[i].x,p.z-game.pickups[i].z)*180/Math.PI,0);}});
    deliverySign.enabled=deliveryPad.enabled=deliveryActive&&game.collected===3;
    deliverySign.setEulerAngles(0,Math.atan2(p.x-delivery.x,p.z-delivery.z)*180/Math.PI,0);
    plazaSign.setEulerAngles(0,Math.atan2(p.x-8,p.z-6)*180/Math.PI,0);
    pops.forEach(pop=>{pop.life=Math.max(0,pop.life-dt);pop.e.enabled=pop.life>0;if(!pop.e.enabled)return;pop.e.setPosition(pop.x,1.6+(.65-pop.life)*1.8,pop.z);pop.e.setEulerAngles(0,Math.atan2(p.x-pop.x,p.z-pop.z)*180/Math.PI,0);});
    chargerPads.forEach((e,i)=>e.setPosition(layout.chargers[i].x,.07,layout.chargers[i].z));
  }
  function updateRoute(p,destination){
    const visible=!isPush()&&game.phase==='playing'&&selectedMission==='radda-fikat';
    const path=visible?navigation.path(p,destination).slice(1,19):[];
    routePips.forEach((e,i)=>{e.enabled=i<path.length;if(e.enabled)e.setPosition(path[i].x,.12,path[i].z);});
  }

  function selectMission(id) {
    selectedMission=id;const info=missionInfo();
    recordKey='karlstad:mission:2:'+id+':'+seed;best=0;
    try {best=Math.max(0,Number(localStorage.getItem(recordKey))||0);} catch {}
    $('roundIntroTitle').innerHTML=info.title;$('roundIntroLead').textContent=info.lead;$('roundIntroDescription').textContent=info.description;
    $('roundEpisode').textContent=info.place.toUpperCase();$('roundEpisodeTag').textContent=info.tag;
    $('roundSeed').textContent=`RUNDA ${seed} · REKORD ${best.toLocaleString('sv-SE')} · ${Object.keys(completed).length}/3 UPPDRAG KLARA`;
    for(const m of MISSIONS){const button=$('select-'+m.id);button.setAttribute('aria-pressed',String(m.id===id));button.classList.toggle('completed',!!completed[m.id]);}
  }
  for(const m of MISSIONS)$('select-'+m.id).addEventListener('click',()=>selectMission(m.id));
  selectMission(selectedMission);
  const controlText = coarse ? 'Vänster spak: gå · högersvep: vänd 360° · 180°: snabbvänd · SOLSTÖT: tryck eller håll för salvor · SUPER: egen knapp.' : 'WASD: gå · mus / ← →: vänd · klick / håll: solstöt · Q / högerklick: super · F: sikthjälp · M: karta';
  $('roundIntroControls').textContent = controlText;
  $('roundPauseControls').textContent = controlText;
  function updateAimButton() {
    $('aimAssistBtn').textContent = 'SIKTHJÄLP ' + (aimHelp ? 'PÅ' : 'AV');
    $('aimAssistBtn').setAttribute('aria-pressed', String(aimHelp));
    document.body.classList.toggle('aim-help-on', aimHelp);
  }
  updateAimButton();
  function setPanel(name) {
    panel = name; document.body.classList.toggle('round-panel-open', !!name);
    $('roundPanel').hidden = !name;
    for (const id of ['intro', 'pause', 'result', 'map']) $('round-' + id).hidden = name !== id;
    host.resetInput(); triggerPointer = null;
    if (name) {document.exitPointerLock?.(); queueMicrotask(() => $('round-' + name).querySelector('button')?.focus({preventScroll: true}));}
  }
  function lockPointer() {
    if (coarse) return;
    try {const p = host.canvas.requestPointerLock?.(); p?.catch?.(() => {});} catch {}
  }
  function start(practice = false) {
    host.music?.unlock?.(); host.music?.roundStart?.();
    game=rounds[selectedMission];layout=game.layout;b=layout.bounds;
    game.start({practice}); host.resetPickups();
    const firstFan=isPush()?game.actors[1]:game.objective();
    const heading=Math.atan2(layout.spawn.x-firstFan.x,layout.spawn.z-firstFan.z)*180/Math.PI;
    host.teleport(layout.spawn.x, layout.spawn.z, heading, -2);
    document.body.classList.add('round-playing');
    setPanel(null); previousTime = performance.now();
    $('roundHud').hidden = false; $('roundLaunch').hidden = true;
    $('roundShareLink').hidden = true;
    $('roundClockLabel').textContent = practice ? 'ÖVNING' : 'SEKUNDER';
    toast(practice ? 'ÖVNINGSRUNDA' : missionInfo().name.toUpperCase(), isPush()?'Gå runt fansen. Grön pil = rätt knuffriktning.':selectedMission==='fikapanik'?'Vänd fritt. Håll SOLSTÖT för salvor. Tre vågor.':'Samla 3 termosar. Följ markörerna till Mitt i City.', 3);
    $('roundHealthRow').hidden=isPush(); $('roundProgressLabel').textContent=isPush()?'HEMMA':selectedMission==='fikapanik'?'RENSADE':'TERMOSAR';
    sound('start'); lockPointer();
  }
  function explore() {
    host.music?.unlock?.(); host.music?.city?.(true);
    game.phase = 'ready'; setPanel(null); $('roundHud').hidden = true; $('roundLaunch').hidden = false;
    document.body.classList.remove('round-playing');
    host.resetInput(); lockPointer(); toast('KARLSTAD ÄR DITT', 'Välj bland tre uppdrag. Torget och O’Learys väntar.', 3);
  }
  function pause(name = 'pause') {
    if (panel || game.phase !== 'playing') return;
    game.pause(); host.music?.pause?.(); setPanel(name);
  }
  function resume() {
    game.resume(); host.music?.resume?.(); setPanel(null); previousTime = performance.now(); lockPointer();
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
  function fire(power = false) {
    if (panel || game.phase !== 'playing') return;
    if (power && game.energy < RULES.chargeCost) {toast('MER SOL, TACK.', 'SUPER kostar 40 energi. SOLSTÖT är alltid gratis.'); return;}
    const p = host.player.getPosition(), f = host.camera.forward;
    const shot = game.shoot({x: p.x, z: p.z, y: p.y, dx: f.x, dz: f.z, dy: f.y, power, assist: aimHelp});
    if (shot) {shotFlash = .19; $('solarWeapon').classList.remove('recoil'); void $('solarWeapon').offsetWidth; $('solarWeapon').classList.add('recoil');}
  }
  function toggleAim() {
    aimHelp=!aimHelp;updateAimButton();
    try {localStorage.setItem('karlstad:aim-help:v2',aimHelp?'on':'off');}catch{}
    toast(aimHelp?'SIKTHJÄLP PÅ':'SIKTHJÄLP AV', 'Du vrider alltid kameran själv. Hjälpen ändrar bara träffmarginalen.',2.5);
  }
  function use() {
    if (panel) return;
    if (game.phase === 'playing') {toast(missionInfo().name.toUpperCase(),missionInfo().description,4);return;}
    const p = host.player.getPosition();
    if (Math.hypot(p.x-olearyLayout.guard.x,p.z-olearyLayout.guard.z)<7)selectMission('sista-rundan');
    else if(Math.hypot(p.x,p.z-6)<30)selectMission('fikapanik');
    setPanel('intro');
  }
  function showMap() {
    if (panel === 'map') {game.phase === 'paused' ? resume() : setPanel(null); return;}
    if (panel) return;
    if (game.phase === 'playing') {game.pause(); host.music?.pause?.();} setPanel('map'); drawMap();
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
    dot(olearyLayout.goal.x, olearyLayout.goal.z, 'O’LEARYS', '#f5c558');dot(0,6,'FIKAPANIK','#f19d80');
    if(!isPush()){const o=game.objective(host.player.getPosition());dot(o.x,o.z,o.label,'#ffef75');}
    const p = host.player.getPosition(); dot(p.x, p.z, 'DU', '#73ded0');
    const f = host.camera.forward, [px, py] = point(p.x, p.z);
    c.strokeStyle = '#73ded0'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px + f.x * 17, py + f.z * 17); c.stroke();
  }
  function drawRadar(p) {
    const c = $('roundRadar').getContext('2d'), size = 256;
    const playing = game.phase !== 'ready';
    const center = playing&&isPush() ? {x: layout.goal.x, z: (b.minZ + b.maxZ) / 2} : p;
    const scale = playing&&isPush() ? Math.min(6.2, 110 / Math.max(16, Math.abs(p.x - center.x), Math.abs(p.z - center.z))) : 3.2;
    const point = (x, z) => [128 + (x - center.x) * scale, 128 + (z - center.z) * scale];
    c.fillStyle = '#142f29'; c.fillRect(0, 0, size, size);
    c.strokeStyle = '#39594a'; c.lineWidth = 1;
    for (let i = 16; i < size; i += 32) {c.beginPath(); c.moveTo(i, 0); c.lineTo(i, size); c.moveTo(0, i); c.lineTo(size, i); c.stroke();}
    c.fillStyle = '#506151';
    for (const block of host.colliders) {const [x, y] = point(block.minx, block.minz); c.fillRect(x, y, (block.maxx - block.minx) * scale, (block.maxz - block.minz) * scale);}
    const circle = (x, z, radius, fill, stroke) => {c.beginPath(); c.arc(...point(x, z), radius, 0, Math.PI * 2); if (fill) {c.fillStyle = fill; c.fill();} if (stroke) {c.strokeStyle = stroke; c.lineWidth = 3; c.stroke();}};
    const objective=isPush()?layout.goal:game.objective(p);
    circle(objective.x,objective.z,Math.max(1.5,objective.radius)*scale,'#e4bc4938','#ffcd60');
    if(!isPush()&&selectedMission==='radda-fikat'){c.strokeStyle='#ffd367';c.lineWidth=2;c.beginPath();navigation.path(p,objective).forEach((n,i)=>{const v=point(n.x,n.z);i?c.lineTo(...v):c.moveTo(...v);});c.stroke();for(const pack of game.pickups)if(!pack.collected)circle(pack.x,pack.z,5,'#ffdc73');}
    if (playing) {
      for (const a of game.actors) if (a.active) circle(a.x, a.z, a.kind === 'boss' ? 9 : 6, a.kind === 'bin' ? '#96ac91' : '#f69d80', a.id === currentTarget?.id ? '#fff6d6' : null);
      if (currentGuide?.stance && !currentGuide.good) circle(currentGuide.stance.x, currentGuide.stance.z, 7, null, '#84e9bb');
      layout.chargers.forEach((pad, i) => {if (game.chargerTimes[i] === 0) circle(pad.x, pad.z, 4, '#ffe593');});
    }
    const [px, py] = point(p.x, p.z), f = host.camera.forward, angle = Math.atan2(f.x, -f.z);
    c.save(); c.translate(px, py); c.rotate(angle);
    c.beginPath(); c.moveTo(0, -15); c.lineTo(9, 9); c.lineTo(0, 5); c.lineTo(-9, 9); c.closePath();
    c.fillStyle = '#9bffdb'; c.fill(); c.strokeStyle = '#142f29'; c.lineWidth = 2; c.stroke(); c.restore();
    c.fillStyle = '#fff0cd'; c.font = '900 18px sans-serif'; c.textAlign = 'center'; c.fillText('N', 128, 20);
  }
  function updateGuide(p) {
    const live = game.phase === 'playing' && !panel;
    currentTarget = live ? chooseAimTarget(p, host.camera.forward, game.actors, game.visible.bind(game), null) : null;
    currentGuide = isPush() && currentTarget ? pushGuide(p, currentTarget, layout.goal, host.blocked) : null;
    guideViews.forEach(e => e.enabled = live && !!currentGuide);
    $('roundTactic').hidden = !live;
    $('roundTactic').classList.toggle('good', !!currentGuide?.good);
    $('reticle').classList.toggle('locked', live && aimHelp && !!currentTarget);
    if(!isPush()){ $('roundTactic').textContent=currentTarget?`${currentTarget.name.toUpperCase()} · ${'●'.repeat(Math.max(0,currentTarget.hp))}`:selectedMission==='fikapanik'?'VÄND DIG OM · ZOMBIERNA KOMMER FRÅN FLERA HÅLL':game.collected<3?'HÄMTA GULA TERMOSAR · FÖLJ RADARN':'FÖLJ GULA SPÅRET TILL MITT I CITY';return;}
    if (!currentGuide) {$('roundTactic').textContent = 'HITTA ETT FAN · GULA CIRKELN PÅ RADARN = HEMGÅNG'; return;}
    const a = currentTarget, g = currentGuide;
    const stanceVisible = !!g.stance && !g.good;
    stance.enabled = stanceSign.enabled = stanceVisible;
    if (stanceVisible) {
      stance.setPosition(g.stance.x, .09, g.stance.z); stanceSign.setPosition(g.stance.x, .5, g.stance.z);
      stanceSign.setEulerAngles(0, Math.atan2(p.x - g.stance.x, p.z - g.stance.z) * 180 / Math.PI, 0);
    }
    const length = 2.4, offset = a.radius + .4, angle = Math.atan2(g.pushX, g.pushZ) * 180 / Math.PI;
    const tip = {x: a.x + g.pushX * (offset + length), z: a.z + g.pushZ * (offset + length)};
    pushLine.setPosition(a.x + g.pushX * (offset + length / 2), .14, a.z + g.pushZ * (offset + length / 2));
    pushLine.setEulerAngles(0, angle, 0);
    pushHead.forEach((e, i) => {
      const direction = (angle + (i ? 145 : -145)) * Math.PI / 180;
      e.setPosition(tip.x + Math.sin(direction) * .3, .14, tip.z + Math.cos(direction) * .3);
      e.setEulerAngles(0, direction * 180 / Math.PI, 0);
    });
    [pushLine, ...pushHead].forEach(e => e.render.material = g.good ? mint : orange);
    $('roundTactic').textContent = g.good ? `${a.name.toUpperCase()} · BRA VINKEL · SIKTA OCH SOLSTÖT →` : g.playerDistance >= 15 ? 'GÅ NÄRMARE · SOLSTÖT NÅR 15 M' : 'RUNDA FIGUREN TILL ”STÅ HÄR” · GRÖN PIL = RÄTT RIKTNING';
  }
  function finish(won) {
    const previousBest = best;
    if (won && !game.practice && game.score > best) {best = game.score; try {localStorage.setItem(recordKey, String(best));} catch {}}
    if(won&&!game.practice){completed[selectedMission]=true;try{localStorage.setItem(completedKey,JSON.stringify(completed));}catch{}}
    $('roundResultEyebrow').textContent = missionInfo().place.toUpperCase()+' / '+(won?'UPPDRAG KLART':'ETT FÖRSÖK TILL');
    $('roundResultTitle').textContent = won ? missionInfo().win : game.health===0?'FIKAPAUS. FÖR DIG.':'TIDEN TOG SLUT.';
    $('roundResultScore').textContent = game.score.toLocaleString('sv-SE');
    $('roundResultDetail').textContent = `${isPush()?game.captured+'/4 fans hemma':game.captured+' zombies rensade'} · ${game.accuracy}% träffsäkerhet · bästa kedja ${game.bestChain}×`;
    const medal = game.bestChain >= 3 ? 'SOLPROFFSET · 3× KEDJA' : game.accuracy === 100 ? 'SOLKLAR PRECISION · 100%' : game.elapsed < 45 ? 'BLIXTSNABB · UNDER 45 SEK' : 'DAGENS SOLHJÄLTE';
    $('roundResultRecord').textContent = game.practice ? 'ÖVNING KLAR · NU SITTER VINKLARNA' : won && best > previousBest ? 'NYTT PERSONBÄSTA! · ' + medal : won ? medal : `DITT REKORD: ${best.toLocaleString('sv-SE')}`;
    $('roundResultTarget').textContent = game.practice ? `Redo för ${game.duration} sekunder? Övningen påverkar inte ditt rekord.` : target ? (won && game.score > target ? `Du slog utmaningen på ${target} poäng!` : `Kompisens resultat: ${target} poäng`) : `Runda ${seed} · samma placeringar varje försök`;
    $('roundRetry').textContent = game.practice ? `SPELA PÅ TID · ${game.duration} SEK →` : 'EN GÅNG TILL ↻';
    $('roundShare').textContent = 'UTMANA EN VÄN'; $('roundShare').disabled = !won || game.practice;
    $('roundShare').hidden = game.practice;
    $('roundNext').hidden=!won||game.practice;$('roundNext').textContent='NÄSTA: '+MISSIONS[(MISSIONS.findIndex(m=>m.id===selectedMission)+1)%MISSIONS.length].name.toUpperCase()+' →';
    host.music?.roundEnd?.();
    setPanel('result'); sound(won ? 'win' : 'boss');
  }
  async function share() {
    if (game.practice || game.phase !== 'won') return;
    const url = new URL(location.href); url.search = ''; url.hash = '';
    url.searchParams.set('challenge', selectedMission); url.searchParams.set('seed', String(seed)); url.searchParams.set('target', String(game.score));
    const data = {title: missionInfo().name+' i Karlstad', text: `Jag klarade ${missionInfo().name} med ${game.score} poäng. Slå min runda!`, url: url.href};
    try {
      if (navigator.share) await navigator.share(data);
      else if (navigator.clipboard?.writeText) {await navigator.clipboard.writeText(url.href); $('roundShare').textContent = 'LÄNK KOPIERAD!';}
      else { $('roundShareLink').hidden = false; $('roundShareLink').value = url.href; $('roundShareLink').select(); }
    } catch (e) {if (e.name !== 'AbortError') { $('roundShareLink').hidden = false; $('roundShareLink').value = url.href; $('roundShareLink').select(); }}
  }
  $('roundStart').addEventListener('click', () => start()); $('roundRetry').addEventListener('click', () => start());
  $('roundNext').addEventListener('click',()=>{selectMission(MISSIONS[(MISSIONS.findIndex(m=>m.id===selectedMission)+1)%MISSIONS.length].id);setPanel('intro');});
  $('roundPractice').addEventListener('click', () => start(true));
  $('roundExplore').addEventListener('click', explore); $('roundLeave').addEventListener('click', explore);
  $('roundResume').addEventListener('click', resume); $('roundRestart').addEventListener('click', () => start(game.practice));
  $('roundQuit').addEventListener('click', explore); $('roundShare').addEventListener('click', share);
  $('roundLaunch').addEventListener('click', () => setPanel('intro'));
  $('roundPause').addEventListener('click', () => game.phase === 'playing' ? pause() : setPanel('intro'));
  $('roundMapClose').addEventListener('click', () => {game.phase === 'paused' ? resume() : setPanel(null);});
  $('roundMute').addEventListener('click', () => {soundEnabled = !soundEnabled; host.music?.setMuted?.(!soundEnabled); $('roundMute').textContent = soundEnabled ? 'LJUD PÅ' : 'LJUD AV';});
  for (const [id, power] of [['fireBtn', false], ['fireLeftBtn',false], ['superBtn', true]]) {
    $(id).addEventListener('pointerdown', e => {if (e.button !== undefined && e.button !== 0) return; e.preventDefault(); fire(power);if(!power&&!panel&&game.phase==='playing')triggerPointer=e.pointerId;});
    $(id).addEventListener('click', e => {if (e.detail === 0) fire(power);});
  }
  host.canvas.addEventListener('pointerdown', e => {
    if (coarse || panel || ![0, 2].includes(e.button)) return;
    e.preventDefault();
    if (document.pointerLockElement !== host.canvas) {lockPointer(); return;}
    fire(e.button === 2);if(e.button===0&&game.phase==='playing')triggerPointer=e.pointerId;
  });
  const releaseTrigger=e=>{if(e.pointerId===triggerPointer)triggerPointer=null;};
  window.addEventListener('pointerup',releaseTrigger);window.addEventListener('pointercancel',releaseTrigger);
  host.canvas.addEventListener('contextmenu', e => e.preventDefault());
  $('aimAssistBtn').addEventListener('click', toggleAim);
  $('roundRadarButton').addEventListener('click', showMap);
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
    if (e.code === 'KeyQ') {e.preventDefault(); fire(true);}
    if (e.code === 'KeyF') {e.preventDefault(); toggleAim();}
    if (e.code === 'KeyR' && game.phase === 'playing') pause();
  });
  window.addEventListener('blur', () => {host.resetInput(); if (game.phase === 'playing') pause();});
  document.addEventListener('visibilitychange', () => {if (document.hidden && game.phase === 'playing') pause();});
  $('useBtn').textContent = 'UPPDRAG'; $('jumpBtn').textContent = 'HOPPA';
  window.KarlstadRound = Object.freeze({version: '2.0.0', snapshot: () => ({phase: game.phase, score: game.score, energy: game.energy,
    practice: game.practice, aimHelp, mission:selectedMission, wave:game.wave||0, health:game.health??100, collected:game.collected||0, guide: currentGuide ? {good: currentGuide.good, stance: currentGuide.stance} : null,
    remaining: game.remaining, seed, captured: game.captured, shots: game.shots, bestChain: game.bestChain,
    player: {x: host.player.getPosition().x, z: host.player.getPosition().z}, forward: {x: host.camera.forward.x, y: host.camera.forward.y, z: host.camera.forward.z},
    actors: game.actors.map(a => ({id: a.id, x: a.x, z: a.z, active: a.active, hp:a.hp, kind:a.kind})), goal: {...layout.goal}, objective:isPush()?layout.goal:game.objective(host.player.getPosition())})});
  setPanel('intro');

  function update() {
    const now = performance.now(), dt = Math.min(1, Math.max(0, (now - previousTime) / 1000)); previousTime = now;
    const p = host.player.getPosition();
    if (game.phase === 'playing') {game.step(dt,p);if(triggerPointer!==null&&game.cooldown===0)fire();}
    for (const event of game.drainEvents()) {
      if (event.type === 'shot') {sound(event.charged ? 'charge' : 'shot'); $('reticle').classList.toggle('hit', event.hit); if(!event.hit&&game.shots<3)toast('SIKTA PÅ FIGURERNA',isPush()?'Knuffa dem från din sida mot HEMGÅNG.':'Solstötar når 15 meter. SUPER når 18 meter.');}
      if (event.type === 'chain') {sound('chain'); toast(`${event.count}× KEDJETRÄFF!`, 'Det där räknas som lagarbete.');}
      if (event.type === 'capture') {sound('capture'); toast(event.boss ? 'INGEN MER ÖVERTID.' : 'HEM MED DIG!', event.boss ? 'Vakten kan äntligen gå på rast.' : event.name + ' har lämnat matchen.');}
      if (event.type === 'boss') {sound('boss'); toast('KAPTEN ÖVERTID!', 'Stor skumhand. Liten verklighetsförankring. Tryck SUPER!', 3);}
      if (event.type === 'energy') {sound('energy'); toast('SOLENERGI +35', 'Tryck SUPER för extra kraft.');}
      if(event.type==='wave'){sound('boss');toast('VÅG '+event.wave+' / 3',event.count+' zombies. Kaffet blir inte varmare.',2.5);}
      if(event.type==='wave-clear'){sound('win');toast('VÅGEN ÄR KLAR!','Tre sekunders fikapaus. Sedan kommer fler.',2.4);}
      if(event.type==='collect'){sound('energy');toast(event.count+' / 3 TERMOSAR',event.count===3?'Till Mitt i City! Följ det gula spåret.':'Fikat är en samhällsviktig funktion.',2);}
      if(event.type==='damage'){damageFlash=.4;sound('bump');}
      if(event.type==='zap'){sound('capture');spawnPop(event.x,event.z,event.combo);if(event.combo>1)toast(event.combo+'× SOLSTREAK!','Det där borde räknas som friskvård.',1);}
      if (event.type === 'bump' && isPush()) {sound('bump'); toast('”JAG STOD FAKTISKT HÄR.”', 'Håll lite avstånd. −15 poäng.');}
      if (event.type === 'finish') finish(event.won);
    }
    // Do not remove and re-add live render components on every frame.
    for(const [id,v] of actorViews)if(id.startsWith('city-')===isPush()){v.e.enabled=false;v.shadow.enabled=false;}
    for (const a of game.actors) {
      const v = actorViews.get(a.id); v.e.enabled = a.active; v.shadow.enabled = a.active;
      if (!a.active) continue;
      if(v.kind!==a.kind){v.kind=a.kind;const m=v.e.render.meshInstances[0].material;const t=fanTex(a.kind,a.kind==='runner'?'#e98756':a.kind==='tank'?'#ad97ca':'#70b9ae');m.emissiveMap=t;m.opacityMap=t;m.update();v.e.setLocalScale(a.kind==='tank'?1.22:1,a.kind==='tank'?1.15:1,1);}
      const speed = Math.hypot(a.vx, a.vz), bounce = game.phase === 'playing' ? Math.abs(Math.sin(game.elapsed * 5 + a.phase)) * .045 + Math.min(.3, speed * .014) : 0;
      v.e.setPosition(a.x, .025 + bounce, a.z); v.e.setEulerAngles(0, Math.atan2(p.x - a.x, p.z - a.z) * 180 / Math.PI, Math.sin(game.elapsed * 9) * Math.min(13, speed));
      v.shadow.setPosition(a.x, .055, a.z);
    }
    const face = Math.atan2(p.x - olearyLayout.guard.x, p.z - olearyLayout.guard.z) * 180 / Math.PI;
    guard.setEulerAngles(0, face, 0); guardSign.setEulerAngles(0, face, 0);
    chargers.forEach((e, i) => {e.enabled = game.chargerTimes[i] === 0; e.setLocalPosition(layout.chargers[i].x, .85 + Math.sin(now / 600 + i) * .12, layout.chargers[i].z);});
    if (now > toastUntil) $('roundToast').classList.remove('visible');
    updateMissionViews(p,dt,now);
    damageFlash=Math.max(0,damageFlash-dt);$('damageFlash').style.opacity=String(damageFlash*1.5);
    shotFlash = Math.max(0, shotFlash - dt);
    $('solarFlash').style.opacity = shotFlash > 0 ? String(shotFlash * 3) : '0';
    if (!shotFlash) $('reticle').classList.remove('hit');
    $('solarWeapon').hidden = game.phase === 'ready' || !!panel;
    uiTime += dt;
    if (uiTime > .08) {
      uiTime = 0;
      updateGuide(p); drawRadar(p);
      $('roundScore').textContent = game.score.toLocaleString('sv-SE'); $('roundTime').textContent = game.practice ? '∞' : String(Math.ceil(game.remaining)).padStart(2, '0');
      $('roundTime').classList.toggle('urgent', !game.practice && game.remaining <= 15); $('roundProgress').textContent = isPush()?`${game.captured}/4`:selectedMission==='fikapanik'?`${game.captured}/24`:`${game.collected}/3`;
      $('roundHealth').style.width=(game.health??100)+'%';$('roundHealthText').textContent=String(game.health??100);
      $('superBtn').disabled = game.energy < RULES.chargeCost || game.phase !== 'playing';
      $('superBtn').setAttribute('aria-label', game.energy >= RULES.chargeCost ? 'Superstöt, kostar 40 solenergi' : 'Superstöt behöver 40 solenergi');
      $('roundEnergy').style.width = game.energy + '%'; $('roundEnergyText').textContent = Math.round(game.energy) + '%';
      $('roundPhase').textContent = isPush()?(game.captured<3?'KNUFFA 3 FANS TILL HEMGÅNG':'SKICKA HEM KAPTEN ÖVERTID'):selectedMission==='fikapanik'?`VÅG ${game.wave}/3 · ${game.actors.filter(a=>a.active).length} ZOMBIES KVAR`:game.collected<3?'HÄMTA 3 TERMOSAR PÅ TORGET':'LEVERERA TILL MITT I CITY';
      const dist = Math.hypot(p.x - olearyLayout.guard.x, p.z - olearyLayout.guard.z);
      if (game.phase === 'ready') {
        $('mission').textContent='KARLSTAD EFTER STÄNGNING · 3 UPPDRAG';
      } else $('mission').textContent = missionInfo().name.toUpperCase();
      $('status').textContent = `FPS ${Math.round(host.app.stats.frame.fps)} · ${host.pickupCount()}/8 fynd`;
      const destination = game.phase === 'playing' ? (isPush()?layout.goal:game.objective(p)) : olearyLayout.guard;
      const direction = Math.atan2(destination.x - p.x, destination.z - p.z) - Math.atan2(host.camera.forward.x, host.camera.forward.z);
      $('roundCompassArrow').style.transform = `rotate(${-direction * 180 / Math.PI}deg)`;
      const bearing=(Math.atan2(host.camera.forward.x,-host.camera.forward.z)*180/Math.PI+360)%360;
      $('roundBearing').textContent=['N','NO','Ö','SO','S','SV','V','NV'][Math.round(bearing/45)%8]+' · '+Math.round(bearing)+'°';
      $('roundCompassText').textContent=game.phase==='playing'?(isPush()?'HEMGÅNG':destination.label)+' · '+Math.round(Math.hypot(p.x-destination.x,p.z-destination.z))+' M':`O’LEARYS ${Math.round(dist)} m`;
      updateRoute(p,destination);
      if (isPush() && game.phase === 'playing' && (p.x < b.minX - 5 || p.x > b.maxX + 5 || p.z < b.minZ - 5 || p.z > b.maxZ + 5)) $('roundPhase').textContent = game.practice ? 'FÖLJ RADARN TILL O’LEARYS' : 'TILLBAKA TILL O’LEARYS · TIDEN GÅR';
    }
  }
  return {update, use, showMap, blocksInput: () => !!panel, playing: () => game.phase === 'playing',
    onPickup: (type, value) => {if (game.phase === 'playing') {if(type === 'energy') game.energy = Math.min(100, game.energy + value); else game.score += value;}}};
}
