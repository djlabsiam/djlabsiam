/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 1 (บูธร้านเล็ก 2 เด็ค: ช่อง LINE ของมิกเซอร์)
   CDJ-3000X ×2 + DJM-A9 กลาง + ลำโพงหลัก VM-80 ×2 ด้านนอก · พิกัดช่องจาก ref/jacks-phase2.md (+ offset ของเครื่อง)
   CDJ → มิกเซอร์ ใช้สาย RCA คู่ (หัวคู่เสียบ L+R พร้อมกัน) · เด็คซ้ายเข้า CH1/CH2 · เด็คขวาเข้า CH3/CH4
   MASTER ของมิกเซอร์มีเสียงเมื่อช่องใดช่องหนึ่งได้สัญญาณ (via รายการ) · PHONO ปิดไว้พร้อมคำอธิบาย (เรื่อง PHONO อยู่ด่าน 3)
   ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level1 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1], A = -0.396, B = 0.396, VL = -0.74, VR = 0.74, MZ = -0.1946, CZ = -0.1771, VZ = -0.1625;
  var DECKS = ['cdjAOut', 'cdjBOut'], MASTER = ['m1L', 'm1R'];
  var LINES_L = ['ch1LnL', 'ch2LnL', 'ch3LnL', 'ch4LnL'], LINES_R = ['ch1LnR', 'ch2LnR', 'ch3LnR', 'ch4LnR'];
  var PHONO_HINT = 'PHONO สำหรับเครื่องเล่นแผ่นเสียง · CDJ ต่อช่อง LINE';
  function cdj(d, x, name) { // ช่องหลัง CDJ-3000X หนึ่งเครื่อง (d = id เครื่อง, x = offset)
    return [
      { id: d + 'OutR', dev: d, pos: [x + 0.0880, 0.0503, CZ], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', color: 'red', usable: true, short: 'R', name: name + ' · AUDIO OUT R (แดง)' },
      { id: d + 'OutL', dev: d, pos: [x + 0.0729, 0.0503, CZ], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', color: 'white', usable: true, short: 'L', name: name + ' · AUDIO OUT L (ขาว)' },
      { id: d + 'Out', dev: d, pos: [x + 0.0805, 0.0503, CZ], normal: REAR, type: 'RCA2', dir: 'out', usable: true, covers: [d + 'OutL', d + 'OutR'], name: name + ' · AUDIO OUT L + R' },
      { id: d + 'Dig', dev: d, pos: [x + 0.0510, 0.0503, CZ], normal: REAR, type: 'COAX', dir: 'out', usable: false, short: 'DIG', name: name + ' · DIGITAL OUT', hint: 'ช่องดิจิทัล ด่านนี้ใช้ AUDIO OUT' },
      { id: d + 'Link', dev: d, pos: [x - 0.0060, 0.0503, CZ], normal: REAR, type: 'LAN', dir: 'out', usable: false, short: 'LINK', name: name + ' · LINK (LAN)', hint: 'สาย LAN ไว้ลิงก์เครื่อง (ด่าน 2)' },
      { id: d + 'Usb', dev: d, pos: [x - 0.0800, 0.0387, -0.1651], normal: REAR, type: 'USB', dir: 'out', usable: false, short: 'USB', name: name + ' · USB', hint: 'ช่อง USB ไม่ใช่ช่องเสียง' }
    ];
  }
  function ch(n, x) { // ช่อง CHn ของ DJM-A9: LINE (ใช้ได้) + PHONO (ปิด)
    var L = 'CH' + n + ' LINE';
    return [
      { id: 'ch' + n + 'LnL', dev: 'mix', pos: [x, 0.0659, MZ], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'L', name: L + ' L (ขาว)' },
      { id: 'ch' + n + 'LnR', dev: 'mix', pos: [x, 0.0517, MZ], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'R', name: L + ' R (แดง)' },
      { id: 'ch' + n + 'Ln', dev: 'mix', pos: [x, 0.0588, MZ], normal: REAR, type: 'RCA2', dir: 'in', usable: true, covers: ['ch' + n + 'LnL', 'ch' + n + 'LnR'], name: L + ' L + R' },
      { id: 'ch' + n + 'Ph', dev: 'mix', pos: [x + 0.0136, 0.0588, MZ], normal: REAR, type: 'RCA2', dir: 'in', usable: false, short: 'PH', name: 'CH' + n + ' PHONO', hint: PHONO_HINT }
    ];
  }
  function off(id, pos, type, name, hint) { return { id: id, dev: 'mix', pos: [pos[0], pos[1], MZ], normal: REAR, type: type, dir: 'out', usable: false, short: type, name: name, hint: hint }; }
  return {
    id: 'p2-l1', phase: 2, number: 1, of: 14,
    title: 'บูธร้านเล็ก 2 เด็ค: CDJ → ช่อง LINE',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: 'models/cdj_3000x.glb', a9: 'models/djm_a9.glb', vm80: 'models/vm_80.glb' },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, 0] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, 0] }
    },
    desk: { min: [-0.92, -0.04, -0.46], max: [0.92, 0, 0.32] },
    overview: [[-0.88, 0, -0.3], [0.88, 0.42, 0.12]],
    typeLabels: { RCA: 'RCA', RCA2: 'RCA คู่ (ขาว+แดง)', XLR: 'XLR', TRS: 'TRS 6.35 มม.', TS: 'TS 6.35 มม.', COMBO: 'คอมโบ XLR/TRS', COAX: 'ดิจิทัล (โคแอกเชียล)', LAN: 'LAN', USB: 'USB', GND: 'กราวด์' },
    jacks: [].concat(
      cdj('cdjA', A, 'CDJ ซ้าย'),
      cdj('cdjB', B, 'CDJ ขวา'),
      ch(1, -0.0789), ch(2, -0.0390), ch(3, 0.0009), ch(4, 0.0408),
      [
        { id: 'm1L', dev: 'mix', pos: [0.0259, 0.0272, MZ], normal: REAR, type: 'XLR', dir: 'out', ch: 'L', usable: true, via: LINES_L, short: 'M1 L', name: 'MASTER 1 · XLR L (บาลานซ์)' },
        { id: 'm1R', dev: 'mix', pos: [0.0504, 0.0272, MZ], normal: REAR, type: 'XLR', dir: 'out', ch: 'R', usable: true, via: LINES_R, short: 'M1 R', name: 'MASTER 1 · XLR R (บาลานซ์)' },
        off('m2', [0.0801, 0.0255], 'RCA2', 'MASTER 2 · RCA', 'ด่านนี้ใช้ MASTER 1 (XLR)'),
        off('rec', [0.0932, 0.0255], 'RCA2', 'REC OUT', 'ช่องอัดเสียง (ด่าน 10)'),
        off('boothR', [-0.0003, 0.0186], 'TRS', 'BOOTH R', 'BOOTH ไว้มอนิเตอร์ดีเจ ด่านนี้ต่อลำโพงหลัก'),
        off('boothL', [-0.0191, 0.0186], 'TRS', 'BOOTH L (MONO)', 'BOOTH ไว้มอนิเตอร์ดีเจ ด่านนี้ต่อลำโพงหลัก'),
        off('send', [0.1236, 0.0180], 'TS', 'SEND', 'ส่งไปเอฟเฟกต์ภายนอก ด่านนี้ไม่ใช้'),
        off('ret', [0.1236, 0.0511], 'TS', 'RETURN', 'รับจากเอฟเฟกต์ภายนอก ด่านนี้ไม่ใช้'),
        off('digIn', [-0.0895, 0.0169], 'COAX', 'DIGITAL CH IN', 'ช่องดิจิทัล ด่านนี้ใช้ LINE'),
        off('digOut', [-0.0447, 0.0169], 'COAX', 'DIGITAL MASTER OUT', 'ช่องดิจิทัล ด่านนี้ใช้ MASTER 1'),
        off('link', [-0.1331, 0.0197], 'LAN', 'LINK (LAN)', 'สาย LAN ไว้ลิงก์เครื่อง (ด่าน 2)'),
        off('mic1', [-0.1371, 0.0591], 'COMBO', 'MIC 1', 'ช่องไมโครโฟน (ด่าน 11)'),
        off('mic2', [-0.1012, 0.0539], 'TRS', 'MIC 2', 'ช่องไมโครโฟน (ด่าน 11)'),
        off('gnd', [0.0738, 0.0767], 'GND', 'SIGNAL GND', 'ขั้วกราวด์ไว้ต่อเครื่องเล่นแผ่นเสียง (ด่าน 4)'),
        { id: 'vmLCombo', dev: 'vmL', pos: [VL + 0.0475, 0.2346, VZ], normal: REAR, type: 'COMBO', accepts: ['XLR', 'TRS'], dir: 'in', ch: 'L', usable: true, short: 'IN', name: 'VM-80 ซ้าย · INPUT คอมโบ XLR/TRS' },
        { id: 'vmLRca', dev: 'vmL', pos: [VL + 0.0475, 0.2015, VZ], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', usable: false, short: 'RCA', name: 'VM-80 ซ้าย · INPUT RCA', hint: 'ด่านนี้ใช้ช่องคอมโบ (บาลานซ์)' },
        { id: 'vmRCombo', dev: 'vmR', pos: [VR + 0.0475, 0.2346, VZ], normal: REAR, type: 'COMBO', accepts: ['XLR', 'TRS'], dir: 'in', ch: 'R', usable: true, short: 'IN', name: 'VM-80 ขวา · INPUT คอมโบ XLR/TRS' },
        { id: 'vmRRca', dev: 'vmR', pos: [VR + 0.0475, 0.2015, VZ], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', usable: false, short: 'RCA', name: 'VM-80 ขวา · INPUT RCA', hint: 'ด่านนี้ใช้ช่องคอมโบ (บาลานซ์)' }
      ]
    ),
    wires: [],
    cables: [
      { id: 'rr05', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr10a', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'rr10b', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'xx10', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15a', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx15b', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 }
    ],
    pairs: [
      { from: 'cdjAOut', to: 'ch1Ln', srcs: DECKS, also: [{ from: 'cdjAOut', to: 'ch2Ln' }] },
      { from: 'cdjBOut', to: 'ch4Ln', srcs: DECKS, also: [{ from: 'cdjBOut', to: 'ch3Ln' }] },
      { from: 'm1L', to: 'vmLCombo', srcs: MASTER },
      { from: 'm1R', to: 'vmRCombo', srcs: MASTER }
    ],
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-A9 ตรงกลาง ลำโพง VM-80 ด้านนอก',
    advice: [
      { title: 'CDJ → ช่อง LINE', body: 'เสียงจาก CDJ เป็นระดับ LINE', how: 'AUDIO OUT → CH LINE' },
      { title: 'สาย RCA คู่', body: 'หัวคู่เสียบ L + R พร้อมกัน', how: 'แตะช่อง L หรือ R ก็ได้' },
      { title: 'เด็คซ้าย → ช่องซ้าย', body: 'จำง่ายตอนเล่น', how: 'ซ้าย CH1/CH2 · ขวา CH3/CH4' },
      { title: 'MASTER → ลำโพงหลัก', body: 'มิกเซอร์รวมเสียงแล้วส่งออก', how: 'MASTER 1 XLR → VM-80' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-3000X ×2 · DJM-A9 · VM-80 ×2',
      'ด่านนี้ใช้สาย RCA คู่ (ขาว+แดงติดกัน) แบบที่ใช้ในบูธจริง',
      'ช่องที่ไม่ใช้ในด่านนี้แตะดูคำอธิบายได้'
    ],
    goal: 'ด่านนี้: CDJ สองเครื่องเข้าช่อง LINE ของมิกเซอร์ แล้วส่ง MASTER ไปลำโพงหลัก',
    winMsg: 'เด็คทั้งสองเข้ามิกเซอร์ ลำโพงหลักมีเสียงครบแล้ว'
  };
});
