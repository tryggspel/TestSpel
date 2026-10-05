import test from 'node:test';
import assert from 'node:assert/strict';
import {REAL_BUSINESSES} from '../businesses.mjs';
import {BRAND_LOGO_IDS,hasBrandLogo,drawBrandLogo} from '../brand-logos.mjs';

// A recording 2D context: enough to prove a logo really paints something without a browser canvas.
function recorder(){
  const calls=[];
  return new Proxy({calls},{
    get:(t,k)=>k==='calls'?t.calls:(typeof k==='symbol'?undefined:(...a)=>{t.calls.push(k);}),
    set:(t,k,v)=>{t.calls.push('set:'+String(k));return true;},
    has:()=>true
  });
}

test('every real business has an original logotype',()=>{
  for(const b of REAL_BUSINESSES)assert.ok(hasBrandLogo(b.id),'no logo for '+b.id);
  assert.ok(BRAND_LOGO_IDS.length>=REAL_BUSINESSES.length);
});

test('solid and neon modes both paint, and neon adds a glow',()=>{
  for(const b of REAL_BUSINESSES){
    const solid=recorder(),neon=recorder();
    assert.equal(drawBrandLogo(solid,b.id,{w:900,h:200,mode:'solid',palette:b}),true);
    assert.equal(drawBrandLogo(neon,b.id,{w:900,h:200,mode:'neon',palette:b}),true);
    const paints=c=>c.calls.filter(k=>['fillText','strokeText','fill','stroke'].includes(k)).length;
    assert.ok(paints(solid)>0,b.id+' solid paints nothing');
    assert.ok(paints(neon)>paints(solid)*0.9,b.id+' neon should stroke as well');
    assert.ok(neon.calls.includes('set:shadowBlur'),b.id+' neon has no glow');
  }
});

test('unknown brands report false so callers can fall back to plain text',()=>{
  assert.equal(drawBrandLogo(recorder(),'finns-inte',{w:100,h:50}),false);
});

test('Rådhuscaféet is pulled out in front of the town hall pilasters; KICKS and Apoteket clear the Duvan columns',()=>{
  const by=id=>REAL_BUSINESSES.find(b=>b.id===id);
  assert.ok(by('radhuscafe').out>=2);
  assert.ok(by('kicks').out>0&&by('apoteket').out>0);
  assert.ok(Math.abs(by('kicks').shift)>=10&&Math.abs(by('apoteket').shift)>=10);
});
