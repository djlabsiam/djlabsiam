/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 13 (บูธคลับเล็ก ระบบ PA ติดตั้งแล้ว: MASTER → PA · BOOTH → มอนิเตอร์)
   ชุดด่าน 1 + กล่องรับสายเข้าระบบ PA ของร้าน (proc · XLR IN L/R) หลังโต๊ะ · VM-80 ×2 เป็นลำโพงบูธข้างดีเจ
   คำตอบ: MASTER 1 XLR → กล่อง PA · BOOTH TRS → คอมโบ VM-80 · สลับหน้าที่ = มีเสียงแต่ไม่นับ (srcs)
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level13 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.396, B = 0.396, VL = -0.74, VR = 0.74, PZ = -0.5;
  var MASTER = ['m1L', 'm1R', 'm2L', 'm2R'], BOOTH = ['boothL', 'boothR'];
  return {
    id: 'p2-l13', phase: 2, number: 13, of: 14,
    title: 'คลับเล็ก: MASTER → PA · BOOTH → มอนิเตอร์',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      pa: { name: 'กล่องสาย PA', proc: { kind: 'box', size: [0.2, 0.09, 0.12], color: 0x30343b }, offset: [0, 0, PZ] },
      vmL: { name: 'VM-80 ซ้าย (บูธ)', model: 'vm80', node: null, offset: [VL, 0, 0] },
      vmR: { name: 'VM-80 ขวา (บูธ)', model: 'vm80', node: null, offset: [VR, 0, 0] }
    },
    desk: { min: [-0.92, -0.04, -0.64], max: [0.92, 0, 0.32] },
    overview: [[-0.88, 0, -0.58], [0.88, 0.42, 0.12]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.a9({ use: ['ch2Ln', 'ch3Ln', 'm1L', 'm1R', 'boothL', 'boothR'] }),
      K.paBox('pa', 0, PZ),
      K.vm80('vmL', VL, 0, 'VM-80 บูธซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, 0, 'VM-80 บูธขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch2Ln', 1.0], ['cdjB', 'ch3Ln', 1.0]]).concat([
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'trs15a', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 },
      { id: 'trs15b', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 }
    ]),
    pairs: [
      { from: 'm1L', to: 'paL', srcs: MASTER }, { from: 'm1R', to: 'paR', srcs: MASTER },
      { from: 'boothL', to: 'vmLCombo', srcs: BOOTH }, { from: 'boothR', to: 'vmRCombo', srcs: BOOTH }
    ],
    sounds: [{ dev: 'pa', jacks: ['paL', 'paR'] }, { dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-A9 กล่องสายเข้า PA ด้านหลัง ลำโพงบูธ VM-80 สองข้าง',
    advice: [
      { title: 'MASTER → ระบบ PA ของร้าน', body: 'เสียงให้คนในคลับฟัง', how: 'MASTER 1 XLR → กล่องสาย PA' },
      { title: 'BOOTH → มอนิเตอร์ข้างดีเจ', body: 'ปรับดังเบาแยกจาก MASTER ได้', how: 'BOOTH TRS → VM-80' },
      { title: 'สลับหน้าที่ = ไม่ผ่าน', body: 'MASTER เข้าบูธ หรือ BOOTH เข้า PA', how: 'ดูชื่อช่องให้ตรง' }
    ],
    notes: [
      'กล่องสายเข้า PA เป็นรูปทรงทั่วไป แทนจุดรับสายที่ร้านติดตั้งไว้ (ปลายทางไปตู้แร็ก/ลำโพง PA)',
      'สายเสียงของ CDJ ต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: MASTER ไประบบ PA ของร้าน และ BOOTH ไปลำโพงมอนิเตอร์ข้างดีเจ',
    winMsg: 'ระบบ PA และมอนิเตอร์บูธมีเสียงครบแล้ว'
  };
});
