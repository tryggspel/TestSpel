// 2.21.2: Julknappen. Grundspelet har en knapp bredvid TempoRush som öppnar Julklappsjakten (en egen spelversion med egen adress) i samma flik.
// Ingen iframe och ingen andra spelmotor: knappen är en vanlig navigering, och julversionen har en knapp tillbaka hit.
//
// Så här stänger du av knappen igen: sätt enabled till false (eller töm url). Knappen göms då helt och inget annat i spelet ändras.
// Så här kopplar du in den: kontrollera att adressen nedan öppnar rätt spel (version och commit syns längst ned i startvyn) och sätt enabled till true.
// Se JULKNAPPEN.md.
export const JULKNAPP=Object.freeze({
  enabled:false,   // true först när julversionens stabila adress är verifierad
  url:'https://karlstad-julklappsjakten.vercel.app/', // julversionens stabila produktionsadress (Vercel-projektet karlstad-julklappsjakten), inga användaruppgifter
  label:'JULKLAPPSJAKTEN 🎁'
});
const LOCAL=/^(localhost|127\.0\.0\.1)$/;
// Vart knappen ska leda, eller null om den ska vara dold. Under utveckling kan en lokal adress anges med ?julknapp=http://localhost:PORT/ (bara med ?debug).
export function julTarget(config=JULKNAPP,{search='',host=''}={}){
  try{
    const q=new URLSearchParams(search);
    if(LOCAL.test(host)&&q.has('debug')&&q.get('julknapp')){
      const u=new URL(q.get('julknapp'));
      if(u.protocol==='http:'&&LOCAL.test(u.hostname))return {url:u.href,debug:true};
    }
    if(!config?.enabled||!config.url)return null;
    const u=new URL(config.url);
    if(u.protocol!=='https:'||u.username||u.password||!u.hostname.includes('.'))return null;
    return {url:u.href,debug:false};
  }catch{return null;}
}
