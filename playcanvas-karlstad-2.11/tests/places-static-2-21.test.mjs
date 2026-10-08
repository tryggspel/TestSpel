// 2.21: statiska kontroller av butiksuppdragens gränssnitt: säker DOM, ingen nätverkstrafik, små mål och rätt filer inkopplade.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('gränssnittet bygger DOM med textContent, aldrig innerHTML med data',()=>{
  for(const f of ['places-ui.js','places-view.js','place-art.js'])assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(read(f)),f+' använder osäker DOM');
  assert.ok(!/eval\(|new Function/.test(read('places-ui.js')));
});

test('ingen nätverkstrafik för mätning: sändaren finns men är inte kopplad av spelet',()=>{
  const files=fs.readdirSync(new URL('..',import.meta.url)).filter(f=>/\.(m?js)$/.test(f));
  for(const f of files){
    const src=read(f);
    if(f==='partner-events.mjs')continue;
    assert.ok(!/sendBeacon|XMLHttpRequest/.test(src),f+' skickar data');
    assert.ok(!/beaconSink\s*\(/.test(src),f+' kopplar på en mottagare');
  }
  const own=['places.mjs','place-quests.mjs','places-ui.js','places-view.js','places-space.mjs','place-art.js'].map(read).join('\n');
  assert.ok(!/\bfetch\s*\(/.test(own),'platskoden hämtar inget från nätet');
  assert.ok(!/localStorage\.setItem\(['"](?!karlstad:)/.test(own));
});

test('formatfilen är inkopplad och viktiga knappar är minst 44 px höga',()=>{
  assert.match(read('index.html'),/<link rel="stylesheet" href="\.\/places\.css\?v=/);
  const css=read('places.css');
  for(const [sel,min] of [['.ph-x',44],['.ph-again,.ph-leave',52],['.pr-close,.pr-pass',50],['.pass-go',44],['.po-link',44]]){
    const rule=css.split('}').find(r=>r.trim().startsWith(sel));assert.ok(rule,sel+' finns');
    const h=Math.max(...[...rule.matchAll(/(?:min-)?height:(\d+)px/g)].map(m=>+m[1]));assert.ok(h>=min,sel+' är '+h+' px');
  }
  const btn=css.split('}').find(r=>r.trim().startsWith('.ph-btn{'));assert.match(btn,/min-height:6\dpx/);
  // ingen text under 10 px i uppdragsgränssnittet
  const sizes=[...css.matchAll(/font:\d+ (\d+)px/g)].map(m=>+m[1]).concat([...css.matchAll(/font-size:(\d+)px/g)].map(m=>+m[1]));
  assert.ok(Math.min(...sizes)>=10,'minsta text '+Math.min(...sizes));
});

test('rätt id:n skapas för gränssnittet och används av formatfilen',()=>{
  const ui=read('places-ui.js'),css=read('places.css');
  for(const id of ['placeHud','placeResult','placePass'])assert.ok(ui.includes("'"+id+"'")||ui.includes('"'+id+'"'),id+' skapas');
  assert.ok(css.includes('.place-hud')&&css.includes('.place-result')&&css.includes('.place-pass'));
  assert.ok(read('last-round.js').includes('placeAnchors(host.colliders)'),'platserna får riktiga fasadankare');
  assert.ok(read('app.js').includes('partnerColliders(colliders)'),'serviceytan är ett fast föremål');
});

test('spelet startar inga platsuppdrag utanför Clean City Explore (kontroll i koden)',()=>{
  const src=read('last-round.js');
  assert.match(src,/available:\(\)=>journey\.rush\.mode==='clean'&&journey\.rush\.state==='playing'&&!journey\.tempo\.running&&!journey\.rush\.challenge/);
});

test('2.21.1: singular i passet, mätvärden i rutor som ryms i bredd och replikruta ovanför beställningsremsan',()=>{
  const ui=read('places-ui.js'),css=read('places.css');
  assert.ok(ui.includes('visitsLabel(r.visits)'),'passet använder visitsLabel');
  assert.ok(!ui.includes('PASS_TEXT.visitWord)'),'ingen hårdkodad pluralform kvar');
  assert.match(css,/\.pl-vals\{[^}]*auto-fit/,'mätvärdena bryter rad i stället för att klippas');
  assert.ok(ui.includes("'pl-vals'")&&!/el\('table'|createElement\('table'\)/.test(ui),'ingen bred tabell med sex kolumner');
  // Beställningsremsan är högre än uppdragsremsan: replikrutan ligger högre, men mobilreglerna (senare i filen) går före.
  const order=css.indexOf('body.place-order-on.round-playing #roundToast');
  assert.ok(order>0,'regeln för beställning finns');
  assert.ok(order>css.indexOf('body.place-hud-on.round-playing #roundToast{top:auto'),'efter grundregeln');
  assert.ok(order<css.indexOf('@media(pointer:coarse){body.place-hud-on.round-playing #roundToast'),'före mobilregeln, som därför vinner på telefon');
  assert.ok(ui.includes("classList.toggle('place-order-on'")&&ui.includes("remove('place-hud-on','place-order-on')"),'klassen sätts och tas bort');
});
