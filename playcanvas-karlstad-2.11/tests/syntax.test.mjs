import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Webbläsaren läser alla .js-filer som ES-moduler. `node --check fil.js` gör det inte
// (CommonJS tillåter t.ex. return på toppnivå), så vi kontrollerar en .mjs-kopia.
test('alla spelfiler går att tolka som ES-moduler',()=>{
  const dir=new URL('..',import.meta.url).pathname,tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ks-'));
  const bad=[];
  for(const f of fs.readdirSync(dir).filter(f=>/\.(m?js)$/.test(f))){
    const copy=path.join(tmp,f.replace(/\.js$/,'.mjs'));fs.copyFileSync(path.join(dir,f),copy);
    try{execFileSync(process.execPath,['--check',copy],{stdio:'pipe'});}catch(e){bad.push(f+': '+String(e.stderr).split('\n').find(l=>l.includes('Error')));}
  }
  assert.deepEqual(bad,[]);
});
