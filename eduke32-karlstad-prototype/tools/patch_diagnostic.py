#!/usr/bin/env python3
from pathlib import Path
import argparse

STYLE = r"""
<style id="e32-diag-style">
#e32Diag {
  position: fixed; left: 8px; right: 8px; top: max(8px, env(safe-area-inset-top));
  max-height: 58vh; overflow: auto; z-index: 99999;
  padding: 10px 12px; border: 1px solid #4f5968; border-radius: 10px;
  background: rgba(0,0,0,.88); color: #d9f7dc;
  font: 12px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre-wrap; word-break: break-word; pointer-events: auto;
}
#e32Diag strong { color:#ffd43b; }
</style>
<div id="e32Diag"><strong>EDuke32 iOS diagnostic</strong>\narming...</div>
"""

SCRIPT = r"""
<script id="e32-diag-script">
(function(){
  var el=document.getElementById('e32Diag');
  var lines=[];
  function add(kind,msg){
    var t=((performance.now()/1000).toFixed(2)+'s').padStart(7,' ');
    var s=t+' ['+kind+'] '+String(msg==null?'':msg);
    lines.push(s); if(lines.length>120) lines.shift();
    if(el){ el.textContent='EDuke32 iOS diagnostic\n'+lines.join('\n'); el.scrollTop=el.scrollHeight; }
    try{ console.log('[e32diag]',s); }catch(e){}
  }
  window.__e32diag=add;
  add('UA', navigator.userAgent);
  add('screen', (screen&&screen.width)+'x'+(screen&&screen.height)+' dpr='+(devicePixelRatio||1));
  add('viewport', innerWidth+'x'+innerHeight);
  add('wasm', typeof WebAssembly);
  add('mem', navigator.deviceMemory || 'n/a');

  window.addEventListener('error',function(e){
    add('window.error',(e.message||e.error||'')+' @ '+(e.filename||'')+':'+(e.lineno||0));
  });
  window.addEventListener('unhandledrejection',function(e){
    var r=e.reason; add('rejection',r&&r.stack?r.stack:(r&&r.message?r.message:r));
  });

  if(typeof Module!=='undefined'){
    var oldStatus=Module.setStatus;
    Module.setStatus=function(x){ add('status',x); if(oldStatus) try{return oldStatus.apply(this,arguments);}catch(e){add('status-hook',e);} };

    var oldMon=Module.monitorRunDependencies;
    Module.monitorRunDependencies=function(n){ add('deps',n); if(oldMon) try{return oldMon.apply(this,arguments);}catch(e){add('deps-hook',e);} };

    var oldPrint=Module.print;
    Module.print=function(x){ add('out',x); if(oldPrint) try{return oldPrint.apply(this,arguments);}catch(e){} };

    var oldErr=Module.printErr;
    Module.printErr=function(x){ add('err',x); if(oldErr) try{return oldErr.apply(this,arguments);}catch(e){} };

    var oldAbort=Module.onAbort;
    Module.onAbort=function(x){ add('ABORT',x); if(oldAbort) try{return oldAbort.apply(this,arguments);}catch(e){} };

    var oldExit=Module.onExit;
    Module.onExit=function(x){ add('EXIT',x); if(oldExit) try{return oldExit.apply(this,arguments);}catch(e){} };

    var oldInit=Module.onRuntimeInitialized;
    Module.onRuntimeInitialized=function(){
      add('runtime','initialized');
      try{
        var c=document.getElementById('canvas');
        add('canvas',c ? ('attr='+c.width+'x'+c.height+' css='+getComputedStyle(c).width+'x'+getComputedStyle(c).height) : 'missing');
      }catch(e){add('canvas-check',e);}
      if(oldInit) try{return oldInit.apply(this,arguments);}catch(e){ add('init-hook',e&&e.stack?e.stack:e); throw e; }
    };
  } else {
    add('fatal','Module missing before engine script');
  }

  [1000,3000,7000,15000].forEach(function(ms){
    setTimeout(function(){
      var c=document.getElementById('canvas');
      add('probe',ms+'ms canvas='+(c?(c.width+'x'+c.height):'missing')+
        ' moduleFS='+(!!(window.Module&&Module.FS))+
        ' ccall='+(!!(window.Module&&Module.ccall)));
    },ms);
  });
})();
</script>
"""

def patch(src: str) -> str:
    # Release HTML already contains a concrete build id (for example
    # ?v=44-37b56ee), not the __BUILD_ID__ placeholder used in source.
    # Insert immediately before the engine script regardless of its cache tag.
    needle = '<script src="eduke32.js?v='
    pos = src.find(needle)
    if pos < 0:
        needle = '<script src="eduke32.js"'
        pos = src.find(needle)
    if pos < 0:
        raise RuntimeError("Could not find eduke32.js engine script")
    return src[:pos] + STYLE + "\n" + SCRIPT + "\n" + src[pos:]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--infile',required=True)
    ap.add_argument('--outfile',required=True)
    args=ap.parse_args()
    src=Path(args.infile).read_text(encoding='utf-8')
    Path(args.outfile).write_text(patch(src),encoding='utf-8')

if __name__=='__main__':
    main()
