/* RIM: ชื่อเพลงบนชาร์ต = ชื่อ official (เจ้าของ 20 พ.ย. "ใช้ A + C")
   A: อ่าน tag ในไฟล์ → "ศิลปิน – ชื่อเพลง" (มีแต่ชื่อเพลง = ชื่อเพลง) · C: ไม่มี tag → ล้างชื่อไฟล์ (เลขแทร็ก · _ · วงเล็บ Official Video · ชื่อเว็บโหลด · รหัสคลิป)
   อ่านจากไบต์ที่โหลดมาถอดเสียงอยู่แล้ว (ไม่อ่านไฟล์ซ้ำ · ไม่ส่งไปไหน) · tag เสีย/ว่าง/แปลก = ข้ามไปใช้ชื่อไฟล์ ไม่โยน error ใส่เกม
   รองรับ: mp3 (ID3v2.2–2.4 · ID3v1) · m4a/mp4 (©nam ©ART) · flac (Vorbis comment) · ogg/opus (Vorbis comment) · wav (id3 chunk · LIST INFO) · aiff (ID3 chunk · NAME/AUTH)
   RimTags.pick(Uint8Array, ชื่อไฟล์) → { name, src: 'tag' | 'file' } · ชื่อยังต้องผ่าน cleanTitle (board.js) + rim_title_clean ของฐานเหมือนเดิม */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RimTags = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var MAX = 200;   // ตัวอักษรต่อช่อง (ฐานตัดเหลือ 40 อยู่แล้ว · กันข้อความยาวผิดปกติ)

  // ── อ่านไบต์ (เกินขอบ = throw → ตัวอ่านนั้นคืน null) ──
  function chk(u, o, n) { if (!(o >= 0 && n >= 0 && o + n <= u.length)) throw new RangeError('tag'); }
  function be(u, o, n) { chk(u, o, n); for (var v = 0, i = 0; i < n; i++) v = v * 256 + u[o + i]; return v; }
  function le(u, o, n) { chk(u, o, n); for (var v = 0, i = n - 1; i >= 0; i--) v = v * 256 + u[o + i]; return v; }
  function ss(u, o) { chk(u, o, 4); return (u[o] & 127) * 2097152 + (u[o + 1] & 127) * 16384 + (u[o + 2] & 127) * 128 + (u[o + 3] & 127); }   // syncsafe
  function str(u, o, n) { chk(u, o, n); return String.fromCharCode.apply(null, u.subarray(o, o + n)); }
  function cut(u, o, n) { chk(u, o, n); return u.subarray(o, o + n); }
  function upto0(b) { var z = b.indexOf(0); return z < 0 ? b : b.subarray(0, z); }
  function dec(b, enc) {
    if (enc === 'latin1') {   // ช่อง "ISO-8859-1" ของ ID3/RIFF: หลายโปรแกรมเขียน UTF-8 หรือ TIS-620 (ไทย) ลงมา
      try { return new TextDecoder('utf-8', { fatal: true }).decode(b); } catch (e) { /* ไม่ใช่ UTF-8 */ }
      var hi = 0, az = 0;
      for (var i = 0; i < b.length; i++) { if (b[i] >= 0xa1) hi++; else if ((b[i] | 32) >= 97 && (b[i] | 32) <= 122) az++; }
      enc = hi > az ? 'windows-874' : 'windows-1252';   // ตัวอักษรสูงมากกว่าอังกฤษ = น่าจะไทย ("Beyoncé" ยังเป็น Latin)
    }
    return new TextDecoder(enc).decode(b);
  }

  // ── ID3v2 (o = ตำแหน่ง "ID3") → { title, artist, band } ──
  function unsync(b) { var o = [], i; for (i = 0; i < b.length; i++) { o.push(b[i]); if (b[i] === 255 && b[i + 1] === 0) i++; } return Uint8Array.from(o); }
  function id3text(d) {
    var e = d[0], b = d.subarray(1), w = e === 1 || e === 2, z = 0;
    while (z < b.length && (w ? b[z] || b[z + 1] : b[z])) z += w ? 2 : 1;   // ค่าแรก (v2.4 คั่นหลายค่าด้วย 0)
    b = b.subarray(0, z);
    if (e === 1) return dec(b, b[0] === 0xfe && b[1] === 0xff ? 'utf-16be' : 'utf-16le');   // TextDecoder ตัด BOM เอง
    return dec(b, e === 2 ? 'utf-16be' : e === 3 ? 'utf-8' : 'latin1');
  }
  var ID3KEY = { TIT2: 'title', TT2: 'title', TPE1: 'artist', TP1: 'artist', TPE2: 'band', TP2: 'band' };
  function id3(u, o) {
    if (str(u, o, 3) !== 'ID3') return null;
    var v = u[o + 3], fl = u[o + 5];
    if (v < 2 || v > 4) return null;
    var b = u.subarray(o + 10, Math.min(o + 10 + ss(u, o + 6), u.length)), p = 0, out = {};   // ขนาดเกินไฟล์ (tag เสีย) = อ่านเท่าที่มี
    if (fl & 128 && v < 4) b = unsync(b);
    if (fl & 64 && v > 2) p = v === 3 ? 4 + be(b, 0, 4) : ss(b, 0);   // extended header
    var idn = v === 2 ? 3 : 4, hn = v === 2 ? 6 : 10;
    while (p + hn <= b.length) {
      var id = str(b, p, idn);
      if (!/^[A-Z0-9]{3}[A-Z0-9\0]?$/.test(id)) break;   // padding / ขยะ
      id = id.replace(/\0$/, '');   // เฟรมแบบ v2.2 ปนใน v2.3 ("TT2" + 0 · Serato/iTunes บางรุ่น) — ข้ามได้ ไม่หยุดอ่าน
      var n = v === 2 ? be(b, p + 3, 3) : v === 4 ? ss(b, p + 4) : be(b, p + 4, 4), f2 = v === 2 ? 0 : b[p + 9], q = p + hn;
      p = q + n;
      if (p > b.length) break;
      var key = ID3KEY[id];
      if (!key || out[key] || n < 2) continue;
      var d = b.subarray(q, p);
      if (v === 4) { if (f2 & 0x4c) continue; if (f2 & 2) d = unsync(d); if (f2 & 1) d = d.subarray(4); }   // group/บีบอัด/เข้ารหัส = ข้าม
      else if (v === 3 && f2 & 0xe0) continue;
      out[key] = id3text(d);
    }
    return out;
  }
  function id3v1(u) {
    var o = u.length - 128;
    if (o < 0 || str(u, o, 3) !== 'TAG') return null;
    return { title: dec(upto0(cut(u, o + 3, 30)), 'latin1'), artist: dec(upto0(cut(u, o + 33, 30)), 'latin1') };
  }

  // ── MP4/M4A: moov › udta › meta › ilst › ©nam/©ART/aART › data ──
  function box(u, s, e, name) {
    while (s + 8 <= e) {
      var n = be(u, s, 4), h = 8;
      if (n === 1) { n = be(u, s + 8, 8); h = 16; } else if (n === 0) n = e - s;
      if (n < h) return null;
      if (str(u, s + 4, 4) === name) return [s + h, Math.min(s + n, e)];
      s += n;
    }
    return null;
  }
  function mp4(u) {
    var m = box(u, 0, u.length, 'moov'), d = m && box(u, m[0], m[1], 'udta');
    d = d && box(u, d[0], d[1], 'meta');
    var l = d && box(u, d[0] + 4, d[1], 'ilst');
    if (!l) return null;
    var get = function (k) {
      var a = box(u, l[0], l[1], k), v = a && box(u, a[0], a[1], 'data');
      if (!v || v[1] - v[0] < 8) return '';
      var t = be(u, v[0], 4) & 0xffffff, b = u.subarray(v[0] + 8, v[1]);
      return t === 1 ? dec(b, 'utf-8') : t === 2 ? dec(b, 'utf-16be') : '';
    };
    var C = String.fromCharCode(0xa9);
    return { title: get(C + 'nam'), artist: get(C + 'ART'), band: get('aART') };
  }

  // ── Vorbis comment (FLAC block 4 · ogg vorbis/opus แพ็กเก็ตที่ 2) — little-endian · "KEY=ค่า" ──
  var VKEY = { TITLE: 'title', ARTIST: 'artist', ALBUMARTIST: 'band' };
  function vorbis(u, p, e) {
    p += 4 + le(u, p, 4);   // vendor
    var c = le(u, p, 4), out = {};
    p += 4;
    for (var i = 0; i < c && p + 4 <= e; i++) {
      var n = le(u, p, 4), q = p + 4, z = q;
      chk(u, q, n);
      while (z < q + n && z - q < 64 && u[z] !== 61) z++;   // '=' (ชื่อช่องสั้นเสมอ · ไม่ถอดรูปปกฝังใน tag)
      var key = VKEY[str(u, q, z - q).toUpperCase()];
      if (key && !out[key]) out[key] = dec(u.subarray(z + 1, q + n), 'utf-8');
      p = q + n;
    }
    return out;
  }
  function flac(u, o) {
    for (var p = o + 4, k = 0; k < 128; k++) {
      var h = be(u, p, 1), n = be(u, p + 1, 3);
      if ((h & 127) === 4) return vorbis(u, p + 4, p + 4 + n);
      if (h & 128) break;
      p += 4 + n;
    }
    return null;
  }
  function ogg(u) {
    var p = 0, pk = [], cur = [];
    for (var g = 0; g < 1000 && pk.length < 2; g++) {
      if (str(u, p, 4) !== 'OggS') return null;
      var ns = be(u, p + 26, 1), q = p + 27 + ns;
      for (var i = 0; i < ns; i++) {
        var l = be(u, p + 27 + i, 1);
        if (pk.length < 2) { cur.push(cut(u, q, l)); if (l < 255) { pk.push(cat(cur)); cur = []; } }
        q += l;
      }
      p = q;
    }
    var c = pk[1];
    if (c && c.length > 8 && c[0] === 3 && str(c, 1, 6) === 'vorbis') return vorbis(c, 7, c.length);
    if (c && c.length > 8 && str(c, 0, 8) === 'OpusTags') return vorbis(c, 8, c.length);
    return null;
  }
  function cat(a) { var n = 0, o, i; a.forEach(function (x) { n += x.length; }); o = new Uint8Array(n); n = 0; for (i = 0; i < a.length; i++) { o.set(a[i], n); n += a[i].length; } return o; }

  // ── WAV (RIFF little-endian) / AIFF (FORM big-endian): chunk id3 ก่อน · ไม่มีชื่อ = LIST INFO (INAM/IART) / NAME/AUTH ──
  function chunks(u, rd, onChunk) {
    for (var p = 12; p + 8 <= u.length;) {
      var n = rd(u, p + 4, 4);
      onChunk(str(u, p, 4), p + 8, Math.min(p + 8 + n, u.length));
      p += 8 + n + (n & 1);
    }
  }
  function riff(u) {
    var t = null, inf = {};
    chunks(u, le, function (id, s, e) {
      if ((id === 'id3 ' || id === 'ID3 ') && !t) t = id3(u, s);
      if (id === 'LIST' && str(u, s, 4) === 'INFO') {
        for (var p = s + 4; p + 8 <= e;) {
          var k = str(u, p, 4), n = le(u, p + 4, 4), key = { INAM: 'title', IART: 'artist' }[k];
          if (key && !inf[key]) inf[key] = dec(upto0(cut(u, p + 8, Math.min(n, e - p - 8))), 'latin1');
          p += 8 + n + (n & 1);
        }
      }
    });
    return t && t.title ? t : inf;
  }
  function aiff(u) {
    var t = null, o = {};
    chunks(u, be, function (id, s, e) {
      if (id === 'ID3 ' && !t) t = id3(u, s);
      if (id === 'NAME' || id === 'AUTH') o[id === 'NAME' ? 'title' : 'artist'] = dec(upto0(u.subarray(s, e)), 'latin1');
    });
    return t && t.title ? t : o;
  }

  // ── ตัวรวม: ดูหัวไฟล์ว่าเป็นอะไร (ไม่เชื่อนามสกุล) · ตัวอ่านแต่ละแบบล้ม = ข้าม ──
  function safe(f) { try { return f() || null; } catch (e) { return null; } }
  function read(u) {
    if (!u || u.length < 12) return null;
    var h = String.fromCharCode(u[0], u[1], u[2], u[3]), t = null;
    if (h.slice(0, 3) === 'ID3') {
      t = safe(function () { return id3(u, 0); });
      var e = safe(function () { return 10 + ss(u, 6) + (u[5] & 16 ? 10 : 0); });   // FLAC บางไฟล์มี ID3v2 นำหน้า
      if (e && !(t && t.title) && u[e] === 0x66 && safe(function () { return str(u, e, 4) === 'fLaC'; })) t = safe(function () { return flac(u, e); });
    } else if (h === 'fLaC') t = safe(function () { return flac(u, 0); });
    else if (h === 'OggS') t = safe(function () { return ogg(u); });
    else if (h === 'RIFF' && String.fromCharCode(u[8], u[9], u[10], u[11]) === 'WAVE') t = safe(function () { return riff(u); });
    else if (h === 'FORM') t = safe(function () { return aiff(u); });
    else if (String.fromCharCode(u[4], u[5], u[6], u[7]) === 'ftyp') t = safe(function () { return mp4(u); });
    if (!(t && t.title)) {   // mp3 ที่มีแต่ ID3v1 ท้ายไฟล์
      var v1 = safe(function () { return id3v1(u); });
      if (v1 && v1.title) t = v1;
    }
    return t;
  }

  // ── ล้างข้อความ (ใช้ทั้งค่าจาก tag และชื่อไฟล์) ──
  // ชื่อเว็บลบเฉพาะตำแหน่งที่เป็นป้ายโหลดแน่ๆ (ขึ้นต้น www./http · "เว็บ.com - " นำหน้า · " - เว็บ.com" ท้าย · ในวงเล็บ)
  //   ไม่ลบ ".com" กลางชื่อ — เพลงจริง "Spitkicker.com/Say R." (De La Soul) มีอยู่
  var TLD = /\.(?:com|net|org|info|cc|to|io|me|app|biz|xyz|top|ru)\b/i;
  // วงเล็บที่เป็นแค่ป้ายของคลิป/ไฟล์โหลด (ไม่ใช่ชื่อเวอร์ชัน: "(Extended Mix)" "(Radio Edit)" "(feat. …)" "(Video Edit)" อยู่ต่อ)
  var LABEL = /^(?:official|music|lyrics?|video|audio|mv|m\/v|clip|visuali[sz]er|hq|hd|4k|full\s*hd|high\s*quality|free\s*download|download|เนื้อเพลง|\d{2,3}\s*kbps|\s|-)+$/i;
  function junk(v) {
    v = v.replace(/\[([A-Za-z0-9_-]{11})\]/g, function (m, id) { return /[0-9_]|[a-z][A-Z]/.test(id) ? ' ' : m; });   // [รหัสคลิป] ของ yt-dlp ("[Intro-Clean]" อยู่ต่อ)
    v = v.replace(/[[(【]([^[\]()【】]*)[\])】]/g, function (m, x) { return LABEL.test(x) || TLD.test(x) || /www\.|https?:/i.test(x) || !/[A-Za-z0-9ก-๙]/.test(x) ? ' ' : m; });
    v = v.replace(/(?:https?:\/\/|www\.)[^\s[\]()【】]+/gi, ' ').replace(/\b\d{2,3}\s?kbps\b/gi, ' ');
    v = v.replace(/^\s*[a-z0-9][a-z0-9.-]*\.[a-z]{2,4}\s+[-–—|]\s+/i, function (m) { return TLD.test(m) ? '' : m; });   // "y2mate.com - …"
    v = v.replace(/\s+[-–—|]\s+[a-z0-9][a-z0-9.-]*\.[a-z]{2,4}\s*$/i, function (m) { return TLD.test(m) ? '' : m; });   // "… - mp3juices.cc"
    v = v.replace(/\s+/g, ' ').replace(/(\s[-–—|])(?:\s+[-–—|])+(?=\s|$)/g, '$1');
    return v.replace(/^[\s\-–—|:~.]+|[\s\-–—|:~]+$/g, '');
  }
  function tidy(s) {
    var v = Array.from(String(s || '')).filter(function (c) { var k = c.codePointAt(0); return k >= 32 && !(k >= 127 && k < 160) && k !== 0xfffd; }).join('');
    v = Array.from(junk(v)).slice(0, MAX).join('').trim();
    return /[^\s\-–—|:~.]/.test(v) ? v : '';   // เหลือแต่ช่องว่าง/ขีด = ไม่มีชื่อ (ชื่อภาษาอื่น เช่น ญี่ปุ่น ก็นับ)
  }
  // เลขแทร็กนำหน้า (ชื่อไฟล์ และชื่อเพลงใน tag ที่ติดเลขมา) ตัดเฉพาะแบบที่ไม่ใช่ชื่อศิลปิน: "06 …" (มี 0 นำ) · "1-06 …" · "12. …" · "12 - …"
  //   ไม่ตัด "12 Sucker MC's" / "50 Cent - …" / "2Pac - …" (แยกจากชื่อศิลปินที่ขึ้นต้นด้วยเลขไม่ได้ — ไฟล์จากอัลบั้มมักมี tag อยู่แล้ว)
  function track(v) { return String(v || '').replace(/^\s*(?:(?:\d-)?0\d{1,2}(?=[\s.)-])[\s.)-]*|\d{1,2}(?:\s*[.)]|\s+-)\s+|\d-\d{2}\s+)/, ''); }
  // C: ชื่อไฟล์ → ชื่อเพลง (ล้างแล้วไม่เหลืออะไร = ชื่อไฟล์เดิม ให้ cleanTitle จัดการต่อ)
  function fromFile(name) {
    var raw = String(name || ''), v = raw.replace(/\.(mp3|wav|wave|flac|m4a|aac|ogg|oga|opus|aif|aiff|wma|webm|mp4)$/i, '').replace(/_/g, ' ');
    return tidy(track(v)) || raw;
  }

  var NO_TITLE = /^(?:unknown|untitled|no title|track\s*\d*|audio\s*track\s*\d*)$/i, NO_ARTIST = /^(?:unknown|unknown artist|<unknown>|various|various artists|va|artist|no artist)$/i;
  function pick(u, fileName) { return fromTags(read(u) || {}, fileName); }
  function fromTags(t, fileName) {
    var title = tidy(track(t.title)), artist = tidy(t.artist) || tidy(t.band);
    if (NO_TITLE.test(title)) title = '';
    if (NO_ARTIST.test(artist)) artist = '';
    if (!title) return { name: fromFile(fileName), src: 'file' };
    // ชื่อเพลงใน tag มีชื่อศิลปินนำอยู่แล้ว ("Jamiroquai - High Times") = ไม่ใส่ซ้ำ
    var lead = artist && title.slice(0, artist.length).toLowerCase() === artist.toLowerCase() && /^\s*[-–—:|]/.test(title.slice(artist.length));
    return { name: artist && !lead ? artist + ' – ' + title : title, src: 'tag' };
  }

  return { pick: pick, read: read, fromTags: fromTags, fromFile: fromFile, tidy: tidy };
});
