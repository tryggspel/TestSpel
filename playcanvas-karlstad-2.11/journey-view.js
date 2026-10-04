import {createBusModel} from './transit-art.js?v=2.11.18';
import {createComicCity} from './comic-city.js?v=2.11.18';
import {SUN} from './city-ecology.mjs?v=2.11.18';
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
  const cursedPool=journey.cursedHunt?journey.cursedHunt.cursed.map(t=>({t,e:card('Förbannad termos',cursedFlask,1,1.55,t.x,(t.y||0)+.28,t.z)})):[];
  const pickupPool=Array.from({length:18},()=>card('Löfbergs termos',flask,.9,1.4,0,0,0));
  const secretPool=journey.secrets.map(s=>({s,e:card('Guldtermos '+s.name,secretFlask,1.1,1.7,s.x,.2,s.z)}));
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
  const busViews=journey.busStops.map(s=>{
    primitive('bus-stop-post','box',s.x,1.7,s.z,.15,3.4,.15,ink);
    const sign=card('Zombieexpressen '+s.name,labelTex(['VÄRMLANDSTRAFIK',s.name.toUpperCase()], '#f9b000','#243941'),3.3,1.1,s.x,2.8,s.z,true);
    const pad=primitive('bus-stop-pad','cylinder',s.x,.1,s.z,5,.06,5,orangeMat());
    const vehicle=createBusModel(pc,host,draw,s.x+6,s.z+2);
    return {s,sign,pad,vehicle};
  });
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
  const comicCity=createComicCity(pc,host,draw);
  function nearbyStation(p){return stations.find(s=>Math.hypot(p.x-s.x,p.z-s.z)<4);}
  function update(p,now,game){
    const roaming=game===journey;comicCity.update(p);
    const curse=journey.cursedHunt;
    const nearby=roaming?journey.items.filter(t=>!journey.found.has(t.id)&&!curse?.pending(t.id)&&Math.hypot(t.x-p.x,t.z-p.z)<44).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)).slice(0,pickupPool.length):[];
    pickupPool.forEach((e,i)=>{e.enabled=i<nearby.length;if(!e.enabled)return;const t=nearby[i];e.setPosition(t.x,(t.y||0)+.28+Math.sin(now/350+i)*.12,t.z);e.setEulerAngles(0,Math.atan2(p.x-t.x,p.z-t.z)*180/Math.PI,Math.sin(now/650+i)*4);});
    cursedPool.forEach(({t,e},i)=>{e.enabled=roaming&&!journey.found.has(t.id)&&curse.pending(t.id)&&Math.hypot(t.x-p.x,t.z-p.z)<52;if(e.enabled){e.setPosition(t.x,(t.y||0)+.32+Math.sin(now/260+i)*.18,t.z);e.setEulerAngles(0,Math.atan2(p.x-t.x,p.z-t.z)*180/Math.PI,Math.sin(now/180+i)*7);}});
    secretPool.forEach(({s,e})=>{e.enabled=roaming&&journey.rush.mode!=='trail'&&!journey.secretsFound.has(s.id)&&Math.hypot(p.x-s.x,p.z-s.z)<30;if(e.enabled){e.setPosition(s.x,(s.y??0)+.3+Math.sin(now/400)*.15,s.z);e.setEulerAngles(0,Math.atan2(p.x-s.x,p.z-s.z)*180/Math.PI,0);}});
    portalViews.forEach(v=>{v.e.enabled=v.ring.enabled=roaming&&!journey.rush.peaceful&&(Math.hypot(p.x-v.p.x,p.z-v.p.z)<38||(journey.routeMode==='mission'&&journey.destination===v.id));v.e.setEulerAngles(0,Math.atan2(p.x-v.p.x,p.z-v.p.z)*180/Math.PI,0);});
    ambushProps.forEach(({a,e})=>{e.enabled=roaming&&!journey.rush.peaceful&&!journey.cleared.has(a.id)&&Math.hypot(p.x-a.spawn.x,p.z-a.spawn.z)<40;});
    const gallery=game===sandgrund;safePad.enabled=safeSign.enabled=gallery;
    visitors.forEach((e,i)=>{const v=sandgrund.visitors[i];e.enabled=gallery&&!v.rescued;if(e.enabled){e.setPosition(v.x,0,v.z);e.setEulerAngles(0,Math.atan2(p.x-v.x,p.z-v.z)*180/Math.PI,0);}});
    for(const s of stations)s.e.setEulerAngles(0,Math.atan2(p.x-s.x,p.z-s.z)*180/Math.PI,0);
    busViews.forEach(({s,sign,pad,vehicle})=>{sign.enabled=pad.enabled=roaming&&Math.hypot(p.x-s.x,p.z-s.z)<45;vehicle.enabled=roaming&&Math.hypot(p.x-s.x,p.z-s.z)<60;sign.setEulerAngles(0,Math.atan2(p.x-s.x,p.z-s.z)*180/Math.PI,0);});
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
    c.fillStyle='#c994f1';for(const t of journey.items)if(!journey.found.has(t.id)){const [x,y]=point(t.x,t.z);if(x>0&&y>0&&x<256&&y<256)c.fillRect(x-2,y-2,4,4);}
    c.fillStyle='#ffe18c';if(!journey.rush.peaceful)for(const p of Object.values(portals)){const [x,y]=point(p.x,p.z);c.fillRect(x-5,y-5,10,10);}
    c.fillStyle='#f79b68';for(const s of journey.busStops){const [x,y]=point(s.x,s.z);c.fillRect(x-4,y-4,8,8);}
    const sun=journey.rush.ecology.sun;if(sun){const [x,y]=point(sun.x,sun.z);c.beginPath();c.arc(x,y,13,0,Math.PI*2);c.fillStyle='#ffdd6680';c.fill();c.strokeStyle='#ffdf71';c.lineWidth=2;c.stroke();}
    const chaos=journey.rush.chaosTarget;if(chaos){const [x,y]=point(chaos.spot.x,chaos.spot.z);c.fillStyle='#ffdf71';c.fillRect(x-4,y-4,8,8);}
    if(journey.rush.mode==='timed'){c.strokeStyle='#9ef2b2';c.lineWidth=2;for(const s of journey.safeZones){const [x,y]=point(s.x,s.z);c.strokeRect(x-7,y-7,14,14);}}
  }
  return {update,radar,nearbyStation};
}
