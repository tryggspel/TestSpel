#!/usr/bin/env node
// Dragningen om en julgran: bygger lottpoolen ur anmälningarna och drar en vinnare (och reserver) på ett sätt som vem som helst kan räkna om.
//
//   1. Hämta anmälningarna (en JSON-fil per kontakt) ur Vercel Blob till en katalog:   node tools/xmas-draw/export.mjs --out=draw-out/entries
//   2. Pool och kontroll (publicera poolens kontrollsumma FÖRE dragningen):             node tools/xmas-draw/pick.mjs pool --in=draw-out/entries
//   3. Dragning (seed = en text som ingen kan känna till i förväg, till exempel tärningsslag, eller dagens slutkurs, sagd högt):
//                                                                                        node tools/xmas-draw/pick.mjs draw --in=draw-out/entries --seed="..." [--reserves=2] [--skip-flagged]
//   4. Kontrollera vinnaren (nedan) och kontakta hen. Publicera draw-out/offentligt-bevis.json: den innehåller lottkoder men inga kontaktuppgifter.
//
// Utdatakatalogen (draw-out/) innehåller kontaktuppgifter och är ignorerad av git: checka aldrig in den, och radera allt efter att dragningen är klar (PRIZE.keepUntil i xmas/xmas-meta-config.mjs).
// Så dras vinnaren: lotterna sorteras, och för räknare i = 0, 1, 2 … tas index = SHA-256(seed | poolens kontrollsumma | i) mod antal lotter. En person kan bara vinna en gång (ägarens nästa träff hoppas över).
// Samma lott i två anmälningar räknas för den som skickade in den först; de andra ligger i "konflikter" så att du kan titta på dem (en familj som delar en telefon kan ha skickat in samma lotter med två kontakter).
// Det här ersätter inte kontrollen av vinnaren: spelarens lotter ligger på hens enhet och går att fabricera (XMAS-SPELDESIGN.md, avsnitt 6). Titta på vinnarens anmälan (flaggor, grad, dagar, antal lotter) innan du ringer.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const {sha256}=await import(pathToFileURL(path.join(root,'xmas/xmas-hash.mjs')).href);
const {validTicket}=await import(pathToFileURL(path.join(root,'xmas/xmas-ticket.mjs')).href);

// entries: [{owner, data:{name,contact,tickets,facts,first,flags,...}}]. Returnerar poolen, konflikter och flaggade anmälningar.
export function buildPool(entries,{skipFlagged=false}={}){
  const order=[...entries].sort((a,b)=>String(a.data.first||'').localeCompare(String(b.data.first||''))||String(a.owner).localeCompare(String(b.owner)));
  const owner=new Map(),conflicts=[],flagged=[];let used=0;
  for(const e of order){
    const flags=Array.isArray(e.data.flags)?e.data.flags:[];
    if(flags.length)flagged.push({owner:e.owner,flags,tickets:(e.data.tickets||[]).length,facts:e.data.facts||null});
    if(skipFlagged&&flags.length)continue;
    used++;
    for(const code of new Set(Array.isArray(e.data.tickets)?e.data.tickets:[])){
      if(!validTicket(code))continue;
      if(owner.has(code)){if(owner.get(code)!==e.owner)conflicts.push({code,keptBy:owner.get(code),alsoIn:e.owner});continue;}
      owner.set(code,e.owner);
    }
  }
  const tickets=[...owner].map(([code,o])=>({code,owner:o})).sort((a,b)=>a.code<b.code?-1:a.code>b.code?1:0);
  return {tickets,entries:used,conflicts,flagged,poolHash:sha256(tickets.map(t=>t.code).join('\n'))};
}
// Drar count vinnare. Resultat: [{rank, code, owner, index, counter}]. Bevisen räknas om av verifyDraw.
export function drawWinners(pool,seed,count=1){
  const n=pool.tickets.length,out=[],owners=new Set();
  if(!n||!String(seed||'').length)return out;
  for(let i=0;out.length<count&&i<n*4+50;i++){
    const idx=Number(BigInt('0x'+sha256(String(seed)+'|'+pool.poolHash+'|'+i))%BigInt(n)),t=pool.tickets[idx];
    if(owners.has(t.owner))continue;
    owners.add(t.owner);out.push({rank:out.length,code:t.code,owner:t.owner,index:idx,counter:i});
  }
  return out;
}
// Räknar om en dragning utan kontaktuppgifter: bara lottkoderna (sorterade), seed och poolens kontrollsumma. owners = vem som äger varje lott (för regeln en vinst per person), eller utelämnad om du bara vill kontrollera indexen.
export function verifyDraw({codes,seed,poolHash,winners,owners=null}){
  const sorted=[...codes];
  if(sha256(sorted.join('\n'))!==poolHash)return {ok:false,reason:'poolens kontrollsumma stämmer inte med lotterna'};
  const pool={tickets:sorted.map(code=>({code,owner:owners?owners[code]:code})),poolHash};
  const again=drawWinners(pool,seed,winners.length);
  const same=again.length===winners.length&&again.every((w,i)=>w.code===winners[i].code&&w.index===winners[i].index&&w.counter===winners[i].counter);
  return same?{ok:true}:{ok:false,reason:'dragningen ger andra vinnare vid omräkning'};
}

// ── Kommandorad ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function readEntries(dir){
  if(!dir||!fs.existsSync(dir))throw new Error('--in saknas eller katalogen finns inte (kör export.mjs först)');
  const out=[];
  for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort()){
    try{const data=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));if(data&&typeof data==='object'&&Array.isArray(data.tickets))out.push({owner:f.replace(/\.json$/,''),data});}catch{console.error('Hoppar över en trasig fil: '+f);}
  }
  return out;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2),cmd=args[0],opt=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const i=a.indexOf('=');return i<0?[a.slice(2),'1']:[a.slice(2,i),a.slice(i+1)];}));
  const out=path.resolve(opt.out||'draw-out');
  try{
    if(cmd!=='pool'&&cmd!=='draw')throw new Error('Använd: pool --in=katalog  eller  draw --in=katalog --seed="…". Se överst i filen.');
    const entries=readEntries(opt.in),pool=buildPool(entries,{skipFlagged:!!opt['skip-flagged']});
    fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'pool.json'),JSON.stringify({poolHash:pool.poolHash,entries:pool.entries,tickets:pool.tickets,conflicts:pool.conflicts,flagged:pool.flagged},null,1));
    console.log(`Anmälningar: ${entries.length} (${pool.entries} med i poolen) · lotter i poolen: ${pool.tickets.length}`);
    console.log(`Poolens kontrollsumma (publicera före dragningen): ${pool.poolHash}`);
    if(pool.flagged.length)console.log(`\nFlaggade anmälningar (${pool.flagged.length}): kontrollera dem, särskilt om en vinnare finns bland dem:\n`+pool.flagged.map(f=>`  ${f.owner}  ${f.flags.join(',')}  ${f.tickets} lotter  ${JSON.stringify(f.facts)}`).join('\n'));
    if(pool.conflicts.length)console.log(`\nSamma lott i flera anmälningar (${pool.conflicts.length}); den som skickade först behåller den:\n`+pool.conflicts.slice(0,20).map(c=>`  ${c.code}  behålls av ${c.keptBy}, finns också i ${c.alsoIn}`).join('\n'));
    if(cmd==='draw'){
      if(!opt.seed)throw new Error('--seed saknas: en text som ingen kunde känna till före dragningen.');
      const count=1+Math.max(0,Math.min(10,Math.floor(Number(opt.reserves))||0)),winners=drawWinners(pool,opt.seed,count);
      if(!winners.length)throw new Error('Poolen är tom.');
      const byOwner=new Map(entries.map(e=>[e.owner,e.data]));
      const priv=winners.map(w=>({...w,name:byOwner.get(w.owner)?.name,contact:byOwner.get(w.owner)?.contact,flags:byOwner.get(w.owner)?.flags,facts:byOwner.get(w.owner)?.facts,tickets:byOwner.get(w.owner)?.tickets?.length}));
      fs.writeFileSync(path.join(out,'resultat-privat.json'),JSON.stringify({seed:opt.seed,poolHash:pool.poolHash,winners:priv},null,1));
      fs.writeFileSync(path.join(out,'offentligt-bevis.json'),JSON.stringify({seed:opt.seed,poolHash:pool.poolHash,codes:pool.tickets.map(t=>t.code),winners:winners.map(({rank,code,index,counter})=>({rank,code,index,counter}))},null,1));
      console.log(`\nVinnare: ${priv[0].code}  ${priv[0].name}  ${priv[0].contact}${priv[0].flags?.length?'  FLAGGAD: '+priv[0].flags.join(','):''}`);
      for(const r of priv.slice(1))console.log(`Reserv ${r.rank}: ${r.code}  ${r.name}  ${r.contact}${r.flags?.length?'  FLAGGAD: '+r.flags.join(','):''}`);
      console.log(`\nSkrivet i ${out}: resultat-privat.json (kontaktuppgifter, dela inte) och offentligt-bevis.json (lottkoder, seed och kontrollsumma: går att räkna om).`);
      console.log('Kontrollera vinnarens anmälan (flaggor, grad, dagar, antal lotter) innan du tar kontakt. Vid tveksamhet: ta reserv 1.');
    }
  }catch(e){console.error(e.message);process.exit(2);}
}
