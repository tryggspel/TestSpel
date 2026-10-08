// Julklappsjakten: Tomtezombies. Samma tecknade zombier som i grundspelet (zombie-art.js) med tomteluva, namnskylt och en egen sak i handen,
// bakade till samma sorts bildruta (4 poser i en bild) så att zombielägets pooler, rörelser och gränser fungerar oförändrade.
// Varianterna följer grundspelets fyra zombietyper: walker = Paket-Pelle, runner = Stress-Nisse, tank = Gröt-Gunnar, golden = Guld-Nisse.
import {drawZombiePose} from '../zombie-art.js?v=2.21.1-xmas.1';

export const TOMTEZOMBIE_NAMES=Object.freeze({walker:'Paket-Pelle',runner:'Stress-Nisse',tank:'Gröt-Gunnar',golden:'Guld-Nisse'});
export const TOMTEZOMBIE_NOTES=Object.freeze({walker:'Vanlig tomtezombie som bär ett paket',runner:'Snabb och stressad',tank:'Tung, långsam och seg',golden:'Sällsynt: fånga för bonus'});
const STYLE=Object.freeze({
  walker:{hat:'#d33a3a',trim:'#ffffff',tag:'PAKET?'},
  runner:{hat:'#e8863a',trim:'#fff1ce',tag:'SEN!'},
  tank:{hat:'#4a6fa8',trim:'#f4efe3',tag:'GRÖT'},
  golden:{hat:'#f6cf4f',trim:'#fff6c8',tag:'MIN!'}
});
const INK='#1b3539';
export function drawTomteZombiePose(c,kind,frame=0){
  drawZombiePose(c,kind,frame);
  const st=STYLE[kind];if(!st)return;
  const swing=Math.sin(frame*Math.PI/2);
  c.save();c.lineCap='round';c.lineJoin='round';
  const shape=(fill,path,w=5)=>{c.beginPath();path();c.fillStyle=fill;c.fill();c.strokeStyle=INK;c.lineWidth=w;c.stroke();};
  // namnskylt på magen (täcker grundspelets text)
  shape('#fff1ce',()=>c.roundRect(78,224,112,34,9),4);
  c.fillStyle=INK;c.textAlign='center';c.font='900 23px sans-serif';c.fillText(st.tag,134,249,96);
  // sak i handen
  if(kind==='walker'){
    const gx=204-swing*5,gy=198;
    shape('#4a86c9',()=>c.roundRect(gx,gy,46,40,6),5);shape('#ffd45a',()=>c.rect(gx+19,gy,9,40),3);shape('#ffd45a',()=>c.rect(gx,gy+15,46,9),3);
    shape('#e8554e',()=>c.ellipse(gx+17,gy-5,10,7,-.5,0,Math.PI*2),3);shape('#e8554e',()=>c.ellipse(gx+31,gy-5,10,7,.5,0,Math.PI*2),3);
  }
  if(kind==='tank'){
    // en skål gröt med smörklick över termosen
    shape('#e8f0f7',()=>{c.moveTo(186,228);c.quadraticCurveTo(190,268,220,270);c.quadraticCurveTo(250,268,254,228);c.closePath();},5);
    shape('#4a6fa8',()=>c.rect(188,236,64,9),3);
    shape('#f4e6c8',()=>c.ellipse(220,226,34,13,0,0,Math.PI*2),5);shape('#ffd45a',()=>c.ellipse(222,219,9,6,0,0,Math.PI*2),3);
    c.strokeStyle=INK;c.lineWidth=5;c.beginPath();c.moveTo(238,224);c.lineTo(258,196);c.stroke();shape('#d9d2c4',()=>c.ellipse(260,192,9,6,.6,0,Math.PI*2),3);
  }
  if(kind==='runner'){
    for(const [x,y,s] of [[196,104,1],[208,126,.8],[190,138,.7]])shape('#9fd5ee',()=>{c.moveTo(x,y-14*s);c.quadraticCurveTo(x+10*s,y+2*s,x,y+8*s);c.quadraticCurveTo(x-10*s,y+2*s,x,y-14*s);c.closePath();},3);
    c.strokeStyle='#ffffffcc';c.lineWidth=5;for(const y of [196,224,252]){c.beginPath();c.moveTo(18-swing*6,y);c.lineTo(58-swing*6,y+3);c.stroke();}
  }
  // tomteluva i huvudets lutning
  c.save();c.translate(128,149);c.rotate(-.12+swing*.055);c.translate(-128,-149);
  shape(st.hat,()=>{c.moveTo(84,100);c.quadraticCurveTo(88,46,134,32);c.quadraticCurveTo(190,24,214,72);c.quadraticCurveTo(222,92,208,104);c.quadraticCurveTo(190,80,172,86);c.lineTo(172,102);c.closePath();},5);
  shape(st.trim,()=>c.roundRect(80,86,98,22,10),4);
  shape(st.trim,()=>c.ellipse(212,98,14,14,0,0,Math.PI*2),4);
  if(kind==='golden'){c.fillStyle='#fff6c8';for(const [x,y,r] of [[96,52,6],[226,64,7],[150,20,5]]){c.beginPath();c.moveTo(x,y-r*2);c.lineTo(x+r*.5,y-r*.5);c.lineTo(x+r*2,y);c.lineTo(x+r*.5,y+r*.5);c.lineTo(x,y+r*2);c.lineTo(x-r*.5,y+r*.5);c.lineTo(x-r*2,y);c.lineTo(x-r*.5,y-r*.5);c.closePath();c.fill();}}
  c.restore();
  c.restore();
}
// Samma upplägg som createZombieAtlases: en bild per typ med fyra poser, bakad en gång när den först behövs.
export function createXmasZombieAtlases(texture){
  const cache=new Map();
  return kind=>{if(!cache.has(kind))cache.set(kind,texture((c,w,h)=>{for(let f=0;f<4;f++){c.save();c.translate(f*w/4,0);c.scale(w/4/256,h/384);drawTomteZombiePose(c,kind,f);c.restore();}},1024,384));return cache.get(kind);};
}
