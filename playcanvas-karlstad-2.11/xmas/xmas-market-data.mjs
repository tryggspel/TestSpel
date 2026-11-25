// Julmarknaden på Stora Torget (2.21.1-xmas.13): foodtrucks, julgransförsäljning, en scen, ett insamlingsbås, en marknadsgata, tomtens stuga, eldkorgar, ståbord,
// lyktstolpar med ljusslingor och snövallar. Ren modul utan DOM och utan PlayCanvas, så att utläggen kan kontrolleras i test.
//
// Förebild: vinterfestivalen på Stora torget inför första advent (julmarknad, foodtrucks, scenprogram och en insamling). Spelet använder inga riktiga namn på
// evenemang, företag, artister eller insamlingar: allt här är påhittat (se XMAS-SPELDESIGN.md). Allt ligger utanför introduktionens spiral (r ≤ 27 m) och
// utanför startvyn (x −14…14, z 24…44), på den stora öppna ytan runt marknadsringen (torget är ungefär x −68…78, z −50…41 i spelets koordinater; granen i origo, norr = −z).
import {INTRO,TREE,TORGET_PROPS} from './xmas-layout.mjs?v=2.21.1-xmas.16';

export const OPEN=Object.freeze({minx:-68,maxx:78,minz:-50,maxz:41}); // den öppna ytan enligt spelets kollisionskarta (byggnaderna börjar strax utanför)
export const START_VIEW=Object.freeze({minx:-14,maxx:14,minz:24,maxz:44}); // det spelaren ser vid start (söder om granen, vänd mot den): ingenting högt här

// ── Foodtrucks längs södra kanten, med luckan mot torget (norrut) ──────────────────────────────────────────────────────────
export const TRUCK=Object.freeze({len:6.4,wid:2.5,h:3.1});
export const TRUCK_KINDS=Object.freeze([
  {name:'RENSKAV',sub:'WRAP · TUNNBRÖD',body:'#c8352f',trim:'#f4e6c8',menu:['RENSKAVSWRAP','LINGON & SKY']},
  {name:'VÄRMLANDSKORV',sub:'MED ROTMOS',body:'#2f7a52',trim:'#f2d36b',menu:['VÄRMLANDSKORV','BRÖD & SENAP']},
  {name:'LÅNGOS',sub:'GRÄDDFIL · LÖJROM',body:'#3c64a8',trim:'#ffe9b8',menu:['LÅNGOS','OST & SKINKA']},
  {name:'GLÖGG & LUSSE',sub:'VARMT · SÖTT',body:'#8f2d56',trim:'#ffd56b',menu:['GLÖGG','LUSSEKATTER']}
]);
// xmas.14: tre truckar väster om O'Learys entré och en öster om den, så att dörren (Tingvallagatan 9, x ≈ 48,5) syns och går att nå från torget.
export const TRUCKS=Object.freeze([18,27,36,60].map((x,i)=>Object.freeze({id:'truck-'+i,x,z:37.6,facing:Object.freeze({x:0,z:-1}),kind:TRUCK_KINDS[i],
  hatch:Object.freeze({x,z:37.6-TRUCK.wid/2-.1}),queue:Object.freeze({x,z:33.4})})));
export const TABLES=Object.freeze([[22.5,31.2],[31.5,31.6],[40.5,31.4],[57,32.4],[19.4,33.6]].map(([x,z],i)=>Object.freeze({id:'table-'+i,x,z})));

// ── Marknadsgatan: en gränd i nordost med stånd på båda sidor (norra raden vänd mot söder, södra raden vänd mot norr) ─────────────────────
// Grundspelets uteserveringar på Kungsgatan (kungsgatan-reference.mjs, vid x −24 och 18, z −40) och marknadsborden (city-south.js, x 28 och 40, z −20) står kvar orörda.
export const LANE_STALL=Object.freeze({w:3.4,d:2.0,h:2.7});
export const ALLEY=Object.freeze({minx:32.6,maxx:51.2,north:-44.6,south:-34.4});
export const LANE_KINDS=Object.freeze([
  {sign:'POLKAGRISAR',awning:'#d83a3a',goods:'#f4f0e6'},{sign:'LUSSEKATTER',awning:'#e0a12c',goods:'#f2c14e'},
  {sign:'JULOST',awning:'#3f8f5f',goods:'#f1d27a'},{sign:'LJUS & LYKTOR',awning:'#7b4aa6',goods:'#ffe9a8'},
  {sign:'KERAMIK',awning:'#3c6fb2',goods:'#c98a5d'},{sign:'HONUNG',awning:'#d88a2c',goods:'#f0b23a'},
  {sign:'TRÄSLÖJD',awning:'#c93a3a',goods:'#b07a45'},{sign:'JULKORT',awning:'#2f7a6f',goods:'#f7f2e4'}
]);
export const LANE=Object.freeze([35,39.6,44.2,48.8].flatMap((x,k)=>[[x,ALLEY.north,1,k*2],[x,ALLEY.south,-1,k*2+1]]).map(([x,z,fz,i])=>{
  const hw=LANE_STALL.w/2,hd=LANE_STALL.d/2;
  return Object.freeze({id:'lane-'+i,x,z,facing:Object.freeze({x:0,z:fz}),kind:LANE_KINDS[i],rect:Object.freeze({minx:x-hw,maxx:x+hw,minz:z-hd,maxz:z+hd}),
    seller:Object.freeze({x,z:+(z-fz*.15).toFixed(2)})}); // säljaren står bakom disken
}));

// ── Julgransförsäljningen mot väster: en inhägnad med granar i rader, en röd bod och en nätmaskin. Öppningen vetter mot torget (öster). ────────────
export const LOT=Object.freeze({minx:-66,maxx:-50,minz:-16,maxz:10,gate:Object.freeze({minz:-4.5,maxz:2.5}),fenceH:1.15,
  hut:Object.freeze({x:-62.6,z:-11.8,w:4.2,d:3.2,h:2.6}),funnel:Object.freeze({x:-55.2,z:6.6}),sign:Object.freeze({x:-49.4,z:-1,lines:Object.freeze(['JULGRANAR','KUNGSGRAN · NORDMANN'])})});
// Granarna i inhägnaden: rader i öst-västlig riktning, varannan med nät (buntade, liggande eller lutade), höjd 1,6–2,6 m. Deterministiskt.
export function buildLotTrees(){
  const out=[];let k=0;
  for(let z=LOT.minz+2.6;z<=LOT.maxz-2.4;z+=3.2){
    for(let x=LOT.minx+2.2;x<=LOT.maxx-3.6;x+=2.1){
      if(Math.abs(x-LOT.hut.x)<LOT.hut.w/2+1.4&&Math.abs(z-LOT.hut.z)<LOT.hut.d/2+1.4)continue;
      if(Math.hypot(x-LOT.funnel.x,z-LOT.funnel.z)<2.4)continue;
      if(z>LOT.gate.minz-1.2&&z<LOT.gate.maxz+1.2&&x>LOT.maxx-7)continue;  // gången in från öppningen
      const h=1.6+((k*7)%6)*.2,net=k%3===1,lean=k%5===3;
      out.push({id:'lot-tree-'+k,x:+x.toFixed(2),z:+z.toFixed(2),h:+h.toFixed(2),net,lean});k++;
    }
  }
  return out;
}
export const LOT_TREES=Object.freeze(buildLotTrees().map(t=>Object.freeze(t)));

// ── Scenen mot öster, vänd mot granen (västerut) ─────────────────────────────────────────────────────────────────────
export const STAGE=Object.freeze({minx:57,maxx:66,minz:-10,maxz:10,deck:1.15,truss:6.4,screen:Object.freeze({w:8.4,h:3.6,y:3.4}),
  audience:Object.freeze({minx:43,maxx:54,minz:-11,maxz:11})});
// Scenprogrammet (påhittat): vad som står på scenen vid en viss tid på dagen (Europe/Stockholm). start/end i timmar. Ritas som skylt och styr scenens figurer.
export const STAGE_PROGRAM=Object.freeze([
  {start:10,end:12,act:'choir',title:'BARNKÖREN',line:'Luciasånger och julvisor'},
  {start:12,end:14,act:'tomte',title:'TOMTEN BERÄTTAR',line:'Sagor för de minsta'},
  {start:14,end:16,act:'band',title:'JULJAZZ',line:'Trion från Solstaden'},
  {start:16,end:17.5,act:'choir',title:'KVÄLLSKÖREN',line:'Inför grantändningen'},
  {start:17.5,end:19.5,act:'band',title:'ALLSÅNG',line:'Alla kan vara med'},
  {start:19.5,end:22,act:'band',title:'TRUBADUREN',line:'Lugna låtar vid elden'}
]);
// Det som står på scenen vid timmen h (0–24, decimaler). Utanför programmet: ingen akt (scenen är tom men upplyst).
export function stageActAt(h){
  const x=((Number(h)%24)+24)%24;
  return STAGE_PROGRAM.find(a=>x>=a.start&&x<a.end)||null;
}
export function nextActAfter(h){
  const x=((Number(h)%24)+24)%24;
  return STAGE_PROGRAM.find(a=>a.start>x)||STAGE_PROGRAM[0];
}

// ── Insamlingsbåset (en glasbur med radiostudio) i nordväst, vänt mot torget ─────────────────────────────────────────────
export const BOOTH=Object.freeze({x:-40,z:-30,w:7.4,d:4.6,h:3.3,box:Object.freeze({x:-40,z:-26.6})});

// ── Tomtens stuga i sydväst (tomten och tomtemor tar emot önskelistor) ────────────────────────────────────────────────
export const COTTAGE=Object.freeze({x:-30,z:37.4,w:4.6,d:3.4,h:2.6,bench:Object.freeze({x:-30,z:34.6})});

// ── Eldkorgar (med bänkar och fårskinn), lyktstolpar och ljusslingor ─────────────────────────────────────────────────
export const FIRES=Object.freeze([[30.5,28.2],[43.4,28.4],[46,-14.8],[46,15.2],[-45.6,-9.4],[-45.6,7.8],[-49.6,-25],[-38.4,31.6],[54.4,-39.5]].map(([x,z],i)=>Object.freeze({id:'fire-'+i,x,z})));
// Stolpar för ljusslingor och lyktor (inga kollisioner: smala och höga). Slingorna går i sicksack mellan stolparna i varje grupp.
export const POLES=Object.freeze([
  // längs marknadsgränden (båda sidor), slingor i sicksack tvärs över
  ...[32.7,37.3,41.9,46.5,51.1].map(x=>[x,-42.4]),...[32.7,37.3,41.9,46.5,51.1].map(x=>[x,-36.6]),
  // framför foodtrucksen
  ...[14.8,23.2,31.8,40.4,56.2,64.6].map(x=>[x,34.4]),
  // in mot julgransförsäljningen
  [-47.8,-6],[-47.8,3.8],
  // runt scenens publikyta
  [54.6,-12.4],[54.6,12.4],[42.4,-12.4],[42.4,12.4]
].map(([x,z],i)=>Object.freeze({id:'pole-'+i,x,z,h:4.4})));
const poleIx=(x,z)=>POLES.findIndex(p=>p.x===x&&p.z===z);
// Slingor: par av stolpar (index) och en hängning i meter.
const AX=[32.7,37.3,41.9,46.5,51.1];
export const STRINGS=Object.freeze([
  ...AX.slice(0,-1).map((x,k)=>k%2?[poleIx(x,-36.6),poleIx(AX[k+1],-42.4)]:[poleIx(x,-42.4),poleIx(AX[k+1],-36.6)]),   // sicksack över gränden
  ...AX.slice(0,-1).map((x,k)=>k%2?[poleIx(x,-42.4),poleIx(AX[k+1],-36.6)]:[poleIx(x,-36.6),poleIx(AX[k+1],-42.4)]),
  ...[[14.8,23.2],[23.2,31.8],[31.8,40.4],[56.2,64.6]].map(([a,b])=>[poleIx(a,34.4),poleIx(b,34.4)]),
  [poleIx(-47.8,-6),poleIx(-47.8,3.8)],
  [poleIx(54.6,-12.4),poleIx(42.4,-12.4)],[poleIx(54.6,12.4),poleIx(42.4,12.4)],[poleIx(42.4,-12.4),poleIx(42.4,12.4)]
].map(([a,b])=>Object.freeze({a,b,sag:.6})));
// Snövallar (plogad snö) längs byggnaderna och i hörnen: [x, z, längd, bredd, höjd, vinkel i grader]. Bara utsmyckning.
export const SNOWBANKS=Object.freeze([[-60,-46,14,3,1.1,8],[-20,-48.6,10,2.4,.9,0],[48,-48,16,3,1.2,-4],[66,-30,10,3,1,82],[70,22,12,3.2,1.2,90],[-58,38.6,12,2.6,1,-6],[71.5,39.6,8,2.4,.9,4]]
  .map(([x,z,len,wid,h,yaw],i)=>Object.freeze({id:'bank-'+i,x,z,len,wid,h,yaw})));

// Skyltar (en bildatlas för alla, ritas i en mesh): text, plats, höjd, bredd, vinkel (grader, 0 = vänd mot +z, söderut) och färger.
export const SIGNS=Object.freeze([
  {id:'lane',lines:['MARKNADSGRÄNDEN','HANTVERK · GODIS · JULMAT'],x:ALLEY.minx-1.2,z:(ALLEY.north+ALLEY.south)/2,y:4.6,w:6.2,h:1.5,yaw:-90,bg:'#b52f2f',fg:'#fff4d6'}, // läses västerifrån (från granen)
  {id:'trucks',lines:['FOODTRUCKS','VARMT · GOTT · NÄRA'],x:27,z:39.6,y:4.9,w:6,h:1.4,yaw:180,bg:'#22463e',fg:'#ffe08a'},
  {id:'lot',lines:LOT.sign.lines,x:LOT.maxx+.22,z:(LOT.gate.minz+LOT.gate.maxz)/2,y:3.55,w:5.6,h:1.25,yaw:90,bg:'#2f6b45',fg:'#fff4d6'}, // på portalen, läses österifrån (yaw 90)
  {id:'stage',lines:['VINTERSCENEN','STORA TORGET'],x:STAGE.minx+.2,z:0,y:STAGE.deck+STAGE.truss+.9,w:7.4,h:1.4,yaw:-90,bg:'#151f3d',fg:'#ffd56b'},
  {id:'booth',lines:['INSAMLINGEN','VARJE TERMOS RÄKNAS'],x:BOOTH.x,z:BOOTH.z+BOOTH.d/2+.05,y:BOOTH.h+.75,w:6.4,h:1.25,yaw:0,bg:'#7a1f4f',fg:'#fff1f6'},
  {id:'cottage',lines:['TOMTENS STUGA','ÖNSKELISTOR HÄR'],x:COTTAGE.x,z:COTTAGE.z-COTTAGE.d/2-.5,y:COTTAGE.h+.62,w:3.8,h:.95,yaw:180,bg:'#a62626',fg:'#fff4d6'}
].map(s=>Object.freeze({...s,lines:Object.freeze([...s.lines])})));

// ── Kollisionsrutor (samma form som xmasColliders i xmas-decor-data.mjs) ─────────────────────────────────────────────
const boxCollider=(id,label,r,h)=>{const cx=(r.minx+r.maxx)/2,cz=(r.minz+r.maxz)/2;return {precise:false,osm:'xmas-'+id,name:'',label,tags:{},cx,cz,dist:Math.hypot(cx,cz),area:(r.maxx-r.minx)*(r.maxz-r.minz),sx:r.maxx-r.minx,sz:r.maxz-r.minz,h,height:h,minx:r.minx-.15,maxx:r.maxx+.15,minz:r.minz-.15,maxz:r.maxz+.15};};
const around=(x,z,w,d)=>({minx:x-w/2,maxx:x+w/2,minz:z-d/2,maxz:z+d/2});
// Staketet runt julgransförsäljningen: fyra sidor, den östra med en öppning (två bitar).
export function lotFence(){
  const t=.18,{minx,maxx,minz,maxz,gate}=LOT;
  return [
    {id:'lot-n',r:{minx,maxx,minz:minz-t/2,maxz:minz+t/2}},
    {id:'lot-s',r:{minx,maxx,minz:maxz-t/2,maxz:maxz+t/2}},
    {id:'lot-w',r:{minx:minx-t/2,maxx:minx+t/2,minz,maxz}},
    {id:'lot-e1',r:{minx:maxx-t/2,maxx:maxx+t/2,minz,maxz:gate.minz}},
    {id:'lot-e2',r:{minx:maxx-t/2,maxx:maxx+t/2,minz:gate.maxz,maxz}}
  ];
}
export function marketColliders(){
  const out=[];
  for(const t of TRUCKS)out.push(boxCollider(t.id,'Foodtruck · '+t.kind.name,around(t.x,t.z,TRUCK.len,TRUCK.wid),TRUCK.h));
  for(const s of LANE)out.push(boxCollider(s.id,'Julmarknad · '+s.kind.sign,s.rect,LANE_STALL.h));
  for(const f of lotFence())out.push(boxCollider(f.id,'Julgransförsäljningen',f.r,LOT.fenceH));
  out.push(boxCollider('lot-hut','Julgransförsäljningen',around(LOT.hut.x,LOT.hut.z,LOT.hut.w,LOT.hut.d),LOT.hut.h));
  out.push(boxCollider('stage','Vinterscenen',{minx:STAGE.minx,maxx:STAGE.maxx,minz:STAGE.minz,maxz:STAGE.maxz},STAGE.deck+STAGE.truss));
  out.push(boxCollider('booth','Insamlingen',around(BOOTH.x,BOOTH.z,BOOTH.w,BOOTH.d),BOOTH.h));
  out.push(boxCollider('cottage','Tomtens stuga',around(COTTAGE.x,COTTAGE.z,COTTAGE.w,COTTAGE.d),COTTAGE.h));
  for(const f of FIRES)out.push(boxCollider(f.id,'Eldkorg',around(f.x,f.z,.9,.9),1));
  for(const t of TABLES)out.push(boxCollider(t.id,'Ståbord',around(t.x,t.z,.8,.8),1.1));
  return out;
}

// Allt som står på marken (för utläggskontroller och för att folkmassan inte ska gå igenom det): {id, x, z, r} med en ungefärlig radie.
export function marketFootprints(){
  const rectR=r=>({x:(r.minx+r.maxx)/2,z:(r.minz+r.maxz)/2,r:Math.hypot(r.maxx-r.minx,r.maxz-r.minz)/2});
  return [
    ...TRUCKS.map(t=>({id:t.id,...rectR(around(t.x,t.z,TRUCK.len,TRUCK.wid))})),
    ...LANE.map(s=>({id:s.id,...rectR(s.rect)})),
    {id:'lot',...rectR({minx:LOT.minx,maxx:LOT.maxx,minz:LOT.minz,maxz:LOT.maxz})},
    {id:'stage',...rectR({minx:STAGE.minx,maxx:STAGE.maxx,minz:STAGE.minz,maxz:STAGE.maxz})},
    {id:'booth',...rectR(around(BOOTH.x,BOOTH.z,BOOTH.w,BOOTH.d))},
    {id:'cottage',...rectR(around(COTTAGE.x,COTTAGE.z,COTTAGE.w,COTTAGE.d))},
    ...FIRES.map(f=>({id:f.id,x:f.x,z:f.z,r:.6})),...TABLES.map(t=>({id:t.id,x:t.x,z:t.z,r:.5})),...POLES.map(p=>({id:p.id,x:p.x,z:p.z,r:.2}))
  ];
}
// Gemensam hjälp för test och folkmassan: ligger punkten i någon rektangel (med marginal)?
export const inRect=(r,p,m=0)=>p.x>=r.minx-m&&p.x<=r.maxx+m&&p.z>=r.minz-m&&p.z<=r.maxz+m;
export {INTRO,TREE,TORGET_PROPS};
