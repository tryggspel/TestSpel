// Villkor och integritetstext för dragningen. UTKAST: det här är ett förslag på vanlig svenska som arrangören ska läsa, ändra och låta en jurist granska innan anmälan öppnas (PRIZE.ready i xmas-meta-config.mjs).
// Jag är ingen jurist. Särskilt: kontrollera om utlottningen kräver tillstånd eller anmälan, hur gammal man ska vara, hur länge uppgifter får sparas och vilken rättslig grund som ska anges.
// Texten fylls med uppgifterna i PRIZE (ansvarig, kontakt, pris, sponsor, datum). Saknas en uppgift lämnas en synlig platshållare kvar: tests/xmas-draw.test.mjs kräver att inga platshållare finns kvar när ready är sant.
import {PRIZE,TICKETS} from './xmas-meta-config.mjs?v=2.21.1-xmas.14';
import {drawDateText} from './xmas-draw-client.mjs?v=2.21.1-xmas.14';

const val=(v,placeholder)=>String(v||'').trim()||'['+placeholder+']';
const sv=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso||'');return m?(+m[3])+'/'+(+m[2])+' '+m[1]:'['+'datum'+']';};

export function drawTexts(prize=PRIZE){
  const who=val(prize.controller,'ANSVARIG'),contact=val(prize.contact,'KONTAKT'),what=String(prize.name||'En julgran').toLowerCase(),sponsor=String(prize.sponsor||'').trim();
  const closes=/^(\d{4}-\d{2}-\d{2})/.exec(prize.entryCloses||''),clockClose=/T(\d{2}):(\d{2})/.exec(prize.entryCloses||'');
  const rules=[
    'Utlottningen är gratis och kräver inget köp. Du deltar genom att spela Julklappsjakten och skicka in dina lottkoder.',
    'Pris: '+what+(sponsor?', skänkt av '+sponsor:'')+'. Priset kan inte bytas mot pengar.',
    'Lotter får du av att spela: första uppdraget, var '+TICKETS.meter+':e julklapp (högst '+TICKETS.dailyCap+' lotter om dagen på det sättet), dagens tre uppdrag, serier, nya grader, Julkalenderns luckor, adventssöndagarna och var femte gömd julklapp. Varje lott har en egen kod.',
    'Anmälan stänger '+(closes?sv(closes[1])+(clockClose?' kl '+clockClose[1]+'.'+clockClose[2]:''):'['+'datum'+']')+'. '+drawDateText(prize)+' Vinnaren dras slumpmässigt bland alla inskickade lottkoder; varje kod räknas en gång.',
    'Du ska vara 18 år eller äldre, eller ha en målsmans tillåtelse. Är vinnaren under 18 år kontaktas målsman.',
    'Vinnaren kontaktas på de kontaktuppgifter som lämnats. Svarar vinnaren inte inom sju dagar dras en ny.',
    'Arrangören kontrollerar vinnarens lottkoder före utlämning och kan stänga av den som fuskar, till exempel genom att skapa lottkoder på annat sätt än genom att spela.',
    'Arrangör och kontakt: '+who+', '+contact+'.'
  ];
  const privacy=[
    'Personuppgiftsansvarig: '+who+' ('+contact+').',
    'Vi sparar det du skriver i formuläret (namn, e-postadress eller telefonnummer), dina lottkoder, tidpunkten för anmälan och enkel spelstatistik (grad, antal spelade dagar och längsta serie) som visar att antalet lotter är rimligt.',
    'Vi använder uppgifterna för att genomföra utlottningen, kontrollera vinnaren och kontakta vinnaren. Grunden är ditt samtycke, som du kan ta tillbaka när du vill.',
    'Uppgifterna lagras för vår räkning hos Vercel Inc. (molnlagring) och lämnas inte vidare till andra.',
    'Vi sparar uppgifterna till och med '+sv(prize.keepUntil)+' och raderar dem därefter.',
    'Du kan be om ett utdrag, få felaktiga uppgifter rättade eller raderade genom att kontakta '+contact+'. Du kan också klaga hos Integritetsskyddsmyndigheten (IMY).',
    'Spelet sparar annars bara dina framsteg i din egen webbläsare, på din enhet. Inget av det skickas hit om du inte skickar in dina lotter.'
  ];
  return {rules,privacy};
}
// Finns det platshållare kvar ([ANSVARIG], [KONTAKT], [datum])?
export const unfilled=texts=>[...texts.rules,...texts.privacy].filter(t=>/\[[A-Za-zÅÄÖåäö ]+\]/.test(t));
