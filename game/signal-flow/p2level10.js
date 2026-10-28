/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 10 (อัดเซ็ตเก็บไว้: REC OUT → เครื่องบันทึก)
   ชุดด่าน 1 (CDJ ×2 + DJM-A9 + VM-80 ×2 ต่อไว้แล้ว) + เครื่องบันทึกเสียงทั่วไป (proc) หลังมิกเซอร์
   ข้อเท็จจริง: DJM-A9 มี REC OUT แบบ RCA (ร้านค้า/ผู้จัดจำหน่าย + สเปกทางการผ่านผลค้น)
   คำตอบ: REC OUT → LINE IN ของเครื่องบันทึก · MASTER 2 → เครื่องบันทึก = ใช้ได้แต่หักคะแนน (alt) · BOOTH หัว TRS เสียบไม่ได้
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level10 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.396, B = 0.396, VL = -0.74, VR = 0.74, RZ = -0.46;
  return {
    id: 'p2-l10', phase: 2, number: 10, of: 14,
    title: 'อัดเซ็ต: REC OUT → เครื่องบันทึก',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      rec: { name: 'เครื่องบันทึก', proc: { kind: 'box', size: [0.2, 0.05, 0.15], color: 0x2e3238 }, offset: [0, 0, RZ] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, 0] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, 0] }
    },
    desk: { min: [-0.92, -0.04, -0.6], max: [0.92, 0, 0.32] },
    overview: [[-0.88, 0, -0.54], [0.88, 0.42, 0.12]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.a9({ use: ['ch2Ln', 'ch3Ln', 'm1L', 'm1R', 'rec', 'm2', 'boothL', 'boothR'], hints: { m2: '' } }),
      K.recorder('rec', 0, RZ),
      K.vm80('vmL', VL, 0, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, 0, 'VM-80 ขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch2Ln', 1.0], ['cdjB', 'ch3Ln', 1.0]]).concat(K.fixedMains(), [
      { id: 'rr05', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr10', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'trs10', color: 'gray', ends: ['TRS', 'TRS'], len: 1.0 }
    ]),
    pairs: [{ from: 'rec', to: 'recIn', alt: [{ from: 'm2', to: 'recIn' }] }],
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    altMsg: 'อัดได้ แต่ MASTER 2 เป็นช่องส่งไปลำโพง · ช่องสำหรับอัดคือ REC OUT',
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-A9 ตรงกลาง เครื่องบันทึกเสียงด้านหลัง',
    advice: [
      { title: 'REC OUT = ช่องสำหรับอัด', body: 'ส่งเสียงที่มิกซ์แล้วไปเครื่องบันทึก', how: 'REC OUT → LINE IN' },
      { title: 'MASTER 2 ก็อัดได้', body: 'แต่เป็นช่องส่งไปลำโพง', how: 'ใช้ REC OUT ให้ตรงหน้าที่' },
      { title: 'เครื่องบันทึกรับ RCA', body: 'BOOTH เป็น TRS เสียบไม่ได้', how: 'ดูชนิดหัวสาย' }
    ],
    notes: [
      'เครื่องบันทึกเสียงเป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง',
      'สายเสียงของ CDJ และลำโพงต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: ต่อมิกเซอร์เข้าเครื่องบันทึกเพื่ออัดเซ็ต',
    winMsg: 'เครื่องบันทึกได้เสียงแล้ว พร้อมอัด'
  };
});
