// Ljuset i julbygget (xmas.13): mörkret efter klockan i Karlstad, färgerna för dag, skymning och kväll, vilka material som tonas och att valet sparas.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LIGHT_MODES,LIGHT_LABEL,FIXED_K,darknessAt,darknessFor,stockholmHour,gradeFor,gradeKind,phaseName} from '../xmas/xmas-light.mjs';
import {XmasSave,sanitizeSave} from '../xmas/xmas-save.mjs';

const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};

test('mörkret följer en decemberdag i Karlstad', ()=>{
  assert.equal(darknessAt(3),1);                  // natt
  assert.equal(darknessAt(7),1);                  // fortfarande mörkt
  assert.ok(darknessAt(8.3)>.2&&darknessAt(8.3)<.8); // gryning
  assert.equal(darknessAt(10),0);                 // dag
  assert.equal(darknessAt(13),0);
  assert.ok(darknessAt(15)>.25&&darknessAt(15)<.55);      // solnedgång
  assert.ok(Math.abs(darknessAt(15.4)-.55)<.02);           // blå timmen
  assert.ok(darknessAt(16)>.6&&darknessAt(16)<.95);
  assert.equal(darknessAt(17),1);                 // kväll: julmarknaden lyser
  assert.equal(darknessAt(23.9),1);
  assert.equal(darknessAt(-1),darknessAt(23));    // runt midnatt
  assert.equal(darknessAt(25),darknessAt(1));
  // jämn: inga hopp större än 0,05 per tre minuter
  for(let h=0;h<24;h+=.05)assert.ok(Math.abs(darknessAt(h+.05)-darknessAt(h))<.05,'hopp vid '+h.toFixed(2));
});

test('fasta lägen och klocklägets tid i Stockholm', ()=>{
  assert.deepEqual([...LIGHT_MODES],['auto','dag','skymning','kvall']);
  for(const m of LIGHT_MODES)assert.ok(LIGHT_LABEL[m]);
  assert.equal(darknessFor('dag'),0);assert.equal(darknessFor('kvall'),1);assert.equal(darknessFor('skymning'),FIXED_K.skymning);
  // 2026-12-10 16:30 UTC = 17:30 i Stockholm (vintertid, UTC+1)
  const d=new Date(Date.UTC(2026,11,10,16,30));
  assert.ok(Math.abs(stockholmHour(d)-17.5)<1e-9);
  assert.equal(darknessFor('auto',d),1);
  assert.equal(darknessFor('auto',new Date(Date.UTC(2026,11,10,11,0))),0); // 12.00
  assert.equal(phaseName(0),'dag');assert.equal(phaseName(.55),'skymning');assert.equal(phaseName(1),'kvall');
});

test('färgerna: dagen är som förut, kvällen mörkare, allt inom 0–1', ()=>{
  const day=gradeFor(0),dusk=gradeFor(.55),night=gradeFor(1);
  assert.deepEqual(day.world,[1,1,1]);
  assert.deepEqual(day.fog,[.70,.79,.88]);       // samma dimma som grundspelet (WINTER_SKY)
  assert.equal(day.fogStart,120);assert.equal(day.fogEnd,420);assert.equal(day.sun,2.35);assert.equal(day.fill,.42);
  assert.deepEqual(day.ambient,[.34,.38,.40]);
  assert.equal(day.stars,0);assert.equal(night.stars,1);
  const lum=c=>.2126*c[0]+.7152*c[1]+.0722*c[2];
  assert.ok(lum(dusk.world)<lum(day.world)&&lum(night.world)<lum(dusk.world));
  assert.ok(night.sun<dusk.sun&&dusk.sun<day.sun);
  assert.ok(lum(night.fog)<lum(dusk.fog)&&lum(dusk.fog)<lum(day.fog));
  // skyltar tonas mjukare än byggnader, men tonas
  for(let i=0;i<3;i++){assert.ok(night.soft[i]>night.world[i]);assert.ok(night.soft[i]<1);}
  // kontinuerlig och inom 0–1
  let prev=gradeFor(0);
  for(let k=.01;k<=1.0001;k+=.01){
    const g=gradeFor(k);
    for(const key of ['world','soft','top','horizon','fog','ambient','sunColor'])for(const v of g[key])assert.ok(v>=0&&v<=1,key+' '+k);
    for(let i=0;i<3;i++)assert.ok(Math.abs(g.world[i]-prev.world[i])<.03);
    prev=g;
  }
  assert.deepEqual(gradeFor(-3).world,gradeFor(0).world);assert.deepEqual(gradeFor(7).world,gradeFor(1).world);
});

test('vilka material som tonas', ()=>{
  const BLEND_NONE=3,BLEND_NORMAL=2,BLEND_ADD=1;
  const a={useLighting:false,blendType:BLEND_NONE},b={useLighting:false,blendType:BLEND_NORMAL},c={useLighting:true,blendType:BLEND_NONE},d={useLighting:false,blendType:BLEND_ADD};
  assert.equal(gradeKind(a,{BLEND_NONE}),'dim');       // stadens färgade trianglar
  assert.equal(gradeKind(c,{BLEND_NONE}),'lit');       // upplysta material: ljuskällorna tonas i stället
  assert.equal(gradeKind(b,{BLEND_NONE}),'bright');    // genomskinligt (xmas-light.js avgör fasad eller skylt efter nodnamnet)
  assert.equal(gradeKind(d,{BLEND_NONE}),'bright');    // sken och lågor
  assert.equal(gradeKind(a,{bright:new Set([a]),BLEND_NONE}),'bright');
  assert.equal(gradeKind(b,{dim:new Set([b]),BLEND_NONE}),'dim');
});

test('ljusvalet sparas och okända värden blir efter klockan', ()=>{
  const st=mem(),s=new XmasSave(st);
  assert.equal(s.light,'auto');
  assert.equal(s.setLight('kvall'),true);assert.equal(s.light,'kvall');
  assert.equal(s.setLight('natt'),false);assert.equal(s.light,'kvall');
  assert.equal(new XmasSave(st).light,'kvall');
  assert.equal(sanitizeSave({v:1,opts:{weather:'full',light:'<script>'}}).opts.light,'auto');
  assert.equal(sanitizeSave({v:1,opts:{weather:'full'}}).opts.light,'auto');   // äldre sparfiler
  assert.equal(sanitizeSave({v:1,opts:{light:'skymning'}}).opts.light,'skymning');
});

test('pausmenyn har en ljusknapp och starten läser ?ljus', ()=>{
  const ui=fs.readFileSync(new URL('../xmas/xmas-ui.js',import.meta.url),'utf8'),boot=fs.readFileSync(new URL('../xmas/xmas-boot.js',import.meta.url),'utf8');
  assert.match(ui,/xmasLightBtn/);assert.match(ui,/'LJUS: '/);
  assert.match(boot,/params\?\.get\?\.\('ljus'\)/);assert.match(boot,/light\?\.update\(now\)/);
});
