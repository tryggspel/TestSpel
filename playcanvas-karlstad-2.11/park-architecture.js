import {ComicMesh} from './city-architecture.js?v=2.11.1';
import {PENINSULA_SHORE,PARK_PATHS,PARK_GARDENS,PARK_PIERS} from './city-sites.mjs?v=2.11.1';
import {peninsulaBanks,waterBlocked} from './park-space.mjs?v=2.11.1';

export function createParkArchitecture(pc,app){
  const mat=new pc.StandardMaterial();mat.useLighting=false;mat.diffuse.set(0,0,0);mat.emissive.set(1,1,1);mat.emissiveVertexColor=true;mat.update();
  const land=new ComicMesh(true),water=new ComicMesh(true),props=new ComicMesh(true);
  water.box(-130,-.34,-639,740,.05,638,'#388e9d');
  // Stripes are baked ink highlights, not reflection passes or animated water shaders.
  for(let i=0;i<100;i++){const x=-473+(i*79)%685,z=-940+(i*37)%610;if(waterBlocked(x,z))water.strip([[x,z],[x+5+i%11,z+1]],.20,-.29,i%3?'#68b5b9':'#257688');}
  land.polygon(PENINSULA_SHORE,-.015,'#8da867');
  land.strip([...PENINSULA_SHORE,PENINSULA_SHORE[0]],1.25,.005,'#b7b38b');
  for(const garden of PARK_GARDENS)land.polygon(garden.points,.005,garden.osm===4790918?'#9cb875':'#86a364');
  for(const p of PARK_PATHS){
    // Ignore paths belonging to the opposite bank, beyond the peninsula itself.
    if(p.points.some(([x,z])=>waterBlocked(x,z)&&z<-545))continue;
    land.strip(p.points,p.width+.32,.025,'#6e8761');land.strip(p.points,p.width,.035,'#d9cba5');
  }
  for(const pier of PARK_PIERS){land.polygon(pier.points,.055,'#c19469');land.strip(pier.points,.30,.07,'#6b6250');}
  // Tall narrow mirror pond in Museiparken; its outline follows the OSM water feature.
  land.box(-151,.025,-411.9,11.7,.07,100.5,'#657c72');water.box(-151,.065,-411.9,9.8,.018,98.6,'#63a8b2');
  const tree=(x,z,i)=>{
    props.box(x,1.55,z,.48,3.1,.48,'#79624b');
    const col=['#476f58','#5c865d','#b3b76a','#6c9a6c'][i%4];
    props.pyramid(x,2.4,z,5.8,5.3,3.8,col);props.pyramid(x,4,z,4.6,4.8,2.6,col);
  };
  let trees=0;
  for(let z=-760;z<-340;z+=22){const [l,r]=peninsulaBanks(z);for(const [x,j] of [[l+7,0],[r-8,1]]){
    if(waterBlocked(x,z)||Math.abs(x+151)<8&&z>-464||z>-540&&z<-458&&x>-168&&x<-48)continue;
    if(PARK_PATHS.some(p=>p.points.some(([px,pz])=>Math.hypot(px-x,pz-z)<5)))continue;
    tree(x,z,trees++);
    if(j===0&&z%44===-12){props.box(x+3,.6,z,3,.16,.75,'#ac7952');props.box(x+3,1.0,z-.3,3,.6,.15,'#ac7952');}
  }}
  // Two intimate planted valleys, framed as low mounds with fern/magnolia silhouettes.
  for(const [cx,cz,col] of [[-222,-640,'#45694f'],[-219,-691,'#729665']])for(let i=0;i<16;i++){
    const a=i*Math.PI/8,x=cx+Math.cos(a)*9,z=cz+Math.sin(a)*13;props.pyramid(x,.02,z,3.7,3.7,1.1,col);
    if(i%4===0)props.pyramid(x,.9,z,2.2,2.1,1.6,cz<-670?'#edc4bf':'#639467');
  }
  const es=[land.finish(pc,app,'Sandgrundsudden · kartlagd strand och stigar',mat),water.finish(pc,app,'Klarälvens två grenar',mat),props.finish(pc,app,'Sandgrund · parkträd och dalar',mat)];
  return {staticDrawCalls:es.length,trees,paths:PARK_PATHS.length,shorePoints:PENINSULA_SHORE.length};
}
