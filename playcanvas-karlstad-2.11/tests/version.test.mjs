import test from 'node:test';
import assert from 'node:assert/strict';
import {scan,readVersion} from '../tools/set-version.mjs';
import {GAME_VERSION} from '../build-info.mjs';
import {CHALLENGE_RULES} from '../daily-challenge.mjs';
import fs from 'node:fs';

test('alla moduler använder samma cache-nyckel som version.json och build-info',()=>{
  const found=scan(),want=readVersion();
  assert.deepEqual([...found.keys()],[want],'Blandade ?v=-nycklar ger moduler från olika releaser i webbläsarcachen (jfr 2.7.1)');
  assert.equal(GAME_VERSION,want);
  assert.equal(JSON.parse(fs.readFileSync(new URL('../version.json',import.meta.url))).rules,CHALLENGE_RULES);
});

test('spelet äger sin egen OSM-snapshot och hämtar den versionerat',()=>{
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/fetch\('\.\/data\/osm-buildings\.json\?v='\+GAME_VERSION\)/);
  assert.doesNotMatch(app,/karlstad-city-mobile/);
  assert.ok(fs.existsSync(new URL('../data/osm-buildings.json',import.meta.url)));
});
