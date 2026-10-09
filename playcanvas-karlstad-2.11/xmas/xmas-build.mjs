// Julgrenen: vilket bygge körs? Versionen står i koden (build-info.mjs). Commit-ID:t kommer från den deployade miljön
// (api/build-info.mjs, Vercels systemvariabler) så att det alltid hör ihop med filerna i samma deployment.
// Lokalt och på sidor utan funktionen visas bara versionen, och det sägs rakt ut.
import {GAME_VERSION,GAME_TITLE,GAME_FLAVOR,GAME_BASE} from '../build-info.mjs?v=2.21.1-xmas.5';

export const shortCommit=c=>typeof c==='string'&&/^[0-9a-f]{7,40}$/i.test(c)?c.slice(0,7).toLowerCase():null;
export const baseStamp=Object.freeze({version:GAME_VERSION,title:GAME_TITLE,flavor:GAME_FLAVOR,base:GAME_BASE.version,baseCommit:shortCommit(GAME_BASE.commit),commit:null,short:null,branch:null,environment:null,source:'lokalt'});
// Läs deployens commit. Tål att funktionen saknas (lokal server, GitHub Pages) och att svaret är trasigt.
export async function loadBuildStamp({fetchImpl=globalThis.fetch,url='./api/build-info',timeoutMs=1500}={}){
  if(typeof fetchImpl!=='function')return baseStamp;
  let timer=null;
  try{
    const ctl=typeof AbortController==='function'?new AbortController():null;
    if(ctl)timer=setTimeout(()=>ctl.abort(),timeoutMs);
    const r=await fetchImpl(url,{cache:'no-store',signal:ctl?.signal});
    if(!r||!r.ok)return baseStamp;
    const j=await r.json();
    const short=shortCommit(j?.commit);
    if(!short)return baseStamp;
    return Object.freeze({...baseStamp,commit:String(j.commit).toLowerCase(),short,branch:typeof j.branch==='string'?j.branch.slice(0,80):null,environment:typeof j.environment==='string'?j.environment.slice(0,20):null,source:'vercel'});
  }catch{return baseStamp;}
  finally{if(timer)clearTimeout(timer);}
}
export const buildLabel=s=>s.version+(s.short?' · '+s.short:' · lokalt bygge');
export const buildDetail=s=>s.title+' · bygge '+buildLabel(s)+' · bas '+s.base+(s.baseCommit?' ('+s.baseCommit+')':'');
