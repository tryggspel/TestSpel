// Deterministic game rules; no rendering or audio dependencies.
export const LEVELS = [
  {name:'Bergens hemlighet',subtitle:'Gyllene gångar',length:228,speed:8.4,color:0xb38b59,fog:0x24211e,donkey:42,tea:154,stairs:[60,80,174,192],hazards:[['rock',74,-1],['enemy',92,0],['gate',110,0],['pit',128,0],['rock',141,1],['enemy',183,-1],['log',202,0]]},
  {name:'Den blå ravinen',subtitle:'Broar över mörkret',length:248,speed:9.7,color:0x7c9b9b,fog:0x152329,donkey:55,tea:163,stairs:[75,95,190,210],hazards:[['rock',24,1],['enemy',37,-1],['pit',88,0],['gate',111,0],['enemy',129,1],['log',141,0],['rock',195,0],['enemy',212,0],['pit',228,0]]},
  {name:'Det glömda discot',subtitle:'Lampan väntar',length:270,speed:10.9,color:0x9b7e9f,fog:0x211c30,donkey:59,tea:164,stairs:[80,100,196,216],hazards:[['enemy',26,0],['gate',43,0],['rock',83,-1],['pit',103,0],['enemy',120,1],['log',137,0],['enemy',195,-1],['gate',210,0],['pit',228,0],['enemy',247,0]]}
];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function heightAt(z,index){const [a,b,c,d]=LEVELS[index].stairs;return z<a?0:z<b?Math.floor((z-a)/1.6)*.2:z<c?2.4:z<d?2.4-Math.floor((z-c)/1.6)*.2:0}
export const centerAt=z=>Math.sin(z*.031)*1.25+Math.sin(z*.083)*.3;
export function objectsFor(index){const l=LEVELS[index];let id=0;const out=l.hazards.map(([type,z,lane])=>({id:id++,type,z,lane,hp:index===2&&type==='enemy'?3:2,done:false,warned:false}));for(let z=14;z<l.length-9;z+=8){if(l.hazards.some(o=>Math.abs(o[1]-z)<3))continue;out.push({id:id++,type:'coin',z,lane:z<38?0:Math.round(Math.sin(z*.19)),done:false})}for(const z of [22,33,l.donkey-6,l.tea+12])out.push({id:id++,type:'carrot',z,lane:z<60?0:1,done:false});out.push({id:id++,type:'chest',z:l.tea+6,lane:-1,done:false});return out}
export class Run {
 constructor(emit=()=>{}){this.emit=emit;this.mode='intro';this.intro=0;this.level=0;this.score=0;this.hearts=5;this.carrots=0;this.chests=0;this.coins=0;this.secrets=0;this.elapsed=0;this.hits=0;this.totalShots=0;this.startLevel(0,false)}
 startLevel(index,announce=true){this.level=index;this.levelSnapshot={score:this.score,carrots:this.carrots,chests:this.chests,coins:this.coins,secrets:this.secrets};this.z=0;this.x=0;this.lane=0;this.jump=0;this.vy=0;this.slide=0;this.invuln=0;this.fall=0;this.objects=objectsFor(index);this.npcs=[{type:'donkey',z:LEVELS[index].donkey,used:0},{type:'tea',z:LEVELS[index].tea,used:0}];this.near=null;this.currentNPC=null;this.mode=announce?'run':'intro';if(announce)this.emit('level',{index})}
 restartLevel(){Object.assign(this,this.levelSnapshot);this.hearts=5;this.startLevel(this.level)}
 skipIntro(){if(this.mode!=='intro')return;this.intro=10;this.mode='run';this.emit('level',{index:0})}
 move(delta){if(this.mode==='run')this.lane=clamp(this.lane+delta,-1,1)}
 hop(){if(this.mode!=='run'||this.jump>.02||this.slide>0)return;this.vy=9;this.jump=.02;this.emit('jump')}
 duck(){if(this.mode!=='run'||this.jump>.02)return;this.slide=1.03;this.emit('slide')}
 hitEnemy(id){if(this.mode!=='run')return false;const o=this.objects.find(o=>o.id===id&&o.type==='enemy'&&!o.done);if(!o||o.z-this.z<0||o.z-this.z>52)return false;o.hp--;this.hits++;this.emit('hit',{object:o});if(o.hp<=0){o.done=true;this.score+=125;this.emit('kill',{object:o})}return true}
 hurt(type,o){if(this.invuln>0)return;this.hearts--;this.invuln=1.8;this.emit('hurt',{type,object:o});if(this.hearts<=0){this.mode='lost';this.emit('lost');return}if(type==='pit'){this.mode='fall';this.fall=.9;this.returnZ=Math.max(0,o.z-12)}}
 interact(){if(this.mode!=='run'||!this.near)return;this.currentNPC=this.near;this.mode='dialog';this.emit('dialog',{npc:this.currentNPC})}
 feed(){const n=this.currentNPC;if(this.mode!=='dialog'||n?.type!=='donkey'||n.used>=2||this.carrots<1)return false;this.carrots--;n.used++;this.secrets++;this.score+=75;this.emit('secret',{number:this.secrets});return true}
 tea(){const n=this.currentNPC;if(this.mode!=='dialog'||n?.type!=='tea'||n.used)return false;n.used++;this.hearts=Math.min(5,this.hearts+1);this.score+=100;this.emit('tea');return true}
 continue(){if(this.mode==='dialog'){this.mode='run';this.currentNPC=null;this.emit('closeDialog')}}
 pause(){if(['lost','won','paused','dialog'].includes(this.mode))return;this.previousMode=this.mode;this.mode='paused';this.emit('pause')}
 resume(){if(this.mode==='paused'){this.mode=this.previousMode||'run';this.emit('resume')}}
 tick(dt,sprint=false){dt=clamp(dt,0,.05);if(this.mode==='intro'){this.intro+=dt;if(this.intro>=10)this.skipIntro();return}if(this.mode==='fall'){this.fall-=dt;if(this.fall<=0){this.z=this.returnZ;this.jump=0;this.vy=0;this.mode='run';this.emit('respawn')}return}if(this.mode!=='run')return;this.elapsed+=dt;this.invuln=Math.max(0,this.invuln-dt);this.slide=Math.max(0,this.slide-dt);this.x+=(this.lane*1.85-this.x)*(1-Math.exp(-dt*13));if(this.jump>0||this.vy>0){this.vy-=23*dt;this.jump=Math.max(0,this.jump+this.vy*dt);if(this.jump===0)this.vy=0}const l=LEVELS[this.level],prev=this.z,room=this.npcs.some(n=>Math.abs(n.z-this.z)<7&&n.used<(n.type==='donkey'?2:1));this.speed=l.speed*(sprint?1.24:1)*(room?.58:1);this.z+=this.speed*dt;
 for(const o of this.objects){if(o.done)continue;if(o.type==='enemy'&&!o.warned&&o.z-this.z<24&&o.z>this.z){o.warned=true;this.emit('enemy',{object:o})}if(!(prev<o.z&&this.z>=o.z))continue;const same=Math.abs(this.x-o.lane*1.85)<.95;if(['coin','carrot','chest'].includes(o.type)){if(same){o.done=true;this.score+=o.type==='coin'?25:o.type==='carrot'?15:300;if(o.type==='coin')this.coins++;if(o.type==='carrot')this.carrots++;if(o.type==='chest')this.chests++;this.emit('collect',{object:o})}continue}if(o.type==='pit'&&this.jump<.55)this.hurt('pit',o);else if(o.type==='gate'&&this.slide<=0)this.hurt('gate',o);else if(o.type==='log'&&this.jump<.75)this.hurt('log',o);else if((o.type==='rock'||o.type==='enemy')&&same&&this.jump<1.3)this.hurt(o.type,o);if(this.mode!=='run')break}
 this.near=this.npcs.find(n=>Math.abs(n.z-this.z)<8&&n.used<(n.type==='donkey'?2:1))||null;
 if(this.mode==='run'&&this.z>=l.length){this.score+=400;if(this.level===2){this.mode='won';this.emit('won')}else{this.hearts=Math.min(5,this.hearts+1);this.startLevel(this.level+1)}}
 }
}
