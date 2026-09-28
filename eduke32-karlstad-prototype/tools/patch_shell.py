#!/usr/bin/env python3
from pathlib import Path
import argparse, html

TOUCH_HTML = r'''
<div id="kcBrand"><b>KARLSTAD CITY · BUILD PROTOTYP</b><span>STORA TORGET → MITT I CITY</span></div>
<div id="kcTouch">
  <div id="kcStick"><i></i></div>
  <div id="kcBtns">
    <button data-key="Tab" data-code="Tab" data-kc="9">KARTA</button>
    <button data-key=" " data-code="Space" data-kc="32">USE</button>
    <button data-key="a" data-code="KeyA" data-kc="65">JUMP</button>
    <button data-key="Control" data-code="ControlLeft" data-kc="17" class="fire">FIRE</button>
  </div>
</div>
'''

TOUCH_CSS = r'''
#kcBrand{position:fixed;left:50%;top:max(8px,env(safe-area-inset-top));transform:translateX(-50%);z-index:50;background:#05090dcc;border:1px solid #f2c40066;border-radius:10px;padding:7px 12px;color:#fff;text-align:center;pointer-events:none;font:800 11px/1.05 system-ui;letter-spacing:.08em}
#kcBrand b{display:block;color:#f2c400}#kcBrand span{display:block;margin-top:4px;font-size:8px;color:#ffffffa9}
#kcTouch{display:none}
@media(pointer:coarse){
  #canvas{touch-action:none}
  #kcTouch{display:block;position:fixed;inset:0;z-index:45;pointer-events:none}
  #kcStick{position:absolute;left:max(18px,env(safe-area-inset-left));bottom:max(22px,calc(env(safe-area-inset-bottom) + 22px));width:150px;height:150px;border:2px solid #ffffff38;border-radius:50%;background:#07121877;pointer-events:auto;touch-action:none}
  #kcStick i{position:absolute;width:56px;height:56px;left:47px;top:47px;border-radius:50%;background:#ffffff48;border:1px solid #fff8;box-shadow:0 6px 30px #0008}
  #kcBtns{position:absolute;right:max(18px,env(safe-area-inset-right));bottom:max(20px,calc(env(safe-area-inset-bottom) + 20px));display:grid;grid-template-columns:repeat(2,74px);gap:10px;pointer-events:auto}
  #kcBtns button{height:62px;border-radius:16px;border:1px solid #ffffff45;background:#071218d8;color:#fff;font:900 11px/1 system-ui;letter-spacing:.08em;touch-action:none}
  #kcBtns .fire{background:#6d2925d8;border-color:#d5685d66}
  #gear,#mute,#fs{z-index:60!important}
}
'''

TOUCH_JS = r'''
<script>
(function(){
  var active = new Set();
  var codes = {
    ArrowUp:38, ArrowDown:40, ArrowLeft:37, ArrowRight:39,
    ShiftLeft:16, Space:32, Tab:9, ControlLeft:17, KeyA:65
  };
  function send(code, down, key, keyCode){
    if(down && active.has(code)) return;
    if(!down && !active.has(code)) return;
    if(down) active.add(code); else active.delete(code);
    var ev = new KeyboardEvent(down?'keydown':'keyup',{bubbles:true,cancelable:true,key:key||code,code:code});
    try{Object.defineProperty(ev,'keyCode',{get:function(){return keyCode||codes[code]||0}});Object.defineProperty(ev,'which',{get:function(){return keyCode||codes[code]||0}})}catch(e){}
    document.dispatchEvent(ev); window.dispatchEvent(ev);
  }
  function clearMove(){
    ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft'].forEach(function(c){send(c,false,c,codes[c])});
  }
  var stick=document.getElementById('kcStick'),knob=stick&&stick.querySelector('i'),pid=null;
  function move(x,y){
    var r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=x-cx,dy=y-cy,max=r.width*.32,len=Math.hypot(dx,dy)||1;
    if(len>max){dx*=max/len;dy*=max/len;len=max}
    knob.style.transform='translate('+dx+'px,'+dy+'px)';
    var nx=dx/max,ny=dy/max,mag=Math.min(1,len/max),dead=.22;
    send('ArrowUp',ny<-dead,'ArrowUp',38);send('ArrowDown',ny>dead,'ArrowDown',40);
    send('ArrowLeft',nx<-dead,'ArrowLeft',37);send('ArrowRight',nx>dead,'ArrowRight',39);
    send('ShiftLeft',mag>.82,'Shift',16);
  }
  if(stick){
    stick.addEventListener('pointerdown',function(e){e.preventDefault();pid=e.pointerId;stick.setPointerCapture(pid);move(e.clientX,e.clientY)});
    stick.addEventListener('pointermove',function(e){if(e.pointerId!==pid)return;e.preventDefault();move(e.clientX,e.clientY)});
    function end(e){if(pid!==null&&e.pointerId!==pid)return;pid=null;knob.style.transform='';clearMove()}
    stick.addEventListener('pointerup',end);stick.addEventListener('pointercancel',end);
  }
  document.querySelectorAll('#kcBtns button').forEach(function(b){
    var code=b.dataset.code,key=b.dataset.key,kc=+b.dataset.kc;
    b.addEventListener('pointerdown',function(e){e.preventDefault();b.setPointerCapture(e.pointerId);send(code,true,key,kc)});
    var up=function(e){e.preventDefault();send(code,false,key,kc)};
    b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);
  });
})();
</script>
'''

LOADER_JS = r'''
  function loadKarlstadMap() {
    if (!Module.addRunDependency || !Module.FS) return;
    Module.addRunDependency('karlstad-map');
    fetch('KARLSTAD.MAP?v=' + (window.__BUILD__ || 'dev'), {cache:'no-cache'})
      .then(function(r){ if(!r.ok) throw new Error('KARLSTAD.MAP '+r.status); return r.arrayBuffer(); })
      .then(function(buf){ Module.FS.writeFile('/KARLSTAD.MAP', new Uint8Array(buf)); })
      .catch(function(e){ console.error('[Karlstad] map load failed', e); })
      .finally(function(){ try{Module.removeRunDependency('karlstad-map')}catch(e){} });
  }
'''

def patch(src: str) -> str:
    src = src.replace('<title>Duke Nukem 3D (WebAssembly)</title>', '<title>Karlstad City — BUILD/EDuke32 WASM Prototype</title>')
    src = src.replace('Duke Nukem 3D in your browser: EDuke32 on WebAssembly with serverless peer-to-peer multiplayer. Co-op and deathmatch over WebRTC, no servers, no install - shareware included.',
                      'Karlstad City movement prototype running on EDuke32/BUILD via WebAssembly. Local Karlstad OSM geometry is converted to a BUILD v7 user map.')
    if '</style>' in src:
        src = src.replace('</style>', TOUCH_CSS + '\n</style>', 1)
    # Add prototype HUD/touch controls immediately before the engine scripts.
    marker = '<script type="module" src="eduke32-net.js?v=__BUILD_ID__"></script>'
    if marker in src:
        src = src.replace(marker, TOUCH_HTML + '\n' + TOUCH_JS + '\n' + marker, 1)
    else:
        src = src.replace('</body>', TOUCH_HTML + '\n' + TOUCH_JS + '\n</body>', 1)

    if 'var Module = {' not in src:
        raise RuntimeError('Could not find Module definition')
    src = src.replace('  var Module = {', LOADER_JS + '\n  var Module = {', 1)

    old = "var a = ['-nosetup'];"
    if old not in src:
        raise RuntimeError('Could not find EDuke32 argument list')
    src = src.replace(old, "var a = ['-nosetup','-nologo','-map','KARLSTAD.MAP'];", 1)

    old_pre = '    preRun: [function () {'
    if old_pre not in src:
        raise RuntimeError('Could not find preRun')
    src = src.replace(old_pre, '    preRun: [loadKarlstadMap, function () {', 1)

    # Keep classic pixels sharp but not forced blocky scaling on modern screens.
    src = src.replace('image-rendering:pixelated;', 'image-rendering:auto;')
    return src

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--infile',required=True)
    ap.add_argument('--outfile',required=True)
    args=ap.parse_args()
    src=Path(args.infile).read_text(encoding='utf-8')
    Path(args.outfile).write_text(patch(src),encoding='utf-8')

if __name__=='__main__':
    main()
