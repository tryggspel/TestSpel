// Julkalenderns sida: filer, cache-nyckel, ikoner, bilden och att sidan är fristående från spelets kod.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {DOORS,TYPES,KARLSTAD_CITY} from '../julkalender/doors.mjs';
import {BASE_GAME_URL} from '../xmas/xmas-config.mjs';
import {sceneSvg,treeSvg,PHOTO_CANDIDATES} from '../julkalender/scene.mjs';

const dir=new URL('../julkalender/',import.meta.url);
const read=f=>fs.readFileSync(new URL(f,dir),'utf8');
const html=read('index.html'),app=read('app.mjs'),css=read('calendar.css');
const modules=fs.readdirSync(dir).filter(f=>f.endsWith('.mjs'));
const version=JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;

test('sidan och alla moduler bär samma cache-nyckel som spelet (version.json), så att ett bygge aldrig blandar filer',()=>{
  const keys=new Set();
  for(const f of [...modules,'index.html','calendar.css'])for(const m of read(f).matchAll(/\?v=([^'"\s)]+)/g))keys.add(m[1]);
  assert.deepEqual([...keys],[version],'tools/set-version.mjs sätter nyckeln i hela bygget, kalendern inräknad');
  assert.ok((app.match(/\?v=/g)||[]).length>=4,'modulerna importeras med nyckel');
});
test('alla moduler är giltig JavaScript',()=>{
  for(const f of modules){const r=spawnSync(process.execPath,['--check',new URL(f,dir).pathname],{encoding:'utf8'});assert.equal(r.status,0,`${f}: ${r.stderr}`);}
});
test('varje element som app.mjs hämtar med id finns i index.html',()=>{
  const ids=new Set([...app.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map(m=>m[1]));
  assert.ok(ids.size>=12);
  for(const id of ids)assert.ok(new RegExp(`id="${id}"`).test(html),`id="${id}" saknas i index.html`);
});
test('alla ikoner som används finns som symboler i index.html',()=>{
  const used=new Set([...Object.values(TYPES).map(t=>t.icon),...DOORS.map(d=>d.ikon).filter(Boolean),...[...app.matchAll(/icon\('([a-z]+)'\)/g)].map(m=>m[1]),...[...html.matchAll(/#i-([a-z]+)/g)].map(m=>m[1])]);
  for(const i of used)assert.ok(html.includes(`<symbol id="i-${i}"`),`symbolen i-${i} saknas`);
});
test('sidan hänvisar bara till filer som finns och laddar inget från andra sajter; grundspelets adress kommer ur xmas-config',()=>{
  for(const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
    const ref=m[1].split('?')[0];
    assert.ok(!/^https?:/.test(ref),'adress hårdkodad i index.html (grundspelets adress sätts i app.mjs ur xmas-config): '+ref);
    assert.ok(fs.existsSync(new URL(ref,dir)),`${ref} finns inte`);
  }
  for(const f of [...modules,'index.html','calendar.css']){
    const src=read(f).replace(/http:\/\/www\.w3\.org\/2000\/svg/g,'');
    assert.doesNotMatch(src,/https?:\/\//,`${f} nämner en extern adress: kalendern ska inte ladda något utifrån`);
  }
  assert.equal(KARLSTAD_CITY,BASE_GAME_URL);assert.match(app,/KARLSTAD_CITY/);
  assert.ok(fs.existsSync(new URL('../index.html',dir)),'Julspelet som luckorna länkar till ligger i mappen ovanför');
  assert.match(html,/href="\.\.\/">Öppna Julklappsjakten/);
});
test('sidan är på svenska, har viewport, en h1 och hoppa-länk',()=>{
  assert.match(html,/<html lang="sv">/);assert.match(html,/name="viewport"[^>]*viewport-fit=cover/);
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1);assert.match(html,/class="skip" href="#luckor"/);
});
test('kalendern är fristående: bara xmas-config (ren modul) importeras ur spelet, inget skrivs till spelets nycklar, ingen service worker',()=>{
  for(const f of modules){
    const src=read(f);
    for(const m of src.matchAll(/from\s+['"](\.\.\/[^'"]+)['"]/g))assert.match(m[1],/^\.\.\/xmas\/xmas-config\.mjs\?v=/,`${f} importerar ${m[1]}: bara xmas/xmas-config.mjs får hämtas ur spelet`);
    assert.doesNotMatch(src,/serviceWorker/,f);
    assert.doesNotMatch(src,/(setItem|removeItem)\(\s*['"`](karlstad|xmas)[:-]/,f);
  }
  assert.doesNotMatch(read('../xmas/xmas-config.mjs'),/^\s*import\s/m,'xmas-config är en ren modul utan beroenden');
});
test('illustrationen ritas utan fel och fotoplatsen pekar på img/',()=>{
  const svg=sceneSvg();
  assert.match(svg,/^<svg [^>]*viewBox="0 0 1600 900"/);assert.match(svg,/<\/svg>$/);
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/);
  assert.match(svg,/SANDGRUND/,'Sandgrund ska synas i staden');
  assert.equal(sceneSvg(),svg,'deterministisk: samma bild varje gång');
  for(const p of PHOTO_CANDIDATES)assert.match(p,/^img\/karlstad-snow\.(webp|jpg)$/);
  assert.ok(fs.existsSync(new URL('img/README.md',dir)),'instruktion för fotot');
});
test('granen har 24 lampor, tänder en per klar lucka och stjärnan först när finalen är klar',()=>{
  const none=treeSvg(new Set());
  assert.equal((none.match(/class="bulb /g)||[]).length,24);assert.equal((none.match(/class="bulb on"/g)||[]).length,0);
  const some=treeSvg(new Set([1,5,9]));
  assert.equal((some.match(/class="bulb on"/g)||[]).length,3);assert.match(some,/3 av 24 lampor/);assert.match(some,/data-n="5"/);
  const all=treeSvg(new Set(DOORS.map(d=>d.n)),{finale:true});
  assert.equal((all.match(/class="bulb on"/g)||[]).length,24);assert.match(all,/class="star on"/);assert.doesNotMatch(none,/class="star on"/);
  assert.doesNotMatch(all,/NaN|undefined/);
  const pos=[...none.matchAll(/data-n="(\d+)" cx="([\d.]+)" cy="([\d.]+)"/g)].map(m=>m.slice(2).join(','));
  assert.equal(new Set(pos).size,24,'lamporna sitter på olika platser');
});
test('layout: rutnätet går jämnt upp i 4, 6 och 8 kolumner, rörelse kan stängas av och fokus syns',()=>{
  for(const cols of [4,6,8])assert.equal(24%cols,0);
  assert.match(css,/repeat\(4,minmax\(0,1fr\)\)/);assert.match(css,/repeat\(6,minmax\(0,1fr\)\)/);assert.match(css,/repeat\(8,minmax\(0,1fr\)\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/:focus-visible/);
});
test('README beskriver alla luckor, sparnyckeln och att spelet inte ändras',()=>{
  const readme=read('README.md');
  for(const d of DOORS)assert.ok(readme.includes(d.titel),`README saknar lucka ${d.n}: ${d.titel}`);
  assert.ok(readme.includes('karlstad-xmas:save:1'));assert.match(readme,/spelkod är inte ändrad/);
});
