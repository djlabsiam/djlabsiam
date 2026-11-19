/* Header "สมาชิก" button (every page): when someone is signed in it shows their Leader Board nickname, else the member code (shop member) or "บัญชีของฉัน" (general web account).
   Signed out = nothing happens, no network (the check is a token in localStorage). Signed in: the label is cached in sessionStorage (one lookup per browser session);
   the lookup uses the same two Edge Functions the member / account pages use (game-scores "me" for the nickname; member-auth "me" for the member code only when there is no nickname).
   On /member/ and /account/ the page itself reports what it already knows (window.djlHdr.set) so nothing is fetched twice. Never shows a real name or contact details. Everything is written with textContent. */
(function () {
  var S = document.currentScript, btn = document.querySelector('header.top a.btn.mem'), lab = btn && btn.querySelector('.mn');
  if (!S || !btn || !lab || !window.fetch) return;
  var KEY = S.dataset.key, REST = S.dataset.api, BASE = REST.split('/rest/v1/')[0],
    GAMES = BASE + '/functions/v1/game-scores', MEMBER = BASE + '/functions/v1/member-auth', AUTH = BASE + '/auth/v1/';
  var STORES = { m: 'djl-member-session', a: 'djl-account-session' }, CACHE = 'djl-hdr', HREF = { m: '/member/', a: '/account/' };
  var DEF = lab.textContent, MAX = 18, own = /^\/(member|account)\//.test(location.pathname), st = { k: '', nick: '', code: '' };

  function tokens(k) { try { var s = JSON.parse(localStorage.getItem(STORES[k]) || 'null'); return s && s.access_token && s.refresh_token ? s : null; } catch (e) { return null; } }
  function kind() { return tokens('m') ? 'm' : tokens('a') ? 'a' : ''; }   // a shop member wins when both are present
  function sub(t) { try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub || ''; } catch (e) { return ''; } }
  function cacheGet() { try { var c = JSON.parse(sessionStorage.getItem(CACHE) || 'null'); return c && typeof c.t === 'string' && typeof c.k === 'string' ? c : null; } catch (e) { return null; } }
  function cacheSet(c) { try { if (c) sessionStorage.setItem(CACHE, JSON.stringify(c)); else sessionStorage.removeItem(CACHE); } catch (e) { } }
  function cut(t) { var a = Array.from(t); return a.length > MAX ? a.slice(0, MAX).join('') + '…' : t; }
  function paint(k, text) {
    btn.setAttribute('href', HREF[k] || '/member/');
    lab.textContent = text ? cut(text) : DEF;
    if (text && Array.from(text).length > MAX) btn.setAttribute('title', text); else btn.removeAttribute('title');
  }
  function reset() { st = { k: '', nick: '', code: '' }; cacheSet(null); paint('', ''); }
  function label(k) { return st.nick || (k === 'm' ? st.code : '') || (k === 'a' ? 'บัญชีของฉัน' : ''); }
  function save(k) {
    var s = tokens(k), t = label(k); if (!s || !t) return;
    paint(k, t); cacheSet({ k: k, u: sub(s.access_token), t: t });
  }

  /* pages /member/ and /account/ tell us what they just learned */
  window.djlHdr = {
    reset: reset,
    set: function (k, p) {
      if (!HREF[k] || !tokens(k)) return;
      if (st.k !== k) st = { k: k, nick: '', code: '' };
      if (typeof p.nick === 'string') st.nick = p.nick;
      if (typeof p.code === 'string') st.code = p.code;
      save(k);
    }
  };

  function now() { return Math.floor(Date.now() / 1000); }
  function fresh(k) {
    var s = tokens(k); if (!s) return Promise.resolve(null);
    if (s.expires_at && s.expires_at - now() > 60) return Promise.resolve(s.access_token);
    return fetch(AUTH + 'token?grant_type=refresh_token', { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify({ refresh_token: s.refresh_token }) })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
      .then(function (j) {
        if (!j || !j.access_token) return null;   // the sign-in pages own clearing a dead session; the header just stays as it is
        try { localStorage.setItem(STORES[k], JSON.stringify({ access_token: j.access_token, refresh_token: j.refresh_token || s.refresh_token, expires_at: j.expires_at || (now() + (j.expires_in || 3600)) })); } catch (e) { }
        return j.access_token;
      });
  }
  function post(url, body, tok) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 10000);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + tok }, body: JSON.stringify(body), signal: c.signal })
      .then(function (r) { clearTimeout(t); return r.ok ? r.json() : null; }).catch(function () { clearTimeout(t); return null; });
  }

  var k = kind();
  if (!k) { cacheSet(null); return; }   // signed out: no cache, no network
  var c = cacheGet(), s0 = tokens(k);
  if (c && c.k === k && s0 && c.u === sub(s0.access_token)) { paint(k, c.t); return; }
  cacheSet(null);
  if (own) return;   // /member/ and /account/ fill the header themselves
  fresh(k).then(function (tok) {
    if (!tok) return;
    return post(GAMES, { action: 'me', game: 'signal-flow' }, tok).then(function (j) {
      if (!j || j.ok !== true) return;   // not a member / not signed in any more: leave the button as it is
      st = { k: k, nick: typeof j.nickname === 'string' ? j.nickname : '', code: '' };
      if (st.nick || k === 'a') { save(k); return; }
      return post(MEMBER, { action: 'me' }, tok).then(function (m) {
        if (m && m.ok === true && m.member && typeof m.member.code === 'string') { st.code = m.member.code; save(k); }
      });
    });
  });
})();
