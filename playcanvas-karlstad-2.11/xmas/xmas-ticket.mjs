// Lottkoder till dragningen: T-XXXX-XXXX. Ren modul (används både av spelet och av servern, api/xmas-draw.mjs). Sju slumpade tecken och ett kontrolltecken, så att en felskriven kod fångas.
// Kontrolltecknet är ingen hemlighet och ingen säkerhet: den som läser koden kan göra egna lotter. Skyddet mot fusk är att vinnaren kontrolleras före utlämning (XMAS-SPELDESIGN.md, avsnitt 6).
import {TICKETS} from './xmas-meta-config.mjs?v=2.21.1-xmas.13';

const A=TICKETS.alphabet;
const idx=ch=>A.indexOf(ch);
// Vikterna är udda (och alfabetet har 32 tecken), så varje ensam felskriven bokstav ändrar summan och fångas.
const check=body=>{let s=0;for(let i=0;i<body.length;i++)s+=idx(body[i])*(i*2+3);return A[s%A.length];};

// rng() ger ett tal i [0,1). I spelet är det Math.random.
export function makeTicket(rng=Math.random){
  let body='';for(let i=0;i<7;i++)body+=A[Math.min(A.length-1,Math.floor(rng()*A.length))];
  const all=body+check(body);
  return 'T-'+all.slice(0,4)+'-'+all.slice(4);
}
const SHAPE=new RegExp('^T-['+A+']{4}-['+A+']{4}$');
export function validTicket(code){
  if(typeof code!=='string'||!SHAPE.test(code))return false;
  const body=(code.slice(2,6)+code.slice(7)).slice(0,7);
  return check(body)===code[10];
}
// Det någon skrivit in: stora bokstäver, med eller utan streck och mellanrum. Returnerar en giltig kod eller ''.
export function cleanTicket(s){
  const t=String(s??'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(t.length!==9||t[0]!=='T')return '';
  const code='T-'+t.slice(1,5)+'-'+t.slice(5);
  return validTicket(code)?code:'';
}
