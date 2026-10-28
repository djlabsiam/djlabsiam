/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 11 (หอลำโพงหน่วง: โปรเซสเซอร์แยก MAIN กับ DELAY · หอไกลรับช่องที่หน่วงเวลาแล้ว)
   CDJ-3000X ×2 + DJM-V10 (เสียง CDJ ต่อไว้แล้ว) · โปรเซสเซอร์ลำโพง (proc · IN L/R · MAIN OUT L/R · DELAY OUT L/R) หลังโต๊ะขวา
   ลำโพงหลักหน้าเวที (มีแอมป์ในตัว · proc) สองข้าง · ม้วนสาย 60 ม. ไปหอลำโพงหน่วง (proc · ปลายทาง) หลังโต๊ะซ้าย
   ตัวแปรใหม่: หอไกลต้องหน่วงเวลาให้เสียงมาถึงพร้อมเสียงจากหน้าเวที · ส่งให้ถูกช่อง
   คำตอบ: MASTER 1 → PROC IN · MAIN OUT → ลำโพงหลัก · DELAY OUT → ม้วนสายไปหอ · สลับ MAIN / DELAY = กับดัก
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level11 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.414, B = 0.414, PX = 0.34, PZ = -0.46, DX = -0.46, DZ = -0.5, SX = 0.86, SZ = 0.05, SH = 0.36;
  var REAR = K.REAR, Z = PZ - 0.11;
  var MAINS = ['pMainL', 'pMainR'], DELAYS = ['pDlyL', 'pDlyR'], DIRECT = ['m1L', 'm1R', 'boothL', 'boothR'];
  function pj(id, dx, dir, ch, via, name) { return { id: id, dev: 'proc', pos: [PX + dx, 0.022, Z], normal: REAR, type: 'XLR', accepts: dir === 'in' ? ['XLR', 'XLRM'] : undefined, dir: dir, ch: ch, via: via, usable: true, short: name.replace('OUT ', ''), name: 'โปรเซสเซอร์ · ' + name }; }
  function spk(id, dev, x, side) {
    return { id: id, dev: dev, pos: [x, 0.2, SZ - 0.12], normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', ch: side === 'ซ้าย' ? 'L' : 'R', usable: true, short: 'IN', name: 'ลำโพงหลัก' + side + ' · INPUT คอมโบ XLR/TRS',
      trap: [{ srcs: DELAYS, msg: 'ลำโพงหน้าเวทีไม่ต้องหน่วง · ใช้ MAIN OUT' }, { srcs: DIRECT, msg: 'ต่อตรงจากมิกเซอร์ = ไม่ผ่านโปรเซสเซอร์ · ผ่านโปรเซสเซอร์ก่อน' }] };
  }
  function dr(id, dx, ch) {
    return { id: id, dev: 'drum', pos: [DX + dx, 0.06, DZ - 0.06], normal: REAR, type: 'XLR', accepts: ['XLR', 'XLRM'], dir: 'in', ch: ch, usable: true, short: ch, name: 'ม้วนสาย 60 ม. ไปหอลำโพงหน่วง · XLR IN ' + ch,
      trap: [{ srcs: MAINS, msg: 'หอไกลรับเสียงไม่หน่วง = ได้ยินเสียงซ้อนเป็นเสียงก้อง · ใช้ DELAY OUT' }, { srcs: DIRECT, msg: 'ต่อตรงจากมิกเซอร์ = ไม่หน่วงเวลา · ผ่านโปรเซสเซอร์ก่อน' }] };
  }
  return {
    id: 'p3-l11', phase: 3, number: 11, of: 14,
    title: 'หอลำโพงหน่วง: MAIN กับ DELAY',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, v10: K.models.v10 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-V10', model: 'v10', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      proc: { name: 'โปรเซสเซอร์ลำโพง', proc: { kind: 'box', size: [0.36, 0.044, 0.22], color: 0x2e3238 }, offset: [PX, 0, PZ] },
      drum: { name: 'ม้วนสาย 60 ม. → หอลำโพงหน่วง', proc: { kind: 'box', size: [0.2, 0.12, 0.12], color: 0x2a2d32 }, offset: [DX, 0, DZ] },
      spkL: { name: 'ลำโพงหลักซ้าย (หน้าเวที)', proc: { kind: 'passive', size: [0.24, SH, 0.24], color: 0x24272c }, offset: [-SX, 0, SZ] },
      spkR: { name: 'ลำโพงหลักขวา (หน้าเวที)', proc: { kind: 'passive', size: [0.24, SH, 0.24], color: 0x24272c }, offset: [SX, 0, SZ] }
    },
    desk: { min: [-1.04, -0.04, -0.66], max: [1.04, 0, 0.3] },
    overview: [[-1.02, 0, -0.8], [1.02, 0.42, 0.26]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.v10({ use: ['ch3Ln', 'ch4Ln', 'm1L', 'm1R', 'boothL', 'boothR'] }),
      [pj('pInL', 0.14, 'in', 'L', undefined, 'IN L'), pj('pInR', 0.09, 'in', 'R', undefined, 'IN R'),
       pj('pMainL', 0.03, 'out', 'L', 'pInL', 'OUT MAIN L'), pj('pMainR', -0.02, 'out', 'R', 'pInR', 'OUT MAIN R'),
       pj('pDlyL', -0.08, 'out', 'L', 'pInL', 'OUT DELAY L'), pj('pDlyR', -0.13, 'out', 'R', 'pInR', 'OUT DELAY R'),
       spk('spkLIn', 'spkL', -SX, 'ซ้าย'), spk('spkRIn', 'spkR', SX, 'ขวา'),
       dr('drL', 0.04, 'L'), dr('drR', -0.04, 'R')]
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch3Ln', 1.0], ['cdjB', 'ch4Ln', 1.0]]).concat([
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15a', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx15b', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx15c', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx25', color: 'black', ends: ['XLR', 'XLR'], len: 2.5 },
      { id: 'xx05', color: 'black', ends: ['XLR', 'XLR'], len: 0.5 }
    ]),
    pairs: [
      { from: 'm1L', to: 'pInL', srcs: ['m1L'] }, { from: 'm1R', to: 'pInR', srcs: ['m1R'] },
      { from: 'pMainL', to: 'spkLIn', srcs: ['pMainL'] }, { from: 'pMainR', to: 'spkRIn', srcs: ['pMainR'] },
      { from: 'pDlyL', to: 'drL', srcs: ['pDlyL'] }, { from: 'pDlyR', to: 'drR', srcs: ['pDlyR'] }
    ],
    sounds: [{ dev: 'spkL', jacks: ['spkLIn'] }, { dev: 'spkR', jacks: ['spkRIn'] }, { dev: 'drum', jacks: ['drL', 'drR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-V10 ตรงกลาง โปรเซสเซอร์ด้านหลังขวา ม้วนสายไปหอลำโพงหน่วงด้านหลังซ้าย ลำโพงหลักสองข้าง',
    advice: [
      { title: 'หอไกลต้องหน่วงเวลา', body: 'เสียงเดินช้า หอไกลต้องรอให้เสียงหน้าเวทีมาถึงก่อน', how: 'DELAY OUT → ม้วนสายไปหอ' },
      { title: 'หน้าเวทีไม่หน่วง', body: 'ลำโพงหลักรับเสียงตรงเวลา', how: 'MAIN OUT → ลำโพงหลัก' },
      { title: 'ทุกเส้นผ่านโปรเซสเซอร์', body: 'โปรเซสเซอร์เป็นตัวตั้งเวลาหน่วง', how: 'MASTER 1 → PROC IN' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-3000X ×2 · DJM-V10 · โปรเซสเซอร์ / ลำโพงหลัก / ม้วนสายเป็นรูปทรงทั่วไป',
      'หอลำโพงหน่วงอยู่กลางสนาม ปลายม้วนสาย (ไม่อยู่บนโต๊ะ) · สายเสียงของ CDJ ต่อไว้ให้แล้ว',
      'เสียงเดินทางราว 343 เมตรต่อวินาที หอห่าง 60 ม. จึงต้องหน่วงประมาณ 175 มิลลิวินาที (ตั้งที่โปรเซสเซอร์)'
    ],
    goal: 'ด่านนี้: ต่อโปรเซสเซอร์ให้ลำโพงหน้าเวทีรับ MAIN และหอลำโพงไกลรับ DELAY ทั้งสองฝั่ง',
    winMsg: 'หอลำโพงหน่วงได้เสียงพร้อมกับหน้าเวที ไม่ก้องซ้อน'
  };
});
