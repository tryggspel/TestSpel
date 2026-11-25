// Anmälan till dragningen om en julgran (Julklappsjakten). POST /api/xmas-draw med {v:1, name, contact, guardian:true, consent:true, tickets:[…], facts:{grade,days,streak}}.
// Sparar en anmälan per kontaktuppgift i ett PRIVAT Vercel Blob-lager (access:'private': inga publika adresser). Samma kontakt som skickar in fler lotter slås ihop med sin tidigare anmälan.
// Kräver miljövariabeln BLOB_READ_WRITE_TOKEN (skapas när lagret kopplas till projektet) och att PRIZE.ready är sant i xmas/xmas-meta-config.mjs. Annars svarar funktionen 503 och spelet visar bara lotterna.
// All kontroll ligger i xmas/xmas-draw-server.mjs (ren modul, testad utan nät). Här finns bara det som rör HTTP och lagringen. Inget loggas som innehåller personuppgifter, och IP-adresser sparas aldrig.
import {validateBody,mergeEntry,entryPath,MAX_BODY} from '../xmas/xmas-draw-server.mjs?v=2.21.1-xmas.16';

// Enkel spärr i minnet mot en som skickar om och om igen (gäller per instans, så det är ett skydd mot misstag och slarv, inte mot en beslutsam angripare).
const hits=new Map();
export function throttled(key,now=Date.now(),{max=12,windowMs=10*60*1000}={}){
  const list=(hits.get(key)||[]).filter(t=>now-t<windowMs);
  list.push(now);hits.set(key,list);
  if(hits.size>5000)for(const [k,v] of hits)if(!v.length||now-v[v.length-1]>windowMs)hits.delete(k);
  return list.length>max;
}

// Hela anmälan, utan HTTP: store = {read(path) → {data,etag}|null, write(path,data,etag) → true|false (false = någon annan hann före, försök igen)}.
export async function handleEntry(body,{store,now=Date.now(),prize}={}){
  const v=validateBody(body,{now,...(prize?{prize}:{})});
  if(!v.ok)return {status:v.status,json:{ok:false,error:v.error}};
  const path=entryPath(v.value.contact);
  for(let attempt=0;attempt<4;attempt++){
    const cur=await store.read(path);
    const m=mergeEntry(cur&&cur.data,v.value,now);
    if(await store.write(path,m.entry,cur?cur.etag:null))return {status:200,json:{ok:true,stored:m.added,total:m.total}};
  }
  return {status:503,json:{ok:false,error:'fel'}};
}

// Lagringen: Vercel Blob (privat). @vercel/blob laddas först när en anmälan kommer, så att allt annat går att testa utan paketet.
export function blobStore(){
  let sdk=null;const load=async()=>sdk||(sdk=await import('@vercel/blob'));
  return {
    async read(path){
      const {get}=await load();
      const r=await get(path,{access:'private',useCache:false});
      if(!r||r.statusCode!==200)return null;
      return {data:JSON.parse(await new Response(r.stream).text()),etag:r.blob.etag};
    },
    async write(path,data,etag){
      const {put}=await load();
      try{
        await put(path,JSON.stringify(data),{access:'private',contentType:'application/json',addRandomSuffix:false,...(etag?{ifMatch:etag}:{allowOverwrite:false})});
        return true;
      }catch(e){
        const msg=String(e&&e.message||'');
        if((e&&e.name==='BlobPreconditionFailedError')||/already exists|precondition/i.test(msg))return false; // någon annan hann före: läs om och slå ihop på nytt
        throw e;
      }
    }
  };
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'POST only'});}
  const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'?').split(',')[0].trim();
  if(throttled(ip))return res.status(429).json({ok:false,error:'for_manga'});
  let body=req.body;
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{body=null;}}
  let size=0;try{size=JSON.stringify(body??null).length;}catch{size=MAX_BODY+1;}
  if(size>MAX_BODY)return res.status(413).json({ok:false,error:'ogiltig'});
  if(!process.env.BLOB_READ_WRITE_TOKEN)return res.status(503).json({ok:false,error:'ej_redo'});
  try{
    const r=await handleEntry(body,{store:blobStore()});
    return res.status(r.status).json(r.json);
  }catch(e){
    console.error('[xmas-draw]',String(e&&e.message||e).slice(0,200)); // aldrig förfrågans innehåll
    return res.status(500).json({ok:false,error:'fel'});
  }
}
