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
  102590980:Object.freeze({address:'Kungsgatan 20',front:'south',wall:'#c7784e',frame:'#d7ae8f',glass:'#556d73',ground:'#9a8c7e',accent:'#31577d',kind:'orangebalcony'}),
  104529134:Object.freeze({address:'Drottninggatan 17',front:'north',wall:'#c88355',frame:'#e1c4a3',glass:'#3f5358',ground:'#2e302e',accent:'#c7a052',kind:'fratelli'}),
  110733723:Object.freeze({address:'Drottninggatan 20',front:'south',wall:'#a85c45',frame:'#d7d0c3',glass:'#4b6368',ground:'#a7a49d',accent:'#6d6f6c',kind:'sixtiesbrick'}),
  101935904:Object.freeze({address:'Drottninggatan 26',front:'south',wall:'#9b5c45',frame:'#c9b59d',glass:'#52696c',ground:'#595b58',accent:'#66755f',kind:'office77'}),
  106078942:Object.freeze({address:'Västra Torggatan 1',front:'east',wall:'#7f5144',frame:'#b89d86',glass:'#394d53',ground:'#202628',accent:'#c94e37',kind:'savoy'}),
  103767827:Object.freeze({address:'Drottninggatan 21',front:'north',wall:'#a65d43',frame:'#c8aa8d',glass:'#4a6268',ground:'#3a312e',accent:'#d0aa58',kind:'d21bay'}),
  101485439:Object.freeze({address:'Drottninggatan 24',front:'south',wall:'#b79d92',frame:'#d7d2ca',glass:'#385d67',ground:'#6f655f',accent:'#456f85',kind:'stoneblue'}),
  104778900:Object.freeze({address:'Västra Torggatan 3',front:'east',wall:'#a9634d',frame:'#cdbca8',glass:'#4d676b',ground:'#51483f',accent:'#3d765e',kind:'v3brick'}),
  106864602:Object.freeze({address:'Västra Torggatan 9',front:'east',wall:'#e6ded1',frame:'#f3ede2',glass:'#405c62',ground:'#7a6d61',accent:'#bca36c',kind:'heritage9'})
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
  }else if(p.kind==='fratelli'){
    // Drottninggatan 17: restored warm brick, pale stone window frames and striped awnings.
    for(let row=0;row<floors;row++){
      const y=upperY+row*rowH+.12;
      panel(.18,y-.10,length-.36,.08,'#aa6d4a',.12);
    }
    panel(.18,2.86,length-.36,.36,'#272b2b',.31);
    for(let u=.45;u<length-.5;u+=2.35){
      panel(u,2.55,1.05,.18,'#e8ece6',.42);
      panel(u+1.05,2.55,1.05,.18,'#6b8f86',.42);
    }
  }else if(p.kind==='sixtiesbrick'){
    // Drottninggatan 20: 1960s red brick over a light tiled retail base and long metal canopy.
    panel(.12,.46,length-.24,2.68,'#d7d4cc',.20);
    for(let u=.18;u<length-.2;u+=2.45)panel(u,.66,2.05,2.05,p.glass,.23);
    panel(.10,2.82,length-.20,.18,'#8c8f8b',.43);
    for(let row=0;row<floors;row++){
      const y=upperY+row*rowH+.14;panel(.10,y-.13,length-.20,.06,'#7f4939',.11);
    }
  }else if(p.kind==='office77'){
    // Drottninggatan 26: 1977 brick office/retail block, regular grid and heavier cornice.
    for(let u=0;u<length;u+=Math.max(3.6,length/10))panel(u,3.35,.10,b.h-3.7,'#705244',.18);
    panel(.10,2.86,length-.20,.24,'#4b4e4a',.34);
    panel(.14,b.h-.78,length-.28,.26,'#6f795f',.20);
  }else if(p.kind==='d21bay'){
    // Drottninggatan 21: red-brown commercial block with stacked projecting bay windows and a dark entrance band.
    panel(.10,2.82,length-.20,.30,'#2d2a28',.36);
    const bayW=Math.min(4.6,length*.18),centres=[length*.24,length*.63];
    for(const centre of centres){
      for(let row=0;row<floors;row++){
        const y=upperY+row*rowH+.08,u=Math.max(.2,centre-bayW/2);
        panel(u-.18,y-.12,bayW+.36,Math.max(.9,rowH-.35),'#92513e',.30);
        panel(u,y,bayW,Math.max(.75,rowH-.60),p.glass,.42);
        panel(u+bayW*.46,y+.05,.08,Math.max(.62,rowH-.70),p.frame,.45);
        panel(u-.08,y+Math.max(.72,rowH-.55),bayW+.16,.10,p.frame,.44);
      }
    }
    // The photographed arcade/entrance rhythm is kept darker than the upper brickwork.
    for(let u=.45;u<length-.8;u+=4.4)panel(u,.58,3.25,2.02,'#35474b',.27);
  }else if(p.kind==='stoneblue'){
    // Drottninggatan 24: pink-grey stone panels, tall blue glazing and blue horizontal awnings.
    const bay=Math.max(3.2,length/7);
    for(let u=.18;u<length-.3;u+=bay){
      panel(u,.54,Math.max(.5,bay-.34),2.30,'#334f57',.27);
      panel(u+.10,.70,Math.max(.3,bay-.54),1.95,'#6d9298',.30);
      panel(u-.05,2.72,Math.max(.5,bay-.20),.24,p.accent,.42);
    }
    for(let row=0;row<floors;row++){
      const y=upperY+row*rowH+.08;
      panel(.12,y-.08,length-.24,.08,'#9e847d',.13);
    }
    for(let u=.5;u<length-.5;u+=Math.max(4.2,length/6))panel(u,3.38,.12,b.h-3.76,'#8f7770',.18);
  }else if(p.kind==='v3brick'){
    // Västra Torggatan 3: conservative continuation of the documented brick pedestrian-street row.
    panel(.16,2.77,length-.32,.28,'#2f3330',.34);
    for(let u=.35;u<length-.5;u+=3.0)panel(u,2.47,1.85,.25,p.accent,.40);
    for(let row=0;row<floors;row++){
      const y=upperY+row*rowH+.10;panel(.10,y-.10,length-.20,.06,'#8d4f3e',.12);
    }
  }else if(p.kind==='heritage9'){
    // Västra Torggatan 9 / Druvan: preserved late-1800s light plaster with pilasters, garlands and portal rhythm.
    panel(.10,.48,length-.20,2.65,'#d7cfc1',.20);
    const bays=Math.max(4,Math.round(length/3.0)),bw=length/bays;
    for(let col=0;col<=bays;col++)panel(Math.min(length-.10,col*bw),.22,.12,b.h-.48,'#f1eadf',.29);
    for(let row=0;row<floors;row++){
      const y=upperY+row*rowH+.08;
      panel(.16,y-.14,length-.32,.10,p.accent,.22);
      for(let col=0;col<bays;col++){
        const u=col*bw+.30,ww=Math.max(.42,bw-.60),wh=Math.max(.75,rowH-.72);
        panel(u-.11,y-.10,ww+.22,wh+.20,p.frame,.30);
        panel(u,y,ww,wh,p.glass,.34);
        // Simple relief blocks stand in for the documented garlands/balusters without adding texture assets.
        if(row===0)panel(u+.08,y+wh+.18,Math.max(.22,ww-.16),.16,'#cab991',.36);
      }
    }
    panel(.18,b.h-.72,length-.36,.18,'#343536',.24);
  }else if(p.kind==='savoy'){
    // Västra Torggatan 1: dark hotel/restaurant canopy beneath a warm brick upper facade.
    panel(.12,2.72,length-.24,.52,'#171d1f',.40);
    panel(.16,3.28,length-.32,.12,'#9b806d',.23);
    const entrance=Math.min(3.2,length*.28),u=.55;
    panel(u,.55,entrance,2.15,'#1d2528',.46);
    panel(u+.18,.72,entrance-.36,1.78,'#698486',.49);
    const dining=Math.max(2.8,length-entrance-1.45);
    panel(u+entrance+.35,.65,dining,1.98,'#536f73',.47);
    for(let x=u+entrance+.75;x<u+entrance+dining;x+=2.0)panel(x,.72,.07,1.82,'#222b2e',.50);
  }
  return true;
}


// Static pedestrian-street details read from recurring Drottninggatan/Västra Torggatan references.
// Render-only: no collision bodies and no per-frame update.
export function addInnerstadStreetFurniture(mesh){
  const ink='#34484b',wood='#94795b',stone='#9e9888',lamp='#d8d7c0';
  const bench=(x,z,yaw=0)=>{
    const side=Math.abs(yaw)===90;
    mesh.box(x,.48,z,side?.16:2.6,.12,side?2.6:.16,wood);
    mesh.box(x,.82,z+(side?0:.34),side?.12:2.6,.64,side?2.6:.12,wood);
    for(const d of [-.9,.9])mesh.box(x+(side?0:d),.24,z+(side?d:0),.10,.48,.10,ink);
  };
  const post=(x,z)=>{mesh.box(x,1.45,z,.10,2.9,.10,ink);mesh.box(x,2.92,z,.34,.18,.34,ink);mesh.box(x,3.13,z,.46,.34,.46,lamp);mesh.box(x,3.34,z,.30,.08,.30,ink);};
  // Drottninggatan 21 block: furniture stays on the pedestrian side of the building.
  for(const x of [-166,-148,-132])post(x,171.8);
  bench(-158.5,170.8);bench(-139.5,170.8);
  // Västra Torggatan 5: repeated lamps/benches from the photographed pedestrian-street rhythm.
  for(const z of [135,146,156])post(-73.8,z);
  bench(-72.8,140,90);bench(-72.8,151.5,90);
  // Short pale cobble thresholds beneath the benches, offset to avoid z-fighting with the base street mesh.
  mesh.box(-149,.018,169.9,37,.036,2.4,stone);
  mesh.box(-72.0,.018,146.0,2.4,.036,25,stone);
  // Continue the same documented gågata language northward: hanging flower baskets, planters and benches.
  const planter=(x,z)=>{mesh.box(x,.38,z,1.15,.72,1.15,'#777566');mesh.box(x,.78,z,.92,.18,.92,'#5f7d55');mesh.pyramid(x,1.20,z,1.18,1.18,.95,'#71915d');};
  for(const z of [164,176,188,200])post(-73.8,z);
  bench(-72.8,174,90);bench(-72.8,194,90);
  for(const z of [166,186,204])planter(-77.0,z);
  // Drottninggatan 24/26 edge: a restrained row of trees/planters suggested by current street photos.
  for(const x of [-236,-218,-200])planter(x,169.4);
}
