"""Interactive CDJ-3000X demo for the home page (imported by build_pages.py).

Everything is local: one device photo (assets/img/cdj-full.webp), five original synthesised
loops (assets/audio/demo-*.mp3, made by tools/gen_demo_tracks.py) and Web Audio. No third-party service.
"""
import html as _h

# device crop origin / size inside the source photo (px) — see tools/make_cdj_demo_image.py
OX, OY, DW, DH = 304, 240, 800, 1139

TRACKS = [  # id, name shown on the deck, bpm, key, file
    ("house", "House", 124, "Am"),
    ("hiphop", "Hip-Hop", 92, "Am"),
    ("techno", "Techno", 132, "Am"),
    ("dnb", "Drum & Bass", 174, "Am"),
    ("funk", "Disco / Funk", 112, "Am"),
]

# id, aria-label, centre x, centre y (source px), width, height, round
HOTSPOTS = [
    ("browse", "ปุ่ม Browse — หมุนเลื่อนเลือกเพลง กดเพื่อโหลด", 1028, 533, 74, 74, 1),
    ("back", "BACK", 1008, 463, 46, 32, 0),
    ("play", "PLAY / PAUSE", 373, 1308, 78, 78, 1),
    ("cue", "CUE", 373, 1202, 78, 78, 1),
    ("in", "IN / CUE (เริ่มลูป)", 350, 775, 42, 42, 1),
    ("out", "OUT (จบลูป)", 408, 775, 42, 42, 1),
    ("reloop", "RELOOP / EXIT", 477, 775, 42, 42, 1),
    ("loop4", "BEAT LOOP 4", 348, 835, 40, 40, 1),
    ("loop8", "BEAT LOOP 8", 407, 835, 40, 40, 1),
    ("bjb", "BEAT JUMP ย้อน", 350, 889, 52, 36, 0),
    ("bjf", "BEAT JUMP ไปหน้า", 408, 889, 52, 36, 0),
    ("tprev", "TRACK SEARCH เพลงก่อนหน้า", 348, 1052, 48, 48, 1),
    ("tnext", "TRACK SEARCH เพลงถัดไป", 397, 1052, 48, 48, 1),
    ("trst", "TEMPO RESET", 967, 1184, 36, 36, 1),
    ("sync", "BEAT SYNC", 1012, 841, 46, 38, 0),
    ("vinyl", "VINYL / CDJ", 1012, 773, 52, 38, 0),
    ("top-browse", "BROWSE", 574, 293, 66, 24, 0),
] + [("hc%d" % i, "HOT CUE " + "ABCDEFGH"[i], x, 718, 52, 32, 0)
     for i, x in enumerate((465, 533, 601, 668, 738, 805, 874, 942))] + [
    # decorative controls: tap shows a hint toast
    ("x-source", "SOURCE", 487, 293, 66, 24, 0),
    ("x-tag", "TAG LIST", 660, 293, 66, 24, 0),
    ("x-pl", "PLAYLIST", 746, 293, 66, 24, 0),
    ("x-sr", "SEARCH", 833, 293, 66, 24, 0),
    ("x-menu", "MENU", 917, 293, 66, 24, 0),
    ("x-master", "MASTER", 1057, 841, 46, 38, 0),
    ("x-key", "KEY SYNC", 1035, 881, 52, 30, 0),
    ("x-jm", "JOG MODE", 1057, 773, 46, 38, 0),
    ("x-sl", "SEARCH ◄◄", 348, 1113, 48, 48, 1),
    ("x-sr2", "SEARCH ►►", 397, 1113, 48, 48, 1),
]

SCREEN = (440, 328, 525, 327)       # x, y, w, h of the display content (source px)
USB_SLOT = (350, 452)               # centre of the USB 1 slot
FADER = (1035, 1040, 1330)          # x, top y, bottom y of the tempo track
JOG = (703, 1058, 420)              # centre x, y, diameter


def _pct(x, y):
    return (x - OX) / DW * 100, (y - OY) / DH * 100


def _hs_html():
    out = []
    for k, label, cx, cy, w, h, rnd in HOTSPOTS:
        l, t = _pct(cx, cy)
        style = f"left:{l:.2f}%;top:{t:.2f}%;width:{w / DW * 100:.2f}%;height:{h / DH * 100:.2f}%"
        out.append(f'<button type="button" class="dkb{" r" if rnd else ""}" data-k="{k}" aria-label="{_h.escape(label)}" style="{style}"></button>')
    # tempo fader (track area) + jog
    fl, ft = _pct(FADER[0], (FADER[1] + FADER[2]) / 2)
    out.append(f'<div class="dkb fd" data-k="tempo" role="slider" tabindex="0" aria-label="TEMPO ปรับความเร็ว" aria-valuemin="-10" aria-valuemax="10" aria-valuenow="0" '
               f'style="left:{fl:.2f}%;top:{ft:.2f}%;width:{64 / DW * 100:.2f}%;height:{(FADER[2] - FADER[1]) / DH * 100:.2f}%"><i class="fcap" id="dm-cap"></i></div>')
    jl, jt = _pct(JOG[0], JOG[1])
    out.append(f'<div class="dkb jog" data-k="jog" role="application" aria-label="จอก Jog — ลากเพื่อสแครช/ดันจังหวะ" '
               f'style="left:{jl:.2f}%;top:{jt:.2f}%;width:{JOG[2] / DW * 100:.2f}%"><i id="dm-jog"></i></div>')
    return "".join(out)


def deck_html():
    sx, sy, sw, sh = SCREEN
    sl, st = _pct(sx, sy)
    ul, ut = _pct(*USB_SLOT)
    rows = "".join(
        f'<li data-i="{i}"><i>{i + 1:02d}</i><b>{_h.escape(n)}</b><small>{bpm} BPM · {k}</small><em>…</em></li>'
        for i, (_id, n, bpm, k) in enumerate(TRACKS))
    knob_l, knob_t = _pct(1028, 533)
    return (
        '<div class="dm-deck" id="dm-deck">'
        f'<img class="dm-img" src="/assets/img/cdj-full.webp" width="{DW}" height="{DH}" alt="Pioneer DJ CDJ-3000X มุมมองด้านบน ลองเล่นได้ในหน้านี้" decoding="async" fetchpriority="high">'
        f'<div class="dm-scr m-nomedia" id="dm-scr" style="left:{sl:.2f}%;top:{st:.2f}%;width:{sw / DW * 100:.2f}%;height:{sh / DH * 100:.2f}%">'
        '<div class="dm-nm"><b>NO MEDIA</b><span>เสียบ USB ที่ช่อง USB 1 เพื่อเริ่ม</span></div>'
        '<div class="dm-bw"><div class="dm-bh"><b>BROWSE</b><span>USB 1 · DJ LAB DEMO</span><em id="dm-cnt">1/5</em></div>'
        f'<div class="dm-vp"><ol class="dm-l" id="dm-l">{rows}</ol></div>'
        '<div class="dm-bf">กดปุ่ม Browse เพื่อ LOAD</div></div>'
        '<canvas class="dm-cv" id="dm-cv" aria-hidden="true"></canvas></div>'
        f'<div class="dm-knob" id="dm-knob" style="left:{knob_l:.2f}%;top:{knob_t:.2f}%"><i id="dm-dial"></i></div>'
        f'<div class="dm-usbin" id="dm-usbin" style="left:{ul:.2f}%;top:{ut:.2f}%"><i></i></div>'
        + _hs_html() +
        '<div class="dm-ind" id="dm-ind" hidden></div>'
        '<div class="dm-toast" id="dm-toast" role="status" aria-live="polite"></div>'
        '</div>')


STEPS = [
    ("เสียบ USB", "แตะที่แฟลชไดรฟ์ แล้วดูมันเสียบเข้าช่อง USB 1 ของ CDJ-3000X"),
    ("หมุน Browse เลือกแนวเพลง", "เลื่อนล้อเมาส์บนปุ่ม Browse (มือถือให้ลากขึ้น-ลง) แล้วเลือก House, Hip-Hop, Techno, Drum & Bass หรือ Disco / Funk ที่ชอบ"),
    ("กดปุ่ม Browse เพื่อ LOAD", "คลิกที่ปุ่ม Browse เหมือนกด Enter บนเครื่องจริง เพลงจะถูกโหลด และคลื่นเสียง (waveform) จะขึ้นที่จอ"),
    ("กด PLAY และ CUE", "▶/II เล่น-หยุด · CUE ตั้งจุดกลับ (กดค้างเพื่อฟังตัวอย่าง) · ลากที่จอก Jog เพื่อสแครช"),
    ("ลองฟังก์ชันอื่น", "HOT CUE A–H กดครั้งแรกเพื่อเก็บจุด กดอีกครั้งเพื่อกระโดดไป · IN / OUT / RELOOP ทำลูป · BEAT LOOP 4 / 8 · BEAT JUMP · เลื่อน TEMPO ที่เฟดเดอร์ขวา · TRACK SEARCH เปลี่ยนเพลง"),
]


def section_html(line_btn_html):
    steps = "".join(f'<li class="dm-st" data-s="{i}"><i>{i + 1}</i><div><b>{_h.escape(t)}</b><p>{_h.escape(d)}</p></div></li>'
                    for i, (t, d) in enumerate(STEPS))
    return (
        '<section class="hero dm" id="demo" aria-label="ลองเล่น CDJ-3000X">'
        '<div class="dm-in"><div class="dm-txt">'
        '<span class="hbadge"><i></i>ตัวแทนจำหน่ายอย่างเป็นทางการ · Lido Connect สยามสแควร์</span>'
        '<h1>ซื้อ เรียน ซ้อม พร้อม DJ ในที่เดียวกับ '
        '<button type="button" class="lab dm-stick usb hintp" id="dm-stick" aria-label="DJ LAB — แฟลชไดรฟ์ USB แตะเพื่อเสียบเข้า CDJ"><span>DJ LAB</span><i class="dm-plug" aria-hidden="true"></i>'
        '<em class="dm-tip" aria-hidden="true">แตะเพื่อเสียบ</em></button></h1>'
        '<p class="lede">ร้านอุปกรณ์ DJ ที่มีโรงเรียน ห้องซ้อม และคนที่รักดีเจ อยู่ใต้หลังคาเดียวกัน ทีมงานทุกคนเป็น DJ ที่ไม่ใช่แค่เล่นเป็น แต่รักในการดีเจจริงๆ</p>'
        f'<div class="cta">{line_btn_html}<a class="btn sec" href="/courses/">ดูคอร์สเรียน</a></div>'
        '<div class="dm-lead"><h2>ลองเล่น CDJ-3000X ตรงนี้ได้เลย</h2>'
        '<p>นี่คือเครื่องที่ร้านเรามีให้เล่นจริง ลองเสียบ USB เลือกแนวเพลงที่ชอบ แล้วจับดูก่อนมาที่ร้าน ไม่ต้องติดตั้งอะไร</p></div>'
        f'<ol class="dm-steps" id="dm-steps">{steps}</ol>'
        '<a class="btn sec dm-skip" href="#invite">ข้ามไปส่วนถัดไป ↓</a>'
        '</div>'
        '<div class="dm-stage">'
        + deck_html() +
        '</div></div></section>')


def invite_html(line_btn_html, n_teachers):
    return (
        '<section class="dm-inv" id="invite"><div class="dm-inv-in">'
        '<h2>อยากเล่นได้มากกว่านี้มั้ย?</h2>'
        f'<p>ที่เล่นไปเมื่อกี้คือแค่ไม่กี่ปุ่ม เรียนตัวต่อตัวกับ Pro DJ {n_teachers} คน เริ่มจากศูนย์ก็ได้ บนอุปกรณ์จริงของโรงเรียน '
        'ตั้งแต่ Beatmatch ไปจนถึงสแครช</p>'
        f'<div class="cta"><a class="btn pri" href="/courses/">ดูคอร์สเรียน</a>{line_btn_html}</div>'
        '</div></section>')


CSS = r"""
.dm{padding-top:36px!important}
.dm-in{display:grid;gap:28px}
.dm-txt h1{font-size:40px;line-height:1.3;max-width:15ch}
.dm-txt .lede{max-width:34em}
.dm-lead{margin-top:36px}
.dm-lead h2{font-size:28px}
.dm-lead p{margin-top:8px;color:var(--text-secondary);max-width:44ch}
.dm-steps{list-style:none;margin:22px 0 0;padding:0;display:grid;gap:14px}
.dm-st{display:grid;grid-template-columns:40px 1fr;gap:12px;padding:16px 18px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);transition:border-color .25s,box-shadow .25s,transform .25s}
.dm-st>i{font:800 28px/1.2 var(--font-family-display);font-style:normal;color:var(--text-muted)}
.dm-st b{display:block;font:700 18px/1.4 var(--font-family-display)}
.dm-st p{margin:4px 0 0;color:var(--text-secondary);font-size:15px}
.dm-st.on{border-color:var(--text-primary);box-shadow:0 14px 28px rgba(15,15,15,.1)}
.dm-st.on>i{color:var(--brand-base)}
.dm-st.done>i{color:#1A8F4D}
.dm-skip{margin-top:22px;position:sticky;bottom:16px;z-index:5;background:#fff}
.dm-stage{position:relative;display:flex;justify-content:center}
.dm-stick{position:relative;font:inherit;cursor:pointer;border:0;margin-right:.62em;vertical-align:baseline}
.dm-stick:focus-visible{outline:3px solid var(--text-primary);outline-offset:6px}
.dm-stick.hintp{animation:dmb 1.7s ease-out infinite}
@keyframes dmb{0%{box-shadow:0 0 0 0 rgba(221,70,76,.55)}100%{box-shadow:0 0 0 16px rgba(221,70,76,0)}}
.dm-plug{display:none;position:absolute;left:calc(100% - 1px);top:50%;width:.56em;height:.5em;margin-top:-.25em;background:linear-gradient(#EEF0F3,#AEB5BF);border:.035em solid #7E8693;border-left:0;border-radius:0 .07em .07em 0;box-shadow:0 .08em .16em rgba(0,0,0,.35)}
.dm-plug::before,.dm-plug::after{content:"";position:absolute;top:50%;width:.16em;height:.1em;margin-top:-.05em;background:#4A515B;border-radius:.02em}
.dm-plug::before{left:.12em}.dm-plug::after{left:.32em}
.dm-stick.usb .dm-plug{display:block}
.dm-tip{display:none;position:absolute;left:calc(100% + .9em);top:50%;white-space:nowrap;font:700 14px/1.4 var(--font-family-display);font-style:normal;background:#0F0F0F;color:#fff;padding:3px 12px;border-radius:999px;transform:translateY(-50%)}
.dm-stick.hintp .dm-tip{display:block}
.dm-fly{position:fixed;margin:0;z-index:70;pointer-events:none;animation:none!important}
.dm-fly .dm-tip{display:none!important}
.dm-deck{position:relative;width:min(100%,520px);aspect-ratio:800/1139;container-type:inline-size;user-select:none;-webkit-user-select:none;filter:drop-shadow(0 26px 30px rgba(15,15,15,.32))}
.dm-img{display:block;width:100%;height:100%;pointer-events:none}
.dm-scr{position:absolute;background:#05070A;color:#E8ECF2;overflow:hidden;font-family:var(--font-family-body)}
.dm-nm,.dm-bw{position:absolute;inset:0;display:none}
.m-nomedia .dm-nm{display:grid;place-content:center;gap:1.4cqw;text-align:center}
.dm-nm b{font:800 4.2cqw/1 var(--font-family-display);letter-spacing:.08em;color:#4A5565}
.dm-nm span{font-size:2.5cqw;color:#6C7A8E}
.m-browse .dm-bw{display:flex;flex-direction:column}
.dm-bh{display:flex;align-items:center;gap:2cqw;padding:1.2cqw 2.2cqw;background:#10151C;border-bottom:1px solid #263040;font-size:2.4cqw;line-height:1.3;white-space:nowrap}
.dm-bh b{font-family:var(--font-family-display);color:#5BA2FF;letter-spacing:.06em}
.dm-bh span{color:#8FA0B5;overflow:hidden;text-overflow:ellipsis}
.dm-bh em{margin-left:auto;font-style:normal;color:#8FA0B5;font-variant-numeric:tabular-nums}
.dm-vp{position:relative;flex:1;min-height:0;overflow:hidden}
.dm-l{margin:0;padding:0;list-style:none;transition:transform .26s cubic-bezier(.16,1,.3,1)}
.dm-l li{display:grid;grid-template-columns:auto 1fr auto;grid-template-rows:auto auto;column-gap:2cqw;align-content:center;box-sizing:border-box;padding:0 2.4cqw;border-bottom:1px solid #151B24;cursor:pointer}
.dm-l li i{grid-row:1/3;align-self:center;font:700 2.2cqw/1 var(--font-family-display);font-style:normal;color:#5C6B7E}
.dm-l li b{grid-column:2;grid-row:1;font:600 3cqw/1.3 var(--font-family-display);color:#DCE2EA}
.dm-l li small{grid-column:2;grid-row:2;font-size:2.2cqw;line-height:1.3;color:#7F8EA3}
.dm-l li em{grid-column:3;grid-row:1/3;align-self:center;font:normal 2.3cqw/1 var(--font-family-body);color:#7F8EA3;font-variant-numeric:tabular-nums}
.dm-l li.on{background:linear-gradient(90deg,#1A56A8,#10305F)}
.dm-l li.on i,.dm-l li.on small,.dm-l li.on em{color:#C6DBF7}.dm-l li.on b{color:#fff}
.dm-bf{padding:1cqw 2.2cqw;font-size:2.2cqw;color:#8FA0B5;background:#0B0F15;border-top:1px solid #1B2430;text-align:center}
.dm-cv{position:absolute;inset:0;width:100%;height:100%;display:none}
.m-play .dm-cv{display:block}
.dm-knob{position:absolute;width:15%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;pointer-events:none}
.dm-knob i{position:absolute;inset:14%;border-radius:50%;background:repeating-conic-gradient(rgba(255,255,255,.18) 0 4deg,transparent 4deg 15deg);transition:transform .22s cubic-bezier(.16,1,.3,1)}
.dm-knob i::before{content:"";position:absolute;left:50%;top:4%;width:7%;height:24%;margin-left:-3.5%;border-radius:3px;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.7)}
.dm-knob.act{box-shadow:0 0 0 .8cqw rgba(91,162,255,.55),0 0 3cqw rgba(91,162,255,.8);animation:dmk 1.6s ease-in-out infinite}
@keyframes dmk{50%{box-shadow:0 0 0 1.4cqw rgba(91,162,255,.25),0 0 4cqw rgba(91,162,255,.9)}}
.dm-usbin{position:absolute;width:6.6%;aspect-ratio:1/.9;transform:translate(-50%,-50%);border-radius:3px;background:#111418;border:1px solid #3A4048;display:none;box-shadow:0 2px 6px rgba(0,0,0,.5)}
.dm-usbin.on{display:block}
.dm-usbin i{position:absolute;left:12%;right:12%;top:38%;height:14%;background:#DD464C}
.dm-usbin::after{content:"";position:absolute;right:10%;top:10%;width:14%;aspect-ratio:1;border-radius:50%;background:#2BE07A;box-shadow:0 0 8px #2BE07A}
.dkb{position:absolute;transform:translate(-50%,-50%);padding:0;margin:0;border:0;background:transparent;cursor:pointer;border-radius:5px;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.dkb.r,.dkb.jog{border-radius:50%}
.dkb.r{aspect-ratio:1;height:auto!important}
.dkb:hover{outline:1px solid rgba(255,255,255,.28);outline-offset:1px}
.dkb:active,.dkb.press{background:rgba(255,255,255,.10)}
.dkb:focus-visible{outline:3px solid #fff;box-shadow:0 0 0 5px var(--brand-base)}
.dkb.lit{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c,#E0A23A) 80%,transparent);background:linear-gradient(to top,color-mix(in srgb,var(--c,#E0A23A) 55%,transparent) 0,color-mix(in srgb,var(--c,#E0A23A) 55%,transparent) 22%,transparent 22%)}
.dkb.r.lit{background:none}
.dkb.jog{aspect-ratio:1;height:auto!important;cursor:grab;touch-action:none;overflow:hidden}
.dkb.jog:hover{outline:0}
.dkb.jog i{position:absolute;inset:0;border-radius:50%;background:repeating-conic-gradient(rgba(255,255,255,.05) 0 3deg,transparent 3deg 28deg)}
.dkb.jog i::after{content:"";position:absolute;left:50%;top:5%;width:2.4%;aspect-ratio:1;margin-left:-1.2%;border-radius:50%;background:#DD464C;box-shadow:0 0 8px #DD464C}
.dkb.fd{cursor:ns-resize;touch-action:none;border-radius:6px}
.dkb.fd:hover{outline:0}
.fcap{position:absolute;left:50%;top:50%;width:70%;height:15.5%;transform:translate(-50%,-50%);border-radius:5px;background:linear-gradient(#34383E,#1C1F23);box-shadow:0 4px 8px rgba(0,0,0,.6);border:1px solid #4A5058;pointer-events:none}
.fcap::after{content:"";position:absolute;left:8%;right:8%;top:50%;height:2px;margin-top:-1px;background:#fff}
.dm-ind{position:absolute;transform:translate(-50%,-50%);border:3px solid var(--brand-base);border-radius:50%;pointer-events:none;z-index:5;animation:dmp 1.6s ease-out infinite}
.dm-ind::after{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);white-space:nowrap;background:var(--brand-base);color:#fff;font:700 13px/1.4 var(--font-family-display);padding:4px 10px;border-radius:999px;box-shadow:0 6px 14px rgba(0,0,0,.3)}
.dm-ind.sq{border-radius:10px}
@keyframes dmp{0%{box-shadow:0 0 0 0 rgba(221,70,76,.55)}100%{box-shadow:0 0 0 16px rgba(221,70,76,0)}}
.dm-toast{position:absolute;left:50%;bottom:2%;transform:translateX(-50%) translateY(8px);opacity:0;background:#0F0F0F;color:#fff;font:600 13px/1.4 var(--font-family-body);padding:8px 14px;border-radius:999px;pointer-events:none;transition:opacity .2s,transform .2s;white-space:nowrap;z-index:7}
.dm-toast.on{opacity:1;transform:translateX(-50%)}
.dm-inv{margin:48px 0 8px;background:#0F0F0F;color:#fff;border-radius:var(--radius-lg)}
.dm-inv-in{padding:44px 24px;display:grid;gap:14px;max-width:760px}
.dm-inv h2{font-size:34px;line-height:1.25}
.dm-inv p{color:#D8D6CF;font-size:17px;max-width:52ch}
.dm-inv .btn.sec{background:transparent;border-color:#fff;color:#fff}
@media (min-width:960px){
  .dm{padding-top:44px!important}
  .dm-txt h1{font-size:clamp(38px,4.1vw,54px);line-height:1.28;max-width:15ch}
  .dm-in{grid-template-columns:minmax(0,.82fr) minmax(0,1.18fr);gap:40px;align-items:start}
  .dm-steps{margin-top:18px}
  .dm-st{min-height:28vh;align-content:center}
  .dm-stage{position:sticky;top:84px;justify-content:flex-end;align-items:flex-start}
  .dm-deck{width:min(100%,calc((100svh - 150px) * .7024))}
  .dm-inv-in{padding:64px 56px}
}
@media (min-width:1280px){.dm-inv h2{font-size:44px}}
@media (prefers-reduced-motion:reduce){.dm-l,.dm-knob i{transition:none}.dm-ind,.dm-stick.hintp::after,.dm-knob.act{animation:none}}
"""

JS = r"""<script>
(function(){
var deck=document.getElementById('dm-deck');if(!deck)return;
var $=function(s){return deck.querySelector(s)};
var TR=@@TRACKS@@;
var scr=$('#dm-scr'),list=$('#dm-l'),rows=[].slice.call(list.children),cv=$('#dm-cv'),cx=cv.getContext('2d'),
  knob=$('#dm-knob'),dial=$('#dm-dial'),ind=$('#dm-ind'),toastEl=$('#dm-toast'),capEl=$('#dm-cap'),jogI=$('#dm-jog'),
  stick=document.getElementById('dm-stick'),usbin=$('#dm-usbin'),cnt=$('#dm-cnt'),
  steps=[].slice.call(document.querySelectorAll('.dm-st'));
var HC=['#ff4d4d','#22d3ee','#a3e635','#f9a8d4','#4ade80','#fb923c','#3b82f6','#facc15'];
var S={usb:false,mode:'nomedia',sel:0,cur:-1,ctx:null,gain:null,buf:{},pk:{},playing:false,pos:0,p0:0,t0:0,tempo:0,bend:0,rate:1,cue:0,
  hot:[null,null,null,null,null,null,null,null],loop:{a:null,b:null,on:false},src:null,vinyl:true,played:false,hint:true,prev:false,touch:false,off:0};
var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function btn(k){return deck.querySelector('[data-k="'+k+'"]')}
function trk(){return TR[S.cur]}
function dur(){var b=S.buf[trk().id];return b?b.duration:0}
/* ---------- toast / indicator / steps ---------- */
var tt;function toast(m){toastEl.textContent=m;toastEl.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){toastEl.classList.remove('on')},2200)}
function point(k,tip,sq){
  if(!k){ind.hidden=true;return}
  var t=btn(k);if(!t){ind.hidden=true;return}
  ind.hidden=false;ind.style.left=t.style.left;ind.style.top=t.style.top;
  var w=parseFloat(t.style.width)*1.18;ind.style.width=w+'%';ind.style.aspectRatio=sq?'auto':'1';
  ind.style.height=sq?(parseFloat(t.style.height)*1.3)+'%':'auto';ind.className='dm-ind'+(sq?' sq':'');ind.setAttribute('data-tip',tip||'')}
function stage(){
  var st=!S.usb?0:(S.cur<0?(S.selMoved===undefined?1:2):(!S.played?3:4));
  steps.forEach(function(e,i){e.classList.toggle('on',i===st);e.classList.toggle('done',i<st)});
  stick.classList.toggle('hintp',!S.usb);knob.classList.toggle('act',S.usb&&S.mode==='browse');
  if(!S.hint){point(null);return}
  if(!S.usb)point(null);
  else if(S.mode==='browse')point('browse',S.selMoved===undefined?'เลื่อนล้อเมาส์ที่ปุ่มนี้':'กดเพื่อ LOAD',false);
  else if(!S.played)point('play','กด PLAY',false);
  else if(!S.hot.some(function(h){return h!==null}))point('hc0','ลองกดเก็บ HOT CUE',true);
  else point(null)}
/* ---------- audio ---------- */
function ac(){if(!S.ctx){var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;S.ctx=new C();S.gain=S.ctx.createGain();S.gain.gain.value=.9;S.gain.connect(S.ctx.destination)}
  if(S.ctx.state==='suspended')S.ctx.resume();return S.ctx}
function peaks(b){var d=b.getChannelData(0),W=220,N=Math.floor(d.length/W),hi=new Float32Array(N),lo=new Float32Array(N),l=0,i,j,m,ml,x,a;
  for(i=0;i<N;i++){m=0;ml=0;for(j=0;j<W;j++){x=d[i*W+j];l+=.03*(x-l);a=x<0?-x:x;if(a>m)m=a;a=l<0?-l:l;if(a>ml)ml=a}hi[i]=m;lo[i]=ml}
  return{hi:hi,lo:lo,n:N,step:W/b.sampleRate}}
var loading={};
function fetchTrack(i){var t=TR[i];if(S.buf[t.id])return Promise.resolve(S.buf[t.id]);if(loading[t.id])return loading[t.id];
  var c=ac();if(!c)return Promise.reject();
  loading[t.id]=fetch('/assets/audio/demo-'+t.id+'.mp3').then(function(r){if(!r.ok)throw 0;return r.arrayBuffer()})
    .then(function(ab){return new Promise(function(res,rej){c.decodeAudioData(ab,res,rej)})})
    .then(function(b){S.buf[t.id]=b;S.pk[t.id]=peaks(b);var s=Math.round(b.duration);rows[i].querySelector('em').textContent=Math.floor(s/60)+':'+('0'+s%60).slice(-2);return b});
  return loading[t.id]}
function rebase(){S.pos=curPos();S.p0=S.pos;S.t0=S.ctx?S.ctx.currentTime:0}
function curPos(){
  if(!S.playing||!S.ctx)return S.pos;
  var p=S.p0+(S.ctx.currentTime-S.t0)*S.rate,L=S.loop;
  if(L.on&&L.b!==null&&L.b>L.a&&p>=L.b)p=L.a+((p-L.a)%(L.b-L.a));
  return p}
function stopSrc(){if(S.src){try{S.src.onended=null;S.src.stop()}catch(e){}try{S.src.disconnect()}catch(e){}S.src=null}}
function play(){
  if(S.cur<0||!S.buf[trk().id])return;var c=ac();if(!c)return;
  if(S.playing)return;
  var b=S.buf[trk().id];if(S.pos>=b.duration-.05)S.pos=0;
  stopSrc();var s=c.createBufferSource();s.buffer=b;S.rate=(1+S.tempo)*(1+S.bend);s.playbackRate.value=S.rate;s.connect(S.gain);
  var L=S.loop;if(L.on&&L.b!==null){s.loop=true;s.loopStart=L.a;s.loopEnd=L.b}
  s.start(0,Math.max(0,Math.min(S.pos,b.duration-.01)));S.src=s;S.p0=S.pos;S.t0=c.currentTime;S.playing=true;S.played=true;stage()}
function pause(){if(!S.playing)return;S.pos=curPos();S.playing=false;stopSrc();stage()}
function seek(p){var was=S.playing;if(was){stopSrc();S.playing=false}S.pos=Math.max(0,Math.min(dur()-.01,p));if(was)play()}
function applyRate(){var r=(1+S.tempo)*(1+S.bend);if(S.playing){rebase();if(S.src)S.src.playbackRate.value=r}S.rate=r}
function setLoop(){if(!S.playing){S.p0=S.pos}else rebase();
  if(S.src){var L=S.loop;if(L.on&&L.b!==null){S.src.loop=true;S.src.loopStart=L.a;S.src.loopEnd=L.b}else S.src.loop=false}
  lights()}
function beatLen(){return 60/trk().bpm}
/* ---------- list / modes ---------- */
function setMode(m){S.mode=m;scr.className='dm-scr m-'+m;if(m==='browse')showList();stage();draw()}
function showList(){var vp=list.parentNode.clientHeight,h=vp/4,off=Math.max(0,Math.min(S.sel-1,rows.length-4));
  rows.forEach(function(r,i){r.style.height=h+'px';r.classList.toggle('on',i===S.sel)});
  list.style.transform='translateY('+(-off*h)+'px)';cnt.textContent=(S.sel+1)+'/'+rows.length;dial.style.transform='rotate('+(S.sel*30)+'deg)'}
function sel(n,user){n=Math.max(0,Math.min(rows.length-1,n));if(n===S.sel&&!user)return;S.sel=n;S.selMoved=n;showList();stage();if(S.usb)fetchTrack(n).catch(function(){})}
function load(i){
  if(!S.usb)return;S.sel=i;showList();toast('LOADING… '+TR[i].name);
  fetchTrack(i).then(function(){
    var was=S.playing;pause();S.cur=i;S.pos=0;S.cue=0;S.hot=[null,null,null,null,null,null,null,null];S.loop={a:null,b:null,on:false};S.played=was&&S.played;
    setMode('play');lights();if(was){play()}stage()
  }).catch(function(){toast('โหลดเพลงไม่สำเร็จ ลองใหม่อีกครั้ง')})}
/* ---------- USB ---------- */
function insertUsb(){
  if(S.usb||stick.disabled)return;stick.disabled=true;ac();stick.classList.remove('hintp');
  var plug=stick.querySelector('.dm-plug'),a=stick.getBoundingClientRect(),pr=plug.getBoundingClientRect(),sr=usbin.getBoundingClientRect();
  var dx=sr.left+sr.width/2-(pr.left+pr.width/2),dy=sr.top+sr.height/2-(pr.top+pr.height/2),fly=null;
  var done=function(){if(fly&&fly.parentNode)fly.parentNode.removeChild(fly);stick.style.visibility='';stick.classList.remove('usb');stick.style.cursor='default';
    usbin.classList.add('on');S.usb=true;toast('USB 1 พร้อม — เลือกเพลงด้วยปุ่ม Browse');setMode('browse');
    TR.forEach(function(t,i){fetchTrack(i).catch(function(){})})};
  if(RM||!stick.animate){done();return}
  fly=stick.cloneNode(true);fly.removeAttribute('id');fly.className='lab dm-stick usb dm-fly';fly.setAttribute('aria-hidden','true');
  fly.style.left=a.left+'px';fly.style.top=a.top+'px';fly.style.width=a.width+'px';fly.style.height=a.height+'px';
  fly.style.transformOrigin=(pr.left+pr.width/2-a.left)+'px '+(pr.top+pr.height/2-a.top)+'px';
  stick.parentNode.appendChild(fly);stick.style.visibility='hidden';
  var sh=function(r,b){return 'drop-shadow(0 '+b+'px '+r+'px rgba(15,15,15,.38))'};
  var an=fly.animate([
    {transform:'rotate(-2.5deg)',filter:sh(3,3),offset:0},
    {transform:'translate('+dx*.22+'px,'+(dy*.22-34)+'px) rotate(-9deg) scale(1.12)',filter:sh(14,26),offset:.28,easing:'cubic-bezier(.3,.1,.2,1)'},
    {transform:'translate('+dx*.9+'px,'+(dy*.9-26)+'px) rotate(-1deg) scale(1.06)',filter:sh(12,22),offset:.62,easing:'cubic-bezier(.4,0,.3,1)'},
    {transform:'translate('+dx+'px,'+(dy-14)+'px) rotate(0deg) scale(1)',filter:sh(8,12),offset:.78,easing:'ease-in'},
    {transform:'translate('+dx+'px,'+dy+'px) rotate(0deg) scale(.34,.85)',filter:sh(2,2),offset:.92,easing:'ease-in'},
    {transform:'translate('+dx+'px,'+dy+'px) rotate(0deg) scale(.12,.6)',filter:sh(0,0),offset:1}],{duration:1500,fill:'forwards'});
  an.onfinish=done}
stick.addEventListener('click',insertUsb);
/* ---------- buttons ---------- */
function lights(){
  S.hot.forEach(function(h,i){var b=btn('hc'+i);b.classList.toggle('lit',h!==null);b.style.setProperty('--c',HC[i])});
  var L=S.loop;btn('in').classList.toggle('lit',L.a!==null);btn('out').classList.toggle('lit',L.b!==null);
  btn('reloop').classList.toggle('lit',L.on);btn('loop4').classList.toggle('lit',L.on&&L.n===4);btn('loop8').classList.toggle('lit',L.on&&L.n===8);
  }
var need=function(){if(S.cur<0||!S.usb){toast(S.usb?'เลือกเพลงด้วยปุ่ม Browse ก่อน':'เสียบ USB ก่อน');return false}return true};
function press(k){
  var i,L=S.loop;
  if(k==='browse'){if(!S.usb){toast('เสียบ USB ก่อน');return}
    if(S.mode==='browse'){load(S.sel)}else{setMode('browse')}return}
  if(k==='back'||k==='top-browse'){if(!S.usb){toast('เสียบ USB ก่อน');return}setMode('browse');return}
  if(k.indexOf('x-')===0){toast('ปุ่มนี้ลองบนเครื่องจริงที่ร้านได้เลย');return}
  if(!need())return;
  if(k==='play'){S.playing?pause():play();return}
  if(k==='cue'){return}   /* handled with pointer events */
  if(k.indexOf('hc')===0){i=+k.slice(2);if(S.hot[i]===null){S.hot[i]=curPos();lights();stage();toast('เก็บ HOT CUE '+'ABCDEFGH'[i])}else{seek(S.hot[i]);if(!S.playing)play()}return}
  if(k==='in'){L.a=curPos();L.b=null;L.on=false;L.n=0;setLoop();return}
  if(k==='out'){if(L.a===null)return;var p=curPos();if(p-L.a<.12)return;L.b=p;L.on=true;L.n=0;setLoop();return}
  if(k==='reloop'){if(L.a!==null&&L.b!==null){L.on=!L.on;setLoop()}return}
  if(k==='loop4'||k==='loop8'){var n=k==='loop4'?4:8;if(L.on&&L.n===n){L.on=false}else{L.a=curPos();L.b=L.a+n*beatLen();L.on=true;L.n=n}setLoop();return}
  if(k==='bjb'||k==='bjf'){seek(curPos()+(k==='bjf'?1:-1)*4*beatLen());return}
  if(k==='tprev'||k==='tnext'){load((S.cur+(k==='tnext'?1:TR.length-1))%TR.length);return}
  if(k==='trst'||k==='sync'){S.tempo=0;S.bend=0;applyRate();capPos();if(k==='sync')toast('BEAT SYNC — ปรับกลับ 0.0%');return}
  if(k==='vinyl'){S.vinyl=!S.vinyl;lights();toast(S.vinyl?'VINYL: จอกใช้สแครชได้':'CDJ: จอกใช้ดันจังหวะ (pitch bend)');return}}
deck.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.dkb');if(!b||b.getAttribute('data-k')==='jog'||b.getAttribute('data-k')==='tempo'||b.getAttribute('data-k')==='cue')return;
  if(b.getAttribute('data-k')==='browse'&&S.dragged){S.dragged=false;return}
  S.hint=S.hint&&b.getAttribute('data-k')!=='hc0';press(b.getAttribute('data-k'))});
/* CUE: set / return / hold-to-preview */
var cb=btn('cue'),cueHold=false;
cb.addEventListener('pointerdown',function(e){if(!need())return;try{cb.setPointerCapture(e.pointerId)}catch(x){}cb.classList.add('press');
  if(S.playing){seek(S.cue);pause()}
  else if(Math.abs(S.pos-S.cue)<.03){cueHold=true;play()}
  else{S.cue=S.pos;toast('ตั้ง CUE ที่จุดนี้')}});
function cueUp(){cb.classList.remove('press');if(cueHold){cueHold=false;pause();S.pos=S.cue}}
cb.addEventListener('pointerup',cueUp);cb.addEventListener('pointercancel',cueUp);
/* ---------- browse knob: wheel / drag / keys ---------- */
var kb=btn('browse'),acc=0,drag=null;
kb.addEventListener('wheel',function(e){
  if(S.mode!=='browse')return;
  var dy=e.deltaMode===1?e.deltaY*40:e.deltaY,dir=dy>0?1:-1;
  if((dir>0&&S.sel>=rows.length-1)||(dir<0&&S.sel<=0)){acc=0;return}
  e.preventDefault();acc+=dy;if(Math.abs(acc)>=50){sel(S.sel+(acc>0?1:-1),true);acc=0;S.hint=true}},{passive:false});
kb.addEventListener('pointerdown',function(e){drag={y:e.clientY};S.dragged=false;try{kb.setPointerCapture(e.pointerId)}catch(x){}});
kb.addEventListener('pointermove',function(e){if(!drag||S.mode!=='browse')return;var dy=e.clientY-drag.y;
  if(Math.abs(dy)>=18){sel(S.sel+(dy>0?1:-1),true);drag.y=e.clientY;S.dragged=true}});
['pointerup','pointercancel'].forEach(function(t){kb.addEventListener(t,function(){drag=null})});
kb.addEventListener('keydown',function(e){var m={ArrowDown:1,ArrowUp:-1};if(e.key in m&&S.mode==='browse'){e.preventDefault();sel(S.sel+m[e.key],true)}
  else if(e.key==='Enter'||e.key===' '){e.preventDefault();press('browse')}});
rows.forEach(function(r,i){r.addEventListener('click',function(){if(S.mode==='browse'){if(S.sel===i)load(i);else sel(i,true)}})});
/* ---------- tempo fader ---------- */
var fd=btn('tempo'),FY=1;
function capPos(){var f=(S.tempo/.1);capEl.style.top=(50+f*(46))+'%';fd.setAttribute('aria-valuenow',Math.round(S.tempo*100))}
function fdSet(e){var r=fd.getBoundingClientRect();var f=((e.clientY-r.top)/r.height-.5)*2;f=Math.max(-1,Math.min(1,f/.92));
  if(Math.abs(f)<.03)f=0;S.tempo=f*.1;capPos();applyRate()}
fd.addEventListener('pointerdown',function(e){try{fd.setPointerCapture(e.pointerId)}catch(x){}FY=0;fdSet(e)});
fd.addEventListener('pointermove',function(e){if(FY===0)fdSet(e)});
['pointerup','pointercancel'].forEach(function(t){fd.addEventListener(t,function(){FY=1})});
fd.addEventListener('keydown',function(e){var m={ArrowDown:.01,ArrowUp:-.01};if(e.key in m){e.preventDefault();S.tempo=Math.max(-.1,Math.min(.1,S.tempo+m[e.key]));capPos();applyRate()}});
/* ---------- jog ---------- */
var jg=btn('jog'),jd=null,ang=0,lastG=0;
function jangle(e){var r=jg.getBoundingClientRect();return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))}
function grain(p){if(!S.ctx||S.cur<0)return;var b=S.buf[trk().id];if(!b)return;var s=S.ctx.createBufferSource(),g=S.ctx.createGain(),t=S.ctx.currentTime;
  s.buffer=b;s.connect(g);g.connect(S.gain);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.9,t+.01);g.gain.linearRampToValueAtTime(0,t+.09);
  s.start(t,Math.max(0,Math.min(b.duration-.2,p)),.1)}
jg.addEventListener('pointerdown',function(e){if(!need())return;try{jg.setPointerCapture(e.pointerId)}catch(x){}
  jd={a:jangle(e),was:S.playing,t:performance.now(),mode:S.vinyl};
  if(S.vinyl&&S.playing){pause()}S.touch=true;jg.style.cursor='grabbing'});
jg.addEventListener('pointermove',function(e){if(!jd)return;var a=jangle(e),d=a-jd.a;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;jd.a=a;
  var now=performance.now(),dt=Math.max(8,now-jd.t);jd.t=now;ang+=d*180/Math.PI;
  if(jd.mode){S.pos=Math.max(0,Math.min(dur()-.2,S.pos+d/(2*Math.PI)*1.8));
    if(now-lastG>45){lastG=now;grain(S.pos)}}
  else{S.bend=Math.max(-.25,Math.min(.25,S.bend+d*3/dt*10));applyRate()}});
function jup(){if(!jd)return;var w=jd.was&&jd.mode;jd=null;S.touch=false;jg.style.cursor='';if(w)play()}
jg.addEventListener('pointerup',jup);jg.addEventListener('pointercancel',jup);
/* ---------- screen drawing ---------- */
var FONT=getComputedStyle(document.body).fontFamily;
function mmss(t,ms){var m=Math.floor(t/60),s=Math.floor(t%60);return (m<10?'0':'')+m+':'+(s<10?'0':'')+s+(ms?'.'+('00'+Math.floor((t%1)*1000)).slice(-3):'')}
var dpr=Math.min(2,window.devicePixelRatio||1),W=0,H=0;
function fit(){var w=cv.clientWidth,h=cv.clientHeight;if(w&&(w!==W||h!==H)){W=w;H=h;cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cx.setTransform(dpr,0,0,dpr,0,0)}}
function draw(){
  if(S.mode!=='play'||S.cur<0)return;fit();if(!W)return;
  var t=trk(),p=S.pk[t.id],pos=curPos(),d=dur(),bpm=t.bpm*(1+S.tempo)*(1+S.bend),i,x;
  cx.fillStyle='#05070A';cx.fillRect(0,0,W,H);
  /* top bar */
  cx.fillStyle='#10151C';cx.fillRect(0,0,W,H*.15);
  cx.fillStyle='#fff';cx.font='600 '+(H*.085)+'px '+FONT;cx.textBaseline='middle';cx.fillText((S.playing?'▶ ':'❚❚ ')+t.name,W*.03,H*.075);
  cx.fillStyle='#8FA0B5';cx.font='500 '+(H*.065)+'px '+FONT;cx.textAlign='right';cx.fillText('JOG '+(S.vinyl?'VINYL':'CDJ')+' · USB 1',W*.97,H*.075);cx.textAlign='left';
  if(!p)return;
  /* overview */
  var oy=H*.17,oh=H*.1;
  for(x=0;x<W;x++){i=Math.floor(x/W*p.n);var a=p.hi[i]*oh*.5,l=p.lo[i]*oh*.5;cx.fillStyle='#3E7BE8';cx.fillRect(x,oy+oh/2-a,1,a*2);cx.fillStyle='#FFB443';cx.fillRect(x,oy+oh/2-l,1,l*2)}
  var L=S.loop;if(L.a!==null&&L.b!==null){cx.fillStyle='rgba(255,170,40,.35)';cx.fillRect(L.a/d*W,oy,Math.max(2,(L.b-L.a)/d*W),oh)}
  S.hot.forEach(function(h,k){if(h!==null){cx.fillStyle=HC[k];cx.fillRect(h/d*W-1,oy-2,2,oh+4)}});
  cx.fillStyle='rgba(0,0,0,.45)';cx.fillRect(0,oy,pos/d*W,oh);cx.fillStyle='#fff';cx.fillRect(pos/d*W-1,oy-3,2,oh+6);
  /* main waveform */
  var my=H*.33,mh=H*.4,mid=my+mh/2,win=5.2,pps=W/win;
  cx.fillStyle='#0A0E14';cx.fillRect(0,my,W,mh);
  var bl=60/t.bpm,b0=Math.floor((pos-win/2)/bl)*bl;
  for(var bt=b0;bt<pos+win/2+bl;bt+=bl){if(bt<0)continue;var bx=W/2+(bt-pos)*pps,isBar=Math.round(bt/bl)%4===0;cx.fillStyle=isBar?'rgba(255,255,255,.34)':'rgba(255,255,255,.14)';cx.fillRect(bx,my,1,mh)}
  for(x=0;x<W;x++){var tm=pos+(x-W/2)/pps;if(tm<0||tm>=d)continue;i=Math.floor(tm/p.step);if(i>=p.n)continue;
    var hh=p.hi[i]*mh*.5,ll=p.lo[i]*mh*.5;
    cx.fillStyle=tm<pos?'#2A5CC2':'#3E7BE8';cx.fillRect(x,mid-hh,1,hh*2);
    cx.fillStyle=tm<pos?'#C98A2E':'#FFC15A';cx.fillRect(x,mid-ll,1,ll*2)}
  if(L.a!==null){var lx=W/2+(L.a-pos)*pps,lx2=L.b!==null?W/2+(L.b-pos)*pps:lx;cx.fillStyle=L.on?'rgba(255,150,30,.28)':'rgba(255,255,255,.1)';cx.fillRect(lx,my,Math.max(2,lx2-lx),mh);cx.fillStyle='#FF9A1F';cx.fillRect(lx,my,2,mh);if(L.b!==null)cx.fillRect(lx2-1,my,2,mh)}
  S.hot.forEach(function(h,k){if(h===null)return;var hx=W/2+(h-pos)*pps;if(hx<0||hx>W)return;cx.fillStyle=HC[k];cx.fillRect(hx-1,my,2,mh);cx.fillRect(hx,my,W*.04,H*.07);cx.fillStyle='#000';cx.font='700 '+(H*.055)+'px '+FONT;cx.fillText('ABCDEFGH'[k],hx+W*.012,my+H*.035)});
  var cxp=W/2+(S.cue-pos)*pps;if(cxp>0&&cxp<W){cx.fillStyle='#ff9f1a';cx.fillRect(cxp-1,my,2,mh)}
  cx.fillStyle='#fff';cx.fillRect(W/2-1,my-4,2,mh+8);
  /* readouts */
  cx.fillStyle='#fff';cx.font='700 '+(H*.14)+'px '+FONT;cx.textBaseline='alphabetic';cx.fillText(mmss(pos,true),W*.03,H*.93);
  cx.font='500 '+(H*.06)+'px '+FONT;cx.fillStyle='#8FA0B5';cx.fillText('REMAIN -'+mmss(Math.max(0,d-pos),false),W*.03,H*.99);
  cx.textAlign='right';cx.fillStyle='#fff';cx.font='700 '+(H*.12)+'px '+FONT;cx.fillText(bpm.toFixed(1),W*.97,H*.9);
  cx.font='500 '+(H*.06)+'px '+FONT;cx.fillStyle='#8FA0B5';cx.fillText('BPM  '+(S.tempo>=0?'+':'')+(S.tempo*100).toFixed(1)+'%  ·  '+t.key,W*.97,H*.99);cx.textAlign='left'}
/* ---------- frame loop ---------- */
var last=performance.now(),vis=true;
function frame(now){
  var dt=now-last;last=now;
  if(vis){
    if(S.bend){S.bend*=Math.pow(.88,dt/16);if(Math.abs(S.bend)<.003){S.bend=0}applyRate()}
    if(S.playing){ang+=200*(S.rate)*dt/1000;var p=curPos(),dd=dur();if(!S.loop.on&&p>=dd-.02){pause();S.pos=0;toast('จบเพลง')}}
    jogI.style.transform='rotate('+ang+'deg)';
    if(S.mode==='play')draw()}
  requestAnimationFrame(frame)}
if('IntersectionObserver' in window)new IntersectionObserver(function(en){vis=en[0].isIntersecting;if(!vis&&S.playing)pause()},{threshold:0}).observe(deck);
document.addEventListener('visibilitychange',function(){if(document.hidden&&S.playing)pause()});
window.addEventListener('resize',function(){if(S.mode==='browse')showList();W=0});
lights();capPos();showList();stage();requestAnimationFrame(frame);
})();
</script>"""


def js_html():
    import json
    t = [{"id": a, "name": n, "bpm": b, "key": k} for a, n, b, k in TRACKS]
    return JS.replace("@@TRACKS@@", json.dumps(t, ensure_ascii=False))
