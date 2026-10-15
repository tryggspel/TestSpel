// Luckorna mot Julspelet. Kalendern lovar saker om spelet (uppdrag, stämplar, nivåer, knappar, sparformat);
// de här testen felar om spelet slutar hålla dem. Spelets egen skrivkod (XmasSave) används för att skapa sparningar.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DOORS,TYPES,GAME_PATH,KARLSTAD_CITY,gameLink} from '../julkalender/doors.mjs';
import {GAME_SAVE_KEY,METRICS,SEASON,doorDay,weekdayOf,adventSundays,readGame,evaluate,emptyGame} from '../julkalender/rules.mjs';
import {SAVE_KEY,STAMPS,TITLES,BASE_GAME_URL} from '../xmas/xmas-config.mjs';
import {rushDef,RUSH_COUNT,RUSH_MAX} from '../xmas/xmas-rushes.mjs';
import {RUSH} from '../xmas/xmas-rush.mjs';
import {zombieLevel,ZOMBIE_MAX,zombiePatrolEvery,zombieSpeed} from '../xmas/xmas-zombie-levels.mjs';
import {ROUNDS,INTRO_SEARCH} from '../xmas/xmas-rounds.mjs';
import {XMAS_CERVERA,XMAS_PRESSBYRAN} from '../xmas/xmas-places.mjs';
import {XmasSave} from '../xmas/xmas-save.mjs';
import {TEMPO} from '../tempo-run.mjs';
import {MISSIONS} from '../city-missions.mjs';
import {challengeRequest} from '../daily-challenge.mjs';

const GAME_DIR=new URL('../',import.meta.url);
const read=f=>fs.readFileSync(new URL(f,GAME_DIR),'utf8');
const sources=fs.readdirSync(GAME_DIR).filter(f=>/\.(m?js|html)$/.test(f)).map(read).join('\n')+'\n'+fs.readdirSync(new URL('xmas/',GAME_DIR)).filter(f=>/\.(m?js|html)$/.test(f)).map(f=>read('xmas/'+f)).join('\n');
const flat=s=>s.replace(/[\s  ]+/g,' ');
const leaves=c=>c.kind==='all'?c.of.flatMap(leaves):[c];
const door=n=>DOORS[n-1];
const text=d=>flat([d.titel,d.story,d.mal,...d.steg,d.spel.valj||''].join(' '));

class Store{
  constructor(){this.m=new Map();}
  get length(){return this.m.size;}key(i){return [...this.m.keys()][i]??null;}
  getItem(k){return this.m.has(k)?this.m.get(k):null;}setItem(k,v){this.m.set(k,String(v));}removeItem(k){this.m.delete(k);}
}

test('det finns 24 luckor, numrerade 1–24 utan hål, och varje dag har ett datum i december',()=>{
  assert.deepEqual(DOORS.map(d=>d.n),Array.from({length:24},(_,i)=>i+1));
  assert.equal(doorDay(1),SEASON.first);assert.equal(doorDay(24),SEASON.last);
});
test('varje lucka har all text som sidan visar',()=>{
  for(const d of DOORS){
    for(const f of ['titel','plats','ledtrad','story','mal'])assert.ok(typeof d[f]==='string'&&d[f].trim().length>(f==='titel'||f==='plats'?4:8),`lucka ${d.n}: ${f}`);
    assert.ok(Array.isArray(d.steg)&&d.steg.length>=3&&d.steg.every(s=>typeof s==='string'&&s.length>10),`lucka ${d.n}: steg`);
    assert.ok(TYPES[d.typ],`lucka ${d.n}: typ ${d.typ}`);
    assert.ok([1,2,3].includes(d.stjarnor),`lucka ${d.n}: stjärnor`);
    assert.ok(d.spel&&typeof d.spel.knapp==='string','lucka '+d.n+': spel');
    assert.ok(!d.ledtrad.includes(d.titel),`lucka ${d.n}: ledtråden avslöjar rubriken`);
  }
  assert.equal(new Set(DOORS.map(d=>d.titel)).size,24,'unika titlar');
});
test('blandningen: julrundor, butiker, rusher, tomtezombies, utmaningar och en final; ingen typ dominerar',()=>{
  const by={};for(const d of DOORS)by[d.typ]=(by[d.typ]||0)+1;
  for(const t of Object.keys(TYPES))assert.ok(by[t]>=1,t);
  assert.equal(by.final,1);assert.equal(DOORS[23].typ,'final','finalen är lucka 24');
  assert.ok(by.butik>=2);assert.ok(by.rush<=9,'rusher: '+by.rush);assert.ok(Math.max(...Object.values(by))<=9);
});
test('svårigheten stiger: slutet är svårare än starten, och finalen går att nå utan Tomtegalet',()=>{
  const avg=(a,b)=>DOORS.filter(d=>d.n>=a&&d.n<=b).reduce((s,d)=>s+d.stjarnor,0)/(b-a+1);
  assert.ok(avg(17,24)>avg(1,8),`${avg(17,24)} > ${avg(1,8)}`);
  assert.equal(DOORS[23].stjarnor,3);
  assert.ok(!DOORS.some(d=>leaves(d.check).some(c=>c.kind==='rush'&&c.n>=RUSH_COUNT)),'ingen lucka kräver alla tolv rusher (bara de mycket duktiga klarar Tomtegalet)');
  assert.ok(DOORS[23].check.n<STAMPS.length,'finalen kräver inte alla stämplar');
});
test('söndagarna 6, 13 och 20 december är advent, och 13 december är Luciadagen',()=>{
  const adv=adventSundays(SEASON.year).map(d=>Number(d.slice(8))).filter(n=>n>=1&&n<=24);
  assert.deepEqual(adv,[6,13,20]);
  for(const n of adv)assert.equal(weekdayOf(doorDay(n)),'söndag');
  assert.match(door(13).titel,/Lucia/);
  for(const n of adv)assert.ok(door(n).stjarnor>=2,`advent: lucka ${n} ska inte vara den lättaste`);
});

// ── Villkor mot Julspelets egen kod ──────────────────────────────────────────────────────────────────────
test('sparnyckeln är Julspelets, och bara den läses',()=>{
  assert.equal(GAME_SAVE_KEY,SAVE_KEY);assert.equal(SAVE_KEY,'karlstad-xmas:save:1');
  const rules=read('julkalender/rules.mjs'),app=read('julkalender/app.mjs');
  for(const [f,src] of [['rules',rules],['app',app]]){
    assert.doesNotMatch(src,/(setItem|removeItem)\(\s*(GAME_SAVE_KEY|['"`]karlstad|['"`]xmas:)/,`${f}: skriver till spelets nycklar`);
    assert.doesNotMatch(src,/\.clear\(\)/,f);
  }
});
test('alla villkor är kända och har värden som spelet kan nå',()=>{
  for(const d of DOORS)for(const c of leaves(d.check)){
    assert.ok(['stamp','stamps','rush','rushPoints','rushStars','marathon','zombies','points','count','name','manual'].includes(c.kind),`lucka ${d.n}: ${c.kind}`);
    if(c.kind==='stamp')assert.ok(STAMPS.some(s=>s.id===c.id),`lucka ${d.n}: stämpeln ${c.id} finns inte`);
    if(c.kind==='stamps')assert.ok(c.n>=1&&c.n<=STAMPS.length,`lucka ${d.n}: ${c.n} av ${STAMPS.length} stämplar`);
    if(c.kind==='rush'||c.kind==='rushPoints')assert.ok(c.n>=1&&c.n<=RUSH_MAX&&rushDef(c.n),`lucka ${d.n}: rush ${c.n}`);
    if(c.kind==='rushPoints')assert.ok(c.n<=RUSH_COUNT);
    if(c.kind==='rushStars')assert.ok(c.min>=1&&c.min<=TEMPO.lives,`lucka ${d.n}: stjärnor = hjärtan, högst ${TEMPO.lives}`);
    if(c.kind==='marathon')assert.ok(c.min>=1&&c.min<=TEMPO.levels,`lucka ${d.n}: tempo ${c.min}`);
    if(c.kind==='zombies')assert.ok(c.n>=1&&c.n<=ZOMBIE_MAX,`lucka ${d.n}: nivå ${c.n}`);
    if(c.kind==='count'){assert.ok(METRICS.includes(c.metric),`lucka ${d.n}: mått ${c.metric}`);assert.ok(c.n>=1&&c.n<=5000);}
  }
  assert.equal(DOORS.filter(d=>d.check.kind==='manual').length,2,'bara de två luckorna i Karlstad City markeras av spelaren');
});
test('stämpelluckor säger rätt stämpel och rätt mål (julrundor, butiker, Rush 5)',()=>{
  for(const d of DOORS)if(d.check.kind==='stamp'){
    const st=STAMPS.find(s=>s.id===d.check.id);
    assert.ok(text(d).includes(st.label),`lucka ${d.n}: texten ska nämna stämpeln ${st.label}`);
  }
  const goals={'round-torget':ROUNDS[0],'round-kungsgatan':ROUNDS[1],'round-drottninggatan':ROUNDS[2]};
  for(const [id,r] of Object.entries(goals)){
    const d=DOORS.find(x=>x.check.id===id);assert.ok(d,id);
    assert.ok(text(d).includes(String(r.search.goal)),`lucka ${d.n}: målet ${r.search.goal} julklappar`);
  }
  assert.ok(text(door(1)).includes(INTRO_SEARCH.title.replace('!','').slice(0,4))||/Hjälp tomten/.test(door(1).titel));
  assert.equal(door(13).check.id,RUSH.id==='julrush'?'julrush':RUSH.id);assert.match(door(13).titel,/Rush 5/);assert.equal(RUSH.stampLevel,5);
});
test('rusherna i luckorna har rätt namn och mål',()=>{
  const nf=n=>Number(n).toLocaleString('sv-SE');
  let seen=0;
  for(const d of DOORS)for(const c of leaves(d.check))if(c.kind==='rush'||c.kind==='rushPoints'){
    const def=rushDef(c.n),t=text(d);seen++;
    assert.ok(t.includes(def.name),`lucka ${d.n}: rush ${c.n} heter ${def.name}`);
    assert.ok(t.includes('Rush '+c.n),`lucka ${d.n}: nämner Rush ${c.n}`);
    assert.ok(flat(t).includes(flat(nf(def.goal.target)))||c.kind==='rushPoints'&&flat(t).includes(flat(nf(def.goal.target))),`lucka ${d.n}: målet ${nf(def.goal.target)} ${def.goal.kind}`);
    if(def.goal.kind==='points')assert.match(t,/poäng/);else assert.match(t,/paket/);
    if(c.kind==='rushPoints'){assert.equal(def.goal.kind,'points','poängrekord bara i poängrushar');assert.ok(c.min>def.goal.target,'rekordet ska ligga över målet');}
  }
  assert.ok(seen>=5,'rusherna i luckorna: '+seen);
});
test('Tomtezombies-nivåerna i luckorna stämmer med spelets nivåer',()=>{
  for(const d of DOORS)for(const c of leaves(d.check))if(c.kind==='zombies'){
    const lv=zombieLevel(c.n),t=text(d);
    assert.ok(t.includes(String(lv.goal)),`lucka ${d.n}: nivå ${c.n} har ${lv.goal} paket`);
    assert.ok(t.includes('nivå '+c.n),`lucka ${d.n}: nämner nivå ${c.n}`);
    if(c.n>=2){const pct=Math.round((zombieSpeed(c.n)-1)*100);assert.match(t,pct===5?/fem procent/:pct===15?/femton procent/:/procent/,`lucka ${d.n}: ${pct} % snabbare`);}
    if(c.n===4)assert.equal(zombiePatrolEvery(4),9,'texten säger högst var nionde sekund');
  }
});
test('titeln i lucka 18 är en av spelets titlar med rätt gräns',()=>{
  const d=door(18),c=d.check,t=TITLES.find(x=>x[0]===c.min);
  assert.ok(t,`gränsen ${c.min} är ingen titel`);assert.ok(text(d).includes(t[1]),'texten nämner '+t[1]);
  assert.ok(text(d).includes('250')&&TITLES.some(x=>x[0]===250));
});
test('butiksluckor är demonstrationer precis som i spelet, och kalendern påstår inget samarbete',()=>{
  for(const [id,place] of [['cervera',XMAS_CERVERA],['pressbyran',XMAS_PRESSBYRAN]]){
    const d=DOORS.find(x=>x.check.id===id);assert.ok(d,id);
    assert.equal(place.status,'demo');assert.equal(!!d.demo,true,`lucka ${d.n}: märkt Demo`);assert.equal(d.typ,'butik');
    assert.equal(place.partner?.confirmed,false);
  }
  assert.ok(DOORS.filter(d=>d.demo).every(d=>d.typ==='butik'));
});
test('luckorna i Karlstad City länkar till grundspelet med länkar som det förstår, och markeras av spelaren',()=>{
  assert.equal(KARLSTAD_CITY,BASE_GAME_URL);
  const valid=new Set([...MISSIONS.map(m=>m.id),'boat']);
  const ext=DOORS.filter(d=>d.extern);
  assert.deepEqual(ext.map(d=>d.n),[6,9]);
  for(const d of ext){
    assert.equal(d.typ,'karlstad');assert.equal(d.check.kind,'manual');assert.ok(d.spel.url.startsWith(KARLSTAD_CITY));
    const q=new URL(d.spel.url).search,p=new URLSearchParams(q),req=challengeRequest(q);
    assert.ok(!req.error&&valid.has(p.get('challenge')),`lucka ${d.n}: ${q}`);assert.ok(!p.has('rules')&&!p.has('target'),'inga kompisutmaningar');
    assert.equal(gameLink(d),d.spel.url);
  }
  assert.equal(new URL(door(6).spel.url).searchParams.get('challenge'),'sandgrund');assert.equal(new URL(door(9).spel.url).searchParams.get('challenge'),'boat');
  assert.match(door(6).titel,/Sandgrund/);assert.match(door(9).titel,/Mariebergsskogen/);
  for(const d of DOORS.filter(d=>!d.extern))assert.equal(gameLink(d),GAME_PATH,`lucka ${d.n} länkar till Julspelet`);
  assert.equal(GAME_PATH,'../','kalendern ligger i julkalender/ och spelet i mappen ovanför');
});
test('knapparna och rubrikerna luckorna hänvisar till finns i Julspelet',()=>{
  const julHtml=read('index.html')+'\n'+read('xmas/xmas-ui.js')+'\n'+read('xmas/xmas-boot.js');
  for(const w of ['JULKLAPPSJAKTEN','JULRUSHEN','TOMTEZOMBIES','NÄSTA JULKLAPPSJAKT','BUTIKSUTMANINGAR','MARATON','TOPPLISTA OCH UTMANING','SKICKA UTMANING','DITT NAMN','SPELA RUSH','JULSTÄMPLAR'])
    assert.ok(julHtml.includes(w),`"${w}" nämns i luckorna men finns inte i Julspelet`);
  for(const w of ['HJÄLP RUT','TA EMOT ORDER','LÄMNA PÅ DISKEN','GÅ DIT','STARTA UPPDRAG DIREKT','KLIV OMBORD','SOLSTÖT'])assert.ok(sources.includes(w),`"${w}" finns inte i spelet`);
  const used=new Set(DOORS.flatMap(d=>[d.spel.valj||'',...d.steg].join(' ').match(/\b(?:JULKLAPPSJAKTEN|JULRUSHEN|TOMTEZOMBIES|BUTIKSUTMANINGAR|MARATON)\b/g)||[]));
  assert.ok(used.size>=5);
});

// ── Kalenderns avläsning mot spelets egen skrivkod ───────────────────────────────────────────────────────
// För varje lucka: spela den "på riktigt" med XmasSave (samma anrop som spelet gör vid slutkortet), läs av sparningen och kontrollera att luckan bockas av.
function satisfy(d,save){
  for(const c of leaves(d.check)){
    switch(c.kind){
      case 'stamp':save.stamp(c.id);break;
      case 'stamps':STAMPS.slice(0,c.n).forEach(s=>save.stamp(s.id));break;
      case 'rush':for(let n=1;n<=c.n;n++)save.recordRush(n,{points:1000,seconds:30,packages:25,hearts:2,cleared:true});break;
      case 'rushPoints':save.recordRush(c.n,{points:c.min,seconds:30,packages:25,hearts:2,cleared:true});break;
      case 'rushStars':save.recordRush(1,{points:900,seconds:30,packages:25,hearts:3,cleared:true});break;
      case 'marathon':save.record(RUSH.id,{points:3000,seconds:80,packages:20,bonus:1,level:c.min});break;
      case 'zombies':for(let n=1;n<=c.n;n++)save.recordZombies(n,{points:500,seconds:60,packages:20});break;
      case 'points':save.addTotals({points:c.min});break;
      case 'count':if(c.metric==='runs')for(let i=0;i<c.n;i++)save.addTotals({});else save.addTotals({[c.metric]:c.n});break;
      case 'name':save.setName('Åsa');break;
      default:throw new Error('okänt villkor '+c.kind);
    }
  }
}
test('varje avläsbar lucka bockas av när spelet sparar det den kräver, och inte före',()=>{
  const nothing=emptyGame();
  for(const d of DOORS.filter(x=>x.check.kind!=='manual')){
    const storage=new Store(),save=new XmasSave(storage);
    assert.equal(evaluate(d.check,readGame(storage),{}).done,false,`lucka ${d.n} är klar utan att något spelats`);
    satisfy(d,save);
    assert.ok(storage.getItem(SAVE_KEY),`lucka ${d.n}: spelet sparade inget`);
    const g=readGame(storage);
    assert.equal(evaluate(d.check,g,{}).done,true,`lucka ${d.n} (${d.titel}) bockas inte av av spelets egen sparning: ${storage.getItem(SAVE_KEY).slice(0,300)}`);
    assert.equal(evaluate(d.check,nothing,{}).done,false);
  }
});
test('räknare räknar nya rundor och paket ur spelets summor, en runda i taget',()=>{
  const storage=new Store(),save=new XmasSave(storage);
  save.addTotals({packages:14,bonus:1,points:300});save.addTotals({packages:30,points:500});
  const g=readGame(storage);
  assert.deepEqual([g.totals.packages,g.totals.points,g.totals.runs],[44,800,2]);
});
test('Julspelets sparformat har de fält kalendern läser',()=>{
  const storage=new Store(),save=new XmasSave(storage);save.stamp('intro');
  const raw=JSON.parse(storage.getItem(SAVE_KEY));
  for(const k of ['v','stamps','records','totals','rush','zombies','name'])assert.ok(k in raw,k);
  assert.equal(raw.v,1);assert.deepEqual(Object.keys(raw.totals).sort(),['bonus','packages','points','runs']);
  assert.ok('cleared' in raw.rush&&'stars' in raw.rush&&'best' in raw.rush);assert.ok('cleared' in raw.zombies&&'best' in raw.zombies);
});
