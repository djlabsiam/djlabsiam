/* /game/ —
   1) the main button: reads only the player's own progress (localStorage "signal-flow-best-<id>", written by the game) to say "start" or "continue". Nothing is sent.
      Phase 1–2 level ids are p1-l1…p1-l12 / p2-l1…p2-l14; Phase 3–4 levels come from the server, so the hub only knows Phase 1–2.
   2) the Leader Board: asks the Edge Function "game-scores" (action "board", public: no token, no member data is sent). Rows hold only nickname + numbers. Written with textContent.
      If the function does not answer, the "coming soon" card stays and nothing else on the page changes. */
(function () {
  var go = document.getElementById('gh-go'), sub = document.getElementById('gh-sub');
  if (go && sub) {
    var PH = [[1, 12], [2, 14]], done = {}, any = false;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('signal-flow-best-') === 0) { done[k.slice(17)] = 1; any = true; }
      }
    } catch (e) { any = false; }
    if (any) {
      var passed = 0, total = 0, next = null;
      PH.forEach(function (p) {
        for (var n = 1; n <= p[1]; n++) {
          total++;
          if (done['p' + p[0] + '-l' + n]) passed++;
          else if (!next) next = [p[0], n];
        }
      });
      go.textContent = 'เล่นต่อ';
      if (next) {
        go.href = '/game/signal-flow/' + (next[0] === 1 ? '?level=' + next[1] : '?phase=' + next[0] + '&level=' + next[1]);
        sub.textContent = 'ต่อที่ Phase ' + next[0] + ' ด่าน ' + next[1] + ' · ผ่านแล้ว ' + passed + ' / ' + total + ' ด่านใน Phase 1–2 (อ่านจากเครื่องนี้)';
      } else {
        go.href = '/game/signal-flow/?phase=3';
        sub.textContent = 'ผ่าน Phase 1–2 ครบแล้ว · ต่อที่ Phase 3 (สมาชิก)';
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
