// เทสต์ ?next= ของหน้าสมาชิก (assets/js/member.js · safeNext) — ปุ่ม "กลับไปเล่นเกม" ต้องพาไปได้เฉพาะหน้าเกมของร้านใต้ /game/signal-flow/
// รัน: node tools/test_member_next.mjs   (ดึงฟังก์ชัน safeNext ตัวจริงจาก member.js มาทดสอบ ไม่ต้องมีเบราว์เซอร์)
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../assets/js/member.js', import.meta.url), 'utf8');
const m = src.match(/function safeNext\(q\) \{[\s\S]*?\n  \}/);
if (!m) { console.error('ไม่พบ function safeNext ใน member.js'); process.exit(1); }
const safeNext = new Function(m[0] + '\nreturn safeNext;')();

let pass = 0, fail = 0;
const ok = (name, cond, got) => { if (cond) pass++; else { fail++; console.log('  ✗ ' + name + ' — ได้ ' + JSON.stringify(got)); } };
const q = v => '?next=' + v;   // ค่าดิบในแถบที่อยู่ (ยังไม่ decode)
const SITE = 'https://djlabsiam.com';
const lands = p => { const u = new URL(p, SITE + '/member/'); return u.origin === SITE && u.pathname.startsWith('/game/signal-flow/'); };

// ผ่าน: หน้าเกม (เข้ารหัสแบบที่เกมส่งมา และแบบไม่เข้ารหัส)
for (const [raw, want] of [
  [encodeURIComponent('/game/signal-flow/?phase=3'), '/game/signal-flow/?phase=3'],
  [encodeURIComponent('/game/signal-flow/?phase=3&level=2'), '/game/signal-flow/?phase=3&level=2'],
  ['/game/signal-flow/', '/game/signal-flow/'],
]) {
  const got = safeNext(q(raw));
  ok('รับ ' + raw, got === want && lands(got), got);
}

// ไม่ผ่าน = null (เมินเงียบ ไม่มีปุ่ม)
for (const raw of [
  'https://evil.example', encodeURIComponent('https://evil.example/game/signal-flow/'), '//evil.example', encodeURIComponent('//evil.example'),
  '/game/signal-flow//evil.example', '/game/signal-flow/../x', encodeURIComponent('/game/signal-flow/../../member/'),
  '/game/signal-flow/%2e%2e/x', '/game/signal-flow/%252e%252e/x', '/game/signal-flow/%2F%2Fevil.example',
  'javascript:alert(1)', encodeURIComponent('javascript:alert(1)'), '/game/signal-flow/?x=javascript:alert(1)',
  '/game/signal-flow/\\evil.example', encodeURIComponent('/game/signal-flow/\\\\evil.example'),
  '/game/signal-flowX/', '/game/', '/member/', '/', '', 'game/signal-flow/', ' /game/signal-flow/', '/GAME/signal-flow/',
  '/game/signal-flow/%0Aevil', '/game/signal-flow/%09', '/game/signal-flow/+x', '/game/signal-flow/%E0%A4%A',
  'data:text/html,hi', '/game/signal-flow/%25',
]) {
  const got = safeNext(q(raw));
  ok('ปฏิเสธ ' + raw, got === null, got);
}
ok('ไม่มี next = null', safeNext('') === null && safeNext('?a=1') === null, safeNext('?a=1'));
ok('next ซ้ำสองตัว ใช้ตัวแรกเท่านั้น (ตัวแรกอันตราย = null)', safeNext('?next=//evil.example&next=' + encodeURIComponent('/game/signal-flow/')) === null);

console.log(`safeNext: ผ่าน ${pass} · ตก ${fail}`);
process.exit(fail ? 1 : 0);
