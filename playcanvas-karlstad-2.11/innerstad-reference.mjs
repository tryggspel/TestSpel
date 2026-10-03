// Hand-built central Karlstad facade geometry.
// OSM owns footprints/heights. Reference photos and Street View/panorama reviews only
// inform colours, window rhythm and street-level character; no source imagery is shipped.
const DIR=Object.freeze({north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]});
const YAW=Object.freeze({north:180,south:0,east:90,west:-90});

export const INNERSTAD_PROFILES=Object.freeze({
  104396327:Object.freeze({address:'Drottninggatan 19',front:'north',wall:'#c89a52',frame:'#d8bd89',glass:'#465f66',ground:'#383837',accent:'#7b4d36',kind:'yellowbrick'}),
  108352774:Object.freeze({address:'Västra Torggatan 5',front:'east',wall:'#a96549',frame:'#cdbca1',glass:'#506d70',ground:'#585149',accent:'#2f6a54',kind:'brickawning'}),
  105746401:Object.freeze({address:'Västra Torggatan 11',front:'east',wall:'#a64e3e',frame:'#e1d5c5',glass:'#536e72',ground:'#69685f',accent:'#2e5573',kind:'redclassic'}),
  101170479:Object.freeze({address:'Kungsgatan 12',front:'south',wall:'#cec7b9',frame:'#eee8dc',glass:'#4f676d',ground:'#4a4742',accent:'#788e94',kind:'midcentury'}),
  102590980:Object.freeze({address:'Kungsgatan 20',front:'south',wall:'#c7784e',frame:'#d7ae8f',glass:'#556d73',ground:'#9a8c7e',accent:'#31577d',kind:'orangebalcony'})
});
export const INNERSTAD_REFERENCE_IDS=new Set(Object.keys(INNERSTAD_PROFILES).map(Number));
export const referenceFaceYaw=osm=>YAW[INNERSTAD_PROFILES[osm]?.front]??null;

export function referenceFront(b){
  const p=INNERSTAD_PROFILES[b.osm];if(!p)return null;
  const desired=DIR[p.front],candidates=[];
  for(let i=0;i<b.polygon.length;i++){
    let a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);
    if(length<5.5)continue;
    let tx=dx/length,tz=dz/length,nx=-tz,nz=tx;
    // Facade edges run mostly across the wanted normal, not along it.
    if(Math.abs(tx*desired[0]+tz*desired[1])>.62)continue;
    if(nx*desired[0]+nz*desired[1]<0){[a,q]=[q,a];tx=-tx;tz=-tz;nx=-nx;nz=-nz;}
    const mx=(a[0]+q[0])/2,mz=(a[1]+q[1])/2;
    candidates.push({a,q,length,tx,tz,nx,nz,side:mx*desired[0]+mz*desired[1]});
  }
  return candidates.sort((a,b)=>b.side-a.side||b.length-a.length)[0]||null;
}

export function addInnerstadFacade(mesh,b){
  const p=INNERSTAD_PROFILES[b.osm],edge=referenceFront(b);if(!p||!edge)return false;
  const {a,length,tx,tz,nx,nz}=edge;
  const point=(u,y,out)=>[a[0]+tx*u+nx*out,y,a[1]+tz*u+nz*out];
  const panel=(u,y,w,h,colour,out=.10)=>mesh.quad(point(u,y,out),point(u+w,y,out),point(u+w,y+h,out),point(u,y+h,out),colour);
  const floors=Math.max(1,Math.round(b.h/3.2)-1),upperY=3.65,rowH=(b.h-upperY-.28)/floors;

  panel(0,.04,length,b.h-.04,p.wall,.07);
  panel(0,.04,length,.48,p.ground,.11);
  panel(0,3.18,length,.18,p.frame,.12);
  panel(0,b.h-.34,length,.30,p.frame,.12);

  // Street-level glazing: large, repeated bays but still part of one static mesh.
  const groundCount=Math.max(3,Math.round(length/3.4)),gw=length/groundCount;
  for(let col=0;col<groundCount;col++){
    const u=col*gw+.14,w=Math.max(.5,gw-.28);
    panel(u,.58,w,2.42,p.ground,.13);panel(u+.10,.70,Math.max(.3,w-.20),2.05,p.glass,.16);
    panel(u+.15,2.57,Math.max(.2,w-.30),.11,p.frame,.18);
  }

  const windowGap=p.kind==='midcentury'?.44:.34;
  const count=Math.max(4,Math.round(length/(p.kind==='midcentury'?3.2:2.65))),cw=length/count;
  for(let row=0;row<floors;row++){
    const y=upperY+row*rowH+.18,wh=Math.max(.8,Math.min(1.78,rowH-.55));
    for(let col=0;col<count;col++){
      const u=col*cw+windowGap,ww=Math.max(.45,cw-windowGap*2);
      if(p.kind==='yellowbrick')panel(u-.08,y-.09,ww+.16,wh+.18,'#b88649',.13);
      else if(p.kind==='redclassic')panel(u-.11,y-.12,ww+.22,wh+.24,p.frame,.14);
      else if(p.kind==='midcentury')panel(u-.08,y-.09,ww+.16,wh+.18,'#b8b3a8',.13);
      else panel(u-.07,y-.08,ww+.14,wh+.16,p.frame,.13);
      panel(u,y,ww,wh,p.glass,.17);
      panel(u+.06,y+.08,ww*.44,Math.max(.3,wh-.16),'#789095',.18);
      if(p.kind==='redclassic'){panel(u-.12,y+wh+.12,ww+.24,.10,p.frame,.17);panel(u-.12,y-.18,.09,wh+.36,p.frame,.17);}
    }
  }

  if(p.kind==='brickawning'){
    // Green shop awning from the photographed pedestrian-street frontage.
    panel(.35,2.78,length-.7,.36,p.accent,.38);
    for(let u=.7;u<length-.5;u+=2.0)panel(u,2.72,.08,.58,'#33473e',.40);
  }else if(p.kind==='yellowbrick'){
    // Läkarhuset reads through warm brick, dark retail band and regular square windows.
    panel(.28,2.87,length-.56,.28,'#4a3d35',.32);
    for(let y=4.0;y<b.h-.6;y+=3.15)panel(.12,y,length-.24,.055,'#b68446',.11);
  }else if(p.kind==='midcentury'){
    // Kungsgatan 12: broad pale bays and darker vertical joints.
    for(let u=0;u<length;u+=Math.max(4.8,length/6))panel(u,3.35,.14,b.h-3.7,'#89877f',.19);
  }else if(p.kind==='orangebalcony'){
    // Kungsgatan 20: stacked blue balcony identity, flattened into bounded facade geometry.
    const bw=Math.min(6.2,length*.30),u=(length-bw)/2;
    for(let row=0;row<floors;row++){
      const y=upperY+row*rowH+.16;
      panel(u-.30,y-.15,bw+.60,.16,'#ad9b86',.28);
      panel(u,y+.02,bw,1.12,p.accent,.36);
      for(let x=u+.45;x<u+bw-.2;x+=1.0)panel(x,y+.06,.055,1.02,'#203e5b',.39);
    }
  }
  return true;
}
