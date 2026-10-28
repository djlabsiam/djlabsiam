/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 11 (โต๊ะแคบ เก็บสายให้เรียบร้อย: สายห้ามตัดกัน)
   DDJ-GRV6 (ช่องเดียวกับด่าน 2) + VM-80 ×2 วางชิดข้างเครื่อง (แต่ละตัวมีช่องรับเอง) + แล็ปท็อปทั่วไป (proc) หลังขวา
   กติกาใหม่: noCross = เส้นสายที่ผู้เล่นเห็น (ฉายตามทิศกล้อง) ห้ามตัดกัน · ตัดกัน = ยังไม่ผ่าน
   โจทย์: ในถาดมีสาย TRS ยาวพอเส้นเดียวและ RCA เส้นเดียว ต้องผสม MASTER 1 กับ MASTER 2 —
   TRS ข้าง L + RCA ข้าง R = ไม่ตัดกัน · RCA ข้าง L + TRS ข้าง R = สายไขว้กัน (ตรวจด้วย rules.js แล้ว)
   MASTER มีสัญญาณเมื่อแล็ปท็อปต่อเข้าช่อง USB (via) · ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel11 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1], LEFT = [-1, 0, 0], MASTER = ['ctlM1L', 'ctlM1R', 'ctlM2L', 'ctlM2R'];
  return {
    id: 'p1-l11', phase: 1, number: 11, of: 12,
    title: 'โต๊ะแคบ: เดินสายไม่ให้ตัดกัน',
    unitsPerM: 1, slack: 1.5,
    noCross: true,
    models: { grv6: 'models/ddj_grv6.glb', vm80: 'models/vm_80.glb' },
    devices: {
      ctl: { name: 'DDJ-GRV6', model: 'grv6', node: null, offset: [0, 0, 0] },
      vmL: { name: 'VM-80 ซ้าย', model: 'vm80', node: null, offset: [-0.55, 0, -0.04] },
      vmR: { name: 'VM-80 ขวา', model: 'vm80', node: null, offset: [0.55, 0, -0.04] },
      lap: { name: 'แล็ปท็อป', proc: { kind: 'laptop', size: [0.31, 0.2, 0.215] }, offset: [0.55, 0, -0.55] }
    },
    desk: { min: [-0.76, -0.04, -0.72], max: [0.76, 0, 0.3] },
    overview: [[-0.7, 0, -0.66], [0.72, 0.4, 0.12]],
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', XLR: 'XLR', COMBO: 'คอมโบ XLR/TRS', 'USB-C': 'USB-C' },
    jacks: [
      { id: 'lapUsbC', dev: 'lap', pos: [0.395, 0.009, -0.52], normal: LEFT, type: 'USB-C', dir: 'out', usable: true, short: 'C', name: 'แล็ปท็อป · USB-C' },
      { id: 'ctlUsbPwr', dev: 'ctl', pos: [0.1080, 0.0160, -0.1820], normal: REAR, type: 'USB-C', dir: 'in', usable: false, short: 'ไฟ', name: 'USB-C รับไฟ (รูปปลั๊ก)', hint: 'ช่องรับไฟ ไม่รับข้อมูลเพลง · ต่อคอมที่ช่องรูปคอมพิวเตอร์ข้างๆ' },
      { id: 'ctlUsbPc', dev: 'ctl', pos: [0.0873, 0.0152, -0.1820], normal: REAR, type: 'USB-C', dir: 'in', usable: true, short: 'USB', name: 'USB-C ต่อคอมพิวเตอร์/มือถือ' },
      { id: 'ctlBoothR', dev: 'ctl', pos: [0.0342, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', usable: false, short: 'B R', name: 'BOOTH OUT · RCA R', hint: 'ช่อง BOOTH ไว้สำหรับมอนิเตอร์บูธ ด่านนี้ใช้ MASTER' },
      { id: 'ctlBoothL', dev: 'ctl', pos: [0.0188, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', usable: false, short: 'B L', name: 'BOOTH OUT · RCA L', hint: 'ช่อง BOOTH ไว้สำหรับมอนิเตอร์บูธ ด่านนี้ใช้ MASTER' },
      { id: 'ctlM2R', dev: 'ctl', pos: [-0.0476, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', usable: true, via: 'ctlUsbPc', short: 'R', name: 'MASTER 2 · RCA R' },
      { id: 'ctlM2L', dev: 'ctl', pos: [-0.0624, 0.0208, -0.1860], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', usable: true, via: 'ctlUsbPc', short: 'L', name: 'MASTER 2 · RCA L' },
      { id: 'ctlM1R', dev: 'ctl', pos: [-0.0899, 0.0202, -0.1860], normal: REAR, type: 'TRS', dir: 'out', ch: 'R', usable: true, via: 'ctlUsbPc', short: 'R', name: 'MASTER 1 · TRS R (บาลานซ์)' },
      { id: 'ctlM1L', dev: 'ctl', pos: [-0.1103, 0.0202, -0.1860], normal: REAR, type: 'TRS', dir: 'out', ch: 'L', usable: true, via: 'ctlUsbPc', short: 'L', name: 'MASTER 1 · TRS L (บาลานซ์)' },
      { id: 'ctlMic', dev: 'ctl', pos: [-0.1651, 0.0199, -0.1860], normal: REAR, type: 'TRS', dir: 'in', usable: false, short: 'MIC', name: 'MIC (6.35 มม.)', hint: 'ช่องรับไมโครโฟน ด่านนี้ไม่ต้องใช้' },
      { id: 'vmLCombo', dev: 'vmL', pos: [-0.5025, 0.2346, -0.2025], normal: REAR, type: 'COMBO', accepts: ['XLR', 'TRS'], dir: 'in', ch: 'L', usable: true, short: 'IN', name: 'VM-80 ซ้าย · INPUT คอมโบ XLR/TRS' },
      { id: 'vmLRca', dev: 'vmL', pos: [-0.5025, 0.2015, -0.2025], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', usable: true, short: 'RCA', name: 'VM-80 ซ้าย · INPUT RCA' },
      { id: 'vmRCombo', dev: 'vmR', pos: [0.5975, 0.2346, -0.2025], normal: REAR, type: 'COMBO', accepts: ['XLR', 'TRS'], dir: 'in', ch: 'R', usable: true, short: 'IN', name: 'VM-80 ขวา · INPUT คอมโบ XLR/TRS' },
      { id: 'vmRRca', dev: 'vmR', pos: [0.5975, 0.2015, -0.2025], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', usable: true, short: 'RCA', name: 'VM-80 ขวา · INPUT RCA' }
    ],
    wires: [],
    cables: [
      { id: 'usbCC10', color: 'black', ends: ['USB-C', 'USB-C'], len: 1.0 },
      { id: 'trs05', color: 'gray', ends: ['TRS', 'TRS'], len: 0.5 },
      { id: 'trs15', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 },
      { id: 'r15', color: 'red', ends: ['RCA', 'RCA'], len: 1.5 },
      { id: 'w05', color: 'white', ends: ['RCA', 'RCA'], len: 0.5 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 }
    ],
    pairs: [
      { from: 'lapUsbC', to: 'ctlUsbPc' },
      { from: 'ctlM1L', to: 'vmLCombo', srcs: MASTER, also: [{ from: 'ctlM2L', to: 'vmLRca' }] },
      { from: 'ctlM2R', to: 'vmRRca', srcs: MASTER, also: [{ from: 'ctlM1R', to: 'vmRCombo' }] }
    ],
    sounds: [{ dev: 'vmL', jacks: ['vmLCombo', 'vmLRca'] }, { dev: 'vmR', jacks: ['vmRCombo', 'vmRRca'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: DDJ-GRV6 ลำโพง VM-80 ชิดซ้ายขวา และแล็ปท็อปด้านหลังขวา',
    advice: [
      { title: 'สายห้ามตัดกัน', body: 'สายไขว้กันดูรก ดึงพลาดง่าย และหาเส้นยาก', how: 'สายตัดกัน = ยังไม่ผ่าน (สายเรืองแดง)' },
      { title: 'ถาดมี TRS กับ RCA อย่างละเส้น', body: 'ต้องผสม MASTER 1 (TRS) กับ MASTER 2 (RCA)', how: 'ลองดูว่าข้างไหนใช้เส้นไหนแล้วสายไม่ไขว้' },
      { title: 'ลำโพง VM-80 มีช่องรับทุกตัว', body: 'ช่องคอมโบรับ TRS · ช่องล่างรับ RCA', how: 'ซ้ายหนึ่งเส้น ขวาหนึ่งเส้น' },
      { title: 'อย่าลืมคอม', body: 'คอนโทรลเลอร์ไม่มีเพลงถ้าไม่ต่อคอม', how: 'แล็ปท็อป → USB รูปคอมพิวเตอร์' }
    ],
    notes: [
      'ตรวจ "สายตัดกัน" จากเส้นตรงระหว่างสองปลายสาย ตามมุมที่กล้องมอง (ซูม/เลื่อนภาพไม่เปลี่ยนผล)',
      'DDJ-GRV6 ตำแหน่งช่องเดียวกับด่าน 2 · VM-80 ตำแหน่งช่องเดียวกับด่าน 6 · แล็ปท็อปเป็นรูปทรงทั่วไป',
      'ในโมเดลช่อง USB-C ที่มีรูปคอม/มือถือ = ต่อคอม · ช่องรูปปลั๊ก = รับไฟ'
    ],
    goal: 'ด่านนี้: ให้ลำโพงทั้งสองข้างมีเสียง โดยสายไม่ตัดกัน',
    winMsg: 'ลำโพงมีเสียงครบ และสายไม่ตัดกัน'
  };
});
