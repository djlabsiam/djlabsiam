/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 5 (ผสมฟอร์แมต: แผ่นเสียง + CDJ บนมิกเซอร์เดียวกัน)
   PLX-CRSS12 ซ้าย + DJM-A9 + CDJ-3000X ขวา · ลำโพงต่อไว้ให้แล้ว
   คำตอบ: แผ่นเสียง → PHONO + สายกราวด์ · CDJ → LINE
   กับดัก (trap): แผ่นเสียงเข้า LINE = เบาและบาง · CDJ เข้า PHONO = ดังเกินจนแตก · ไม่ต่อกราวด์ = มีเสียงฮัม (BGM)
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level5 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.61, B = 0.396, VL = -0.98, VR = 0.74, VZ = 0.22;
  var PH = ['ch1Ph', 'ch2Ph', 'ch3Ph', 'ch4Ph'], LN = ['ch1Ln', 'ch2Ln', 'ch3Ln', 'ch4Ln'];
  function any(src, list) { return { from: src, to: list[0], srcs: [src], also: list.slice(1).map(function (p) { return { from: src, to: p }; }) }; }
  return {
    id: 'p2-l5', phase: 2, number: 5, of: 14,
    title: 'ผสมฟอร์แมต: แผ่นเสียง + CDJ',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.5, 0.5, -0.71],
    models: { tt: K.models.tt, cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      ttA: { name: 'PLX-CRSS12', model: 'tt', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X', model: 'cdj', node: null, offset: [B, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, VZ] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, 0] }
    },
    desk: { min: [-1.18, -0.04, -0.46], max: [0.92, 0, 0.44] },
    overview: [[-1.14, 0, -0.3], [0.88, 0.42, 0.38]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.tt('ttA', A, 0, 'แผ่นเสียง', ['ttAOut', 'ttAGnd']),
      K.cdj('cdjB', B, 0, 'CDJ', ['cdjBOut']),
      K.a9({ use: PH.concat(LN, ['m1L', 'm1R', 'gndA', 'gndB']), traps: {
        line: { srcs: ['ttAOut'], msg: 'แผ่นเสียงเข้า LINE เสียงเบาและบางมาก · ต้องเข้า PHONO' },
        phono: { srcs: ['cdjBOut'], msg: 'CDJ เข้า PHONO เสียงดังเกินจนแตก · ต้องเข้า LINE' } } }),
      K.vm80('vmL', VL, VZ, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, 0, 'VM-80 ขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedMains().concat([
      { id: 'rr05', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr10', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'rr15', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่' },
      { id: 'g05', color: 'green', ends: ['GND', 'GND'], len: 0.5, label: 'สายกราวด์' },
      { id: 'g10', color: 'green', ends: ['GND', 'GND'], len: 1.0, label: 'สายกราวด์' }
    ]),
    pairs: [
      any('ttAOut', PH), any('cdjBOut', ['ch4Ln', 'ch3Ln', 'ch2Ln', 'ch1Ln']),
      { from: 'ttAGnd', to: 'gndB', srcs: ['ttAGnd'], also: [{ from: 'ttAGnd', to: 'gndA' }] }
    ],
    hum: { jacks: ['ch1PhL', 'ch2PhL', 'ch3PhL', 'ch4PhL'], gnd: ['gndA', 'gndB'], need: 1 },
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังขวา: เครื่องเล่นแผ่นเสียง PLX-CRSS12 ซ้าย DJM-A9 ตรงกลาง CDJ-3000X ขวา ลำโพง VM-80 ด้านนอก',
    advice: [
      { title: 'แต่ละเครื่องมีช่องของมัน', body: 'แผ่นเสียง = PHONO · CDJ = LINE', how: 'ดูป้ายบนมิกเซอร์' },
      { title: 'แผ่นเสียงต้องมีกราวด์', body: 'ไม่ต่อจะมีเสียงฮัม', how: 'GND → SIGNAL GND' },
      { title: 'สลับช่อง = ไม่ผ่าน', body: 'แผ่นเสียงเข้า LINE เบา · CDJ เข้า PHONO แตก', how: 'ฟังเสียงแล้วเช็กช่อง' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: PLX-CRSS12 · DJM-A9 · CDJ-3000X · VM-80 ×2',
      'ลำโพงต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: แผ่นเสียงเข้า PHONO พร้อมสายกราวด์ และ CDJ เข้า LINE',
    winMsg: 'แผ่นเสียงและ CDJ เข้ามิกเซอร์ถูกช่องแล้ว'
  };
});
