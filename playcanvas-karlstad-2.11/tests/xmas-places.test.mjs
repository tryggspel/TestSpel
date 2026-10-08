import test from 'node:test';
import assert from 'node:assert/strict';
import {XMAS_PLACES,XMAS_CERVERA,XMAS_PRESSBYRAN} from '../xmas/xmas-places.mjs';
import {validateAll,playablePlaces,approvedOffer} from '../places.mjs';
import {hasProp,drawProp,drawItemCard,drawMenuBoard} from '../xmas/xmas-place-art.js';
import {STAMPS} from '../xmas/xmas-config.mjs';

const ctx=()=>new Proxy({},{get:(t,k)=>k in t?t[k]:(()=>({addColorStop(){}})),set:(t,k,v)=>{t[k]=v;return true;}});

test('julens butiksuppdrag följer samma datamodell som grundspelets och klarar dess kontroll',()=>{
  assert.deepEqual(validateAll(XMAS_PLACES),[]);
  assert.deepEqual(playablePlaces(XMAS_PLACES).map(p=>p.id),['cervera','pressbyran']);
  assert.equal(XMAS_PLACES.filter(p=>p.status==='future').length,5);
});
test('inga samarbeten eller erbjudanden påstås: allt är demo eller framtida',()=>{
  for(const p of XMAS_PLACES){assert.ok(p.status==='demo'||p.status==='future');if(p.partner)assert.equal(p.partner.confirmed,false);assert.equal(approvedOffer(p),null);}
});
test('alla föremål och menyval har ritad grafik (grundspelets eller julens)',()=>{
  const arts=[...XMAS_CERVERA.activity.items.map(i=>i.art),...XMAS_PRESSBYRAN.activity.menu.map(m=>m.art)];
  for(const a of arts){assert.ok(hasProp(a),'saknar grafik för '+a);assert.equal(drawProp(ctx(),a),true,a);}
  assert.doesNotThrow(()=>drawItemCard(ctx(),256,320,'lussebulle','LUSSEBULLE'));
  assert.doesNotThrow(()=>drawMenuBoard(ctx(),768,384,XMAS_PRESSBYRAN.activity.menu.map(m=>m.art),'TOMTARNAS FIKAORDER'));
});
test('julstämplarna för butikerna finns i julstämpelboken och har samma id som uppdragens',()=>{
  for(const p of XMAS_PLACES.filter(x=>x.status==='demo')){const st=STAMPS.find(s=>s.id===p.reward.stamp.id);assert.ok(st,p.id+' saknar julstämpel');}
});
test('beställningarna använder bara saker som finns på menyn och har rimliga tider',()=>{
  const ids=new Set(XMAS_PRESSBYRAN.activity.menu.map(m=>m.id));
  assert.ok(XMAS_PRESSBYRAN.activity.orders.length>=4);
  for(const o of XMAS_PRESSBYRAN.activity.orders){assert.ok(o.items.every(i=>ids.has(i)));assert.ok(o.seconds>=36&&o.seconds<=60);}
  assert.ok(XMAS_PRESSBYRAN.activity.orders.some(o=>o.items.includes('lussebulle')),'lussebulle ingår');
});
test('Cervera behåller interiörens föremål och positioner men har julens texter',()=>{
  const names=XMAS_CERVERA.activity.items.map(i=>i.id).sort();assert.deepEqual(names,['fat','kanna','kopp']);
  assert.match(XMAS_CERVERA.activity.title,/TOMTARNAS FIKABORD/);
  for(let i=0;i<3;i++){assert.equal(XMAS_CERVERA.activity.items[i].x,XMAS_PLACES.find(p=>p.id==='cervera').activity.items[i].x);}
});
