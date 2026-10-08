// JulRushen: Julklappsjaktens version av TempoRush. Reglerna körs mot grundspelets riktiga CityJourney (samma bana, klocka och fångstfält),
// med en liten "spelare" som går mot målet bildruta för bildruta, så att det som testas är det som händer i spelet.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CityNavigation} from '../city-missions.mjs';
import {CityJourney,TEMPO_COURSE,tempoReach,catchReach} from '../journey-rules.mjs';
import {TEMPO,tempoSpeed,tempoPoints} from '../tempo-run.mjs';
import {powerFor,POWER} from '../powerups.mjs';
import {XmasRush,GIFTS,GIFT_KINDS,giftFor,RUSH,RUSH_NAMES,rushName} from '../xmas/xmas-rush.mjs';
import {XmasSave,sanitizeSave} from '../xmas/xmas-save.mjs';
import {COMBO,PACKAGE_POINTS,STAMPS} from '../xmas/xmas-config.mjs';

const nav=new CityNavigation(),mall={x:-135,z:98};
const portals={'sista-rundan':{x:46,z:37,name:'O’Learys'},fikapanik:{x:8,z:6,name:'Fikapanik'},'radda-fikat':{x:-135,z:55,name:'Rädda fikat'},sandgrund:{x:-12,z:-370,name:'Sandgrund'}};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
const START={x:-19,z:35};

// Ett julbygge i miniatyr: samma journey som spelet, utan termosar, med JulRushen inkopplad där grundspelet anropar xmas.step.
function mk({wall=null,at=START}={}){
  const g=new CityJourney(wall?new CityNavigation(wall):nav,mall,portals,storage());g.rush.start('clean');g.drainEvents();
  g.items.length=0;g.treasures.length=0;g.secrets.length=0;g.itemById.clear(); // som prepareXmasJourney
  const save=new XmasSave(storage()),rush=new XmasRush({journey:g,save});
  g.xmas={step:(dt,p,sweep,speed)=>rush.step(dt,p,sweep,speed),objective:p=>rush.objective(p)};
  return {g,rush,save,pos:{...at},fwd:{x:0,z:-1},events:[],base:[]};
}
// Ett steg. move: null = stå still, 'target' = gå mot målet, {x,z} = gå mot en punkt. Farten är gångfarten gånger tempot och eventuell släde.
function frame(c,dt=1/60,move=null){
  const {g}=c;const dest=move==='target'?g.tempo.target:move&&typeof move==='object'?move:null;
  if(dest){const dx=dest.x-c.pos.x,dz=dest.z-c.pos.z,d=Math.hypot(dx,dz);if(d>1e-6){const v=7.2*g.tempo.speedMul()*g.fun.power.speedMul(),s=Math.min(d,v*dt);c.pos={x:c.pos.x+dx/d*s,z:c.pos.z+dz/d*s};c.fwd={x:dx/d,z:dz/d};}}
  g.step(dt,{x:c.pos.x,z:c.pos.z,y:1.68},c.fwd);
  const ev=c.rush.drain();c.events.push(...ev);c.base.push(...g.drainEvents());return ev;
}
function play(c,seconds,move='target',dt=1/60){const n=Math.round(seconds/dt);for(let i=0;i<n&&c.rush.state!=='over';i++)frame(c,dt,move);return c.events;}
const ofType=(c,type)=>c.events.filter(e=>e.type===type);
// Spela tills ett villkor är uppfyllt (eller tiden tar slut).
function until(c,cond,max=120,move='target'){for(let i=0;i<max*60&&!cond();i++){if(c.rush.state==='over')break;frame(c,1/60,move);}return cond();}
// Starta och låt första steget lägga ut banan.
function started(opts){const c=mk(opts);c.rush.start();frame(c,.1);return c;}

test('julgåvor: sju sorter med namn, förklaring och färg, stabil fördelning och skölden är sällsyntast',()=>{
  assert.equal(GIFT_KINDS.length,7);
  for(const k of GIFT_KINDS){const d=GIFTS[k];assert.ok(d.label&&d.text&&d.color&&d.short,k+' saknar text');assert.ok(Number.isFinite(d.seconds)&&d.seconds>=0);}
  const count=Object.fromEntries(GIFT_KINDS.map(k=>[k,0])),n=32000;
  for(let i=0;i<n;i++){const k=giftFor('tp:'+i);assert.ok(GIFTS[k]);count[k]++;assert.equal(giftFor('tp:'+i),k,'samma id ger samma gåva');}
  for(const k of GIFT_KINDS)assert.ok(count[k]>n*.03,k+' förekommer: '+count[k]);
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
  assert.ok(c.g.tempo.deadline>=9&&c.g.tempo.deadline<=16,'första klockan är generös: '+c.g.tempo.deadline.toFixed(1)+' s');
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
  // Stå still längre än fönstret: kedjan bryts (och det meddelas för kedjor ≥ 3).
  for(let i=0;i<Math.ceil((COMBO.window+.5)*60);i++)frame(c,1/60);
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

test('guldpaket bär julgåvor: var femte till sjätte paket, och gåvan kommer när paketet tas',()=>{
  const c=started();
  until(c,()=>c.events.some(e=>e.type==='rush-gift'),90);
  const gift=ofType(c,'rush-gift')[0];assert.ok(gift,'en gåva delades ut');assert.ok(GIFT_KINDS.includes(gift.kind));assert.equal(gift.label,GIFTS[gift.kind].label);
  const gold=ofType(c,'rush-pick').filter(e=>e.gold);assert.ok(gold.length>=1&&gold[0].kind==='bonus');
  assert.equal(c.rush.gifts,ofType(c,'rush-gift').length);assert.equal(c.rush.golds,gold.length);
  // Andelen guldpaket i banan: minst var sjätte (som grundspelets förmågebärare) men inte allt.
  const d=started();let gold2=0,all=0;for(let i=0;i<30*60&&d.rush.state==='running';i++){frame(d,1/60,'target');}
  for(const e of d.events.filter(x=>x.type==='rush-pick')){all++;if(e.gold)gold2++;}
  assert.ok(all>=20);assert.ok(gold2/all>=1/7&&gold2/all<=.45,'guldandel '+gold2+'/'+all);
  // Guldpaketets id bär en förmåga i grundspelets mening.
  const some=c.rush.list.filter(k=>k.kind==='bonus');for(const k of some)assert.ok(powerFor(k.id,c.g.fun.day),k.id);
  for(const k of c.rush.list.filter(k=>k.kind==='regular'))assert.ok(!powerFor(k.id,c.g.fun.day));
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
  play(b,9.2,null);assert.equal(b.rush.timers.star,0);play(s,19.5,null);assert.ok(s.rush.timers.golden>0||s.rush.state==='over');
  // Magneten: ett paket strax utanför det vanliga fältet tas.
  const m=started(),n=m.rush.list[0],reach=Math.max(catchReach(0),tempoReach(1)),sx=-n.pearl.hz,sz=n.pearl.hx;
  m.rush.grant('star',m.pos);m.pos={x:n.x+sx*(reach+RUSH.starReach-.5),z:n.z+sz*(reach+RUSH.starReach-.5)};frame(m,.05);assert.equal(m.g.found.has(n.id),true,'magneten når längre');
});

test('gåva: glöggpausen fryser klockan till nästa paket men inte nivåerna',()=>{
  const c=started();c.rush.grant('pause',c.pos);const left=c.g.tempo.left,lvl=c.g.tempo.levelClock;
  play(c,3,null);assert.equal(c.g.tempo.left,left,'klockan står still');assert.ok(c.g.tempo.levelClock>lvl+2.9,'nivåtiden går');
  play(c,5,null);assert.ok(c.g.tempo.left<left,'när pausen är slut går klockan igen');
});

test('gåva: julklockan lägger åtta sekunder på klockan, även om den kommer mellan två mål',()=>{
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
  const far={x:c.pos.x+420,z:c.pos.z+80};c.pos=far;
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
  const bad=sanitizeSave({v:1,records:{julrush:{points:5,seconds:1,packages:1,bonus:1,level:99}}});assert.equal(bad.records.julrush.level,12);
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
  // Kungsgatan 14, 16 och 18: fasadmodulerna är orörda av JulRushen (inga imports av julkod).
  for(const f of ['kungsgatan-reference.mjs','photo-reference-pass3.mjs','residenset-facade.mjs','opera-facade.mjs','innerstad-reference.mjs'])assert.ok(!/xmas|JulRush/i.test(read(f).replace(/\?v=[^'"\s)]+/g,'')),f+' är orörd');
});
