/* Signal Flow: ข้อมูลด่าน Phase 3 ด่าน 13 (เครือข่ายเสียงดิจิทัล: สเตจบ็อกซ์ดิจิทัล → สวิตช์เครือข่ายเสียง → คอนโซล · แยกจาก PRO DJ LINK)
   CDJ-3000X ×2 + DJM-V10 (เสียง CDJ ต่อไว้แล้ว) · ฮับ PRO DJ LINK ของดีเจ (proc) หลังมิกเซอร์ · สเตจบ็อกซ์ดิจิทัล (proc · IN 1–8 + LAN) หลังโต๊ะขวา
   สวิตช์เครือข่ายเสียง (proc) + คอนโซล FOH (proc · ย่อระยะ) หลังโต๊ะซ้าย
   ตัวแปรใหม่: สาย LAN เส้นเดียวส่งเสียงได้หลายช่อง (เครือข่ายเสียงดิจิทัล) · คนละเครือข่ายกับ PRO DJ LINK ที่แชร์เพลงระหว่างเครื่อง
   คำตอบ: MASTER 1 → IN 7 / 8 ตามใบแพตช์ · สเตจบ็อกซ์ LAN + คอนโซล LAN → สวิตช์เครือข่ายเสียง · CDJ ×2 + V10 LINK → ฮับ PRO DJ LINK · ต่อข้ามเครือข่าย = กับดัก
   ค่าความยาวสายเป็นค่าเสนอ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP3Level13 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var K = typeof SFP2Kit !== 'undefined' ? SFP2Kit : require('./p2kit.js');
  var A = -0.414, B = 0.414, HZ = -0.42, SX = 0.44, SZ = -0.52, WX = -0.36, WZ = -0.5, FX = -0.76, FZ = -0.46;
  var PATCH = ['ไมค์ MC', 'ไมค์ไร้สาย 1', 'ไมค์ไร้สาย 2', 'วิดีโอ L', 'วิดีโอ R', 'สำรอง', 'DJ L', 'DJ R'], DJ = { 7: 'L', 8: 'R' };
  var DJP = ['djh1', 'djh2', 'djh3', 'djh4'], AP = ['asw1', 'asw2', 'asw3', 'asw4'];
  var TO_DJ = { srcs: AP, msg: 'สวิตช์นี้เป็นเครือข่ายเสียง · PRO DJ LINK ต่อเข้าฮับของดีเจ' };
  var TO_AUDIO = { srcs: DJP, msg: 'ฮับนี้เป็น PRO DJ LINK · เครือข่ายเสียงต่อเข้าสวิตช์เครือข่ายเสียง' };
  function via(to, ports) { return { from: ports[0], to: to, srcs: ports, also: ports.slice(1).map(function (p) { return { from: p, to: to }; }) }; }
  function addTrap(js, ids, trap) { return js.map(function (j) { if (ids.indexOf(j.id) >= 0) j.trap = trap; return j; }); }
  return {
    id: 'p3-l13', phase: 3, number: 13, of: 14,
    title: 'เครือข่ายเสียงดิจิทัล: แยกจาก PRO DJ LINK',
    unitsPerM: 1, slack: 1.5,
    camDir: [0.42, 0.5, -0.76],
    models: { cdj: K.models.cdj, v10: K.models.v10 },
    devices: {
      cdjA: { name: 'CDJ-3000X ซ้าย', model: 'cdj', node: null, offset: [A, 0, 0] },
      mix: { name: 'DJM-V10', model: 'v10', node: null, offset: [0, 0, 0] },
      cdjB: { name: 'CDJ-3000X ขวา', model: 'cdj', node: null, offset: [B, 0, 0] },
      djh: { name: 'ฮับ PRO DJ LINK', proc: { kind: 'box', size: [0.22, 0.035, 0.12], color: 0x3a3f46 }, offset: [0, 0, HZ] },
      sb: { name: 'สเตจบ็อกซ์ดิจิทัล', proc: { kind: 'box', size: [0.36, 0.12, 0.16], color: 0x30343b }, offset: [SX, 0, SZ] },
      asw: { name: 'สวิตช์เครือข่ายเสียง', proc: { kind: 'box', size: [0.22, 0.035, 0.12], color: 0x2c4a6e }, offset: [WX, 0, WZ] },
      foh: { name: 'คอนโซล FOH (ย่อระยะ)', proc: { kind: 'box', size: [0.3, 0.06, 0.2], color: 0x272a30 }, offset: [FX, 0, FZ] }
    },
    desk: { min: [-0.96, -0.04, -0.66], max: [0.96, 0, 0.3] },
    overview: [[-0.94, 0, -0.8], [0.94, 0.42, 0.14]],
    typeLabels: K.typeLabels,
    patch: { list: PATCH, dj: DJ },
    jacks: [].concat(
      addTrap(K.cdj('cdjA', A, 0, 'CDJ ซ้าย', ['cdjAOut', 'cdjALink']), ['cdjALink'], TO_DJ),
      addTrap(K.cdj('cdjB', B, 0, 'CDJ ขวา', ['cdjBOut', 'cdjBLink']), ['cdjBLink'], TO_DJ),
      addTrap(K.v10({ use: ['ch3Ln', 'ch4Ln', 'm1L', 'm1R', 'link'] }), ['link'], TO_DJ),
      K.hub('djh', 0, HZ, 4, 0.22),
      K.stagebox('sb', SX, SZ, PATCH, DJ, { 7: ['m1R'], 8: ['m1L'] }),
      K.hub('asw', WX, WZ, 4, 0.22),
      [{ id: 'sbLan', dev: 'sb', pos: [SX - 0.15, 0.035, SZ - 0.08], normal: K.REAR, type: 'LAN', dir: 'in', usable: true, short: 'LAN', name: 'สเตจบ็อกซ์ดิจิทัล · LAN (เครือข่ายเสียง)', trap: TO_AUDIO },
       { id: 'fohLan', dev: 'foh', pos: [FX + 0.1, 0.03, FZ - 0.1], normal: K.REAR, type: 'LAN', dir: 'in', usable: true, short: 'LAN', name: 'คอนโซล FOH · LAN (เครือข่ายเสียง)', trap: TO_AUDIO }]
    ).map(function (j) { if (j.dev === 'djh') j.name = j.name.replace('สวิตช์ฮับ', 'ฮับ PRO DJ LINK'); if (j.dev === 'asw') j.name = j.name.replace('สวิตช์ฮับ', 'สวิตช์เครือข่ายเสียง'); return j; }),
    wires: [],
    cables: K.fixedDecks([['cdjA', 'ch3Ln', 1.0], ['cdjB', 'ch4Ln', 1.0]]).concat([
      { id: 'xx10a', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'xx10b', color: 'black', ends: ['XLR', 'XLR'], len: 1.0 },
      { id: 'lan05', color: 'blue', ends: ['LAN', 'LAN'], len: 0.5 },
      { id: 'lan10a', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan10b', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan10c', color: 'blue', ends: ['LAN', 'LAN'], len: 1.0 },
      { id: 'lan15a', color: 'blue', ends: ['LAN', 'LAN'], len: 1.5 },
      { id: 'lan15b', color: 'blue', ends: ['LAN', 'LAN'], len: 1.5 }
    ]),
    pairs: [
      { from: 'm1L', to: 'sb7', srcs: ['m1L'] }, { from: 'm1R', to: 'sb8', srcs: ['m1R'] },
      via('cdjALink', DJP), via('link', DJP), via('cdjBLink', DJP),
      via('sbLan', AP), via('fohLan', AP)
    ],
    sounds: [{ dev: 'foh', jacks: ['fohLan'] }],
    canvasLabel: 'โต๊ะ 3D มองจากด้านหลังเครื่อง: CDJ-3000X สองเครื่อง DJM-V10 ฮับ PRO DJ LINK หลังมิกเซอร์ สเตจบ็อกซ์ดิจิทัลด้านหลังขวา สวิตช์เครือข่ายเสียงและคอนโซล FOH ด้านหลังซ้าย',
    advice: [
      { title: 'LAN ส่งเสียงได้หลายช่อง', body: 'สเตจบ็อกซ์ดิจิทัลส่งทุกช่องไปคอนโซลในสายเดียว', how: 'สเตจบ็อกซ์ + คอนโซล → สวิตช์เครือข่ายเสียง' },
      { title: 'คนละเครือข่ายกับ PRO DJ LINK', body: 'LINK ของดีเจแชร์เพลง ไม่ได้ส่งเสียงไป FOH', how: 'CDJ ×2 + V10 LINK → ฮับ PRO DJ LINK' },
      { title: 'เสียงดีเจยังเข้าทาง XLR', body: 'MASTER เข้าช่องของดีเจบนสเตจบ็อกซ์', how: 'ดูใบแพตช์มุมขวาบน' }
    ],
    notes: [
      'โมเดล 3D ของรุ่นจริง: CDJ-3000X ×2 · DJM-V10 · สเตจบ็อกซ์ดิจิทัล / สวิตช์ / ฮับ / คอนโซล FOH เป็นรูปทรงทั่วไป',
      'เครือข่ายเสียงดิจิทัลมีหลายระบบ (เช่น Dante · AES67) ใช้ตามที่ทีมเสียงของสถานที่กำหนด · DJM-V10 ไม่มีพอร์ตเครือข่ายเสียงในตัว จึงเข้าสเตจบ็อกซ์ทาง XLR',
      'สายเสียงของ CDJ ต่อไว้ให้แล้ว'
    ],
    goal: 'ด่านนี้: ต่อ MASTER เข้าสเตจบ็อกซ์ดิจิทัล ต่อเครือข่ายเสียงไปคอนโซล FOH และต่อ PRO DJ LINK แยกอีกเครือข่าย',
    winMsg: 'เสียงดีเจถึง FOH ทางเครือข่ายเสียง และ PRO DJ LINK ทำงานแยกกัน'
  };
});
