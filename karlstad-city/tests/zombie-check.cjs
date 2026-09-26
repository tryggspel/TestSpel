const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
process.chdir(path.resolve(__dirname,'../..'));
const {createCanvas}=require('@napi-rs/canvas');
global.BABYLON=require(process.env.BABYLON_PATH||'babylonjs');global.window=global;global.removeEventListener=()=>{};
global.OffscreenCanvas=class{constructor(w,h){return createCanvas(w,h)}};
global.document={createElement:()=>createCanvas(128,128),removeEventListener(){}};
global.requestAnimationFrame=f=>setImmediate(f);global.devicePixelRatio=1;
for(const f of ['characters','landmarks','world','zombie'])vm.runInThisContext(fs.readFileSync('karlstad-city/'+f+'.js','utf8'));
(async()=>{
 const B=BABYLON,V=B.Vector3,engine=new B.NullEngine(),world=await createKarlstadWorld(engine,null,'mobile',()=>{}),game=KarlstadZombie(world),player={x:0,z:52};
 const original=world.actors[0].root.position.clone(),originalColor=world.actors[0].root.getChildMeshes()[0].getVerticesData('color').slice();
 game.start(player);assert(world.apocalypse);assert(world.actors.every(p=>p.zombie));assert(world.citizens.every(p=>p.actor.zombie&&!p.label.isEnabled()));assert.equal(game.state.health,100);
 for(const s of game.stations)assert(!world.collides(s.x,s.z),'relay must be accessible');assert(!world.collides(game.exit.x,game.exit.z));
 // Isolate a target so the ray, cooldown, temporary stun and obstruction are deterministic.
 game.enemies.forEach(e=>e.actor.root.setEnabled(false));const target=game.enemies[0];target.actor.root.setEnabled(true);target.actor.root.position.set(0,0,60);
 world.camera.position.set(0,1.74,52);world.camera.rotation.set(0,0,0);
 assert(game.shoot(world.camera.position,new V(0,0,1)));assert.equal(game.state.energy,92);assert(target.stun>0);assert.equal(game.state.neutralized,1);assert(!game.shoot(world.camera.position,new V(0,0,1)),'shot cooldown');
 for(let i=0;i<72;i++)game.update(.1,player);assert.equal(target.stun,0,'stun must expire');assert(game.state.energy>95,'energy recharges when trigger is released');
 target.actor.root.position.set(40,0,5);game.update(.2,player);assert(!game.clear(0,5,40,5),'Arkaden must obstruct line of sight');game.shoot(new V(0,1.7,5),new V(1,0,0));assert.equal(target.stun,0,'no shooting through a building');
 target.actor.root.position.set(0,0,57);game.update(.7,player);assert(game.nova(player));assert(target.stun>0);assert(!game.nova(player),'nova cooldown');
 // Simulate a complete survival round with enemies disabled: objective gates,
 // dawn requirement, extraction and no updates after a result.
 game.start(player);for(const s of game.stations){game.enemies.forEach(e=>e.actor.root.setEnabled(false));for(let i=0;i<31;i++)game.update(.1,{x:s.x,z:s.z});assert(s.on,'relay charges while holding its zone');}
 assert.equal(game.state.powered,3);game.enemies.forEach(e=>e.actor.root.setEnabled(false));for(let i=0;i<40;i++)game.update(.1,game.exit);assert(!game.state.finished,'evacuation must wait for dawn');
 while(game.state.elapsed<136){game.enemies.forEach(e=>e.actor.root.setEnabled(false));game.update(.25,player);}
 game.enemies.forEach(e=>e.actor.root.setEnabled(false));for(let i=0;i<31;i++)game.update(.1,game.exit);assert(game.state.won);const elapsed=game.state.elapsed;game.update(2,player);assert.equal(game.state.elapsed,elapsed);
 game.stop();assert(!world.apocalypse);assert(world.actors.every(p=>!p.zombie));assert(world.citizens.every(p=>p.label.isEnabled()));assert(V.Distance(original,world.actors[0].root.position)<.001);assert.deepEqual(world.actors[0].root.getChildMeshes()[0].getVerticesData('color'),originalColor);assert(game.enemies.filter(e=>e.extra).every(e=>!e.actor.root.isEnabled()));
 // Defeat is reachable; the damage grace period prevents a one-frame horde loss.
 game.start(player);game.enemies.forEach(e=>e.actor.root.setEnabled(false));target.actor.root.setEnabled(true);target.actor.root.position.set(0,0,53);target.attack=0;game.update(.02,player);assert.equal(game.state.health,87);game.update(.02,player);assert.equal(game.state.health,87);
 for(let i=0;i<350&&!game.state.finished;i++){game.enemies.filter(e=>e!==target).forEach(e=>e.actor.root.setEnabled(false));game.update(.1,player);}assert(game.state.finished&&!game.state.won);
 game.stop();world.scene.render();assert(!game.shoot(new V(),new V(0,0,1)));
 console.log('PASS: all citizens transform/restore, relays reachable, ray hits/occlusion, stun expiry, energy, nova cooldown, objective gates, dawn, victory, defeat, damage grace and cleanup');engine.dispose();
})().catch(e=>{console.error(e.stack);process.exitCode=1});
