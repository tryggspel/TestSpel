/* Installable web shell. Updates are offered, never applied during a round. */
(()=>{
 let prompt=null,registration=null,status='Första besöket behöver internet.';
 const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;});
 window.addEventListener('appinstalled',()=>{prompt=null;});
 window.KarlstadApp={
  get status(){return status},get standalone(){return standalone},get updateReady(){return !!registration?.waiting},
  async install(){if(!prompt)return false;const p=prompt;prompt=null;await p.prompt();await p.userChoice;return true},
  update(){if(registration?.waiting){sessionStorage.setItem('karlstad-update','yes');registration.waiting.postMessage('activate');}}
 };
 if('serviceWorker' in navigator&&location.protocol==='https:'){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('karlstad-update')==='yes'){sessionStorage.removeItem('karlstad-update');location.reload();}});
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(async reg=>{
   registration=reg;const ready=await navigator.serviceWorker.ready;
   if(ready.active)status='Spelpaketet är sparat för offline. Kartor och stadsdata behöver internet.';
   reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)status='En ny version är klar. Uppdatera mellan rundorna.';});});
  }).catch(()=>{status='Offlinepaketet kunde inte sparas. Du kan spela med internet.';});
 }
})();
