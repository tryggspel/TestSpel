#!/usr/bin/env node
// Hemliga paket (QR på affischer i butiksfönster) och kuponger: skapar koder, kontrollsummor till spelets konfiguration och ett utskrivbart blad med QR-koder.
//
//   cd tools/xmas-qr && npm install                         (en gång: hämtar qrcode-generator, bara för det här verktyget)
//   node tools/xmas-qr/make.mjs koder --base=https://din-adress.vercel.app --labels="Affisch Torget,Affisch Tingvalla,Fönstret på Kungsgatan" [--xp=30 --orn=rare --tickets=1 --coupon=<kupongens-id> --lead="Text under rubriken"] [--out=qr-out]
//   node tools/xmas-qr/make.mjs pin <kupongens-id> <pin>    (kontrollsumman till en kupong, se COUPONS i xmas/xmas-meta-config.mjs)
//   node tools/xmas-qr/make.mjs poster --from=qr-out/koder.csv --base=https://nya-adressen [--lead="…"] [--out=qr-out/ny-adress]
//                                                           (samma koder, nytt blad: när spelet flyttas till en annan adress; kontrollsummorna i spelet ändras inte)
//   node tools/xmas-qr/make.mjs check --from=qr-out/koder.csv [--pin=<pin> --coupon=<kupongens-id>]
//                                                           (finns koderna och PIN:en fortfarande i bygget? skriver aldrig ut en kod; avslutar med fel om något saknas)
//
// koder skriver fyra filer i --out (standard qr-out/, som är ignorerad av git):
//   koder.csv        etikett;kod;adress   KLARTEXT: dela den inte och checka aldrig in den
//   qr-config.txt    raderna som klistras in i QR_CODES i xmas/xmas-meta-config.mjs (bara kontrollsummor, ingen kod i klartext)
//   affischer.html   utskrivbara blad (A4, fyra QR-koder per sida) med etikett, kod i klartext för den som skriver in den och spelets text
//   lead.txt         raden under rubriken på affischen (poster använder den igen om --lead saknas)
// Adressen (--base) ska vara den där spelet faktiskt ligger när affischerna sätts upp: QR-bilden innehåller adressen, och koden löses in på just den adressen (?paket=KOD). Koderna blir giltiga först när qr-config.txt är inlagd i spelet och
// bygget är publicerat. En kod går bara att lösa in en gång per enhet. 12 slumpade tecken (ca 60 bitar) ur ett alfabet utan förväxlingsbara tecken.
// Koderna hör till spelets kod (kontrollsummorna i QR_CODES), inte till adressen: flyttas spelet följer samma koder med, och bara bladet behöver göras om (poster).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..');
const {codeHash,pinHash,normalizeCode}=await import(pathToFileURL(path.join(root,'xmas/xmas-hash.mjs')).href);
const {validBase,cleanBase,posterUrl,parseCodesCsv,matchCodes,checkPin}=await import(pathToFileURL(path.join(here,'lib.mjs')).href);

const args=process.argv.slice(2),cmd=args[0],opt=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const i=a.indexOf('=');return i<0?[a.slice(2),'1']:[a.slice(2,i),a.slice(i+1)];}));
const fail=m=>{console.error(m);process.exit(2);};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// --config=<fil> byter ut spelets konfiguration (bara för prov: samma exporter som xmas/xmas-meta-config.mjs)
const config=await import(pathToFileURL(opt.config?path.resolve(String(opt.config)):path.join(root,'xmas/xmas-meta-config.mjs')).href);
const {TICKETS}=config;

const DEFAULT_LEAD='Skanna och hitta ett hemligt julpaket i Julklappsjakten.';
const cleanLead=s=>String(s).replace(/\s+/g,' ').trim().slice(0,160);
const needBase=()=>{const b=cleanBase(opt.base);if(!validBase(b))fail('--base ska vara adressen spelet ligger på, med https:// (till exempel https://din-adress.vercel.app).');return b;};
async function loadQr(){try{return (await import('qrcode-generator')).default;}catch{fail('Saknar qrcode-generator. Kör först: cd tools/xmas-qr && npm install');}}

// Utskrivbara blad: fyra affischer per A4. rows = [{label,code,url}]
function sheetHtml(rows,base,lead,qrcode){
  const svg=url=>{const q=qrcode(0,'M');q.addData(url);q.make();return q.createSvgTag({cellSize:8,margin:2,scalable:true});};
  const tile=r=>`<section class="tile"><div class="qr">${svg(r.url)}</div><h2>${esc(r.label)}</h2><p class="lead">${esc(lead)}</p><p class="code">Kod: <b>${r.code.replace(/(.{4})(?=.)/g,'$1-')}</b></p><p class="url">${esc(base.replace(/^https:\/\//,''))}</p></section>`;
  return `<!doctype html><html lang="sv"><meta charset="utf-8"><title>Affischer: hemliga paket</title>
<style>@page{size:A4;margin:10mm}body{font:16px/1.3 system-ui,sans-serif;margin:0;color:#111}.sheet{display:grid;grid-template-columns:1fr 1fr;gap:8mm;page-break-after:always}.tile{border:2px dashed #999;border-radius:8px;padding:8mm;text-align:center;break-inside:avoid}.qr svg{width:62mm;height:62mm}h2{margin:4mm 0 1mm;font-size:20px}.lead{margin:1mm 0;font-size:14px}.code{margin:3mm 0 0;font-size:13px}.code b{font-family:ui-monospace,Menlo,monospace;letter-spacing:.05em}.url{margin:1mm 0 0;font-size:11px;color:#666}</style>
<body>${Array.from({length:Math.ceil(rows.length/4)},(_,p)=>`<div class="sheet">${rows.slice(p*4,p*4+4).map(tile).join('')}</div>`).join('')}</body></html>`;
}
const csvText=rows=>'etikett;kod;adress\n'+rows.map(r=>[r.label.replace(/;/g,','),r.code,r.url].join(';')).join('\n')+'\n';

if(cmd==='pin'){
  const [,id,pin]=args.filter(a=>!a.startsWith('--'));
  if(!/^[a-z0-9-]{1,40}$/.test(id||''))fail('Kupongens id: små bokstäver, siffror och bindestreck, högst 40 tecken.');
  if(!/^\d{4,8}$/.test(pin||''))fail('PIN: 4–8 siffror.');
  console.log("pin: '"+pinHash(id,pin)+"'");
  process.exit(0);
}

// ── check: hör koderna och PIN:en fortfarande ihop med bygget? ────────────────────────────────────────────────────────────────
if(cmd==='check'||cmd==='poster'){
  if(!opt.from)fail('--from=<koder.csv> saknas.');
  let rows;
  try{rows=parseCodesCsv(fs.readFileSync(path.resolve(String(opt.from)),'utf8'),normalizeCode);}catch(e){fail('Kunde inte läsa '+opt.from+': '+e.message);}
  const m=matchCodes(rows,config.QR_CODES,codeHash);
  if(cmd==='check'){
    console.log(`Koder i filen: ${rows.length}. Finns i bygget (QR_CODES): ${m.found.length}. Saknas i bygget: ${m.missing.length}${m.missing.length?' (rad '+m.missing.map(x=>x.row).join(', ')+')':''}.`);
    if(m.notInFile.length)console.log(`Koder i bygget som saknas i filen: ${m.notInFile.length} (id: ${m.notInFile.join(', ')}): de går inte att skriva ut på nytt härifrån.`);
    const coupons=[...new Set(m.found.map(f=>f.coupon).filter(Boolean))];
    let bad=m.missing.length>0;
    for(const id of coupons){const ok=(config.COUPONS||[]).some(c=>c&&c.id===id);console.log(`Kupongen "${id}": ${ok?'finns i COUPONS':'SAKNAS i COUPONS (koderna delar ut en kupong som inte finns)'}`);if(!ok)bad=true;}
    if(opt.pin!==undefined){
      const id=String(opt.coupon||coupons[0]||'');
      const r=checkPin(id,String(opt.pin),config.COUPONS,pinHash);
      console.log(r.ok?`PIN: stämmer med kupongen "${id}".`:`PIN: stämmer INTE med kupongen "${id}"${r.reason==='okand'?' (kupongen finns inte)':''}.`);
      if(!r.ok)bad=true;
    }
    console.log(bad?'FEL: något hör inte ihop med bygget.':'OK: koderna'+(opt.pin!==undefined?' och PIN:en':'')+' hör ihop med bygget.');
    process.exit(bad?1:0);
  }
  // poster: samma koder, nytt blad
  if(m.missing.length)fail(`${m.missing.length} av ${rows.length} koder finns inte i bygget (QR_CODES), rad ${m.missing.map(x=>x.row).join(', ')}. Affischer med dem skulle inte fungera: kör check och kontrollera att rätt bygge ligger i mappen.`);
  const base=needBase();
  const csvDir=path.dirname(path.resolve(String(opt.from)));
  let lead=opt.lead!==undefined?cleanLead(opt.lead):'';
  if(opt.lead===undefined){try{lead=cleanLead(fs.readFileSync(path.join(csvDir,'lead.txt'),'utf8'));}catch{}}
  if(!lead)lead=DEFAULT_LEAD;
  const out=path.resolve(opt.out||path.join(csvDir,'ny-adress'));
  if(out===csvDir)fail('--out får inte vara samma mapp som koder.csv (den skulle skrivas över). Välj en ny mapp.');
  const qrcode=await loadQr();
  const posters=rows.map(r=>({label:r.label,code:r.code,url:posterUrl(base,r.code)}));
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'koder.csv'),csvText(posters));
  fs.writeFileSync(path.join(out,'affischer.html'),sheetHtml(posters,base,lead,qrcode));
  fs.writeFileSync(path.join(out,'lead.txt'),lead+'\n');
  console.log(`Klart: ${posters.length} affischer för ${base} i ${out}`);
  console.log('  koder.csv        KLARTEXT (samma koder, ny adress). Dela inte, checka inte in.');
  console.log('  affischer.html   öppna i en webbläsare och skriv ut (A4, fyra per sida). Spelet på den nya adressen måste ha samma QR_CODES och COUPONS som nu.');
  process.exit(0);
}

if(cmd!=='koder')fail('Använd: koder --base=… --labels="A,B,C"  |  pin <id> <pin>  |  poster --from=koder.csv --base=…  |  check --from=koder.csv [--pin=…]. Se överst i filen.');

const base=needBase();
const labels=String(opt.labels||'').split(',').map(s=>s.trim()).filter(Boolean);
if(!labels.length||labels.length>200)fail('--labels="Affisch 1,Affisch 2" (1–200 etiketter, en kod per etikett).');
const xp=opt.xp===undefined?30:Math.max(0,Math.min(500,Math.floor(Number(opt.xp))||0)),tickets=Math.max(0,Math.min(5,Math.floor(Number(opt.tickets??1))||0));
const orn=['common','rare','epic','legendary'].includes(opt.orn)?opt.orn:'rare';
// --coupon=<id>: koden delar också ut kupongen med det id:t (den måste finnas i COUPONS). --lead="text": raden under rubriken på affischen.
const coupon=opt.coupon===undefined?'':String(opt.coupon);
if(coupon&&!/^[a-z0-9-]{1,40}$/.test(coupon))fail('--coupon: kupongens id, små bokstäver, siffror och bindestreck, högst 40 tecken.');
const lead=opt.lead===undefined?DEFAULT_LEAD:cleanLead(opt.lead);
if(!lead)fail('--lead får inte vara tom.');
const out=path.resolve(opt.out||'qr-out');
const qrcode=await loadQr();

const A=TICKETS.alphabet,newCode=()=>Array.from(crypto.randomBytes(12),b=>A[b%A.length]).join('');
const seen=new Set(),rows=[];
labels.forEach((label,i)=>{
  let code;do{code=newCode();}while(seen.has(code));seen.add(code);
  const id='affisch-'+(i+1)+'-'+code.slice(0,3).toLowerCase();
  rows.push({id,label,code,url:posterUrl(base,code),h:codeHash(code)});
});
// kontroll: varje kod ger sin kontrollsumma, oavsett hur den skrivs
for(const r of rows){
  if(codeHash(r.code.toLowerCase().replace(/(.{4})/g,'$1-'))!==r.h)fail('Kontrollsumman ändras av streck och mellanrum: avbryter.');
  if(normalizeCode(r.code)!==r.code)fail('Koden normaliseras annorlunda än den skrivs: avbryter.');
}
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'koder.csv'),csvText(rows));
fs.writeFileSync(path.join(out,'qr-config.txt'),rows.map(r=>`  {h:'${r.h}',id:'${r.id}',label:${JSON.stringify(r.label.toUpperCase())},reward:{xp:${xp},orn:'${orn}'${tickets?',tickets:'+tickets:''}${coupon?",coupon:'"+coupon+"'":''}}},`).join('\n')+'\n');
fs.writeFileSync(path.join(out,'affischer.html'),sheetHtml(rows,base,lead,qrcode));
fs.writeFileSync(path.join(out,'lead.txt'),lead+'\n');
console.log(`Klart: ${rows.length} koder i ${out}`);
console.log('  koder.csv        KLARTEXT. Dela inte, checka inte in.');
console.log('  qr-config.txt    klistra in i QR_CODES (xmas/xmas-meta-config.mjs), publicera bygget, och först därefter sätts affischerna upp.');
console.log('  affischer.html   öppna i en webbläsare och skriv ut (A4, fyra per sida).');
console.log(`Belöning per kod: ${xp} XP, en ${orn} prydnad eller bättre${tickets?' och '+tickets+(tickets===1?' lott':' lotter'):''}${coupon?' och kupongen "'+coupon+'" (en per enhet)':''}.`);
