#!/usr/bin/env python3
"""Builds the static pages  /courses/  ·  /teachers/<name>/ (x6)  ·  /content/  from the shop's single source of truth.

  courses.json   bots/bot/shared/courses.json   (courses, prices, hours, audience, prerequisite, tracks, teachers)   <- NEVER retyped here
  data/teacher-profiles.json   per-teacher bio / video (empty = that section is not shown at all)
  data/faq.json                FAQ (numbers are {placeholders} filled from courses.json) - the visible FAQ and the JSON-LD both come from it
  data/programs.json           regular programmes of /content/

Each generated file carries the md5 of the courses.json it was built from; tools/check_pages.py compares that with the current file before every push.
Standard library only.  Usage (from anywhere):  python tools/build_pages.py [--courses PATH] [--profiles PATH] [--out DIR]
"""
import argparse, hashlib, html, io, json, os, re, sys, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(HERE)
ORIGIN = "https://djlabsiam.com"
LINE_ADD = "https://line.me/ti/p/@djlabsiam"
LINE_MSG = "https://line.me/R/oaMessage/%40djlabsiam/?"   # the message goes straight after "?" (not "?text=")
E = html.escape


def die(msg):
    sys.exit("build_pages: " + msg)


ap = argparse.ArgumentParser()
ap.add_argument("--courses", default=os.path.join(os.path.dirname(SITE), "bots", "bot", "shared", "courses.json"))
ap.add_argument("--profiles", default=os.path.join(SITE, "data", "teacher-profiles.json"))
ap.add_argument("--faq", default=os.path.join(SITE, "data", "faq.json"))
ap.add_argument("--programs", default=os.path.join(SITE, "data", "programs.json"))
ap.add_argument("--course-images", default=os.path.join(SITE, "data", "course-images.json"))
ap.add_argument("--out", default=SITE)
ap.add_argument("--home", default="/next/", help="where the home page is written: /next/ = draft (noindex) · / = live home")
ap.add_argument("--home-faq", default=os.path.join(SITE, "data", "faq-home.json"))
ap.add_argument("--shop", default="/next/shop/", help="where the shop page is written: /next/shop/ = draft (noindex) · /shop/ = live")
A = ap.parse_args()


def load(p):
    with io.open(p, encoding="utf-8") as f:
        return json.load(f)


RAW = io.open(A.courses, "rb").read()
MD5 = hashlib.md5(RAW).hexdigest()
D = json.loads(RAW.decode("utf-8"))
COURSES = D["items"]
TEACHERS = D["instructors"]["items"]
PROFILES = load(A.profiles)
FAQ = load(A.faq)["items"]
_PROG = load(A.programs)
PROGRAMS = _PROG["items"]
LISTEN = _PROG["listen"]
CIMG = load(A.course_images) if os.path.exists(A.course_images) else {}   # per-course picture: {file, w, h, alt} or null = no picture, no empty space


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def short(title):
    return title.replace(" Class", "")


def cid(title):
    return slug(short(title))


# ───────── consistency of the inputs (stop instead of publishing something half-true) ─────────
names = [t["name"] for t in TEACHERS]
pk = [k for k in PROFILES if not k.startswith("_")]
if sorted(pk) != sorted(names):
    die(f"teacher-profiles.json keys {sorted(pk)} != teachers in courses.json {sorted(names)}")
for c in COURSES:
    for t in c["instructors"]:
        if t not in names:
            die(f"{c['title']} lists instructor {t!r} who is not in instructors.items")
    for k in ("title", "price", "hours", "audience", "bullets", "instructors"):
        if k not in c:
            die(f"{c['title']} has no {k!r}")
for t, im in CIMG.items():
    if t.startswith("_") or not im:
        continue
    if t not in [c["title"] for c in COURSES]:
        die(f"course-images.json: {t!r} is not a course in courses.json")
    if not all(im.get(k) for k in ("base", "widths", "w", "h", "alt")):
        die(f"course-images.json: {t!r} needs base, widths, w, h and alt")
    for w in im["widths"]:
        if not os.path.exists(os.path.join(SITE, "assets", "img", f"{im['base']}-{w}.webp")):
            die(f"course-images.json: assets/img/{im['base']}-{w}.webp does not exist")
for n, p in PROFILES.items():
    if n.startswith("_"):
        continue
    if bool(p.get("video_id")) != bool(p.get("poster")):
        die(f"{n}: video_id and poster must be given together")
    if p.get("video_id") and not re.fullmatch(r"[A-Za-z0-9_-]{11}", p["video_id"]):
        die(f"{n}: video_id is not an 11-character YouTube id")
    if p.get("poster") and not os.path.exists(os.path.join(SITE, "assets", "img", p["poster"])):
        die(f"{n}: poster assets/img/{p['poster']} does not exist")


# ───────── facts derived from the JSON text ─────────
def facts(c):
    h = c["hours"]
    m = re.search(r"เรียน\s*(\d+)\s*ชม", h)
    s = re.search(r"(\d+)\s*ครั้ง\s*\((\d+)\s*ชม", h)
    if not (m and s):
        die(f"cannot read hours of {c['title']}: {h!r}")
    pr = re.search(r"ห้องซ้อมและอุปกรณ์\s*(\d+)\s*ชม", h)
    equip_b = next((b for b in c["bullets"] if b.startswith("เลือกอุปกรณ์ได้:") or b.startswith("เลือกเรียนได้") or b.startswith("Turntable only")), "")
    if equip_b.startswith("Turntable only"):
        equip = equip_b.split("—", 1)[0].strip().replace(" only", " เท่านั้น")
    else:
        equip = equip_b.split(":", 1)[1].strip() if ":" in equip_b else ""
    content = next((b for b in c["bullets"] if b.startswith("เนื้อหา:")), "")
    if not content and equip_b.startswith("Turntable only") and "—" in equip_b:
        content = equip_b.split("—", 1)[1].strip()
    life = next((b for b in c["bullets"] if "อายุคอร์ส" in b), "")
    return dict(learn=int(m.group(1)), sessions=int(s.group(1)), per=int(s.group(2)), practice=int(pr.group(1)) if pr else 0,
                price=c["price"], equip=equip, content=content.replace("เนื้อหา:", "").strip(), life=life,
                weekly=any("เรียนอย่างน้อยสัปดาห์ละครั้ง" in b for b in c["bullets"]))


F = {c["title"]: facts(c) for c in COURSES}
teaches = {t["name"]: [c["title"] for c in COURSES if t["name"] in c["instructors"]] for t in TEACHERS}
SHARED_ALL = all(len({str(F[t][k]) for t in F}) == 1 for k in ("learn", "sessions", "per", "price"))
F0 = F[COURSES[0]["title"]]
PRACTICE_COURSE = next((c["title"] for c in COURSES if F[c["title"]]["practice"]), None)
FP = F[PRACTICE_COURSE] if PRACTICE_COURSE else None
needle = ""
for c in COURSES:
    m = re.search(r"\(([^)]*ปลายเข็ม[^)]*)\)", F[c["title"]]["equip"])
    if m:
        needle = m.group(1)
        break


def faq_text(a):
    life_m = re.search(r"\d+\s*เดือน", F0["life"])
    if not life_m or len({f["life"] for f in F.values()}) != 1:
        die("the payment FAQ states one course life (e.g. '3 เดือน') for all courses, but courses.json has none or differing ones")
    vals = dict(
        course_names=", ".join(short(c["title"]) for c in COURSES), price=F0["price"], learn=F0["learn"], sessions=F0["sessions"], per=F0["per"],
        practice_course=PRACTICE_COURSE or "", practice=FP["practice"] if FP else 0, total=(FP["learn"] + FP["practice"]) if FP else 0,
        needle_note=needle, life=F0["life"], life_months=life_m.group(0), teacher_count=len(TEACHERS),
        weekly_courses=" และ ".join(short(c["title"]) for c in COURSES if F[c["title"]]["weekly"]),
        equip_sentence=" · ".join(f"{short(c['title'])}: {F[c['title']]['equip']}" for c in COURSES if F[c["title"]]["equip"]))
    try:
        return a.format_map(vals)
    except KeyError as e:
        die(f"faq.json uses an unknown placeholder {e}")


FAQ_RENDERED = [(it["q"], faq_text(it["a"])) for it in FAQ]


# ───────── small helpers ─────────
def line_url(text):
    return LINE_MSG + urllib.parse.quote(text, safe="")


def line_btn(text, label, cls="pri"):
    return f'<a class="btn {cls}" href="{line_url(text)}" rel="noopener"><span class="dot"></span>{E(label)}</a>'


ICON = {
    "arrow": '<path d="M5 12h14M13 6l6 6-6 6"/>',
    "play": '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
    "ext": '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
    "alert": '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v5M12 16.2v.1"/>',
}


def ic(n, s=20):
    return (f'<svg class="ico" width="{s}" height="{s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
            f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[n]}</svg>')


def photo(name, w, size_attr, cls=""):
    s = slug(name)
    return (f'<img{(" class=" + chr(34) + cls + chr(34)) if cls else ""} src="/assets/img/teacher-{s}-cut-640.webp" '
            f'srcset="/assets/img/teacher-{s}-cut-320.webp 320w, /assets/img/teacher-{s}-cut-640.webp 640w" sizes="{size_attr}" '
            f'width="640" height="800" alt="" loading="lazy" decoding="async">')


# ───────── page shell ─────────
def fonts_css():
    book = io.open(os.path.join(SITE, "book", "index.html"), encoding="utf-8").read()
    faces = re.findall(r"@font-face\{[^}]*\}", book)
    if len(faces) != 10:
        die(f"expected 10 @font-face rules in book/index.html, found {len(faces)}")
    return "\n".join(f.replace("url(fonts/", "url(/book/fonts/") for f in faces)


TOKENS = io.open(os.path.join(SITE, "design-system", "build", "tokens.inline.css"), encoding="utf-8").read()
FONTS = fonts_css()

CSS = r"""
:root{color-scheme:light;scrollbar-color:#bbb #fff;--lab-tint:#FBE9EA;--lab-paper:#F5F4F0;--lab-line:#E2DFD6}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-padding-top:90px}
body{margin:0;background-color:#fff;color:var(--text-primary);font:400 16px/1.7 var(--font-family-body);-webkit-font-smoothing:antialiased;overflow-x:clip;
  background-image:linear-gradient(rgba(15,15,15,.085) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,.085) 1px,transparent 1px),linear-gradient(rgba(15,15,15,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,.04) 1px,transparent 1px);
  background-size:140px 140px,140px 140px,28px 28px,28px 28px;background-position:-1px -1px}
h1,h2,h3,h4{font-family:var(--font-family-display);font-weight:800;margin:0;letter-spacing:0;text-wrap:balance}
h1{font-size:34px;line-height:1.3}
h2{font-size:26px;line-height:1.3}
h3{font-size:18px;line-height:1.4;font-weight:700}
p{margin:0}
a{color:inherit}
img{display:block;max-width:100%;height:auto}
::selection{background:var(--brand-base);color:#fff}
:focus-visible{outline:3px solid var(--brand-base);outline-offset:3px;border-radius:4px}
.skip{position:absolute;left:12px;top:-80px;z-index:60;background:#0F0F0F;color:#fff;padding:12px 16px;font:700 16px/1.25 var(--font-family-display);border-radius:var(--radius-sm)}
.skip:focus{top:12px}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.ico{flex:0 0 auto}
.dot{width:10px;height:10px;border-radius:50%;background:#06C755;flex:0 0 auto;box-shadow:0 0 0 2px rgba(255,255,255,.9)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;padding:6px 24px;font:700 16px/1.3 var(--font-family-display);text-align:center;text-decoration:none;border:1px solid transparent;border-radius:var(--radius-pill);cursor:pointer;background:none;color:inherit;transition:transform .25s cubic-bezier(.16,1,.3,1),background .2s,box-shadow .25s}
.btn:hover{transform:translateY(-2px)}
.btn:active{transform:translateY(1px)}
.btn.pri{background:var(--brand-base);color:var(--brand-on);box-shadow:0 2px 0 var(--brand-press),0 10px 18px rgba(15,15,15,.14)}
.btn.pri:hover{background:var(--brand-hover)}
.btn.sec{border-color:var(--text-primary);color:var(--text-primary);background:#fff}
.btn.sec:hover{background:var(--text-primary);color:#fff}
.btn.sm{min-height:44px;padding:4px 18px;font-size:15px}
.chip{display:inline-flex;align-items:center;min-height:28px;padding:0 12px;font:700 14px/1.25 var(--font-family-display);border:1px solid var(--lab-line);border-radius:var(--radius-pill);background:#fff}
.chip.rec{background:var(--lab-tint);color:#981C21;border-color:var(--lab-tint)}
/* black strip + header */
.topbar{background:#0F0F0F;color:#E8E6DF;font-size:13.5px;line-height:1.5}
.topbar>div{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 24px;padding:7px 24px}
.topbar b{color:#fff;font-weight:600}
.topbar span+span{color:#BDBAB1}
.top{position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:12px;padding:10px 24px;min-height:68px;background:rgba(255,255,255,.94);backdrop-filter:blur(10px);border-bottom:1px solid var(--lab-line)}
.logo{display:inline-flex;align-items:center;min-height:44px}
.logo img{width:126px;height:42px}
.tnav{display:none}
.top>.btn{margin-left:auto;white-space:nowrap}.top>.btn.sm{padding:4px 16px}
.xf{position:absolute;left:0;right:0;bottom:-1px;height:3px;background:transparent;pointer-events:none}
.xf i{position:absolute;top:-6px;left:0;width:22px;height:15px;margin-left:-11px;border-radius:3px;background:var(--brand-base);box-shadow:0 2px 0 var(--brand-press),0 4px 8px rgba(0,0,0,.2)}
.xf i::after{content:"";position:absolute;left:50%;top:3px;bottom:3px;width:2px;margin-left:-1px;background:#fff;opacity:.85}
.mnav>summary{list-style:none;display:inline-flex;align-items:center;min-height:44px;padding:0 18px;border:1.5px solid var(--lab-line);border-radius:var(--radius-pill);background:#fff;font:700 15px/1 var(--font-family-display);cursor:pointer}
.mnav>summary::-webkit-details-marker{display:none}
.mnav nav{position:absolute;left:0;right:0;top:100%;z-index:10;display:grid;padding:4px 24px 14px;background:#fff;border-bottom:1px solid var(--lab-line);box-shadow:0 18px 30px rgba(15,15,15,.12)}
.mnav nav a{display:flex;align-items:center;min-height:52px;text-decoration:none;font:700 18px/1.3 var(--font-family-display);border-bottom:1px solid var(--lab-line)}
.mnav nav a:last-child{border-bottom:0}
/* footer: black */
.foot{margin-top:24px;background:#0F0F0F;color:#CFCCC3;font-size:15px}
.foot-in{padding:36px 24px 40px;max-width:1360px;margin:0 auto}
.foot-cta{display:flex;flex-wrap:wrap;gap:14px 24px;align-items:center;justify-content:space-between;color:#fff;padding-bottom:6px}
.foot-cta b{font:800 24px/1.4 var(--font-family-display)}
.rackband{padding-top:28px;overflow:hidden}
.rack{display:block;width:100%;height:auto;max-height:170px}
.rack *{stroke:#F4F2EC;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;fill:#0F0F0F}
.rack path{fill:none}
.rack .rk-g{fill:none}
.rack .rk-r{stroke:#DD464C}
.rack .rk-rf{fill:#DD464C;stroke:#DD464C}
.foot-cols{display:grid;gap:20px;padding-top:24px}
.foot b{font:800 18px/1.4 var(--font-family-display);color:#fff}
.foot a{display:inline-flex;align-items:center;min-height:44px;color:#fff}
.credit{margin-top:20px;font-size:13px;line-height:1.6;color:#9A978E;max-width:90ch}
/* rhythm */
.pgm{padding:0 24px;position:relative}
.pgm>section{padding:56px 0 0}
.pgm>section:last-child{padding-bottom:64px}
.hero{padding-top:44px!important;position:relative}
.hero>*:not(.gear){position:relative;z-index:2}
.hero h1{max-width:18ch}
.hero h1 .lab{display:inline-block;background:var(--brand-base);color:#fff;padding:0 .14em;border-radius:.16em;transform:rotate(-2.5deg);margin:0 .04em;white-space:nowrap}
.lede{margin-top:16px;max-width:56ch;color:var(--text-secondary);font-size:17px}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
.cta .btn{width:100%}
.shared{margin-top:28px;padding-top:18px;border-top:1px solid var(--lab-line);color:var(--text-secondary);max-width:70ch}
.shared b{color:var(--text-primary)}
/* gear decor + motion */
.gear{position:absolute;z-index:1;pointer-events:none;will-change:transform;transform:translate3d(var(--mx,0px),calc(var(--sy,0px) + var(--my,0px)),0) rotate(var(--sr,0deg))}
.gear img{width:100%;height:auto;display:block;filter:drop-shadow(0 26px 22px rgba(15,15,15,.26)) drop-shadow(0 2px 0 rgba(15,15,15,.14));animation:gfloat 6s ease-in-out infinite;animation-delay:var(--fd,0s)}
@keyframes gfloat{0%,100%{translate:0 0;rotate:var(--r0,0deg)}50%{translate:0 -12px;rotate:calc(var(--r0,0deg) + 1.2deg)}}
.gear[data-drop] img{opacity:0;scale:.9;translate:0 -40px;animation:none}
.gear[data-drop].in img{opacity:1;scale:1;translate:0 0;transition:opacity .5s ease,scale .9s cubic-bezier(.34,1.56,.64,1),translate .9s cubic-bezier(.34,1.56,.64,1);animation:gfloat 6s ease-in-out 1s infinite}
.g-hero{display:none}
/* chooser */
.choose h2{font-size:22px}
.choose ul{list-style:none;margin:16px 0 0;padding:0;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);overflow:hidden}
.choose li{display:grid;padding:12px 18px 6px;border-bottom:1px solid var(--lab-line)}
.choose li:last-child{border-bottom:0}
.choose li span{color:var(--text-secondary)}
.choose li a{display:inline-flex;align-items:center;gap:8px;min-height:44px;font:700 17px/1.25 var(--font-family-display);text-decoration:none}
.choose li a:hover{color:var(--brand-base)}
/* course rows = cards */
.courses{padding-top:24px!important;display:grid;gap:24px}
.course{display:grid;gap:22px;padding:24px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-lg);box-shadow:0 18px 36px rgba(15,15,15,.06)}
.course h2{font-size:30px;line-height:1.25;display:inline}
.course .chip{margin-left:12px;vertical-align:middle}
.fit{margin-top:12px;color:var(--text-primary);font-size:17px}
.cimg{margin:0 0 20px}
.cimg img{width:100%;height:auto;border-radius:var(--radius-md)}
.spec{display:grid;grid-template-columns:1fr 1fr;margin-top:20px;border:1px solid var(--lab-line);border-radius:var(--radius-md);background:var(--lab-paper);overflow:hidden}
.spec>div{padding:12px 16px;display:flex;flex-direction:column;gap:2px}
.spec .s1{order:1;border-right:1px solid var(--lab-line)}
.spec .s3{order:2}
.spec .s2{order:3;grid-column:1/-1;border-top:1px solid var(--lab-line)}
.spec .k{font-size:14px;color:var(--text-muted)}
.spec b{font:700 18px/1.4 var(--font-family-display)}
.spec .price{font-size:24px;line-height:1.3;font-weight:800;white-space:nowrap}
.plus{margin-top:12px;font-size:15px;color:var(--text-secondary)}
.plus b{color:var(--text-primary)}
.pre{margin:0 0 20px;padding:14px 16px;border:1px solid var(--lab-line);border-radius:var(--radius-md);background:var(--lab-tint)}
.pre b{display:block;font:700 15px/1.4 var(--font-family-display);margin-bottom:4px}
.bl,.tracks{margin:12px 0 0;padding:0;list-style:none;display:grid;gap:10px}
.bl li,.tracks li{padding-left:20px;position:relative;color:var(--text-secondary)}
.bl li::before,.tracks li::before{content:"";position:absolute;left:0;top:.7em;width:8px;height:8px;border-radius:50%;background:var(--brand-base)}
.tracks{margin-bottom:18px}
.tracks b{color:var(--text-primary);font-family:var(--font-family-display);font-weight:700}
.tpick{margin:6px 0 14px;color:var(--text-secondary)}
.own{margin:22px 0 0;font:700 15px/1.4 var(--font-family-display);color:var(--text-secondary)}
.faces{display:grid;grid-template-columns:repeat(2,1fr);gap:10px 12px;margin:14px 0 0}
.face{display:flex;align-items:center;gap:10px;min-height:52px;text-decoration:none;font:600 15px/1.25 var(--font-family-display)}
.face:hover span:last-child{text-decoration:underline;text-underline-offset:3px}
.av{display:block;width:52px;height:52px;overflow:hidden;background:var(--lab-tint);border-radius:50%;flex:0 0 auto}
.av img{width:52px;height:52px;object-fit:cover;object-position:50% 8%}
.c-c .btn{width:100%}
.c-c .btn+.btn,.stick .btn+.btn{margin-top:10px}
/* compare */
.cmpsec h2,.team h2,.faq h2,.endcta h2{font-size:26px}
.same{margin-top:14px;color:var(--text-secondary);max-width:70ch}
.same b{color:var(--text-primary)}
.tbl-wrap{margin-top:20px}
.cmp{width:100%;border-collapse:collapse;font-size:15px;line-height:1.6;display:block}
.cmp tbody,.cmp tr{display:block}
.cmp thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.cmp tr{padding:20px 0;border-top:1px solid var(--lab-line)}
.cmp th,.cmp td{padding:0;text-align:left;vertical-align:top}
.cmp tbody th{display:block;padding-bottom:10px;font:700 18px/1.6 var(--font-family-display);color:var(--text-primary)}
.cmp td{display:grid;grid-template-columns:112px 1fr;gap:12px;padding:6px 0;color:var(--text-secondary)}
.cmp td::before{content:attr(data-label);font:700 14px/1.7 var(--font-family-display);color:var(--text-muted)}
/* team */
.lede2{margin-top:10px;color:var(--text-secondary);max-width:70ch}
.tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:16px 12px;margin-top:24px}
.tile{display:flex;flex-direction:column;gap:8px;text-decoration:none;padding:8px 8px 10px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .3s}
.tile:hover{transform:translateY(-4px) rotate(-1deg);box-shadow:0 16px 28px rgba(15,15,15,.12)}
.tile .tp{display:block;aspect-ratio:4/5;overflow:hidden;background:var(--lab-tint);border-radius:var(--radius-sm)}
.tile .tp img{width:100%;height:100%;object-fit:cover}
.tp img,.pph img{filter:drop-shadow(0 10px 10px rgba(15,15,15,.22))}
.tile b{font:700 18px/1.3 var(--font-family-display);padding:0 4px}
.tile .tc{font-size:14px;line-height:1.5;color:var(--text-secondary);padding:0 4px}
.tile.sm .tp{aspect-ratio:1/1}
.tile.sm .tp img{object-position:50% 10%}
/* faq */
.qs{margin-top:20px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);padding:0 20px}
.q{border-bottom:1px solid var(--lab-line)}
.q:last-child{border-bottom:0}
.q summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:56px;padding:10px 0;font:700 17px/1.45 var(--font-family-display)}
.q summary::-webkit-details-marker{display:none}
.q summary::after{content:"";flex:0 0 auto;width:10px;height:10px;border-right:2px solid var(--brand-base);border-bottom:2px solid var(--brand-base);transform:rotate(45deg);margin-right:6px;transition:transform var(--motion-duration-fast) var(--motion-easing-base)}
.q[open] summary::after{transform:rotate(-135deg)}
.q p{padding:0 0 18px;color:var(--text-secondary);max-width:72ch}
.endcta{margin:0 -24px;padding:48px 24px!important;background:var(--lab-tint)}
.endcta .cta{margin-top:20px}
/* profile */
.crumb{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;padding-top:20px!important;font-size:15px;color:var(--text-muted)}
.crumb a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px;color:var(--text-secondary)}
.pg2{display:grid;gap:28px;padding-top:8px}
.pph{margin:0;background:var(--lab-tint);aspect-ratio:4/5;overflow:hidden;align-self:start;border-radius:var(--radius-lg)}
.pph img{width:100%;height:100%;object-fit:cover}
.pbody{display:grid;gap:36px;align-content:start}
.pname{display:grid;gap:4px}
.pbody h1{font-size:40px}
.role{color:var(--text-secondary);font-size:17px}
.pbody section{display:grid;gap:12px}
.pbody h2{font-size:22px}
.cchips{display:flex;flex-wrap:wrap;gap:10px}
.cchip{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border:1.5px solid var(--text-primary);border-radius:var(--radius-pill);background:#fff;text-decoration:none;font:700 16px/1.25 var(--font-family-display)}
.cchip:hover{background:var(--text-primary);color:#fff}
.one{color:var(--text-secondary)}
.bio{color:var(--text-secondary);max-width:62ch}
.stick{display:grid;gap:0;justify-items:start}
.stick .btn{width:100%}
.others h2{font-size:26px}
/* video: click-to-load (stays dark) */
.fc{display:grid;gap:8px}
.fc-box{position:relative;aspect-ratio:16/9;background:var(--surface-sunken);overflow:hidden;border:1px solid var(--lab-line);border-radius:var(--radius-md)}
.fc-box>img,.fc-box>iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.fc-box>img{object-fit:cover}
.fc-btn{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;width:100%;border:0;background:linear-gradient(0deg,rgba(0,0,0,.55),rgba(0,0,0,.05) 60%);color:#fff;cursor:pointer}
.fc-btn svg{width:56px;height:56px;padding:14px;background:var(--brand-base);color:#fff;border-radius:50%}
.fc-btn:hover svg{background:var(--brand-hover)}
.fc-msg{position:absolute;inset:0;display:none;place-content:center;justify-items:center;gap:12px;padding:16px;text-align:center;background:rgba(0,0,0,.82);color:#E8E6DF;font-size:15px}
.fc-msg .btn.sec{background:transparent;border-color:#fff;color:#fff}
.fc-box.loading .fc-msg.l,.fc-box.failed .fc-msg.e{display:grid}
.fc-box.loading .fc-btn,.fc-box.failed .fc-btn{display:none}
#clips [hidden]{display:none!important}
.cl-group{margin-top:32px}
.cl-group h3{font-size:22px;line-height:1.3}
.cl-list{list-style:none;margin:12px 0 0;padding:0;max-width:760px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);overflow:hidden}
.cl-i{display:grid;gap:8px;padding:18px 20px;border-top:1px solid var(--lab-line)}
.cl-i:first-child{border-top:0}
.cl-title{margin:0;font:700 18px/1.5 var(--font-family-display);overflow-wrap:anywhere}
.cl-meta{margin:0;font-size:15px;color:var(--text-secondary)}
.cl-actions{display:flex;flex-wrap:wrap;gap:10px}
.cl-frame{position:relative;aspect-ratio:16/9;background:var(--surface-sunken);border:1px solid var(--lab-line);border-radius:var(--radius-sm);overflow:hidden}
.cl-frame.short{aspect-ratio:9/16;max-width:300px}
.cl-frame>iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.cl-fail{position:absolute;left:0;right:0;bottom:0;margin:0;padding:10px 14px;background:rgba(0,0,0,.84);color:#fff;font-size:15px}
.cl-note{margin:8px 0 0;font-size:15px;color:var(--text-secondary)}
.cl-group .btn.sec:not(.sm){margin-top:12px}
.cl-err,.cl-empty{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;padding:16px 18px;max-width:760px;border-radius:var(--radius-md)}
.cl-err p,.cl-empty p{margin:0;flex:1 1 260px}
.cl-err{border:1px solid var(--brand-base);background:var(--lab-tint)}
.cl-empty{border:1px solid var(--lab-line);background:#fff}
.fc-priv{font-size:14px}
.fc-priv summary{display:inline-flex;align-items:center;min-height:44px;cursor:pointer;list-style:none;font:600 14px/1.4 var(--font-family-display);color:var(--text-secondary);text-decoration:underline;text-underline-offset:4px}
.fc-priv summary::-webkit-details-marker{display:none}
.fc-priv p{margin:0 0 8px;max-width:64ch;color:var(--text-secondary)}
/* content page */
.listen{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
.slgrid{display:grid;gap:16px;margin-top:20px}
.slc{display:grid;gap:12px;justify-items:start;align-content:start;padding:28px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-lg);box-shadow:0 18px 36px rgba(15,15,15,.06)}
.slc:first-child{background:#0F0F0F;border-color:#0F0F0F;color:#fff}
.slc:first-child p{color:#D8D6CF}
.slc:first-child .when{color:#fff}
.slc h3{font-size:30px;line-height:1.25}
.slc p{color:var(--text-secondary);max-width:52ch}
.slc .when{color:var(--text-primary)}
@media (min-width:960px){
  h1{font-size:44px}
  .topbar>div{padding:7px 80px}
  .top{padding:10px 80px}
  .top>.btn{margin-left:0}
  .tnav{display:flex;gap:4px;margin-left:12px}
  .tnav a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:var(--radius-pill);text-decoration:none;font:600 16px/1 var(--font-family-display);color:var(--text-secondary)}
  .tnav a:hover{color:var(--brand-base)}
  .tnav a.on{color:var(--brand-base);background:var(--lab-tint)}
  .tnav+.btn{margin-left:auto}
  .mnav{display:none}
  .foot-in{padding:44px 80px 48px}
  .foot-cols{grid-template-columns:2fr 2fr 1fr}
  .pgm{padding:0 80px}
  .pgm>section{padding:88px 0 0}
  .pgm>section:last-child{padding-bottom:96px}
  .hero{padding-top:72px!important}
  .pgm>.hero{padding-right:min(34vw,460px)}
  .hero h1{font-size:56px;line-height:1.3;max-width:20ch}
  .g-hero{display:block;top:56px;right:0;width:min(33vw,440px)}
  .lede{font-size:19px}
  .cta .btn{width:auto}
  .choose{max-width:760px}
  .choose li{grid-template-columns:1fr auto;align-items:center;gap:24px;padding:4px 20px}
  .course{grid-template-columns:5fr 4fr 3fr;gap:44px;padding:40px}
  .course h2{font-size:42px}
  .cmpsec h2,.team h2,.faq h2,.endcta h2{font-size:34px}
  .tbl-wrap{margin-top:24px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);padding:8px 20px}
  .cmp{display:table}
  .cmp tbody{display:table-row-group}
  .cmp tr{display:table-row;padding:0;border:0}
  .cmp thead{position:static;width:auto;height:auto;overflow:visible;clip:auto;display:table-header-group}
  .cmp th,.cmp td{display:table-cell;padding:14px 16px 14px 0;border-bottom:1px solid var(--lab-line)}
  .cmp thead th{font:800 17px/1.3 var(--font-family-display);border-bottom:1px solid var(--text-primary)}
  .cmp tbody th{width:150px;padding-bottom:14px;font-size:15px;color:var(--text-secondary)}
  .cmp td::before{content:none}
  .tiles{grid-template-columns:repeat(6,1fr);gap:16px}
  .tiles.s{grid-template-columns:repeat(5,1fr)}
  .qs{max-width:860px}
  .endcta{margin:0 -80px;padding:64px 80px!important}
  .pg2{grid-template-columns:5fr 7fr;gap:72px;padding-top:24px}
  .pph{position:sticky;top:96px}
  .pbody h1{font-size:64px;line-height:1.3}
  .stick .btn{width:auto;min-width:340px}
  .slgrid{grid-template-columns:1fr 1fr;gap:24px}
  .slc{padding:40px}
}
@media (max-width:700px){.topbar>div span+span{display:none}}
@media (prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  .q summary::after,.btn,.tile{transition:none}
  .gear img{animation:none!important}
  .gear[data-drop] img{opacity:1;scale:1;translate:0 0}
}
"""


# Meta Pixel (assets/js/meta-pixel.js holds the only Pixel ID; empty = nothing loads and this row stays hidden). Never on /book/.
PIXEL_ROW = '<div data-pixel-row hidden><button type="button" data-pixel-toggle>ปิดการวัดผลโฆษณา</button><span data-pixel-state aria-live="polite"></span></div>'
PIXEL_SCRIPT = '<script src="/assets/js/meta-pixel.js" defer></script>\n'



def minify_css(c):
    """strip comments and line breaks (inline tokens are big; every generated page must stay under the 80 KB check)"""
    c = re.sub(r"/\*.*?\*/", "", c, flags=re.S)
    c = re.sub(r"\s*\n\s*", "", c)
    return re.sub(r"\s*([{};])\s*", r"\1", c)


RACK = r'''<svg class="rack" viewBox="0 0 1200 176" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMax meet"><path class="rk-g" d="M0 168H1200"/><rect x="12" y="22" width="100" height="146" rx="10"/><circle cx="62" cy="112" r="34"/><circle cx="62" cy="112" r="10" class="rk-r"/><circle cx="62" cy="56" r="13"/><rect x="132" y="48" width="170" height="120" rx="10"/><circle cx="205" cy="110" r="44"/><circle cx="205" cy="110" r="5" class="rk-r"/><path d="M276 60l-44 44"/><circle cx="278" cy="58" r="5"/><rect x="262" y="132" width="26" height="24" rx="4"/><rect x="322" y="52" width="170" height="116" rx="10"/><rect x="344" y="62" width="126" height="26" rx="4"/><circle cx="407" cy="130" r="28"/><circle cx="407" cy="130" r="5" class="rk-r"/><rect x="336" y="100" width="20" height="14" rx="3"/><rect x="458" y="100" width="20" height="14" rx="3"/><rect x="512" y="48" width="176" height="120" rx="10"/><circle cx="542" cy="68" r="8"/><path d="M542 86v52"/><rect x="535" y="100" width="14" height="10" rx="2"/><circle cx="580" cy="68" r="8"/><path d="M580 86v52"/><rect x="573" y="112" width="14" height="10" rx="2" class="rk-rf"/><circle cx="618" cy="68" r="8"/><path d="M618 86v52"/><rect x="611" y="100" width="14" height="10" rx="2"/><circle cx="656" cy="68" r="8"/><path d="M656 86v52"/><rect x="649" y="112" width="14" height="10" rx="2"/><rect x="568" y="148" width="64" height="10" rx="5"/><rect x="608" y="145" width="12" height="16" rx="3" class="rk-rf"/><path d="M552 48a48 48 0 0 1 96 0"/><rect x="542" y="30" width="16" height="22" rx="6"/><rect x="642" y="30" width="16" height="22" rx="6"/><rect x="702" y="52" width="170" height="116" rx="10"/><rect x="724" y="62" width="126" height="26" rx="4"/><circle cx="787" cy="130" r="28"/><circle cx="787" cy="130" r="5" class="rk-r"/><rect x="716" y="100" width="20" height="14" rx="3"/><rect x="838" y="100" width="20" height="14" rx="3"/><rect x="890" y="68" width="300" height="100" rx="12"/><circle cx="952" cy="120" r="32"/><circle cx="1128" cy="120" r="32"/><circle cx="952" cy="120" r="5" class="rk-r"/><circle cx="1128" cy="120" r="5" class="rk-r"/><rect x="1002" y="100" width="14" height="14" rx="3"/><rect x="1022" y="100" width="14" height="14" rx="3"/><rect x="1042" y="100" width="14" height="14" rx="3"/><rect x="1062" y="100" width="14" height="14" rx="3"/><rect x="1002" y="120" width="14" height="14" rx="3"/><rect x="1022" y="120" width="14" height="14" rx="3"/><rect x="1042" y="120" width="14" height="14" rx="3"/><rect x="1062" y="120" width="14" height="14" rx="3"/><path d="M1002 82h76"/></svg>'''
CREDIT = ('ภาพเครื่อง DJ ตกแต่งเรนเดอร์จากโมเดล 3D: คอนโทรลเลอร์ "3D_DJ_Mixer0011" โดย Pravin 9271 (CC BY 4.0, ดัดแปลง) '
          'และโมเดลรูปทรงตามสเปก ไม่ใช่รูปสินค้าจริง')
NAV = [("คอร์สเรียน", "/courses/", "courses"), ("ทีมครู", "/courses/#teachers", "teachers"), ("จองห้องซ้อม", "/book/", "book")]  # Shop is appended below when --shop /shop/ ; Members when that page exists
if A.shop == "/shop/":
    NAV.insert(1, ("ร้านอุปกรณ์", "/shop/", "shop"))
GEAR_HERO = ('<div class="gear g-hero" data-gear data-drop data-speed=".06" data-depth="14">'
             '<img src="/assets/img/gear-controller.webp" width="647" height="359" alt="" decoding="async"></div>')


def shell(path, title, desc, body, robots=None, ld=None, script="", active="", css_extra=""):
    li = "".join(f'<a href="{h}"{" class=on aria-current=page" if k == active else ""}>{t}</a>' for t, h, k in NAV)
    strip = ('<div class="topbar"><div><span><b>ตัวแทนจำหน่ายอย่างเป็นทางการ</b> Pioneer DJ · AlphaTheta · NEO by OYAIDE</span>'
             '<span>Lido Connect ชั้น 2 สยามสแควร์ · เปิดทุกวัน 12:00–20:00</span></div></div>')
    top = (f'<a class="skip" href="#main">ข้ามไปเนื้อหาหลัก</a>{strip}'
           f'<header class="top"><a class="logo" href="/"><img src="/assets/img/logo-ink-252.png" srcset="/assets/img/logo-ink-252.png 1x, /assets/img/logo-ink-504.png 2x" '
           f'width="126" height="42" alt="DJ LAB SIAM — หน้าแรก"></a>'
           f'<nav class="tnav" aria-label="เมนูหลัก">{li}</nav>'
           f'<a class="btn pri sm" href="{LINE_ADD}" rel="noopener"><span class="dot"></span>ติดต่อ LINE</a>'
           f'<details class="mnav"><summary>เมนู</summary><nav aria-label="เมนูหลักบนมือถือ">{li}</nav></details>'
           f'<span class="xf" aria-hidden="true"><i></i></span></header>')
    foot = ('<footer class="foot"><div class="foot-in">'
            '<div class="foot-cta"><b>อยากได้เครื่อง หรืออยากเริ่มเรียน ทักมาคุยได้เลย</b>'
            f'<a class="btn pri" href="{LINE_ADD}" rel="noopener"><span class="dot"></span>ทักหาเราทาง LINE</a></div>'
            f'<div class="rackband">{RACK}</div>'
            '<div class="foot-cols"><div><b>DJ LAB SIAM</b><p>Lido Connect ชั้น 2, Siam Square Soi 3<br>ปทุมวัน กรุงเทพฯ 10330</p></div>'
            '<div><p>เปิด 12:00–20:00 น. ทุกวัน<br>02-252-5868 · 088-656-0464<br>LINE @djlabsiam</p></div>'
            '<div><a href="/privacy.html">นโยบายความเป็นส่วนตัว</a></div></div>' + PIXEL_ROW +
            f'<p class="credit">{CREDIT}</p></div></footer>')
    ldj = "".join(f'<script type="application/ld+json">{json.dumps(x, ensure_ascii=False).replace("</", "<" + chr(92) + "/")}</script>' for x in (ld or []))
    og = (f'<meta property="og:type" content="website"><meta property="og:url" content="{ORIGIN}{path}"><meta property="og:title" content="{E(title)}">'
          f'<meta property="og:description" content="{E(desc)}"><meta property="og:image" content="{ORIGIN}/og_image.png"><meta property="og:locale" content="th_TH">'
          f'<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{E(title)}"><meta name="twitter:description" content="{E(desc)}">'
          f'<meta name="twitter:image" content="{ORIGIN}/og_image.png">')
    fader = ("<script>(function(){var k=document.querySelector('.xf i');if(!k)return;function u(){var m=document.documentElement.scrollHeight-innerHeight;"
             "k.style.left=(m>0?Math.min(1,Math.max(0,scrollY/m))*100:0)+'%'}addEventListener('scroll',u,{passive:true});addEventListener('resize',u);u()})();</script>\n")
    return (f'<!DOCTYPE html>\n<!-- generated by tools/build_pages.py from bots/bot/shared/courses.json (md5 {MD5}) — do not edit by hand -->\n'
            f'<html lang="th" data-surface="light">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
            f'<title>{E(title)}</title>\n<meta name="description" content="{E(desc)}">\n'
            + (f'<meta name="robots" content="{robots}">\n' if robots else '')
            + f'<link rel="canonical" href="{ORIGIN}{path}">\n{og}\n<meta name="theme-color" content="#FFFFFF">\n'
            f'<link rel="icon" href="/favicon.ico" sizes="any">\n<link rel="icon" href="/favicon-512.png" type="image/png" sizes="512x512">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n'
            f'<link rel="preload" href="/book/fonts/noto-sans-thai-latin.woff2" as="font" type="font/woff2" crossorigin>\n'
            f'<link rel="preload" href="/book/fonts/noto-sans-thai-thai.woff2" as="font" type="font/woff2" crossorigin>\n'
            f'<style>\n{minify_css(FONTS + TOKENS + CSS + css_extra)}\n</style>\n{ldj}\n</head>\n<body>\n{top}\n<main id="main" class="pgm">{body}</main>\n{foot}\n{PIXEL_SCRIPT}'
            f'{fader}<script src="/assets/js/decor.js" defer></script>\n{script}</body>\n</html>\n')


# ───────── /courses/ ─────────
def cimg(c):
    im = CIMG.get(c["title"])
    if not im:
        return ""
    ws = sorted(int(w) for w in im["widths"])
    srcset = ", ".join(f"/assets/img/{im['base']}-{w}.webp {w}w" for w in ws)
    return (f'<figure class="cimg"><img src="/assets/img/{im["base"]}-{int(im["w"])}.webp" srcset="{srcset}" sizes="(min-width:960px) 424px, 92vw" '
            f'width="{int(im["w"])}" height="{int(im["h"])}" alt="{E(im["alt"])}" loading="lazy" decoding="async"></figure>')


def course_row(c, i):
    f = F[c["title"]]
    extra = ""
    if f["practice"]:
        extra = (f'<p class="plus"><b>รวมห้องซ้อมและอุปกรณ์ {f["practice"]} ชม.</b> · เวลารวม {f["learn"] + f["practice"]} ชม. '
                 f'(เรียน {f["learn"]} + ซ้อม {f["practice"]})</p>')
    bullets = "".join(f"<li>{E(b)}</li>" for b in c["bullets"] if not b.startswith("เวลารวม"))
    rec = '<span class="chip rec">สำหรับผู้เริ่มต้น</span>' if "ผู้เริ่มต้น" in c["audience"] else ""
    faces = "".join(f'<a class="face" href="/teachers/{slug(t)}/" aria-label="โปรไฟล์ {E(t)}"><span class="av">{photo(t, 52, "52px")}</span><span>{E(t)}</span></a>' for t in c["instructors"])
    pre = f'<div class="pre"><b>ก่อนเรียน</b><p>{E(c["prerequisite"])}</p></div>' if c.get("prerequisite") else ""
    tracks = ""
    if c.get("tracks"):
        items = "".join(f'<li><b>{E(t["name"])}</b>{(" — " + E(t["detail"])) if t.get("detail") else ""}</li>' for t in c["tracks"])
        tracks = f'<h3>สายที่เลือกเรียนได้</h3><ul class="tracks">{items}</ul>'
    return (f'<article class="course" id="{cid(c["title"])}">'
            f'<div class="c-a">{cimg(c)}<h2>{E(c["title"])}</h2>{rec}<p class="fit">{E(c["audience"])}</p>'
            f'<div class="spec"><div class="s1"><span class="k">เรียน</span><b>ตัวต่อตัว</b></div>'
            f'<div class="s2"><span class="k">เวลาเรียน</span><b>{f["sessions"]} ครั้ง × {f["per"]} ชม. = {f["learn"]} ชม.</b></div>'
            f'<div class="s3"><span class="k">ราคา</span><b class="price">{E(f["price"])}</b></div></div>{extra}</div>'
            f'<div class="c-b">{pre}{tracks}<h3>รายละเอียดคอร์ส</h3><ul class="bl">{bullets}</ul></div>'
            f'<div class="c-c"><h3>อาจารย์ผู้สอน</h3><p class="tpick">ไม่ต้องเลือกก็ได้ ร้านจัดอาจารย์ที่เหมาะกับคอร์สและเวลาว่างให้</p>'
            f'{line_btn("สนใจคอร์ส " + c["title"] + " ให้ร้านจัดอาจารย์ให้", "ทัก LINE · ให้ร้านจัดอาจารย์ให้")}'
            f'<h4 class="own">อยากเลือกอาจารย์เอง ดูโปรไฟล์ได้</h4><div class="faces">{faces}</div></div></article>')


def compare_table():
    heads = [short(c["title"]) for c in COURSES]
    ft = [F[c["title"]] for c in COURSES]
    rows_all = [
        ("ราคา", [E(f["price"]) for f in ft]),
        ("เวลาเรียน", [f'{f["sessions"]} ครั้ง × {f["per"]} ชม. = {f["learn"]} ชม.' for f in ft]),
        ("อายุคอร์ส", [E(f["life"].replace("อายุคอร์ส", "").strip()) for f in ft]),
        ("ก่อนเรียน", [E(c["prerequisite"]) if c.get("prerequisite") else "ไม่มี" for c in COURSES]),
        ("ห้องซ้อมและอุปกรณ์", [(f'รวม {f["practice"]} ชม.' if f["practice"] else "ไม่รวม") for f in ft]),
        ("เรียนบนอุปกรณ์", [E(f["equip"]) for f in ft]),
        ("สายที่เลือกเรียนได้", [(" · ".join((t.get("detail", "") if t["name"].startswith("เลือก") else t["name"]) for t in c.get("tracks") or []) or "—") for c in COURSES]),
        ("เนื้อหา", [E(f["content"]) if f["content"] else "ดูสายที่เลือกเรียนได้" for f in ft]),
        ("อาจารย์", [" · ".join(E(t) for t in c["instructors"]) for c in COURSES]),
    ]
    same, rows = [], []
    for label, cells in rows_all:
        if len(set(cells)) == 1:
            same.append((label, cells[0]))
        else:
            tds = "".join(f'<td data-label="{E(h)}"><span>{x}</span></td>' for h, x in zip(heads, cells))
            rows.append(f'<tr><th scope="row">{label}</th>{tds}</tr>')
    same_txt = " · ".join(["ตัวต่อตัว"] + [f"{l} {v}" for l, v in same])
    th = "".join(f'<th scope="col">{E(h)}</th>' for h in heads)
    return (f'<p class="same"><b>เหมือนกันทุกคอร์ส:</b> {same_txt}</p>'
            f'<div class="tbl-wrap"><table class="cmp"><caption class="vh">ข้อที่ต่างกันระหว่างคอร์ส</caption>'
            f'<thead><tr><th scope="col"><span class="vh">หัวข้อ</span></th>{th}</tr></thead><tbody>{"".join(rows)}</tbody></table></div>')


def tiles(cls="", small=False, exclude=None):
    out = ""
    for t in TEACHERS:
        n = t["name"]
        if n == exclude:
            continue
        tc = "" if small else f'<span class="tc">สอน: {E(" · ".join(short(x) for x in teaches[n]))}</span>'
        out += (f'<a class="tile{" sm" if small else ""}" href="/teachers/{slug(n)}/"><span class="tp">{photo(n, 320, "(min-width:960px) 16vw, 45vw")}</span>'
                f'<b>{E(n)}</b>{tc}</a>')
    return f'<div class="tiles{cls}">{out}</div>'


def courses_page():
    chooser = "".join(f'<li><span>{E(GOAL.get(c["title"], c["audience"]))}</span><a href="#{cid(c["title"])}">{E(c["title"])} {ic("arrow", 18)}</a></li>' for c in COURSES)
    shared = ""
    if SHARED_ALL:
        shared = (f'<p class="shared"><b>ทุกคอร์สเรียนตัวต่อตัว</b> · {F0["sessions"]} ครั้ง × {F0["per"]} ชม. = {F0["learn"]} ชม. · {E(F0["price"])} '
                  f'· เลือกวัน/เวลาเรียนได้ตามสะดวก</p>')
    faq = "".join(f'<details class="q"{" open" if i == 0 else ""}><summary>{E(q)}</summary><p>{E(a)}</p></details>' for i, (q, a) in enumerate(FAQ_RENDERED))
    body = (f'<section class="hero">{GEAR_HERO}<h1>คอร์สเรียน DJ ตัวต่อตัว</h1>'
            f'<p class="lede">เรียน DJ จากมืออาชีพตัวจริง เลือกวัน เลือกเวลา เลือกอุปกรณ์ได้ตามสะดวก</p>'
            f'<div class="cta">{line_btn("ขอคำแนะนำเลือกคอร์ส", "ทักหา LINE ให้ทีมช่วยเลือกคอร์ส")}<a class="btn sec" href="#compare">ดูตารางเทียบคอร์ส</a></div>{shared}</section>'
            f'<section class="choose" aria-labelledby="ch"><h2 id="ch">ไม่แน่ใจว่าเริ่มที่คอร์สไหน</h2><ul>{chooser}</ul></section>'
            f'<section class="courses" aria-label="คอร์สทั้งหมด">{"".join(course_row(c, i) for i, c in enumerate(COURSES))}</section>'
            f'<section class="cmpsec" id="compare"><h2>เทียบคอร์สทีละข้อ</h2>{compare_table()}</section>'
            f'<section class="team" id="teachers"><h2>ทีมครูผู้สอน</h2><p class="lede2">{E(D["instructors"]["intro"])} ไม่ต้องเลือกก็ได้ ร้านจัดอาจารย์ที่เหมาะกับคอร์สและเวลาว่างให้ · อยากเรียนกับท่านใด ดูโปรไฟล์แล้วเลือกได้</p>{tiles()}</section>'
            f'<section class="faq" id="faq"><h2>คำถามที่พบบ่อยเรื่องคอร์ส</h2><div class="qs">{faq}</div></section>'
            f'<section class="endcta"><h2>ยังไม่แน่ใจ? ทักมาคุยก่อนได้</h2><div class="cta">{line_btn("ขอคำแนะนำเลือกคอร์ส", "ทักหา LINE @djlabsiam")}'
            f'<a class="btn sec" href="tel:022525868">{ic("phone", 18)} โทร 02-252-5868</a></div></section>')
    names_ = ", ".join(short(c["title"]) for c in COURSES)
    desc = (f'คอร์สเรียน DJ ตัวต่อตัว {len(COURSES)} คอร์ส ({names_}) ราคา {F0["price"]} เรียน {F0["learn"]} ชั่วโมง เลือกวันและเวลาเรียนได้ '
            f'ที่ DJ LAB SIAM สยามสแควร์') if SHARED_ALL else "คอร์สเรียน DJ ตัวต่อตัว ที่ DJ LAB SIAM สยามสแควร์"
    ld = [{"@context": "https://schema.org", "@type": "FAQPage",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ_RENDERED]}]
    return shell("/courses/", "คอร์สเรียน DJ ตัวต่อตัว — DJ LAB SIAM สยามสแควร์", desc, body, ld=ld, active="courses")


# the chooser's short labels: my own abbreviation of each audience text (the owner sees them in the wording list); falls back to the full audience text
GOAL = {"Basic DJ Class": "เริ่มจาก 0 ก็เรียนได้", "Advance DJ Class": "DJ ที่ต้องการพัฒนาทักษะของตัวเอง",
        "Basic Scratch Class": "สนใจการสแครช", "Advance Scratch Class": "มีพื้นฐานการสแครชแล้ว"}


# ───────── /teachers/<name>/ ─────────
VIDEO_JS = """<script>
(function(){document.querySelectorAll('.fc-box[data-vid]').forEach(function(box){var b=box.querySelector('.fc-btn');if(!b)return;
b.addEventListener('click',function(){var id=box.getAttribute('data-vid');if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
box.classList.add('loading');var f=document.createElement('iframe');
f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';f.title=box.getAttribute('data-title');
f.allow='autoplay; encrypted-media; picture-in-picture';f.referrerPolicy='strict-origin-when-cross-origin';f.setAttribute('allowfullscreen','');
var t=setTimeout(function(){box.classList.remove('loading');box.classList.add('failed')},10000);
f.addEventListener('load',function(){clearTimeout(t);box.classList.remove('loading')});box.appendChild(f)})})})();
</script>
"""

PRIVACY_NOTE = ('<details class="fc-priv"><summary>ข้อมูลความเป็นส่วนตัวของวิดีโอ</summary>'
                '<p>ก่อนกดเล่น หน้านี้ไม่เรียกข้อมูลใดจาก YouTube เมื่อกดเล่น เบราว์เซอร์ของคุณจะเชื่อมต่อกับ YouTube (Google) เพื่อแสดงวิดีโอ โดยใช้โหมดความเป็นส่วนตัวขั้นสูง (youtube-nocookie.com) '
                'Google อาจเก็บข้อมูลการใช้งานตามนโยบายของ Google ร้านไม่ได้รับข้อมูลนั้น · <a href="/privacy.html">นโยบายความเป็นส่วนตัวของร้าน</a></p></details>')


def teacher_page(t):
    name = t["name"]
    s = slug(name)
    prof = PROFILES[name]
    chips = "".join(f'<a class="cchip" href="/courses/#{cid(x)}">{E(x)} {ic("arrow", 16)}</a>' for x in teaches[name])
    sections = f'<section><h2>คอร์สที่สอน</h2><div class="cchips">{chips}</div><p class="one">ทุกคอร์สเรียนตัวต่อตัว</p></section>'
    if prof.get("bio"):
        sections += f'<section><h2>เกี่ยวกับ {E(name)}</h2><p class="bio">{E(prof["bio"])}</p></section>'
    if prof.get("highlights"):
        sections += f'<section><h2>ผลงาน</h2><ul class="bl">{"".join("<li>" + E(h) + "</li>" for h in prof["highlights"])}</ul></section>'
    script = ""
    if prof.get("video_id"):
        sections += (f'<section><h2>วิดีโอแนะนำ</h2><div class="fc"><div class="fc-box" data-vid="{E(prof["video_id"])}" data-title="วิดีโอแนะนำ {E(name)}">'
                     f'<img src="/assets/img/{E(prof["poster"])}" width="1280" height="720" alt="" loading="lazy">'
                     f'<button class="fc-btn" type="button" aria-label="เล่นวิดีโอแนะนำของ {E(name)}">{ic("play", 28)}</button>'
                     f'<div class="fc-msg l" role="status">กำลังเชื่อมต่อ YouTube…</div>'
                     f'<div class="fc-msg e">{ic("alert")} เปิดวิดีโอในหน้านี้ไม่ได้<a class="btn sec sm" href="https://www.youtube.com/watch?v={E(prof["video_id"])}" rel="noopener">ดูบน YouTube {ic("ext", 16)}</a></div></div>'
                     f'{PRIVACY_NOTE}</div></section>')
        script = VIDEO_JS
    soc = t.get("social")
    if soc:
        host = urllib.parse.urlparse(soc).netloc.lower()
        label = "Instagram" if "instagram" in host else ("Linktree" if "linktr.ee" in host else "ลิงก์ของ " + name)
        sections += f'<section><h2>ติดตาม</h2><div><a class="btn sec sm" href="{E(soc)}" target="_blank" rel="noopener">{label} {ic("ext", 16)}</a></div></section>'
    sections += (f'<div class="stick"><p class="tpick">ไม่ต้องเลือกอาจารย์ก็ได้ ร้านจัดอาจารย์ที่เหมาะกับคอร์สและเวลาว่างให้</p>'
                 f'{line_btn("สนใจเรียน ให้ร้านจัดอาจารย์ให้", "ทัก LINE · ให้ร้านจัดอาจารย์ให้")}'
                 f'{line_btn("สนใจเรียนกับอาจารย์ " + name, "ขอเรียนกับอาจารย์ " + name, "sec")}</div>')
    body = (f'<nav class="crumb" aria-label="เส้นทาง"><a href="/courses/">คอร์สเรียน</a><span aria-hidden="true">/</span><a href="/courses/#teachers">ทีมครู</a>'
            f'<span aria-hidden="true">/</span><span aria-current="page">{E(name)}</span></nav>'
            f'<div class="pg2"><figure class="pph"><img src="/assets/img/teacher-{s}-cut-640.webp" srcset="/assets/img/teacher-{s}-cut-320.webp 320w, /assets/img/teacher-{s}-cut-640.webp 640w" '
            f'sizes="(min-width:960px) 40vw, 92vw" width="640" height="800" alt="{E(name)} อาจารย์ DJ LAB SIAM" fetchpriority="high" decoding="async"></figure>'
            f'<div class="pbody"><div class="pname"><h1>{E(name)}</h1><p class="role">{E(t["role"].replace(",", " ·"))}</p></div>{sections}</div></div>'
            f'<section class="others"><h2>อาจารย์ท่านอื่น</h2>{tiles(" s", True, exclude=name)}</section>')
    taught = ", ".join(teaches[name])
    return shell(f"/teachers/{s}/", f"{name} — อาจารย์ DJ LAB SIAM",
                 f"{name} สอน {taught} แบบตัวต่อตัว ที่ DJ LAB SIAM สยามสแควร์", body, script=script, active="teachers")


# ───────── /content/ ─────────
def book_backend():
    b = io.open(os.path.join(SITE, "book", "index.html"), encoding="utf-8").read()
    api, key = re.search(r"const API='(https://[a-z0-9.-]+\.supabase\.co/rest/v1/rpc/)'", b), re.search(r"const KEY='([A-Za-z0-9._-]+)'", b)
    if not (api and key):
        die("cannot read the Supabase address / anon key from book/index.html")
    return api.group(1), key.group(1)


CONTENT_JS = r"""<script>
(function(){
var API='@@API@@',KEY='@@KEY@@',PAGE=12,KINDS=[['podcast','Podcast'],['video','วิดีโอ'],['short','Shorts']];
var MONTH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
var status=document.getElementById('cl-status'),lists=document.getElementById('cl-lists');
if(!status||!lists)return;
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function thDate(iso){var d=new Date(iso);if(isNaN(d))return '';var t=new Date(d.getTime()+7*3600000);return t.getUTCDate()+' '+MONTH[t.getUTCMonth()]+' '+(t.getUTCFullYear()+543)}
function dur(s){if(typeof s!=='number'||!(s>0))return '';if(s<60)return s+' วินาที';var m=Math.round(s/60),h=Math.floor(m/60);return h?h+' ชม.'+(m%60?' '+(m%60)+' นาที':''):m+' นาที'}
async function rpc(args){var ctl=new AbortController(),to=setTimeout(function(){ctl.abort()},15000);
  try{var r=await fetch(API+'web_content_videos',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'},body:JSON.stringify(args),signal:ctl.signal});
    if(!r.ok)throw new Error('http '+r.status);var j=await r.json();if(!j||j.ok!==true||!Array.isArray(j.items))throw new Error('bad answer');return j}
  finally{clearTimeout(to)}}
function play(li,v,btn){
  var short=v.kind==='short',box=el('div','cl-frame'+(short?' short':'')),f=document.createElement('iframe'),msg=el('p','cl-fail','เปิดวิดีโอในหน้านี้ไม่ได้ ');
  var a=el('a','','ดูบน YouTube');a.href='https://www.youtube.com/watch?v='+v.id;a.target='_blank';a.rel='noopener';msg.appendChild(a);msg.hidden=true;
  f.src='https://www.youtube-nocookie.com/embed/'+v.id+'?autoplay=1&rel=0';f.title=v.title;
  f.allow='autoplay; encrypted-media; picture-in-picture';f.referrerPolicy='strict-origin-when-cross-origin';f.setAttribute('allowfullscreen','');
  var t=setTimeout(function(){msg.hidden=false},10000);f.addEventListener('load',function(){clearTimeout(t)});
  box.appendChild(f);box.appendChild(msg);btn.hidden=true;li.appendChild(box)}
function item(v){
  var li=el('li','cl-i');li.appendChild(el('p','cl-title',v.title));
  var meta=[thDate(v.published_at),dur(v.duration_s)].filter(Boolean).join(' · ');if(meta)li.appendChild(el('p','cl-meta',meta));
  var row=el('div','cl-actions'),btn=null;
  if(v.embeddable!==false){btn=el('button','btn pri sm','เล่นที่นี่');btn.type='button';btn.setAttribute('aria-label','เล่น: '+v.title);btn.addEventListener('click',function(){play(li,v,btn)});row.appendChild(btn)}
  var a=el('a','btn sec sm','ดูบน YouTube');a.href='https://www.youtube.com/watch?v='+v.id;a.target='_blank';a.rel='noopener';row.appendChild(a);li.appendChild(row);return li}
function validItems(j){return j.items.filter(function(v){return v&&typeof v.id==='string'&&/^[A-Za-z0-9_-]{11}$/.test(v.id)&&typeof v.title==='string'&&v.title})}
function makeGroup(kind,label){
  var box=el('section','cl-group'),ul=el('ul','cl-list'),more=el('button','btn sec','โหลดเพิ่ม'),note=el('p','cl-note');more.type='button';more.hidden=true;note.hidden=true;
  box.hidden=true;box.appendChild(el('h3','',label));box.appendChild(ul);box.appendChild(more);box.appendChild(note);lists.appendChild(box);
  var g={next:null,count:0,failed:false};
  g.load=async function(){
    var args={p_limit:PAGE,p_kind:kind};if(g.next){args.p_before=g.next.before;args.p_before_id=g.next.before_id}
    more.disabled=true;note.hidden=true;
    try{var j=await rpc(args);validItems(j).forEach(function(v){ul.appendChild(item(v));g.count++});
      g.next=j.next&&j.next.before&&j.next.before_id?j.next:null;g.failed=false;more.hidden=!g.next;box.hidden=g.count===0}
    catch(e){if(g.count){note.textContent='โหลดเพิ่มไม่สำเร็จ ลองกดอีกครั้ง';note.hidden=false;more.hidden=false}else g.failed=true}
    more.disabled=false};
  more.addEventListener('click',g.load);return g}
var groups=KINDS.map(function(k){return makeGroup(k[0],k[1])});
function banner(){status.textContent='';status.removeAttribute('role');
  var failed=groups.some(function(g){return g.failed}),total=groups.reduce(function(n,g){return n+g.count},0);
  if(failed){status.setAttribute('role','alert');var b=el('div','cl-err');b.appendChild(el('p','','โหลดรายการคลิปไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่'));
    var r=el('button','btn sec sm','ลองใหม่');r.type='button';r.addEventListener('click',start);b.appendChild(r);status.appendChild(b);return}
  if(!total){var e=el('div','cl-empty');e.appendChild(el('p','','ตอนนี้ยังไม่มีคลิปแสดงที่หน้านี้ ดูคลิปทั้งหมดได้ที่ช่อง YouTube ของ DJ LAB SIAM'));
    var a=el('a','btn pri','ดูคลิปทั้งหมดบน YouTube');a.href='https://www.youtube.com/@DJLABSIAM';a.target='_blank';a.rel='noopener';e.appendChild(a);status.appendChild(e)}}
async function start(){status.removeAttribute('role');status.textContent='กำลังโหลดรายการคลิป…';
  await Promise.all(groups.filter(function(g){return !g.count}).map(function(g){return g.load()}));banner()}
start();
})();
</script>
"""


CONTENT_NOTE = ('<details class="fc-priv"><summary>ข้อมูลความเป็นส่วนตัวของหน้านี้</summary>'
                '<p>รายการคลิปดึงจากฐานข้อมูลของร้านบน Supabase เมื่อเปิดหน้านี้ Supabase จะได้รับข้อมูลทางเทคนิคของคุณ เช่น หมายเลข IP และชนิดเบราว์เซอร์ '
                'ก่อนกดเล่น หน้านี้ไม่เรียกข้อมูลใดจาก YouTube เมื่อกด "เล่นที่นี่" เบราว์เซอร์ของคุณจะเชื่อมต่อกับ YouTube (Google) เพื่อแสดงวิดีโอ โดยใช้โหมดความเป็นส่วนตัวขั้นสูง (youtube-nocookie.com) '
                'Google อาจเก็บข้อมูลการใช้งานตามนโยบายของ Google ร้านไม่ได้รับข้อมูลนั้น · <a href="/privacy.html">นโยบายความเป็นส่วนตัวของร้าน</a></p></details>')


def content_page():
    cards = ""
    for p in PROGRAMS:
        inner = f'<h3>{E(p["name"])}</h3>'
        if p.get("when"):
            inner += f'<p class="when"><b>{E(p["when"])}</b></p>'
        if p.get("desc"):
            inner += f'<p>{E(p["desc"])}</p>'
        if p.get("link"):
            inner += f'<a class="btn pri" href="{E(p["link"])}" target="_blank" rel="noopener">{E(p.get("link_label", "ดูรายการ"))} {ic("ext", 18)}</a>'
        cards += f'<div class="slc">{inner}</div>'
    listen = "".join(f'<a class="btn {"pri" if i == 0 else "sec"}" href="{E(x["url"])}" target="_blank" rel="noopener">{E(x["label"])} {ic("ext", 18)}</a>' for i, x in enumerate(LISTEN))
    api, key = book_backend()
    body = (f'<section class="hero">{GEAR_HERO}<h1>วิดีโอและรายการจาก DJ LAB SIAM</h1>'
            f'<p class="lede">เทคนิค อุปกรณ์ และเรื่องราววงการ DJ จากทีมงานที่เป็น DJ จริง</p><div class="listen">{listen}</div></section>'
            f'<section><h2>รายการประจำ</h2><div class="slgrid">{cards}</div></section>'
            f'<section id="clips"><h2>คลิปล่าสุด</h2><div id="cl-status" aria-live="polite"></div><div id="cl-lists"></div>'
            f'<noscript><p class="lede2">ต้องเปิด JavaScript เพื่อดูรายการคลิปในหน้านี้ หรือ <a href="https://www.youtube.com/@DJLABSIAM" target="_blank" rel="noopener">ดูคลิปทั้งหมดที่ช่อง YouTube</a></p></noscript>{CONTENT_NOTE}</section>')
    return shell("/content/", "วิดีโอและรายการ — DJ LAB SIAM", "รายการประจำและคลิปจากทีม DJ LAB SIAM", body, robots="noindex,follow", active="content",
                 script=CONTENT_JS.replace("@@API@@", api).replace("@@KEY@@", key))


# ───────── / (home) ─────────
HOME_CSS = r"""
.hhero{display:grid;gap:36px;align-items:center}
.hhero h1{font-size:40px;line-height:1.3;max-width:15ch}
.hbadge{display:inline-flex;gap:8px;align-items:center;background:var(--lab-tint);color:#981C21;padding:8px 14px;border-radius:var(--radius-pill);font:600 14px/1.4 var(--font-family-body);margin-bottom:18px}
.hbadge i{width:8px;height:8px;border-radius:50%;background:var(--brand-base);display:block}
.hphoto{position:relative}
.hphoto .ph{border-radius:var(--radius-lg);overflow:hidden;aspect-ratio:4/3;background:#222;box-shadow:0 30px 60px rgba(15,15,15,.18);transform:rotate(1.2deg)}
.hphoto .ph img{width:100%;height:100%;object-fit:cover}
.htag{position:absolute;z-index:3;background:#fff;border-radius:var(--radius-md);padding:10px 16px 10px 34px;box-shadow:0 12px 24px rgba(15,15,15,.18);font:600 15px/1.4 var(--font-family-display)}
.htag::before{content:"";position:absolute;left:12px;top:50%;width:12px;height:12px;margin-top:-6px;border-radius:50%;border:3px solid var(--brand-base);background:#fff}
.htag small{display:block;font:400 13px/1.4 var(--font-family-body);color:var(--text-muted)}
.htag.a{left:-2%;bottom:10%;transform:rotate(-3deg)}
.htag.b{right:-2%;top:-6%;transform:rotate(2.5deg)}
.cdj{position:relative;margin:0;container-type:inline-size;border-radius:var(--radius-lg);overflow:hidden;background:#000;box-shadow:0 30px 60px rgba(15,15,15,.22)}
.cdj-img{display:block;width:100%;height:auto}
.cdj-scr{position:absolute;left:17.06%;top:16.45%;width:65.87%;height:59.78%;display:flex;flex-direction:column;background:#06080B;color:#EDEFF2;overflow:hidden;font-family:var(--font-family-body)}
.cdj-h{display:flex;align-items:center;gap:2cqw;padding:1.2cqw 2cqw;background:#10151C;border-bottom:1px solid #263040;font-size:max(10px,2.1cqw);line-height:1.3;white-space:nowrap}
.cdj-h b{font-family:var(--font-family-display);color:#fff;letter-spacing:.02em}
.cdj-h span{color:#8FA0B5;overflow:hidden;text-overflow:ellipsis}
.cdj-h em{margin-left:auto;font-style:normal;color:#5BA2FF;font-variant-numeric:tabular-nums}
.cdj-vp{position:relative;flex:1;min-height:0;overflow:hidden}
.cdj-l{margin:0;padding:0;list-style:none;height:100%;transition:transform .28s cubic-bezier(.16,1,.3,1)}
.cdj-l li{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:1.8cqw;align-content:center;height:25%;box-sizing:border-box;padding:0 2.4cqw;border-bottom:1px solid #151B24;cursor:pointer}
.cdj-l li i{grid-row:1/3;align-self:center;font:700 max(10px,1.9cqw)/1 var(--font-family-display);font-style:normal;color:#5C6B7E;font-variant-numeric:tabular-nums}
.cdj-l li b{font:600 max(11px,2.5cqw)/1.35 var(--font-family-display);color:#DCE2EA;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cdj-l li small{font-size:max(10px,1.95cqw);line-height:1.35;color:#7F8EA3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cdj-l li.on{background:linear-gradient(90deg,#1A56A8,#10305F)}
.cdj-l li.on i{color:#BFD9FF}.cdj-l li.on b{color:#fff}.cdj-l li.on small{color:#BFD3EE}
.cdj-sb{position:absolute;right:.6cqw;top:.8cqw;bottom:.8cqw;width:.7cqw;border-radius:2px;background:#151B24}
.cdj-sb i{position:absolute;left:0;right:0;border-radius:2px;background:#5BA2FF;transition:top .28s,height .28s}
.cdj-knob{position:absolute;left:90.84%;top:53.93%;width:12.5%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;cursor:ns-resize;touch-action:none;outline:none;-webkit-tap-highlight-color:transparent}
.cdj-knob::after{content:"";position:absolute;inset:-4%;border-radius:50%;border:2px solid rgba(221,70,76,.9);opacity:0;transform:scale(.7)}
.cdj-knob.hint::after{animation:cdjp 2.2s ease-out infinite}
@keyframes cdjp{0%{opacity:.95;transform:scale(.62)}100%{opacity:0;transform:scale(1.05)}}
.cdj-knob:focus-visible{box-shadow:0 0 0 3px #fff,0 0 0 6px var(--brand-base)}
.cdj-dial{position:absolute;left:19%;top:19%;width:62%;height:62%;border-radius:50%;transition:transform .28s cubic-bezier(.16,1,.3,1);
  background:repeating-conic-gradient(rgba(255,255,255,.16) 0 4deg,transparent 4deg 15deg)}
.cdj-dial::before{content:"";position:absolute;left:50%;top:6%;width:6%;height:20%;margin-left:-3%;border-radius:3px;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.6)}
.cdj-hint{margin:12px 0 0;font-size:14px;color:var(--text-secondary);text-align:center}
.gearrow{position:relative;z-index:3;margin:-8px 0 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:6px 4px;align-items:end}
.gearrow li{margin:0}
.gearrow figure{margin:0;transition:transform .35s cubic-bezier(.16,1,.3,1)}
.gearrow figure:hover{transform:translateY(-6px)}
.gearrow img{display:block;width:100%;height:auto;filter:drop-shadow(0 16px 18px rgba(15,15,15,.28))}
.gearrow figcaption{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hhero .lede{max-width:28em}
body{overflow-x:clip}
.hphoto .cdj{border-radius:0;box-shadow:none;background:transparent;
  -webkit-mask-image:linear-gradient(to top,transparent 0,#000 24%);mask-image:linear-gradient(to top,transparent 0,#000 24%)}
@media (min-width:960px){
  .hhero{grid-template-columns:minmax(0,1fr)!important;min-height:600px}
  .hhero>div:first-child{position:relative;z-index:4;max-width:520px}
  .hphoto{position:absolute!important;right:calc(50% - 50vw);top:-8px;width:min(56vw,860px);z-index:1}
  .hphoto .cdj{-webkit-mask-image:linear-gradient(to right,transparent 0,#000 22%),linear-gradient(to top,transparent 0,#000 24%);-webkit-mask-composite:source-in;
    mask-image:linear-gradient(to right,transparent 0,#000 22%),linear-gradient(to top,transparent 0,#000 24%);mask-composite:intersect}
  .cdj-hint{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .gearrow{display:flex;gap:0;margin-top:-72px;padding:0 4px}
  .gearrow li{flex:1 1 0;min-width:0}
}
@media (prefers-reduced-motion:reduce){.cdj-l,.cdj-dial,.cdj-sb i{transition:none}.cdj-knob.hint::after{animation:none}}
.rackband.lt{padding:32px 0 0}
.rackband.lt .rack *{stroke:#0F0F0F;fill:#fff}
.rackband.lt .rack path{fill:none}
.rackband.lt .rack .rk-g{fill:none}
.rackband.lt .rack .rk-r{stroke:var(--brand-base)}
.rackband.lt .rack .rk-rf{fill:var(--brand-base);stroke:var(--brand-base)}
.zones{display:grid;gap:14px;grid-template-columns:repeat(2,1fr);margin-top:28px}
.zone{display:flex;flex-direction:column;gap:6px;padding:20px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);text-decoration:none;transition:transform .35s cubic-bezier(.16,1,.3,1),border-color .2s,box-shadow .3s}
.zone:hover{transform:translateY(-4px);border-color:var(--text-primary);box-shadow:0 16px 28px rgba(15,15,15,.1)}
.zone b{font:800 24px/1.3 var(--font-family-display)}
.zone span{font-size:15px;color:var(--text-secondary);flex:1}
.zone i{font:600 15px/1.5 var(--font-family-display);font-style:normal;color:var(--brand-base)}
.hsec h2{font-size:30px}
.hsec .lede{margin-top:10px}
.eqgrid{display:grid;gap:14px;grid-template-columns:repeat(2,1fr);margin-top:28px}
.eq{background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);padding:18px 14px 16px;text-align:center;position:relative}
.eq::before{content:"";position:absolute;left:50%;top:9px;width:12px;height:12px;margin-left:-6px;border-radius:50%;border:2px solid var(--lab-line);background:var(--lab-paper)}
.eq svg{width:100%;max-width:118px;height:auto;margin:10px auto 6px;stroke:var(--text-primary);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.eq svg .r{stroke:var(--brand-base)}
.eq b{display:block;font:700 18px/1.4 var(--font-family-display)}
.brands{display:grid;gap:0;margin-top:28px;border-top:1px solid var(--text-primary)}
.brands div{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid var(--text-primary);font:800 24px/1.4 var(--font-family-display)}
.brands span{font:600 14px/1.4 var(--font-family-body);color:var(--text-secondary)}
.hcards{display:grid;gap:18px;margin-top:28px}
.hc{display:grid;gap:12px;padding:20px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-lg);box-shadow:0 18px 36px rgba(15,15,15,.06)}
.hc h3{font-size:24px;line-height:1.3}
.hc .fit{margin:0;color:var(--text-secondary);font-size:15px}
.hc .cimg{margin:0}
.hc .meta{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;font-size:15px;color:var(--text-secondary)}
.hc .meta b{font:800 24px/1.3 var(--font-family-display);color:var(--text-primary)}
.hc .acts{display:flex;flex-wrap:wrap;gap:10px;margin-top:2px}
.hsteps{display:grid;gap:16px;margin-top:28px}
.hs{position:relative;padding:22px 18px 18px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md)}
.hs::before{content:"";position:absolute;left:14px;right:14px;top:-7px;height:14px;background:var(--brand-base);transform:rotate(-1.4deg);border-radius:2px}
.hs i{font:800 40px/1.3 var(--font-family-display);font-style:normal}
.hs h3{margin:2px 0 4px;font-size:22px}
.hs p{color:var(--text-secondary);font-size:15px}
.hevent{display:grid;gap:14px;padding:26px;background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-lg)}
.hevent h3{font-size:24px;line-height:1.35}
.hevent p{color:var(--text-secondary);max-width:60ch}
.hlive{display:grid;gap:18px;padding:28px;background:#0F0F0F;color:#fff;border-radius:var(--radius-lg)}
.hlive h2{font-size:30px}
.hlive p{color:#D8D6CF;max-width:58ch}
.hlive .acts{display:flex;flex-wrap:wrap;gap:12px}
.hlive .btn.sec{background:transparent;border-color:#fff;color:#fff}
.hlive .btn.sec:hover{background:#fff;color:#0F0F0F}
.hvisit{display:grid;gap:20px}
.hvisit .ph{border-radius:var(--radius-lg);overflow:hidden;background:#222;aspect-ratio:16/9}
.hvisit .ph img{width:100%;height:100%;object-fit:cover}
.hvisit dl{display:grid;grid-template-columns:auto 1fr;gap:8px 18px;margin:16px 0 22px}
.hvisit dt{font-weight:700}
.hvisit dd{margin:0}
.hbot{display:grid;gap:12px;padding:18px 20px;background:var(--lab-paper);border-radius:var(--radius-md);color:var(--text-secondary);font-size:15px}
.hbot a{font-weight:700;color:var(--text-primary)}
@media (min-width:960px){
  .hhero{grid-template-columns:1.05fr 1fr;gap:64px}
  .hhero h1{font-size:58px;line-height:1.28;max-width:17ch}
  .pgm>.hero.hhero{padding-right:0}
  .zones{grid-template-columns:repeat(4,1fr)}
  .eqgrid{grid-template-columns:repeat(6,1fr)}
  .hsec h2{font-size:38px}
  .hcards{grid-template-columns:repeat(2,1fr)}
  .hsteps{grid-template-columns:repeat(4,1fr)}
  .hevent{grid-template-columns:1fr 1.3fr;align-items:center;padding:36px}
  .hlive{grid-template-columns:1.4fr 1fr;align-items:center;padding:44px}
  .hvisit{grid-template-columns:1.1fr 1fr;gap:56px;align-items:center}
  .hbot{grid-template-columns:repeat(3,auto);justify-content:space-between}
}
@media (min-width:1360px){.hcards{grid-template-columns:repeat(4,1fr)}}
@media (max-width:700px){.cdj-l li small{display:none}}
"""

SITE_ORG = {
    "@type": "Organization", "@id": ORIGIN + "/#org", "name": "DJ LAB SIAM", "legalName": "DJ LAB SIAM CO., LTD.", "url": ORIGIN + "/",
    "logo": ORIGIN + "/logo_full.png", "email": "djlabsiam@gmail.com", "telephone": "+66-2-252-5868",
    "sameAs": ["https://www.facebook.com/PioneerDjLabSiam/", "https://www.instagram.com/djlabsiam/", "https://www.youtube.com/@DJLABSIAM",
               "https://www.tiktok.com/@djlabsiam4", "https://discord.gg/VPnxXGuK8z", "https://maps.google.com/?cid=14947686714332238791"],
}
SITE_LOCAL = {
    "@type": ["MusicSchool", "Store"], "@id": ORIGIN + "/#local", "name": "DJ LAB SIAM",
    "description": "โรงเรียนสอน DJ ตัวต่อตัว และตัวแทนจำหน่ายอุปกรณ์ Pioneer DJ / AlphaTheta อย่างเป็นทางการ รวมถึงสายสัญญาณ NEO by OYAIDE",
    "url": ORIGIN + "/", "image": ORIGIN + "/logo_full.png", "telephone": "+66-2-252-5868", "email": "djlabsiam@gmail.com",
    "parentOrganization": {"@id": ORIGIN + "/#org"}, "hasMap": "https://maps.google.com/?cid=14947686714332238791",
    "address": {"@type": "PostalAddress", "streetAddress": "Lido Connect ชั้น 2, Siam Square Soi 3", "addressLocality": "ปทุมวัน",
                "addressRegion": "กรุงเทพมหานคร", "postalCode": "10330", "addressCountry": "TH"},
    "openingHoursSpecification": {"@type": "OpeningHoursSpecification",
                                  "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], "opens": "12:00", "closes": "20:00"},
    "priceRange": "฿฿",
    "brand": [{"@type": "Brand", "name": "Pioneer DJ"}, {"@type": "Brand", "name": "AlphaTheta"}, {"@type": "Brand", "name": "NEO by OYAIDE"}],
}
SITE_WEB = {"@type": "WebSite", "@id": ORIGIN + "/#website", "url": ORIGIN + "/", "name": "DJ LAB SIAM", "inLanguage": "th",
            "publisher": {"@id": ORIGIN + "/#org"}}
COURSE_LD_ID = {"Basic DJ Class": "course-beginner", "Advance DJ Class": "course-intermediate",
                "Basic Scratch Class": "course-turntablism", "Advance Scratch Class": "course-professional"}   # ids kept from the old page so nothing that links to them breaks

EQ_ITEMS = [("player", "CDJ / Player"), ("mixer", "Mixer"), ("controller", "Controller"), ("turntable", "Turntable"),
            ("headphones", "หูฟัง"), ("cable", "สายและอุปกรณ์เสริม")]
EQ_SYMBOLS = (
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
    '<symbol id="e-player" viewBox="0 0 120 90"><rect x="6" y="8" width="108" height="74" rx="10"/><circle cx="60" cy="52" r="22"/><circle class="r" cx="60" cy="52" r="5"/><rect x="30" y="14" width="60" height="12" rx="3"/></symbol>'
    '<symbol id="e-mixer" viewBox="0 0 120 90"><rect x="8" y="6" width="104" height="78" rx="10"/><path d="M30 22v46M52 22v46M74 22v46M96 22v46"/><rect class="r" x="25" y="50" width="10" height="8" rx="2"/><rect x="47" y="34" width="10" height="8" rx="2"/><rect x="69" y="46" width="10" height="8" rx="2"/><rect x="91" y="30" width="10" height="8" rx="2"/></symbol>'
    '<symbol id="e-controller" viewBox="0 0 120 90"><rect x="4" y="14" width="112" height="62" rx="10"/><circle cx="32" cy="46" r="17"/><circle cx="88" cy="46" r="17"/><path d="M52 30h16M52 40h16M52 50h16"/><circle class="r" cx="32" cy="46" r="3"/><circle class="r" cx="88" cy="46" r="3"/></symbol>'
    '<symbol id="e-turntable" viewBox="0 0 120 90"><rect x="8" y="6" width="104" height="78" rx="10"/><circle cx="52" cy="45" r="28"/><circle class="r" cx="52" cy="45" r="5"/><path d="M96 16l-6 36"/><circle cx="96" cy="16" r="4"/></symbol>'
    '<symbol id="e-headphones" viewBox="0 0 120 90"><path d="M22 54V44a38 38 0 0 1 76 0v10"/><rect x="14" y="50" width="20" height="30" rx="8"/><rect class="r" x="86" y="50" width="20" height="30" rx="8"/></symbol>'
    '<symbol id="e-cable" viewBox="0 0 120 90"><path d="M10 28h18v-8h14v16H28v-8M110 62H92v8H78V54h14v8"/><path class="r" d="M42 28c26 0 10 34 36 34"/></symbol>'
    '</svg>')


def home_faq_pairs():
    cfg = load(A.home_faq)
    by_id = {it["id"]: faq_text(it["a"]) for it in FAQ}
    qs = {it["id"]: it["q"] for it in FAQ}
    pairs = [(qs[i], by_id[i]) for i in cfg["ids"]]
    pairs += [(x["q"], x["a"]) for x in cfg["extra"]]
    return pairs


GEAR = [("vm-80", "Pioneer DJ", "VM-80"), ("cdj-3000x", "Pioneer DJ", "CDJ-3000X"), ("djm-a9", "Pioneer DJ", "DJM-A9"),
        ("xdj-az", "Pioneer DJ", "XDJ-AZ"), ("ddj-rev5", "Pioneer DJ", "DDJ-REV5"), ("ddj-flx10", "Pioneer DJ", "DDJ-FLX10")]   # the shop's own product photos (product-images bucket)
def _gear_sz():
    from PIL import Image
    out = []
    for f, b, n in GEAR:
        with Image.open(os.path.join(SITE, "assets", "img", f"cut-{f}.webp")) as im:
            out.append((f, b, n, im.width, im.height))
    return out


GEAR_SZ = _gear_sz()
NEWS = [("เปิดทุกวัน 12:00–20:00 น.", "Lido Connect ชั้น 2 สยามสแควร์ ซอย 3"),
        ("Sunday Live ทุกวันอาทิตย์ 18:30 น.", "ไลฟ์สดคุยเรื่อง DJ ทาง Facebook Page"),
        (f"คอร์สเรียนตัวต่อตัว {len(COURSES)} คอร์ส", "เริ่มจากศูนย์ก็เรียนได้ เลือกวันเวลาเองได้"),
        (f"ทีมครู Pro DJ {len(TEACHERS)} คน", "เลือกอาจารย์ตามสายที่อยากไป"),
        ("จองห้องซ้อมออนไลน์ได้", "ซ้อมกับเครื่องจริงที่ร้าน djlabsiam.com/book/"),
        ("ตัวแทนจำหน่ายอย่างเป็นทางการ", "Pioneer DJ · AlphaTheta · NEO by OYAIDE"),
        ("DJ LAB Open Format Contest", "จัดร่วมกับ AlphaTheta และ Mahajak"),
        ("ถามรุ่นและราคาทาง LINE @djlabsiam", "หรือโทร 02-252-5868 · 088-656-0464")]
HOME_JS = r"""<script>
(function(){
var k=document.getElementById('cdj-k'),l=document.getElementById('cdj-l');if(!k||!l)return;
var rows=[].slice.call(l.children),N=rows.length,d=document.getElementById('cdj-d'),sb=document.getElementById('cdj-sb'),cn=document.getElementById('cdj-n'),i=0,acc=0,drag=null,auto=null,
RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function stop(){k.classList.remove('hint');if(auto){clearInterval(auto);auto=null}}
function set(n,user){
  n=Math.max(0,Math.min(N-1,n));if(user)stop();
  rows[i].classList.remove('on');i=n;rows[i].classList.add('on');
  var vp=l.parentNode.clientHeight,h=vp/4,off=Math.max(0,Math.min(i-1,N-4));
  l.style.height=(N*h)+'px';rows.forEach(function(r){r.style.height=h+'px'});
  l.style.transform='translateY('+(-off*h)+'px)';d.style.transform='rotate('+(i*28)+'deg)';
  cn.textContent=(i+1)+'/'+N;k.setAttribute('aria-valuenow',i+1);k.setAttribute('aria-valuetext',rows[i].textContent);
  sb.style.height=(4/N*100)+'%';sb.style.top=(off/N*100)+'%'}
k.addEventListener('wheel',function(e){
  var dy=e.deltaMode===1?e.deltaY*40:e.deltaY,dir=dy>0?1:-1;
  if((dir>0&&i>=N-1)||(dir<0&&i<=0)){acc=0;return}
  e.preventDefault();acc+=dy;if(Math.abs(acc)>=50){set(i+(acc>0?1:-1),true);acc=0}},{passive:false});
k.addEventListener('keydown',function(e){var m={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1,Home:-N,End:N};
  if(e.key in m){e.preventDefault();set(i+m[e.key],true)}});
k.addEventListener('pointerdown',function(e){drag=e.clientY;try{k.setPointerCapture(e.pointerId)}catch(x){}stop()});
k.addEventListener('pointermove',function(e){if(drag===null)return;var dy=e.clientY-drag;if(Math.abs(dy)>=22){set(i+(dy>0?1:-1),true);drag=e.clientY}});
['pointerup','pointercancel'].forEach(function(t){k.addEventListener(t,function(){drag=null})});
rows.forEach(function(r,n){r.addEventListener('click',function(){set(n,true)})});
set(0);
if(!RM)auto=setInterval(function(){set(i>=N-1?0:i+1)},4200);
window.addEventListener('resize',function(){set(i)});
})();
</script>"""


def home_page():
    live = A.home == "/"
    pairs = home_faq_pairs()
    faq = "".join(f'<details class="q"{" open" if i == 0 else ""}><summary>{E(q)}</summary><p>{E(a)}</p></details>' for i, (q, a) in enumerate(pairs))
    zones = ("".join(f'<a class="zone" href="{h}"><b>{t}</b><span>{d}</span><i>{cta} →</i></a>' for t, h, d, cta in (
        ("คอร์สเรียน", "/courses/", f"{len(COURSES)} คอร์ส ตัวต่อตัว เริ่มจากศูนย์ก็เรียนได้", "ดูคอร์ส"),
        ("ทีมครู", "/courses/#teachers", f"Pro DJ {len(TEACHERS)} คน เลือกอาจารย์ตามสายที่อยากไป", "ดูทีมครู"),
        ("จองห้องซ้อม", "/book/", "ซ้อมกับเครื่องจริง จองเวลาออนไลน์ได้", "จองห้อง"),
        ("วิดีโอและรายการ", "/content/", "Sunday Live พอดแคสต์ และคลิปสอน", "ดูรายการ"))))
    eq = "".join(f'<div class="eq"><svg viewBox="0 0 120 90" aria-hidden="true"><use href="#e-{k}"/></svg><b>{E(t)}</b></div>' for k, t in EQ_ITEMS)
    cards = ""
    for c in COURSES:
        f = F[c["title"]]
        plus = f'<p class="fit"><b>รวมห้องซ้อมและอุปกรณ์ {f["practice"]} ชม.</b></p>' if f["practice"] else ""
        cards += (f'<article class="hc">{cimg(c)}<h3>{E(c["title"])}</h3><p class="fit">{E(GOAL.get(c["title"], c["audience"]))}</p>{plus}'
                  f'<p class="meta"><span>{f["sessions"]} ครั้ง × {f["per"]} ชม. = {f["learn"]} ชม.</span><b>{E(f["price"])}</b></p>'
                  f'<div class="acts"><a class="btn sec sm" href="/courses/#{cid(c["title"])}">ดูรายละเอียด</a>'
                  f'{line_btn("สนใจคอร์ส " + c["title"], "สอบถาม", "pri sm")}</div></article>')
    steps = "".join(f'<div class="hs"><i>{n}</i><h3>{E(t)}</h3><p>{E(d)}</p></div>' for n, t, d in (
        (1, "ทักมาคุย", "ทัก LINE @djlabsiam แจ้งระดับและเป้าหมาย ทีมงานจะแนะนำคอร์สที่เหมาะสม"),
        (2, "เลือกคอร์ส", "เลือกคอร์สที่ตรงกับระดับและเวลาที่มี"),
        (3, "นัดวันเรียน", "จัดตารางให้ตรงกับเวลาที่ว่าง เรียนที่ DJ LAB SIAM Lido Connect สยามสแควร์"),
        (4, "เริ่มเล่น", "เรียนบนอุปกรณ์จริงของโรงเรียน มีทีม Pro DJ ดูแลตลอดคอร์ส")))
    news = "".join(f'<li{" class=on" if k == 0 else ""}><i>{k + 1:02d}</i><b>{E(t)}</b><small>{E(d)}</small></li>' for k, (t, d) in enumerate(NEWS))
    gear = "".join(f'<li><figure><img src="/assets/img/cut-{f}.webp" width="{w}" height="{h}" alt="{E(b + " " + n)}" loading="lazy" decoding="async">'
                   f'<figcaption><small>{E(b)}</small>{E(n)}</figcaption></figure></li>' for f, b, n, w, h in GEAR_SZ)
    body = (
        EQ_SYMBOLS +
        f'<section class="hero hhero"><div><span class="hbadge"><i></i>ตัวแทนจำหน่ายอย่างเป็นทางการ · Lido Connect สยามสแควร์</span>'
        f'<h1>ซื้อ เรียน ซ้อม พร้อม DJ ในที่เดียวกับ <span class="lab">DJ LAB</span></h1>'
        f'<p class="lede">ร้านอุปกรณ์ DJ ที่มีโรงเรียน ห้องซ้อม และคนที่รักดีเจ อยู่ใต้หลังคาเดียวกัน ทีมงานทุกคนเป็น DJ ที่ไม่ใช่แค่เล่นเป็น แต่รักในการดีเจจริงๆ</p>'
        f'<div class="cta">{line_btn("สนใจอุปกรณ์/คอร์สของ DJ LAB SIAM", "ทัก LINE ถามราคา")}<a class="btn sec" href="/courses/">ดูคอร์สเรียน</a></div></div>'
        f'<div class="hphoto"><figure class="cdj" id="cdj">'
        f'<img class="cdj-img" src="/assets/img/home-cdj-top.webp" width="797" height="547" alt="ส่วนบนของ Pioneer DJ CDJ-3000X จอสัมผัสขนาดใหญ่และปุ่ม Browse" fetchpriority="high" decoding="async">'
        f'<div class="cdj-scr"><div class="cdj-h"><b>DJ LAB SIAM</b><span>ข่าวจากร้าน</span><em id="cdj-n">1/{len(NEWS)}</em></div>'
        f'<div class="cdj-vp"><ol class="cdj-l" id="cdj-l">{news}</ol><div class="cdj-sb" aria-hidden="true"><i id="cdj-sb"></i></div></div></div>'
        f'<div class="cdj-knob hint" id="cdj-k" role="slider" tabindex="0" aria-label="ปุ่ม Browse เลื่อนอ่านข่าวจากร้าน" aria-valuemin="1" aria-valuemax="{len(NEWS)}" aria-valuenow="1">'
        f'<div class="cdj-dial" id="cdj-d"></div></div></figure>'
        f'<p class="cdj-hint">เลื่อนล้อเมาส์บนปุ่ม Browse (หรือลากขึ้น-ลงบนมือถือ) เพื่ออ่านข่าวจากร้าน</p>'
        f'</div>'
        f'</section>'
        f'<section><ul class="gearrow" aria-label="ตัวอย่างอุปกรณ์ที่ร้านมีจำหน่าย">{gear}</ul><div class="zones">{zones}</div></section>'
        f'<section class="hsec" id="equipment"><h2>อุปกรณ์ DJ ตัวแทนจำหน่ายอย่างเป็นทางการ</h2>'
        f'<p class="lede">สินค้าครบ ทั้ง CDJ Player, DJM Mixer, Controller, หูฟัง และสายสัญญาณคุณภาพสูง พร้อมรับประกันจากผู้ผลิต ถามรุ่นและราคาได้ทาง LINE</p>'
        f'<div class="eqgrid">{eq}</div>'
        f'<div class="brands"><div>Pioneer DJ <span>Authorized</span></div><div>AlphaTheta <span>Authorized</span></div><div>NEO by OYAIDE <span>Official</span></div></div>'
        f'<div class="cta">{line_btn("สนใจอุปกรณ์ DJ ขอรุ่นและราคา", "ถามรุ่นและราคาทาง LINE")}</div></section>'
        f'<section class="hsec" id="courses"><h2>เรียน DJ ตัวต่อตัวกับ Pro DJ</h2>'
        f'<p class="lede">ทุกคอร์สเรียนตัวต่อตัว {F0["sessions"]} ครั้ง × {F0["per"]} ชม. = {F0["learn"]} ชม. เลือกวันและเวลาเรียนได้ตามสะดวก</p>'
        f'<div class="hcards">{cards}</div></section>'
        f'<section class="hsec" id="steps"><h2>เริ่มต้นง่ายใน 4 ขั้นตอน</h2><div class="hsteps">{steps}</div></section>'
        f'<section class="hsec team" id="teachers"><h2>ทีมครูผู้สอน</h2><p class="lede">{E(D["instructors"]["intro"])}</p>{tiles()}</section>'
        f'<section class="hsec"><div class="hevent"><h3>DJ LAB Open Format Contest ร่วมกับ AlphaTheta และ Mahajak</h3>'
        f'<p>DJ LAB SIAM เป็นผู้จัดการแข่งขัน DJ ระดับประเทศ ร่วมกับ AlphaTheta และ Mahajak ไม่ใช่แค่โรงเรียน แต่เป็นศูนย์กลางของคนรัก DJ</p></div></section>'
        f'<section class="hsec"><div class="hlive"><div><h2>Sunday Live ทุกวันอาทิตย์ 18:30 น.</h2>'
        f'<p>ไลฟ์สดคุยเรื่อง DJ ทุกมิติ เทคนิค อุปกรณ์ วงการ และตอบคำถามกับทีม DJ LAB SIAM ทาง Facebook Page</p></div>'
        f'<div class="acts"><a class="btn pri" href="https://www.facebook.com/PioneerDjLabSiam/" target="_blank" rel="noopener">ติดตามบน Facebook {ic("ext", 18)}</a>'
        f'<a class="btn sec" href="/content/">ดูรายการทั้งหมด</a></div></div></section>'
        f'<section class="hsec"><div class="hvisit"><div class="ph"><img src="/assets/img/location-wide.webp" width="1600" height="587" alt="หน้าร้าน DJ LAB SIAM ที่ Lido Connect ชั้น 2" loading="lazy" decoding="async"></div>'
        f'<div><h2>แวะมาที่ร้านได้เลย</h2><dl><dt>ที่อยู่</dt><dd>Lido Connect ชั้น 2, Siam Square Soi 3 ปทุมวัน กรุงเทพฯ 10330</dd>'
        f'<dt>เปิด</dt><dd>ทุกวัน 12:00–20:00 น.</dd><dt>โทร</dt><dd><a href="tel:022525868">02-252-5868</a> · <a href="tel:0886560464">088-656-0464</a></dd></dl>'
        f'<div class="cta"><a class="btn pri" href="https://maps.google.com/?cid=14947686714332238791" target="_blank" rel="noopener">เปิดแผนที่ {ic("ext", 18)}</a>'
        f'<a class="btn sec" href="/book/">จองห้องซ้อม</a></div></div></div></section>'
        f'<section class="hsec faq" id="faq"><h2>คำถามที่พบบ่อย</h2><div class="qs">{faq}</div></section>'
        f'<section class="endcta"><h2>อยากได้เครื่อง หรืออยากเริ่มเรียน ทักมาคุยได้เลย</h2><div class="cta">{line_btn("ขอคำแนะนำจาก DJ LAB SIAM", "ทักหา LINE @djlabsiam")}'
        f'<a class="btn sec" href="tel:022525868">{ic("phone", 18)} โทร 02-252-5868</a></div></section>')
    graph = [SITE_ORG, SITE_LOCAL, SITE_WEB]
    for c in COURSES:
        f = F[c["title"]]
        graph.append({"@type": "Course", "@id": f"{ORIGIN}/#{COURSE_LD_ID.get(c['title'], cid(c['title']))}", "name": c["title"],
                      "description": f'{c["audience"]} · เรียนตัวต่อตัว {f["sessions"]} ครั้ง × {f["per"]} ชม. = {f["learn"]} ชม.',
                      "provider": {"@id": ORIGIN + "/#org"},
                      "hasCourseInstance": {"@type": "CourseInstance", "courseMode": "Onsite", "location": {"@id": ORIGIN + "/#local"}}})
    ld = [{"@context": "https://schema.org", "@graph": graph},
          {"@context": "https://schema.org", "@type": "FAQPage", "@id": ORIGIN + "/#faqpage",
           "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in pairs]}]
    title = "DJ LAB SIAM — โรงเรียนสอน DJ & Authorized Pioneer DJ Dealer"
    desc = "เรียน DJ จากมืออาชีพตัวจริง ตัวแทนจำหน่ายอุปกรณ์ Pioneer DJ และ AlphaTheta อย่างเป็นทางการ Lido Connect Siam Square"
    return shell(A.home, title, desc, body, robots=None if live else "noindex,follow", ld=ld, active="", script=HOME_JS, css_extra=HOME_CSS)



# ───────── /shop/ ─────────
SHOP_CSS = r"""
.shead h1{max-width:16ch}
.sbar{display:grid;gap:14px;margin-top:28px}
.schips{display:flex;flex-wrap:wrap;gap:8px}
.schip{min-height:44px;padding:0 16px;border:1.5px solid var(--lab-line);border-radius:var(--radius-pill);background:#fff;font:600 15px/1 var(--font-family-display);cursor:pointer;color:var(--text-primary)}
.schip:hover{border-color:var(--text-primary)}
.schip[aria-pressed="true"]{background:var(--text-primary);color:#fff;border-color:var(--text-primary)}
.stools{display:flex;flex-wrap:wrap;gap:12px 20px;align-items:center;font-size:15px;color:var(--text-secondary)}
.stools label{display:inline-flex;align-items:center;gap:8px;min-height:44px}
.stools select{min-height:44px;padding:0 12px;border:1.5px solid var(--lab-line);border-radius:var(--radius-sm);background:#fff;font:500 15px var(--font-family-body)}
.stools input[type=checkbox]{width:20px;height:20px;accent-color:var(--brand-base)}
.scount{margin-top:14px;color:var(--text-secondary);font-size:15px}
.sgrid{display:grid;gap:14px;grid-template-columns:repeat(2,1fr);margin-top:14px}
.pc{background:#fff;border:1px solid var(--lab-line);border-radius:var(--radius-md);overflow:hidden;display:flex;flex-direction:column;transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .3s,border-color .2s}
.pc:hover{transform:translateY(-4px);border-color:var(--text-primary);box-shadow:0 16px 28px rgba(15,15,15,.1)}
.pc .art{position:relative;aspect-ratio:4/3;display:grid;place-items:center;overflow:hidden;background-color:#FAF9F6;
  background-image:linear-gradient(rgba(15,15,15,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(15,15,15,.05) 1px,transparent 1px);background-size:20px 20px}
.pc .art img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:12px;mix-blend-mode:multiply}
.pc .art svg{width:56%;height:auto;stroke:var(--text-primary);fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.pc .art svg .r{stroke:var(--brand-base)}
.stk{position:absolute;left:10px;top:10px;z-index:2;font:600 13px/1.4 var(--font-family-body);padding:3px 10px;border-radius:var(--radius-pill);background:#fff;box-shadow:0 2px 6px rgba(15,15,15,.14)}
.stk.in{color:var(--status-active-text)}
.stk.out{color:var(--text-muted)}
.pc .b{padding:14px 16px 16px;display:flex;flex-direction:column;gap:2px;flex:1}
.pc .br{font:600 13px/1.4 var(--font-family-body);color:var(--text-muted)}
.pc h3{font-size:18px;line-height:1.35}
.pc .pr{font:800 22px/1.4 var(--font-family-display);margin-top:2px}
.pc .btn{margin-top:auto;align-self:flex-start}
.pc .bwrap{margin-top:auto;padding-top:10px}
.snote{margin-top:24px;color:var(--text-secondary);font-size:15px;max-width:70ch}
.serr{padding:16px 18px;border:1px solid var(--brand-base);background:var(--lab-tint);border-radius:var(--radius-md);margin-top:14px}
@media (min-width:960px){.sgrid{grid-template-columns:repeat(4,1fr);gap:18px}.stools{justify-content:flex-start}}
@media (max-width:420px){.sgrid{grid-template-columns:1fr}}
"""

SHOP_JS = r"""<script>
(function(){
var REST='@@REST@@',KEY='@@KEY@@',IMG='@@IMG@@',LINE='https://line.me/R/oaMessage/%40djlabsiam/?',PAGE=24;
var LABEL={player:'CDJ / Player',mixer:'Mixer','all-in-one':'All-in-one',controller:'Controller',turntable:'Turntable',headphones:'หูฟัง',speaker:'ลำโพง',cable:'สาย',accessory:'อุปกรณ์เสริม'};
var CATMAP={'cdj':'player','เครื่องเล่น':'player','มิกซ์เซอร์':'mixer','mixer':'mixer','all in one':'all-in-one','คอนโทลเลอร์':'controller','คอนโทรลเลอร์':'controller','midi':'controller','หูฟัง':'headphones','ลำโพง':'speaker','cable':'cable','deck cover':'accessory','flash drive':'accessory'};
var ROWS=[],cat='all',sort='p-desc',only=false,shown=PAGE;
var grid=document.getElementById('sgrid'),count=document.getElementById('scount'),more=document.getElementById('smore'),NS='http://www.w3.org/2000/svg';
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function baht(n){return '฿'+Number(n).toLocaleString('en-US')}
function group(p){if(p.bot_category&&LABEL[p.bot_category])return p.bot_category;return CATMAP[String(p.category||'').toLowerCase().trim()]||'accessory'}
function brand(b){return (!b||b==='Other')?'แบรนด์อื่น':String(b)}
function icon(g){var s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 120 90');s.setAttribute('aria-hidden','true');
  var u=document.createElementNS(NS,'use');u.setAttribute('href','#p-'+g);s.appendChild(u);return s}
function fit(im){
  try{var W=im.naturalWidth,H=im.naturalHeight;if(!W||!H)return;
    var k=Math.min(1,160/Math.max(W,H)),w=Math.max(2,Math.round(W*k)),h=Math.max(2,Math.round(H*k)),c=document.createElement('canvas');c.width=w;c.height=h;
    var x=c.getContext('2d');x.drawImage(im,0,0,w,h);var D=x.getImageData(0,0,w,h).data,bg=[0,0,0],cs=[0,w-1,(h-1)*w,h*w-1],i,j,t;
    for(i=0;i<4;i++)for(j=0;j<3;j++)bg[j]+=D[cs[i]*4+j]/4;
    var x0=w,x1=-1,y0=h,y1=-1;
    for(var yy=0;yy<h;yy++)for(var xx=0;xx<w;xx++){t=(yy*w+xx)*4;
      if(Math.max(Math.abs(D[t]-bg[0]),Math.abs(D[t+1]-bg[1]),Math.abs(D[t+2]-bg[2]))>90){if(xx<x0)x0=xx;if(xx>x1)x1=xx;if(yy<y0)y0=yy;if(yy>y1)y1=yy}}
    if(x1<0)return;var bu=(x1-x0+1)/w,bv=(y1-y0+1)/h;if(bu*bv<.04)return;
    var r=W/H,wd0=Math.min(1,.75*r),wd=Math.min(.88/bu,.66*r/bv,wd0*3);if(wd<wd0*1.06)return;
    var hd=wd/r,cu=(x0+x1+1)/2/w,cv=(y0+y1+1)/2/h,s=im.style;
    s.inset='auto';s.padding='0';s.maxWidth='none';s.objectFit='fill';
    s.width=(wd*100)+'%';s.height=(hd/.75*100)+'%';s.left=((.5-cu*wd)*100)+'%';s.top=((.375-cv*hd)/.75*100)+'%'}
  catch(e){}}
function card(p){
  var a=el('article','pc'),art=el('div','art'),ok=typeof p.image_path==='string'&&/^[A-Za-z0-9._\/-]{5,200}$/.test(p.image_path)&&p.image_path.indexOf('..')<0;
  if(ok){var im=document.createElement('img');im.crossOrigin='anonymous';im.src=IMG+p.image_path;im.alt=p.name;im.loading='lazy';im.decoding='async';
    im.addEventListener('load',function(){fit(im)});
    im.addEventListener('error',function(){im.remove();art.appendChild(icon(p.g))});art.appendChild(im)}
  else art.appendChild(icon(p.g));
  var st=el('span','stk '+(p.in_stock?'in':'out'),p.in_stock?'มีของ':'สอบถามสต็อก');art.appendChild(st);a.appendChild(art);
  var b=el('div','b');b.appendChild(el('span','br',brand(p.brand)));b.appendChild(el('h3','',p.name));b.appendChild(el('span','pr',baht(p.price)));
  var w=el('div','bwrap'),l=el('a','btn sec sm','ถามทาง LINE');l.href=LINE+encodeURIComponent('สนใจ '+p.name);l.rel='noopener';w.appendChild(l);b.appendChild(w);a.appendChild(b);return a}
function render(){
  var rows=ROWS.filter(function(p){return (cat==='all'||p.g===cat)&&(!only||p.in_stock)});
  rows.sort(function(a,b){return sort==='p-desc'?b.price-a.price:sort==='p-asc'?a.price-b.price:a.name.localeCompare(b.name)});
  var list=rows.slice(0,shown);grid.textContent='';list.forEach(function(p){grid.appendChild(card(p))});
  count.textContent='แสดง '+list.length+' จาก '+rows.length+' รายการ';more.hidden=rows.length<=list.length}
Array.prototype.forEach.call(document.querySelectorAll('.schip'),function(c){c.addEventListener('click',function(){
  cat=c.getAttribute('data-cat');shown=PAGE;Array.prototype.forEach.call(document.querySelectorAll('.schip'),function(x){x.setAttribute('aria-pressed',x===c?'true':'false')});render()})});
document.getElementById('ssort').addEventListener('change',function(e){sort=e.target.value;shown=PAGE;render()});
document.getElementById('sstock').addEventListener('change',function(e){only=e.target.checked;shown=PAGE;render()});
more.addEventListener('click',function(){shown+=PAGE;render()});
function load(){count.textContent='กำลังโหลดรายการสินค้า…';
  fetch(REST+'?select=id,name,brand,category,bot_category,price,in_stock,image_path&price=gt.0&order=price.desc&limit=500',{headers:{apikey:KEY,Authorization:'Bearer '+KEY}})
  .then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.json()})
  .then(function(d){if(!Array.isArray(d))throw new Error('bad');ROWS=d.filter(function(p){return p&&typeof p.name==='string'&&p.name&&Number(p.price)>0}).map(function(p){p.price=Number(p.price);p.g=group(p);return p});render()})
  .catch(function(){count.textContent='';var e=el('div','serr');e.setAttribute('role','alert');e.appendChild(el('p','','โหลดรายการสินค้าไม่สำเร็จ ลองใหม่อีกครั้ง หรือถามทีมงานทาง LINE @djlabsiam'));
    var r=el('button','btn sec sm','ลองใหม่');r.type='button';r.addEventListener('click',function(){e.remove();load()});e.appendChild(r);count.parentNode.insertBefore(e,grid)})}
load();
})();
</script>
"""

SHOP_SYMBOLS = (
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
    '<symbol id="p-player" viewBox="0 0 120 90"><rect x="6" y="8" width="108" height="74" rx="10"/><circle cx="60" cy="52" r="22"/><circle class="r" cx="60" cy="52" r="5"/><rect x="30" y="14" width="60" height="12" rx="3"/></symbol>'
    '<symbol id="p-mixer" viewBox="0 0 120 90"><rect x="8" y="6" width="104" height="78" rx="10"/><path d="M30 22v46M52 22v46M74 22v46M96 22v46"/><rect class="r" x="25" y="50" width="10" height="8" rx="2"/><rect x="47" y="34" width="10" height="8" rx="2"/><rect x="69" y="46" width="10" height="8" rx="2"/><rect x="91" y="30" width="10" height="8" rx="2"/></symbol>'
    '<symbol id="p-controller" viewBox="0 0 120 90"><rect x="4" y="14" width="112" height="62" rx="10"/><circle cx="32" cy="46" r="17"/><circle cx="88" cy="46" r="17"/><path d="M52 30h16M52 40h16M52 50h16"/><circle class="r" cx="32" cy="46" r="3"/><circle class="r" cx="88" cy="46" r="3"/></symbol>'
    '<symbol id="p-all-in-one" viewBox="0 0 120 90"><rect x="4" y="10" width="112" height="70" rx="10"/><circle cx="26" cy="52" r="15"/><circle cx="94" cy="52" r="15"/><rect x="40" y="18" width="40" height="16" rx="3"/><path d="M42 48v22M52 48v22M62 48v22M72 48v22M80 48v22"/><circle class="r" cx="26" cy="52" r="3"/></symbol>'
    '<symbol id="p-turntable" viewBox="0 0 120 90"><rect x="8" y="6" width="104" height="78" rx="10"/><circle cx="52" cy="45" r="28"/><circle class="r" cx="52" cy="45" r="5"/><path d="M96 16l-6 36"/><circle cx="96" cy="16" r="4"/></symbol>'
    '<symbol id="p-headphones" viewBox="0 0 120 90"><path d="M22 54V44a38 38 0 0 1 76 0v10"/><rect x="14" y="50" width="20" height="30" rx="8"/><rect class="r" x="86" y="50" width="20" height="30" rx="8"/></symbol>'
    '<symbol id="p-speaker" viewBox="0 0 120 90"><rect x="28" y="4" width="64" height="82" rx="10"/><circle cx="60" cy="30" r="9"/><circle class="r" cx="60" cy="60" r="16"/></symbol>'
    '<symbol id="p-cable" viewBox="0 0 120 90"><path d="M10 28h18v-8h14v16H28v-8M110 62H92v8H78V54h14v8"/><path class="r" d="M42 28c26 0 10 34 36 34"/></symbol>'
    '<symbol id="p-accessory" viewBox="0 0 120 90"><rect x="14" y="24" width="92" height="46" rx="8"/><path d="M30 24v-8h60v8M34 40h20M34 52h32"/><circle class="r" cx="88" cy="46" r="9"/></symbol>'
    '</svg>')


def shop_page():
    live = A.shop == "/shop/"
    api, key = book_backend()
    origin = re.match(r"https://[a-z0-9.-]+\.supabase\.co", api).group(0)
    rest = origin + "/rest/v1/web_products"
    img = origin + "/storage/v1/object/public/product-images/"
    cats = [("all", "ทั้งหมด"), ("player", "CDJ / Player"), ("mixer", "Mixer"), ("all-in-one", "All-in-one"), ("controller", "Controller"),
            ("turntable", "Turntable"), ("headphones", "หูฟัง"), ("speaker", "ลำโพง"), ("cable", "สาย"), ("accessory", "อุปกรณ์เสริม")]
    chips = "".join(f'<button class="schip" type="button" data-cat="{k}" aria-pressed="{"true" if k == "all" else "false"}">{E(t)}</button>' for k, t in cats)
    body = (SHOP_SYMBOLS +
            f'<section class="hero shead"><h1>Showroom อุปกรณ์ DJ</h1>'
            f'<p class="lede">ราคาอ่านสดจากระบบร้าน รวม VAT 7% แล้ว เลือกดูตามประเภท แล้วแวะมาลองเครื่องจริงที่ร้านได้เลย</p>'
            f'<div class="cta">{line_btn("สนใจอุปกรณ์ DJ ขอรุ่นและราคา", "ถามรุ่นและราคาทาง LINE")}<a class="btn sec" href="/courses/">ดูคอร์สเรียน</a></div></section>'
            f'<section id="catalog" aria-label="รายการสินค้า"><div class="sbar"><div class="schips" role="group" aria-label="ประเภทสินค้า">{chips}</div>'
            f'<div class="stools"><label><input type="checkbox" id="sstock"> เฉพาะที่มีของ</label>'
            f'<label>เรียงตาม <select id="ssort"><option value="p-desc">ราคาสูง → ต่ำ</option><option value="p-asc">ราคาต่ำ → สูง</option><option value="m">ชื่อรุ่น</option></select></label></div></div>'
            f'<p class="scount" id="scount" aria-live="polite"></p><div class="sgrid" id="sgrid"></div>'
            f'<div style="text-align:center;margin-top:24px"><button class="btn sec" id="smore" type="button" hidden>แสดงเพิ่ม</button></div>'
            f'<p class="snote">ราคารวม VAT 7% แล้ว เป็นราคาปกติที่ร้านใช้ ไม่รวมโปรโมชัน · สอบถามโปรโมชันและสต็อกล่าสุดทาง LINE @djlabsiam · '
            f'ภาพสินค้าบางรุ่นยังไม่มี จึงแสดงเป็นไอคอนประเภทเครื่อง</p></section>')
    js = SHOP_JS.replace("@@REST@@", rest).replace("@@KEY@@", key).replace("@@IMG@@", img)
    desc = "Showroom อุปกรณ์ DJ ที่ DJ LAB SIAM พร้อมราคาจากระบบร้าน รวม VAT ตัวแทนจำหน่าย Pioneer DJ และ AlphaTheta อย่างเป็นทางการ"
    return shell(A.shop, "Showroom อุปกรณ์ DJ พร้อมราคา — DJ LAB SIAM", desc, body, robots=None if live else "noindex,follow",
                 active="shop", script=js, css_extra=SHOP_CSS)


def write(path, text):
    full = os.path.join(A.out, path.strip("/").replace("/", os.sep), "index.html")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with io.open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    return full, len(text.encode("utf-8"))


made = [write("/courses/", courses_page())]
for t in TEACHERS:
    made.append(write(f"/teachers/{slug(t['name'])}/", teacher_page(t)))
made.append(write("/content/", content_page()))
made.append(write(A.home, home_page()))
made.append(write(A.shop, shop_page()))
for p, n in made:
    print(f"{n / 1024:6.1f} KB  {os.path.relpath(p, A.out)}")
print(f"courses.json md5 {MD5} · {len(COURSES)} courses · {len(TEACHERS)} teachers")
