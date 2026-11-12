/* Resonance: ฟิสิกส์ + ตัวหาจุดกลับทิศ + สรุปผล (ฟังก์ชันล้วน ไม่แตะ DOM)
   วัตถุ = ออสซิลเลเตอร์หน่วงเชิงเส้น (f0, Q) เก็บเป็นเลขเชิงซ้อน z = re + i·im แล้วหมุน/หน่วงด้วยสูตรปิด จึงไม่ขึ้นกับเฟรมเรต
   จุดกลับทิศแต่ละครั้ง = เตะหนึ่งครั้ง (ทิศใหม่ · แรงตามความเร็วมือ) ลงที่เวลาจริงของจุดนั้น แม้จะรู้ทีหลัง
   G = แอมพลิจูดนิ่งเมื่อเตะตรงเป๊ะ เทียบเกณฑ์แตก (A = 1)
   f0 ในด่าน = ความถี่ที่มือต้องเล่นเสมอ · over = 3 วัตถุสั่นเร็วกว่ามือ 3 เท่า · next = จังหวะถัดไปหลังร้าวครบส่วนของโหมดนั้น · slide = เป้าเลื่อนตามเวลา */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ResRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var TAU = 2 * Math.PI;
  var TAP_A = 0.35;                     // เคาะแล้วสั่นแค่ไหน (ต่ำกว่าเกณฑ์แตกเสมอ)
  var V_FULL = 150 * Math.PI / 180;     // มือเร็วถึงค่านี้ (เรเดียน/วินาที) = เตะเต็มแรง
  var HYST = 6 * Math.PI / 180;         // ต้องย้อนเกินมุมนี้ถึงนับว่ากลับทิศ กันนิ้วสั่น
  var GAP = 1;                          // เตะห่างกันเกินนี้ (วินาที) ถือว่าหยุดพัก
  var EVEN_WORST = 0.2;                 // จังหวะมือแกว่งเท่านี้ = ส่วนความสม่ำเสมอได้ 0
  var JOG_MIN = 10;                     // เรียนรู้จาน: CC ต้องส่งมาอย่างน้อยเท่านี้
  var JOG_MAX = 40;                     // เรียนรู้จาน: ก้าวต่อข้อความไม่เกินเท่านี้ ไม่งั้นถือว่าเป็นปุ่มหมุน

  // Phase 1 เรียงจากง่ายไปยาก · stem กับ width ใช้วาดรูปแก้ว
  var LEVELS = [
    { name: 'แก้วน้ำ', f0: 1.2, Q: 6, hold: 3, stem: 0.03, width: 0.25 },
    { name: 'แก้วทรงสูง', f0: 1.4, Q: 8, hold: 3, stem: 0.03, width: 0.19 },
    { name: 'โถแก้ว', f0: 1.0, Q: 6, hold: 3, stem: 0.03, width: 0.3 },
    { name: 'แก้วแชมเปญ', f0: 1.5, Q: 10, hold: 4, stem: 0.36, width: 0.15 },
    { name: 'แก้วไวน์', f0: 1.6, Q: 12, hold: 4, stem: 0.42, width: 0.27 },
    { name: 'แก้วคริสตัล', f0: 2.0, Q: 24, hold: 4, stem: 0.52, width: 0.2 },
    // Phase 2 หลายโหมด: แตกทีละจังหวะ + ด่านเล่นช้า 3 เท่า
    { name: 'ขวดน้ำ', f0: 1.0, next: [1.4], Q: 6, hold: 4, stem: 0.03, width: 0.21, hint: 'แก้วนี้มี 2 จังหวะ ร้าวครบแล้วจะเปลี่ยน' },
    { name: 'ขวดโซดา', f0: 1.2, next: [1.6], Q: 8, hold: 4, stem: 0.03, width: 0.16, hint: 'แก้วนี้มี 2 จังหวะ ร้าวครบแล้วจะเปลี่ยน' },
    { name: 'ระฆังแก้ว', f0: 1.0, over: 3, Q: 8, hold: 3, stem: 0.08, width: 0.29, hint: 'สั่นเร็วเกินมือ เล่นช้าลง 3 เท่า' },
    { name: 'แก้วเหล้า', f0: 1.4, next: [1.0], Q: 10, hold: 5, stem: 0.3, width: 0.17, hint: 'คราวนี้จังหวะช้าลงตอนเปลี่ยน' },
    { name: 'ระฆังคริสตัล', f0: 1.2, over: 3, Q: 12, hold: 4, stem: 0.08, width: 0.25, hint: 'สั่นเร็วเกินมือ เล่นช้าลง 3 เท่า' },
    { name: 'แจกันสามเสียง', f0: 1.2, next: [1.6, 1.0], Q: 10, hold: 6, stem: 0.12, width: 0.2, hint: 'แก้วนี้มี 3 จังหวะ' },
    // Phase 3 ความถี่เลื่อน: น้ำเติมแล้วเสียงต่ำลง แล้วลดกลับ (ค่าเริ่มต้นจากมือจำลอง ยังไม่ทดสอบกับคน)
    { name: 'แก้วเติมน้ำ', f0: 1.4, slide: { by: -0.4, every: 16 }, Q: 6, hold: 6, stem: 0.03, width: 0.24, hint: 'น้ำขึ้น จังหวะช้าลง ผ่อนมือตามไป' },
    { name: 'เหยือกน้ำ', f0: 1.5, slide: { by: -0.5, every: 18 }, Q: 6, hold: 6, stem: 0.03, width: 0.29, hint: 'น้ำขึ้น จังหวะช้าลง ผ่อนมือตามไป' },
    { name: 'ทรงสูงเติมน้ำ', f0: 1.6, slide: { by: -0.5, every: 20 }, Q: 8, hold: 6, stem: 0.03, width: 0.18, hint: 'น้ำขึ้น จังหวะช้าลง ผ่อนมือตามไป' },
    { name: 'แชมเปญเติมน้ำ', f0: 1.6, slide: { by: -0.6, every: 20 }, Q: 8, hold: 7, stem: 0.36, width: 0.15, hint: 'น้ำขึ้น จังหวะช้าลง ผ่อนมือตามไป' },
    { name: 'ไวน์เติมน้ำ', f0: 1.8, slide: { by: -0.6, every: 22 }, Q: 10, hold: 7, stem: 0.42, width: 0.27, hint: 'น้ำขึ้น จังหวะช้าลง ผ่อนมือตามไป' },
    { name: 'คริสตัลเติมน้ำ', f0: 2.0, slide: { by: -0.7, every: 24 }, Q: 12, hold: 8, stem: 0.52, width: 0.2, hint: 'น้ำขึ้น จังหวะช้าลง ผ่อนมือตามไป' },
  ];

  function create(level) {
    var over = level.over || 1, w = TAU * level.f0 * over, g = w / (2 * level.Q), G = level.G || 1.5;
    return {
      f0: level.f0, Q: level.Q, G: G, hold: level.hold, w: w, g: g, over: over,
      fs: [level.f0].concat(level.next || []), m: 0, slide: level.slide || null, start: null,
      k: G * w * (1 - Math.exp(-g / (2 * level.f0))),   // มือเตะ 2 ครั้งต่อรอบ แล้ว A นิ่งที่ G
      re: 0, im: 0, t: 0, dwell: 0, broke: null,
    };
  }

  // เวลานับจากเตะแรกของด่านที่เป้าเลื่อน (ด่านอื่น = 0)
  function slideAge(o, t) { return o.slide && o.start !== null ? t - o.start : 0; }

  // ความถี่ที่มือต้องเล่น ณ เวลา t · เลื่อนแบบโคไซน์ เริ่มช้าๆ ให้จับจังหวะได้ก่อน
  function hand(o, t) {
    var u = slideAge(o, t);
    return u > 0 ? o.f0 + o.slide.by / 2 * (1 - Math.cos(TAU * u / o.slide.every)) : o.fs[o.m];
  }

  // จำนวนรอบของมือสะสมถึงเวลา t (ปริพันธ์ของ hand จึงไม่ขึ้นกับเฟรม)
  function turns(o, t) {
    var u = slideAge(o, t), x = o.fs[o.m] * t;
    return u > 0 ? x + o.slide.by / 2 * (u - o.slide.every / TAU * Math.sin(TAU * u / o.slide.every)) : x;
  }

  // A ≥ 1 ต่อไปอีกกี่วินาที (ไม่เกินถึง t) · Q คงที่ การหน่วงจึงขึ้นกับเฟสที่เดินไป
  function aboveFor(o, t, a0) {
    var lim = 2 * o.Q * Math.log(a0), from = turns(o, o.t), per = TAU * o.over, lo = o.t, hi = t;
    if (per * (turns(o, t) - from) <= lim) return t - o.t;
    for (var i = 0; i < 50; i++) {
      var mid = (lo + hi) / 2;
      if (per * (turns(o, mid) - from) < lim) lo = mid; else hi = mid;
    }
    return lo - o.t;
  }

  // เดินเวลาไปถึง t: หมุน + หน่วง + สะสมเวลาที่ A ≥ 1 · ร้าวครบส่วนของโหมดนี้แล้วเปลี่ยนโหมด (เริ่มสั่นเบาๆ ให้ได้ยินจังหวะใหม่)
  function advance(o, t) {
    if (t <= o.t || o.broke !== null) return o;
    var a0 = Math.hypot(o.re, o.im);
    if (a0 >= 1) {
      var span = aboveFor(o, t, a0), mark = o.hold * (o.m + 1) / o.fs.length, need = mark - o.dwell;
      if (span >= need && o.m < o.fs.length - 1) {
        o.t += need; o.dwell = mark; o.m++; o.re = 0; o.im = TAP_A;
        return advance(o, t);
      }
      if (span >= need) { o.broke = o.t + need; o.dwell = o.hold; }
      else o.dwell += span;
    }
    var phi = TAU * o.over * (turns(o, t) - turns(o, o.t));
    var d = Math.exp(-phi / (2 * o.Q)), c = Math.cos(phi), n = Math.sin(phi), re = o.re, im = o.im;
    o.re = d * (re * c - im * n);
    o.im = d * (re * n + im * c);
    o.t = t;
    return o;
  }

  // ค่า ณ เวลา t โดยไม่เปลี่ยนสถานะ (ใช้วาดจอ · ทำให้เตะย้อนเวลาได้)
  function peek(o, t) {
    var c = advance(Object.assign({}, o), t);
    return { A: Math.hypot(c.re, c.im), x: c.re, dwell: c.dwell, broke: c.broke, f: hand(c, t), m: c.m };
  }

  // dir = ±1 · strength 0..1 · คืน A ที่เปลี่ยนไปจากการเตะครั้งนี้ (ติดลบ = เตะผิดเฟส)
  function kick(o, t, dir, strength) {
    advance(o, t);
    if (o.broke !== null) return 0;
    if (o.start === null) o.start = t;
    // ด่านเล่นช้า: ขาที่สั้นกว่าครึ่งของขาเป้า = มือเร็วเกินไป ไม่ส่งแรง (ไม่ให้เล่นเร็วตามวัตถุแล้วแตก · เจ้าของสั่ง 9 พ.ย.)
    var last = o.lastKick;
    o.lastKick = t;
    if (o.over > 1 && last !== undefined && t - last < 1 / (4 * hand(o, t))) return 0;
    var before = Math.hypot(o.re, o.im);
    o.im += dir * strength * o.k / o.w;
    return Math.hypot(o.re, o.im) - before;
  }

  // ด่านเล่นช้า: ขานี้ยาวต่างจากขาเป้าเกิน 20% = แรงของขานี้ผิดเฟส หักล้างการสั่น (ผลเมาส์เจ้าของ 10 พ.ย.)
  function uneven(o, t, leg) {
    var L = 1 / (2 * hand(o, t));
    return o.over > 1 && Math.abs(leg - L) > 0.2 * L;
  }

  // บันทึกการเตะไว้ให้ summarize
  function record(o, t) { return { t: t, A: Math.hypot(o.re, o.im), f: hand(o, t), m: o.m }; }

  // เคาะ: ปลุกให้สั่นพอเห็นจังหวะ ไม่เพิ่มแรงถ้าสั่นแรงกว่านั้นอยู่แล้ว
  function tap(o, t) {
    advance(o, t);
    var a = Math.hypot(o.re, o.im);
    if (a >= TAP_A) return;
    if (a === 0) { o.im = TAP_A; return; }
    o.re *= TAP_A / a; o.im *= TAP_A / a;
  }

  // ความถี่ที่คลาดได้แล้วยังถึงเกณฑ์แตก (Hz) · f = เป้าขณะนั้น ถ้าไม่ใช่ f0
  function tolerance(level, f) {
    var G = level.G || 1.5;
    return (f || level.f0) / (2 * level.Q) * Math.sqrt(G * G - 1);
  }

  // เวลาเร็วสุด = เตะตรงเป๊ะเต็มแรงตั้งแต่ครั้งแรกจนแตก (นับจากเตะแรก)
  function bestTime(level) {
    var o = create(level), t = 0, dir = 1;
    while (o.broke === null && t < 600) {
      kick(o, t, dir, 1); dir = -dir;
      t += 1 / (2 * hand(o, t + 1 / (4 * hand(o, t))));   // ใช้เป้ากลางช่วง มือจะไม่หลุดเฟสตอนเป้าเลื่อน
      advance(o, t);
    }
    return o.broke;
  }

  // ตัวหาจุดกลับทิศจากมุมสะสม (เรเดียน) · ใช้กับนิ้ว เมาส์ หรือจาน MIDI ได้เหมือนกัน
  // feed คืน { t, dir, speed } เมื่อยืนยันการกลับทิศ: t = เวลาที่จุดสุดขอบจริง · dir = ทิศใหม่ · speed = ความเร็วสูงสุดของขาที่เพิ่งจบ
  function tracker() {
    var s = { dir: 0, ext: 0, extT: 0, last: null, lastT: 0, vs: 0, peak: 0 };
    return {
      reset: function () { s.dir = 0; s.last = null; s.vs = 0; s.peak = 0; },
      speed: function () { return Math.abs(s.vs); },
      feed: function (a, t) {
        if (s.last === null) { s.last = a; s.lastT = t; s.ext = a; s.extT = t; return null; }
        var dt = t - s.lastT;
        if (dt > 0) {
          s.vs = 0.6 * s.vs + 0.4 * (a - s.last) / dt;
          s.peak = Math.max(s.peak, Math.abs(s.vs));
        }
        s.last = a; s.lastT = t;
        if (s.dir === 0) {
          if (Math.abs(a - s.ext) >= HYST) { s.dir = a > s.ext ? 1 : -1; s.ext = a; s.extT = t; }
          return null;
        }
        if ((a - s.ext) * s.dir > 0) { s.ext = a; s.extT = t; return null; }
        if (Math.abs(a - s.ext) < HYST) return null;
        var ev = { t: s.extT, dir: -s.dir, speed: s.peak };
        s.dir = -s.dir; s.ext = a; s.extT = t; s.peak = Math.abs(s.vs);
        return ev;
      },
    };
  }

  function strengthOf(speed) { return Math.min(1, speed / V_FULL); }

  // จาน MIDI ส่งค่าสัมพัทธ์ทาง CC · เครื่องแต่ละรุ่นเลขต่างกัน จึงเรียนรู้จากการหมุนจริง ไม่ผูกเลขรุ่นใด
  function jogDelta(v, kind) { return kind === 'twos' ? (v < 64 ? v : v - 128) : v - 64; }

  // จัดแบบค่าของ CC กลุ่มหนึ่ง: ต้องแกว่งอยู่รอบจุดศูนย์และมีครบสองทิศ (ปุ่มหมุน/เฟดเดอร์กวาดเลยช่วงนี้ · หมุนทิศเดียวยังบอกไม่ได้ว่าเป็นจาน)
  function jogKind(values) {
    var kinds = ['center', 'twos'], moved, i;
    for (i = 0; i < kinds.length; i++) {
      moved = values.map(function (v) { return jogDelta(v, kinds[i]); }).filter(function (d) { return d !== 0; });
      if (moved.length && moved.every(function (d) { return Math.abs(d) <= JOG_MAX; }) &&
        moved.some(function (d) { return d > 0; }) && moved.some(function (d) { return d < 0; })) return kinds[i];
    }
    return null;
  }

  // msgs = [[status, data1, data2]] ตอนผู้เล่นสแครช · เลือกกลุ่มที่ส่งมามากสุด + CC อื่นบนช่องเดียวกัน (บางเครื่องแยก CC หน้าจานกับข้างจาน)
  function learnJog(msgs) {
    var groups = {};
    msgs.forEach(function (m) {
      if ((m[0] & 0xF0) !== 0xB0) return;
      var key = m[0] + ':' + m[1];
      (groups[key] = groups[key] || { status: m[0], cc: m[1], values: [] }).values.push(m[2]);
    });
    var usable = Object.keys(groups).map(function (k) { return groups[k]; }).filter(function (g) {
      g.kind = g.values.length >= JOG_MIN ? jogKind(g.values) : null;
      return g.kind !== null;
    }).sort(function (a, b) { return b.values.length - a.values.length; });
    if (!usable.length) return null;
    var top = usable[0];
    return { status: top.status, kind: top.kind,
      ccs: usable.filter(function (g) { return g.status === top.status && g.kind === top.kind; }).map(function (g) { return g.cc; }) };
  }

  // ข้อความนี้หมุนจานกี่ขีด (ไม่ใช่จานที่เรียนรู้ไว้ = 0)
  function jogTicks(jog, m) {
    return m[0] === jog.status && jog.ccs.indexOf(m[1]) >= 0 ? jogDelta(m[2], jog.kind) : 0;
  }

  function cv(a) {
    if (a.length < 2) return null;
    var m = a.reduce(function (x, y) { return x + y; }, 0) / a.length;
    var v = a.reduce(function (x, y) { return x + (y - m) * (y - m); }, 0) / a.length;
    return Math.sqrt(v) / m;
  }

  // ช่วงเล่นต่อเนื่องล่าสุดที่วัดจังหวะได้ (อย่างน้อย 3 ครั้ง)
  function lastStreak(kicks) {
    var end = kicks.length;
    for (var i = kicks.length - 1; i >= 0; i--) {
      if (i > 0 && kicks[i].t - kicks[i - 1].t <= GAP) continue;
      if (end - i >= 3) return kicks.slice(i, end);
      end = i;
    }
    return [];
  }

  // ส่วนที่แก้วร้าว: เฉพาะช่วงที่แรงอยู่เหนือเกณฑ์ติดกัน (ร้าวแล้วหลุดจังหวะ ช่วงที่หลุดไม่นับ) · ยังไม่ถึงหรือสั้นเกินวัด ใช้ทั้งช่วง
  function crackParts(streak) {
    var parts = [], cur = [], count = 0;
    streak.forEach(function (k) {
      if (k.A >= 1) { cur.push(k); return; }
      if (cur.length >= 2) { parts.push(cur); count += cur.length - 1; }
      cur = [];
    });
    if (cur.length >= 2) { parts.push(cur); count += cur.length - 1; }
    return count >= 2 ? parts : [streak];
  }

  // kicks = [{ t, A, f, m }] เฉพาะครั้งที่ส่งแรงเข้าวัตถุ (A = แอมพลิจูดหลังเตะ · f = เป้าขณะนั้น · m = โหมด) ไม่มี f ถือว่าเป้าคือ f0
  // seconds นับทั้งรอบ · ค่าอื่นวัดจากช่วงที่แก้วร้าวแยกทีละโหมด ไม่ให้ช่วงพักและช่วงหาจังหวะมาปน
  // hz เป็นค่าเฉลี่ยตลอดส่วนนั้น เพราะเฟสสะสมตามเวลาทั้งหมด · target = เป้าเฉลี่ย · ความคลาดและความสม่ำเสมอคิดเทียบเป้า มือที่ตามเป้าที่เลื่อนจึงไม่เสียคะแนน
  function summarize(kicks, level, tBreak) {
    var byMode = {}, cycles = [], held = [], off = 0, hzSum = 0, fSum = 0, n = 0;
    var aim = function (k) { return k.f || level.f0; };
    kicks.forEach(function (k) { (byMode[k.m || 0] = byMode[k.m || 0] || []).push(k); });
    Object.keys(byMode).forEach(function (m) {
      var streak = lastStreak(byMode[m]);
      if (!streak.length) return;
      var f = 0, time = 0, count = 0;
      crackParts(streak).forEach(function (part) {
        var i;
        for (i = 1; i < part.length; i++) {
          var dt = part[i].t - part[i - 1].t;
          f += (aim(part[i]) + aim(part[i - 1])) / 2 * dt; time += dt; count++;
        }
        for (i = 2; i < part.length; i++) cycles.push((part[i].t - part[i - 2].t) * aim(part[i - 1]));
        part.forEach(function (k) { if (k.A >= 1) held.push(k.A); });
      });
      var hz = count / 2 / time;
      f /= time;   // เป้าเฉลี่ยตามเวลา เทียบกับ hz ได้ตรงๆ
      off += Math.abs(hz - f) / f; hzSum += hz; fSum += f; n++;
    });
    return {
      seconds: kicks.length && tBreak !== null ? tBreak - kicks[0].t : null,
      best: bestTime(level),
      hz: n ? hzSum / n : null,
      target: n ? fSum / n : null,
      errHz: n ? off / n * (fSum / n) : null,
      evenness: cv(cycles),     // ความไม่สม่ำเสมอของจังหวะมือ
      ripple: cv(held),         // ความไม่นิ่งของแรงสั่นช่วงประคอง
    };
  }

  function closeness(x, worst) { return x === null ? 0 : Math.max(0, 1 - x / worst); }

  // คะแนนรอบที่แตกแล้ว: จังหวะ 50 · เวลา 25 · ความสม่ำเสมอของมือ 25
  // ไม่ใช้ ripple เพราะมือจำลองที่เล่นตรงเป๊ะได้ ripple สูงกว่ามือที่เล่นหลวม (แรงกำลังขึ้นตลอดช่วงร้าว)
  var FULL = { tempo: 50, time: 25, even: 25 };
  function parts(s, level) {
    return { tempo: 50 * closeness(s.errHz, tolerance(level, s.target)),
      time: 25 * (s.seconds === null ? 0 : Math.min(1, s.best / s.seconds)),
      even: 25 * closeness(s.evenness, EVEN_WORST) };
  }
  function score(s, level) {
    var p = parts(s, level), points = Math.round(p.tempo + p.time + p.even);
    return { points: points, stars: points >= 85 ? 3 : points >= 60 ? 2 : 1 };
  }
  // ประโยคเดียวหลังแตก: บอกส่วนที่เสียคะแนนมากสุด · เสียไม่ถึง 5 ทุกส่วน = เล่นดีแล้ว
  // ทิศทางดูจาก hz เทียบเป้า · หลายโหมดที่เร็วโหมดหนึ่งช้าอีกโหมดจะหักล้างกัน จึงบอกแค่ว่าคลาด
  function advice(s, level) {
    var p = parts(s, level), worst = 'tempo';
    ['time', 'even'].forEach(function (k) { if (FULL[k] - p[k] > FULL[worst] - p[worst]) worst = k; });
    if (FULL[worst] - p[worst] < 5) return { kind: 'clean' };
    if (worst !== 'tempo') return { kind: worst };
    var d = s.hz - s.target, n = Math.round(s.errHz * 60);
    if (!(Math.abs(d) >= s.errHz * 0.5)) return { kind: 'off', bpm: n };
    return { kind: d > 0 ? 'fast' : 'slow', bpm: n };
  }

  return { LEVELS: LEVELS, create: create, advance: advance, peek: peek, kick: kick, uneven: uneven, record: record, tap: tap, tolerance: tolerance,
    bestTime: bestTime, tracker: tracker, strengthOf: strengthOf, jogDelta: jogDelta, learnJog: learnJog, jogTicks: jogTicks, summarize: summarize, score: score, advice: advice };
});
