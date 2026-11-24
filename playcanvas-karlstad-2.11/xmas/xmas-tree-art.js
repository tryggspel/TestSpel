// Julgranen och prydnaderna: allt ritas med canvas (inga bildfiler). drawOrnament ritar en prydnad (eller dess siluett om man inte har den) och drawTree hela granen med de 24 platserna.
// Ritningen är enkel och tydlig på en liten skärm: grov kontur, stora former, färgen ur xmas-meta-config.mjs (ORNAMENTS). Ingen slump: samma gran varje gång.
const TAU=Math.PI*2;

function path(ctx,fn){ctx.beginPath();fn();}
function star(ctx,cx,cy,R,r,n=5,rot=-Math.PI/2){
  path(ctx,()=>{for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n,rad=i%2?r:R;ctx[i?'lineTo':'moveTo'](cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);}ctx.closePath();});
}
const line=(ctx,x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();};
function shade(hex,amt){ // ljusare (amt>0) eller mörkare (amt<0)
  const n=parseInt(hex.slice(1),16),f=v=>Math.max(0,Math.min(255,Math.round(v+(amt>0?(255-v)*amt:v*amt))));
  return 'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')';
}

// Ritar en prydnad med mitten i (cx,cy) och ungefärlig radie r. o = {shape,color}. dim = siluett (prydnaden saknas).
export function drawOrnament(ctx,cx,cy,r,o,{dim=false,glow=false}={}){
  const shape=o.shape,col=dim?'#9fb9a3':o.color,dark=dim?'#6f8a78':shade(o.color,-.35),light=dim?'#b9d0c0':shade(o.color,.55);
  ctx.save();
  if(dim)ctx.globalAlpha=.32;
  if(glow&&!dim){ctx.shadowColor=o.color;ctx.shadowBlur=r*.9;}
  ctx.lineJoin='round';ctx.lineCap='round';ctx.lineWidth=Math.max(1.4,r*.12);ctx.strokeStyle=dark;ctx.fillStyle=col;
  switch(shape){
    case 'ball':{
      ctx.fillStyle='#d9c27a';ctx.fillRect(cx-r*.22,cy-r*1.02,r*.44,r*.3);
      ctx.fillStyle=col;path(ctx,()=>ctx.arc(cx,cy+r*.08,r*.82,0,TAU));ctx.fill();ctx.stroke();
      ctx.fillStyle=light;ctx.globalAlpha*=.85;path(ctx,()=>ctx.ellipse(cx-r*.28,cy-r*.22,r*.2,r*.12,-.6,0,TAU));ctx.fill();break;
    }
    case 'heart':{
      path(ctx,()=>{ctx.moveTo(cx,cy+r*.85);ctx.bezierCurveTo(cx-r*1.3,cy-r*.1,cx-r*.7,cy-r*.95,cx,cy-r*.3);ctx.bezierCurveTo(cx+r*.7,cy-r*.95,cx+r*1.3,cy-r*.1,cx,cy+r*.85);ctx.closePath();});
      ctx.fill();ctx.stroke();ctx.strokeStyle=light;ctx.lineWidth=Math.max(1,r*.09);ctx.setLineDash([r*.18,r*.16]);
      path(ctx,()=>{ctx.moveTo(cx,cy+r*.5);ctx.bezierCurveTo(cx-r*.9,cy-r*.05,cx-r*.5,cy-r*.6,cx,cy-r*.12);ctx.bezierCurveTo(cx+r*.5,cy-r*.6,cx+r*.9,cy-r*.05,cx,cy+r*.5);});ctx.stroke();ctx.setLineDash([]);break;
    }
    case 'man':{
      path(ctx,()=>ctx.arc(cx,cy-r*.55,r*.32,0,TAU));ctx.fill();ctx.stroke();
      path(ctx,()=>{ctx.moveTo(cx-r*.28,cy-r*.28);ctx.lineTo(cx-r*.95,cy-r*.12);ctx.lineTo(cx-r*.9,cy+r*.1);ctx.lineTo(cx-r*.3,cy+r*.12);ctx.lineTo(cx-r*.55,cy+r*.85);ctx.lineTo(cx-r*.2,cy+r*.9);ctx.lineTo(cx,cy+r*.42);ctx.lineTo(cx+r*.2,cy+r*.9);ctx.lineTo(cx+r*.55,cy+r*.85);ctx.lineTo(cx+r*.3,cy+r*.12);ctx.lineTo(cx+r*.9,cy+r*.1);ctx.lineTo(cx+r*.95,cy-r*.12);ctx.lineTo(cx+r*.28,cy-r*.28);ctx.closePath();});
      ctx.fill();ctx.stroke();ctx.fillStyle='#fff7e6';for(const [x,y] of [[0,-.05],[0,.28]]){path(ctx,()=>ctx.arc(cx+x*r,cy+y*r,r*.07,0,TAU));ctx.fill();}
      path(ctx,()=>{ctx.arc(cx-r*.11,cy-r*.6,r*.04,0,TAU);ctx.arc(cx+r*.11,cy-r*.6,r*.04,0,TAU);});ctx.fill();break;
    }
    case 'flake':{
      ctx.strokeStyle=col;ctx.lineWidth=Math.max(1.6,r*.16);
      for(let i=0;i<6;i++){const a=i*Math.PI/3,x=Math.cos(a),y=Math.sin(a);line(ctx,cx,cy,cx+x*r*.95,cy+y*r*.95);
        for(const k of [.5,.75]){const bx=cx+x*r*k,by=cy+y*r*k,b=a+Math.PI/2.8;line(ctx,bx,by,bx+Math.cos(b)*r*.28,by+Math.sin(b)*r*.28);line(ctx,bx,by,bx+Math.cos(a-Math.PI/2.8)*r*.28,by+Math.sin(a-Math.PI/2.8)*r*.28);}}
      ctx.fillStyle=col;path(ctx,()=>ctx.arc(cx,cy,r*.13,0,TAU));ctx.fill();break;
    }
    case 'cane':{
      ctx.lineWidth=r*.34;ctx.strokeStyle='#fff';
      path(ctx,()=>{ctx.moveTo(cx-r*.1,cy+r*.95);ctx.lineTo(cx-r*.1,cy-r*.25);ctx.arc(cx+r*.3,cy-r*.25,r*.4,Math.PI,0);ctx.lineTo(cx+r*.7,cy-r*.05);});ctx.stroke();
      ctx.strokeStyle=col;ctx.lineWidth=r*.18;ctx.setLineDash([r*.22,r*.3]);
      path(ctx,()=>{ctx.moveTo(cx-r*.1,cy+r*.95);ctx.lineTo(cx-r*.1,cy-r*.25);ctx.arc(cx+r*.3,cy-r*.25,r*.4,Math.PI,0);ctx.lineTo(cx+r*.7,cy-r*.05);});ctx.stroke();ctx.setLineDash([]);break;
    }
    case 'bell':{
      path(ctx,()=>{ctx.moveTo(cx-r*.85,cy+r*.55);ctx.quadraticCurveTo(cx-r*.7,cy+r*.5,cx-r*.62,cy-r*.1);ctx.bezierCurveTo(cx-r*.55,cy-r*.85,cx+r*.55,cy-r*.85,cx+r*.62,cy-r*.1);ctx.quadraticCurveTo(cx+r*.7,cy+r*.5,cx+r*.85,cy+r*.55);ctx.closePath();});
      ctx.fill();ctx.stroke();ctx.fillStyle=dark;path(ctx,()=>ctx.arc(cx,cy+r*.75,r*.2,0,TAU));ctx.fill();
      ctx.strokeStyle=light;ctx.lineWidth=Math.max(1,r*.09);path(ctx,()=>{ctx.moveTo(cx-r*.3,cy-r*.35);ctx.quadraticCurveTo(cx-r*.42,cy,cx-r*.4,cy+r*.3);});ctx.stroke();break;
    }
    case 'bulb':{
      ctx.fillStyle='#9a8a52';ctx.fillRect(cx-r*.28,cy-r*.95,r*.56,r*.34);ctx.strokeRect(cx-r*.28,cy-r*.95,r*.56,r*.34);
      ctx.fillStyle=col;path(ctx,()=>{ctx.moveTo(cx-r*.3,cy-r*.6);ctx.bezierCurveTo(cx-r*1.15,cy-r*.1,cx-r*.7,cy+r*.95,cx,cy+r*.95);ctx.bezierCurveTo(cx+r*.7,cy+r*.95,cx+r*1.15,cy-r*.1,cx+r*.3,cy-r*.6);ctx.closePath();});ctx.fill();ctx.stroke();
      ctx.fillStyle='#fffbe0';path(ctx,()=>ctx.ellipse(cx-r*.2,cy+r*.05,r*.16,r*.28,.3,0,TAU));ctx.fill();break;
    }
    case 'star':{
      star(ctx,cx,cy,r*.98,r*.45);ctx.fill();ctx.stroke();ctx.fillStyle=light;star(ctx,cx-r*.1,cy-r*.12,r*.35,r*.16);ctx.fill();break;
    }
    case 'hat':{
      path(ctx,()=>{ctx.moveTo(cx-r*.75,cy+r*.6);ctx.quadraticCurveTo(cx-r*.5,cy-r*.5,cx+r*.55,cy-r*.78);ctx.quadraticCurveTo(cx+r*.95,cy-r*.15,cx+r*.75,cy+r*.6);ctx.closePath();});ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';path(ctx,()=>ctx.roundRect?ctx.roundRect(cx-r*.95,cy+r*.45,r*1.9,r*.45,r*.2):ctx.rect(cx-r*.95,cy+r*.45,r*1.9,r*.45));ctx.fill();ctx.stroke();
      path(ctx,()=>ctx.arc(cx+r*.62,cy-r*.8,r*.24,0,TAU));ctx.fill();ctx.stroke();break;
    }
    case 'angel':{
      ctx.fillStyle='#ffffffd0';path(ctx,()=>{ctx.ellipse(cx-r*.62,cy-r*.05,r*.42,r*.7,-.5,0,TAU);ctx.ellipse(cx+r*.62,cy-r*.05,r*.42,r*.7,.5,0,TAU);});ctx.fill();ctx.stroke();
      ctx.fillStyle=col;path(ctx,()=>{ctx.moveTo(cx,cy-r*.35);ctx.lineTo(cx+r*.55,cy+r*.9);ctx.lineTo(cx-r*.55,cy+r*.9);ctx.closePath();});ctx.fill();ctx.stroke();
      ctx.fillStyle='#ffe3c4';path(ctx,()=>ctx.arc(cx,cy-r*.55,r*.3,0,TAU));ctx.fill();ctx.stroke();
      ctx.strokeStyle='#f2c230';ctx.lineWidth=Math.max(1.2,r*.1);path(ctx,()=>ctx.ellipse(cx,cy-r*.98,r*.26,r*.08,0,0,TAU));ctx.stroke();break;
    }
    case 'skate':{
      path(ctx,()=>{ctx.moveTo(cx-r*.6,cy-r*.85);ctx.lineTo(cx-r*.1,cy-r*.85);ctx.lineTo(cx-r*.1,cy+r*.1);ctx.lineTo(cx+r*.85,cy+r*.3);ctx.lineTo(cx+r*.85,cy+r*.55);ctx.lineTo(cx-r*.6,cy+r*.55);ctx.closePath();});ctx.fill();ctx.stroke();
      ctx.strokeStyle='#e9eef2';ctx.lineWidth=Math.max(1.6,r*.16);line(ctx,cx-r*.75,cy+r*.85,cx+r*1,cy+r*.85);ctx.strokeStyle=dark;ctx.lineWidth=Math.max(1,r*.08);line(ctx,cx-r*.45,cy+r*.55,cx-r*.45,cy+r*.85);line(ctx,cx+r*.6,cy+r*.55,cx+r*.6,cy+r*.85);break;
    }
    case 'horn':{
      ctx.strokeStyle=col;ctx.lineWidth=Math.max(2,r*.2);
      path(ctx,()=>{ctx.moveTo(cx-r*.1,cy+r*.9);ctx.quadraticCurveTo(cx-r*.4,cy,cx-r*.1,cy-r*.9);});ctx.stroke();
      for(const [y,dx] of [[.35,-.7],[-.05,.6],[-.5,-.7]]){const x0=cx-r*(y>0?.28:y>-.2?.3:.2);line(ctx,x0,cy+y*r,x0+dx*r,cy+(y-.35)*r);}
      path(ctx,()=>{ctx.moveTo(cx-r*.1,cy+r*.9);ctx.quadraticCurveTo(cx+r*.45,cy+r*.1,cx+r*.2,cy-r*.9);});ctx.stroke();break;
    }
    case 'sock':{
      path(ctx,()=>{ctx.moveTo(cx-r*.5,cy-r*.9);ctx.lineTo(cx+r*.4,cy-r*.9);ctx.lineTo(cx+r*.4,cy+r*.15);ctx.lineTo(cx+r*.95,cy+r*.5);ctx.quadraticCurveTo(cx+r*1.05,cy+r*.95,cx+r*.55,cy+r*.95);ctx.lineTo(cx-r*.05,cy+r*.95);ctx.quadraticCurveTo(cx-r*.5,cy+r*.9,cx-r*.5,cy+r*.5);ctx.closePath();});ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff';ctx.fillRect(cx-r*.55,cy-r*.98,r*1.0,r*.38);ctx.strokeRect(cx-r*.55,cy-r*.98,r*1.0,r*.38);break;
    }
    case 'bun':{
      ctx.strokeStyle=col;ctx.lineWidth=r*.5;path(ctx,()=>{ctx.moveTo(cx-r*.55,cy-r*.45);ctx.bezierCurveTo(cx+r*.2,cy-r*.9,cx+r*.7,cy-r*.1,cx+r*.05,cy);ctx.bezierCurveTo(cx-r*.6,cy+r*.1,cx-r*.2,cy+r*.85,cx+r*.6,cy+r*.45);});ctx.stroke();
      ctx.fillStyle='#6a2a1b';for(const [x,y] of [[-.55,-.45],[.6,.45]]){path(ctx,()=>ctx.arc(cx+x*r,cy+y*r,r*.13,0,TAU));ctx.fill();}break;
    }
    case 'cup':{
      path(ctx,()=>{ctx.moveTo(cx-r*.65,cy-r*.35);ctx.lineTo(cx+r*.55,cy-r*.35);ctx.lineTo(cx+r*.45,cy+r*.7);ctx.quadraticCurveTo(cx,cy+r*.95,cx-r*.55,cy+r*.7);ctx.closePath();});ctx.fill();ctx.stroke();
      path(ctx,()=>ctx.arc(cx+r*.62,cy+r*.1,r*.3,-1.2,1.2));ctx.stroke();
      ctx.strokeStyle=dim?dark:'#ffe3d0';ctx.lineWidth=Math.max(1.2,r*.09);for(const x of [-.25,.15]){path(ctx,()=>{ctx.moveTo(cx+x*r,cy-r*.55);ctx.quadraticCurveTo(cx+(x+.2)*r,cy-r*.75,cx+x*r,cy-r*.95);});ctx.stroke();}break;
    }
    case 'gift':{
      ctx.fillRect(cx-r*.8,cy-r*.45,r*1.6,r*1.3);ctx.strokeRect(cx-r*.8,cy-r*.45,r*1.6,r*1.3);
      ctx.fillStyle='#d8362f';ctx.fillRect(cx-r*.14,cy-r*.45,r*.28,r*1.3);ctx.fillRect(cx-r*.8,cy+r*.1,r*1.6,r*.24);
      path(ctx,()=>{ctx.moveTo(cx,cy-r*.45);ctx.bezierCurveTo(cx-r*.9,cy-r*1.15,cx-r*.9,cy-r*.3,cx,cy-r*.45);ctx.bezierCurveTo(cx+r*.9,cy-r*.3,cx+r*.9,cy-r*1.15,cx,cy-r*.45);});ctx.fill();ctx.stroke();break;
    }
    case 'lantern':{
      ctx.strokeStyle=dark;path(ctx,()=>ctx.arc(cx,cy-r*.78,r*.3,Math.PI,0));ctx.stroke();
      ctx.fillStyle=dark;ctx.fillRect(cx-r*.5,cy-r*.65,r,r*.22);ctx.fillRect(cx-r*.5,cy+r*.62,r,r*.22);
      ctx.fillStyle=col;path(ctx,()=>ctx.roundRect?ctx.roundRect(cx-r*.42,cy-r*.45,r*.84,r*1.1,r*.1):ctx.rect(cx-r*.42,cy-r*.45,r*.84,r*1.1));ctx.fill();ctx.stroke();
      ctx.fillStyle='#fff6c2';path(ctx,()=>ctx.ellipse(cx,cy+r*.1,r*.16,r*.28,0,0,TAU));ctx.fill();break;
    }
    case 'topstar':{
      star(ctx,cx,cy,r*1.15,r*.5);ctx.fill();ctx.stroke();ctx.fillStyle=light;star(ctx,cx,cy,r*.55,r*.24);ctx.fill();break;
    }
    default:{path(ctx,()=>ctx.arc(cx,cy,r*.8,0,TAU));ctx.fill();ctx.stroke();}
  }
  ctx.restore();
}

// Platserna på granen: relativa mått (0–1) i en bild som är 6:7. Platsen för en prydnad är dess plats i ORNAMENTS (0–22 nedåt i rader, 23 = toppen).
export const TREE_SLOTS=Object.freeze((()=>{
  const rows=[[.27,[.5-.07,.5+.07]],[.37,[.38,.5,.62]],[.48,[.31,.44,.56,.69]],[.59,[.25,.375,.5,.625,.75]],[.70,[.19,.345,.5,.655,.81]],[.81,[.2,.4,.6,.8]]];
  const out=[];for(const [y,xs] of rows)for(const x of xs)out.push([x,y]);
  out.push([.5,.095]); // toppen: Tomtens stjärna
  return out;
})());

// Hela granen. list = meta.ornamentList() (24 poster i ordningen i ORNAMENTS). w och h är canvasens mått. Prydnader man har ritas i färg (nya med en liten glans), de man saknar som siluetter.
export function drawTree(ctx,w,h,list,{lit=true}={}){
  ctx.clearRect(0,0,w,h);
  const X=x=>x*w,Y=y=>y*h,S=w/480;
  // snö på marken
  ctx.fillStyle='#e8f4ff';ctx.beginPath();ctx.ellipse(X(.5),Y(.955),X(.44),Y(.035),0,0,TAU);ctx.fill();
  // stam
  ctx.fillStyle='#6b4423';ctx.fillRect(X(.45),Y(.88),X(.1),Y(.07));
  // grenar: tre trappsteg
  const tiers=[[.14,.46,.34],[.3,.67,.27],[.46,.87,.2]]; // [topY, bottomY, halfWidth/…] ritas nedan
  const green=['#1f6b3a','#25804a','#2c9457'];
  const spans=[[.1,.47,.2],[.26,.68,.31],[.44,.9,.43]];
  for(let i=0;i<3;i++){
    const [t,b,hw]=spans[i];
    ctx.fillStyle=green[i];ctx.strokeStyle='#124a27';ctx.lineWidth=3*S;ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(X(.5),Y(t));ctx.lineTo(X(.5+hw),Y(b));ctx.quadraticCurveTo(X(.5),Y(b+.03),X(.5-hw),Y(b));ctx.closePath();ctx.fill();ctx.stroke();
  }
  void tiers;
  // ljusslinga
  if(lit){ctx.strokeStyle='#ffe27a99';ctx.lineWidth=2*S;ctx.beginPath();ctx.moveTo(X(.34),Y(.3));ctx.quadraticCurveTo(X(.5),Y(.36),X(.66),Y(.3));ctx.moveTo(X(.24),Y(.52));ctx.quadraticCurveTo(X(.5),Y(.6),X(.76),Y(.52));ctx.moveTo(X(.14),Y(.74));ctx.quadraticCurveTo(X(.5),Y(.85),X(.86),Y(.74));ctx.stroke();}
  for(let i=0;i<list.length&&i<TREE_SLOTS.length;i++){
    const o=list[i],[sx,sy]=TREE_SLOTS[i],top=o.shape==='topstar',r=(top?30:19)*S;
    if(o.owned&&o.isNew){ctx.fillStyle='#fff4b455';ctx.beginPath();ctx.arc(X(sx),Y(sy),r*1.35,0,TAU);ctx.fill();}
    drawOrnament(ctx,X(sx),Y(sy),r,o,{dim:!o.owned,glow:o.owned&&(top||o.rarity==='epic'||o.rarity==='legendary')});
  }
}
