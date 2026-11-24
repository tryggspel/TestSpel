// Gränssnittet för framstegen: varje element som koden slår upp med $('id') finns i index.html, varje knapp är kopplad, och varje återanropsfunktion som gränssnittet kräver finns i xmas-boot.js.
// (dom-ids.test.mjs läser bara last-round.js och app.js; julkoden har egna uppslag.)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const html=read('index.html'),metaUi=read('xmas/xmas-meta-ui.js'),ui=read('xmas/xmas-ui.js'),boot=read('xmas/xmas-boot.js'),lr=read('last-round.js');
const ids=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));

test('alla id:n som xmas-meta-ui.js slår upp finns i index.html',()=>{
  const used=new Set([...metaUi.matchAll(/\$\('([A-Za-z][\w-]*)'\)/g)].map(m=>m[1]));
  assert.ok(used.size>=25,'läste '+used.size+' id:n');
  const dynamic=new Set(['xmasReward']); // byggs i koden
  assert.deepEqual([...used].filter(id=>!ids.has(id)&&!dynamic.has(id)),[]);
});
test('knapparna för julgranen, lotterna, gömda julklappar och slutkortet är kopplade och finns i index.html',()=>{
  for(const [id,fn] of [['xmasTreeBack','menuBack'],['xmasDrawBack','menuBack'],['xmasSecretsBack','menuBack'],['xmasSecretsFree','free'],['xmasResultMenu','openContinue']]){
    assert.ok(ids.has(id),id+' finns i index.html');
    assert.match(ui,new RegExp(`on\\('${id}',\\(\\)=>fx\\.${fn}\\(\\)\\)`),id+' är kopplad till fx.'+fn);
  }
  for(const id of ['xmasDrawSend','xmasCodeGo'])assert.ok(ids.has(id)&&metaUi.includes(`$('${id}')`),id);
  for(const fn of ['openTree','openDraw','openSecrets','menuBack','codeRedeemed'])assert.match(boot,new RegExp(`${fn}:[^,]*=>`),'xmas-boot.js saknar fx.'+fn);
  for(const fn of ['openTree','openDraw','openSecrets','codeRedeemed'])assert.match(metaUi,new RegExp(`fx\\.${fn}`),'gränssnittet använder fx.'+fn);
});
test('panelerna finns i panellistan och i index.html, och formuläret är dolt som standard',()=>{
  for(const id of ['xmas-tree','xmas-draw','xmas-secrets']){assert.ok(lr.includes("'"+id+"'"),id+' i panellistan');assert.ok(html.includes(`id="round-${id}"`),'round-'+id);}
  assert.match(html,/id="xmasDrawForm"[^>]*hidden/);assert.match(html,/id="xmasStripStart"[^>]*hidden/);assert.match(html,/id="xmasStripContinue"[^>]*hidden/);
  // stora knappen kommer före remsan på startvyn och på julmenyn (syns utan att rulla)
  assert.ok(html.indexOf('id="xmasCozy"')<html.indexOf('id="xmasStripStart"'),'startvyn');
  assert.ok(html.indexOf('id="xmasRound"')<html.indexOf('id="xmasStripContinue"'),'julmenyn');
});
test('allt som visas skrivs med textContent: inga HTML-strängar med data i framstegens gränssnitt',()=>{
  for(const [name,src] of [['xmas-meta-ui.js',metaUi],['xmas-tree-art.js',read('xmas/xmas-tree-art.js')],['xmas-draw-client.mjs',read('xmas/xmas-draw-client.mjs')]]){
    assert.doesNotMatch(src,/\.innerHTML\s*=|insertAdjacentHTML|document\.write|outerHTML\s*=/,name+' skriver HTML');
    assert.doesNotMatch(src,/\beval\(|new Function\(/,name);
  }
  assert.doesNotMatch(metaUi,/localStorage|sessionStorage/,'gränssnittet rör inte lagringen direkt: det går via xmas-meta.mjs');
});
test('personuppgifter sparas inte på enheten: formuläret skriver bara till servern',()=>{
  assert.doesNotMatch(metaUi,/xmasDrawName'\)\.value\s*=|xmasDrawContact'\)\.value\s*=/,'fälten fylls inte i från lagring');
  const meta=read('xmas/xmas-meta.mjs');
  assert.doesNotMatch(meta,/\bcontact\b/,'xmas-meta.mjs känner inte till kontaktuppgifter');
});
