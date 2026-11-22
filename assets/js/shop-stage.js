/* ===== SHOP หน้ารุ่นแบบเล่าเรื่องตามการเลื่อน: เวที 3D (โมเดลจริงของร้าน) + เอฟเฟกต์โผล่ + แท็บ "ดูใกล้ๆ" · ค่าทั้งหมดอ่านจาก data/shop-stage.json ผ่าน data-cfg ของ #sc ===== */
(function(){
'use strict';
var sc=document.getElementById('sc'),sf=document.getElementById('sf');
if(!sc)return;
var cfg;try{cfg=JSON.parse(sc.getAttribute('data-cfg')||'{}')}catch(e){cfg={}}
var cn=navigator.connection||{},slow=/(^|-)2g$|^3g$/.test(cn.effectiveType||''),lowmem=navigator.deviceMemory&&navigator.deviceMemory<=2;
var calm=(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)||cn.saveData||slow||lowmem;   /* ลดการเคลื่อนไหว / ประหยัดข้อมูล / เน็ตช้า / เครื่องแรมน้อย = แบบนิ่ง */
if(calm||!window.WebGLRenderingContext||!window.Promise||!cfg.m3||!cfg.models)return;            /* ใช้แบบนิ่ง (#sf) */

var VEN='/assets/vendor/three/';
var BKT=cfg.m3;
var ID={cdj:cfg.models.cdj,s11:cfg.models.s11,a9:cfg.models.a9};   /* ชื่อไฟล์ .glb ในถัง product-3d (ค่าเริ่มต้น <id>.glb · ถ้า data ระบุ stage = ไฟล์บีบสำหรับเวทีนี้) */
function fail(){started=true;if(raf){cancelAnimationFrame(raf);raf=0}sc.hidden=true;if(sf)sf.hidden=false}
function loadScript(s){return new Promise(function(ok,no){var e=document.createElement('script');e.src=s;e.onload=ok;e.onerror=no;document.head.appendChild(e)})}
function clamp(x,a,b){return Math.min(b,Math.max(a,x))}
function lerp(a,b,t){return a+(b-a)*t}
function ss(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)}
function eo(t){return 1-Math.pow(1-clamp(t,0,1),3)}

var started=false,raf=0;
function start(){if(started)return;started=true;
  loadScript(VEN+'three.min.js').then(function(){return loadScript(VEN+'GLTFLoader.js')}).then(function(){return loadScript(VEN+'RoomEnvironment.js')}).then(build).catch(fail)}
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();start()}},{rootMargin:'1100px 0px'});io.observe(sf||sc)}else start();

function build(){
var cv=document.getElementById('gl'),pin=sc.querySelector('.ap-pin'),lines=document.getElementById('lines');
var mobile=function(){return innerWidth<=820};
var R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:'high-performance'})}catch(e){return fail()}
R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=.95;R.setClearColor(0x000000,0);
cv.addEventListener('webglcontextlost',function(e){e.preventDefault();fail()});   /* GPU ถูกเรียกคืน = กลับไปแบบนิ่ง */
var S=new THREE.Scene(),pm=new THREE.PMREMGenerator(R);S.environment=pm.fromScene(new THREE.RoomEnvironment(),0.04).texture;
var cam=new THREE.PerspectiveCamera(30,1,0.05,30);
var key=new THREE.DirectionalLight(0xffffff,.7);key.position.set(1.2,2.2,2.0);S.add(key);   /* แสงนุ่ม ไม่ฉาบ: ลดแสงหลัก · ตัดแสงขอบสีแดงออก */
var ENVI=.28;   /* ความแรงของแสงสะท้อนรอบห้อง (ตัวการให้พลาสติกดำดูเทา) */

/* ---------- ขนาดจริง (เมตร) จากโมเดล ---------- */
var W={cdj:.3446,s11:.267,a9:.4074},GAP=.02;
var X2=W.s11/2+GAP+W.cdj/2,                 /* ชุดคู่: ซ้าย/ขวาของ DJM-S11 */
    XA=W.a9/2+GAP+W.cdj/2,                  /* ชุดเต็ม: ด้านในของ DJM-A9 */
    XB=XA+W.cdj+GAP;                        /* ชุดเต็ม: ด้านนอก */

/* ---------- ตำแหน่งจอบนตัว CDJ (ตั้งจากรูปทรงโมเดล: ฝาจอเอียงขึ้นด้านหลัง) ---------- */
var SW=.2175,SH=.136,SPOS=new THREE.Vector3(0,.1062,-.1345),SN=new THREE.Vector3(0,1,.2).normalize();
var SQ=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),SN);

/* ---------- หน้าจอ (canvas → texture) ---------- */
var CW=1024,CH=640;
function mkCanvas(){var c=document.createElement('canvas');c.width=CW;c.height=CH;return c}
var cvS=mkCanvas(),ctS=cvS.getContext('2d'),texS=new THREE.CanvasTexture(cvS);texS.encoding=THREE.sRGBEncoding;texS.anisotropy=8;   /* จอของเครื่องหลัก (C0) */
var cvD=mkCanvas(),ctD=cvD.getContext('2d'),texD=new THREE.CanvasTexture(cvD);texD.encoding=THREE.sRGBEncoding;texD.anisotropy=8;   /* จอเครื่องอื่น (หน้าเด็ค) */
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
var F1='700 26px Prompt,"Noto Sans Thai",sans-serif',F2='400 20px "Noto Sans Thai",sans-serif';
function icon(c,kind,x,y,s,col){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=5;c.lineCap='round';c.lineJoin='round';
  if(kind==='usb'){rr(c,-34,-60,68,100,10);c.stroke();c.fillRect(-18,-92,12,26);c.fillRect(6,-92,12,26);c.beginPath();c.moveTo(0,40);c.lineTo(0,70);c.stroke()}
  else if(kind==='stream'){c.beginPath();c.arc(-38,34,12,0,7);c.fill();[34,64,94].forEach(function(r){c.beginPath();c.arc(-38,34,r,-1.55,-0.02);c.stroke()})}
  else if(kind==='cloud'){c.beginPath();c.moveTo(-60,36);c.arc(-34,6,32,2.3,4.7);c.arc(4,-16,40,3.6,5.7);c.arc(44,8,30,4.5,1.5);c.lineTo(-60,36);c.closePath();c.stroke()}
  else if(kind==='laptop'){rr(c,-62,-48,124,80,8);c.stroke();c.beginPath();c.moveTo(-82,52);c.lineTo(82,52);c.stroke()}
  c.restore()}
function track(c,x,y,w,i,act){c.fillStyle=act?'rgba(58,160,255,.16)':'rgba(255,255,255,.04)';c.fillRect(x,y,w,50);
  c.fillStyle='#8b93a3';c.font='600 18px Prompt,sans-serif';c.fillText(String(i+1).padStart(2,'0'),x+14,y+32);
  c.fillStyle=act?'#cfe6ff':'rgba(255,255,255,.34)';rr(c,x+60,y+14,150+((i*53)%170),9,4);c.fill();c.fillStyle='rgba(255,255,255,.18)';rr(c,x+60,y+30,90+((i*37)%110),7,3);c.fill();
  c.fillStyle='rgba(255,255,255,.22)';rr(c,x+w-86,y+19,60,12,6);c.fill()}
var LIB=cfg.lib||[];
var REAL={lib:null,hid:null};
function loadReal(k,u){var im=new Image();im.onload=function(){REAL[k]=im;REAL.dirty=true;if(window.__apkick)window.__apkick()};im.src=u}
var SCR=cfg.screens||{};if(SCR.lib)loadReal('lib',SCR.lib);if(SCR.hid)loadReal('hid',SCR.hid);   /* ไม่มีรูปจอจริงใน data = วาดจอจำลองแบบไม่มีตัวเลข */
function drawLib(c,step){if(REAL.lib){c.globalAlpha=1;c.drawImage(REAL.lib,0,0,CW,CH);return}c.globalAlpha=1;c.fillStyle='#0b0d12';c.fillRect(0,0,CW,CH);
  c.fillStyle='#11151d';c.fillRect(0,0,CW,74);
  LIB.forEach(function(it,i){var x=24+i*322,on=i===step;c.fillStyle=on?'#e8eaf0':'rgba(255,255,255,.07)';rr(c,x,13,306,48,24);c.fill();c.fillStyle=on?'#0b0d12':'#aab2c2';c.font=F1;c.textAlign='center';c.fillText(it.t,x+153,47);c.textAlign='left'});
  c.fillStyle='#11151d';c.fillRect(0,74,270,CH-74);
  icon(c,LIB[step].k,135,260,1.7,'#3aa0ff');
  c.fillStyle='#e8eaf0';c.font=F1;c.textAlign='center';c.fillText(LIB[step].t,135,430);c.fillStyle='#8b93a3';c.font=F2;
  LIB[step].s.split(' · ').forEach(function(l,i){c.fillText(l,135,466+i*28)});c.textAlign='left';
  for(var i=0;i<9;i++)track(c,290,88+i*58,720,i,i===2);}
function drawHID(c){if(REAL.hid){c.globalAlpha=1;c.drawImage(REAL.hid,0,0,CW,CH);return}c.globalAlpha=1;c.fillStyle='#0b0d12';c.fillRect(0,0,CW,CH);
  c.fillStyle='#11151d';c.fillRect(0,0,CW,74);c.fillStyle='#e8eaf0';c.font=F1;c.fillText('USB · HID',28,47);
  c.fillStyle='rgba(61,214,140,.18)';rr(c,CW-250,16,226,42,21);c.fill();c.fillStyle='#3DD68C';c.beginPath();c.arc(CW-222,37,7,0,7);c.fill();c.font='600 18px Prompt,sans-serif';c.fillText('CONNECTED',CW-204,43);
  icon(c,'usb',200,290,1.5,'#e8eaf0');icon(c,'laptop',800,300,1.5,'#e8eaf0');
  c.strokeStyle='#3aa0ff';c.lineWidth=6;c.setLineDash([2,16]);c.lineCap='round';c.beginPath();c.moveTo(290,300);c.lineTo(690,300);c.stroke();c.setLineDash([]);
  c.fillStyle='#e8eaf0';c.font='700 40px Prompt,sans-serif';c.textAlign='center';c.fillText('HID MODE',CW/2,200);
  c.font=F1;c.fillStyle='#cfe6ff';c.fillText('Serato DJ Pro',CW/2,380);c.fillStyle='#8b93a3';c.font=F2;c.fillText('license required',CW/2,414);
  c.font='500 18px "Noto Sans Thai",sans-serif';c.fillStyle='#6b7385';c.fillText('ภาพจำลองประกอบ',CW/2,590);c.textAlign='left'}
function seeded(n){var s=n*9301+49297;return function(){s=(s*9301+49297)%233280;return s/233280}}
function drawDeck(c,variant){c.globalAlpha=1;c.fillStyle='#0b0d12';c.fillRect(0,0,CW,CH);
  c.fillStyle='#11151d';c.fillRect(0,0,CW,74);c.fillStyle='#8b93a3';c.font='600 20px Prompt,sans-serif';c.fillText('DECK '+variant,28,46);
    var r=seeded(variant+3);
  for(var row=0;row<2;row++){var y0=130+row*210;
    for(var x=24;x<CW-24;x+=6){var a=.25+.75*Math.abs(Math.sin(x*.021+row*1.7))*(.55+.45*r());var h=a*86;
      c.fillStyle=x<CW*.5?(row?'#ffb347':'#ff8a3d'):(row?'#3aa0ff':'#2f7fe0');c.fillRect(x,y0-h,4,h*2)}
    c.fillStyle='#fff';c.fillRect(CW*.5-1,y0-100,3,200)}
  c.fillStyle='#e8eaf0';rr(c,28,CH-66,260,16,8);c.fill();c.fillStyle='#3aa0ff';rr(c,CW-250,CH-72,226,42,21);c.fill();c.fillStyle='#fff';c.font='700 18px Prompt,sans-serif';c.textAlign='center';c.fillText('PLAYING',CW-137,CH-44);c.textAlign='left'}
function drawS(mode,a,step){  /* mode: lib/hid/deck, a=0..1 ความทึบของหน้าที่สอง */
  if(mode==='lib')drawLib(ctS,step);
  else if(mode==='lib>hid'){drawLib(ctS,2);ctS.globalAlpha=a;var t=mkCanvas().getContext('2d');drawHID(t);ctS.drawImage(t.canvas,0,0);ctS.globalAlpha=1}
  else if(mode==='hid')drawHID(ctS);
  else if(mode==='hid>deck'){drawHID(ctS);ctS.globalAlpha=a;var t2=mkCanvas().getContext('2d');drawDeck(t2,1);ctS.drawImage(t2.canvas,0,0);ctS.globalAlpha=1}
  else drawDeck(ctS,1);
  texS.needsUpdate=true}

/* ---------- โหลดโมเดล ---------- */
var L=new THREE.GLTFLoader();
function ld(m){var f=(m&&(m.stage||(m.id&&m.id+'.glb')))||'';if(!/^[A-Za-z0-9._-]{3,120}\.glb$/.test(f))return Promise.reject(new Error('model'));return new Promise(function(ok,no){L.load(BKT+f,function(g){ok(g.scene)},undefined,no)})}
Promise.all([ld(ID.cdj),ld(ID.s11),ld(ID.a9)]).then(function(m){assemble(m[0],m[1],m[2])}).catch(fail);

function assemble(mc,ms,ma){
[mc,ms,ma].forEach(function(o){o.traverse(function(n){if(n.isMesh){[].concat(n.material).forEach(function(m){if(m&&'envMapIntensity' in m){m.envMapIntensity=ENVI}})}})});
var root=new THREE.Group();S.add(root);
function wrap(src,withScreen,tex){var g=new THREE.Group(),o=src.clone(true);g.add(o);
  if(withScreen){var p=new THREE.Mesh(new THREE.PlaneGeometry(SW,SH),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));p.position.copy(SPOS).addScaledVector(SN,.0009);p.quaternion.copy(SQ);g.add(p);g.userData.screen=p}
  g.visible=false;root.add(g);return g}
var C=[wrap(mc,true,texS),wrap(mc,true,texD),wrap(mc,true,texD),wrap(mc,true,texD)],S11=wrap(ms),A9=wrap(ma);
/* แสงบนพื้น: วงสว่างอ่อนใต้เครื่อง ให้ดูลอยอยู่กลางฉาก */
var gc=document.createElement('canvas');gc.width=gc.height=256;var gx=gc.getContext('2d'),gr=gx.createRadialGradient(128,128,4,128,128,126);
gr.addColorStop(0,'rgba(0,0,0,.42)');gr.addColorStop(.5,'rgba(0,0,0,.16)');gr.addColorStop(1,'rgba(0,0,0,0)');gx.fillStyle=gr;gx.fillRect(0,0,256,256);
var pool=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(gc),transparent:true,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.y=-.002;root.add(pool);
var gc2=document.createElement('canvas');gc2.width=gc2.height=256;var g2=gc2.getContext('2d'),gr2=g2.createRadialGradient(128,128,6,128,128,126);
gr2.addColorStop(0,'rgba(190,35,41,.34)');gr2.addColorStop(1,'rgba(190,35,41,0)');g2.fillStyle=gr2;g2.fillRect(0,0,256,256);
var glow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(gc2),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));glow.rotation.x=-Math.PI/2;glow.position.y=-.004;glow.visible=false;root.add(glow);
root.position.y=-.02;

(document.fonts&&document.fonts.load?Promise.all([document.fonts.load('700 26px Prompt'),document.fonts.load('400 20px "Noto Sans Thai"'),document.fonts.load('700 18px Prompt')]):Promise.resolve()).catch(function(){}).then(go);

function go(){
drawS('lib',0,0);drawDeck(ctD,2);texD.needsUpdate=true;
sc.hidden=false;if(sf)sf.hidden=true;

/* ---------- องค์ประกอบ HTML ---------- */
var beats=[].slice.call(sc.querySelectorAll('.ap-b')),src=sc.querySelector('.ap-src'),chips=[].slice.call(sc.querySelectorAll('.ap-chip')),hid=sc.querySelector('.ap-hid'),tags=[].slice.call(sc.querySelectorAll('.ap-tag')),
    prog=sc.querySelector('.ap-prog i'),lnP=[].slice.call(lines.querySelectorAll('path')),lnC=[].slice.call(lines.querySelectorAll('circle'));
var NS=beats.length;

/* ---------- ฉากกล้อง: p → มุมกล้อง ---------- */
/* [p, เป้าหมาย(x,y,z), มุมหมุน°, มุมก้ม°, ความกว้างที่ต้องเห็น(เมตร)] */
var KF=[
 [0.00, 0,.105,-.13,   0, 50, .44],
 [0.27,-0.0,.105,-.13, -8, 52, .42],
 [0.40, 0,.05,0,       -8, 36, 1.34],
 [0.60, 0,.05,0,       10, 34, 1.38],
 [0.72, 0,.045,0,     -34, 30, 2.25],
 [1.00, 0,.045,0,      30, 28, 2.25]];
var FOV=30,tf=Math.tan(FOV*Math.PI/360);
function camAt(p){var i=0;while(i<KF.length-2&&p>KF[i+1][0])i++;var a=KF[i],b=KF[i+1],t=ss(a[0],b[0],p);
  var o=[];for(var k=1;k<7;k++)o.push(lerp(a[k],b[k],t));
  var tx=o[0],ty=o[1],tz=o[2],az=o[3]*Math.PI/180,el=o[4]*Math.PI/180,fit=o[5];
  var asp=cam.aspect,usable=mobile()?.84:.56,dist=fit/(usable*2*tf*asp);dist=Math.max(dist,.34);
  cam.position.set(tx+Math.sin(az)*Math.cos(el)*dist,ty+Math.sin(el)*dist,tz+Math.cos(az)*Math.cos(el)*dist);
  cam.lookAt(tx,ty,tz)}

/* ---------- การจัดวางเครื่อง: p → ตำแหน่ง ---------- */
function layout(p){if(REAL.dirty){REAL.dirty=false;layout.k=''}
  var t2=ss(.29,.40,p),t3=ss(.62,.74,p);
  var e2=eo(t2),e3=eo(t3);
  C[0].visible=true;C[0].position.set(lerp(lerp(0,-X2,e2),-XA,e3),0,0);
  C[1].visible=t2>0;C[1].position.set(lerp(lerp(1.6,X2,e2),XA,e3),0,0);C[1].scale.setScalar(1);
  S11.visible=t2>0&&t3<.995;var sOut=eo(ss(.62,.70,p));S11.position.set(0,lerp(lerp(.7,0,e2),.7,sOut),0);S11.scale.setScalar(Math.max(.001,lerp(lerp(.6,1,e2),.6,sOut)));
  A9.visible=t3>0;A9.position.set(0,lerp(.7,0,eo(ss(.66,.76,p))),0);A9.scale.setScalar(Math.max(.001,lerp(.6,1,eo(ss(.66,.76,p)))));
  C[2].visible=t3>0;C[2].position.set(lerp(-2.6,-XB,eo(ss(.66,.78,p))),0,0);
  C[3].visible=t3>0;C[3].position.set(lerp(2.6,XB,eo(ss(.66,.78,p))),0,0);
  var span=lerp(lerp(.9,1.55,e2),3.4,e3);pool.scale.set(span,span*.75,1);glow.scale.set(span*.9,span*.6,1);
  /* หน้าจอเครื่องหลัก */
  var mode,a=0,step=0;
  if(p<.28){mode='lib';step=Math.min(2,Math.floor(clamp(p/.27,0,.999)*3))}
  else if(p<.38){mode='lib>hid';a=Math.round(ss(.28,.38,p)*10)/10}
  else if(p<.62){mode='hid'}
  else if(p<.72){mode='hid>deck';a=Math.round(ss(.62,.72,p)*10)/10}
  else mode='deck';
  var k=mode+'|'+a+'|'+step;if(k!==layout.k){layout.k=k;drawS(mode,a,step);setStep(step)}
}
function setStep(i){chips.forEach(function(c,k){c.classList.toggle('on',REAL.lib?true:k===i)})}

/* ---------- ข้อความ: เลื่อนขึ้น/ลงต่อเนื่องตามการเลื่อน ---------- */
function textMotion(p){
  beats.forEach(function(b,i){var c=(i+.5)/NS,t=(p-c)*NS;                        /* t: -1..1 ผ่านหน้าจอ */
    var tt=i===0&&t<0?0:(i===NS-1&&t>0?0:t);
    var o=1-ss(.25,.55,Math.abs(tt)),y=-tt*150;
    b.style.opacity=o.toFixed(3);b.style.transform='translate3d(0,'+y.toFixed(1)+'px,0)';
    var ls=b.querySelectorAll('.l');for(var k=0;k<ls.length;k++){ls[k].style.transform='translate3d(0,'+(-tt*(26+k*22)).toFixed(1)+'px,0)'}});
}

/* ---------- กราฟิกลอยในฉาก ---------- */
function proj(obj,off){var v=new THREE.Vector3();obj.getWorldPosition(v);if(off)v.add(off);v.project(cam);var r=pin.getBoundingClientRect();return {x:(v.x*.5+.5)*r.width,y:(-v.y*.5+.5)*r.height}}
function rel(el){var r=el.getBoundingClientRect(),q=pin.getBoundingClientRect();return {x:r.left-q.left,y:r.top-q.top,w:r.width,h:r.height}}
function overlays(p){
  var o1=1-ss(.22,.32,p),o2=ss(.36,.44,p)*(1-ss(.58,.66,p)),o3=ss(.74,.82,p);
  src.style.opacity=o1.toFixed(3);hid.style.opacity=o2.toFixed(3);
  var sp=proj(C[0].userData.screen);
  /* เส้นไหลจากป้ายแหล่งเพลง → จอ */
  var mob=mobile();
  lnP.forEach(function(path,i){var ch=chips[i],on=o1>.02;if(!ch||!on){path.style.opacity=0;lnC[i]&&(lnC[i].style.opacity=0);return}
    var r=rel(ch),x1=mob?r.x+r.w/2:r.x,y1=mob?r.y+r.h:r.y+r.h/2,x2=sp.x+(i-1)*(mob?30:50),y2=sp.y+(i-1)*14;
    var mx=(x1+x2)/2;path.setAttribute('d',mob?('M'+x1+' '+y1+' Q'+x1+' '+(y1+(y2-y1)*.6)+' '+x2+' '+y2):('M'+x1+' '+y1+' C'+mx+' '+y1+' '+mx+' '+y2+' '+x2+' '+y2));
    path.style.opacity=(o1*(chips[i].classList.contains('on')?1:.35)).toFixed(3);path.style.strokeDashoffset=String(-(p*900)%10000);
    lnC[i]&&(lnC[i].setAttribute('cx',x2),lnC[i].setAttribute('cy',y2),lnC[i].setAttribute('r',4),lnC[i].style.opacity=(o1*(chips[i].classList.contains('on')?1:0)).toFixed(3))});
  /* ป้ายชื่อเครื่อง ติดกับตำแหน่ง 3 มิติ */
  var LB=cfg.labels||{},defs=[[C[0],LB.cdj,o2*(1-ss(.62,.7,p))+o3],[C[1],LB.cdj,o2*(1-ss(.62,.7,p))+o3],[S11,LB.s11,o2*(1-ss(.60,.68,p))],[A9,LB.a9,o3],[C[2],LB.cdj,o3],[C[3],LB.cdj,o3]];
  tags.forEach(function(tg,i){var d=defs[i];if(!d||!d[1]){tg.style.opacity=0;return}var a=clamp(d[2],0,1);if(mob&&p>.66&&i!==3)a=0;if(a<.02||!d[0].visible){tg.style.opacity=0;return}
    var q=proj(d[0],new THREE.Vector3(0,.02,.31));tg.textContent=d[1];tg.style.opacity=a.toFixed(3);tg.style.transform='translate3d('+(q.x-tg.offsetWidth/2).toFixed(1)+'px,'+(q.y+16).toFixed(1)+'px,0)'});
  /* บีต 2: เส้นจากการ์ด HID ไปที่จอของเครื่องหลัก */
  if(o2>.02&&lnP[0]){var hr=rel(hid),x1=mob?hr.x+hr.w/2:hr.x,y1=mob?hr.y+hr.h:hr.y+hr.h/2,x2=sp.x,y2=sp.y;lnP[0].setAttribute('d','M'+x1+' '+y1+' C'+(x1-(mob?0:140))+' '+y1+' '+x2+' '+(y2+(mob?0:120))+' '+x2+' '+y2);lnP[0].style.opacity=o2.toFixed(3);lnP[0].style.strokeDashoffset=String(-(p*900)%10000);if(lnC[0]){lnC[0].setAttribute('cx',x2);lnC[0].setAttribute('cy',y2);lnC[0].setAttribute('r',4);lnC[0].style.opacity=o2.toFixed(3)}}
}

/* ---------- วาด ---------- */
var tgt=0,cur=-1,W0=0,H0=0,vis=false;
function size(){var hh=document.querySelector('header.top');TOP=hh?hh.offsetHeight:72;pin.style.top=TOP+'px';pin.style.height='calc(100vh - '+TOP+'px)';var r=pin.getBoundingClientRect();if(r.width===W0&&r.height===H0)return;W0=r.width;H0=r.height;
  R.setPixelRatio(Math.min(devicePixelRatio||1,mobile()?1.5:2));R.setSize(W0,H0,false);cam.aspect=W0/H0;
  cam.fov=FOV;cam.setViewOffset(W0,H0,mobile()?0:-W0*.14,mobile()?H0*.2:0,W0,H0);cam.updateProjectionMatrix();
  lines.setAttribute('viewBox','0 0 '+W0+' '+H0)}
var TOP=72;
function readP(){var r=sc.getBoundingClientRect(),h=r.height-(innerHeight-TOP);return h>0?clamp((TOP-r.top)/h,0,1):0}
var last=0,VMAX=.32,KR=4.2;   /* หนืด: ไล่ตามการเลื่อนแบบนุ่ม (KR) และจำกัดความเร็วสูงสุด (VMAX = สัดส่วนของทั้งเรื่องต่อวินาที) ให้รูดเร็วแค่ไหนก็ไม่ข้ามฉาก */
function frame(now){raf=0;size();now=now||performance.now();var dt=last?Math.min(.05,(now-last)/1000):.016;last=now;
  if(cur<0)cur=tgt;var d=tgt-cur,st=d*(1-Math.exp(-KR*dt)),mx=VMAX*dt;st=Math.max(-mx,Math.min(mx,st));cur+=st;if(Math.abs(tgt-cur)<.0004)cur=tgt;
  layout(cur);camAt(cur);R.render(S,cam);textMotion(cur);overlays(cur);prog.style.transform='scaleY('+cur.toFixed(4)+')';
  if(cur!==tgt)raf=requestAnimationFrame(frame);else last=0}
function kick(){tgt=readP();if(!raf&&vis)raf=requestAnimationFrame(frame)}
window.__apkick=function(){W0=0;kick()};addEventListener('scroll',kick,{passive:true});addEventListener('resize',function(){W0=0;kick()});
new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis){tgt=readP();cur=tgt;if(!raf)raf=requestAnimationFrame(frame)}},{rootMargin:'200px 0px'}).observe(sc);
tgt=readP();cur=tgt;
}   /* go */
}   /* assemble */
}   /* build */
})();

/* ---- เนื้อหาโผล่ตามการเลื่อน + แท็บ "ดูใกล้ๆ" (ซูมเฉพาะจุดที่ตรงกับรูป — data-ring บน #zoom) ---- */
(function(){
'use strict';
var root=document.querySelector('main.ap');if(!root)return;
document.documentElement.classList.add('js');
var rv=[].slice.call(root.querySelectorAll('.rv'));
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.15,rootMargin:'0px 0px -6% 0px'});rv.forEach(function(n){io.observe(n)})}else{rv.forEach(function(n){n.classList.add('in')})}
var tabs=[].slice.call(root.querySelectorAll('.ap-tabs [role=tab]')),zoom=document.getElementById('zoom'),ring=document.getElementById('ring');
if(!tabs.length||!zoom||!ring)return;
var rg;try{rg=JSON.parse(zoom.getAttribute('data-ring')||'null')}catch(e){rg=null}
function show(i){tabs.forEach(function(t,k){var on=k===i;t.classList.toggle('on',on);t.setAttribute('aria-selected',on?'true':'false');var p=document.getElementById('lp'+k);if(p)p.hidden=!on});
  if(i===0&&rg){zoom.style.transform='scale('+rg.scale+')';ring.style.cssText='left:'+rg.left+'%;top:'+rg.top+'%;width:'+rg.w+'%;height:'+rg.h+'%;opacity:1'}else{zoom.style.transform='none';ring.style.opacity='0'}}
tabs.forEach(function(t,i){t.addEventListener('click',function(){show(i)});t.addEventListener('keydown',function(e){var n=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:-1;if(n>=0&&n<tabs.length){e.preventDefault();tabs[n].focus();show(n)}})});
var seen=false;if('IntersectionObserver' in window){new IntersectionObserver(function(es){if(es[0].isIntersecting&&!seen){seen=true;show(0)}},{threshold:.4}).observe(document.querySelector('.ap-lookimg'))}else{show(0)}
})();
