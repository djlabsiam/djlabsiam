/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 14 (สอบรวม Phase 3: เวทีเต็ม · DJM-V10 + เด็คปนสามรุ่น)
   PLX-CRSS12 (ซ้าย · ช่องหันเข้ามิกเซอร์) + DJM-V10 + CDJ-3000X + CDJ-1500X (ขวา) · ไมค์ดีเจบนขาตั้งด้านขวา · ฮับ PRO DJ LINK หลังมิกเซอร์
   สเนคบ็อกซ์ (proc · ใบแพตช์ IN + RETURN) + มัลติคอร์ไป FOH (ต่อไว้แล้ว) · มอนิเตอร์พื้นสองตัวหน้าโต๊ะ
   คำตอบ 12 เส้น: แผ่นเสียง → PHONO + GND · CDJ ×2 → LINE · ไมค์ → IN 3 · MASTER 1 → IN 7 / 8 · RETURN A / B → มอนิเตอร์ซ้าย / ขวา · LINK ×3 → ฮับ
   กับดักที่เปิด: แผ่นเสียงเข้า LINE · CDJ เข้า PHONO · ไมค์เข้า MIC ของ V10 · ช่องสเนคผิดใบแพตช์ · สลับซ้ายขวา · BOOTH เข้ามอนิเตอร์พื้น
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level14 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var T = -0.505, C3 = 0.414, C15 = 0.74, HZ = -0.42, SX = 0.42, SZ = -0.56, MX = 0.95, MZ = -0.3, MH = 0.3, WX = 0.45, WZ = 0.42, FX = -0.5, FZ = -0.56;
  var PATCH = ['ไมค์ MC', 'ไมค์ไร้สาย', 'ไมค์ DJ', 'สำรอง', 'วิดีโอ L', 'วิดีโอ R', 'DJ L', 'DJ R'], DJ = { 3: true, 7: 'L', 8: 'R' };
  var RET = { list: ['มอนิเตอร์ DJ L', 'มอนิเตอร์ DJ R', 'มอนิเตอร์ MC', 'สำรอง'], dj: { A: true, B: true } };
  var SB = ['sb1', 'sb2', 'sb3', 'sb4', 'sb5', 'sb6', 'sb7', 'sb8'], HUB = ['hub1', 'hub2', 'hub3', 'hub4'];
  var PH = ['ch1Ph', 'ch3Ph', 'ch4Ph', 'ch6Ph'], LN = ['ch1Ln', 'ch2Ln', 'ch3Ln', 'ch4Ln', 'ch5Ln', 'ch6Ln'];
  var TT = ['ttOut', 'ttOutL', 'ttOutR'], CDJS = ['cdjAOut', 'cdjAOutL', 'cdjAOutR', 'cdj15Out', 'cdj15OutL', 'cdj15OutR'];
  function deck(src, first, list) { return { from: src, to: first, srcs: [src], also: list.filter(function (t) { return t !== first; }).map(function (t) { return { from: src, to: t }; }) }; }
  function hubbed(to) { return { from: HUB[0], to: to, srcs: HUB, also: HUB.slice(1).map(function (p) { return { from: p, to: to }; }) }; }
  function wedge(d, x, side, mine, theirs) {
    return { id: d + 'In', dev: d, pos: [x, 0.1, WZ - 0.12], normal: K.REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', usable: true, short: 'IN', name: 'มอนิเตอร์พื้น' + side + ' · INPUT คอมโบ XLR/TRS',
      trap: [{ srcs: ['boothL', 'boothR', 'm1L', 'm1R'], msg: 'มอนิเตอร์บนเวทีมาจากคอนโซลมอนิเตอร์ · ใช้ RETURN ตามใบแพตช์' },
             { srcs: ['sbRetC', 'sbRetD'], msg: 'RETURN นี้เป็นมิกซ์ของคนอื่นตามใบแพตช์' },
             { srcs: [theirs], msg: 'มอนิเตอร์' + side + 'รับ ' + mine + ' · ซ้ายขวาสลับกัน' }] };
  }
  return {
    id: 'p3-l14', phase: 3, number: 14, of: 14,
    title: 'สอบรวม Phase 3: เวทีเต็ม',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { tt: K.models.tt, v10: K.models.v10, cdj: K.models.cdj, cdj15: K.models.cdj15 },
    devices: {
      tt: { name: 'PLX-CRSS12', model: 'tt', node: null, offset: [T, 0, 0] },
      mix: { name: 'DJM-V10', model: 'v10', node: null, offset: [0, 0, 0] },
      cdjA: { name: 'CDJ-3000X', model: 'cdj', node: null, offset: [C3, 0, 0] },
      cdj15: { name: 'CDJ-1500X', model: 'cdj15', node: null, offset: [C15, 0, 0] },
      mic: { name: 'ไมค์ดีเจ', proc: { kind: 'mic', size: [0.14, MH, 0.14] }, offset: [MX, 0, MZ] },
      hub: { name: 'ฮับ PRO DJ LINK', proc: { kind: 'box', size: [0.22, 0.035, 0.12], color: 0x3a3f46 }, offset: [0, 0, HZ] },
      sb: { name: 'สเนคบ็อกซ์บนเวที', proc: { kind: 'box', size: [0.36, 0.12, 0.16], color: 0x30343b }, offset: [SX, 0, SZ] },
      foh: { name: 'คอนโซล FOH / มอนิเตอร์ (ย่อระยะ)', proc: { kind: 'box', size: [0.3, 0.06, 0.2], color: 0x272a30 }, offset: [FX, 0, FZ] },
      wL: { name: 'มอนิเตอร์พื้นซ้าย', proc: { kind: 'box', size: [0.26, 0.2, 0.24], color: 0x24272c }, offset: [-WX, 0, WZ] },
      wR: { name: 'มอนิเตอร์พื้นขวา', proc: { kind: 'box', size: [0.26, 0.2, 0.24], color: 0x24272c }, offset: [WX, 0, WZ] }
    },
    desk: { min: [-1.0, -0.04, -0.72], max: [1.08, 0, 0.62] },
    overview: [[-0.98, 0, -0.84], [1.06, 0.42, 0.58]],
    typeLabels: K.typeLabels,
    patch: { list: PATCH, dj: DJ, ret: RET },
    jacks: [].concat(
      [{ id: 'micOut', dev: 'mic', pos: [MX, MH - 0.019, MZ - 0.05], normal: [0, -0.343, -0.939], type: 'XLRM', accepts: ['XLRF'], dir: 'out', usable: true, short: 'XLR', name: 'ไมค์ดีเจ · ขั้ว XLR (ขาตัวผู้)' }],
      K.tt('tt', T, 0, 'แผ่นเสียง', ['ttOut', 'ttGnd']),
      K.cdj('cdjA', C3, 0, 'CDJ-3000X', ['cdjAOut', 'cdjALink']),
      K.cdj15('cdj15', C15, 0, 'CDJ-1500X', ['cdj15Out', 'cdj15Link']),
      K.v10({ use: PH.concat(LN, ['gndA', 'gndB', 'm1L', 'm1R', 'boothL', 'boothR', 'mic1', 'link']),
        traps: { line: { srcs: TT, msg: 'แผ่นเสียงเข้า LINE เสียงเบาและบางมาก · ต้องเข้า PHONO' }, phono: { srcs: CDJS, msg: 'CDJ เข้า PHONO เสียงดังแตก · ใช้ LINE' },
          mic1: { srcs: ['micOut'], msg: 'งานนี้ FOH ขอไมค์ดีเจแยกช่องบนสเนค ไม่ผ่านมิกเซอร์ดีเจ' } } }),
      K.hub('hub', 0, HZ, 4, 0.22).map(function (j) { j.name = j.name.replace('สวิตช์ฮับ', 'ฮับ PRO DJ LINK'); return j; }),
      K.stagebox('sb', SX, SZ, PATCH, DJ, { 7: ['m1R'], 8: ['m1L'] }, RET),
      [{ id: 'sbMulti', dev: 'sb', pos: [SX - 0.15, 0.035, SZ - 0.08], normal: K.REAR, type: 'MULTI', dir: 'out', via: SB, usable: false, short: 'MULTI', name: 'สเนคบ็อกซ์ · ขั้วมัลติคอร์', hint: 'มัลติคอร์ต่อไว้แล้ว' },
       { id: 'fohIn', dev: 'foh', pos: [FX + 0.1, 0.03, FZ - 0.1], normal: K.REAR, type: 'MULTI', dir: 'in', usable: false, short: 'MULTI', name: 'คอนโซล FOH · ขั้วมัลติคอร์', hint: 'มัลติคอร์ต่อไว้แล้ว' },
       wedge('wL', -WX, 'ซ้าย', 'RETURN A', 'sbRetB'), wedge('wR', WX, 'ขวา', 'RETURN B', 'sbRetA')]
    ),
    wires: [],
    cables: [
      { id: 'fxMulti', color: 'black', ends: ['MULTI', 'MULTI'], len: 3.0, fixed: ['sbMulti', 'fohIn'], label: 'มัลติคอร์' },
      { id: 'rr05', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr10', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'rr15', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่' },
      { id: 'g05', color: 'green', ends: ['GND', 'GND'], len: 0.5, label: 'สายกราวด์' },
      { id: 'g10', color: 'green', ends: ['GND', 'GND'], len: 1.0, label: 'สายกราวด์' },
      { id: 'xfm10', color: 'black', ends: ['XLRF', 'XLRM'], len: 1.0, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xfm15', color: 'black', ends: ['XLRF', 'XLRM'], len: 1.5, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx20', color: 'black', ends: ['XLR', 'XLR'], len: 2.0 },
      { id: 'lan05', color: 'blue', ends: ['LAN', 'LAN'], len: 0.5 },
      { id: 'lan10', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan15a', color: 'blue', ends: ['LAN', 'LAN'], len: 1.5 },
      { id: 'lan15b', color: 'blue', ends: ['LAN', 'LAN'], len: 1.5 }
    ],
    pairs: [
      deck('ttOut', 'ch1Ph', PH), deck('cdjAOut', 'ch5Ln', LN), deck('cdj15Out', 'ch6Ln', LN),
      { from: 'ttGnd', to: 'gndB', srcs: ['ttGnd'], also: [{ from: 'ttGnd', to: 'gndA' }] },
      { from: 'micOut', to: 'sb3', srcs: ['micOut'] },
      { from: 'm1L', to: 'sb7', srcs: ['m1L'] }, { from: 'm1R', to: 'sb8', srcs: ['m1R'] },
      { from: 'sbRetA', to: 'wLIn', srcs: ['sbRetA'] }, { from: 'sbRetB', to: 'wRIn', srcs: ['sbRetB'] },
      hubbed('link'), hubbed('cdjALink'), hubbed('cdj15Link')
    ],
    hum: { jacks: ['ch1PhL', 'ch3PhL', 'ch4PhL', 'ch6PhL'], gnd: ['gndA', 'gndB'], need: 1 },
    sounds: [{ dev: 'foh', jacks: ['fohIn'] }, { dev: 'wL', jacks: ['wLIn'] }, { dev: 'wR', jacks: ['wRIn'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: PLX-CRSS12 ซ้าย DJM-V10 กลาง CDJ-3000X และ CDJ-1500X ขวา ไมค์ดีเจด้านขวา ฮับ สเนคบ็อกซ์ คอนโซล FOH ด้านหลัง มอนิเตอร์พื้นสองตัวด้านหน้า',
    advice: [
      { title: 'สอบรวม Phase 3', body: 'ใช้ทุกเรื่องที่ผ่านมาในเวทีเดียว', how: 'ไล่ทีละระบบ: เด็ค → สเนค → มอนิเตอร์ → LINK' },
      { title: 'ดูใบแพตช์ก่อนเสียบ', body: 'ทั้งช่อง IN และ RETURN มีเจ้าของ', how: 'ใบแพตช์มุมขวาบน' },
      { title: 'แต่ละเด็คมีช่องของมัน', body: 'แผ่นเสียง = PHONO + GND · CDJ = LINE', how: 'กับดักทุกแบบเปิดอยู่' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: PLX-CRSS12 · DJM-V10 · CDJ-3000X · CDJ-1500X · อุปกรณ์อื่นเป็นรูปทรงทั่วไป',
      'มัลติคอร์ไป FOH / คอนโซลมอนิเตอร์ต่อไว้แล้ว · ของจริงคอนโซลอยู่ห่างเวที บนโต๊ะย่อระยะ',
      'มอนิเตอร์พื้นวางหน้าโต๊ะดีเจ (มีแอมป์ในตัว)'
    ],
    goal: 'ด่านนี้: ต่อเวทีให้ครบ — เด็คสามเครื่อง ไมค์ สเนคตามใบแพตช์ มอนิเตอร์พื้นจาก RETURN และ PRO DJ LINK',
    winMsg: 'ผ่านสอบรวม Phase 3 · เวทีพร้อมโชว์'
  };
});
