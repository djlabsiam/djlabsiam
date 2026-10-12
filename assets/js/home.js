
(function(){
var deck=document.getElementById('dm-deck');if(!deck)return;
var $=function(s){return deck.querySelector(s)};
var TR=[{"id": "house", "name": "House", "bpm": 126, "key": ""}, {"id": "hiphop", "name": "Hip-Hop", "bpm": 92, "key": ""}, {"id": "trap", "name": "Trap", "bpm": 100, "key": ""}, {"id": "techno", "name": "Techno", "bpm": 134.1, "key": ""}, {"id": "funk", "name": "Disco", "bpm": 120, "key": ""}];
var scr=$('#dm-scr'),list=$('#dm-l'),rows=[].slice.call(list.children),cv=$('#dm-cv'),cx=cv.getContext('2d'),
  knob=$('#dm-knob'),dial=$('#dm-dial'),ind=$('#dm-ind'),toastEl=$('#dm-toast'),capEl=$('#dm-cap'),jogI=$('#dm-jog'),
  stick=document.getElementById('dm-stick'),usbin=$('#dm-usbin'),cnt=$('#dm-cnt'),
  steps=[].slice.call(document.querySelectorAll('.dm-st'));
var HC=['#ff4d4d','#22d3ee','#a3e635','#f9a8d4','#4ade80','#fb923c','#3b82f6','#facc15'];
var S={usb:false,mode:'nomedia',sel:0,cur:-1,ctx:null,gain:null,buf:{},pk:{},playing:false,pos:0,p0:0,t0:0,tempo:0,bend:0,rate:1,cue:0,
  hot:[null,null,null,null,null,null,null,null],loop:{a:null,b:null,on:false},src:null,vinyl:true,played:false,hint:true,prev:false,touch:false,off:0};
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function btn(k){return deck.querySelector('[data-k="'+k+'"]')}
function trk(){return TR[S.cur]}
function dur(){var b=S.buf[trk().id];return b?b.duration:0}
/* ---------- toast / indicator / steps ---------- */
var tt;function toast(m){toastEl.textContent=m;toastEl.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){toastEl.classList.remove('on')},2200)}
function point(k,tip,sq){
  if(!k){ind.hidden=true;return}
  var t=btn(k);if(!t){ind.hidden=true;return}
  ind.hidden=false;ind.style.left=t.style.left;ind.style.top=t.style.top;
  var w=parseFloat(t.style.width)*1.18;ind.style.width=w+'%';ind.style.aspectRatio=sq?'auto':'1';
  var lp=parseFloat(t.style.left);ind.style.height=sq?(parseFloat(t.style.height)*1.3)+'%':'auto';ind.className='dm-ind'+(sq?' sq':'')+(lp<24?' tl':lp>76?' tr':'');ind.setAttribute('data-tip',tip||'')}
var F={},GI=0,shown=-1,info=$('#dm-info'),itl=$('#dm-it'),ipg=$('#dm-ip'),inum=$('#dm-in');
/* guided tour: ordered so each step builds on the previous one (browse -> load -> play -> tempo -> jog -> cue -> hot cue -> loops -> jump -> sync -> next track -> back) */
var GS=[
  {k:'browse',side:'b',tip:'เลือกแนวที่ชอบ',t:'เลือกแนวเพลงที่ชอบ',d:'หมุนปุ่ม Browse (เลื่อนล้อเมาส์บนปุ่ม หรือลากขึ้น-ลง) เพื่อดูแต่ละแนว — แต่ละแนวมีจังหวะ (BPM) ไม่เหมือนกัน',done:function(){return S.selMoved!==undefined||S.cur>=0}},
  {k:'browse',side:'b',tip:'กดเพื่อ LOAD',t:'กดปุ่ม Browse = LOAD',d:'กดที่ปุ่ม Browse เหมือนกด Enter บนเครื่องจริง เพลงจะถูกโหลดเข้าเดค แล้วคลื่นเสียงขึ้นที่จอ',done:function(){return S.cur>=0}},
  {k:'play',tip:'กด PLAY',t:'PLAY / PAUSE',d:'เริ่มเล่นเพลง กดอีกครั้งเพื่อหยุด — พื้นฐานแรกของการเล่น',done:function(){return S.played}},
  {k:'tempo',sq:1,tip:'',t:'TEMPO · ปรับความเร็ว',d:'เลื่อนเฟดเดอร์ขึ้น-ลง (±10%) แล้วดูค่า BPM บนจอเปลี่ยน — ใช้ทำให้สองเพลงจังหวะตรงกันตอนต่อเพลง',done:function(){return F.tempo}},
  {k:'trst',tip:'กด RESET',t:'TEMPO RESET',d:'กดเพื่อคืนความเร็วเดิม (0.0%) ทันที',done:function(){return F.reset}},
  {k:'jog',tip:'ลากสแครช',t:'JOG · สแครช (โหมด VINYL)',d:'ลากจอกค้างไว้เหมือนจับแผ่นเสียง ลากไป-มาเพื่อสแครช เพลงจะเดินตามมือคุณ',done:function(){return F.scratch}},
  {k:'vinyl',sq:1,tip:'สลับโหมด',t:'VINYL / CDJ',d:'สลับโหมดจอก: VINYL สแครชได้ · CDJ ใช้ดันจังหวะเร็ว-ช้าชั่วคราว (pitch bend) ลองกดสลับดู',done:function(){return F.vinyl}},
  {k:'jog',tip:'ลากดันจังหวะ',t:'PITCH BEND',d:'ในโหมด CDJ ลากจอกเพื่อดันจังหวะให้เพลงเร็ว/ช้าชั่วคราว ใช้ช่วยปรับบีตให้ตรงกันตอนผสมเพลง',done:function(){return F.bend}},
  {k:'cue',tip:'กด CUE',t:'CUE · จุดกลับ',d:'กดตอนเพลงเล่นเพื่อกลับไปที่จุด CUE แล้วหยุด (ตอนหยุดอยู่ กดเพื่อตั้งจุดใหม่ · กดค้างเพื่อฟังตัวอย่าง)',done:function(){return F.cue}},
  {k:'play',tip:'กด PLAY',t:'เล่นต่อ',d:'กด PLAY อีกครั้ง เพื่อไปเก็บ HOT CUE ในขั้นถัดไป',done:function(){return S.playing||F.hotset}},
  {k:'hc0',sq:1,tip:'กดเก็บจุด',t:'HOT CUE · เก็บจุดที่ชอบ',d:'กดตอนเพลงเล่น เพื่อเก็บตำแหน่งนั้นไว้กับปุ่ม A–H (ปุ่มจะมีแถบสี) ใช้เก็บท่อนฮุกหรือจุดต่อเพลง',done:function(){return F.hotset}},
  {k:'hc0',sq:1,tip:'กดอีกครั้ง',t:'กระโดดไป HOT CUE',d:'กดปุ่มเดิมอีกครั้งเพื่อกระโดดกลับไปจุดที่เก็บไว้ทันที — ใช้ซ้ำท่อนหรือทำจังหวะเพิ่ม',done:function(){return F.hotjump}},
  {k:'in',tip:'กด IN',t:'IN · เริ่มลูป',d:'กดตอนเพลงเล่น เพื่อกำหนดจุดเริ่มต้นของลูป',done:function(){return F.in}},
  {k:'out',tip:'กด OUT',t:'OUT · จบลูป',d:'กดอีกครั้งที่จุดจบ เพลงจะวนช่วงนั้นซ้ำๆ ทันที',done:function(){return F.out}},
  {k:'reloop',tip:'ออกลูป',t:'RELOOP / EXIT',d:'กดเพื่อออกจากลูป (กดอีกครั้งจะกลับเข้าลูปเดิม)',done:function(){return F.exit}},
  {k:'loop4',tip:'กด LOOP 4',t:'BEAT LOOP 4',d:'ลูป 4 บีตจากจุดปัจจุบันทันที ไม่ต้องกำหนดเอง — เหมาะตอนต่อเพลงและสร้างบิลด์',done:function(){return F.loop4}},
  {k:'loop4',tip:'กดออกลูป',t:'ออกจากลูป',d:'กดปุ่มเดิมอีกครั้งเพื่อออกจากลูป เพลงเดินต่อตามปกติ',done:function(){return F.loop4off}},
  {k:'bjf',tip:'กดข้าม',t:'BEAT JUMP',d:'กระโดดไปข้างหน้า 4 บีต (ปุ่ม ◄ ถอยหลัง) ใช้ข้ามท่อนหรือซ้ำท่อนให้ตรงจังหวะ',done:function(){return F.bj}},
  {k:'sync',sq:1,tip:'กด SYNC',t:'BEAT SYNC',d:'บนเครื่องจริงใช้ปรับความเร็วและบีตให้ตรงกับเดคอื่น (หน้าที่หลักตอนผสมเพลง) ที่นี่จะคืนค่า TEMPO ให้',done:function(){return F.sync}},
  {k:'tnext',tip:'เพลงถัดไป',t:'TRACK SEARCH',d:'กดปุ่ม ► เพื่อเปลี่ยนไปเพลงถัดไปในรายการ (◄ ก่อนหน้า) ลองฟังอีกแนวหนึ่ง',done:function(){return F.next}},
  {k:'back',sq:1,tip:'กด BACK',t:'BACK · กลับไปเลือกเพลง',d:'กดเพื่อกลับหน้ารายการเพลง (เพลงที่เล่นอยู่ไม่หยุด) — ครบทุกฟังก์ชันหลักแล้ว ลองเล่นอิสระได้เลย',done:function(){return F.back}}
];
function hideGuide(){info.hidden=true;ind.hidden=true;shown=-1}
function placeCard(k,side){
  var t=btn(k),d=deck.getBoundingClientRect(),r=t.getBoundingClientRect();if(!r.width)return;
  var w=Math.min(260,d.width*.62),cx=r.left+r.width/2-d.left,cy=r.top+r.height/2-d.top,h=info.offsetHeight;
  var left=cx<d.width*.5?cx+Math.min(r.width,d.width*.2)/2+22:cx-Math.min(r.width,d.width*.2)/2-22-w;
  left=Math.max(6,Math.min(d.width-w-6,left));var top=Math.max(6,Math.min(d.height-h-6,cy-h/2));
  if(side==='b'){left=Math.max(6,d.width-w-6);top=Math.min(d.height-h-6,cy+r.height/2+16)}   /* below the target (keeps the track list readable) */
  if(d.width<460){   /* phone: full-width card; take the slot (bottom / middle / top) that overlaps the target ring least */
    w=d.width-16;info.style.width=w+'px';h=info.offsetHeight;left=8;
    var m=Math.max(10,Math.min(r.width,d.width*.36)*.6),tx0=cx-m,tx1=cx+m,ty0=cy-Math.max(m,r.height*.59),ty1=cy+Math.max(m,r.height*.59);
    var slots=cy<d.height*.48?[d.height-h-8,Math.max(8,d.height*.38),8]:[Math.max(8,d.height*.38),d.height-h-8,8],bt=slots[0],bo=1e9;
    slots.forEach(function(t){var ov=Math.max(0,Math.min(t+h,ty1)-Math.max(t,ty0));if(ov<bo){bo=ov;bt=t}});
    top=bt}
  info.style.left=left+'px';info.style.top=top+'px'}
var stg=document.getElementById('dm-stage'),pinb=document.getElementById('dm-pin'),pinned=false;
pinb.addEventListener('click',function(){F.unpin=!F.unpin;pinUpdate()});
function pinUpdate(){   /* phone: the deck is pinned to the top only while the guided tour runs (and the reader hasn't released it) */
  var tour=S.usb&&!F.skip&&GI<GS.length,want=tour&&!F.unpin;
  if(want!==pinned){pinned=want;stg.classList.toggle('pin',want)}
  pinb.hidden=!tour;pinb.textContent=F.unpin?'ปักเครื่องไว้บนจอ':'ปล่อยเครื่อง · เลื่อนอ่านข้อความ'}
function guide(){
  pinUpdate();
  if(!S.usb||F.skip){if(!S.usb)hideGuide();else hideGuide();return}
  while(GI<GS.length&&GS[GI].done())GI++;
  if(GI>=GS.length){hideGuide();return}
  if(shown===GI)return;
  var g=GS[GI];shown=GI;
  itl.textContent=g.t;ipg.textContent=g.d;inum.textContent='ขั้นที่ '+(GI+1)+' / '+GS.length;
  point(g.k,g.tip,!!g.sq);info.hidden=false;placeCard(g.k,g.side)}
function stage(){
  stick.classList.toggle('hintp',!S.usb);knob.classList.toggle('act',S.usb&&S.mode==='browse');
  guide()}
$('#dm-isk').addEventListener('click',function(){F.skip=true;hideGuide()});
/* ---------- audio ---------- */
function ac(){if(!S.ctx){var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;S.ctx=new C();S.gain=S.ctx.createGain();S.gain.gain.value=.9;S.gain.connect(S.ctx.destination)}
  if(S.ctx.state==='suspended')S.ctx.resume();return S.ctx}
function peaks(b){var d=b.getChannelData(0),W=220,N=Math.floor(d.length/W),hi=new Float32Array(N),lo=new Float32Array(N),l=0,i,j,m,ml,x,a;
  for(i=0;i<N;i++){m=0;ml=0;for(j=0;j<W;j++){x=d[i*W+j];l+=.03*(x-l);a=x<0?-x:x;if(a>m)m=a;a=l<0?-l:l;if(a>ml)ml=a}hi[i]=m;lo[i]=ml}
  return{hi:hi,lo:lo,n:N,step:W/b.sampleRate}}
var loading={};
function fetchTrack(i){var t=TR[i];if(S.buf[t.id])return Promise.resolve(S.buf[t.id]);if(loading[t.id])return loading[t.id];
  var c=ac();if(!c)return Promise.reject();
  loading[t.id]=fetch('/assets/audio/demo-'+t.id+'.mp3').then(function(r){if(!r.ok)throw 0;return r.arrayBuffer()})
    .then(function(ab){return new Promise(function(res,rej){c.decodeAudioData(ab,res,rej)})})
    .then(function(b){S.buf[t.id]=b;S.pk[t.id]=peaks(b);var s=Math.round(b.duration);rows[i].querySelector('em').textContent=Math.floor(s/60)+':'+('0'+s%60).slice(-2);return b});
  return loading[t.id]}
function rebase(){S.pos=curPos();S.p0=S.pos;S.t0=S.ctx?S.ctx.currentTime:0}
function curPos(){
  if(!S.playing||!S.ctx)return S.pos;
  var p=S.p0+(S.ctx.currentTime-S.t0)*S.rate,L=S.loop;
  if(L.on&&L.b!==null&&L.b>L.a&&p>=L.b)p=L.a+((p-L.a)%(L.b-L.a));
  return p}
function stopSrc(){if(S.src){try{S.src.onended=null;S.src.stop()}catch(e){}try{S.src.disconnect()}catch(e){}S.src=null}}
function play(){
  if(S.cur<0||!S.buf[trk().id])return;var c=ac();if(!c)return;
  if(S.playing)return;
  var b=S.buf[trk().id];if(S.pos>=b.duration-.05)S.pos=0;
  stopSrc();var s=c.createBufferSource();s.buffer=b;S.rate=(1+S.tempo)*(1+S.bend);s.playbackRate.value=S.rate;s.connect(S.gain);
  var L=S.loop;if(L.on&&L.b!==null){s.loop=true;s.loopStart=L.a;s.loopEnd=L.b}
  s.start(0,Math.max(0,Math.min(S.pos,b.duration-.01)));S.src=s;S.p0=S.pos;S.t0=c.currentTime;S.playing=true;S.played=true;stage()}
function pause(){if(!S.playing)return;S.pos=curPos();S.playing=false;stopSrc();stage()}
function seek(p){var was=S.playing;if(was){stopSrc();S.playing=false}S.pos=Math.max(0,Math.min(dur()-.01,p));if(was)play()}
function applyRate(){var r=(1+S.tempo)*(1+S.bend);if(S.playing){rebase();if(S.src)S.src.playbackRate.value=r}S.rate=r}
function setLoop(){if(!S.playing){S.p0=S.pos}else rebase();
  if(S.src){var L=S.loop;if(L.on&&L.b!==null){S.src.loop=true;S.src.loopStart=L.a;S.src.loopEnd=L.b}else S.src.loop=false}
  lights()}
function beatLen(){return 60/trk().bpm}
/* ---------- list / modes ---------- */
function setMode(m){S.mode=m;scr.className='dm-scr m-'+m;if(m==='browse')showList();stage();draw()}
function showList(){var vp=list.parentNode.clientHeight,h=vp/4,off=Math.max(0,Math.min(S.sel-1,rows.length-4));
  rows.forEach(function(r,i){r.style.height=h+'px';r.classList.toggle('on',i===S.sel)});
  list.style.transform='translateY('+(-off*h)+'px)';cnt.textContent=(S.sel+1)+'/'+rows.length;dial.style.transform='rotate('+(S.sel*30)+'deg)'}
function sel(n,user){n=Math.max(0,Math.min(rows.length-1,n));if(n===S.sel&&!user)return;S.sel=n;S.selMoved=n;showList();stage();if(S.usb)fetchTrack(n).catch(function(){})}
function load(i){
  if(!S.usb)return;S.sel=i;showList();toast('LOADING… '+TR[i].name);
  fetchTrack(i).then(function(){
    var was=S.playing;pause();S.cur=i;S.pos=0;S.cue=0;S.hot=[null,null,null,null,null,null,null,null];S.loop={a:null,b:null,on:false};S.played=was&&S.played;
    setMode('play');lights();if(was){play()}stage()
  }).catch(function(){toast('โหลดเพลงไม่สำเร็จ ลองใหม่อีกครั้ง')})}
/* ---------- USB ---------- */
function insertUsb(){
  if(S.usb||stick.disabled)return;stick.disabled=true;ac();stick.classList.remove('hintp');
  var usbs=$('#dm-usbs'),u=deck.clientWidth/100;
  var done=function(){usbs.style.opacity='0';usbin.classList.add('on');S.usb=true;stick.classList.remove('usb');stick.style.cursor='default';
    stick.getAnimations().forEach(function(an){an.cancel()});stick.style.opacity='';
    if(stick.animate&&!RM)stick.animate([{opacity:0},{opacity:1}],{duration:380,easing:'ease-out'});
    toast('USB 1 พร้อม — เลือกเพลงด้วยปุ่ม Browse');setMode('browse');
    fetchTrack(0).catch(function(){})};
  if(RM||!usbs.animate){done();return}
  stick.animate([{opacity:1},{opacity:0}],{duration:260,easing:'ease-out',fill:'forwards'});             /* 1 · the headline badge fades out */
  var up=-11*u,sh=function(r,y){return 'drop-shadow(0 '+y+'px '+r+'px rgba(15,15,15,.4))'};
  var an=usbs.animate([                                                                                    /* 2 · a stick fades in above USB 1 · 3 · moves straight down */
    {opacity:0,transform:'translateY('+(up-6*u)+'px)',filter:sh(2,2),offset:0},
    {opacity:1,transform:'translateY('+up+'px)',filter:sh(8,14),offset:.2,easing:'ease-out'},
    {opacity:1,transform:'translateY('+up+'px)',filter:sh(8,14),offset:.36,easing:'cubic-bezier(.5,0,.25,1)'},
    {opacity:1,transform:'translateY('+(-1.6*u)+'px)',filter:sh(5,8),offset:.78,easing:'ease-in'},
    {opacity:1,transform:'translateY(0) scale(.86)',filter:sh(1,1),offset:.92},
    {opacity:0,transform:'translateY(0) scale(.74)',filter:sh(0,0),offset:1}],{duration:1900,fill:'forwards'});
  an.onfinish=done}
stick.addEventListener('click',insertUsb);
/* ---------- buttons ---------- */
function lights(){
  S.hot.forEach(function(h,i){var b=btn('hc'+i);b.classList.toggle('lit',h!==null);b.style.setProperty('--c',HC[i])});
  var L=S.loop;btn('in').classList.toggle('lit',L.a!==null);btn('out').classList.toggle('lit',L.b!==null);
  btn('reloop').classList.toggle('lit',L.on);btn('loop4').classList.toggle('lit',L.on&&L.n===4);btn('loop8').classList.toggle('lit',L.on&&L.n===8);
  }
var need=function(){if(S.cur<0||!S.usb){toast(S.usb?'เลือกเพลงด้วยปุ่ม Browse ก่อน':'เสียบ USB ก่อน');return false}return true};
function press(k){
  var i,L=S.loop;
  if(k==='browse'){if(!S.usb){toast('เสียบ USB ก่อน');return}
    if(S.mode==='browse'){load(S.sel)}else{setMode('browse')}return}
  if(k==='back'||k==='top-browse'){if(!S.usb){toast('เสียบ USB ก่อน');return}if(k==='back'&&S.cur>=0)F.back=true;setMode('browse');return}
  if(k.indexOf('x-')===0){toast('ปุ่มนี้ลองบนเครื่องจริงที่ร้านได้เลย');return}
  if(!need())return;
  if(k==='play'){S.playing?pause():play();return}
  if(k==='cue'){return}   /* handled with pointer events */
  if(k.indexOf('hc')===0){i=+k.slice(2);if(S.hot[i]===null){S.hot[i]=curPos();F.hotset=true;lights();stage();toast('เก็บ HOT CUE '+'ABCDEFGH'[i])}else{F.hotjump=true;seek(S.hot[i]);if(!S.playing)play()}return}
  if(k==='in'){L.a=curPos();L.b=null;L.on=false;L.n=0;F.in=true;setLoop();return}
  if(k==='out'){if(L.a===null)return;var p=curPos();if(p-L.a<.12)return;L.b=p;L.on=true;L.n=0;F.out=true;setLoop();return}
  if(k==='reloop'){if(L.a!==null&&L.b!==null){L.on=!L.on;if(!L.on)F.exit=true;setLoop()}return}
  if(k==='loop4'||k==='loop8'){var n=k==='loop4'?4:8;if(L.on&&L.n===n){L.on=false;if(n===4)F.loop4off=true}else{L.a=curPos();L.b=L.a+n*beatLen();L.on=true;L.n=n;if(n===4)F.loop4=true}setLoop();return}
  if(k==='bjb'||k==='bjf'){F.bj=true;seek(curPos()+(k==='bjf'?1:-1)*4*beatLen());return}
  if(k==='tprev'||k==='tnext'){F.next=true;load((S.cur+(k==='tnext'?1:TR.length-1))%TR.length);return}
  if(k==='trst'||k==='sync'){if(k==='sync')F.sync=true;else F.reset=true;S.tempo=0;S.bend=0;applyRate();capPos();if(k==='sync')toast('BEAT SYNC — ปรับกลับ 0.0%');return}
  if(k==='vinyl'){S.vinyl=!S.vinyl;F.vinyl=true;lights();toast(S.vinyl?'VINYL: จอกใช้สแครชได้':'CDJ: จอกใช้ดันจังหวะ (pitch bend)');return}}
deck.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.dkb');if(!b||b.getAttribute('data-k')==='jog'||b.getAttribute('data-k')==='tempo'||b.getAttribute('data-k')==='cue')return;
  if(b.getAttribute('data-k')==='browse'&&S.dragged){S.dragged=false;return}
  S.hint=S.hint&&b.getAttribute('data-k')!=='hc0';press(b.getAttribute('data-k'))});
/* CUE: set / return / hold-to-preview */
var cb=btn('cue'),cueHold=false;
cb.addEventListener('pointerdown',function(e){if(!need())return;try{cb.setPointerCapture(e.pointerId)}catch(x){}cb.classList.add('press');
  if(S.playing){F.cue=true;pause();S.pos=S.cue}
  else if(Math.abs(S.pos-S.cue)<.03){cueHold=true;play()}
  else{S.cue=S.pos;toast('ตั้ง CUE ที่จุดนี้')}});
function cueUp(){cb.classList.remove('press');if(cueHold){cueHold=false;pause();S.pos=S.cue}}
cb.addEventListener('pointerup',cueUp);cb.addEventListener('pointercancel',cueUp);
/* ---------- browse knob: wheel / drag / keys ---------- */
var kb=btn('browse'),acc=0,drag=null;
kb.addEventListener('wheel',function(e){
  if(S.mode!=='browse')return;
  var dy=e.deltaMode===1?e.deltaY*40:e.deltaY,dir=dy>0?1:-1;
  if((dir>0&&S.sel>=rows.length-1)||(dir<0&&S.sel<=0)){acc=0;return}
  e.preventDefault();acc+=dy;if(Math.abs(acc)>=50){sel(S.sel+(acc>0?1:-1),true);acc=0;S.hint=true}},{passive:false});
kb.addEventListener('pointerdown',function(e){drag={y:e.clientY};S.dragged=false;try{kb.setPointerCapture(e.pointerId)}catch(x){}});
kb.addEventListener('pointermove',function(e){if(!drag||S.mode!=='browse')return;var dy=e.clientY-drag.y;
  if(Math.abs(dy)>=18){sel(S.sel+(dy>0?1:-1),true);drag.y=e.clientY;S.dragged=true}});
['pointerup','pointercancel'].forEach(function(t){kb.addEventListener(t,function(){drag=null})});
kb.addEventListener('keydown',function(e){var m={ArrowDown:1,ArrowUp:-1};if(e.key in m&&S.mode==='browse'){e.preventDefault();sel(S.sel+m[e.key],true)}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();press('browse')}});
rows.forEach(function(r,i){r.addEventListener('click',function(){if(S.mode==='browse'){if(S.sel===i)load(i);else sel(i,true)}})});
/* ---------- tempo fader ---------- */
var fd=btn('tempo'),FY=1;
function capPos(){var f=(S.tempo/.1);capEl.style.top=(50+f*39.3)+'%';fd.setAttribute('aria-valuenow',Math.round(S.tempo*100))}
function fdSet(e){var r=fd.getBoundingClientRect();var f=((e.clientY-r.top)/r.height-.5)/.393;f=Math.max(-1,Math.min(1,f));
  if(Math.abs(f)<.03)f=0;S.tempo=f*.1;if(Math.abs(S.tempo)>=.02)F.tempo=true;capPos();applyRate()}
fd.addEventListener('pointerdown',function(e){try{fd.setPointerCapture(e.pointerId)}catch(x){}FY=0;fdSet(e)});
fd.addEventListener('pointermove',function(e){if(FY===0)fdSet(e)});
['pointerup','pointercancel'].forEach(function(t){fd.addEventListener(t,function(){FY=1})});
fd.addEventListener('keydown',function(e){var m={ArrowDown:.01,ArrowUp:-.01};if(e.key in m){e.preventDefault();S.tempo=Math.max(-.1,Math.min(.1,S.tempo+m[e.key]));capPos();applyRate()}});
/* ---------- jog ---------- */
var jg=btn('jog'),jd=null,ang=0,lastG=0;
function jangle(e){var r=jg.getBoundingClientRect();return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))}
function grain(p){if(!S.ctx||S.cur<0)return;var b=S.buf[trk().id];if(!b)return;var s=S.ctx.createBufferSource(),g=S.ctx.createGain(),t=S.ctx.currentTime;
  s.buffer=b;s.connect(g);g.connect(S.gain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.9,t+.01);g.gain.linearRampToValueAtTime(0,t+.09);
  s.start(t,Math.max(0,Math.min(b.duration-.2,p)),.1)}
jg.addEventListener('pointerdown',function(e){if(!need())return;try{jg.setPointerCapture(e.pointerId)}catch(x){}
  jd={a:jangle(e),was:S.playing,t:performance.now(),mode:S.vinyl};
  if(S.vinyl&&S.playing){pause()}S.touch=true;jg.style.cursor='grabbing'});
jg.addEventListener('pointermove',function(e){if(!jd)return;var a=jangle(e),d=a-jd.a;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;jd.a=a;
  var now=performance.now(),dt=Math.max(8,now-jd.t);jd.t=now;ang+=d*180/Math.PI;
  if(Math.abs(d)>.01){if(jd.mode)F.scratch=true;else F.bend=true}
  if(jd.mode){S.pos=Math.max(0,Math.min(dur()-.2,S.pos+d/(2*Math.PI)*1.8));
    if(now-lastG>45){lastG=now;grain(S.pos)}}
  else{S.bend=Math.max(-.25,Math.min(.25,S.bend+d*3/dt*10));applyRate()}});
function jup(){if(!jd)return;var w=jd.was&&jd.mode;jd=null;S.touch=false;jg.style.cursor='';if(w)play()}
jg.addEventListener('pointerup',jup);jg.addEventListener('pointercancel',jup);
/* ---------- screen drawing ---------- */
var FONT=getComputedStyle(document.body).fontFamily;
function mmss(t,ms){var m=Math.floor(t/60),s=Math.floor(t%60);return (m<10?'0':'')+m+':'+(s<10?'0':'')+s+(ms?'.'+('00'+Math.floor((t%1)*1000)).slice(-3):'')}
var dpr=Math.min(2,window.devicePixelRatio||1),W=0,H=0;
function fit(){var w=cv.clientWidth,h=cv.clientHeight;if(w&&(w!==W||h!==H)){W=w;H=h;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cx.setTransform(dpr,0,0,dpr,0,0)}}
function draw(){
  if(S.mode!=='play'||S.cur<0)return;fit();if(!W)return;
  var t=trk(),p=S.pk[t.id],pos=curPos(),d=dur(),bpm=t.bpm*(1+S.tempo)*(1+S.bend),i,x;
  cx.fillStyle='#05070A';cx.fillRect(0,0,W,H);
  /* top bar */
  cx.fillStyle='#10151C';cx.fillRect(0,0,W,H*.15);
  cx.fillStyle='#fff';cx.font='600 '+(H*.085)+'px '+FONT;cx.textBaseline='middle';cx.fillText((S.playing?'▶ ':'❚❚ ')+t.name,W*.03,H*.075);
  cx.fillStyle='#8FA0B5';cx.font='500 '+(H*.065)+'px '+FONT;cx.textAlign='right';cx.fillText('JOG '+(S.vinyl?'VINYL':'CDJ')+' · USB 1',W*.97,H*.075);cx.textAlign='left';
  if(!p)return;
  /* overview */
  var oy=H*.17,oh=H*.1;
  for(x=0;x<W;x++){i=Math.floor(x/W*p.n);var a=p.hi[i]*oh*.5,l=p.lo[i]*oh*.5;cx.fillStyle='#3E7BE8';cx.fillRect(x,oy+oh/2-a,1,a*2);cx.fillStyle='#FFB443';cx.fillRect(x,oy+oh/2-l,1,l*2)}
  var L=S.loop;if(L.a!==null&&L.b!==null){cx.fillStyle='rgba(255,170,40,.35)';cx.fillRect(L.a/d*W,oy,Math.max(2,(L.b-L.a)/d*W),oh)}
  S.hot.forEach(function(h,k){if(h!==null){cx.fillStyle=HC[k];cx.fillRect(h/d*W-1,oy-2,2,oh+4)}});
  cx.fillStyle='rgba(0,0,0,.45)';cx.fillRect(0,oy,pos/d*W,oh);cx.fillStyle='#fff';cx.fillRect(pos/d*W-1,oy-3,2,oh+6);
  /* main waveform */
  var my=H*.33,mh=H*.4,mid=my+mh/2,win=5.2,pps=W/win;
  cx.fillStyle='#0A0E14';cx.fillRect(0,my,W,mh);
  var bl=60/t.bpm,b0=Math.floor((pos-win/2)/bl)*bl;
  for(var bt=b0;bt<pos+win/2+bl;bt+=bl){if(bt<0)continue;var bx=W/2+(bt-pos)*pps,isBar=Math.round(bt/bl)%4===0;cx.fillStyle=isBar?'rgba(255,255,255,.34)':'rgba(255,255,255,.14)';cx.fillRect(bx,my,1,mh)}
  for(x=0;x<W;x++){var tm=pos+(x-W/2)/pps;if(tm<0||tm>=d)continue;i=Math.floor(tm/p.step);if(i>=p.n)continue;
    var hh=p.hi[i]*mh*.5,ll=p.lo[i]*mh*.5;
    cx.fillStyle=tm<pos?'#2A5CC2':'#3E7BE8';cx.fillRect(x,mid-hh,1,hh*2);
    cx.fillStyle=tm<pos?'#C98A2E':'#FFC15A';cx.fillRect(x,mid-ll,1,ll*2)}
  if(L.a!==null){var lx=W/2+(L.a-pos)*pps,lx2=L.b!==null?W/2+(L.b-pos)*pps:lx;cx.fillStyle=L.on?'rgba(255,150,30,.28)':'rgba(255,255,255,.1)';cx.fillRect(lx,my,Math.max(2,lx2-lx),mh);cx.fillStyle='#FF9A1F';cx.fillRect(lx,my,2,mh);if(L.b!==null)cx.fillRect(lx2-1,my,2,mh)}
  S.hot.forEach(function(h,k){if(h===null)return;var hx=W/2+(h-pos)*pps;if(hx<0||hx>W)return;cx.fillStyle=HC[k];cx.fillRect(hx-1,my,2,mh);cx.fillRect(hx,my,W*.04,H*.07);cx.fillStyle='#000';cx.font='700 '+(H*.055)+'px '+FONT;cx.fillText('ABCDEFGH'[k],hx+W*.012,my+H*.035)});
  var cxp=W/2+(S.cue-pos)*pps;if(cxp>0&&cxp<W){cx.fillStyle='#ff9f1a';cx.fillRect(cxp-1,my,2,mh)}
  cx.fillStyle='#fff';cx.fillRect(W/2-1,my-4,2,mh+8);
  /* readouts */
  cx.fillStyle='#fff';cx.font='700 '+(H*.14)+'px '+FONT;cx.textBaseline='alphabetic';cx.fillText(mmss(pos,true),W*.03,H*.93);
  cx.font='500 '+(H*.06)+'px '+FONT;cx.fillStyle='#8FA0B5';cx.fillText('REMAIN -'+mmss(Math.max(0,d-pos),false),W*.03,H*.99);
  cx.textAlign='right';cx.fillStyle='#fff';cx.font='700 '+(H*.12)+'px '+FONT;cx.fillText(bpm.toFixed(1),W*.97,H*.9);
  cx.font='500 '+(H*.06)+'px '+FONT;cx.fillStyle='#8FA0B5';cx.fillText('BPM  '+(S.tempo>=0?'+':'')+(S.tempo*100).toFixed(1)+'%'+(t.key?'  ·  '+t.key:''),W*.97,H*.99);cx.textAlign='left'}
/* ---------- frame loop ---------- */
var last=performance.now(),vis=true;
function frame(now){
  var dt=now-last;last=now;
  if(vis){
    if(S.bend){S.bend*=Math.pow(.88,dt/16);if(Math.abs(S.bend)<.003){S.bend=0}applyRate()}
    if(S.playing){ang+=200*(S.rate)*dt/1000;var p=curPos(),dd=dur();if(!S.loop.on&&p>=dd-.02){pause();S.pos=0;toast('จบเพลง')}}
    jogI.style.transform='rotate('+ang+'deg)';guide();
    if(S.mode==='play')draw()}
  requestAnimationFrame(frame)}
if('IntersectionObserver' in window)new IntersectionObserver(function(en){vis=en[0].isIntersecting;if(!vis&&S.playing)pause()},{threshold:0}).observe(deck);
document.addEventListener('visibilitychange',function(){if(document.hidden&&S.playing)pause()});
window.addEventListener('resize',function(){if(S.mode==='browse')showList();W=0;shown=-1});
lights();capPos();showList();stage();requestAnimationFrame(frame);
})();

(function(){var c=document.getElementById('cov');if(!c)return;var L=[].slice.call(c.querySelectorAll('.cv')),i=0,n=document.getElementById('cv-i'),t=null,
rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function go(k){L[i].classList.remove('on');i=(k+L.length)%L.length;L[i].classList.add('on');n.textContent=i+1;
  var a=L[i].querySelector('a');L.forEach(function(x){var q=x.querySelector('a');if(q)q.tabIndex=x===L[i]?0:-1})}
function auto(){stop();if(!rm)t=setInterval(function(){go(i+1)},4200)}function stop(){if(t){clearInterval(t);t=null}}
c.querySelector('.cv-b.p').addEventListener('click',function(){go(i-1);auto()});c.querySelector('.cv-b.n').addEventListener('click',function(){go(i+1);auto()});
c.addEventListener('mouseenter',stop);c.addEventListener('mouseleave',auto);c.addEventListener('focusin',stop);c.addEventListener('focusout',auto);
var sx=null;c.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;stop()},{passive:true});
c.addEventListener('touchend',function(e){if(sx===null)return;var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>40)go(i+(d<0?1:-1));sx=null;auto()});
if('IntersectionObserver' in window)new IntersectionObserver(function(e){e[0].isIntersecting?auto():stop()}).observe(c);else auto()})();
