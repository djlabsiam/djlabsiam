/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 6 (DVS: แผ่นเสียง → มิกเซอร์ → แล็ปท็อปผ่าน USB)
   PLX-CRSS12 ×2 + DJM-S11 กลาง + แล็ปท็อปหลังโต๊ะ (proc) · ลำโพง VM-80 ต่อไว้ให้แล้ว
   ข้อเท็จจริง (ทีมค้นข้อมูล 25 ต.ค.): DJM-S11 มี PHONO ×2 / LINE ×2 · USB-B ×2 ต่อคอมพิวเตอร์ได้ 2 เครื่อง · USB-A ×2 ไว้ต่อคอนโทรลเลอร์ ·
   ใช้ DVS ของ rekordbox / Serato · PLX-CRSS12 มี PHONO OUT + SIGNAL GND · USB-C ของ PLX-CRSS12 ใช้ต่อคอมตอนใช้ Performance Pads (ด่านนี้ไม่ใช้)
   คำตอบ: แผ่นเสียง → PHONO (+ กราวด์) · USB ของมิกเซอร์ → แล็ปท็อป (ส่งสัญญาณแผ่นไปซอฟต์แวร์ และรับเสียงกลับมาที่มิกเซอร์)
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level6 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.315, B = 0.315, VL = -0.94, VR = 0.94, VZ = 0.22, LX = -0.3, LZ = -0.52;
  var TTS = ['ttAOut', 'ttBOut'], USB = ['usbA', 'usbB'];
  function deck(src, first, other) { return { from: src, to: first, srcs: [src], also: [{ from: src, to: other }] }; }
  return {
    id: 'p2-l6', phase: 2, number: 6, of: 14,
    title: 'DVS: แผ่นเสียง → มิกเซอร์ → แล็ปท็อป',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.35, 0.6, -0.72],   // มุมนี้ขั้วกราวด์ฝั่ง CH2 ไม่ซ้อนกับช่อง PHONO บนจอ
    models: { tt: K.models.tt, s11: K.models.s11, vm80: K.models.vm80 },
    devices: {
      ttA: { name: 'PLX-CRSS12 ซ้าย', model: 'tt', node: null, offset: [A, 0, 0], rot: K.BATTLE },   // Battle position ชิดมิกเซอร์ (เว้น 5 มม.)
      mix: { name: 'DJM-S11', model: 's11', node: null, offset: [0, 0, 0] },
      ttB: { name: 'PLX-CRSS12 ขวา', model: 'tt', node: null, offset: [B, 0, 0], rot: K.BATTLE },
      lap: { name: 'แล็ปท็อป', proc: { kind: 'laptop', size: [0.31, 0.2, 0.215] }, offset: [LX, 0, LZ] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, VZ] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, VZ] }
    },
    desk: { min: [-1.14, -0.04, -0.7], max: [1.14, 0, 0.44] },
    overview: [[-1.1, 0, -0.64], [1.1, 0.42, 0.38]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.tt('ttA', A, 0, 'แผ่นเสียงซ้าย', ['ttAOut', 'ttAGnd'], true),
      K.tt('ttB', B, 0, 'แผ่นเสียงขวา', ['ttBOut', 'ttBGnd'], true),
      K.s11({ use: ['ch1Ph', 'ch2Ph', 'ch1Ln', 'ch2Ln', 'm1L', 'm1R', 'usbA', 'usbB', 'gndA', 'gndB'],
        traps: { line: { srcs: TTS, msg: 'แผ่นเสียงเข้า LINE เสียงเบาและบางมาก · ต้องเข้า PHONO' } } }),
      K.laptop('lap', LX, LZ, ['lap1', 'lap2']),
      K.vm80('vmL', VL, VZ, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, VZ, 'VM-80 ขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedMains().concat([
      { id: 'rr05', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr10', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่' },
      { id: 'rr15', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่' },
      { id: 'g05', color: 'green', ends: ['GND', 'GND'], len: 0.5, label: 'สายกราวด์' },
      { id: 'g10', color: 'green', ends: ['GND', 'GND'], len: 1.0, label: 'สายกราวด์' },
      { id: 'g15', color: 'green', ends: ['GND', 'GND'], len: 1.5, label: 'สายกราวด์' },
      { id: 'ubc10', color: 'black', ends: ['USB-B', 'USB-C'], len: 1.0 },
      { id: 'uac10', color: 'black', ends: ['USB-A', 'USB-C'], len: 1.0 }
    ]),
    pairs: [
      deck('ttAOut', 'ch1Ph', 'ch2Ph'), deck('ttBOut', 'ch2Ph', 'ch1Ph'),
      { from: 'ttAGnd', to: 'gndB', srcs: ['ttAGnd'], also: [{ from: 'ttAGnd', to: 'gndA' }] },
      { from: 'ttBGnd', to: 'gndA', srcs: ['ttBGnd'], also: [{ from: 'ttBGnd', to: 'gndB' }] },
      { from: 'lap1', to: 'usbA', also: [{ from: 'lap1', to: 'usbB' }, { from: 'lap2', to: 'usbA' }, { from: 'lap2', to: 'usbB' }] }
    ],
    hum: { jacks: ['ch1PhL', 'ch2PhL'], gnd: ['gndA', 'gndB'], need: 2 },
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังขวา: PLX-CRSS12 สองข้าง DJM-S11 ตรงกลาง แล็ปท็อปด้านหลัง ลำโพง VM-80 ด้านหน้า',
    advice: [
      { title: 'DVS = ใช้แผ่นคุมเพลงในคอม', body: 'แผ่นไทม์โค้ดส่งตำแหน่ง/ความเร็วให้ซอฟต์แวร์', how: 'แผ่นเสียง → PHONO ของมิกเซอร์' },
      { title: 'USB = สายเส้นสำคัญ', body: 'ส่งสัญญาณแผ่นไปคอม และรับเพลงกลับมามิกเซอร์', how: 'USB ของมิกเซอร์ → แล็ปท็อป' },
      { title: 'หัว USB ต้องตรง', body: 'มิกเซอร์เป็น USB-B แล็ปท็อปเป็น USB-C', how: 'ดูหัวทั้งสองฝั่งของสาย' },
      { title: 'อย่าลืมกราวด์', body: 'ไม่ต่อจะมีเสียงฮัม', how: 'GND → SIGNAL GND' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: PLX-CRSS12 ×2 · DJM-S11 · VM-80 ×2 · แล็ปท็อปเป็นรูปทรงทั่วไป',
      'DJM-S11 มี USB-B สองช่อง ต่อคอมได้สองเครื่อง (ใช้ช่องไหนก็ได้)',
      'USB-C ของ PLX-CRSS12 ใช้ตอนเล่น Performance Pads กับซอฟต์แวร์ DJ ด่านนี้ไม่ต้องใช้'
    ],
    goal: 'ด่านนี้: แผ่นเสียงเข้า PHONO พร้อมกราวด์ และต่อ USB จากมิกเซอร์เข้าแล็ปท็อป',
    winMsg: 'ชุด DVS พร้อมเล่นแล้ว'
  };
});
