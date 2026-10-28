/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 4 (ต่อคอนโทรลเลอร์กับแล็ปท็อป: USB ส่งข้อมูล/ไฟ ต่างจากสายเสียง)
   พิกัดเป็นเมตร ตามระบบ glTF: x ขวา, y ขึ้น, z ไปทางหน้าเครื่อง (แผงหลังหันไปทาง -z) · พื้นโต๊ะที่ y = 0
   DDJ-FLX4 + DM-40D-BT: ตำแหน่งช่องเดียวกับด่าน 1 (วัดจากโมเดล) · แล็ปท็อปเป็นรูปทรงทั่วไป (proc) ไม่ใช่รุ่นจริง
   ข้อเท็จจริงจากเว็บทางการ (ตรวจ 24 ต.ค. 2026): FLX4 ต่อคอม/มือถือผ่าน USB Type-C · ใช้ไฟจาก USB ของคอม ("PC จ่ายทั้งไฟและเสียง")
   ในกล่องมี "สาย USB Type-C" (หัวฝั่งคอมไม่ได้ระบุ) · โมเดลมีช่อง USB-C 2 ช่อง (ต่อคอม + รับไฟเพิ่ม ตามร้านค้า — เว็บทางการระบุช่องเดียว)
   ด่านนี้: สาย RCA ต่อไว้ให้แล้ว (fixed ทั้งเส้น) · MASTER มีสัญญาณเมื่อคอมต่อเข้าช่อง USB (via) · ใช้ได้ทั้งหัว USB-C และ USB-A ของแล็ปท็อป
   ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel4 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1], LEFT = [-1, 0, 0];
  return {
    id: 'p1-l4', phase: 1, number: 4, of: 12,
    title: 'ต่อแล็ปท็อป: USB เข้า DDJ-FLX4',
    unitsPerM: 1, slack: 1.5,
    models: { flx4: 'models/ddj_flx4.glb', dm40: 'models/dm_40d_bt.glb' },
    devices: {
      ctl: { name: 'DDJ-FLX4', model: 'flx4', node: null, offset: [0, 0, 0] },
      dmL: { name: 'DM-40D-BT ซ้าย', model: 'dm40', node: 'DM-40D-BT_Left', offset: [-0.281, 0, 0.08] },
      dmR: { name: 'DM-40D-BT ขวา', model: 'dm40', node: 'DM-40D-BT_Right', offset: [0.281, 0, 0.08] },
      lap: { name: 'แล็ปท็อป', proc: { kind: 'laptop', size: [0.31, 0.2, 0.215] }, offset: [0.52, 0, -0.36] }
    },
    desk: { min: [-0.66, -0.04, -0.55], max: [0.74, 0, 0.26] },
    overview: [[-0.5, 0, -0.5], [0.7, 0.23, 0.1]],
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', MINI: '3.5 มม.', 'USB-A': 'USB-A', 'USB-B': 'USB-B', 'USB-C': 'USB-C', SPK: 'ขั้วสายลำโพง' },
    jacks: [
      { id: 'lapUsbC', dev: 'lap', pos: [0.365, 0.009, -0.33], normal: LEFT, type: 'USB-C', dir: 'out', usable: true, short: 'C', name: 'แล็ปท็อป · USB-C' },
      { id: 'lapUsbA', dev: 'lap', pos: [0.365, 0.009, -0.30], normal: LEFT, type: 'USB-A', dir: 'out', usable: true, short: 'A', name: 'แล็ปท็อป · USB-A' },
      { id: 'ctlUsbPwr', dev: 'ctl', pos: [0.0800, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'in', usable: false, short: 'ไฟ', name: 'USB-C รับไฟเพิ่ม (รูปปลั๊ก)', hint: 'ช่องนี้รับไฟเพิ่มอย่างเดียว (ใช้ตอนต่อมือถือ) ไม่รับข้อมูลเพลง · ต่อคอมที่ช่อง USB รูปคอมพิวเตอร์ข้างๆ' },
      { id: 'ctlUsbPc', dev: 'ctl', pos: [0.0614, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'in', usable: true, short: 'USB', name: 'USB-C ต่อคอมพิวเตอร์/มือถือ' },
      { id: 'ctlR', dev: 'ctl', pos: [-0.0603, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', color: 'red', usable: true, via: 'ctlUsbPc', short: 'R', name: 'MASTER OUT · RCA R (แดง)' },
      { id: 'ctlL', dev: 'ctl', pos: [-0.0736, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', color: 'white', usable: true, via: 'ctlUsbPc', short: 'L', name: 'MASTER OUT · RCA L (ขาว)' },
      { id: 'ctlMic', dev: 'ctl', pos: [-0.1082, 0.0158, -0.1364], normal: REAR, type: 'TRS', dir: 'in', usable: false, short: 'MIC', name: 'MIC (6.35 มม.)', hint: 'ช่องรับไมโครโฟน ด่านนี้ไม่ต้องใช้' },
      { id: 'dmLInL', dev: 'dmL', pos: [-0.4284, 0.1716, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'L', name: 'INPUT · RCA L (ขาว) ลำโพงซ้าย' },
      { id: 'dmLInR', dev: 'dmL', pos: [-0.4284, 0.1582, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'R', name: 'INPUT · RCA R (แดง) ลำโพงซ้าย' },
      { id: 'dmLMini', dev: 'dmL', pos: [-0.4498, 0.1652, -0.128], normal: REAR, type: 'MINI', dir: 'in', usable: false, short: 'MINI', name: 'INPUT · STEREO MINI 3.5 มม.', hint: 'ช่อง 3.5 มม. ด่านนี้ใช้ RCA ที่ต่อไว้แล้ว' },
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
      { id: 'fixW', color: 'white', ends: ['RCA', 'RCA'], len: 1.0, fixed: ['ctlL', 'dmLInL'] },
      { id: 'fixR', color: 'red', ends: ['RCA', 'RCA'], len: 1.0, fixed: ['ctlR', 'dmLInR'] },
      { id: 'usbAC05', color: 'black', ends: ['USB-A', 'USB-C'], len: 0.5 },
      { id: 'usbCC10', color: 'black', ends: ['USB-C', 'USB-C'], len: 1.0 },
      { id: 'usbAC10', color: 'black', ends: ['USB-A', 'USB-C'], len: 1.0 },   // ยาวเท่า C⇄C ให้ทางหัว A ได้ 3 ดาวเท่ากัน (also)
      { id: 'usbAB15', color: 'gray', ends: ['USB-A', 'USB-B'], len: 1.5 },
      { id: 'w10', color: 'white', ends: ['RCA', 'RCA'], len: 1.0 }
    ],
    pairs: [{ from: 'lapUsbC', to: 'ctlUsbPc', also: [{ from: 'lapUsbA', to: 'ctlUsbPc' }] }],
    need: ['dmLInL', 'dmLInR'],   // ลำโพงต้องมีเสียงจริง (สัญญาณผ่าน USB → MASTER → ลำโพง)
    sounds: [{ dev: 'dmL', jacks: ['dmLInL'] }, { dev: 'dmR', jacks: ['dmLInR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: DDJ-FLX4 ลำโพง DM-40D-BT และแล็ปท็อปด้านหลังขวา',
    advice: [
      { title: 'USB ส่งข้อมูลกับไฟ ไม่ใช่สายเสียง', body: 'เพลงจากคอมวิ่งผ่าน USB แล้วออกที่ MASTER', how: 'ต่อ USB ก่อน ลำโพงถึงจะมีเสียง' },
      { title: 'หัว USB มีหลายแบบ', body: 'A สี่เหลี่ยมแบน · B มุมตัด · C รีเล็ก กลับหัวได้', how: 'ดูช่องทั้งสองฝั่งก่อนเลือกสาย' },
      { title: 'FLX4 ใช้ไฟจาก USB ของคอม', body: 'ต่อเส้นเดียวได้ทั้งไฟและเพลง', how: 'ช่องรูปคอมพิวเตอร์ = ต่อคอม' },
      { title: 'สาย RCA ต่อไว้ให้แล้ว', body: 'ด่านนี้ต่อแค่สาย USB', how: 'แล็ปท็อป → USB ของ FLX4' }
    ],
    notes: [
      'แล็ปท็อปเป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง มีช่อง USB-C และ USB-A ด้านซ้าย',
      'DDJ-FLX4 (เว็บทางการ): ต่อคอมด้วย USB Type-C ใช้ไฟจากคอม · ในกล่องมีสาย USB Type-C (หัวฝั่งคอมไม่ได้ระบุ ด่านนี้จึงใช้ได้ทั้งหัว A และ C)',
      'ช่อง USB-C ช่องที่สอง (รูปปลั๊ก) มีในโมเดลและในข้อมูลร้านค้า เว็บทางการไม่ได้ระบุ'
    ],
    goal: 'ด่านนี้: ต่อแล็ปท็อปเข้าคอนโทรลเลอร์ให้ลำโพงมีเสียง',
    winMsg: 'คอมต่อกับคอนโทรลเลอร์แล้ว ลำโพงมีเสียง'
  };
});
