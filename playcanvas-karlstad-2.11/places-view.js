// 2.21: 3D-vyn för interaktiva platser. Återanvänder spelets korthjälpare (card, primitive, material, labelTex, texture).
// Allt är billigt: en statisk mesh för Pressbyråns serviceyta, ett fåtal kort och ringar, och inget alls ritas för en plats
// som spelaren inte är i närheten av eller när spelet inte är i City Explore. Inga bildfiler laddas ner.
import {ComicMesh} from './city-architecture.js?v=2.21.1-xmas.5';
import {drawItemCard,drawMenuBoard} from './place-art.js?v=2.21.1-xmas.5';
import {mallRoom} from './mall-space.mjs?v=2.21.1-xmas.5';

const VIEW_RANGE=95,MARKER_RANGE=62,RING_RANGE=42,FLOOR=5.4;
export function createPlacesView(pc,host,draw,engine){
  const {card,texture,labelTex,primitive,material,root,fanTex}=draw;
  const NONE=[];
  const glow=(hex,opacity,emissive)=>{const m=material(hex);m.opacity=opacity;m.blendType=pc.BLEND_NORMAL;m.depthWrite=false;m.emissive=new pc.Color(...emissive);m.update();return m;};
  const ringMat=glow('#7ff0b4',.5,[.18,.8,.5]),itemRingMat=glow('#ffd56c',.55,[.9,.7,.2]),beamMat=glow('#fff0b0',.26,[.9,.8,.3]);
  const vertexMat=new pc.StandardMaterial();vertexMat.useLighting=false;vertexMat.diffuse.set(0,0,0);vertexMat.emissive.set(1,1,1);vertexMat.emissiveVertexColor=true;vertexMat.update();
  const yawTo=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z)*180/Math.PI;
  const views=[];

  // Pressbyråns fristående serviceyta: en disk med markis, kaffemaskin, bullvisning och tidningsställ. Fasaden rörs inte.
  function buildKiosk(place){
    const k=place.kiosk,r=k.rect,cx=(r.minx+r.maxx)/2,cz=(r.minz+r.maxz)/2,W=r.maxx-r.minx,D=r.maxz-r.minz,s=k.face==='north'?-1:1;
    const m=new ComicMesh(true),P=(u,v)=>[cx+u,cz+s*v];
    const box=(u,y,v,w,h,d,col,shade=col)=>{const [x,z]=P(u,v);m.box(x,y,z,w,h,d,col,shade);};
    box(0,.52,0,W,1.04,D,'#1e4f91','#163a6c');
    box(0,1.09,.02,W+.16,.1,D+.16,'#f7f1e3','#d9d2bc');
    box(0,.62,D/2+.02,W*.9,.16,.05,'#d4262e');box(0,.34,D/2+.02,W*.9,.06,.05,'#f7f1e3');
    // maskiner och varor bakom menytavlan
    box(-W*.37,1.5,-.12,.62,.78,.52,'#2b2f33','#1c1f22');box(-W*.37,1.93,-.12,.68,.1,.58,'#d4262e');box(-W*.37,1.62,.15,.22,.2,.04,'#ffd56c');
    box(W*.36,1.38,-.1,.92,.46,.52,'#cfe7ea','#9fc1c7');for(let i=0;i<4;i++)box(W*.36-.32+i*.21,1.5,.06,.15,.12,.15,'#c98a4b','#8a5530');
    box(W*.36,1.12,-.1,.92,.04,.54,'#f7f1e3');
    // markis i röda och vita ränder, två stolpar framtill
    const stripes=7,sw=(W+.5)/stripes;
    for(let i=0;i<stripes;i++)box(-(W+.5)/2+sw*(i+.5),2.62,.16,sw,.1,D+1.15,i%2?'#f7f1e3':'#d4262e','#9c1b21');
    for(const side of [-1,1])box(side*(W/2+.12),1.33,D/2+.44,.09,2.64,.09,'#394045');
    // lysande kant längs markisen (läsbar på avstånd)
    box(0,2.52,D/2+.7,W+.5,.06,.05,'#ffd56c');
    const ent=m.finish(pc,host.app,'Pressbyrån · serviceyta',vertexMat);
    ent.enabled=false;
    // tavlor: meny och skylt
    const [bx,bz]=P(0,.2),[sx,sz]=P(0,D/2+.62);
    const board=card('Pressbyrån · menytavla',texture((c,w,h)=>drawMenuBoard(c,w,h,place.activity.menu.map(i=>i.art),place.activity.title),768,384),1.86,.93,bx,1.16,bz);
    const sign=card('Pressbyrån · skylt',labelTex(['PRESSBYRÅN','KAFFE · BULLAR · TIDNINGAR'],'#1e4f91','#fff3d0'),3.4,.88,sx,2.82,sz,true);
    board.setEulerAngles(0,s>0?0:180,0);
    board.enabled=sign.enabled=false;
    return {ent,board,sign};
  }

  for(const place of engine.list()){
    const t=place.talk,floor=t.floor||0,v={place,floor,cx:t.x,cz:t.z,items:[],extras:[]};
    v.marker=card('Uppdrag · '+place.name,labelTex(['UPPDRAG',place.activity.title],'#c7852b','#fff4d0'),3.4,1.06,0,0,0,true);v.marker.enabled=false;
    v.ring=primitive('Uppdrag · samtalsring '+place.id,'cylinder',t.x,floor*FLOOR+.07,t.z,2.7,.03,2.7,ringMat);v.ring.enabled=false;
    v.ringSign=card('Uppdrag · stå här '+place.id,labelTex([place.staff.name.toUpperCase(),'STÅ HÄR · UPPDRAG'],'#1f6e5e','#eafff6'),1.9,.6,t.x,floor*FLOOR+1.55,t.z,true);v.ringSign.enabled=false;
    // Personal som saknar en befintlig figur (staff.clerk saknas) ritas här, så att en ny plats kan läggas till enbart med data.
    if(!place.staff.clerk&&fanTex){v.staffBody=card('Personal · '+place.staff.name,fanTex('clerk','#709fba'),1.5,2.4,place.staff.x,(place.staff.floor||0)*FLOOR,place.staff.z);v.staffBody.enabled=false;}
    if(place.kiosk){v.kiosk=buildKiosk(place);v.anchor={x:(place.kiosk.rect.minx+place.kiosk.rect.maxx)/2,z:(place.kiosk.rect.minz+place.kiosk.rect.maxz)/2};}
    if(place.activity.type==='fetch'){
      for(const it of place.activity.items){
        const tex=texture((c,w,h)=>drawItemCard(c,w,h,it.art,it.name),256,320);
        // Strålen får inte sticka upp genom butikstaket: kort inne i rummet, hög i det öppna atriet.
        const inRoom=!!place.where.roomId&&mallRoom({x:it.x,z:it.z,y:1.68+(it.floor||0)*FLOOR})?.id===place.where.roomId,bh=inRoom?3.8:8;
        const c=card('Uppdrag · '+it.name,tex,1.16,1.45,it.x,0,it.z,true),ring=primitive('Uppdrag · ring '+it.id,'cylinder',it.x,(it.floor||0)*FLOOR+.07,it.z,1.6,.03,1.6,itemRingMat),beam=primitive('Uppdrag · stråle '+it.id,'cylinder',it.x,(it.floor||0)*FLOOR+bh/2,it.z,.3,bh,.3,beamMat);
        c.enabled=ring.enabled=beam.enabled=false;
        v.items.push({id:it.id,floor:it.floor||0,x:it.x,z:it.z,card:c,ring,beam,tex});
      }
      v.deliver=card('Uppdrag · lämna',labelTex([place.activity.deliver.label,'↓ HÄR'],'#1f6e5e','#eafff6'),2.2,.68,t.x,floor*FLOOR+2.5,t.z,true);v.deliver.enabled=false;
      // dukat bord efter avslutet: samma kort, litet, ovanpå disken
      const counter=place.where;
      v.table=place.activity.items.map((it,i)=>{const e=card('Uppdrag · dukat '+it.id,v.items[i].tex,.62,.78,counter.x+(i-1)*.9,1.2+floor*FLOOR,counter.z-.1,true);e.enabled=false;return e;});
      v.tableUntil=0;
    }
    views.push(v);
  }
  let lastP=null,tick=0;
  return {
    // Kallas varje bildruta. Allt avgörs av enkla jämförelser; ingenting skapas.
    update(p,now,active){
      lastP=p;tick++;
      const run=active&&engine.available()?engine.run:null,show=active&&engine.available();
      for(const v of views){
        const place=v.place,anchor=v.anchor||v.place.talk,dist=Math.hypot(p.x-anchor.x,p.z-anchor.z);
        const sameBand=Math.abs((p.y??1.68)-1.68-v.floor*FLOOR)<3.2,near=show&&sameBand&&dist<VIEW_RANGE;
        const mine=run&&run.placeId===place.id;
        if(v.kiosk){v.kiosk.ent.enabled=show&&dist<VIEW_RANGE*1.6;v.kiosk.board.enabled=v.kiosk.sign.enabled=near;if(near)v.kiosk.sign.setEulerAngles(0,0,0);}
        if(v.staffBody){v.staffBody.enabled=near&&dist<60;if(v.staffBody.enabled)v.staffBody.setEulerAngles(0,yawTo(place.staff,p),Math.sin(now/1400)*1.5);}
        v.marker.enabled=near&&!mine&&dist<MARKER_RANGE;
        if(v.marker.enabled){
          const base=v.kiosk?3.95:(place.entrance.floor||0)*FLOOR+4.15,at=v.kiosk?v.anchor:place.entrance,bob=Math.sin(now/420+v.cx)*.1;
          v.marker.setPosition(at.x,base+bob,at.z+(v.kiosk?0:(place.entrance.yaw===180?-.45:.45)));v.marker.setEulerAngles(0,yawTo(at,p),0);
        }
        const ringOn=near&&dist<RING_RANGE&&(!run||mine&&(run.type==='order'||run.phase!=='run'));
        v.ring.enabled=ringOn;v.ringSign.enabled=ringOn&&dist>7&&dist<20&&!mine; // nära platsen visar knappen i HUD:en vad som händer, och skylten skymmer inget
        if(ringOn){const k=1+Math.sin(now/260)*.07;v.ring.setLocalScale(2.7*k,.03,2.7*k);}
        if(v.ringSign.enabled){v.ringSign.setPosition(place.talk.x,v.floor*FLOOR+1.9+Math.sin(now/500)*.05,place.talk.z);v.ringSign.setEulerAngles(0,yawTo(place.talk,p),0);}
        if(v.items.length){
          const live=mine&&run.type==='fetch'?engine.activeItems():NONE;
          for(const it of v.items){
            const on=near&&live.some(i=>i.id===it.id);
            it.card.enabled=it.ring.enabled=it.beam.enabled=on;
            if(!on)continue;
            const y=it.floor*FLOOR,bob=Math.sin(now/380+it.x)*.1,k=1+Math.sin(now/230+it.z)*.1;
            it.card.setPosition(it.x,y+.55+bob,it.z);it.card.setEulerAngles(0,yawTo(it,p),Math.sin(now/520+it.x)*3);
            it.ring.setLocalScale(1.6*k,.03,1.6*k);
          }
          v.deliver.enabled=near&&mine&&run.phase==='deliver'&&dist>5; // på håll; nära disken visar knappen i HUD:en vad som händer
          if(v.deliver.enabled){v.deliver.setPosition(place.talk.x,v.floor*FLOOR+2.45+Math.sin(now/400)*.08,place.talk.z);v.deliver.setEulerAngles(0,yawTo(place.talk,p),0);}
          const celebrating=v.tableUntil>now&&near;
          v.table.forEach((e,i)=>{e.enabled=celebrating;if(celebrating){e.setPosition(place.where.x+(i-1)*.9,v.floor*FLOOR+1.55+Math.abs(Math.sin(now/180+i))*.12,place.where.z-.1);e.setEulerAngles(0,yawTo(place.where,p),0);}});
        }
      }
    },
    celebrate(placeId,now){const v=views.find(x=>x.place.id===placeId);if(v?.table)v.tableUntil=now+7000;},
    // För tester och felsökning: vad som just nu är tänt.
    snapshot(){return views.map(v=>({id:v.place.id,marker:v.marker.enabled,ring:v.ring.enabled,items:v.items.filter(i=>i.card.enabled).map(i=>i.id),deliver:!!v.deliver?.enabled,kiosk:!!v.kiosk?.ent.enabled,board:!!v.kiosk?.board.enabled}));},
    drawCalls(){return views.reduce((n,v)=>n+(v.kiosk?1:0),0);}
  };
}
