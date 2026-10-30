// เทสต์ "เล่นค้างอยู่" — กติกาเดียวกันทั้งเกม · หน้าสมาชิก (/member/) · หน้ารวมเกม (/game/)
// รัน: node tools/test_member_resume.mjs
// ดึงของจริงมารัน: กติกาล็อกด่านจาก game/signal-flow/index.html (sfFirstOpen / sfPhaseOpen / sfPhaseDone) ·
//   assets/js/sfprogress.js (ชุดกติกาที่แชร์) · assets/js/member.js (paintGame) · assets/js/gamehub.js (ปุ่มเล่นต่อ)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const game = read('game/signal-flow/index.html');
const sfprogress = read('assets/js/sfprogress.js');
const memberJs = read('assets/js/member.js');
const gamehubJs = read('assets/js/gamehub.js');
const g = game.match(/(var SF_PN=[\s\S]*?function sfPhaseOpen[^\n]*\n)/);
if (!g) { console.error('ไม่พบกติกาล็อกด่านใน game/signal-flow/index.html'); process.exit(1); }
const pg = memberJs.match(/function paintGame\(\) \{[\s\S]*?\n  \}\n/);
if (!pg) { console.error('ไม่พบ paintGame ใน member.js'); process.exit(1); }

// ───── สภาพแวดล้อมจำลอง: window = global เดียวกัน · localStorage เป็น Map ─────
function lsOf(store) {
  return { getItem: k => (store.has(k) ? store.get(k) : null), setItem: () => { throw new Error('เขียน localStorage ไม่ได้'); }, removeItem: () => { throw new Error('เขียน localStorage ไม่ได้'); }, get length() { return store.size; }, key: i => [...store.keys()][i] };
}
function makeBase() {
  const store = new Map();
  const ctx = { localStorage: lsOf(store), console };
  ctx.window = ctx;
  vm.createContext(ctx);
  return { ctx, store };
}
// เกม: กติกาตัวจริงของเกม
const gam = makeBase();
vm.runInContext(g[1] + '\nthis.sfFirstOpen = sfFirstOpen; this.sfPhaseOpen = sfPhaseOpen; this.sfPhaseDone = sfPhaseDone;', gam.ctx);
// หน้าสมาชิก: sfprogress.js + paintGame ตัวจริง กับ DOM จำลองแบบเล็ก
function fakeEl() { return { textContent: '', href: '', hidden: false, dataset: {} }; }
const mem = makeBase();
const mEls = { 'g-go': fakeEl(), 'g-state': fakeEl() };
const pgrs = { 1: fakeEl(), 2: fakeEl(), 3: fakeEl() };
mem.ctx.document = { getElementById: id => mEls[id] || null, querySelector: sel => { const m = sel.match(/data-p="(\d)"/); return m ? pgrs[m[1]] : null; } };
vm.runInContext(sfprogress, mem.ctx);
vm.runInContext('var $ = function (id) { return document.getElementById(id); };\n' + pg[0] + '\nthis.paintGame = paintGame;', mem.ctx);
// หน้ารวมเกม: sfprogress.js + gamehub.js ตัวจริง (ไม่มี #leaderboard / fetch → รันเฉพาะส่วนปุ่ม)
const hub = makeBase();
const hEls = { 'gh-go': fakeEl(), 'gh-sub': fakeEl() };
hub.ctx.document = { getElementById: id => hEls[id] || null };
vm.runInContext(sfprogress, hub.ctx);

let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) pass++; else { fail++; console.log('  ✗ ' + name + ' — ได้ ' + JSON.stringify(got)); } };

const PN = { 1: 12, 2: 14, 3: 14 };
const range = (p, a, b) => { const o = []; for (let n = a; n <= b; n++) o.push([p, n]); return o; };
const meOf = account => (account === null ? undefined : { levels: account.map(([phase, level]) => ({ phase, level })) });
function setup(local, account) {
  for (const x of [gam, mem, hub]) {
    x.store.clear();
    for (const [p, n] of local) x.store.set('signal-flow-best-p' + p + '-l' + n, '{}');
    x.ctx.SF_ME = meOf(account);
  }
}
// ลิงก์ → [phase, level]  (หน้าสมาชิก ?phase=P&level=N · หน้ารวมเกม P1 ใช้ ?level=N)
const target = href => { const u = new URL(href, 'https://djlabsiam.com'); return [parseInt(u.searchParams.get('phase') || '1', 10), parseInt(u.searchParams.get('level') || '1', 10)]; };

// [ชื่อเคส, ด่านใน localStorage, ด่านบนบัญชี (null = เรียก me ไม่ได้), ค่าที่คาด {passed, next}]
const cases = [
  ['ไม่มีอะไรเลย', [], null, { passed: 0, next: null }],
  ['ไม่มีด่านในเครื่อง + me ว่าง', [], [], { passed: 0, next: null }],
  ['ผ่าน P1 ด่าน 1–5 (เครื่อง)', range(1, 1, 5), null, { passed: 5, next: [1, 6] }],
  ['ผ่าน P1 ด่าน 1–5 (บัญชี)', [], range(1, 1, 5), { passed: 5, next: [1, 6] }],
  ['ผ่าน P1 ด่าน 1–3 เครื่อง + 4–5 บัญชี (รวมกัน)', range(1, 1, 3), range(1, 4, 5), { passed: 5, next: [1, 6] }],
  ['ผ่าน P1 ครบ → ไป P2 ด่าน 1', range(1, 1, 12), null, { passed: 12, next: [2, 1] }],
  ['ผ่านแค่ P2 ด่าน 3 (เกมผ่อนล็อก) → P2 ด่าน 4', [[2, 3]], null, { passed: 1, next: [2, 4] }],
  ['ผ่าน P1 ครบ + P2 ด่าน 1–6', [...range(1, 1, 12), ...range(2, 1, 6)], null, { passed: 18, next: [2, 7] }],
  ['ผ่าน P1–P2 ครบ → P3 ด่าน 1', [...range(1, 1, 12), ...range(2, 1, 14)], null, { passed: 26, next: [3, 1] }],
  ['ผ่าน P1–P3 ครบ → ครบทุกด่านที่เปิด', [...range(1, 1, 12), ...range(2, 1, 14), ...range(3, 1, 14)], null, { passed: 40, next: null }],
  ['ผ่าน P3 ครบบนบัญชีอย่างเดียว', [], [...range(1, 1, 12), ...range(2, 1, 14), ...range(3, 1, 14)], { passed: 40, next: null }],
  ['ด่านสุดท้ายของ P1 (12) อย่างเดียว → ค้างที่ด่าน 12 ไม่เกิน', [[1, 12]], null, { passed: 1, next: [1, 12] }],
  ['ด่านนอกช่วง (P1 ด่าน 13, P4 ด่าน 1) ไม่นับ', [[1, 13], [4, 1]], null, { passed: 0, next: null }],
];

for (const [name, local, account, want] of cases) {
  setup(local, account);
  const r = mem.ctx.sfProgress.resume();
  ok(name + ' · [ชุดกติกา] จำนวนที่ผ่าน', r.passed === want.passed, r.passed);
  ok(name + ' · [ชุดกติกา] จุดที่เล่นค้าง', JSON.stringify(r.next) === JSON.stringify(want.next), r.next);
  if (r.next) {
    ok(name + ' · เกมบอกว่า Phase เปิด', gam.ctx.sfPhaseOpen(r.next[0]) === true, null);
    ok(name + ' · เกมบอกว่า Phase ยังไม่ครบ', gam.ctx.sfPhaseDone(r.next[0]) === false, null);
    ok(name + ' · ด่านตรงกับ sfFirstOpen ของเกม', gam.ctx.sfFirstOpen(r.next[0]) === r.next[1], r.next);
  }
  for (const p of [1, 2, 3]) {
    ok(name + ' · sfFirstOpen P' + p + ' ตรงกับเกม', mem.ctx.sfProgress.firstOpen(p) === gam.ctx.sfFirstOpen(p), null);
    ok(name + ' · sfPhaseOpen P' + p + ' ตรงกับเกม', mem.ctx.sfProgress.phaseOpen(p) === gam.ctx.sfPhaseOpen(p), null);
    ok(name + ' · sfPhaseDone P' + p + ' ตรงกับเกม', mem.ctx.sfProgress.phaseDone(p) === gam.ctx.sfPhaseDone(p), null);
    let c = 0; for (let n = 1; n <= PN[p]; n++) if (local.some(([a, b]) => a === p && b === n) || (account || []).some(([a, b]) => a === p && b === n)) c++;
    ok(name + ' · ผ่านแล้วใน P' + p, r.per[p] === c, r.per[p]);
  }

  // หน้าสมาชิก: ใช้ paintGame ตัวจริง
  mem.ctx.paintGame();
  const mgo = mEls['g-go'], mst = mEls['g-state'];
  if (want.passed === 0) {
    ok(name + ' · [/member/] ยังไม่เริ่ม', mst.textContent === 'ยังไม่ได้เริ่มเล่น' && !mgo.hidden && JSON.stringify(target(mgo.href)) === '[1,1]', [mst.textContent, mgo.href]);
  } else if (want.next) {
    ok(name + ' · [/member/] เล่นค้างอยู่', mst.textContent === `เล่นค้างอยู่: Phase ${want.next[0]} ด่าน ${want.next[1]}` && !mgo.hidden && JSON.stringify(target(mgo.href)) === JSON.stringify(want.next), [mst.textContent, mgo.href]);
  } else {
    ok(name + ' · [/member/] ครบ', mst.textContent === 'ผ่านครบทุกด่านที่เปิดอยู่แล้ว' && mgo.hidden === true, [mst.textContent, mgo.hidden]);
  }
  ok(name + ' · [/member/] ผ่านแล้วใต้ปุ่ม Phase', [1, 2, 3].every(p => pgrs[p].textContent === `ผ่านแล้ว ${r.per[p]}/${PN[p]} ด่าน`), [1, 2, 3].map(p => pgrs[p].textContent));

  // หน้ารวมเกม: รัน gamehub.js ตัวจริง (ปุ่มเล่นต่อ) · ค่าเริ่มต้นของปุ่มคือ "เริ่มเล่น" → /game/signal-flow/
  hEls['gh-go'].textContent = 'เริ่มเล่น'; hEls['gh-go'].href = '/game/signal-flow/'; hEls['gh-sub'].textContent = '';
  vm.runInContext(gamehubJs, hub.ctx);
  const hgo = hEls['gh-go'], hsub = hEls['gh-sub'];
  if (want.passed === 0) {
    ok(name + ' · [/game/] ยังไม่เริ่ม = ปุ่มเดิม', hgo.textContent === 'เริ่มเล่น' && hgo.href === '/game/signal-flow/' && hsub.textContent === '', [hgo.textContent, hgo.href, hsub.textContent]);
  } else if (want.next) {
    ok(name + ' · [/game/] ปุ่มชี้ด่านเดียวกับ /member/', hgo.textContent === 'เล่นต่อ' && JSON.stringify(target(hgo.href)) === JSON.stringify(want.next), [hgo.textContent, hgo.href]);
    ok(name + ' · [/game/] ข้อความบอกด่านและจำนวนที่ผ่าน', hsub.textContent.startsWith(`ต่อที่ Phase ${want.next[0]} ด่าน ${want.next[1]} · ผ่านแล้ว ${want.passed} / 40 ด่านใน Phase 1–3`), hsub.textContent);
  } else {
    ok(name + ' · [/game/] ครบทุกด่านที่เปิด', hgo.textContent === 'เล่นต่อ' && hgo.href === '/game/signal-flow/' && hsub.textContent.startsWith('ผ่านครบทุกด่านที่เปิดอยู่แล้ว'), [hgo.textContent, hgo.href, hsub.textContent]);
  }
}

console.log(`test_member_resume: ${pass} ผ่าน · ${fail} ไม่ผ่าน`);
process.exit(fail ? 1 : 0);
