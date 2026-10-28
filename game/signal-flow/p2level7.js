/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 7 (3 เด็ค: เลือกช่องให้เหมาะ · งบสาย)
   PLX-CRSS12 ซ้ายสุด + CDJ-3000X ×2 + DJM-A9 (4 ช่อง) · ลำโพงต่อไว้ให้แล้ว
   แต่ละเด็คเข้าช่องไหนก็ได้ตามชนิด (แผ่นเสียง → PHONO · CDJ → LINE) แต่มีงบสาย → ต้องเลือกช่องที่ใกล้เครื่องนั้น
   กับดัก: สลับ PHONO/LINE · ไม่ต่อกราวด์ = ฮัม · ค่าความยาวสายและงบเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level7 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var T = -0.975, A = -0.396, B = 0.396, VL = -1.34, VR = 0.74, VZ = 0.22;
  var PH = ['ch1Ph', 'ch2Ph', 'ch3Ph', 'ch4Ph'], LN = ['ch1Ln', 'ch2Ln', 'ch3Ln', 'ch4Ln'];
  function any(src, list) { return { from: src, to: list[0], srcs: [src], also: list.slice(1).map(function (p) { return { from: src, to: p }; }) }; }
  return {
    id: 'p2-l7', phase: 2, number: 7, of: 14,
    title: '3 เด็ค: เลือกช่องให้เหมาะ',
    unitsPerM: 1, slack: 1.5, budget: 4.5,
    camDir: [0.5, 0.5, -0.71],
    models: { tt: K.models.tt, cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      tt: { name: 'PLX-CRSS12', model: 'tt', node: null, offset: [T, 0, 0] },
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, VZ] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, 0] }
    },
    desk: { min: [-1.52, -0.04, -0.46], max: [0.92, 0, 0.44] },
    overview: [[-1.48, 0, -0.3], [0.88, 0.42, 0.38]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.tt('tt', T, 0, 'แผ่นเสียง', ['ttOut', 'ttGnd']),
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.a9({ use: PH.concat(LN, ['m1L', 'm1R', 'gndA', 'gndB']), traps: {
        line: { srcs: ['ttOut'], msg: 'แผ่นเสียงเข้า LINE เสียงเบาและบางมาก · ต้องเข้า PHONO' },
        phono: { srcs: ['cdjAOut', 'cdjBOut'], msg: 'CDJ เข้า PHONO เสียงดังเกินจนแตก · ต้องเข้า LINE' } } }),
      K.vm80('vmL', VL, VZ, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, 0, 'VM-80 ขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedMains().concat([
      { id: 'rr05', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr10a', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'rr10b', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'rr15', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่' },
      { id: 'rr20', color: 'black', ends: ['RCA2', 'RCA2'], len: 2.0, label: 'สาย RCA คู่' },
      { id: 'g10', color: 'green', ends: ['GND', 'GND'], len: 1.0, label: 'สายกราวด์' },
      { id: 'g15', color: 'green', ends: ['GND', 'GND'], len: 1.5, label: 'สายกราวด์' }
    ]),
    pairs: [
      any('ttOut', PH), any('cdjAOut', ['ch2Ln', 'ch1Ln', 'ch3Ln', 'ch4Ln']), any('cdjBOut', ['ch4Ln', 'ch3Ln', 'ch2Ln', 'ch1Ln']),
      { from: 'ttGnd', to: 'gndB', srcs: ['ttGnd'], also: [{ from: 'ttGnd', to: 'gndA' }] }
    ],
    hum: { jacks: ['ch1PhL', 'ch2PhL', 'ch3PhL', 'ch4PhL'], gnd: ['gndA', 'gndB'], need: 1 },
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังขวา: แผ่นเสียง PLX-CRSS12 ซ้ายสุด CDJ-3000X สองเครื่อง DJM-A9 ตรงกลาง',
    advice: [
      { title: 'มิกเซอร์ 4 ช่อง เด็ค 3 เครื่อง', body: 'เหลือว่าง 1 ช่อง', how: 'เครื่องไหนอยู่ใกล้ช่องไหน ใช้ช่องนั้น' },
      { title: 'มีงบสาย', body: 'สายยาวเกินจำเป็น = เกินงบ', how: 'เลือกช่องใกล้ + สายสั้นที่ถึง' },
      { title: 'แผ่นเสียง → PHONO + กราวด์', body: 'CDJ → LINE', how: 'เหมือนด่านก่อนหน้า' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: PLX-CRSS12 · CDJ-3000X ×2 · DJM-A9 · VM-80 ×2',
      'ลำโพงต่อไว้ให้แล้ว · งบสายนับเฉพาะสายที่ผู้เล่นต่อ'
    ],
    goal: 'ด่านนี้: ต่อเด็คทั้ง 3 เครื่องเข้ามิกเซอร์ให้ถูกชนิดช่อง และไม่เกินงบสาย',
    winMsg: 'เด็คทั้ง 3 เครื่องเข้ามิกเซอร์ครบ ไม่เกินงบ'
  };
});
