import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {VERSION} from '../version.mjs';
import {DOORS,TYPES} from '../doors.mjs';
import {sceneSvg,treeSvg,PHOTO_CANDIDATES} from '../scene.mjs';

const dir=new URL('../',import.meta.url);
const read=f=>fs.readFileSync(new URL(f,dir),'utf8');
const html=read('index.html'),app=read('app.mjs'),css=read('calendar.css');
const modules=fs.readdirSync(dir).filter(f=>f.endsWith('.mjs'));

test('alla moduler och sidan använder samma cache-nyckel som version.mjs',()=>{
  const keys=new Set();
  for(const f of [...modules,'index.html','calendar.css'].filter(f=>f!=='version.mjs'||true))for(const m of read(f).matchAll(/\?v=([0-9][0-9.]*)/g))keys.add(m[1]);
  assert.deepEqual([...keys],[VERSION],'Blandade ?v=-nycklar ger moduler från olika releaser i webbläsarens cache');
  assert.match(VERSION,/^\d+\.\d+\.\d+$/);
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
test('sidan hänvisar bara till filer som finns och laddar inget från andra sajter',()=>{
  for(const m of html.matchAll(/(?:href|src)="([^"#]+)"/g)){
    const ref=m[1].split('?')[0];if(ref.startsWith('#'))continue;
    assert.ok(fs.existsSync(new URL(ref,dir)),`${ref} finns inte`);
  }
  for(const f of [...modules,'index.html','calendar.css']){
    const src=read(f).replace(/http:\/\/www\.w3\.org\/2000\/svg/g,'');
    assert.doesNotMatch(src,/https?:\/\//,`${f} nämner en extern adress: kalendern ska inte ladda något utifrån`);
  }
  assert.ok(fs.existsSync(new URL('../playcanvas-karlstad-2.11/index.html',dir)),'spelet som luckorna länkar till');
});
test('sidan är på svenska, har viewport, en h1 och hoppa-länk',()=>{
  assert.match(html,/<html lang="sv">/);assert.match(html,/name="viewport"[^>]*viewport-fit=cover/);
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1);assert.match(html,/class="skip" href="#luckor"/);
});
test('kalendern ändrar inte spelet: inga skrivningar till spelets nycklar och ingen import från spelet i webbläsarkoden',()=>{
  for(const f of ['app.mjs','rules.mjs','scene.mjs','snow.mjs','doors.mjs']){
    const src=read(f);
    assert.doesNotMatch(src,/(setItem|removeItem)\(\s*['"`]karlstad:/,f);
    assert.doesNotMatch(src,/from\s+['"]\.\.\//,`${f} importerar från ovan: sidan ska vara fristående`);
  }
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
  assert.equal((some.match(/class="bulb on"/g)||[]).length,3);assert.match(some,/3 av 24 lampor/);
  assert.match(some,/data-n="5"/);
  const all=treeSvg(new Set(DOORS.map(d=>d.n)),{finale:true});
  assert.equal((all.match(/class="bulb on"/g)||[]).length,24);assert.match(all,/class="star on"/);assert.doesNotMatch(none,/class="star on"/);
  assert.doesNotMatch(all,/NaN|undefined/);
  const pos=[...none.matchAll(/data-n="(\d+)" cx="([\d.]+)" cy="([\d.]+)"/g)].map(m=>m.slice(2).join(','));
  assert.equal(new Set(pos).size,24,'lamporna sitter på olika platser');
});
test('layout: rutnätet går jämnt upp i 4, 6 och 8 kolumner och mobilen har inga fasta bredder',()=>{
  for(const cols of [4,6,8])assert.equal(24%cols,0);
  assert.match(css,/repeat\(4,minmax\(0,1fr\)\)/);assert.match(css,/repeat\(6,minmax\(0,1fr\)\)/);assert.match(css,/repeat\(8,minmax\(0,1fr\)\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/:focus-visible/);
});
test('README beskriver alla luckor och de sparnycklar kalendern läser',()=>{
  const readme=read('README.md');
  for(const d of DOORS)assert.ok(readme.includes(d.titel),`README saknar lucka ${d.n}: ${d.titel}`);
  for(const k of ['karlstad:missions:2','karlstad:rush:best:1','karlstad:tempo:1','karlstad:trail:best','karlstad:boat:best:1','karlstad:fun:1','karlstad:places:1','karlstad:daily:'])assert.ok(readme.includes(k),k);
  assert.match(readme,/Karlstad City är inte ändrat/);
});
