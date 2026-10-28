/* Signal Flow: ตัวตรวจกติกา (ฟังก์ชันล้วน ไม่แตะ DOM)
   ใช้ซ้ำได้ทั้งตอนเล่นในหน้าเว็บ ตัวแก้ปริศนา และการตรวจฝั่งเซิร์ฟเวอร์ภายหลัง
   state = { plugs: { cableId: [jackId|null, jackId|null] }, adapt: { cableId: { end, id, type } } }
   (index 0/1 = ปลายสายด้านที่ 1/2 ตาม cable.ends · adapt มีเฉพาะด่านที่มีอะแดปเตอร์) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFRules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var EPS = 1e-9;

  function byId(arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  }

  // ตำแหน่งช่องต่อในพิกัดโลก: ใช้ j.pos ถ้าด่านระบุไว้ตรงๆ (ด่านโมเดล 3D) ไม่งั้นคำนวณจากแผงหลังของอุปกรณ์ (ด่าน SVG)
  function jackWorld(level, j) {
    if (j.pos) return { x: j.pos[0], y: j.pos[1], z: j.pos[2] };
    var d = level.devices[j.dev];
    return { x: d.x + d.wx, y: d.y + d.wy - j.lx, z: d.h - j.jz };
  }

  // ระยะเส้นตรงระหว่างสองช่อง (เมตร)
  function dist(level, a, b) {
    var p = jackWorld(level, a), q = jackWorld(level, b);
    return Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2) + Math.pow(p.z - q.z, 2)) / level.unitsPerM;
  }

  // ความยาวสายขั้นต่ำที่เสียบถึงได้ (เผื่อสายไม่ตึงเป็นเส้นตรง)
  function reach(level, a, b) {
    return dist(level, a, b) * level.slack;
  }

  function plugsOf(state, cableId) {
    return state.plugs[cableId] || [null, null];
  }

  function copyPlugs(state) {
    var out = {};
    for (var k in state.plugs) out[k] = state.plugs[k].slice();
    return out;
  }

  // สถานะใหม่จาก plugs ชุดใหม่ โดยพกอะแดปเตอร์ที่ขันไว้ไปด้วย
  function next(state, plugs) {
    return state.adapt ? { plugs: plugs, adapt: state.adapt } : { plugs: plugs };
  }

  // ช่องรับหัวชนิดนี้ได้ไหม (ช่องคอมโบ เช่น XLR/TRS ระบุ accepts)
  function accepts(jack, type) { return (jack.accepts || [jack.type]).indexOf(type) >= 0; }

  // ชนิดหัวของปลายสาย e: ถ้าขันอะแดปเตอร์ไว้ที่ปลายนั้น = หัวของอะแดปเตอร์
  function endType(state, cab, e) {
    var a = state.adapt && state.adapt[cab.id];
    return a && a.end === e ? a.type : cab.ends[e];
  }

  // ปลายที่ต่อตายไว้ (cable.fixed) ต้องเสียบอยู่เสมอ — เรียกหลังถอดสาย / เริ่มด่าน
  function withFixed(level, state) {
    var plugs = copyPlugs(state);
    level.cables.forEach(function (cab) {
      if (!cab.fixed) return;
      var p = (plugs[cab.id] || [null, null]).slice();
      for (var e = 0; e < 2; e++) if (cab.fixed[e]) p[e] = cab.fixed[e];
      plugs[cab.id] = p;
    });
    return next(state, plugs);
  }

  // ขันอะแดปเตอร์เข้าปลายสายที่เป็นหัว ad.from และยังไม่ได้เสียบ
  function attachAdapter(level, state, adId, cableId) {
    var ad = byId(level.adapters, adId), cab = byId(level.cables, cableId), p = plugsOf(state, cableId);
    if (state.adapt && state.adapt[cableId]) return { ok: false, code: 'has-adapter' };
    var match = [0, 1].filter(function (e) { return cab.ends[e] === ad.from && !(cab.fixed && cab.fixed[e]); });
    if (!match.length) return { ok: false, code: 'type-mismatch' };
    var free = match.filter(function (e) { return !p[e]; });
    if (!free.length) return { ok: false, code: 'plugged' };
    var adapt = {};
    for (var k in state.adapt) adapt[k] = state.adapt[k];
    adapt[cableId] = { end: free[0], id: adId, type: ad.to };
    return { ok: true, state: { plugs: copyPlugs(state), adapt: adapt } };
  }

  function detachAdapter(state, cableId) {
    var a = state.adapt && state.adapt[cableId];
    if (!a) return { ok: false, code: 'no-adapter' };
    if (plugsOf(state, cableId)[a.end]) return { ok: false, code: 'plugged' };
    var adapt = {};
    for (var k in state.adapt) if (k !== cableId) adapt[k] = state.adapt[k];
    return { ok: true, state: { plugs: copyPlugs(state), adapt: adapt } };
  }

  function occupant(state, jackId) {
    for (var cid in state.plugs) {
      var p = state.plugs[cid];
      for (var e = 0; e < 2; e++) if (p[e] === jackId) return { cableId: cid, end: e };
    }
    return null;
  }

  // ใครจับจองช่องนี้อยู่ รวมช่องคู่ (jack.covers เช่น RCA คู่ที่กินช่อง L+R) — คืน {cableId,end,jack} หรือ null
  function occupantAt(level, state, jackId) {
    var me = byId(level.jacks, jackId), list = [jackId];
    level.jacks.forEach(function (j) { if (j.covers && j.covers.indexOf(jackId) >= 0) list.push(j.id); });
    (me.covers || []).forEach(function (m) { list.push(m); });
    for (var i = 0; i < list.length; i++) {
      var o = occupant(state, list[i]);
      if (o) return { cableId: o.cableId, end: o.end, jack: list[i] };
    }
    return null;
  }

  // เสียบสาย cableId เข้าช่อง jackId: คืน {ok:true,end,state} หรือ {ok:false,code,...}
  function tryPlug(level, state, cableId, jackId) {
    var cab = byId(level.cables, cableId), jack = byId(level.jacks, jackId);
    if (!jack.usable) return { ok: false, code: 'not-usable' };
    if (occupantAt(level, state, jackId)) return { ok: false, code: 'occupied' };
    var p = plugsOf(state, cableId), end = -1, anyFree = false;
    for (var e = 0; e < 2; e++) {
      if (p[e]) continue;
      anyFree = true;
      if (end < 0 && accepts(jack, endType(state, cab, e))) end = e;
    }
    if (!anyFree) return { ok: false, code: 'no-free-end' };
    if (end < 0) return { ok: false, code: 'type-mismatch' };
    var other = p[1 - end];
    if (other) {
      var oj = byId(level.jacks, other);
      if (oj.dir === jack.dir) return { ok: false, code: 'same-direction' };
      if (oj.dev === jack.dev) return { ok: false, code: 'same-device' };   // สายวนกลับเข้าเครื่องเดิม (เช่น OUT ของซับเข้า IN ของซับ)
      var need = reach(level, oj, jack);
      if (cab.len + EPS < need) return { ok: false, code: 'too-short', need: need };
    }
    var plugs = copyPlugs(state);
    var np = (plugs[cableId] || [null, null]).slice();
    np[end] = jackId;
    plugs[cableId] = np;
    return { ok: true, end: end, state: next(state, plugs) };
  }

  function unplugEnd(state, cableId, end) {
    var plugs = copyPlugs(state), p = plugs[cableId];
    if (!p) return next(state, plugs);
    p[end] = null;
    if (!p[0] && !p[1]) delete plugs[cableId];
    return next(state, plugs);
  }

  function unplugCable(state, cableId) {
    var plugs = copyPlugs(state);
    delete plugs[cableId];
    return next(state, plugs);
  }

  // สรุปผลของบอร์ดปัจจุบัน
  function evaluate(level, state) {
    var conns = [], fed = {}, quality = 0, length = 0;
    level.cables.forEach(function (cab) {
      var p = plugsOf(state, cab.id);
      if (!p[0] || !p[1]) return;
      var a = byId(level.jacks, p[0]), b = byId(level.jacks, p[1]);
      var from = a.dir === 'out' ? a : b, to = a.dir === 'out' ? b : a;
      var swapped = !!(from.ch && to.ch && from.ch !== to.ch);
      var coded = cab.color === 'white' || cab.color === 'red';
      var colorMismatch = coded && ((from.color && from.color !== cab.color) || (to.color && to.color !== cab.color));
      // alt = ต่อตามทางสำรองของด่าน (มีเสียงแต่ไม่ใช่ทางที่ถูกที่สุด เช่น RCA แทน TRS บาลานซ์) นับเป็นเหตุการณ์คุณภาพ
      // เทียบแบบ "เครื่องเดียวกัน ชนิดช่องเดียวกัน ชื่อช่องเดียวกันไม่นับ L/R ท้ายรหัส" — ต่อทางสำรองแบบซ้ายขวาสลับก็ยังนับเป็นทางสำรอง
      // (ไม่นับช่องอื่นชนิดเดียวกันบนเครื่องเดียวกัน เช่น REC OUT กับ MASTER 2 ที่เป็น RCA ทั้งคู่)
      function base(id) { return id.replace(/[LR]$/, ''); }
      function kin(a, qid) { var b = byId(level.jacks, qid); return a.dev === b.dev && a.type === b.type && base(a.id) === base(b.id); }
      var alt = level.pairs.some(function (pr) {
        return (pr.alt || []).some(function (q) { return kin(from, q.from) && kin(to, q.to); });
      });
      // wrongSrc = ช่องปลายทางนี้เป็นของคู่ที่กำหนดต้นทางไว้ (srcs) แต่ต่อมาจากช่องอื่น — มีเสียงแต่ไม่นับ (เช่น BOOTH เข้าลำโพงหลัก · ข้ามซับ)
      // หลายคู่ใช้ปลายทางชุดเดียวกันได้ (เช่น เด็คแต่ละเครื่องเลือกช่องไหนก็ได้) → ผิดเมื่อไม่มีคู่ไหนรับต้นทางนี้เลย
      var owners = level.pairs.filter(function (pr) {
        return pr.srcs && [pr].concat(pr.alt || [], pr.also || []).some(function (q) { return q.to === to.id; });
      });
      var wrongSrc = owners.length > 0 && !owners.some(function (pr) { return pr.srcs.indexOf(from.id) >= 0; });
      // trap = ช่องปลายทางที่เสียบได้และมีเสียง แต่ผิดหลัก (เช่น เครื่องเล่นแผ่นเสียงเข้า LINE เสียงเบามาก) — trap.srcs ไม่ระบุ = ต้นทางไหนก็ได้
      // ช่องเดียวมีได้หลายกับดัก (รายการ) ต่อต้นทางคนละแบบ
      var trap = ([].concat(to.trap || []).filter(function (t) { return !t.srcs || t.srcs.indexOf(from.id) >= 0; })[0] || {}).msg || '';
      conns.push({ cableId: cab.id, from: from.id, to: to.id, len: cab.len, swapped: swapped, colorMismatch: colorMismatch, alt: alt,
        wrongSrc: wrongSrc, trap: trap, adapter: !!(state.adapt && state.adapt[cab.id]), live: false });
      if (!fullyFixed(cab)) length += cab.len;   // สายที่ต่อไว้ให้แล้วทั้งเส้นไม่นับความยาว
      if (swapped) quality++;
      if (alt) quality++;
    });
    // สัญญาณไหลต่อเป็นทอด: ช่อง OUT ที่มี via (เครื่องผ่านสัญญาณ เช่น ซับ แอมป์) มีสัญญาณเมื่อช่อง via ได้สัญญาณแล้ว
    // via เป็นรายการได้ = มีสัญญาณเมื่อช่องใดช่องหนึ่งได้สัญญาณ (เช่น MASTER ของมิกเซอร์ ได้จากช่องไหนก็ได้)
    function mark(id) { fed[id] = true; (byId(level.jacks, id).covers || []).forEach(function (m) { fed[m] = true; }); }
    function viaFed(v) { return [].concat(v).some(function (id) { return fed[id]; }); }
    for (var changed = true; changed;) {
      changed = false;
      conns.forEach(function (c) {
        var fj = byId(level.jacks, c.from);
        if (c.live || (fj.via && !viaFed(fj.via))) return;
        c.live = true; changed = true; mark(c.to);
      });
    }
    var overBudget = !!(level.budget && length > level.budget + EPS);
    var crossings = level.noCross ? crossingsOf(level, conns) : [];
    // ช่อง to ได้สัญญาณจากต้นทางที่ยอมรับไหม (srcs ไม่ระบุ = ต้นทางไหนก็ได้ · ช่องคู่ covers นับช่องย่อยด้วย)
    function delivered(to, srcs) {
      return conns.some(function (c) {
        var cv = byId(level.jacks, c.to).covers || [];
        return c.live && (c.to === to || cv.indexOf(to) >= 0) && (!srcs || srcs.indexOf(c.from) >= 0);
      });
    }
    var solved = level.pairs.every(function (pr) {
      // alt = ทางสำรองที่หักคะแนน · also = อีกทางที่ถูกเท่ากัน ไม่หักคะแนน
      return [pr].concat(pr.alt || [], pr.also || []).some(function (q) { return delivered(q.to, pr.srcs); });
    }) && (level.need || []).every(function (id) { return !!fed[id]; }) && !overBudget && !crossings.length;
    return { connections: conns, fed: fed, solved: solved, quality: quality, length: length, overBudget: overBudget, crossings: crossings };
  }

  function fullyFixed(cab) { return !!(cab.fixed && cab.fixed[0] && cab.fixed[1]); }
  function fixedJacks(level) {
    var f = {};
    level.cables.forEach(function (c) { (c.fixed || []).forEach(function (j) { if (j) f[j] = true; }); });
    return f;
  }

  // คู่สายที่เส้นตรงระหว่างสองปลายตัดกัน "ตามที่ผู้เล่นเห็น" = ฉายลงระนาบที่ตั้งฉากกับทิศกล้องของด่าน
  // (กล้อง orthographic ทิศคงที่ ซูม/เลื่อนภาพไม่เปลี่ยนผล · มองจากด้านบนตรงๆ ใช้ไม่ได้เพราะช่องหลังเครื่องเรียงแถวเดียวกันเกือบหมด)
  function crossingsOf(level, conns) {
    var d = level.camDir || [0.42, 0.56, -0.72], n = Math.hypot(d[0], d[1], d[2]);
    d = [d[0] / n, d[1] / n, d[2] / n];
    var u = [d[2], 0, -d[0]], un = Math.hypot(u[0], u[2]); u = [u[0] / un, 0, u[2] / un];   // แกนขวาของจอ (แนวนอน)
    var v = [d[1] * u[2], d[2] * u[0] - d[0] * u[2], -d[1] * u[0]];                        // แกนขึ้นของจอ = d × u
    function pr(p) { return [p.x * u[0] + p.y * u[1] + p.z * u[2], p.x * v[0] + p.y * v[1] + p.z * v[2]]; }
    function seg(c) { var a = pr(jackWorld(level, byId(level.jacks, c.from))), b = pr(jackWorld(level, byId(level.jacks, c.to))); return [a[0], a[1], b[0], b[1]]; }
    function side(ax, az, bx, bz, px, pz) { return (bx - ax) * (pz - az) - (bz - az) * (px - ax); }
    var out = [];
    for (var i = 0; i < conns.length; i++) for (var k = i + 1; k < conns.length; k++) {
      var p = seg(conns[i]), q = seg(conns[k]);
      var d1 = side(p[0], p[1], p[2], p[3], q[0], q[1]), d2 = side(p[0], p[1], p[2], p[3], q[2], q[3]);
      var d3 = side(q[0], q[1], q[2], q[3], p[0], p[1]), d4 = side(q[0], q[1], q[2], q[3], p[2], p[3]);
      if (d1 * d2 < -EPS && d3 * d4 < -EPS) out.push([conns[i].cableId, conns[k].cableId]);
    }
    return out;
  }

  // คำตอบสั้นสุด: เลือกสายหนึ่งเส้นต่อหนึ่งคู่ (from→to) ไม่ซ้ำเส้น ชนิดหัวตรง ยาวพอถึง
  function solve(level) {
    var best = null;
    function fits(cab, pr) {
      var fj = byId(level.jacks, pr.from), tj = byId(level.jacks, pr.to);
      var e = cab.ends;
      var typeOk = (accepts(fj, e[0]) && accepts(tj, e[1])) || (accepts(tj, e[0]) && accepts(fj, e[1]));
      return typeOk && cab.len + EPS >= reach(level, fj, tj);
    }
    var fixed = fixedJacks(level);
    function rec(i, used, len, assign) {
      if (i === level.pairs.length) {
        if (!best || len < best.len - EPS) best = { len: len, assign: assign.slice() };
        return;
      }
      var pr = level.pairs[i];
      if (fixed[pr.from] && fixed[pr.to]) { rec(i + 1, used, len, assign); return; }   // คู่นี้ต่อไว้ให้แล้ว
      level.cables.forEach(function (cab) {
        if (used[cab.id] || fullyFixed(cab) || !fits(cab, pr)) return;
        used[cab.id] = true; assign.push(cab.id);
        rec(i + 1, used, len + cab.len, assign);
        assign.pop(); delete used[cab.id];
      });
    }
    rec(0, {}, 0, []);
    return best;
  }

  // taps = จำนวนครั้งที่แตะเสียบสาย (รวมครั้งที่ผิดกติกา)
  function score(level, ev, taps) {
    var fixed = fixedJacks(level), minTaps = 0;   // ปลายที่ต่อตายไว้ (ของคู่เป้าหมาย) ไม่ต้องแตะเสียบ
    level.pairs.forEach(function (pr) { minTaps += (fixed[pr.from] ? 0 : 1) + (fixed[pr.to] ? 0 : 1); });
    var sol = solve(level);
    var extra = Math.max(0, taps - minTaps);
    var pts = Math.max(0, Math.round(1000 - extra * 40 - ev.length * 60 - ev.quality * 150));
    var stars = 1 + (ev.quality === 0 ? 1 : 0) + ((ev.quality === 0 && ev.length <= sol.len + EPS && taps <= minTaps + 1) ? 1 : 0);
    return { score: pts, stars: stars, extra: extra, target: sol.len, minTaps: minTaps };
  }

  return {
    byId: byId, jackWorld: jackWorld, dist: dist, reach: reach, plugsOf: plugsOf,
    occupant: occupant, occupantAt: occupantAt, fullyFixed: fullyFixed, tryPlug: tryPlug, unplugEnd: unplugEnd, unplugCable: unplugCable,
    endType: endType, accepts: accepts, withFixed: withFixed, attachAdapter: attachAdapter, detachAdapter: detachAdapter,
    evaluate: evaluate, solve: solve, score: score
  };
});
