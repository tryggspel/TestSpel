// Anmälan till dragningen (serverns del): kontroll av förfrågan, nyckel per kontakt, hopslagning med en tidigare anmälan och en grov kontroll av om antalet lotter är rimligt.
// Ren modul utan I/O (används av api/xmas-draw.mjs och testas utan nät). Personuppgifter: namn, kontakt och lottkoder, och inget annat. Inga IP-adresser sparas.
// Lotter ligger på spelarens enhet och går att fabricera av den som kan koden (XMAS-SPELDESIGN.md, avsnitt 6). Servern avvisar därför inget som bara "ser mycket ut", men flaggar det
// (flags) så att en människa kontrollerar vinnaren före utlämning. Det som avvisas är det som är trasigt: fel format, för många koder, ingen bekräftelse.
import {PRIZE,MAX_TICKETS,TICKETS,SEASON} from './xmas-meta-config.mjs?v=2.21.1-xmas.17';
import {validTicket} from './xmas-ticket.mjs?v=2.21.1-xmas.17';
import {cleanName,cleanContact,contactKind,entryOpen} from './xmas-draw-client.mjs?v=2.21.1-xmas.17';
import {sha256} from './xmas-hash.mjs?v=2.21.1-xmas.17';

export const MAX_BODY=24000; // tecken i förfrågan som JSON
export const CONTACT_FIELD=/^[^\u0000-\u001f\u007f]*$/;

// Nyckeln en anmälan sparas under: kontaktuppgiften (gemener, utan mellanrum) som kontrollsumma, så att samma person som skickar in nya lotter senare hamnar på samma ställe.
export const contactKey=contact=>sha256('julklappsjakten|kontakt|'+String(contact).toLowerCase().replace(/\s+/g,'').replace(/-/g,''));
export const entryPath=(contact,year=SEASON.end.slice(0,4))=>'draw/'+year+'/'+contactKey(contact).slice(0,40)+'.json';

// Kontrollerar en förfrågan. Resultat: {ok:true, value:{name,contact,kind,tickets,facts}} eller {ok:false, status, error}.
export function validateBody(body,{now=Date.now(),prize=PRIZE}={}){
  if(!prize.enabled||!prize.ready||prize.mode!=='api')return {ok:false,status:503,error:'ej_redo'};
  if(!entryOpen(now,prize))return {ok:false,status:403,error:'stangd'};
  if(!body||typeof body!=='object'||Array.isArray(body)||body.v!==1)return {ok:false,status:400,error:'ogiltig'};
  if(body.guardian!==true||body.consent!==true)return {ok:false,status:400,error:'ogiltig'};
  const name=cleanName(body.name),contact=cleanContact(body.contact),kind=contactKind(contact);
  if(name.length<2||!kind||!CONTACT_FIELD.test(contact))return {ok:false,status:400,error:'ogiltig'};
  if(!Array.isArray(body.tickets)||!body.tickets.length||body.tickets.length>MAX_TICKETS)return {ok:false,status:400,error:'ogiltig'};
  const tickets=[...new Set(body.tickets)];
  if(!tickets.every(validTicket))return {ok:false,status:400,error:'ogiltig'};
  const f=body.facts&&typeof body.facts==='object'?body.facts:{},int=(v,max)=>Math.max(0,Math.min(max,Math.floor(Number(v))||0));
  return {ok:true,value:{name,contact,kind,tickets,facts:{grade:Math.max(1,int(f.grade,12)),days:int(f.days,60),streak:int(f.streak,60)}}};
}

// Grov kontroll av om antalet lotter är rimligt för det som spelaren själv uppger (grad, spelade dagar). Ingen avvisning: bara flaggor för den som drar.
//   många: fler lotter än spelade dagar kan ge (4 om dagen: 3 från mätaren och en från dagens julklapp, plus ca 40 från ändliga källor)
//   ny: en enda spelad dag men många lotter
//   hog_grad: många lotter men grad 1–2
export function suspicion(tickets,facts){
  const flags=[],n=tickets.length,days=Math.max(1,facts.days||1);
  if(n>days*(TICKETS.dailyCap+TICKETS.missionDay)+40)flags.push('manga');
  if(days<=1&&n>10)flags.push('ny');
  if(n>20&&(facts.grade||1)<=2)flags.push('lag_grad');
  return flags;
}

// Slår ihop en ny anmälan med en tidigare från samma kontakt (om det finns någon). Lottkoderna är en mängd; namnet och tidpunkterna uppdateras.
export function mergeEntry(existing,value,now=Date.now()){
  const old=existing&&typeof existing==='object'?existing:null;
  const set=new Set(old&&Array.isArray(old.tickets)?old.tickets.filter(validTicket):[]);
  const before=set.size;
  for(const t of value.tickets)set.add(t);
  const tickets=[...set].slice(0,MAX_TICKETS);
  const facts={grade:Math.max(old?.facts?.grade||1,value.facts.grade),days:Math.max(old?.facts?.days||0,value.facts.days),streak:Math.max(old?.facts?.streak||0,value.facts.streak)};
  const entry={v:1,name:value.name,contact:value.contact,kind:value.kind,tickets,facts,first:old?.first||new Date(now).toISOString(),last:new Date(now).toISOString(),submissions:(old?.submissions||0)+1,flags:suspicion(tickets,facts)};
  return {entry,added:tickets.length-Math.min(before,tickets.length),total:tickets.length};
}
