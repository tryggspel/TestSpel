// Hand-built geometry interpreted from the user's June 2026 Street View panorama.
// OSM owns footprints/heights; colours and window rhythm are visual estimates.
// No Google imagery is copied into game assets.
export const KUNGSGATAN_PROFILES=Object.freeze({
  104778937:Object.freeze({address:'Kungsgatan 14',wall:'#b9b9af',frame:'#d7d7cb',kind:'ribbon'}),
  106078910:Object.freeze({address:'Kungsgatan 16',wall:'#eeeae1',frame:'#bab9aa',kind:'white'}),
  104529126:Object.freeze({address:'Kungsgatan 18',wall:'#bc8d7f',frame:'#aba99a',kind:'rose'})
});

// Use the actual slanted south polygon edge, rather than the enclosing rectangle.
export function kungsgatanFront(b){
  const candidates=[];
  for(let i=0;i<b.polygon.length;i++){
    const a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length];
    const dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);
    if(length>6&&Math.abs(dx)>Math.abs(dz)*4)candidates.push({a,q,length,z:(a[1]+q[1])/2});
  }
  const edge=candidates.sort((a,b)=>b.z-a.z||b.length-a.length)[0];
  if(!edge)return null;
  const [a,q]=edge.a[0]<edge.q[0]?[edge.a,edge.q]:[edge.q,edge.a];
  const tx=(q[0]-a[0])/edge.length,tz=(q[1]-a[1])/edge.length;
  return {a,q,length:edge.length,tx,tz,nx:-tz,nz:tx};
}

export function addKungsgatanFacade(mesh,b){
  const p=KUNGSGATAN_PROFILES[b.osm],edge=kungsgatanFront(b);if(!p||!edge)return false;
  const {a,length,tx,tz,nx,nz}=edge;
  const point=(u,y,out)=>[a[0]+tx*u+nx*out,y,a[1]+tz*u+nz*out];
  const panel=(u,y,w,h,colour,out=.10)=>mesh.quad(point(u,y,out),point(u+w,y,out),point(u+w,y+h,out),point(u,y+h,out),colour);
  // Small offsets separate wall, frames and glass without adding per-window entities.
  panel(0,.05,length,b.h-.05,p.wall,.07);
  panel(0,.05,length,.45,'#7d8078',.11);
  panel(0,3.15,length,.20,p.frame,.12);
  panel(0,b.h-.35,length,.35,'#454b49',.12);
  const groundCount=Math.max(4,Math.round(length/3.3)),gw=length/groundCount;
  for(let col=0;col<groundCount;col++){
    const u=col*gw+.16;panel(u,.55,gw-.32,2.5,'#2f4144',.13);
    panel(u+.10,.70,gw-.52,2.16,col%3?'#658285':'#41595d',.15);
    panel(u+.17,2.62,gw-.66,.12,'#a4b8af',.16);
  }
  const floors=Math.max(1,Math.round(b.h/3.2)-1),rh=(b.h-3.7)/floors;
  const count=Math.max(5,Math.round(length/(p.kind==='ribbon'?2.3:2.6))),cw=length/count;
  for(let row=0;row<floors;row++){
    const y=3.75+row*rh,wh=Math.min(1.85,rh-.58);
    if(p.kind==='ribbon'){
      panel(.20,y-.13,length-.4,wh+.34,'#8a8e86',.12);
      panel(.20,y+wh+.11,length-.4,.20,'#d0d0c3',.14);
    }else if(p.kind==='white'&&row>0)panel(.2,y+wh+.1,length-.4,.12,'#a95e51',.14);
    for(let col=0;col<count;col++){
      const u=col*cw+.22,ww=cw-.44;
      panel(u-.08,y-.08,ww+.16,wh+.16,p.frame,.15);
      panel(u,y,ww,wh,'#344e51',.17);
      panel(u+.06,y+.08,ww*.48,wh-.16,'#718f8c',.18);
      panel(u+ww*.68,y+.08,ww*.22,wh-.16,'#a5b5a4',.19);
      if(row===0&&(p.kind==='ribbon'||col%4!==0))panel(u,y+wh*.19,ww,wh*.81,'#858b8e',.20);
      if(p.kind==='ribbon')panel(u+ww*.48,y,.065,wh,p.frame,.21);
      panel(u-.12,y-.13,ww+.24,.10,p.frame,.22);
    }
  }
  return true;
}

// Replacement for the existing two seating areas, in the same square batch.
// Keep them off Kungsgatan's road axis and leave the middle crossing open.
export function addKungsgatanTerraces(mesh){
  for(const [cx,cz] of [[-24,-40],[18,-40]]){
    const ink='#303b3a',glass='#7e9999';
    mesh.box(cx,.07,cz,13,.12,5.2,'#bcb6a3');
    for(const dx of [-6.3,0,6.3])for(const dz of [-2.4,2.4])mesh.box(cx+dx,1.5,cz+dz,.12,3,.12,ink);
    for(const dz of [-2.4,2.4]){
      mesh.box(cx,2.96,cz+dz,12.8,.14,.16,ink);
      mesh.box(cx,.76,cz+dz,12.6,.12,.12,ink);
      mesh.box(cx,1.65,cz+dz,12.6,.055,.12,ink);
      // Low glass wind screens; opening at the east end gives a readable entrance.
      mesh.box(cx,1.17,cz+dz,12.4,.82,.045,glass);
      for(let dx=-5.2;dx<=5.2;dx+=2.6)mesh.box(cx+dx,1.2,cz+dz,.055,1.05,.1,ink);
    }
    mesh.box(cx-6.3,1.17,cz,.045,.82,4.7,glass);
    // Shallow glazed canopy, divided into visible panes.
    for(let dx=-5.2;dx<=5.2;dx+=2.6){
      mesh.box(cx+dx,3.03,cz,2.5,.055,5.0,'#879b92');
      mesh.box(cx+dx,3.10,cz,.07,.12,5.15,ink);
    }
    mesh.box(cx,3.12,cz,13,.12,.14,ink);
    for(const dx of [-4.3,0,4.3]){
      mesh.box(cx+dx,.77,cz,1.65,.10,.85,'#a48c6c');
      mesh.box(cx+dx,.39,cz,.10,.72,.10,ink);
      for(const dz of [-.85,.85]){
        mesh.box(cx+dx,.44,cz+dz,.64,.09,.57,ink);
        mesh.box(cx+dx,.74,cz+dz*1.23,.64,.56,.07,ink);
      }
    }
  }
}
