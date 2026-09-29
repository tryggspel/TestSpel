import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostcard} from '../challenge-postcard.js';

const record={kind:'daily',day:'2026-09-29',seed:1245,score:1100,won:true,health:48,kills:12,seconds:120,title:'DAGENS TEST'};
function fixture(navigator){
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:navigator});
  globalThis.location=new URL('https://example.org/karlstad/');
  const callbacks=[],canvas={getContext:()=>new Proxy({}, {get:()=>()=>{},set:()=>true}),setAttribute(){},toBlob:cb=>callbacks.push(cb)};
  const field={hidden:true,value:'',select(){this.selected=true;}},save={addEventListener(){},disabled:true},button={textContent:'UTMANA EN VÄN'};
  return {card:createPostcard(canvas,field,save),callbacks,field,save,button};
}

test('a prepared image and its exact challenge link are shared together after a user action',async()=>{
  let payload;const t=fixture({canShare:data=>data.files?.length===1,share:async data=>{payload=data;}});
  t.card.show(record);assert.equal(t.save.disabled,true);t.callbacks[0](new Blob(['png'],{type:'image/png'}));assert.equal(t.save.disabled,false);
  await t.card.share(t.button);assert.equal(payload.files.length,1);assert.ok(payload.files[0].name.includes('2026-09-29'));
  const link=new URL(payload.url);assert.equal(link.searchParams.get('daily'),'2026-09-29');assert.equal(link.searchParams.get('target'),'1100');
});

test('late export from an old card cannot replace the latest challenge image',async()=>{
  let payload;const t=fixture({canShare:()=>true,share:async data=>{payload=data;}});
  t.card.show(record);t.card.show({...record,day:'2026-09-30',score:1300});
  t.callbacks[1](new Blob(['new']));t.callbacks[0](new Blob(['old']));await t.card.share(t.button);
  assert.equal(await payload.files[0].text(),'new');assert.ok(payload.files[0].name.includes('2026-09-30'));assert.equal(new URL(payload.url).searchParams.get('target'),'1300');
});

test('text sharing works without file support; cancellation stays quiet and errors expose a selectable link',async()=>{
  let payload;const t=fixture({canShare:()=>false,share:async data=>{payload=data;}});t.card.show(record);t.callbacks[0](new Blob(['png']));
  await t.card.share(t.button);assert.equal(payload.files,undefined);assert.ok(payload.url);
  navigator.share=async()=>{throw Object.assign(new Error(),{name:'AbortError'});};await t.card.share(t.button);assert.equal(t.field.hidden,true);
  navigator.share=async()=>{throw new Error('Unsupported share');};await t.card.share(t.button);assert.equal(t.field.hidden,false);assert.ok(t.field.selected);
});

test('clipboard and manual-copy fallbacks preserve the bus origin, score and seed',async()=>{
  let copied;const t=fixture({clipboard:{writeText:async url=>{copied=url;}}});
  t.card.show({kind:'bus',from:'domkyrkan',seed:5678,score:333,won:true,health:40,seconds:30,title:'BUSS',place:'Domkyrkan'});await t.card.share(t.button);
  const link=new URL(copied);assert.equal(link.searchParams.get('challenge'),'bus');assert.equal(link.searchParams.get('from'),'domkyrkan');assert.equal(link.searchParams.get('target'),'333');
  navigator.clipboard=null;await t.card.share(t.button);assert.equal(t.field.value,copied);assert.equal(t.field.hidden,false);
});
