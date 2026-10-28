/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 9 (เสียงดิจิทัล: DIGITAL OUT → DIGITAL CH IN)
   ชุดเดียวกับด่าน 1 (CDJ-3000X ×2 + DJM-A9 + VM-80 ×2 ต่อไว้แล้ว)
   ข้อเท็จจริง: CDJ-3000X มี Digital (Coaxial) out ×1 (สเปกทางการ) · DJM-A9 มี DIGITAL IN ×4 แบบโคแอกเชียล (ร้านค้า/ผู้จัดจำหน่าย)
   หัวโคแอกเชียลรูปร่างเหมือน RCA จึงเสียบช่อง LINE ได้ → กับดัก: ดิจิทัลเข้า LINE = เสียงซ่า · ต่อ AUDIO OUT (อะนาล็อก) = ใช้ได้จริงแต่ด่านนี้ฝึกดิจิทัล
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level9 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.396, B = 0.396, VL = -0.74, VR = 0.74;
  var DIG = ['dig1', 'dig2', 'dig3', 'dig4'];
  function any(src, list) { return { from: src, to: list[0], srcs: [src], also: list.slice(1).map(function (p) { return { from: src, to: p }; }) }; }
  return {
    id: 'p2-l9', phase: 2, number: 9, of: 14,
    title: 'เสียงดิจิทัล: สายโคแอกเชียล',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, 0] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, 0] }
    },
    desk: { min: [-0.92, -0.04, -0.46], max: [0.92, 0, 0.32] },
    overview: [[-0.88, 0, -0.3], [0.88, 0.42, 0.12]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjADig', 'cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBDig', 'cdjBOut']),
      K.a9({ use: DIG.concat(['ch1Ln', 'ch2Ln', 'ch3Ln', 'ch4Ln', 'm1L', 'm1R']), coaxLine: true, traps: {
        line: [{ srcs: ['cdjADig', 'cdjBDig'], msg: 'สายดิจิทัลเข้าช่อง LINE (อะนาล็อก) ได้แค่เสียงซ่า · ต้องเข้า DIGITAL CH IN' },
          { srcs: ['cdjAOut', 'cdjBOut'], msg: 'ต่อแบบอะนาล็อกใช้ได้จริง แต่ด่านนี้ฝึกดิจิทัล · ต่อ DIGITAL OUT → DIGITAL CH IN' }] } }),
      K.vm80('vmL', VL, 0, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, 0, 'VM-80 ขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedMains().concat([
      { id: 'cx05', color: 'black', ends: ['COAX', 'COAX'], len: 0.5, label: 'สายดิจิทัลโคแอกเชียล' },
      { id: 'cx10', color: 'black', ends: ['COAX', 'COAX'], len: 1.0, label: 'สายดิจิทัลโคแอกเชียล' },
      { id: 'cx15', color: 'black', ends: ['COAX', 'COAX'], len: 1.5, label: 'สายดิจิทัลโคแอกเชียล' },
      { id: 'rr10', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' }
    ]),
    pairs: [any('cdjADig', DIG), any('cdjBDig', ['dig4', 'dig3', 'dig2', 'dig1'])],
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-A9 ตรงกลาง ลำโพง VM-80 ด้านนอก',
    advice: [
      { title: 'สายดิจิทัลเส้นเดียว ได้ทั้งซ้ายขวา', body: 'สัญญาณสเตอริโอวิ่งในสายเส้นเดียว', how: 'DIGITAL OUT → DIGITAL CH IN' },
      { title: 'หัวเหมือน RCA แต่ไม่ใช่ LINE', body: 'เสียบ LINE ได้ แต่ได้แค่เสียงซ่า', how: 'ดูป้าย DIGITAL บนมิกเซอร์' },
      { title: 'ใช้ช่องดิจิทัลไหนก็ได้', body: 'มี 4 ช่อง ตรงกับ CH1–4', how: 'เลือกช่องใกล้ สายจะสั้น' }
    ],
    notes: [
      'CDJ-3000X มีช่อง Digital (Coaxial) out (สเปกทางการ)',
      'ลำโพงต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: ต่อ CDJ ทั้งสองเครื่องเข้ามิกเซอร์ด้วยสายดิจิทัล',
    winMsg: 'CDJ ทั้งสองส่งเสียงดิจิทัลเข้ามิกเซอร์แล้ว'
  };
});
