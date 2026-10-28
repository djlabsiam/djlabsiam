/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 2 (ลิงก์ CDJ: สาย LAN ผ่านสวิตช์ฮับ)
   ชุดเดียวกับด่าน 1 (CDJ-3000X ×2 + DJM-A9 + VM-80 ×2) · สายเสียงต่อไว้ให้แล้ว · ด่านนี้ต่อแค่สาย LAN
   ข้อเท็จจริง (ทีมค้นข้อมูล 25 ต.ค.): DJM-A9 มีพอร์ต LAN 1 พอร์ต · CDJ สองเครื่องต่อ LAN ตรงกันได้ แต่ถ้ามีมิกเซอร์ด้วยหรือ 3 เครื่องขึ้นไปต้องใช้สวิตช์ฮับ
   กลไก: ช่อง LINK ของทุกเครื่องเป็น "in" พอร์ตฮับเป็น "out" → ต่อเครื่องถึงเครื่องตรงๆ ไม่ได้ (same-direction) · แต่ละเครื่องต้องได้สายจากฮับ (คู่ละเครื่อง)
   สวิตช์ฮับเป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง · ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level2 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.396, B = 0.396, VL = -0.74, VR = 0.74, HZ = -0.42;
  var PORTS = ['hub1', 'hub2', 'hub3', 'hub4', 'hub5'];
  function viaHub(to) { return { from: 'hub1', to: to, also: PORTS.slice(1).map(function (p) { return { from: p, to: to }; }) }; }
  return {
    id: 'p2-l2', phase: 2, number: 2, of: 14,
    title: 'ลิงก์ CDJ: สาย LAN ผ่านสวิตช์ฮับ',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, 0] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, 0] },
      hub: { name: 'ฮับ LAN', proc: { kind: 'box', size: [0.22, 0.035, 0.12], color: 0x3a3f46 }, offset: [0, 0, HZ] }
    },
    desk: { min: [-0.92, -0.04, -0.56], max: [0.92, 0, 0.32] },
    overview: [[-0.88, 0, -0.5], [0.88, 0.42, 0.12]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut', 'cdjALink']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut', 'cdjBLink']),
      K.a9({ use: ['ch2Ln', 'ch3Ln', 'm1L', 'm1R', 'link'] }),
      K.vm80('vmL', VL, 0, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, 0, 'VM-80 ขวา', 'R', ['vmRCombo']),
      K.hub('hub', 0, HZ, 5, 0.22)
    ),
    wires: [],
    cables: [
      { id: 'fxA', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่', fixed: ['cdjAOut', 'ch2Ln'] },
      { id: 'fxB', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่', fixed: ['cdjBOut', 'ch3Ln'] }
    ].concat(K.fixedMains(), [
      { id: 'lan05', color: 'blue', ends: ['LAN', 'LAN'], len: 0.5 },
      { id: 'lan10a', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan10b', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan20', color: 'blue', ends: ['LAN', 'LAN'], len: 2.0 }
    ]),
    pairs: [viaHub('cdjALink'), viaHub('link'), viaHub('cdjBLink')],
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-A9 ตรงกลาง สวิตช์ฮับ LAN ด้านหลัง ลำโพง VM-80 ด้านนอก',
    advice: [
      { title: 'LAN = ลิงก์ข้อมูล ไม่ใช่เสียง', body: 'เครื่องแชร์เพลง/BPM ถึงกัน', how: 'เสียงยังเดินสาย RCA เหมือนเดิม' },
      { title: 'มิกเซอร์มีพอร์ต LAN พอร์ตเดียว', body: 'ต่อหลายเครื่องต้องมีฮับกลาง', how: 'ทุกเครื่อง → สวิตช์ฮับ' },
      { title: 'ฮับวางหลังมิกเซอร์', body: 'สายสั้นพอ ไม่พาดผ่านเครื่อง', how: 'เลือกความยาวให้พอดี' }
    ],
    notes: [
      'สายเสียงและลำโพงต่อไว้ให้แล้ว ด่านนี้ฝึกสาย LAN',
      'สวิตช์ฮับเป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง',
      'CDJ สองเครื่องต่อ LAN ตรงกันได้ แต่เมื่อมีมิกเซอร์ร่วมด้วยต้องต่อผ่านฮับ'
    ],
    goal: 'ด่านนี้: ต่อ CDJ ทั้งสองเครื่องและมิกเซอร์เข้าสวิตช์ฮับ',
    winMsg: 'CDJ สองเครื่องและมิกเซอร์ลิงก์กันแล้ว'
  };
});
