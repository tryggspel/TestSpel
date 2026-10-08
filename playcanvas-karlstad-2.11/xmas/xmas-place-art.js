// Julklappsjakten: julens föremål i butiksuppdragen (lussebulle, pepparkaka, glögg). Samma stil som place-art.js: tjock mörk kontur, platta
// färger, 256×256-ruta. Läggs in med registerProp så att grundspelets fil inte behöver ändras för varje ny sak.
import {registerProp} from '../place-art.js?v=2.21.1-xmas.2';
export {hasProp,drawProp,drawItemCard,drawMenuBoard} from '../place-art.js?v=2.21.1-xmas.2'; // samma modulinstans som föremålen registreras i
const INK='#122b2b';
function shape(c,fill,fn,lw=7){c.beginPath();fn();c.fillStyle=fill;c.fill();c.lineWidth=lw;c.strokeStyle=INK;c.lineJoin='round';c.lineCap='round';c.stroke();}
function line(c,color,lw,fn){c.beginPath();fn();c.strokeStyle=color;c.lineWidth=lw;c.lineCap='round';c.lineJoin='round';c.stroke();}
export const XMAS_PROPS=Object.freeze({
  // Lussebulle: S-formad, safransgul, med en russin i varje snurr.
  lussebulle(c){
    shape(c,'#8a5530',()=>c.ellipse(128,196,96,26,0,0,Math.PI*2),6);
    shape(c,'#f0b73a',()=>{c.moveTo(54,168);c.quadraticCurveTo(48,96,112,92);c.quadraticCurveTo(160,92,150,128);c.quadraticCurveTo(142,152,112,150);c.quadraticCurveTo(150,158,170,176);c.quadraticCurveTo(196,198,170,208);c.quadraticCurveTo(110,214,54,168);c.closePath();});
    shape(c,'#f0b73a',()=>{c.moveTo(150,70);c.quadraticCurveTo(206,62,214,110);c.quadraticCurveTo(216,150,178,152);c.quadraticCurveTo(160,150,162,134);c.quadraticCurveTo(180,134,184,114);c.quadraticCurveTo(186,92,150,98);c.closePath();},6);
    line(c,'#fff0b0',6,()=>{c.moveTo(70,150);c.quadraticCurveTo(66,112,104,106);});
    for(const [x,y] of [[96,120],[182,118]]){c.fillStyle='#4a2a1f';c.beginPath();c.ellipse(x,y,9,7,.4,0,Math.PI*2);c.fill();}
  },
  // Pepparkaksgubbe med glasyr.
  pepparkaka(c){
    shape(c,'#b8743a',()=>{c.moveTo(128,40);c.bezierCurveTo(176,30,190,86,150,102);c.lineTo(214,112);c.quadraticCurveTo(232,126,214,142);c.lineTo(158,142);c.lineTo(188,218);c.quadraticCurveTo(176,238,156,222);c.lineTo(128,170);c.lineTo(100,222);c.quadraticCurveTo(80,238,68,218);c.lineTo(98,142);c.lineTo(42,142);c.quadraticCurveTo(24,126,42,112);c.lineTo(106,102);c.bezierCurveTo(66,86,80,30,128,40);c.closePath();});
    c.fillStyle='#2d1c14';c.beginPath();c.arc(112,76,6,0,7);c.arc(144,76,6,0,7);c.fill();
    line(c,'#2d1c14',5,()=>{c.moveTo(108,94);c.quadraticCurveTo(128,112,148,94);});
    for(const y of [128,152])line(c,'#fff7e6',9,()=>{c.moveTo(114,y);c.lineTo(114,y+1);});
    for(const y of [128,152])line(c,'#fff7e6',9,()=>{c.moveTo(142,y);c.lineTo(142,y+1);});
    line(c,'#fff7e6',7,()=>{c.moveTo(46,127);c.quadraticCurveTo(70,121,96,126);c.moveTo(160,126);c.quadraticCurveTo(184,121,210,127);});
    line(c,'#d94a4a',9,()=>{c.moveTo(106,108);c.quadraticCurveTo(128,122,150,108);});
  },
  // Kopp med varm glögg och mandel.
  glogg(c){
    shape(c,'#efe8d3',()=>c.ellipse(128,208,92,20,0,0,Math.PI*2),6);
    line(c,INK,18,()=>c.arc(196,138,24,-1.1,1.4));line(c,'#b0302f',8,()=>c.arc(196,138,24,-1.1,1.4));
    shape(c,'#b0302f',()=>{c.moveTo(54,96);c.lineTo(198,96);c.quadraticCurveTo(198,198,126,202);c.quadraticCurveTo(54,198,54,96);c.closePath();});
    shape(c,'#6d1e3c',()=>c.ellipse(126,96,72,14,0,0,Math.PI*2),6);
    c.fillStyle='#fff0cd';for(const [x,y] of [[96,92],[138,98],[156,90]]){c.beginPath();c.ellipse(x,y,7,5,.3,0,Math.PI*2);c.fill();}
    for(const dx of [-18,12])line(c,'#ffffffcc',6,()=>{c.moveTo(126+dx,72);c.bezierCurveTo(114+dx,56,138+dx,44,126+dx,28);});
  }
});
let done=false;
export function registerXmasProps(){if(done)return true;for(const [k,f] of Object.entries(XMAS_PROPS))registerProp(k,f);done=true;return true;}
registerXmasProps();
