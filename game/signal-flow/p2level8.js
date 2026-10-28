/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 8 (4 เด็คผสมฟอร์แมต: พอร์ต LAN จำกัด)
   PLX-CRSS12 ซ้ายสุด + CDJ-3000X ×3 + DJM-A9 + สวิตช์ฮับ 4 พอร์ต (proc) · เสียงของ CDJ และลำโพงต่อไว้ให้แล้ว
   ผู้เล่นต่อ: แผ่นเสียง → PHONO + กราวด์ · LAN ของเครื่องที่ต้องลิงก์ (CDJ ×3 + มิกเซอร์ = 4 พอร์ตพอดี)
   แผ่นเสียงไม่มีพอร์ต LAN · ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level8 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var T = -0.975, A = -0.396, B = 0.396, C = 0.761, VL = -1.34, VR = 1.18, VZ = 0.22, HZ = -0.44;
  var PORTS = ['hub1', 'hub2', 'hub3', 'hub4'];
  function viaHub(to) { return { from: 'hub1', to: to, also: PORTS.slice(1).map(function (p) { return { from: p, to: to }; }) }; }
  return {
    id: 'p2-l8', phase: 2, number: 8, of: 14,
    title: '4 เด็คผสม: พอร์ต LAN จำกัด',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.5, 0.5, -0.71],
    models: { tt: K.models.tt, cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      tt: { name: 'PLX-CRSS12', model: 'tt', node: null, offset: [T, 0, 0] },
      cdjA: { name: 'CDJ-3000X 1', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X 2', model: 'cdj', node: null, offset: [B, 0, 0] },
      cdjC: { name: 'CDJ-3000X 3', model: 'cdj', node: null, offset: [C, 0, 0] },
      hub: { name: 'ฮับ LAN', proc: { kind: 'box', size: [0.18, 0.035, 0.12], color: 0x3a3f46 }, offset: [0.1, 0, HZ] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, VZ] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, VZ] }
    },
    desk: { min: [-1.52, -0.04, -0.6], max: [1.36, 0, 0.44] },
    overview: [[-1.48, 0, -0.54], [1.32, 0.42, 0.38]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.tt('tt', T, 0, 'แผ่นเสียง', ['ttOut', 'ttGnd']),
      K.cdj('cdjA', A, 0, 'CDJ 1', ['cdjAOut', 'cdjALink']),
      K.cdj('cdjB', B, 0, 'CDJ 2', ['cdjBOut', 'cdjBLink']),
      K.cdj('cdjC', C, 0, 'CDJ 3', ['cdjCOut', 'cdjCLink']),
      K.a9({ use: ['ch1Ph', 'ch2Ph', 'ch2Ln', 'ch3Ln', 'ch4Ln', 'ch1Ln', 'm1L', 'm1R', 'gndA', 'gndB', 'link'], traps: {
        line: { srcs: ['ttOut'], msg: 'แผ่นเสียงเข้า LINE เสียงเบาและบางมาก · ต้องเข้า PHONO' } } }),
      K.hub('hub', 0.1, HZ, 4, 0.18),
      K.vm80('vmL', VL, VZ, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, VZ, 'VM-80 ขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedMains().concat([
      { id: 'fxA', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่', fixed: ['cdjAOut', 'ch2Ln'] },
      { id: 'fxB', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่', fixed: ['cdjBOut', 'ch3Ln'] },
      { id: 'fxC', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่', fixed: ['cdjCOut', 'ch4Ln'] },
      { id: 'rr15', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่' },
      { id: 'rr20', color: 'black', ends: ['RCA2', 'RCA2'], len: 2.0, label: 'สาย RCA คู่' },
      { id: 'g15', color: 'green', ends: ['GND', 'GND'], len: 1.5, label: 'สายกราวด์' },
      { id: 'lan05', color: 'blue', ends: ['LAN', 'LAN'], len: 0.5 },
      { id: 'lan10a', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan10b', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan15', color: 'blue', ends: ['LAN', 'LAN'], len: 1.5 },
      { id: 'lan20', color: 'blue', ends: ['LAN', 'LAN'], len: 2.0 }
    ]),
    pairs: [
      { from: 'ttOut', to: 'ch1Ph', srcs: ['ttOut'], also: [{ from: 'ttOut', to: 'ch2Ph' }] },
      { from: 'ttGnd', to: 'gndB', srcs: ['ttGnd'], also: [{ from: 'ttGnd', to: 'gndA' }] },
      viaHub('cdjALink'), viaHub('link'), viaHub('cdjBLink'), viaHub('cdjCLink')
    ],
    hum: { jacks: ['ch1PhL', 'ch2PhL'], gnd: ['gndA', 'gndB'], need: 1 },
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังขวา: แผ่นเสียงซ้ายสุด CDJ-3000X สามเครื่อง DJM-A9 สวิตช์ฮับ 4 พอร์ตด้านหลัง',
    advice: [
      { title: 'ฮับมี 4 พอร์ต', body: 'CDJ 3 เครื่อง + มิกเซอร์ = 4 พอดี', how: 'แผ่นเสียงไม่มี LAN ไม่ต้องลิงก์' },
      { title: 'แผ่นเสียง → PHONO + กราวด์', body: 'CDJ ต่อเสียงไว้ให้แล้ว', how: 'เหลือ CH1 ว่างอยู่' },
      { title: 'สาย LAN เลือกความยาว', body: 'CDJ 3 อยู่ไกลฮับที่สุด', how: 'เส้นยาวให้เครื่องไกล' }
    ],
    notes: [
      'สวิตช์ฮับเป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง',
      'สายเสียงของ CDJ และลำโพงต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: ต่อแผ่นเสียงเข้ามิกเซอร์ (PHONO + กราวด์) และลิงก์ CDJ ทั้ง 3 เครื่องกับมิกเซอร์เข้าฮับ 4 พอร์ต',
    winMsg: 'ครบ 4 เด็ค · ลิงก์ครบทุกเครื่อง'
  };
});
