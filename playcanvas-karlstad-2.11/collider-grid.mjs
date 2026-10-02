// Rutnätsindex för byggnadskollision. blocked() anropas för varje steg och för ~140 000
// navigeringsceller vid start; med 2.11:s kompletta kvarter (≈250 byggnader) blir en linjär
// genomgång för dyr på telefon. Varje ruta håller bara de byggnader som överlappar den.
export class ColliderGrid{
  constructor(colliders,cell=24){
    this.cell=cell;this.cells=new Map();this.count=colliders.length;
    for(const c of colliders){
      const x0=Math.floor(c.minx/cell),x1=Math.floor(c.maxx/cell),z0=Math.floor(c.minz/cell),z1=Math.floor(c.maxz/cell);
      for(let ix=x0;ix<=x1;ix++)for(let iz=z0;iz<=z1;iz++){const k=ix*100003+iz;let l=this.cells.get(k);if(!l)this.cells.set(k,l=[]);l.push(c);}
    }
  }
  // Kandidater som kan överlappa en cirkel med radien r kring (x,z). r måste vara < cell.
  near(x,z,r){
    const c=this.cell,x0=Math.floor((x-r)/c),x1=Math.floor((x+r)/c),z0=Math.floor((z-r)/c),z1=Math.floor((z+r)/c);
    if(x0===x1&&z0===z1)return this.cells.get(x0*100003+z0)||EMPTY;
    const out=new Set();for(let ix=x0;ix<=x1;ix++)for(let iz=z0;iz<=z1;iz++)for(const b of this.cells.get(ix*100003+iz)||EMPTY)out.add(b);
    return out;
  }
}
const EMPTY=Object.freeze([]);
