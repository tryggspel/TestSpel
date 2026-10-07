import {LANDMARKS,STOREFRONTS,STREET_SIGNS,PLACE_SIGNS,CITY_STREETS,storefrontAnchor} from './city-geography.mjs?v=2.18.2';
import {MALL_ROOMS} from './mall-space.mjs?v=2.18.2';
import {REAL_BUSINESSES,BUSINESS_OSM_IDS,businessAnchor} from './businesses.mjs?v=2.18.2';
import {drawBrandLogo,hasBrandLogo} from './brand-logos.mjs?v=2.18.2';
import {createMallSigns} from './mall-architecture.js?v=2.18.2';
import {SOUTH_IDS} from './city-south-space.mjs?v=2.18.2';
import {SOUTH_STREETS} from './city-south-data.mjs?v=2.18.2';
const ink='#263f46',paper='#f6ebd3';

// Curated building facades are owned by city-architecture.js and rendered as hand-built
// geometry directly on their real OSM faces, exactly like the Kungsgatan reference pass.
// This identity layer only adds names, businesses and brand signage; it must not cover
// curated architecture with generated facade cards.

// Original comic drawings, baked once. Windows, masonry and print shading cost no geometry.
export function drawLandmarkFacade(c,w,h,kind){
  c.save();c.scale(w/1024,h/512);c.lineJoin='round';
  const box=(x,y,w,h,fill,line=0)=>{c.fillStyle=fill;c.fillRect(x,y,w,h);if(line){c.strokeStyle=ink;c.lineWidth=line;c.strokeRect(x,y,w,h);}};
  const arch=(x,y,w,h)=>{c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+w/2);c.arc(x+w/2,y+w/2,w/2,Math.PI,Math.PI*2);c.lineTo(x+w,y+h);c.closePath();};
  const window=(x,y,w,h,arched=false)=>{
    box(x+5,y+6,w+8,h+9,'#a6ae9c');
    c.strokeStyle=ink;c.lineWidth=3;c.fillStyle='#365664';
    if(arched){arch(x,y,w,h);c.fill();c.stroke();}else box(x,y,w,h,'#365664',3);
    c.save();if(arched){arch(x+3,y+3,w-6,h-6);c.clip();}else{c.beginPath();c.rect(x+3,y+3,w-6,h-6);c.clip();}
    c.fillStyle='#8db9bb';c.beginPath();c.moveTo(x,y);c.lineTo(x+w*.8,y);c.lineTo(x+w*.2,y+h);c.lineTo(x,y+h);c.fill();
    box(x+w*.47,y,w*.065,h,'#e6d8b5');box(x,y+h*.47,w,4,'#e6d8b5');c.restore();box(x-6,y+h+2,w+12,7,paper,2);
  };
  if(kind==='tower'){
    box(0,0,1024,512,'#eee9d7');box(0,0,65,512,'#c1cbbb');box(959,0,65,512,'#d2d8c6');
    for(const y of [26,94,362,478]){box(0,y,1024,8,'#a7b6aa');box(0,y-6,1024,8,paper);}
    for(const x of [184,568]){c.fillStyle=paper;arch(x-23,119,298,197);c.fill();c.strokeStyle='#a6b4a4';c.lineWidth=5;c.stroke();c.fillStyle=ink;arch(x,137,252,171);c.fill();for(let y=190;y<301;y+=14)box(x+12,y,227,5,'#657b76');}
    c.fillStyle='#485d58';arch(373,376,278,127);c.fill();box(504,406,5,95,'#cfbf91');
  }else if(kind==='church'){
    box(0,0,1024,512,'#f0e7d2');box(0,447,1024,65,'#a0afa0');
    for(let i=0;i<5;i++){const x=46+i*202;box(x-29,10,10,431,'#d1d6c1');box(x-20,10,7,431,paper);window(x,83,114,304,true);}
    box(0,10,1024,14,paper);box(0,32,1024,7,'#afbba9');
  }else if(kind==='radhuset'){
    box(0,0,1024,512,'#e4dbc0');box(0,368,1024,144,'#d0c6ae');
    for(let y=381;y<510;y+=28)box(0,y,1024,3,'#abaf9d');
    for(const y of [33,189,352]){box(0,y+12,1024,10,'#a4ac9c');box(0,y,1024,12,paper);}
    for(let col=0;col<13;col++){
      const x=23+col*76;
      for(let row=0;row<3;row++)window(x,55+row*158,52,row===2?130:112,row!==1);
    }
    for(const x of [349,661]){box(x+9,26,20,478,'#a7af9b');box(x,25,14,482,paper,2);}
    box(382,5,258,34,paper);c.fillStyle=ink;c.font='700 28px Georgia,serif';c.textAlign='center';c.fillText('RÅDHUSET',512,30);
  }else if(kind==='frimurare'){
    // Frimurarelogen, Tingvallagatan 15 — explicit illustrated facade for the trusted card pipeline.
    // Dark yellow classicist plaster, rusticated base, paired pilasters, tall piano-nobile windows,
    // attic windows, central risalit and dark green/black roof line.
    box(0,0,1024,512,'#c8a655');
    box(0,350,1024,162,'#8f8779');
    for(let y=362;y<505;y+=31)box(0,y,1024,3,'#6f685f');
    box(0,0,1024,18,'#405b55');
    box(0,26,1024,10,'#efe3c8');
    box(0,174,1024,10,'#b88e47');
    box(0,184,1024,8,'#efe3c8');
    box(0,332,1024,12,'#b88e47');
    box(0,344,1024,9,'#efe3c8');

    // Central risalit.
    box(397,18,230,488,'#d4b263');
    box(390,18,12,488,'#eadfc4');
    box(627,18,12,488,'#eadfc4');

    const bays=9,bw=1024/bays;
    for(let i=0;i<bays;i++){
      const x=i*bw+bw*.24;
      // Ground-floor openings.
      window(x,367,bw*.50,105,false);
      // Tall piano-nobile windows.
      window(x,205,bw*.50,112,true);
      // Upper/attic rhythm.
      window(x+bw*.06,67,bw*.38,77,false);
      if(i<bays-1){
        box((i+1)*bw-8,50,16,294,'#eadfc4');
        box((i+1)*bw-13,48,26,10,'#b69f79');
      }
    }

    // Main portal and crest.
    box(455,365,114,143,'#7d766d',2);
    box(470,384,84,116,'#30464c',3);
    box(438,340,148,22,'#eadfc4',2);
    box(448,126,128,44,'#eadfc4',2);
    c.fillStyle='#986b50';c.beginPath();c.arc(512,148,18,0,Math.PI*2);c.fill();

    // Strong classical roof/cornice silhouette.
    box(0,38,1024,13,'#6e765f');
    box(0,18,1024,18,'#405b55');
    c.fillStyle='#334943';c.beginPath();c.moveTo(0,18);c.lineTo(1024,18);c.lineTo(950,0);c.lineTo(74,0);c.closePath();c.fill();

  }else if(kind==='residenset'){
    // Residenset — SFV reference: ochre/yellow plaster, grey rusticated base,
    // round-arched ground-floor openings, sash windows above and a strong central pavilion.
    box(0,0,1024,512,'#d8aa55');box(0,360,1024,152,'#aaa79c');
    box(0,0,1024,18,'#3f4b49');box(0,24,1024,12,'#eee4cb');
    for(const y of [174,344]){box(0,y,1024,8,'#b88745');box(0,y-7,1024,7,'#eee1c3');}
    box(392,18,240,494,'#deb765',0);
    for(const x of [18,374,392,616,634,994])box(x,34,12,470,'#ead9b9',0);
    for(const y of [52,205])for(let col=0;col<10;col++)window(37+col*97,y,54,100,false);
    for(let col=0;col<10;col++)window(37+col*97,382,54,105,true);
    box(458,374,108,138,'#817d72',2);box(472,391,80,112,'#32494d',3);box(445,342,134,24,'#e7d7b7',2);
    c.fillStyle='#eef0dd';c.fillRect(505,2,6,48);c.fillStyle='#2d6b92';c.fillRect(511,10,45,16);
  }else if(kind==='biskopsgarden'){
    // Biskopsgården — 1770s timber house: light-yellow lockpanel, grey details,
    // English-red window frames and a dark slate mansard roof.
    box(0,0,1024,512,'#dfcf91');
    c.fillStyle='#485658';c.beginPath();c.moveTo(0,0);c.lineTo(1024,0);c.lineTo(918,112);c.lineTo(106,112);c.closePath();c.fill();
    box(0,108,1024,12,'#9a998d',0);box(0,286,1024,10,'#9a998d',0);box(0,494,1024,18,'#827d71',0);
    for(let x=18;x<1024;x+=34)box(x,120,3,372,'#c4b774',0);
    const red='#974f43',glass='#6d8d91';
    for(const y of [150,324])for(let col=0;col<9;col++){
      const x=42+col*108;box(x-7,y-8,66,119,'#d6c88e',2);box(x,y,52,101,red,2);box(x+7,y+8,38,85,glass,1);
      box(x+24,y+8,4,85,'#e8dfc4',0);box(x+7,y+47,38,4,'#e8dfc4',0);
    }
    box(452,352,120,142,'#8e5a48',2);box(471,373,82,113,'#33484b',2);box(430,292,164,22,'#9a998d',0);
  }else if(kind==='library'){
    box(0,0,1024,512,'#b59a74');box(0,0,1024,45,ink);
    for(const y of [82,288])for(let col=0;col<14;col++)window(18+col*72,y,55,147);
    box(0,448,1024,64,'#655f50');box(297,245,430,54,paper,3);c.fillStyle=ink;c.font='900 35px sans-serif';c.textAlign='center';c.fillText('STADSBIBLIOTEKET',512,282,405);
  }else if(kind==='stadshotellet'){
    // Elite Stadshotellet: official facade reference — yellow plaster, white pilasters,
    // tall arched windows, black entrance canopy, balconies and green awnings.
    box(0,0,1024,512,'#ddb44e');box(0,365,1024,147,'#d6a94a');
    for(const y of [18,171,332]){box(0,y,1024,9,'#c99a3f');box(0,y-6,1024,8,'#f0e8d8');}
    for(const x of [18,238,505,770,1000])box(x,0,18,512,'#f1e9d8');
    const cols=[44,132,278,366,590,678,824,912];
    for(const x of cols){
      window(x,38,58,112,true);window(x,194,58,118,true);window(x,350,58,118,true);
    }
    // Central entrance composition and ELITE canopy.
    box(418,350,188,137,'#23282a');box(432,369,160,107,'#33474a');
    box(378,329,268,35,'#1f2426');c.fillStyle='#f2ead9';c.font='700 20px Georgia,serif';c.textAlign='center';c.fillText('ELITE STADSHOTELLET',512,353,246);
    // Green river-side awnings and black balcony rails.
    for(const [x,wid] of [[36,150],[220,128],[666,132],[842,146]]){box(x,332,wid,20,'#2d6a5b');for(let s=x+10;s<x+wid-8;s+=20)box(s,332,9,20,'#e5e1c9');}
    for(const x of [178,706]){box(x,286,112,8,'#283638');for(let i=0;i<11;i++)box(x+5+i*10,246,4,40,'#283638');box(x,244,112,5,'#283638');}
    // Slightly taller central crown seen in the riverside facade.
    box(407,0,210,18,'#f1e9d8');box(444,0,136,10,'#d7ab4b');
  }else if(kind==='opera'){
    // Wermland Opera / Karlstads teater: white neoclassical front with green ornament,
    // pediment, round attic windows and a dark glass entrance canopy.
    box(0,0,1024,512,'#eee9dd');box(0,438,1024,74,'#d7d5c9');
    for(const y of [18,214,424]){box(0,y,1024,8,'#c4cbbd');box(0,y-6,1024,7,'#fbf6e9');}
    for(const x of [18,252,508,764,1000])box(x,0,16,512,'#fbf6e9');
    // Three central tall windows and quieter side bays.
    for(const x of [305,455,605])window(x,236,86,174,false);
    for(const x of [76,824])window(x,258,72,150,false);
    // Round upper windows + stylised green wreaths.
    for(const x of [348,512,676]){
      c.fillStyle='#426f61';c.beginPath();c.arc(x,126,46,0,Math.PI*2);c.fill();
      c.fillStyle='#eee9dd';c.beginPath();c.arc(x,126,34,0,Math.PI*2);c.fill();
      c.fillStyle='#365664';c.beginPath();c.arc(x,126,23,0,Math.PI*2);c.fill();
      c.strokeStyle='#5c8a70';c.lineWidth=7;c.beginPath();c.arc(x,126,52,.18*Math.PI,.82*Math.PI);c.stroke();
    }
    // Central pediment and 1893-like relief treatment, stylised rather than photographic.
    c.fillStyle='#fbf6e9';c.beginPath();c.moveTo(236,72);c.lineTo(512,0);c.lineTo(788,72);c.closePath();c.fill();
    c.strokeStyle='#aeb9aa';c.lineWidth=8;c.stroke();
    c.fillStyle='#4d7e68';c.font='italic 900 34px Georgia,serif';c.textAlign='center';c.fillText('WERMLAND OPERA',512,58,360);
    // Dark entrance + curved-canopy impression.
    box(384,401,256,111,'#263538');box(410,414,204,85,'#55767a');
    box(350,384,324,18,'#253033');box(374,372,276,12,'#4d7e68');
    for(const x of [402,512,622])box(x,405,9,92,'#e9e2d2');
  }else if(kind==='hotel'){
    box(0,0,1024,512,'#dfba7a');box(0,369,1024,143,'#b9a281');
    for(const y of [12,176,337]){box(0,y+7,1024,12,'#b3986b');box(0,y,1024,9,paper);}
    for(let col=0;col<11;col++){const x=30+col*91;for(let row=0;row<3;row++)window(x,35+row*159,55,116,row===2);}
    for(const x of [5,326,685,1003]){box(x,0,16,512,paper);for(let y=20;y<512;y+=25)box(x,y,16,2,'#b3a88e');}
    for(const x of [202,475,748]){box(x-8,305,75,10,ink);for(let i=0;i<7;i++)box(x+i*8,263,3,44,ink);box(x-8,261,75,5,ink);}
    box(385,169,260,28,'#eaddb9');c.fillStyle='#4a7a70';c.font='bold 22px Georgia';c.textAlign='center';c.fillText('STADSHOTELLET',515,191,248);
  }else if(kind==='duvan'||kind==='ahlens'){
    box(0,0,1024,512,kind==='duvan'?'#b49574':'#d6d5c2');
    for(let y=15;y<315;y+=23){box(0,y,1024,2,'#897860');for(let x=(y%2)*22;x<1024;x+=44)box(x,y,2,22,'#897860');}
    for(let i=0;i<10;i++){const x=18+i*102;window(x,34,68,100);window(x,185,68,100);box(x-13,0,12,512,paper);}
    box(0,340,1024,172,'#315763');for(let i=1;i<13;i++)box(i*80,348,7,164,paper);box(0,331,1024,18,paper);
    if(kind==='ahlens')box(0,283,1024,62,'#b52e39');
  }else if(kind==='museum-old'||kind==='museum-new'){
    box(0,0,1024,512,kind==='museum-old'?'#a95c41':'#b57250');
    for(let y=10;y<512;y+=17){box(0,y,1024,2,'#764939');if(kind==='museum-old')for(let x=(y%2)*29;x<1024;x+=58)box(x,y,2,17,'#764939');}
    for(let i=0;i<8;i++)window(26+i*126,kind==='museum-old'?154:99,75,kind==='museum-old'?160:301,kind==='museum-old');
    box(0,0,1024,34,'#354b48');box(0,476,1024,36,'#707566');
  }else if(kind==='glass'){
    box(0,0,1024,512,'#355868');
    for(let i=0;i<8;i++){const x=i*128;box(x+4,10,6,488,'#e9e5d1');c.fillStyle='#9ac1bd';c.beginPath();c.moveTo(x+13,13);c.lineTo(x+108,13);c.lineTo(x+20,469);c.lineTo(x+13,469);c.fill();box(x+9,435,114,12,'#6b8e8c');}
    box(0,0,1024,18,paper);box(0,491,1024,21,ink);
  }
  // Sparse ink specks, fixed at bake time, keep the same printed comic surface language.
  if(kind!=='glass'){c.fillStyle='#26434712';for(let x=15;x<1024;x+=31)for(let y=15;y<512;y+=37)c.fillRect(x+(y%11),y,2,2);}
  c.restore();
}
export function drawClock(c,w,h){
  c.save();c.scale(w/256,h/256);c.fillStyle='#293f47';c.fillRect(0,0,256,256);c.translate(128,128);
  c.beginPath();c.arc(0,0,101,0,Math.PI*2);c.fillStyle='#eedbb2';c.fill();c.strokeStyle='#bf9b50';c.lineWidth=8;c.stroke();
  c.strokeStyle='#263f46';for(let i=0;i<12;i++){c.save();c.rotate(i*Math.PI/6);c.lineWidth=i%3?4:7;c.beginPath();c.moveTo(0,-79);c.lineTo(0,-91);c.stroke();c.restore();}
  c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(0,-57);c.lineTo(0,0);c.lineTo(47,29);c.stroke();c.restore();
}
export function createCityIdentity(pc,host,{card,texture,labelTex}){
  const group=new pc.Entity('Karlstad · platsidentitet');host.app.root.addChild(group);
  const facades=new Map(),logoStates={},shops=[];
  const signStreets=[...CITY_STREETS,...SOUTH_STREETS];
  function mount(name,tex,w,h,x,y,z,yaw=0,twoSided=false){const e=card(name,tex,w,h,x,y,z,twoSided);e.reparent(group);e.setEulerAngles(0,yaw,0);return e;}
  function facade(kind,w=1024,h=512){if(!facades.has(kind))facades.set(kind,texture((c,cw,ch)=>drawLandmarkFacade(c,cw,ch,kind),w,h));return facades.get(kind);}
  function nearestStreetFace(b){
    const cx=(b.minx+b.maxx)/2,cz=(b.minz+b.maxz)/2;let best=null;
    for(const s of CITY_STREETS)for(let i=1;i<s.points.length;i++){
      const [x,z]=s.points[i-1],[ex,ez]=s.points[i],dx=ex-x,dz=ez-z,den=dx*dx+dz*dz||1;
      const t=Math.max(0,Math.min(1,((cx-x)*dx+(cz-z)*dz)/den)),qx=x+t*dx,qz=z+t*dz,d2=(cx-qx)**2+(cz-qz)**2;
      if(!best||d2<best.d2)best={s,qx,qz,d2};
    }
    if(!best)return null;
    const dx=best.qx-cx,dz=best.qz-cz;
    if(Math.abs(dx)>Math.abs(dz)){
      const east=dx>0;return {street:best.s.name,x:east?b.maxx+.18:b.minx-.18,z:Math.max(b.minz+2,Math.min(b.maxz-2,best.qz)),yaw:east?90:-90};
    }
    const south=dz>0;return {street:best.s.name,x:Math.max(b.minx+2,Math.min(b.maxx-2,best.qx)),z:south?b.maxz+.18:b.minz-.18,yaw:south?0:180};
  }
  const streetKey=name=>String(name||'').toLocaleUpperCase('sv-SE');
  function streetYawAt(x,z,name,fallback=0){
    const key=streetKey(name);let best=null;
    for(const s of signStreets){
      if(streetKey(s.name)!==key)continue;
      for(let i=1;i<s.points.length;i++){
        const [ax,az]=s.points[i-1],[bx,bz]=s.points[i],dx=bx-ax,dz=bz-az,den=dx*dx+dz*dz||1;
        const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/den)),qx=ax+t*dx,qz=az+t*dz,d2=(x-qx)**2+(z-qz)**2;
        if(!best||d2<best.d2)best={d2,yaw:Math.atan2(-dz,dx)*180/Math.PI};
      }
    }
    return best?.yaw??fallback;
  }
  function streetExtent(name){
    const key=streetKey(name);let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity,found=false;
    for(const s of signStreets){
      if(streetKey(s.name)!==key)continue;
      for(const [x,z] of s.points){minx=Math.min(minx,x);maxx=Math.max(maxx,x);minz=Math.min(minz,z);maxz=Math.max(maxz,z);found=true;}
    }
    return found?Math.hypot(maxx-minx,maxz-minz):0;
  }
  function streetCandidates(name){
    const key=streetKey(name),out=[];
    const blocked=(x,z)=>host.colliders.some(b=>x>b.minx-.25&&x<b.maxx+.25&&z>b.minz-.25&&z<b.maxz+.25);
    for(const s of signStreets){
      if(streetKey(s.name)!==key)continue;
      for(let i=1;i<s.points.length;i++){
        const [ax,az]=s.points[i-1],[bx,bz]=s.points[i],dx=bx-ax,dz=bz-az,len=Math.hypot(dx,dz);if(len<8)continue;
        const samples=Math.max(1,Math.ceil(len/52));
        for(let j=1;j<=samples;j++){
          const t=j/(samples+1),mx=ax+dx*t,mz=az+dz*t,nx=-dz/len,nz=dx/len,offset=(s.width||6)/2+1.45;
          const a={x:mx+nx*offset,z:mz+nz*offset},b={x:mx-nx*offset,z:mz-nz*offset};
          let p=!blocked(a.x,a.z)?a:!blocked(b.x,b.z)?b:null;if(!p)continue;
          out.push({x:p.x,z:p.z,yaw:Math.atan2(-dz,dx)*180/Math.PI,mx,mz});
        }
      }
    }
    return out.filter((p,i,a)=>a.findIndex(q=>Math.hypot(q.mx-p.mx,q.mz-p.mz)<24)===i);
  }
  function coverageStreetAnchors(name,existing=[]){
    const candidates=streetCandidates(name);if(!candidates.length)return [];
    const extent=streetExtent(name),maxGap=extent>300?72:extent>180?78:extent>100?86:96;
    const refs=existing.map(([x,z])=>({x,z})),picked=[];
    if(!refs.length){
      let seed=0,best=Infinity;
      for(let i=0;i<candidates.length;i++){const d=Math.hypot(candidates[i].mx,candidates[i].mz);if(d<best){best=d;seed=i;}}
      const p=candidates.splice(seed,1)[0];picked.push(p);refs.push(p);
    }
    while(candidates.length&&picked.length<8){
      let bestIndex=-1,bestDist=-1;
      for(let i=0;i<candidates.length;i++){
        const p=candidates[i],d=Math.min(...refs.map(q=>Math.hypot(q.x-p.x,q.z-p.z)));
        if(d>bestDist){bestDist=d;bestIndex=i;}
      }
      if(bestIndex<0||bestDist<=maxGap)break;
      const [p]=candidates.splice(bestIndex,1);picked.push(p);refs.push(p);
    }
    return picked;
  }
  for(const mark of LANDMARKS){
    const b=host.colliders.find(b=>b.osm===mark.osm);if(!b)continue;
    const x=(b.minx+b.maxx)/2,z=(b.minz+b.maxz)/2,w=b.maxx-b.minx-.3,d=b.maxz-b.minz-.3;
    if(mark.id==='domkyrkan'){
      const tx=b.minx+.15+7.3,t=facade('tower',512,768),clock=texture(drawClock,256,256);
      for(const [dx,dz,yaw] of [[0,7.33,0],[0,-7.33,180],[-7.33,0,-90],[7.33,0,90]]){
        mount('Domkyrkan · tornfasad',t,14.6,24,tx+dx,0,z+dz,yaw);
        mount('Domkyrkan · urtavla',clock,3.3,3.3,tx+dx/7.33*6.43,24.35,z+dz/7.33*6.43,yaw);
      }
      for(const side of [-1,1]){mount('Domkyrkan · långhus',facade('church'),w*.44,12.5,x+w*.26,0,z+side*9.035,side===1?0:180);mount('Domkyrkan · tvärskepp',facade('church'),17.8,12.5,x+5,0,z+side*(d/2+.04),side===1?0:180);}
      mount('Domkyrkan · platsnamn',labelTex(['DOMKYRKAN'],'#244b60','#ffefcb'),4.7,.62,b.minx-1,2.2,z-10,-90);
    }else if(mark.id==='radhuset'){
      const rt=facade('radhuset',1024,256);
      mount('Rådhuset · torgfasad',rt,d,11.6,b.maxx+.90,0,z,90);mount('Rådhuset · västfasad',rt,d,11.6,b.minx-.02,0,z,-90);
      mount('Rådhuset · nordfasad',rt,w,11.6,x,0,b.minz-.08,180);mount('Rådhuset · sydfasad',rt,w,11.6,x,0,b.maxz+.08,0);
    }else if(mark.id==='biblioteket'){
      const lt=facade('library',1024,256);
      mount('Biblioteket · Västra Torggatan',lt,d,10,b.minx-.05,0,z,-90);mount('Biblioteket · östfasad',lt,d,10,b.maxx+.08,0,z,90);
      mount('Biblioteket · sydfasad',lt,w,10,x,0,b.maxz+.05,0);mount('Biblioteket · nordfasad',lt,w,10,x,0,b.minz-.08,180);
    }else if(mark.id==='residenset'){
      // Residenset is real geometry now (residenset-facade.mjs); no texture cards.
    }else if(mark.id==='biskopsgarden'){
      const t=facade('biskopsgarden',1024,512),bh=Math.max(9.6,Math.min(11.2,b.h+1.2));
      mount('Biskopsgården · östfasad',t,d,bh,b.maxx+.10,0,z,90);mount('Biskopsgården · västfasad',t,d,bh,b.minx-.10,0,z,-90);
      mount('Biskopsgården · nordfasad',t,w,bh,x,0,b.minz-.10,180);mount('Biskopsgården · sydfasad',t,w,bh,x,0,b.maxz+.10,0);
    }else if(mark.id==='sandgrund'){
      const glass=facade('glass',1024,256);mount('Sandgrund · panoramafönster',glass,w-2,2.6,x,.8,b.maxz+.10);
      const sign=texture((c,sw,sh)=>{c.clearRect(0,0,sw,sh);c.textAlign='center';c.textBaseline='middle';c.font='italic 900 124px Georgia,serif';c.strokeStyle='#7a321b';c.lineWidth=6;c.strokeText('Sandgrund',sw/2,sh*.51,sw-36);c.fillStyle='#f4a329';c.fillText('Sandgrund',sw/2,sh*.51,sw-36);},1024,160);
      mount('Sandgrund · orange takskylt',sign,22,3.4,x+6,3.92,b.maxz+3.86);
      mount('Sandgrund · Lars Lerin',labelTex(['LARS LERIN'],'#ede8d7','#263f46'),5.1,.67,x-8,3,b.maxz+3.90);
    }else if(mark.id==='stadshotellet'||mark.id==='hotel-wing'){
      const hotelKind=mark.id==='stadshotellet'?'stadshotellet':'hotel';
      mount(mark.name+' · söder',facade(hotelKind,1024,384),w,13.3,x,0,b.maxz+.05);
      mount(mark.name+' · älven',facade(hotelKind,1024,384),d,13.3,b.minx-.05,0,z,-90);
      mount(mark.name+' · norr',facade(hotelKind),w,13.3,x,0,b.minz-.08,180);
      mount(mark.name+' · öster',facade(hotelKind),d,13.3,b.maxx+.08,0,z,90);
      if(mark.id==='stadshotellet')mount('Elite Stadshotellet · entré',labelTex(['ELITE','STADSHOTELLET'],'#202628',paper),6.4,1.05,x,3.18,b.maxz+.82);
    }else if(mark.id==='duvan'||mark.id==='ahlens'){
      mount(mark.name+' · butiksfasad',facade(mark.id,1024,384),d,mark.id==='duvan'?15.8:9.7,mark.id==='duvan'?b.minx-.06:b.maxx+.10,0,z,mark.id==='duvan'?-90:90);
      const side=mark.id==='duvan'?'duvan':'ahlens',height=mark.id==='duvan'?15.8:9.7;
      mount(mark.name+' · nordfasad',facade(side),w,height,x,0,b.minz-.08,180);
      mount(mark.name+' · sydfasad',facade(side),w,height,x,0,b.maxz+.08,0);
      mount(mark.name+' · baksida',facade(side),d,height,mark.id==='duvan'?b.maxx+.08:b.minx-.08,0,z,mark.id==='duvan'?90:-90);
    }else if(mark.id==='opera'){
      const oh=Math.max(13.5,Math.min(18,b.h+5.5));
      mount('Wermland Opera · Stora scenen',labelTex(['STORA SCENEN'],'#243235','#f4e8c9'),5.0,.62,-293.3,4.55,-145.5,90);
      mount('Wermland Opera · Operacafé',labelTex(['OPERACAFÉ'],'#153e37','#f3d37f'),3.55,.50,-293.3,3.55,-139.9,90);
    }else if(mark.id==='museum'){
      mount('Cyrillushuset · tegel',facade('museum-old'),28.8,6.8,-146,0,-478.95);
      mount('Cyrillushuset · älven',facade('museum-old'),35.8,6.8,-160.54,0,-497,-90);
      for(const [x,z,w,yaw] of [[-94,-467,25,150],[-69,-470,24,45],[-57.9,-494,28,97]])mount('Museet · trä och glas',facade('museum-new'),w,6.8,x,0,z,yaw);
    }
    if(['radhuset','biblioteket','residenset','biskopsgarden','opera'].includes(mark.id)){
      const p=nearestStreetFace(b);
      if(p){
        const name=mark.name.toUpperCase();
        mount(mark.name+' · namn',labelTex([name],'#214b49','#f5e5bd'),Math.max(4.4,Math.min(6.4,name.length*.34)),.62,p.x,2.72,p.z,p.yaw);
        const street=(mark.street||p.street).toUpperCase();
        mount(mark.name+' · gata',labelTex([street],'#214b49','#f5e5bd'),3.0,.38,p.x,2.12,p.z,p.yaw);
      }
    }
  }
  // Curated facades (including Frimurarelogen and the Torget row) are intentionally not
  // mounted as texture cards here. Their hand-coded OSM-face geometry already rendered
  // in the static town mesh remains the visible source of truth.

  const landmarkIds=new Set(LANDMARKS.map(m=>m.osm)),shopIds=new Set(STOREFRONTS.map(s=>s.osm));
  for(const b of host.colliders){
    if(!b.name||landmarkIds.has(b.osm)||shopIds.has(b.osm)||SOUTH_IDS.has(b.osm)||BUSINESS_OSM_IDS.has(b.osm)||/PARKERING|PRESSBYRÅN/i.test(b.name))continue;
    if(Math.hypot((b.minx+b.maxx)/2,(b.minz+b.maxz)/2)>440)continue;
    const p=nearestStreetFace(b);if(!p)continue;
    const name=b.name.toUpperCase();
    mount('Byggnadsnamn · '+b.name,labelTex([name],'#214b49','#f5e5bd'),Math.max(4.0,Math.min(6.2,name.length*.30)),.58,p.x,2.68,p.z,p.yaw);
  }
  const businessTextures=new Map();
  function businessTexture(b){
    if(businessTextures.has(b.id))return businessTextures.get(b.id);
    const t=texture((c,w,h)=>{
      const signH=Math.round(h*.34),glassY=signH,glassH=h-signH;
      c.fillStyle=b.bg;c.fillRect(0,0,w,h);
      c.fillStyle=b.accent;c.fillRect(0,signH-8,w,8);
      c.fillStyle=b.fg;c.textAlign='center';c.textBaseline='middle';
      if(!drawBrandLogo(c,b.id,{x:36,y:4,w:w-72,h:signH-18,mode:'solid',palette:b})){
        const fontSize=b.name.length>18?48:b.name.length>12?58:70;
        c.font='900 '+fontSize+'px system-ui,sans-serif';c.fillText(b.name,w/2,signH*.50,w-54);
      }
      c.fillStyle='#28444a';c.fillRect(0,glassY,w,glassH);
      const door=Math.max(.18,Math.min(.82,b.door??.5)),doorX=Math.round(w*door),doorW=Math.max(72,Math.round(w*.12));
      c.fillStyle='#83b4b5';for(let i=0;i<4;i++){const x=18+i*w/4;c.fillRect(x,glassY+14,w/4-28,glassH-30);}
      c.fillStyle='#dbe3ce';for(let i=1;i<4;i++)c.fillRect(i*w/4-4,glassY,8,glassH);
      c.fillStyle='#1f343a';c.fillRect(doorX-doorW/2,glassY+9,doorW,glassH-18);
      c.fillStyle='#9bc0ba';c.fillRect(doorX-doorW/2+10,glassY+22,doorW-20,glassH-54);
      c.fillStyle='#ead5a1';c.beginPath();c.arc(doorX+doorW*.28,glassY+glassH*.58,6,0,Math.PI*2);c.fill();
      c.fillStyle='#e7c16b';for(let i=0;i<5;i++){const x=70+i*(w-140)/4;c.beginPath();c.arc(x,glassY+35,9,0,Math.PI*2);c.fill();}
      c.strokeStyle=b.accent;c.fillStyle=b.accent;c.lineWidth=8;
      if(b.kind==='music-office'){
        // MusicPartner is a music-service office, not a guitar shop: studio screens, equalizer and coffee bar.
        c.fillStyle='#1f2d32';c.fillRect(w*.10,glassY+glassH*.43,w*.31,glassH*.31);c.fillRect(w*.55,glassY+glassH*.43,w*.29,glassH*.31);
        c.fillStyle='#89cbc0';for(let i=0;i<8;i++){const bh=18+(i%4)*15;c.fillRect(w*.13+i*22,glassY+glassH*.64-bh,12,bh);}
        c.fillStyle=b.accent;for(let i=0;i<7;i++){const bh=20+((i*17)%58);c.fillRect(w*.59+i*25,glassY+glassH*.68-bh,13,bh);}
        c.fillStyle='#d8b273';c.fillRect(w*.08,glassY+glassH*.78,w*.30,10);c.fillStyle='#f1e4c5';c.fillRect(w*.13,glassY+glassH*.69,24,30);c.strokeRect(w*.13+19,glassY+glassH*.70,12,18);
      }else if(b.kind==='optics'){
        for(const x of [w*.25,w*.65]){c.beginPath();c.arc(x,glassY+glassH*.58,34,0,Math.PI*2);c.arc(x+78,glassY+glassH*.58,34,0,Math.PI*2);c.moveTo(x+34,glassY+glassH*.58);c.lineTo(x+44,glassY+glassH*.58);c.stroke();}
      }else if(b.kind==='pharmacy'){
        c.fillRect(w*.18,glassY+glassH*.30,28,112);c.fillRect(w*.18-42,glassY+glassH*.30+42,112,28);
      }else if(b.kind==='grocery'||b.kind==='retail'||b.kind==='beauty'||b.kind==='electronics'){
        for(let row=0;row<3;row++){c.fillStyle=row===1?b.accent:'#e5d5a9';c.fillRect(60,glassY+72+row*48,w-120,15);}
        if(b.kind==='electronics'){c.fillStyle='#28383d';for(let x=100;x<w-80;x+=150){c.fillRect(x,glassY+glassH*.45,92,54);c.fillStyle=b.accent;c.fillRect(x+8,glassY+glassH*.52,70,6);c.fillStyle='#28383d';}}
        if(b.kind==='beauty'){c.fillStyle='#f0d4df';for(let x=96;x<w-70;x+=122){c.beginPath();c.arc(x,glassY+glassH*.56,22,0,Math.PI*2);c.fill();}}
      }else if(['food','restaurant','pub','cafe'].includes(b.kind)){
        c.fillStyle='#efd49a';for(const x of [w*.20,w*.42,w*.64,w*.82]){c.fillRect(x-34,glassY+glassH*.63,68,10);c.fillRect(x-4,glassY+glassH*.63,8,56);}
      }else if(b.kind==='hotel'){
        c.fillStyle='#ead8b5';c.fillRect(w*.39,glassY+35,w*.22,glassH-50);c.fillStyle='#4b3f36';c.fillRect(w*.485,glassY+55,12,glassH-90);
      }
      if(['normal','hemkop','burgerking','sibylla','grekiska','leprechaun'].includes(b.id)){c.fillStyle=b.accent;c.fillRect(0,signH-17,w,17);for(let x=0;x<w;x+=64){c.fillStyle=(x/64)%2?b.fg:b.accent;c.fillRect(x,signH-17,34,17);}}
      c.strokeStyle='#172e33';c.lineWidth=6;c.strokeRect(3,3,w-6,h-6);
    },1024,360);
    businessTextures.set(b.id,t);return t;
  }
  // 2.11.26: every real business gets its logotype on the fascia sign and a blade plate with the logo. The shapes come from brand-logos.mjs (original vector wordmarks).
  const plateTextures=new Map(),bladeTextures=new Map();
  function plateTexture(b){
    if(plateTextures.has(b.id))return plateTextures.get(b.id);
    const t=texture((c,w,h)=>{
      c.fillStyle=b.bg;c.fillRect(0,0,w,h);c.strokeStyle=b.accent;c.lineWidth=8;c.strokeRect(8,8,w-16,h-16);
      if(!drawBrandLogo(c,b.id,{x:34,y:20,w:w-68,h:h-40,mode:'solid',palette:b})){c.fillStyle=b.fg;c.textAlign='center';c.textBaseline='middle';c.font='900 80px system-ui,sans-serif';c.fillText(b.name.toUpperCase(),w/2,h/2,w-70);}
    },1024,256);
    plateTextures.set(b.id,t);return t;
  }
  function bladeTexture(b){
    if(bladeTextures.has(b.id))return bladeTextures.get(b.id);
    const t=texture((c,w,h)=>{
      c.fillStyle=b.bg;c.fillRect(0,0,w,h);c.strokeStyle=b.accent;c.lineWidth=14;c.strokeRect(10,10,w-20,h-20);
      if(!drawBrandLogo(c,b.id,{x:28,y:h*.22,w:w-56,h:h*.56,mode:'solid',palette:b})){c.fillStyle=b.fg;c.textAlign='center';c.textBaseline='middle';c.font='900 64px system-ui,sans-serif';c.fillText(b.name,w/2,h/2,w-50);}
    },512,512);
    bladeTextures.set(b.id,t);return t;
  }
  const realBusinesses=[];
  for(const b of REAL_BUSINESSES){
    const p=businessAnchor(b,host.colliders);if(!p)continue;
    const a=p.yaw*Math.PI/180,nx=Math.sin(a),nz=Math.cos(a),tx=Math.cos(a),tz=-Math.sin(a);
    let topY;
    if(b.signOnly){
      const pw=Math.min(5.6,p.width*.8);
      mount('Verklig skylt · '+b.name,plateTexture(b),pw,pw/4,p.x,2.35,p.z,p.yaw);topY=2.35+pw/4;
    }else{
      const bw=b.id==='grekiska'?Math.min(13.8,p.width*.72):p.width;
      const bh=b.id==='grekiska'?3.15:3.65;
      mount('Verklig verksamhet · '+b.name,businessTexture(b),bw,bh,p.x,.12,p.z,p.yaw);topY=.12+bh;
    }
    // Blade plate with the logo; the large neon sign was dropped in 2.11.27 (it doubled the fascia sign).
    if(hasBrandLogo(b.id))mount('Hängskylt · '+b.name,bladeTexture(b),1.3,1.3,p.x+tx*Math.min(3.2,p.width*.34)+nx*.45,2.3,p.z+tz*Math.min(3.2,p.width*.34)+nz*.45,p.yaw+90,true);
    realBusinesses.push({id:b.id,name:b.name,address:b.address,x:p.x,z:p.z,yaw:p.yaw,width:p.width,approximate:!!b.approximateBuilding,logo:hasBrandLogo(b.id)});
  }
  const brandTextures=new Map();
  function brandTexture(brand){
    if(brandTextures.has(brand))return brandTextures.get(brand);
    const bg=brand==='olearys'?'#155939':brand==='museum'?'#864638':'#fff7e9',name=(STOREFRONTS.find(s=>s.brand===brand)||PLACE_SIGNS.find(s=>s.brand===brand)||MALL_ROOMS.find(s=>s.id===brand)).name;
    const t=texture((c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=['olearys','museum'].includes(brand)?paper:ink;c.textAlign='center';c.font='bold 48px sans-serif';c.fillText(name,w/2,h*.63,w-40);},512,160);
    brandTextures.set(brand,t);logoStates[brand]='fallback';
    if(typeof Image!=='undefined'){
      const img=new Image();img.onload=()=>{
        const canvas=t.getSource(),c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
        c.fillStyle=bg;c.fillRect(0,0,w,h);const fit=Math.min((w-44)/img.naturalWidth,(h-28)/img.naturalHeight),iw=img.naturalWidth*fit,ih=img.naturalHeight*fit;
        c.drawImage(img,(w-iw)/2,(h-ih)/2,iw,ih);c.strokeStyle=brand==='olearys'?'#d5cba6':'#263f46';c.lineWidth=4;c.strokeRect(4,4,w-8,h-8);t.setSource(canvas);logoStates[brand]='official';
      };
      img.onerror=()=>{logoStates[brand]='fallback';};img.src=new URL('./art/brands/'+brand+(['coop','cervera','clas'].includes(brand)?'.webp':['espresso','duvan','ahlens','museum'].includes(brand)?'.svg':'.png')+'?v=2.18.2',import.meta.url).href;
    }
    return t;
  }
  for(const shop of STOREFRONTS){
    const p=storefrontAnchor(shop,host.colliders);if(!p)continue;const out=shop.face==='north'?-1:1;
    mount(shop.brand==='olearys'?'OLearys readable sign':shop.name+' · '+shop.address,brandTexture(shop.brand),5.3,shop.id==='pressbyran14'?.72:1.656,p.x,shop.id==='pressbyran14'?2.45:3.38,p.z+out*.22,p.yaw);
    mount(shop.address,labelTex([shop.address.toUpperCase()],'#214b49','#f5e5bd'),2.65,.34,p.x-2.55,2.05,p.z+out*.23,p.yaw);
    shops.push({id:shop.id,name:shop.name,address:shop.address,...p});
  }
  for(const p of PLACE_SIGNS)mount(p.name+' · originalskylt',brandTexture(p.brand),p.w,p.w*160/512,p.x,p.y,p.z,p.yaw);
  createMallSigns({mount,texture,labelTex,brandTexture});
  for(const [x,z,text,yaw] of [[-59,-373,'MUSEUM ← · UDDEN ↑',0],[-182,-471,'SANDGRUNDSUDDEN ↑',0],[-227,-574,'KLARÄLVEN · BRYGGOR',90],[-221,-756,'SANDGRUNDSUDDEN',0]])mount(text,labelTex([text],'#315e59','#fff0cc'),5.5,1.2,x,2,z,yaw);
  // Street names use the same green/cream family as building names.
  // Curated intersection signs stay, and long streets receive repeated coverage from beginning to end.
  const signs=STREET_SIGNS,signCache=new Map(),signedStreetNames=new Set(),manualStreetPositions=new Map();
  const streetTexture=text=>{if(!signCache.has(text))signCache.set(text,labelTex([text],'#214b49','#f5e5bd'));return signCache.get(text);};
  for(const [x,z,text,yaw] of signs){
    const key=streetKey(text);signedStreetNames.add(key);
    if(!manualStreetPositions.has(key))manualStreetPositions.set(key,[]);
    manualStreetPositions.get(key).push([x,z]);
    mount('Gatunamn · '+text,streetTexture(text),3.25,.56,x,2.52,z,streetYawAt(x,z,text,yaw),true);
  }
  const allStreetNames=[...new Set(signStreets.map(s=>s.name))].filter(name=>name&&streetKey(name)!=='RONDELL');
  for(const name of allStreetNames){
    const key=streetKey(name),text=name.toLocaleUpperCase('sv-SE'),existing=manualStreetPositions.get(key)||[];
    const anchors=coverageStreetAnchors(name,existing);
    for(const p of anchors)mount('Gatunamn täckning · '+text,streetTexture(text),3.25,.56,p.x,2.52,p.z,p.yaw,true);
    if(existing.length||anchors.length)signedStreetNames.add(key);
  }
  return {snapshot:()=>({landmarks:LANDMARKS.map(m=>({id:m.id,name:m.name,present:host.colliders.some(b=>b.osm===m.osm)})),shops:shops.map(s=>({...s})),businesses:realBusinesses.map(s=>({...s})),streetSigns:[...signedStreetNames],logos:{...logoStates},staticCards:group.children.length})};
}
