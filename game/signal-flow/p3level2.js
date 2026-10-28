/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 2 (งานแต่งในโรงแรม: ไมค์ไร้สาย → XDJ-AZ → PA ห้องจัดเลี้ยง)
   XDJ-AZ กลางโต๊ะ (เล่นเพลงจาก USB ในตัว) · ตัวรับไมค์ไร้สาย 2 ช่อง (proc) ข้างซ้าย · จุดเสียบ PA ของห้องจัดเลี้ยง (proc) หลังโต๊ะขวา
   ตัวแปรใหม่: ตัวรับไมค์ไร้สาย (XLR OUT ขาตัวผู้ → สายไมค์ตัวเมีย → ตัวผู้ → MIC ของเครื่อง) · ไมค์ผ่านมิกเซอร์ของดีเจก่อนออก PA
   คำตอบ: OUT A / B → MIC 1 / 2 (สลับกันได้) · MASTER 1 L / R → PA L / R · BOOTH เข้า PA = มีเสียงแต่ไม่นับ (srcs)
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level2 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var RX = -0.7, RZ = 0, PX = 0.62, PZ = -0.36;
  return {
    id: 'p3-l2', phase: 3, number: 2, of: 14,
    title: 'งานแต่งในโรงแรม: ไมค์ไร้สาย + PA ห้องจัดเลี้ยง',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { az: K.models.az },
    devices: {
      mix: { name: 'XDJ-AZ', model: 'az', node: null, offset: [0, 0, 0] },
      rx: { name: 'ตัวรับไมค์ไร้สาย', proc: { kind: 'box', size: [0.21, 0.044, 0.16], color: 0x2e3238 }, offset: [RX, 0, RZ] },
      pa: { name: 'จุดเสียบ PA ห้องจัดเลี้ยง', proc: { kind: 'box', size: [0.2, 0.09, 0.12], color: 0x30343b }, offset: [PX, 0, PZ] }
    },
    desk: { min: [-0.9, -0.04, -0.52], max: [0.8, 0, 0.32] },
    overview: [[-0.86, 0, -0.78], [0.76, 0.3, 0.28]],   // เผื่อด้านหลังให้แถบข้อความล่างไม่ทับจุดเสียบ PA
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.az({ use: ['m1L', 'm1R', 'boothL', 'boothR', 'mic1', 'mic2'] }),
      K.wirelessRx('rx', RX, RZ),
      K.paBox('pa', PX, PZ)
    ),
    wires: [],
    cables: [
      { id: 'xfm05', color: 'black', ends: ['XLRF', 'XLRM'], len: 0.5, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xfm10a', color: 'black', ends: ['XLRF', 'XLRM'], len: 1.0, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xfm10b', color: 'black', ends: ['XLRF', 'XLRM'], len: 1.0, label: 'สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { id: 'xmm10', color: 'black', ends: ['XLRM', 'XLRM'], len: 1.0, label: 'สาย XLR ตัวผู้ทั้งสองหัว' },
      { id: 'xx05', color: 'black', ends: ['XLR', 'XLR'], len: 0.5 },
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'tx15', color: 'gray', ends: ['TRS', 'XLR'], len: 1.5 }
    ],
    pairs: [
      { from: 'rxA', to: 'mic1', srcs: ['rxA'], also: [{ from: 'rxA', to: 'mic2' }] },
      { from: 'rxB', to: 'mic2', srcs: ['rxB'], also: [{ from: 'rxB', to: 'mic1' }] },
      { from: 'm1L', to: 'paL', srcs: ['m1L'] },
      { from: 'm1R', to: 'paR', srcs: ['m1R'] }
    ],
    sounds: [{ dev: 'pa', jacks: ['paL', 'paR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: XDJ-AZ ตรงกลาง ตัวรับไมค์ไร้สายด้านซ้าย จุดเสียบ PA ของห้องจัดเลี้ยงด้านหลังขวา',
    advice: [
      { title: 'ตัวรับไมค์ไร้สาย', body: 'ไมค์มือถือส่งคลื่นมาที่ตัวรับ', how: 'OUT A / B → MIC 1 / 2' },
      { title: 'สายไมค์มีตัวผู้ตัวเมีย', body: 'ช่องออกของตัวรับเป็นขาตัวผู้', how: 'ใช้สายไมค์ XLR ตัวเมีย → ตัวผู้' },
      { title: 'PA ห้องจัดเลี้ยง = MASTER', body: 'เพลงและเสียงไมค์ออกทางนี้', how: 'MASTER 1 → จุดเสียบ PA' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: XDJ-AZ · ตัวรับไมค์ไร้สายและจุดเสียบ PA เป็นรูปทรงทั่วไป',
      'ไมค์มือถือไร้สาย 2 ตัว (ไม่ได้วางบนโต๊ะ) ส่งคลื่นเข้าตัวรับ ช่อง A กับ B',
      'XDJ-AZ เล่นเพลงจาก USB ในตัวเครื่อง จึงไม่มีเครื่องเล่นให้ต่อ'
    ],
    goal: 'ด่านนี้: ต่อตัวรับไมค์ไร้สายเข้า MIC ของ XDJ-AZ และต่อ MASTER 1 เข้าระบบ PA ของห้องจัดเลี้ยง',
    winMsg: 'เพลงและไมค์พิธีกรออกลำโพงห้องจัดเลี้ยงแล้ว'
  };
});
