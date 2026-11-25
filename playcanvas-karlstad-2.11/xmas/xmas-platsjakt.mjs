// Platsjakten (2.21.1-xmas.14): en tävling på tid. Man får en bild av en riktig plats i Karlstad (tagen i spelet, framför husets fasad) och ska hitta dit
// innan klockan går ut. Där ligger ett gömt paket: en överraskning, XP och en prydnad, och under en kampanj ett erbjudande (kupong) eller en ledtråd till en verklig QR-affisch.
// En ny plats för varje jakt (aldrig någon av de senaste: RECENT_KEEP); misslyckas man kan man försöka igen på samma plats. Belöningen ges en gång per plats och dag,
// högst rewardsPerDay platser om dagen; snabbaste tiden sparas per plats. Under en kampanj (CONTESTS) gäller kampanjens plats för alla, så att tiderna går att jämföra.
// Ren modul: ingen DOM, ingen spelmotor. Platserna är grundspelets egna landmärken (city-geography.mjs: LANDMARKS) med fasaden mot gatan, uträknad ur OSM-utdraget.
//
// Kampanjer (CONTESTS): under en period kan en bestämd plats och ett erbjudande gälla, till exempel en vecka då en butik står bakom en rabatt. Fält:
//   id, from, to ('YYYY-MM-DD', båda dagarna ingår), place (id ur PLATSER), title, coupon (id ur COUPONS), qr (en rad om en affisch), xp, orn, seconds (tidsgräns)
// Spelet påstår inga samarbeten: en kampanj med ett erbjudande läggs in först när någon står bakom det. Inga kampanjer finns nu.
export const PLATSJAKT=Object.freeze({radius:7,baseSeconds:70,perMeter:.28,maxSeconds:240,xp:70,orn:'rare',hintAt:.5,rewardsPerDay:3,start:Object.freeze({x:-2,z:31,yaw:-4})});
export const RECENT_KEEP=4; // så många av de senaste platserna som inte kommer tillbaka direkt
export const CONTESTS=Object.freeze([]);
// [id, namn, mål (x, z: 3 m framför fasaden), kamera (x, z: 24 m ut), fasadens mitt (för kameran att titta på), kort ledtråd, kamerans lutning uppåt i grader (valfri, 9)]
export const PLATSER=Object.freeze([
  ['radhuset','Rådhuset',[-69.7,-15.5],[-48.8,-14.8],[-72.7,-15.6],'Vid Stora Torget.'],
  ['stadshotellet','Elite Stadshotellet',[-122.8,-56.8],[-123.4,-35.8],[-122.7,-59.8],'Vid Kungsgatan, mot älven.'],
  ['residenset','Residenset',[-160.1,8.6],[-139.1,9.1],[-163.1,8.5],'Väster om torget.'],
  ['domkyrkan','Domkyrkan',[165.5,-83.9],[150,-31],[169.3,-83.9],'Öster om torget.',24], // vid västportalen under tornet; bilden från Kungsgatan visar tornet och spiran (xmas.15)
  ['biskopsgarden','Biskopsgården',[-73.4,-223.5],[-52.4,-222.9],[-76.4,-223.6],'Norr om torget, längs Västra Torggatan.'],
  ['biblioteket','Stadsbiblioteket',[-38.6,-335.1],[-59.6,-335.8],[-35.6,-335],'Långt norrut, längs Västra Torggatan.'],
  ['sandgrund','Sandgrund',[-14.8,-399.8],[-16,-378.8],[-14.7,-402.8],'Längst norrut, där konsten bor.'],
  ['duvan','Galleria Duvan',[-202.4,227.7],[-223.4,227.2],[-199.4,227.8],'Söder om torget, nära stationen.'],
  ['ahlens','Åhléns',[-217.2,203.1],[-196.2,203.8],[-220.2,203],'Söder om torget, nära stationen.']
].map(([id,name,t,v,f,hint,pitch=9])=>Object.freeze({id,name,x:t[0],z:t[1],view:Object.freeze({x:v[0],z:v[1]}),look:Object.freeze({x:f[0],z:f[1]}),hint,pitch})));
export const placeById=id=>PLATSER.find(p=>p.id===id)||null;
const DAY=/^20\d{2}-\d{2}-\d{2}$/;
const dayNum=day=>Math.round(Date.parse(day+'T12:00:00Z')/864e5);
// Dagens kampanj (om någon gäller).
export function contestFor(day,contests=CONTESTS){return DAY.test(day||'')?contests.find(c=>c.from<=day&&day<=c.to)||null:null;}
// Nästa plats: slumpas bland platserna som inte är bland de senaste (recent: ID:n, senaste sist).
export function nextPlace(recent=[],rand=Math.random){
  const skip=new Set((Array.isArray(recent)?recent:[]).slice(-RECENT_KEEP));
  const pool=PLATSER.filter(p=>!skip.has(p.id)),list=pool.length?pool:PLATSER;
  return list[Math.min(list.length-1,Math.floor(Math.max(0,rand())*list.length))];
}
// En jakt: placeId = samma plats igen (FÖRSÖK IGEN), annars nästa plats efter recent. Kampanjens plats går före.
export function platsjaktFor(day,{recent=[],rand=Math.random,placeId=null,contests=CONTESTS}={}){
  if(!DAY.test(day||''))return null;
  const c=contestFor(day,contests);
  const place=(c&&placeById(c.place))||(placeId&&placeById(placeId))||nextPlace(recent,rand);
  const dist=Math.hypot(place.x-PLATSJAKT.start.x,place.z-PLATSJAKT.start.z);
  const seconds=Math.round(Math.min(PLATSJAKT.maxSeconds,c?.seconds||PLATSJAKT.baseSeconds+dist*PLATSJAKT.perMeter));
  return Object.freeze({day,place,seconds,contest:c,reward:Object.freeze({xp:c?.xp??PLATSJAKT.xp,orn:c?.orn||PLATSJAKT.orn,coupon:c?.coupon||'',tickets:0}),qr:c?.qr||'',title:c?.title||'PLATSJAKTEN'});
}
// Väderstreck (åtta) från p mot platsen, för ledtråden halvvägs. z växer söderut i spelet.
export function compass(p,q){
  const a=(Math.atan2(q.x-p.x,-(q.z-p.z))*180/Math.PI+360)%360;
  return ['norrut','nordost','österut','sydost','söderut','sydväst','västerut','nordväst'][Math.round(a/45)%8];
}
export const found=(p,place,r=PLATSJAKT.radius)=>Math.hypot(p.x-place.x,p.z-place.z)<=r;
// Sparningen (en del av framstegen, karlstad-xmas:meta:1 via xmas-meta.mjs): bästa tid per plats, vilka platser som gett belöning vilken dag, och de senaste platserna.
// Äldre sparningar (xmas.14 före ändringen) har en sträng per dag i won; den blir en lista med en plats.
export function sanitizePlatsjakt(raw){
  const out={best:{},won:{},recent:[]};if(!raw||typeof raw!=='object')return out;
  const ids=new Set(PLATSER.map(p=>p.id));
  for(const p of PLATSER){const v=Number(raw.best?.[p.id]);if(Number.isFinite(v)&&v>0&&v<10000)out.best[p.id]=Math.round(v*10)/10;}
  if(raw.won&&typeof raw.won==='object')for(const d of Object.keys(raw.won).filter(d=>DAY.test(d)).sort().slice(-60)){
    const v=raw.won[d],list=[...new Set((Array.isArray(v)?v:[v]).map(x=>String(x||'')).filter(x=>ids.has(x)))].slice(0,PLATSER.length);
    if(list.length)out.won[d]=list;
  }
  if(Array.isArray(raw.recent))out.recent=raw.recent.map(String).filter(x=>ids.has(x)).slice(-RECENT_KEEP);
  return out;
}
