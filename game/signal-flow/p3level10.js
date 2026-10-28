/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 10 (ระบบเสียงใหญ่: มิกเซอร์ → โปรเซสเซอร์ → แอมป์ → ลำโพงพาสซีฟ)
   CDJ-3000X ×2 + DJM-V10 (เสียง CDJ ต่อไว้แล้ว) · แร็กหลังโต๊ะขวา: โปรเซสเซอร์ลำโพง (1U) วางบนแอมป์ (2U) · ลำโพงพาสซีฟสองข้าง (proc)
   ตัวแปรใหม่: ลำดับชั้นสัญญาณ — ระดับไลน์ (XLR) ไปถึงแอมป์ แล้วจึงเป็นระดับลำโพง (สายลำโพง speakON) · โปรเซสเซอร์ทำ EQ / ลิมิตเตอร์ป้องกันลำโพง
   คำตอบ: MASTER 1 L / R → PROC IN A / B · PROC OUT A / B → AMP IN A / B · AMP OUT A / B → ลำโพงซ้าย / ขวา · MASTER ตรงเข้าแอมป์ = กับดัก
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level10 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.414, B = 0.414, RX = 0.4, RZ = -0.48, AH = 0.088, SX = 0.86, SZ = 0.05, SH = 0.36;
  var REAR = K.REAR, SKIP = { srcs: ['m1L', 'm1R', 'boothL', 'boothR'], msg: 'ข้ามโปรเซสเซอร์ = ไม่มี EQ / ลิมิตเตอร์ป้องกันลำโพง · ผ่านโปรเซสเซอร์ก่อน' };
  function rj(id, dev, dx, y, z, type, dir, ch, via, name, trap) { return { id: id, dev: dev, pos: [RX + dx, y, z], normal: REAR, type: type, accepts: type === 'XLR' && dir === 'in' ? ['XLR', 'XLRM'] : undefined, dir: dir, ch: ch, via: via, usable: true, short: name.split(' ').slice(-2).join(' '), name: name, trap: trap }; }
  var PY = AH + 0.022, PZ = RZ - 0.11, AY = 0.044, AZ = RZ - 0.125;
  return {
    id: 'p3-l10', phase: 3, number: 10, of: 14,
    title: 'ระบบใหญ่: มิกเซอร์ → โปรเซสเซอร์ → แอมป์ → ลำโพง',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, v10: K.models.v10 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-V10', model: 'v10', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      amp: { name: '', proc: { kind: 'amp', size: [0.36, AH, 0.25], color: 0x24272c }, offset: [RX, 0, RZ] },   // ชื่อรวมอยู่ที่ป้ายโปรเซสเซอร์ด้านบน (แยกกันป้ายจะซ้อน)
      proc: { name: 'แร็ก: โปรเซสเซอร์ (บน) · แอมป์ (ล่าง)', proc: { kind: 'box', size: [0.36, 0.044, 0.22], color: 0x2e3238 }, offset: [RX, AH, RZ] },
      spkL: { name: 'ลำโพงพาสซีฟซ้าย', proc: { kind: 'passive', size: [0.24, SH, 0.24], color: 0x24272c }, offset: [-SX, 0, SZ] },
      spkR: { name: 'ลำโพงพาสซีฟขวา', proc: { kind: 'passive', size: [0.24, SH, 0.24], color: 0x24272c }, offset: [SX, 0, SZ] }
    },
    desk: { min: [-1.04, -0.04, -0.68], max: [1.04, 0, 0.3] },
    overview: [[-1.02, 0, -0.82], [1.02, 0.42, 0.26]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.v10({ use: ['ch3Ln', 'ch4Ln', 'm1L', 'm1R', 'boothL', 'boothR'] }),
      [rj('pInA', 'proc', 0.12, PY, PZ, 'XLR', 'in', 'L', undefined, 'โปรเซสเซอร์ · IN A'),
       rj('pInB', 'proc', 0.06, PY, PZ, 'XLR', 'in', 'R', undefined, 'โปรเซสเซอร์ · IN B'),
       rj('pOutA', 'proc', -0.02, PY, PZ, 'XLR', 'out', 'L', 'pInA', 'โปรเซสเซอร์ · OUT A'),
       rj('pOutB', 'proc', -0.08, PY, PZ, 'XLR', 'out', 'R', 'pInB', 'โปรเซสเซอร์ · OUT B'),
       rj('aInA', 'amp', 0.12, AY, AZ, 'XLR', 'in', 'L', undefined, 'แอมป์ · IN A', SKIP),
       rj('aInB', 'amp', 0.06, AY, AZ, 'XLR', 'in', 'R', undefined, 'แอมป์ · IN B', SKIP),
       rj('aOutA', 'amp', -0.04, AY, AZ, 'SPKC', 'out', 'L', 'aInA', 'แอมป์ · SPEAKER OUT A'),
       rj('aOutB', 'amp', -0.10, AY, AZ, 'SPKC', 'out', 'R', 'aInB', 'แอมป์ · SPEAKER OUT B'),
       { id: 'spkLIn', dev: 'spkL', pos: [-SX, 0.12, SZ - 0.12], normal: REAR, type: 'SPKC', dir: 'in', ch: 'L', usable: true, short: 'IN', name: 'ลำโพงพาสซีฟซ้าย · ขั้วสายลำโพง (speakON)' },
       { id: 'spkRIn', dev: 'spkR', pos: [SX, 0.12, SZ - 0.12], normal: REAR, type: 'SPKC', dir: 'in', ch: 'R', usable: true, short: 'IN', name: 'ลำโพงพาสซีฟขวา · ขั้วสายลำโพง (speakON)' }]
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch3Ln', 1.0], ['cdjB', 'ch4Ln', 1.0]]).concat([
      { id: 'xx05a', color: 'black', ends: ['XLR', 'XLR'], len: 0.5 },
      { id: 'xx05b', color: 'black', ends: ['XLR', 'XLR'], len: 0.5 },
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'sp10', color: 'blue', ends: ['SPKC', 'SPKC'], len: 1.0, label: 'สายลำโพง speakON' },
      { id: 'sp15', color: 'blue', ends: ['SPKC', 'SPKC'], len: 1.5, label: 'สายลำโพง speakON' },
      { id: 'sp25', color: 'blue', ends: ['SPKC', 'SPKC'], len: 2.5, label: 'สายลำโพง speakON' }
    ]),
    pairs: [
      { from: 'm1L', to: 'pInA', srcs: ['m1L'] }, { from: 'm1R', to: 'pInB', srcs: ['m1R'] },
      { from: 'pOutA', to: 'aInA', srcs: ['pOutA'] }, { from: 'pOutB', to: 'aInB', srcs: ['pOutB'] },
      { from: 'aOutA', to: 'spkLIn', srcs: ['aOutA'] }, { from: 'aOutB', to: 'spkRIn', srcs: ['aOutB'] }
    ],
    sounds: [{ dev: 'spkL', jacks: ['spkLIn'] }, { dev: 'spkR', jacks: ['spkRIn'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-V10 ตรงกลาง แร็กโปรเซสเซอร์บนแอมป์ด้านหลังขวา ลำโพงพาสซีฟสองข้าง',
    advice: [
      { title: 'ลำดับชั้นสัญญาณ', body: 'มิกเซอร์ → โปรเซสเซอร์ → แอมป์ → ลำโพง', how: 'ต่อไล่ตามลำดับ ห้ามข้าม' },
      { title: 'โปรเซสเซอร์ปกป้องลำโพง', body: 'ทำ EQ และลิมิตเตอร์ก่อนเข้าแอมป์', how: 'MASTER 1 → PROC IN · PROC OUT → AMP IN' },
      { title: 'หลังแอมป์ = สายลำโพง', body: 'ระดับลำโพงใช้สาย speakON', how: 'AMP OUT A / B → ลำโพงซ้าย / ขวา' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-3000X ×2 · DJM-V10 · โปรเซสเซอร์ / แอมป์ / ลำโพงพาสซีฟเป็นรูปทรงทั่วไป',
      'ช่อง A = ฝั่งซ้าย · ช่อง B = ฝั่งขวา · สายเสียงของ CDJ ต่อไว้ให้แล้ว',
      'ลำโพงบนโต๊ะย่อขนาดลง'
    ],
    goal: 'ด่านนี้: ต่อระบบใหญ่ตามลำดับ มิกเซอร์ → โปรเซสเซอร์ → แอมป์ → ลำโพงพาสซีฟ ทั้งสองฝั่ง',
    winMsg: 'ระบบใหญ่มีเสียงครบ ลำโพงได้รับการป้องกันจากโปรเซสเซอร์'
  };
});
