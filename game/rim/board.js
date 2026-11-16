/* RIM: Leader Board ในเกม (เจ้าของขอ 14 พ.ย. "แสดงผลแบบเดียวกับบนเว็บแค่สวยกว่า")
   ข้อมูลรูปเดียวกับ Edge Function rim-scores (Developer/rim-leaderboard · ยังไม่ deploy):
     board { players, rows: [{ rank, nickname, song, level 1–4, diff, miss, score }] } · เรียงมาแล้วจาก server
     chart { songs, rows: [{ pos, title, diff, rank, plays, top: { nickname, level, miss, score } | null }] }   (084: ไม่มี bpm · ข้อมูลตัวอย่างยังมี)
   ฉบับเว็บ (build-web.py ใส่ window.RIM_WEB = { fn, key, account, login }): อ่านกระดานจริงจาก rim-scores + ส่งคะแนนหลังเล่นเต็มเพลง
   ไม่มี RIM_WEB (เปิดในเครื่อง) = "ข้อมูลตัวอย่าง" (ชื่อ/เพลงแต่งขึ้น) พร้อมป้ายบอกบนจอ · rim-scores ล้ม/ยังไม่ deploy = เกมเล่นได้ปกติ แค่กระดานโหลดไม่ได้ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.RimBoard = factory(root);
})(typeof self !== 'undefined' ? self : this, function (root) {
  var RANKS = ['S', 'A', 'B', 'C', 'D'];
  var LEVEL = { 1: 'ง่าย', 2: 'ปกติ', 3: 'ยาก', 4: 'ยากสุด' };
  var WEB = (root && root.RIM_WEB) || null;
  var SAMPLE = !WEB;   // ป้าย "ข้อมูลตัวอย่าง" เฉพาะเปิดในเครื่อง

  // ── เรียก rim-scores · ล้ม/หมดเวลา = { s: 0 } (ไม่โยน error ใส่หน้าเกม) ──
  function call(body, token) {
    var h = { 'Content-Type': 'application/json', apikey: WEB.key };
    if (token) h.Authorization = 'Bearer ' + token;
    var c = typeof AbortController === 'function' ? new AbortController() : null, t = setTimeout(function () { if (c) c.abort(); }, 15000);
    return fetch(WEB.fn, { method: 'POST', headers: h, body: JSON.stringify(body), signal: c ? c.signal : undefined })
      .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }, function () { return { s: r.status, j: null }; }); })
      .then(function (x) { clearTimeout(t); return x; }, function () { clearTimeout(t); return { s: 0, j: null }; });
  }
  function load(action, rank) {
    if (!WEB) return Promise.resolve(action === 'board' ? sampleBoard(rank) : sampleChart());
    return call(action === 'board' ? { action: 'board', rank: rank } : { action: 'chart' }).then(function (x) {
      if (x.s === 200 && x.j && x.j.ok === true && Array.isArray(x.j.rows)) return x.j;
      throw new Error('board');
    });
  }

  // ── session (แบบเดียวกับ Signal Flow): สมาชิก (djl-member-session ของ /member/) ก่อน → บัญชีเว็บ (djl-account-session ของ /account/) → ไม่มี
  //   อ่านอย่างเดียว ไม่ต่ออายุเอง · เหลือ ≤ 60 วินาที = หมดอายุ → token null แต่ kind บอกว่าต้องไปต่อที่หน้าไหน
  function pickSession(mem, acc, now) {
    var has = function (s) { return !!(s && typeof s.access_token === 'string' && s.access_token); };
    var live = function (s) { return has(s) && !(s.expires_at && s.expires_at - now <= 60); };
    if (live(mem)) return { kind: 'member', token: mem.access_token };
    if (live(acc)) return { kind: 'account', token: acc.access_token };
    return { kind: has(mem) ? 'member' : has(acc) ? 'account' : null, token: null };
  }
  function session() {
    var rd = function (k) { try { return JSON.parse(root.localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
    return pickSession(rd('djl-member-session'), rd('djl-account-session'), Date.now() / 1000);
  }
  // ผลส่งคะแนน (HTTP status + JSON) → stored | nickname | not_user | login | fail
  function submitResult(status, j) {
    var code = j && j.error && j.error.code;
    if (status === 200 && j && j.stored === true) return 'stored';
    if (status === 200 && j && j.reason === 'no_nickname') return 'nickname';
    if ((status === 200 && j && j.reason === 'not_user') || (status === 403 && code === 'not_user')) return 'not_user';
    if (status === 401) return 'login';
    return 'fail';
  }
  // ชื่อไฟล์เพลง → ชื่อที่ส่งขึ้นเซิร์ฟเวอร์ (ลดข้อมูลที่ออกจากเครื่อง · เซิร์ฟเวอร์ rim_title_clean ยังเป็นผู้ตัดสิน + กรองคำ)
  //   ขั้นตอน/ลำดับเดียวกับ rim_title_clean: ตัดนามสกุลไฟล์เสียง · อักขระควบคุม → ช่องว่าง · เลข ≥ 9 หลัก (คั่นได้ทีละ 1 ตัว - . ช่องว่าง) → ช่องว่าง
  //   · ยุบช่องว่าง · ยาวไม่เกิน 80 ตัว · ไม่เหลือตัวอักษร/ตัวเลข = 'เพลงไม่ระบุชื่อ' (board.test.mjs เทียบกับ SQL จริงบน PGlite)
  function cleanTitle(name) {
    var v = String(name || '').replace(/\.(mp3|wav|wave|flac|m4a|aac|ogg|oga|opus|aif|aiff|wma|webm|mp4)$/i, '');
    v = v.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\+?[0-9]([ .-]?[0-9]){8,}/g, ' ');
    v = Array.from(v.replace(/\s+/g, ' ').trim()).slice(0, 80).join('').trim();
    return /[A-Za-z0-9ก-๙]/.test(v) ? v : 'เพลงไม่ระบุชื่อ';
  }
  // ส่งผลรอบเต็มเพลง → Promise<{ code, kind, j }> · ไม่ล็อกอิน/หมดอายุ = ไม่เรียกอะไร · ถาม me ก่อน: ไม่มีชื่อเล่น = ไม่ส่งผลเล่นออกไป
  function submit(payload) {
    var S = session();
    if (!WEB || !S.token) return Promise.resolve({ code: S.kind ? 'login' : 'guest', kind: S.kind });
    return call({ action: 'me' }, S.token).then(function (m) {
      if (m.s !== 200 || !m.j || m.j.ok !== true) return { code: m.s === 401 ? 'login' : 'fail', kind: S.kind };
      if (!m.j.nickname) return { code: 'nickname', kind: S.kind };
      return call(Object.assign({ action: 'submit' }, payload, { title: cleanTitle(payload.title) }), S.token).then(function (x) { return { code: submitResult(x.s, x.j), kind: S.kind, j: x.j }; });
    });
  }

  // ── ข้อมูลตัวอย่าง (สุ่มแบบตายตัว เปิดกี่ครั้งก็เหมือนเดิม) · ชื่อเล่น/เพลงแต่งขึ้นทั้งหมด ──
  var NICKS = ['ScratchCat', 'Mixmaster_T', 'บีทเดือด', 'DJ Pakbung', 'CrossfaderKid', 'หมุนไม่หยุด', 'Babyscratch', 'NightOwl99', 'ตัวตึงสยาม', 'Flare_Fox',
    'TurntableTom', 'น้องจานดำ', 'Chirp_King', 'Lido Boy', 'CutCreator', 'บอสเฟดเดอร์', 'Orbit_Mia', 'GrooveMonk', 'ตาต้า', 'Transformer_J'];
  var SONGS = ['Breakbeat Study No.3', 'Midnight Cutz', 'Siam Square Funk', 'Boom Bap Morning', 'Vinyl Rain', 'Concrete Jungle Loop', 'Dusty Fingers',
    'Rooftop Session', 'Neon Tuk-Tuk', 'Low End Theory Club', 'Saturday Crates', 'Golden Era Drill', 'Back Alley Groove', 'Crossfade Love', 'Soul Sample 72',
    'Chop & Flip', 'Basement Beats', 'Sukhumvit Swing', 'Head Nod Anthem', 'Last Train Home'];
  var RANGE = { S: [5.6, 6.6], A: [5.15, 5.59], B: [4.65, 5.14], C: [3.5, 4.64], D: [2.4, 3.49] };
  function rng(seed) { return function () { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }
  function songsOf(rank) {   // 4 เพลงต่อ rank · ค่าความยากในช่วงของ rank นั้น
    var r = rng(7 + RANKS.indexOf(rank) * 101), lo = RANGE[rank][0], hi = RANGE[rank][1];
    return [0, 1, 2, 3].map(function (i) {
      return { title: SONGS[(RANKS.indexOf(rank) * 4 + i) % SONGS.length], diff: Math.round((lo + (hi - lo) * r()) * 100) / 100, bpm: Math.round((84 + r() * 16) * 10) / 10 };
    });
  }
  function sampleBoard(rank) {
    var r = rng(31 + RANKS.indexOf(rank) * 17), songs = songsOf(rank), n = 14 - RANKS.indexOf(rank) * 2;
    var rows = NICKS.slice(0, n).map(function (nick) {
      var s = songs[Math.floor(r() * songs.length)], level = 1 + Math.floor(Math.pow(r(), 0.6) * 4), miss = Math.floor(Math.pow(r(), 2) * 40);
      return { nickname: nick, song: s.title, level: level, diff: s.diff, miss: miss, score: Math.round((60000 + level * 45000 + s.diff * 9000 - miss * 1500 + r() * 30000) / 10) * 10 };
    });
    rows.sort(function (a, b) { return b.level - a.level || b.diff - a.diff || a.miss - b.miss || b.score - a.score; });   // ลำดับที่เจ้าของยืนยัน (แบบ 078)
    rows.forEach(function (x, i) { x.rank = i + 1; });
    return { players: rows.length, rows: rows };
  }
  function sampleChart() {
    var r = rng(99), rows = [];
    RANKS.forEach(function (k) {
      songsOf(k).forEach(function (s) {
        var b = sampleBoard(k).rows.filter(function (x) { return x.song === s.title; })[0];
        rows.push({ title: s.title, bpm: s.bpm, diff: s.diff, rank: k, plays: 3 + Math.floor(r() * 80), top: b ? { nickname: b.nickname, level: b.level, miss: b.miss, score: b.score } : null });
      });
    });
    rows.sort(function (a, b) { return b.diff - a.diff || b.plays - a.plays; });
    rows.forEach(function (x, i) { x.pos = i + 1; });
    return { songs: rows.length, rows: rows };
  }

  // ── วาดลงใน <dialog> ──
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return n.toLocaleString('en-US'); }

  function podium(rows) {   // 3 อันดับแรก วางแบบแท่นรางวัล 2 · 1 · 3
    return '<ol class="bPodium">' + [rows[1], rows[0], rows[2]].map(function (x) {
      if (!x) return '<li class="bPod empty"></li>';
      return '<li class="bPod p' + x.rank + '"><span class="bMedal">' + x.rank + '</span><b class="bNick">' + esc(x.nickname) + '</b>' +
        '<span class="bScore">' + num(x.score) + '</span><span class="bMeta">' + LEVEL[x.level] + ' · MISS ' + x.miss + '</span>' +
        '<span class="bSong">' + esc(x.song) + ' · ' + x.diff.toFixed(2) + '</span></li>';
    }).join('') + '</ol>';
  }
  function boardRows(rows) {
    return '<ol class="bList" start="4">' + rows.map(function (x) {
      return '<li class="bRow"><span class="bPos">' + x.rank + '</span><span class="bWho"><b>' + esc(x.nickname) + '</b><small>' + esc(x.song) + ' · ' + x.diff.toFixed(2) + '</small></span>' +
        '<span class="bLv lv' + x.level + '">' + LEVEL[x.level] + '</span><span class="bMiss">MISS <b>' + x.miss + '</b></span><span class="bScore">' + num(x.score) + '</span></li>';
    }).join('') + '</ol>';
  }
  function chartRows(rows) {
    return '<ol class="bList chart">' + rows.map(function (x) {
      var top = x.top ? esc(x.top.nickname) + ' · ' + LEVEL[x.top.level] + ' · MISS ' + x.top.miss : 'ยังไม่มีคนขึ้นกระดาน';
      return '<li class="bRow' + (x.pos <= 3 ? ' hi' : '') + '"><span class="bPos">' + x.pos + '</span><span class="bWho"><b>' + esc(x.title) + '</b><small>' + (x.bpm ? x.bpm + ' BPM · ' : '') + 'เล่น ' + x.plays + ' ครั้ง</small></span>' +
        '<span class="bRank r' + x.rank + '">' + x.rank + '</span><span class="bDiff">' + x.diff.toFixed(2) + '</span><span class="bTop"><small>อันดับ 1 ของเพลง</small>' + top + '</span></li>';
    }).join('') + '</ol>';
  }

  // box = <dialog> ว่าง · look = แบบภาพที่ผู้เล่นเลือก (สีกระดานตาม) · tab = 'S'…'D' หรือ 'chart'
  function show(box, look, tab) {
    box.dataset.look = look || 'neon';
    box.innerHTML =
      '<div class="bHead"><div><h2 id="boardTitle">LEADER BOARD</h2><p>RIM · Rhythm Is Mine</p></div><button type="button" class="bClose" aria-label="ปิด">✕</button></div>' +
      '<div class="bTabs">' + RANKS.map(function (k) { return '<button type="button" class="bTab r' + k + '" data-tab="' + k + '">' + k + '</button>'; }).join('') +
      '<button type="button" class="bTab wide" data-tab="chart">MUSIC RANK CHART</button></div>' +
      (SAMPLE ? '<p class="bSample">ข้อมูลตัวอย่าง · ชื่อและเพลงแต่งขึ้น ยังไม่ใช่อันดับจริง</p>' : '') +
      '<p class="bSub" aria-live="polite"></p><div class="bBody"></div>' +
      '<p class="bFoot">ทุกคนดูอันดับได้ · เฉพาะสมาชิกที่เข้าร่วมกระดานเท่านั้นที่มีชื่อขึ้น ตั้งชื่อเล่นที่หน้าสมาชิก (บัญชีเว็บตั้งที่หน้าบัญชี /account/) · กระดานนี้เพื่อความสนุก</p>';
    box.querySelector('.bClose').onclick = function () { box.close(); };
    Array.prototype.forEach.call(box.querySelectorAll('.bTab'), function (b) { b.onclick = function () { pick(box, b.dataset.tab); }; });
    pick(box, tab || 'S');
    if (!box.open) box.showModal();
  }
  function pick(box, tab) {
    Array.prototype.forEach.call(box.querySelectorAll('.bTab'), function (b) { b.setAttribute('aria-pressed', b.dataset.tab === tab); });
    var sub = box.querySelector('.bSub'), body = box.querySelector('.bBody');
    load(tab === 'chart' ? 'chart' : 'board', tab).then(function (d) {
      if (tab === 'chart') {
        sub.textContent = 'เพลงทั้งหมด ' + d.songs + ' เพลง · เรียงตามค่าความยาก (ใช้ตัดสินเพลง rank เดียวกัน)';
        body.innerHTML = d.rows.length ? chartRows(d.rows) : '<p class="bEmpty">ยังไม่มีเพลงในตาราง</p>';
      } else {
        sub.textContent = 'Board ' + tab + ' · ' + d.players + ' คน · เรียงตาม ระดับที่เลือก → ความยากเพลง → MISS น้อย → คะแนน';
        body.innerHTML = d.rows.length ? podium(d.rows) + boardRows(d.rows.slice(3)) : '<p class="bEmpty">ยังไม่มีใครขึ้นกระดาน</p>';
      }
      body.scrollTop = 0;
    }, function () { sub.textContent = 'โหลดอันดับไม่ได้ ลองใหม่อีกครั้ง'; body.innerHTML = ''; });
  }

  return { show: show, RANKS: RANKS, sampleBoard: sampleBoard, sampleChart: sampleChart, web: WEB, submit: submit, pickSession: pickSession, submitResult: submitResult, cleanTitle: cleanTitle };
});
