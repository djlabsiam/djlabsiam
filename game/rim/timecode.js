/* RIM: รับจานที่ใช้แผ่น timecode ผ่านช่องเสียงของมิกเซอร์ (เจ้าของสั่ง 18 พ.ย. "ใช่ จานซ้าย" · ทดลองในเครื่อง ยังไม่ขึ้นเว็บ)
   ที่มา: หน้าทดสอบ tc-test.html (Mac + DJM-S9 ผ่าน: จานซ้าย ช่อง 1+2 · ไม่หลุดตอนหมุนเร็ว · Chrome ให้แค่ 2 ช่องแรกของอุปกรณ์ → จานขวาใช้ไม่ได้)
   ไม่มีค่าของ timecode ยี่ห้อใดฝังไว้: ทิศเรียนจากการหมุนจริงตอนต่อเครื่อง · PER_REV วัดจากแผ่นของเราเอง (18 พ.ย. นับมือ 2 ครั้ง = 1811 ลูก/รอบ)
   วิธีถอด (เขียนเอง): กรองไฟตรง → ปรับระดับแต่ละช่องด้วยเปลือกสัญญาณ → มุม atan2(B, A) → มุมที่เปลี่ยน = จำนวนลูก (+/− ตามทิศ)
   ใช้: RimTC.list() → รายชื่ออุปกรณ์ · RimTC.open(ctx, { label, pair, onMove(cycles, ms) }) → { stop } */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RimTC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var PER_REV = 1811;          // ลูกต่อ 1 รอบจาน (วัดจากแผ่นเอง)
  var POST_EVERY = 128;        // ส่งผลทุก 128 sample (~2.7 ms ที่ 48 kHz = ทุกก้อนของ AudioWorklet) · หน้าทดสอบใช้ 960

  // ตัวถอด (ตัวเดียวกับ tc-test.html) · ใช้ทั้งใน AudioWorklet และตัวสำรอง ScriptProcessor
  class Core {
    constructor(sr, post, every) { this.sr = sr; this.post = post; this.every = every || 960; this.a = 0; this.b = 1; this.dc = []; this.env = [0, 0]; this.ph = null; this.acc = 0; this.win = 0; this.n = 0; this.sq = []; this.pk = []; this.on = false; this.drops = 0; this.fastDrops = 0; this.rate = 0; this.xy = []; }
    cfg(m) { if (m.pair) { this.a = m.pair[0]; this.b = m.pair[1]; this.ph = null; } if (m.zero) this.acc = 0; }
    block(ch) {
      const C = ch.length, N = ch[0].length;
      if (this.sq.length !== C) { this.sq = new Array(C).fill(0); this.pk = new Array(C).fill(0); this.dc = Array.from({ length: C }, () => [0, 0]); }
      for (let c = 0; c < C; c++) { const d = ch[c]; let s = 0, p = this.pk[c]; for (let i = 0; i < N; i++) { const v = d[i]; s += v * v; if (Math.abs(v) > p) p = Math.abs(v); } this.sq[c] += s; this.pk[c] = p; }
      const A = ch[this.a], B = ch[this.b];
      if (A && B) {
        const da = this.dc[this.a], db = this.dc[this.b];
        for (let i = 0; i < N; i++) {
          const x = A[i] - da[0] + 0.995 * da[1]; da[0] = A[i]; da[1] = x;   // กรองไฟตรง (~38 Hz ที่ 48 kHz)
          const y = B[i] - db[0] + 0.995 * db[1]; db[0] = B[i]; db[1] = y;
          this.env[0] = Math.max(Math.abs(x), this.env[0] * 0.9995); this.env[1] = Math.max(Math.abs(y), this.env[1] * 0.9995);
          const on = this.env[0] > 0.003 && this.env[1] > 0.003;   // ประตูสัญญาณ ~ −50 dBFS (เข็มยก/ไม่มีสัญญาณ = ปิด)
          if (on) {
            const p = Math.atan2(y / this.env[1], x / this.env[0]);
            if (this.ph !== null) { let d = p - this.ph; if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI; this.acc += d; this.win += d; this.rate = 0.99 * this.rate + 0.01 * d; }
            this.ph = p; if (i % 16 === 0 && this.xy.length < 240) this.xy.push(x / this.env[0], y / this.env[1]);
          } else {   // หลุดตอนหมุนเร็ว (> 300 ลูก/วิ) = ปัญหาจริง · หลุดตอนกลับทิศ/หยุดมือ (ผ่านศูนย์) เป็นเรื่องปกติของการสแครช
            if (this.on) { this.drops++; if (Math.abs(this.rate) * this.sr / (2 * Math.PI) > 300) this.fastDrops++; }
            this.ph = null; this.rate = 0;
          }
          this.on = on;
        }
      }
      this.n += N;
      if (this.n >= this.every) {
        this.post({ C: C, rms: this.sq.map((s) => Math.sqrt(s / this.n)), peak: this.pk.slice(), cyc: this.acc / (2 * Math.PI), win: this.win / (2 * Math.PI), dt: this.n / this.sr, on: this.on, drops: this.drops, fastDrops: this.fastDrops, xy: this.xy });
        this.sq.fill(0); this.pk.fill(0); this.n = 0; this.win = 0; this.xy = [];
      }
    }
  }
  var WORKLET = Core.toString() + '\nclass RimTC extends AudioWorkletProcessor {\n  constructor(o) { super(); this.c = new Core(sampleRate, (m) => this.port.postMessage(m), o.processorOptions.every); this.port.onmessage = (e) => this.c.cfg(e.data); }\n' +
    '  process(inputs) { const ch = inputs[0]; if (ch && ch.length) this.c.block(ch); return true; }\n}\nregisterProcessor("rim-tc", RimTC);';

  // รายชื่ออุปกรณ์เสียงขาเข้า (ขอสิทธิ์ก่อน แล้วอ่านรายการขณะสิทธิ์ยังเปิด — ไม่งั้นบางครั้งได้รายการไม่มีชื่อ)
  function list() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error('no_media'));
    return navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
      var done = function () { s.getTracks().forEach(function (t) { t.stop(); }); };
      return navigator.mediaDevices.enumerateDevices().then(function (l) { done(); return l.filter(function (d) { return d.kind === 'audioinput'; }); }, function (e) { done(); throw e; });
    });
  }
  // เปิดช่องเสียงตามชื่อ (deviceId เปลี่ยนได้ระหว่างครั้ง) · ไม่เจอ/ล้ม = ลองแบบไม่บังคับ id · ข้อกำหนดอื่นเป็น ideal ทั้งหมด
  function stream(label) {
    var c = function (id, exact) {
      return navigator.mediaDevices.getUserMedia({ audio: { deviceId: id ? (exact ? { exact: id } : { ideal: id }) : undefined, channelCount: { ideal: 8 }, sampleRate: { ideal: 48000 },
        latency: { ideal: 0 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    };
    return list().then(function (l) {
      var d = l.filter(function (x) { return x.label === label; })[0];
      return c(d && d.deviceId, true).catch(function (e) { if (e.name === 'OverconstrainedError') return c(d && d.deviceId, false); throw e; });
    });
  }
  // เปิดรับจาน: onMove(ลูกที่เปลี่ยน มีเครื่องหมาย, เวลา performance.now) ทุก ~5 ms · onLevel(ข้อมูลดิบ) ไว้แสดงระดับตอนต่อเครื่อง
  function open(ctx, o) {
    var st = null, src = null, node = null, sp = null, mute = ctx.createGain(), closed = false;
    mute.gain.value = 0; mute.connect(ctx.destination);   // ต่อถึงลำโพง (เงียบ) ไม่งั้นบางเบราว์เซอร์ไม่ประมวลผล
    var onData = function (d) { if (closed) return; if (d.win) o.onMove(d.win, performance.now()); if (o.onLevel) o.onLevel(d); };
    var graph = ctx.audioWorklet ? ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }))).then(function () {
      node = new AudioWorkletNode(ctx, 'rim-tc', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCountMode: 'max', channelInterpretation: 'discrete', processorOptions: { every: POST_EVERY } });
      node.port.onmessage = function (e) { onData(e.data); }; node.port.postMessage({ pair: o.pair }); node.connect(mute);
      return 'worklet';
    }, function () { return 'script'; }) : Promise.resolve('script');   // เปิดไฟล์ตรง (file://) บางเครื่องโหลด worklet จาก blob ไม่ได้
    return Promise.all([graph, o.source ? Promise.resolve(null) : stream(o.label)]).then(function (r) {
      st = r[1]; if (closed) { if (st) st.getTracks().forEach(function (t) { t.stop(); }); return null; }
      src = o.source || ctx.createMediaStreamSource(st);   // o.source = แหล่งเสียงทดสอบ (ไม่ใช้ในเกมจริง)
      var C = st ? (st.getAudioTracks()[0].getSettings().channelCount || 2) : 2;
      if (r[0] === 'worklet') src.connect(node);
      else {
        var core = new Core(ctx.sampleRate, onData, POST_EVERY);
        core.cfg({ pair: o.pair });
        sp = ctx.createScriptProcessor(1024, C, 1); sp.channelInterpretation = 'discrete';
        sp.onaudioprocess = function (e) { var ch = []; for (var i = 0; i < C; i++) ch.push(e.inputBuffer.getChannelData(i)); core.block(ch); };
        src.connect(sp); sp.connect(mute);
      }
      return { mode: r[0], label: st ? st.getAudioTracks()[0].label : 'test', channels: C,
        stop: function () { closed = true; if (sp) { sp.onaudioprocess = null; sp.disconnect(); } if (node) node.disconnect(); if (src) src.disconnect(); mute.disconnect(); if (st) st.getTracks().forEach(function (t) { t.stop(); }); } };
    });
  }
  // ลูก → องศา (ตั้งค่า "ต่อ 1 เลน" ของจาน timecode เป็นองศา)
  function degrees(cycles) { return cycles / PER_REV * 360; }
  return { list: list, open: open, degrees: degrees, Core: Core, PER_REV: PER_REV };
});
