// Julgrenen: version, bygginformation och att bygget är sammanhängande (inga imports till andra spelversioner, ingen service worker).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {GAME_VERSION,GAME_FLAVOR,GAME_TITLE,GAME_BASE} from '../build-info.mjs';
import {loadBuildStamp,shortCommit,buildLabel,buildDetail,baseStamp} from '../xmas/xmas-build.mjs';
import handler,{buildInfo} from '../api/build-info.mjs';
import {readVersion} from '../tools/set-version.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const version=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));

test('versionen är julgrenens och hör ihop med basen',()=>{
  assert.match(GAME_VERSION,/^\d+\.\d+\.\d+-xmas\.\d+$/);
  assert.equal(readVersion(),GAME_VERSION);
  assert.equal(GAME_FLAVOR,'xmas');
  assert.equal(version.flavor,'xmas');
  assert.equal(version.base.version,GAME_BASE.version);
  assert.equal(version.base.commit,GAME_BASE.commit);
  assert.ok(GAME_VERSION.startsWith(GAME_BASE.version+'-xmas.'),'xmas-versionen bygger på basversionen');
  assert.match(GAME_BASE.commit,/^[0-9a-f]{40}$/,'fullständigt commit-ID för utgångsläget');
  assert.equal(GAME_TITLE,'Julklappsjakten – 2.21-XMS');
});

test('api/build-info skickar bara icke-hemliga fält och svarar på GET',()=>{
  const out=buildInfo({VERCEL_GIT_COMMIT_SHA:'0123456789abcdef0123456789abcdef01234567',VERCEL_GIT_COMMIT_REF:'release/jul-2026',VERCEL_ENV:'production',VERCEL_DEPLOYMENT_ID:'dpl_x',SECRET_TOKEN:'hemligt',VERCEL_REGION:'arn1'});
  assert.deepEqual(Object.keys(out).sort(),['branch','commit','deployment','environment','region','repo']);
  assert.equal(out.commit,'0123456789abcdef0123456789abcdef01234567');
  assert.ok(!JSON.stringify(out).includes('hemligt'));
  assert.equal(buildInfo({}).commit,null);
  const calls=[];const res={setHeader:(k,v)=>calls.push([k,v]),status(c){this.code=c;return this;},json(b){this.body=b;return this;}};
  handler({method:'GET'},res);assert.equal(res.code,200);assert.ok('commit' in res.body);
  const res2={setHeader(){},status(c){this.code=c;return this;},json(b){this.body=b;return this;}};handler({method:'POST'},res2);assert.equal(res2.code,405);
  assert.ok(calls.some(([k,v])=>k==='Cache-Control'&&/must-revalidate/.test(v)),'inga gamla svar i cachen');
});

test('bygginformationen visar commit när funktionen svarar och annars versionen',async()=>{
  const ok=await loadBuildStamp({fetchImpl:async()=>({ok:true,json:async()=>({commit:'ABCDEF0123456789abcdef0123456789abcdef01',branch:'release/jul-2026',environment:'production'})})});
  assert.equal(ok.short,'abcdef0');assert.equal(ok.source,'vercel');assert.match(buildLabel(ok),/xmas\.\d+ · abcdef0$/);
  assert.match(buildDetail(ok),/Julklappsjakten – 2\.21-XMS · bygge .* · bas 2\.21\.1 \(fadc36a\)/);
  for(const f of [async()=>({ok:false}),async()=>{throw new Error('nät');},async()=>({ok:true,json:async()=>({commit:'inte-ett-id'})}),async()=>({ok:true,json:async()=>{throw new Error('trasigt');}}),null]){
    const s=await loadBuildStamp({fetchImpl:f});assert.equal(s.source,'lokalt');assert.equal(s.short,null);assert.match(buildLabel(s),/lokalt bygge$/);
  }
  assert.equal(baseStamp.baseCommit,'fadc36a');assert.equal(shortCommit('xyz'),null);
});

test('julbygget är sammanhängande: inga imports till andra spelversioner eller grundspelets adress, ingen service worker',()=>{
  const files=[];(function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['tests','tools','node_modules','data','audio','art','.git'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(m?js|html|css)$/.test(e.name))files.push(p);}})(root);
  assert.ok(files.length>60);
  for(const f of files){
    const src=fs.readFileSync(f,'utf8');const rel=path.relative(root,f);
    assert.ok(!/serviceWorker|navigator\.serviceWorker/.test(src),rel+' registrerar en service worker');
    for(const m of src.matchAll(/(?:import\s[^'"]*from\s*|import\s*\(\s*|import\s*)['"]([^'"]+)['"]/g)){
      const spec=m[1];
      if(/^https?:/.test(spec)){assert.match(spec,/^https:\/\/cdn\.jsdelivr\.net\/npm\/playcanvas@[\d.]+\//,rel+' hämtar kod från '+spec);continue;}
      if(spec.startsWith('.'))assert.ok(path.resolve(path.dirname(f),spec.split('?')[0]).startsWith(root+path.sep),rel+' pekar utanför spelkatalogen: '+spec);
      assert.ok(!/playcanvas-karlstad-(next|2\.1\d|2\.[0-9])|karlstad-city-mobile|\/karlstad-city\//.test(spec),rel+' importerar en annan spelversion: '+spec);
      if(!spec.startsWith('.'))continue;
      assert.match(spec,/\?v=[^'"\s)]+$/,rel+' saknar cache-nyckel: '+spec);
    }
    if(!/xmas-config\.mjs$/.test(rel))assert.ok(!/karlstad-city-visual-twin\.vercel\.app/.test(src),rel+' hårdkodar grundspelets adress (den bor i xmas-config.mjs)');
  }
});
