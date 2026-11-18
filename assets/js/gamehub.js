/* /game/ —
   1) the main button: reads only the player's own progress to say "start" or "continue" — the SAME rules as the game and /member/ (assets/js/sfprogress.js:
      the highest open Phase that is not finished, at the game's first open level). This page does not ask the account for results (that needs a token), so only this browser's stats count. Nothing is sent or written.
   2) the Leader Board: asks the Edge Function "game-scores" (action "board_public", public: no token, no member data is sent; the board holds every player who set a nickname, general user or member). Rows hold only nickname + numbers. Written with textContent.
      If the function does not answer, the "coming soon" card stays and nothing else on the page changes.
   3) Each game shows only its TOP 10 here (cut on this page; the server list is longer). RIM: the public "board_public" action of rim-scores, one list per song rank S–A–B–C–D (data-rim). */
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
  var TOP = 10;
  if (!KEY) return;
  var shown = false;

  function ask(url, b) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 15000);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY }, body: JSON.stringify(b), signal: c.signal })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }, function () { return { ok: false, j: null }; }); })
      .then(function (x) { clearTimeout(t); return x; }, function () { clearTimeout(t); return { ok: false, j: null }; });
  }
  function ms(t) { t = Number(t) || 0; var m = Math.floor(t / 60000), s = ((t % 60000) / 1000).toFixed(1); return m + ':' + (Number(s) < 10 ? '0' : '') + s; }
  function cell(tr, text, cls) { var td = document.createElement('td'); td.textContent = text; if (cls) td.className = cls; tr.appendChild(td); }
  function draw(j, label) {
    body.textContent = '';
    var rows = Array.isArray(j.rows) ? j.rows.slice(0, TOP) : [];
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
    var b = { action: 'board_public', game: 'signal-flow' };
    if (p) b.phase = p;
    return ask(FN, b).then(function (x) {
      if (x.ok && x.j && x.j.ok === true) { draw(x.j, tab.textContent); return true; }
      if (shown) { body.textContent = ''; cap.textContent = 'ตอนนี้ดูอันดับไม่ได้ ลองใหม่อีกครั้งในสักครู่'; }
      return false;
    });
  }
  if (FN && lb && body) {
    [].forEach.call(tabs, function (t) { t.addEventListener('click', function () { if (!t.disabled) pick(t); }); });
    pick(tabs[0]).then(function (ok) {
      if (!ok) return;
      shown = true; lb.hidden = false; if (soon) soon.hidden = true;
    });
  }

  // RIM: Top 10 per song rank (S–D). Same fields as game/rim/board.js (rank, nickname, song, level, diff, miss, score), text only.
  var RIM = sec.dataset.rim, rl = document.getElementById('lbrim');
  if (!RIM || !rl) return;
  var rb = document.getElementById('rimbody'), rc = document.getElementById('rimcap'), rt = rl.querySelectorAll('[role=tab]'), rshown = false;
  var LV = { 1: 'ง่าย', 2: 'ปกติ', 3: 'ยาก', 4: 'ยากสุด' };
  function two(td, a, b) {
    var x = document.createElement('b'), y = document.createElement('small');
    x.textContent = a; y.textContent = b; y.style.display = 'block'; td.appendChild(x); td.appendChild(y);
  }
  function drawRim(j, label) {
    rb.textContent = '';
    var rows = Array.isArray(j.rows) ? j.rows.slice(0, TOP) : [];
    if (!rows.length) {
      var e = document.createElement('tr'), d = document.createElement('td');
      d.colSpan = 5; d.textContent = 'ยังไม่มีใครขึ้นกระดาน'; e.appendChild(d); rb.appendChild(e);
    }
    rows.forEach(function (r) {
      var tr = document.createElement('tr'), td = document.createElement('td');
      cell(tr, String(r.rank));
      two(td, String(r.nickname), String(r.song) + ' · ' + (Number(r.diff) || 0).toFixed(2)); tr.appendChild(td);
      cell(tr, LV[r.level] || ''); cell(tr, String(r.miss)); cell(tr, Number(r.score).toLocaleString('en-US'));
      rb.appendChild(tr);
    });
    rc.textContent = label;
  }
  function pickRim(tab) {
    [].forEach.call(rt, function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
    return ask(RIM, { action: 'board_public', rank: tab.dataset.r }).then(function (x) {
      if (x.ok && x.j && x.j.ok === true) { drawRim(x.j, tab.textContent); return true; }
      if (rshown) { rb.textContent = ''; rc.textContent = 'ตอนนี้ดูอันดับไม่ได้ ลองใหม่อีกครั้งในสักครู่'; }
      return false;
    });
  }
  [].forEach.call(rt, function (t) { t.addEventListener('click', function () { pickRim(t); }); });
  pickRim(rt[0]).then(function (ok) { if (ok) { rshown = true; rl.hidden = false; } });
})();
