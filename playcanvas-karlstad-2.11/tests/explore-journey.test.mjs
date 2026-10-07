import test from 'node:test';
import assert from 'node:assert/strict';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney,JOURNEY_KEY,RESPAWN} from '../journey-rules.mjs';
import {rarityFor,FUN_KEY,levelFor} from '../explore-fun.mjs';
import {pickCursed} from '../halloween.mjs';
import {stockholmDay} from '../daily-challenge.mjs';
import {TREASURES,BUS_NETWORK} from '../explore-places.mjs';

const nav=new CityNavigation(),mall={x:-135,z:98};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-135,z:55,name:'Rädda fikat'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
const FAR={x:5000,z:5000};
const clean=(store=storage())=>{const g=new CityJourney(nav,mall,portals,store);g.rush.start('clean');g.drainEvents();return g;};
const day=()=>stockholmDay(new Date());
const commonItems=g=>g.items.filter(t=>!t.y&&rarityFor(t.id,day())==='common'&&!/^(kil|marieberg)-/.test(t.id));
const step=(g,p,dt=.1)=>{g.step(dt,{x:p.x,z:p.z,y:p.y??1.68},{x:0,z:-1});return g.drainEvents();};

test('fler termosar långt ut och inne i Mitt i City, utan att de gamla id:na rubbas',()=>{
  const g=new CityJourney(nav,mall,portals,storage());
  const fx=g.items.filter(t=>t.id.startsWith('fx-')),old=g.items.filter(t=>!t.id.startsWith('fx-'));
  assert.ok(fx.length>=90,'minst 90 nya termosar: '+fx.length);assert.equal(new Set(g.items.map(t=>t.id)).size,g.items.length,'id:na är unika');
  for(const area of ['haga','hamn','marieberg','park','klara','mall'])assert.ok(fx.some(t=>t.id.startsWith('fx-'+area+'-')),area);
  assert.ok(fx.some(t=>t.x>800)&&fx.some(t=>t.x<-1000)&&fx.some(t=>t.z>1400)&&fx.some(t=>t.z<-700),'ända ut i alla väderstreck');
  assert.ok(fx.some(t=>t.y>0)&&fx.some(t=>t.id.startsWith('fx-mall-')&&!t.y),'båda planen i gallerian');
  assert.ok(old.length>=280&&old.length<330,'de gamla termosarna är oförändrade i antal: '+old.length);
  assert.ok(g.items.indexOf(fx[0])>g.items.indexOf(old.at(-1)),'nya termosar ligger sist i listan');
  for(const t of fx)assert.ok(!g.secrets.some(s=>Math.hypot(t.x-s.x,t.z-s.z)<3)&&!g.treasures.some(s=>Math.hypot(t.x-s.x,t.z-s.z)<3),t.id+' ligger på en skatt');
});

test('Halloween-urvalet påverkas inte av de nya termosarna långt ut',()=>{
  const g=new CityJourney(nav,mall,portals,storage());
  const cursed=pickCursed(g.items);assert.equal(cursed.length,13);assert.ok(cursed.every(t=>!t.id.startsWith('fx-')),'ingen förbannad termos långt ut');
  assert.deepEqual(cursed.map(t=>t.id),pickCursed(g.items.filter(t=>!t.id.startsWith('fx-'))).map(t=>t.id),'samma 13 som före 2.13');
});

test('City Explore: kombon växer med varje termos, ger multiplikator och bryts när fönstret går ut',()=>{
  const g=clean(),items=commonItems(g).slice(0,5);
  const points=[];
  for(const t of items){const ev=step(g,t);const th=ev.find(e=>e.type==='thermos');points.push(th.points);assert.equal(th.fun,true);}
  assert.deepEqual(points,[25,25,50,50,50],'×1, ×1, ×2, ×2, ×2 (kedja 1–5)');
  assert.equal(g.balance,200,'poängen betalades ut via reward');assert.equal(g.fun.combo.chain,5);
  // fönstret går ut när man står still utan fynd (9 s + lite)
  const lost=[];for(let i=0;i<110;i++)lost.push(...step(g,FAR,.1));
  assert.equal(g.fun.combo.chain,0);assert.ok(lost.some(e=>e.type==='combo-lost'&&e.chain===5),'bruten kedja meddelas');
  const next=commonItems(g)[10];assert.equal(step(g,next).find(e=>e.type==='thermos').points,25,'ny kedja börjar på ×1');
});

test('termosar mellan två steg missas inte i hög fart (turbo och Ryde)',()=>{
  const g=clean(),t=commonItems(g)[0];
  step(g,{x:t.x-6,z:t.z+.4});
  // nästa bildruta: 12 m längre fram, rakt förbi termosen utan att någonsin stå nära den
  const ev=step(g,{x:t.x+6,z:t.z+.4});assert.ok(ev.some(e=>e.type==='thermos'&&e.id===t.id),'sträckan förbi termosen räknas');
  // en teleport (buss) plockar inte upp allt längs vägen
  const far=commonItems(g).find(q=>Math.hypot(q.x-t.x,q.z-t.z)>300&&Math.hypot(q.x-t.x,q.z-t.z)<900);
  g.lastStep={x:t.x,z:t.z};const between=g.items.filter(q=>!g.found.has(q.id)&&Math.hypot(q.x-(t.x+far.x)/2,q.z-(t.z+far.z)/2)<30).length;
  const ev2=step(g,{x:far.x+40,z:far.z+40});assert.equal(ev2.filter(e=>e.type==='thermos').length,0,'teleport hoppar inte över '+between+' termosar');
});

test('trail och zombieläget behåller de gamla reglerna: 25 poäng, ingen kombo',()=>{
  const g=new CityJourney(nav,mall,portals,storage());g.rush.start('trail');g.drainEvents();
  const items=commonItems(g).slice(0,4),pts=[];
  for(const t of items){const th=step(g,t).find(e=>e.type==='thermos');pts.push(th.points);assert.equal(th.fun,undefined);}
  assert.deepEqual(pts,[25,25,25,25]);assert.equal(g.fun.combo.chain,0,'kombon är bara för City Explore');assert.equal(g.fun.snapshot(0).stats.thermos,0);
  const z=new CityJourney(nav,mall,portals,storage());z.rush.start('timed');z.drainEvents();
  const t=commonItems(z)[0];z.step(.1,{x:t.x,z:t.z,y:1.68},{x:0,z:-1});const th=z.drainEvents().find(e=>e.type==='thermos');assert.equal(th.fun,undefined);assert.equal(z.fun.combo.chain,0);
});

test('rariteter: silver, guld och regnbåge ger mer, och regnbågen en superkraft',()=>{
  const g=clean();
  const pick=r=>g.items.find(t=>!t.y&&!g.found.has(t.id)&&rarityFor(t.id,day())===r&&!/^(kil|marieberg)-/.test(t.id));
  const s=step(g,pick('silver')).find(e=>e.type==='thermos');assert.equal(s.rarity,'silver');assert.equal(s.points,50);
  const gd=step(g,pick('gold')).find(e=>e.type==='thermos');assert.equal(gd.rarity,'gold');assert.equal(gd.points,125,'guld ×5 i kedja 2 (×1)');
  const rb=pick('rainbow');if(!rb){assert.ok(Array.from({length:3000},(_,i)=>'x'+i).some(id=>rarityFor(id,day())==='rainbow'),'regnbåge finns i fördelningen');return;} // inga regnbågstermosar bland dagens
  const ev=step(g,rb);assert.ok(ev.some(e=>e.type==='booster'));assert.equal(ev.find(e=>e.type==='thermos').rarity,'rainbow');assert.ok(g.fun.snapshot(0).boosters.length===1);
});

test('kaffemagnet: plockar termosar inom 16 meter, högst tre per steg',()=>{
  const g=clean(),t=commonItems(g)[0];
  const around=g.items.filter(q=>!q.y&&Math.hypot(q.x-t.x,q.z-t.z)<15);assert.ok(around.length>=1);
  assert.equal(step(g,{x:t.x+10,z:t.z}).filter(e=>e.type==='thermos').length,0,'utan magnet: för långt bort');
  g.fun.boosters.magnet=20;const ev=step(g,{x:t.x+10,z:t.z}).filter(e=>e.type==='thermos');
  assert.ok(ev.length>=1&&ev.length<=3,'med magnet: '+ev.length);
});

test('gömda skatter: hittas inom räckhåll, ger sina poäng, sparas och påverkar märken',()=>{
  const store=storage(),g=clean(store);
  assert.equal(g.treasures.length,TREASURES.length);assert.equal(g.fun.treasureTotal,g.secrets.length+g.treasures.length);
  const t=g.treasures.find(x=>x.id==='t-ccc');
  const near=g.nearestHidden({x:t.x-40,z:t.z});assert.equal(near.item.id,'t-ccc');assert.equal(near.heat.label,'VARMT');
  assert.equal(g.nearestHidden({x:t.x,z:t.z,y:1.68+5.4})?.item.id!=='t-ccc',true,'hett/kallt gäller bara skatter på samma våning');
  step(g,{x:t.x+4,z:t.z});assert.equal(g.treasuresFound.size,0,'4 m bort räcker inte');
  const ev=step(g,t);const sec=ev.find(e=>e.type==='secret');assert.equal(sec.points,t.points);assert.equal(sec.name,t.name);assert.equal(sec.fun,true);assert.equal(sec.found,1);assert.equal(sec.total,g.fun.treasureTotal);
  assert.ok(ev.some(e=>e.type==='badge'&&e.id==='treasure-1'));assert.equal(g.balance,t.points);
  assert.equal(step(g,t).some(e=>e.type==='secret'),false,'bara en gång');
  g.save();const loaded=new CityJourney(nav,mall,portals,store);assert.ok(loaded.treasuresFound.has('t-ccc'));assert.equal(loaded.fun.snapshot(0).treasures.found,1);
  assert.ok(JSON.parse(store.getItem(JOURNEY_KEY)).treasures.includes('t-ccc'));
  // gamla hemligheter räknas i samma album med 200 poäng
  const old=g.secrets[0],ev2=step(g,old);assert.equal(ev2.find(e=>e.type==='secret').points,200);assert.equal(g.fun.snapshot(0).treasures.found,2);
});

test('skatter på övervåningen i Mitt i City kräver att man står på rätt plan',()=>{
  const g=clean(),t=g.treasures.find(x=>x.id==='t-clas');assert.equal(t.y,5.4);
  assert.equal(step(g,{x:t.x,z:t.z,y:1.68}).some(e=>e.type==='secret'),false,'på bottenplan går den inte att ta');
  assert.equal(step(g,{x:t.x,z:t.z,y:1.68+5.4}).some(e=>e.type==='secret'),true,'på plan 1 går den att ta');
  const coop=g.treasures.find(x=>x.id==='t-coop');assert.equal(step(g,{x:coop.x,z:coop.z,y:1.68}).some(e=>e.type==='secret'&&e.name===coop.name),true);
});

test('busslinjer: nätet finns i City Explore, de gamla hållplatserna i övriga lägen, första besöket ger bonus',()=>{
  const g=clean(),torget=g.busNetwork.find(s=>s.id==='torget');
  assert.equal(g.busNetwork.length,BUS_NETWORK.length);assert.ok(g.busNetwork.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.z)));
  assert.equal(g.nearestBus({x:torget.x+2,z:torget.z}).id,'torget');
  const haga=g.busNetwork.find(s=>s.id==='haga');assert.equal(g.nearestBus({x:haga.x+3,z:haga.z}).id,'haga','en hållplats långt ute hittas');
  const z=new CityJourney(nav,mall,portals,storage());z.rush.start('timed');
  assert.ok(['torget','domkyrkan','sandgrund'].includes(z.nearestBus({x:haga.x,z:haga.z}).id),'zombieläget känner bara de gamla hållplatserna');
  const r=g.busArrive(haga);assert.equal(r.first,true);assert.equal(g.balance,150);
  const ev=g.drainEvents();assert.ok(ev.some(e=>e.type==='bus-arrive'&&e.first&&e.bonus===150&&e.visited===1&&e.total===8));assert.ok(ev.some(e=>e.type==='badge'&&e.id==='bus-1'));
  g.busArrive(haga);assert.equal(g.balance,150,'inget nytt besök, ingen ny bonus');
  assert.equal(g.busArrive(torget).first,false,'Torget räknas inte som en ny hållplats');
  const trail=new CityJourney(nav,mall,portals,storage());trail.rush.start('trail');assert.equal(trail.busArrive(haga),null,'bara City Explore delar ut bussbonus');
});

test('nivåer och dagsmål följer med poängen och sparas',()=>{
  const store=storage(),g=clean(store);
  const ev=[];for(const t of g.items.filter(q=>!q.y).slice(0,14)){ev.push(...step(g,t));}
  assert.ok(g.lifetime>=300,'över 300 poäng: '+g.lifetime);assert.ok(ev.some(e=>e.type==='level-up'&&e.level>=2),'nivåhöjning meddelas');assert.equal(g.fun.state.levelSeen,levelFor(g.lifetime).level);
  assert.equal(ev.filter(e=>e.type==='level-up').length,new Set(ev.filter(e=>e.type==='level-up').map(e=>e.level)).size,'varje nivå meddelas en gång');
  g.save();const saved=JSON.parse(store.getItem(FUN_KEY));assert.equal(saved.dayCount,14);assert.ok(saved.collected.length>=14);
  const again=new CityJourney(nav,mall,portals,store);assert.equal(again.fun.snapshot(again.lifetime).daily.count,14);
});

test('en ny runda börjar utan kedja men behåller albumet; spelaren som redan har poäng får ingen nivåflod',()=>{
  const store=storage(),g=clean(store);
  const t=commonItems(g)[0];step(g,t);assert.equal(g.fun.combo.chain,1);g.save();
  g.rush.start('clean');assert.equal(g.fun.combo.chain,0);assert.equal(g.found.size,0,'termosarna är tillbaka');assert.ok(g.fun.collectedSet.has(t.id),'men albumet minns dem');
  const veteran=storage();veteran.setItem(JOURNEY_KEY,JSON.stringify({version:1,balance:4000,lifetime:6000,energy:50,health:100,found:[],secrets:[],cleared:[],postcards:[],position:{x:0,z:14},heading:0,destination:'sista-rundan'}));
  const v=new CityJourney(nav,mall,portals,veteran);v.rush.start('clean');v.drainEvents();
  const first=step(v,commonItems(v)[0]);assert.equal(first.some(e=>e.type==='level-up'),false,'nivå 6 från början, ingen flod av meddelanden');
});

test('framsteget från före 2.13 läses in utan problem (inga skatter sparade)',()=>{
  const s=storage();s.setItem(JOURNEY_KEY,JSON.stringify({version:1,balance:100,lifetime:100,energy:80,health:100,found:['mall-term-0'],secrets:['secret-0'],cleared:[],postcards:[],position:{x:0,z:14},heading:0,destination:'sista-rundan'}));
  const g=new CityJourney(nav,mall,portals,s);assert.equal(g.treasuresFound.size,0);assert.equal(g.secretsFound.has('secret-0'),true);assert.equal(g.found.has('mall-term-0'),true);
});

test('termosar dyker upp igen efter fyra minuter, men bara när man är långt därifrån',()=>{
  const g=clean(),t=commonItems(g)[0];
  step(g,t);assert.ok(g.found.has(t.id));assert.equal(g.fun.run,1);
  const near={x:t.x+10,z:t.z};
  for(let i=0;i<RESPAWN.after+30;i++)step(g,near,1);
  assert.ok(g.found.has(t.id),'kvar plockad så länge man står inom 80 m');
  for(let i=0;i<10;i++)step(g,FAR,1);
  assert.equal(g.found.has(t.id),false,'tillbaka när man gått långt bort');assert.equal(g.foundAt.has(t.id),false);
  const before=g.fun.run,back=step(g,t).find(e=>e.type==='thermos'&&e.id===t.id);assert.ok(back,'går att plocka igen');assert.equal(back.first,false,'men räknas inte som nytt fynd i albumet');
  assert.equal(g.fun.run,before+1,'rundans räknare ökar för varje plock');
  assert.equal(g.fun.snapshot(0).album.find(a=>a.id==='torget').found,g.fun.collectedSet.size-[...g.fun.collectedSet].filter(id=>g.fun.areaById.get(id)!=='torget').length);
  g.rush.start('clean');assert.equal(g.foundAt.size,0);assert.equal(g.fun.run,0,'ny runda nollställer');
});

test('respawn gäller inte trail och zombieläget',()=>{
  const g=new CityJourney(nav,mall,portals,storage());g.rush.start('trail');g.drainEvents();
  const t=commonItems(g)[0];step(g,t);assert.ok(g.found.has(t.id));assert.equal(g.foundAt.size,0);
  for(let i=0;i<RESPAWN.after+30;i++)step(g,FAR,1);assert.ok(g.found.has(t.id),'termosrundan fylls inte på av sig själv');
});

test('MusicPartner: incheckning en gång per dag, märke, och återställning av poäng och nivå',()=>{
  const g=clean(),office={x:302,z:-23.5};
  assert.equal(g.nearOffice(office),true);assert.equal(g.nearOffice({x:302,z:-5}),false);
  const first=g.musicCheckIn();assert.equal(first.first,true);assert.equal(first.bonus,100);assert.equal(g.balance,100);
  const ev=g.drainEvents();assert.ok(ev.some(e=>e.type==='checkin'&&e.bonus===100));assert.ok(ev.some(e=>e.type==='badge'&&e.id==='checkin-1'));
  assert.equal(g.musicCheckIn().first,false);assert.equal(g.balance,100,'bara en gång per dag');assert.equal(g.fun.checkedInToday(),true);
  const trail=new CityJourney(nav,mall,portals,storage());trail.rush.start('trail');assert.equal(trail.musicCheckIn(),null,'bara City Explore');
  // poäng och nivå nollas, album och skatter ligger kvar
  const t=commonItems(g)[0];step(g,t);g.fun.afterReward(60000);g.reward(60000);assert.ok(g.fun.snapshot(g.lifetime).level>=7);
  const found=g.fun.snapshot(g.lifetime).album.reduce((n,a)=>n+a.found,0),kept=g.fun.state.badges.length;
  g.resetXp();assert.equal(g.balance,0);assert.equal(g.lifetime,0);assert.equal(g.rush.xp,0);assert.equal(g.fun.state.levelSeen,1);assert.equal(g.fun.snapshot(g.lifetime).level,1);
  assert.equal(g.fun.snapshot(g.lifetime).album.reduce((n,a)=>n+a.found,0),found);assert.ok(g.fun.state.badges.length>=kept);
  assert.equal(step(g,commonItems(g)[3]).some(e=>e.type==='level-up'&&e.level>3),false,'ingen flod av nivåhöjningar efter återställning');
  const saved=storage();const h=clean(saved);h.musicCheckIn();h.fun.save();assert.equal(new CityJourney(nav,mall,portals,saved).fun.checkedInToday(),true,'sparas mellan sessioner');
});
