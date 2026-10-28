/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 12 (ลำโพงไกล: สายยาวใช้บาลานซ์)
   ชุดด่าน 1 แต่ลำโพง VM-80 วางห่างออกไปสองข้าง · สาย CDJ ต่อไว้แล้ว · ผู้เล่นต่อ MASTER → ลำโพง
   แนวทาง (ทีมค้นข้อมูล): สายไม่บาลานซ์ (RCA) ควรสั้นที่สุดเท่าที่ทำได้ · ระยะไกลใช้สายบาลานซ์ (XLR/TRS) ไม่ระบุตัวเลขเมตรตายตัว
   คำตอบ: MASTER 1 XLR → คอมโบ VM-80 (สาย XLR 3 ม.) · MASTER 2 RCA ยาว → RCA ของ VM-80 = มีเสียงแต่หักคะแนน (alt)
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level12 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.396, B = 0.396, VL = -1.38, VR = 1.38;
  return {
    id: 'p2-l12', phase: 2, number: 12, of: 14,
    title: 'ลำโพงไกล: สายยาวใช้บาลานซ์',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก · วางไกล)', model: 'vm80', node: null, offset: [VL, 0, 0] },
      vmR: { name: 'VM-80 ขวา (หลัก · วางไกล)', model: 'vm80', node: null, offset: [VR, 0, 0] }
    },
    desk: { min: [-1.56, -0.04, -0.46], max: [1.56, 0, 0.32] },
    overview: [[-1.54, 0, -0.3], [1.54, 0.42, 0.12]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.a9({ use: ['ch2Ln', 'ch3Ln', 'm1L', 'm1R', 'm2'] }),
      K.vm80('vmL', VL, 0, 'VM-80 ซ้าย', 'L', ['vmLCombo', 'vmLRca']),
      K.vm80('vmR', VR, 0, 'VM-80 ขวา', 'R', ['vmRCombo', 'vmRRca'])
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch2Ln', 1.0], ['cdjB', 'ch3Ln', 1.0]]).concat([
      { id: 'xx20', color: 'black', ends: ['XLR', 'XLR'], len: 2.0 },
      { id: 'xx30a', color: 'black', ends: ['XLR', 'XLR'], len: 3.0 },
      { id: 'xx30b', color: 'black', ends: ['XLR', 'XLR'], len: 3.0 },
      { id: 'w30', color: 'white', ends: ['RCA', 'RCA'], len: 3.0 },
      { id: 'r30', color: 'red', ends: ['RCA', 'RCA'], len: 3.0 }
    ]),
    pairs: [
      { from: 'm1L', to: 'vmLCombo', alt: [{ from: 'm2L', to: 'vmLRca' }] },
      { from: 'm1R', to: 'vmRCombo', alt: [{ from: 'm2R', to: 'vmRRca' }] }
    ],
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo', 'vmLRca'] }, { dev: 'vmR', jacks: ['vmRCombo', 'vmRRca'] }],
    altMsg: 'มีเสียง แต่สาย RCA (ไม่บาลานซ์) ยาวขนาดนี้เสี่ยงเสียงรบกวน · ใช้ MASTER 1 XLR (บาลานซ์)',
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-A9 ตรงกลาง ลำโพง VM-80 วางไกลสองข้าง',
    advice: [
      { title: 'สายยาว = เสี่ยงเสียงรบกวน', body: 'สายไม่บาลานซ์ (RCA) รับสัญญาณกวนง่าย', how: 'ระยะไกลใช้สายบาลานซ์' },
      { title: 'MASTER 1 XLR = บาลานซ์', body: 'ตัดเสียงรบกวนระหว่างทางได้', how: 'MASTER 1 → คอมโบ VM-80' },
      { title: 'วัดระยะก่อนเลือกสาย', body: 'ลำโพงอยู่ไกล สายสั้นไปไม่ถึง', how: 'เลือกเส้นที่ยาวพอ' }
    ],
    notes: [
      'สายเสียงของ CDJ ต่อไว้ให้แล้ว',
      'แนวทางทั่วไป: สาย RCA สั้นเท่าที่ทำได้ · ระยะไกลใช้ XLR / TRS (บาลานซ์)'
    ],
    goal: 'ด่านนี้: ต่อมิกเซอร์ไปลำโพงที่วางไกล ด้วยสายที่เหมาะกับระยะ',
    winMsg: 'ลำโพงไกลมีเสียงครบแล้ว'
  };
});
