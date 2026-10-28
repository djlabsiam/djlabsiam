/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 14 (สอบรวม Phase 2: 3 เด็คผสม + LAN + กราวด์ + บูธ + PA + REC)
   PLX-CRSS12 ซ้ายสุด + CDJ-3000X ×2 + DJM-A9 + สวิตช์ฮับ 4 พอร์ต + กล่องสาย PA + เครื่องบันทึก + VM-80 ×2 (บูธ)
   ผู้เล่นต่อเองทั้งหมด (ไม่มีสายต่อไว้ให้) · กับดักทั้งหมดของ Phase นี้เปิดอยู่ · ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level14 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var T = -0.975, A = -0.396, B = 0.396, VL = -1.34, VR = 0.74, VZ = 0.22, HX = 0.3, HZ = -0.42, PZ = -0.56, RX = -0.45, RZ = -0.5;
  var PH = ['ch1Ph', 'ch2Ph', 'ch3Ph', 'ch4Ph'], LN = ['ch1Ln', 'ch2Ln', 'ch3Ln', 'ch4Ln'];
  var MASTER = ['m1L', 'm1R', 'm2L', 'm2R'], BOOTH = ['boothL', 'boothR'], PORTS = ['hub1', 'hub2', 'hub3', 'hub4'];
  function any(src, list) { return { from: src, to: list[0], srcs: [src], also: list.slice(1).map(function (p) { return { from: src, to: p }; }) }; }
  function viaHub(to) { return { from: 'hub1', to: to, also: PORTS.slice(1).map(function (p) { return { from: p, to: to }; }) }; }
  return {
    id: 'p2-l14', phase: 2, number: 14, of: 14,
    title: 'สอบรวม Phase 2: บูธคลับครบชุด',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.5, 0.5, -0.71],
    models: { tt: K.models.tt, cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      tt: { name: 'PLX-CRSS12', model: 'tt', node: null, offset: [T, 0, 0] },
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      hub: { name: 'ฮับ LAN', proc: { kind: 'box', size: [0.18, 0.035, 0.12], color: 0x3a3f46 }, offset: [HX, 0, HZ] },
      pa: { name: 'กล่องสาย PA', proc: { kind: 'box', size: [0.2, 0.09, 0.12], color: 0x30343b }, offset: [0, 0, PZ] },
      rec: { name: 'เครื่องบันทึก', proc: { kind: 'box', size: [0.2, 0.05, 0.15], color: 0x2e3238 }, offset: [RX, 0, RZ] },
      vmL: { name: 'VM-80 ซ้าย (บูธ)', model: 'vm80', node: null, offset: [VL, 0, VZ] },
      vmR: { name: 'VM-80 ขวา (บูธ)', model: 'vm80', node: null, offset: [VR, 0, 0] }
    },
    desk: { min: [-1.52, -0.04, -0.7], max: [0.92, 0, 0.44] },
    overview: [[-1.48, 0, -0.64], [0.88, 0.42, 0.38]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.tt('tt', T, 0, 'แผ่นเสียง', ['ttOut', 'ttGnd']),
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut', 'cdjALink', 'cdjADig']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut', 'cdjBLink', 'cdjBDig']),
      K.a9({ use: PH.concat(LN, ['m1L', 'm1R', 'm2', 'boothL', 'boothR', 'rec', 'gndA', 'gndB', 'link', 'dig1', 'dig2', 'dig3', 'dig4']), traps: {
        line: { srcs: ['ttOut'], msg: 'แผ่นเสียงเข้า LINE เสียงเบาและบางมาก · ต้องเข้า PHONO' },
        phono: { srcs: ['cdjAOut', 'cdjBOut'], msg: 'CDJ เข้า PHONO เสียงดังเกินจนแตก · ต้องเข้า LINE' } } }),
      K.hub('hub', HX, HZ, 4, 0.18),
      K.paBox('pa', 0, PZ),
      K.recorder('rec', RX, RZ),
      K.vm80('vmL', VL, VZ, 'VM-80 บูธซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, 0, 'VM-80 บูธขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: [
      { id: 'rr05', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr10', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'rr15', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่' },
      { id: 'rr10r', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'g15', color: 'green', ends: ['GND', 'GND'], len: 1.5, label: 'สายกราวด์' },
      { id: 'lan10a', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan10b', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan15', color: 'blue', ends: ['LAN', 'LAN'], len: 1.5 },
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'trs15', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 },
      { id: 'trs20', color: 'gray', ends: ['TRS', 'TRS'], len: 2.0 }
    ],
    pairs: [
      any('ttOut', PH), any('cdjAOut', ['ch2Ln', 'ch1Ln', 'ch3Ln', 'ch4Ln']), any('cdjBOut', ['ch3Ln', 'ch4Ln', 'ch2Ln', 'ch1Ln']),
      { from: 'ttGnd', to: 'gndB', srcs: ['ttGnd'], also: [{ from: 'ttGnd', to: 'gndA' }] },
      viaHub('cdjALink'), viaHub('link'), viaHub('cdjBLink'),
      { from: 'm1L', to: 'paL', srcs: MASTER }, { from: 'm1R', to: 'paR', srcs: MASTER },
      { from: 'boothL', to: 'vmLCombo', srcs: BOOTH }, { from: 'boothR', to: 'vmRCombo', srcs: BOOTH },
      { from: 'rec', to: 'recIn', alt: [{ from: 'm2', to: 'recIn' }] }
    ],
    hum: { jacks: ['ch1PhL', 'ch2PhL', 'ch3PhL', 'ch4PhL'], gnd: ['gndA', 'gndB'], need: 1 },
    sounds: [{ dev: 'pa', jacks: ['paL', 'paR'] }, { dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    altMsg: 'อัดได้ แต่ MASTER 2 เป็นช่องส่งไปลำโพง · ช่องสำหรับอัดคือ REC OUT',
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังขวา: แผ่นเสียงซ้ายสุด CDJ-3000X สองเครื่อง DJM-A9 ฮับ LAN กล่องสาย PA เครื่องบันทึก และลำโพงบูธ',
    advice: [
      { title: 'เด็ค: แผ่นเสียง → PHONO + กราวด์', body: 'CDJ → LINE', how: 'ช่องไหนก็ได้ เลือกที่ใกล้' },
      { title: 'LAN: CDJ ×2 + มิกเซอร์ → ฮับ', body: 'แผ่นเสียงไม่มี LAN', how: 'ฮับ 4 พอร์ต เหลือ 1' },
      { title: 'ขาออก 3 ทาง', body: 'MASTER → PA · BOOTH → มอนิเตอร์ · REC → เครื่องบันทึก', how: 'ดูหน้าที่ของช่อง' }
    ],
    notes: [
      'สอบรวม: ไม่มีสายต่อไว้ให้ ต่อเองทั้งหมด',
      'ฮับ กล่องสาย PA และเครื่องบันทึกเป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง'
    ],
    goal: 'ด่านนี้: ต่อบูธคลับให้ครบ เด็ค 3 เครื่อง ลิงก์ LAN กราวด์ PA มอนิเตอร์บูธ และเครื่องบันทึก',
    winMsg: 'บูธคลับพร้อมเปิดร้าน · ผ่าน Phase 2'
  };
});
