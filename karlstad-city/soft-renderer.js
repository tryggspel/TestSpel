/* Babylon scene fallback for browsers without WebGL. Perspective-correct textures and a depth buffer.
   This intentionally uses a lower resolution; the primary renderer remains Babylon PBR/WebGL. */
window.KarlstadSoftwareRenderer=class{
 constructor(canvas,world){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.world=world;
  this.geometry=new Map();this.materials=new Map();this.projection=new BABYLON.Matrix();
  this.surface=document.createElement('canvas');this.surfaceContext=this.surface.getContext('2d',{alpha:false});
 }
 resize(){
  const w=Math.min(innerWidth,720),h=Math.round(innerHeight*w/innerWidth);
  if(this.width===w&&this.height===h)return;
  this.width=w;this.height=h;this.canvas.width=w;this.canvas.height=h;
  this.surface.width=w;this.surface.height=h;this.pixels=this.surfaceContext.createImageData(w,h);
  this.depth=new Float32Array(w*h);this.background=new Uint8ClampedArray(w*h*4);
 }
 material(mat){
  let m=this.materials.get(mat.uniqueId);if(m&&!m.live)return m;
  const color=mat.albedoColor||mat.diffuseColor||{r:.16,g:.33,b:.36},em=mat.emissiveColor||{r:0,g:0,b:0};
  m={r:color.r,g:color.g,b:color.b,er:em.r,eg:em.g,eb:em.b,us:1,vs:1,live:mat.name==='screen'};
  const t=mat.albedoTexture||mat.diffuseTexture;
  if(t?.getContext){const c=t.getContext(),im=c.getImageData(0,0,c.canvas.width,c.canvas.height);m.image=im.data;m.tw=im.width;m.th=im.height;m.us=t.uScale||1;m.vs=t.vScale||1;}
  this.materials.set(mat.uniqueId,m);return m;
 }
 meshData(mesh){
  let d=this.geometry.get(mesh.uniqueId);if(d){if(d.colors)d.colors=mesh.getVerticesData('color');return d;}
  let positions=mesh.getVerticesData('position'),indices=mesh.getIndices(),normals=mesh.getVerticesData('normal'),uv=mesh.getVerticesData('uv');
  if(mesh.name==='Klarälven'){positions=new Float32Array([-24.5,0,-215,24.5,0,-215,24.5,0,215,-24.5,0,215]);indices=[0,2,1,0,3,2];normals=new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0]);uv=new Float32Array([0,0,1,0,1,1,0,1]);}
  if(!positions||!indices)return null;
  d={positions,indices,normals,uv,colors:mesh.getVerticesData('color'),points:new Float32Array(positions.length),world:new Float32Array(positions.length),normal:new Float32Array(positions.length),fixed:false};
  this.geometry.set(mesh.uniqueId,d);return d;
 }
 draw(time){
  this.resize();const w=this.width,h=this.height,cam=this.world.camera,pixels=this.pixels.data;
  const night=this.world.apocalypse;
  const horizon=h*.5+Math.tan(cam.rotation.x)*h*.6;
  // Atmospheric gradient. The GPU path uses the animated sky and river shaders.
  for(let y=0;y<h;y++){const sky=y<Math.max(horizon,h*.18),f=Math.min(1,y/Math.max(1,horizon));let r=sky?65+126*f:123,g=sky?143+68*f:150,b=sky?190+34*f:120;if(night){const cloud=Math.sin(y*.035+time*.12)*Math.sin(y*.078-time*.065)*4;r=sky?19+24*f+cloud:28;g=sky?33+31*f+cloud:43;b=sky?44+31*f+cloud:48;}const row=y*w*4;for(let x=0;x<w;x++){const i=row+x*4;pixels[i]=r;pixels[i+1]=g;pixels[i+2]=b;pixels[i+3]=255;}}
  this.depth.fill(0);
  BABYLON.Matrix.PerspectiveFovLHToRef(cam.fov,w/h,cam.minZ,cam.maxZ,this.projection);
  const vp=cam.getViewMatrix().multiply(this.projection).m,cp=cam.position;
  for(const mesh of this.world.scene.meshes){
   if(!mesh.isEnabled()||!mesh.isVisible||mesh.visibility===0||mesh.name==='atmosphere'||mesh.name==='lamp halo'||mesh.name==='signal aura'||mesh.name.startsWith('mote'))continue;
   const mat=mesh.material,d=this.meshData(mesh);if(!mat||!d)continue;
   const wm=mesh.computeWorldMatrix().m,world=d.world,normal=d.normal,pp=d.positions;
   if(!d.fixed){for(let i=0;i<pp.length;i+=3){const x=pp[i],y=pp[i+1],z=pp[i+2];world[i]=x*wm[0]+y*wm[4]+z*wm[8]+wm[12];world[i+1]=x*wm[1]+y*wm[5]+z*wm[9]+wm[13];world[i+2]=x*wm[2]+y*wm[6]+z*wm[10]+wm[14];if(d.normals){const nx=d.normals[i],ny=d.normals[i+1],nz=d.normals[i+2];normal[i]=nx*wm[0]+ny*wm[4]+nz*wm[8];normal[i+1]=nx*wm[1]+ny*wm[5]+nz*wm[9];normal[i+2]=nx*wm[2]+ny*wm[6]+nz*wm[10];}}d.fixed=mesh.isWorldMatrixFrozen;}
   const pts=d.points;for(let i=0;i<world.length;i+=3){const x=world[i],y=world[i+1],z=world[i+2];pts[i]=x*vp[0]+y*vp[4]+z*vp[8]+vp[12];pts[i+1]=x*vp[1]+y*vp[5]+z*vp[9]+vp[13];pts[i+2]=x*vp[3]+y*vp[7]+z*vp[11]+vp[15];}
   const m=this.material(mat),idx=d.indices,uv=d.uv,colors=d.colors;
   for(let i=0;i<idx.length;i+=3){
    const ia=idx[i]*3,ib=idx[i+1]*3,ic=idx[i+2]*3;
    if(Math.max(pts[ia+2],pts[ib+2],pts[ic+2])<.07||Math.min(pts[ia+2],pts[ib+2],pts[ic+2])>280)continue;
    let nx=normal[ia]+normal[ib]+normal[ic],ny=normal[ia+1]+normal[ib+1]+normal[ic+1],nz=normal[ia+2]+normal[ib+2]+normal[ic+2],nl=Math.hypot(nx,ny,nz)||1;nx/=nl;ny/=nl;nz/=nl;
    if(mat.backFaceCulling!==false&&nx*(cp.x-world[ia])+ny*(cp.y-world[ia+1])+nz*(cp.z-world[ia+2])<0)continue;
    if((pts[ia]<-pts[ia+2]&&pts[ib]<-pts[ib+2]&&pts[ic]<-pts[ic+2])||(pts[ia]>pts[ia+2]&&pts[ib]>pts[ib+2]&&pts[ic]>pts[ic+2])||(pts[ia+1]<-pts[ia+2]&&pts[ib+1]<-pts[ib+2]&&pts[ic+1]<-pts[ic+2])||(pts[ia+1]>pts[ia+2]&&pts[ib+1]>pts[ib+2]&&pts[ic+1]>pts[ic+2]))continue;
    const facing=Math.max(0,-nx*.65+ny*.72-nz*.4);const distance=Math.hypot(cp.x-world[ia],cp.z-world[ia+2]);const light=night?.30+facing*.34+Math.max(0,1-distance/27)*.42:.66+facing*.62;
    let polygon=[ia,ib,ic].map(j=>({x:pts[j],y:pts[j+1],z:pts[j+2],u:uv?uv[j/3*2]*m.us:0,v:uv?(1-uv[j/3*2+1])*m.vs:0}));
    if(polygon.some(v=>v.z<.07)){
     const clipped=[];for(let j=0;j<polygon.length;j++){const a=polygon[j],b=polygon[(j+1)%polygon.length],inside=a.z>=.07;if(inside)clipped.push(a);if(inside!==(b.z>=.07)){const t=(.07-a.z)/(b.z-a.z);clipped.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:.07,u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t});}}polygon=clipped;
    }
    const screen=polygon.map(v=>({x:(1+v.x/v.z)*w*.5,y:(1-v.y/v.z)*h*.5,iz:1/v.z,u:v.u/v.z,v:v.v/v.z}));
    const shade=colors?{...m,r:m.r*(colors[idx[i]*4]+colors[idx[i+1]*4]+colors[idx[i+2]*4])/3,g:m.g*(colors[idx[i]*4+1]+colors[idx[i+1]*4+1]+colors[idx[i+2]*4+1])/3,b:m.b*(colors[idx[i]*4+2]+colors[idx[i+1]*4+2]+colors[idx[i+2]*4+2])/3}:m;for(let j=1;j<screen.length-1;j++)this.triangle(screen[0],screen[j],screen[j+1],shade,light);
   }
  }
  this.surfaceContext.putImageData(this.pixels,0,0);this.ctx.drawImage(this.surface,0,0);
  const vignette=this.ctx.createRadialGradient(w*.5,h*.43,h*.15,w*.5,h*.5,h*.82);vignette.addColorStop(0,'#fff0cc02');vignette.addColorStop(1,'#06162035');this.ctx.fillStyle=vignette;this.ctx.fillRect(0,0,w,h);
 }
 triangle(a,b,c,m,light){
  const w=this.width,h=this.height,area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  if(Math.abs(area)<.15)return;
  const left=Math.max(0,Math.ceil(Math.min(a.x,b.x,c.x))),right=Math.min(w-1,Math.floor(Math.max(a.x,b.x,c.x))),top=Math.max(0,Math.ceil(Math.min(a.y,b.y,c.y))),bottom=Math.min(h-1,Math.floor(Math.max(a.y,b.y,c.y)));
  if(right<left||bottom<top)return;
  const inv=1/area,ax=(b.y-c.y)*inv,ay=(c.x-b.x)*inv,bx=(c.y-a.y)*inv,by=(a.x-c.x)*inv;
  const p=this.pixels.data,depth=this.depth,texture=m.image,tw=m.tw,th=m.th;
  const rr=(m.r*light+m.er*.5)*255,gg=(m.g*light+m.eg*.5)*255,bb=(m.b*light+m.eb*.5)*255;
  let rowA=((b.x-left)*(c.y-top)-(b.y-top)*(c.x-left))*inv,rowB=((c.x-left)*(a.y-top)-(c.y-top)*(a.x-left))*inv;
  for(let y=top;y<=bottom;y++,rowA+=ay,rowB+=by){let wa=rowA,wb=rowB,index=y*w+left;
   for(let x=left;x<=right;x++,index++,wa+=ax,wb+=bx){const wc=1-wa-wb;if(wa<-.00001||wb<-.00001||wc<-.00001)continue;const iz=wa*a.iz+wb*b.iz+wc*c.iz;if(iz<=depth[index])continue;depth[index]=iz;let r=rr,g=gg,blue=bb;
    if(texture){let u=(wa*a.u+wb*b.u+wc*c.u)/iz,v=(wa*a.v+wb*b.v+wc*c.v)/iz;const ti=((Math.floor((v-Math.floor(v))*th)%th)*tw+Math.floor((u-Math.floor(u))*tw)%tw)*4;r=r*texture[ti]/255;g=g*texture[ti+1]/255;blue=blue*texture[ti+2]/255;}
    const night=this.world.apocalypse,fog=Math.min(night?.9:.68,(night?.012:.0023)/iz),i=index*4;p[i]=r*(1-fog)+(night?32:177)*fog;p[i+1]=g*(1-fog)+(night?53:186)*fog;p[i+2]=blue*(1-fog)+(night?60:176)*fog;
   }
  }
 }
};
