// Julklappsjakten: vägledningens gränssnitt: den stora pilen (alltid på skärmen, med avstånd och vad den pekar på), kantmarkörerna som lyser åt det håll man ska
// vända sig och uppdragsraden (vad man ska göra nu och sedan). Byggs med textContent (aldrig HTML-strängar med data) och ritar bara om när något ändrats.
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};

export function createGuideUi({mount=document.getElementById('roundOverlay')}={}){
  const edgeL=el('div','xg-edge xg-l'),edgeR=el('div','xg-edge xg-r');edgeL.id='xmasEdgeL';edgeR.id='xmasEdgeR';
  for(const e of [edgeL,edgeR]){e.hidden=true;e.setAttribute('aria-hidden','true');}
  const arrow=el('div','xg-arrow');arrow.id='xmasArrow';arrow.hidden=true;arrow.setAttribute('aria-hidden','true');
  const icon=el('i','xg-icon'),line=el('b','xg-line'),hint=el('small','xg-hint');arrow.append(icon,line,hint);
  const mission=el('div','xg-mission');mission.id='xmasMission';mission.hidden=true;mission.setAttribute('role','status');mission.setAttribute('aria-live','polite');
  mount.append(edgeL,edgeR,arrow,mission);
  let rot='',txt='',hin='',cls='',eL=-1,eR=-1,missionKey='',behind=false;
  const rows=[];

  // g = XmasGuide.state. Anropas varje bildruta; skriver bara till DOM när värdet ändrats (vinkeln i halva grader).
  function set(g){
    if(!g||!g.on){if(!arrow.hidden){arrow.hidden=true;edgeL.hidden=edgeR.hidden=true;eL=eR=-1;}return;}
    if(arrow.hidden)arrow.hidden=false;
    const r='rotate('+(-Math.round(g.angle*2)/2).toFixed(1)+'deg)';if(r!==rot){rot=r;icon.style.transform=r;}
    const t=g.label+' · '+g.distance+' M';if(t!==txt){txt=t;line.textContent=t;}
    if(g.hint!==hin){hin=g.hint;hint.textContent=g.hint;}
    const c=g.ahead?'ahead':g.behind?'behind':'turn';if(c!==cls){cls=c;arrow.className='xg-arrow '+c;}
    const ql=Math.round(g.edgeL*10),qr=Math.round(g.edgeR*10);
    if(ql!==eL){eL=ql;edgeL.hidden=ql<=0;edgeL.style.opacity=String(ql/10);}
    if(qr!==eR){eR=qr;edgeR.hidden=qr<=0;edgeR.style.opacity=String(qr/10);}
    if(g.behind!==behind){behind=g.behind;edgeL.classList.toggle('behind',behind);edgeR.classList.toggle('behind',behind);}
  }
  // v = missionView(run): {rows:[{id,text,state}],key}
  function setMission(v){
    if(!v){if(!mission.hidden){mission.hidden=true;missionKey='';}return;}
    if(mission.hidden)mission.hidden=false;
    if(v.key===missionKey)return;
    missionKey=v.key;
    while(rows.length<v.rows.length){const b=el('i',null,''),s=el('b',null,''),row=el('div','xg-step');row.append(b,s);mission.append(row);rows.push({row,b,s});}
    rows.forEach((x,i)=>{
      const d=v.rows[i];x.row.hidden=!d;if(!d)return;
      x.row.dataset.state=d.state;x.row.dataset.id=d.id;x.s.textContent=d.text;
      x.b.textContent=d.state==='done'?'✓':v.rows.length>1?String(i+1):d.state==='wait'?'…':'▶';
    });
  }
  function show(on){if(!on){set(null);setMission(null);}}
  return {set,setMission,show,get arrowShown(){return !arrow.hidden;},get missionText(){return rows.filter(x=>!x.row.hidden).map(x=>x.s.textContent).join(' › ');}};
}
