// Julmarknaden på Stora Torget (xmas.13): utlägget (inget står på paket, spawn, tomten, grundspelets föremål eller på varandra), scenprogrammet och folkmassan
// (ingen går igenom något, köerna går framåt, folk kommer och går).
import test from 'node:test';
import assert from 'node:assert/strict';
import {OPEN,START_VIEW,TRUCKS,TRUCK,TABLES,LANE,LANE_STALL,LOT,LOT_TREES,STAGE,STAGE_PROGRAM,BOOTH,COTTAGE,FIRES,POLES,STRINGS,SIGNS,marketColliders,stageActAt,nextActAfter,inRect} from '../xmas/xmas-market-data.mjs';
import {xmasColliders,STALLS,FIRS,ARCH} from '../xmas/xmas-decor-data.mjs';
import {INTRO,TREE,TORGET_PROPS} from '../xmas/xmas-layout.mjs';
import {Crowd,CROWD,buildWalkGraph,buildSpots,crowdObstacles,clearance,segmentClear,pathBetween,nearestNode,mulberry,offsetPath,EXITS} from '../xmas/xmas-crowd.mjs';
import {PEOPLE_STYLES,peopleUv,stylesOf,styleIndex} from '../xmas/xmas-people-art.js';

const rectDistance=(r,p)=>{const dx=Math.max(r.minx-p.x,0,p.x-r.maxx),dz=Math.max(r.minz-p.z,0,p.z-r.maxz);return Math.hypot(dx,dz);};
const rectGap=(a,b)=>{const dx=Math.max(a.minx-b.maxx,0,b.minx-a.maxx),dz=Math.max(a.minz-b.maxz,0,b.minz-a.maxz);return Math.hypot(dx,dz);};
// Grundspelets fasta föremål på torget som inte är kollisionsrutor (city-south.js, kungsgatan-reference.mjs, app.js)
const BASE=[{id:'uteservering-v',minx:-30.5,maxx:-17.5,minz:-42.6,maxz:-37.4},{id:'uteservering-o',minx:11.5,maxx:24.5,minz:-42.6,maxz:-37.4},{id:'gul vagn',minx:-46.3,maxx:-35.4,minz:-20.7,maxz:-17.3},
  {id:'marknadsbord-28',minx:25.3,maxx:30.7,minz:-21,maxz:-19},{id:'marknadsbord-40',minx:37.3,maxx:42.7,minz:-21,maxz:-19},{id:'fredsmonumentet',minx:-34,maxx:-29.5,minz:-4.8,maxz:-.3},
  ...[[-47,-18],[-47,17],[56,-18],[56,17]].map(([x,z],i)=>({id:'bänk-'+i,minx:x-1.8,maxx:x+1.8,minz:z-.4,maxz:z+.4})),{id:'kaffekiosken',minx:-10.6,maxx:-7.4,minz:18.6,maxz:21.4},{id:'busshållplatsen',minx:-20.5,maxx:-17.5,minz:33.5,maxz:36.5}];
const market=marketColliders();

test('marknadens kollisionsrutor: på den öppna ytan, utanför startvyn och inte i vägen för introduktionens paket, spawn och tomten',()=>{
  assert.ok(market.length>=30,'minst 30 rutor, fick '+market.length);
  const targets=[...INTRO.packages,{x:INTRO.spawn.x,z:INTRO.spawn.z,id:'spawn'},{x:INTRO.tomte.x,z:INTRO.tomte.z,id:'tomten'}];
  for(const c of market){
    assert.ok(c.minx>=OPEN.minx&&c.maxx<=OPEN.maxx&&c.minz>=OPEN.minz&&c.maxz<=OPEN.maxz,c.osm+' utanför den öppna ytan');
    assert.ok(rectGap(c,START_VIEW)>0,c.osm+' står i startvyn');
    for(const t of targets)assert.ok(rectDistance(c,t)>=(t.id==='tomten'?5:3),c.osm+' för nära '+t.id);
    assert.ok(Math.hypot(c.cx-TREE.x,c.cz-TREE.z)>30,c.osm+' för nära granen (introduktionens spiral)');
    for(const [px,pz] of TORGET_PROPS)assert.ok(rectDistance(c,{x:px,z:pz})>=1.4,c.osm+' för nära bänk/lykta '+px+','+pz);
  }
});
test('marknaden står inte på julens egna stånd, granar och portal, inte på grundspelets föremål och inte på sig själv',()=>{
  for(const c of market){
    for(const o of xmasColliders())assert.ok(rectGap(c,o)>=1.5,c.osm+' för nära '+o.osm);
    for(const f of FIRS)assert.ok(rectDistance(c,f)>=2.5,c.osm+' för nära '+f.id);
    for(const b of BASE)assert.ok(rectGap(c,b)>=1.0,c.osm+' står på grundspelets '+b.id+' ('+rectGap(c,b).toFixed(2)+' m)');
  }
  // sinsemellan: bara staketets bitar och boden i julgransförsäljningen får ligga intill varandra
  for(let i=0;i<market.length;i++)for(let j=i+1;j<market.length;j++){
    const a=market[i],b=market[j];if(a.osm.startsWith('xmas-lot')&&b.osm.startsWith('xmas-lot'))continue;
    assert.ok(rectGap(a,b)>=.8,a.osm+' och '+b.osm+' står för tätt ('+rectGap(a,b).toFixed(2)+' m)');
  }
  for(const p of POLES){for(const c of market)assert.ok(rectDistance(c,p)>=.4,p.id+' i '+c.osm);for(const b of BASE)assert.ok(rectDistance(b,p)>=.8,p.id+' på '+b.id);}
});
test('foodtrucks: fyra med unika namn, luckan mot torget, köplatserna fria',()=>{
  assert.equal(TRUCKS.length,4);assert.equal(new Set(TRUCKS.map(t=>t.kind.name)).size,4);
  for(const t of TRUCKS){assert.deepEqual(t.facing,{x:0,z:-1});assert.ok(t.hatch.z<t.z-TRUCK.wid/2);}
  const spots=buildSpots().filter(s=>s.kind==='queue'),obs=crowdObstacles();
  assert.equal(spots.length,16);
  for(const s of spots)assert.ok(clearance(obs,s.x,s.z)>=.3,s.id+' står i något ('+clearance(obs,s.x,s.z).toFixed(2)+')');
});
test('julgransförsäljningen: en öppning mot torget (öster), granarna inne i inhägnaden och inte i gången eller på boden',()=>{
  assert.ok(LOT.gate.maxz-LOT.gate.minz>=6,'öppningen minst 6 m');
  assert.ok(LOT_TREES.length>=15,'minst 15 granar, fick '+LOT_TREES.length);
  const hut={minx:LOT.hut.x-LOT.hut.w/2,maxx:LOT.hut.x+LOT.hut.w/2,minz:LOT.hut.z-LOT.hut.d/2,maxz:LOT.hut.z+LOT.hut.d/2};
  for(const t of LOT_TREES){assert.ok(t.x>LOT.minx+1&&t.x<LOT.maxx-1&&t.z>LOT.minz+1&&t.z<LOT.maxz-1,t.id+' utanför');assert.ok(rectDistance(hut,t)>=.8,t.id+' på boden');
    assert.ok(!(t.x>LOT.maxx-7&&t.z>LOT.gate.minz-1&&t.z<LOT.gate.maxz+1),t.id+' i gången in');}
  assert.ok(LOT_TREES.some(t=>t.net)&&LOT_TREES.some(t=>t.lean)&&LOT_TREES.some(t=>!t.net&&!t.lean),'stående, i nät och buntade');
});
test('scenprogrammet: i tidsordning, utan överlapp, en akt i taget och nästa akt efter kvällen är morgonens',()=>{
  for(let i=1;i<STAGE_PROGRAM.length;i++)assert.ok(STAGE_PROGRAM[i].start>=STAGE_PROGRAM[i-1].end,STAGE_PROGRAM[i].title);
  for(const a of STAGE_PROGRAM){assert.ok(a.end>a.start);assert.ok(['choir','band','tomte'].includes(a.act));assert.equal(stageActAt(a.start).title,a.title);assert.notEqual(stageActAt(a.end-1e-6),null);}
  assert.equal(stageActAt(3),null);assert.equal(stageActAt(23.5),null);assert.equal(nextActAfter(23.5).title,STAGE_PROGRAM[0].title);assert.equal(nextActAfter(13).title,STAGE_PROGRAM.find(a=>a.start>13).title);
  assert.equal(stageActAt(-1),stageActAt(23));assert.equal(stageActAt(36).title,stageActAt(12).title);
});
test('skyltar och slingor: unika id, högst två rader, slingorna mellan stolpar som finns och lagom långa',()=>{
  assert.equal(new Set(SIGNS.map(s=>s.id)).size,SIGNS.length);
  for(const s of SIGNS){assert.ok(s.lines.length>=1&&s.lines.length<=2);assert.ok(s.lines.every(l=>l.length<=28),s.id);assert.ok([0,90,-90,180].includes(s.yaw),s.id);}
  for(const st of STRINGS){assert.ok(POLES[st.a]&&POLES[st.b]);const L=Math.hypot(POLES[st.a].x-POLES[st.b].x,POLES[st.a].z-POLES[st.b].z);assert.ok(L>=3&&L<=26,'slinga '+L.toFixed(1)+' m');}
});
test('marknadsgränden: stånd på båda sidor vända mot varandra, en gata på minst 7 m mellan dem',()=>{
  const n=LANE.filter(s=>s.facing.z>0),s=LANE.filter(s=>s.facing.z<0);
  assert.equal(n.length,4);assert.equal(s.length,4);
  assert.ok(Math.min(...s.map(x=>x.rect.minz))-Math.max(...n.map(x=>x.rect.maxz))>=7);
  assert.equal(new Set(LANE.map(x=>x.kind.sign)).size,8);
  for(const l of LANE)assert.ok(inRect(l.rect,l.seller),l.id+': säljaren står i ståndet');
});

// ── Folkmassan ──────────────────────────────────────────────────────────────────────────────────────────────────
const graph=buildWalkGraph();
const styles={walk:stylesOf('adult','bags','cup'),kid:stylesOf('kid'),slow:stylesOf('elder','stroller'),tree:styleIndex('tree'),staff:k=>Math.max(0,styleIndex(k))};
test('gångnätet: sammanhängande, med fritt avstånd till allt, och alla platser och utgångar går att nå',()=>{
  assert.ok(graph.nodes.length>500,'noder: '+graph.nodes.length);
  for(const n of graph.nodes)assert.ok(clearance(graph.obs,n.x,n.z)>=CROWD.clearance-1e-9);
  for(const n of graph.nodes)for(const l of n.links)assert.ok(segmentClear(graph.obs,n,graph.nodes[l],CROWD.clearance*.85-1e-9));
  const a=graph.nodes[0];for(const e of EXITS){const b=nearestNode(graph,e);assert.ok(b&&Math.hypot(b.x-e.x,b.z-e.z)<6,'utgång '+e.x+','+e.z);assert.ok(pathBetween(graph,a,b),'väg till utgång');}
});
test('sidoförskjutningen ligger fast i vägens punkter (ingen jagar ett mål som flyttar sig)',()=>{
  const p=offsetPath([{x:0,z:0},{x:5,z:0},{x:10,z:0}],.5);
  assert.deepEqual(p[0],{x:0,z:0});assert.deepEqual(p[2],{x:10,z:0});assert.ok(Math.abs(Math.abs(p[1].z)-.5)<1e-9&&p[1].x===5);
});
test('folkmassan: ingen går igenom något, alla kommer fram, köerna går framåt och antalet besökare håller sig',()=>{
  const c=new Crowd({rand:mulberry(11),graph,styles});
  const obs=graph.obs;let worst=Infinity,worstAt=null,queued=0,served=0,maxQueue=0,carriers=0;
  const seenQueue=new Map(),spotsAll=c.spots;
  for(let i=0;i<6000;i++){ // tio minuter med 0,1 s steg
    c.step(.1,i%300<150?{x:Math.sin(i/90)*30,z:Math.cos(i/120)*25}:null);
    if(i%5)continue;
    for(const a of c.agents){
      if(a.state==='dwell')continue;
      if(a.spot&&a.spot.inLot&&a.x<-49)continue;            // inne i julgransförsäljningen går man mellan granarna
      if(spotsAll.some(s=>Math.hypot(s.x-a.x,s.z-a.z)<1.6))continue; // sista biten fram till (och från) en plats vid ett stånd, bord eller en eldkorg
      const d=clearance(obs,a.x,a.z);if(d<worst){worst=d;worstAt={x:+a.x.toFixed(1),z:+a.z.toFixed(1),spot:a.spot?.id,carrier:!!a.carrier};}
    }
    const q=c.agents.filter(a=>a.state==='dwell'&&a.spot&&a.spot.kind==='queue');queued=Math.max(queued,q.length);
    for(const a of q){if(a.spot.order===0&&!seenQueue.has(a.id)){seenQueue.set(a.id,1);served++;}}
    const per=new Map();for(const a of q)per.set(a.spot.truck,(per.get(a.spot.truck)||0)+1);maxQueue=Math.max(maxQueue,...per.values(),0);
    carriers=Math.max(carriers,c.agents.filter(a=>a.carrier).length);
    assert.ok(c.agents.filter(a=>!a.carrier).length>=CROWD.visitors-8,'besökarna blev för få vid '+i);
  }
  assert.ok(worst>=.15,'någon gick för nära något: '+worst.toFixed(2)+' m vid '+JSON.stringify(worstAt));
  assert.ok(served>=10,'minst tio blev serverade vid luckorna, fick '+served);
  assert.ok(maxQueue>=2,'det bildas köer (minst två i en kö), största '+maxQueue);
  assert.ok(carriers>=1,'någon bar hem en gran');
  // ingen står still på vägen: alla som går har ett mål
  for(const a of c.agents)if(a.state==='go')assert.ok(a.path&&a.pi<=a.path.length);
});
test('spelaren: besökare kliver åt sidan när spelaren står i vägen',()=>{
  const c=new Crowd({rand:mulberry(3),graph,styles,count:12});
  const a=c.agents[0];a.state='dwell';a.wait=100;const p={x:a.x+.3,z:a.z};
  for(let i=0;i<20;i++)c.step(.05,p);
  const q=c.people().find(q=>Math.abs(q.x-a.x-a.dodge.x)<1e-9);
  assert.ok(Math.hypot(a.dodge.x,a.dodge.z)>.4,'klev undan '+Math.hypot(a.dodge.x,a.dodge.z).toFixed(2));
});
test('figurerna: alla stilar har två rutor i arket, och personalen har sina stilar',()=>{
  for(let i=0;i<PEOPLE_STYLES.length;i++)for(const f of [0,1]){const [u0,v0,u1,v1]=peopleUv(i,f);assert.ok(u0>=0&&u1<=1&&v0>=0&&v1<=1&&u1>u0&&v1>v0);}
  for(const k of ['seller','tomte','tomtemor','singer','choir','guitar','bass','tree','kid'])assert.ok(styleIndex(k)>=0,k);
});
