import {createBusModel} from './transit-art.js?v=2.21.1-xmas.2';
import {createComicCity} from './comic-city.js?v=2.21.1-xmas.2';
import {SUN} from './city-ecology.mjs?v=2.21.1-xmas.2';
import {rarityFor,BOOSTERS} from './explore-fun.mjs?v=2.21.1-xmas.2';
import {powerFor,POWERUPS,POWER_KINDS,POWER} from './powerups.mjs?v=2.21.1-xmas.2';
const POWER_RADAR_RANGE=POWER.radarRange;
import {BUS_NETWORK,MUSIC_OFFICE} from './explore-places.mjs?v=2.21.1-xmas.2';
export function createJourneyView(pc,host,draw,journey,portals,sandgrund){
  const {card,texture,labelTex,primitive,material,fanTex,root}=draw;
  const purple=material('#7848a8'),ink=material('#193d38'),gold=material('#ffd56c'),mint=material('#8be9b6');
  function thermosTex(secret=false,points=200){return texture((c,w,h)=>{
    c.scale(w/256,h/384);c.lineWidth=9;c.strokeStyle='#193a35';c.lineJoin='round';
    c.fillStyle=secret?'#f8c650':'#673293';c.beginPath();c.roundRect(52,76,151,264,26);c.fill();c.stroke();
    c.fillStyle=secret?'#ffe9a1':'#9b6cc6';c.fillRect(68,101,21,215);c.strokeRect(203,136,25,90);
    c.fillStyle='#e0e7d0';c.beginPath();c.roundRect(67,38,125,44,10);c.fill();c.stroke();
    c.fillStyle='#fff1ca';c.beginPath();c.roundRect(63,166,129,99,10);c.fill();c.stroke();
    c.fillStyle='#5e2788';c.textAlign='center';c.font='900 22px sans-serif';c.fillText(secret?(points===160?'GULD':'HEMLIG'):'LÖFBERGS',128,206,118);c.font='900 16px sans-serif';c.fillText(secret?'+'+points+' POÄNG':'KAFFEKRAFT',128,237,116);
    c.strokeStyle='#fff3ce';c.lineWidth=6;for(let i=0;i<3;i++){c.beginPath();c.moveTo(92+i*30,22);c.quadraticCurveTo(80+i*30,10,96+i*30,0);c.stroke();}
  },256,384);}
  const flask=thermosTex(),secretFlask=thermosTex(true);
  // 2.10 Halloween: förbannade termosar ritas med egen textur ovanpå samma termosplatser.
  const cursedFlask=texture((c,w,h)=>{
    c.scale(w/256,h/384);c.lineWidth=9;c.strokeStyle='#120a1c';c.lineJoin='round';
    c.fillStyle='#2b173f';c.beginPath();c.roundRect(52,76,151,264,26);c.fill();c.stroke();
    c.fillStyle='#b8ff6a';c.fillRect(68,101,21,215);c.strokeRect(203,136,25,90);
    c.fillStyle='#4a2b66';c.beginPath();c.roundRect(67,38,125,44,10);c.fill();c.stroke();
    c.fillStyle='#d9ffb0';c.beginPath();c.roundRect(63,166,129,99,10);c.fill();c.stroke();
    c.fillStyle='#3b0f5c';c.textAlign='center';c.font='900 21px sans-serif';c.fillText('FÖRBANNAD',128,206,118);c.font='900 30px sans-serif';c.fillText('☠',128,248);
    c.strokeStyle='#b8ff6a';c.lineWidth=6;for(let i=0;i<3;i++){c.beginPath();c.moveTo(92+i*30,22);c.quadraticCurveTo(80+i*30,10,96+i*30,0);c.stroke();}
  },256,384);
  // 2.13: sällsynta termosar. Samma silhuett som den vanliga, men tydligt annorlunda färg och glitter, så att man ser dem på långt håll.
  const sparkle=(c,x,y,r,col='#ffffff')=>{c.fillStyle=col;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r);c.quadraticCurveTo(x,y,x-r,y);c.quadraticCurveTo(x,y,x,y-r);c.fill();};
  function rarityTex(kind){
    const pal={
      silver:{body:'#9eb2c8',stripe:'#eef4fb',cap:'#dfe8f1',head:'SILVER',sub:'×2',ink:'#2f4358'},
      gold:{body:'#f1b72b',stripe:'#fff2ad',cap:'#fff0b8',head:'GULD',sub:'×5',ink:'#6a4300'},
      rainbow:{body:null,stripe:'#ffffff',cap:'#fff4fb',head:'REGNBÅGE',sub:'?',ink:'#7a2a78'}
    }[kind];
    return texture((c,w,h)=>{
      c.scale(w/256,h/384);c.lineWidth=9;c.strokeStyle='#193a35';c.lineJoin='round';
      if(pal.body)c.fillStyle=pal.body;else{const g=c.createLinearGradient(52,76,203,340);['#ff5f6d','#ffc371','#f9f871','#6be585','#4ab8ff','#b57bff'].forEach((col,i,a)=>g.addColorStop(i/(a.length-1),col));c.fillStyle=g;}
      c.beginPath();c.roundRect(52,76,151,264,26);c.fill();c.stroke();
      c.fillStyle=pal.stripe;c.globalAlpha=.7;c.fillRect(68,101,21,215);c.globalAlpha=1;c.strokeRect(203,136,25,90);
      c.fillStyle=pal.cap;c.beginPath();c.roundRect(67,38,125,44,10);c.fill();c.stroke();
      c.fillStyle='#fff8dd';c.beginPath();c.roundRect(63,166,129,99,10);c.fill();c.stroke();
      c.fillStyle=pal.ink;c.textAlign='center';c.font='900 '+(pal.head.length>6?20:28)+'px sans-serif';c.fillText(pal.head,128,208,118);c.font='900 30px sans-serif';c.fillText(pal.sub,128,248);
      sparkle(c,34,70,18);sparkle(c,224,110,14);sparkle(c,40,250,12);sparkle(c,216,300,16);sparkle(c,128,12,12);
    },256,384);
  }
  const rarityTextures={silver:rarityTex('silver'),gold:rarityTex('gold'),rainbow:rarityTex('rainbow')};
  const cursedPool=journey.cursedHunt?journey.cursedHunt.cursed.map(t=>({t,e:card('Förbannad termos',cursedFlask,1,1.55,t.x,(t.y||0)+.28,t.z)})):[];
  const pickupPool=Array.from({length:18},()=>card('Löfbergs termos',flask,.9,1.4,0,0,0));
  const secretPool=journey.secrets.map(s=>({s,e:card('Guldtermos '+s.name,secretFlask,1.1,1.7,s.x,.2,s.z)}));
  // 2.13: gömda skatter (guldtermos med poängen på) och ett glödande spår på marken när man är nära.
  const treasureTextures=new Map();
  const treasureTexFor=points=>{if(!treasureTextures.has(points))treasureTextures.set(points,thermosTex(true,points));return treasureTextures.get(points);};
  const glowMat=material('#ffe27a');glowMat.opacity=.5;glowMat.blendType=pc.BLEND_NORMAL;glowMat.depthWrite=false;glowMat.emissive=new pc.Color(.55,.42,.08);glowMat.update();
  const treasurePool=journey.treasures.map(t=>({t,e:card('Gömd skatt '+t.name,treasureTexFor(t.points),1.2,1.85,t.x,(t.y||0)+.2,t.z),glow:primitive('skatt-glimt','cylinder',t.x,(t.y||0)+.07,t.z,2.8,.03,2.8,glowMat)}));
  treasurePool.forEach(({e,glow})=>{e.enabled=glow.enabled=false;});
  // 2.15: förmågor. Runda märken i stället för termosar, så att de syns på långt håll: rakett, stjärna, stövlar, sköld, klocka, bomb.
  const POWER_LABEL={rocket:'RAKET',star:'STJÄRNA',boots:'HOPP',shield:'SKÖLD',clock:'KLOCKA',bomb:'BOMB',pause:'PAUS',strip:'STRÅLE',rain:'BÖNOR',egg:'ÄGG',ghost:'SPÖKE',radar:'SONAR'};
  function glyph(c,kind,ink){
    c.fillStyle=ink;c.strokeStyle=ink;c.lineWidth=8;c.lineJoin='round';c.lineCap='round';
    if(kind==='rocket'){c.beginPath();c.moveTo(128,44);c.quadraticCurveTo(160,86,152,138);c.lineTo(104,138);c.quadraticCurveTo(96,86,128,44);c.fill();
      c.beginPath();c.moveTo(104,118);c.lineTo(80,150);c.lineTo(106,142);c.fill();c.beginPath();c.moveTo(152,118);c.lineTo(176,150);c.lineTo(150,142);c.fill();
      c.fillStyle='#ffd23f';c.beginPath();c.moveTo(112,146);c.lineTo(128,182);c.lineTo(144,146);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(128,92,10,0,6.3);c.fill();}
    else if(kind==='star'){c.beginPath();for(let i=0;i<10;i++){const r=i%2?32:70,a=-Math.PI/2+i*Math.PI/5;c.lineTo(128+Math.cos(a)*r,112+Math.sin(a)*r);}c.closePath();c.fill();}
    else if(kind==='boots'){c.beginPath();c.moveTo(96,52);c.lineTo(138,52);c.lineTo(138,112);c.lineTo(176,128);c.lineTo(176,150);c.lineTo(88,150);c.lineTo(88,128);c.lineTo(96,128);c.closePath();c.fill();
      c.lineWidth=7;c.beginPath();for(let i=0;i<4;i++){c.moveTo(92+i*26,164);c.lineTo(104+i*26,176);}c.stroke();}
    else if(kind==='shield'){c.beginPath();c.moveTo(128,44);c.lineTo(182,64);c.quadraticCurveTo(184,128,128,176);c.quadraticCurveTo(72,128,74,64);c.closePath();c.fill();
      c.strokeStyle='#fff';c.lineWidth=11;c.beginPath();c.moveTo(102,106);c.lineTo(122,128);c.lineTo(158,84);c.stroke();}
    else if(kind==='pause'){c.fillRect(92,52,28,118);c.fillRect(136,52,28,118);c.lineWidth=7;c.beginPath();c.arc(128,111,76,0,6.3);c.stroke();}
    else if(kind==='strip'){c.lineWidth=14;for(let i=0;i<3;i++){c.beginPath();c.moveTo(78,150-i*34);c.lineTo(128,112-i*34);c.lineTo(178,150-i*34);c.stroke();}}
    else if(kind==='rain'){for(const [x,y,r] of [[84,70,13],[128,52,12],[172,72,13],[100,118,14],[156,126,14],[128,168,13]]){c.beginPath();c.ellipse(x,y,r,r*1.45,.5,0,6.3);c.fill();c.save();c.strokeStyle='#fff8';c.lineWidth=3;c.beginPath();c.moveTo(x-r*.5,y-r*.8);c.lineTo(x+r*.5,y+r*.8);c.stroke();c.restore();}}
    else if(kind==='egg'){c.beginPath();c.ellipse(128,112,46,62,0,0,6.3);c.fill();c.strokeStyle='#ffd23f';c.lineWidth=9;c.beginPath();for(let i=0;i<6;i++)c.lineTo(86+i*17,i%2?112:134);c.stroke();}
    else if(kind==='ghost'){c.beginPath();c.moveTo(80,170);c.lineTo(80,100);c.arc(128,98,48,Math.PI,0);c.lineTo(176,170);c.lineTo(160,154);c.lineTo(144,170);c.lineTo(128,154);c.lineTo(112,170);c.lineTo(96,154);c.closePath();c.fill();c.fillStyle='#fff';c.beginPath();c.arc(108,100,10,0,6.3);c.arc(148,100,10,0,6.3);c.fill();c.fillStyle=ink;c.beginPath();c.arc(111,102,5,0,6.3);c.arc(151,102,5,0,6.3);c.fill();}
    else if(kind==='radar'){c.lineWidth=9;for(const r of [26,50,74]){c.beginPath();c.arc(128,118,r,Math.PI*1.05,Math.PI*1.95);c.stroke();}c.beginPath();c.arc(128,118,10,0,6.3);c.fill();c.beginPath();c.moveTo(128,118);c.lineTo(176,86);c.stroke();}
    else if(kind==='clock'){c.lineWidth=11;c.beginPath();c.arc(128,112,58,0,6.3);c.stroke();c.lineWidth=10;c.beginPath();c.moveTo(128,112);c.lineTo(128,74);c.moveTo(128,112);c.lineTo(156,126);c.stroke();c.beginPath();c.arc(128,112,7,0,6.3);c.fill();}
    else{c.beginPath();c.arc(124,130,50,0,6.3);c.fill();c.lineWidth=9;c.beginPath();c.moveTo(150,92);c.quadraticCurveTo(168,70,184,64);c.stroke();
      c.fillStyle='#ffd23f';c.beginPath();for(let i=0;i<8;i++){const r=i%2?7:16,a=i*Math.PI/4;c.lineTo(188+Math.cos(a)*r,60+Math.sin(a)*r);}c.closePath();c.fill();}
  }
  function powerTex(kind){
    const d=POWERUPS[kind];
    return texture((c,w,h)=>{
      c.scale(w/256,h/256);
      c.fillStyle='#193a35';c.beginPath();c.arc(128,128,122,0,6.3);c.fill();
      c.fillStyle=d.color;c.beginPath();c.arc(128,128,108,0,6.3);c.fill();
      c.fillStyle='#ffffff55';c.beginPath();c.ellipse(100,80,52,26,-.5,0,6.3);c.fill();
      c.save();c.translate(0,-10);glyph(c,kind,d.ink);c.restore();
      c.fillStyle=d.ink;c.textAlign='center';c.font='900 30px sans-serif';c.fillText(POWER_LABEL[kind],128,214,170);
      sparkle(c,30,56,16);sparkle(c,226,70,12);sparkle(c,214,200,14);
    },256,256);
  }
  const powerPools=Object.fromEntries(POWER_KINDS.map(kind=>{const tex=powerTex(kind);const pool=Array.from({length:3},()=>card('Förmåga '+kind,tex,1.35,1.35,0,0,0));pool.forEach(e=>e.enabled=false);return [kind,pool];}));
  const powerCache=new Map();let powerDay='';
  const powerOf=(id,day)=>{if(powerDay!==day){powerDay=day;powerCache.clear();}let k=powerCache.get(id);if(k===undefined){k=powerFor(id,day);powerCache.set(id,k);}return k;};
  const rarityPools={common:pickupPool};
  const raritySize={silver:[1.0,1.55,12],gold:[1.15,1.75,12],rainbow:[1.25,1.9,8]};
  for(const [kind,[w,h,n]] of Object.entries(raritySize))rarityPools[kind]=Array.from({length:n},()=>card('Termos '+kind,rarityTextures[kind],w,h,0,0,0));
  for(const kind of Object.keys(raritySize))rarityPools[kind].forEach(e=>e.enabled=false);
  // Termosen flyger mot spelaren när den plockas (kort och tydligt, som i Candy Crush).
  const flyPools={common:flask,...rarityTextures};
  const flyCards=Object.fromEntries(Object.entries(flyPools).map(([kind,tex])=>[kind,Array.from({length:4},()=>({e:card('Termos flyger',tex,.9,1.4,0,0,0),life:0,x:0,y:0,z:0}))]));
  Object.values(flyCards).flat().forEach(f=>f.e.enabled=false);const flyIndex={};
  const FLY=.28;
  function burst(x,y,z,kind='common'){const pool=flyCards[kind]||flyCards.common;const i=(flyIndex[kind]=((flyIndex[kind]??-1)+1)%pool.length);Object.assign(pool[i],{life:FLY,x,y,z});}
  const portalViews=Object.entries(portals).map(([id,p],i)=>{
    const e=card('Uppdrag '+id,labelTex([p.name.toUpperCase(),'UPPDRAG '+(i+1)+' • GÅ HIT']),5,1.45,p.x,2.2,p.z,true);
    const ring=primitive('mission-circle','cylinder',p.x,.09,p.z,5,.035,5,id==='sandgrund'?purple:gold);return{id,p,e,ring};
  });
  const stations=[
    {...journey.nav.point({x:-9,z:20}),brand:'LÖFBERGS',name:'KAFFEKRAFT',type:'coffee',color:'#653291'},
    {...journey.nav.point({x:-25,z:-125}),brand:'KARLSTADS ENERGI',name:'SOLSERVICE',type:'solar',color:'#177d82'},
    {...journey.nav.point({x:-43,z:6}),brand:'NWT',name:'STADENS HEMLIGHETER',type:'clue',color:'#d26147'}
  ].map(s=>{
    const mat=material(s.color);primitive('concept-kiosk','box',s.x,.9,s.z,2.3,1.8,1.2,ink);
    primitive('comic-kiosk-roof','box',s.x,2.7,s.z,3.4,.25,2.3,mat);
    const e=card('Konceptplats '+s.brand,labelTex([s.brand,s.name],s.color,'#fff0cb'),3.2,1,s.x,1.6,s.z+.65,true);
    return {...s,e};
  });
  const ambushProps=journey.ambushes.map(a=>({a,e:card('Fikagömma',labelTex(['PAPPERSHÖG','INGET ATT SE HÄR'], '#d9c59e','#28463d'),1.4,.9,a.spawn.x,.01,a.spawn.z,true)}));
  const visitors=Array.from({length:3},(_,i)=>card('Besökare '+i,fanTex('visitor',['#e9b978','#75bbb5','#a990c9'][i]),1.5,2.3,0,0,0));
  const safePad=primitive('Sandgrund safe area','cylinder',sandgrund.safe.x,.1,sandgrund.safe.z,8,.035,8,mint);
  const safeSign=card('Besökarnas samling',labelTex(['SAMLINGSPLATS','BESÖKARE HIT'], '#225345','#b8f4ca'),4.2,1.3,sandgrund.safe.x,2.4,sandgrund.safe.z,true);
  // 2.13: hållplatser. De tre gamla (Torget, Domkyrkan, Sandgrund) finns i alla lägen; linjenätets övriga hållplatser
  // visas bara i City Explore. Skylten byter text efter läge: Zombieexpressen eller linjenummer.
  const lineName=s=>s.hub?'TORGET · ALLA LINJER':'LINJE '+s.line+' · '+s.name.toUpperCase();
  const legacyIds=new Set(journey.busStops.map(s=>s.id));
  const peacefulSign=s=>labelTex(s.hub?['VÄRMLANDSTRAFIK','TORGET · LINJER ↓']:['LINJE '+s.line,s.name.toUpperCase()],s.color||'#f9b000','#fff8e1');
  const stopList=[...journey.busStops.map(s=>({...s,legacy:true,net:journey.busNetwork.some(n=>n.id===s.id),...(journey.busNetwork.find(n=>n.id===s.id)||{})})),...journey.busNetwork.filter(s=>!legacyIds.has(s.id)).map(s=>({...s,legacy:false,net:true}))];
  const setTex=(e,tex)=>{const m=e.render.meshInstances[0].material;m.emissiveMap=tex;m.opacityMap=tex;m.update();};
  const busViews=stopList.map(s=>{
    const post=primitive('bus-stop-post','box',s.x,1.7,s.z,.15,3.4,.15,ink);
    const zombieTex=labelTex(['VÄRMLANDSTRAFIK',s.name.toUpperCase()], '#f9b000','#243941'),calmTex=peacefulSign(s);
    const sign=card((s.legacy?'Zombieexpressen ':'Hållplats ')+s.name,s.legacy?zombieTex:calmTex,3.3,1.1,s.x,2.8,s.z,true);
    const pad=primitive('bus-stop-pad','cylinder',s.x,.1,s.z,5,.06,5,s.legacy?orangeMat():material(s.color||'#f59554'));
    const off=s.bus||[6,2];
    const vehicle=createBusModel(pc,host,draw,s.x+off[0],s.z+off[1]);
    return {s,post,sign,pad,vehicle,zombieTex,calmTex,calm:!s.legacy};
  });
  // Linjetavla vid Torget: alla destinationer med linjefärg, så att man ser vart bussarna går.
  const hubStop=busViews.find(v=>v.s.hub);
  const boardTex=texture((c,w,h)=>{
    c.fillStyle='#183b35';c.fillRect(0,0,w,h);c.strokeStyle='#ffe7a0';c.lineWidth=10;c.strokeRect(8,8,w-16,h-16);
    c.fillStyle='#ffe7a0';c.textAlign='center';c.textBaseline='middle';c.font='900 38px sans-serif';c.fillText('VÄRMLANDSTRAFIK',w/2,46,w-40);
    c.font='800 24px sans-serif';c.fillStyle='#bfe9cf';c.fillText('LINJER FRÅN TORGET · TRYCK E',w/2,86,w-40);
    BUS_NETWORK.filter(n=>!n.hub).forEach((n,k)=>{
      const y=128+k*46;c.fillStyle=n.color;c.beginPath();c.arc(54,y,17,0,Math.PI*2);c.fill();
      c.fillStyle='#14231f';c.font='900 22px sans-serif';c.fillText(String(n.line),54,y+1);
      c.textAlign='left';c.fillStyle='#fff3cf';c.font='900 28px sans-serif';c.fillText(n.name.toUpperCase(),86,y+1,w-110);c.textAlign='center';
    });
  },512,512);
  const hubBoard=card('Linjetavla Torget',boardTex,3.4,3.4,hubStop?.s.x??0,1.1,hubStop?.s.z??0,true);hubBoard.enabled=false;
  function orangeMat(){return material('#f59554');}
  const escapes=journey.safeZones.map(s=>({s,pad:primitive('Tryggzon','cylinder',s.x,.075,s.z,6.6,.04,6.6,mint),sign:card('Säkra XP',labelTex(['TRYGGZON','800 XP → SÄKRA HÄR'], '#174c36','#acf2bd'),3.3,1,s.x,2.5,s.z,true)}));
  const postcards=journey.postcards.map(s=>({s,e:card('Vykort '+s.name,labelTex(['VYKORT','+100 XP · '+s.name.toUpperCase()], '#35616f','#fff0cb'),1.7,.85,s.x,.8,s.z)}));
  const eventCard=card('Gatuuppdrag',labelTex(['!','GATUUPPDRAG'], '#165c70','#9ff5ed'),2.4,1.1,0,1.2,0);
  const eventPad=primitive('Gatuuppdrag ring','cylinder',0,.1,0,3.8,.03,3.8,material('#78d9d1'));
  const bag=primitive('Kaffeväska','box',0,.5,0,.85,.8,.55,purple);eventCard.enabled=eventPad.enabled=bag.enabled=false;
  const storySigns=Object.fromEntries([['power',['KARLSTADS ENERGI','SLÅ PÅ STRÖMMEN']],['news',['NWT · EXTRA!','HÄMTA / LEVERERA']],['bowling',['ZOMBIEBOWLING','SPARKA VAGNEN']]].map(([kind,lines])=>[kind,card('Gatuhändelse '+kind,labelTex(lines,kind==='power'?'#216c72':kind==='news'?'#ad4f3f':'#593e76','#fff1c9'),3,1.1,0,1.7,0)]));
  Object.values(storySigns).forEach(e=>e.enabled=false);
  const cabinet=primitive('Elbox','box',0,.85,0,1.1,1.5,.6,ink);
  const switchSign=card('Strömbrytare',labelTex(['⚡','TRYCK SLÅ PÅ'], '#f7d178','#1b4541'),.9,.8,0,.65,.32,true);
  const paperBundle=card('Tidningsbunt',labelTex(['NWT','ZOMBIE NEKAR'], '#eee6cb','#253e41'),1.2,.7,0,.4,0,true);
  const cart=new pc.Entity('Zombiebowling kundvagn');root.addChild(cart);
  const steel=material('#b0d6cc');
  primitive('vagnbotten','box',0,.5,0,1.2,.1,1.4,steel,cart);
  for(const x of [-.59,.59]){primitive('vagnsida','box',x,.92,0,.07,.75,1.4,steel,cart);for(const z of [-.52,.52])primitive('vagnhjul','sphere',x,.25,z,.26,.35,.26,ink,cart);}
  primitive('vagnfront','box',0,.92,-.67,1.2,.7,.07,steel,cart);primitive('vagnhandtag','box',0,1.35,.8,1.4,.13,.14,purple,cart);
  cabinet.enabled=switchSign.enabled=paperBundle.enabled=cart.enabled=false;
  const chaosFlask=card('Dagens guldtermos',thermosTex(true,160),1.25,1.85,0,.3,0);
  const sunMaterial=material('#f8d970');sunMaterial.opacity=.38;sunMaterial.blendType=pc.BLEND_NORMAL;sunMaterial.depthWrite=false;sunMaterial.emissive=new pc.Color(0.5,0.35,0.04);sunMaterial.update();
  const sunPad=primitive('Sola över Karlstad','cylinder',0,.08,0,SUN.radius*2,.025,SUN.radius*2,sunMaterial);
  const sunSign=card('Följ solen',labelTex(['SOLA!','FÖLJ MIG · 2× XP'], '#f4d176','#224838'),2.7,.85,0,2.5,0);
  chaosFlask.enabled=sunPad.enabled=sunSign.enabled=false;
  // 2.16: ljusstråle vid Temporush-målet, sonarstrålar vid de närmaste termosarna och det vänliga spöket.
  const beamMat=material('#7fe3ff');beamMat.opacity=.34;beamMat.blendType=pc.BLEND_NORMAL;beamMat.depthWrite=false;beamMat.emissive=new pc.Color(.15,.65,.85);beamMat.update();
  const sonarMat=material('#6ff0c8');sonarMat.opacity=.3;sonarMat.blendType=pc.BLEND_NORMAL;sonarMat.depthWrite=false;sonarMat.emissive=new pc.Color(.12,.7,.5);sonarMat.update();
  const farMat=material('#bff6ff');farMat.opacity=.2;farMat.blendType=pc.BLEND_NORMAL;farMat.depthWrite=false;farMat.emissive=new pc.Color(.3,.8,.95);farMat.update();
  const beam=primitive('Temporush-fyr','cylinder',0,60,0,1.3,120,1.3,beamMat),beamRing=primitive('Temporush-ring','cylinder',0,.1,0,5.4,.04,5.4,beamMat),beamFar=primitive('Temporush-bana','cylinder',0,90,0,.9,180,.9,farMat);
  beam.enabled=beamRing.enabled=beamFar.enabled=false;
  const sonarBeams=Array.from({length:6},()=>{const e=primitive('Sonarstråle','cylinder',0,12,0,.5,24,.5,sonarMat);e.enabled=false;return e;});
  const ghostTex=powerTex('ghost'),ghostHelper=card('Spöket',ghostTex,1.7,1.7,0,1.4,0);ghostHelper.enabled=false;
  const comicCity=createComicCity(pc,host,draw);
  // MusicPartner på Kungsgatan: orange skylt och ring vid dörren.
  const officeSign=card('MusicPartner',labelTex(['MUSICPARTNER','CHECKA IN · MUSIK · XP'],'#252729','#e78336'),3.2,1.0,MUSIC_OFFICE.x+2.6,.15,MUSIC_OFFICE.z+1.5,true);
  const officePad=primitive('MusicPartner-ring','cylinder',MUSIC_OFFICE.x,.1,MUSIC_OFFICE.z,MUSIC_OFFICE.radius*1.2,.04,MUSIC_OFFICE.radius*1.2,material('#e78336'));
  officeSign.enabled=officePad.enabled=false;
  function nearbyStation(p){return stations.find(s=>Math.hypot(p.x-s.x,p.z-s.z)<4);}
  const rarityCache=new Map();let rarityDay='',lastNow=0;
  function update(p,now,game){
    const dtView=lastNow?Math.min(.1,Math.max(0,(now-lastNow)/1000)):0;lastNow=now;
    const roaming=game===journey;comicCity.update(p);
    const curse=journey.cursedHunt;
    const nearby=roaming&&!journey.xmas?.rushMode?journey.items.filter(t=>!journey.found.has(t.id)&&!curse?.pending(t.id)&&Math.hypot(t.x-p.x,t.z-p.z)<44).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,pickupPool.length):[];
    const clean=roaming&&journey.rush.mode==='clean',day=clean?journey.fun.day:'',used={common:0,silver:0,gold:0,rainbow:0},usedPower=Object.fromEntries(POWER_KINDS.map(k=>[k,0]));
    if(rarityDay!==day){rarityDay=day;rarityCache.clear();}
    nearby.forEach((t,i)=>{
      const pw=clean?powerOf(t.id,day):null;
      if(pw){const e=powerPools[pw][usedPower[pw]++];if(e){e.enabled=true;const s=1+Math.sin(now/240+i)*.08;e.setLocalScale(s,s,s);e.setPosition(t.x,(t.y||0)+.55+Math.sin(now/300+i)*.16,t.z);e.setEulerAngles(0,Math.atan2(p.x-t.x,p.z-t.z)*180/Math.PI,Math.sin(now/500+i)*6);}return;}
      let kind='common';if(clean){kind=rarityCache.get(t.id);if(!kind){kind=rarityFor(t.id,day);rarityCache.set(t.id,kind);}}
      const e=rarityPools[kind][used[kind]++];if(!e)return;e.enabled=true;
      e.setPosition(t.x,(t.y||0)+.28+Math.sin(now/350+i)*.12,t.z);e.setEulerAngles(0,Math.atan2(p.x-t.x,p.z-t.z)*180/Math.PI,Math.sin(now/650+i)*4);
    });
    for(const [kind,pool] of Object.entries(rarityPools))for(let k=used[kind];k<pool.length;k++)pool[k].enabled=false;
    for(const [kind,pool] of Object.entries(powerPools))for(let k=usedPower[kind];k<pool.length;k++)pool[k].enabled=false;
    for(const [kind,pool] of Object.entries(flyCards))for(const f of pool){
      f.life=Math.max(0,f.life-dtView);f.e.enabled=roaming&&f.life>0;if(!f.e.enabled)continue;
      const k=1-f.life/FLY,ease=k*k;f.e.setPosition(f.x+(p.x-f.x)*ease,f.y+.3+(p.y-1.2-f.y)*ease,f.z+(p.z-f.z)*ease);
      f.e.setLocalScale(1-.7*k,1-.7*k,1);f.e.setEulerAngles(0,Math.atan2(p.x-f.x,p.z-f.z)*180/Math.PI,k*180);
    }
    treasurePool.forEach(({t,e,glow})=>{
      const d=Math.hypot(p.x-t.x,p.z-t.z),open=clean&&!journey.treasuresFound.has(t.id)&&Math.abs((p.y??1.68)-1.68-(t.y||0))<3;
      e.enabled=open&&d<30;glow.enabled=open&&d<48;
      if(e.enabled){e.setPosition(t.x,(t.y||0)+.3+Math.sin(now/380)*.14,t.z);e.setEulerAngles(0,Math.atan2(p.x-t.x,p.z-t.z)*180/Math.PI,Math.sin(now/500)*3);}
      if(glow.enabled){const pulse=1+Math.sin(now/300)*.12;glow.setLocalScale(2.8*pulse,.03,2.8*pulse);}
    });
    {const tt=roaming&&journey.tempo.running&&!journey.xmas?.rushMode&&journey.tempo.target; // julgrenen: JulRushen ritar sina egna paket och sin egen stråle (xmas/xmas-view.js)
      beam.enabled=beamRing.enabled=!!tt;
      if(tt){const pulse=1+Math.sin(now/180)*.18;beam.setPosition(tt.x,(tt.y||0)+60,tt.z);beam.setLocalScale(1.3*pulse,120,1.3*pulse);beamRing.setPosition(tt.x,(tt.y||0)+.1,tt.z);beamRing.setLocalScale(5.4*pulse,.04,5.4*pulse);}
      // Bortre strålen markerar banans riktning längre fram, så att man ser åt vilket håll det bär även mellan pärlorna.
      const aim=tt?journey.tempoAim(p):null;beamFar.enabled=!!aim&&Math.hypot(aim.x-tt.x,aim.z-tt.z)>12;
      if(beamFar.enabled)beamFar.setPosition(aim.x,(tt.y||0)+90,aim.z);
      const scan=roaming&&clean&&journey.fun.power.scanning();
      let n=0;
      if(scan){const near2=journey.items.filter(t=>!journey.found.has(t.id)&&Math.abs((p.y??1.68)-1.68-(t.y||0))<1.5).map(t=>({t,d:Math.hypot(t.x-p.x,t.z-p.z)})).filter(o=>o.d<POWER_RADAR_RANGE).sort((a,b)=>a.d-b.d).slice(0,sonarBeams.length);
        for(const o of near2){const e=sonarBeams[n++];e.enabled=true;const pulse=1+Math.sin(now/220+n)*.2;e.setPosition(o.t.x,(o.t.y||0)+12,o.t.z);e.setLocalScale(.5*pulse,24,.5*pulse);}}
      for(;n<sonarBeams.length;n++)sonarBeams[n].enabled=false;
      const gh=journey.helper,ghOn=roaming&&clean&&journey.fun.power.ghosting()&&gh.active;
      ghostHelper.enabled=ghOn;if(ghOn){ghostHelper.setPosition(gh.x,1.5+Math.sin(now/260)*.25,gh.z);ghostHelper.setEulerAngles(0,Math.atan2(p.x-gh.x,p.z-gh.z)*180/Math.PI,Math.sin(now/300)*8);}
    }
    cursedPool.forEach(({t,e},i)=>{e.enabled=roaming&&!journey.found.has(t.id)&&curse.pending(t.id)&&Math.hypot(t.x-p.x,t.z-p.z)<52;if(e.enabled){e.setPosition(t.x,(t.y||0)+.32+Math.sin(now/260+i)*.18,t.z);e.setEulerAngles(0,Math.atan2(p.x-t.x,p.z-t.z)*180/Math.PI,Math.sin(now/180+i)*7);}});
    secretPool.forEach(({s,e})=>{e.enabled=roaming&&journey.rush.mode!=='trail'&&!journey.secretsFound.has(s.id)&&Math.hypot(p.x-s.x,p.z-s.z)<30;if(e.enabled){e.setPosition(s.x,(s.y??0)+.3+Math.sin(now/400)*.15,s.z);e.setEulerAngles(0,Math.atan2(p.x-s.x,p.z-s.z)*180/Math.PI,0);}});
    portalViews.forEach(v=>{v.e.enabled=v.ring.enabled=roaming&&!journey.rush.peaceful&&(Math.hypot(p.x-v.p.x,p.z-v.p.z)<38||(journey.routeMode==='mission'&&journey.destination===v.id));v.e.setEulerAngles(0,Math.atan2(p.x-v.p.x,p.z-v.p.z)*180/Math.PI,0);});
    ambushProps.forEach(({a,e})=>{e.enabled=roaming&&!journey.rush.peaceful&&!journey.cleared.has(a.id)&&Math.hypot(p.x-a.spawn.x,p.z-a.spawn.z)<40;});
    const gallery=game===sandgrund;safePad.enabled=safeSign.enabled=gallery;
    visitors.forEach((e,i)=>{const v=sandgrund.visitors[i];e.enabled=gallery&&!v.rescued;if(e.enabled){e.setPosition(v.x,0,v.z);e.setEulerAngles(0,Math.atan2(p.x-v.x,p.z-v.z)*180/Math.PI,0);}});
    for(const s of stations)s.e.setEulerAngles(0,Math.atan2(p.x-s.x,p.z-s.z)*180/Math.PI,0);
    const calmNow=roaming&&journey.rush.peaceful;
    {const d=Math.hypot(p.x-MUSIC_OFFICE.x,p.z-MUSIC_OFFICE.z);officeSign.enabled=officePad.enabled=calmNow&&d<45;if(officeSign.enabled)officeSign.setEulerAngles(0,Math.atan2(p.x-MUSIC_OFFICE.x,p.z-MUSIC_OFFICE.z)*180/Math.PI,0);}
    busViews.forEach(v=>{
      const {s,post,sign,pad,vehicle}=v,shown=calmNow?s.net:s.legacy,d=Math.hypot(p.x-s.x,p.z-s.z);
      post.enabled=shown;
      if(s.legacy&&v.calm!==calmNow){v.calm=calmNow;setTex(sign,calmNow?v.calmTex:v.zombieTex);}
      sign.enabled=pad.enabled=roaming&&shown&&d<45&&!(s.hub&&calmNow);vehicle.enabled=roaming&&shown&&d<60;
      sign.setEulerAngles(0,Math.atan2(p.x-s.x,p.z-s.z)*180/Math.PI,0);
    });
    if(hubStop){const d=Math.hypot(p.x-hubStop.s.x,p.z-hubStop.s.z);hubBoard.enabled=calmNow&&d<45;hubStop.pad.enabled=roaming&&d<45;if(hubBoard.enabled)hubBoard.setEulerAngles(0,Math.atan2(p.x-hubStop.s.x,p.z-hubStop.s.z)*180/Math.PI,0);}
    escapes.forEach(({s,pad,sign})=>{pad.enabled=sign.enabled=roaming&&journey.rush.mode==='timed'&&(journey.rush.exitReady||Math.hypot(p.x-s.x,p.z-s.z)<20);sign.setEulerAngles(0,Math.atan2(p.x-s.x,p.z-s.z)*180/Math.PI,0);});
    postcards.forEach(({s,e})=>{e.enabled=roaming&&!journey.rush.peaceful&&!journey.postcardsFound.has(s.id)&&Math.hypot(p.x-s.x,p.z-s.z)<38;if(e.enabled)e.setEulerAngles(0,Math.atan2(p.x-s.x,p.z-s.z)*180/Math.PI,0);});
    const sun=journey.rush.ecology.sun;sunPad.enabled=sunSign.enabled=roaming&&!!sun;
    if(roaming&&sun){sunPad.setPosition(sun.x,.08,sun.z);sunSign.setPosition(sun.x,2.4+Math.sin(now/750)*.08,sun.z);sunSign.setEulerAngles(0,Math.atan2(p.x-sun.x,p.z-sun.z)*180/Math.PI,0);}
    const chaos=journey.rush.chaosTarget;chaosFlask.enabled=roaming&&!!chaos&&!journey.rush.exitReady;
    if(chaosFlask.enabled){chaosFlask.setPosition(chaos.spot.x,.35+Math.sin(now/300)*.15,chaos.spot.z);chaosFlask.setEulerAngles(0,Math.atan2(p.x-chaos.spot.x,p.z-chaos.spot.z)*180/Math.PI,0);}
    const c=journey.rush.contract,visible=roaming&&!!c&&!journey.rush.exitReady;
    const story=visible&&storySigns[c.kind];
    eventCard.enabled=visible&&!story;eventPad.enabled=visible;bag.enabled=visible&&c.kind==='parcel';
    for(const [kind,e] of Object.entries(storySigns)){e.enabled=visible&&kind===c.kind;if(e.enabled){e.setPosition(c.spot.x,2.3,c.spot.z);e.setEulerAngles(0,Math.atan2(p.x-c.spot.x,p.z-c.spot.z)*180/Math.PI,0);}}
    cabinet.enabled=switchSign.enabled=visible&&c.kind==='power';paperBundle.enabled=visible&&c.kind==='news';cart.enabled=visible&&c.kind==='bowling';
    if(visible){eventCard.setPosition(c.spot.x,1.7+Math.sin(now/400)*.1,c.spot.z);eventCard.setEulerAngles(0,Math.atan2(p.x-c.spot.x,p.z-c.spot.z)*180/Math.PI,0);eventPad.setPosition(c.spot.x,.1,c.spot.z);bag.setPosition(c.spot.x,.55,c.spot.z);
      if(cabinet.enabled){cabinet.setPosition(c.spot.x,.85,c.spot.z);switchSign.setPosition(c.spot.x,.65,c.spot.z+.34);switchSign.setEulerAngles(0,Math.atan2(p.x-c.spot.x,p.z-c.spot.z)*180/Math.PI,0);}
      if(paperBundle.enabled){paperBundle.setPosition(c.spot.x,.4,c.spot.z);paperBundle.setEulerAngles(0,Math.atan2(p.x-c.spot.x,p.z-c.spot.z)*180/Math.PI,0);}
      if(cart.enabled){cart.setPosition(c.cart.x,0,c.cart.z);if(Math.hypot(c.cart.vx,c.cart.vz)>.2)cart.setEulerAngles(0,Math.atan2(-c.cart.vx,-c.cart.vz)*180/Math.PI,0);}
    }

  }
  function radar(c,point,roaming){if(!roaming)return;
    const day=journey.rush.mode==='clean'?journey.fun.day:'';
    const scanning=day&&journey.fun.power.scanning();
    const tg=journey.tempo.running&&!journey.xmas?.rushMode?journey.tempo.target:null;
    c.fillStyle='#c994f1';for(const t of (journey.xmas?.rushMode?[]:journey.items))if(!journey.found.has(t.id)){const [x,y]=point(t.x,t.z);if(x>0&&y>0&&x<256&&y<256){if(day&&powerOf(t.id,day)){c.fillStyle='#ffb347';c.fillRect(x-3.5,y-3.5,7,7);c.fillStyle='#c994f1';}else c.fillRect(x-2,y-2,4,4);}}
    if(scanning){c.strokeStyle='#6ff0c8';c.globalAlpha=.55;c.lineWidth=2;const ph=(performance.now()/900)%1;const [cx,cy]=point(journey.position.x,journey.position.z);c.beginPath();c.arc(cx,cy,10+ph*70,0,Math.PI*2);c.stroke();c.globalAlpha=1;}
    if(tg){const [x,y]=point(tg.x,tg.z);c.fillStyle='#7fe3ff';c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fill();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();}
    c.fillStyle='#ffe18c';if(!journey.rush.peaceful)for(const p of Object.values(portals)){const [x,y]=point(p.x,p.z);c.fillRect(x-5,y-5,10,10);}
    c.fillStyle='#f79b68';for(const s of (journey.rush.peaceful?journey.busNetwork:journey.busStops)){const [x,y]=point(s.x,s.z);c.fillRect(x-4,y-4,8,8);}
    const sun=journey.rush.ecology.sun;if(sun){const [x,y]=point(sun.x,sun.z);c.beginPath();c.arc(x,y,13,0,Math.PI*2);c.fillStyle='#ffdd6680';c.fill();c.strokeStyle='#ffdf71';c.lineWidth=2;c.stroke();}
    const chaos=journey.rush.chaosTarget;if(chaos){const [x,y]=point(chaos.spot.x,chaos.spot.z);c.fillStyle='#ffdf71';c.fillRect(x-4,y-4,8,8);}
    if(journey.rush.mode==='timed'){c.strokeStyle='#9ef2b2';c.lineWidth=2;for(const s of journey.safeZones){const [x,y]=point(s.x,s.z);c.strokeRect(x-7,y-7,14,14);}}
  }
  return {update,radar,nearbyStation,burst};
}
