// Minimal attrapp av PlayCanvas-API:t för tools/smoke/smoke.mjs. Allt returnerar tysta proxies.
const handler={
  get(t,k){
    if(k===Symbol.toPrimitive)return ()=>0;
    if(k==='then')return undefined;
    if(k===Symbol.iterator)return function*(){};
    if(k in t)return t[k];
    const v=P();t[k]=v;return v;
  },
  apply(){return P()},
  construct(){return P()}
};
function P(){const f=function(){};return new Proxy(f,handler);}
const root=P();
export class Application{
  constructor(){
    const self=P();const h=[];
    self.on=(n,fn)=>{if(n==='update')h.push(fn)};
    self.start=()=>{let last=performance.now();const loop=now=>{const dt=Math.min(.1,(now-last)/1000);last=now;for(const fn of h){try{fn(dt)}catch(e){console.error('UPDATE-ERR',e&&e.stack||e);throw e}}requestAnimationFrame(loop)};requestAnimationFrame(loop)};
    self.stats={frame:{fps:60}};
    return self;
  }
}
export const Color=P(),Vec3=P(),Vec2=P(),Vec4=P(),Quat=P(),Mat4=P(),Entity=P(),StandardMaterial=P(),Texture=P(),Mesh=P(),MeshInstance=P(),GraphNode=P(),Layer=P(),BoundingBox=P(),Curve=P(),VertexFormat=P(),VertexBuffer=P(),IndexBuffer=P(),CullMode=0,BLEND_NORMAL=1,BLEND_ADDITIVE=2,BLEND_NONE=0,FILLMODE_FILL_WINDOW=1,RESOLUTION_AUTO=1,FILTER_LINEAR=1,FILTER_NEAREST=0,FILTER_LINEAR_MIPMAP_LINEAR=2,ADDRESS_CLAMP_TO_EDGE=1,ADDRESS_REPEAT=0,CULLFACE_NONE=0,CULLFACE_BACK=1,PROJECTION_PERSPECTIVE=0,FOG_LINEAR=1,FOG_EXP2=2,FOG_NONE=0,TONEMAP_ACES=1,PRIMITIVE_TRIANGLES=4,PRIMITIVE_LINES=1,SEMANTIC_POSITION='p',SEMANTIC_NORMAL='n',SEMANTIC_TEXCOORD0='t',SEMANTIC_COLOR='c',TYPE_FLOAT32=6,TYPE_UINT8=1,BUFFER_STATIC=0,PIXELFORMAT_RGBA8=7,PIXELFORMAT_R8_G8_B8_A8=7,GAMMA_SRGB=1,LAYERID_UI=4,LAYERID_WORLD=1,BLEND_PREMULTIPLIED=3,SHADOW_PCF3=1,LIGHTTYPE_DIRECTIONAL='d',ASPECT_AUTO=0;
export function createMesh(){return P()}export function createBox(){return P()}export function createSphere(){return P()}export function createPlane(){return P()}export function createCylinder(){return P()}
export default root;
