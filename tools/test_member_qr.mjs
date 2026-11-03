// เทสต์ "QR สมาชิก" — ตรรกะของ token (assets/js/member-qr.js) + กติกาของโค้ดหน้าสมาชิกที่เกี่ยวกับ QR (assets/js/member.js)
// รัน: node tools/test_member_qr.mjs   (รันไฟล์จริงใน vm ที่ไม่มี document / localStorage / fetch เลย — ถ้าโค้ดแตะของพวกนี้จะพังทันที · ใช้นาฬิกา/ตัวจับเวลาจำลอง ไม่ต้องมีเบราว์เซอร์)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const qrSrc = read('assets/js/member-qr.js');
const memberJs = read('assets/js/member.js');

// ───── vm เปล่า: ไม่มี window/document/localStorage/fetch/console ─────
const sandbox = { module: { exports: {} } };
vm.createContext(sandbox);
vm.runInContext(qrSrc, sandbox);
const { create, TOKEN_RE } = sandbox.module.exports;

let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) pass++; else { fail++; console.log('  ✗ ' + name + (got === undefined ? '' : ' — ได้ ' + JSON.stringify(got))); } };
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(r => setImmediate(r)); };

const TOK = n => 'DJLM1.ABCDEFGHIJKLMNOPQRST2345' + String.fromCharCode(65 + (n % 26)) + String.fromCharCode(65 + (Math.floor(n / 26) % 26));   // 26 chars of A–Z 2–7 after DJLM1., like the real function
const good = (n, ttl = 120) => ({ status: 200, j: { ok: true, token: TOK(n), expires_in: ttl } });

// ตัวสร้าง flow ทดสอบ: นาฬิกา + ตัวจับเวลาจำลอง · request ตอบตามคิวที่กำหนด
function rig({ session = 'SESSION', replies = [] } = {}) {
  const r = { t: 0, states: [], calls: [], timer: null, cancelled: 0, pending: [] };
  const flow = create({
    getToken: () => Promise.resolve(session),
    request: tok => { r.calls.push(tok); const x = replies.length ? replies.shift() : good(r.calls.length); return typeof x === 'function' ? x() : Promise.resolve(x); },
    now: () => r.t,
    every: fn => { r.timer = fn; return () => { r.timer = null; r.cancelled++; }; },
    onChange: s => r.states.push(s)
  });
  r.flow = flow;
  r.last = () => r.states[r.states.length - 1];
  r.advance = async sec => { for (let i = 0; i < sec; i++) { r.t += 1000; if (r.timer) r.timer(); await flush(); } };
  return r;
}

// 1) ไม่มี session → ไม่ส่ง qr_token เด็ดขาด
{
  const r = rig({ session: null });
  r.flow.open(); await flush();
  ok('ไม่มี session: ไม่เรียก request เลย', r.calls.length === 0, r.calls);
  ok('ไม่มี session: สถานะ signedout และไม่มี token', r.last().phase === 'signedout' && r.last().token === null, r.last());
}

// 2) ขอสำเร็จ: ส่ง session token ไป · ได้ token + 120 วิ
{
  const r = rig();
  r.flow.open(); await flush();
  ok('ส่ง session token ไปที่ request', r.calls.length === 1 && r.calls[0] === 'SESSION', r.calls);
  ok('ขั้น loading ก่อนได้ QR', r.states[0].phase === 'loading' && r.states[0].token === null, r.states[0]);
  const s = r.last();
  ok('พร้อมใช้: token ตรงรูปแบบ · เหลือ 120 วิ', s.phase === 'ready' && TOKEN_RE.test(s.token) && s.left === 120 && s.total === 120, s);
}

// 3) นับถอยหลัง + ต่ออายุเงียบๆ เมื่อเหลือ ≤ 30 วิ (ขอใหม่ครั้งเดียว · ใบใหม่แทนใบเก่าทันที)
{
  const r = rig();
  r.flow.open(); await flush();
  const first = r.last().token;
  await r.advance(89);
  ok('เหลือ 31 วิ: ยังไม่ขอใหม่', r.calls.length === 1 && r.last().left === 31, [r.calls.length, r.last().left]);
  await r.advance(1);
  ok('เหลือ 30 วิ: ขอใหม่ 1 ครั้ง', r.calls.length === 2, r.calls.length);
  ok('ใบใหม่แทนใบเก่า รีเซ็ตเป็น 120 วิ ไม่ผ่านสถานะ loading', r.last().phase === 'ready' && r.last().token !== first && r.last().left === 120 && !r.states.slice(1).some(s => s.phase === 'loading'), r.last());
  ok('ใบใหม่ seq เพิ่ม (หน้าวาดใหม่)', r.last().seq === 2, r.last().seq);
  await r.advance(5);
  ok('ต่ออายุแล้วไม่ขอซ้ำ', r.calls.length === 2, r.calls.length);
}

// 4) แท็บซ่อนอยู่: ไม่ต่ออายุ · กลับมาเห็นแล้วต่อทันที
{
  const r = rig();
  r.flow.open(); await flush();
  r.flow.visible(false);
  await r.advance(100);
  ok('แท็บซ่อน: ไม่ขอใหม่ แม้เหลือ < 30 วิ', r.calls.length === 1 && r.last().left === 20, [r.calls.length, r.last().left]);
  r.flow.visible(true); await flush();
  ok('แท็บกลับมาเห็น: ขอใหม่ทันที', r.calls.length === 2 && r.last().left === 120, [r.calls.length, r.last().left]);
}

// 5) ต่ออายุเงียบๆ ล้มเหลว: ใบเดิมยังแสดงจนหมดอายุ แล้วเป็น expired (token ถูกทิ้ง) · ลองใหม่ได้ด้วยปุ่ม
{
  const r = rig({ replies: [good(1), { status: 0, j: null }, { status: 429, j: null }, { status: 429, j: null }] });
  r.flow.open(); await flush();
  const first = r.last().token;
  await r.advance(90);
  ok('ต่ออายุไม่สำเร็จ: ใบเดิมยังอยู่', r.last().phase === 'ready' && r.last().token === first, r.last());
  ok('ลองใหม่แบบเว้นช่วง ไม่รัวทุกวินาที', r.calls.length === 2, r.calls.length);
  await r.advance(10);
  ok('ลองซ้ำหลังเว้น 10 วิ (ได้ 429 ก็ยังเก็บใบเดิม)', r.calls.length === 3 && r.last().token === first, [r.calls.length, r.last()]);
  await r.advance(30);
  ok('หมดอายุ: สถานะ expired และไม่มี token', r.last().phase === 'expired' && r.last().token === null && r.last().left === 0, r.last());
  r.flow.retry(); await flush();
  ok('ปุ่มขอ QR ใหม่ ได้ใบใหม่', r.last().phase === 'ready' && r.last().left === 120, r.last());
}

// 6) ข้อผิดพลาดแต่ละแบบ
for (const [name, reply, phase, code] of [
  ['401 → signedout', { status: 401, j: null }, 'signedout', ''],
  ['429 → rate', { status: 429, j: null }, 'error', 'rate'],
  ['403 → denied', { status: 403, j: null }, 'error', 'denied'],
  ['409 → denied', { status: 409, j: null }, 'error', 'denied'],
  ['403 not_member → signedout (เหมือนทุก action ในหน้า)', { status: 403, j: { ok: false, error: { code: 'not_member', message: 'x' } } }, 'signedout', ''],
  ['409 no_account → denied', { status: 409, j: { ok: false, error: { code: 'no_account', message: 'x' } } }, 'error', 'denied'],
  ['429 rate_limited → rate', { status: 429, j: { ok: false, error: { code: 'rate_limited', message: 'x' } } }, 'error', 'rate'],
  ['503 unavailable → unavailable', { status: 503, j: { ok: false, error: { code: 'unavailable', message: 'x' } } }, 'error', 'unavailable'],
  ['401 unauthorized (มี body) → signedout', { status: 401, j: { ok: false, error: { code: 'unauthorized', message: 'x' } } }, 'signedout', ''],
  ['ออฟไลน์ (ไม่มีคำตอบ) → net', { status: 0, j: null }, 'error', 'net'],
  ['500 → unavailable', { status: 500, j: null }, 'error', 'unavailable'],
  ['200 แต่ไม่ ok → unavailable', { status: 200, j: { ok: false } }, 'error', 'unavailable'],
  ['token รูปแบบผิด → unavailable', { status: 200, j: { ok: true, token: 'hello', expires_in: 120 } }, 'error', 'unavailable'],
  ['token ไม่ขึ้นต้น DJLM1. → unavailable', { status: 200, j: { ok: true, token: 'XXLM1.abcdefghijkl', expires_in: 120 } }, 'error', 'unavailable'],
  ['token มีอักขระแปลก → unavailable', { status: 200, j: { ok: true, token: 'DJLM1.<script>alert(1)</script>', expires_in: 120 } }, 'error', 'unavailable'],
]) {
  const r = rig({ replies: [reply] });
  r.flow.open(); await flush();
  const s = r.last();
  ok(name, s.phase === phase && s.code === code && s.token === null, s);
}
{
  const r = rig({ replies: [() => Promise.reject(new Error('boom'))] });
  r.flow.open(); await flush();
  ok('request โยน error → net ไม่ค้าง', r.last().phase === 'error' && r.last().code === 'net', r.last());
}

// 7) expires_in ผิดปกติ → ใช้ค่ามาตรฐาน 120 หรือบีบเข้าช่วง
for (const [v, want] of [[undefined, 120], ['abc', 120], [0, 120], [5, 120], [99999, 120], [60, 60], [300, 300]]) {
  const r = rig({ replies: [{ status: 200, j: { ok: true, token: TOK(1), expires_in: v } }] });
  r.flow.open(); await flush();
  ok('expires_in ' + String(v) + ' → ' + want, r.last().total === want && r.last().left === want, r.last());
}

// 8) ปิดแผง = ทิ้ง token ทันที · คำตอบที่มาช้าหลังปิดต้องถูกเมิน · ตัวจับเวลาถูกยกเลิก
{
  let release;
  const slow = () => new Promise(res => { release = () => res(good(7)); });
  const r = rig({ replies: [slow] });
  r.flow.open(); await flush();
  r.flow.close();
  ok('ปิด: สถานะ closed ไม่มี token', r.last().phase === 'closed' && r.last().token === null, r.last());
  ok('ปิด: ยกเลิกตัวจับเวลา', r.timer === null && r.cancelled === 1, [r.timer, r.cancelled]);
  const n = r.states.length;
  release(); await flush();
  ok('คำตอบมาช้าหลังปิด: ไม่เปลี่ยนสถานะ ไม่เก็บ token', r.states.length === n && r.last().token === null, r.last());
}
{
  const r = rig();
  r.flow.open(); await flush();
  r.flow.close();
  ok('ปิดหลังมี QR: ไม่เหลือ token ในสถานะสุดท้าย', r.last().token === null && r.last().left === 0, r.last());
  r.flow.open(); await flush();
  ok('เปิดใหม่ = ขอ token ใบใหม่ (ไม่ใช้ของเก่า)', r.calls.length === 2 && r.last().token !== r.states[1].token, r.calls.length);
}

// 9) ไม่ขอซ้อน: กดขอ QR ใหม่รัวๆ ระหว่างรอ → ส่งครั้งเดียว
{
  let release;
  const r = rig({ replies: [() => new Promise(res => { release = () => res(good(1)); })] });
  r.flow.open(); await flush();
  r.flow.retry(); r.flow.retry(); await flush();
  ok('ระหว่างรอ: ไม่ส่งซ้อน', r.calls.length === 1, r.calls.length);
  release(); await flush();
  ok('คำตอบเดียวก็พอ', r.last().phase === 'ready', r.last());
}

// 10) โค้ด: ตรรกะ token ไม่แตะที่เก็บ/หน้า/เครือข่าย · หน้าสมาชิกเรียก qr_token ทางเดียวผ่านโค้ดที่ตรวจแล้ว
ok('member-qr.js: ไม่มี storage / document / fetch / console / location', !/localStorage|sessionStorage|indexedDB|document\.|\bfetch\b|XMLHttp|WebSocket|sendBeacon|console\.|location|history\./.test(qrSrc));
const qrPart = memberJs.slice(memberJs.indexOf('/* ---- member QR:'), memberJs.indexOf('/* ---- start ---- */'));
ok('member.js (ส่วน QR): ไม่เขียนที่เก็บ/URL/console', !/localStorage|sessionStorage|indexedDB|document\.cookie|console\.|location\.|history\.|sendBeacon/.test(qrPart));
ok('member.js (ส่วน QR): เรียก qr_token ครั้งเดียว ผ่าน call() ไป member-auth พร้อม session token', (qrPart.match(/qr_token/g) || []).length === 1 && /request: function \(tok\) \{ return call\(\{ action: 'qr_token' \}, tok\); \}/.test(qrPart));
ok('member.js (ส่วน QR): ไม่มีที่อยู่เว็บอื่น (ยกเว้น namespace ของ SVG)', !/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(qrPart));
ok('member.js (ส่วน QR): ไลบรารีมาจาก data-qrlib ของเราเองเท่านั้น', /s\.src = D\.qrlib/.test(qrPart) && !/jsdelivr|unpkg|cdnjs|qrserver|googleapis|chart\./.test(memberJs));
ok('member.js: ออกจากหน้าโปรไฟล์ = ปิด QR', /if \(name !== 'profile'\) qrClose\(\);/.test(memberJs));
ok('member.js (ส่วน QR): ปิดแล้วล้างภาพ QR + token ที่ค้าง', /replaceChildren\(\); QR\.seq = -1; QR\.last = null; modal\.hidden = true;/.test(qrPart));
ok('member.js (ส่วน QR): ใช้ error correction M และ quiet zone 4 โมดูล', /qrcode\(0, 'M'\)/.test(qrPart) && /'-4 -4 ' \+ \(n \+ 8\) \+ ' ' \+ \(n \+ 8\)/.test(qrPart));

console.log(`member QR: ผ่าน ${pass} · ตก ${fail}`);
process.exit(fail ? 1 : 0);
