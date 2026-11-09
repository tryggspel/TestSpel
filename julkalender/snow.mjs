// Fallande snö på en canvas. Lätt: några tiotal flingor, ingen fysik, pausar när fliken är dold.
// Med "minska rörelser" ritas flingorna en gång och står stilla.
export function startSnow(canvas,{reduced=false,max=120}={}){
  const ctx=canvas.getContext('2d');if(!ctx)return {stop(){}};
  let w=0,h=0,dpr=1,flakes=[],raf=0,last=0,running=true,seed=7;
  const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function resize(){
    dpr=Math.min(2,window.devicePixelRatio||1);w=window.innerWidth;h=window.innerHeight;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const n=Math.max(36,Math.min(max,Math.round(w*h/13000)));
    flakes=Array.from({length:n},()=>{const z=rnd();return {x:rnd()*w,y:rnd()*h,r:.8+z*2.6,v:14+z*46,sway:6+rnd()*18,ph:rnd()*6.28,a:.35+z*.55};});
    if(reduced)draw(0);
  }
  function draw(t){
    ctx.clearRect(0,0,w,h);
    for(const f of flakes){
      const x=f.x+Math.sin(t*.0006*f.sway/10+f.ph)*f.sway;
      ctx.globalAlpha=f.a;ctx.beginPath();ctx.arc(x,f.y,f.r,0,6.2832);ctx.fillStyle='#fff';ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  function frame(now){
    if(!running)return;
    const dt=Math.min(.05,(now-last)/1000||0);last=now;
    for(const f of flakes){f.y+=f.v*dt;if(f.y>h+6){f.y=-6;f.x=rnd()*w;}}
    draw(now);raf=requestAnimationFrame(frame);
  }
  const onVis=()=>{if(reduced)return;if(document.hidden){cancelAnimationFrame(raf);}else{last=performance.now();raf=requestAnimationFrame(frame);}};
  resize();window.addEventListener('resize',resize);document.addEventListener('visibilitychange',onVis);
  if(!reduced){last=performance.now();raf=requestAnimationFrame(frame);}
  return {stop(){running=false;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',onVis);ctx.clearRect(0,0,w,h);}};
}
