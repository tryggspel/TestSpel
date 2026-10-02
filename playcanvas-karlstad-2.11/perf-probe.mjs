// ?perf — mäter riktiga frametider på enheten under en fast period.
// Tanken: öppna spelet med ?perf på en iPhone 11, gå samma runda varje gång (t.ex. Torget →
// Mitt i City → Sandgrund) och jämför siffrorna mellan releaser. Mätningen använder
// performance.now() mellan frames, inte motorns dt (som PlayCanvas klipper vid 100 ms).
export function percentile(sorted,p){
  if(!sorted.length)return 0;
  const i=Math.min(sorted.length-1,Math.max(0,Math.ceil(p/100*sorted.length)-1));
  return sorted[i];
}
export function createPerfProbe({seconds=60,warmup=3}={}){
  const frames=[],draws=[];let elapsed=0,last=null,done=false,report=null;
  function sample(nowMs,drawCalls){
    if(done)return null;
    if(last===null){last=nowMs;return null;}
    const ms=nowMs-last;last=nowMs;
    if(!(ms>0)||ms>5000)return null; // flik i bakgrunden: räkna inte
    elapsed+=ms/1000;
    if(elapsed<warmup)return null;
    frames.push(ms);if(Number.isFinite(drawCalls))draws.push(drawCalls);
    if(elapsed>=warmup+seconds){done=true;report=summarize();return report;}
    return null;
  }
  function summarize(){
    const s=[...frames].sort((a,b)=>a-b),total=frames.reduce((a,b)=>a+b,0);
    const r=v=>Math.round(v*10)/10;
    return {
      seconds:r(total/1000),frames:frames.length,avgFps:r(frames.length/(total/1000||1)),
      p50:r(percentile(s,50)),p95:r(percentile(s,95)),p99:r(percentile(s,99)),max:r(s[s.length-1]||0),
      over33ms:frames.filter(v=>v>33.4).length,over50ms:frames.filter(v=>v>50).length,
      drawCallsAvg:draws.length?Math.round(draws.reduce((a,b)=>a+b,0)/draws.length):null,
      drawCallsMax:draws.length?Math.max(...draws):null
    };
  }
  return {sample,summarize,get done(){return done;},get report(){return report;},get progress(){return Math.max(0,Math.min(1,(elapsed-warmup)/seconds));}};
}
export function mountPerfOverlay(doc,probe,extra=()=>({})){
  const box=doc.createElement('div');box.id='perfProbe';
  box.style.cssText='position:fixed;z-index:99;left:max(8px,env(safe-area-inset-left));bottom:max(8px,env(safe-area-inset-bottom));padding:8px 10px;border-radius:10px;background:#071015e6;color:#cfe;font:600 12px/1.4 ui-monospace,monospace;pointer-events:auto;max-width:92vw';
  box.textContent='PERF: värmer upp…';doc.body.appendChild(box);
  let shown=false;
  function update(){
    if(probe.done&&!shown){
      shown=true;const r={...probe.report,...extra()};
      console.table?.(r);console.log('[perf]',JSON.stringify(r));
      box.innerHTML='';const pre=doc.createElement('pre');pre.style.cssText='margin:0 0 6px;white-space:pre-wrap';
      pre.textContent=`${r.avgFps} fps snitt · p50 ${r.p50} ms · p95 ${r.p95} ms · p99 ${r.p99} ms\nmax ${r.max} ms · >33 ms: ${r.over33ms} · >50 ms: ${r.over50ms}\ndraw calls ${r.drawCallsAvg??'–'} (max ${r.drawCallsMax??'–'}) · DPR ${r.dpr??'–'}`;
      const b=doc.createElement('button');b.textContent='KOPIERA RESULTAT';b.style.cssText='font:800 12px system-ui;padding:8px 10px;border-radius:8px;border:0;background:#f5c860;color:#193c2f';
      b.onclick=()=>{navigator.clipboard?.writeText(JSON.stringify(r,null,2)).then(()=>{b.textContent='KOPIERAT ✓';}).catch(()=>{b.textContent='SE KONSOLEN';});};
      box.append(pre,b);
    }else if(!probe.done)box.textContent='PERF: mäter… '+Math.round(probe.progress*100)+'%';
  }
  return {update};
}
