// Julklappsjakten: vyn för paketjakten. Ett fast antal renderobjekt återanvänds för de närmaste paketen (inga nya objekt under spelet),
// bonuspaketen får en ljusstråle, tomten viftar och visar var paketen ska lämnas, och varje plockat paket ger en liten ljuspuff.
// Ingen fysik, inga ljus: allt är platta bildkort och två genomskinliga cylindrar.
import {drawBeam} from './xmas-art.js?v=2.21.1-xmas.1';
export function createXmasView(pc,host,draw,sprites,hunt){
  const {labelTex,texture}=draw,root=draw.root;
  const POOL=26,SHOW=54,BEAMS=4,BURSTS=6;
  const pool=Array.from({length:POOL},(_,i)=>({e:sprites.spriteEntity('Julpaket '+i,sprites.packageMaterials[0],1.3,1.3,{enabled:false}),id:'',variant:-1,kind:''}));
  const glowMat=(r,g,b,a)=>{const m=new pc.StandardMaterial();m.useLighting=false;m.diffuse.set(0,0,0);m.emissive.set(r,g,b);m.opacity=a;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.cull=pc.CULLFACE_NONE;m.update();return m;};
  const beamMat=glowMat(1,.84,.32,.3),ringMat=glowMat(1,.82,.3,.42),treeRing=glowMat(1,.9,.5,.2);
  const cyl=(name,mat)=>{const e=new pc.Entity(name);e.addComponent('render',{type:'cylinder'});e.render.material=mat;e.enabled=false;root.addChild(e);return e;};
  // Strålarna är bildkort med toning (kraftiga vid marken, utfadade uppåt och åt sidorna) som vänder sig mot spelaren: guld för bonuspaket, grönt för tomten.
  const beamMatOf=col=>{const m=sprites.spriteMaterial(texture((c,w,h)=>drawBeam(c,w,h,col),64,256),{alphaTest:0});m.depthWrite=false;m.update();return m;};
  const beamGold=beamMatOf('#ffc928'),beamGreen=beamMatOf('#35c46f');
  const beams=Array.from({length:BEAMS},(_,i)=>sprites.spriteEntity('Bonusstråle '+i,beamGold,2.6,22,{enabled:false}));
  const bursts=Array.from({length:BURSTS},()=>({ring:sprites.spriteEntity('Puff',sprites.glowGold,1,1,{enabled:false}),spark:sprites.spriteEntity('Gnista',sprites.sparkleMat,1,1,{enabled:false}),life:0,max:.55,x:0,y:0,z:0,big:false}));
  let burstIndex=0;
  // Tomten: bildkort, pratbubbla och en guldring (där man lämnar paketen).
  const bubbleTex={
    help:labelTex(['HJÄLP MIG!','MINA PAKET!'],'#b0302f','#fff1ce'),
    deliver:labelTex(['LÄMNA PAKETEN','HÄR!'],'#2d6a4f','#ffffff'),
    thanks:labelTex(['TACK!','GOD JUL!'],'#7a2f8f','#fff1ce')
  };
  const bubbleMat=Object.fromEntries(Object.entries(bubbleTex).map(([k,t])=>[k,sprites.spriteMaterial(t,{alphaTest:.1})]));
  const tomte={e:sprites.spriteEntity('Tomten',sprites.tomteMaterials[1][0],2.2,3.3,{enabled:false}),bubble:sprites.spriteEntity('Tomtens bubbla',bubbleMat.help,3.3,1.03,{enabled:false}),ring:cyl('Tomtens ring',ringMat),pillar:sprites.spriteEntity('Tomtens stråle',beamGreen,3.4,26,{enabled:false}),mood:'help'};
  const buf=[],bonusBuf=[];
  let shown=0,beamsOn=0;

  function burst(x,z,{big=false,y=.6}={}){
    const b=bursts[burstIndex++%BURSTS];Object.assign(b,{life:b.max,x,y,z,big});
  }
  function update(p,now,dt){
    const r=hunt.run,live=!!r&&(r.phase==='collect'||r.phase==='deliver'||r.phase==='free');
    // paket
    shown=0;
    if(live){
      hunt.nearby(p,SHOW,POOL,buf);
      for(let i=0;i<buf.length;i++){
        const k=buf[i],s=pool[i],e=s.e;
        if(s.id!==k.id){
          s.id=k.id;const v=sprites.packageVariant(k);
          if(s.variant!==v){s.variant=v;sprites.setMaterial(e,sprites.packageMaterials[v]);}
          const big=k.kind==='bonus';e.setLocalScale(big?2.1:1.35,big?2.1:1.35,1);s.kind=k.kind;
        }
        const ph=(k.cluster*1.7+i)%6.28,bob=Math.sin(now/480+ph)*.1;
        e.setPosition(k.x,(k.y||0)+.18+bob+(k.kind==='bonus'?.15:0),k.z);e.setEulerAngles(0,sprites.yawToward(k.x,k.z,p),Math.sin(now/700+ph)*5);
        if(!e.enabled)e.enabled=true;shown++;
      }
    }
    for(let i=shown;i<POOL;i++){const s=pool[i];if(s.e.enabled){s.e.enabled=false;s.id='';}}
    // bonusstrålar
    beamsOn=0;
    if(live){
      let n=0;for(const k of r.packages){if(k.collected||k.kind!=='bonus')continue;const d=Math.hypot(k.x-p.x,k.z-p.z);if(d<95&&n<BEAMS)bonusBuf[n++]=k;}
      for(let i=0;i<n;i++){const k=bonusBuf[i],b=beams[i],pulse=1+Math.sin(now/260+i)*.18;b.enabled=true;b.setPosition(k.x,0,k.z);b.setLocalScale(2.5*pulse,22,1);b.setEulerAngles(0,sprites.yawToward(k.x,k.z,p),0);beamsOn++;}
    }
    for(let i=beamsOn;i<BEAMS;i++)if(beams[i].enabled)beams[i].enabled=false;
    // tomten
    const t=live&&r.tomte?r.tomte:(r&&r.phase==='done'&&r.tomte?r.tomte:null);
    if(t){
      const d=Math.hypot(t.x-p.x,t.z-p.z),near=d<75,deliver=r.phase==='deliver',done=r.phase==='done';
      tomte.e.enabled=near;tomte.bubble.enabled=near;
      if(near){
        const frame=Math.floor(now/(deliver?330:650))%2;sprites.setMaterial(tomte.e,sprites.tomteMaterials[1][frame]);
        tomte.e.setPosition(t.x,0,t.z);tomte.e.setEulerAngles(0,sprites.yawToward(t.x,t.z,p),Math.sin(now/500)*2);
        const mood=done?'thanks':deliver?'deliver':'help';if(tomte.mood!==mood){tomte.mood=mood;sprites.setMaterial(tomte.bubble,bubbleMat[mood]);}
        tomte.bubble.setPosition(t.x,3.45+Math.sin(now/420)*.07,t.z);tomte.bubble.setEulerAngles(0,sprites.yawToward(t.x,t.z,p),0);
      }
      const ringOn=deliver&&d<120;tomte.ring.enabled=ringOn;tomte.pillar.enabled=ringOn;
      if(ringOn){const pulse=1+Math.sin(now/230)*.08;tomte.ring.setPosition(t.x,.07,t.z);tomte.ring.setLocalScale(t.radius*2*pulse,.05,t.radius*2*pulse);tomte.pillar.setPosition(t.x,0,t.z);tomte.pillar.setLocalScale(3.3*pulse,26,1);tomte.pillar.setEulerAngles(0,sprites.yawToward(t.x,t.z,p),0);}
    }else{tomte.e.enabled=tomte.bubble.enabled=tomte.ring.enabled=tomte.pillar.enabled=false;}
    // puffar
    for(const b of bursts){
      if(b.life<=0){if(b.ring.enabled){b.ring.enabled=false;b.spark.enabled=false;}continue;}
      b.life=Math.max(0,b.life-dt);const k=1-b.life/b.max,fade=1-k,size=(b.big?3.4:2.0)*(.4+k*.9);
      b.ring.enabled=b.spark.enabled=true;
      const yaw=sprites.yawToward(b.x,b.z,p);
      b.ring.setPosition(b.x,b.y+k*.8-size/2,b.z);b.ring.setLocalScale(size,size,1);b.ring.setEulerAngles(0,yaw,0);
      const ss=(b.big?1.8:1.1)*(1-k*.4);b.spark.setPosition(b.x,b.y+.5+k*1.3-ss/2,b.z);b.spark.setLocalScale(ss,ss,1);b.spark.setEulerAngles(0,yaw,k*160);
      if(fade<.08){b.life=0;}
    }
  }
  // Radarn (256 px, 3,2 px per meter): närliggande paket som prickar, bonuspaket större och guldfärgade, tomten som en röd ring.
  const radarBuf=[];
  function radar(c,point,p){
    const r=hunt.run;if(!r||!(r.phase==='collect'||r.phase==='deliver'||r.phase==='free'))return;
    hunt.nearby(p,46,60,radarBuf);
    for(const k of radarBuf){
      const [x,y]=point(k.x,k.z);c.beginPath();c.arc(x,y,k.kind==='bonus'?5.5:3.2,0,6.283);
      c.fillStyle=k.kind==='bonus'?'#ffd36b':'#ff6b5e';c.fill();
      if(k.kind==='bonus'){c.strokeStyle='#ffffff';c.lineWidth=2;c.stroke();}
    }
    if(r.tomte&&(r.phase==='deliver'||r.phase==='collect')){
      const [x,y]=point(r.tomte.x,r.tomte.z),deliver=r.phase==='deliver';
      c.beginPath();c.arc(x,y,deliver?9:6,0,6.283);c.fillStyle=deliver?'#d9473fcc':'#d9473f77';c.fill();c.strokeStyle='#fff6d6';c.lineWidth=deliver?3:2;c.stroke();
    }
  }
  function clear(){for(const s of pool){s.e.enabled=false;s.id='';}for(const b of beams)b.enabled=false;tomte.e.enabled=tomte.bubble.enabled=tomte.ring.enabled=tomte.pillar.enabled=false;for(const b of bursts){b.life=0;b.ring.enabled=b.spark.enabled=false;}shown=0;beamsOn=0;}
  return {update,burst,clear,radar,tomteEntity:tomte.e,snapshot:()=>({shown,beams:beamsOn,tomte:tomte.e.enabled,bubble:tomte.mood,ring:tomte.ring.enabled,pool:POOL,bursts:bursts.filter(b=>b.life>0).length}),drawCalls:()=>shown+beamsOn+(tomte.e.enabled?2:0)+(tomte.ring.enabled?2:0)+bursts.filter(b=>b.life>0).length*2};
}
