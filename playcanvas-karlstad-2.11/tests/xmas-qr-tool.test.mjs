// tools/xmas-qr/lib.mjs: adressen i QR-bilden, läsningen av koder.csv, kontrollen mot bygget (QR_CODES) och PIN:en. Verktyget make.mjs (poster, check) bygger på de här funktionerna.
// Inga riktiga koder finns i repot: proven gör egna koder och egna listor.
import test from 'node:test';
import assert from 'node:assert/strict';
import {validBase,cleanBase,posterUrl,parseCodesCsv,matchCodes,checkPin} from '../tools/xmas-qr/lib.mjs';
import {codeHash,pinHash,normalizeCode} from '../xmas/xmas-hash.mjs';

const CODES=['ABCD2345EFGH','JKLM6789NPQR','STUV2345WXYZ'];

test('adressen: https, utan avslutande snedstreck, och koden går in som ?paket=',()=>{
  for(const ok of ['https://karlstad-julklappsjakten.vercel.app','https://julklappsjakten.example/','https://exempel.se/jul/'])assert.ok(validBase(ok),ok);
  for(const bad of ['http://exempel.se','exempel.se','https://exempel .se','','https://','javascript:alert(1)','https://exempel.se/?x=1'])assert.ok(!validBase(bad),bad);
  assert.equal(cleanBase('https://exempel.se//'),'https://exempel.se');
  assert.equal(posterUrl('https://exempel.se/',CODES[0]),'https://exempel.se/?paket='+CODES[0]);
  assert.equal(posterUrl('https://exempel.se/jul',CODES[1]),'https://exempel.se/jul/?paket='+CODES[1]);
});

test('koder.csv läses med rubrikrad, CRLF och BOM; koden normaliseras; felen nämner rad men aldrig koden',()=>{
  const csv='﻿etikett;kod;adress\r\nJulgransrabatt;'+CODES[0]+';https://gammal.example/?paket='+CODES[0]+'\r\n\r\nTorget;'+CODES[1].toLowerCase().replace(/(.{4})(?=.)/g,'$1-')+';\r\n';
  const rows=parseCodesCsv(csv,normalizeCode);
  assert.deepEqual(rows,[{label:'Julgransrabatt',code:CODES[0]},{label:'Torget',code:CODES[1]}]);
  assert.deepEqual(parseCodesCsv('Torget;'+CODES[2]+'\n',normalizeCode),[{label:'Torget',code:CODES[2]}],'rubrikraden är valfri och adressen behövs inte');
});
test('koder.csv: för kort kod, dubblett och tom fil avvisas utan att koden skrivs ut',()=>{
  const bad=(csv,re)=>assert.throws(()=>parseCodesCsv(csv,normalizeCode),e=>re.test(e.message)&&!CODES.some(c=>e.message.includes(c)),csv);
  bad('etikett;kod;adress\nA;KORT;x\n',/Rad 2/);
  bad('etikett;kod;adress\nA;'+CODES[0]+';x\nB;'+CODES[0]+';y\n',/Rad 3: samma kod två gånger/);
  bad('',/tom/);
  bad('etikett;kod;adress\n',/Inga koder/);
  bad('etikett;kod;adress\nbara-en-kolumn\n',/Rad 2/);
  bad(CODES[0]+'\n',/Rad 1: förväntade etikett;kod;adress/);
});

test('kontroll mot bygget: vilka koder som finns, saknas och inte finns i filen (bara radnummer och id)',()=>{
  const qr=[{h:codeHash(CODES[0]),id:'affisch-1',reward:{coupon:'rabatt'}},{h:codeHash(CODES[1]),id:'affisch-2',reward:{}},{h:codeHash('ZZZZ2345ZZZZ'),id:'affisch-9'}];
  const rows=CODES.map(code=>({label:'A',code}));
  const m=matchCodes(rows,qr,codeHash);
  assert.deepEqual(m.found,[{row:1,id:'affisch-1',coupon:'rabatt'},{row:2,id:'affisch-2',coupon:''}]);
  assert.deepEqual(m.missing,[{row:3}]);
  assert.deepEqual(m.notInFile,['affisch-9']);
  assert.ok(!JSON.stringify(m).includes(CODES[0]),'inga koder i resultatet');
  assert.deepEqual(matchCodes(rows,[],codeHash).missing.length,3);
});

test('PIN: rätt, fel och okänd kupong',()=>{
  const coupons=[{id:'rabatt',pin:pinHash('rabatt','4711')}];
  assert.deepEqual(checkPin('rabatt','4711',coupons,pinHash),{ok:true});
  assert.deepEqual(checkPin('rabatt','4712',coupons,pinHash),{ok:false,reason:'pin'});
  assert.deepEqual(checkPin('annan','4711',coupons,pinHash),{ok:false,reason:'okand'});
  assert.deepEqual(checkPin('rabatt','4711',[{id:'rabatt'}],pinHash),{ok:false,reason:'pin'},'en kupong utan PIN kan inte lösas in');
});
