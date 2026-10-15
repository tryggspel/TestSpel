// Luckan är klar: rutan som visas när man klarat ett uppdrag man kom till från Julkalendern (djuplänken ?uppdrag=…&lucka=N, xmas-deeplink.mjs).
// "Lucka 1 är avklarad. Du fick 540 julpoäng. Nästa lucka öppnas imorgon den 2/12. Under tiden kan du spela resten av Julspelet här."
// Spelet frågar kalenderns egna regler (julkalender/rules.mjs: evaluate) om luckan är klar i sparningen, så att rutan aldrig påstår något kalendern inte håller med om.
// Ren modul (ingen DOM). Importerar bara kalenderns rena moduler.
import {DOORS} from '../julkalender/doors.mjs?v=2.21.1-xmas.8';
import {GAME_SAVE_KEY,stockholmDay,doorDay,daysBetween,readGame,evaluate} from '../julkalender/rules.mjs?v=2.21.1-xmas.8';

export const DOOR_MAX=24;
const dm=day=>Number(day.slice(8,10))+'/'+Number(day.slice(5,7));   // 2026-12-02 → 2/12

// Är luckan klar enligt kalenderns villkor, med spelets sparning (save.state) som den ser ut just nu?
export function isDoorDone(door,state){
  const d=DOORS[door-1];if(!d||!state)return false;
  try{
    const game=readGame({getItem:k=>k===GAME_SAVE_KEY?JSON.stringify(state):null});
    return !!evaluate(d.check,game,{}).done;
  }catch{return false;}
}
// Hör resultatet ihop med det luckan ber om? gives = vad djuplänken startar (describeLink: {stamp}|{rush,stamp?}|{zombies}|{marathon}), res = ett resultat från spelet.
export function resultMatches(gives,res){
  if(!gives||!res||res.failed)return false;
  if(gives.stamp&&(res.stampId===gives.stamp||res.id===gives.stamp))return true;
  if(gives.rush&&res.kind==='rush'&&res.rush&&res.rush.n===gives.rush&&res.rush.cleared)return true;
  if(gives.zombies&&res.kind==='zombies'&&res.level===gives.zombies)return true;
  if(gives.marathon&&res.kind==='rush'&&!res.rush)return true;
  return false;
}
// När öppnas nästa lucka? Resultat: {n,day,date,when:'imorgon'|'senare'|'öppen'} eller null efter lucka 24.
export function nextDoor(door,today=stockholmDay(new Date())){
  if(!(door>=1&&door<DOOR_MAX))return null;
  const n=door+1,day=doorDay(n),diff=daysBetween(today,day);
  return {n,day,date:dm(day),when:diff<=0?'öppen':diff===1?'imorgon':'senare'};
}
// Innehållet i rutan. points = julpoängen uppdraget gav (0 = visa inte), today = dagens datum (Europe/Stockholm).
//   {door,title,heading,line,next,tail,stars}; null om luckan inte är klar enligt kalendern.
export function doorBox({door,state,points=0,today=stockholmDay(new Date())}){
  const d=DOORS[door-1];if(!d||!isDoorDone(door,state))return null;
  const nx=nextDoor(door,today),stars=d.stjarnor;
  const got=[points>0?points.toLocaleString('sv-SE')+' julpoäng':'',stars+(stars===1?' stjärna':' stjärnor')+' i kalendern'].filter(Boolean).join(' och ');
  const next=!nx?'Det var den sista luckan. Julen är räddad. God jul!'
    :nx.when==='öppen'?'Lucka '+nx.n+' är redan öppen: öppna kalendern för nästa uppdrag.'
    :nx.when==='imorgon'?'Nästa lucka öppnas imorgon den '+nx.date+'.'
    :'Nästa lucka öppnas den '+nx.date+'.';
  return {door,title:'LUCKA '+door+' ÄR AVKLARAD!',heading:d.titel,line:'Du fick '+got+'.',next,tail:nx&&nx.when!=='öppen'?'Under tiden kan du spela resten av Julspelet här:':'Du kan också spela resten av Julspelet här:',stars,final:!nx};
}
