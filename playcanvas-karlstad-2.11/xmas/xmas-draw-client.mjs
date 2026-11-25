// Anmälan till dragningen (klientens del): datumtext, kontroll av formuläret, förfrågan till servern (api/xmas-draw.mjs) och tolkning av svaret. Ren modul: fetch skickas in, så att allt går att testa.
// Servern kontrollerar samma saker igen (xmas-draw-server.mjs): klienten är bara till för att ge ett vänligt felmeddelande.
import {PRIZE,MAX_TICKETS} from './xmas-meta-config.mjs?v=2.21.1-xmas.17';
import {validTicket} from './xmas-ticket.mjs?v=2.21.1-xmas.17';

const WEEKDAYS=['söndag','måndag','tisdag','onsdag','torsdag','fredag','lördag'];
const MONTHS=['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'];
export function drawDateText(prize=PRIZE){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(prize.drawDate||'');
  if(!m)return 'Dragningens tid meddelas.';
  const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3],12));
  const time=String(prize.drawTime||'').replace(':','.');
  return 'Dragning '+WEEKDAYS[d.getUTCDay()]+' '+(+m[3])+' '+MONTHS[+m[2]-1]+(time?' kl '+time:'')+'.';
}
// Är anmälan öppen just nu? (Kvarstår till entryCloses.)
export const entryOpen=(now=Date.now(),prize=PRIZE)=>{const t=Date.parse(prize.entryCloses);return Number.isFinite(t)&&now<=t;};
// Går anmälan att göra alls: bara när arrangören fyllt i uppgifterna (PRIZE.ready), läget är api och tiden inte gått ut.
export const entryAvailable=(now=Date.now(),prize=PRIZE)=>!!prize.enabled&&!!prize.ready&&prize.mode==='api'&&entryOpen(now,prize);

const EMAIL=/^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[^\s@<>"']{2,24}$/;
const PHONE=/^\+?[0-9][0-9 \-]{6,18}[0-9]$/;
export const cleanName=s=>String(s??'').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,40);
export const cleanContact=s=>String(s??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,200);
export const contactKind=s=>EMAIL.test(s)?'email':PHONE.test(s)&&s.replace(/\D/g,'').length>=7&&s.replace(/\D/g,'').length<=15?'phone':'';
// Kontrollerar formuläret. Returnerar {ok, errors:{fält:text}, name, contact, kind, tickets}.
export function validateEntry({name,contact,guardian,consent,tickets}){
  const errors={},n=cleanName(name),c=cleanContact(contact),kind=contactKind(c);
  if(n.length<2)errors.name='Skriv ditt namn (minst två tecken).';
  if(!kind)errors.contact='Skriv en e-postadress eller ett telefonnummer som går att nå.';
  if(!guardian)errors.guardian='Du måste bekräfta att du är myndig eller har en målsmans tillåtelse.';
  if(!consent)errors.consent='Du måste godkänna villkoren och att uppgifterna sparas för dragningen.';
  const list=[...new Set((Array.isArray(tickets)?tickets:[]).filter(validTicket))].slice(0,MAX_TICKETS);
  if(!list.length)errors.tickets='Du har inga lotter att skicka in än.';
  return {ok:!Object.keys(errors).length,errors,name:n,contact:c,kind,tickets:list};
}
// Förfrågan till servern. facts = {grade, days, streak} (bara för att servern ska kunna se om antalet lotter är rimligt, ingen belöning).
export function buildPayload(v,facts={}){
  return {v:1,name:v.name,contact:v.contact,guardian:true,consent:true,tickets:v.tickets,facts:{grade:Math.max(1,Math.floor(facts.grade)||1),days:Math.max(0,Math.floor(facts.days)||0),streak:Math.max(0,Math.floor(facts.streak)||0)}};
}
const REASONS={nat:'Det gick inte att nå servern. Kontrollera uppkopplingen och försök igen.',stangd:'Anmälan är stängd.',ogiltig:'Uppgifterna gick inte att ta emot. Kontrollera formuläret.',for_manga:'För många försök. Vänta en stund och försök igen.',ej_redo:'Anmälan är inte öppen än.',fel:'Något gick fel hos servern. Försök igen om en stund.'};
export const reasonText=r=>REASONS[r]||REASONS.fel;
// Skickar anmälan. fetchFn = fetch. Resultat: {ok:true, stored, total} eller {ok:false, reason}.
export async function submitEntry(fetchFn,payload,url=PRIZE.api){
  let res;
  try{res=await fetchFn(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),credentials:'omit'});}
  catch{return {ok:false,reason:'nat'};}
  let body=null;try{body=await res.json();}catch{}
  if(res.ok&&body&&body.ok)return {ok:true,stored:Number(body.stored)||0,total:Number(body.total)||0};
  const code=body&&typeof body.error==='string'?body.error:'';
  if(res.status===429)return {ok:false,reason:'for_manga'};
  if(res.status===503||code==='ej_redo')return {ok:false,reason:'ej_redo'};
  if(code==='stangd')return {ok:false,reason:'stangd'};
  if(res.status>=400&&res.status<500)return {ok:false,reason:'ogiltig'};
  return {ok:false,reason:'fel'};
}
