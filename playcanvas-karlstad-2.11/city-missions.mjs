import {LastRound} from './last-round-rules.mjs?v=2.21.1-xmas.2';

export const MISSIONS = Object.freeze([
  {id:'sista-rundan',name:'Sista rundan',place:'O’Learys',tag:'KNUFFA · 90 SEK',title:'SISTA<br><em>RUNDAN.</em>',lead:'Matchen är slut. Zombiefansen håller inte med.',description:'Knuffa tre fans till HEMGÅNG. Sedan kommer Kapten Övertid. Gå bakom figurerna och använd soptunnan för kedjeträffar.',win:'STÄNGT & KLART.'},
  {id:'fikapanik',name:'Fikapanik',place:'Stora Torget',tag:'3 VÅGOR · 24 ZOMBIES',title:'FIKA<br><em>PANIK.</em>',lead:'Kaffet är slut. Karlstad tar det personligt.',description:'Rensa tre vågor: 6, 8 och 10 zombies. Spring, vänd och skjut solstötar. Sprint-Steffe är snabb; Termos-Torsten tål mer. Ny våg ger liv och solenergi.',win:'TORGET TAR RAST.'},
  {id:'radda-fikat',name:'Rädda fikat',place:'Torget → Mitt i City',tag:'SAMLA · SPRING · LEVERERA',title:'RÄDDA<br><em>FIKAT.</em>',lead:'Tre termosar. En stad utan tålamod.',description:'Hämta tre termosar på Torget. Följ sedan de gula markörerna till leveransplatsen utanför Mitt i City. Tolv zombies bevakar vägen. Håll fikat varmt och dig själv vid liv.',win:'FIKAT ÄR RÄDDAT.'},
  {id:'sandgrund',name:'Vernissage från graven',place:'Sandgrund',tag:'RÄDDA BESÖKARNA · STOPPA BOSSEN',title:'DÖDENS<br><em>AKVARELL.</em>',lead:'”Rör inte konsten.” Konsten rör sig själv.',description:'En tecknad spelfantasi: Zombie-Lerin jagar besökarna utanför Sandgrund! Gå nära tre besökare så följer de dig till den gröna samlingsplatsen. Stoppa sedan Zombie-Lerin med solstötar.',win:'FÄRG I LIVET IGEN.'}
]);

// Small fixed navigation grid built from the city's existing collision boxes.
export class CityNavigation {
  constructor(blocked = () => false, bounds = {minX:-420,maxX:418,minZ:-875,maxZ:620}, cell = 3) {
    this.blocked=blocked;this.bounds=bounds;this.cell=cell;this.width=Math.floor((bounds.maxX-bounds.minX)/cell)+1;
    this.height=Math.floor((bounds.maxZ-bounds.minZ)/cell)+1;this.nodes=[];this.byCell=new Map();this.cache=new Map();
    for(let iz=0;iz<this.height;iz++)for(let ix=0;ix<this.width;ix++){
      const x=bounds.minX+ix*cell,z=bounds.minZ+iz*cell;
      if(blocked(x,z))continue;
      const n={x,z,ix,iz,id:this.nodes.length,links:[]};this.nodes.push(n);this.byCell.set(iz*this.width+ix,n);
    }
    for(const n of this.nodes)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const other=this.byCell.get((n.iz+dz)*this.width+n.ix+dx);
      if(other&&other.ix===n.ix+dx&&other.iz===n.iz+dz&&this.clear(n,other))n.links.push(other.id);
    }
    const anchor=this.nearest({x:0,z:14},false);
    if(!anchor)throw new Error('Ingen gångbar uppdragsyta hittades.');
    this.component=this.field(anchor).map(v=>v>=0);
  }
  clear(a,b){const steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.45);for(let i=1;i<=steps;i++)if(this.blocked(a.x+(b.x-a.x)*i/steps,a.z+(b.z-a.z)*i/steps))return false;return true;}
  nearest(p,connected=true){
    const ix=Math.round((p.x-this.bounds.minX)/this.cell),iz=Math.round((p.z-this.bounds.minZ)/this.cell);
    const fast=this.byCell.get(iz*this.width+ix);
    if(fast&&fast.ix===ix&&(!connected||!this.component||this.component[fast.id]))return fast;
    let best=null,d=Infinity;for(const n of this.nodes){if(connected&&this.component&&!this.component[n.id])continue;const v=(n.x-p.x)**2+(n.z-p.z)**2;if(v<d){d=v;best=n;}}return best;
  }
  field(target){
    // Mission actors and pickups also have IDs; only actual grid nodes can bypass lookup.
    const goal=this.nodes[target.id]===target?target:this.nearest(target);
    if(this.cache.has(goal.id))return this.cache.get(goal.id);
    const distance=new Int32Array(this.nodes.length).fill(-1),queue=[goal.id];distance[goal.id]=0;
    for(let i=0;i<queue.length;i++)for(const id of this.nodes[queue[i]].links)if(distance[id]===-1){distance[id]=distance[queue[i]]+1;queue.push(id);}
    if(this.cache.size>5)this.cache.delete(this.cache.keys().next().value);this.cache.set(goal.id,distance);return distance;
  }
  path(from,to){
    const field=this.field(to),out=[];let n=this.nearest(from);
    for(let i=0;i<900&&n&&field[n.id]>=0;i++){
      out.push({x:n.x,z:n.z});if(field[n.id]===0)break;
      n=this.nodes[n.links.find(id=>field[id]===field[n.id]-1)];
    }
    // Keep the fast fixed city grid, but allow a verified clear final leg to nearby
    // real destinations just outside it (for example Haga). This avoids thousands
    // of extra navigation nodes on iPhone while still ending at the actual target.
    const outside=to.x<this.bounds.minX||to.x>this.bounds.maxX||to.z<this.bounds.minZ||to.z>this.bounds.maxZ;
    if(outside&&out.length&&this.clear(out.at(-1),to))out.push({x:to.x,z:to.z});
    return out;
  }
  waypoint(from,to){if(this.clear(from,to))return to;const n=this.nearest(from),field=this.field(to);return this.nodes[n.links.find(id=>field[id]>=0&&field[id]<field[n.id])]||n;}
  point(p){const n=this.nearest(p);return {x:n.x,z:n.z};}
}

const types={walker:{name:'Paket-Pelle',hp:2,speed:1.65},runner:{name:'Stress-Nisse',hp:1,speed:3.0},tank:{name:'Gröt-Gunnar',hp:4,speed:1.15},golden:{name:'Guld-Nisse',hp:2,speed:2.5}};
// 2.12 lunge telegraph: a zombie that gets close stops, winds up (readable), then dashes.
// A solstöt during the wind-up cancels it, so reacting is rewarded instead of face-tanking.
export const LUNGE=Object.freeze({range:2.6,minRange:1.05,windup:.42,dash:.34,boost:2.6,cooldown:2.3});
export class CityMission extends LastRound {
  constructor(id,nav,mall,seed=280926,site={x:-13,z:-397}){
    const spawn=nav.point({x:0,z:14}),edge=nav.point(mall);
    const outward=Math.hypot(edge.x-mall.x,edge.z-mall.z)||1;
    const delivery=nav.blocked(mall.x,mall.z)?nav.point({x:edge.x+(edge.x-mall.x)/outward*3,z:edge.z+(edge.z-mall.z)/outward*3}):edge;
    const layout={duration:id==='fikapanik'?150:180,bounds:{...nav.bounds},goal:{x:delivery.x,z:delivery.z,radius:-1},spawn,guard:spawn,
      chargers:[nav.point({x:-21,z:13}),nav.point({x:18,z:-8})],actors:[]};
    super(layout,nav.blocked);this.id=id;this.nav=nav;this.seed=seed;this.delivery=delivery;this.site=nav.point(site);
    this.pickupSpots=[nav.point({x:-18,z:-12}),nav.point({x:18,z:-12}),nav.point({x:-17,z:14})];
    this.start();this.phase='ready';this.events=[];
  }
  start(options={}){
    super.start(options);this.health=100;this.wave=0;this.waveDelay=0;this.collected=0;this.pickups=this.pickupSpots.map((p,i)=>({...p,id:i,collected:false}));this.chainRun=0;this.lastZap=-100;this.damageUntil=0;
    this.actors=Array.from({length:12},(_,i)=>({id:'city-'+i,name:'Paket-Pelle',kind:'walker',x:0,z:0,radius:.65,mass:1,hp:2,maxHp:2,speed:1.65,phase:i*1.7,active:false,vx:0,vz:0,shot:0,touchTime:-100}));
    if(this.id==='sandgrund'){
      this.layout.spawn=this.nav.point({x:this.site.x,z:this.site.z+26});this.safe=this.nav.point({x:this.site.x+8,z:this.site.z+31});this.rescued=0;
      this.visitors=[[-16,8],[14,8],[-2,17]].map(([x,z],i)=>({...this.nav.point({x:this.site.x+x,z:this.site.z+z}),id:i,following:false,rescued:false,health:100}));
      this.actors.forEach(a=>a.active=false);
      this.spawn(this.actors[0],this.site,'tank');Object.assign(this.actors[0],{kind:'artist',name:'Zombie-Lerin',hp:12,maxHp:12,speed:2.1,mass:1.8});
      for(let i=1;i<=3;i++)this.spawn(this.actors[i],{x:this.site.x+(i-2)*13,z:this.site.z+5},i===2?'runner':'walker');
      this.visitorHitCooldown=0;
    }else if(this.id==='fikapanik')this.spawnWave();else{
      const route=this.nav.path(this.layout.spawn,this.delivery);
      this.actors.forEach((a,i)=>{
        const spot=i<6?this.pickupSpots[i%3]:route[Math.min(route.length-1,Math.floor((i-5)/7*route.length))];
        const angle=i*2.399+(this.seed%19)*.1;
        this.spawn(a,{x:spot.x+Math.cos(angle)*5,z:spot.z+Math.sin(angle)*5},i%4===0?'runner':i===10?'tank':'walker');
      });
    }
  }
  spawn(a,p,kind){
    const spot=this.nav.point(p),t=types[kind];Object.assign(a,spot,t,{kind,maxHp:t.hp,active:true,vx:0,vz:0,shot:0,touchTime:-100,ambushId:null,patrolId:null,contractId:null,ambushAt:undefined,radius:kind==='tank'?.85:.65,mass:kind==='tank'?1.5:1,windupUntil:0,lungeUntil:0,lungeReady:0,lungeX:0,lungeZ:0,golden:kind==='golden'});
  }
  spawnWave(){
    this.wave++;this.waveDelay=0;const count=4+this.wave*2;
    this.actors.forEach((a,i)=>{
      a.active=i<count;if(!a.active)return;
      const angle=i/count*Math.PI*2+this.wave*.55+(this.seed%11)*.07;
      this.spawn(a,{x:Math.sin(angle)*22,z:Math.cos(angle)*22},this.wave>1&&i%5===0?'tank':i%3===0?'runner':'walker');
    });
    this.health=Math.min(100,this.health+25);this.energy=Math.min(100,this.energy+30);
    this.events.push({type:'wave',wave:this.wave,count});
  }
  impulse(a,dx,dz,strength,shot){
    if(!a.active||!this.chains.has(shot)||this.chains.get(shot).has(a.id))return;
    super.impulse(a,dx,dz,strength,shot);
    if(a.windupUntil>this.elapsed||a.lungeUntil>this.elapsed){a.windupUntil=a.lungeUntil=0;this.events.push({type:'lunge-broken',x:a.x,z:a.z});}
    a.hp-=strength>=23?2:1;
    if(a.hp<=0){
      a.active=false;a.vx=a.vz=0;this.captured++;this.chainRun=this.elapsed-this.lastZap<3?this.chainRun+1:1;this.lastZap=this.elapsed;
      this.score+=100+Math.min(5,this.chainRun)*20;this.energy=Math.min(100,this.energy+8);
      this.events.push({type:'zap',name:a.name,kind:a.kind,combo:this.chainRun,x:a.x,z:a.z});
    }
  }
  objective(player=this.layout.spawn){
    if(this.id==='fikapanik')return {x:0,z:6,label:'TORGET',radius:2};
    if(this.id==='sandgrund'){
      if(this.visitors.some(v=>v.following&&!v.rescued))return {...this.safe,label:'RÄDDA BESÖKARNA',radius:4};
      const v=this.visitors.find(v=>!v.rescued);return v?{...v,label:'HÄMTA BESÖKARE',radius:2}:{...this.actors[0],label:'STOPPA ZOMBIE-LERIN',radius:2};
    }
    const remaining=this.pickups.filter(p=>!p.collected).sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z));
    return remaining.length?{...remaining[0],label:'TERMOS',radius:1.5}:{...this.delivery,label:'LEVERERA FIKAT',radius:3};
  }
  step(dt,player){
    if(this.phase!=='playing'||!Number.isFinite(dt)||dt<=0)return;
    let left=Math.min(dt,1); // bounded steps also keep navigation and hits consistent at low FPS
    while(left>.00001&&this.phase==='playing'){
      const h=Math.min(left,1/60);left-=h;
      if(player)for(const a of this.actors){
        if(!a.active||this.elapsed-a.touchTime<.65)continue;
        const distance=Math.hypot(player.x-a.x,player.z-a.z);
        if(this.id==='radda-fikat'&&distance>22)continue;
        if(distance>(this.pursuitRange??Infinity)){a.vx=a.vz=0;continue;}
        const pace0=a.speed*(this.movementScale?.(a)??1);
        if(a.kind==='golden'){
          // Guld-Gunnar flees. He only stands still once the player has lost him (>26 m), so a chase is always possible.
          if(distance>26){a.vx=a.vz=0;continue;}
          const away=Math.max(.001,distance),flee=this.nav.point({x:a.x+(a.x-player.x)/away*7,z:a.z+(a.z-player.z)/away*7});
          const aim=this.nav.waypoint(a,flee),l=Math.hypot(aim.x-a.x,aim.z-a.z)||1;a.vx=(aim.x-a.x)/l*pace0;a.vz=(aim.z-a.z)/l*pace0;continue;
        }
        if(a.lungeUntil>this.elapsed){a.vx=a.lungeX*pace0*LUNGE.boost;a.vz=a.lungeZ*pace0*LUNGE.boost;continue;}
        if(a.windupUntil>this.elapsed){a.vx=a.vz=0;continue;}
        if(a.windupUntil&&a.windupUntil<=this.elapsed){
          // Wind-up finished: dash towards where the player is now.
          const l=Math.max(.001,distance);a.windupUntil=0;a.lungeUntil=this.elapsed+LUNGE.dash;a.lungeX=(player.x-a.x)/l;a.lungeZ=(player.z-a.z)/l;
          a.vx=a.lungeX*pace0*LUNGE.boost;a.vz=a.lungeZ*pace0*LUNGE.boost;continue;
        }
        if(a.kind!=='artist'&&distance<LUNGE.range&&distance>LUNGE.minRange&&this.elapsed>=(a.lungeReady||0)&&this.visible(a.x,a.z,player.x,player.z)){
          a.windupUntil=this.elapsed+LUNGE.windup;a.lungeReady=this.elapsed+LUNGE.cooldown;a.vx=a.vz=0;continue;
        }
        const victim=this.id==='sandgrund'&&a.kind==='artist'?this.visitors.filter(v=>!v.rescued).sort((v,w)=>Math.hypot(v.x-a.x,v.z-a.z)-Math.hypot(w.x-a.x,w.z-a.z))[0]:null;
        const target=victim&&distance>6?victim:player;
        const aim=this.nav.waypoint(a,target),length=Math.hypot(aim.x-a.x,aim.z-a.z)||1;
        let dx=(aim.x-a.x)/length,dz=(aim.z-a.z)/length;
        for(const other of this.actors){if(other===a||!other.active)continue;const ox=a.x-other.x,oz=a.z-other.z,d=Math.hypot(ox,oz);if(d>.001&&d<1.35){dx+=ox/d*.7;dz+=oz/d*.7;}}
        const l=Math.max(1,Math.hypot(dx,dz));const pace=a.speed*(this.movementScale?.(a)??1);a.vx=dx/l*pace;a.vz=dz/l*pace;
      }
      const previousEvents=this.events.length;super.step(h,player);
      for(const e of this.events.slice(previousEvents))if(e.type==='bump'){
        this.health=Math.max(0,this.health-16);this.damageUntil=this.elapsed+.4;this.events.push({type:'damage',health:this.health});
        if(this.health===0)this.finish(false);
      }
      if(this.phase!=='playing')break;
      if(this.id==='sandgrund'&&player){
        this.visitorHitCooldown=Math.max(0,this.visitorHitCooldown-h);
        for(const visitor of this.visitors){
          if(visitor.rescued)continue;
          if(Math.hypot(visitor.x-player.x,visitor.z-player.z)<3.5&&!visitor.following){visitor.following=true;this.events.push({type:'visitor-follow'});}
          if(visitor.following){const to=this.nav.waypoint(visitor,player),d=Math.hypot(to.x-visitor.x,to.z-visitor.z)||1;if(Math.hypot(player.x-visitor.x,player.z-visitor.z)>1.7){const nx=visitor.x+(to.x-visitor.x)/d*5*h,nz=visitor.z+(to.z-visitor.z)/d*5*h;if(!this.blocked(nx,visitor.z))visitor.x=nx;if(!this.blocked(visitor.x,nz))visitor.z=nz;}}
          if(visitor.following&&Math.hypot(visitor.x-this.safe.x,visitor.z-this.safe.z)<4){visitor.rescued=true;this.rescued++;this.score+=400;this.events.push({type:'visitor-safe',count:this.rescued});}
          const artist=this.actors[0];if(!visitor.rescued&&artist.active&&this.visitorHitCooldown===0&&Math.hypot(artist.x-visitor.x,artist.z-visitor.z)<1.5){visitor.health=Math.max(0,visitor.health-12);this.visitorHitCooldown=2;this.events.push({type:'visitor-danger'});if(visitor.health===0)this.finish(false);}
        }
        if(this.rescued===3&&!this.actors[0].active)this.finish(true);
      }
      if(this.id==='fikapanik'&&!this.actors.some(a=>a.active)){
        if(this.wave===3){this.finish(true);break;}
        if(!this.waveDelay){this.waveDelay=this.elapsed+3;this.events.push({type:'wave-clear',wave:this.wave});}
        if(this.elapsed>=this.waveDelay)this.spawnWave();
      }
      if(this.id==='radda-fikat'&&player){
        for(const pack of this.pickups)if(!pack.collected&&Math.hypot(pack.x-player.x,pack.z-player.z)<1.65){
          pack.collected=true;this.collected++;this.score+=250;this.energy=Math.min(100,this.energy+20);this.events.push({type:'collect',count:this.collected});
        }
        if(this.collected===3&&Math.hypot(player.x-this.delivery.x,player.z-this.delivery.z)<3){this.score+=750;this.finish(true);}
      }
    }
  }
}
