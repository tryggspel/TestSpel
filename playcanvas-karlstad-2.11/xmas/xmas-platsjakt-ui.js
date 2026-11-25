// Platsjakten (2.21.1-xmas.14): kortet med bilden, klockan överst under jakten och resultatkortet. Reglerna ligger i xmas-platsjakt.mjs, körningen i xmas-boot.js.
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};
export const mmss=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
export function createPlatsjaktUi({onStart=null,onRetry=null,onNew=null,onClose=null}={}){
  const layer=el('div','xmas-guide-layer pj-layer');layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
  const card=el('section','round-card compact xmas-card pj-card');layer.append(card);document.body.append(layer);
  const hud=el('div','pj-hud');hud.hidden=true;const thumb=el('img','pj-thumb');thumb.alt='Bilden av platsen';const clock=el('b','pj-clock','0:00'),lab=el('span','pj-lab','PLATSJAKTEN');
  const hudText=el('div','pj-hudtext');hudText.append(lab,clock);hud.append(thumb,hudText);document.body.append(hud);
  let photo='',def=null;
  thumb.addEventListener('click',()=>{if(def)showPhoto(def,photo,true);});
  const close=()=>{layer.hidden=true;card.replaceChildren();};
  function header(kicker){const l=el('div','episode-label');l.append(el('span',null,'PLATSJAKTEN'),el('span',null,kicker));return l;}
  // Bilden och reglerna. running: true = bara bilden igen (mitt i jakten)
  function showPhoto(d,img,running=false){
    def=d;photo=img;card.replaceChildren();
    card.append(header(d.contest?d.title:'NY PLATS'),el('h2',null,'VAR ÄR DETTA?'));
    const fig=el('div','pj-photo');if(img){const i=el('img');i.src=img;i.alt='En plats i Karlstad';fig.append(i);}else fig.append(el('p',null,'(Ingen bild: ledtråden får räcka.)'));card.append(fig);
    if(!running){
      card.append(el('p','round-lead','Hitta platsen på bilden och plocka det gömda paketet innan klockan går ut. Du börjar vid granen på Stora Torget.'));
      const g=el('div','xgc-grid');const row=(k,v)=>{const r=el('div','xgc-row');r.append(el('span',null,k),el('b',null,v));return r;};
      g.append(row('TID',mmss(d.seconds)),row('LEDTRÅD',d.place.hint),row('PAKETET',d.reward.xp+' XP och en prydnad'+(d.reward.coupon?' · ett erbjudande':'')+' (en gång per plats och dag, högst tre om dagen)'));card.append(g);
      if(d.qr)card.append(el('p','xgc-offer',d.qr));
      card.append(el('p','round-fine','Halvvägs får du en ledtråd om väderstrecket. Varje jakt har en ny plats; snabbaste tiden sparas per plats.'));
      const go=el('button','round-primary xmas-primary','STARTA KLOCKAN');go.type='button';go.addEventListener('click',()=>{close();onStart?.();});card.append(go);
      const no=el('button','round-tertiary','Inte nu');no.type='button';no.addEventListener('click',()=>{close();onClose?.();});card.append(no);
    }else{const back=el('button','round-primary xmas-primary','TILLBAKA TILL JAKTEN');back.type='button';back.addEventListener('click',close);card.append(back);}
    layer.hidden=false;
  }
  function startHud(img){thumb.src=img||'';thumb.hidden=!img;hud.hidden=false;hud.classList.remove('urgent');}
  function tick(left,total){clock.textContent=mmss(left);hud.classList.toggle('urgent',left<Math.min(30,total*.2));}
  function stopHud(){hud.hidden=true;}
  function result({ok,seconds,best,prevBest,R,place,coupon,left=null,already=false}){
    stopHud();card.replaceChildren();
    card.append(header(ok?'HITTAD!':'TIDEN TOG SLUT'),el('h2',null,ok?place.name.toUpperCase():'DET VAR '+place.name.toUpperCase()));
    if(photo){const fig=el('div','pj-photo small');const i=el('img');i.src=photo;i.alt=place.name;fig.append(i);card.append(fig);}
    if(ok){
      card.append(el('p','round-lead','Du hittade paketet på '+mmss(seconds)+(best?(prevBest?', ditt nya rekord (förut '+mmss(prevBest)+').':', ditt första rekord här.'):'. Ditt rekord här är '+mmss(prevBest)+'.')));
      if(R)card.append(el('p','xgc-xp','+'+R.xp+' XP'+(R.ornaments[0]?' · '+(R.ornaments[0].isNew?'ny prydnad: ':'dubblett: ')+R.ornaments[0].name:'')+(coupon?' · NY KUPONG: '+coupon:'')));
      else card.append(el('p','round-fine',already?'Den här platsen har redan gett sitt paket i dag: tiden räknas. Prova en ny plats!':'Dagens tre paket är öppnade: tiden räknas, nya paket i morgon.'));
      if(R&&left>0)card.append(el('p','round-fine','Paket kvar i dag på nya platser: '+left+'.'));
    }else card.append(el('p','round-lead','Paketet låg framför '+place.name+'. Försök igen: nu vet du vart du ska!'));
    const btn=(cls,text,fn)=>{const b=el('button',cls,text);b.type='button';b.addEventListener('click',()=>{close();fn?.();});card.append(b);};
    if(ok){btn('round-primary xmas-primary','NY PLATS',onNew);btn('round-secondary','Samma plats igen på tid',onRetry);}
    else{btn('round-primary xmas-primary','FÖRSÖK IGEN',onRetry);btn('round-secondary','Ny plats',onNew);}
    const done=el('button','round-tertiary','Fortsätt gå runt i staden');done.type='button';done.addEventListener('click',()=>{close();onClose?.();});card.append(done);
    layer.hidden=false;
  }
  return {showPhoto,startHud,tick,stopHud,result,close:()=>{close();stopHud();},get open(){return !layer.hidden;},snapshot:()=>({open:!layer.hidden,hud:!hud.hidden,clock:clock.textContent})};
}
