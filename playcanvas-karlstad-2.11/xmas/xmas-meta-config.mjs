// Julklappsjakten: allt som styr framstegen runt jakten (grader, julgran, dagliga uppdrag, serie, kalenderbelöningar, lotter, gömda julklappar) på ett ställe. Ren modul: ingen DOM, ingen spelmotor.
// Siffrorna är ett förslag (se XMAS-SPELDESIGN.md) och räknade med modeller (tools/xmas-meta/sim.mjs), inte spelade av människor: ändra här, inte i logiken (xmas-meta.mjs).
// Inget läge låses av graden: Julkalenderns luckor (julkalender/doors.mjs) kräver rush, zombies, butiker och platsuppdrag redan från början, så allt är öppet efter första uppdraget.

// ── Säsongen ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Datumen är svenska kalenderdagar (Europe/Stockholm). Julkalendern (julkalender/) har 24 luckor, 1–24 december; dess belöningar hämtas här (CALENDAR) när luckan är klar.
export const SEASON=Object.freeze({start:'2026-11-27',calendarStart:'2026-12-01',end:'2026-12-24'});

// ── Tomtegrad ─────────────────────────────────────────────────────────────────────────────────────────────────────
// xp = totalt antal XP som krävs. tickets/orn = belöning när graden nås (orn = lägsta sällsynthet på prydnaden som dras). Namnen är inte samma som julpoängens titlar (xmas-config TITLES)
// eller kalenderns titlar (julkalender/rules.mjs RANKS): luckan "Bli Tomtehjälpare" hör till julpoängen och ska inte kunna förväxlas med en grad.
export const LEVELS=Object.freeze([
  {n:1,name:'SNÖFLINGA',xp:0},
  {n:2,name:'MÖSSBÄRARE',xp:100,orn:'common'},
  {n:3,name:'VANTSTICKARE',xp:300,orn:'rare'},
  {n:4,name:'LJUSTÄNDARE',xp:600,tickets:1},
  {n:5,name:'SPÅRSPANARE',xp:1000,orn:'rare'},
  {n:6,name:'GLÖGGKOKARE',xp:1600,tickets:1},
  {n:7,name:'SLÄDDRAGARE',xp:2400,orn:'epic'},
  {n:8,name:'RENVISKARE',xp:3500,tickets:1},
  {n:9,name:'STJÄRNPUTSARE',xp:5000,orn:'epic'},
  {n:10,name:'NORDPOLSBUD',xp:7000,tickets:1},
  {n:11,name:'PAKETMÄSTARE',xp:9500,orn:'epic'},
  {n:12,name:'SJÄLVASTE TOMTEN',xp:12500,tickets:2,orn:'legendary'}
].map(l=>Object.freeze(l)));

// ── XP ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const XP=Object.freeze({
  perPackage:2,perBonus:6,complete:40,firstOfDay:30,   // en klarad jakt (intro, rundor, Mariebergsskogen)
  free:Object.freeze({perPackage:2,perBonus:6}),        // fri julvandring (ingen klar jakt, inget slutkort): bara det man hittat
  zombieLevel:30,rushClear:25,rushStar:5,marathonMin:20,marathonPerTempo:3, // Maraton räknas som klarad vid minst marathonMin paket
  failedPerPackage:1,failedMax:20,                      // en jakt som misslyckas (tagen av tomtezombierna, slut på hjärtan) ger lite för mödan
  place:Object.freeze({first:40,repeat:10}),sandgrund:Object.freeze({first:60,repeat:15}), // butiksuppdrag (Cervera, Pressbyrån) och Sandgrund
  dupe:15,hidden:60,mission:Object.freeze({easy:40,medium:60,hard:80}),code:30
});

// ── Julgranen: 24 prydnader ───────────────────────────────────────────────────────────────────────────────────────
// [id, namn, sällsynthet, färg, form]. Former: ball heart man flake cane bell bulb star hat angel skate horn sock bun cup gift lantern topstar (ritas i xmas-tree-art.js).
export const ORNAMENTS=Object.freeze([
  ['orn-red','Röd kula','common','#d8362f','ball'],['orn-blue','Blå kula','common','#3d78d8','ball'],['orn-gold','Guldkula','common','#e8b93a','ball'],['orn-silver','Silverkula','common','#c8d3de','ball'],
  ['orn-gingerheart','Pepparkakshjärta','common','#b8743a','heart'],['orn-gingerman','Pepparkaksgubbe','common','#a8662f','man'],['orn-flake','Snöflinga','common','#e8f4ff','flake'],['orn-cane','Sockerstång','common','#e24848','cane'],
  ['orn-bell','Bjällra','common','#f0c24a','bell'],['orn-light','Ljuslampa','common','#ffe27a','bulb'],['orn-smallstar','Liten stjärna','common','#ffd23f','star'],['orn-straw','Halmhjärta','common','#d9b45a','heart'],
  ['orn-hat','Tomtemössa','rare','#d62f2f','hat'],['orn-angel','Julängel','rare','#fff1c9','angel'],['orn-skate','Skridsko','rare','#9ab6d6','skate'],['orn-horn','Renhorn','rare','#8a5a2b','horn'],
  ['orn-sock','Julsocka','rare','#c93a3a','sock'],['orn-bun','Lussekatt','rare','#e0a030','bun'],['orn-cup','Glöggkopp','rare','#a8324a','cup'],
  ['orn-giftgold','Gyllene julklapp','epic','#f2c230','gift'],['orn-aurora','Norrskenskula','epic','#56e0b8','ball'],['orn-crystal','Kristallsnöflinga','epic','#9fe7ff','flake'],['orn-lantern','Tomtens lykta','epic','#ffb24a','lantern'],
  ['orn-topstar','Tomtens stjärna','legendary','#fff08a','topstar']
].map(([id,name,rarity,color,shape])=>Object.freeze({id,name,rarity,color,shape})));
export const RARITIES=Object.freeze(['common','rare','epic','legendary']);
export const RARITY_LABEL=Object.freeze({common:'VANLIG',rare:'SÄLLSYNT',epic:'EPISK',legendary:'LEGENDARISK'});
// Oddsen per dragning (procent). Något man inte har dras före en dubblett. dailyGift: dagens julklapp (alla tre uppdrag klara). hidden: gömda julklappar. code: hemligt paket (QR).
export const ORNAMENT_ODDS=Object.freeze({
  normal:Object.freeze({common:70,rare:24,epic:5.5,legendary:.5}),
  dailyGift:Object.freeze({common:35,rare:45,epic:18,legendary:2}),
  hidden:Object.freeze({common:0,rare:75,epic:23,legendary:2}),
  code:Object.freeze({common:0,rare:70,epic:28,legendary:2})
});
export const FIRST_ORNAMENT='orn-red'; // det första uppdraget ger alltid en röd kula

// ── Dagliga uppdrag ───────────────────────────────────────────────────────────────────────────────────────────────
// kind: runs (klarade julklappsjakter) | packages (hittade julklappar, vanliga och bonus) | bonus (bonuspaket) | chain (bästa kombo i en körning) | fast (snabbaste klarade jakt, sekunder, högst target)
//       | areas (olika platser) | hidden (gömda julklappar) | zombies (klarade nivåer i Tomtezombies) | rush (klarade rusher).
// needs: tried-zombies | tried-rush (bara om spelaren redan provat läget: ingen ska behöva Tomtezombies för att få dagens julklapp) | hidden (bara när gömda julklappar finns i bygget).
export const MISSIONS=Object.freeze([
  {id:'jakt1',tier:'easy',text:'Klara en julklappsjakt',kind:'runs',target:1},
  {id:'samla15',tier:'easy',text:'Hitta 15 julklappar',kind:'packages',target:15},
  {id:'samla40',tier:'medium',text:'Hitta 40 julklappar',kind:'packages',target:40},
  {id:'bonus2',tier:'medium',text:'Hitta 2 bonuspaket',kind:'bonus',target:2},
  {id:'kombo5',tier:'medium',text:'Få en kombo på 5',kind:'chain',target:5},
  {id:'jakt2',tier:'medium',text:'Klara 2 julklappsjakter',kind:'runs',target:2},
  {id:'snabb',tier:'hard',text:'Klara en jakt på under 3 minuter',kind:'fast',target:180},
  {id:'kombo8',tier:'hard',text:'Få en kombo på 8',kind:'chain',target:8},
  {id:'tvaplatser',tier:'hard',text:'Klara jakter på två olika platser',kind:'areas',target:2},
  {id:'gomd1',tier:'hard',text:'Hitta en gömd julklapp',kind:'hidden',target:1,needs:'hidden'},
  {id:'zombie1',tier:'hard',text:'Klara en nivå i Tomtezombies',kind:'zombies',target:1,needs:'tried-zombies'},
  {id:'rush1',tier:'hard',text:'Klara en rush',kind:'rush',target:1,needs:'tried-rush'}
].map(m=>Object.freeze(m)));
export const MISSION_TIERS=Object.freeze(['easy','medium','hard']);
export const TIER_LABEL=Object.freeze({easy:'LÄTT',medium:'MEDEL',hard:'SVÅRT'});

// ── Serie ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// Dagar i rad med minst en klarad jakt. En frysdag räddar serien en missad dag (en ny för var sjunde dag, högst två sparade).
export const STREAK=Object.freeze({freezeEvery:7,maxFreezes:2,milestones:Object.freeze([
  {days:3,orn:'common'},{days:7,tickets:1,xp:100},{days:14,tickets:1,orn:'rare',xp:150},{days:21,tickets:2},{days:24,xp:200}
].map(m=>Object.freeze(m)))});

// ── Julkalenderns belöningar ──────────────────────────────────────────────────────────────────────────────────────
// Luckorna är Julkalenderns (julkalender/doors.mjs, ett uppdrag per lucka). När kalendern räknar en lucka som klar (öppen sin dag och uppdraget uppfyllt) hämtas belöningen här, en gång per lucka.
// Index 0 = lucka 1. orn = lägsta sällsynthet, xp, tickets. Svårare luckor (3 stjärnor) och sista veckan ger mer.
export const CALENDAR=Object.freeze([
  {xp:60},{orn:'common'},{orn:'common',tickets:1},{orn:'common'},{xp:80},{orn:'rare',tickets:1},{orn:'common',tickets:1},{orn:'rare'},
  {orn:'rare',tickets:1},{xp:120},{orn:'rare'},{orn:'rare'},{orn:'epic'},{xp:120,tickets:1},{orn:'rare'},{xp:80},
  {orn:'rare',tickets:1},{xp:150},{orn:'epic'},{orn:'epic',tickets:1},{orn:'epic',xp:150},{orn:'epic',tickets:1},{orn:'epic',tickets:2},{orn:'legendary',xp:250,tickets:3}
].map(d=>Object.freeze(d)));
// Adventssöndagarna: 2 lotter om man klarar en jakt den dagen (en gång per söndag). Första advent infaller före kalendern.
export const ADVENT=Object.freeze([
  {id:'advent1',date:'2026-11-29',label:'FÖRSTA ADVENT',tickets:2},{id:'advent2',date:'2026-12-06',label:'ANDRA ADVENT',tickets:2},
  {id:'advent3',date:'2026-12-13',label:'TREDJE ADVENT',tickets:2},{id:'advent4',date:'2026-12-20',label:'FJÄRDE ADVENT',tickets:2}
].map(a=>Object.freeze(a)));

// ── Lotter ────────────────────────────────────────────────────────────────────────────────────────────────────────
// meter: antal julklappar som ger en lott (mätaren som syns på slutkortet). dailyCap: högst så många lotter om dagen från mätaren (det är det enda som går att dra på i det oändliga: övriga källor är ändliga).
// welcome: första uppdraget ger en lott direkt. missionDay: dagens julklapp (alla tre uppdrag) ger en lott. hiddenEvery: var femte gömd julklapp ger en lott.
// Lottkoden är T-XXXX-XXXX (xmas-ticket.mjs); alfabetet saknar sådant som liknar varandra (0/O, 1/I).
export const TICKETS=Object.freeze({meter:60,dailyCap:3,welcome:1,missionDay:1,hiddenEvery:5,alphabet:'23456789ABCDEFGHJKLMNPQRSTUVWXYZ'});
export const MAX_TICKETS=200;

// ── Gömda julklappar ──────────────────────────────────────────────────────────────────────────────────────────────
// Platserna ligger i xmas-hidden.mjs (ur grundspelets skattjakt). Ledtrådarna släpps en i taget: hintsAtStart först, sedan hintsPerDay nya varje dag från spelarens första dag.
export const HIDDEN=Object.freeze({hintsAtStart:3,hintsPerDay:1,radius:2.2,warm:120,hot:45});

// ── Priset ────────────────────────────────────────────────────────────────────────────────────────────────────────
// mode: none (ingen anmälan, bara lotterna) | api (anmälan till servern: api/xmas-draw.mjs, sparas i Vercel Blob) | form (länk, target = adress med {codes} och {name}) | mail (mejl till target).
// ready: false döljer anmälningsformuläret (spelet visar bara lotterna). Sätt ready:true först när sponsor, ansvarig för uppgifterna och villkoren är ifyllda och lagringen är kopplad.
// controller/contact: vem som är ansvarig för personuppgifterna och hur man når hen (visas i villkoren). Ingen sponsor eller adress påstås förrän de fylls i här.
export const PRIZE=Object.freeze({enabled:true,ready:false,name:'En julgran',sponsor:'',drawDate:'2026-12-21',drawTime:'18:00',entryCloses:'2026-12-21T12:00:00+01:00',
  mode:'api',api:'/api/xmas-draw',controller:'',contact:'',keepUntil:'2027-01-31',rulesUrl:'',privacyUrl:''});

// ── Hemliga paket (QR i verkligheten) och kuponger ──────────────────────────────────────────────────────────────────
// QR_CODES: {h: sha256 av koden (xmas-hash.mjs: codeHash), id, label, reward:{xp,orn,tickets,coupon}} per kod. Tom tills du har platser. Koden själv står aldrig i bygget (tools/xmas-qr skapar dem).
// COUPONS: {id, title, partner, text, terms, validTo ('YYYY-MM-DD'), pin: sha256 av PIN (xmas-hash.mjs: pinHash)} per erbjudande. Tom tills du har riktiga erbjudanden: spelet påstår inga samarbeten.
export const QR_CODES=Object.freeze([]);
export const COUPONS=Object.freeze([]);
