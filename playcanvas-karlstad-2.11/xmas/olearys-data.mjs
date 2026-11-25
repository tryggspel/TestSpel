// O'Learys Karlstad i julbygget (2.21.1-xmas.14): ritningen av lokalen, stationerna och FBK-matcherna. Ren data.
// Restaurangen ligger i Bergqvisthuset, Tingvallagatan 9, med entrén mot Stora Torget (OSM-byggnad 100833292). I spelet går man in genom dörren på torget och kommer in i en egen
// inomhusmiljö (en "interiör" långt utanför stadens karta), som man lämnar genom samma dörr. Lokalen är spelets egen tolkning av en sportbar med bowling, shuffleboard,
// biljard och dart, i O'Learys färger. Spelet påstår inget samarbete med O'Learys eller Färjestad BK.
//
// Koordinater i lokalen: x åt höger sett från entrén, z bakåt in i lokalen är negativ (entrén vid z = 0, bortre väggen vid z = −D). Världens läge = VENUE.origin + (x, z).
export const OL_COLORS=Object.freeze({green:'#155939',greenDark:'#0d3a25',greenDeep:'#082717',cream:'#f3ead2',gold:'#d5b56a',goldDark:'#9c7d3c',wood:'#5b3a22',woodLight:'#8a5a34',brick:'#7a3b2e',white:'#fffdf6',red:'#b8322c'});
export const VENUE=Object.freeze({
  origin:Object.freeze({x:2400,z:-2400}),    // långt utanför staden (ingen stad syns och inga av stadens kollisioner finns där)
  w:34,d:48,h:4.4,                            // bredd (x −17…17), djup (z 0…−48), takhöjd
  door:Object.freeze({x:0,z:-.6,yaw:180}),    // där man står när man kommer in (vänd in i lokalen)
  exitRadius:1.4,
  street:Object.freeze({x:48.5,z:46.4,face:Object.freeze({x:0,z:-1})}), // dörren i fasaden mot torget (världskoordinater)
  enterRadius:2.2,                             // så nära dörren man ska stå för att få GÅ IN
  outside:Object.freeze({x:48.5,z:43.2,yaw:0}) // där man står när man går ut (vänd mot torget)
});
export const toWorld=(p)=>({x:VENUE.origin.x+p.x,z:VENUE.origin.z+p.z});
export const toLocal=(p)=>({x:p.x-VENUE.origin.x,z:p.z-VENUE.origin.z});
export function inVenue(p,margin=0){const l=toLocal(p);return l.x>=-VENUE.w/2-margin&&l.x<=VENUE.w/2+margin&&l.z<=0+margin&&l.z>=-VENUE.d-margin;}

// Inredningen (lokala lådor): {id, x, z, w, d, h, solid}. solid = man går inte igenom (kollision).
export const FURNITURE=Object.freeze([
  // baren längs vänster vägg: disk, hylla och barpallar
  {id:'bar',x:-13.4,z:-12,w:1.1,d:16,h:1.12,solid:true},{id:'bar-back',x:-16.5,z:-12,w:1,d:16,h:2.4,solid:true},
  // värdinnebordet vid entrén
  {id:'host',x:3.4,z:-2.6,w:1.2,d:.7,h:1.15,solid:true},
  // restaurangdelen till höger: bord (fyra platser) och båsen längs väggen
  ...[[6,-6],[10,-6],[6,-11],[10,-11],[6,-15.5],[10,-15.5]].map(([x,z],i)=>({id:'table-'+i,x,z,w:1.4,d:1.1,h:.76,solid:true})),
  ...[-6,-11,-15.5].map((z,i)=>({id:'booth-'+i,x:15.6,z,w:1.6,d:3.2,h:1.25,solid:true})),
  // biljard (två bord) mitt i lokalen
  {id:'pool-0',x:-3.2,z:-19,w:1.5,d:2.7,h:.8,solid:true},{id:'pool-1',x:2.8,z:-19,w:1.5,d:2.7,h:.8,solid:true},
  // shuffleboard (två bord längs högra väggen)
  {id:'shuffle-0',x:12.4,z:-24,w:.75,d:6.2,h:.82,solid:true},{id:'shuffle-1',x:14.8,z:-24,w:.75,d:6.2,h:.82,solid:true},
  // dart på högra väggen (tavlorna), och straffmaskinen (hockeyspelet) vid vänstra väggen
  {id:'dart-wall',x:16.6,z:-31,w:.6,d:5,h:2.2,solid:true},
  {id:'straff',x:-15.6,z:-27,w:1.6,d:2.4,h:2.1,solid:true},
  // tipshörnan (skärm på fot) och femkampens podium
  {id:'tips',x:-11.2,z:-21.5,w:1.2,d:.5,h:1.9,solid:true},{id:'penta',x:0,z:-26.6,w:2.4,d:.8,h:1.6,solid:true},
  // bowlinghallen: banorna bakom foul-linjen och kulreturerna
  {id:'lanes',x:-4,z:-41.4,w:11.4,d:12.8,h:.3,solid:true},
  ...[-7.2,-2.2,2.8].map((x,i)=>({id:'ballreturn-'+i,x:x-1.75,z:-33.4,w:.6,d:1.6,h:.85,solid:true})),
  // karaokerummet i hörnet (glasväggar; dörr i framkanten)
  {id:'karaoke-w',x:6.2,z:-40.5,w:.15,d:15,h:3,solid:true},{id:'karaoke-f1',x:9.2,z:-33,w:6,d:.15,h:3,solid:true},{id:'karaoke-f2',x:15.6,z:-33,w:2.8,d:.15,h:3,solid:true}
].map(f=>Object.freeze(f)));
// Bowlingbanorna: sex banor, 1,6 m mellan mitten av två banor. Foul-linjen vid z = −34,8, käglorna vid z = −46.
export const LANES=Object.freeze({count:6,x0:-8,pitch:1.6,foul:-34.8,pins:-46,width:1.05});
// Stationerna: var man står (lokalt) för att få knappen, och vilken aktivitet den startar.
export const STATIONS=Object.freeze([
  {id:'bowling',label:'BOWLING',x:-4.8,z:-33.6,r:2.6},
  {id:'shuffle',label:'SHUFFLEBOARD',x:13.6,z:-19.6,r:2.4},
  {id:'biljard',label:'BILJARD',x:0,z:-19,r:2.4},
  {id:'dart',label:'DART',x:14.6,z:-31,r:2.4},
  {id:'straff',label:'STRAFFAR · HOCKEYSPELET',x:-13.6,z:-27,r:2.4},
  {id:'penta',label:'FEMKAMPEN',x:0,z:-25.2,r:2.4},
  {id:'tips',label:'FBK-TIPSET',x:-11.2,z:-20.2,r:2.2},
  {id:'bar',label:'BAREN',x:-12.2,z:-10,r:2.4},
  {id:'karaoke',label:'KARAOKE',x:11.5,z:-31.8,r:2}
].map(s=>Object.freeze(s)));
// Kollisionslådor i världen (för grundspelets blocked()): väggarna (med dörröppning) och den fasta inredningen.
export function venueColliders(){
  const o=VENUE.origin,W=VENUE.w,D=VENUE.d,out=[];
  const box=(id,x,z,w,d,h)=>out.push({id:'olearys-'+id,name:"O'Learys · "+id,x:o.x+x,z:o.z+z,minx:o.x+x-w/2,maxx:o.x+x+w/2,minz:o.z+z-d/2,maxz:o.z+z+d/2,h,height:h,precise:false,olearys:true});
  const t=.4;
  box('vägg-v',-W/2-t/2,-D/2,t,D+t*2,VENUE.h);box('vägg-h',W/2+t/2,-D/2,t,D+t*2,VENUE.h);box('vägg-bak',0,-D-t/2,W+t*2,t,VENUE.h);
  box('vägg-fram',0,t/2+.4,W+t*2,t,VENUE.h); // entréväggen (man går ut genom dörren med knappen, inte genom väggen)
  for(const f of FURNITURE)if(f.solid)box(f.id,f.x,f.z,f.w,f.d,f.h);
  return out;
}

// ── FBK i december 2026 (SHL) ──────────────────────────────────────────────────────────────────────────────────────────
// Källa: shlhockey.nu och svenskaspel.se (spelschema 2026/27), hämtat 2026-11-25. Tiderna kan ändras: kontrollera innan något skrivs på en affisch.
// result: fylls i efter matchen ({home, away}); då räknas tipsen. Tills dess står matchen som öppen för tips fram till nedsläpp.
export const FBK_MATCHES=Object.freeze([
  {id:'fbk-2026-12-03',start:'2026-12-03T19:00',home:'Linköping HC',away:'Färjestad BK',arena:'Linköping',result:null},
  {id:'fbk-2026-12-05',start:'2026-12-05T18:00',home:'Färjestad BK',away:'HV71',arena:'Löfbergs Arena',result:null,note:'En källa anger 15.15'},
  {id:'fbk-2026-12-17',start:'2026-12-17T19:00',home:'Färjestad BK',away:'Örebro HK',arena:'Löfbergs Arena',result:null},
  {id:'fbk-2026-12-19',start:'2026-12-19T15:15',home:'Brynäs IF',away:'Färjestad BK',arena:'Gävle',result:null},
  {id:'fbk-2026-12-26',start:'2026-12-26T18:00',home:'Färjestad BK',away:'IF Björklöven',arena:'Löfbergs Arena',result:null},
  {id:'fbk-2026-12-28',start:'2026-12-28T19:00',home:'Rögle BK',away:'Färjestad BK',arena:'Ängelholm',result:null},
  {id:'fbk-2026-12-30',start:'2026-12-30T19:00',home:'Färjestad BK',away:'Linköping HC',arena:'Löfbergs Arena',result:null}
].map(m=>Object.freeze(m)));
export const FBK_SOURCE='shlhockey.nu och svenskaspel.se, hämtat 25 november 2026';
