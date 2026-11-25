// Ljuset i julbygget (2.21.1-xmas.13): tonar staden, himlen, dimman och ljuskällorna efter dag, skymning och kväll (xmas-light.mjs).
// Staden ritas mest med obelysta material (färgade trianglar), så ljuskällorna räcker inte: de materialen tonas genom sin självlysande färg.
// Det som ska lysa (ljusslingor, lyktor, fönster, skyltar, eld, sken) lämnas orört och syns därför starkare ju mörkare det blir.
// Fail-soft: ett material som spelet självt ändrar färg på (blinkar, byter färg) märks och lämnas i fred.
import {LIGHT_MODES,darknessFor,gradeFor,gradeKind,phaseName} from './xmas-light.mjs?v=2.21.1-xmas.16';

// Material som lyser av sig själva även om de är ogenomskinliga och obelysta (efter material- eller nodnamn): de lämnas orörda.
const GLOW=/lykt|fönster|window|lamp|neon|glow|sken|stjärn|\bstar\b|ljus|bulb|flam|lågor|skärm|screen/i;
// Genomskinliga bildkort som är byggnader (målade fasader): tonas fullt. Övriga bildkort (skyltar, gatunamn, snöfall) tonas mjukt så att de går att läsa.
const FACADE=/fasad|facade|byggnad|kvarter|vägg|tak\b/i;
// Tända fönster i skymning och kväll: stadens fönsterglas är blågrå färger på lodräta ytor i de färgade trianglarna. Ungefär hälften av
// fönstren (efter våning och läge längs fasaden) tänds med varmt ljus, några med blåaktigt skärmljus; bottenvåningarnas butiker oftare.
// xmas_night 0 = dag (allt som förut). Bara WebGL (GLSL); på andra grafikgränssnitt blir fönstren bara mörkare.
const NIGHT_EMISSIVE=`
uniform vec3 material_emissive;
uniform float material_emissiveIntensity;
uniform float xmas_night;
void getEmission() {
	dEmission = material_emissive * material_emissiveIntensity;
	#ifdef STD_EMISSIVE_TEXTURE
	dEmission *= {STD_EMISSIVE_TEXTURE_DECODE}(texture2DBias({STD_EMISSIVE_TEXTURE_NAME}, {STD_EMISSIVE_TEXTURE_UV}, textureBias)).{STD_EMISSIVE_TEXTURE_CHANNEL};
	#endif
	#ifdef STD_EMISSIVE_VERTEX
	vec3 vc = saturate(vVertexColor.{STD_EMISSIVE_VERTEX_CHANNEL});
	dEmission *= vc;
	if (xmas_night > 0.001) {
		vec3 nrm = normalize(cross(dFdx(vPositionW), dFdy(vPositionW)));
		float upright = smoothstep(0.75, 0.9, 1.0 - abs(nrm.y));
		float mx = max(vc.r, max(vc.g, vc.b));
		float ratio = (vc.g + vc.b) * 0.5 / max(vc.r, 0.004);
		float glass = smoothstep(1.22, 1.32, ratio) * step(vc.g * 0.85, vc.b) * (1.0 - smoothstep(0.44, 0.52, mx)) * step(0.015, mx) * upright;
		vec2 cell = vec2(floor((vPositionW.x + vPositionW.z) / 2.7), floor(vPositionW.y / 3.1));
		float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
		float on = step(vPositionW.y < 3.2 ? 0.25 : 0.46, h);
		float tone = fract(h * 13.7);
		vec3 warm = mix(vec3(1.0, 0.62, 0.26), vec3(1.0, 0.80, 0.50), tone) * (0.55 + 0.45 * fract(h * 5.3));
		vec3 win = tone > 0.92 ? vec3(0.35, 0.5, 0.95) * 0.7 : warm;
		dEmission = mix(dEmission, win, glass * on * xmas_night);
	}
	#endif
}
`;
const SKY_R=540,SEG=36,RINGS=[-30,-6,0,2,5,9,15,24,36,52,70,90];
const srgb=c=>Math.max(0,Math.min(255,Math.round(c*255)));
const mix3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];

// Himlen: en kupol runt kameran med färgövergång från horisonten upp mot zenit, ljusare åt solnedgången, och stjärnor som tänds i mörker.
function buildSky(pc,app,sunAz){
  const pos=[],idx=[],dirs=[]; // dirs: [höjd 0–1 (negativ under horisonten), riktning mot solen −1..1, stjärnans ljusstyrka (0 = inte stjärna)]
  for(let r=0;r<RINGS.length;r++){
    const el=RINGS[r]*Math.PI/180;
    for(let s=0;s<=SEG;s++){
      const az=s/SEG*Math.PI*2,c=Math.cos(el);
      pos.push(Math.sin(az)*c*SKY_R,Math.sin(el)*SKY_R,Math.cos(az)*c*SKY_R);
      dirs.push([RINGS[r]/90,Math.cos(az-sunAz),0]);
    }
  }
  for(let r=0;r<RINGS.length-1;r++)for(let s=0;s<SEG;s++){const a=r*(SEG+1)+s,b=a+SEG+1;idx.push(a,b,a+1,a+1,b,b+1);}
  // Stjärnorna: små fyrkanter på kupolens insida (fast mönster, samma varje kväll).
  let seed=20261129;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<300;i++){
    const el=(10+Math.pow(rnd(),.8)*78)*Math.PI/180,az=rnd()*Math.PI*2,size=(rnd()<.08?4.6:2.2+rnd()*1.6),b=.45+rnd()*.55;
    const R=SKY_R*.985,cx=Math.sin(az)*Math.cos(el)*R,cy=Math.sin(el)*R,cz=Math.cos(az)*Math.cos(el)*R;
    // två axlar vinkelräta mot riktningen in mot mitten
    const ux=Math.cos(az),uz=-Math.sin(az),vx=-Math.sin(az)*Math.sin(el),vy=Math.cos(el),vz=-Math.cos(az)*Math.sin(el),h=size/2,v=pos.length/3;
    pos.push(cx-ux*h-vx*h,cy-vy*h,cz-uz*h-vz*h, cx+ux*h-vx*h,cy-vy*h,cz+uz*h-vz*h, cx+ux*h+vx*h,cy+vy*h,cz+uz*h+vz*h, cx-ux*h+vx*h,cy+vy*h,cz-uz*h+vz*h);
    idx.push(v,v+1,v+2,v,v+2,v+3);
    for(let k=0;k<4;k++)dirs.push([el/(Math.PI/2),0,b]);
  }
  const mesh=new pc.Mesh(app.graphicsDevice);mesh.setPositions(new Float32Array(pos));mesh.setIndices(new Uint16Array(idx));
  const colors=new Uint8Array(dirs.length*4);mesh.setColors32(colors);mesh.update(pc.PRIMITIVE_TRIANGLES,false);
  const mat=new pc.StandardMaterial();mat.name='Julhimlen';mat.useLighting=false;mat.useFog=false;mat.diffuse.set(0,0,0);mat.emissive.set(1,1,1);
  mat.emissiveVertexColor=true;mat.vertexColorGamma=true;mat.depthWrite=false;mat.cull=pc.CULLFACE_NONE;mat.update();
  const mi=new pc.MeshInstance(mesh,mat);mi.cull=false;
  const ent=new pc.Entity('Julhimlen');ent.addComponent('render',{meshInstances:[mi],layers:[pc.LAYERID_SKYBOX],castShadows:false,receiveShadows:false});
  app.root.addChild(ent);
  function paint(g){
    for(let i=0;i<dirs.length;i++){
      const [h,toSun,star]=dirs[i];let c;
      if(star>0){const sky=mix3(g.horizon,g.top,Math.min(1,Math.pow(h,.55)));c=mix3(sky,[1,1,.96],Math.min(1,g.stars*star));}
      else if(h<=0)c=g.fog;
      else{
        const glow=Math.max(0,toSun)**2,hor=mix3(g.fog,g.horizon,.35+.65*glow);
        c=mix3(hor,g.top,Math.min(1,Math.pow(h,.55)));
      }
      colors[i*4]=srgb(c[0]);colors[i*4+1]=srgb(c[1]);colors[i*4+2]=srgb(c[2]);colors[i*4+3]=255;
    }
    mesh.setColors32(colors);mesh.update(pc.PRIMITIVE_TRIANGLES,false);
  }
  return {ent,mat,paint};
}

export function createXmasLight(pc,host,{decor=null,mode='auto',onChange=null}={}){
  const app=host.app,scene=app.scene;
  const lightOf=n=>{const e=app.root.findByName(n);return e&&e.light?e.light:null;};
  const sun=lightOf('sun'),fill=lightOf('fill');
  const camComp=host.camera.camera;
  // Solens riktning i världen (för solnedgångens sken på himlen): ljusets riktning är entitetens −Y.
  let sunAz=0;try{const e=app.root.findByName('sun'),d=e.up.clone().mulScalar(-1);sunAz=Math.atan2(-d.x,-d.z);}catch{}
  let sky=null;try{sky=buildSky(pc,app,sunAz);}catch(e){console.error('[Jul] himlen hoppades över',e);}
  const tracked=new Map(); // material → {kind, base:[r,g,b], set:[r,g,b]|null}
  const own=new Set(sky?[sky.mat]:[]);
  let cur=LIGHT_MODES.includes(mode)?mode:'auto',k=-1,g=null,scanAt=-1e9,stats={};
  function classify(m,node=''){
    if(own.has(m))return {kind:'own'};
    let kind=gradeKind(m,{bright:decor?.bright,dim:decor?.dim,BLEND_NONE:pc.BLEND_NONE});
    if(kind==='bright'&&m.useLighting===false&&m.blendType===pc.BLEND_NORMAL&&!decor?.bright?.has(m))kind=FACADE.test(node)?'dim':'soft';
    const label=(m.name&&m.name!=='Untitled'?m.name:'')+' '+node;
    if((kind==='dim'||kind==='soft')&&!decor?.dim?.has(m)&&GLOW.test(label))kind='glow';
    const e=m.emissive,win=kind==='dim'&&nightWindows(m);return {kind,base:e?[e.r,e.g,e.b]:null,set:null,win};
  }
  const webgl=!app.graphicsDevice.isWebGPU;
  function nightWindows(m){
    if(!webgl||!m.emissiveVertexColor||decor?.dim?.has(m))return false;
    try{m.getShaderChunks(pc.SHADERLANGUAGE_GLSL||'glsl').set('emissivePS',NIGHT_EMISSIVE);m.shaderChunksVersion=pc.CHUNKAPI_2_8||'2.8';m.setParameter('xmas_night',0);m.update();return true;}
    catch(e){console.error('[Jul] tända fönster hoppades över',e);return false;}
  }
  function tint(m,t){
    if((t.kind!=='dim'&&t.kind!=='soft')||!t.base||!m.emissive)return;
    const e=m.emissive;
    if(t.set&&(Math.abs(e.r-t.set[0])>2e-3||Math.abs(e.g-t.set[1])>2e-3||Math.abs(e.b-t.set[2])>2e-3)){t.kind='external';return;} // spelet ändrar själv färgen
    if(t.win)m.setParameter('xmas_night',Math.max(0,Math.min(1,(g.k-.25)/.6)));
    const w=t.kind==='soft'?g.soft:g.world,r=t.base[0]*w[0],gg=t.base[1]*w[1],b=t.base[2]*w[2];
    if(t.set&&Math.abs(r-t.set[0])<1e-4&&Math.abs(gg-t.set[1])<1e-4&&Math.abs(b-t.set[2])<1e-4)return;
    e.set(r,gg,b);t.set=[r,gg,b];m.update();
  }
  function scan(){
    const layers=scene.layers?.layerList||[];
    for(const layer of layers){
      if(!layer||/^(UI|Immediate|Depth)$/.test(layer.name))continue;
      for(const mi of layer.meshInstances||[]){
        const m=mi.material;if(!m||tracked.has(m))continue;
        const t=classify(m,mi.node?.name||'');tracked.set(m,t);if(g)tint(m,t);
      }
    }
    stats={dim:0,soft:0,bright:0,lit:0,external:0,glow:0,windows:0};for(const t of tracked.values()){if(t.kind in stats)stats[t.kind]++;if(t.win)stats.windows++;}
  }
  function apply(){
    for(const [m,t] of tracked)tint(m,t);
    if(sun){sun.intensity=g.sun;sun.color=new pc.Color(...g.sunColor);}
    if(fill)fill.intensity=g.fill;
    scene.ambientLight=new pc.Color(...g.ambient);
    if(scene.fog){scene.fog.color=new pc.Color(...g.fog);scene.fog.start=g.fogStart;scene.fog.end=g.fogEnd;}
    if(camComp)camComp.clearColor=new pc.Color(...g.fog);
    sky?.paint(g);
  }
  function refresh(force=false){
    const nk=darknessFor(cur);
    if(!force&&Math.abs(nk-k)<.004)return false;
    k=nk;g=gradeFor(k);apply();onChange?.(phaseName(k),k);return true;
  }
  function update(now=0){
    try{
      if(now-scanAt>2500){scanAt=now;scan();}
      refresh();
      if(sky){const c=host.camera.getPosition();sky.ent.setPosition(c.x,c.y,c.z);}
    }catch(e){console.error('[Jul] ljuset',e);}
  }
  function setMode(m){if(!LIGHT_MODES.includes(m))return false;cur=m;refresh(true);return true;}
  scan();refresh(true);
  return {update,setMode,get mode(){return cur;},get k(){return k;},get phase(){return phaseName(k);},
    // Felsökning: hur materialen under noder vars namn matchar re har klassats.
    inspect:re=>{const out=[];for(const l of scene.layers?.layerList||[])for(const mi of l.meshInstances||[]){if(!re.test(mi.node?.name||''))continue;const t=tracked.get(mi.material);out.push({node:mi.node.name,kind:t?.kind??null,base:t?.base??null,set:t?.set??null});}return out;},
    snapshot:()=>({mode:cur,k:+k.toFixed(3),phase:phaseName(k),sky:!!sky,materials:{...stats,total:tracked.size}})};
}
