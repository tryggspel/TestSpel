/* Recognisable, hand-built Karlstad landmarks. Compressed positions and scale;
   architectural references and factual sources are documented in SOURCES.md. */
window.buildKarlstadLandmarks=function(h){
 const {B,scene,M,pbr,box,cylinder,sphere,plane,sign,add,rectCollider,lineBetween}=h,V=B.Vector3;
 const ochre=pbr('Cyrillushuset ochre limewash','#dfae50'),cream=pbr('landmark warm white','#f3e5c8'),copper=pbr('verdigris copper','#598877',.49,.45),falu=pbr('Nyren wing red timber','#a7493f'),blue=pbr('city street enamel','#245e8c'),orange=pbr('Sandgrund orange lettering','#ed813b'),timber=pbr('naturum cedar','#9a7953');
 function tube(mat,path,r=.12){return add(B.MeshBuilder.CreateTube('curved architectural detail',{path:path.map(p=>new V(...p)),radius:r,tessellation:8},scene),mat)}
 function arch(x,y,z,r,mat,thickness=.2){const path=[];for(let i=0;i<=32;i++){let a=Math.PI*i/32;path.push([x+Math.cos(a)*r,y+Math.sin(a)*r,z])}tube(mat,path,thickness)}
 function disk(mat,x,y,z,r){const m=B.MeshBuilder.CreateDisc('architectural medallion',{radius:r,tessellation:48,sideOrientation:B.Mesh.DOUBLESIDE},scene);m.position.set(x,y,z);return add(m,mat)}
 function roof(x,y,z,w,d,rise){
   // Swept hip roof: raised eaves at the corners, shallow curve, tall centre.
   const points=[],indices=[],uvs=[],normals=[],count=32;
   for(let ring=0;ring<3;ring++)for(let i=0;i<count;i++){
     const a=i/count*Math.PI*2,c=Math.cos(a),s=Math.sin(a),extent=1/Math.max(Math.abs(c),Math.abs(s)),scale=[1,.88,.27][ring];
     points.push(x+c*extent*w*.5*scale,y+[.32,0,rise][ring]+(ring===0?Math.pow(Math.min(Math.abs(c),Math.abs(s))*1.414,5)*.45:0),z+s*extent*d*.5*scale);uvs.push(i/count,ring*.5);
   }
   for(let ring=0;ring<2;ring++)for(let i=0;i<count;i++){let a=ring*count+i,b=ring*count+(i+1)%count,c=a+count,d=b+count;indices.push(a,c,b,b,c,d)}
   const mesh=new B.Mesh('swept copper hip roof',scene),vd=new B.VertexData();B.VertexData.ComputeNormals(points,indices,normals);vd.positions=points;vd.indices=indices;vd.normals=normals;vd.uvs=uvs;vd.applyToMesh(mesh);add(mesh,copper);box(copper,x,y+rise,z,w*.28,.22,d*.28);
 }
 function clock(x,y,z,r){
   const tex=new B.DynamicTexture('clock dial',{width:256,height:256},scene,true),c=tex.getContext();c.clearRect(0,0,256,256);c.fillStyle='#223f47';c.beginPath();c.arc(128,128,122,0,Math.PI*2);c.fill();c.strokeStyle='#f5d98d';c.lineWidth=6;c.stroke();
   c.fillStyle='#efd9a5';c.font='20px Georgia';c.textAlign='center';c.textBaseline='middle';['XII','III','VI','IX'].forEach((s,i)=>{let a=i*Math.PI/2;c.fillText(s,128+Math.sin(a)*93,128-Math.cos(a)*93)});
   for(let i=0;i<12;i++){let a=i*Math.PI/6;c.beginPath();c.moveTo(128+Math.sin(a)*104,128-Math.cos(a)*104);c.lineTo(128+Math.sin(a)*112,128-Math.cos(a)*112);c.stroke()}
   c.lineCap='round';c.lineWidth=8;c.beginPath();c.moveTo(94,94);c.lineTo(128,128);c.lineTo(175,103);c.stroke();tex.update();tex.hasAlpha=true;
   const mat=new B.StandardMaterial('gold clock face',scene);mat.diffuseTexture=tex;mat.emissiveColor=new B.Color3(.28,.25,.16);mat.backFaceCulling=false;plane(mat,x,y,z,r*2,r*2);
 }
 // Domkyrkan: pale plaster, cross-shaped nave and four clock faces below the lantern.
 const white=pbr('cathedral ivory plaster','#eee9d6');
 box(white,62,6.8,109,15,13.6,28);box(white,62,6.8,110,27,13.6,10);rectCollider(62,105,27,36);roof(62,13.7,108,18,31,4.6);
 box(white,62,15.5,89,9,31,9);box(cream,62,1,89,9.5,2,9.5);
 for(let y of [12,24,29.5])box(cream,62,y,89,9.6,.42,9.6);
 for(const x of [59,65]){box(M.glass,x,19.9,84.43,1.6,3.3,.13);arch(x,21.45,84.29,.8,cream,.17);box(cream,x-1,20.2,84.3,.21,4,.2);box(cream,x+1,20.2,84.3,.21,4,.2)}
 clock(62,26.3,84.35,1.72); // The front dial is readable from the square.
 cylinder(M.roof,62,32.3,89,9.8,4,8,false,null,6.5);cylinder(copper,62,35.7,89,6.4,3,8);cylinder(M.roof,62,39.2,89,7.2,4.3,8,false,null,1.4);cylinder(M.roof,62,42.1,89,1.4,2.2,8,false,null,.16);sphere(M.brass,62,43.1,89,.22,.3,.22);box(M.brass,62,44.2,89,.12,2.0,.12);box(M.brass,62,44.5,89,1.0,.12,.12);
 for(let z=99;z<122;z+=6){box(M.glass,54.42,7,z,.13,4.4,1.8);box(cream,54.28,7,z,.2,.1,1.8)}
 // Cyrillushuset. The ochre wall, huge arch, star window and swept green roof
 // are the defining motifs; this is an interpretation, not a survey model.
 box(ochre,-24,5.5,119,31,11,20);rectCollider(-24,119,31,20);box(ochre,-24,6,109,13,12,3.2);
 box(M.stone,-24,.48,117,32,.95,24);roof(-24,11.9,117,34,25,3.7);
 box(M.black,-24,3.9,107.32,5.7,7.2,.10);disk(M.black,-24,7.5,107.30,2.85);
 arch(-24,7.5,107.17,3.0,cream,.24);for(const x of [-27,-21])box(cream,x,4.03,107.16,.46,7.5,.26);
 box(M.glass,-24,2.65,107.08,4.7,4.5,.12);box(copper,-24,2.65,106.98,.095,4.5,.09);box(copper,-24,3.6,106.98,4.7,.08,.09);
 // Eight pointed star set inside the arch, built as individual copper bars.
 const star=[];for(let i=0;i<16;i++){let a=i*Math.PI/8,r=i%2?.71:1.45;star.push(new V(-24+Math.sin(a)*r,7.9+Math.cos(a)*r,106.99))}for(let i=0;i<16;i++)lineBetween(copper,star[i],star[(i+1)%16],.06);
 for(let x of [-36,-31,-17,-12])for(let y of [3.7,8]){box(cream,x,y,108.94,1.85,2.35,.17);box(M.glass,x,y,108.81,1.5,2.0,.11);box(copper,x,y,108.72,.065,2,.09);box(copper,x,y,108.72,1.5,.065,.09)}
 for(let i=0;i<4;i++)box(M.stone,-24,.1+i*.09,104.8+i*.55,8-i*.25,.18+i*.18,3-i*.45);
 plane(sign('VÄRMLANDS MUSEUM',10,1,'#f6e9bd','#705935'),-24,1.5,103.4,7,.62);
 for(const s of [-1,1]){sphere(copper,-24+s*14.5,12.5,107.1,.25,.5,.32);box(copper,-24+s*14.5,12.6,107.1,1.7,.14,.4)}
 // Nyrén's red timber extension with yellow frames and a glazed link.
 box(falu,-23,3.7,139,41,7.4,15);rectCollider(-23,139,41,15);box(M.roof,-23,7.5,139,43,.45,17);box(M.glass,-24,3.3,128.7,10,6.2,5);
 for(let x=-42;x<-3;x+=2.5){box(ochre,x,3.8,131.4,1.6,4.7,.21);box(M.glass,x,3.8,131.24,1.32,4.4,.12);box(ochre,x,3.8,131.1,.07,4.4,.1)}
 for(let x=-43;x<-3;x+=.65)box(falu,x,3.8,131.35,.055,7.2,.18);
 // The reflecting pool occupies its own garden, leaving the playable approach open.
 box(M.stone,-31,.12,77,10,.28,26);box(copper,-31,.275,77,9.4,.045,25.4);rectCollider(-31,77,10,26);
 const pool=pbr('reflecting pool','#54959a',.08,.68);box(pool,-31,.30,77,9.0,.022,25.0);for(let z=65;z<=89;z+=3)box(M.trim,-31,.32,z,10,.08,.09);
 // Sandgrund: white horizontal pavilion, broad orange sign, colonnade and ramp.
 box(cream,25,3.15,116,26,6.3,19);rectCollider(25,116,26,19);box(M.glass,25,2.75,106.38,24,4.7,.13);box(cream,25,6.05,105.9,28,1.1,3.3);box(M.roof,25,6.75,116,28,.28,22);
 for(let x=13;x<39;x+=4.2){box(cream,x,2.85,104.6,.27,5.7,.3);box(M.metal,x,2.7,106.2,.07,4.7,.12)}
 plane(sign('SANDGRUND',12,1,'#e87735','#f2eddd'),25,6.04,104.19,14,1.05);plane(sign('LARS LERIN',7,1,'#ece8dd','#293f45'),25,3.9,106.15,7,.6);
 box(falu,25,.08,101.1,28,.16,6.4);for(let x=12;x<40;x+=2)box(cream,x,.175,101.1,.06,.035,6.2);
 for(let x of [14,36]){box(M.metal,x,.72,101.2,.05,1.4,.05);box(M.metal,x,.72,104,.05,1.4,.05);box(M.metal,x,1.35,102.6,.06,.06,3)}
 const art=B.MeshBuilder.CreateTorus('garden sculpture',{diameter:3.2,thickness:.17,tessellation:40},scene);art.position.set(20,2.3,87);art.rotation.x=Math.PI/2;add(art,M.brass);cylinder(M.stone,20,.45,87,3.4,.9,32);
 // Naturum: a curved timber and glass frontage on a deck over the wetland.
 box(M.paving,-124,.02,-78,7,.1,37);box(M.paving,-112,.035,-48,24,.1,16);box(M.wood,-124,.14,-99,31,.28,13);
 box(timber,-124,2.8,-113,28,5.6,15);rectCollider(-124,-111,28,20);box(M.roof,-124,5.9,-112,31,.55,19);
 for(let i=0;i<19;i++){
   const a=(-65+i*130/18)*Math.PI/180,x=-124+Math.sin(a)*15,z=-113+Math.cos(a)*14;
   const glass=box(M.glass,x,2.9,z,1.78,4.9,.11);glass.rotation.y=a;
   const post=box(timber,x,2.95,z+.13,.14,5.65,.23);post.rotation.y=a;
   const eave=box(timber,x,5.8,z,1.88,.35,2.2);eave.rotation.y=a;
   const deck=box(M.wood,x,.18,z+1.7,2.0,.25,4.5);deck.rotation.y=a;
   if(i%3===0){cylinder(timber,x,-.5,z+3,.22,1.8,10);box(timber,x,.82,z+3,.09,1.65,.09);}
 }
 plane(sign('naturum VÄRMLAND',12,1,'#f3e4b8','#355649'),-124,5.14,-98.76,11,.7,Math.PI);
 box(pool,-124,-.34,-127,53,.05,41);
 for(let i=0;i<140;i++){const x=-149+(i*7.71%49),z=-137+(i*3.61%15),height=.6+(i%7)*.14;cylinder(timber,x,height*.5-.15,z,.026,height,5);if(i%3===0)cylinder(M.wood,x,height-.12,z,.07,.25,6)}
 for(let x=-138;x<-109;x+=.7)box(timber,x,.3,-97.3,.035,.025,10.5);
 // Stora torget and the yellow town hall. A west-facing courtyard preserves the
 // main north-south promenade and every existing mission route.
 const yellow=pbr('town hall yellow plaster','#e7c66e');
 box(M.paving,23,.06,43,47,.12,20);box(yellow,31,6.9,61,35,13.8,14);rectCollider(31,61,35,14);
 box(M.stone,31,1.55,53.9,35.5,3.1,.2);for(let y of [3.2,6.7,10.2,13.7])box(cream,31,y,53.84,36,.21,.25);box(copper,31,14.2,61,37,.5,16);
 for(let x=16;x<=46;x+=3){for(let y of [5,8.5,11.7]){box(cream,x,y,53.67,1.9,2.35,.2);box(M.glass,x,y,53.53,1.5,1.97,.11);box(cream,x,y,53.43,.065,1.97,.1);box(cream,x,y,53.43,1.5,.08,.1)}box(M.glass,x,1.65,53.6,1.6,2.5,.14);arch(x,2.9,53.42,.8,cream,.11);const awning=box(copper,x,3.2,53.1,2.1,.15,1);awning.rotation.x=-.23;}
 box(cream,31,8.5,53.4,8.5,11,.5);for(let x of [28,31,34])for(let y of [5,8.5,11.7]){box(M.glass,x,y,53.05,1.4,1.95,.12);box(cream,x,y,52.94,.065,1.95,.09)}
 box(yellow,31,15,61,10,2,14);roof(31,16.05,61,12,16,2.1);clock(31,15.4,53.35,1.0);plane(sign('RÅDHUSET',7,.7,'#53605b','#ece0b6'),31,3.3,52.97,7,.6);
 // Blue enamel street names and navigation signs.
 for(const [x,z,txt] of [[13.8,16,'ÖSTRA TORGGATAN'],[-14.8,18,'VÄSTRA TORGGATAN'],[10,57,'STORA TORGET'],[6,93,'SANDGRUNDSUDDEN']]){cylinder(M.metal,x,1.85,z,.07,3.7,8);plane(sign(txt,5,.6,'#f6f4e4','#285682'),x,3.3,z-.06,4.9,.55)}
 // Flower beds, bike racks and original sun pennants make public space feel lived in.
 const flower=[pbr('flowers coral','#ed866a'),pbr('flowers gold','#f7ce58'),pbr('flowers lavender','#ac95d6')];
 for(const [x,z] of [[7,54],[-8,56],[10,91],[40,96],[-39,95]]){cylinder(cream,x,.25,z,2.2,.5,20);cylinder(M.soil,x,.51,z,2,.035,20);for(let i=0;i<20;i++){let a=i*2.4,r=Math.sqrt(i/20)*.88;sphere(flower[i%3],x+Math.cos(a)*r,.6+(i%3)*.07,z+Math.sin(a)*r,.15,.16,.15)}}
 for(let i=0;i<4;i++){let x=38+i*1.1;arch(x,.7,56,.42,M.metal,.04);for(const sx of [-.42,.42])cylinder(M.metal,x+sx,.36,56,.075,.7,8)}
 const flags=[];for(const x of [-13,13])for(const z of [22,55,91]){cylinder(M.metal,x,3.5,z,.07,7,10);const flag=box(blue,x+.6,5.7,z,1.25,1.85,.025,true);flags.push(flag);plane(sign('✳',1,1,'#f8d475','#245e8c'),x+.6,5.7,z-.026,.9,.9,0,true)}
 return {flags};
};
