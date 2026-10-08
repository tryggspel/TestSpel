// Julklappsjakten: snön är ett färgfilter på spelets egen geometri, inte nya ytor. Varje triangel i de sammanslagna stadsmeshar (ComicMesh)
// får snö efter hur den vänder: uppåtvända ytor på marken (gator, torg, gräs) blir snötäckta, tak, takfötter och avsatser får ett vitt lock,
// branta taksidor lite, väggar ingenting. Därför blir det inga extra ytor som kan flimra, ingen extra ritkostnad och ingen ändring av
// rörelsen: snön är bara en färg. Vatten får en ljus iston men syns fortfarande som vatten.
const SNOW={r:.94,g:.965,b:.99};
const mix=(a,b,t)=>a+(b-a)*t;
const clamp01=v=>Math.max(0,Math.min(1,v));
const lum=(r,g,b)=>.2126*r+.7152*g+.0722*b;
export const isWater=(r,g,b)=>b>.52&&b>r+.14&&b>=g-.02;
export const isGreen=(r,g,b)=>g>r+.04&&g>b+.06;

// c = [r,g,b,a] i 0..1, ny = normalens y (−1..1, enhetsvektor), y = triangelns medelhöjd i meter. Returnerar en ny färg.
export function snowFilter(c,ny,y){
  const r=c[0],g=c[1],b=c[2];
  if(ny<.2)return c;                                   // väggar och undersidor: ingen snö
  const L=lum(r,g,b);let amount;
  if(ny>.7){
    if(y<.5){                                           // marknivå: gator, trottoarer, torg, gräs, vatten
      if(isWater(r,g,b)){const t=.38;return [mix(r,.84,t),mix(g,.93,t),mix(b,.97,t),c[3]];}
      amount=.84;
    }else if(y<2.5)amount=.72;                          // bänkar, planteringar, trappsteg, låga avsatser
    else amount=.82;                                    // tak, takfötter, fönsterbänkar, skärmtak
  }else{                                                // sluttande ytor: taksidor och trädkronor
    const slope=clamp01((ny-.25)/.45);
    amount=isGreen(r,g,b)?clamp01((ny-.5)/.4)*.55:slope*.8;
    if(amount<=.02)return c;
  }
  // Ljusa underlag blir vitare än mörka (en gata är gråare än ett torg), men allt får samma kalla vita ton.
  const k=.8+.2*L,tr=SNOW.r*k,tg=SNOW.g*k,tb=SNOW.b*Math.min(1,k+.03);
  return [mix(r,tr,amount),mix(g,tg,amount),mix(b,tb,amount),c[3]];
}
export function installSnow(ComicMesh,on=true){ComicMesh.snow=on?snowFilter:null;return !!ComicMesh.snow;}

// Material i app.js (stora marken, torgplattor, vägar) som inte går genom ComicMesh.
export const SNOW_MATERIALS=Object.freeze({ground:0xe9f0f5,grass:0xe3ebf1,plaza:0xe8edf1,road:0xc2ced9,sidewalk:0xecf1f5,concrete:0x9aa3aa});
export const WINTER_SKY=Object.freeze({clear:[.62,.74,.88],fog:[.70,.79,.88],fogStart:120,fogEnd:420});
