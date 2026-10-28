/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 6 (งานกลางแจ้ง ระยะไกล: แผ่นเสียง ×2 → XDJ-AZ → ม้วนสาย XLR 50 ม. ไป PA ปลายสนาม)
   PLX-CRSS12 ×2 (Battle position ชิด XDJ-AZ) · ม้วนสาย XLR 50 ม. (proc · ปลายทาง) หลังโต๊ะขวา · เจ้าของเลือกชุดนี้ 25 ต.ค.
   ตัวแปรใหม่: สายยาวหลายสิบเมตรต้องบาลานซ์ (MASTER 1 XLR) · RCA ไม่บาลานซ์ลากไกล = เสียงจี่และเบา (กับดัก)
   คำตอบ: แผ่นเสียง → CH3 / CH4 (LINE/PHONO) + กราวด์ทั้งสองเครื่อง → SIGNAL GND (ขั้วเดียว ซ้อนหางปลา 2 เส้น) · MASTER 1 L / R → ม้วนสาย L / R
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level6 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.629, B = 0.629, DX = 0.52, DZ = -0.48;
  var LONG = { srcs: ['m2', 'm2L', 'm2R'], msg: 'RCA ไม่บาลานซ์ลาก 50 ม. เสียงจี่และเบา · ใช้ MASTER 1 XLR' };
  function deck(src, first, other) { return { from: src, to: first, srcs: [src], also: [{ from: src, to: other }] }; }
  return {
    id: 'p3-l6', phase: 3, number: 6, of: 14,
    title: 'งานกลางแจ้ง: สายยาวต้องบาลานซ์',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { tt: K.models.tt, az: K.models.az },
    devices: {
      ttA: { name: 'PLX-CRSS12 ซ้าย', model: 'tt', node: null, offset: [A, 0, 0], rot: K.BATTLE },   // Battle position ชิด XDJ-AZ (เว้น 5 มม.)
      mix: { name: 'XDJ-AZ', model: 'az', node: null, offset: [0, 0, 0] },
      ttB: { name: 'PLX-CRSS12 ขวา', model: 'tt', node: null, offset: [B, 0, 0], rot: K.BATTLE },
      drum: { name: 'ม้วนสาย XLR 50 ม. → PA ปลายสนาม', proc: { kind: 'box', size: [0.2, 0.12, 0.12], color: 0x2a2d32 }, offset: [DX, 0, DZ] }
    },
    desk: { min: [-0.86, -0.04, -0.62], max: [0.86, 0, 0.32] },
    overview: [[-0.84, 0, -0.76], [0.84, 0.3, 0.28]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.tt('ttA', A, 0, 'แผ่นเสียงซ้าย', ['ttAOut', 'ttAGnd'], true),
      K.tt('ttB', B, 0, 'แผ่นเสียงขวา', ['ttBOut', 'ttBGnd'], true),
      K.az({ use: ['ch3', 'ch4', 'gnd', 'm1L', 'm1R', 'm2', 'boothL', 'boothR'] }),
      [{ id: 'gnd2', dev: 'mix', pos: [-0.0037, 0.0462, -0.1782], normal: K.REAR, type: 'GND', dir: 'in', usable: true, short: 'GND 2', name: 'SIGNAL GND (หางปลาเส้นที่ 2 ซ้อนขั้วเดียวกัน)' },
       { id: 'drL', dev: 'drum', pos: [DX + 0.04, 0.06, DZ - 0.06], normal: K.REAR, type: 'XLR', dir: 'in', ch: 'L', usable: true, short: 'L', name: 'ม้วนสาย 50 ม. · XLR IN L', trap: LONG },
       { id: 'drR', dev: 'drum', pos: [DX - 0.04, 0.06, DZ - 0.06], normal: K.REAR, type: 'XLR', dir: 'in', ch: 'R', usable: true, short: 'R', name: 'ม้วนสาย 50 ม. · XLR IN R', trap: LONG }]
    ),
    wires: [],
    cables: [
      { id: 'rr10', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'rr15', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่' },
      { id: 'g10', color: 'green', ends: ['GND', 'GND'], len: 1.0, label: 'สายกราวด์' },
      { id: 'g15', color: 'green', ends: ['GND', 'GND'], len: 1.5, label: 'สายกราวด์' },
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'rx10', color: 'black', ends: ['RCA2', 'XLR'], len: 1.0, label: 'สาย RCA คู่ → XLR' }
    ],
    pairs: [
      deck('ttAOut', 'ch3', 'ch4'), deck('ttBOut', 'ch4', 'ch3'),
      { from: 'ttAGnd', to: 'gnd', srcs: ['ttAGnd'], also: [{ from: 'ttAGnd', to: 'gnd2' }] },
      { from: 'ttBGnd', to: 'gnd2', srcs: ['ttBGnd'], also: [{ from: 'ttBGnd', to: 'gnd' }] },
      { from: 'm1L', to: 'drL', srcs: ['m1L'] },
      { from: 'm1R', to: 'drR', srcs: ['m1R'] }
    ],
    hum: { jacks: ['ch3L', 'ch4L'], gnd: ['gnd', 'gnd2'], need: 2 },
    sounds: [{ dev: 'drum', jacks: ['drL', 'drR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: XDJ-AZ ตรงกลาง PLX-CRSS12 สองข้างแบบ Battle position ม้วนสาย XLR ไปลำโพงปลายสนามด้านหลังขวา',
    advice: [
      { title: 'สายยาว = ต้องบาลานซ์', body: 'ลากหลายสิบเมตร สายไม่บาลานซ์จะจี่', how: 'MASTER 1 XLR → ม้วนสาย' },
      { title: 'แผ่นเสียงเข้า XDJ-AZ ได้', body: 'CH3 / CH4 สลับเป็น PHONO ได้', how: 'แผ่นเสียง → CH3 / CH4' },
      { title: 'กราวด์ 2 เส้น ขั้วเดียว', body: 'ซ้อนหางปลาที่ SIGNAL GND ได้', how: 'GND ทั้งสองเครื่อง → SIGNAL GND' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: PLX-CRSS12 ×2 · XDJ-AZ · ม้วนสายเป็นรูปทรงทั่วไป',
      'XDJ-AZ มี SIGNAL GND ขั้วเดียว (เห็นบนแผงหลังของโมเดล · หน้าสเปกทางการไม่ระบุ) ซ้อนหางปลา 2 เส้นได้',
      'ปลายม้วนสายอยู่ที่ลำโพง PA ปลายสนาม (ไม่อยู่บนโต๊ะ)'
    ],
    goal: 'ด่านนี้: ต่อแผ่นเสียงสองเครื่องเข้า XDJ-AZ พร้อมกราวด์ แล้วส่ง MASTER 1 เข้าม้วนสายยาวไปลำโพงปลายสนาม',
    winMsg: 'เสียงไปถึงลำโพงปลายสนามชัด ไม่จี่'
  };
});
