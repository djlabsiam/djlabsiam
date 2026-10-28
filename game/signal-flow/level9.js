/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 9 (ลำโพงพาสซีฟกับแอมป์เล็ก: สายลำโพงต่างจากสายสัญญาณ ห้ามสลับ)
   DDJ-FLX4 (ตำแหน่งช่องเดียวกับด่าน 1) + แอมป์เล็กทั่วไป + ลำโพงพาสซีฟทั่วไป ×2 (proc ไม่ใช่รุ่นจริง)
   แอมป์: LINE IN L/R (RCA) · SPEAKER OUT L/R (ขั้วลำโพง) มีสัญญาณเมื่อ IN ข้างเดียวกันได้สัญญาณ (via)
   ลำโพงพาสซีฟ: ขั้วรับสายลำโพงหนึ่งชุดต่อตัว (ในเกมรวม +/− เป็นช่องเดียว ยังไม่ฝึกเรื่องขั้วบวกลบ)
   สายลำโพง (SPKC) เสียบได้แค่ขั้วลำโพง · สาย RCA เสียบขั้วลำโพงไม่ได้ (ชนิดหัวไม่ตรง)
   ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel9 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1], MASTER = ['ctlL', 'ctlR'], AMPOUT = ['ampOutL', 'ampOutR'];
  return {
    id: 'p1-l9', phase: 1, number: 9, of: 12,
    title: 'ลำโพงพาสซีฟ: FLX4 → แอมป์ → ลำโพง',
    unitsPerM: 1, slack: 1.5,
    models: { flx4: 'models/ddj_flx4.glb' },
    devices: {
      ctl: { name: 'DDJ-FLX4', model: 'flx4', node: null, offset: [0, 0, 0] },
      amp: { name: 'แอมป์ขยายเสียง (ทั่วไป)', proc: { kind: 'amp', size: [0.22, 0.07, 0.2] }, offset: [0.55, 0, -0.38] },
      pasL: { name: 'ลำโพงพาสซีฟ ซ้าย', proc: { kind: 'passive', size: [0.16, 0.25, 0.19] }, offset: [-0.34, 0, 0] },
      pasR: { name: 'ลำโพงพาสซีฟ ขวา', proc: { kind: 'passive', size: [0.16, 0.25, 0.19] }, offset: [0.34, 0, 0] }
    },
    desk: { min: [-0.62, -0.04, -0.56], max: [0.78, 0, 0.26] },
    overview: [[-0.46, 0, -0.5], [0.7, 0.26, 0.1]],
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', SPKC: 'ขั้วลำโพง', 'USB-C': 'USB-C' },
    jacks: [
      { id: 'ctlUsbPwr', dev: 'ctl', pos: [0.0800, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'in', usable: false, short: 'USB', name: 'USB-C รับไฟ', hint: 'ช่อง USB ไม่ใช่ช่องเสียง ด่านนี้ไม่ต้องใช้' },
      { id: 'ctlUsbPc', dev: 'ctl', pos: [0.0614, 0.0116, -0.1309], normal: REAR, type: 'USB-C', dir: 'out', usable: false, short: 'USB', name: 'USB-C ต่อคอมพิวเตอร์', hint: 'ช่อง USB ไม่ใช่ช่องเสียง ด่านนี้ไม่ต้องใช้' },
      { id: 'ctlR', dev: 'ctl', pos: [-0.0603, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', color: 'red', usable: true, short: 'R', name: 'MASTER OUT · RCA R (แดง)' },
      { id: 'ctlL', dev: 'ctl', pos: [-0.0736, 0.0158, -0.1364], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', color: 'white', usable: true, short: 'L', name: 'MASTER OUT · RCA L (ขาว)' },
      { id: 'ctlMic', dev: 'ctl', pos: [-0.1082, 0.0158, -0.1364], normal: REAR, type: 'TRS', dir: 'in', usable: false, short: 'MIC', name: 'MIC (6.35 มม.)', hint: 'ช่องรับไมโครโฟน ด่านนี้ไม่ต้องใช้' },
      { id: 'ampInL', dev: 'amp', pos: [0.47, 0.045, -0.48], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'IN L', name: 'แอมป์ · LINE IN L (ขาว)' },
      { id: 'ampInR', dev: 'amp', pos: [0.50, 0.045, -0.48], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'IN R', name: 'แอมป์ · LINE IN R (แดง)' },
      { id: 'ampOutL', dev: 'amp', pos: [0.58, 0.035, -0.48], normal: REAR, type: 'SPKC', dir: 'out', ch: 'L', usable: true, via: 'ampInL', short: 'SP L', name: 'แอมป์ · SPEAKER OUT L (ขั้วลำโพง)' },
      { id: 'ampOutR', dev: 'amp', pos: [0.62, 0.035, -0.48], normal: REAR, type: 'SPKC', dir: 'out', ch: 'R', usable: true, via: 'ampInR', short: 'SP R', name: 'แอมป์ · SPEAKER OUT R (ขั้วลำโพง)' },
      { id: 'pasL', dev: 'pasL', pos: [-0.34, 0.07, -0.095], normal: REAR, type: 'SPKC', dir: 'in', ch: 'L', usable: true, short: 'IN', name: 'ลำโพงพาสซีฟซ้าย · ขั้วรับสายลำโพง' },
      { id: 'pasR', dev: 'pasR', pos: [0.34, 0.07, -0.095], normal: REAR, type: 'SPKC', dir: 'in', ch: 'R', usable: true, short: 'IN', name: 'ลำโพงพาสซีฟขวา · ขั้วรับสายลำโพง' }
    ],
    wires: [],
    cables: [
      { id: 'w10', color: 'white', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'r10', color: 'red', ends: ['RCA', 'RCA'], len: 1.0 },
      { id: 'w15', color: 'white', ends: ['RCA', 'RCA'], len: 1.5 },
      { id: 'r15', color: 'red', ends: ['RCA', 'RCA'], len: 1.5 },
      { id: 'sp10', color: 'black', ends: ['SPKC', 'SPKC'], len: 1.0, label: 'สายลำโพง' },
      { id: 'sp20', color: 'black', ends: ['SPKC', 'SPKC'], len: 2.0, label: 'สายลำโพง' },
      { id: 'sp30', color: 'black', ends: ['SPKC', 'SPKC'], len: 3.0, label: 'สายลำโพง' }
    ],
    pairs: [
      { from: 'ctlL', to: 'ampInL', srcs: MASTER },
      { from: 'ctlR', to: 'ampInR', srcs: MASTER },
      { from: 'ampOutL', to: 'pasL', srcs: AMPOUT },
      { from: 'ampOutR', to: 'pasR', srcs: AMPOUT }
    ],
    sounds: [{ dev: 'pasL', jacks: ['pasL'] }, { dev: 'pasR', jacks: ['pasR'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: DDJ-FLX4 ลำโพงพาสซีฟซ้ายขวา และแอมป์ด้านหลังขวา',
    advice: [
      { title: 'ลำโพงพาสซีฟไม่มีแอมป์ในตัว', body: 'ต้องมีแอมป์ขยายเสียงก่อนเข้าลำโพง', how: 'MASTER → แอมป์ → ลำโพง' },
      { title: 'สายสัญญาณ ≠ สายลำโพง', body: 'RCA ส่งสัญญาณเบา · สายลำโพงส่งกำลังจากแอมป์', how: 'ห้ามสลับ เสียบผิดชนิดไม่ได้' },
      { title: 'แอมป์ส่งเสียงเมื่อมีสัญญาณเข้า', body: 'ต่อ SPEAKER OUT อย่างเดียว ลำโพงยังเงียบ', how: 'ต่อ LINE IN ให้ครบด้วย' }
    ],
    notes: [
      'แอมป์และลำโพงพาสซีฟเป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง',
      'ในเกมรวมขั้ว + และ − เป็นช่องเดียว ของจริงต้องต่อให้ตรงขั้ว (บวกเข้าบวก ลบเข้าลบ)',
      'DDJ-FLX4 ตำแหน่งช่องเดียวกับด่าน 1'
    ],
    goal: 'ด่านนี้: ให้ลำโพงพาสซีฟทั้งสองข้างมีเสียง ผ่านแอมป์',
    winMsg: 'ลำโพงพาสซีฟทั้งสองข้างมีเสียงแล้ว'
  };
});
