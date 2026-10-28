/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 3 (งานบริษัท: แล็ปท็อปพรีเซนเตอร์ → DI box → MIC ของมิกเซอร์)
   CDJ-1500X ×2 + DJM-V5 กลางโต๊ะ (เสียง CDJ และ MASTER → PA ต่อไว้แล้ว) · แล็ปท็อปที่โพเดียมด้านซ้าย · DI box (proc) ข้างแล็ปท็อป
   ตัวแปรใหม่: DI box แปลงเสียงไม่บาลานซ์จากแล็ปท็อปเป็นบาลานซ์ (XLR) ส่งไกลได้ไม่จี่ · ช่องหูฟัง 3.5 มม. → สาย 3.5 → 6.35 → DI
   คำตอบ: แล็ปท็อป 3.5 → DI INPUT · DI OUTPUT (XLR ขาตัวผู้) → สายไมค์ตัวเมีย → ตัวผู้ → MIC ของ DJM-V5
   กับดัก: แล็ปท็อปเข้า LINE ตรงด้วยสาย 3.5 → RCA = มีเสียงแต่ไม่นับ (สายไม่บาลานซ์ลากไกลจากโพเดียม)
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level3 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.282, B = 0.282, LX = -0.8, LZ = -0.1, DX = -0.62, DZ = -0.35, PX = 0.58, PZ = -0.32;
  var LINE = { srcs: ['lapPh'], msg: 'สายไม่บาลานซ์ลากไกลจากโพเดียม เสียงจี่ง่าย · ผ่าน DI box ก่อน' };
  return {
    id: 'p3-l3', phase: 3, number: 3, of: 14,
    title: 'งานบริษัท: เสียงพรีเซนเตอร์ผ่าน DI box',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj15: K.models.cdj15, v5: K.models.v5 },
    devices: {
      cdjA: { name: 'CDJ-1500X ซ้าย', model: 'cdj15', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-V5', model: 'v5', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-1500X ขวา', model: 'cdj15', node: null, offset: [B, 0, 0] },
      lap: { name: 'แล็ปท็อปพรีเซนเตอร์', proc: { kind: 'laptop', size: [0.31, 0.2, 0.215] }, offset: [LX, 0, LZ] },
      di: { name: 'DI box', proc: { kind: 'box', size: [0.1, 0.05, 0.12], color: 0x3a3f46 }, offset: [DX, 0, DZ] },
      pa: { name: 'จุดเสียบ PA ห้องประชุม', proc: { kind: 'box', size: [0.2, 0.09, 0.12], color: 0x30343b }, offset: [PX, 0, PZ] }
    },
    desk: { min: [-1.0, -0.04, -0.5], max: [0.76, 0, 0.3] },
    overview: [[-0.96, 0, -0.76], [0.72, 0.3, 0.26]],   // เผื่อด้านหลังให้แถบข้อความล่างไม่ทับจุดเสียบ PA
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.cdj15('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj15('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.v5({ use: ['ch1Ln', 'ch2Ln', 'ch3Ln', 'm1L', 'm1R', 'mic'], traps: { line: LINE } }),
      K.laptop('lap', LX, LZ, []),
      [{ id: 'lapPh', dev: 'lap', pos: [LX + 0.155, 0.009, LZ + 0.04], normal: K.RIGHT, type: 'MINI', dir: 'out', usable: true, short: '3.5', name: 'แล็ปท็อป · ช่องหูฟัง 3.5 มม.' },
       { id: 'diIn', dev: 'di', pos: [DX + 0.025, 0.025, DZ - 0.06], normal: K.REAR, type: 'TS', dir: 'in', usable: true, short: 'IN', name: 'DI box · INPUT 6.35 มม. (ไม่บาลานซ์)' },
       { id: 'diOut', dev: 'di', pos: [DX - 0.025, 0.025, DZ - 0.06], normal: K.REAR, type: 'XLRM', accepts: ['XLRF'], dir: 'out', via: 'diIn', usable: true, short: 'OUT', name: 'DI box · OUTPUT XLR (บาลานซ์ ขาตัวผู้)' }],
      K.paBox('pa', PX, PZ)
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch1Ln', 1.0], ['cdjB', 'ch3Ln', 1.0]]).concat([
      { id: 'fxPL', color: 'black', ends: ['XLR', 'XLR'], len: 3.0, fixed: ['m1L', 'paL'] },
      { id: 'fxPR', color: 'black', ends: ['XLR', 'XLR'], len: 3.0, fixed: ['m1R', 'paR'] },
      { id: 'mts05', color: 'black', ends: ['MINI', 'TS'], len: 0.5, label: 'สาย 3.5 มม. → 6.35 มม.' },
      { id: 'mts10', color: 'black', ends: ['MINI', 'TS'], len: 1.0, label: 'สาย 3.5 มม. → 6.35 มม.' },
      { id: 'mrca15', color: 'black', ends: ['MINI', 'RCA2'], len: 1.5, label: 'สาย 3.5 มม. → RCA คู่' },
      { id: 'xfm05', color: 'black', ends: ['XLRF', 'XLRM'], len: 0.5, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xfm10', color: 'black', ends: ['XLRF', 'XLRM'], len: 1.0, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xfm15', color: 'black', ends: ['XLRF', 'XLRM'], len: 1.5, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' }
    ]),
    pairs: [
      { from: 'lapPh', to: 'diIn' },
      { from: 'diOut', to: 'mic', srcs: ['diOut'] }
    ],
    sounds: [{ dev: 'pa', jacks: ['paL', 'paR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-1500X สองเครื่อง DJM-V5 ตรงกลาง แล็ปท็อปพรีเซนเตอร์และ DI box ด้านซ้าย จุดเสียบ PA ด้านหลังขวา',
    advice: [
      { title: 'DI box = แปลงเป็นบาลานซ์', body: 'เสียงแล็ปท็อปส่งไกลได้ไม่จี่', how: 'แล็ปท็อป 3.5 → DI INPUT' },
      { title: 'DI ออกเป็น XLR', body: 'ระดับเท่าไมค์ จึงเข้าช่อง MIC', how: 'DI OUTPUT → MIC ของ DJM-V5' },
      { title: 'อย่าลากสายไม่บาลานซ์ไกล', body: 'โพเดียมอยู่ไกลจากบูธดีเจ', how: 'ผ่าน DI ก่อนเสมอ' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-1500X ×2 · DJM-V5 · แล็ปท็อป / DI box / จุดเสียบ PA เป็นรูปทรงทั่วไป',
      'DJM-V5 มีช่องไมค์ 1 ช่อง (คอมโบ XLR/TRS) · MASTER มีแบบ XLR อย่างเดียว',
      'เสียง CDJ และ MASTER → PA ต่อไว้ให้แล้ว · บนโต๊ะย่อระยะโพเดียมให้ใกล้ลง'
    ],
    goal: 'ด่านนี้: ส่งเสียงจากแล็ปท็อปพรีเซนเตอร์ผ่าน DI box เข้าช่อง MIC ของ DJM-V5',
    winMsg: 'เสียงวิดีโอของพรีเซนเตอร์ออกระบบห้องประชุมแล้ว ไม่จี่'
  };
});
