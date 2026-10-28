/* /game/ — only reads the player's own progress (localStorage "signal-flow-best-<id>" written by the game) to label the main button.
   Nothing is sent anywhere. Phase 1–2 level ids are p1-l1…p1-l12 / p2-l1…p2-l14; Phase 3–4 levels come from the server, so the hub only knows Phase 1–2. */
(function () {
  var go = document.getElementById('gh-go'), sub = document.getElementById('gh-sub');
  if (!go || !sub) return;
  var PH = [[1, 12], [2, 14]], done = {}, any = false;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('signal-flow-best-') === 0) { done[k.slice(17)] = 1; any = true; }
    }
  } catch (e) { return; }
  if (!any) { sub.textContent = ''; return; }
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
})();
