/* Rim: Tutorial (เจ้าของสั่ง 19 พ.ย.) — เพลงสังเคราะห์ในเบราว์เซอร์ (ไม่มีไฟล์เพลง · ไม่โหลด/อัปโหลดอะไร) + แผนที่โน้ตที่วางเอง + จุดหยุดสอน
   หน้าเกมหยุดภาพที่จุดหยุดแต่ละจุด ขึ้นกล่องคำอธิบาย ผู้เล่นกดพร้อม → นับถอยหลัง 3 จังหวะ → เล่นต่อ
   บทเรียนตอนนี้ = พื้นฐาน (ย้ายเลน · คลิก · ท่อ · ซิกแซก) · FX Zone / Fever รอกติกาใหม่ (ก้อน B) แล้วค่อยเพิ่ม */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RimTutorial = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var BPM = 100, B = 60 / BPM, END = 126;   // จังหวะละ 0.6 วิ · เพลงยาว END จังหวะ (~76 วิ)

  // โน้ต: เวลาเป็นจังหวะ · len เป็นจังหวะ · path = [[จังหวะ, เลน], ...]
  var N = [];
  function click(b, lane) { N.push({ t: b * B, lane: lane, len: 0 }); }
  function hold(b, lane, len) { N.push({ t: b * B, lane: lane, len: len * B }); }
  function zig(b, pts, len) { N.push({ t: b * B, lane: pts[0][1], len: len * B, path: pts.map(function (p) { return [(b + p[0]) * B, p[1]]; }) }); }
  [[8, 1], [12, 1], [16, 2], [20, 2], [24, 0], [26, 1], [28, 2], [30, 3]].forEach(function (x) { click(x[0], x[1]); });   // 1 ย้ายเลน + คลิก (ช้า)
  [0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1].forEach(function (l, i) { click(36 + i, l); });                                     // 2 ทุกจังหวะ
  [[56, 1], [60, 2], [64, 0], [68, 3]].forEach(function (x) { hold(x[0], x[1], 2); });                                     // 3 ท่อ 2 จังหวะ
  zig(78, [[0, 0], [1, 1], [2, 2], [3, 1]], 3); zig(86, [[0, 3], [1, 2], [2, 1], [3, 2]], 3);                              // 4 ซิกแซก
  [[96, 1], [97, 2], [98, 1], [100, 0, 2], [104, 3], [105, 2], [106, 3], [108, 1, 2], [112, 2], [113, 2], [114, 1], [115, 0], [116, 3, 3]]   // 5 รวม
    .forEach(function (x) { if (x[2]) hold(x[0], x[1], x[2]); else click(x[0], x[1]); });

  // จุดหยุด: 2 จังหวะก่อนโน้ตแรกของแต่ละช่วง (โน้ตที่กำลังมาค้างให้เห็นบนถนน) · ห้ามอยู่กลางท่อ
  var STOPS = [
    { b: 0, title: 'ยินดีต้อนรับสู่ RIM', text: 'รับโน้ตตอนแตะขอบแผ่นเสียง · ย้ายเลน: หมุนจาน (เมาส์ / ← →) · คลิก: crossfader (Space)' },
    { b: 34, title: 'คลิกตามจังหวะ', text: 'โน้ตมาทุกจังหวะ · คลิกให้ตรงตอนแตะขอบ' },
    { b: 54, title: 'ท่อ = เปิดค้าง', text: 'เปิด crossfader (ค้าง Space) ตั้งแต่หัวท่อจนสุดท่อ' },
    { b: 76, title: 'ซิกแซก = ค้าง + หมุน', text: 'ค้างเฟดเดอร์ไว้ แล้วหมุนจานให้ตัวรับวิ่งตามเส้น' },
    { b: 94, title: 'รวมทุกแบบ', text: 'เล่นต่อเนื่องจนจบ' },
  ];

  // ── เพลง: 100 BPM · กลองเตะทุกจังหวะ · สแนร์จังหวะ 2/4 · ไฮแฮตจังหวะยก · เบส Am–F–C–G ทีละห้อง ──
  function song(ctx) {
    var sr = ctx.sampleRate, n = Math.ceil(END * B * sr), L = new Float32Array(n), R = new Float32Array(n);
    var rnd = 1; function noise() { rnd = (rnd * 16807) % 2147483647; return rnd / 1073741823.5 - 1; }   // สุ่มแบบกำหนดได้ (เพลงเหมือนเดิมทุกครั้ง)
    function add(at, dur, fn, pan) {
      var s0 = Math.round(at * sr), m = Math.min(n - s0, Math.round(dur * sr)), gl = 1 - Math.max(0, pan || 0), gr = 1 + Math.min(0, pan || 0);
      for (var i = 0; i < m; i++) { var v = fn(i / sr); L[s0 + i] += v * gl; R[s0 + i] += v * gr; }
    }
    var ROOT = [55, 43.65, 65.41, 49];   // A1 F1 C2 G1
    for (var b = 0; b < END - 2; b++) {
      var t = b * B;
      add(t, 0.3, function (x) { var ph = 2 * Math.PI * (45 * x + 75 * (1 - Math.exp(-x * 30)) / 30); return Math.sin(ph) * Math.exp(-x * 9) * 0.8; });   // เตะ
      if (b % 2) add(t, 0.18, function (x) { return (noise() * 0.55 + Math.sin(2 * Math.PI * 190 * x) * 0.3) * Math.exp(-x * 22) * 0.55; });           // สแนร์
      add(t + B / 2, 0.05, function (x) { return noise() * Math.exp(-x * 90) * 0.18; }, b % 2 ? 0.3 : -0.3);                                              // ไฮแฮต
      var f = ROOT[Math.floor(b / 4) % 4];
      [0, B / 2].forEach(function (o) {
        add(t + o, B / 2 * 0.9, function (x) { var p = (f * x) % 1; return (p * 2 - 1) * 0.22 * Math.min(1, x * 200) * Math.exp(-x * 3); });           // เบส (ฟันเลื่อย)
      });
    }
    var buf = ctx.createBuffer(2, n, sr), peak = 0;
    for (var i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    var k = peak > 0.9 ? 0.9 / peak : 1;
    for (i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
    buf.copyToChannel(L, 0); buf.copyToChannel(R, 1);
    return buf;
  }

  function make(ctx) {
    return { buf: song(ctx), bpm: BPM, beatLen: B, len: END * B,
      notes: N.map(function (x) { return Object.assign({}, x); }),
      stops: STOPS.map(function (s) { return { t: s.b * B, title: s.title, text: s.text }; }) };
  }
  return { make: make, BPM: BPM, notes: N, stops: STOPS, END: END };
});
