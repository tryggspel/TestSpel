// Enda källan för versionsnumret i spelet. Uppdateras av tools/set-version.mjs.
export const GAME_VERSION='2.11.18';
export const DEBUG=(()=>{try{return new URLSearchParams(location.search).has('debug');}catch{return false;}})();
export const PERF=(()=>{try{return new URLSearchParams(location.search).has('perf');}catch{return false;}})();
