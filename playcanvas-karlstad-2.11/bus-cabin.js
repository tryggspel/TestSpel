// Original comic art. The cabin is painted once per size; only three passengers animate.
const ink='#182e32';
function poly(c,points,fill,line=4){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(line){c.strokeStyle=ink;c.lineWidth=line;c.stroke();}}
export function drawCabin(c,w,h){
  c.clearRect(0,0,w,h);c.save();c.scale(w/600,h/900);
  // Large transparent windscreen; the existing 3D city moves behind it.
  poly(c,[[0,0],[600,0],[458,202],[142,202]],'#ebd6a0');
  poly(c,[[0,0],[142,202],[142,446],[0,710]],'#789a8e');
  poly(c,[[600,0],[458,202],[458,446],[600,710]],'#6b9187');
  poly(c,[[0,710],[142,446],[458,446],[600,710],[600,900],[0,900]],'#43636a');
  for(const y of [480,539,621,723,840]){c.strokeStyle='#9dbbb0';c.lineWidth=3;c.beginPath();c.moveTo(0,y);c.lineTo(600,y);c.stroke();}
  poly(c,[[259,446],[341,446],[423,900],[177,900]],'#718c80');
  c.setLineDash([14,10]);c.strokeStyle='#c4d3a9';c.lineWidth=2;for(const x of [267,333]){c.beginPath();c.moveTo(x,460);c.lineTo(x<300?213:387,900);c.stroke();}c.setLineDash([]);
  // Roof ribs and recessed lamps.
  for(const [x,y] of [[15,32],[70,95],[109,147]]){c.strokeStyle='#a99e79';c.lineWidth=5;c.beginPath();c.moveTo(x,y);c.lineTo(600-x,y);c.stroke();}
  for(const x of [213,367]){poly(c,[[x,95],[x+27,95],[x+15,172],[x-5,172]],'#fff9d6',3);}
  // Side windows are intentionally open, showing the moving city.
  c.clearRect(18,206,72,132);c.clearRect(510,206,72,132);
  c.strokeStyle=ink;c.lineWidth=7;c.strokeRect(18,206,72,132);c.strokeRect(510,206,72,132);
  c.fillStyle='#d6f4e826';c.fillRect(18,206,72,132);c.fillRect(510,206,72,132);
  // Front window seal, destination plate, wipers and dashboard.
  c.strokeStyle=ink;c.lineWidth=11;c.strokeRect(142,202,316,245);c.strokeStyle='#ecdeb1';c.lineWidth=3;c.strokeRect(132,192,336,265);
  poly(c,[[146,447],[454,447],[476,478],[124,478]],'#203d43');
  c.strokeStyle='#243a38';c.lineWidth=5;for(const x of [205,335]){c.beginPath();c.moveTo(x,443);c.lineTo(x+58,386);c.stroke();}
  c.fillStyle='#172f32';c.fillRect(182,155,236,34);c.fillStyle='#f8d577';c.textAlign='center';c.font='900 18px sans-serif';c.fillText('666  •  SISTA HÅLLPLATSEN',300,179,218);
  // Seats in perspective, with chunky ink outlines and fabric highlights.
  for(const side of [-1,1])for(let row=0;row<3;row++){
    const width=56+row*23,x=side<0?119-row*38:425+row*15,y=399+row*75;
    poly(c,[[x,y],[x+width,y+5],[x+width+5,y+94],[x-8,y+84]],row===1?'#b56856':'#267f7d',5);
    poly(c,[[x-8,y+84],[x+width+5,y+94],[x+width+17,y+120],[x-17,y+105]],'#daae67',5);
    c.strokeStyle='#f3d0a2';c.lineWidth=3;c.beginPath();c.moveTo(x+10,y+15);c.lineTo(x+width-12,y+19);c.stroke();
    c.fillStyle='#f0d896';for(let dot=0;dot<5;dot++)c.fillRect(x+10+(dot%2)*19,y+29+dot*9,4,4);
  }
  // Yellow rails and grab handles lead the eye into the bus.
  for(const side of [-1,1]){
    const x=side<0?101:499,end=side<0?217:383;
    c.lineCap='round';c.strokeStyle=ink;c.lineWidth=12;c.beginPath();c.moveTo(x,94);c.lineTo(end,211);c.lineTo(end,482);c.stroke();c.strokeStyle='#f5c968';c.lineWidth=7;c.stroke();
    for(let i=0;i<3;i++){const hx=x+(end-x)*i/3,hy=94+(211-94)*i/3;c.strokeStyle=ink;c.lineWidth=4;c.beginPath();c.moveTo(hx,hy);c.lineTo(hx,hy+35);c.stroke();poly(c,[[hx-12,hy+35],[hx+12,hy+35],[hx+9,hy+55],[hx-9,hy+55]],'#e9c874',3);}
  }
  // Local humour stays legible and doesn't cover the road.
  c.save();c.translate(65,377);c.rotate(-.08);c.fillStyle='#fff0b9';c.fillRect(-49,-18,98,42);c.strokeStyle=ink;c.lineWidth=3;c.strokeRect(-49,-18,98,42);c.fillStyle=ink;c.font='900 11px sans-serif';c.fillText('HÅLL I DIG.',0,-1);c.fillText('INTE I MIG.',0,15);c.restore();
  c.fillStyle='#172f32';c.fillRect(450,352,132,24);c.fillStyle='#f3d786';c.font='900 10px sans-serif';c.fillText('KAFFE PÅ EGEN RISK',516,368);
  c.restore();
}
export function drawPassengers(c,w,h,state,sprites=[]){
  c.clearRect(0,0,w,h);c.save();c.translate(w/2,0);c.scale(h/900,h/900);c.translate(-300,0);
  for(const [i,p] of state.passengers.entries()){
    const x=[220,376,291][i]+p.x*105,y=[493,551,630][i]-p.bounce*55,size=[111,128,147][i];
    c.save();c.translate(x,y);c.rotate(p.angle);c.fillStyle='#12272c55';c.beginPath();c.ellipse(0,8,size*.35,9,0,0,Math.PI*2);c.fill();
    if(sprites[i])c.drawImage(sprites[i],-size/2,-size*1.5,size,size*1.5);
    else {c.fillStyle=['#c98559','#a3b56d','#9276b8'][i];c.strokeStyle=ink;c.lineWidth=5;c.fillRect(-size*.27,-size*.9,size*.54,size*.7);c.strokeRect(-size*.27,-size*.9,size*.54,size*.7);c.fillStyle='#a8c88b';c.beginPath();c.ellipse(0,-size*1.05,size*.22,size*.29,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=ink;c.fillRect(-size*.14,-size*1.12,7,6);c.fillRect(size*.07,-size*1.12,7,6);c.fillRect(-size*.05,-size*.91,size*.17,5);}
    c.restore();
    if(p.fallen){c.save();c.translate(x,y-size*.4);c.rotate(-.12);c.font='900 24px sans-serif';c.strokeStyle=ink;c.lineWidth=5;c.strokeText('DUNS!',0,0);c.fillStyle='#ffe887';c.fillText('DUNS!',0,0);c.restore();}
  }
  if(state.elapsed>9){for(let i=0;i<2;i++){const x=300+Math.sin(state.elapsed*2+i*3)*100+state.roll*40,y=462+i*71-Math.abs(Math.sin(state.elapsed*3+i))*50;c.save();c.translate(x,y);c.rotate(state.roll+i*.5);poly(c,[[-9,-16],[11,-16],[7,5],[-6,5]],'#aa75cb',3);c.fillStyle='#eee1b4';c.fillRect(-11,-20,24,5);c.fillStyle='#693f24';for(let k=0;k<3;k++)c.fillRect(13+k*7,-12-k*6,4,6);c.restore();}}
  c.restore();
}
export function createCabinView(canvas,passengerCanvas,textures){
  const sprites=textures.map(t=>t.getSource()),c=canvas.getContext('2d'),p=passengerCanvas.getContext('2d');let active=false,last=null,acc=0;
  function resize(){if(!active)return;const scale=Math.min(1.25,1000/Math.max(window.innerWidth,window.innerHeight));canvas.width=passengerCanvas.width=Math.round(window.innerWidth*scale);canvas.height=passengerCanvas.height=Math.round(window.innerHeight*scale);drawCabin(c,canvas.width,canvas.height);if(last)drawPassengers(p,canvas.width,canvas.height,last,sprites);}
  window.addEventListener('resize',resize);
  return {start(){active=true;last=null;acc=0;resize();},stop(){active=false;last=null;},draw(state,dt=1){if(!active)return;acc+=dt;if(acc<1/30)return;acc%=1/30;last=state;drawPassengers(p,canvas.width,canvas.height,state,sprites);}};
}
