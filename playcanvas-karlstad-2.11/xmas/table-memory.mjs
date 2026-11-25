// DUKA JULBORDET på Cervera (2.21.1-xmas.16): ett minnesspel efter porslinsjakten. Rut dukar julbordet en kort stund, sedan plockar hon undan
// och du dukar ur minnet: tryck på en sak i brickan och sedan på platsen på bordet. Rätt plats låses (grön), fel plats ger ett fel och saken går tillbaka.
// Tre bord som blir större (3, 5 och 7 saker), kortare tid att titta och fler lockbeten i brickan. En stjärna per bord som dukas klart i tid med högst ett fel.
// Ren modul: ingen DOM. Slumpen kommer utifrån (rand).
export const TABLE_ITEMS=Object.freeze([
  {id:'kopp',name:'KOPP',art:'kopp'},{id:'kanna',name:'KANNA',art:'kanna'},{id:'fat',name:'FAT',art:'fat'},{id:'lussebulle',name:'LUSSEBULLE',art:'lussebulle'},
  {id:'pepparkaka',name:'PEPPARKAKA',art:'pepparkaka'},{id:'glogg',name:'GLÖGG',art:'glogg'},{id:'choklad',name:'CHOKLAD',art:'choklad'},{id:'kanelbulle',name:'KANELBULLE',art:'kanelbulle'}
].map(o=>Object.freeze(o)));
export const TABLE=Object.freeze({
  spots:8,                                                   // två rader med fyra platser
  rounds:Object.freeze([{items:3,show:4,seconds:20,decoys:0},{items:5,show:5,seconds:28,decoys:1},{items:7,show:6,seconds:36,decoys:2}].map(o=>Object.freeze(o))),
  points:Object.freeze({right:100,wrong:-30,perSecond:8,clean:150}),
  maxWrongForStar:1
});
export function createTableGame({rand=Math.random,cfg=TABLE}={}){
  const g={round:0,phase:'ready',t:0,left:0,show:0,score:0,stars:0,wrong:0,roundWrong:0,layout:[],tray:[],placed:[],selected:null,results:[],events:[],over:false};
  const emit=e=>g.events.push(e);
  const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  function setup(){
    const R=cfg.rounds[g.round],ids=shuffle(TABLE_ITEMS.map(i=>i.id)),use=ids.slice(0,R.items),spots=shuffle([...Array(cfg.spots).keys()]).slice(0,R.items);
    g.layout=Array(cfg.spots).fill(null);use.forEach((id,k)=>{g.layout[spots[k]]=id;});
    g.tray=shuffle([...use,...ids.slice(R.items,R.items+R.decoys)]);g.placed=Array(cfg.spots).fill(null);g.selected=null;g.roundWrong=0;
    g.phase='show';g.show=R.show;g.left=R.seconds;emit({type:'show',round:g.round+1,items:R.items});
  }
  function start(){if(g.phase==='ready'||g.phase==='between')setup();}
  function select(itemId){if(g.phase!=='play'||!g.tray.includes(itemId))return false;g.selected=g.selected===itemId?null:itemId;return true;}
  // Lägg den valda saken på platsen spot.
  function place(spot){
    if(g.phase!=='play'||g.selected==null||spot<0||spot>=cfg.spots||g.placed[spot])return {ok:false};
    const id=g.selected;
    if(g.layout[spot]===id){g.placed[spot]=id;g.tray.splice(g.tray.indexOf(id),1);g.selected=null;g.score+=cfg.points.right;emit({type:'right',spot,item:id});
      if(g.layout.every((x,k)=>!x||g.placed[k]===x))finishRound(true);return {ok:true};}
    g.wrong++;g.roundWrong++;g.score=Math.max(0,g.score+cfg.points.wrong);g.selected=null;emit({type:'wrong',spot,item:id});return {ok:false,wrong:true};
  }
  function finishRound(done){
    const star=done&&g.roundWrong<=cfg.maxWrongForStar;
    if(done){g.score+=Math.round(g.left*cfg.points.perSecond);if(g.roundWrong===0)g.score+=cfg.points.clean;}
    if(star)g.stars++;
    g.results.push({round:g.round+1,done,wrong:g.roundWrong,star});emit({type:'round',round:g.round+1,done,star,wrong:g.roundWrong});
    g.round++;
    if(g.round>=cfg.rounds.length){g.phase='over';g.over=true;emit({type:'over',score:g.score,stars:g.stars});}else g.phase='between';
  }
  function step(dt){
    if(!(dt>0)||g.over)return;dt=Math.min(dt,.25);g.t+=dt;
    if(g.phase==='show'){g.show-=dt;if(g.show<=0){g.phase='play';emit({type:'play'});}}
    else if(g.phase==='play'){g.left-=dt;if(g.left<=0){g.left=0;finishRound(false);}}
  }
  const drain=()=>{const e=g.events;g.events=[];return e;};
  return {state:g,start,select,place,step,drain};
}
export const TABLE_KEY='karlstad-xmas:julbordet:1';
export const blankTable=()=>({v:1,best:0,stars:0,plays:0});
export function sanitizeTable(raw){const o=blankTable();if(!raw||typeof raw!=='object')return o;
  for(const k of ['best','plays']){const v=Math.floor(Number(raw[k]));if(Number.isFinite(v)&&v>=0&&v<1e7)o[k]=v;}const s=Math.floor(Number(raw.stars));if(s>=0&&s<=3)o.stars=s;return o;}
export function recordTable(st,{score,stars}){st.plays++;const rec=score>st.best;if(rec)st.best=score;st.stars=Math.max(st.stars,stars);return rec;}
