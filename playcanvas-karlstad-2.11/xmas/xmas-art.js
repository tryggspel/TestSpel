// Julklappsjakten: handritad canvas-grafik i spelets stil (tjock mörk kontur, platta färger). Allt ritas en gång vid start och återanvänds
// som delade texturer, så att många paket och tomtar inte kostar fler texturer eller material än varianterna.
const INK='#1b3034',PAPER='#fff1ce';
const shape=(c,fill,path,width=5,stroke=INK)=>{c.beginPath();path();c.fillStyle=fill;c.fill();if(width){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}};
const sparkle=(c,x,y,r,col='#fffbe0')=>{c.fillStyle=col;c.beginPath();c.moveTo(x,y-r);c.quadraticCurveTo(x,y,x+r,y);c.quadraticCurveTo(x,y,x,y+r);c.quadraticCurveTo(x,y,x-r,y);c.quadraticCurveTo(x,y,x,y-r);c.fill();};

// ── Paket ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export const PACKAGE_STYLES=Object.freeze([
  {body:'#d94a4a',lid:'#b23838',ribbon:'#ffe9a6',bow:'#ffd45a'},
  {body:'#3f9462',lid:'#2e7249',ribbon:'#fff1ce',bow:'#e8554e'},
  {body:'#4a86c9',lid:'#376aa5',ribbon:'#fff1ce',bow:'#ffd45a'},
  {body:'#8a5bb8',lid:'#6c4399',ribbon:'#ffe9a6',bow:'#ff8fb1'},
  {body:'#ee9a3e',lid:'#c97a26',ribbon:'#fff1ce',bow:'#d94a4a'},
  {body:'#f4efe3',lid:'#d9d1bd',ribbon:'#d94a4a',bow:'#d94a4a'},
  {body:'#ffcf3f',lid:'#e3a914',ribbon:'#fff7d1',bow:'#ff6f59',star:true}   // bonuspaketet
]);
export const PACKAGE_CELL=128;
// Ritar ett paket i en cell på 128×128 (nederkant = mark). Ett mjukt sken bakom gör att paketet syns på avstånd.
export function drawPackage(c,x0,y0,style,{glow=true}={}){
  c.save();c.translate(x0,y0);c.lineJoin='round';c.lineCap='round';
  if(glow){const g=c.createRadialGradient(64,70,6,64,70,62);g.addColorStop(0,style.star?'#fff6b8cc':'#ffffff66');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,128,128);}
  // kropp och lock
  shape(c,style.body,()=>c.roundRect(24,50,80,62,7),5);
  shape(c,style.lid,()=>c.roundRect(18,34,92,24,6),5);
  // band (lodrätt över lock och kropp, vågrätt över kroppen)
  shape(c,style.ribbon,()=>c.rect(56,34,16,78),4);
  shape(c,style.ribbon,()=>c.rect(24,72,80,14),4);
  // rosett
  shape(c,style.bow,()=>{c.moveTo(64,36);c.bezierCurveTo(36,6,20,30,50,38);c.closePath();},4);
  shape(c,style.bow,()=>{c.moveTo(64,36);c.bezierCurveTo(92,6,108,30,78,38);c.closePath();},4);
  shape(c,style.bow,()=>c.ellipse(64,38,9,8,0,0,Math.PI*2),4);
  c.fillStyle='#ffffff55';c.fillRect(30,56,6,40);
  if(style.star){sparkle(c,22,24,12);sparkle(c,108,30,9);sparkle(c,100,100,10,'#fffbe0');sparkle(c,30,98,7);}
  else sparkle(c,102,52,6,'#ffffffcc');
  c.restore();
}
export function drawPackageAtlas(c){
  PACKAGE_STYLES.forEach((s,i)=>drawPackage(c,(i%4)*PACKAGE_CELL,Math.floor(i/4)*PACKAGE_CELL,s));
}

// ── Tomtar ─────────────────────────────────────────────────────────────────────────────────────────────────────────
// Varianter: hattfärg, rock, skägg, rekvisita. frame 0/1 (andra bildrutan lyfter armen). Cell 160×240.
export const TOMTE_STYLES=Object.freeze([
  {hat:'#d33a3a',coat:'#d33a3a',trim:'#ffffff',prop:'none',name:'klassisk'},
  {hat:'#d33a3a',coat:'#d33a3a',trim:'#ffffff',prop:'sack',name:'med säck'},
  {hat:'#3f7a5c',coat:'#3f7a5c',trim:'#f4efe3',prop:'gift',name:'grön nisse'},
  {hat:'#4a6fa8',coat:'#4a6fa8',trim:'#f4efe3',prop:'lantern',name:'blå nisse'},
  {hat:'#9b3d6b',coat:'#d33a3a',trim:'#fff1ce',prop:'cup',name:'med kaffe'},
  {hat:'#e8863a',coat:'#e8863a',trim:'#ffffff',prop:'candy',name:'pepparkaks-nisse'}
]);
export const TOMTE_CELL=Object.freeze({w:160,h:240});
export function drawTomte(c,x0,y0,style,frame=0){
  c.save();c.translate(x0,y0);c.scale(160/256,240/384);c.lineJoin='round';c.lineCap='round';
  const wave=frame===1;
  // stövlar
  shape(c,'#2a2a30',()=>c.roundRect(88,334,52,28,10),6);shape(c,'#2a2a30',()=>c.roundRect(150,334,52,28,10),6);
  // ben och rock
  shape(c,'#3b3b46',()=>c.roundRect(98,300,34,42,8),6);shape(c,'#3b3b46',()=>c.roundRect(158,300,34,42,8),6);
  shape(c,style.coat,()=>{c.moveTo(70,190);c.quadraticCurveTo(64,308,104,320);c.lineTo(188,320);c.quadraticCurveTo(232,306,222,190);c.quadraticCurveTo(146,150,70,190);c.closePath();},7);
  // pälskant, mittbård och bälte
  shape(c,style.trim,()=>c.roundRect(96,296,100,22,10),6);
  shape(c,style.trim,()=>c.roundRect(133,188,26,130,10),5);
  shape(c,'#26262e',()=>c.rect(70,252,152,22),5);shape(c,'#f6cf4f',()=>c.roundRect(131,248,30,30,5),4);
  // armar
  shape(c,style.coat,()=>{c.moveTo(78,206);c.lineTo(48,270);c.lineTo(72,284);c.lineTo(100,230);c.closePath();},6);
  if(wave){shape(c,style.coat,()=>{c.moveTo(212,206);c.lineTo(246,150);c.lineTo(226,138);c.lineTo(196,196);c.closePath();},6);shape(c,'#2a2a30',()=>c.ellipse(236,140,16,15,0,0,Math.PI*2),5);}
  else{shape(c,style.coat,()=>{c.moveTo(212,206);c.lineTo(240,268);c.lineTo(216,282);c.lineTo(192,228);c.closePath();},6);shape(c,'#2a2a30',()=>c.ellipse(232,278,16,15,0,0,Math.PI*2),5);}
  shape(c,'#2a2a30',()=>c.ellipse(60,278,16,15,0,0,Math.PI*2),5);
  // ansikte, skägg, näsa
  shape(c,'#f1c7a2',()=>c.ellipse(146,150,40,38,0,0,Math.PI*2),6);
  shape(c,PAPER,()=>{c.moveTo(102,152);c.quadraticCurveTo(100,236,146,242);c.quadraticCurveTo(192,236,190,152);c.quadraticCurveTo(146,196,102,152);c.closePath();},6);
  shape(c,'#e9806b',()=>c.ellipse(146,160,11,9,0,0,Math.PI*2),4);
  c.fillStyle=INK;c.beginPath();c.arc(130,142,5,0,7);c.arc(162,142,5,0,7);c.fill();
  c.strokeStyle=INK;c.lineWidth=4;c.beginPath();c.moveTo(122,130);c.lineTo(138,127);c.moveTo(154,127);c.lineTo(170,130);c.stroke();
  // hatt med kant och tott
  shape(c,style.hat,()=>{c.moveTo(100,132);c.quadraticCurveTo(110,64,150,38);c.quadraticCurveTo(214,44,214,86);c.quadraticCurveTo(196,118,192,132);c.closePath();},7);
  shape(c,style.trim,()=>c.roundRect(96,120,102,26,12),6);
  shape(c,style.trim,()=>c.ellipse(212,86,17,17,0,0,Math.PI*2),6);
  // rekvisita
  if(style.prop==='sack'){shape(c,'#b98d52',()=>{c.moveTo(10,262);c.quadraticCurveTo(0,330,40,336);c.quadraticCurveTo(80,334,70,262);c.quadraticCurveTo(40,236,10,262);c.closePath();},6);shape(c,'#d94a4a',()=>c.roundRect(24,244,30,26,5),4);}
  if(style.prop==='gift'){shape(c,'#f6cf4f',()=>c.roundRect(214,288,44,38,5),5);shape(c,'#d94a4a',()=>c.rect(231,288,10,38),3);shape(c,'#d94a4a',()=>c.ellipse(228,284,10,6,-.5,0,Math.PI*2),3);shape(c,'#d94a4a',()=>c.ellipse(244,284,10,6,.5,0,Math.PI*2),3);}
  if(style.prop==='lantern'){c.strokeStyle=INK;c.lineWidth=5;c.beginPath();c.moveTo(232,276);c.lineTo(250,238);c.stroke();shape(c,'#ffd45a',()=>c.roundRect(238,222,28,34,6),5);sparkle(c,252,239,9,'#fffbe0');}
  if(style.prop==='cup'){shape(c,PAPER,()=>c.roundRect(214,262,34,34,6),5);shape(c,'#7b4a2c',()=>c.rect(218,266,26,8),2);c.strokeStyle=INK;c.lineWidth=4;c.beginPath();c.arc(250,278,9,-1.2,1.2);c.stroke();c.strokeStyle='#ffffff';c.lineWidth=3;c.beginPath();c.moveTo(224,254);c.quadraticCurveTo(218,244,226,236);c.stroke();}
  if(style.prop==='candy'){shape(c,'#ffffff',()=>c.roundRect(222,240,14,64,6),4);c.strokeStyle='#d33a3a';c.lineWidth=7;for(let i=0;i<4;i++){c.beginPath();c.moveTo(222,248+i*14);c.lineTo(236,256+i*14);c.stroke();}shape(c,'#ffffff',()=>c.arc(229,238,11,Math.PI,0),4);}
  c.restore();
}
export function drawTomteAtlas(c){
  TOMTE_STYLES.forEach((s,i)=>{for(let f=0;f<2;f++)drawTomte(c,((i%3)*2+f)*TOMTE_CELL.w,Math.floor(i/3)*TOMTE_CELL.h,s,f);});
}
export const TOMTE_ATLAS={w:TOMTE_CELL.w*6,h:TOMTE_CELL.h*2,cols:6,rows:2};

// ── Små ikoner och effekter ────────────────────────────────────────────────────────────────────────────────────────
export function drawStar(c,w,h){c.clearRect(0,0,w,h);const g=c.createRadialGradient(w/2,h/2,2,w/2,h/2,w/2);g.addColorStop(0,'#fff6b8ff');g.addColorStop(.4,'#ffe27a99');g.addColorStop(1,'#ffe27a00');c.fillStyle=g;c.fillRect(0,0,w,h);
  c.fillStyle='#ffd845';c.strokeStyle=INK;c.lineWidth=w*.03;c.lineJoin='round';c.beginPath();for(let i=0;i<10;i++){const r=i%2?w*.14:w*.34,a=-Math.PI/2+i*Math.PI/5;c.lineTo(w/2+Math.cos(a)*r,h/2+Math.sin(a)*r);}c.closePath();c.fill();c.stroke();}
export function drawSnowflake(c,w,h){c.clearRect(0,0,w,h);const g=c.createRadialGradient(w/2,h/2,1,w/2,h/2,w/2);g.addColorStop(0,'#ffffffff');g.addColorStop(.55,'#ffffffcc');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.beginPath();c.arc(w/2,h/2,w/2,0,7);c.fill();}
export function drawSparkle(c,w,h,col='#fff2a8'){c.clearRect(0,0,w,h);sparkle(c,w/2,h/2,w*.42,col);const g=c.createRadialGradient(w/2,h/2,1,w/2,h/2,w*.5);g.addColorStop(0,col+'aa');g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(0,0,w,h);}
export function drawGlow(c,w,h,col='#ffd86b'){c.clearRect(0,0,w,h);const g=c.createRadialGradient(w/2,h/2,1,w/2,h/2,w/2);g.addColorStop(0,col+'ee');g.addColorStop(.5,col+'55');g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(0,0,w,h);}
// Julstämpel (runt märke) i samma stil som Karlstadpassets: gran i mitten, text runt om.
export function drawXmasStamp(c,size,{label='',sub='',color='#b8302f'}={}){
  const s=size,cx=s/2,cy=s/2;c.save();c.clearRect(0,0,s,s);c.lineJoin='round';c.lineCap='round';
  c.fillStyle='#fff6dd';c.beginPath();c.arc(cx,cy,s*.47,0,7);c.fill();
  c.strokeStyle=color;c.lineWidth=s*.035;c.beginPath();c.arc(cx,cy,s*.455,0,7);c.stroke();c.lineWidth=s*.012;c.beginPath();c.arc(cx,cy,s*.39,0,7);c.stroke();
  c.fillStyle=color;
  for(let i=0;i<3;i++){const y=cy-s*.17+i*s*.12,w=s*(.13+i*.07);c.beginPath();c.moveTo(cx,y-s*.12);c.lineTo(cx+w,y+s*.05);c.lineTo(cx-w,y+s*.05);c.closePath();c.fill();}
  c.fillRect(cx-s*.025,cy+s*.17,s*.05,s*.07);sparkle(c,cx,cy-s*.27,s*.06,'#ffcf3f');
  c.fillStyle=color;c.textAlign='center';c.font=`900 ${s*.07}px system-ui,sans-serif`;
  const words=String(label).split(' ');const line1=words.slice(0,Math.ceil(words.length/2)).join(' '),line2=words.slice(Math.ceil(words.length/2)).join(' ');
  c.fillText(line1,cx,cy+s*.31,s*.7);if(line2)c.fillText(line2,cx,cy+s*.385,s*.7);
  c.font=`800 ${s*.05}px system-ui,sans-serif`;c.fillStyle=color+'cc';c.fillText('JULSTÄMPEL',cx,cy-s*.30,s*.6);
  c.restore();
}

// ── Tomtefönster ─────────────────────────────────────────────────────────────────────────────────────────────────────
// Ett upplyst fönster med snö på bänken, gardiner och en tomte som tittar ut. Tre färgvarianter i en bild (3×1 celler à 128×192).
export const WINDOW_CELL=Object.freeze({w:128,h:192});
export const WINDOW_STYLES=Object.freeze([
  {glow0:'#fff0b8',glow1:'#ffc766',curtain:'#c93a3a',hat:'#d33a3a'},
  {glow0:'#e6f4ff',glow1:'#a9d2f5',curtain:'#3c6fb2',hat:'#3f7a5c'},
  {glow0:'#ffe3ee',glow1:'#ffb3cd',curtain:'#7b4aa6',hat:'#d33a3a'}
]);
export function drawWindow(c,x0,y0,style){
  c.save();c.translate(x0,y0);c.lineJoin='round';c.lineCap='round';
  // sken utanför fönstret
  const g=c.createRadialGradient(64,100,10,64,100,92);g.addColorStop(0,style.glow1+'aa');g.addColorStop(1,style.glow1+'00');c.fillStyle=g;c.fillRect(0,0,128,192);
  // karm och ruta
  shape(c,'#5a3b2a',()=>c.roundRect(14,12,100,160,8),5);
  const gl=c.createLinearGradient(0,22,0,160);gl.addColorStop(0,style.glow0);gl.addColorStop(1,style.glow1);
  shape(c,gl,()=>c.roundRect(22,20,84,144,4),3);
  // tomten (hatt, ansikte, skägg) tittar upp över bänken
  shape(c,'#f1c7a2',()=>c.ellipse(64,112,19,18,0,0,Math.PI*2),4);
  shape(c,PAPER,()=>{c.moveTo(46,114);c.quadraticCurveTo(46,150,64,154);c.quadraticCurveTo(82,150,82,114);c.quadraticCurveTo(64,132,46,114);c.closePath();},4);
  shape(c,'#e9806b',()=>c.ellipse(64,118,5,4,0,0,Math.PI*2),2);
  c.fillStyle=INK;c.beginPath();c.arc(57,108,2.4,0,7);c.arc(71,108,2.4,0,7);c.fill();
  shape(c,style.hat,()=>{c.moveTo(45,104);c.quadraticCurveTo(50,70,64,56);c.quadraticCurveTo(90,58,92,78);c.quadraticCurveTo(84,92,83,104);c.closePath();},4);
  shape(c,'#ffffff',()=>c.roundRect(43,98,42,13,6),3);shape(c,'#ffffff',()=>c.ellipse(91,78,8,8,0,0,Math.PI*2),3);
  // spröjs, gardiner och snö på bänken
  c.strokeStyle='#5a3b2a';c.lineWidth=4;c.beginPath();c.moveTo(64,20);c.lineTo(64,164);c.moveTo(22,70);c.lineTo(106,70);c.stroke();
  shape(c,style.curtain,()=>{c.moveTo(22,20);c.lineTo(46,20);c.quadraticCurveTo(30,70,40,120);c.lineTo(22,120);c.closePath();},3);
  shape(c,style.curtain,()=>{c.moveTo(106,20);c.lineTo(82,20);c.quadraticCurveTo(98,70,88,120);c.lineTo(106,120);c.closePath();},3);
  shape(c,'#ffffff',()=>{c.moveTo(8,176);c.quadraticCurveTo(24,158,50,168);c.quadraticCurveTo(76,160,100,168);c.quadraticCurveTo(116,160,122,176);c.lineTo(122,182);c.lineTo(8,182);c.closePath();},4);
  sparkle(c,100,36,7);sparkle(c,30,48,5);
  c.restore();
}
export function drawWindowAtlas(c){WINDOW_STYLES.forEach((s,i)=>drawWindow(c,i*WINDOW_CELL.w,0,s));}

// Ljusstråle (bonuspaket och tomten): lodrät, kraftig vid marken och mjukt utfadad uppåt och åt sidorna. Ritas som ett bildkort som vänder sig mot spelaren.
export function drawBeam(c,w,h,col='#ffd36b'){
  c.clearRect(0,0,w,h);
  const g=c.createLinearGradient(0,h,0,0);g.addColorStop(0,col+'d8');g.addColorStop(.3,col+'88');g.addColorStop(.75,col+'30');g.addColorStop(1,col+'00');
  c.fillStyle=g;c.fillRect(0,0,w,h);
  c.globalCompositeOperation='destination-in';
  const m=c.createLinearGradient(0,0,w,0);m.addColorStop(0,'#ffffff00');m.addColorStop(.3,'#ffffffff');m.addColorStop(.7,'#ffffffff');m.addColorStop(1,'#ffffff00');
  c.fillStyle=m;c.fillRect(0,0,w,h);c.globalCompositeOperation='source-over';
}
