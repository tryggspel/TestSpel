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
// HUD, floor arrows, radar and compass all consume the same walkable route.
// Explicit via points bridge door/interior segments that sit outside the normal street component.
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
    }
    let distanceLeft=0,previous=p;for(const point of this.path){distanceLeft+=distance(previous,point);previous=point;}
    let next=goal;for(let i=0;i<this.path.length;i++){const point=this.path[i];if(distance(p,point)>12||!this.nav.clear(p,point))break;next=point;}
    if(this.path.length>1&&next===goal&&!this.nav.clear(p,goal))next=this.path[1];
    const angle=((Math.atan2(next.x-p.x,next.z-p.z)-Math.atan2(forward.x,forward.z)+Math.PI*3)%(Math.PI*2))-Math.PI;
    const turn=goal.kind==='wait'?'VÄNTA PÅ NÄSTA HÄNDELSE':distanceLeft<(goal.radius||2.4)?goal.action||'DU ÄR FRAMME':Math.abs(angle)>2.2?'VÄND DIG OM':angle>.5?'SVÄNG VÄNSTER':angle<-.5?'SVÄNG HÖGER':'FÖLJ PILARNA FRAMÅT';
    return {goal,path:this.path,next,angle,distance:Math.round(distanceLeft),turn,color:goal.kind==='escape'?'#96f3b1':'#81e9e3'};
  }
}
