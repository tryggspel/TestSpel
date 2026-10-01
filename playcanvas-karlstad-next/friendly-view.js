export function createFriendlyView(draw,clerks){
  const {card,fanTex,labelTex}=draw;
  const person=fanTex('clerk','#709fba'),friendly=labelTex(['SNÄLL ZOMBIE','PRATA · HJÄLP · LUGNA'],'#285d59','#c4f8dc');
  const views=clerks.people.map(q=>({q,body:card(q.name+' · snäll zombie',person,1.5,2.4,q.x,q.y,q.z),badge:card(q.name+' · hjälp',friendly,2.4,.75,q.x,q.y+2.7,q.z),item:card(q.itemName,labelTex([q.itemName,'HÄMTA → LÄMNA'],'#b98238','#fff1cc'),1.05,.66,q.item.x,q.item.y+.6,q.item.z)}));
  return {update(p,now,active){
    for(const {q,body,badge,item} of views){
      const d=Math.hypot(p.x-q.x,p.z-q.z),show=active&&d<48;
      body.enabled=show;badge.enabled=show&&d<18&&Math.abs(p.y-1.68-q.y)<2;
      item.enabled=show&&q.stage==='search';
      if(!show)continue;
      const yaw=Math.atan2(p.x-q.x,p.z-q.z)*180/Math.PI,stress=q.stress>=60;
      body.setPosition(q.x+(stress?Math.sin(now/90)*.09:0),q.y+.025,q.z);body.setEulerAngles(0,yaw,stress?Math.sin(now/110)*5:Math.sin(now/1400)*1.5);badge.setEulerAngles(0,yaw,0);
      if(item.enabled){item.setPosition(q.item.x,q.item.y+.8+Math.sin(now/500)*.06,q.item.z);item.setEulerAngles(0,Math.atan2(p.x-q.item.x,p.z-q.item.z)*180/Math.PI,0);}
    }
  }};
}
