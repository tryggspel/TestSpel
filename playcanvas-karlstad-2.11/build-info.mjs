// Enda källan för versionsnumret i spelet. Uppdateras av tools/set-version.mjs.
// 2.11.19 visual-twin side-wall rescue release.
// Vercel 2.11.19 release candidate.
export const GAME_VERSION='2.11.19';
export const DEBUG=(()=>{try{return new URLSearchParams(location.search).has('debug');}catch{return false;}})();
export const PERF=(()=>{try{return new URLSearchParams(location.search).has('perf');}catch{return false;}})();
