/* Local, non-monetary mastery. No streak penalties, paid boosts or network claims. */
window.KarlstadProgression=function(storage){
 const key='karlstad-survivor-v1',skins=[{id:'solar',name:'SOLGULD',xp:0,color:'#c8d0c1'},{id:'river',name:'ÄLVIS',xp:1500,color:'#63d9ef'},{id:'dawn',name:'GRYNING',xp:4500,color:'#edac7c'}];
 let data={xp:0,runs:0,wins:0,best:0,bestCombo:0,skin:'solar',awards:[]};
 try{const v=JSON.parse(storage.getItem(key));if(v){for(const k of ['xp','runs','wins','best','bestCombo'])if(Number.isSafeInteger(v[k])&&v[k]>=0)data[k]=v[k];if(skins.some(s=>s.id===v.skin&&s.xp<=data.xp))data.skin=v.skin;data.awards=Array.isArray(v.awards)?v.awards.filter(x=>typeof x==='string').slice(-30):[];}}catch{}
 const persist=()=>{try{storage.setItem(key,JSON.stringify(data));return true}catch{return false}};
 function award(id,state){if(!state.finished||data.awards.includes(id))return {gained:0,saved:true};const gained=Math.max(0,Math.floor(state.points/5))+state.powered*50+(state.won?250:0);data.xp+=gained;data.runs++;data.wins+=state.won?1:0;data.best=Math.max(data.best,Math.floor(state.points));data.bestCombo=Math.max(data.bestCombo,state.peakCombo||0);data.awards.push(id);data.awards=data.awards.slice(-30);return {gained,saved:persist()};}
 function select(id){if(!skins.some(s=>s.id===id&&s.xp<=data.xp))return false;data.skin=id;persist();return true;}
 function snapshot(){const level=Math.floor(Math.sqrt(data.xp/200))+1,start=200*(level-1)**2,end=200*level**2;return {...data,awards:undefined,level,progress:(data.xp-start)/(end-start),next:end,skin:skins.find(s=>s.id===data.skin),skins:skins.map(s=>({...s,unlocked:data.xp>=s.xp}))};}
 return {award,select,get state(){return snapshot()}};
};
