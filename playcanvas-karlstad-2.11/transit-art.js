import {ComicMesh} from './city-architecture.js?v=2.20.0';
export function createBusModel(pc,host,draw,x,z){
  const mat=new pc.StandardMaterial();mat.useLighting=false;mat.diffuse.set(0,0,0);mat.emissive.set(1,1,1);mat.emissiveVertexColor=true;mat.update();
  const m=new ComicMesh(true);
  m.box(0,1.55,0,8.8,2.8,2.8,'#ffbe0a','#d49e12');m.box(0,2.91,0,8.65,.15,2.72,'#e7e1c5');m.box(0,.7,0,8.9,.3,2.88,'#434950');
  for(const side of [-1,1]){
    for(let i=0;i<5;i++){m.box(-3.4+i*1.5,2.05,side*1.42,1.25,1.2,.04,'#294853');m.box(-3.75+i*1.5,2.05,side*1.445,.11,1.15,.025,'#a4c6c1');}
    for(const xx of [-2.7,2.7])for(let i=0;i<12;i++){
      const a=i/12*Math.PI*2,b=(i+1)/12*Math.PI*2;
      const p=[xx,.57,side*1.48],q=[xx+Math.cos(a)*.59,.57+Math.sin(a)*.59,side*1.48],r=[xx+Math.cos(b)*.59,.57+Math.sin(b)*.59,side*1.48];
      m.tri(p,q,r,'#20343b');m.tri(r,q,p,'#20343b');m.box(xx,.57,side*1.5,.45,.45,.04,'#a6b9b2');
    }
  }
  m.box(-4.43,2.04,0,.05,1.2,2.46,'#304d59');m.box(-4.48,1.16,-.98,.08,.23,.35,'#fff0b4');m.box(-4.48,1.16,.98,.08,.23,.35,'#fff0b4');
  const e=m.finish(pc,host.app,'Gul Värmlandstrafik-buss',mat);e.setPosition(x,0,z);
  const tex=draw.texture((c,w,h)=>{c.fillStyle='#ffbe0a';c.fillRect(0,0,w,h);c.fillStyle='#232d32';c.font='900 35px sans-serif';c.textAlign='center';c.fillText('VÄRMLANDSTRAFIK',w/2,h*.68,w-20);},512,100);
  const logo=new Image();logo.onload=()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=100;const c=canvas.getContext('2d');c.fillStyle='#ffbe0a';c.fillRect(0,0,512,100);c.drawImage(logo,12,7,488,86);tex.setSource(canvas);};logo.src=new URL('./art/brands/varmlandstrafik.svg',import.meta.url).href;
  for(const side of [-1,1]){const label=draw.card('Värmlandstrafik',tex,5.6,.78,x,1.05,z+side*1.455);label.reparent(e);label.setLocalPosition(0,1.05,side*1.455);label.setLocalEulerAngles(0,side<0?180:0,0);}
  return e;
}
