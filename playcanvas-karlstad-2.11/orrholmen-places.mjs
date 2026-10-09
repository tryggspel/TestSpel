// 2.18: geografi och platser för Orrholmen, viken mot Marieberg, Stadsträdgården, Bryggudden och stationen. Ren data utan beroenden
// (förutom vattenraderna), så att spelet, generatorn (tools/orrholmen/build.mjs) och testerna delar samma källa.
// Koordinater: spelets lokala meter, x öster och z söder om Stora Torget. Orrholmens form är handritad efter en Google Maps-bild
// och kalibrerad mot OSM-stigen Orrholmsrundan (se tools/orrholmen/build.mjs); läget stämmer ungefär (±40 m).
import {WATER_ROWS} from './city-south-data.mjs?v=2.21.1-xmas.3';

// ── Vatten ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Orrholmsviken: östra stranden följer OSM-stigen Orrholmsrundan, västra stranden Marieberg. [z,x]
export const SHORE_E=Object.freeze([[681,-342],[740,-334],[800,-326],[860,-319],[920,-322],[971,-326],[1030,-336],[1090,-354],[1144,-368],[1200,-377],[1257,-406],[1305,-443],[1352,-457],[1390,-464],[1405,-469]]);
export const SHORE_W=Object.freeze([[681,-742],[800,-735],[1000,-730],[1150,-735],[1250,-750],[1320,-768],[1385,-764],[1410,-742]]);
export const BAY_WEST=Object.freeze([...SHORE_W.map(([z,x])=>[x,z]),[-640,1418],[-540,1420],...SHORE_E.slice().reverse().map(([z,x])=>[x,z])]);
// Östra viken (vattnet öster om Orrholmen).
export const BAY_EAST=Object.freeze([[-20,939],[102,909],[254,970],[406,1061],[512,1198],[436,1350],[284,1411],[132,1380],[26,1335],[-35,1213],[-35,1076]]);
const interp=(s,z)=>{if(z<=s[0][0])return s[0][1];for(let i=1;i<s.length;i++)if(z<=s[i][0]){const t=(z-s[i-1][0])/(s[i][0]-s[i-1][0]);return s[i-1][1]+(s[i][1]-s[i-1][1])*t;}return s.at(-1)[1];};
export const shoreE=z=>interp(SHORE_E,z),shoreW=z=>interp(SHORE_W,z);
export const pointIn=(x,z,poly)=>{let r=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)r=!r;}return r;};
export const inOrrWater=(x,z)=>pointIn(x,z,BAY_WEST)||pointIn(x,z,BAY_EAST);

// ── Stadsträdgården (OSM 37825444) och dess rabatter ─────────────────────────────────────────────────────────────
export const TRADGARD=Object.freeze([[3.6,682.2],[-21.3,669.4],[-5.2,638.2],[-1.2,629.5],[-1.2,622.7],[0.7,534.4],[3,471.4],[6.3,468.8],[8.1,415.9],[6.7,412.2],[3.4,404.7],[-80.4,402],[-91.6,401.6],[-92.4,421.3],[-94.1,469.1],[-101.3,622.2],[-105,683.8],[-31.8,692.2],[-21.3,691.1],[-15.2,690.2],[-6.5,688.4],[1.5,685.1]]);
// Rabatterna i OSM-utdraget ligger öster om parken, längs Hamngatan och Inre hamn (Hamnparken); rosrabatterna i parken är egna.
export const HAMN_BEDS=Object.freeze([[131,416,5,5],[131,430,5,5],[130,443,5,5],[130,457,5,5],[117,451,6,49],[115,529,10,34],[120,497,7,22],[94,570,12,26]]);
export const TRADGARD_BEDS=Object.freeze([[-45,478,9,16],[-72,602,12,10],[-18,520,8,14],[-44,650,16,10],[-86,448,8,10]]);

// ── Bryggudden: tungan mellan Inre hamns två vikar. Kanterna räknas ur spelets vattenrader. ─────────────────────────────
export function bryggEdges(z0=430,z1=640,step=10){
  const west=[],east=[];
  for(let z=z0;z<=z1;z+=step){
    const row=WATER_ROWS[Math.max(0,Math.min(WATER_ROWS.length-1,Math.round((z+318)/2)))].filter(r=>r[1]>150);
    if(row.length>=2){west.push([z,row[0][1]]);east.push([z,row.at(-1)[0]]);}
  }
  return {west,east};
}
export const BRYGG_TIP_Z=690;

// ── Platser ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Skyltar: [text, x, z, höjd, bredd, vridning i grader]. Vridningen 0 syns från norr (−z → +z), 180 från söder, 90 från öster, −90 från väster.
export const ORR_SIGNS=Object.freeze([
  ['ORRHOLMSVIKEN · DJUPT VATTEN',shoreE(900)+16,900,3.0,8.4,90],
  ['← MARIEBERG · 400 M ÖVER VATTNET',shoreE(1060)+16,1060,3.0,9.4,90],
  ['ORRHOLMENS BADPLATS',shoreE(1160)+20,1160,3.0,7.6,90],
  ['TULLHOLMEN · BAGERIET',-125,984,6.0,9,0],
  ['TULLHOLMEN ↑ · ORRHOLMEN ↓',-141,870,3.0,8.6,0],
  ['GAMLA FÄRJELÄGET',-466,1436,3.4,7.4,0],
  ['→ ORRHOLMEN · PARKEN ÄR LÅNGT SÖDERUT',-141,1290,3.0,10,0],
  ['ORRHOLMSPARKEN',-100,1430,3.2,7.6,0],
  ['UTSIKTSPLATSEN · ÖSTRA VIKEN',-102,1676,3.4,9.4,0],
  ['ORRHOLMEN ↓ · UDDEN',-322,1600,3.0,8,0],
  ['→ ORRHOLMEN · 500 M ÖVER VATTNET',shoreW(1262)-12,1262,3.0,9.4,-90],
  ['VATTEN · SIMNING FÖRBJUDEN HÄR',shoreW(1100)-12,1100,3.0,9,-90],
  ['STADSTRÄDGÅRDEN',-44,408,3.2,7,0],
  ['ROSENPERGOLAN',-45,462,3.2,5.2,0],
  ['BRYGGUDDEN · HAMNPROMENADEN',378,470,3.2,9,0],
  ['KARLSTAD C · SPÅR 1–3',-215,312,3.0,6.4,180]
]);
// Gömda skatter och ledtrådar (läggs till i explore-places.mjs). Alla är kontrollerade mot spelets blocked() och nåbara från Torget.
export const NEW_TREASURES=Object.freeze([
  {id:'t-bageriet',name:'Bageriets sista kanelbulle',x:-110,z:1012,points:350,hint:'Där operans orkester repeterar, på Tullholmen.'},
  {id:'t-badbryggan',name:'Badstrandens glömda handduk',x:-350,z:1150,points:300,hint:'Mitt på Orrholmens badstrand, nära vattnet.'},
  {id:'t-farjan',name:'Färjelägets rostiga kedja',x:-466,z:1432,points:400,hint:'Vid rampen där färjan gick, innerst i viken.'},
  {id:'t-uddevag',name:'Uddestigens eka',x:-100,z:1700,points:450,hint:'Längst ut på Orrholmens udde, bland gamla ekar.'},
  {id:'t-utsikt',name:'Utsiktsplatsens kikare',x:-102,z:1655,points:400,hint:'Högt upp med utsikt över Östra viken.'},
  {id:'t-orrskog',name:'Orrholmsskogens lönndörr',x:14,z:1560,points:450,hint:'I skogsbrynet öster om parken, mot vattnet.'},
  {id:'t-ros',name:'Rosenpergolans gyllene ros',x:-44,z:486,points:350,hint:'Under rosorna i Stadsträdgården.'},
  {id:'t-damm',name:'Dammens droppar',x:-52,z:552,points:300,hint:'Vid den lilla dammen mitt i Stadsträdgården.'},
  {id:'t-fontan',name:'Fontänens fjärde slant',x:-48,z:638,points:350,hint:'Där vattnet sprutar i parkens södra del.'},
  {id:'t-brygga',name:'Bryggans sista bom',x:452,z:626,points:400,hint:'Längst ut på Bryggudden, där tungan tar slut.'},
  {id:'t-kranen',name:'Hamnkranens kaffekopp',x:440,z:602,points:350,hint:'Under den gamla hamnkranen på Bryggudden.'},
  {id:'t-perrong',name:'Perrongens bortglömda biljett',x:-205,z:332,points:350,hint:'På mittperrongen på Karlstad C, bakom stationshuset.'},
  {id:'t-klockan',name:'Stationsklockans tid',x:-221,z:292,points:300,hint:'Under stationens stora klocka.'}
]);
// Extra termosar: [x,z]. Nycklarna blir album-områden (id fx-<nyckel>-<n>).
export const NEW_THERMOS=Object.freeze({
  orrholmen:Object.freeze([[-312,860],[-102,944],[-298,972],[-144,1070],[-102,1084],[-186,1140],[-74,1168],[-88,1224],[-214,1252],[-298,1266],[-144,1280],[-90,1304],[-90,1360],[-20,1388],[-230,1402],[-76,1402],[-160,1430],[-258,1444],[-48,1472],[-300,1486],[-188,1486],[-230,1500],[-104,1514],[-174,1528],[-300,1542],[-118,1570],[-300,1598],[-202,1598],[-258,1612],[-132,1612],[-76,1612],[-202,1654],[-146,1654],[-104,1770]]),
  tradgard:Object.freeze([[-8,418],[-80,426],[-56,442],[-88,482],[-16,522],[-8,546],[-88,554],[-56,578],[-8,578],[-24,594],[-48,610],[-16,618],[-96,642],[-88,666]]),
  bryggudden:Object.freeze([[243,430],[267,438],[419,446],[235,470],[339,542],[435,582],[443,614],[291,622],[251,630],[419,630],[307,638],[443,638]]),
  station:Object.freeze([[-202,286],[-250,294],[-290,315.5],[-248,318],[-200,318],[-254,331],[-182,333],[-158,333]])
});

// Platsutmaningar: gå in i cirkeln så startar en tidsutmaning med några termosar som läggs ut på platsen (samma tidslinje som blixtutmaningarna).
export const SITE_CHALLENGES=Object.freeze([
  {id:'fyr',name:'FYRJAKTEN',x:-100,z:1650,radius:14,seconds:80,points:[[-104,1742],[-100,1694],[-100,1638],[-142,1708],[-58,1638]],reward:350,text:'Tänd alla fem lyktor på Orrholmens udde'},
  {id:'ros',name:'ROSJAKTEN',x:-45,z:462,radius:10,seconds:90,points:[[-48,466],[-96,538],[-8,562],[-72,506],[0,506],[-88,466]],reward:300,text:'Plocka sex rosor i Stadsträdgården'},
  {id:'tag',name:'TÅGET GÅR!',x:-215,z:316,radius:9,seconds:50,points:[[-284,333],[-254,333],[-242,315.5],[-212,331],[-266,315.5]],reward:300,text:'Hinn med fem biljetter på perrongerna'},
  {id:'hamn',name:'HAMNRUNDAN',x:380,z:495,radius:10,seconds:70,points:[[291,502],[379,494],[339,510],[419,502],[435,606],[427,574]],reward:300,text:'Samla sex linor på Bryggudden'}
]);
