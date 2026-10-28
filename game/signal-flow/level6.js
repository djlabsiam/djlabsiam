/* Signal Flow: ข้อมูลด่าน Phase 1 ด่าน 6 (เพิ่มมอนิเตอร์บูธ: MASTER กับ BOOTH ต่างกันอย่างไร)
   XDJ-AZ + ลำโพงหลัก VM-80 ×2 ด้านนอก (แต่ละตัวมีช่องรับของตัวเอง · ลำโพงใหญ่ 8") + ลำโพงบูธ DM-50D-W ใกล้ดีเจ (ตำแหน่งเดียวกับด่าน 5)
   เจ้าของแก้ 25 ต.ค. 2026: VM-80 ต้องเป็นลำโพงหลักตามความจริง (เดิมกลับกัน)
   ตำแหน่งช่อง VM-80 วัดจากภาพแผงหลังบนโมเดล (24 ต.ค. 2026): INPUT = คอมโบ XLR/TRS (BALANCED) + RCA (UNBALANCED)
   ข้อเท็จจริง: XDJ-AZ ตามด่าน 5 · VM-80 ช่องรับต่อตัว = คอมโบ XLR/TRS + RCA (ข้อมูลร้านค้า + FAQ ทางการผ่านผลค้นหา · หน้าสเปกทางการไม่ระบุช่อง) — ตรงกับแผงหลังในโมเดล
   บทเรียน: MASTER → ลำโพงหลัก VM-80 · BOOTH → ลำโพงบูธ DM-50D-W (ปรับเสียงแยกกันได้) · ต่อสลับหน้าที่ = ยังไม่ผ่าน (srcs)
   ค่าความยาวสายและคะแนนเป็นค่าเสนอ ยังไม่ปรับสมดุล */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFLevel6 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1], MASTER = ['azM1L', 'azM1R', 'azM2L', 'azM2R'], BOOTH = ['azBoothL', 'azBoothR'];
  return {
    id: 'p1-l6', phase: 1, number: 6, of: 12,
    title: 'มอนิเตอร์บูธ: MASTER กับ BOOTH',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.48, -0.77],
    models: { az: 'models/xdj_az.glb', dm50: 'models/dm_50d_w.glb', vm80: 'models/vm_80.glb' },
    devices: {
      ctl: { name: 'XDJ-AZ', model: 'az', node: null, offset: [0, 0, 0] },
      dmL: { name: 'DM-50D-W ซ้าย (บูธ)', model: 'dm50', node: 'DM-50D-W_Left', offset: [-0.4375, 0, -0.024] },
      dmR: { name: 'DM-50D-W ขวา (บูธ)', model: 'dm50', node: 'DM-50D-W_Right', offset: [0.4375, 0, -0.024] },
      vmL: { name: 'VM-80 ซ้าย (หลัก)', model: 'vm80', node: null, offset: [-0.86, 0, -0.1] },
      vmR: { name: 'VM-80 ขวา (หลัก)', model: 'vm80', node: null, offset: [0.86, 0, -0.1] }
    },
    desk: { min: [-1.04, -0.04, -0.42], max: [1.04, 0, 0.34] },
    overview: [[-1.0, 0, -0.3], [1.0, 0.4, 0.12]],
    typeLabels: { RCA: 'RCA', TRS: 'TRS 6.35 มม.', XLR: 'XLR', COMBO: 'คอมโบ XLR/TRS', MINI: '3.5 มม.', SPK: 'ขั้วสายลำโพง' },
    jacks: [
      { id: 'azM1R', dev: 'ctl', pos: [0.1137, 0.0131, -0.1782], normal: REAR, type: 'XLR', dir: 'out', ch: 'R', usable: true, short: 'R', name: 'MASTER 1 · XLR R (บาลานซ์)' },
      { id: 'azM1L', dev: 'ctl', pos: [0.0855, 0.0131, -0.1782], normal: REAR, type: 'XLR', dir: 'out', ch: 'L', usable: true, short: 'L', name: 'MASTER 1 · XLR L (บาลานซ์)' },
      { id: 'azM2L', dev: 'ctl', pos: [0.0563, 0.0229, -0.1782], normal: REAR, type: 'RCA', dir: 'out', ch: 'L', color: 'white', usable: true, short: 'L', name: 'MASTER 2 · RCA L (ไม่บาลานซ์)' },
      { id: 'azM2R', dev: 'ctl', pos: [0.0563, 0.0050, -0.1782], normal: REAR, type: 'RCA', dir: 'out', ch: 'R', color: 'red', usable: true, short: 'R', name: 'MASTER 2 · RCA R (ไม่บาลานซ์)' },
      { id: 'azBoothR', dev: 'ctl', pos: [0.0260, 0.0046, -0.1782], normal: REAR, type: 'TRS', dir: 'out', ch: 'R', usable: true, short: 'B R', name: 'BOOTH · TRS R (บาลานซ์)' },
      { id: 'azBoothL', dev: 'ctl', pos: [0.0042, 0.0046, -0.1782], normal: REAR, type: 'TRS', dir: 'out', ch: 'L', usable: true, short: 'B L', name: 'BOOTH · TRS L (บาลานซ์)' },
      { id: 'dmLRcaL', dev: 'dmL', pos: [-0.6015, 0.1995, -0.269], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', color: 'white', usable: true, short: 'L', name: 'INPUT · RCA L (ขาว) ลำโพงบูธซ้าย' },
      { id: 'dmLRcaR', dev: 'dmL', pos: [-0.6015, 0.1867, -0.269], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', color: 'red', usable: true, short: 'R', name: 'INPUT · RCA R (แดง) ลำโพงบูธซ้าย' },
      { id: 'dmLMini', dev: 'dmL', pos: [-0.6229, 0.1931, -0.269], normal: REAR, type: 'MINI', dir: 'in', usable: false, short: 'MINI', name: 'INPUT · STEREO MINI 3.5 มม.', hint: 'ช่อง 3.5 มม. สำหรับมือถือ ด่านนี้ต่อจาก XDJ-AZ' },
      { id: 'dmLTrsR', dev: 'dmL', pos: [-0.6015, 0.1684, -0.269], normal: REAR, type: 'TRS', dir: 'in', ch: 'R', usable: true, short: 'R', name: 'INPUT · TRS R (บาลานซ์) ลำโพงบูธซ้าย' },
      { id: 'dmLTrsL', dev: 'dmL', pos: [-0.6210, 0.1684, -0.269], normal: REAR, type: 'TRS', dir: 'in', ch: 'L', usable: true, short: 'L', name: 'INPUT · TRS L (บาลานซ์) ลำโพงบูธซ้าย' },
      { id: 'dmLOutNeg', dev: 'dmL', pos: [-0.5530, 0.1698, -0.269], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '−', name: 'OUTPUT TO RIGHT SPEAKER (−)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmLOutPos', dev: 'dmL', pos: [-0.5646, 0.1698, -0.269], normal: REAR, type: 'SPK', dir: 'out', usable: false, short: '+', name: 'OUTPUT TO RIGHT SPEAKER (+)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInNeg', dev: 'dmR', pos: [0.5657, 0.1673, -0.267], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '−', name: 'INPUT ลำโพงบูธขวา (−)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'dmRInPos', dev: 'dmR', pos: [0.5529, 0.1673, -0.267], normal: REAR, type: 'SPK', dir: 'in', usable: false, short: '+', name: 'INPUT ลำโพงบูธขวา (+)', hint: 'ต่อสายลำโพงไว้ให้แล้ว' },
      { id: 'vmLCombo', dev: 'vmL', pos: [-0.8125, 0.2346, -0.2625], normal: REAR, type: 'COMBO', accepts: ['XLR', 'TRS'], dir: 'in', ch: 'L', usable: true, short: 'IN', name: 'VM-80 หลักซ้าย · INPUT คอมโบ XLR/TRS (บาลานซ์)' },
      { id: 'vmLRca', dev: 'vmL', pos: [-0.8125, 0.2015, -0.2625], normal: REAR, type: 'RCA', dir: 'in', ch: 'L', usable: true, short: 'RCA', name: 'VM-80 หลักซ้าย · INPUT RCA (ไม่บาลานซ์)' },
      { id: 'vmRCombo', dev: 'vmR', pos: [0.9075, 0.2346, -0.2625], normal: REAR, type: 'COMBO', accepts: ['XLR', 'TRS'], dir: 'in', ch: 'R', usable: true, short: 'IN', name: 'VM-80 หลักขวา · INPUT คอมโบ XLR/TRS (บาลานซ์)' },
      { id: 'vmRRca', dev: 'vmR', pos: [0.9075, 0.2015, -0.2625], normal: REAR, type: 'RCA', dir: 'in', ch: 'R', usable: true, short: 'RCA', name: 'VM-80 หลักขวา · INPUT RCA (ไม่บาลานซ์)' }
    ],
    wires: [
      { from: 'dmLOutPos', to: 'dmRInPos', color: 'red' },
      { from: 'dmLOutNeg', to: 'dmRInNeg', color: 'black' }
    ],
    cables: [
      { id: 'xx15a', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xx15b', color: 'black', ends: ['XLR', 'XLR'], len: 1.5 },
      { id: 'xt15', color: 'black', ends: ['XLR', 'TRS'], len: 1.5 },
      { id: 'trs10a', color: 'gray', ends: ['TRS', 'TRS'], len: 1.0 },
      { id: 'trs10b', color: 'gray', ends: ['TRS', 'TRS'], len: 1.0 },
      { id: 'trs15', color: 'gray', ends: ['TRS', 'TRS'], len: 1.5 },
      { id: 'w15', color: 'white', ends: ['RCA', 'RCA'], len: 1.5 },
      { id: 'r15', color: 'red', ends: ['RCA', 'RCA'], len: 1.5 }
    ],
    pairs: [
      { from: 'azM1L', to: 'vmLCombo', srcs: MASTER, alt: [{ from: 'azM2L', to: 'vmLRca' }] },
      { from: 'azM1R', to: 'vmRCombo', srcs: MASTER, alt: [{ from: 'azM2R', to: 'vmRRca' }] },
      // also RCA: BOOTH เข้า RCA ของลำโพงบูธก็ถูก (ถ้ามีสาย TRS → RCA) · ทำให้ MASTER เข้า RCA บูธขึ้นเตือนผิดหน้าที่
      { from: 'azBoothL', to: 'dmLTrsL', srcs: BOOTH, also: [{ from: 'azBoothL', to: 'dmLRcaL' }] },
      { from: 'azBoothR', to: 'dmLTrsR', srcs: BOOTH, also: [{ from: 'azBoothR', to: 'dmLRcaR' }] }
    ],
    sounds: [
      { dev: 'dmL', jacks: ['dmLTrsL', 'dmLRcaL'] }, { dev: 'dmR', jacks: ['dmLTrsR', 'dmLRcaR'] },
      { dev: 'vmL', jacks: ['vmLCombo', 'vmLRca'] }, { dev: 'vmR', jacks: ['vmRCombo', 'vmRRca'] }
    ],
    altMsg: 'ลำโพงหลักมีเสียง แต่ MASTER 2 (RCA) ไม่บาลานซ์ · ลองใช้ MASTER 1 (XLR) เข้าช่องคอมโบ VM-80',
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: XDJ-AZ ลำโพงบูธ DM-50D-W และลำโพงหลัก VM-80 ด้านนอกสุด',
    advice: [
      { title: 'MASTER = เสียงให้คนฟัง', body: 'ลำโพงหลักของห้อง/งาน', how: 'MASTER → VM-80 สองตัว' },
      { title: 'BOOTH = เสียงให้ดีเจฟัง', body: 'ปรับดังเบาแยกจาก MASTER ได้', how: 'BOOTH → DM-50D-W' },
      { title: 'VM-80 มีช่องรับในตัวเองทุกตัว', body: 'ต้องต่อสายแยกซ้ายหนึ่งเส้น ขวาหนึ่งเส้น', how: 'ช่องคอมโบรับได้ทั้ง XLR และ TRS' },
      { title: 'ต่อสลับหน้าที่ = ยังไม่ผ่าน', body: 'BOOTH เข้าลำโพงหลัก หรือ MASTER เข้าบูธ ผิดหน้าที่', how: 'ดูชื่อช่องให้ตรง' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: XDJ-AZ · DM-50D-W · VM-80 ×2 ขนาดตามสเปก',
      'VM-80: ช่องรับต่อตัว = คอมโบ XLR/TRS (บาลานซ์) + RCA (ข้อมูลร้านค้าและ FAQ ทางการ ตรงกับแผงหลังในโมเดล · หน้าสเปกทางการไม่ระบุช่อง)',
      'ลำโพงหลัก VM-80 วางด้านนอกสุดของโต๊ะ ซูมเข้าเพื่อดูช่องหลัง'
    ],
    goal: 'ด่านนี้: ลำโพงหลักใช้เสียงจาก MASTER ลำโพงบูธใช้เสียงจาก BOOTH',
    winMsg: 'ลำโพงหลักและลำโพงบูธมีเสียงครบแล้ว'
  };
});
