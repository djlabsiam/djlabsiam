/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 10 (เปิดเพลงจากมือถือ: สายแปลง 3.5 มม. สเตอริโอ → RCA คู่)
   มือถือ/เครื่องเล่นเพลงทั่วไป (proc ไม่ใช่รุ่นจริง มีช่องหูฟัง 3.5 มม.) + DM-40D-BT (ตำแหน่งช่องเดียวกับด่าน 1)
   หัว RCA คู่ (RCA2) เสียบช่อง RCA L + R ของลำโพงพร้อมกัน (ช่อง dmLInLR ครอบ dmLInL/dmLInR)
   ข้อเท็จจริงจากเว็บทางการ: DM-40D-BT มีช่อง RCA และ 3.5 มม. stereo mini → สาย 3.5 ⇄ 3.5 เข้าช่อง MINI ก็ถูกเท่ากัน (also)
   (DM-40D-BT มี Bluetooth ด้วย แต่ด่านนี้ฝึกการต่อสาย)
   ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel10 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1];
  return {
    id: 'p1-l10', phase: 1, number: 10, of: 12,
    title: 'มือถือ: 3.5 มม. → RCA คู่ เข้า DM-40D-BT',
    unitsPerM: 1, slack: 1.5,
    models: { dm40: 'models/dm_40d_bt.glb' },
    devices: {
      phone: { name: 'มือถือ (ทั่วไป)', proc: { kind: 'phone', size: [0.075, 0.008, 0.155] }, offset: [-0.02, 0, -0.32] },
      dmL: { name: 'DM-40D-BT ซ้าย', model: 'dm40', node: 'DM-40D-BT_Left', offset: [-0.281, 0, 0.08] },
      dmR: { name: 'DM-40D-BT ขวา', model: 'dm40', node: 'DM-40D-BT_Right', offset: [0.281, 0, 0.08] }
    },
    desk: { min: [-0.66, -0.04, -0.5], max: [0.66, 0, 0.26] },
    overview: [[-0.5, 0, -0.42], [0.47, 0.23, 0.1]],
    typeLabels: { RCA: 'RCA', RCA2: 'RCA คู่ (ขาว+แดง)', MINI: '3.5 มม.', SPK: 'ขั้วสายลำโพง' },
    jacks: [
      { id: 'phone', dev: 'phone', pos: [-0.002, 0.004, -0.3975], normal: REAR, type: 'MINI', dir: 'out', usable: true, short: '3.5', name: 'มือถือ · ช่องหูฟัง 3.5 มม.' },
      { id: 'dmLInL', dev: 'dmL', pos: [-0.4284, 0.1716, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'L', name: 'INPUT · RCA L (ขาว) ลำโพงซ้าย' },
      { id: 'dmLInR', dev: 'dmL', pos: [-0.4284, 0.1582, -0.128], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'R', name: 'INPUT · RCA R (แดง) ลำโพงซ้าย' },
      { id: 'dmLInLR', dev: 'dmL', pos: [-0.4284, 0.1649, -0.128], normal: REAR, type: 'RCA2', dir: 'in', usable: true, covers: ['dmLInL', 'dmLInR'], name: 'INPUT · RCA L + R ลำโพงซ้าย' },
      { id: 'dmLMini', dev: 'dmL', pos: [-0.4498, 0.1652, -0.128], normal: REAR, type: 'MINI', dir: 'in', usable: true, short: 'MINI', name: 'INPUT · STEREO MINI 3.5 มม.' },
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
      { id: 'y05', color: 'black', ends: ['MINI', 'RCA2'], len: 0.5, label: 'สาย 3.5 มม. → RCA คู่' },
      { id: 'y10', color: 'black', ends: ['MINI', 'RCA2'], len: 1.0, label: 'สาย 3.5 มม. → RCA คู่' },
      { id: 'mini10', color: 'gray', ends: ['MINI', 'MINI'], len: 1.0 },
      { id: 'w10', color: 'white', ends: ['RCA', 'RCA'], len: 1.0 }
    ],
    pairs: [{ from: 'phone', to: 'dmLInLR', also: [{ from: 'phone', to: 'dmLMini' }] }],
    sounds: [{ dev: 'dmL', jacks: ['dmLInL', 'dmLMini'] }, { dev: 'dmR', jacks: ['dmLInR', 'dmLMini'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: มือถือวางกลางโต๊ะ ลำโพง DM-40D-BT ซ้ายและขวา',
    advice: [
      { title: 'ช่องหูฟัง 3.5 มม. เป็นสเตอริโอ', body: 'หัวเดียวมีทั้งซ้ายและขวา', how: 'สายแปลงแยกเป็น RCA ขาว (L) แดง (R)' },
      { title: 'สาย 3.5 มม. → RCA คู่', body: 'หัว RCA คู่เสียบ L และ R พร้อมกัน', how: 'แตะช่อง L หรือ R ก็ได้ เสียบทั้งคู่ให้เอง' },
      { title: 'ลำโพงนี้มีช่อง 3.5 มม. ด้วย', body: 'สาย 3.5 ⇄ 3.5 ก็ใช้ได้', how: 'เลือกแบบไหนก็ได้ ความยาวพอ' }
    ],
    notes: [
      'มือถือเป็นรูปทรงทั่วไป ไม่ใช่รุ่นจริง (มือถือหลายรุ่นไม่มีช่อง 3.5 มม. แล้ว ต้องใช้ตัวแปลงจาก USB-C/Lightning)',
      'DM-40D-BT (เว็บทางการ): ช่อง RCA และ 3.5 มม. stereo mini · มี Bluetooth ด้วย แต่ด่านนี้ฝึกการต่อสาย',
      'ตำแหน่งช่องลำโพงเดียวกับด่าน 1'
    ],
    goal: 'ด่านนี้: เปิดเพลงจากมือถือให้ลำโพงทั้งสองข้างมีเสียง',
    winMsg: 'เพลงจากมือถือออกลำโพงทั้งสองข้างแล้ว'
  };
});
