/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 7 (กลางแจ้ง มีซับ: MASTER → ครอสโอเวอร์ → LOW เข้าซับ · HIGH เข้าลำโพงหลัก)
   CDJ-1500X ×2 + DJM-V5 (เสียง CDJ ต่อไว้แล้ว) · ครอสโอเวอร์ 2 ทางสเตอริโอ (proc 1U) หลังโต๊ะซ้าย · ซับ + ลำโพงหลัก (มีแอมป์ในตัว · proc) วางซ้อนสองข้าง
   ตัวแปรใหม่: แยกย่านความถี่ — ครอสโอเวอร์ส่งย่านต่ำไปซับ ย่านสูงไปลำโพงหลัก
   คำตอบ: MASTER L / R → IN L / R · OUT L LOW → ซับซ้าย · OUT L HIGH → ลำโพงหลักซ้าย · ฝั่ง R เหมือนกัน
   กับดัก: HIGH เข้าซับ / LOW เข้าลำโพงหลัก / MASTER ตรงเข้าลำโพง = มีเสียงแต่ไม่นับ
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level7 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.282, B = 0.282, XX = -0.45, XZ = -0.45, SX = 0.86, SZ = 0.08, SH = 0.28, TH = 0.3;
  var REAR = K.REAR, Z = XZ - 0.1, DIRECT = ['m1L', 'm1R', 'boothL', 'boothR'];
  function xo(id, dx, dir, ch, via, name) { return { id: id, dev: 'xo', pos: [XX + dx, 0.022, Z], normal: REAR, type: 'XLR', accepts: dir === 'in' ? ['XLR', 'XLRM'] : undefined, dir: dir, ch: ch, via: via, usable: true, short: name.replace('OUT ', ''), name: 'ครอสโอเวอร์ · ' + name }; }
  function spk(id, dev, x, y, z, side, band, wrong) {
    return { id: id, dev: dev, pos: [x, y, z], normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', ch: side === 'ซ้าย' ? 'L' : 'R', usable: true, short: 'IN', name: (band === 'LOW' ? 'ซับ' : 'ลำโพงหลัก') + side + ' · INPUT คอมโบ XLR/TRS',
      trap: [{ srcs: wrong, msg: band === 'LOW' ? 'ซับรับเฉพาะย่านต่ำ · ใช้ OUT LOW' : 'ลำโพงหลักรับย่านสูง · ใช้ OUT HIGH' },
             { srcs: DIRECT, msg: 'ต่อตรงจากมิกเซอร์ = ไม่แยกย่าน · ผ่านครอสโอเวอร์ก่อน' }] };
  }
  return {
    id: 'p3-l7', phase: 3, number: 7, of: 14,
    title: 'กลางแจ้งมีซับ: แยกย่านด้วยครอสโอเวอร์',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj15: K.models.cdj15, v5: K.models.v5 },
    devices: {
      cdjA: { name: 'CDJ-1500X ซ้าย', model: 'cdj15', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-V5', model: 'v5', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-1500X ขวา', model: 'cdj15', node: null, offset: [B, 0, 0] },
      xo: { name: 'ครอสโอเวอร์', proc: { kind: 'box', size: [0.3, 0.044, 0.2], color: 0x2e3238 }, offset: [XX, 0, XZ] },
      subL: { name: 'ซับซ้าย', proc: { kind: 'sub', size: [0.3, SH, 0.32], color: 0x1f2226 }, offset: [-SX, 0, SZ] },
      topL: { name: 'ลำโพงหลักซ้าย', proc: { kind: 'passive', size: [0.22, TH, 0.22], color: 0x24272c }, offset: [-SX, SH, SZ] },
      subR: { name: 'ซับขวา', proc: { kind: 'sub', size: [0.3, SH, 0.32], color: 0x1f2226 }, offset: [SX, 0, SZ] },
      topR: { name: 'ลำโพงหลักขวา', proc: { kind: 'passive', size: [0.22, TH, 0.22], color: 0x24272c }, offset: [SX, SH, SZ] }
    },
    desk: { min: [-1.04, -0.04, -0.62], max: [1.04, 0, 0.3] },
    overview: [[-1.02, 0, -0.76], [1.02, 0.6, 0.26]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj15('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj15('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.v5({ use: ['ch1Ln', 'ch3Ln', 'm1L', 'm1R', 'boothL', 'boothR'] }),
      [xo('xInL', 0.12, 'in', 'L', undefined, 'IN L'), xo('xInR', 0.08, 'in', 'R', undefined, 'IN R'),
       xo('xLlo', 0.02, 'out', 'L', 'xInL', 'OUT L LOW'), xo('xLhi', -0.02, 'out', 'L', 'xInL', 'OUT L HIGH'),
       xo('xRlo', -0.06, 'out', 'R', 'xInR', 'OUT R LOW'), xo('xRhi', -0.10, 'out', 'R', 'xInR', 'OUT R HIGH'),
       spk('subLIn', 'subL', -SX, 0.12, SZ - 0.16, 'ซ้าย', 'LOW', ['xLhi', 'xRhi']),
       spk('topLIn', 'topL', -SX, SH + 0.15, SZ - 0.11, 'ซ้าย', 'HIGH', ['xLlo', 'xRlo']),
       spk('subRIn', 'subR', SX, 0.12, SZ - 0.16, 'ขวา', 'LOW', ['xLhi', 'xRhi']),
       spk('topRIn', 'topR', SX, SH + 0.15, SZ - 0.11, 'ขวา', 'HIGH', ['xLlo', 'xRlo'])]
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch1Ln', 1.0], ['cdjB', 'ch3Ln', 1.0]]).concat([
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15a', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx15b', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx25a', color: 'black', ends: ['XLR', 'XLR'], len: 2.5 },
      { id: 'xx25b', color: 'black', ends: ['XLR', 'XLR'], len: 2.5 },
      { id: 'xx05', color: 'black', ends: ['XLR', 'XLR'], len: 0.5 }
    ]),
    pairs: [
      { from: 'm1L', to: 'xInL', srcs: ['m1L'] }, { from: 'm1R', to: 'xInR', srcs: ['m1R'] },
      { from: 'xLlo', to: 'subLIn', srcs: ['xLlo'] }, { from: 'xLhi', to: 'topLIn', srcs: ['xLhi'] },
      { from: 'xRlo', to: 'subRIn', srcs: ['xRlo'] }, { from: 'xRhi', to: 'topRIn', srcs: ['xRhi'] }
    ],
    sounds: [{ dev: 'subL', jacks: ['subLIn'] }, { dev: 'topL', jacks: ['topLIn'] }, { dev: 'subR', jacks: ['subRIn'] }, { dev: 'topR', jacks: ['topRIn'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-1500X สองเครื่อง DJM-V5 ตรงกลาง ครอสโอเวอร์ด้านหลังซ้าย ซับกับลำโพงหลักวางซ้อนกันสองข้าง',
    advice: [
      { title: 'ครอสโอเวอร์ = แยกย่าน', body: 'ย่านต่ำไปซับ ย่านสูงไปลำโพงหลัก', how: 'MASTER → IN ของครอสโอเวอร์' },
      { title: 'LOW → ซับ · HIGH → หลัก', body: 'สลับกันเสียงจะบางหรือแตก', how: 'ดูชื่อช่อง OUT ให้ตรง' },
      { title: 'ซ้ายขวาต้องตรง', body: 'OUT L ไปฝั่งซ้าย · OUT R ไปฝั่งขวา', how: 'ซ้าย → ซ้าย · ขวา → ขวา' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-1500X ×2 · DJM-V5 · ครอสโอเวอร์ / ซับ / ลำโพงหลักเป็นรูปทรงทั่วไป (มีแอมป์ในตัว)',
      'DJM-V5 มี MASTER แบบ XLR อย่างเดียว · สายเสียงของ CDJ ต่อไว้ให้แล้ว',
      'ลำโพงบนโต๊ะย่อขนาดลง ของจริงวางบนพื้นข้างเวที'
    ],
    goal: 'ด่านนี้: ส่ง MASTER ผ่านครอสโอเวอร์ แล้วต่อ LOW เข้าซับ HIGH เข้าลำโพงหลักทั้งสองฝั่ง',
    winMsg: 'ซับได้ย่านต่ำ ลำโพงหลักได้ย่านสูง ครบสองฝั่งแล้ว'
  };
});
