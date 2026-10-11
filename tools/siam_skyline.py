"""Mono-line Siam Square skyline for the footer band: shophouses on Soi 3, Lido Connect, BTS Siam, MBK Center.
Styling comes from the page CSS (.rack *: light stroke, dark fill; .rk-r red stroke; .rk-rf red fill)."""


def _windows(x0, y0, cols, rows, dx, dy, w, h):
    return "".join(f'<rect x="{x0 + c * dx}" y="{y0 + r * dy}" width="{w}" height="{h}" rx="1.5"/>' for r in range(rows) for c in range(cols))


def svg():
    o = ['<svg class="rack" viewBox="0 0 1200 176" fill="none" role="img" aria-label="ภาพเส้นสยามสแควร์ มี MBK ลิโด้ และ BTS สยาม" preserveAspectRatio="xMidYMax meet">']
    # ground
    o.append('<path class="rk-g" d="M0 168H1200"/>')
    # --- trees
    for x, r in ((22, 15), (262, 13), (1190, 11)):
        o.append(f'<path d="M{x} 168V{148 - r // 3}"/><circle cx="{x}" cy="{136 - r // 3}" r="{r}"/>')
    # --- BTS viaduct behind everything on the left (deck + piers)
    o.append('<rect x="0" y="118" width="1200" height="9" rx="2"/>')
    for x in (120, 520, 744, 842, 982, 1122):
        o.append(f'<rect x="{x}" y="127" width="13" height="41" rx="2"/>')
    # --- Siam Square shophouses (Soi 3)
    o.append('<rect x="44" y="72" width="62" height="96"/>' + _windows(54, 82, 2, 3, 24, 22, 14, 12) + '<rect x="46" y="142" width="58" height="14" rx="2"/>')
    o.append('<rect x="110" y="50" width="58" height="118"/>' + _windows(119, 60, 2, 4, 24, 22, 14, 12) + '<rect x="126" y="140" width="28" height="28" rx="2"/><path d="M126 148h28"/>')
    o.append('<rect x="172" y="84" width="66" height="84"/>' + _windows(182, 94, 2, 2, 28, 22, 16, 12) + '<rect x="176" y="140" width="58" height="14" rx="2"/>')
    # --- Lido Connect
    o.append('<rect x="276" y="62" width="226" height="106" rx="3"/>')
    o.append(_windows(290, 76, 5, 1, 26, 0, 16, 16))
    o.append('<rect x="420" y="74" width="68" height="22" rx="2" class="rk-rf"/><text class="rk-t" x="454" y="89" text-anchor="middle">DJ LAB</text>')
    o.append('<rect x="266" y="108" width="246" height="24" rx="7"/><path d="M276 120H502" stroke-dasharray="0.1 13" stroke-linecap="round" stroke-width="5"/>')
    o.append('<rect x="298" y="138" width="38" height="30" rx="2"/><rect x="344" y="138" width="38" height="30" rx="2"/><rect x="392" y="138" width="38" height="30" rx="2"/><rect x="440" y="138" width="38" height="30" rx="2"/>')
    o.append('<rect x="338" y="24" width="124" height="38" rx="3"/><text x="400" y="40" text-anchor="middle">LIDO</text><text class="rk-s" x="400" y="54" text-anchor="middle">CONNECT</text>')
    o.append('<path d="M356 62V50M444 62V50"/>')
    # --- distant towers behind the station (Rama I Rd.)
    o.append('<rect x="548" y="34" width="34" height="90"/><path d="M548 54h34M548 74h34M548 94h34"/>')
    o.append('<rect x="596" y="58" width="42" height="66"/><path d="M596 78h42M596 98h42"/>')
    o.append('<rect x="650" y="22" width="30" height="102"/><path d="M650 44h30M650 66h30M650 88h30M665 22V8"/>')
    o.append('<rect x="694" y="50" width="38" height="74"/><path d="M694 70h38M694 90h38"/>')
    # --- BTS Siam station: curved roof, platform box, train
    o.append('<path d="M514 100Q634 36 754 100"/><path d="M526 100Q634 52 742 100"/>')
    o.append('<rect x="524" y="100" width="212" height="18" rx="2"/>')
    o.append('<rect x="556" y="78" width="168" height="22" rx="9"/>' + _windows(572, 84, 8, 1, 20, 0, 12, 9) + '<path class="rk-r" d="M556 96H724"/>')
    o.append('<path d="M500 118L524 104M756 118L736 104"/>')
    # --- MBK Center
    o.append('<rect x="772" y="46" width="402" height="122" rx="3"/>')
    for y in (68, 90, 112, 134):
        o.append(f'<path d="M772 {y}H1174"/>')
    o.append("".join(f'<path d="M{x} 46V168"/>' for x in range(800, 1174, 28)))
    o.append('<rect x="880" y="16" width="178" height="30" rx="3"/><text x="969" y="38" text-anchor="middle" class="rk-m">MBK CENTER</text>')
    o.append('<path d="M1130 46V22M1122 28h16"/><circle class="rk-r" cx="1130" cy="20" r="3"/>')
    o.append('<rect x="860" y="146" width="140" height="22" rx="3"/>')
    # --- BTS deck + train in front of MBK
    o.append('<rect x="758" y="118" width="442" height="9" rx="2"/>')
    o.append('<rect x="790" y="94" width="196" height="24" rx="10"/>' + _windows(808, 101, 8, 1, 20, 0, 12, 10) + '<path class="rk-r" d="M790 112H986"/>')
    for x in (842, 982, 1122):
        o.append(f'<rect x="{x}" y="127" width="13" height="41" rx="2"/>')
    o.append('</svg>')
    return "".join(o)
