// Julguiden (2.21.1-xmas.14): julbord och julmarknader i Karlstad, utplacerade vid sina riktiga adresser i spelet. Ren data.
// Går man förbi visas en ruta med namnet; trycker man öppnas ett kort med uppgifterna. Uppgifterna är hämtade från restaurangernas och arrangörernas egna sidor
// och från turistsajterna 2026-11-24–25 (KARLSTAD-JUL-2026.md). De kan ha ändrats: kortet säger alltid att man ska kontrollera hos stället, och spelet påstår inget samarbete.
//
// Fält:
//   id, kind ('julbord' | 'julmarknad'), name, address
//   when, price, text           det som står på kortet (kort och sakligt)
//   source, checked             varifrån uppgifterna kommer och när de kontrollerades
//   x, z, yaw                   var skylten står (meter från Stora Torget; yaw i grader, 0 = läsbar söderifrån, 90 österifrån, 180 norrifrån, −90 västerifrån).
//                               Räknat från husets fasad mot gatan i OSM-utdraget (1,8 m ut från väggen), eller närmaste gångbara punkt för platser utan hus i utdraget.
//   snap                        true = skylten flyttas till närmaste gångbara punkt när spelet startar (platser utan hus i utdraget)
//   place: false                finns inte på spelets karta (utanför staden eller adressen kunde inte placeras): bara med i listan
//   coupon, qr                  erbjudande (id ur COUPONS i xmas-meta-config.mjs) och en rad om en QR-affisch hos stället. Tomma tills stället självt står bakom ett erbjudande.
export const GUIDE=Object.freeze({near:16,show:140,visitXp:10});
export const JULGUIDE=Object.freeze([
  // ── Julbord ──────────────────────────────────────────────────────────────────────────────────────────────
  {id:'elite',kind:'julbord',name:'Elite Stadshotellet',address:'Kungsgatan 22',when:'26 november–19 december',price:'Från 645 kr per person (elite.se; äldre uppgifter anger 465–655 kr)',
    text:'Julbord i hotellets matsal vid Klarälven, framtaget av Tareq Taylor och Carina Brydling.',source:'elite.se, julbordskollen.se',checked:'2026-11-25',x:-146.8,z:-58.7,yaw:-2},
  {id:'fratelli',kind:'julbord',name:'Hotel Fratelli',address:'Drottninggatan 17',when:'December',price:'Julsupé 845 kr per person',
    text:'Julsupé i hotellets restaurang mitt emot Mitt i City.',source:'julbordsportaler (julbordskollen.se, julbordsportalen.se m.fl.)',checked:'2026-11-25',x:-98.9,z:176.7,yaw:179},
  {id:'pitchers',kind:'julbord',name:"Pitcher's",address:'Kungsgatan 12',when:'20 november–19 december',price:'449–739 kr per person',
    text:'Julbord på sportpuben vid Stora Torget.',source:'julbordsportaler (julbordskollen.se, julbordsportalen.se m.fl.)',checked:'2026-11-25',x:51.4,z:-50.7,yaw:-2},
  {id:'scandic',kind:'julbord',name:'Scandic Karlstad City',address:'Drottninggatan 4',when:'December',price:'Se hotellets sida',
    text:'Julmeny i sex rätter på hotellets restaurang.',source:'julbordsportaler (julbordskollen.se, julbordsportalen.se m.fl.)',checked:'2026-11-25',x:151.1,z:165.6,yaw:-2},
  {id:'olearys',kind:'julbord',name:"O'Learys",address:'Tingvallagatan 9',when:'Onsdag–fredag i december',price:'399 kr och 649 kr per person',
    text:'Julbord på sportbaren vid Stora Torget. Gå in genom dörren bredvid skylten.',source:'olearys.com',checked:'2026-11-25',x:53.4,z:44.6,yaw:178},
  {id:'ccc',kind:'julbord',name:'Karlstad CCC',address:'Tage Erlandergatan 8',when:'10–12 december',price:'Se arrangörens sida',
    text:'Julbord med show i kongresshuset vid älven.',source:'julbordsportaler (julbordskollen.se, julbordsportalen.se m.fl.)',checked:'2026-11-25',x:384,z:-246,yaw:0,snap:true},
  {id:'olssons',kind:'julbord',name:'Olssons Bazar',address:'Tullhusgatan 1',when:'20 november–19 december',price:'495–795 kr per person',
    text:'Stort klassiskt julbord med dessertbord och glögg.',source:'olssonsbazar.com, visitvarmland.com',checked:'2026-11-25',place:false},
  {id:'julins',kind:'julbord',name:'Julins Backyard Barbecue',address:'Östanvindsgatan 1',when:'25 november–19 december',price:'495 kr per person',
    text:'Julbord med rökt kött från grillen.',source:'julbordsportaler (julbordskollen.se, julbordsportalen.se m.fl.)',checked:'2026-11-25',place:false},
  {id:'racecourse',kind:'julbord',name:'Race Course',address:'Se restaurangens sida',when:'4, 5, 11 och 12 december',price:'745–795 kr per person',
    text:'Julbord några utvalda kvällar.',source:'julbordsportaler (julbordskollen.se, julbordsportalen.se m.fl.)',checked:'2026-11-25',place:false},
  // ── Julmarknader ─────────────────────────────────────────────────────────────────────────────────────────
  {id:'solstaden',kind:'julmarknad',name:'Vinter i Solstaden',address:'Stora torget',when:'26–29 november',price:'Fri entré',
    text:'Julmarknad, foodtrucks, scenprogram och insamling inför första advent. Granen tänds kl. 17 med kör; tomte och tomtemor på torget.',source:'nwt.se, karlstadinfo.se, visitvarmland.com',checked:'2026-11-25',x:-21,z:19,yaw:150},
  {id:'marieberg',kind:'julmarknad',name:'Julmarknad i Mariebergsskogen',address:'Mariebergsskogen',when:'5–6 december kl. 11–17',price:'Se arrangörens sida',
    text:'Ett nittiotal utställare i friluftsmuseet. Båtbussen från Inre hamn går hit i spelet.',source:'julmarknaderna.se, hantverk.nu',checked:'2026-11-25',x:-786,z:1316,yaw:90,snap:true},
  {id:'tullholmen',kind:'julmarknad',name:'Jul på Tullholmen',address:'Tullholmen',when:'December (datum ej bekräftade)',price:'Se arrangörens sida',
    text:'Julstämning på Tullholmen. Datumen var inte bekräftade när guiden skrevs.',source:'visitkarlstad.se',checked:'2026-11-25',x:-118,z:1016,yaw:90,snap:true},
  {id:'almars',kind:'julmarknad',name:'Almars gård',address:'Utanför Karlstad',when:'21–22 november',price:'Se arrangörens sida',
    text:'Gårdsmarknad utanför staden.',source:'julmarknaderna.se',checked:'2026-11-25',place:false},
  {id:'algonas',kind:'julmarknad',name:'Södra Älgånäs bisonfarm',address:'Utanför Karlstad',when:'6 december',price:'Se arrangörens sida',
    text:'Julmarknad på gården.',source:'julmarknaderna.se',checked:'2026-11-25',place:false}
].map(e=>Object.freeze({place:true,snap:false,coupon:'',qr:'',...e})));
export const guideById=id=>JULGUIDE.find(e=>e.id===id)||null;
export const placedGuide=()=>JULGUIDE.filter(e=>e.place);
// Närmaste utplacerade ställe inom r meter: {entry, distance} eller null.
export function nearestGuide(p,r=GUIDE.near,list=placedGuide()){
  let best=null;for(const e of list){const d=Math.hypot(e.x-p.x,e.z-p.z);if(d<=r&&(!best||d<best.distance))best={entry:e,distance:d};}return best;
}
