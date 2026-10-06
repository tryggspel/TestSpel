// Four hand-drawn poses, baked at load. Animation only changes UVs on the existing card.
export function drawZombiePose(c,kind,frame=0){
  const ink='#1b3539',paper='#fff1ce',skin=kind==='tank'?'#a7b989':kind==='golden'?'#d8d58a':'#b4d58c';
  c.lineCap='round';c.lineJoin='round';const phase=frame*Math.PI/2,swing=Math.sin(phase),shirt=kind==='golden'?'#f2c44e':kind==='runner'?'#e78a5c':kind==='tank'?'#9489bb':kind==='artist'?'#b6c8cf':kind==='boss'?'#d8ac44':'#64a9a3';
  const shape=(fill,path,width=5)=>{c.beginPath();path();c.fillStyle=fill;c.fill();c.strokeStyle=ink;c.lineWidth=width;c.stroke();};
  const oval=(x,y,rx,ry,col)=>shape(col,()=>c.ellipse(x,y,rx,ry,0,0,Math.PI*2));
  const box=(x,y,w,h,col,r=5)=>shape(col,()=>c.roundRect(x,y,w,h,r));
  const limb=(x,y,len,angle,col,w)=>{c.save();c.translate(x,y);c.rotate(angle);box(-w/2,0,w,len,col,w/2);c.restore();};
  // Uneven knees, an untied trainer and an arm that is always late for the rest of the body.
  limb(99,273,65,swing*.19,'#3e5062',28);limb(155,273,65,-swing*.22,'#3e5062',29);
  box(72+swing*11,329,50,23,paper,10);box(132-swing*12,332,59,24,paper,10);
  c.strokeStyle=ink;c.lineWidth=3;c.beginPath();c.moveTo(180-swing*12,343);c.quadraticCurveTo(210,356,204,363);c.stroke();
  box(66,165,124,123,shirt,18);
  shape('#3c7772',()=>{c.moveTo(69,255);c.lineTo(190,252);c.lineTo(182,286);c.lineTo(167,274);c.lineTo(150,289);c.lineTo(135,278);c.lineTo(115,291);c.lineTo(98,277);c.lineTo(72,286);c.closePath();},3);
  limb(72,180,68,.45+swing*.18,skin,21);limb(181,180,65,-.9+swing*.13,skin,23);
  oval(44-swing*9,243,14,16,skin);oval(222-swing*5,214,15,17,skin);
  // Hunched head, asymmetric eyes and a stubborn single tooth.
  c.save();c.translate(128,149);c.rotate(-.12+swing*.055);c.translate(-128,-149);
  box(89,74,79,94,skin,25);oval(86,126,10,14,skin);oval(171,128,9,12,skin);
  shape('#43504b',()=>{c.moveTo(90,105);c.lineTo(89,76);c.lineTo(109,66);c.lineTo(121,80);c.lineTo(134,63);c.lineTo(154,80);c.lineTo(168,75);c.lineTo(169,102);c.closePath();},3);
  oval(109,119,17,20,paper);oval(148,125,19,24,paper);oval(111+swing*2,124,5,8,ink);oval(145-swing,134,5,7,ink);
  c.strokeStyle='#699477';c.lineWidth=4;c.beginPath();c.moveTo(96,143);c.lineTo(109,146);c.moveTo(146,153);c.lineTo(158,149);c.stroke();
  oval(128,153,15,7+(frame===2?4:0),ink);box(123,148,9,10,paper,1);
  if(kind==='runner')box(86,96,85,11,'#ee725d',3);
  if(kind==='tank'){box(82,71,91,25,'#705872',6);c.fillStyle=paper;c.font='900 13px sans-serif';c.textAlign='center';c.fillText('XL',128,89);}
  if(kind==='artist')for(let i=0;i<5;i++)oval(90+i*17,80,14,17,'#eee9d3');
  c.restore();
  box(94,176,70,16,paper,4);limb(104,182,56,.04+swing*.17,paper,17);
  c.fillStyle=ink;c.textAlign='center';c.font='900 23px sans-serif';c.fillText(kind==='golden'?'MIN!':kind==='runner'?'SEN!':kind==='tank'?'PÅTÅR':kind==='boss'?'90+':kind==='artist'?'KONST':'KAFFE?',134,246,104);
  // Props distinguish silhouettes from a distance; no extra meshes.
  if(kind==='tank'){box(201,189,34,66,'#d2ded2',6);box(198,183,39,13,'#4b6463');c.strokeStyle=paper;c.lineWidth=3;c.beginPath();c.moveTo(211,175);c.quadraticCurveTo(205,164,214,154);c.stroke();}
  if(kind==='runner'){box(211,196,27,22,paper,4);c.strokeStyle='#efc363';c.lineWidth=3;c.beginPath();c.moveTo(237,208);c.lineTo(247,219);c.stroke();}
  if(kind==='boss'){box(206,135,23,89,'#f3c453');oval(218,133,17,23,'#f3c453');c.fillStyle=ink;c.font='900 25px sans-serif';c.fillText('1',218,189);}
  if(kind==='artist'){box(220,144,8,90,'#aa7454',2);oval(224,140,9,18,'#a564a4');oval(42,251,28,19,'#dcb572');}
  // Guld-Gunnar: crown, a stolen giant cinnamon bun and sparkles that read from far away.
  if(kind==='golden'){
    shape('#f6cf4f',()=>{c.moveTo(92,72);c.lineTo(100,42);c.lineTo(115,62);c.lineTo(128,36);c.lineTo(141,62);c.lineTo(156,42);c.lineTo(164,72);c.closePath();},4);
    oval(222,212,30,24,'#c98a3f');c.strokeStyle='#7d4f22';c.lineWidth=4;c.beginPath();c.arc(222,212,15,0,Math.PI*1.6);c.stroke();
    c.fillStyle='#fff6c8';for(const [x,y,r] of [[40,90,7],[226,70,6],[30,190,5],[238,282,7],[58,320,5]]){c.beginPath();c.moveTo(x,y-r*2);c.lineTo(x+r*.5,y-r*.5);c.lineTo(x+r*2,y);c.lineTo(x+r*.5,y+r*.5);c.lineTo(x,y+r*2);c.lineTo(x-r*.5,y+r*.5);c.lineTo(x-r*2,y);c.lineTo(x-r*.5,y-r*.5);c.closePath();c.fill();}
  }
}
export function createZombieAtlases(texture){
  const cache=new Map();
  return kind=>{if(!cache.has(kind))cache.set(kind,texture((c,w,h)=>{for(let f=0;f<4;f++){c.save();c.translate(f*w/4,0);c.scale(w/4/256,h/384);drawZombiePose(c,kind,f);c.restore();}},1024,384));return cache.get(kind);};
}
