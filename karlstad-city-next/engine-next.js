/* Karlstad City Next renderer bootstrap: WebGPU first, WebGL2 fallback, NullEngine last. */
window.KarlstadEngine={
 async create(canvas){
  if(!window.BABYLON)throw Error('Babylon.js saknas.');
  const B=BABYLON;
  if(B.WebGPUEngine&&globalThis.navigator?.gpu){
   try{
    const supported=await B.WebGPUEngine.IsSupportedAsync;
    if(supported){
     const engine=new B.WebGPUEngine(canvas);
     await engine.initAsync();
     engine.__karlstadBackend='webgpu';
     return engine;
    }
   }catch(error){console.warn('[Karlstad Next] WebGPU start failed, using WebGL2.',error);}
  }
  if(B.Engine.isSupported()){
   const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,powerPreference:'high-performance',adaptToDeviceRatio:false,disableWebGL2Support:false});
   engine.__karlstadBackend='webgl2';
   return engine;
  }
  const engine=new B.NullEngine({renderWidth:innerWidth,renderHeight:innerHeight,textureSize:512});
  engine.__karlstadBackend='software';
  return engine;
 },
 backend(engine){return engine?.__karlstadBackend||(engine instanceof BABYLON.NullEngine?'software':engine?.getClassName?.()==='WebGPUEngine'?'webgpu':'webgl2');}
};