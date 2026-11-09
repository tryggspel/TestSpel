/* Original architectural detail and texture work for the web pilot.
   No surveyed interiors or reproductions of artworks are included. */
window.KarlstadDistrict=async function(h){
 'use strict';
 const {B,scene,M,box,cylinder,plane,sign,pbr,rectCollider,software}=h;
 const V=B.Vector3,lights=[];
 // A single material sheet is decoded into four GPU textures, once at load.
 // Procedural textures remain available if the image cannot be decoded.
 let materialsReady=false;
 if(typeof Image!=='undefined'){
  try{
   const image=await new Promise((resolve,reject)=>{const i=new Image(),timer=setTimeout(()=>reject(Error('material timeout')),8000);i.onload=()=>{clearTimeout(timer);resolve(i)};i.onerror=()=>{clearTimeout(timer);reject(Error('material unavailable'))};i.src='../karlstad-city/assets/karlstad-materials.webp';});
   const names=['ochre limewash','clay brick','granite slabs','patinated roof'],textures=names.map((name,index)=>{
    const t=new B.DynamicTexture(name,{width:512,height:512},scene,true),c=t.getContext(),w=image.width/2,hh=image.height/2;
    c.drawImage(image,index%2*w,Math.floor(index/2)*hh,w,hh,0,0,512,512);t.update(false);t.wrapU=t.wrapV=B.Texture.WRAP_ADDRESSMODE;t.anisotropicFilteringLevel=8;return t;
   });
   const assignments=[[M.red,textures[1],2.7],[M.paving,textures[2],3.2],[M.roof,textures[3],3.8],[scene.getMaterialByName('Cyrillushuset ochre limewash'),textures[0],3.2],[scene.getMaterialByName('verdigris copper'),textures[3],4]];
   for(const [mat,texture,meters]of assignments){if(!mat)continue;mat.albedoTexture=texture;mat.albedoColor=B.Color3.White();mat.metadata={...(mat.metadata||{}),textureMeters:meters};if(mat.bumpTexture)mat.bumpTexture=null;}
   // Low amplitude height response; colour variation is not a measured height map.
   if(!software)for(const [mat,texture]of assignments){if(!mat)continue;const n=h.relief(texture,mat===M.paving?.6:.35);n.level=.55;mat.bumpTexture=n;}
   materialsReady=true;
  }catch(e){console.warn('Using procedural material fallback:',e.message);}
 }
 const stone=pbr('gallery terrazzo','#bbbcb5',.56),wall=pbr('gallery chalk','#dddcca',.95),oak=pbr('gallery oak','#705843',.8);
 const warm=new B.StandardMaterial('gallery light strips',scene);warm.diffuseColor=new B.Color3(.93,.86,.64);warm.emissiveColor=new B.Color3(1,.85,.56);warm.disableLighting=true;
 // A real walkable volume behind Sandgrund's street facade. The floor plan is
 // designed for gameplay, with a broad accessible entrance and two exhibition bays.
 box(stone,25,.07,116,25.4,.14,18.5);box(wall,25,5.85,116,25.6,.22,18.7);
 box(wall,18.6,2.7,114.4,.25,5.4,6.7);rectCollider(18.6,114.4,.25,6.7);
 box(wall,31.9,2.7,119.9,8.6,5.4,.25);rectCollider(31.9,119.9,8.6,.25);
 for(const x of [16,25,34]){box(M.metal,x,5.61,116,.09,.1,15);for(const z of [110,115,120]){box(warm,x,5.53,z,1.45,.055,.2);cylinder(M.metal,x,5.4,z,.19,.28,12);}}
 // Original river studies. Generated from geometry and gradients, not Lerin art.
 function art(index){const t=new B.DynamicTexture('original river study '+index,{width:768,height:512},scene,true),c=t.getContext();
  c.fillStyle='#e7e1d1';c.fillRect(0,0,768,512);const palettes=[['#929a98','#546b75','#c4b89f'],['#beaa8e','#6a7775','#8b9190'],['#9dadae','#3a5b6b','#d6c2a1']];const p=palettes[index%3];
  let g=c.createLinearGradient(0,35,0,480);g.addColorStop(0,p[2]);g.addColorStop(.45,'#cfd5cf');g.addColorStop(.47,p[0]);g.addColorStop(1,p[1]);c.fillStyle=g;c.fillRect(35,35,698,442);
  for(let j=0;j<32;j++){const y=225+j*7;c.fillStyle=j%3?'#e2dace35':'#314c5b24';c.fillRect(35+(j*97%100),y,530+(j*71%110),1+j%3);}
  c.fillStyle=p[1];for(let j=0;j<13;j++){const x=38+j*57,height=25+(j*37+index*21)%63;c.fillRect(x,215-height,43,height);c.beginPath();c.moveTo(x-3,215-height);c.lineTo(x+21,199-height);c.lineTo(x+47,215-height);c.fill();}t.update();const m=new B.StandardMaterial('original river study '+index,scene);m.diffuseTexture=t;m.emissiveColor=new B.Color3(.18,.18,.18);return m;
 }
 for(let i=0;i<3;i++){const x=16.6+i*8.4;box(oak,x,2.7,125.05,4.7,3.25,.12);plane(art(i),x,2.7,124.97,4.4,2.96);plane(sign(['ÄLVENS LJUS','REGN ÖVER TAKEN','GRYNING'][i],3,.3),x,.85,124.94,2.6,.22);}
 for(const x of [21,29]){box(oak,x,.54,117,2.8,.15,.68);for(const dx of [-1,1])box(M.metal,x+dx,.27,117,.10,.54,.50);rectCollider(x,117,2.8,.68);}
 // Recovery counter and a small sculptural centrepiece.
 box(oak,34,1,109,4.2,2,1.2);box(stone,34,2.05,109,4.5,.12,1.4);rectCollider(34,109,4.2,1.2);
 for(let i=0;i<4;i++){cylinder(M.glass,32.7+i*.45,2.23,109,.15,.3,10);cylinder(M.trim,32.7+i*.45,2.13,108.75,.24,.04,14);}
 plane(sign('SOLARKIVET · REFUG 01',8,.7,'#d7f2cb','#243d40'),25,4.9,124.95,8,.65);
 plane(sign('ÅTERHÄMTNING',4,.5),34,3.0,108.32,3.6,.4);
 cylinder(stone,15.4,.65,115,1.4,1.3,24);const sculpture=B.MeshBuilder.CreateTorusKnot('river knot',{radius:.64,tube:.12,radialSegments:64,tubularSegments:12,p:2,q:3},scene);sculpture.position.set(15.4,2,115);h.add(sculpture,M.brass);
 rectCollider(15.4,115,1.5,1.5);
 if(!software)for(const x of [18,31]){const l=new B.PointLight('gallery warm bounce',new V(x,4.7,116),scene);l.diffuse=B.Color3.FromHexString('#ffdeb0');l.range=18;l.intensity=.8;l.renderPriority=2;l.setEnabled(false);lights.push(l);}
 // Weathered quay details and street furniture, kept out of mission corridors.
 for(const z of [12,35,59,96]){box(M.metal,-39.9,.42,z,1.15,.84,.45);box(M.wood,-40,.89,z,1.2,.12,.5);for(let j=0;j<3;j++)box(M.metal,-39.37,.45+j*.18,z,.03,.035,.30);}
 for(const z of [-24,16,45,80]){box(M.metal,12.6,.055,z,1.2,.055,.44);for(let j=0;j<9;j++)box(M.black,12.07+j*.13,.086,z,.045,.007,.35);}
 for(const side of [-1,1])for(const z of [3,37,72]){const x=side*13.4;cylinder(M.stone,x,.40,z,.44,.8,14);cylinder(M.brass,x,.82,z,.39,.055,14);}
 const safe={x:25,z:114,contains:(x,z)=>x>13.2&&x<36.8&&z>107.3&&z<124.7};
 let inside=false;
 function update(camera){const on=safe.contains(camera.position.x,camera.position.z);if(on!==inside){inside=on;for(const l of lights)l.setEnabled(on);}}
 return {safe,update,get inside(){return inside},materialsReady};
};
