const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function nearestByRoute(nav,from,places){
  let best=null,bestDistance=Infinity;
  for(const place of places){const route=nav.path(from,place);if(!route.length)continue;let length=distance(from,route[0]);for(let i=1;i<route.length;i++)length+=distance(route[i-1],route[i]);if(length<bestDistance){best=place;bestDistance=length;}}
  return best||places[0];
}
function appendUnique(path,point){
  if(!point)return;
  const last=path[path.length-1];
  if(!last||distance(last,point)>.2)path.push({x:point.x,z:point.z});
}
// 2.12: the BFS grid route is 4-connected, so open plazas give L-shaped routes and diagonal
// streets give staircases. The arrows then pointed sideways every 3 m. String-pulling keeps only
// the corners the player really has to walk around; every remaining leg is still nav.clear().
export function smoothPath(nav,path){
  if(!Array.isArray(path)||path.length<3)return Array.isArray(path)?path.slice():[];
  const out=[path[0]];let i=0;
  while(i<path.length-1){
    let j=path.length-1;
    // Mall/via points carry a level (y); never pull a string across a level change.
    while(j>i+1&&!(path[i].y===path[j].y&&path.slice(i+1,j).every(q=>q.y===path[i].y)&&nav.clear(path[i],path[j])))j--;
    out.push(path[j]);i=j;
  }
  return out;
}
const DEG=180/Math.PI;
// Evenly spaced floor arrows that start just ahead of the player and point along the route.
export function arrowPlacements(path,player,{spacing=3.5,count=22,lead=2.2}={}){
  if(!Array.isArray(path)||path.length<2)return [];
  // Project the player onto the route so arrows never start behind them.
  let bestSeg=0,bestT=0,bestD=Infinity;
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz||1e-9;
    const t=Math.max(0,Math.min(1,((player.x-a.x)*dx+(player.z-a.z)*dz)/l2)),x=a.x+dx*t,z=a.z+dz*t,d=Math.hypot(player.x-x,player.z-z);
    if(d<bestD-1e-6){bestD=d;bestSeg=i;bestT=t;}
  }
  const out=[];let seg=bestSeg,offset=distance(path[seg-1],path[seg])*bestT+lead;
  while(seg<path.length&&out.length<count){
    const a=path[seg-1],b=path[seg],len=distance(a,b);
    if(offset>len){offset-=len;seg++;continue;}
    const t=len?offset/len:0,ux=(b.x-a.x)/(len||1),uz=(b.z-a.z)/(len||1);
    out.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y??b.y,yaw:Math.atan2(-ux,-uz)*DEG});
    offset+=spacing;
  }
  return out;
}
// First real corner along the route ahead of the player: direction and metres to it.
export function nextTurn(path,player,minAngle=.6){
  if(!Array.isArray(path)||path.length<3)return null;
  let start=1,best=Infinity;
  for(let i=1;i<path.length;i++){const d=distance(player,path[i]);if(d<best){best=d;start=i;}}
  let walked=distance(player,path[start]);
  for(let i=Math.max(1,start);i<path.length-1;i++){
    if(i>start)walked+=distance(path[i-1],path[i]);
    const a=Math.atan2(path[i].x-path[i-1].x,path[i].z-path[i-1].z),b=Math.atan2(path[i+1].x-path[i].x,path[i+1].z-path[i].z);
    const turn=((b-a+Math.PI*3)%(Math.PI*2))-Math.PI;
    if(Math.abs(turn)>=minAngle&&distance(path[i],path[i+1])>2)return {side:turn>0?'VÄNSTER':'HÖGER',distance:Math.round(walked),sharp:Math.abs(turn)>2.2};
  }
  return null;
}
// HUD, floor arrows, radar and compass all consume the same walkable route.
// Explicit via points bridge door/interior segments that sit outside the normal street component.
// One colour per kind of goal, used by floor arrows, radar line and HUD alike.
export const ROUTE_COLORS=Object.freeze({default:'#81e9e3',escape:'#96f3b1',gold:'#ffd35c',golden:'#ffd35c',sun:'#ffe27a',coffee:'#c9b3ff',xmas:'#e0453b'}); // xmas: julgrenens pilar, röda mot snön
export class CityGuidance {
  constructor(nav){this.nav=nav;this.key='';this.path=[];}
  update(p,goal,forward={x:0,z:-1}){
    const via=Array.isArray(goal.via)?goal.via:[];
    const anchor=via[0]||goal;
    const start=this.nav.nearest(p),end=this.nav.nearest(anchor);
    const viaKey=via.map(q=>Math.round(q.x*10)+','+Math.round(q.z*10)).join(';');
    const direct=via.length&&this.nav.clear(p,goal)?1:0;
    const key=start.id+':'+end.id+':'+(goal.id||goal.kind||goal.label)+':'+viaKey+':'+direct;
    if(key!==this.key){
      this.key=key;
      if(goal.kind==='wait')this.path=[];
      else if(via.length){
        if(direct)this.path=[{x:goal.x,z:goal.z}];
        else{
          this.path=[...this.nav.path(p,via[0])];
          for(const q of via)appendUnique(this.path,q);
          appendUnique(this.path,goal);
        }
      }else this.path=this.nav.path(p,goal);
      this.path=smoothPath(this.nav,this.path);
    }
    let distanceLeft=0,previous=p;for(const point of this.path){distanceLeft+=distance(previous,point);previous=point;}
    // Steer at the furthest route corner the player can walk to in a straight line. Corners the
    // player has already reached (closer than 1.2 m) are skipped so the target never sits behind them.
    let next=null;for(let i=0;i<this.path.length;i++){const point=this.path[i];if(distance(p,point)<1.2&&i<this.path.length-1)continue;if(!this.nav.clear(p,point))break;next=point;}
    if(!next)next=this.path.find(q=>distance(p,q)>=1.2)||goal;
    if(this.nav.clear(p,goal)&&(!this.path.length||next===this.path.at(-1)))next=goal;
    const angle=((Math.atan2(next.x-p.x,next.z-p.z)-Math.atan2(forward.x,forward.z)+Math.PI*3)%(Math.PI*2))-Math.PI;
    // Navigation-app wording: what to do now, and where the next corner is.
    const corner=nextTurn(this.path,p);
    const ahead=corner&&corner.distance>6?(corner.sharp?' · SKARPT ':' · ')+corner.side+' OM '+corner.distance+' M':'';
    const turn=goal.kind==='wait'?'VÄNTA PÅ NÄSTA HÄNDELSE':distanceLeft<(goal.radius||2.4)?goal.action||'DU ÄR FRAMME':Math.abs(angle)>2.2?'VÄND DIG OM':angle>.5?'SVÄNG VÄNSTER':angle<-.5?'SVÄNG HÖGER':corner&&corner.distance<=6?'SVÄNG '+corner.side+' NU':'RAKT FRAM'+ahead;
    // Short form for the one-line phone strip: label, distance, then the next corner as an arrow.
    const glyph=corner?(corner.side==='VÄNSTER'?'←':'→'):'';
    const strip=goal.kind==='wait'?goal.label:Math.abs(angle)>2.2&&distanceLeft>=(goal.radius||2.4)?'VÄND DIG OM · '+goal.label:goal.label+' · '+Math.round(distanceLeft)+' M'+(distanceLeft<(goal.radius||2.4)?'':corner?(corner.distance<=6?' · '+glyph+' NU':' · '+glyph+' OM '+corner.distance+' M'):'');
    return {goal,path:this.path,next,angle,distance:Math.round(distanceLeft),turn,strip,corner,color:ROUTE_COLORS[goal.kind]||ROUTE_COLORS.default};
  }
}
