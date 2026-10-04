import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COMIC_FACE_BIAS} from '../comic-city.js';

test('comic facade sheets stay clearly in front of OSM walls for Safari depth stability',()=>{
  assert.ok(COMIC_FACE_BIAS>=.14,'generic illustrated facade needs a meaningful depth bias');
  const src=fs.readFileSync(new URL('../comic-city.js',import.meta.url),'utf8');
  assert.match(src,/p\.nx\*COMIC_FACE_BIAS/);
  assert.match(src,/p\.nz\*COMIC_FACE_BIAS/);
});

test('curated facade systems do not add a redundant full-size wall sheet',()=>{
  const photo=fs.readFileSync(new URL('../photo-reference-pass3.mjs',import.meta.url),'utf8');
  const kung=fs.readFileSync(new URL('../kungsgatan-reference.mjs',import.meta.url),'utf8');
  const inner=fs.readFileSync(new URL('../innerstad-reference.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(photo,/panel\(0,\.04,length,h-\.04,p\.wall,\.07\)/);
  assert.doesNotMatch(kung,/panel\(0,\.05,length,b\.h-\.05,p\.wall,\.07\)/);
  assert.doesNotMatch(inner,/panel\(0,\.04,length,b\.h-\.04,p\.wall,\.07\)/);
  for(const src of [photo,kung,inner])assert.match(src,/FACE_BIAS/);
});
