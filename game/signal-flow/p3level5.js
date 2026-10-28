/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 5 (มอนิเตอร์เวทีของดีเจ: คอนโซลมอนิเตอร์ → RETURN ของสเนค → ลำโพงมอนิเตอร์พื้น)
   ชุดด่าน 4 (CDJ-3000X ×2 + DJM-A9) · MASTER → สเนค 5/6 และมัลติคอร์ไปคอนโซลมอนิเตอร์ต่อไว้แล้ว · ลำโพงมอนิเตอร์พื้น (wedge · proc · มีแอมป์ในตัว) ซ้าย/ขวา
   ตัวแปรใหม่: มิกซ์มอนิเตอร์บนเวทีคอนเสิร์ตแยกจาก FOH — คอนโซลมอนิเตอร์ส่งกลับมาทาง RETURN ของสเนค ช่องละคน (ใบแพตช์ RETURN)
   คำตอบ: RETURN A (DJ L) → wedge ซ้าย · RETURN B (DJ R) → wedge ขวา · BOOTH / MASTER ของ A9 → wedge = กับดัก · RETURN ของคนอื่น / สลับซ้ายขวา = กับดัก
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level5 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.396, B = 0.396, SX = 0.35, SZ = -0.5, WX = 0.84, WZ = 0.05, FX = -0.5, FZ = -0.52;
  var PATCH = ['กลองเบส', 'สแนร์', 'กีตาร์', 'เบส', 'DJ L', 'DJ R', 'ไมค์ DJ', 'สำรอง'], DJ = { 5: 'L', 6: 'R', 7: true };
  var RET = { list: ['มอนิเตอร์ DJ L', 'มอนิเตอร์ DJ R', 'มอนิเตอร์มือกลอง', 'มอนิเตอร์นักร้อง'], dj: { A: true, B: true } };
  var MIX = ['boothL', 'boothR', 'm1L', 'm1R'], OTHER = ['sbRetC', 'sbRetD'];
  function wedge(d, x, side, mine, theirs) {
    return { id: d + 'In', dev: d, pos: [x, 0.1, WZ - 0.12], normal: K.REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', usable: true, short: 'IN', name: 'มอนิเตอร์พื้น' + side + ' · INPUT คอมโบ XLR/TRS',
      trap: [{ srcs: MIX, msg: 'บนเวทีคอนเสิร์ต มอนิเตอร์มาจากคอนโซลมอนิเตอร์ · ใช้ RETURN ตามใบแพตช์' },
             { srcs: OTHER, msg: 'RETURN นี้เป็นมิกซ์ของคนอื่นตามใบแพตช์' },
             { srcs: [theirs], msg: 'มอนิเตอร์' + side + 'รับ ' + mine + ' · ซ้ายขวาสลับกัน' }] };
  }
  var SB = ['sb1', 'sb2', 'sb3', 'sb4', 'sb5', 'sb6', 'sb7', 'sb8'];
  return {
    id: 'p3-l5', phase: 3, number: 5, of: 14,
    title: 'มอนิเตอร์เวที: RETURN จากคอนโซลมอนิเตอร์',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      sb: { name: 'สเนคบ็อกซ์บนเวที', proc: { kind: 'box', size: [0.36, 0.12, 0.16], color: 0x30343b }, offset: [SX, 0, SZ] },
      mon: { name: 'คอนโซลมอนิเตอร์ (ข้างเวที · ย่อระยะ)', proc: { kind: 'box', size: [0.3, 0.06, 0.2], color: 0x272a30 }, offset: [FX, 0, FZ] },
      wedgeL: { name: 'มอนิเตอร์พื้นซ้าย', proc: { kind: 'box', size: [0.26, 0.2, 0.24], color: 0x24272c }, offset: [-WX, 0, WZ] },
      wedgeR: { name: 'มอนิเตอร์พื้นขวา', proc: { kind: 'box', size: [0.26, 0.2, 0.24], color: 0x24272c }, offset: [WX, 0, WZ] }
    },
    desk: { min: [-1.02, -0.04, -0.64], max: [1.02, 0, 0.3] },
    overview: [[-0.98, 0, -0.78], [0.98, 0.42, 0.18]],
    typeLabels: K.typeLabels,
    patch: { list: PATCH, dj: DJ, ret: RET },
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.a9({ use: ['ch2Ln', 'ch3Ln', 'm1L', 'm1R', 'boothL', 'boothR'] }),
      K.stagebox('sb', SX, SZ, PATCH, DJ, { 5: ['m1R'], 6: ['m1L'] }, RET),
      [{ id: 'sbMulti', dev: 'sb', pos: [SX - 0.15, 0.035, SZ - 0.08], normal: K.REAR, type: 'MULTI', dir: 'out', via: SB, usable: false, short: 'MULTI', name: 'สเนคบ็อกซ์ · ขั้วมัลติคอร์', hint: 'มัลติคอร์ต่อไว้แล้ว' },
       { id: 'monIn', dev: 'mon', pos: [FX + 0.1, 0.03, FZ - 0.1], normal: K.REAR, type: 'MULTI', dir: 'in', usable: false, short: 'MULTI', name: 'คอนโซลมอนิเตอร์ · ขั้วมัลติคอร์', hint: 'มัลติคอร์ต่อไว้แล้ว' },
       wedge('wedgeL', -WX, 'ซ้าย', 'RETURN A', 'sbRetB'), wedge('wedgeR', WX, 'ขวา', 'RETURN B', 'sbRetA')]
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch2Ln', 1.0], ['cdjB', 'ch3Ln', 1.0]]).concat([
      { id: 'fxML', color: 'black', ends: ['XLR', 'XLR'], len: 1.0, fixed: ['m1L', 'sb5'] },
      { id: 'fxMR', color: 'black', ends: ['XLR', 'XLR'], len: 1.0, fixed: ['m1R', 'sb6'] },
      { id: 'fxMulti', color: 'black', ends: ['MULTI', 'MULTI'], len: 3.0, fixed: ['sbMulti', 'monIn'], label: 'มัลติคอร์' },
      { id: 'xx05', color: 'black', ends: ['XLR', 'XLR'], len: 0.5 },
      { id: 'xx10', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx25', color: 'black', ends: ['XLR', 'XLR'], len: 2.5 },
      { id: 'tx15', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 }
    ]),
    pairs: [{ from: 'sbRetA', to: 'wedgeLIn', srcs: ['sbRetA'] }, { from: 'sbRetB', to: 'wedgeRIn', srcs: ['sbRetB'] }],
    sounds: [{ dev: 'wedgeL', jacks: ['wedgeLIn'] }, { dev: 'wedgeR', jacks: ['wedgeRIn'] }, { dev: 'mon', jacks: ['monIn'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-A9 สเนคบ็อกซ์ด้านหลังขวา คอนโซลมอนิเตอร์ด้านหลังซ้าย ลำโพงมอนิเตอร์พื้นสองข้าง',
    advice: [
      { title: 'มอนิเตอร์แยกจาก FOH', body: 'คอนโซลมอนิเตอร์ทำมิกซ์ให้แต่ละคน', how: 'ส่งกลับมาทาง RETURN ของสเนค' },
      { title: 'RETURN มีเจ้าของ', body: 'แต่ละช่องคือมิกซ์ของคนหนึ่ง', how: 'ดูใบแพตช์ส่วน RETURN' },
      { title: 'ไม่ใช้ BOOTH ของมิกเซอร์', body: 'วิศวกรมอนิเตอร์เป็นคนปรับให้', how: 'RETURN ของ DJ → มอนิเตอร์พื้น' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-3000X ×2 · DJM-A9 · สเนคบ็อกซ์ / คอนโซลมอนิเตอร์ / ลำโพงมอนิเตอร์พื้นเป็นรูปทรงทั่วไป',
      'MASTER → สเนค ช่อง 5/6 และมัลติคอร์ต่อไว้ให้แล้ว (ทำในด่าน 4)',
      'ของจริงคอนโซลมอนิเตอร์อยู่ข้างเวที บนโต๊ะย่อระยะให้ใกล้ลง'
    ],
    goal: 'ด่านนี้: ต่อมอนิเตอร์พื้นสองข้างของดีเจ จากช่อง RETURN ที่ใบแพตช์จองไว้ให้ดีเจ',
    winMsg: 'มอนิเตอร์บนเวทีได้มิกซ์ของดีเจจากคอนโซลมอนิเตอร์แล้ว'
  };
});
