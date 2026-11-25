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
  {n:3,name:'VANTSTICKARE',xp:400,orn:'rare'},
  {n:4,name:'LJUSTÄNDARE',xp:900,tickets:1},
  {n:5,name:'SPÅRSPANARE',xp:1600,orn:'rare'},
  {n:6,name:'GLÖGGKOKARE',xp:2600,tickets:1},
  {n:7,name:'SLÄDDRAGARE',xp:3900,orn:'epic'},
  {n:8,name:'RENVISKARE',xp:5600,tickets:1},
  {n:9,name:'STJÄRNPUTSARE',xp:7800,orn:'epic'},
  {n:10,name:'NORDPOLSBUD',xp:10500,tickets:1},
  {n:11,name:'PAKETMÄSTARE',xp:14000,orn:'epic'},
  {n:12,name:'SJÄLVASTE TOMTEN',xp:18500,tickets:2,orn:'legendary'}
].map(l=>Object.freeze(l)));

// ── XP ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const XP=Object.freeze({
  perPackage:2,perBonus:6,complete:40,firstOfDay:30,   // en klarad jakt (intro, rundor, Mariebergsskogen)
  free:Object.freeze({perPackage:2,perBonus:6}),        // fri julvandring (ingen klar jakt, inget slutkort): bara det man hittat
  zombieLevel:30,rushClear:25,rushStar:5,marathonMin:20,marathonPerTempo:3, // Maraton räknas som klarad vid minst marathonMin paket
  failedPerPackage:1,failedMax:20,                      // en jakt som misslyckas (tagen av tomtezombierna, slut på hjärtan) ger lite för mödan
  place:Object.freeze({first:40,repeat:10}),sandgrund:Object.freeze({first:60,repeat:15}), // butiksuppdrag (Cervera, Pressbyrån) och Sandgrund
  dupe:15,hidden:60,mission:Object.freeze({easy:40,medium:60,hard:80}),code:30,
  // 2.21.1-xmas.13: Termosjakten (räknas som klarad vid minst termosMin termosar; dagsmålet ger termosGoal en gång per dag) och dagens julklappsjakt (daily, en gång per dag)
  termosMin:15,termosGoal:60,daily:80
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
// Oddsen per dragning (procent). dailyGift: dagens julklapp (alla tre uppdrag klara). hidden: gömda julklappar. code: hemligt paket (QR).
export const ORNAMENT_ODDS=Object.freeze({
  normal:Object.freeze({common:70,rare:24,epic:5.5,legendary:.5}),
  dailyGift:Object.freeze({common:35,rare:45,epic:18,legendary:2}),
  hidden:Object.freeze({common:0,rare:75,epic:23,legendary:2}),
  code:Object.freeze({common:0,rare:70,epic:28,legendary:2})
});
// Vilken prydnad inom en sällsynthet som dras: något man inte har väger bias gånger mer än något man har. Efter pity dubbletter i rad får man alltid något man saknar (om det finns), så att ingen
// står och väntar på de sista för evigt. Utan det här fylls granen efter 24 dragningar och prydnaderna blir en engångsgrej; med det tar de sällsynta längre tid än de vanliga (tools/xmas-meta/sim.mjs).
export const ORNAMENT_POLICY=Object.freeze({bias:3,pity:8});
export const FIRST_ORNAMENT='orn-red'; // det första uppdraget ger alltid en röd kula

// ── Dagliga uppdrag ───────────────────────────────────────────────────────────────────────────────────────────────
// kind: termosRuns (rundor i Termosjakten) | termos (termosar i Termosjakten) | daily (dagens julklapp hittad) | runs (klarade julklappsjakter) | packages (hittade julklappar, vanliga och bonus) | bonus (bonuspaket) | chain (bästa kombo i en körning) | fast (snabbaste klarade jakt, sekunder, högst target)
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
  {id:'rush1',tier:'hard',text:'Klara en rush',kind:'rush',target:1,needs:'tried-rush'},
  // 2.21.1-xmas.13: huvudspåret Termosjakten och dagens julklappsjakt
  {id:'termos1',tier:'easy',text:'Spela en runda Termosjakten',kind:'termosRuns',target:1},
  {id:'termos60',tier:'medium',text:'Plocka 60 termosar i Termosjakten',kind:'termos',target:60},
  {id:'dagens',tier:'hard',text:'Hitta dagens julklapp',kind:'daily',target:1}
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
// QR_CODES: {h: sha256 av koden (xmas-hash.mjs: codeHash), id, label, reward:{xp,orn,tickets,coupon}} per kod. Koden själv står aldrig i bygget: tools/xmas-qr skapar dem, och koder.csv med koderna i klartext ligger i qr-out/ (ignorerad av git).
// COUPONS: {id, title, partner, text, terms, validTo ('YYYY-MM-DD'), pin: sha256 av PIN (xmas-hash.mjs: pinHash)} per erbjudande. Spelet påstår inga samarbeten: partner är tomt tills en butik står bakom kupongen.
// Provomgång 2026 (xmas.12): tolv affischkoder, alla med samma kupong: rabatt på julgran (en kupong per enhet, oavsett hur många affischer som skannas). Belopp och säljare är inte bestämda, så texten anger inget belopp och ingen butik.
// Ändra texten här när de är beslutade: den slås upp vid visning, så den gäller också kuponger som redan delats ut. Koderna ger ingen lott (lotter kommer av spelet, inte av affischer).
export const QR_CODES=Object.freeze([
  {h:'3d1f1e2efe63caf336f9e79372ccc697509096ce07ca388b3d58d9a302477980',id:'affisch-1-ryf',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'f64bb0b74317ad1107137838e7015128cc72a36fae9f4cf543602144687df0be',id:'affisch-2-42v',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'ae9f9a0c123e5347030600ce81340e67e4cc6795980b577663dd662f8f1b9d08',id:'affisch-3-hah',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'f563fd1d7de65d7bf7445397fea87b077ce129343e7e31c44b06090c8dada64d',id:'affisch-4-fjp',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'0c6db7bcebab721bf14bc159eb04c900d0b5ce55fb27bef0ed5e42712a6418e5',id:'affisch-5-cda',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'a342d6141ff81fe9a334b33d88f973eba2e736f96d6188895218e2f24947cf23',id:'affisch-6-bcz',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'a8beca3dbefc63dfce8b03c9eea0d3e4a1b6dd6998dd3ec1bcdc36fc7d045b80',id:'affisch-7-pn9',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'a9115316bdae452734502bbcc80852c4f62286b6ebf1e467a2624436f0497f3c',id:'affisch-8-h67',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'17981e206fa26f8247df23a156abed9a0bde295861e1f193c25b8e517232368a',id:'affisch-9-mwb',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'cac5ec99c776128b9d439ae64cfa803f2144633b206fdfb919fe67bf5a828723',id:'affisch-10-fep',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'542e669fb431dfc157baa87c070d9dea4d4f08d1e145fc4b308ba314eff5c274',id:'affisch-11-7wj',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
  {h:'9c8f25ae397d58fc09d47b0f795f84d175d9144ac62965b2d8740c0ceae006e2',id:'affisch-12-6c4',label:"JULGRANSRABATT",reward:{xp:30,orn:'rare',coupon:'julgransrabatt'}},
]);
export const COUPONS=Object.freeze([
  {id:'julgransrabatt',title:'RABATT PÅ JULGRAN',partner:'',text:'Visa kupongen när du köper din julgran och be om julgransrabatten.',terms:'Gäller en gång. Personalen löser in kupongen med en PIN i din telefon.',validTo:'2026-12-24',pin:'4a73495c55c6d2004bc3d9559de24fe9cfb0453330321f1ff26eb90affa4c686'},
]);
