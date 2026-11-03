/* Member QR — the logic only: ask member-auth for a short-lived token, count it down, renew it quietly, drop it. No page, no storage, no network of its own:
   the page (member.js) passes in how to get the session token and how to call member-auth, and draws the QR. The token lives in this closure and nowhere else
   (never written to any browser storage, the address bar or the console) and is thrown away on close(). The QR identifies the member to staff at the counter — nothing more. */
(function (root) {
  var TOKEN_RE = /^DJLM1\.[A-Za-z0-9._~+\/=-]{8,1500}$/;   // "DJLM1." + the server's text; anything else is refused and never drawn
  var DEFAULT_TTL = 120, REFRESH_AT = 30, RETRY_MS = 10000;

  function ttlOf(j) { var n = Number(j && j.expires_in); return n >= 10 && n <= 600 ? Math.floor(n) : DEFAULT_TTL; }

  // member-auth answers { ok:false, error:{ code } }: 401 unauthorized and 403 not_member → signed out (same as every other action on the page) · 429 rate_limited → asked too often ·
  // 409 no_account → this account cannot use QR yet · no answer → offline · 503 / anything else → unavailable
  function kindOf(x) {
    if (!x || !x.status) return 'net';
    var c = x.j && x.j.error && x.j.error.code;
    if (x.status === 401 || c === 'unauthorized' || c === 'not_member') return 'unauthorized';
    if (x.status === 429 || c === 'rate_limited') return 'rate';
    if (x.status === 403 || x.status === 409 || c === 'no_account') return 'denied';
    return 'unavailable';
  }

  /* o = { getToken(): Promise<session token | null>, request(sessionToken): Promise<{status, j}>, now(): ms, every(fn, ms): cancel, onChange(state) }
     state = { phase: 'loading' | 'ready' | 'expired' | 'error' | 'signedout' | 'closed', token, total, left (s), seq, code ('net' | 'rate' | 'denied' | 'unavailable') } */
  function create(o) {
    var token = null, expiresAt = 0, total = DEFAULT_TTL, seq = 0, gen = 0, busy = false, shown = true, cancel = null, nextTryAt = 0, phase = 'closed';

    function left() { return token ? Math.max(0, Math.ceil((expiresAt - o.now()) / 1000)) : 0; }
    function emit(code) { o.onChange({ phase: phase, token: token, total: total, left: left(), seq: seq, code: code || '' }); }
    function stop() { if (cancel) { cancel(); cancel = null; } }
    function drop() { token = null; expiresAt = 0; }

    function fail(kind, silent) {
      if (kind === 'unauthorized') { stop(); drop(); phase = 'signedout'; emit(); return; }
      if (silent && token && left() > 0 && kind !== 'denied') { nextTryAt = o.now() + RETRY_MS; return; }   // the QR on screen still works: keep it, try again a bit later
      drop(); phase = 'error'; emit(kind);
    }

    function ask(silent) {
      if (busy) return;
      busy = true;
      var my = gen;
      if (!silent) { drop(); phase = 'loading'; emit(); }
      o.getToken().then(function (tok) {
        if (my !== gen) return null;
        if (!tok) { busy = false; fail('unauthorized', silent); return null; }   // no session: never ask for a QR
        return o.request(tok).then(function (x) {
          if (my !== gen) return;
          busy = false;
          var j = x && x.j, ok = x && x.status === 200 && j && j.ok === true && typeof j.token === 'string' && TOKEN_RE.test(j.token);
          if (!ok) { fail(x && x.status === 200 ? 'unavailable' : kindOf(x), silent); return; }
          token = j.token; total = ttlOf(j); expiresAt = o.now() + total * 1000; seq += 1; nextTryAt = 0; phase = 'ready'; emit();
        });
      }).catch(function () {
        if (my !== gen) return;
        busy = false; fail('net', silent);
      });
    }

    function tick() {
      if (phase !== 'ready') return;
      var l = left();
      if (l <= 0) { drop(); phase = 'expired'; emit(); return; }
      emit();
      if (l <= REFRESH_AT && shown && !busy && o.now() >= nextTryAt) ask(true);   // quiet renewal while the panel is open and the tab is visible
    }

    return {
      open: function () { gen += 1; busy = false; stop(); drop(); shown = true; cancel = o.every(tick, 1000); ask(false); },
      retry: function () { if (phase !== 'closed') ask(false); },
      visible: function (v) { shown = !!v; if (shown && phase === 'ready') tick(); },
      close: function () { gen += 1; busy = false; stop(); drop(); phase = 'closed'; emit(); }
    };
  }

  var api = { create: create, TOKEN_RE: TOKEN_RE };
  root.DJLQR = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
