// 2.21: datamodell, uppdragsmotor, Karlstadpass och mätning för interaktiva platser (Cervera och Pressbyrån).
import test from 'node:test';
import assert from 'node:assert/strict';
import {PLACES,STATUS,PLAYABLE,ACTIVITY_TYPES,validatePlace,validateAll,resolvePlaces,playablePlaces,approvedOffer,storefrontSpot,placeById,PASS_TEXT} from '../places.mjs';
import {PlaceQuests,PLACE_KEY,QUEST} from '../place-quests.mjs';
import {PartnerEvents,EVENT_TYPES,PARTNER_EVENTS_KEY,beaconSink,cleanMeta,LOCAL_SCOPE_NOTE} from '../partner-events.mjs';
import {mallWalkable,mallRoom,MALL_ROOMS,MALL_CACHE} from '../mall-space.mjs';
import {TREASURES} from '../explore-places.mjs';

const ANCHORS={pressbyran14:{x:30.78,z:-52.68,yaw:0}},FACES={pressbyran14:'south'};
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),m};};
function make({store=storage(),clock=null,available=true,places=PLACES}={}){
  const events=[],rewards=[],stamps=[];let now=1_800_000_000_000;
  const q=new PlaceQuests({places,anchors:ANCHORS,faces:FACES,storage:store,clock:clock||(()=>now),host:{push:e=>events.push(e),reward:p=>rewards.push(p),onStamp:(n,t)=>stamps.push([n,t]),available:()=>typeof available==='function'?available():available}});
  return {q,events,rewards,stamps,store,tick:ms=>{now+=ms;},types:()=>events.map(e=>e.type)};
}
const at=(x,z,y=1.68)=>({x,z,y});
const walk=(q,to,seconds=1,from=null)=>{const n=Math.max(1,Math.ceil(seconds*30));const a=from||q.lastPos||to;for(let i=1;i<=n;i++)q.step(1/30,at(a.x+(to.x-a.x)*i/n,a.z+(to.z-a.z)*i/n,to.y??1.68));};
const near=(place)=>at(place.talk.x,place.talk.z);

// ── Datamodellen ─────────────────────────────────────────────────────────────────────────────────────────────────
test('datamodellen: alla platser är giltiga, unika och har en tydlig status',()=>{
  assert.deepEqual(validateAll(),[]);
  const ids=PLACES.map(p=>p.id);assert.equal(new Set(ids).size,ids.length);
  for(const id of ['cervera','pressbyran','kjell','ahlens','duvan','museum','sandgrund'])assert.ok(placeById(id),id);
  assert.deepEqual(PLAYABLE,['active','demo']);
  const status=Object.fromEntries(PLACES.map(p=>[p.id,p.status]));
  assert.equal(status.cervera,'demo');assert.equal(status.pressbyran,'demo');
  for(const id of ['kjell','ahlens','duvan','museum','sandgrund'])assert.equal(status[id],'future',id+' är framtida innehåll');
});

test('inget samarbete påstås: demonstrationerna är ogodkända och har varken länk eller erbjudande',()=>{
  for(const p of playablePlaces()){
    assert.equal(p.partner.confirmed,false,p.id);assert.equal(p.offer.approved,false);assert.equal(p.offer.url,'');assert.equal(approvedOffer(p),null);
    assert.match(p.partner.note,/inte|Inget/i);
  }
  assert.match(PASS_TEXT.demoNote,/Inget samarbete/);
});

test('validering: ett ogodkänt erbjudande med länk, ett http-län, ett påstått samarbete och okänd typ stoppas',()=>{
  const base=placeById('cervera');
  const bad=(patch)=>validatePlace({...base,...patch});
  assert.ok(bad({offer:{approved:false,title:'',text:'',url:'https://x.se',label:'',approval:null}}).some(s=>/ogodkänt/.test(s)));
  assert.ok(bad({offer:{approved:true,title:'t',text:'',url:'http://x.se',label:'l',approval:{by:'a',at:'2026-10-08'}}}).some(s=>/https/.test(s)));
  assert.ok(bad({offer:{approved:true,title:'t',text:'',url:'https://x.se',label:'l',approval:null}}).some(s=>/godkände/.test(s)));
  assert.ok(bad({partner:{confirmed:true,note:''}}).some(s=>/bekräftat samarbete/.test(s)));
  assert.ok(bad({activity:{...base.activity,type:'teleport'}}).some(s=>/okänd uppdragstyp/.test(s)));
  assert.ok(bad({status:'sponsored'}).some(s=>/status/.test(s)));
  assert.ok(bad({activity:{...base.activity,items:[]}}).some(s=>/föremål/.test(s)));
  assert.deepEqual(bad({offer:{approved:true,title:'Fika',text:'Visa upp',url:'https://exempel.se',label:'Läs mer',approval:{by:'Verksamheten',at:'2026-10-08'}}}),[]);
  assert.equal(approvedOffer({offer:{approved:true,title:'Fika',text:'',url:'https://exempel.se',label:'',approval:{by:'V',at:'x'}}}).url,'https://exempel.se');
  assert.equal(approvedOffer({offer:{approved:true,title:'Fika',text:'',url:'javascript:alert(1)',label:'',approval:{by:'V',at:'x'}}}),null,'bara https');
});

test('framtida platser är förberedda men syns aldrig och körs aldrig',()=>{
  const {q}=make();
  assert.deepEqual(q.list().map(p=>p.id).sort(),['cervera','pressbyran']);
  assert.deepEqual(q.pass().map(r=>r.id).sort(),['cervera','pressbyran']);
  for(const id of ['kjell','ahlens','duvan','museum','sandgrund']){assert.equal(q.get(id),null);assert.ok(placeById(id).plan.length>20,id+' har en plan');}
  assert.equal(ACTIVITY_TYPES.hunt.implemented,false);
  assert.equal(ACTIVITY_TYPES.fetch.implemented,true);assert.equal(ACTIVITY_TYPES.order.implemented,true);
});

test('geometri: Pressbyråns serviceyta står fristående framför fasaden och entrén är fri',()=>{
  const press=resolvePlaces(PLACES,{anchors:ANCHORS,faces:FACES}).find(p=>p.id==='pressbyran');
  const k=press.kiosk.rect,a=ANCHORS.pressbyran14;
  assert.ok(k.minz>a.z+1.5,'minst 1,5 m från fasaden');assert.ok(k.maxz-k.minz<1.2&&k.maxx-k.minx<4);
  assert.ok(press.talk.z>k.maxz,'samtalspunkten ligger framför disken');
  assert.ok(Math.abs(press.entrance.z-a.z)<1&&press.entrance.x>k.maxx,'entrén ligger fri till höger om disken');
  assert.ok(press.staff.x>k.maxx+1,'personalen står bredvid disken');
  assert.equal(resolvePlaces(PLACES,{anchors:{},faces:{}}).filter(p=>p.id==='pressbyran'&&p.resolved).length,0,'utan fasad finns ingen plats');
  assert.deepEqual(storefrontSpot({x:10,z:20},'north',{along:2,out:3}),{x:12,z:17});
  assert.deepEqual(storefrontSpot({x:10,z:20},'east',{along:2,out:3}),{x:13,z:22});
});

test('Cervera: alla föremål ligger på rätt våning och går att nå på marknivå i butiken och atriet',()=>{
  const place=resolvePlaces(PLACES,{anchors:ANCHORS,faces:FACES}).find(p=>p.id==='cervera'),room=MALL_ROOMS.find(r=>r.id==='cervera');
  for(const it of place.activity.items){
    assert.equal(it.floor,0,it.id+' på plan 0');
    // Det finns en gångbar punkt inom föremålets räckvidd.
    let ok=false;for(let dx=-it.reach;dx<=it.reach&&!ok;dx+=.25)for(let dz=-it.reach;dz<=it.reach&&!ok;dz+=.25)if(Math.hypot(dx,dz)<it.reach*.92&&mallWalkable(it.x+dx,it.z+dz,false))ok=true;
    assert.ok(ok,it.id+' går att nå');
  }
  const inRoom=place.activity.items.filter(i=>i.x>room.minx&&i.x<room.maxx&&i.z>room.minz&&i.z<room.maxz);
  assert.equal(inRoom.length,2,'två föremål inne i butiken och ett i atriet');
  assert.ok(mallWalkable(place.talk.x,place.talk.z,false),'samtalspunkten är gångbar');
  assert.equal(mallRoom(at(place.talk.x,place.talk.z))?.id,'cervera');
});

// ── Hämta och lämna (Cervera) ─────────────────────────────────────────────────────────────────────────────────────
test('uppdragsföremålen ligger inte ovanpå stadens andra fynd, så att inget plockas av misstag samtidigt',()=>{
  const place=resolvePlaces(PLACES,{anchors:ANCHORS,faces:FACES}).find(p=>p.id==='cervera');
  const others=[...TREASURES,MALL_CACHE,{id:'mall-term-0',x:-144,z:119,y:0},{id:'mall-term-1',x:-140,z:116,y:0}];
  for(const it of place.activity.items)for(const o of others){
    if((o.y||0)>2)continue;
    assert.ok(Math.hypot(it.x-o.x,it.z-o.z)>=3,it.id+' ligger för nära '+o.id+' ('+Math.hypot(it.x-o.x,it.z-o.z).toFixed(1)+' m)');
  }
  for(const it of place.activity.items)assert.ok(Math.hypot(it.x-place.talk.x,it.z-place.talk.z)>2.5,it.id+' ligger inte på samtalspunkten');
});

test('Cervera: prata, hitta tre föremål, lämna vid disken, få poäng och stämpel',()=>{
  const {q,events,rewards,stamps,types}=make(),cerv=q.get('cervera');
  assert.equal(q.prompt(at(-100,60)),null,'inte nära: ingen knapp');
  const p0=near(cerv);
  assert.equal(q.prompt(p0).label,'HJÄLP RUT');
  q.step(1/30,p0);assert.equal(q.run,null,'uppdraget startar inte av sig självt');
  assert.equal(q.interact(p0),true);assert.equal(q.run.phase,'run');
  assert.ok(types().includes('place-start')&&events.some(e=>e.type==='friendly'&&/Fikastunden/.test(e.text)));
  // fånga upp föremålen i valfri ordning
  const [kopp,kanna,fat]=cerv.activity.items;
  walk(q,{x:kopp.x,z:kopp.z},1.2,p0);assert.equal(q.run.found,1);
  assert.equal(q.prompt(at(-100,60)),null);
  walk(q,{x:fat.x,z:fat.z},1.5);assert.equal(q.run.found,2);
  assert.equal(q.run.phase,'run');
  const obj=q.objective(at(fat.x,fat.z));assert.match(obj.label,/KANNAN/);
  walk(q,{x:kanna.x-1,z:kanna.z+1.5},4);assert.equal(q.run.found,3);assert.equal(q.run.phase,'deliver');
  assert.ok(types().includes('place-item'));
  assert.equal(rewards.length,0,'ingen belöning innan avlämning');
  assert.equal(q.objective(at(kanna.x,kanna.z)).id.startsWith('place-deliver'),true);
  // lämna
  walk(q,{x:p0.x,z:p0.z},3);
  assert.equal(q.prompt(near(cerv)).label,'LÄMNA PÅ DISKEN');
  assert.equal(q.interact(near(cerv)),true);
  assert.deepEqual(rewards,[150]);assert.equal(stamps.length,1);assert.deepEqual(stamps[0],[1,2]);
  const done=events.find(e=>e.type==='place-complete');
  assert.equal(done.points,150);assert.equal(done.first,true);assert.equal(done.stamp.id,'cervera');assert.equal(done.stampCount,1);assert.equal(done.demo,true);assert.equal(done.offer,null);
  assert.equal(q.run,null);
  assert.equal(q.pass().find(r=>r.id==='cervera').stamped,true);
});

test('ett avslut kan inte ge poäng två gånger genom upprepade knapptryck',()=>{
  const {q,rewards,events}=make(),cerv=q.get('cervera'),p0=near(cerv);
  q.interact(p0);for(const it of cerv.activity.items)walk(q,{x:it.x,z:it.z},1.5);
  assert.equal(q.run.phase,'deliver');
  for(let i=0;i<8;i++)q.interact(near(cerv));
  assert.deepEqual(rewards,[150],'bara en utbetalning trots åtta tryck');
  assert.equal(events.filter(e=>e.type==='place-complete').length,1);
  // direkt efter avslutet startar inget nytt uppdrag av misstag
  assert.equal(q.run,null);assert.equal(q.state.places.cervera.completed,1);
  assert.equal(q.prompt(near(cerv)).label,'PRATA MED RUT');
});

test('upprepade uppdrag är roliga men ger små, tidsbegränsade belöningar och ingen ny stämpel',()=>{
  const ctx=make(),{q,rewards,stamps,tick}=ctx,cerv=q.get('cervera');
  const play=()=>{q.interact(near(cerv));q.step(1/30,near(cerv));for(const it of cerv.activity.items)walk(q,{x:it.x,z:it.z},1.5);q.interact(near(cerv));};
  play();assert.deepEqual(rewards,[150]);
  // för snabb omstart avvisas
  q.interact(near(cerv));assert.equal(q.run,null,'tack-paus efter avslut');
  for(let i=0;i<120;i++)q.step(1/30,near(cerv));
  play();assert.deepEqual(rewards,[150],'inom 90 s ger repetitionen ingen extra poäng');
  assert.equal(stamps.length,1,'ingen ny stämpel');
  tick(95_000);for(let i=0;i<120;i++)q.step(1/30,near(cerv));
  play();assert.deepEqual(rewards,[150,30],'efter paus ger repetitionen 30 poäng');
  assert.equal(q.state.places.cervera.completed,3);assert.equal(q.stampCount(),1);
});

test('sparande: stämplar och besök finns kvar efter omladdning och rör inte andra sparfiler',()=>{
  const store=storage();store.setItem('karlstad:journey:1','{"version":1,"balance":42}');store.setItem('karlstad:fun:1','{"version":1}');
  const a=make({store}),cerv=a.q.get('cervera');
  a.q.step(1/30,at(cerv.talk.x,cerv.talk.z));a.q.interact(near(cerv));for(const it of cerv.activity.items)walk(a.q,{x:it.x,z:it.z},1.5);a.q.interact(near(cerv));
  const raw=JSON.parse(store.getItem(PLACE_KEY));
  assert.equal(raw.version,1);assert.ok(raw.places.cervera.stamped>0&&raw.places.cervera.completed===1&&raw.places.cervera.visits===1);
  assert.equal(store.getItem('karlstad:journey:1'),'{"version":1,"balance":42}','övriga sparfiler orörda');assert.equal(store.getItem('karlstad:fun:1'),'{"version":1}');
  const b=make({store});
  assert.equal(b.q.stampCount(),1);assert.equal(b.q.pass().find(r=>r.id==='cervera').stamped,true);assert.equal(b.q.pass().find(r=>r.id==='cervera').visited,true);
  assert.equal(b.q.pass().find(r=>r.id==='pressbyran').stamped,false);
  // en ny instans räknar inte det gamla besöket som ett nytt i samma sparfil förrän sessionen är ny
  assert.equal(b.q.state.places.cervera.visits,1);
});

test('sparfiler som är trasiga eller handredigerade kraschar inte och ger inga stämplar utan uppdrag',()=>{
  for(const raw of ['{','null','[]','{"version":2}','{"version":1,"places":5}']){const s=storage();s.setItem(PLACE_KEY,raw);const {q}=make({store:s});assert.equal(q.stampCount(),0,raw);}
  const s=storage();s.setItem(PLACE_KEY,JSON.stringify({version:1,places:{cervera:{stamped:1,completed:0,visits:3},pressbyran:{stamped:5,completed:2,visits:'x'},kjell:{stamped:9,completed:1},'Ful id!':{stamped:1}}}));
  const {q}=make({store:s});
  assert.equal(q.pass().find(r=>r.id==='cervera').stamped,false,'stämpel utan uppdrag är ogiltig');
  assert.equal(q.pass().find(r=>r.id==='pressbyran').stamped,true);assert.equal(q.state.places.pressbyran.visits,0);
  q.save();const out=JSON.parse(s.getItem(PLACE_KEY));assert.ok(out.places.kjell,'okända men giltiga id:n behålls för framtida platser');assert.equal(out.places['Ful id!'],undefined);
});

test('avbryta: räknas som ett avbrott en gång, tar bort föremålen och ger ingen belöning',()=>{
  const {q,rewards,events}=make(),cerv=q.get('cervera');
  q.interact(near(cerv));assert.equal(q.cancel('user'),true);assert.equal(q.cancel('user'),false,'redan avbrutet');
  assert.equal(q.run,null);assert.equal(q.activeItems().length,0);assert.equal(rewards.length,0);
  assert.equal(q.state.places.cervera.aborted,1);assert.equal(events.filter(e=>e.type==='place-cancel').length,1);
  assert.equal(q.events.count(EVENT_TYPES.abort,'cervera'),1);
  // ett nytt uppdrag kan startas direkt (ingen låst kontroll)
  assert.equal(q.interact(near(cerv)),true);assert.equal(q.run.phase,'run');
});

test('ett uppdrag i taget: vid en annan plats förklarar knappen varför och inget andra startar',()=>{
  const {q,events}=make(),cerv=q.get('cervera'),press=q.get('pressbyran');
  q.interact(near(cerv));assert.equal(q.run.placeId,'cervera');
  assert.equal(q.prompt(near(press)).label,'UPPDRAG PÅGÅR');
  assert.equal(q.interact(near(press)),true);assert.equal(q.run.placeId,'cervera','det första uppdraget ligger kvar');
  assert.ok(events.some(e=>e.type==='friendly'&&/Avsluta ditt andra uppdrag/.test(e.text)));
  assert.equal(q.state.places.pressbyran?.started||0,0);
});

test('läget byts eller en annan regel gäller: uppdraget avbryts snällt och ingenting fastnar',()=>{
  let ok=true;const {q,events}=make({available:()=>ok}),cerv=q.get('cervera');
  q.interact(near(cerv));assert.ok(q.run);ok=false;
  q.step(1/30,near(cerv));assert.equal(q.run,null);assert.equal(q.interact(near(cerv)),false);assert.equal(q.prompt(near(cerv)),null);
  assert.ok(events.some(e=>e.type==='place-cancel'&&e.reason==='mode'));
  ok=true;assert.equal(q.interact(near(cerv)),true);
});

test('paus: utan step() står allt stilla, och tiden i en beställning går inte under paus',()=>{
  const {q}=make(),press=q.get('pressbyran');
  q.interact(near(press));const left=q.run.left;
  // spelet är pausat: step anropas inte
  assert.equal(q.run.left,left);q.pickIndex(0);
  q.step(0.5,near(press));assert.ok(q.run.left<left);
  const after=q.run.left;q.step(0,near(press));q.step(NaN,near(press));q.step(-1,near(press));assert.equal(q.run.left,after,'ogiltiga steg ändrar inget');
});

test('ordnade ledtrådskedjor (museum/konst) fungerar med bara data: bara nästa föremål kan tas',()=>{
  const cerv=PLACES.find(p=>p.id==='cervera');
  const ordered={...cerv,id:'museumtest',name:'Testmuseet',status:'demo',activity:{...cerv.activity,ordered:true,items:cerv.activity.items.map((i,n)=>({...i,clue:'Ledtråd '+(n+1)}))},reward:{...cerv.reward,stamp:{id:'museumtest',label:'TESTMUSEET'}}};
  const {q,events}=make({places:[ordered]}),pl=q.get('museumtest');
  q.interact(near(pl));
  assert.deepEqual(q.activeItems().map(i=>i.id),['kopp'],'bara första ledtråden syns');
  const [a,b,c]=pl.activity.items;
  walk(q,{x:c.x,z:c.z},2,near(pl));assert.equal(q.run.found,0,'fel ordning tar ingenting');
  walk(q,{x:a.x,z:a.z},2);assert.equal(q.run.found,1);assert.deepEqual(q.activeItems().map(i=>i.id),['kanna']);
  assert.ok(events.some(e=>e.type==='friendly'&&/Ledtråd 2/.test(e.text)));
});

// ── Beställning på tid (Pressbyrån) ───────────────────────────────────────────────────────────────────────────────
function startOrder(ctx){const press=ctx.q.get('pressbyran');ctx.q.interact(near(press));return {press,run:ctx.q.run};}
const idxOf=(q,id)=>q.run.menu.findIndex(m=>m.id===id);

test('Pressbyrån: rätt saker i rätt ordning ger poäng, bonus och en stämpel',()=>{
  const ctx=make(),{q,rewards,events,stamps}=ctx,{press,run}=startOrder(ctx);
  assert.equal(run.phase,'serve');assert.deepEqual(run.order.items,['kaffe','kanelbulle','tidning']);assert.equal(run.menu.length,6);
  assert.equal(new Set(run.menu.map(m=>m.id)).size,6);
  for(const id of run.order.items){assert.equal(q.pickIndex(idxOf(q,id)).ok,true);q.step(.5,near(press));}
  assert.equal(q.run,null);assert.equal(rewards.length,1);
  const done=events.find(e=>e.type==='place-complete');
  assert.equal(done.perfect,20);assert.ok(done.speed>=40&&done.speed<=50,'snabbt avslut ger fartbonus: '+done.speed);
  assert.equal(done.points,110+done.speed+20);assert.equal(done.stamp.id,'pressbyran');assert.equal(stamps.length,1);
  assert.equal(q.pickIndex(0),null,'inget att välja efteråt');
});

test('fel sak i fel ordning kostar tid men förstör inte ordern, och ger ingen perfekt-bonus',()=>{
  const ctx=make(),{q,events,rewards}=ctx,{press}=startOrder(ctx);
  const left0=q.run.left;
  const wrong=q.run.menu.find(m=>m.id==='tidning');
  assert.equal(q.pick(wrong.id).wrong,true);assert.equal(q.run.left,left0-4);assert.equal(q.run.step,0);assert.equal(q.run.mistakes,1);
  assert.ok(events.some(e=>e.type==='place-miss'&&e.want==='kaffe'));
  for(const id of ['kaffe','kanelbulle','tidning'])q.pick(id);
  const done=events.find(e=>e.type==='place-complete');assert.equal(done.perfect,0);assert.equal(done.mistakes,1);assert.equal(rewards.length,1);
});

test('tiden går ut: snabb omstart med samma order, avbrottet räknas en gång och inget belönas',()=>{
  const ctx=make(),{q,events,rewards}=ctx,{press}=startOrder(ctx);
  for(let i=0;i<41*30;i++)q.step(1/30,near(press));
  assert.equal(q.run.phase,'failed');assert.ok(events.some(e=>e.type==='place-fail'&&e.reason==='timeout'));
  assert.equal(q.events.count(EVENT_TYPES.abort,'pressbyran'),1);
  assert.equal(q.prompt(near(press)).label,'IGEN · NY ORDER');
  assert.equal(q.pickIndex(0),null,'inga val medan ordern är misslyckad');
  const order0=q.run.order.id;
  assert.equal(q.interact(near(press)),true);
  assert.equal(q.run.phase,'serve');assert.equal(q.run.order.id,order0,'samma order igen');assert.equal(q.run.left,40);
  assert.equal(q.state.places.pressbyran.started,2);
  for(const id of q.run.order.items)q.pick(id);
  assert.equal(rewards.length,1);assert.equal(q.stampCount(),1);
  assert.equal(q.events.count(EVENT_TYPES.abort,'pressbyran'),1,'avbrottet räknades inte om');
});

test('man kan lämna en beställning direkt: knappen eller att gå därifrån avbryter utan straff',()=>{
  const ctx=make(),{q,rewards}=ctx,{press}=startOrder(ctx);
  assert.equal(q.prompt(near(press)).label,'LÄMNA ORDERN');
  assert.equal(q.interact(near(press)),true);assert.equal(q.run,null);assert.equal(rewards.length,0);
  startOrder(ctx);q.step(1/30,at(press.talk.x,press.talk.z+QUEST.leaveRadius+3));
  assert.equal(q.run,null,'avbröts när spelaren gick därifrån');
  assert.equal(q.events.count(EVENT_TYPES.abort,'pressbyran'),2);
  assert.equal(q.state.places.pressbyran.aborted,2);
});

test('beställningarna växlar mellan genomförda omgångar och sakerna ligger olika varje gång',()=>{
  const ctx=make(),{q,tick}=ctx,press=q.get('pressbyran');const seen=[];
  for(let n=0;n<5;n++){
    tick(120_000);for(let i=0;i<120;i++)q.step(1/30,near(press));
    q.interact(near(press));seen.push(q.run.order.id+':'+q.run.menu.map(m=>m.id[0]).join(''));
    for(const id of [...q.run.order.items])q.pick(id);
  }
  assert.deepEqual(seen.map(s=>s.split(':')[0]),['klassikern','skoldagen','dubbla','rusning','klassikern']);
  assert.ok(new Set(seen.map(s=>s.split(':')[1])).size>1,'menyn blandas');
  const dubbla=PLACES.find(p=>p.id==='pressbyran').activity.orders.find(o=>o.id==='dubbla');assert.deepEqual(dubbla.items,['kaffe','kaffe','kanelbulle']);
});

test('datadrivet: en framtida plats (Kjell) körs av samma motor när den får geometri och status demo',()=>{
  const k=PLACES.find(p=>p.id==='kjell'),press=PLACES.find(p=>p.id==='pressbyran');
  const kjell={...press,id:'kjell',name:'Kjell & Company',status:'demo',activity:{...press.activity,title:k.activity.title,orders:[{id:'kabel',who:'Kabeln',items:['kaffe','tidning'],seconds:20,done:'Rätt tillbehör!'}]},reward:{...press.reward,stamp:k.reward.stamp}};
  assert.deepEqual(validatePlace(kjell),[]);
  const {q,rewards}=make({places:[kjell]}),pl=q.get('kjell');
  assert.ok(pl);q.interact(near(pl));q.pick('kaffe');q.pick('tidning');
  assert.equal(rewards.length,1);assert.equal(q.stampCount(),1);
});

// ── Besök, stämplar och badge ─────────────────────────────────────────────────────────────────────────────────────
test('digitala besök räknas en gång per session, i butiken och vid serviceytan',()=>{
  const {q,events}=make(),cerv=q.get('cervera'),press=q.get('pressbyran');
  q.step(1/30,at(-100,60));assert.equal(events.filter(e=>e.type==='place-visit').length,0);
  q.step(1/30,at(cerv.talk.x,cerv.talk.z));q.step(1/30,at(cerv.talk.x,cerv.talk.z));
  q.step(1/30,at(press.talk.x,press.talk.z+4));
  assert.equal(events.filter(e=>e.type==='place-visit').length,2);
  assert.equal(q.events.count(EVENT_TYPES.visit,'cervera'),1);assert.equal(q.events.count(EVENT_TYPES.visit,'pressbyran'),1);
  assert.equal(q.pass().every(r=>r.visited),true);
  // plan 1 räknas inte som att vara i butiken
  const f=make();f.q.step(1/30,at(cerv.talk.x,cerv.talk.z,1.68+5.4));assert.equal(f.q.events.count(EVENT_TYPES.visit,'cervera'),0);
});

test('GÅ DIT: ankomstpunkten ligger fri, framför samtalspunkten och ger knappen direkt',()=>{
  const {q}=make();
  for(const pl of q.list()){
    const a=q.arrivalFor(pl.id);assert.ok(a,pl.id);
    const d=Math.hypot(a.x-pl.talk.x,a.z-pl.talk.z);assert.ok(d>1.5&&d<pl.talk.radius,pl.id+' avstånd '+d);
    assert.ok(q.prompt(at(a.x,a.z)),pl.id+': knappen finns direkt vid ankomst');
    // blicken (yaw 0 = norrut, 180 = söderut) pekar mot samtalspunkten
    const look={x:-Math.sin(a.yaw*Math.PI/180),z:-Math.cos(a.yaw*Math.PI/180)};
    assert.ok(look.x*(pl.talk.x-a.x)+look.z*(pl.talk.z-a.z)>0,pl.id+': ser mot samtalspunkten');
  }
  const cerv=q.arrivalFor('cervera');assert.ok(mallWalkable(cerv.x,cerv.z,false),'Cervera: gångbar ankomst');
  const press=q.get('pressbyran'),pa=q.arrivalFor('pressbyran');assert.ok(pa.z>press.kiosk.rect.maxz+1,'Pressbyrån: ankomst framför disken');
  assert.equal(q.arrivalFor('kjell'),null,'framtida platser kan inte väljas');
});

test('Karlstadpasset visar bara spelbara platser med besök, uppdrag och stämpel, och märker demonstrationer',()=>{
  const {q}=make();
  const rows=q.pass();assert.equal(rows.length,2);
  for(const r of rows){assert.equal(r.demo,true);assert.equal(r.stamped,false);assert.equal(r.completed,0);assert.ok(r.title.length>3&&r.note.includes('Inget'));}
  assert.equal(q.stampTotal(),2);
});

// ── Mätning ──────────────────────────────────────────────────────────────────────────────────────────────────────
test('mätning: fem händelsetyper, bara lokalt, utan position eller personuppgifter',()=>{
  const store=storage(),ev=new PartnerEvents({storage:store,clock:()=>1_800_000_000_000,knownPlaces:['cervera','pressbyran']});
  assert.deepEqual(Object.values(EVENT_TYPES).sort(),['link_click','place_visit','quest_abort','quest_complete','quest_start']);
  const sent=[];ev.addSink(e=>sent.push(e));
  const e=ev.record(EVENT_TYPES.complete,'cervera',{points:150,first:true,seconds:61.234,x:12.3,z:-4,lat:59.38,name:'Kalle Anka',reason:'ok<script>',foo:'bar'});
  assert.deepEqual(Object.keys(e.meta).sort(),['first','points','reason','seconds']);assert.equal(e.meta.reason,'okscript');assert.equal(e.meta.seconds,61.2);
  assert.equal(ev.record('hack','cervera'),null);assert.equal(ev.record(EVENT_TYPES.start,'okänd'),null);assert.equal(ev.record(EVENT_TYPES.start,'../../x'),null);
  assert.equal(ev.count(EVENT_TYPES.complete,'cervera'),1);assert.equal(ev.count(EVENT_TYPES.complete),1);
  const raw=store.getItem(PARTNER_EVENTS_KEY);assert.ok(!/Kalle|59\.38|"x"|"z"/.test(raw),'inga personuppgifter eller position sparas');
  assert.deepEqual(Object.keys(sent[0]).sort(),['day','meta','place','type'],'det som skickas vidare har ingen exakt tid');
  const snap=ev.snapshot();assert.equal(snap.scope,'local-device');assert.equal(snap.note,LOCAL_SCOPE_NOTE);assert.match(snap.note,/Inte statistik över alla spelare/);
  const again=new PartnerEvents({storage:store,clock:()=>1_800_000_000_500});assert.equal(again.count(EVENT_TYPES.complete,'cervera'),1,'räknarna överlever omladdning');
  ev.reset();assert.equal(ev.count(EVENT_TYPES.complete),0);
});

test('mätning: spelet loggar start, avslut, avbrott och besök, och länkklick via samma gränssnitt',()=>{
  const {q}=make(),cerv=q.get('cervera'),ev=q.events;
  q.step(1/30,near(cerv));q.interact(near(cerv));q.cancel('user');q.interact(near(cerv));
  for(const it of cerv.activity.items)walk(q,{x:it.x,z:it.z},1.5);q.interact(near(cerv));
  assert.equal(ev.count(EVENT_TYPES.visit,'cervera'),1);assert.equal(ev.count(EVENT_TYPES.start,'cervera'),2);assert.equal(ev.count(EVENT_TYPES.abort,'cervera'),1);assert.equal(ev.count(EVENT_TYPES.complete,'cervera'),1);
  ev.record(EVENT_TYPES.link,'cervera',{offer:'exempel'});assert.equal(ev.count(EVENT_TYPES.link,'cervera'),1);
  assert.deepEqual(cleanMeta({x:1,z:2,reason:'a'}),{reason:'a'});
});

test('beaconSink är avstängd som standard och skickar bara till https',()=>{
  assert.equal(beaconSink('')({type:'place_visit'}),false);assert.equal(beaconSink('http://x.se')({type:'place_visit'}),false);
  const calls=[];const sink=beaconSink('https://exempel.se/events',{send:(u,b)=>{calls.push([u,b]);return true;}});
  assert.equal(sink({type:'place_visit',place:'cervera',day:'2026-10-08',meta:{}}),true);assert.equal(calls[0][0],'https://exempel.se/events');
  const ev=new PartnerEvents();ev.record(EVENT_TYPES.visit,'cervera');assert.equal(ev.sinks.length,0,'ingen mottagare är kopplad av sig själv');
});

test('badges: stämplar ger märken i det befintliga märkessystemet',async()=>{
  const {ExploreFun,BADGES}=await import('../explore-fun.mjs');
  const f=new ExploreFun({storage:storage()});
  assert.ok(BADGES.some(b=>b.id==='pass-1')&&BADGES.some(b=>b.id==='pass-all'));
  assert.deepEqual(f.notePartnerStamps(0,2).map(e=>e.id),[]);
  assert.deepEqual(f.notePartnerStamps(1,2).map(e=>e.id),['pass-1']);
  assert.deepEqual(f.notePartnerStamps(1,2).map(e=>e.id),[],'märket delas ut en gång');
  assert.deepEqual(f.notePartnerStamps(2,2).map(e=>e.id),['pass-all']);
  f.save();const g=new ExploreFun({storage:f.storage});assert.ok(g.state.badges.includes('pass-1'));assert.equal(g.state.stats.partnerStamps,2);
  // gamla sparfiler utan det nya fältet laddas utan problem
  const old=storage();old.setItem('karlstad:fun:1',JSON.stringify({version:1,collected:['a'],stats:{thermos:3}}));
  const h=new ExploreFun({storage:old});assert.equal(h.state.stats.partnerStamps,0);assert.equal(h.state.stats.thermos,3);
});
