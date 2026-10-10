// Julklappsjakten som sök och hitta (2.21.1-xmas.6): de tappade paketen delas ut med god tid och långt ifrån varandra, ett uppdrag med mål delar ut precis så många som behövs,
// introduktionen och rundorna är sökuppdrag (inga ordnade paket, ingen pil mot dem), och butiksutmaningen Pressbyrån är ett ärende som inte avbryter jakten.
import test from 'node:test';
import assert from 'node:assert/strict';
import {XmasHunt,seededRandom} from '../xmas/xmas-hunt.mjs';
import {XmasSave} from '../xmas/xmas-save.mjs';
import {FREE_RAIN,DELIVERY,TRAILS} from '../xmas/xmas-config.mjs';
import {angleGap,bearingDeg,routeProgress,routePoint,sampleCentre,inArea} from '../xmas/xmas-drops.mjs';
import {missionView} from '../xmas/xmas-guide.mjs';
import {ROUNDS,INTRO_SEARCH,buildSearch,plazaArea,PLAZA,resample,WAYPOINTS} from '../xmas/xmas-rounds.mjs';
import {INTRO,TREE} from '../xmas/xmas-layout.mjs';

const open={snap:q=>q,blocked:()=>false};
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),get length(){return m.size;},key:i=>[...m.keys()][i]??null,m};};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// ── Spridning i tid och rum ─────────────────────────────────────────────────────────────────────────────────────────────
test('regnen läggs minst separation meter från aktiva och senaste regn och i en annan riktning än de aktiva spåren (spelaren står stilla, så flera regn blir aktiva)',()=>{
  let spawns=0,withOthers=0,recents=0,relaxed=0;
  for(let seed=1;seed<=12;seed++){
    const h=new XmasHunt({rand:seededRandom(seed*7919+104729),nav:open});h.startFree();h.drain();
    const p={x:0,z:0,y:1.68};let maxActive=0;
    h.facing={x:0,z:-1};
    for(let i=0;i<4*900;i++){
      h.step(.25,p,null,0);
      for(const e of h.drain()){
        if(e.type!=='xmas-rain')continue;
        spawns++;
        const mine=h.run.rains.find(r=>r.serial===e.rain),others=h.run.rains.filter(r=>r!==mine);
        for(const o of others){
          withOthers++;
          assert.ok(dist(mine,o)>=FREE_RAIN.separation-.01,'seed '+seed+': två regn '+dist(mine,o).toFixed(0)+' m från varandra');
          if(dist(o,p)<160)assert.ok(angleGap(bearingDeg(p,mine),bearingDeg(p,o))>=FREE_RAIN.spread-.01,'seed '+seed+': spåren går åt nästan samma håll');
        }
        assert.ok(dist(mine,p)>=FREE_RAIN.minDistance*.7&&dist(mine,p)<=FREE_RAIN.maxDistance+4,'seed '+seed+': regnet ligger '+dist(mine,p).toFixed(0)+' m från spelaren');
        // inte heller på de senaste regnens platser (som försvunnit): en stillastående spelare har fem platser att undvika i en ring, så där får kravet lättas i undantagsfall (60 %), aldrig mer
        for(const q of h.run.recent){recents++;if(dist(mine,q)<FREE_RAIN.separation-.01)relaxed++;assert.ok(dist(mine,q)>=FREE_RAIN.separation*.6-.01||others.length===0&&false,'seed '+seed+': nytt regn '+dist(mine,q).toFixed(0)+' m från ett nyss borta regn');}
      }
      maxActive=Math.max(maxActive,h.run.rains.length);
    }
    assert.ok(maxActive<=FREE_RAIN.maxActive,'högst '+FREE_RAIN.maxActive+' regn åt gången: '+maxActive);
  }
  assert.ok(spawns>=40,'regn att kontrollera: '+spawns);assert.ok(withOthers>=10,'tillfällen med ett annat aktivt regn: '+withOthers);
  assert.ok(relaxed<=recents*.2,'för många regn som lättat på avståndet till ett nyss borta regn: '+relaxed+' av '+recents);
});

test('ingen ny hög medan spelaren står vid en hög hen håller på att plocka (busyRadius), men en bit bort kommer nästa',()=>{
  const h=new XmasHunt({rand:seededRandom(4),nav:open});h.startFree();h.drain();
  const p={x:0,z:0,y:1.68};h.facing={x:0,z:-1};
  for(let i=0;i<4*8;i++)h.step(.25,p,null,0);
  const rain=h.run.rains[0];assert.ok(rain);h.run.cfg.life=1e9;h.run.cfg.leaveSeconds=1e9;
  // spelaren står 20 m från regnets mitt (utom fångstavstånd, men inom busyRadius): i fem minuter kommer inget nytt regn
  const near={x:rain.x+20,z:rain.z,y:1.68};
  for(let i=0;i<4*300;i++)h.step(.25,near,null,0);
  assert.equal(h.run.rains.length,1,'inget nytt regn medan man står vid ett');assert.equal(h.run.rainSerial,1);
  // 60 m bort (men inom leaveDistance): nästa regn kommer
  const away={x:rain.x+60,z:rain.z,y:1.68};
  for(let i=0;i<4*20&&h.run.rainSerial<2;i++)h.step(.25,away,null,0);
  assert.equal(h.run.rainSerial,2,'nu kommer nästa regn');
});

test('ett klart regn följs av nästa efter afterDone[0]–afterDone[1] s, men ett regn som hamnar efter ett annat aktivt väntar minst afterDone[0] s',()=>{
  const h=new XmasHunt({rand:seededRandom(8),nav:open});h.startFree();h.drain();
  const p={x:0,z:0,y:1.68};h.facing={x:0,z:-1};
  for(let i=0;i<4*8;i++)h.step(.25,p,null,0);
  const a=h.run.rains[0];h.run.nextRainAt=h.run.t+.5;                                   // nästa regn är planerat nästan direkt
  for(let i=0;i<4*3;i++)h.step(.25,{x:a.x+60,z:a.z,y:1.68},null,0);                    // ett andra regn kommer (man står 60 m bort)
  assert.equal(h.run.rains.length,2);h.drain();
  // plocka allt i det första: ett annat regn är kvar, så nästa kommer tidigast afterDone[0] s efter att det blev klart
  for(const k of h.run.packages.filter(k=>k.rain===a.serial))h.step(.016,{x:k.x,z:k.z,y:1.68},null,0);
  h.step(.25,p,null,0);assert.ok(h.run.nextRainAt>=h.run.t+FREE_RAIN.afterDone[0]-.3,'nästa regn tidigast om '+(h.run.nextRainAt-h.run.t).toFixed(1)+' s');
});

test('en hög som ingen rört försvinner efter sin livstid, och en övergiven hög räknas bort så att nya kan komma',()=>{
  const h=new XmasHunt({rand:seededRandom(2),nav:open});h.startFree();h.drain();
  const p={x:0,z:0,y:1.68};h.facing={x:0,z:-1};let gone=0,rains=0;
  for(let i=0;i<4*900;i++){
    h.step(.25,p,null,0);
    for(const e of h.drain()){if(e.type==='xmas-rain')rains++;if(e.type==='xmas-rain-gone'){gone++;assert.ok(e.missed>0&&!e.done);}}
  }
  assert.ok(rains>=5&&gone>=rains-FREE_RAIN.maxActive,'regn '+rains+', borta '+gone);
});

// ── Uppdrag med mål: precis så många paket som behövs ────────────────────────────────────────────────────────────────────
function searchDef(over={}){
  return {kind:'round',id:'test-sok',title:'TEST',goal:14,tomte:{x:6,z:-2,radius:3.4},spawn:{x:0,z:30,yaw:0},tree:{...TREE},stampId:'intro',
    drops:{cfg:{first:2,every:[30,45],afterDone:[8,14],maxActive:1,count:[6,8],minDistance:32,maxDistance:75,separation:45,spread:40},area:plazaArea()},...over};
}
test('ett sökuppdrag med mål lägger ut precis så många paket som behövs: inga fler regn när målet är nått, och tomten tar emot',()=>{
  for(let seed=1;seed<=10;seed++){
    const save=new XmasSave(mem()),h=new XmasHunt({save,rand:seededRandom(seed*31+7),nav:open});h.startSearch(searchDef());h.drain();
    const p={x:0,z:30,y:1.68};h.facing={x:0,z:-1};let rains=0,goal=false,delivered=null;
    for(let i=0;i<4*900&&!delivered;i++){
      h.step(.25,p,null,0);
      for(const e of h.drain()){if(e.type==='xmas-rain')rains++;if(e.type==='xmas-goal')goal=true;if(e.type==='xmas-deliver')delivered=e.result;}
      const near=h.nearest(p);
      if(near&&h.run.phase==='collect'){p.x=near.pkg.x;p.z=near.pkg.z;}
      else if(h.run.phase==='deliver'){p.x=h.run.tomte.x;p.z=h.run.tomte.z;}
      // regel: finns det redan paket nog (målet plus reserve) läggs inget nytt regn ut
      if(h.run.phase==='collect'){let supply=0;for(const k of h.run.packages)if(!k.collected&&k.kind==='regular')supply++;
        assert.ok(supply<h.run.goal-h.run.collected+FREE_RAIN.reserve+FREE_RAIN.count[1]+1,'seed '+seed+': för mycket utlagt: '+supply);}
    }
    assert.ok(goal&&delivered,'seed '+seed+': målet nåddes och leveransen gjordes');
    assert.ok(rains>=2&&rains<=4,'seed '+seed+': '+rains+' regn för 14 paket');
    assert.equal(delivered.collected>=14,true);assert.equal(delivered.drops,true);assert.equal(delivered.parts.time,0,'ingen tidsbonus i sök och hitta');
    assert.ok(delivered.stamp,'stämpeln delas ut första gången');
    assert.equal(h.run.rains.filter(r=>!r.gone).length>=0,true);
  }
});

test('efter målet kommer inga fler regn, men paketen som ligger kvar går att plocka och pilen pekar på tomten',()=>{
  const h=new XmasHunt({rand:seededRandom(3),nav:open});h.startSearch(searchDef({goal:6}));h.drain();
  const p={x:0,z:30,y:1.68};h.facing={x:0,z:-1};
  for(let i=0;i<4*10;i++)h.step(.25,p,null,0);
  for(const k of h.run.packages.filter(k=>k.kind==='regular'))h.step(.016,{x:k.x,z:k.z,y:1.68},null,0);
  assert.equal(h.run.phase,'deliver');const serial=h.run.rainSerial;h.drain();
  for(let i=0;i<4*300;i++)h.step(.25,{x:p.x,z:p.z,y:1.68},null,0);
  assert.equal(h.run.rainSerial,serial,'inga fler regn efter målet');
  const t=h.guideTarget({x:30,z:30});assert.equal(t.kind,'tomte');assert.equal(t.x,6);
  assert.equal(h.objective({x:30,z:30}).kind,'xmas','pilarna på marken pekar på tomten efter målet');
});

// ── Områden: Stora Torget som yta och en gata som rutt ───────────────────────────────────────────────────────────────────
test('torget: alla regn ligger inom ytan och utanför granen, portalen, stånden, tomten och bänkarna, och första regnet ligger framför spelaren',()=>{
  const area=plazaArea();let n=0;
  for(let seed=1;seed<=30;seed++){
    const h=new XmasHunt({rand:seededRandom(seed*13+5),nav:open});h.startSearch(searchDef());h.drain();
    const p={...INTRO.spawn,y:1.68};h.facing={x:0,z:-1};
    for(let i=0;i<4*8;i++)h.step(.25,p,null,0);
    const r=h.run.rains[0];assert.ok(r,'seed '+seed);n++;
    assert.ok(inArea(area,r),'seed '+seed+': '+r.x+','+r.z+' utanför ytan eller på ett fritt område');
    assert.ok(r.x>=PLAZA.minx&&r.x<=PLAZA.maxx&&r.z>=PLAZA.minz&&r.z<=PLAZA.maxz);
    assert.ok(Math.hypot(r.x-TREE.x,r.z-TREE.z)>=8,'för nära granen');assert.ok(Math.hypot(r.x-INTRO.tomte.x,r.z-INTRO.tomte.z)>=7,'för nära tomten');
    assert.ok(dist(r,p)>=22&&dist(r,p)<=79,'seed '+seed+': '+dist(r,p).toFixed(0)+' m från start');
    assert.ok(angleGap(bearingDeg(p,r),180)<=70,'seed '+seed+': första regnet ligger inte framför spelaren (norrut, −z)');
  }
  assert.equal(n,30);
});
test('en gata som rutt: högarna läggs allt längre fram längs gatan, minst spacing meter efter förra, och högst lateral meter vid sidan',()=>{
  const route=resample([{x:0,z:0},{x:0,z:-700},{x:800,z:-700}],1),area={kind:'route',pts:route,ahead:[45,105],spacing:75,lateral:10};
  assert.equal(Math.round(routeProgress(route,{x:0,z:-100})),100);assert.ok(Math.abs(routePoint(route,150).z+150)<1.01);
  for(let seed=1;seed<=10;seed++){
    const h=new XmasHunt({rand:seededRandom(seed*17+3),nav:open});
    h.startSearch({...searchDef({goal:90}),drops:{cfg:{first:2,every:[20,25],afterDone:[5,8],maxActive:1,count:[6,8],minDistance:30,maxDistance:130,separation:55,spread:45},area}});h.drain();
    const p={x:0,z:0,y:1.68};h.facing={x:0,z:-1};const ss=[];
    for(let i=0;i<4*1800&&ss.length<7;i++){
      h.step(.25,p,null,0);
      for(const e of h.drain())if(e.type==='xmas-rain'){const r=h.run.rains.find(x=>x.serial===e.rain);ss.push(r.s);
        const q=routePoint(route,r.s);assert.ok(dist(r,q)<=area.lateral+3.1,'seed '+seed+': regnet ligger '+dist(r,q).toFixed(1)+' m från gatan');}
      const near=h.nearest(p);if(near){p.x=near.pkg.x;p.z=near.pkg.z;}else{const nx=routePoint(route,Math.min(route.at(-1).s,routeProgress(route,p)+4));p.x=nx.x;p.z=nx.z;} // går längs gatan när inget finns att hämta
    }
    assert.ok(ss.length>=5,'seed '+seed+': '+ss.length+' regn');
    for(let i=1;i<ss.length;i++)assert.ok(ss[i]>=ss[i-1]+area.spacing-1.5,'seed '+seed+': regn '+i+' ligger '+(ss[i]-ss[i-1]).toFixed(0)+' m efter förra längs gatan');
    assert.ok(ss[0]>=area.ahead[0]*.8-1&&ss[0]<=area.ahead[1]+1,'seed '+seed+': första regnet '+ss[0].toFixed(0)+' m in på gatan');
  }
});
test('en rund rutt som slutar där den började: första högen ligger först på rutten, inte vid slutet, och framstegen räknas inte som klara från början',()=>{
  const loop=resample([{x:0,z:0},{x:0,z:-250},{x:0,z:0}],1),area={kind:'route',pts:loop,ahead:[45,105],spacing:75,lateral:10};
  assert.equal(Math.round(routeProgress(loop,{x:0,z:0})),0,'utan ledtråd: första träffen (början)');
  assert.ok(routeProgress(loop,{x:0,z:-2},{at:0})<5,'med ledtråd från början stannar man i början');
  assert.ok(routeProgress(loop,{x:0,z:-2},{at:495})>480,'med ledtråd från slutet stannar man i slutet');
  for(let seed=1;seed<=20;seed++){
    const h=new XmasHunt({rand:seededRandom(seed*101+9),nav:open});
    h.startSearch({...searchDef({goal:40}),drops:{cfg:{first:2,every:[20,25],afterDone:[5,8],maxActive:1,count:[6,8],minDistance:30,maxDistance:130,separation:55,spread:45},area}});h.drain();
    const p={x:0,z:0,y:1.68};h.facing={x:0,z:-1};
    for(let i=0;i<4*6;i++)h.step(.25,p,null,0);
    const r=h.run.rains[0];assert.ok(r,'seed '+seed);
    assert.ok(r.s>=30&&r.s<=110,'seed '+seed+': första högen ligger '+Math.round(r.s)+' m in på rundan (bör vara 36–105)');
  }
});
test('sampleCentre: första regnet framför spelaren, därefter åt alla håll; en rutt ger båglängd',()=>{
  const F={...FREE_RAIN},p={x:10,z:10};let ahead=0,all=new Set();
  for(let i=0;i<200;i++){
    const r=seededRandom(i*7919+104729),c=sampleCentre(null,{p,F,rand:r,facing:{x:1,z:0},first:true});if(angleGap(bearingDeg(p,c),90)<=60.2)ahead++;
    const d=sampleCentre(null,{p,F,rand:r,facing:{x:1,z:0},first:false});all.add(Math.round(bearingDeg(p,d)/45));
  }
  assert.equal(ahead,200,'första regnet inom ±60° från blickriktningen');assert.ok(all.size>=6,'därefter åt alla håll');
});

// ── Butiksutmaningen som ärende ───────────────────────────────────────────────────────────────────────────────────────────
test('ett ärende (leverans efter Pressbyrån) avbryter inte jakten: pilen pekar på tomten som väntar, poäng och stämpel delas ut, och jakten fortsätter',()=>{
  const save=new XmasSave(mem()),h=new XmasHunt({save,rand:seededRandom(6),nav:open});h.startSearch(searchDef());h.drain();
  const p={x:0,z:30,y:1.68};h.facing={x:0,z:-1};
  for(let i=0;i<4*6;i++)h.step(.25,p,null,0);
  const pts0=h.run.points,serial=h.run.serial,rains=h.run.rains.length;assert.ok(rains>=1);
  assert.equal(h.startErrand({id:'delivery-pressbyran',title:'FIKAORDER',tomte:{x:20,z:-40,radius:3.2},stampId:'pressbyran'}),true);
  assert.equal(h.snapshot().errand,'delivery-pressbyran');
  const t=h.guideTarget(p);assert.equal(t.kind,'tomte');assert.equal(t.x,20);assert.equal(t.z,-40);
  assert.equal(h.objective(p).kind,'xmas');assert.equal(missionView(h.run).rows[0].text,'BÄR FIKAT TILL TOMTEN');
  h.drain();h.step(.1,{x:20,z:-38,y:1.68},null,0);
  const done=h.drain().find(e=>e.type==='xmas-errand-done');assert.ok(done,'ärendet klart');assert.equal(done.points,DELIVERY.points);assert.equal(done.stamp,true);
  assert.equal(h.run.points,pts0+DELIVERY.points);assert.ok(save.hasStamp('pressbyran'));assert.equal(h.run.serial,serial,'samma jakt');assert.equal(h.run.rains.length,rains,'spåren ligger kvar');
  assert.equal(h.guideTarget(p),null,'ingen pil mot paketen efter ärendet heller');assert.equal(h.snapshot().errand,null);
  assert.equal(h.startErrand({id:'x',tomte:null}),false);
  const nothing=new XmasHunt({});assert.equal(nothing.startErrand({id:'x',tomte:{x:0,z:0}}),false,'ingen jakt, inget ärende');
});

// ── Uppdragsraden ───────────────────────────────────────────────────────────────────────────────────────────────────────────
test('uppdragsraden i ett sökuppdrag: hitta spåren, lämna hos tomten och en butiksrad nära en butik; efter målet räknas julklapparna och tomten är nästa steg',()=>{
  const h=new XmasHunt({rand:seededRandom(9),nav:open});h.startSearch(searchDef());h.run.t=1e3;h.stepRain({x:0,z:30});
  const txt=v=>v.rows.map(r=>r.state+':'+r.text);
  const far={x:200,z:200};
  assert.deepEqual(txt(missionView(h.run,far)),['now:HITTA TOMTARNAS SPÅR','next:LÄMNA HOS TOMTEN']);
  assert.deepEqual(txt(missionView(h.run,far,'UPPDRAG: PRESSBYRÅN')),['now:HITTA TOMTARNAS SPÅR','next:LÄMNA HOS TOMTEN','next:UPPDRAG: PRESSBYRÅN']);
  // Inom 25 m från butiken är butiksraden ett aktuellt steg: den syns då även på låga skärmar, där bara aktuella steg visas (xmas.css, max-height:700px).
  assert.deepEqual(txt(missionView(h.run,far,{text:'UPPDRAG: PRESSBYRÅN',near:false})),['now:HITTA TOMTARNAS SPÅR','next:LÄMNA HOS TOMTEN','next:UPPDRAG: PRESSBYRÅN']);
  assert.deepEqual(txt(missionView(h.run,far,{text:'UPPDRAG: PRESSBYRÅN',near:true})),['now:HITTA TOMTARNAS SPÅR','next:LÄMNA HOS TOMTEN','now:UPPDRAG: PRESSBYRÅN']);
  assert.equal(missionView(h.run,far,{text:'',near:true}).rows.length,2,'en tom text ger ingen rad');
  const rain=h.run.rains[0];assert.equal(missionView(h.run,{x:rain.x+5,z:rain.z}).rows[0].text,'JULKLAPPARNA NÄRA!');
  for(const v of [missionView(h.run,far,'UPPDRAG: PRESSBYRÅN'),missionView(h.run,{x:rain.x,z:rain.z})])for(const r of v.rows)assert.ok(r.text.length<=20,r.text+' är för lång');
  h.run.collected=14;h.run.phase='deliver';assert.deepEqual(txt(missionView(h.run)),['done:JULKLAPPAR 14/14','now:LÄMNA HOS TOMTEN']);
  h.run.phase='done';assert.deepEqual(txt(missionView(h.run)),['done:JULKLAPPAR 14/14','done:LÄMNA HOS TOMTEN']);
  const f=new XmasHunt({nav:open});f.startFree();f.run.t=1e3;f.stepRain({x:0,z:0});
  assert.equal(missionView(f.run,{x:300,z:300},'UPPDRAG: CERVERA').rows.length,2,'fri julvandring har ingen lämna-rad, men en butiksrad');
});

// ── Uppdragen byggs ur definitionerna ────────────────────────────────────────────────────────────────────────────────────────
test('buildSearch: introduktionen är en hög i taget på torget med mål 14, rundorna har egna mål, och tomten, startplatsen och granen är de gamla',()=>{
  const intro=buildSearch(INTRO_SEARCH,null);
  assert.equal(intro.kind,'intro');assert.equal(intro.goal,14);assert.equal(intro.drops.cfg.maxActive,1);assert.equal(intro.stampId,'intro');assert.equal(intro.soft,0);
  assert.deepEqual(intro.tomte,INTRO.tomte);assert.deepEqual(intro.spawn,INTRO.spawn);assert.equal(intro.drops.area.kind,'rect');
  assert.deepEqual(ROUNDS.map(r=>r.search.goal),[18,24,28]);assert.deepEqual(ROUNDS.map(r=>r.search.area),['plaza','route','route']);
  const nav={point:p=>({x:p.x,z:p.z}),blocked:()=>false,clear:()=>true,path:(a,b)=>{const out=[],n=Math.max(1,Math.ceil(dist(a,b)/3));for(let i=0;i<=n;i++)out.push({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n});return out;}};
  for(const def of ROUNDS){
    const run=buildSearch(def,nav);
    assert.equal(run.kind,'round');assert.equal(run.id,def.id);assert.equal(run.goal,def.search.goal);assert.equal(run.stampId,def.id);assert.equal(run.soft,0);
    assert.equal(run.drops.cfg.maxActive,2);assert.ok(run.drops.cfg.count[0]>=6&&run.drops.cfg.count[1]<=9);
    if(def.search.area==='route'){assert.equal(run.drops.area.kind,'route');assert.ok(run.length>=380,def.id+' rutten är '+run.length+' m');
      // rutten ger minst så många högar som målet kräver, med reserv (6–9 paket per hög)
      const drops=Math.floor((run.length-60)/def.search.route.spacing);assert.ok(drops*run.drops.cfg.count[0]>=run.goal+6,def.id+' rymmer '+drops+' högar för mål '+run.goal);}
    else assert.equal(run.drops.area.kind,'rect');
  }
  assert.ok(WAYPOINTS.torget);
});
test('sökuppdragen går att göra hela vägen på riktigt: introduktionen och alla tre rundorna klaras av en spelare som följer spåren, utan någon pil mot paketen',()=>{
  const nav={point:p=>({x:p.x,z:p.z}),blocked:()=>false,clear:()=>true,path:(a,b)=>{const out=[],n=Math.max(1,Math.ceil(dist(a,b)/3));for(let i=0;i<=n;i++)out.push({x:a.x+(b.x-a.x)*i/n,z:a.z+(b.z-a.z)*i/n});return out;}};
  for(const def of [INTRO_SEARCH,...ROUNDS]){
    const run=buildSearch(def,nav),save=new XmasSave(mem()),h=new XmasHunt({save,rand:seededRandom(77),nav:open});h.startSearch(run);h.drain();
    const p={x:run.spawn.x,z:run.spawn.z,y:1.68};h.facing={x:0,z:-1};let delivered=null,t=0,arrows=0;
    for(let i=0;i<4*1800&&!delivered;i++){
      h.step(.25,p,null,0);t+=.25;
      if(h.run.phase==='collect'){const g=h.guideTarget(p);if(g&&g.kind!=='trail')arrows++;}
      for(const e of h.drain())if(e.type==='xmas-deliver')delivered=e.result;
      const near=h.nearest(p);
      // går 7,2 m/s mot närmaste paket när något finns, annars mot tomten (efter målet) eller står stilla
      const to=h.run.phase==='deliver'?h.run.tomte:near?near.pkg:null;
      if(to){const d=dist(p,to),s=Math.min(d,7.2*.25);p.x+=(to.x-p.x)/(d||1)*s;p.z+=(to.z-p.z)/(d||1)*s;}
    }
    assert.ok(delivered,def.id+' klarades inte på 30 minuter');assert.equal(arrows,0,def.id+': ingen pil mot paketen under letandet');
    assert.ok(t>=25&&t<=900,def.id+' tog '+t.toFixed(0)+' s för en spelare som går rakt till varje paket');
    assert.ok(delivered.collected>=run.goal);
  }
});
test('spårens inställningar är oförändrade och passar de nya avstånden: ett spår börjar nära spelaren och tar slut före paketen',()=>{
  assert.equal(TRAILS.lead,14);assert.ok(FREE_RAIN.maxDistance<=TRAILS.maxPrints*TRAILS.step,'spåret hinner täcka den längsta sträckan');
  assert.ok(FREE_RAIN.count[1]<=9&&FREE_RAIN.maxActive===2&&FREE_RAIN.separation>=60&&FREE_RAIN.afterDone[0]>=8);
});
