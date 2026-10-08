// Julklappsjakten: snöfall runt kameran. Alla flingor är fyrkanter i en enda mesh (ett ritanrop, ingen fysik, inga ljus). Flingorna ligger
// i en låda runt kameran och slår runt när de lämnar den, så det snöar överallt där man går utan att fler flingor behövs. 40–100 flingor
// räcker på mobil. Av inomhus (köpcentrumet) och av med användarens val (VÄDEREFFEKTER i pausmenyn).
export const SNOW_BOX={w:24,h:13};

// Ren del (testas utan webbläsare): flingornas utgångsvärden är fasta och beror bara på numret, så snöfallet ser likadant ut varje gång.
export function flakeSeed(i,count){
  const h=n=>{const s=Math.sin((i+1)*12.9898+n*78.233)*43758.5453;return s-Math.floor(s);};
  return {x:h(1)*SNOW_BOX.w,z:h(2)*SNOW_BOX.w,y:h(3)*SNOW_BOX.h,fall:.9+h(4)*.9,drift:.25+h(5)*.45,sway:.4+h(6)*1.2,phase:h(7)*6.283,size:.075+h(8)*.075};
}
// Flingans plats i världen för tid t (s) med kameran vid (cx,cy,cz).
export function flakePosition(seed,t,cx,cy,cz,out={}){
  const W=SNOW_BOX.w,H=SNOW_BOX.h,wrap=(v,m)=>((v%m)+m)%m;
  const x=wrap(seed.x+t*seed.drift*.8+Math.sin(t*seed.sway+seed.phase)*.6-cx+W/2,W)-W/2;
  const z=wrap(seed.z+t*seed.drift*.5+Math.cos(t*seed.sway*.8+seed.phase)*.5-cz+W/2,W)-W/2;
  const y=wrap(seed.y-t*seed.fall-cy+H*.35,H)-H*.35;
  out.x=cx+x;out.y=cy+y;out.z=cz+z;return out;
}

export function createSnowfall(pc,host,{root,material,max=100}){
  const dev=host.app.graphicsDevice;
  const seeds=Array.from({length:max},(_,i)=>flakeSeed(i,max));
  const pos=new Float32Array(max*12),uv=new Float32Array(max*8),idx=new Uint16Array(max*6);
  for(let i=0;i<max;i++){
    uv.set([0,0,1,0,1,1,0,1],i*8);
    const v=i*4;idx.set([v,v+1,v+2,v,v+2,v+3],i*6);
  }
  const mesh=new pc.Mesh(dev);
  mesh.clear(true,false,max*4,max*6);
  mesh.setPositions(pos);mesh.setUvs(0,uv);mesh.setIndices(idx);mesh.update(pc.PRIMITIVE_TRIANGLES,false);
  const mi=new pc.MeshInstance(mesh,material);mi.cull=false;
  const e=new pc.Entity('Snöfall');e.addComponent('render',{meshInstances:[mi]});e.enabled=false;root.addChild(e);
  let count=0,shown=0,t=0;const tmp={x:0,y:0,z:0};
  const camera=host.camera;
  return {
    entity:e,
    setCount(n){count=Math.max(0,Math.min(max,n|0));},
    get count(){return count;},get shown(){return shown;},
    update(dt,visible=true){
      const on=visible&&count>0;
      if(!on){if(e.enabled)e.enabled=false;shown=0;return;}
      t+=dt;
      const cp=camera.getPosition(),r=camera.right,u=camera.up;
      for(let i=0;i<count;i++){
        const s=seeds[i];flakePosition(s,t,cp.x,cp.y,cp.z,tmp);
        // Flingor nära kameran krymper bort (en fling 20 cm från linsen skulle annars täcka halva bilden).
        const dx=tmp.x-cp.x,dy=tmp.y-cp.y,dz=tmp.z-cp.z,near=Math.min(1,Math.max(0,(Math.sqrt(dx*dx+dy*dy+dz*dz)-1.1)/2.4));
        const h=s.size*near,rx=r.x*h,ry=r.y*h,rz=r.z*h,ux=u.x*h,uy=u.y*h,uz=u.z*h,o=i*12;
        pos[o]=tmp.x-rx-ux;pos[o+1]=tmp.y-ry-uy;pos[o+2]=tmp.z-rz-uz;
        pos[o+3]=tmp.x+rx-ux;pos[o+4]=tmp.y+ry-uy;pos[o+5]=tmp.z+rz-uz;
        pos[o+6]=tmp.x+rx+ux;pos[o+7]=tmp.y+ry+uy;pos[o+8]=tmp.z+rz+uz;
        pos[o+9]=tmp.x-rx+ux;pos[o+10]=tmp.y-ry+uy;pos[o+11]=tmp.z-rz+uz;
      }
      // Flingor som inte visas läggs i en punkt (noll yta) i stället för att byta antal hörn.
      for(let i=count;i<shown;i++)pos.fill(0,i*12,i*12+12);
      shown=count;
      mesh.setPositions(pos);mesh.update(pc.PRIMITIVE_TRIANGLES,false);
      if(!e.enabled)e.enabled=true;
    },
    dispose(){e.destroy();mesh.destroy();}
  };
}
