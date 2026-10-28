/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 12 (สอบรวม Phase 1: ห้องซ้อมเต็มชุด)
   DDJ-GRV6 + VM-80 ×2 (ลำโพงหลัก ช่องเดียวกับด่าน 11) + แล็ปท็อปทั่วไป + ซับวูฟเฟอร์ทั่วไป (proc) หลังซ้าย
   รวมบทเรียน: USB ต่อคอม (ด่าน 4) · TRS บาลานซ์ (ด่าน 2) · ซับแบบ "แยกออก" จาก MASTER 2 (ด่าน 7) · ซ้ายขวา (ด่าน 1)
   งบสาย (ด่าน 8) · สายห้ามตัดกัน (ด่าน 11) — ตรวจด้วย rules.js แล้วว่าคำตอบที่ถูกไม่มีสายตัดกัน
   ไม่ได้รวม: หูฟัง (ต้องมองหน้าเครื่อง) · BOOTH · ลำโพงพาสซีฟ · มือถือ · Standalone — วางรวมบนโต๊ะเดียวแล้วสายตัดกันเลี่ยงไม่ได้หรือชนกัน
   ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel12 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1], LEFT = [-1, 0, 0], M1 = ['ctlM1L', 'ctlM1R', 'ctlM2L', 'ctlM2R'], M2 = ['ctlM2L', 'ctlM2R'];
  return {
    id: 'p1-l12', phase: 1, number: 12, of: 12,
    title: 'สอบรวม Phase 1: ห้องซ้อมเต็มชุด',
    unitsPerM: 1, slack: 1.5,
    noCross: true,
    budget: 6.0,
    models: { grv6: 'models/ddj_grv6.glb', vm80: 'models/vm_80.glb' },
    devices: {
      ctl: { name: 'DDJ-GRV6', model: 'grv6', node: null, offset: [0, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [-0.55, 0, -0.04] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [0.55, 0, -0.04] },
      lap: { name: 'แล็ปท็อป', proc: { kind: 'laptop', size: [0.31, 0.2, 0.215] }, offset: [0.55, 0, -0.55] },
      sub: { name: 'ซับวูฟเฟอร์ (ทั่วไป)', proc: { kind: 'sub', size: [0.3, 0.3, 0.3] }, offset: [-0.32, 0, -0.52] }
    },
    desk: { min: [-0.76, -0.04, -0.74], max: [0.76, 0, 0.3] },
    overview: [[-0.7, 0, -0.68], [0.72, 0.4, 0.12]],
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', XLR: 'XLR', COMBO: 'คอมโบ XLR/TRS', 'USB-A': 'USB-A', 'USB-C': 'USB-C' },
    jacks: [
      { id: 'lapUsbC', dev: 'lap', pos: [0.395, 0.009, -0.52], normal: LEFT, type: 'USB-C', dir: 'out', usable: true, short: 'C', name: 'แล็ปท็อป · USB-C' },
      { id: 'ctlUsbPwr', dev: 'ctl', pos: [0.1080, 0.0160, -0.1820], normal: REAR, type: 'USB-C', dir: 'in', usable: false, short: 'ไฟ', name: 'USB-C รับไฟ (รูปปลั๊ก)', hint: 'ช่องรับไฟ ไม่รับข้อมูลเพลง · ต่อคอมที่ช่องรูปคอมพิวเตอร์ข้างๆ' },
      { id: 'ctlUsbPc', dev: 'ctl', pos: [0.0873, 0.0152, -0.1820], normal: REAR, type: 'USB-C', dir: 'in', usable: true, short: 'USB', name: 'USB-C ต่อคอมพิวเตอร์/มือถือ' },
      { id: 'ctlBoothR', dev: 'ctl', pos: [0.0342, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', usable: false, short: 'B R', name: 'BOOTH OUT · RCA R', hint: 'ห้องนี้ไม่มีมอนิเตอร์บูธ · ซับต่อจาก MASTER 2' },
      { id: 'ctlBoothL', dev: 'ctl', pos: [0.0188, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', usable: false, short: 'B L', name: 'BOOTH OUT · RCA L', hint: 'ห้องนี้ไม่มีมอนิเตอร์บูธ · ซับต่อจาก MASTER 2' },
      { id: 'ctlM2R', dev: 'ctl', pos: [-0.0476, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', usable: true, via: 'ctlUsbPc', short: 'R', name: 'MASTER 2 · RCA R (ไม่บาลานซ์)' },
      { id: 'ctlM2L', dev: 'ctl', pos: [-0.0624, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', usable: true, via: 'ctlUsbPc', short: 'L', name: 'MASTER 2 · RCA L (ไม่บาลานซ์)' },
      { id: 'ctlM1R', dev: 'ctl', pos: [-0.0899, 0.0202, -0.1860], normal: REAR, type: 'TRS', dir: 'out', ch: 'R', usable: true, via: 'ctlUsbPc', short: 'R', name: 'MASTER 1 · TRS R (บาลานซ์)' },
      { id: 'ctlM1L', dev: 'ctl', pos: [-0.1103, 0.0202, -0.1860], normal: REAR, type: 'TRS', dir: 'out', ch: 'L', usable: true, via: 'ctlUsbPc', short: 'L', name: 'MASTER 1 · TRS L (บาลานซ์)' },
      { id: 'ctlMic', dev: 'ctl', pos: [-0.1651, 0.0199, -0.1860], normal: REAR, type: 'TRS', dir: 'in', usable: false, short: 'MIC', name: 'MIC (6.35 มม.)', hint: 'ช่องรับไมโครโฟน ด่านนี้ไม่ต้องใช้' },
      { id: 'vmLCombo', dev: 'vmL', pos: [-0.5025, 0.2346, -0.2025], normal: REAR, type: 'COMBO', accepts: ['XLR', 'TRS'], dir: 'in', ch: 'L', usable: true, short: 'IN', name: 'VM-80 ซ้าย · INPUT คอมโบ XLR/TRS (บาลานซ์)' },
      { id: 'vmLRca', dev: 'vmL', pos: [-0.5025, 0.2015, -0.2025], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', usable: true, short: 'RCA', name: 'VM-80 ซ้าย · INPUT RCA' },
      { id: 'vmRCombo', dev: 'vmR', pos: [0.5975, 0.2346, -0.2025], normal: REAR, type: 'COMBO', accepts: ['XLR', 'TRS'], dir: 'in', ch: 'R', usable: true, short: 'IN', name: 'VM-80 ขวา · INPUT คอมโบ XLR/TRS (บาลานซ์)' },
      { id: 'vmRRca', dev: 'vmR', pos: [0.5975, 0.2015, -0.2025], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', usable: true, short: 'RCA', name: 'VM-80 ขวา · INPUT RCA' },
      { id: 'subInL', dev: 'sub', pos: [-0.30, 0.20, -0.67], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'IN L', name: 'ซับ · LINE IN L (ขาว)' },
      { id: 'subInR', dev: 'sub', pos: [-0.27, 0.20, -0.67], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'IN R', name: 'ซับ · LINE IN R (แดง)' },
      { id: 'subOutL', dev: 'sub', pos: [-0.30, 0.13, -0.67], normal: REAR, type: 'RCA', dir: 'out', usable: false, short: 'OUT', name: 'ซับ · LINE OUT L', hint: 'ห้องนี้ต่อซับแบบแยกออก (MASTER 2 → ซับ) ไม่ต้องใช้ LINE OUT' },
      { id: 'subOutR', dev: 'sub', pos: [-0.27, 0.13, -0.67], normal: REAR, type: 'RCA', dir: 'out', usable: false, short: 'OUT', name: 'ซับ · LINE OUT R', hint: 'ห้องนี้ต่อซับแบบแยกออก (MASTER 2 → ซับ) ไม่ต้องใช้ LINE OUT' }
    ],
    wires: [],
    cables: [
      { id: 'usbAC05', color: 'black', ends: ['USB-A', 'USB-C'], len: 0.5 },
      { id: 'usbCC10', color: 'black', ends: ['USB-C', 'USB-C'], len: 1.0 },
      { id: 'trs10', color: 'gray', ends: ['TRS', 'TRS'], len: 1.0 },
      { id: 'trs15', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 },
      { id: 'trs30', color: 'gray', ends: ['TRS', 'TRS'], len: 3.0 },
      { id: 'w10', color: 'white', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'r10', color: 'red', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'w20', color: 'white', ends: ['RCA', 'RCA'], len: 2.0 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 }
    ],
    pairs: [
      { from: 'lapUsbC', to: 'ctlUsbPc' },
      { from: 'ctlM1L', to: 'vmLCombo', srcs: M1, alt: [{ from: 'ctlM2L', to: 'vmLRca' }] },
      { from: 'ctlM1R', to: 'vmRCombo', srcs: M1, alt: [{ from: 'ctlM2R', to: 'vmRRca' }] },
      { from: 'ctlM2L', to: 'subInL', srcs: M2 },
      { from: 'ctlM2R', to: 'subInR', srcs: M2 }
    ],
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo', 'vmLRca'] }, { dev: 'vmR', jacks: ['vmRCombo', 'vmRRca'] }, { dev: 'sub', jacks: ['subInL', 'subInR'] }],
    altMsg: 'ลำโพงหลักมีเสียง แต่ใช้ RCA ไม่บาลานซ์ · ลำโพงหลักควรใช้ MASTER 1 (TRS บาลานซ์)',
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: DDJ-GRV6 ลำโพง VM-80 ซ้ายขวา แล็ปท็อปหลังขวา ซับวูฟเฟอร์หลังซ้าย',
    advice: [
      { title: 'สอบรวม Phase 1', body: 'ใช้ทุกอย่างที่ฝึกมา ไม่มีคำใบ้เพิ่ม', how: 'คอม · ลำโพงหลัก · ซับ' },
      { title: 'กติกาครบชุด', body: 'สายต้องยาวพอ · ไม่เกินงบ · ไม่ตัดกัน · ซ้ายขวาถูก', how: 'ลำโพงหลักใช้สายบาลานซ์' },
      { title: 'ซับต่อแบบแยกออก', body: 'MASTER 1 ไปลำโพงหลัก · MASTER 2 ไปซับ', how: 'ซับไม่ต้องส่งต่อ' }
    ],
    notes: [
      'ซับวูฟเฟอร์และแล็ปท็อปเป็นรูปทรงทั่วไป · DDJ-GRV6 และ VM-80 เป็นโมเดลรุ่นจริง (ช่องเดียวกับด่าน 2 / 11)',
      'ด่านสอบนี้ไม่ได้รวม หูฟัง · BOOTH · ลำโพงพาสซีฟ · มือถือ · Standalone (วางรวมบนโต๊ะเดียวแล้วสายตัดกันเลี่ยงไม่ได้)',
      'งบสาย 6.0 ม. · คำตอบสั้นสุด 5.5 ม.'
    ],
    goal: 'ด่านนี้: ให้ลำโพงหลักทั้งสองข้างและซับมีเสียง ไม่เกินงบ และสายไม่ตัดกัน',
    winMsg: 'ผ่านสอบรวม Phase 1 · ห้องซ้อมพร้อมใช้งาน'
  };
});
