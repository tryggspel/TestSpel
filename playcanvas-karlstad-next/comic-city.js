const ink='#253d40',cream='#fff0c8';
const palettes=[['#eeb985','#d88c67','#ae4e45'],['#a7c7b4','#789e91','#367c75'],['#dec5a0','#b29a7e','#70568a'],['#c4b6d7','#9886b7','#a85159']];
const shops=[['PÅTÅR & PANIK','ÖPPET TILLS VIDARE'],['KARLSTAD LEVER','KAFFE • KULTUR • KAOS'],['HERR GÅRMAN','GÅ. GÄRNA FORT.'],['DEN SISTA BULLEN','EN PER ÖVERLEVANDE']];
export function drawComicFacade(c,w,h,variant=0){
  c.save();c.scale(w/640,h/768);c.lineJoin='round';const [wall,shade,accent]=palettes[variant%4];
  const box=(x,y,w,h,fill,line=3)=>{c.fillStyle=fill;c.fillRect(x,y,w,h);if(line){c.strokeStyle=ink;c.lineWidth=line;c.strokeRect(x,y,w,h);}};
  box(0,0,640,768,wall,0);box(0,0,640,20,ink,0);box(0,23,640,14,cream,0);box(0,40,640,19,shade,0);
  // Ink hatch shadows and dotted print texture, baked into four shared textures.
  c.fillStyle=shade;for(let x=15;x<640;x+=22)for(let y=65;y<610;y+=25)c.fillRect(x+(y%2)*6,y,2,2);
  box(0,60,25,545,shade,0);box(615,60,25,545,shade,0);
  for(const y of [211,381,551]){box(15,y+6,610,12,shade,0);box(12,y,616,6,cream,0);}
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
    const x=46+col*147,y=70+row*170;box(x+9,y+13,103,127,shade,0);box(x-7,y-6,111,133,cream,3);box(x,y,97,116,'#385e6a',5);
    c.save();c.beginPath();c.rect(x+3,y+3,91,110);c.clip();c.fillStyle='#a4d5cf';c.beginPath();c.moveTo(x,y+12);c.lineTo(x+83,y);c.lineTo(x+7,y+104);c.lineTo(x,y+104);c.fill();c.fillStyle='#c6dfcf55';c.beginPath();c.moveTo(x+74,y);c.lineTo(x+94,y);c.lineTo(x+39,y+117);c.lineTo(x+20,y+117);c.fill();c.restore();
    box(x+44,y,8,117,cream,2);box(x,y+48,97,7,cream,2);box(x-12,y+123,121,10,ink,0);box(x-14,y+118,123,9,cream,2);
    if((row+col+variant)%3===0){box(x+6,y+106,85,18,accent,3);c.fillStyle='#357665';for(let leaf=0;leaf<6;leaf++){c.beginPath();c.ellipse(x+15+leaf*13,y+100-(leaf%2)*7,10,12,leaf*.5,0,Math.PI*2);c.fill();}c.fillStyle='#ffe0aa';for(let j=0;j<3;j++){c.beginPath();c.arc(x+20+j*26,y+92,5,0,Math.PI*2);c.fill();}}
  }
  box(14,587,612,181,ink,0);box(22,626,271,135,'#487e82',3);box(349,626,269,135,'#3a696d',3);box(297,626,48,142,'#303c3c',3);box(305,637,31,74,'#b9cbb0',2);box(331,722,5,12,cream,0);
  // Illustrated shop displays: lamp, cups, pastry, plant, hand-lettered humour.
  for(const x of [82,403]){c.strokeStyle=ink;c.lineWidth=4;c.beginPath();c.moveTo(x,625);c.lineTo(x,649);c.stroke();c.fillStyle='#f5d28d';c.beginPath();c.moveTo(x-22,665);c.lineTo(x,644);c.lineTo(x+22,665);c.fill();box(x-25,713,117,8,'#e1b98b',3);for(let j=0;j<3;j++){box(x-10+j*32,690,20,21,cream,2);c.strokeStyle=cream;c.lineWidth=4;c.strokeRect(x+10+j*32,695,7,9);}}
  c.save();c.translate(520,690);c.rotate(-.07);box(-44,-27,91,58,'#ffe4a4',3);c.fillStyle=ink;c.textAlign='center';c.font='900 15px sans-serif';c.fillText('INGEN',0,-4);c.fillText('ÅTERBÄRING',0,17,83);c.restore();
  box(12,548,616,52,accent,4);c.fillStyle=cream;c.font='900 29px sans-serif';c.textAlign='center';c.fillText(shops[variant%4][0],320,585,570);
  for(let i=0;i<14;i++){box(12+i*44,601,44,25,i%2?cream:accent,1);c.fillStyle=i%2?cream:accent;c.beginPath();c.arc(34+i*44,626,22,0,Math.PI);c.fill();c.strokeStyle=ink;c.lineWidth=2;c.stroke();}
  box(29,743,248,18,cream,1);c.fillStyle=ink;c.font='900 10px sans-serif';c.fillText(shops[variant%4][1],153,756,237);
  box(0,758,640,10,ink,0);c.restore();
}
export function createComicCity(host,{texture,card}){
  const textures=Array.from({length:4},(_,i)=>texture((c,w,h)=>drawComicFacade(c,w,h,i),512,768)),views=[];
  const buildings=host.colliders.filter(b=>b.height>=6&&!/O.Leary|Mitt|Sandgrund/i.test(b.name)).sort((a,b)=>Math.hypot((a.minx+a.maxx)/2,(a.minz+a.maxz)/2)-Math.hypot((b.minx+b.maxx)/2,(b.minz+b.maxz)/2)).slice(0,16);
  for(const [i,b] of buildings.entries()){
    const cx=(b.minx+b.maxx)/2,cz=(b.minz+b.maxz)/2;
    const faces=[{x:cx,z:b.minz-.23,yaw:180,width:b.maxx-b.minx,test:{x:cx,z:b.minz-3}},{x:cx,z:b.maxz+.23,yaw:0,width:b.maxx-b.minx,test:{x:cx,z:b.maxz+3}},{x:b.minx-.23,z:cz,yaw:-90,width:b.maxz-b.minz,test:{x:b.minx-3,z:cz}},{x:b.maxx+.23,z:cz,yaw:90,width:b.maxz-b.minz,test:{x:b.maxx+3,z:cz}}].filter(f=>f.width>7&&!host.blocked(f.test.x,f.test.z)).slice(0,2);
    for(const face of faces){const e=card('Serietecknad gatufasad',textures[i%4],Math.min(24,face.width-.5),Math.min(14,b.height-.2),face.x,.13,face.z);e.setEulerAngles(0,face.yaw,0);views.push({e,x:face.x,z:face.z});}
  }
  return {update(p){for(const v of views)v.e.enabled=Math.hypot(p.x-v.x,p.z-v.z)<100;},count:views.length};
}
