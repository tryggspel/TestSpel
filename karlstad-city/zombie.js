/* Zombie Apocalypse Karlstad. Original, non-gory FPS survival game.
   No network state, payments or city-quest save writes. All effects are pooled. */
window.KarlstadZombie=function(world){
 'use strict';
 const B=BABYLON,V=B.Vector3,scene=world.scene,software=world.engine instanceof B.NullEngine;
 const root=new B.TransformNode('Zombie Apocalypse Karlstad',scene);
 const colour=h=>B.Color3.FromHexString(h),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function material(name,hex,glow=false){const m=new B.StandardMaterial(name,scene);m.diffuseColor=colour(hex);m.specularColor=glow?B.Color3.Black():colour('#82999d');if(glow){m.emissiveColor=colour(hex);m.disableLighting=true;}return m;}
 const metal=material('solar projector graphite','#263944'),trim=material('solar projector ivory','#c8d0c1'),gold=material('solar energy','#ffdc73',true),mint=material('quarantine light','#b4ff89',true),black=material('survival rubber','#121c25'),amber=material('warning amber','#dd9046',true);
 function mesh(kind,name,opts,mat,parent=root){const m=B.MeshBuilder[kind](name,opts,scene);m.material=mat;m.parent=parent;m.isPickable=false;return m;}
 function box(name,w,h,d,x,y,z,mat,parent=root){const m=mesh('CreateBox',name,{width:w,height:h,depth:d},mat,parent);m.position.set(x,y,z);return m;}
 // A deliberately original solar projector, held by a pair of gloved hands.
 const weapon=new B.TransformNode('first person solar projector',scene);weapon.parent=world.camera;
 box('right sleeve',.16,.17,.44,.19,-.32,.17,metal,weapon);
 box('right glove',.15,.16,.23,.18,-.24,.39,black,weapon);
 box('left sleeve',.14,.15,.37,-.08,-.32,.31,metal,weapon).rotation.z=-.43;
 box('left glove',.14,.12,.19,-.01,-.24,.49,black,weapon);
 box('solar chassis',.25,.21,.51,.14,-.16,.49,metal,weapon);
 box('ivory top rail',.27,.05,.36,.14,-.035,.51,trim,weapon);
 box('energy cell',.055,.12,.27,.29,-.14,.46,gold,weapon);
 box('sight back',.08,.075,.045,.14,.007,.34,black,weapon);
 box('sight glow',.021,.033,.012,.14,.043,.322,mint,weapon);
 const barrel=mesh('CreateCylinder','hexagonal solar emitter',{height:.35,diameter:.19,tessellation:8},trim,weapon);barrel.rotation.x=Math.PI/2;barrel.position.set(.14,-.12,.79);
 const core=mesh('CreateSphere','contained sunlight',{diameter:.12,segments:12},gold,weapon);core.position.set(.14,-.12,.981);
 const muzzle=mesh('CreateTorus','solar emitter ring',{diameter:.235,thickness:.027,tessellation:24},gold,weapon);muzzle.rotation.x=Math.PI/2;muzzle.position.copyFrom(core.position);
 const flashlight=new B.SpotLight('survival flashlight',new V(0,0,.35),new V(0,0,1),Math.PI*.5,2,scene);flashlight.parent=world.camera;flashlight.diffuse=colour('#f1e7c5');flashlight.range=36;flashlight.intensity=0;
 const pulseLight=new B.PointLight('solar muzzle light',new V(.14,-.12,.9),scene);pulseLight.parent=weapon;pulseLight.diffuse=colour('#ffcd60');pulseLight.range=8;pulseLight.intensity=0;
 // Contact shadows remain cheap and readable even at the mobile quality preset.
 const shadowMat=material('zombie contact shadow','#0a151b');shadowMat.alpha=.38;shadowMat.disableLighting=true;
 const originals=[...world.actors,...world.citizens.map(p=>p.actor)],extras=[];
 for(let i=0;i<10;i++){const actor=KarlstadCharacter(scene,{name:'Skuggvandrare '+(i+1),shirt:['#607e65','#7b5961','#4e6579'][i%3],skin:'#aac19a',hair:'#343b3a',scale:i%4===0?1.10:.97});actor.setZombie(true);actor.root.setEnabled(false);extras.push(actor);}
 const enemies=[...originals,...extras].map((actor,i)=>{const shadow=mesh('CreateDisc','infected contact shadow',{radius:.65,tessellation:18},shadowMat);shadow.rotation.x=Math.PI/2;return {actor,shadow,index:i,stun:0,attack:0,phase:i*2.17,extra:i>=originals.length,saved:null,hit:0,pathClock:0,pathTarget:null,direct:true};});
 const stationDefs=[{x:0,z:5,name:'TINGVALLASTADEN'},{x:0,z:53,name:'KULTURSTRÅKET'},{x:25,z:96,name:'SANDGRUND'}];
 const stations=stationDefs.map((s,i)=>{const node=new B.TransformNode('Solfyr '+(i+1),scene);node.parent=root;node.position.set(s.x,0,s.z);
  box('solar power plinth',1.5,.28,1.5,0,.17,0,metal,node);box('solar control station',.64,1.6,.48,0,1.06,0,metal,node);box('generator light',.42,.7,.025,0,1.30,-.252,amber,node);
  const orb=mesh('CreatePolyhedron','solar relay core',{type:1,size:.38},gold,node);orb.position.y=2.36;
  const halo=mesh('CreateTorus','relay radius',{diameter:5.3,thickness:.045,tessellation:40},gold,node);halo.position.y=.16;
  const vertical=mesh('CreateTorus','solar relay orbit',{diameter:1.3,thickness:.035,tessellation:32},gold,node);vertical.position.y=2.36;vertical.rotation.x=Math.PI/2;
  return {...s,node,orb,halo,vertical,charge:0,on:false};
 });
 const exit={x:-24,z:98,name:'EVAKUERING · MUSEET'};
 const exitRing=mesh('CreateTorus','museum evacuation zone',{diameter:7,thickness:.085,tessellation:48},mint);exitRing.position.set(exit.x,.18,exit.z);exitRing.setEnabled(false);
 // An abandoned quarantine layer. Decorative barriers sit at street edges and
 // deliberately leave every existing mission route and survival station open.
 const tapeTexture=new B.DynamicTexture('Karlstad quarantine markings',{width:512,height:128},scene,false),tc=tapeTexture.getContext();tc.fillStyle='#1c3033';tc.fillRect(0,0,512,128);tc.fillStyle='#bdda82';for(let x=-80;x<600;x+=80){tc.beginPath();tc.moveTo(x,0);tc.lineTo(x+38,0);tc.lineTo(x-35,128);tc.lineTo(x-73,128);tc.fill();}tc.fillStyle='#15292b';tc.fillRect(80,30,352,68);tc.fillStyle='#e4f0c1';tc.font='bold 29px Arial';tc.textAlign='center';tc.fillText('KARLSTAD · SOLZON',256,75);tapeTexture.update();
 const tape=material('reflective quarantine signage','#ffffff');tape.diffuseTexture=tapeTexture;tape.emissiveColor=colour('#303c25');
 for(const [x,z,angle]of [[-12,20,.12],[12,43,-.13],[-12,74,.18],[37,90,-.15],[-35,88,.22]]){const barricade=new B.TransformNode('abandoned street barricade',scene);barricade.parent=root;barricade.position.set(x,0,z);barricade.rotation.y=angle;
  for(const sx of [-1.3,1.3]){box('barricade foot',.9,.12,.7,sx,.1,0,black,barricade);box('barricade support',.1,1.3,.1,sx,.7,0,trim,barricade);}box('reflective quarantine board',3.1,.55,.08,0,1.03,0,tape,barricade);box('emergency lamp',.18,.13,.15,1.3,1.47,0,amber,barricade);
 }
 const ashes=Array.from({length:28},(_,i)=>{const m=mesh('CreatePolyhedron','windblown ash',{type:1,size:.022+(i%3)*.009},trim);return {m,phase:i*2.399};});
 // Fixed visual pools: a shot never allocates a new scene mesh.
 const beams=Array.from({length:7},()=>({m:mesh('CreateCylinder','sunray',{height:1,diameter:.043,tessellation:6},gold),life:0}));
 const sparks=Array.from({length:24},()=>({m:mesh('CreatePolyhedron','solar spark',{type:1,size:.055},gold),life:0,v:new V()}));
 const novaRing=mesh('CreateTorus','solnova shockwave',{diameter:2,thickness:.045,tessellation:48},gold);novaRing.setEnabled(false);
 const mist=[];
 if(!software){const tex=new B.DynamicTexture('procedural ground mist',{width:128,height:128},scene,false),ctx=tex.getContext();const g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(119,159,154,.22)');g.addColorStop(.55,'rgba(91,130,128,.12)');g.addColorStop(1,'rgba(65,97,100,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);tex.update();const mat=new B.StandardMaterial('low river mist',scene);mat.diffuseTexture=tex;mat.opacityTexture=tex;mat.emissiveColor=colour('#456a70');mat.disableLighting=true;mat.backFaceCulling=false;mat.disableDepthWrite=true;
  for(let i=0;i<22;i++){const m=mesh('CreatePlane','apocalypse mist',{width:14+(i%4)*3,height:2.5},mat);m.billboardMode=B.Mesh.BILLBOARDMODE_Y;mist.push({m,x:(i%3-1)*14,z:-30+i*7});}
 }
 // A common flow field guides the whole horde around buildings, including corners.
 // It is rebuilt on entry (the city bus may have moved), then updated twice/second.
 let grid,links,flow,queue,gridClock=0,gridTarget=-1;const gx=-180,gz=-148,step=4,nx=66,nz=78,count=nx*nz;
 const position=i=>({x:gx+(i%nx)*step,z:gz+Math.floor(i/nx)*step});
 function clear(x,z,tx,tz){const d=Math.hypot(tx-x,tz-z),n=Math.ceil(d/.55);for(let i=1;i<=n;i++){const f=i/n;if(world.collides(x+(tx-x)*f,z+(tz-z)*f))return false;}return true;}
 function nearest(x,z){let found=-1,best=Infinity;const ix=Math.round((x-gx)/step),iz=Math.round((z-gz)/step);for(let r=0;r<6;r++){for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const a=ix+dx,b=iz+dy;if(a<0||a>=nx||b<0||b>=nz)continue;const i=b*nx+a;if(!grid[i])continue;const p=position(i),d=(x-p.x)**2+(z-p.z)**2;if(d<best&&clear(x,z,p.x,p.z)){best=d;found=i;}}if(found>=0)return found;}return -1;}
 function buildGrid(){grid=new Uint8Array(count);links=Array.from({length:count},()=>[]);flow=new Uint16Array(count);queue=new Int32Array(count);for(let i=0;i<count;i++){const p=position(i);grid[i]=!world.collides(p.x,p.z);}for(let i=0;i<count;i++){if(!grid[i])continue;const a=position(i),ix=i%nx,iz=Math.floor(i/nx);for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){const x=ix+dx,z=iz+dz,j=z*nx+x;if(x<0||x>=nx||z<0||z>=nz||!grid[j])continue;const b=position(j);if(clear(a.x,a.z,b.x,b.z))links[i].push(j);}}gridTarget=-1;gridClock=0;}
 function updateFlow(player){const target=nearest(player.x,player.z);if(target===gridTarget)return;gridTarget=target;flow.fill(65535);if(target<0)return;let head=0,tail=0;queue[tail++]=target;flow[target]=0;while(head<tail){const i=queue[head++];for(const j of links[i])if(flow[j]===65535){flow[j]=flow[i]+1;queue[tail++]=j;}}}
 let running=false,elapsed=0,health=100,energy=100,cooldown=0,lastShot=10,novaCooldown=0,neutralized=0,combo=0,lastHit=-20,points=0,wave=1,finished=false,won=false,damage=0,hitMarker=0,recoil=0,novaAge=99,extract=0,events=[],shotIndex=0;
 function spawn(enemy,player,offset=0){let found=null;for(let k=0;k<28;k++){const a=offset+k*2.399,r=12+(k%5)*2,x=player.x+Math.sin(a)*r,z=player.z+Math.cos(a)*r;if(!world.collides(x,z)&&clear(player.x,player.z,x,z)){found={x,z};break;}}if(!found){const i=nearest(player.x,player.z);found=i>=0?position(i):player;}enemy.actor.root.position.set(found.x,0,found.z);enemy.stun=0;enemy.attack=2;enemy.hit=0;enemy.actor.root.setEnabled(true);}
 function start(player){
  if(running)stop();elapsed=0;health=energy=100;cooldown=0;lastShot=10;novaCooldown=0;neutralized=combo=points=0;lastHit=-20;wave=1;finished=won=false;damage=hitMarker=recoil=extract=0;novaAge=99;events=[];running=true;root.setEnabled(true);weapon.setEnabled(true);flashlight.intensity=2.1;world.setApocalypse(true);
  buildGrid();updateFlow(player);
  enemies.forEach((e,i)=>{e.stun=0;e.attack=2;e.hit=0;e.pathClock=0;e.pathTarget=null;if(!e.extra){e.saved={position:e.actor.root.position.clone(),rotation:e.actor.root.rotation.clone(),enabled:e.actor.root.isEnabled()};}else if(i<originals.length+2)spawn(e,player,(i-originals.length)*Math.PI);else e.actor.root.setEnabled(false);});
  for(const s of stations){s.on=false;s.charge=0;s.halo.material=gold;}exitRing.setEnabled(false);for(const b of beams){b.life=0;b.m.setEnabled(false);}for(const s of sparks){s.life=0;s.m.setEnabled(false);}novaRing.setEnabled(false);
 }
 function stop(){running=false;root.setEnabled(false);weapon.setEnabled(false);flashlight.intensity=pulseLight.intensity=0;world.setApocalypse(false);for(const e of enemies){if(e.extra)e.actor.root.setEnabled(false);else if(e.saved){e.actor.root.position.copyFrom(e.saved.position);e.actor.root.rotation.copyFrom(e.saved.rotation);e.actor.root.setEnabled(e.saved.enabled);e.saved=null;}}events=[];}
 function burst(p){for(let i=0;i<8;i++){const s=sparks.find(s=>s.life<=0)||sparks[i];s.life=.45+(i%3)*.1;s.m.setEnabled(true);s.m.position.copyFrom(p);const a=i*Math.PI/4;s.v.set(Math.sin(a)*(2+i%2),1.5+Math.cos(a),Math.cos(a)*2);}}
 function stun(enemy){enemy.stun=7;enemy.hit=0;neutralized++;combo=elapsed-lastHit<3?Math.min(8,combo+1):1;lastHit=elapsed;points+=100+combo*25;hitMarker=.2;burst(enemy.actor.root.position.add(new V(0,1.3,0)));events.push({type:'stun',combo});}
 function beam(from,to){const b=beams[shotIndex++%beams.length],d=to.subtract(from);b.life=.10;b.m.setEnabled(true);b.m.position.copyFrom(from.add(to).scale(.5));b.m.scaling.y=d.length();b.m.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(new V(0,1,0),d.normalize(),new B.Quaternion());}
 function shoot(origin,direction){if(!running||finished||cooldown>0||energy<8)return false;energy-=8;cooldown=.16;lastShot=0;recoil=.075;events.push({type:'shot'});const dir=direction.normalizeToNew();let range=48;
  for(let d=.6;d<range;d+=.45){const p=origin.add(dir.scale(d));if(p.y<.1||world.collides(p.x,p.z)){range=d;break;}}
  let victim=null,near=range;
  for(const e of enemies){if(!e.actor.root.isEnabled()||e.stun>0)continue;for(const y of [.82,1.38,1.88]){const center=e.actor.root.position.add(new V(0,y,0)),delta=center.subtract(origin),t=V.Dot(delta,dir);if(t<0||t>=near)continue;const radius=.42+Math.min(.15,t*.008),miss=delta.lengthSquared()-t*t;if(miss<=radius*radius){near=t;victim=e;}}}
  const end=origin.add(dir.scale(near));world.camera.computeWorldMatrix(true);const muzzlePoint=V.TransformCoordinates(new V(.14,-.12,.99),weapon.computeWorldMatrix(true));beam(muzzlePoint,end);if(victim)stun(victim);else burst(end);return true;
 }
 function nova(player){if(!running||finished||novaCooldown>0||energy<25)return false;energy-=25;novaCooldown=14;novaAge=0;novaRing.position.set(player.x,.22,player.z);novaRing.setEnabled(true);for(const e of enemies){const p=e.actor.root.position;if(e.actor.root.isEnabled()&&e.stun<=0&&Math.hypot(p.x-player.x,p.z-player.z)<9&&clear(player.x,player.z,p.x,p.z))stun(e);}events.push({type:'nova'});return true;}
 function current(player){const pending=stations.filter(s=>!s.on).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));return pending[0]?{...pending[0],name:'SOLFYR · '+pending[0].name}:{...exit};}
 function update(dt,player,height=0){
  if(!running||finished)return [];
  elapsed+=dt;cooldown=Math.max(0,cooldown-dt);lastShot+=dt;novaCooldown=Math.max(0,novaCooldown-dt);damage=Math.max(0,damage-dt);hitMarker=Math.max(0,hitMarker-dt);recoil=Math.max(0,recoil-dt*.55);if(lastShot>.65)energy=Math.min(100,energy+dt*24);
  const nextWave=Math.min(3,1+Math.floor(elapsed/45));if(nextWave!==wave){wave=nextWave;enemies.filter(e=>e.extra&&!e.actor.root.isEnabled()).slice(0,4).forEach((e,i)=>spawn(e,player,i*1.8));events.push({type:'wave',wave});}
  gridClock-=dt;if(gridClock<=0){updateFlow(player);gridClock=.5;}
  let nearby=0;
  for(const e of enemies){const actor=e.actor,p=actor.root.position;e.shadow.setEnabled(actor.root.isEnabled());if(!actor.root.isEnabled())continue;e.shadow.position.set(p.x,.14,p.z);e.attack=Math.max(0,e.attack-dt);e.stun=Math.max(0,e.stun-dt);const d=Math.hypot(player.x-p.x,player.z-p.z);if(d<12&&e.stun<=0)nearby++;let speed=0;
   if(e.stun<=0){e.pathClock-=dt;if(e.pathClock<=0){e.pathClock=.34;e.direct=clear(p.x,p.z,player.x,player.z);if(!e.direct){const i=nearest(p.x,p.z);if(i>=0){let j=i;for(const n of links[i])if(flow[n]<flow[j])j=n;e.pathTarget=position(j);}else e.pathTarget={x:p.x,z:p.z};}}let target=e.direct?player:e.pathTarget||player;
    const dx=target.x-p.x,dz=target.z-p.z,len=Math.hypot(dx,dz);speed=2.15+wave*.48+(e.index%4)*.19;
    if(len>.1&&d>1.1){let mx=dx/len*speed*dt,mz=dz/len*speed*dt;for(const other of enemies){if(other===e||!other.actor.root.isEnabled())continue;const op=other.actor.root.position,dist=Math.hypot(p.x-op.x,p.z-op.z);if(dist>.05&&dist<.85){mx+=(p.x-op.x)/dist*(.85-dist)*dt*3;mz+=(p.z-op.z)/dist*(.85-dist)*dt*3;}}
     if(!world.collides(p.x+mx,p.z))p.x+=mx;if(!world.collides(p.x,p.z+mz))p.z+=mz;actor.root.rotation.y=Math.atan2(dx,dz);
    }else speed=0;
    if(d<1.65&&height<.75&&e.attack<=0&&clear(p.x,p.z,player.x,player.z)){e.attack=1.3;if(damage<=0){health=Math.max(0,health-13);damage=.85;events.push({type:'damage'});}}
   }
   actor.animateZombie(dt,e.stun>0?0:speed,e.stun>0,elapsed+e.phase);
  }
  for(const s of stations){s.orb.rotation.y=elapsed*1.1;s.vertical.rotation.z=elapsed*.5;s.orb.position.y=2.36+Math.sin(elapsed*2)*.12;const d=Math.hypot(player.x-s.x,player.z-s.z);if(!s.on&&d<2.9){s.charge=Math.min(3,s.charge+dt);if(s.charge>=3){s.on=true;s.halo.material=mint;health=Math.min(100,health+30);energy=100;points+=500;burst(new V(s.x,2,s.z));events.push({type:'relay',count:stations.filter(x=>x.on).length});}}else if(!s.on)s.charge=Math.max(0,s.charge-dt*.4);}
  const powered=stations.every(s=>s.on),dawn=elapsed>=135;exitRing.setEnabled(powered);exitRing.rotation.y=elapsed*.5;
  if(powered&&dawn&&Math.hypot(player.x-exit.x,player.z-exit.z)<3.5)extract+=dt;else extract=0;
  if(extract>=3){finished=won=true;points+=Math.round(health)*10+1000;events.push({type:'end',won:true});}
  if(health<=0&&!finished){finished=true;events.push({type:'end',won:false});}
  for(const b of beams){b.life-=dt;b.m.setEnabled(b.life>0);}for(const s of sparks){s.life-=dt;s.m.setEnabled(s.life>0);if(s.life>0){s.v.y-=dt*4;s.m.position.addInPlace(s.v.scale(dt));s.m.scaling.setAll(Math.min(1,s.life*3));}}
  novaAge+=dt;novaRing.setEnabled(novaAge<.65);if(novaAge<.65)novaRing.scaling.setAll(1+novaAge*14);
  for(const p of mist)p.m.position.set(p.x+Math.sin(elapsed*.09+p.z)*8,.8,p.z+Math.cos(elapsed*.05)*3);
  for(const a of ashes){const t=elapsed*.35+a.phase;a.m.position.set(player.x+Math.sin(t)*13,.3+((elapsed*.3+a.phase)%7),player.z+Math.cos(t*.8)*15);a.m.rotation.x=t;a.m.rotation.z=t*.7;}
  weapon.position.set(Math.sin(elapsed*1.7)*.004,-recoil*.36,-recoil);weapon.rotation.x=-recoil*.7;muzzle.rotation.z=elapsed*1.4;core.scaling.setAll(.85+energy/500);pulseLight.intensity=lastShot<.085?2.3:0;
  const result=events;events=[];return result;
 }
 const state=()=>({running,elapsed,remaining:Math.max(0,135-elapsed),health,energy,novaCooldown,neutralized,combo,points,wave,finished,won,damage,hitMarker,extract,powered:stations.filter(s=>s.on).length,charge:Math.max(...stations.filter(s=>!s.on).map(s=>s.charge),0)});
 root.setEnabled(false);weapon.setEnabled(false);beams.forEach(b=>b.m.setEnabled(false));sparks.forEach(s=>s.m.setEnabled(false));
 return {start,stop,update,shoot,nova,current,root,weapon,enemies,stations,exit,clear,get state(){return state()}};
};
