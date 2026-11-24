// Anmälan till dragningen: formulärets kontroll, serverns kontroll och hopslagning, funktionen mot en låtsaslagring, villkorstexterna och att inget visas eller tas emot förrän arrangören fyllt i uppgifterna.
// Inget nät och ingen riktig lagring: lagringen är en Map med samma gränssnitt som api/xmas-draw.mjs (read/write med ETag).
import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIZE,MAX_TICKETS} from '../xmas/xmas-meta-config.mjs';
import {makeTicket} from '../xmas/xmas-ticket.mjs';
import {drawDateText,entryOpen,entryAvailable,cleanName,cleanContact,contactKind,validateEntry,buildPayload,submitEntry,reasonText} from '../xmas/xmas-draw-client.mjs';
import {validateBody,mergeEntry,contactKey,entryPath,suspicion,MAX_BODY} from '../xmas/xmas-draw-server.mjs';
import {drawTexts,unfilled} from '../xmas/xmas-draw-text.mjs';
import handler,{handleEntry,throttled} from '../api/xmas-draw.mjs';

const mulberry=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const tickets=(n,seed=1)=>{const r=mulberry(seed),out=new Set();while(out.size<n)out.add(makeTicket(r));return [...out];};
const READY={...PRIZE,enabled:true,ready:true,mode:'api',controller:'Provföreningen',contact:'info@exempel.se',sponsor:'Provträdgården',entryCloses:'2026-12-21T12:00:00+01:00',keepUntil:'2027-01-31'};
const NOW=Date.parse('2026-12-10T12:00:00+01:00');
const body=(o={})=>({v:1,name:'Kim Karlsson',contact:'kim@exempel.se',guardian:true,consent:true,tickets:tickets(5),facts:{grade:4,days:8,streak:3},...o});
const memStore=()=>{const m=new Map(),log=[];let etag=0;return {m,log,
  async read(p){const v=m.get(p);return v?{data:JSON.parse(v.json),etag:v.etag}:null;},
  async write(p,data,tag){const v=m.get(p);if(tag&&(!v||v.etag!==tag)){log.push('miss');return false;}if(!tag&&v){log.push('exists');return false;}m.set(p,{json:JSON.stringify(data),etag:'e'+(++etag)});return true;}};};

// ── Standardläget: ingenting öppet ──────────────────────────────────────────────────────────────────────────────────────
test('som standard är anmälan stängd: formuläret visas inte och servern tar inte emot något',()=>{
  assert.equal(PRIZE.ready,false);assert.equal(entryAvailable(NOW),false);
  const r=validateBody(body(),{now:NOW});assert.equal(r.ok,false);assert.equal(r.status,503);assert.equal(r.error,'ej_redo');
});
test('ready kräver att ansvarig, kontakt och datum är ifyllda (annars ligger platshållare kvar i texten)',()=>{
  const t=drawTexts(PRIZE);
  if(PRIZE.ready)assert.deepEqual(unfilled(t),[],'ready:true med platshållare i villkoren');
  else assert.ok(unfilled(t).length>0,'ofyllda uppgifter syns som platshållare tills arrangören fyller i dem');
  const full=drawTexts(READY);assert.deepEqual(unfilled(full),[]);
  assert.ok(full.rules.some(x=>/Provträdgården/.test(x))&&full.rules.some(x=>/Provföreningen/.test(x)&&/info@exempel\.se/.test(x)));
  assert.ok(full.privacy.some(x=>/31\/1 2027/.test(x))&&full.privacy.some(x=>/Integritetsskyddsmyndigheten/.test(x)));
  assert.ok(full.rules.some(x=>/21\/12 2026 kl 12\.00/.test(x)&&/måndag 21 december kl 18\.00/.test(x)));
});
test('datumtext och öppettid följer inställningarna',()=>{
  assert.equal(drawDateText(PRIZE),'Dragning måndag 21 december kl 18.00.');
  assert.equal(drawDateText({drawDate:'2026-12-24',drawTime:''}),'Dragning torsdag 24 december.');
  assert.equal(drawDateText({drawDate:'trasig'}),'Dragningens tid meddelas.');
  assert.equal(entryOpen(Date.parse('2026-12-21T11:59:00+01:00'),PRIZE),true);assert.equal(entryOpen(Date.parse('2026-12-21T12:01:00+01:00'),PRIZE),false);
  assert.equal(entryAvailable(NOW,READY),true);assert.equal(entryAvailable(NOW,{...READY,mode:'none'}),false);assert.equal(entryAvailable(Date.parse('2026-12-22T10:00:00+01:00'),READY),false);
});

// ── Formuläret ──────────────────────────────────────────────────────────────────────────────────────────────────────────
test('formuläret: namn, e-post eller telefon, bekräftelse av ålder och samtycke, och minst en lott',()=>{
  const ok=validateEntry({name:' Kim  Karlsson ',contact:'Kim@Exempel.se',guardian:true,consent:true,tickets:tickets(3)});
  assert.ok(ok.ok);assert.equal(ok.name,'Kim Karlsson');assert.equal(ok.kind,'email');assert.equal(ok.tickets.length,3);
  assert.equal(validateEntry({name:'K',contact:'x',guardian:false,consent:false,tickets:[]}).ok,false);
  const bad=validateEntry({name:'K',contact:'x',guardian:false,consent:false,tickets:[]});
  assert.deepEqual(Object.keys(bad.errors).sort(),['consent','contact','guardian','name','tickets']);
  assert.equal(contactKind('070-123 45 67'),'phone');assert.equal(contactKind('+46701234567'),'phone');assert.equal(contactKind('12345'),'');assert.equal(contactKind('a@b'),'');assert.equal(contactKind('a b@c.se'),'');
  assert.equal(cleanName('<b>Hej</b>\u0000 du'),'bHej/b du');assert.equal(cleanName('x'.repeat(80)).length,40);assert.equal(cleanContact('  a@b.se\n').length,6);
  const dup=tickets(2);assert.equal(validateEntry({name:'Kim',contact:'kim@exempel.se',guardian:true,consent:true,tickets:[...dup,...dup,'T-AAAA-AAAA','skräp']}).tickets.length,2);
});
test('förfrågan bär bara det som behövs och servern får grad och dagar för sin kontroll',()=>{
  const v=validateEntry({name:'Kim',contact:'kim@exempel.se',guardian:true,consent:true,tickets:tickets(2)});
  const p=buildPayload(v,{grade:5.7,days:'9',streak:-3});
  assert.deepEqual(Object.keys(p).sort(),['consent','contact','facts','guardian','name','tickets','v']);assert.deepEqual(p.facts,{grade:5,days:9,streak:0});
});

// ── Servern ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('servern avvisar det som är trasigt och släpper igenom det som är rätt',()=>{
  const t=tickets(3);
  assert.ok(validateBody(body({tickets:t}),{now:NOW,prize:READY}).ok);
  for(const [what,b] of [['null',null],['lista',[]],['fel version',body({v:2})],['utan bekräftelse',body({guardian:false})],['utan samtycke',body({consent:false})],['kort namn',body({name:'K'})],['dålig kontakt',body({contact:'inte en adress'})],
    ['inga lotter',body({tickets:[]})],['falsk lott',body({tickets:['T-AAAA-AAAA']})],['lotter som text',body({tickets:'T-AAAA-AAAA'})],['för många',body({tickets:tickets(MAX_TICKETS+1)})]]){
    const r=validateBody(b,{now:NOW,prize:READY});assert.equal(r.ok,false,what);assert.equal(r.status,400,what);assert.equal(r.error,'ogiltig',what);
  }
  const late=validateBody(body(),{now:Date.parse('2026-12-21T12:30:00+01:00'),prize:READY});assert.equal(late.status,403);assert.equal(late.error,'stangd');
  const dup=validateBody(body({tickets:[t[0],t[0],t[1]]}),{now:NOW,prize:READY});assert.ok(dup.ok);assert.equal(dup.value.tickets.length,2);
  const odd=validateBody(body({facts:{grade:99,days:'x',streak:1e9}}),{now:NOW,prize:READY});assert.deepEqual(odd.value.facts,{grade:12,days:0,streak:60});
});
test('nyckeln är densamma för samma kontakt oavsett versaler, mellanrum och streck, och avslöjar inte kontakten',()=>{
  assert.equal(contactKey('Kim@Exempel.se'),contactKey(' kim@exempel.se '));assert.equal(contactKey('070-123 45 67'),contactKey('0701234567'));assert.notEqual(contactKey('a@b.se'),contactKey('c@d.se'));
  const p=entryPath('kim@exempel.se');assert.match(p,/^draw\/2026\/[0-9a-f]{40}\.json$/);assert.ok(!p.includes('kim')&&!p.includes('exempel'));
});
test('hopslagning: lotterna är en mängd, första anmälan bevaras, siffrorna växer, flaggor sätts för orimliga mängder',()=>{
  const a=validateBody(body({tickets:tickets(5,1),facts:{grade:3,days:4,streak:2}}),{now:NOW,prize:READY}).value;
  const first=mergeEntry(null,a,NOW);assert.equal(first.added,5);assert.equal(first.total,5);assert.equal(first.entry.submissions,1);assert.deepEqual(first.entry.flags,[]);
  const b=validateBody(body({name:'Kim K',tickets:[...tickets(5,1).slice(0,2),...tickets(4,2)],facts:{grade:5,days:9,streak:1}}),{now:NOW+86400000,prize:READY}).value;
  const second=mergeEntry(first.entry,b,NOW+86400000);
  assert.equal(second.total,9,'5 + 4 nya, 2 fanns redan');assert.equal(second.added,4);assert.equal(second.entry.submissions,2);assert.equal(second.entry.name,'Kim K');
  assert.equal(second.entry.first,first.entry.first);assert.notEqual(second.entry.last,first.entry.last);assert.deepEqual(second.entry.facts,{grade:5,days:9,streak:2});
  const many=mergeEntry(null,{...a,tickets:tickets(120,3),facts:{grade:1,days:1,streak:0}},NOW);assert.ok(many.entry.flags.includes('manga')&&many.entry.flags.includes('ny')&&many.entry.flags.includes('lag_grad'),many.entry.flags.join());
  assert.deepEqual(suspicion(tickets(30),{grade:6,days:20}),[]);assert.deepEqual(suspicion(tickets(100),{grade:6,days:5}),['manga']);
  assert.equal(mergeEntry({tickets:['skräp',...tickets(2,9)]},a,NOW).total,7,'trasiga koder i en gammal anmälan följer inte med');
});

// ── Funktionen med en låtsaslagring ────────────────────────────────────────────────────────────────────────────────────
test('en anmälan sparas privat under kontaktens nyckel och svaret innehåller inga personuppgifter',async()=>{
  const store=memStore(),t=tickets(6,4);
  const r=await handleEntry(body({tickets:t,contact:'Kim@Exempel.se'}),{store,now:NOW,prize:READY});
  assert.equal(r.status,200);assert.deepEqual(r.json,{ok:true,stored:6,total:6});
  assert.ok(!JSON.stringify(r.json).includes('Kim')&&!JSON.stringify(r.json).includes('exempel'));
  assert.equal(store.m.size,1);const [[path,saved]]=[...store.m];assert.ok(!path.includes('kim'));
  const entry=JSON.parse(saved.json);assert.equal(entry.contact,'Kim@Exempel.se');assert.deepEqual(entry.tickets.sort(),[...t].sort());assert.ok(!('ip' in entry)&&!('ua' in entry));
  const again=await handleEntry(body({tickets:[...t.slice(0,3),...tickets(2,5)],contact:' kim@exempel.se'}),{store,now:NOW+1000,prize:READY});
  assert.deepEqual(again.json,{ok:true,stored:2,total:8});assert.equal(store.m.size,1,'samma kontakt: en anmälan');
});
test('två som skriver samtidigt: den som kommer sist läser om och slår ihop (ETag), och ger upp efter fyra försök',async()=>{
  const store=memStore();await handleEntry(body({tickets:tickets(3,1)}),{store,now:NOW,prize:READY});
  const real=store.write.bind(store);let misses=1;
  store.write=async(p,d,tag)=>{if(misses-->0){await real(p,{...d,tickets:tickets(3,8)},tag);return real(p,d,tag);}return real(p,d,tag);}; // någon annan skriver mellan läsning och skrivning
  const r=await handleEntry(body({tickets:tickets(2,2)}),{store,now:NOW+5,prize:READY});
  assert.equal(r.status,200);assert.ok(r.json.total>=5,'inget gick förlorat: '+JSON.stringify(r.json));
  const hopeless={read:async()=>null,write:async()=>false};
  assert.equal((await handleEntry(body(),{store:hopeless,now:NOW,prize:READY})).status,503);
});
test('stängd anmälan och dåliga förfrågningar rör inte lagringen',async()=>{
  const store=memStore();
  assert.equal((await handleEntry(body(),{store,now:Date.parse('2026-12-22T09:00:00+01:00'),prize:READY})).status,403);
  assert.equal((await handleEntry(body({guardian:false}),{store,now:NOW,prize:READY})).status,400);
  assert.equal((await handleEntry(body(),{store,now:NOW})).status,503,'med standardinställningen (ready:false)');
  assert.equal(store.m.size,0);
});

// ── HTTP-lagret ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const res=()=>{const r={code:0,headers:{},body:null,setHeader(k,v){r.headers[k]=v;},status(c){r.code=c;return r;},json(b){r.body=b;return r;}};return r;};
test('HTTP: bara POST, spärr mot upprepning, för stor förfrågan, ingen lagring kopplad',async()=>{
  const prev=process.env.BLOB_READ_WRITE_TOKEN;delete process.env.BLOB_READ_WRITE_TOKEN;
  try{
    let r=res();await handler({method:'GET',headers:{}},r);assert.equal(r.code,405);assert.equal(r.headers.Allow,'POST');assert.equal(r.headers['Cache-Control'],'no-store');
    r=res();await handler({method:'POST',headers:{'x-forwarded-for':'10.0.0.1'},body:{big:'x'.repeat(MAX_BODY+10)}},r);assert.equal(r.code,413);
    r=res();await handler({method:'POST',headers:{'x-forwarded-for':'10.0.0.2'},body:body()},r);assert.equal(r.code,503,'utan BLOB_READ_WRITE_TOKEN');assert.equal(r.body.error,'ej_redo');
    r=res();await handler({method:'POST',headers:{'x-forwarded-for':'10.0.0.3'},body:'{trasig'},r);assert.equal(r.code,503);
    let last=0;for(let i=0;i<14;i++){r=res();await handler({method:'POST',headers:{'x-forwarded-for':'10.0.0.9'},body:body()},r);last=r.code;}
    assert.equal(last,429,'efter tolv försök från samma adress');
  }finally{if(prev!==undefined)process.env.BLOB_READ_WRITE_TOKEN=prev;}
});
test('spärren släpper igen när tiden gått',()=>{
  const k='test-'+Math.random();let t=1e6;for(let i=0;i<12;i++)assert.equal(throttled(k,t+=1000),false);
  assert.equal(throttled(k,t+=1000),true);assert.equal(throttled(k,t+11*60*1000),false);
});

// ── Klientens anrop ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('klientens anrop tolkar svaren från servern och nätfel',async()=>{
  const p=buildPayload(validateEntry({name:'Kim',contact:'kim@exempel.se',guardian:true,consent:true,tickets:tickets(2)}),{grade:2,days:1,streak:1});
  const mk=(status,json)=>async()=>({ok:status>=200&&status<300,status,json:async()=>json});
  assert.deepEqual(await submitEntry(mk(200,{ok:true,stored:2,total:7}),p,'/x'),{ok:true,stored:2,total:7});
  assert.equal((await submitEntry(mk(429,{ok:false}),p,'/x')).reason,'for_manga');
  assert.equal((await submitEntry(mk(503,{ok:false,error:'ej_redo'}),p,'/x')).reason,'ej_redo');
  assert.equal((await submitEntry(mk(403,{ok:false,error:'stangd'}),p,'/x')).reason,'stangd');
  assert.equal((await submitEntry(mk(400,{ok:false,error:'ogiltig'}),p,'/x')).reason,'ogiltig');
  assert.equal((await submitEntry(mk(500,{ok:false}),p,'/x')).reason,'fel');
  assert.equal((await submitEntry(async()=>{throw new Error('offline');},p,'/x')).reason,'nat');
  assert.equal((await submitEntry(async()=>({ok:true,status:200,json:async()=>{throw new Error('x');}}),p,'/x')).ok,false);
  for(const r of ['nat','stangd','ogiltig','for_manga','ej_redo','fel'])assert.ok(reasonText(r).length>10);
  let sent=null;await submitEntry(async(u,o)=>{sent={u,o};return {ok:true,status:200,json:async()=>({ok:true})};},p,'/api/xmas-draw');
  assert.equal(sent.u,'/api/xmas-draw');assert.equal(sent.o.method,'POST');assert.equal(sent.o.credentials,'omit');assert.equal(JSON.parse(sent.o.body).v,1);
});

test('vercel.json: anmälningsfunktionen körs i Stockholm (samma region som det privata lagret) och får med modulerna i xmas/',async()=>{
  const {readFileSync}=await import('node:fs');
  const cfg=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8')),fn=cfg.functions&&cfg.functions['api/xmas-draw.mjs'];
  assert.ok(fn,'funktionen har egen konfiguration');
  assert.deepEqual(fn.regions,['arn1'],'personuppgifterna ska inte hanteras i en annan region än lagret (Stockholm)');
  assert.equal(fn.includeFiles,'xmas/*.mjs');
});
