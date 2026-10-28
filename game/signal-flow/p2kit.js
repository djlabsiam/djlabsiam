/* Signal Flow: ชุดสร้างช่องต่อของเครื่องรุ่นจริงที่ใช้ซ้ำใน Phase 2 (ด่าน 2 ขึ้นไป · ด่าน 1 เขียนเองในไฟล์)
   พิกัดจาก ref/jacks-phase2.md · แต่ละฟังก์ชันคืนรายการช่องในพิกัดโลก (= พิกัดในโมเดล + offset ของเครื่อง)
   use = รายการ id ช่องที่ใช้ได้ในด่านนั้น · ช่องอื่นแตะได้แต่เสียบไม่ได้ พร้อมคำอธิบายสั้น (hint) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SFP2Kit = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var REAR = [0, 0, -1], RIGHT = [1, 0, 0];
  function has(use, id) { return !!use && use.indexOf(id) >= 0; }
  function J(o, use, hint) { // ช่องหนึ่งช่อง: ไม่อยู่ใน use = ปิดพร้อมคำอธิบาย
    o.usable = has(use, o.id);
    if (!o.usable) o.hint = o.hint || hint;
    return o;
  }
  // หัวคู่ RCA: ช่องคู่ (RCA2) ครอบ L ขาว + R แดง · เสียบสาย RCA คู่ที่ L หรือ R ก็ได้
  function pair(id, dev, pL, pR, dir, name, use, hint, extra) {
    var mid = [(pL[0] + pR[0]) / 2, (pL[1] + pR[1]) / 2, (pL[2] + pR[2]) / 2], n = extra && extra.normal || REAR, on = has(use, id);
    var e = extra || {};
    var acc = e.coax ? ['RCA', 'COAX'] : undefined;   // หัวโคแอกเชียลรูปร่างเหมือน RCA เสียบช่อง RCA ได้ (ด่านดิจิทัล)
    return [
      J({ id: id + 'L', dev: dev, pos: pL, normal: n, type: 'RCA', accepts: acc, dir: dir, ch: 'L', color: 'white', short: 'L', name: name + ' L (ขาว)', via: e.viaL, trap: e.trap }, on ? [id + 'L'] : null, hint),
      J({ id: id + 'R', dev: dev, pos: pR, normal: n, type: 'RCA', accepts: acc, dir: dir, ch: 'R', color: 'red', short: 'R', name: name + ' R (แดง)', via: e.viaR, trap: e.trap }, on ? [id + 'R'] : null, hint),
      J({ id: id, dev: dev, pos: mid, normal: n, type: 'RCA2', dir: dir, covers: [id + 'L', id + 'R'], name: name + ' L + R', via: e.viaL, trap: e.trap }, use, hint)
    ];
  }

  // CDJ-3000X · d = id เครื่อง · ox, oz = offset
  function cdj(d, ox, oz, label, use) {
    var Z = -0.1771 + oz, n = label;
    return [].concat(
      pair(d + 'Out', d, [ox + 0.0729, 0.0503, Z], [ox + 0.0880, 0.0503, Z], 'out', n + ' · AUDIO OUT', use, 'ด่านนี้ไม่ใช้ช่องนี้'),
      [J({ id: d + 'Dig', dev: d, pos: [ox + 0.0510, 0.0503, Z], normal: REAR, type: 'COAX', dir: 'out', short: 'DIG', name: n + ' · DIGITAL OUT (โคแอกเชียล)' }, use, 'ช่องเสียงดิจิทัล (ด่าน 9)'),
       J({ id: d + 'Link', dev: d, pos: [ox - 0.0060, 0.0503, Z], normal: REAR, type: 'LAN', dir: 'in', short: 'LINK', name: n + ' · LINK (LAN)' }, use, 'สาย LAN ไว้ลิงก์เครื่อง (ด่าน 2)'),
       J({ id: d + 'Usb', dev: d, pos: [ox - 0.0800, 0.0387, -0.1651 + oz], normal: REAR, type: 'USB-C', dir: 'in', short: 'USB', name: n + ' · USB' }, null, 'ช่อง USB ไม่ใช่ช่องเสียง')]
    );
  }

  // PLX-CRSS12 · ช่องอยู่ด้านขวาของเครื่อง (หันไป +x)
  // battle = Battle position: หมุนทวนเข็ม 90° (อุปกรณ์ใส่ rot: BATTLE) โทนอาร์มและช่องต่อไปอยู่ด้านหลัง (หันไป -z)
  function tt(d, ox, oz, label, use, battle) {
    var n = label, N = battle ? REAR : RIGHT;
    function P(y, z) { return battle ? [ox + z, y, oz - 0.2265] : [ox + 0.2265, y, oz + z]; }
    return [].concat(
      pair(d + 'Out', d, P(0.0404, -0.0195), P(0.0404, 0.0045), 'out', n + ' · PHONO OUT', use, 'ด่านนี้ไม่ใช้ช่องนี้', { normal: N }),
      [J({ id: d + 'Gnd', dev: d, pos: P(0.0404, 0.0313), normal: N, type: 'GND', dir: 'out', short: 'GND', name: n + ' · GND (กราวด์)' }, use, 'ขั้วกราวด์ (ด่าน 4)'),
       J({ id: d + 'Usb', dev: d, pos: P(0.0458, 0.0527), normal: N, type: 'USB-C', dir: 'out', short: 'USB', name: n + ' · USB-C' }, use, 'USB-C ต่อคอมเมื่อใช้ Performance Pads กับซอฟต์แวร์ DJ · Phase นี้ไม่ใช้')]
    );
  }

  // DJM-A9 · opts: { ox, oz, use, traps: {id: trap}, hints: {id: hint} }
  // MASTER / BOOTH / REC มีเสียงเมื่อช่องเข้าใดๆ ได้สัญญาณ (via) · ดิจิทัลและไมค์ป้อนทั้ง L และ R
  function a9(o) {
    var ox = o.ox || 0, Z = -0.1946 + (o.oz || 0), use = o.use, T = o.traps || {}, H = o.hints || {}, X = [-0.0789, -0.0390, 0.0009, 0.0408], D = [-0.1103, -0.0966, -0.0829, -0.0687];
    function P(x, y) { return [ox + x, y, Z]; }
    var inL = [], inR = [], both = ['dig1', 'dig2', 'dig3', 'dig4', 'mic1', 'mic2'], js = [];
    [1, 2, 3, 4].forEach(function (c, i) {
      inL.push('ch' + c + 'LnL', 'ch' + c + 'PhL'); inR.push('ch' + c + 'LnR', 'ch' + c + 'PhR');
      js = js.concat(
        pair('ch' + c + 'Ln', 'mix', P(X[i], 0.0659), P(X[i], 0.0517), 'in', 'CH' + c + ' LINE', use, H.line || 'ช่อง LINE สำหรับ CDJ', { trap: T['ch' + c + 'Ln'] || T.line, coax: o.coaxLine }),
        pair('ch' + c + 'Ph', 'mix', P(X[i] + 0.0136, 0.0659), P(X[i] + 0.0136, 0.0517), 'in', 'CH' + c + ' PHONO', use, H.phono || 'PHONO สำหรับเครื่องเล่นแผ่นเสียง', { trap: T['ch' + c + 'Ph'] || T.phono }),
        [J({ id: 'dig' + c, dev: 'mix', pos: P(D[i], 0.0169), normal: REAR, type: 'COAX', dir: 'in', short: 'D' + c, name: 'DIGITAL CH IN ' + c, trap: T['dig' + c] }, use, H.dig || 'ช่องเสียงดิจิทัล (ด่าน 9)')]
      );
    });
    var vL = inL.concat(both), vR = inR.concat(both);
    js = js.concat(
      [J({ id: 'm1L', dev: 'mix', pos: P(0.0259, 0.0272), normal: REAR, type: 'XLR', dir: 'out', ch: 'L', via: vL, short: 'M1 L', name: 'MASTER 1 · XLR L (บาลานซ์)' }, use, H.m1 || 'MASTER 1 ด่านนี้ต่อไว้แล้ว'),
       J({ id: 'm1R', dev: 'mix', pos: P(0.0504, 0.0272), normal: REAR, type: 'XLR', dir: 'out', ch: 'R', via: vR, short: 'M1 R', name: 'MASTER 1 · XLR R (บาลานซ์)' }, use, H.m1 || 'MASTER 1 ด่านนี้ต่อไว้แล้ว')],
      pair('m2', 'mix', P(0.0801, 0.0329), P(0.0801, 0.0180), 'out', 'MASTER 2 · RCA', use, H.m2 || 'MASTER 2 (RCA ไม่บาลานซ์) ด่านนี้ไม่ใช้', { viaL: vL, viaR: vR }),
      pair('rec', 'mix', P(0.0932, 0.0329), P(0.0932, 0.0180), 'out', 'REC OUT', use, H.rec || 'ช่องอัดเสียง (ด่าน 10)', { viaL: vL, viaR: vR }),
      [J({ id: 'boothR', dev: 'mix', pos: P(-0.0003, 0.0186), normal: REAR, type: 'TRS', dir: 'out', ch: 'R', via: vR, short: 'B R', name: 'BOOTH · TRS R (บาลานซ์)' }, use, H.booth || 'BOOTH ไว้มอนิเตอร์ดีเจ (ด่าน 13)'),
       J({ id: 'boothL', dev: 'mix', pos: P(-0.0191, 0.0186), normal: REAR, type: 'TRS', dir: 'out', ch: 'L', via: vL, short: 'B L', name: 'BOOTH · TRS L (MONO) (บาลานซ์)' }, use, H.booth || 'BOOTH ไว้มอนิเตอร์ดีเจ (ด่าน 13)'),
       J({ id: 'send', dev: 'mix', pos: P(0.1236, 0.0180), normal: REAR, type: 'TS', dir: 'out', short: 'SEND', name: 'SEND' }, null, 'ส่งไปเอฟเฟกต์ภายนอก ไม่ใช้ใน Phase นี้'),
       J({ id: 'ret', dev: 'mix', pos: P(0.1236, 0.0511), normal: REAR, type: 'TS', dir: 'in', short: 'RET', name: 'RETURN' }, null, 'รับจากเอฟเฟกต์ภายนอก ไม่ใช้ใน Phase นี้'),
       J({ id: 'digOut', dev: 'mix', pos: P(-0.0447, 0.0169), normal: REAR, type: 'COAX', dir: 'out', short: 'D OUT', name: 'DIGITAL MASTER OUT' }, null, 'ส่งเสียงดิจิทัลออก ไม่ใช้ใน Phase นี้'),
       J({ id: 'link', dev: 'mix', pos: P(-0.1331, 0.0197), normal: REAR, type: 'LAN', dir: 'in', short: 'LINK', name: 'DJM-A9 · LINK (LAN)' }, use, 'สาย LAN ไว้ลิงก์เครื่อง (ด่าน 2)'),
       J({ id: 'mic1', dev: 'mix', pos: P(-0.1371, 0.0591), normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', short: 'MIC 1', name: 'MIC 1 (คอมโบ XLR/TRS)', trap: T.mic1 }, use, 'ช่องไมโครโฟน (ด่าน 11)'),
       J({ id: 'mic2', dev: 'mix', pos: P(-0.1012, 0.0539), normal: REAR, type: 'TRS', dir: 'in', short: 'MIC 2', name: 'MIC 2 (TRS)', trap: T.mic2 }, use, 'ช่องไมโครโฟน (ด่าน 11)'),
       J({ id: 'gndA', dev: 'mix', pos: P(0.0738, 0.0767), normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND (ฝั่ง CH4)' }, use, 'ขั้วกราวด์ไว้ต่อเครื่องเล่นแผ่นเสียง (ด่าน 4)'),
       J({ id: 'gndB', dev: 'mix', pos: P(-0.1069, 0.0767), normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND (ฝั่ง CH1)' }, use, 'ขั้วกราวด์ไว้ต่อเครื่องเล่นแผ่นเสียง (ด่าน 4)')]
    );
    return js;
  }

  // DJM-S11 (มิกเซอร์ 2 ช่องสำหรับ DVS) · opts: { ox, oz, use, traps }
  function s11(o) {
    var ox = o.ox || 0, Z = -0.2116 + (o.oz || 0), use = o.use, T = o.traps || {};
    function P(x, y, z) { return [ox + x, y, z === undefined ? Z : z + (o.oz || 0)]; }
    var vL = ['ch1LnL', 'ch1PhL', 'ch2LnL', 'ch2PhL', 'auxL', 'mic'], vR = ['ch1LnR', 'ch1PhR', 'ch2LnR', 'ch2PhR', 'auxR', 'mic'];
    return [].concat(
      pair('ch1Ln', 'mix', P(-0.0627, 0.0568), P(-0.0627, 0.0430), 'in', 'CH1 LINE', use, 'ช่อง LINE สำหรับ CDJ', { trap: T.line }),
      pair('ch1Ph', 'mix', P(-0.0500, 0.0568), P(-0.0500, 0.0430), 'in', 'CH1 PHONO', use, 'PHONO สำหรับเครื่องเล่นแผ่นเสียง', { trap: T.phono }),
      pair('ch2Ln', 'mix', P(0.0429, 0.0568), P(0.0429, 0.0430), 'in', 'CH2 LINE', use, 'ช่อง LINE สำหรับ CDJ', { trap: T.line }),
      pair('ch2Ph', 'mix', P(0.0560, 0.0568), P(0.0560, 0.0430), 'in', 'CH2 PHONO', use, 'PHONO สำหรับเครื่องเล่นแผ่นเสียง', { trap: T.phono }),
      pair('aux', 'mix', P(-0.1106, 0.0568), P(-0.1106, 0.0430), 'in', 'AUX IN', null, 'ช่องเสียงเสริม ด่านนี้ไม่ใช้'),
      pair('m2', 'mix', P(0.0429, 0.0224), P(0.0576, 0.0224), 'out', 'MASTER 2 · RCA', use, 'MASTER 2 (RCA ไม่บาลานซ์) ด่านนี้ไม่ใช้', { viaL: vL, viaR: vR }),
      [J({ id: 'm1L', dev: 'mix', pos: P(-0.0057, 0.0252), normal: REAR, type: 'XLR', dir: 'out', ch: 'L', via: vL, short: 'M1 L', name: 'MASTER 1 · XLR L (บาลานซ์)' }, use, 'MASTER 1 ด่านนี้ต่อไว้แล้ว'),
       J({ id: 'm1R', dev: 'mix', pos: P(0.0212, 0.0252), normal: REAR, type: 'XLR', dir: 'out', ch: 'R', via: vR, short: 'M1 R', name: 'MASTER 1 · XLR R (บาลานซ์)' }, use, 'MASTER 1 ด่านนี้ต่อไว้แล้ว'),
       J({ id: 'boothL', dev: 'mix', pos: P(-0.0508, 0.0224), normal: REAR, type: 'TRS', dir: 'out', ch: 'L', via: vL, short: 'B L', name: 'BOOTH · TRS L' }, use, 'BOOTH ไว้มอนิเตอร์ดีเจ'),
       J({ id: 'boothR', dev: 'mix', pos: P(-0.0311, 0.0224), normal: REAR, type: 'TRS', dir: 'out', ch: 'R', via: vR, short: 'B R', name: 'BOOTH · TRS R' }, use, 'BOOTH ไว้มอนิเตอร์ดีเจ'),
       J({ id: 'mic', dev: 'mix', pos: P(-0.0857, 0.0501), normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', short: 'MIC', name: 'MIC (คอมโบ XLR/TRS)' }, use, 'ช่องไมโครโฟน ด่านนี้ไม่ใช้'),
       J({ id: 'cdjUsb1', dev: 'mix', pos: P(-0.0057, 0.0541), normal: REAR, type: 'USB-A', dir: 'out', short: 'USB 1', name: 'CDJ/CONTROLLER USB 1' }, null, 'USB-A ไว้ต่อคอนโทรลเลอร์ ด่านนี้ไม่ใช้'),
       J({ id: 'cdjUsb2', dev: 'mix', pos: P(0.0212, 0.0541), normal: REAR, type: 'USB-A', dir: 'out', short: 'USB 2', name: 'CDJ/CONTROLLER USB 2' }, null, 'USB-A ไว้ต่อคอนโทรลเลอร์ ด่านนี้ไม่ใช้'),
       J({ id: 'usbA', dev: 'mix', pos: P(-0.1023, 0.0184), normal: REAR, type: 'USB-B', dir: 'in', short: 'USB A', name: 'USB A (ต่อคอมพิวเตอร์)' }, use, 'USB ต่อคอมพิวเตอร์'),
       J({ id: 'usbB', dev: 'mix', pos: P(-0.0769, 0.0184), normal: REAR, type: 'USB-B', dir: 'in', short: 'USB B', name: 'USB B (ต่อคอมพิวเตอร์เครื่องที่ 2)' }, use, 'USB ต่อคอมพิวเตอร์'),
       J({ id: 'gndA', dev: 'mix', pos: P(0.0726, 0.0691, -0.2261), normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND (ฝั่ง CH2)' }, use, 'ขั้วกราวด์'),
       J({ id: 'gndB', dev: 'mix', pos: P(-0.0350, 0.0691, -0.2165), normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND (ฝั่ง CH1)' }, use, 'ขั้วกราวด์')]
    );
  }

  // XDJ-AZ (ออลอินวัน 4 ช่อง · ref/jacks-phase3.md) · opts: { ox, oz, use, traps } · พิกัดวัด 26 ต.ค. ด้วย jack-calibrate (ตั้งกล้องที่พิกัดแล้วดูกลางช่อง)
  // MASTER / BOOTH มีเสียงเสมอ (เล่นเพลงจาก USB ในตัวเครื่อง) · CH3 / CH4 = LINE/PHONO สลับได้ (RCA) · MIC 1 / 2 คอมโบ
  function az(o) {
    var ox = o.ox || 0, Z = -0.1782 + (o.oz || 0), use = o.use, T = o.traps || {};
    function P(x, y) { return [ox + x, y, Z]; }
    return [].concat(
      [J({ id: 'm1L', dev: 'mix', pos: P(0.0987, 0.0266), normal: REAR, type: 'XLR', dir: 'out', ch: 'L', short: 'M1 L', name: 'MASTER 1 · XLR L (บาลานซ์)' }, use, 'MASTER 1 ด่านนี้ไม่ใช้'),
       J({ id: 'm1R', dev: 'mix', pos: P(0.1259, 0.0266), normal: REAR, type: 'XLR', dir: 'out', ch: 'R', short: 'M1 R', name: 'MASTER 1 · XLR R (บาลานซ์)' }, use, 'MASTER 1 ด่านนี้ไม่ใช้')],
      pair('m2', 'mix', P(0.0696, 0.0351), P(0.0696, 0.0210), 'out', 'MASTER 2 · RCA', use, 'MASTER 2 (RCA ไม่บาลานซ์) ด่านนี้ไม่ใช้'),
      [J({ id: 'boothL', dev: 'mix', pos: P(0.0223, 0.0206), normal: REAR, type: 'TRS', dir: 'out', ch: 'L', short: 'B L', name: 'BOOTH · TRS L (บาลานซ์)' }, use, 'BOOTH ไว้มอนิเตอร์ดีเจ'),
       J({ id: 'boothR', dev: 'mix', pos: P(0.0425, 0.0206), normal: REAR, type: 'TRS', dir: 'out', ch: 'R', short: 'B R', name: 'BOOTH · TRS R (บาลานซ์)' }, use, 'BOOTH ไว้มอนิเตอร์ดีเจ'),
       J({ id: 'gnd', dev: 'mix', pos: P(-0.0129, 0.0370), normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND' }, use, 'ขั้วกราวด์ไว้ต่อเครื่องเล่นแผ่นเสียง')],
      pair('ch4', 'mix', P(-0.0673, 0.0337), P(-0.0673, 0.0206), 'in', 'CH4 LINE/PHONO', use, 'ช่องรับเครื่องภายนอก (LINE หรือแผ่นเสียง)', { trap: T.ch4 }),
      pair('ch3', 'mix', P(-0.0902, 0.0337), P(-0.0902, 0.0206), 'in', 'CH3 LINE/PHONO', use, 'ช่องรับเครื่องภายนอก (LINE หรือแผ่นเสียง)', { trap: T.ch3 }),
      [J({ id: 'mic2', dev: 'mix', pos: P(-0.1235, 0.0295), normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', short: 'MIC 2', name: 'MIC 2 (คอมโบ XLR/TRS)' }, use, 'ช่องไมโครโฟน'),
       J({ id: 'mic1', dev: 'mix', pos: P(-0.1587, 0.0295), normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', short: 'MIC 1', name: 'MIC 1 (คอมโบ XLR/TRS)' }, use, 'ช่องไมโครโฟน'),
       J({ id: 'link', dev: 'mix', pos: P(0.2772, 0.0215), normal: REAR, type: 'LAN', dir: 'in', short: 'LINK', name: 'XDJ-AZ · LINK (LAN)' }, null, 'สาย LAN ไว้ลิงก์เครื่อง ด่านนี้ไม่ใช้'),
       J({ id: 'usb', dev: 'mix', pos: P(0.3227, 0.0252), normal: REAR, type: 'USB-C', dir: 'in', short: 'USB', name: 'XDJ-AZ · USB-C (ต่อคอมพิวเตอร์)' }, null, 'USB ต่อคอมพิวเตอร์ ด่านนี้ไม่ใช้')]
    );
  }

  // CDJ-1500X · AUDIO OUT RCA + LINK เท่านั้น (ไม่มี DIGITAL OUT · ref/jacks-phase3.md) · พิกัดวัด 26 ต.ค.
  function cdj15(d, ox, oz, label, use) {
    var Z = -0.1721 + oz, n = label;
    return [].concat(
      pair(d + 'Out', d, [ox + 0.0058, 0.0322, Z], [ox + 0.0201, 0.0322, Z], 'out', n + ' · AUDIO OUT', use, 'ด่านนี้ไม่ใช้ช่องนี้'),
      [J({ id: d + 'Link', dev: d, pos: [ox - 0.0262, 0.0322, Z], normal: REAR, type: 'LAN', dir: 'in', short: 'LINK', name: n + ' · LINK (LAN)' }, use, 'สาย LAN ไว้ลิงก์เครื่อง'),
       J({ id: d + 'Usb', dev: d, pos: [ox - 0.0813, 0.0267, Z], normal: REAR, type: 'USB-C', dir: 'in', short: 'USB', name: n + ' · USB-C (ต่อคอมพิวเตอร์)' }, null, 'ช่อง USB ไม่ใช่ช่องเสียง')]
    );
  }

  // DDJ-FLX10 (คอนโทรลเลอร์ 4 ช่อง · ref/jacks-phase4.md) · opts: { ox, oz, use, traps, hints } · พิกัดจากภาพแผงหลังบนโมเดล 26 ต.ค.
  // เสียงมาจากโปรแกรม DJ ในคอมพิวเตอร์ → MASTER / BOOTH มีเสียงเมื่อ USB A หรือ B ต่อคอมพิวเตอร์แล้ว (via)
  // แผงหลังจากซ้ายเมื่อมองหน้าแผง: MASTER 1 · MASTER 2 · BOOTH · GND · CH4 · CH2 · CH1 · CH3 · DMX · USB B / A · MIC 2 · MIC 1 · DC IN
  function flx10(o) {
    var ox = o.ox || 0, Z = -0.1949 + (o.oz || 0), use = o.use, T = o.traps || {}, H = o.hints || {}, v = ['usbA', 'usbB'];
    function P(x, y) { return [ox + x, y, Z]; }
    function ch(c, x, phono) {
      return pair('ch' + c, 'mix', P(x, 0.0223), P(x + 0.0138, 0.0223), 'in', 'CH' + c + (phono ? ' LINE/PHONO' : ' LINE'), use, H.ch || 'ช่องรับเครื่องภายนอก ด่านนี้ไม่ใช้', { trap: T.ch });
    }
    return [].concat(
      [J({ id: 'm1L', dev: 'mix', pos: P(0.2081, 0.0283), normal: REAR, type: 'XLR', dir: 'out', ch: 'L', via: v, short: 'M1 L', name: 'MASTER 1 · XLR L (บาลานซ์)' }, use, H.m1 || 'MASTER 1 ด่านนี้ต่อไว้แล้ว'),
       J({ id: 'm1R', dev: 'mix', pos: P(0.2339, 0.0283), normal: REAR, type: 'XLR', dir: 'out', ch: 'R', via: v, short: 'M1 R', name: 'MASTER 1 · XLR R (บาลานซ์)' }, use, H.m1 || 'MASTER 1 ด่านนี้ต่อไว้แล้ว')],
      pair('m2', 'mix', P(0.1614, 0.0225), P(0.1763, 0.0225), 'out', 'MASTER 2 · RCA', use, H.m2 || 'MASTER 2 (RCA ไม่บาลานซ์) ด่านนี้ไม่ใช้', { viaL: v, viaR: v }),
      [J({ id: 'boothL', dev: 'mix', pos: P(0.1199, 0.0223), normal: REAR, type: 'TRS', dir: 'out', ch: 'L', via: v, short: 'B L', name: 'BOOTH · TRS L (บาลานซ์)' }, use, H.booth || 'BOOTH ไว้มอนิเตอร์ดีเจ ด่านนี้ไม่ใช้'),
       J({ id: 'boothR', dev: 'mix', pos: P(0.1400, 0.0223), normal: REAR, type: 'TRS', dir: 'out', ch: 'R', via: v, short: 'B R', name: 'BOOTH · TRS R (บาลานซ์)' }, use, H.booth || 'BOOTH ไว้มอนิเตอร์ดีเจ ด่านนี้ไม่ใช้'),
       J({ id: 'gnd', dev: 'mix', pos: P(0.0900, 0.0221), normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND' }, use, 'ขั้วกราวด์ไว้ต่อเครื่องเล่นแผ่นเสียง ด่านนี้ไม่ใช้')],
      ch(4, 0.0428, true), ch(2, 0.0099), ch(1, -0.0233), ch(3, -0.0562, true),
      [J({ id: 'dmx', dev: 'mix', pos: P(-0.0977, 0.0283), normal: REAR, type: 'XLR', dir: 'out', short: 'DMX', name: 'DMX OUT (XLR ควบคุมไฟ ไม่ใช่ช่องเสียง)' }, null, 'DMX ไว้ควบคุมไฟเวที ไม่ใช่ช่องเสียง'),
       J({ id: 'usbB', dev: 'mix', pos: P(-0.1282, 0.0174), normal: REAR, type: 'USB-C', dir: 'in', short: 'USB B', name: 'USB B (ต่อคอมพิวเตอร์เครื่องที่ 2)' }, use, 'USB ต่อคอมพิวเตอร์'),
       J({ id: 'usbA', dev: 'mix', pos: P(-0.1480, 0.0174), normal: REAR, type: 'USB-C', dir: 'in', short: 'USB A', name: 'USB A (ต่อคอมพิวเตอร์)' }, use, 'USB ต่อคอมพิวเตอร์'),
       J({ id: 'mic2', dev: 'mix', pos: P(-0.2048, 0.0223), normal: REAR, type: 'TRS', dir: 'in', short: 'MIC 2', name: 'MIC 2 (TRS บาลานซ์)' }, use, H.mic || 'ช่องไมโครโฟน ด่านนี้ไม่ใช้'),
       J({ id: 'mic1', dev: 'mix', pos: P(-0.2388, 0.0311), normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', short: 'MIC 1', name: 'MIC 1 (คอมโบ XLR/TRS บาลานซ์)' }, use, H.mic || 'ช่องไมโครโฟน ด่านนี้ไม่ใช้')]
    );
  }

  // ออดิโออินเทอร์เฟซ 2 ช่อง (ทั่วไป · proc) · แผงหลังหัน -z: IN 1 (L) / IN 2 (R) คอมโบ · OUTPUT L / R (TRS) · USB-C · size = [0.18, 0.05, 0.13]
  // USB-C ต่อคอมพิวเตอร์ (dir in เหมือนพอร์ตของเครื่องอื่น: แล็ปท็อปเป็นฝั่ง out) · มองหน้าแผง +x อยู่ซ้าย → IN 1 อยู่ +x
  function iface(d, ox, oz, use, T) {
    var Z = oz - 0.065;
    T = T || {};
    return [
      J({ id: d + 'In1', dev: d, pos: [ox + 0.06, 0.03, Z], normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', ch: 'L', short: 'IN 1', name: 'อินเทอร์เฟซ · INPUT 1 (คอมโบ XLR/TRS)', trap: T.in1 }, use, 'ด่านนี้ไม่ใช้'),
      J({ id: d + 'In2', dev: d, pos: [ox + 0.025, 0.03, Z], normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', ch: 'R', short: 'IN 2', name: 'อินเทอร์เฟซ · INPUT 2 (คอมโบ XLR/TRS)', trap: T.in2 }, use, 'ด่านนี้ไม่ใช้'),
      J({ id: d + 'OutL', dev: d, pos: [ox - 0.015, 0.03, Z], normal: REAR, type: 'TRS', dir: 'out', ch: 'L', short: 'OUT L', name: 'อินเทอร์เฟซ · OUTPUT L (TRS)' }, use, 'ส่งไปลำโพงมอนิเตอร์ ด่านนี้ไม่ใช้'),
      J({ id: d + 'OutR', dev: d, pos: [ox - 0.035, 0.03, Z], normal: REAR, type: 'TRS', dir: 'out', ch: 'R', short: 'OUT R', name: 'อินเทอร์เฟซ · OUTPUT R (TRS)' }, use, 'ส่งไปลำโพงมอนิเตอร์ ด่านนี้ไม่ใช้'),
      J({ id: d + 'Usb', dev: d, pos: [ox - 0.065, 0.025, Z], normal: REAR, type: 'USB-C', dir: 'in', short: 'USB', name: 'อินเทอร์เฟซ · USB-C (ต่อคอมพิวเตอร์)' }, use, 'ด่านนี้ไม่ใช้')
    ];
  }

  // ช่องหนึ่งช่องของอุปกรณ์ทั่วไป (proc) ใน Phase 4 · o: { ch, color, via, trap, normal, accepts, short, off }
  // off = ข้อความเมื่อช่องนี้ปิด (แตะได้ เสียบไม่ได้) · ช่องเข้า XLR / คอมโบ รับหัวมาตรฐานให้อัตโนมัติ · short ไม่ใส่ = ท้ายชื่อหลัง " · "
  function pj(id, dev, pos, type, dir, name, o) {
    o = o || {};
    var acc = o.accepts || (dir === 'in' && type === 'XLR' ? ['XLR', 'XLRM'] : dir === 'in' && type === 'COMBO' ? ['XLR', 'XLRM', 'TRS', 'TS'] : undefined);
    var j = { id: id, dev: dev, pos: pos, normal: o.normal || REAR, type: type, accepts: acc, dir: dir, ch: o.ch, color: o.color, via: o.via, usable: !o.off,
      short: o.short || name.split(' · ').pop(), name: name, trap: o.trap };
    if (o.off) j.hint = o.off;
    return j;
  }

  // DJM-V5 (3 ช่อง · ref/jacks-phase3.md) · opts: { ox, oz, use, traps, hints } · พิกัดวัด 26 ต.ค.
  // ไม่มี MASTER 2 RCA และไม่มีช่องดิจิทัล · MASTER / BOOTH / REC มีเสียงเมื่อช่องเข้าใดๆ ได้สัญญาณ (via)
  function v5(o) {
    var ox = o.ox || 0, Z = -0.2052 + (o.oz || 0), use = o.use, T = o.traps || {}, H = o.hints || {};
    function P(x, y) { return [ox + x, y, Z]; }
    var CH = [[-0.0477, -0.0620], [-0.0063, -0.0239], [0.0328, 0.0165]], inL = ['mic'], inR = ['mic'], js = [];
    CH.forEach(function (c, i) {
      var k = 'ch' + (i + 1);
      inL.push(k + 'PhL', k + 'LnL'); inR.push(k + 'PhR', k + 'LnR');
      js = js.concat(
        pair(k + 'Ph', 'mix', P(c[0], 0.0680), P(c[0], 0.0534), 'in', 'CH' + (i + 1) + ' PHONO', use, H.phono || 'PHONO สำหรับเครื่องเล่นแผ่นเสียง', { trap: T[k + 'Ph'] || T.phono }),
        pair(k + 'Ln', 'mix', P(c[1], 0.0680), P(c[1], 0.0534), 'in', 'CH' + (i + 1) + ' LINE', use, H.line || 'ช่อง LINE สำหรับเครื่องเล่น', { trap: T[k + 'Ln'] || T.line })
      );
    });
    return js.concat(
      [J({ id: 'm1L', dev: 'mix', pos: P(-0.0232, 0.0262), normal: REAR, type: 'XLR', dir: 'out', ch: 'L', via: inL, short: 'M L', name: 'MASTER · XLR L (บาลานซ์)' }, use, H.m1 || 'MASTER ด่านนี้ต่อไว้แล้ว'),
       J({ id: 'm1R', dev: 'mix', pos: P(0.0053, 0.0262), normal: REAR, type: 'XLR', dir: 'out', ch: 'R', via: inR, short: 'M R', name: 'MASTER · XLR R (บาลานซ์)' }, use, H.m1 || 'MASTER ด่านนี้ต่อไว้แล้ว'),
       J({ id: 'boothL', dev: 'mix', pos: P(-0.0671, 0.0218), normal: REAR, type: 'TRS', dir: 'out', ch: 'L', via: inL, short: 'B L', name: 'BOOTH · TRS L (MONO) (บาลานซ์)' }, use, H.booth || 'BOOTH ไว้มอนิเตอร์ดีเจ'),
       J({ id: 'boothR', dev: 'mix', pos: P(-0.0481, 0.0218), normal: REAR, type: 'TRS', dir: 'out', ch: 'R', via: inR, short: 'B R', name: 'BOOTH · TRS R (บาลานซ์)' }, use, H.booth || 'BOOTH ไว้มอนิเตอร์ดีเจ')],
      pair('rec', 'mix', P(0.0346, 0.0341), P(0.0346, 0.0208), 'out', 'REC OUT', use, H.rec || 'ช่องอัดเสียง', { viaL: inL, viaR: inR }),
      [J({ id: 'sendL', dev: 'mix', pos: P(0.0585, 0.0212), normal: REAR, type: 'TS', dir: 'out', short: 'S L', name: 'MULTI I/O SEND L (MONO)' }, null, 'ส่งไปเอฟเฟกต์ภายนอก ด่านนี้ไม่ใช้'),
       J({ id: 'sendR', dev: 'mix', pos: P(0.0768, 0.0212), normal: REAR, type: 'TS', dir: 'out', short: 'S R', name: 'MULTI I/O SEND R' }, null, 'ส่งไปเอฟเฟกต์ภายนอก ด่านนี้ไม่ใช้'),
       J({ id: 'retL', dev: 'mix', pos: P(0.0585, 0.0534), normal: REAR, type: 'TS', dir: 'in', short: 'R L', name: 'MULTI I/O RETURN L (MONO)' }, null, 'รับจากเอฟเฟกต์ภายนอก ด่านนี้ไม่ใช้'),
       J({ id: 'retR', dev: 'mix', pos: P(0.0768, 0.0534), normal: REAR, type: 'TS', dir: 'in', short: 'R R', name: 'MULTI I/O RETURN R' }, null, 'รับจากเอฟเฟกต์ภายนอก ด่านนี้ไม่ใช้'),
       J({ id: 'mic', dev: 'mix', pos: P(-0.0968, 0.0600), normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', short: 'MIC', name: 'MIC (คอมโบ XLR/TRS)' }, use, H.mic || 'ช่องไมโครโฟน'),
       J({ id: 'link', dev: 'mix', pos: P(-0.0966, 0.0218), normal: REAR, type: 'LAN', dir: 'in', short: 'LINK', name: 'DJM-V5 · LINK (LAN)' }, use, 'สาย LAN ไว้ลิงก์เครื่อง'),
       J({ id: 'usb', dev: 'mix', pos: P(-0.1227, 0.0159), normal: REAR, type: 'USB-C', dir: 'in', short: 'USB', name: 'DJM-V5 · USB-C (ต่อคอมพิวเตอร์)' }, null, 'USB ต่อคอมพิวเตอร์ ด่านนี้ไม่ใช้'),
       J({ id: 'gndA', dev: 'mix', pos: [ox + 0.0931, 0.0742, -0.2188 + (o.oz || 0)], normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND (ฝั่ง CH3)' }, use, 'ขั้วกราวด์ไว้ต่อเครื่องเล่นแผ่นเสียง'),
       J({ id: 'gndB', dev: 'mix', pos: [ox - 0.1243, 0.0754, -0.2188 + (o.oz || 0)], normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND (ฝั่ง CH1)' }, use, 'ขั้วกราวด์ไว้ต่อเครื่องเล่นแผ่นเสียง')]
    );
  }

  // DJM-V10 (6 ช่อง · ref/jacks-phase3.md) · opts: { ox, oz, use, traps, hints } · พิกัดวัด 26 ต.ค. (กริดทับภาพ)
  // PHONO มีที่ CH1 / 3 / 4 / 6 · DIGITAL IN 1–6 · DIGITAL MASTER OUT (AES/EBU · XLR) · MASTER / BOOTH / REC / AES มีเสียงเมื่อช่องเข้าใดๆ ได้สัญญาณ
  function v10(o) {
    var ox = o.ox || 0, oz = o.oz || 0, use = o.use, T = o.traps || {}, H = o.hints || {};
    function P(x, y, z) { return [ox + x, y, (z || -0.2247) + oz]; }
    var CH = [[-0.1123, -0.1260], [null, -0.0862], [-0.0451, -0.0585], [-0.0040, -0.0192], [null, 0.0238], [0.0678, 0.0510]];
    var DG = [[-0.1275, 0.0322], [-0.1275, 0.0175], [-0.1133, 0.0322], [-0.1133, 0.0175], [-0.0986, 0.0322], [-0.0986, 0.0175]];
    var vL = ['mic1', 'mic2'], vR = ['mic1', 'mic2'], js = [], XO = -0.2195;
    CH.forEach(function (c, i) {
      var k = 'ch' + (i + 1), n = 'CH' + (i + 1);
      vL.push(k + 'LnL', 'dig' + (i + 1)); vR.push(k + 'LnR', 'dig' + (i + 1));
      js = js.concat(pair(k + 'Ln', 'mix', P(c[1], 0.0655), P(c[1], 0.0518), 'in', n + ' LINE', use, H.line || 'ช่อง LINE สำหรับเครื่องเล่น', { trap: T[k + 'Ln'] || T.line }));
      if (c[0] !== null) { vL.push(k + 'PhL'); vR.push(k + 'PhR');
        js = js.concat(pair(k + 'Ph', 'mix', P(c[0], 0.0655), P(c[0], 0.0518), 'in', n + ' PHONO', use, H.phono || 'PHONO สำหรับเครื่องเล่นแผ่นเสียง', { trap: T[k + 'Ph'] || T.phono })); }
      js.push(J({ id: 'dig' + (i + 1), dev: 'mix', pos: P(DG[i][0], DG[i][1]), normal: REAR, type: 'COAX', dir: 'in', short: 'D' + (i + 1), name: 'DIGITAL IN ' + (i + 1) + ' (โคแอกเชียล)', trap: T['dig' + (i + 1)] || T.dig }, use, H.dig || 'ช่องเสียงดิจิทัล'));
    });
    function sr(id, x, y, dir, nm) { return J({ id: id, dev: 'mix', pos: P(x, y, -0.2248), normal: REAR, type: 'TS', dir: dir, short: nm.split(' ').pop(), name: nm + ' (ไม่บาลานซ์)' }, use, H.fx || 'SEND / RETURN ไว้ต่อเอฟเฟกต์ภายนอก'); }
    return js.concat(
      [J({ id: 'm1L', dev: 'mix', pos: P(0.0056, 0.0250, XO), normal: REAR, type: 'XLR', dir: 'out', ch: 'L', via: vL, short: 'M1 L', name: 'MASTER 1 · XLR L (บาลานซ์)' }, use, H.m1 || 'MASTER 1 ด่านนี้ต่อไว้แล้ว'),
       J({ id: 'm1R', dev: 'mix', pos: P(0.0326, 0.0250, XO), normal: REAR, type: 'XLR', dir: 'out', ch: 'R', via: vR, short: 'M1 R', name: 'MASTER 1 · XLR R (บาลานซ์)' }, use, H.m1 || 'MASTER 1 ด่านนี้ต่อไว้แล้ว')],
      pair('m2', 'mix', P(0.0580, 0.0332), P(0.0580, 0.0192), 'out', 'MASTER 2 · RCA', use, H.m2 || 'MASTER 2 (RCA ไม่บาลานซ์) ด่านนี้ไม่ใช้', { viaL: vL, viaR: vR }),
      pair('rec', 'mix', P(0.0725, 0.0332), P(0.0725, 0.0192), 'out', 'REC OUT', use, H.rec || 'ช่องอัดเสียง', { viaL: vL, viaR: vR }),
      [J({ id: 'boothL', dev: 'mix', pos: P(-0.0419, 0.0175, XO), normal: REAR, type: 'TRS', dir: 'out', ch: 'L', via: vL, short: 'B L', name: 'BOOTH · TRS L (MONO) (บาลานซ์)' }, use, H.booth || 'BOOTH ไว้มอนิเตอร์ดีเจ'),
       J({ id: 'boothR', dev: 'mix', pos: P(-0.0228, 0.0175, XO), normal: REAR, type: 'TRS', dir: 'out', ch: 'R', via: vR, short: 'B R', name: 'BOOTH · TRS R (บาลานซ์)' }, use, H.booth || 'BOOTH ไว้มอนิเตอร์ดีเจ'),
       J({ id: 'aesOut', dev: 'mix', pos: P(-0.0715, 0.0232, XO), normal: REAR, type: 'XLR', dir: 'out', via: vL, short: 'AES', name: 'DIGITAL MASTER OUT (AES/EBU · XLR)' }, use, H.aes || 'ส่งเสียงดิจิทัลออก ด่านนี้ไม่ใช้'),
       J({ id: 'mic1', dev: 'mix', pos: P(-0.1874, 0.0598, -0.2232), normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', short: 'MIC 1', name: 'MIC 1 (คอมโบ XLR/TRS)', trap: T.mic1 }, use, H.mic || 'ช่องไมโครโฟน'),
       J({ id: 'mic2', dev: 'mix', pos: P(-0.1556, 0.0525, XO), normal: REAR, type: 'TRS', dir: 'in', short: 'MIC 2', name: 'MIC 2 (TRS บาลานซ์)', trap: T.mic2 }, use, H.mic || 'ช่องไมโครโฟน'),
       J({ id: 'link', dev: 'mix', pos: P(-0.1554, 0.0197, XO), normal: REAR, type: 'LAN', dir: 'in', short: 'LINK', name: 'DJM-V10 · LINK (LAN)' }, use, 'สาย LAN ไว้ลิงก์เครื่อง'),
       J({ id: 'gndA', dev: 'mix', pos: P(0.1671, 0.0755, -0.2335), normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND (ฝั่ง CH6)' }, use, 'ขั้วกราวด์ไว้ต่อเครื่องเล่นแผ่นเสียง'),
       J({ id: 'gndB', dev: 'mix', pos: P(-0.1475, 0.0757, -0.2335), normal: REAR, type: 'GND', dir: 'in', short: 'GND', name: 'SIGNAL GND (ฝั่ง CH1)' }, use, 'ขั้วกราวด์ไว้ต่อเครื่องเล่นแผ่นเสียง'),
       sr('mioSendL', 0.1397, 0.0342, 'out', 'MULTI I/O SEND L'), sr('mioSendR', 0.1397, 0.0170, 'out', 'MULTI I/O SEND R'),
       sr('mioRetL', 0.1397, 0.0681, 'in', 'MULTI I/O RETURN L'), sr('mioRetR', 0.1397, 0.0522, 'in', 'MULTI I/O RETURN R'),
       sr('ext1Send', 0.0945, 0.0342, 'out', 'EXT1 SEND L'), sr('ext1Ret', 0.0945, 0.0681, 'in', 'EXT1 RETURN L'),
       sr('ext2Send', 0.1167, 0.0342, 'out', 'EXT2 SEND L'), sr('ext2Ret', 0.1167, 0.0681, 'in', 'EXT2 RETURN L')]
    );
  }

  // ตัวรับไมค์ไร้สาย 2 ช่อง (ทั่วไป · proc) · XLR OUT A / B (ขาตัวผู้) ที่แผงหลัง · size = [0.21, 0.044, 0.16]
  // แผงหันไป -z: มองหน้าแผง A อยู่ซ้าย (+x)
  function wirelessRx(d, ox, oz) {
    var Z = oz - 0.08;
    return [
      { id: d + 'A', dev: d, pos: [ox + 0.03, 0.022, Z], normal: REAR, type: 'XLRM', accepts: ['XLRF'], dir: 'out', usable: true, short: 'A', name: 'ตัวรับไมค์ไร้สาย · OUT A (XLR ขาตัวผู้)' },
      { id: d + 'B', dev: d, pos: [ox - 0.03, 0.022, Z], normal: REAR, type: 'XLRM', accepts: ['XLRF'], dir: 'out', usable: true, short: 'B', name: 'ตัวรับไมค์ไร้สาย · OUT B (XLR ขาตัวผู้)' }
    ];
  }

  // แล็ปท็อปทั่วไป (proc) · พอร์ต USB-C สองช่องที่ด้านขวาของเครื่อง (หันไป +x ให้กล้องเห็น) · size = [0.31, 0.2, 0.215]
  function laptop(d, ox, oz, use) {
    var X = ox + 0.155;
    return [
      J({ id: d + '1', dev: d, pos: [X, 0.009, oz - 0.03], normal: RIGHT, type: 'USB-C', dir: 'out', short: 'C1', name: 'แล็ปท็อป · USB-C 1' }, use, 'ด่านนี้ไม่ใช้'),
      J({ id: d + '2', dev: d, pos: [X, 0.009, oz - 0.06], normal: RIGHT, type: 'USB-C', dir: 'out', short: 'C2', name: 'แล็ปท็อป · USB-C 2' }, use, 'ด่านนี้ไม่ใช้')
    ];
  }

  // เครื่องบันทึกเสียงทั่วไป (proc) · LINE IN แบบ RCA ที่แผงหลัง · size = [0.2, 0.05, 0.15]
  function recorder(d, ox, oz) {
    var Z = oz - 0.075;
    return pair(d + 'In', d, [ox - 0.01, 0.025, Z], [ox + 0.01, 0.025, Z], 'in', 'เครื่องบันทึก · LINE IN', [d + 'In'], '');
  }

  // กล่องรับสายเข้าระบบ PA ของร้าน (สเตจบ็อกซ์ทั่วไป · proc) · XLR IN L / R ที่แผงหลัง · size = [0.2, 0.09, 0.12]
  function paBox(d, ox, oz) {
    var Z = oz - 0.06;
    return [
      { id: d + 'L', dev: d, pos: [ox - 0.04, 0.045, Z], normal: REAR, type: 'XLR', dir: 'in', ch: 'L', usable: true, short: 'L', name: 'กล่องสายเข้า PA · XLR IN L' },
      { id: d + 'R', dev: d, pos: [ox + 0.04, 0.045, Z], normal: REAR, type: 'XLR', dir: 'in', ch: 'R', usable: true, short: 'R', name: 'กล่องสายเข้า PA · XLR IN R' }
    ];
  }

  // สเตจบ็อกซ์ของสถานที่ (ทั่วไป · proc) · XLR IN 1–8 แถวบน + RETURN A–D แถวล่าง ที่แผงหลัง · size = [0.36, 0.12, 0.16]
  // แผงหันไป -z: มองหน้าแผง +x อยู่ซ้าย → เรียงเลขจาก +x ไป -x ให้อ่าน 1 → 8 จากซ้ายไปขวา
  // patch = ใบแพตช์ของสถานที่ (ชื่อช่อง 1–n) · dj = ช่องที่จองให้ดีเจ เช่น {7: 'L', 8: 'R'} (ช่องโมโนเช่นไมค์ใส่ true) · ช่องอื่นเสียบได้แต่เป็นกับดักบอกว่าช่องนั้นของอะไร
  // swap = ต้นทางที่ทำให้ซ้ายขวาสลับ ต่อช่องดีเจ เช่น {7: ['m1R'], 8: ['m1L']} → กับดักบอกให้สลับกลับ
  // ret = ใบแพตช์ช่องส่งกลับ { list: [ชื่อ A–D], dj: {A: true} } → RETURN ใช้ได้ (มีเสียงจากคอนโซลมอนิเตอร์เสมอ) · ไม่ใส่ = RETURN ใช้ไม่ได้
  function stagebox(d, ox, oz, patch, dj, swap, ret) {
    var Z = oz - 0.08, out = [];
    patch.forEach(function (p, i) {
      var n = i + 1, own = dj[n], ch = own === 'L' || own === 'R' ? own : undefined;
      out.push({ id: d + n, dev: d, pos: [ox + 0.14 - i * 0.04, 0.085, Z], normal: REAR, type: 'XLR', accepts: ['XLR', 'XLRM'], dir: 'in', ch: ch, usable: true, short: '' + n,
        name: 'สเตจบ็อกซ์ · IN ' + n + ' (' + p + ')', trap: !own ? { msg: 'ช่อง ' + n + ' คือ ' + p + ' ตามใบแพตช์' } : swap && swap[n] ? { srcs: swap[n], msg: 'ช่อง ' + n + ' รับฝั่ง ' + ch + ' · ซ้ายขวาสลับกัน' } : undefined });
    });
    ['A', 'B', 'C', 'D'].forEach(function (c, i) {
      var j = { id: d + 'Ret' + c, dev: d, pos: [ox + 0.06 - i * 0.04, 0.035, Z], normal: REAR, type: 'XLR', dir: 'out', usable: false, short: c, name: 'สเตจบ็อกซ์ · RETURN ' + c, hint: 'ช่องส่งกลับจากคอนโซลหน้าเวที ด่านนี้ไม่ใช้' };
      if (ret) { j.usable = true; delete j.hint; j.name += ' (' + ret.list[i] + ')'; }
      out.push(j);
    });
    return out;
  }

  // VM-80 ลำโพงหลัก/บูธหนึ่งตัว · ch = 'L' | 'R'
  function vm80(d, ox, oz, label, ch, use) {
    var x = ox + 0.0475, Z = -0.1625 + oz;
    return [
      J({ id: d + 'Combo', dev: d, pos: [x, 0.2346, Z], normal: REAR, type: 'COMBO', accepts: ['XLR', 'XLRM', 'TRS'], dir: 'in', ch: ch, short: 'IN', name: label + ' · INPUT คอมโบ XLR/TRS' }, use, 'ด่านนี้ต่อไว้แล้ว'),
      J({ id: d + 'Rca', dev: d, pos: [x, 0.2015, Z], normal: REAR, type: 'RCA', dir: 'in', ch: ch, short: 'RCA', name: label + ' · INPUT RCA' }, use, 'ใช้ช่องคอมโบ (บาลานซ์) ดีกว่า')
    ];
  }

  // สวิตช์ฮับ LAN (ทั่วไป ไม่ใช่รุ่นจริง) · ports = จำนวนพอร์ต · พอร์ตเรียงแถวด้านหลัง
  function hub(d, ox, oz, ports, w) {
    var out = [], step = (w - 0.04) / Math.max(1, ports - 1);
    for (var i = 0; i < ports; i++) out.push({ id: d + (i + 1), dev: d, pos: [ox - (w - 0.04) / 2 + i * step, 0.02, oz - 0.06], normal: REAR, type: 'LAN', dir: 'out', usable: true, short: '' + (i + 1), name: 'สวิตช์ฮับ · พอร์ต ' + (i + 1) });
    return out;
  }

  // เปลี่ยนชื่อชุดช่องของมิกเซอร์ (a9 / v5 / az ใช้ dev 'mix' และ id ตายตัว) เมื่อมีมิกเซอร์มากกว่าหนึ่งตัวในด่าน
  // pre = คำนำหน้า id · dev = id เครื่องใหม่ · label = คำนำหน้าชื่อที่แสดง · id ใน covers / via เปลี่ยนตาม (trap.srcs อ้างเครื่องอื่น ไม่เปลี่ยน)
  function rename(js, pre, dev, label) {
    function m(id) { return pre + id; }
    return js.map(function (j) {
      var o = {}; for (var k in j) o[k] = j[k];
      o.id = m(j.id); o.dev = dev; if (label) o.name = label + ' · ' + j.name;
      if (j.covers) o.covers = j.covers.map(m);
      if (j.via) o.via = [].concat(j.via).map(m);
      return o;
    });
  }

  // ลำโพงสองตัวต่อ MASTER 1 ไว้ให้แล้ว (สาย XLR ต่อตาย) ใช้ในด่านที่ไม่ได้ฝึกเรื่องลำโพง
  function fixedMains() {
    return [
      { id: 'fxL', color: 'black', ends: ['XLR', 'XLR'], len: 3.0, fixed: ['m1L', 'vmLCombo'] },
      { id: 'fxR', color: 'black', ends: ['XLR', 'XLR'], len: 3.0, fixed: ['m1R', 'vmRCombo'] }
    ];
  }

  // สายเสียง CDJ → LINE ที่ต่อไว้ให้แล้ว (ช่องละเส้น) · list = [[cdjId, ช่อง LINE, ความยาว]]
  function fixedDecks(list) {
    return list.map(function (x) { return { id: 'fx' + x[0], color: 'black', ends: ['RCA2', 'RCA2'], len: x[2], label: 'สาย RCA คู่', fixed: [x[0] + 'Out', x[1]] }; });
  }

  return { REAR: REAR, RIGHT: RIGHT, BATTLE: Math.PI / 2, cdj: cdj, tt: tt, a9: a9, s11: s11, laptop: laptop, vm80: vm80, hub: hub, recorder: recorder, paBox: paBox, stagebox: stagebox, az: az, wirelessRx: wirelessRx, cdj15: cdj15, v5: v5, v10: v10, rename: rename, flx10: flx10, iface: iface, pj: pj,
    fixedMains: fixedMains, fixedDecks: fixedDecks,
    models: { cdj: 'models/cdj_3000x.glb', a9: 'models/djm_a9.glb', vm80: 'models/vm_80.glb', tt: 'models/plx_crss12.glb', s11: 'models/djm_s11.glb',
      az: 'models/xdj_az.glb', v10: 'models/djm_v10.glb', v5: 'models/djm_v5.glb', cdj15: 'models/cdj_1500x.glb', flx10: 'models/ddj_flx10.glb' },
    typeLabels: { MINI: '3.5 มม.', SPKC: 'สายลำโพง (speakON)', RCA: 'RCA', RCA2: 'RCA คู่ (ขาว+แดง)', XLR: 'XLR', XLRM: 'XLR ตัวผู้', XLRF: 'XLR ตัวเมีย', TRS: 'TRS 6.35 มม.', TS: 'TS 6.35 มม.', COMBO: 'คอมโบ XLR/TRS', COAX: 'ดิจิทัล (โคแอกเชียล)', LAN: 'LAN', 'USB-C': 'USB-C', 'USB-A': 'USB-A', 'USB-B': 'USB-B', GND: 'สายกราวด์' } };
});
