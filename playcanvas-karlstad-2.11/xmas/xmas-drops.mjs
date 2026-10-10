// Julklappsjakten: var de tappade paketen läggs. Ren modul (ingen DOM, ingen PlayCanvas): motorn (xmas-hunt.mjs) frågar den efter en mittpunkt för nästa hög, och den ser till att högarna
// hamnar långt från varandra och i olika riktningar, så att inte flera spår och många paket ligger tätt inpå varandra.
//
// Tre sorters områden (area) styr var en hög kan hamna:
//  - null: hela staden. En ring 55–120 m runt spelaren (den första högen läggs framför spelaren).
//  - {kind:'rect', minx,maxx,minz,maxz, keepOut:[{x,z,r}]}: en yta (Stora Torget), med platser som ska vara fria (granen, stånden, bänkar). Samma ring, men bara inom ytan.
//  - {kind:'route', pts, ahead:[a,b], spacing, lateral}: en gata (Kungsgatan, Drottninggatan) som en lista punkter med båglängd s. Högarna läggs allt längre fram längs gatan: a–b meter före
//    spelarens plats på rutten, minst spacing meter efter förra högen, högst lateral meter vid sidan av gatan. Man går alltså gatan fram, men ingen pil visar vägen: spåren gör det.
export const bearingDeg=(from,to)=>Math.atan2(to.x-from.x,to.z-from.z)*180/Math.PI;
export const angleGap=(a,b)=>{let d=Math.abs(a-b)%360;if(d>180)d=360-d;return d;};
export const between=(range,rand)=>range[0]+rand()*(range[1]-range[0]);

// Spelarens plats på rutten som båglängd s (närmaste punkt). pts är en tät punktlista (1 m) med s. En rutt som går tillbaka dit den började (en runda genom staden) har samma plats i början och slutet:
// därför söks närmaste punkt först i ett fönster kring den senast kända platsen på rutten (hint.at: −40 till +220 m), så att man inte räknas som färdig i samma ögonblick som man börjar.
// Är man mer än 60 m från rutten i fönstret söks den närmaste punkten på resten av rutten (aldrig mer än 40 m bakåt).
export function routeProgress(pts,p,hint=null){
  const n=pts.length;
  const scan=(i0,i1)=>{let best=-1,bd=Infinity;for(let i=Math.max(0,i0);i<=Math.min(n-1,i1);i++){const dx=pts[i].x-p.x,dz=pts[i].z-p.z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=i;}}return {i:best,d:Math.sqrt(bd)};};
  if(hint&&Number.isFinite(hint.at)){
    const at=Math.round(hint.at),w=scan(at-40,at+220);
    if(w.i>=0&&w.d<=60)return pts[w.i].s;
    const g=scan(Math.max(0,at-40),n-1);if(g.i>=0)return pts[g.i].s;
  }
  const g=scan(0,n-1);return pts[g.i].s;
}
export function routePoint(pts,s){
  const i=Math.max(0,Math.min(pts.length-1,Math.round(s)));
  return pts[i];
}
export function inArea(area,c){
  if(!area)return true;
  if(area.kind==='rect'){
    if(c.x<area.minx||c.x>area.maxx||c.z<area.minz||c.z>area.maxz)return false;
    for(const o of area.keepOut||[])if(Math.hypot(o.x-c.x,o.z-c.z)<o.r)return false;
  }
  return true;
}

// En kandidat för nästa hög. ctx: {p (spelaren), F (inställningarna), rand, facing ({x,z} eller null), first (första högen), state (områdets minne)}.
// Returnerar {x,z,s?}. Kandidaten kontrolleras sedan av motorn (fri mark, avstånd till andra högar, riktning).
export function sampleCentre(area,{p,F,rand,facing=null,first=false,state={}}){
  if(area&&area.kind==='route'){
    const prog=routeProgress(area.pts,p,{at:state.prog??0}),L=area.pts[area.pts.length-1].s;state.prog=prog;
    const a0=first?area.ahead[0]*.8:area.ahead[0],lo=Math.max(prog+a0,(state.lastS??-1e9)+area.spacing),hi=Math.max(lo+12,prog+area.ahead[1]);
    let s=lo+rand()*(hi-lo);
    if(s>L-8)s=Math.max(0,L-8-rand()*Math.min(60,L*.3));     // slutet av rutten: de sista högarna ligger nära slutet
    const q=routePoint(area.pts,s),lat=(rand()*2-1)*area.lateral;
    return {x:q.x+q.nx*lat,z:q.z+q.nz*lat,s};
  }
  // Första gången (och bara då) ligger platsen framför spelaren, inom ±60° från blickriktningen, så att spåret syns direkt; därefter åt alla håll (sök och hitta).
  const fwd=first&&facing&&(facing.x||facing.z)?Math.atan2(facing.x,facing.z)+(rand()-.5)*2.1:null;
  const ang=fwd!==null?fwd:rand()*Math.PI*2,dist=between([F.minDistance,F.maxDistance],rand);
  return {x:p.x+Math.sin(ang)*dist,z:p.z+Math.cos(ang)*dist};
}
