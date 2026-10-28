/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 1 (คลับที่มีระบบติดตั้ง: MASTER → สเตจบ็อกซ์ตามใบแพตช์)
   ชุด Phase 2 (CDJ-3000X ×2 + DJM-A9) · สเตจบ็อกซ์ของร้าน (proc · IN 1–8 + RETURN A–D) หลังโต๊ะ · ลำโพงบูธ VM-80 ต่อ BOOTH ไว้แล้ว
   ตัวแปรใหม่: ใบแพตช์ — ช่องบนสเตจบ็อกซ์มีเจ้าของ ดีเจได้ช่อง 7 (L) / 8 (R) · ช่องอื่น = กับดักบอกว่าเป็นช่องของอะไร
   คำตอบ: MASTER 1 XLR L → IN 7 · R → IN 8 · สลับซ้ายขวา = มีเสียงแต่ไม่นับ (srcs)
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level1 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.396, B = 0.396, VL = -0.74, VR = 0.74, SX = 0.3, SZ = -0.5;
  var PATCH = ['ไมค์ MC', 'ไมค์ไร้สาย 1', 'ไมค์ไร้สาย 2', 'ไมค์สำรอง', 'เพลงพื้นหลัง L', 'เพลงพื้นหลัง R', 'DJ L', 'DJ R'], DJ = { 7: 'L', 8: 'R' };
  return {
    id: 'p3-l1', phase: 3, number: 1, of: 14,
    title: 'คลับมีระบบติดตั้ง: ต่อตามใบแพตช์',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      sb: { name: 'สเตจบ็อกซ์', proc: { kind: 'box', size: [0.36, 0.12, 0.16], color: 0x30343b }, offset: [SX, 0, SZ] },
      vmL: { name: 'VM-80 ซ้าย (บูธ)', model: 'vm80', node: null, offset: [VL, 0, 0] },
      vmR: { name: 'VM-80 ขวา (บูธ)', model: 'vm80', node: null, offset: [VR, 0, 0] }
    },
    desk: { min: [-0.92, -0.04, -0.68], max: [0.92, 0, 0.32] },
    overview: [[-0.88, 0, -0.62], [0.88, 0.42, 0.12]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.a9({ use: ['ch2Ln', 'ch3Ln', 'm1L', 'm1R', 'boothL', 'boothR'] }),
      K.stagebox('sb', SX, SZ, PATCH, DJ, { 7: ['m1R'], 8: ['m1L'] }),
      K.vm80('vmL', VL, 0, 'VM-80 บูธซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, 0, 'VM-80 บูธขวา', 'R', ['vmRCombo'])
    ),
    patch: { list: PATCH, dj: DJ },   // ใบแพตช์แสดงตลอดมุมขวาบนของกระดาน (แยกจากกล่องคำแนะนำ)
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch2Ln', 1.0], ['cdjB', 'ch3Ln', 1.0]]).concat([
      { id: 'fxBL', color: 'gray', ends: ['TRS', 'TRS'], len: 2.0, fixed: ['boothL', 'vmLCombo'] },
      { id: 'fxBR', color: 'gray', ends: ['TRS', 'TRS'], len: 2.0, fixed: ['boothR', 'vmRCombo'] },
      { id: 'xx05', color: 'black', ends: ['XLR', 'XLR'], len: 0.5 },
      { id: 'xx10', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx20', color: 'black', ends: ['XLR', 'XLR'], len: 2.0 },
    ]),
    pairs: [
      { from: 'm1L', to: 'sb7', srcs: ['m1L'] },
      { from: 'm1R', to: 'sb8', srcs: ['m1R'] }
    ],
    sounds: [{ dev: 'sb', jacks: ['sb7', 'sb8'] }, { dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-A9 สเตจบ็อกซ์ของร้านด้านหลังขวา ลำโพงบูธ VM-80 สองข้าง',
    advice: [
      { title: 'ใบแพตช์ = ช่องมีเจ้าของ', body: 'ช่องบนสเตจบ็อกซ์ถูกจองไว้แล้ว', how: 'ดูใบแพตช์มุมขวาบน' },
      { title: 'MASTER 1 XLR เท่านั้น', body: 'BOOTH ต่อลำโพงบูธไว้แล้ว', how: 'MASTER 1 → ช่องของ DJ' },
      { title: 'ซ้ายขวาต้องตรง', body: 'สลับ = ระบบได้เสียงกลับข้าง', how: 'L → DJ L · R → DJ R' }
    ],
    notes: [
      'สเตจบ็อกซ์เป็นรูปทรงทั่วไป แทนจุดรับสายที่ร้านติดตั้งไว้ (สายยาวจากบูธไปคอนโซลหน้าเวที)',
      'สายเสียงของ CDJ และลำโพงบูธต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: ต่อ MASTER 1 เข้าสเตจบ็อกซ์ของร้าน ตรงช่องที่ใบแพตช์จองไว้ให้ดีเจ',
    winMsg: 'เสียงดีเจเข้าระบบของร้านตรงช่องแล้ว'
  };
});
