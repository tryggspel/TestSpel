const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
process.chdir(path.resolve(__dirname,'../..'));
const {createCanvas}=require('@napi-rs/canvas');
global.BABYLON=require(process.env.BABYLON_PATH||'babylonjs');global.window=global;
global.removeEventListener=()=>{};
global.OffscreenCanvas=class{constructor(w,h){return createCanvas(w,h)}};
global.document={createElement:()=>createCanvas(512,512),removeEventListener(){}};
global.requestAnimationFrame=f=>setImmediate(f);global.devicePixelRatio=1;
for(const f of ['characters','landmarks','world','action'])vm.runInThisContext(fs.readFileSync('karlstad-city/'+f+'.js','utf8'));
(async()=>{
 const engine=new BABYLON.NullEngine(),world=await createKarlstadWorld(engine,null,'mobile',()=>{}),failures=[];
 for(const [i,p]of world.targets.entries())if(world.collides(...p))failures.push('Mission '+i+' blocked');
 const source=fs.readFileSync('karlstad-city/cinematic.js','utf8'),nodes=JSON.parse(source.match(/const nodes=(\[.*?\]);/)[1]),edges=JSON.parse(source.match(/const edges=(\[.*?\]);/)[1]);
 for(const [a,b]of edges)for(let i=0;i<=100;i++){const t=i/100,x=nodes[a][0]*(1-t)+nodes[b][0]*t,z=nodes[a][1]*(1-t)+nodes[b][1]*t;if(world.collides(x,z)){failures.push(`Blocked route ${a}-${b} at ${x.toFixed(1)},${z.toFixed(1)}`);break}}
 const action=KarlstadAction(world.scene);action.reset();
 assert(action.collides(0,66,false,0),'standing must be blocked by duck gate');assert(!action.collides(0,66,true,0),'crouch must clear duck gate');assert(action.collides(0,76,false,0),'walking must hit jump barrier');assert(!action.collides(0,76,false,1),'jump must clear barrier');
 for(let i=0;i<14;i++){const p=action.current();assert(!world.collides(p.x,p.z),'sun '+i+' blocked by city geometry');const event=action.update(1,{x:p.x,z:p.z},p.type==='duck',p.type==='jump'?1:0);assert(event?.pickup,'pickup '+i);if(i===13)assert(event.done&&event.won,'last pickup must finish the course');}
 assert.equal(action.state.index,14);assert(action.state.points>0);action.reset();const expired=action.update(121,{x:500,z:500},false,0);assert(expired.done&&!expired.won);assert.equal(action.state.seconds,0);
 world.hero.animate(.016,10,true,0,3);world.update(1,.016,0);world.setWeather({cloud:8,rain:2});world.scene.render();
 assert(world.hero.root.getChildMeshes().every(m=>m.getVerticesData('color')),'character meshes require vertex colours');
 for(const m of world.scene.meshes){const p=m.getVerticesData('position');if(p)assert(!p.some(v=>!Number.isFinite(v)),'nonfinite geometry in '+m.name)}
 console.log(JSON.stringify({missions:world.targets.length,routes:edges.length,suns:14,meshes:world.scene.meshes.length,triangles:world.scene.meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0),failures}));
 assert.equal(failures.length,0);engine.dispose();
})().catch(e=>{console.error(e.stack);process.exitCode=1});
