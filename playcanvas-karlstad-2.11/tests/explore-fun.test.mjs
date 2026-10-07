import test from 'node:test';
import assert from 'node:assert/strict';
import {TURBO,turboAllowed,turboScale,moveSteps,segmentDistance,hash32,prevDay,COMBO,multiplierFor,praiseFor,chainFreq,ComboMeter,RARITY,rarityFor,BOOSTERS,boosterFor,
  levelFor,LEVELS,LEVEL_STEP,TITLES,goalForDay,dailyBonus,BADGES,heatFor,ExploreFun,FUN_KEY,BASE_POINTS} from '../explore-fun.mjs';
import {FX_THERMOS,TREASURES,BUS_NETWORK,ALBUM_AREAS,areaOf,busRideSeconds,BUS_FIRST_RIDE_BONUS,LEGACY_HINTS} from '../explore-places.mjs';

const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
const clockAt=iso=>{let now=new Date(iso);const f=()=>now;f.set=v=>{now=new Date(v);};return f;};
const DAY='2026-10-06',NOON='2026-10-06T10:00:00Z';
// Id:n väljs så att rariteten är känd just den här dagen.
const idWith=(rarity,n=0,day=DAY)=>{let seen=0;for(let i=0;i<100000;i++){const id='t:'+i+':0';if(rarityFor(id,day)===rarity&&seen++===n)return id;}throw new Error('hittade ingen '+rarity);};
const mk=(rarity,n=0,x=0,z=0)=>({id:idWith(rarity,n),x,z});

test('turbo: bara i City Explore, bara utomhus, och höga farter delas i delsteg',()=>{
  assert.equal(TURBO.multiplier,2);
  assert.equal(turboAllowed({mode:'clean'}),true);
  for(const mode of ['trail','timed','free'])assert.equal(turboAllowed({mode}),false,mode+' får ingen turbo');
  assert.equal(turboAllowed({mode:'clean',indoors:true}),false);assert.equal(turboAllowed({mode:'clean',upper:true}),false);assert.equal(turboAllowed({mode:'clean',transport:true}),false);
  assert.equal(turboScale(true,{mode:'clean'}),2);assert.equal(turboScale(false,{mode:'clean'}),1);assert.equal(turboScale(true,{mode:'trail'}),1);
  assert.equal(moveSteps(.1,0),1);assert.equal(moveSteps(.38,0),1);
  assert.equal(moveSteps(3,0),Math.ceil(3/TURBO.maxStep));assert.equal(moveSteps(50,0),TURBO.maxSteps,'taket hindrar hundratals delsteg');
  assert.equal(moveSteps(NaN,0),1);
  // Ryde i turbo vid 10 bilder/s: 30,2 m/s * 0,1 s = 3 m per bildruta = 8 delsteg à 0,38 m, aldrig mer än spelarens radie.
  assert.ok(3/moveSteps(3,0)<=TURBO.maxStep+1e-9);
});

test('termos mellan två steg missas inte: avstånd till sträckan, inte bara till slutpunkten',()=>{
  assert.equal(segmentDistance(5,0,0,0,10,0),0,'rakt över sträckan');
  assert.ok(Math.abs(segmentDistance(5,2,0,0,10,0)-2)<1e-9);
  assert.ok(Math.abs(segmentDistance(-3,4,0,0,10,0)-5)<1e-9,'före start: avstånd till startpunkten');
  assert.ok(Math.abs(segmentDistance(13,4,0,0,10,0)-5)<1e-9,'efter slut: avstånd till slutpunkten');
  assert.equal(segmentDistance(3,4,0,0,0,0),5,'noll längd');
});

test('kombo: multiplikator per steg, beröm vid milstolpar och en stigande skala',()=>{
  assert.deepEqual([1,2,3,5,6,9,10,14,15,40].map(multiplierFor),[1,1,2,2,3,3,4,4,5,5]);
  assert.equal(praiseFor(3),'GOTT!');assert.equal(praiseFor(5),'MUMS!');assert.equal(praiseFor(4),null);assert.equal(praiseFor(12),'FIKARUSH!');assert.equal(praiseFor(30),'LEGENDARISKT FIKA!');
  const f=Array.from({length:10},(_,i)=>chainFreq(i+1));
  assert.ok(f.every((v,i)=>i===0||v>f[i-1]),'varje termos i kedjan låter högre än förra');
  assert.ok(chainFreq(1000)<=1760&&chainFreq(1000)>=1046,'skalan stannar i andra oktaven och blir aldrig gäll');assert.equal(chainFreq(6),chainFreq(1)*2,'sjätte termosen är en oktav över första');
});

test('kombokedja: håller inom fönstret, går ut efteråt och kan frysas',()=>{
  const c=new ComboMeter();
  assert.equal(c.hit(),1);assert.equal(c.hit(),2);assert.equal(c.tick(COMBO.window-1),0);assert.equal(c.hit(),3,'ny termos innan tiden går ut förlänger kedjan');
  assert.equal(c.tick(COMBO.window-.1),0);assert.equal(c.chain,3);assert.equal(c.tick(.2),3,'returnerar kedjans längd när den bryts');assert.equal(c.chain,0);assert.equal(c.hit(),1,'ny kedja börjar om');
  const f=new ComboMeter();f.hit();f.hit();
  for(let i=0;i<100;i++)assert.equal(f.tick(1,true),0);assert.equal(f.chain,2,'fryst kedja går inte ut');assert.equal(f.tick(COMBO.window+1,false),2);
  assert.equal(new ComboMeter().tick(5),0,'ingen kedja, inget som bryts');
});

test('sällsynta termosar: deterministiska per dag, rimlig fördelning och egna superkrafter',()=>{
  assert.equal(rarityFor('t:1:2','2026-10-06'),rarityFor('t:1:2','2026-10-06'));
  let changed=0;for(let i=0;i<400;i++)if(rarityFor('t:'+i,'2026-10-06')!==rarityFor('t:'+i,'2026-10-07'))changed++;
  assert.ok(changed>40,'minst en av tio termosar byter raritet nästa dag');
  const n=20000,count={common:0,silver:0,gold:0,rainbow:0};for(let i=0;i<n;i++)count[rarityFor('x'+i,DAY)]++;
  assert.ok(Math.abs(count.rainbow/n-.008)<.004,'regnbåge ~0,8 %: '+count.rainbow/n);
  assert.ok(Math.abs(count.gold/n-.04)<.01,'guld ~4 %');assert.ok(Math.abs(count.silver/n-.112)<.02,'silver ~11 %');assert.ok(count.common/n>.8);
  assert.deepEqual(Object.keys(RARITY),['common','silver','gold','rainbow']);
  assert.ok(RARITY.silver.mult<RARITY.gold.mult);
  for(let i=0;i<50;i++)assert.ok(Object.keys(BOOSTERS).includes(boosterFor('r'+i,DAY)));
  assert.equal(boosterFor('a',DAY),boosterFor('a',DAY));
});

test('nivåer: trösklar, titlar, framsteg och oändlig fortsättning efter nivå 10',()=>{
  assert.equal(levelFor(0).level,1);assert.equal(levelFor(0).title,'Turist');
  for(let i=1;i<LEVELS.length;i++){assert.equal(levelFor(LEVELS[i]-1).level,i,'strax under tröskel '+i);assert.equal(levelFor(LEVELS[i]).level,i+1,'på tröskel '+i);assert.equal(levelFor(LEVELS[i]).title,TITLES[i]);}
  const top=LEVELS.at(-1);assert.equal(levelFor(top).level,10);assert.equal(levelFor(top).title,'Karlstadslegend');
  assert.equal(levelFor(top+LEVEL_STEP-1).level,10);assert.equal(levelFor(top+LEVEL_STEP).level,11);assert.equal(levelFor(top+LEVEL_STEP).title,'Karlstadslegend');assert.equal(levelFor(top+3*LEVEL_STEP).level,13);
  const mid=(LEVELS[1]+LEVELS[2])/2,l=levelFor(mid);assert.equal(l.level,2);assert.ok(Math.abs(l.progress-.5)<1e-9);assert.equal(l.from,LEVELS[1]);assert.equal(l.to,LEVELS[2]);
  assert.equal(levelFor(-5).level,1);assert.equal(levelFor(NaN).level,1);assert.equal(levelFor('abc').level,1);
  assert.equal(LEVELS.length,TITLES.length);
  assert.ok(LEVELS.every((v,i)=>i===0||v>LEVELS[i-1]),'trösklarna stiger');
  for(let xp=0;xp<200000;xp+=397){const v=levelFor(xp);assert.ok(v.progress>=0&&v.progress<=1&&v.to>v.from,'framsteg 0..1 vid '+xp);}
});

test('dagsmål och serie: datum bakåt över månads- och årsskifte, mål 20–35, bonus med tak',()=>{
  assert.equal(prevDay('2026-10-06'),'2026-10-05');assert.equal(prevDay('2026-03-01'),'2026-02-28');assert.equal(prevDay('2028-03-01'),'2028-02-29');assert.equal(prevDay('2027-01-01'),'2026-12-31');
  assert.equal(prevDay('trasigt'),'');
  for(let d=1;d<=31;d++){const g=goalForDay('2026-10-'+String(d).padStart(2,'0'));assert.ok(g>=20&&g<=35);}
  assert.equal(dailyBonus(1),250);assert.equal(dailyBonus(2),300);assert.equal(dailyBonus(7),550);assert.equal(dailyBonus(30),550,'taket på sex extra dagar');
  assert.equal(hash32('a'),hash32('a'));assert.notEqual(hash32('a'),hash32('b'));
});

test('hett och kallt för gömda skatter',()=>{
  assert.equal(heatFor(5).label,'BRINNER!');assert.equal(heatFor(20).label,'HETT');assert.equal(heatFor(40).label,'VARMT');assert.equal(heatFor(80).label,'LJUMT');assert.equal(heatFor(120),null);
  assert.ok(heatFor(5).level>heatFor(20).level&&heatFor(20).level>heatFor(40).level&&heatFor(40).level>heatFor(80).level);
});

test('poäng: bas 25, kombo, raritet, dubbla poäng och gågatubonus räknas i rätt ordning',()=>{
  const f=new ExploreFun({clock:clockAt(NOON),items:[]});
  const r1=f.pickup(mk('common',0));assert.equal(r1.points,BASE_POINTS);assert.equal(r1.chain,1);
  const r2=f.pickup(mk('common',1));assert.equal(r2.points,25);assert.equal(r2.mult,1);
  const r3=f.pickup(mk('common',2));assert.equal(r3.points,50);assert.equal(r3.mult,2);assert.ok(r3.events.some(e=>e.type==='combo-praise'&&e.text==='GOTT!'));
  const silver=f.pickup(mk('silver',0));assert.equal(silver.rarity,'silver');assert.equal(silver.points,25*2*2,'silver ×2 gånger kombo ×2');
  const gold=f.pickup(mk('gold',0));assert.equal(gold.points,25*5*2);
  const gag=f.pickup(mk('common',3),{gagata:true});assert.equal(gag.mult,3);assert.equal(gag.points,25*3+10,'gågatsbonusen multipliceras inte');
  assert.equal(f.snapshot(0).stats.silver,1);assert.equal(f.snapshot(0).stats.gold,1);
});

test('regnbågstermos: ger en superkraft som kaffemagnet, dubbla poäng eller kombofrys',()=>{
  const f=new ExploreFun({clock:clockAt(NOON)});
  const item=mk('rainbow',0),r=f.pickup(item);
  const booster=r.events.find(e=>e.type==='booster');assert.ok(booster&&Object.keys(BOOSTERS).includes(booster.kind));
  assert.equal(r.points,25*RARITY.rainbow.mult);
  assert.equal(f.snapshot(0).boosters[0].kind,booster.kind);
  f.boosters.double=10;assert.equal(f.pickup(mk('common',0)).points,50,'dubbla poäng: 25 × 2 på kombo ×1 (andra termosen i kedjan)');
  f.boosters.magnet=5;assert.equal(f.pickupRadius(),BOOSTERS.magnet.radius);f.boosters.magnet=0;assert.equal(f.pickupRadius(),1.65);
  f.boosters.freeze=100;f.combo.hit();for(let i=0;i<30;i++)assert.equal(f.tick(1).lost,0,'fryst kedja går inte ut');f.boosters.freeze=0;
  f.tick(100);assert.deepEqual(f.snapshot(0).boosters,[],'superkrafterna tar slut med tiden');
});

test('album: första fyndet räknas, samma termos igen räknas inte, full samling ger bonus en gång',()=>{
  const items=[{id:'a1',x:0,z:0},{id:'a2',x:10,z:0},{id:'a3',x:20,z:0},{id:'k-0',x:700,z:-100}];
  const f=new ExploreFun({clock:clockAt(NOON),items});
  const tor=areaOf(items[0]),haga=areaOf(items[3]);assert.equal(tor,'torget');assert.equal(haga,'haga');
  let r=f.pickup(items[0]);assert.equal(r.first,true);assert.equal(f.snapshot(0).album.find(a=>a.id==='torget').found,1);
  r=f.pickup(items[0]);assert.equal(r.first,false,'samma termos igen i nästa runda');assert.equal(f.snapshot(0).album.find(a=>a.id==='torget').found,1);
  f.pickup(items[1]);r=f.pickup(items[2]);
  const done=r.events.find(e=>e.type==='area-done');assert.ok(done&&done.area==='torget'&&done.bonus===ALBUM_AREAS.find(a=>a.id==='torget').bonus);assert.equal(r.bonus,done.bonus);
  r=f.pickup(items[2]);assert.equal(r.events.some(e=>e.type==='area-done'),false,'bonusen delas bara ut en gång');
  assert.ok(f.snapshot(0).album.find(a=>a.id==='torget').done);
  assert.equal(f.snapshot(0).album.find(a=>a.id==='haga').total,1);
});

test('dagsmål: klart en gång per dag, serie över dagar, bryts efter en missad dag',()=>{
  const clock=clockAt('2026-10-06T10:00:00Z'),s=storage(),f=new ExploreFun({storage:s,clock,items:[]});
  const goal=goalForDay('2026-10-06');
  let done=null;for(let i=0;i<goal;i++){const r=f.pickup({id:'p'+i,x:0,z:0});done=r.events.find(e=>e.type==='daily-done')||done;if(i<goal-1)assert.equal(r.events.some(e=>e.type==='daily-done'),false);}
  assert.ok(done&&done.streak===1&&done.bonus===250&&done.goal===goal);
  assert.equal(f.pickup({id:'extra',x:0,z:0}).events.some(e=>e.type==='daily-done'),false,'bara en gång per dag');
  assert.equal(f.snapshot(0).daily.done,true);assert.equal(f.snapshot(0).daily.streak,1);
  // nästa dag: nytt mål, serien fortsätter
  clock.set('2026-10-07T10:00:00Z');assert.equal(f.snapshot(0).daily.count,0);assert.equal(f.snapshot(0).daily.done,false);assert.equal(f.snapshot(0).daily.streak,1,'igår räknas fortfarande');
  const goal2=goalForDay('2026-10-07');let r;for(let i=0;i<goal2;i++)r=f.pickup({id:'q'+i,x:0,z:0});
  assert.equal(r.events.find(e=>e.type==='daily-done').streak,2);assert.equal(r.events.find(e=>e.type==='daily-done').bonus,300);
  // tre dagar senare: serien är bruten
  clock.set('2026-10-10T10:00:00Z');assert.equal(f.snapshot(0).daily.streak,0);
  const goal3=goalForDay('2026-10-10');for(let i=0;i<goal3;i++)r=f.pickup({id:'z'+i,x:0,z:0});assert.equal(r.events.find(e=>e.type==='daily-done').streak,1);
  assert.equal(f.snapshot(0).daily.best,2,'längsta serien sparas');
});

test('skatter, hållplatser, turbo och märken: dubletter ger inget, märken delas ut en gång',()=>{
  const f=new ExploreFun({clock:clockAt(NOON),treasureIds:['a','b','c'],stopIds:['haga','tingvalla']});
  let t=f.treasure('a');assert.equal(t.count,1);assert.equal(t.total,3);assert.ok(t.events.some(e=>e.id==='treasure-1'));
  assert.equal(f.treasure('a'),null,'samma skatt igen');
  let r=f.ride({id:'torget',hub:true});assert.equal(r.first,false);assert.equal(r.bonus,0);assert.equal(r.visited,0);
  r=f.ride({id:'haga'});assert.equal(r.first,true);assert.equal(r.bonus,150);assert.ok(r.events.some(e=>e.id==='bus-1'));
  r=f.ride({id:'haga'});assert.equal(r.first,false);assert.equal(r.bonus,0);
  r=f.ride({id:'okänd'});assert.equal(r.first,false,'okänd hållplats ger ingen bonus');
  r=f.ride({id:'tingvalla'});assert.ok(r.events.some(e=>e.id==='bus-all'),'alla hållplatser besökta');
  assert.deepEqual(f.addTurbo(1500),[]);assert.deepEqual(f.addTurbo(600).map(e=>e.id),['turbo-2k']);assert.deepEqual(f.addTurbo(1e6),[]);assert.deepEqual(f.addTurbo(-5),[]);assert.deepEqual(f.addTurbo(NaN),[]);
  f.treasure('b');assert.ok(f.treasure('c').events.some(e=>e.id==='treasure-all'));
  const ids=BADGES.map(b=>b.id);assert.equal(new Set(ids).size,ids.length,'märken har unika id');
});

test('nivåhöjning delas ut en gång, och den som redan spelat får ingen flod av meddelanden',()=>{
  const [,L2,L3,,L5]=LEVELS;
  const f=new ExploreFun({clock:clockAt(NOON),xp:0});
  assert.deepEqual(f.afterReward(L2-100),[]);
  const up=f.afterReward(L2+50);assert.equal(up[0].type,'level-up');assert.equal(up[0].level,2);assert.equal(up[0].title,'Nyinflyttad');assert.deepEqual(f.afterReward(L2+60),[]);
  const jump=f.afterReward(LEVELS[4]+10);assert.equal(jump.filter(e=>e.type==='level-up').length,1,'hoppar man flera nivåer får man ett meddelande');assert.equal(jump[0].level,5);
  assert.ok(jump.some(e=>e.type==='badge'&&e.id==='level-5'));void L3;void L5;
  const veteran=new ExploreFun({clock:clockAt(NOON),xp:LEVELS[6]+100});
  assert.equal(veteran.afterReward(LEVELS[6]+100).some(e=>e.type==='level-up'),false,'den som redan nått nivå 7 får inget meddelande om det');
  assert.equal(veteran.afterReward(LEVELS[6]+101).some(e=>e.type==='level-up'),false);
  assert.equal(veteran.afterReward(LEVELS[7]+5).find(e=>e.type==='level-up')?.level,8,'men nästa nivå meddelas');
  // kombofönstret växer med nivån men har tak
  assert.equal(new ExploreFun({xp:0}).windowFor(),COMBO.window);assert.equal(new ExploreFun({xp:L2}).windowFor(),COMBO.window+COMBO.perLevel);assert.equal(new ExploreFun({xp:1e9}).windowFor(),COMBO.maxWindow);
});

test('sparas och återställs, trasig lagring kraschar inte och ny runda nollställer kedjan men inte albumet',()=>{
  const s=storage(),clock=clockAt(NOON),items=[{id:'a1',x:0,z:0},{id:'a2',x:5,z:0}];
  const f=new ExploreFun({storage:s,clock,items,treasureIds:['x'],stopIds:['haga']});
  f.pickup(items[0]);f.pickup(items[1]);f.treasure('x');f.ride({id:'haga'});f.addTurbo(300);f.save();
  const saved=JSON.parse(s.getItem(FUN_KEY));assert.equal(saved.version,1);assert.equal(saved.collected.length,2);assert.deepEqual(saved.treasures,['x']);assert.deepEqual(saved.stops,['haga']);
  assert.ok(JSON.stringify(saved).length<5000,'ryms gott i localStorage');
  const g=new ExploreFun({storage:s,clock,items,treasureIds:['x'],stopIds:['haga']});
  assert.equal(g.snapshot(0).album.find(a=>a.id==='torget').found,2);assert.equal(g.snapshot(0).treasures.found,1);assert.equal(g.snapshot(0).stops.visited,1);assert.equal(g.snapshot(0).stats.turboMeters,300);assert.equal(g.snapshot(0).daily.count,2);
  g.combo.hit();g.boosters.double=9;g.newRun();assert.equal(g.combo.chain,0);assert.equal(g.boosters.double,0);assert.equal(g.snapshot(0).album.find(a=>a.id==='torget').found,2);
  // trasigt och skadligt innehåll
  s.setItem(FUN_KEY,'{trasig');assert.doesNotThrow(()=>new ExploreFun({storage:s,items}));
  s.setItem(FUN_KEY,JSON.stringify({version:1,collected:[1,2,{a:1},'ok',null],treasures:'nej',stops:['haga',...Array(500).fill('s')],badges:5,streak:-9,dayCount:'x',stats:{thermos:'abc',gold:1e99},levelSeen:'q'}));
  const h=new ExploreFun({storage:s,items});assert.deepEqual(h.state.collected,['ok']);assert.deepEqual(h.state.treasures,[]);assert.ok(h.state.stops.length<=50);assert.equal(h.state.streak,0);assert.equal(h.state.stats.thermos,0);assert.equal(h.state.stats.gold,1e9);assert.equal(h.state.levelSeen,1);
  s.setItem(FUN_KEY,JSON.stringify({version:7}));assert.equal(new ExploreFun({storage:s}).state.collected.length,0,'okänd version ignoreras');
  assert.doesNotThrow(()=>new ExploreFun({storage:{getItem(){throw new Error('nej');},setItem(){throw new Error('nej');}}}).save());
});

test('data: skatter, termosar och hållplatser är hela, unika och inte på varandra',()=>{
  const ids=TREASURES.map(t=>t.id);assert.equal(new Set(ids).size,ids.length);assert.ok(TREASURES.length>=20,'minst tjugo nya skatter');
  for(const t of TREASURES){assert.ok(Number.isFinite(t.x)&&Number.isFinite(t.z),t.id);assert.ok(t.points>=250&&t.points<=500,t.id+' poäng');assert.ok(t.name.length>3&&t.hint.length>10,t.id+' text');}
  const far=TREASURES.filter(t=>Math.hypot(t.x,t.z)>500);assert.ok(far.length>=10,'många skatter långt ut');
  assert.ok(TREASURES.filter(t=>t.y>0).length>=1&&TREASURES.filter(t=>t.x<-99&&t.x>-170&&t.z>70&&t.z<135).length>=3,'skatter inne i Mitt i City, även på plan 1');
  const all=[];for(const [a,list] of Object.entries(FX_THERMOS))list.forEach(([x,z,y],i)=>all.push({id:a+i,x,z,y:y||0}));
  assert.ok(all.length>=90);
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)if(Math.hypot(all[i].x-all[j].x,all[i].z-all[j].z,all[i].y-all[j].y)<3)assert.fail('för nära: '+all[i].id+' '+all[j].id);
  for(const t of TREASURES)for(const q of all)if(Math.hypot(t.x-q.x,t.z-q.z,(t.y||0)-q.y)<3)assert.fail(t.id+' ligger på en termos');
  const lines=BUS_NETWORK.filter(s=>!s.hub).map(s=>s.line);assert.deepEqual([...lines].sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);assert.equal(BUS_NETWORK.filter(s=>s.hub).length,1);assert.equal(BUS_NETWORK[0].id,'torget');
  for(const s of BUS_NETWORK)if(!['torget','sandgrund','domkyrkan'].includes(s.id))assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.z),s.id);
  const target=BUS_NETWORK.find(s=>s.id==='marieberg');assert.ok(BUS_NETWORK.some(s=>s.id==='haga')&&BUS_NETWORK.some(s=>s.id==='tingvalla')&&target);
  assert.equal(BUS_FIRST_RIDE_BONUS,150);
  for(const k of ['secret-0','secret-1','secret-2','secret-3','secret-4','mall-upper','udden-cache'])assert.ok(LEGACY_HINTS[k],'ledtråd till '+k);
});

test('busstid och områdesindelning',()=>{
  const torget={x:-19,z:35};
  for(const s of BUS_NETWORK){if(s.x===undefined||s.hub)continue;const secs=busRideSeconds(torget,s);assert.ok(secs>=8&&secs<=15,s.id+' '+secs);}
  assert.ok(busRideSeconds(torget,{x:-902,z:1210})>busRideSeconds(torget,{x:-204,z:264}),'längre bort tar längre tid');
  assert.equal(busRideSeconds(torget,torget),8);assert.equal(busRideSeconds(torget,{x:9e4,z:0}),15);
  assert.equal(areaOf({id:'kil-3',x:-10583,z:-13678}),'kil');assert.equal(areaOf({id:'fx-marieberg-4',x:-900,z:1200}),'marieberg');assert.equal(areaOf({id:'marieberg-1',x:-790,z:1310}),'marieberg');
  assert.equal(areaOf({id:'mall-term-2',x:-140,z:92,y:5.4}),'mall');assert.equal(areaOf({id:'fx-mall-0',x:-108,z:100}),'mall');
  assert.equal(areaOf({id:'s:1:1',x:0,z:-700}),'udden');assert.equal(areaOf({id:'s:1:1',x:0,z:-400}),'sandgrund');assert.equal(areaOf({id:'s:1:1',x:600,z:0}),'haga');
  assert.equal(areaOf({id:'s:1:1',x:100,z:400}),'hamn');assert.equal(areaOf({id:'s:1:1',x:-300,z:0}),'klara');assert.equal(areaOf({id:'s:1:1',x:0,z:50}),'torget');
  assert.equal(areaOf({id:'s:1:1',x:50,z:-200}),'norr');assert.equal(areaOf({id:'s:1:1',x:-20,z:200}),'soder');assert.equal(areaOf({id:'s:1:1',x:200,z:0}),'ost');assert.equal(areaOf({id:'s:1:1',x:-120,z:60}),'vast');
  assert.equal(areaOf({id:'p',x:-10583,z:-13678}),'kil','spelarens läge på Kil-stationen');assert.equal(areaOf({id:'p',x:-900,z:1200}),'marieberg','spelarens läge i Mariebergsskogen');assert.equal(areaOf({id:'p',x:-778,z:1321}),'marieberg');
  assert.equal(areaOf({}),'torget');
  const defined=new Set(ALBUM_AREAS.map(a=>a.id));for(const id of ['kil','marieberg','mall','udden','sandgrund','haga','hamn','klara','torget','norr','soder','ost','vast'])assert.ok(defined.has(id),id);
});
