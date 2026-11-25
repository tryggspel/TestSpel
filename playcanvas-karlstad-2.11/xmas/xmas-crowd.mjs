// Folklivet på julmarknaden (2.21.1-xmas.13): besökare som kommer in från gatorna, går mellan stånd, köar vid foodtrucks, lyssnar på scenen, värmer sig vid eldkorgarna,
// tittar på granarna i julgransförsäljningen och går hem igen; säljare i stånden och vagnarna; någon som bär hem en gran. Ren modul (ingen DOM, ingen PlayCanvas, seedad slump),
// så att det går att köra i test: ingen går igenom något som står på torget, köerna går framåt, och folk kommer och går.
//
// Hur de hittar: ett gångnät (rutnät med 3,5 m mellan punkterna) över den öppna ytan, där varje punkt och varje länk håller avstånd till allt som står där. Mellan två platser går man
// den kortaste vägen i nätet (bredden först), med en liten sidoförskjutning per person så att alla inte går på samma linje. Ingen fysik: figurerna kolliderar inte med spelaren,
// men kliver åt sidan om spelaren kommer för nära.
import {OPEN,TRUCKS,TRUCK,LANE,LOT,LOT_TREES,STAGE,BOOTH,COTTAGE,FIRES,TABLES,POLES,marketColliders} from './xmas-market-data.mjs?v=2.21.1-xmas.13';
import {STALLS,STALL,xmasColliders} from './xmas-decor-data.mjs?v=2.21.1-xmas.13';
import {TREE,TORGET_PROPS} from './xmas-layout.mjs?v=2.21.1-xmas.13';

export const CROWD=Object.freeze({
  cell:3.5,clearance:1.0,           // gångnätet: avstånd mellan punkterna och minsta fria avstånd till rutor och föremål
  visitors:58,                      // besökare samtidigt (sänks automatiskt på svag enhet)
  speed:Object.freeze([1.05,1.45]),kidSpeed:Object.freeze([1.3,1.8]),slowSpeed:Object.freeze([.75,1.0]),
  visits:Object.freeze([3,6]),      // så många platser en besökare stannar vid innan den går hem
  respawn:Object.freeze([.8,3.5]),     // sekunder innan en ny besökare kommer in från en gata
  sidestep:1.15,                    // kliver undan om spelaren är närmare än så här (m)
  lateral:.55,                      // största sidoförskjutning när man går (m)
  carrierEvery:Object.freeze([25,55]) // så ofta någon kommer ut från julgransförsäljningen med en gran
});

// Hindren: alla kollisionsrutor (julens och marknadens), grundspelets bänkar, lyktor, pollare och kaffekiosken, stolparna och granarna i inhägnaden.
export function crowdObstacles(){
  const rects=[...xmasColliders(),...marketColliders()].map(c=>({minx:c.minx,maxx:c.maxx,minz:c.minz,maxz:c.maxz}));
  const circles=[...TORGET_PROPS.map(([x,z])=>({x,z,r:1.1})),{x:-9,z:20,r:1.8},{x:TREE.x,z:TREE.z,r:4.2}, // kaffekiosken (journey-view) och granens fot med presenterna
    ...[-18,-12,-6,0,6,12,18].flatMap(z=>[{x:-31,z,r:.45},{x:31,z,r:.45}]),                         // pollarna (app.js addPlazaPattern)
    ...POLES.map(p=>({x:p.x,z:p.z,r:.35})),...LOT_TREES.map(t=>({x:t.x,z:t.z,r:.85})),
    {x:-31.75,z:-2.54,r:2.6},...[[-47,-18],[-47,17],[56,-18],[56,17]].map(([x,z])=>({x,z,r:2}))]; // Fredsmonumentet och bänkarna (city-south.js)
  // grundspelets uteserveringar på Kungsgatan, den gula vagnen och marknadsborden (city-south.js, kungsgatan-reference.mjs)
  rects.push({minx:-30.6,maxx:-17.4,minz:-42.8,maxz:-37.2},{minx:11.4,maxx:24.6,minz:-42.8,maxz:-37.2},{minx:-46.6,maxx:-35.2,minz:-20.9,maxz:-17.1},{minx:25.2,maxx:30.8,minz:-21.1,maxz:-18.9},{minx:37.2,maxx:42.8,minz:-21.1,maxz:-18.9});
  return {rects,circles};
}
const rectDist=(r,x,z)=>{const dx=Math.max(r.minx-x,0,x-r.maxx),dz=Math.max(r.minz-z,0,z-r.maxz);return Math.hypot(dx,dz);};
export function clearance(obs,x,z){
  let d=Infinity;
  for(const r of obs.rects){const v=rectDist(r,x,z);if(v<d)d=v;}
  for(const c of obs.circles){const v=Math.hypot(c.x-x,c.z-z)-c.r;if(v<d)d=v;}
  return d;
}
export function segmentClear(obs,a,b,min){
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.4));
  for(let i=0;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n;if(clearance(obs,x,z)<min)return false;}
  return true;
}

// Gångnätet över den öppna ytan (inte inne i julgransförsäljningen; dit leder egna punkter genom öppningen).
export function buildWalkGraph(obs=crowdObstacles(),{cell=CROWD.cell,min=CROWD.clearance}={}){
  const nodes=[],at=new Map(),key=(i,j)=>i+','+j;
  const inLot=(x,z)=>x>LOT.minx-1&&x<LOT.maxx+1&&z>LOT.minz-1&&z<LOT.maxz+1;
  for(let i=0,x=OPEN.minx+1;x<=OPEN.maxx-1;i++,x+=cell)for(let j=0,z=OPEN.minz+1;z<=OPEN.maxz-1;j++,z+=cell){
    if(inLot(x,z))continue;
    if(x<-69&&z>-30&&z<22)continue; // byggnaden i väster
    if(clearance(obs,x,z)<min)continue;
    const n={id:nodes.length,x:+x.toFixed(2),z:+z.toFixed(2),i,j,links:[]};nodes.push(n);at.set(key(i,j),n);
  }
  for(const n of nodes)for(const [di,dj] of [[1,0],[0,1],[1,1],[1,-1]]){
    const m=at.get(key(n.i+di,n.j+dj));if(!m)continue;
    if(segmentClear(obs,n,m,min*.85)){n.links.push(m.id);m.links.push(n.id);}
  }
  // största sammanhängande delen
  const comp=new Int32Array(nodes.length).fill(-1);let best=-1,bestSize=0,c=0;
  for(const n of nodes){if(comp[n.id]>=0)continue;const q=[n.id];comp[n.id]=c;let size=0;for(let k=0;k<q.length;k++){size++;for(const l of nodes[q[k]].links)if(comp[l]<0){comp[l]=c;q.push(l);}}if(size>bestSize){bestSize=size;best=c;}c++;}
  const keep=nodes.filter(n=>comp[n.id]===best),remap=new Map(keep.map((n,i)=>[n.id,i]));
  const out=keep.map((n,i)=>({id:i,x:n.x,z:n.z,links:n.links.filter(l=>remap.has(l)).map(l=>remap.get(l))}));
  return {nodes:out,obs,min};
}
// Närmaste nod; med reachFrom den närmaste av de åtta närmaste som går att nå i rak linje (annars den närmaste).
export function nearestNode(g,p,{reachFrom=null}={}){
  const near=[];
  for(const n of g.nodes){const d=(n.x-p.x)**2+(n.z-p.z)**2;if(near.length<8||d<near[near.length-1].d){near.push({n,d});near.sort((a,b)=>a.d-b.d);if(near.length>8)near.pop();}}
  if(!near.length)return null;
  if(!reachFrom)return near[0].n;
  for(const c of near)if(segmentClear(g.obs,reachFrom,c.n,g.min*.7))return c.n;
  return near[0].n;
}
// Kortaste vägen i antal steg (bredden först) mellan två noder: en lista punkter.
export function pathBetween(g,a,b){
  if(a.id===b.id)return [a];
  const prev=new Int32Array(g.nodes.length).fill(-1),q=[a.id];prev[a.id]=a.id;
  for(let k=0;k<q.length;k++){const id=q[k];if(id===b.id)break;for(const l of g.nodes[id].links)if(prev[l]<0){prev[l]=id;q.push(l);}}
  if(prev[b.id]<0)return null;
  const out=[];for(let id=b.id;;id=prev[id]){out.push(g.nodes[id]);if(id===a.id)break;}
  return out.reverse();
}

// ── Platserna man stannar vid ─────────────────────────────────────────────────────────────────────────────────
// {id, kind, x, z, face:{x,z} (dit man tittar), dwell:[min,max] sekunder, weight, group (köer: ordning)}
export function buildSpots(){
  const spots=[],add=(o)=>spots.push({dwell:[9,22],weight:1,...o,id:o.id||o.kind+'-'+spots.length});
  // stånden i ringen (vända mot granen) och på marknadsgatan: en plats framför disken, ibland två
  for(const s of STALLS){const fx=-s.fx,fz=-s.fz,d=STALL.d/2+1.25;add({kind:'stall',x:s.x+fx*d,z:s.z+fz*d,face:{x:s.x,z:s.z},weight:1.2});}
  for(const s of LANE){const d=2.0/2+1.25,fz=s.facing.z;add({kind:'stall',x:s.x-.6,z:s.z+fz*d,face:{x:s.x,z:s.z},weight:1.2});add({kind:'stall',x:s.x+.7,z:s.z+fz*(d+.2),face:{x:s.x,z:s.z},weight:.7});}
  // köerna vid foodtrucksen: fyra platser bakåt från luckan, i ordning
  for(const t of TRUCKS)for(let k=0;k<4;k++)add({kind:'queue',id:t.id+'-q'+k,truck:t.id,order:k,x:t.x+(k%2?.25:-.25),z:t.hatch.z-1.0-k*.95,face:{x:t.x,z:t.z},dwell:k===0?[12,22]:[60,90],weight:2.2}); // bara första lediga platsen i varje kö kan väljas; den främsta beställer, de andra flyttar fram
  // ståborden: två platser per bord
  for(const b of TABLES)for(const [dx,dz] of [[-.75,0],[.75,.1]])add({kind:'table',x:b.x+dx,z:b.z+dz,face:{x:b.x,z:b.z},dwell:[18,40],weight:.8});
  // scenens publik: ett rutnät som tittar mot scenen (österut)
  for(let x=STAGE.audience.minx+1;x<=STAGE.audience.maxx-1;x+=2.3)for(let z=STAGE.audience.minz+1.5;z<=STAGE.audience.maxz-1.5;z+=2.2)
    add({kind:'stage',x:+(x+((Math.round(z*7))%3)*.3).toFixed(2),z:+z.toFixed(2),face:{x:STAGE.minx,z:z*.6},dwell:[30,80],weight:.3});
  // eldkorgarna: tre platser runt varje
  for(const f of FIRES)for(let k=0;k<3;k++){const a=k*2.1+f.x*.1;add({kind:'fire',x:+(f.x+Math.cos(a)*1.35).toFixed(2),z:+(f.z+Math.sin(a)*1.35).toFixed(2),face:{x:f.x,z:f.z},dwell:[16,36],weight:.45});}
  // granen: runt foten, tittar upp
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2+.3;add({kind:'tree',x:+(TREE.x+Math.cos(a)*6.2).toFixed(2),z:+(TREE.z+Math.sin(a)*6.2).toFixed(2),face:{x:TREE.x,z:TREE.z},dwell:[8,16],weight:.5});}
  // julgransförsäljningen: mellan raderna
  for(const [x,z] of [[-58.5,-5.4],[-54.5,-5.4],[-60.6,1],[-56.4,4.2],[-62.6,-2.2],[-53.5,1]])add({kind:'lot',x,z,face:{x:x-1.5,z:z+1},dwell:[10,22],weight:.8,inLot:true}); // i gångarna mellan raderna
  // insamlingsbåset: tittar in genom glaset; bössan framför
  for(const dx of [-2.4,-.8,.8,2.4])add({kind:'booth',x:BOOTH.x+dx,z:BOOTH.box.z+1.6,face:{x:BOOTH.x,z:BOOTH.z},dwell:[10,20],weight:.6});
  // tomtens stuga: kö med önskelistor
  for(let k=0;k<3;k++)add({kind:'cottage',x:COTTAGE.bench.x+1.8+k*.9,z:COTTAGE.bench.z-1.2-k*.3,face:{x:COTTAGE.bench.x,z:COTTAGE.bench.z},dwell:[8,16],weight:.5});
  return spots;
}
// Där besökarna kommer in och går ut (gatorna som leder till torget).
export const EXITS=Object.freeze([{x:-64,z:39},{x:76,z:-32},{x:76,z:4},{x:76,z:32},{x:64,z:-48},{x:-64,z:-47},{x:4,z:39.5},{x:-2,z:-48}].map(p=>Object.freeze(p)));
// Säljare och andra som står still hela tiden: {style (kind), x, z, y, face}.
export function buildStaff(){
  const out=[];
  for(const s of LANE)out.push({kind:'seller',x:s.seller.x,z:s.seller.z,y:0,face:{x:s.x,z:s.z+s.facing.z*5}});
  for(const t of TRUCKS)out.push({kind:'seller',x:t.x-.4,z:t.z-1.0,y:.62,face:{x:t.x,z:t.z-6}}); // i luckans nisch (disken döljer benen)
  out.push({kind:'seller',x:LOT.hut.x+2.6,z:LOT.hut.z+1.8,y:0,face:{x:LOT.maxx,z:0}});      // i julgransförsäljningen
  out.push({kind:'seller',x:LOT.funnel.x-1.1,z:LOT.funnel.z-.4,y:0,face:{x:LOT.funnel.x,z:LOT.funnel.z}}); // vid nätmaskinen
  out.push({kind:'tomte',x:COTTAGE.bench.x-.5,z:COTTAGE.bench.z+.2,y:0,face:{x:COTTAGE.bench.x,z:COTTAGE.bench.z-6},wave:true});
  out.push({kind:'tomtemor',x:COTTAGE.bench.x+.6,z:COTTAGE.bench.z+.25,y:0,face:{x:COTTAGE.bench.x,z:COTTAGE.bench.z-6},wave:true});
  for(const dx of [-1.6,1.6])out.push({kind:dx<0?'singer':'adult',x:BOOTH.x+dx,z:BOOTH.z,y:0,face:{x:BOOTH.x,z:BOOTH.z+6},booth:true}); // programledarna i glasburen
  return out;
}

const pick=(rand,a)=>a[Math.floor(rand()*a.length)%a.length];
// Sidoförskjutning per person: varje mellanpunkt flyttas vinkelrätt mot vägens riktning där (fast i förväg, så att man aldrig jagar ett mål som flyttar sig).
export function offsetPath(pts,lateral){
  if(!lateral||pts.length<3)return pts.map(p=>({x:p.x,z:p.z}));
  return pts.map((p,i)=>{
    if(i===0||i===pts.length-1)return {x:p.x,z:p.z};
    const a=pts[i-1],b=pts[i+1],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||1;
    return {x:p.x-dz/d*lateral,z:p.z+dx/d*lateral};
  });
}
const span=(rand,[a,b])=>a+rand()*(b-a);
export function mulberry(seed){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// Folkmassan. styles = {walk:[stilindex för vanliga besökare], kid:[…], slow:[…], tree:stil, staff:(kind)=>stil}
export class Crowd{
  constructor({rand=mulberry(7),graph=buildWalkGraph(),spots=buildSpots(),exits=EXITS,styles,count=CROWD.visitors}={}){
    this.rand=rand;this.g=graph;this.spots=spots;this.exits=exits;this.styles=styles;this.count=count;this.t=0;this.agents=[];this.nextCarrier=span(rand,CROWD.carrierEvery);
    this.exitNodes=exits.map(e=>nearestNode(graph,e));
    this.spotNode=new Map(spots.map(s=>[s.id,s.inLot?nearestNode(graph,{x:LOT.maxx+2.5,z:(LOT.gate.minz+LOT.gate.maxz)/2}):nearestNode(graph,s,{reachFrom:s})||nearestNode(graph,s)]));
    this.taken=new Map();
    this.staff=buildStaff().map((s,i)=>({id:'staff-'+i,...s,style:styles.staff(s.kind),frame:0,y:s.y||0,static:true,phase:rand()*10}));
    for(let i=0;i<count;i++)this.agents.push(this.spawn(true));
  }
  setCount(n){this.count=Math.max(0,Math.floor(n));while(this.agents.filter(a=>!a.carrier).length>this.count){const i=this.agents.findIndex(a=>!a.carrier);const a=this.agents.splice(i,1)[0];this.take(a,null);}}
  freeSpots(kind=null){return this.spots.filter(s=>!this.taken.has(s.id)&&(!kind||s.kind===kind));}
  // Nästa plats: köer fylls bakifrån (bara sista lediga platsen i kön kan väljas), övriga efter vikt.
  chooseSpot(a){
    const free=this.spots.filter(s=>{
      if(this.taken.has(s.id))return false;
      if(s.kind==='queue'){const q=this.spots.filter(o=>o.truck===s.truck).sort((p,q)=>p.order-q.order);const firstFree=q.find(o=>!this.taken.has(o.id));return firstFree&&firstFree.id===s.id;}
      if(a.kid&&(s.kind==='table'||s.kind==='queue'))return false;
      return s.weight>0||s.kind==='queue';
    });
    if(!free.length)return null;
    // närmare platser väljs oftare (en marknad där man går från stånd till stånd, inte tvärs över torget varje gång)
    let total=0;const w=free.map(s=>{const d=Math.hypot(s.x-a.x,s.z-a.z);const v=(s.weight||1)*(a.last===s.kind?.3:1)/(1+(d/22)**2);total+=v;return v;});
    let r=this.rand()*total;for(let i=0;i<free.length;i++){r-=w[i];if(r<=0)return free[i];}
    return free[free.length-1];
  }
  spawn(initial=false){
    const r=this.rand,kind=r()<.16?'kid':r()<.12?'slow':'walk',style=pick(r,this.styles[kind]||this.styles.walk);
    const a={id:'v'+Math.floor(r()*1e9),style,kid:kind==='kid',speed:span(r,kind==='kid'?CROWD.kidSpeed:kind==='slow'?CROWD.slowSpeed:CROWD.speed),
      lateral:(r()*2-1)*CROWD.lateral,visits:Math.round(span(r,CROWD.visits)),x:0,z:0,path:null,pi:0,state:'go',wait:0,spot:null,face:{x:0,z:-1},frame:0,stepT:r(),dodge:{x:0,z:0},last:''};
    if(initial){
      const s=this.chooseSpot(a);
      if(s){this.take(a,s);a.x=s.x;a.z=s.z;a.state='dwell';a.wait=span(r,s.dwell)*r();a.face=s.face;return a;}
    }
    const e=pick(r,this.exitNodes);a.x=e.x;a.z=e.z;this.goNext(a);return a;
  }
  take(a,s){if(a.spot)this.taken.delete(a.spot.id);a.spot=s;if(s)this.taken.set(s.id,a.id);}
  route(a,to,final){
    // inne i julgransförsäljningen: ut genom öppningen först (staketet går inte att gå igenom)
    const gz=(LOT.gate.minz+LOT.gate.maxz)/2,inLot=a.x>LOT.minx&&a.x<LOT.maxx&&a.z>LOT.minz&&a.z<LOT.maxz;
    const start=inLot?{x:LOT.maxx+2.2,z:gz}:a;
    const from=nearestNode(this.g,start,{reachFrom:start})||nearestNode(this.g,start);
    const p=from&&to?pathBetween(this.g,from,to):null;
    a.path=[...(inLot?[{x:LOT.maxx-3.2,z:a.z},{x:LOT.maxx-1.5,z:gz},{x:LOT.maxx+2.2,z:gz}]:[]),...offsetPath(p?p.map(n=>({x:n.x,z:n.z})):[],a.lateral)];if(final)a.path.push(final);a.pi=0;a.state='go'; // i julgransförsäljningen: längs gången, sedan ut
  }
  goNext(a){
    if(a.visits<=0){this.take(a,null);const e=pick(this.rand,this.exitNodes);a.leaving=true;this.route(a,e,null);return;}
    const s=this.chooseSpot(a);
    if(!s){a.visits=0;return this.goNext(a);}
    this.take(a,s);a.visits--;
    const via=s.inLot?[{x:LOT.maxx+2.2,z:(LOT.gate.minz+LOT.gate.maxz)/2},{x:LOT.maxx-1.5,z:(LOT.gate.minz+LOT.gate.maxz)/2},{x:LOT.maxx-3.2,z:s.z}]:[]; // in genom öppningen och längs gången
    this.route(a,this.spotNode.get(s.id),null);
    a.path.push(...via,{x:s.x,z:s.z});
  }
  // En bärare: kommer ut genom öppningen med en gran och går mot en gata.
  spawnCarrier(){
    const r=this.rand,a={id:'c'+Math.floor(r()*1e9),style:this.styles.tree,kid:false,speed:span(r,[.95,1.2]),lateral:(r()*2-1)*.3,visits:0,x:LOT.maxx-2,z:(LOT.gate.minz+LOT.gate.maxz)/2,
      path:null,pi:0,state:'go',wait:0,spot:null,face:{x:1,z:0},frame:0,stepT:0,dodge:{x:0,z:0},leaving:true,carrier:true};
    const e=pick(r,this.exitNodes);this.route(a,e,null);a.path.unshift({x:LOT.maxx+2.4,z:a.z});
    this.agents.push(a);
  }
  // Ett steg i simuleringen. player = {x,z} eller null.
  step(dt,player=null){
    this.t+=dt;const r=this.rand;
    this.nextCarrier-=dt;if(this.nextCarrier<=0){this.nextCarrier=span(r,CROWD.carrierEvery);if(this.agents.filter(a=>a.carrier).length<2)this.spawnCarrier();}
    for(let i=this.agents.length-1;i>=0;i--){
      const a=this.agents[i];
      // spelaren: kliv åt sidan (mjukt), och glid tillbaka när spelaren gått
      if(player){const dx=a.x+a.dodge.x-player.x,dz=a.z+a.dodge.z-player.z,d=Math.hypot(dx,dz);
        if(d<CROWD.sidestep&&d>1e-3){const k=(CROWD.sidestep-d)*Math.min(1,dt*6);a.dodge.x+=dx/d*k;a.dodge.z+=dz/d*k;}}
      a.dodge.x*=Math.max(0,1-dt*.8);a.dodge.z*=Math.max(0,1-dt*.8);
      if(a.state==='dwell'){
        a.wait-=dt;a.frame=0;
        // kön går framåt: står man i kö och platsen framför är ledig, flytta fram
        const s=a.spot;
        if(s&&s.kind==='queue'&&s.order>0){const ahead=this.spots.find(o=>o.truck===s.truck&&o.order===s.order-1);if(ahead&&!this.taken.has(ahead.id)){this.take(a,ahead);a.path=[{x:ahead.x,z:ahead.z}];a.pi=0;a.state='go';continue;}}
        if(a.wait<=0){
          if(s&&s.kind==='queue'&&s.order===0){ // fick sin mat: till ett ståbord eller vidare
            a.last='queue';const table=this.freeSpots('table')[0];if(table&&r()<.6){this.take(a,table);this.route(a,this.spotNode.get(table.id),null);a.path.push({x:table.x,z:table.z});continue;}
          }
          a.last=s?s.kind:'';this.goNext(a);
        }
        continue;
      }
      // gå längs vägen
      const target=a.path&&a.path[a.pi];
      if(!target){if(a.leaving){this.take(a,null);this.agents.splice(i,1);continue;}a.state='dwell';a.wait=a.spot?span(r,a.spot.dwell):1;a.face=a.spot?a.spot.face:a.face;continue;}
      // sidoförskjutningen är redan inlagd i vägens punkter (offsetPath), så målet står still
      const tx=target.x,tz=target.z,dx=tx-a.x,dz=tz-a.z,dd=Math.hypot(dx,dz);
      const stepLen=a.speed*dt;
      if(dd<=Math.max(stepLen,.12)){a.x=tx;a.z=tz;a.pi++;}
      else{a.x+=dx/dd*stepLen;a.z+=dz/dd*stepLen;a.face={x:dx/dd,z:dz/dd};}
      a.stepT+=dt*a.speed*1.6;a.frame=Math.floor(a.stepT)%2;
    }
    // nya besökare från gatorna
    while(this.agents.filter(a=>!a.carrier).length<this.count){
      if(!this.spawnWait)this.spawnWait=span(r,CROWD.respawn);
      this.spawnWait-=dt;if(this.spawnWait>0)break;this.spawnWait=0;this.agents.push(this.spawn(false));
    }
    for(const s of this.staff){s.frame=s.wave?(Math.floor((this.t+s.phase)/1.4)%2):((this.t+s.phase)%7<.5?1:0);}
  }
  // Alla som syns: besökare och personal. {x, z, y, style, frame, face}
  people(){
    const out=[];
    for(const a of this.agents)out.push({x:a.x+a.dodge.x,z:a.z+a.dodge.z,y:0,style:a.style,frame:a.frame,face:a.face,moving:a.state==='go'});
    for(const s of this.staff)out.push({x:s.x,z:s.z,y:s.y,style:s.style,frame:s.frame,face:s.face,moving:false});
    return out;
  }
  snapshot(){
    const by={};for(const a of this.agents){const k=a.state==='dwell'&&a.spot?a.spot.kind:a.leaving?'leaving':'walking';by[k]=(by[k]||0)+1;}
    return {visitors:this.agents.filter(a=>!a.carrier).length,carriers:this.agents.filter(a=>a.carrier).length,staff:this.staff.length,nodes:this.g.nodes.length,spots:this.spots.length,by};
  }
}
