import {mallInside,mallWalkable,escalatorAt,MALL_CACHE,MALL_CORRIDORS,MALL_ROOMS} from './mall-space.mjs?v=2.11.24';
import {CityNavigation} from './city-missions.mjs?v=2.11.24';
import {CityGuidance} from './city-guidance.mjs?v=2.11.24';
export function createMallGuidance(streetGuide){
  const nav=new CityNavigation((x,z)=>!mallWalkable(x,z,true)||!!escalatorAt(x,z),{minX:-165,maxX:-99,minZ:72,maxZ:135},1);
  const guide=new CityGuidance(nav);
  return {update(p,goal,f,walk={height:0}){
    if(!mallInside(p))return streetGuide.update(p,goal,f);
    const ramp=escalatorAt(p.x,p.z);
    if(ramp&&walk.height>.12&&walk.height<5.25){
      const up=ramp.id==='up',end=up?94:114.6,next={x:ramp.x,z:end},path=[];
      for(let z=p.z;up?z>=end:z<=end;z+=up?-1.5:1.5)path.push({x:ramp.x,z,y:Math.max(0,Math.min(5.4,(113-z)*.3))});
      const angle=((Math.atan2(next.x-p.x,next.z-p.z)-Math.atan2(f.x,f.z)+Math.PI*3)%(Math.PI*2))-Math.PI;
      return {goal:{...next,kind:'landmark',label:up?'RULLTRAPPA · UPP TILL PLAN 1':'RULLTRAPPA · NED TILL PLAN 0',radius:1},path,next,angle,distance:Math.round(Math.abs(end-p.z)),turn:'TRAPPAN BÄR DIG · FORTSÄTT FRAMÅT',color:'#81e9e3'};
    }
    if(walk.height>4.8){
      const target=(goal.id==='mall-cache'||goal.y===5.4)?goal:{x:-135,z:93.5,id:'mall-down',kind:'landmark',label:'RULLTRAPPA NED · PLAN 0',radius:1.5,action:'KLIV PÅ · NED TILL GATUPLAN'};
      const g=guide.update(p,target,f);return {...g,path:g.path.map(q=>({...q,y:5.4})),goal:{...g.goal,y:5.4}};
    }
    return streetGuide.update(p,goal,f);
  }};
}
export function drawMallPlan(c,point,scale,level=0,found=false){
  c.save();c.fillStyle='#e1d8ba';
  const rect=(a,b,d,e)=>{const [x,z]=point(a,b),[ex,ez]=point(d,e);c.fillRect(x,z,ex-x,ez-z);};
  rect(-155,83,-99,125);for(const r of MALL_ROOMS)if(r.floor===level)rect(r.minx,r.minz,r.maxx,r.maxz);for(const b of MALL_CORRIDORS)rect(b.minx,b.minz,b.maxx,b.maxz);
  if(level){c.fillStyle='#4c7166';rect(-142.6,96,-113,112);}
  c.fillStyle='#457e84';rect(-141.3,95,-138.7,113);rect(-136.3,95,-133.7,113);
  c.fillStyle='#273e42';c.font='bold '+Math.max(8,Math.min(13,scale*2))+'px sans-serif';c.textAlign='center';
  if(scale>2){for(const [x,z,s] of [[-140,117,'↑ 1'],[-135,92,'↓ 0'],[-127,103,'ATRIUM']])c.fillText(s,...point(x,z));}
  if(!found&&level){const [x,z]=point(MALL_CACHE.x,MALL_CACHE.z);c.fillStyle='#e9b548';c.beginPath();c.arc(x,z,4,0,Math.PI*2);c.fill();}
  c.restore();
}
