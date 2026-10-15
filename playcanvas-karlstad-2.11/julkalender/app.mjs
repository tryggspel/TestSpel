// Julkalenderns sida: bygger luckorna, öppnar dem och bockar av dem mot det spelaren gjort i Julklappsjakten (Julspelet).
// Spelet ändras inte. Allt som rör regler och avläsning ligger i rules.mjs, texterna i doors.mjs.
import {SEASON,STORAGE_KEY,RANKS,daysBetween,weekdayOf,shortDate,adventSundays,resolveToday,phaseOf,testModeFrom,doorAccess,readGame,Julkalender} from './rules.mjs?v=2.21.1-xmas.8';
import {DOORS,TYPES,KARLSTAD_CITY,gameLink} from './doors.mjs?v=2.21.1-xmas.8';
import {mountScene,treeSvg} from './scene.mjs?v=2.21.1-xmas.8';
import {startSnow} from './snow.mjs?v=2.21.1-xmas.8';

// Versionen är spelets (en cache-nyckel för hela bygget, se tools/set-version.mjs): den står i adressen till den här modulen.
const VERSION=(()=>{try{return new URL(import.meta.url).searchParams.get('v')||'';}catch{return '';}})();
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=n=>Number(n).toLocaleString('sv-SE');
const icon=id=>`<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const storage=(()=>{try{const s=window.localStorage;s.setItem('__julspelet','1');s.removeItem('__julspelet');return s;}catch{return null;}})();

// ── Läge ─────────────────────────────────────────────────────────────────────────────────────────────────────
const search=location.search;
const test=testModeFrom(search,storage);
const {day:today,simulated}=resolveToday(new Date(),search);
const preview=test||simulated;
const phase=phaseOf(today);
// Förhandsvisning har egen sparnyckel: då kan man klicka runt och prova allt utan att röra sina riktiga framsteg.
const cal=new Julkalender({doors:DOORS,storage,key:preview?STORAGE_KEY+':preview':STORAGE_KEY});
const isOpen=n=>doorAccess(n,today,test).open;
const ADVENT=adventSundays(SEASON.year).slice(1).map((d,i)=>[Number(d.slice(8)),['2:a','3:e','4:e'][i]]);

let current=0,lastTree='',lastFocus=null,lastSheet='';

// ── Rutnätet ─────────────────────────────────────────────────────────────────────────────────────────────────
function buildGrid(){
  $('grid').innerHTML=DOORS.map(d=>{
    const t=TYPES[d.typ],stars='★'.repeat(d.stjarnor);
    return `<li class="cell" data-n="${d.n}"><button type="button" class="door t-${d.typ}" data-n="${d.n}">
      <span class="inside">${icon(d.ikon||t.icon)}<span class="ttl">${esc(d.titel)}</span><span class="stars" aria-hidden="true">${stars}</span></span>
      <span class="leaf"><span class="num">${d.n}</span><span class="sub"></span></span>
      <span class="mark">${icon('check')}</span>
    </button></li>`;
  }).join('');
}
function doorState(d){
  const acc=doorAccess(d.n,today,test),done=cal.isDone(d.n);
  return {acc,done,locked:!acc.open&&!done,opened:cal.isOpened(d.n)||done};
}
function doorLabel(d,s){
  const when=`${weekdayOf(s.acc.opens)} ${shortDate(s.acc.opens)}`;
  if(s.done)return `Lucka ${d.n}, ${d.titel}. Klar.`;
  if(s.locked)return `Lucka ${d.n}, ${when}. Låst, öppnas om ${s.acc.daysLeft} ${s.acc.daysLeft===1?'dag':'dagar'}.`;
  if(s.opened)return `Lucka ${d.n}, ${d.titel}. Öppen, inte klar än.`;
  return `Lucka ${d.n}${s.acc.today?', dagens lucka':''}. Tryck för att öppna.`;
}
function updateGrid(fresh=[]){
  for(const d of DOORS){
    const s=doorState(d),cell=$('grid').children[d.n-1],btn=cell.firstElementChild;
    btn.classList.toggle('is-locked',s.locked);btn.classList.toggle('is-today',s.acc.today&&!s.done);
    btn.classList.toggle('is-open',s.opened&&!s.done);btn.classList.toggle('is-done',s.done);
    btn.setAttribute('aria-label',doorLabel(d,s));
    btn.querySelector('.sub').textContent=s.locked?shortDate(s.acc.opens):(s.acc.today&&!s.opened&&!s.done?'Idag':'');
    btn.querySelector('.mark').innerHTML=s.locked?icon('lock'):icon('check');
    if(fresh.includes(d.n)){cell.classList.add('fresh');setTimeout(()=>cell.classList.remove('fresh'),900);}
  }
}

// ── Framsteg, dagens lucka, träd och titlar ──────────────────────────────────────────────────────────────────
function renderProgress(){
  const r=cal.rank,pct=Math.round(cal.stars/cal.totalStars*100);
  $('progress').innerHTML=`<span class="pill">${icon('check')} ${cal.doneCount} av 24 luckor</span><span class="pill">${icon('star')} ${cal.stars} av ${cal.totalStars}</span><span class="pill rank">${esc(r.name)}</span><span class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${cal.totalStars}" aria-valuenow="${cal.stars}" aria-label="Stjärnor"><i style="width:${pct}%"></i></span>`;
}
function firstUndone(){return DOORS.find(d=>!cal.isDone(d.n)&&isOpen(d.n))||null;}
function renderToday(){
  const el=$('today'),n=Number(today.slice(8));let html='';
  const play=`<a class="btn gold" href="${gameLink(DOORS[0])}">${icon('play')} Öppna Julklappsjakten</a>`;
  if(test){
    const d=firstUndone();
    html=d?card(String(d.n),'Förhandsvisning',`Nästa lucka: ${d.titel}`,d.ledtrad,`<button type="button" class="btn gold" data-open="${d.n}">Öppna lucka ${d.n}</button>`,false)
      :card('★','Förhandsvisning','Alla luckor är klara',`Du har ${cal.stars} av ${cal.totalStars} stjärnor.`,`<a class="btn gold" href="#luckor">Visa luckorna</a>`,false);
  }else if(phase==='before'){
    const left=daysBetween(today,SEASON.first);
    html=card('1 dec','Första luckan',left===1?'Öppnas i morgon':`Öppnas om ${left} dagar`,'Julkalendern startar 1 december. Tills dess kan du värma upp i Julklappsjakten.',`${play} <button type="button" class="btn ghost" data-preview>Förhandsgranska</button>`,true);
  }else if(phase==='during'){
    const d=DOORS[n-1],done=cal.isDone(d.n),left=DOORS.filter(x=>x.n<n&&!cal.isDone(x.n)).length;
    const more=left?` Du har ${left} ${left===1?'öppen lucka':'öppna luckor'} kvar från tidigare dagar.`:'';
    html=done?card(String(d.n),'Dagens lucka · klar',d.titel,`Klar!${more||' Nästa lucka öppnas i morgon.'}`,`<button type="button" class="btn soft" data-open="${d.n}">Visa luckan</button>`,false)
      :card(String(d.n),'Dagens lucka',d.titel,d.ledtrad+more,`<button type="button" class="btn gold" data-open="${d.n}">Öppna lucka ${d.n}</button>`,false);
  }else{
    html=card('★','Julen är över','Alla luckor står öppna',`${cal.doneCount} av 24 klara. Hinner du ikapp finns luckorna kvar.`,`<a class="btn gold" href="#luckor">Visa luckorna</a>`,false);
  }
  el.innerHTML=html;
  function card(badge,k,h,p,actions,calm){
    const [a,b]=badge.length>2&&badge.includes(' ')?badge.split(' '):[badge,''];
    return `<div class="badge${calm?' calm':''}"><span>${esc(a)}${b?`<small>${esc(b)}</small>`:''}</span></div><div class="today-body"><p class="k">${esc(k)}</p><h2>${esc(h)}</h2><p>${esc(p)}</p>${actions}</div>`;
  }
}
function renderTree(fresh=[]){
  const done=new Set(DOORS.filter(d=>cal.isDone(d.n)).map(d=>d.n)),svg=treeSvg(done,{finale:cal.isDone(24)});
  if(svg!==lastTree){$('tree').innerHTML=svg+`<figcaption>${done.size} av 24 lampor tänds${cal.isDone(24)?' · stjärnan lyser':''}</figcaption>`;lastTree=svg;}
  for(const n of fresh)$('tree').querySelector(`.bulb[data-n="${n}"]`)?.classList.add('fresh');
}
function renderRanks(){
  $('rank-list').innerHTML=RANKS.map((r,i)=>{
    const got=cal.stars>=r.min,now=cal.rank.index===i;
    return `<li class="${got?'got':''}${now?' now':''}">${icon('star')}<span>${esc(r.name)}</span><small>${r.min} ★</small></li>`;
  }).join('');
  $('total-stars').textContent=cal.totalStars;
}
function renderBanner(){
  const b=$('banner');
  if(!preview){b.hidden=true;return;}
  b.hidden=false;
  b.innerHTML=test?`<b>Förhandsvisning.</b> Alla luckor är öppna så att du kan prova dem. Dina riktiga framsteg påverkas inte.`:`<b>Simulerat datum: ${esc(weekdayOf(today))} ${esc(shortDate(today))}.</b> Dina riktiga framsteg påverkas inte.`;
  b.innerHTML+=` <button type="button" class="chip" data-exit>Avsluta förhandsvisning</button>`;
}
function render(fresh=[]){
  renderProgress();renderToday();renderTree(fresh);renderRanks();renderBanner();updateGrid(fresh);
  $('btn-test').textContent=test?'Avsluta förhandsvisning':'Förhandsvisa alla luckor';
  if(sheet.open&&current&&sheetHtml(current)!==lastSheet)fillSheet(current);
}

// ── Luckan ───────────────────────────────────────────────────────────────────────────────────────────────────
const sheet=$('sheet');
function progressView(d){
  const game=readGame(storage),ev=cal.progress(d.n,game);if(!ev)return '';
  const one=(c,e)=>{
    const u=c.unit?' '+c.unit:'';
    switch(c.kind){
      case 'count':case 'stamps':return {text:`${nf(e.have)} av ${nf(e.need)}${u}`,ratio:e.have/e.need};
      case 'points':return {text:`${nf(e.raw)} av ${nf(e.need)}${u}`,ratio:Math.min(1,e.raw/e.need)};
      case 'rush':return {text:e.raw?`Högsta klarade rush: ${nf(e.raw)} (målet är Rush ${nf(e.need)}).`:'Ingen rush klarad än.',ratio:Math.min(1,e.raw/e.need)};
      case 'rushPoints':return {text:`Bästa poäng i rushen: ${nf(e.raw)} av ${nf(e.need)}${u}`,ratio:Math.min(1,e.raw/e.need)};
      case 'rushStars':return {text:`Flest stjärnor i en rush: ${nf(e.raw)} av ${nf(e.need)}.`,ratio:Math.min(1,e.raw/e.need)};
      case 'marathon':return {text:`Högsta tempo i Maraton: ${nf(e.raw)} av ${nf(e.need)}.`,ratio:Math.min(1,e.raw/e.need)};
      case 'zombies':return {text:e.raw?`Högsta klarade nivå: ${nf(e.raw)} (målet är nivå ${nf(e.need)}).`:'Ingen nivå klarad än.',ratio:Math.min(1,e.raw/e.need)};
      case 'stamp':return {text:'Julstämpeln saknas.',ratio:0};
      case 'name':return {text:'Inget namn sparat på topplistan än.',ratio:0};
      default:return {text:'',ratio:0};
    }
  };
  if(d.check.kind==='all'){
    return `<ul class="parts">${ev.parts.map((p,i)=>{const c=d.check.of[i],o=one(c,p);return `<li class="${p.done?'yes':'no'}">${icon(p.done?'check':'flag')}<span><b>${esc(c.label)}</b>${p.done?'':' · '+esc(o.text)}</span></li>`;}).join('')}</ul>`;
  }
  const o=one(d.check,ev);
  return o.text?`<div class="meter" aria-hidden="true"><i style="width:${Math.round(o.ratio*100)}%"></i></div><span>${esc(o.text)}</span>`:'';
}
function sheetHtml(n){
  const d=DOORS[n-1],s=doorState(d),t=TYPES[d.typ],adv=ADVENT.find(a=>a[0]===n);
  const top=(tag)=>`<div class="sheet-top"><div class="d-num" aria-hidden="true">${n}</div><div class="d-meta">${tag}<span class="d-date">${esc(weekdayOf(s.acc.opens))} ${esc(shortDate(s.acc.opens))}${adv?` · ${adv[1]} advent`:''}</span></div><button type="button" class="x" data-act="close" aria-label="Stäng">×</button></div>`;
  const nav=`<div class="nav"><button type="button" data-go="${n-1}" ${n<=1?'disabled':''}>← Lucka ${n-1}</button><button type="button" data-go="${n+1}" ${n>=24?'disabled':''}>Lucka ${n+1} →</button></div>`;
  if(s.locked){
    const days=s.acc.daysLeft;
    return `<div class="paper">${top(`<span class="tag">${icon('lock')} Låst</span>`)}<h3 id="sheet-title">Lucka ${n} öppnas ${esc(weekdayOf(s.acc.opens))} ${esc(shortDate(s.acc.opens))}</h3>
      <div class="teaser"><p class="big">${days===1?'Om en dag':`Om ${days} dagar`}</p><p>Ledtråd: ${esc(d.ledtrad)}</p></div>${nav}</div>`;
  }
  const tag=`<span class="tag">${icon(d.ikon||t.icon)} ${esc(t.label)}</span>${d.demo?'<span class="tag demo">Demo</span>':''}`;
  let status;
  if(s.done){
    const manual=cal.how(n)==='manual';
    status=`<div class="status ok"><strong>${icon('check')} Klar</strong>${manual?'Markerad av dig.':'Kalendern hittade resultatet i ditt spel.'} Du fick ${d.stjarnor} ${d.stjarnor===1?'stjärna':'stjärnor'}.</div>`;
  }else if(d.check.kind==='manual'){
    status=`<div class="status"><strong>Markeras av dig</strong>Det här uppdraget sparas inte i spelet. Gör uppdraget och tryck sedan på knappen.</div>`;
  }else{
    status=`<div class="status"><strong>Inte klar ännu</strong>${progressView(d)}</div>`;
  }
  const primary=`<a class="btn ${s.done?'soft':'primary'}" href="${esc(gameLink(d))}">${icon('play')} ${esc(d.spel.knapp)}</a>`;
  const extra=!s.done&&d.check.kind==='manual'?`<button type="button" class="btn gold" data-act="manual">${icon('check')} Jag klarade det</button>`:'';
  const fine=s.done?(cal.how(n)==='manual'?`<p class="fine"><button type="button" data-act="unmark">Ångra markeringen</button></p>`:''):d.check.kind==='manual'?'':`<p class="fine">Kalendern bockar av luckan själv när du kommer tillbaka hit. Klarade du den men ser ingen bock? <button type="button" data-act="manual">Markera själv</button>.</p>`;
  return `<div class="paper">${top(tag)}<h3 id="sheet-title">${esc(d.titel)}</h3><p class="place">${esc(d.plats)} · ${'★'.repeat(d.stjarnor)}</p>
    <p class="story">${esc(d.story)}</p>
    <div class="goal"><b>Mål</b>${esc(d.mal)}</div>
    <h4>Så gör du</h4><ol class="todo">${d.steg.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
    ${d.spel.valj?`<p class="use">Knappen går rakt till uppdraget i spelet. Hittar du inte dit: tryck <b>${esc(d.spel.valj)}</b>.</p>`:''}
    ${status}
    <div class="cta">${primary}${extra}</div>
    ${d.demo?`<p class="demo-note"><b>Demo.</b> Butiksplatsen är en demonstration i spelet. Inget samarbete eller erbjudande är bekräftat.</p>`:''}
    ${fine}${nav}</div>`;
}
function fillSheet(n){
  const had=sheet.contains(document.activeElement);
  lastSheet=sheetHtml(n);sheet.innerHTML=lastSheet;current=n;
  // Knappen man tryckte på försvann när innehållet ritades om: lämna inte fokus i luften.
  if(sheet.open&&had&&!sheet.contains(document.activeElement))sheet.querySelector('.x')?.focus({preventScroll:true});
}
function showSheet(n){
  lastFocus=document.activeElement;fillSheet(n);
  if(!sheet.open){
    try{sheet.showModal();}catch{sheet.setAttribute('open','');}
    document.documentElement.style.overflow='hidden';
  }
  sheet.querySelector('.x')?.focus({preventScroll:true});
  sheet.querySelector('.paper')?.scrollTo(0,0);
}
function closeSheet(){
  if(sheet.open){try{sheet.close();}catch{sheet.removeAttribute('open');}}
  document.documentElement.style.overflow='';current=0;
  if(lastFocus&&document.contains(lastFocus))lastFocus.focus({preventScroll:true});
}
function openDoor(n){
  const d=DOORS[n-1];if(!d)return;
  const s=doorState(d);
  if(!s.locked&&!cal.isOpened(n)&&!s.done){
    cal.open(n);updateGrid();renderToday();
    if(!reduced){setTimeout(()=>showSheet(n),380);return;}
  }
  showSheet(n);
}

// ── Avläsning och meddelanden ────────────────────────────────────────────────────────────────────────────────
let toastTimer=0;
function toast(msg,ms=3200){
  const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),ms);
}
function sync({quiet=false}={}){
  const newly=cal.refresh(readGame(storage),{day:today,isOpen});
  render(newly);
  if(newly.length&&!quiet){
    const stars=newly.reduce((s,n)=>s+DOORS[n-1].stjarnor,0);
    toast(newly.length===1?`Lucka ${newly[0]} klar! +${stars} ${stars===1?'stjärna':'stjärnor'}. En lampa tänds på granen.`:`${newly.length} luckor klara! +${stars} stjärnor.`,4200);
  }
  return newly;
}
let syncTimer=0;
const syncSoon=()=>{clearTimeout(syncTimer);syncTimer=setTimeout(()=>sync(),120);};

// ── Händelser ────────────────────────────────────────────────────────────────────────────────────────────────
$('grid').addEventListener('click',e=>{const b=e.target.closest('.door');if(b)openDoor(Number(b.dataset.n));});
$('today').addEventListener('click',e=>{
  const o=e.target.closest('[data-open]');if(o)openDoor(Number(o.dataset.open));
  if(e.target.closest('[data-preview]'))location.search='?test';
});
$('banner').addEventListener('click',e=>{if(e.target.closest('[data-exit]'))exitPreview();});
sheet.addEventListener('click',e=>{
  if(e.target===sheet)return closeSheet();
  const go=e.target.closest('[data-go]');if(go){const n=Number(go.dataset.go);if(n>=1&&n<=24)openDoor(n);return;}
  const act=e.target.closest('[data-act]')?.dataset.act;
  if(act==='close')closeSheet();
  if(act==='manual'&&current){cal.markManual(current,today);render([current]);toast(`Lucka ${current} markerad som klar.`);}
  if(act==='unmark'&&current){cal.unmarkManual(current);render();}
});
sheet.addEventListener('close',()=>{document.documentElement.style.overflow='';current=0;});
sheet.addEventListener('cancel',()=>{document.documentElement.style.overflow='';});
function exitPreview(){location.href=location.pathname+'?test=0';}
$('btn-test').addEventListener('click',()=>{if(test)exitPreview();else location.search='?test';});
$('btn-reset').addEventListener('click',()=>{
  if(!confirm('Börja om? Dina klara luckor och stjärnor i kalendern nollställs. Inget i spelet ändras.'))return;
  cal.reset();sync({quiet:true});toast('Kalendern är nollställd.');
});
$('btn-share').addEventListener('click',async()=>{
  const url=location.origin+location.pathname,text=`Jag har klarat ${cal.doneCount} av 24 luckor (${cal.stars} stjärnor) i Karlstads Julkalender. Prova du också!`;
  try{if(navigator.share){await navigator.share({title:'Karlstads Julkalender',text,url});return;}}catch(e){if(e&&e.name==='AbortError')return;}
  try{await navigator.clipboard.writeText(`${text} ${url}`);toast('Länken är kopierad.');}catch{toast(url,6000);}
});
// Spelet skriver sina resultat i samma webbläsare. Läs av igen när man kommer tillbaka (flikbyte, bakåtknapp) eller när en annan flik sparar.
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncSoon();});
window.addEventListener('pageshow',syncSoon);window.addEventListener('focus',syncSoon);window.addEventListener('storage',syncSoon);

// ── Start ────────────────────────────────────────────────────────────────────────────────────────────────────
$('ver').textContent='v'+VERSION;
$('link-city').href=KARLSTAD_CITY;$('link-city-wrap').hidden=false;
buildGrid();
mountScene($('scene'),{onPhoto:src=>{
  fetch(src.replace(/[^/]+$/,'credit.txt')).then(r=>r.ok?r.text():'').then(t=>{if(t.trim())$('credit').textContent='Foto: '+t.trim().slice(0,300);}).catch(()=>{});
}});
startSnow($('snow'),{reduced});
sync({quiet:true});
// För test och demo: window.Julkalender visar tillståndet utan att ändra något.
window.Julkalender=Object.freeze({version:VERSION,today,preview,snapshot:()=>({done:DOORS.filter(d=>cal.isDone(d.n)).map(d=>d.n),stars:cal.stars,rank:cal.rank.name,baseline:{...cal.baseline}})});
