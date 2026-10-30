// เทสต์ "เล่นค้างอยู่" ในการ์ดเกมของหน้าสมาชิก (assets/js/member.js · ช่วง sf-resume:start … sf-resume:end)
// รัน: node tools/test_member_resume.mjs
// ดึงฟังก์ชันตัวจริงจาก member.js มารัน เทียบกับกติกาล็อกด่านของเกม (game/signal-flow/index.html: sfFirstOpen / sfPhaseOpen / sfPhaseDone)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const member = readFileSync(new URL('../assets/js/member.js', import.meta.url), 'utf8');
const game = readFileSync(new URL('../game/signal-flow/index.html', import.meta.url), 'utf8');
const m = member.match(/sf-resume:start[\s\S]*?\n(var SF_PN[\s\S]*?)\/\* sf-resume:end \*\//);
if (!m) { console.error('ไม่พบช่วง sf-resume ใน member.js'); process.exit(1); }
const g = game.match(/(var SF_PN=[\s\S]*?function sfPhaseOpen[^\n]*\n)/);
if (!g) { console.error('ไม่พบกติกาล็อกด่านใน game/signal-flow/index.html'); process.exit(1); }

// สภาพแวดล้อมจำลอง: window = global เดียวกัน · localStorage เป็น Map · SF_ME = ด่านบนบัญชี
function makeCtx(src) {
  const store = new Map();
  const ctx = { localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), get length() { return store.size; } } };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.sfResume = typeof sfResume === "function" ? sfResume : null; this.sfFirstOpen = sfFirstOpen; this.sfPhaseOpen = sfPhaseOpen; this.sfPhaseDone = sfPhaseDone;', ctx);
  return { ctx, store };
}
const mem = makeCtx(m[1]);
const gam = makeCtx(g[1]);

let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) pass++; else { fail++; console.log('  ✗ ' + name + ' — ได้ ' + JSON.stringify(got)); } };

const PN = { 1: 12, 2: 14, 3: 14 };
const range = (p, a, b) => { const o = []; for (let n = a; n <= b; n++) o.push([p, n]); return o; };
function setup(local, account) {
  for (const x of [mem, gam]) {
    x.store.clear();
    for (const [p, n] of local) x.store.set('signal-flow-best-p' + p + '-l' + n, '{}');
    x.ctx.SF_ME = account === null ? undefined : { levels: account.map(([phase, level]) => ({ phase, level })) };
  }
}

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
  const r = mem.ctx.sfResume();
  ok(name + ' · จำนวนที่ผ่าน', r.passed === want.passed, r.passed);
  ok(name + ' · จุดที่เล่นค้าง', JSON.stringify(r.next) === JSON.stringify(want.next), r.next);
  if (r.next) {
    // ต้องตรงกับที่เกมคำนวณเอง: Phase นั้นเปิด · ยังไม่ครบ · ด่านที่ชี้ = ด่านสูงสุดที่เล่นได้ (sfFirstOpen)
    ok(name + ' · เกมบอกว่า Phase เปิด', gam.ctx.sfPhaseOpen(r.next[0]) === true, null);
    ok(name + ' · เกมบอกว่า Phase ยังไม่ครบ', gam.ctx.sfPhaseDone(r.next[0]) === false, null);
    ok(name + ' · ด่านตรงกับ sfFirstOpen ของเกม', gam.ctx.sfFirstOpen(r.next[0]) === r.next[1], r.next);
  }
  for (const p of [1, 2, 3]) {
    let c = 0; for (let n = 1; n <= PN[p]; n++) if (gam.store.has('signal-flow-best-p' + p + '-l' + n) || (account || []).some(([a, b]) => a === p && b === n)) c++;
    ok(name + ' · ผ่านแล้วใน P' + p, r.per[p] === c, r.per[p]);
  }
}

// ฟังก์ชันของเกมกับของหน้าสมาชิกต้องให้ผลตรงกันทุกสถานะที่ลอง (ฟังก์ชัน 4 ตัวเหมือนกันทุกตัวอักษร ถูกล็อกใน check_pages ด้วย)
for (const [name, local, account] of cases) {
  setup(local, account);
  for (const p of [1, 2, 3]) {
    ok(name + ' · sfFirstOpen P' + p + ' ตรงกัน', mem.ctx.sfFirstOpen(p) === gam.ctx.sfFirstOpen(p), [mem.ctx.sfFirstOpen(p), gam.ctx.sfFirstOpen(p)]);
    ok(name + ' · sfPhaseOpen P' + p + ' ตรงกัน', mem.ctx.sfPhaseOpen(p) === gam.ctx.sfPhaseOpen(p), null);
    ok(name + ' · sfPhaseDone P' + p + ' ตรงกัน', mem.ctx.sfPhaseDone(p) === gam.ctx.sfPhaseDone(p), null);
  }
}

console.log(`test_member_resume: ${pass} ผ่าน · ${fail} ไม่ผ่าน`);
process.exit(fail ? 1 : 0);
