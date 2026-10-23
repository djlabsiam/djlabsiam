/* Slide pop-up for news / running promotions / latest Facebook content (shown once per session, on the first page opened).
   Slides = promotions running today (database function bot_promotions, public, no cost data) + the items an admin lists in /data/popup.json.
   Everything is written with textContent / setAttribute; links must be a site path or https on an allowed host; images only from /assets/img/popup/.
   Any failure (offline, bad file, empty list) = nothing is shown and the page is untouched. */
(function () {
  var S = document.currentScript;
  if (!S || !window.fetch) return;
  var RPC = 'https://vvtefgjseihadsmvuntd.supabase.co/rest/v1/rpc/bot_promotions',   // same public address + anon key as book/index.html (tools/check_pages.py compares them)
    KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dGVmZ2pzZWloYWRzbXZ1bnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTM5ODUsImV4cCI6MjEwMTI2OTk4NX0.tgRD7_5hZuUG4zvajnIbe-tuNPNqELURSHIYtnh-MyM';
  var HOSTS = ['facebook.com', 'www.facebook.com', 'fb.watch', 'instagram.com', 'www.instagram.com', 'youtube.com', 'www.youtube.com', 'youtu.be',
    'tiktok.com', 'www.tiktok.com', 'line.me', 'lin.ee', 'djlabsiam.com', 'www.djlabsiam.com', 'console.djlabsiam.com'];
  var TAGS = { promo: 'โปรโมชั่น', news: 'ข่าวสาร', facebook: 'ล่าสุดบน Facebook', update: 'อัปเดต' };
  var MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var KEYSTORE = 'djl-popup', SESSION = 'djl-popup-seen';
  var today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);   // Thai date

  function str(v, max) { return typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : ''; }
  function safeLink(u) {
    if (typeof u !== 'string' || u.length > 300) return '';
    if (u.charAt(0) === '/') return u.charAt(1) === '/' || u.indexOf('\\') >= 0 ? '' : u;
    var a; try { a = new URL(u); } catch (e) { return ''; }
    return a.protocol === 'https:' && !a.username && !a.password && !a.port && HOSTS.indexOf(a.hostname) >= 0 ? a.href : '';
  }
  function thDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? (+m[3]) + ' ' + MONTH[+m[2] - 1] + ' ' + (+m[1] + 543) : ''; }
  function baht(n) { return '฿' + Number(n).toLocaleString('en-US'); }
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function seen() { try { return sessionStorage.getItem(SESSION) === '1'; } catch (e) { return false; } }
  function markSeen() { try { sessionStorage.setItem(SESSION, '1'); } catch (e) { } }
  function timed(url, opt) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 8000); opt.signal = c.signal;
    return fetch(url, opt).then(function (r) { clearTimeout(t); if (!r.ok) throw 0; return r.json(); });
  }

  function fromFile(cfg) {   // admin items
    if (!cfg || cfg.enabled === false || !Array.isArray(cfg.items)) return [];
    var out = [];
    cfg.items.forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      var title = str(it.title, 90); if (!title) return;
      if (typeof it.from === 'string' && it.from > today) return;
      if (typeof it.until === 'string' && it.until < today) return;
      var type = TAGS[it.type] ? it.type : 'news', link = safeLink(it.link);
      var img = typeof it.img === 'string' && /^[A-Za-z0-9_-]{1,60}\.(webp|jpg|png)$/.test(it.img) ? '/assets/img/popup/' + it.img : '';
      out.push({ tag: TAGS[type], title: title, text: str(it.text, 220), lines: [], img: img, alt: str(it.alt, 120), link: link, cta: str(it.cta, 30) || (type === 'facebook' ? 'ดูโพสต์บน Facebook' : 'ดูเพิ่มเติม') });
    });
    return out;
  }
  function fromPromos(list) {   // running promotions from the database
    if (!Array.isArray(list)) return [];
    var out = [];
    list.slice(0, 3).forEach(function (p) {
      var name = p && str(p.name, 90); if (!name) return;
      var lines = [];
      (Array.isArray(p.products) ? p.products : []).slice(0, 3).forEach(function (d) {
        var m = d && str(d.model, 60); if (!m) return;
        if (typeof d.promoPrice === 'number' && d.promoPrice > 0) lines.push(m + ' ' + baht(d.promoPrice) + (typeof d.regularPrice === 'number' && d.regularPrice > d.promoPrice ? ' (ปกติ ' + baht(d.regularPrice) + ')' : ''));
        else if (d.gift && str(d.gift.item, 60)) lines.push(m + ' แถม ' + str(d.gift.item, 60));
        else lines.push(m);
      });
      var until = thDate(p.endDate);
      out.push({ tag: TAGS.promo, title: name, text: (until ? 'ถึง ' + until + ' · ' : '') + 'รายละเอียดและเงื่อนไขสอบถามทีมงาน', lines: lines, img: '', alt: '', link: '/shop/', cta: 'ดูสินค้าที่ร้าน' });
    });
    return out;
  }

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function build(slides) {
    var root = el('aside', 'dpop'), vp = el('div', 'dpop-vp'), ul = el('ul', 'dpop-t'), x = el('button', 'dpop-x', '×'), dots = [], idx = 0, stopped = false, timer = null;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'ข่าวสารและโปรโมชั่นจาก DJ LAB SIAM');
    x.type = 'button'; x.setAttribute('aria-label', 'ปิด');
    ul.tabIndex = 0; ul.setAttribute('aria-label', 'สไลด์ข่าวสาร ใช้ปุ่มลูกศรซ้ายขวาเพื่อเลื่อน');
    slides.forEach(function (s, i) {
      var li = el('li', 'dpop-s'); li.setAttribute('aria-label', (i + 1) + ' จาก ' + slides.length);
      if (s.img) { var im = document.createElement('img'); im.src = s.img; im.setAttribute('alt', s.alt || ''); im.loading = 'lazy'; im.decoding = 'async'; li.appendChild(im); }
      var b = el('div', 'dpop-b'); b.appendChild(el('span', 'dpop-tag', s.tag)); b.appendChild(el('h2', '', s.title));
      if (s.text) b.appendChild(el('p', '', s.text));
      if (s.lines.length) { var l = el('ul', 'dpop-l'); s.lines.forEach(function (t) { l.appendChild(el('li', '', t)); }); b.appendChild(l); }
      if (s.link) { var a = el('a', 'dpop-a', s.cta); a.href = s.link; if (s.link.charAt(0) !== '/') { a.target = '_blank'; a.rel = 'noopener noreferrer'; } b.appendChild(a); }
      li.appendChild(b); ul.appendChild(li);
    });
    vp.appendChild(ul); root.appendChild(x); root.appendChild(vp);
    function go(i, smooth) { idx = (i + slides.length) % slides.length; ul.scrollTo({ left: idx * ul.clientWidth, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' }); mark(); }
    function mark() { dots.forEach(function (d, i) { d.setAttribute('aria-current', i === idx ? 'true' : 'false'); }); }
    function stop() { stopped = true; clearInterval(timer); }
    if (slides.length > 1) {
      var nav = el('div', 'dpop-n'), p = el('button', 'dpop-ar', '‹'), n = el('button', 'dpop-ar', '›'), dl = el('div', 'dpop-d');
      p.type = 'button'; n.type = 'button'; p.setAttribute('aria-label', 'สไลด์ก่อนหน้า'); n.setAttribute('aria-label', 'สไลด์ถัดไป');
      slides.forEach(function (s, i) { var d = el('button', 'dpop-dot'); d.type = 'button'; d.setAttribute('aria-label', 'ไปสไลด์ที่ ' + (i + 1)); d.addEventListener('click', function () { stop(); go(i, true); }); dots.push(d); dl.appendChild(d); });
      p.addEventListener('click', function () { stop(); go(idx - 1, true); }); n.addEventListener('click', function () { stop(); go(idx + 1, true); });
      nav.appendChild(p); nav.appendChild(dl); nav.appendChild(n); root.appendChild(nav); mark();
      ul.addEventListener('scroll', function () { var i = Math.round(ul.scrollLeft / Math.max(1, ul.clientWidth)); if (i !== idx) { idx = i; mark(); } });
      ul.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go(idx + 1, true); } else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(idx - 1, true); } });
      root.addEventListener('pointerdown', stop); root.addEventListener('focusin', stop);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { if (!stopped && !root.matches(':hover')) go(idx + 1, true); }, 6000);
    }
    function close() { stop(); root.classList.remove('on'); put(KEYSTORE, { h: hash(slides), t: Date.now() }); setTimeout(function () { root.remove(); }, 400); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape' && root.contains(document.activeElement)) close(); }
    x.addEventListener('click', close); document.addEventListener('keydown', esc);
    return root;
  }
  function hash(slides) { var s = slides.map(function (z) { return z.title + '|' + z.link + '|' + z.text; }).join('~'), h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); }

  if (seen() || /^\/book\//.test(location.pathname)) return;
  var cfgP = timed('/data/popup.json', { cache: 'no-cache' }).catch(function () { return null; });
  var promoP = cfgP.then(function (cfg) {
    if (!RPC || (cfg && (cfg.autoPromotions === false || cfg.enabled === false))) return [];
    return timed(RPC, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' }).then(fromPromos).catch(function () { return []; });
  });
  Promise.all([cfgP, promoP]).then(function (r) {
    var slides = r[1].concat(fromFile(r[0])).slice(0, 8);
    if (!slides.length) return;
    var last = get(KEYSTORE), h = hash(slides);
    if (last && last.h === h && Date.now() - last.t < 86400000) return;   // closed in the last 24 h and nothing new
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = S.src.replace(/popup\.js(\?.*)?$/, '../css/popup.css$1');
    var shown = false, show = function () {
      if (shown) return; shown = true; markSeen();
      var root = build(slides); document.body.appendChild(root); requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('on'); }); });
    };
    css.addEventListener('load', function () { setTimeout(show, 1200); }); 
    document.head.appendChild(css);
  }).catch(function () { });
})();
