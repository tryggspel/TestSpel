// Kalenderns bakgrund. Om det finns ett foto i img/ (se img/README.md) används det.
// Annars ritas en illustrerad vinterkväll i Karlstad: Östra bron, Domkyrkan, Rådhuset, Sandgrund och Stora Torget med sin gran.
// Allt är kod (ingen bildfil), deterministiskt och billigt att rita.
export const PHOTO_CANDIDATES=Object.freeze(['img/karlstad-snow.webp','img/karlstad-snow.jpg']);
const W=1600,H=900;
const rng=seed=>{let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};};
const f=n=>Math.round(n*10)/10;

// En gran av tre lager med snö på grenarna.
function pine(x,base,h,w,fill='#16304f',snow='#dbe8ff'){
  const tiers=3,out=[];
  for(let i=0;i<tiers;i++){
    const top=base-h+i*h*.26,bot=base-h*(1-(i+1)*.3)+h*.12,half=w*(.42+i*.3)/2;
    out.push(`<path d="M${f(x)} ${f(top)}L${f(x-half)} ${f(bot)}L${f(x+half)} ${f(bot)}Z" fill="${fill}"/>`);
    if(snow)out.push(`<path d="M${f(x)} ${f(top)}L${f(x-half*.55)} ${f(top+(bot-top)*.55)}Q${f(x-half*.2)} ${f(top+(bot-top)*.42)} ${f(x)} ${f(top+(bot-top)*.5)}Q${f(x+half*.2)} ${f(top+(bot-top)*.42)} ${f(x+half*.55)} ${f(top+(bot-top)*.55)}Z" fill="${snow}" opacity=".9"/>`);
  }
  out.push(`<rect x="${f(x-w*.04)}" y="${f(base-h*.12)}" width="${f(w*.08)}" height="${f(h*.14)}" fill="#2a2036"/>`);
  return out.join('');
}
// Rader med fönster. lit = andel som lyser.
function windows(x,y,cols,rows,cw,ch,gx,gy,rand,lit=.55,arch=false){
  const out=[];
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const on=rand()<lit,wx=x+c*(cw+gx),wy=y+r*(ch+gy),fill=on?'#ffd37a':'#243a66';
    out.push(arch?`<path d="M${f(wx)} ${f(wy+ch)}V${f(wy+cw/2)}a${f(cw/2)} ${f(cw/2)} 0 0 1 ${f(cw)} 0V${f(wy+ch)}Z" fill="${fill}"/>`:`<rect x="${f(wx)}" y="${f(wy)}" width="${cw}" height="${ch}" rx="1" fill="${fill}"/>`);
  }
  return out.join('');
}
const lamp=(x,y,h=64)=>`<g><rect x="${x-1.5}" y="${y-h}" width="3" height="${h}" fill="#1b2442"/><circle cx="${x}" cy="${y-h}" r="40" fill="url(#glow)"/><circle cx="${x}" cy="${y-h}" r="5" fill="#ffe9ad"/></g>`;

export function sceneSvg(){
  const rand=rng(2026);let s='';
  // Himmel, stjärnor och måne
  s+=`<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050f26"/><stop offset=".38" stop-color="#112653"/><stop offset=".7" stop-color="#3a5694"/><stop offset=".88" stop-color="#b98b9e"/><stop offset="1" stop-color="#f1c59b"/></linearGradient>
    <linearGradient id="river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c3868"/><stop offset="1" stop-color="#0a1731"/></linearGradient>
    <linearGradient id="snowg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef4ff"/><stop offset=".5" stop-color="#c3d5f3"/><stop offset="1" stop-color="#8da6d6"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="#ffd98f" stop-opacity=".85"/><stop offset=".45" stop-color="#ffb85a" stop-opacity=".25"/><stop offset="1" stop-color="#ffb85a" stop-opacity="0"/></radialGradient>
    <radialGradient id="moon"><stop offset="0" stop-color="#fff7e0" stop-opacity=".9"/><stop offset=".25" stop-color="#fff0c8" stop-opacity=".35"/><stop offset="1" stop-color="#fff0c8" stop-opacity="0"/></radialGradient>
  </defs>`;
  s+=`<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  for(let i=0;i<90;i++){const x=rand()*W,y=rand()*420,r=.5+rand()*1.4;s+=`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="#fff" opacity="${f(.3+rand()*.6)}"/>`;}
  s+=`<circle cx="1030" cy="150" r="190" fill="url(#moon)"/><circle cx="1030" cy="150" r="42" fill="#fff4d6"/>`;
  // Fjärran åsar med skog
  s+=`<path d="M0 640Q180 585 360 625T720 610T1080 628T1440 600L1600 618V760H0Z" fill="#2c4073"/>`;
  for(let x=-10;x<W;x+=22){const y=612+Math.sin(x/130)*14+rand()*10;s+=pine(x,y+24,28+rand()*20,14,'#1a2c58',null);}
  s+=`<path d="M0 690Q240 650 480 678T960 668T1440 676L1600 664V780H0Z" fill="#3f5a92"/>`;
  s+=`<path d="M0 690Q240 650 480 678T960 668T1440 676L1600 664V672Q1440 684 960 676T480 686T0 698Z" fill="#a9bde6" opacity=".55"/>`;

  // Staden. Baslinje y=735 (vid vattnet).
  const base=735;let b='';
  // Gamla lågbebyggelsen längst till vänster
  const houses=[[0,92,70,'#c98b5a'],[86,86,58,'#d9b57a'],[176,78,76,'#b9735a']];
  for(const [x,w,h,c] of houses){b+=`<rect x="${x}" y="${base-h}" width="${w}" height="${h}" fill="${c}"/><path d="M${x-4} ${base-h}L${x+w/2} ${base-h-26}L${x+w+4} ${base-h}Z" fill="#3a3550"/><path d="M${x+2} ${base-h-2}L${x+w/2} ${base-h-23}L${x+w-2} ${base-h-2}Q${x+w/2} ${base-h-9} ${x+2} ${base-h-2}Z" fill="#eef4ff"/>`+windows(x+10,base-h+14,Math.floor((w-14)/22),2,10,14,12,16,rand,.6);}
  // Sandgrund: låg, vit, glasad, orange skylt på taket
  b+=`<rect x="262" y="${base-70}" width="230" height="70" fill="#e9ecf3"/><rect x="258" y="${base-74}" width="238" height="8" fill="#f2f6ff"/><rect x="274" y="${base-52}" width="206" height="44" fill="#1d3156"/>`+windows(280,base-48,9,1,18,36,4,0,rand,.85)+`<rect x="316" y="${base-100}" width="130" height="26" rx="3" fill="#e8742c"/><text x="381" y="${base-81}" font-family="Georgia,serif" font-weight="700" font-size="17" letter-spacing="3" text-anchor="middle" fill="#fff4e0">SANDGRUND</text><rect x="330" y="${base-74}" width="3" height="8" fill="#6b3a1d"/><rect x="430" y="${base-74}" width="3" height="8" fill="#6b3a1d"/>`;
  // Rådhuset: tre våningar, mittparti, mörkt tak med snö
  b+=`<rect x="540" y="${base-150}" width="270" height="150" fill="#d9c58a"/><rect x="620" y="${base-182}" width="110" height="40" fill="#cdb87a"/><path d="M528 ${base-150}L675 ${base-196}L822 ${base-150}Z" fill="#3b3a52"/><path d="M536 ${base-153}L675 ${base-192}L814 ${base-153}Q675 ${base-170} 536 ${base-153}Z" fill="#f2f6ff"/>`
    +`<path d="M636 ${base-182}L675 ${base-226}L714 ${base-182}Z" fill="#3b3a52"/><path d="M642 ${base-184}L675 ${base-221}L708 ${base-184}Z" fill="#f2f6ff" opacity=".85"/><circle cx="675" cy="${base-165}" r="13" fill="#f4efe0" stroke="#3b3a52" stroke-width="3"/><path d="M675 ${base-165}V${base-174}M675 ${base-165}L682 ${base-162}" stroke="#3b3a52" stroke-width="2.2"/>`
    +windows(556,base-132,11,3,14,22,9,16,rand,.62,true)+`<rect x="652" y="${base-34}" width="46" height="34" rx="23" fill="#2b2a44"/>`;
  // Torget: öppen yta med stor julgran och lyktor
  b+=`<rect x="810" y="${base-6}" width="150" height="6" fill="#dfe9ff" opacity=".7"/>`;
  b+=`<circle cx="885" cy="${base-90}" r="120" fill="url(#glow)" opacity=".55"/>`+pine(885,base,150,88,'#12472f','#e9f2ff');
  // Domkyrkan: vit kyrka med torn och mörk spira
  b+=`<rect x="1090" y="${base-120}" width="160" height="120" fill="#efe9d8"/><path d="M1080 ${base-120}L1170 ${base-176}L1260 ${base-120}Z" fill="#363650"/><path d="M1088 ${base-122}L1170 ${base-170}L1252 ${base-122}Q1170 ${base-138} 1088 ${base-122}Z" fill="#f2f6ff"/>`
    +`<rect x="1010" y="${base-262}" width="76" height="262" fill="#f1ecdc"/><rect x="1016" y="${base-284}" width="64" height="26" fill="#e6dfc9"/>`
    +`<path d="M1004 ${base-284}L1048 ${base-388}L1092 ${base-284}Z" fill="#3a4a58"/><path d="M1014 ${base-286}L1048 ${base-370}L1082 ${base-286}Z" fill="#4c7a73" opacity=".7"/><path d="M1048 ${base-388}V${base-414}M1040 ${base-402}H1056" stroke="#d7b86a" stroke-width="3"/>`
    +`<circle cx="1048" cy="${base-215}" r="17" fill="#fbf6e6" stroke="#8a7d57" stroke-width="3"/><path d="M1048 ${base-215}V${base-228}M1048 ${base-215}L1057 ${base-211}" stroke="#4a4030" stroke-width="2.4"/>`
    +`<rect x="1030" y="${base-268}" width="10" height="26" rx="5" fill="#cbbd96"/><rect x="1056" y="${base-268}" width="10" height="26" rx="5" fill="#cbbd96"/>`
    +windows(1108,base-92,6,1,14,40,10,0,rand,.8,true)+windows(1030,base-170,2,1,14,28,12,0,rand,.6,true)+`<rect x="1260" y="${base-66}" width="60" height="66" fill="#e8e0cc"/><path d="M1254 ${base-66}L1290 ${base-98}L1326 ${base-66}Z" fill="#363650"/>`;
  // Moderna kvarter åt höger
  const blocks=[[1330,96,200,'#8d86a3'],[1432,88,248,'#b09a86'],[1528,90,190,'#7e8cab']];
  for(const [x,w,h,c] of blocks){b+=`<rect x="${x}" y="${base-h}" width="${w}" height="${h}" fill="${c}"/><rect x="${x-3}" y="${base-h-8}" width="${w+6}" height="10" fill="#eef4ff"/>`+windows(x+10,base-h+18,Math.floor((w-14)/20),Math.floor((h-30)/34),11,18,9,16,rand,.5);}
  s+=b;
  // Ljusglöd från fönster mot dimman
  s+=`<rect x="0" y="${base-24}" width="${W}" height="30" fill="#f3c79a" opacity=".12"/>`;

  // Klarälven med is och reflexer
  s+=`<rect x="0" y="${base}" width="${W}" height="95" fill="url(#river)"/>`;
  for(let i=0;i<46;i++){const x=rand()*W,y=base+8+rand()*78;s+=`<rect x="${f(x)}" y="${f(y)}" width="${f(30+rand()*120)}" height="2" rx="1" fill="#9fc0ee" opacity="${f(.08+rand()*.2)}"/>`;}
  for(const x of [330,560,690,885,1080,1180,1400,1520]){s+=`<rect x="${x-2}" y="${base+2}" width="4" height="${50+Math.floor(rand()*30)}" fill="#ffc874" opacity=".16"/>`;}
  // Östra bron: stenbro med valv, snö på bröstvärnet och lyktor
  const deckY=base+4;
  s+=`<rect x="-10" y="${deckY}" width="760" height="40" fill="#3b4366"/><rect x="-10" y="${deckY-20}" width="760" height="22" fill="#4a5379"/><rect x="-10" y="${deckY-26}" width="760" height="10" rx="4" fill="#eef4ff"/>`;
  for(let i=0;i<6;i++){const x=i*124+16;s+=`<path d="M${x} ${deckY+46}V${deckY+26}a46 34 0 0 1 92 0V${deckY+46}Z" fill="url(#river)"/><path d="M${x} ${deckY+46}V${deckY+26}a46 34 0 0 1 92 0V${deckY+46}" fill="none" stroke="#2d3454" stroke-width="5"/>`;}
  s+=`<rect x="-10" y="${deckY+40}" width="760" height="8" fill="#2d3454"/>`;
  for(const x of [70,260,450,640])s+=lamp(x,deckY-24,52);
  s+=`<g opacity=".55"><rect x="0" y="${deckY+48}" width="750" height="40" fill="#0e1b3a"/></g>`;

  // Snötäckt strand i förgrunden
  s+=`<path d="M0 ${base+78}Q200 ${base+52} 430 ${base+84}T860 ${base+78}T1300 ${base+90}T1600 ${base+70}V${H}H0Z" fill="url(#snowg)"/>`;
  s+=`<path d="M0 ${base+110}Q320 ${base+88} 640 ${base+114}T1280 ${base+106}T1600 ${base+120}V${H}H0Z" fill="#dfe9fb" opacity=".8"/>`;
  s+=`<path d="M0 ${base+150}Q400 ${base+128} 800 ${base+152}T1600 ${base+140}V${H}H0Z" fill="#b6c9ec" opacity=".65"/>`;
  for(let i=0;i<70;i++){s+=`<circle cx="${f(rand()*W)}" cy="${f(base+90+rand()*(H-base-90))}" r="${f(.8+rand()*1.6)}" fill="#fff" opacity="${f(.4+rand()*.5)}"/>`;}
  // Lyktor och förgrundsgranar
  s+=lamp(780,base+96,86)+lamp(1330,base+104,92);
  s+=pine(70,H+10,330,150,'#0f2748','#f2f7ff')+pine(210,H+20,240,110,'#143055','#f2f7ff');
  s+=pine(1530,H+10,350,160,'#0f2748','#f2f7ff')+pine(1400,H+24,230,104,'#143055','#f2f7ff');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" focusable="false" aria-hidden="true">${s}</svg>`;
}

// Lägger scenen i elementet. Provar fotona i tur och ordning och byter bara om ett riktigt foto laddas.
export function mountScene(el,{photos=PHOTO_CANDIDATES,onPhoto=()=>{}}={}){
  el.innerHTML=sceneSvg();
  const tryNext=i=>{
    if(i>=photos.length)return;
    const img=new Image();img.alt='';img.decoding='async';
    img.onload=()=>{if(img.naturalWidth<400)return tryNext(i+1);img.className='scene-photo';el.appendChild(img);el.classList.add('has-photo');onPhoto(photos[i]);};
    img.onerror=()=>tryNext(i+1);
    img.src=photos[i];
  };
  tryNext(0);
}

// Julgranen som visar hur många luckor som är klara: en lampa per lucka och en stjärna i toppen för finalen.
export function treeSvg(doneSet,{finale=false}={}){
  const rand=rng(24),cols=['#ff5a5a','#ffd45a','#8fd6ff','#ff9ad5'];
  const tiers=[{ay:30,by:116,hw:50,rows:[[64,2],[94,3]]},{ay:72,by:172,hw:64,rows:[[110,3],[146,5]]},{ay:118,by:236,hw:82,rows:[[158,4],[190,4],[218,3]]}];
  let body='',spots=[];
  for(const t of tiers){
    body+=`<path d="M110 ${t.ay}L${110-t.hw} ${t.by}H${110+t.hw}Z" fill="url(#tg)"/>`;
    body+=`<path d="M${110-t.hw+6} ${t.by-2}q${t.hw/4} -12 ${t.hw/2} -3t${t.hw/2} 0t${t.hw/2} 3t${t.hw/2} -3" fill="none" stroke="#eef5ff" stroke-width="5" stroke-linecap="round" opacity=".9"/>`;
    for(const [y,n] of t.rows){const half=(y-t.ay)/(t.by-t.ay)*t.hw*.78;for(let i=0;i<n;i++)spots.push([110+(n===1?0:(i/(n-1)*2-1)*half),y]);}
  }
  // 24 lampor, utspridda i slumpad ordning så att granen tänds jämnt.
  const order=Array.from({length:spots.length},(_,i)=>i);for(let i=order.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  let bulbs='';
  order.slice(0,24).forEach((si,k)=>{
    const [x,y]=spots[si],n=k+1,on=doneSet.has(n),c=cols[k%4];
    bulbs+=on?`<g class="bulb on" data-n="${n}"><circle cx="${f(x)}" cy="${f(y)}" r="11" fill="${c}" opacity=".28"/><circle cx="${f(x)}" cy="${f(y)}" r="5" fill="${c}"/></g>`:`<circle class="bulb off" data-n="${n}" cx="${f(x)}" cy="${f(y)}" r="4" fill="#2d4268" stroke="#4d6697" stroke-width="1"/>`;
  });
  const star=`<g class="${finale?'star on':'star'}"><polygon points="110,6 115,19 129,19 118,28 122,42 110,34 98,42 102,28 91,19 105,19" fill="${finale?'#ffd95a':'#3a4d78'}" stroke="${finale?'#fff2b8':'#566c9c'}" stroke-width="1.5"/>${finale?'<circle cx="110" cy="24" r="22" fill="#ffd95a" opacity=".25"/>':''}</g>`;
  return `<svg viewBox="0 0 220 292" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Julgranen på Stora Torget: ${doneSet.size} av 24 lampor lyser${finale?', och stjärnan i toppen med':''}" focusable="false"><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f7a57"/><stop offset="1" stop-color="#0f4430"/></linearGradient></defs><rect x="94" y="236" width="32" height="40" rx="3" fill="#5a3a26"/>${body}${bulbs}${star}</svg>`;
}
