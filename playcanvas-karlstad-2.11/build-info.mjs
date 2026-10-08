// Enda källan för versionsnumret i spelet. Uppdateras av tools/set-version.mjs.
// 2.11.22 render-routing root fix: one module key everywhere, curated facades always use the Kungsgatan route.
export const GAME_VERSION='2.21.1';
export const DEBUG=(()=>{try{return new URLSearchParams(location.search).has('debug');}catch{return false;}})();
export const PERF=(()=>{try{return new URLSearchParams(location.search).has('perf');}catch{return false;}})();
// production deploy trigger: 2.11.22
