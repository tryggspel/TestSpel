import {ComicMesh} from './city-architecture.js?v=2.12.0';
import {addMittICityExterior} from './mitt-i-city-exterior.mjs?v=2.12.0';
import {MALL_SPACE as S,MALL_CORRIDORS,MALL_ENTRANCES,ESCALATORS,splitMallWall,MALL_ROOMS} from './mall-space.mjs?v=2.12.0';
export const MALL_SHOPS=Object.freeze([
  {name:'COOP CITY',floor:0,x:-154.5,z:88,yaw:90,w:8,color:'#498653'},
  {name:'SUSHI YAMA',floor:0,x:-154.5,z:118,yaw:90,w:8,color:'#9a4443'},
  {name:'CERVERA',floor:0,x:-144,z:124.5,yaw:180,w:8,color:'#674047'},
  {name:'RITUALS',floor:0,x:-99.5,z:101,yaw:-90,w:8,color:'#3c4846'},
  {name:'KARDEMUMMA',floor:0,x:-108,z:124.5,yaw:180,w:8,color:'#bf7852'},
  {name:'APOTEKET',floor:0,x:-99.5,z:113,yaw:-90,w:8,color:'#258a43'},
  {name:'AKADEMIBOKHANDELN',floor:1,x:-107,z:83.5,yaw:0,w:10,color:'#ab4c41'},
  {name:'CLAS OHLSON',floor:1,x:-139,z:83.5,yaw:0,w:10,color:'#326b91'},
  {name:'KJELL & COMPANY',floor:1,x:-143,z:124.5,yaw:180,w:10,color:'#23553d'},
  {name:'KAFÉ BÖNAN',floor:1,x:-108,z:124.5,yaw:180,w:8,color:'#7f5139'},
  {name:'NEW YORKER',floor:1,x:-154.5,z:103,yaw:90,w:10,color:'#a34847'},
  {name:'PANDURO',floor:1,x:-99.5,z:106,yaw:-90,w:10,color:'#c5506a'}
]);
export function createMallArchitecture(pc,app,buildings){
  const mat=new pc.StandardMaterial();mat.useLighting=false;mat.diffuse.set(0,0,0);mat.emissive.set(1,1,1);mat.emissiveVertexColor=true;mat.update();
  const shell=new ComicMesh(true),details=new ComicMesh(true),stepViews=[];
  const floor=(x,z,w,d,y,col)=>{
    shell.box(x,y-.11,z,w,.22,d,col,'#d9d2bc');
    shell.quad([x-w/2,y-.22,z-d/2],[x+w/2,y-.22,z-d/2],[x+w/2,y-.22,z+d/2],[x-w/2,y-.22,z+d/2],'#e5dcca');
  };
  const core=buildings.find(b=>b.osm===234271401);
  if(core)for(const b of splitMallWall(core,[...MALL_CORRIDORS,...MALL_ROOMS,{minx:S.minX,maxx:S.maxX,minz:S.minZ,maxz:S.maxZ}]).pieces)shell.box((b.minx+b.maxx)/2,4.9,(b.minz+b.maxz)/2,b.maxx-b.minx,9.8,b.maxz-b.minz,'#ecdfc6','#c5bba4');
  floor(-127,104,56,42,.02,'#e7dfce');
  for(let x=-153;x<-99;x+=4)shell.box(x,.035,104,1.25,.016,42,'#bdc2b5');
  for(let z=84;z<125;z+=3)shell.strip([[-154.8,z],[-99.2,z]],.035,.048,'#aab6aa');
  for(const c of MALL_CORRIDORS){
    const x=(c.minx+c.maxx)/2,z=(c.minz+c.maxz)/2,w=c.maxx-c.minx,d=c.maxz-c.minz;
    floor(x,z,w,d,.04,'#e7dfce');
    // Lit lintels / ceilings guide the eye from each real entrance into the atrium.
    shell.quad([c.minx,3.4,c.minz],[c.maxx,3.4,c.minz],[c.maxx,3.4,c.maxz],[c.minx,3.4,c.maxz],'#f4ead4');
    if(d>w)details.strip([[x,z-d/2+2],[x,z+d/2-2]],.45,3.36,'#fff5c7');
    else details.strip([[x-w/2+2,z],[x+w/2-2,z]],.45,3.36,'#fff5c7');
  }
  // Original signs sit on the outer face of these entrance headers, clear of
  // the corridor ceiling. The clear opening stays wider than the walking lane.
  for(const [i,e] of MALL_ENTRANCES.entries()){
    const c=MALL_CORRIDORS[i],side=Math.abs(e.yaw)===90;
    const x=side?(e.yaw===90?c.maxx:c.minx):e.x,z=side?e.z:(e.yaw===180?c.minz:c.maxz);
    details.box(x,4.48,z,side?.26:8.4,2.2,side?8.4:.26,'#315d59');
    for(const d of [-4.05,4.05])details.box(x+(side?0:d),1.7,z+(side?d:0),.24,3.4,.24,'#eadcbf');
  }
  // Full upper shopping loop, with a genuine opening down to the food court.
  floor(-127,89.5,56,13,S.upper,'#f2e7d2');floor(-127,118.5,56,13,S.upper,'#f2e7d2');
  floor(-148.8,104,12.4,16,S.upper,'#f2e7d2');floor(-106,104,14,16,S.upper,'#f2e7d2');
  const rail=(a,b)=>{
    details.strip([a,b],.20,6.52,'#a17750');details.strip([a,b],.13,5.66,'#52777c');
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/2.6);
    for(let i=0;i<=n;i++)details.box(a[0]+(b[0]-a[0])*i/n,5.95,a[1]+(b[1]-a[1])*i/n,.08,1.18,.08,'#8c9a91');
    // Pale glass strips retain a clear view down to the lower floor without sorting transparency.
    details.strip([a,b],.08,6.2,'#9dbeb5');
  };
  rail([-142.6,96],[-142.6,112]);rail([-113,96],[-113,112]);rail([-142.6,112],[-137.9,112]);rail([-132.8,112],[-113,112]);
  rail([-142.6,96],[-141.5,96]);rail([-138.5,96],[-136.5,96]);rail([-133.5,96],[-113,96]);
  for(const e of ESCALATORS){
    const {x,minz,maxz}=e,w=2.5;
    const steps=new ComicMesh(true);
    shell.quad([x-w/2,0,maxz],[x+w/2,0,maxz],[x+w/2,5.4,minz],[x-w/2,5.4,minz],'#4a5b5d');
    for(const side of [-1,1]){const sx=x+side*w/2;const a=[sx,0,maxz],b=[sx,0,minz],c=[sx,5.4,minz];shell.tri(a,b,c,'#38525b');shell.tri(c,b,a,'#38525b');}
    for(let i=0;i<36;i++){
      const z=maxz-i*.5,y=(i+.5)/36*5.4;
      steps.box(x,y-.085,z-.25,w-.18,.17,.5,'#83958e');steps.box(x,y+.008,z-.03,w-.12,.025,.07,'#e8bf53');
    }
    stepViews.push({direction:e.direction,e:steps.finish(pc,app,'Mitt i City · rullande steg '+e.id,mat)});
    for(const side of [-1,1]){
      const rx=x+side*1.42;
      details.quad([rx,0,maxz],[rx,1,maxz],[rx,6.4,minz],[rx,5.4,minz],'#9ab8b1');
      details.quad([rx,5.4,minz],[rx,6.4,minz],[rx,1,maxz],[rx,0,maxz],'#9ab8b1');
      details.quad([rx-.095,1.02,maxz],[rx+.095,1.02,maxz],[rx+.095,6.42,minz],[rx-.095,6.42,minz],'#263f46');
    }
  }
  // Reference details: white columns, circular rooflight, globe pendants and orange cafe chairs.
  for(const [x,z] of [[-148,88],[-148,120],[-107,88],[-107,120]]){details.box(x,4.85,z,.6,9.7,.6,'#f7f0da');details.box(x,.16,z,.86,.32,.86,'#9ba596');}
  for(const [x,z] of [[-127,104],[-116,103],[-119,112]]){
    details.box(x,1,z,2.1,.12,1.8,'#faf0d5');details.box(x,.5,z,.14,1,.14,'#657872');
    for(const sign of [-1,1]){details.box(x+sign*1.5,.52,z,.65,.16,.72,'#df7e3b');details.box(x+sign*1.75,.95,z,.10,.85,.72,'#df7e3b');}
  }
  // Ceiling with an oval rooflight. Segment ring avoids a full-screen transparent dome.
  const rx=24,rz=17,cx=-127,cz=104;
  for(let i=0;i<40;i++){
    const a=i/40*Math.PI*2,b=(i+1)/40*Math.PI*2;
    const p=[cx+Math.cos(a)*rx,9.9,cz+Math.sin(a)*rz],q=[cx+Math.cos(b)*rx,9.9,cz+Math.sin(b)*rz];
    const u=[cx+Math.cos(a)*18,10.1,cz+Math.sin(a)*10],v=[cx+Math.cos(b)*18,10.1,cz+Math.sin(b)*10];
    shell.quad(q,p,u,v,'#f4ebd7');shell.quad(p,q,v,u,'#e6ddc5');
    shell.tri([cx,11.8,cz],u,v,i%2?'#c0dedb':'#acd0d1');
    if(i%4===0)details.strip([[u[0],u[2]],[v[0],v[2]]],.12,10.08,'#fff4dc');
  }
  for(const [x,z] of [[-146,100],[-117,89],[-108,117]]){
    details.box(x,8.7,z,.035,2.1,.035,'#56756d');
    details.pyramid(x,7.0,z,1.8,1.8,1.2,'#fff2c0');details.pyramid(x,7.55,z,1.7,1.7,1.1,'#f4d496');
  }
  for(const r of MALL_ROOMS){
    const y=r.floor*5.4,cx=(r.minx+r.maxx)/2,cz=(r.minz+r.maxz)/2,w=r.maxx-r.minx,d=r.maxz-r.minz;
    floor(cx,cz,w,d,y+.015,'#efe4cd');
    // Cut the shop out of the shell, then close only its back and side walls.
    const west=r.door.yaw===90,north=r.door.yaw===0,south=r.door.yaw===180;
    for(const [x,z,sw,sd,omit] of [[r.minx,cz,.15,d,false],[r.maxx,cz,.15,d,west],[cx,r.minz,w,.15,south],[cx,r.maxz,w,.15,north]]){
      if(omit)continue;shell.box(x,y+2.28,z,sw,4.55,sd,'#f4ead7');details.box(x,y+.12,z,sw+.05,.24,sd+.05,r.color);
    }
    shell.quad([r.minx,y+4.55,r.minz],[r.maxx,y+4.55,r.minz],[r.maxx,y+4.55,r.maxz],[r.minx,y+4.55,r.maxz],'#f9efd9');
    for(const zz of [cz-2.4,cz+2.4])details.box(cx,y+4.48,zz,w*.65,.05,.24,'#fff6cf');
    const c=r.counter,bx=(c.minx+c.maxx)/2,bz=(c.minz+c.maxz)/2;
    details.box(bx,y+.55,bz,c.maxx-c.minx,1.1,c.maxz-c.minz,r.color);
    details.box(bx,y+1.12,bz,c.maxx-c.minx+.18,.14,c.maxz-c.minz+.18,'#f6eed8');
    const rx=bx+(west?0:1.3),rz=bz+(west?1.3:0);details.box(rx,y+1.4,rz,.55,.5,.35,'#263f46');details.box(rx,y+1.45,rz+.19,.4,.25,.02,'#8bd7bb');
    details.box(bx,y+1.02,bz,c.maxx-c.minx+.20,.07,c.maxz-c.minz+.20,'#263f46');
    // A crisp open portal and a contrasting threshold make the room readable at walking speed.
    const a=r.door.yaw*Math.PI/180,tx=Math.cos(a),tz=-Math.sin(a),nx=Math.sin(a),nz=Math.cos(a);
    for(const side of [-1,1])details.box(r.door.x+tx*side*4.5,y+1.65,r.door.z+tz*side*4.5,.22,3.3,.22,r.color);
    details.box(r.door.x,y+3.48,r.door.z,Math.abs(tx)*9+.18,.74,Math.abs(tz)*9+.18,r.color);
    details.strip([[r.door.x-tx*4,r.door.z-tz*4],[r.door.x+tx*4,r.door.z+tz*4]],.5,y+.04,r.color);
  }
  for(const s of MALL_SHOPS){
    if(MALL_ROOMS.some(r=>r.name===s.name&&r.floor===s.floor))continue;
    const a=s.yaw*Math.PI/180,nx=Math.sin(a),nz=Math.cos(a),tx=Math.cos(a),tz=-Math.sin(a),y=s.floor*5.4;
    // Doorway-size shop bays and warm display windows, all baked into the same mesh.
    const panel=(offset,h,w,col)=>{
      const x=s.x+nx*.04,z=s.z+nz*.04;
      details.quad([x-tx*w/2,y+offset,z-tz*w/2],[x+tx*w/2,y+offset,z+tz*w/2],[x+tx*w/2,y+offset+h,z+tz*w/2],[x-tx*w/2,y+offset+h,z-tz*w/2],col);
    };
    panel(.10,3.4,s.w,'#34535b');panel(3.12,.7,s.w,s.color);
    for(const off of [-.33,.33]){
      const x=s.x+tx*s.w*off+nx*.08,z=s.z+tz*s.w*off+nz*.08;
      details.box(x,y+1.4,z,Math.abs(tx)*2.1+.10,2.45,Math.abs(tz)*2.1+.10,'#87b2b0');
    }
  }
  const exterior=addMittICityExterior(details,buildings);
  const entities=[shell.finish(pc,app,'Mitt i City · atrium och två butiksvåningar',mat),details.finish(pc,app,'Mitt i City · rulltrappor och inredning',mat)];
  return {staticDrawCalls:entities.length,movingDrawCalls:0,exterior,shops:MALL_SHOPS.length,enterableShops:MALL_ROOMS.length,entrances:MALL_ENTRANCES.length,
    update(){/* Stable tread geometry; conveyor movement is integrated by MallWalk. */}};
}
export function createMallSigns({mount,texture,labelTex,brandTexture}){
  for(const s of MALL_SHOPS){const room=MALL_ROOMS.find(r=>r.name===s.name&&r.floor===s.floor);mount('Mitt i City · '+s.name,room?brandTexture(room.id):labelTex([s.name],s.color,'#fff2d7'),room?4.8:s.w,room?1.5:.75,s.x+Math.sin(s.yaw*Math.PI/180)*.12,s.floor*5.4+(room?2.95:3.06),s.z+Math.cos(s.yaw*Math.PI/180)*.12,s.yaw);}
  for(const r of MALL_ROOMS){
    const a=r.door.yaw*Math.PI/180,nx=Math.sin(a),nz=Math.cos(a),depth=r.id==='coop'?10.25:r.id==='clas'?10.75:9.7;
    const shelf=texture((c,w,h)=>drawShopShelves(c,w,h,r.id,r.color),1024,512);
    mount(r.name+' · hyllor',shelf,8,3.8,r.door.x-nx*depth,.3+r.floor*5.4,r.door.z-nz*depth,r.door.yaw);
    const cx=(r.minx+r.maxx)/2,cz=(r.minz+r.maxz)/2;
    if(r.id==='coop')for(const [z,yaw] of [[r.minz+.16,0],[r.maxz-.16,180]])mount(r.name+' · sidohyllor',shelf,8,3.3,cx,.3+r.floor*5.4,z,yaw);
    else for(const [x,yaw] of [[r.minx+.16,90],[r.maxx-.16,-90]])mount(r.name+' · sidohyllor',shelf,8,3.3,x,.3+r.floor*5.4,cz,yaw);
    mount(r.name+' · välkommen',labelTex(['ÖPPET · KOM IN',r.floor?'PLAN 1':'PLAN 0'],r.color,'#fff2d7'),3,.94,r.door.x+nx*.15+Math.cos(a)*3.4,r.floor*5.4+1.4,r.door.z+nz*.15-Math.sin(a)*3.4,r.door.yaw);
  }
  mount('Mitt i City · atriumlogo',brandTexture('mitticity'),7.5,2.34,-126,6.55,83.44,0);
  for(const [x,z,y,yaw,text] of [[-140,115,.25,0,'↑ PLAN 1'],[-135,93,5.65,180,'↓ PLAN 0'],[-117,84,2.25,180,'UT → TORGET']])mount('Mitt i City · '+text,labelTex([text],'#276e68','#fbefcf'),2.9,.76,x,y,z,yaw);
}

function drawShopShelves(c,w,h,kind,color){
  c.save();c.scale(w/1024,h/512);c.fillStyle='#f0e6cc';c.fillRect(0,0,1024,512);
  c.fillStyle=color;c.fillRect(0,0,1024,55);c.fillStyle='#fff1d2';c.textAlign='center';c.font='900 27px sans-serif';
  c.fillText(kind==='coop'?'FRUKT · KAFFE · VARDAG':kind==='cervera'?'KOPPAR · KANNOR · EN LITEN PAUS':'VERKTYG · ORDNING · NÄSTAN',512,37);
  for(let row=0;row<3;row++){
    const y=78+row*140;c.fillStyle='#c5b591';c.fillRect(24,y+102,976,12);c.fillStyle='#304d50';c.fillRect(24,y+114,976,5);
    for(let col=0;col<10;col++){
      const x=42+col*97;c.lineWidth=3;c.strokeStyle='#30474a';
      if(kind==='cervera'){
        c.fillStyle=['#73acaa','#efe8d3','#ba6c73'][col%3];c.beginPath();c.roundRect(x,y+37,55,60,9);c.fill();c.stroke();c.beginPath();c.ellipse(x+60,y+62,15,18,0,0,Math.PI*2);c.stroke();c.fillStyle='#e8b45a';c.fillRect(x+10,y+25,34,7);
      }else{
        c.fillStyle=(kind==='clas'?['#d49e4d','#658696','#4d6576']:['#4c946e','#c7894f','#dfbd6f'])[col%3];c.fillRect(x,y+12,70,87);c.strokeRect(x,y+12,70,87);c.fillStyle='#fff0d0';c.fillRect(x+7,y+35,56,29);c.fillStyle='#263f46';c.font='900 14px sans-serif';c.fillText(kind==='clas'?['SKRUV','TEJP','FIXA'][col%3]:['KAFFE','HAVRE','PASTA'][col%3],x+35,y+55);
      }
      c.fillStyle='#fff5d9';c.fillRect(x+9,y+102,43,13);c.fillStyle='#263f46';c.font='900 10px sans-serif';c.fillText('KARLSTAD',x+31,y+112);
    }
  }
  c.restore();
}
