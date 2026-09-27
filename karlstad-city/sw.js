/* Atomic versioned offline bundle. No tiles, live API data or analytics cached. */
const VERSION='karlstad-web-17',ENGINE='https://cdn.jsdelivr.net/npm/babylonjs@7.54.3/babylon.js';
const FILES=['./','index.html','manifest.webmanifest','config.js','map-leaflet.css','cinematic.css?v=17','zombie.css?v=17','audio.js?v=17','soft-renderer.js?v=17','characters.js?v=17','landmarks.js?v=17','controls.js?v=17','action.js?v=17','city-data.js?v=17','district.js?v=17','world.js?v=17','zombie.js?v=17','progression.js?v=17','cinematic.js?v=17','app.js?v=17','assets/karlstad-materials.webp','assets/icon-192.png','assets/icon-512.png'];
const URLS=FILES.map(p=>new URL(p,self.registration.scope).href).concat(ENGINE);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(VERSION);await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload',mode:'cors'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('karlstad-web-')&&name!==VERSION)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='activate')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),home=new URL('./',self.registration.scope);
 // A cached navigation and all versioned dependencies always come from the same bundle.
 if(event.request.mode==='navigate'&&url.origin===home.origin&&(url.pathname===home.pathname||url.pathname===home.pathname+'index.html')){
  event.respondWith(caches.open(VERSION).then(async cache=>(await cache.match(new URL('index.html',home).href))||fetch(event.request)));return;
 }
 if(URLS.includes(url.href))event.respondWith(caches.open(VERSION).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
