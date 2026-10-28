/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 8 (เทศกาล เปลี่ยนดีเจเร็ว: ต่อชุดของดีเจคนต่อไปโดยไม่แตะชุดที่กำลังเล่น)
   ชุด A (กำลังเล่น · ต่อไว้แล้วทั้งหมด): CDJ-3000X ×2 + DJM-A9 → สเนค 5/6 · ชุด B (คนต่อไป): CDJ-1500X ×2 + DJM-V5 → สเนค 7/8
   สเนคบ็อกซ์ (proc) + มัลติคอร์ไป FOH ต่อไว้แล้ว · FOH ค่อยๆ เฟดจากช่อง 5/6 ไป 7/8 จึงต้องต่อชุด B ให้ครบก่อนชุด A เล่นจบ
   ตัวแปรใหม่: สองชุดบนโต๊ะเดียว · ช่องสเนคของแต่ละคนตามใบแพตช์ · เปลี่ยนตัวให้ทันเวลา (ดูเวลาที่ตัวจับเวลา)
   คำตอบ: CDJ-1500X ทั้งสอง → LINE ของ V5 · V5 MASTER L / R → IN 7 / 8 · CDJ เข้า PHONO = กับดัก
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level8 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var XA = -0.62, XB = 0.56, SX = 0.22, SZ = -0.5, FX = 0.82, FZ = -0.52;
  var PATCH = ['กลองเบส', 'สแนร์', 'กีตาร์', 'เบส', 'DJ ที่กำลังเล่น L', 'DJ ที่กำลังเล่น R', 'DJ คนต่อไป L', 'DJ คนต่อไป R'], DJ = { 5: 'L', 6: 'R', 7: 'L', 8: 'R' };
  var SB = ['sb1', 'sb2', 'sb3', 'sb4', 'sb5', 'sb6', 'sb7', 'sb8'];
  var CDJB = ['cdjB1Out', 'cdjB1OutL', 'cdjB1OutR', 'cdjB2Out', 'cdjB2OutL', 'cdjB2OutR'];
  var LINES = ['vch1Ln', 'vch2Ln', 'vch3Ln'];
  function deck(src, first) { return { from: src, to: first, srcs: [src], also: LINES.filter(function (t) { return t !== first; }).map(function (t) { return { from: src, to: t }; }) }; }
  return {
    id: 'p3-l8', phase: 3, number: 8, of: 14,
    title: 'เทศกาล: ต่อชุดดีเจคนต่อไปให้ทัน',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9, cdj15: K.models.cdj15, v5: K.models.v5 },
    devices: {
      cdjA1: { name: 'CDJ-3000X (ชุด A)', model: 'cdj', node: null, offset: [XA - 0.396, 0, 0] },
      mixA: { name: 'DJM-A9 (ชุด A · กำลังเล่น)', model: 'a9', node: null, offset: [XA, 0, 0] },
      cdjA2: { name: 'CDJ-3000X (ชุด A)', model: 'cdj', node: null, offset: [XA + 0.396, 0, 0] },
      cdjB1: { name: 'CDJ-1500X (ชุด B)', model: 'cdj15', node: null, offset: [XB - 0.282, 0, 0] },
      mixB: { name: 'DJM-V5 (ชุด B · คนต่อไป)', model: 'v5', node: null, offset: [XB, 0, 0] },
      cdjB2: { name: 'CDJ-1500X (ชุด B)', model: 'cdj15', node: null, offset: [XB + 0.282, 0, 0] },
      sb: { name: 'สเนคบ็อกซ์บนเวที', proc: { kind: 'box', size: [0.36, 0.12, 0.16], color: 0x30343b }, offset: [SX, 0, SZ] },
      foh: { name: 'คอนโซล FOH (ย่อระยะ)', proc: { kind: 'box', size: [0.3, 0.06, 0.2], color: 0x272a30 }, offset: [FX, 0, FZ] }
    },
    desk: { min: [-1.26, -0.04, -0.64], max: [1.1, 0, 0.3] },
    overview: [[-1.24, 0, -0.78], [1.08, 0.42, 0.14]],
    typeLabels: K.typeLabels,
    patch: { list: PATCH, dj: DJ },
    jacks: [].concat(
      K.cdj('cdjA1', XA - 0.396, 0, 'CDJ ชุด A ซ้าย', ['cdjA1Out']),
      K.cdj('cdjA2', XA + 0.396, 0, 'CDJ ชุด A ขวา', ['cdjA2Out']),
      K.rename(K.a9({ ox: XA, use: ['ch2Ln', 'ch3Ln', 'm1L', 'm1R'], hints: { line: 'ชุด A กำลังเล่นอยู่ ห้ามแตะ' } }), 'a', 'mixA', 'A9'),
      K.cdj15('cdjB1', XB - 0.282, 0, 'CDJ ชุด B ซ้าย', ['cdjB1Out']),
      K.cdj15('cdjB2', XB + 0.282, 0, 'CDJ ชุด B ขวา', ['cdjB2Out']),
      K.rename(K.v5({ ox: XB, use: ['ch1Ph', 'ch2Ph', 'ch3Ph', 'ch1Ln', 'ch2Ln', 'ch3Ln', 'm1L', 'm1R'],
        traps: { phono: { srcs: CDJB, msg: 'CDJ เข้า PHONO เสียงดังแตก · ใช้ LINE' } } }), 'v', 'mixB', 'V5'),
      K.stagebox('sb', SX, SZ, PATCH, DJ, { 7: ['vm1R'], 8: ['vm1L'] }),
      [{ id: 'sbMulti', dev: 'sb', pos: [SX - 0.15, 0.035, SZ - 0.08], normal: K.REAR, type: 'MULTI', dir: 'out', via: SB, usable: false, short: 'MULTI', name: 'สเนคบ็อกซ์ · ขั้วมัลติคอร์', hint: 'มัลติคอร์ต่อไว้แล้ว' },
       { id: 'fohIn', dev: 'foh', pos: [FX - 0.1, 0.03, FZ - 0.1], normal: K.REAR, type: 'MULTI', dir: 'in', usable: false, short: 'MULTI', name: 'คอนโซล FOH · ขั้วมัลติคอร์', hint: 'มัลติคอร์ต่อไว้แล้ว' }]
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA1', 'ach2Ln', 1.0], ['cdjA2', 'ach3Ln', 1.0]]).concat([
      { id: 'fxAL', color: 'black', ends: ['XLR', 'XLR'], len: 1.5, fixed: ['am1L', 'sb5'] },
      { id: 'fxAR', color: 'black', ends: ['XLR', 'XLR'], len: 1.5, fixed: ['am1R', 'sb6'] },
      { id: 'fxMulti', color: 'black', ends: ['MULTI', 'MULTI'], len: 3.0, fixed: ['sbMulti', 'fohIn'], label: 'มัลติคอร์' },
      { id: 'rr05a', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr05b', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr10', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'xx05', color: 'black', ends: ['XLR', 'XLR'], len: 0.5 },
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 }
    ]),
    pairs: [
      deck('cdjB1Out', 'vch1Ln'), deck('cdjB2Out', 'vch3Ln'),
      { from: 'vm1L', to: 'sb7', srcs: ['vm1L'] },
      { from: 'vm1R', to: 'sb8', srcs: ['vm1R'] }
    ],
    sounds: [{ dev: 'foh', jacks: ['fohIn'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: ชุด A (CDJ-3000X สองเครื่อง DJM-A9) ด้านซ้ายกำลังเล่น ชุด B (CDJ-1500X สองเครื่อง DJM-V5) ด้านขวา สเนคบ็อกซ์ตรงกลางด้านหลัง',
    advice: [
      { title: 'ห้ามแตะชุดที่กำลังเล่น', body: 'ชุด A ต่อไว้แล้วและกำลังออกเสียง', how: 'ต่อเฉพาะชุด B' },
      { title: 'คนต่อไปมีช่องของตัวเอง', body: 'FOH เฟดข้ามจากช่องเดิมไปช่องใหม่', how: 'ดูใบแพตช์ ช่อง "DJ คนต่อไป"' },
      { title: 'เปลี่ยนตัวให้ทัน', body: 'งานเทศกาลมีเวลาเปลี่ยนแค่ไม่กี่นาที', how: 'CDJ → LINE · MASTER → สเนค' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-3000X ×2 · DJM-A9 · CDJ-1500X ×2 · DJM-V5 · สเนคบ็อกซ์ / คอนโซล FOH เป็นรูปทรงทั่วไป',
      'ชุด A ต่อไว้ครบแล้ว (เสียง CDJ · MASTER → สเนค 5/6) · มัลติคอร์ต่อไว้แล้ว',
      'ดูเวลาที่ใช้ได้ที่ตัวจับเวลาด้านบน'
    ],
    goal: 'ด่านนี้: ต่อชุด B ของดีเจคนต่อไปให้ครบ เข้าช่องของตัวเองบนสเนค โดยไม่แตะชุด A ที่กำลังเล่น',
    winMsg: 'ชุดดีเจคนต่อไปพร้อมแล้ว FOH เฟดข้ามได้ทันที'
  };
});
