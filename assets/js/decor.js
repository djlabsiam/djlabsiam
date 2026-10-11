/* Gear decor motion: scroll parallax + pointer tilt + drop-in. Respects prefers-reduced-motion. */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gears = [].slice.call(document.querySelectorAll('[data-gear]'));
  if (!gears.length) return;
  var mx = 0, my = 0, tx = 0, ty = 0, busy = false;

  function scrollUpdate() {
    busy = false;
    var vh = innerHeight;
    gears.forEach(function (g) {
      var r = g.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var c = (r.top + r.height / 2 - vh / 2);
      var sp = parseFloat(g.dataset.speed || '0.1');
      g.style.setProperty('--sy', (-c * sp).toFixed(1) + 'px');
      g.style.setProperty('--sr', (c * sp * 0.02).toFixed(2) + 'deg');
    });
  }
  function reqScroll() { if (!busy) { busy = true; requestAnimationFrame(scrollUpdate); } }

  // pointer tilt, eased
  function loop() {
    mx += (tx - mx) * 0.08; my += (ty - my) * 0.08;
    gears.forEach(function (g) {
      var d = parseFloat(g.dataset.depth || '0');
      if (!d) return;
      g.style.setProperty('--mx', (mx * d).toFixed(1) + 'px');
      g.style.setProperty('--my', (my * d).toFixed(1) + 'px');
    });
    requestAnimationFrame(loop);
  }

  // drop-in when first visible
  var seen = gears.filter(function (g) { return g.dataset.drop !== undefined; });
  function dropCheck() {
    seen = seen.filter(function (g) {
      var r = g.parentElement.getBoundingClientRect();
      if (r.top < innerHeight * 0.95 && r.bottom > 0) { g.classList.add('in'); return false; }
      return true;
    });
  }

  if (reduce) {
    gears.forEach(function (g) { g.classList.add('in'); });
    return;
  }
  addEventListener('scroll', function () { reqScroll(); dropCheck(); }, { passive: true });
  addEventListener('resize', reqScroll);
  addEventListener('pointermove', function (e) {
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  scrollUpdate(); dropCheck(); requestAnimationFrame(loop);
})();
