/* Member "my courses" — the logic only: turn the answer of member-auth `my_courses` into plain card data for the page (member.js draws it with textContent).
   No page, no storage, no network, no console: nothing about a member's courses is kept anywhere. Money is never shown — only paid in full / not yet (a label, no amount). */
(function (root) {
  var MAX_CARDS = 20, MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var LANGS = { th: 'ภาษาไทย', en: 'English', thai: 'ภาษาไทย', english: 'English' };

  function str(v, max) { return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max || 120) : ''; }
  function int(v) { if (v === null || v === '' || typeof v === 'boolean') return null; var n = Number(v); return isFinite(n) && n >= 0 && n <= 1000 ? Math.floor(n) : null; }

  // the shop is in Bangkok (UTC+7, no daylight saving): work out its calendar day without depending on the browser's own time zone
  function bkk(ms) { return new Date(ms + 7 * 3600 * 1000); }
  function dayKey(d) { return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); }
  function thaiDay(y, m, d) { return d + ' ' + MONTHS[m - 1] + ' ' + (y + 543); }

  // "YYYY-MM-DD" (or a longer ISO text, date part only) → { key, text } · anything else → null
  function dateOnly(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(v, 40));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { key: y * 10000 + mo * 100 + d, text: thaiDay(y, mo, d) };
  }
  // a full timestamp → { ms, text with the Bangkok time } · anything else → null
  function stamp(v) {
    var s = str(v, 40), ms = /^\d{4}-\d{2}-\d{2}T/.test(s) ? Date.parse(s) : NaN;
    if (!isFinite(ms)) return null;
    var d = bkk(ms), hh = ('0' + d.getUTCHours()).slice(-2), mm = ('0' + d.getUTCMinutes()).slice(-2);
    return { ms: ms, text: thaiDay(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) + ' เวลา ' + hh + ':' + mm + ' น.' };
  }

  function card(c, now) {
    if (!c || typeof c !== 'object') return null;
    var title = str(c.course_title, 120);
    if (!title) return null;
    var total = int(c.sessions_total), done = int(c.sessions_done), left = int(c.sessions_remaining);
    var hasCount = total !== null && total > 0 && (done !== null || left !== null);
    if (hasCount) {
      if (done === null) done = Math.max(0, total - left);
      done = Math.min(done, total);
      left = left === null ? total - done : Math.min(left, total);
    }
    var today = dayKey(bkk(now)), expiry = dateOnly(c.effective_expiry), closed = dateOnly(c.closed_on), next = stamp(c.next_session_at), started = dateOnly(c.started_on);
    var state = closed ? { label: 'ปิดคอร์สแล้ว', kind: 'off' }
      : expiry && expiry.key < today ? { label: 'หมดอายุแล้ว', kind: 'off' }
      : hasCount && left === 0 ? { label: 'เรียนครบแล้ว', kind: 'done' }
      : { label: 'กำลังเรียน', kind: 'live' };
    var lang = LANGS[str(c.teach_lang, 20).toLowerCase()] || '';
    return {
      title: title, teacher: str(c.teacher_name, 80), lang: lang,
      hasCount: hasCount, total: hasCount ? total : 0, done: hasCount ? done : 0, left: hasCount ? left : 0, pct: hasCount ? Math.round(done / total * 100) : 0,
      started: started ? started.text : '',
      expiry: !closed && expiry ? expiry.text : '', closed: closed ? closed.text : '',
      next: state.kind === 'live' && next && next.ms > now ? next.text : '',   // only a future appointment of a course that is still running
      state: state,
      paid: c.paid_in_full === true ? { label: 'จ่ายครบแล้ว', kind: 'paid' } : c.paid_in_full === false ? { label: 'ยังจ่ายไม่ครบ', kind: 'due' } : null
    };
  }

  // the answer of member-auth `my_courses` → { ok, cards } · a malformed answer is not "no courses": ok=false (the page says it could not load)
  function view(x, now) {
    var j = x && x.status === 200 && x.j && x.j.ok === true ? x.j : null;
    var list = j ? (Array.isArray(j.courses) ? j.courses : null) : null;
    if (!list) return { ok: false, cards: [] };
    var cards = [];
    for (var i = 0; i < list.length && cards.length < MAX_CARDS; i++) { var c = card(list[i], now); if (c) cards.push(c); }
    return { ok: true, cards: cards };
  }

  var api = { view: view };
  root.DJLCourses = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
