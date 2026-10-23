/* Full-page slide pop-up shown once per session, on the first page opened: the visitor must close it before the site behind it can be used.
   Slides = promotions running today (database function bot_promotions: name + end date only, nothing else is read) + the items an admin lists in /data/popup.json.
   Every promotion gets a picture from "promoImages" (by promotion id, else "default"). Everything is written with textContent / setAttribute;
   links must be a site path or https on an allowed host; images only from /assets/img/popup/. Any failure (offline, bad file, empty list) = nothing is shown. */
(function () {
  var S = document.currentScript;
  if (!S || !window.fetch) return;
  var RPC = 'https://vvtefgjseihadsmvuntd.supabase.co/rest/v1/rpc/bot_promotions',   // same public address + anon key as book/index.html (tools/check_pages.py compares them)
    KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dGVmZ2pzZWloYWRzbXZ1bnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2OTM5ODUsImV4cCI6MjEwMTI2OTk4NX0.tgRD7_5hZuUG4zvajnIbe-tuNPNqELURSHIYtnh-MyM';
  var HOSTS = ['facebook.com', 'www.facebook.com', 'fb.watch', 'instagram.com', 'www.instagram.com', 'youtube.com', 'www.youtube.com', 'youtu.be',
    'tiktok.com', 'www.tiktok.com', 'line.me', 'lin.ee', 'djlabsiam.com', 'www.djlabsiam.com', 'console.djlabsiam.com'];
  var TAGS = { promo: 'โปรโมชั่น', news: 'ข่าวสาร', facebook: 'ล่าสุดบน Facebook', update: 'อัปเดต' };
  var MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var SESSION = 'djl-popup-seen', IMGRE = /^[A-Za-z0-9_-]{1,60}\.(webp|jpg|png)$/;
  var today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);   // Thai date

  function str(v, max) { return typeof v === 'string' && v.trim() && v.length <= max ? v.trim() : ''; }
  function safeLink(u) {
    if (typeof u !== 'string' || u.length > 300) return '';
    if (u.charAt(0) === '/') return u.charAt(1) === '/' || u.indexOf('\\') >= 0 ? '' : u;
    var a; try { a = new URL(u); } catch (e) { return ''; }
    return a.protocol === 'https:' && !a.username && !a.password && !a.port && HOSTS.indexOf(a.hostname) >= 0 ? a.href : '';
  }
  function pic(o) {   // {img, alt} from the admin file -> a safe path or nothing
    return o && typeof o.img === 'string' && IMGRE.test(o.img) ? { src: '/assets/img/popup/' + o.img, alt: str(o.alt, 160) } : null;
  }
  function thDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? (+m[3]) + ' ' + MONTH[+m[2] - 1] + ' ' + (+m[1] + 543) : ''; }
  function seen() { try { return sessionStorage.getItem(SESSION) === '1'; } catch (e) { return false; } }
  function markSeen() { try { sessionStorage.setItem(SESSION, '1'); } catch (e) { } }
  function timed(url, opt) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, 6000); opt.signal = c.signal;
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
      var type = TAGS[it.type] ? it.type : 'news';
      out.push({ tag: TAGS[type], title: title, text: str(it.text, 220), pic: pic(it), play: type === 'facebook', link: safeLink(it.link), cta: str(it.cta, 30) || (type === 'facebook' ? 'ดูโพสต์บน Facebook' : 'ดูเพิ่มเติม') });
    });
    return out;
  }
  function fromPromos(list, images) {   // running promotions from the database: name + end date only (nothing else of the promotion is read)
    if (!Array.isArray(list)) return [];
    images = images && typeof images === 'object' ? images : {};
    var out = [];
    list.slice(0, 3).forEach(function (p) {
      var name = p && str(p.name, 140); if (!name) return;
      var until = thDate(p.endDate);
      out.push({ tag: TAGS.promo, title: name, text: (until ? 'ถึง ' + until + ' · ' : '') + 'รายละเอียดและเงื่อนไขสอบถามทีมงาน',
        pic: pic(images[typeof p.id === 'string' ? p.id : '']) || pic(images['default']), play: false, link: '/shop/', cta: 'ดูสินค้าที่ร้าน' });
    });
    return out;
  }

  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function build(slides, onClose) {
    var root = el('div', 'dpop'), card = el('div', 'dpop-c'), ul = el('ul', 'dpop-t'), x = el('button', 'dpop-x'), go = el('button', 'dpop-go', 'เข้าสู่เว็บไซต์'), dots = [], idx = 0, stopped = false, timer = null;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'ข่าวสารและโปรโมชั่นจาก DJ LAB SIAM');
    x.type = 'button'; x.setAttribute('aria-label', 'ปิดและเข้าสู่เว็บไซต์'); x.appendChild(document.createTextNode('ปิด ')); x.appendChild(el('b', '', '×'));
    go.type = 'button';
    ul.tabIndex = 0; ul.setAttribute('aria-label', 'สไลด์ข่าวสาร ใช้ปุ่มลูกศรซ้ายขวาเพื่อเลื่อน');
    slides.forEach(function (s, i) {
      var li = el('li', 'dpop-s'), m = el('figure', 'dpop-m'); li.setAttribute('aria-label', (i + 1) + ' จาก ' + slides.length);
      if (s.pic) { var im = document.createElement('img'); im.src = s.pic.src; im.setAttribute('alt', s.pic.alt); im.decoding = 'async'; if (i) im.loading = 'lazy'; m.appendChild(im); }
      else {
        var ph = el('div', 'dpop-ph'); ph.setAttribute('aria-hidden', 'true');
        if (s.play) { var NS = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NS, 'svg'), tri = document.createElementNS(NS, 'path'); sv.setAttribute('viewBox', '0 0 24 24'); tri.setAttribute('d', 'M8 5v14l11-7z'); tri.setAttribute('fill', 'currentColor'); sv.appendChild(tri); ph.appendChild(sv); }
        m.appendChild(ph);
      }
      var b = el('div', 'dpop-b'); b.appendChild(el('span', 'dpop-tag', s.tag)); b.appendChild(el('h2', '', s.title));
      if (s.text) b.appendChild(el('p', '', s.text));
      if (s.link) { var a = el('a', 'dpop-a', s.cta); a.href = s.link; if (s.link.charAt(0) !== '/') { a.target = '_blank'; a.rel = 'noopener noreferrer'; } b.appendChild(a); }
      li.appendChild(m); li.appendChild(b); ul.appendChild(li);
    });
    card.appendChild(x); card.appendChild(ul);
    var nav = el('div', 'dpop-n'), left = el('div', 'dpop-nav-l');
    function go_(i, smooth) { idx = (i + slides.length) % slides.length; ul.scrollTo({ left: idx * ul.clientWidth, behavior: smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto' }); mark(); }
    function mark() { dots.forEach(function (d, i) { d.setAttribute('aria-current', i === idx ? 'true' : 'false'); }); }
    function stop() { stopped = true; clearInterval(timer); }
    if (slides.length > 1) {
      var p = el('button', 'dpop-ar', '‹'), n = el('button', 'dpop-ar', '›'), dl = el('div', 'dpop-d');
      p.type = 'button'; n.type = 'button'; p.setAttribute('aria-label', 'สไลด์ก่อนหน้า'); n.setAttribute('aria-label', 'สไลด์ถัดไป');
      slides.forEach(function (s, i) { var d = el('button', 'dpop-dot'); d.type = 'button'; d.setAttribute('aria-label', 'ไปสไลด์ที่ ' + (i + 1)); d.addEventListener('click', function () { stop(); go_(i, true); }); dots.push(d); dl.appendChild(d); });
      p.addEventListener('click', function () { stop(); go_(idx - 1, true); }); n.addEventListener('click', function () { stop(); go_(idx + 1, true); });
      left.appendChild(p); left.appendChild(dl); left.appendChild(n); mark();
      ul.addEventListener('scroll', function () { var i = Math.round(ul.scrollLeft / Math.max(1, ul.clientWidth)); if (i !== idx) { idx = i; mark(); } });
      ul.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go_(idx + 1, true); } else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go_(idx - 1, true); } });
      root.addEventListener('pointerdown', stop); root.addEventListener('focusin', stop);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(function () { if (!stopped) go_(idx + 1, true); }, 8000);
    }
    nav.appendChild(left); nav.appendChild(go); card.appendChild(nav); root.appendChild(card);
    function keys(e) {   // Esc closes; Tab stays inside the pop-up
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = [].slice.call(root.querySelectorAll('button,a[href],ul[tabindex]')).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function close() { stop(); document.removeEventListener('keydown', keys); root.classList.remove('on'); onClose(); setTimeout(function () { root.remove(); }, 350); }
    x.addEventListener('click', close); go.addEventListener('click', close); document.addEventListener('keydown', keys);
    return { root: root, focus: function () { go.focus(); } };
  }

  if (seen() || /^\/book\//.test(location.pathname)) return;
  var cfgP = timed('/data/popup.json', { cache: 'no-cache' }).catch(function () { return null; });
  var promoP = cfgP.then(function (cfg) {
    if (!RPC || (cfg && (cfg.autoPromotions === false || cfg.enabled === false))) return [];
    return timed(RPC, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: '{}' })
      .then(function (l) { return fromPromos(l, cfg && cfg.promoImages); }).catch(function () { return []; });
  });
  Promise.all([cfgP, promoP]).then(function (r) {
    var slides = r[1].concat(fromFile(r[0])).slice(0, 8);
    if (!slides.length) return;
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = S.src.replace(/popup\.js(\?.*)?$/, '../css/popup.css$1');
    css.addEventListener('load', function () {
      if (document.querySelector('.dpop')) return;
      markSeen();
      var before = document.activeElement, held = [], de = document.documentElement, prev = de.style.overflow;
      var ui = build(slides, function () {   // give the page back
        held.forEach(function (n) { n.inert = false; }); de.style.overflow = prev;
        if (before && before.focus && document.contains(before)) try { before.focus(); } catch (e) { }
      });
      [].slice.call(document.body.children).forEach(function (n) { if (n.tagName !== 'SCRIPT' && n.tagName !== 'STYLE' && n.tagName !== 'LINK' && !n.inert) { n.inert = true; held.push(n); } });
      de.style.overflow = 'hidden';
      document.body.appendChild(ui.root);
      requestAnimationFrame(function () { requestAnimationFrame(function () { ui.root.classList.add('on'); ui.focus(); }); });
    });
    document.head.appendChild(css);
  }).catch(function () { });
})();
