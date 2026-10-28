/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 3 (เครื่องเล่นแผ่นเสียง 2 เครื่อง: PHONO กับ LINE)
   PLX-CRSS12 ×2 สองข้าง DJM-A9 (ช่องต่อของ PLX-CRSS12 อยู่ด้านขวาของเครื่อง) · ลำโพง VM-80 ต่อไว้ให้แล้ว
   ข้อเท็จจริง: PLX-CRSS12 ช่องออก = PHONO OUT แบบ RCA (หน้าสินค้าทางการ) · DJM-A9 มี PHONO 4 ช่อง (ร้านค้า/ผู้จัดจำหน่าย)
   กับดัก (trap): แผ่นเสียงเข้า LINE = มีเสียงแต่เบาและบางมาก ไม่นับ · เครื่องแต่ละเครื่องเข้า PHONO ช่องไหนก็ได้
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level3 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.61, B = 0.61, VL = -0.98, VR = 0.98, VZ = 0.22, TTS = ['ttAOut', 'ttBOut'];
  var PH = ['ch1Ph', 'ch2Ph', 'ch3Ph', 'ch4Ph'], LN = ['ch1Ln', 'ch2Ln', 'ch3Ln', 'ch4Ln'];
  function deck(src, first) { var rest = PH.filter(function (p) { return p !== first; }); return { from: src, to: first, srcs: [src], also: rest.map(function (p) { return { from: src, to: p }; }) }; }
  return {
    id: 'p2-l3', phase: 2, number: 3, of: 14,
    title: 'แผ่นเสียง: เข้าช่อง PHONO',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.5, 0.5, -0.71],
    models: { tt: K.models.tt, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      ttA: { name: 'PLX-CRSS12 ซ้าย', model: 'tt', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      ttB: { name: 'PLX-CRSS12 ขวา', model: 'tt', node: null, offset: [B, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, VZ] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, VZ] }
    },
    desk: { min: [-1.18, -0.04, -0.46], max: [1.18, 0, 0.44] },
    overview: [[-1.14, 0, -0.3], [1.14, 0.42, 0.38]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.tt('ttA', A, 0, 'แผ่นเสียงซ้าย', ['ttAOut']),
      K.tt('ttB', B, 0, 'แผ่นเสียงขวา', ['ttBOut']),
      K.a9({ use: PH.concat(LN, ['m1L', 'm1R']), traps: { line: { srcs: TTS, msg: 'แผ่นเสียงเข้า LINE เสียงเบาและบางมาก · ต้องเข้า PHONO' } } }),
      K.vm80('vmL', VL, VZ, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, VZ, 'VM-80 ขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedMains().concat([
      { id: 'rr05', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr10', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'rr15', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่' }
    ]),
    pairs: [deck('ttAOut', 'ch1Ph'), deck('ttBOut', 'ch4Ph')],
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังขวา: เครื่องเล่นแผ่นเสียง PLX-CRSS12 สองข้าง DJM-A9 ตรงกลาง ลำโพง VM-80 ด้านนอก',
    advice: [
      { title: 'แผ่นเสียง → PHONO', body: 'สัญญาณจากหัวเข็มเบามาก ต้องผ่านภาคขยาย PHONO', how: 'PHONO OUT → CH PHONO' },
      { title: 'เข้า LINE = เบาและบาง', body: 'เสียบได้ มีเสียง แต่ใช้งานไม่ได้', how: 'ดูป้าย PHONO / LINE ให้ดี' },
      { title: 'ช่องต่ออยู่ด้านขวาของเครื่อง', body: 'PLX-CRSS12 ไม่มีช่องด้านหลัง', how: 'ซูมดูด้านข้าง' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: PLX-CRSS12 ×2 · DJM-A9 · VM-80 ×2',
      'ลำโพงต่อไว้ให้แล้ว ด่านนี้ฝึกช่อง PHONO',
      'สายกราวด์ (GND) อยู่ด่านถัดไป'
    ],
    goal: 'ด่านนี้: ต่อเครื่องเล่นแผ่นเสียงทั้งสองเครื่องเข้าช่อง PHONO ของมิกเซอร์',
    winMsg: 'แผ่นเสียงทั้งสองเครื่องเข้า PHONO ครบแล้ว'
  };
});
