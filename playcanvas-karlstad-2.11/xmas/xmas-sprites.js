// Julklappsjakten: delade bildkort (paket, tomtar, stjärnor, sken). En enda fyrkantsmesh och ett fåtal material används av alla paket
// och alla tomtar i staden, så antalet texturer och material beror på antalet varianter, inte på antalet föremål.
import {drawPackageAtlas,PACKAGE_STYLES,PACKAGE_CELL,drawTomteAtlas,TOMTE_STYLES,TOMTE_ATLAS,TOMTE_CELL,drawStar,drawSnowflake,drawSparkle,drawGlow} from './xmas-art.js?v=2.21.1-xmas.3';

export const hash32=s=>{let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;};

export function createSprites(pc,host,{texture,root}){
  const dev=host.app.graphicsDevice;
  // Fyrkant med nederkanten i origo (som grundspelets card()), delad av alla bildkort.
  const quad=new pc.Mesh(dev);
  quad.setPositions([-.5,0,0,.5,0,0,.5,1,0,-.5,1,0]);quad.setNormals([0,0,1,0,0,1,0,0,1,0,0,1]);quad.setUvs(0,[0,0,1,0,1,1,0,1]);quad.setIndices([0,1,2,0,2,3]);quad.update(pc.PRIMITIVE_TRIANGLES);
  const spriteMaterial=(tex,{tiling=[1,1],offset=[0,0],alphaTest=.1,additive=false}={})=>{
    const m=new pc.StandardMaterial();m.useLighting=false;m.diffuse.set(0,0,0);m.emissive.set(1,1,1);m.emissiveMap=tex;m.opacityMap=tex;m.opacityMapChannel='a';
    m.emissiveMapTiling.set(tiling[0],tiling[1]);m.emissiveMapOffset.set(offset[0],offset[1]);m.opacityMapTiling.set(tiling[0],tiling[1]);m.opacityMapOffset.set(offset[0],offset[1]);
    m.blendType=additive?pc.BLEND_ADDITIVEALPHA:pc.BLEND_NORMAL;m.alphaTest=additive?0:alphaTest;m.cull=pc.CULLFACE_NONE;if(additive)m.depthWrite=false;m.update();return m;
  };
  // ── paket: åtta celler i en bild (4×2)
  const pkgTex=texture((c)=>drawPackageAtlas(c),PACKAGE_CELL*4,PACKAGE_CELL*2);
  const packageMaterials=PACKAGE_STYLES.map((_,i)=>spriteMaterial(pkgTex,{tiling:[.25,.5],offset:[(i%4)*.25,1-(Math.floor(i/4)+1)*.5]}));
  // ── tomtar: sex varianter × två bildrutor (6×2 celler)
  const tomteTex=texture((c)=>drawTomteAtlas(c),TOMTE_ATLAS.w,TOMTE_ATLAS.h);
  const tomteCols=TOMTE_ATLAS.cols,tomteRows=TOMTE_ATLAS.rows;
  const tomteMaterials=[];
  for(let v=0;v<TOMTE_STYLES.length;v++){
    const row=[];for(let f=0;f<2;f++){const col=(v%3)*2+f,r=Math.floor(v/3);row.push(spriteMaterial(tomteTex,{tiling:[1/tomteCols,1/tomteRows],offset:[col/tomteCols,1-(r+1)/tomteRows],alphaTest:.12}));}
    tomteMaterials.push(row);
  }
  const small=(drawFn,size=128)=>texture(drawFn,size,size);
  const starMat=spriteMaterial(small((c,w,h)=>drawStar(c,w,h)),{alphaTest:.02}),flakeMat=spriteMaterial(small((c,w,h)=>drawSnowflake(c,w,h),64),{alphaTest:.02}),
    sparkleMat=spriteMaterial(small((c,w,h)=>drawSparkle(c,w,h)),{additive:true}),glowGold=spriteMaterial(small((c,w,h)=>drawGlow(c,w,h,'#ffd86b')),{additive:true}),glowWarm=spriteMaterial(small((c,w,h)=>drawGlow(c,w,h,'#ffb347')),{additive:true});

  function spriteEntity(name,material,w,h,{enabled=true}={}){
    const e=new pc.Entity(name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(quad,material)]});
    e.setLocalScale(w,h,1);e.enabled=enabled;root.addChild(e);return e;
  }
  const setMaterial=(e,m)=>{const mi=e.render.meshInstances[0];if(mi.material!==m)mi.material=m;};
  const packageVariant=pkg=>pkg.kind==='bonus'?PACKAGE_STYLES.length-1:hash32(pkg.id)%(PACKAGE_STYLES.length-1);
  const yawToward=(x,z,p)=>Math.atan2(p.x-x,p.z-z)*180/Math.PI;
  return {quad,packageMaterials,tomteMaterials,starMat,flakeMat,sparkleMat,glowGold,glowWarm,spriteMaterial,spriteEntity,setMaterial,packageVariant,yawToward,
    drawCalls:()=>0,dispose(){}};
}
