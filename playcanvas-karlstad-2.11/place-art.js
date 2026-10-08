// 2.21: tecknad grafik för uppdragsföremål, stämplar och serviceytor. Allt ritas med canvas 2D i spelets egen stil
// (tjocka mörka konturer, platta färger). Inga bildfiler laddas ner, så butikerna väger noll extra byte och ritas om vid behov.
// Funktionerna tar en 2D-kontext och ritar i en 256×256-ruta som skalas till den verkliga storleken.
const INK='#122b2b';
function shape(c,fill,fn,lw=7){c.beginPath();fn();c.fillStyle=fill;c.fill();c.lineWidth=lw;c.strokeStyle=INK;c.lineJoin='round';c.lineCap='round';c.stroke();}
function line(c,color,lw,fn){c.beginPath();fn();c.strokeStyle=color;c.lineWidth=lw;c.lineCap='round';c.lineJoin='round';c.stroke();}
function steam(c,x,y){for(const dx of [-16,10]){line(c,'#ffffffcc',6,()=>{c.moveTo(x+dx,y);c.bezierCurveTo(x+dx-12,y-14,x+dx+12,y-26,x+dx,y-40);});}}
const ellipse=(c,x,y,rx,ry)=>c.ellipse(x,y,rx,ry,0,0,Math.PI*2);

export const PROP_KINDS=Object.freeze(['kopp','kanna','fat','kaffe','kanelbulle','tidning','vatten','choklad','banan']);
const PROPS={
  kopp(c){
    shape(c,'#efe8d3',()=>ellipse(c,128,206,96,22));
    line(c,'#c9bfa4',5,()=>{c.moveTo(60,206);c.quadraticCurveTo(128,222,196,206);});
    // handtag bakom koppen
    line(c,INK,20,()=>c.arc(200,136,26,-1.1,1.4));line(c,'#73acaa',9,()=>c.arc(200,136,26,-1.1,1.4));
    shape(c,'#73acaa',()=>{c.moveTo(52,92);c.lineTo(204,92);c.quadraticCurveTo(204,200,128,202);c.quadraticCurveTo(52,200,52,92);c.closePath();});
    shape(c,'#5a3a2b',()=>ellipse(c,128,92,76,15),6);
    line(c,'#ffffff80',7,()=>{c.moveTo(70,118);c.quadraticCurveTo(72,160,96,180);});
    c.fillStyle='#ffe8a8';c.beginPath();c.arc(128,150,13,0,7);c.fill();
    steam(c,128,70);
  },
  kanna(c){
    shape(c,'#efe8d3',()=>ellipse(c,128,214,80,16),6);
    // handtag och pip
    line(c,INK,22,()=>{c.moveTo(186,92);c.quadraticCurveTo(250,100,240,150);c.quadraticCurveTo(232,190,190,184);});
    line(c,'#ba6c73',10,()=>{c.moveTo(186,92);c.quadraticCurveTo(250,100,240,150);c.quadraticCurveTo(232,190,190,184);});
    shape(c,'#efe8d3',()=>{c.moveTo(70,100);c.lineTo(14,64);c.lineTo(38,56);c.lineTo(84,86);c.closePath();},6);
    shape(c,'#efe8d3',()=>{c.moveTo(66,86);c.quadraticCurveTo(36,170,66,206);c.quadraticCurveTo(128,222,190,206);c.quadraticCurveTo(220,170,190,86);c.closePath();});
    shape(c,'#ba6c73',()=>{c.moveTo(56,126);c.quadraticCurveTo(128,146,200,126);c.lineTo(204,152);c.quadraticCurveTo(128,172,52,152);c.closePath();},5);
    shape(c,'#efe8d3',()=>{c.moveTo(70,86);c.quadraticCurveTo(128,62,186,86);c.quadraticCurveTo(128,98,70,86);c.closePath();},6);
    shape(c,'#ba6c73',()=>c.arc(128,64,13,0,7),6);
    line(c,'#ffffff90',7,()=>{c.moveTo(84,112);c.quadraticCurveTo(76,160,92,190);});
  },
  fat(c){
    shape(c,'#c9bfa4',()=>ellipse(c,128,170,112,48),6);
    shape(c,'#efe8d3',()=>ellipse(c,128,150,112,48));
    shape(c,'#fff7df',()=>ellipse(c,128,148,80,31),5);
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;line(c,'#ba6c73',7,()=>{c.moveTo(128+Math.cos(a)*92,150+Math.sin(a)*37);c.lineTo(128+Math.cos(a)*104,150+Math.sin(a)*43);});}
    c.fillStyle='#ba6c73';c.beginPath();c.arc(128,148,9,0,7);c.fill();
    line(c,'#ffffffb0',6,()=>{c.moveTo(48,132);c.quadraticCurveTo(64,112,96,106);});
  },
  kaffe(c){
    shape(c,'#f6f0e4',()=>{c.moveTo(66,86);c.lineTo(190,86);c.lineTo(168,214);c.quadraticCurveTo(128,224,88,214);c.closePath();});
    shape(c,'#8a5530',()=>{c.moveTo(72,124);c.lineTo(184,124);c.lineTo(177,168);c.lineTo(79,168);c.closePath();},6);
    c.fillStyle='#fff3d8';c.font='900 21px system-ui,sans-serif';c.textAlign='center';c.fillText('KAFFE',128,153);
    shape(c,'#2d2f31',()=>{c.moveTo(58,88);c.quadraticCurveTo(128,60,198,88);c.lineTo(194,74);c.quadraticCurveTo(128,48,62,74);c.closePath();},6);
    steam(c,128,52);
  },
  kanelbulle(c){
    shape(c,'#8a5530',()=>ellipse(c,128,190,92,30),6);
    shape(c,'#d9954f',()=>ellipse(c,128,150,96,68));
    c.save();c.beginPath();ellipse(c,128,150,96,68);c.clip();
    for(const [rx,ry,w] of [[78,54,9],[56,39,9],[34,24,9],[14,9,7]])line(c,'#8a4b25',w,()=>ellipse(c,128,150,rx,ry));
    c.restore();
    line(c,'#fff1d0',6,()=>{c.moveTo(70,110);c.quadraticCurveTo(100,92,140,96);});
    c.fillStyle='#fff';for(const [x,y] of [[168,118],[184,150],[96,176],[150,184]]){c.beginPath();c.arc(x,y,4,0,7);c.fill();}
  },
  tidning(c){
    shape(c,'#d9d3c0',()=>{c.moveTo(56,64);c.lineTo(214,52);c.lineTo(222,206);c.lineTo(48,214);c.closePath();},6);
    shape(c,'#f4efdf',()=>{c.moveTo(44,76);c.lineTo(200,62);c.lineTo(210,212);c.lineTo(36,222);c.closePath();});
    shape(c,'#1d2c2f',()=>{c.moveTo(54,88);c.lineTo(194,76);c.lineTo(197,106);c.lineTo(57,118);c.closePath();},5);
    c.fillStyle='#ffe8a8';c.font='900 26px system-ui,sans-serif';c.textAlign='center';c.save();c.translate(125,103);c.rotate(-.085);c.fillText('NYTT',0,0);c.restore();
    shape(c,'#7fb0ae',()=>{c.moveTo(56,130);c.lineTo(112,126);c.lineTo(114,170);c.lineTo(58,174);c.closePath();},4);
    for(let i=0;i<4;i++)line(c,'#6b6f6e',5,()=>{c.moveTo(124,134+i*14);c.lineTo(190,129+i*14);});
    for(let i=0;i<3;i++)line(c,'#6b6f6e',5,()=>{c.moveTo(58,188+i*10);c.lineTo(190,180+i*10);});
  },
  vatten(c){
    shape(c,'#9fd5ee',()=>{c.moveTo(92,84);c.lineTo(164,84);c.quadraticCurveTo(178,100,178,128);c.lineTo(178,206);c.quadraticCurveTo(178,222,162,222);c.lineTo(94,222);c.quadraticCurveTo(78,222,78,206);c.lineTo(78,128);c.quadraticCurveTo(78,100,92,84);c.closePath();});
    shape(c,'#2c7fb8',()=>{c.moveTo(78,134);c.lineTo(178,134);c.lineTo(178,184);c.lineTo(78,184);c.closePath();},5);
    c.fillStyle='#fff';c.font='900 20px system-ui,sans-serif';c.textAlign='center';c.fillText('VATTEN',128,166);
    shape(c,'#e9f4fa',()=>{c.moveTo(104,52);c.lineTo(152,52);c.lineTo(152,84);c.lineTo(104,84);c.closePath();},6);
    shape(c,'#2c7fb8',()=>{c.moveTo(100,40);c.lineTo(156,40);c.lineTo(156,56);c.lineTo(100,56);c.closePath();},6);
    line(c,'#ffffffb0',7,()=>{c.moveTo(92,112);c.lineTo(92,206);});
  },
  choklad(c){
    shape(c,'#7a3b8f',()=>{c.moveTo(40,92);c.lineTo(214,80);c.lineTo(220,184);c.lineTo(46,196);c.closePath();});
    shape(c,'#5b3a29',()=>{c.moveTo(56,106);c.lineTo(200,96);c.lineTo(205,170);c.lineTo(61,180);c.closePath();},5);
    for(const i of [1,2,3])line(c,'#3c2418',4,()=>{c.moveTo(56+i*36,106-i*2.4);c.lineTo(61+i*36,180-i*2.4);});
    line(c,'#3c2418',4,()=>{c.moveTo(58,143);c.lineTo(203,133);});
    c.fillStyle='#ffe8a8';c.font='900 21px system-ui,sans-serif';c.textAlign='center';c.save();c.translate(130,70);c.rotate(-.06);c.fillText('CHOKLAD',0,0);c.restore();
    shape(c,'#c9a3d4',()=>{c.moveTo(200,86);c.lineTo(234,76);c.lineTo(226,108);c.closePath();},5);
  },
  banan(c){
    shape(c,'#f4d03f',()=>{c.moveTo(40,96);c.quadraticCurveTo(60,196,168,206);c.quadraticCurveTo(206,208,226,176);c.quadraticCurveTo(232,160,222,158);c.quadraticCurveTo(196,186,160,176);c.quadraticCurveTo(96,160,78,88);c.quadraticCurveTo(70,66,50,72);c.quadraticCurveTo(36,78,40,96);c.closePath();});
    shape(c,'#7a5b2a',()=>{c.moveTo(40,96);c.lineTo(50,72);c.quadraticCurveTo(60,60,70,70);c.lineTo(62,92);c.closePath();},5);
    line(c,'#fff7b0',7,()=>{c.moveTo(70,112);c.quadraticCurveTo(96,170,150,184);});
    line(c,'#b18e1c',4,()=>{c.moveTo(214,172);c.lineTo(226,176);});
  }
};

// Julgrenen: andra moduler (xmas/) kan lägga till egna föremål utan att ändra den här filen. Samma ruta (256×256) och samma stil.
export function registerProp(kind,fn){if(typeof fn==='function'&&!PROPS[kind])PROPS[kind]=fn;return kind in PROPS;}
export const hasProp=kind=>kind in PROPS;
// Ritar ett föremål i en kvadratisk ruta (w×h). Transparent bakgrund.
export function drawProp(c,kind,w=256,h=w){
  const f=PROPS[kind];if(!f)return false;
  c.save();c.clearRect(0,0,w,h);c.scale(w/256,h/256);f(c);c.restore();return true;
}
// Föremålskort för 3D-världen: föremålet med ett namnband under. w×h ska ha proportionen 4:5.
export function drawItemCard(c,w,h,kind,name){
  c.save();c.clearRect(0,0,w,h);
  c.scale(w/256,h/320);
  // mjuk sken bakom
  const g=c.createRadialGradient(128,130,10,128,130,130);g.addColorStop(0,'#fff6c8cc');g.addColorStop(1,'#fff6c800');c.fillStyle=g;c.fillRect(0,0,256,260);
  PROPS[kind]?.(c);
  c.fillStyle='#173a31';c.strokeStyle='#ffe18c';c.lineWidth=6;c.beginPath();c.roundRect(24,250,208,52,16);c.fill();c.stroke();
  c.fillStyle='#fff0cd';c.font='900 34px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(name,128,277,190);
  c.restore();
}
// Menytavlan på Pressbyråns serviceyta: sex föremål i ett rutnät 3×2.
export function drawMenuBoard(c,w,h,kinds,title='FIKA PÅ MINUTEN'){
  c.save();c.clearRect(0,0,w,h);c.scale(w/768,h/384);
  c.fillStyle='#173a31';c.strokeStyle='#ffe18c';c.lineWidth=10;c.beginPath();c.roundRect(8,8,752,368,26);c.fill();c.stroke();
  c.fillStyle='#ffe18c';c.font='900 38px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(title,384,46,700);
  kinds.slice(0,6).forEach((k,i)=>{
    const col=i%3,row=Math.floor(i/3),x=36+col*232,y=84+row*148;
    c.fillStyle='#f4efdf';c.beginPath();c.roundRect(x,y,208,136,16);c.fill();
    c.save();c.translate(x+50,y-8);c.scale(.42,.42);PROPS[k]?.(c);c.restore();
    c.fillStyle='#173a31';c.font='900 25px system-ui,sans-serif';c.textAlign='center';c.fillText(k==='kanelbulle'?'BULLE':k.toUpperCase(),x+104,y+118,190);
  });
  c.restore();
}
// Stämpel som ser ut som bläck. size är kvadratens sida. colour är bläckfärgen.
export function drawStamp(c,size,{name='',sub='',color='#7a2f8f',date=''}={}){
  c.save();c.clearRect(0,0,size,size);c.translate(size/2,size/2);c.rotate(-.16);c.scale(size/256,size/256);
  c.strokeStyle=color;c.fillStyle=color;c.globalAlpha=.92;c.lineWidth=9;
  c.beginPath();c.arc(0,0,112,0,7);c.stroke();c.lineWidth=3;c.beginPath();c.arc(0,0,98,0,7);c.stroke();
  c.setLineDash([2,9]);c.lineWidth=5;c.beginPath();c.arc(0,0,86,0,7);c.stroke();c.setLineDash([]);
  c.textAlign='center';c.textBaseline='middle';
  c.font='900 20px system-ui,sans-serif';c.fillText('KARLSTADPASSET',0,-62,170);
  c.font='900 34px system-ui,sans-serif';c.fillText(String(name).toUpperCase(),0,-12,176);
  c.font='900 18px system-ui,sans-serif';c.fillText(String(sub).toUpperCase(),0,26,170);
  // stjärna
  c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?7:17;c.lineTo(Math.cos(a)*r,62+Math.sin(a)*r);}c.closePath();c.fill();
  if(date){c.font='800 14px system-ui,sans-serif';c.fillText(date,0,90);}
  c.restore();
}
