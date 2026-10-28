/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 2 (เปลี่ยนเป็นมอนิเตอร์ที่รับ TRS: DDJ-GRV6 เข้าลำโพง DM-50D-W) — ใช้โมเดล 3D รุ่นจริง
   พิกัดเป็นเมตร ตามระบบ glTF: x ขวา, y ขึ้น, z ไปทางหน้าเครื่อง (แผงหลังหันไปทาง -z) · พื้นโต๊ะที่ y = 0
   ตำแหน่งช่องวัดจากโมเดลด้วย tools/jack-calibrate.html (24 ต.ค. 2026) แล้วบวก offset ของอุปกรณ์:
   - DDJ-GRV6: วัดจากวงแหวนช่องบนโมเดล · MASTER 1 มีป้าย BALANCED บนโมเดล
   - DM-50D-W: วัดจากภาพแผงหลังที่ติดบนโมเดล (ตรงกับภาพแผงหลังจริง)
   ข้อเท็จจริงจากเว็บทางการ (ตรวจ 24 ต.ค. 2026): DDJ-GRV6 MASTER 1 = 1/4" TRS, MASTER 2 = RCA, BOOTH = RCA
   (หน้าเว็บไม่ได้เขียนว่า MASTER 1 บาลานซ์ — ยืนยันจากป้ายบนแผงหลังในโมเดล) · DM-50D: TRS = บาลานซ์, RCA / MINI = ไม่บาลานซ์
   บทเรียน: ต่อ MASTER 1 (TRS) → TRS ของลำโพง = ถูกที่สุด · ต่อ MASTER 2 (RCA) → RCA ของลำโพงก็มีเสียง แต่นับเป็นเหตุการณ์คุณภาพ (alt)
   ค่าความยาวสาย ค่า slack และสูตรคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel2 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1];
  return {
    id: 'p1-l2', phase: 1, number: 2, of: 12,
    title: 'มอนิเตอร์รับ TRS: DDJ-GRV6 เข้า DM-50D-W',
    unitsPerM: 1,
    slack: 1.5,
    models: { grv6: 'models/ddj_grv6.glb', dm50: 'models/dm_50d_w.glb' },
    devices: {
      ctl: { name: 'DDJ-GRV6', model: 'grv6', node: null, offset: [0, 0, 0] },
      dmL: { name: 'DM-50D-W ซ้าย', model: 'dm50', node: 'DM-50D-W_Left', offset: [-0.3455, 0, 0.046] },
      dmR: { name: 'DM-50D-W ขวา', model: 'dm50', node: 'DM-50D-W_Right', offset: [0.3455, 0, 0.046] }
    },
    desk: { min: [-0.74, -0.04, -0.34], max: [0.74, 0, 0.3] },
    overview: [[-0.6, 0, -0.24], [0.6, 0.27, 0.12]],
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', MINI: '3.5 มม.', 'USB-A': 'USB-A', 'USB-C': 'USB-C', SPK: 'ขั้วสายลำโพง' },
    jacks: [
      { id: 'ctlUsbPwr', dev: 'ctl', pos: [0.1080, 0.0160, -0.1820], normal: REAR, type: 'USB-C', dir: 'in', usable: false, short: 'USB', name: 'USB-C รับไฟ (รูปปลั๊ก)', hint: 'ช่อง USB-C สำหรับรับไฟ ไม่ใช่ช่องส่งเสียง ด่านนี้ไม่ต้องใช้' },
      { id: 'ctlUsbPc',  dev: 'ctl', pos: [0.0873, 0.0152, -0.1820], normal: REAR, type: 'USB-C', dir: 'out', usable: false, short: 'USB', name: 'USB-C ต่อคอมพิวเตอร์/มือถือ', hint: 'ช่อง USB-C ต่อคอมพิวเตอร์หรือมือถือ ไปเจอในด่านที่ 4' },
      { id: 'ctlBoothR', dev: 'ctl', pos: [0.0342, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', usable: false, short: 'B R', name: 'BOOTH OUT · RCA R', hint: 'ช่อง BOOTH ส่งเสียงไปมอนิเตอร์บูธ ไปเจอในด่านที่ 6 · ด่านนี้ใช้ช่อง MASTER' },
      { id: 'ctlBoothL', dev: 'ctl', pos: [0.0188, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', usable: false, short: 'B L', name: 'BOOTH OUT · RCA L', hint: 'ช่อง BOOTH ส่งเสียงไปมอนิเตอร์บูธ ไปเจอในด่านที่ 6 · ด่านนี้ใช้ช่อง MASTER' },
      { id: 'ctlM2R', dev: 'ctl', pos: [-0.0476, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', usable: true, short: 'R', name: 'MASTER 2 · RCA R (ไม่บาลานซ์)' },
      { id: 'ctlM2L', dev: 'ctl', pos: [-0.0624, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', usable: true, short: 'L', name: 'MASTER 2 · RCA L (ไม่บาลานซ์)' },
      { id: 'ctlM1R', dev: 'ctl', pos: [-0.0899, 0.0202, -0.1860], normal: REAR, type: 'TRS', dir: 'out', ch: 'R', usable: true, short: 'R', name: 'MASTER 1 · TRS R (บาลานซ์)' },
      { id: 'ctlM1L', dev: 'ctl', pos: [-0.1103, 0.0202, -0.1860], normal: REAR, type: 'TRS', dir: 'out', ch: 'L', usable: true, short: 'L', name: 'MASTER 1 · TRS L (บาลานซ์)' },
      { id: 'ctlMic', dev: 'ctl', pos: [-0.1651, 0.0199, -0.1860], normal: REAR, type: 'TRS', dir: 'in', usable: false, short: 'MIC', name: 'MIC (6.35 มม.)', hint: 'ช่องรับไมโครโฟน ไม่ใช่ช่องส่งเสียงออก แม้หัวจะเป็น TRS เหมือนกัน ด่านนี้ไม่ต้องใช้' },
      { id: 'dmLRcaL', dev: 'dmL', pos: [-0.5095, 0.1995, -0.1990], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'L', name: 'INPUT · RCA L (ขาว) ลำโพงซ้าย' },
      { id: 'dmLRcaR', dev: 'dmL', pos: [-0.5095, 0.1867, -0.1990], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'R', name: 'INPUT · RCA R (แดง) ลำโพงซ้าย' },
      { id: 'dmLMini', dev: 'dmL', pos: [-0.5309, 0.1931, -0.1990], normal: REAR, type: 'MINI', dir: 'in', usable: false, short: 'MINI', name: 'INPUT · STEREO MINI 3.5 มม.', hint: 'ช่อง 3.5 มม. สำหรับมือถือหรือเครื่องเล่นเพลง ด่านนี้ต่อจากคอนโทรลเลอร์' },
      { id: 'dmLTrsR', dev: 'dmL', pos: [-0.5095, 0.1684, -0.1990], normal: REAR, type: 'TRS', dir: 'in', ch: 'R', usable: true, short: 'R', name: 'INPUT · TRS R (บาลานซ์) ลำโพงซ้าย' },
      { id: 'dmLTrsL', dev: 'dmL', pos: [-0.5290, 0.1684, -0.1990], normal: REAR, type: 'TRS', dir: 'in', ch: 'L', usable: true, short: 'L', name: 'INPUT · TRS L (บาลานซ์) ลำโพงซ้าย' },
      { id: 'dmLOutNeg', dev: 'dmL', pos: [-0.4610, 0.1698, -0.1990], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '−', name: 'OUTPUT TO RIGHT SPEAKER (−)', hint: 'ขั้วส่งไปลำโพงขวา ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmLOutPos', dev: 'dmL', pos: [-0.4726, 0.1698, -0.1990], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '+', name: 'OUTPUT TO RIGHT SPEAKER (+)', hint: 'ขั้วส่งไปลำโพงขวา ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInNeg', dev: 'dmR', pos: [0.4737, 0.1673, -0.1970], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '−', name: 'INPUT ลำโพงขวา (−)', hint: 'ลำโพงขวารับเสียงผ่านสายลำโพงจากลำโพงซ้าย ต่อไว้ให้แล้ว' },
      { id: 'dmRInPos', dev: 'dmR', pos: [0.4609, 0.1673, -0.1970], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '+', name: 'INPUT ลำโพงขวา (+)', hint: 'ลำโพงขวารับเสียงผ่านสายลำโพงจากลำโพงซ้าย ต่อไว้ให้แล้ว' }
    ],
    wires: [
      { from: 'dmLOutPos', to: 'dmRInPos', color: 'red' },
      { from: 'dmLOutNeg', to: 'dmRInNeg', color: 'black' }
    ],
    cables: [
      { id: 'trs05', color: 'gray', ends: ['TRS', 'TRS'], len: 0.5 },
      { id: 'trs10a', color: 'gray', ends: ['TRS', 'TRS'], len: 1.0 },
      { id: 'trs10b', color: 'gray', ends: ['TRS', 'TRS'], len: 1.0 },
      { id: 'trs15', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 },
      { id: 'w10', color: 'white', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'r10', color: 'red', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'mini15', color: 'gray', ends: ['MINI', 'RCA'], len: 1.5 },
      { id: 'usb15', color: 'gray', ends: ['USB-A', 'USB-C'], len: 1.5 }
    ],
    // คู่ที่ถูกที่สุด (TRS บาลานซ์) · alt = ทางที่มีเสียงเหมือนกันแต่ไม่บาลานซ์ นับเป็นเหตุการณ์คุณภาพ
    pairs: [
      { from: 'ctlM1L', to: 'dmLTrsL', alt: [{ from: 'ctlM2L', to: 'dmLRcaL' }] },
      { from: 'ctlM1R', to: 'dmLTrsR', alt: [{ from: 'ctlM2R', to: 'dmLRcaR' }] }
    ],
    sounds: [{ dev: 'dmL', jacks: ['dmLTrsL', 'dmLRcaL'] }, { dev: 'dmR', jacks: ['dmLTrsR', 'dmLRcaR'] }],
    altMsg: 'มีเสียง แต่เป็น RCA ไม่บาลานซ์ · ลำโพงคู่นี้รับ TRS บาลานซ์ได้ ลองต่อจาก MASTER 1',
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: DDJ-GRV6 ตรงกลาง ลำโพง DM-50D-W ซ้ายและขวา',
    advice: [
      { title: 'หัว TRS 6.35 มม.', body: 'หัวโลหะยาว มีขีดแบ่ง 2 ขีด (Tip · Ring · Sleeve)', how: 'สาย TRS เสียบได้เฉพาะช่อง TRS' },
      { title: 'TRS บาลานซ์ ทนเสียงรบกวน', body: 'RCA ไม่บาลานซ์ ใช้ได้แต่รับเสียงจี่ง่ายกว่า', how: 'MASTER 1 (TRS) → TRS ของลำโพง ได้คะแนนเต็ม' },
      { title: 'TRS แยกซ้ายขวาด้วยป้าย L / R', body: 'สาย TRS สีเดียวกันทั้งคู่ ดูป้ายข้างช่อง', how: 'L เข้า L · R เข้า R' },
      { title: 'ช่องรับอยู่ที่ลำโพงซ้าย', body: 'ลำโพงขวารับเสียงผ่านสายลำโพงจากข้างซ้าย ต่อไว้ให้แล้ว', how: 'BOOTH กับ MIC ด่านนี้ไม่ต้องใช้' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: DDJ-GRV6 และลำโพง DM-50D-W ขนาดตามสเปก',
      'ตำแหน่งช่องต่อวัดจากโมเดล ช่องของ DM-50D-W วัดจากภาพแผงหลังที่ติดบนโมเดล อาจคลาดได้ 2–3 มม.',
      'DDJ-GRV6: MASTER 1 = TRS บาลานซ์ · MASTER 2 = RCA ไม่บาลานซ์ · DM-50D-W ลำโพงซ้ายรับได้ทั้ง TRS และ RCA'
    ],
    goal: 'ด่านนี้: ทำให้ลำโพงทั้งซ้ายและขวามีเสียงด้วยสาย TRS บาลานซ์ โดยใช้สายสั้นที่สุดที่พอ',
    winMsg: 'ลำโพงทั้งสองข้างมีเสียงแล้ว'
  };
});
