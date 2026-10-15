// Djuplänkar (xmas/xmas-deeplink.mjs): ?uppdrag=<nyckel>&lucka=<n> tar spelaren rakt till ett uppdrag i Julspelet. Modulen är ren; här provas länkarna, kortets innehåll mot sparningen och att spelet
// (xmas-boot.js, xmas-ui.js, index.html) hanterar allt modulen kan ge. Själva start av uppdragen i en webbläsare provas i tools/xmas-flow/links.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseLink,linkUrl,describeLink,isKnownKey,LINK_KEYS,LINK_PARAM,DOOR_PARAM} from '../xmas/xmas-deeplink.mjs';
import {XmasSave} from '../xmas/xmas-save.mjs';
import {RUSH_COUNT} from '../xmas/xmas-rushes.mjs';
import {ZOMBIE_MAX} from '../xmas/xmas-zombie-levels.mjs';
import {STAMPS} from '../xmas/xmas-config.mjs';

class Store{constructor(){this.m=new Map();}getItem(k){return this.m.has(k)?this.m.get(k):null;}setItem(k,v){this.m.set(k,String(v));}removeItem(k){this.m.delete(k);}}
const fresh=()=>new XmasSave(new Store());
const played=()=>{const s=fresh();s.stamp('intro');return s;};
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const ALL=[...LINK_KEYS,...Array.from({length:RUSH_COUNT},(_,i)=>'rush'+(i+1)),...Array.from({length:4},(_,i)=>'zombies'+(i+1))];

test('adressen: nyckel och lucka läses, resten ignoreras, och trasiga eller okända nycklar blir known:false',()=>{
  assert.equal(parseLink(''),null);assert.equal(parseLink('?utmaning=abc'),null);assert.equal(parseLink('?lucka=6'),null);
  assert.deepEqual(parseLink('?uppdrag=sandgrund&lucka=6'),{key:'sandgrund',door:6,known:true});
  assert.deepEqual(parseLink('?debug&uppdrag=rush3'),{key:'rush3',door:0,known:true});
  assert.deepEqual(parseLink('?uppdrag=SANDGRUND'),{key:'sandgrund',door:0,known:true},'versaler går bra');
  for(const d of ['0','25','-1','6.5','abc','','1e1','99']){const l=parseLink('?uppdrag=intro&lucka='+d);assert.equal(l.door,0,'lucka='+d);assert.equal(l.known,true);}
  assert.equal(parseLink('?uppdrag=intro&lucka=24').door,24);assert.equal(parseLink('?uppdrag=intro&lucka=1').door,1);
  for(const k of ['','x','../etc','<script>','rush0','rush13','rush100','zombies0','zombies100','zombies','rush-3','sandgrund2','intro1','nånting','a'.repeat(40),'rush 3'])
    assert.equal(parseLink('?uppdrag='+encodeURIComponent(k)).known,false,JSON.stringify(k));
  assert.equal(parseLink('?uppdrag=').key,'');
  assert.equal(isKnownKey('zombies99'),true);assert.equal(isKnownKey('rush12'),true);assert.equal(isKnownKey(null),false);assert.equal(isKnownKey(7),false);
});
test('linkUrl bygger adresser som parseLink läser tillbaka, relativt och absolut',()=>{
  for(const key of ALL)for(const door of [0,1,24]){
    for(const base of ['../','/','https://karlstad-julklappsjakten.vercel.app/']){
      const u=linkUrl(base,key,door),back=parseLink(new URL(u,'https://x.example/julkalender/').search);
      assert.deepEqual(back,{key,door,known:true},u);
    }
  }
  assert.equal(linkUrl('https://karlstad-julklappsjakten.vercel.app/?utmaning=x#h','rush3',6),'https://karlstad-julklappsjakten.vercel.app/?uppdrag=rush3&lucka=6','gamla frågetecken och ankare tas bort');
  assert.equal(LINK_PARAM,'uppdrag');assert.equal(DOOR_PARAM,'lucka');
});
test('varje nyckel ger ett kort med rubrik och text, utom de tre som öppnar en panel direkt',()=>{
  const direct=new Set(['rush','topplista','meny']);
  for(const key of ALL)for(const save of [fresh(),played()]){
    const d=describeLink(key,{save,door:7});assert.ok(d,key);
    assert.equal(d.key,key);assert.equal(d.kicker,'JULKALENDERN · LUCKA 7');assert.equal(describeLink(key,{save}).kicker,'JULSPELET');
    assert.equal(d.direct,direct.has(key),key);
    assert.ok(d.go&&typeof d.go.fn==='string',key);
    if(!d.direct){
      for(const f of ['title','line','button'])assert.ok(typeof d[f]==='string'&&d[f].length>3,`${key}.${f}`);
      assert.equal(d.title,d.title.toLocaleUpperCase('sv-SE'),`${key}: rubriken står med versaler som spelets övriga kort`);
      assert.ok(d.line.length<420,`${key}: texten ryms på en liten telefon`);assert.ok(d.title.length<=40,`${key}: rubriken`);
      if(!d.startable){assert.ok(d.instead&&d.instead.fn&&d.note.length>10,`${key}: låst kort säger varför och erbjuder något annat`);}
    }
  }
  assert.equal(describeLink('finns-inte',{save:fresh()}),null);assert.equal(describeLink('',{save:fresh()}),null);
});
test('före första uppdraget: julrundor, butiker, Sandgrund och båtbussen är låsta (som i menyn) och kortet erbjuder första uppdraget',()=>{
  const save=fresh();
  for(const key of ['torget','kungsgatan','drottninggatan','cervera','pressbyran','sandgrund','batbuss']){
    const d=describeLink(key,{save});assert.equal(d.startable,false,key);assert.deepEqual(d.instead,{fn:'intro',arg:null},key);
    assert.match(d.note,/första uppdraget/);assert.match(d.button,/FÖRSTA UPPDRAGET/);
  }
  for(const key of ['intro','maraton','rush1','zombies1']){const d=describeLink(key,{save});assert.equal(d.startable,true,key);}
  assert.deepEqual(describeLink('meny',{save}).go,{fn:'menu',arg:null},'Julmenyn finns inte förrän första uppdraget är klart: startvyn visas');
  const done=played();
  for(const key of ['torget','kungsgatan','drottninggatan','cervera','pressbyran','sandgrund','batbuss'])assert.equal(describeLink(key,{save:done}).startable,true,key);
  assert.deepEqual(describeLink('meny',{save:done}).go,{fn:'continue',arg:null});
});
test('uppdragen startar rätt sak',()=>{
  const save=played(),go=k=>describeLink(k,{save}).go;
  assert.deepEqual(go('intro'),{fn:'intro',arg:null});
  assert.deepEqual(go('torget'),{fn:'round',arg:'round-torget'});assert.deepEqual(go('kungsgatan'),{fn:'round',arg:'round-kungsgatan'});assert.deepEqual(go('drottninggatan'),{fn:'round',arg:'round-drottninggatan'});
  assert.deepEqual(go('cervera'),{fn:'shops',arg:null});assert.deepEqual(go('pressbyran'),{fn:'shops',arg:null});
  assert.deepEqual(go('sandgrund'),{fn:'sandgrund',arg:null});assert.deepEqual(go('batbuss'),{fn:'boat',arg:null});
  assert.deepEqual(go('maraton'),{fn:'marathon',arg:null});assert.deepEqual(go('rush'),{fn:'rushmenu',arg:null});assert.deepEqual(go('topplista'),{fn:'board',arg:null});
  assert.deepEqual(go('rush1'),{fn:'rush',arg:1});assert.deepEqual(go('zombies1'),{fn:'zombies',arg:1});
  assert.match(describeLink('cervera',{save}).line,/GÅ DIT vid Cervera/);assert.match(describeLink('pressbyran',{save}).line,/GÅ DIT vid Pressbyrån/);
  assert.match(describeLink('cervera',{save}).line,/demonstration/,'butikerna är demonstrationer och kortet säger det');
});
test('rusher och nivåer följer spelets upplåsning: ett låst uppdrag startar inte, kortet säger vilket som är nästa och erbjuder det',()=>{
  const save=played();
  let d=describeLink('rush3',{save});assert.equal(d.startable,false);assert.equal(d.button,'SPELA RUSH 1');assert.deepEqual(d.instead,{fn:'rush',arg:1});assert.match(d.note,/Rush 3 är låst.*Rush 1/);assert.equal(d.title.startsWith('RUSH 3 · '),true);
  assert.equal(describeLink('rush1',{save}).startable,true);
  const clear=n=>save.recordRush(n,{points:1000,seconds:30,packages:25,hearts:2,cleared:true});
  clear(1);d=describeLink('rush3',{save});assert.equal(d.button,'SPELA RUSH 2');
  clear(2);d=describeLink('rush3',{save});assert.equal(d.startable,true);assert.deepEqual(d.go,{fn:'rush',arg:3});
  assert.match(describeLink('rush1',{save}).note,/redan klarat/i);
  d=describeLink('zombies2',{save});assert.equal(d.startable,false);assert.equal(d.button,'SPELA NIVÅ 1');assert.deepEqual(d.instead,{fn:'zombies',arg:1});assert.match(d.note,/Nivå 2 är låst/);
  save.recordZombies(1,{points:500,seconds:60,packages:20});
  d=describeLink('zombies2',{save});assert.equal(d.startable,true);assert.deepEqual(d.go,{fn:'zombies',arg:2});
  d=describeLink('zombies4',{save});assert.equal(d.startable,false);assert.equal(d.button,'SPELA NIVÅ 2');
  assert.match(describeLink('zombies1',{save}).note,/redan klarat nivå 1/i);
});
test('uppdrag man redan stämplat säger det, och kortet ger vad uppdraget ger (stämpel, rush eller nivå) så att kalendern kan prövas mot det',()=>{
  const save=played();
  for(const [key,stamp] of [['torget','round-torget'],['kungsgatan','round-kungsgatan'],['drottninggatan','round-drottninggatan'],['cervera','cervera'],['pressbyran','pressbyran'],['sandgrund','sandgrund'],['batbuss','marieberg'],['intro','intro']]){
    const d=describeLink(key,{save});assert.deepEqual(d.gives,{stamp},key);assert.ok(STAMPS.some(s=>s.id===stamp),'stämpeln finns: '+stamp);
  }
  assert.deepEqual(describeLink('rush5',{save}).gives,{rush:5,stamp:'julrush'},'från Rush 5 ger en klarad rush stämpeln JULRUSHEN');assert.deepEqual(describeLink('rush4',{save}).gives,{rush:4});assert.deepEqual(describeLink('zombies3',{save}).gives,{zombies:3});assert.deepEqual(describeLink('maraton',{save}).gives,{marathon:true});
  const s2=played();s2.stamp('sandgrund');s2.stamp('marieberg');s2.stamp('round-torget');
  for(const k of ['sandgrund','batbuss','torget'])assert.match(describeLink(k,{save:s2}).note,/redan stämplad|redan stämpeln/i,k);
  assert.equal(describeLink('sandgrund',{save}).note,'');
});
test('modulen är ren och texten på korten kommer bara ur spelets egna data (ingenting ur adressen skrivs ut)',()=>{
  const src=read('xmas/xmas-deeplink.mjs');
  assert.doesNotMatch(src,/\b(document|window|localStorage|location|fetch|innerHTML)\b/);
  assert.match(src,/import .*\?v=/);
  // Nyckeln ekas aldrig tillbaka i en text: en nyckel som ser ut som HTML är okänd och ger inget kort.
  assert.equal(describeLink('<img src=x onerror=alert(1)>',{save:fresh()}),null);
  for(const key of ALL){const d=describeLink(key,{save:played()});for(const f of ['title','line','note','button'])assert.doesNotMatch(String(d[f]),/[<>]/,`${key}.${f}`);}
});
test('spelet hanterar allt modulen kan ge: varje fn har en gren i xmas-boot.js, kortet finns i index.html och är med i panellistan, och knapparna är kopplade',()=>{
  const boot=read('xmas/xmas-boot.js'),ui=read('xmas/xmas-ui.js'),html=read('index.html'),lr=read('last-round.js');
  const fns=new Set();for(const key of ALL)for(const save of [fresh(),played()]){const d=describeLink(key,{save});fns.add(d.go.fn);if(d.instead)fns.add(d.instead.fn);}
  for(const fn of fns){if(fn==='menu')continue;assert.match(boot,new RegExp(`case '${fn}':`),`xmas-boot.js saknar grenen för ${fn}`);}
  assert.match(boot,/parseLink\(location\.search\)/);assert.match(boot,/if\(link\)\{/);assert.match(boot,/searchParams\.delete\(LINK_PARAM\)/,'adressen städas så att en omladdning inte startar om kortet');
  for(const id of ['round-xmas-link','xmasLinkKicker','xmasLinkTitle','xmasLinkLine','xmasLinkNote','xmasLinkGo','xmasLinkSkip'])assert.ok(html.includes(`id="${id}"`),id);
  assert.match(lr,/'xmas-challenge','xmas-link'\]/,'panelen finns i setPanel-listan');
  assert.match(ui,/on\('xmasLinkGo',\(\)=>fx\.linkGo\(\)\)/);assert.match(ui,/on\('xmasLinkSkip',\(\)=>fx\.linkSkip\(\)\)/);assert.match(boot,/linkGo,linkSkip/);
  assert.match(html,/id="xmasLinkGo" class="round-primary xmas-primary"/,'stora, tydliga tryckytor');
});
test('en utmaningslänk går före en djuplänk, och båda städas ur adressen',()=>{
  const boot=read('xmas/xmas-boot.js');
  assert.match(boot,/if\(!incoming&&!badLink\)link=l;/);
  assert.ok(boot.indexOf('if(incoming){ui.renderChallenge')<boot.indexOf('if(link){const l=link;'),'utmaningen visas före djuplänken i openMenu');
});
test('antalet rusher och nivåer som länkarna når stämmer med spelet',()=>{
  assert.equal(RUSH_COUNT,12);assert.equal(isKnownKey('rush'+RUSH_COUNT),true);assert.equal(isKnownKey('rush'+(RUSH_COUNT+1)),false);
  assert.equal(isKnownKey('zombies'+ZOMBIE_MAX),true);
});
