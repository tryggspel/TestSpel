import {LANDMARKS,STOREFRONTS,STREET_SIGNS,PLACE_SIGNS,storefrontAnchor} from './city-geography.mjs?v=2.11.6';
import {MALL_ROOMS} from './mall-space.mjs?v=2.11.6';
import {REAL_BUSINESSES,businessAnchor} from './businesses.mjs?v=2.11.6';
import {createMallSigns} from './mall-architecture.js?v=2.11.6';
const ink='#263f46',paper='#f6ebd3';

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
  function mount(name,tex,w,h,x,y,z,yaw=0){const e=card(name,tex,w,h,x,y,z);e.reparent(group);e.setEulerAngles(0,yaw,0);return e;}
  function facade(kind,w=1024,h=512){if(!facades.has(kind))facades.set(kind,texture((c,cw,ch)=>drawLandmarkFacade(c,cw,ch,kind),w,h));return facades.get(kind);}
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
      mount('Rådhuset · torgfasad',facade('radhuset',1024,256),d,11.6,b.maxx+.90,0,z,90);
      mount('Rådhuset · västfasad',facade('radhuset',1024,256),d,11.6,b.minx-.02,0,z,-90);
    }else if(mark.id==='biblioteket'){
      mount('Biblioteket · Västra Torggatan',facade('library',1024,256),d,10,b.minx-.05,0,z,-90);
      mount('Biblioteket · sydfasad',facade('library',1024,256),w,10,x,0,b.maxz+.05);
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
    }else if(mark.id==='museum'){
      mount('Cyrillushuset · tegel',facade('museum-old'),28.8,6.8,-146,0,-478.95);
      mount('Cyrillushuset · älven',facade('museum-old'),35.8,6.8,-160.54,0,-497,-90);
      for(const [x,z,w,yaw] of [[-94,-467,25,150],[-69,-470,24,45],[-57.9,-494,28,97]])mount('Museet · trä och glas',facade('museum-new'),w,6.8,x,0,z,yaw);
    }
  }
  const businessTextures=new Map();
  function businessTexture(b){
    if(businessTextures.has(b.id))return businessTextures.get(b.id);
    const t=texture((c,w,h)=>{
      const signH=Math.round(h*.34),glassY=signH,glassH=h-signH;
      c.fillStyle=b.bg;c.fillRect(0,0,w,h);
      c.fillStyle=b.accent;c.fillRect(0,signH-8,w,8);
      c.fillStyle=b.fg;c.textAlign='center';c.textBaseline='middle';
      const fontSize=b.name.length>18?48:b.name.length>12?58:70;
      c.font='900 '+fontSize+'px system-ui,sans-serif';c.fillText(b.name,w/2,signH*.50,w-54);
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
      }else if(b.kind==='grocery'||b.kind==='retail'){
        for(let row=0;row<3;row++){c.fillStyle=row===1?b.accent:'#e5d5a9';c.fillRect(60,glassY+72+row*48,w-120,15);}
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
  const realBusinesses=[];
  for(const b of REAL_BUSINESSES){
    const p=businessAnchor(b,host.colliders);if(!p)continue;
    if(b.signOnly){
      mount('Verklig skylt · '+b.name,labelTex([b.name.toUpperCase()],b.bg,b.fg),Math.min(6.2,p.width*.78),.72,p.x,2.62,p.z,p.yaw);
    }else{
      mount('Verklig verksamhet · '+b.name,businessTexture(b),p.width,3.65,p.x,.12,p.z,p.yaw);
    }
    realBusinesses.push({id:b.id,name:b.name,address:b.address,x:p.x,z:p.z,yaw:p.yaw,width:p.width,approximate:!!b.approximateBuilding});
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
      img.onerror=()=>{logoStates[brand]='fallback';};img.src=new URL('./art/brands/'+brand+(['coop','cervera','clas'].includes(brand)?'.webp':['espresso','duvan','ahlens','museum'].includes(brand)?'.svg':'.png')+'?v=2.11.6',import.meta.url).href;
    }
    return t;
  }
  for(const shop of STOREFRONTS){
    const p=storefrontAnchor(shop,host.colliders);if(!p)continue;const out=shop.face==='north'?-1:1;
    mount(shop.brand==='olearys'?'OLearys readable sign':shop.name+' · '+shop.address,brandTexture(shop.brand),5.3,shop.id==='pressbyran14'?.72:1.656,p.x,shop.id==='pressbyran14'?2.45:3.38,p.z+out*.22,p.yaw);
    mount(shop.address,labelTex([shop.address.toUpperCase()],'#254e65','#f8efcf'),3.3,.42,p.x-3,2.1,p.z+out*.23,p.yaw);
    shops.push({id:shop.id,name:shop.name,address:shop.address,...p});
  }
  for(const p of PLACE_SIGNS)mount(p.name+' · originalskylt',brandTexture(p.brand),p.w,p.w*160/512,p.x,p.y,p.z,p.yaw);
  createMallSigns({mount,texture,labelTex,brandTexture});
  for(const [x,z,text,yaw] of [[-59,-373,'MUSEUM ← · UDDEN ↑',0],[-182,-471,'SANDGRUNDSUDDEN ↑',0],[-227,-574,'KLARÄLVEN · BRYGGOR',90],[-221,-756,'SANDGRUNDSUDDEN',0]])mount(text,labelTex([text],'#315e59','#fff0cc'),5.5,1.2,x,2,z,yaw);
  // Street names at the important real intersections. Signs are world-fixed, not camera billboards.
  const signs=STREET_SIGNS;
  const signCache=new Map();for(const [x,z,text,yaw] of signs){if(!signCache.has(text))signCache.set(text,texture((c,w,h)=>{c.fillStyle='#24516a';c.fillRect(0,0,w,h);c.strokeStyle='#f6efcf';c.lineWidth=5;c.strokeRect(5,5,w-10,h-10);c.fillStyle='#f6efcf';c.font='700 39px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,w/2,h/2,w-24);},512,96));mount('Gatunamn · '+text,signCache.get(text),4.5,.844,x,2.65,z,yaw);}
  return {snapshot:()=>({landmarks:LANDMARKS.map(m=>({id:m.id,name:m.name,present:host.colliders.some(b=>b.osm===m.osm)})),shops:shops.map(s=>({...s})),businesses:realBusinesses.map(s=>({...s})),logos:{...logoStates},staticCards:group.children.length})};
}
