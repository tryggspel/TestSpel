// Julbåten: vinterlandskap och juldetaljer för båtbussens bild (boat-ride.js, ritas på ett 2D-canvas). Grundspelets bild är en sommardag; i julbygget används den här istället:
// skymning med norrsken och måne, snötäckta kullar och hus med tända fönster och ljusslingor, granar med ljus, isflak på vattnet, snöfall och en tomte på släde som flyger förbi.
// Bara ritfunktioner: de tar ett 2D-sammanhang och ritar. Inget läses eller sparas, och inga bildfiler hämtas.
const INK='#1c4249',CREAM='#fff0cb';
const hash=n=>{let h=2166136261;for(const ch of String(n)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)/4294967296;};
const LIGHTS=['#ff5a5a','#ffd45a','#6dffb4','#7ad9ff','#ff8fd0'];

// Himmel, måne, stjärnor, norrsken och vatten: ritas en gång (på `back`).
export function winterBackdrop(g,w,h){
  const sky=g.createLinearGradient(0,0,0,h*.4);sky.addColorStop(0,'#13254a');sky.addColorStop(.55,'#3e5e92');sky.addColorStop(1,'#efc1a8');
  g.fillStyle=sky;g.fillRect(0,0,w,h*.42);
  for(let i=0;i<48;i++){g.globalAlpha=.5+hash('a'+i)*.45;g.fillStyle='#fff';g.beginPath();g.arc(hash('x'+i)*w,hash('y'+i)*h*.27,.8+hash('r'+i)*1.5,0,7);g.fill();}
  g.globalAlpha=1;
  // norrsken: tre band som böljar över himlen
  [['#6dffb4',.17,.06],['#7ad9ff',.12,.12],['#b79bff',.09,.17]].forEach(([col,a,y0],bi)=>{
    g.beginPath();g.moveTo(0,h*(y0+.05));
    for(let x=0;x<=w;x+=w/24)g.lineTo(x,h*(y0+.045*Math.sin(x/w*Math.PI*3+bi*1.7)+.025*Math.sin(x/w*Math.PI*7+bi)));
    for(let x=w;x>=0;x-=w/24)g.lineTo(x,h*(y0+.16+.04*Math.sin(x/w*Math.PI*2.4+bi*2.3)));
    g.closePath();const gr=g.createLinearGradient(0,h*y0,0,h*(y0+.2));gr.addColorStop(0,col);gr.addColorStop(1,'rgba(255,255,255,0)');
    g.globalAlpha=a*2;g.fillStyle=gr;g.fill();
  });
  g.globalAlpha=1;
  const mx=w*.78,my=h*.17,halo=g.createRadialGradient(mx,my,w*.02,mx,my,w*.13);halo.addColorStop(0,'rgba(255,248,220,.55)');halo.addColorStop(1,'rgba(255,248,220,0)');
  g.fillStyle=halo;g.fillRect(mx-w*.14,my-w*.14,w*.28,w*.28);
  g.fillStyle='#f8f3dc';g.beginPath();g.arc(mx,my,w*.036,0,7);g.fill();g.fillStyle='#e7dfbf';for(const [dx,dy,r] of [[-.01,-.006,.006],[.012,.008,.005],[.004,-.016,.004]]){g.beginPath();g.arc(mx+dx*w,my+dy*w,r*w,0,7);g.fill();}
  const wt=g.createLinearGradient(0,h*.38,0,h);wt.addColorStop(0,'#719fb5');wt.addColorStop(1,'#25526b');g.fillStyle=wt;g.fillRect(0,h*.38,w,h*.62);
  // månens stig på vattnet
  g.fillStyle='rgba(255,246,214,.28)';for(let i=0;i<9;i++){const y=h*(.4+i*.034),ww=w*(.1-i*.008);g.fillRect(mx-ww/2+Math.sin(i*1.7)*w*.01,y,ww,Math.max(2,h*.008));}
}

// De två remsorna som rullar förbi (far = kullar och stad långt bort, near = stranden). L = remsans bredd (2 × bildens), H = höjd.
export function winterStrips(far,near,w,h){
  const L=far.width,H=far.height,f=far.getContext('2d'),n=near.getContext('2d');
  const snowCap=(c,x,y,bw,th)=>{c.fillStyle='#f8fbff';c.fillRect(x-2,y-th,bw+4,th);c.fillStyle='#d9e6f2';c.fillRect(x-2,y-th*.35,bw+4,th*.35);};
  const win=(c,x,y,ww,hh,i)=>{c.fillStyle=hash('w'+i)>.3?'#ffd884':'#2a4658';c.fillRect(x,y,ww,hh);};
  // långt bort: snötäckta kullar
  f.fillStyle='#d5e3ef';f.beginPath();f.moveTo(0,H);for(let x=0;x<=L;x+=L/44)f.lineTo(x,H*(.35+.2*Math.sin(x/L*Math.PI*6)+.1*Math.sin(x/L*Math.PI*14)));f.lineTo(L,H);f.fill();
  f.fillStyle='#f4f9fd';f.beginPath();f.moveTo(0,H);for(let x=0;x<=L;x+=L/44)f.lineTo(x,H*(.31+.2*Math.sin(x/L*Math.PI*6)+.1*Math.sin(x/L*Math.PI*14)));f.lineTo(L,H);f.fill();
  for(let i=0;i<16;i++){const x=i*L/16+L*.01,bw=w*.05,bh=H*(.3+hash(i)*.35);f.fillStyle=['#8d7f93','#9b8a7c','#84889c','#7c8d94'][i%4];f.fillRect(x,H-bh,bw,bh);snowCap(f,x,H-bh,bw,6);
    for(let q=0;q<3;q++)for(let r=0;r<Math.floor(bh/14);r++)win(f,x+4+q*bw*.3,H-bh+8+r*13,bw*.14,6,i*31+q*7+r);}
  // stranden: hus med snö på taken och tända fönster, bryggor och granar med ljus
  for(let i=0;i<14;i++){const x=i*L/14+hash(i+40)*w*.05,kind=i%4;
    if(kind===0||kind===2){const bw=w*.1,bh=H*.62;n.fillStyle=i%2?'#a9604d':'#c19a5e';n.fillRect(x,H-bh,bw,bh);snowCap(n,x,H-bh,bw,H*.07);
      for(let q=0;q<5;q++){win(n,x+q*bw/5.5+4,H-bh+8,bw*.08,bh*.25,i*13+q);}
      // ljusslinga längs takkanten
      for(let q=0;q<=10;q++){const lx=x+q*bw/10,ly=H-bh+H*.02+Math.sin(q/10*Math.PI)*4;n.fillStyle=LIGHTS[(q+i)%LIGHTS.length];n.beginPath();n.arc(lx,ly,2.4,0,7);n.fill();}}
    else if(kind===1){n.fillStyle='#8e6a49';n.fillRect(x,H*.8,w*.12,H*.1);snowCap(n,x,H*.8,w*.12,H*.05);for(let q=0;q<4;q++){n.fillStyle='#6d4f36';n.fillRect(x+q*w*.035,H*.8,5,H*.2);}
      n.fillStyle='#3a2a22';n.fillRect(x+w*.1,H*.5,4,H*.3);n.fillStyle='#ffd884';n.beginPath();n.arc(x+w*.1+2,H*.48,5,0,7);n.fill();} // lykta på bryggan
    else{for(let q=0;q<4;q++){const tx=x+q*w*.03,top=H*.25+(q%2)*H*.06;n.fillStyle=q%2?'#245c42':'#2f6f4e';n.beginPath();n.moveTo(tx,H);n.lineTo(tx+w*.025,top);n.lineTo(tx+w*.05,H);n.fill();
      n.fillStyle='#f8fbff';n.beginPath();n.moveTo(tx+w*.0125,top+H*.22);n.lineTo(tx+w*.025,top);n.lineTo(tx+w*.0375,top+H*.22);n.closePath();n.fill();
      for(let b=0;b<5;b++){n.fillStyle=LIGHTS[(b+q+i)%LIGHTS.length];n.beginPath();n.arc(tx+w*.025+(b%2?-1:1)*w*.008*(b%3+1)*.5,top+H*(.18+b*.11),2.2,0,7);n.fill();}}}}
}

// Snöfall över hela bilden (ritas sist, före texterna). Ren funktion av tiden.
export function snowfall(c,t,w,h,count=70){
  c.save();c.fillStyle='#ffffff';
  for(let i=0;i<count;i++){
    const sp=.05+hash('s'+i)*.08,x=((hash('p'+i)*w+Math.sin(t*.7+i)*w*.02-t*w*.012*(1+hash('d'+i)))%w+w)%w,y=((hash('q'+i)*h+t*h*sp)%h+h)%h,r=1.2+hash('r'+i)*2.4;
    c.globalAlpha=.55+hash('o'+i)*.4;c.beginPath();c.arc(x,y,r,0,7);c.fill();
  }
  c.restore();
}

// Isflak som driver förbi på vattnet (rör sig åt samma håll som stranden).
export function iceFloes(c,t,w,h,returning=false){
  c.save();c.lineWidth=2;c.strokeStyle=INK;
  for(let i=0;i<6;i++){
    const u=((hash('f'+i)+t*(.012+hash('g'+i)*.01)*(returning?-1:1))%1+1)%1,x=u*w*1.2-w*.1,y=h*(.46+hash('h'+i)*.3),rx=w*(.035+hash('i'+i)*.04),ry=rx*.22;
    c.fillStyle='#eef6fb';c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill();c.stroke();
    c.fillStyle='#cfe1ee';c.beginPath();c.ellipse(x+rx*.1,y+ry*.28,rx*.78,ry*.45,0,0,7);c.fill();
    c.fillStyle='#fbfdff';c.beginPath();c.ellipse(x-rx*.15,y-ry*.35,rx*.5,ry*.4,0,0,7);c.fill();
  }
  c.restore();
}

// Ljusslinga längs båtens tak och räcken: lamporna blinkar i tre grupper. Ritas inuti båtens gungning.
export function boatLights(c,t,w,h){
  c.save();
  const bulb=(x,y,i)=>{const on=Math.sin(t*3+(i%3)*2.1)>-.35;c.fillStyle=on?LIGHTS[i%LIGHTS.length]:'#5b6b7a';c.beginPath();c.arc(x,y,Math.max(2.5,w*.0042),0,7);c.fill();if(on){c.globalAlpha=.25;c.beginPath();c.arc(x,y,Math.max(5,w*.009),0,7);c.fill();c.globalAlpha=1;}};
  for(let i=0;i<=22;i++){const u=i/22;bulb(w*(.31+u*.39),h*.25+Math.sin(u*Math.PI*4)*h*.006+h*.008,i);}   // takkanten
  for(const side of [-1,1])for(let i=0;i<=8;i++){const q=i/8;bulb(w*(.5+side*(.19+q*.24)),h*(.43+q*.47)-h*.012,i+(side>0?3:0));} // räckena
  // en liten gran på däck, till vänster om bryggan
  const gx=w*.17,gy=h*.82,s=w/700;
  c.fillStyle='#6a4630';c.fillRect(gx-4*s,gy,8*s,14*s);
  for(let k=0;k<3;k++){c.fillStyle=k%2?'#245c42':'#2f7a4f';c.strokeStyle=INK;c.lineWidth=2.5;c.beginPath();c.moveTo(gx-(34-k*7)*s,gy-k*26*s);c.lineTo(gx,gy-(46+k*26)*s);c.lineTo(gx+(34-k*7)*s,gy-k*26*s);c.closePath();c.fill();c.stroke();
    c.fillStyle='#f8fbff';c.beginPath();c.moveTo(gx-(10)*s,gy-(k*26+30)*s);c.lineTo(gx,gy-(46+k*26)*s);c.lineTo(gx+10*s,gy-(k*26+30)*s);c.closePath();c.fill();
    for(let b=0;b<3;b++)bulb(gx+(b-1)*(18-k*4)*s,gy-(k*26+8+b%2*8)*s,b+k*2);}
  c.fillStyle='#ffd45a';c.beginPath();c.arc(gx,gy-124*s,6*s,0,7);c.fill();
  c.restore();
}

// Tomteluva på en figur som ritats med person() i boat-ride.js (origo i figurens mitt, huvudet vid y −22).
export function santaHat(c,color='#d33a3a'){
  c.save();c.lineJoin='round';c.strokeStyle=INK;c.lineWidth=3;
  c.fillStyle=color;c.beginPath();c.moveTo(-24,-36);c.quadraticCurveTo(-20,-72,4,-82);c.quadraticCurveTo(30,-84,40,-58);c.quadraticCurveTo(26,-64,22,-52);c.lineTo(24,-36);c.closePath();c.fill();c.stroke();
  c.fillStyle='#ffffff';c.beginPath();c.roundRect(-27,-44,54,13,6);c.fill();c.stroke();c.beginPath();c.arc(41,-58,8,0,7);c.fill();c.stroke();
  c.restore();
}

// Julens "sjöliv": en tomte på släde med renar (flyger förbi uppe i norrskenet) och en isbrytare i stället för segelbåten.
export function drawSleigh(c,o,t){
  const r=o.r;c.save();c.translate(o.x,o.y);c.lineJoin='round';c.strokeStyle=INK;c.lineWidth=3;
  // renar
  for(let i=0;i<2;i++){const rx=-r*(1.55+i*.8),bob=Math.sin(t*6+i)*r*.08;
    c.fillStyle='#8a5a3a';c.beginPath();c.ellipse(rx,bob,r*.38,r*.2,0,0,7);c.fill();c.stroke();
    c.beginPath();c.ellipse(rx-r*.36,bob-r*.18,r*.14,r*.12,0,0,7);c.fill();c.stroke();
    c.strokeStyle='#5b3a24';c.beginPath();c.moveTo(rx-r*.38,bob-r*.3);c.lineTo(rx-r*.46,bob-r*.58);c.moveTo(rx-r*.3,bob-r*.3);c.lineTo(rx-r*.22,bob-r*.56);c.stroke();c.strokeStyle=INK;
    if(i===0){c.fillStyle='#ff4d4d';c.beginPath();c.arc(rx-r*.5,bob-r*.14,r*.055,0,7);c.fill();}}
  c.strokeStyle='#a0713f';c.beginPath();c.moveTo(-r*1.55,0);c.lineTo(-r*.3,r*.05);c.stroke();c.strokeStyle=INK;
  // släden
  c.fillStyle='#c4352f';c.beginPath();c.moveTo(-r*.5,-r*.1);c.lineTo(r*.6,-r*.1);c.quadraticCurveTo(r*.7,r*.25,r*.45,r*.32);c.lineTo(-r*.45,r*.32);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#ffd45a';c.lineWidth=4;c.beginPath();c.moveTo(-r*.55,r*.46);c.quadraticCurveTo(r*.2,r*.5,r*.72,r*.3);c.stroke();c.strokeStyle=INK;c.lineWidth=3;
  c.fillStyle='#f6d0a6';c.beginPath();c.arc(r*.1,-r*.28,r*.17,0,7);c.fill();c.stroke();
  c.fillStyle='#d33a3a';c.beginPath();c.moveTo(-r*.08,-r*.34);c.quadraticCurveTo(r*.1,-r*.72,r*.34,-r*.42);c.closePath();c.fill();c.stroke();
  c.fillStyle='#fff';c.beginPath();c.arc(r*.35,-r*.42,r*.07,0,7);c.fill();c.stroke();
  // gnistor
  c.fillStyle='#fff3b0';for(let i=0;i<6;i++){const a=((t*1.6+i*.37)%1);c.globalAlpha=1-a;c.beginPath();c.arc(-r*(.7+a*2.6),r*(.15+Math.sin(i*2.3)*.2),r*.05,0,7);c.fill();}
  c.restore();
}
export function drawIcebreaker(c,o){
  const r=o.r;c.save();c.translate(o.x,o.y);c.strokeStyle=INK;c.lineWidth=3;c.lineJoin='round';
  c.fillStyle='#c4352f';c.beginPath();c.moveTo(-r,r*.25);c.lineTo(r,r*.25);c.lineTo(r*.75,r*.75);c.lineTo(-r*.75,r*.75);c.closePath();c.fill();c.stroke();
  c.fillStyle='#fff7e6';c.fillRect(-r*.45,-r*.25,r*.8,r*.5);c.strokeRect(-r*.45,-r*.25,r*.8,r*.5);
  c.fillStyle='#3a566b';for(let i=0;i<3;i++)c.fillRect(-r*.35+i*r*.25,-r*.15,r*.15,r*.18);
  c.fillStyle='#c4352f';c.fillRect(r*.12,-r*.6,r*.2,r*.38);c.strokeRect(r*.12,-r*.6,r*.2,r*.38);
  for(let i=0;i<7;i++){c.fillStyle=LIGHTS[i%5];c.beginPath();c.arc(-r*.9+i*r*.3,r*.2,2.6,0,7);c.fill();}
  c.restore();
}

export const WINTER_QUIPS=Object.freeze(['”Isflak på babord. Eller var det styrbord?”','”Tomten har flyttat sitt kontor till Klarälven.”','”Norrskenet är gratis. Glöggen är det inte.”','”Det snöar på Vänern. Det snöar överallt.”','”Pepparkaksdoft från hamnen. Jag vet inte varför.”','”Tryck på tomten. Han gillar uppmärksamhet.”']);
export const WINTER_LABEL='VÄRMLANDSTRAFIK · JULBÅTEN';
export const WINTER_SPOT=Object.freeze({gull:'SNÖMÅS!',boat:'ISBRYTARE!',fish:'JULFISK!',sleigh:'TOMTEN!'});
