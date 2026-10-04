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
  }),
  110733732:Object.freeze({
    address:'Östra Kyrkogatan 4',front:'west',kind:'ostra4wood',
    wall:'#8f4038',frame:'#d9ddd4',glass:'#60787d',ground:'#76352f',accent:'#c8d2c7',
    source:'Google Street View 2024-08'
  }),
  110733736:Object.freeze({
    address:'Östra Kyrkogatan 4D',front:'west',kind:'ostra4wood',
    wall:'#8f4038',frame:'#d9ddd4',glass:'#60787d',ground:'#76352f',accent:'#c8d2c7',
    source:'Google Street View 2024-08'
  }),
  105746438:Object.freeze({
    address:'Östra Kyrkogatan 6',front:'west',kind:'ostra6brick',
    wall:'#8b604b',frame:'#e5e0d5',glass:'#62797b',ground:'#57585a',accent:'#375b6d',
    source:'Google Street View 2024-08'
  }),
  102583814:Object.freeze({
    address:'Södra Kyrkogatan 1',front:'east',kind:'sodra1arched',
    wall:'#c9b693',frame:'#e7dcc5',glass:'#617b80',ground:'#8e8476',accent:'#aa9b7f',
    source:'Google Street View 2026-07'
  }),
  101935916:Object.freeze({
    address:'Södra Kyrkogatan 3',front:'east',kind:'sodra3blindbrick',
    wall:'#bf654a',frame:'#e2d5bf',glass:'#687b7d',ground:'#a7a093',accent:'#d2b58f',
    source:'Google Street View 2026-07'
  }),
  103767833:Object.freeze({
    address:'Södra Kyrkogatan 4',front:'west',kind:'sodra4awnings',
    wall:'#984e3d',frame:'#ddd9cf',glass:'#526b6e',ground:'#8b8174',accent:'#16806a',
    source:'Google Street View 2026-07'
  }),
  103767825:Object.freeze({
    address:'Södra Kyrkogatan 6',front:'north',kind:'sodra6metal',
    wall:'#a28e71',frame:'#b9b3a6',glass:'#4c6267',ground:'#403d3b',accent:'#d2c9b7',
    source:'Google Street View 2023-04'
  }),
  103695891:Object.freeze({
    address:'Södra Kyrkogatan 11',front:'east',kind:'sodra11modern',
    wall:'#d8d8d2',frame:'#eeeeea',glass:'#65787c',ground:'#747b7b',accent:'#aeb4b2',
    source:'Google Street View 2022-06'
  }),
  107041950:Object.freeze({
    address:'Karlbergsgatan 2',front:'south',kind:'karlberg2balcony',
    wall:'#ece9df',frame:'#f7f4ed',glass:'#667b7d',ground:'#7a6857',accent:'#303536',
    source:'Google Street View 2023-04'
  }),
  105746440:Object.freeze({
    address:'Karlbergsgatan 5',front:'east',kind:'karlberg5fins',
    wall:'#8b8f8c',frame:'#c8c9c5',glass:'#344b50',ground:'#52636a',accent:'#d2d4d0',
    source:'Google Street View 2026-07'
  }),
  386222434:Object.freeze({
    address:'Karlbergsgatan 6',front:'south',kind:'karlberg6heritage',
    wall:'#e5ddc9',frame:'#efe8d8',glass:'#61777b',ground:'#c9bca2',accent:'#874f42',
    source:'Google Street View 2023-04'
  }),
  104778921:Object.freeze({
    address:'Karlbergsgatan 7',front:'north',kind:'karlberg7garages',
    wall:'#aaa089',frame:'#e7e3da',glass:'#65797b',ground:'#77776f',accent:'#b9b7ad',
    source:'Google Street View 2023-04'
  }),
  100833292:Object.freeze({
    address:'Tingvallagatan 9',name:"O'Learys / Bergqvisthuset",front:'north',kind:'ting9bergqvist',
    wall:'#a44d43',frame:'#eee1bf',glass:'#4d686d',ground:'#453c38',accent:'#176347',
    source:'Google Street View 2017-05 + Karlstad i förändring'
  }),
  100839528:Object.freeze({
    address:'Tingvallagatan 11',name:'Nygren & Åhlin-huset',front:'north',kind:'ting11merchant',
    wall:'#d4a05f',frame:'#efe4c9',glass:'#60787b',ground:'#8d7357',accent:'#5b6e58',
    source:'Karlstad i förändring / reconstructed 1867 facade'
  }),
  101430152:Object.freeze({
    address:'Tingvallagatan 13',name:'Wermlandsbanken',front:'north',kind:'wermlandsbanken',
    wall:'#7f4a3a',frame:'#b9b0a4',glass:'#425c62',ground:'#77736d',accent:'#436956',
    source:'Google Street View 2017-05 + Riksantikvarieämbetet'
  }),
  101608925:Object.freeze({
    address:'Tingvallagatan 15',name:'Frimurarelogen / Herman Anderssons bokhandel',front:'north',extraFaces:['west'],kind:'frimurarebok',
    wall:'#9c8274',frame:'#d1c2ad',glass:'#4f676c',ground:'#756a61',accent:'#e1d6bd',
    source:'Google Street View 2017-05 + Karlstad i förändring'
  }),
  77107220:Object.freeze({
    address:'Stora Torget / Kungsgatan',name:'Tingvallagymnasiet',front:'west',kind:'tingvalla-school',
    wall:'#c8ad6d',frame:'#d9c79e',glass:'#304f5b',ground:'#5f5b55',accent:'#8d7448',
    source:'Google Street View 2022-06'
  }),
  106078938:Object.freeze({
    address:'Tingvallagatan 19,21,23',front:'north',kind:'ting19shops',
    wall:'#d7d7d1',frame:'#eeeeea',glass:'#586f75',ground:'#676864',accent:'#8b8f88',
    source:'Google Street View 2017-05'
  })
});

export const PHOTO_REFERENCE_IDS=new Set(Object.keys(PHOTO_REFERENCE_PROFILES).map(Number));
export const photoReferenceFaceYaw=osm=>YAW[PHOTO_REFERENCE_PROFILES[osm]?.front]??null;
export const photoReferenceFaceYaws=osm=>{
  const p=PHOTO_REFERENCE_PROFILES[osm];if(!p)return [];
  return [p.front,...(p.extraFaces||[])].map(face=>YAW[face]).filter(Number.isFinite);
};

export function photoReferenceFront(b,faceOverride=null){
  const p=PHOTO_REFERENCE_PROFILES[b.osm];if(!p||!Array.isArray(b.polygon)||b.polygon.length<3)return null;
  const face=faceOverride||p.front,desired=DIR[face];if(!desired)return null;
  const candidates=[];
  for(let i=0;i<b.polygon.length;i++){
    let a=b.polygon[i],q=b.polygon[(i+1)%b.polygon.length],dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);
    if(length<1.0)continue;
    let tx=dx/length,tz=dz/length,nx=-tz,nz=tx;
    // Street frontage runs across the desired outward direction, not along it.
    if(Math.abs(tx*desired[0]+tz*desired[1])>.70)continue;
    if(nx*desired[0]+nz*desired[1]<0){[a,q]=[q,a];tx=-tx;tz=-tz;nx=-nx;nz=-nz;}
    const mx=(a[0]+q[0])/2,mz=(a[1]+q[1])/2,normalDot=nx*desired[0]+nz*desired[1];
    if(normalDot<.70)continue;
    candidates.push({a,q,length,tx,tz,nx,nz,side:mx*desired[0]+mz*desired[1],normalDot});
  }
  if(!candidates.length)return null;

  // OSM often splits one real facade into several almost-collinear way segments.
  // Picking the single segment closest to the street produced tiny 1–9 m "hero" strips
  // on Tingvallagatan while 25–40 m of the same building stayed generic. Merge all
  // parallel segments within ~1.5 m of the exposed facade plane into one true frontage.
  const maxSide=Math.max(...candidates.map(c=>c.side));
  const near=candidates.filter(c=>maxSide-c.side<=1.5&&c.normalDot>.92);
  const anchor=near.slice().sort((a,b)=>b.length-a.length)[0]||candidates.slice().sort((a,b)=>b.side-a.side||b.length-a.length)[0];
  const ax=anchor.tx,az=anchor.tz;
  const points=[];
  for(const c of near.length?near:[anchor]){points.push(c.a,c.q);}
  const projection=v=>v[0]*ax+v[1]*az;
  let a=points.reduce((best,v)=>projection(v)<projection(best)?v:best,points[0]);
  let q=points.reduce((best,v)=>projection(v)>projection(best)?v:best,points[0]);
  let dx=q[0]-a[0],dz=q[1]-a[1],length=Math.hypot(dx,dz);
  if(length<1)return anchor;
  let tx=dx/length,tz=dz/length,nx=-tz,nz=tx;
  if(nx*desired[0]+nz*desired[1]<0){[a,q]=[q,a];tx=-tx;tz=-tz;nx=-nx;nz=-nz;}
  return {a,q,length,tx,tz,nx,nz,side:maxSide,segments:(near.length||1)};
}

export function addPhotoReferenceFacade(mesh,b){
  const p=PHOTO_REFERENCE_PROFILES[b.osm],e=photoReferenceFront(b);if(!p||!e)return false;
  const {a,length,tx,tz,nx,nz}=e,h=Math.max(4.0,b.h);
  // Older Safari/Intel GPUs lose depth precision on long, nearly parallel facade quads.
  // The OSM wall below already uses p.wall, so keep one solid wall and bias only details.
  const FACE_BIAS=.10;
  const point=(u,y,out)=>[a[0]+tx*u+nx*(out+FACE_BIAS),y,a[1]+tz*u+nz*(out+FACE_BIAS)];
  const panel=(u,y,w,ph,colour,out=.11)=>{if(w<=.08||ph<=.08)return;mesh.quad(point(u,y,out),point(u+w,y,out),point(u+w,y+ph,out),point(u,y+ph,out),colour);};

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

  // Street View batch 1: exact architectural signatures observed on the real streets.
  // These are deliberately different from one another; the whole point of this pass is
  // recognition, not procedural variety.
  const repeatWindows=(cols,floors,{y0=3.2,row=2.65,side=.34,wh=1.28,frame=p.frame,glass=p.glass,skip=null}={})=>{
    const cw=length/cols;
    for(let r=0;r<floors;r++)for(let c=0;c<cols;c++){
      if(skip&&skip(c,r,cols,floors))continue;
      const u=c*cw+side,ww=Math.max(.38,cw-side*2),y=y0+r*row;
      panel(u-.07,y-.07,ww+.14,wh+.14,frame,.17);
      panel(u,y,ww,wh,glass,.20);
      panel(u+ww*.48,y+.04,.05,Math.max(.30,wh-.08),'#d7dfda',.22);
    }
  };

  if(p.kind==='ostra4wood'){
    // Real red timber/wood facade with pale decorated horizontal banding, tall
    // white-trimmed windows and an ornate entrance bay.
    panel(0,.05,length,.42,'#6f332e',.12);
    const floors=Math.max(2,Math.min(4,Math.round(h/2.9)-1));
    const cols=Math.max(3,Math.min(8,Math.round(length/3.05))),cw=length/cols;
    for(let r=0;r<floors;r++){
      const y=1.22+r*2.62;
      panel(.05,y+1.52,length-.10,.34,p.accent,.16);
      for(let c=0;c<cols;c++){
        const u=c*cw+.42,ww=Math.max(.46,cw-.84);
        panel(u-.15,y-.12,ww+.30,1.56,p.frame,.19);
        panel(u,y,ww,1.34,p.glass,.22);
        panel(u+ww*.46,y+.03,.06,1.28,'#edf0e9',.24);
        panel(u,y+.60,ww,.055,'#edf0e9',.24);
      }
    }
    const door=Math.max(.25,length-.95),dw=.72;
    panel(door-.15,.32,dw+.30,2.52,p.frame,.27);
    panel(door,.47,dw,2.22,'#3c4141',.30);
    panel(door+.08,1.70,dw-.16,.46,p.glass,.32);
    panel(Math.max(.12,door-.34),2.88,Math.min(1.46,length-.20),.20,p.accent,.29);
    for(const u of [.10,Math.max(.15,length-.18)])panel(u,.12,.11,Math.max(.7,h-.28),p.frame,.19);
  }else if(p.kind==='ostra6brick'){
    // Brown brick residential slab with light window surrounds, dark plinth and
    // unmistakable blue-grey projecting balconies.
    panel(0,.05,length,.74,p.ground,.13);
    const floors=Math.max(2,Math.min(4,Math.round(h/2.9)-1)),cols=Math.max(3,Math.min(7,Math.round(length/3.0)));
    repeatWindows(cols,floors,{y0:2.95,row:2.55,side:.42,wh:1.20});
    const cw=length/cols;
    for(let r=0;r<floors;r++)for(let c=0;c<cols;c++){
      if((c+r)%3!==1)continue;
      const u=c*cw+.18,bw=Math.max(.8,cw-.36),y=2.68+r*2.55;
      panel(u-.18,y-.12,bw+.36,.14,'#263c47',.36);
      panel(u,y,bw,.76,p.accent,.39);
      panel(u+.06,y+.07,bw-.12,.08,'#567c8c',.41);
    }
    panel(.05,h-.30,length-.10,.22,'#3f4647',.17);
  }else if(p.kind==='sodra1arched'){
    // Pale stone/plaster facade with strong rusticated base and tall arched-window
    // proportions translated into rectangular geometry with heavy curved-looking crowns.
    panel(0,.05,length,.58,'#8f8578',.13);
    const cols=Math.max(3,Math.min(7,Math.round(length/3.35))),cw=length/cols;
    for(let c=0;c<cols;c++){
      const u=c*cw+.30,ww=Math.max(.62,cw-.60);
      panel(u-.14,.88,ww+.28,1.94,p.frame,.20);
      panel(u,.98,ww,1.66,p.glass,.24);
      panel(u-.08,2.50,ww+.16,.24,p.frame,.25);
      panel(u+.08,1.05,.055,1.48,'#e7ebe3',.26);
      panel(u,1.78,ww,.055,'#e7ebe3',.26);
    }
    panel(.05,3.08,length-.10,.18,p.accent,.16);
    const upper=Math.max(1,Math.min(3,Math.round((h-3.6)/2.8)));
    repeatWindows(cols,upper,{y0:3.62,row:2.62,side:.42,wh:1.24});
  }else if(p.kind==='sodra3blindbrick'){
    // The real frontage is intentionally mostly blind: red lower brick, pale yellow
    // upper brick and only sparse upper openings. Keeping it blind is recognition.
    panel(0,.05,length,.50,p.ground,.12);
    const split=Math.min(h-.8,Math.max(3.6,h*.50));
    panel(0,split,length,Math.max(.3,h-split),'#c9aa78',.09);
    panel(.04,split-.18,length-.08,.18,'#a45a45',.15);
    const cols=Math.max(2,Math.min(6,Math.round(length/4.8))),cw=length/cols;
    for(let c=0;c<cols;c+=2){
      const u=c*cw+.52,ww=Math.max(.46,cw-.95);
      panel(u-.07,h-2.10,ww+.14,1.18,p.frame,.17);
      panel(u,h-2.02,ww,1.02,p.glass,.20);
    }
  }else if(p.kind==='sodra4awnings'){
    // Deep red brick office wall with pale small windows and repeated dark-green
    // canvas awnings over the lower row.
    panel(0,.05,length,.58,p.ground,.13);
    const cols=Math.max(3,Math.min(8,Math.round(length/3.15))),cw=length/cols;
    for(let r=0;r<2;r++)for(let c=0;c<cols;c++){
      const u=c*cw+.40,ww=Math.max(.46,cw-.80),y=1.18+r*2.42;
      panel(u-.07,y-.07,ww+.14,1.16,p.frame,.17);
      panel(u,y,ww,1.02,p.glass,.20);
      if(r===0){
        panel(u-.06,y+.92,ww+.12,.24,p.accent,.34);
        panel(u+.02,y+.82,Math.max(.2,ww-.04),.15,'#0d6556',.36);
      }
    }
    panel(.04,h-.32,length-.08,.24,'#5b493f',.15);
  }else if(p.kind==='sodra6metal'){
    // Ribbed bronze/aluminium 60–70s module facade with a granite-dark base and
    // large shop/office glazing at ground level.
    panel(0,.05,length,2.82,p.ground,.14);
    const groundBays=Math.max(3,Math.min(7,Math.round(length/3.1))),gbw=length/groundBays;
    for(let c=0;c<groundBays;c++){
      const u=c*gbw+.10,w=Math.max(.42,gbw-.20);
      panel(u,.48,w,2.05,c===0?'#243337':p.glass,.23);
      if(c%2===0)panel(u+w*.48,.48,.06,2.05,p.frame,.25);
    }
    const cols=Math.max(4,Math.min(10,Math.round(length/2.45))),cw=length/cols;
    const floors=Math.max(2,Math.min(4,Math.round((h-3.1)/2.45)));
    for(let r=0;r<floors;r++)for(let c=0;c<cols;c++){
      const u=c*cw+.16,w=Math.max(.40,cw-.32),y=3.18+r*2.25;
      panel(u,y,w,1.34,p.glass,.18);
      panel(c*cw+.04,y-.10,.085,1.54,p.frame,.24);
    }
    for(let u=.08;u<length;u+=.62)panel(u,3.02,.055,Math.max(.4,h-3.24),'#c8b99f',.22);
  }else if(p.kind==='sodra11modern'){
    // White modular panel building: grey base, row of narrow windows, larger offset
    // upper openings and a recessed service/garage bay.
    panel(0,.05,length,3.18,p.ground,.12);
    const baseCols=Math.max(5,Math.min(12,Math.round(length/2.15))),bw=length/baseCols;
    for(let c=1;c<baseCols;c++){
      const u=c*bw+.25,w=Math.max(.28,bw-.50);
      panel(u-.05,1.04,w+.10,1.22,p.frame,.16);panel(u,1.10,w,1.10,p.glass,.19);
    }
    panel(.10,.42,Math.min(length*.22,4.6),2.28,'#d0d0ca',.20);
    const upperFloors=Math.max(1,Math.min(3,Math.round((h-3.5)/2.65))),cols=Math.max(4,Math.min(9,Math.round(length/3.2))),cw=length/cols;
    for(let r=0;r<upperFloors;r++)for(let c=0;c<cols;c++){
      if((c+r)%3===1)continue;
      const u=c*cw+.38,w=Math.max(.46,cw-.76),y=3.74+r*2.48;
      panel(u-.06,y-.06,w+.12,1.20,p.frame,.16);panel(u,y,w,1.08,p.glass,.19);
    }
    for(let u=0;u<length;u+=3.1)panel(u+.04,3.28,.045,Math.max(.3,h-3.48),'#c0c3c0',.14);
  }else if(p.kind==='karlberg2balcony'){
    // White plaster apartment with dark metal balcony cages and a woody glazed
    // ground floor.
    panel(0,.05,length,.44,'#a79e90',.12);
    const cols=Math.max(3,Math.min(7,Math.round(length/3.2))),cw=length/cols;
    const floors=Math.max(2,Math.min(4,Math.round(h/2.9)-1));
    for(let r=0;r<floors;r++)for(let c=0;c<cols;c++){
      const u=c*cw+.37,w=Math.max(.48,cw-.74),y=3.02+r*2.55;
      panel(u-.06,y-.06,w+.12,1.20,p.frame,.17);panel(u,y,w,1.08,p.glass,.20);
      if((c+r)%2===0){
        panel(u-.22,y-.30,w+.44,.11,p.accent,.34);
        for(let x=u-.12;x<u+w+.12;x+=.38)panel(x,y-.26,.035,.72,p.accent,.36);
      }
    }
    const bays=Math.max(3,Math.min(6,Math.round(length/3.5))),gw=length/bays;
    for(let c=0;c<bays;c++){
      const u=c*gw+.10,w=Math.max(.4,gw-.20);
      panel(u,.48,w,2.25,'#6d5b4e',.20);panel(u+.08,.62,w-.16,1.94,p.glass,.23);
    }
  }else if(p.kind==='karlberg5fins'){
    // Parking/office volume dominated by repeated vertical silver fins and deep
    // shadowed glazing; very different silhouette from ordinary housing.
    panel(0,.05,length,2.52,p.ground,.14);
    panel(.08,.52,length-.16,1.78,p.glass,.20);
    panel(0,2.58,length,Math.max(.4,h-2.72),'#555e60',.10);
    for(let u=.08;u<length;u+=.68){
      panel(u,2.46,.16,Math.max(.5,h-2.58),p.frame,.31);
      panel(u+.18,2.60,.18,Math.max(.4,h-2.78),'#707779',.24);
    }
    panel(.03,h-.28,length-.06,.20,'#343c3e',.18);
  }else if(p.kind==='karlberg6heritage'){
    // Older light plaster house with red-brown timber frames, classical horizontal
    // bands and a recessed courtyard/restaurant entrance.
    panel(0,.05,length,.42,'#b9aa90',.12);
    const cols=Math.max(3,Math.min(7,Math.round(length/3.05))),cw=length/cols;
    const floors=Math.max(2,Math.min(4,Math.round(h/2.8)-1));
    for(let r=0;r<floors;r++){
      const y=.92+r*2.50;
      panel(.06,y+1.62,length-.12,.10,'#c4b99f',.15);
      for(let c=0;c<cols;c++){
        if(r===0&&c===cols-1)continue;
        const u=c*cw+.38,w=Math.max(.46,cw-.76);
        panel(u-.08,y-.08,w+.16,1.48,p.frame,.17);
        panel(u,y,w,1.32,p.glass,.20);
        panel(u+.05,y+.04,.055,1.24,p.accent,.23);
        panel(u,y+.62,w,.055,p.accent,.23);
      }
    }
    const du=Math.max(.25,length-.95),dw=.72;
    panel(du-.10,.40,dw+.20,2.34,'#6a5744',.26);panel(du,.54,dw,2.04,'#3d3e3a',.29);
    panel(.05,h-.32,length-.10,.24,'#5a5550',.17);
  }else if(p.kind==='karlberg7garages'){
    // Warm taupe plaster with sparse white-framed windows and the distinctive run
    // of pale grey garage/storage shutters at street level.
    panel(0,.05,length,.48,'#6e6a61',.12);
    const shutterH=2.50,bays=Math.max(3,Math.min(7,Math.round(length/2.7))),bw=length/bays;
    for(let c=0;c<bays;c++){
      const u=c*bw+.06,w=Math.max(.42,bw-.12);
      panel(u,.38,w,shutterH,p.accent,.20);
      for(let y=.62;y<2.62;y+=.28)panel(u+.05,y,Math.max(.25,w-.10),.035,'#8f908b',.23);
    }
    const floors=Math.max(1,Math.min(3,Math.round((h-3.2)/2.7))),cols=Math.max(3,Math.min(6,Math.round(length/3.4))),cw=length/cols;
    repeatWindows(cols,floors,{y0:3.40,row:2.55,side:.48,wh:1.18});
    const du=Math.max(.2,length-.80);
    panel(du-.08,.48,.72,2.32,'#8f8d85',.25);panel(du,.60,.56,2.08,'#455052',.28);
  }else if(p.kind==='ting9bergqvist'){
    // Bergqvisthuset/Falkgården: red 19th-century city facade with pale trim and
    // the two characteristic tower-like end accents added in 1906. O'Learys now
    // occupies the ground floor, so the green identity lives inside the real facade.
    panel(0,.05,length,.48,'#76635b',.12);
    const cols=Math.max(5,Math.min(10,Math.round(length/3.2))),cw=length/cols;
    const floors=Math.max(2,Math.min(4,Math.round((h-3.0)/2.6)));
    for(let r=0;r<floors;r++){
      const y=3.15+r*2.45;
      panel(.06,y+1.48,length-.12,.10,p.frame,.15);
      for(let c=0;c<cols;c++){
        const u=c*cw+.34,w=Math.max(.44,cw-.68);
        panel(u-.09,y-.10,w+.18,1.48,p.frame,.18);
        panel(u,y,w,1.28,p.glass,.21);
        panel(u+w*.48,y+.04,.055,1.20,'#e8e8dd',.23);
        panel(u,y+.60,w,.055,'#e8e8dd',.23);
      }
    }
    // Ground-floor restaurant/storefront sequence, integrated instead of a floating green cube.
    const bays=Math.max(5,Math.min(9,Math.round(length/3.6))),bw=length/bays;
    for(let c=0;c<bays;c++){
      const u=c*bw+.10,w=Math.max(.46,bw-.20);
      panel(u,.48,w,2.30,c===Math.floor(bays/2)?'#24453e':p.ground,.20);
      panel(u+.09,.62,Math.max(.26,w-.18),1.98,p.glass,.23);
      if(c%2===0)panel(u-.02,2.45,w+.04,.26,p.accent,.31);
    }
    const signW=Math.min(8.6,length*.38),su=(length-signW)/2;
    panel(su,2.76,signW,.58,p.accent,.35);
    for(let x=su+.40;x<su+signW-.34;x+=.42)panel(x,2.91,.12,.24,'#f2ead5',.38);
    // Twin tower accents visible from Stora Torget.
    for(const u of [.20,Math.max(.20,length-2.65)]){
      panel(u,h-2.25,2.35,2.08,'#7d4038',.18);
      panel(u+.18,h-.42,1.99,.30,'#263e42',.21);
      panel(u+.66,h-.06,1.03,.46,'#263e42',.21);
    }
    panel(.05,h-.38,length-.10,.24,'#34474a',.16);
  }else if(p.kind==='ting11merchant'){
    // Nygren & Åhlin's reconstructed 1867 merchant facade: warm ochre, pale trim,
    // restrained two-storey rhythm and shop openings instead of a modern blank slab.
    panel(0,.05,length,.52,'#89765f',.12);
    const cols=Math.max(4,Math.min(8,Math.round(length/3.35))),cw=length/cols;
    const upperY=3.35;
    for(let c=0;c<cols;c++){
      const u=c*cw+.42,w=Math.max(.46,cw-.84);
      panel(u-.09,upperY-.09,w+.18,1.46,p.frame,.17);
      panel(u,upperY,w,1.28,p.glass,.20);
      panel(u+w*.48,upperY+.04,.055,1.18,'#eee9dc',.22);
    }
    panel(.06,5.03,length-.12,.15,p.frame,.16);
    if(h>6.2){
      for(let c=0;c<cols;c+=2){
        const u=c*cw+.46,w=Math.max(.42,cw-.92),y=5.55;
        panel(u-.07,y-.07,w+.14,1.12,p.frame,.17);panel(u,y,w,.98,p.glass,.20);
      }
    }
    const bays=Math.max(4,Math.min(7,Math.round(length/3.8))),bw=length/bays;
    for(let c=0;c<bays;c++){
      const u=c*bw+.13,w=Math.max(.44,bw-.26);
      panel(u,.52,w,2.34,p.ground,.20);
      panel(u+.09,.66,Math.max(.24,w-.18),1.98,p.glass,.23);
      if(c===Math.floor(bays*.58))panel(u+.22,.66,Math.max(.28,w-.44),1.98,'#3b4747',.25);
    }
    panel(.10,2.78,length-.20,.20,p.frame,.27);
    panel(.08,h-.32,length-.16,.24,'#504f49',.16);
  }else if(p.kind==='wermlandsbanken'){
    // Wermlandsbanken, 1906-08: granite plinth, hand-made red brick above, monumental
    // central portal and a green-roof/copper reading. The proportions follow the real
    // south side of Stora Torget rather than a generic retail facade.
    const baseH=Math.min(3.45,Math.max(2.8,h*.30));
    panel(0,.05,length,baseH,p.ground,.14);
    // Granite courses.
    for(let y=.52;y<baseH-.18;y+=.62)panel(.05,y,length-.10,.065,'#938e86',.17);
    const cols=Math.max(5,Math.min(9,Math.round(length/3.15))),cw=length/cols;
    const portal=Math.floor(cols/2);
    for(let c=0;c<cols;c++){
      const u=c*cw+.38,w=Math.max(.48,cw-.76);
      if(c===portal){
        const dw=Math.min(2.15,w*1.18),du=c*cw+(cw-dw)/2;
        panel(du-.18,.48,dw+.36,baseH-.64,'#aaa39a',.24);
        panel(du,.70,dw,baseH-.92,'#283538',.28);
        panel(du+.12,baseH-.28,dw-.24,.24,'#d3c4a1',.31);
      }else{
        panel(u-.10,1.02,w+.20,1.40,'#a9a39a',.20);
        panel(u,1.12,w,1.20,'#273d42',.23);
      }
    }
    const upperFloors=Math.max(2,Math.min(4,Math.round((h-baseH-.65)/2.45)));
    for(let r=0;r<upperFloors;r++){
      const y=baseH+.48+r*2.30;
      for(let c=0;c<cols;c++){
        const u=c*cw+.43,w=Math.max(.42,cw-.86);
        panel(u-.08,y-.08,w+.16,1.28,'#a0765f',.18);
        panel(u,y,w,1.12,p.glass,.21);
        panel(u+w*.47,y+.03,.055,1.05,'#d4d2c4',.23);
      }
      panel(.08,y+1.43,length-.16,.08,'#6a4337',.15);
    }
    panel(.04,baseH-.08,length-.08,.20,'#5f453c',.18);
    panel(.03,h-.44,length-.06,.34,'#3e6755',.20);
    panel(.34,h-.12,length-.68,.24,'#284c43',.23);
    // Strong central bank-palace emphasis.
    const mid=length/2,emW=Math.min(5.2,length*.22);
    panel(mid-emW/2,h-2.05,emW,1.82,'#744437',.20);
    panel(mid-emW*.33,h-.45,emW*.66,.58,'#456c58',.23);
  }else if(p.kind==='frimurarebok'){
    // Frimurarelogen / Herman Anderssons old bookshop: rusticated taupe stone,
    // tall arched shop windows at ground level and a dignified classical upper facade.
    panel(0,.05,length,.58,p.ground,.13);
    const bays=Math.max(5,Math.min(10,Math.round(length/3.55))),bw=length/bays;
    for(let c=0;c<bays;c++){
      const u=c*bw+.22,w=Math.max(.58,bw-.44);
      // Heavy reveal + tall glass; cap bar gives a readable arch silhouette in simple quads.
      panel(u-.14,.62,w+.28,2.55,p.frame,.20);
      panel(u,.78,w,2.18,p.glass,.24);
      panel(u-.04,2.73,w+.08,.28,p.frame,.27);
      panel(u+.07,1.55,.055,1.25,'#dad8cd',.26);
    }
    // Old bookstore sign datum across the shopfront.
    const signW=Math.min(length*.55,12.0),su=(length-signW)/2;
    panel(su,3.20,signW,.32,p.accent,.29);
    for(let x=su+.34;x<su+signW-.30;x+=.46)panel(x,3.28,.13,.14,'#4d413a',.32);
    const upperFloors=Math.max(1,Math.min(3,Math.round((h-4.0)/2.45))),cols=Math.max(5,Math.min(10,Math.round(length/3.6))),cw=length/cols;
    for(let r=0;r<upperFloors;r++){
      const y=4.15+r*2.30;
      for(let c=0;c<cols;c++){
        const u=c*cw+.42,w=Math.max(.44,cw-.84);
        panel(u-.08,y-.08,w+.16,1.25,p.frame,.18);
        panel(u,y,w,1.10,p.glass,.21);
      }
      panel(.08,y+1.38,length-.16,.09,'#7e6a60',.16);
    }
    // Rustication/cornice lines make the long facade read as masonry rather than a flat fill.
    for(let y=.38;y<3.1;y+=.55)panel(.04,y,length-.08,.045,'#806f67',.16);
    panel(.04,h-.40,length-.08,.30,p.accent,.18);
  }
  }else if(p.kind==='tingvalla-school'){
    // Tingvallagymnasiet: real yellow-brick institutional facade with deep dark plinth,
    // repeated tall arched windows and strong brick pilasters/cornice bands.
    panel(0,.05,length,.72,p.ground,.13);
    const cols=Math.max(7,Math.min(18,Math.round(length/4.2))),cw=length/cols;
    const floors=Math.max(2,Math.min(3,Math.round((h-1.0)/3.1)));
    for(let r=0;r<floors;r++){
      const y=.98+r*2.78,wh=r===floors-1?1.78:1.62;
      for(let c=0;c<cols;c++){
        const u=c*cw+.58,w=Math.max(.62,cw-1.16);
        panel(u-.16,y-.14,w+.32,wh+.24,p.frame,.17);
        panel(u,y,w,wh,p.glass,.21);
        // Arch crown translated to a stepped cap that reads cleanly in low-poly.
        panel(u-.06,y+wh-.04,w+.12,.28,p.frame,.24);
        panel(u+w*.47,y+.05,.06,Math.max(.8,wh-.10),'#d7d8ce',.23);
      }
      panel(.08,y+wh+.38,length-.16,.11,p.accent,.15);
    }
    for(let u=.10;u<length;u+=Math.max(4.0,cw*2))panel(u,.62,.18,Math.max(.8,h-1.02),p.accent,.19);
    panel(.04,h-.44,length-.08,.32,p.accent,.18);
    panel(.18,h-.14,length-.36,.16,'#5c594f',.20);
  }else if(p.kind==='ting19shops'){
    // Tingvallagatan 19-23: restrained pale city block with a genuinely active ground floor:
    // large shop windows, individual entrances and a calmer upper residential/office grid.
    panel(0,.05,length,.46,p.ground,.12);
    const bays=Math.max(6,Math.min(14,Math.round(length/4.8))),bw=length/bays;
    for(let c=0;c<bays;c++){
      const u=c*bw+.12,w=Math.max(.56,bw-.24);
      panel(u,.46,w,2.34,'#565b59',.18);
      panel(u+.10,.61,Math.max(.34,w-.20),1.96,p.glass,.22);
      if(c%3===1){
        const dw=Math.min(.92,w*.45),du=u+(w-dw)/2;
        panel(du-.06,.54,dw+.12,2.10,p.frame,.24);
        panel(du,.64,dw,1.90,'#3d4a4b',.27);
      }
      if(c%2===0)panel(u+.08,2.48,Math.max(.34,w-.16),.20,['#63a58d','#8c8d87','#c9a063'][c%3],.29);
    }
    panel(.06,2.92,length-.12,.18,p.frame,.20);
    const floors=Math.max(2,Math.min(4,Math.round((h-3.2)/2.6))),cols=Math.max(8,Math.min(20,Math.round(length/3.45))),cw=length/cols;
    for(let r=0;r<floors;r++){
      const y=3.38+r*2.40;
      for(let c=0;c<cols;c++){
        const u=c*cw+.46,w=Math.max(.44,cw-.92);
        panel(u-.07,y-.07,w+.14,1.28,p.frame,.16);
        panel(u,y,w,1.14,p.glass,.19);
        panel(u+w*.47,y+.04,.055,1.04,'#d9ddd8',.21);
      }
    }
    panel(.05,h-.36,length-.10,.26,'#8f918b',.17);

  if(p.extraFaces?.includes('west')){
    const side=photoReferenceFront(b,'west');
    if(side){
      const {a:sa,length:sl,tx:stx,tz:stz,nx:snx,nz:snz}=side;
      const sp=(u,y,out)=>[sa[0]+stx*u+snx*(out+.10),y,sa[1]+stz*u+snz*(out+.10)];
      const sq=(u,y,w,ph,col,out=.11)=>{if(w<=.08||ph<=.08)return;mesh.quad(sp(u,y,out),sp(u+w,y,out),sp(u+w,y+ph,out),sp(u,y+ph,out),col);};
      // Street View west facade: rusticated stone/plaster with tall arched openings.
      sq(0,.05,sl,.56,p.ground,.13);
      const bays=Math.max(5,Math.min(11,Math.round(sl/3.45))),bw=sl/bays;
      for(let c=0;c<bays;c++){
        const u=c*bw+.25,w=Math.max(.56,bw-.50);
        sq(u-.14,.66,w+.28,2.62,p.frame,.18);
        sq(u,.83,w,2.16,p.glass,.22);
        sq(u-.05,2.72,w+.10,.31,p.frame,.25);
        sq(u+w*.47,.92,.06,1.76,'#d7d5cb',.24);
      }
      for(let y=.42;y<3.18;y+=.57)sq(.04,y,sl-.08,.045,'#7f6f67',.16);
      const floors=Math.max(1,Math.min(3,Math.round((h-4.0)/2.45))),cols=Math.max(5,Math.min(11,Math.round(sl/3.55))),cw=sl/cols;
      for(let r=0;r<floors;r++){
        const y=4.18+r*2.30;
        for(let c=0;c<cols;c++){
          const u=c*cw+.42,w=Math.max(.44,cw-.84);
          sq(u-.08,y-.08,w+.16,1.24,p.frame,.17);sq(u,y,w,1.08,p.glass,.20);
        }
      }
      sq(.04,h-.40,sl-.08,.30,p.accent,.18);
    }
  }
  return true;
}
