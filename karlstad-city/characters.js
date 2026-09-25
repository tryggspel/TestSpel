/* Original stylised character art. No third-party character models or textures. */
window.KarlstadCharacter = function(scene, options={}) {
  const B=BABYLON, V=B.Vector3, col=h=>B.Color3.FromHexString(h);
  const root=new B.TransformNode(options.name||'Karlstad citizen',scene);
  const hips=new B.TransformNode('hips',scene);hips.parent=root;hips.position.y=.94;
  const torso=new B.TransformNode('torso',scene);torso.parent=hips;
  const historical=options.type==='sola'||options.type==='froding';
  const skin=options.skin||'#d9a477',shirt=options.shirt||'#29b5be',pants=options.pants||'#253c62',hair=options.hair||'#422d32';
  let mat=scene.getMaterialByName('character vertex colours');
  if(!mat){mat=new B.PBRMaterial('character vertex colours',scene);mat.albedoColor=B.Color3.White();mat.roughness=.84;mat.metallic=0;mat.environmentIntensity=.65;}
  let parts=[];
  function paint(mesh,color){const c=col(color),count=mesh.getTotalVertices(),colors=new Float32Array(count*4);for(let i=0;i<count;i++){colors[i*4]=c.r;colors[i*4+1]=c.g;colors[i*4+2]=c.b;colors[i*4+3]=1}mesh.setVerticesData(B.VertexBuffer.ColorKind,colors);mesh.material=mat;mesh.isPickable=false;parts.push(mesh);return mesh}
  function oval(color,x,y,z,sx,sy,sz){const m=B.MeshBuilder.CreateSphere('sculpted character detail',{segments:6,diameter:2},scene);m.position.set(x,y,z);m.scaling.set(sx,sy,sz);return paint(m,color)}
  function block(color,x,y,z,w,h,d){const m=B.MeshBuilder.CreateBox('tailored detail',{width:w,height:h,depth:d},scene);m.position.set(x,y,z);return paint(m,color)}
  function cone(color,x,y,z,base,top,h,n=16){const m=B.MeshBuilder.CreateCylinder('tailored form',{diameterBottom:base,diameterTop:top,height:h,tessellation:n},scene);m.position.set(x,y,z);return paint(m,color)}
  function finish(parent){parts.forEach(p=>p.computeWorldMatrix(true));const mesh=B.Mesh.MergeMeshes(parts,true,true,undefined,false,false);parts=[];mesh.parent=parent;mesh.receiveShadows=true;mesh.isPickable=false;return mesh}
  // A shaped jacket, collar, seams, pockets and a small enamel sun badge.
  oval(shirt,0,.37,0,.32,.43,.205);cone(shirt,0,.12,0,.48,.61,.28);
  oval('#efe7d6',0,.69,0,.145,.085,.15);block('#f7d45f',0,.4,.204,.035,.53,.018);
  for(const s of [-1,1]){block(shirt,s*.18,.22,.19,.17,.13,.045);block('#e0e5db',s*.18,.27,.216,.15,.016,.018)}
  oval('#ffd968',-.18,.55,.205,.069,.069,.026);oval('#fff7d7',-.18,.55,.23,.033,.033,.007);
  if(!historical){oval('#284972',0,.4,-.24,.26,.3,.12);block('#f9bb59',0,.37,-.36,.3,.19,.035);for(const s of [-1,1])block('#174d5a',s*.2,.41,.195,.055,.54,.045);block('#d8e6e2',0,.64,-.35,.18,.038,.035)}
  if(options.type==='froding'){cone('#343946',0,.08,-.035,.73,.58,.72);block('#dddecf',0,.59,.207,.14,.2,.025);block('#242531',0,.61,.235,.035,.13,.022);for(const y of [.2,.35,.5])oval('#c7b18b',.04,y,.228,.021,.021,.01)}
  if(options.type==='sola'){cone('#276b79',0,-.38,0,1.05,.45,1.03,24);const apron=cone('#f4e4c3',0,-.37,.026,.85,.41,.88,24);apron.scaling.z=.73;block('#efe2c7',0,.3,.204,.29,.42,.025);block('#cfb578',0,.05,.05,.59,.07,.41)}
  finish(torso);
  const head=new B.TransformNode('head',scene);head.parent=torso;head.position.set(0,.86,0);
  cone(skin,0,-.09,0,.16,.18,.2);oval(skin,0,.16,.015,.22,.275,.204);
  for(const s of [-1,1]){oval(skin,s*.215,.15,.014,.045,.073,.044);oval('#fff8ed',s*.084,.207,.184,.048,.051,.021);oval('#28464c',s*.079,.204,.202,.023,.031,.008);oval('#faf5da',s*.073,.214,.208,.008,.01,.004);const brow=block(hair,s*.087,.283,.188,.092,.023,.021);brow.rotation.z=s*.09;}
  oval(skin,0,.125,.211,.05,.056,.055);oval('#9c5649',0,.046,.191,.063,.014,.014);oval('#f3c09d',0,.064,.192,.064,.012,.014);
  oval(hair,0,.348,-.035,.224,.138,.197);oval(hair,-.144,.3,.056,.092,.115,.12);oval(hair,.17,.206,-.06,.051,.135,.151);
  if(options.type==='froding'){oval('#69616a',0,.027,.125,.188,.124,.109);oval('#635863',-.064,.10,.207,.086,.032,.037);oval('#635863',.064,.10,.207,.086,.032,.037);cone('#333b48',0,.449,-.035,.50,.40,.19);cone('#252e3d',0,.367,.009,.68,.68,.046);block('#8c795d',0,.387,.19,.28,.035,.018)}
  else if(options.type==='sola'){oval('#f6ecd5',0,.396,-.055,.238,.094,.20);oval(hair,0,.23,-.19,.14,.15,.097)}
  else {oval('#24a7b2',0,.397,-.04,.237,.092,.19);const brim=oval('#f1cb66',0,.338,.19,.245,.028,.14);brim.rotation.x=-.08;}
  finish(head);
  const legs=[],knees=[],arms=[],elbows=[];
  for(const s of [-1,1]){
    const leg=new B.TransformNode('thigh',scene);leg.parent=hips;leg.position.set(s*.16,0,0);legs.push(leg);
    oval(pants,0,-.22,0,.135,.27,.145);block('#456184',0,-.15,.133,.14,.16,.025);finish(leg);
    const knee=new B.TransformNode('knee',scene);knee.parent=leg;knee.position.y=-.4;knees.push(knee);
    oval(pants,0,-.18,0,.103,.24,.107);oval('#e5dfcf',0,-.41,.075,.14,.095,.225);block('#335468',0,-.445,.077,.27,.055,.40);block('#f5bc54',0,-.36,.155,.16,.045,.07);finish(knee);
    const arm=new B.TransformNode('upper arm',scene);arm.parent=torso;arm.position.set(s*.34,.63,0);arm.rotation.z=s*.10;arms.push(arm);
    oval(shirt,0,-.15,0,.132,.227,.132);finish(arm);
    const elbow=new B.TransformNode('elbow',scene);elbow.parent=arm;elbow.position.y=-.32;elbows.push(elbow);
    oval(shirt,0,-.13,.02,.09,.19,.105);cone('#f4ce67',0,-.25,.015,.18,.18,.07);oval(skin,0,-.33,.03,.085,.105,.085);oval(skin,-s*.067,-.316,.074,.033,.06,.042);
    if(options.type==='froding'&&s===1){block('#925846',0,-.32,.11,.24,.33,.077);block('#efe3b5',0,-.32,.154,.2,.29,.018)}
    finish(elbow);
  }
  let pace=0,blend=0,crouchAmount=0;
  function animate(dt,speed=0,crouch=false,air=0,t=0){
    const mix=1-Math.exp(-dt*18);blend+=(Math.min(speed/7.8,1)-blend)*mix;crouchAmount+=((crouch?1:0)-crouchAmount)*mix;
    pace+=dt*(5+speed*1.5);const swing=Math.sin(pace),run=blend;
    hips.position.y=.94-crouchAmount*.48+Math.abs(Math.cos(pace))*run*.045;
    torso.rotation.x=.06+run*.10+crouchAmount*.42;torso.rotation.z=Math.sin(pace)*run*.025;
    head.rotation.y=Math.sin(t*.7)*.07*(1-run);head.rotation.x=-torso.rotation.x*.45;
    for(let i=0;i<2;i++){const q=i?1:-1;legs[i].rotation.x=swing*q*run*.82-crouchAmount*.95; knees[i].rotation.x=Math.max(0,-swing*q)*run*1.05+crouchAmount*1.75;arms[i].rotation.x=-swing*q*run*.74-crouchAmount*.3;elbows[i].rotation.x=-.22-run*.8;if(air>.1){legs[i].rotation.x-=.25;knees[i].rotation.x+=.5;arms[i].rotation.x=-.7;}}
  }
  if(options.scale)root.scaling.setAll(options.scale);
  return {root,hips,head,torso,legs,arms,animate};
};
