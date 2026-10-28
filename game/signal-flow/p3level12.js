/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 12 (กราวด์ลูปในเทศกาล: บูธดีเจกับ PA ใช้ตู้ไฟคนละตู้ → ผ่าน DI ที่ยก GROUND LIFT)
   PLX-CRSS12 ×2 (Battle position ชิด DJM-V10) · DI / ไลน์ไอโซเลเตอร์ 2 ช่อง (proc · GROUND LIFT เปิดแล้ว) หลังโต๊ะขวา · จุดเสียบ PA (proc) หลังโต๊ะซ้าย
   ตัวแปรใหม่: กราวด์ลูป — อุปกรณ์สองฝั่งต่อไฟคนละตู้ สายเสียงกลายเป็นทางวนของกราวด์ = เสียงฮัม · แก้ด้วย DI ที่ยกกราวด์ (ไม่ใช่ตัดสายดินของปลั๊กไฟ)
   คำตอบ: แผ่นเสียง → PHONO + GND ทั้งสองเครื่อง · MASTER 1 L / R → DI IN · DI OUT → PA · MASTER ตรงเข้า PA = กับดัก (ฮัมจากกราวด์ลูป)
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level12 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.4003, B = 0.4003, IX = 0.36, IZ = -0.46, PX = -0.36, PZ = -0.5;
  var LOOP = { srcs: ['m1L', 'm1R', 'boothL', 'boothR', 'm2', 'm2L', 'm2R'], msg: 'บูธดีเจกับ PA ใช้ตู้ไฟคนละตู้ ต่อตรง = กราวด์ลูป เสียงฮัม · ผ่าน DI ที่ยก GROUND LIFT' };
  function deck(src, first, other) { return { from: src, to: first, srcs: [src], also: [{ from: src, to: other }] }; }
  function di(id, dx, dir, ch, via) { return { id: id, dev: 'iso', pos: [IX + dx, 0.025, IZ - 0.08], normal: K.REAR, type: 'XLR', accepts: dir === 'in' ? ['XLR', 'XLRM'] : undefined, dir: dir, ch: ch, via: via, usable: true, short: (dir === 'in' ? 'IN ' : 'OUT ') + ch, name: 'DI (GROUND LIFT) · ' + (dir === 'in' ? 'IN ' : 'OUT ') + ch }; }
  return {
    id: 'p3-l12', phase: 3, number: 12, of: 14,
    title: 'กราวด์ลูปในเทศกาล: ผ่าน DI ยกกราวด์',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { tt: K.models.tt, v10: K.models.v10 },
    devices: {
      ttA: { name: 'PLX-CRSS12 ซ้าย', model: 'tt', node: null, offset: [A, 0, 0], rot: K.BATTLE },   // Battle position ชิด DJM-V10 (เว้น 5 มม.)
      mix: { name: 'DJM-V10', model: 'v10', node: null, offset: [0, 0, 0] },
      ttB: { name: 'PLX-CRSS12 ขวา', model: 'tt', node: null, offset: [B, 0, 0], rot: K.BATTLE },
      iso: { name: 'DI 2 ช่อง (GROUND LIFT เปิด)', proc: { kind: 'box', size: [0.2, 0.05, 0.16], color: 0x3a3f46 }, offset: [IX, 0, IZ] },
      pa: { name: 'จุดเสียบ PA (ตู้ไฟ B)', proc: { kind: 'box', size: [0.2, 0.09, 0.12], color: 0x30343b }, offset: [PX, 0, PZ] }
    },
    desk: { min: [-0.7, -0.04, -0.64], max: [0.7, 0, 0.32] },
    overview: [[-0.68, 0, -0.8], [0.68, 0.3, 0.28]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.tt('ttA', A, 0, 'แผ่นเสียงซ้าย', ['ttAOut', 'ttAGnd'], true),
      K.tt('ttB', B, 0, 'แผ่นเสียงขวา', ['ttBOut', 'ttBGnd'], true),
      K.v10({ use: ['ch1Ph', 'ch3Ph', 'ch4Ph', 'ch6Ph', 'ch1Ln', 'ch3Ln', 'ch4Ln', 'ch6Ln', 'gndA', 'gndB', 'm1L', 'm1R', 'boothL', 'boothR'],
        traps: { line: { srcs: ['ttAOut', 'ttAOutL', 'ttAOutR', 'ttBOut', 'ttBOutL', 'ttBOutR'], msg: 'แผ่นเสียงเข้า LINE เสียงเบาและบางมาก · ต้องเข้า PHONO' } } }),
      [di('isoInL', 0.07, 'in', 'L'), di('isoInR', 0.025, 'in', 'R'), di('isoOutL', -0.025, 'out', 'L', 'isoInL'), di('isoOutR', -0.07, 'out', 'R', 'isoInR')],
      K.paBox('pa', PX, PZ).map(function (j) { j.trap = LOOP; j.accepts = ['XLR', 'XLRM']; return j; })
    ),
    wires: [],
    cables: [
      { id: 'rr05a', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'rr05b', color: 'black', ends: ['RCA2', 'RCA2'], len: 0.5, label: 'สาย RCA คู่' },
      { id: 'g05a', color: 'green', ends: ['GND', 'GND'], len: 0.5, label: 'สายกราวด์' },
      { id: 'g05b', color: 'green', ends: ['GND', 'GND'], len: 0.5, label: 'สายกราวด์' },
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10c', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10d', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 }
    ],
    pairs: [
      deck('ttAOut', 'ch1Ph', 'ch3Ph'), deck('ttBOut', 'ch6Ph', 'ch4Ph'),
      { from: 'ttAGnd', to: 'gndB', srcs: ['ttAGnd'], also: [{ from: 'ttAGnd', to: 'gndA' }] },
      { from: 'ttBGnd', to: 'gndA', srcs: ['ttBGnd'], also: [{ from: 'ttBGnd', to: 'gndB' }] },
      { from: 'm1L', to: 'isoInL', srcs: ['m1L'] }, { from: 'm1R', to: 'isoInR', srcs: ['m1R'] },
      { from: 'isoOutL', to: 'paL', srcs: ['isoOutL'] }, { from: 'isoOutR', to: 'paR', srcs: ['isoOutR'] }
    ],
    hum: { jacks: ['ch1PhL', 'ch3PhL', 'ch4PhL', 'ch6PhL'], gnd: ['gndA', 'gndB'], need: 2 },
    sounds: [{ dev: 'pa', jacks: ['paL', 'paR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: DJM-V10 ตรงกลาง PLX-CRSS12 สองข้างแบบ Battle position DI ด้านหลังขวา จุดเสียบ PA ด้านหลังซ้าย',
    advice: [
      { title: 'กราวด์ลูป = ไฟคนละตู้', body: 'สายเสียงกลายเป็นทางวนของกราวด์ เกิดเสียงฮัม', how: 'บูธดีเจ ตู้ไฟ A · PA ตู้ไฟ B' },
      { title: 'แก้ด้วย DI ยกกราวด์', body: 'ตัดทางวนเฉพาะสายเสียง ไม่แตะสายดินของปลั๊กไฟ', how: 'MASTER 1 → DI IN · DI OUT → PA' },
      { title: 'แผ่นเสียงยังต้องมีกราวด์', body: 'ฮัมคนละแบบกับกราวด์ลูป', how: 'GND ทั้งสองเครื่อง → SIGNAL GND' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: PLX-CRSS12 ×2 · DJM-V10 · DI / จุดเสียบ PA เป็นรูปทรงทั่วไป',
      'บูธดีเจต่อไฟจากตู้ไฟ A · ระบบ PA ต่อไฟจากตู้ไฟ B (ไม่ได้วางบนโต๊ะ)',
      'ห้ามแก้เสียงฮัมด้วยการตัดหรือยกสายดินของปลั๊กไฟ อันตรายจากไฟรั่ว · SIGNAL GND ของ DJM-V10 เห็นบนแผงหลังของโมเดล (หน้าสเปกทางการไม่ระบุ)'
    ],
    goal: 'ด่านนี้: ต่อแผ่นเสียงสองเครื่องพร้อมกราวด์ แล้วส่ง MASTER 1 ผ่าน DI ที่ยกกราวด์ก่อนเข้า PA ซึ่งใช้ตู้ไฟคนละตู้',
    winMsg: 'เสียงฮัมหายทั้งจากแผ่นเสียงและกราวด์ลูป'
  };
});
