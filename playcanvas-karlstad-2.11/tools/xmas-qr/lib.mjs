// Rena hjälpfunktioner till tools/xmas-qr/make.mjs: ingen qrcode-generator och inget filsystem, så att de går att testa (tests/xmas-qr-tool.test.mjs).
// Inget här skriver ut en kod: felmeddelanden och sammanfattningar nämner bara radnummer och id.

export const BASE_RE=/^https:\/\/[a-z0-9.-]+(\/[\w./-]*)?$/i;
export const cleanBase=s=>String(s||'').replace(/\/+$/,'');
export const validBase=s=>BASE_RE.test(cleanBase(s));
// Adressen en QR-kod pekar på. Koden löses in på just den adressen (?paket=KOD), så den skrivs in i QR-bilden och ändras om spelet flyttas.
export const posterUrl=(base,code)=>cleanBase(base)+'/?paket='+code;

// koder.csv (etikett;kod;adress, med rubrikrad; CRLF och BOM går bra). normalize = normalizeCode ur xmas-hash.mjs. Returnerar [{label,code}] eller kastar ett Error med radnummer.
export function parseCodesCsv(text,normalize){
  const lines=String(text||'').replace(/^﻿/,'').split(/\r?\n/).filter(l=>l.trim());
  if(!lines.length)throw new Error('Filen är tom.');
  const head=lines[0].toLowerCase().split(';').map(s=>s.trim());
  const body=head[0]==='etikett'&&head[1]==='kod'?lines.slice(1):lines;
  const offset=body.length===lines.length?1:2; // radnummer i filen (rubrikraden är rad 1)
  const rows=[],seen=new Set();
  body.forEach((l,i)=>{
    const cols=l.split(';'),n=i+offset;
    if(cols.length<2)throw new Error('Rad '+n+': förväntade etikett;kod;adress.');
    const code=normalize(cols[1]);
    if(!/^[A-Z0-9]{12}$/.test(code))throw new Error('Rad '+n+': koden ska vara 12 tecken (bokstäver och siffror).');
    if(seen.has(code))throw new Error('Rad '+n+': samma kod två gånger.');
    seen.add(code);rows.push({label:cols[0].trim()||'Affisch '+(i+1),code});
  });
  if(!rows.length)throw new Error('Inga koder i filen.');
  return rows;
}

// Vilka koder i filen som finns i bygget (QR_CODES) och vilka koder i bygget som saknas i filen. hashOf = codeHash ur xmas-hash.mjs.
export function matchCodes(rows,qr,hashOf){
  const known=new Map((qr||[]).map(q=>[q.h,q]));
  const found=[],missing=[];
  rows.forEach((r,i)=>{
    const q=known.get(hashOf(r.code));
    if(q)found.push({row:i+1,id:q.id,coupon:(q.reward&&q.reward.coupon)||''});else missing.push({row:i+1});
  });
  const have=new Set(found.map(f=>f.id));
  return {found,missing,notInFile:(qr||[]).filter(q=>!have.has(q.id)).map(q=>q.id)};
}

// Stämmer PIN:en med kupongens kontrollsumma i COUPONS? pinHashOf = pinHash ur xmas-hash.mjs.
export function checkPin(couponId,pin,coupons,pinHashOf){
  const c=(coupons||[]).find(x=>x&&x.id===couponId);
  if(!c)return {ok:false,reason:'okand'};
  return pinHashOf(couponId,pin)===c.pin?{ok:true}:{ok:false,reason:'pin'};
}
