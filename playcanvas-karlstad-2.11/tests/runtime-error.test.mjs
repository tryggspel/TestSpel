import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('post-boot Safari Script error cannot cover a running game',()=>{
  assert.match(app,/let bootComplete=false/);
  assert.match(app,/if\(bootComplete\)return runtimeIssue\('error'/);
  assert.match(app,/opaque=.*Script error/);
  assert.match(app,/if\(DEBUG&&!opaque\)/);
  assert.match(app,/bootComplete=true/);
});

test('real boot failures still use the fatal boot overlay before boot completes',()=>{
  assert.match(app,/if\(bootComplete\)return runtimeIssue\('error',value,e\);\s*fail\(value\|\|e\)/s);
  assert.match(app,/if\(bootComplete\)return runtimeIssue\('promise'/);
});
