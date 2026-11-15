/* General-user account page (/account/): sign up / sign in with LINE or Google (no password), consent, "my account". Talks only to the shop's Supabase project:
   Edge Function "web-auth" (login · me · consent · link · delete_account), Edge Function "game-scores" (nickname · hide · delete) and the Auth token-refresh address.
   No library. The only third-party scripts: Google Identity Services, loaded ONLY after the person presses "Google" (never on page load). LINE Login is a plain redirect (PKCE), no SDK.
   Everything is written with textContent. Nothing here is logged, cached or put in a URL except what the provider needs (the OAuth request carries no consent and no return path). */
(function () {
  var root = document.getElementById('acc');
  if (!root || !window.fetch) return;
  var D = root.dataset, FN = D.fn, GAMES = D.games, KEY = D.key, AUTH = D.fn.split('/functions/')[0] + '/auth/v1/';
  var LINE_CH = D.linech, GID = D.gid || '', REDIRECT = 'https://djlabsiam.com/account/', POLICY = 'v1';
  var STORE = 'djl-account-session', FLOW = 'djl-account-flow', GSI = 'https://accounts.google.com/gsi/client';
  var $ = function (id) { return document.getElementById(id); };
  var VIEWS = ['boot', 'login', 'profile'];
  var me = null;   // last answer of action "me" (providers + consent)

  /* ---- storage (always inside try: private windows can refuse) ---- */
  function load() { try { var s = JSON.parse(localStorage.getItem(STORE) || 'null'); return s && s.access_token && s.refresh_token ? s : null; } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem(STORE, JSON.stringify({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || 0 })); } catch (e) { } }
  function clear() { try { localStorage.removeItem(STORE); } catch (e) { } }
  function flowGet() { try { var f = JSON.parse(sessionStorage.getItem(FLOW) || 'null'); return f && typeof f === 'object' ? f : null; } catch (e) { return null; } }
  function flowSet(f) { try { sessionStorage.setItem(FLOW, JSON.stringify(f)); return true; } catch (e) { return false; } }
  function flowDrop() { try { sessionStorage.removeItem(FLOW); } catch (e) { } }

  /* ---- ?return= : only a path under /game/ made of plain characters. Checked before it is stored and again before it is used (UA / URL tricks are refused, not repaired) ---- */
  function safeReturn(p) {
    if (typeof p !== 'string' || p.length > 200 || p.indexOf('/game/') !== 0) return null;
    if (!/^\/game\/[A-Za-z0-9\/_.?=&-]*$/.test(p) || /\/\/|\.\./.test(p)) return null;
    return p;
  }
  var RET = safeReturn(new URLSearchParams(location.search).get('return'));

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
  function fresh() {   // a usable access token, refreshed with the refresh token when it is about to expire
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
  function toLogin(msg) { clear(); me = null; show('login'); say('m-login', msg || ''); }

  /* ---- random strings for PKCE / state / nonce (crypto only, never a plain random function) ---- */
  var URLSAFE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  function rnd(n) { var b = new Uint8Array(n), s = ''; crypto.getRandomValues(b); for (var i = 0; i < n; i++) s += URLSAFE.charAt(b[i] % URLSAFE.length); return s; }
  function b64url(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function challengeOf(v) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(b64url); }

  /* ---- in-app browsers: Google often refuses to run there (disallowed_useragent). A help for the person, not a security gate ---- */
  var UA = navigator.userAgent || '';
  var INAPP = /\bLine\//i.test(UA) || /FBAN|FBAV|Instagram|MicroMessenger|TikTok/i.test(UA);

  /* ---- consent boxes ---- */
  function consentOf(prefix) { return { accepted_terms: $(prefix + '1').checked === true, marketing: $(prefix + '2').checked === true, analytics: $(prefix + '3').checked === true, policy_version: POLICY }; }
  function gate() { var on = $('c1').checked === true; $('b-line').disabled = !on; var g = $('b-google'); if (g) g.disabled = !on || INAPP; }

  /* ---- sign in: LINE (redirect with PKCE) ---- */
  function startLine(mode) {
    var consent = mode === 'link' ? null : consentOf('c');
    if (mode !== 'link' && !consent.accepted_terms) { say('m-login', 'ต้องติ๊กยอมรับนโยบายความเป็นส่วนตัวก่อน'); $('c1').focus(); return; }
    var verifier = rnd(64), state = rnd(32), nonce = rnd(32);
    challengeOf(verifier).then(function (ch) {
      var f = { provider: 'line', mode: mode || 'login', consent: consent, verifier: verifier, state: state, nonce: nonce, ret: RET, t: now() };
      if (!flowSet(f)) { say(mode === 'link' ? 'm-link' : 'm-login', 'เบราว์เซอร์นี้ไม่ยอมให้เก็บข้อมูลชั่วคราว เข้าสู่ระบบไม่ได้ ลองเปิดนอกโหมดส่วนตัว'); return; }
      var u = 'https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=' + encodeURIComponent(LINE_CH) + '&redirect_uri=' + encodeURIComponent(REDIRECT)
        + '&state=' + state + '&scope=openid&nonce=' + nonce + '&code_challenge=' + ch + '&code_challenge_method=S256';
      location.assign(u);
    }, function () { say(mode === 'link' ? 'm-link' : 'm-login', 'เบราว์เซอร์นี้ไม่รองรับการเข้าสู่ระบบอย่างปลอดภัย ลองใช้เบราว์เซอร์อื่น'); });
  }

  /* ---- sign in: Google Identity Services (script loaded only after the press) ---- */
  function loadGsi() {
    return new Promise(function (ok, no) {
      if (window.google && window.google.accounts && window.google.accounts.id) { ok(); return; }
      var s = document.createElement('script'); s.src = GSI; s.async = true; s.onload = ok; s.onerror = no; document.head.appendChild(s);
    });
  }
  function startGoogle(mode) {
    var consent = mode === 'link' ? null : consentOf('c'), msg = mode === 'link' ? 'm-link' : 'm-login';
    if (mode !== 'link' && !consent.accepted_terms) { say(msg, 'ต้องติ๊กยอมรับนโยบายความเป็นส่วนตัวก่อน'); $('c1').focus(); return; }
    if (!GID) { say(msg, 'การเข้าสู่ระบบด้วย Google ยังไม่เปิดใช้'); return; }
    var nonce = rnd(32);
    if (!flowSet({ provider: 'google', mode: mode || 'login', consent: consent, nonce: nonce, ret: RET, t: now() })) { say(msg, 'เบราว์เซอร์นี้ไม่ยอมให้เก็บข้อมูลชั่วคราว เข้าสู่ระบบไม่ได้ ลองเปิดนอกโหมดส่วนตัว'); return; }
    loadGsi().then(function () {
      var gi = window.google.accounts.id;
      gi.initialize({ client_id: GID, nonce: nonce, callback: function (r) { if (r && r.credential) finish({ provider: 'google', id_token: r.credential }); else say(msg, 'Google ไม่ส่งข้อมูลยืนยันกลับมา ลองใหม่อีกครั้ง'); }, auto_select: false, cancel_on_tap_outside: true });
      var box = $(mode === 'link' ? 'g-btn-link' : 'g-btn'); box.hidden = false; box.replaceChildren();
      gi.renderButton(box, { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 280, locale: 'th' });
      say(msg, 'กดปุ่ม Google ด้านล่างเพื่อเลือกบัญชี', true);
    }, function () { say(msg, 'เปิดตัวเข้าสู่ระบบของ Google ไม่ได้ในตอนนี้ ลองใหม่อีกครั้ง หรือเข้าด้วย LINE'); });
  }

  /* ---- finish: send the proof to web-auth (login or link), then draw the account ---- */
  function finish(p) {   // p = {provider, code, code_verifier?, redirect_uri?, id_token?}
    var f = flowGet() || {}, link = f.mode === 'link', msg = link ? 'm-link' : 'm-login';
    var body = { action: link ? 'link' : 'login', provider: p.provider, nonce: f.nonce };
    if (p.provider === 'line') { body.code = p.code; body.code_verifier = f.verifier; body.redirect_uri = REDIRECT; } else body.id_token = p.id_token;
    if (!link) body.consent = f.consent;
    show('boot'); say('m-boot', '');
    var tokP = link ? fresh() : Promise.resolve(null);
    return tokP.then(function (tok) {
      if (link && !tok) { flowDrop(); toLogin('กรุณาเข้าสู่ระบบอีกครั้ง'); return; }
      return call(body, tok).then(function (x) {
        flowDrop();
        if (x.j && x.j.ok === true) {
          if (!link && x.j.session) save(x.j.session);
          var back = safeReturn(f.ret);
          if (!link && back) { location.replace(back); return; }
          openProfile(link ? 'ผูกบัญชีเพิ่มแล้ว' : (x.j.status === 'signed_up' ? 'สมัครเรียบร้อย ยินดีต้อนรับ' : ''), x.j);
          return;
        }
        var e = errOf(x);
        if (link) { openProfile(''); say('m-link', e.message); return; }
        show('login'); say('m-login', e.message);
      });
    });
  }

  /* ---- coming back from LINE: ?code=&state= (state is checked HERE: the function never sees it) ---- */
  function handleCallback() {
    var q = new URLSearchParams(location.search), code = q.get('code'), state = q.get('state'), err = q.get('error');
    if (!code && !err) return false;
    history.replaceState(null, '', location.pathname);   // the code is single-use and must not stay in the address bar / history
    var f = flowGet();
    if (err || !f || f.provider !== 'line' || !state || state !== f.state || !f.verifier || !f.t || now() - f.t > 900 || typeof code !== 'string' || code.length > 512) {
      flowDrop(); var had = !!load(); if (had) openProfile(''); else show('login');
      say(had ? 'm-link' : 'm-login', err ? 'การเข้าสู่ระบบด้วย LINE ถูกยกเลิก' : 'การเข้าสู่ระบบหมดเวลาหรือไม่ถูกต้อง ลองใหม่อีกครั้ง');
      return true;
    }
    finish({ provider: 'line', code: code });
    return true;
  }

  /* ---- account screen ---- */
  var PNAME = { line: 'LINE', google: 'Google' };
  function openProfile(note, answer) {
    show('boot');
    fresh().then(function (tok) {
      if (!tok) { toLogin(); return; }
      return call({ action: 'me' }, tok).then(function (x) {
        if (!x.j || x.j.ok !== true) {
          var e = errOf(x);
          if (e.code === 'unauthorized' || e.code === 'not_web_user') { toLogin(e.code === 'not_web_user' ? 'บัญชีนี้ไม่ใช่บัญชีผู้ใช้ทั่วไป สมาชิกร้านเข้าที่หน้าสมาชิก' : 'กรุณาเข้าสู่ระบบอีกครั้ง'); return; }
          show('profile'); say('m-profile', e.message); return;
        }
        me = x.j; paint(); show('profile'); say('m-profile', note || '', !!note);
        loadBoard(tok);
      });
    });
  }
  function paint() {
    var ps = (me.providers || []).map(function (p) { return PNAME[p] || ''; }).filter(Boolean);
    $('p-prov').textContent = ps.length ? ps.join(' · ') : '—';
    $('b-link-line').hidden = (me.providers || []).indexOf('line') >= 0;
    $('b-link-google').hidden = (me.providers || []).indexOf('google') >= 0 || !GID || INAPP;
    $('p-link').hidden = $('b-link-line').hidden && $('b-link-google').hidden;
    var c = me.consent || {};
    $('k1').checked = c.accepted_terms === true; $('k2').checked = c.marketing === true; $('k3').checked = c.analytics === true;
    $('k-old').hidden = !(c.policy_version && c.policy_version !== POLICY);
    $('b-back').hidden = !safeReturn(RET); if (RET) $('b-back').href = RET;
  }

  /* ---- consent change / withdraw (adds a row on the server, never edits the old one) ---- */
  function guard(x) {   // common handling of an answer from a signed-in call; true = handled
    var e = errOf(x);
    if (e.code === 'unauthorized') { toLogin('กรุณาเข้าสู่ระบบอีกครั้ง'); return true; }
    return false;
  }
  $('f-consent').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var btn = $('b-consent'), c = consentOf('k');
    busy(btn, true, 'กำลังบันทึก…'); say('m-consent', '');
    fresh().then(function (tok) {
      if (!tok) { toLogin('กรุณาเข้าสู่ระบบอีกครั้ง'); return; }
      return call({ action: 'consent', accepted_terms: c.accepted_terms, marketing: c.marketing, analytics: c.analytics, policy_version: POLICY }, tok).then(function (x) {
        busy(btn, false);
        if (x.j && x.j.ok === true) { say('m-consent', c.accepted_terms ? 'บันทึกความยินยอมแล้ว' : 'บันทึกแล้ว: ชื่อเล่นของคุณหายจากกระดานและส่งคะแนนใหม่ไม่ได้จนกว่าจะยอมรับนโยบายอีกครั้ง', true); openProfileQuiet(tok); return; }
        if (!guard(x)) say('m-consent', errOf(x).message);
      });
    });
  });
  function openProfileQuiet(tok) { call({ action: 'me' }, tok).then(function (x) { if (x.j && x.j.ok === true) { me = x.j; paint(); loadBoard(tok); } }); }

  /* ---- nickname on the public board (game-scores; same shape as the member page) ---- */
  var SF = 'signal-flow';
  function gcall(body, tok) { body.game = body.game || SF; return call(body, tok, GAMES); }
  function boardMsg(t, ok) { say('m-board', t, ok); }
  function paintBoard(j) {
    var nick = typeof j.nickname === 'string' ? j.nickname : '', n = j.levels && j.levels.length ? j.levels.length : 0;
    $('bd-state').textContent = nick ? 'ชื่อเล่นบนกระดาน: ' + nick + (n ? ' · ผ่านแล้ว ' + n + ' ด่าน' : ' · ยังไม่มีคะแนน') : 'ยังไม่ได้ตั้งชื่อเล่น ตั้งชื่อเล่นเพื่อให้คะแนนของคุณขึ้นกระดาน (ไม่มีชื่อเล่น = ร้านไม่เก็บคะแนน)';
    var b = $('b-nick'); b.dataset.label = nick ? 'บันทึกชื่อเล่นใหม่' : 'ตั้งชื่อเล่น'; b.textContent = b.dataset.label;
    if (document.activeElement !== $('n-nick')) $('n-nick').value = nick;
    $('b-hide').hidden = !nick; $('b-del').hidden = !(nick || n); $('bd-cf').hidden = true;
  }
  function loadBoard(tok) {
    gcall({ action: 'me' }, tok).then(function (x) {
      if (x.j && x.j.ok === true) { paintBoard(x.j); return; }
      $('bd-state').textContent = 'ตอนนี้ดูข้อมูลกระดานคะแนนไม่ได้'; if (!guard(x)) boardMsg(errOf(x).message);
    });
  }
  function boardAct(btn, body, okText) {
    busy(btn, true, 'กำลังทำรายการ…'); boardMsg('');
    return fresh().then(function (tok) {
      if (!tok) { toLogin('กรุณาเข้าสู่ระบบอีกครั้ง'); return null; }
      return gcall(body, tok).then(function (x) {
        busy(btn, false);
        if (x.j && x.j.ok === true) { boardMsg(typeof okText === 'function' ? okText(x.j) : okText, true); loadBoard(tok); return; }
        if (!guard(x)) boardMsg(errOf(x).message);
      });
    });
  }
  $('f-nick').addEventListener('submit', function (ev) {
    ev.preventDefault();
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

  /* ---- delete the whole account (two steps) ---- */
  $('b-acc-del').addEventListener('click', function () { $('acc-cf').hidden = false; $('acc-cft').tabIndex = -1; $('acc-cft').focus(); });
  $('b-acc-no').addEventListener('click', function () { $('acc-cf').hidden = true; $('b-acc-del').focus(); });
  $('b-acc-yes').addEventListener('click', function () {
    var btn = $('b-acc-yes'); busy(btn, true, 'กำลังลบ…'); say('m-acc', '');
    fresh().then(function (tok) {
      if (!tok) { toLogin('กรุณาเข้าสู่ระบบอีกครั้ง'); return; }
      return call({ action: 'delete_account', confirm: true }, tok).then(function (x) {
        busy(btn, false);
        if (x.j && x.j.ok === true) { clear(); flowDrop(); me = null; $('acc-cf').hidden = true; show('login'); say('m-login', 'ลบบัญชีและข้อมูลทั้งหมดของคุณแล้ว', true); return; }
        if (!guard(x)) say('m-acc', errOf(x).message);
      });
    });
  });

  $('b-logout').addEventListener('click', function () { clear(); flowDrop(); me = null; show('login'); say('m-login', 'ออกจากระบบแล้ว', true); });

  /* ---- wire the sign-in screen ---- */
  ['c1', 'c2', 'c3'].forEach(function (id) { $(id).checked = false; $(id).addEventListener('change', gate); });   // never pre-ticked, even if the browser restores a form
  $('b-line').addEventListener('click', function () { startLine('login'); });
  if ($('b-google')) $('b-google').addEventListener('click', function () { startGoogle('login'); });
  $('b-link-line').addEventListener('click', function () { say('m-link', ''); startLine('link'); });
  $('b-link-google').addEventListener('click', function () { say('m-link', ''); startGoogle('link'); });
  if (INAPP) {
    var n = $('inapp'); n.hidden = false;
    var a = $('inapp-a'); a.href = location.pathname + '?openExternalBrowser=1' + (RET ? '&return=' + encodeURIComponent(RET) : '');
  }
  if (!GID) { var g = $('b-google'); if (g) g.hidden = true; }
  gate();

  /* ---- start ---- */
  if (!handleCallback()) { if (load()) openProfile(''); else show('login'); }
})();
