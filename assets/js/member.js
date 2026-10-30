/* Member sign-in page (/member/). Talks only to the shop's Supabase project: the Edge Function "member-auth" (request_otp · verify_otp · login · link_line · me),
   the RPC web_member_me, the Edge Function "game-scores" (Leader Board nickname) and the Auth token-refresh address. No library, no other third party — except the LINE LIFF script, which is loaded ONLY after the member presses "link LINE".
   The browser never receives or shows an e-mail address (the Supabase session carries a made-up address: never display it). Everything is written with textContent. */
(function () {
  var root = document.getElementById('mem');
  if (!root || !window.fetch) return;
  var D = root.dataset, FN = D.fn, REST = D.rest, KEY = D.key, AUTH = D.fn.split('/functions/')[0] + '/auth/v1/', LIFF_ID = D.liff, LIFF_SDK = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
  var STORE = 'djl-member-session', PENDING = 'djl-member-line-pending';
  var $ = function (id) { return document.getElementById(id); };
  var VIEWS = ['login', 'first', 'verify', 'line', 'profile', 'boot'];
  var ctx = { code: '', phone: '' };   // kept in memory only, between "identify" and "verify"
  var resendTimer = null;

  /* ---- ?next= : a way back to the shop's game after signing in. Only paths under /game/signal-flow/ (no other site, no // \ : .. % or spaces); anything else is ignored ---- */
  function safeNext(q) {
    var p = new URLSearchParams(q).get('next');   // decoded once; anything still %-encoded is refused below
    if (!p || p.indexOf('/game/signal-flow/') !== 0 || /\/\/|\\|:|\.\.|%|[\x00-\x20\x7f]/.test(p)) return null;
    return p;
  }
  var NEXT = safeNext(location.search);
  function backLink() {   // shown only on the signed-in profile; never redirects by itself
    if (!NEXT || $('b-next')) return;
    var a = document.createElement('a'); a.id = 'b-next'; a.className = 'btn pri'; a.href = NEXT; a.textContent = 'กลับไปเล่นเกม';
    $('v-profile').insertBefore(a, $('b-logout'));
  }

  /* ---- storage (always inside try: private windows can refuse) ---- */
  function load() { try { var s = JSON.parse(localStorage.getItem(STORE) || 'null'); return s && s.access_token && s.refresh_token ? s : null; } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(STORE, JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || 0 })); } catch (e) { } }
  function clear() { try { localStorage.removeItem(STORE); } catch (e) { } }
  function flag(v) { try { if (v) sessionStorage.setItem(PENDING, '1'); else sessionStorage.removeItem(PENDING); } catch (e) { } }
  function flagged() { try { return sessionStorage.getItem(PENDING) === '1'; } catch (e) { return false; } }

  /* ---- views ---- */
  function show(name) {
    VIEWS.forEach(function (v) { var e = $('v-' + v); if (e) e.hidden = v !== name; });
    var h = document.querySelector('#v-' + name + ' h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
  }
  function say(id, text, ok) { var e = $(id); if (!e) return; e.textContent = text || ''; e.hidden = !text; e.className = 'mm' + (ok ? ' ok' : ''); }
  function busy(btn, on, label) { if (!btn) return; btn.disabled = on; btn.textContent = on ? label : btn.dataset.label; }

  /* ---- calls ---- */
  var NET = 'เชื่อมต่อระบบไม่ได้ ลองใหม่อีกครั้ง หรือทักทีมงานทาง LINE @djlabsiam';
  function call(body, token, url) {
    var h = { 'Content-Type': 'application/json', apikey: KEY };
    if (token) h.Authorization = 'Bearer ' + token;
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 20000);
    return fetch(url || FN, { method: 'POST', headers: h, body: JSON.stringify(body), signal: c.signal })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }, function () { return { status: r.status, j: null }; }); })
      .then(function (x) { clearTimeout(t); return x; }, function () { clearTimeout(t); return { status: 0, j: null }; });
  }
  function errOf(x) { return x.j && x.j.error ? x.j.error : { code: x.status ? 'unavailable' : 'net', message: x.status ? 'ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้ง' : NET }; }
  function now() { return Math.floor(Date.now() / 1000); }
  function fresh() {   // a usable access token, refreshing it with the refresh token when it is about to expire
    var s = load(); if (!s) return Promise.resolve(null);
    if (s.expires_at && s.expires_at - now() > 60) return Promise.resolve(s.access_token);
    return fetch(AUTH + 'token?grant_type=refresh_token', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify({ refresh_token: s.refresh_token }) })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (j) {
        if (!j || !j.access_token) { clear(); return null; }
        save({ access_token: j.access_token, refresh_token: j.refresh_token || s.refresh_token, expires_at: j.expires_at || (now() + (j.expires_in || 3600)) });
        return j.access_token;
      });
  }
  function rpcMe(token) {   // name + member code of the signed-in member (web_member_me): never phone / e-mail
    return fetch(REST + 'web_member_me', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + token }, body: '{}' })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (a) { return Array.isArray(a) && a[0] && a[0].is_member ? a[0] : null; });
  }

  /* ---- password rules (same as the server; checked first so nobody wastes a code) ---- */
  function weak(p) {
    if (p.length < 10) return 'รหัสผ่านต้องยาวอย่างน้อย 10 ตัวอักษร';
    if (new TextEncoder().encode(p).length > 72) return 'รหัสผ่านยาวเกินไป (ไม่เกิน 72 ไบต์ ตัวอักษรไทยนับตัวละ 3 ไบต์)';
    if (/^[0-9]+$/.test(p)) return 'รหัสผ่านต้องไม่ใช่ตัวเลขล้วน';
    if (/^(.)\1+$/.test(p)) return 'รหัสผ่านต้องไม่ใช่ตัวอักษรตัวเดียวซ้ำกัน';
    return '';
  }

  /* ---- after a session is obtained ---- */
  function enter(first, lineLinked) {
    if (first && lineLinked === false && D.line === '1') { show('line'); say('m-line', ''); return; }
    profile();
  }
  function profile() {
    show('boot');
    fresh().then(function (tok) {
      if (!tok) { show('login'); return; }
      return Promise.all([call({ action: 'me' }, tok), rpcMe(tok)]).then(function (r) {
        var me = r[0], row = r[1];
        if (!me.j || me.j.ok !== true) { var e = errOf(me); if (e.code === 'unauthorized' || e.code === 'not_member') { clear(); show('login'); say('m-login', 'กรุณาเข้าสู่ระบบอีกครั้ง'); } else { $('p-name').textContent = 'สมาชิก DJ LAB SIAM'; show('profile'); say('m-profile', e.message); } return; }
        $('p-name').textContent = row && row.full_name ? row.full_name : 'สมาชิก DJ LAB SIAM';
        $('p-code').textContent = me.j.member.code;
        paintAvatar(me.j.member.avatar);
        var linked = !!me.j.member.line_linked;
        $('p-line').textContent = linked ? 'ผูก LINE แล้ว' : 'ยังไม่ได้ผูก LINE';
        $('b-linkline').hidden = linked || D.line !== '1';
        say('m-profile', '');
        backLink();
        paintGame();
        show('profile');
        loadBoard(tok);
      });
    });
  }

  /* ---- game Leader Board (Edge Function "game-scores"): nickname · hide · delete — only for the signed-in member; the token always comes from fresh().
     The page shows what the function returns (nickname, rank, numbers); never a name, phone, code or e-mail from the member's record. ---- */
  var GAMES = D.games || '';
  function gcall(body, tok) { return call(body, tok, GAMES); }
  function ms(t) { t = Number(t) || 0; var m = Math.floor(t / 60000), s = ((t % 60000) / 1000).toFixed(1); return m + ':' + (Number(s) < 10 ? '0' : '') + s; }
  function boardMsg(text, ok) { say('m-board', text, ok); }
  function paintBoard(me) {
    var nick = typeof me.nickname === 'string' ? me.nickname : '', n = me.levels && me.levels.length ? me.levels.length : 0, t = me.total, st = $('bd-state');
    if (nick && t) st.textContent = 'ชื่อเล่นบนกระดาน: ' + nick + ' · อันดับ ' + t.rank + ' · ผ่าน ' + t.passed + ' ด่าน · คะแนนรวม ' + t.score + ' · เวลารวม ' + ms(t.time_ms);
    else if (nick) st.textContent = 'ชื่อเล่นบนกระดาน: ' + nick + ' · ยังไม่มีคะแนนที่ขึ้นกระดาน เล่นเกมเพื่อเริ่มสะสมคะแนน';
    else if (n) st.textContent = 'ตอนนี้คุณไม่ได้ขึ้นกระดาน (คะแนนเดิม ' + n + ' ด่านยังเก็บไว้) ตั้งชื่อเล่นเพื่อกลับขึ้นกระดาน';
    else st.textContent = 'ยังไม่ได้เข้าร่วมกระดาน ตั้งชื่อเล่นเพื่อให้คะแนนของคุณขึ้นกระดาน';
    var b = $('b-nick'); b.dataset.label = nick ? 'บันทึกชื่อเล่นใหม่' : 'เข้าร่วมกระดาน'; b.textContent = b.dataset.label;
    if (document.activeElement !== $('n-nick')) $('n-nick').value = nick;
    $('f-nick').hidden = false; $('b-hide').hidden = !nick; $('b-del').hidden = !(nick || n); $('bd-cf').hidden = true;
  }
  function loadBoard(tok) {
    var box = $('p-board'); if (!GAMES || !box) return;
    gcall({ action: 'me', game: 'signal-flow' }, tok).then(function (x) {
      if (x.j && x.j.ok === true) { box.hidden = false; paintBoard(x.j); window.SF_ME = { levels: x.j.levels || [] }; paintGame(); return; }
      var e = errOf(x);
      if (e.code === 'not_member' || e.code === 'unauthorized') { box.hidden = true; return; }
      box.hidden = false; $('bd-state').textContent = 'ตอนนี้ดูข้อมูลกระดานคะแนนไม่ได้';
      $('f-nick').hidden = $('b-hide').hidden = $('b-del').hidden = $('bd-cf').hidden = true; boardMsg(e.message);
    });
  }
  function boardAct(btn, body, okText) {   // one action → message → refresh the card
    busy(btn, true, 'กำลังทำรายการ…'); boardMsg('');
    return fresh().then(function (tok) {
      if (!tok) { show('login'); say('m-login', 'กรุณาเข้าสู่ระบบอีกครั้ง'); return null; }
      return gcall(body, tok).then(function (x) {
        busy(btn, false);
        if (x.j && x.j.ok === true) { boardMsg(typeof okText === 'function' ? okText(x.j) : okText, true); loadBoard(tok); return x.j; }
        var e = errOf(x);
        if (e.code === 'unauthorized') { clear(); show('login'); say('m-login', 'กรุณาเข้าสู่ระบบอีกครั้ง'); return null; }
        boardMsg(e.message); return null;
      });
    });
  }
  $('f-nick').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = $('n-nick').value.trim().replace(/\s+/g, ' ');
    if (v.length < 3 || v.length > 16) { boardMsg('ชื่อเล่นต้องยาว 3–16 ตัวอักษร'); $('n-nick').focus(); return; }
    boardAct($('b-nick'), { action: 'nickname', nickname: v }, 'บันทึกชื่อเล่นแล้ว');
  });
  $('b-hide').addEventListener('click', function () { boardAct($('b-hide'), { action: 'hide' }, 'ซ่อนจากกระดานแล้ว ชื่อเล่นหายไป คะแนนเดิมยังเก็บไว้'); });
  $('b-del').addEventListener('click', function () { $('bd-cf').hidden = false; $('bd-cft').tabIndex = -1; $('bd-cft').focus(); });
  $('b-delno').addEventListener('click', function () { $('bd-cf').hidden = true; $('b-del').focus(); });
  $('b-delyes').addEventListener('click', function () {
    boardAct($('b-delyes'), { action: 'delete' }, function (j) { return 'ลบคะแนนและชื่อเล่นทั้งหมดแล้ว' + (typeof j.scores === 'number' ? ' (' + j.scores + ' รายการ)' : ''); });
  });

  /* ---- avatar: one of six shop-made pictures, stored on the account (member-auth: `me` returns member.avatar · action set_avatar). Never kept in the browser, never sent to the game board ---- */
  var AVK = ['vinyl', 'phones', 'cdj', 'fader', 'wave', 'user'], avSaved = 'user', avPick = 'user';
  function avMark(k) { [].forEach.call(document.querySelectorAll('#av-pick .av-opt'), function (x) { x.setAttribute('aria-pressed', x.dataset.k === k ? 'true' : 'false'); }); }
  function avCard(k) { var b = document.querySelector('#av-pick .av-opt[data-k="' + k + '"]'), av = $('p-av'); if (!b || !av) return; av.dataset.k = k; av.replaceChildren(b.firstElementChild.cloneNode(true)); }
  function paintAvatar(k) {   // k = what the account has saved (null/unknown = not chosen yet → the plain "user" picture)
    k = AVK.indexOf(k) >= 0 ? k : 'user'; avSaved = avPick = k; avCard(k); avMark(k); $('b-avsave').disabled = true;
  }
  [].forEach.call(document.querySelectorAll('#av-pick .av-opt'), function (b) {
    b.addEventListener('click', function () { avPick = b.dataset.k; avMark(avPick); say('m-avatar', ''); $('b-avsave').disabled = avPick === avSaved; });
  });
  $('b-avsave').addEventListener('click', function () {
    var btn = $('b-avsave'), want = avPick;
    busy(btn, true, 'กำลังบันทึก…'); say('m-avatar', '');
    fresh().then(function (tok) {
      if (!tok) { busy(btn, false); show('login'); say('m-login', 'กรุณาเข้าสู่ระบบอีกครั้ง'); return; }
      return call({ action: 'set_avatar', avatar: want }, tok).then(function (x) {
        busy(btn, false);
        if (x.j && x.j.ok === true) { paintAvatar(x.j.avatar || want); say('m-avatar', 'บันทึกอวาตาร์แล้ว', true); return; }
        var e = errOf(x);
        if (e.code === 'unauthorized' || e.code === 'not_member') { clear(); show('login'); say('m-login', 'กรุณาเข้าสู่ระบบอีกครั้ง'); return; }
        btn.disabled = avPick === avSaved; say('m-avatar', e.message);
      });
    });
  });

  /* ---- game card: where the player stopped. sf-resume:start = the game's own progress rules, copied word for word from game/signal-flow/index.html
     (tools/check_pages.py keeps the two in step). "Passed" = a result saved on the account (game-scores `me`, only for members who joined the board) or in this browser (read only). ---- */
var SF_PN={1:12,2:14,3:14,4:12};
function sfPassed(p,n){
  if(window.SF_ME&&(SF_ME.levels||[]).some(function(l){return l.phase===p&&l.level===n;}))return true;
  try{return !!localStorage.getItem('signal-flow-best-p'+p+'-l'+n);}catch(e){return false;}
}
function sfFirstOpen(p){for(var n=SF_PN[p];n>=1;n--)if(sfPassed(p,n))return Math.min(n+1,SF_PN[p]);return 1;}
function sfPhaseDone(p){for(var n=1;n<=SF_PN[p];n++)if(!sfPassed(p,n))return false;return true;}
function sfPhaseOpen(p){if(p===1||sfPhaseDone(p-1))return true;for(var n=1;n<=SF_PN[p];n++)if(sfPassed(p,n))return true;return false;}
  function sfResume() {   // Phase 4 is not open yet → only Phase 1–3 count. Resume = the highest open Phase that is not finished, at the game's first open level
    var per = {}, passed = 0, next = null, p, n;
    for (p = 1; p <= 3; p++) { per[p] = 0; for (n = 1; n <= SF_PN[p]; n++) if (sfPassed(p, n)) per[p]++; passed += per[p]; }
    if (passed) for (p = 3; p >= 1; p--) if (sfPhaseOpen(p) && !sfPhaseDone(p)) { next = [p, sfFirstOpen(p)]; break; }
    return { passed: passed, next: next, per: per };
  }
  /* sf-resume:end */
  function paintGame() {
    var r = sfResume(), go = $('g-go'), st = $('g-state'); if (!go || !st) return;
    [1, 2, 3].forEach(function (p) { var e = document.querySelector('#p-game .pgr[data-p="' + p + '"]'); if (e) e.textContent = 'ผ่านแล้ว ' + r.per[p] + '/' + SF_PN[p] + ' ด่าน'; });
    go.hidden = false;
    if (!r.passed) { st.textContent = 'ยังไม่ได้เริ่มเล่น'; go.textContent = 'เริ่มเล่น Phase 1 ด่าน 1'; go.href = '/game/signal-flow/?phase=1&level=1'; }
    else if (r.next) { st.textContent = 'เล่นค้างอยู่: Phase ' + r.next[0] + ' ด่าน ' + r.next[1]; go.textContent = 'เล่นต่อ'; go.href = '/game/signal-flow/?phase=' + r.next[0] + '&level=' + r.next[1]; }
    else { st.textContent = 'ผ่านครบทุกด่านที่เปิดอยู่แล้ว'; go.hidden = true; }
  }

  /* ---- forms ---- */
  $('f-login').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = $('l-code').value.trim(), pw = $('l-pw').value, b = $('b-login');
    if (!code || !pw) { say('m-login', 'กรอกรหัสสมาชิกและรหัสผ่าน'); (code ? $('l-pw') : $('l-code')).focus(); return; }
    busy(b, true, 'กำลังเข้าสู่ระบบ…'); say('m-login', '');
    call({ action: 'login', member_code: code, password: pw }).then(function (x) {
      busy(b, false);
      if (x.j && x.j.ok === true && x.j.session) { save(x.j.session); $('l-pw').value = ''; enter(false, x.j.member && x.j.member.line_linked); return; }
      var er = errOf(x); say('m-login', er.message); if (er.code === 'invalid_credentials') $('l-pw').value = '';
    });
  });
  $('go-first').addEventListener('click', function () { say('m-first', ''); show('first'); });
  $('go-login').addEventListener('click', function () { say('m-login', ''); show('login'); });

  function lockResend() {
    var b = $('b-resend'), n = 60; b.disabled = true; clearInterval(resendTimer);
    function tick() { if (n <= 0) { clearInterval(resendTimer); b.disabled = false; b.textContent = 'ขอรหัสใหม่'; return; } b.textContent = 'ขอรหัสใหม่ได้ในอีก ' + n + ' วินาที'; n--; }
    tick(); resendTimer = setInterval(tick, 1000);
  }
  function requestOtp(b, after) {
    busy(b, true, 'กำลังส่ง…');
    call({ action: 'request_otp', member_code: ctx.code, phone: ctx.phone }).then(function (x) {
      busy(b, false);
      if (x.j && x.j.ok === true) { after(x.j.message); return; }
      var er = errOf(x); say(after.target, er.message);
    });
  }
  $('f-first').addEventListener('submit', function (e) {
    e.preventDefault();
    var code = $('f-code').value.trim(), phone = $('f-phone').value.trim();
    if (!code || phone.replace(/[^0-9]/g, '').length < 9) { say('m-first', 'กรอกรหัสสมาชิกและเบอร์โทรให้ครบ'); return; }
    ctx.code = code; ctx.phone = phone;
    var b = $('b-first'), a = function (msg) { say('m-verify', msg, true); show('verify'); lockResend(); $('v-otp').focus(); };
    a.target = 'm-first'; requestOtp(b, a);
  });
  $('b-resend').addEventListener('click', function () {
    var a = function (msg) { say('m-verify', msg, true); lockResend(); }; a.target = 'm-verify';
    requestOtp($('b-resend'), a);
  });
  $('back-first').addEventListener('click', function () { show('first'); });
  $('f-verify').addEventListener('submit', function (e) {
    e.preventDefault();
    var otp = $('v-otp').value.replace(/\s/g, ''), p1 = $('v-pw').value, p2 = $('v-pw2').value, b = $('b-verify');
    if (!/^[0-9]{6}$/.test(otp)) { say('m-verify', 'กรอกรหัสยืนยัน 6 หลักจากอีเมล'); $('v-otp').focus(); return; }
    var w = weak(p1); if (w) { say('m-verify', w); $('v-pw').focus(); return; }
    if (p1 !== p2) { say('m-verify', 'รหัสผ่านสองช่องไม่ตรงกัน'); $('v-pw2').focus(); return; }
    busy(b, true, 'กำลังตรวจสอบ…'); say('m-verify', '');
    call({ action: 'verify_otp', member_code: ctx.code, phone: ctx.phone, otp: otp, password: p1 }).then(function (x) {
      busy(b, false);
      if (x.j && x.j.ok === true && x.j.session) {
        save(x.j.session); $('v-pw').value = $('v-pw2').value = $('v-otp').value = ''; ctx = { code: '', phone: '' };
        enter(x.j.first_login === true, x.j.member && x.j.member.line_linked); return;
      }
      var er = errOf(x);
      if (x.j && x.j.account_ready === true) { say('m-login', 'สร้างบัญชีแล้ว กรุณาเข้าสู่ระบบด้วยรหัสสมาชิกและรหัสผ่านที่เพิ่งตั้ง'); show('login'); return; }
      say('m-verify', er.message);
      if (er.code === 'weak_password') $('v-pw').focus();
    });
  });

  /* ---- link LINE (LIFF script is loaded only after this press) ---- */
  function loadLiff() {
    return new Promise(function (ok, no) {
      if (window.liff) { ok(); return; }
      var s = document.createElement('script'); s.src = LIFF_SDK; s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
  }
  function startLine(msgId) {
    say(msgId, '');
    flag(true);
    loadLiff().then(function () { return window.liff.init({ liffId: LIFF_ID }); }).then(function () {
      if (!window.liff.isLoggedIn()) { window.liff.login({ redirectUri: location.origin + '/member/' }); return null; }
      return finishLine(msgId);
    }).catch(function () { flag(false); say(msgId, 'เปิด LINE Login ไม่ได้ในตอนนี้ ลองใหม่อีกครั้ง หรือทักทีมงานทาง LINE @djlabsiam'); });
  }
  function finishLine(msgId) {
    flag(false);
    var idt = window.liff.getIDToken();   // a fresh token at the moment of pressing: never stored
    if (!idt) { say(msgId, 'ไม่ได้รับสิทธิ์จาก LINE ลองใหม่อีกครั้ง'); return null; }
    return fresh().then(function (tok) {
      if (!tok) { show('login'); return null; }
      return call({ action: 'link_line', id_token: idt }, tok).then(function (x) {
        if (x.j && x.j.ok === true) { try { window.liff.logout(); } catch (e) { } profile(); return; }
        var er = errOf(x);
        if (er.code === 'unauthorized' || er.code === 'not_member') { clear(); show('login'); return; }
        say(msgId, er.message);
      });
    });
  }
  $('b-line').addEventListener('click', function () { startLine('m-line'); });
  $('b-linkline').addEventListener('click', function () { show('line'); startLine('m-line'); });
  $('b-skip').addEventListener('click', profile);
  $('b-logout').addEventListener('click', function () {
    var s = load(); clear(); flag(false);
    if (s) fetch(AUTH + 'logout?scope=local', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token } }).catch(function () { });
    show('login');
  });

  /* ---- start ---- */
  if (load()) {
    if (flagged() && D.line === '1') {
      show('boot');
      loadLiff().then(function () { return window.liff.init({ liffId: LIFF_ID }); }).then(function () {
        if (window.liff.isLoggedIn()) { show('line'); return finishLine('m-line'); }
        flag(false); profile();
      }).catch(function () { flag(false); profile(); });
    } else profile();
  } else show('login');
})();
