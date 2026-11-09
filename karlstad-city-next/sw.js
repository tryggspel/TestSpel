/* Isolated Karlstad City Next offline bundle. Does not control /karlstad-city/. */
const VERSION='karlstad-next-1';
const ENGINE='https://cdn.jsdelivr.net/npm/babylonjs@9.28.0/babylon.js';
const LOADERS='https://cdn.jsdelivr.net/npm/babylonjs-loaders@9.28.0/babylonjs.loaders.min.js';
const FILES=[
 './','index.html','manifest.webmanifest','engine-next.js?v=1','asset-pipeline.js?v=1','next-assets.js?v=1','district-next.js?v=1','cinematic-next.js?v=1',
 '../karlstad-city/config.js','../karlstad-city/map-leaflet.css','../karlstad-city/cinematic.css?v=18','../karlstad-city/zombie.css?v=18',
 '../karlstad-city/audio.js?v=18','../karlstad-city/soft-renderer.js?v=18','../karlstad-city/characters.js?v=18','../karlstad-city/landmarks.js?v=18',
 '../karlstad-city/controls.js?v=18','../karlstad-city/action.js?v=18','../karlstad-city/city-data.js?v=18','../karlstad-city/world.js?v=18',
 '../karlstad-city/zombie.js?v=18','../karlstad-city/progression.js?v=18','../karlstad-city/app.js?v=18','../karlstad-city/assets/karlstad-materials.webp',
 '../karlstad-city/assets/icon-192.png','../karlstad-city/assets/icon-512.png'
];
const URLS=FILES.map(p=>new URL(p,self.registration.scope).href).concat(ENGINE,LOADERS);
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(VERSION);await cache.addAll(URLS.map(url=>new Request(url,{cache:'reload',mode:'cors'})));})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('karlstad-next-')&&name!==VERSION)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data==='activate')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url),home=new URL('./',self.registration.scope);
 if(event.request.mode==='navigate'&&url.origin===home.origin&&(url.pathname===home.pathname||url.pathname===home.pathname+'index.html')){
  event.respondWith(caches.open(VERSION).then(async cache=>(await cache.match(new URL('index.html',home).href))||fetch(event.request)));return;
 }
 if(URLS.includes(url.href))event.respondWith(caches.open(VERSION).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});