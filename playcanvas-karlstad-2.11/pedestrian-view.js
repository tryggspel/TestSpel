// 2.11: GÅGATA-skyltar (blå skylt med gående, egen teckning) där gågatorna börjar.
import {GAGATA_SIGNS} from './pedestrian.mjs?v=2.21.1-xmas.1';
export function createPedestrianSigns({card,texture,primitive,material}){
  const tex=texture((c,w,h)=>{
    c.fillStyle='#ffffff';c.fillRect(0,0,w,h);
    c.fillStyle='#1d5fb4';c.fillRect(10,10,w-20,w-20);
    // Egen förenklad figur: vuxen och barn som går.
    c.fillStyle='#ffffff';c.lineCap='round';c.strokeStyle='#ffffff';
    const fig=(x,s)=>{c.beginPath();c.arc(x,70*s+20,16*s,0,7);c.fill();c.lineWidth=18*s;
      c.beginPath();c.moveTo(x,95*s+20);c.lineTo(x-4*s,170*s+20);c.stroke();
      c.beginPath();c.moveTo(x-4*s,170*s+20);c.lineTo(x-26*s,225*s+20);c.moveTo(x-4*s,170*s+20);c.lineTo(x+20*s,225*s+20);c.stroke();
      c.beginPath();c.moveTo(x,110*s+20);c.lineTo(x+26*s,150*s+20);c.moveTo(x,110*s+20);c.lineTo(x-26*s,150*s+20);c.stroke();};
    fig(w*.42,1);fig(w*.66,.66);
    c.fillStyle='#1d5fb4';c.font='900 40px system-ui,sans-serif';c.textAlign='center';c.fillText('GÅGATA',w/2,h-26);
  },256,320);
  const pole=material('#41565a');
  return GAGATA_SIGNS.map(s=>{
    primitive('gågata-stolpe','cylinder',s.x,1.3,s.z,.12,2.6,.12,pole);
    const e=card('Gågata · '+s.name,tex,1.1,1.38,s.x,1.9,s.z,true);e.setEulerAngles(0,s.yaw,0);return e;
  });
}
