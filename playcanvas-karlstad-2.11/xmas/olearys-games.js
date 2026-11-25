// O'Learys-aktiviteterna (2.21.1-xmas.14): bowling, shuffleboard, biljard, dart och straffar som små spel i ett eget fönster, femkampen (alla fem i följd),
// FBK-tipset och korten för baren och karaoken. Ritas på en canvas i O'Learys färger (grönt, krämvitt och guld). Styrning: dra bakåt från klotet/pucken/den vita bollen
// och släpp (som en slangbella); i dart håller man inne för att stilla siktet och släpper för att kasta.
// Reglerna och poängen ligger i olearys-rules.mjs, fysiken i olearys-physics.mjs.
import {ACTIVITIES,activity,bowlingScore,pinsStanding,BOWL_FRAMES,dartScore,DART_ORDER,shuffleScore,shuffleZone,SHUFFLE,pentaPoints,tipOpen,tipPoints,tipTotals,outcomeOf,matchStart,
  OL_KEY,blankOlearys,sanitizeOlearys,recordActivity,recordPenta,TIP_POINTS} from './olearys-rules.mjs?v=2.21.1-xmas.16';
import {makeWorld,addBody,stepWorld,moving,drain} from './olearys-physics.mjs?v=2.21.1-xmas.16';
import {OL_COLORS as C,FBK_MATCHES,FBK_SOURCE} from './olearys-data.mjs?v=2.21.1-xmas.16';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rnd=(a,b)=>a+Math.random()*(b-a);
const FONT='system-ui,-apple-system,Segoe UI,sans-serif';

// ── Sparningen ─────────────────────────────────────────────────────────────────────────────────────────────────────
export function loadOlearys(storage){try{return sanitizeOlearys(JSON.parse(storage?.getItem(OL_KEY)||'null'));}catch{return blankOlearys();}}
export function saveOlearys(storage,state){try{storage?.setItem(OL_KEY,JSON.stringify(state));return true;}catch{return false;}}

// ── Gemensamt för spelen: en dra-och-släpp-gest (slangbella) ──────────────────────────────────────────────────────────
function sling(game,{origin,maxPull,onRelease}){
  // origin(): {x,y} på skärmen där gesten börjar; maxPull i pixlar
  const st={on:false,sx:0,sy:0,x:0,y:0};
  return {
    st,origin,
    down(x,y){const o=origin();if(!o)return;if(Math.hypot(x-o.x,y-o.y)>Math.max(80,maxPull()*.6))return;st.on=true;st.sx=o.x;st.sy=o.y;st.x=x;st.y=y;},
    move(x,y){if(st.on){st.x=x;st.y=y;}},
    up(){if(!st.on)return;st.on=false;const dx=st.sx-st.x,dy=st.sy-st.y,len=Math.hypot(dx,dy),p=clamp(len/maxPull(),0,1);if(p<.08)return;onRelease(dx/len,dy/len,p);},
    draw(c){if(!st.on)return;const dx=st.sx-st.x,dy=st.sy-st.y,len=Math.hypot(dx,dy),p=clamp(len/maxPull(),0,1);
      c.strokeStyle='#ffffff60';c.lineWidth=3;c.setLineDash([6,8]);c.beginPath();c.moveTo(st.sx,st.sy);c.lineTo(st.sx+dx/len*Math.min(len*2.4,900),st.sy+dy/len*Math.min(len*2.4,900));c.stroke();c.setLineDash([]);
      c.strokeStyle=p>.85?'#ff6f59':C.gold;c.lineWidth=8;c.lineCap='round';c.beginPath();c.moveTo(st.sx,st.sy);c.lineTo(st.x,st.y);c.stroke();
      // kraftmätare
      const bx=game.w-34,by=game.h*.25,bh=game.h*.5;c.fillStyle='#00000066';c.fillRect(bx,by,16,bh);c.fillStyle=p>.85?'#ff6f59':C.gold;c.fillRect(bx,by+bh*(1-p),16,bh*p);c.strokeStyle=C.cream;c.lineWidth=2;c.strokeRect(bx,by,16,bh);}
  };
}

// Markeringar i en ruta: X för strike, / för spärr, – för noll. Sista rutan kan ha tre slag (X X X, 7 / X …).
export function frameMarks(rolls,last){
  const out=[];let prev=null; // prev = slag som väntar på sitt andra (för spärr)
  for(const r of rolls){
    if(prev==null){if(r===10&&(last||out.length===0)){out.push('X');continue;}out.push(r===0?'–':String(r));prev=r;}
    else{out.push(prev+r===10?'/':r===0?'–':String(r));prev=null;}
  }
  return out;
}
// ── Bowling: fem rutor ───────────────────────────────────────────────────────────────────────────────────────────────
const LANE={w:1.05,len:18.29,pinY:16.9,spacing:.3048};
function pinSpots(){const out=[];for(let row=0;row<4;row++)for(let k=0;k<=row;k++)out.push({x:LANE.w/2+(k-row/2)*LANE.spacing,y:LANE.pinY+row*LANE.spacing*.866});return out;}
function bowlingGame(ui){
  const g={id:'bowling',rolls:[],phase:'aim',msg:'Dra klotet bakåt mot dig och släpp. Riktningen avgör var det går.',w:0,h:0};
  let world=null,ball=null,pins=[],spots=pinSpots(),standing=new Set(spots.map((_,i)=>i)),rollT=0,gutter=null;
  function setup(){
    world=makeWorld({w:LANE.w,h:LANE.len+1.2,friction:.93,restitution:.6,walls:{left:'open',right:'open',top:'fall',bottom:'open'}});
    pins=spots.map((s,i)=>standing.has(i)?addBody(world,{x:s.x,y:s.y,r:.06,m:1.5,kind:'pin',i,friction:.12,e:.55,home:{...s}}):null);
    ball=null;gutter=null;g.phase='aim';
  }
  setup();
  // perspektiv: banan krymper uppåt
  const proj=(x,y)=>{const top=g.h*.08,bot=g.h*.9,k=7,f=1/(1+y/k),f0=1,f1=1/(1+LANE.len/k),t=(f0-f)/(f0-f1),sy=bot-(bot-top)*t,lw=g.w*.62*f/f0,cx=g.w/2;return {x:cx+(x-LANE.w/2)/LANE.w*lw,y:sy,s:lw/LANE.w};};
  const s=sling(g,{origin:()=>g.phase==='aim'?proj(LANE.w/2,.25):null,maxPull:()=>g.h*.28,onRelease:(dx,dy,p)=>{
    // dy < 0: släppt uppåt (framåt). Vinkeln: dx ger sidled. Fart 6–9 m/s.
    const speed=6+p*3,ang=clamp(Math.atan2(dx,-dy),-.09,.09);
    ball=addBody(world,{x:LANE.w/2+clamp(dx*.15,-.3,.3),y:.25,r:.109,m:7,kind:'ball',vx:Math.sin(ang)*speed,vy:Math.cos(ang)*speed,friction:.96,e:.3,spin:-ang*1.4});
    g.phase='roll';rollT=0;ui.sound?.('roll');
  }});
  g.down=(x,y)=>s.down(x,y);g.move=(x,y)=>s.move(x,y);g.up=()=>s.up();g.origin=()=>s.origin();
  g.update=dt=>{
    if(g.phase!=='roll')return;
    rollT+=dt;stepWorld(world,dt);
    for(const e of drain(world))if(e.type==='hit'&&e.speed>.8)ui.sound?.('pin');
    if(ball&&ball.alive&&!gutter&&(ball.x<0||ball.x>LANE.w)){gutter={x:ball.x<0?-.08:LANE.w+.08,y:ball.y,v:Math.hypot(ball.vx,ball.vy)};ball.alive=false;ui.sound?.('gutter');}
    if(gutter){gutter.y+=gutter.v*dt;}
    const ballDone=(!ball||!ball.alive)&&(!gutter||gutter.y>LANE.len)||ball&&ball.alive&&ball.y>LANE.len+.6;
    if((ballDone&&!moving(world,.05))||rollT>9){
      // fällda käglor: rubbade mer än 9 cm, ute ur banan eller döda
      let down=0;const keep=new Set();
      pins.forEach((p,i)=>{if(!p)return;const moved=Math.hypot(p.x-p.home.x,p.y-p.home.y);if(!p.alive||moved>.09||p.x<0||p.x>LANE.w)down++;else keep.add(i);});
      g.rolls.push(down);
      const sc=bowlingScore(g.rolls);
      const left=pinsStanding(g.rolls);
      g.msg=down===standing.size&&standing.size===10?'STRIKE!':down===standing.size&&standing.size<10?'SPÄRR!':down===0?(gutter?'RÄNNA…':'MISS'):down+(down===1?' KÄGLA':' KÄGLOR');
      ui.flash?.(g.msg);
      if(sc.done){g.phase='done';g.result={points:sc.total,raw:sc.total,text:'Du fick '+sc.total+' poäng på fem rutor.'};ui.finish?.(g);return;}
      standing=left===10?new Set(spots.map((_,i)=>i)):keep;
      setTimeout(()=>{if(g.phase!=='done'){setup();}},900);g.phase='wait';
    }
  };
  g.draw=c=>{
    const w=g.w,h=g.h;c.fillStyle='#0b1f15';c.fillRect(0,0,w,h);
    // banan med rännor
    const a=proj(-.25,0),b=proj(LANE.w+.25,0),cc=proj(LANE.w+.25,LANE.len+1),d=proj(-.25,LANE.len+1);
    c.fillStyle='#3a3a3a';c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(cc.x,cc.y);c.lineTo(d.x,d.y);c.fill();
    const a2=proj(0,0),b2=proj(LANE.w,0),c2=proj(LANE.w,LANE.len+.6),d2=proj(0,LANE.len+.6);
    const lg=c.createLinearGradient(0,a2.y,0,c2.y);lg.addColorStop(0,'#e8cfa0');lg.addColorStop(1,'#b8925e');c.fillStyle=lg;c.beginPath();c.moveTo(a2.x,a2.y);c.lineTo(b2.x,b2.y);c.lineTo(c2.x,c2.y);c.lineTo(d2.x,d2.y);c.fill();
    c.strokeStyle='#8b6a3e55';c.lineWidth=1;for(let i=1;i<20;i++){const x=i*LANE.w/20,p0=proj(x,0),p1=proj(x,LANE.len+.6);c.beginPath();c.moveTo(p0.x,p0.y);c.lineTo(p1.x,p1.y);c.stroke();}
    // pilarna
    c.fillStyle='#5b3a22';for(let k=0;k<7;k++){const p=proj(LANE.w*(k+1)/8,4.5+Math.abs(k-3)*.3);c.beginPath();c.moveTo(p.x,p.y-8*p.s/120);c.lineTo(p.x-5,p.y+6);c.lineTo(p.x+5,p.y+6);c.fill();}
    // käglorna (bakifrån först)
    const bodies=world.bodies.filter(x=>x.alive).sort((p,q)=>q.y-p.y);
    for(const p of bodies){
      const q=proj(p.x,p.y),rr=p.r*q.s;
      if(p.kind==='pin'){const tilt=Math.min(1,Math.hypot(p.x-p.home.x,p.y-p.home.y)/.09);c.save();c.translate(q.x,q.y);c.rotate(tilt*1.2*Math.sign(p.x-p.home.x||1));
        c.fillStyle='#00000040';c.beginPath();c.ellipse(0,2,rr*1.2,rr*.5,0,0,7);c.fill();
        c.fillStyle='#fbf7ec';c.beginPath();c.ellipse(0,-rr*2.2,rr*.9,rr*2.4,0,0,7);c.fill();c.fillStyle='#b8322c';c.fillRect(-rr*.85,-rr*3.4,rr*1.7,rr*.45);c.restore();}
      else{c.fillStyle='#00000055';c.beginPath();c.ellipse(q.x,q.y+2,rr*1.1,rr*.45,0,0,7);c.fill();const bg=c.createRadialGradient(q.x-rr*.3,q.y-rr*.9,rr*.1,q.x,q.y-rr,rr);bg.addColorStop(0,'#3f9f6c');bg.addColorStop(1,'#0d3a25');c.fillStyle=bg;c.beginPath();c.arc(q.x,q.y-rr,rr,0,7);c.fill();}
    }
    if(gutter){const q=proj(gutter.x,Math.min(gutter.y,LANE.len)),rr=.109*q.s;c.fillStyle='#155939';c.beginPath();c.arc(q.x,q.y-rr,rr,0,7);c.fill();}
    if(g.phase==='aim'){const q=proj(LANE.w/2,.25),rr=.109*q.s;const bg=c.createRadialGradient(q.x-rr*.3,q.y-rr*.9,rr*.1,q.x,q.y-rr,rr);bg.addColorStop(0,'#3f9f6c');bg.addColorStop(1,'#0d3a25');c.fillStyle=bg;c.beginPath();c.arc(q.x,q.y-rr,rr,0,7);c.fill();}
    s.draw(c);
    // resultattavlan
    const sc=bowlingScore(g.rolls),bw=Math.min(66,(w-20)/BOWL_FRAMES);
    for(let f=0;f<BOWL_FRAMES;f++){const x=10+f*bw,fr=sc.frames[f];c.fillStyle='#03120acc';c.fillRect(x,h-58,bw-4,50);c.strokeStyle=C.gold;c.lineWidth=1.5;c.strokeRect(x,h-58,bw-4,50);
      c.fillStyle=C.cream;c.font='700 13px '+FONT;c.textAlign='center';
      const marks=frameMarks(fr?.rolls||[],f===BOWL_FRAMES-1);
      c.fillText(marks.join(' '),x+(bw-4)/2,h-40);c.font='900 17px '+FONT;c.fillStyle=C.gold;c.fillText(fr&&fr.score!=null?String(fr.score):'',x+(bw-4)/2,h-17);}
  };
  g.score=()=>bowlingScore(g.rolls).total;
  return g;
}

// ── Shuffleboard ───────────────────────────────────────────────────────────────────────────────────────────────────
function shuffleGame(ui){
  const L=6.4,W=.6,R=.032;
  const g={id:'shuffle',phase:'aim',turn:'p',shots:{p:0,c:0},msg:'Dra pucken bakåt och släpp. Hamna långt fram, men inte över kanten.',w:0,h:0};
  const world=makeWorld({w:W,h:L,friction:.52,restitution:.85,walls:{left:'fall',right:'fall',top:'fall',bottom:'open'}});
  let cur=null,wait=0;
  const proj=(x,y)=>{const top=g.h*.07,bot=g.h*.88,sc=(bot-top)/L,cx=g.w/2;return {x:cx+(x-W/2)*sc*1.9,y:bot-y*sc,s:sc};};
  function next(){
    if(g.shots.p>=SHUFFLE.pucks&&g.shots.c>=SHUFFLE.pucks){const r=shuffleScore(world.bodies.map(b=>({who:b.who,t:b.y/L,on:b.alive})));g.phase='done';
      g.result={points:r.p,raw:{p:r.p,c:r.c},text:r.p>r.c?'Du vann med '+r.p+' mot '+r.c+'!':r.p===r.c?'Oavgjort, '+r.p+' mot '+r.c+'.':'Bartendern vann med '+r.c+' mot '+r.p+'.'};ui.finish?.(g);return;}
    g.turn=g.shots.p<=g.shots.c?'p':'c';g.phase=g.turn==='p'?'aim':'cpu';
    if(g.turn==='c'){wait=.9;g.msg='Bartenderns tur …';}else g.msg='Din tur: puck '+(g.shots.p+1)+' av '+SHUFFLE.pucks+'.';
  }
  function shoot(who,dx,speed){
    cur=addBody(world,{x:W/2+dx,y:.12,r:R,m:.35,who,kind:'puck',vx:0,vy:speed,friction:.52});g.shots[who]++;g.phase='slide';ui.sound?.('slide');
  }
  const s=sling(g,{origin:()=>g.phase==='aim'?proj(W/2,.12):null,maxPull:()=>g.h*.3,onRelease:(dx,dy,p)=>{
    const ang=clamp(Math.atan2(dx,-dy),-.05,.05),speed=2.1+p*2.7;shoot('p',0,speed);cur.vx=Math.sin(ang)*speed;cur.vy=Math.cos(ang)*speed;}});
  g.down=(x,y)=>s.down(x,y);g.move=(x,y)=>s.move(x,y);g.up=()=>s.up();g.origin=()=>s.origin();
  g.update=dt=>{
    if(g.phase==='cpu'){wait-=dt;if(wait<=0){
      // bartendern siktar på zon 3, ibland för att knuffa ut din bästa puck
      const mine=world.bodies.filter(b=>b.alive&&b.who==='p').sort((a,b)=>b.y-a.y)[0];
      let target=L*rnd(.86,.97),side=rnd(-.08,.08);
      if(mine&&mine.y>L*.85&&Math.random()<.55){target=mine.y+.35;side=mine.x-W/2;}
      const v=target*.654*rnd(.95,1.06);shoot('c',0,v);cur.x=W/2+clamp(side*.3,-.2,.2);cur.vx=side*.18;}}
    if(g.phase==='slide'){stepWorld(world,dt);for(const e of drain(world)){if(e.type==='hit')ui.sound?.('clack');if(e.type==='fall')ui.flash?.('ÖVER KANTEN!');}
      if(!moving(world,.02)){const r=shuffleScore(world.bodies.map(b=>({who:b.who,t:b.y/L,on:b.alive})));g.msg=r.leader?(r.leader==='p'?'Du leder: '+r.p+' p':'Bartendern leder: '+r.c+' p'):'';next();}}
  };
  g.draw=c=>{
    const w=g.w,h=g.h;c.fillStyle='#0b1f15';c.fillRect(0,0,w,h);
    const a=proj(0,0),b=proj(W,L);c.fillStyle='#5b3a22';c.fillRect(a.x-14,b.y-14,b.x-a.x+28,a.y-b.y+28);
    const tg=c.createLinearGradient(0,b.y,0,a.y);tg.addColorStop(0,'#e8cf9e');tg.addColorStop(1,'#d2ad74');c.fillStyle=tg;c.fillRect(a.x,b.y,b.x-a.x,a.y-b.y);
    // zonerna
    const Z=SHUFFLE.zones;[[Z[0],'1'],[Z[1],'2'],[Z[2],'3'],[Z[3],'4']].forEach(([t,lab],i)=>{const y=proj(0,t*L).y;c.strokeStyle=i===3?'#b8322c':'#1c3d2c';c.lineWidth=3;c.beginPath();c.moveTo(a.x,y);c.lineTo(b.x,y);c.stroke();
      const ny=i<3?proj(0,(t+(i<2?Z[i+1]:Z[3]))/2*L).y:proj(0,(Z[3]+1)/2*L).y;c.fillStyle='#1c3d2caa';c.font='900 '+Math.round(Math.min(30,(b.x-a.x)*.3))+'px '+FONT;c.textAlign='center';c.textBaseline='middle';c.fillText(lab,(a.x+b.x)/2,ny);});
    for(const p of world.bodies){if(!p.alive)continue;const q=proj(p.x,p.y),rr=Math.max(7,R*q.s*1.9);c.fillStyle='#0006';c.beginPath();c.arc(q.x+2,q.y+2,rr,0,7);c.fill();c.fillStyle=p.who==='p'?'#c8322c':'#2050b0';c.beginPath();c.arc(q.x,q.y,rr,0,7);c.fill();c.strokeStyle='#ffffffcc';c.lineWidth=2;c.beginPath();c.arc(q.x,q.y,rr*.55,0,7);c.stroke();}
    if(g.phase==='aim'){const q=proj(W/2,.12),rr=Math.max(7,R*q.s*1.9);c.fillStyle='#c8322c';c.beginPath();c.arc(q.x,q.y,rr,0,7);c.fill();}
    s.draw(c);
    const r=shuffleScore(world.bodies.map(b=>({who:b.who,t:b.y/L,on:b.alive})));
    c.fillStyle=C.cream;c.font='800 15px '+FONT;c.textAlign='left';c.fillText('DU · '+(SHUFFLE.pucks-g.shots.p)+' kvar · '+r.p+' p',12,24);c.textAlign='right';c.fillStyle='#9cc3ff';c.fillText('BARTENDERN '+(SHUFFLE.pucks-g.shots.c)+' kvar · '+r.c+' p',w-12,24);
  };
  g.score=()=>shuffleScore(world.bodies.map(b=>({who:b.who,t:b.y/L,on:b.alive}))).p;
  next();return g;
}

// ── Biljard: sänk sex bollar på så få stötar som möjligt ───────────────────────────────────────────────────────────────
function poolGame(ui){
  const W=1.27,H=2.54,R=.0286,P=.07,MAX=24;
  const g={id:'biljard',phase:'aim',shots:0,potted:0,of:6,msg:'Dra bakåt från den vita bollen, sikta och släpp.',w:0,h:0};
  const world=makeWorld({w:W,h:H,friction:.62,restitution:.9,walls:{left:'bounce',right:'bounce',top:'bounce',bottom:'bounce'},
    pockets:[[0,0],[W,0],[0,H/2],[W,H/2],[0,H],[W,H]].map(([x,y])=>({x,y,r:P}))});
  const COLS=['#e0c030','#2050b0','#c02828','#5a2a88','#e07a20','#2a8a3a'];
  let cue=null;
  {let n=0;for(let row=0;row<3;row++)for(let k=0;k<=row;k++){addBody(world,{x:W/2+(k-row/2)*R*2.05,y:H*.72+row*R*1.8,r:R,m:.17,kind:'ball',col:COLS[n],e:.92});n++;}}
  cue=addBody(world,{x:W/2,y:H*.25,r:R,m:.17,kind:'cue',e:.92});
  const proj=(x,y)=>{const sc=Math.min((g.w-60)/W,(g.h-120)/H),ox=(g.w-W*sc)/2,oy=g.h-60-(g.h-120-H*sc)/2;return {x:ox+x*sc,y:oy-y*sc,s:sc};};
  const s=sling(g,{origin:()=>g.phase==='aim'&&cue.alive?proj(cue.x,cue.y):null,maxPull:()=>g.h*.3,onRelease:(dx,dy,p)=>{
    const speed=.6+p*4.2;cue.vx=dx*speed;cue.vy=-dy*speed;g.shots++;g.phase='roll';ui.sound?.('cue');}});
  g.down=(x,y)=>s.down(x,y);g.move=(x,y)=>s.move(x,y);g.up=()=>s.up();g.origin=()=>s.origin();
  g.update=dt=>{
    if(g.phase!=='roll')return;
    stepWorld(world,dt);
    for(const e of drain(world)){if(e.type==='hit')ui.sound?.('clack');if(e.type==='pocket'){if(e.body.kind==='cue'){ui.flash?.('VITA I HÅLET · +1 STÖT');g.shots++;}else{g.potted++;ui.flash?.('I HÅLET!');ui.sound?.('pot');}}}
    if(!moving(world,.02)){
      if(!cue.alive){cue.alive=true;cue.x=W/2;cue.y=H*.25;cue.vx=cue.vy=0;
        for(const b of world.bodies)if(b!==cue&&b.alive&&Math.hypot(b.x-cue.x,b.y-cue.y)<R*2.2){cue.x+=R*3;}}
      if(g.potted>=g.of||g.shots>=MAX){g.phase='done';g.result={points:g.potted>=g.of?g.shots:0,raw:{shots:g.shots,potted:g.potted,of:g.of},text:g.potted>=g.of?'Alla sex på '+g.shots+' stötar!':'Du sänkte '+g.potted+' av '+g.of+' på '+MAX+' stötar.'};ui.finish?.(g);return;}
      g.phase='aim';g.msg='Stöt '+(g.shots+1)+' · '+g.potted+' av '+g.of+' sänkta.';
    }
  };
  g.draw=c=>{
    const w=g.w,h=g.h;c.fillStyle='#0b1f15';c.fillRect(0,0,w,h);
    const a=proj(0,0),b=proj(W,H);c.fillStyle='#4a2a16';c.fillRect(a.x-18,b.y-18,b.x-a.x+36,a.y-b.y+36);c.fillStyle='#1f7a4a';c.fillRect(a.x,b.y,b.x-a.x,a.y-b.y);
    c.fillStyle='#ffffff18';c.beginPath();c.arc(proj(W/2,H*.25).x,proj(W/2,H*.25).y,3,0,7);c.fill();
    for(const p of world.pockets){const q=proj(p.x,p.y);c.fillStyle='#050505';c.beginPath();c.arc(q.x,q.y,P*q.s*.85,0,7);c.fill();}
    for(const p of world.bodies){if(!p.alive)continue;const q=proj(p.x,p.y),rr=R*q.s;c.fillStyle='#0005';c.beginPath();c.arc(q.x+2,q.y+2,rr,0,7);c.fill();c.fillStyle=p.kind==='cue'?'#fbf8ee':p.col;c.beginPath();c.arc(q.x,q.y,rr,0,7);c.fill();c.fillStyle='#ffffff70';c.beginPath();c.arc(q.x-rr*.35,q.y-rr*.35,rr*.3,0,7);c.fill();}
    s.draw(c);
    c.fillStyle=C.cream;c.font='800 15px '+FONT;c.textAlign='left';c.fillText('STÖTAR '+g.shots+' · SÄNKTA '+g.potted+' / '+g.of,12,24);
  };
  g.score=()=>g.potted;
  return g;
}

// ── Dart: nio pilar ─────────────────────────────────────────────────────────────────────────────────────────────────
function dartGame(ui){
  const g={id:'dart',phase:'aim',darts:[],total:0,msg:'Håll inne för att stilla siktet, släpp för att kasta.',w:0,h:0};
  let t=Math.random()*10,hold=0,held=false,aim={x:0,y:0};
  const board=()=>{const r=Math.min(g.w,g.h*.8)*.42;return {cx:g.w/2,cy:g.h*.45,r};};
  g.down=()=>{if(g.phase==='aim'){held=true;hold=0;}};g.move=()=>{};
  g.up=()=>{if(!held||g.phase!=='aim')return;held=false;const hit={x:aim.x+rnd(-.03,.03),y:aim.y+rnd(-.03,.03)},sc=dartScore(hit.x,hit.y);g.darts.push({...hit,...sc});g.total+=sc.score;ui.sound?.('dart');ui.flash?.(sc.label==='MISS'?'MISS':sc.label+' · '+sc.score);
    if(g.darts.length>=9){g.phase='done';g.result={points:g.total,raw:g.total,text:'Nio pilar: '+g.total+' poäng.'};setTimeout(()=>ui.finish?.(g),700);}};
  g.update=dt=>{t+=dt;if(held)hold+=dt;
    // siktet gungar; när man håller inne lugnar det sig en stund, sedan börjar handen skaka
    const steady=held?(hold<1.2?1-hold/1.2*.8:.2+(hold-1.2)*.7):1,amp=.55*clamp(steady,.15,1.4);
    aim={x:Math.sin(t*1.7)*amp*.8+Math.sin(t*3.1)*amp*.25,y:Math.cos(t*1.3)*amp*.7+Math.sin(t*2.3)*amp*.2+.1};};
  g.draw=c=>{
    const w=g.w,h=g.h,{cx,cy,r}=board();c.fillStyle='#0b1f15';c.fillRect(0,0,w,h);
    c.fillStyle='#111';c.beginPath();c.arc(cx,cy,r*1.18,0,7);c.fill();
    for(let i=0;i<20;i++){const a0=(-90-9+i*18)*Math.PI/180,a1=a0+18*Math.PI/180,dark=i%2===0;
      const ring=(r0,r1,col)=>{c.fillStyle=col;c.beginPath();c.arc(cx,cy,r*r1,a0,a1);c.arc(cx,cy,r*r0,a1,a0,true);c.closePath();c.fill();};
      ring(15.9/170,99/170,dark?'#1a1a1a':'#f1e6c8');ring(99/170,107/170,dark?'#b8322c':'#1f7a4a');ring(107/170,162/170,dark?'#1a1a1a':'#f1e6c8');ring(162/170,1,dark?'#b8322c':'#1f7a4a');
      const am=(a0+a1)/2;c.fillStyle='#fff';c.font='800 '+Math.round(r*.1)+'px '+FONT;c.textAlign='center';c.textBaseline='middle';c.fillText(String(DART_ORDER[i]),cx+Math.cos(am)*r*1.09,cy+Math.sin(am)*r*1.09);}
    c.fillStyle='#1f7a4a';c.beginPath();c.arc(cx,cy,r*15.9/170,0,7);c.fill();c.fillStyle='#b8322c';c.beginPath();c.arc(cx,cy,r*6.35/170,0,7);c.fill();
    for(const d of g.darts){const x=cx+d.x*r,y=cy-d.y*r;c.strokeStyle=C.gold;c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.lineTo(x+10,y+14);c.stroke();c.fillStyle='#ffd23f';c.beginPath();c.arc(x,y,3,0,7);c.fill();}
    if(g.phase==='aim'){const x=cx+aim.x*r,y=cy-aim.y*r;c.strokeStyle=held&&hold<1.4?'#7be495':'#ffffff';c.lineWidth=2.5;c.beginPath();c.arc(x,y,12,0,7);c.moveTo(x-20,y);c.lineTo(x+20,y);c.moveTo(x,y-20);c.lineTo(x,y+20);c.stroke();}
    c.fillStyle=C.cream;c.font='800 15px '+FONT;c.textAlign='left';c.fillText('PIL '+Math.min(9,g.darts.length+1)+' AV 9 · '+g.total+' POÄNG',12,24);
  };
  g.score=()=>g.total;
  return g;
}

// ── Straffar: fem skott mot målvakten ───────────────────────────────────────────────────────────────────────────────────
function straffGame(ui){
  const g={id:'straff',phase:'aim',goals:0,shots:0,of:5,msg:'Dra från pucken mot målet och släpp. Målvakten flyttar sig!',w:0,h:0};
  let gk={x:0,v:.9,t:0},puck=null,t=0,wait=0;
  const goal=()=>({cx:g.w/2,y:g.h*.2,hw:Math.min(g.w*.32,180),hh:Math.min(g.w*.18,96)});
  const start=()=>({x:g.w/2,y:g.h*.82});
  const s=sling(g,{origin:()=>g.phase==='aim'?start():null,maxPull:()=>g.h*.32,onRelease:(dx,dy,p)=>{
    if(dy>-.15)return;const st=start(),G=goal(),k=(st.y-G.y)/-dy,tx=st.x+dx*k;
    puck={x:st.x,y:st.y,tx,ty:G.y+G.hh*.5,sp:500+p*700,t:0};g.phase='shot';g.shots++;ui.sound?.('shot');}});
  g.origin=()=>g.phase==='aim'?start():null;
  g.down=(x,y)=>{s.st.on=false;const st=start();if(g.phase==='aim'&&Math.hypot(x-st.x,y-st.y)<120){s.st.on=true;s.st.sx=st.x;s.st.sy=st.y;s.st.x=x;s.st.y=y;}};
  // här drar man FRÅN pucken MOT målet (inte bakåt): spegelvänd slangbellan
  g.move=(x,y)=>{if(s.st.on){const st=start();s.st.x=st.x-(x-st.x);s.st.y=st.y-(y-st.y);}};g.up=()=>s.up();
  g.update=dt=>{
    t+=dt;const G=goal();
    // målvakten glider fram och tillbaka och läser skottet en aning
    gk.t+=dt;const want=puck?clamp((puck.tx-G.cx)/G.hw,-.85,.85)*.55:Math.sin(gk.t*gk.v)*.75;gk.x+=(want-gk.x)*Math.min(1,dt*(puck?2.4:3));
    if(g.phase==='shot'&&puck){const dx=puck.tx-puck.x,dy=puck.ty-puck.y,d=Math.hypot(dx,dy),step=puck.sp*dt;
      if(d<=step){const inside=Math.abs(puck.tx-G.cx)<G.hw*.95,gx=G.cx+gk.x*G.hw,saved=Math.abs(puck.tx-gx)<G.hw*.26;
        const ok=inside&&!saved;if(ok){g.goals++;ui.flash?.('MÅL!');ui.sound?.('goal');}else ui.flash?.(inside?'RÄDDNING!':'UTANFÖR');
        puck=null;g.phase='wait';wait=1;gk.v=rnd(.7,1.6);}
      else{puck.x+=dx/d*step;puck.y+=dy/d*step;}}
    if(g.phase==='wait'){wait-=dt;if(wait<=0){if(g.shots>=g.of){g.phase='done';g.result={points:g.goals,raw:{goals:g.goals,of:g.of},text:g.goals+' mål på '+g.of+' straffar.'};ui.finish?.(g);}else g.phase='aim';}}
  };
  g.draw=c=>{
    const w=g.w,h=g.h,G=goal();
    const ig=c.createLinearGradient(0,0,0,h);ig.addColorStop(0,'#dfeef5');ig.addColorStop(1,'#f6fbfd');c.fillStyle=ig;c.fillRect(0,0,w,h);
    c.strokeStyle='#c0392b';c.lineWidth=4;c.beginPath();c.moveTo(0,G.y+G.hh+6);c.lineTo(w,G.y+G.hh+6);c.stroke();
    c.fillStyle='#9fd0e8aa';c.beginPath();c.ellipse(G.cx,G.y+G.hh+6,G.hw*1.15,G.hh*.6,0,0,Math.PI);c.fill();
    c.strokeStyle='#b8322c';c.lineWidth=6;c.strokeRect(G.cx-G.hw,G.y,G.hw*2,G.hh);c.strokeStyle='#ffffffaa';c.lineWidth=1;for(let i=1;i<10;i++){c.beginPath();c.moveTo(G.cx-G.hw+i*G.hw/5,G.y);c.lineTo(G.cx-G.hw+i*G.hw/5,G.y+G.hh);c.stroke();}
    // målvakten
    const gx=G.cx+gk.x*G.hw;c.fillStyle=C.green;c.fillRect(gx-G.hw*.24,G.y+G.hh*.15,G.hw*.48,G.hh*.85);c.fillStyle=C.cream;c.fillRect(gx-G.hw*.24,G.y+G.hh*.55,G.hw*.48,G.hh*.12);
    c.fillStyle='#f3d2b0';c.beginPath();c.arc(gx,G.y+G.hh*.05,G.hh*.16,0,7);c.fill();c.fillStyle='#fff';c.fillRect(gx-G.hh*.16,G.y-G.hh*.06,G.hh*.32,G.hh*.1);
    const st=start();c.fillStyle='#c0392b';c.beginPath();c.arc(st.x,st.y+30,40,0,7);c.strokeStyle='#c0392b';c.lineWidth=3;c.stroke();
    const p=puck||(g.phase==='aim'?{x:st.x,y:st.y}:null);if(p){c.fillStyle='#111';c.beginPath();c.ellipse(p.x,p.y,12,7,0,0,7);c.fill();}
    s.draw(c);
    c.fillStyle=C.greenDark;c.font='800 15px '+FONT;c.textAlign='left';c.fillText('SKOTT '+Math.min(g.of,g.shots+(g.phase==='aim'?1:0))+' AV '+g.of+' · MÅL '+g.goals,12,24);
  };
  g.score=()=>g.goals;
  return g;
}

const MAKERS={bowling:bowlingGame,shuffle:shuffleGame,biljard:poolGame,dart:dartGame,straff:straffGame};

// ── Fönstret ────────────────────────────────────────────────────────────────────────────────────────────────────────
export function createOlearysGames({storage,meta=null,sound=null,toast=null,onClose=null,onGuide=null,today=()=>''}={}){
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  const layer=el('div','ol-layer');layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
  const head=el('div','ol-head'),brand=el('div','ol-brand',"O'Learys"),title=el('div','ol-title',''),close=el('button','ol-close','✕');close.type='button';close.setAttribute('aria-label','Stäng');
  head.append(brand,title,close);
  const stage=el('div','ol-stage'),canvas=el('canvas','ol-canvas');stage.append(canvas);
  const flashEl=el('div','ol-flash');stage.append(flashEl);
  const foot=el('div','ol-foot'),msg=el('div','ol-msg',''),btns=el('div','ol-btns');foot.append(msg,btns);
  const panel=el('div','ol-panel');panel.hidden=true;stage.append(panel);
  layer.append(head,stage,foot);document.body.append(layer);
  const ctx=canvas.getContext('2d');
  let game=null,raf=0,last=0,penta=null,state=loadOlearys(storage),flashT=0;
  const save=()=>saveOlearys(storage,state);
  const ui={sound:k=>{try{sound?.(k);}catch{}},flash:t=>{flashEl.textContent=t;flashEl.classList.remove('on');void flashEl.offsetWidth;flashEl.classList.add('on');flashT=1.2;},finish:g=>finishGame(g)};
  function resize(){const r=stage.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);if(game){game.w=r.width;game.h=r.height;}}
  const pt=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  canvas.addEventListener('pointerdown',e=>{if(!game)return;canvas.setPointerCapture?.(e.pointerId);const p=pt(e);game.down?.(p.x,p.y);e.preventDefault();});
  canvas.addEventListener('pointermove',e=>{if(!game)return;const p=pt(e);game.move?.(p.x,p.y);e.preventDefault();});
  const up=e=>{if(!game)return;game.up?.();e.preventDefault();};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.style.touchAction='none';
  function loop(ts){
    raf=requestAnimationFrame(loop);const dt=Math.min(.05,last?(ts-last)/1000:0);last=ts;
    if(!game)return;game.update?.(dt);game.draw?.(ctx);if(game.msg&&msg.textContent!==game.msg)msg.textContent=game.msg;
  }
  function open(){layer.hidden=false;document.body.classList.add('ol-open');resize();if(!raf){last=0;raf=requestAnimationFrame(loop);}}
  function shut(){layer.hidden=true;document.body.classList.remove('ol-open');cancelAnimationFrame(raf);raf=0;game=null;penta=null;panel.hidden=true;onClose?.();}
  close.addEventListener('click',shut);
  window.addEventListener('resize',()=>{if(!layer.hidden)resize();});
  const button=(text,cls,fn)=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;};
  function setButtons(list){btns.replaceChildren(...list);}
  function startGame(id){
    const a=activity(id);if(!a)return;panel.hidden=true;
    game=MAKERS[id](ui);resize();title.textContent=(penta?'FEMKAMPEN · '+(penta.i+1)+'/5 · ':'')+a.name;msg.textContent=a.text;
    setButtons([button('AVSLUTA','ol-btn ghost',()=>{if(penta)showPentaEnd(true);else shut();})]);
  }
  // XP för aktiviteterna (framstegen begränsar hur många om dagen, se xmas-meta.mjs onActivity)
  const giveXp=(id,pts,isPenta=false)=>{try{return meta?.onActivity?.({id,points:pts,penta:isPenta})||null;}catch{return null;}};
  function finishGame(g){
    const r=g.result;if(!r)return;
    const best=recordActivity(state,g.id,g.id==='biljard'?pentaPoints('biljard',r.raw):r.points);save();
    if(penta){
      const p=pentaPoints(g.id,r.raw);penta.points.push({id:g.id,p,text:r.text});penta.i++;
      showPanel('+'+p+' FEMKAMPSPOÄNG',r.text,penta.i<5?[button('NÄSTA GREN →','ol-btn',()=>startGame(penta.order[penta.i]))]:[button('SE RESULTATET →','ol-btn',()=>showPentaEnd(false))]);
      return;
    }
    const R=giveXp(g.id,r.points);
    showPanel(best?'NYTT REKORD!':'BRA SPELAT!',r.text+(R&&R.xp?' +'+R.xp+' XP.':''),[button('SPELA IGEN','ol-btn',()=>startGame(g.id)),button('STÄNG','ol-btn ghost',shut)]);
  }
  function showPanel(h,text,list){panel.replaceChildren(el('h3',null,h),el('p',null,text),...list);panel.hidden=false;setButtons([button('STÄNG','ol-btn ghost',shut)]);}
  function startPenta(){penta={order:['bowling','shuffle','biljard','dart','straff'],i:0,points:[]};startGame(penta.order[0]);}
  function showPentaEnd(aborted){
    if(!penta)return shut();
    const total=penta.points.reduce((s,x)=>s+x.p,0),done=penta.points.length===5;
    let rec={dayBest:false,record:false},R=null;
    if(done){rec=recordPenta(state,total,today());save();R=giveXp('penta',total,true);}
    game=null;title.textContent='FEMKAMPEN';ctx.clearRect(0,0,canvas.width,canvas.height);
    const rows=el('div','ol-rows');for(const x of penta.points){const r=el('div','ol-row');r.append(el('span',null,activity(x.id).name),el('b',null,x.p+' p'));rows.append(r);}
    panel.replaceChildren(el('h3',null,done?(rec.record?'NYTT FEMKAMPSREKORD!':rec.dayBest?'DAGENS BÄSTA!':'FEMKAMPEN KLAR'):'FEMKAMPEN AVBRUTEN'),
      el('p','ol-big',total+' / 500'),rows,el('p',null,(done?'Rekord '+state.penta.best+' · i dag '+state.penta.dayBest+'.':'Avbruten efter '+penta.points.length+' grenar: räknas inte.')+(R&&R.xp?' +'+R.xp+' XP.':'')),
      button('SPELA IGEN','ol-btn',()=>startPenta()),button('STÄNG','ol-btn ghost',shut));
    panel.hidden=false;setButtons([button('STÄNG','ol-btn ghost',shut)]);penta=null;
  }
  // ── FBK-tipset
  function openTips(){
    open();game=null;title.textContent='FBK-TIPSET';ctx.clearRect(0,0,canvas.width,canvas.height);
    const now=Date.now(),tot=tipTotals(state.tips,FBK_MATCHES);
    const wrap=el('div','ol-tips');
    wrap.append(el('p','ol-note','Tippa Färjestads matcher i december. Rätt 1, X eller 2 ger '+TIP_POINTS.outcome+' tipspoäng, rätt resultat '+TIP_POINTS.exact+' till. Bara på skoj: inga pengar, inga priser, och tipspoängen ger varken XP eller lotter.'));
    wrap.append(el('p','ol-total','DINA TIPSPOÄNG: '+tot.points+(tot.settled?' · '+tot.right+' av '+tot.settled+' rätt':'')));
    for(const m of FBK_MATCHES){
      const t=state.tips[m.id],open_=tipOpen(m,now),card=el('div','ol-match');
      const d=new Date(matchStart(m)),dd=m.start.slice(8,10).replace(/^0/,'')+'/'+m.start.slice(5,7).replace(/^0/,'')+' '+m.start.slice(11);
      card.append(el('div','ol-mh',dd+' · '+m.arena),el('div','ol-mt',m.home+' – '+m.away));
      if(m.result){const p=tipPoints(t,m.result);card.append(el('div','ol-mr','Resultat '+m.result.home+'–'+m.result.away+(t?' · ditt tips '+t.pick+(t.home!=null?' ('+t.home+'–'+t.away+')':'')+' · '+p+' p':' · inget tips')));}
      else if(!open_)card.append(el('div','ol-mr',t?'Ditt tips: '+t.pick+(t.home!=null?' ('+t.home+'–'+t.away+')':'')+' · väntar på resultatet':'Matchen har börjat: tipset är stängt'));
      else{
        const row=el('div','ol-picks');
        for(const k of ['1','X','2'])row.append(button(k,'ol-pick'+(t&&t.pick===k?' on':''),()=>{state.tips[m.id]={pick:k,home:t?.home??null,away:t?.away??null,at:Date.now()};save();openTips();}));
        const sc=el('div','ol-score');
        const stepper=(side)=>{const v=t?.[side];const box=el('span','ol-step');box.append(button('−','ol-mini',()=>{const cur=state.tips[m.id]||{pick:'1',home:null,away:null};const n=Math.max(0,(cur[side]??0)-1);state.tips[m.id]={...cur,[side]:n,at:Date.now()};fixPick(m.id);save();openTips();}),el('b',null,v==null?'–':String(v)),button('+','ol-mini',()=>{const cur=state.tips[m.id]||{pick:'1',home:null,away:null};const n=Math.min(15,(cur[side]??-1)+1);state.tips[m.id]={...cur,[side]:n,at:Date.now()};fixPick(m.id);save();openTips();}));return box;};
        sc.append(el('span','ol-sl','Resultat (frivilligt):'),stepper('home'),el('span',null,'–'),stepper('away'));
        card.append(row,sc);
      }
      if(m.note)card.append(el('div','ol-mn',m.note));
      wrap.append(card);
    }
    wrap.append(el('p','ol-note','Spelschema: '+FBK_SOURCE+'. Tider kan ändras. Resultaten läggs in i spelet efter matcherna.'));
    panel.replaceChildren(wrap);panel.hidden=false;setButtons([button('STÄNG','ol-btn ghost',shut)]);msg.textContent='Tippa före nedsläpp. Du kan ändra ditt tips fram till dess.';
  }
  function fixPick(id){const t=state.tips[id];if(t&&t.home!=null&&t.away!=null)t.pick=outcomeOf(t.home,t.away);}
  // ── baren och karaoken (kort)
  function openInfo(kind){
    open();game=null;ctx.clearRect(0,0,canvas.width,canvas.height);
    if(kind==='bar'){title.textContent='BAREN';panel.replaceChildren(el('h3',null,'VÄLKOMMEN TILL BAREN'),el('p',null,'Här går sporten på storbild: hockey, fotboll och studio. Nästa FBK-match står på skärmarna, och tipset finns i tipshörnan bredvid.'),
      el('p',null,'Julbord onsdag–fredag i december (399 och 649 kr enligt O\'Learys egen sida, kontrollerat 25 november 2026).'),
      button('JULBORDET I JULGUIDEN','ol-btn',()=>{shut();onGuide?.('olearys');}),button('FBK-TIPSET','ol-btn ghost',()=>openTips()));}
    else{title.textContent='KARAOKE';panel.replaceChildren(el('h3',null,'KARAOKERUMMET'),el('p',null,'Rummet är bokat i kväll, men du hör sången genom glaset. Kom tillbaka en annan gång!'),button('STÄNG','ol-btn',shut));}
    panel.hidden=false;setButtons([button('STÄNG','ol-btn ghost',shut)]);msg.textContent="Spelets egen tolkning av O'Learys. Inget samarbete är bekräftat.";
  }
  function openStation(id){
    if(id==='tips')return openTips();
    if(id==='bar'||id==='karaoke')return openInfo(id);
    open();
    if(id==='penta'){title.textContent='FEMKAMPEN';game=null;ctx.clearRect(0,0,canvas.width,canvas.height);
      panel.replaceChildren(el('h3',null,'FEMKAMPEN'),el('p',null,'Bowling, shuffleboard, biljard, dart och straffar i följd. Varje gren ger upp till 100 poäng.'),el('p','ol-big','Rekord '+state.penta.best+' / 500'),el('p',null,'I dag: '+(state.penta.day===today()?state.penta.dayBest:0)+' / 500'),
        button('STARTA FEMKAMPEN →','ol-btn',()=>startPenta()),button('STÄNG','ol-btn ghost',shut));panel.hidden=false;setButtons([button('STÄNG','ol-btn ghost',shut)]);msg.textContent='Alla fem grenarna i följd. Bäst under kvällen vinner äran.';return;}
    startGame(id);
  }
  return {openStation,openTips,close:shut,get open(){return !layer.hidden;},get state(){return state;},snapshot:()=>({open:!layer.hidden,game:game?game.id:null,phase:game?.phase||null,penta:penta?penta.i:null,best:{...state.best},pentaBest:state.penta.best,tips:Object.keys(state.tips).length}),
    _game:()=>game};
}
