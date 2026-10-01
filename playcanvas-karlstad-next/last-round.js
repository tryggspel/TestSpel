import {LastRound, RULES, layoutFor, normalizeSeed} from './last-round-rules.mjs?v=2.7.0';
import {chooseAimTarget, pushGuide} from './last-round-controls.mjs?v=2.7.0';
import {CityNavigation, CityMission, MISSIONS} from './city-missions.mjs?v=2.7.0';
import {CityJourney} from './journey-rules.mjs?v=2.7.0';
import {createJourneyView} from './journey-view.js?v=2.7.0';
import {createBusRide} from './bus-ride.js?v=2.7.0';
import {dailyFor,stockholmDay,dailyRecord,challengeRequest} from './daily-challenge.mjs?v=2.7.0';
import {createPostcard} from './challenge-postcard.js?v=2.7.0';
import {CityGuidance} from './city-guidance.mjs?v=2.7.0';
import {RUSH} from './city-rush.mjs?v=2.7.0';
import {createCityIdentity} from './city-identity.js?v=2.7.0';
import {drawCityStreets,landmarkDestination,STOREFRONTS,storefrontAnchor,streetAt} from './city-geography.mjs?v=2.7.0';

export function createLastRound(pc, host) {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const request=challengeRequest(location.search);
  let displayedDaily=request.kind==='daily'?request.challenge:dailyFor();
  const seed = normalizeSeed(params.get('seed'));
  const target = Math.max(0, Math.min(999999, Number(params.get('target')) || 0));
  const olearyLayout = layoutFor(seed, host.origin);
  const navigation = new CityNavigation(host.blocked);
  const cityGuide=new CityGuidance(navigation);let guidance=null;
  const rounds = {'sista-rundan':new LastRound(olearyLayout,host.blocked),fikapanik:new CityMission('fikapanik',navigation,host.mall,seed),'radda-fikat':new CityMission('radda-fikat',navigation,host.mall,seed)};
  const galleryBox=host.colliders.find(b=>/Sandgrund|Lars Lerin/i.test(b.name));
  const gallerySite=galleryBox?{x:(galleryBox.minx+galleryBox.maxx)/2,z:galleryBox.maxz+9}:{x:-13,z:-397};
  rounds.sandgrund=new CityMission('sandgrund',navigation,host.mall,seed,gallerySite);
  const portals={
    'sista-rundan':{...navigation.point(olearyLayout.guard),name:'O’Learys'},
    fikapanik:{...navigation.point({x:8,z:6}),name:'Fikapanik'},
    'radda-fikat':{...navigation.point({x:-12,z:19}),name:'Rädda fikat'},
    sandgrund:{...rounds.sandgrund.layout.spawn,name:'Sandgrund'}
  };
  let storage=null;try{storage=localStorage;}catch{}
  const journey=new CityJourney(navigation,host.mall,portals,storage);
  let selectedMission = MISSIONS.some(m=>m.id===params.get('challenge')) ? params.get('challenge') : 'sista-rundan';
  let game = rounds['sista-rundan'], layout = olearyLayout;
  const missionInfo = () => MISSIONS.find(m=>m.id===selectedMission);
  const isPush = () => game === rounds['sista-rundan'];
  const isJourney = () => game === journey;
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
  let roundInProgress=false, rewardPaid=false, pickupToastUntil=0;
  let retryCityOptions={},lastMoment=null,momentReturn='pause',busChallenge=false;
  const cityPostcard=createPostcard($('cityResultPostcard'),$('cityShareLink'),$('citySaveCard'));
  const missionPostcard=createPostcard($('missionResultPostcard'),$('roundShareLink'),$('roundSaveCard'));
  const momentPostcard=createPostcard($('momentPostcard'),$('momentShareLink'),$('momentSaveCard'));
  function rememberMoment(record){lastMoment={...record};$('openMoment').hidden=false;}


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
      const guard = kind === 'guard', boss = kind === 'boss', human=guard||kind==='visitor', artist=kind==='artist';
      box(82, 278, 34, 73, '#3b475b'); box(140, 278, 34, 73, '#3b475b');
      box(65, 337, 58, 24, '#efe5c3'); box(136, 337, 58, 24, '#efe5c3');
      box(61, 161, 137, 139, guard ? '#283c44' : shirt, 20);
      shape(human ? '#eac49c' : '#a4c978', () => {c.moveTo(69, 179); c.lineTo(43, 248); c.lineTo(60, 262); c.lineTo(90, 218); c.closePath();});
      shape(human ? '#eac49c' : '#a4c978', () => {c.moveTo(189, 179); c.lineTo(222, 210); c.lineTo(208, 232); c.lineTo(175, 214); c.closePath();});
      box(88, 82, 83, 92, human ? '#efc597' : '#bdd88d', 27);
      oval(87, 125, 11, 15, human ? '#eac49c' : '#a4c978');
      box(83, 73, 95, 35, artist?'#e3e8d8':guard ? '#162830' : '#214b48', 9);
      if (guard) {
        box(97, 120, 63, 15, '#162830', 4); c.strokeStyle = '#d6ecdd'; c.lineWidth = 3; c.beginPath(); c.moveTo(104, 124); c.lineTo(117, 124); c.stroke();
        box(80, 204, 94, 33, '#f3d66b', 3); c.fillStyle = '#21362e'; c.font = '900 18px sans-serif'; c.textAlign = 'center'; c.fillText('VAKT', 127, 227);
      } else {
        oval(108, 123, 14, 17, '#fff9db'); oval(148, 125, 16, 20, '#fff9db');
        oval(111, 127, 4, 7, '#16332f'); oval(146, 131, 5, 7, '#16332f');
        box(106, 149, 46, 12, '#273d34', 4); box(127, 149, 9, 11, '#fff8de', 1);
        box(92, 171, 73, 18, '#fff2c4', 4); box(92, 179, 18, 66, '#fff2c4', 4);
        c.fillStyle = '#193c35'; c.font = '900 42px sans-serif'; c.textAlign = 'center'; c.fillText(artist?'KONST':kind==='visitor'?'HJÄLP':boss ? '90+' : kind==='runner' ? '>>' : kind==='tank' ? 'XL' : kind==='walker' ? 'KAFFE' : '12', 137, 262,100);
      }
      if(artist){
        for(let i=0;i<5;i++)oval(88+i*19,78,17,18,'#e4e8d8');
        box(196,133,10,123,'#a4703e',3);oval(201,127,11,23,'#a965b1');
        oval(58,250,35,26,'#dcac64');for(const [x,y,color]of [[42,242,'#e77359'],[64,240,'#a661af'],[74,261,'#eac553']])oval(x,y,7,7,color);
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
  const cityIdentity=createCityIdentity(pc,host,{card,texture,labelTex});
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
  const routeMat=material('#81e9e3'),escapeMat=material('#96f3b1');
  const arrowMesh=new pc.Mesh(host.app.graphicsDevice);
  arrowMesh.setPositions([-.5,0,.4,0,0,-.55,.5,0,.4,.22,0,.4,0,0,-.05,-.22,0,.4]);
  arrowMesh.setNormals(Array.from({length:6},()=>[0,1,0]).flat());arrowMesh.setIndices([0,5,1,5,4,1,4,2,1,4,3,2]);arrowMesh.update(pc.PRIMITIVE_TRIANGLES);
  const routePips=Array.from({length:18},(_,i)=>{const e=new pc.Entity('mission-arrow-'+i);e.addComponent('render',{meshInstances:[new pc.MeshInstance(arrowMesh,routeMat)]});root.addChild(e);e.enabled=false;return e;});
  const activeFlag=card('Ditt valda mål',labelTex(['DITT MÅL','↓'], '#165c70','#a7fbef'),2.6,1.1,0,3.4,0);activeFlag.enabled=false;
  const popTexture=labelTex(['SOLPAUS!'],'#ffda62','#183e31');
  const pops=Array.from({length:6},()=>({e:card('solar-pop',popTexture,2,.7,0,0,0),life:0,x:0,z:0}));
  pops.forEach(p=>p.e.enabled=false);let popIndex=0;
  function spawnPop(x,z){const pop=pops[popIndex++%pops.length];Object.assign(pop,{life:.65,x,z});}
  const journeyView=createJourneyView(pc,host,{card,texture,labelTex,primitive,material,fanTex,root},journey,portals,rounds.sandgrund);
  const busRide=createBusRide(host,{driverTexture:fanTex('walker','#e79355'),passengerTextures:[fanTex('walker','#e79355'),fanTex('runner','#73b8ad'),fanTex('tank','#a184c1')],
    onTick:dt=>{journey.rush.clock(dt);if(journey.rush.state==='caught')busRide.stop();},
    onArrive:(result,to,from)=>{journey.rush.buses++;recordBusMoment(result,to,from);journey.position={x:to.x,z:to.z};journey.heading=0;journey.reward(result.points);journey.contactCooldown=4;journey.save();host.music?.city?.();toast('”NÄSTA: '+to.name.toUpperCase()+'!”','Bussresan klar! +'+result.points+' XP. Inga återbetalningar.',3);if(busChallenge)openMoment('bus-intro');},
    onCrash:(result,to,from)=>{recordBusMoment(result,to,from);journey.position={x:to.x,z:to.z};journey.heading=0;journey.health=Math.max(25,journey.health-20);journey.contactCooldown=5;journey.save();host.music?.city?.();toast('AVSTIGNING. OPLANERAD.','Tillbaka vid hållplatsen. −20 liv. Bättre styrning nästa tur!',3);if(busChallenge)openMoment('bus-intro');}
  });
  function updateMissionViews(p,dt,now){
    const deliveryActive=game===rounds['radda-fikat']&&game.phase!=='ready';
    thermosViews.forEach((v,i)=>{v.group.enabled=deliveryActive&&!game.pickups[i].collected;if(v.group.enabled){v.group.setLocalPosition(game.pickups[i].x,Math.sin(now/500+i)*.08,game.pickups[i].z);v.label.setEulerAngles(0,Math.atan2(p.x-game.pickups[i].x,p.z-game.pickups[i].z)*180/Math.PI,0);}});
    deliverySign.enabled=deliveryPad.enabled=deliveryActive&&game.collected===3;
    deliverySign.setEulerAngles(0,Math.atan2(p.x-delivery.x,p.z-delivery.z)*180/Math.PI,0);
    plazaSign.setEulerAngles(0,Math.atan2(p.x-8,p.z-6)*180/Math.PI,0);
    pops.forEach(pop=>{pop.life=Math.max(0,pop.life-dt);pop.e.enabled=pop.life>0;if(!pop.e.enabled)return;pop.e.setPosition(pop.x,1.6+(.65-pop.life)*1.8,pop.z);pop.e.setEulerAngles(0,Math.atan2(p.x-pop.x,p.z-pop.z)*180/Math.PI,0);});
    chargerPads.forEach((e,i)=>{e.enabled=!!layout.chargers[i];if(e.enabled)e.setPosition(layout.chargers[i].x,.07,layout.chargers[i].z);});
    journeyView.update(p,now,game);plazaSign.enabled=!isJourney();guardSign.enabled=!isJourney();
  }
  function updateRoute(p,destination){
    const visible=!isPush()&&game.phase==='playing'&&destination.kind!=='wait'&&(isJourney()||selectedMission!=='fikapanik');
    const path=visible?(guidance?.path||navigation.path(p,destination)):[];
    routePips.forEach((e,i)=>{const q=path[i+1],next=path[i+2]||destination;e.enabled=!!q;if(q){e.setPosition(q.x,.13,q.z);e.setEulerAngles(0,Math.atan2(q.x-next.x,q.z-next.z)*180/Math.PI,0);e.render.meshInstances[0].material=destination.kind==='escape'?escapeMat:routeMat;}});
    activeFlag.enabled=visible&&isJourney()&&Math.hypot(p.x-destination.x,p.z-destination.z)<55;
    if(activeFlag.enabled){activeFlag.setPosition(destination.x,3.5,destination.z);activeFlag.setEulerAngles(0,Math.atan2(p.x-destination.x,p.z-destination.z)*180/Math.PI,0);}
  }

  function selectMission(id) {
    selectedMission=id;const info=missionInfo();
    recordKey='karlstad:mission:2:'+id+':'+seed;best=0;
    try {best=Math.max(0,Number(localStorage.getItem(recordKey))||0);} catch {}
    $('roundIntroTitle').innerHTML=info.title;$('roundIntroLead').textContent=info.lead;$('roundIntroDescription').textContent=info.description;
    $('roundEpisode').textContent=info.place.toUpperCase();$('roundEpisodeTag').textContent=info.tag;
    $('roundSeed').textContent=`RUNDA ${seed} · REKORD ${best.toLocaleString('sv-SE')} · ${MISSIONS.filter(m=>completed[m.id]).length}/4 UPPDRAG KLARA`;
    for(const m of MISSIONS){const button=$('select-'+m.id);button.setAttribute('aria-pressed',String(m.id===id));button.classList.toggle('completed',!!completed[m.id]);}
  }
  for(const m of MISSIONS)$('select-'+m.id).addEventListener('click',()=>selectMission(m.id));
  selectMission(selectedMission);
  const controlText = coarse ? 'Vänster spak: gå · högersvep: vänd 360° · 180°: snabbvänd · SOLSTÖT: tryck eller håll för salvor · SUPER: egen knapp.' : 'WASD: gå · mus / ← →: vänd · klick / håll: solstöt · Q / högerklick: super · C: ladda sol · E: uppdrag · M: karta';
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
    for (const id of ['intro', 'pause', 'result', 'map','city-intro','city-result','album','daily-intro','moment','bus-intro']) $('round-' + id).hidden = name !== id;
    if(name==='city-intro'||name==='daily-intro')refreshDaily();
    if(name==='city-intro')$('cityControlCopy').textContent=host.oneHand?.()?'EN HAND: spaken går och svänger. Sikta mot zombien så skjuter du automatiskt. Byt till två händer i PAUS.':'WASD: gå · mus: sikta · klick: solstöt · E: uppdrag / buss · M: karta. Samma snabba gång som tidigare.';
    if(name==='intro'||name==='pause')for(const id of ['roundIntroControls','roundPauseControls'])$(id).textContent=host.oneHand?.()?'EN HAND: en spak för gång och sväng. Autoeld när du siktar på en zombie. Byt läge i PAUS.':controlText;
    host.resetInput(); triggerPointer = null;
    if (name) {document.exitPointerLock?.(); queueMicrotask(() => $('round-' + name).querySelector('button')?.focus({preventScroll: true}));}
  }
  function lockPointer() {
    if (coarse) return;
    try {const p = host.canvas.requestPointerLock?.(); p?.catch?.(() => {});} catch {}
  }
  function start(practice = false) {
    if(busRide.active())return;
    if(journey.rush.challenge&&journey.rush.state==='playing'){toast('KLARA STADSJAKTEN FÖRST','Specialuppdragen väntar. Den delade utmaningen spelas helt i staden.',3);return;}
    if(isJourney()){const p=host.player.getPosition();journey.position={x:p.x,z:p.z};journey.pause();journey.save();}
    storeRoundEnergy();roundInProgress=true;rewardPaid=false;
    host.music?.unlock?.(); host.music?.roundStart?.();
    game=rounds[selectedMission];layout=game.layout;b=layout.bounds;
    game.start({practice});game.energy=practice?60:journey.energy; host.resetPickups();
    const firstFan=isPush()?game.actors[1]:game.objective();
    const heading=Math.atan2(layout.spawn.x-firstFan.x,layout.spawn.z-firstFan.z)*180/Math.PI;
    host.teleport(layout.spawn.x, layout.spawn.z, heading, -2);
    document.body.classList.add('round-playing');
    document.body.classList.remove('journey-playing');
    setPanel(null); previousTime = performance.now();
    $('roundHud').hidden = false; $('roundLaunch').hidden = true;
    $('roundShareLink').hidden = true;
    $('roundClockLabel').textContent = practice ? 'ÖVNING' : 'SEKUNDER';
    $('roundScoreLabel').textContent='POÄNG';$('refillBtn').hidden=practice;
    $('useBtn').textContent='UPPDRAG';
    toast(practice ? 'ÖVNINGSRUNDA' : missionInfo().name.toUpperCase(), isPush()?'Gå runt fansen. Grön pil = rätt knuffriktning.':selectedMission==='fikapanik'?'Vänd fritt. Håll SOLSTÖT för salvor. Tre vågor.':selectedMission==='sandgrund'?'Gå nära besökarna. Led dem till grönt. Stoppa Zombie-Lerin!':'Samla 3 termosar. Följ markörerna till Mitt i City.', 3);
    $('roundHealthRow').hidden=isPush(); $('roundProgressLabel').textContent=isPush()?'HEMMA':selectedMission==='fikapanik'?'RENSADE':selectedMission==='sandgrund'?'RÄDDADE':'TERMOSAR';
    sound('start'); lockPointer();
  }
  function storeRoundEnergy(){
    if(roundInProgress&&!game.practice){journey.energy=game.energy;journey.save();}
    roundInProgress=false;
  }
  function explore(boot=false) {
    storeRoundEnergy();game=journey;layout=game.layout;b=layout.bounds;journey.resume();journey.contactCooldown=3;
    host.teleport(journey.position.x,journey.position.z,journey.heading,-2);
    setPanel(null);$('roundHud').hidden=false;$('roundLaunch').hidden=true;$('refillBtn').hidden=false;
    document.body.classList.add('round-playing','journey-playing');
    $('roundClockLabel').textContent=journey.rush.mode==='timed'?'TID KVAR':'TERMOSAR';$('roundScoreLabel').textContent=journey.rush.mode==='timed'?'JAKT-XP':'KAFFEPOÄNG';$('roundProgressLabel').textContent=journey.rush.mode==='timed'?'MÅL XP':'HEMLIGT';$('roundHealthRow').hidden=false;
    previousTime=performance.now();
    if(!boot){host.music?.unlock?.();host.music?.city?.(true);lockPointer();}
    if(!boot)toast(journey.rush.mode==='timed'?'JAKTEN FORTSÄTTER!':'KARLSTAD ÄR DITT',journey.rush.mode==='timed'?'800 XP. Sedan till en grön tryggzon innan tiden tar slut.':'Gatuhändelser, bussresor och fyra specialuppdrag väntar.',3);
  }
  function refreshDaily(){
    if(request.kind!=='daily')displayedDaily=dailyFor();
    const d=displayedDaily,record=dailyRecord(storage,d.day),time=Math.floor(d.seconds/60)+':'+String(d.seconds%60).padStart(2,'0');
    $('dailyDate').textContent=d.day===stockholmDay()?'IDAG · '+d.day:'UTMANING FRÅN '+d.day;
    $('dailyTitle').textContent=d.title;$('dailyTeaser').textContent=time+' · 800 XP · samma start för alla';
    $('dailyBriefTitle').textContent=d.title;$('dailyBriefDate').textContent=d.day+' · SEED '+d.seed;
    $('dailyDescription').textContent=d.description;$('dailyStart').textContent='SPELA UTMANINGEN · '+time+' →';
    $('dailyBest').textContent='REKORD PÅ DENNA ENHET: '+record.best+' XP · '+record.attempts+' FÖRSÖK';
    $('dailyTarget').textContent=request.kind==='daily'&&request.target?'KOMPISENS RESULTAT: '+request.target+' XP':'En ny utmaning varje dag vid midnatt i Karlstad.';
  }
  function startCity(mode='timed',options={}){
    if(busRide.active())busRide.stop();busChallenge=false;storeRoundEnergy();retryCityOptions={...options};
    journey.rush.start(mode,{seed,...options});explore();sound('start');
    $('cityShareLink').hidden=true;
    toast(options.challenge?.title||(mode==='timed'?'STADEN JAGAR DIG.':'FRI STADSVANDRING'),options.challenge?'800 XP → grön tryggzon. Kaffe lockar. Solen hjälper.':mode==='timed'?'Samla 800 XP och nå grönt. Följ cyanpilarna. BYT MÅL öppnar kartan.':'Följ cyanpilarna. Välj mål och nya händelser med BYT MÅL. Ingen tidspress.',4);
  }
  function cityResult(event){
    const r=journey.rush,daily=r.challenge?.kind==='daily';
    $('cityResultTitle').textContent=event.escaped?'DU KOM UNDAN!':'TILLFÅNGATAGEN!';$('cityResultScore').textContent=String(event.score);
    $('cityResultDetail').textContent=event.escaped?`${r.xp} XP + ${r.bonus} tidsbonus. ${r.challenge?'Dina vanliga resurser är återställda.':'+150 kaffepoäng sparade.'}`:event.reason+' Dina sparade kaffepoäng och vykort finns kvar.';
    $('cityResultBest').textContent=(daily?'DAGENS REKORD PÅ DENNA ENHET: ':'BÄSTA FLYKT: ')+(daily?r.dailyBest:r.best)+' XP';
    $('cityResultTarget').textContent=request.target?event.escaped&&event.score>request.target?'DU SLOG KOMPISENS '+request.target+' XP!':'ATT SLÅ: '+request.target+' XP · en fullbordad flykt räknas.':'';
    $('cityRetry').textContent=daily?'SAMMA DAG EN GÅNG TILL →':'EN JAKT TILL →';$('cityShare').hidden=false;$('cityShare').textContent='UTMANA EN VÄN';
    const record={kind:daily?'daily':'hunt',day:r.challenge?.day,seed:r.seed,score:event.score,won:event.escaped,health:r.resultHealth,kills:r.resultCaptured,seconds:r.spent,title:r.challenge?.title||'STADEN JAGAR DIG',kit:{...r.replayKit}};
    rememberMoment(record);host.music?.roundEnd?.();setPanel('city-result');cityPostcard.show(record);sound(event.escaped?'win':'boss');
  }
  function recordBusMoment(result,to,from){
    rememberMoment({kind:'bus',from:from.id,seed,score:result.points,health:result.health,seconds:30-result.remaining,won:result.state==='arrived',title:result.state==='arrived'?'BILJETTKONTROLLEN KAN VÄNTA.':'CHAUFFÖREN SKYLLER PÅ VÄGEN.',place:from.name+' → '+to.name});
  }
  function openMoment(back='pause'){
    if(!lastMoment||busRide.active())return;
    momentReturn=back;if(game.phase==='playing')game.pause();host.music?.pause?.();
    $('momentRetry').hidden=!busChallenge;
    $('momentTarget').textContent=busChallenge&&request.target?(lastMoment.won&&lastMoment.score>request.target?'DU SLOG KOMPISENS '+request.target+' XP!':'ATT SLÅ: '+request.target+' XP · nå hållplatsen först.'):'Bilden och länken följer med när din delningsapp stöder det.';$('momentShare').textContent='UTMANA EN VÄN';setPanel('moment');momentPostcard.show(lastMoment);
  }
  function startBusChallenge(fromId=request.from||'torget'){
    startCity('free');busChallenge=true;
    const from=journey.busStops.find(s=>s.id===fromId)||journey.busStops[0];host.teleport(from.x,from.z,0,-2);journey.position={x:from.x,z:from.z};boardBus();
  }
  function boardBus(){
    if(panel||!isJourney()||game.phase!=='playing'||busRide.active())return;
    const from=journey.nearestBus(host.player.getPosition());if(from.distance>6.5)return;
    if(journey.routeMode==='bus'){journey.routeMode='hunt';journey.rush.busGoal=null;}
    const to=journey.busStops.find(s=>s.id===(from.id==='sandgrund'?'torget':'sandgrund')),route=navigation.path(from,to);
    if(route.length<2)return;hadPointerLock=false;document.exitPointerLock?.();triggerPointer=null;
    host.music?.roundStart?.();busRide.start(from,to,route);toastUntil=0;$('roundToast').classList.remove('visible');
  }
  function openAlbum(){
    if(busRide.active())return;if(game.phase==='playing')game.pause();
    for(const card of journey.postcards){const img=$('postcard-'+card.id),unlocked=journey.postcardsFound.has(card.id);img.hidden=!unlocked;$('card-status-'+card.id).textContent=unlocked?'HITTAT · '+card.name:'LETA VID '+card.name.toUpperCase();if(unlocked&&!img.getAttribute('src'))img.setAttribute('src','./art/postcards/'+card.file);}
    setPanel('album');
  }
  function openMissions(){
    if(journey.rush.challenge&&journey.rush.state==='playing'){toast('800 XP → GRÖN TRYGGZON','Specialuppdragen väntar tills du avslutar utmaningen.',3);return;}
    if(game.phase==='playing')game.pause();host.music?.pause?.();selectMission(selectedMission);setPanel('intro');
  }
  function buyEnergy(){
    if(panel)return;
    if(!journey.refill(game))toast('KAFFEKRAFT',game.energy>60?'Du har redan gott om solenergi.':'Samla en lila termos. 25 kaffepoäng ger +40 solenergi.');
  }
  function pause(name = 'pause') {
    if(busRide.active()){busRide.pause();return;}
    if (panel || game.phase !== 'playing') return;
    game.pause(); if(isJourney())journey.save();host.music?.pause?.();$('roundRestart').hidden=isJourney();setPanel(name);
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
    if (panel || busRide.active() || game.phase !== 'playing') return;
    if(power&&isJourney()&&journey.rush.challenge?.noSuper){toast('DAGENS REGEL: UTAN SUPER','Vanliga solstötar fungerar.');return;}
    if (power && game.energy < RULES.chargeCost) {toast('MER SOL, TACK.', 'SUPER kostar 40 sol. Samla termosar eller växla 25 kaffepoäng.'); return;}
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
    if (panel||busRide.active()) return;
    if(isJourney()){
      if(journey.rush.interact(host.player.getPosition(),host.camera.forward))return;
      if(journey.nearestBus(host.player.getPosition()).distance<6.5){boardBus();return;}
      const p=host.player.getPosition(),station=journeyView.nearbyStation(p),portal=journey.nearestPortal(p);
      if(station){if(station.type==='clue')toast('NWT: HETT TIPS!','Bakom rubrikerna gömmer sig dagens största kaffefynd. Leta bakom kiosken.',4);else buyEnergy();return;}
      if(portal.distance<9)selectMission(portal.id);
      openMissions();return;
    }
    if (game.phase === 'playing') {toast(missionInfo().name.toUpperCase(),missionInfo().description,4);return;}
    const p = host.player.getPosition();
    if (Math.hypot(p.x-olearyLayout.guard.x,p.z-olearyLayout.guard.z)<7)selectMission('sista-rundan');
    else if(Math.hypot(p.x,p.z-6)<30)selectMission('fikapanik');
    setPanel('intro');
  }
  function showMap() {
    if(busRide.active())return;
    if (panel === 'map') {game.phase === 'paused' ? resume() : setPanel(null); return;}
    if (panel) return;
    if (game.phase === 'playing') {game.pause(); host.music?.pause?.();} setPanel('map'); drawMap();
  }
  function drawMap() {
    $('mapGoals').hidden=!isJourney();$('mapCurrentGoal').textContent=isJourney()?journey.objective(host.player.getPosition()).label:'DITT PÅGÅENDE UPPDRAG';
    $('route-sun').disabled=!journey.rush.ecology.sun;for(const m of MISSIONS)$('route-'+m.id).disabled=!!journey.rush.challenge||journey.rush.exitReady;
    for(const place of ['domkyrkan','biblioteket'])$('route-place-'+place).disabled=!!journey.rush.challenge||journey.rush.exitReady;
    for(const kind of ['power','news','bowling'])$('story-'+kind).disabled=!!journey.rush.challenge||journey.rush.exitReady;
    $('mapStoryHint').textContent=journey.rush.challenge?'I utmaningar väljer staden händelserna, lika för alla.':journey.rush.exitReady?'800 XP klara. Följ grönt och säkra rundan.':'Starta en ny händelse i närheten. Ersätter pågående gatuhändelse.';
    const c = $('roundMap').getContext('2d'), size = 500;
    c.fillStyle = '#142b29'; c.fillRect(0, 0, size, size);
    const scale = .68, center = {x: 0, z: -145};
    const point = (x, z) => [(x - center.x) * scale + size / 2, (z - center.z) * scale + size / 2];
    drawCityStreets(c,point,scale,size);
    c.fillStyle = '#52695b';
    for (const b of host.colliders) {const [x, y] = point(b.minx, b.minz); c.fillRect(x, y, (b.maxx - b.minx) * scale, (b.maxz - b.minz) * scale);}
    function dot(x,z,label,color,dx=9,dy=-6){const [px,py]=point(x,z);c.fillStyle=color;c.beginPath();c.arc(px,py,4,0,Math.PI*2);c.fill();c.font='bold 11px sans-serif';c.textAlign=dx<0?'right':'left';c.fillText(label,Math.max(6,Math.min(490,px+dx)),Math.max(14,Math.min(488,py+dy)));c.textAlign='left';}
    dot(0,0,'TORGET','#f5ecd1',-16,17);dot(host.mall.x,host.mall.z,'MITT I CITY','#c9d7c9',-8,-8);
    for(const id of ['radhuset','domkyrkan','biblioteket','sandgrund']){const p=landmarkDestination(id,host.colliders);if(p)dot(p.x,p.z,p.label,'#f4dab0',id==='radhuset'?-10:9,id==='radhuset'?-17:-6);}
    for(const shop of STOREFRONTS){const p=storefrontAnchor(shop,host.colliders);if(p)dot(p.x,p.z,shop.name.toUpperCase(),shop.brand==='olearys'?'#9de2aa':'#b9ddea',shop.id==='pressbyran20'?-9:9,shop.id==='pressbyran20'?18:shop.id==='espresso15'?18:-6);}
    if(isJourney()){const guide=cityGuide.update(host.player.getPosition(),journey.objective(host.player.getPosition()),host.camera.forward),route=guide.path;c.strokeStyle=guide.color;c.lineWidth=3;c.beginPath();route.forEach((p,i)=>{const a=point(p.x,p.z);i?c.lineTo(...a):c.moveTo(...a);});c.stroke();}
    if(!isPush()){const o=game.objective(host.player.getPosition());dot(o.x,o.z,o.label,'#ffef75');}
    const p = host.player.getPosition(); dot(p.x, p.z, 'DU', '#73ded0');
    const f = host.camera.forward, [px, py] = point(p.x, p.z);
    c.strokeStyle = '#73ded0'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px + f.x * 17, py + f.z * 17); c.stroke();
    c.fillStyle='#f4e4bf';c.font='bold 13px sans-serif';c.fillText('N ↑',18,25);c.font='10px sans-serif';c.fillText('100 M',407,477);c.fillRect(407,483,100*scale,2);
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
    drawCityStreets(c,point,scale,size);
    c.fillStyle = '#506151';
    for (const block of host.colliders) {const [x, y] = point(block.minx, block.minz); c.fillRect(x, y, (block.maxx - block.minx) * scale, (block.maxz - block.minz) * scale);}
    const circle = (x, z, radius, fill, stroke) => {c.beginPath(); c.arc(...point(x, z), radius, 0, Math.PI * 2); if (fill) {c.fillStyle = fill; c.fill();} if (stroke) {c.strokeStyle = stroke; c.lineWidth = 3; c.stroke();}};
    const objective=isPush()?layout.goal:guidance?.goal||game.objective(p);
    if(objective.kind!=='wait')circle(objective.x,objective.z,Math.max(1.5,objective.radius)*scale,'#81e9e338',guidance?.color||'#ffcd60');
    if(!isPush()&&(isJourney()||selectedMission!=='fikapanik')){c.strokeStyle=guidance?.color||'#ffd367';c.lineWidth=3;c.beginPath();(guidance?.path||navigation.path(p,objective)).forEach((n,i)=>{const v=point(n.x,n.z);i?c.lineTo(...v):c.moveTo(...v);});c.stroke();if(game===rounds['radda-fikat'])for(const pack of game.pickups)if(!pack.collected)circle(pack.x,pack.z,5,'#ffdc73');}
    journeyView.radar(c,point,isJourney());
    if(game===rounds.sandgrund)for(const v of game.visitors)if(!v.rescued)circle(v.x,v.z,5,'#a5efc8');
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
    if(!isPush()){
      const station=isJourney()?journeyView.nearbyStation(p):null,portal=isJourney()?journey.nearestPortal(p):null,bus=isJourney()?journey.nearestBus(p):null;
      const interactive=isJourney()&&['power','bowling'].includes(journey.rush.contract?.kind)&&Math.hypot(p.x-journey.rush.contract.spot.x,p.z-journey.rush.contract.spot.z)<3.3;
      $('useBtn').textContent=interactive?journey.rush.contract.action:bus?.distance<6.5?'KLIV PÅ BUSSEN':station?(station.type==='clue'?'LÄS TIPS':'LADDA SOL'):portal?.distance<9?'STARTA UPPDRAG':'UPPDRAG';
      $('roundTactic').textContent=currentTarget?`${currentTarget.name.toUpperCase()} · ${'●'.repeat(Math.max(0,currentTarget.hp))}${host.oneHand?.()?' · AUTOELD':''}`:isJourney()?(bus.distance<6.5?'BUSS 666 · 30 SEKUNDERS KAOS · +200–350 XP':journey.rush.exitReady?'800 XP KLARA · FÖLJ GRÖNT TILL TRYGGZON':station?station.brand+' · TRYCK '+$('useBtn').textContent:portal.distance<9?portal.name.toUpperCase()+' · TRYCK STARTA':guidance?.turn||'FÖLJ CYANPILARNA TILL DITT MÅL'):selectedMission==='sandgrund'?(game.rescued<3?'GÅ NÄRA BESÖKARE · LED DEM TILL GRÖNA PLATSEN':'BESÖKARNA ÄR SÄKRA · STOPPA ZOMBIE-LERIN'):selectedMission==='fikapanik'?'VÄND DIG OM · ZOMBIERNA KOMMER FRÅN FLERA HÅLL':game.collected<3?'HÄMTA GULA TERMOSAR · FÖLJ RADARN':'FÖLJ GULA SPÅRET TILL MITT I CITY';return;
    }
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
    let reward=0;if(won&&!game.practice&&!rewardPaid){reward=selectedMission==='sandgrund'?250:150;journey.reward(reward);rewardPaid=true;}storeRoundEnergy();journey.save();
    const previousBest = best;
    if (won && !game.practice && game.score > best) {best = game.score; try {localStorage.setItem(recordKey, String(best));} catch {}}
    if(won&&!game.practice){completed[selectedMission]=true;try{localStorage.setItem(completedKey,JSON.stringify(completed));}catch{}}
    $('roundResultEyebrow').textContent = missionInfo().place.toUpperCase()+' / '+(won?'UPPDRAG KLART':'ETT FÖRSÖK TILL');
    $('roundResultTitle').textContent = won ? missionInfo().win : game.health===0?'FIKAPAUS. FÖR DIG.':'TIDEN TOG SLUT.';
    $('roundResultScore').textContent = game.score.toLocaleString('sv-SE');
    $('roundResultDetail').textContent = `${isPush()?game.captured+'/4 fans hemma':selectedMission==='sandgrund'?game.rescued+'/3 besökare räddade':game.captured+' zombies rensade'} · ${game.accuracy}% träffsäkerhet · bästa kedja ${game.bestChain}×${reward?' · +'+reward+' kaffepoäng till stadsvandringen':''}`;
    const medal = game.bestChain >= 3 ? 'SOLPROFFSET · 3× KEDJA' : game.accuracy === 100 ? 'SOLKLAR PRECISION · 100%' : game.elapsed < 45 ? 'BLIXTSNABB · UNDER 45 SEK' : 'DAGENS SOLHJÄLTE';
    $('roundResultRecord').textContent = game.practice ? 'ÖVNING KLAR · NU SITTER VINKLARNA' : won && best > previousBest ? 'NYTT PERSONBÄSTA! · ' + medal : won ? medal : `DITT REKORD: ${best.toLocaleString('sv-SE')}`;
    $('roundResultTarget').textContent = game.practice ? `Redo för ${game.duration} sekunder? Övningen påverkar inte ditt rekord.` : target ? (won && game.score > target ? `Du slog utmaningen på ${target} poäng!` : `Kompisens resultat: ${target} poäng`) : `Runda ${seed} · samma placeringar varje försök`;
    $('roundRetry').textContent = game.practice ? `SPELA PÅ TID · ${game.duration} SEK →` : 'EN GÅNG TILL ↻';
    $('roundShare').textContent = 'UTMANA EN VÄN'; $('roundShare').disabled = game.practice;
    $('roundShare').hidden = game.practice;
    $('roundNext').hidden=!won||game.practice;$('roundNext').textContent='NÄSTA: '+MISSIONS[(MISSIONS.findIndex(m=>m.id===selectedMission)+1)%MISSIONS.length].name.toUpperCase()+' →';
    host.music?.roundEnd?.();
    setPanel('result');$('missionResultPostcard').hidden=$('roundSaveCard').hidden=game.practice;
    if(!game.practice){const record={kind:'mission',mission:selectedMission,seed,score:game.score,won,health:game.health??100,kills:game.captured,seconds:game.elapsed,title:missionInfo().name,place:missionInfo().place};rememberMoment(record);missionPostcard.show(record);}
    sound(won ? 'win' : 'boss');
  }
  function share(){if(!game.practice)missionPostcard.share($('roundShare'));}
  $('roundStart').addEventListener('click', () => start()); $('roundRetry').addEventListener('click', () => start());
  $('roundNext').addEventListener('click',()=>{selectMission(MISSIONS[(MISSIONS.findIndex(m=>m.id===selectedMission)+1)%MISSIONS.length].id);setPanel('intro');});
  $('roundPractice').addEventListener('click', () => start(true));
  $('roundExplore').addEventListener('click',()=>explore()); $('roundLeave').addEventListener('click',()=>explore());
  $('roundNavigate').addEventListener('click',()=>{journey.destination=selectedMission;journey.routeMode='mission';journey.save();explore();});
  $('cityStart').addEventListener('click',()=>startCity('timed',request.kind==='hunt'?{seed:request.seed,kit:request.kit,challenge:request.kit?{kind:'friend',seed:request.seed,title:'KOMPISJAKTEN',seconds:180}:null}:{}));$('cityRetry').addEventListener('click',()=>startCity('timed',retryCityOptions));
  $('dailyOpen').addEventListener('click',()=>setPanel('daily-intro'));$('dailyBack').addEventListener('click',()=>setPanel('city-intro'));
  $('dailyStart').addEventListener('click',()=>{refreshDaily();startCity('timed',{challenge:displayedDaily});});
  $('openMoment').addEventListener('click',()=>openMoment());$('momentClose').addEventListener('click',()=>setPanel(momentReturn));
  $('momentShare').addEventListener('click',()=>momentPostcard.share($('momentShare')));
  $('momentRetry').addEventListener('click',()=>startBusChallenge(lastMoment?.from));
  $('busChallengeStart').addEventListener('click',()=>startBusChallenge());$('busChallengeBack').addEventListener('click',()=>startCity('free'));
  for(const id of ['cityFree','cityResultFree'])$(id).addEventListener('click',()=>startCity('free'));
  $('cityNewRun').addEventListener('click',()=>{if(game.phase==='playing')game.pause();setPanel('city-intro');});
  $('openAlbum').addEventListener('click',openAlbum);$('albumClose').addEventListener('click',()=>{if(game.phase==='paused')resume();else setPanel('city-result');});
  $('cityShare').addEventListener('click',()=>cityPostcard.share($('cityShare')));
  $('roundResume').addEventListener('click', resume); $('roundRestart').addEventListener('click', () => isJourney()?resume():start(game.practice));
  $('roundQuit').addEventListener('click',()=>journey.rush.challenge?startCity('free'):explore()); $('roundShare').addEventListener('click', share);
  $('roundLaunch').addEventListener('click',openMissions);$('refillBtn').addEventListener('click',buyEnergy);
  $('roundPause').addEventListener('click', () => game.phase === 'playing' ? pause() : setPanel('intro'));
  $('cityChooseGoal').addEventListener('click',showMap);
  function chooseRoute(mode,destination){
    if(!isJourney())return;
    if(mode==='mission'&&journey.rush.challenge)return;
    journey.rush.busGoal=null;journey.routeMode=mode;if(destination)journey.destination=destination;
    resume();toast('DITT MÅL ÄR VALT','Karta, kompass och cyanpilar visar samma väg.',1.6);
  }
  $('route-event').addEventListener('click',()=>chooseRoute('hunt'));
  $('route-bus').addEventListener('click',()=>chooseRoute('bus'));
  $('route-sun').addEventListener('click',()=>chooseRoute('sun'));
  for(const m of MISSIONS)$('route-'+m.id).addEventListener('click',()=>chooseRoute('mission',m.id));
  for(const place of ['domkyrkan','biblioteket'])$('route-place-'+place).addEventListener('click',()=>{
    if(!isJourney()||journey.rush.challenge||journey.rush.exitReady)return;
    const target=landmarkDestination(place,host.colliders);if(!target)return;
    journey.landmarkGoal={...target,...navigation.point(target)};chooseRoute('landmark');
  });
  for(const kind of ['power','news','bowling'])$('story-'+kind).addEventListener('click',()=>{
    if(!isJourney()||journey.rush.challenge||journey.rush.exitReady)return;
    if(journey.rush.beginStory(kind,host.player.getPosition(),host.camera.forward)){journey.routeMode='hunt';resume();}
    else {resume();toast('GATAN ÄR FULL','Stoppa några zombies innan du startar bowling.',2);}
  });
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
    if (e.code === 'KeyC') {e.preventDefault();buyEnergy();}
    if (e.code === 'KeyR' && game.phase === 'playing') pause();
  });
  window.addEventListener('blur', () => {host.resetInput(); if (game.phase === 'playing') pause();});
  window.addEventListener('pagehide',()=>{if(!isJourney()&&roundInProgress&&!game.practice)journey.energy=game.energy;journey.save();});
  window.addEventListener('pointerdown',()=>{host.music?.unlock?.();if(isJourney()&&!panel)host.music?.city?.(true);},{once:true});
  document.addEventListener('visibilitychange', () => {if (document.hidden && game.phase === 'playing') pause();});
  $('useBtn').textContent = 'UPPDRAG'; $('jumpBtn').textContent = 'HOPPA';
  window.KarlstadRound = Object.freeze({version: '2.7.0', snapshot: () => ({phase: game.phase, mode:busRide.active()?'bus':isJourney()?'journey':'mission',score: game.score, energy: game.energy,oneHand:!!host.oneHand?.(),bus:busRide.snapshot(),rush:journey.rush.snapshot(),postcard:lastMoment?{...lastMoment}:null,challengeRequest:request,
    cityIdentity:cityIdentity.snapshot(),
    guidance:guidance?{goal:{...guidance.goal},next:{...guidance.next},turn:guidance.turn,distance:guidance.distance}:null,
    journey:{balance:journey.balance,lifetime:journey.lifetime,found:journey.found.size,secrets:journey.secretsFound.size,postcards:[...journey.postcardsFound],safeZones:journey.safeZones.map(s=>({...s})),busStops:journey.busStops.map(s=>({...s})),destination:journey.destination,items:journey.items.filter(t=>!journey.found.has(t.id)).map(t=>({...t})),portals:structuredClone(portals)},
    rescued:game.rescued||0,visitors:game.visitors?.map(v=>({...v})),
    practice: game.practice, aimHelp, mission:selectedMission, wave:game.wave||0, health:game.health??100, collected:game.collected||0, guide: currentGuide ? {good: currentGuide.good, stance: currentGuide.stance} : null,
    remaining: game.remaining, seed, captured: game.captured, shots: game.shots, bestChain: game.bestChain,
    player: {x: host.player.getPosition().x, z: host.player.getPosition().z}, forward: {x: host.camera.forward.x, y: host.camera.forward.y, z: host.camera.forward.z},
    actors: game.actors.map(a => ({id: a.id, x: a.x, z: a.z, active: a.active, hp:a.hp, kind:a.kind})), goal: {...layout.goal}, objective:isPush()?layout.goal:game.objective(host.player.getPosition())})});
  explore(true);
  if(request.kind==='bus'){
    journey.pause();$('busChallengeFrom').textContent='Från '+journey.busStops.find(s=>s.id===request.from).name+'. Samma 30 sekunders resa. Samma svängar.';
    $('busChallengeTarget').textContent=request.target?'ATT SLÅ: '+request.target+' XP':'Håll kursen med ratten. En hel buss ger upp till 350 XP.';setPanel('bus-intro');
  }else if(request.kind==='daily'){journey.pause();setPanel('daily-intro');}
  else if(params.has('challenge')&&!request.error)openMissions();
  else {journey.pause();$('cityChallengeTarget').textContent=request.error||(params.has('hunt')&&target?'UTMANING: SLÅ '+target+' XP':'DITT REKORD: '+journey.rush.best+' XP');setPanel('city-intro');}


  function update() {
    const now = performance.now(), dt = Math.min(1, Math.max(0, (now - previousTime) / 1000)); previousTime = now;
    const p = host.player.getPosition();
    if(busRide.active()){root.enabled=false;busRide.update(dt);root.enabled=!busRide.active();}
    else if (game.phase === 'playing') {
      game.step(dt,p,host.camera.forward);
      if(triggerPointer!==null&&game.cooldown===0)fire();
      const atCart=isJourney()&&journey.rush.contract?.kind==='bowling'&&Math.hypot(p.x-journey.rush.contract.spot.x,p.z-journey.rush.contract.spot.z)<3.3;
      if(host.oneHand?.()&&!panel&&game.phase==='playing'&&game.cooldown===0&&!atCart){
        const target=chooseAimTarget(p,host.camera.forward,game.actors,game.visible.bind(game),null);
        if(target&&(!isPush()||pushGuide(p,target,layout.goal,host.blocked).good)){
          if(game.energy<3&&!game.practice)journey.refill(game);fire();
        }
      }
    }
    for (const event of game.drainEvents()) {
      if (event.type === 'shot') {sound(event.charged ? 'charge' : 'shot'); $('reticle').classList.toggle('hit', event.hit); if(!event.hit&&game.shots<3)toast('SIKTA PÅ FIGURERNA',isPush()?'Knuffa dem från din sida mot HEMGÅNG.':'Solstötar når 15 meter. SUPER når 18 meter.');}
      if (event.type === 'chain') {sound('chain'); toast(`${event.count}× KEDJETRÄFF!`, 'Det där räknas som lagarbete.');}
      if (event.type === 'capture') {sound('capture'); toast(event.boss ? 'INGEN MER ÖVERTID.' : 'HEM MED DIG!', event.boss ? 'Vakten kan äntligen gå på rast.' : event.name + ' har lämnat matchen.');}
      if (event.type === 'boss') {sound('boss'); toast('KAPTEN ÖVERTID!', 'Stor skumhand. Liten verklighetsförankring. Tryck SUPER!', 3);}
      if (event.type === 'energy') {sound('energy'); toast('SOLENERGI +35', 'Tryck SUPER för extra kraft.');}
      if(event.type==='wave'){sound('boss');toast('VÅG '+event.wave+' / 3',event.count+' zombies. Kaffet blir inte varmare.',2.5);}
      if(event.type==='wave-clear'){sound('win');toast('VÅGEN ÄR KLAR!','Tre sekunders fikapaus. Sedan kommer fler.',2.4);}
      if(event.type==='collect'){sound('energy');toast(event.count+' / 3 TERMOSAR',event.count===3?'Till Mitt i City! Följ det gula spåret.':'Fikat är en samhällsviktig funktion.',2);}
      if(event.type==='thermos'){sound('energy');$('journeyPickupToast').textContent='+'+event.points+' KAFFEPOÄNG · +15 SOL'+(event.chain%5===0?' · FIKAKEDJA!':'');$('journeyPickupToast').classList.add('visible');pickupToastUntil=now+1300;}
      if(event.type==='secret'){sound('win');toast('HEMLIGHET HITTAD! +200',event.name+' · Fullt liv och full solenergi.',3.5);journey.save();}
      if(event.type==='rustle'){sound('bump');toast('…PRASSEL?','Någon har känt doften av kaffe.',1);}
      if(event.type==='ambush'){sound('boss');toast('”HAR DU PÅTÅR?!”','Vänd dig om. SOLSTÖT!',1.3);}
      if(event.type==='ambush-clear'){sound('capture');$('journeyPickupToast').textContent='BAKHÅLL KLARAT · +30 KAFFEPOÄNG';$('journeyPickupToast').classList.add('visible');pickupToastUntil=now+1800;journey.save();}
      if(event.type==='refill'){sound('energy');toast('KAFFEKRAFT! +40 SOL','−25 kaffepoäng. Nu blir det andra bullar.',1.5);}
      if(event.type==='recover'){host.teleport(journey.layout.spawn.x,journey.layout.spawn.z,0,-2);journey.position={...journey.layout.spawn};journey.heading=0;journey.save();toast('EN LITEN FIKAPAUS.','Tillbaka på Torget. Upp till 25 kaffepoäng tappade; dina fynd finns kvar.',3);}
      if(event.type==='visitor-follow'){sound('energy');toast('”JAG FÖLJER DIG!”','Led besökaren till den gröna samlingsplatsen.',2);}
      if(event.type==='visitor-safe'){sound('capture');toast(event.count+' / 3 BESÖKARE RÄDDADE',event.count===3?'Nu återstår Zombie-Lerin!':'Tillbaka efter nästa besökare.',2);}
      if(event.type==='visitor-danger')toast('BESÖKARE I FARA!','Solstöt bort Zombie-Lerin från besökarna.',1.5);
      if(event.type==='street-event'){sound('start');toast(event.title,event.kind==='power'?'Tre elboxar. Följ pilarna och tryck SLÅ PÅ STRÖMMEN.':event.kind==='news'?'Hämta tidningarna, leverera till två adresser. Extra! Extra!':event.kind==='bowling'?'Ställ dig bakom kundvagnen. Sikta mot zombies och tryck SPARKA VAGNEN.':event.kind==='hunt'?'Stoppa tjuvarna innan de hinner smita!':event.kind==='parcel'?'Hämta väskan. Leverera till nästa cyanmarkering.':'Nå solglimten innan den försvinner!',2.2);}
      if(event.type==='power-switch')toast('ELBOX '+event.stage+'/3 KLAR','Följ pilarna till nästa. Ljuset lockar sällskap.',1.7);
      if(event.type==='power-restored'){sound('win');shotFlash=.25;toast('VEM TÄNDE?!','Alla tre elboxar igång. Paniken sjunker, zombierna stannar till.',2.5);}
      if(event.type==='news-stage')toast(event.stage===1?'EXTRA! ZOMBIE NEKAR TILL HUNGER.':'NYHET: KAFFET FORTFARANDE SLUT.','Följ cyanpilarna till nästa leverans.',2);
      if(event.type==='cart-strike'){sound('chain');toast('KUNDVAGN 1 – ZOMBIE 0','+30 XP för vagnträffen. Ingen pant återbetalas.',1.5);}
      if(event.type==='parcel-ready'){sound('energy');toast('VÄSKAN ÄR DIN!','Följ det nya cyan-målet och leverera kaffet.',1.6);}
      if(event.type==='street-complete'){sound('win');toast(event.title,'+'+event.points+' XP · +25 sol'+(journey.rush.mode==='timed'?' · +8 sekunder':''),2);}
      if(event.type==='street-missed')toast('DEN CHANSEN FÖRSVANN.','Nästa gatuhändelse kommer strax. Fortsätt röra dig.',1.5);
      if(event.type==='panic-tier'){
        const copy={1:['KARLSTAD PANIK 25%','Fler zombies har fått upp spåret.'],2:['KARLSTAD PANIK 50%','Staden börjar bete sig märkligt.'],3:['KARLSTAD PANIK 75%','Håll dig i rörelse. Nu blir det stökigt.'],4:['KARLSTAD HAR FALLIT','ÖVERLEV TILLS SOLEN KOMMER.']}[event.level];
        if(copy){sound('boss');toast(copy[0],copy[1],event.level===4?3.5:2.2);}
      }
      if(event.type==='panic-fall'){damageFlash=.18;toast('KARLSTAD HAR FALLIT','Överlev '+event.seconds+' sekunder. Ingen står still nu.',3.5);}
      if(event.type==='panic-reset'){sound('win');toast('SOLEN KOMMER TILLBAKA','Paniken sjunker till '+Math.round(event.panic)+'%. Karlstad andas igen.',2.6);}
      if(event.type==='chaos-bells'){sound('boss');toast('DOMKYRKAN RINGER','Klockorna drar till sig '+Math.max(1,event.count)+' zombies. Dålig tajming.',2.7);}
      if(event.type==='chaos-blackout'){damageFlash=.12;toast('BLACKOUT','Gatljuset dör i '+event.seconds+' sekunder. Något rör sig i mörkret.',2.7);}
      if(event.type==='chaos-gold'){sound('energy');toast('GULDTERMOS!','Nå den inom '+event.seconds+' sekunder · +'+event.points+' XP.',2.4);}
      if(event.type==='chaos-gold-complete'){sound('win');toast('GULDTERMOS SÄKRAD','+'+event.points+' XP · +30 sol · paniken steg. Självklart.',2.5);}
      if(event.type==='chaos-gold-missed')toast('GULDTERMOSEN FÖRSVANN','Karlstad ger inga andra chanser. Nästan inga.',1.8);
      if(event.type==='chaos-horde'){$('journeyPickupToast').textContent='PANIKHORD · '+event.count+' NYA ZOMBIES';$('journeyPickupToast').classList.add('visible');pickupToastUntil=now+1400;}
      if(event.type==='scent-tier')toast('KAFFEDOFT '+event.tier+'%',event.tier===40?'Zombierna känner dig längre bort.':event.tier===60?'Doften lockar snabbare zombies.':'Bakgränderna har fått upp spåret. Följ solen!',2);
      if(event.type==='coffee-catastrophe'){sound('boss');toast('KAFFEKATASTROF!','Håll dig i rörelse i '+event.seconds+' sekunder. Solen vädrar bort doften.',3);}
      if(event.type==='coffee-calm')toast('DOFTEN LÄGGER SIG','Horden lugnar sig. Välj nästa termos med omsorg.',2);
      if(event.type==='sun-start'){sound('energy');toast('SOLA ÄR FRAMME!','Följ den gula solringen: +energi, mindre doft, dubbla zombiepoäng. 6 sekunder i solen ger +100 XP.',3);}
      if(event.type==='sun-bonus'){sound('win');toast('SOLBAD KLART · +100 XP','Karlstads friskvårdsbidrag. Fortsätt följa solen!',2);}
      if(event.type==='pursuit'){sound('boss');$('journeyPickupToast').textContent='DU ÄR FÖRFÖLJD · '+event.count+' ZOMBIES';$('journeyPickupToast').classList.add('visible');pickupToastUntil=now+1600;}
      if(event.type==='postcard'){sound('capture');toast('VYKORT HITTAT · +100 XP',event.name+' · Se bilden i PAUS → VYKORT.',2);}
      if(event.type==='exit-open'){sound('win');toast('800 XP! NU HEM MED DIG.','Ta dig till en grön tryggzon. Tiden som är kvar ger bonus.',3);}
      if(event.type==='hunt-alarm'){sound('boss');toast('30 SEKUNDER KVAR!',journey.rush.exitReady?'Följ den gröna tryggzonen!':'Jaga sista poängen och hitta en tryggzon!',2);}
      if(event.type==='hunt-finish')cityResult(event);
      if(event.type==='damage'){damageFlash=.4;sound('bump');}
      if(event.type==='zap'){sound('capture');spawnPop(event.x,event.z,event.combo);if(event.combo>1)toast(event.combo+'× SOLSTREAK!','Det där borde räknas som friskvård.',1);}
      if (event.type === 'bump' && isPush()) {sound('bump'); toast('”JAG STOD FAKTISKT HÄR.”', 'Håll lite avstånd. −15 poäng.');}
      if (event.type === 'finish') finish(event.won);
    }
    document.body.classList.toggle('city-blackout',isJourney()&&!busRide.active()&&journey.rush.blackoutUntil>journey.rush.spent);
    document.body.classList.toggle('city-in-sun',isJourney()&&!busRide.active()&&journey.rush.ecology.inSun);
    if(busRide.active())return;
    // Do not remove and re-add live render components on every frame.
    for(const [id,v] of actorViews)if(id.startsWith('city-')===isPush()){v.e.enabled=false;v.shadow.enabled=false;}
    for (const a of game.actors) {
      const v = actorViews.get(a.id); v.e.enabled = a.active; v.shadow.enabled = a.active;
      if (!a.active) continue;
      if(v.kind!==a.kind){v.kind=a.kind;const m=v.e.render.meshInstances[0].material;const t=fanTex(a.kind,a.kind==='runner'?'#e98756':a.kind==='tank'?'#ad97ca':'#70b9ae');m.emissiveMap=t;m.opacityMap=t;m.update();v.e.setLocalScale(a.kind==='tank'?1.22:1,a.kind==='tank'?1.15:1,1);}
      const jump=isJourney()&&a.ambushAt!==undefined?Math.sin(Math.min(1,(game.elapsed-a.ambushAt)/.65)*Math.PI)*.9:0;
      const speed = Math.hypot(a.vx, a.vz), bounce = game.phase === 'playing' ? jump+Math.abs(Math.sin(game.elapsed * 5 + a.phase)) * .045 + Math.min(.3, speed * .014) : 0;
      v.e.setPosition(a.x, .025 + bounce, a.z); v.e.setEulerAngles(0, Math.atan2(p.x - a.x, p.z - a.z) * 180 / Math.PI, Math.sin(game.elapsed * 9) * Math.min(13, speed));
      v.shadow.setPosition(a.x, .055, a.z);
    }
    const face = Math.atan2(p.x - olearyLayout.guard.x, p.z - olearyLayout.guard.z) * 180 / Math.PI;
    guard.setEulerAngles(0, face, 0); guardSign.setEulerAngles(0, face, 0);
    chargers.forEach((e, i) => {e.enabled = !!layout.chargers[i]&&game.chargerTimes[i] === 0;if(e.enabled)e.setLocalPosition(layout.chargers[i].x, .85 + Math.sin(now / 600 + i) * .12, layout.chargers[i].z);});
    if (now > toastUntil) $('roundToast').classList.remove('visible');
    if(now>pickupToastUntil)$('journeyPickupToast').classList.remove('visible');
    updateMissionViews(p,dt,now);
    damageFlash=Math.max(0,damageFlash-dt);$('damageFlash').style.opacity=String(damageFlash*1.5);
    shotFlash = Math.max(0, shotFlash - dt);
    $('solarFlash').style.opacity = shotFlash > 0 ? String(shotFlash * 3) : '0';
    if (!shotFlash) $('reticle').classList.remove('hit');
    $('solarWeapon').hidden = game.phase === 'ready' || !!panel || busRide.active();
    uiTime += dt;
    if (uiTime > .08) {
      uiTime = 0;
      guidance=!isPush()?cityGuide.update(p,game.objective(p),host.camera.forward):null;
      updateGuide(p); drawRadar(p);
      const timed=isJourney()&&journey.rush.mode==='timed',time=Math.ceil(journey.rush.time);
      $('roundScore').textContent = (isJourney()?(timed?journey.rush.xp:journey.balance):game.score).toLocaleString('sv-SE'); $('roundTime').textContent = timed?Math.floor(time/60)+':'+String(time%60).padStart(2,'0'):isJourney()?String(journey.found.size):game.practice ? '∞' : String(Math.ceil(game.remaining)).padStart(2, '0');
      $('roundTime').classList.toggle('urgent',timed?time<=30:!isJourney()&&!game.practice && game.remaining <= 15); $('roundProgress').textContent = timed?'800':isJourney()?`${journey.secretsFound.size}/5`:isPush()?`${game.captured}/4`:selectedMission==='fikapanik'?`${game.captured}/24`:`${selectedMission==='sandgrund'?game.rescued:game.collected}/3`;
      const contract=journey.rush.contract,chaos=journey.rush.chaosTarget;$('cityEventHud').hidden=!isJourney();
      const goal=guidance?.goal;
      $('cityStreet').textContent=streetAt(p);
      $('cityEventTitle').textContent=goal?.label||'800 XP → TRYGGZON';
      const activeContract=contract&&goal?.id===contract.id;
      $('cityEventDetail').textContent=(guidance?.turn||'FÖLJ PILARNA')+(goal?.kind==='wait'?'':' · '+guidance?.distance+' M')+(activeContract?' · '+Math.ceil(contract.until-journey.rush.spent)+' S · +'+contract.points+' XP':'');
      $('cityChooseGoal').hidden=!isJourney();
      $('roundHealth').style.width=(game.health??100)+'%';$('roundHealthText').textContent=String(Math.ceil(game.health??100));if($('panicFill')){$('panicFill').style.width=Math.round(journey.rush.panic)+'%';$('panicValue').textContent=Math.round(journey.rush.panic)+'%';$('panicHud').hidden=!isJourney();$('panicHud').classList.toggle('danger',journey.rush.panic>=75);}
      const ecology=journey.rush.ecology,sun=ecology.sun;
      const sunAngle=sun?Math.atan2(sun.x-p.x,sun.z-p.z)-Math.atan2(host.camera.forward.x,host.camera.forward.z):0;
      const sunArrow=['↑','↖','←','↙','↓','↘','→','↗'][(Math.round(sunAngle/(Math.PI/4))+16)%8];
      $('cityJourneyHud').hidden=!isJourney();$('scentFill').style.width=Math.round(ecology.scent)+'%';$('scentValue').textContent=Math.round(ecology.scent)+'%';$('scentRow').classList.toggle('danger',ecology.scent>=80);
      $('sunHud').hidden=!isJourney()||!sun;$('sunHud').textContent=sun?(ecology.inSun?'I SOLEN · 2× ZOMBIE-XP · ':sunArrow+' SOLA · '+Math.round(Math.hypot(p.x-sun.x,p.z-sun.z))+' M · ')+Math.ceil(sun.until-journey.rush.spent)+' S'+(sun.rewarded?' · +100 XP KLART':' · SOLBAD '+Math.min(6,Math.floor(sun.held))+'/6 S'):'';
      $('superBtn').disabled = game.energy < RULES.chargeCost || game.phase !== 'playing' || (isJourney()&&!!journey.rush.challenge?.noSuper);
      $('superBtn').querySelector('span').textContent=isJourney()&&journey.rush.challenge?.noSuper?'AV IDAG':'40 ENERGI';
      $('superBtn').setAttribute('aria-label', isJourney()&&journey.rush.challenge?.noSuper?'Super är av i dagens utmaning':game.energy >= RULES.chargeCost ? 'Superstöt, kostar 40 solenergi' : 'Superstöt behöver 40 solenergi');
      $('roundEnergy').style.width = game.energy + '%'; $('roundEnergyText').textContent = Math.round(game.energy) + '%';
      $('refillBtn').disabled=game.phase!=='playing'||game.energy>60||journey.balance<25;$('refillBtn').textContent='☀ +40 SOL · 25 P'+(!isJourney()?' ('+journey.balance+')':'');
      $('roundPhase').textContent = isJourney()?(game.energy<3?'NÖDSOL · HITTA TERMOSAR ELLER LADDA MED POÄNG':'TERMOS = +25 POÄNG / +15 SOL · SOLSTÖT −3'):isPush()?(game.captured<3?'KNUFFA 3 FANS TILL HEMGÅNG':'SKICKA HEM KAPTEN ÖVERTID'):selectedMission==='sandgrund'?`BESÖKARE ${game.rescued}/3 · ZOMBIE-LERIN ${Math.max(0,game.actors[0].hp)}/12`:selectedMission==='fikapanik'?`VÅG ${game.wave}/3 · ${game.actors.filter(a=>a.active).length} ZOMBIES KVAR`:game.collected<3?'HÄMTA 3 TERMOSAR PÅ TORGET':'LEVERERA TILL MITT I CITY';
      if(timed)$('roundPhase').textContent=journey.rush.exitReady?'FLY NU · GRÖN TRYGGZON PÅ RADARN':'MÅL: 800 XP → GRÖN TRYGGZON';
      const dist = Math.hypot(p.x - olearyLayout.guard.x, p.z - olearyLayout.guard.z);
      if (game.phase === 'ready') {
        $('mission').textContent='KARLSTAD EFTER STÄNGNING · 3 UPPDRAG';
      } else $('mission').textContent = missionInfo().name.toUpperCase();
      $('status').textContent = `FPS ${Math.round(host.app.stats.frame.fps)} · ${isJourney()?journey.rush.challenge?.kind==='daily'?'DAGENS KARLSTAD 2.7':'STADSJAKTEN 2.7':missionInfo().place.toUpperCase()}`;
      const destination = game.phase === 'playing' ? (isPush()?layout.goal:guidance.goal) : olearyLayout.guard;
      const direction = !isPush()&&game.phase==='playing'?guidance.angle:Math.atan2(destination.x - p.x, destination.z - p.z) - Math.atan2(host.camera.forward.x, host.camera.forward.z);
      $('roundCompassArrow').style.transform = `rotate(${-direction * 180 / Math.PI}deg)`;
      const bearing=(Math.atan2(host.camera.forward.x,-host.camera.forward.z)*180/Math.PI+360)%360;
      $('roundBearing').textContent=['N','NO','Ö','SO','S','SV','V','NV'][Math.round(bearing/45)%8]+' · '+Math.round(bearing)+'°';
      $('roundCompassText').textContent=game.phase==='playing'?(isPush()?'HEMGÅNG · '+Math.round(Math.hypot(p.x-destination.x,p.z-destination.z))+' M':guidance.turn+(destination.kind==='wait'?'':' · '+guidance.distance+' M')):`O’LEARYS ${Math.round(dist)} m`;
      updateRoute(p,destination);
      if (isPush() && game.phase === 'playing' && (p.x < b.minX - 5 || p.x > b.maxX + 5 || p.z < b.minZ - 5 || p.z > b.maxZ + 5)) $('roundPhase').textContent = game.practice ? 'FÖLJ RADARN TILL O’LEARYS' : 'TILLBAKA TILL O’LEARYS · TIDEN GÅR';
    }
  }
  return {update, use, showMap, isJourney, blocksInput: () => !!panel||busRide.active(), playing: () => game.phase === 'playing',
    onPickup: (type, value) => {if (game.phase === 'playing') {if(type === 'energy') game.energy = Math.min(100, game.energy + value); else game.score += value;}}};
}
