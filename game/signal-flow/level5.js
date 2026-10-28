/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 5 (เครื่อง Standalone ไม่ใช้คอม: XDJ-AZ เข้าลำโพง DM-50D-W · เลือกช่องออกที่เหมาะ)
   พิกัดเป็นเมตร ตามระบบ glTF: x ขวา, y ขึ้น, z ไปทางหน้าเครื่อง (แผงหลังหันไปทาง -z) · พื้นโต๊ะที่ y = 0
   ตำแหน่งช่องวัดจากโมเดลด้วย tools/jack-calibrate.html (24 ต.ค. 2026): XDJ-AZ แผงหลังอยู่ใต้ขอบยื่นของตัวเครื่อง (z −0.178)
   DM-50D-W: ช่องเดียวกับด่าน 2 (วัดจากภาพแผงหลังบนโมเดล) + offset ใหม่
   ข้อเท็จจริง (คู่มือทางการ XDJ-AZ ผ่านผลค้นหา, ตรวจ 24 ต.ค. 2026): MASTER OUT 1 = XLR บาลานซ์ · MASTER OUT 2 = RCA ไม่บาลานซ์ · BOOTH OUT = TRS 6.35 บาลานซ์
   DM-50D ไม่มีช่อง XLR → ทางที่ดีที่สุด = MASTER 1 (XLR) ด้วยสาย XLR → TRS เข้าช่อง TRS ของลำโพง (บาลานซ์ทั้งเส้น)
   ทางสำรอง (หักคะแนน): MASTER 2 RCA → RCA (ไม่บาลานซ์) · BOOTH TRS → TRS (ผิดหน้าที่ช่อง)
   ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel5 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1];
  return {
    id: 'p1-l5', phase: 1, number: 5, of: 12,
    title: 'Standalone: XDJ-AZ เข้า DM-50D-W',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.48, -0.77],   // ต่ำกว่าปกตินิดหน่อย ให้มองลอดขอบยื่นเห็นแผงหลัง XDJ-AZ
    models: { az: 'models/xdj_az.glb', dm50: 'models/dm_50d_w.glb' },
    devices: {
      ctl: { name: 'XDJ-AZ', model: 'az', node: null, offset: [0, 0, 0] },
      dmL: { name: 'DM-50D-W ซ้าย', model: 'dm50', node: 'DM-50D-W_Left', offset: [-0.4375, 0, -0.024] },
      dmR: { name: 'DM-50D-W ขวา', model: 'dm50', node: 'DM-50D-W_Right', offset: [0.4375, 0, -0.024] }
    },
    desk: { min: [-0.78, -0.04, -0.42], max: [0.78, 0, 0.34] },
    overview: [[-0.7, 0, -0.3], [0.7, 0.27, 0.12]],
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', XLR: 'XLR', MINI: '3.5 มม.', SPK: 'ขั้วสายลำโพง' },
    jacks: [
      { id: 'azM1R', dev: 'ctl', pos: [0.1137, 0.0131, -0.1782], normal: REAR, type: 'XLR', dir: 'out', ch: 'R', usable: true, short: 'R', name: 'MASTER 1 · XLR R (บาลานซ์)' },
      { id: 'azM1L', dev: 'ctl', pos: [0.0855, 0.0131, -0.1782], normal: REAR, type: 'XLR', dir: 'out', ch: 'L', usable: true, short: 'L', name: 'MASTER 1 · XLR L (บาลานซ์)' },
      { id: 'azM2L', dev: 'ctl', pos: [0.0563, 0.0229, -0.1782], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', color: 'white', usable: true, short: 'L', name: 'MASTER 2 · RCA L (ไม่บาลานซ์)' },
      { id: 'azM2R', dev: 'ctl', pos: [0.0563, 0.0050, -0.1782], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', color: 'red', usable: true, short: 'R', name: 'MASTER 2 · RCA R (ไม่บาลานซ์)' },
      { id: 'azBoothR', dev: 'ctl', pos: [0.0260, 0.0046, -0.1782], normal: REAR, type: 'TRS', dir: 'out', ch: 'R', usable: true, short: 'B R', name: 'BOOTH · TRS R (บาลานซ์)' },
      { id: 'azBoothL', dev: 'ctl', pos: [0.0042, 0.0046, -0.1782], normal: REAR, type: 'TRS', dir: 'out', ch: 'L', usable: true, short: 'B L', name: 'BOOTH · TRS L (บาลานซ์)' },
      { id: 'dmLRcaL', dev: 'dmL', pos: [-0.6015, 0.1995, -0.269], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'L', name: 'INPUT · RCA L (ขาว) ลำโพงซ้าย' },
      { id: 'dmLRcaR', dev: 'dmL', pos: [-0.6015, 0.1867, -0.269], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'R', name: 'INPUT · RCA R (แดง) ลำโพงซ้าย' },
      { id: 'dmLMini', dev: 'dmL', pos: [-0.6229, 0.1931, -0.269], normal: REAR, type: 'MINI', dir: 'in', usable: false, short: 'MINI', name: 'INPUT · STEREO MINI 3.5 มม.', hint: 'ช่อง 3.5 มม. สำหรับมือถือ ด่านนี้ต่อจาก XDJ-AZ' },
      { id: 'dmLTrsR', dev: 'dmL', pos: [-0.6015, 0.1684, -0.269], normal: REAR, type: 'TRS', dir: 'in', ch: 'R', usable: true, short: 'R', name: 'INPUT · TRS R (บาลานซ์) ลำโพงซ้าย' },
      { id: 'dmLTrsL', dev: 'dmL', pos: [-0.6210, 0.1684, -0.269], normal: REAR, type: 'TRS', dir: 'in', ch: 'L', usable: true, short: 'L', name: 'INPUT · TRS L (บาลานซ์) ลำโพงซ้าย' },
      { id: 'dmLOutNeg', dev: 'dmL', pos: [-0.5530, 0.1698, -0.269], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '−', name: 'OUTPUT TO RIGHT SPEAKER (−)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmLOutPos', dev: 'dmL', pos: [-0.5646, 0.1698, -0.269], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '+', name: 'OUTPUT TO RIGHT SPEAKER (+)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInNeg', dev: 'dmR', pos: [0.5657, 0.1673, -0.267], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '−', name: 'INPUT ลำโพงขวา (−)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInPos', dev: 'dmR', pos: [0.5529, 0.1673, -0.267], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '+', name: 'INPUT ลำโพงขวา (+)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' }
    ],
    wires: [
      { from: 'dmLOutPos', to: 'dmRInPos', color: 'red' },
      { from: 'dmLOutNeg', to: 'dmRInNeg', color: 'black' }
    ],
    cables: [
      { id: 'xt10', color: 'black', ends: ['XLR', 'TRS'], len: 1.0 },
      { id: 'xt15a', color: 'black', ends: ['XLR', 'TRS'], len: 1.5 },
      { id: 'xt15b', color: 'black', ends: ['XLR', 'TRS'], len: 1.5 },
      { id: 'xx15', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'trs15a', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 },
      { id: 'trs15b', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 },
      { id: 'w15', color: 'white', ends: ['RCA', 'RCA'], len: 1.5 },
      { id: 'r15', color: 'red', ends: ['RCA', 'RCA'], len: 1.5 }
    ],
    pairs: [
      { from: 'azM1L', to: 'dmLTrsL', alt: [{ from: 'azM2L', to: 'dmLRcaL' }, { from: 'azBoothL', to: 'dmLTrsL' }] },
      { from: 'azM1R', to: 'dmLTrsR', alt: [{ from: 'azM2R', to: 'dmLRcaR' }, { from: 'azBoothR', to: 'dmLTrsR' }] }
    ],
    sounds: [{ dev: 'dmL', jacks: ['dmLTrsL', 'dmLRcaL'] }, { dev: 'dmR', jacks: ['dmLTrsR', 'dmLRcaR'] }],
    altMsg: 'มีเสียง แต่ยังไม่ใช่ทางที่ดีที่สุด · MASTER 2 (RCA) ไม่บาลานซ์ · BOOTH ไว้สำหรับมอนิเตอร์บูธ · ลองต่อ MASTER 1 (XLR) ด้วยสาย XLR → TRS',
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: XDJ-AZ ตรงกลาง ลำโพง DM-50D-W ซ้ายและขวา',
    advice: [
      { title: 'Standalone ไม่ต้องใช้คอม', body: 'เล่นจาก USB หรือการ์ดในตัวเครื่องได้เลย', how: 'ต่อแค่ช่องออกไปลำโพง' },
      { title: 'ช่องออกมีหลายชุด', body: 'MASTER 1 = XLR บาลานซ์ · MASTER 2 = RCA · BOOTH = TRS', how: 'ลำโพงหลักใช้ MASTER' },
      { title: 'สาย XLR → TRS', body: 'ลำโพงไม่มีช่อง XLR ใช้สายแปลงหัว ยังบาลานซ์ทั้งเส้น', how: 'MASTER 1 → TRS ของลำโพง' },
      { title: 'ช่องรับอยู่ที่ลำโพงซ้าย', body: 'ลำโพงขวารับผ่านสายลำโพงที่ต่อไว้แล้ว', how: 'L เข้า L · R เข้า R' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: XDJ-AZ และลำโพง DM-50D-W ขนาดตามสเปก',
      'XDJ-AZ (คู่มือทางการ): MASTER 1 XLR บาลานซ์ · MASTER 2 RCA · BOOTH TRS บาลานซ์ — ตรงกับแผงหลังในโมเดล',
      'แผงหลัง XDJ-AZ อยู่ใต้ขอบยื่น ด่านนี้กล้องต่ำลงเล็กน้อยให้มองเห็นช่อง'
    ],
    goal: 'ด่านนี้: ให้ลำโพงทั้งสองข้างมีเสียง ด้วยช่องออกที่เหมาะที่สุด',
    winMsg: 'ลำโพงทั้งสองข้างมีเสียงแล้ว'
  };
});
