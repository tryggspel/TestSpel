// Julklappsjakten: julens musik. Allt syntetiseras med Web Audio direkt i spelet (inga ljudfiler att ladda ner, ingen licens att oroa sig för,
// musiken startar på första tryck). Två stämningar delar samma notmaskin:
//   cozy  – klockspel, celesta och mjuka klingande toner i G-dur, med en lugn pad och skramlande bjällror (Julklappsjakten, rundor, fri vandring)
//   eerie – samma instrument men i e-moll, lägre tempo, lätt ostämda toner, bakvända klockor och en mörk puls (Tomtezombies)
// Musiken går genom spelets ordinarie ljudsystem (audio-engine.mjs): samma AudioContext, samma musikbuss, samma mute och samma återupptagning
// efter bakgrund och låsskärm. Högst fyra lager klingar samtidigt, noterna planeras 0,6 s i förväg och efter bakgrund börjar notmaskinen om från "nu"
// (ingen kö av gamla toner som kommer på en gång).
const MIDI=n=>440*Math.pow(2,(n-69)/12);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Enkel, deterministisk slump så att varje varv låter likadant (och så att test kan jämföra).
const rng=seed=>{let s=seed>>>0||1;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};

export const MOODS=Object.freeze({
  cozy:Object.freeze({
    bpm:92,level:.9,reverb:.3,
    // åtta takter, ackord som MIDI-toner (bas, ters, kvint, oktav)
    chords:Object.freeze([[43,47,50,55],[40,43,47,52],[48,52,55,60],[50,54,57,62],[43,47,50,55],[40,43,47,52],[45,48,52,57],[50,54,57,60]]),
    // klockspelets melodi: [steg i takten (åttondelar 0–7), MIDI, längd i åttondelar] per takt
    melody:Object.freeze([
      [[0,79,2],[2,83,2],[4,86,3]],[[0,88,2],[2,86,2],[4,83,3]],[[0,84,2],[2,88,2],[4,91,3]],[[0,90,2],[2,88,2],[4,86,3]],
      [[0,83,2],[2,86,2],[4,91,3]],[[0,88,2],[2,91,2],[4,88,3]],[[0,81,2],[2,84,2],[4,88,3]],[[0,86,3],[4,83,2],[6,79,2]]
    ]),
    arp:Object.freeze([0,1,2,1,3,2,1,2]),detune:0
  }),
  eerie:Object.freeze({
    bpm:66,level:1,reverb:.5,
    chords:Object.freeze([[40,43,47,52],[40,44,47,52],[36,40,43,48],[35,39,42,47],[40,43,47,52],[41,44,47,53],[45,48,52,57],[35,39,42,45]]),
    melody:Object.freeze([
      [[0,76,3]],[[2,75,3]],[[0,72,3],[5,71,2]],[[0,71,4]],[[0,76,3]],[[3,77,3]],[[0,72,2],[4,69,3]],[[0,71,2],[4,66,4]]
    ]),
    arp:Object.freeze([0,2,1,3,2,1,3,2]),detune:-18
  })
});

export function createXmasMusic({audio,storage=null,now=()=>performance.now()}={}){
  let ctx=null,out=null,layerBus={},verbIn=null,started=false,timer=0,mode='off',target='off',nextTime=0,step=0,duck=1,paused=false,hiddenAt=0;
  const stats={notes:0,scheduled:0,restarts:0,mode:'off'};
  let rand=rng(7);
  const makeIR=(c,seconds=2.4)=>{const n=Math.floor(c.sampleRate*seconds),buf=c.createBuffer(2,n,c.sampleRate),r=rng(99);for(let ch=0;ch<2;ch++){const d=buf.getChannelData(ch);for(let i=0;i<n;i++){const t=i/n;d[i]=(r()*2-1)*Math.pow(1-t,2.6);}}return buf;};

  function ensure(){
    const c=audio.context();if(!c)return false;
    if(ctx===c&&out)return true;
    ctx=c;
    out=c.createGain();out.gain.value=0;out.connect(audio.bus('music'));
    const verb=c.createConvolver();verb.buffer=makeIR(c);verbIn=c.createGain();verbIn.gain.value=1;verbIn.connect(verb);
    const wet=c.createGain();wet.gain.value=.55;verb.connect(wet);wet.connect(out);
    for(const m of Object.keys(MOODS)){const g=c.createGain();g.gain.value=0;g.connect(out);const send=c.createGain();send.gain.value=MOODS[m].reverb;g.connect(send);send.connect(verbIn);layerBus[m]=g;}
    return true;
  }
  // ── Instrument ─────────────────────────────────────────────────────────────────────────────────────────────────────
  function tone(m,t,freq,{type='sine',peak=.05,attack=.008,hold=0,decay=1.2,detune=0,partials=[]}={}){
    const bus=layerBus[m];if(!bus)return;
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+attack);
    if(hold>0)g.gain.setValueAtTime(peak,t+attack+hold);
    g.gain.exponentialRampToValueAtTime(.0001,t+attack+hold+decay);
    g.connect(bus);
    const voices=[{r:1,a:1},...partials];
    for(const v of voices){
      const o=ctx.createOscillator(),vg=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq*v.r,t);o.detune.value=detune;vg.gain.value=v.a;o.connect(vg);vg.connect(g);
      o.start(t);o.stop(t+attack+hold+decay+.05);
    }
    stats.notes++;
  }
  const celesta=(m,t,midi,vel=1,detune=0)=>tone(m,t,MIDI(midi),{peak:.055*vel,attack:.004,decay:1.1,detune,partials:[{r:4,a:.34},{r:6.2,a:.14},{r:9.1,a:.05}]});
  const bell=(m,t,midi,vel=1,detune=0,long=2.6)=>tone(m,t,MIDI(midi),{peak:.05*vel,attack:.003,decay:long,detune,partials:[{r:2.76,a:.35},{r:5.4,a:.14},{r:8.9,a:.05}]});
  function pad(m,t,chord,len,{dark=false,detune=0}={}){
    const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=dark?420:900;lp.Q.value=.5;lp.connect(layerBus[m]);
    chord.slice(0,3).forEach((n,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();o.type=dark?'sawtooth':'triangle';o.frequency.value=MIDI(n)*(i===0&&dark?.5:1);o.detune.value=detune+(i-1)*7;
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(dark?.016:.026,t+len*.3);g.gain.setValueAtTime(dark?.016:.026,t+len*.62);g.gain.exponentialRampToValueAtTime(.0001,t+len+.5);
      o.connect(g);g.connect(lp);o.start(t);o.stop(t+len+.6);
    });
    stats.notes+=3;
  }
  function jingle(m,t,vel=1){ // bjällror: en kort, ljus brusstöt
    const len=.09,b=ctx.createBuffer(1,Math.floor(ctx.sampleRate*len),ctx.sampleRate),d=b.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=(rand()*2-1)*Math.pow(1-i/d.length,2);
    const s=ctx.createBufferSource();s.buffer=b;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=6200+rand()*1400;f.Q.value=3.2;
    const g=ctx.createGain();g.gain.value=.05*vel;s.connect(f);f.connect(g);g.connect(layerBus[m]);s.start(t);stats.notes++;
  }
  function swell(m,t,midi,len=2.2,vel=1){ // bakvänd klocka: tonen växer upp till en mjuk topp
    const g=ctx.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05*vel,t+len);g.gain.exponentialRampToValueAtTime(.0001,t+len+.12);g.connect(layerBus[m]);
    for(const r of [1,2.76]){const o=ctx.createOscillator();o.type='sine';o.frequency.value=MIDI(midi)*r;o.detune.value=-14;const v=ctx.createGain();v.gain.value=r===1?1:.3;o.connect(v);v.connect(g);o.start(t);o.stop(t+len+.2);}
    stats.notes+=2;
  }
  function pulse(m,t,vel=1){ // mörk puls (hjärtslag)
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(78,t);o.frequency.exponentialRampToValueAtTime(42,t+.28);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.09*vel,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.42);o.connect(g);g.connect(layerBus[m]);o.start(t);o.stop(t+.45);stats.notes++;
  }

  // ── Notmaskin: en åttondel i taget ──────────────────────────────────────────────────────────────────────────────────
  function scheduleStep(m,s,t){
    const cfg=MOODS[m],bar=Math.floor(s/8)%8,eighth=s%8,beat=60/cfg.bpm,chord=cfg.chords[bar],eerie=m==='eerie',det=cfg.detune;
    if(eighth===0){
      pad(m,t,chord,beat*8,{dark:eerie,detune:det});
      if(!eerie||bar%2===0)bell(m,t,chord[0]+24,.8,det,eerie?4.2:2.8);
      if(eerie)pulse(m,t,.8);
    }
    if(eerie&&eighth===4&&bar%2===1)pulse(m,t,.5);
    // arpeggio (celesta): hela takten i det lugna läget, glest i det kusliga
    const idx=cfg.arp[eighth],note=chord[idx%chord.length]+(idx>=3?24:12)+12;
    if(!eerie||(eighth%2===0&&rand()<.55))celesta(m,t+(eerie?rand()*.04:0),clamp(note,64,96),(eighth%2?.55:.8)*(eerie?.7:1),det+(eerie?(rand()-.5)*22:0));
    for(const [at,midi,len] of cfg.melody[bar])if(at===eighth)bell(m,t,midi,.9,det,Math.min(3.4,len*beat*.6+1.6));
    if(!eerie&&(eighth===2||eighth===6||(eighth===7&&bar%2===1)))jingle(m,t,eighth===7?.5:.9);
    if(eerie&&eighth===6&&bar%4===3)swell(m,t,chord[2]+24,beat*2.4);
  }
  function tick(){
    if(!ctx||mode==='off')return;
    const cfg=MOODS[mode],half=60/cfg.bpm/2,horizon=ctx.currentTime+.6;
    if(nextTime<ctx.currentTime-.05){nextTime=ctx.currentTime+.05;stats.restarts++;} // efter bakgrund: börja om från nu, ingen kö av gamla toner
    while(nextTime<horizon){scheduleStep(mode,step,nextTime);nextTime+=half;step++;stats.scheduled++;}
  }
  function startTimer(){if(!timer){timer=setInterval(tick,120);}}
  function stopTimer(){if(timer){clearInterval(timer);timer=0;}}

  // ── Styrning ──────────────────────────────────────────────────────────────────────────────────────────────────────
  function fadeBus(m,to,secs){
    const g=layerBus[m]?.gain;if(!g)return;const t=ctx.currentTime;
    try{g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(to,t+Math.max(.02,secs));}catch{g.value=to;}
  }
  function applyDuck(secs=.35){if(!out)return;const t=ctx.currentTime;try{out.gain.cancelScheduledValues(t);out.gain.setValueAtTime(out.gain.value,t);out.gain.linearRampToValueAtTime(started?(paused?.42:1)*duck:0,t+secs);}catch{out.gain.value=(paused?.42:1)*duck;}}
  // Byter stämning med en mjuk övergång (cozy ↔ eerie). Första anropet efter ett tryck startar musiken direkt.
  function play(m='cozy'){
    if(!MOODS[m])return false;
    target=m;stats.mode=m;
    if(!ensure())return false;
    audio.resume();
    if(m===mode&&started)return true;
    const prev=mode;
    if(prev!=='off'&&prev!==m){
      fadeBus(prev,0,m==='eerie'?1.2:2.4);
      // det kusliga läget börjar med tre sjunkande klockor, så att bytet hörs
      if(m==='eerie'){const t=ctx.currentTime+.05;[88,85,80].forEach((n,i)=>bell('eerie',t+i*.32,n,.9,-22,3.4));}
    }
    mode=m;started=true;step=0;rand=rng(m==='eerie'?31:7);nextTime=ctx.currentTime+.06;
    fadeBus(m,MOODS[m].level,prev==='off'?.6:2.0);applyDuck(.6);
    tick();startTimer();return true;
  }
  function stop(secs=.8){
    if(mode==='off')return;
    for(const m of Object.keys(layerBus))fadeBus(m,0,secs);
    const old=mode;mode='off';started=false;setTimeout(()=>{if(mode==='off')stopTimer();},secs*1000+100);stats.mode='off';return old;
  }
  function setPaused(v){paused=!!v;applyDuck(.3);}
  // Tillbaka från bakgrunden: vänta på att kontexten går igång och börja om notmaskinen från "nu".
  function onVisibility(){
    if(typeof document==='undefined')return;
    if(document.hidden){hiddenAt=now();return;}
    if(mode!=='off'){audio.resume();if(ctx){nextTime=Math.max(nextTime,ctx.currentTime+.05);}startTimer();}
  }
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',onVisibility);
  return {play,stop,setPaused,ensure,tick,
    get mode(){return mode;},get started(){return started;},get ctx(){return ctx;},
    // Provkörning utan fördröjning: planerar sekunder av musik i taget (används av test med OfflineAudioContext).
    renderTo(m,seconds){if(!ensure())return false;mode=m;started=true;step=0;rand=rng(m==='eerie'?31:7);nextTime=0;layerBus[m].gain.value=MOODS[m].level;out.gain.value=1;
      const cfg=MOODS[m],half=60/cfg.bpm/2;while(nextTime<seconds){scheduleStep(m,step,nextTime);nextTime+=half;step++;stats.scheduled++;}return true;},
    snapshot:()=>({mode,started,paused,ctx:ctx?.state??'none',...stats})};
}
