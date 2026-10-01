// Ground passages follow OSM entrances / indoor paths. The atrium and upper gallery
// are a compact, playable interpretation of the photographed two-storey interior.
export const MALL_SPACE=Object.freeze({x:-128,z:104,upper:5.4,minX:-155,maxX:-99,minZ:83,maxZ:125});
export const MALL_ENTRANCES=Object.freeze([
  {id:'north',name:'Tingvallagatan',x:-117.15,z:36,yaw:180,osm:106078938},
  {id:'east',name:'Västra Torggatan',x:-73,z:112.86,yaw:90,osm:107041955},
  {id:'south',name:'Drottninggatan',x:-121.43,z:162,yaw:0,osm:109895687},
  {id:'west',name:'Järnvägsgatan',x:-198,z:102.67,yaw:-90,osm:113506286}
]);
export const MALL_CORRIDORS=Object.freeze([
  {minx:-121,maxx:-113,minz:32,maxz:86},
  {minx:-102,maxx:-69,minz:108.86,maxz:116.86},
  {minx:-125.43,maxx:-117.43,minz:122,maxz:168},
  {minx:-204,maxx:-152,minz:98.67,maxz:106.67}
]);
export const MALL_BUILDING_IDS=new Set([234271401,...MALL_ENTRANCES.map(p=>p.osm),127873579]);
export const ESCALATORS=Object.freeze([
  {id:'up',x:-140,minx:-141.3,maxx:-138.7,minz:95,maxz:113,direction:-1},
  {id:'down',x:-135,minx:-136.3,maxx:-133.7,minz:95,maxz:113,direction:1}
]);
// Verified tenants and floors; individual room footprints are a playable interpretation.
export const MALL_ROOMS=Object.freeze([
  {id:'coop',name:'COOP CITY',floor:0,minx:-165,maxx:-154.2,minz:83.8,maxz:92.2,door:{x:-154.5,z:88,yaw:90},counter:{minx:-162.5,maxx:-161.2,minz:86,maxz:90},clerk:{x:-163.2,z:88},item:{x:-158,z:90.5},color:'#498653'},
  {id:'cervera',name:'CERVERA',floor:0,minx:-149,maxx:-139,minz:124.2,maxz:134.5,door:{x:-144,z:124.5,yaw:180},counter:{minx:-146,maxx:-142,minz:131,maxz:132.1},clerk:{x:-144,z:133},item:{x:-147.3,z:129},color:'#674047'},
  {id:'clas',name:'CLAS OHLSON',floor:1,minx:-144.5,maxx:-133.5,minz:72.5,maxz:83.8,door:{x:-139,z:83.5,yaw:0},counter:{minx:-141,maxx:-137,minz:75.2,maxz:76.4},clerk:{x:-139,z:74.2},item:{x:-142.7,z:79.5},color:'#326b91'}
]);
export function mallRoom(p){return MALL_ROOMS.find(r=>inside(p.x,p.z,r)&&Math.abs((p.y??1.68)-1.68-r.floor*5.4)<2);}
export const MALL_CACHE=Object.freeze({x:-106,z:91,y:5.4,id:'mall-upper',name:'Fikaförrådet på plan 1'});
const inside=(x,z,b,margin=0)=>x>b.minx+margin&&x<b.maxx-margin&&z>b.minz+margin&&z<b.maxz-margin;
const atrium={minx:-155,maxx:-99,minz:83,maxz:125};
const voidBox={minx:-142.6,maxx:-113,minz:96,maxz:112};
const columns=[[-148,88],[-148,120],[-107,88],[-107,120]];
const tables=[[-127,104],[-116,103],[-119,112]];
const furniture=(x,z,upper)=>MALL_ROOMS.some(r=>r.floor===Number(upper)&&inside(x,z,r.counter,-.45))||columns.some(([cx,cz])=>Math.abs(x-cx)<.83&&Math.abs(z-cz)<.83)||(!upper&&tables.some(([cx,cz])=>Math.abs(x-cx)<2.4&&Math.abs(z-cz)<1.4));
export function mallNear(x,z){return x>-205&&x<-68&&z>31&&z<169;}
export function mallInside(p){return !!mallRoom(p)||inside(p.x,p.z,atrium)||MALL_CORRIDORS.some(b=>inside(p.x,p.z,b,.1));}
export function mallPassage(x,z,margin=.45,upper=false){return MALL_ROOMS.some(r=>r.floor===Number(upper)&&inside(x,z,r,margin))|| inside(x,z,atrium,margin)||MALL_CORRIDORS.some(b=>inside(x,z,b,margin));}
export function escalatorAt(x,z){return ESCALATORS.find(b=>inside(x,z,b,.1));}
const rampHeight=z=>Math.max(0,Math.min(5.4,(113-z)/18*5.4));
export function mallWalkable(x,z,upper=false){
  if(furniture(x,z,upper))return false;
  if(!upper)return mallPassage(x,z);
  if(MALL_ROOMS.some(r=>r.floor===1&&inside(x,z,r,.5)))return true;
  if(!inside(x,z,atrium,.5))return false;
  return !inside(x,z,voidBox,-.38)||!!escalatorAt(x,z);
}
// Street navigation stays on the ground; zombies cannot walk through the stair wedges.
export function mallGroundBlocked(x,z){return furniture(x,z,false)||ESCALATORS.some(b=>inside(x,z,{...b,minz:96,maxz:112},-.55));}
export function splitMallWall(b,cuts=MALL_CORRIDORS){
  let pieces=[{minx:b.minx,maxx:b.maxx,minz:b.minz,maxz:b.maxz}],openings=[];
  for(const cut of cuts){
    const next=[];
    for(const p of pieces){
      const x1=Math.max(p.minx,cut.minx),x2=Math.min(p.maxx,cut.maxx),z1=Math.max(p.minz,cut.minz),z2=Math.min(p.maxz,cut.maxz);
      if(x2<=x1||z2<=z1){next.push(p);continue;}
      openings.push({minx:x1,maxx:x2,minz:z1,maxz:z2});
      for(const q of [{...p,maxx:x1},{...p,minx:x2},{minx:x1,maxx:x2,minz:p.minz,maxz:z1},{minx:x1,maxx:x2,minz:z2,maxz:p.maxz}])if(q.maxx-q.minx>.01&&q.maxz-q.minz>.01)next.push(q);
    }
    pieces=next;
  }
  return {pieces,openings};
}
export class MallWalk {
  constructor(){this.reset();}
  reset(){this.level=0;this.height=0;this.riding=null;}
  move(p,dx,dz,dt,blocked){
    const oldHeight=this.height;
    if(!mallNear(p.x,p.z)){this.reset();return null;}
    let x=p.x,z=p.z;
    // Split only indoor movement. Street speed and input integration are unchanged.
    const belt=escalatorAt(x,z);if(belt){dz+=belt.direction*1.15*dt;this.riding=belt.id;}else this.riding=null;
    const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.35));
    const allow=(nx,nz)=>{
      const ramp=escalatorAt(nx,nz),h=ramp?rampHeight(nz):this.level*5.4;
      if(this.level&&!mallWalkable(nx,nz,true))return false;
      if(mallPassage(nx,nz,.45,!!this.level)){
        if(!mallWalkable(nx,nz,!!this.level))return false;
        // Railings prevent stepping sideways into or off the middle of a ramp.
        if(Math.abs(h-this.height)>.35)return false;
        return true;
      }
      return !this.level&&!blocked(nx,nz);
    };
    for(let i=0;i<count;i++){
      if(allow(x+dx/count,z))x+=dx/count;
      if(allow(x,z+dz/count))z+=dz/count;
      const ramp=escalatorAt(x,z);
      if(ramp){this.height=rampHeight(z);if(this.height>5.08)this.level=1;else if(this.height<.32)this.level=0;}
      else this.height=this.level*5.4;
    }
    return {x,z,y:p.y+this.height-oldHeight,floor:this.height};
  }
  snapshot(){return {level:this.level,height:this.height,riding:this.riding};}
}
// Guidance to the upper cache deliberately stops at the accessible end of the ramp.
export function mallGoal(p,found=false){
  if(!mallInside(p))return {...MALL_ENTRANCES[0],id:'place-mitticity',kind:'landmark',label:'MITT I CITY · ENTRÉ',radius:4};
  if(found)return {...MALL_ENTRANCES[0],id:'mall-exit',kind:'landmark',label:'UTGÅNG · TINGVALLAGATAN',radius:3};
  if((p.y??1.68)<6.6)return {x:-140,z:114.6,id:'mall-up',kind:'landmark',label:'RULLTRAPPA UPP · PLAN 1',radius:1.3,action:'KLIV PÅ · TRAPPAN BÄR DIG UPP'};
  return {...MALL_CACHE,id:'mall-cache',kind:'landmark',label:'FIKAFÖRRÅDET · PLAN 1',radius:1.7};
}
