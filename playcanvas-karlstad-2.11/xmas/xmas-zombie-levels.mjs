// Tomtezombies: nivåerna. Ren modul (ingen DOM, ingen PlayCanvas).
//
// Förut fanns bara en tomtejakt: spiralen runt granen med tjugo paket, och efter den hamnade man i Julklappsjaktens meny. Nu går det att gå vidare: nivå 1 är den ursprungliga, och från nivå 2
// spelas julrundornas banor (Torget, Kungsgatan, Drottninggatan) i tur och ordning, med fler paket att samla och tomtezombier som kommer tätare och går snabbare. En nivå klaras när målet är nått
// och paketen lämnats hos tomten; nästa nivå låses då upp (i ordning, högst nivå 99). Hjärtan och energi är grundspelets egna, och zombieklasserna rörs inte: farten sätts när en zombie skapas
// och tätheten genom att nästa patrull aldrig ligger längre fram än nivåns takt (xmas-boot.js).
import {INTRO_GOAL} from './xmas-layout.mjs?v=2.21.1-xmas.6';

export const ZOMBIE_MAX=99;
// Banorna i den ordning de kommer: nivå 1 är introduktionens spiral, därefter julrundornas banor om och om igen.
export const ZOMBIE_LAYOUTS=Object.freeze([
  Object.freeze({id:'intro',name:'GRANEN'}),
  Object.freeze({id:'round-torget',name:'TORGET'}),
  Object.freeze({id:'round-kungsgatan',name:'KUNGSGATAN'}),
  Object.freeze({id:'round-drottninggatan',name:'DROTTNINGGATAN'})
]);
const clampLevel=n=>Math.max(1,Math.min(ZOMBIE_MAX,Math.floor(Number(n))||1));
// Paketmålet: 20 på nivå 1, två fler för varje nivå, högst 40.
export const zombieGoal=n=>Math.min(40,INTRO_GOAL+2*(clampLevel(n)-1));
// Sekunder mellan nya tomtezombier (nästa patrull ligger aldrig längre fram än så). null = grundspelets egen takt (nivå 1: 14 s i början, kortare ju längre det går).
export const zombiePatrolEvery=n=>{n=clampLevel(n);return n<2?null:Math.max(3.5,11-(n-2));};
// Fartfaktor på zombierna: 1,00 på nivå 1, +5 % för varje nivå, högst ×1,5.
export const zombieSpeed=n=>+Math.min(1.5,1+.05*(clampLevel(n)-1)).toFixed(2);

// En nivå. layout: vilken bana (se ZOMBIE_LAYOUTS), goal: paket att samla, patrolEvery och speedMul: hur hårt tomtezombierna trycker på.
export function zombieLevel(n){
  n=clampLevel(n);
  const layout=n===1?ZOMBIE_LAYOUTS[0]:ZOMBIE_LAYOUTS[1+((n-2)%(ZOMBIE_LAYOUTS.length-1))];
  return Object.freeze({n,layout:layout.id,place:layout.name,title:'TOMTEZOMBIES · NIVÅ '+n,goal:zombieGoal(n),patrolEvery:zombiePatrolEvery(n),speedMul:zombieSpeed(n),
    id:n===1?'zombies':'zombies-'+n,next:n<ZOMBIE_MAX?n+1:0});
}
// Nästa nivå att spela: den efter den högsta klarade (sparningen: {cleared}).
export const nextZombieLevel=progress=>Math.min(ZOMBIE_MAX,Math.max(0,Math.floor(Number(progress?.cleared)||0))+1);
export const isZombieUnlocked=(progress,n)=>Number.isInteger(n)&&n>=1&&n<=nextZombieLevel(progress);
