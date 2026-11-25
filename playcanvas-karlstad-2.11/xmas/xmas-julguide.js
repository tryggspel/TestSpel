// Julguiden (2.21.1-xmas.14): skyltar för julbord och julmarknader vid sina riktiga adresser (xmas-julguide-data.mjs), en ruta när man går förbi och ett kort med uppgifterna.
// Skyltarna är gatupratare (A-skyltar) med en lykta ovanpå som syns på håll. Alla skyltar är en mesh och en bildatlas; lyktorna delar julens sken-material.
// Kortet och listan är egna lager ovanpå spelet (inga av grundspelets paneler), så att spelet fortsätter bakom dem.
import {GUIDE,JULGUIDE,placedGuide,nearestGuide,guideById} from './xmas-julguide-data.mjs?v=2.21.1-xmas.17';

const CELL_W=256,CELL_H=320,COLS=4;
const COLORS=Object.freeze({julbord:{band:'#b8322c',bandDark:'#7f1f1b',label:'JULBORD'},julmarknad:{band:'#1f6b47',bandDark:'#134a30',label:'JULMARKNAD'}});
function wrap(c,text,maxW){const words=String(text).split(' '),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(c.measureText(t).width>maxW&&cur){lines.push(cur);cur=w;}else cur=t;}if(cur)lines.push(cur);return lines;}
// En skylt: krita mot mörkgrön tavla, färgat band överst, namn, datum och en liten gran.
export function drawGuideBoard(c,x0,y0,e){
  const col=COLORS[e.kind]||COLORS.julbord;
  c.save();c.translate(x0,y0);
  c.fillStyle='#5a3a22';c.fillRect(0,0,CELL_W,CELL_H);                       // träram
  c.fillStyle='#1d2b27';c.fillRect(12,12,CELL_W-24,CELL_H-24);                // tavla
  c.fillStyle=col.band;c.fillRect(12,12,CELL_W-24,58);c.fillStyle=col.bandDark;c.fillRect(12,66,CELL_W-24,4);
  c.fillStyle='#fff6df';c.textAlign='center';c.textBaseline='middle';c.font='900 34px system-ui,sans-serif';c.fillText(col.label,CELL_W/2,42,CELL_W-40);
  c.fillStyle='#fffbe9';c.font='800 30px system-ui,sans-serif';
  const name=wrap(c,e.name.toUpperCase(),CELL_W-44).slice(0,3);name.forEach((l,i)=>c.fillText(l,CELL_W/2,108+i*34,CELL_W-40));
  c.fillStyle='#ffd77a';c.font='700 22px system-ui,sans-serif';
  const when=wrap(c,e.when,CELL_W-44).slice(0,2);when.forEach((l,i)=>c.fillText(l,CELL_W/2,112+name.length*34+8+i*26,CELL_W-40));
  // liten gran med stjärna längst ned
  const gx=CELL_W/2,gy=CELL_H-38;c.fillStyle='#3f9462';for(let k=0;k<3;k++){c.beginPath();c.moveTo(gx,gy-34+k*10);c.lineTo(gx+16+k*5,gy-12+k*10);c.lineTo(gx-16-k*5,gy-12+k*10);c.closePath();c.fill();}
  c.fillStyle='#ffd23f';c.beginPath();for(let k=0;k<10;k++){const r=k%2?3.5:8,a=-Math.PI/2+k*Math.PI/5;c.lineTo(gx+Math.cos(a)*r,gy-40+Math.sin(a)*r);}c.closePath();c.fill();
  c.fillStyle='#ffffffb0';c.font='600 15px system-ui,sans-serif';c.fillText('TRYCK FÖR MER',CELL_W/2,CELL_H-14);
  c.restore();
}
export function drawGuideAtlas(c,list){list.forEach((e,i)=>drawGuideBoard(c,(i%COLS)*CELL_W,Math.floor(i/COLS)*CELL_H,e));}

// Gatupratarens mesh: två lutande tavlor (fram och bak) per skylt, båda läsbara från sitt håll.
function boardMesh(pc,dev,list,W,H){
  const pos=[],uv=[],idx=[];
  list.forEach((e,i)=>{
    const yaw=(e.yaw||0)*Math.PI/180,fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
    const u0=(i%COLS)*CELL_W/W,u1=((i%COLS)+1)*CELL_W/W,v1=1-Math.floor(i/COLS)*CELL_H/H,v0=1-(Math.floor(i/COLS)+1)*CELL_H/H;
    for(const side of [1,-1]){ // fram (mot gatan) och bak
      const v=pos.length/3,hw=.46,feet=.36*side,top=.05*side,sr=side; // baksidan: höger och vänster byter plats så att bilden blir rättvänd
      const p=(lx,ly,off)=>[e.x+fx*off+rx*lx*sr,ly,e.z+fz*off+rz*lx*sr];
      pos.push(...p(-hw,.06,feet),...p(hw,.06,feet),...p(hw,1.24,top),...p(-hw,1.24,top));
      uv.push(u0,v0,u1,v0,u1,v1,u0,v1);idx.push(v,v+1,v+2,v,v+2,v+3);
    }
  });
  const m=new pc.Mesh(dev);m.setPositions(pos);m.setUvs(0,uv);m.setNormals(pos.map((_,i)=>i%3===1?1:0));m.setIndices(idx);m.update(pc.PRIMITIVE_TRIANGLES);return m;
}

export function createJulguide(pc,host,{root,texture,sprites,snap=null,bright=null},{onNear=null}={}){
  const dev=host.app.graphicsDevice;
  // Platser utan hus i utdraget flyttas till närmaste gångbara punkt (spelets karta).
  const list=placedGuide().map(e=>{if(!e.snap||!snap)return e;const q=snap({x:e.x,z:e.z});return q?{...e,x:q.x,z:q.z}:e;});
  const rows=Math.ceil(list.length/COLS),W=CELL_W*COLS,H=CELL_H*rows;
  const tex=texture(c=>drawGuideAtlas(c,list),W,H);
  const mat=new pc.StandardMaterial();mat.name='Julguidens skyltar';mat.useLighting=false;mat.diffuse.set(0,0,0);mat.emissive.set(1,1,1);mat.emissiveMap=tex;mat.cull=pc.CULLFACE_NONE;mat.update();
  bright?.add(mat); // läsbara även i mörker (en lykta lyser på dem)
  const ent=new pc.Entity('Julguiden · skyltar');ent.addComponent('render',{meshInstances:[new pc.MeshInstance(boardMesh(pc,dev,list,W,H),mat)]});root.addChild(ent);
  // Lyktan ovanpå: ett varmt sken som syns på håll och pulserar lite.
  const glows=list.map(e=>{const g=sprites.spriteEntity('Julguiden · lykta '+e.id,sprites.glowWarm,1.3,1.3,{});g.setPosition(e.x,1.55,e.z);return g;});
  let near=null,t=0;
  function update(p,now,dt){
    t+=dt||0;
    const cam=host.camera.getPosition();
    for(let i=0;i<list.length;i++){const e=list[i],g=glows[i],d=Math.hypot(e.x-cam.x,e.z-cam.z),on=d<GUIDE.show;if(g.enabled!==on)g.enabled=on;if(on){const s=1.1+Math.sin(t*2.2+i)*.12;g.setLocalScale(s,s,1);g.setEulerAngles(0,sprites.yawToward(e.x,e.z,cam),0);}}
    const n=nearestGuide(p,GUIDE.near,list),id=n?n.entry.id:null;
    if(id!==(near?.id||null)){near=n?n.entry:null;onNear?.(near);}
  }
  return {update,list,get near(){return near;},entry:id=>list.find(e=>e.id===id)||guideById(id),material:mat,snapshot:()=>({boards:list.length,near:near?.id||null,places:list.map(e=>({id:e.id,x:+e.x.toFixed(1),z:+e.z.toFixed(1)}))})};
}

// ── Gränssnittet: rutan när man går förbi, kortet och listan ──────────────────────────────────────────────────────
const KIND_LABEL={julbord:'JULBORD',julmarknad:'JULMARKNAD'};
export function createJulguideUi({meta=null,coupons=[],fx={}}={}){
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
  // rutan nere i mitten
  const near=el('button','xmas-guide-near');near.type='button';near.hidden=true;document.body.append(near);
  // kortet och listan i ett eget lager
  const layer=el('div','xmas-guide-layer');layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
  const card=el('section','round-card compact xmas-card xmas-guide-card');layer.append(card);document.body.append(layer);
  layer.addEventListener('click',e=>{if(e.target===layer)close();});
  let current=null;
  function setNear(e){
    current=e;near.hidden=!e;if(!e)return;
    near.replaceChildren(el('span','xgn-kind',KIND_LABEL[e.kind]||'JULGUIDEN'),el('b',null,e.name),el('span','xgn-go','VISA →'));
    near.setAttribute('aria-label',(KIND_LABEL[e.kind]||'')+' '+e.name+'. Tryck för mer.');
  }
  near.addEventListener('click',()=>{if(current)openEntry(current);});
  function close(){layer.hidden=true;card.replaceChildren();}
  const row=(k,v)=>{const r=el('div','xgc-row');r.append(el('span',null,k),el('b',null,v));return r;};
  function openEntry(e){
    card.replaceChildren();
    const lab=el('div','episode-label');lab.append(el('span',null,'JULGUIDEN'),el('span',null,KIND_LABEL[e.kind]||''));
    card.append(lab,el('h2',null,e.name.toUpperCase()));
    card.append(el('p','round-lead',e.text));
    const grid=el('div','xgc-grid');grid.append(row('NÄR',e.when),row('PRIS',e.price),row('ADRESS',e.address));card.append(grid);
    const cp=e.coupon?coupons.find(c=>c.id===e.coupon):null;
    const offer=el('p','xgc-offer',cp?'ERBJUDANDE I SPELET: '+cp.title+'. '+(cp.text||''):e.qr?e.qr:'Inga erbjudanden här än. Hittar du en QR-kod hos stället kan den ge något i spelet.');card.append(offer);
    card.append(el('p','round-fine','Uppgifterna kommer från '+e.source+' och kontrollerades '+e.checked.split('-').reverse().slice(0,2).map(Number).join('/')+'. De kan ha ändrats: kontrollera hos stället. Spelets egen julguide, inget samarbete.'));
    let xp=0;try{const R=meta?.onGuide?.(e.id);xp=R?.xp||0;}catch{}
    if(xp)card.append(el('p','xgc-xp','+'+xp+' XP · första besöket i julguiden'));
    const back=el('button','round-primary xmas-primary','STÄNG');back.type='button';back.addEventListener('click',close);card.append(back);
    if(fx.list){const all=el('button','round-tertiary','Hela julguiden');all.type='button';all.addEventListener('click',()=>openList());card.append(all);}
    layer.hidden=false;back.focus?.();
  }
  // Listan: julbord och julmarknader, med GÅ DIT för dem som finns på kartan.
  function openList(fromMenu=false){
    card.replaceChildren();
    const lab=el('div','episode-label');lab.append(el('span',null,'KARLSTAD'),el('span',null,'JULGUIDEN'));
    card.append(lab,el('h2',null,'JULBORD OCH JULMARKNADER'));
    card.append(el('p','round-lead','Gå förbi skyltarna i staden, eller välj ett ställe så visar pilen vägen.'));
    let seen={};try{seen=meta?.state?.guide||{};}catch{}
    for(const kind of ['julbord','julmarknad']){
      card.append(el('h3','xgc-head',kind==='julbord'?'JULBORD':'JULMARKNADER'));
      const ul=el('ul','xgc-list');
      for(const e of JULGUIDE.filter(x=>x.kind===kind)){
        const li=el('li',seen[e.id]?'seen':'');const txt=el('div','xgc-li');txt.append(el('b',null,(seen[e.id]?'✓ ':'')+e.name),el('span',null,e.when+' · '+e.address));li.append(txt);
        if(e.place&&fx.go){const go=el('button','round-secondary xgc-go','GÅ DIT');go.type='button';go.addEventListener('click',()=>{close();fx.go(e);});li.append(go);}
        else{const info=el('button','round-tertiary xgc-go','INFO');info.type='button';info.addEventListener('click',()=>openEntry(e));li.append(info);}
        ul.append(li);
      }
      card.append(ul);
    }
    card.append(el('p','round-fine','Olssons Bazar, Julins, Race Course, Almars gård och Södra Älgånäs ligger utanför spelets karta eller kunde inte placeras: de finns bara i listan. Uppgifterna kontrollerades 25 november 2026; kontrollera hos stället.'));
    const back=el('button','round-primary xmas-primary','STÄNG');back.type='button';back.addEventListener('click',close);card.append(back);
    layer.hidden=false;
  }
  return {setNear,openEntry,openList,close,get open(){return !layer.hidden;},hide(){near.hidden=true;close();},snapshot:()=>({near:near.hidden?null:current?.id||null,open:!layer.hidden})};
}
