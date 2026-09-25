/* Soljakten: a non-violent, free-movement obstacle and discovery course. */
window.KarlstadAction=function(scene){
 const B=BABYLON,V=B.Vector3,root=new B.TransformNode('Soljakten course',scene);
 const gold=new B.StandardMaterial('sun fragments',scene);gold.diffuseColor=B.Color3.FromHexString('#ffcf46');gold.emissiveColor=B.Color3.FromHexString('#e89625').scale(.5);
 const teal=new B.PBRMaterial('course teal',scene);teal.albedoColor=B.Color3.FromHexString('#27afb7');teal.roughness=.6;
 const violet=new B.PBRMaterial('course violet',scene);violet.albedoColor=B.Color3.FromHexString('#886aca');violet.roughness=.6;
 const course=[
  [0,58,'run','SPRING MOT SOLEN'],[0,66,'duck','DUCKA UNDER PORTEN'],[0,76,'jump','HOPPA ÖVER HINDRET'],[-8,86,'run','FÖLJ PARKSPÅRET'],[-18,97,'find','HITTA VID MUSEET'],[-24,99,'find','STJÄRNFÖNSTRETS HEMLIGHET'],[-5,99,'run','TILLBAKA TILL LJUSET'],[10,96,'duck','DUCKA OCH HÄMTA'],[25,97,'find','SANDGRUNDS SOL'],[32,90,'run','FÅNGA VID KONSTEN'],[27,79,'jump','HOPPA MOT HIMLEN'],[15,87,'find','TRÄDGÅRDENS GÖMMA'],[0,89,'run','HEMVÄGEN LYSER'],[0,54,'finish','MÅL · SOLSIGILLET']
 ];
 const items=course.map(([x,z,type,label],i)=>{
  const node=new B.TransformNode('sun '+(i+1),scene);node.parent=root;node.position.set(x,type==='duck'?.65:type==='jump'?1.35:1.05,z);
  const orb=B.MeshBuilder.CreatePolyhedron('sun crystal',{type:1,size:.32},scene);orb.material=gold;orb.parent=node;
  const ring=B.MeshBuilder.CreateTorus('sun halo',{diameter:1.1,thickness:.035,tessellation:32},scene);ring.material=gold;ring.parent=node;ring.rotation.x=Math.PI/2;
  const base=B.MeshBuilder.CreateTorus('course floor ring',{diameter:2.8,thickness:.055,tessellation:32},scene);base.position.set(x,.16,z);base.material=type==='duck'?teal:violet;base.parent=root;
  const obstacle=[];
  function bar(px,py,pz,w,h,d,mat){const m=B.MeshBuilder.CreateBox('soft play obstacle',{width:w,height:h,depth:d},scene);m.position.set(px,py,pz);m.material=mat;m.parent=root;obstacle.push(m);}
  if(type==='duck'){bar(x-1.6,1.2,z,.23,2.4,.55,teal);bar(x+1.6,1.2,z,.23,2.4,.55,teal);bar(x,2.025,z,3.45,.75,.55,teal);for(let a=-1.2;a<1.3;a+=.6)bar(x+a,1.64,z-.3,.3,.08,.03,gold);}
  if(type==='jump'){bar(x,.34,z,3.2,.66,.52,violet);bar(x,.7,z,3.25,.08,.58,gold);}
  return {x,z,type,label,node,orb,ring,base,obstacle};
 });
 let index=0,seconds=120,points=0,combo=0,lastPickup=120,finished=false;root.setEnabled(false);
 function reset(){index=0;seconds=120;points=0;combo=0;lastPickup=120;finished=false;root.setEnabled(true);items.forEach(p=>{p.node.setEnabled(true);p.base.setEnabled(true)});}
 function current(){return items[Math.min(index,items.length-1)]}
 function collides(x,z,crouch,height){for(const p of items){if(p.type==='duck'){if(Math.abs(z-p.z)<.62){if(Math.abs(Math.abs(x-p.x)-1.6)<.4)return true;if(Math.abs(x-p.x)<1.55&&(!crouch||height>.1))return true}}else if(p.type==='jump'&&height<.73&&Math.abs(x-p.x)<1.9&&Math.abs(z-p.z)<.6)return true}return false}
 function update(dt,player,crouch,height){
  if(finished)return null;seconds=Math.max(0,seconds-dt);const p=current(),elapsed=120-seconds;
  for(let i=0;i<items.length;i++){const item=items[i];item.orb.rotation.y=elapsed*1.8;item.ring.rotation.z=elapsed*.7;item.node.scaling.setAll(i===index?1.1:.58);item.base.visibility=i===index?1:.3;}
  if(seconds<=0){finished=true;return {done:true,won:false}}
  if(Math.hypot(player.x-p.x,player.z-p.z)<1.7){
   if(p.type==='duck'&&(!crouch||height>.1))return null;if(p.type==='jump'&&height<.5)return null;
   combo=lastPickup-seconds<12?Math.min(5,combo+1):1;points+=100+combo*25;lastPickup=seconds;p.node.setEnabled(false);p.base.setEnabled(false);index++;
   if(index===items.length){points+=Math.floor(seconds)*10;finished=true;return {done:true,won:true,pickup:p}}
   return {pickup:p};
  }return null;
 }
 return {root,reset,current,collides,update,get state(){return {index,total:items.length,seconds,points,combo,finished}}};
};
