/* Optional high-fidelity asset layer for Karlstad City Next.
   Static Gaussian splats render the photographed environment; GLB/GLTF remains the interactive layer. */
window.KarlstadAssetPipeline={
 async loadManifest(scene,manifest={}){
  const result={splats:[],models:[],errors:[]};
  const applyTransform=(node,a={})=>{
   const p=a.position||[0,0,0],r=a.rotation||[0,0,0],s=a.scaling||[1,1,1];
   node.position?.set?.(...p);node.rotation?.set?.(...r);node.scaling?.set?.(...s);
  };
  for(const a of manifest.splats||[]){
   if(a.enabled===false||!a.url)continue;
   try{
    if(!BABYLON.GaussianSplattingMesh)throw Error('Gaussian Splatting stöds inte av denna Babylon-build.');
    const mesh=new BABYLON.GaussianSplattingMesh(a.name||'Karlstad scan',null,scene,false);
    await mesh.loadFileAsync(a.url,scene);
    mesh.isPickable=false;applyTransform(mesh,a);result.splats.push(mesh);
   }catch(error){console.warn('[Karlstad Next] Splat failed',a,error);result.errors.push({type:'splat',asset:a,error:String(error)});}
  }
  for(const a of manifest.models||[]){
   if(a.enabled===false||(!a.url&&!a.file))continue;
   try{
    const imported=await BABYLON.SceneLoader.ImportMeshAsync(null,a.rootUrl||'',a.file||a.url,scene);
    const root=imported.meshes?.[0];if(root)applyTransform(root,a);
    for(const mesh of imported.meshes||[]){mesh.receiveShadows=a.receiveShadows!==false;if(a.pickable===false)mesh.isPickable=false;}
    result.models.push(imported);
   }catch(error){console.warn('[Karlstad Next] Model failed',a,error);result.errors.push({type:'model',asset:a,error:String(error)});}
  }
  window.KarlstadNextAssets=result;
  return result;
 },
 capabilities(){
  return {webgpu:!!navigator.gpu,gaussianSplats:!!window.BABYLON?.GaussianSplattingMesh,gltf:!!window.BABYLON?.SceneLoader};
 }
};