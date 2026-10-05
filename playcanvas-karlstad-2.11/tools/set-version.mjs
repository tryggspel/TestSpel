#!/usr/bin/env node
// Sätter en enda cache-nyckel (?v=X.Y.Z) i alla moduler, HTML och CSS.
// Användning: node tools/set-version.mjs 2.10.1   (utan argument: kontrollera bara)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const exts=new Set(['.js','.mjs','.html','.css']);
const KEY=/\?v=([^'"\s)]+)/g; // strikt: hela query-svansen räknas, så ?v=X&build=Y blir en egen nyckel
export function sourceFiles(dir=root){
  const out=[];
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    if(e.name.startsWith('.')||['tests','tools','data','audio','art','node_modules'].includes(e.name))continue;
    const p=path.join(dir,e.name);
    if(e.isDirectory())out.push(...sourceFiles(p));else if(exts.has(path.extname(e.name)))out.push(p);
  }
  return out;
}
export function readVersion(){return JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8')).version;}
export function scan(){
  const found=new Map();
  for(const f of sourceFiles())for(const m of fs.readFileSync(f,'utf8').matchAll(KEY)){const list=found.get(m[1])||[];list.push(path.relative(root,f));found.set(m[1],list);}
  return found;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const next=process.argv[2];
  if(next){
    if(!/^\d+\.\d+\.\d+$/.test(next)){console.error('Version måste vara X.Y.Z');process.exit(2);}
    let n=0;for(const f of sourceFiles()){const s=fs.readFileSync(f,'utf8'),t=s.replace(KEY,'?v='+next);if(t!==s){fs.writeFileSync(f,t);n++;}}
    const bi=path.join(root,'build-info.mjs');fs.writeFileSync(bi,fs.readFileSync(bi,'utf8').replace(/GAME_VERSION='[^']*'/,`GAME_VERSION='${next}'`));
    const vf=path.join(root,'version.json'),v=JSON.parse(fs.readFileSync(vf,'utf8'));v.version=next;fs.writeFileSync(vf,JSON.stringify(v,null,2)+'\n');
    console.log(`Version ${next} satt i ${n} filer + version.json`);
  }
  const found=scan(),want=readVersion();
  for(const [v,files] of found)console.log((v===want?'OK   ':'FEL  ')+v+'  '+[...new Set(files)].length+' filer');
  const bi=fs.readFileSync(path.join(root,'build-info.mjs'),'utf8').match(/GAME_VERSION='([^']*)'/)?.[1];
  if(bi!==want){console.error('build-info.mjs har '+bi+', version.json har '+want);process.exit(1);}
  if(found.size!==1||!found.has(want)){console.error('Blandade cache-nycklar — kör: node tools/set-version.mjs '+want);process.exit(1);}
}
