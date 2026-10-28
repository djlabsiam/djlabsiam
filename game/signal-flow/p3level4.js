/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 4 (เวทีคอนเสิร์ต: บูธดีเจบนไรเซอร์ → สเนคบ็อกซ์ → มัลติคอร์ → คอนโซล FOH)
   CDJ-3000X ×2 + DJM-A9 (เสียง CDJ ต่อไว้แล้ว) · ไมค์ดีเจบนขาตั้ง · สเนคบ็อกซ์บนเวที (proc · IN 1–8) · คอนโซล FOH (proc · ย่อระยะ)
   ตัวแปรใหม่: มัลติคอร์ = สายเส้นเดียวส่งหลายช่องไป FOH (ต่อไว้แล้ว) · ไมค์ดีเจเข้าช่องของตัวเองบนสเนค ไม่ผ่านมิกเซอร์ดีเจ (FOH คุมเอง)
   คำตอบ: MASTER 1 L → IN 5 · R → IN 6 · ไมค์ → IN 7 · ไมค์เข้า MIC 1 ของ A9 = กับดัก · สลับซ้ายขวา = กับดัก
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level4 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.396, B = 0.396, SX = 0.35, SZ = -0.5, MX = 0.72, MZ = -0.2, MH = 0.3, FX = -0.62, FZ = -0.5;
  var PATCH = ['กลองเบส', 'สแนร์', 'กีตาร์', 'เบส', 'DJ L', 'DJ R', 'ไมค์ DJ', 'สำรอง'], DJ = { 5: 'L', 6: 'R', 7: true };
  var SB = ['sb1', 'sb2', 'sb3', 'sb4', 'sb5', 'sb6', 'sb7', 'sb8'];
  return {
    id: 'p3-l4', phase: 3, number: 4, of: 14,
    title: 'เวทีคอนเสิร์ต: สเนคบ็อกซ์ + มัลติคอร์ไป FOH',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      mic: { name: 'ไมค์ดีเจ', proc: { kind: 'mic', size: [0.14, MH, 0.14] }, offset: [MX, 0, MZ] },
      sb: { name: 'สเนคบ็อกซ์บนเวที', proc: { kind: 'box', size: [0.36, 0.12, 0.16], color: 0x30343b }, offset: [SX, 0, SZ] },
      foh: { name: 'คอนโซล FOH (กลางฮอลล์ · ย่อระยะ)', proc: { kind: 'box', size: [0.3, 0.06, 0.2], color: 0x272a30 }, offset: [FX, 0, FZ] }
    },
    desk: { min: [-0.92, -0.04, -0.64], max: [0.92, 0, 0.3] },
    overview: [[-0.88, 0, -0.78], [0.88, 0.42, 0.12]],
    typeLabels: K.typeLabels,
    patch: { list: PATCH, dj: DJ },
    jacks: [].concat(
      [{ id: 'micOut', dev: 'mic', pos: [MX, MH - 0.019, MZ - 0.05], normal: [0, -0.343, -0.939], type: 'XLRM', accepts: ['XLRF'], dir: 'out', usable: true, short: 'XLR', name: 'ไมค์ดีเจ · ขั้ว XLR (ขาตัวผู้)' }],
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.a9({ use: ['ch2Ln', 'ch3Ln', 'm1L', 'm1R', 'mic1'],
        traps: { mic1: { srcs: ['micOut'], msg: 'งานนี้ FOH ขอไมค์ดีเจแยกช่องบนสเนค ไม่ผ่านมิกเซอร์ดีเจ' } } }),
      K.stagebox('sb', SX, SZ, PATCH, DJ, { 5: ['m1R'], 6: ['m1L'] }),
      [{ id: 'sbMulti', dev: 'sb', pos: [SX - 0.15, 0.035, SZ - 0.08], normal: K.REAR, type: 'MULTI', dir: 'out', via: SB, usable: false, short: 'MULTI', name: 'สเนคบ็อกซ์ · ขั้วมัลติคอร์', hint: 'มัลติคอร์ต่อไว้แล้ว ส่งทุกช่องไป FOH' },
       { id: 'fohIn', dev: 'foh', pos: [FX + 0.1, 0.03, FZ - 0.1], normal: K.REAR, type: 'MULTI', dir: 'in', usable: false, short: 'MULTI', name: 'คอนโซล FOH · ขั้วมัลติคอร์', hint: 'มัลติคอร์ต่อไว้แล้ว' }]
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch2Ln', 1.0], ['cdjB', 'ch3Ln', 1.0]]).concat([
      { id: 'fxMulti', color: 'black', ends: ['MULTI', 'MULTI'], len: 3.0, fixed: ['sbMulti', 'fohIn'], label: 'มัลติคอร์' },
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xfm05', color: 'black', ends: ['XLRF', 'XLRM'], len: 0.5, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xfm10', color: 'black', ends: ['XLRF', 'XLRM'], len: 1.0, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xfm15', color: 'black', ends: ['XLRF', 'XLRM'], len: 1.5, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' }
    ]),
    pairs: [
      { from: 'm1L', to: 'sb5', srcs: ['m1L'] },
      { from: 'm1R', to: 'sb6', srcs: ['m1R'] },
      { from: 'micOut', to: 'sb7', srcs: ['micOut'] }
    ],
    sounds: [{ dev: 'foh', jacks: ['fohIn'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-A9 ไมค์ดีเจด้านขวา สเนคบ็อกซ์ด้านหลังขวา มัลติคอร์ไปคอนโซล FOH ด้านหลังซ้าย',
    advice: [
      { title: 'มัลติคอร์ = หลายช่องในสายเดียว', body: 'สเนคบ็อกซ์ส่งทุกช่องไป FOH', how: 'มัลติคอร์ต่อไว้แล้ว' },
      { title: 'ไมค์ดีเจแยกช่อง', body: 'FOH คุมเสียงไมค์เอง', how: 'ไมค์ → ช่องไมค์ DJ บนสเนค' },
      { title: 'ต่อตามใบแพตช์', body: 'ช่องอื่นเป็นของวงดนตรี', how: 'ดูใบแพตช์มุมขวาบน' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-3000X ×2 · DJM-A9 · สเนคบ็อกซ์ / มัลติคอร์ / คอนโซล FOH เป็นรูปทรงทั่วไป',
      'ของจริงคอนโซล FOH อยู่กลางฮอลล์ ห่างเวทีหลายสิบเมตร บนโต๊ะย่อระยะให้ใกล้ลง',
      'สายเสียงของ CDJ ต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: ต่อ MASTER 1 และไมค์ดีเจเข้าสเนคบ็อกซ์ตามใบแพตช์ ให้มัลติคอร์ส่งไปถึง FOH',
    winMsg: 'FOH ได้รับเสียงดีเจและไมค์ครบทุกช่องแล้ว'
  };
});
