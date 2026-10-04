// Enda källan för versionsnumret i spelet. Uppdateras av tools/set-version.mjs.
// 2.11.21 cache-safe reference pass: one runtime key, reference fronts + fallback side coverage.
export const GAME_VERSION='2.11.21';
export const DEBUG=(()=>{try{return new URLSearchParams(location.search).has('debug');}catch{return false;}})();
export const PERF=(()=>{try{return new URLSearchParams(location.search).has('perf');}catch{return false;}})();
