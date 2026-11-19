/* Rim: ภาพในเกม (Art) — เจ้าของเลือก 14 พ.ย.: ค่าเริ่มต้น Neon Drive · เปลี่ยนเป็น Blackout Studio / Laser Club / DJ LAB SIAM (19 พ.ย.) ได้ (ต้นแบบ art/concepts.html)
   วาดอย่างเดียว ไม่ตัดสินอะไร: อ่านสถานะจาก rules (run) ทุกเฟรม แล้วสร้างคำเด้ง / FX จากสิ่งที่เปลี่ยนไปจากเฟรมก่อน
   รูปทรง: ขอบบนแผ่นเสียง 84° = เส้นรับโน้ต · เส้นแบ่งเลนเริ่มบนโค้งแล้ววิ่งไปจุดลับตา (เลนรับกับโค้งของตัวรับ) · โน้ตเล็กเมื่ออยู่ไกล (perspective)
   HUD ไม่มีกรอบ: คะแนน · ความแม่น · คอมโบ · ตัวคูณ · ความคืบหน้า · ตัวบอกเฟดเดอร์ · ปุ่ม dry/wet (โผล่เฉพาะในโซน FX) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RimLook = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var RED = '#BD2026', HOT = '#ff2b3c', LANES = 4, HALF = 42 * Math.PI / 180, PERS = 0.6;   // PERS = ความลึก: เดิม 2.4 โน้ตอยู่ครึ่งล่างของจอแค่ 23% ของเวลา (ไหลช้าบน แล้วพุ่งลง) · 1.2 = 31% · 0.6 = 38%
  var WORD = { perfect: 'PERFECT', great: 'GREAT', ok: 'GOOD', miss: 'MISS' };
  var NAMES = { neon: 'Neon Drive', studio: 'Blackout Studio', laser: 'Laser Club', djlab: 'DJ LAB SIAM' };

  function laneAt(p, t) {   // ท่อลาก: เลน (ทศนิยม) ที่เวลา t บนเส้นตรงระหว่างจุดกลับทิศ
    for (var i = 1; i < p.length; i++) if (t < p[i][0]) { var a = p[i - 1], c = p[i]; return a[1] + (c[1] - a[1]) * Math.max(0, (t - a[0]) / (c[0] - a[0])); }
    return p[p.length - 1][1];
  }

  function create(cv) {
    var g = cv.getContext('2d'), vin = document.createElement('canvas'), reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 0, H = 0, DPR = 1, L = {}, safeTop = 60, st = null, S = {};
    var t = 0, clock = 0, lead = 1.6, sway = 0, beat0 = 0, blen = 0.5;
    var theta = 0, dpos = null, lastClock = null, shown = {}, pops = [], parts = [], flashes = [], rings = [], bump = 0, comboBump = 0, score = 0, lastCombo = 0, lastGhosts = 0, zoneSeen = {};

    // ── รูปทรง ──
    function resize(top) {
      DPR = Math.min(2, window.devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; safeTop = top;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); g.setTransform(DPR, 0, 0, DPR, 0, 0);
      var portrait = H > W * 1.05, bw = portrait ? W * 1.02 : Math.min(W * 0.8, H * 0.8);   // จอนอน: เดิม H × 1.55 แผ่นกว้างจนโค้งกินจอล่าง 1/3 เลนสั้น (เจ้าของ 14 พ.ย. ขอยาวขึ้น 2 รอบ)
      var R = bw / 2 / Math.sin(HALF), endY = H - (portrait ? Math.max(60, H * 0.08) : Math.max(26, H * 0.03)), vy = portrait ? -H * 0.32 : -H * 0.42;
      L = { R: R, cx: W / 2, cy: endY + R * Math.cos(HALF), vx: W / 2, vy: vy, uTop: endY / (endY - vy) * 1.03, pad: Math.max(16, W * 0.025) };
      paintVinyl();
    }
    function ang(b) { return -Math.PI / 2 - HALF + (b + 0.5) * (2 * HALF / LANES); }
    function uOf(z) { return L.uTop * z * (1 + PERS) / (1 + PERS * z); }   // z 0 = เส้นรับ · 1 = ไกลสุด (ขอบบนจอ)
    function pt(b, z) { var a = ang(b), x = L.cx + L.R * Math.cos(a), y = L.cy + L.R * Math.sin(a), u = uOf(z); return [x + (L.vx + sway - x) * u, y + (L.vy - y) * u]; }
    function zOf(time) { return (time - t) / lead; }
    function poly(ps) { g.beginPath(); g.moveTo(ps[0][0], ps[0][1]); for (var i = 1; i < ps.length; i++) g.lineTo(ps[i][0], ps[i][1]); }
    function across(z, b0, b1, n) { var out = []; for (var i = 0; i <= n; i++) out.push(pt(b0 + (b1 - b0) * i / n, z)); return out; }
    function beat() { return (((t - beat0) / blen) % 1 + 1) % 1; }
    function rim(b) { var a = ang(b); return [L.cx + L.R * Math.cos(a), L.cy + L.R * Math.sin(a)]; }

    // ── 3 แบบภาพ · สีแดง DJ LAB SIAM = ตัวรับตอนเปิดเฟดเดอร์ / FX ตอนโดน / คอมโบ / แผ่นเสียง ──
    S.neon = {
      font: function (s) { return 'italic 700 ' + s + 'px "Chakra Petch", sans-serif'; }, num: function (s) { return 'italic 700 ' + s + 'px "Chakra Petch", sans-serif'; },
      ink: '#ffffff', sub: '#c9f6ff', disc: '#0c0b12', groove: 'rgba(170,140,255,',
      bg: function () {
        var gr = g.createLinearGradient(0, 0, W * 0.3, H); gr.addColorStop(0, '#1a0838'); gr.addColorStop(0.45, '#5b1690'); gr.addColorStop(1, '#c42c86');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'lighter'; g.lineWidth = 2;
        for (var i = 0; i < 26; i++) {   // เส้นความเร็ว
          var k = (i * 0.37 + clock * (reduce ? 0.05 : 0.35) * (0.6 + (i % 5) * 0.2)) % 1, y = k * H * 1.3 - H * 0.15, x = (i * 173) % W, len = 60 + (i % 4) * 50;
          g.strokeStyle = 'rgba(255,190,255,' + (0.08 + (i % 3) * 0.05) + ')'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - len * 2.4, y + len * 0.5); g.stroke();
        }
        g.globalCompositeOperation = 'source-over';
      },
      lane: function (i) { return i % 2 ? '#20222f' : '#191b27'; }, rail: '#63e6ff', grid: 'rgba(120,230,255,.18)', glowRail: true,
      note: function () { return '#ffffff'; }, noteEdge: '#63e6ff', hold: 'rgba(99,230,255,.55)', zig: '#63e6ff',
      judge: { PERFECT: ['#ffffff', '#ff3da6'], GREAT: ['#63e6ff', '#2b2bb8'], GOOD: ['#c9f6ff', '#2b2bb8'], MISS: ['#8d8799', '#2a2533'], dim: ['#8d8799', null] },
    };
    S.studio = {
      font: function (s) { return '800 ' + s + 'px Unbounded, sans-serif'; }, num: function (s) { return '600 ' + s + 'px Unbounded, sans-serif'; },
      ink: '#f2f2f2', sub: '#8c8c8c', disc: '#060606', groove: 'rgba(255,255,255,', still: true,
      bg: function () {
        g.fillStyle = '#050505'; g.fillRect(0, 0, W, H);
        var sw = (clock * 0.12) % 1, gr = g.createLinearGradient(W * (sw * 2 - 0.6), 0, W * (sw * 2 - 0.2), H);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,.035)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;   // พื้นตารางกว้างกว่าถนน ให้รู้สึกมีพื้นที่ 3 มิติ
        for (var b = -6.5; b <= 9.5; b += 1) { poly([pt(b, -0.1), pt(b, 1)]); g.stroke(); }
      },
      lane: function (i) { return i % 2 ? '#111111' : '#0c0c0c'; }, rail: '#3a3a3a', grid: 'rgba(255,255,255,.07)',
      note: function () { return '#f4f4f4'; }, noteEdge: null, hold: 'rgba(255,255,255,.22)', zig: '#ffffff',
      judge: { PERFECT: ['#ffffff', null], GREAT: ['#bdbdbd', null], GOOD: ['#9a9a9a', null], MISS: ['#5a5a5a', null], dim: ['#5a5a5a', null] },
    };
    S.laser = {
      font: function (s) { return '700 ' + s + 'px "Chakra Petch", sans-serif'; }, num: function (s) { return '700 ' + s + 'px "Chakra Petch", sans-serif'; },
      ink: '#ffffff', sub: '#ffd36b', disc: '#08090f', groove: 'rgba(150,170,255,',
      bg: function () {
        var o = pt(1.5, 1), gr = g.createRadialGradient(o[0], H * 0.15, 10, o[0], H * 0.3, Math.max(W, H));
        gr.addColorStop(0, '#1d1530'); gr.addColorStop(0.5, '#0a0b16'); gr.addColorStop(1, '#030308'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'lighter';
        var fl = Math.pow(1 - beat(), 3);
        for (var i = 0; i < 9; i++) {   // เลเซอร์กวาดจากปลายถนน สว่างตามบีต
          var a = Math.PI / 2 + Math.sin(clock * (reduce ? 0.15 : 0.7) + i * 0.8) * 0.9 + (i - 4) * 0.16, len = Math.max(W, H) * 1.4;
          var lg = g.createLinearGradient(o[0], o[1], o[0] + Math.cos(a) * len, o[1] + Math.sin(a) * len), c = i % 3 ? '255,40,60' : '255,255,255';
          lg.addColorStop(0, 'rgba(' + c + ',' + (0.5 + fl * 0.3) + ')'); lg.addColorStop(1, 'rgba(' + c + ',0)');
          g.strokeStyle = lg; g.lineWidth = i % 3 ? 2 : 1.2; g.beginPath(); g.moveTo(o[0], o[1]); g.lineTo(o[0] + Math.cos(a) * len, o[1] + Math.sin(a) * len); g.stroke();
        }
        for (var k = 0; k < 3; k++) {   // ควันเป็นชั้น
          var fy = H * (0.35 + k * 0.2) + Math.sin(clock * 0.3 + k) * 20, fg = g.createLinearGradient(0, fy - 80, 0, fy + 80);
          fg.addColorStop(0, 'rgba(120,90,200,0)'); fg.addColorStop(0.5, 'rgba(120,90,200,.06)'); fg.addColorStop(1, 'rgba(120,90,200,0)'); g.fillStyle = fg; g.fillRect(0, fy - 80, W, 160);
        }
        g.globalCompositeOperation = 'source-over';
      },
      lane: function () { return 'rgba(14,16,30,.86)'; }, rail: '#ff2b3c', grid: 'rgba(255,211,107,.16)', tiles: true, glowRail: true,
      note: function (l) { return l === 1 || l === 2 ? '#ffd36b' : '#ffffff'; }, noteEdge: null, hold: 'rgba(255,211,107,.45)', zig: '#ffd36b',
      judge: { PERFECT: ['#ffffff', '#ff2b3c'], GREAT: ['#ffd36b', '#7a4a00'], GOOD: ['#ffe9b0', '#7a4a00'], MISS: ['#76768a', null], dim: ['#76768a', null] },
    };
    // DJ LAB SIAM (เจ้าของขอ 19 พ.ย.): สีแบรนด์ แดง #BD2026 / ดำ #010101 / ขาว #FFFFFF เท่านั้น · ฟอนต์ที่มากับหน้าอยู่แล้ว (ไม่โหลดของนอก)
    //   พื้นดำ · แสงแดงจากปลายถนนเต้นตามบีต · แถบเฉียงแดงเลื่อนช้าๆ (ลายเส้นความเร็วแบบโลโก้) · ขอบถนนแดง · โน้ตขาวขอบแดง
    S.djlab = {
      font: function (s) { return '800 ' + s + 'px Unbounded, sans-serif'; }, num: function (s) { return 'italic 700 ' + s + 'px "Chakra Petch", sans-serif'; },
      ink: '#FFFFFF', sub: 'rgba(255,255,255,.62)', disc: '#010101', groove: 'rgba(255,255,255,',
      bg: function () {
        g.fillStyle = '#010101'; g.fillRect(0, 0, W, H);
        var o = pt(1.5, 1), fl = Math.pow(1 - beat(), 3), gr = g.createRadialGradient(o[0], o[1], 0, o[0], o[1], Math.max(W, H) * 0.75);
        gr.addColorStop(0, 'rgba(189,32,38,' + (0.42 + 0.18 * fl) + ')'); gr.addColorStop(0.45, 'rgba(189,32,38,.08)'); gr.addColorStop(1, 'rgba(189,32,38,0)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.save(); g.transform(1, 0, -0.45, 1, 0, 0);   // แถบเฉียง
        for (var i = 0; i < 7; i++) {
          var x = ((i * 0.19 + clock * (reduce ? 0.01 : 0.05)) % 1) * (W + H) - H * 0.2, w = 10 + (i % 3) * 16;
          g.fillStyle = i % 3 ? 'rgba(189,32,38,.10)' : 'rgba(255,255,255,.035)'; g.fillRect(x, 0, w, H);
        }
        g.restore();
      },
      lane: function (i) { return i % 2 ? '#121212' : '#0a0a0a'; }, rail: '#BD2026', grid: 'rgba(255,255,255,.08)', glowRail: true,
      note: function () { return '#FFFFFF'; }, noteEdge: '#BD2026', hold: 'rgba(189,32,38,.6)', zig: '#FFFFFF',
      judge: { PERFECT: ['#FFFFFF', '#BD2026'], GREAT: ['#FFFFFF', '#010101'], GOOD: ['rgba(255,255,255,.75)', '#010101'], MISS: ['#6b6b6b', null], dim: ['#6b6b6b', null] },
    };
    function setStyle(name) { st = S[name] || S.neon; if (W) paintVinyl(); }
    setStyle('neon');

    // ── แผ่นเสียง: ร่องวาดครั้งเดียว · แสงสะท้อนอยู่กับที่ · จุด strobe + ตัวหนังสือ + สติกเกอร์ cue หมุนตามจาน = รู้สึกว่าหมุนจริง ──
    function paintVinyl() {
      vin.width = Math.round(W * DPR); vin.height = Math.round(H * DPR);
      var v = vin.getContext('2d'); v.setTransform(DPR, 0, 0, DPR, 0, 0);
      v.save(); v.beginPath(); v.arc(L.cx, L.cy, L.R, 0, 6.283); v.clip();
      v.fillStyle = st.disc; v.fillRect(0, 0, W, H);
      for (var r = L.R * 0.55, i = 0; r < L.R * 0.985; r += Math.max(1.6, L.R * 0.0045), i++) {
        v.strokeStyle = st.groove + (0.03 + ((i * 7) % 5) * 0.012) + ')'; v.lineWidth = 1; v.beginPath(); v.arc(L.cx, L.cy, r, Math.PI, 0); v.stroke();
      }
      [[-0.32, 0.16], [0.28, 0.1]].forEach(function (s) {
        var a = -Math.PI / 2 + s[0], x = L.cx + Math.cos(a) * L.R * 0.8, y = L.cy + Math.sin(a) * L.R * 0.8, gr = v.createRadialGradient(x, y, 0, x, y, L.R * 0.45);
        gr.addColorStop(0, 'rgba(255,255,255,' + s[1] + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); v.fillStyle = gr; v.fillRect(0, 0, W, H);
      });
      v.restore();
    }
    function seen(a) { return Math.abs(Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2))) < HALF * 1.35; }
    function drawVinyl() {
      g.drawImage(vin, 0, 0, W, H);
      for (var i = 0; i < 96; i++) {
        var a = theta + i * 6.283 / 96; if (!seen(a)) continue;
        g.fillStyle = i % 4 ? 'rgba(255,255,255,.28)' : RED; var rr = L.R * 0.958;
        g.beginPath(); g.arc(L.cx + Math.cos(a) * rr, L.cy + Math.sin(a) * rr, i % 4 ? 1.6 : 2.6, 0, 6.283); g.fill();
      }
      g.font = '700 ' + Math.max(10, Math.min(15, L.R * 0.02)) + 'px "Chakra Petch", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (var k = 0; k < 6; k++) {
        var b = theta + k * 6.283 / 6; if (!seen(b)) continue;
        var r3 = L.R * 0.9; g.save(); g.translate(L.cx + Math.cos(b) * r3, L.cy + Math.sin(b) * r3); g.rotate(b + Math.PI / 2);
        g.fillStyle = k % 2 ? 'rgba(255,255,255,.35)' : RED; g.fillText(k % 2 ? '33⅓ RPM' : 'DJ LAB SIAM', 0, 0); g.restore();
      }
      if (seen(theta)) { g.strokeStyle = '#fff'; g.lineWidth = 4; poly([[L.cx + Math.cos(theta) * L.R * 0.7, L.cy + Math.sin(theta) * L.R * 0.7], [L.cx + Math.cos(theta) * L.R * 0.86, L.cy + Math.sin(theta) * L.R * 0.86]]); g.stroke(); }
    }

    // ── ฉาก ──
    function drawHighway() {
      for (var i = 0; i < LANES; i++) { g.fillStyle = st.lane(i); poly([pt(i - 0.5, -0.06), pt(i - 0.5, 1), pt(i + 0.5, 1), pt(i + 0.5, -0.06)]); g.closePath(); g.fill(); }
      var first = Math.ceil((t - beat0) / blen) * blen + beat0;
      if (st.tiles) {   // กระเบื้องสว่างตามบีต
        g.globalCompositeOperation = 'lighter';
        for (var zt = first; zt < t + lead; zt += blen) {
          var z = zOf(zt), ln = ((Math.round((zt - beat0) / blen) * 7) % 4 + 4) % 4;
          g.fillStyle = 'rgba(255,211,107,' + (0.05 + 0.1 * Math.pow(1 - beat(), 2)) + ')'; poly(across(z, ln - 0.5, ln + 0.5, 4).concat(across(z + 0.06, ln + 0.5, ln - 0.5, 4))); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      }
      g.strokeStyle = st.grid; g.lineWidth = 1;   // เส้นจังหวะขวางถนน (โค้งตามแผ่น หดตามระยะ)
      for (var tt = first; tt < t + lead; tt += blen) { var zz = zOf(tt); g.globalAlpha = Math.max(0, Math.min(1, (1 - zz) * 2)); poly(across(zz, -0.5, 3.5, 16)); g.stroke(); }
      g.globalAlpha = 1;
      for (var e = 0; e <= LANES; e++) {
        var edge = e === 0 || e === LANES; g.strokeStyle = edge ? st.rail : st.grid; g.lineWidth = edge ? 3 : 1;
        poly([pt(e - 0.5, -0.06), pt(e - 0.5, 1)]); g.stroke();
        if (edge && st.glowRail) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; g.lineWidth = 10; g.stroke(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
      }
    }
    function drawZones(run, fxUp, spinAt) {
      run.zones.forEach(function (z) {
        var z0 = zOf(z.t), z1 = Math.min(1, zOf(z.t + z.len)); if (z1 < -0.1 || z0 > 1) return;
        var inside = t >= z.t && t < z.t + z.len, spin = performance.now() - spinAt < 300;
        g.fillStyle = inside && fxUp ? 'rgba(255,43,60,' + (spin ? 0.3 + 0.08 * Math.sin(clock * 20) : 0.18) + ')' : 'rgba(255,255,255,.06)';
        poly(across(Math.max(-0.06, z0), -0.5, 3.5, 16).concat(across(z1, 3.5, -0.5, 16))); g.fill();
        [[z0, z.on, 'FX ON'], [z1, z.off, 'FX OFF']].forEach(function (m) {
          if (m[0] < -0.06 || m[0] > 1 || m[1] !== null) return;   // ตัดสินแล้ว = เอาเส้นออก
          g.strokeStyle = HOT; g.lineWidth = 4 * (1 - uOf(m[0])) + 1; poly(across(m[0], -0.5, 3.5, 16)); g.stroke();
          var c = pt(1.5, m[0]); g.font = st.font(Math.max(10, 18 * (1 - uOf(m[0])))); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText(m[2], c[0], c[1] - 4);
        });
        // ในโซนมีโน้ตแล้ว (เจ้าของ 19 พ.ย.) → คำบอกเล็กลงและอยู่ปลายถนน ไม่ทับโน้ตที่กำลังมา
        if (inside) { var c = pt(1.5, Math.max(0.55, Math.min(z1, 1) - 0.1)); g.font = st.font(14); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fxUp ? 'ค้าง FX · หมุน DRY/WET' : 'เปิด FX!', c[0], c[1]); }
      });
    }
    function drawNotes(run) {
      for (var i = run.notes.length - 1; i >= 0; i--) {
        var n = run.notes[i], z0 = zOf(n.t), z1 = zOf(n.t + n.len);
        if (z0 > 1.02 || z1 < -0.08 || n.res === 'miss' || (n.state === 'done' && !n.len) || n.state === 'click') continue;
        var held = n.state === 'hold', gone = n.state === 'done';
        if (n.len) {   // ท่อ = ริบบิ้นตามเลน · ท่อลาก = เส้นซิกแซกบาง · ค้างอยู่ = แดง · ปล่อยก่อนจบ = ส่วนที่เหลือจาง
          var from = held || gone ? 0 : Math.max(-0.06, z0), to = Math.min(1, z1), hw = n.path ? 0.1 : 0.3, lp = [], rp = [];
          for (var z = from; z <= to + 1e-6; z += Math.max(0.006, (to - from) / 48)) {
            var b = n.path ? laneAt(n.path, t + z * lead) : n.lane; lp.push(pt(b - hw, z)); rp.unshift(pt(b + hw, z));
          }
          if (lp.length > 1) {
            g.fillStyle = gone ? 'rgba(255,255,255,.08)' : held ? 'rgba(255,43,60,.85)' : n.path ? st.zig : st.hold; poly(lp.concat(rp)); g.closePath(); g.fill();
            if (held) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
            else if (st.noteEdge && !gone) { g.strokeStyle = st.noteEdge; g.lineWidth = 1.5; g.stroke(); }
          }
          if (held || gone) continue;
        }
        var zz = Math.max(-0.06, z0), q = across(zz, n.lane - 0.42, n.lane + 0.42, 6).concat(across(zz + 0.026, n.lane + 0.42, n.lane - 0.42, 6));
        g.fillStyle = st.note(n.lane); poly(q); g.closePath(); g.fill();
        if (st.noteEdge) { g.strokeStyle = st.noteEdge; g.lineWidth = 2; g.stroke(); }
      }
    }
    function hitFX(lane, big) {
      var p = rim(lane), n = reduce ? 6 : big ? 26 : 16;
      for (var i = 0; i < n; i++) {
        var d = -Math.PI / 2 + (Math.random() - 0.5) * 1.9, v = 160 + Math.random() * (big ? 420 : 300);
        parts.push({ x: p[0], y: p[1], vx: Math.cos(d) * v, vy: Math.sin(d) * v, life: 0, max: 0.35 + Math.random() * 0.3, s: 2 + Math.random() * 3.5, c: Math.random() < 0.7 ? HOT : '#fff' });
      }
      flashes.push({ lane: lane, at: clock }); rings.push({ lane: lane, at: clock });
    }
    function drawFlashes() {
      g.globalCompositeOperation = 'lighter';
      flashes.forEach(function (f) {   // แสงแดงพุ่งขึ้นตามเลนตอนโดนโน้ต
        var k = (clock - f.at) / 0.3, top = pt(f.lane, 0.55), bot = pt(f.lane, 0), gr = g.createLinearGradient(bot[0], bot[1], top[0], top[1]);
        gr.addColorStop(0, 'rgba(255,43,60,' + 0.55 * (1 - k) + ')'); gr.addColorStop(1, 'rgba(255,43,60,0)');
        g.fillStyle = gr; poly(across(0, f.lane - 0.5, f.lane + 0.5, 4).concat(across(0.55, f.lane + 0.5, f.lane - 0.5, 4))); g.fill();
      });
      g.globalCompositeOperation = 'source-over';
    }
    // ตัวรับ = โค้งบนขอบแผ่นที่เลน (ยังไม่เลือกเลน = ไม่มี) · เปิดเฟดเดอร์ = เรืองแดง · ลูกศรขาวบนแผ่น = ทิศที่จานเล็ง (เริ่มตรงกลางเสมอ)
    // cw = ความหนาโค้ง (px · ค่าเริ่มต้น 9) · ca = ความทึบ 0–1 (ผู้เล่นปรับในตั้งค่า · เจ้าของขอ 14 พ.ย. เพราะมองยากตอนสลับเลนเร็ว)
    function drawCatcher(lane, aim, open, cw, ca) {
      var w = HALF * 2 / LANES * 0.46;
      if (lane !== null) {
        var a = ang(lane);
        g.globalAlpha = ca;
        if (open) {
          g.globalCompositeOperation = 'lighter';
          [[cw + 21, 0.12], [cw + 9, 0.25]].forEach(function (s) { g.strokeStyle = 'rgba(255,43,60,' + s[1] + ')'; g.lineWidth = s[0]; g.beginPath(); g.arc(L.cx, L.cy, L.R, a - w, a + w); g.stroke(); });
          g.globalCompositeOperation = 'source-over';
        }
        g.lineCap = 'round'; g.strokeStyle = open ? HOT : '#fff'; g.lineWidth = cw; g.beginPath(); g.arc(L.cx, L.cy, L.R, a - w, a + w); g.stroke(); g.lineCap = 'butt';
        g.globalAlpha = 1;
      }
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.beginPath(); g.arc(L.cx, L.cy, L.R, ang(-0.5), ang(3.5)); g.stroke();
      var pa = ang(aim), tip = [L.cx + Math.cos(pa) * (L.R - 14), L.cy + Math.sin(pa) * (L.R - 14)], base = [L.cx + Math.cos(pa) * (L.R - 32), L.cy + Math.sin(pa) * (L.R - 32)], wx = -Math.sin(pa) * 8, wy = Math.cos(pa) * 8;
      g.fillStyle = '#fff'; poly([tip, [base[0] + wx, base[1] + wy], [base[0] - wx, base[1] - wy]]); g.closePath(); g.fill();
      rings.forEach(function (r) {   // วงแดงขยายจากจุดรับ
        var k = (clock - r.at) / 0.35, p = rim(r.lane);
        g.strokeStyle = 'rgba(255,43,60,' + (1 - k) + ')'; g.lineWidth = 6 * (1 - k) + 1; g.beginPath(); g.ellipse(p[0], p[1], 18 + k * 70, 8 + k * 28, 0, 0, 6.283); g.stroke();
      });
      g.globalCompositeOperation = 'lighter';
      parts.forEach(function (p) { g.globalAlpha = 1 - p.life / p.max; g.fillStyle = p.c; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s * 2.2); });
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }

    // ── คำเด้ง: สร้างจากสิ่งที่เปลี่ยนใน run ──
    function bannerY() { return Math.max(safeTop + 150, H * 0.3); }   // แถบหนาขึ้น: เดิม +120 / 0.27 ทับแถวเกจ FEVER ของ HUD บนจอแคบ
    function pop(kind, text, lane, col) {
      pops.push({ kind: kind, text: text, lane: lane, at: clock, col: col });
      if (kind === 'big' && !reduce) for (var i = 0; i < 28; i++) {   // แถบประกาศ: ประกายแตกออกจากแถบ
        var side = i % 2 ? 1 : -1;
        parts.push({ x: W / 2 + side * Math.random() * W * 0.45, y: bannerY() + (Math.random() - 0.5) * 40, vx: side * (120 + Math.random() * 380), vy: -120 - Math.random() * 320, life: 0, max: 0.45 + Math.random() * 0.35, s: 2.5 + Math.random() * 2, c: i % 3 ? HOT : '#fff' });
      }
    }
    function popLife(q) { return q.kind === 'judge' || q.kind === 'hold' ? 0.55 : q.kind === 'big' ? 1.3 : 1.1; }
    function watch(run) {
      run.notes.forEach(function (n) {
        if (n.res && !shown[n.i]) {
          shown[n.i] = 1;
          if (n.res === 'miss') pop('judge', 'MISS', n.lane);
          else { pop('judge', WORD[n.res], n.lane); hitFX(n.lane, n.res === 'perfect'); }
        }
        if (n.len && n.state === 'done' && n.res !== 'miss' && !shown['e' + n.i]) {   // จบท่อ: บอกว่าค้างได้กี่ %
          shown['e' + n.i] = 1; var end = n.path ? laneAt(n.path, n.t + n.len * n.frac) : n.lane, ok = n.frac >= 0.9;
          pop('hold', 'HOLD ' + Math.round(n.frac * 100) + '%', end, ok ? null : 'dim'); if (ok) hitFX(end, false);
        }
      });
      run.zones.forEach(function (z, i) {
        if (!zoneSeen['in' + i] && t >= z.t - 0.05) { zoneSeen['in' + i] = 1; pop('big', 'FX ZONE'); bump = 1; }
        if (z.on !== null && !zoneSeen['on' + i]) { zoneSeen['on' + i] = 1; pop('judge', z.on === 'on' ? 'FX ON' : 'FX MISS', 1.5, z.on === 'on' ? null : 'dim'); }
        if (z.off !== null && !zoneSeen['off' + i]) { zoneSeen['off' + i] = 1; if (z.off === 'early') pop('judge', 'FX OFF', 1.5, 'dim'); pop('big', 'DRY/WET ' + Math.round(z.frac * 100) + '%'); }
      });
      // Fever: พร้อม (เกจเต็ม) → เริ่ม → คลิกโบนัสในท่อ → จบพร้อมแต้มรวม
      var fl = run.fevers.length, fc = 0, lane = run.lane === null ? 1.5 : run.lane;
      if (run.feverAt !== null && run.gauge >= 1 && !feverSeen['r' + fl]) {   // เกจเต็มจริง (Tutorial กำหนดเวลา Fever เองโดยไม่เติมเกจ = ไม่ขึ้น READY ตั้งแต่ต้น)
        feverSeen['r' + fl] = 1; pop('mult', 'FEVER READY');
      }
      run.fevers.forEach(function (f, i) {
        fc += f.clicks;
        if (!feverSeen['s' + i] && t >= f.t - 0.02) { feverSeen['s' + i] = 1; pop('big', 'FEVER!'); bump = 1; }
        if (!feverSeen['e' + i] && t >= f.t + f.len) { feverSeen['e' + i] = 1; pop('big', 'FEVER +' + f.score); }
      });
      if (fc > feverClicks) { hitFX(lane, true); pop('judge', 'BONUS', lane); }
      feverClicks = fc;
      if (run.ghosts > lastGhosts) { lastGhosts = run.ghosts; pop('judge', 'EMPTY', run.lane === null ? 1.5 : run.lane, 'dim'); }
      var c = run.combo;
      if (c > lastCombo) {
        comboBump = 1;
        if (c === 10 || c === 25 || c === 50 || (c >= 100 && c % 100 === 0)) { pop('big', c + ' COMBO'); bump = 1; }
        if (c % 10 === 0 && c <= 30) pop('mult', '×' + Math.min(4, 1 + Math.floor(c / 10)));
      } else if (c < lastCombo && lastCombo >= 10) pop('mult', 'COMBO BREAK', null, 'dim');
      lastCombo = c;
    }
    function text(s, x, y, font, fill, edge, align, base, lw) {
      g.font = font; g.textAlign = align || 'left'; g.textBaseline = base || 'alphabetic';
      if (edge) { g.lineJoin = 'round'; g.strokeStyle = edge; g.lineWidth = lw || 5; g.strokeText(s, x, y); }
      g.fillStyle = fill; g.fillText(s, x, y);
    }
    function drawPops() {
      pops = pops.filter(function (q) { return clock - q.at < popLife(q); });
      pops.forEach(function (q) {
        var age = clock - q.at, life = popLife(q), k = age / life, c1 = 1.70158, e = Math.min(1, age / 0.16);
        var sc = 1 + (c1 + 1) * Math.pow(e - 1, 3) + c1 * Math.pow(e - 1, 2);
        g.globalAlpha = Math.max(0, k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
        if (q.kind === 'judge' || q.kind === 'hold') {
          var at = pt(q.lane, 0.13 + age * 0.12), s = Math.max(15, Math.min(28, L.R * 0.05)) * sc * (q.kind === 'hold' || q.text.length > 8 ? 0.72 : 1);
          var col = q.col ? st.judge[q.col] : st.judge[q.text] || ['#fff', 'rgba(0,0,0,.4)'];
          text(q.text, at[0], at[1], st.font(s), col[0], col[1], 'center', 'middle', 4);
          if (st.still && q.text === 'PERFECT') { g.fillStyle = RED; g.fillRect(at[0] - s * 1.6, at[1] + s * 0.7, s * 3.2 * Math.min(1, age * 6), 2); }
        } else if (q.kind === 'big') {   // แถบประกาศ FX ZONE / COMBO / FEVER — เจ้าของ 18 พ.ย. ขอใหญ่ขึ้น + กระแทกกว่าเดิม: พุ่งเข้าจากซ้าย ค้าง แล้วพุ่งออกขวา
          var base = Math.min(W * 0.11, 92), bh = base * 1.05, din = reduce ? 1 : Math.min(1, age / 0.12), dout = reduce ? 0 : Math.max(0, (k - 0.78) / 0.22);
          var dx = -(1 - din) * (1 - din) * W * 1.2 + dout * dout * W * 1.2, sz = base * sc, a0;
          if (!reduce) g.globalAlpha = 1;   // ออกด้วยการพุ่ง ไม่จางหาย
          if (!reduce && age < 0.18) { g.fillStyle = 'rgba(255,255,255,' + 0.25 * (1 - age / 0.18) + ')'; g.fillRect(0, 0, W, H); }   // แฟลชตอนเข้า
          g.save(); g.translate(W / 2 + dx, bannerY()); g.rotate(-0.08); g.transform(1, 0, -0.25, 1, 0, 0);   // เฉียงแบบแถบความเร็ว
          // แดงโปร่ง (เจ้าของ 19 พ.ย.: แถบทึบบังโน้ตที่กำลังวิ่งเข้ามา) · ตอนกระแทกเข้มกว่าเล็กน้อย แล้วจางเหลือ .32 ให้เห็นโน้ตผ่านแถบ
          var ba = reduce ? 0.32 : 0.32 + 0.3 * Math.max(0, 1 - age / 0.3);
          g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-W * 0.75, -bh / 2 + 10, W * 1.5, bh);   // เงา
          g.fillStyle = 'rgba(255,43,60,' + ba + ')'; g.fillRect(-W * 0.75, -bh / 2, W * 1.5, bh);
          g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(-W * 0.75, -bh / 2 - 7, W * 1.5, 4); g.fillRect(-W * 0.75, bh / 2 + 3, W * 1.5, 4);   // ขอบขาวบน-ล่าง
          if (!reduce && age < 0.35) {   // เงาสีแยกตอนกระแทก
            var o = (1 - age / 0.35) * 9; a0 = g.globalAlpha; g.globalAlpha = a0 * 0.75;
            text(q.text, -o, 0, st.font(sz), '#63e6ff', null, 'center', 'middle'); text(q.text, o, 0, st.font(sz), '#ffd400', null, 'center', 'middle'); g.globalAlpha = a0;
          }
          text(q.text, 0, 0, st.font(sz), '#fff', 'rgba(0,0,0,.55)', 'center', 'middle', 8);
          g.restore();
        } else {
          var size = Math.min(W * 0.11, 92) * 0.5 * sc;
          text(q.text, W / 2, bannerY() + Math.min(W * 0.11, 92) * 0.55 + size, st.font(size), q.col ? st.judge.dim[0] : '#fff', 'rgba(0,0,0,.35)', 'center', 'middle', 5);
        }
      });
      g.globalAlpha = 1;
    }
    function drawHud(s, run) {
      var p = L.pad, big = Math.max(26, Math.min(46, W * 0.045)), y0 = safeTop, edge = 'rgba(0,0,0,.35)';
      if (run) {
        var pr = Math.max(0, Math.min(1, t / s.playLen));   // ความคืบหน้าเพลง
        g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(p, y0, W - 2 * p, 2); g.fillStyle = RED; g.fillRect(p, y0, (W - 2 * p) * pr, 2);
        g.beginPath(); g.arc(p + (W - 2 * p) * pr, y0 + 1, 4, 0, 6.283); g.fill();
        score += (run.score - score) * 0.2; if (Math.abs(run.score - score) < 1) score = run.score;
        var done = 0, good = 0; run.notes.forEach(function (n) { if (n.res) { done++; if (n.res !== 'miss') good++; } });
        text('SCORE', p, y0 + 24, st.font(12), st.sub);
        text(String(Math.round(score)).padStart(7, '0'), p, y0 + 24 + big, st.num(big), st.ink, edge, 'left', 'alphabetic', 4);
        text('ACC ' + (done ? (100 * good / done).toFixed(1) : '100.0') + '%', p, y0 + 46 + big, st.font(13), st.sub);
        if (run.feverOn) {   // เกจ Fever แบบช่องเฉียง (คู่กับเกจบนขอบถนน) · เต็ม/กำลัง Fever = ช่องสว่างวิ่ง
          var gy = y0 + 62 + big, segs = 12, gw = Math.min(200, W * 0.3), sw = gw / segs, lit = run.fever || run.feverAt !== null, gv = Math.max(0, Math.min(1, gShow));
          var tag = run.fever ? 'GO!' : run.feverAt !== null ? 'READY' : run.gauge > 0 || run.combo > (s.feverFrom || 10) ? Math.floor(run.gauge * 100) + '%' : 'COMBO ' + (s.feverFrom || 10) + '+';
          text('FEVER', p, gy, st.font(11), lit ? HOT : st.sub);
          text(tag, p + gw, gy, st.font(11), lit ? '#fff' : st.sub, null, 'right');
          for (var i = 0; i < segs; i++) {
            var sx = p + i * sw, part = Math.max(0, Math.min(1, gv * segs - i));
            g.fillStyle = 'rgba(255,255,255,.12)'; skew(sx, gy + 6, sw - 3, 9);
            if (!part) continue;
            g.globalAlpha = lit ? 0.8 + 0.2 * Math.pow(1 - beat(), 2) : 0.35 + 0.65 * part;
            g.fillStyle = lit && !reduce && (i + Math.floor(clock * 14)) % 4 === 0 ? '#fff' : HOT; skew(sx, gy + 6, sw - 3, 9); g.globalAlpha = 1;
          }
        }
        if (run.combo >= 2) {
          var cs = big * 1.5 * (1 + comboBump * 0.18), x = W - p, m = Math.min(4, 1 + Math.floor(run.combo / 10));
          text(String(run.combo), x, y0 + 14 + cs, st.num(cs), '#fff', 'rgba(0,0,0,.4)', 'right', 'alphabetic', 4);
          text('COMBO', x, y0 + 38 + cs, st.font(15), HOT, null, 'right');
          if (m > 1) { g.font = st.font(15); text('×' + m, x - g.measureText('COMBO').width - 12, y0 + 38 + cs, st.font(15), '#fff', null, 'right'); }
        }
      }
      // ตัวบอกเฟดเดอร์ (ซ้ายล่าง) · FX + ปุ่ม dry/wet (ขวาล่าง โผล่ตอน FX เปิด หรือหมุนอยู่)
      var fy = H - Math.max(26, H * 0.04), fw = Math.min(120, W * 0.22);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(p, fy, fw, 3);
      var kx = p + (s.open ? fw * 0.85 : fw * 0.08); g.fillStyle = s.open ? HOT : '#fff'; g.fillRect(kx - 6, fy - 9, 12, 21);
      text(s.open ? 'FADER OPEN' : 'FADER', p, fy - 14, st.font(11), s.open ? HOT : st.sub);
      var spin = performance.now() - s.spinAt < 300, want = s.fxUp || spin ? 1 : 0;
      knobVis += (want - knobVis) * 0.2;
      if (knobVis > 0.02) {
        var kr = 22, kxx = W - p - kr, kyy = fy - kr + 6; g.globalAlpha = knobVis; knobAng += spin ? 0.18 : 0;
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 3; g.beginPath(); g.arc(kxx, kyy, kr, 0, 6.283); g.stroke();
        g.strokeStyle = HOT; g.lineWidth = 4; g.beginPath(); g.arc(kxx, kyy, kr, -Math.PI / 2, -Math.PI / 2 + (0.5 + 0.45 * Math.sin(knobAng)) * 6.283); g.stroke();
        text(s.fxUp ? 'FX ON' : 'FX', kxx - kr - 10, kyy - 4, st.font(12), s.fxUp ? HOT : '#fff', null, 'right');
        text('DRY/WET', kxx - kr - 10, kyy + 12, st.font(11), st.sub, null, 'right'); g.globalAlpha = 1;
      }
    }
    var knobVis = 0, knobAng = 0;

    var feverSeen = {}, feverClicks = 0;
    function reset() { shown = {}; pops = []; parts = []; flashes = []; rings = []; zoneSeen = {}; score = 0; lastCombo = 0; lastGhosts = 0; bump = 0; feverSeen = {}; feverClicks = 0;
      gShow = 0; lastGauge = 0; lastFevers = 0; wasFever = false; shockAt = -9; endAt = -9; }
    function skew(x, y, w, h) { g.beginPath(); g.moveTo(x + 3, y); g.lineTo(x + w + 3, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.closePath(); g.fill(); }

    // ── เกจ Fever บนขอบถนนสองข้าง (เล่นเต็มเพลง · เจ้าของขอ 14 พ.ย. "หลอดเกจเท่ๆ FX มันส์ๆ") ──
    // สะสม = ขอบถนนเรืองแดงไล่จากจานไปปลายถนน + ประกายที่ปลายทุกครั้งที่เติม · เต็ม = กะพริบตามบีต
    // เริ่ม = คลื่นกระแทกจากแผ่นเสียง · ระหว่าง Fever = หดลงตามเวลาที่เหลือ (+ นับถอยหลัง 4 บีตสุดท้ายใน drawFever) · จบ = แตกเป็นประกาย
    var gShow = 0, lastGauge = 0, lastFevers = 0, wasFever = false, shockAt = -9, endAt = -9;
    function feverFx(run, dt) {
      if (!run.feverOn) return;
      var lv = run.fever ? Math.max(0, 1 - (t - run.fever.t) / run.fever.len) : run.feverAt !== null ? 1 : run.gauge;
      gShow = run.fever ? lv : gShow + (lv - gShow) * Math.min(1, dt * 10);
      if (!run.fever && run.gauge > lastGauge + 1e-9 && !reduce) [0, LANES].forEach(function (e) {
        var q = pt(e - 0.5, run.gauge);
        for (var i = 0; i < 10; i++) parts.push({ x: q[0], y: q[1], vx: (Math.random() - 0.5) * 220, vy: -60 - Math.random() * 180, life: 0, max: 0.35 + Math.random() * 0.25, s: 2.5, c: i % 2 ? '#fff' : HOT });
      });
      lastGauge = run.gauge;
      if (run.fevers.length > lastFevers) shockAt = clock;
      lastFevers = run.fevers.length;
      if (wasFever && !run.fever) {
        endAt = clock;
        if (!reduce) [0, LANES].forEach(function (e) {
          for (var z = 0; z <= 1; z += 0.04) {
            var q = pt(e - 0.5, z), k = 1 - uOf(z);
            for (var i = 0; i < 2; i++) parts.push({ x: q[0], y: q[1], vx: (e ? 1 : -1) * (40 + Math.random() * 220) * k, vy: -Math.random() * 220 * k, life: 0, max: 0.5 + Math.random() * 0.4, s: 1.5 + 3 * k, c: i ? '#fff' : HOT });
          }
        });
      }
      wasFever = !!run.fever;
    }
    function taper(a, b, wa, wb) {   // แถบเรียวตามระยะ (ขอบถนนเป็นเส้นตรงจากขอบแผ่นไปจุดลับตา)
      var dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      g.beginPath(); g.moveTo(a[0] + nx * wa, a[1] + ny * wa); g.lineTo(b[0] + nx * wb, b[1] + ny * wb);
      g.lineTo(b[0] - nx * wb, b[1] - ny * wb); g.lineTo(a[0] - nx * wa, a[1] - ny * wa); g.closePath(); g.fill();
    }
    function drawFeverRails(run) {
      if (!run.feverOn || gShow < 0.004) return;
      var fever = !!run.fever, hot = fever || run.feverAt !== null, k = Math.pow(1 - beat(), 2), z1 = Math.min(1, gShow), wf = 1 - uOf(z1);
      g.globalCompositeOperation = 'lighter';
      [0, LANES].forEach(function (e) {
        var a = pt(e - 0.5, 0), b = pt(e - 0.5, z1);
        // แรงขึ้นอีกนิด (เจ้าของ 18 พ.ย.): ฟุ้ง 14/22 → 18/30 · ชั้นกลาง 8 → 11 · แกน 3.5 → 5
        g.fillStyle = 'rgba(255,43,60,' + (hot ? 0.28 + 0.3 * k : 0.2) + ')'; taper(a, b, hot ? 30 : 18, (hot ? 30 : 18) * wf + 2);   // แสงฟุ้ง
        g.fillStyle = 'rgba(255,43,60,.65)'; taper(a, b, 11, 11 * wf + 1);
        g.fillStyle = hot && k > 0.55 ? '#ffffff' : HOT; taper(a, b, 5, 5 * wf + 1);   // แกน
        [0.25, 0.5, 0.75].forEach(function (m) {   // ขีดบอกระดับ
          if (m > z1 || fever) return;
          var q = pt(e - 0.5, m), w = 10 * (1 - uOf(m)) + 3; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(q[0] - w / 2, q[1] - 1, w, 2);
        });
        if (!reduce) for (var j = 0; j < 5; j++) {   // พลังงานไหลขึ้นตามเกจ (Fever = ไหลลงเร็ว)
          var ph = (clock * (fever ? 1.6 : hot ? 1.1 : 0.5) + j / 5) % 1, zz = (fever ? 1 - ph : ph) * z1, q2 = pt(e - 0.5, zz), w2 = 1 - uOf(zz);
          g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(q2[0], q2[1], 2.6 * w2 + 0.8, 0, 6.283); g.fill();
        }
        var r = ((hot ? 12 + 8 * k : 9) * wf + 4) * 2.4, gr = g.createRadialGradient(b[0], b[1], 0, b[0], b[1], r);   // ปลายเกจ = ดาวสว่าง
        gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.25, 'rgba(255,43,60,.75)'); gr.addColorStop(1, 'rgba(255,43,60,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(b[0], b[1], r, 0, 6.283); g.fill();
      });
      g.globalCompositeOperation = 'source-over';
    }
    function drawShock() {   // เริ่ม Fever: คลื่นแดงพุ่งจากแผ่นเสียงขึ้นถนน + แฟลชขาว · จบ: แฟลชแดงสั้น
      if (reduce) return;
      var k = (clock - shockAt) / 0.7, ke = (clock - endAt) / 0.35;
      g.globalCompositeOperation = 'lighter';
      if (k >= 0 && k < 1) {
        for (var i = 0; i < 3; i++) {
          var kk = k - i * 0.12; if (kk <= 0) continue;
          g.strokeStyle = 'rgba(255,' + (i ? 43 : 200) + ',' + (i ? 60 : 210) + ',' + 0.95 * (1 - kk) + ')'; g.lineWidth = 24 * (1 - kk) + 2;
          g.beginPath(); g.arc(L.cx, L.cy, L.R * (1 + kk * 1.05), Math.PI, 0); g.stroke();
        }
        g.fillStyle = 'rgba(255,255,255,' + 0.42 * Math.pow(1 - k, 3) + ')'; g.fillRect(0, 0, W, H);
      }
      if (ke >= 0 && ke < 1) { g.fillStyle = 'rgba(255,43,60,' + 0.22 * (1 - ke) + ')'; g.fillRect(0, 0, W, H); }
      g.globalCompositeOperation = 'source-over';
    }
    // Fever: ถนนเรืองแดงเต้นตามบีต + FEVER ×2 กับแต้มที่ได้ ตัวเล็กที่ปลายถนน (กติกาใหม่ 19 พ.ย.: ยังมีโน้ต ห้ามบังโน้ต)
    function drawFever(f) {
      var k = Math.pow(1 - beat(), 2), left = 1 - (t - f.t) / f.len;
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,43,60,' + (0.08 + 0.14 * k) * Math.min(1, left * 6) + ')';
      poly(across(-0.06, -0.5, 3.5, 16).concat(across(1, 3.5, -0.5, 16))); g.fill();
      g.globalCompositeOperation = 'source-over';
      var c = pt(1.5, 0.78), s = Math.min(W * 0.04, 28), beatsLeft = (f.t + f.len - t) / blen;
      text(beatsLeft <= 4 ? 'FEVER จบใน ' + Math.max(1, Math.ceil(beatsLeft - 1e-9)) : 'FEVER ×2', c[0], c[1], st.font(s * (1 + 0.06 * k)), '#fff', 'rgba(0,0,0,.4)', 'center', 'middle', 5);
      text('+' + f.score, c[0], c[1] + s * 1.05, st.num(s * 0.8), HOT, 'rgba(0,0,0,.4)', 'center', 'middle', 4);
    }

    // s = { t, run, lead, lane, pos, free, catchW, catchA, open, fxUp, spinAt, count, playLen, idle: [บรรทัด1, บรรทัด2] }
    function draw(s) {
      var nowSec = performance.now() / 1000, dt = lastClock === null ? 0 : Math.min(0.05, nowSec - lastClock); lastClock = nowSec; clock = nowSec;
      if (W < 50 || H < 50) return;
      var run = s.run;
      lead = s.lead; t = run ? s.t : clock;
      if (run && s.count) { beat0 = s.count.beat0; blen = s.count.len; } else { beat0 = 0; blen = 0.5; }
      var aimNow = Math.max(-0.4, Math.min(LANES - 0.6, s.pos)), prev = dpos === null ? aimNow : dpos;
      dpos = s.raw ? aimNow : prev + (aimNow - prev) * Math.min(1, dt * 30);   // raw = จาน Timecode (ข้อมูลละเอียดทุก ~3 ms ไม่ต้องหน่วงให้นุ่ม)
      theta += dt * (s.fxUp ? 1.2 : 3.49) + (dpos - prev) * 1.1;   // 33⅓ รอบ/นาที + สแครชตามจานจริง
      sway = reduce || st.still ? 0 : Math.sin(clock * 0.45) * W * 0.015 + (dpos - 1.5) * W * 0.006;
      if (run) { watch(run); feverFx(run, dt); }
      parts.forEach(function (p) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; });
      parts = parts.filter(function (p) { return p.life < p.max; });
      flashes = flashes.filter(function (f) { return clock - f.at < 0.3; }); rings = rings.filter(function (r) { return clock - r.at < 0.35; });
      if (run && run.active && run.active.state === 'hold' && !reduce && Math.random() < dt * 40) { var hp = rim(dpos); parts.push({ x: hp[0], y: hp[1], vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 160, life: 0, max: 0.4, s: 2, c: HOT }); }
      bump = Math.max(0, bump - dt * 3); comboBump = Math.max(0, comboBump - dt * 6);

      var shake = reduce ? 0 : bump * bump * 10;
      g.save(); if (shake) g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      st.bg(); drawHighway();
      if (run) { drawZones(run, s.fxUp, s.spinAt); drawFeverRails(run); drawNotes(run); if (run.fever) drawFever(run.fever); }
      drawFlashes(); drawVinyl();
      drawCatcher(s.lane === null ? null : s.free ? dpos : s.lane, dpos, s.open, s.catchW || 9, s.catchA === undefined ? 1 : s.catchA);
      if (run) drawShock();
      g.restore();
      if (!run && s.idle) {
        text(s.idle[0], W / 2, H * 0.42, st.font(Math.min(34, W * 0.07)), '#fff', 'rgba(0,0,0,.4)', 'center', 'middle', 5);
        text(s.idle[1], W / 2, H * 0.42 + 34, '600 15px "Chakra Petch", sans-serif', st.sub, 'rgba(0,0,0,.5)', 'center', 'middle', 4);
      }
      if (run && s.count && t < s.count.beat0) {   // นับเข้า 1–4 ตามจังหวะเพลง
        var left = Math.ceil((s.count.beat0 - t) / s.count.len - 1e-9);
        if (left >= 1 && left <= s.count.n) {
          var ph = 1 - ((s.count.beat0 - t) / s.count.len - (left - 1)), sz = Math.min(W * 0.16, 110) * (1.25 - 0.25 * Math.min(1, ph * 4));
          g.globalAlpha = Math.min(1, (1 - ph) * 3); text(String((s.count.n - left) % 4 + 1), W / 2, H * 0.38, st.num(sz), '#fff', HOT, 'center', 'middle', 6); g.globalAlpha = 1;
        }
      }
      drawHud(s, run); drawPops();
    }
    return { resize: resize, setStyle: setStyle, reset: reset, draw: draw };
  }
  return { create: create, NAMES: NAMES, laneAt: laneAt };
});
