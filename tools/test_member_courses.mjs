// เทสต์ "คอร์สของฉัน" — ตรรกะ (assets/js/member-courses.js) + กติกาของโค้ดหน้าสมาชิกที่เกี่ยวกับคอร์ส (assets/js/member.js)
// รัน: node tools/test_member_courses.mjs   (รันไฟล์จริงใน vm เปล่า ไม่มี document / localStorage / fetch / console — ถ้าโค้ดแตะของพวกนี้จะพังทันที · ข้อมูลเป็น mock)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const src = read('assets/js/member-courses.js');
const memberJs = read('assets/js/member.js');

const sandbox = { module: { exports: {} } };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const { view } = sandbox.module.exports;

let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) pass++; else { fail++; console.log('  ✗ ' + name + (got === undefined ? '' : ' — ได้ ' + JSON.stringify(got))); } };

const NOW = Date.parse('2026-11-04T05:00:00Z');   // 4 พ.ย. 2026 12:00 น. เวลาไทย
const reply = courses => ({ status: 200, j: { ok: true, courses } });
const base = (o = {}) => ({
  course_title: 'คอร์ส Basic DJ', teacher_name: 'Zlex', teach_lang: 'th', track: 'dj', sessions_total: 12, sessions_done: 4, sessions_remaining: 8,
  started_on: '2026-09-01', effective_expiry: '2027-03-01', closed_on: null, state: 'active', next_session_at: '2026-11-08T07:00:00Z', paid_in_full: true, ...o
});
const one = (o, now = NOW) => view(reply([base(o)]), now).cards[0];

// ───── รูปแบบคำตอบ ─────
ok('ว่าง → ok แต่ไม่มีการ์ด', JSON.stringify(view(reply([]), NOW)) === JSON.stringify({ ok: true, cards: [] }));
ok('ไม่มี courses → ไม่ใช่ "ไม่มีคอร์ส" แต่ ok=false', view({ status: 200, j: { ok: true } }, NOW).ok === false);
ok('courses ไม่ใช่ array → ok=false', view({ status: 200, j: { ok: true, courses: 'x' } }, NOW).ok === false);
ok('ok:false → ok=false', view({ status: 200, j: { ok: false, error: { code: 'x' } } }, NOW).ok === false);
for (const s of [0, 401, 403, 429, 500, 503]) ok('status ' + s + ' → ok=false', view({ status: s, j: null }, NOW).ok === false);
ok('ไม่มีคำตอบ (null) → ok=false', view(null, NOW).ok === false);
ok('รายการที่ไม่ใช่ object / ไม่มีชื่อคอร์ส ถูกข้าม', view(reply([null, 5, 'x', {}, { course_title: '  ' }, base()]), NOW).cards.length === 1);
ok('เกิน 20 ใบ → ตัดที่ 20', view(reply(Array.from({ length: 30 }, () => base())), NOW).cards.length === 20);

// ───── ความคืบหน้า ─────
let c = one();
ok('ชื่อ/ครู/ภาษา', c.title === 'คอร์ส Basic DJ' && c.teacher === 'Zlex' && c.lang === 'ภาษาไทย', c);
ok('นับครั้ง 4/12 เหลือ 8 = 33%', c.hasCount && c.done === 4 && c.total === 12 && c.left === 8 && c.pct === 33, c);
ok('ภาษา en → English', one({ teach_lang: 'en' }).lang === 'English');
ok('ภาษาที่ไม่รู้จัก → ไม่แสดง (ไม่โชว์รหัสดิบ)', one({ teach_lang: 'zz' }).lang === '' && one({ teach_lang: null }).lang === '');
ok('done เกิน total → ถูกหนีบ', one({ sessions_done: 99, sessions_remaining: 0 }).done === 12);
ok('ไม่มี sessions_remaining → คำนวณจาก total-done', one({ sessions_remaining: null }).left === 8);
ok('ไม่มี sessions_done → คำนวณจาก total-remaining', one({ sessions_done: null }).done === 4);
ok('total = 0 หรือไม่มีตัวเลข → ไม่แสดงแถบ', !one({ sessions_total: 0 }).hasCount && !one({ sessions_total: null }).hasCount && !one({ sessions_total: 'abc' }).hasCount);
ok('ค่าติดลบ/ใหญ่เกิน → ไม่เชื่อ', !one({ sessions_total: -3 }).hasCount && !one({ sessions_total: 99999 }).hasCount);

// ───── วันที่ (ปี พ.ศ. เวลาไทย) ─────
c = one();
ok('เริ่มเรียน 1 ก.ย. 2569', c.started === '1 ก.ย. 2569', c.started);
ok('ใช้ได้ถึง 1 มี.ค. 2570', c.expiry === '1 มี.ค. 2570', c.expiry);
ok('นัดครั้งถัดไป แสดงเวลาไทย (07:00Z = 14:00 น.)', c.next === '8 พ.ย. 2569 เวลา 14:00 น.', c.next);
ok('นัดข้ามเที่ยงคืน UTC → วันไทยถูก (20:00Z = 03:00 น. วันถัดไป)', one({ next_session_at: '2026-11-08T20:00:00Z' }).next === '9 พ.ย. 2569 เวลา 03:00 น.');
ok('วันที่เสีย/ไม่ใช่วัน → ไม่แสดง ไม่พัง', one({ started_on: 'ไม่รู้', effective_expiry: '2026-13-40', next_session_at: 'พรุ่งนี้' }).started === '');
ok('ไม่มีนัด → ว่าง', one({ next_session_at: null }).next === '');
ok('นัดที่ผ่านไปแล้ว → ไม่แสดง', one({ next_session_at: '2026-10-01T07:00:00Z' }).next === '');
ok('timestamp แบบมีวันที่เฉยๆ ไม่ถือเป็นนัด (ต้องมีเวลา)', one({ next_session_at: '2026-11-08' }).next === '');

// ───── สถานะ ─────
ok('กำลังเรียน', one().state.label === 'กำลังเรียน' && one().state.kind === 'live');
ok('เรียนครบ (เหลือ 0)', one({ sessions_done: 12, sessions_remaining: 0 }).state.label === 'เรียนครบแล้ว');
ok('หมดอายุ (วันหมดอายุก่อนวันนี้ตามเวลาไทย)', one({ effective_expiry: '2026-11-03' }).state.label === 'หมดอายุแล้ว');
ok('วันหมดอายุคือวันนี้ → ยังใช้ได้', one({ effective_expiry: '2026-11-04' }).state.label === 'กำลังเรียน');
ok('ใกล้เที่ยงคืนไทย: 16:59Z ของวันที่ 3 = 23:59 ไทย ยังเป็นวันที่ 3', one({ effective_expiry: '2026-11-03' }, Date.parse('2026-11-03T16:59:00Z')).state.label === 'กำลังเรียน');
ok('เลยเที่ยงคืนไทย: 17:00Z = วันที่ 4 → หมดอายุ', one({ effective_expiry: '2026-11-03' }, Date.parse('2026-11-03T17:00:00Z')).state.label === 'หมดอายุแล้ว');
c = one({ closed_on: '2026-10-20' });
ok('ปิดคอร์ส → แสดงวันที่ปิด ไม่แสดงวันหมดอายุ ไม่แสดงนัด', c.state.label === 'ปิดคอร์สแล้ว' && c.closed === '20 ต.ค. 2569' && c.expiry === '' && c.next === '', c);
ok('คอร์สหมดอายุ/เรียนครบ ไม่โชว์นัดครั้งถัดไป', one({ effective_expiry: '2026-01-01' }).next === '' && one({ sessions_done: 12, sessions_remaining: 0 }).next === '');

// ───── สถานะชำระ: ตัวหนังสือ ไม่มีจำนวนเงิน ─────
ok('จ่ายครบ', one({ paid_in_full: true }).paid.label === 'จ่ายครบแล้ว' && one({ paid_in_full: true }).paid.kind === 'paid');
ok('ยังไม่ครบ', one({ paid_in_full: false }).paid.label === 'ยังจ่ายไม่ครบ' && one({ paid_in_full: false }).paid.kind === 'due');
ok('ไม่รู้ (null / ไม่ใช่ boolean) → ไม่โชว์ป้ายอะไร ไม่เดา', one({ paid_in_full: null }).paid === null && one({ paid_in_full: 'true' }).paid === null && one({ paid_in_full: 1 }).paid === null);
const spy = JSON.stringify(one({ price: 20000, amount_paid: 5000, total_price: 20000, balance: 15000, equipment: 'DDJ-FLX4', paid_in_full: false }));
ok('ฟิลด์เงิน / รุ่นอุปกรณ์ที่หลุดมาจากเซิร์ฟเวอร์ ไม่ถูกส่งต่อ', !/20000|5000|15000|DDJ|price|amount|balance|equipment/.test(spy), spy);

// ───── ข้อความ: คุมอักขระ ─────
c = one({ course_title: ' <b>x</b>\u0000\n' + 'ก'.repeat(300), teacher_name: 'ครู\tA' });
ok('ตัดความยาว + ล้าง control char (ไม่ตัด HTML — หน้าใช้ textContent)', c.title.length <= 120 && !/[\u0000-\u001f]/.test(c.title + c.teacher), c.title.length);

// ───── โค้ดหน้า (member.js) ─────
const mq = memberJs.slice(memberJs.indexOf('/* ---- my courses'), memberJs.indexOf('/* ---- forms ---- */'));
ok('พบส่วนคอร์สใน member.js', mq.length > 500);
ok('เรียก my_courses ครั้งเดียว และใช้ call() เดิม', (mq.match(/action: 'my_courses'/g) || []).length === 1 && /call\(\{ action: 'my_courses' \}, tok\)/.test(mq));
ok('ไม่แตะ storage / console / address bar / innerHTML / โดเมนนอก', !/localStorage|sessionStorage|indexedDB|document\.cookie|console\.|location\.|history\.|sendBeacon|innerHTML|insertAdjacentHTML|https?:\/\//.test(mq), mq.match(/localStorage|sessionStorage|console\.|location\.|innerHTML|https?:\/\//));
ok('ออกจากหน้าโปรไฟล์ → เคลียร์รายการคอร์ส', /if \(name !== 'profile'\) \{ qrClose\(\); coursesClear\(\); \}/.test(memberJs));
ok('โหลดคอร์สตอนเปิดโปรไฟล์ (หลัง loadBoard) ครั้งเดียว', (memberJs.match(/^\s+loadCourses\(tok\);/gm) || []).length === 1 && memberJs.indexOf('loadBoard(tok);\n        loadCourses(tok);') > 0);
ok('คำตอบเก่า (กด/เปิดซ้ำ) ไม่ทับของใหม่', /my !== CRS\.seq\) return/.test(mq));
ok('ไม่มีคำว่าราคา/ยอดเงิน/บาท ในข้อความหน้า', !/ราคา|ยอดเงิน|ยอดชำระ|บาท|฿|ส่วนลด|คูปอง/.test(mq + src));
ok('ข้อความว่างตรงตามที่เจ้าของกำหนด และไม่สัญญาเรื่องข้อมูลหาย', mq.includes("ยังไม่มีคอร์สที่ผูกกับบัญชีนี้ — สอบถามทีมงานได้") && !/ข้อมูลหาย|จะแก้|ภายใน/.test(mq));
ok('member-courses.js ไม่แตะหน้า/เครือข่าย/ที่เก็บ/console', !/\bfetch\b|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|document\.|console\.|location|history\.|innerHTML|https?:\/\//.test(src));

console.log(`\nคอร์สของฉัน: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
