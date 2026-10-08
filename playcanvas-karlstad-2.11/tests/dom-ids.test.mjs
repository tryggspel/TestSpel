import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PLACE_ROUTES} from '../city-geography.mjs';
// Varje element som koden slår upp med $('id') måste finnas i index.html. (I 2.11-arbetet
// kraschade starten när tre nya platser saknade kartknappar — fångas nu här.)
test('alla id:n som spelkoden använder finns i index.html',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
  for(const id of PLACE_ROUTES)assert.ok(ids.has('route-place-'+id),'route-place-'+id);
  const code=['last-round.js','app.js'].map(f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8')).join('\n');
  const used=new Set([...code.matchAll(/\$\('([A-Za-z][\w-]*)'\)/g),...code.matchAll(/getElementById\('([A-Za-z][\w-]*)'\)/g)].map(m=>m[1]));
  // Element som skapas dynamiskt av koden själv.
  for(const dyn of ['perfProbe','placePass'])used.delete(dyn); // placePass byggs av places-ui.js
  const missing=[...used].filter(id=>!ids.has(id));
  assert.deepEqual(missing,[]);
});

test('inga dubblerade id:n i index.html',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const all=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(all.filter((id,i)=>all.indexOf(id)!==i),[]);
});
