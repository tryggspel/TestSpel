import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DOORS,TYPES,GAME_PATH,gameLink} from '../doors.mjs';
import {GAME_KEYS,METRICS,RECORDS,SEASON,doorDay,weekdayOf,adventSundays} from '../rules.mjs';
// Spelet läses bara, aldrig ändras. Kalendern lovar saker om spelet; de här testen felar om spelet slutar hålla dem.
import {MISSIONS} from '../../playcanvas-karlstad-2.11/city-missions.mjs';
import {BADGES} from '../../playcanvas-karlstad-2.11/explore-fun.mjs';
import {PLACES} from '../../playcanvas-karlstad-2.11/places.mjs';
import {TEMPO,TEMPO_NAMES} from '../../playcanvas-karlstad-2.11/tempo-run.mjs';
import {challengeRequest} from '../../playcanvas-karlstad-2.11/daily-challenge.mjs';

const game=f=>fs.readFileSync(new URL('../../playcanvas-karlstad-2.11/'+f,import.meta.url),'utf8');
const GAME_DIR=new URL('../../playcanvas-karlstad-2.11/',import.meta.url);
const allGameSource=fs.readdirSync(GAME_DIR).filter(f=>/\.(m?js|html)$/.test(f)).map(game).join('\n');
const leaves=c=>c.kind==='all'?c.of.flatMap(leaves):[c];

test('det finns 24 luckor, numrerade 1–24 utan hål, och varje dag har ett datum i december',()=>{
  assert.deepEqual(DOORS.map(d=>d.n),Array.from({length:24},(_,i)=>i+1));
  assert.equal(doorDay(1),SEASON.first);assert.equal(doorDay(24),SEASON.last);
});
test('varje lucka har all text som sidan visar',()=>{
  for(const d of DOORS){
    for(const f of ['titel','plats','ledtrad','story','mal'])assert.ok(typeof d[f]==='string'&&d[f].trim().length>(f==='titel'?4:8),`lucka ${d.n}: ${f}`);
    assert.ok(Array.isArray(d.steg)&&d.steg.length>=3&&d.steg.every(s=>typeof s==='string'&&s.length>10),`lucka ${d.n}: steg`);
    assert.ok(TYPES[d.typ],`lucka ${d.n}: typ ${d.typ}`);
    assert.ok([1,2,3].includes(d.stjarnor),`lucka ${d.n}: stjärnor`);
    assert.ok(d.spel&&typeof d.spel.knapp==='string'&&typeof d.spel.query==='string',`lucka ${d.n}: spel`);
  }
  assert.equal(new Set(DOORS.map(d=>d.titel)).size,24,'unika titlar');
});
test('ledtråden i en låst lucka avslöjar inte facit: ingen rubrik eller plats återanvänds ordagrant',()=>{
  for(const d of DOORS){assert.ok(!d.ledtrad.includes(d.titel),`lucka ${d.n}`);}
});
test('blandningen: uppdrag, utmaningar, resor, butiker och en final; ingen typ dominerar',()=>{
  const by={};for(const d of DOORS)by[d.typ]=(by[d.typ]||0)+1;
  for(const t of Object.keys(TYPES))assert.ok(by[t]>=1,t);
  assert.equal(by.final,1);assert.equal(DOORS[23].typ,'final','finalen är lucka 24');
  assert.ok(by.butik>=4,'butiksuppdrag: '+by.butik);assert.ok(Math.max(...Object.values(by))<=8);
});
test('lucka 6 är Sandgrund-uppdraget, 9 är båtbussen till Mariebergsskogen, 24 är Stora Torget',()=>{
  assert.match(DOORS[5].titel,/Sandgrund/);assert.equal(DOORS[5].spel.query,'challenge=sandgrund');
  assert.match(DOORS[8].titel,/Mariebergsskogen/);assert.equal(DOORS[8].spel.query,'challenge=boat');
  assert.match(DOORS[23].titel,/Stora Torget/);assert.equal(DOORS[23].check.id,'fikapanik');
});
test('svårigheten stiger: finalveckan är svårare än starten',()=>{
  const avg=(a,b)=>DOORS.filter(d=>d.n>=a&&d.n<=b).reduce((s,d)=>s+d.stjarnor,0)/(b-a+1);
  assert.ok(avg(17,24)>avg(1,8),`${avg(17,24)} > ${avg(1,8)}`);
  assert.equal(DOORS[23].stjarnor,3);
});
test('söndagarna 6, 13 och 20 december är advent: de ska inte vara de lättaste luckorna',()=>{
  const adv=adventSundays(SEASON.year).map(d=>Number(d.slice(8))).filter(n=>n>=1&&n<=24);
  assert.deepEqual(adv,[6,13,20]);
  for(const n of adv)assert.equal(weekdayOf(doorDay(n)),'söndag');
  assert.match(DOORS[12].titel,/Lucia/,'13 december är Luciadagen');
  assert.ok(DOORS[5].stjarnor>=2&&DOORS[12].stjarnor>=2);
});

// ── Villkor och länkar mot spelet ────────────────────────────────────────────────────────────────────────
test('alla villkor är kända och har rimliga värden',()=>{
  for(const d of DOORS){
    for(const c of leaves(d.check)){
      assert.ok(['mission','record','stamp','badge','count','daily','manual'].includes(c.kind),`lucka ${d.n}: ${c.kind}`);
      if(c.kind==='record'){assert.ok(RECORDS.includes(c.src),`lucka ${d.n}: rekord ${c.src}`);assert.ok(c.min>=1);}
      if(c.kind==='count'){assert.ok(METRICS.includes(c.metric),`lucka ${d.n}: mått ${c.metric}`);assert.ok(c.n>=1&&c.n<=5000);}
      if(c.kind==='daily')assert.ok(c.n>=1);
    }
    if(d.check.kind==='all')assert.ok(d.check.of.length>=2&&d.check.of.every(p=>typeof p.label==='string'&&p.label),`lucka ${d.n}: delmål behöver etiketter`);
  }
  assert.equal(DOORS.filter(d=>d.check.kind==='manual').length,1,'bara ett uppdrag saknar avläsning (lucka 12)');
  assert.equal(DOORS[11].check.kind,'manual');
});
test('uppdrag i luckorna finns i spelet',()=>{
  const ids=new Set(MISSIONS.map(m=>m.id));
  for(const d of DOORS)for(const c of leaves(d.check))if(c.kind==='mission')assert.ok(ids.has(c.id),`lucka ${d.n}: uppdraget ${c.id} finns inte i spelet`);
});
test('märken i luckorna finns i spelet',()=>{
  const ids=new Set(BADGES.map(b=>b.id));
  for(const d of DOORS)for(const c of leaves(d.check))if(c.kind==='badge')assert.ok(ids.has(c.id),`lucka ${d.n}: märket ${c.id} finns inte`);
});
test('butiksluckor använder bara platser som går att spela, och DEMO-märkningen följer spelets status',()=>{
  const byId=new Map(PLACES.map(p=>[p.id,p]));
  for(const d of DOORS)for(const c of leaves(d.check))if(c.kind==='stamp'){
    const p=byId.get(c.id);assert.ok(p,`lucka ${d.n}: platsen ${c.id} finns inte`);
    assert.ok(['demo','active'].includes(p.status),`lucka ${d.n}: ${c.id} är ${p.status} och kan inte spelas`);
    assert.equal(!!d.demo,p.status==='demo',`lucka ${d.n}: demo-märkningen ska följa spelets status (${p.status})`);
    assert.equal(p.partner?.confirmed,false,'kalendern får inte påstå något samarbete som spelet inte bekräftat');
  }
  assert.ok(DOORS.filter(d=>d.demo).every(d=>d.typ==='butik'));
});
test('Temporush-nivåerna i luckorna finns och har de namn texten säger',()=>{
  const lv=DOORS.flatMap(d=>leaves(d.check).filter(c=>c.src==='tempoLevel').map(c=>[d,c]));
  assert.ok(lv.length>=2);
  for(const [d,c] of lv){assert.ok(c.min<=TEMPO.levels,`lucka ${d.n}`);const name=TEMPO_NAMES[c.min];assert.match(d.mal,new RegExp(`tempo ${c.min} \\(${name}\\)`),`lucka ${d.n}: texten ska säga ${name}`);}
});
test('Zombiejaktens mål är nåbara: spelet ger tryggzonen vid 1 000 XP',()=>{
  const rush=game('city-rush.mjs');assert.match(rush,/target:1000/);
  for(const d of DOORS)for(const c of leaves(d.check))if(c.src==='rush')assert.ok(c.min>=1000,`lucka ${d.n}: rekord sparas först i tryggzonen, efter 1 000 XP`);
});
test('länkarna till spelet förstås av spelets egen länkläsare',()=>{
  const valid=new Set([...MISSIONS.map(m=>m.id),'boat','bus']);
  for(const d of DOORS){
    const href=gameLink(d),q=d.spel.query;
    assert.ok(href.startsWith(GAME_PATH),`lucka ${d.n}`);assert.ok(!/[\s<>"']/.test(href),`lucka ${d.n}: ogiltiga tecken`);
    assert.ok(!/(^|&)rules=/.test(q),'rules ska inte sättas av kalendern: spelet visar fel om de inte stämmer');
    const p=new URLSearchParams(q);
    const req=challengeRequest(q?'?'+q:'');
    assert.ok(!req.error,`lucka ${d.n}: ${req.error}`);
    if(p.has('challenge'))assert.ok(valid.has(p.get('challenge')),`lucka ${d.n}: ${p.get('challenge')}`);
    if(p.get('challenge')==='boat')assert.equal(req.kind,'boat');
    if(p.has('daily'))assert.equal(req.kind,'daily');
    // Spelets ?hunt/?target-länkar är kompisutmaningar: resultatkortet skriver "DU SLOG KOMPISENS …". Kalendern använder dem inte.
    assert.ok(!p.has('hunt')&&!p.has('target')&&!p.has('seed'),`lucka ${d.n}: kompisutmaningslänk`);
  }
  assert.equal(gameLink(DOORS[0]),'../playcanvas-karlstad-2.11/');
});
test('startskärmens knappar som luckorna hänvisar till finns i spelet',()=>{
  const html=game('index.html');
  const buttons=[...new Set(DOORS.flatMap(d=>[d.spel.valj].concat(d.steg.flatMap(s=>s.match(/\b(?:CLEAN CITY EXPLORE|TEMPORUSH · TEMPOT STIGER|TERMOSRUNDAN · 3 MINUTER|ZOMBIEJAKTEN · 3:00)\b/g)||[]))).filter(Boolean))];
  assert.ok(buttons.length>=4);
  for(const b of buttons)assert.ok(html.includes(b),`knappen "${b}" finns inte längre i spelets index.html`);
  for(const w of ['STARTA UPPDRAG DIREKT','TA EMOT ORDER','HJÄLP RUT','LÄMNA PÅ DISKEN','CHECKA IN','SPELA UTMANINGEN','KLIV OMBORD'])assert.ok(allGameSource.includes(w)||html.includes(w),`"${w}" nämns i luckorna men finns inte i spelet`);
});
test('sparnycklarna kalendern läser finns i spelets källkod',()=>{
  for(const [name,key] of Object.entries(GAME_KEYS))assert.ok(allGameSource.includes(key.replace(/:$/,'')),`${name}: ${key} finns inte längre i spelet`);
  assert.equal(TEMPO.key,GAME_KEYS.tempo);
});
test('kalendern skriver aldrig till spelets nycklar',()=>{
  for(const f of ['rules.mjs','app.mjs'].filter(f=>fs.existsSync(new URL('../'+f,import.meta.url)))){
    const src=fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
    assert.doesNotMatch(src,/(setItem|removeItem)\(\s*(GAME_KEYS|['"`]karlstad:)/,f);
    assert.doesNotMatch(src,/\.clear\(\)/,f);
  }
});
