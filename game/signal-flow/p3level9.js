/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 9 (สำรองระบบ: DIGITAL MASTER OUT เป็นสายหลัก + MASTER 1 อะนาล็อกเป็นสายสำรอง)
   CDJ-3000X ×2 + DJM-V10 (เสียง CDJ ต่อไว้แล้ว) · โปรเซสเซอร์ลำโพง (proc · AES IN + ANALOG IN L/R · สลับไปอินพุตสำรองเองเมื่อสายหลักหลุด) หลังโต๊ะขวา
   ตัวแปรใหม่: ความซ้ำซ้อนของสัญญาณ — ส่งสองทางพร้อมกัน สายหนึ่งหลุด อีกสายรับต่อทันที · ดิจิทัล AES/EBU กับอะนาล็อกเข้าช่องของใครของมัน
   คำตอบ: DIGITAL MASTER OUT → AES IN · MASTER 1 L / R → ANALOG IN L / R · สลับชนิดช่อง = กับดัก
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level9 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.414, B = 0.414, PX = 0.4, PZ = -0.48, Z = PZ - 0.11;
  var ANALOG = ['m1L', 'm1R', 'boothL', 'boothR'];
  function pin(id, dx, ch, name, trap) { return { id: id, dev: 'proc', pos: [PX + dx, 0.022, Z], normal: K.REAR, type: 'XLR', accepts: ['XLR', 'XLRM'], dir: 'in', ch: ch, usable: true, short: name.split(' ').pop(), name: 'โปรเซสเซอร์ลำโพง · ' + name, trap: trap }; }
  return {
    id: 'p3-l9', phase: 3, number: 9, of: 14,
    title: 'สำรองระบบ: สายหลักดิจิทัล + สายสำรองอะนาล็อก',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, v10: K.models.v10 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-V10', model: 'v10', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      proc: { name: 'โปรเซสเซอร์ลำโพง (มีอินพุตสำรอง)', proc: { kind: 'box', size: [0.36, 0.044, 0.22], color: 0x2e3238 }, offset: [PX, 0, PZ] }
    },
    desk: { min: [-0.92, -0.04, -0.66], max: [0.92, 0, 0.3] },
    overview: [[-0.9, 0, -0.8], [0.9, 0.3, 0.26]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.v10({ use: ['ch3Ln', 'ch4Ln', 'm1L', 'm1R', 'boothL', 'boothR', 'aesOut'] }),
      [pin('pAes', 0.12, undefined, 'AES/EBU IN (ดิจิทัล · สายหลัก)', { srcs: ANALOG, msg: 'สัญญาณอะนาล็อกเข้าอินพุตดิจิทัล AES = ไม่มีเสียง' }),
       pin('pAL', 0.04, 'L', 'ANALOG IN L (สายสำรอง)', { srcs: ['aesOut'], msg: 'สัญญาณดิจิทัล AES เข้าอินพุตอะนาล็อก = เสียงซ่า' }),
       pin('pAR', 0.0, 'R', 'ANALOG IN R (สายสำรอง)', { srcs: ['aesOut'], msg: 'สัญญาณดิจิทัล AES เข้าอินพุตอะนาล็อก = เสียงซ่า' })]
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch3Ln', 1.0], ['cdjB', 'ch4Ln', 1.0]]).concat([
      { id: 'xx05', color: 'black', ends: ['XLR', 'XLR'], len: 0.5 },
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10c', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 }
    ]),
    pairs: [
      { from: 'aesOut', to: 'pAes', srcs: ['aesOut'] },
      { from: 'm1L', to: 'pAL', srcs: ['m1L'] },
      { from: 'm1R', to: 'pAR', srcs: ['m1R'] }
    ],
    sounds: [{ dev: 'proc', jacks: ['pAes', 'pAL', 'pAR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-V10 ตรงกลาง โปรเซสเซอร์ลำโพงด้านหลังขวา',
    advice: [
      { title: 'สำรอง = ส่งสองทางพร้อมกัน', body: 'สายหลักหลุด โปรเซสเซอร์สลับไปสายสำรองเอง', how: 'ต่อทั้งสายหลักและสายสำรอง' },
      { title: 'สายหลัก: ดิจิทัล AES', body: 'DJM-V10 ส่งเสียงดิจิทัลทาง XLR ได้', how: 'DIGITAL MASTER OUT → AES IN' },
      { title: 'สายสำรอง: อะนาล็อก', body: 'หัว XLR เหมือนกัน แต่ช่องคนละชนิด', how: 'MASTER 1 L / R → ANALOG IN L / R' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-3000X ×2 · DJM-V10 · โปรเซสเซอร์ลำโพงเป็นรูปทรงทั่วไป',
      'DJM-V10 มี DIGITAL MASTER OUT แบบ AES/EBU (หัว XLR) ตามสเปกทางการ',
      'สายเสียงของ CDJ ต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: ส่งเสียงเข้าโปรเซสเซอร์สองทาง — ดิจิทัล AES เป็นสายหลัก และ MASTER 1 อะนาล็อกเป็นสายสำรอง',
    winMsg: 'ระบบมีสายสำรองแล้ว สายหลักหลุดเสียงก็ไม่ดับ'
  };
});
