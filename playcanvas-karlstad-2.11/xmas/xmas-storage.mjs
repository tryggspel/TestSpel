// Julgrenen: egen sparning även om julspelet och grundspelet en dag skulle ligga på samma adress.
// Grundspelets nycklar börjar på "karlstad:" (framsteg, kontroller, ljud, stämplar). I julbygget får de prefixet "xmas:" innan de når
// webbläsarens lagring, så julspelet kan aldrig läsa, skriva eller radera grundspelets sparfiler. Julspelets egna nycklar ("karlstad-xmas:")
// rörs inte. På två olika adresser (som nu) är lagringen redan åtskild; det här är ett skydd i andra ledet.
export const XMAS_PREFIX='xmas:';
const GAME_KEY=k=>typeof k==='string'&&k.startsWith('karlstad:');

export function namespacedStorage(real,{prefix=XMAS_PREFIX}={}){
  const map=k=>GAME_KEY(k)?prefix+k:String(k);
  const own=k=>typeof k==='string'&&(k.startsWith(prefix)||k.startsWith('karlstad-xmas:'));
  const keys=()=>{const out=[];for(let i=0;i<real.length;i++){const k=real.key(i);if(own(k))out.push(k.startsWith(prefix)?k.slice(prefix.length):k);}return out;};
  return {
    getItem:k=>real.getItem(map(k)),
    setItem:(k,v)=>real.setItem(map(k),v),
    removeItem:k=>real.removeItem(map(k)),
    // Rensa bara julspelets egna nycklar, aldrig grundspelets.
    clear:()=>{for(const k of keys())real.removeItem(map(k));},
    key:i=>keys()[i]??null,
    get length(){return keys().length;}
  };
}

// Installerar skyddet på window.localStorage. Returnerar true om det lyckades. Om webbläsaren inte tillåter det (eller lagringen är
// blockerad) fortsätter spelet som vanligt: då gäller bara åtskillnaden mellan adresser.
export function installNamespacedStorage(win=globalThis.window){
  try{
    if(!win||win.__xmasStorage)return !!win?.__xmasStorage;
    const real=win.localStorage;if(!real)return false;
    const shim=namespacedStorage(real);
    Object.defineProperty(win,'localStorage',{configurable:true,enumerable:true,get:()=>shim});
    if(win.localStorage!==shim)return false;
    Object.defineProperty(win,'__xmasStorage',{value:true});
    return true;
  }catch{return false;}
}
