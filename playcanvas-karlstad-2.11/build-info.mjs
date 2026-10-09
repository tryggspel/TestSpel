// Enda källan för versionsnumret i spelet. Uppdateras av tools/set-version.mjs.
// 2.11.22 render-routing root fix: one module key everywhere, curated facades always use the Kungsgatan route.
export const GAME_VERSION='2.21.1-xmas.3';
// Julgrenen (release/jul-2026): ett fristående bygge av grundspelet. Basen är en känd commit på main; bygget visar både versionen
// och det deployade commit-ID:t (från /api/build-info) så att man alltid kan se exakt vilket bygge som körs.
export const GAME_FLAVOR='xmas';
export const GAME_TITLE='Julklappsjakten – 2.21-XMS';
export const GAME_BASE=Object.freeze({version:'2.21.1',commit:'fadc36ad65078401e1a751c9236c1577d1bc5de8'});
export const DEBUG=(()=>{try{return new URLSearchParams(location.search).has('debug');}catch{return false;}})();
export const PERF=(()=>{try{return new URLSearchParams(location.search).has('perf');}catch{return false;}})();
// production deploy trigger: 2.11.22
