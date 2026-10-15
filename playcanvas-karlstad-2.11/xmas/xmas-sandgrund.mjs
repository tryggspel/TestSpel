// Sandgrund: JULVERNISSAGEN. Grundspelets uppdrag "Vernissage från graven" (Zombie-Lerin jagar besökarna utanför Sandgrund) som ett uppdrag i Julmenyn.
// Spelreglerna är grundspelets (CityMission 'sandgrund' i city-missions.mjs, startas och avslutas i last-round.js); här finns bara det julen lägger till:
// julstämpeln, julpoängen och texterna. Ren modul (ingen DOM, ingen PlayCanvas).
export const SANDGRUND=Object.freeze({
  id:'sandgrund',                    // uppdragets id i grundspelet (MISSIONS) och julstämpelns id (STAMPS)
  title:'JULVERNISSAGEN',
  place:'Sandgrund',
  menu:'SANDGRUND: JULVERNISSAGEN',
  blurb:'Zombie-Lerin har öppnat en julvernissage på Sandgrund och besökarna står kvar ute i snön. Hämta dem, stå emot tomtezombierna och stoppa honom med solstötar när hans färgsköld släpper. Tar några minuter.',
  points:Object.freeze({first:200,again:40})   // julpoäng: första gången stämpeln delas ut, och för varje klarad omgång därefter
});
// Vad som hänt när uppdraget är slut. r = {won,practice,score,rescued,seconds}.
export function sandgrundOutcome(r,{hadStamp=false}={}){
  const won=!!r&&!!r.won&&!r.practice;
  if(!won)return {count:false,stamp:false,points:0};
  return {count:true,stamp:!hadStamp,points:hadStamp?SANDGRUND.points.again:SANDGRUND.points.first};
}
// Raden på resultatkortet.
export function sandgrundLine(o,{label=''}={}){
  if(!o.count)return '';
  return o.stamp?'JULSTÄMPEL: '+label+' · +'+o.points+' JULPOÄNG':'Redan stämplad · +'+o.points+' julpoäng';
}
// Raden under knappen i Julmenyn.
export const sandgrundNote=stamped=>stamped?'Julvernissagen är stämplad. Spela om den för några julpoäng till.':SANDGRUND.blurb;
