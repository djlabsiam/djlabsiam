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
ok('ว่าง → ok แต่ไม่มีการ์ด', view(reply([]), NOW).ok === true && view(reply([]), NOW).cards.length === 0);
ok('ไม่มี courses → ไม่ใช่ "ไม่มีคอร์ส" แต่ ok=false', view({ status: 200, j: { ok: true } }, NOW).ok === false);
ok('courses ไม่ใช่ array → ok=false', view({ status: 200, j: { ok: true, courses: 'x' } }, NOW).ok === false);
ok('ok:false → ok=false', view({ status: 200, j: { ok: false, error: { code: 'x' } } }, NOW).ok === false);
const E = (status, code) => view({ status, j: code ? { ok: false, error: { code, message: 'x' } } : null }, NOW);
ok('401 / 403 (ไม่มี body หรือมี code) → unauthorized', [E(401), E(403), E(401, 'unauthorized'), E(403, 'not_member')].every(r => !r.ok && r.code === 'unauthorized'));
ok('429 / rate_limited → rate', E(429).code === 'rate' && E(429, 'rate_limited').code === 'rate');
ok('503 unavailable / 500 / ไม่มีคำตอบ (0) → unavailable ไม่ใช่ "ไม่มีคอร์ส"', [E(503, 'unavailable'), E(500), E(0)].every(r => !r.ok && r.code === 'unavailable' && r.cards.length === 0));
ok('ไม่มีคำตอบ (null) → ok=false', view(null, NOW).ok === false);
ok('รายการที่ไม่ใช่ object / ไม่มีชื่อคอร์ส ถูกข้าม', view(reply([null, 5, 'x', {}, { course_title: '  ' }, base()]), NOW).cards.length === 1);
ok('เกิน 20 ใบ → ตัดที่ 20', view(reply(Array.from({ length: 30 }, () => base())), NOW).cards.length === 20);

// ───── ความคืบหน้า: ตัวเลขตามที่เซิร์ฟเวอร์ส่ง ไม่คำนวณเอง ─────
let c = one();
ok('ชื่อ/ครู/ภาษา', c.title === 'คอร์ส Basic DJ' && c.teacher === 'Zlex' && c.lang === 'ภาษาไทย', c);
ok('4/12 เหลือ 8 = 33%', c.hasCount && c.done === 4 && c.total === 12 && c.left === 8 && c.pct === 33, c);
ok('done+remaining ไม่เท่า total (no-show) → แสดงตามที่ส่ง ไม่แก้', one({ sessions_done: 4, sessions_remaining: 6 }).left === 6 && one({ sessions_done: 4, sessions_remaining: 6 }).done === 4);
ok('ไม่มี sessions_remaining → ไม่โชว์ "เหลือ" ไม่คำนวณแทน', one({ sessions_remaining: null }).left === null);
ok('ไม่มี sessions_done → ไม่แสดงแถบ', !one({ sessions_done: null }).hasCount);
ok('done เกิน total → แถบไม่เกิน 100% ตัวเลขตามที่ส่ง', one({ sessions_done: 14, sessions_remaining: 0 }).pct === 100 && one({ sessions_done: 14, sessions_remaining: 0 }).done === 14);
ok('ภาษา en → English', one({ teach_lang: 'en' }).lang === 'English');
ok('ภาษาที่ไม่รู้จัก/null → ไม่แสดง', one({ teach_lang: 'zz' }).lang === '' && one({ teach_lang: 'constructor' }).lang === '' && one({ teach_lang: null }).lang === '');
ok('total = 0 / null / ตัวอักษร / ติดลบ / ใหญ่เกิน → ไม่แสดงแถบ', [0, null, 'abc', -3, 99999].every(t => !one({ sessions_total: t }).hasCount));
ok('track = null ไม่พัง', one({ track: null }).title === 'คอร์ส Basic DJ');

// ───── วันที่ (ปี พ.ศ. เวลาไทย) ─────
c = one();
ok('เริ่มเรียน 1 ก.ย. 2569', c.started === '1 ก.ย. 2569', c.started);
ok('ใช้ได้ถึง 1 มี.ค. 2570', c.expiry === '1 มี.ค. 2570', c.expiry);
ok('นัดครั้งถัดไป เวลาไทย (07:00Z = 14:00 น.)', c.next === '8 พ.ย. 2569 เวลา 14:00 น.', c.next);
ok('นัดแบบมี offset +07:00 → เวลาไทยเดิม', one({ next_session_at: '2026-11-08T14:00:00+07:00' }).next === '8 พ.ย. 2569 เวลา 14:00 น.');
ok('นัดข้ามเที่ยงคืน UTC → วันไทยถูก', one({ next_session_at: '2026-11-08T20:00:00Z' }).next === '9 พ.ย. 2569 เวลา 03:00 น.');
ok('null ทุกฟิลด์ที่เป็น null ได้ → ไม่พัง ไม่แสดง', (x => x.started === '' && x.expiry === '' && x.closed === '' && x.next === '')(one({ started_on: null, effective_expiry: null, closed_on: null, next_session_at: null })));
ok('วันที่เสีย/ไม่ใช่วัน → ไม่แสดง ไม่พัง', one({ started_on: 'ไม่รู้', effective_expiry: '2026-13-40', next_session_at: 'พรุ่งนี้' }).started === '');
ok('นัดที่ผ่านไปแล้ว → ไม่แสดง', one({ next_session_at: '2026-10-01T07:00:00Z' }).next === '');
ok('timestamp ไม่มีเวลา ไม่ถือเป็นนัด', one({ next_session_at: '2026-11-08' }).next === '');

// ───── สถานะ: ตามค่า state ของเซิร์ฟเวอร์ ครบ 6 ค่า ─────
const L = { active: 'กำลังเรียน', queued: 'ชำระครบ รอเริ่มเรียน', waiting_payment: 'รอชำระ ยังไม่เริ่มเรียน', completed: 'เรียนครบแล้ว', expired: 'หมดอายุแล้ว', closed: 'ปิดคอร์สแล้ว' };
for (const [k, v] of Object.entries(L)) ok('state ' + k + ' → ' + v, one({ state: k }).state && one({ state: k }).state.label === v, one({ state: k }).state);
ok('state ที่ไม่รู้จัก / null / ไม่ใช่ข้อความ → ไม่โชว์ป้าย', [ 'weird', null, 5, '', '__proto__', 'constructor' ].every(v => one({ state: v }).state === null));
ok('active ที่ effective_expiry = null → ยังแสดงได้ ไม่โชว์วันหมดอายุ', one({ state: 'active', effective_expiry: null }).state.label === 'กำลังเรียน' && one({ state: 'active', effective_expiry: null }).expiry === '');
c = one({ state: 'closed', closed_on: '2026-10-20' });
ok('ปิดคอร์ส → วันที่ปิด ไม่แสดงวันหมดอายุ ไม่แสดงนัด', c.closed === '20 ต.ค. 2569' && c.expiry === '' && c.next === '', c);
ok('นัดครั้งถัดไปโชว์เฉพาะ active / queued', one({ state: 'queued' }).next !== '' && ['completed', 'expired', 'closed', 'waiting_payment'].every(k => one({ state: k }).next === ''));

// ───── สถานะชำระ: ตัวหนังสือ ไม่มีจำนวนเงิน ─────
ok('จ่ายครบ', one({ paid_in_full: true }).paid.label === 'จ่ายครบแล้ว' && one({ paid_in_full: true }).paid.kind === 'paid');
ok('ยังไม่ครบ → ถ้อยคำนุ่ม', one({ paid_in_full: false }).paid.label === 'ยังชำระไม่ครบ — สอบถามทีมงาน' && one({ paid_in_full: false }).paid.kind === 'due');
ok('ไม่ใช่ boolean → ไม่โชว์ป้าย ไม่เดา', one({ paid_in_full: null }).paid === null && one({ paid_in_full: 'true' }).paid === null && one({ paid_in_full: 1 }).paid === null);
const spy = JSON.stringify(one({ price: 20000, amount_paid: 5000, total_price: 20000, balance: 15000, equipment: 'DDJ-FLX4', paid_in_full: false }));
ok('ฟิลด์เงิน / รุ่นอุปกรณ์ที่หลุดมา ไม่ถูกส่งต่อ', !/20000|5000|15000|DDJ|price|amount|balance|equipment/.test(spy), spy);

// ───── หลายคอร์ส: ลำดับตามที่ส่ง (ใหม่สุดก่อน) ─────
const multi = view(reply([base({ course_title: 'A', state: 'active' }), base({ course_title: 'B', state: 'closed', closed_on: '2026-01-01' }), base({ course_title: 'C', state: 'waiting_payment', paid_in_full: false })]), NOW).cards;
ok('หลายคอร์ส เรียงตาม array', multi.map(x => x.title).join('') === 'ABC' && multi[2].paid.kind === 'due');

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
