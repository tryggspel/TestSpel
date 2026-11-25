// Dagens julklappsjakt (2.21.1-xmas.13): inställningar och schemat för vad som göms vilken dag. Ren data.
// Varje dag finns en ny julklapp gömd någonstans i Karlstad (xmas-daily.mjs väljer plats efter datum). Den hittas en gång per dag och ger en belöning.
//
// DAILY_HUNTS: tillägg för enskilda datum ('YYYY-MM-DD', svensk kalenderdag). Allt är frivilligt:
//   area     område för dagens gömställe (ett id ur DAILY_AREAS), om dagens ska ligga på ett bestämt ställe
//   spot     index i områdets platser (0 …), tillsammans med area
//   coupon   ett erbjudande (id ur COUPONS i xmas-meta-config.mjs) som följer med dagens julklapp. Kupongen delas ut en gång per spelare, som alla kuponger.
//   qr       en rad som visas på dagens kort, t.ex. var en affisch med QR-kod (?paket=) hänger i verkligheten. Skriv aldrig själva koden här: koden finns bara på affischen.
//   xp, orn, tickets   en större belöning än vanligt (orn = lägsta sällsynthet på prydnaden)
//   note     en egen rad om dagen (t.ex. "Första advent: dubbel belöning")
// Spelet påstår inga samarbeten: ett erbjudande läggs in först när någon står bakom det (se COUPONS), och texten här får inte nämna en butik som inte har sagt ja.
// Exempel (avstängt):
//   '2026-12-06':{area:'tradgard',spot:3,coupon:'julgransrabatt',qr:'Affischen med dagens QR-kod hänger vid julgransförsäljningen.',note:'Andra advent'}
export const DAILY_HUNTS=Object.freeze({
  '2026-11-29':Object.freeze({area:'klara',spot:0,orn:'epic',note:'Första advent: en finare prydnad i dagens julklapp.'}),
  '2026-12-06':Object.freeze({orn:'epic',note:'Andra advent: en finare prydnad i dagens julklapp.'}),
  '2026-12-13':Object.freeze({orn:'epic',xp:120,note:'Lucia: extra XP och en finare prydnad.'}),
  '2026-12-20':Object.freeze({orn:'epic',note:'Fjärde advent: en finare prydnad i dagens julklapp.'}),
  '2026-12-24':Object.freeze({area:'tradgard',spot:6,orn:'legendary',xp:200,tickets:1,note:'Julafton: tomtens egen julklapp.'})
});
export const DAILY=Object.freeze({
  xp:80,            // XP för dagens julklapp (om dagen inte säger annat)
  warm:140,hot:50,  // "varmt" och "glödhett" (meter till julklappen)
  cool:250,cold:450,// värmemätaren (2.21.1-xmas.17): ljummet inom cool, kallt inom cold, annars iskallt
  // Ledtrådstrappan (2.21.1-xmas.17): sekunder från start. Knappen LEDTRÅD NU tar nästa steg direkt.
  areaHintAfter:60, // 2: områdets namn
  compassAfter:120, // 3: väderstreck och ungefärligt avstånd härifrån
  arrowAfter:180,   // 4: pilen visar vägen till området
  spotArrowAfter:300,// 5: pilen visar vägen ända fram till julklappen
  areaRadius:70     // pilen leder hit: områdets mitt, inom så här många meter från julklappen
});
