// 2.21: koppling mellan platsmodellen (places.mjs) och stadens verkliga byggnader. Ren modul utan PlayCanvas.
// Fasadplatser (Pressbyrån) får sina koordinater ur samma fasadankare som övriga butiksskyltar, så att serviceytan alltid
// står framför rätt entré. Fasaden ändras aldrig; bara en fristående disk läggs framför den.
import {STOREFRONTS,storefrontAnchor} from './city-geography.mjs?v=2.21.1-xmas.1';
import {PLACES,resolvePlaces} from './places.mjs?v=2.21.1-xmas.1';

export function placeAnchors(buildings){
  const anchors={},faces={};
  for(const place of PLACES){
    const id=place.where?.storefront;if(!id||anchors[id])continue;
    const shop=STOREFRONTS.find(s=>s.id===id);if(!shop)continue;
    const a=storefrontAnchor(shop,buildings);if(a){anchors[id]=a;faces[id]=shop.face;}
  }
  return {anchors,faces};
}
// Kollisionsrutor för serviceytor, i samma form som stadens övriga kollisionsrutor. Läggs in före kollisionsrutnätet byggs.
export function partnerColliders(buildings){
  const {anchors,faces}=placeAnchors(buildings);
  return resolvePlaces(PLACES,{anchors,faces}).filter(p=>p.resolved&&p.kiosk).map(p=>{
    const r=p.kiosk.rect,cx=(r.minx+r.maxx)/2,cz=(r.minz+r.maxz)/2;
    return {precise:false,osm:'partner-'+p.id,name:p.name+' · servicedisk',tags:{},cx,cz,dist:Math.hypot(cx,cz),area:(r.maxx-r.minx)*(r.maxz-r.minz),sx:r.maxx-r.minx,sz:r.maxz-r.minz,h:1.1,height:1.1,
      minx:r.minx-.15,maxx:r.maxx+.15,minz:r.minz-.15,maxz:r.maxz+.15};
  });
}
