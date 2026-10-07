import test from 'node:test';
import assert from 'node:assert/strict';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney,TEMPO_RESPAWN} from '../journey-rules.mjs';
import {ExploreFun,rarityFor,TURBO} from '../explore-fun.mjs';
import {POWERUPS,POWER,POWER_KINDS,PowerState,powerFor} from '../powerups.mjs';
import {FlashChallenges,FLASH,FLASH_KINDS} from '../challenges.mjs';
import {TempoRun,TEMPO,tempoSpeed,tempoPoints,tempoSlack,deadlineFor,tempoName} from '../tempo-run.mjs';
import {stockholmDay} from '../daily-challenge.mjs';

const nav=new CityNavigation(),mall={x:-135,z:98};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-135,z:55,name:'Rädda fikat'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
const clean=(store=storage())=>{const g=new CityJourney(nav,mall,portals,store);g.rush.start('clean');g.drainEvents();return g;};
const day=()=>stockholmDay(new Date());
const step=(g,p,dt=.1)=>{g.step(dt,{x:p.x,z:p.z,y:p.y??1.68},{x:0,z:-1});return g.drainEvents();};
// En påhittad termos med ett id som bär en viss förmåga i dag, så att testerna inte beror på dagens slump.
let serial=0;
const powerItem=(g,kind,x,z)=>{
  const d=day();for(let i=0;i<200000;i++){const id='pw-test-'+(serial)+'-'+i;if(powerFor(id,d)===kind&&rarityFor(id,d)==='common'){serial++;const it={id,x,z};g.items.push(it);g.itemById.set(id,it);return it;}}
  throw new Error('inget id för '+kind);
};
const plain=(g,x,z)=>{
  const d=day();for(let i=0;i<5000;i++){const id='plain-test-'+(serial)+'-'+i;if(!powerFor(id,d)&&rarityFor(id,d)==='common'){serial++;const it={id,x,z};g.items.push(it);g.itemById.set(id,it);return it;}}
};
const FAR_AWAY={x:3000,z:3000};

test('förmågor: dagens fördelning är stabil, ungefär 4 % och alla sex typer förekommer',()=>{
  assert.equal(powerFor('t:1:2','2026-10-07'),powerFor('t:1:2','2026-10-07'));
  const n=30000,count=Object.fromEntries(POWER_KINDS.map(k=>[k,0]));let any=0;
  for(let i=0;i<n;i++){const k=powerFor('x'+i,'2026-10-07');if(k){count[k]++;any++;}}
  assert.ok(any/n>.03&&any/n<.055,'cirka '+POWER.rate/10+' %: '+any/n);
  for(const k of POWER_KINDS)assert.ok(count[k]>n*.004,k+' förekommer');
  let changed=0;for(let i=0;i<2000;i++)if(powerFor('t'+i,'2026-10-07')!==powerFor('t'+i,'2026-10-08'))changed++;
  assert.ok(changed>40,'olika termosar bär förmågor olika dagar');
  assert.equal(POWER_KINDS.length,6);for(const k of POWER_KINDS){assert.ok(POWERUPS[k].label&&POWERUPS[k].text&&POWERUPS[k].color);}
});

test('PowerState: rakett dubblar farten, stövlar höjer hoppet, skölden räcker en gång',()=>{
  const p=new PowerState();assert.equal(p.speedMul(),1);assert.equal(p.jumpMul(),1);
  assert.equal(p.grant('rocket'),true);assert.equal(p.speedMul(),POWER.rocketMult);assert.equal(POWER.rocketMult,2,'dubblar farten ytterligare');
  assert.equal(p.grant('boots'),true);assert.ok(p.jumpMul()>1.4);
  p.tick(POWERUPS.rocket.seconds+.1);assert.equal(p.speedMul(),1,'raketen tar slut');assert.ok(p.jumpMul()>1,'stövlarna håller längre');
  p.tick(30);assert.equal(p.jumpMul(),1);
  p.grant('shield');p.grant('shield');p.grant('shield');assert.equal(p.shield,POWER.shieldMax,'högst två sköldar');
  assert.equal(p.useShield(),true);assert.equal(p.useShield(),true);assert.equal(p.useShield(),false);
  assert.equal(p.grant('bomb'),false,'bomben hanteras av spelet');
  p.grant('rocket');p.reset();assert.equal(p.speedMul(),1);assert.deepEqual(p.snapshot(),[]);
});

test('ExploreFun: stjärnan aktiverar tre boosters, skölden räddar kedjan en gång, klockan fyller kedjan',()=>{
  const items=[{id:'a',x:0,z:0},{id:'b',x:1,z:1}];
  const clock=()=>new Date('2026-10-07T10:00:00Z');
  const f=new ExploreFun({clock,items});
  const star=f.applyPower('star');assert.equal(star.kind,'star');
  assert.ok(f.boosters.magnet>0&&f.boosters.double>0&&f.boosters.freeze>0);
  f.newRun();assert.equal(f.boosters.magnet,0,'ny runda nollställer');
  // sköld
  f.applyPower('shield');f.combo.hit();f.combo.hit();f.combo.hit();assert.equal(f.combo.chain,3);
  const t=f.tick(f.combo.left+.1);assert.equal(t.saved,3);assert.equal(t.lost,0);assert.equal(f.combo.chain,3,'kedjan lever');assert.ok(f.combo.left>0);
  const t2=f.tick(f.combo.left+.1);assert.equal(t2.lost,3,'skölden är förbrukad');assert.equal(t2.saved,undefined);
  // klocka
  f.combo.hit();f.combo.hit();f.combo.left=1;f.applyPower('clock');assert.equal(f.combo.left,f.combo.span);
  assert.equal(f.snapshot().power.length,0);
  f.applyPower('rocket');assert.equal(f.snapshot().power[0].kind,'rocket');
});

test('ExploreFun: en termos som bär en förmåga ger förmågan men aldrig sällsynthet',()=>{
  const g=clean(),it=powerItem(g,'rocket',0,0);
  const r=g.fun.pickup(it);assert.equal(r.power,'rocket');assert.equal(r.rarity,'common');
  assert.ok(r.events.some(e=>e.type==='power'&&e.kind==='rocket'));
  assert.equal(g.fun.power.speedMul(),2);assert.equal(g.fun.state.stats.powerups,1);
});

test('FlashChallenges: första utmaningen kommer efter en stund, klaras av termosar och ger poäng',()=>{
  const fc=new FlashChallenges({seed:7});
  assert.deepEqual(fc.tick(5),[],'ingen utmaning de första sekunderna');
  let ev=[];for(let i=0;i<400&&!ev.length;i++)ev=fc.tick(.25);
  assert.equal(ev[0].type,'challenge-start');assert.ok(ev[0].seconds>=30);
  const snap=fc.snapshot();assert.ok(snap.announce>0&&snap.announce<=FLASH.announce);
  fc.active.kind='thermos';fc.active.target=3;fc.active.progress=0;
  let done=[];for(let i=0;i<3;i++)done.push(...fc.noteThermos({chain:i+1}));
  assert.equal(done.length,1);assert.equal(done[0].type,'challenge-done');assert.ok(done[0].points>0);
  assert.equal(fc.snapshot(),null,'ingen aktiv utmaning efter klart');assert.equal(fc.done,1);
});

test('FlashChallenges: tiden kan ta slut, pausas när spelaren är upptagen och kan förlängas',()=>{
  const fc=new FlashChallenges({seed:3});
  fc.start(1,'chain');const left=fc.active.left;
  fc.tick(10,{busy:true});assert.equal(fc.active.left,left,'inget tickar medan man åker buss');
  fc.extend(10);assert.equal(fc.active.left,left+10);
  let out=[];for(let i=0;i<400&&!out.length;i++)out=fc.tick(1);
  assert.equal(out[0].type,'challenge-fail');assert.equal(fc.active,null);assert.equal(fc.failed,1);
  const off=new FlashChallenges({seed:3,enabled:false});assert.deepEqual(off.tick(500),[]);
});

test('FlashChallenges: alla typer går att klara och turbosprinten räknar meter',()=>{
  for(const kind of FLASH_KINDS){
    const fc=new FlashChallenges({seed:11});fc.start(4,kind);
    const a=fc.active;assert.ok(a.target>0&&a.seconds>0&&a.points>0&&a.text.length>10,kind);
    let ev=[];
    if(kind==='thermos')for(let i=0;i<a.target;i++)ev.push(...fc.noteThermos({chain:1}));
    if(kind==='chain')ev=fc.noteThermos({chain:a.target});
    if(kind==='rare')ev=fc.noteThermos({chain:1,rarity:'silver'});
    if(kind==='power')ev=fc.noteThermos({chain:1,power:true});
    if(kind==='turbo'){ev.push(...fc.noteMeters(a.target/2));assert.equal(ev.length,0);ev.push(...fc.noteMeters(a.target/2+1));}
    assert.equal(ev.filter(e=>e.type==='challenge-done').length,1,kind);
  }
  const a=new FlashChallenges({seed:5}),b=new FlashChallenges({seed:5});assert.equal(a.cooldown,b.cooldown,'samma frö, samma start');
  const kinds=new Set();for(let s=1;s<40;s++){const fc=new FlashChallenges({seed:s});kinds.add(fc.start(2).kind);}assert.ok(kinds.size>=4,'olika typer');
});

test('Temporush: fart, poäng och marginal följer nivån och har tak',()=>{
  assert.equal(tempoSpeed(1),1);assert.equal(tempoPoints(1),1);
  for(let l=2;l<=TEMPO.levels;l++){assert.ok(tempoSpeed(l)>=tempoSpeed(l-1));assert.ok(tempoPoints(l)>tempoPoints(l-1));assert.ok(tempoSlack(l)<=tempoSlack(l-1));}
  assert.ok(tempoSpeed(99)<=TEMPO.speedMax);assert.ok(tempoSlack(99)>=TEMPO.slackMin);
  assert.ok(tempoSpeed(8)>1.4,'märks ordentligt');assert.ok(tempoPoints(10)>=3.5);
  assert.ok(deadlineFor(100,1)>deadlineFor(100,10),'mindre tid högre upp');assert.ok(deadlineFor(300,5)>deadlineFor(30,5),'längre väg ger mer tid');
  assert.ok(deadlineFor(0,12)>=TEMPO.minDeadline);assert.ok(deadlineFor(NaN,3)>=TEMPO.minDeadline);
  assert.equal(tempoName(1),'LUGNT');assert.equal(tempoName(12),'VANSINNE');
});

test('Temporush: nivåer var 15:e sekund, liv tappas vid miss och rundan slutar med sparat rekord',()=>{
  const s=storage(),t=new TempoRun(s);assert.equal(t.running,false);assert.deepEqual(t.tick(5),[]);
  t.start();assert.equal(t.running,true);t.setTarget({id:'a',x:0,z:0},30);
  let ev=t.tick(TEMPO.levelSeconds+.1);assert.ok(ev.some(e=>e.type==='tempo-level'&&e.level===2));assert.equal(t.level,2);
  assert.ok(t.speedMul()>1);
  const before=t.lives;t.left=.05;ev=t.tick(.1);assert.ok(ev.some(e=>e.type==='tempo-miss'));assert.equal(t.lives,before-1);assert.equal(t.needTarget,true);
  t.picked=7;t.score=640;
  for(let i=0;i<5&&t.running;i++){t.setTarget({id:'b',x:1,z:1},10);t.left=.01;ev=t.tick(.05);}
  assert.equal(t.running,false);assert.equal(t.state,'over');
  const over=t.result;assert.equal(over.type,'tempo-over');assert.equal(over.score,640);assert.equal(over.record,true);
  const t2=new TempoRun(s);assert.equal(t2.best.score,640);assert.ok(t2.best.level>=2);assert.equal(t2.best.runs,1);
  // lägre resultat är inget rekord men räknas som en runda
  t2.start();t2.score=10;t2.lives=1;t2.setTarget({id:'c',x:0,z:0},1);t2.left=.01;t2.tick(.05);
  assert.equal(t2.result.record,false);assert.equal(t2.best.score,640);assert.equal(t2.best.runs,2);
  const broken=new TempoRun({getItem:()=>'{trasig',setItem(){throw new Error('full');}});assert.equal(broken.best.score,0);broken.start();broken.finish();
});

test('Temporush: snabb plockning ger flytbonus och högre nivå ger poängfaktor',()=>{
  const t=new TempoRun();t.start();t.setTarget({id:'a',x:0,z:0},50);
  const quick=t.pick(25);assert.equal(quick.flow,true);assert.ok(quick.extra>=TEMPO.flowBonus);assert.equal(t.needTarget,true);
  t.setTarget({id:'b',x:0,z:0},50);t.left=t.deadline*.2;const slow=t.pick(25);assert.equal(slow.flow,false);assert.equal(slow.extra,0,'nivå 1 har faktor 1');
  t.level=6;t.setTarget({id:'c',x:0,z:0},50);t.left=t.deadline*.2;const hi=t.pick(25);assert.equal(hi.mult,tempoPoints(6));assert.ok(hi.extra>0);
  t.setTarget({id:'d',x:0,z:0},50);const left=t.left;t.extend(8);assert.equal(t.left,left+8);
  assert.deepEqual(new TempoRun().pick(25),{mult:1,extra:0,flow:false},'ingen effekt utanför rundan');
});

test('City Explore: Temporush ger mål, ökande poäng och livsförlust när klockan går ut',()=>{
  const g=clean();
  assert.equal(g.startTempo().length,1);assert.equal(g.tempo.running,true);
  const here={x:-19,z:35};const it=plain(g,here.x+6,here.z);
  step(g,here);assert.ok(g.tempo.target,'målet sätts till närmaste termos');
  assert.ok(g.tempo.target.id!==undefined);assert.ok(g.tempo.deadline>=TEMPO.minDeadline);
  // plocka målet
  const tgt=g.itemById.get(g.tempo.target.id);const ev=step(g,tgt);
  assert.ok(ev.some(e=>e.type==='tempo-pick'));assert.ok(ev.some(e=>e.type==='thermos'));
  assert.equal(g.tempo.picked,1);
  g.tempo.level=8;
  const t2=plain(g,here.x,here.z+6);step(g,{x:here.x,z:here.z+40});
  const tg2=g.tempo.target;assert.ok(tg2);g.tempo.left=.02;
  const ev2=step(g,{x:here.x,z:here.z+40},.1);assert.ok(ev2.some(e=>e.type==='tempo-miss'));assert.equal(g.tempo.lives,TEMPO.lives-1);
  // hög nivå ger fler poäng för samma termos
  g.tempo.level=10;const hi=plain(g,here.x+80,here.z+80);g.tempo.setTarget(hi,5);g.tempo.left=g.tempo.deadline;
  const evHi=step(g,hi),th=evHi.find(e=>e.type==='thermos');assert.ok(th.points>25*tempoPoints(10)-5,'poängen skalas med tempot: '+th.points);
  assert.ok(g.tempo.speedMul()>=tempoSpeed(10));
  assert.ok(TEMPO_RESPAWN.after<240&&TEMPO_RESPAWN.minDistance<80,'termosarna kommer tillbaka snabbare i Temporush');
});

test('City Explore: utanför City Explore finns ingen Temporush och en ny runda nollställer allt',()=>{
  const g=new CityJourney(nav,mall,portals,storage());g.rush.start('trail');
  assert.equal(g.startTempo(),null);
  const c=clean();c.startTempo();c.tempo.picked=5;c.rush.start('clean');assert.equal(c.tempo.running,false,'ny runda är inte Temporush');
  assert.equal(c.tempo.picked,0);
});

test('City Explore: sockerbomben plockar allt inom 26 m på en gång och bygger en lång kedja',()=>{
  const g=clean(),at={x:-60,z:-300};
  const bomb=powerItem(g,'bomb',at.x,at.z);
  const near=[1,2,3,4,5,6].map(i=>plain(g,at.x+i*3,at.z+((i%2)?4:-4)));
  const far=plain(g,at.x+60,at.z);
  const ev=step(g,at);
  const bombEv=ev.find(e=>e.type==='bomb');assert.ok(bombEv);assert.ok(bombEv.count>=6);
  for(const n of near)assert.ok(g.found.has(n.id),'nära termos plockad');
  assert.equal(g.found.has(far.id),false,'långt bort ligger kvar');
  assert.ok(ev.filter(e=>e.type==='thermos').length>=7);
  assert.ok(g.fun.combo.chain>=7,'kedjan växte: '+g.fun.combo.chain);
  assert.ok(ev.some(e=>e.type==='power'&&e.kind==='bomb'));
});

test('City Explore: blixtutmaning klaras via termosar och ger poäng, märke och ibland en förmåga',()=>{
  const g=clean();g.flash.start(2,'thermos');g.flash.active.target=2;
  const before=g.balance,a=plain(g,100,-100),b=plain(g,120,-100);
  let ev=step(g,a);ev.push(...step(g,b));
  const done=ev.find(e=>e.type==='challenge-done');assert.ok(done);assert.ok(g.balance-before>=done.points);
  assert.equal(g.fun.state.stats.flashDone,1);
  assert.equal(g.flash.snapshot(),null);
});

test('City Explore: kombosköld, rakett och blixtutmaning stängs av i Temporush respektive nollställs vid ny runda',()=>{
  const g=clean();g.fun.applyPower('rocket');g.fun.applyPower('shield');assert.equal(g.fun.power.speedMul(),2);
  g.startTempo();g.tickFlash(500);assert.equal(g.flash.active,null,'inga blixtutmaningar under Temporush');
  g.rush.start('clean');assert.equal(g.fun.power.speedMul(),1);assert.equal(g.fun.power.shield,0);
});

test('Märken: fyndare, blixtsnabb och tempomärken finns',()=>{
  const f=new ExploreFun({storage:storage()});
  for(let i=0;i<5;i++){f.state.stats.powerups++;}
  assert.ok(f.badgeEvents().some(e=>e.id==='power-5'));
  for(let i=0;i<5;i++)f.noteFlash();assert.ok(f.state.badges.includes('flash-5'));
  f.noteTempo(5);assert.ok(f.state.badges.includes('tempo-5'));assert.equal(f.state.badges.includes('tempo-10'),false);
  assert.ok(f.noteTempo(10).some(e=>e.id==='tempo-10'));
  assert.equal(f.state.stats.tempoLevel,10);f.noteTempo(3);assert.equal(f.state.stats.tempoLevel,10,'bara högsta nivån sparas');
});

test('Hastighet: turbo ×2 och raket ×2 ger ×4, och turbotakets steg räcker för att inte hoppa över väggar',()=>{
  assert.equal(TURBO.multiplier*POWER.rocketMult,4);
  const maxDist=7.2*1.55*4*TURBO.maxStep; // meter per bildruta vid 4× och sprint, vid 60 fps = 0,74
  assert.ok(7.2*1.55*4/60<TURBO.maxStep*TURBO.maxSteps);void maxDist;
});

test('Ljudmotorn: tempo ändrar uppspelningshastighet utan att gå utanför gränserna',async()=>{
  const {createAudioEngine}=await import('../audio-engine.mjs');
  const els=[];const engine=createAudioEngine({makeContext:()=>null,makeElement:src=>{const el={src,volume:0,loop:false,playbackRate:1,preservesPitch:false,play(){return Promise.resolve();},pause(){}};els.push(el);return el;}});
  engine.track('main','x.mp3',{loop:true});
  engine.rate('main',1.25);assert.equal(els[0].playbackRate,1.25);assert.equal(els[0].preservesPitch,true);
  engine.rate('main',9);assert.equal(els[0].playbackRate,2);engine.rate('main',0);assert.equal(els[0].playbackRate,1,'ogiltigt värde ger normal fart');
  engine.rate('saknas',1.5);
});
