/* Signal Flow: ข้อมูลด่าน Phase 2 ด่าน 4 (เสียงฮัม: ต่อสายกราวด์)
   ชุดเดียวกับด่าน 3 · สายเสียงแผ่นเสียงและลำโพงต่อไว้ให้แล้ว → เปิดด่านมาจะได้ยินเสียงฮัมปนเพลง (BGM: L.hum)
   ข้อเท็จจริง: PLX-CRSS12 มีขั้ว SIGNAL GND บนเครื่อง (หน้าสินค้าทางการ) · DJM-A9 ภาพแผงหลังบนโมเดลมีขั้ว SIGNAL GND 2 ขั้ว (ข้าง CH1 และข้าง CH4 · จำนวนขั้วยังไม่มีแหล่งทางการยืนยัน)
   เครื่องละหนึ่งเส้น เข้าขั้วไหนก็ได้ · ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Level4 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.61, B = 0.61, VL = -0.98, VR = 0.98, VZ = 0.22;
  function gnd(src, first, other) { return { from: src, to: first, srcs: [src], also: [{ from: src, to: other }] }; }
  return {
    id: 'p2-l4', phase: 2, number: 4, of: 14,
    title: 'เสียงฮัม: ต่อสายกราวด์',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.5, 0.5, -0.71],
    models: { tt: K.models.tt, a9: K.models.a9, vm80: K.models.vm80 },
    devices: {
      ttA: { name: 'PLX-CRSS12 ซ้าย', model: 'tt', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-A9', model: 'a9', node: null, offset: [0, 0, 0] },
      ttB: { name: 'PLX-CRSS12 ขวา', model: 'tt', node: null, offset: [B, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [VL, 0, VZ] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [VR, 0, VZ] }
    },
    desk: { min: [-1.18, -0.04, -0.46], max: [1.18, 0, 0.44] },
    overview: [[-1.14, 0, -0.3], [1.14, 0.42, 0.38]],
    typeLabels: K.typeLabels,
    jacks: [].concat(
      K.tt('ttA', A, 0, 'แผ่นเสียงซ้าย', ['ttAOut', 'ttAGnd']),
      K.tt('ttB', B, 0, 'แผ่นเสียงขวา', ['ttBOut', 'ttBGnd']),
      K.a9({ use: ['ch1Ph', 'ch4Ph', 'm1L', 'm1R', 'gndA', 'gndB'] }),
      K.vm80('vmL', VL, VZ, 'VM-80 ซ้าย', 'L', ['vmLCombo']),
      K.vm80('vmR', VR, VZ, 'VM-80 ขวา', 'R', ['vmRCombo'])
    ),
    wires: [],
    cables: K.fixedMains().concat([
      { id: 'fxA', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.0, label: 'สาย RCA คู่', fixed: ['ttAOut', 'ch1Ph'] },
      { id: 'fxB', color: 'black', ends: ['RCA2', 'RCA2'], len: 1.5, label: 'สาย RCA คู่', fixed: ['ttBOut', 'ch4Ph'] },
      { id: 'g05', color: 'green', ends: ['GND', 'GND'], len: 0.5, label: 'สายกราวด์' },
      { id: 'g10', color: 'green', ends: ['GND', 'GND'], len: 1.0, label: 'สายกราวด์' },
      { id: 'g15', color: 'green', ends: ['GND', 'GND'], len: 1.5, label: 'สายกราวด์' }
    ]),
    pairs: [
      { from: 'ttAOut', to: 'ch1Ph' }, { from: 'ttBOut', to: 'ch4Ph' },
      gnd('ttAGnd', 'gndB', 'gndA'), gnd('ttBGnd', 'gndA', 'gndB')
    ],
    hum: { jacks: ['ch1PhL', 'ch4PhL'], gnd: ['gndA', 'gndB'], need: 2 },
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo'] }, { dev: 'vmR', jacks: ['vmRCombo'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังขวา: เครื่องเล่นแผ่นเสียง PLX-CRSS12 สองข้าง DJM-A9 ตรงกลาง ลำโพง VM-80 ด้านนอก',
    advice: [
      { title: 'ได้ยินเสียงฮัมไหม?', body: 'เสียง "อื้ด" ทุ้มๆ ปนเพลง', how: 'แผ่นเสียงยังไม่ได้ต่อกราวด์' },
      { title: 'GND → SIGNAL GND', body: 'สายกราวด์จากแผ่นเสียงเข้าขั้วของมิกเซอร์', how: 'เครื่องละหนึ่งเส้น' },
      { title: 'ต่อครบ เสียงฮัมหาย', body: 'ฟังจากลำโพงได้เลย', how: 'เปิดเสียงไว้' }
    ],
    notes: [
      'สายเสียงและลำโพงต่อไว้ให้แล้ว ด่านนี้ฝึกสายกราวด์',
      'PLX-CRSS12 มีขั้ว SIGNAL GND บนเครื่อง (หน้าสินค้าทางการ)',
      'มิกเซอร์ในด่านนี้มีขั้วกราวด์สองขั้วตามภาพแผงหลัง'
    ],
    goal: 'ด่านนี้: ต่อสายกราวด์จากแผ่นเสียงทั้งสองเครื่องเข้าขั้ว SIGNAL GND ให้เสียงฮัมหาย',
    winMsg: 'ต่อกราวด์ครบ เสียงฮัมหายแล้ว'
  };
});
