import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JULKNAPP,julTarget} from '../julknapp.mjs';

test('knappen är avstängd som standard och går inte att slå på av misstag',()=>{
  assert.equal(JULKNAPP.enabled,false);
  assert.equal(JULKNAPP.url,'https://karlstad-julklappsjakten.vercel.app/','adressen är förifylld men knappen är ändå avstängd');
  assert.equal(julTarget(JULKNAPP,{search:'',host:'karlstad-city-visual-twin.vercel.app'}),null);
});
test('en aktiverad knapp leder bara till en https-adress utan användaruppgifter',()=>{
  const on=url=>julTarget({enabled:true,url},{host:'x.vercel.app'});
  assert.equal(on('https://karlstad-julklappsjakten.vercel.app/').url,'https://karlstad-julklappsjakten.vercel.app/');
  for(const bad of ['http://karlstad-julklappsjakten.vercel.app/','javascript:alert(1)','//evil.example/','https://user:pw@x.vercel.app/','https://localhost/','','not a url'])assert.equal(on(bad),null,bad);
  assert.equal(julTarget({enabled:false,url:'https://a.vercel.app/'}),null);
});
test('lokal provadress går bara med ?debug och bara på localhost',()=>{
  const q='?debug&julknapp='+encodeURIComponent('http://localhost:8902/');
  assert.equal(julTarget(JULKNAPP,{search:q,host:'localhost'}).url,'http://localhost:8902/');
  assert.equal(julTarget(JULKNAPP,{search:q,host:'karlstad-city-visual-twin.vercel.app'}),null,'inte på den publicerade adressen');
  assert.equal(julTarget(JULKNAPP,{search:'?julknapp='+encodeURIComponent('http://localhost:8902/'),host:'localhost'}),null,'inte utan debug');
  assert.equal(julTarget(JULKNAPP,{search:'?debug&julknapp='+encodeURIComponent('http://evil.example/'),host:'localhost'}),null,'bara lokala adresser');
});
test('knappen sitter i menyn bredvid TempoRush, är dold från början och kopplad i last-round.js',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),js=fs.readFileSync(new URL('../last-round.js',import.meta.url),'utf8');
  const i=html.indexOf('id="cityTempo"'),j=html.indexOf('id="cityXmas"');
  assert.ok(i>0&&j>i&&j-i<900,'julknappen ligger direkt efter TempoRush-knappen');
  assert.match(html.slice(j-20,j+240),/hidden/);
  assert.match(js,/julTarget\(JULKNAPP/);assert.match(js,/location\.assign\(/);
});
