// Julklappsjakten: vyn för paketjakten. Ett fast antal renderobjekt återanvänds för de närmaste paketen (inga nya objekt under spelet),
// bonuspaketen får en ljusstråle, tomten viftar och visar var paketen ska lämnas, och varje plockat paket ger en liten ljuspuff.
// JulRushen använder samma paketkort och samma ljusstrålar: guldpaketen (som bär en julgåva) får en gyllene stråle, och nästa paket längs banan
// markeras med en hög grön stråle och en ring på marken (grundspelets cyanfyr döljs i julbygget, se journey-view.js).
// Vägledningen (xmas-guide.mjs) ritas här: en grön stråle och en ring vid pilens mål (nästa paket, eller tomten efter målet) och ett rött julband med pilar
// som rullas ut på marken längs gångvägen dit. Bandet ligger fast i världen: man går fram över det och nya bitar rullas ut längst bort.
// Ingen fysik, inga ljus: allt är platta bildkort och genomskinliga cylindrar.
import {drawBeam,drawRibbon,drawGiftIcons,drawGhostHelper,GIFT_ICON_COLS,GIFT_ICON_ROWS,GIFT_ICON_CELL} from './xmas-art.js?v=2.21.1-xmas.3';
import {GIFT_KINDS,GIFTS} from './xmas-rush.mjs?v=2.21.1-xmas.3';
import {GUIDE} from './xmas-guide.mjs?v=2.21.1-xmas.3';
export function createXmasView(pc,host,draw,sprites,hunt,rush=null){
  const {labelTex,texture}=draw,root=draw.root;
  const POOL=26,SHOW=54,SHOW_RUSH=96,BEAMS=4,BADGES=6,BURSTS=6,RIBBON=GUIDE.ribbon.max,RIBBON_PHASES=4;
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
  const tomte={e:sprites.spriteEntity('Tomten',sprites.tomteMaterials[1][0],2.2,3.3,{enabled:false}),bubble:sprites.spriteEntity('Tomtens bubbla',bubbleMat.help,3.3,1.03,{enabled:false}),ring:cyl('Tomtens ring',ringMat),mood:'help'};
  // JulRushens mål: en hög grön stråle (bildkort som vänder sig mot spelaren) och en ring på marken vid nästa paket.
  const goalRingMat=glowMat(.3,.9,.5,.42);
  const goal={beam:sprites.spriteEntity('Målstråle',beamGreen,3.2,70,{enabled:false}),ring:cyl('Målring',goalRingMat)};
  // Julbandet: platta bitar på marken (en delad liggande fyrkant, fyra material med olika förskjutning av pilarna så att de rör sig mot målet, utan att något material
  // behöver uppdateras varje bildruta). −z är framåt och v=1 är framkanten, så pilarna i bilden (uppåt) pekar mot målet.
  const flat=new pc.Mesh(host.app.graphicsDevice);
  flat.setPositions([-.5,0,.5,.5,0,.5,.5,0,-.5,-.5,0,-.5]);flat.setNormals([0,1,0,0,1,0,0,1,0,0,1,0]);flat.setUvs(0,[0,0,1,0,1,1,0,1]);flat.setIndices([0,1,2,0,2,3]);flat.update(pc.PRIMITIVE_TRIANGLES);
  const ribTex=texture((c,w,h)=>drawRibbon(c,w,h),64,128);ribTex.anisotropy=4;
  const ribMats=Array.from({length:RIBBON_PHASES},(_,k)=>sprites.spriteMaterial(ribTex,{offset:[0,-k/(2*RIBBON_PHASES)],alphaTest:.02}));
  const ribbon=Array.from({length:RIBBON},(_,i)=>{const e=new pc.Entity('Julband '+i);e.addComponent('render',{meshInstances:[new pc.MeshInstance(flat,ribMats[0])]});e.enabled=false;root.addChild(e);return e;});
  let ribbonOn=0,ribbonPhase=-1;
  // Gåvobrickorna (JulRushen): en bricka med gåvans symbol över varje guldpaket (banans och sidopaketen), och Tomtespöket som flyger fram till paketen.
  const iconTex=texture((c,w,h)=>drawGiftIcons(c,GIFT_KINDS,GIFT_KINDS.map(k=>GIFTS[k].color)),GIFT_ICON_COLS*GIFT_ICON_CELL,GIFT_ICON_ROWS*GIFT_ICON_CELL);
  const iconMats=GIFT_KINDS.map((_,i)=>sprites.spriteMaterial(iconTex,{tiling:[1/GIFT_ICON_COLS,1/GIFT_ICON_ROWS],offset:[(i%GIFT_ICON_COLS)/GIFT_ICON_COLS,1-(Math.floor(i/GIFT_ICON_COLS)+1)/GIFT_ICON_ROWS],alphaTest:.1}));
  const badges=Array.from({length:BADGES},(_,i)=>({e:sprites.spriteEntity('Gåvobricka '+i,iconMats[0],1,1,{enabled:false}),kind:''}));
  const ghost=sprites.spriteEntity('Tomtespöket',sprites.spriteMaterial(texture((c,w,h)=>drawGhostHelper(c,w,h),160,200),{alphaTest:.05}),1.7,2.1,{enabled:false});
  const buf=[],bonusBuf=[],badgeBuf=[],clamp01=v=>v<0?0:v>1?1:v;
  let shown=0,beamsOn=0,badgesOn=0,lite=false,goalOn=false,guide=null;

  function burst(x,z,{big=false,y=.6}={}){
    if(lite&&!big)return;
    const b=bursts[burstIndex++%BURSTS];Object.assign(b,{life:b.max,x,y,z,big});
  }
  function update(p,now,dt){
    const rr=!!rush&&rush.active,r=rr?null:hunt.run,live=rr||(!!r&&(r.phase==='collect'||r.phase==='deliver'||r.phase==='free'));
    const gOn=!rr&&live&&!!guide&&guide.on,rOn=live&&!!guide&&guide.on; // gOn: paketjaktens mål (stråle och ring); rOn: julbandet (paketjakten och JulRushen)
    // Målet för strålen: JulRushens nästa paket, eller pilens mål i paketjakten (paketet, eller tomten efter målet). Bara paket får en ring och blir större.
    const goalPk=rr&&rush.running?rush.targetPackage():gOn&&guide.kind!=='tomte'?{id:guide.id,x:guide.targetX,z:guide.targetZ}:null;
    const beamAt=goalPk||(gOn?{id:guide.id,x:guide.targetX,z:guide.targetZ}:null);
    // paket
    shown=0;
    if(live){
      (rr?rush:hunt).nearby(p,rr?(lite?64:SHOW_RUSH):(lite?40:SHOW),lite?16:POOL,buf);
      for(let i=0;i<buf.length;i++){
        const k=buf[i],s=pool[i],e=s.e;
        if(s.id!==k.id){
          s.id=k.id;const v=sprites.packageVariant(k);
          if(s.variant!==v){s.variant=v;sprites.setMaterial(e,sprites.packageMaterials[v]);}
          s.kind=k.kind;
        }
        // Nästa paket längs JulRushens bana är större och guppar mer, så att det syns vilket man är på väg mot.
        const big=k.kind==='bonus',isGoal=!!goalPk&&k.id===goalPk.id,sc=(big?2.1:1.35)*(isGoal?1.3:1);e.setLocalScale(sc,sc,1);
        const ph=(k.cluster*1.7+i)%6.28,bob=Math.sin(now/(isGoal?300:480)+ph)*(isGoal?.18:.1);
        e.setPosition(k.vx??k.x,(k.y||0)+.18+bob+(big?.15:0),k.vz??k.z);e.setEulerAngles(0,sprites.yawToward(k.x,k.z,p),Math.sin(now/700+ph)*5);
        if(!e.enabled)e.enabled=true;shown++;
      }
    }
    for(let i=shown;i<POOL;i++){const s=pool[i];if(s.e.enabled){s.e.enabled=false;s.id='';}}
    // bonusstrålar
    beamsOn=0;
    if(live){
      let n=0;
      if(rr)n=rush.giftPackages(p,95,BEAMS,bonusBuf).length;
      else for(const k of r.packages){if(k.collected||k.kind!=='bonus')continue;const d=Math.hypot(k.x-p.x,k.z-p.z);if(d<95&&n<BEAMS)bonusBuf[n++]=k;}
      for(let i=0;i<n;i++){const k=bonusBuf[i],b=beams[i],pulse=1+Math.sin(now/260+i)*.18;b.enabled=true;b.setPosition(k.x,0,k.z);b.setLocalScale(2.5*pulse,22,1);b.setEulerAngles(0,sprites.yawToward(k.x,k.z,p),0);beamsOn++;}
    }
    for(let i=beamsOn;i<BEAMS;i++)if(beams[i].enabled)beams[i].enabled=false;
    // gåvobrickor över guldpaketen (de närmaste sex inom 95 m); en bricka växer med avståndet så att den syns på långt håll
    badgesOn=0;
    if(rr){
      const n=rush.giftPackages(p,95,lite?3:BADGES,badgeBuf).length;
      for(let i=0;i<n;i++){
        const k=badgeBuf[i],b=badges[i],d=k._d,ki=GIFT_KINDS.indexOf(k.gift);if(ki<0)continue;
        if(b.kind!==k.gift){b.kind=k.gift;sprites.setMaterial(b.e,iconMats[ki]);}
        const sz=Math.min(1.9,.95+d*.014),bob=Math.sin(now/340+i*1.7)*.12;
        b.e.setLocalScale(sz,sz,1);b.e.setPosition(k.vx??k.x,2.55+bob,k.vz??k.z);b.e.setEulerAngles(0,sprites.yawToward(k.x,k.z,p),0);if(!b.e.enabled)b.e.enabled=true;badgesOn++;
      }
      for(let i=n;i<BADGES;i++)if(badges[i].e.enabled)badges[i].e.enabled=false;
    }else for(const b of badges)if(b.e.enabled)b.e.enabled=false;
    // Tomtespöket: flyger mellan paketen medan gåvan varar
    const sp=rr?rush.spirit:null;
    if(sp&&sp.active){
      const flying=!!sp.target,bob=Math.sin(now/230)*.18;
      ghost.enabled=true;ghost.setPosition(sp.x,1.15+bob+(flying?.15:0),sp.z);ghost.setEulerAngles(0,sprites.yawToward(sp.x,sp.z,p),Math.sin(now/260)*7+(flying?-9:0));
      const sq=flying?1.08:1;ghost.setLocalScale(1.7*sq,2.1/sq,1);
    }else if(ghost.enabled)ghost.enabled=false;
    // Målstrålen: smal på nära håll (så att den inte täcker paketet) och bredare med avståndet, så att den syns även 300 m bort
    goalOn=!!beamAt;
    if(goalOn){
      const d=Math.hypot(beamAt.x-p.x,beamAt.z-p.z),pulse=1+Math.sin(now/180)*.14,w=Math.max(1.1,Math.min(8,d*.03))*(rr?1:.2+.8*clamp01((d-3)/7)); // i paketjakten smalnar strålen av när paketet är nära, så att den inte färgar paketet grönt
      goal.beam.enabled=true;goal.ring.enabled=!!goalPk;
      goal.beam.setPosition(beamAt.x,0,beamAt.z);goal.beam.setLocalScale(w*pulse,70,1);goal.beam.setEulerAngles(0,sprites.yawToward(beamAt.x,beamAt.z,p),0);
      if(goalPk){goal.ring.setPosition(goalPk.x,.08,goalPk.z);goal.ring.setLocalScale(5.2*pulse,.04,5.2*pulse);}
    }else if(goal.beam.enabled){goal.beam.enabled=goal.ring.enabled=false;}
    // julbandet: rullas ut längs gångvägen till målet; bitarna tonar in vid spelaren och längst bort (smalare), pilarna rör sig mot målet
    ribbonOn=0;
    if(rOn){
      const n=guide.segCount,ph=Math.floor(now/110)%RIBBON_PHASES,cfgW=GUIDE.ribbon.width;
      for(let i=0;i<n;i++){
        const m=guide.segs[i],e=ribbon[i],d=Math.hypot(m.x-p.x,m.z-p.z),k=clamp01((d-3)/4)*clamp01((GUIDE.ribbon.lead+GUIDE.ribbon.maxLen+6-d)/14)*.55+.45;
        e.setPosition(m.x,.1,m.z);e.setEulerAngles(0,m.yaw,0);e.setLocalScale(cfgW*k,1,m.len*1.04);
        if(ph!==ribbonPhase||!e.enabled)e.render.meshInstances[0].material=ribMats[ph];
        if(!e.enabled)e.enabled=true;ribbonOn++;
      }
      ribbonPhase=ph;
      for(let i=n;i<RIBBON;i++)if(ribbon[i].enabled)ribbon[i].enabled=false;
    }else for(let i=0;i<RIBBON;i++)if(ribbon[i].enabled)ribbon[i].enabled=false;
    // tomten
    const t=!rr&&live&&r.tomte?r.tomte:(!rr&&r&&r.phase==='done'&&r.tomte?r.tomte:null);
    if(t){
      const d=Math.hypot(t.x-p.x,t.z-p.z),near=d<75,deliver=r.phase==='deliver',done=r.phase==='done';
      tomte.e.enabled=near;tomte.bubble.enabled=near;
      if(near){
        const frame=Math.floor(now/(deliver?330:650))%2;sprites.setMaterial(tomte.e,sprites.tomteMaterials[1][frame]);
        tomte.e.setPosition(t.x,0,t.z);tomte.e.setEulerAngles(0,sprites.yawToward(t.x,t.z,p),Math.sin(now/500)*2);
        const mood=done?'thanks':deliver?'deliver':'help';if(tomte.mood!==mood){tomte.mood=mood;sprites.setMaterial(tomte.bubble,bubbleMat[mood]);}
        tomte.bubble.setPosition(t.x,3.45+Math.sin(now/420)*.07,t.z);tomte.bubble.setEulerAngles(0,sprites.yawToward(t.x,t.z,p),0);
      }
      const ringOn=deliver&&d<120;tomte.ring.enabled=ringOn;
      if(ringOn){const pulse=1+Math.sin(now/230)*.08;tomte.ring.setPosition(t.x,.07,t.z);tomte.ring.setLocalScale(t.radius*2*pulse,.05,t.radius*2*pulse);}
    }else{tomte.e.enabled=tomte.bubble.enabled=tomte.ring.enabled=false;}
    // puffar
    for(const b of bursts){
      if(b.life<=0){if(b.ring.enabled){b.ring.enabled=false;b.spark.enabled=false;}continue;}
      b.life=Math.max(0,b.life-dt);const k=1-b.life/b.max,fade=1-k;
      // Ett paket tas på 1–2 m håll. Då fyller en 2–4 m stor ljusfläck halva bilden (på en stående telefon syns bara ~38° i sidled), så storleken
      // begränsas efter avståndet till kameran: nära ger små gnistor, längre bort den fulla puffen.
      const d=Math.hypot(b.x-p.x,b.y-(p.y??1.7),b.z-p.z),cap=Math.max(.5,d*(b.big?.52:.36));
      const size=Math.min((b.big?3.4:2.0)*(.4+k*.9),cap);
      b.ring.enabled=b.spark.enabled=true;
      const yaw=sprites.yawToward(b.x,b.z,p);
      b.ring.setPosition(b.x,b.y+k*.8-size/2,b.z);b.ring.setLocalScale(size,size,1);b.ring.setEulerAngles(0,yaw,0);
      const ss=Math.min((b.big?1.8:1.1)*(1-k*.4),Math.max(.35,cap*.7));b.spark.setPosition(b.x,b.y+.5+k*1.3-ss/2,b.z);b.spark.setLocalScale(ss,ss,1);b.spark.setEulerAngles(0,yaw,k*160);
      if(fade<.08){b.life=0;}
    }
  }
  // Radarn (256 px, 3,2 px per meter): närliggande paket som prickar, bonuspaket större och guldfärgade, tomten som en röd ring.
  const radarBuf=[];
  function radar(c,point,p){
    if(rush&&rush.active)return radarRush(c,point,p);
    const r=hunt.run;if(!r||!(r.phase==='collect'||r.phase==='deliver'||r.phase==='free'))return;
    hunt.nearby(p,46,60,radarBuf);
    for(const k of radarBuf){
      const [x,y]=point(k.x,k.z);c.beginPath();c.arc(x,y,k.kind==='bonus'?5.5:3.2,0,6.283);
      c.fillStyle=k.kind==='bonus'?'#ffd36b':'#ff6b5e';c.fill();
      if(k.kind==='bonus'){c.strokeStyle='#ffffff';c.lineWidth=2;c.stroke();}
    }
    // pilens mål som en grön ring (på radarns kant, åt rätt håll, när det ligger utanför)
    if(guide&&guide.on&&guide.kind!=='tomte'){
      let [x,y]=point(guide.targetX,guide.targetZ);const dx=x-128,dy=y-128,d=Math.hypot(dx,dy),lim=112;
      if(d>lim){x=128+dx/d*lim;y=128+dy/d*lim;}
      c.beginPath();c.arc(x,y,d>lim?6:8,0,6.283);c.strokeStyle='#4cc784';c.lineWidth=3;c.stroke();
    }
    if(r.tomte&&(r.phase==='deliver'||r.phase==='collect')){
      const [x,y]=point(r.tomte.x,r.tomte.z),deliver=r.phase==='deliver';
      c.beginPath();c.arc(x,y,deliver?9:6,0,6.283);c.fillStyle=deliver?'#d9473fcc':'#d9473f77';c.fill();c.strokeStyle='#fff6d6';c.lineWidth=deliver?3:2;c.stroke();
    }
  }
  // JulRushens radar: paketen som prickar och nästa paket som en grön ring. Ligger det utanför radarn visas ringen på kanten, åt rätt håll.
  function radarRush(c,point,p){
    rush.nearby(p,46,60,radarBuf);
    for(const k of radarBuf){
      const [x,y]=point(k.x,k.z);c.beginPath();c.arc(x,y,k.kind==='bonus'?5.5:3.2,0,6.283);
      c.fillStyle=k.kind==='bonus'?'#ffd36b':'#ff6b5e';c.fill();
      if(k.kind==='bonus'){c.strokeStyle='#ffffff';c.lineWidth=2;c.stroke();}
    }
    const tg=rush.running?rush.target(p):null;if(!tg)return;
    let [x,y]=point(tg.x,tg.z);const dx=x-128,dy=y-128,d=Math.hypot(dx,dy),lim=112;
    if(d>lim){x=128+dx/d*lim;y=128+dy/d*lim;}
    c.beginPath();c.arc(x,y,d>lim?6:8,0,6.283);c.fillStyle='#4cc784cc';c.fill();c.strokeStyle='#ffffff';c.lineWidth=3;c.stroke();
  }
  function clear(){for(const s of pool){s.e.enabled=false;s.id='';}for(const e of ribbon)e.enabled=false;ribbonOn=0;for(const b of badges)b.e.enabled=false;badgesOn=0;ghost.enabled=false;for(const b of beams)b.enabled=false;goal.beam.enabled=goal.ring.enabled=false;goalOn=false;tomte.e.enabled=tomte.bubble.enabled=tomte.ring.enabled=false;for(const b of bursts){b.life=0;b.ring.enabled=b.spark.enabled=false;}shown=0;beamsOn=0;}
  return {update,burst,clear,radar,setGuide:g=>{guide=g||null;},setLite:v=>{lite=!!v;},get lite(){return lite;},tomteEntity:tomte.e,snapshot:()=>({shown,beams:beamsOn,goal:goalOn,ribbon:ribbonOn,badges:badgesOn,ghost:ghost.enabled,tomte:tomte.e.enabled,bubble:tomte.mood,ring:tomte.ring.enabled,pool:POOL,bursts:bursts.filter(b=>b.life>0).length}),drawCalls:()=>shown+beamsOn+ribbonOn+badgesOn+(ghost.enabled?1:0)+(goalOn?2:0)+(tomte.e.enabled?2:0)+(tomte.ring.enabled?1:0)+bursts.filter(b=>b.life>0).length*2};
}
