import {addKungsgatanTerraces} from './kungsgatan-reference.mjs?v=2.11.23';
import {KIL} from './scenic-transit.js?v=2.11.23';
import {ComicMesh,curatedRoute} from './city-architecture.js?v=2.11.23';
import {WATER_TRIANGLES,WATER_POLYGONS,SOUTH_STREETS,RAIL_LINES,SCHOOL_YARD,FREDSMONUMENT} from './city-south-data.mjs?v=2.11.23';
import {SOUTH_IDS,HARBOUR,MARIEBERG} from './city-south-space.mjs?v=2.11.23';
import {splitMallWall} from './mall-space.mjs?v=2.11.23';

const REMOTE_RETAIL=Object.freeze([
  Object.freeze({id:'willys',name:'WILLYS BRYGGUDDEN',x:271,z:413,w:38,d:26,h:8,wall:'#d9d5c4',accent:'#2b7a48',front:'south'}),
  Object.freeze({id:'icahaga',name:'ICA HAGAHALLEN',x:566,z:-129,w:44,d:30,h:8.5,wall:'#ddd8c8',accent:'#df2f35',front:'west'})
]);

export function createSouthCity(pc,app,buildings){
  const mat=new pc.StandardMaterial();mat.useLighting=false;mat.diffuse.set(0,0,0);mat.emissive.set(1,1,1);mat.emissiveVertexColor=true;mat.update();
  const water=new ComicMesh(true),streets=new ComicMesh(true),town=new ComicMesh(true),square=new ComicMesh(true),arrival=new ComicMesh(true);
  for(const t of WATER_TRIANGLES)water.polygon(t,.006,'#2f91a5');
  for(const rings of WATER_POLYGONS)for(const p of rings){water.strip(p,2.4,.030,'#8fc7c8');water.strip(p,.62,.039,'#e0eee4');}
  for(const s of SOUTH_STREETS){streets.strip(s.points,s.width+4,.012,'#c0bca5');streets.strip(s.points,s.width,.027,'#677e7d');}
  for(const line of RAIL_LINES){streets.strip(line,3.4,.030,'#657575');streets.strip(line,1.65,.040,'#343e45');streets.strip(line,1.35,.050,'#b5bcb2');streets.strip(line,1.10,.056,'#4b5557');}
  streets.polygon(SCHOOL_YARD,.031,'#c6bd9d');
  const window=(m,x,y,z,w,h,yaw=0)=>{
    const vertical=Math.abs(yaw)===90;m.box(x,y,z,vertical?.13:w,h,vertical?w:.13,'#f6e8cc');m.box(x+(yaw===90?.08:yaw===-90?-.08:0),y,z+(yaw===0?.08:0),vertical?.15:w-.35,h-.35,vertical?w-.35:.15,'#416572');
    if(vertical)m.box(x+.1,y,z,.18,h-.35,.07,'#e6d8b5');else m.box(x,y,z+.1,.08,h-.35,.18,'#e6d8b5');
  };
  const schoolFace=(a,b,c,d,col)=>{town.quad(a,b,c,d,col);town.quad(d,c,b,a,col);};
  for(const b of buildings.filter(b=>SOUTH_IDS.has(b.osm)&&!curatedRoute(b))){ // curated ones are drawn by the Kungsgatan route
    const x=b.cx,z=b.cz,w=b.sx,d=b.sz,factory=b.osm===80278038,school=[77107220,100024120,100024325].includes(b.osm),station=b.osm===356121937,prison=b.osm===80868525;
    const h=factory?42:station?7.5:school?13.8:prison?11:10.4,col=factory?'#ad956d':school?'#d0b273':prison?'#eedebe':station?'#ce9b69':'#e0c68e';
    if(school){
      const ps=b.polygon;town.polygon(ps,h,'#435256');town.polygon(ps,.04,'#d2b77e');
      for(let i=1;i<ps.length;i++){
        const [ax,az]=ps[i-1],[bx,bz]=ps[i],len=Math.hypot(bx-ax,bz-az),nx=-(bz-az)/len,nz=(bx-ax)/len;
        const a=[ax,0,az],bb=[bx,0,bz],cc=[bx,h,bz],d=[ax,h,az];town.quad(a,bb,cc,d,col);town.quad(d,cc,bb,a,col);
        town.strip([[ax,az],[bx,bz]],.6,h+.06,'#435256');
        for(const yy of [.45,4.2,8.2,h-.45])for(const side of [-1,1])schoolFace([ax+nx*side*.12,yy,az+nz*side*.12],[bx+nx*side*.12,yy,bz+nz*side*.12],[bx+nx*side*.12,yy+.22,bz+nz*side*.12],[ax+nx*side*.12,yy+.22,az+nz*side*.12],'#ead5a5');
        for(let v=3;v<len-1;v+=4.2)for(const yy of [2.2,6.2,10.2]){const xx=ax+(bx-ax)*v/len,zz=az+(bz-az)*v/len,tx=(bx-ax)/len,tz=(bz-az)/len;
          for(const side of [-1,1]){
            const vertex=(u,v,off)=>[xx+tx*u+nx*side*off,v,zz+tz*u+nz*side*off];
            const face=(ww,y,ht,colour,off)=>{
              const radius=ww>.1?ww/2:0,base=y+ht-radius;
              schoolFace(vertex(-ww/2,y,off),vertex(ww/2,y,off),vertex(ww/2,base,off),vertex(-ww/2,base,off),colour);
              for(let j=0;radius&&j<8;j++){
                const a=j/8*Math.PI,b=(j+1)/8*Math.PI,pa=vertex(Math.cos(a)*radius,base+Math.sin(a)*radius,off),pb=vertex(Math.cos(b)*radius,base+Math.sin(b)*radius,off),pc=vertex(0,base,off);
                town.tri(pc,pa,pb,colour);town.tri(pb,pa,pc,colour);
              }
            };
            face(2.2,yy-1.35,2.9,'#f5e2b8',.07);face(1.7,yy-1.1,2.4,'#395f6e',.10);face(.08,yy-1.1,2.1,'#edd9ad',.13);
          }
        }
      }
      if(b.osm===77107220){
        // Torget-facing low metal roof, masonry entrance and iron fence from the heritage reference.
        town.roof(b.minx+6.5,h,b.cz,13,b.sz,1.8,'z');
        town.box(b.minx-.25,2.1,b.cz,.3,4.2,3.5,'#efe0b7');town.box(b.minx-.44,1.7,b.cz,.10,3.4,2.3,'#30535c');
        for(const dz of [-2.1,2.1]){town.box(b.minx-.65,1.8,b.cz+dz,.45,3.6,.42,'#e3ce9b');town.box(b.minx-.65,3.7,b.cz+dz,.65,.3,.7,'#f3e2b4');}
        for(let zz=b.minz+2;zz<b.maxz-2;zz+=1.8){if(Math.abs(zz-b.cz)<3)continue;town.box(b.minx-4.5,.55,zz,.07,1.1,.07,'#354d4b');}
        for(const sign of [-1,1])town.box(b.minx-4.5,.78,b.cz+sign*(b.sz/4+1.5),.07,.055,b.sz/2-5,'#354d4b');
      }
      // The schoolyard stays open: a footprint-shaped roof never spans the courtyard.
      continue;
    }
    if(prison){
      for(const q of splitMallWall(b,[{minx:x-4,maxx:x+4,minz:b.maxz-11,maxz:b.maxz+1}]).pieces)town.box((q.minx+q.maxx)/2,h/2,(q.minz+q.maxz)/2,q.maxx-q.minx,h,q.maxz-q.minz,col);
      town.box(x,7.25,b.maxz-5.5,8,7.5,11,col);town.box(x,.005,b.maxz-5,8,.03,12,'#bdbb9e');
      for(const side of [-1,1])for(let zz=b.maxz-8;zz<b.maxz-1;zz+=3){town.box(x+side*3.8,1.1,zz,.12,2.2,1.3,'#456567');for(let n=-.5;n<=.5;n+=.25)town.box(x+side*3.7,1.4,zz+n,.08,1.5,.055,'#c9cdb7');}
    }else town.box(x,h/2,z,w,h,d,col,'#b39f7c');
    if(factory){
      town.box(x,41,z,w+1,1.8,d+1,'#e4d2a6');town.box(x,44,z,Math.min(13,w),5,Math.min(13,d),'#604377');
      for(let yy=4;yy<40;yy+=4.1){town.box(x,yy,z,w+.35,.2,d+.35,'#dac698');for(let xx=b.minx+3;xx<b.maxx-1;xx+=4.5){window(town,xx,yy+1.3,b.maxz+.12,1.8,1.8);window(town,xx,yy+1.3,b.minz-.22,1.8,1.8);}for(let zz=b.minz+3;zz<b.maxz-1;zz+=4.5){window(town,b.minx-.2,yy+1.3,zz,1.8,1.8,-90);window(town,b.maxx+.12,yy+1.3,zz,1.8,1.8,90);}}
    }else{
      town.roof(x,h,z,w+.6,d+.6,school?4:2.4,w>d?'x':'z');
      for(const yy of [1,4.2,h-.3])town.box(x,yy,z,w+.32,.24,d+.32,'#f6e8cc');
      for(let yy=2.1;yy<h-1;yy+=3.7){for(let xx=b.minx+2.6;xx<b.maxx-1;xx+=4.3)window(town,xx,yy,b.maxz+.08,1.8,2.5);for(let zz=b.minz+2.8;zz<b.maxz-1;zz+=4.3)window(town,b.minx-.12,yy,zz,1.8,2.5,-90);}
      if(school){town.box(b.minx-.35,h/2,z,.7,h,8,'#eed6a2');town.pyramid(b.minx-.2,h,z,3,10,3,'#465154');}
    }
  }
  const {x,z}=FREDSMONUMENT;
  // Fredsmonumentet: stone plinth, robed figure and broken sword at its surveyed position.
  square.box(x,.22,z,4.3,.44,4.3,'#bcc2b0');square.box(x,.92,z,2.2,1.4,2.2,'#8e9d93');
  square.box(x,2.05,z,1.1,1.3,.70,'#527264');square.pyramid(x,1.55,z,1.65,.95,2.25,'#58796a');square.box(x,3.25,z,1.05,1.05,.62,'#58796a');square.box(x,4.15,z,.60,.72,.59,'#638370');
  square.box(x-.78,3.35,z,.30,1.2,.32,'#526f63');square.box(x+.76,3.25,z,.25,1.2,.32,'#526f63');square.box(x-.9,3.99,z,.11,.65,.12,'#adbaa4');square.box(x-.9,3.63,z,.45,.09,.15,'#adbaa4');
  for(const [bx,bz] of [[-47,-18],[-47,17],[56,-18],[56,17]]){square.box(bx,.6,bz,3.6,.3,.8,'#e3ddc5');square.box(bx,.28,bz,2.8,.55,.5,'#788c82');}
  {const tx=-42,tz=-19;const car=(x,z,w=8)=>{square.box(x,1.05,z,w,2.1,3.4,'#f1c735');square.box(x,2.22,z,w-.8,.55,3.1,'#315b86');square.box(x,1.45,z-1.73,w-.9,.7,.08,'#8dc1c3');for(const dx of [-w*.30,w*.30])square.box(x+dx,.34,z-1.55,1.2,.65,.5,'#26383d');};car(tx,tz,8.6);square.box(tx+2.8,2.55,tz,2.6,2.5,3.0,'#f1c735');square.box(tx+2.8,3.82,tz,3.0,.28,3.35,'#315b86');square.box(tx-3.3,2.0,tz,.55,2.2,.55,'#26383d');square.box(tx-3.3,3.1,tz,.9,.45,.9,'#315b86');car(tx+10.5,tz,7.6);car(tx+19.5,tz,7.6);for(const x of [tx+5.5,tx+15])square.box(x,.78,tz,1.4,.22,.35,'#394f54');}
  // Kungsgatan: two low glass-walled outdoor seating areas, kept off the central crossing.
  addKungsgatanTerraces(square);
  // A small market table and striped awnings keep the central crossing open.
  for(const [bx,bz,col] of [[28,-20,'#a75a55'],[40,-20,'#4d817b']]){
    square.box(bx,.8,bz,5.4,1.4,2,'#b48a62');square.box(bx,2.9,bz,6,.16,3.2,col);
    for(let i=-2;i<=2;i++)square.box(bx+i,3.0,bz,.45,.06,3.2,'#fae8bd');
    for(const sign of [-1,1])square.box(bx+sign*2.6,1.6,bz,.09,3.2,.09,'#304e4d');
    for(let i=0;i<5;i++)square.box(bx-2+i,1.65,bz,.6,.4,.8,['#ac6746','#6b974f','#deab5c'][i%3]);
  }
  // Quay, bollards and an unmistakable yellow boarding shelter.
  streets.box(238,.0,550,24,.09,30,'#c2b898');
  for(let zz=538;zz<=563;zz+=6)town.box(249,.48,zz,.4,.96,.4,'#354e54');
  town.box(236,2.8,546,5,.25,3,'#ffbd08');for(const dx of [-2.2,2.2])town.box(236+dx,1.4,546,.16,2.8,.16,'#3c4d51');
  for(const r of REMOTE_RETAIL){arrival.box(r.x,r.h/2,r.z,r.w,r.h,r.d,r.wall,'#b7ad9a');arrival.box(r.x,r.h+.12,r.z,r.w+.5,.24,r.d+.5,'#31494f');if(r.front==='south'){arrival.box(r.x,2.0,r.z+r.d/2+.08,r.w*.78,3.2,.12,r.accent);for(let x=r.x-r.w*.32;x<=r.x+r.w*.32;x+=5.6)window(arrival,x,1.8,r.z+r.d/2+.16,2.5,2.7);}else{arrival.box(r.x-r.w/2-.08,2.0,r.z,.12,3.2,r.d*.78,r.accent);for(let z=r.z-r.d*.30;z<=r.z+r.d*.30;z+=5.6)window(arrival,r.x-r.w/2-.16,1.8,z,2.5,2.7,-90);}arrival.box(r.x,.03,r.z+r.d/2+5,r.w*.9,.08,8,'#9a927d');}
  // Mariebergsskogen landing: real-world position, small walkable park forecourt.
  arrival.box(-802,-.08,1321,68,.12,70,'#7c9e6a');arrival.box(-767,-.13,1321,7,.12,24,'#2f8899');
  arrival.box(-778,.02,1321,15,.08,10,'#c69a64');arrival.strip([[-778,1321],[-809,1321],[-816,1300]],4,.04,'#e0d0a5');
  for(let i=0;i<16;i++){const xx=-822+(i%4)*13,zz=1295+Math.floor(i/4)*17;if(Math.abs(zz-1321)<9&&xx>-818)continue;arrival.box(xx,1.5,zz,.4,3,.4,'#795e43');arrival.pyramid(xx,2.7,zz,6,6,5,i%2?'#4e7958':'#729254');}
  for(const xx of [-793,-785])arrival.box(xx,2.2,1315,.4,4.4,.4,'#a17850');arrival.box(-789,4.1,1315,8.5,.6,.5,'#496f59');
  const k=KIL;arrival.box(k.x,-.09,k.z,130,.16,90,'#79966d');arrival.box(k.x,.02,k.z+8,106,.1,24,'#bcbfac');arrival.box(k.x,3.2,k.z-15,42,6.4,14,'#d8bc7f');arrival.roof(k.x,6.4,k.z-15,43,15,3,'x');for(let dx=-18;dx<=18;dx+=4.5)window(arrival,k.x+dx,3,k.z-7.9,2,3);for(const dz of [28,34]){arrival.box(k.x,.03,k.z+dz,130,.1,1.5,'#526366');arrival.box(k.x,.10,k.z+dz,130,.03,.08,'#c5d1c6');}
  const meshes=[water,streets,town,square,arrival].map((m,i)=>m.finish(pc,app,['Karlstads vatten','Hamngator och järnväg','Kaffeskrapan skolan stationen Bilan','Stora torget · Fredsmonumentet','Mariebergsskogen · bryggparken'][i],mat));
  return {staticDrawCalls:meshes.length,landmarks:buildings.filter(b=>SOUTH_IDS.has(b.osm)).length};
}

export function createSouthSigns({card,labelTex},buildings){
  // Same navigational sign family everywhere: dark green, cream border/text.
  // Landmark names are primary, but no longer span most of a facade.
  const sign=(text,x,z,y=3,w=6,yaw=0,h=.62)=>{const e=card(text,labelTex([text],'#214b49','#f5e5bd'),w,h,x,y,z);e.setEulerAngles(0,yaw,0);};
  for(const b of buildings.filter(b=>SOUTH_IDS.has(b.osm))){const x=(b.minx+b.maxx)/2;
    const text=b.osm===80278038?'LÖFBERGS':b.osm===356121937?'KARLSTAD CENTRAL':b.osm===77107220?'TINGVALLAGYMNASIET':b.osm===80868525?'HOME HOTEL BILAN':b.name.toUpperCase();
    const w=b.osm===80278038?14:b.osm===356121937?8.2:b.osm===77107220?8.8:b.osm===100024120?7.4:b.osm===100024325?7.4:b.osm===80868525?8.0:Math.max(4.8,Math.min(8.2,b.maxx-b.minx-3));
    const y=b.osm===80278038?42:3.05;
    sign(text,x,b.maxz+.24,y,w);
    if(b.osm===77107220)sign('TINGVALLAGYMNASIET',b.minx-.25,b.cz,3.05,8.4,-90);
    if(b.osm===80278038)sign('LÖFBERGS',b.minx-.25,b.cz,34,16,-90,.72);
    if(b.osm===80868525)sign('UTGÅNG · FRIHET INGÅR',x,b.maxz-9.7,2.45,4.6,0,.52);
  }
  sign('BÅTBUSS · MARIEBERGSSKOGEN',236,545.8,3.1,7);sign('MARIEBERGSSKOGEN',-789,1315.2,3.8,7);
  sign('KIL STATION',KIL.x,KIL.z-7.75,5.5,7.5);sign('RETUR · KARLSTAD C',KIL.x,KIL.z+8,2.6,5.4,180);
  sign('RETUR · INRE HAMN',MARIEBERG.x,1325,2.2,4.8,180);
  sign('BÅTBUSS → INRE HAMN',8,26,2.6,6,0);sign('SANDGRUND ↑',-58,-57,2.7,4.5,180);sign('KARLSTAD SIGHTSEEING',-42,-17.15,2.9,7.2,0);sign('WILLYS BRYGGUDDEN',271,426.2,3.2,9.2,0);sign('ICA HAGAHALLEN',543.8,-129,3.2,8.8,-90);
}

export function drawSouthWater(c,point){
  c.save();c.fillStyle='#2f91a5';for(const rings of WATER_POLYGONS){c.beginPath();for(const p of rings){p.forEach((q,i)=>i?c.lineTo(...point(...q)):c.moveTo(...point(...q)));c.closePath();}c.fill('evenodd');}c.restore();
}
