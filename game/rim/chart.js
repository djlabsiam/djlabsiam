/* Rim: สร้างแผนที่โน้ตหยาบจากไฟล์เพลง (ทาง ก แบบ S0 · ฟังก์ชันล้วน)
   แยก 4 ย่านความถี่ (ต่ำ → สูง = เลนซ้าย → ขวา) ไม่ใช่ STEM จริง
   ขั้น: พลังงานแต่ละย่านทุก 10 ms → จุดที่เสียงเข้า (onset) → หา BPM + จังหวะแรก
   → ตารางโน้ตตัวเขบ็ต 1 ชั้น → ช่องไหนย่านไหนเด่นสุดได้โน้ตเลนนั้น → เสียงค้างนาน (STEM หรือ HPSS) = ท่อ → กรองให้ข้ามเลนทัน */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RimChart = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var EDGES = [150, 600, 2500];   // Hz รอยต่อย่าน
  var HOP = 0.01;                 // วินาทีต่อเฟรม
  var BPM_LO = 85, BPM_HI = 170;  // หนึ่งอ็อกเทฟพอดี จึงไม่มีปัญหาครึ่ง/สองเท่า
  var EDGE_W = 0.8;               // หาเสียงจริงในหน้าต่างช่อง: ยอดที่ขอบหน้าต่างเหลือน้ำหนัก 1 − 0.8 (วัด 0 / 0.5 / 0.8 กับเพลงจริง 13 พ.ย. — 0.8 โน้ตใกล้จำนวนเดิมสุด ตรงเวลาสูงสุด)
  var PICK = 0.3;               // ช่องที่ onset ถึงสัดส่วนนี้ของค่าสูง (เปอร์เซ็นไทล์ 95 ของทุกช่อง) ถึงได้โน้ต
  // ความยาก = ความแรงขั้นต่ำของช่องบนจังหวะ (beat) / ช่องตัวเขบ็ตหลัง (off) เทียบค่าสูง · ยาก = ทุกช่องที่ถึง PICK (แบบเดิม)
  // move = วินาทีขั้นต่ำต่อการหมุนจานข้าม 1 เลน (โน้ตที่ไปไม่ทันถูกย้ายมาเลนที่ใกล้กว่า)
  // เดิม 0.1 ทุกระดับ — ผลเล่นจริง 13 พ.ย. (140 BPM) พลาดเพราะข้าม 1–2 เลนใน 0.214 วิไม่ทัน · เจ้าของเลือกเผื่อตามระดับ
  var LEVELS = {
    easy: { beat: 0.45, off: Infinity, move: 0.3 },   // บนจังหวะที่ชัดเท่านั้น
    normal: { beat: PICK, off: 0.6, move: 0.2 },      // ทุกจังหวะ + ตัวเขบ็ตหลังที่ดังเด่นจริง
    hard: { beat: PICK, off: PICK, move: 0.12 },
    expert: { beat: PICK, off: PICK, move: 0.12, slide: true },   // โน้ตจากชุดยาก จัดเป็น baby scratch สลับ click · ท่อเป็นท่อลาก (เจ้าของขอ 13 พ.ย.)
  };
  var SUSTAIN = 0.4;              // พลังงานยังเหลือ ≥ สัดส่วนนี้ของยอด = ยังค้างอยู่
  var BODY = 0.15;                // หลังกระแทก 80 ms ยังเหลือพลังงาน ≥ สัดส่วนนี้ของยอด ถึงนับเป็นเสียงค้าง
  var HOLD_MAX = 4;               // ท่อยาวสุด (บีต)
  var TARGET = 90;                // วินาที ความยาวที่เล่นจริงเมื่อย่อเพลง (เจ้าของเลือก "ราว 1.5 นาที" 13 พ.ย.)
  var PHRASE = 32;                // บีตต่อท่อน (8 ห้อง) ตัดได้เฉพาะรอยต่อท่อน
  var QUIET_BAR = 0.4, ZONE_MAX = 8;   // FX Zone: ห้องที่เสียงเข้าเบากว่าสัดส่วนนี้ของค่ากลาง · ยาวสุดกี่ห้อง
  var BUILD = 2;                       // FX Zone build-up: กี่ห้องก่อนรอยต่อท่อน
  // STEM: เลนของท่อตามเครื่อง (สูง = ขวา · เลน 1 เหลือให้กลองอย่างเดียว) · ค่าตั้งต้น ยังไม่ได้ลองกับคน
  var STEM_LANE = { bass: 0, other: 2, vocals: 3 }, HOLD_PICK = 0.5, HOLD_GAP = 1;
  // HPSS: หน้าต่าง ~23 ms · ใช้ถึง 8 kHz · ค่ากลางตามเวลา ±10 เฟรม (210 ms) · ตามความถี่ ±8 ช่อง · เสียงค้างแบ่ง 150 / 1000 Hz
  var HPSS = { win: 0.023, fmax: 8000, lt: 10, lf: 8, mel: [150, 1000] };

  // biquad 2 ชั้น (Q 0.707) ตามสูตร RBJ · ย่าน = high-pass ที่ขอบล่าง แล้ว low-pass ที่ขอบบน
  function biquad(x, sr, type, fc) {
    var w = 2 * Math.PI * fc / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2), a0 = 1 + al;
    var b0 = (type === 'lp' ? 1 - cs : 1 + cs) / 2 / a0, b1 = (type === 'lp' ? 1 - cs : -(1 + cs)) / a0, a1 = -2 * cs / a0, a2 = (1 - al) / a0;
    var out = new Float32Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < x.length; i++) {
      var y = b0 * x[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = y; out[i] = y;
    }
    return out;
  }

  // พลังงานต่อเฟรมของ 4 ย่าน
  function bandEnergy(x, sr, hop) {
    var sig = [
      biquad(x, sr, 'lp', EDGES[0]),
      biquad(biquad(x, sr, 'hp', EDGES[0]), sr, 'lp', EDGES[1]),
      biquad(biquad(x, sr, 'hp', EDGES[1]), sr, 'lp', EDGES[2]),
      biquad(x, sr, 'hp', EDGES[2]),
    ];
    var nf = Math.floor(x.length / hop);
    return sig.map(function (y) {
      var e = new Float32Array(nf);
      for (var f = 0; f < nf; f++) for (var i = f * hop, end = i + hop; i < end; i++) e[f] += y[i] * y[i];
      return e;
    });
  }

  // ── HPSS (Fitzgerald 2010) — หา "เสียงค้าง" ในเพลงรวม แทน STEM เบส / อื่นๆ / ร้อง (ไม่ใช้ AI) ──
  // สเปกตรัม STFT · ค่ากลางตามเวลา = เสียงค้าง (H) · ค่ากลางตามความถี่ = เสียงกระแทก (P) · มาสก์อ่อน H²/(H²+P²)
  // วัดเทียบ STEM 6 เพลง (13 พ.ย. · chart-eval.mjs): ใช้ HPSS กับท่ออย่างเดียวดีสุด — ใช้กับโน้ตชิ้นด้วย เลนตรงน้อยลง
  // คิดแค่ upto เฟรมแรก (ช่วงที่เล่นจริง · ท่อใช้แค่ช่วงนั้น) เพราะช้ากว่าส่วนอื่นมาก · เฟรม f กลางหน้าต่างที่ f·hop + hop/2 (ตรงกับ bandEnergy)
  // ลองคิดทุก 20 ms (เร็วขึ้นเท่าตัว) หรือตัดที่ 4 kHz แล้ว ท่อตรง STEM น้อยลงชัด (43% → 31% / 36%) จึงไม่ใช้
  function fft(re, im) {   // radix-2 แทนที่ในตัว
    var n = re.length, i, j = 0, k, len, h, wr, wi, cr, ci, t, ur, ui, tr, ti;
    for (i = 1; i < n; i++) { k = n >> 1; while (j & k) { j ^= k; k >>= 1; } j |= k; if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (len = 2; len <= n; len <<= 1) {
      h = len >> 1; wr = Math.cos(-2 * Math.PI / len); wi = Math.sin(-2 * Math.PI / len);
      for (i = 0; i < n; i += len) {
        cr = 1; ci = 0;
        for (k = 0; k < h; k++) {
          var a = i + k, b = a + h;
          tr = re[b] * cr - im[b] * ci; ti = re[b] * ci + im[b] * cr; ur = re[a]; ui = im[a];
          re[a] = ur + tr; im[a] = ui + ti; re[b] = ur - tr; im[b] = ui - ti;
          t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
        }
      }
    }
  }
  function median(a, n) {   // quickselect (สลับค่าใน a)
    var lo = 0, hi = n - 1, m = n >> 1;
    while (lo < hi) {
      var p = a[(lo + hi) >> 1], i = lo, j = hi;
      while (i <= j) { while (a[i] < p) i++; while (a[j] > p) j--; if (i <= j) { var t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; } }
      if (m <= j) hi = j; else if (m >= i) lo = i; else break;
    }
    return a[m];
  }
  function sustained(x, sr, hop, upto) {
    var N = 1 << Math.round(Math.log2(sr * HPSS.win)), K = Math.min(N / 2, Math.ceil(HPSS.fmax * N / sr)), hz = sr / N;
    var nf = Math.floor(x.length / hop), ns = Math.min(nf, upto), lt = HPSS.lt;
    var win = new Float32Array(N), re = new Float32Array(N), im = new Float32Array(N), S = [], i, k, f, j;
    for (i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
    for (k = 0; k < K; k++) S.push(new Float32Array(ns));
    for (f = 0; f < ns; f++) {
      var c = f * hop + (hop >> 1) - (N >> 1);
      for (i = 0; i < N; i++) { var s = c + i; re[i] = s >= 0 && s < x.length ? x[s] * win[i] : 0; im[i] = 0; }
      fft(re, im);
      for (k = 0; k < K; k++) S[k][f] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    }
    var mb = new Int8Array(K);
    for (k = 0; k < K; k++) mb[k] = k * hz < HPSS.mel[0] ? 0 : k * hz < HPSS.mel[1] ? 1 : 2;
    var M = [0, 1, 2].map(function () { return new Float32Array(ns); }), buf = new Float32Array(2 * Math.max(lt, HPSS.lf) + 1);
    for (f = 0; f < ns; f++) for (k = 0; k < K; k++) {
      var n = 0;
      for (j = Math.max(0, f - lt); j <= Math.min(ns - 1, f + lt); j++) buf[n++] = S[k][j];
      var hh = median(buf, n);
      n = 0;
      for (j = Math.max(0, k - HPSS.lf); j <= Math.min(K - 1, k + HPSS.lf); j++) buf[n++] = S[j][f];
      var pp = median(buf, n), m = S[k][f];
      M[mb[k]][f] += m * m * hh * hh / (hh * hh + pp * pp + 1e-20);
    }
    return { bass: M[0], other: M[1], vocals: M[2] };
  }

  function frameEnergy(y, hop) {   // พลังงานทั้งย่านต่อเฟรม (ใช้กับ STEM ที่แยกเครื่องมาแล้ว)
    var nf = Math.floor(y.length / hop), e = new Float32Array(nf);
    for (var f = 0; f < nf; f++) for (var i = f * hop, end = i + hop; i < end; i++) e[f] += y[i] * y[i];
    return e;
  }

  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : 0; }

  // onset = พลังงาน (สเกล log) ที่เพิ่มขึ้นจากเฟรมก่อน · พื้นเทียบค่าเฉลี่ยรวมทุกย่าน
  // (ถ้าเทียบค่าเฉลี่ยของย่านตัวเอง ย่านที่เงียบจะขยายเสียงรั่วจากย่านข้างๆ จนดูเหมือนโน้ต)
  function onsets(E, m) {
    var out = new Float32Array(E.length), prev = 0;
    for (var i = 0; i < E.length; i++) { var e = Math.log1p(100 * E[i] / m); out[i] = Math.max(0, e - prev); prev = e; }
    return out;
  }

  function avgNear(a, f, r) { var s = 0, n = 0; for (var i = Math.max(0, f - r); i <= Math.min(a.length - 1, f + r); i++) { s += a[i]; n++; } return n ? s / n : 0; }
  function peakNear(a, f, r) { var v = 0; for (var i = Math.max(0, f - r); i <= Math.min(a.length - 1, f + r); i++) v = Math.max(v, a[i]); return v; }

  // หา BPM + เวลาจังหวะแรก: ลองทุกจังหวะ/ทุกเฟส ดูค่าเฉลี่ย onset ที่ตกบนจังหวะ · หยาบ 0.5 แล้วละเอียด 0.02
  // รอบหยาบยอมคลาด ±1 เฟรม (BPM ยังไม่ตรงจะสะสมคลาด) · รอบละเอียดต้องตรงเฟรม · คะแนนเท่ากันเป็นแถบ เอากลางแถบ
  function tempo(flux, dt) {
    function tryBpm(bpm, r) {
      var period = 60 / bpm / dt, top = { score: -1 };
      for (var ph = 0; ph < period; ph++) {
        var s = 0, n = 0;
        for (var p = ph; p < flux.length; p += period) { s += peakNear(flux, Math.round(p), r); n++; }
        if (n && s / n > top.score) top = { score: s / n, bpm: bpm, offset: ph * dt };
      }
      return top;
    }
    var b, best = { score: -1 }, fine = [];
    for (b = BPM_LO; b <= BPM_HI; b += 0.5) { var r = tryBpm(b, 1); if (r.score > best.score) best = r; }
    for (b = best.bpm - 0.5; b <= best.bpm + 0.5; b += 0.02) fine.push(tryBpm(b, 0));
    var hi = Math.max.apply(null, fine.map(function (r) { return r.score; }));
    var band = fine.filter(function (r) { return r.score >= hi * 0.999; }), mid = band[Math.floor(band.length / 2)];
    return { bpm: Math.round(mid.bpm * 100) / 100, offset: mid.offset };
  }

  // จำกัดการข้ามเลนให้จานไปทัน (นับจากเลนปลายของโน้ตก่อนหน้า) · ระหว่างท่อธรรมดาขยับไม่ได้
  // slide(n, ถัดไป) = สร้างเส้นทางท่อลาก (ยากสุด) หลังรู้เลนเริ่มของท่อแล้ว
  function reachable(notes, move, slide) {
    var prev = null;
    notes.forEach(function (n, i) {
      if (prev) {
        var from = prev.path ? prev.path[prev.path.length - 1][1] : prev.lane;
        var can = Math.floor((n.t - prev.t - prev.len) / move + 1e-9);
        n.lane = from + Math.max(-can, Math.min(can, n.lane - from));
      }
      if (slide && n.len) n.path = slide(n, notes[i + 1]);
      prev = n;
    });
    return notes;
  }

  // stems (ไม่บังคับ) = { drums, bass, other, vocals } จาก StemSep/Demucs ยาวเท่า x
  // จังหวะ + โน้ตชิ้น + FX Zone มาจากกลอง · ท่อมาจากเสียงค้างของเบส/อื่นๆ/ร้อง (เลนตาม STEM_LANE)
  // ไม่มี stems (ผู้เล่นบนเว็บ): โน้ตชิ้นจาก 4 ย่านความถี่ของเพลงรวม (แบบเดิม) · ท่อจากเสียงค้าง 3 ย่านที่ HPSS แยกให้ (แทนเบส/อื่นๆ/ร้อง)
  // full = จะเล่นเต็มเพลง (เจ้าของขอ 13 พ.ย.): คิดเสียงค้าง (HPSS) ทั้งเพลง · ไม่ใส่ = คิดแค่ช่วงย่อ (เร็วกว่า) · range ยังคืนช่วงย่อเสมอ ผู้เรียกเลือกเองว่าจะใช้ไหม
  function analyze(x, sr, stems, full) {
    var hop = Math.round(sr * HOP), dt = hop / sr;   // ระยะเฟรมจริง (ปัดเป็นจำนวนตัวอย่างแล้ว ไม่ใช่ 10 ms พอดี)
    var src = stems ? { E: bandEnergy(stems.drums, sr, hop), mel: { bass: frameEnergy(stems.bass, hop), other: frameEnergy(stems.other, hop), vocals: frameEnergy(stems.vocals, hop) } }
      // ช่วงที่อาจได้เล่น: เพลงสั้นเล่นทั้งเพลง · เพลงยาวจบไม่เกิน TARGET + 10 วิ (shorten) + เผื่อท่อยาวสุดราว 5 วิ
      : { E: bandEnergy(x, sr, hop), mel: sustained(x, sr, hop, Math.ceil((full || x.length / sr <= TARGET + 20 ? x.length / sr : TARGET + 15) / dt)) };
    var E = src.E, m = mean(E.map(mean)) || 1, O = E.map(function (e) { return onsets(e, m); }), nf = E[0].length, flux = new Float32Array(nf);
    for (var f = 0; f < nf; f++) flux[f] = O[0][f] + O[1][f] + O[2][f] + O[3][f];
    var tp = tempo(flux, dt), step = 60 / tp.bpm / 2, first = tp.offset % step;

    // ค่า onset ของทุกช่องบนตาราง แยกย่าน = ยอดสูงสุดในหน้าต่างของช่อง [t − step/2, t + step/2) · hit = เวลาของยอดนั้น
    // (เดิมดูแค่ ±20 ms รอบช่อง: กลองสวิง/ตารางที่เลื่อนจากเสียงจริงจึงหลุดหรือคลาด · วัด 13 พ.ย.: โน้ตบนกลองจริงแค่ 53% ห่าง 61 ms)
    var slots = [];
    for (var t = first; t < nf * dt; t += step) slots.push(t);
    // ยอดที่ห่างกลางช่องได้น้ำหนักน้อยลง (ขอบหน้าต่าง = 1 − EDGE_W) ไม่งั้นเก็บตัวโน้ต 1/16 เบาๆ จนโน้ตเพิ่มเกือบเท่าตัว (เพลงจริง 6 เพลง)
    var edge = slots.map(function (t) { return Math.max(0, Math.round((t - step / 2) / dt)); }).concat([nf]), hit = [[], [], [], []];
    var vals = O.map(function (o, b) {
      return slots.map(function (t, k) {
        var v = 0, at = Math.round(t / dt), half = Math.max(1, (edge[k + 1] - edge[k]) / 2), mid = edge[k] + half;
        for (var f = edge[k]; f < Math.min(edge[k + 1], nf); f++) {
          var w = o[f] * (1 - EDGE_W * Math.abs(f - mid) / half);
          if (w > v) { v = w; at = f; }
        }
        hit[b][k] = at * dt;
        return v;
      });
    });
    var loud = slots.map(function (t, k) { return Math.max(vals[0][k], vals[1][k], vals[2][k], vals[3][k]); }).sort(function (a, b) { return a - b; });
    var p95 = loud[Math.floor(loud.length * 0.95)] || 1;

    // จังหวะหลักคือช่องคู่หรือคี่: เลือกฝั่งที่เสียงต่ำ + กลางต่ำ (กลองเตะ/สแนร์) ดังขึ้นรวมมากกว่า
    // (เฟสจาก tempo() อาจไปจับไฮแฮตตัวเขบ็ตหลัง เพราะมันดูแค่ผลรวมทุกย่าน)
    var low = [0, 0];
    slots.forEach(function (t, k) { low[k % 2] += vals[0][k] + vals[1][k]; });
    var beatSide = low[0] >= low[1] ? 0 : 1;

    // ทุกช่อง: ย่านที่ดังขึ้นมากสุดได้เลน (เท่ากันให้ย่านต่ำกว่าชนะ) · pow = ความแรงเทียบ p95 · beat = ตกบนจังหวะ (ไม่ใช่ตัวเขบ็ตหลัง)
    var cands = [];
    slots.forEach(function (t, k) {
      var lane = 0;
      for (var b = 1; b < 4; b++) if (vals[b][k] > vals[lane][k]) lane = b;
      cands.push({ t: t, k: k, hit: hit[lane][k], lane: lane, pow: vals[lane][k] / p95, beat: k % 2 === beatSide });
    });

    // ท่อ: พลังงานย่านนั้น (เฉลี่ย 50 ms กันเสียงตีกันกระตุก · วัดหลังเสียงกระแทกผ่านไป 60 ms) ค้าง ≥ SUSTAIN นานถึง 1 บีต
    // เฟดเดอร์มีอันเดียว ท่อจึงกลืนโน้ตที่ตกในช่วงท่อ + เว้น 1 ช่องหลังปลาย · ยาวสุด HOLD_MAX บีต
    function sustain(e, t) {   // เสียงที่เข้าตอน t ค้างนานกี่วินาที (ปัดลงเป็นช่อง · ยาวสุด HOLD_MAX บีต)
      var f0 = Math.round(t / dt), body = avgNear(e, f0 + 8, 2), f = f0 + 8;
      if (body < BODY * peakNear(e, f0 + 2, 2)) f = f0;   // เสียงจางไปแล้ว (กลอง) ไม่ใช่เสียงค้าง
      while (f > f0 && f < nf && avgNear(e, f, 2) >= SUSTAIN * body) f++;
      return Math.min(Math.floor((f - f0) * dt / step + 1e-9), 2 * HOLD_MAX) * step;
    }
    // ท่อเริ่มที่ช่องที่เบส/อื่นๆ/ร้อง (STEM จริง หรือเสียงค้างจาก HPSS) เข้าแรง (≥ HOLD_PICK ของค่าสูงของเครื่องนั้น) แล้วค้าง ≥ 2 ช่อง · หลายเครื่องพร้อมกัน = เอาที่ค้างนานสุด
    // ท่อแทนโน้ตชิ้นในช่องนั้น + กลืนโน้ตที่ตกในช่วงท่อ + เว้น 1 ช่อง (เหมือน holds) · ระดับง่ายเริ่มท่อได้แค่บนจังหวะ
    var held = (function () {
      var mel = Object.keys(STEM_LANE).map(function (name) {
        var e = src.mel[name], o = onsets(e, mean(e) || 1);
        // เสียงค้างจากเพลงรวมคิดแค่ช่วงที่เล่น (สั้นกว่าเพลง) → ค่าสูงวัดเฉพาะช่องในช่วงนั้น
        var ov = slots.map(function (t) { return peakNear(o, Math.round(t / dt), 2); });
        var s = ov.filter(function (v, k) { return slots[k] < e.length * dt; }).sort(function (a, b) { return a - b; });
        // ค่าสูง = เปอร์เซ็นไทล์ 95 · เครื่องที่เล่นนานๆ ครั้ง (ค่าส่วนใหญ่ 0) ใช้ค่าสูงสุดแทน
        return { e: e, ov: ov, hi: s[Math.floor(s.length * 0.95)] || s[s.length - 1] || 0, lane: STEM_LANE[name] };
      });
      return slots.map(function (t, k) {
        var best = null;
        mel.forEach(function (m) {
          if (!m.hi || m.ov[k] < HOLD_PICK * m.hi) return;
          var len = sustain(m.e, t);
          if (len >= 2 * step && (!best || len > best.len)) best = { lane: m.lane, len: len };
        });
        return best;
      });
    })();
    // ท่อห่างจากปลายท่อก่อนอย่างน้อย HOLD_GAP ห้อง (เพลงจริง 13 พ.ย.: เครื่อง "อื่นๆ" ค้างเกือบตลอด ท่อกิน 46% ของโน้ต กลองหาย)
    function stemHolds(notes, L) {
      var out = [], until = -1, i = 0, nextHold = -1;
      slots.forEach(function (t, k) {
        while (i < notes.length && notes[i].t < t - 1e-6) i++;
        var n = i < notes.length && Math.abs(notes[i].t - t) < 1e-6 ? notes[i] : null;
        if (t < until - 1e-6) return;
        var h = held[k];
        if (h && t >= nextHold - 1e-6 && (cands[k].beat || L.off < Infinity)) {
          out.push({ t: t, lane: h.lane, len: h.len }); until = t + h.len + step * 0.999; nextHold = t + h.len + HOLD_GAP * 8 * step;
        }
        else if (n) out.push(n);
      });
      return out;
    }

    // ท่อลาก (ยากสุด · ท่า baby scratch): path = จุดกลับทิศ หน้าจอลากเส้นตรงถึงกันเป็นซิกแซก (เจ้าของวาดให้ดู 13 พ.ย.)
    // ออกไปเลนติดกันแล้วกลับ · เริ่มและจบที่เลนเดิมเสมอ (scratch ครบทั้งไป-กลับ) · กลับทิศตรงเสียงกลองในท่อ
    // ตาราง 1/8 จึงเร็วสุดครึ่งจังหวะ · ไม่มีเสียงกลองในท่อ = กลับทิศทุก 1 จังหวะ · ข้างที่ออกไป = ฝั่งโน้ตถัดไป
    function slidePath(n, next) {
      var dir = next && next.lane < n.lane ? -1 : 1, end = n.t + n.len, u;
      if (n.lane + dir < 0 || n.lane + dir > 3) dir = -dir;
      var hits = cands.filter(function (c) { return c.t > n.t + 1e-6 && c.t < end - step / 2 && c.pow >= PICK * 0.999; })
        .map(function (c) { return c.t; });
      if (!hits.length) for (u = n.t + 2 * step; u < end - step / 2; u += 2 * step) hits.push(u);
      if (!hits.length) hits.push(n.t + step);   // ท่อสั้นสุด (2 ช่อง): กลับทิศครึ่งทาง
      if (hits.length % 2 === 0) hits.pop();     // จุดกลับทิศต้องเป็นเลขคี่ ถึงจบที่เลนเดิม
      var path = [[n.t, n.lane]];
      hits.forEach(function (t, i) { path.push([t, i % 2 ? n.lane : n.lane + dir]); });
      path.push([end, n.lane]);
      return path;
    }

    // ยากสุด: baby scratch 1 ครั้ง สลับ fader click 1 ที (เจ้าของวาดให้ดู 13 พ.ย.)
    // โน้ตบนจังหวะ = ท่อลากสั้น 2 ช่อง (ออก-กลับ 1 ครั้ง) → โน้ตถัดไป = click → วนใหม่ · ท่อจากเสียงค้างคงไว้ (ซิกแซกยาว) แล้วต่อด้วย click
    // ท่อกลืนโน้ตที่ตกในช่วงท่อ + เว้น 1 ช่องหลังปลาย (เหมือน holds)
    function babyClick(notes) {
      var out = [], until = -1, baby = true;
      notes.forEach(function (n) {
        if (n.t < until) return;
        if (!n.len && baby && Math.round((n.t - first) / step) % 2 === beatSide) n.len = 2 * step;
        if (n.len) { until = n.t + n.len + step * 0.999; baby = false; } else baby = true;
        out.push(n);
      });
      return out;
    }

    var beatLen = 2 * step, beat0 = first + beatSide * step;

    // FX Zone = ช่วงพัก (break): ห้อง (4 จังหวะ) ที่เสียงเข้าเฉลี่ยเหลือ < QUIET_BAR ของค่ากลางทั้งเพลง ติดกัน ≥ 2 ห้อง
    // ไม่เริ่มใน 2 ห้องแรก (อินโทร) · ยาวสุด ZONE_MAX ห้อง · โน้ตในโซนยังอยู่ทุกระดับ (เจ้าของ 19 พ.ย.: ในโซนยังต้อง Hit note · เดิมตัดโน้ตในโซน + เว้น 1 จังหวะหน้า-หลัง)
    var act = [], zones = [], run = 0, outro = null;   // outro = ช่วงพักที่เงียบยาวจนจบเพลง (กลองหายท้ายเพลง)
    for (var k0 = beatSide; k0 + 8 <= slots.length; k0 += 8) {
      var sum = 0;
      for (var i = k0; i < k0 + 8; i++) sum += Math.max(vals[0][i], vals[1][i], vals[2][i], vals[3][i]) / p95;
      act.push(sum / 8);
    }
    var med = act.slice().sort(function (a, b) { return a - b; })[Math.floor(act.length / 2)] || 0;
    for (var j = 2; j <= act.length; j++) {
      if (j < act.length && act[j] < QUIET_BAR * med) { run++; continue; }
      if (run >= 2) { zones.push({ t: beat0 + (j - run) * 4 * beatLen, len: Math.min(run, ZONE_MAX) * 4 * beatLen }); if (j === act.length) outro = zones[zones.length - 1]; }
      run = 0;
    }
    // โซนสำรอง (build-up): เพลงลูปส่วนใหญ่ไม่มีช่วงพักใน 1.5 นาทีแรก (ลอง 6 เพลง 13 พ.ย. — กลองหายเฉพาะท้ายเพลง)
    // ใส่เฉพาะเมื่อช่วงที่จะเล่นไม่มีช่วงพักจริงเลย และแค่ 1 โซน (เจ้าของ 14 พ.ย.: เดิมทุก 16 ห้อง มาบ่อยเกิน)
    // ช่วงพักท้ายเพลง (outro) ไม่นับ — เพลงลูปส่วนใหญ่มีแค่อันนี้ เล่นเต็มเพลงจึงไม่มี FX จนจบ (เจ้าของสั่งเพิ่มโซนสำรอง 14 พ.ย.)
    // = 2 ห้องสุดท้ายก่อนรอยต่อท่อนแรกที่พ้นท่อนแรก · ไม่ซ้อน/ชิดช่วงพักไม่เกิน 8 ห้อง
    var ph = phrasePhase(E, dt, beat0, beatLen, x.length / sr), bar = 4 * beatLen, range = shorten(ph, beat0, beatLen, x.length / sr);
    var playEnd = full || !range ? x.length / sr : range[1];
    // ช่วงพักที่คร่อมท้ายช่วงเล่นแล้วถูกตัดแต่ยังยาว ≥ 2 ห้อง ก็นับ (เกณฑ์เดียวกับ zones() ในหน้าเกม · ผู้ตรวจ 14 พ.ย.)
    if (!zones.some(function (z) { return z !== outro && z.t < playEnd && Math.min(z.len, playEnd - z.t) >= 2 * bar - 1e-6; })) {
      for (j = ph.p; j * beatLen < 8 * bar - 1e-6; j += PHRASE);
      for (; j <= ph.nb && beat0 + j * beatLen <= playEnd + 1e-6; j += PHRASE) {
        var bt = beat0 + j * beatLen - BUILD * bar;
        if (zones.every(function (z) { return bt + BUILD * bar <= z.t - 8 * bar + 1e-6 || bt >= z.t + z.len + 8 * bar - 1e-6; })) { zones.push({ t: bt, len: BUILD * bar }); break; }
      }
    }
    zones.sort(function (a, b) { return a.t - b.t; });

    // โน้ตชิ้นย้ายไปตรงเสียงจริงในหน้าต่างช่องของมัน (กลองสวิง / ตารางเลื่อน) · ท่อ ท่อลาก โซน ยังอยู่บนตาราง (ไม่ต้องตรงเป๊ะ · คงขั้นต่ำครึ่งจังหวะ)
    // ทำก่อน reachable ระยะข้ามเลนจึงคิดจากเวลาจริง · หน้าต่างของแต่ละช่องไม่ทับกัน ลำดับโน้ตจึงไม่สลับ
    function snap(notes) {
      notes.forEach(function (n) { if (!n.len) n.t = cands[n.k].hit; delete n.k; });
      return notes;
    }

    var levels = {};
    Object.keys(LEVELS).forEach(function (name) {
      var L = LEVELS[name], notes = cands.filter(function (c) { return c.pow >= (c.beat ? L.beat : L.off) * 0.999; })
        .map(function (c) { return { t: c.t, lane: c.lane, len: 0, k: c.k }; });
      notes = stemHolds(notes, L);
      levels[name] = reachable(snap(L.slide ? babyClick(notes) : notes), L.move, L.slide && slidePath);
    });
    // ความยากของเพลง (rank D–S · เจ้าของ 14 พ.ย.): จากโน้ตระดับยากในช่วงย่อเสมอ ไม่ขึ้นกับระดับที่เลือกหรือเล่นเต็มเพลง
    var span = range ? range[1] : x.length / sr;
    return { bpm: tp.bpm, offset: first, step: step, beat0: beat0, beatLen: beatLen, levels: levels, zones: zones, range: range,
      diff: difficulty(remap(levels.hard, range), span), print: songPrint(x, sr, beat0, beatLen, tp.bpm) };
  }

  // ── ย่อเพลง: เล่นจากต้นเพลงเสมอ (เจ้าของสั่ง 13 พ.ย. — ได้อารมณ์กว่าตัดมาช่วงกลาง · ห้ามตัดต่อท่อน)
  // จบที่รอยต่อท่อน 8 ห้องที่ใกล้ TARGET วินาที · รอยต่อท่อนหาจากจุดที่เสียงเปลี่ยน
  // คืน [0, จบ] (วินาทีในเพลงเดิม) หรือ null ถ้าเพลงสั้นพออยู่แล้ว
  function shorten(ph, beat0, beatLen, dur) {
    if (dur <= TARGET + 20 || ph.nb < 4 * PHRASE) return null;
    var nb = ph.nb, p = ph.p, j;
    // จบที่รอยต่อท่อนที่ใกล้ TARGET สุด (ในช่วง -15 ถึง +10 วิ) · ไม่มีรอยต่อในช่วงนั้น = จบที่ TARGET พอดีแล้วเฟดออก
    var end = TARGET, gap = Infinity;
    for (j = p; j < nb; j += PHRASE) {
      var t = beat0 + j * beatLen;
      if (t >= TARGET - 15 && t <= TARGET + 10 && Math.abs(t - TARGET) < gap) { gap = Math.abs(t - TARGET); end = t; }
    }
    return [0, end];
  }

  // รอยต่อท่อน: เฟส p (บีต) ของตาราง 8 ห้องที่ตรงจุดเสียงเปลี่ยนมากสุด · nb = จำนวนบีตเต็มในเพลง
  function phrasePhase(E, dt, beat0, beatLen, dur) {
    var nb = Math.floor((dur - beat0) / beatLen), nf = E[0].length, j, k, i;
    var feat = [];   // ความดัง (dB) 4 ย่านต่อบีต
    for (j = 0; j < nb; j++) {
      var f0 = Math.round((beat0 + j * beatLen) / dt), f1 = Math.min(nf, Math.round((beat0 + (j + 1) * beatLen) / dt)), v = [];
      for (k = 0; k < 4; k++) { var s = 0; for (var f = f0; f < f1; f++) s += E[k][f]; v.push(10 * Math.log10(s / Math.max(1, f1 - f0) + 1e-12)); }
      feat.push(v);
    }
    // จุดเปลี่ยน: เสียงเฉลี่ย 4 ห้องก่อน vs 4 ห้องหลัง ต่างกันแค่ไหน · เลือกเฟสของตาราง 8 ห้องที่ตรงจุดเปลี่ยนมากสุด
    var W = 16, nov = new Float32Array(nb);
    for (j = W; j <= nb - W; j++) {
      var d = 0;
      for (k = 0; k < 4; k++) { var s0 = 0, s1 = 0; for (i = 1; i <= W; i++) { s0 += feat[j - i][k]; s1 += feat[j + i - 1][k]; } d += Math.pow((s1 - s0) / W, 2); }
      nov[j] = Math.sqrt(d);
    }
    var p = 0, top = -1;
    for (var q = 0; q < PHRASE; q++) { var sc = 0; for (j = q; j < nb; j += PHRASE) sc += nov[j]; if (sc > top) { top = sc; p = q; } }
    return { p: p, nb: nb };
  }

  // ย้ายโน้ตเข้าช่วงที่เล่น (เวลา 0 = ต้นช่วง) · ท่อที่เลยท้ายช่วงถูกตัดสั้น · range = null คือเล่นเต็มเพลง
  function remap(notes, range) {
    if (!range) return notes;
    return notes.filter(function (n) { return n.t >= range[0] - 1e-6 && n.t < range[1] - 1e-6; })
      .map(function (n) {
        var m = { t: n.t - range[0], lane: n.lane, len: Math.min(n.len, range[1] - n.t) };
        if (n.path) m.path = n.path.filter(function (p) { return p[0] < range[1] - 1e-6; }).map(function (p) { return [p[0] - range[0], p[1]]; });
        return m;
      });
  }

  // ── ความยากเพลง: ค่า = โน้ต/วิ + 0.5 × เลนที่ข้าม/วิ + 2 × ข้ามเลนเร็ว/วิ (เร็ว = ไม่ถึง 0.25 วิต่อเลน) ──
  // ข้ามเลนเร็วถ่วงหนักสุด: ผลเล่นจริง Ice Spice 13 พ.ย. พลาด 29% ตอนข้ามเร็ว เทียบ 0.7% ที่เหลือ
  // เกณฑ์ rank ตั้งจากเพลงจริง 18 เพลงในเครื่องเจ้าของ ถอดเสียงที่ 44.1 kHz แบบที่หน้าเกมใช้ (14 พ.ย.: 3.39–11.28 · D 2 · C 4 · B 5 · A 3 · S 4 เพลง)
  //   ยังไม่ได้ปรับจากผลเล่นของคน · ไฟล์ mp3 กับ wav ของเพลงเดียวกันต่างได้ ~0.25 (Ice Spice wav 5.69 = S · mp3 5.45 = A)
  var RANKS = [['S', 5.6], ['A', 5.15], ['B', 4.65], ['C', 3.5], ['D', 0]], FAST = 0.25;
  function rankOf(v) { for (var i = 0; i < RANKS.length; i++) if (v >= RANKS[i][1] - 1e-9) return RANKS[i][0]; return 'D'; }
  function difficulty(notes, dur) {
    var steps = 0, fast = 0, end = function (n) { return n.path ? n.path[n.path.length - 1][1] : n.lane; };
    for (var i = 1; i < notes.length; i++) {
      var a = notes[i - 1], b = notes[i], d = Math.abs(b.lane - end(a));
      if (d) { steps += d; if ((b.t - a.t - (a.len || 0)) / d < FAST) fast++; }
    }
    dur = Math.max(1, dur);
    var nps = notes.length / dur, lps = steps / dur, fps = fast / dur, v = Math.round((nps + 0.5 * lps + 2 * fps) * 100) / 100;
    return { value: v, rank: rankOf(v), nps: Math.round(nps * 100) / 100, lps: Math.round(lps * 100) / 100, fps: Math.round(fps * 100) / 100 };
  }

  // ── ลายนิ้วมือเพลง (Music Rank Chart ต้องรู้ว่าไฟล์จากคนละเครื่องคือเพลงเดียวกัน) ──
  // ความดัง (dB) ทีละจังหวะ 128 จังหวะแรกนับจาก beat0 ปรับให้เฉลี่ย 0 ส่วนเบี่ยงเบน 1 เก็บเป็นจำนวนเต็ม ×20 + BPM + ความยาวเพลง
  // ไม่ใช้แผนที่โน้ต: ไฟล์เดียวกันถอดคนละอัตรา/เป็น mp3 ได้โน้ตต่างกันถึง 30% · ความดังต่างกันแทบ 0 (วัด 14 พ.ย.: เพลงเดียวกัน 0.00 ·
  // คนละเพลงอย่างน้อย 0.30 · ร้อง vs บรรเลงของเพลงเดียวกัน 0.24) → จับคู่เมื่อ BPM ห่าง ≤ 0.5 · ความยาวห่าง ≤ 2 วิ · ระยะ ≤ PRINT_MATCH
  var PRINT_BEATS = 128, PRINT_MATCH = 0.1;
  function songPrint(x, sr, beat0, beatLen, bpm) {
    var n = Math.max(0, Math.min(PRINT_BEATS, Math.floor((x.length / sr - beat0) / beatLen))), e = [], j, i;
    for (j = 0; j < n; j++) {
      var a = Math.round((beat0 + j * beatLen) * sr), b = Math.min(x.length, Math.round((beat0 + (j + 1) * beatLen) * sr)), s = 0;
      for (i = a; i < b; i++) s += x[i] * x[i];
      e.push(10 * Math.log10(s / Math.max(1, b - a) + 1e-9));
    }
    var m = mean(e) || 0, sd = Math.sqrt(e.reduce(function (p, v) { return p + (v - m) * (v - m); }, 0) / Math.max(1, n)) || 1;
    return { bpm: bpm, dur: Math.round(x.length / sr * 100) / 100, env: e.map(function (v) { return Math.max(-127, Math.min(127, Math.round((v - m) / sd * 20))); }) };
  }
  // ระยะห่าง = 1 − สหสัมพันธ์ (ดีสุดจากการเลื่อน ±2 จังหวะ เผื่อจับจังหวะแรกต่างกัน) · BPM/ความยาวไม่ใกล้กัน = Infinity
  function printDist(p, q) {
    if (Math.abs(p.bpm - q.bpm) > 0.5 || Math.abs(p.dur - q.dur) > 2) return Infinity;
    var n = Math.min(p.env.length, q.env.length), best = Infinity;
    for (var sh = -2; sh <= 2; sh++) {
      var xs = [], ys = [];
      for (var i = 4; i < n - 4; i++) { xs.push(p.env[i]); ys.push(q.env[i + sh]); }
      if (xs.length < 16) continue;
      var mx = mean(xs), my = mean(ys), sxy = 0, sx = 0, sy = 0;
      for (i = 0; i < xs.length; i++) { var u = xs[i] - mx, v = ys[i] - my; sxy += u * v; sx += u * u; sy += v * v; }
      best = Math.min(best, 1 - sxy / (Math.sqrt(sx * sy) || 1));
    }
    return best;
  }

  return { LEVELS: LEVELS, RANKS: RANKS, PRINT_MATCH: PRINT_MATCH, analyze: analyze, tempo: tempo, reachable: reachable, remap: remap, difficulty: difficulty, rankOf: rankOf, printDist: printDist };
});
