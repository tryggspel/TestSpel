// Original vector wordmarks for the real Karlstad businesses (2.11.26). Drawn in code from each brand's
// colours and letter style; no third-party logo files are copied or distributed. Every drawer works in two modes:
//   'solid' - flat logotype for fascia signs and blade plates
//   'neon'  - the same shapes as glowing tubes on a dark backing
// A drawer paints into the box (0,0,w,h) of a 2D canvas context and returns nothing.
const SERIF='Georgia,"Times New Roman",serif',SANS='system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

function kit(c,w,h,mode,P){
  const neon=mode==='neon';
  const lum=col=>{const m=/^#([0-9a-f]{6})$/i.exec(col||'');if(!m)return 255;const n=parseInt(m[1],16);return .3*(n>>16)+.59*((n>>8)&255)+.11*(n&255);};
  const lift=col=>{const m=/^#([0-9a-f]{6})$/i.exec(col||'');if(!m)return '#ffd36a';const n=parseInt(m[1],16),mix=v=>Math.round(v+(255-v)*.45);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>mix(v).toString(16).padStart(2,'0')).join('');};
  const bright=col=>lum(col)<110?lift(lum(P.accent)>=110?P.accent:col):col; // dark ink would vanish as a glowing tube; keep its hue
  const tube=col=>neon?{core:'#fff6e6',glow:bright(col)}:{core:col,glow:col};
  const text=(s,x,y,size,{color=P.fg,weight=900,family=SANS,align='center',spacing=0,italic=false}={})=>{
    c.save();c.font=`${italic?'italic ':''}${weight} ${size}px ${family}`;c.textAlign=align;c.textBaseline='middle';
    if('letterSpacing' in c)c.letterSpacing=spacing+'px';
    const t=tube(color);
    if(neon){c.shadowColor=t.glow;c.shadowBlur=size*.5;c.strokeStyle=t.glow;c.lineWidth=Math.max(3,size*.11);c.lineJoin='round';c.strokeText(s,x,y,w*.96);c.shadowBlur=0;}
    c.fillStyle=neon?t.core:color;c.fillText(s,x,y,w*.96);c.restore();
  };
  const shape=(draw,{color=P.accent,fill=true,width=Math.max(3,h*.05)}={})=>{
    c.save();c.beginPath();draw(c);
    if(neon){color=bright(color);c.shadowColor=color;c.shadowBlur=h*.22;c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();c.shadowBlur=0;c.strokeStyle='#fff6e6';c.lineWidth=width*.38;c.stroke();}
    else if(fill){c.fillStyle=color;c.fill();}
    else{c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
    c.restore();
  };
  const circle=(x,y,r)=>g=>{g.moveTo(x+r,y);g.arc(x,y,r,0,Math.PI*2);};
  const rect=(x,y,rw,rh)=>g=>g.rect(x,y,rw,rh);
  const line=(x1,y1,x2,y2)=>g=>{g.moveTo(x1,y1);g.lineTo(x2,y2);};
  return {text,shape,circle,rect,line,neon};
}

const LOGOS={
  musicpartner(c,w,h,m,P){const k=kit(c,w,h,m,P),u=h;
    for(let i=0;i<5;i++){const bh=u*(.22+((i*37)%5)*.1);k.shape(k.rect(w*.07+i*u*.16,h*.5-bh/2,u*.1,bh),{color:P.accent,fill:true});}
    k.text('MusicPartner',w*.58,h*.52,Math.min(h*.5,w*.13),{color:P.fg,weight:800});},
  synsam(c,w,h,m,P){const k=kit(c,w,h,m,P),r=h*.2,y=h*.5,x0=w*.14;
    k.shape(k.circle(x0,y,r),{fill:false,color:P.accent});k.shape(k.circle(x0+r*2.5,y,r),{fill:false,color:P.accent});k.shape(k.line(x0+r,y,x0+r*1.5,y),{fill:false,color:P.accent});
    k.text('synsam',w*.6,y,Math.min(h*.62,w*.2),{color:P.accent,weight:800});},
  synsamoutlet(c,w,h,m,P){const k=kit(c,w,h,m,P),r=h*.14,y=h*.38,x0=w*.12;
    k.shape(k.circle(x0,y,r),{fill:false,color:P.accent});k.shape(k.circle(x0+r*2.5,y,r),{fill:false,color:P.accent});
    k.text('synsam',w*.58,y,Math.min(h*.46,w*.17),{color:P.accent,weight:800});
    k.text('OUTLET',w*.5,h*.78,h*.26,{color:P.fg,weight:800,spacing:h*.1});},
  normal(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('NORMAL',w*.5,h*.5,Math.min(h*.7,w*.2),{color:P.fg,weight:900,spacing:h*.03});
    k.shape(k.rect(w*.16,h*.84,w*.68,h*.07),{color:P.accent});},
  hm(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('H&M',w*.5,h*.52,Math.min(h*.86,w*.32),{color:P.fg,weight:900,family:'Georgia,serif',italic:false});},
  scandic(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('scandic',w*.5,h*.46,Math.min(h*.66,w*.2),{color:P.fg,weight:800});
    k.shape(k.rect(w*.34,h*.84,w*.32,h*.06),{color:P.accent});},
  radhuscafe(c,w,h,m,P){const k=kit(c,w,h,m,P),cx=w*.12,cy=h*.55,s=h*.24;
    k.shape(g=>{g.moveTo(cx-s,cy-s*.5);g.lineTo(cx+s,cy-s*.5);g.lineTo(cx+s*.7,cy+s);g.lineTo(cx-s*.7,cy+s);g.closePath();},{color:P.accent});
    k.shape(g=>{g.arc(cx+s*1.1,cy+s*.2,s*.5,-Math.PI/2,Math.PI/2);},{color:P.accent,fill:false});
    k.text('Rådhuscaféet',w*.58,h*.52,Math.min(h*.5,w*.13),{color:P.fg,weight:700,family:SERIF,italic:true});},
  savoy(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.shape(k.line(w*.18,h*.2,w*.82,h*.2),{fill:false,color:P.accent,width:h*.03});k.shape(k.line(w*.18,h*.8,w*.82,h*.8),{fill:false,color:P.accent,width:h*.03});
    k.text('HOTEL',w*.5,h*.36,h*.2,{color:P.accent,weight:700,family:SERIF,spacing:h*.1});
    k.text('SAVOY',w*.5,h*.62,Math.min(h*.42,w*.17),{color:P.fg,weight:700,family:SERIF,spacing:h*.06});},
  homeplaza(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('HOME HOTEL',w*.5,h*.3,h*.2,{color:P.accent,weight:700,family:SERIF,spacing:h*.07});
    k.text('PLAZA',w*.5,h*.64,Math.min(h*.5,w*.2),{color:P.fg,weight:700,family:SERIF,spacing:h*.05});},
  fratelli(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('HOTEL',w*.5,h*.28,h*.18,{color:P.accent,weight:700,family:SERIF,spacing:h*.1});
    k.text('FRATELLI',w*.5,h*.62,Math.min(h*.4,w*.13),{color:P.fg,weight:700,family:SERIF,spacing:h*.04});},
  hemkop(c,w,h,m,P){const k=kit(c,w,h,m,P),x=w*.1,y=h*.5,s=h*.2;
    k.shape(g=>{g.moveTo(x,y+s*.9);g.bezierCurveTo(x-s*1.6,y-s*.2,x-s*.4,y-s*1.3,x,y-s*.3);g.bezierCurveTo(x+s*.4,y-s*1.3,x+s*1.6,y-s*.2,x,y+s*.9);},{color:P.accent});
    k.text('Hemköp',w*.56,y,Math.min(h*.66,w*.2),{color:P.fg,weight:900});},
  burgerking(c,w,h,m,P){const k=kit(c,w,h,m,P),cx=w*.5,bw=w*.34;
    k.shape(g=>{g.moveTo(cx-bw,h*.4);g.quadraticCurveTo(cx,-h*.12,cx+bw,h*.4);g.closePath();},{color:P.accent});
    k.shape(g=>{g.moveTo(cx-bw,h*.62);g.quadraticCurveTo(cx,h*1.14,cx+bw,h*.62);g.closePath();},{color:P.accent});
    k.shape(k.rect(cx-bw*1.06,h*.4,bw*2.12,h*.22),{color:'#2e5aa8'});
    k.text('BURGER KING',cx,h*.51,Math.min(h*.2,w*.075),{color:P.fg,weight:900,spacing:h*.01});},
  sibylla(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('Sibylla',w*.5,h*.48,Math.min(h*.72,w*.22),{color:P.fg,weight:900,italic:true});
    k.shape(k.rect(w*.18,h*.84,w*.64,h*.07),{color:P.accent});},
  grekiska(c,w,h,m,P){const k=kit(c,w,h,m,P);
    for(let i=0;i<14;i++){const x=w*.1+i*(w*.8/13);k.shape(k.rect(x,h*.1,w*.8/26,h*.07),{color:P.accent});k.shape(k.rect(x,h*.83,w*.8/26,h*.07),{color:P.accent});}
    k.text('GREKISKA',w*.5,h*.42,Math.min(h*.36,w*.12),{color:P.fg,weight:900,spacing:h*.04});
    k.text('GRILL & BAR',w*.5,h*.68,h*.2,{color:P.accent,weight:800,spacing:h*.06});},
  leprechaun(c,w,h,m,P){const k=kit(c,w,h,m,P),cx=w*.12,cy=h*.46,r=h*.14;
    for(const [dx,dy] of [[-r,0],[r,0],[0,-r],[0,r]])k.shape(k.circle(cx+dx,cy+dy,r),{color:P.accent});
    k.shape(k.line(cx,cy+r*1.2,cx+r*.6,cy+r*2.4),{fill:false,color:P.accent,width:h*.05});
    k.text('THE LEPRECHAUN',w*.58,h*.5,Math.min(h*.38,w*.1),{color:P.fg,weight:700,family:SERIF,spacing:h*.02});},
  gossip(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('Gossip',w*.4,h*.4,Math.min(h*.54,w*.17),{color:P.fg,weight:800,family:SERIF,italic:true});
    k.text('& Bubbels',w*.58,h*.74,Math.min(h*.4,w*.13),{color:P.accent,weight:800,family:SERIF,italic:true});
    for(const [x,y,r] of [[.8,.3,.08],[.88,.5,.05],[.76,.52,.04]])k.shape(k.circle(w*x,h*y,h*r),{fill:false,color:P.accent,width:h*.03});},
  lindex(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('LINDEX',w*.5,h*.5,Math.min(h*.5,w*.15),{color:P.fg,weight:300,spacing:h*.12});
    k.shape(k.rect(w*.3,h*.82,w*.4,h*.04),{color:P.accent});},
  kjell(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('Kjell',w*.34,h*.5,Math.min(h*.64,w*.2),{color:P.fg,weight:900});
    k.shape(k.circle(w*.58,h*.5,h*.22),{fill:false,color:P.accent,width:h*.06});
    k.text('&',w*.58,h*.52,h*.34,{color:P.accent,weight:900});
    k.text('Company',w*.8,h*.5,Math.min(h*.34,w*.1),{color:P.fg,weight:800});},
  kicks(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('KICKS',w*.5,h*.5,Math.min(h*.72,w*.24),{color:P.fg,weight:900,spacing:h*.04});
    k.shape(k.circle(w*.86,h*.3,h*.07),{color:P.accent});},
  apoteket(c,w,h,m,P){const k=kit(c,w,h,m,P),cx=w*.12,cy=h*.5,s=h*.2;
    k.shape(g=>{g.moveTo(cx,cy-s*1.3);g.bezierCurveTo(cx+s*1.4,cy-s*.7,cx+s*1.4,cy+s*.8,cx,cy+s*1.3);g.bezierCurveTo(cx-s*1.4,cy+s*.8,cx-s*1.4,cy-s*.7,cx,cy-s*1.3);},{color:P.accent});
    k.shape(k.line(cx,cy-s*.7,cx,cy+s*.7),{fill:false,color:'#fff',width:h*.04});k.shape(k.line(cx-s*.7,cy,cx+s*.7,cy),{fill:false,color:'#fff',width:h*.04});
    k.text('apoteket',w*.58,h*.5,Math.min(h*.5,w*.15),{color:P.fg,weight:800});},
  espresso(c,w,h,m,P){const k=kit(c,w,h,m,P);
    k.text('ESPRESSO',w*.5,h*.36,Math.min(h*.36,w*.12),{color:P.fg,weight:900,family:SERIF});
    k.text('HOUSE',w*.5,h*.7,Math.min(h*.36,w*.12),{color:P.accent,weight:900,family:SERIF});}
};

export const BRAND_LOGO_IDS=Object.freeze(Object.keys(LOGOS));
export const hasBrandLogo=id=>Object.prototype.hasOwnProperty.call(LOGOS,id);
// Draws the logo for a business into the box (x,y,w,h). Returns false when the brand has no drawer.
export function drawBrandLogo(c,id,{x=0,y=0,w,h,mode='solid',palette}){
  const fn=LOGOS[id];if(!fn)return false;
  c.save();c.translate(x,y);fn(c,w,h,mode,palette);c.restore();return true;
}
