// Julmarknadens människor (2.21.1-xmas.13): ett bildark med besökare, barn, någon som bär hem en julgran, säljare och scenens artister i samma tecknade stil som tomtarna
// (tjocka konturer, platta färger). Varje figur har två bildrutor (gång: benen byter plats; artister: armen rör sig). Cell 128×192, 8 kolumner × 5 rader.
// Ritas en gång till en canvas när spelet startar. Inga riktiga personer: figurerna är påhittade.
const INK='#1d2a2b',SKIN=['#f1c7a2','#e0a982','#c98f6a','#9c6a4c','#f5d3b6'];
export const PEOPLE_CELL=Object.freeze({w:128,h:192});
export const PEOPLE_COLS=8;
// kind: adult | kid | elder | tree (bär en gran) | bags | cup | stroller | seller | choir | singer | guitar | bass | tomte | tomtemor
// coat/hat/scarf/pants: färger. hat: beanie | pompom | earmuff | cap | hood | none. h: höjd i meter när figuren står i världen.
export const PEOPLE_STYLES=Object.freeze([
  {kind:'adult',coat:'#c8352f',hat:'pompom',hatCol:'#f4efe3',scarf:'#2f6b45',pants:'#2a3140',skin:0,h:1.78},
  {kind:'adult',coat:'#2f4f7a',hat:'beanie',hatCol:'#e0a12c',scarf:'#c8352f',pants:'#1f2630',skin:1,h:1.84},
  {kind:'bags',coat:'#3f7a5c',hat:'earmuff',hatCol:'#f2d36b',scarf:'#f4efe3',pants:'#2a3140',skin:4,h:1.7},
  {kind:'cup',coat:'#7b4aa6',hat:'pompom',hatCol:'#ff8fb1',scarf:'#f2d36b',pants:'#262a35',skin:2,h:1.74},
  {kind:'adult',coat:'#d88a2c',hat:'hood',hatCol:'#d88a2c',scarf:'#3c6fb2',pants:'#2a3140',skin:3,h:1.8},
  {kind:'tree',coat:'#5a3b2a',hat:'cap',hatCol:'#c8352f',scarf:'#f4efe3',pants:'#253041',skin:0,h:1.86},
  {kind:'kid',coat:'#e04a6a',hat:'pompom',hatCol:'#ffffff',scarf:'#3c6fb2',pants:'#3c6fb2',skin:4,h:1.18},
  {kind:'kid',coat:'#2f9fd1',hat:'beanie',hatCol:'#c8352f',scarf:'#ffd56b',pants:'#253041',skin:1,h:1.05},
  {kind:'elder',coat:'#6b6f7a',hat:'cap',hatCol:'#3a3f4a',scarf:'#8f2d56',pants:'#2a2d35',skin:0,h:1.7},
  {kind:'stroller',coat:'#1f5a52',hat:'beanie',hatCol:'#f4efe3',scarf:'#d88a2c',pants:'#1f2630',skin:2,h:1.76},
  {kind:'bags',coat:'#9c2f2f',hat:'none',hatCol:'#3a2a22',scarf:'#f2d36b',pants:'#2a3140',skin:3,h:1.82},
  {kind:'cup',coat:'#f2ead8',hat:'earmuff',hatCol:'#c8352f',scarf:'#c8352f',pants:'#3a3f4a',skin:1,h:1.68},
  {kind:'seller',coat:'#8a5e3b',hat:'pompom',hatCol:'#c8352f',scarf:'#f4efe3',pants:'#2a2d35',skin:0,h:1.76,apron:'#f4efe3'},
  {kind:'choir',coat:'#f7f4ee',hat:'none',hatCol:'#f2d36b',scarf:'#c8352f',pants:'#f7f4ee',skin:4,h:1.66},
  {kind:'singer',coat:'#151f3d',hat:'none',hatCol:'#3a2a22',scarf:'#ffd56b',pants:'#151f3d',skin:2,h:1.76},
  {kind:'guitar',coat:'#7a1f1f',hat:'beanie',hatCol:'#1d2a2b',scarf:'#f4efe3',pants:'#1f2630',skin:3,h:1.82},
  {kind:'bass',coat:'#2f6b45',hat:'cap',hatCol:'#f4efe3',scarf:'#ffd56b',pants:'#1f2630',skin:1,h:1.86},
  {kind:'tomte',coat:'#d33a3a',hat:'tomte',hatCol:'#d33a3a',scarf:'#ffffff',pants:'#3b3b46',skin:0,h:1.72},
  {kind:'tomtemor',coat:'#b02f4a',hat:'tomte',hatCol:'#b02f4a',scarf:'#ffffff',pants:'#3b3b46',skin:4,h:1.62},
  {kind:'adult',coat:'#14213d',hat:'pompom',hatCol:'#7dd3c8',scarf:'#7dd3c8',pants:'#2a3140',skin:2,h:1.76}
].map(s=>Object.freeze(s)));
export const PEOPLE_ROWS=Math.ceil(PEOPLE_STYLES.length*2/PEOPLE_COLS);
export const PEOPLE_ATLAS=Object.freeze({w:PEOPLE_CELL.w*PEOPLE_COLS,h:PEOPLE_CELL.h*PEOPLE_ROWS});
// Var en figurs bildruta ligger i arket: [u0, v0, u1, v1] (v räknat nerifrån, som i texturkoordinater).
export function peopleUv(style,frame){
  const cell=style*2+(frame?1:0),col=cell%PEOPLE_COLS,row=Math.floor(cell/PEOPLE_COLS);
  return [col/PEOPLE_COLS,1-(row+1)/PEOPLE_ROWS,(col+1)/PEOPLE_COLS,1-row/PEOPLE_ROWS];
}
// Bredd/höjd-förhållandet för en figur i världen (cellen är 128×192: bredden är 2/3 av höjden; en figur som bär något får lite mer).
export const PERSON_ASPECT=PEOPLE_CELL.w/PEOPLE_CELL.h;

function shape(c,fill,path,w=5){c.beginPath();path();c.fillStyle=fill;c.fill();c.lineWidth=w;c.strokeStyle=INK;c.stroke();}
// En figur i en cell. Ritytan är 128×192; fötterna står på y≈188 och huvudet börjar runt y≈14 för en vuxen (barn ritas mindre i samma cell).
export function drawPerson(c,x0,y0,s,frame=0){
  c.save();c.translate(x0,y0);c.lineJoin='round';c.lineCap='round';
  const kid=s.kind==='kid',k=kid?.74:1,ox=kid?16.6:0,oy=kid?49:0; // barn: mindre, centrerat och ståendes på samma mark
  c.translate(ox,oy);c.scale(k,k);
  const skin=SKIN[s.skin%SKIN.length],step=frame?1:-1,perf=['choir','singer','guitar','bass'].includes(s.kind);
  // ben (gång: det ena benet fram, det andra bak)
  const legA=perf?0:step*7,legB=perf?0:-step*7;
  shape(c,s.pants,()=>c.roundRect(44+legA,128,16,50,6),4);shape(c,s.pants,()=>c.roundRect(68+legB,128,16,50,6),4);
  shape(c,'#2a2a30',()=>c.roundRect(40+legA,172,24,13,6),4);shape(c,'#2a2a30',()=>c.roundRect(64+legB,172,24,13,6),4);
  // rock (kjol för kören och tomtemor)
  const long=s.kind==='choir'||s.kind==='tomtemor';
  shape(c,s.coat,()=>{c.moveTo(34,62);c.quadraticCurveTo(28,long?176:136,40,long?182:140);c.lineTo(88,long?182:140);c.quadraticCurveTo(100,long?176:136,94,62);c.quadraticCurveTo(64,48,34,62);c.closePath();},5);
  if(s.apron)shape(c,s.apron,()=>c.roundRect(46,92,36,50,6),3);
  if(s.kind==='tomte'||s.kind==='tomtemor'){shape(c,'#ffffff',()=>c.roundRect(36,130,56,11,5),3);shape(c,'#ffffff',()=>c.roundRect(59,64,10,72,4),3);}
  if(s.kind==='choir'){c.strokeStyle='#c8352f';c.lineWidth=7;c.beginPath();c.moveTo(38,108);c.lineTo(90,108);c.stroke();}
  // halsduk
  shape(c,s.scarf,()=>c.roundRect(40,56,48,13,6),4);
  if(!perf)shape(c,s.scarf,()=>c.roundRect(70+step*2,62,11,30,4),3);
  // armar och det man bär
  const armL=()=>shape(c,s.coat,()=>{c.moveTo(38,70);c.lineTo(24,114);c.lineTo(36,120);c.lineTo(48,80);c.closePath();},4);
  const armR=(up=0)=>shape(c,s.coat,()=>{c.moveTo(90,70);c.lineTo(104,114-up);c.lineTo(92,120-up);c.lineTo(80,80);c.closePath();},4);
  const hand=(x,y)=>shape(c,'#3a3f4a',()=>c.ellipse(x,y,7,7,0,0,7),3);
  if(s.kind==='tree'){
    // en gran på axeln, i nät
    shape(c,'#2f7a4f',()=>{c.moveTo(-6,60);c.lineTo(126,22);c.lineTo(122,50);c.lineTo(-2,82);c.closePath();},4);
    c.strokeStyle='#e8efe8';c.lineWidth=2;for(let i=0;i<7;i++){c.beginPath();c.moveTo(6+i*17,74-i*5);c.lineTo(14+i*17,46-i*5);c.stroke();}
    shape(c,'#7a5236',()=>c.roundRect(-14,74,22,7,3),3);
    armL();armR(18);hand(100,98);hand(28,118);
  }else if(s.kind==='bags'){
    armL();armR();hand(30,118);hand(98,118);
    shape(c,'#c8352f',()=>c.roundRect(14,116,26,30,4),3);shape(c,'#f2d36b',()=>c.roundRect(90,114,28,32,4),3);
    c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.arc(27,116,7,Math.PI,0);c.arc(104,114,7,Math.PI,0);c.stroke();
  }else if(s.kind==='cup'){
    armL();armR(26);hand(30,118);
    shape(c,'#f4efe3',()=>c.roundRect(92,74,18,22,4),3);shape(c,'#8f2d56',()=>c.rect(94,78,14,5),1);
    c.strokeStyle='#ffffff';c.lineWidth=3;c.beginPath();c.moveTo(98,70);c.quadraticCurveTo(94+step*2,60,100,52);c.stroke();
  }else if(s.kind==='stroller'){
    armL();armR(6);hand(30,118);hand(100,110);
    shape(c,'#3c6fb2',()=>{c.moveTo(96,104);c.lineTo(128,104);c.lineTo(126,140);c.lineTo(98,140);c.closePath();},4);
    shape(c,'#ffffff',()=>c.roundRect(98,98,30,10,4),3);shape(c,'#1d2a2b',()=>c.ellipse(104,150,6,6,0,0,7),3);shape(c,'#1d2a2b',()=>c.ellipse(122,150,6,6,0,0,7),3);
  }else if(s.kind==='elder'){
    armL();armR();hand(30,118);hand(98,118);c.strokeStyle='#6a4630';c.lineWidth=5;c.beginPath();c.moveTo(102,118);c.lineTo(108,184);c.stroke();
  }else if(s.kind==='choir'){
    // ljus i händerna (fladdrar mellan bildrutorna)
    shape(c,s.coat,()=>{c.moveTo(38,70);c.lineTo(52,106);c.lineTo(62,100);c.lineTo(48,72);c.closePath();},4);
    shape(c,s.coat,()=>{c.moveTo(90,70);c.lineTo(76,106);c.lineTo(66,100);c.lineTo(80,72);c.closePath();},4);
    shape(c,'#f7f4ee',()=>c.roundRect(59,72,10,30,3),3);
    c.fillStyle=frame?'#ffd45a':'#ffb347';c.beginPath();c.ellipse(64,66,5,9-frame*2,0,0,7);c.fill();c.fillStyle='#fffbe0';c.beginPath();c.ellipse(64,69,2,4,0,0,7);c.fill();
  }else if(s.kind==='singer'){
    armL();shape(c,s.coat,()=>{c.moveTo(90,70);c.lineTo(84,frame?40:52);c.lineTo(74,frame?44:56);c.lineTo(80,80);c.closePath();},4);
    shape(c,'#2a2a30',()=>c.roundRect(72,frame?32:44,8,20,3),3);hand(30,118);
  }else if(s.kind==='guitar'||s.kind==='bass'){
    // gitarren tvärs över kroppen; högerhanden slår an (rör sig mellan bildrutorna)
    const body=s.kind==='bass'?'#2a2a30':'#c98a45';
    c.save();c.translate(64,112);c.rotate(-.5);
    shape(c,'#3a2a22',()=>c.roundRect(-4,-70,8,62,3),3);shape(c,body,()=>c.ellipse(0,0,20,24,0,0,7),4);shape(c,'#1d2a2b',()=>c.ellipse(0,-2,6,6,0,0,7),2);
    c.restore();armL();shape(c,s.coat,()=>{c.moveTo(90,70);c.lineTo(78,frame?100:110);c.lineTo(68,frame?96:104);c.lineTo(80,80);c.closePath();},4);hand(72,frame?100:108);hand(30,80);
  }else if(s.kind==='tomte'||s.kind==='tomtemor'){
    armL();shape(c,s.coat,()=>{c.moveTo(90,70);c.lineTo(frame?112:104,frame?40:114);c.lineTo(frame?100:92,frame?36:120);c.lineTo(80,80);c.closePath();},4);hand(30,118);hand(frame?108:98,frame?36:118);
  }else{
    // vanlig gång: armarna pendlar
    shape(c,s.coat,()=>{c.moveTo(38,70);c.lineTo(28-step*6,114);c.lineTo(40-step*6,120);c.lineTo(48,80);c.closePath();},4);
    shape(c,s.coat,()=>{c.moveTo(90,70);c.lineTo(100+step*6,114);c.lineTo(88+step*6,120);c.lineTo(80,80);c.closePath();},4);
    hand(34-step*6,118);hand(94+step*6,118);
  }
  // huvud
  shape(c,skin,()=>c.ellipse(64,36,20,21,0,0,7),4);
  c.fillStyle=INK;c.beginPath();c.arc(57,36,2.6,0,7);c.arc(71,36,2.6,0,7);c.fill();
  c.fillStyle='#e9806b';c.beginPath();c.ellipse(64,42,4,3,0,0,7);c.fill();
  if(s.kind==='singer'||s.kind==='choir'){c.fillStyle=INK;c.beginPath();c.ellipse(64,49,4,frame?4:2.5,0,0,7);c.fill();}
  else{c.strokeStyle=INK;c.lineWidth=2.5;c.beginPath();c.arc(64,46,5,.2,Math.PI-.2);c.stroke();}
  c.fillStyle='#f29c9c80';c.beginPath();c.ellipse(52,43,5,3,0,0,7);c.ellipse(76,43,5,3,0,0,7);c.fill();
  if(s.kind==='tomte'){shape(c,'#ffffff',()=>{c.moveTo(44,40);c.quadraticCurveTo(46,74,64,76);c.quadraticCurveTo(82,74,84,40);c.quadraticCurveTo(64,58,44,40);c.closePath();},4);}
  if(s.kind==='choir'){ // ljuskrona/glitter i håret
    c.strokeStyle='#cfe6c9';c.lineWidth=5;c.beginPath();c.ellipse(64,20,20,6,0,0,7);c.stroke();
  }
  // mössa, hätta eller hörselskydd
  const h=s.hat,col=s.hatCol;
  if(h==='beanie'||h==='pompom'){shape(c,col,()=>{c.moveTo(43,30);c.quadraticCurveTo(46,6,64,6);c.quadraticCurveTo(82,6,85,30);c.closePath();},4);shape(c,'#f4efe3',()=>c.roundRect(41,24,46,9,4),3);if(h==='pompom')shape(c,'#f4efe3',()=>c.ellipse(64,5,8,8,0,0,7),3);}
  else if(h==='earmuff'){c.strokeStyle=INK;c.lineWidth=5;c.beginPath();c.arc(64,32,22,Math.PI*1.05,Math.PI*1.95);c.stroke();shape(c,col,()=>c.ellipse(43,38,8,10,0,0,7),3);shape(c,col,()=>c.ellipse(85,38,8,10,0,0,7),3);shape(c,'#5a3b2a',()=>c.ellipse(64,22,16,8,0,Math.PI,0),3);}
  else if(h==='cap'){shape(c,col,()=>{c.moveTo(44,26);c.quadraticCurveTo(48,10,66,10);c.quadraticCurveTo(84,12,84,26);c.closePath();},4);shape(c,col,()=>c.roundRect(60,22,32,6,3),3);}
  else if(h==='hood'){shape(c,col,()=>{c.moveTo(40,48);c.quadraticCurveTo(34,8,64,8);c.quadraticCurveTo(94,8,88,48);c.quadraticCurveTo(84,22,64,20);c.quadraticCurveTo(44,22,40,48);c.closePath();},4);c.strokeStyle='#f4efe3';c.lineWidth=5;c.beginPath();c.arc(64,36,23,Math.PI*1.1,Math.PI*1.9);c.stroke();}
  else if(h==='tomte'){shape(c,col,()=>{c.moveTo(42,30);c.quadraticCurveTo(52,2,74,0);c.quadraticCurveTo(100,8,98,26);c.quadraticCurveTo(90,30,86,30);c.closePath();},4);shape(c,'#ffffff',()=>c.roundRect(40,24,48,9,4),3);shape(c,'#ffffff',()=>c.ellipse(98,26,7,7,0,0,7),3);}
  else{shape(c,'#5a3b2a',()=>{c.moveTo(44,30);c.quadraticCurveTo(48,12,64,12);c.quadraticCurveTo(82,12,84,30);c.quadraticCurveTo(66,22,44,30);c.closePath();},3);}
  c.restore();
}
export function drawPeopleAtlas(c){
  c.clearRect(0,0,PEOPLE_ATLAS.w,PEOPLE_ATLAS.h);
  PEOPLE_STYLES.forEach((s,i)=>{for(let f=0;f<2;f++){const cell=i*2+f;drawPerson(c,(cell%PEOPLE_COLS)*PEOPLE_CELL.w,Math.floor(cell/PEOPLE_COLS)*PEOPLE_CELL.h,s,f);}});
}
export const styleIndex=kind=>PEOPLE_STYLES.findIndex(s=>s.kind===kind);
export const stylesOf=(...kinds)=>PEOPLE_STYLES.map((s,i)=>kinds.includes(s.kind)?i:-1).filter(i=>i>=0);
