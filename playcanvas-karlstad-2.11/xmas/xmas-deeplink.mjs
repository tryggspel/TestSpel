// Djuplänkar: en adress som tar spelaren rakt till ett uppdrag i Julspelet, till exempel från Julkalendern (julkalender/).
//
//   /?uppdrag=sandgrund&lucka=6
//
// uppdrag = vilket uppdrag (nycklarna nedan), lucka = valfritt, 1–24: bara för rubriken "JULKALENDERN · LUCKA 6" på kortet.
// Länken startar aldrig något av sig själv: Julspelet visar ett kort med uppdraget och en knapp STARTA (ljud och styrning kräver en tryckning, och ingen ska hamna mitt i ett uppdrag av en miss).
// Samma regler som menyerna gäller: det som är låst där är låst här, och kortet säger vad som saknas och erbjuder det som går att göra i stället.
// Ren modul (ingen DOM, ingen PlayCanvas). Nyckeltabellen delas med kalendern bara som en lista med strängar; tests/julkalender-doors.test.mjs kontrollerar att varje lucka pekar på en nyckel som finns här.
import {rushDef,isUnlocked,nextRush,goalText,RUSH_COUNT} from './xmas-rushes.mjs?v=2.21.1-xmas.7';
import {RUSH} from './xmas-rush.mjs?v=2.21.1-xmas.7';
import {zombieLevel,nextZombieLevel,isZombieUnlocked,ZOMBIE_MAX} from './xmas-zombie-levels.mjs?v=2.21.1-xmas.7';
import {roundById,INTRO_SEARCH} from './xmas-rounds.mjs?v=2.21.1-xmas.7';
import {SANDGRUND,sandgrundNote} from './xmas-sandgrund.mjs?v=2.21.1-xmas.7';
import {BOAT,boatNote} from './xmas-marieberg.mjs?v=2.21.1-xmas.7';
import {XMAS_CERVERA,XMAS_PRESSBYRAN} from './xmas-places.mjs?v=2.21.1-xmas.7';

export const LINK_PARAM='uppdrag',DOOR_PARAM='lucka';
export const DOORS_MAX=24;

// Fasta nycklar. rush1–rush12 och zombies1–zombies99 (nivåer) kommer utöver dessa.
//   intro, torget, kungsgatan, drottninggatan   julklappsjakterna
//   cervera, pressbyran                         butiksutmaningarna (Karlstadpasset öppnas, man trycker GÅ DIT)
//   sandgrund, batbuss                          Julvernissagen och Julbåten
//   maraton                                     JulRushen: Maraton
//   rush, topplista, meny                       rushmenyn, topplistan och Julmenyn (öppnas direkt, inget kort)
const ROUND_KEYS=Object.freeze({torget:'round-torget',kungsgatan:'round-kungsgatan',drottninggatan:'round-drottninggatan'});
const SHOP_KEYS=Object.freeze({cervera:XMAS_CERVERA,pressbyran:XMAS_PRESSBYRAN});
const DIRECT_KEYS=Object.freeze(['rush','topplista','meny']);
const FIXED_KEYS=Object.freeze(['intro',...Object.keys(ROUND_KEYS),...Object.keys(SHOP_KEYS),'sandgrund','batbuss','maraton',...DIRECT_KEYS]);
export const LINK_KEYS=FIXED_KEYS;

const KEY_RE=/^[a-z]{3,14}[0-9]{0,2}$/;
function split(key){const m=/^(rush|zombies)([0-9]{1,2})$/.exec(key);return m?{base:m[1],n:Number(m[2])}:{base:key,n:0};}
// Finns nyckeln? (rush1–12, zombies1–99 och de fasta)
export function isKnownKey(key){
  if(typeof key!=='string'||!KEY_RE.test(key))return false;
  const {base,n}=split(key);
  if(base==='rush'&&n)return n>=1&&n<=RUSH_COUNT;
  if(base==='zombies')return n>=1&&n<=ZOMBIE_MAX;
  return FIXED_KEYS.includes(key);
}

// ?uppdrag=…&lucka=… → {key,door,known} eller null om länken inte har något uppdrag. Okända eller trasiga nycklar ger known:false (spelet visar startvyn och säger det).
export function parseLink(search){
  let p;try{p=new URLSearchParams(search||'');}catch{return null;}
  if(!p.has(LINK_PARAM))return null;
  const key=String(p.get(LINK_PARAM)||'').toLowerCase().trim();
  const raw=p.get(DOOR_PARAM)||'',d=/^[0-9]{1,2}$/.test(raw)?Number(raw):0,door=d>=1&&d<=DOORS_MAX?d:0;
  return {key:KEY_RE.test(key)?key:'',door,known:isKnownKey(key)};
}
// Adressen för ett uppdrag (till tester och verktyg; kalendern bygger samma sträng själv utan att importera spelkod).
export function linkUrl(base,key,door=0){
  const u=new URL(base,'http://x.invalid/');u.search='';u.hash='';u.searchParams.set(LINK_PARAM,key);if(door>=1&&door<=DOORS_MAX)u.searchParams.set(DOOR_PARAM,String(door));
  return /^https?:/.test(base)?u.href:u.pathname+u.search;
}

// Vad kortet visar och vad knappen gör. save = XmasSave. Resultat:
//   {key,door,kicker,direct,startable,go,instead,title,line,note,button,gives}
//   direct   true = ingen bekräftelse, panelen öppnas direkt (rushmenyn, topplistan, Julmenyn)
//   go       {fn,arg}: vad STARTA gör. fn: intro | round | shops | sandgrund | boat | rush | marathon | zombies | rushmenu | board | continue | menu
//   startable false = något saknas (låst eller första uppdraget ej klart): knappen gör `instead` i stället och noten säger varför
//   gives    vad uppdraget ger, för kalenderns test: {stamp} | {rush:n(,stamp)} | {zombies:n} | {marathon:true}
export function describeLink(key,{save,door=0}={}){
  if(!isKnownKey(key))return null;
  const {base,n}=split(key),introDone=!!save?.introDone,has=id=>!!save?.hasStamp?.(id);
  const kicker=door?'JULKALENDERN · LUCKA '+door:'JULSPELET';
  const card=o=>({key,door,kicker,direct:false,startable:true,button:'STARTA UPPDRAGET',instead:null,note:'',gives:{},...o});
  const needIntro=o=>introDone?card(o):card({...o,startable:false,note:'Klara det första uppdraget först (lucka 1: Hjälp tomten på Stora Torget). Då öppnas julrundorna, butikerna och de andra uppdragen.',
    button:'STARTA FÖRSTA UPPDRAGET',instead:{fn:'intro',arg:null}});
  const stamped=(id,text)=>has(id)?text:'';
  if(key==='meny')return card({direct:true,go:{fn:introDone?'continue':'menu',arg:null}});
  if(key==='rush')return card({direct:true,go:{fn:'rushmenu',arg:null}});
  if(key==='topplista')return card({direct:true,go:{fn:'board',arg:null}});
  if(key==='intro')return card({go:{fn:'intro',arg:null},title:INTRO_SEARCH.title,line:INTRO_SEARCH.blurb,note:stamped('intro','Du har redan stämpeln. Du kan spela uppdraget igen.'),gives:{stamp:'intro'}});
  if(ROUND_KEYS[key]){
    const def=roundById(ROUND_KEYS[key]);
    return needIntro({go:{fn:'round',arg:def.id},title:def.title,line:def.blurb+' Hitta '+def.search.goal+' julklappar och lämna dem hos tomten.',note:stamped(def.id,'Du har redan stämpeln. Du kan spela rundan igen.'),gives:{stamp:def.id}});
  }
  if(SHOP_KEYS[key]){
    const pl=SHOP_KEYS[key];
    return needIntro({go:{fn:'shops',arg:null},title:pl.activity.title,line:pl.name+' har ett uppdrag åt tomtarna. Karlstadpasset öppnas: tryck GÅ DIT vid '+pl.name+' och gå dit. Det är en demonstration; inget samarbete är bekräftat.',
      note:stamped(pl.id,'Du har redan stämpeln. Du kan göra uppdraget igen.'),gives:{stamp:pl.id}});
  }
  if(key==='sandgrund')return needIntro({go:{fn:'sandgrund',arg:null},title:SANDGRUND.menu,line:sandgrundNote(false),note:stamped(SANDGRUND.id,'Julvernissagen är redan stämplad. Spela om den för '+SANDGRUND.points.again+' julpoäng till.'),gives:{stamp:SANDGRUND.id}});
  if(key==='batbuss')return needIntro({go:{fn:'boat',arg:null},title:BOAT.menu,line:boatNote(false),note:stamped(BOAT.id,'Julbåten är redan stämplad. Åk igen för fler julpoäng.'),gives:{stamp:BOAT.id}});
  if(key==='maraton')return card({go:{fn:'marathon',arg:null},title:'JULRUSHEN · MARATON',line:'Tempot stiger var 12:e sekund och klockan blir trängre. Tre hjärtan hela vägen. Följ pilen och den gröna strålen.',gives:{marathon:true}});
  if(base==='rush'){
    const def=rushDef(n),open=isUnlocked(save.rush,n),k=nextRush(save.rush),title='RUSH '+n+' · '+def.name;
    const line=goalText(def)+'. '+def.blurb,gives=n>=RUSH.stampLevel?{rush:n,stamp:RUSH.id}:{rush:n}; // från Rush 5 ger en klarad rush stämpeln JULRUSHEN
    return open?card({go:{fn:'rush',arg:n},title,line,note:save.rush.stars[n]?'Du har redan klarat Rush '+n+'. Slå ditt rekord!':'',gives})
      :card({go:{fn:'rush',arg:n},startable:false,title,line,note:'Rush '+n+' är låst. Klara Rush '+k+' först: den är nästa i ordningen.',button:'SPELA RUSH '+k,instead:{fn:'rush',arg:k},gives});
  }
  if(base==='zombies'){
    const lv=zombieLevel(n),open=isZombieUnlocked(save.zombies,n),k=nextZombieLevel(save.zombies);
    const line='Samla '+lv.goal+' paket ('+lv.place+') och lämna dem hos tomten. Tomtezombierna jagar dig: skjut dem med SOLSTÖT. Ett separat läge med zombier och kuslig musik.';
    return open?card({go:{fn:'zombies',arg:n},title:lv.title,line,note:save.zombies.cleared>=n?'Du har redan klarat nivå '+n+'. Slå ditt rekord!':'',gives:{zombies:n}})
      :card({go:{fn:'zombies',arg:n},startable:false,title:lv.title,line,note:'Nivå '+n+' är låst. Klara nivå '+k+' först: den är nästa i ordningen.',button:'SPELA NIVÅ '+k,instead:{fn:'zombies',arg:k},gives:{zombies:n}});
  }
  return null;
}
