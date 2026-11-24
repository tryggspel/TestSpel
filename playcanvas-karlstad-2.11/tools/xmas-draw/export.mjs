#!/usr/bin/env node
// Hämtar (och efter dragningen raderar) anmälningarna till dragningen ur det privata Vercel Blob-lagret. Körs lokalt av arrangören, aldrig i spelet.
//
//   cd playcanvas-karlstad-2.11 && npm install                                       (en gång: hämtar @vercel/blob)
//   BLOB_READ_WRITE_TOKEN=… node tools/xmas-draw/export.mjs --out=draw-out/entries     hämtar alla anmälningar (en JSON per kontakt)
//   BLOB_READ_WRITE_TOKEN=… node tools/xmas-draw/export.mjs --delete --yes             RADERAR alla anmälningar (gör det när dragningen är klar, senast PRIZE.keepUntil)
//
// Nyckeln (BLOB_READ_WRITE_TOKEN) finns i Vercel: Storage → ditt Blob-lager → .env.local. Den är en hemlighet: skriv den inte i en fil som checkas in.
// Utdatakatalogen innehåller kontaktuppgifter och är ignorerad av git.
import fs from 'node:fs';
import path from 'node:path';
const args=process.argv.slice(2),opt=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const i=a.indexOf('=');return i<0?[a.slice(2),'1']:[a.slice(2,i),a.slice(i+1)];}));
const fail=m=>{console.error(m);process.exit(2);};
if(!process.env.BLOB_READ_WRITE_TOKEN)fail('BLOB_READ_WRITE_TOKEN saknas (se överst i filen).');
let sdk;try{sdk=await import('@vercel/blob');}catch{fail('Saknar @vercel/blob. Kör: cd playcanvas-karlstad-2.11 && npm install');}
const {list,get,del}=sdk;
const blobs=[];let cursor;
do{const page=await list({prefix:'draw/',cursor,limit:500});blobs.push(...page.blobs);cursor=page.hasMore?page.cursor:undefined;}while(cursor);
console.log(`Anmälningar i lagret: ${blobs.length}`);
if(opt.delete){
  if(!opt.yes)fail('Det här raderar alla anmälningar för gott. Lägg till --yes om du är säker (hämta dem först och dra klart).');
  if(blobs.length)await del(blobs.map(b=>b.url));
  console.log('Raderade '+blobs.length+' anmälningar.');
}else{
  const out=path.resolve(opt.out||'draw-out/entries');fs.mkdirSync(out,{recursive:true});
  for(const b of blobs){
    const r=await get(b.pathname,{access:'private',useCache:false});
    if(!r||r.statusCode!==200){console.error('Kunde inte läsa '+b.pathname);continue;}
    fs.writeFileSync(path.join(out,path.basename(b.pathname)),await new Response(r.stream).text());
  }
  console.log('Skrev '+blobs.length+' filer i '+out+'. Nästa steg: node tools/xmas-draw/pick.mjs pool --in='+path.relative(process.cwd(),out));
}
