/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 11 (MC พูดคั่น: ไมค์ → MIC 1 ด้วยสาย XLR ตัวเมีย → ตัวผู้)
   ชุดด่าน 1 (CDJ ×2 + DJM-A9 ต่อไว้แล้ว) + ไมค์บนขาตั้งโต๊ะ (proc) ด้านซ้าย · ลำโพง VM-80 ย้ายไปด้านหน้า
   ข้อเท็จจริง: สายไมค์ฝั่งไมค์เป็น XLR ตัวเมีย ฝั่งมิกเซอร์เป็นตัวผู้ (ธรรมเนียม: ช่องออก = ตัวผู้ ช่องเข้า = ตัวเมีย · แหล่งรอง) ·
   DJM-A9: MIC 1 คอมโบ XLR/TRS · MIC 2 TRS (สเปกทางการผ่านผลค้น)
   กลไก: ช่องไมค์ (XLRM = ขาตัวผู้บนตัวไมค์) รับหัวสาย XLRF เท่านั้น · MIC 1 รับหัว XLRM / TRS
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level11 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.396, B = 0.396, VL = -0.95, VR = 0.95, VZ = 0.22, MX = -0.72, MZ = 0.0, MH = 0.3;
  return {
    id: 'p2-l11', phase: 2, number: 11, of: 14,
    title: 'MC พูดคั่น: ไมค์ → MIC 1',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      mic: { name: 'ไมค์', proc: { kind: 'mic', size: [0.14, MH, 0.14] }, offset: [MX, 0, MZ] },
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, VZ] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, VZ] }
    },
    desk: { min: [-1.12, -0.04, -0.46], max: [1.12, 0, 0.44] },
    overview: [[-1.08, 0, -0.3], [1.08, 0.42, 0.38]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      [{ id: 'micOut', dev: 'mic', pos: [MX, MH - 0.019, MZ - 0.05], normal: [0, -0.343, -0.939], type: 'XLRM', accepts: ['XLRF'], dir: 'out', usable: true, short: 'XLR', name: 'ไมค์ · ขั้ว XLR (ขาตัวผู้)' }],
      K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut']),
      K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut']),
      K.a9({ use: ['ch2Ln', 'ch3Ln', 'm1L', 'm1R', 'mic1', 'mic2'] }),
      K.vm80('vmL', VL, VZ, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, VZ, 'VM-80 ขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch2Ln', 1.0], ['cdjB', 'ch3Ln', 1.0]]).concat(K.fixedMains(), [
      { id: 'xfm15', color: 'black', ends: ['XLRF', 'XLRM'], len: 1.5, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xmm15', color: 'black', ends: ['XLRM', 'XLRM'], len: 1.5, label: 'สาย XLR ตัวผู้ทั้งสองหัว' },
      { id: 'xfm05', color: 'black', ends: ['XLRF', 'XLRM'], len: 0.5, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'trs15', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 }
    ]),
    pairs: [{ from: 'micOut', to: 'mic1' }],
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: ไมค์บนขาตั้งด้านซ้าย CDJ-3000X สองเครื่อง DJM-A9 ตรงกลาง',
    advice: [
      { title: 'ไมค์ → MIC 1', body: 'ช่องคอมโบรับได้ทั้ง XLR และ TRS', how: 'ใช้สายไมค์ XLR' },
      { title: 'หัว XLR มีตัวผู้/ตัวเมีย', body: 'ฝั่งไมค์ใช้ตัวเมีย ฝั่งมิกเซอร์ใช้ตัวผู้', how: 'สายไมค์: ตัวเมีย → ตัวผู้' },
      { title: 'จำง่าย', body: 'เสียงไหลจากตัวผู้ (ขา) ไปตัวเมีย (รู)', how: 'ไมค์ส่ง มิกเซอร์รับ' }
    ],
    notes: [
      'ไมค์เป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง',
      'สายเสียงของ CDJ และลำโพงต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: ต่อไมค์เข้า MIC 1 ของมิกเซอร์ ให้ MC พูดออกลำโพงได้',
    winMsg: 'ไมค์ออกลำโพงแล้ว MC พร้อมพูด'
  };
});
