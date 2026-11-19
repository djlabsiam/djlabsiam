/* Rim: กติกาตัดสินโน้ต + ตัวรับโน้ต + เรียนรู้เครื่อง (ฟังก์ชันล้วน ไม่แตะ DOM)
   เวลาทุกตัวเป็นวินาทีบนนาฬิกาเพลง · ผู้เรียกต้องป้อนเหตุการณ์เรียงตามเวลา แล้วผลจะเหมือนเดิมทุกครั้ง
   โน้ต = { t, lane, len, path } · len = 0 คือโน้ตชิ้น (click fader) · len > 0 คือท่อ (เปิดเฟดเดอร์ค้าง) · มี path = ท่อลาก (baby scratch)
   ตัวเลขทุกตัวเป็นค่าตั้งต้นของ S0 ยังไม่ทดสอบกับคน */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RimRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var LANES = 4;
  var WIN = { perfect: 0.045, great: 0.09, ok: 0.14 };   // คลาดได้ไม่เกิน (วินาที)
  var PTS = { perfect: 300, great: 200, ok: 100 };
  var HOLD_PTS = 200;        // ท่อค้างครบได้เพิ่ม
  var HOLD_KEEP = 0.9;       // ท่อค้างไม่ถึงเท่านี้ คอมโบขาด
  var CLICK_MAX = 0.25;      // โน้ตชิ้นต้องปิดเฟดเดอร์ภายในเท่านี้หลังเปิด (เดิม 0.18 · เผื่อหางเฟดเดอร์สั่นราว 70 ms)
  var SNAP = 0.6;            // ตัวรับต้องห่างเลนเดิมเกินเท่านี้ถึงย้ายเลน กันจานสั่นที่รอยต่อ
  var CENTER = (LANES - 1) / 2, DEAD = 0.1;   // ตำแหน่งเริ่ม (กลางขอบจาน) · ต้องหมุนพ้นเท่านี้ถึงเลือกเลนแรก
  var FADER_ON = 0.2, FADER_OFF = 0.1;   // เปิดเมื่อเลื่อนพ้นฝั่งปิดเกินสัดส่วนนี้ · ปิดเมื่อกลับต่ำกว่า
  var SLIDE_GRACE = 0.12;    // ท่อลาก: อยู่ผิดเลนได้ไม่เกินเท่านี้ (เผื่อหมุนเร็ว/ช้ากว่าจุดเปลี่ยน)
  var BOUNCE = 0.06;        // ปิดแล้วเปิดใหม่ภายในเท่านี้ = เฟดเดอร์สั่น นับว่าเปิดค้างต่อ (FLX4 สั่น 3–12 ครั้งใน 10–70 ms ทุกครั้งที่คัท · ผลเล่นจริง 13 พ.ย.)
  var JOG_MAX = 40;
  // FX Zone (กติกาใหม่ เจ้าของ 19 พ.ย.): เข้าโซนต้องเปิด FX ค้างไว้ (เปิดก่อนเข้าโซนได้ · ให้เวลาถึง 1 จังหวะหลังต้นโซน ไม่ทัน = คอมโบขาด)
  //   ปิดก่อนจบโซน = คอมโบขาด + โบนัสหยุด · หมุน dry/wet ระหว่าง FX เปิดในโซน = โบนัส (ข้อความหนึ่งครั้งนับว่าหมุนอยู่อีก SPIN_HOLD วินาที)
  //   โน้ตในโซนยังต้องเล่นตามปกติ · โดนตอน FX เปิดค้าง = แต้ม ×FX_X (น้อยกว่า Fever)
  var SPIN_PTS = 500, SPIN_HOLD = 0.3, FX_X = 1.5;
  // Fever (เล่นเต็มเพลงเท่านั้น · เจ้าของออกแบบ 14 พ.ย. · กติกาใหม่ 19 พ.ย.): คอมโบถึง from แล้วโน้ตต่อๆ ไปเติมเกจตัวละ 1/n · เต็ม = รอ wait จังหวะ แล้ว Fever beats จังหวะ
  //   ระหว่าง Fever โน้ตยังต้องเล่นตามปกติ ได้แต้ม ×x · เปิดเฟดเดอร์นอกโน้ตไม่นับเปิดเปล่า (ไม่เสียคอมโบ ไม่ได้แต้ม)
  //   ท่อไม่ต้องค้าง (โดนหัวท่อ = ได้ค่าค้างเต็ม) · คลิกเฟดเดอร์ระหว่างความยาวท่อที่โดนหัวแล้ว = โบนัส hold แต้ม (นับไม่ถี่กว่า 1/16 จังหวะ)
  //   x 2 · hold 50 · FX_X 1.5 = ตัวเลขที่ผมเสนอ เจ้าของตอบ "ใช้ตามที่แนะนำ" 19 พ.ย. · n 60 เจ้าของ 18 พ.ย. ("Fever ติดบ่อยเกินไป")
  var FEVER = { from: 10, n: 60, wait: 2, beats: 16, x: 2, hold: 50 };

  function grade(dt) {
    dt = Math.abs(dt);
    return dt <= WIN.perfect ? 'perfect' : dt <= WIN.great ? 'great' : dt <= WIN.ok ? 'ok' : null;
  }

  // ท่อลาก: path = จุดกลับทิศ [[เวลา, เลน], ...] (หน้าจอลากเส้นตรงถึงกันเป็นซิกแซก)
  // ตัดสิน: ต้องอยู่เลนของจุดที่ใกล้สุดในเวลา = เปลี่ยนเลนที่กึ่งกลางระหว่างจุด (หมุนจานต่อเนื่อง ตัวรับย้ายเลนเมื่อเลยไป 0.6 เลน ใกล้กึ่งกลางพอดี)
  function steps(path) { return path.map(function (p, i) { return i ? [(path[i - 1][0] + p[0]) / 2, p[1]] : p; }); }

  // lane = เลนเริ่ม (ไม่ใส่ = 0) · null = เล็งตรงกลาง ยังไม่อยู่เลนไหน จนกว่าจะหมุนจาน
  // zones = FX Zone [{ t, len }] · on = 'on' เปิดทัน / 'miss' · off = 'ok' ค้างถึงจบโซน / 'early' ปิดก่อน / 'miss' ไม่ได้เปิด
  //   onDt = เวลาที่เปิด FX เทียบต้นโซน (ติดลบ = เปิดมาก่อน) · offDt = เวลาที่ปิดเทียบปลายโซน (null = ค้างถึงจบ) · frac = สัดส่วนเวลาที่หมุน dry/wet อยู่
  // opts (ไม่บังคับ) = { fever: true, beatLen, feverAt: เวลาเริ่ม Fever ที่กำหนดเอง (Tutorial) } · ไม่ใส่ fever = ไม่มีเกจ
  function create(notes, lane, zones, opts) {
    opts = opts || {};
    return {
      feverOn: !!opts.fever, beatLen: opts.beatLen || 0.5,
      gauge: 0, feverAt: opts.feverAt === undefined ? null : opts.feverAt, fever: null, fevers: [], feverScore: 0, fxScore: 0,   // fever = Fever ที่กำลังเล่น · fevers = ทุกครั้ง
      zones: (zones || []).map(function (z) { return { t: z.t, len: z.len, on: null, off: null, onDt: null, offDt: null, spun: 0, spunUntil: -Infinity, frac: null }; }),
      fx: false, fxAt: null,
      notes: notes.map(function (n, i) { return { i: i, t: n.t, lane: n.lane, len: n.len || 0, path: n.path || null, steps: n.path ? steps(n.path) : null, state: 'wait', res: null, dt: null, frac: null, why: null }; }),
      lane: lane === undefined ? 0 : lane, open: false, openAt: null, closeAt: null, active: null, next: 0,   // closeAt = ปิดที่รอผ่านช่วงกันสั่น
      movedAt: -Infinity,   // เวลาที่ตัวรับเปลี่ยนเลนล่าสุด (ใช้หาว่าท่อลากผิดเลนตั้งแต่เมื่อไร)
      combo: 0, maxCombo: 0, score: 0, ghosts: 0, ghostAt: [],   // ghostAt = เวลาที่เปิดเปล่า ไว้ดูว่าเกิดจากอะไร
    };
  }

  function mult(s) { return Math.min(4, 1 + Math.floor(s.combo / 10)); }

  function hit(s, n, keep, t) {
    var m = mult(s), base = PTS[n.res] + (n.len ? Math.round(HOLD_PTS * n.frac) : 0), p = base * m;
    var f = feverOf(s, n.t), z = !f && s.fx ? zoneOf(s, n.t) : null;   // ×Fever / ×FX ตามเวลาหัวโน้ต · ส่วนที่เพิ่มนับแยกในสรุป
    var extra = Math.round(p * ((f ? FEVER.x : z ? FX_X : 1) - 1));
    s.score += p + extra;
    if (f) { f.score += extra; s.feverScore += extra; } else s.fxScore += extra;
    s.combo = keep ? s.combo + 1 : 0;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    if (s.feverOn && s.combo > FEVER.from && s.feverAt === null && !s.fever) {
      s.gauge = Math.min(1, s.gauge + 1 / FEVER.n);
      if (s.gauge > 1 - 1e-9) { s.gauge = 1; s.feverAt = feverStart(s, t + FEVER.wait * s.beatLen); }
    }
  }
  // เวลาเริ่ม Fever: ถ้าช่วง Fever ชน FX Zone (รวมเว้น 1 จังหวะหน้า) ให้เลื่อนไปหลังโซน 1 จังหวะ
  function feverStart(s, at) {
    var len = FEVER.beats * s.beatLen, moved = true;
    while (moved) {
      moved = false;
      s.zones.forEach(function (z) {
        if (at < z.t + z.len && at + len > z.t - s.beatLen) { at = z.t + z.len + s.beatLen; moved = true; }
      });
    }
    return at;
  }
  // เริ่ม Fever (ไม่พักโน้ต · กติกาใหม่ 19 พ.ย.) · สร้างก่อนเวลาเริ่ม WIN.ok ให้โน้ตต้น Fever ที่กดเร็วได้ ×Fever (ตัดสินด้วย feverOf ตามเวลาหัวโน้ต)
  function feverBegin(s) {
    var f = { t: s.feverAt, len: FEVER.beats * s.beatLen, clicks: 0, score: 0, lastClick: -Infinity };
    s.fever = f; s.fevers.push(f); s.feverAt = null; s.gauge = 0;
  }
  function feverOf(s, t) {
    for (var i = s.fevers.length - 1; i >= 0; i--) { var f = s.fevers[i]; if (t >= f.t - 1e-9 && t < f.t + f.len) return f; }
    return null;
  }
  function zoneOf(s, t) {   // โซนที่ FX เปิดค้างอยู่ (เปิดทันและยังไม่ปิด) ณ เวลา t
    for (var i = 0; i < s.zones.length; i++) { var z = s.zones[i]; if (z.on === 'on' && z.off === null && t >= z.t && t < z.t + z.len) return z; }
    return null;
  }
  function feverPts(s, f, p) { f.score += p; s.score += p; s.feverScore += p; }
  // เปิดเฟดเดอร์นอกโน้ตระหว่าง Fever: อยู่ในความยาวท่อที่โดนหัวแล้ว (หัวอยู่ใน Fever) = โบนัส · ที่อื่น = ไม่มีผล
  function feverClick(s, f, t) {
    if (t - f.lastClick < s.beatLen / 4 - 1e-9) return;
    var on = s.notes.some(function (n) { return n.len && n.state === 'done' && n.res !== 'miss' && feverOf(s, n.t) && t >= n.t && t <= n.t + n.len; });
    if (!on) return;
    f.lastClick = t; f.clicks++;
    feverPts(s, f, FEVER.hold);
  }

  function miss(s, n, why) { n.state = 'done'; n.res = 'miss'; n.why = why; s.combo = 0; if (s.active === n) s.active = null; }

  function endHold(s, n, t) {
    n.state = 'done'; n.frac = Math.max(0, Math.min(1, (t - n.t) / n.len)); s.active = null;
    if (feverOf(s, n.t)) n.frac = 1;   // Fever: ท่อไม่ต้องค้าง โดนหัว = ค่าค้างเต็ม
    hit(s, n, n.frac >= HOLD_KEEP, t);
  }

  // เดินเวลาไปถึง t: โน้ตที่เลยช่วงไปแล้ว = พลาด · ชิ้นที่ไม่ปิดทัน = พลาด · ท่อที่ค้างถึงปลาย = จบครบ
  function tick(s, t) {
    if (s.closeAt !== null && t - s.closeAt >= BOUNCE - 1e-9) { var c = s.closeAt; s.closeAt = null; shut(s, c); }   // ปิดจริง ณ เวลาที่ปิด
    var a = s.active, upTo = s.closeAt === null ? t : s.closeAt;   // ระหว่างรอกันสั่น นับว่าปิดตั้งแต่ตอนที่ปิด
    if (a && a.state === 'click' && upTo - s.openAt > CLICK_MAX) miss(s, a, 'ค้างนาน');
    if (a && a.state === 'hold' && a.path) {   // ท่อลาก: อยู่ผิดเลนนานเกิน SLIDE_GRACE = หลุด ณ ตอนที่เริ่มผิด
      var now = Math.min(t, a.t + a.len), off = wrongSince(s, a, now);
      if (off !== null && now - off > SLIDE_GRACE) endHold(s, a, off);
    }
    if (a && a.state === 'hold' && t >= a.t + a.len && upTo >= a.t + a.len) endHold(s, a, a.t + a.len);   // ปิดก่อนปลาย = รอผลกันสั่นก่อน
    if (s.fever && t >= s.fever.t + s.fever.len) s.fever = null;
    if (s.feverAt !== null && t >= s.feverAt - WIN.ok) feverBegin(s);
    while (s.next < s.notes.length && (s.notes[s.next].state !== 'wait' || t > s.notes[s.next].t + WIN.ok)) {
      if (s.notes[s.next].state === 'wait') miss(s, s.notes[s.next], 'ไม่ได้รับ');
      s.next++;
    }
    s.zones.forEach(function (z) {
      if (z.on === null && s.fx && t >= z.t) { z.on = 'on'; z.onDt = s.fxAt - z.t; }   // เปิดค้างมาตั้งแต่ก่อนเข้าโซน
      if (z.on === null && t > z.t + s.beatLen) { z.on = 'miss'; s.combo = 0; }   // เลย 1 จังหวะแล้วยังไม่เปิด
      if (z.off === null && t >= z.t + z.len) zoneDone(s, z, z.on === 'on' ? 'ok' : 'miss', null);
    });
  }

  // ── FX Zone ──
  // จบโซน (ถึงปลายโซน หรือปิด FX ในโซน): โบนัสหมุน dry/wet ตามสัดส่วนเวลาที่หมุน × ตัวคูณคอมโบ
  function zoneDone(s, z, res, dt) {
    z.off = res; z.offDt = dt; z.frac = Math.min(1, z.spun / z.len);
    var spin = Math.round(SPIN_PTS * z.frac) * mult(s);
    s.score += spin; s.fxScore += spin;
  }
  function fxOn(s, t) {
    tick(s, t);
    if (s.fx) return;
    s.fx = true; s.fxAt = t;
    s.zones.forEach(function (z) {   // เปิดนอกโซน = ไม่มีผล (ไม่นับเปิดเปล่า) · เปิดก่อนเข้าโซนแล้วค้างไว้ tick() นับให้ตอนเข้าโซน
      if (z.on === null && t >= z.t && t <= z.t + s.beatLen) { z.on = 'on'; z.onDt = t - z.t; }
    });
  }
  function fxOff(s, t) {
    tick(s, t);
    if (!s.fx) return;
    s.fx = false;
    s.zones.forEach(function (z) {
      var end = z.t + z.len;
      if (z.off !== null || t < z.t || t >= end) return;
      z.spun -= Math.max(0, Math.min(z.spunUntil, end) - t);   // หมุนที่นับล่วงหน้าเลยตอนปิดไป ไม่นับ
      z.spunUntil = t;
      var res = z.on !== 'on' ? 'miss' : t < end - WIN.ok ? 'early' : 'ok';   // ปิดก่อนปลายไม่เกิน WIN.ok = ค้างครบ
      zoneDone(s, z, res, t - end);
      if (res === 'early') s.combo = 0;
    });
  }
  // หมุน dry/wet หนึ่งครั้ง: ระหว่าง FX เปิดในโซน นับว่าหมุนอยู่ตั้งแต่ตอนนี้ไปอีก SPIN_HOLD (ไม่นับซ้ำช่วงที่นับแล้ว)
  function knob(s, t) {
    tick(s, t);
    if (!s.fx) return;
    s.zones.forEach(function (z) {
      var end = z.t + z.len;
      if (z.off !== null || t < z.t || t >= end) return;
      var a = Math.max(t, z.spunUntil), b = Math.min(t + SPIN_HOLD, end);
      if (b > a) z.spun += b - a;
      z.spunUntil = Math.max(z.spunUntil, t + SPIN_HOLD);
    });
  }

  function move(s, t, lane) {
    tick(s, t);
    if (lane === s.lane) return;
    s.lane = lane; s.movedAt = t;
    var a = s.active;
    if (a && a.state === 'hold' && !a.path) endHold(s, a, t);   // ออกจากเลนกลางท่อ = ค้างได้แค่นั้น (ท่อลาก: tick() ตรวจเอง)
  }
  // ท่อลาก: ตัวรับอยู่ผิดเลนต่อเนื่องมาตั้งแต่เมื่อไร (null = ตอนนี้ถูกเลน)
  // ไล่ช่วงของเส้นทางย้อนจากตอนนี้ จนเจอช่วงที่ตรงกับเลนของตัวรับ หรือย้อนเลยตอนที่ขยับเลนล่าสุด
  function wrongSince(s, a, t) {
    var since = null;
    for (var i = a.steps.length - 1; i >= 0; i--) {
      var p = a.steps[i], end = i + 1 < a.steps.length ? a.steps[i + 1][0] : Infinity;
      if (p[0] > t + 1e-9) continue;
      if (end <= s.movedAt || p[1] === s.lane) break;
      since = Math.max(p[0], s.movedAt);
    }
    return since;
  }

  function open(s, t) {
    tick(s, t);
    if (s.closeAt !== null) { s.closeAt = null; return; }   // เปิดกลับในช่วงกันสั่น = ยังเปิดอยู่ ไม่ใช่การเปิดใหม่
    if (s.open) return;
    s.open = true; s.openAt = t;
    var best = null;
    for (var i = s.next; i < s.notes.length && s.notes[i].t <= t + WIN.ok; i++) {
      var n = s.notes[i];
      if (n.state === 'wait' && n.lane === s.lane && grade(t - n.t) && (!best || Math.abs(t - n.t) < Math.abs(t - best.t))) best = n;
    }
    // Fever: ไม่มีโน้ต = ไม่นับเปิดเปล่า (โบนัสถ้าอยู่ในท่อที่โดนหัวแล้ว) · หาโน้ตก่อน โน้ตใน Fever ยังต้องตัดสินปกติ
    var fv = best ? null : feverOf(s, t);
    if (fv) { feverClick(s, fv, t); return; }
    if (!best) { s.ghosts++; s.ghostAt.push(t); s.combo = 0; return; }   // เปิดมั่ว ไม่มีโน้ต = คอมโบขาด กันเปิดรัว
    best.res = grade(t - best.t); best.dt = t - best.t;
    best.state = best.len ? 'hold' : 'click';
    s.active = best;
  }

  // ปิดเฟดเดอร์: รอดูก่อน BOUNCE วินาที ถ้าเปิดกลับมาในช่วงนั้นถือว่าสั่น · ไม่กลับมา tick() จะปิดจริงย้อนเวลาที่ปิด
  function close(s, t) {
    tick(s, t);
    if (s.open && s.closeAt === null) s.closeAt = t;
  }
  function shut(s, t) {
    s.open = false;
    var a = s.active;
    if (a && a.state === 'click') { a.state = 'done'; s.active = null; hit(s, a, true, t); }
    else if (a && a.state === 'hold') endHold(s, a, t);
  }

  function summary(s) {
    var out = { perfect: 0, great: 0, ok: 0, miss: 0, ghosts: s.ghosts, maxCombo: s.maxCombo, score: s.score, fx: s.fxScore, fever: s.feverScore, fevers: s.fevers.length }, got = 0, max = 0;
    s.notes.forEach(function (n) {
      max += PTS.perfect + (n.len ? HOLD_PTS : 0);
      if (n.state !== 'done') return;
      out[n.res]++;
      if (n.res !== 'miss') got += PTS[n.res] + (n.len ? HOLD_PTS * n.frac : 0);
    });
    s.zones.forEach(function (z) {   // โซน = โบนัสหมุน dry/wet (เปิด/ปิด FX ไม่ตัดสินเป็นระดับแล้ว · ไม่ค้าง = คอมโบขาด)
      max += SPIN_PTS;
      got += SPIN_PTS * (z.frac || 0);
    });
    out.acc = max ? got / max : 0;
    out.stars = out.acc >= 0.92 ? 3 : out.acc >= 0.8 ? 2 : out.acc >= 0.6 ? 1 : 0;
    return out;
  }

  // ── ตัวรับโน้ต: จานหมุน = ตำแหน่งต่อเนื่อง (หน่วยเป็นเลน) · ตัวรับดูดเข้าเลนใกล้สุดแบบมีช่วงกันสั่น ──
  function slide(pos, ticks, perLane) { return Math.max(-0.35, Math.min(LANES - 0.65, pos + ticks / perLane)); }
  // prev = null (เริ่มตรงกลาง): หมุนพ้น DEAD ถึงเลือกเลนใกล้สุดฝั่งนั้น
  // free = เลื่อนอิสระ (ตัวเลือก): ไม่มีช่วงกันสั่น SNAP ได้เลนใกล้สุดทันที
  function laneOf(prev, pos, free) {
    if (prev === null) return Math.abs(pos - CENTER) > DEAD ? Math.max(0, Math.min(LANES - 1, Math.round(pos))) : null;
    return free || Math.abs(pos - prev) > SNAP ? Math.max(0, Math.min(LANES - 1, Math.round(pos))) : prev;
  }

  // ── เรียนรู้จาน (เหมือน Resonance): CC ที่แกว่งรอบจุดศูนย์ครบสองทิศ ไม่ผูกเลขรุ่นใด ──
  function jogDelta(v, kind) { return kind === 'twos' ? (v < 64 ? v : v - 128) : v - 64; }
  function jogKind(values) {
    var kinds = ['center', 'twos'], moved, i;
    for (i = 0; i < kinds.length; i++) {
      moved = values.map(function (v) { return jogDelta(v, kinds[i]); }).filter(function (d) { return d !== 0; });
      if (moved.length && moved.every(function (d) { return Math.abs(d) <= JOG_MAX; }) &&
        moved.some(function (d) { return d > 0; }) && moved.some(function (d) { return d < 0; })) return kinds[i];
    }
    return null;
  }
  function groupCC(msgs) {
    var groups = {};
    msgs.forEach(function (m) {
      if ((m[0] & 0xF0) !== 0xB0) return;
      var key = m[0] + ':' + m[1];
      (groups[key] = groups[key] || { status: m[0], cc: m[1], values: [] }).values.push(m[2]);
    });
    return Object.keys(groups).map(function (k) { return groups[k]; });
  }
  function learnJog(msgs) {
    var usable = groupCC(msgs).filter(function (g) {
      g.kind = g.values.length >= 10 ? jogKind(g.values) : null;
      return g.kind !== null;
    }).sort(function (a, b) { return b.values.length - a.values.length; });
    if (!usable.length) return null;
    var top = usable[0];
    return { status: top.status, kind: top.kind,
      ccs: usable.filter(function (g) { return g.status === top.status && g.kind === top.kind; }).map(function (g) { return g.cc; }) };
  }
  // ทิศจาน: evs = [[ms, ขีด], ...] ตามเวลา (ตัวแรก = ข้อความสุดท้ายของขั้นสแครช)
  // เริ่มนับหลังจานนิ่ง ≥ QUIET ms ก่อน (ทิ้งสแครชที่ค้างมา) แล้วหมุนสะสมถึง DIR_MIN ถึงตัดสิน · คืน 1 / -1 / null
  var QUIET = 400, DIR_MIN = 60;
  function jogDir(evs) {
    var sum = null;
    for (var i = 1; i < evs.length; i++) {
      if (sum === null && evs[i][0] - evs[i - 1][0] >= QUIET) sum = 0;
      if (sum !== null) { sum += evs[i][1]; if (Math.abs(sum) >= DIR_MIN) return sum > 0 ? 1 : -1; }
    }
    return null;
  }
  function jogTicks(jog, m) { return m[0] === jog.status && jog.ccs.indexOf(m[1]) >= 0 ? jogDelta(m[2], jog.kind) : 0; }

  // ── เรียนรู้เฟดเดอร์: ผู้เล่นเลื่อนเฟดเดอร์ที่จะใช้ไปสุดสองข้าง · เลือก CC ที่กวาดกว้างและเรียบสุด
  //    (เฟดเดอร์ 14 บิตส่ง CC ค่าละเอียดคู่มาด้วย ค่านั้นกระโดดไปมา จึงเรียบน้อยกว่าและไม่ถูกเลือก) ──
  function learnFader(msgs, skip) {
    var best = null;
    groupCC(msgs).forEach(function (g) {
      if (skip && skip(g)) return;
      var v = g.values, lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), jump = 0;
      if (v.length < 8 || hi - lo < 100) return;
      for (var i = 1; i < v.length; i++) jump += Math.abs(v[i] - v[i - 1]);
      var smooth = (hi - lo) / (1 + jump / (v.length - 1));
      if (!best || smooth > best.smooth) best = { status: g.status, cc: g.cc, lo: lo, hi: hi, smooth: smooth };
    });
    return best && { status: best.status, cc: best.cc, lo: best.lo, hi: best.hi };
  }
  // closed = ค่าตอนผู้เล่นค้างไว้ฝั่งปิดเสียง · ฝั่งเปิด = ปลายอีกข้างที่ไกลกว่า
  function faderCal(f, closed) {
    return { status: f.status, cc: f.cc, closed: closed, open: Math.abs(f.hi - closed) >= Math.abs(f.lo - closed) ? f.hi : f.lo };
  }
  // cut = จุดเปิด (สัดส่วนของระยะเฟดเดอร์ = cut-in mm ÷ ระยะ mm) · ปิดเมื่อกลับต่ำกว่าครึ่งของจุดเปิด · ไม่ใส่ = 20% / 10% เดิม
  function faderOpen(cal, wasOpen, v, cut) {
    var u = (v - cal.closed) / (cal.open - cal.closed), on = cut || FADER_ON, off = cut ? cut / 2 : FADER_OFF;
    return wasOpen ? u > off : u >= on;
  }
  // ── เรียนรู้ FX: ผู้เล่นกดเปิด FX (ขั้นหนึ่ง) แล้วกดปิด (อีกขั้น) · ไม่ผูกเลขรุ่น (FX ของแต่ละรุ่นส่ง MIDI ต่างกัน ยังไม่ได้วัด) ──
  // note off (0x8n) = note on ค่า 0 · ปุ่ม = ปุ่มสุดท้ายที่ส่งในขั้นเปิด และต้องส่งในขั้นปิดด้วย
  // ค่าสุดท้ายสองขั้นต่างกัน = คันโยก/ปุ่มที่บอกสถานะ ('level') · เท่ากัน = ปุ่มกดสลับ ('toggle' กดแต่ละครั้งสลับเปิด/ปิด)
  function norm(m) { return (m[0] & 0xF0) === 0x80 ? [0x90 | (m[0] & 0x0F), m[1], 0] : m; }
  function learnFx(onMsgs, offMsgs, skip) {
    var on = onMsgs.map(norm).filter(function (m) { return !(skip && skip(m)); }), off = offMsgs.map(norm);
    if (!on.length) return null;
    var k = on[on.length - 1], same = function (m) { return m[0] === k[0] && m[1] === k[1]; };
    var a = on.filter(same).map(function (m) { return m[2]; }), b = off.filter(same).map(function (m) { return m[2]; });
    if (!b.length) return null;
    var vOn = a[a.length - 1], vOff = b[b.length - 1];
    if (vOn !== vOff) return { status: k[0], num: k[1], mode: 'level', on: vOn, off: vOff };
    return { status: k[0], num: k[1], mode: 'toggle', press: Math.max.apply(null, a) };
  }
  // ข้อความนี้ทำอะไรกับ FX: true = เปิด · false = ปิด · 'toggle' = สลับ · null = ไม่เกี่ยว
  function fxMsg(fx, m) {
    m = norm(m);
    if (m[0] !== fx.status || m[1] !== fx.num) return null;
    if (fx.mode === 'toggle') return m[2] === fx.press ? 'toggle' : null;
    return m[2] === fx.on ? true : m[2] === fx.off ? false : null;
  }
  // ── เรียนรู้ปุ่ม dry/wet: CC ที่ส่งมาบ่อยสุด (≥ 8 ครั้ง ค่าเปลี่ยน) · ตอนเล่น ทุกข้อความของปุ่มนี้ = กำลังหมุน ──
  function learnKnob(msgs, skip) {
    var best = null;
    groupCC(msgs).forEach(function (g) {
      if (skip && skip([g.status, g.cc])) return;
      if (g.values.length < 8 || Math.min.apply(null, g.values) === Math.max.apply(null, g.values)) return;
      if (!best || g.values.length > best.values.length) best = g;
    });
    return best && { status: best.status, cc: best.cc };
  }

  // ── เรียนรู้ปุ่มกด (PLAY): note ที่กด 2 ครั้งล่าสุดเป็นปุ่มเดียวกัน · ไม่นับ CC (ปุ่มหมุน/จาน) และตอนปล่อย ──
  function learnButton(msgs, skip) {
    var p = msgs.map(norm).filter(function (m) { return (m[0] & 0xF0) === 0x90 && m[2] > 0 && !(skip && skip(m)); });
    if (p.length < 2) return null;
    var a = p[p.length - 2], b = p[p.length - 1];
    return a[0] === b[0] && a[1] === b[1] ? { status: b[0], num: b[1] } : null;
  }
  function pressed(btn, m) { m = norm(m); return m[0] === btn.status && m[1] === btn.num && m[2] > 0; }

  function faderMm(cal, v, travel) { return (v - cal.closed) / (cal.open - cal.closed) * travel; }   // ระยะจากฝั่งปิด (mm)

  return { LANES: LANES, CENTER: CENTER, WIN: WIN, PTS: PTS, HOLD_PTS: HOLD_PTS, SPIN_PTS: SPIN_PTS, FX_X: FX_X, FEVER: FEVER, CLICK_MAX: CLICK_MAX, BOUNCE: BOUNCE, SLIDE_GRACE: SLIDE_GRACE, SPIN_HOLD: SPIN_HOLD, grade: grade, create: create, tick: tick, move: move, open: open, close: close, summary: summary,
    fxOn: fxOn, fxOff: fxOff, knob: knob, learnFx: learnFx, fxMsg: fxMsg, learnKnob: learnKnob, learnButton: learnButton, pressed: pressed,
    slide: slide, laneOf: laneOf, jogDelta: jogDelta, learnJog: learnJog, jogDir: jogDir, jogTicks: jogTicks, learnFader: learnFader, faderCal: faderCal, faderOpen: faderOpen, faderMm: faderMm };
});
