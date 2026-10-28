/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 1 (ห้องนอน: DDJ-FLX4 เข้าลำโพง DM-40D-BT) — ใช้โมเดล 3D รุ่นจริง
   พิกัดเป็นเมตร ตามระบบ glTF: x ขวา, y ขึ้น, z ไปทางหน้าเครื่อง (แผงหลังหันไปทาง -z) · พื้นโต๊ะที่ y = 0
   ตำแหน่งช่องวัดจากโมเดลด้วย tools/jack-calibrate.html (24 ต.ค. 2026):
   - DDJ-FLX4: RCA / MIC จากรูปทรงในโมเดล · USB-C ประมาณจากภาพแผงหลังที่ติดบนโมเดล (คลาดได้ราว 2–3 มม.)
   - DM-40D-BT: ช่องทั้งหมดวัดจากภาพแผงหลังที่ติดบนโมเดล (คลาดได้ราว 2 มม.)
   ข้อเท็จจริงจากแผงหลัง DM-40D-BT: ลำโพงซ้ายมีช่อง INPUT (RCA L/R, STEREO MINI) และขั้ว OUTPUT TO RIGHT SPEAKER
   ลำโพงขวามีเพียงขั้ว INPUT รับสายลำโพงจากข้างซ้าย
   ค่าความยาวสาย ค่า slack และสูตรคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel1 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1];
  return {
    id: 'p1-l1', phase: 1, number: 1, of: 12,
    title: 'ห้องนอน: DDJ-FLX4 เข้าลำโพง DM-40D-BT',
    unitsPerM: 1,       // พิกัดเป็นเมตรอยู่แล้ว
    slack: 1.5,         // สายต้องยาวอย่างน้อย ระยะตรง × ค่านี้ (เผื่อสายห้อยลงโต๊ะแล้วขึ้นช่อง)
    models: { flx4: 'models/ddj_flx4.glb', dm40: 'models/dm_40d_bt.glb' },
    // node = ชื่อโหนดในไฟล์ (null = ทั้งไฟล์) · offset = เลื่อนจากตำแหน่งเดิมในไฟล์
    devices: {
      ctl: { name: 'DDJ-FLX4', model: 'flx4', node: null, offset: [0, 0, 0] },
      dmL: { name: 'DM-40D-BT ซ้าย', model: 'dm40', node: 'DM-40D-BT_Left', offset: [-0.281, 0, 0.08] },
      dmR: { name: 'DM-40D-BT ขวา', model: 'dm40', node: 'DM-40D-BT_Right', offset: [0.281, 0, 0.08] }
    },
    desk: { min: [-0.66, -0.04, -0.3], max: [0.66, 0, 0.26] },
    overview: [[-0.5, 0, -0.2], [0.47, 0.23, 0.1]],   // กรอบที่กล้องจับตอนดูทั้งโต๊ะ และขอบเขตที่เลื่อนภาพได้ตอนซูม
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', MINI: '3.5 มม.', 'USB-A': 'USB-A', 'USB-C': 'USB-C', SPK: 'ขั้วสายลำโพง' },
    jacks: [
      { id: 'ctlUsbPwr', dev: 'ctl', pos: [0.0800, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'in', usable: false, short: 'USB', name: 'USB-C รับไฟ (รูปปลั๊ก)', hint: 'ช่อง USB-C สำหรับรับไฟเพิ่มเติม ไม่ใช่ช่องส่งเสียง ด่านนี้ไม่ต้องใช้' },
      { id: 'ctlUsbPc',  dev: 'ctl', pos: [0.0614, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'out', usable: false, short: 'USB', name: 'USB-C ต่อคอมพิวเตอร์/มือถือ', hint: 'ช่อง USB-C ต่อคอมพิวเตอร์หรือมือถือ ไปเจอในด่านที่ 4' },
      { id: 'ctlR',   dev: 'ctl', pos: [-0.0603, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', color: 'red',   usable: true, short: 'R', name: 'MASTER OUT · RCA R (แดง)' },
      { id: 'ctlL',   dev: 'ctl', pos: [-0.0736, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', color: 'white', usable: true, short: 'L', name: 'MASTER OUT · RCA L (ขาว)' },
      { id: 'ctlMic', dev: 'ctl', pos: [-0.1082, 0.0158, -0.1364], normal: REAR, type: 'TRS', dir: 'in', usable: false, short: 'MIC', name: 'MIC (6.35 มม. UNBALANCED)', hint: 'ช่องรับไมโครโฟน ไม่ใช่ช่องส่งเสียงออก ด่านนี้ไม่ต้องใช้' },
      { id: 'dmLInL', dev: 'dmL', pos: [-0.4284, 0.1716, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'L', name: 'INPUT · RCA L (ขาว) ลำโพงซ้าย' },
      { id: 'dmLInR', dev: 'dmL', pos: [-0.4284, 0.1582, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red',   usable: true, short: 'R', name: 'INPUT · RCA R (แดง) ลำโพงซ้าย' },
      { id: 'dmLMini', dev: 'dmL', pos: [-0.4498, 0.1652, -0.128], normal: REAR, type: 'MINI', dir: 'in', usable: false, short: 'MINI', name: 'INPUT · STEREO MINI 3.5 มม.', hint: 'ช่อง 3.5 มม. สำหรับมือถือหรือเครื่องเล่นเพลง ด่านนี้ใช้ช่อง RCA จากคอนโทรลเลอร์' },
      { id: 'dmLOutNeg', dev: 'dmL', pos: [-0.3866, 0.1517, -0.131], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '−', name: 'OUTPUT TO RIGHT SPEAKER (−)', hint: 'ขั้วส่งไปลำโพงขวา ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmLOutPos', dev: 'dmL', pos: [-0.3977, 0.1517, -0.131], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '+', name: 'OUTPUT TO RIGHT SPEAKER (+)', hint: 'ขั้วส่งไปลำโพงขวา ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInNeg', dev: 'dmR', pos: [0.3965, 0.153, -0.128], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '−', name: 'INPUT ลำโพงขวา (−)', hint: 'ลำโพงขวารับเสียงผ่านสายลำโพงจากลำโพงซ้าย ต่อไว้ให้แล้ว' },
      { id: 'dmRInPos', dev: 'dmR', pos: [0.3890, 0.153, -0.128], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '+', name: 'INPUT ลำโพงขวา (+)', hint: 'ลำโพงขวารับเสียงผ่านสายลำโพงจากลำโพงซ้าย ต่อไว้ให้แล้ว' }
    ],
    // สายที่ต่อไว้ให้แล้ว ผู้เล่นแตะไม่ได้ ไม่นับความยาว
    wires: [
      { from: 'dmLOutPos', to: 'dmRInPos', color: 'red' },
      { from: 'dmLOutNeg', to: 'dmRInNeg', color: 'black' }
    ],
    cables: [
      { id: 'w05', color: 'white', ends: ['RCA', 'RCA'], len: 0.5 },
      { id: 'w10', color: 'white', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'w30', color: 'white', ends: ['RCA', 'RCA'], len: 3.0 },
      { id: 'r05', color: 'red',   ends: ['RCA', 'RCA'], len: 0.5 },
      { id: 'r10', color: 'red',   ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'r15', color: 'red',   ends: ['RCA', 'RCA'], len: 1.5 },
      { id: 'trs20', color: 'gray', ends: ['TRS', 'TRS'], len: 2.0 },
      { id: 'usb15', color: 'gray', ends: ['USB-A', 'USB-C'], len: 1.5 },
      { id: 'mini15', color: 'gray', ends: ['MINI', 'RCA'], len: 1.5 }
    ],
    pairs: [
      { from: 'ctlL', to: 'dmLInL' },
      { from: 'ctlR', to: 'dmLInR' }
    ],
    // ลำโพงไหนมีเสียงเมื่อช่องไหนได้รับสัญญาณ (ลำโพงขวาเล่นช่อง R ผ่านสายลำโพงจากข้างซ้าย)
    sounds: [{ dev: 'dmL', jack: 'dmLInL' }, { dev: 'dmR', jack: 'dmLInR' }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: DDJ-FLX4 ตรงกลาง ลำโพง DM-40D-BT ซ้ายและขวา',
    advice: [
      { title: 'สายแต่ละเส้นไม่เหมือนกัน', body: 'ดูหัวต่อทั้งสองด้านและความยาวบนการ์ด สั้นไปเสียบไม่ถึง ยาวไปเสียคะแนน', how: 'หยิบสายจากถาด → ซูม → แตะช่องเสียบทีละปลาย' },
      { title: 'RCA: ต่อจาก OUT ไป IN', body: 'MASTER หลัง DDJ-FLX4 คือ OUT · INPUT ของลำโพงคือ IN', how: 'ปลายหนึ่งเสียบ MASTER อีกปลายเสียบ INPUT' },
      { title: 'ขาว = ซ้าย (L) · แดง = ขวา (R)', body: 'ต่อให้ตรงสี เสียงซ้ายขวาจะอยู่ถูกข้าง', how: 'ต่อสลับยังมีเสียง แต่หักคะแนน' },
      { title: 'ช่องรับอยู่ที่ลำโพงซ้าย', body: 'ลำโพงขวารับเสียงผ่านสายลำโพงจากข้างซ้าย ต่อไว้ให้แล้ว', how: 'เสียบ RCA ทั้ง L และ R เข้าลำโพงซ้าย' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: DDJ-FLX4 และลำโพง DM-40D-BT ขนาดตามสเปก',
      'ตำแหน่งช่องต่อวัดจากโมเดล ช่องบางช่องวัดจากภาพแผงหลังที่ติดบนโมเดล อาจคลาดได้ 2–3 มม.',
      'DM-40D-BT: ลำโพงซ้ายมีช่องรับสัญญาณ ลำโพงขวารับเสียงผ่านสายลำโพงจากข้างซ้าย (ต่อไว้ให้แล้ว)'
    ],
    goal: 'ด่านนี้: ทำให้ลำโพงทั้งซ้ายและขวามีเสียง โดยใช้สายสั้นที่สุดที่พอ',
    winMsg: 'ลำโพงทั้งสองข้างมีเสียงแล้ว'
  };
});
