// Gömda julklappar i paketmotorn (XmasHunt.addHidden): guldpaket på fasta platser i fri julvandring som inte rör kombo, poäng, mål eller räknare, och som bara går att ta en gång.
import test from 'node:test';
import assert from 'node:assert/strict';
import {XmasHunt,seededRandom} from '../xmas/xmas-hunt.mjs';
import {HIDDEN_SPOTS,hiddenPackages,spotOfPackage} from '../xmas/xmas-hidden.mjs';
import {INTRO} from '../xmas/xmas-layout.mjs';

const fresh=()=>{const h=new XmasHunt({rand:seededRandom(5)});h.startFree();h.drain();return h;};
const near=s=>({x:s.x+.3,z:s.z+.2,y:1.68});

test('addHidden: bara i fri julvandring, varje plats en gång, och de räknas inte som vanliga eller bonuspaket',()=>{
  const h=fresh(),list=hiddenPackages({});
  assert.equal(h.addHidden(list),20);assert.equal(h.addHidden(list),0,'samma id läggs inte in två gånger');
  const r=h.run;assert.equal(r.regularTotal,0);assert.equal(r.bonusTotal,0);assert.equal(r.packages.filter(p=>p.hidden).length,20);
  assert.ok(r.packages.filter(p=>p.hidden).every(p=>p.kind==='bonus'&&p.y===0&&p.id.startsWith('h:')&&!p.collected));
  const intro=new XmasHunt({});intro.startSpiral();assert.equal(intro.addHidden(list),0,'inte i en jakt med mål');
  assert.equal(new XmasHunt({}).addHidden(list),0,'ingen körning');assert.equal(fresh().addHidden(null),0);assert.equal(fresh().addHidden([{id:'h:x',x:NaN,z:1}]),0);
});
test('en gömd julklapp tas på nära håll, ger bara en egen händelse och rör inte poäng, kombo eller räknare',()=>{
  const h=fresh();h.addHidden(hiddenPackages({}));
  const s=HIDDEN_SPOTS[1];
  h.step(.05,near(s),null,1.2);
  const ev=h.drain(),got=ev.filter(e=>e.type==='xmas-hidden');
  assert.equal(got.length,1);assert.equal(got[0].spot,s.id);assert.equal(spotOfPackage(got[0].id),s.id);assert.ok(!ev.some(e=>e.type==='xmas-pick'));
  const r=h.run;assert.equal(r.points,0);assert.equal(r.chain,0);assert.equal(r.bestChain,0);assert.equal(r.collected,0);assert.equal(r.bonusCollected,0);
  h.step(.05,near(s),null,1.2);assert.equal(h.drain().filter(e=>e.type==='xmas-hidden').length,0,'en gång');
});
test('höjden spelar ingen roll för en gömd julklapp (bro, brygga), men avståndet och sikten gör det',()=>{
  const h=fresh();h.addHidden(hiddenPackages({}));const s=HIDDEN_SPOTS[1];
  h.step(.05,{x:s.x+.3,z:s.z,y:4.2},null,1.2);assert.equal(h.drain().filter(e=>e.type==='xmas-hidden').length,1,'ovanpå en bro');
  const h2=fresh();h2.addHidden(hiddenPackages({}));
  h2.step(.05,{x:s.x+12,z:s.z,y:1.68},null,1.2);assert.equal(h2.drain().filter(e=>e.type==='xmas-hidden').length,0,'12 m bort');
  const h3=new XmasHunt({nav:{blocked:()=>true}});h3.startFree();h3.addHidden(hiddenPackages({}));
  h3.step(.05,{x:s.x+2,z:s.z,y:1.68},null,0);assert.equal(h3.drain().filter(e=>e.type==='xmas-hidden').length,0,'ingen sikt: genom en vägg');
});
test('redan hittade platser läggs inte ut igen, och de vanliga tappade julklapparna fungerar som förut',()=>{
  const found=Object.fromEntries(HIDDEN_SPOTS.slice(0,7).map(s=>[s.id,'2026-12-01']));
  const h=fresh();assert.equal(h.addHidden(hiddenPackages(found)),13);
  // ett vanligt regn kommer fortfarande och går att plocka
  for(let i=0;i<40&&!h.run.packages.some(p=>!p.hidden);i++)h.step(1,{x:INTRO.spawn.x,z:INTRO.spawn.z,y:1.68},null,0);
  const reg=h.run.packages.find(p=>!p.hidden);assert.ok(reg,'ett regn lades ut');
  h.drain();h.step(.05,{x:reg.x,z:reg.z,y:1.68},null,0);const pick=h.drain().filter(e=>e.type==='xmas-pick');assert.equal(pick.length>=1,true);assert.ok(h.run.collected+h.run.bonusCollected>=1);
  assert.equal(h.run.packages.filter(p=>p.hidden&&!p.collected).length,13,'de gömda påverkades inte');
});
