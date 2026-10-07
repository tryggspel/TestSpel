// Ett gemensamt ljudsystem för hela spelet.
//
// Varför: iOS Safari ignorerar HTMLAudioElement.volume (den är alltid 1). I 2.9.0 betydde det
// att mute, crossfades och "tyst bakgrundsmusik" inte fungerade på iPhone: huvudtemat och
// zombietemat spelades samtidigt på full volym. Här går all volym via GainNode, som fungerar
// likadant i alla webbläsare. Utan Web Audio faller vi tillbaka till element.volume.
//
// Graf:  <audio> → MediaElementSource → spårGain → musicBus ┐
//        oscillatorer (sfx) ─────────────────────→ sfxBus   ┴→ master → destination
export const MUTE_KEY='karlstad:muted:1';

export function createAudioEngine({
  makeContext=()=>{const AC=globalThis.AudioContext||globalThis.webkitAudioContext;return AC?new AC():null;},
  makeElement=src=>{const a=new Audio(src);a.preload='auto';a.playsInline=true;a.crossOrigin='anonymous';return a;},
  storage=null,
  timers={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id)}
}={}){
  let ctx=null,master=null,musicBus=null,sfxBus=null,triedContext=false;
  let muted=false;
  try{muted=storage?.getItem(MUTE_KEY)==='on';}catch{}
  const tracks=new Map();

  function context(){
    if(!triedContext){
      triedContext=true;
      try{ctx=makeContext();}catch{ctx=null;}
      if(ctx){
        master=ctx.createGain();master.gain.value=muted?0:1;master.connect(ctx.destination);
        musicBus=ctx.createGain();musicBus.connect(master);
        sfxBus=ctx.createGain();sfxBus.connect(master);
        for(const t of tracks.values())wire(t);
      }
    }
    return ctx;
  }
  function wire(t){
    if(!ctx||t.gain)return;
    try{
      const src=ctx.createMediaElementSource(t.el);
      t.gain=ctx.createGain();t.gain.gain.value=t.level;
      src.connect(t.gain);t.gain.connect(musicBus);
      t.el.volume=1;
    }catch{t.gain=null;}
  }
  // iOS lägger kontexten i 'suspended'/'interrupted' efter samtal, låsskärm och bakgrund.
  function resume(){const c=context();if(c&&c.state!=='running'&&c.state!=='closed'){try{const p=c.resume();p?.catch?.(()=>{});}catch{}}}

  function track(name,src,{loop=false}={}){
    const el=makeElement(src);el.loop=loop;
    const t={name,el,level:0,gain:null,pauseTimer:0};
    el.volume=0;tracks.set(name,t);wire(t);
    return t;
  }
  function level(name){return tracks.get(name)?.level??0;}
  // Mjuk övergång till en nivå 0..1. Nivån sparas alltid, även när ljudet är avstängt,
  // så att rätt mix kommer tillbaka när spelaren slår på ljudet igen.
  function fade(name,to,ms=650,{pauseAfter=false}={}){
    const t=tracks.get(name);if(!t)return;
    const target=Math.max(0,Math.min(1,Number(to)||0));t.level=target;
    timers.clear(t.pauseTimer);t.pauseTimer=0;
    if(t.gain&&ctx){
      const g=t.gain.gain,now=ctx.currentTime;
      try{g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);g.linearRampToValueAtTime(target,now+Math.max(.01,ms/1000));}catch{g.value=target;}
    }else{
      t.el.volume=muted?0:target; // reservväg utan Web Audio (fungerar inte på iOS, men bättre än inget)
    }
    if(pauseAfter&&target<=.001)t.pauseTimer=timers.set(()=>{if(t.level<=.001){try{t.el.pause();}catch{}}},ms+30);
  }
  function play(name,{restart=false}={}){
    const t=tracks.get(name);if(!t)return;
    resume();
    if(restart){try{t.el.currentTime=0;}catch{}}
    try{const p=t.el.play();p?.catch?.(()=>{});}catch{}
  }
  // Uppspelningshastighet för ett spår (1 = normal). Tonhöjden hålls där webbläsaren stöder det.
  function rate(name,r=1){const t=tracks.get(name);if(!t)return;const v=Math.max(.5,Math.min(2,Number(r)||1));try{t.el.preservesPitch=true;t.el.playbackRate=v;}catch{}}
  function stop(name){const t=tracks.get(name);if(!t)return;timers.clear(t.pauseTimer);t.level=0;if(t.gain)t.gain.gain.value=0;else t.el.volume=0;try{t.el.pause();t.el.currentTime=0;}catch{}}
  function setMuted(v){
    muted=!!v;
    try{storage?.setItem(MUTE_KEY,muted?'on':'off');}catch{}
    if(master&&ctx){const g=master.gain,now=ctx.currentTime;try{g.cancelScheduledValues(now);g.setValueAtTime(g.value,now);g.linearRampToValueAtTime(muted?0:1,now+.12);}catch{g.value=muted?0:1;}}
    else for(const t of tracks.values())t.el.volume=muted?0:t.level;
  }
  // Korta syntljud. Respekterar mute (i 2.9.0 spelades plockljudet även när ljudet var av).
  function blip({type='triangle',from=440,to=660,peak=.055,attack=.01,length=.14}={}){
    if(muted)return;
    const c=context();if(!c)return;resume();
    try{
      const now=c.currentTime,o=c.createOscillator(),g=c.createGain();
      o.type=type;o.frequency.setValueAtTime(from,now);o.frequency.exponentialRampToValueAtTime(Math.max(1,to),now+length*.78);
      g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(peak,now+attack);g.gain.exponentialRampToValueAtTime(.0001,now+length);
      o.connect(g);g.connect(sfxBus);o.start(now);o.stop(now+length+.02);
    }catch{}
  }
  return Object.freeze({
    context,resume,track,fade,play,stop,level,setMuted,blip,rate,
    get muted(){return muted;},
    get routed(){return [...tracks.values()].every(t=>!!t.gain);},
    snapshot:()=>({context:ctx?.state??'none',muted,routed:[...tracks.values()].every(t=>!!t.gain),levels:Object.fromEntries([...tracks].map(([k,t])=>[k,+t.level.toFixed(3)]))})
  });
}
