// JulRushen: Julklappsjaktens version av TempoRush. Reglerna körs mot grundspelets riktiga CityJourney (samma bana, klocka och fångstfält),
// med en liten "spelare" som går mot målet bildruta för bildruta, så att det som testas är det som händer i spelet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney,TEMPO_COURSE,tempoReach,catchReach} from '../journey-rules.mjs';
import {TEMPO,tempoSpeed,tempoPoints} from '../tempo-run.mjs';
import {powerFor,POWER} from '../powerups.mjs';
import {XmasRush,GIFTS,GIFT_KINDS,giftFor,bearsGift,RUSH,RUSH_NAMES,rushName} from '../xmas/xmas-rush.mjs';
import {XmasSave,sanitizeSave} from '../xmas/xmas-save.mjs';
import {COMBO,PACKAGE_POINTS,STAMPS} from '../xmas/xmas-config.mjs';
import {RUSHES,RUSH_COUNT,RUSH_MAX,PRESSURE,clockFor,rushDef,goalProgress} from '../xmas/xmas-rushes.mjs';

const nav=new CityNavigation(),mall={x:-135,z:98};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-135,z:55,name:'Rädda fikat'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
const START={x:-19,z:35};
// Dagen är fast i proven: banans paket, vilka som bär en gåva och förmågorna beror annars på dagens datum, och några prov (spöket, magneten, de femton gåvorna, sidopaketen) räknar med en viss mängd paket nära start.
const DAY_PIN=Date.parse('2026-10-10T12:00:00Z');

// Ett julbygge i miniatyr: samma journey som spelet, utan termosar, med JulRushen inkopplad där grundspelet anropar xmas.step.
function mk({wall=null,at=START}={}){
  const g=new CityJourney(wall?new CityNavigation(wall):nav,mall,portals,storage());g.fun.clock=()=>new Date(DAY_PIN);g.rush.start('clean');g.drainEvents();
  g.items.length=0;g.treasures.length=0;g.secrets.length=0;g.itemById.clear(); // som prepareXmasJourney
  const save=new XmasSave(storage()),rush=new XmasRush({journey:g,save});
  g.xmas={step:(dt,p,sweep,speed)=>rush.step(dt,p,sweep,speed),objective:p=>rush.objective(p)};
  return {g,rush,save,pos:{...at},fwd:{x:0,z:-1},events:[],base:[]};
}
// Ett steg. move: null = stå still, 'target' = gå mot målet, {x,z} = gå mot en punkt. Farten är gångfarten gånger turbon (×2: rushen slår på den, och klockan är räknad på den), tempot och eventuella fartgåvor.
// calm(c) stänger av klockan (glöggpaus utan slut) för test som står stilla en längre stund: annars tar hjärtana slut och körningen med dem.
function frame(c,dt=1/60,move=null){
  const {g}=c;const dest=move==='target'?g.tempo.target:move&&typeof move==='object'?move:null;
  if(dest){const dx=dest.x-c.pos.x,dz=dest.z-c.pos.z,d=Math.hypot(dx,dz);if(d>1e-6){const v=7.2*(c.turbo??2)*g.tempo.speedMul()*g.fun.power.speedMul(),s=Math.min(d,v*dt);c.pos={x:c.pos.x+dx/d*s,z:c.pos.z+dz/d*s};c.fwd={x:dx/d,z:dz/d};}}
  g.step(dt,{x:c.pos.x,z:c.pos.z,y:1.68},c.fwd);
  const ev=c.rush.drain();c.events.push(...ev);c.base.push(...g.drainEvents());return ev;
}
const calm=c=>{c.rush.timers.pause=1e6;return c;};
function play(c,seconds,move='target',dt=1/60){const n=Math.round(seconds/dt);for(let i=0;i<n&&c.rush.state!=='over';i++)frame(c,dt,move);return c.events;}
const ofType=(c,type)=>c.events.filter(e=>e.type===type);
// Spela tills ett villkor är uppfyllt (eller tiden tar slut).
function until(c,cond,max=120,move='target'){for(let i=0;i<max*60&&!cond();i++){if(c.rush.state==='over')break;frame(c,1/60,move);}return cond();}
// Starta och låt första steget lägga ut banan.
function started(opts){const c=mk(opts);c.rush.start();frame(c,.1);return c;}

test('julgåvor: femton sorter med namn, förklaring och färg, stabil fördelning och skölden är sällsyntast',()=>{
  assert.equal(GIFT_KINDS.length,15);
  for(const k of ['sleigh','magnet','ghost','star','clock','pause','golden','sparkler','shield','bomb','rain','glogg','kaka','wind','skates'])assert.ok(GIFT_KINDS.includes(k),k);
  for(const k of GIFT_KINDS){const d=GIFTS[k];assert.ok(d.label&&d.text&&d.color&&d.short,k+' saknar text');assert.ok(Number.isFinite(d.seconds)&&d.seconds>=0);}
  const count=Object.fromEntries(GIFT_KINDS.map(k=>[k,0])),n=32000;
  for(let i=0;i<n;i++){const k=giftFor('tp:'+i);assert.ok(GIFTS[k]);count[k]++;assert.equal(giftFor('tp:'+i),k,'samma id ger samma gåva');}
  for(const k of GIFT_KINDS)assert.ok(count[k]>n*.025,k+' förekommer: '+count[k]);
  const rarest=GIFT_KINDS.reduce((a,b)=>count[a]<count[b]?a:b);assert.equal(rarest,'shield','skölden (som räddar ett liv) är sällsyntast');
  assert.ok(count.sleigh>count.shield*2);
});

test('nivånamn: tolv tempon har julnamn och orimliga nivåer ger inget fel',()=>{
  assert.equal(RUSH_NAMES.length,TEMPO.levels+1);
  for(let l=1;l<=TEMPO.levels;l++)assert.ok(rushName(l).length>3,'tempo '+l);
  assert.equal(rushName(1),'JULMYS');assert.equal(rushName(12),'TOMTEGALET');assert.equal(rushName(0),'JULMYS');assert.equal(rushName(99),'TOMTEGALET');assert.equal(rushName(NaN),'JULMYS');
});

test('start: körningen börjar i första steget, med tempo 1, tre liv och ett paketband längs en lång bana',()=>{
  const c=mk();assert.equal(c.rush.state,'idle');assert.equal(c.rush.active,false);
  c.rush.start();assert.equal(c.rush.state,'starting');assert.equal(c.rush.active,true);assert.equal(c.g.tempo.running,false,'ingenting händer förrän första steget');
  frame(c,.1);
  assert.equal(c.rush.state,'running');assert.equal(c.g.tempo.running,true);assert.equal(c.g.tempo.level,1);assert.equal(c.g.tempo.lives,3);
  assert.deepEqual(ofType(c,'rush-start').map(e=>[e.level,e.lives,e.name]),[[1,3,'JULMYS']]);
  const pk=c.rush.list;assert.ok(pk.length>=10,'ett långt band: '+pk.length);
  assert.ok(pk.every(k=>k.id.startsWith('tp:')&&c.g.itemById.has(k.id)),'samma pärlor som TempoRush lägger ut');
  for(let i=1;i<pk.length;i++){const d=Math.hypot(pk[i].x-pk[i-1].x,pk[i].z-pk[i-1].z);assert.ok(d>6&&d<40,'avstånd '+d.toFixed(1));}
  assert.ok(c.g.tempo.target,'ett mål finns direkt');assert.equal(c.g.tempo.target.id,c.g.course.pearls[0].id);
  assert.ok(c.g.tempo.deadline>=4&&c.g.tempo.deadline<=10,'första klockan har extra tid att se sig om på: '+c.g.tempo.deadline.toFixed(1)+' s');
  const t=c.rush.target(c.pos);assert.equal(t.id,c.g.tempo.target.id);assert.match(t.label,/PAKET/);
});

test('grundspelets tempohändelser, termos- och förmågehändelser skrivs aldrig i julbygget',()=>{
  const c=started();play(c,40);
  assert.ok(c.events.some(e=>e.type==='rush-pick'),'paket plockades');
  const types=new Set(c.base.map(e=>e.type));
  for(const bad of ['tempo-start','tempo-level','tempo-miss','tempo-pick','tempo-over','thermos','power','bomb','strip','rain','booster','combo-praise','badge','level-up','challenge-start'])assert.ok(!types.has(bad),'oväntad grundhändelse '+bad);
  assert.ok(Math.abs(c.g.tempo.elapsed-(c.g.elapsed-.0))<1.2,'tempoklockan tickar en gång per steg (inte dubbelt): '+c.g.tempo.elapsed.toFixed(2)+' mot '+c.g.elapsed.toFixed(2));
});

test('plocka ett paket: poäng med nivåfaktor och flytbonus, och samma paket ger aldrig poäng två gånger',()=>{
  const c=started(),first=c.rush.list[0];
  c.pos={x:first.x,z:first.z};frame(c,.05);
  const picks=ofType(c,'rush-pick');assert.equal(picks.length,1);const e=picks[0];
  assert.equal(e.id,first.id);assert.equal(e.kind,first.kind);assert.equal(e.chain,1);
  const gold=first.kind==='bonus',expect=Math.round((gold?PACKAGE_POINTS.bonus:PACKAGE_POINTS.regular)*tempoPoints(1))+TEMPO.flowBonus; // första målet tas med full klocka = flyt
  assert.equal(e.points,expect);assert.equal(c.g.tempo.score,expect);assert.equal(c.g.tempo.picked,1);assert.equal(e.flow,true);
  assert.ok(c.g.found.has(first.id));
  for(let i=0;i<30;i++)frame(c,1/60);
  assert.equal(ofType(c,'rush-pick').filter(x=>x.id===first.id).length,1,'inga fler poäng för samma paket');
  assert.equal(c.g.tempo.picked,1+c.events.filter(x=>x.type==='rush-pick'&&x.id!==first.id).length);
});

test('kedja: fyra paket i rad ger ×2 och kombobonus, och kedjan bryts när fönstret gått ut',()=>{
  const c=started();
  const picks=[];
  for(let i=0;i<4;i++){const k=c.rush.list.find(x=>!c.g.found.has(x.id)&&x.kind==='regular');assert.ok(k);c.pos={x:k.x,z:k.z};picks.push(...frame(c,.3).filter(e=>e.type==='rush-pick'));}
  assert.deepEqual(picks.map(e=>e.chain),[1,2,3,4]);
  const tier=COMBO.tiers[0],p4=picks[3];
  assert.equal(p4.praise,tier.praise);assert.equal(p4.tierBonus,tier.bonus);assert.equal(p4.mult,2);
  assert.ok(p4.points>=PACKAGE_POINTS.regular*2+tier.bonus,'fjärde paketet: '+p4.points);
  assert.equal(c.rush.bestChain,4);
  // Stå still längre än fönstret: kedjan bryts (och det meddelas för kedjor ≥ 3). Klockan hålls i schack, annars tar den ett liv först och bryter kedjan på det sättet.
  calm(c);for(let i=0;i<Math.ceil((COMBO.window+.5)*60);i++)frame(c,1/60);
  assert.equal(c.rush.chain,0);assert.ok(ofType(c,'rush-chain-lost').some(e=>e.chain===4));
});

test('nivåer: tempot stiger var 15:e sekund med fart och poäng, och nivånamnet följer med',()=>{
  const c=started();play(c,TEMPO.levelSeconds+1);
  const lv=ofType(c,'rush-level');assert.equal(lv.length,1);assert.equal(lv[0].level,2);assert.equal(lv[0].name,'JULMYS');
  assert.equal(c.g.tempo.speedMul(),tempoSpeed(2));assert.equal(c.rush.snapshot().mult,tempoPoints(2));
  play(c,TEMPO.levelSeconds*2);
  const names=ofType(c,'rush-level').map(e=>e.name);assert.deepEqual(names.slice(0,3),['JULMYS','GLÖGGFART','GLÖGGFART']);
  assert.equal(c.rush.snapshot().level,4);
});

test('poängen följer TempoRush: nivåfaktorn gäller varje paket och flytbonusen växer med nivån',()=>{
  const c=started();c.g.tempo.level=3;
  const k=c.rush.list.find(x=>x.kind==='regular');c.pos={x:k.x,z:k.z};
  c.g.tempo.setTarget(k,5);const before=c.g.tempo.score;frame(c,.05);
  const e=ofType(c,'rush-pick').find(x=>x.id===k.id);assert.ok(e);
  assert.equal(e.levelMult,tempoPoints(3));assert.equal(e.points,Math.round(PACKAGE_POINTS.regular*tempoPoints(3))+TEMPO.flowBonus*3);
  assert.equal(c.g.tempo.score-before,e.points);
});

test('liv: en stillastående spelare tappar tre liv, körningen slutar och en tom körning sparas inte',()=>{
  const c=started();play(c,80,null);
  const miss=ofType(c,'rush-miss');assert.deepEqual(miss.map(e=>e.lives),[2,1,0]);
  assert.equal(c.rush.state,'over');const over=ofType(c,'rush-over');assert.equal(over.length,1);
  const r=over[0].result;assert.equal(r.collected,0);assert.equal(r.points,0);assert.equal(r.stamp,false);assert.equal(r.record,false);
  assert.equal(c.save.state.records.julrush,undefined,'ingen rekordpost för en körning utan paket');assert.equal(c.save.state.totals.runs,0);
  assert.equal(c.g.tempo.running,false);
  // Efter slutet händer inget mer.
  const n=c.events.length;for(let i=0;i<60;i++)frame(c,1/60);assert.equal(c.events.length,n);
});

test('en körning som går bra: rekord, julstämpel vid tempo 5, och stämpeln delas bara ut en gång',()=>{
  const c=started();
  until(c,()=>c.g.tempo.level>=RUSH.stampLevel,150);
  assert.ok(c.g.tempo.level>=RUSH.stampLevel,'tempo '+c.g.tempo.level+' nåddes');assert.equal(c.g.tempo.lives,3,'boten tappade inget liv');
  assert.ok(c.g.tempo.picked>=20,'plockade '+c.g.tempo.picked);
  const score=c.g.tempo.score,picked=c.g.tempo.picked,r=c.rush.quit(); // första körningen: man ger upp vid tempo 5
  assert.equal(c.rush.state,'over');assert.deepEqual(ofType(c,'rush-over').length,0,'quit() ger resultatet direkt; händelsen kommer vid nästa tömning');
  assert.ok(r.level>=RUSH.stampLevel);assert.equal(r.stamp,true);assert.equal(c.save.hasStamp('julrush'),true);assert.equal(r.record,false,'första rekordet är inget nytt rekord');
  assert.equal(r.points,score);assert.equal(r.collected,picked);assert.equal(r.name,rushName(r.level));assert.equal(r.quit,true);
  const rec=c.save.state.records.julrush;assert.equal(rec.points,r.points);assert.equal(rec.level,r.level);assert.equal(rec.packages,r.collected);
  assert.equal(c.save.state.totals.runs,1);assert.equal(c.save.state.totals.points,Math.round(r.points*RUSH.titleShare),'mot titlarna räknas en tiondel');assert.equal(c.save.state.totals.packages,r.collected);assert.equal(c.save.state.totals.bonus,r.gold);
  c.events.push(...c.rush.drain());assert.equal(ofType(c,'rush-over').length,1);
  // Andra körningen: längre, och den slutar för att klockan går ut tre gånger. Ett bättre resultat är ett nytt rekord, men ingen ny stämpel.
  c.rush.start();c.events.length=0;c.pos={...START};frame(c,.1);
  until(c,()=>c.g.tempo.level>=8,250);play(c,200,null);
  assert.equal(c.rush.state,'over');assert.equal(ofType(c,'rush-miss').length,3);
  const r2=ofType(c,'rush-over')[0].result;
  assert.equal(r2.quit,false);assert.ok(r2.points>r.points,'andra körningen blev längre: '+r2.points+' mot '+r.points);assert.equal(r2.record,true);assert.equal(r2.stamp,false);
  assert.equal(c.save.state.records.julrush.points,r2.points);assert.equal(c.save.state.totals.runs,2);assert.equal(c.save.state.stamps.julrush>0,true);
  assert.deepEqual(r2.best,c.save.state.records.julrush);
});

test('ge upp: en körning med paket sparas som en förlust, en utan sparas inte, och inget ligger kvar',()=>{
  const c=started();
  for(let i=0;i<3;i++){const k=c.rush.list.find(x=>!c.g.found.has(x.id));c.pos={x:k.x,z:k.z};frame(c,.3);}
  assert.equal(c.g.tempo.picked,3);
  const r=c.rush.quit();assert.ok(r);assert.equal(r.quit,true);assert.equal(r.collected,3);assert.ok(c.save.state.records.julrush.points>0);assert.equal(c.save.state.totals.runs,1);
  assert.equal(c.rush.state,'over');assert.equal(c.g.tempo.running,false);
  // Städat: inga paket, ingen bana, ingen släde, inga hittade-poster kvar.
  assert.equal(c.g.items.filter(t=>t.dyn).length,0);assert.equal(c.g.course,null);assert.equal(c.g.fun.power.speedMul(),1);assert.equal(c.rush.list.length,0);
  assert.equal([...c.g.found].filter(id=>String(id).startsWith('tp:')).length,0);assert.equal([...c.g.itemById.keys()].filter(id=>String(id).startsWith('tp:')).length,0);
  assert.equal(c.rush.quit(),null,'det går inte att ge upp två gånger');
  const d=started();assert.equal(d.rush.quit().collected,0);assert.equal(d.save.state.records.julrush,undefined);assert.equal(d.save.state.totals.runs,0);
  const e=mk();e.rush.start();assert.equal(e.rush.quit(),null,'innan första steget finns inget att spara');assert.equal(e.rush.state,'idle');
});

test('fångstfältet är TempoRushs: nivåns räckvidd, och inget paket tas genom en vägg',()=>{
  const c=started(),k=c.rush.list[0],reach=Math.max(catchReach(0),tempoReach(1));
  assert.equal(reach,tempoReach(1),'på tempo 1 är nivåns fält störst');
  // Rakt åt sidan om banans riktning. Först långt bort (sträckan sedan förra steget räknas, så vi startar på ett säkert avstånd),
  // sedan precis utanför fältet och slutligen precis innanför.
  const sx=-k.pearl.hz,sz=k.pearl.hx,at=d=>({x:k.x+sx*d,z:k.z+sz*d});
  c.pos=at(20);frame(c,.05);c.pos=at(reach+.7);frame(c,.05);assert.equal(c.g.found.has(k.id),false,'utanför fältet');
  c.pos=at(reach-.4);frame(c,.05);assert.equal(c.g.found.has(k.id),true,'innanför fältet');
  // Högre tempo, större fält (men aldrig större än taket).
  assert.ok(tempoReach(8)>tempoReach(1)&&tempoReach(12)<=6.5);
  // Vägg mellan spelaren och paketet: 1,8 m tjock, så paketet ligger inom fältet men utan fri sikt.
  const w=mk({wall:(x,z)=>x>-18.2&&x<-16.4&&z>29&&z<41});
  w.rush.start();w.pos={x:-19,z:35};frame(w,.1);
  const near={id:'tp:vagg',x:-15.6,z:35,dyn:true,course:99,hx:0,hz:-1};
  w.g.course.pearls.push(near);w.g.items.push(near);w.g.itemById.set(near.id,near);w.rush.sync();
  assert.ok(Math.hypot(near.x+19,near.z-35)<reach,'paketet ligger inom fältet');
  frame(w,.05);assert.equal(w.g.found.has(near.id),false,'väggen stoppar fångsten');
  w.pos={x:-13.6,z:35};frame(w,.05);w.pos={x:-13.7,z:35};frame(w,.05);assert.equal(w.g.found.has(near.id),true,'på andra sidan väggen tas det');
});

test('guldpaket bär julgåvor: ungefär vart tredje till fjärde paket, och gåvan kommer när paketet tas',()=>{
  const c=started();
  until(c,()=>c.events.some(e=>e.type==='rush-gift'),90);
  const gift=ofType(c,'rush-gift')[0];assert.ok(gift,'en gåva delades ut');assert.ok(GIFT_KINDS.includes(gift.kind));assert.equal(gift.label,GIFTS[gift.kind].label);
  const gold=ofType(c,'rush-pick').filter(e=>e.gold);assert.ok(gold.length>=1&&gold[0].kind==='bonus');
  assert.equal(c.rush.gifts,ofType(c,'rush-gift').length);assert.equal(c.rush.golds,gold.length);
  // Andelen guldpaket i banan: minst var sjätte (som grundspelets förmågebärare) men inte allt.
  const d=started();let gold2=0,all=0;for(let i=0;i<30*60&&d.rush.state==='running';i++){frame(d,1/60,'target');}
  for(const e of d.events.filter(x=>x.type==='rush-pick')){all++;if(e.gold)gold2++;}
  assert.ok(all>=20);assert.ok(gold2/all>=1/5&&gold2/all<=.45,'guldandel '+gold2+'/'+all);
  // Guldpaketets id bär en förmåga i grundspelets mening (eller är en av julens extra bärare); vanliga paket bär ingen.
  const some=c.rush.list.filter(k=>k.kind==='bonus');for(const k of some)assert.ok(bearsGift(k.id,c.g.fun.day),k.id);
  for(const k of c.rush.list.filter(k=>k.kind==='regular'))assert.ok(!bearsGift(k.id,c.g.fun.day));
});

test('gåva: renssläden fördubblar farten via grundspelets raketförmåga och tar slut efter sju sekunder',()=>{
  const c=started();c.rush.grant('sleigh',c.pos);
  assert.equal(c.g.fun.power.speedMul(),2);const pw=c.rush.powers();assert.deepEqual(pw.map(p=>p.kind),['sleigh']);assert.ok(pw[0].left>6.9&&pw[0].left<=7);
  const g=GIFTS.sleigh;assert.equal(g.seconds,7);
  play(c,7.2,null);assert.equal(c.g.fun.power.speedMul(),1);assert.equal(c.rush.powers().length,0);
});

test('gåva: julstjärnan ger dubbla poäng och större fångstfält i nio sekunder, guldklappen tredubbla i tjugo',()=>{
  const a=started(),b=started(),s=started(),k0=a.rush.list.find(x=>x.kind==='regular');
  for(const c of [a,b,s]){const k=c.rush.list.find(x=>x.kind==='regular');c.g.tempo.setTarget(k,5);}
  const pick=(c,after)=>{const k=c.rush.list.find(x=>x.kind==='regular'&&!c.g.found.has(x.id));c.g.tempo.setTarget(k,5);c.pos={x:k.x,z:k.z};after?.(c);return frame(c,.05).find(e=>e.type==='rush-pick');};
  const plain=pick(a),star=pick(b,c=>c.rush.grant('star',c.pos)),golden=pick(s,c=>c.rush.grant('golden',c.pos));
  void k0;
  assert.equal(star.pm,2);assert.equal(star.points,Math.round(PACKAGE_POINTS.regular*2*tempoPoints(1))+TEMPO.flowBonus);
  assert.equal(golden.pm,3);assert.equal(golden.points,Math.round(PACKAGE_POINTS.regular*3*tempoPoints(1))+TEMPO.flowBonus);
  assert.equal(plain.pm,1);assert.ok(star.points>plain.points&&golden.points>star.points);
  // Tiderna.
  assert.equal(GIFTS.star.seconds,9);assert.equal(GIFTS.golden.seconds,20);
  calm(b);calm(s);play(b,9.2,null);assert.equal(b.rush.timers.star,0);play(s,19.5,null);assert.ok(s.rush.timers.golden>0||s.rush.state==='over');
  // Magneten: ett paket strax utanför det vanliga fältet tas.
  const m=started(),n=m.rush.list[0],reach=Math.max(catchReach(0),tempoReach(1)),sx=-n.pearl.hz,sz=n.pearl.hx;
  m.rush.grant('star',m.pos);m.pos={x:n.x+sx*(reach+RUSH.starReach-.5),z:n.z+sz*(reach+RUSH.starReach-.5)};frame(m,.05);assert.equal(m.g.found.has(n.id),true,'magneten når längre');
});

test('gåva: glöggpausen fryser klockan till nästa paket men inte nivåerna',()=>{
  const c=started();c.rush.grant('pause',c.pos);const left=c.g.tempo.left,lvl=c.g.tempo.levelClock;
  play(c,3,null);assert.equal(c.g.tempo.left,left,'klockan står still');assert.ok(c.g.tempo.levelClock>lvl+2.9,'nivåtiden går');
  play(c,5,null);assert.ok(c.g.tempo.left<left,'när pausen är slut går klockan igen');
});

test('gåva: julklockan lägger fem sekunder på klockan, även om den kommer mellan två mål',()=>{
  const c=started(),t=c.g.tempo,left=t.left,dl=t.deadline;
  c.rush.grant('clock',c.pos);assert.equal(t.left,left+RUSH.clockSeconds);assert.equal(t.deadline,dl+RUSH.clockSeconds);
  // Ingen aktuell tid att lägga på: tiden sparas till nästa mål.
  const d=started();d.g.tempo.target=null;d.g.tempo.needTarget=true;d.rush.grant('clock',d.pos);assert.equal(d.rush.pendingClock,RUSH.clockSeconds);
  const fresh=d.g.tempo.deadline;frame(d,.02);assert.ok(d.g.tempo.target);assert.equal(d.rush.pendingClock,0);assert.ok(d.g.tempo.left>RUSH.clockSeconds,'extra tid på nästa mål: '+d.g.tempo.left.toFixed(1));void fresh;
});

test('gåva: pepparkaksskölden räddar ett liv en gång och ger fem sekunder till',()=>{
  const c=started(),t=c.g.tempo;c.rush.grant('shield',c.pos);assert.equal(c.rush.shield,1);
  // Låt klockan gå ut: skölden tar emot.
  play(c,t.left+.5,null);
  assert.equal(t.lives,3,'inget liv tappades');assert.equal(c.rush.shield,0);assert.equal(ofType(c,'rush-shield').length,1);assert.equal(ofType(c,'rush-miss').length,0);
  // Utan sköld förloras livet som vanligt.
  play(c,t.left+.8,null);assert.equal(t.lives,2);assert.equal(ofType(c,'rush-miss').length,1);
  // Högst två sköldar åt gången.
  c.rush.grant('shield',c.pos);c.rush.grant('shield',c.pos);c.rush.grant('shield',c.pos);assert.equal(c.rush.shield,RUSH.shieldMax);
});

test('gåva: tomteblosset tar alla paket i en rak linje framför spelaren, och ett paket i blosset utlöser inget nytt',()=>{
  const c=started(),k=c.rush.list[0],dir={x:k.pearl.hx,z:k.pearl.hz};
  c.g.lastForward={...dir};
  const ahead=c.rush.list.filter(p=>{const dx=p.x-c.pos.x,dz=p.z-c.pos.z;return dx*dir.x+dz*dir.z>0&&dx*dir.x+dz*dir.z<=POWER.stripLength&&Math.abs(dx*dir.z-dz*dir.x)<=POWER.stripWidth;});
  assert.ok(ahead.length>=2,'det finns paket framför: '+ahead.length);
  const n=c.rush.grant('sparkler',c.pos);c.events.push(...c.rush.drain());
  assert.equal(n,Math.min(ahead.length,POWER.stripMax));
  assert.equal(ofType(c,'rush-pick').length,n);assert.ok(ofType(c,'rush-pick').every(e=>e.blast));
  for(const p of ahead.slice(0,n))assert.ok(c.g.found.has(p.id));
  // Ett guldpaket som tas av blosset ger sin gåva men aldrig ett nytt bloss (annars kunde det rulla utan slut).
  const d=started();const bonus=d.rush.list.find(p=>p.kind==='bonus');
  if(bonus){bonus.gift='sparkler';d.g.lastForward={x:0,z:-1};const before=d.rush.gifts;d.rush.take(bonus,d.pos,{blast:true});d.events.push(...d.rush.drain());assert.equal(d.rush.gifts,before+1);assert.equal(ofType(d,'rush-gift').at(-1).count,0);}
  else assert.fail('banan saknar guldpaket i början (förväntat: var sjätte pärla)');
});

test('banan: pärlor man sprungit förbi försvinner, banan följer med långt bort och inget paket ligger kvar efter en teleport',()=>{
  const c=started(),first=c.rush.list[0].id;
  // Gå en bit framåt längs banan: passerade pärlor tas bort utan att kosta något liv.
  play(c,25);assert.equal(c.g.tempo.lives,3);
  assert.ok(c.rush.list.every(k=>c.g.itemById.has(k.id)),'bara levande pärlor visas');
  // Hamnar spelaren långt från banan (till exempel efter en bussresa) börjar banan om vid spelaren.
  const far={x:c.pos.x+420,z:c.pos.z+80};c.pos=far;calm(c);
  for(let i=0;i<14*4;i++)frame(c,.25,null);
  const t=c.g.tempo.target;assert.ok(t,'nytt mål');assert.ok(Math.hypot(t.x-far.x,t.z-far.z)<TEMPO_COURSE.maxGap+1,'målet ligger nära: '+Math.round(Math.hypot(t.x-far.x,t.z-far.z)));
  assert.ok(!c.g.itemById.has(first),'gamla banan är borta');
  assert.ok(c.rush.list.length>=6);
});

test('vyn och kartan: nära paket, guldpaket och målet nås via samma frågor som jaktens, och objective pekar bara när paketet är långt bort',()=>{
  const c=started(),out=[];
  const near=c.rush.nearby(c.pos,90,26,out);assert.ok(near.length>=3&&near.length<=26);
  for(let i=1;i<near.length;i++)assert.ok(near[i]._d>=near[i-1]._d,'sorterade efter avstånd');
  assert.ok(near.every(k=>k.id&&Number.isFinite(k.x)&&Number.isFinite(k.z)&&(k.kind==='regular'||k.kind==='bonus')&&Number.isFinite(k.cluster)));
  assert.ok(c.rush.nearby(c.pos,90,3,out).length<=3);
  const tg=c.rush.target(c.pos),far={...tg,distance:50};void far;
  const o=c.rush.objective(c.pos);
  if(tg.distance>16)assert.equal(o.kind,'xmas');else assert.equal(o.kind,'wait');
  const farOff={x:tg.x+40,z:tg.z};assert.equal(c.rush.objective(farOff).kind,'xmas');
  const near2={x:tg.x+3,z:tg.z};assert.equal(c.rush.objective(near2).kind,'wait');
  const gp=c.rush.giftPackages(c.pos,400,4,[]);assert.ok(gp.length<=4&&gp.every(k=>k.kind==='bonus'));
  const cv=c.rush.comboView();assert.equal(cv.phase,'collect');assert.equal(cv.windowSec,COMBO.window);
  const s=c.rush.snapshot();assert.equal(s.lives,3);assert.equal(s.maxLives,3);assert.equal(s.name,'JULMYS');assert.ok(s.ratio>.9&&s.ratio<=1);assert.equal(s.urgent,false);assert.ok(s.packages>=10);
  // Utanför en körning finns inget att visa.
  const idle=mk();assert.equal(idle.rush.nearby(idle.pos,90,26,[]).length,0);assert.equal(idle.rush.target(idle.pos),null);assert.equal(idle.rush.objective(idle.pos),null);
});

test('klockan blir brådskande när under 30 % återstår, och ny körning börjar om från noll',()=>{
  const c=started(),t=c.g.tempo;
  play(c,t.left*.75,null);assert.equal(c.rush.snapshot().urgent,true);
  play(c,200,null);assert.equal(c.rush.state,'over');
  c.rush.start();c.pos={...START};c.events.length=0;frame(c,.1);
  const s=c.rush.snapshot();assert.equal(s.level,1);assert.equal(s.lives,3);assert.equal(s.score,0);assert.equal(s.picked,0);assert.equal(s.chain,0);assert.equal(s.shield,0);assert.equal(s.state,'running');
  assert.equal(c.rush.result,null);assert.equal(c.g.fun.power.speedMul(),1);
});

test('felsäkerhet: steg före start, efter slutet och med orimlig tid gör ingenting',()=>{
  const c=mk();c.rush.step(.1,c.pos,null,0);assert.equal(c.rush.state,'idle');
  c.rush.start();c.rush.step(-1,c.pos,null,0);c.rush.step(NaN,c.pos,null,0);assert.equal(c.rush.state,'starting');
  frame(c,.1);assert.equal(c.rush.state,'running');
  c.rush.take({id:'tp:finns-inte',x:0,z:0,kind:'regular',pearl:{id:'tp:finns-inte',x:0,z:0}},c.pos);
  // Ett paket kan inte tas två gånger även om take anropas direkt.
  const k=c.rush.list[0];c.rush.take(k,c.pos);const n=c.g.tempo.picked;assert.equal(c.rush.take(k,c.pos),null);assert.equal(c.g.tempo.picked,n);
});

test('sparning: nivån följer med rekordet, gamla sparfiler utan nivå läses som 0 och orimliga värden begränsas',()=>{
  assert.ok(STAMPS.some(s=>s.id==='julrush'&&s.label&&s.sub),'julstämpeln finns i listan');
  const m=new Map(),store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};
  const a=new XmasSave(store);assert.equal(a.record('julrush',{points:900,seconds:70,packages:41,bonus:7,level:6}),false);
  const b=new XmasSave(store);assert.deepEqual(b.state.records.julrush,{points:900,seconds:70,packages:41,bonus:7,level:6});
  assert.equal(b.record('julrush',{points:1200,seconds:80,packages:50,bonus:9,level:7}),true);assert.equal(b.state.records.julrush.level,7);
  assert.equal(b.record('julrush',{points:100,seconds:20,packages:5,bonus:0,level:2}),false);assert.equal(b.state.records.julrush.points,1200,'sämre körning ändrar inte rekordet');
  const old=sanitizeSave({v:1,records:{intro:{points:500,seconds:60,packages:20,bonus:1}}});assert.equal(old.records.intro.level,0);
  const bad=sanitizeSave({v:1,records:{julrush:{points:5,seconds:1,packages:1,bonus:1,level:150}}});assert.equal(bad.records.julrush.level,99,'Maraton räknar vidare efter tempo 12, men inte över 99');
  const fine=sanitizeSave({v:1,records:{julrush:{points:5,seconds:1,packages:1,bonus:1,level:27}}});assert.equal(fine.records.julrush.level,27);
  const neg=sanitizeSave({v:1,records:{julrush:{points:5,seconds:1,packages:1,bonus:1,level:-3}}});assert.equal(neg.records.julrush.level,0);
  assert.equal(a.stamp('julrush'),true);assert.equal(a.stamp('julrush'),false);assert.equal(a.stampTotal(),STAMPS.length);
});

test('en lång körning (över hundra paket): plockade paket dyker aldrig upp igen och banan växer inte i det oändliga',()=>{
  const c=started(),taken=new Set();let maxPearls=0,maxList=0,ghost=0,frames=0;
  // Tempo 12 efter 165 s; farten är då 1,9× och paketen ligger 28 m isär, så 260 s ger gott om paket. Boten är lika snabb som spelet kräver.
  for(let i=0;i<260*60&&c.rush.state==='running';i++){
    frame(c,1/60,'target');frames++;
    for(const e of c.events.splice(0))if(e.type==='rush-pick')taken.add(e.id);
    c.rush.sync();for(const k of c.rush.list)if(taken.has(k.id))ghost++; // listan efter bildrutan: inget plockat paket får finnas kvar (vare sig via found eller pruneDynamic)
    maxPearls=Math.max(maxPearls,c.g.course?.pearls.length||0);maxList=Math.max(maxList,c.rush.list.length);
  }
  assert.equal(c.rush.state,'running','boten höll sig vid liv hela vägen');
  assert.ok(taken.size>=100,'plockade '+taken.size+' paket på '+(frames/60).toFixed(0)+' s');
  assert.equal(ghost,0,'ett plockat paket syntes igen');
  assert.ok(maxPearls<=140,'banans lista hålls kort: '+maxPearls);assert.ok(maxList<=60,'synliga paket: '+maxList);
  assert.ok(c.g.items.length<=100&&c.g.dyn.length<=100,'journey håller högst ~90 pärlor: '+c.g.items.length);
  assert.equal(c.g.tempo.level,TEMPO.levels);assert.equal(c.g.tempo.lives,3);
  // Och målet pekar alltid på ett paket som finns kvar.
  const tg=c.g.tempo.target;assert.ok(tg&&c.g.itemById.has(tg.id)&&!c.g.found.has(tg.id));
});

test('journeys rensning av plockade pärlor (pruneDynamic): en pärla som tagits bort ur itemById visas inte igen, rensas ur banan och kan inte tas två gånger',()=>{
  const c=started(),k=c.rush.list[0];
  c.pos={x:k.x,z:k.z};frame(c,.05);assert.ok(c.g.found.has(k.id),'paketet togs');
  // Så som pruneDynamic lämnar det: borta ur found, items, dyn och itemById, men kvar i course.pearls.
  c.g.found.delete(k.id);c.g.itemById.delete(k.id);c.g.items.splice(c.g.items.indexOf(k.pearl),1);c.g.dyn.splice(c.g.dyn.indexOf(k.pearl),1);
  assert.ok(c.g.course.pearls.includes(k.pearl));
  c.rush.sync();
  assert.ok(!c.rush.list.some(x=>x.id===k.id),'inte i listan');assert.ok(!c.g.course.pearls.includes(k.pearl),'rensat ur banan');
  assert.equal(c.rush.take(k,c.pos),null,'omslaget minns att paketet är taget');
  assert.equal(c.rush.nearby(c.pos,50,26,[]).some(x=>x.id===k.id),false);
});

test('krokarna i grundspelets filer finns kvar (en sammanslagning från main får inte tappa dem)',()=>{
  const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
  // journey-view.js: termoskort, cyanfyr och radarprickar ritas inte medan JulRushen går (den ritar sina egna paket)
  assert.ok((read('journey-view.js').match(/journey\.xmas\?\.rushMode/g)||[]).length>=4,'journey-view.js ska ha fyra villkor på rushMode');
  // app.js: julmusiken följer tempot och rush-stämningen ligger kvar
  const app=read('app.js');assert.match(app,/function musicTempo\(rate\)\{XMUSIC\.setRate\(rate\)/);assert.match(app,/m==='eerie'\|\|m==='rush'/);
  // index.html: knapparna i startvyn och fortsättningsmenyn, och spelet kopplar dem
  const html=read('index.html'),ui=read('xmas/xmas-ui.js');
  for(const id of ['xmasRushStart','xmasRushGo','xmasRushStartNote','xmasRushGoNote']){assert.ok(html.includes('id="'+id+'"'),id+' finns i index.html');}
  assert.ok(ui.includes("on('xmasRushStart'")&&ui.includes("on('xmasRushGo'"));
  // Grundspelets egna tempo-händelser hanteras av last-round.js och ska inte röras av julen: inga rush-hanterare där.
  assert.ok(!/rush-(start|pick|gift|level|miss|over)/.test(read('last-round.js')),'last-round.js känner inte till JulRushens händelser');
  // Vägledningen, nivåerna, topplistan och utmaningarna: en rad i last-round.js döljer grundspelets små pilar för julens mål (quiet), tre paneler ligger i panellistan och finns i index.html
  const lr=read('last-round.js');
  assert.match(lr,/destination\.kind!=='wait'&&!destination\.quiet&&/,'updateRoute ritar inga pilar för julens mål (quiet)');
  for(const id of ['xmas-rush','xmas-board','xmas-challenge']){assert.ok(lr.includes("'"+id+"'"),id+' finns i setPanel-listan');assert.ok(html.includes('id="round-'+id+'"'),'round-'+id+' finns i index.html');}
  for(const id of ['xmasRushGrid','xmasRushPlay','xmasRushMarathon','xmasBoardList','xmasBoardName','xmasBoardLink','xmasBoardShare','xmasBoardCopy','xmasChallengeGo','xmasChallengeSave','xmasChallengeSkip','xmasResultShare'])assert.ok(html.includes('id="'+id+'"'),id+' finns i index.html');
  assert.ok(/objective:p=>.*quiet:true/.test(read('xmas/xmas-boot.js')),'xmas-boot.js markerar julens mål som quiet');
  // Turbon: rushen slår på den (klockan är räknad på den) via en krok i last-round.js som inte visar något meddelande och som ger tillbaka det tidigare valet, och spelarens eget val återställs när man lämnar rushen
  assert.match(lr,/setTurbo:on=>\{const was=turbo;if\(typeof on==='boolean'&&on!==turbo\)\{turbo=on;renderTurbo\(\);\}return was;\}/,'last-round.js har kroken setTurbo');
  const boot=read('xmas/xmas-boot.js');assert.match(boot,/ctx\.setTurbo\?\.\(true\)/);assert.match(boot,/function restoreTurbo\(\)/);assert.ok((boot.match(/restoreTurbo\(\)/g)||[]).length>=3,'återställs när man lämnar rushen');assert.match(boot,/ctx\.setTurbo\?\.\(\)===false/,'ett missat paket säger att turbon är av');assert.match(boot,/SLÅ PÅ TURBON/);
  // Kungsgatan 14, 16 och 18: fasadmodulerna är orörda av JulRushen (inga imports av julkod).
  for(const f of ['kungsgatan-reference.mjs','photo-reference-pass3.mjs','residenset-facade.mjs','opera-facade.mjs','innerstad-reference.mjs'])assert.ok(!/xmas|JulRush/i.test(read(f).replace(/\?v=[^'"\s)]+/g,'')),f+' är orörd');
});

// ── Fler gåvor och sidopaket (magnet, tomtespöke, kryddbomb, paketregn) ────────────────────────────────────────────────────────────
let plainN=0;
// Lägger ett eget, vanligt paket (utan gåva) på banan, på ett ställe man kan stå och se: samma slags post som banans egna pärlor.
function plain(c,x,z,{course=900}={}){
  let id;do{id='tp:prov'+(++plainN);}while(bearsGift(id,c.g.fun.day));
  const it={id,x,z,dyn:true,course:course+plainN,hx:0,hz:-1};
  c.g.course.pearls.push(it);c.g.items.push(it);c.g.itemById.set(id,it);c.rush.sync();
  return c.rush.pk.get(id);
}
const sleepFreeze=c=>{c.rush.timers.pause=9999;}; // klockan står still så att inget liv tappas medan provet står och väntar

test('alla femton gåvor går att dela ut: var och en ger sin händelse, och de som varar syns som brickor',()=>{
  const c=started();sleepFreeze(c);c.events.length=0;
  for(const k of GIFT_KINDS)c.rush.grant(k,c.pos);
  c.events.push(...c.rush.drain());
  assert.deepEqual(ofType(c,'rush-gift').map(e=>e.kind),GIFT_KINDS,'en händelse per gåva, i ordning');
  for(const e of ofType(c,'rush-gift'))assert.equal(e.label,GIFTS[e.kind].label);
  const chips=c.rush.powers().map(p=>p.kind);
  for(const k of ['sleigh','magnet','ghost','star','pause','golden','shield','glogg','kaka','wind','skates'])assert.ok(chips.includes(k),'bricka för '+k);
  assert.ok(c.rush.powers().every(p=>p.label),'varje bricka har en text');
  assert.equal(c.rush.snapshot().magnet,true);assert.equal(c.rush.snapshot().ghost,true);
  assert.equal(GIFTS.magnet.seconds,10);assert.equal(GIFTS.ghost.seconds,9);
});

test('sidopaket: var fjärde pärla får ett sidopaket med gåva på en fri plats 6–10,5 m från banan, högst fem åt gången, och inget rör klockan eller målet',()=>{
  const c=started(),seen=new Map();let maxAlive=0;
  for(let i=0;i<50*60&&c.rush.state==='running';i++){
    frame(c,1/60,'target');
    for(const k of c.rush.side)if(!seen.has(k.id))seen.set(k.id,{...k});
    maxAlive=Math.max(maxAlive,c.rush.side.filter(k=>!k.rain).length);
  }
  for(const [id,k] of [...seen])if(k.rain)seen.delete(id); // paketregnets paket är inga sidopaket
  assert.ok(seen.size>=4,'sidopaket syntes under en halv minut: '+seen.size);assert.ok(maxAlive<=RUSH.sideMax,'högst '+RUSH.sideMax+' åt gången: '+maxAlive);
  for(const k of seen.values()){
    assert.equal(k.kind,'bonus');assert.ok(GIFT_KINDS.includes(k.gift),'har en gåva: '+k.gift);assert.ok(k.side&&!k.rain);assert.match(k.id,/^sd:tp:/);
    assert.ok(c.g.freeSpot(k.x,k.z),'fri plats '+k.id);assert.equal(c.g.itemById.has(k.id),false,'sidopaket är inga pärlor i journey');
    assert.equal(k.gift,giftFor('sd|'+k.id.slice(3)),'samma id ger samma gåva');
  }
  assert.equal(new Set([...seen.keys()]).size,seen.size,'unika id');
  // Avståndet till pärlan de hör till (id:t bär pärlans id) är en avstickare på 6–10,5 m. Pärlan finns kanske inte kvar, så vi mäter den första bilden där båda syntes.
  const c2=started();let measured=0;
  for(let i=0;i<50*60&&c2.rush.state==='running'&&measured<3;i++){
    frame(c2,1/60,'target');
    for(const k of c2.rush.side){if(k.rain)continue;const src=c2.g.course?.pearls.find(x=>'sd:'+x.id===k.id);if(src){const d=Math.hypot(k.x-src.x,k.z-src.z);assert.ok(d>=5.9&&d<=10.6,'avstickare '+d.toFixed(1)+' m');measured++;}}
  }
  assert.ok(measured>=1,'minst ett sidopaket mättes mot sin pärla');
});

test('sidopaket: att ta ett ger poäng, kedja och gåva men räknas inte mot målet och rör inte klockan eller nästa mål',()=>{
  const c=started();sleepFreeze(c);
  until(c,()=>c.rush.side.some(k=>!k.rain),60);
  const sp=c.rush.side.find(k=>!k.rain);assert.ok(sp,'ett sidopaket lades ut');
  const t=c.g.tempo,tgt=t.target.id,left=t.left,deadline=t.deadline,picked=t.picked,score=t.score,chain=c.rush.chain,gifts=c.rush.gifts;c.events.length=0;
  const e=c.rush.take(sp,c.pos);
  assert.ok(e&&e.side===true&&e.gold===true&&e.kind==='bonus');
  assert.equal(e.points,Math.round(PACKAGE_POINTS.bonus*tempoPoints(t.level)),'guldpaketets poäng × nivåfaktorn, utan flytbonus');
  assert.equal(t.score,score+e.points);assert.equal(t.picked,picked,'räknas inte som ett plockat paket');
  assert.equal(t.target.id,tgt,'nästa mål är detsamma');assert.equal(t.left,left);assert.equal(t.deadline,deadline,'klockan är orörd');
  assert.equal(c.rush.chain,chain+1);assert.equal(c.rush.gifts,gifts+1);assert.equal(c.rush.sideTaken,1);
  assert.equal(c.rush.take(sp,c.pos),null,'inte två gånger');assert.ok(!c.rush.side.includes(sp)||sp.collected);
  frame(c,.02);assert.ok(!c.rush.side.some(k=>k.id===sp.id),'ett taget sidopaket försvinner');
  // Och på riktigt: gå dit (en avstickare) och ta det.
  const d=started();sleepFreeze(d);until(d,()=>d.rush.side.some(k=>!k.rain),60);
  const s2=d.rush.side.find(k=>!k.rain);const picked2=d.g.tempo.picked;
  until(d,()=>s2.collected,30,{x:s2.x,z:s2.z});assert.equal(s2.collected,true,'gick att nå');
  assert.ok(d.events.some(x=>x.type==='rush-pick'&&x.id===s2.id&&x.side),'händelse');assert.ok(d.g.tempo.picked-picked2<=2,'bara banans paket på vägen räknas');
});

test('sidopaket: gamla försvinner efter 40 s och allt städas bort med körningen',()=>{
  const c=started();sleepFreeze(c);until(c,()=>c.rush.side.some(k=>!k.rain),60);
  const sp=c.rush.side.find(k=>!k.rain);play(c,RUSH.sideLife+1,null);
  assert.ok(!c.rush.side.some(k=>k.id===sp.id),'borta efter '+RUSH.sideLife+' s');
  const d=started();sleepFreeze(d);until(d,()=>d.rush.side.length>0,60);d.rush.grant('rain',d.pos);assert.ok(d.rush.side.length>0);
  d.rush.quit();assert.equal(d.rush.side.length,0);assert.equal(d.rush.pulled.length,0);assert.equal(d.rush.spirit.active,false);assert.equal(d.rush.sideSeen.size,0);
});

test('gåva: julmagneten drar in paket inom 13 m med fri sikt och tar dem efter en kvarts sekund, men inte genom en vägg eller längre bort',()=>{
  const c=started();sleepFreeze(c);
  const a=plain(c,c.pos.x+9,c.pos.z),b=plain(c,c.pos.x-8,c.pos.z+3),far=plain(c,c.pos.x+19,c.pos.z+2);
  for(const k of [a,b,far])assert.ok(c.g.freeSpot(k.x,k.z),'fri plats '+k.id);
  assert.ok(Math.hypot(a.x-c.pos.x,a.z-c.pos.z)<RUSH.magnetReach&&Math.hypot(far.x-c.pos.x,far.z-c.pos.z)>RUSH.magnetReach);
  frame(c,.02);assert.equal(a.collected,false,'utan magnet tas inget på 9 m');
  c.rush.grant('magnet',c.pos);c.events.length=0;
  frame(c,.02);assert.ok(a.pull>0&&b.pull>0,'båda dras');assert.equal(far.pull,0,'det tredje ligger för långt bort');
  frame(c,.1);const k=a.pull;assert.ok(k>.3&&k<1&&a.vx<a.x&&a.vx>c.pos.x,'på väg mot spelaren: '+a.vx.toFixed(1)+' mellan '+c.pos.x.toFixed(1)+' och '+a.x.toFixed(1));
  play(c,.4,null);
  assert.ok(a.collected&&b.collected,'framme och tagna');assert.equal(far.collected,false);
  const picks=ofType(c,'rush-pick').filter(e=>e.by==='magnet'),ids=picks.map(e=>e.id);assert.ok(ids.includes(a.id)&&ids.includes(b.id)&&!ids.includes(far.id),'magneten tog de två provpaketen (och eventuella banpaket inom fältet): '+ids.join(','));
  // magneten tar slut efter tio sekunder och sedan dras inget mer
  play(c,10.2,null);assert.equal(c.rush.timers.magnet,0);const far2=plain(c,c.pos.x+6,c.pos.z);frame(c,.05);assert.equal(far2.pull,0,'ingen dragning efter att magneten tagit slut');
  // Vägg mellan spelaren och paketet: inom fältet men utan fri sikt.
  const w=mk({wall:(x,z)=>x>-18.2&&x<-16.4&&z>29&&z<41});w.rush.start();w.pos={x:-19,z:35};frame(w,.1);sleepFreeze(w);
  const behind=plain(w,-13.6,35);assert.ok(Math.hypot(behind.x+19,behind.z-35)<RUSH.magnetReach);
  w.rush.grant('magnet',w.pos);play(w,1,null);assert.equal(behind.pull,0,'väggen stoppar magneten');assert.equal(behind.collected,false);
});

test('gåva: tomtespöket plockar ett paket var 0,8:e sekund inom 46 m i nio sekunder, och sedan slutar det',()=>{
  const c=started();sleepFreeze(c);
  const ks=[];for(let i=0;i<14;i++)ks.push(plain(c,c.pos.x-20+(i%7)*7,c.pos.z+4+Math.floor(i/7)*5));
  assert.ok(ks.every(k=>Math.hypot(k.x-c.pos.x,k.z-c.pos.z)<RUSH.ghostRange),'alla inom 46 m');
  c.rush.grant('ghost',c.pos);assert.equal(c.rush.spirit.active,true);c.events.length=0;
  const times=[];for(let i=0;i<Math.round(9*60);i++){frame(c,1/60,null);for(const e of c.events.splice(0))if(e.type==='rush-pick'&&e.by==='ghost')times.push(+(c.rush.time).toFixed(2));}
  assert.ok(times.length>=8&&times.length<=12,'spöket tog '+times.length+' paket på nio sekunder');
  for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=RUSH.ghostEvery-.1&&times[i]-times[i-1]<=RUSH.ghostEvery+.2,'jämn takt: '+(times[i]-times[i-1]).toFixed(2));
  assert.ok(ks.filter(k=>k.collected).length===times.length||ks.filter(k=>k.collected).length>=times.length-3,'paketen som spöket tog är taget');
  play(c,1.5,null);assert.equal(c.rush.spirit.active,false,'spöket är borta när tiden gått ut');
  const n=ofType(c,'rush-pick').filter(e=>e.by==='ghost').length;play(c,2,null);assert.equal(ofType(c,'rush-pick').filter(e=>e.by==='ghost').length,n,'inga fler');
  // Bara inom 46 m: ett paket långt bort lämnas ifred.
  const d=started();sleepFreeze(d);const far=plain(d,d.pos.x+RUSH.ghostRange+14,d.pos.z);
  for(const k of d.rush.list)if(k!==far)k.collected=true; // allt annat är redan taget
  d.rush.grant('ghost',d.pos);play(d,4,null);assert.equal(far.collected,false,'för långt bort');
});

test('gåva: kryddbomben tar alla paket inom 24 m (högst 14), närmast först, och paketen i bomben utlöser ingen ny bomb, bloss eller regn',()=>{
  const c=started();sleepFreeze(c);
  for(const k of c.rush.list)k.collected=true;c.rush.list.length=0; // en ren yta
  const inside=[];for(let i=0;i<18;i++)inside.push(plain(c,c.pos.x-12+i*1.4,c.pos.z+((i%2)?3:-3)));
  const out=plain(c,c.pos.x+RUSH.bombRadius+6,c.pos.z);
  for(const k of inside)assert.ok(Math.hypot(k.x-c.pos.x,k.z-c.pos.z)<=RUSH.bombRadius);
  // tre av paketen bär gåvor som annars skulle fortsätta kedjan
  inside[0].gift='bomb';inside[0].kind='bonus';inside[1].gift='rain';inside[1].kind='bonus';inside[2].gift='sparkler';inside[2].kind='bonus';
  c.events.length=0;const n=c.rush.grant('bomb',c.pos);c.events.push(...c.rush.drain());
  assert.equal(n,RUSH.bombMax,'högst '+RUSH.bombMax);
  const picks=ofType(c,'rush-pick');assert.equal(picks.length,RUSH.bombMax);assert.ok(picks.every(e=>e.blast&&e.by==='bomb'));
  assert.equal(out.collected,false,'utanför 24 m');
  const gifts=ofType(c,'rush-gift').map(e=>e.kind);assert.ok(gifts.filter(k=>k==='bomb').length===1,'bara den första bomben (själva gåvan)');
  assert.equal(c.rush.side.filter(k=>k.rain).length,0,'regnet i bomben utlöstes inte');
  assert.ok(ofType(c,'rush-gift').filter(e=>e.kind!=='bomb').every(e=>e.count===0),'bloss och regn i bomben gör inget');
  assert.equal(c.g.tempo.picked,RUSH.bombMax,'bombens paket räknas mot målet som vanligt');
});

test('gåva: paketregnet lägger åtta extra paket på fria platser runt spelaren, de ger poäng utan att räknas mot målet, och de försvinner efter tolv sekunder',()=>{
  const c=started();sleepFreeze(c);
  const n=c.rush.grant('rain',c.pos);assert.ok(n>=5&&n<=RUSH.rainCount,'regnet: '+n);
  const rain=c.rush.side.filter(k=>k.rain);assert.equal(rain.length,n);
  for(const k of rain){
    const d=Math.hypot(k.x-c.pos.x,k.z-c.pos.z);assert.ok(d>=RUSH.rainMin*.49&&d<=RUSH.rainMax+.1,'avstånd '+d.toFixed(1));
    assert.ok(c.g.freeSpot(k.x,k.z));assert.equal(k.kind,'regular');assert.equal(k.gift,null);assert.match(k.id,/^rn:/);
  }
  assert.equal(new Set(rain.map(k=>k.id)).size,n);
  // Ger poäng som vanliga paket (kombo och nivåfaktor) men inte mot målet.
  const t=c.g.tempo,picked=t.picked,score=t.score,left=t.left;c.events.length=0;
  const e=c.rush.take(rain[0],c.pos);assert.equal(e.rain,true);assert.equal(e.side,true);
  assert.equal(e.points,Math.round(PACKAGE_POINTS.regular*comboMultFor(e.chain)*tempoPoints(t.level)),'10 poäng × kedja × nivåfaktor');assert.equal(t.picked,picked);assert.equal(t.left,left);
  // Magnet + regn: allt dras in.
  c.rush.grant('magnet',c.pos);play(c,1.2,null);assert.ok(rain.filter(k=>k.collected).length>=Math.min(n,4),'magneten drar in regnet');
  // Resten försvinner efter tolv sekunder.
  const left2=c.rush.side.filter(k=>k.rain&&!k.collected).length;play(c,RUSH.rainLife+.5,null);assert.equal(c.rush.side.filter(k=>k.rain).length,0,'borta efter tolv sekunder (var '+left2+')');
  // Regnpaket nämns inte som sidopaket i vyn: de är vanliga paket.
  assert.equal(c.rush.snapshot().rain,0);
});
const comboMultFor=chain=>COMBO.tiers.reduce((m,t)=>chain>=t.chain?t.mult:m,1);

test('gåvor och sidopaket i vyn: nearby och giftPackages tar med dem, och de dras visuellt mot spelaren medan magneten drar',()=>{
  const c=started();sleepFreeze(c);until(c,()=>c.rush.side.some(k=>!k.rain),60);
  const sp=c.rush.side.find(k=>!k.rain),out=[];
  assert.ok(c.rush.nearby(c.pos,400,60,out).some(k=>k.id===sp.id),'sidopaketet finns bland de närliggande');
  assert.ok(c.rush.giftPackages(c.pos,400,40,[]).some(k=>k.id===sp.id),'och bland guldpaketen (ljusstråle)');
  assert.ok(c.rush.nearby(c.pos,400,60,out).every(k=>Number.isFinite(k.vx)&&Number.isFinite(k.vz)),'varje paket har en ritposition');
  const near=plain(c,c.pos.x+7,c.pos.z);c.rush.grant('magnet',c.pos);frame(c,.02);frame(c,.1);
  assert.ok(near.vx<near.x,'ritpositionen glider mot spelaren medan paketet dras in');assert.equal(near.x,c.pos.x+7,'den riktiga platsen ändras inte');
});

// ── Tolv rusher: fast tempo, mål, stjärnor, upplåsning och serier ────────────────────────────────────────────────────────────────────
const rushed=(def,opts={})=>{const c=mk();c.rush.start({def,...opts});frame(c,.1);return c;};

test('en rush har sitt tempo från första sekunden och behåller det, med hjärtan som man tog med sig',()=>{
  const def=RUSHES[3],c=mk();c.rush.start({def,hearts:2,streak:1});frame(c,.1);
  assert.equal(c.g.tempo.level,4);assert.equal(c.g.tempo.lives,2);assert.equal(c.g.tempo.speedMul(),tempoSpeed(4));
  const st=ofType(c,'rush-start')[0];assert.deepEqual([st.level,st.lives,st.name,st.n,st.streak],[4,2,'SNÖYRA',4,1]);assert.deepEqual(st.goal,def.goal);
  sleepFreeze(c); // klockan till nästa paket står still och spelaren står still, men tiden går: tempot ska ändå aldrig höjas
  play(c,TEMPO.levelSeconds*2.2,null);
  assert.equal(ofType(c,'rush-level').length,0,'inga tempohöjningar i en rush');assert.equal(c.g.tempo.level,4);assert.ok(c.g.tempo.levelClock<.1,'nivåklockan nollas före varje steg: '+c.g.tempo.levelClock);assert.equal(c.g.tempo.speedMul(),tempoSpeed(4));
  const s=c.rush.snapshot();assert.equal(s.n,4);assert.equal(s.name,'SNÖYRA');assert.equal(s.goal.kind,'points');assert.equal(s.level,4);
  // Banan följer tempot: täthet och klocka är rush 4:s, inte rush 1:s.
  const d=started(),e=rushed(RUSHES[7]);assert.ok(e.g.tempo.deadline<d.g.tempo.deadline+6,'klockorna är rimliga');
  const gap=c=>{const l=c.rush.list;return Math.hypot(l[1].x-l[0].x,l[1].z-l[0].z);};assert.ok(gap(e)>=gap(d)-.1,'paketen ligger glesare vid högre tempo: '+gap(e).toFixed(1)+' mot '+gap(d).toFixed(1));
  // Maraton (utan rush) stiger fortfarande var 15:e sekund.
  const m=started();play(m,TEMPO.levelSeconds+1);assert.equal(ofType(m,'rush-level').length,1);assert.equal(m.rush.snapshot().n,0);assert.equal(m.rush.snapshot().goal,null);
});

test('rush 1 (hämta 25 paket): målet nås, tre stjärnor utan tappade hjärtan, sparas och låser upp nästa rush',()=>{
  const def=RUSHES[0],c=rushed(def);
  until(c,()=>c.rush.state==='over',150);
  assert.equal(c.rush.state,'over');const over=ofType(c,'rush-over');assert.equal(over.length,1,'ett slut');
  const r=over[0].result,k=r.rush;
  assert.equal(k.cleared,true);assert.equal(k.stars,3,'inga hjärtan tappades');assert.equal(k.hearts,3);assert.equal(k.n,1);assert.equal(k.next,2);assert.equal(k.nextHearts,3);assert.equal(k.first,true);assert.equal(k.unlockedNext,true);assert.equal(k.done,false);
  assert.ok(r.collected>=def.goal.target&&r.collected<=def.goal.target+14,'plockade '+r.collected);assert.ok(r.points>0&&r.seconds<150);assert.equal(r.name,'JULMYS');assert.equal(k.bestBefore,null);
  assert.equal(c.save.state.rush.cleared,1);assert.equal(c.save.state.rush.stars[1],3);assert.equal(c.save.state.rush.best[1].points,r.points);assert.equal(c.save.state.rush.best[1].hearts,3);
  assert.equal(c.save.state.records.julrush,undefined,'Maratonrekordet är orört');assert.equal(c.save.state.totals.runs,1);assert.equal(r.stamp,false,'stämpeln delas ut först vid rush 5');
  assert.equal(c.g.tempo.running,false);assert.equal(c.rush.list.length,0);assert.equal(c.rush.side.length,0);
  const n=c.events.length;for(let i=0;i<60;i++)frame(c,1/60);assert.equal(c.events.length,n,'efter slutet händer inget mer');
  // Andra gången: bättre eller sämre poäng ger rekord bara om det är bättre, stjärnorna är de bästa hittills.
  assert.equal(c.save.recordRush(1,{points:r.points+100,seconds:30,packages:20,hearts:2,cleared:true}).record,true);assert.equal(c.save.state.rush.stars[1],3,'stjärnorna går aldrig ned');
  assert.equal(c.save.recordRush(1,{points:5,seconds:30,packages:20,hearts:1,cleared:true}).record,false);assert.equal(c.save.state.rush.best[1].points,r.points+100);
});

test('rush 2 (nå poängen): poäng från banan och från sidopaket räknas, paket gör det inte',()=>{
  const def=RUSHES[1],c=rushed(def);sleepFreeze(c);
  assert.equal(def.goal.kind,'points');c.g.tempo.score=def.goal.target-5;
  const k=c.rush.list.find(x=>x.kind==='regular');c.pos={x:k.x,z:k.z};frame(c,.05);
  const over=ofType(c,'rush-over');assert.equal(over.length,1,'ett plock över målet vinner');assert.equal(over[0].result.rush.cleared,true);assert.ok(over[0].result.points>=def.goal.target);
  // Ett sidopaket på målpoängen vinner också, men ett sidopaket mot ett paketmål ger inget paket.
  const d=rushed(RUSHES[0]);sleepFreeze(d);until(d,()=>d.rush.side.some(x=>!x.rain),60);
  const sp=d.rush.side.find(x=>!x.rain),picked=d.g.tempo.picked;d.rush.take(sp,d.pos);assert.equal(d.g.tempo.picked,picked);assert.equal(d.rush.state,'running','ett sidopaket klarar inte en paketrush');
  const e=rushed(def);sleepFreeze(e);e.g.tempo.score=def.goal.target-1;until(e,()=>e.rush.side.some(x=>!x.rain),60);
  if(e.rush.side.some(x=>!x.rain)){e.g.tempo.score=def.goal.target-1;const sp2=e.rush.side.find(x=>!x.rain);e.rush.take(sp2,e.pos);assert.equal(e.rush.state,'over','sidopaketets poäng nådde målet');}
});

test('att förlora: tre tappade hjärtan ger ingen stjärna, ingen sparning av nivån och ingen upplåsning',()=>{
  const c=rushed(RUSHES[2]);
  for(let i=0;i<3;i++){const k=c.rush.list.find(x=>!c.g.found.has(x.id));c.pos={x:k.x,z:k.z};frame(c,.3);}
  play(c,200,null);
  assert.equal(c.rush.state,'over');const r=ofType(c,'rush-over')[0].result,k=r.rush;
  assert.equal(k.cleared,false);assert.equal(k.stars,0);assert.equal(k.hearts,0);assert.equal(k.next,0);assert.equal(k.unlockedNext,false);assert.equal(k.streak,0);
  assert.equal(c.save.state.rush.cleared,0);assert.deepEqual(c.save.state.rush.best,{});assert.deepEqual(c.save.state.rush.stars,{});assert.equal(c.save.state.rush.bestStreak,0);
  assert.equal(c.save.state.totals.runs,1,'körningen räknas i summorna');assert.equal(c.save.state.records.julrush,undefined);assert.equal(r.stamp,false);
  // Att ge upp sparas inte heller som klarad.
  const d=rushed(RUSHES[0]);for(let i=0;i<2;i++){const k2=d.rush.list.find(x=>!d.g.found.has(x.id));d.pos={x:k2.x,z:k2.z};frame(d,.3);}
  const q=d.rush.quit();assert.equal(q.quit,true);assert.equal(q.rush.cleared,false);assert.equal(d.save.state.rush.cleared,0);
});

test('stjärnor = hjärtan kvar, och en serie tar med sig hjärtan och räknar rusher i rad',()=>{
  for(const hearts of [3,2,1]){
    const c=rushed(RUSHES[0],{hearts});sleepFreeze(c);c.g.tempo.picked=RUSHES[0].goal.target-1;
    const k=c.rush.list.find(x=>x.kind==='regular');c.pos={x:k.x,z:k.z};frame(c,.05);
    const r=ofType(c,'rush-over')[0].result.rush;assert.equal(r.stars,hearts);assert.equal(r.hearts,hearts);assert.equal(r.nextHearts,Math.min(3,hearts+1));assert.equal(c.save.state.rush.stars[1],hearts);
  }
  // En serie: rush 1 → 2 → 3 med hjärtan som följer med, och längsta serien sparas.
  const save=new XmasSave(storage());let hearts=3,streak=0,left=3;
  for(const n of [1,2,3]){
    const g=new CityJourney(nav,mall,portals,storage());g.rush.start('clean');g.drainEvents();g.items.length=0;g.treasures.length=0;g.secrets.length=0;g.itemById.clear();
    const rush=new XmasRush({journey:g,save});g.xmas={step:(dt,p,sw,sp)=>rush.step(dt,p,sw,sp),objective:p=>rush.objective(p)};
    const c={g,rush,save,pos:{...START},fwd:{x:0,z:-1},events:[],base:[]};
    rush.start({def:RUSHES[n-1],hearts,streak});frame(c,.1);assert.equal(g.tempo.lives,hearts);rush.timers.pause=9999;
    const def=RUSHES[n-1];if(def.goal.kind==='packages')g.tempo.picked=def.goal.target-1;else g.tempo.score=def.goal.target-1;
    g.tempo.lives=Math.max(1,left-(n===2?1:0)); // i rush 2 tappar man ett hjärta
    const k=rush.list.find(x=>x.kind==='regular');c.pos={x:k.x,z:k.z};frame(c,.05);
    const r=ofType(c,'rush-over')[0].result.rush;assert.equal(r.cleared,true);assert.equal(r.streak,streak+1);
    left=r.hearts;hearts=r.nextHearts;streak=r.streak;
  }
  assert.equal(save.state.rush.cleared,3);assert.equal(save.state.rush.bestStreak,3);assert.deepEqual([hearts,streak],[3,3],'hjärtat som tappades i rush 2 kom tillbaka');
});

test('rush 5 ger julstämpeln och rush 12 en egen: Tomtegalet',()=>{
  const win=n=>{const c=rushed(RUSHES[n-1]);sleepFreeze(c);const d=RUSHES[n-1];if(d.goal.kind==='packages')c.g.tempo.picked=d.goal.target-1;else c.g.tempo.score=d.goal.target-1;const k=c.rush.list.find(x=>x.kind==='regular');c.pos={x:k.x,z:k.z};frame(c,.05);return {c,r:ofType(c,'rush-over')[0].result};};
  const a=win(4);assert.equal(a.r.stamp,false);assert.equal(a.c.save.hasStamp('julrush'),false,'inte före rush 5');
  const b=win(5);assert.equal(b.r.stamp,true);assert.equal(b.r.stampId,'julrush');assert.equal(b.c.save.hasStamp('julrush'),true);assert.equal(b.c.save.hasStamp('julrush-12'),false);
  const z=win(12);assert.equal(z.r.stamp,true);assert.equal(z.r.stampId,'julrush-12');assert.equal(z.c.save.hasStamp('julrush'),true,'rush 12 ger också rush 5-stämpeln första gången');assert.equal(z.c.save.hasStamp('julrush-12'),true);
  assert.equal(z.r.rush.done,true);assert.equal(z.r.rush.next,13,'efter Rush 12 fortsätter det med övertid');assert.equal(z.r.rush.overtime,false);assert.ok(STAMPS.some(s=>s.id==='julrush-12'&&s.label==='TOMTEGALET'));
  // Samma stämpel delas inte ut två gånger.
  const again=win(5);assert.equal(again.r.stamp,true,'ny spelare, ny sparfil');assert.equal(again.c.save.stampCount(),1);
});

test('sparningen av nivåerna: gamla filer saknar dem, orimliga värden begränsas och en klarad rush aldrig är låst',()=>{
  const old=sanitizeSave({v:1,records:{}});assert.deepEqual(old.rush,{cleared:0,stars:{},best:{},bestStreak:0});assert.equal(old.name,'');assert.deepEqual(old.friends,[]);
  const bad=sanitizeSave({v:1,rush:{cleared:99,stars:{1:7,2:-3,3:2,99:3},best:{1:{points:1e12,seconds:-1,packages:5,hearts:9},4:{points:0},5:{points:700,seconds:40,packages:12,hearts:2}},bestStreak:500}});
  assert.equal(bad.rush.cleared,99,'Rush 13 och uppåt är övertid: högsta rush är 99');assert.deepEqual(bad.rush.stars,{1:3,3:2,99:3});assert.equal(bad.rush.best[1].points,9999999);assert.equal(bad.rush.best[1].hearts,3);assert.equal(bad.rush.best[4],undefined);assert.deepEqual(bad.rush.best[5],{points:700,seconds:40,packages:12,hearts:2});assert.equal(bad.rush.bestStreak,99);
  const low=sanitizeSave({v:1,rush:{cleared:0,best:{6:{points:100,seconds:10,packages:5,hearts:1}}}});assert.equal(low.rush.cleared,6,'har man ett resultat i rush 6 är rush 6 klarad');
  const m=new Map(),store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};
  const a=new XmasSave(store);assert.deepEqual(a.recordRush(1,{points:500,hearts:2,cleared:false}),{record:false,first:false,unlocked:false},'bara klarade rusher sparas');
  assert.deepEqual(a.recordRush(1,{points:500,seconds:40,packages:13,hearts:2,cleared:true}),{record:false,first:true,unlocked:true});
  assert.deepEqual(a.recordRush(1,{points:700,seconds:35,packages:13,hearts:3,cleared:true}),{record:true,first:false,unlocked:false});
  assert.equal(a.recordRush(0,{points:5,cleared:true}).first,false);assert.equal(a.recordRush(100,{points:5,cleared:true}).first,false);
  const b=new XmasSave(store);assert.equal(b.rush.cleared,1);assert.equal(b.rush.stars[1],3);assert.equal(b.rush.best[1].points,700);
  assert.deepEqual(b.profile(5),{name:'',cleared:1,stars:3,bests:{1:700},total:700,at:5});
  assert.equal(b.noteStreak(2),true);assert.equal(b.noteStreak(1),false);assert.equal(new XmasSave(store).rush.bestStreak,2);
  assert.equal(RUSH_COUNT,12);assert.ok(goalProgress(RUSHES[0],{picked:RUSHES[0].goal.target}).done);
});

test('övertid i sparningen: Rush 13 och uppåt sparas och låser upp nästa, och hur långt man kommit följer med',()=>{
  const m=new Map(),store={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};
  const a=new XmasSave(store);for(let n=1;n<=12;n++)a.recordRush(n,{points:100*n,seconds:30,packages:25,hearts:3,cleared:true});
  assert.equal(a.rush.cleared,12);
  assert.deepEqual(a.recordRush(13,{points:2000,seconds:50,packages:52,hearts:2,cleared:true}),{record:false,first:true,unlocked:true},'Rush 13 är den första övertidsrushen och låser upp Rush 14');
  assert.equal(a.rush.cleared,13);assert.equal(a.rush.stars[13],2);assert.equal(a.rush.best[13].points,2000);
  const b=new XmasSave(store);assert.equal(b.rush.cleared,13,'sparas');assert.equal(b.profile().cleared,13);
  assert.equal(a.recordRush(99,{points:9,seconds:1,packages:1,hearts:1,cleared:true}).unlocked,false,'efter Rush 99 finns ingen mer');
  // Profilen (topplistan och länken) bär bara de tolv namngivna rusherna, så att din summa går att jämföra med vännernas; hur långt du kommit syns i cleared.
  const p=a.profile(5);assert.equal(p.cleared,99);assert.deepEqual(Object.keys(p.bests).map(Number),[1,2,3,4,5,6,7,8,9,10,11,12]);assert.equal(p.total,100*(1+2+3+4+5+6+7+8+9+10+11+12));assert.equal(p.stars,36,'högst tre stjärnor per namngiven rush');
});

// ── 2.21.1-xmas.4: fler fartgåvor, trängre klocka, Maraton efter tempo 12 och övertid efter Rush 12 ─────────────────────────────────────────────────────
const takeOne=c=>{const k=c.rush.list.find(x=>x.kind==='regular'&&!c.g.found.has(x.id));c.pos={x:k.x,z:k.z};return frame(c,.05);};

test('fartgåvor: glögg ×1,5, pepparkaksraket ×3, medvind ×1,3 och skridskor ×1,25 går genom grundspelets fartfaktor, den starkaste gäller, renssläden multipliceras på och taket är ×4',()=>{
  const mul=k=>{const d=started();sleepFreeze(d);d.rush.grant(k,d.pos);return d.g.fun.power.speedMul();};
  assert.equal(started().g.fun.power.speedMul(),1);
  assert.equal(mul('glogg'),RUSH.boost.glogg);assert.equal(mul('kaka'),RUSH.boost.kaka);assert.equal(mul('wind'),RUSH.boost.wind);assert.equal(mul('skates'),RUSH.boost.skates);
  assert.deepEqual([RUSH.boost.glogg,RUSH.boost.kaka,RUSH.boost.wind,RUSH.boost.skates],[1.5,3,1.3,1.25]);assert.equal(mul('sleigh'),2,'renssläden är oförändrad');
  assert.equal(mul('magnet'),1,'gåvor som inte är fartgåvor ändrar inte farten');
  const d=started();sleepFreeze(d);for(const k of ['glogg','wind','skates'])d.rush.grant(k,d.pos);
  assert.equal(d.g.fun.power.speedMul(),1.5,'glögg + medvind + skridskor: bara den starkaste gäller');
  d.rush.grant('sleigh',d.pos);assert.equal(d.g.fun.power.speedMul(),3,'glögg ×1,5 × renssläde ×2');
  d.rush.grant('kaka',d.pos);assert.equal(d.g.fun.power.speedMul(),RUSH.speedCap,'raket ×3 × släde ×2 = 6, men taket är ×4');assert.equal(RUSH.speedCap,4);
  // Spelarens egen fart följer med (farten per bildruta är gångfarten × turbon × tempot × fartgåvorna).
  const e=started();sleepFreeze(e);const x0=e.pos.x,z0=e.pos.z;frame(e,1/60,{x:x0+100,z:z0});const plainStep=Math.hypot(e.pos.x-x0,e.pos.z-z0);
  const f=started();sleepFreeze(f);f.rush.grant('glogg',f.pos);frame(f,1/60,{x:f.pos.x+100,z:f.pos.z});assert.ok(Math.abs(Math.hypot(f.pos.x-START.x,f.pos.z-START.z)/plainStep-1.5)<.01,'glögg: en och en halv gånger så långt per bildruta');
  // Brickorna visar dem, och de tar slut efter sin tid. Raketen är kortast.
  const g=started();sleepFreeze(g);for(const k of ['glogg','kaka','wind','skates'])g.rush.grant(k,g.pos);
  const chips=()=>g.rush.powers().filter(p=>p.kind!=='pause'); // (provets egen paus håller klockan still)
  assert.deepEqual(chips().map(p=>p.kind),['glogg','kaka','wind','skates']);assert.ok(chips().every(p=>p.label&&p.seconds===GIFTS[p.kind].seconds));
  assert.deepEqual(['glogg','kaka','wind','skates'].map(k=>GIFTS[k].seconds),[14,3.5,20,25]);
  play(g,GIFTS.kaka.seconds+.2,null);assert.equal(g.rush.timers.kaka,0);assert.equal(g.g.fun.power.speedMul(),RUSH.boost.glogg,'raketen är slut, glöggen är kvar');
  play(g,GIFTS.glogg.seconds,null);assert.equal(g.rush.timers.glogg,0);assert.equal(g.g.fun.power.speedMul(),RUSH.boost.wind,'glöggen är slut, medvinden är kvar');
  play(g,GIFTS.skates.seconds,null);assert.equal(chips().length,0);assert.equal(g.g.fun.power.speedMul(),1);
  // En ny glögg förlänger (kortas aldrig).
  const h=started();sleepFreeze(h);h.rush.grant('glogg',h.pos);play(h,5,null);const left=h.rush.timers.glogg;h.rush.grant('glogg',h.pos);assert.ok(h.rush.timers.glogg>left+4.9&&h.rush.timers.glogg<=GIFTS.glogg.seconds);
  // Allt städas bort med körningen: grundspelets fartfaktor och klocka är tillbaka som de var.
  const q=started();q.rush.grant('kaka',q.pos);assert.ok(Object.hasOwn(q.g.fun.power,'speedMul')&&Object.hasOwn(q.g.tempo,'setTarget'));
  q.rush.quit();assert.equal(Object.hasOwn(q.g.fun.power,'speedMul'),false);assert.equal(Object.hasOwn(q.g.tempo,'setTarget'),false);assert.equal(q.g.fun.power.speedMul(),1,'ingen fart kvar efter körningen');
  q.rush.start();frame(q,.1);assert.equal(q.g.fun.power.speedMul(),1,'och en ny körning börjar utan fartgåvor');assert.equal(q.rush.timers.kaka,0);
});

test('fartgåvor: medvind ger två meter större fångstfält, och skridskor gör kedjans fönster en och en halv sekund längre',()=>{
  const reach=Math.max(catchReach(0),tempoReach(1));
  const trial=wind=>{const m=started();sleepFreeze(m);const k=plain(m,m.pos.x+reach+RUSH.windReach-.5,m.pos.z);assert.ok(m.g.freeSpot(k.x,k.z));if(wind)m.rush.grant('wind',m.pos);frame(m,.05);return k.collected;}; // spelaren står still: ingen sträcka som kan passera paketet
  assert.equal(RUSH.windReach,2);assert.equal(trial(true),true,'med medvind tas paketet strax utanför det vanliga fältet');assert.equal(trial(false),false,'utan medvind tas det inte');
  const a=started(),b=started();sleepFreeze(a);sleepFreeze(b);b.rush.grant('skates',b.pos);
  assert.equal(a.rush.comboView().windowSec,COMBO.window);assert.equal(b.rush.comboView().windowSec,COMBO.window+RUSH.skatesWindow);assert.equal(RUSH.skatesWindow,1.5);
  const gap=COMBO.window+RUSH.skatesWindow/2;
  for(const c of [a,b]){takeOne(c);assert.equal(c.rush.chain,1);play(c,gap,null);takeOne(c);}
  assert.equal(a.rush.chain,1,'utan skridskor hade kedjan hunnit brytas');assert.equal(b.rush.chain,2,'med skridskor håller kedjan');
});

test('klockan: rushens nummer styr tiden till nästa paket (trängre för varje rush), första paketet får extra tid, och grundspelets klocka är tillbaka efter körningen',()=>{
  const reachFor=lv=>Math.max(tempoReach(lv),catchReach(TEMPO.baseSpeed*tempoSpeed(lv)*PRESSURE.turbo));
  const deadline=(n,d=30)=>{const def=rushDef(n),c=rushed(def),k=c.rush.list.find(x=>x.id!==c.g.tempo.target?.id);c.g.tempo.setTarget(k,d);return {c,sec:c.g.tempo.deadline,left:c.g.tempo.left,def};};
  const secs=[1,3,6,9,12,13,16,24,40].map(n=>{const r=deadline(n);assert.ok(Math.abs(r.sec-clockFor(30,{level:r.def.tempo,pressure:n,reach:reachFor(r.def.tempo)}))<1e-9,'rush '+n+' följer formeln');assert.equal(r.left,r.sec);return r.sec;});
  for(let i=1;i<secs.length;i++)assert.ok(secs[i]<secs[i-1],'klockan blir trängre: '+secs.map(x=>x.toFixed(2)).join(' > '));
  assert.ok(secs[0]>3&&secs[4]<2.2,'30 m: Rush 1 ger mer än tre sekunder, Rush 12 knappt två: '+secs[0].toFixed(2)+' / '+secs[4].toFixed(2));
  // Det första målet har extra tid att se sig om på (en gång), nästa mål har det inte.
  const f=rushed(rushDef(8)),first=f.g.tempo.deadline;f.g.tempo.setTarget(f.rush.list[3],30);
  assert.ok(first>PRESSURE.grace+PRESSURE.min,'första klockan: '+first.toFixed(2)+' s');assert.ok(Math.abs((f.g.tempo.deadline+PRESSURE.grace)-clockFor(30,{level:8,pressure:8,reach:reachFor(8),first:true}))<1e-9);
  // Klockan sitter på journeys egen tempoinstans och är borta efter körningen: grundspelets generösa klocka gäller igen.
  const c=rushed(rushDef(12));assert.equal(Object.hasOwn(c.g.tempo,'setTarget'),true);const trim=secs[4];
  c.rush.quit();assert.equal(Object.hasOwn(c.g.tempo,'setTarget'),false);c.g.tempo.setTarget(c.rush.list[0]||{id:'x',x:0,z:0},30);
  assert.ok(c.g.tempo.deadline>trim+3,'grundspelets klocka är mer generös: '+c.g.tempo.deadline.toFixed(2)+' mot '+trim.toFixed(2));
  // Nivåerna och klockan går vidare efter en teleport: tempot ändras inte av att klockan byts.
  assert.equal(Object.getPrototypeOf(c.g.tempo).setTarget.length,2);
});

test('Maraton: tempot stiger var 12:e sekund, fortsätter efter tempo 12 med en allt trängre klocka (övertid) och resultatet räknar med stegen',()=>{
  const c=started();calm(c);const step=TEMPO.levelSeconds/RUSH.marathonRate;
  assert.equal(RUSH.marathonRate,1.25);assert.equal(step,12);
  assert.equal(c.rush.pressure(),1);play(c,step*3+.5,null);
  assert.deepEqual(ofType(c,'rush-level').map(e=>e.level),[2,3,4],'tempohöjning var 12:e sekund');assert.equal(c.g.tempo.level,4);assert.equal(c.rush.pressure(),4);
  const s=c.rush.snapshot();assert.ok(s.levelLeft>0&&s.levelLeft<=step,'tid till nästa tempo (verklig tid): '+s.levelLeft.toFixed(2));
  play(c,step*8-.5,null);assert.equal(c.g.tempo.level,12);assert.equal(c.rush.extra,0);assert.equal(c.rush.snapshot().level,12);
  const before=ofType(c,'rush-level').length;
  play(c,step*3+.5,null);
  const extra=ofType(c,'rush-level').slice(before);assert.deepEqual(extra.map(e=>[e.level,!!e.extra]),[[13,true],[14,true],[15,true]],'övertid i Maraton: ett steg var 12:e sekund');
  assert.equal(c.g.tempo.level,12,'grundspelets tempo går inte över 12');assert.equal(c.g.tempo.speedMul(),tempoSpeed(12));assert.equal(c.rush.snapshot().level,15);assert.equal(c.rush.pressure(),15);
  const sn=c.rush.snapshot();assert.ok(sn.levelLeft>0&&sn.levelLeft<=step,'räknaren börjar om för varje steg: '+sn.levelLeft.toFixed(2));
  assert.ok(extra.every(e=>e.name==='TOMTEGALET'&&e.speed===tempoSpeed(12)&&e.mult===tempoPoints(12)));
  // Klockan är trängre än i Rush 12 för samma sträcka.
  const lv=12,reach=Math.max(tempoReach(lv),catchReach(TEMPO.baseSpeed*tempoSpeed(lv)*PRESSURE.turbo));
  c.g.tempo.setTarget(c.rush.list[2],30);assert.ok(Math.abs(c.g.tempo.deadline-clockFor(30,{level:12,pressure:15,reach}))<1e-9);assert.ok(c.g.tempo.deadline<clockFor(30,{level:12,pressure:12,reach}));
  const r=c.rush.quit();assert.equal(r.level,15,'resultatet räknar med övertidsstegen');assert.equal(r.name,'TOMTEGALET');assert.equal(r.rush,null,'Maraton är ingen rush');
});

test('hjärtan i en serie: ett hjärta fylls på bara efter en rush utan förlust, annars tar man med sig det man hade kvar (minst ett)',()=>{
  const win=(start,lose)=>{const c=rushed(RUSHES[0],{hearts:start});sleepFreeze(c);c.g.tempo.lives=start-lose;c.g.tempo.picked=RUSHES[0].goal.target-1;takeOne(c);return ofType(c,'rush-over')[0].result.rush;};
  const out=(a,b)=>{const r=win(a,b);return [r.startHearts,r.hearts,r.nextHearts,r.flawless,r.stars];};
  assert.deepEqual(out(3,0),[3,3,3,true,3],'full pott: inget att fylla på');
  assert.deepEqual(out(3,1),[3,2,2,false,2],'tappade ett hjärta: det kommer inte tillbaka');
  assert.deepEqual(out(3,2),[3,1,1,false,1]);
  assert.deepEqual(out(2,0),[2,2,3,true,2],'började med två och tappade inget: ett hjärta fylls på');
  assert.deepEqual(out(1,0),[1,1,2,true,1]);
  assert.deepEqual(out(2,1),[2,1,1,false,1],'tappade ett av två: ett kvar, ingen påfyllning');
});

test('övertid: Rush 13 och uppåt spelas med tempo 12 och en allt trängre klocka, resultatet bär ÖVERTID och hur långt man kommit, och nästa låses upp',()=>{
  const def=rushDef(13),c=rushed(def);sleepFreeze(c);
  assert.equal(c.g.tempo.level,12);assert.equal(c.g.tempo.speedMul(),tempoSpeed(12));assert.equal(c.rush.pressure(),13);assert.equal(c.rush.snapshot().n,13);assert.equal(c.rush.snapshot().name,'ÖVERTID 1');
  const st=ofType(c,'rush-start')[0];assert.deepEqual([st.n,st.name,st.level],[13,'ÖVERTID 1',12]);
  for(let n=1;n<=12;n++)c.save.recordRush(n,{points:1000*n,seconds:40,packages:25,hearts:3,cleared:true});
  assert.equal(def.goal.kind,'packages');c.g.tempo.picked=def.goal.target-1;takeOne(c);
  let r=ofType(c,'rush-over')[0].result;assert.equal(r.rush.cleared,true);assert.deepEqual([r.rush.n,r.rush.name,r.rush.overtime,r.rush.newReach,r.rush.next,r.rush.done],[13,'ÖVERTID 1',true,true,14,false]);assert.equal(r.level,12);
  assert.equal(c.save.state.rush.cleared,13);assert.equal(c.save.state.rush.stars[13],3);
  // Samma rush igen: ingen ny längsta sträcka. Rush 14 (poäng) går att spela direkt och ger Rush 15.
  c.rush.start({def,hearts:3,streak:1});frame(c,.1);sleepFreeze(c);c.g.tempo.picked=def.goal.target-1;takeOne(c);
  r=ofType(c,'rush-over')[1].result;assert.equal(r.rush.newReach,false);assert.equal(r.rush.streak,2);
  const d14=rushDef(14);assert.equal(d14.goal.kind,'points');c.rush.start({def:d14,hearts:3,streak:2});frame(c,.1);sleepFreeze(c);c.g.tempo.score=d14.goal.target-1;takeOne(c);
  r=ofType(c,'rush-over')[2].result;assert.deepEqual([r.rush.n,r.rush.cleared,r.rush.newReach,r.rush.next],[14,true,true,15]);assert.equal(c.save.state.rush.cleared,14);assert.equal(c.save.state.rush.bestStreak,3);
  // Det går att förlora i övertid, och då sparas inget nytt.
  const e=rushed(rushDef(20));for(let i=0;i<3;i++){const k=e.rush.list.find(x=>!e.g.found.has(x.id));e.pos={x:k.x,z:k.z};frame(e,.3);}
  play(e,60,null);const lost=ofType(e,'rush-over')[0].result.rush;assert.deepEqual([lost.cleared,lost.next,lost.newReach,lost.stars],[false,0,false,0]);assert.equal(e.save.state.rush.cleared,0,'inget sparat');
  // Sista rushen: Rush 99 har inget efter sig.
  const z=rushed(rushDef(RUSH_MAX));sleepFreeze(z);const zd=rushDef(RUSH_MAX);z.g.tempo.picked=zd.goal.target-1;z.g.tempo.score=zd.goal.target-1;takeOne(z);const zr=ofType(z,'rush-over')[0]?.result.rush;
  if(zr)assert.equal(zr.next,0,'efter Rush 99 finns ingen mer');
});

test('julmagneten: att det sista paketet vinner rushen medan fler paket dras in kraschar inte och ger en vunnen rush',()=>{
  const def=RUSHES[0],c=rushed(def);sleepFreeze(c);
  const near=[plain(c,c.pos.x+9,c.pos.z),plain(c,c.pos.x-8,c.pos.z+3),plain(c,c.pos.x+3,c.pos.z+10)];
  c.g.tempo.picked=def.goal.target-1;c.rush.grant('magnet',c.pos);
  assert.doesNotThrow(()=>play(c,1,null));
  assert.equal(c.rush.state,'over');const r=ofType(c,'rush-over')[0].result;assert.equal(r.rush.cleared,true,'rushen vanns');assert.ok(near.some(k=>k.collected),'minst ett paket drogs in');assert.equal(c.rush.pulled.length,0);
});
