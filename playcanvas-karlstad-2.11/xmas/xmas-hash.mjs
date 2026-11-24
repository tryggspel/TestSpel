// Kontrollsummor för hemliga koder (QR-affischer) och kupongernas PIN. Ren modul utan beroenden: SHA-256 i vanlig JavaScript, så att den fungerar synkront i alla webbläsare (även utan https)
// och i Node. Koderna står aldrig i klartext i bygget, bara som kontrollsumma (xmas-meta-config.mjs: QR_CODES, COUPONS).
// Det här är inte ett skydd mot någon som läser koden och provar sig fram med en dator: en kod ska vara lång nog (tools/xmas-qr ger 12 tecken, ca 60 bitar) och en PIN är bara en spärr mot att en kupong
// löses in av misstag eller av ett barn, inte ett kassaskåp.

const primes=[];for(let n=2;primes.length<64;n++)if(primes.every(p=>n%p))primes.push(n);
const frac=x=>x-Math.floor(x);
const K=Uint32Array.from(primes,p=>Math.floor(frac(Math.cbrt(p))*4294967296));
const H0=Uint32Array.from(primes.slice(0,8),p=>Math.floor(frac(Math.sqrt(p))*4294967296));
const rotr=(x,n)=>(x>>>n)|(x<<(32-n));

export function sha256(text){
  const msg=new TextEncoder().encode(String(text)),len=msg.length,total=((len+9+63)>>6)<<6,buf=new Uint8Array(total);
  buf.set(msg);buf[len]=0x80;
  const dv=new DataView(buf.buffer);
  dv.setUint32(total-8,Math.floor(len*8/4294967296));dv.setUint32(total-4,(len*8)>>>0);
  const h=Uint32Array.from(H0),w=new Uint32Array(64);
  for(let off=0;off<total;off+=64){
    for(let i=0;i<16;i++)w[i]=dv.getUint32(off+i*4);
    for(let i=16;i<64;i++){
      const a=w[i-15],b=w[i-2],s0=rotr(a,7)^rotr(a,18)^(a>>>3),s1=rotr(b,17)^rotr(b,19)^(b>>>10);
      w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;
    }
    let a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
    for(let i=0;i<64;i++){
      const S1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^(~e&g),t1=(hh+S1+ch+K[i]+w[i])>>>0;
      const S0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b)^(a&c)^(b&c),t2=(S0+maj)>>>0;
      hh=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    h[0]+=a;h[1]+=b;h[2]+=c;h[3]+=d;h[4]+=e;h[5]+=f;h[6]+=g;h[7]+=hh;
  }
  return Array.from(h,x=>x.toString(16).padStart(8,'0')).join('');
}

// En kod som någon skrivit eller skannat: stora bokstäver och siffror, utan mellanrum och streck ("ab12-cd34 ef56" och "AB12CD34EF56" är samma kod).
export const normalizeCode=s=>String(s??'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,40);
export const codeHash=code=>sha256('julklappsjakten|paket|'+normalizeCode(code));
// PIN-koden hör till en kupong (samma PIN på två kuponger ger olika kontrollsummor).
export const pinHash=(couponId,pin)=>sha256('julklappsjakten|pin|'+String(couponId)+'|'+String(pin??'').replace(/\D/g,'').slice(0,12));
