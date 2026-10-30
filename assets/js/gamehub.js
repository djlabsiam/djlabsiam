/* /game/ —
   1) the main button: reads only the player's own progress to say "start" or "continue" — the SAME rules as the game and /member/ (assets/js/sfprogress.js:
      the highest open Phase that is not finished, at the game's first open level). This page does not ask the account for results (that needs a token), so only this browser's stats count. Nothing is sent or written.
   2) the Leader Board: asks the Edge Function "game-scores" (action "board", public: no token, no member data is sent). Rows hold only nickname + numbers. Written with textContent.
      If the function does not answer, the "coming soon" card stays and nothing else on the page changes. */
(function () {
  var go = document.getElementById('gh-go'), sub = document.getElementById('gh-sub'), SP = window.sfProgress;
  if (go && sub && SP) {
    var r = SP.resume();
    if (r.passed) {
      go.textContent = 'เล่นต่อ';
      if (r.next) {
        go.href = '/game/signal-flow/' + (r.next[0] === 1 ? '?level=' + r.next[1] : '?phase=' + r.next[0] + '&level=' + r.next[1]);
        sub.textContent = 'ต่อที่ Phase ' + r.next[0] + ' ด่าน ' + r.next[1] + ' · ผ่านแล้ว ' + r.passed + ' / ' + r.total + ' ด่านใน Phase 1–3 (อ่านจากเครื่องนี้)';
      } else {
        go.href = '/game/signal-flow/';
        sub.textContent = 'ผ่านครบทุกด่านที่เปิดอยู่แล้ว (อ่านจากเครื่องนี้)';
      }
    }
  }

  var sec = document.getElementById('leaderboard');
  if (!sec || !window.fetch) return;
  var FN = sec.dataset.fn, KEY = sec.dataset.key, lb = document.getElementById('lb'), soon = document.getElementById('lbsoon');
  var body = document.getElementById('lbody'), cap = document.getElementById('lbcap'), tabs = lb ? lb.querySelectorAll('[role=tab]') : [];
  if (!FN || !KEY || !lb || !body) return;
  var shown = false;

  function ask(phase) {
    var b = { action: 'board', game: 'signal-flow' };
    if (phase) b.phase = phase;
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 15000);
    return fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify(b), signal: c.signal })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: false, j: null }; }); })
      .then(function (x) { clearTimeout(t); return x; }, function () { clearTimeout(t); return { ok: false, j: null }; });
  }
  function ms(t) { t = Number(t) || 0; var m = Math.floor(t / 60000), s = ((t % 60000) / 1000).toFixed(1); return m + ':' + (Number(s) < 10 ? '0' : '') + s; }
  function cell(tr, text, cls) { var td = document.createElement('td'); td.textContent = text; if (cls) td.className = cls; tr.appendChild(td); }
  function draw(j, label) {
    body.textContent = '';
    var rows = Array.isArray(j.rows) ? j.rows : [];
    if (!rows.length) {
      var tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 5; td.textContent = 'ยังไม่มีใครขึ้นกระดาน'; tr.appendChild(td); body.appendChild(tr);
    }
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      cell(tr, String(r.rank)); cell(tr, String(r.nickname));
      cell(tr, r.passed + (j.levels_total ? ' / ' + j.levels_total : '')); cell(tr, String(r.score)); cell(tr, ms(r.time_ms));
      body.appendChild(tr);
    });
    cap.textContent = label;
  }
  function pick(tab) {
    [].forEach.call(tabs, function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
    var p = +tab.dataset.p;
    return ask(p).then(function (x) {
      if (x.ok && x.j && x.j.ok === true) { draw(x.j, tab.textContent); return true; }
      if (shown) { body.textContent = ''; cap.textContent = 'ตอนนี้ดูอันดับไม่ได้ ลองใหม่อีกครั้งในสักครู่'; }
      return false;
    });
  }
  [].forEach.call(tabs, function (t) { t.addEventListener('click', function () { if (!t.disabled) pick(t); }); });
  pick(tabs[0]).then(function (ok) {
    if (!ok) return;
    shown = true; lb.hidden = false; if (soon) soon.hidden = true;
  });
})();
