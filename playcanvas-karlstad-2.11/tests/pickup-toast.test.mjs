import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Plockrutan (#journeyPickupToast, "+25 KAFFEPOÄNG · +15 SOL") ska på en telefon vara en enrads ping på 26 px, aldrig en hög lila ruta över gatan.
// Felet i 2.21.1: pingen låg bara bakom max-width:850px. En liggande telefon bredare än så (iPhone 11 är 896x414, Pro Max och nyare 926-956 px, iPhone 15/16 Pro 852-874 px)
// fick den liggande placeringen top:77px tillsammans med bottom:24% från compact-hud.css och rutan sträcktes till 222-248 px höjd.
// Testet läser mediefrågorna i last-round.css och räknar ut vilka skärmar som får pingen. Själva utseendet i webbläsaren provas med tools/pickup-toast/check.mjs.
const css=fs.readFileSync(new URL('../last-round.css',import.meta.url),'utf8');
const compact=fs.readFileSync(new URL('../compact-hud.css',import.meta.url),'utf8');

// Alla @media-block (utan nästling i den här filen): fråga och innehåll.
function mediaBlocks(src){
  const out=[];let i=0;
  while((i=src.indexOf('@media',i))>=0){
    const open=src.indexOf('{',i);let depth=1,j=open+1;
    while(j<src.length&&depth>0){const c=src[j++];if(c==='{')depth++;else if(c==='}')depth--;}
    out.push({query:src.slice(i+6,open).trim(),body:src.slice(open+1,j-1)});i=j;
  }
  return out;
}
// Minimal utvärdering av de mediefunktioner som används här: min/max-width/height, pointer, orientation; "," är eller, "and" är och.
function matches(query,vp){
  return query.split(',').some(part=>part.split(/\sand\s|\)\s*and\s*\(/i).every(raw=>{
    const f=raw.replace(/[()]/g,'').trim();const m=f.match(/^(min|max)-(width|height):\s*(\d+)px$/);
    if(m){const v=vp[m[2]==='width'?'w':'h'];return m[1]==='min'?v>=+m[3]:v<=+m[3];}
    if(f==='pointer:coarse')return vp.coarse;
    const o=f.match(/^orientation:\s*(\w+)$/);if(o)return (vp.w>vp.h?'landscape':'portrait')===o[1];
    throw new Error('mediafunktion som testet inte kan: '+f);
  }));
}
const blocks=mediaBlocks(css);
const ping=blocks.find(b=>b.body.includes('#journeyPickupToast')&&b.body.includes('height:26px!important'));
const landscape=blocks.find(b=>b.body.includes('#journeyPickupToast')&&b.body.includes('top:77px!important'));

// CSS-pixlar för vanliga telefoner (liggande och stående), med pekskärm.
const LANDSCAPE=[[568,320,'iPhone SE (1)'],[667,375,'iPhone SE (2), 8'],[780,360,'Android 19.5:9'],[800,360,'Galaxy S20'],[812,375,'iPhone X, 11 Pro, 12 mini, 13 mini'],[844,390,'iPhone 12, 13, 14'],
  [852,393,'iPhone 15, 16'],[874,402,'iPhone 16 Pro'],[896,414,'iPhone 11, XR, XS Max'],[915,412,'Pixel 7'],[926,428,'iPhone 12/13 Pro Max, 14 Plus'],[932,430,'iPhone 14/15 Pro Max'],[956,440,'iPhone 16 Pro Max']];
const PORTRAIT=[[320,568,'iPhone SE (1)'],[360,640,'Android'],[375,667,'iPhone SE (2), 8'],[390,844,'iPhone 12, 13, 14'],[393,852,'iPhone 15, 16'],[414,896,'iPhone 11, XR'],[430,932,'iPhone 14/15 Pro Max']];

test('hittar pingens och den liggande placeringens regler i last-round.css',()=>{
  assert.ok(ping,'regeln med height:26px!important för #journeyPickupToast saknas');
  assert.ok(landscape,'regeln med top:77px!important för liggande telefon saknas');
});

test('pingen på 26 px gäller varje liggande telefon, oavsett bredd (felet: 852-956 px föll utanför max-width:850px)',()=>{
  for(const [w,h,name] of LANDSCAPE)assert.ok(matches(ping.query,{w,h,coarse:true}),`${name} (${w}x${h}) får inte pingen: "${ping.query}"`);
});

test('pingen på 26 px gäller varje stående telefon',()=>{
  for(const [w,h,name] of PORTRAIT)assert.ok(matches(ping.query,{w,h,coarse:true}),`${name} (${w}x${h}) får inte pingen: "${ping.query}"`);
});

test('den liggande placeringen gäller varje liggande telefon',()=>{
  for(const [w,h,name] of LANDSCAPE)assert.ok(matches(landscape.query,{w,h,coarse:true}),`${name} (${w}x${h}) får inte den liggande placeringen: "${landscape.query}"`);
});

test('pingen släpper bottom och höjd (annars sträcks rutan mellan top och bottom:24% från compact-hud.css)',()=>{
  assert.match(compact,/\.round-playing #journeyPickupToast\{top:auto;bottom:24%/,'förutsättningen för testet: compact-hud.css sätter bottom:24%');
  assert.match(ping.body,/bottom:auto!important/);
  assert.match(ping.body,/height:26px!important/);
  assert.match(ping.body,/min-height:26px!important/);
});

test('pingen är en enda rad som slutar med tre punkter, inte en flexlåda som klipper båda ändar',()=>{
  // I en flexlåda med justify-content:center klipps en lång text i båda ändar och poängen först i texten försvinner; text-overflow fungerar bara i en blocklåda.
  assert.match(ping.body,/white-space:nowrap/);
  assert.match(ping.body,/text-overflow:ellipsis/);
  assert.match(ping.body,/overflow:hidden/);
  assert.doesNotMatch(ping.body,/display:flex/);
  assert.doesNotMatch(ping.body,/justify-content:center/);
  assert.match(ping.body,/line-height:24px!important/,'radhöjden fyller rutan (26 px minus 1 px kant på båda sidor)');
});

test('liggande ping ligger mitt i bild uppe, ryms mellan HUD och radar och får växa med texten upp till en gräns',()=>{
  assert.match(landscape.body,/top:77px!important/);
  assert.match(landscape.body,/left:50%!important/);
  assert.match(landscape.body,/width:max-content!important/);
  const max=landscape.body.match(/max-width:clamp\((\d+)px,calc\(100vw - (\d+)px\),(\d+)px\)!important/);
  assert.ok(max,'max-width med clamp() saknas');
  const [min,margin,cap]=[+max[1],+max[2],+max[3]];
  assert.ok(min>=184&&cap<=360,'gränserna ska vara 184-360 px');
  // Vänsterkanten (50vw - bredd/2) ska aldrig hamna över HUD:en (högerkant 240 px) och kompassraden (högst 262 px): marginalen 2*vänsterkant.
  assert.ok(margin/2>=262,'vänsterkanten ligger för nära HUD:en: '+margin/2+' px');
});
