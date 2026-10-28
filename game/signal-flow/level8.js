/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 8 (ห้องเล็ก งบสายจำกัด: เลือกชนิดและความยาวสาย ไม่ซื้อยาวเกิน)
   DDJ-FLX4 + DM-40D-BT วางห่างขึ้นกว่าด่าน 1 (ลำโพงเลื่อนออกข้างละ 11.9 ซม.) · ตำแหน่งช่องในตัวเครื่องเดียวกับด่าน 1
   กติกาใหม่: budget = ความยาวสายรวมห้ามเกิน (เกิน = ยังไม่ผ่าน แม้ลำโพงจะมีเสียง) · งบ = คำตอบสั้นสุด 2.0 ม.
   ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel8 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1];
  return {
    id: 'p1-l8', phase: 1, number: 8, of: 12,
    title: 'งบสายจำกัด: FLX4 เข้า DM-40D-BT',
    unitsPerM: 1, slack: 1.5,
    budget: 2.0,
    models: { flx4: 'models/ddj_flx4.glb', dm40: 'models/dm_40d_bt.glb' },
    devices: {
      ctl: { name: 'DDJ-FLX4', model: 'flx4', node: null, offset: [0, 0, 0] },
      dmL: { name: 'DM-40D-BT ซ้าย', model: 'dm40', node: 'DM-40D-BT_Left', offset: [-0.40, 0, 0.08] },
      dmR: { name: 'DM-40D-BT ขวา', model: 'dm40', node: 'DM-40D-BT_Right', offset: [0.40, 0, 0.08] }
    },
    desk: { min: [-0.78, -0.04, -0.3], max: [0.78, 0, 0.26] },
    overview: [[-0.62, 0, -0.2], [0.6, 0.23, 0.1]],
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', MINI: '3.5 มม.', 'USB-C': 'USB-C', SPK: 'ขั้วสายลำโพง' },
    jacks: [
      { id: 'ctlUsbPwr', dev: 'ctl', pos: [0.0800, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'in', usable: false, short: 'USB', name: 'USB-C รับไฟ', hint: 'ช่อง USB ไม่ใช่ช่องเสียง ด่านนี้ไม่ต้องใช้' },
      { id: 'ctlUsbPc', dev: 'ctl', pos: [0.0614, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'out', usable: false, short: 'USB', name: 'USB-C ต่อคอมพิวเตอร์', hint: 'ช่อง USB ไม่ใช่ช่องเสียง ด่านนี้ไม่ต้องใช้' },
      { id: 'ctlR', dev: 'ctl', pos: [-0.0603, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', color: 'red', usable: true, short: 'R', name: 'MASTER OUT · RCA R (แดง)' },
      { id: 'ctlL', dev: 'ctl', pos: [-0.0736, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', color: 'white', usable: true, short: 'L', name: 'MASTER OUT · RCA L (ขาว)' },
      { id: 'ctlMic', dev: 'ctl', pos: [-0.1082, 0.0158, -0.1364], normal: REAR, type: 'TRS', dir: 'in', usable: false, short: 'MIC', name: 'MIC (6.35 มม.)', hint: 'ช่องรับไมโครโฟน ด่านนี้ไม่ต้องใช้' },
      { id: 'dmLInL', dev: 'dmL', pos: [-0.5474, 0.1716, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'L', name: 'INPUT · RCA L (ขาว) ลำโพงซ้าย' },
      { id: 'dmLInR', dev: 'dmL', pos: [-0.5474, 0.1582, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'R', name: 'INPUT · RCA R (แดง) ลำโพงซ้าย' },
      { id: 'dmLMini', dev: 'dmL', pos: [-0.5688, 0.1652, -0.128], normal: REAR, type: 'MINI', dir: 'in', usable: false, short: 'MINI', name: 'INPUT · STEREO MINI 3.5 มม.', hint: 'ช่อง 3.5 มม. สำหรับมือถือ ด่านนี้ใช้ RCA' },
      { id: 'dmLOutNeg', dev: 'dmL', pos: [-0.5056, 0.1517, -0.131], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '−', name: 'OUTPUT TO RIGHT SPEAKER (−)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmLOutPos', dev: 'dmL', pos: [-0.5167, 0.1517, -0.131], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '+', name: 'OUTPUT TO RIGHT SPEAKER (+)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInNeg', dev: 'dmR', pos: [0.5155, 0.153, -0.128], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '−', name: 'INPUT ลำโพงขวา (−)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInPos', dev: 'dmR', pos: [0.5080, 0.153, -0.128], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '+', name: 'INPUT ลำโพงขวา (+)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' }
    ],
    wires: [
      { from: 'dmLOutPos', to: 'dmRInPos', color: 'red' },
      { from: 'dmLOutNeg', to: 'dmRInNeg', color: 'black' }
    ],
    cables: [
      { id: 'w05', color: 'white', ends: ['RCA', 'RCA'], len: 0.5 },
      { id: 'w10', color: 'white', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'w20', color: 'white', ends: ['RCA', 'RCA'], len: 2.0 },
      { id: 'w30', color: 'white', ends: ['RCA', 'RCA'], len: 3.0 },
      { id: 'r05', color: 'red', ends: ['RCA', 'RCA'], len: 0.5 },
      { id: 'r10', color: 'red', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'r15', color: 'red', ends: ['RCA', 'RCA'], len: 1.5 },
      { id: 'r50', color: 'red', ends: ['RCA', 'RCA'], len: 5.0 }
    ],
    pairs: [{ from: 'ctlL', to: 'dmLInL' }, { from: 'ctlR', to: 'dmLInR' }],
    sounds: [{ dev: 'dmL', jacks: ['dmLInL'] }, { dev: 'dmR', jacks: ['dmLInR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: DDJ-FLX4 ตรงกลาง ลำโพง DM-40D-BT วางห่างออกไปซ้ายขวา',
    advice: [
      { title: 'งบสายมีจำกัด', body: 'ความยาวสายรวมห้ามเกินเส้นประบนมาตร', how: 'เกินงบ = ยังไม่ผ่าน' },
      { title: 'สั้นไปเสียบไม่ถึง ยาวไปเปลืองงบ', body: 'ดูระยะจริงระหว่างช่องก่อนเลือก', how: 'เลือกเส้นที่สั้นที่สุดที่ยังถึง' },
      { title: 'ลำโพงวางห่างกว่าด่านแรก', body: 'สาย 0.5 ม. ไม่พอแล้ว', how: 'ลองลากปลายสายดูระยะ' }
    ],
    notes: [
      'DDJ-FLX4 และ DM-40D-BT ตำแหน่งช่องในตัวเครื่องเดียวกับด่าน 1 · ลำโพงวางห่างออกไป',
      'งบสายในเกมนับเป็นความยาวรวม (เมตร) ไม่ใช่ราคา'
    ],
    goal: 'ด่านนี้: ให้ลำโพงทั้งสองข้างมีเสียง ใช้สายรวมไม่เกินงบ',
    winMsg: 'ลำโพงทั้งสองข้างมีเสียง และใช้สายไม่เกินงบ'
  };
});
