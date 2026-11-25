// O'Learys Karlstad (2.21.1-xmas.14): lokalen i 3D, gästerna och personalen, skärmarna och dörrarna. Ritningen ligger i olearys-data.mjs.
// Allt fast är sammanslaget i ett par meshar (ComicMesh med vertexfärger); skärmar, skyltar och logotyp är bildkort med egna texturer. Ingen snö, inget ljus som tonas:
// materialen läggs i julbyggets "bright"-mängd, så att lokalen är lika ljus på kvällen som på dagen.
import {ComicMesh} from '../city-architecture.js?v=2.21.1-xmas.16';
import {VENUE,OL_COLORS as C,FURNITURE,LANES,STATIONS,toWorld,toLocal,inVenue,FBK_MATCHES} from './olearys-data.mjs?v=2.21.1-xmas.16';
import {PEOPLE_ATLAS,PEOPLE_CELL,drawPeopleAtlas,peopleUv,styleIndex,PEOPLE_STYLES} from './xmas-people-art.js?v=2.21.1-xmas.16';
import {matchStart} from './olearys-rules.mjs?v=2.21.1-xmas.16';

const O=VENUE.origin;
// ComicMesh i världskoordinater med lokalens origo
function venueMesh(){
  const m=new ComicMesh(true);
  const B=(x,y,z,w,h,d,c,s)=>m.box(O.x+x,y,O.z+z,w,h,d,c,s);
  const Q=(a,b,c,d,col)=>m.quad([O.x+a[0],a[1],O.z+a[2]],[O.x+b[0],b[1],O.z+b[2]],[O.x+c[0],c[1],O.z+c[2]],[O.x+d[0],d[1],O.z+d[2]],col);
  return {m,B,Q};
}
const fmtMatch=m=>{const d=new Date(matchStart(m));const day=['SÖN','MÅN','TIS','ONS','TOR','FRE','LÖR'][new Date(d.getTime()+3600e3).getUTCDay()];const [Y,Mo,D]=m.start.slice(0,10).split('-').map(Number);return day+' '+D+'/'+Mo+' '+m.start.slice(11);};
export function nextMatch(now=Date.now()){return FBK_MATCHES.find(m=>matchStart(m)+2.5*3600e3>now)||null;}

function buildStatic(pc,app){
  const {m,B,Q}=venueMesh(),W=VENUE.w,D=VENUE.d,H=VENUE.h,hw=W/2;
  // golv: plankor i två bruna toner (längs z), bowlinghallens ljusa banor ritas separat
  for(let i=0;i<W/1.2;i++){const x=-hw+i*1.2+.6;Q([x-.6,0,0],[x+.6,0,0],[x+.6,0,-D],[x-.6,0,-D],i%2?'#6b4a30':'#76523a');}
  // tak: mörkt med bjälkar
  Q([-hw,H,-D],[hw,H,-D],[hw,H,0],[-hw,H,0],'#1c1a17');
  for(let z=-3;z>-D;z-=4)B(0,H-.18,z,W,.36,.3,'#2b231c');
  // väggar: mörk träpanel nertill, tegel i mitten, grönt upptill
  const wall=(x0,z0,x1,z1)=>{
    const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(L/2));
    for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,a=[x0+(x1-x0)*t0,z0+(z1-z0)*t0],b=[x0+(x1-x0)*t1,z0+(z1-z0)*t1];
      Q([a[0],0,a[1]],[b[0],0,b[1]],[b[0],1.15,b[1]],[a[0],1.15,a[1]],C.wood);
      Q([a[0],1.15,a[1]],[b[0],1.15,b[1]],[b[0],1.22,b[1]],[a[0],1.22,a[1]],C.gold);
      Q([a[0],1.22,a[1]],[b[0],1.22,b[1]],[b[0],3.1,b[1]],[a[0],3.1,a[1]],i%2?'#7a3b2e':'#843f31');
      Q([a[0],3.1,a[1]],[b[0],3.1,b[1]],[b[0],H,b[1]],[a[0],H,a[1]],C.greenDark);
    }
  };
  // väggarna vänds inåt: punkternas ordning ger normalen in mot rummet (materialet ritar båda sidor ändå)
  wall(-hw,0,-hw,-D);wall(hw,-D,hw,0);wall(-hw,-D,hw,-D);wall(hw,0,-hw,0);
  // tegelfogar (ljusa streck) på vänster och höger vägg
  for(const x of [-hw+.02,hw-.02])for(let y=1.5;y<3.1;y+=.42)B(x,y,-D/2,.02,.03,D,'#a7685a');
  // entrén: dörr med glas och en matta
  B(0,1.25,-.05,2.2,2.5,.12,'#2a1d14');B(0,1.3,-.12,1.6,2.1,.04,'#5b7d84');B(0,.01,-1.6,2.6,.02,1.8,C.greenDeep);
  // ── baren
  B(-13.4,.56,-12,1.1,1.12,16,C.woodLight,C.wood);B(-13.4,1.14,-12,1.35,.06,16.3,'#2a1d14');            // disk och skiva
  B(-12.82,.25,-12,.05,.4,16,C.gold);                                                                       // fotstång
  B(-16.5,1.2,-12,1,2.4,16,'#3a281a');for(let y=1.25;y<2.4;y+=.42)B(-16.0,y,-12,.08,.04,15.4,'#6b4a30');   // hylla
  for(let i=0;i<70;i++){const z=-19.5+i*.22,row=i%3,col=['#2f6b3a','#7a4b1e','#b8a24a','#4a2d1e','#8fb5b0','#c8c2b0'][(i*7)%6];B(-16.0,1.25+row*.42+.16,z,.07,.28,.07,col);}
  for(let i=0;i<8;i++)B(-13.6,1.36,-17.5+i*.9,.08,.4,.08,C.gold);                                         // tappkranar
  for(let i=0;i<9;i++){const z=-19.2+i*1.8;B(-12.2,.38,z,.38,.76,.38,'#2a1d14');B(-12.2,.8,z,.5,.08,.5,C.green);} // barpallar
  // ── restaurangdelen: bord, stolar och båsen
  for(const f of FURNITURE.filter(f=>f.id.startsWith('table-'))){
    B(f.x,.74,f.z,f.w,.05,f.d,'#4a3020');B(f.x,.37,f.z,.12,.7,.12,'#2a1d14');
    for(const [dx,dz] of [[-.95,0],[.95,0]]){B(f.x+dx,.23,f.z+dz,.45,.46,.45,'#2a1d14');B(f.x+dx*1.22,.68,f.z+dz,.06,.5,.45,C.green);}
  }
  for(const f of FURNITURE.filter(f=>f.id.startsWith('booth-'))){B(f.x,.25,f.z,f.w,.5,f.d,C.wood);B(f.x+.55,.85,f.z,.4,.7,f.d,C.green,C.greenDark);B(f.x-.35,.52,f.z,.8,.08,f.d-.2,C.green);B(f.x-1.4,.74,f.z,.8,.05,1.4,'#4a3020');}
  // ── biljardborden
  for(const f of FURNITURE.filter(f=>f.id.startsWith('pool-'))){
    for(const [dx,dz] of [[-.6,-1.1],[.6,-1.1],[-.6,1.1],[.6,1.1]])B(f.x+dx,.33,f.z+dz,.16,.66,.16,'#3a2414');
    B(f.x,.72,f.z,f.w,.12,f.d,'#4a2a16');B(f.x,.79,f.z,f.w-.24,.02,f.d-.24,'#1f7a4a');
    for(const [dx,dz] of [[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]])B(f.x+dx*(f.w/2-.1),.8,f.z+dz*(f.d/2-.1),.12,.02,.12,'#111');
    for(let i=0;i<6;i++)B(f.x-.2+(i%3)*.12,.83,f.z-.7+Math.floor(i/3)*.11,.06,.06,.06,['#e0c030','#2050b0','#c02828','#5a2a88','#e07a20','#2a8a3a'][i]);
    B(f.x,.83,f.z+.7,.06,.06,.06,'#ffffff');
  }
  // ── shuffleboardborden: ljust trä med zonerna 1–3 och 4 längst bort
  for(const f of FURNITURE.filter(f=>f.id.startsWith('shuffle-'))){
    B(f.x,.4,f.z,f.w+.12,.8,f.d+.1,C.wood);B(f.x,.81,f.z,f.w-.06,.02,f.d,'#d8b886');
    const far=f.z-f.d/2;for(const [t,c] of [[.62,'#1c3d2c'],[.78,'#1c3d2c'],[.9,'#1c3d2c'],[.985,'#b8322c']])B(f.x,.825,far+f.d*(1-t),f.w-.06,.005,.03,c);
    for(let i=0;i<4;i++){B(f.x-.12,.84,f.z+f.d/2-.3-i*.12,.07,.03,.07,'#b8322c');B(f.x+.12,.84,f.z+f.d/2-.3-i*.12,.07,.03,.07,'#2050b0');}
  }
  // ── darttavlorna på högra väggen (tre tavlor med ljuskappor)
  for(const z of [-29.2,-31,-32.8]){B(16.88,1.73,z,.04,.7,.7,'#111');B(16.85,1.73,z,.03,.56,.56,'#1d3a24');B(16.83,1.73,z,.02,.36,.36,'#b8322c');B(16.82,1.73,z,.02,.12,.12,'#2a8a3a');B(16.5,2.4,z,.6,.12,.9,'#1a1a1a');B(15.2,.01,z,.04,.02,.8,'#ffd77a');}
  B(16.6,1.1,-31,.6,.06,5,'#2a1d14');
  // ── hockeyspelet (straffmaskinen): skåp med målbur och skärm
  B(-15.6,.55,-27,1.6,1.1,2.4,'#14281e');B(-15.6,1.15,-27,1.5,.06,2.3,'#e8f0f4');B(-16.2,1.5,-27,.25,.7,1.4,'#cfd8dc');B(-16.32,1.5,-27,.04,.62,1.3,'#b8322c');B(-15.0,2.0,-27,.2,1,2.4,C.green);
  // ── tipshörnan och femkampens podium (skärmarna är bildkort)
  B(-11.2,.6,-21.5,.3,1.2,.3,'#222');B(-11.2,.02,-21.5,1,.04,.7,'#222');
  B(0,.4,-26.6,2.4,.8,.8,C.green,C.greenDark);B(0,.82,-26.6,2.5,.06,.9,C.gold);
  // ── bowlinghallen: ansats, foul-linje, banor med rännor, käglorna och kappan över dem
  B(-4,.005,-33.2,11.4,.01,3,'#a07850');
  for(let i=0;i<LANES.count;i++){
    const x=LANES.x0+i*LANES.pitch;
    B(x,.15,(LANES.foul+LANES.pins-1.2)/2,LANES.width,.3,LANES.foul-LANES.pins+1.2,'#e2c79a','#c9a874');
    B(x,.31,LANES.foul+.02,LANES.width,.005,.05,'#b8322c');
    for(const s of [-1,1])B(x+s*(LANES.width/2+.12),.1,(LANES.foul+LANES.pins-1.2)/2,.22,.2,LANES.foul-LANES.pins+1.2,'#555');
    for(let k=0;k<6;k++)B(x,.31,LANES.foul-1.5-k*.9,.05,.005,.05,'#5b3a22');                  // pilarna
    // käglorna i triangel
    let n=0;for(let row=0;row<4;row++)for(let k=0;k<=row;k++){const px=x+(k-row/2)*.3,pz=LANES.pins-row*.26;B(px,.5,pz,.11,.38,.11,'#f7f4ea');B(px,.58,pz,.115,.04,.115,'#b8322c');n++;}
  }
  B(-4,1.7,LANES.pins-1.2,11.6,1.6,.4,C.green,C.greenDark);B(-4,.6,LANES.pins-1.5,11.6,1.2,.2,'#111');           // kappan och bakväggen
  for(const f of FURNITURE.filter(f=>f.id.startsWith('ballreturn-'))){B(f.x,.42,f.z,f.w,.85,f.d,'#1d1d1d');for(let k=0;k<3;k++)B(f.x,.95,f.z-.4+k*.4,.24,.24,.24,['#b8322c','#2050b0','#155939'][k]);}
  for(let i=0;i<3;i++)B(-4.8+i*-0+((i-1)*4.8),.45,-31.2,2.6,.45,.7,C.green,C.greenDark);                             // soffor vid ansatsen
  // ── karaokerummet: golv i annan färg, en liten scen
  B(11.5,.005,-40.5,10.6,.01,15,'#2b1f3a');B(13,.12,-45,6,.24,3,'#3a2850');
  // ── pendellampor (bildkort för skenet läggs ovanpå)
  for(let z=-4;z>-30;z-=6)for(const x of [-6,0,6,11]){B(x,H-.6,z,.04,1.2,.04,'#111');B(x,H-1.25,z,.42,.18,.42,C.greenDark);}
  return m;
}

// Skärmar, skyltar och logotyp: en canvas per skärmtyp, ritas om när innehållet ändras.
function drawScreen(c,w,h,{title,lines,accent}){
  const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#0b2a1b');g.addColorStop(1,'#03120a');c.fillStyle=g;c.fillRect(0,0,w,h);
  c.strokeStyle=C.gold;c.lineWidth=6;c.strokeRect(3,3,w-6,h-6);
  c.fillStyle=accent||C.gold;c.font='900 '+Math.round(h*.13)+'px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(title,w/2,h*.18,w-30);
  c.fillStyle=C.white;lines.forEach((l,i)=>{c.font=(i===0?'900 ':'700 ')+Math.round(h*(i===0?.15:.1))+'px system-ui,sans-serif';c.fillText(l,w/2,h*(.42+i*.17),w-30);});
}
function drawLogoPlate(c,w,h,img){
  c.fillStyle=C.green;c.fillRect(0,0,w,h);c.strokeStyle=C.gold;c.lineWidth=8;c.strokeRect(6,6,w-12,h-12);
  if(img&&img.width){const s=Math.min((w-60)/img.width,(h-50)/img.height);c.drawImage(img,(w-img.width*s)/2,(h-img.height*s)/2,img.width*s,img.height*s);}
  else{c.fillStyle=C.cream;c.font='italic 900 '+Math.round(h*.42)+'px Georgia,serif';c.textAlign='center';c.textBaseline='middle';c.fillText("O'Learys",w/2,h*.52,w-40);}
}

export function createOlearysVenue(pc,host,{root,texture,bright=null,lite=()=>0},{onPrompt=null}={}){
  const app=host.app,dev=app.graphicsDevice;
  const mat=new pc.StandardMaterial();mat.name="O'Learys · inredning";mat.useLighting=false;mat.diffuse.set(0,0,0);mat.emissive.set(1,1,1);mat.emissiveVertexColor=true;mat.cull=pc.CULLFACE_NONE;mat.update();
  bright?.add(mat);
  const group=new pc.Entity("O'Learys Karlstad");root.addChild(group);
  // ingen snö inomhus: julbyggets snöfilter (ComicMesh.snow) stängs av medan lokalen byggs, som för Mitt i City i app.js
  const keepSnow=ComicMesh.snow;ComicMesh.snow=null;let mesh;
  try{mesh=buildStatic(pc,app);mesh.finish(pc,app,"O'Learys · lokalen",mat);}finally{ComicMesh.snow=keepSnow;}
  // finish() lägger meshen direkt i scenen; flytta in den under gruppen så att hela lokalen kan stängas av
  for(const e of app.root.find(n=>n.name&&n.name.startsWith("O'Learys · lokalen")))if(e.parent!==group){e.reparent(group);}
  // ── bildkort
  const cards=[];
  function card(name,tex,w,h,x,y,z,yaw,{additive=false}={}){
    const mm=new pc.StandardMaterial();mm.useLighting=false;mm.diffuse.set(0,0,0);mm.emissive.set(1,1,1);mm.emissiveMap=tex;if(additive){mm.blendType=pc.BLEND_ADDITIVEALPHA;mm.opacityMap=tex;mm.opacityMapChannel='a';mm.depthWrite=false;}mm.cull=pc.CULLFACE_NONE;mm.update();bright?.add(mm);
    const q=new pc.Mesh(dev);q.setPositions([-w/2,0,0,w/2,0,0,w/2,h,0,-w/2,h,0]);q.setUvs(0,[0,0,1,0,1,1,0,1]);q.setNormals([0,0,1,0,0,1,0,0,1,0,0,1]);q.setIndices([0,1,2,0,2,3]);q.update(pc.PRIMITIVE_TRIANGLES);
    const e=new pc.Entity(name);e.addComponent('render',{meshInstances:[new pc.MeshInstance(q,mm)]});e.setPosition(O.x+x,y,O.z+z);e.setEulerAngles(0,yaw,0);group.addChild(e);cards.push(e);return e;
  }
  const canvasTex=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const t=new pc.Texture(dev,{width:w,height:h,flipY:true,mipmaps:true,minFilter:pc.FILTER_LINEAR_MIPMAP_LINEAR,magFilter:pc.FILTER_LINEAR});return {c,ctx:c.getContext('2d'),t,upload(){t.setSource(c);}};};
  // logotypen: grundspelets egen bild av märket (art/brands/olearys.png), annars text
  const logo=canvasTex(512,256);drawLogoPlate(logo.ctx,512,256,null);logo.upload();
  try{const img=new Image();img.onload=()=>{drawLogoPlate(logo.ctx,512,256,img);logo.upload();};img.src=new URL('../art/brands/olearys.png',import.meta.url).href;}catch{}
  card('Logotyp bakom baren',logo.t,4,2,-16.95,2.55,-12,90);
  card('Logotyp vid entrén',logo.t,3,1.5,0,2.75,-.2,180);
  card('Logotyp över banorna',logo.t,3.2,1.6,-4,1.0,LANES.pins-.95,0);
  // sportväggen: tre storbildsskärmar ovanför baren och två vid bowlingen
  const sport=canvasTex(512,288);
  const drawSport=()=>{const m=nextMatch();drawScreen(sport.ctx,512,288,m?{title:'SHL · NÄSTA MATCH',lines:[m.home.replace(' BK','').toUpperCase()+' – '+m.away.replace(' BK','').toUpperCase(),fmtMatch(m),'TIPPA I TIPSHÖRNAN · BARA PÅ SKOJ'],accent:C.gold}:{title:'SPORT PÅ STORBILD',lines:['HOCKEY · FOTBOLL · STUDIO','VÄLKOMMEN IN!','TIPSHÖRNAN ÄR ÖPPEN']});sport.upload();};drawSport();
  for(const z of [-6,-12,-18])card('Storbildsskärm',sport.t,3.2,1.8,-16.92,2.95,z,90);
  card('Storbildsskärm vid banorna',sport.t,2.6,1.46,-12,2.6,-35.2,0);
  // bowlingens resultatskärmar (en per bana)
  const lanesTex=canvasTex(512,128);
  {const c=lanesTex.ctx;c.fillStyle='#03120a';c.fillRect(0,0,512,128);c.fillStyle=C.gold;c.font='900 40px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('BANA ·  STRIKE · SPÄRR',256,64);lanesTex.upload();}
  for(let i=0;i<LANES.count;i++)card('Bowlingskärm '+(i+1),lanesTex.t,1.3,.33,LANES.x0+i*LANES.pitch,2.45,LANES.foul+.4,0);
  // tipshörnans och femkampens skärmar
  const tips=canvasTex(256,320);
  {const c=tips.ctx;drawScreen(c,256,320,{title:'FBK-TIPSET',lines:['TIPPA 1 X 2','POÄNG, INGA PENGAR','TRYCK FÖR ATT TIPPA']});tips.upload();}
  card('Tipshörnans skärm',tips.t,.9,1.12,-11.2,1.2,-21.22,0);
  const penta=canvasTex(512,256);
  {const c=penta.ctx;drawScreen(c,512,256,{title:'FEMKAMPEN',lines:['BOWLING · SHUFFLE · BILJARD','DART · STRAFFAR','VEM BLIR KVÄLLENS MÄSTARE?']});penta.upload();}
  card('Femkampens skärm',penta.t,2.4,1.2,0,1.2,-26.12,0);
  // menytavlor och vimplar på högra väggen
  const menu=canvasTex(256,384);
  {const c=menu.ctx;c.fillStyle='#1d2b27';c.fillRect(0,0,256,384);c.strokeStyle=C.gold;c.lineWidth=8;c.strokeRect(4,4,248,376);c.fillStyle=C.gold;c.textAlign='center';c.font='900 34px system-ui';c.fillText('JULBORD',128,52);c.fillStyle=C.cream;c.font='700 22px system-ui';
    ['ONSDAG–FREDAG','I DECEMBER','','SILL · SKINKA','KÖTTBULLAR','RISALAMALTA','','399 / 649 KR'].forEach((l,i)=>c.fillText(l,128,100+i*34));menu.upload();}
  card('Julbordstavla',menu.t,1.1,1.65,16.9,1.5,-3.4,-90);
  // lampskenet (additivt) under pendellamporna
  const glowTex=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#ffe7b0ff');g.addColorStop(.3,'#ffcf7a80');g.addColorStop(1,'#ffb34700');c.fillStyle=g;c.fillRect(0,0,w,h);},64,64);
  for(let z=-4;z>-30;z-=6)for(const x of [-6,0,6,11])for(const yw of [0,90])card('Lampsken',glowTex,1.6,1.6,x,VENUE.h-2.05,z,yw,{additive:true});
  // ── gästerna och personalen: bildkort ur folklivets atlas, vända mot kameran (en mesh)
  const ptex=texture(c=>drawPeopleAtlas(c),PEOPLE_ATLAS.w,PEOPLE_ATLAS.h);
  const pmat=new pc.StandardMaterial();pmat.name="O'Learys · folk";pmat.useLighting=false;pmat.diffuse.set(0,0,0);pmat.emissive.set(1,1,1);pmat.emissiveMap=ptex;pmat.opacityMap=ptex;pmat.opacityMapChannel='a';pmat.alphaTest=.18;pmat.cull=pc.CULLFACE_NONE;pmat.update();bright?.add(pmat);
  const S=k=>Math.max(0,styleIndex(k));
  const PEOPLE=[
    {x:-15.2,z:-8,s:'seller'},{x:-15.2,z:-15,s:'seller'},                                       // bartendrar
    {x:-11.9,z:-6.4,s:'adult'},{x:-11.9,z:-9.9,s:'cup'},{x:-11.9,z:-15.3,s:'adult'},             // vid baren
    {x:4.9,z:-6,s:'adult'},{x:11.1,z:-11,s:'cup'},{x:4.9,z:-15.5,s:'kid'},{x:11.1,z:-15.5,s:'adult'},
    {x:-2.4,z:-20.8,s:'adult'},{x:3.9,z:-17.4,s:'bags'},                                          // vid biljarden
    {x:13.6,z:-28,s:'adult'},{x:-6.4,z:-33.8,s:'adult'},{x:-1.4,z:-31.9,s:'kid'},{x:3.6,z:-33.9,s:'elder'}, // shuffle och bowling
    {x:3.4,z:-1.8,s:'seller'}                                                                        // värdinnan vid entrén
  ].map(p=>({...p,style:S(p.s)}));
  const N=PEOPLE.length,ppos=new Float32Array(N*12),puv=new Float32Array(N*8),pidx=new Uint16Array(N*6);
  for(let i=0;i<N;i++){const v=i*4;pidx.set([v,v+1,v+2,v,v+2,v+3],i*6);const [u0,v0,u1,v1]=peopleUv(PEOPLE[i].style,0);puv.set([u0,v0,u1,v0,u1,v1,u0,v1],i*8);}
  const pm=new pc.Mesh(dev);pm.clear(true,false,N*4,N*6);pm.setPositions(ppos);pm.setUvs(0,puv);pm.setIndices(pidx);pm.update(pc.PRIMITIVE_TRIANGLES,false);
  const pmi=new pc.MeshInstance(pm,pmat);pmi.cull=false;const pent=new pc.Entity("O'Learys · gäster");pent.addComponent('render',{meshInstances:[pmi]});group.addChild(pent);
  function drawPeople(cam,t){
    for(let i=0;i<N;i++){
      const p=PEOPLE[i],x=O.x+p.x,z=O.z+p.z,dx=cam.x-x,dz=cam.z-z,d=Math.hypot(dx,dz)||1,ax=-dz/d,az=dx/d,st=PEOPLE_STYLES[p.style];
      const h=(st.kind==='kid'?st.h/.74:st.h)/(178/192),w=h*PEOPLE_CELL.w/PEOPLE_CELL.h,hw=w/2;
      ppos.set([x-ax*hw,0,z-az*hw,x+ax*hw,0,z+az*hw,x+ax*hw,h,z+az*hw,x-ax*hw,h,z-az*hw],i*12);
      const fr=Math.floor(t*1.3+i*.7)%7===0?1:0,[u0,v0,u1,v1]=peopleUv(p.style,fr);puv.set([u0,v0,u1,v0,u1,v1,u0,v1],i*8);
    }
    pm.setPositions(ppos);pm.setUvs(0,puv);pm.update(pc.PRIMITIVE_TRIANGLES,false);
  }
  // ── entrén ute på torget: en upplyst dörr med skylt och matta, så att den syns
  const keepSnow2=ComicMesh.snow;ComicMesh.snow=null;
  const out=new ComicMesh(true),s=VENUE.street;
  out.box(s.x,1.3,s.z-.08,2.4,2.6,.16,'#2a1d14');out.box(s.x,1.25,s.z-.18,1.7,2.2,.06,'#e9c98a');out.box(s.x,2.75,s.z-.2,2.6,.35,.2,C.green);
  out.box(s.x,.01,s.z-1.4,2.4,.02,1.8,C.greenDeep);out.box(s.x-1.6,.5,s.z-.5,.5,1,.5,'#2a1d14');out.box(s.x+1.6,.5,s.z-.5,.5,1,.5,'#2a1d14');
  out.box(s.x-1.6,1.15,s.z-.5,.55,.35,.55,'#2f6b3a');out.box(s.x+1.6,1.15,s.z-.5,.55,.35,.55,'#2f6b3a');
  const outMat=mat.clone();outMat.name="O'Learys · entrén";outMat.update();bright?.add(outMat);
  try{out.finish(pc,app,"O'Learys · entrén",outMat);}finally{ComicMesh.snow=keepSnow2;}
  const openTex=canvasTex(256,96);{const c=openTex.ctx;c.fillStyle=C.green;c.fillRect(0,0,256,96);c.strokeStyle=C.gold;c.lineWidth=6;c.strokeRect(3,3,250,90);c.fillStyle=C.cream;c.font='900 40px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText('ÖPPET · VÄLKOMMEN',128,50,236);openTex.upload();}
  const sign=new pc.Entity("O'Learys · öppet-skylt");{const q=new pc.Mesh(dev);q.setPositions([-1.2,0,0,1.2,0,0,1.2,.45,0,-1.2,.45,0]);q.setUvs(0,[0,0,1,0,1,1,0,1]);q.setNormals([0,0,1,0,0,1,0,0,1,0,0,1]);q.setIndices([0,1,2,0,2,3]);q.update(pc.PRIMITIVE_TRIANGLES);
    const mm=new pc.StandardMaterial();mm.useLighting=false;mm.diffuse.set(0,0,0);mm.emissive.set(1,1,1);mm.emissiveMap=openTex.t;mm.cull=pc.CULLFACE_NONE;mm.update();bright?.add(mm);sign.addComponent('render',{meshInstances:[new pc.MeshInstance(q,mm)]});}
  sign.setPosition(s.x,2.55,s.z-.32);sign.setEulerAngles(0,180,0);root.addChild(sign);
  // ── uppdatering: gästerna, skärmen, och vilken knapp som ska visas (dörren ute, dörren inne, en station)
  let t=0,prompt=null,screenAt=-1e9,inside=false;
  group.enabled=false;
  function setPrompt(p){const key=p?p.kind+':'+(p.id||''):'';if(key===(prompt?prompt.kind+':'+(prompt.id||''):''))return;prompt=p;onPrompt?.(p);}
  function update(p,now,dt,{canEnter=true}={}){
    t+=dt||0;
    const nowIn=inVenue(p,2);
    if(nowIn!==inside){inside=nowIn;group.enabled=inside;}
    if(inside){
      const cam=host.camera.getPosition();drawPeople(cam,t);
      if(now-screenAt>20000){screenAt=now;drawSport();}
      const l=toLocal(p);
      if(Math.hypot(l.x-VENUE.door.x,l.z-VENUE.door.z)<VENUE.exitRadius+.6)return setPrompt({kind:'exit',label:'GÅ UT TILL TORGET'});
      for(const st of STATIONS)if(Math.hypot(l.x-st.x,l.z-st.z)<st.r)return setPrompt({kind:'station',id:st.id,label:st.label});
      return setPrompt(null);
    }
    const s=VENUE.street,d=Math.hypot(p.x-s.x,p.z-s.z);
    if(d<VENUE.enterRadius+1.2)return setPrompt(canEnter?{kind:'enter',label:"GÅ IN PÅ O'LEARYS"}:{kind:'enter-later',label:"O'LEARYS · GÅ IN EFTER JAKTEN"});
    setPrompt(null);
  }
  return {update,group,get inside(){return inside;},get prompt(){return prompt;},
    enterPoint:()=>{const w=toWorld(VENUE.door);return {x:w.x,z:w.z-2.6,yaw:0};},
    exitPoint:()=>({x:VENUE.outside.x,z:VENUE.outside.z,yaw:VENUE.outside.yaw}),
    stationPoint:id=>{const st=STATIONS.find(s=>s.id===id);if(!st)return null;const w=toWorld(st);return {x:w.x,z:w.z};},
    snapshot:()=>({inside,prompt:prompt?prompt.kind+(prompt.id?':'+prompt.id:''):null,people:N,cards:cards.length})};
}
