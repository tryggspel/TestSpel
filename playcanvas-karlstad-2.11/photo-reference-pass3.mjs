// Curated Karlstad facade pass built from real address-level exterior references.
// OSM owns footprint/collision. Photos only inform colour, window rhythm, balconies,
// roof/cornice character and street-level identity; no source imagery is bundled.

const DIR=Object.freeze({north:[0,-1],south:[0,1],east:[1,0],west:[-1,0]});
const YAW=Object.freeze({north:180,south:0,east:90,west:-90});

export const PHOTO_REFERENCE_PROFILES=Object.freeze({
  80868525:Object.freeze({
    address:'Karlbergsgatan 3',name:'Home Hotel Bilan',front:'north',kind:'bilan',
    wall:'#eee9dd',frame:'#f8f4e9',glass:'#6f8588',ground:'#d8d1c3',accent:'#2b3132',
    source:'Strawberry / current exterior photo'
  }),
  113214352:Object.freeze({
    address:'Karlbergsgatan 4',front:'south',kind:'karlberg4',
    wall:'#b99762',frame:'#d7c39c',glass:'#596e70',ground:'#3c3b37',accent:'#1f2424',
    source:'SkandiaMäklarna / current exterior photo'
  }),
  106078949:Object.freeze({
    address:'Södra Kyrkogatan 7',front:'east',kind:'sodra7',
    wall:'#e8e2d4',frame:'#d8c39a',glass:'#687e80',ground:'#8d8068',accent:'#b89a5f',
    source:'Karlstad Studentbostäder / current exterior photo'
  }),
  105746439:Object.freeze({
    address:'Södra Kyrkogatan 10',front:'west',kind:'sodra10',
    wall:'#e9e7df',frame:'#f7f4eb',glass:'#657a7b',ground:'#aaa599',accent:'#343a3b',
    source:'Objektvision / current exterior photo'
  })
});

export const PHOTO_REFERENCE_IDS=new Set(Object.keys(PHOTO_REFERENCE_PROFILES).map(Number));
export const photoReferenceFaceYaw=osm=>YAW[PHOTO_REFERENCE_PROFILES[osm]?.front]??null;

export function photoReferenceFront(b){
  const p=PHOTO_REFERENCE_PROFILES[b.osm];if(!p||!Array.isArray(b.polygon)||b.polygon.length<3)return null;
  const desired=DIR[p.front],candidates=[];
  for(let i=0;i<b.polygon.length;i++){
    let a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);
    if(length<4.5)continue;
    let tx=dx/length,tz=dz/length,nx=-tz,nz=tx;
    if(Math.abs(tx*desired[0]+tz*desired[1])>.70)continue;
    if(nx*desired[0]+nz*desired[1]<0){[a,q]=[q,a];tx=-tx;tz=-tz;nx=-nx;nz=-nz;}
    const mx=(a[0]+q[0])/2,mz=(a[1]+q[1])/2;
    candidates.push({a,q,length,tx,tz,nx,nz,side:mx*desired[0]+mz*desired[1]});
  }
  return candidates.sort((a,b)=>b.side-a.side||b.length-a.length)[0]||null;
}

export function addPhotoReferenceFacade(mesh,b){
  const p=PHOTO_REFERENCE_PROFILES[b.osm],e=photoReferenceFront(b);if(!p||!e)return false;
  const {a,length,tx,tz,nx,nz}=e,h=Math.max(4.0,b.h);
  const point=(u,y,out)=>[a[0]+tx*u+nx*out,y,a[1]+tz*u+nz*out];
  const panel=(u,y,w,ph,colour,out=.11)=>{if(w<=.08||ph<=.08)return;mesh.quad(point(u,y,out),point(u+w,y,out),point(u+w,y+ph,out),point(u,y+ph,out),colour);};

  panel(0,.04,length,h-.04,p.wall,.07);

  if(p.kind==='bilan'){
    // Symmetrical pale prison/hotel facade: dark metal cornice, small arched upper
    // windows, central gable emphasis and the real HOME HOTEL BILAN wordmark zone.
    panel(0,.08,length,.50,'#b9b0a0',.12);
    panel(.05,h-.44,length-.10,.34,'#33383a',.16);
    const cols=Math.max(6,Math.min(12,Math.round(length/3.25))),cw=length/cols;
    const floors=Math.max(2,Math.min(4,Math.round((h-3.2)/2.7)));
    for(let row=0;row<floors;row++){
      const y=1.35+row*2.55,wh=row===floors-1?.88:1.15;
      for(let col=0;col<cols;col++){
        if(row===0&&col===Math.floor(cols/2))continue;
        const u=col*cw+.38,ww=Math.max(.46,cw-.76);
        panel(u-.10,y-.10,ww+.20,wh+.20,p.frame,.18);
        panel(u,y,ww,wh,p.glass,.21);
        panel(u+ww*.47,y+.04,.055,Math.max(.35,wh-.08),'#d9e1dc',.23);
        if(row===floors-1)panel(u-.04,y+wh-.10,ww+.08,.13,p.frame,.24);
      }
    }
    const signW=Math.min(length*.46,8.8),su=(length-signW)/2;
    panel(su,3.95,signW,.42,'#f1eee5',.28);
    // dark strokes stand in for the photographed HOME HOTEL BILAN lettering.
    for(let x=su+.38;x<su+signW-.35;x+=.38)panel(x,4.05,.12,.22,'#202526',.31);
    const pedW=Math.min(5.4,length*.26),pu=(length-pedW)/2;
    panel(pu,h-.22,pedW,.66,p.frame,.20);
    panel(pu+pedW*.12,h+.34,pedW*.76,.38,p.frame,.20);
  }else if(p.kind==='karlberg4'){
    // Warm yellow-brown brick apartment with dark projecting balconies and a
    // sheltered cafe/entrance zone at street level.
    panel(0,.05,length,.48,'#8f7754',.12);
    const cols=Math.max(4,Math.min(8,Math.round(length/3.0))),cw=length/cols;
    const floors=Math.max(2,Math.min(4,Math.round(h/3.0)-1));
    for(let row=0;row<floors;row++){
      const y=3.55+row*2.75;
      for(let col=0;col<cols;col++){
        const u=col*cw+.32,ww=Math.max(.48,cw-.64);
        panel(u-.07,y-.08,ww+.14,1.42,p.frame,.16);
        panel(u,y,ww,1.26,p.glass,.19);
        if((col+row)%3===1){
          panel(u-.20,y-.28,ww+.40,.12,p.accent,.31);
          for(let x=u-.10;x<u+ww+.10;x+=.36)panel(x,y-.24,.035,.72,p.accent,.33);
        }
      }
    }
    const bays=Math.max(3,Math.min(6,Math.round(length/3.5))),bw=length/bays;
    for(let i=0;i<bays;i++){
      const u=i*bw+.14,w=Math.max(.45,bw-.28);
      panel(u,.58,w,2.28,p.ground,.20);panel(u+.10,.70,Math.max(.25,w-.20),1.96,p.glass,.23);
    }
    panel(.22,2.62,Math.max(.4,length*.52),.26,'#171b1c',.36);
  }else if(p.kind==='sodra7'){
    // Quiet pale residential block with ochre bands, simple timber-coloured
    // window surrounds and a recessed ground entrance.
    panel(0,.05,length,.58,'#77756d',.12);
    panel(0,.63,length,.54,p.accent,.13);
    const cols=Math.max(3,Math.min(6,Math.round(length/3.2))),cw=length/cols;
    const floors=Math.max(2,Math.min(4,Math.round(h/3.1)-1));
    for(let row=0;row<floors;row++){
      const y=3.25+row*2.7;
      for(let col=0;col<cols;col++){
        const u=col*cw+.42,ww=Math.max(.45,cw-.84);
        panel(u-.08,y-.08,ww+.16,1.36,p.frame,.16);panel(u,y,ww,1.20,p.glass,.19);
      }
      panel(.14,y+1.48,length-.28,.07,'#d6c9ae',.14);
    }
    const doorW=Math.min(1.8,length*.16),du=Math.max(.35,length*.22);
    panel(du-.12,.60,doorW+.24,2.28,p.frame,.22);panel(du,.70,doorW,2.08,'#42504f',.25);
  }else if(p.kind==='sodra10'){
    // Low 1860s white office: small regular windows, dark metal roof/cornice and
    // restrained entrance rather than generic shop glazing.
    panel(0,.05,length,.44,'#9e9b91',.12);
    const cols=Math.max(4,Math.min(10,Math.round(length/3.25))),cw=length/cols;
    for(let col=0;col<cols;col++){
      const u=col*cw+.46,ww=Math.max(.42,cw-.92);
      if(col===Math.floor(cols*.72))continue;
      panel(u-.09,1.12,ww+.18,1.42,p.frame,.17);panel(u,1.20,ww,1.26,p.glass,.20);
      panel(u+ww*.47,1.24,.05,1.16,'#d9dfda',.22);
    }
    const du=Math.max(.4,length*.70),dw=Math.min(1.7,length*.12);
    panel(du-.12,.46,dw+.24,2.42,p.frame,.24);panel(du,.58,dw,2.20,'#3c4747',.27);
    panel(.06,3.10,length-.12,.25,p.accent,.26);
    panel(.12,3.42,length-.24,.18,'#262d2f',.29);
  }
  return true;
}
