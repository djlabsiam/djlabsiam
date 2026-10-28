/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 7 (เพิ่มซับวูฟเฟอร์: ซับอยู่ในเส้นทางสัญญาณ)
   DDJ-FLX4 + DM-40D-BT (ตำแหน่งช่องเดียวกับด่าน 1) + ซับวูฟเฟอร์ทั่วไป (proc ไม่ใช่รุ่นจริง) วางหลังขวาของโต๊ะ
   ซับแบบทั่วไปที่มี LINE IN L/R และ LINE OUT L/R (ส่งต่อไปมอนิเตอร์) — เป็นการต่อแบบ "ผ่านซับ"
   LINE OUT มีสัญญาณเมื่อ LINE IN ข้างเดียวกันได้สัญญาณ (via) · ต่อ MASTER ตรงเข้าลำโพงโดยข้ามซับ = ยังไม่ผ่าน (srcs)
   ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel7 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1], MASTER = ['ctlL', 'ctlR'], SUBOUT = ['subOutL', 'subOutR'];
  return {
    id: 'p1-l7', phase: 1, number: 7, of: 12,
    title: 'ซับวูฟเฟอร์: FLX4 → ซับ → DM-40D-BT',
    unitsPerM: 1, slack: 1.5,
    models: { flx4: 'models/ddj_flx4.glb', dm40: 'models/dm_40d_bt.glb' },
    devices: {
      ctl: { name: 'DDJ-FLX4', model: 'flx4', node: null, offset: [0, 0, 0] },
      dmL: { name: 'DM-40D-BT ซ้าย', model: 'dm40', node: 'DM-40D-BT_Left', offset: [-0.281, 0, 0.08] },
      dmR: { name: 'DM-40D-BT ขวา', model: 'dm40', node: 'DM-40D-BT_Right', offset: [0.281, 0, 0.08] },
      sub: { name: 'ซับวูฟเฟอร์ (ทั่วไป)', proc: { kind: 'sub', size: [0.3, 0.3, 0.3] }, offset: [0.62, 0, -0.42] }
    },
    desk: { min: [-0.66, -0.04, -0.62], max: [0.84, 0, 0.26] },
    overview: [[-0.5, 0, -0.58], [0.8, 0.3, 0.1]],
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', MINI: '3.5 มม.', 'USB-C': 'USB-C', SPK: 'ขั้วสายลำโพง' },
    jacks: [
      { id: 'ctlUsbPwr', dev: 'ctl', pos: [0.0800, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'in', usable: false, short: 'USB', name: 'USB-C รับไฟ', hint: 'ช่อง USB ไม่ใช่ช่องเสียง ด่านนี้ไม่ต้องใช้' },
      { id: 'ctlUsbPc', dev: 'ctl', pos: [0.0614, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'out', usable: false, short: 'USB', name: 'USB-C ต่อคอมพิวเตอร์', hint: 'ช่อง USB ไม่ใช่ช่องเสียง ด่านนี้ไม่ต้องใช้' },
      { id: 'ctlR', dev: 'ctl', pos: [-0.0603, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', color: 'red', usable: true, short: 'R', name: 'MASTER OUT · RCA R (แดง)' },
      { id: 'ctlL', dev: 'ctl', pos: [-0.0736, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', color: 'white', usable: true, short: 'L', name: 'MASTER OUT · RCA L (ขาว)' },
      { id: 'ctlMic', dev: 'ctl', pos: [-0.1082, 0.0158, -0.1364], normal: REAR, type: 'TRS', dir: 'in', usable: false, short: 'MIC', name: 'MIC (6.35 มม.)', hint: 'ช่องรับไมโครโฟน ด่านนี้ไม่ต้องใช้' },
      { id: 'subInL', dev: 'sub', pos: [0.70, 0.20, -0.57], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'IN L', name: 'ซับ · LINE IN L (ขาว)' },
      { id: 'subInR', dev: 'sub', pos: [0.73, 0.20, -0.57], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'IN R', name: 'ซับ · LINE IN R (แดง)' },
      { id: 'subOutL', dev: 'sub', pos: [0.70, 0.13, -0.57], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', color: 'white', usable: true, via: 'subInL', short: 'OUT L', name: 'ซับ · LINE OUT L (ขาว) ส่งต่อไปมอนิเตอร์' },
      { id: 'subOutR', dev: 'sub', pos: [0.73, 0.13, -0.57], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', color: 'red', usable: true, via: 'subInR', short: 'OUT R', name: 'ซับ · LINE OUT R (แดง) ส่งต่อไปมอนิเตอร์' },
      { id: 'dmLInL', dev: 'dmL', pos: [-0.4284, 0.1716, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'L', name: 'INPUT · RCA L (ขาว) ลำโพงซ้าย' },
      { id: 'dmLInR', dev: 'dmL', pos: [-0.4284, 0.1582, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'R', name: 'INPUT · RCA R (แดง) ลำโพงซ้าย' },
      { id: 'dmLMini', dev: 'dmL', pos: [-0.4498, 0.1652, -0.128], normal: REAR, type: 'MINI', dir: 'in', usable: false, short: 'MINI', name: 'INPUT · STEREO MINI 3.5 มม.', hint: 'ช่อง 3.5 มม. สำหรับมือถือ ด่านนี้ใช้ RCA' },
      { id: 'dmLOutNeg', dev: 'dmL', pos: [-0.3866, 0.1517, -0.131], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '−', name: 'OUTPUT TO RIGHT SPEAKER (−)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmLOutPos', dev: 'dmL', pos: [-0.3977, 0.1517, -0.131], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '+', name: 'OUTPUT TO RIGHT SPEAKER (+)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInNeg', dev: 'dmR', pos: [0.3965, 0.153, -0.128], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '−', name: 'INPUT ลำโพงขวา (−)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInPos', dev: 'dmR', pos: [0.3890, 0.153, -0.128], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '+', name: 'INPUT ลำโพงขวา (+)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' }
    ],
    wires: [
      { from: 'dmLOutPos', to: 'dmRInPos', color: 'red' },
      { from: 'dmLOutNeg', to: 'dmRInNeg', color: 'black' }
    ],
    cables: [
      { id: 'w10', color: 'white', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'w15', color: 'white', ends: ['RCA', 'RCA'], len: 1.5 },
      { id: 'r15', color: 'red', ends: ['RCA', 'RCA'], len: 1.5 },
      { id: 'w20', color: 'white', ends: ['RCA', 'RCA'], len: 2.0 },
      { id: 'r20', color: 'red', ends: ['RCA', 'RCA'], len: 2.0 },
      { id: 'r30', color: 'red', ends: ['RCA', 'RCA'], len: 3.0 },
      { id: 'trs20', color: 'gray', ends: ['TRS', 'TRS'], len: 2.0 }
    ],
    pairs: [
      { from: 'ctlL', to: 'subInL', srcs: MASTER },
      { from: 'ctlR', to: 'subInR', srcs: MASTER },
      { from: 'subOutL', to: 'dmLInL', srcs: SUBOUT },
      { from: 'subOutR', to: 'dmLInR', srcs: SUBOUT }
    ],
    sounds: [{ dev: 'sub', jacks: ['subInL', 'subInR'] }, { dev: 'dmL', jacks: ['dmLInL'] }, { dev: 'dmR', jacks: ['dmLInR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: DDJ-FLX4 ลำโพง DM-40D-BT และซับวูฟเฟอร์ด้านหลังขวา',
    advice: [
      { title: 'ซับเล่นเสียงย่านต่ำ', body: 'มอนิเตอร์เล็กเล่นเบสลึกได้ไม่หมด', how: 'เพิ่มซับเพื่อเติมเบส' },
      { title: 'ต่อแบบผ่านซับ', body: 'MASTER → LINE IN ของซับ → LINE OUT → มอนิเตอร์', how: 'ซับส่งเสียงต่อให้มอนิเตอร์' },
      { title: 'OUT ของซับมีเสียงเมื่อ IN มีเสียง', body: 'ต่อ OUT อย่างเดียว ลำโพงยังเงียบ', how: 'ต่อฝั่ง IN ให้ครบก่อน' },
      { title: 'ข้ามซับ = ยังไม่ผ่าน', body: 'MASTER ตรงเข้าลำโพง ซับจะไม่มีเสียง', how: 'สายทุกเส้นต้องผ่านซับ' }
    ],
    notes: [
      'ซับวูฟเฟอร์เป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง (ช่อง LINE IN / LINE OUT แบบ RCA เป็นแบบที่ซับทั่วไปมี)',
      'อีกแบบที่ใช้กันคือ "แยกออก": ส่งสัญญาณจากช่องออกอีกชุดเข้าซับโดยตรง — ด่านนี้ฝึกแบบผ่านซับ',
      'DDJ-FLX4 และ DM-40D-BT ตำแหน่งช่องเดียวกับด่าน 1'
    ],
    goal: 'ด่านนี้: ให้ซับและลำโพงทั้งสองข้างมีเสียง โดยเสียงผ่านซับก่อน',
    winMsg: 'ซับและลำโพงทั้งสองข้างมีเสียงแล้ว'
  };
});
