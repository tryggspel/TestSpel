export const STREET_STORIES=Object.freeze({
  power:{title:'TÄND KARLSTAD',seconds:55,points:260,action:'SLÅ PÅ STRÖMMEN'},
  news:{title:'NWT: EXTRA! EXTRA!',seconds:45,points:220,action:'HÄMTA NYHETSPAKETET'},
  bowling:{title:'ZOMBIEBOWLING',seconds:40,points:220,action:'SPARKA VAGNEN'}
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function beginStory(rush,kind,p,f){
  const def=STREET_STORIES[kind];if(!def)return false;
  if(kind==='bowling'&&rush.city.actors.filter(a=>a.active).length>3)return false;
  if(rush.contract?.kind==='power')rush.blackoutUntil=0;
  const spot=rush.spot(p,f),id='story-'+kind+'-'+(++rush.storySerial);
  const c={id,kind,title:def.title,action:def.action,spot,until:rush.spent+def.seconds,points:def.points,stage:0};
  if(kind==='power'){
    c.title='TÄND KARLSTAD · ELBOX 1/3';rush.blackoutUntil=c.until;
  }else if(kind==='news')c.title='NWT · HÄMTA NYHETERNA';
  else{
    const actors=[-.8,0,.8].map(o=>rush.spawnEnemy(spot,{x:-f.x,z:-f.z},id,o)).filter(Boolean);if(!actors.length)return false;
    c.left=actors.length;c.cart={x:spot.x,z:spot.z,vx:0,vz:0,serial:0,hit:new Set(),cooldown:0};
  }
  rush.contract=c;rush.city.events.push({type:'street-event',kind,title:c.title});return true;
}
export function storyAction(rush,p,f){
  const c=rush.contract;if(!c||!STREET_STORIES[c.kind]||rush.city.phase!=='playing'||rush.state!=='playing'||distance(p,c.spot)>3.3)return false;
  if(c.kind==='power'){
    c.stage++;rush.city.energy=Math.min(100,rush.city.energy+12);
    if(c.stage===3){
      rush.blackoutUntil=0;rush.panic=Math.max(0,rush.panic-15);
      for(const a of rush.city.actors)if(a.active){a.touchTime=rush.city.elapsed+1.5;a.vx=a.vz=0;}
      rush.completeContract();rush.city.events.push({type:'power-restored'});
    }else{
      const from={...c.spot};c.spot=rush.spot(from,{x:-f.z,z:f.x},false,c.stage*.4);c.title='TÄND KARLSTAD · ELBOX '+(c.stage+1)+'/3';
      rush.spawnEnemy(from,f);rush.city.events.push({type:'power-switch',stage:c.stage});
    }
    return true;
  }
  if(c.kind==='bowling'){
    const cart=c.cart;if(cart.cooldown>0||Math.hypot(cart.vx,cart.vz)>.6)return false;
    const d=Math.hypot(f.x,f.z)||1;cart.vx=f.x/d*15;cart.vz=f.z/d*15;cart.cooldown=1;cart.serial++;cart.hit.clear();
    rush.city.events.push({type:'cart-kick'});return true;
  }
  return false;
}
export function stepStory(rush,dt,p,f){
  const c=rush.contract;if(!c||!STREET_STORIES[c.kind])return false;
  if(c.kind==='news'&&distance(p,c.spot)<2.4){
    c.stage++;
    if(c.stage===3){rush.completeContract();return true;}
    c.spot=rush.spot(c.spot,{x:-f.z,z:f.x},false,c.stage*.45);c.title=c.stage===1?'NWT · LEVERERA 1/2':'NWT · LEVERERA 2/2';c.action='LÄMNA TIDNINGARNA';
    if(c.stage===1)rush.spawnEnemy(p,f);rush.city.events.push({type:'news-stage',stage:c.stage});
  }
  if(c.kind==='bowling'){
    const cart=c.cart,g=rush.city;cart.cooldown=Math.max(0,cart.cooldown-dt);
    let left=Math.min(dt,1);
    while(left>0){
      const h=Math.min(left,1/60);left-=h;const x=cart.x+cart.vx*h,z=cart.z+cart.vz*h;
      if(g.nav.clear(cart,{x,z})){cart.x=x;cart.z=z;}else{cart.vx=cart.vz=0;}
      const speed=Math.hypot(cart.vx,cart.vz);
      if(speed>2)for(const a of g.actors)if(a.active&&!cart.hit.has(a.id)&&distance(cart,a)<1.5){
        cart.hit.add(a.id);const shot='cart-'+c.id+'-'+cart.serial;
        if(!g.chains.has(shot))g.chains.set(shot,new Set());
        g.impulse(a,cart.vx/speed,cart.vz/speed,27,shot);
        if(!a.active){g.reward(30);g.events.push({type:'cart-strike',points:30});}
      }
      const drag=Math.exp(-1.15*h);cart.vx*=drag;cart.vz*=drag;
    }
    c.spot={x:cart.x,z:cart.z};c.action=Math.hypot(cart.vx,cart.vz)>.6?'VAGNEN RULLAR':'SPARKA VAGNEN';
  }
  return true;
}
